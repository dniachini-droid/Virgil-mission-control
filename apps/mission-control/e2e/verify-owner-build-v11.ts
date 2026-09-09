/**
 * Verifies the **V11** Owner Build artifact the way the owner will meet it:
 * opened from a `file://` URL, with no server and no network — and, because
 * V11 is the iPhone-first pass, at a simulated iPhone viewport as well as a
 * desktop one.
 *
 * A sibling of `verify-owner-build.ts`, not a replacement: that script still
 * verifies V10 and is untouched. This one adds the checks stage 1 of the V11
 * brief exists to make falsifiable, and every one of them is a **measurement**
 * rather than a reading of the source:
 *
 *  - no horizontal overflow at 390, 430 and a landscape mobile width;
 *  - every principal touch target measures at least 44 x 44 CSS px, by its own
 *    `getBoundingClientRect()`;
 *  - the gesture guard still refuses a drag and still accepts a tap, driven
 *    through the CDP mouse rather than asserted from the code;
 *  - V10's world still loads, unchanged, at V11's `#/v10` route.
 *
 * **Every iPhone figure here is a simulated viewport in headless Chromium.**
 * No iPhone exists in this environment. Real-device checks are recorded as
 * NOT PERFORMED, never as met (`docs/process/V11_BRIEF.md`, caution 3;
 * `docs/decisions/OD-0005-phase-1-visual-checks-and-reference.md`).
 *
 * Rendering here is software (SwiftShader) and proves nothing about how the
 * world looks; see docs/process/PHASE_0_RUN_RECORD.md.
 *
 * Usage: pnpm --filter mission-control build:owner:v11 &&
 *        pnpm --filter mission-control verify:owner:v11
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
const file = resolve(outDir, built[0] as string);
const fileUrl = pathToFileURL(file).href;

/** The minimum a thumb hits reliably. Apple's own figure, and the brief's. */
const MIN_TOUCH_PX = 44;

/**
 * The simulated viewports. **Simulated**: these are CSS pixel sizes given to a
 * headless Chromium, not devices. The two portrait widths are the ones the
 * brief names; the landscape one is an iPhone held sideways.
 */
const VIEWPORTS = [
  { name: 'portrait-390', width: 390, height: 844, portrait: true },
  { name: 'portrait-430', width: 430, height: 932, portrait: true },
  { name: 'landscape-844', width: 844, height: 390, portrait: false },
] as const;

const consoleErrors: string[] = [];
const consoleWarnings: string[] = [];
const pageErrors: string[] = [];
const requests: string[] = [];

const preinstalled =
  process.env.CHROMIUM_EXECUTABLE ??
  (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
    : '/opt/pw-browsers/chromium');
const substituted = existsSync(preinstalled);
const browser = await chromium.launch(substituted ? { executablePath: preinstalled } : {});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
  if (m.type() === 'warning') consoleWarnings.push(m.text());
});
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('request', (r) => requests.push(r.url()));

async function waitForWorld(p: Page): Promise<void> {
  await p.locator('canvas').waitFor({ timeout: 30_000 });
  await p.waitForFunction(() => '__virgilRoomReady' in window, undefined, { timeout: 180_000 });
  await p.waitForTimeout(1200);
}

const failures: string[] = [];
const notes: string[] = [];

// ---------------------------------------------------------------- the routes
const visited: string[] = [];
for (const route of ['', '#/v10', '#/s1', '#/spike/foundry', '#/spike/mind']) {
  await page.goto(`${fileUrl}${route}`, { waitUntil: 'load' });
  if (route === '' || route === '#/v10') {
    await waitForWorld(page);
  } else if (route === '#/s1') {
    await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 15_000 });
  } else {
    await page.locator('canvas').waitFor({ timeout: 30_000 });
    await page.waitForFunction(() => '__virgilRenderer' in window, undefined, { timeout: 30_000 });
  }
  await page.waitForTimeout(800);
  visited.push(route === '' ? '(V11 world)' : route);
}

// V10's own world, inside V11's build, still carrying its own chrome. The
// preservation contract's compare-in-one-file requirement.
await page.goto(`${fileUrl}#/v10`, { waitUntil: 'load' });
await waitForWorld(page);
const v10Chrome = await page.evaluate(() => ({
  controls: document.querySelectorAll('.room-controls').length,
  lookAt: document.querySelectorAll('.room-controls button').length,
  badge: document.querySelectorAll('.room-demo-badge').length,
  footer: document.querySelectorAll('.owner-footer').length,
  v11Chrome: document.querySelectorAll('.v11-stage, .v11-dev-menu, .v11-badge').length,
}));
if (v10Chrome.controls !== 1) failures.push(`#/v10 has ${v10Chrome.controls} V10 control bars`);
if (v10Chrome.badge !== 1) failures.push(`#/v10 has ${v10Chrome.badge} V10 demo badges`);
if (v10Chrome.footer !== 1) failures.push(`#/v10 has ${v10Chrome.footer} provenance footers`);
if (v10Chrome.v11Chrome !== 0) failures.push(`#/v10 is carrying ${v10Chrome.v11Chrome} V11 nodes`);
notes.push(
  `#/v10 unchanged: ${v10Chrome.controls} control bar, ${v10Chrome.lookAt} buttons, ${v10Chrome.badge} badge, ${v10Chrome.footer} footer, ${v10Chrome.v11Chrome} V11 nodes`,
);

