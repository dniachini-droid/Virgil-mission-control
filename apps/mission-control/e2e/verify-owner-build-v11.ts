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

  // 3. The interface, driven rather than read. The order matters: the tap is
  //    taken first, from a page that has just mounted and whose camera is at
  //    rest, and the drag afterwards from the settled overview. The gesture
  //    guard compares the camera at the press with the camera at the release,
  //    so a test that presses while the view is still easing measures the
  //    easing and not the rule — recorded in V10's own run record as a real
  //    behaviour of this software renderer, not a flaw in the test.
  const state = () =>
    page.evaluate(() => ({
      panel: document.querySelectorAll('.panel-root').length,
      focus: (window as { __virgilV11?: { focus?: string } }).__virgilV11?.focus ?? '(none)',
    }));
  const settle = async () => {
    await page.evaluate(() => (window as { __virgilV11Reset?: () => void }).__virgilV11Reset?.());
    await page.waitForTimeout(2600);
  };
  const press = async (x: number, y: number) => {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.up();
  };

  const virgil = await page
    .locator('[data-touch-target="virgil"]')
    .boundingBox({ timeout: 10_000 })
    .catch(() => null);
  if (!virgil) {
    failures.push(`${viewport.name}: no Virgil target to drive the gesture guard against`);
  } else {
    const cx = virgil.x + virgil.width / 2;
    const cy = virgil.y + virgil.height / 2;

    // 3a. A tap opens — after the deliberate transition, not with it.
    await press(cx, cy);
    const midFlight = await state();
    await page.waitForTimeout(3200);
    const afterTap = await state();
    if (afterTap.panel !== 1) {
      failures.push(
        `${viewport.name}: a tap on the Virgil target opened ${afterTap.panel} panels, expected 1`,
      );
    }
    if (afterTap.focus !== 'virgil') {
      failures.push(`${viewport.name}: a tap left the focus at ${afterTap.focus}, expected virgil`);
    }
    if (midFlight.panel !== 0) {
      failures.push(`${viewport.name}: the record opened before the camera moved`);
    }
    notes.push(
      `${viewport.name}: tap on Virgil — the camera goes first (panels ${midFlight.panel} at the press), then the record (panels ${afterTap.panel}, focus ${afterTap.focus})`,
    );

    // 3b. The record's own dismissal leaves the reader at the station, as the
    //     owner decided at V9. Measured here because in portrait the panel is a
    //     full-screen sheet and its control is the only thing on top of it.
    const escBox = await page
      .locator('.panel-back')
      .boundingBox({ timeout: 10_000 })
      .catch(() => null);
    if (!escBox) {
      failures.push(`${viewport.name}: the record has no dismissal control`);
    } else {
      if (escBox.width < MIN_TOUCH_PX || escBox.height < MIN_TOUCH_PX) {
        failures.push(
          `${viewport.name}: the record's dismissal measures ${Math.round(escBox.width)} x ${Math.round(escBox.height)}`,
        );
      }
      await press(escBox.x + escBox.width / 2, escBox.y + escBox.height / 2);
      await page.waitForTimeout(1200);
      const afterEsc = await state();
      if (afterEsc.panel !== 0) {
        failures.push(`${viewport.name}: the record's dismissal left ${afterEsc.panel} panels`);
      }
      if (afterEsc.focus !== 'virgil') {
        failures.push(
          `${viewport.name}: dismissing the record moved the camera to ${afterEsc.focus}; it should leave the reader at the station`,
        );
      }
      notes.push(
        `${viewport.name}: record dismissed — panels ${afterEsc.panel}, still at ${afterEsc.focus}, control ${Math.round(escBox.width)} x ${Math.round(escBox.height)} px`,
      );
    }

    // 3c. The way back to the overview exists, is a thumb wide, and works.
    const backBox = await page
      .locator('[data-touch-target="back"]')
      .boundingBox({ timeout: 10_000 })
      .catch(() => null);
    if (!backBox) {
      failures.push(`${viewport.name}: no way back to the overview is on screen`);
    } else {
      if (backBox.width < MIN_TOUCH_PX || backBox.height < MIN_TOUCH_PX) {
        failures.push(
          `${viewport.name}: the back target measures ${Math.round(backBox.width)} x ${Math.round(backBox.height)}`,
        );
      }
      await press(backBox.x + backBox.width / 2, backBox.y + backBox.height / 2);
      await page.waitForTimeout(1800);
      const afterBack = await state();
      if (afterBack.panel !== 0 || afterBack.focus !== 'all') {
        failures.push(
          `${viewport.name}: back left panels ${afterBack.panel} and focus ${afterBack.focus}`,
        );
      }
      notes.push(
        `${viewport.name}: back — panels ${afterBack.panel}, focus ${afterBack.focus}, ${Math.round(backBox.width)} x ${Math.round(backBox.height)} px`,
      );
    }

    // 3d. And a drag across the same target opens nothing. The owner’s own
    //     defect: "when I'm trying to scroll and move the camera or zoom in, a
    //     window opens."
    await settle();
    const again = await page
      .locator('[data-touch-target="virgil"]')
      .boundingBox({ timeout: 10_000 })
      .catch(() => null);
    const dx = (again ?? virgil).x + (again ?? virgil).width / 2;
    const dy = (again ?? virgil).y + (again ?? virgil).height / 2;
    await page.mouse.move(dx, dy);
    await page.mouse.down();
    for (let step = 1; step <= 12; step += 1) {
      await page.mouse.move(dx + step * 9, dy + step * 3);
      await page.waitForTimeout(12);
    }
    await page.mouse.up();
    await page.waitForTimeout(2600);
    const afterDrag = await state();
    if (afterDrag.panel !== 0) {
      failures.push(`${viewport.name}: a 114 px drag across the Virgil target opened a panel`);
    }
    if (afterDrag.focus !== 'all') {
      failures.push(`${viewport.name}: a drag moved the focus to ${afterDrag.focus}`);
    }
    notes.push(
      `${viewport.name}: 114 px drag across Virgil — panels ${afterDrag.panel}, focus ${afterDrag.focus}`,
    );
    await settle();
  }

  // 5. The development chrome is out of the ordinary experience, and the
  //    version marker is still reachable in it.
  // No inner named helper here: `tsx` compiles one into an `__name()` call that
  // does not exist inside the page, and the evaluate fails at runtime.
  const chrome = await page.evaluate(() => ({
    devMenuOpen: document.querySelectorAll('.v11-dev-panel').length,
    devButton: document.querySelectorAll('[data-touch-target="dev"]').length,
    marker: document.querySelector('.v11-marker')?.textContent?.trim() ?? '(none)',
    badge: document.querySelector('.v11-badge')?.textContent?.trim() ?? '(none)',
    devEntryPressed: document.querySelector('.v11-dev-entry')?.getAttribute('aria-expanded'),
  }));
  if (chrome.devMenuOpen !== 0) {
    failures.push(`${viewport.name}: the development menu is open by default`);
  }
  if (chrome.devButton !== 1) {
    failures.push(`${viewport.name}: ${chrome.devButton} ways into the development menu`);
  }
  if (chrome.devEntryPressed !== 'false') {
    failures.push(
      `${viewport.name}: the development entry reports aria-expanded ${chrome.devEntryPressed}`,
    );
  }
  if (chrome.marker === '(none)') failures.push(`${viewport.name}: no version marker is reachable`);
  if (!/demo data/i.test(chrome.badge)) {
    failures.push(`${viewport.name}: the demo badge reads "${chrome.badge}"`);
  }
  // The development chrome V10 put in the owner's face is gone from the
  // ordinary experience: none of its nodes is in the document at all.
  const v10Chrome = await page.evaluate(() => ({
    controls: document.querySelectorAll('.room-controls').length,
    badge: document.querySelectorAll('.room-demo-badge').length,
    footer: document.querySelectorAll('.owner-footer').length,
  }));
  if (v10Chrome.controls + v10Chrome.badge + v10Chrome.footer !== 0) {
    failures.push(
      `${viewport.name}: V10 chrome is still in the ordinary experience — ${v10Chrome.controls} control bars, ${v10Chrome.badge} badges, ${v10Chrome.footer} footers`,
    );
  }
  notes.push(
    `${viewport.name}: marker "${chrome.marker}", badge "${chrome.badge}", V10 chrome nodes ${v10Chrome.controls + v10Chrome.badge + v10Chrome.footer}`,
  );
}

