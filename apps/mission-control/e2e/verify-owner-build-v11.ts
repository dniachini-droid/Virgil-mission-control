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
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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
 * How long `selectAnchor` ignores a repeat of the same target, in milliseconds
 * (`world/mobile/MobileRoom.tsx`). One press can be answered by both the
 * world's own raycast and the DOM hit test, and under the two-step rule a press
 * counted twice would travel and open at once. A check that drives two
 * deliberate taps has to clear it, and has to clear it in the same units it is
 * written in.
 */
const GUARD_MS = 750;

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

/**
 * **The frame budget every wait in this file is spent from — the Keeper's
 * K11-04, repaired at its cause rather than by a bigger number.**
 *
 * His review ran a single-viewport copy of this script at candidate `de3c7d8`
 * in a container three to four times slower than the builders' and got five
 * failures, **every one of them false**: *"the window has no back chevron"*
 * when `AgentWindow.tsx:225` renders it and a committed frame shows it. Nine
 * `boundingBox({ timeout: 10_000 })` waits had expired. The check was correct
 * about the product and wrong about the clock, which is the fault this file
 * already records fixing once for its sleeps and had left standing in its
 * element waits — *"Timing by the wall clock would make the assertion a
 * property of SwiftShader."*
 *
 * A check that cries wolf is worse than no check, because the next real
 * failure gets waved through as another slow machine. So the wait is spent in
 * **rendered frames**, which is the only clock this product's interface runs
 * on: nothing in the DOM can change between two frames that a frame-counting
 * wait would miss, and a machine ten times slower simply takes ten times longer
 * to spend the same budget. **Nothing asserted is relaxed** — the chevron still
 * has to exist, be visible and measure 44 x 44 — and the budget is still finite,
 * so a genuinely absent element still fails rather than hanging.
 *
 * 90 frames: at this container's ~1.4 fps that is over a minute of grace, and
 * on a fast machine a second and a half. The old 10,000 ms was under fourteen
 * frames here.
 */
const WAIT_FRAMES = 90;

/**
 * **The budget for watching something that must *not* happen, which cannot be
 * the budget for watching something that must.**
 *
 * A wait for a thing that arrives ends when it arrives. A wait for a thing that
 * must never arrive always runs to the end of its budget — that is what proving
 * a negative costs — so `WAIT_FRAMES` is spent in full, twice, every run.
 *
 * That was invisible until this check was given its own CI job. On a GitHub
 * runner a frame is **6,678 ms**, roughly ten times this container's, so each of
 * those two loops costs 601 s and the pair costs twenty minutes of a thirty
 * minute job. The check had never once completed there — every earlier attempt
 * was cancelled by the next push before it could time out, so nothing said so.
 *
 * **Where 12 comes from, corrected after the first run measured it.** The number
 * was first justified here as four times an opening's cost, from the milliseconds
 * the run prints divided by the frame period — about two and a half frames. That
 * was wrong, and the instrumentation added alongside it is what said so: the
 * frame each event is *seen* on is **0**, on every tap, on both machines this has
 * run on. Those milliseconds are the cost of Playwright's own move/down/up
 * round-trip before the first sample, not the world's latency; by the time the
 * first sample happens the camera has moved and the record is open.
 *
 * So the honest statement is the weaker-sounding and truer one: twelve frames is
 * twelve times longer than any positive has ever needed, and what makes it a
 * budget rather than a guess is that `bothTaps` fails if a positive ever takes
 * four or more — because a number derived from a measurement stops being derived
 * the moment the measurement moves and nobody looks.
 */
const NEGATIVE_FRAMES = 12;
/** How much of the negative budget the positive may take before it is not a margin. */
const MARGIN = 4;

type Box = { x: number; y: number; width: number; height: number };

/**
 * The box of the first element matching a CSS selector, waited for in frames.
 * Visibility is decided the way Playwright decides it — an empty box or
 * `visibility: hidden` is not there yet — so this is a drop-in for the
 * locator wait on a bounding box it replaces, with the deadline changed and
 * nothing else. No wait in this file measures a deadline in milliseconds any
 * more, and a test asserts that no new one does.
 */
