/**
 * Screenshots the built Owner Build's room, for catching gross errors only —
 * a black frame, Virgil buried in the floor, a ring through his body, nothing
 * in shot. This container renders in software (SwiftShader) and the captures
 * are not evidence of how it looks; see docs/process/PHASE_1_HOW_TO_LOOK.md.
 *
 * The default view is captured at several moments so the orrery's tracks are
 * seen at different rotation phases, and from two orbit positions.
 *
 * Usage: pnpm --filter mission-control build:owner && tsx e2e/capture-room.ts <outDir> [orbit] [states]
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const outDir = resolve(process.argv[2] ?? '.');
const orbit = process.argv[3] === 'orbit';
mkdirSync(outDir, { recursive: true });
const distDir = resolve(import.meta.dirname, '../dist/owner-build');
const built = readdirSync(distDir).filter((n) => n.startsWith('virgil-') && n.endsWith('.html'));
const fileUrl = pathToFileURL(resolve(distDir, built[0] as string)).href;

const preinstalled = process.env.CHROMIUM_EXECUTABLE ?? '/opt/pw-browsers/chromium';
const browser = await chromium.launch(
  existsSync(preinstalled) ? { executablePath: preinstalled } : {},
);
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors: string[] = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(fileUrl, { waitUntil: 'load' });
await page.waitForFunction(() => '__virgilRoomReady' in window, undefined, { timeout: 180_000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: resolve(outDir, 'room-light-a.png') });
await page.waitForTimeout(4000);
await page.screenshot({ path: resolve(outDir, 'room-light-b.png') });
await page.waitForTimeout(4000);
await page.screenshot({ path: resolve(outDir, 'room-light-c.png') });
if (orbit) {
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (box) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 260, cy + 40, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: resolve(outDir, 'room-orbit-left.png') });
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 520, cy - 120, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: resolve(outDir, 'room-orbit-right.png') });
  }
}
// A fresh page per close-up: a hash-only navigation does not remount the
// canvas, so the camera would stay where it was. Each face is then held in
// every state (`#/?state=`) so the states can be judged at rest.
const closeUps: { cam: string; state?: string; at?: number[] }[] = [
  { cam: 'prover' },
  { cam: 'face' },
];
if (process.argv.includes('states')) {
  for (const cam of ['face', 'prover']) {
    for (const state of ['idle', 'attentive', 'working', 'passed', 'blocked']) {
      closeUps.push({ cam, state });
    }
  }
  // The station's panel runs an arrival in RECEIVING (`state=attentive`) and
  // a run of checks in WORKING, from the moment the state is set; several
  // frames of each, at named moments, or a single frame would only ever
  // show their ends.
  closeUps.push({ cam: 'station', state: 'idle' });
  closeUps.push({ cam: 'station', state: 'attentive', at: [700, 1400, 2200, 3200] });
  closeUps.push({ cam: 'station', state: 'working', at: [800, 2300, 4200, 6200] });
  closeUps.push({ cam: 'station', state: 'passed' });
  closeUps.push({ cam: 'station', state: 'blocked' });
}
for (const { cam, state, at } of closeUps) {
  const view = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const query = state ? `cam=${cam}&state=${state}` : `cam=${cam}`;
  await view.goto(`${fileUrl}#/?${query}`, { waitUntil: 'load' });
  await view.waitForFunction(() => '__virgilRoomReady' in window, undefined, { timeout: 180_000 });
  const name = `room-${cam}${state ? `-${state}` : ''}`;
  if (at) {
    let elapsed = 0;
    for (const ms of at) {
      await view.waitForTimeout(ms - elapsed);
      elapsed = ms;
      await view.screenshot({ path: resolve(outDir, `${name}-${ms}ms.png`) });
    }
  } else {
    await view.waitForTimeout(3000);
    await view.screenshot({ path: resolve(outDir, `${name}.png`) });
  }
  await view.close();
}
console.log(`capture-room: ${outDir}, console errors ${errors.length}`);
for (const e of errors) console.log(`capture-room: error — ${e}`);
await browser.close();
