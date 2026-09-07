/** prover: see `asset-pipeline/reduce-model.mjs prover` and `src/world/assets/meshyAsset.ts`. */
import { loadMeshyAsset, type MeshyAsset } from '../assets/meshyAsset.js';
import payloadBase64 from './prover-asset.b64.txt?raw';
import metadata from './prover-asset.json';

export const proverMetadata = metadata;

export function loadProver(): Promise<MeshyAsset> {
  return loadMeshyAsset(metadata, payloadBase64);
}
