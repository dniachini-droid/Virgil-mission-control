/**
 * Builds the runtime payload for the rigged, animated Virgil from
 * `assets/models/candidates/virgil-model-candidate-05-rigged.glb` — V6, the
 * stylised Virgil (`docs/process/PHASE_1_STYLISED_SPEC.md` §1.4). The
 * ornate candidate 03 was reduced by the same script until V5.
 *
 * A skinned mesh with a 28-joint skeleton and keyframe clips is a different
 * shape of problem from the static props: rebuilding all of that by hand in
 * `meshyAsset.ts` would be a second glTF implementation. So this script does
 * the opposite of `reduce-model.mjs`: it keeps the file **as a GLB** and lets
 * three.js's `GLTFLoader.parse()` read it from memory at runtime — which
 * issues no request as long as the GLB contains **no images**. GLTFLoader's
 * only network behaviour is turning embedded images into `blob:` URLs, so the
 * images are stripped here, re-encoded to WebP through Chromium, and handed
 * to the material after parsing through `createImageBitmap`, exactly as the
 * static models are.
 *
 * What is removed or reduced, all recorded in the metadata:
 *  - the three 2048² JPEG images (10.9 MB) → WebP sections outside the GLB;
 *  - every clip except the ones the room uses (`KEEP_CLIPS`);
 *  - `TANGENT` (three.js derives one);
 *  - `NORMAL` → normalised INT8 and `TEXCOORD_0` → normalised UINT16 under
 *    `KHR_mesh_quantization`, which GLTFLoader supports; `WEIGHTS_0` →
 *    normalised UINT16, which core glTF permits. `POSITION` stays FLOAT so
 *    the skin's inverse bind matrices apply unchanged;
 *  - unreferenced buffer views are dropped and the BIN chunk repacked.
 *
 * The source file is read only and stays byte for byte as delivered.
 *
 * Usage: node asset-pipeline/reduce-rigged.mjs
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(appRoot, '../..');
const SOURCE = 'assets/models/candidates/virgil-model-candidate-05-rigged.glb';
const EXPECTED_SHA = '5541fecde26f58862334ea89ed0030d4dd1de521db595286982a63afc3f0d18f';
const outDir = join(appRoot, 'src/world/virgil');

/**
 * The clips the room uses. Everything else is not shipped: `Running` and
 * `Walking` by the owner's direction, `restpose` because it is a bind pose.
 * `Angry_Ground_Stomp` is the refusal, wired to BLOCKED.
 */
const KEEP_CLIPS = ['Idle_11', 'Angry_Ground_Stomp', 'Agree_Gesture'];

const TARGET_HEIGHT_M = 1.8;
const TARGET_REASON =
  'The 3.000-unit source height is an export scale (exactly 1.5× the static candidate 04), not a size. 1.8 m is the height the owner approved for Virgil in V2 and every viewing point since; the new cast is sized against it.';

/**
 * The V6 source carries one base-colour texture (4096² JPEG) and declares
 * `metallicFactor` 0 and `roughnessFactor` 0.8; there is no metallic-
 * roughness map and no normal map, so only the one image is re-encoded and
 * the factors are recorded for the loader. Virgil is the hero and nearest
 * the camera: 1024² at a high quality.
 */
const TEXTURES = {
  base_color: { size: 1024, quality: 0.84 },
};

const COMPONENT_SIZE = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const TYPE_COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function fail(message) {
  console.error(`reduce-rigged: ${message}`);
  process.exit(1);
}

// ------------------------------------------------------------ parse the GLB

const file = readFileSync(join(repoRoot, SOURCE));
const sourceSha = createHash('sha256').update(file).digest('hex');
if (sourceSha !== EXPECTED_SHA) fail(`source sha256 ${sourceSha} is not the registered one`);
if (file.readUInt32LE(0) !== 0x46546c67) fail('bad magic');
const jsonLength = file.readUInt32LE(12);
if (file.readUInt32LE(16) !== 0x4e4f534a) fail('first chunk is not JSON');
const gltf = JSON.parse(file.subarray(20, 20 + jsonLength).toString('utf8'));
const binStart = 20 + jsonLength + 8;
if (file.readUInt32LE(20 + jsonLength + 4) !== 0x004e4942) fail('second chunk is not BIN');
const bin = file.subarray(binStart, binStart + file.readUInt32LE(20 + jsonLength));

