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
 * Usage: pnpm --filter mission-control capture:v11:screens
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
 * Opens a route and waits for the world, then for the demonstration clock
 * to reach `seconds` of the loop **by seeking on `window.__virgilDemo`**
 * rather than by sleeping a guessed interval: this renderer's wall clock is
 * SwiftShader's and a fixed wait lands on a different beat every run. The
 * key is only read after it exists.
 */
async function open(page: Page, hash: string, seconds?: number) {
  await page.goto(`${fileUrl}${hash}`, { waitUntil: 'load' });
  await page.locator('canvas').waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => '__virgilRoomReady' in window, undefined, { timeout: 240_000 });
  if (seconds === undefined) {
    await page.waitForTimeout(3500);
    return;
  }
  await page.waitForFunction(() => '__virgilDemo' in window, undefined, { timeout: 120_000 });
  await page.waitForFunction(
    (want) =>
      (window as Window & { __virgilDemo?: { seconds: number } }).__virgilDemo!.seconds >= want,
    seconds,
    { timeout: 240_000, polling: 100 },
  );
  // One more beat of frames so the picture the clock reached is drawn.
  await page.waitForTimeout(900);
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
  ['fabricator-working', 'fabricator', 11],
  ['prover-working', 'prover', 26],
  ['keeper-working', 'keeper', 41],
  ['fabricator-standby', 'fabricator', 3],
  ['keeper-standby', 'keeper', 3],
];

const VIEWPORTS: [string, number, number][] = [
  ['p390', 390, 844],
  ['p430', 430, 932],
  ['l844', 844, 390],
];

for (const [name, width, height] of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${name}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`${name} uncaught: ${e}`));

  // The overview, at three moments of the loop, so the displays are seen
  // lit and dark from the distance they are actually seen from.
  for (const seconds of [11, 26, 45]) {
    await open(page, '#/', seconds);
    await page.screenshot({ path: `${shots}/${name}-overview-${seconds}s.png` });
  }

  for (const [label, role, seconds] of CLOSE_UPS) {
    await open(page, `#/?cam=${role}`, seconds);
    await page.screenshot({ path: `${shots}/${name}-${label}.png` });
  }

  // Virgil's three slabs, close.
  await open(page, '#/?cam=board', 45);
  await page.screenshot({ path: `${shots}/${name}-board.png` });
  await open(page, '#/?cam=board&state=blocked');
  await page.screenshot({ path: `${shots}/${name}-board-blocked.png` });
  await open(page, '#/?cam=virgil', 50);
  await page.screenshot({ path: `${shots}/${name}-virgil.png` });
  await page.close();
}

// V10, unchanged, at its own route in the same file: the same two close-ups
// the stage-1 record describes as black, for the comparison.
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`v10: ${m.text()}`);
  });
  for (const role of ['fabricator', 'keeper', 'prover']) {
    await open(page, `#/v10?cam=${role}`, 3);
    await page.screenshot({ path: `${shots}/v10-${role}-standby.png` });
  }
  await open(page, '#/v10?cam=keeper', 41);
  await page.screenshot({ path: `${shots}/v10-keeper-working.png` });
  await open(page, '#/v10', 26);
  await page.screenshot({ path: `${shots}/v10-overview-26s.png` });
  await page.close();
}

await browser.close();
console.log(`capture v11 screens: frames in ${shots}`);
console.log(`capture v11 screens: console errors ${errors.length}`);
for (const error of errors) console.log(`capture v11 screens: ${error}`);
console.log(
  'capture v11 screens: SIMULATED viewports, software rendering. Not evidence of how this looks on real graphics hardware; those checks are NOT PERFORMED.',
);
