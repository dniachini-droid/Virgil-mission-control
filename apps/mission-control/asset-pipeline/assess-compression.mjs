/**
 * **The compressed-format assessment the V11 brief's second caution requires.**
 *
 * *"KTX2, Draco and Meshopt are to be assessed, not assumed. Each needs a
 * transcoder or decoder inlined into a single `file://` document that is
 * already over the mobile transfer budget. The existing bespoke quantised
 * payload may beat them under this constraint. Measure, then choose, and
 * record the numbers either way."*
 *
 * So this script measures rather than argues. It reads every committed runtime
 * payload, re-encodes the geometry it can with the **real** Draco and Meshopt
 * encoders that are already in this workspace, and prints:
 *
 *  - what each payload costs today, split into geometry and texture;
 *  - what Draco makes of the same geometry, at glTF's own default quantisation;
 *  - what Meshopt makes of it, after `reorderMesh`, which is the ordering its
 *    codec is designed for;
 *  - what each option's **decoder** costs in the document, which is the whole
 *    of the brief's constraint: a `file://` document has no second request, so
 *    a decoder is not amortised over anything — it is added to the one
 *    download;
 *  - the same in **base64**, because that is the form the payload takes in the
 *    document and it inflates every binary byte by 4/3.
 *
 * **What it cannot measure, stated rather than estimated away.** There is no
 * `basisu`, `toktx` or KTX2 encoder in this environment and none may be
 * installed (`CLAUDE.md`: no paid services; the lockfile is committed and the
 * Owner Build must stay reproducible from it). So the KTX2 row carries the
 * decoder's exact measured bytes and the texture payload's exact measured
 * bytes, and says plainly that the transcoded texture size was **not
 * measured**. That is enough to settle the question in this document's
 * constraint and it is not dressed up as more.
 *
 * Nothing here writes into `src/`. It is a measurement, and adopting any of it
 * would be a separate, deliberate change with its own diff.
 *
 * Usage: `pnpm measure:compression:v11` from the repository root, or
 * `pnpm --filter mission-control measure:compression:v11`, or directly as
 * `node asset-pipeline/assess-compression.mjs`. It is a **named command**
 * rather than an orphaned file because of the Keeper's **K11-01**: at candidate
 * `de3c7d8` this script was wired into no `package.json` script, no test and no
 * CI step, so the numbers the brief requires to be recorded existed only in one
 * session's stdout. They are in `docs/process/V11_RUN_RECORD.md` (stage 4, item
 * 1a) and this command is how a reader re-derives them.
 *
 * It is deliberately **not** in `pnpm check`. It asserts nothing and can fail
 * nothing: it prints measurements, and a check that cannot fail does not belong
 * in the gate. `test/required-checks-v11.test.ts` holds the wiring instead, so
 * removing the command breaks a test.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(appRoot, '../..');

/**
 * `draco3d` and `meshoptimizer` are already in this workspace — they arrive
 * under `three-stdlib` and `@react-three/drei` — but they are transitive, so
 * pnpm does not put them where a bare import can see them and **no dependency
 * is added to make this script tidier**: adding one would change the committed
 * lockfile, and the Owner Build's reproducibility rests on that lockfile. So
 * the store is searched instead, and the script says which version it found.
 */
function fromStore(pkg, subpath) {
  const store = join(repoRoot, 'node_modules/.pnpm');
  const dirs = readdirSync(store).filter((name) => name.startsWith(`${pkg}@`));
  for (const dir of dirs) {
    const candidate = join(store, dir, 'node_modules', pkg, subpath);
    if (existsSync(candidate)) return { path: candidate, version: dir.slice(pkg.length + 1) };
  }
  throw new Error(`${pkg}/${subpath} is not in the pnpm store`);
}

const dracoEntry = fromStore('draco3d', 'draco3d.js');
const meshoptEntry = fromStore('meshoptimizer', 'meshopt_encoder.js');
const threeEntry = fromStore('three', 'examples/jsm/loaders/GLTFLoader.js');
const three = resolve(dirname(threeEntry.path), '..');
const draco3d = (await import(pathToFileURL(dracoEntry.path).href)).default;
const { MeshoptEncoder } = await import(pathToFileURL(meshoptEntry.path).href);
console.log(
  `# encoders: draco3d ${dracoEntry.version}, meshoptimizer ${meshoptEntry.version}, three ${threeEntry.version}`,
);