if (gltf.meshes.length !== 1 || gltf.meshes[0].primitives.length !== 1)
  fail('expected 1 mesh/1 primitive');
if ((gltf.skins?.length ?? 0) !== 1) fail('expected exactly one skin');
if (gltf.buffers.length !== 1) fail('expected one buffer');
const prim = gltf.meshes[0].primitives[0];

function accessorBytes(index) {
  const acc = gltf.accessors[index];
  const view = gltf.bufferViews[acc.bufferView];
  const elementSize = COMPONENT_SIZE[acc.componentType] * TYPE_COMPONENTS[acc.type];
  if ((view.byteStride ?? elementSize) !== elementSize) fail(`accessor ${index}: interleaved`);
  if (acc.sparse) fail(`accessor ${index}: sparse`);
  const start = (view.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  return bin.subarray(start, start + acc.count * elementSize);
}
function accessorFloats(index) {
  const bytes = accessorBytes(index);
  const out = new Float32Array(bytes.length / 4);
  Buffer.from(out.buffer).set(bytes);
  return out;
}

// ------------------------------------------------------- measure the mesh

const position = accessorFloats(prim.attributes.POSITION);
const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < position.length; i += 3) {
  for (let c = 0; c < 3; c += 1) {
    if (position[i + c] < min[c]) min[c] = position[i + c];
    if (position[i + c] > max[c]) max[c] = position[i + c];
  }
}
const scale = TARGET_HEIGHT_M / (max[1] - min[1]);

// ------------------------------------------------ rebuild the JSON and BIN

const newViews = [];
const newAccessors = [];
const parts = [];
let offset = 0;
function addView(bytes) {
  const pad = (4 - (offset % 4)) % 4;
  if (pad) {
    parts.push(Buffer.alloc(pad));
    offset += pad;
  }
  newViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length });
  parts.push(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  offset += bytes.length;
  return newViews.length - 1;
}
/** Copies an accessor through unchanged (own buffer view, tightly packed). */
function copyAccessor(index) {
  const acc = gltf.accessors[index];
  const bytes = accessorBytes(index);
  const out = { ...acc, bufferView: addView(bytes), byteOffset: 0 };
  newAccessors.push(out);
  return newAccessors.length - 1;
}
function quantisedAccessor(index, kind) {
  const acc = gltf.accessors[index];
  const floats = accessorFloats(index);
  let typed;
  let componentType;
  if (kind === 'i8') {
    typed = new Int8Array(floats.length);
    for (let i = 0; i < floats.length; i += 1)
      typed[i] = Math.round(Math.max(-1, Math.min(1, floats[i])) * 127);
    componentType = 5120;
  } else {
    typed = new Uint16Array(floats.length);
    for (let i = 0; i < floats.length; i += 1) {
      if (floats[i] < -1e-6 || floats[i] > 1 + 1e-6)
        fail(`accessor ${index}: value ${floats[i]} outside [0,1]`);
      typed[i] = Math.round(Math.max(0, Math.min(1, floats[i])) * 65535);
    }
    componentType = 5123;
  }
  const components = TYPE_COMPONENTS[acc.type];
  // Vertex attributes need 4-byte aligned strides; INT8 VEC3 is padded to 4.
  const elementSize = componentType === 5120 ? Math.ceil(components / 4) * 4 : components * 2;
  const packed = Buffer.alloc(acc.count * elementSize);
  for (let v = 0; v < acc.count; v += 1) {
    for (let c = 0; c < components; c += 1) {
      const value = typed[v * components + c];
      if (componentType === 5120) packed.writeInt8(value, v * elementSize + c);
      else packed.writeUInt16LE(value, v * elementSize + c * 2);
    }
  }
  const view = addView(new Uint8Array(packed.buffer, packed.byteOffset, packed.byteLength));
  newViews[view].byteStride = elementSize;
  newViews[view].target = 34962;
  newAccessors.push({
    bufferView: view,
    byteOffset: 0,
    componentType,
    normalized: true,
    count: acc.count,
    type: acc.type,
  });
  return newAccessors.length - 1;
}

