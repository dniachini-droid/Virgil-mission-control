import { useFrame } from '@react-three/fiber';
import { use, useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { breathe } from '../characters/breathing.js';
import { type FaceState, Visor } from '../characters/Visor.js';
import { fitHeadSurface, PROVER_VISOR, placedPositions } from '../characters/visorFit.js';
import { loadConsole2 } from '../props/console2Asset.js';
import { loadPorthole } from '../props/portholeAsset.js';
import { loadProver } from '../props/proverAsset.js';
import { loadStation } from '../props/stationAsset.js';
import { layout } from './palette.js';

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