// ------------------------------------------ reduced motion, at the same viewport
//
// The rule the brief asks for and KR-55 is the history of: reduced motion is
// honoured by arriving, never by hiding. With no transition to wait for there
// is nothing to wait for, so the record opens at once rather than after a pause
// that would mean nothing — and the record still opens.
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${fileUrl}#/`, { waitUntil: 'load' });
await waitForWorld(page);
const reducedTarget = await page
  .locator('[data-touch-target="virgil"]')
  .boundingBox({ timeout: 10_000 })
  .catch(() => null);
if (!reducedTarget) {
  failures.push('reduced-motion: no Virgil target');
} else {
  await page.mouse.move(
    reducedTarget.x + reducedTarget.width / 2,
    reducedTarget.y + reducedTarget.height / 2,
  );
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(350);
  const immediate = await page.evaluate(() => ({
    panel: document.querySelectorAll('.panel-root').length,
    focus: (window as { __virgilV11?: { focus?: string } }).__virgilV11?.focus ?? '(none)',
  }));
  if (immediate.panel !== 1) {
    failures.push(
      `reduced-motion: the record took longer than 350 ms to open (${immediate.panel} panels)`,
    );
  }
  notes.push(
    `reduced-motion (portrait 390): the record opens at once — panels ${immediate.panel}, focus ${immediate.focus}`,
  );
}
await page.emulateMedia({ reducedMotion: 'no-preference' });

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