const attributes = {
  POSITION: copyAccessor(prim.attributes.POSITION),
  NORMAL: quantisedAccessor(prim.attributes.NORMAL, 'i8'),
  TEXCOORD_0: quantisedAccessor(prim.attributes.TEXCOORD_0, 'u16'),
  JOINTS_0: copyAccessor(prim.attributes.JOINTS_0),
  WEIGHTS_0: quantisedAccessor(prim.attributes.WEIGHTS_0, 'u16'),
};
newAccessors[attributes.POSITION].min = min;
newAccessors[attributes.POSITION].max = max;
const indices = copyAccessor(prim.indices);
const skin = gltf.skins[0];
const ibm = copyAccessor(skin.inverseBindMatrices);

const keptClips = [];
const animations = [];
for (const anim of gltf.animations ?? []) {
  if (!KEEP_CLIPS.includes(anim.name)) continue;
  // A channel whose every keyframe equals the joint's rest transform adds
  // nothing the node does not already carry; most scale channels and many
  // translation channels are exactly that. They are measured and dropped.
  const liveChannels = [];
  let droppedChannels = 0;
  for (const channel of anim.channels) {
    const sampler = anim.samplers[channel.sampler];
    const node = gltf.nodes[channel.target.node];
    const output = accessorFloats(sampler.output);
    const path = channel.target.path;
    const rest =
      path === 'scale'
        ? (node.scale ?? [1, 1, 1])
        : path === 'translation'
          ? (node.translation ?? [0, 0, 0])
          : path === 'rotation'
            ? (node.rotation ?? [0, 0, 0, 1])
            : null;
    if (rest) {
      let constant = true;
      for (let i = 0; i < output.length && constant; i += 1) {
        if (Math.abs(output[i] - rest[i % rest.length]) > 1e-5) constant = false;
      }
      if (constant) {
        droppedChannels += 1;
        continue;
      }
    }
    liveChannels.push(channel);
  }
  const samplerIndex = new Map();
  const samplers = [];
  let seconds = 0;
  const channels = liveChannels.map((channel) => {
    if (!samplerIndex.has(channel.sampler)) {
      const s = anim.samplers[channel.sampler];
      const input = accessorFloats(s.input);
      seconds = Math.max(seconds, input[input.length - 1]);
      samplers.push({
        input: copyAccessor(s.input),
        output: copyAccessor(s.output),
        interpolation: s.interpolation,
      });
      samplerIndex.set(channel.sampler, samplers.length - 1);
    }
    return { sampler: samplerIndex.get(channel.sampler), target: channel.target };
  });
  animations.push({ name: anim.name, samplers, channels });
  keptClips.push({
    name: anim.name,
    seconds,
    channels: channels.length,
    restChannelsDropped: droppedChannels,
  });
}
for (const name of KEEP_CLIPS) {
  if (!keptClips.some((c) => c.name === name)) fail(`clip "${name}" is not in the source`);
}

const material = gltf.materials[0];
const pbr = material.pbrMetallicRoughness ?? {};
const metalness = pbr.metallicFactor ?? 1;
const roughness = pbr.roughnessFactor ?? 1;
if (pbr.baseColorFactor && pbr.baseColorFactor.some((v) => v !== 1))
  fail('baseColorFactor is not 1.0; the loader does not apply it');
