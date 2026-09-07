import { createPortal, useFrame } from '@react-three/fiber';
import { use, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { layout } from '../room/palette.js';
import { loadRiggedVirgil } from '../virgil/virgilRigged.js';
import { type FaceState, Visor } from './Visor.js';
import { bonePositions, fitHeadSurface, VIRGIL_VISOR } from './visorFit.js';

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
  // The visor fitted to his head's own front surface in the head joint's
  // frame at bind pose (`visorFit.ts`); `VIRGIL_VISOR` is the extent and
  // nothing else is hand-set. The rigid-fit residual of the head shell is
  // 0.9–3.3 mm across the shipped clips at this scale.
  const surface = useMemo(() => {
    const index = virgil.mesh.geometry.index;
    if (!index) throw new Error('virgil rigged: the skin has no index');
    const { positions, weights } = bonePositions(virgil.mesh, virgil.head);
    return fitHeadSurface(positions, index.array, VIRGIL_VISOR, (v) => (weights[v] ?? 0) > 0.5);
  }, [virgil]);

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
          the head through every clip. */}
      {createPortal(<Visor state={face} surface={surface} lightIntensity={1.5} />, virgil.head)}
    </>
  );
}
