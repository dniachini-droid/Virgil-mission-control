import { useFrame } from '@react-three/fiber';
import { use, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { CAST, figurePlacement, ROLES, type Role } from '../room/cast.js';
import { breathe } from './breathing.js';
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
 * this component knows, and today it only changes the breathing rate. A
 * rigged model replaces the `<primitive>` and maps `activity` to clips the
 * way `VirgilRigged.tsx` maps poses; nothing upstream changes. One
 * consequence accepted: the hand-off is one-sided — Virgil gestures, and
 * the receiver answers with face, light and stillness.
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
  const placement = useMemo(() => figurePlacement(role), [role]);
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
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    const b = breathe(clock.getElapsedTime(), phase, activity === 'working' ? 1.6 : 1);
    group.current.position.y = placement.at[1] + b.rise;
    group.current.rotation.z = b.sway;
    group.current.rotation.y = placement.rotationY + b.yaw;
  });
  return (
    <group
      ref={group}
      position={placement.at}
      rotation={[0, placement.rotationY, 0]}
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