/** Where the committed payloads live. */
const PAYLOAD_DIRS = ['src/world/props', 'src/world/virgil'];

/**
 * The decoders, measured on disk rather than quoted. Each entry is what would
 * have to enter the one document for that format to be usable in it.
 *
 * `.wasm` is binary and would be base64 in the document like every other
 * binary; `.js` is text and would not. The `inflate` flag says which.
 */
const DECODERS = {
  draco: [
    { file: `${three}/loaders/DRACOLoader.js`, inflate: false },
    { file: `${three}/libs/draco/gltf/draco_wasm_wrapper.js`, inflate: false },
    { file: `${three}/libs/draco/gltf/draco_decoder.wasm`, inflate: true },
  ],
  meshopt: [{ file: `${three}/libs/meshopt_decoder.module.js`, inflate: false }],
  ktx2: [
    { file: `${three}/loaders/KTX2Loader.js`, inflate: false },
    { file: `${three}/libs/ktx-parse.module.js`, inflate: false },
    { file: `${three}/libs/zstddec.module.js`, inflate: false },
    { file: `${three}/libs/basis/basis_transcoder.js`, inflate: false },
    { file: `${three}/libs/basis/basis_transcoder.wasm`, inflate: true },
  ],
};

const b64 = (bytes) => Math.ceil(bytes / 3) * 4;

function decoderCost(which) {
  let raw = 0;
  let inDocument = 0;
  const parts = [];
  for (const { file, inflate } of DECODERS[which]) {
    const bytes = statSync(file).size;
    raw += bytes;
    const cost = inflate ? b64(bytes) : bytes;
    inDocument += cost;
    parts.push({ name: file.split('/').pop(), bytes, cost, inflate });
  }
  return { raw, inDocument, parts };
}

// ------------------------------------------------------------------ payloads

