import { createPortal, useFrame } from '@react-three/fiber';
import { use, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { layout } from '../room/palette.js';
import { loadRiggedVirgil } from '../virgil/virgilRigged.js';
import { type FaceState, Visor } from './Visor.js';

/**
 * Virgil, rigged and animated, standing at the centre of his console and
 * facing the camera.
 *
 * Clips shipped: `Happy_Sway_Standing` (10.07 s) as the default idle,
 * `Idle_11` (1.97 s) to alternate with it, `Agree_Gesture` (13.07 s) as the
 * hand-off, and `Look_Around_Dumbfounded` (6.43 s) for its head turn only.
 * No refusal clip exists yet; a blocked state is expressed through the visor
 * and light (`Visor.tsx`), and a clip drops in here later without rework.
 *
 * With reduced motion the mixer holds the first frame of the idle.
 */
export type VirgilPose = 'idle' | 'look' | 'handoff';

const CLIP_FOR: Record<VirgilPose, string> = {
  idle: 'Happy_Sway_Standing',
  look: 'Look_Around_Dumbfounded',
  handoff: 'Agree_Gesture',
};

/**
 * The visor panel in the head joint's own space (source units, 2.34 tall):
 * the head shell spans y 1.60–2.03 and its front is at z ≈ +0.26 at rest,
 * with the joint at y 1.41 — measured from the file, not guessed.
 */
const VISOR_IN_HEAD = {
  position: [0, 0.39, 0.275] as [number, number, number],
  rotation: [-0.06, 0, 0] as [number, number, number],
  width: 0.5,
  height: 0.34,
};

export function VirgilRigged({
  pose = 'idle',
  face = 'idle',
}: {
  pose?: VirgilPose;
  face?: FaceState;
}) {
  const virgil = use(loadRiggedVirgil());
  const { reducedMotion } = useSettings();
  const mixer = useMemo(() => new THREE.AnimationMixer(virgil.placed), [virgil]);
  const current = useRef<THREE.AnimationAction | null>(null);

  useEffect(() => {
    const clip = THREE.AnimationClip.findByName(virgil.clips, CLIP_FOR[pose]);
    if (!clip) return;
    const next = mixer.clipAction(clip);
    next.reset();
    next.setLoop(pose === 'idle' ? THREE.LoopRepeat : THREE.LoopOnce, Number.POSITIVE_INFINITY);
    next.clampWhenFinished = true;
    next.enabled = true;
    if (current.current && current.current !== next) {
      next.crossFadeFrom(current.current, 0.6, true);
    }
    next.play();
    current.current = next;
    if (reducedMotion) mixer.update(0);
  }, [pose, mixer, virgil, reducedMotion]);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    mixer.update(Math.min(delta, 0.1));
  });

  return (
    <>
      <primitive object={virgil.placed} position={layout.virgilAt} />
      {/* Rendered into the head bone without re-parenting it: the panel rides
          the head through every clip (the rigid-fit residual of the head
          shell is 0.9–3.3 mm across the shipped clips at this scale). */}
      {createPortal(
        <Visor
          state={face}
          position={VISOR_IN_HEAD.position}
          rotation={VISOR_IN_HEAD.rotation}
          width={VISOR_IN_HEAD.width}
          height={VISOR_IN_HEAD.height}
          lightIntensity={1.2}
        />,
        virgil.head,
      )}
    </>
  );
}
