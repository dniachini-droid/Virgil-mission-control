/**
 * Verifies the Owner Build artifact the way the owner will meet it: opened from
 * a `file://` URL, with no server and no network.
 *
 * It is the check stage S1 exists to run. A claim that the file opens is worth
 * nothing without it, so this script fails loudly on a console error, an
 * uncaught exception, a missing canvas, or any request that is not the document
 * itself.
 *
 * Rendering here is software (SwiftShader) and proves nothing about how the
 * world looks; see docs/process/PHASE_0_RUN_RECORD.md.
 *
 * Usage: pnpm --filter mission-control build:owner && pnpm --filter mission-control verify:owner
 */
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const outDir = resolve(import.meta.dirname, '../dist/owner-build');
const built = readdirSync(outDir).filter((n) => n.startsWith('virgil-') && n.endsWith('.html'));
if (built.length !== 1) {
  throw new Error(`expected exactly one built Owner Build in ${outDir}, found ${built.length}`);
}
const file = resolve(outDir, built[0] as string);
const fileUrl = pathToFileURL(file).href;

const consoleErrors: string[] = [];
const consoleWarnings: string[] = [];
const pageErrors: string[] = [];
const requests: string[] = [];

// This container ships a Chromium whose build number can lag the pinned
// @playwright/test. Point Playwright at the installed binary rather than
// downloading one, per the environment's own instruction.
const preinstalled = process.env.CHROMIUM_EXECUTABLE ?? '/opt/pw-browsers/chromium';
const browser = await chromium.launch(
  existsSync(preinstalled) ? { executablePath: preinstalled } : {},
);
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
  // Warnings are reported, not failed on: the three.js deprecation notice comes
  // from the unchanged Phase 0 spike, and the ReadPixels stalls are this
  // container's software renderer talking. Both are printed so a reviewer sees
  // exactly what the run produced.
  if (m.type() === 'warning') consoleWarnings.push(m.text());
});
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('request', (r) => requests.push(r.url()));

const visited: string[] = [];
for (const route of ['', '#/s1', '#/spike/foundry', '#/spike/mind']) {
  await page.goto(`${fileUrl}${route}`, { waitUntil: 'load' });
  if (route === '') {
    // The room: wait until all three models and the window layers have
    // decoded and a frame has drawn, not merely until a canvas exists.
    await page.locator('canvas').waitFor({ timeout: 30_000 });
    await page.waitForFunction(() => '__virgilRoomReady' in window, undefined, {
      timeout: 120_000,
    });
  } else if (route === '#/s1') {
    await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 15_000 });
  } else {
    await page.locator('canvas').waitFor({ timeout: 30_000 });
    await page.waitForFunction(() => '__virgilRenderer' in window, undefined, { timeout: 30_000 });
  }
  await page.waitForTimeout(1500);
  visited.push(route === '' ? '(room)' : route);
}

const footer = (await page.locator('.owner-footer').first().innerText()).replace(/\s+/g, ' ');
const renderer = await page.evaluate(
  () => (window as { __virgilRenderer?: string }).__virgilRenderer,
);
const offDocument = requests.filter((url) => url.split('#')[0] !== fileUrl);

await browser.close();

console.log(`owner build verify: file ${file}`);
console.log(`owner build verify: routes ${visited.join(', ')}`);
console.log(`owner build verify: requests ${requests.length}, off-document ${offDocument.length}`);
console.log(`owner build verify: renderer ${renderer ?? '(none)'}`);
console.log(`owner build verify: footer ${footer}`);
console.log(`owner build verify: console errors ${consoleErrors.length}`);
for (const warning of consoleWarnings)
  console.log(`owner build verify: console warning — ${warning}`);

const failures: string[] = [];
if (consoleErrors.length > 0) failures.push(`console: ${consoleErrors.join(' | ')}`);
if (pageErrors.length > 0) failures.push(`uncaught: ${pageErrors.join(' | ')}`);
if (offDocument.length > 0) failures.push(`off-document requests: ${offDocument.join(' | ')}`);
if (failures.length > 0) {
  console.error(`owner build verify: FAILED\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(
  'owner build verify: PASS — opens from file://, no console errors, no off-document requests',
);
