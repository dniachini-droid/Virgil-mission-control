/**
 * Builds a runtime asset payload from one committed Meshy model candidate.
 *
 * This generalises the earlier `reduce-virgil.mjs` to the three models the
 * room needs — Virgil, the console dais and the armillary orrery — which all
 * arrive from the same generator with the same shape: one mesh, one primitive,
 * one material, three embedded 2048² JPEGs, `doubleSided: true`, no factors on
 * the material, and a bounding box normalised to a 2-unit cube centred on the
 * origin.
 *
 * Input:  `assets/models/candidates/<file>.glb`, read only and never written.
 *         Each is the source of record and stays byte for byte as the owner
 *         delivered it (`assets/licenses/ASSET_PROVENANCE.md`). The script
 *         refuses to run if the file's SHA-256 is not the one the register
 *         records.
 * Output: `<outDir>/<name>-asset.json` (metadata) and `<name>-asset.b64.txt`
 *         (the payload, base64). Both are committed, so `build:owner` stays
 *         deterministic and the Owner Build artifact stays reproducible byte
 *         for byte from its commit — re-encoding images through a browser is
 *         not bit-stable across Chromium versions, so it must not sit in the
 *         build path.
 *
 * Why a bespoke payload instead of a reduced `.glb` and three.js `GLTFLoader`:
 * GLTFLoader turns `bufferView`-backed images into `blob:` object URLs and
 * loads them through `ImageBitmapLoader`/`ImageLoader`, which issues a real
 * request. `e2e/verify-owner-build.ts` fails on any request that is not the
 * document, and rightly so — the no-network property is the point of the Owner
 * Build. Decoding in-memory `Blob`s with `createImageBitmap` issues none.
 *
 * Reductions, all recorded in the metadata so none is silent:
 *  - textures re-encoded from 2048² JPEG to smaller WebP through the Chromium
 *    that `@playwright/test` already installs (no image library is in the
 *    workspace and none is added);
 *  - `TANGENT` dropped — three.js derives a tangent frame from screen-space
 *    derivatives when the attribute is absent;
 *  - indices narrowed to `UNSIGNED_SHORT`, legal only because the measured
 *    maximum index fits, which is checked and not assumed;
 *  - positions quantised to normalised `INT16` (the source box is ±1.0, so the
 *    step is 1/32767 of a metre before scaling: 0.03 mm), normals to
 *    normalised `INT8`, UVs to normalised `UINT16` (checked to lie in [0, 1]).
 *    Together these take a vertex from 32 bytes to 13.
 *
 * Three measured defects in every source are corrected here or at load, never
 * in the source file:
 *  1. the pivot sits at the model's centre, not its base — the loader lifts the
 *     mesh by `runtime.baseOffsetY`, measured here;
 *  2. `doubleSided: true` — the runtime material is single-sided;
 *  3. the 2-unit box is Meshy's normalisation, not an authored scale — the
 *     chosen real-world size is applied at load and recorded in the metadata,
 *     with the reason.
 *
 * Usage: node asset-pipeline/reduce-model.mjs <virgil|console|orrery|all>
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(appRoot, '../..');

/**
 * The three models. `expectedSha` is the value recorded in
 * `assets/licenses/ASSET_PROVENANCE.md`; `target` is the chosen real-world
 * size along one axis and the reason it was chosen; `textures` is the plan.
 *
 * Sizes are read against the approved reference
 * `docs/art-direction/approved/visual-canon/03-approved-hybrid.png`, where the
 * dais top meets Virgil at mid-chest and the orrery spans most of the dais.
 */
const MODELS = {
  virgil: {
    source: 'assets/models/candidates/virgil-model-candidate-02.glb',
    expectedSha: 'fd80610192d099f4f4c198a8efdf7b8edada9e7015a1f4ace65fe6d1de3f0a25',
    outDir: 'src/world/virgil',
    target: {
      axis: 'y',
      metres: 1.65,
      reason:
        'The 2.000 m source height is unit-box normalisation. 1.65 m puts the console top across his lower chest as the reference does, and keeps his eye line above the orrery so one low camera holds both.',
    },
    // Virgil is the hero and nearest the camera: 1024 for the two maps whose
    // detail shows, 512 for metallic-roughness, which is two smooth masks.
    textures: {
      base_color: { size: 1024, quality: 0.82 },
      normal: { size: 1024, quality: 0.9 },
      metallic_roughness: { size: 512, quality: 0.8 },
    },
  },
  console: {
    source: 'assets/models/candidates/console-model-candidate-01.glb',
    expectedSha: '0ccf7730ece77d4a3219b04da2b38771d44e5736a37c0c8fa46b8c3cb9c9b568',
    outDir: 'src/world/props',
    target: {
      axis: 'x',
      metres: 2.6,
      reason:
        'The 2.000 m source width is unit-box normalisation. At 2.6 m across the top lands at 0.93 m, which meets a 1.65 m Virgil below the chest as in the reference, and the dais reads as a piece of furniture he stands behind rather than a table he stands beside.',
    },
    // Further from camera than Virgil and half hidden behind him: 1024 base
    // colour because its cream-and-gold panels fill the lower frame, 512 for
    // the normal map (its relief is coarse panelling, not fine grain), 512 MR.
    textures: {
      base_color: { size: 1024, quality: 0.78 },
      normal: { size: 512, quality: 0.85 },
      metallic_roughness: { size: 512, quality: 0.75 },
    },
  },
  orrery: {
    source: 'assets/models/candidates/orrery-model-candidate-01.glb',
    expectedSha: 'a3d859613825199019b36c386f843a372249165a311d069d5b8825ef9454d2e8',
    outDir: 'src/world/props',
    target: {
      axis: 'y',
      metres: 1.15,
      reason:
        'The 2.000 m source height is unit-box normalisation. 1.15 m on top of the 0.93 m console puts the sphere between Virgil’s chest and eyes, so it is read against his face as it is in the reference, without hiding it.',
    },
    // Thin rings and a stand: the base colour carries the brass; 512 is enough
    // for a normal map on members this narrow on screen.
    textures: {
      base_color: { size: 1024, quality: 0.78 },
      normal: { size: 512, quality: 0.85 },
      metallic_roughness: { size: 512, quality: 0.75 },
    },
  },
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
  console.error(`reduce-model: ${message}`);
  process.exit(1);
}

