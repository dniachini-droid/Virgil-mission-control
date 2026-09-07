/**
 * Builds the runtime Virgil asset from the committed model candidate.
 *
 * Input:  `assets/models/candidates/virgil-model-candidate-02.glb`, read only and
 *         never written. That file is the source of record and stays byte for
 *         byte as the owner delivered it (`assets/licenses/ASSET_PROVENANCE.md`).
 * Output: `src/world/virgil/virgil-asset.json` (metadata) and
 *         `virgil-asset.b64.txt` (the payload, base64). Both are committed, so
 *         `build:owner` stays deterministic and the Owner Build artifact stays
 *         reproducible byte for byte from its commit — re-encoding images
 *         through a browser is not bit-stable across Chromium versions, so it
 *         must not sit in the build path.
 *
 * Why a bespoke payload instead of a reduced `.glb` and three.js `GLTFLoader`:
 * GLTFLoader turns `bufferView`-backed images into `blob:` object URLs and
 * loads them through `ImageBitmapLoader`/`ImageLoader`, which issues a real
 * request. `e2e/verify-owner-build.ts` fails on any request that is not the
 * document, and rightly so — the no-network property is the point of the Owner
 * Build. Decoding in-memory `Blob`s with `createImageBitmap` issues none.
 *
 * Three measured defects in the source are corrected here or at load, never in
 * the source file:
 *  1. the pivot sits at the model's centre, not its feet — handled at load
 *     (`virgilAsset.ts`), which needs the measured bounds this script records;
 *  2. `doubleSided: true` — the runtime material is single-sided;
 *  3. the 2.000 m height is Meshy's unit-box normalisation, not an authored
 *     scale — the chosen height is applied at load and recorded in the metadata.
 *
 * Usage: node asset-pipeline/reduce-virgil.mjs
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(appRoot, '../..');
const sourcePath = join(repoRoot, 'assets/models/candidates/virgil-model-candidate-02.glb');
const outDir = join(appRoot, 'src/world/virgil');

/** The SHA-256 recorded for the source in `assets/licenses/ASSET_PROVENANCE.md`. */
const EXPECTED_SOURCE_SHA =
  'fd80610192d099f4f4c198a8efdf7b8edada9e7015a1f4ace65fe6d1de3f0a25';

/**
 * Texture plan. 1024 for the two textures whose detail is visible on the
 * surface, 512 for metallic-roughness, which encodes two smoothly varying
 * masks and carries no fine detail worth 4x the pixels.
 */
const TEXTURE_PLAN = {
  base_color: { size: 1024, quality: 0.82 },
  normal: { size: 1024, quality: 0.9 },
  metallic_roughness: { size: 512, quality: 0.8 },
};