function payloads() {
  const found = [];
  for (const dir of PAYLOAD_DIRS) {
    const full = join(appRoot, dir);
    for (const name of readdirSync(full)) {
      if (!name.endsWith('-asset.json')) continue;
      const metadata = JSON.parse(readFileSync(join(full, name), 'utf8'));
      const base64 = readFileSync(
        join(full, name.replace('-asset.json', '-asset.b64.txt')),
        'utf8',
      ).trim();
      found.push({
        name: name.replace('-asset.json', ''),
        metadata,
        buffer: Buffer.from(base64, 'base64'),
        base64Bytes: metadata.payload.base64Bytes,
      });
    }
  }
  return found.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The eight bespoke payloads carry their geometry as four quantised sections.
 * This dequantises them into the float attributes an encoder wants, exactly as
 * `meshyAsset.ts` does at load, so what is compressed is the same mesh the
 * world draws and not an idealised one.
 */
function geometryOf(payload) {
  const s = payload.metadata.payload.sections;
  if (!s.position) return null;
  const { buffer } = payload;
  const count = s.position.count;
  const position = new Float32Array(count * 3);
  const pq = new Int16Array(buffer.buffer, buffer.byteOffset + s.position.offset, count * 3);
  for (let i = 0; i < position.length; i += 1) position[i] = Math.max(-1, pq[i] / 32767);
  const normal = new Float32Array(count * 3);
  const nq = new Int8Array(buffer.buffer, buffer.byteOffset + s.normal.offset, count * 3);
  for (let i = 0; i < normal.length; i += 1) normal[i] = Math.max(-1, nq[i] / 127);
  const uv = new Float32Array(count * 2);
  const uq = new Uint16Array(buffer.buffer, buffer.byteOffset + s.uv.offset, count * 2);
  for (let i = 0; i < uv.length; i += 1) uv[i] = uq[i] / 65535;
  const index = new Uint32Array(s.index.count);
  const iq = new Uint16Array(buffer.buffer, buffer.byteOffset + s.index.offset, s.index.count);
  for (let i = 0; i < index.length; i += 1) index[i] = iq[i];
  return {
    count,
    position,
    normal,
    uv,
    index,
    quantised: {
      position: s.position.length,
      normal: s.normal.length,
      uv: s.uv.length,
      index: s.index.length,
    },
    bytes: s.position.length + s.normal.length + s.uv.length + s.index.length,
  };
}

// --------------------------------------------------------------------- draco

const encoderModule = await draco3d.createEncoderModule({});

/**
 * Draco, at the quantisation `gltf-transform` and `gltfpack` both default to
 * for a glTF mesh: 14 bits of position, 10 of normal, 12 of texture
 * coordinate. That is **coarser than this project's payload on position**
 * (which is a full 16-bit normalised int over a 2-unit box, 0.03 mm) and
 * finer on the others, so the comparison is not perfectly like for like and
 * the printout says so.
 */
function dracoBytes(g, positionBits = 14) {
  const builder = new encoderModule.MeshBuilder();
  const mesh = new encoderModule.Mesh();
  builder.AddFloatAttributeToMesh(mesh, encoderModule.POSITION, g.count, 3, g.position);
  builder.AddFloatAttributeToMesh(mesh, encoderModule.NORMAL, g.count, 3, g.normal);
  builder.AddFloatAttributeToMesh(mesh, encoderModule.TEX_COORD, g.count, 2, g.uv);
  builder.AddFacesToMesh(mesh, g.index.length / 3, g.index);
  const encoder = new encoderModule.Encoder();
  encoder.SetSpeedOptions(0, 0); // slowest, smallest
  encoder.SetAttributeQuantization(encoderModule.POSITION, positionBits);
  encoder.SetAttributeQuantization(encoderModule.NORMAL, 10);
  encoder.SetAttributeQuantization(encoderModule.TEX_COORD, 12);
  encoder.SetEncodingMethod(encoderModule.MESH_EDGEBREAKER_ENCODING);
  const out = new encoderModule.DracoInt8Array();
  const length = encoder.EncodeMeshToDracoBuffer(mesh, out);
  const bytes = Buffer.alloc(length);
  for (let i = 0; i < length; i += 1) bytes[i] = out.GetValue(i) & 0xff;
  encoderModule.destroy(out);
  encoderModule.destroy(mesh);
  encoderModule.destroy(builder);
  encoderModule.destroy(encoder);
  if (length <= 0) throw new Error('draco encode failed');
  return bytes;
}

// ------------------------------------------------------------------- meshopt

await MeshoptEncoder.ready;

/**
 * Meshopt, on **the payload's own quantised attributes** — which is the way it
 * is meant to be used: its codecs compress bit patterns, they do not quantise,
 * and `EXT_meshopt_compression` expects the data to have been quantised
 * already. So this is the fairest possible comparison: the same 13 bytes a
 * vertex this project already writes, re-ordered for locality and then run
 * through the vertex and index codecs.
 *
 * The vertex codec wants a stride that is a multiple of 4, so the 13 bytes are
 * interleaved into 16 with three zero bytes. Those zeros cost almost nothing
 * once encoded, and the alternative — three separate streams of 8, 4 and 4 —
 * is measured too, because which wins is not obvious and guessing is what this
 * script exists to avoid.
 */
function meshoptBytes(payload, g) {
  const s = payload.metadata.payload.sections;
  const { buffer } = payload;
  const count = g.count;
  const pos = new Uint8Array(buffer.buffer, buffer.byteOffset + s.position.offset, count * 6);
  const nor = new Uint8Array(buffer.buffer, buffer.byteOffset + s.normal.offset, count * 3);
  const uvs = new Uint8Array(buffer.buffer, buffer.byteOffset + s.uv.offset, count * 4);

  // Re-order for vertex-cache and vertex-fetch locality, which is what the
  // codec's delta model rewards. The remap is applied to every stream.
  const indices = Uint32Array.from(g.index);
  const remap = MeshoptEncoder.reorderMesh(indices, true, true);
  const order = remap[0];
  const unique = remap[1];

  const interleaved = new Uint8Array(unique * 16);
  const splitPos = new Uint8Array(unique * 8);
  const splitNor = new Uint8Array(unique * 4);
  const splitUv = new Uint8Array(unique * 4);
  for (let i = 0; i < count; i += 1) {
    const to = order[i];
    if (to >= unique) continue;
    for (let k = 0; k < 6; k += 1) {
      interleaved[to * 16 + k] = pos[i * 6 + k];
      splitPos[to * 8 + k] = pos[i * 6 + k];
    }
    for (let k = 0; k < 3; k += 1) {
      interleaved[to * 16 + 6 + k] = nor[i * 3 + k];
      splitNor[to * 4 + k] = nor[i * 3 + k];
    }
    for (let k = 0; k < 4; k += 1) {
      interleaved[to * 16 + 9 + k] = uvs[i * 4 + k];
      splitUv[to * 4 + k] = uvs[i * 4 + k];
    }
  }

  const vertexInterleaved = MeshoptEncoder.encodeVertexBuffer(interleaved, unique, 16).length;
  const vertexSplit =
    MeshoptEncoder.encodeVertexBuffer(splitPos, unique, 8).length +
    MeshoptEncoder.encodeVertexBuffer(splitNor, unique, 4).length +
    MeshoptEncoder.encodeVertexBuffer(splitUv, unique, 4).length;
  const indexBytes = MeshoptEncoder.encodeIndexBuffer(
    new Uint8Array(indices.buffer, indices.byteOffset, indices.length * 4),
    indices.length,
    4,
  ).length;
  return {
    interleaved: vertexInterleaved + indexBytes,
    split: vertexSplit + indexBytes,
    vertexInterleaved,
    vertexSplit,
    indexBytes,
  };
}

// ------------------------------------------------------------------- the GLB

/**
 * Virgil arrives as a whole `.glb` rather than as quantised sections, because
 * he is rigged and carries his own animation clips. This reads its chunks and
 * splits the binary chunk by what each buffer view is **for**, so the record
 * can say how much of that megabyte is mesh (which a geometry codec could
 * touch) and how much is animation (which it could not).
 */
function glbBreakdown(payload) {
  const s = payload.metadata.payload.sections;
  if (!s.glb) return null;
  const view = payload.buffer.subarray(s.glb.offset, s.glb.offset + s.glb.length);
  const dv = new DataView(view.buffer, view.byteOffset, view.byteLength);
  let at = 12;
  let json = null;
  let binOffset = 0;
  let binLength = 0;
  while (at + 8 <= view.byteLength) {
    const length = dv.getUint32(at, true);
    const type = dv.getUint32(at + 4, true);
    if (type === 0x4e4f534a)
      json = JSON.parse(
        Buffer.from(view.buffer, view.byteOffset + at + 8, length).toString('utf8'),
      );
    if (type === 0x004e4942) {
      binOffset = at + 8;
      binLength = length;
    }
    at += 8 + length + ((4 - (length % 4)) % 4);
  }
  if (!json) return null;
  const use = new Map();
  const mark = (accessorIndex, kind) => {
    const accessor = json.accessors?.[accessorIndex];
    if (!accessor || accessor.bufferView === undefined) return;
    use.set(accessor.bufferView, kind);
  };
  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives ?? []) {
      for (const [name, index] of Object.entries(prim.attributes ?? {})) {
        mark(index, name.startsWith('JOINTS') || name.startsWith('WEIGHTS') ? 'skin' : 'attribute');
      }
      if (prim.indices !== undefined) mark(prim.indices, 'index');
    }
  }
  for (const animation of json.animations ?? []) {
    for (const sampler of animation.samplers ?? []) {
      mark(sampler.input, 'animation');
      mark(sampler.output, 'animation');
    }
  }
  for (const skin of json.skins ?? [])
    if (skin.inverseBindMatrices !== undefined) mark(skin.inverseBindMatrices, 'skin');
  const totals = { attribute: 0, index: 0, skin: 0, animation: 0, image: 0, other: 0 };
  (json.bufferViews ?? []).forEach((bv, i) => {
    const kind = use.get(i) ?? (json.images?.some((im) => im.bufferView === i) ? 'image' : 'other');
    totals[kind] += bv.byteLength;
  });
  return {
    jsonBytes: view.byteLength - binLength - 20,
    binBytes: binLength,
    totals,
    accessors: json.accessors?.length ?? 0,
    animations: json.animations?.length ?? 0,
  };
}

