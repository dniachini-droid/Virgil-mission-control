/**
 * Builds the window study, serves it, and screenshots every window at every
 * viewport the brief names, plus the states that have to be looked at: the
 * evidence expanded, the composer with a simulated keyboard inset, reduced
 * motion, and a simulated Dynamic Island inset.
 *
 * Synchronous from end to end: the server starts and stops inside this one
 * process, so nothing survives the run.
 *
 * **Simulated viewports in headless Chromium.** No iPhone exists in this
 * environment. Real-device checks are NOT PERFORMED, never met.
 *
 * Usage: node study/capture-windows-v11.mjs [outDir]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const appRoot = resolve(import.meta.dirname, '..');
const repoRoot = resolve(appRoot, '../..');
const outDir = resolve(repoRoot, process.argv[2] ?? 'scratchpad/study-v11-windows');
const dist = join(appRoot, 'dist/study-windows-v11');

console.log('window study: building');
execFileSync('npx', ['vite', 'build', '--config', 'study/vite.windows.config.ts'], {
  cwd: appRoot,
  stdio: 'inherit',
});

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

const server = createServer((request, response) => {
  const path = (request.url ?? '/').split('?')[0];
  if (path === '/favicon.ico') {
    response.writeHead(204);
    response.end();
    return;
  }
  const file = join(dist, path === '/' ? 'study/windows-v11.html' : path);
  if (!existsSync(file)) {
    response.writeHead(404);
    response.end('not found');
    return;
  }
  response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  response.end(readFileSync(file));
});

await new Promise((done) => server.listen(0, '127.0.0.1', done));
const port = server.address().port;
const base = `http://127.0.0.1:${port}/study/windows-v11.html`;
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

/**
 * The simulated keyboard. `visualViewport` is read-only and there is no way to
 * make a headless browser raise an iOS keyboard, so the object itself is
 * substituted before the page loads and its `resize` is dispatched. What is
 * exercised is the product's own code path — `useKeyboardInset` — against an
 * inset of exactly the height an iPhone keyboard takes. **Simulated, and
 * recorded as simulated.**
 */
const KEYBOARD_PX = 336;
const keyboardShim = `(() => {
  const real = window.visualViewport;
  const listeners = new Set();
  const fake = {
    get height() { return window.innerHeight - (window.__simKeyboard ?? 0); },
    get width() { return window.innerWidth; },
    get offsetTop() { return 0; },
    get offsetLeft() { return 0; },
    get pageTop() { return 0; },
    get scale() { return 1; },
    addEventListener: (type, listener) => { listeners.add(listener); },
    removeEventListener: (type, listener) => { listeners.delete(listener); },
  };
  window.__simKeyboard = 0;
  window.__raiseKeyboard = (px) => {
    window.__simKeyboard = px;
    for (const listener of listeners) listener({ type: 'resize' });
  };
  Object.defineProperty(window, 'visualViewport', { get: () => fake });
  void real;
})();`;

const CASES = [
  // Every window, at the beat where it has most to say, at both portrait sizes.
  { name: 'p390-virgil-gate', w: 390, h: 844, q: 'agent=virgil&t=50&loop=0' },
  { name: 'p390-virgil-blocked', w: 390, h: 844, q: 'agent=virgil&t=31&loop=1' },
  { name: 'p390-fabricator-working', w: 390, h: 844, q: 'agent=fabricator&t=11&loop=0' },
  { name: 'p390-fabricator-reported', w: 390, h: 844, q: 'agent=fabricator&t=15&loop=0' },
  { name: 'p390-prover-collapsed', w: 390, h: 844, q: 'agent=prover&t=30&loop=0' },
  { name: 'p390-prover-expanded', w: 390, h: 844, q: 'agent=prover&t=30&loop=0&open=1' },
  { name: 'p390-prover-failed', w: 390, h: 844, q: 'agent=prover&t=31&loop=1&open=1' },
  { name: 'p390-keeper-reported', w: 390, h: 844, q: 'agent=keeper&t=45&loop=0' },
  { name: 'p390-keeper-expanded', w: 390, h: 844, q: 'agent=keeper&t=45&loop=0&open=1' },
  { name: 'p430-virgil-gate', w: 430, h: 932, q: 'agent=virgil&t=50&loop=0' },
  { name: 'p430-prover-expanded', w: 430, h: 932, q: 'agent=prover&t=30&loop=0&open=1' },
  { name: 'l844-virgil', w: 844, h: 390, q: 'agent=virgil&t=50&loop=0&land=1' },
  { name: 'l844-prover', w: 844, h: 390, q: 'agent=prover&t=30&loop=0&land=1' },
  // The Dynamic Island's own inset, simulated at the values a 14 Pro reports.
  { name: 'p390-island-inset', w: 390, h: 844, q: 'agent=fabricator&t=11&loop=0&inset=59' },
  // The whole of each window in one frame, so the evidence level can be looked
  // at rather than guessed at. `tall` releases the sheet's height in the study
  // page only; every measurement above is taken in the real layout.
  {
    name: 'p390-tall-virgil',
    w: 390,
    h: 844,
    q: 'agent=virgil&t=50&loop=0&open=1&tall=1',
    full: true,
  },
  {
    name: 'p390-tall-fabricator',
    w: 390,
    h: 844,
    q: 'agent=fabricator&t=15&loop=0&open=1&tall=1',
    full: true,
  },
  {
    name: 'p390-tall-prover',
    w: 390,
    h: 844,
    q: 'agent=prover&t=31&loop=1&open=1&tall=1',
    full: true,
  },
  {
    name: 'p390-tall-keeper',
    w: 390,
    h: 844,
    q: 'agent=keeper&t=45&loop=0&open=1&tall=1',
    full: true,
  },
];

