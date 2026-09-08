import { ContactShadows } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
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
 */
export function RoomShell() {
  const { tier } = useSettings();
  const coarse = tier === 'constrained' || tier === 'mobile';

  return (
    <group>
      <Floor />
      <FloorInlay coarse={coarse} />
      <Contact coarse={coarse} />
      <BackWall coarse={coarse} />
      <Sill />
      <SideWallsAndCeiling />
      <Coves coarse={coarse} />
    </group>
  );
}

function Floor() {
  return (
    <mesh
      position={[0, 0, (layout.backWallZ + layout.wallZ) / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      {/* A rectangle inside the walls, not a disc: a floor that ran on past
          the wall showed through the aperture in V1. */}
      <planeGeometry args={[2 * layout.sideWallX, layout.backWallZ - layout.wallZ]} />
      <meshStandardMaterial color={room.surface.creamShadow} roughness={0.92} metalness={0} />
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

/** A four-point star, as a shape. */
export function starShape(outer: number, inner: number): THREE.Shape {
  const shape = new THREE.Shape();
  const points = 4;
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

/**
 * The inlay: a navy disc round the console's foot with two gold rings, and
 * the four-point star in front of it, big — graphic shapes rather than
 * surface detail, and matte.
 */
export function FloorInlay({
  coarse,
  centre = layout.consoleCentre,
  starAt = [0, 0.9] as const,
  y = 0.004,
}: {
  coarse: boolean;
  centre?: readonly [number, number, number];
  starAt?: readonly [number, number];
  y?: number;
}) {
  const star = useMemo(() => new THREE.ShapeGeometry(starShape(1.35, 0.3)), []);
  const gold = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: room.surface.gold,
        roughness: 0.75,
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    [],
  );
  const navy = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: room.surface.navy,
        roughness: 0.9,
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    [],
  );
  const segments = coarse ? 64 : 160;
  const [cx, , cz] = centre;
  return (
    <group>
      <mesh position={[cx, y, cz]} rotation={[-Math.PI / 2, 0, 0]} material={navy} receiveShadow>
        <circleGeometry args={[2.35, segments]} />
      </mesh>
      {[
        { r: 1.95, w: 0.12 },
        { r: 2.35, w: 0.16 },
        { r: 3.4, w: 0.1 },
      ].map(({ r, w }) => (
        <mesh
          key={r}
          position={[cx, y + 0.001, cz]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={gold}
          receiveShadow
        >
          <ringGeometry args={[r, r + w, segments]} />
        </mesh>
      ))}
      {/* The star, in the foreground where the camera sees it. */}
      <mesh
        position={[starAt[0], y + 0.001, starAt[1]]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={navy}
      >
        <circleGeometry args={[1.55, segments]} />
      </mesh>
      <mesh
        geometry={star}
        material={gold}
        position={[starAt[0], y + 0.002, starAt[1]]}
        rotation={[-Math.PI / 2, 0, Math.PI / 4]}
        receiveShadow
      />
      <mesh
        position={[starAt[0], y + 0.002, starAt[1]]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={gold}
      >
        <ringGeometry args={[1.55, 1.68, segments]} />
      </mesh>
    </group>
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
