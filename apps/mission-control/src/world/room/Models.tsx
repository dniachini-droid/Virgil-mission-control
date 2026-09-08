import { useFrame } from '@react-three/fiber';
import { use, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { breathe } from '../characters/breathing.js';
import { type FaceState, Visor } from '../characters/Visor.js';
import { fitHeadSurface, PROVER_VISOR, placedPositions } from '../characters/visorFit.js';
import { loadConsole2 } from '../props/console2Asset.js';
import { loadPorthole } from '../props/portholeAsset.js';
import { loadProver } from '../props/proverAsset.js';
import { loadStation } from '../props/stationAsset.js';
import type { ScreenContent } from '../screens/ScreenBank.js';
import { layout, room } from './palette.js';

/**
 * The owner-supplied static models, placed. Each loader returns a group whose
 * origin is the model's base at its chosen real-world size, so placing one is
 * a matter of where its feet go — the centre-pivot correction and the
 * single-siding both happen in `meshyAsset.ts`, not here. The animated
 * Virgil lives in `../characters/VirgilRigged.tsx`.
 */

/** The ring console, as authored: its low open side faces the camera. */
export function ConsoleRing() {
  const console_ = use(loadConsole2());
  return (
    <primitive
      object={console_.placed}
      position={layout.consoleCentre}
      rotation={[0, layout.consoleRotationY, 0]}
    />
  );
}

/** One generic side station. The station is a place; the agent is the identity. */
export function SideStation() {
  const station = use(loadStation());
  return (
    <primitive
      object={station.placed}
      position={layout.stationAt}
      rotation={[0, layout.stationRotationY, 0]}
    />
  );
}

/** What the Prover is doing; a rigged Prover reads the same prop later. */
export type ProverActivity = 'rest' | 'receiving' | 'working' | 'reported';

const STATION_LIGHT: Record<ProverActivity, string> = {
  rest: room.emit.teal,
  receiving: room.emit.ice,
  working: room.warm.amber,
  reported: '#b6ff5c',
};

/**
 * The station's own light, over the Prover's head, in the colour of what
 * the station is doing: teal at rest, ice while a hand-off arrives — with
 * a flicker as each packet lands, at the panel's packet rate — amber while
 * he works, beating at the panel's check rhythm, and the verdict's colour
 * once it is reported. It is what lets the state be read off him and his
 * station from across the room, not only off the panel.
 */
export function StationLight({
  activity,
  verdict,
}: {
  activity: ProverActivity;
  verdict: ScreenContent['verdict'];
}) {
  const light = useRef<THREE.PointLight>(null);
  const since = useRef({ activity: '' as string, at: 0, t: 0 });
  const { reducedMotion } = useSettings();
  const colour = useMemo(
    () =>
      new THREE.Color(
        activity === 'reported' && verdict === 'BLOCKED' ? '#ff3b5c' : STATION_LIGHT[activity],
      ),
    [activity, verdict],
  );
  useFrame((_, delta) => {
    if (!light.current) return;
    const c = since.current;
    if (!reducedMotion) c.t += delta;
    if (c.activity !== activity) {
      c.activity = activity;
      c.at = c.t;
    }
    const s = c.t - c.at;
    let intensity = 0.7;
    if (activity === 'receiving') {
      // A flash on each landing: packets every 0.26 s from 0.8 s, eight of them.
      const k = Math.floor((s - 0.8) / 0.26);
      const f = (s - 0.8 - k * 0.26) / 0.26;
      intensity = 0.9 + (k >= 0 && k < 8 ? 0.9 * (1 - f) : 0.15 * Math.sin(s * 6));
    } else if (activity === 'working') {
      // The check beat: half a check, 0.525 s, a bright attack and a decay.
      const f = (s % 0.525) / 0.525;
      intensity = 1.1 + 0.8 * (1 - f) ** 2;
    } else if (activity === 'reported') {
      intensity = 1.5 + 0.2 * Math.sin(s * 3);
    }
    light.current.color.copy(colour);
    light.current.intensity = intensity;
  });
  const [sx, , sz] = layout.stationAt;
  return (
    <pointLight
      ref={light}
      position={[sx, 2.05, sz + 0.25]}
      distance={3.2}
      decay={2}
      color={colour}
      intensity={0.7}
    />
  );
}

/**
 * The Prover, standing in the centre of his station, with his face. The
 * file has no rig, so he idles on breathing alone (`breathing.ts`), out of
 * phase with Virgil and a little quicker while he works. His visor is
 * fitted to his dome from the dome's own triangles (`visorFit.ts`,
 * `PROVER_VISOR`) and lives inside the same group, so it breathes with him.
 *
 * The seam for the rigged Prover the owner may supply: `activity` is the
 * whole of what this component knows, and today it only changes the
 * breathing rate. A rigged model replaces the `<primitive>` and maps
 * `activity` to clips, the way `VirgilRigged.tsx` maps poses; nothing
 * upstream changes.
 */
export function ProverFigure({
  face = 'idle',
  activity = 'rest',
}: {
  face?: FaceState;
  activity?: ProverActivity;
}) {
  const prover = use(loadProver());
  const { reducedMotion } = useSettings();
  const group = useRef<THREE.Group>(null);
  const surface = useMemo(() => {
    const index = prover.mesh.geometry.index;
    if (!index) throw new Error('prover: the mesh has no index');
    return fitHeadSurface(placedPositions(prover.mesh), index.array, PROVER_VISOR);
  }, [prover]);
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    const b = breathe(clock.getElapsedTime(), 2.1, activity === 'working' ? 1.6 : 1);
    group.current.position.y = layout.proverAt[1] + b.rise;
    group.current.rotation.z = b.sway;
    group.current.rotation.y = layout.proverRotationY + b.yaw;
  });
  return (
    <group ref={group} position={layout.proverAt} rotation={[0, layout.proverRotationY, 0]}>
      <primitive object={prover.placed} />
      <Visor state={face} surface={surface} lightIntensity={1.1} />
    </group>
  );
}

/**
 * The porthole frame, a ring in its own XY plane. Its group origin is the
 * ring's lowest point, so it is lowered by that offset to centre it on the
 * aperture; its back face sits against the wall.
 */
export function PortholeFrame() {
  const porthole = use(loadPorthole());
  const [x, y, z] = layout.portholeAt;
  return (
    <primitive
      object={porthole.placed}
      position={[x, y - porthole.metadata.runtime.baseOffsetY, z]}
    />
  );
}