const COMPONENT_TYPES = {
  5120: { name: 'BYTE', size: 1 },
  5121: { name: 'UNSIGNED_BYTE', size: 1 },
  5122: { name: 'SHORT', size: 2 },
  5123: { name: 'UNSIGNED_SHORT', size: 2 },
  5125: { name: 'UNSIGNED_INT', size: 4 },
  5126: { name: 'FLOAT', size: 4 },
};
const TYPE_COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function fail(message) {
  console.error(`reduce-virgil: ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------- parse the GLB

const file = readFileSync(sourcePath);
const sourceSha = createHash('sha256').update(file).digest('hex');
if (sourceSha !== EXPECTED_SOURCE_SHA) {
  fail(
    `source GLB sha256 is ${sourceSha}, but the provenance register records ` +
      `${EXPECTED_SOURCE_SHA}. Refusing to build from an unrecognised file.`,
  );
}

if (file.readUInt32LE(0) !== 0x46546c67) fail('not a binary glTF: bad magic');
if (file.readUInt32LE(4) !== 2) fail(`unsupported glTF container version ${file.readUInt32LE(4)}`);
if (file.readUInt32LE(8) !== file.length) {
  fail(`declared length ${file.readUInt32LE(8)} !== actual ${file.length}`);
}

let cursor = 12;
let gltf = null;
let bin = null;
while (cursor < file.length) {
  const chunkLength = file.readUInt32LE(cursor);
  const chunkType = file.readUInt32LE(cursor + 4);
  const body = file.subarray(cursor + 8, cursor + 8 + chunkLength);
  if (chunkType === 0x4e4f534a) gltf = JSON.parse(body.toString('utf8'));
  else if (chunkType === 0x004e4942) bin = body;
  cursor += 8 + chunkLength;
}
if (!gltf) fail('no JSON chunk');
if (!bin) fail('no BIN chunk');

/** Reads one accessor out of the BIN chunk, refusing anything non-trivial. */
function readAccessor(index) {
  const accessor = gltf.accessors[index];
  const componentType = COMPONENT_TYPES[accessor.componentType];
  if (!componentType) fail(`accessor ${index}: unknown componentType`);
  const components = TYPE_COMPONENTS[accessor.type];
  if (!components) fail(`accessor ${index}: unknown type ${accessor.type}`);
  if (accessor.sparse) fail(`accessor ${index}: sparse accessors are not handled`);
  if (accessor.normalized) fail(`accessor ${index}: normalized accessors are not handled`);
  const view = gltf.bufferViews[accessor.bufferView];
  if (view.buffer !== 0) fail(`accessor ${index}: buffer ${view.buffer} is not the BIN chunk`);
  const elementSize = componentType.size * components;
  const stride = view.byteStride ?? elementSize;
  if (stride !== elementSize) fail(`accessor ${index}: interleaved data is not handled`);
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const bytes = bin.subarray(start, start + accessor.count * elementSize);
  const Ctor = componentType.name === 'FLOAT' ? Float32Array : componentType.name === 'UNSIGNED_INT' ? Uint32Array : componentType.name === 'UNSIGNED_SHORT' ? Uint16Array : Uint8Array;
  // A copy, because the subarray is not guaranteed to be aligned for the view.
  const out = new Ctor(accessor.count * components);
  Buffer.from(out.buffer).set(bytes);
  return { array: out, count: accessor.count, components, type: componentType.name };
}

const mesh = gltf.meshes?.[0];
if (!mesh) fail('no mesh');
if (gltf.meshes.length !== 1) fail(`expected 1 mesh, found ${gltf.meshes.length}`);
if (mesh.primitives.length !== 1) fail(`expected 1 primitive, found ${mesh.primitives.length}`);
const prim = mesh.primitives[0];
if ((prim.mode ?? 4) !== 4) fail(`expected TRIANGLES, found mode ${prim.mode}`);

const position = readAccessor(prim.attributes.POSITION);
const normal = readAccessor(prim.attributes.NORMAL);
const uv = readAccessor(prim.attributes.TEXCOORD_0);
const index = readAccessor(prim.indices);

// TANGENT is deliberately dropped: 40,179 x VEC4 x 4 bytes = 642,864 bytes, and
// three.js derives a tangent frame from screen-space derivatives when the
// attribute is absent. Recorded so the omission is visible, not silent.
const tangentDropped = prim.attributes.TANGENT !== undefined;

// -------------------------------------------------------- measure, don't assume

let minY = Number.POSITIVE_INFINITY;
let maxY = Number.NEGATIVE_INFINITY;
let minX = Number.POSITIVE_INFINITY;
let maxX = Number.NEGATIVE_INFINITY;
let minZ = Number.POSITIVE_INFINITY;
let maxZ = Number.NEGATIVE_INFINITY;
for (let i = 0; i < position.count; i += 1) {
  const x = position.array[i * 3];
  const y = position.array[i * 3 + 1];
  const z = position.array[i * 3 + 2];
  if (x < minX) minX = x;
  if (x > maxX) maxX = x;
  if (y < minY) minY = y;
  if (y > maxY) maxY = y;
  if (z < minZ) minZ = z;
  if (z > maxZ) maxZ = z;
}

let maxIndex = 0;
for (let i = 0; i < index.array.length; i += 1) {
  if (index.array[i] > maxIndex) maxIndex = index.array[i];
}
if (maxIndex >= position.count) fail(`index ${maxIndex} out of range for ${position.count} vertices`);

// UNSIGNED_INT -> UNSIGNED_SHORT halves the index buffer. Only legal because the
// highest index measured above fits; checked rather than assumed.
const narrowIndices = maxIndex < 65536;
if (!narrowIndices) fail('indices do not fit in UNSIGNED_SHORT; the u16 path would corrupt them');
const indices16 = new Uint16Array(index.array.length);
for (let i = 0; i < index.array.length; i += 1) indices16[i] = index.array[i];

// ------------------------------------------------------------ material and maps

const material = gltf.materials?.[0];
if (!material) fail('no material');

/** Resolves a texture reference to its embedded image bytes and declared name. */
function imageFor(textureInfo, label) {
  if (!textureInfo) fail(`material has no ${label}`);
  const texture = gltf.textures[textureInfo.index];
  const image = gltf.images[texture.source];
  if (image.uri) fail(`${label}: external image URI, expected an embedded bufferView`);
  const view = gltf.bufferViews[image.bufferView];
  const start = view.byteOffset ?? 0;
  return {
    name: image.name ?? label,
    mimeType: image.mimeType,
    bytes: bin.subarray(start, start + view.byteLength),
  };
}

const maps = {
  base_color: imageFor(material.pbrMetallicRoughness?.baseColorTexture, 'baseColorTexture'),
  metallic_roughness: imageFor(
    material.pbrMetallicRoughness?.metallicRoughnessTexture,
    'metallicRoughnessTexture',
  ),
  normal: imageFor(material.normalTexture, 'normalTexture'),
};

// ------------------------------------------------- re-encode through Chromium

// No image library is in the workspace (no sharp, no jimp) and the brief forbids
// adding a dependency. Chromium is already a devDependency for the Owner Build
// verifier, so the decode/resize/encode happens there.
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto('about:blank');

const reencoded = {};
for (const [key, map] of Object.entries(maps)) {
  const plan = TEXTURE_PLAN[key];
  const result = await page.evaluate(
    async ({ b64, size, quality, mimeType }) => {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const source = await createImageBitmap(new Blob([bytes], { type: mimeType }));
      const canvas = new OffscreenCanvas(size, size);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, 0, 0, size, size);
      const blob = await canvas.convertToBlob({ type: 'image/webp', quality });
      const out = new Uint8Array(await blob.arrayBuffer());
      let encoded = '';
      for (let i = 0; i < out.length; i += 1) encoded += String.fromCharCode(out[i]);
      return {
        sourceWidth: source.width,
        sourceHeight: source.height,
        outType: blob.type,
        b64: btoa(encoded),
      };
    },
    {
      b64: Buffer.from(map.bytes).toString('base64'),
      size: plan.size,
      quality: plan.quality,
      mimeType: map.mimeType,
    },
  );
  if (result.outType !== 'image/webp') {
    fail(`${key}: Chromium returned ${result.outType}, not image/webp`);
  }
  const bytes = Buffer.from(result.b64, 'base64');
  reencoded[key] = {
    bytes,
    width: plan.size,
    height: plan.size,
    mimeType: 'image/webp',
    sourceBytes: map.bytes.length,
    sourceWidth: result.sourceWidth,
    sourceHeight: result.sourceHeight,
    sourceMimeType: map.mimeType,
    quality: plan.quality,
  };
  console.log(
    `reduce-virgil: ${key} ${result.sourceWidth}x${result.sourceHeight} ${map.mimeType} ` +
      `${map.bytes.length} B -> ${plan.size}x${plan.size} image/webp q${plan.quality} ${bytes.length} B`,
  );
}
await browser.close();

// ------------------------------------------------------------- pack the payload

const sections = {};
const parts = [];
let offset = 0;
function push(name, view, extra = {}) {
  const bytes = Buffer.from(view.buffer, view.byteOffset ?? 0, view.byteLength ?? view.length);
  // Every section starts 4-byte aligned so a typed-array view over the decoded
  // payload can be taken without copying.
  const pad = (4 - (offset % 4)) % 4;
  if (pad > 0) {
    parts.push(Buffer.alloc(pad));
    offset += pad;
  }
  sections[name] = { offset, length: bytes.length, ...extra };
  parts.push(bytes);
  offset += bytes.length;
}

push('position', position.array, { kind: 'f32', components: 3, count: position.count });
push('normal', normal.array, { kind: 'f32', components: 3, count: normal.count });
push('uv', uv.array, { kind: 'f32', components: 2, count: uv.count });
push('index', indices16, { kind: 'u16', components: 1, count: indices16.length });
// Prefixed, because the normal *map* and the geometry `normal` attribute would
// otherwise claim the same section name and the image would silently overwrite
// the vertex normals' offset and length.
for (const [key, map] of Object.entries(reencoded)) {
  push(`map_${key}`, map.bytes, {
    kind: 'image',
    mimeType: map.mimeType,
    width: map.width,
    height: map.height,
  });
}

const payload = Buffer.concat(parts);
const b64 = payload.toString('base64');

// -------------------------------------------------------------- chosen scale

// The 2.000 m source height is Meshy's unit-box normalisation, not an authored
// scale (`assets/licenses/ASSET_PROVENANCE.md`). 1.65 m is chosen so the dais
// top at 1.05 m meets Virgil at mid-chest, as it does in the approved reference
// `docs/art-direction/approved/visual-canon/03-approved-hybrid.png`, and so his
// eye line sits just above the orrery and the camera can hold both.
const TARGET_HEIGHT_M = 1.65;
const sourceHeight = maxY - minY;
const scale = TARGET_HEIGHT_M / sourceHeight;

const metadata = {
  $comment:
    'Generated by asset-pipeline/reduce-virgil.mjs from the unmodified committed model candidate. Do not hand-edit; regenerate.',
  source: {
    path: 'assets/models/candidates/virgil-model-candidate-02.glb',
    sha256: sourceSha,
    bytes: file.length,
    generator: gltf.asset?.generator ?? null,
    provenance: 'assets/licenses/ASSET_PROVENANCE.md',
    licenceBasis: 'docs/decisions/OD-0008-meshy-licence-attestation.md',
  },
  measured: {
    vertexCount: position.count,
    triangleCount: index.array.length / 3,
    maxIndex,
    boundsMin: [minX, minY, minZ],
    boundsMax: [maxX, maxY, maxZ],
    sourceDoubleSided: material.doubleSided === true,
    sourceHasTangent: tangentDropped,
    sourceAnimations: gltf.animations?.length ?? 0,
    sourceSkins: gltf.skins?.length ?? 0,
  },
  reductions: {
    tangentDropped,
    indicesNarrowedToU16: narrowIndices,
    textures: Object.fromEntries(
      Object.entries(reencoded).map(([key, map]) => [
        key,
        {
          from: `${map.sourceWidth}x${map.sourceHeight} ${map.sourceMimeType} ${map.sourceBytes} B`,
          to: `${map.width}x${map.height} ${map.mimeType} q${map.quality} ${map.bytes.length} B`,
          bytes: map.bytes.length,
          sourceBytes: map.sourceBytes,
        },
      ]),
    ),
  },
  runtime: {
    targetHeightMetres: TARGET_HEIGHT_M,
    scale,
    // Applied after scaling, so the soles sit on y = 0 instead of one metre under it.
    feetOffsetY: -minY * scale,
    doubleSided: false,
  },
  payload: {
    bytes: payload.length,
    base64Bytes: b64.length,
    sha256: createHash('sha256').update(payload).digest('hex'),
    sections,
  },
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'virgil-asset.json'), `${JSON.stringify(metadata, null, 2)}\n`);
// No trailing newline and no wrapping: every byte here is multiplied into the
// Owner Build artifact, which is a single downloaded file on a budget.
writeFileSync(join(outDir, 'virgil-asset.b64.txt'), b64);

const geometryBytes = ['position', 'normal', 'uv', 'index'].reduce(
  (sum, key) => sum + sections[key].length,
  0,
);
const textureBytes = Object.keys(reencoded).reduce(
  (sum, key) => sum + sections[`map_${key}`].length,
  0,
);
console.log(`reduce-virgil: geometry ${geometryBytes} B (was 2302464 B)`);
console.log(`reduce-virgil: textures ${textureBytes} B (was 10086976 B)`);
console.log(`reduce-virgil: payload  ${payload.length} B, base64 ${b64.length} B`);
console.log(`reduce-virgil: source   ${file.length} B unchanged at ${sourcePath}`);
