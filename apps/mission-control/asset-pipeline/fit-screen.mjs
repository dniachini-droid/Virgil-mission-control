/**
 * Finds the screen on a role console's own mesh and records which of its
 * triangles are the screen.
 *
 * V8 (`docs/process/PHASE_1_STYLISED_SPEC.md` §0.10.2). The owner: "each
 * screen of the actual consoles (created by meshy) should have the
 * information on it" — and, of the treatment, "make them compleetyley
 * black, reflective, and text sitting slightly under it". It is the visor
 * technique (`fit-visor.mjs`, `src/world/characters/visorFit.ts`) applied
 * to a console: the runtime copies the named triangles out of the
 * console's geometry and draws the live screen on them through the same
 * face and glass materials.
 *
 * What the models turned out to carry, measured 2026-09-08 on the shipped
 * payloads: each station has exactly one usable screen, a recessed navy
 * panel in a cream bezel at the top, tilted back 12–14°, facing the front,
 * with pale writing baked into it. Two things follow, and both are why
 * this is a second script rather than a flag on `fit-visor.mjs`:
 *
 *  - the screens are **navy, not black** — the same navy as the trim — so
 *    the visor's near-black paint rule cannot find them from the texture.
 *    The screen is selected by **geometry**: a measured region, the facing
 *    (within `FACING_TOLERANCE` of the screen's normal), and the darkness
 *    of most of the triangle's samples (which is what excludes the cream
 *    bezel and the gold screws where the region overlaps them);
 *  - the baked writing means a per-pixel paint mask would punch holes
 *    through the content, so **the whole selected triangle is the screen**.
 *    The mask records a paint rule that keeps every pixel (`KEEP_ALL`), and
 *    the shader is given the mask's rule, never a constant, so the same
 *    face material serves both a visor and a screen.
 *
 * Input:  the committed runtime payload, read only; the base-colour image
 *         decoded through the Chromium `@playwright/test` installs.
 * Output: `<asset>-screen.json` beside the payload, in the `VisorMask`
 *         shape (`visorFit.ts`) plus the facing it was selected with, and
 *         the payload digest it was made from, so a regenerated payload
 *         invalidates the mask (`test/console-screens.test.ts`).
 *
 * Usage: node asset-pipeline/fit-screen.mjs <fabricatorStation|proverStation|keeperStation|all>
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import * as THREE from 'three';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(appRoot, '../..');

/**
 * The darkness a sample must be under, on linear colour, to count as the
 * screen's surface rather than its bezel: the stations' navy measures a
 * luminance of about 0.03, the pale baked writing 0.2–0.5, the cream
 * bezel about 0.8, the gold trim about 0.35.
 */
const DARK = { luminance: 0.15 };
/** How many of a triangle's seven samples must be dark. */
const DARK_SAMPLES = 4;
/** Cosine of the largest angle a triangle's normal may make with the screen's. */
const FACING_TOLERANCE = Math.cos((25 * Math.PI) / 180);
/** The rule the runtime shader is given: nothing is discarded. */
const KEEP_ALL = { luminance: 10, chroma: 10 };

/**
 * Each console's one screen: a region in the placed frame (metres, base at
 * the origin) that holds the screen and as little else as possible, and
 * the screen's facing, both read off the isolated renders and the planar
 * patches measured on 2026-09-08. The region is a guard; the facing and
 * the darkness are what pick the screen out of the bezel inside it.
 */
const SCREENS = {
  fabricatorStation: {
    asset: 'src/world/props/fabricatorStation-asset',
    region: { x0: -0.72, x1: 0.36, y0: 0.85, y1: 1.5, z0: -0.12, z1: 0.12 },
    facing: [0, 0.24, 0.97],
  },
  proverStation: {
    asset: 'src/world/props/proverStation-asset',
    region: { x0: -0.58, x1: 0.42, y0: 0.98, y1: 1.55, z0: -0.12, z1: 0.08 },
    facing: [0, 0.24, 0.97],
  },
  keeperStation: {
    asset: 'src/world/props/keeperStation-asset',
    region: { x0: -0.48, x1: 0.48, y0: 1.26, y1: 1.92, z0: -0.48, z1: -0.26 },
    facing: [0, 0.21, 0.98],
  },
};

