import { useMemo } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { layout, room } from './palette.js';

/**
 * The console dais: a round raised platform in cream and gold, carrying the
 * orrery.
 *
 * Deliberately simple geometry. The reference's dais is a turned cylindrical
 * form with a gold rim, ball-topped posts and inset readouts, and none of that
 * needs a modelled mesh — it needs to be lit well and to have crisp gold
 * separations against cream. Effort spent here on silhouette and material
 * response buys more than effort spent on detail that the low camera never
 * resolves.
 */

const POST_COUNT = 12;

export function Dais() {
  const { tier } = useSettings();
  const coarse = tier === 'constrained' || tier === 'mobile';
  const segments = coarse ? 32 : 96;

  const cream = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: room.surface.cream,
        roughness: 0.42,
        metalness: 0.08,
      }),
    [],
  );
  const creamPolished = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: room.surface.ivory,
        // Glossy, so the orrery above it lays a reflection across the platter.
        roughness: 0.16,
        metalness: 0.14,
      }),
    [],
  );
  const gold = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: room.surface.gold,
        roughness: 0.24,
        metalness: 1,
      }),
    [],
  );
  const brass = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: room.surface.brass,
        roughness: 0.35,
        metalness: 0.95,
      }),
    [],
  );
  const slate = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: room.surface.slateDark,
        roughness: 0.55,
        metalness: 0.3,
      }),
    [],
  );

  const posts = useMemo(
    () =>
      Array.from({ length: POST_COUNT }, (_, i) => {
        const angle = (i / POST_COUNT) * Math.PI * 2 + Math.PI / POST_COUNT;
        return {
          key: i,
          x: Math.cos(angle) * (layout.daisRadius - 0.07),
          z: Math.sin(angle) * (layout.daisRadius - 0.07),
        };
      }),
    [],
  );

  return (
    <group position={layout.daisCentre}>
      {/* Plinth. Set back from the body so the body reads as overhanging, which
          is what gives the dais a shadow line at its foot. */}
      <mesh position={[0, 0.14, 0]} material={slate} castShadow receiveShadow>
        <cylinderGeometry args={[1.34, 1.42, 0.28, segments]} />
      </mesh>

      {/* Fluted body. Eight panels of cream separated by brass, rather than one
          smooth drum: the separations are what catch the warm key light. */}
      <mesh position={[0, 0.6, 0]} material={cream} castShadow receiveShadow>
        <cylinderGeometry args={[1.62, 1.5, 0.64, segments]} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * 1.58, 0.6, Math.sin(angle) * 1.58]}
            rotation={[0, -angle, 0]}
            material={brass}
          >
            <boxGeometry args={[0.05, 0.64, 0.07]} />
          </mesh>
        );
      })}

      {/* Gold rim under the platter — the strongest single line in the dais. */}
      <mesh position={[0, 0.98, 0]} material={gold} castShadow receiveShadow>
        <cylinderGeometry args={[1.7, 1.66, 0.1, segments]} />
      </mesh>

      {/* The platter. */}
      <mesh position={[0, 1.03, 0]} material={creamPolished} receiveShadow>
        <cylinderGeometry args={[1.68, 1.7, 0.04, segments]} />
      </mesh>

      {/* Two inlaid gold tracks on the platter, concentric with the orrery. */}
      {[1.52, 1.2].map((radius) => (
        <mesh key={radius} position={[0, 1.051, 0]} rotation={[-Math.PI / 2, 0, 0]} material={gold}>
          <ringGeometry args={[radius - 0.018, radius, segments]} />
        </mesh>
      ))}

      {/* Ball-topped posts around the rim. */}
      {posts.map((post) => (
        <group key={post.key} position={[post.x, 1.05, post.z]}>
          <mesh material={brass} castShadow>
            <cylinderGeometry args={[0.018, 0.022, 0.17, 8]} />
          </mesh>
          <mesh position={[0, 0.115, 0]} material={gold} castShadow>
            <sphereGeometry args={[0.038, 12, 8]} />
          </mesh>
        </group>
      ))}

      {/* Front readout, angled up towards the camera. Teal, and emitted — in
          this palette teal is never a painted surface. */}
      <group position={[0, 0.72, 1.5]} rotation={[-0.42, 0, 0]}>
        <mesh material={gold}>
          <boxGeometry args={[0.92, 0.005, 0.42]} />
        </mesh>
        <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.84, 0.34]} />
          <meshBasicMaterial color={room.emit.cyan} toneMapped={false} transparent opacity={0.62} />
        </mesh>
      </group>

      {/* A cool underglow at the foot, so the dais does not sit on the floor
          with a dead edge. Cheap, and it separates the base from its reflection. */}
      <pointLight
        position={[0, 0.12, 1.2]}
        color={room.emit.cyan}
        intensity={0.5}
        distance={2.6}
        decay={2}
      />
    </group>
  );
}
