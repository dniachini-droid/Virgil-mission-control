/**
 * Finds the painted visor on a character's own head and records which of
 * the head's triangles carry it.
 *
 * V7 (`docs/process/PHASE_1_STYLISED_SPEC.md` §2.1). The owner, of V6's
 * faces: "you can kind of see that his visor underneath is like a
 * different colour black and looks like it's kinda pasted on … I really
 * want us to map the entire visor and have the face … almost perfectly
 * mapped to where the visor starts and ends … I wanted it to actually
 * wrap around." V4–V6 fitted a separate panel over the head, inset to
 * avoid a brow groove, and that inset is what read as pasted on.
 *
 * So there is no panel any more. Every model the owner generated has its
 * visor **painted** into its base-colour texture as near-black, neutral
 * paint on cream (Virgil, the Fabricator, the Prover) or on navy (the
 * Keeper's hood). This script samples that texture across every triangle
 * of the head's front and keeps the triangles that carry any visor paint;
 * the runtime (`src/world/characters/visorFit.ts`) draws the face on
 * exactly those triangles and lets the shader keep only the painted
 * pixels, so the face starts and ends where the paint does, by
 * construction, and wraps because it *is* the head's own surface.
 *
 * Input:  the committed runtime payloads (`*-asset.json` and
 *         `*-asset.b64.txt`), read only. The base-colour image is decoded
 *         through the Chromium `@playwright/test` installs, as the
 *         reduction pipeline encodes it; no image library is added.
 * Output: `<asset>-visor.json` beside the payload: the triangle indices,
 *         the paint rule, the measured bounds of the paint in the frame the
 *         runtime fits in, and the payload digest it was made from, so a
 *         regenerated payload invalidates the mask (`test/visor.test.ts`).
 *
 * The paint rule is applied to **linear** colour, because that is what the
 * GPU hands the shader for an sRGB texture, and the same numbers are the
 * shader's uniforms: `VISOR_PAINT` in `visorFit.ts` must equal what is
 * recorded here, and the test checks that it does.
 *
 * Usage: node asset-pipeline/fit-visor.mjs <virgil|fabricator2|prover2|keeper2|all>
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(appRoot, '../..');
const require = createRequire(import.meta.url);

/**
 * The paint rule, on linear colour: the default is `VISOR_PAINT` in
 * visorFit.ts, and a head may override it below where its paint needs
 * it. The rule used is recorded in the mask and is what the runtime's
 * shader is given, so pipeline and shader always agree.
 */
const PAINT = { luminance: 0.045, chroma: 0.03 };

/**
 * Each head, and a coarse region of the fitting frame — the head joint's
 * frame for the rigged Virgil (source units, 0.6 m each), the placed frame
 * (metres, feet at the origin) for the three static figures — outside
 * which nothing is considered. The region is a guard against dark paint
 * elsewhere on the model, not the visor's shape: the paint is the shape.
 */
const HEADS = {
  virgil: {
    kind: 'rigged',
    asset: 'src/world/virgil/virgil-rigged-asset',
    joint: 'Head',
    region: { halfWidth: 0.75, y0: 0.05, y1: 1.05, zMin: 0.15 },
  },
  fabricator2: {
    kind: 'static',
    asset: 'src/world/props/fabricator2-asset',
    region: { halfWidth: 0.45, y0: 1.1, y1: 1.55, zMin: 0.1 },
  },
  prover2: {
    kind: 'static',
    asset: 'src/world/props/prover2-asset',
    // The dome's dark paint is tinted blue-grey: measured 2026-09-08,
    // 15 % of the samples inside his mask were dark but over the default
    // chroma of 0.03 (the 99th percentile of the dark samples' chroma is
    // 0.046), and at full texture resolution the shader discarded them as
    // speckle, so close up his eyes went missing while from across the
    // disc a lower mip passed. The chroma rule exists to keep navy paint
    // out; his navy — the collar at y ≈ 1.0 and the halo at 1.55 — is
    // outside a region that starts at 1.04, so the rule can be relaxed
    // for him without admitting it.
    region: { halfWidth: 0.4, y0: 1.04, y1: 1.45, zMin: 0.05 },
    paint: { luminance: 0.06, chroma: 0.06 },
  },
  keeper2: {
    kind: 'static',
    asset: 'src/world/props/keeper2-asset',
    region: { halfWidth: 0.3, y0: 0.85, y1: 1.3, zMin: -0.05 },
  },
};

function fail(message) {
  console.error(`fit-visor: ${message}`);
  process.exit(1);
}

const requested = process.argv[2];
if (!requested || (requested !== 'all' && !HEADS[requested])) {
  fail(`usage: node asset-pipeline/fit-visor.mjs <${Object.keys(HEADS).join('|')}|all>`);
}
const names = requested === 'all' ? Object.keys(HEADS) : [requested];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto('about:blank');

