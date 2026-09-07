import { use } from 'react';
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

/** The Prover, static (no rig in the file), at the side station. */
export function ProverFigure() {
  const prover = use(loadProver());
  return (
    <primitive
      object={prover.placed}
      position={layout.proverAt}
      rotation={[0, layout.proverRotationY, 0]}
    />
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
