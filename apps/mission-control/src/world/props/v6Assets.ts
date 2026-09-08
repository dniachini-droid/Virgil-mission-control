/**
 * The V6 stylised set: Virgil's console, the three role stations and the
 * three characters, each reduced by `asset-pipeline/reduce-model.mjs` from
 * the unmodified candidate under `assets/models/candidates/` and decoded by
 * `../assets/meshyAsset.ts`. One module for the seven so that the cast
 * table (`../room/cast.ts`) binds roles to models in one place.
 *
 * The rigged Virgil is separate (`../virgil/virgilRigged.ts`) because a
 * skinned mesh takes the GLB route; the porthole frame stays in
 * `portholeAsset.ts` because it is the one ornate-set model still used.
 */
import { loadMeshyAsset, type MeshyAsset, type MeshyAssetMetadata } from '../assets/meshyAsset.js';
import type { VisorMask } from '../characters/visorFit.js';
import console3Base64 from './console3-asset.b64.txt?raw';
import console3Json from './console3-asset.json';
import fabricator2Base64 from './fabricator2-asset.b64.txt?raw';
import fabricator2Json from './fabricator2-asset.json';
import fabricator2Visor from './fabricator2-visor.json';
import fabricatorStationBase64 from './fabricatorStation-asset.b64.txt?raw';
import fabricatorStationJson from './fabricatorStation-asset.json';
import fabricatorStationScreen from './fabricatorStation-screen.json';
import keeper2Base64 from './keeper2-asset.b64.txt?raw';
import keeper2Json from './keeper2-asset.json';
import keeper2Visor from './keeper2-visor.json';
import keeperStationBase64 from './keeperStation-asset.b64.txt?raw';
import keeperStationJson from './keeperStation-asset.json';
import keeperStationScreen from './keeperStation-screen.json';
import prover2Base64 from './prover2-asset.b64.txt?raw';
import prover2Json from './prover2-asset.json';
import prover2Visor from './prover2-visor.json';
import proverStationBase64 from './proverStation-asset.b64.txt?raw';
import proverStationJson from './proverStation-asset.json';
import proverStationScreen from './proverStation-screen.json';

export const console3Metadata: MeshyAssetMetadata = console3Json;
export const fabricatorStationMetadata: MeshyAssetMetadata = fabricatorStationJson;
export const proverStationMetadata: MeshyAssetMetadata = proverStationJson;
export const keeperStationMetadata: MeshyAssetMetadata = keeperStationJson;
export const fabricator2Metadata: MeshyAssetMetadata = fabricator2Json;
export const prover2Metadata: MeshyAssetMetadata = prover2Json;
export const keeper2Metadata: MeshyAssetMetadata = keeper2Json;

/** Which of each head's triangles carry the painted visor (`asset-pipeline/fit-visor.mjs`). */
export const fabricator2VisorMask: VisorMask = fabricator2Visor;
export const prover2VisorMask: VisorMask = prover2Visor;
export const keeper2VisorMask: VisorMask = keeper2Visor;

/**
 * Which of each station's triangles are its screen
 * (`asset-pipeline/fit-screen.mjs`, V8 §0.10.2): the same mask shape as a
 * visor's, so the same builder draws the live screen on the console's own
 * surface, with a rule that keeps every pixel because the screens carry
 * baked writing.
 */
export const fabricatorStationScreenMask: VisorMask = fabricatorStationScreen;
export const proverStationScreenMask: VisorMask = proverStationScreen;
export const keeperStationScreenMask: VisorMask = keeperStationScreen;

export const console3Base64Payload = console3Base64;
export const fabricatorStationBase64Payload = fabricatorStationBase64;
export const proverStationBase64Payload = proverStationBase64;
export const keeperStationBase64Payload = keeperStationBase64;
export const fabricator2Base64Payload = fabricator2Base64;
export const prover2Base64Payload = prover2Base64;
export const keeper2Base64Payload = keeper2Base64;

export function loadConsole3(): Promise<MeshyAsset> {
  return loadMeshyAsset(console3Metadata, console3Base64);
}
export function loadFabricatorStation(): Promise<MeshyAsset> {
  return loadMeshyAsset(fabricatorStationMetadata, fabricatorStationBase64);
}
export function loadProverStation(): Promise<MeshyAsset> {
  return loadMeshyAsset(proverStationMetadata, proverStationBase64);
}
export function loadKeeperStation(): Promise<MeshyAsset> {
  return loadMeshyAsset(keeperStationMetadata, keeperStationBase64);
}
export function loadFabricator2(): Promise<MeshyAsset> {
  return loadMeshyAsset(fabricator2Metadata, fabricator2Base64);
}
export function loadProver2(): Promise<MeshyAsset> {
  return loadMeshyAsset(prover2Metadata, prover2Base64);
}
export function loadKeeper2(): Promise<MeshyAsset> {
  return loadMeshyAsset(keeper2Metadata, keeper2Base64);
}
