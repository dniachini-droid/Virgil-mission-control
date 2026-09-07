/**
 * Screenshots the built Owner Build's room from a few angles, for catching
 * gross errors only — a black frame, Virgil buried in the floor, nothing in
 * shot. This container renders in software (SwiftShader) and the captures are
 * not evidence of how it looks; see docs/process/PHASE_1_HOW_TO_LOOK.md.
 *
 * Usage: pnpm --filter mission-control build:owner && tsx e2e/capture-room.ts <outDir> [orbit]
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
await page.screenshot({ path: resolve(outDir, 'room-metal.png') });
await page.getByRole('button', { name: 'Light' }).click();
await page.waitForTimeout(2500);
await page.screenshot({ path: resolve(outDir, 'room-light.png') });
if (orbit) {
  await page.getByRole('button', { name: 'Metal' }).click();
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
console.log(`capture-room: ${outDir}, console errors ${errors.length}`);
for (const e of errors) console.log(`capture-room: error — ${e}`);
await browser.close();
