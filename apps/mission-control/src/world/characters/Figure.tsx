import { useFrame } from '@react-three/fiber';
import { use, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { CAST, figurePlacement, ROLES, type Role, workingPlacement } from '../room/cast.js';
import { breathe } from './breathing.js';
import { createLocomotion, type Pose } from './locomotion.js';
import { type FaceState, FLARE_SECONDS, Visor, type VisorAnchor } from './Visor.js';
import { placedPositions } from './visorFit.js';

/** What a character is doing at their station; a rigged one reads the same prop later. */
export type Activity = 'rest' | 'receiving' | 'working' | 'reported';

/**
 * One of the three unrigged characters — Fabricator, Prover, Keeper —
 * standing at their own console with a live face.
 *
 * The three stay unrigged this round by the owner's explicit note
 * (`docs/process/PHASE_1_STYLISED_SPEC.md` §1.5), so each idles on
 * breathing alone (`breathing.ts`), out of phase with the others and a
 * little quicker while working. The face is drawn on the model's own
 * head triangles from the mask that travels with the model (`cast.ts`,
 * `visorFit.ts`), beside the head mesh under the same placed group, so
 * it breathes with the figure; its light sits in the breathing group.
 *
 * V8 (§0.10.8) — **turning, not walking.** The owner: "have each agent
 * at the console, sightly to the left so it doesnt obstruct the screens,
 * faciung forward. When they get sent work, an animation plays on their
 * face/eyes and they turn aroundfacing the screeen. When its done, they
 * turn aroiund and face the front again." So a character stands in one
 * place and has two facings — the front (`figurePlacement`) and their
 * console's screen (`workingPlacement`). On `receiving` the face flares
 * (`Visor.tsx`), and once the flare has passed the body turns to the
 * screen (`locomotion.ts`, a spring with a small overshoot); on
 * `reported` it turns back to the front, so the verdict is seen on the
 * face. **No rig and no walk clip is needed for this**, and none is
 * waited on. The breathing continues through the turn, added on top.
 *
 * The seam for rigs is still here: `activity` is the whole of what this
 * component knows, and the mover reports `moving`, which is what would
 * select a clip.
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
  const front = useMemo<Pose>(() => {
    const p = figurePlacement(role);
    return { position: p.at, rotationY: p.rotationY };
  }, [role]);
  const atScreen = useMemo<Pose>(() => {
    const p = workingPlacement(role);
    return { position: p.at, rotationY: p.rotationY };
  }, [role]);
  const mover = useMemo(() => createLocomotion(front), [front]);
  const since = useRef({ activity: '' as string, at: 0, t: 0 });
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
    const s = since.current;
    if (!reducedMotion) s.t += Math.min(delta, 0.1);
    if (s.activity !== activity) {
      s.activity = activity;
      s.at = s.t;
    }
    // Facing the screen while receiving and working — but the summons
    // registers on the face first, and the body turns once the flare has
    // passed. Facing the front at rest and once reported. With reduced
    // motion the turn is instant: the character is simply facing where
    // they should.
    const summoned = activity === 'receiving' || activity === 'working';
    const flaring = activity === 'receiving' && s.t - s.at < FLARE_SECONDS;
    const target = summoned && !flaring ? atScreen : front;
    const { pose } = mover.update(
      reducedMotion ? Number.POSITIVE_INFINITY : Math.min(delta, 0.1),
      target,
    );
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
      position={front.position}
      rotation={[0, front.rotationY, 0]}
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