async function boxOf(p: Page, selector: string, budget = WAIT_FRAMES): Promise<Box | null> {
  for (let attempt = 0; ; attempt += 1) {
    // Anonymous arrows only, for the `__name` reason recorded above `frames`.
    const box = await p.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const style = window.getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') return null;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }, selector);
    if (box) return box;
    if (attempt >= budget) return null;
    await frames(p, 1);
  }
}

/**
 * A page condition, polled once a frame until it holds or the budget is spent.
 * Returns whether it held, so a caller can say which happened; every caller
 * here goes on to assert the state it wanted, exactly as it did when this was
 * `waitForFunction({ timeout: 20_000 })`.
 */
async function until(p: Page, check: () => boolean, budget = WAIT_FRAMES): Promise<boolean> {
  for (let attempt = 0; ; attempt += 1) {
    if (await p.evaluate(check)) return true;
    if (attempt >= budget) return false;
    await frames(p, 1);
  }
}

/**
 * **The renderer's own frame period, measured once and used as the deadline for
 * the few Playwright calls that can only be given milliseconds.**
 *
 * `locator.click()` and `locator.fill()` carry Playwright's default 30-second
 * wall-clock timeout, and a 30-second default is exactly the fault K11-04
 * names: in this container a single frame takes most of a second, so thirty
 * seconds is forty frames, and the first run of this repair **crashed** on
 * `.v11w-input` — worse than a false failure, because a crash prints nothing at
 * all and the reader cannot tell a broken product from a slow machine. So the
 * default becomes `WAIT_FRAMES` of this machine's own frames, never shorter
 * than Playwright's 30 s on a fast one.
 */
let framePeriodMs = 16;

async function calibrate(p: Page): Promise<void> {
  const started = Date.now();
  await frames(p, 6);
  framePeriodMs = Math.max(16, (Date.now() - started) / 6);
  context.setDefaultTimeout(Math.max(30_000, Math.round(framePeriodMs * WAIT_FRAMES)));
  mark(
    `a frame takes ${Math.round(framePeriodMs)} ms here, so a wait of ${WAIT_FRAMES} frames is ${Math.round((framePeriodMs * WAIT_FRAMES) / 1000)}s`,
  );
}

/**
 * **A press on a world target, retried against a freshly measured box until it
 * does what it is supposed to do.**
 *
 * A touch target in this world is a projection of moving geometry: it is placed
 * from the camera every frame, so a press aimed at where it was one frame ago
 * can land on nothing while the camera is still easing. That is a property of
 * the instrument, not of the product — the reader's thumb and the world's own
 * hit test are never a frame apart. Before this, the miss was hidden by
 * whatever latency the wait before it happened to add, which is exactly the
 * kind of accident K11-04 is about. So the press is **repeated against a new
 * measurement** until the condition it is supposed to cause holds, and it fails
 * only when a bounded number of honest attempts have all missed.
 *
 * **Since the owner's decision of 10 September it also has to press twice on
 * purpose**, because reaching a record is two taps: the first travels, the
 * second opens. Retrying the same target means clearing the 700 ms guard that
 * stops one press being counted twice, so a retry waits `GUARD_MS` — and waits
 * it in milliseconds, since a frame-counted wait clears it on this software
 * renderer and not on a fast machine.
 */
async function pressUntil(
  p: Page,
  selector: string,
  condition: () => boolean,
  attempts = 5,
): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) await p.waitForTimeout(GUARD_MS);
    const box = await boxOf(p, selector);
    if (!box) return false;
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await p.mouse.down();
    await p.mouse.up();
    if (await until(p, condition, 6)) return true;
  }
  return false;
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

/**
 * **Progress, printed as it happens.** A run of this script takes about fifteen
 * minutes in a software renderer and prints nothing until the end, so a session
 * that hits its harness's ten-minute cap learns only that it was killed. Each
 * stage announces itself with the seconds it started at, on stderr so the
 * result lines on stdout stay exactly what they were.
 */
