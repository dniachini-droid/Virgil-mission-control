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
 * clip. `Happy_Sway_Standing` is a full human sway, orders of magnitude
 * more than breathing, and it is not played at all. At rest he holds the
 * first frame of `Idle_11` — a natural standing pose — and breathes
 * procedurally (`breathing.ts`), the same motion the Prover has. The clips
 * are reserved for events, blended in from the rest pose and back:
 *
 *  - `look`: the head turn of `Look_Around_Dumbfounded`, when he addresses
 *    something, and as his reaction to a BLOCKED verdict;
 *  - `handoff`: `Agree_Gesture`, the hand-off;
 *  - `nod`: the first 2.4 s of `Agree_Gesture`, his reaction to a PASS.
 *
 * A clip that ends returns him to rest by itself; a pose that changes
 * before a clip ends crossfades. No refusal clip exists yet; a blocked
 * state is expressed through the visor and light (`Visor.tsx`).
 *
 * With reduced motion he holds the rest pose and does not breathe.
 */
export type VirgilPose = 'rest' | 'look' | 'handoff' | 'nod';

const REST_CLIP = 'Idle_11';
const CLIP_FOR: Record<Exclude<VirgilPose, 'rest'>, string> = {
  look: 'Look_Around_Dumbfounded',
  handoff: 'Agree_Gesture',
  nod: 'Agree_Gesture',
};
const NOD_SECONDS = 2.4;
const FADE = 0.55;

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
    const byPose = {} as Record<Exclude<VirgilPose, 'rest'>, THREE.AnimationAction>;
    for (const key of Object.keys(CLIP_FOR) as Exclude<VirgilPose, 'rest'>[]) {
      const source = THREE.AnimationClip.findByName(virgil.clips, CLIP_FOR[key]);
      if (!source) throw new Error(`virgil rigged: no clip "${CLIP_FOR[key]}"`);
      const clip =
        key === 'nod'
          ? THREE.AnimationUtils.subclip(source, 'Nod', 0, Math.round(NOD_SECONDS * 30), 30)
          : source;
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
          the head through every clip. */}
      {createPortal(<Visor state={face} surface={surface} lightIntensity={1.5} />, virgil.head)}
    </>
  );
}
