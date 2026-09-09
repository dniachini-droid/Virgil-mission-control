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
 * **Stage 3 adds the window's own checks**, and inverts one of stage 1's on the
 * owner's instruction:
 *
 *  - **one tap opens the window and moves the camera at the same time.** Stage
 *    1 asserted the opposite — that the record waits out the flight — because
 *    it was built to the brief's stage-1 line. The owner's decision in
 *    `docs/process/PHASE_1_CONVERSATION_INTERFACE.md` §5b governs: *"tapping a
 *    screen opens the panel straight away and takes you there… So you arent
 *    waiting to be taken there first."* So the assertion is turned round rather
 *    than dropped: the window must be **open at the press**, while the camera
 *    is still moving;
 *  - the way back is a chevron in the window's own header and takes one step to
 *    the station, and the station's control takes one more to the overview —
 *    which is stage 1's recorded compromise closed;
 *  - every pressable thing inside the window measures at least 44 x 44, with
 *    the evidence sections closed **and** expanded;
 *  - no horizontal overflow with the window open, at either state;
 *  - the composer stays above a **simulated** onscreen keyboard, through the
 *    product's own `visualViewport` path;
 *  - the conclusion is the first thing in the document and a table is never
 *    the first thing;
 *  - nothing in the window claims to have sent or performed anything.
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
const ALL_VIEWPORTS = [
  { name: 'portrait-390', width: 390, height: 844, portrait: true },
  { name: 'portrait-430', width: 430, height: 932, portrait: true },
  { name: 'landscape-844', width: 844, height: 390, portrait: false },
] as const;

/**
 * **The whole check, or one named part of it — and the difference is visible
 * in the result line.**
 *
 * `pnpm check` sets neither variable and runs everything, which is the only
 * arrangement that prints `PASS`. A single run takes about fifteen minutes in
 * this software renderer, past the ten-minute cap the harness this project is
 * built in imposes on one foreground command, and a background job dies with
 * the turn — so a session can run it as `VIRGIL_V11_VIEWPORTS=portrait-390
 * VIRGIL_V11_TAIL=skip`, then the other two viewports, then
 * `VIRGIL_V11_VIEWPORTS=none` for the tail.
 *
 * **A partial run may never print `PASS`.** It prints `PASS (partial: …)` and
 * names exactly what it did, so no run record can quote a partial run as the
 * whole check by accident.
 */
const WANTED = process.env.VIRGIL_V11_VIEWPORTS?.split(',').map((name) => name.trim());
const VIEWPORTS = WANTED ? ALL_VIEWPORTS.filter((v) => WANTED.includes(v.name)) : ALL_VIEWPORTS;
const RUN_TAIL = process.env.VIRGIL_V11_TAIL !== 'skip';
const PARTIAL = WANTED !== undefined || !RUN_TAIL;

/**
 * **The simulated onscreen keyboard.**
 *
 * `visualViewport` is read-only and no headless browser can raise an iOS
 * keyboard, so the object itself is substituted before the page loads and its
 * `resize` is dispatched on demand. What is exercised is the product's own code
 * path — `useKeyboardInset` in `world/window/AgentWindow.tsx` — against an inset
 * of the height an iPhone keyboard takes.
 *
 * **Simulated, and recorded as simulated.** Whether a real iOS keyboard leaves
 * the composer where this says it does is NOT PERFORMED.
 */
/**
 * Portrait: 336 CSS px, which is what an iPhone keyboard takes with its
 * suggestion strip. Landscape: 180, because a 336 px keyboard in a 390 px-tall
 * viewport leaves 54 px for a whole interface and is not a state any device
 * produces — asserting it would be asserting a fiction.
 */
const KEYBOARD_PX = 336;
const KEYBOARD_LANDSCAPE_PX = 180;
const KEYBOARD_SHIM = `(() => {
  const listeners = new Set();
  const fake = {
    get height() { return window.innerHeight - (window.__simKeyboard ?? 0); },
    get width() { return window.innerWidth; },
    get offsetTop() { return 0; },
    get offsetLeft() { return 0; },
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
})();`;

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
await page.addInitScript(KEYBOARD_SHIM);
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
  if (m.type() === 'warning') consoleWarnings.push(m.text());
});
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('request', (r) => requests.push(r.url()));

