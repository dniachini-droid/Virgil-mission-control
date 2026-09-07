import { MeshReflectorMaterial } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { layout, room } from './palette.js';

/**
 * The room itself: the reflective floor with its inlaid rings and star, the
 * back wall with the circular window aperture, the parapet under the glass,
 * side walls, ceiling, and the warm coves that make the room's own light.
 *
 * Surfaces are cream, gold and brass only. Teal and magenta never appear here
 * as a material colour; they arrive through the aperture from `SpaceBeyond`.
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
      <Parapet />
      <SideWallsAndCeiling />
      <Coves coarse={coarse} />
    </group>
  );
}

function Floor({ coarse }: { coarse: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[layout.floorRadius, coarse ? 32 : 64]} />
      {/* Cream stone, polished. `mirror` short of 1 keeps the base colour in
          the surface; the blur spreads the reflection the way a waxed floor
          does rather than a mirror. */}
      <MeshReflectorMaterial
        color={room.surface.cream}
        resolution={coarse ? 512 : 1024}
        mirror={0.55}
        mixBlur={1}
        mixStrength={1.4}
        blur={[320, 120]}
        depthScale={0.9}
        minDepthThreshold={0.6}
        maxDepthThreshold={1.6}
        depthToBlurRatioBias={0.25}
        roughness={0.35}
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
      {/* The star, in the foreground where the low camera sees it. */}
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
 * The back wall is one shape with a circular hole: the aperture is what crops
 * the galaxy, so there is no separate mask and no seam.
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
    hole.absarc(layout.windowCentre[0], layout.windowCentre[1], layout.windowRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    return new THREE.ShapeGeometry(shape, coarse ? 32 : 96);
  }, [coarse]);

  const [wx, wy, wz] = layout.windowCentre;
  const ringSegments = coarse ? 48 : 128;
  return (
    <group>
      <mesh geometry={geometry} position={[0, 0, layout.wallZ]} receiveShadow>
        <meshStandardMaterial color={room.surface.cream} roughness={0.75} metalness={0.02} />
      </mesh>
      {/* The gold bezel round the aperture, and the broad cream arch outside
          it: the reference frames the window in exactly this pairing. */}
      <mesh position={[wx, wy, wz + 0.04]}>
        <torusGeometry args={[layout.windowRadius + 0.06, 0.11, 12, ringSegments]} />
        <meshStandardMaterial color={room.surface.gold} roughness={0.28} metalness={0.95} />
      </mesh>
      <mesh position={[wx, wy, wz + 0.02]}>
        <ringGeometry args={[layout.windowRadius + 0.17, layout.windowRadius + 0.95, ringSegments]} />
        <meshStandardMaterial color={room.surface.ivory} roughness={0.6} metalness={0.05} />
      </mesh>
      <mesh position={[wx, wy, wz + 0.05]}>
        <torusGeometry args={[layout.windowRadius + 0.95, 0.05, 8, ringSegments]} />
        <meshStandardMaterial color={room.surface.brass} roughness={0.35} metalness={0.9} />
      </mesh>
      {/* Glazing bars: three thin gold ribs across the glass, offset from the
          centre so they never cross Virgil's face from the authored camera. */}
      {[-0.55, 0.62].map((t) => (
        <mesh key={t} position={[wx + t * layout.windowRadius, wy, wz + 0.02]}>
          <boxGeometry
            args={[0.05, 2 * Math.sqrt(1 - t * t) * layout.windowRadius + 0.1, 0.05]}
          />
          <meshStandardMaterial color={room.surface.gold} roughness={0.3} metalness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/** The low wall under the window, with a warm cove along its top edge. */
function Parapet() {
  const width = 2 * (layout.windowRadius + 1.4);
  return (
    <group position={[0, 0, layout.parapetZ]}>
      <mesh position={[0, layout.parapetHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, layout.parapetHeight, layout.wallZ * -1 + layout.parapetZ]} />
        <meshStandardMaterial color={room.surface.creamShadow} roughness={0.7} metalness={0.03} />
      </mesh>
      <mesh position={[0, layout.parapetHeight + 0.03, 0.02]}>
        <boxGeometry args={[width + 0.1, 0.06, 0.9]} />
        <meshStandardMaterial color={room.surface.gold} roughness={0.3} metalness={0.95} />
      </mesh>
      {/* The cove: an emissive strip along the front edge. */}
      <mesh position={[0, layout.parapetHeight - 0.08, 0.46]}>
        <boxGeometry args={[width - 0.3, 0.035, 0.02]} />
        <meshBasicMaterial color={room.warm.cove} toneMapped={false} />
      </mesh>
    </group>
  );
}

function SideWallsAndCeiling() {
  const depth = layout.backWallZ - layout.wallZ;
  const zMid = (layout.backWallZ + layout.wallZ) / 2;
  return (
    <group>
      <mesh position={[-layout.sideWallX, layout.ceilingY / 2, zMid]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[depth, layout.ceilingY]} />
        <meshStandardMaterial color={room.surface.creamShadow} roughness={0.8} />
      </mesh>
      <mesh position={[layout.sideWallX, layout.ceilingY / 2, zMid]} rotation={[0, -Math.PI / 2, 0]}>
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
 * Emissive, untone-mapped, so the bloom and the floor reflection both read
 * them as light. The `pointLight`s in `LightingRig` are what actually light
 * the room; these are what the owner sees as the source.
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
