/**
 * Decodes a reduced Meshy model payload (see `asset-pipeline/reduce-model.mjs`)
 * into a three.js mesh, entirely in memory.
 *
 * Nothing here reaches the network, and that is a hard property rather than a
 * happy accident: the Owner Build is one `.html` file opened from `file://`,
 * where `fetch` and `XMLHttpRequest` are blocked outright, and
 * `e2e/verify-owner-build.ts` fails the build on any request that is not the
 * document itself. So each payload arrives as a base64 string compiled into
 * the bundle, and its three images are decoded from in-memory `Blob`s with
 * `createImageBitmap` — no `blob:` URL, no `data:` URI, no request.
 *
 * Two defects in every source are corrected at load rather than in the file,
 * so that the committed `.glb` stays byte for byte as the owner delivered it:
 *
 *  - **the pivot is at the model's centre, not its base.** Placed naively on a
 *    floor every one of them sinks. `runtime.baseOffsetY` is the measured lift.
 *  - **`doubleSided: true`.** The source disables backface culling for every
 *    triangle, at double the fragment cost and no benefit on an opaque model.
 *    The runtime material is `FrontSide`.
 *
 * The third — that the 2-unit box is Meshy's normalisation and not an authored
 * scale — is a decision, not a repair, and each model's metadata records the
 * chosen size and the reason under `runtime`.
 */
import {
  BufferAttribute,
  BufferGeometry,
  type ColorSpace,
  FrontSide,
  Group,
  LinearSRGBColorSpace,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
} from 'three';

interface Section {
  offset: number;
  length: number;
  kind?: string;
  components?: number;
  count?: number;
  mimeType?: string;
}

export interface MeshyAssetMetadata {
  source: { path: string; sha256: string };
  measured: { vertexCount: number; triangleCount: number };
  runtime: {
    targetAxis: string;
    targetMetres: number;
    scale: number;
    positionScale: number;
    baseOffsetY: number;
  };
  payload: { bytes: number; sections: Record<string, Section> };
}

export interface MeshyAsset {
  /** The mesh itself, unscaled, with its pivot where the source put it. */
  mesh: Mesh<BufferGeometry, MeshStandardMaterial>;
  /**
   * The mesh wrapped so the group's origin is the model's base on the floor
   * (or on whatever it stands on) at the chosen real-world size. Place this.
   */
  placed: Group;
  metadata: MeshyAssetMetadata;
}

function section(metadata: MeshyAssetMetadata, name: string): Section {
  const found = metadata.payload.sections[name];
  if (!found) throw new Error(`${metadata.source.path}: no section "${name}"`);
  return found;
}

function decodePayload(metadata: MeshyAssetMetadata, base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  if (bytes.length !== metadata.payload.bytes) {
    throw new Error(
      `${metadata.source.path}: payload is ${bytes.length} bytes, metadata declares ${metadata.payload.bytes}`,
    );
  }
  return bytes.buffer;
}

async function decodeTexture(
  metadata: MeshyAssetMetadata,
  buffer: ArrayBuffer,
  name: string,
  colorSpace: ColorSpace,
): Promise<Texture> {
  const { offset, length, mimeType } = section(metadata, name);
  const view = new Uint8Array(buffer, offset, length);
  // A copy into a plain Blob: `createImageBitmap` accepts the Blob directly and
  // decodes it off the network stack entirely. WebP decoding is assumed of the
  // owner's browser (Safari 14+, every Chromium and Firefox in years); it is
  // untested there and named in the accompanying document.
  const bitmap = await createImageBitmap(new Blob([view], { type: mimeType ?? 'image/webp' }));
  const texture = new Texture(bitmap);
  // glTF UVs have their origin at the top left, so the image is not flipped.
  // Leaving this at three.js's default of `true` would also take the
  // `UNPACK_FLIP_Y_WEBGL` path, which is unreliable for `ImageBitmap` sources.
  texture.flipY = false;
  texture.colorSpace = colorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

async function build(metadata: MeshyAssetMetadata, base64: string): Promise<MeshyAsset> {
  const buffer = decodePayload(metadata, base64);

  const position = section(metadata, 'position');
  const normal = section(metadata, 'normal');
  const uv = section(metadata, 'uv');
  const index = section(metadata, 'index');

  const geometry = new BufferGeometry();
  // Quantised attributes are handed to the GPU as normalised integers and
  // restored to floats there; the position range is put back by scaling the
  // mesh, which keeps the vertex data at 13 bytes rather than 32.
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Int16Array(buffer, position.offset, position.length / 2), 3, true),
  );
  geometry.setAttribute(
    'normal',
    new BufferAttribute(new Int8Array(buffer, normal.offset, normal.length), 3, true),
  );
  geometry.setAttribute(
    'uv',
    new BufferAttribute(new Uint16Array(buffer, uv.offset, uv.length / 2), 2, true),
  );
  geometry.setIndex(
    new BufferAttribute(new Uint16Array(buffer, index.offset, index.length / 2), 1),
  );
  // TANGENT was dropped in the reduction; three.js derives a tangent frame from
  // screen-space derivatives when the attribute is absent.
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();

  // The normal map is optional: the porthole frame ships without one.
  const hasNormalMap = metadata.payload.sections.map_normal !== undefined;
  const [map, metallicRoughness, normalMap] = await Promise.all([
    decodeTexture(metadata, buffer, 'map_base_color', SRGBColorSpace),
    decodeTexture(metadata, buffer, 'map_metallic_roughness', LinearSRGBColorSpace),
    hasNormalMap ? decodeTexture(metadata, buffer, 'map_normal', LinearSRGBColorSpace) : null,
  ]);

  const material = new MeshStandardMaterial({
    map,
    normalMap: normalMap ?? null,
    // One glTF metallic-roughness image serves both channels: three.js reads
    // roughness from green and metalness from blue.
    roughnessMap: metallicRoughness,
    metalnessMap: metallicRoughness,
    // The source declares no factors, so the glTF defaults apply and both are
    // 1.0 — the texture supplies the actual values. A fully metallic object
    // with nothing to reflect renders black, which is why the room's
    // environment map is not optional.
    metalness: 1,
    roughness: 1,
    side: FrontSide,
  });

  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const { scale, positionScale, baseOffsetY } = metadata.runtime;
  mesh.scale.setScalar(scale * positionScale);
  mesh.position.y = baseOffsetY;

  const placed = new Group();
  placed.add(mesh);
  return { mesh, placed, metadata };
}

const pending = new Map<string, Promise<MeshyAsset>>();

/** Memoised per model so React's double-render and Suspense retries decode once. */
export function loadMeshyAsset(metadata: MeshyAssetMetadata, base64: string): Promise<MeshyAsset> {
  let promise = pending.get(metadata.source.path);
  if (!promise) {
    promise = build(metadata, base64);
    pending.set(metadata.source.path, promise);
  }
  return promise;
}
