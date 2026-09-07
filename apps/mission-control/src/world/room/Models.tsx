import { useFrame } from '@react-three/fiber';
import { use, useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
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

/**
 * The Prover, at the side station, with his face. The file has no rig, so
 * he carries idle motion instead: a 1.5 cm rise and fall and a 1.5° sway,
 * out of phase with each other and with Virgil's clip, so he is never a
 * statue and never in step with anyone. Still with reduced motion.
 *
 * His visor is fitted to his dome from the dome's own triangles
 * (`visorFit.ts`, `PROVER_VISOR`) — a spherical cap, not a plate — and lives
 * inside the same group as his body, so it breathes with him. V3 had it
 * fixed in the room while his head rose and fell under it.
 */
export function ProverFigure({ face = 'idle' }: { face?: FaceState }) {
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
    const t = clock.getElapsedTime();
    group.current.position.y = layout.proverAt[1] + 0.015 * Math.sin(t * 0.9 + 1.3);
    group.current.rotation.z = 0.026 * Math.sin(t * 0.55 + 0.4);
    group.current.rotation.y = layout.proverRotationY + 0.02 * Math.sin(t * 0.37);
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
