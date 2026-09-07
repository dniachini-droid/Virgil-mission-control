import { use } from 'react';
import { loadConsole } from '../props/consoleAsset.js';
import { loadOrrery } from '../props/orreryAsset.js';
import { loadVirgil } from '../virgil/virgilAsset.js';
import { layout } from './palette.js';

/**
 * The three owner-supplied models, placed. Each loader returns a group whose
 * origin is the model's base at its chosen real-world size, so placing one is
 * a matter of where its feet go — the centre-pivot correction and the
 * single-siding both happen in `meshyAsset.ts`, not here.
 *
 * Virgil is static: the file has no rig and no clip (0 animations, 0 skins),
 * and posing a rigless mesh is not in this slice.
 */

export function VirgilFigure() {
  const virgil = use(loadVirgil());
  return <primitive object={virgil.placed} position={layout.virgilAt} rotation={[0, -0.12, 0]} />;
}

export function ConsoleDais() {
  const console_ = use(loadConsole());
  return <primitive object={console_.placed} position={layout.consoleCentre} />;
}

/** The owner's metal orrery, standing on the console top. */
export function MetalOrrery() {
  const orrery = use(loadOrrery());
  return <primitive object={orrery.placed} position={layout.orreryAt} />;
}
