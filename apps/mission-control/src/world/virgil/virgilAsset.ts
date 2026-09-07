/**
 * Virgil, from `assets/models/candidates/virgil-model-candidate-02.glb`,
 * reduced by `asset-pipeline/reduce-model.mjs virgil`. See
 * `src/world/assets/meshyAsset.ts` for the decode path and the two load-time
 * corrections (centre pivot, double-siding).
 */
import { type MeshyAsset, loadMeshyAsset } from '../assets/meshyAsset.js';
import payloadBase64 from './virgil-asset.b64.txt?raw';
import metadata from './virgil-asset.json';

export const virgilMetadata = metadata;

export function loadVirgil(): Promise<MeshyAsset> {
  return loadMeshyAsset(metadata, payloadBase64);
}
