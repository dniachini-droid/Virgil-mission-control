import { useMemo } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { CAST, figurePlacement, ROLES, stationToWorld } from './cast.js';
import { layout, room } from './palette.js';

/**
 * **A cheap floor reflection.**
 *
 * V8.2, from the owner's observation of 8 September: the set *"looks bland,
 * and dead and lifeless"*, and — approved with the three other lighting
 * changes — *"a cheap blurred floor reflection rather than the planar
 * mirror that was pulled"*.
 *
 * `RoomShell.tsx` records why the mirror went: *"the planar reflection was
 * both the strongest realism signal and the most expensive thing drawn,
 * since it re-rendered the scene"*. That is not coming back. A floor that
 * reflects nothing reads as a plate, though, and the owner-approved
 * reference `docs/art-direction/approved/visual-canon/03-approved-hybrid.png`
 * has a polished floor with the star inlaid in it.
 *
 * So the reflection is faked in two halves, neither of which renders the
 * scene twice:
 *
 *  - the floor takes the room's **baked** environment (`FLOOR_FINISH` in
 *    `finish.ts`), so the coves and the deep blue beyond appear in it. No
 *    extra pass: the environment map already exists, is built once
 *    (`Environment frames={1}`), and this is one plane sampling it;
 *  - and each console and each character gets a **smear** on the disc
 *    beneath it: one elongated, blurred, additive quad, tinted with that
 *    object's own colour and strongest directly under it. It is not a
 *    reflection of the object's shape and does not claim to be — it is the
 *    light the object bounces into the floor, which is the part of a
 *    reflection the eye reads at this distance.
 *
 * **What it costs, honestly.** Seven quads: four consoles and three
 * characters. Fourteen triangles, seven draw calls, one shared 128 × 256
 * canvas texture generated at runtime, additive, depth-write off, no
 * shadow, no second render of anything. Against
 * `docs/architecture/PERFORMANCE_STRATEGY.md`'s tightest tier —
 * `constrained`, ≤ 120 draw calls and ≤ 120 k triangles — that is under 6 %
 * of the draw-call budget and a rounding error in triangles; on `mobile`
 * (≤ 200 calls, ≤ 300 k triangles) it is 3.5 %. **None of it is measured.**
 * No frame time has been taken on any device on this branch, and
 * `docs/decisions/OD-0005-phase-1-visual-checks-and-reference.md` requires
 * performance recorded as unmeasured until it is measured on real
 * hardware; this paragraph is a count of what is drawn, not a measurement
 * of what it costs.
 */

/**
 * How far up the object's height the smear reaches, and how strong it is.
 * The strength was 0.3 in the first capture and read as fog rather than as
 * a reflection — a white haze at the foot of the Keeper's console. 0.16 is
 * what stays under the object.
 */
export const SMEAR = { reach: 0.62, strength: 0.16, spread: 1.15 } as const;

/**
 * The smear's own texture: bright at the top edge — where it meets the
 * object — fading down and to the sides, blurred by construction because
 * it is a gradient and nothing else.
 */
function createSmearTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Down the length: strong at v = 1 (against the object), gone by v = 0.
    const down = ctx.createLinearGradient(0, 0, 0, 256);
    down.addColorStop(0, 'rgba(255,255,255,1)');
    down.addColorStop(0.35, 'rgba(255,255,255,0.42)');
    down.addColorStop(0.75, 'rgba(255,255,255,0.08)');
    down.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = down;
    ctx.fillRect(0, 0, 128, 256);
    // Across: fade the sides, so the smear has no edge to read as a shape.
    const across = ctx.createLinearGradient(0, 0, 128, 0);
    across.addColorStop(0, 'rgba(0,0,0,1)');
    across.addColorStop(0.5, 'rgba(0,0,0,0)');
    across.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = across;
    ctx.fillRect(0, 0, 128, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

let shared: THREE.CanvasTexture | null = null;
function smearTexture(): THREE.CanvasTexture {
  shared ??= createSmearTexture();
  return shared;
}

function Smear({
  at,
  width,
  length,
  colour,
  strength,
}: {
  at: readonly [number, number, number];
  width: number;
  length: number;
  colour: string;
  strength: number;
}) {
  const texture = useMemo(() => smearTexture(), []);
  return (
    <mesh
      // On the disc's top face, a whisker above it, lying away from the
      // camera so the smear runs back from the object's foot.
      position={[at[0], at[1] + 0.018, at[2] + length / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={1}
    >
      <planeGeometry args={[width, length]} />
      <meshBasicMaterial
        map={texture}
        color={colour}
        transparent
        opacity={strength}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function FloorSheen() {
  const { tier } = useSettings();
  const coarse = tier === 'constrained' || tier === 'mobile';
  const strength = coarse ? SMEAR.strength * 0.8 : SMEAR.strength;
  return (
    <group>
      {/* Virgil's console: the widest thing on the disc. */}
      <Smear
        at={[layout.consoleCentre[0], 0, layout.consoleCentre[2] + 0.5]}
        width={layout.consoleWidth * 0.95}
        length={layout.consoleRim * SMEAR.reach * SMEAR.spread * 2}
        colour={room.surface.castCream}
        strength={strength}
      />
      {ROLES.map((role) => {
        const member = CAST[role];
        const height = member.station.metadata.runtime.targetMetres;
        const { local } = figurePlacement(role);
        const figure = stationToWorld(role, local[0], 0, local[2]);
        return (
          <group key={role}>
            <Smear
              at={[member.at[0], 0, member.at[2] + 0.7]}
              width={1.9}
              length={height * SMEAR.reach}
              colour={room.surface.castCream}
              strength={strength}
            />
            {/* The character, narrower and a little warmer. */}
            <Smear
              at={[figure[0], 0, figure[2]]}
              width={0.85}
              length={1.7 * SMEAR.reach * 0.8}
              colour={room.warm.key}
              strength={strength * 0.85}
            />
          </group>
        );
      })}
    </group>
  );
}