const requested = process.argv[2];
if (!requested || (requested !== 'all' && !MODELS[requested])) {
  fail(`usage: node asset-pipeline/reduce-model.mjs <${Object.keys(MODELS).join('|')}|all>`);
}
const names = requested === 'all' ? Object.keys(MODELS) : [requested];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto('about:blank');

for (const name of names) await reduce(name, MODELS[name]);

await browser.close();

async function reduce(name, model) {
  const sourcePath = join(repoRoot, model.source);
  const outDir = join(appRoot, model.outDir);
  const log = (message) => console.log(`reduce-model[${name}]: ${message}`);

  // ------------------------------------------------------------ parse the GLB

  const file = readFileSync(sourcePath);
  const sourceSha = createHash('sha256').update(file).digest('hex');
  if (sourceSha !== model.expectedSha) {
    fail(
      `${name}: source GLB sha256 is ${sourceSha}, but the provenance register records ` +
        `${model.expectedSha}. Refusing to build from an unrecognised file.`,
    );
  }

  if (file.readUInt32LE(0) !== 0x46546c67) fail('not a binary glTF: bad magic');
  if (file.readUInt32LE(4) !== 2) fail(`unsupported glTF version ${file.readUInt32LE(4)}`);
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
    const Ctor =
      componentType.name === 'FLOAT'
        ? Float32Array
        : componentType.name === 'UNSIGNED_INT'
          ? Uint32Array
          : componentType.name === 'UNSIGNED_SHORT'
            ? Uint16Array
            : Uint8Array;
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
  const tangentDropped = prim.attributes.TANGENT !== undefined;

  // ---------------------------------------------------- measure, don't assume

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < position.count; i += 1) {
    for (let c = 0; c < 3; c += 1) {
      const v = position.array[i * 3 + c];
      if (v < min[c]) min[c] = v;
      if (v > max[c]) max[c] = v;
    }
  }
  let maxIndex = 0;
  for (let i = 0; i < index.array.length; i += 1) {
    if (index.array[i] > maxIndex) maxIndex = index.array[i];
  }
  if (maxIndex >= position.count)
    fail(`index ${maxIndex} out of range for ${position.count} vertices`);
  if (maxIndex >= 65536) fail('indices do not fit in UNSIGNED_SHORT; refusing the u16 path');
  const indices16 = new Uint16Array(index.array.length);
  for (let i = 0; i < index.array.length; i += 1) indices16[i] = index.array[i];

  // ------------------------------------------------------------- quantise

  // Positions: the largest absolute coordinate is measured, and the payload
  // records it as `positionScale` so the loader can restore metres exactly.
  let positionScale = 0;
  for (let i = 0; i < position.array.length; i += 1) {
    const a = Math.abs(position.array[i]);
    if (a > positionScale) positionScale = a;
  }
  const positionQ = new Int16Array(position.array.length);
  for (let i = 0; i < position.array.length; i += 1) {
    positionQ[i] = Math.round((position.array[i] / positionScale) * 32767);
  }
  const normalQ = new Int8Array(normal.array.length);
  for (let i = 0; i < normal.array.length; i += 1) {
    normalQ[i] = Math.round(Math.max(-1, Math.min(1, normal.array[i])) * 127);
  }
  for (let i = 0; i < uv.array.length; i += 1) {
    const v = uv.array[i];
    if (v < -1e-6 || v > 1 + 1e-6) fail(`uv ${i} = ${v} lies outside [0, 1]; refusing to quantise`);
  }
  const uvQ = new Uint16Array(uv.array.length);
  for (let i = 0; i < uv.array.length; i += 1) {
    uvQ[i] = Math.round(Math.max(0, Math.min(1, uv.array[i])) * 65535);
  }

  // -------------------------------------------------------- material and maps

  const material = gltf.materials?.[0];
  if (!material) fail('no material');

  function imageFor(textureInfo, label) {
    if (!textureInfo) fail(`material has no ${label}`);
    const texture = gltf.textures[textureInfo.index];
    const image = gltf.images[texture.source];
    if (image.uri) fail(`${label}: external image URI, expected an embedded bufferView`);
    const view = gltf.bufferViews[image.bufferView];
    const start = view.byteOffset ?? 0;
    return { mimeType: image.mimeType, bytes: bin.subarray(start, start + view.byteLength) };
  }

  const maps = {
    base_color: imageFor(material.pbrMetallicRoughness?.baseColorTexture, 'baseColorTexture'),
    metallic_roughness: imageFor(
      material.pbrMetallicRoughness?.metallicRoughnessTexture,
      'metallicRoughnessTexture',
    ),
    normal: imageFor(material.normalTexture, 'normalTexture'),
  };

  // --------------------------------------------- re-encode through Chromium

  const reencoded = {};
  for (const [key, map] of Object.entries(maps)) {
    const plan = model.textures[key];
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
    if (result.outType !== 'image/webp') fail(`${key}: Chromium returned ${result.outType}`);
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
    log(
      `${key} ${result.sourceWidth}x${result.sourceHeight} ${map.mimeType} ${map.bytes.length} B` +
        ` -> ${plan.size}x${plan.size} image/webp q${plan.quality} ${bytes.length} B`,
    );
  }

  // ---------------------------------------------------------- pack the payload

  const sections = {};
  const parts = [];
  let offset = 0;
  function push(key, view, extra = {}) {
    const bytes = Buffer.from(view.buffer, view.byteOffset ?? 0, view.byteLength ?? view.length);
    // Every section starts 4-byte aligned so a typed-array view over the
    // decoded payload can be taken without copying.
    const pad = (4 - (offset % 4)) % 4;
    if (pad > 0) {
      parts.push(Buffer.alloc(pad));
      offset += pad;
    }
    sections[key] = { offset, length: bytes.length, ...extra };
    parts.push(bytes);
    offset += bytes.length;
  }

  push('position', positionQ, { kind: 'i16n', components: 3, count: position.count });
  push('normal', normalQ, { kind: 'i8n', components: 3, count: normal.count });
  push('uv', uvQ, { kind: 'u16n', components: 2, count: uv.count });
  push('index', indices16, { kind: 'u16', components: 1, count: indices16.length });
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

  // ----------------------------------------------------------- chosen scale

  const axisIndex = { x: 0, y: 1, z: 2 }[model.target.axis];
  const sourceExtent = max[axisIndex] - min[axisIndex];
  const scale = model.target.metres / sourceExtent;

  const metadata = {
    $comment: `Generated by asset-pipeline/reduce-model.mjs ${name} from the unmodified committed model candidate. Do not hand-edit; regenerate.`,
    source: {
      path: model.source,
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
      boundsMin: min,
      boundsMax: max,
      sourceDoubleSided: material.doubleSided === true,
      sourceHasTangent: tangentDropped,
      sourceAnimations: gltf.animations?.length ?? 0,
      sourceSkins: gltf.skins?.length ?? 0,
    },
    reductions: {
      tangentDropped,
      indicesNarrowedToU16: true,
      positionQuantised: 'INT16 normalised, scaled by positionScale',
      normalQuantised: 'INT8 normalised',
      uvQuantised: 'UINT16 normalised',
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
      targetAxis: model.target.axis,
      targetMetres: model.target.metres,
      targetReason: model.target.reason,
      scale,
      positionScale,
      // Applied after scaling, so the base sits on y = 0 instead of under it.
      baseOffsetY: -min[1] * scale,
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
  const jsonPath = join(outDir, `${name}-asset.json`);
  writeFileSync(jsonPath, `${JSON.stringify(metadata, null, 2)}\n`);
  // No trailing newline and no wrapping: every byte here is multiplied into
  // the Owner Build artifact, which is a single downloaded file on a budget.
  writeFileSync(join(outDir, `${name}-asset.b64.txt`), b64);
  // Biome formats JSON and disagrees with JSON.stringify about short arrays.
  execFileSync(join(repoRoot, 'node_modules/.bin/biome'), ['format', '--write', jsonPath]);

  const geometryBytes = ['position', 'normal', 'uv', 'index'].reduce(
    (sum, key) => sum + sections[key].length,
    0,
  );
  const textureBytes = Object.keys(reencoded).reduce(
    (sum, key) => sum + sections[`map_${key}`].length,
    0,
  );
  log(`bounds ${min.map((v) => v.toFixed(3))} .. ${max.map((v) => v.toFixed(3))}`);
  log(`vertices ${position.count}, triangles ${index.array.length / 3}, maxIndex ${maxIndex}`);
  log(`geometry ${geometryBytes} B, textures ${textureBytes} B`);
  log(`payload  ${payload.length} B, base64 ${b64.length} B`);
  log(`scale ${scale.toFixed(4)} (${model.target.axis} -> ${model.target.metres} m), baseOffsetY ${(-min[1] * scale).toFixed(4)}`);
  log(`source   ${file.length} B unchanged at ${sourcePath}`);
}