const stripped = {
  asset: { version: '2.0', generator: 'reduce-rigged.mjs (from Khronos glTF Blender I/O export)' },
  extensionsUsed: ['KHR_mesh_quantization'],
  extensionsRequired: ['KHR_mesh_quantization'],
  scene: gltf.scene ?? 0,
  scenes: gltf.scenes,
  nodes: gltf.nodes,
  meshes: [
    { name: gltf.meshes[0].name, primitives: [{ attributes, indices, material: 0, mode: 4 }] },
  ],
  skins: [{ ...skin, inverseBindMatrices: ibm }],
  materials: [
    {
      name: material.name,
      // Textures are attached at runtime from the WebP sections; nothing here
      // references an image, so GLTFLoader issues no request.
      pbrMetallicRoughness: { metallicFactor: metalness, roughnessFactor: roughness },
      doubleSided: false,
    },
  ],
  animations,
  accessors: newAccessors,
  bufferViews: newViews,
  buffers: [{ byteLength: 0 }],
};
const binOut = Buffer.concat(parts);
const binPadded = Buffer.concat([binOut, Buffer.alloc((4 - (binOut.length % 4)) % 4)]);
stripped.buffers[0].byteLength = binPadded.length;
let jsonOut = Buffer.from(JSON.stringify(stripped), 'utf8');
jsonOut = Buffer.concat([jsonOut, Buffer.alloc((4 - (jsonOut.length % 4)) % 4, 0x20)]);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonOut.length + 8 + binPadded.length, 8);
const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(jsonOut.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4);
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(binPadded.length, 0);
binHeader.writeUInt32LE(0x004e4942, 4);
const glb = Buffer.concat([header, jsonHeader, jsonOut, binHeader, binPadded]);

// --------------------------------------------- re-encode the three images

function imageFor(info, label) {
  if (!info) fail(`no ${label}`);
  const image = gltf.images[gltf.textures[info.index].source];
  const view = gltf.bufferViews[image.bufferView];
  const start = view.byteOffset ?? 0;
  return { mimeType: image.mimeType, bytes: bin.subarray(start, start + view.byteLength) };
}
const maps = {
  base_color: imageFor(pbr.baseColorTexture, 'baseColorTexture'),
};
if (pbr.metallicRoughnessTexture)
  maps.metallic_roughness = imageFor(pbr.metallicRoughnessTexture, 'mr');
if (material.normalTexture) maps.normal = imageFor(material.normalTexture, 'normalTexture');
for (const key of Object.keys(TEXTURES))
  if (!maps[key]) fail(`plan names "${key}" but the source has no such map`);
for (const key of Object.keys(maps))
  if (!TEXTURES[key]) fail(`source has "${key}" but the plan omits it`);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto('about:blank');
const reencoded = {};
for (const [key, map] of Object.entries(maps)) {
  const plan = TEXTURES[key];
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
      return { sourceWidth: source.width, sourceHeight: source.height, b64: btoa(encoded) };
    },
    {
      b64: Buffer.from(map.bytes).toString('base64'),
      size: plan.size,
      quality: plan.quality,
      mimeType: map.mimeType,
    },
  );
  reencoded[key] = {
    bytes: Buffer.from(result.b64, 'base64'),
    plan,
    sourceBytes: map.bytes.length,
    sourceWidth: result.sourceWidth,
  };
  console.log(
    `reduce-rigged: ${key} ${result.sourceWidth}² ${map.mimeType} ${map.bytes.length} B -> ${plan.size}² webp q${plan.quality} ${reencoded[key].bytes.length} B`,
  );
}
await browser.close();

// ----------------------------------------------------------- pack payload

const sections = {};
const payloadParts = [];
let payloadOffset = 0;
function push(name, bytes, extra = {}) {
  const pad = (4 - (payloadOffset % 4)) % 4;
  if (pad) {
    payloadParts.push(Buffer.alloc(pad));
    payloadOffset += pad;
  }
  sections[name] = { offset: payloadOffset, length: bytes.length, ...extra };
  payloadParts.push(bytes);
  payloadOffset += bytes.length;
}
push('glb', glb, { kind: 'glb' });
for (const [key, map] of Object.entries(reencoded)) {
  push(`map_${key}`, map.bytes, {
    kind: 'image',
    mimeType: 'image/webp',
    width: map.plan.size,
    height: map.plan.size,
  });
}
const payload = Buffer.concat(payloadParts);
const b64 = payload.toString('base64');