/**
 * **Waits for frames, not for an interval.**
 *
 * Every fixed sleep in this file was calibrated against V10's frame rate in
 * this container. Stage 2's six live displays took it from about 1.8 frames
 * a second to about 1.4 — a real regression, reduced as far as reducing
 * invisible work could take it (`screens/v11/resolution.ts`) — and at 1.4
 * fps a 1,200 ms sleep is **under two frames**, so three checks began
 * failing while the behaviour they test was correct: a touch target
 * measured before its first projection, and a panel measured before React
 * had committed its close.
 *
 * The instrument was wrong, not the product, and this is the same fault
 * stage 1 recorded and fixed once already: *"A first attempt asserted the
 * record opens within 350 ms of the press and failed while the code was
 * correct… Timing by the wall clock would make the assertion a property of
 * SwiftShader."* So the sleeps become **frame counts and polled
 * conditions**, which are renderer-independent. **Nothing asserted has been
 * relaxed**: every check still requires exactly what it required — the
 * panel still has to close, the target still has to be on screen — it is
 * only no longer required to happen inside an interval that describes this
 * container's software rasteriser.
 */
async function frames(p: Page, count: number): Promise<void> {
  // One `evaluate` per frame, and no named inner function: `tsx` compiles a
  // named arrow into an `esbuild` `__name(...)` call, which is not defined
  // inside the page and threw `ReferenceError: __name is not defined` the
  // first time this was written as a single self-scheduling callback.
  for (let i = 0; i < count; i += 1) {
    await p.evaluate(
      () =>
        new Promise<void>((done) => {
          requestAnimationFrame(() => done());
        }),
    );
  }
}

