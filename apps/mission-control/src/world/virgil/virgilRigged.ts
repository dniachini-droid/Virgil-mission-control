/**
 * The rigged, animated Virgil, from
 * `assets/models/candidates/virgil-model-candidate-03-rigged.glb`, reduced by
 * `asset-pipeline/reduce-rigged.mjs`.
 *
 * The payload carries an image-free GLB (skin, skeleton, the clips the room
 * uses) followed by three WebP images. `GLTFLoader.parse()` reads the GLB
 * from memory; because it contains no images it creates no `blob:` URL and
 * issues no request — the one network behaviour GLTFLoader has, and the
 * reason the static props avoid it entirely. The images are decoded from
 * in-memory Blobs with `createImageBitmap`, as everywhere else in the room,
 * and attached to the material after parsing.
 */
import {
  type AnimationClip,
  type Bone,
  type ColorSpace,
  FrontSide,
  Group,
  LinearSRGBColorSpace,
  MeshStandardMaterial,
  RepeatWrapping,
  type SkinnedMesh,
  SRGBColorSpace,
  Texture,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import payloadBase64 from './virgil-rigged-asset.b64.txt?raw';
import metadata from './virgil-rigged-asset.json';

export const virgilRiggedMetadata = metadata;

export interface RiggedVirgil {
  /** Scene root at the chosen size, origin at his feet. Place this. */
  placed: Group;
  mesh: SkinnedMesh;
  clips: AnimationClip[];
  /** The head joint, for anchoring the visor panel. */
  head: Bone;
  /** The bezel joint (`headfront`), a second anchor if present. */
  headFront: Bone | null;
  metadata: typeof metadata;
}

interface Section {
  offset: number;
  length: number;
  mimeType?: string;
}

function section(name: string): Section {
  const found = (metadata.payload.sections as Record<string, Section | undefined>)[name];
  if (!found) throw new Error(`virgil rigged: no section "${name}"`);
  return found;
}

function decodePayload(): ArrayBuffer {
  const binary = atob(payloadBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  if (bytes.length !== metadata.payload.bytes) {
    throw new Error(
      `virgil rigged: payload is ${bytes.length} bytes, expected ${metadata.payload.bytes}`,
    );
  }
  return bytes.buffer;
}

async function decodeTexture(buffer: ArrayBuffer, name: string, colorSpace: ColorSpace) {
  const { offset, length, mimeType } = section(name);
  const bitmap = await createImageBitmap(
    new Blob([new Uint8Array(buffer, offset, length)], { type: mimeType ?? 'image/webp' }),
  );
  const texture = new Texture(bitmap);
  texture.flipY = false;
  texture.colorSpace = colorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function parseGlb(buffer: ArrayBuffer): Promise<{ scene: Group; animations: AnimationClip[] }> {
  const { offset, length } = section('glb');
  // GLTFLoader.parse wants a buffer of its own, starting at byte 0.
  const glb = buffer.slice(offset, offset + length);
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(glb, '', (gltf) => resolve(gltf), reject);
  });
}

async function build(): Promise<RiggedVirgil> {
  const buffer = decodePayload();
  const [gltf, map, metallicRoughness, normalMap] = await Promise.all([
    parseGlb(buffer),
    decodeTexture(buffer, 'map_base_color', SRGBColorSpace),
    decodeTexture(buffer, 'map_metallic_roughness', LinearSRGBColorSpace),
    decodeTexture(buffer, 'map_normal', LinearSRGBColorSpace),
  ]);

  let mesh: SkinnedMesh | null = null;
  gltf.scene.traverse((object) => {
    if ((object as SkinnedMesh).isSkinnedMesh) mesh = object as SkinnedMesh;
  });
  if (!mesh) throw new Error('virgil rigged: no skinned mesh in the GLB');
  const skinned = mesh as SkinnedMesh;

  skinned.material = new MeshStandardMaterial({
    map,
    normalMap,
    roughnessMap: metallicRoughness,
    metalnessMap: metallicRoughness,
    metalness: 1,
    roughness: 1,
    side: FrontSide,
  });
  skinned.castShadow = true;
  skinned.receiveShadow = true;
  // Skinned bounds move with the pose; never let the culler guess.
  skinned.frustumCulled = false;

  const head = gltf.scene.getObjectByName(metadata.runtime.headJoint) as Bone | undefined;
  if (!head) throw new Error(`virgil rigged: no joint "${metadata.runtime.headJoint}"`);
  const headFront =
    (gltf.scene.getObjectByName(metadata.runtime.headFrontJoint) as Bone | undefined) ?? null;

  const placed = new Group();
  gltf.scene.scale.setScalar(metadata.runtime.scale);
  gltf.scene.position.y = metadata.runtime.baseOffsetY;
  placed.add(gltf.scene);

  return { placed, mesh: skinned, clips: gltf.animations, head, headFront, metadata };
}

let pending: Promise<RiggedVirgil> | null = null;

/** Memoised so React's double-render and Suspense retries decode once. */
export function loadRiggedVirgil(): Promise<RiggedVirgil> {
  pending ??= build();
  return pending;
}
