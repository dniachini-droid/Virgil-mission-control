/**
 * The armillary orrery, from `assets/models/candidates/orrery-model-candidate-01.glb`,
 * reduced by `asset-pipeline/reduce-model.mjs orrery`. This is the owner's
 * metal orrery; the additive-light one is `../room/Orrery.tsx`.
 */
import { loadMeshyAsset, type MeshyAsset } from '../assets/meshyAsset.js';
import payloadBase64 from './orrery-asset.b64.txt?raw';
import metadata from './orrery-asset.json';

export const orreryMetadata = metadata;

export function loadOrrery(): Promise<MeshyAsset> {
  return loadMeshyAsset(metadata, payloadBase64);
}