const startedAtMs = Date.now();
function mark(label: string): void {
  process.stderr.write(
    `owner build v11 verify: … ${label} at ${Math.round((Date.now() - startedAtMs) / 1000)}s\n`,
  );
}

// ---------------------------------------------------------------- the routes
const visited: string[] = [];
for (const route of ['', '#/v10', '#/s1', '#/spike/foundry', '#/spike/mind']) {
  await page.goto(`${fileUrl}${route}`, { waitUntil: 'load' });
  if (route === '' || route === '#/v10') {
    await waitForWorld(page);
    if (route === '') await calibrate(page);
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
/**
 * **The Keeper's KP2-10, checked in the artifact rather than in the source —
 * and rewritten after KP5-01, where the first version of this check failed the
 * build over the name of a document.**
 *
 * The Owner Build's promise is that it cannot reach the network. `verify:owner:v11`
 * proves the running page makes no request; it does not prove the file has no way
 * to. The instruct client was once carried into the artifact whole — the endpoint,
 * the secret header, the storage key — unreachable only because a runtime branch
 * happened never to be taken. `__LIVE__` is a compile-time constant and those
 * functions test it first now, so the bundler folds them away, and this reads the
 * built file to confirm it.
 *
 * **What went wrong with the first version, because the repair is only honest if
 * the mistake is written next to it.** It searched for four *substrings*
 * anywhere in the file, one of them `/api/state`. A session then filed
 * `OD-0012`, a decision record about that endpoint, whose filename and title
 * contain the path; the knowledge graph carries every decision record's name;
 * `spikes/mind/MindScene.tsx` imports the graph; so the artifact contained the
 * eight characters, in a JSON string, as the *name of a document*. The build
 * failed. The check was right that the bytes were there and wrong about what
 * their presence meant.
 *
 * **The repair is to ask the question the check means.** It does not mean "do
 * these characters occur": it means "is there code here that can reach the
 * network". So each pattern now matches a **call or a code position** rather than
 * a mention:
 *
 *  - a `fetch(` whose target is any `/api/` path — broader than the two endpoints
 *    the old list named, and unreachable by prose, because a document does not
 *    contain a call;
 *  - the secret header as an **object key**, which is what it is in a request and
 *    what prose never writes, because prose does not put a colon after it.
 *
 * **The storage key `virgil.instruct.secret` is no longer checked, and that is a
 * loss worth stating rather than hiding.** There is no pattern that tells its use
 * from its mention: in code it is a quoted literal, and in a markdown title — the
 * very thing that caused this finding — it is a quoted literal too. Its presence
 * was never evidence about behaviour in any case: the key names a slot in the
 * owner's own browser, the secret itself is never in any build, and an artifact
 * that cannot `fetch` cannot send what is in that slot anywhere. The two patterns
 * above cover the machinery; the runtime request count covers the promise.
 *
 * **What was deliberately not done**, because it was available and it was the
 * wrong answer: `/api/state` was not removed from the check, and no exception was
 * added for the seed graph. Either would have turned a red build green by making
 * the check stop looking for the thing it exists to find. The Keeper named that
 * shape as the prohibited one in the finding itself.
 *
 * **Proved by mutation, not by reading.** A V11 Owner Build compiled with
 * `__LIVE__` true carries the real instruct client, and this check fails on it —
 * which is the only evidence that a narrower pattern still catches what the
 * broad one caught. `owner-build-v11.test.ts` holds the patterns so they cannot
 * quietly loosen again.
 */
{
  const text = readFileSync(file, 'utf8');
  const liveModeCode: { what: string; pattern: RegExp }[] = [
    // The substantive one. No fetch, no request, whatever else is in the file.
    { what: 'a fetch to an /api/ endpoint', pattern: /fetch\(\s*[`'"]\/api\// },
    // The instruct client's request header, as an object key. Prose does not
    // put a colon after a header name.
    { what: 'the instruct secret sent as a header', pattern: /[`'"]x-virgil-secret[`'"]\s*:/ },
  ];
  const present = liveModeCode.filter((entry) => entry.pattern.test(text));
  if (present.length > 0) {
    failures.push(
      `the Owner Build carries live-mode code: ${present.map((entry) => entry.what).join(', ')}; __LIVE__ should have removed it`,
    );
  } else {
    // Only when it holds. The first version announced the negative it had just
    // disproved, one line above its own failure — the Keeper's KP5-09.
    mark(`the artifact carries none of ${liveModeCode.length} kinds of live-mode code`);
  }
}

mark('the routes and V10 chrome are done; the viewports begin');
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

  mark(`${viewport.name}: overflow`);
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

  mark(`${viewport.name}: touch targets`);
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

  mark(`${viewport.name}: gestures`);
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

  const virgil = await boxOf(page, '[data-touch-target="virgil"]');
  if (!virgil) {
    failures.push(`${viewport.name}: no Virgil target to drive the gesture guard against`);
  } else {
    const cx = virgil.x + virgil.width / 2;
    const cy = virgil.y + virgil.height / 2;

    // 3a. **Two taps, measured one at a time.** The owner's decision of 10
    //     September, which reverses his own of 8 September and therefore
    //     reverses what this check asserted at stage 3: *"first zoom in to
    //     their close up view. And THEN when you click their screen, that's
    //     when it should open the window."* The interaction and its check
    //     changed together; neither half of it is left unmeasured.
    //
    //     **The first tap travels and opens nothing.**
    await press(cx, cy);
    const atFirst = await state();
    await frames(page, 3);
    const afterFirst = await state();
    if (afterFirst.focus !== 'virgil') {
      failures.push(
        `${viewport.name}: the first tap left the focus at ${afterFirst.focus}, expected virgil`,
      );
    }
    if (atFirst.panel !== 0 || afterFirst.panel !== 0) {
      failures.push(
        `${viewport.name}: the first tap opened ${afterFirst.panel} windows (${atFirst.panel} at the press); the owner's decision is that it only travels`,
      );
    }
    if (atFirst.focus !== 'virgil') {
      failures.push(
        `${viewport.name}: the camera had not begun to move at the press (focus ${atFirst.focus})`,
      );
    }
    notes.push(
      `${viewport.name}: first tap on Virgil — travels only (focus ${atFirst.focus} at the press, ${afterFirst.panel} windows after)`,
    );

    //     **The second tap opens, in its own event, without moving again.**
    //     The wait is in milliseconds rather than frames because what it has to
    //     clear is stated in milliseconds: `selectAnchor` ignores a repeat of
    //     the same target inside 700 ms, so that the world's raycast and the
    //     DOM hit test cannot answer one press twice. A frame-counted wait
    //     would clear it on this software renderer and not on a fast machine.
    await page.waitForTimeout(GUARD_MS);
    const second = await boxOf(page, '[data-touch-target="virgil"]');
    const sx = (second ?? virgil).x + (second ?? virgil).width / 2;
    const sy = (second ?? virgil).y + (second ?? virgil).height / 2;
    await press(sx, sy);
    const atSecond = await state();
    await frames(page, 3);
    const afterSecond = await state();
    if (afterSecond.panel !== 1) {
      failures.push(
        `${viewport.name}: the second tap on the Virgil target opened ${afterSecond.panel} windows, expected 1`,
      );
    }
    if (atSecond.panel !== 1) {
      failures.push(
        `${viewport.name}: the window was not open at the press that opened it — ${atSecond.panel} windows; it renders from data and may not wait for a frame`,
      );
    }
    if (afterSecond.focus !== 'virgil') {
      failures.push(
        `${viewport.name}: the tap that opened the window moved the camera to ${afterSecond.focus}; it must not move again`,
      );
    }
    notes.push(
      `${viewport.name}: second tap on Virgil — opens from data (${atSecond.panel} windows at the press, ${afterSecond.window}), camera still at ${afterSecond.focus}`,
    );

    // 3b. The record's own dismissal leaves the reader at the station, as the
    //     owner decided at V9. Measured here because in portrait the panel is a
    //     full-screen sheet and its control is the only thing on top of it.
    const escBox = await boxOf(page, '.v11w-back');
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
      await until(page, () => document.querySelectorAll('.v11w-root').length === 0);
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
    const backBox = await boxOf(page, '[data-touch-target="back"]');
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
    const again = await boxOf(page, '[data-touch-target="virgil"]');
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

  mark(`${viewport.name}: the window`);
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
    if (!/is not sent/i.test(measured.note)) {
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
    // own screen — the same path the reader takes, and since 10 September that
    // path is **two presses**: the first flies to his station, the second opens
    // the record. `pressUntil` presses until the record is up, so the count is
    // not asserted here; what is asserted is that one press is not enough.
    await settle();
    //     A press can be swallowed before it counts — the gesture guard refuses
    //     one taken while the camera is still easing, which is a property of
    //     this instrument and not of the product — so the first step is pressed
    //     until it *lands*, and what is asserted is the state once it has: the
    //     camera has travelled and no record is open.
    const travelledAt = await pressUntil(
      page,
      '[data-touch-target="prover-screen"]',
      () => (window as { __virgilV11?: { focus?: string } }).__virgilV11?.focus !== 'all',
    );
    const travelled = await state();
    if (!travelledAt) {
      failures.push(`${viewport.name}: pressing the Prover's screen moved the camera nowhere`);
    } else if (travelled.panel !== 0) {
      failures.push(
        `${viewport.name}: the press that travelled to the Prover's station also opened ${travelled.panel} windows; the first press opens nothing`,
      );
    }
    notes.push(
      `${viewport.name}: first press on the Prover's screen — travelled to ${travelled.focus}, ${travelled.panel} windows`,
    );
    const opened = await pressUntil(
      page,
      '[data-touch-target="prover-screen"]',
      () => document.querySelectorAll('.v11w-sheet').length === 1,
    );
    if (!opened) {
      failures.push(`${viewport.name}: pressing the Prover's screen opened no window`);
    } else {
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
      mark(`${viewport.name}: window measured, evidence closed`);
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
      mark(`${viewport.name}: window measured, evidence expanded`);
      await windowMeasure('window, evidence expanded');

      // The composer, with the keyboard up. **Simulated**, through the
      // product's own `visualViewport` path. Reached by the same frame-budgeted
      // wait as everything else, and **its absence is a failure, not a crash**:
      // a `locator.click()` that expires throws out of the whole script and
      // prints nothing, which tells the reader neither what passed nor why this
      // did not.
      mark(`${viewport.name}: the composer`);
      const inputBox = await boxOf(page, '.v11w-input');
      if (!inputBox) {
        failures.push(`${viewport.name}: the window has no composer input`);
      } else {
        // `fill` scrolls the composer into view and focuses it itself. A raw
        // mouse press at the measured centre cannot: in portrait the composer
        // sits below the fold, and the first attempt at this repair pressed an
        // off-screen coordinate, which landed on the world and dismissed the
        // window. The wait is frame-budgeted; the action is Playwright's, with
        // the calibrated deadline above.
        await page.locator('.v11w-input').fill('Why is this candidate not merged?');
      }
      const keyboardPx = viewport.portrait ? KEYBOARD_PX : KEYBOARD_LANDSCAPE_PX;
      await page.evaluate((px) => {
        (window as { __raiseKeyboard?: (n: number) => void }).__raiseKeyboard?.(px);
      }, keyboardPx);
      await frames(page, 2);
      const composer = await page.evaluate(() => {
        const input = document.querySelector('.v11w-input')?.getBoundingClientRect();
        const keep = document.querySelector('.v11w-keep')?.getBoundingClientRect();
        const hidden = (window as { __simKeyboard?: number }).__simKeyboard ?? 0;
        // Null-safe, because a sheet that is not open must be **reported** and
        // not thrown: `getComputedStyle(null)` crashed this script once and a
        // crash prints nothing at all.
        const sheet = document.querySelector('.v11w-sheet');
        return {
          inputBottom: Math.round(input?.bottom ?? -1),
          keepBottom: Math.round(keep?.bottom ?? -1),
          visible: Math.round(window.innerHeight - hidden),
          sheets: document.querySelectorAll('.v11w-sheet').length,
          inset: sheet ? getComputedStyle(sheet).getPropertyValue('--v11w-kb') : '(no sheet)',
        };
      });
      if (composer.sheets !== 1) {
        failures.push(
          `${viewport.name}: ${composer.sheets} window sheets are open at the composer check, expected 1`,
        );
      }
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
      mark(`${viewport.name}: the kept turn`);
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
      if (/sent|sending|delivered/i.test(kept.note.replace(/it is not sent/gi, ''))) {
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
      mark(`${viewport.name}: the way back`);
      const chevron = await boxOf(page, '.v11w-back');
      if (!chevron) {
        failures.push(`${viewport.name}: the window has no back chevron`);
      } else {
        await press(chevron.x + chevron.width / 2, chevron.y + chevron.height / 2);
        await until(page, () => document.querySelectorAll('.v11w-root').length === 0);
        const atStation = await state();
        if (atStation.panel !== 0 || atStation.focus !== stationFocus) {
          failures.push(
            `${viewport.name}: the chevron left ${atStation.panel} windows and the focus at ${atStation.focus}, not the ${stationFocus} the tap flew to; it must leave the reader at the station`,
          );
        }
        const home = await boxOf(page, '[data-touch-target="back"]');
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

  mark(`${viewport.name}: development chrome`);
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
// honoured by **arriving**, never by hiding. Nothing waits for a transition in
// either setting, so reduced motion has nothing to shorten and must behave
// exactly as the default does.
//
// **Not measured by a clock, and since the owner's decision of 10 September not
// measured by a gap either.** A first attempt asserted that the record opens
// within 350 ms of the press and failed while the product was correct: in this
// container the first `evaluate` after a synthetic press returned at 2,518 ms,
// because the software renderer takes that long to run the handler and draw —
// V10's run record already measured 845 ms from press to handler here. Timing
// by the wall clock would make the assertion a property of SwiftShader. What
// replaced it was the interval between the camera moving and the record
// appearing, which cancels that latency out — and which the two-step rule
// dissolves, because those two events are now in two separate presses. So what
// is asserted is the rule: travel on the first tap, open on the second, the
// same in both settings. The millisecond figures are recorded as notes and are
// this renderer's, never the product's.
if (RUN_TAIL) {
  mark('the motion and performance tail');
  /**
   * **The budget is frames, and what it waits for is a state, not a deadline.**
   * The Keeper's K11-04 caught this loop: a 12,000 ms budget expired in his
   * slower container and produced *"reduced-motion: the record never opened"*
   * about a record that opens immediately. What it waits is a count of rendered
   * frames, because the DOM cannot change between two of them, so a slow machine
   * buys more time instead of a false failure. Sampling once a frame also
   * replaces the 40 ms poll: a finer poll than the frame it observes measures
   * nothing extra. The millisecond figures it returns are kept for the notes and
   * are not asserted on.
   */
  const sampleWorld = () =>
    page.evaluate(() => ({
      focus: (window as { __virgilV11?: { focus?: string } }).__virgilV11?.focus ?? '(none)',
      panels: document.querySelectorAll('.v11w-root').length,
    }));

  const tapAndWatch = async (x: number, y: number, budgetFrames: number) => {
    const startedAt = Date.now();
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.up();
    let movedAt = -1;
    let openedAt = -1;
    // Which sample saw it, as well as when. The frame is the figure that means
    // something: the millisecond one is this software renderer's latency and the
    // line printed below says so, but a count of frames is the same number on a
    // fast machine and a slow one, and it is what the budgets below are in.
    let movedFrame = -1;
    let openedFrame = -1;
    for (let frame = 0; frame <= budgetFrames; frame += 1) {
      const seen = await sampleWorld();
      const at = Date.now() - startedAt;
      if (movedAt < 0 && seen.focus !== 'all') {
        movedAt = at;
        movedFrame = frame;
      }
      if (openedAt < 0 && seen.panels === 1) {
        openedAt = at;
        openedFrame = frame;
      }
      if (openedAt >= 0) break;
      await frames(page, 1);
    }
    const settled = await sampleWorld();
    return {
      movedAt,
      openedAt,
      movedFrame,
      openedFrame,
      focus: settled.focus,
      panels: settled.panels,
    };
  };

  /**
   * **Both taps, each measured on its own, at one motion setting.** The first
   * must travel and open nothing; the second must open without travelling
   * again. Between them the check waits `GUARD_MS`, because `selectAnchor`
   * ignores a repeat of the same target inside that window so that the world's
   * raycast and the DOM hit test cannot answer one press twice — and a second
   * deliberate tap has to clear it.
   */
  const bothTaps = async (label: string) => {
    const target = await boxOf(page, '[data-touch-target="virgil"]');
    if (!target) {
      failures.push(`${label}: the Virgil target was not on the page`);
      return null;
    }
    // The negative budget: this tap must open nothing, so this loop runs to the
    // end of whatever it is given. See `NEGATIVE_FRAMES`.
    const first = await tapAndWatch(
      target.x + target.width / 2,
      target.y + target.height / 2,
      NEGATIVE_FRAMES,
    );
    if (first.movedAt < 0) {
      failures.push(`${label}: the first tap never moved the camera`);
    }
    if (first.panels !== 0) {
      failures.push(
        `${label}: the first tap opened ${first.panels} record(s); the owner's decision is that it only travels`,
      );
    }
    await page.waitForTimeout(GUARD_MS);
    const moved = (await boxOf(page, '[data-touch-target="virgil"]')) ?? target;
    const second = await tapAndWatch(
      moved.x + moved.width / 2,
      moved.y + moved.height / 2,
      WAIT_FRAMES,
    );
    if (second.openedAt < 0) {
      failures.push(`${label}: the second tap never opened the record`);
    }
    if (second.focus !== 'virgil') {
      failures.push(
        `${label}: the second tap moved the camera to ${second.focus}; it must open without travelling again`,
      );
    }
    /**
     * **The margin, checked rather than assumed — and the Keeper's KP4-10 about
     * what it does and does not measure.**
     *
     * What is timed here is a record opening on the *second* tap and a camera
     * moving on the first. What the budget must be long enough to observe is a
     * record opening on the *first* tap — which by design never happens, and so
     * can never be timed. **The step from those two to the third is an inference
     * by analogy, not a measurement**: they are the same code path answering the
     * same press, so an opening that must not come would appear on the same
     * frame as one that must. That is a reasonable belief and it is not evidence,
     * and it is written here as the first rather than the second.
     *
     * An opening and a camera move have been seen on frame 0 of every tap on
     * every machine this has run on.
     * If either ever needs four frames or more — a quarter of the budget the
     * first tap is watched for — the negative budget is no longer long enough to
     * be evidence that nothing happened, and this says so instead of passing.
     * That is the failure the old 90-frame budget could not have, and what it
     * paid for the impossibility with was never finishing on a slow machine.
     */
    const worst = Math.max(second.openedFrame, first.movedFrame);
    if (worst >= 0 && worst * MARGIN > NEGATIVE_FRAMES) {
      failures.push(
        `${label}: the world took ${worst} frames to answer a tap, which is more than a quarter of the ${NEGATIVE_FRAMES}-frame budget the first tap is watched for. The margin has gone: re-derive NEGATIVE_FRAMES from this measurement rather than trusting the negative.`,
      );
    }
    return { first, second };
  };

  /**
   * **The reload is the point, not the `goto`.** A navigation that differs only
   * in the hash is a same-document navigation: the page does not reload and the
   * app keeps whatever focus and window the section before left it holding.
   * Under the one-tap rule that cost nothing, because a tap opened the record
   * either way. Under the two-step rule it is the difference between a first tap
   * that travels and a first tap that arrives already there and therefore opens —
   * which is exactly what this check read as a product defect on its first run.
   */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${fileUrl}#/`, { waitUntil: 'load' });
  await page.reload({ waitUntil: 'load' });
  await waitForWorld(page);
  const normal = await bothTaps('default motion');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${fileUrl}#/`, { waitUntil: 'load' });
  await page.reload({ waitUntil: 'load' });
  await waitForWorld(page);
  const reducedIsOn = await page.evaluate(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const reduced = await bothTaps('reduced-motion');

  if (!reducedIsOn) failures.push('reduced-motion: the emulation did not take');
  /**
   * **What this section asserts, and what it stopped asserting, and why.**
   *
   * Until the owner's decision of 10 September it measured one quantity: the
   * interval between the camera moving and the record appearing, required to be
   * zero in both motion settings. That was the right measurement for a rule
   * where one tap did both — the renderer's latency is common to the two events
   * and cancels out of the interval between them, so the assertion was about the
   * product rather than about SwiftShader.
   *
   * **That quantity no longer exists.** The two events are now in two separate
   * presses by his instruction, so there is no interval between them to measure,
   * and any wall-clock figure taken from a single press in this container is the
   * software renderer's latency — the file's own history records a first sample
   * returning at 2,518 ms — not the product's. Retaining the old assertion
   * against the new rule would have measured nothing and passed anyway.
   *
   * So what is asserted here now is the rule itself, in both motion settings:
   * the first tap travels and opens nothing, the second opens and does not
   * travel. Reduced motion is honoured by arriving rather than by hiding, and
   * that is checked by requiring it to behave exactly as the default does, not
   * by a timing figure this machine cannot produce honestly. **No timing claim
   * is made about either tap**, and the figures below are recorded as this
   * renderer's, never as the product's.
   */
  notes.push(
    `motion (portrait 390): default — camera at ${normal?.first.movedAt ?? -1} ms (frame ${normal?.first.movedFrame ?? -1}), ${normal?.first.panels ?? -1} record(s) after the first tap, record at ${normal?.second.openedAt ?? -1} ms (frame ${normal?.second.openedFrame ?? -1}) on the second; reduced — camera at ${reduced?.first.movedAt ?? -1} ms (frame ${reduced?.first.movedFrame ?? -1}), ${reduced?.first.panels ?? -1} record(s) after the first tap, record at ${reduced?.second.openedAt ?? -1} ms (frame ${reduced?.second.openedFrame ?? -1}) on the second. The first tap is watched for ${NEGATIVE_FRAMES} frames, and the frame figures are what that budget is derived from; every millisecond figure here is this software renderer's latency and is NOT a measurement of the product.`,
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
  // **Two taps, since the owner's decision of 10 September.** The first travels
  // and opens nothing, so a single press leaves no window here and every
  // measurement below it would be taken of a world with nothing over it. The
  // wait between them clears the guard that stops one press being counted twice.
  const virgilTarget = await boxOf(page, '[data-touch-target="virgil"]');
  if (virgilTarget) {
    const pressVirgil = async () => {
      const box = (await boxOf(page, '[data-touch-target="virgil"]')) ?? virgilTarget;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.up();
    };
    await pressVirgil();
    await frames(page, 3);
    await page.waitForTimeout(GUARD_MS);
    await pressVirgil();
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
  'owner build v11 verify: PASS — opens from file://, no console errors, no off-document requests, no horizontal overflow with the window open or closed, every touch target and every window control at least 44 x 44, the first tap on a station travels and opens nothing and the second opens its record without travelling again, back is one step per level, the composer stays above a simulated keyboard and claims nothing was sent, no session control is enabled, the gesture guard holds, the world slows under an open window and stops when the page is hidden, the reduced-performance mode is reachable and is not a blurrier mode, the window’s own text is DOM text with no canvas in it, V10 still loads at #/v10',
);