async function waitForWorld(p: Page): Promise<void> {
  await p.locator('canvas').waitFor({ timeout: 30_000 });
  await p.waitForFunction(() => '__virgilRoomReady' in window, undefined, { timeout: 180_000 });
  // Four frames: the first projects the touch anchors, the rest let the
  // camera's arrival settle so the gesture guard sees a still view.
  await frames(p, 4);
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
  await frames(page, 2);
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
  /**
   * **Reloaded, not navigated.** A `goto` that changes only the hash does not
   * reload the document, so the window's own memory — drafts, kept turns, which
   * evidence sections were opened — survived from one viewport's run into the
   * next one's. The first pass of this check reported "5 of 5 sections open"
   * with the evidence closed and "2 owner turns" after typing once, and both
   * were the instrument's fault rather than the product's. Each viewport now
   * starts from a fresh document.
   */
  await page.reload({ waitUntil: 'load' });
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
      panel: document.querySelectorAll('.v11w-root').length,
      focus: (window as { __virgilV11?: { focus?: string } }).__virgilV11?.focus ?? '(none)',
      window: (window as { __virgilV11?: { window?: string | null } }).__virgilV11?.window ?? null,
    }));
  const settle = async () => {
    await page.evaluate(() => (window as { __virgilV11Reset?: () => void }).__virgilV11Reset?.());
    await frames(page, 3);
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

    // 3a. **A tap opens the window and moves the camera in the same event.**
    //     The owner's decision, and the inverse of what stage 1 asserted here.
    await press(cx, cy);
    const atPress = await state();
    await frames(page, 3);
    const afterTap = await state();
    if (afterTap.panel !== 1) {
      failures.push(
        `${viewport.name}: a tap on the Virgil target opened ${afterTap.panel} windows, expected 1`,
      );
    }
    if (afterTap.focus !== 'virgil') {
      failures.push(`${viewport.name}: a tap left the focus at ${afterTap.focus}, expected virgil`);
    }
    if (atPress.panel !== 1) {
      failures.push(
        `${viewport.name}: the window was not open at the press — it opened ${atPress.panel} windows, and the owner's decision is that it is up immediately`,
      );
    }
    if (atPress.focus !== 'virgil') {
      failures.push(
        `${viewport.name}: the camera had not begun to move at the press (focus ${atPress.focus})`,
      );
    }
    notes.push(
      `${viewport.name}: tap on Virgil — window and camera together (windows ${atPress.panel}, focus ${atPress.focus} at the press; ${afterTap.window} after)`,
    );

    // 3b. The record's own dismissal leaves the reader at the station, as the
    //     owner decided at V9. Measured here because in portrait the panel is a
    //     full-screen sheet and its control is the only thing on top of it.
    const escBox = await page
      .locator('.v11w-back')
      .boundingBox({ timeout: 10_000 })
      .catch(() => null);
    if (!escBox) {
      failures.push(`${viewport.name}: the window has no back chevron`);
    } else {
      if (escBox.width < MIN_TOUCH_PX || escBox.height < MIN_TOUCH_PX) {
        failures.push(
          `${viewport.name}: the window's back chevron measures ${Math.round(escBox.width)} x ${Math.round(escBox.height)}`,
        );
      }
      await press(escBox.x + escBox.width / 2, escBox.y + escBox.height / 2);
      // Polled, not slept: the panel must close, and how many frames that
      // takes in a software rasteriser is not what this check is about.
      await page
        .waitForFunction(() => document.querySelectorAll('.v11w-root').length === 0, undefined, {
          timeout: 20_000,
          polling: 120,
        })
        .catch(() => undefined);
      const afterEsc = await state();
      if (afterEsc.panel !== 0) {
        failures.push(`${viewport.name}: the back chevron left ${afterEsc.panel} windows open`);
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
      await frames(page, 3);
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
    await frames(page, 3);
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

  // 4. **The window itself**, driven and measured: opened from the world, at
  //    this viewport, with its evidence closed and then expanded.
  const windowMeasure = async (label: string) => {
    const measured = await page.evaluate((min) => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(
          '.v11w-sheet button, .v11w-sheet textarea, .v11w-sheet summary',
        ),
      );
      const doc = document.documentElement;
      const small: string[] = [];
      let smallest = Number.POSITIVE_INFINITY;
      for (const node of nodes) {
        const rect = node.getBoundingClientRect();
        smallest = Math.min(smallest, rect.width, rect.height);
        if (rect.width < min || rect.height < min) {
          small.push(
            `${node.tagName.toLowerCase()}.${(node.className || '(none)').toString().split(' ')[0]} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
          );
        }
      }
      const past: string[] = [];
      for (const element of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        if (rect.right > doc.clientWidth + 0.5 || rect.left < -0.5) {
          past.push(
            `${element.tagName.toLowerCase()}.${(element.className || '(none)').toString().split(' ')[0]}@${Math.round(rect.right)}`,
          );
        }
      }
      // The order the brief requires: the conclusion before any table, and the
      // composer after the suggested actions.
      const body = document.querySelector('.v11w-body');
      const first = body?.firstElementChild?.className ?? '(none)';
      const order = Array.from(document.querySelectorAll('.v11w-sheet *')).reduce(
        (acc: { headline: number; table: number; actions: number; composer: number }, node, i) => {
          const name = (node.className || '').toString();
          if (name.includes('v11w-headline') && acc.headline < 0) acc.headline = i;
          if (node.tagName === 'TABLE' && acc.table < 0) acc.table = i;
          if (name.includes('v11w-actions') && acc.actions < 0) acc.actions = i;
          if (name.includes('v11w-composer') && acc.composer < 0) acc.composer = i;
          return acc;
        },
        { headline: -1, table: -1, actions: -1, composer: -1 },
      );
      return {
        count: nodes.length,
        smallest: Math.round(smallest * 10) / 10,
        small,
        past,
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        first,
        order,
        sections: document.querySelectorAll('.v11w-section').length,
        openSections: document.querySelectorAll('.v11w-disclose[aria-expanded="true"]').length,
        note: document.querySelector('.v11w-composer-note')?.textContent?.trim() ?? '(none)',
        controls: document.querySelectorAll('.v11w-control').length,
        enabledControls: Array.from(
          document.querySelectorAll<HTMLButtonElement>('.v11w-control'),
        ).filter((node) => !node.disabled).length,
        /**
         * **Every word the window puts on screen, and the demo vocabulary it
         * may not contain.** The owner's instruction of 9 September:
         * *"Remove all signs of Demo from the entire system except one small
         * spot."* The one spot is the `Demo data` chip in the overview chrome,
         * which is outside the window. So the whole of the window's text —
         * header, conclusion, every expandable section whether open or shut,
         * every message, the composer and the foot — is read here and matched
         * against the removed vocabulary. Read from the **built artifact** in
         * a browser, which is stronger than a unit test over the content
         * functions: it also catches text that only a stylesheet or a
         * component puts there.
         */
        demoWords: (document.querySelector('.v11w-sheet') as HTMLElement | null)?.innerText
          ? Array.from(
              new Set(
                ((document.querySelector('.v11w-sheet') as HTMLElement).innerText.match(
                  /illustrative|not real state|scripted|demonstration|demo\b/gi,
                ) ?? []) as string[],
              ),
            )
          : [],
        honestyBands: document.querySelectorAll('.v11w-honesty').length,
      };
    }, MIN_TOUCH_PX);
    if (measured.count === 0) {
      failures.push(`${viewport.name} ${label}: the window has no controls at all`);
    }
    for (const entry of measured.small) {
      failures.push(`${viewport.name} ${label}: ${entry} is under ${MIN_TOUCH_PX} px`);
    }
    if (measured.past.length > 0) {
      failures.push(
        `${viewport.name} ${label}: ${measured.past.length} element(s) outside the viewport — ${measured.past.slice(0, 6).join(', ')}`,
      );
    }
    if (measured.scrollWidth > measured.clientWidth) {
      failures.push(
        `${viewport.name} ${label}: document scrollWidth ${measured.scrollWidth} > ${measured.clientWidth}`,
      );
    }
    if (!measured.first.includes('v11w-lead')) {
      failures.push(
        `${viewport.name} ${label}: the first thing in the window is "${measured.first}", not the conclusion`,
      );
    }
    if (
      measured.order.headline < 0 ||
      (measured.order.table >= 0 && measured.order.table < measured.order.headline)
    ) {
      failures.push(`${viewport.name} ${label}: a table comes before the conclusion`);
    }
    if (measured.order.composer < measured.order.actions) {
      failures.push(`${viewport.name} ${label}: the composer comes before the suggested actions`);
    }
    if (measured.enabledControls !== 0) {
      failures.push(
        `${viewport.name} ${label}: ${measured.enabledControls} session control(s) are enabled`,
      );
    }
    if (!/Nothing is sent/.test(measured.note)) {
      failures.push(`${viewport.name} ${label}: the composer's note reads "${measured.note}"`);
    }
    if (measured.demoWords.length > 0) {
      failures.push(
        `${viewport.name} ${label}: the window still says ${measured.demoWords.map((w) => `"${w}"`).join(', ')}`,
      );
    }
    if (measured.honestyBands !== 0) {
      failures.push(
        `${viewport.name} ${label}: ${measured.honestyBands} not-real-state band(s) in the window`,
      );
    }
    notes.push(
      `${viewport.name} ${label}: ${measured.count} controls, smallest ${measured.smallest} px; scrollWidth ${measured.scrollWidth}/${measured.clientWidth}, 0 past the edge; ${measured.openSections} of ${measured.sections} sections open; ${measured.controls} session controls, ${measured.enabledControls} enabled; 0 demo words, 0 not-real-state bands`,
    );
    return measured;
  };

  {
    // The Prover's window, opened through the world by tapping his console's
    // own screen — the same path the reader takes.
    await settle();
    const proverTarget = await page
      .locator('[data-touch-target="prover-screen"]')
      .boundingBox({ timeout: 10_000 })
      .catch(() => null);
    const box = proverTarget;
    if (!box) {
      failures.push(`${viewport.name}: the Prover's screen has no target to open`);
    } else {
      await press(box.x + box.width / 2, box.y + box.height / 2);
      await page
        .waitForFunction(() => document.querySelectorAll('.v11w-sheet').length === 1, undefined, {
          timeout: 20_000,
          polling: 120,
        })
        .catch(() => undefined);
      /**
       * **Where the tap took the camera, whatever it hit.** Two world targets
       * can overlap on a phone and the hit test takes the nearer centre, so at
       * 430 the press near the Prover's screen lands on one of Virgil's slabs
       * instead. That is correct behaviour and the check should not depend on
       * which: what has to hold is that the chevron leaves the reader **here**,
       * at whatever station the tap flew to, and never back at the overview.
       */
      const stationFocus = (await state()).focus;
      if (stationFocus === 'all') {
        failures.push(`${viewport.name}: the tap opened a window without moving the camera`);
      }
      await windowMeasure('window, evidence closed');

      // Expanded: every disclosure opened, which is where the tables, the
      // terminal cards and the diffs are.
      await page.evaluate(() => {
        for (const node of Array.from(
          document.querySelectorAll<HTMLButtonElement>('.v11w-disclose[aria-expanded="false"]'),
        )) {
          node.click();
        }
      });
      await frames(page, 2);
      await windowMeasure('window, evidence expanded');

      // The composer, with the keyboard up. **Simulated**, through the
      // product's own `visualViewport` path.
      await page.locator('.v11w-input').click();
      await page.locator('.v11w-input').fill('Why is this candidate not merged?');
      const keyboardPx = viewport.portrait ? KEYBOARD_PX : KEYBOARD_LANDSCAPE_PX;
      await page.evaluate((px) => {
        (window as { __raiseKeyboard?: (n: number) => void }).__raiseKeyboard?.(px);
      }, keyboardPx);
      await frames(page, 2);
      const composer = await page.evaluate(() => {
        const input = document.querySelector('.v11w-input')?.getBoundingClientRect();
        const keep = document.querySelector('.v11w-keep')?.getBoundingClientRect();
        const hidden = (window as { __simKeyboard?: number }).__simKeyboard ?? 0;
        return {
          inputBottom: Math.round(input?.bottom ?? -1),
          keepBottom: Math.round(keep?.bottom ?? -1),
          visible: Math.round(window.innerHeight - hidden),
          inset: getComputedStyle(
            document.querySelector('.v11w-sheet') as Element,
          ).getPropertyValue('--v11w-kb'),
        };
      });
      if (composer.inputBottom > composer.visible || composer.keepBottom > composer.visible) {
        failures.push(
          `${viewport.name}: with a ${keyboardPx} px keyboard the composer sits at ${composer.inputBottom} and the keyboard starts at ${composer.visible}`,
        );
      }
      notes.push(
        `${viewport.name}: SIMULATED ${keyboardPx} px keyboard — composer bottom ${composer.inputBottom}, keep ${composer.keepBottom}, keyboard starts ${composer.visible}, inset ${composer.inset.trim()}`,
      );

      // What was typed is kept and never reported as sent. Counted as a
      // difference, so nothing a previous step left behind can flatter it.
      const turnsBefore = await page.evaluate(
        () => document.querySelectorAll('.v11w-turn.is-owner').length,
      );
      await page.locator('.v11w-keep').click();
      await frames(page, 2);
      const kept = await page.evaluate(() => ({
        turns: document.querySelectorAll('.v11w-turn.is-owner').length,
        note: document.querySelector('.v11w-composer-note')?.textContent?.trim() ?? '(none)',
      }));
      if (kept.turns - turnsBefore !== 1) {
        failures.push(
          `${viewport.name}: keeping what was typed added ${kept.turns - turnsBefore} turns, expected 1`,
        );
      }
      if (/sent|sending|delivered/i.test(kept.note.replace(/Nothing is sent/gi, ''))) {
        failures.push(`${viewport.name}: the composer claims something was sent — "${kept.note}"`);
      }
      notes.push(
        `${viewport.name}: kept ${kept.turns - turnsBefore} owner turn, note "${kept.note}"`,
      );
      await page.evaluate((px) => {
        (window as { __raiseKeyboard?: (n: number) => void }).__raiseKeyboard?.(px);
      }, 0);

      // **The way back, one step per level.** The chevron goes to the station,
      // and the station's own control goes to the overview: stage 1's recorded
      // compromise — the way home hidden while a record is open — closed.
      const chevron = await page
        .locator('.v11w-back')
        .boundingBox({ timeout: 10_000 })
        .catch(() => null);
      if (!chevron) {
        failures.push(`${viewport.name}: the window has no back chevron`);
      } else {
        await press(chevron.x + chevron.width / 2, chevron.y + chevron.height / 2);
        await page
          .waitForFunction(() => document.querySelectorAll('.v11w-root').length === 0, undefined, {
            timeout: 20_000,
            polling: 120,
          })
          .catch(() => undefined);
        const atStation = await state();
        if (atStation.panel !== 0 || atStation.focus !== stationFocus) {
          failures.push(
            `${viewport.name}: the chevron left ${atStation.panel} windows and the focus at ${atStation.focus}, not the ${stationFocus} the tap flew to; it must leave the reader at the station`,
          );
        }
        const home = await page
          .locator('[data-touch-target="back"]')
          .boundingBox({ timeout: 10_000 })
          .catch(() => null);
        if (!home) {
          failures.push(`${viewport.name}: no way back to the overview at the station`);
        } else {
          await press(home.x + home.width / 2, home.y + home.height / 2);
          await frames(page, 3);
          const atOverview = await state();
          if (atOverview.focus !== 'all') {
            failures.push(
              `${viewport.name}: the second step left the focus at ${atOverview.focus}`,
            );
          }
          notes.push(
            `${viewport.name}: back is one step per level — window → station (${atStation.focus}) → overview (${atOverview.focus})`,
          );
        }
      }
    }
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
  /**
   * **One spot, and one only.** The owner's instruction of 9 September:
   * *"Remove all signs of Demo from the entire system except one small spot -
   * I know its a demo. Im sick of hearing about it."* The one spot is the
   * chip above, with its full sentence behind a press. So the demo vocabulary
   * is counted across the **whole ordinary interface**, with the chip's own
   * dock and the hidden development menu discounted, and anything left is a
   * failure. The count is over elements that carry the words as their own
   * text, so a parent is not counted for its child's words.
   */
  const signage = await page.evaluate(() => {
    const words = /illustrative|not real state|scripted|demonstration|demo\b/i;
    const out: string[] = [];
    for (const node of Array.from(document.querySelectorAll<HTMLElement>('.v11-stage *'))) {
      if (node.closest('.v11-badge-dock') || node.closest('.v11-dev-panel')) continue;
      const own = Array.from(node.childNodes)
        .filter((child) => child.nodeType === 3)
        .map((child) => child.textContent ?? '')
        .join(' ');
      if (words.test(own))
        out.push(`${node.className || node.tagName}: ${own.trim().slice(0, 70)}`);
    }
    return out;
  });
  if (signage.length > 0) {
    failures.push(
      `${viewport.name}: ${signage.length} demo sign(s) outside the one chip — ${signage.slice(0, 4).join(' | ')}`,
    );
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
    `${viewport.name}: marker "${chrome.marker}", badge "${chrome.badge}", V10 chrome nodes ${v10Chrome.controls + v10Chrome.badge + v10Chrome.footer}, demo signs outside the one chip ${signage.length}`,
  );
}

// ------------------------------------------ reduced motion, at the same viewport
//
// The rule the brief asks for and KR-55 is the history of: reduced motion is
// honoured by **arriving**, never by hiding. With no transition to wait for
// there is nothing to wait for, so the record opens in the same render as the
// camera move rather than after a pause that would mean nothing.
//
// **Measured as a gap, not as a clock.** A first attempt asserted that the
// record opens within 350 ms of the press and failed while the product was
// correct: in this container the first `evaluate` after a synthetic press
// returned at 2,518 ms, because the software renderer takes that long to run
// the handler and draw — V10's run record already measured 845 ms from press
// to handler here. Timing by the wall clock would make the assertion a
// property of SwiftShader. So what is measured is the interval between the
// camera moving and the record appearing, which the renderer's latency is
// common to and therefore cancels out of.
if (RUN_TAIL) {
  const tapAndTime = async (x: number, y: number, budgetMs: number) => {
    const startedAt = Date.now();
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.up();
    let movedAt = -1;
    let openedAt = -1;
    while (Date.now() - startedAt < budgetMs) {
      const sample = await page.evaluate(() => ({
        focus: (window as { __virgilV11?: { focus?: string } }).__virgilV11?.focus ?? '(none)',
        panels: document.querySelectorAll('.v11w-root').length,
      }));
      const at = Date.now() - startedAt;
      if (movedAt < 0 && sample.focus !== 'all') movedAt = at;
      if (openedAt < 0 && sample.panels === 1) {
        openedAt = at;
        break;
      }
      await page.waitForTimeout(40);
    }
    return { movedAt, openedAt, gap: openedAt < 0 || movedAt < 0 ? -1 : openedAt - movedAt };
  };

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${fileUrl}#/`, { waitUntil: 'load' });
  await waitForWorld(page);
  const normalTarget = await page
    .locator('[data-touch-target="virgil"]')
    .boundingBox({ timeout: 10_000 })
    .catch(() => null);
  const normal = normalTarget
    ? await tapAndTime(
        normalTarget.x + normalTarget.width / 2,
        normalTarget.y + normalTarget.height / 2,
        12_000,
      )
    : { movedAt: -1, openedAt: -1, gap: -1 };

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${fileUrl}#/`, { waitUntil: 'load' });
  await waitForWorld(page);
  const reducedIsOn = await page.evaluate(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const reducedTarget = await page
    .locator('[data-touch-target="virgil"]')
    .boundingBox({ timeout: 10_000 })
    .catch(() => null);
  const reduced = reducedTarget
    ? await tapAndTime(
        reducedTarget.x + reducedTarget.width / 2,
        reducedTarget.y + reducedTarget.height / 2,
        12_000,
      )
    : { movedAt: -1, openedAt: -1, gap: -1 };

  if (!reducedIsOn) failures.push('reduced-motion: the emulation did not take');
  if (normal.openedAt < 0) failures.push('the record never opened at the default motion setting');
  if (reduced.openedAt < 0) failures.push('reduced-motion: the record never opened');
  /**
   * **What this asserts changed with the owner's decision, and it is stricter.**
   *
   * Stage 1 required the reduced-motion gap to be *smaller* than the default's,
   * because at stage 1 the default deliberately waited 1.02 s for the camera
   * before opening the record. The owner's decision in
   * `docs/process/PHASE_1_CONVERSATION_INTERFACE.md` §5b removes that wait
   * altogether — one tap does both, concurrently — so the thing to require now is
   * that **neither** setting waits: the window appears in the same sample as the
   * camera move, at 40 ms of polling resolution, in both. A regression that
   * reintroduced any delay in either mode fails here.
   */
  if (normal.gap !== 0) {
    failures.push(
      `the window waited ${normal.gap} ms after the camera moved; one tap must do both`,
    );
  }
  if (reduced.gap !== 0) {
    failures.push(`reduced-motion: the window waited ${reduced.gap} ms after the camera moved`);
  }
  notes.push(
    `motion (portrait 390): default — camera at ${normal.movedAt} ms, record at ${normal.openedAt} ms, gap ${normal.gap} ms; reduced — camera at ${reduced.movedAt} ms, record at ${reduced.openedAt} ms, gap ${reduced.gap} ms. Wall-clock figures are this software renderer's, not the product's; the gap is the measurement.`,
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  /**
   * **Stage 4's own checks, driven on the built artifact rather than read off
   * the source.** Four things the brief asks for and one it asks not to happen:
   *
   *  - the world **slows** when a full-screen window is over it;
   *  - the world **stops** when the page is hidden, and starts again when it
   *    comes back;
   *  - the reduced-performance mode is reachable, and — the sentence this whole
   *    stage turns on — **it is not blurrier**: `reduced` draws at exactly the
   *    pixel ratio `full` draws at, and only `minimal` lowers it, never below 1;
   *  - the canvas never asks for more pixels than the tier's budget allows;
   *  - and the functional interface text is **DOM text**: the window's own
   *    headline is a text node in the document, and there is no canvas anywhere
   *    inside the window's subtree.
   */
  const perfNotes: string[] = [];
  const read = () =>
    page.evaluate(
      () =>
        (
          window as {
            __virgilV11?: {
              level: string;
              tier: string;
              loop: string;
              pixelRatioCeiling: number;
              redrawScale: number;
            };
          }
        ).__virgilV11,
    );
  const canvasPixels = () =>
    page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return canvas
        ? {
            device: canvas.width * canvas.height,
            ratio: canvas.width / Math.max(1, canvas.clientWidth),
          }
        : { device: 0, ratio: 0 };
    });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${fileUrl}#/?demo=11&loop=0&hold=1`, { waitUntil: 'load' });
  await page.reload({ waitUntil: 'load' });
  await waitForWorld(page);

  const atRest = await read();
  const restPixels = await canvasPixels();
  if (atRest?.loop !== 'always') {
    failures.push(`performance: the world is "${atRest?.loop}" with nothing over it, not "always"`);
  }
  // The mobile tier's pixel budget, from `world/mobile/performance.ts`.
  if (restPixels.device > 1_600_000) {
    failures.push(
      `performance: the canvas is ${restPixels.device} device pixels, past the mobile budget of 1600000`,
    );
  }
  perfNotes.push(
    `performance: at rest — level ${atRest?.level}, tier ${atRest?.tier}, loop ${atRest?.loop}, ratio ceiling ${atRest?.pixelRatioCeiling}, canvas ${restPixels.device} device px (mobile budget 1600000)`,
  );

  // A window over the world: reduced, not stopped, and the displays halve.
  const virgilTarget = await page
    .locator('[data-touch-target="virgil"]')
    .boundingBox({ timeout: 10_000 })
    .catch(() => null);
  if (virgilTarget) {
    await page.mouse.move(
      virgilTarget.x + virgilTarget.width / 2,
      virgilTarget.y + virgilTarget.height / 2,
    );
    await page.mouse.down();
    await page.mouse.up();
    await frames(page, 3);
  }
  const withWindow = await read();
  if (withWindow?.loop !== 'demand') {
    failures.push(
      `performance: the world is "${withWindow?.loop}" with a window over it, not "demand"`,
    );
  }
  perfNotes.push(`performance: with a window open — loop ${withWindow?.loop}`);

  // The functional interface text is DOM text, measured in the document.
  const windowText = await page.evaluate(() => {
    const root = document.querySelector('.v11w-root');
    if (!root) return { headline: '', chars: 0, canvases: -1 };
    const headline = root.querySelector('h1, h2, .v11w-headline');
    return {
      headline: (headline?.textContent ?? '').trim().slice(0, 80),
      chars: (root.textContent ?? '').trim().length,
      canvases: root.querySelectorAll('canvas').length,
    };
  });
  if (windowText.canvases !== 0) {
    failures.push(
      `window: ${windowText.canvases} canvas element(s) inside the window's own subtree`,
    );
  }
  if (windowText.chars < 200) {
    failures.push(`window: only ${windowText.chars} characters of DOM text in the window`);
  }
  perfNotes.push(
    `window text is DOM text: ${windowText.chars} characters, 0 canvases inside it, headline "${windowText.headline}"`,
  );

  await page.evaluate(() => (window as { __virgilV11Reset?: () => void }).__virgilV11Reset?.());
  await frames(page, 3);

  // Hidden: stopped. `visibilityState` is read-only, so it is substituted and
  // the product's own `visibilitychange` handler is what runs.
  await page.evaluate(() => {
    // **A data property, not a getter.** `tsx` compiles any named function
    // inside an `evaluate` into an `esbuild` `__name(...)` call that does not
    // exist in the page, and an object literal's `get:` is a named function. The
    // first run of this check died on exactly that, which this file already
    // records once for a different helper.
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await frames(page, 2);
  const whenHidden = await read();
  if (whenHidden?.loop !== 'never') {
    failures.push(`performance: the world is "${whenHidden?.loop}" while the page is hidden`);
  }
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await frames(page, 2);
  const whenBack = await read();
  if (whenBack?.loop !== 'always') {
    failures.push(`performance: the world did not resume; it is "${whenBack?.loop}"`);
  }
  perfNotes.push(`performance: hidden → ${whenHidden?.loop}, visible again → ${whenBack?.loop}`);

  /**
   * **The reduced level is not a blurrier level — measured at a device pixel
   * ratio of 3, because at 1 the assertion is vacuous.**
   *
   * A headless page reports `devicePixelRatio` 1, and every ceiling is floored
   * at one device pixel per CSS pixel, so all three levels draw at 1 and the
   * comparison proves nothing. `measure-fps-v11.ts` records the same trap
   * costing it a whole first run of figures. So this opens its own context at
   * `deviceScaleFactor: 3` — the ratio an iPhone reports — where `auto` resolves
   * to 2 and the minimal level's 0.625 of it resolves to 1.25.
   */
  const dpr3 = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });
  const dpr3Page = await dpr3.newPage();
  dpr3Page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`dpr3: ${message.text()}`);
  });
  const levels: Record<
    string,
    { ratio: number; device: number; level: string | undefined; scale: number | undefined }
  > = {};
  for (const level of ['full', 'reduced', 'minimal']) {
    await dpr3Page.goto(`${fileUrl}#/?demo=11&loop=0&hold=1&perf=${level}`, { waitUntil: 'load' });
    await dpr3Page.reload({ waitUntil: 'load' });
    await waitForWorld(dpr3Page);
    await frames(dpr3Page, 4);
    const state = await dpr3Page.evaluate(
      () =>
        (
          window as {
            __virgilV11?: { level: string; pixelRatioCeiling: number; redrawScale: number };
          }
        ).__virgilV11,
    );
    const pixels = await dpr3Page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return canvas
        ? {
            device: canvas.width * canvas.height,
            ratio: canvas.width / Math.max(1, canvas.clientWidth),
          }
        : { device: 0, ratio: 0 };
    });
    levels[level] = {
      ratio: Math.round(pixels.ratio * 100) / 100,
      device: pixels.device,
      level: state?.level,
      scale: state?.redrawScale,
    };
    if (state?.level !== level) {
      failures.push(`performance: #/?perf=${level} produced level "${state?.level}"`);
    }
  }
  const full = levels.full;
  const reducedLevel = levels.reduced;
  const minimal = levels.minimal;
  if (full && full.ratio <= 1) {
    failures.push(
      `performance: at deviceScaleFactor 3 the full level drew at ratio ${full.ratio}; the comparison below would prove nothing`,
    );
  }
  if (full && reducedLevel && reducedLevel.ratio !== full.ratio) {
    failures.push(
      `performance: the reduced level draws at ratio ${reducedLevel.ratio} against full's ${full.ratio} — the reduced mode must not be a blurrier mode`,
    );
  }
  if (
    full &&
    reducedLevel &&
    !(
      reducedLevel.scale !== undefined &&
      full.scale !== undefined &&
      reducedLevel.scale < full.scale
    )
  ) {
    failures.push('performance: the reduced level does not reduce the displays’ redraw rate');
  }
  if (minimal && full && minimal.ratio >= full.ratio) {
    failures.push(
      `performance: the minimal level draws at ratio ${minimal.ratio}, no lower than full's ${full.ratio}`,
    );
  }
  if (minimal && minimal.ratio < 1) {
    failures.push(
      `performance: the minimal level draws at ratio ${minimal.ratio}, below one device pixel per CSS pixel`,
    );
  }
  // The pixel budget binds at the device's own ratio too.
  if (full && full.device > 1_600_000) {
    failures.push(
      `performance: at deviceScaleFactor 3 the canvas is ${full.device} device pixels, past the mobile budget`,
    );
  }
  perfNotes.push(
    `performance levels at deviceScaleFactor 3: ${Object.entries(levels)
      .map(([name, v]) => `${name} ratio ${v.ratio}, canvas ${v.device} px, screens x${v.scale}`)
      .join('; ')}`,
  );
  const noticeAtMinimal = await dpr3Page.locator('.v11-perf').count();
  await dpr3.close();

  // The notice is present exactly when the world is doing less than authored.
  if (noticeAtMinimal !== 1) {
    failures.push(
      `performance: ${noticeAtMinimal} reduced-performance notices at the minimal level`,
    );
  }
  await page.goto(`${fileUrl}#/`, { waitUntil: 'load' });
  await page.reload({ waitUntil: 'load' });
  await waitForWorld(page);
  const noticeAtFull = await page.locator('.v11-perf').count();
  if (noticeAtFull !== 0) {
    failures.push(`performance: a reduced-performance notice is showing at the full level`);
  }
  perfNotes.push(
    `performance: the notice shows at minimal (${noticeAtMinimal}) and not at full (${noticeAtFull}) — a tier change is never silent`,
  );
  for (const note of perfNotes) notes.push(note);
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
if (PARTIAL) {
  console.log(
    `owner build v11 verify: PASS (partial: viewports ${VIEWPORTS.map((v) => v.name).join(', ') || 'none'}${RUN_TAIL ? ', with the motion and performance checks' : ', without the motion and performance checks'}) — every assertion that ran passed. This is not the whole check and may not be recorded as one.`,
  );
  process.exit(0);
}
console.log(
  'owner build v11 verify: PASS — opens from file://, no console errors, no off-document requests, no horizontal overflow with the window open or closed, every touch target and every window control at least 44 x 44, one tap opens the window and moves the camera together, back is one step per level, the composer stays above a simulated keyboard and claims nothing was sent, no session control is enabled, the gesture guard holds, the world slows under an open window and stops when the page is hidden, the reduced-performance mode is reachable and is not a blurrier mode, the window’s own text is DOM text with no canvas in it, V10 still loads at #/v10',
);