// --------------------------------------------------------------------- run it

const rows = [];
let totalGeometry = 0;
let totalTexture = 0;
let totalDraco = 0;
let totalDraco16 = 0;
let totalMeshopt = 0;
let glbGeometry = 0;

for (const payload of payloads()) {
  const sections = payload.metadata.payload.sections;
  const texture = Object.values(sections)
    .filter((section) => section.kind === 'image')
    .reduce((sum, section) => sum + section.length, 0);
  totalTexture += texture;
  const g = geometryOf(payload);
  if (!g) {
    const glb = glbBreakdown(payload);
    glbGeometry = sections.glb.length;
    totalGeometry += sections.glb.length;
    rows.push({ name: payload.name, kind: 'glb', bytes: sections.glb.length, texture, glb });
    continue;
  }
  totalGeometry += g.bytes;
  const draco = dracoBytes(g).length;
  const dracoBuffer = dracoBytes(g, 16);
  const draco16 = dracoBuffer.length;
  const meshopt = meshoptBytes(payload, g);
  totalDraco += draco;
  totalDraco16 += draco16;
  totalMeshopt += Math.min(meshopt.interleaved, meshopt.split);
  rows.push({
    name: payload.name,
    kind: 'quantised',
    bytes: g.bytes,
    texture,
    draco,
    draco16,
    dracoBuffer,
    meshopt,
    g,
  });
}

