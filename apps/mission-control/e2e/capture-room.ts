/**
 * Screenshots the built Owner Build's set, for catching gross errors only —
 * a black frame, a figure buried in the floor, a station through a body,
 * nothing in shot. This container renders in software (SwiftShader) and the
 * captures are not evidence of how it looks; see
 * docs/process/PHASE_1_HOW_TO_LOOK_V6.md.
 *
 * Both presentations are captured at several moments of the demonstration
 * and from two orbit positions, then each character close up, and with
 * `states` every face and panel held in each state.
 *
 * Usage: pnpm --filter mission-control build:owner && tsx e2e/capture-room.ts <outDir> [orbit] [states]
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const outDir = resolve(process.argv[2] ?? '.');
const orbit = process.argv.includes('orbit');
const states = process.argv.includes('states');
mkdirSync(outDir, { recursive: true });
const distDir = resolve(import.meta.dirname, '../dist/owner-build');
const built = readdirSync(distDir).filter((n) => /virgil-[0-9a-f]{10}\.html$/.test(n));
const fileUrl = pathToFileURL(resolve(distDir, built[0] as string)).href;

const preinstalled = process.env.CHROMIUM_EXECUTABLE ?? '/opt/pw-browsers/chromium';
const browser = await chromium.launch(
  existsSync(preinstalled) ? { executablePath: preinstalled } : {},
);
const errors: string[] = [];

async function open(query: string) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${fileUrl}#/?${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => '__virgilRoomReady' in window, undefined, { timeout: 180_000 });
  return page;
}

for (const view of ['room', 'tabletop'] as const) {
  const page = await open(`view=${view}`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: resolve(outDir, `${view}-a.png`) });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: resolve(outDir, `${view}-b.png`) });
  await page.waitForTimeout(9000);
  await page.screenshot({ path: resolve(outDir, `${view}-c.png`) });
  if (orbit) {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (box) {
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx - 300, cy + 30, { steps: 12 });
      await page.mouse.up();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: resolve(outDir, `${view}-orbit-left.png`) });
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + 600, cy - 60, { steps: 12 });
      await page.mouse.up();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: resolve(outDir, `${view}-orbit-right.png`) });
    }
  }
  // The key switches the view without a reload.
  await page.keyboard.press('v');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: resolve(outDir, `${view}-switched.png`) });
  await page.close();
}

// A fresh page per close-up: a hash-only navigation does not remount the
// canvas, so the camera would stay where it was.
const closeUps: { cam: string; view: string; state?: string; at?: number[] }[] = [];
for (const cam of ['virgil', 'fabricator', 'prover', 'keeper']) {
  closeUps.push({ cam, view: 'tabletop' });
}
if (states) {
  for (const cam of ['virgil', 'fabricator', 'prover', 'keeper']) {
    for (const state of ['idle', 'attentive', 'working', 'passed', 'blocked']) {
      closeUps.push({ cam, view: 'tabletop', state });
    }
  }
  // The station panels run an arrival in RECEIVING (`state=attentive`) and
  // a run of checks in WORKING, from the moment the state is set.
  closeUps.push({ cam: 'prover', view: 'room', state: 'attentive', at: [900, 1600, 2400, 3300] });
  closeUps.push({ cam: 'prover', view: 'room', state: 'working', at: [800, 2300, 4200, 6200] });
  // The stomp, at several moments after it starts.
  closeUps.push({ cam: 'virgil', view: 'room', state: 'blocked', at: [300, 700, 1100, 1500] });
}
for (const { cam, view, state, at } of closeUps) {
  const query = `view=${view}&cam=${cam}${state ? `&state=${state}` : ''}`;
  const page = await open(query);
  const name = `${view}-${cam}${state ? `-${state}` : ''}`;
  if (at) {
    let elapsed = 0;
    for (const ms of at) {
      await page.waitForTimeout(ms - elapsed);
      elapsed = ms;
      await page.screenshot({ path: resolve(outDir, `${name}-${ms}ms.png`) });
    }
  } else {
    await page.waitForTimeout(3000);
    await page.screenshot({ path: resolve(outDir, `${name}.png`) });
  }
  await page.close();
}
console.log(`capture-room: ${outDir}, console errors ${errors.length}`);
for (const e of errors) console.log(`capture-room: error — ${e}`);
await browser.close();