// ------------------------------------------------- the simulated iPhone runs
for (const viewport of VIEWPORTS) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(`${fileUrl}#/`, { waitUntil: 'load' });
  await waitForWorld(page);

  // 1. No horizontal overflow, at the document and at every element.
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const widest: { tag: string; right: number }[] = [];
    for (const element of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (rect.right > doc.clientWidth + 0.5 || rect.left < -0.5) {
        widest.push({
          tag: `${element.tagName.toLowerCase()}.${element.className || '(none)'}`,
          right: Math.round(rect.right),
        });
      }
    }
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      offenders: widest.slice(0, 8),
    };
  });
  if (overflow.scrollWidth > overflow.clientWidth) {
    failures.push(
      `${viewport.name}: document scrollWidth ${overflow.scrollWidth} > clientWidth ${overflow.clientWidth}`,
    );
  }
  if (overflow.offenders.length > 0) {
    failures.push(
      `${viewport.name}: ${overflow.offenders.length} element(s) outside the viewport — ${overflow.offenders
        .map((o) => `${o.tag}@${o.right}`)
        .join(', ')}`,
    );
  }
  notes.push(
    `${viewport.name}: scrollWidth ${overflow.scrollWidth} / clientWidth ${overflow.clientWidth}, 0 elements past the edge`,
  );

  // 2. Every principal touch target, measured.
  const targets = await page.evaluate((min) => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-touch-target]'));
    return nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        id: node.dataset.touchTarget ?? '(unnamed)',
        w: Math.round(rect.width * 10) / 10,
        h: Math.round(rect.height * 10) / 10,
        onScreen:
          rect.right > 0 &&
          rect.left < window.innerWidth &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight,
        ok: rect.width >= min && rect.height >= min,
      };
    });
  }, MIN_TOUCH_PX);
  if (targets.length === 0) failures.push(`${viewport.name}: no [data-touch-target] found at all`);
  for (const t of targets) {
    if (!t.ok) failures.push(`${viewport.name}: target ${t.id} measures ${t.w} x ${t.h}`);
  }
  const offScreen = targets.filter((t) => !t.onScreen).map((t) => t.id);
  if (offScreen.length > 0) {
    failures.push(`${viewport.name}: target(s) off screen — ${offScreen.join(', ')}`);
  }
  notes.push(
    `${viewport.name}: ${targets.length} touch targets, smallest ${Math.min(
      ...targets.map((t) => Math.min(t.w, t.h)),
    )} px — ${targets.map((t) => `${t.id} ${t.w}x${t.h}`).join(', ')}`,
  );

  // 3. The gesture guard, driven rather than read. A drag across a target
  //    opens nothing; a tap on the same target opens.
  const virgil = await page.locator('[data-touch-target="virgil"]').boundingBox();
  if (!virgil) {
    failures.push(`${viewport.name}: no Virgil target to drive the gesture guard against`);
  } else {
    const cx = virgil.x + virgil.width / 2;
    const cy = virgil.y + virgil.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let step = 1; step <= 12; step += 1) {
      await page.mouse.move(cx + step * 9, cy + step * 3);
      await page.waitForTimeout(12);
    }
    await page.mouse.up();
    await page.waitForTimeout(2200);
    const afterDrag = await page.evaluate(() => ({
      panel: document.querySelectorAll('.panel-root').length,
      focus: (window as { __virgilV11?: { focus?: string } }).__virgilV11?.focus ?? '(none)',
    }));
    if (afterDrag.panel !== 0) {
      failures.push(`${viewport.name}: a 110 px drag across the Virgil target opened a panel`);
    }
    notes.push(
      `${viewport.name}: drag across Virgil — panels ${afterDrag.panel}, focus ${afterDrag.focus}`,
    );

    // Back to the overview before the tap, whatever the drag left behind.
    await page.evaluate(() => (window as { __virgilV11Reset?: () => void }).__virgilV11Reset?.());
    await page.waitForTimeout(1400);

    const virgilAgain = await page.locator('[data-touch-target="virgil"]').boundingBox();
    const tx = (virgilAgain ?? virgil).x + (virgilAgain ?? virgil).width / 2;
    const ty = (virgilAgain ?? virgil).y + (virgilAgain ?? virgil).height / 2;
    await page.mouse.move(tx, ty);
    await page.mouse.down();
    await page.mouse.up();
    // The transition is deliberate and the interface follows it, so the wait
    // has to outlast the flight.
    await page.waitForTimeout(3000);
    const afterTap = await page.evaluate(() => ({
      panel: document.querySelectorAll('.panel-root').length,
      focus: (window as { __virgilV11?: { focus?: string } }).__virgilV11?.focus ?? '(none)',
    }));
    if (afterTap.panel !== 1) {
      failures.push(
        `${viewport.name}: a tap on the Virgil target opened ${afterTap.panel} panels, expected 1`,
      );
    }
    if (afterTap.focus !== 'virgil') {
      failures.push(`${viewport.name}: a tap left the focus at ${afterTap.focus}, expected virgil`);
    }
    notes.push(
      `${viewport.name}: tap on Virgil — panels ${afterTap.panel}, focus ${afterTap.focus}`,
    );

    // 4. The way back to the overview exists and works.
    const back = page.locator('[data-touch-target="back"]');
    const backBox = await back.boundingBox();
    if (!backBox) {
      failures.push(`${viewport.name}: no way back to the overview is on screen`);
    } else {
      if (backBox.width < MIN_TOUCH_PX || backBox.height < MIN_TOUCH_PX) {
        failures.push(
          `${viewport.name}: the back target measures ${Math.round(backBox.width)} x ${Math.round(backBox.height)}`,
        );
      }
      await page.mouse.move(backBox.x + backBox.width / 2, backBox.y + backBox.height / 2);
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForTimeout(1600);
      const afterBack = await page.evaluate(() => ({
        panel: document.querySelectorAll('.panel-root').length,
        focus: (window as { __virgilV11?: { focus?: string } }).__virgilV11?.focus ?? '(none)',
      }));
      if (afterBack.panel !== 0 || afterBack.focus !== 'all') {
        failures.push(
          `${viewport.name}: back left panels ${afterBack.panel} and focus ${afterBack.focus}`,
        );
      }
      notes.push(
        `${viewport.name}: back — panels ${afterBack.panel}, focus ${afterBack.focus}, ${Math.round(backBox.width)} x ${Math.round(backBox.height)}`,
      );
    }
  }

  // 5. The development chrome is out of the ordinary experience, and the
  //    version marker is still reachable in it.
  const chrome = await page.evaluate(() => {
    const visible = (selector: string) => {
      const node = document.querySelector<HTMLElement>(selector);
      if (!node) return false;
      const style = getComputedStyle(node);
      return (
        style.display !== 'none' && style.visibility !== 'hidden' && node.offsetParent !== null
      );
    };
    return {
      devMenuOpen: visible('.v11-dev-panel'),
      devButton: document.querySelectorAll('[data-touch-target="dev"]').length,
      marker: document.querySelector('.v11-marker')?.textContent?.trim() ?? '(none)',
      badge: document.querySelector('.v11-badge')?.textContent?.trim() ?? '(none)',
    };
  });
  if (chrome.devMenuOpen)
    failures.push(`${viewport.name}: the development menu is open by default`);
  if (chrome.devButton !== 1) {
    failures.push(`${viewport.name}: ${chrome.devButton} ways into the development menu`);
  }
  if (chrome.marker === '(none)') failures.push(`${viewport.name}: no version marker is reachable`);
  if (!/demo data/i.test(chrome.badge)) {
    failures.push(`${viewport.name}: the demo badge reads "${chrome.badge}"`);
  }
  notes.push(`${viewport.name}: marker "${chrome.marker}", badge "${chrome.badge}"`);
}

