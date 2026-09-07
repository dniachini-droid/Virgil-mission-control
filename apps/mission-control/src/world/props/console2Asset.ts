/** console2: see `asset-pipeline/reduce-model.mjs console2` and `src/world/assets/meshyAsset.ts`. */
import { loadMeshyAsset, type MeshyAsset } from '../assets/meshyAsset.js';
import payloadBase64 from './console2-asset.b64.txt?raw';
import metadata from './console2-asset.json';

export const console2Metadata = metadata;

export function loadConsole2(): Promise<MeshyAsset> {
  return loadMeshyAsset(metadata, payloadBase64);
}