const line = (...cells) => console.log(cells.join(' '));

console.log('# Compressed-format assessment — V11 stage 4');
console.log('');
console.log('## Per payload, geometry only (bytes, binary)');
line(
  'payload'.padEnd(20),
  'tris'.padStart(7),
  'today'.padStart(10),
  'draco14'.padStart(10),
  'draco16'.padStart(10),
  'meshopt-i'.padStart(10),
  'meshopt-s'.padStart(10),
);
for (const row of rows) {
  if (row.kind === 'glb') continue;
  line(
    row.name.padEnd(20),
    String(row.g.index.length / 3).padStart(7),
    String(row.bytes).padStart(10),
    String(row.draco).padStart(10),
    String(row.draco16).padStart(10),
    String(row.meshopt.interleaved).padStart(10),
    String(row.meshopt.split).padStart(10),
  );
}
const quantised = rows.filter((r) => r.kind === 'quantised');
const todayQ = quantised.reduce((s, r) => s + r.bytes, 0);
line(
  'TOTAL (8 props)'.padEnd(20),
  ''.padStart(7),
  String(todayQ).padStart(10),
  String(totalDraco).padStart(10),
  String(totalDraco16).padStart(10),
  String(quantised.reduce((s, r) => s + r.meshopt.interleaved, 0)).padStart(10),
  String(quantised.reduce((s, r) => s + r.meshopt.split, 0)).padStart(10),
);

console.log('');
console.log('## The rigged Virgil, which is a whole .glb and not quantised sections');
for (const row of rows) {
  if (row.kind !== 'glb') continue;
  console.log(`${row.name}: glb ${row.bytes} B, texture ${row.texture} B`);
  if (row.glb) {
    console.log(`  json chunk ${row.glb.jsonBytes} B, binary chunk ${row.glb.binBytes} B`);
    for (const [kind, bytes] of Object.entries(row.glb.totals)) {
      console.log(`  ${kind.padEnd(10)} ${String(bytes).padStart(9)} B`);
    }
    console.log(`  ${row.glb.animations} animation clips over ${row.glb.accessors} accessors`);
  }
}

console.log('');
console.log('## Totals in the document (base64, which is how a payload is carried)');
const b64Today = b64(totalGeometry) + b64(totalTexture);
console.log(`geometry today          ${totalGeometry} B binary   ${b64(totalGeometry)} B base64`);
console.log(`  of which the 8 props  ${todayQ} B binary   ${b64(todayQ)} B base64`);
console.log(`  of which Virgil's glb ${glbGeometry} B binary   ${b64(glbGeometry)} B base64`);
console.log(`textures today          ${totalTexture} B binary   ${b64(totalTexture)} B base64`);
console.log(
  `payloads today          ${totalGeometry + totalTexture} B binary   ${b64Today} B base64`,
);

console.log('');
console.log('## What each option would cost and save, over the 8 quantised props');
for (const [which, saved] of [
  ['draco', todayQ - totalDraco16],
  [
    'meshopt',
    todayQ - quantised.reduce((s, r) => s + Math.min(r.meshopt.interleaved, r.meshopt.split), 0),
  ],
]) {
  const cost = decoderCost(which);
  const savedInDocument = b64(todayQ) - b64(todayQ - saved);
  console.log(`${which}:`);
  for (const part of cost.parts) {
    console.log(
      `  decoder ${part.name.padEnd(28)} ${String(part.bytes).padStart(8)} B on disk → ${String(part.cost).padStart(8)} B in the document${part.inflate ? ' (base64)' : ''}`,
    );
  }
  console.log(`  decoder total in the document      ${cost.inDocument} B`);
  console.log(`  geometry saved, binary             ${saved} B`);
  console.log(`  geometry saved, in the document    ${savedInDocument} B`);
  console.log(`  NET change to the document         ${cost.inDocument - savedInDocument} B`);
}