const headJoint = gltf.nodes.find((n) => n.name === 'Head');
const metadata = {
  $comment:
    'Generated by asset-pipeline/reduce-rigged.mjs from the unmodified committed model candidate. Do not hand-edit; regenerate.',
  source: {
    path: SOURCE,
    sha256: sourceSha,
    bytes: file.length,
    generator: gltf.asset?.generator ?? null,
    provenance: 'assets/licenses/ASSET_PROVENANCE.md',
    licenceBasis: 'docs/decisions/OD-0008-meshy-licence-attestation.md',
  },
  measured: {
    vertexCount: gltf.accessors[prim.attributes.POSITION].count,
    triangleCount: gltf.accessors[prim.indices].count / 3,
    boundsMin: min,
    boundsMax: max,
    joints: skin.joints.length,
    jointNames: skin.joints.map((j) => gltf.nodes[j].name),
    sourceClips: (gltf.animations ?? []).map((a) => a.name),
    sourceDoubleSided: material.doubleSided === true,
    sourceHasTangent: prim.attributes.TANGENT !== undefined,
    sourceHasNormalMap: material.normalTexture !== undefined,
    sourceHasMetallicRoughnessMap: pbr.metallicRoughnessTexture !== undefined,
    sourceFactors: {
      baseColorFactor: pbr.baseColorFactor ?? null,
      metallicFactor: pbr.metallicFactor ?? null,
      roughnessFactor: pbr.roughnessFactor ?? null,
    },
    headJointPresent: headJoint !== undefined,
  },
  reductions: {
    clipsShipped: keptClips,
    clipsDropped: (gltf.animations ?? []).map((a) => a.name).filter((n) => !KEEP_CLIPS.includes(n)),
    tangentDropped: prim.attributes.TANGENT !== undefined,
    normalQuantised: 'INT8 normalised (KHR_mesh_quantization)',
    uvQuantised: 'UINT16 normalised (KHR_mesh_quantization)',
    weightsQuantised: 'UINT16 normalised (core glTF)',
    imagesStripped: true,
    textures: Object.fromEntries(
      Object.entries(reencoded).map(([k, m]) => [
        k,
        {
          from: `${m.sourceWidth}x${m.sourceWidth} ${maps[k].mimeType} ${m.sourceBytes} B`,
          to: `${m.plan.size}x${m.plan.size} image/webp q${m.plan.quality} ${m.bytes.length} B`,
          bytes: m.bytes.length,
          sourceBytes: m.sourceBytes,
        },
      ]),
    ),
  },
  runtime: {
    targetAxis: 'y',
    targetMetres: TARGET_HEIGHT_M,
    targetReason: TARGET_REASON,
    scale,
    baseOffsetY: -min[1] * scale,
    doubleSided: false,
    metalness,
    roughness,
    headJoint: 'Head',
    headFrontJoint: 'headfront',
  },
  payload: {
    bytes: payload.length,
    base64Bytes: b64.length,
    sha256: createHash('sha256').update(payload).digest('hex'),
    glbBytes: glb.length,
    sections,
  },
};
mkdirSync(outDir, { recursive: true });
const jsonPath = join(outDir, 'virgil-rigged-asset.json');
writeFileSync(jsonPath, `${JSON.stringify(metadata, null, 2)}\n`);
writeFileSync(join(outDir, 'virgil-rigged-asset.b64.txt'), b64);
execFileSync(join(repoRoot, 'node_modules/.bin/biome'), ['format', '--write', jsonPath]);
console.log(
  `reduce-rigged: clips ${keptClips.map((c) => `${c.name} ${c.seconds.toFixed(2)}s`).join(', ')}`,
);
console.log(
  `reduce-rigged: glb ${glb.length} B (source ${file.length} B), payload ${payload.length} B, base64 ${b64.length} B`,
);
console.log(
  `reduce-rigged: scale ${scale.toFixed(4)}, bounds y ${min[1].toFixed(3)}..${max[1].toFixed(3)}`,
);