/** The base-colour image as RGBA bytes, decoded by Chromium from the payload's WebP. */
async function decodeImage(bytes, mimeType) {
  const result = await page.evaluate(
    async ({ b64, mime }) => {
      const binary = atob(b64);
      const u = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) u[i] = binary.charCodeAt(i);
      const bitmap = await createImageBitmap(new Blob([u], { type: mime }));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
      let s = '';
      for (let i = 0; i < data.length; i += 1) s += String.fromCharCode(data[i]);
      return { width: bitmap.width, height: bitmap.height, b64: btoa(s) };
    },
    { b64: Buffer.from(bytes).toString('base64'), mime: mimeType },
  );
  return { width: result.width, height: result.height, data: Buffer.from(result.b64, 'base64') };
}

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function isVisorPaint(image, u, v, rule) {
  // glTF UVs have their origin at the top left; the runtime sets flipY false.
  const x = Math.min(image.width - 1, Math.max(0, Math.floor(u * image.width)));
  const y = Math.min(image.height - 1, Math.max(0, Math.floor(v * image.height)));
  const i = (y * image.width + x) * 4;
  const r = srgbToLinear(image.data[i] / 255);
  const g = srgbToLinear(image.data[i + 1] / 255);
  const b = srgbToLinear(image.data[i + 2] / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  return luminance < rule.luminance && chroma < rule.chroma;
}

for (const name of names) await fit(name, HEADS[name]);
await browser.close();

async function fit(name, head) {
  const log = (message) => console.log(`fit-visor[${name}]: ${message}`);
  const rule = { ...PAINT, ...(head.paint ?? {}) };
  const metadata = JSON.parse(readFileSync(join(appRoot, `${head.asset}.json`), 'utf8'));
  const b64 = readFileSync(join(appRoot, `${head.asset}.b64.txt`), 'utf8');
  const payload = Buffer.from(b64, 'base64');
  const payloadSha = createHash('sha256').update(payload).digest('hex');
  if (payloadSha !== metadata.payload.sha256) {
    fail(`${name}: payload sha256 ${payloadSha} is not the one its metadata records`);
  }
  const buffer = payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.length);
  const sections = metadata.payload.sections;

  // The geometry in the fitting frame, its UVs, and which vertices are the head's.
  let positions;
  let uvs;
  let index;
  let isHead;
  if (head.kind === 'rigged') {
    const g = sections.glb;
    const glb = buffer.slice(g.offset, g.offset + g.length);
    const gltf = await new Promise((res, rej) => new GLTFLoader().parse(glb, '', res, rej));
    let mesh = null;
    gltf.scene.traverse((o) => {
      if (o.isSkinnedMesh) mesh = o;
    });
    if (!mesh) fail(`${name}: no skinned mesh`);
    const bone = gltf.scene.getObjectByName(head.joint);
    if (!bone) fail(`${name}: no joint "${head.joint}"`);
    const boneIndex = mesh.skeleton.bones.indexOf(bone);
    const toBone = new THREE.Matrix4().multiplyMatrices(
      mesh.skeleton.boneInverses[boneIndex],
      mesh.bindMatrix,
    );
    const position = mesh.geometry.getAttribute('position');
    const uv = mesh.geometry.getAttribute('uv');
    const skinIndex = mesh.geometry.getAttribute('skinIndex');
    const skinWeight = mesh.geometry.getAttribute('skinWeight');
    positions = new Float32Array(position.count * 3);
    uvs = new Float32Array(position.count * 2);
    const weights = new Float32Array(position.count);
    const v = new THREE.Vector3();
    for (let i = 0; i < position.count; i += 1) {
      v.fromBufferAttribute(position, i).applyMatrix4(toBone);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
      uvs[i * 2] = uv.getX(i);
      uvs[i * 2 + 1] = uv.getY(i);
      let w = 0;
      if (skinIndex.getX(i) === boneIndex) w += skinWeight.getX(i);
      if (skinIndex.getY(i) === boneIndex) w += skinWeight.getY(i);
      if (skinIndex.getZ(i) === boneIndex) w += skinWeight.getZ(i);
      if (skinIndex.getW(i) === boneIndex) w += skinWeight.getW(i);
      weights[i] = w;
    }
    index = mesh.geometry.index.array;
    isHead = (i) => weights[i] > 0.5;
  } else {
    const p = new Int16Array(buffer, sections.position.offset, sections.position.length / 2);
    const u = new Uint16Array(buffer, sections.uv.offset, sections.uv.length / 2);
    index =
      sections.index.kind === 'u32'
        ? new Uint32Array(buffer, sections.index.offset, sections.index.length / 4)
        : new Uint16Array(buffer, sections.index.offset, sections.index.length / 2);
    const k = metadata.runtime.scale * metadata.runtime.positionScale;
    positions = new Float32Array(p.length);
    uvs = new Float32Array(u.length);
    for (let i = 0; i < p.length; i += 3) {
      positions[i] = (p[i] / 32767) * k;
      positions[i + 1] = (p[i + 1] / 32767) * k + metadata.runtime.baseOffsetY;
      positions[i + 2] = (p[i + 2] / 32767) * k;
    }
    for (let i = 0; i < u.length; i += 1) uvs[i] = u[i] / 65535;
    isHead = () => true;
  }

  const map = sections.map_base_color;
  const image = await decodeImage(
    payload.subarray(map.offset, map.offset + map.length),
    map.mimeType,
  );
  log(`base colour ${image.width}x${image.height} decoded`);

  const { halfWidth, y0, y1, zMin } = head.region;
  const inRegion = (i) =>
    Math.abs(positions[i * 3]) <= halfWidth &&
    positions[i * 3 + 1] >= y0 &&
    positions[i * 3 + 1] <= y1 &&
    positions[i * 3 + 2] >= zMin;

  // Seven samples per triangle: corners, edge midpoints, centroid. A
  // triangle is the visor's if any sample is visor paint (the shader
  // keeps only the painted pixels within it); it is wholly painted if all
  // seven are, which is reported so a reader knows how ragged the edge is.
  const triangles = [];
  let whole = 0;
  let considered = 0;
  const bounds = new THREE.Box3();
  // The painted samples' own positions: the paint's extent, tighter than
  // the triangles', and what the face is mapped to.
  const paintBounds = new THREE.Box3();
  const pt = new THREE.Vector3();
  const pa = new THREE.Vector3();
  const pb = new THREE.Vector3();
  const pc = new THREE.Vector3();
  for (let t = 0; t < index.length; t += 3) {
    const ia = index[t];
    const ib = index[t + 1];
    const ic = index[t + 2];
    if (!(isHead(ia) && isHead(ib) && isHead(ic))) continue;
    if (!(inRegion(ia) && inRegion(ib) && inRegion(ic))) continue;
    considered += 1;
    const corners = [ia, ib, ic].map((i) => [uvs[i * 2], uvs[i * 2 + 1]]);
    // Barycentric weights of the seven samples, applied alike to UVs and positions.
    const weightsOf = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [0.5, 0.5, 0],
      [0, 0.5, 0.5],
      [0.5, 0, 0.5],
      [1 / 3, 1 / 3, 1 / 3],
    ];
    pa.fromArray(positions, ia * 3);
    pb.fromArray(positions, ib * 3);
    pc.fromArray(positions, ic * 3);
    let painted = 0;
    for (const [wa, wb, wc] of weightsOf) {
      const u = corners[0][0] * wa + corners[1][0] * wb + corners[2][0] * wc;
      const v = corners[0][1] * wa + corners[1][1] * wb + corners[2][1] * wc;
      if (!isVisorPaint(image, u, v, rule)) continue;
      painted += 1;
      pt.set(
        pa.x * wa + pb.x * wb + pc.x * wc,
        pa.y * wa + pb.y * wb + pc.y * wc,
        pa.z * wa + pb.z * wb + pc.z * wc,
      );
      paintBounds.expandByPoint(pt);
    }
    if (painted === 0) continue;
    if (painted === weightsOf.length) whole += 1;
    triangles.push(t / 3);
    for (const i of [ia, ib, ic]) bounds.expandByPoint(pt.fromArray(positions, i * 3));
  }
  if (triangles.length < 50) fail(`${name}: only ${triangles.length} visor triangles found`);

  const out = {
    $comment: `Generated by asset-pipeline/fit-visor.mjs ${name} from the committed runtime payload. Do not hand-edit; regenerate.`,
    source: { asset: `${head.asset}.json`, payloadSha256: payloadSha },
    frame:
      head.kind === 'rigged'
        ? `the "${head.joint}" joint's frame at bind pose, source units (${metadata.runtime.scale.toFixed(3)} m each)`
        : 'the placed frame: metres, feet at the origin',
    joint: head.kind === 'rigged' ? head.joint : null,
    paint: {
      ...rule,
      space: 'linear',
      samplesPerTriangle: 7,
      overridesDefault: head.paint !== undefined,
    },
    region: head.region,
    measured: {
      trianglesConsidered: considered,
      trianglesPainted: triangles.length,
      trianglesWhollyPainted: whole,
      trianglesPartlyPainted: triangles.length - whole,
      triangleBounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
      paintBounds: { min: paintBounds.min.toArray(), max: paintBounds.max.toArray() },
      centre: paintBounds.getCenter(new THREE.Vector3()).toArray(),
    },
    triangles,
  };
  const outPath = join(appRoot, `${head.asset.replace(/-asset$/, '')}-visor.json`);
  writeFileSync(outPath, `${JSON.stringify(out)}\n`);
  execFileSync(join(repoRoot, 'node_modules/.bin/biome'), ['format', '--write', outPath]);
  log(
    `${triangles.length} of ${considered} head-front triangles carry visor paint ` +
      `(${whole} wholly, ${triangles.length - whole} at the paint's edge)`,
  );
  log(
    `paint bounds x ${paintBounds.min.x.toFixed(3)}..${paintBounds.max.x.toFixed(3)} ` +
      `y ${paintBounds.min.y.toFixed(3)}..${paintBounds.max.y.toFixed(3)} z ${paintBounds.min.z.toFixed(3)}..${paintBounds.max.z.toFixed(3)}` +
      ` (triangles reach x ±${Math.max(-bounds.min.x, bounds.max.x).toFixed(3)})`,
  );
  log(`wrote ${outPath}`);
}
