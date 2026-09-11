import { ContactShadows } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { createFloorTexture } from './floorGraphic.js';
import { layout, room } from './palette.js';

/**
 * The room itself: the floor with its inlaid rings and star, the back wall
 * with the circular aperture the owner's porthole frame sits in, the sill
 * under the glass, side walls, ceiling, and the warm coves that make the
 * room's own light.
 *
 * Surfaces are cream, gold, navy and brass only. Teal and magenta never
 * appear here as a material colour; they arrive through the aperture from
 * `WindowView`.
 *
 * V6 (`docs/process/PHASE_1_STYLISED_SPEC.md` §3): **matte throughout, and
 * the mirror floor is gone.** The planar reflection was both the strongest
 * realism signal and the most expensive thing drawn, since it re-rendered
 * the scene; a contact shadow under the cast replaces it, and the floor's
 * inlay — the star from the approved reference, previously lost competing
 * with the reflection — is drawn bigger and bolder as a graphic shape.
 *
 * **V7: the room is retired, not removed.** The owner: "Room retired for
 * now. No window. I might go back to it." It is reachable behind the `V`
 * key and `#/?view=room`, is not the default, and is not offered for
 * judgement. Its floor inlay is drawn as one texture like the tabletop's
 * (`floorGraphic.ts`), so the retired view does not keep the z-fight.
 */
export function RoomShell() {
  const { tier } = useSettings();
  const coarse = tier === 'constrained' || tier === 'mobile';

  return (
    <group>
      <Floor coarse={coarse} />
      <Contact coarse={coarse} centre={[0, 0, -1.6]} />
      <BackWall coarse={coarse} />
      <Sill />
      <SideWallsAndCeiling />
      <Coves coarse={coarse} />
    </group>
  );
}

function Floor({ coarse }: { coarse: boolean }) {
  const depth = layout.backWallZ - layout.wallZ;
  const width = 2 * layout.sideWallX;
  const size = Math.max(width, depth);
  const zMid = (layout.backWallZ + layout.wallZ) / 2;
  const texture = useMemo(
    () =>
      createFloorTexture({
        centre: [0, zMid],
        size,
        console: [layout.consoleCentre[0], layout.consoleCentre[2]],
        star: layout.tabletop.starAt,
        pixels: coarse ? 1024 : 2048,
      }),
    [size, zMid, coarse],
  );
  // The plane is cut from the square texture's middle so metres map alike
  // on both axes.
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, depth);
    const uv = g.getAttribute('uv');
    for (let i = 0; i < uv.count; i += 1) {
      uv.setXY(
        i,
        0.5 + (uv.getX(i) - 0.5) * (width / size),
        0.5 + (uv.getY(i) - 0.5) * (depth / size),
      );
    }
    return g;
  }, [width, depth, size]);
  return (
    <mesh position={[0, 0, zMid]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow geometry={geometry}>
      {/* A rectangle inside the walls, not a disc: a floor that ran on past
          the wall showed through the aperture in V1. */}
      <meshStandardMaterial map={texture} roughness={0.92} metalness={0} />
    </mesh>
  );
}

/**
 * The contact shadow that replaces the reflection: a soft dark pool under
 * everything on the floor, rendered from below at a low resolution. It is
 * what seats the cast on the floor now that nothing reflects them.
 */
export function Contact({
  coarse,
  centre = [0, 0, -1.6] as const,
  scale = 16,
}: {
  coarse: boolean;
  centre?: readonly [number, number, number];
  scale?: number;
}) {
  return (
    <ContactShadows
      position={[centre[0], centre[1] + 0.012, centre[2]]}
      scale={scale}
      blur={2.4}
      far={3.2}
      opacity={coarse ? 0.4 : 0.55}
      resolution={coarse ? 256 : 512}
      color={room.surface.navy}
      frames={Number.POSITIVE_INFINITY}
    />
  );
}

/**
 * The back wall is one shape with a circular hole cut to the porthole's
 * measured aperture: the frame model (`Models.tsx`) sits in it, so nothing
 * code-built rings the window any more, and the hole is what crops the
 * galaxy — there is no separate mask.
 */
