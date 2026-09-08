/**
 * The porthole window frame, from
 * `assets/models/candidates/porthole-model-candidate-01.glb`, reduced by
 * `asset-pipeline/reduce-model.mjs porthole`. A flat ring in its own XY plane;
 * the wall aperture is cut to its measured hole (`measured.minRadiusXY`).
 */
import { loadMeshyAsset, type MeshyAsset } from '../assets/meshyAsset.js';
import payloadBase64 from './porthole-asset.b64.txt?raw';
import metadata from './porthole-asset.json';

export const portholeMetadata = metadata;

export function loadPorthole(): Promise<MeshyAsset> {
  return loadMeshyAsset(metadata, payloadBase64);
}
