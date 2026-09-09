/**
 * **Stage 2's frames: the four in-world screen families, close up and from
 * the overview, on the built V11 Owner Build.**
 *
 * `capture-v11.ts` is stage 1's and is left exactly as it was so that its
 * frames stay reproducible. This one exists for the question stage 2 has to
 * answer by looking: whether the displays read as refined celestial
 * instrumentation, whether the authored faceplate beds onto the owner's own
 * console geometry without fighting it or floating off it, and whether the
 * black-screen defect stage 1 found in the close-ups is gone.
 *
 * It takes the same close-up of each console **from `#/v10` as well**, in
 * the same file, so the before and the after are one artifact and one run.
 *
 * **Simulated viewports in headless Chromium, rendered in software by
 * SwiftShader.** No iPhone and no GPU exists in this environment. Nothing
 * here is evidence of how the world looks on real graphics hardware;
 * OD-0005 defers those two checks and requires them recorded as not
 * performed, never as met.
 *
 * Usage: pnpm --filter mission-control capture:v11:screens -- p390 consoles
 *        VIRGIL_V11_ROUTE=#/v10 pnpm --filter mission-control capture:v11:screens -- p390 consoles
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
const shots = process.env.VIRGIL_SHOT_DIR ?? resolve(outDir, 'screen-frames');
mkdirSync(shots, { recursive: true });

const preinstalled =
  process.env.CHROMIUM_EXECUTABLE ??
  (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
    : '/opt/pw-browsers/chromium');
const browser: Browser = await chromium.launch(
  existsSync(preinstalled) ? { executablePath: preinstalled } : {},
);

const errors: string[] = [];

/**
 * **The focus is changed through the interface, not by navigating.**
 *
 * The first version of this script called `page.goto(url + '#/?cam=keeper')`
 * on an already-loaded page. A hash-only navigation does not reload, and
 * `initialFocus()` is read once at mount — so every close-up came out as
 * the overview and the first pass of frames was worthless. Reloading for
 * each shot costs about a hundred seconds of SwiftShader warm-up each
 * time, so instead the shot is taken by pressing the same **Look at**
 * button in the hidden development menu that the owner has, which is
 * better evidence anyway: it is the interface being driven.
 */
async function lookAt(page: Page, label: string) {
  await page.locator('[data-touch-target="dev"]').click();
  await page.waitForTimeout(400);
  await page
    .locator('.v11-dev-row', { hasText: 'Look at' })
    .getByRole('button', { name: label, exact: true })
    .click();
  await page.waitForTimeout(300);
  // Closed by the panel's own Close: stage 4's Performance row made the panel
  // tall enough to cover the ⋯ that opens it, so a second click on the entry
  // is intercepted. Addressed by row for the same reason — `Auto` and `All`
  // are no longer unique names across the whole panel.
  await page.locator('.v11-dev-close').click();
  // The camera flies for 0.9 s and the display warms up over 1.5 s.
  await page.waitForTimeout(3200);
}

/**
 * Waits until the demonstration's own clock is **inside** the span
 * `[seconds, seconds + span)` of its loop.
 *
 * The first version waited for `seconds >= want` and returned at once
 * whenever the clock was already past — so a shot meant for the
 * Fabricator's working beat at 11 s was taken at 30 s, where the
 * Fabricator is idle, and the frame showed STANDBY when it should have
 * shown BUILDING. The loop comes round, so waiting for the window costs at
 * most one loop and is right every time.
 */
async function seek(page: Page, seconds: number, span = 4) {
  await page.waitForFunction(() => '__virgilDemo' in window, undefined, { timeout: 120_000 });
  await page.waitForFunction(
    (range: { from: number; to: number }) => {
      const demo = (window as Window & { __virgilDemo?: { seconds: number } }).__virgilDemo;
      return demo !== undefined && demo.seconds >= range.from && demo.seconds < range.to;
    },
    { from: seconds, to: seconds + span },
    { timeout: 300_000, polling: 100 },
  );
}

