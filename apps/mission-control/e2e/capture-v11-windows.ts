/**
 * **Stage 3's frames: the window as it is reached from the world.**
 *
 * `study/capture-windows-v11.mjs` photographs the window on its own, which is
 * where the design iteration happened; this photographs it **over the world**,
 * on the built artifact, which is the only place three of stage 3's questions
 * can be answered by looking:
 *
 *  - is the window up *while* the camera is still travelling — the owner's
 *    "one tap does both", seen rather than measured;
 *  - does it read as expanding from the display that was tapped;
 *  - is the way back visible at every level, and does dismissing it leave the
 *    reader at the station rather than snapping home.
 *
 * It also takes the overview at both portrait sizes and in landscape, because
 * the cluster and the default camera both moved on the owner's own real-device
 * evidence and those frames are what he asked for.
 *
 * **Simulated viewports in headless Chromium, rendered in software by
 * SwiftShader.** No iPhone and no GPU exists here. Nothing in these frames is
 * evidence about how the world looks on real graphics hardware; OD-0005 defers
 * those two checks and requires them recorded as not performed, never as met.
 *
 * Usage: pnpm --filter mission-control capture:v11:windows
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { type Browser, chromium, type Page } from '@playwright/test';

const outDir = resolve(import.meta.dirname, '../dist/owner-build-v11');
const built = readdirSync(outDir).filter((n) => /virgil-[0-9a-f]{10}\.html$/.test(n));
if (built.length !== 1) {
  throw new Error(`expected exactly one built V11 Owner Build in ${outDir}, found ${built.length}`);
}
const fileUrl = pathToFileURL(resolve(outDir, built[0] as string)).href;
const shots = process.env.VIRGIL_SHOT_DIR ?? resolve(outDir, 'window-frames');
mkdirSync(shots, { recursive: true });

const preinstalled =
  process.env.CHROMIUM_EXECUTABLE ??
  (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
    : '/opt/pw-browsers/chromium');
const browser: Browser = await chromium.launch(
  existsSync(preinstalled) ? { executablePath: preinstalled } : {},
);

/** A simulated onscreen keyboard, through the product's own visualViewport path. */
const KEYBOARD_SHIM = `(() => {
  const listeners = new Set();
  const fake = {
    get height() { return window.innerHeight - (window.__simKeyboard ?? 0); },
    get width() { return window.innerWidth; },
    get offsetTop() { return 0; },
    get offsetLeft() { return 0; },
    get scale() { return 1; },
    addEventListener: (t, l) => { listeners.add(l); },
    removeEventListener: (t, l) => { listeners.delete(l); },
  };
  window.__simKeyboard = 0;
  window.__raiseKeyboard = (px) => {
    window.__simKeyboard = px;
    for (const l of listeners) l({ type: 'resize' });
  };
  Object.defineProperty(window, 'visualViewport', { get: () => fake });
})();`;

const errors: string[] = [];
const notes: string[] = [];

async function frames(page: Page, count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await page.evaluate(
      () =>
        new Promise<void>((done) => {
          requestAnimationFrame(() => done());
        }),
    );
  }
}

/**
 * **Reloaded, not navigated**, and the reason is a whole set of missing frames.
 *
 * A `goto` that changes only the hash does not reload the document, so
 * `demoStart()` was never re-read and — worse — the window opened by the
 * previous step was still up with the camera at that agent's station. The next
 * agent's touch target was off screen, `display: none`, so `boundingBox()`
 * returned null, the tap was skipped and **no frame was written at all**, with
 * no error. Four frames were silently absent from the first run.
 */
async function ready(page: Page): Promise<void> {
  await page.reload({ waitUntil: 'load' });
  await page.locator('canvas').waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => '__virgilRoomReady' in window, undefined, { timeout: 180_000 });
  await frames(page, 6);
}

