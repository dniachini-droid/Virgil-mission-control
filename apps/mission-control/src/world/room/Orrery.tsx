import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { ringFragment, ringVertex } from './orreryShaders.js';
import { layout, room } from './palette.js';

/**
 * The orrery of light, with Virgil at its centre.
 *
 * V2, on the owner's direction: he stands in the console well and **replaces
 * the sun**. There is no core — the tracks and planets turn around him, and
 * the metaphor is load-bearing: he is the conductor, and the world turning
 * around him is a true statement about this system, not decoration.
 *
 * The orrery is also his light. Two of the planets carry small point lights,
 * so coloured bounce moves across his chest and cape as they pass; a warm
 * practical sits low in front of him where the rings are brightest, which is
 * the reference's uplight from the console.
 *
 * Clearance is the risk: a ring through his body reads as broken and undoes
 * the whole effect. His silhouette is 1.341 m wide at nominal scale — 1.21 m
 * at 1.8 m tall — so the innermost track radius is 0.98 m, a 0.37 m margin
 * to the discs beside his head; his cape is 0.45 m deep, well inside that.
 * Tilts are kept small so no track dips below the console rim (0.93 m) or
 * climbs into his face. Checked in screenshots at several rotation phases.
 *
 * Every track has its own axis and its own rate, deliberately non-
 * commensurate, so the arrangement never returns to the same configuration
 * and never reads as one rigid object spinning.
 */

interface Track {
  radius: number;
  /** Height of the track's plane relative to the orrery centre. */
  lift: number;
  /** Tilt of the orbital plane, in radians, about x and z. */
  tilt: [number, number];
  /** Angular rate in radians per second. Signed: some orbits run retrograde. */
  rate: number;
  /** Starting phase, so the planets do not begin in a line. */
  phase: number;
  colour: string;
  sweep: string;
  planetRadius: number;
  planetColour: string;
  /** Rate of the bright arc travelling along the track, independent of the planet. */
  sweepRate: number;
  sweepSharpness: number;
  /** Whether the planet carries a point light onto Virgil. */
  lit: boolean;
}

const TRACKS: readonly Track[] = [
  {
    radius: 0.98,
    lift: -0.12,
    tilt: [0.06, -0.04],
    rate: 0.52,
    phase: 0.0,
    colour: room.warm.amber,
    sweep: room.warm.core,
    planetRadius: 0.05,
    planetColour: room.emit.teal,
    sweepRate: 0.8,
    sweepSharpness: 7.0,
    lit: true,
  },
  {
    radius: 1.16,
    lift: 0.04,
    tilt: [-0.09, 0.07],
    rate: -0.37,
    phase: 2.1,
    colour: room.surface.goldBright,
    sweep: room.warm.core,
    planetRadius: 0.062,
    planetColour: room.emit.magenta,
    sweepRate: -0.55,
    sweepSharpness: 9.0,
    lit: true,
  },
  {
    radius: 1.34,
    lift: -0.04,
    tilt: [0.11, 0.05],
    rate: 0.29,
    phase: 4.0,
    colour: room.warm.amber,
    sweep: room.emit.ice,
    planetRadius: 0.044,
    planetColour: room.emit.ice,
    sweepRate: 0.42,
    sweepSharpness: 11.0,
    lit: false,
  },
  {
    radius: 1.52,
    lift: 0.1,
    tilt: [-0.05, -0.1],
    rate: -0.21,
    phase: 1.2,
    colour: room.surface.goldBright,
    sweep: room.warm.core,
    planetRadius: 0.07,
    planetColour: room.emit.rose,
    sweepRate: 0.31,
    sweepSharpness: 13.0,
    lit: false,
  },
  {
    radius: 1.72,
    lift: 0.0,
    tilt: [0.04, 0.09],
    rate: 0.16,
    phase: 5.3,
    colour: room.warm.amber,
    sweep: room.emit.cyan,
    planetRadius: 0.048,
    planetColour: room.emit.cyan,
    sweepRate: 0.22,
    sweepSharpness: 15.0,
    lit: false,
  },
];

export function Orrery({
  position = layout.orreryCentre,
}: {
  position?: readonly [number, number, number];
}) {
  const { reducedMotion, tier } = useSettings();
  const coarse = tier === 'constrained' || tier === 'mobile';
  const tracks = coarse ? TRACKS.filter((_, i) => i !== 1 && i !== 3) : TRACKS;

  return (
    <group position={[position[0], position[1], position[2]]}>
      {tracks.map((track) => (
        <TrackRing key={track.radius} track={track} frozen={reducedMotion} coarse={coarse} />
      ))}
      {/* The warm practical: low and in front of him, where the rings pass
          closest to the camera. Decay 2 is physical falloff, so the intensity
          is large; this is what lights his chest and the underside of his
          face, as the console does in the reference. */}
      <pointLight
        color={room.warm.amber}
        intensity={3}
        distance={5}
        decay={2}
        position={[0, -0.35, 1.0]}
      />
    </group>
  );
}

function TrackRing({ track, frozen, coarse }: { track: Track; frozen: boolean; coarse: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const planet = useRef<THREE.Group>(null);
  const elapsed = useRef(track.phase);

  const uniforms = useMemo(
    () => ({
      uColour: { value: new THREE.Color(track.colour) },
      uSweepColour: { value: new THREE.Color(track.sweep) },
      uRadius: { value: track.radius },
      uWidth: { value: 0.05 },
      uPhase: { value: track.phase },
      uIntensity: { value: 1.45 },
      uSweepSharpness: { value: track.sweepSharpness },
    }),
    [track],
  );

  useFrame((_, delta) => {
    if (frozen) return;
    elapsed.current += delta;
    if (material.current) {
      material.current.uniforms.uPhase!.value = track.phase + elapsed.current * track.sweepRate;
    }
    if (planet.current) {
      planet.current.rotation.y = track.phase + elapsed.current * track.rate;
    }
  });

  // The quad is sized to the outer edge of the band, no larger: every extra
  // pixel is an additively blended fragment for nothing.
  const extent = track.radius + 0.075;

  return (
    <group position={[0, track.lift, 0]} rotation={[track.tilt[0], 0, track.tilt[1]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false}>
        <planeGeometry args={[extent * 2, extent * 2]} />
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={ringVertex}
          fragmentShader={ringFragment}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <group ref={planet}>
        <mesh position={[track.radius, 0, 0]}>
          <sphereGeometry args={[track.planetRadius, coarse ? 12 : 24, coarse ? 8 : 16]} />
          {/* A planet is a lit body, so it is standard-shaded — but it carries
              emissive too, because in the reference the little worlds glow. */}
          <meshStandardMaterial
            color={track.planetColour}
            emissive={track.planetColour}
            emissiveIntensity={0.9}
            roughness={0.32}
            metalness={0.1}
            toneMapped={false}
          />
        </mesh>
        {track.lit && !coarse ? (
          <pointLight
            color={track.planetColour}
            intensity={1.6}
            distance={3.2}
            decay={2}
            position={[track.radius, 0, 0]}
          />
        ) : null}
      </group>
    </group>
  );
}