/** Loads the world once, at the overview, and waits for it. */
async function boot(page: Page, hash: string) {
  await page.goto(`${fileUrl}${hash}`, { waitUntil: 'load' });
  await page.locator('canvas').waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => '__virgilRoomReady' in window, undefined, { timeout: 300_000 });
  await page.waitForTimeout(2500);
}

/**
 * Which moment of the demonstration each console is doing its own work at
 * (`world/room/demo.ts`'s `BEATS`): the Fabricator builds from 8 s, the
 * Prover verifies from 23 s, the Keeper reviews from 38 s of the passing
 * loop. Taken at those seconds, each close-up shows that agent working
 * rather than idle — and the ones taken at 3 s show the same console on
 * standby, which is the state the black-screen defect was hiding.
 */
const CLOSE_UPS: [string, string, number][] = [
  ['fabricator-working', 'Fabricator', 9],
  ['prover-working', 'Prover', 24],
  ['keeper-working', 'Keeper', 39],
  ['keeper-standby', 'Keeper', 20],
];

/**
 * Which viewport this run takes. One viewport per invocation, so a run
 * finishes inside a foreground timeout instead of being pushed into the
 * background — where, as this project has learnt five times, it dies with
 * the turn.
 */
const VIEWPORTS: Record<string, [number, number]> = {
  p390: [390, 844],
  p430: [430, 932],
  l844: [844, 390],
};
const which = process.argv[2] ?? 'p390';
const size = VIEWPORTS[which];
if (!size)
  throw new Error(`unknown viewport ${which}; one of ${Object.keys(VIEWPORTS).join(', ')}`);
const [width, height] = size;

if (which === 'v10') {
  // Not reached: `v10` is handled below as its own argument.
}

const page = await browser.newPage({ viewport: { width, height } });
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`${which}: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`${which} uncaught: ${e}`));

const route = process.env.VIRGIL_V11_ROUTE ?? '#/';
const prefix = route === '#/v10' ? `v10-${which}` : which;
/**
 * Which set of shots this run takes. One phase per invocation: this
 * renderer needs about a hundred seconds to reach the first frame and a
 * loop of the demonstration is another fifty, so a run that took every
 * shot ran past ten minutes and had to be pushed into the background —
 * where, as this project has learnt five times, it dies with the turn.
 */
const phase = process.argv[3] ?? 'consoles';
await boot(page, route);

if (phase === 'overview') {
  // The overview, at three moments, from the distance the displays are
  // actually seen from: the Fabricator building, the Prover verifying, the
  // Keeper reviewing.
  for (const seconds of [11, 26, 41]) {
    await seek(page, seconds);
    await page.screenshot({ path: `${shots}/${prefix}-overview-${seconds}s.png` });
  }
} else if (phase === 'consoles') {
  for (const [label, look, seconds] of CLOSE_UPS) {
    await seek(page, seconds);
    await lookAt(page, look);
    await page.screenshot({ path: `${shots}/${prefix}-${label}.png` });
    await lookAt(page, 'All');
  }
} else if (phase === 'board') {
  await seek(page, 45, 8);
  await lookAt(page, 'Board');
  await page.screenshot({ path: `${shots}/${prefix}-board.png` });
  await lookAt(page, 'All');
  await seek(page, 50, 5);
  await lookAt(page, 'Board');
  await page.screenshot({ path: `${shots}/${prefix}-board-gate.png` });
  await lookAt(page, 'All');
  await seek(page, 30, 4);
  await lookAt(page, 'Virgil');
  await page.screenshot({ path: `${shots}/${prefix}-virgil.png` });
} else {
  throw new Error(`unknown phase ${phase}; one of overview, consoles, board`);
}
await page.close();

await browser.close();
console.log(`capture v11 screens: ${prefix} ${phase} frames in ${shots}`);
console.log(`capture v11 screens: console errors ${errors.length}`);
for (const error of errors) console.log(`capture v11 screens: ${error}`);
console.log(
  'capture v11 screens: SIMULATED viewport, software rendering. Not evidence of how this looks on real graphics hardware; those checks are NOT PERFORMED.',
);
