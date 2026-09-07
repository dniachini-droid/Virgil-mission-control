/**
 * The console dais, from `assets/models/candidates/console-model-candidate-01.glb`,
 * reduced by `asset-pipeline/reduce-model.mjs console`.
 */
import { type MeshyAsset, loadMeshyAsset } from '../assets/meshyAsset.js';
import payloadBase64 from './console-asset.b64.txt?raw';
import metadata from './console-asset.json';

export const consoleMetadata = metadata;

export function loadConsole(): Promise<MeshyAsset> {
  return loadMeshyAsset(metadata, payloadBase64);
}
