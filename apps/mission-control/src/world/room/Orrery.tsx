import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { ringFragment, ringVertex } from './orreryShaders.js';
import { layout, room } from './palette.js';

/**
 * The orrery over the console: concentric orbital tracks, planets riding them,
 * and a hot core.
 *
 * This is the element most likely to make the frame feel alive, and it is also
 * the room's warm practical light — the uplight on Virgil's chest and face in
 * the reference comes from here, so the core carries a real `pointLight` and not
 * just an emissive material.
 *
 * Every track has its own axis and its own rate, deliberately non-commensurate,
 * so the arrangement never returns to the same configuration and never reads as
 * one rigid object spinning.
 */

interface Track {
  radius: number;
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
}

/**
 * Five tracks. The tilts stay small — the reference reads the orrery as a
 * near-flat platter seen at a shallow angle, not as an armillary sphere — but no
 * two share a plane, which is what stops it looking like a single disc.
 */
const TRACKS: readonly Track[] = [
  {
    radius: 0.42,
    tilt: [0.07, -0.05],
    rate: 0.62,
    phase: 0.0,
    colour: room.warm.amber,
    sweep: room.warm.core,
    planetRadius: 0.055,
    planetColour: room.emit.teal,
    sweepRate: 0.9,
    sweepSharpness: 7.0,
  },
  {
    radius: 0.66,
    tilt: [-0.13, 0.09],
    rate: -0.41,
    phase: 2.1,
    colour: room.emit.cyan,
    sweep: room.emit.ice,
    planetRadius: 0.072,
    planetColour: room.emit.magenta,
    sweepRate: -0.55,
    sweepSharpness: 9.0,
  },
  {
    radius: 0.9,
    tilt: [0.19, 0.06],
    rate: 0.29,
    phase: 4.4,
    colour: room.emit.teal,
    sweep: room.warm.core,
    planetRadius: 0.062,
    planetColour: room.surface.goldBright,
    sweepRate: 0.42,
    sweepSharpness: 11.0,
  },
  {
    radius: 1.14,
    tilt: [-0.08, -0.17],
    rate: -0.185,
    phase: 1.2,
    colour: room.emit.magenta,
    sweep: room.emit.rose,
    planetRadius: 0.085,
    planetColour: room.cool.rim,
    sweepRate: -0.3,
    sweepSharpness: 13.0,
  },
  {
    radius: 1.38,
    tilt: [0.11, 0.14],
    rate: 0.121,
    phase: 5.6,
    colour: room.surface.goldBright,
    sweep: room.warm.amber,
    planetRadius: 0.048,
    planetColour: room.emit.cyan,
    sweepRate: 0.22,
    sweepSharpness: 15.0,
  },
];

export function Orrery({ position = layout.orreryAt }: { position?: readonly [number, number, number] }) {
  const { reducedMotion, tier } = useSettings();
  const coarse = tier === 'constrained' || tier === 'mobile';
  const tracks = coarse ? TRACKS.filter((_, i) => i !== 1 && i !== 3) : TRACKS;

  return (
    <group position={[position[0], position[1] + 0.32, position[2]]}>
      <Core coarse={coarse} />
      {tracks.map((track) => (
        <TrackRing key={track.radius} track={track} frozen={reducedMotion} coarse={coarse} />
      ))}
    </group>
  );
}

/**
 * The core: a small hot sphere, two additive shells for the halo, and the
 * room's warmest light source.
 */
function Core({ coarse }: { coarse: boolean }) {
  const segments = coarse ? 16 : 32;
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.17, segments, segments / 2]} />
        {/* Basic, untone-mapped and written well above 1.0: this is glare, and
            the bloom pass is what makes it look like glare. */}
        <meshBasicMaterial color={room.warm.core} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.26, segments, segments / 2]} />
        <meshBasicMaterial
          color={room.warm.amber}
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.42, segments, segments / 2]} />
        <meshBasicMaterial
          color={room.warm.amberDeep}
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* The practical. Decay 2 is physically correct falloff, so the intensity
          is large; this is what lights Virgil's chest and the underside of his
          face, as the orrery does in the reference. */}
      <pointLight color={room.warm.amber} intensity={9} distance={9} decay={2} />
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
      uWidth: { value: 0.055 },
      uPhase: { value: track.phase },
      uIntensity: { value: 1.55 },
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
    <group rotation={[track.tilt[0], 0, track.tilt[1]]}>
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
          {/* A planet is a lit body, so it is standard-shaded and takes the
              core's light — but it carries emissive too, because in the
              reference the little worlds glow. */}
          <meshStandardMaterial
            color={track.planetColour}
            emissive={track.planetColour}
            emissiveIntensity={0.85}
            roughness={0.32}
            metalness={0.1}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}