/** Taps a world target through the browser's own mouse, as a thumb would. */
async function tap(page: Page, target: string): Promise<boolean> {
  const box = await page
    .locator(`[data-touch-target="${target}"]`)
    .boundingBox({ timeout: 10_000 })
    .catch(() => null);
  if (!box) {
    errors.push(`no target on screen: ${target}`);
    return false;
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  return true;
}

const VIEWPORTS: [string, number, number, boolean][] = [
  ['p390', 390, 844, true],
  ['p430', 430, 932, true],
  ['l844', 844, 390, false],
];

for (const [name, width, height, portrait] of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.addInitScript(KEYBOARD_SHIM);
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${name}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`${name} uncaught: ${e}`));

  // The world, at the default camera the owner asked for.
  await page.goto(`${fileUrl}#/?demo=30`, { waitUntil: 'load' });
  await ready(page);
  await page.screenshot({ path: `${shots}/${name}-overview.png` });

  // One tap on the Prover's own screen: the window and the camera together.
  if (await tap(page, 'prover-screen')) {
    // Photographed immediately: the window should already be up while the
    // camera is still travelling. This is the frame that shows the owner's
    // decision rather than describing it.
    await page.screenshot({ path: `${shots}/${name}-window-at-the-press.png` });
    await frames(page, 6);
    await page.screenshot({ path: `${shots}/${name}-window-prover.png` });

    // The evidence expanded, which is where the tables and the cards are.
    await page.evaluate(() => {
      for (const node of Array.from(
        document.querySelectorAll<HTMLButtonElement>('.v11w-disclose[aria-expanded="false"]'),
      )) {
        node.click();
      }
    });
    await frames(page, 3);
    await page.screenshot({ path: `${shots}/${name}-window-prover-expanded.png` });

    // The composer, with a simulated keyboard up.
    await page.locator('.v11w-input').click();
    await page.locator('.v11w-input').fill('Why is this candidate not merged?');
    await page.evaluate((px) => {
      (window as { __raiseKeyboard?: (n: number) => void }).__raiseKeyboard?.(px);
    }, 336);
    await frames(page, 3);
    await page.screenshot({ path: `${shots}/${name}-window-keyboard.png` });
    await page.evaluate(() => {
      (window as { __raiseKeyboard?: (n: number) => void }).__raiseKeyboard?.(0);
    });
    await frames(page, 2);

    // One step back: to the station, never snapped home.
    await page.locator('.v11w-back').click();
    await frames(page, 6);
    await page.screenshot({ path: `${shots}/${name}-station-after-back.png` });
    const state = await page.evaluate(
      () => (window as { __virgilV11?: { focus?: string } }).__virgilV11?.focus ?? '(none)',
    );
    notes.push(`${name}: the chevron leaves the reader at ${state}`);

    // And one more step: the overview.
    await page.locator('[data-touch-target="back"]').click();
    await frames(page, 6);
    await page.screenshot({ path: `${shots}/${name}-overview-after-back.png` });
  } else {
    errors.push(`${name}: no Prover screen target to tap`);
  }

  // Virgil's own window, which is the central operating interface.
  await page.goto(`${fileUrl}#/?demo=50`, { waitUntil: 'load' });
  await ready(page);
  if (await tap(page, 'virgil')) {
    await frames(page, 6);
    await page.screenshot({ path: `${shots}/${name}-window-virgil.png` });
  }

  // The Fabricator, mid-build, and the Keeper, reported.
  await page.goto(`${fileUrl}#/?demo=11`, { waitUntil: 'load' });
  await ready(page);
  if (await tap(page, 'fabricator')) {
    await frames(page, 6);
    await page.screenshot({ path: `${shots}/${name}-window-fabricator.png` });
  }
  await page.goto(`${fileUrl}#/?demo=45`, { waitUntil: 'load' });
  await ready(page);
  if (await tap(page, 'keeper')) {
    await frames(page, 6);
    await page.screenshot({ path: `${shots}/${name}-window-keeper.png` });
  }

  void portrait;
  await page.close();
}

// Reduced motion, which is honoured by arriving.
{
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  await page.addInitScript(KEYBOARD_SHIM);
  await page.goto(`${fileUrl}#/?demo=30`, { waitUntil: 'load' });
  await ready(page);
  if (await tap(page, 'prover-screen')) {
    await frames(page, 4);
    await page.screenshot({ path: `${shots}/p390-reduced-motion.png` });
  }
  await page.close();
}

await browser.close();

for (const note of notes) console.log(`capture v11 windows: ${note}`);
console.log(`capture v11 windows: frames in ${shots}`);
console.log(`capture v11 windows: console errors ${errors.length}`);
for (const error of errors) console.log(`capture v11 windows: ${error}`);
console.log(
  'capture v11 windows: SIMULATED viewports, software rendering. Not evidence of how this looks on real graphics hardware; those checks are NOT PERFORMED.',
);