function fail(message) {
  console.error(`fit-screen: ${message}`);
  process.exit(1);
}

const requested = process.argv[2];
if (!requested || (requested !== 'all' && !SCREENS[requested])) {
  fail(`usage: node asset-pipeline/fit-screen.mjs <${Object.keys(SCREENS).join('|')}|all>`);
}
const names = requested === 'all' ? Object.keys(SCREENS) : [requested];

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

function luminanceAt(image, u, v) {
  const x = Math.min(image.width - 1, Math.max(0, Math.floor(u * image.width)));
  const y = Math.min(image.height - 1, Math.max(0, Math.floor(v * image.height)));
  const i = (y * image.width + x) * 4;
  const r = srgbToLinear(image.data[i] / 255);
  const g = srgbToLinear(image.data[i + 1] / 255);
  const b = srgbToLinear(image.data[i + 2] / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

for (const name of names) await fit(name, SCREENS[name]);
await browser.close();

async function fit(name, screen) {
  const log = (message) => console.log(`fit-screen[${name}]: ${message}`);
  const metadata = JSON.parse(readFileSync(join(appRoot, `${screen.asset}.json`), 'utf8'));
  const b64 = readFileSync(join(appRoot, `${screen.asset}.b64.txt`), 'utf8');
  const payload = Buffer.from(b64, 'base64');
  const payloadSha = createHash('sha256').update(payload).digest('hex');
  if (payloadSha !== metadata.payload.sha256) {
    fail(`${name}: payload sha256 ${payloadSha} is not the one its metadata records`);
  }
  const buffer = payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.length);
  const sections = metadata.payload.sections;
  const p = new Int16Array(buffer, sections.position.offset, sections.position.length / 2);
  const u = new Uint16Array(buffer, sections.uv.offset, sections.uv.length / 2);
  const index =
    sections.index.kind === 'u32'
      ? new Uint32Array(buffer, sections.index.offset, sections.index.length / 4)
      : new Uint16Array(buffer, sections.index.offset, sections.index.length / 2);
  const k = metadata.runtime.scale * metadata.runtime.positionScale;
  const positions = new Float32Array(p.length);
  const uvs = new Float32Array(u.length);
  for (let i = 0; i < p.length; i += 3) {
    positions[i] = (p[i] / 32767) * k;
    positions[i + 1] = (p[i + 1] / 32767) * k + metadata.runtime.baseOffsetY;
    positions[i + 2] = (p[i + 2] / 32767) * k;
  }
  for (let i = 0; i < u.length; i += 1) uvs[i] = u[i] / 65535;

  const map = sections.map_base_color;
  const image = await decodeImage(
    payload.subarray(map.offset, map.offset + map.length),
    map.mimeType,
  );
  log(`base colour ${image.width}x${image.height} decoded`);

  const { x0, x1, y0, y1, z0, z1 } = screen.region;
  const inRegion = (i) =>
    positions[i * 3] >= x0 &&
    positions[i * 3] <= x1 &&
    positions[i * 3 + 1] >= y0 &&
    positions[i * 3 + 1] <= y1 &&
    positions[i * 3 + 2] >= z0 &&
    positions[i * 3 + 2] <= z1;
  const facing = new THREE.Vector3().fromArray(screen.facing).normalize();

  const weightsOf = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [0.5, 0.5, 0],
    [0, 0.5, 0.5],
    [0.5, 0, 0.5],
    [1 / 3, 1 / 3, 1 / 3],
  ];
  const triangles = [];
  let considered = 0;
  let facingRejected = 0;
  let whole = 0;
  const bounds = new THREE.Box3();
  const pa = new THREE.Vector3();
  const pb = new THREE.Vector3();
  const pc = new THREE.Vector3();
  const n = new THREE.Vector3();
  const normalSum = new THREE.Vector3();
  let area = 0;
  for (let t = 0; t < index.length; t += 3) {
    const ia = index[t];
    const ib = index[t + 1];
    const ic = index[t + 2];
    if (!(inRegion(ia) && inRegion(ib) && inRegion(ic))) continue;
    considered += 1;
    pa.fromArray(positions, ia * 3);
    pb.fromArray(positions, ib * 3);
    pc.fromArray(positions, ic * 3);
    n.copy(pb).sub(pa).cross(pc.clone().sub(pa));
    const twiceArea = n.length();
    if (twiceArea < 1e-9) continue;
    n.divideScalar(twiceArea);
    if (n.dot(facing) < FACING_TOLERANCE) {
      facingRejected += 1;
      continue;
    }
    const corners = [ia, ib, ic].map((i) => [uvs[i * 2], uvs[i * 2 + 1]]);
    let dark = 0;
    for (const [wa, wb, wc] of weightsOf) {
      const uu = corners[0][0] * wa + corners[1][0] * wb + corners[2][0] * wc;
      const vv = corners[0][1] * wa + corners[1][1] * wb + corners[2][1] * wc;
      if (luminanceAt(image, uu, vv) < DARK.luminance) dark += 1;
    }
    if (dark < DARK_SAMPLES) continue;
    if (dark === weightsOf.length) whole += 1;
    triangles.push(t / 3);
    area += twiceArea / 2;
    normalSum.add(n);
    for (const i of [ia, ib, ic]) bounds.expandByPoint(pa.fromArray(positions, i * 3));
  }
  if (triangles.length < 4) fail(`${name}: only ${triangles.length} screen triangles found`);
  const meanNormal = normalSum.normalize();

  const out = {
    $comment: `Generated by asset-pipeline/fit-screen.mjs ${name} from the committed runtime payload. Do not hand-edit; regenerate.`,
    source: { asset: `${screen.asset}.json`, payloadSha256: payloadSha },
    frame: 'the placed frame: metres, base at the origin',
    joint: null,
    kind: 'screen',
    paint: {
      ...KEEP_ALL,
      space: 'linear',
      samplesPerTriangle: 7,
      overridesDefault: true,
      note: 'The screen carries baked writing; the whole triangle is the screen and no pixel is discarded.',
    },
    selection: {
      dark: DARK,
      darkSamplesRequired: DARK_SAMPLES,
      facing: screen.facing,
      facingToleranceDegrees: 25,
    },
    region: screen.region,
    measured: {
      trianglesConsidered: considered,
      trianglesRejectedByFacing: facingRejected,
      trianglesPainted: triangles.length,
      trianglesWhollyPainted: whole,
      trianglesPartlyPainted: triangles.length - whole,
      areaSquareMetres: +area.toFixed(5),
      meanNormal: meanNormal.toArray().map((v) => +v.toFixed(4)),
      triangleBounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
      // The screen's extent is its triangles' extent: the canvas is mapped to it.
      paintBounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
      centre: bounds.getCenter(new THREE.Vector3()).toArray(),
    },
    triangles,
  };
  const outPath = join(appRoot, `${screen.asset.replace(/-asset$/, '')}-screen.json`);
  writeFileSync(outPath, `${JSON.stringify(out)}\n`);
  execFileSync(join(repoRoot, 'node_modules/.bin/biome'), ['format', '--write', outPath]);
  const size = bounds.getSize(new THREE.Vector3());
  log(
    `${triangles.length} of ${considered} triangles in the region are the screen ` +
      `(${facingRejected} rejected by facing, ${whole} wholly dark); ${area.toFixed(3)} m², ` +
      `${size.x.toFixed(3)} × ${size.y.toFixed(3)} m, mean normal ${meanNormal
        .toArray()
        .map((v) => v.toFixed(2))
        .join(' ')}`,
  );
  log(`wrote ${outPath}`);
}