const ktx2 = decoderCost('ktx2');
console.log('ktx2:');
for (const part of ktx2.parts) {
  console.log(
    `  decoder ${part.name.padEnd(28)} ${String(part.bytes).padStart(8)} B on disk → ${String(part.cost).padStart(8)} B in the document${part.inflate ? ' (base64)' : ''}`,
  );
}
console.log(`  decoder total in the document      ${ktx2.inDocument} B`);
console.log(
  `  every texture in the build, today  ${totalTexture} B binary, ${b64(totalTexture)} B base64`,
);
console.log(
  `  the transcoded texture size is NOT MEASURED: no basisu, toktx or KTX2 encoder exists in this environment and none may be installed.`,
);
console.log(
  `  what IS measured: the transcoder costs ${ktx2.inDocument} B in the document against ${b64(totalTexture)} B of texture in it. Even a transcoded set of zero bytes would ADD ${ktx2.inDocument - b64(totalTexture)} B.`,
);

console.log('');
console.log('## The option the brief does not name, measured because it costs no decoder at all');
console.log(
  'gzip is decoded by `DecompressionStream("gzip")`, which is in the browser already: 0 B of decoder.',
);
let gzBinary = 0;
let gzBase64Text = 0;
let rawBinary = 0;
let rawBase64Text = 0;
for (const payload of payloads()) {
  rawBinary += payload.buffer.length;
  rawBase64Text += payload.base64Bytes;
  gzBinary += gzipSync(payload.buffer, { level: 9 }).length;
  gzBase64Text += gzipSync(Buffer.from(payload.buffer.toString('base64'), 'utf8'), {
    level: 9,
  }).length;
}
console.log(`  payload bytes, binary                     ${rawBinary}`);
console.log(`  payload bytes, base64 in the document     ${rawBase64Text}`);
console.log(
  `  gzip of the binary, then base64           ${gzBinary} → ${b64(gzBinary)} in the document`,
);
console.log(
  `  gzip of the base64 text (no re-encoding)  ${gzBase64Text} → ${b64(gzBase64Text)} in the document`,
);
console.log(
  `  best saving in the document               ${rawBase64Text - Math.min(b64(gzBinary), b64(gzBase64Text))} B, for 0 B of decoder`,
);

console.log('');
console.log('## The combination, measured rather than assumed to compose');
{
  // Draco output is already entropy-coded, so gzip over it may add nothing;
  // that is exactly the sort of thing this project does not guess at.
  let combined = 0;
  for (const row of rows) {
    if (row.kind === 'quantised') combined += row.dracoBuffer.length;
  }
  for (const payload of payloads()) {
    const s2 = payload.metadata.payload.sections;
    for (const [, section] of Object.entries(s2)) {
      if (section.kind === 'image' || section.kind === 'glb') {
        combined += section.length;
      }
    }
  }
  const dracoOnly = combined;
  const parts = [];
  for (const row of rows) if (row.kind === 'quantised') parts.push(row.dracoBuffer);
  for (const payload of payloads()) {
    const s2 = payload.metadata.payload.sections;
    for (const [, section] of Object.entries(s2)) {
      if (section.kind === 'image' || section.kind === 'glb') {
        parts.push(payload.buffer.subarray(section.offset, section.offset + section.length));
      }
    }
  }
  const gzCombined = gzipSync(Buffer.concat(parts), { level: 9 }).length;
  console.log(`  draco geometry + untouched glb + untouched textures   ${dracoOnly} B binary`);
  console.log(`  the same, gzipped                                     ${gzCombined} B binary`);
  console.log(
    `  in the document, base64, plus the draco decoder       ${b64(gzCombined) + decoderCost('draco').inDocument} B`,
  );
  console.log(`  against today's                                       ${rawBase64Text} B`);
}

console.log('');
console.log(
  'Every figure above is a byte count of a real encode by the real encoder, except the KTX2 texture size, which is stated as not measured.',
);
