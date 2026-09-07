/** station: see `asset-pipeline/reduce-model.mjs station` and `src/world/assets/meshyAsset.ts`. */
import { loadMeshyAsset, type MeshyAsset } from '../assets/meshyAsset.js';
import payloadBase64 from './station-asset.b64.txt?raw';
import metadata from './station-asset.json';

export const stationMetadata = metadata;

export function loadStation(): Promise<MeshyAsset> {
  return loadMeshyAsset(metadata, payloadBase64);
}
