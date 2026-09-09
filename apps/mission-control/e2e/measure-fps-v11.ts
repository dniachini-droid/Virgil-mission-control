/**
 * **What the three sharpness settings cost, in this container.**
 *
 * The owner asked whether the text can be crisper; the cause is the canvas's
 * pixel ratio (`src/world/mobile/pixelRatio.ts`), and the coordinator asked for
 * the frame-rate cost to be measured before choosing. This measures it — and
 * the measurement is **almost worthless as a prediction about a phone**, which
 * is why it is recorded with that stated rather than quietly presented as a
 * number:
 *
 *  - this container rasterises in software (SwiftShader) on the CPU, where
 *    fragment cost dominates absolutely and every extra pixel is paid for at
 *    full price. A GPU pays a small fraction of that;
 *  - the software renderer turns the displays' mip chains off entirely
 *    (`screens/v11/resolution.ts`), so it is not even drawing the same work;
 *  - the phone tiers skip the whole post-processing chain, and this machine is
 *    detected as `desktop`, so it does not.
 *
 * So what this produces is a **direction and an order of magnitude**, not a
 * budget. The real answer needs the owner's own device, which is why the
 * setting is in the hidden menu.
 *
 * Usage: pnpm --filter mission-control measure:fps:v11
 */
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, type Page } from '@playwright/test';

const outDir = resolve(import.meta.dirname, '../dist/owner-build-v11');
const built = readdirSync(outDir).filter((n) => /virgil-[0-9a-f]{10}\.html$/.test(n));
if (built.length !== 1) {
  throw new Error(`expected exactly one built V11 Owner Build in ${outDir}, found ${built.length}`);
}
const fileUrl = pathToFileURL(resolve(outDir, built[0] as string)).href;

const preinstalled =
  process.env.CHROMIUM_EXECUTABLE ??
  (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
    : '/opt/pw-browsers/chromium');
const browser = await chromium.launch(
  existsSync(preinstalled) ? { executablePath: preinstalled } : {},
);

const SECONDS = 4;

/**
 * Counts frames over an interval, **without a named inner function**: `tsx`
 * compiles one into an `esbuild` `__name(...)` call that does not exist inside
 * the page, and the evaluate throws `ReferenceError: __name is not defined`.
 * `verify-owner-build-v11.ts` records the same trap.
 */
async function fps(page: Page): Promise<number> {
  const started = Date.now();
  let frames = 0;
  while (Date.now() - started < SECONDS * 1000) {
    await page.evaluate(
      () =>
        new Promise<void>((done) => {
          requestAnimationFrame(() => done());
        }),
    );
    frames += 1;
  }
  return frames / ((Date.now() - started) / 1000);
}

/**
 * **`deviceScaleFactor: 3`, and without it this script measures nothing.**
 *
 * The first run of it reported 1.51 / 1.46 / 1.54 fps for Low / Standard /
 * Native and a canvas of 390 device pixels in all three — because a headless
 * page defaults to a device pixel ratio of 1, and `dpr=[1, ceiling]` clamps to
 * the device's own ratio. Every setting drew the same picture and the three
 * figures were noise. A phone reports 3, so the page is told to.
 */
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
});
/**
 * **Three minutes, not thirty seconds.** Playwright's default action timeout
 * assumes a renderer that produces frames. At a device pixel ratio of 3 this
 * software rasteriser takes seconds per frame, so its "element is stable
 * across two animation frames" check alone can exceed the default — and the
 * first version of this loop died there, on a Close button that a hit test
 * showed was perfectly clickable. The renderer is the slow thing, not the
 * interface, so the instrument waits longer rather than the product being
 * blamed.
 */
page.setDefaultTimeout(180_000);
await page.goto(`${fileUrl}#/?demo=11&loop=0&hold=1`, { waitUntil: 'load' });
await page.locator('canvas').waitFor({ timeout: 30_000 });
await page.waitForFunction(() => '__virgilRoomReady' in window, undefined, { timeout: 180_000 });
await page.waitForTimeout(2500);

const tier = await page.evaluate(
  () => (window as { __virgilRenderer?: string }).__virgilRenderer ?? '(unknown)',
);
const ratios: Record<string, number> = {};

/**
 * **Set through the row it belongs to, not by name alone.** Stage 4 added an
 * `Auto` to the Sharpness row and there is now an `Auto` in the Performance
 * row as well, so `getByRole('button', { name: 'Auto' })` matches two and
 * Playwright refuses. Each row is addressed by its own label.
 */
async function choose(row: string, label: string) {
  await page.locator('[data-touch-target="dev"]').click();
  await page
    .locator('.v11-dev-row', { hasText: row })
    .getByRole('button', { name: label, exact: true })
    .click();
  // **Closed by the panel's own Close, not by the entry mark.** Stage 4's
  // Performance row and its status line made the panel tall enough to cover
  // the ⋯ that opens it, so a second click on the entry is intercepted by the
  // panel and times out. The panel has always had a Close; it is the control a
  // reader would use, so it is the one this drives.
  await page.locator('.v11-dev-close').click();
  await page.waitForTimeout(1200);
}

const drawnAt = () =>
  page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    return canvas
      ? { css: canvas.clientWidth, device: canvas.width, ratio: canvas.width / canvas.clientWidth }
      : { css: 0, device: 0, ratio: 0 };
  });

for (const label of ['Auto', 'Low', 'Standard', 'Native']) {
  await choose('Sharpness', label);
  const measured = await fps(page);
  const drawing = await drawnAt();
  ratios[label] = measured;
  console.log(
    `measure fps v11: sharpness ${label} — ${measured.toFixed(2)} fps, canvas ${drawing.device} device px for ${drawing.css} CSS px (ratio ${drawing.ratio.toFixed(2)})`,
  );
}

/**
 * And what the reduced-performance ladder costs, at the default sharpness.
 * The same caveat governs every figure: this is SwiftShader on a CPU.
 */
await choose('Sharpness', 'Auto');
for (const label of ['Full', 'Reduced', 'Minimal']) {
  await choose('Performance', label);
  const measured = await fps(page);
  const drawing = await drawnAt();
  const state = await page.evaluate(
    () =>
      (window as { __virgilV11?: { level: string; tier: string; redrawScale: number } })
        .__virgilV11,
  );
  console.log(
    `measure fps v11: level ${label} — ${measured.toFixed(2)} fps, canvas ${drawing.device} device px (ratio ${drawing.ratio.toFixed(2)}), tier ${state?.tier}, screens x${state?.redrawScale}`,
  );
}
await choose('Performance', 'Auto');

console.log(`measure fps v11: renderer ${tier}, viewport 390 x 844, ${SECONDS} s per setting`);
console.log(
  'measure fps v11: SOFTWARE RENDERING. These figures describe SwiftShader on a CPU, where every extra fragment is paid at full price and the displays’ mip chains are off. They are a direction, not a budget, and no performance figure for any device has been taken.',
);
await browser.close();