function BackWall({ coarse }: { coarse: boolean }) {
  const geometry = useMemo(() => {
    const half = layout.sideWallX + 0.5;
    const shape = new THREE.Shape();
    shape.moveTo(-half, 0);
    shape.lineTo(half, 0);
    shape.lineTo(half, layout.ceilingY + 0.5);
    shape.lineTo(-half, layout.ceilingY + 0.5);
    shape.closePath();
    const hole = new THREE.Path();
    hole.absarc(
      layout.windowCentre[0],
      layout.windowCentre[1],
      layout.apertureRadius,
      0,
      Math.PI * 2,
      true,
    );
    shape.holes.push(hole);
    return new THREE.ShapeGeometry(shape, coarse ? 32 : 96);
  }, [coarse]);

  const wz = layout.windowCentre[2];
  return (
    <group>
      <mesh geometry={geometry} position={[0, 0, layout.wallZ]} receiveShadow>
        <meshStandardMaterial color={room.surface.cream} roughness={0.85} metalness={0} />
      </mesh>
      {/* Pilasters either side of the porthole, floor to ceiling, thicker
          than V5's: every fitting is thickened in this style. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (layout.apertureRadius + 2.6), 0, wz + 0.3]}>
          <mesh position={[0, layout.ceilingY / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.6, layout.ceilingY, 0.6]} />
            <meshStandardMaterial color={room.surface.ivory} roughness={0.8} metalness={0} />
          </mesh>
          <mesh position={[0, layout.ceilingY / 2, 0.31]}>
            <boxGeometry args={[0.16, layout.ceilingY, 0.03]} />
            <meshStandardMaterial color={room.surface.gold} roughness={0.7} metalness={0} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** The low sill under the porthole, with a warm cove along its front edge. */
function Sill() {
  const width = 2 * (layout.apertureRadius + 2.2);
  const depth = layout.parapetZ - layout.wallZ;
  return (
    <group position={[0, 0, layout.parapetZ - depth / 2]}>
      <mesh position={[0, layout.parapetHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, layout.parapetHeight, depth]} />
        <meshStandardMaterial color={room.surface.creamShadow} roughness={0.85} metalness={0} />
      </mesh>
      <mesh position={[0, layout.parapetHeight + 0.04, 0.02]}>
        <boxGeometry args={[width + 0.1, 0.09, depth + 0.1]} />
        <meshStandardMaterial color={room.surface.goldBright} roughness={0.7} metalness={0} />
      </mesh>
      <mesh position={[0, layout.parapetHeight - 0.08, depth / 2 + 0.01]}>
        <boxGeometry args={[width - 0.3, 0.05, 0.02]} />
        <meshStandardMaterial color="#000000" emissive={room.warm.cove} emissiveIntensity={2.4} />
      </mesh>
    </group>
  );
}

function SideWallsAndCeiling() {
  const depth = layout.backWallZ - layout.wallZ;
  const zMid = (layout.backWallZ + layout.wallZ) / 2;
  return (
    <group>
      <mesh
        position={[-layout.sideWallX, layout.ceilingY / 2, zMid]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[depth, layout.ceilingY]} />
        <meshStandardMaterial color={room.surface.creamShadow} roughness={0.9} />
      </mesh>
      <mesh
        position={[layout.sideWallX, layout.ceilingY / 2, zMid]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <planeGeometry args={[depth, layout.ceilingY]} />
        <meshStandardMaterial color={room.surface.creamShadow} roughness={0.9} />
      </mesh>
      <mesh position={[0, layout.ceilingY, zMid]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2 * layout.sideWallX, depth]} />
        <meshStandardMaterial color={room.surface.slateDark} roughness={0.95} />
      </mesh>
      <mesh position={[0, layout.ceilingY / 2, layout.backWallZ]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[2 * layout.sideWallX, layout.ceilingY]} />
        <meshStandardMaterial color={room.surface.creamShadow} roughness={0.9} />
      </mesh>
    </group>
  );
}

/**
 * The warm coves: a ring in the ceiling and two strips along the side walls,
 * thicker than before. Emissive, so the bloom reads them as light. The
 * lights in `LightingRig` are what actually light the room; these are what
 * the owner sees as the source.
 */
function Coves({ coarse }: { coarse: boolean }) {
  const segments = coarse ? 48 : 128;
  return (
    <group>
      <mesh position={[0, layout.ceilingY - 0.25, -2.4]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5.4, 0.11, 8, segments]} />
        <meshBasicMaterial color={room.warm.cove} toneMapped={false} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (layout.sideWallX - 0.06), 2.7, -1.5]}>
          <boxGeometry args={[0.06, 0.08, 9]} />
          <meshBasicMaterial color={room.warm.amber} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
