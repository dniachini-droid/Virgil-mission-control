import { use } from 'react';
import { loadConsole } from '../props/consoleAsset.js';
import { loadOrrery } from '../props/orreryAsset.js';
import { loadPorthole } from '../props/portholeAsset.js';
import { loadVirgil } from '../virgil/virgilAsset.js';
import { layout } from './palette.js';

/**
 * The owner-supplied models, placed. Each loader returns a group whose origin
 * is the model's base at its chosen real-world size, so placing one is a
 * matter of where its feet go — the centre-pivot correction and the
 * single-siding both happen in `meshyAsset.ts`, not here.
 *
 * Virgil is static: the file has no rig and no clip (0 animations, 0 skins),
 * and posing a rigless mesh is not in this slice. He stands in the console
 * well facing +z — the screens, and the camera beyond them.
 */

export function VirgilFigure() {
  const virgil = use(loadVirgil());
  return <primitive object={virgil.placed} position={layout.virgilAt} />;
}

/** Turned 180° from the file so the screen arc is on the camera's side. */
export function ConsoleDais() {
  const console_ = use(loadConsole());
  return (
    <primitive
      object={console_.placed}
      position={layout.consoleCentre}
      rotation={[0, layout.consoleRotationY, 0]}
    />
  );
}

/** The owner's metal orrery: solid, so it stands beside the console. */
export function MetalOrrery() {
  const orrery = use(loadOrrery());
  return <primitive object={orrery.placed} position={layout.metalOrreryAt} />;
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
