/**
 * Captures frames of the built **V11** Owner Build so that a person can look at
 * them, which is the only way the composition questions in the brief can be
 * settled: whether Virgil reads as the focal point, whether the three
 * specialists are recognisable and separated, whether anything is clipped.
 * `verify-owner-build-v11.ts` measures what can be measured; this exists so
 * that what cannot be is at least seen.
 *
 * **Simulated viewports in headless Chromium, rendered in software.** No iPhone
 * exists in this environment and no frame here is evidence of how the world
 * looks on real graphics hardware; OD-0005 defers those two checks and requires
 * them recorded as not performed, never as met.
 *
 * Usage: pnpm --filter mission-control capture:v11
 *        VIRGIL_SHOT_DIR=/somewhere pnpm --filter mission-control capture:v11
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { type Browser, chromium } from '@playwright/test';

const outDir = resolve(import.meta.dirname, '../dist/owner-build-v11');
const built = readdirSync(outDir).filter((n) => /virgil-[0-9a-f]{10}\.html$/.test(n));
if (built.length !== 1) {
  throw new Error(`expected exactly one built V11 Owner Build in ${outDir}, found ${built.length}`);
}
const fileUrl = pathToFileURL(resolve(outDir, built[0] as string)).href;

const shots = process.env.VIRGIL_SHOT_DIR ?? resolve(outDir, 'frames');
mkdirSync(shots, { recursive: true });

const preinstalled =
  process.env.CHROMIUM_EXECUTABLE ??
  (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
    : '/opt/pw-browsers/chromium');
const browser: Browser = await chromium.launch(
  existsSync(preinstalled) ? { executablePath: preinstalled } : {},
);

const VIEWPORTS: [string, number, number][] = [
  ['p390', 390, 844],
  ['p430', 430, 932],
  ['l844', 844, 390],
  ['desk', 1280, 800],
];

const errors: string[] = [];

for (const [name, width, height] of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${name}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`${name} uncaught: ${e}`));

  await page.goto(`${fileUrl}#/`, { waitUntil: 'load' });
  await page.locator('canvas').waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => '__virgilRoomReady' in window, undefined, { timeout: 180_000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${shots}/${name}-overview.png` });

  // Where every target landed, so the frames and the numbers agree.
  const measured = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-touch-target]')).map((node) => {
      const rect = node.getBoundingClientRect();
      return `${node.dataset.touchTarget} ${Math.round(rect.x)},${Math.round(rect.y)} ${Math.round(rect.width)}x${Math.round(rect.height)}`;
    }),
  );
  console.log(`capture v11: ${name} targets — ${measured.join(' | ')}`);

  // The badge, opened.
  await page.locator('[data-touch-target="badge"]').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shots}/${name}-badge.png` });
  await page.locator('[data-touch-target="badge"]').click();
  await page.waitForTimeout(400);

  // The development menu, opened.
  await page.locator('[data-touch-target="dev"]').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shots}/${name}-dev.png` });
  await page.locator('[data-touch-target="dev"]').click();
  await page.waitForTimeout(400);

  // A specialist, selected through the world rather than through a query
  // parameter: the deliberate transition, then the record.
  const keeper = await page
    .locator('[data-touch-target="keeper"]')
    .boundingBox({ timeout: 10_000 })
    .catch(() => null);
  if (keeper) {
    await page.mouse.move(keeper.x + keeper.width / 2, keeper.y + keeper.height / 2);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${shots}/${name}-keeper-transition.png` });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${shots}/${name}-keeper-record.png` });
    // Stage 3 replaced the panel with the window, whose way back is a chevron.
    // Both selectors are tried so this script still runs against either.
    const back = page.locator('.v11w-back, .panel-back');
    if ((await back.count()) > 0) {
      await back.click();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${shots}/${name}-keeper-station.png` });
    }
  }

  await page.close();
}

// And V10, unchanged, at its own route inside the same file.
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${fileUrl}#/v10`, { waitUntil: 'load' });
  await page.locator('canvas').waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => '__virgilRoomReady' in window, undefined, { timeout: 180_000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${shots}/p390-v10.png` });
  await page.close();
}

await browser.close();

console.log(`capture v11: frames in ${shots}`);
console.log(`capture v11: console errors ${errors.length}`);
for (const error of errors) console.log(`capture v11: ${error}`);
console.log(
  'capture v11: SIMULATED viewports, software rendering. Not evidence of how this looks on real graphics hardware; those checks are NOT PERFORMED.',
);
