import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { room } from './palette.js';
import { spaceFragment, spaceVertex } from './spaceShaders.js';

/**
 * Everything on the far side of the glass: the galaxy, a ringed planet and a
 * distant station.
 *
 * This is not scenery. It is the cool half of the room's lighting contrast, and
 * the only reason the warm amber inside the room reads as warm. The reference
 * makes the window the strongest element in the frame and this follows it.
 *
 * All of it sits far outside the room shell, so the wall's circular aperture is
 * what crops it — there is no separate mask.
 */
export function SpaceBeyond() {
  const { reducedMotion, tier } = useSettings();
  const material = useRef<THREE.ShaderMaterial>(null);
  const coarse = tier === 'constrained' || tier === 'mobile';

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCore: { value: new THREE.Color(room.nebula.core) },
      uArm: { value: new THREE.Color(room.nebula.arm) },
      uMid: { value: new THREE.Color(room.nebula.mid) },
      uOuter: { value: new THREE.Color(room.nebula.outer) },
      uDust: { value: new THREE.Color(room.nebula.dust) },
      uExposure: { value: 1.18 },
    }),
    [],
  );

  useFrame((_, delta) => {
    if (material.current && !reducedMotion) {
      material.current.uniforms.uTime!.value += delta;
    }
  });

  return (
    <group>
      {/* The sky. Radius 300 m, centred on the window so the parallax as the
          owner orbits reads as distance rather than as a moving backdrop. */}
      <mesh position={[0, 3.2, -7]} frustumCulled={false}>
        <sphereGeometry args={[300, coarse ? 32 : 64, coarse ? 20 : 40]} />
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={spaceVertex}
          fragmentShader={spaceFragment}
          side={THREE.BackSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <RingedPlanet coarse={coarse} />
      <Station coarse={coarse} />
    </group>
  );
}

/**
 * The ringed planet, left of frame as in the reference. Lit from the galactic
 * core rather than by the room, so its terminator faces the right way.
 */
function RingedPlanet({ coarse }: { coarse: boolean }) {
  return (
    <group position={[-64, 44, -232]} rotation={[0, 0, -0.34]}>
      <mesh>
        <sphereGeometry args={[22, coarse ? 24 : 48, coarse ? 16 : 32]} />
        <meshStandardMaterial
          color={room.cool.rim}
          roughness={0.85}
          metalness={0}
          emissive={room.nebula.mid}
          emissiveIntensity={0.55}
        />
      </mesh>
      {/* Rings as flat annuli, not tori: seen this close to edge-on a torus
          reads as a tube. */}
      <mesh rotation={[Math.PI / 2 - 0.22, 0, 0]}>
        <ringGeometry args={[28, 42, coarse ? 48 : 128]} />
        <meshBasicMaterial
          color={room.emit.ice}
          transparent
          opacity={0.34}
          side={THREE.DoubleSide}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2 - 0.22, 0, 0]}>
        <ringGeometry args={[44, 50, coarse ? 48 : 128]} />
        <meshBasicMaterial
          color={room.cool.window}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * A distant station: a lens on a spindle with a lit rim. Small, and read as a
 * silhouette against the galaxy — its job is to give the window a sense of
 * inhabited scale, not detail.
 */
function Station({ coarse }: { coarse: boolean }) {
  const segments = coarse ? 24 : 64;
  return (
    <group position={[58, 34, -196]} rotation={[0.16, -0.4, 0.08]}>
      <mesh>
        <cylinderGeometry args={[15, 15, 1.1, segments]} />
        <meshStandardMaterial
          color={room.surface.slate}
          roughness={0.5}
          metalness={0.7}
          emissive={room.cool.window}
          emissiveIntensity={0.25}
        />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[6.4, 9.6, 2.6, segments]} />
        <meshStandardMaterial color={room.surface.creamShadow} roughness={0.45} metalness={0.6} />
      </mesh>
      {/* The lit rim: emissive teal, which in this palette may only ever be
          light, never a painted surface. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[15.1, 16.4, segments]} />
        <meshBasicMaterial
          color={room.emit.cyan}
          transparent
          opacity={0.75}
          side={THREE.DoubleSide}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, -3.2, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 6, 12]} />
        <meshStandardMaterial color={room.surface.brass} roughness={0.4} metalness={0.8} />
      </mesh>
    </group>
  );
}
