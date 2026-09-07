/**
 * Decodes the reduced Virgil payload into a three.js mesh, entirely in memory.
 *
 * Nothing here reaches the network, and that is a hard property rather than a
 * happy accident: the Owner Build is one `.html` file opened from `file://`,
 * where `fetch` and `XMLHttpRequest` are blocked outright, and
 * `e2e/verify-owner-build.ts` fails the build on any request that is not the
 * document itself. So the payload arrives as a base64 string compiled into the
 * bundle, and the three images are decoded from in-memory `Blob`s with
 * `createImageBitmap` — no `blob:` URL, no `data:` URI, no request.
 *
 * The two defects that are corrected at load rather than in the source file, so
 * that `assets/models/candidates/virgil-model-candidate-02.glb` stays byte for
 * byte as the owner delivered it:
 *
 *  - **the pivot is at his centre, not his feet.** The source bounding box runs
 *    y = -1.0 to +1.0, so placed naively on a floor he sinks one metre into it.
 *    `feetOffsetY` in the metadata is the measured correction.
 *  - **`doubleSided: true`.** The source material disables backface culling for
 *    all 31,156 triangles, at double the fragment cost and no benefit on an
 *    opaque model. The runtime material is `FrontSide`.
 *
 * The third — that the 2.000 m height is Meshy's unit-box normalisation and not
 * an authored scale — is a decision, not a repair, and is recorded in
 * `virgil-asset.json` under `runtime.targetHeightMetres`.
 */
import {
  BufferAttribute,
  BufferGeometry,
  type ColorSpace,
  LinearSRGBColorSpace,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
} from 'three';
import payloadBase64 from './virgil-asset.b64.txt?raw';
import metadata from './virgil-asset.json';

export const virgilMetadata = metadata;

interface Section {
  offset: number;
  length: number;
}

function section(name: string): Section {
  const found = (metadata.payload.sections as Record<string, Section | undefined>)[name];
  if (!found) throw new Error(`virgil asset: no section "${name}"`);
  return found;
}

function decodePayload(): ArrayBuffer {
  const binary = atob(payloadBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  if (bytes.length !== metadata.payload.bytes) {
    throw new Error(
      `virgil asset: payload is ${bytes.length} bytes, metadata declares ${metadata.payload.bytes}`,
    );
  }
  return bytes.buffer;
}

async function decodeTexture(
  buffer: ArrayBuffer,
  name: string,
  colorSpace: ColorSpace,
): Promise<Texture> {
  const { offset, length } = section(name);
  const view = new Uint8Array(buffer, offset, length);
  // A copy into a plain Blob: `createImageBitmap` accepts the Blob directly and
  // decodes it off the network stack entirely.
  const bitmap = await createImageBitmap(new Blob([view], { type: 'image/webp' }));
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

async function build(): Promise<Mesh<BufferGeometry, MeshStandardMaterial>> {
  const buffer = decodePayload();

  const position = section('position');
  const normal = section('normal');
  const uv = section('uv');
  const index = section('index');

  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(buffer, position.offset, position.length / 4), 3),
  );
  geometry.setAttribute(
    'normal',
    new BufferAttribute(new Float32Array(buffer, normal.offset, normal.length / 4), 3),
  );
  geometry.setAttribute(
    'uv',
    new BufferAttribute(new Float32Array(buffer, uv.offset, uv.length / 4), 2),
  );
  geometry.setIndex(
    new BufferAttribute(new Uint16Array(buffer, index.offset, index.length / 2), 1),
  );
  // TANGENT was dropped in the reduction; three.js derives a tangent frame from
  // screen-space derivatives when the attribute is absent.
  geometry.computeBoundingSphere();

  const [map, metallicRoughness, normalMap] = await Promise.all([
    decodeTexture(buffer, 'map_base_color', SRGBColorSpace),
    decodeTexture(buffer, 'map_metallic_roughness', LinearSRGBColorSpace),
    decodeTexture(buffer, 'map_normal', LinearSRGBColorSpace),
  ]);

  const material = new MeshStandardMaterial({
    map,
    normalMap,
    // One glTF metallic-roughness image serves both channels: three.js reads
    // roughness from green and metalness from blue.
    roughnessMap: metallicRoughness,
    metalnessMap: metallicRoughness,
    // The source material declares no factors, so the glTF defaults apply and
    // both are 1.0 — the texture supplies the actual values. A fully metallic
    // object with nothing to reflect renders black, which is why
    // `EnvironmentRig` is not optional here.
    metalness: 1,
    roughness: 1,
  });

  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

let pending: Promise<Mesh<BufferGeometry, MeshStandardMaterial>> | null = null;

/** Memoised so React's double-render and Suspense retries decode once. */
export function loadVirgil(): Promise<Mesh<BufferGeometry, MeshStandardMaterial>> {
  pending ??= build();
  return pending;
}