const notes = [];
const errors = [];

for (const shot of CASES) {
  const page = await browser.newPage({ viewport: { width: shot.w, height: shot.h } });
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${shot.name}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`${shot.name} uncaught: ${e}`));
  await page.addInitScript(keyboardShim);
  await page.goto(`${base}?${shot.q}`, { waitUntil: 'load' });
  await page.locator('.v11w-sheet').waitFor({ timeout: 15_000 });
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${outDir}/${shot.name}.png`, fullPage: shot.full === true });

  // Every pressable thing, measured by its own box.
  const measured = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        '.v11w-sheet button, .v11w-sheet textarea, .v11w-sheet summary, .v11w-sheet [data-touch-target]',
      ),
    ).map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        id:
          node.dataset?.touchTarget ??
          `${node.tagName.toLowerCase()}.${(node.className || '').toString().split(' ')[0]}`,
        w: Math.round(rect.width * 10) / 10,
        h: Math.round(rect.height * 10) / 10,
      };
    }),
  );
  const smallest = measured.reduce(
    (worst, entry) => Math.min(worst, entry.w, entry.h),
    Number.POSITIVE_INFINITY,
  );
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const past = [];
    for (const element of Array.from(document.querySelectorAll('body *'))) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (rect.right > doc.clientWidth + 0.5 || rect.left < -0.5) {
        past.push(
          `${element.tagName.toLowerCase()}.${(element.className || '').toString().split(' ')[0]}@${Math.round(rect.right)}`,
        );
      }
    }
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, past: past.slice(0, 6) };
  });
  notes.push(
    `${shot.name}: ${measured.length} pressables, smallest ${smallest} px; scrollWidth ${overflow.scrollWidth}/${overflow.clientWidth}; past the edge ${overflow.past.length}${overflow.past.length ? ` — ${overflow.past.join(', ')}` : ''}`,
  );
  await page.close();
}

// The composer with the keyboard up, and the section the reader was reading.
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(keyboardShim);
  await page.goto(`${base}?agent=virgil&t=50&loop=0`, { waitUntil: 'load' });
  await page.locator('.v11w-sheet').waitFor({ timeout: 15_000 });
  await page.locator('.v11w-input').click();
  await page.locator('.v11w-input').type('Why is this candidate not merged?');
  await page.evaluate((px) => window.__raiseKeyboard(px), KEYBOARD_PX);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/p390-composer-keyboard.png` });
  const composer = await page.evaluate(() => {
    const input = document.querySelector('.v11w-input').getBoundingClientRect();
    const keep = document.querySelector('.v11w-keep').getBoundingClientRect();
    return {
      inputBottom: Math.round(input.bottom),
      keepBottom: Math.round(keep.bottom),
      visibleBottom: Math.round(window.innerHeight - (window.__simKeyboard ?? 0)),
      note: document.querySelector('.v11w-composer-note').textContent.trim(),
    };
  });
  notes.push(
    `keyboard ${KEYBOARD_PX} px (SIMULATED): composer bottom ${composer.inputBottom}, keep bottom ${composer.keepBottom}, visible bottom ${composer.visibleBottom} — ${composer.inputBottom <= composer.visibleBottom ? 'above the keyboard' : 'UNDER THE KEYBOARD'}`,
  );
  notes.push(`composer note reads: "${composer.note}"`);
  // What was typed, then kept: it is never reported as sent.
  await page.locator('.v11w-keep').click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${outDir}/p390-composer-kept.png` });
  notes.push(
    `after Keep: ${await page.evaluate(() => document.querySelectorAll('.v11w-turn.is-owner').length)} owner turn(s) in the thread, note "${await page.evaluate(() => document.querySelector('.v11w-composer-note').textContent.trim())}"`,
  );
  await page.close();
}

// Reduced motion, which is honoured by arriving.
{
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  await page.addInitScript(keyboardShim);
  await page.goto(`${base}?agent=fabricator&t=11&loop=0`, { waitUntil: 'load' });
  await page.locator('.v11w-sheet').waitFor({ timeout: 15_000 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${outDir}/p390-reduced-motion.png` });
  const still = await page.evaluate(() => {
    const sheet = document.querySelector('.v11w-sheet');
    return {
      opacity: getComputedStyle(sheet).opacity,
      animations: document.getAnimations().filter((a) => a.playState === 'running').length,
    };
  });
  notes.push(
    `reduced motion: sheet opacity ${still.opacity} on the first frame, ${still.animations} running animations`,
  );
  await page.close();
}

await browser.close();
await new Promise((done) => server.close(done));

for (const note of notes) console.log(`window study: ${note}`);
console.log(`window study: console errors ${errors.length}`);
for (const error of errors) console.log(`window study: ${error}`);
console.log(`window study: frames in ${outDir}`);
console.log(
  'window study: SIMULATED viewports in headless Chromium. No real device has been used; the real-device checks are NOT PERFORMED.',
);
