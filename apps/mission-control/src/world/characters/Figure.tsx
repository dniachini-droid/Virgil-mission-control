import { useFrame } from '@react-three/fiber';
import { use, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { CAST, figurePlacement, idlePlacement, ROLES, type Role } from '../room/cast.js';
import { breathe } from './breathing.js';
import { createLocomotion, type Pose } from './locomotion.js';
import { type FaceState, Visor, type VisorAnchor } from './Visor.js';
import { placedPositions } from './visorFit.js';

/** What a character is doing at their station; a rigged one reads the same prop later. */
export type Activity = 'rest' | 'receiving' | 'working' | 'reported';

/**
 * One of the three unrigged characters — Fabricator, Prover, Keeper —
 * standing at their own station with a live face.
 *
 * The three stay unrigged this round by the owner's explicit note
 * (`docs/process/PHASE_1_STYLISED_SPEC.md` §1.5), so each idles on
 * breathing alone (`breathing.ts`), out of phase with the others and a
 * little quicker while working. The face is drawn on the model's own
 * head triangles from the mask that travels with the model (`cast.ts`,
 * `visorFit.ts`), beside the head mesh under the same placed group, so
 * it breathes with the figure; its light sits in the breathing group.
 *
 * The seam for rigs is here and only here: `activity` is the whole of what
 * this component knows. At rest a character stands **aside**
 * (`idlePlacement`); when a job arrives they move up to their panel
 * (`figurePlacement`), and the move is one swappable behaviour
 * (`locomotion.ts`) — a glide today, a walk clip when the owner's rigged
 * files arrive (V7 §0.7). A rigged model replaces the `<primitive>`, maps
 * `activity` to clips the way `VirgilRigged.tsx` maps poses, and plays
 * its walk while the mover reports `moving`; nothing upstream changes.
 * One consequence accepted: the hand-off is one-sided — Virgil gestures,
 * and the receiver answers with face, light and stillness.
 */
export function Figure({
  role,
  face = 'idle',
  activity = 'rest',
  onSelect,
}: {
  role: Role;
  face?: FaceState;
  activity?: Activity;
  onSelect?: (role: Role) => void;
}) {
  const member = CAST[role];
  const asset = use(member.model.load());
  const { reducedMotion } = useSettings();
  const group = useRef<THREE.Group>(null);
  const working = useMemo<Pose>(() => {
    const p = figurePlacement(role);
    return { position: p.at, rotationY: p.rotationY };
  }, [role]);
  const idle = useMemo<Pose>(() => {
    const p = idlePlacement(role);
    return { position: p.at, rotationY: p.rotationY };
  }, [role]);
  const mover = useMemo(() => createLocomotion(idle), [idle]);
  const phase = ROLES.indexOf(role) * 2.1 + 1.3;
  const anchor = useMemo<VisorAnchor>(() => {
    const parent = asset.mesh.parent;
    if (!parent) throw new Error(`${role}: the mesh has no parent`);
    if (!asset.mesh.material.map) throw new Error(`${role}: the mesh has no base colour`);
    const { scale, positionScale } = asset.metadata.runtime;
    return {
      head: asset.mesh,
      mask: member.model.visor,
      fitPositions: placedPositions(asset.mesh),
      metresPerUnit: scale * positionScale,
      paint: asset.mesh.material.map,
      meshParent: parent,
      // The placed group's frame is the breathing group's: metres, feet at the origin.
      lightParent: parent,
    };
  }, [asset, member, role]);
  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    // Aside at rest, at the panel otherwise. With reduced motion the move
    // is instant: the character is simply where they should be.
    const target = activity === 'rest' ? idle : working;
    const { pose } = mover.update(reducedMotion ? Number.POSITIVE_INFINITY : delta, target);
    const b = reducedMotion
      ? { rise: 0, sway: 0, yaw: 0 }
      : breathe(clock.getElapsedTime(), phase, activity === 'working' ? 1.6 : 1);
    group.current.position.set(pose.position[0], pose.position[1] + b.rise, pose.position[2]);
    group.current.rotation.z = b.sway;
    group.current.rotation.y = pose.rotationY + b.yaw;
  });
  return (
    <group
      ref={group}
      position={idle.position}
      rotation={[0, idle.rotationY, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(role);
      }}
    >
      <primitive object={asset.placed} />
      <Visor state={face} anchor={anchor} lightIntensity={1.1} />
    </group>
  );
}
