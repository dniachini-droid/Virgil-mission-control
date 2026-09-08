/**
 * Builds a runtime asset payload from one committed Meshy model candidate.
 *
 * This generalises the earlier `reduce-virgil.mjs` to the models the room
 * needs — Virgil, the console dais, the armillary orrery and the porthole
 * frame. The first three arrive from `meshy-scene` with the same shape: one
 * mesh, one primitive, one material, three embedded 2048² JPEGs,
 * `doubleSided: true`, no factors on the material, and a bounding box
 * normalised to a 2-unit cube centred on the origin. The porthole went through
 * Blender (`Khronos glTF Blender I/O`): PNG images, no normal map, indices
 * already `UNSIGNED_SHORT`, a node with no transform. Nothing here assumes the
 * generator; every property used is read from the file and checked.
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
 * V6 (`docs/process/PHASE_1_STYLISED_SPEC.md`): the stylised cast and props
 * arrive with **one base-colour texture only** — no metallic-roughness map,
 * no normal map — and **declare** `metallicFactor: 0` and a `roughnessFactor`
 * (0.8, or 0.5 for the Blender-exported Prover). Those factors are the whole
 * of the material, so they are read from the file, recorded under `runtime`,
 * and applied by the loader; a plan that expects a map the file lacks, or a
 * file that carries a map the plan omits, still stops here. A non-square
 * source image is resampled to the planned square like any other, because
 * glTF UVs are normalised and do not care about the image's aspect.
 *
 * Usage: node asset-pipeline/reduce-model.mjs <name|all>
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
      metres: 1.8,
      reason:
        'The 2.000 m source height is unit-box normalisation. V1 used 1.65 m; the owner asked for him a little bigger and V2 makes him the centre of the orrery, which argues for more presence. At 1.8 m standing on the console well floor (0.35 m) his head reaches 2.15 m, above the near screen arc and against the window, and the rings at chest height still clear the console rim.',
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
  console2: {
    source: 'assets/models/candidates/console-model-candidate-02.glb',
    expectedSha: 'efa64ba052c8108f56034edd3f657f9df8b36d06b12728d05830bd75c160e6db',
    outDir: 'src/world/props',
    target: {
      axis: 'x',
      metres: 3.0,
      reason:
        'The 2.000 m source width is unit-box normalisation. Virgil’s console must read as primary against 1.7 m side stations; 3.0 m across puts its ring round a 1.8 m Virgil with room for the orrery’s tracks, and its 0.75 m rim height leaves him standing clear of it rather than squashed inside.',
    },
    textures: {
      base_color: { size: 1024, quality: 0.8 },
      normal: { size: 512, quality: 0.85 },
      metallic_roughness: { size: 512, quality: 0.75 },
    },
  },
  station: {
    source: 'assets/models/candidates/side-station-model-candidate-01.glb',
    expectedSha: 'b83cc4e7a1c5bfa27629ff6003c83e28ea1c3819b6dc971b6ecd4921d2276b4f',
    outDir: 'src/world/props',
    target: {
      axis: 'x',
      metres: 1.7,
      reason:
        'The 2.000 m source width is unit-box normalisation. A side station is secondary to Virgil’s 3.0 m console and is one model instanced at every slot; 1.7 m across (0.6 m tall) reads as a desk an agent stands at, noticeably smaller than his.',
    },
    textures: {
      base_color: { size: 1024, quality: 0.78 },
      normal: { size: 512, quality: 0.85 },
      metallic_roughness: { size: 256, quality: 0.75 },
    },
  },
  prover: {
    source: 'assets/models/candidates/prover-model-candidate-01.glb',
    expectedSha: '412d3bb049cc6f74066457db604cce8beb11bca0547380de173c60b96b000dbc',
    outDir: 'src/world/props',
    target: {
      axis: 'y',
      metres: 1.6,
      reason:
        'The 2.000 m source height is unit-box normalisation. The Prover is a secondary figure at a side station; 1.6 m keeps him clearly shorter than the 1.8 m Virgil without reading as a different species, and his visor sits above the 0.6 m station.',
    },
    textures: {
      base_color: { size: 1024, quality: 0.8 },
      normal: { size: 512, quality: 0.85 },
      metallic_roughness: { size: 512, quality: 0.75 },
    },
  },
  porthole: {
    source: 'assets/models/candidates/porthole-model-candidate-01.glb',
    expectedSha: '59a8b86ed5f986027f2e1104a0dd738d0baa9d3142dc2f0c76049ac7f0a7acb0',
    outDir: 'src/world/props',
    target: {
      axis: 'x',
      metres: 11.0,
      reason:
        'The 1.9 m source width is a normalised export, not a size. The measured hole is about 60 % of the width, so 11.0 m across gives an aperture of roughly 3.3 m radius — the window the owner approved in V1 — with the frame band filling the remaining 2.2 m to the wall.',
    },
    // Two maps only, no normal map in the source. Base colour at 1024 because
    // the band is large on screen; metallic-roughness is smooth and 512 is
    // plenty (the source PNG is 11.5 MB for what is mostly flat values).
    textures: {
      base_color: { size: 1024, quality: 0.8 },
      metallic_roughness: { size: 512, quality: 0.75 },
    },
  },
  orrery: {
    source: 'assets/models/candidates/orrery-model-candidate-01.glb',
    expectedSha: 'a3d859613825199019b36c386f843a372249165a311d069d5b8825ef9454d2e8',
    outDir: 'src/world/props',
    target: {
      axis: 'y',
      metres: 1.1,
      reason:
        'The 2.000 m source height is unit-box normalisation. Standing on the console’s well floor (measured 0.35 m), 1.1 m lifts the sphere just clear of the 0.93 m screen arc and keeps it below a 1.65 m Virgil’s chin, so it reads against his chest as the reference’s orrery does.',
    },
    // The owner prefers the light orrery (V2), so this is the alternative
    // behind a switch and is reduced harder: 512 base colour on members this
    // narrow on screen, 256 for the two smooth masks.
    textures: {
      base_color: { size: 512, quality: 0.74 },
      normal: { size: 256, quality: 0.8 },
      metallic_roughness: { size: 256, quality: 0.72 },
    },
  },
  // ---------------------------------------------------------------- V6
  // The stylised set. Sizes are read against Virgil at 1.8 m, as before; the
  // reasons are recorded per model. Every source here carries one base-colour
  // texture and declared factors (see the header).
  console3: {
    source: 'assets/models/candidates/console-model-candidate-03.glb',
    expectedSha: '846b55de5b6b85aeea6bb171a52e051293e7ced1d5e41b15fa9e734ce131f72e',
    outDir: 'src/world/props',
    target: {
      axis: 'x',
      metres: 3.4,
      reason:
        'The 2.000-unit source width is unit-box normalisation. Measured, the model is a low oval ring desk 0.623 units tall with a raised deck at its centre (0.10 units above its base, flat across |x| ≤ 0.4) and an open front; at 3.4 m across the deck is at 0.17 m, the back rim tops at 0.87 m and the sides at about 0.6 m, so a 1.8 m Virgil stands inside it with the rim at his waist as he stood in the ring console, and its well (±0.68 m) clears his 1.24 m silhouette.',
    },
    textures: { base_color: { size: 1024, quality: 0.8 } },
  },
  fabricatorStation: {
    source: 'assets/models/candidates/fabricator-station-model-candidate-01.glb',
    expectedSha: 'dcc6ea3e498818ba3fd8727f57664e0c77830979b0b43fc40fb4cbdc81cab2fd',
    outDir: 'src/world/props',
    target: {
      axis: 'x',
      metres: 2.2,
      reason:
        'The 2.000-unit source width is unit-box normalisation. A station is secondary to Virgil’s 3.2 m console; 2.2 m across (1.53 m tall, measured) reads as a workbench a 1.7 m Fabricator stands at, with its upper structure at his shoulder rather than over his head.',
    },
    textures: { base_color: { size: 1024, quality: 0.78 } },
  },
  proverStation: {
    source: 'assets/models/candidates/prover-station-model-candidate-01.glb',
    expectedSha: '1f342120751471a2d8379597fdeffee2bc4b8c1f4db25b9b2b9d91089ecca8af',
    outDir: 'src/world/props',
    target: {
      axis: 'z',
      metres: 2.2,
      reason:
        'The 2.000-unit source depth is unit-box normalisation (this model is deeper than it is wide). 2.2 m deep, 2.1 m wide, 1.7 m tall keeps it the same footprint as the Fabricator’s station so the three read as a set, and its screen top sits at the Prover’s eye line.',
    },
    textures: { base_color: { size: 1024, quality: 0.78 } },
  },
  keeperStation: {
    source: 'assets/models/candidates/keeper-station-model-candidate-01.glb',
    expectedSha: 'b09dc58fca76eb01498a6a6ec2174e8e5f5fdae14c4228d5f9d99c3729b2942b',
    outDir: 'src/world/props',
    target: {
      axis: 'y',
      metres: 2.0,
      reason:
        'The 2.000-unit source height is unit-box normalisation (this model is tall: a sloped desk with a column and screen behind it, the desk top measured at 1.0 unit above the base). 2.0 m tall puts that desk at 1.0 m, waist-to-chest on a 1.7 m Keeper standing in front of it, and its screen at and above his head so it reads over him from the tabletop camera; 1.64 m across, the same footprint as the other two.',
    },
    textures: { base_color: { size: 1024, quality: 0.78 } },
  },
  fabricator2: {
    source: 'assets/models/candidates/fabricator-model-candidate-02.glb',
    expectedSha: 'deb3b611ffac638787cc3c0ecd21839d2cf641f7b2fb4f9a12fcb3f644a7bd23',
    outDir: 'src/world/props',
    target: {
      axis: 'y',
      metres: 1.7,
      reason:
        'The 2.000-unit source height is unit-box normalisation. The three characters are secondary to a 1.8 m Virgil; 1.7 m keeps them clearly shorter without reading as a different species, and the Fabricator — the widest — reads as the heavy one at that height.',
    },
    textures: { base_color: { size: 1024, quality: 0.8 } },
  },
  prover2: {
    source: 'assets/models/candidates/prover-model-candidate-02.glb',
    expectedSha: 'b97f04b7167f547e116203f4485c23e961c57bc4664412de40cf56cd378a8063',
    outDir: 'src/world/props',
    target: {
      axis: 'y',
      metres: 1.7,
      reason:
        'The 1.999-unit source height is unit-box normalisation. 1.7 m, as the other two characters, so the three read as one cast beside a 1.8 m Virgil.',
    },
    // The source is a 4096² PNG (15.4 MB); it is resampled to the same 1024²
    // WebP as the others, because at 1.7 m tall on a 12 m set it is never
    // closer to the camera than the others are.
    textures: { base_color: { size: 1024, quality: 0.8 } },
  },
  keeper2: {
    source: 'assets/models/candidates/keeper-model-candidate-02.glb',
    expectedSha: '8789aea585744623fc23c42d84adc6cc3bd284100ac29e7398c626da90e59db5',
    outDir: 'src/world/props',
    target: {
      axis: 'y',
      metres: 1.7,
      reason:
        'The 2.000-unit source height is unit-box normalisation. 1.7 m, as the other two characters; the Keeper — the slimmest — reads as the tall thin one at the same height.',
    },
    textures: { base_color: { size: 1024, quality: 0.8 } },
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
  // The smallest distance from the model's axis in its own XY plane: for a
  // ring this is the radius of the hole, which the wall aperture is cut to.
  let minRadiusXY = Number.POSITIVE_INFINITY;
  for (let i = 0; i < position.count; i += 1) {
    const r = Math.hypot(position.array[i * 3], position.array[i * 3 + 1]);
    if (r < minRadiusXY) minRadiusXY = r;
  }
  let maxIndex = 0;
  for (let i = 0; i < index.array.length; i += 1) {
    if (index.array[i] > maxIndex) maxIndex = index.array[i];
  }
  if (maxIndex >= position.count)
    fail(`index ${maxIndex} out of range for ${position.count} vertices`);
  // Narrow to UNSIGNED_SHORT only when every index fits; the ring console has
  // 148,615 vertices and keeps UNSIGNED_INT. Measured, not assumed.
  const narrowIndices = maxIndex < 65536;
  const indicesOut = narrowIndices
    ? new Uint16Array(index.array.length)
    : new Uint32Array(index.array.length);
  for (let i = 0; i < index.array.length; i += 1) indicesOut[i] = index.array[i];

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
  // Factors may be absent (glTF defaults, 1.0), declared as 1.0 (the ornate
  // pygltflib characters), or declared as the whole material (the V6 set:
  // metallic 0, roughness 0.8 or 0.5, and no metallic-roughness map). They
  // are recorded as found and applied by the loader; the base-colour factor
  // is not applied by the loader, so anything but 1.0 there must stop here.
  const pbr = material.pbrMetallicRoughness ?? {};
  const factors = {
    baseColorFactor: pbr.baseColorFactor ?? null,
    metallicFactor: pbr.metallicFactor ?? null,
    roughnessFactor: pbr.roughnessFactor ?? null,
  };
  if (factors.baseColorFactor && factors.baseColorFactor.some((v) => v !== 1)) {
    fail(
      `${name}: baseColorFactor ${factors.baseColorFactor} is not 1.0; the loader does not apply it`,
    );
  }
  const metalness = factors.metallicFactor ?? 1;
  const roughness = factors.roughnessFactor ?? 1;

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
  };
  // The metallic-roughness and normal maps are optional in the source (the
  // porthole has no normal map; the V6 set has neither); the plan must agree
  // with the file either way, so a mismatch is an error, not a skip.
  if (material.pbrMetallicRoughness?.metallicRoughnessTexture) {
    maps.metallic_roughness = imageFor(
      material.pbrMetallicRoughness.metallicRoughnessTexture,
      'metallicRoughnessTexture',
    );
  }
  if (material.normalTexture) maps.normal = imageFor(material.normalTexture, 'normalTexture');
  for (const key of Object.keys(model.textures)) {
    if (!maps[key]) fail(`${name}: texture plan names "${key}" but the source has no such map`);
  }
  for (const key of Object.keys(maps)) {
    if (!model.textures[key]) fail(`${name}: source has "${key}" but the texture plan omits it`);
  }
  const node = gltf.nodes?.[gltf.scenes?.[0]?.nodes?.[0] ?? 0] ?? {};
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const nodeIsIdentity =
    !node.translation &&
    !node.rotation &&
    !node.scale &&
    (!node.matrix || node.matrix.every((v, i) => Math.abs(v - identity[i]) < 1e-9));
  if (!nodeIsIdentity) fail(`${name}: node carries a transform; not handled`);

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
        ` -> ${plan.size}x${plan.size} image/webp q${plan.quality} ${bytes.length} B` +
        (result.sourceWidth !== result.sourceHeight ? ' (non-square source, resampled)' : ''),
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
  push('index', indicesOut, {
    kind: narrowIndices ? 'u16' : 'u32',
    components: 1,
    count: indicesOut.length,
  });
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
      minRadiusXY,
      sourceDoubleSided: material.doubleSided === true,
      sourceHasTangent: tangentDropped,
      sourceHasNormalMap: material.normalTexture !== undefined,
      sourceHasMetallicRoughnessMap:
        material.pbrMetallicRoughness?.metallicRoughnessTexture !== undefined,
      sourceFactors: factors,
      sourceIndexComponentType: index.type,
      sourceAnimations: gltf.animations?.length ?? 0,
      sourceSkins: gltf.skins?.length ?? 0,
    },
    reductions: {
      tangentDropped,
      indicesNarrowedToU16: narrowIndices && index.type !== 'UNSIGNED_SHORT',
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
      // The declared factors, applied by the loader (1.0 where the source
      // declares none and a map carries the value).
      metalness,
      roughness,
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
  log(
    `scale ${scale.toFixed(4)} (${model.target.axis} -> ${model.target.metres} m), baseOffsetY ${(-min[1] * scale).toFixed(4)}`,
  );
  log(`minRadiusXY ${minRadiusXY.toFixed(4)} (${(minRadiusXY * scale).toFixed(3)} m at scale)`);
  log(`source   ${file.length} B unchanged at ${sourcePath}`);
}