const renderer = await page.evaluate(
  () => (window as { __virgilRenderer?: string }).__virgilRenderer,
);
const offDocument = requests.filter((url) => url.split('#')[0] !== fileUrl);
const browserBuild = `${browser.browserType().name()} ${browser.version()}`;
const browserPath = substituted ? preinstalled : (chromium.executablePath() ?? '(default)');

await browser.close();

console.log(`owner build v11 verify: file ${file}`);
console.log(
  `owner build v11 verify: browser ${browserBuild} — ${browserPath}${substituted ? ' (preinstalled, substituted for the pinned build)' : ' (as pinned by the lockfile)'}`,
);
console.log(`owner build v11 verify: routes ${visited.join(', ')}`);
console.log(
  `owner build v11 verify: requests ${requests.length}, off-document ${offDocument.length}`,
);
console.log(`owner build v11 verify: renderer ${renderer ?? '(none)'}`);
for (const note of notes) console.log(`owner build v11 verify: ${note}`);
console.log(`owner build v11 verify: console errors ${consoleErrors.length}`);
for (const warning of consoleWarnings)
  console.log(`owner build v11 verify: console warning — ${warning}`);
console.log(
  'owner build v11 verify: SIMULATED viewports in headless Chromium. No iPhone exists in this environment; real-device checks are NOT PERFORMED, never met.',
);

if (consoleErrors.length > 0) failures.push(`console: ${consoleErrors.join(' | ')}`);
if (pageErrors.length > 0) failures.push(`uncaught: ${pageErrors.join(' | ')}`);
if (offDocument.length > 0) failures.push(`off-document requests: ${offDocument.join(' | ')}`);
if (failures.length > 0) {
  console.error(`owner build v11 verify: FAILED\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(
  'owner build v11 verify: PASS — opens from file://, no console errors, no off-document requests, no horizontal overflow, every touch target at least 44 x 44, the gesture guard holds, V10 still loads at #/v10',
);
