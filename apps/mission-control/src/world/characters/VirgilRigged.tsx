import { createPortal, useFrame } from '@react-three/fiber';
import { use, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { layout } from '../room/palette.js';
import { loadRiggedVirgil } from '../virgil/virgilRigged.js';
import { breathe } from './breathing.js';
import { type FaceState, Visor } from './Visor.js';
import { bonePositions, fitHeadSurface, VIRGIL_VISOR } from './visorFit.js';

/**
 * Virgil, rigged, standing at the centre of his console and facing the
 * camera.
 *
 * V5, on the owner's "virgil is moving too much": he no longer idles on a
 * clip. `Happy_Sway_Standing` measures as a full human sway — the hips
 * travel up to 20 cm and the head turns up to 36° through it — which is
 * orders of magnitude more than breathing, and it is not played at all. At
 * rest he holds the first frame of `Idle_11`, a natural standing pose, and
 * breathes procedurally (`breathing.ts`), the same motion the Prover has.
 * The clips are reserved for events, blended in from the rest pose and
 * back over half a second:
 *
 *  - `look`: `Look_Around_Dumbfounded`, when he addresses something, and
 *    as his reaction to a BLOCKED verdict;
 *  - `handoff`: `Agree_Gesture`, the hand-off;
 *  - `nod`: his reaction to a PASS. Not a clip: the first seconds of
 *    `Agree_Gesture` were tried for it and measure as a 16 cm body shift
 *    with the head turned 22–26°, not a nod. This is two small dips of the
 *    head joint, applied after the mixer so the visor rides along.
 *
 * A clip that ends returns him to rest by itself; a pose that changes
 * before a clip ends crossfades. No refusal clip exists yet; a blocked
 * state is expressed through the visor and light (`Visor.tsx`).
 *
 * With reduced motion he holds the rest pose and does not breathe.
 */
export type VirgilPose = 'rest' | 'look' | 'handoff' | 'nod';

const REST_CLIP = 'Idle_11';
type ClipPose = Exclude<VirgilPose, 'rest' | 'nod'>;
const CLIP_FOR: Record<ClipPose, string> = {
  look: 'Look_Around_Dumbfounded',
  handoff: 'Agree_Gesture',
};
const FADE = 0.55;
/** The nod: two dips, 9° each, over 1.4 s. */
const NOD_SECONDS = 1.4;
const NOD_RADIANS = 0.16;

function nodAngle(elapsed: number): number {
  if (elapsed < 0 || elapsed >= NOD_SECONDS) return 0;
  // Two half-sine dips, each 0.7 s, softened at the ends.
  const dip = Math.max(0, Math.sin((elapsed / (NOD_SECONDS / 2)) * Math.PI));
  const envelope = Math.sin((elapsed / NOD_SECONDS) * Math.PI) ** 0.5;
  return NOD_RADIANS * dip * envelope;
}

export function VirgilRigged({
  pose = 'rest',
  face = 'idle',
}: {
  pose?: VirgilPose;
  face?: FaceState;
}) {
  const virgil = use(loadRiggedVirgil());
  const { reducedMotion } = useSettings();
  const mixer = useMemo(() => new THREE.AnimationMixer(virgil.placed), [virgil]);
  const breath = useRef<THREE.Group>(null);
  const current = useRef<THREE.AnimationAction | null>(null);
  const nod = useRef({ at: -1 });
  const nodAxis = useMemo(() => new THREE.Quaternion(), []);

  // The rest pose: Idle_11 held at its first frame, always playing at
  // weight one until an event clip fades it down.
  const rest = useMemo(() => {
    const clip = THREE.AnimationClip.findByName(virgil.clips, REST_CLIP);
    if (!clip) throw new Error(`virgil rigged: no clip "${REST_CLIP}"`);
    const action = mixer.clipAction(clip);
    action.play();
    action.paused = true;
    action.time = 0;
    return action;
  }, [mixer, virgil]);

  const actions = useMemo(() => {
    const byPose = {} as Record<ClipPose, THREE.AnimationAction>;
    for (const key of Object.keys(CLIP_FOR) as ClipPose[]) {
      const clip = THREE.AnimationClip.findByName(virgil.clips, CLIP_FOR[key]);
      if (!clip) throw new Error(`virgil rigged: no clip "${CLIP_FOR[key]}"`);
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      byPose[key] = action;
    }
    return byPose;
  }, [mixer, virgil]);

  // The visor fitted to his head's own front surface in the head joint's
  // frame at bind pose (`visorFit.ts`); `VIRGIL_VISOR` is the extent and
  // nothing else is hand-set.
  const surface = useMemo(() => {
    const index = virgil.mesh.geometry.index;
    if (!index) throw new Error('virgil rigged: the skin has no index');
    const { positions, weights } = bonePositions(virgil.mesh, virgil.head);
    return fitHeadSurface(positions, index.array, VIRGIL_VISOR, (v) => (weights[v] ?? 0) > 0.5);
  }, [virgil]);

  const toRest = useMemo(
    () => () => {
      const from = current.current;
      current.current = null;
      rest.enabled = true;
      if (from) rest.crossFadeFrom(from, FADE, false);
      else rest.setEffectiveWeight(1);
    },
    [rest],
  );

  // A clip that finishes returns him to rest by itself.
  useEffect(() => {
    const onFinished = (event: { action: THREE.AnimationAction }) => {
      if (event.action === current.current) toRest();
    };
    mixer.addEventListener('finished', onFinished);
    return () => mixer.removeEventListener('finished', onFinished);
  }, [mixer, toRest]);

  useEffect(() => {
    if (reducedMotion) {
      rest.setEffectiveWeight(1);
      mixer.update(0);
      return;
    }
    if (pose === 'nod') {
      // The nod is applied on top of whatever plays; the body goes to rest.
      nod.current.at = mixer.time;
      if (current.current) toRest();
      return;
    }
    if (pose === 'rest') {
      if (current.current) toRest();
      return;
    }
    const next = actions[pose];
    if (next === current.current) return;
    const from = current.current ?? rest;
    next.reset();
    next.enabled = true;
    next.play();
    next.crossFadeFrom(from, FADE, false);
    current.current = next;
  }, [pose, actions, rest, mixer, toRest, reducedMotion]);

  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    mixer.update(Math.min(delta, 0.1));
    // A faded-out event clip is stopped so it stops costing anything.
    for (const action of Object.values(actions)) {
      if (action !== current.current && action.isRunning() && action.getEffectiveWeight() === 0) {
        action.stop();
      }
    }
    // The nod, after the mixer has written the pose: local +x on the head
    // joint pitches the face down (measured; `headfront` moves down and
    // back), so it is not accumulated, it is added to this frame's pose.
    if (nod.current.at >= 0) {
      const angle = nodAngle(mixer.time - nod.current.at);
      if (angle > 0) {
        nodAxis.setFromAxisAngle(X_AXIS, angle);
        virgil.head.quaternion.multiply(nodAxis);
      } else if (mixer.time - nod.current.at >= NOD_SECONDS) {
        nod.current.at = -1;
      }
    }
    if (breath.current) {
      const b = breathe(clock.getElapsedTime(), 0);
      breath.current.position.y = layout.virgilAt[1] + b.rise;
      breath.current.rotation.z = b.sway;
      breath.current.rotation.y = b.yaw;
    }
  });

  return (
    <>
      <group ref={breath} position={layout.virgilAt}>
        <primitive object={virgil.placed} />
      </group>
      {/* Rendered into the head bone without re-parenting it: the panel rides
          the head through every clip and the nod. */}
      {createPortal(<Visor state={face} surface={surface} lightIntensity={1.5} />, virgil.head)}
    </>
  );
}

const X_AXIS = new THREE.Vector3(1, 0, 0);
