import { MeshReflectorMaterial } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { layout, room } from './palette.js';

/**
 * The room itself: the reflective floor with its inlaid rings and star, the
 * back wall with the circular aperture the owner's porthole frame sits in,
 * the sill under the glass, side walls, ceiling, and the warm coves that make
 * the room's own light.
 *
 * Surfaces are cream, gold and brass only. Teal and magenta never appear here
 * as a material colour; they arrive through the aperture from `WindowView`.
 *
 * The floor is where the reference earns its warmth: polished stone carrying
 * the amber of the consoles and the coves back up into the frame, with the
 * window's blue laid over it in the distance. So the floor is a real planar
 * reflection, not a roughness trick, and the coves are emissive geometry the
 * reflection can see rather than lights alone.
 */
export function RoomShell() {
  const { tier } = useSettings();
  const coarse = tier === 'constrained' || tier === 'mobile';

  return (
    <group>
      <Floor coarse={coarse} />
      <FloorInlay coarse={coarse} />
      <BackWall coarse={coarse} />
      <Sill />
      <SideWallsAndCeiling />
      <Coves coarse={coarse} />
    </group>
  );
}

function Floor({ coarse }: { coarse: boolean }) {
  return (
    <mesh
      position={[0, 0, (layout.backWallZ + layout.wallZ) / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      {/* A rectangle inside the walls, not a disc: a floor that ran on past
          the wall showed through the aperture in V1. */}
      <planeGeometry args={[2 * layout.sideWallX, layout.backWallZ - layout.wallZ]} />
      {/* Cream stone, polished. `mirror` short of 1 keeps the base colour in
          the surface; the blur spreads the reflection the way a waxed floor
          does rather than a mirror. The depth-driven blur is what stops the
          bright lower window reflecting as a hard hot patch (V1's flaw): the
          further the reflected thing is from the floor, the softer it gets. */}
      <MeshReflectorMaterial
        color={room.surface.creamShadow}
        resolution={coarse ? 512 : 1024}
        mirror={0.35}
        mixBlur={2.2}
        mixStrength={0.55}
        blur={[700, 260]}
        depthScale={1.4}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.2}
        depthToBlurRatioBias={0.6}
        roughness={0.45}
        metalness={0.05}
      />
    </mesh>
  );
}

/**
 * Gold rings around the console foot and the four-point star in front of it,
 * inlaid a hair above the stone so they sit in the reflection instead of
 * fighting it.
 */
function FloorInlay({ coarse }: { coarse: boolean }) {
  const star = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 4;
    const outer = 1.15;
    const inner = 0.22;
    for (let i = 0; i < points * 2; i += 1) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i / (points * 2)) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);

  const gold = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: room.surface.gold,
        roughness: 0.3,
        metalness: 0.9,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    [],
  );
  const brass = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: room.surface.brass,
        roughness: 0.4,
        metalness: 0.85,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    [],
  );

  const segments = coarse ? 64 : 160;
  const [cx, , cz] = layout.consoleCentre;
  return (
    <group>
      {/* Concentric inlays around the console, as in the reference's floor. */}
      {[
        { r: 1.55, w: 0.05, m: gold },
        { r: 2.35, w: 0.03, m: brass },
        { r: 3.3, w: 0.06, m: gold },
        { r: 5.2, w: 0.04, m: brass },
      ].map(({ r, w, m }) => (
        <mesh
          key={r}
          position={[cx, 0.004, cz]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={m}
          receiveShadow
        >
          <ringGeometry args={[r, r + w, segments]} />
        </mesh>
      ))}
      {/* The star, in the foreground where the camera sees it. */}
      <mesh
        geometry={star}
        material={gold}
        position={[0, 0.004, 0.9]}
        rotation={[-Math.PI / 2, 0, Math.PI / 4]}
        receiveShadow
      />
      <mesh position={[0, 0.004, 0.9]} rotation={[-Math.PI / 2, 0, 0]} material={brass}>
        <ringGeometry args={[1.35, 1.39, segments]} />
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
        <meshStandardMaterial color={room.surface.cream} roughness={0.75} metalness={0.02} />
      </mesh>
      {/* Pilasters either side of the porthole, floor to ceiling, so the wall
          has the vertical rhythm of the reference's arches. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (layout.apertureRadius + 2.6), 0, wz + 0.25]}>
          <mesh position={[0, layout.ceilingY / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.42, layout.ceilingY, 0.42]} />
            <meshStandardMaterial color={room.surface.ivory} roughness={0.6} metalness={0.05} />
          </mesh>
          <mesh position={[0, layout.ceilingY / 2, 0.22]}>
            <boxGeometry args={[0.08, layout.ceilingY, 0.02]} />
            <meshStandardMaterial color={room.surface.gold} roughness={0.3} metalness={0.95} />
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
        <meshStandardMaterial color={room.surface.creamShadow} roughness={0.7} metalness={0.03} />
      </mesh>
      <mesh position={[0, layout.parapetHeight + 0.03, 0.02]}>
        <boxGeometry args={[width + 0.1, 0.06, depth + 0.1]} />
        <meshStandardMaterial color={room.surface.goldBright} roughness={0.45} metalness={0.6} />
      </mesh>
      <mesh position={[0, layout.parapetHeight - 0.07, depth / 2 + 0.01]}>
        <boxGeometry args={[width - 0.3, 0.03, 0.02]} />
        {/* Tone-mapped and only moderately over 1.0: untone-mapped this
            strip reflected in the floor as a white flare. */}
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
        <meshStandardMaterial color={room.surface.creamShadow} roughness={0.8} />
      </mesh>
      <mesh
        position={[layout.sideWallX, layout.ceilingY / 2, zMid]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <planeGeometry args={[depth, layout.ceilingY]} />
        <meshStandardMaterial color={room.surface.creamShadow} roughness={0.8} />
      </mesh>
      <mesh position={[0, layout.ceilingY, zMid]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2 * layout.sideWallX, depth]} />
        <meshStandardMaterial color={room.surface.slateDark} roughness={0.9} />
      </mesh>
      {/* Behind the camera: a wall so the floor has something warm to reflect
          when the owner orbits round. */}
      <mesh position={[0, layout.ceilingY / 2, layout.backWallZ]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[2 * layout.sideWallX, layout.ceilingY]} />
        <meshStandardMaterial color={room.surface.creamShadow} roughness={0.8} />
      </mesh>
    </group>
  );
}

/**
 * The warm coves: a ring in the ceiling and two strips along the side walls.
 * Emissive, so the bloom and the floor reflection both read them as light.
 * The lights in `LightingRig` are what actually light the room; these are
 * what the owner sees as the source.
 */
function Coves({ coarse }: { coarse: boolean }) {
  const segments = coarse ? 48 : 128;
  return (
    <group>
      <mesh position={[0, layout.ceilingY - 0.25, -2.4]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5.4, 0.07, 8, segments]} />
        <meshBasicMaterial color={room.warm.cove} toneMapped={false} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (layout.sideWallX - 0.06), 2.7, -1.5]}>
          <boxGeometry args={[0.04, 0.05, 9]} />
          <meshBasicMaterial color={room.warm.amber} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
