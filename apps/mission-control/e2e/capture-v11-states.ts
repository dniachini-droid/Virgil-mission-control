/**
 * **The twelve review states the owner's brief asks to be able to review, each
 * reached from a URL and each photographed on the built V11 Owner Build.**
 *
 * The brief lists them: *idle command centre; an agent actively working;
 * successful verification; blocked or failed verification; owner decision
 * required; Virgil's full conversation; the Fabricator window; the Prover
 * window collapsed and expanded; the Keeper window; the message composer with
 * the iPhone keyboard considered; reduced-motion presentation;
 * reduced-performance presentation.* And it sets the standard each one has to
 * meet: **reachable by a deterministic entry point**, captured at 390 × 844,
 * and looked at.
 *
 * Every entry point below is a query parameter on the hash, read once at
 * mount, exactly as `#/?cam=`, `#/?run=` and `#/?state=` have been read since
 * S1. `hold=1` is stage 4's addition and it is what makes these deterministic
 * rather than approximate: it freezes the demonstration at the second the URL
 * names instead of letting a 1.5 fps container decide which beat a screenshot
 * lands on.
 *
 * **Simulated viewports in headless Chromium, rendered in software by
 * SwiftShader.** No iPhone and no GPU exists here. Nothing in these frames is
 * evidence about how the world looks on real graphics hardware; OD-0005 defers
 * those two checks and requires them recorded as not performed, never as met.
 * The onscreen keyboard is simulated by substituting `visualViewport`, exactly
 * as `verify-owner-build-v11.ts` does, and whether a real iOS keyboard behaves
 * the same is NOT PERFORMED.
 *
 * Usage: pnpm --filter mission-control capture:v11:states -- 0 4
 *        (from index 0, four states — one boot each, so a run stays inside the
 *        ten-minute foreground cap this harness imposes)
 *        pnpm --filter mission-control capture:v11:states -- sheet
 *        (composes every frame already captured into one contact sheet)
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { type Browser, chromium, type Page } from '@playwright/test';

const outDir = resolve(import.meta.dirname, '../dist/owner-build-v11');
const built = readdirSync(outDir).filter((n) => /virgil-[0-9a-f]{10}\.html$/.test(n));
if (built.length !== 1) {
  throw new Error(`expected exactly one built V11 Owner Build in ${outDir}, found ${built.length}`);
}
const fileUrl = pathToFileURL(resolve(outDir, built[0] as string)).href;
const shots = process.env.VIRGIL_SHOT_DIR ?? resolve(outDir, 'state-frames');
mkdirSync(shots, { recursive: true });

/** The iPhone keyboard, substituted before the document loads. */
const KEYBOARD_PX = 336;
const KEYBOARD_SHIM = `(() => {
  const listeners = [];
  const vv = {
    get width() { return window.innerWidth; },
    get height() { return window.innerHeight - (window.__virgilKeyboard || 0); },
    get offsetTop() { return 0; },
    get offsetLeft() { return 0; },
    get pageTop() { return 0; },
    get pageLeft() { return 0; },
    get scale() { return 1; },
    addEventListener: (type, fn) => listeners.push([type, fn]),
    removeEventListener: () => undefined,
    dispatchEvent: () => true,
  };
  Object.defineProperty(window, 'visualViewport', { get: () => vv, configurable: true });
  window.__virgilRaiseKeyboard = (px) => {
    window.__virgilKeyboard = px;
    for (const [type, fn] of listeners) if (type === 'resize') fn(new Event('resize'));
  };
})();`;

interface Shot {
  /** Two digits so the contact sheet and the directory sort the same way. */
  id: string;
  /** The brief's own words for the state. */
  title: string;
  /** The query string after `#/?`. This is the deterministic entry point. */
  entry: string;
  /** Anything the interface is driven through after it has loaded. */
  after?: (page: Page) => Promise<void>;
  /** Reduced motion is a media preference as well as a URL parameter. */
  reducedMotion?: boolean;
  /**
   * Where the window's own scroller stands when the frame is taken.
   * **Deterministic either way**: `top` is 0, and `evidence` is the top of the
   * first disclosure, computed from the layout rather than left wherever
   * clicking a section happened to scroll to.
   */
  scroll?: 'top' | 'evidence';
  /**
   * How long to let the six in-world displays settle before the frame is
   * taken. Four seconds is enough at the full level; the reduced level needs
   * far longer **in this container and only in this container**, because
   * choosing it steps the tier down, which rebuilds each display's canvas and
   * restarts its arrival — and a software renderer redraws them at 1.5 fps
   * scaled by 0.5, so the arrival takes about ten wall-clock seconds here
   * against well under one on a device at 12 fps.
   */
  settleMs?: number;
  note: string;
}

/**
 * The demonstration's beats, from `world/room/demo.ts`'s own `BEATS`, so these
 * seconds are quoted from the timeline rather than guessed at:
 * hand-off 2, the Fabricator working 8–14, reported 14–17, hand-off 17,
 * the Prover working 23–29, reported 29–32, the Keeper working 38–44,
 * reported 44–48, the owner gate 48–56. Loop 0 ends PASS, loop 1 BLOCKED,
 * loop 2 INSUFFICIENT_EVIDENCE.
 */
const expandEvidence = async (page: Page) => {
  // Clicked **once**, and once only: React 19 commits asynchronously, so a
  // poll-and-click loop sees `aria-expanded="false"` on its second pass and
  // shuts every section it has just opened. The study recorded that fault and
  // this is the same fix.
  await page.waitForSelector('.v11w-disclose', { timeout: 60_000 });
  // Indexed over the **stable** selector, not over the closed ones: the
  // filtered list shrinks as each click lands, so `nth(2)` of it is a
  // different button every time and eventually is not there at all.
  const buttons = page.locator('.v11w-disclose');
  const total = await buttons.count();
  for (let i = 0; i < total; i += 1) {
    const button = buttons.nth(i);
    if ((await button.getAttribute('aria-expanded')) === 'false') await button.click();
  }
  await page.waitForTimeout(1200);
};

const SHOTS: Shot[] = [
  {
    id: '01',
    title: 'Idle command centre',
    entry: 'demo=0&loop=0&hold=1',
    note: 'Second zero of the passing loop: no candidate in flight, every station READY, the verdict slab reading NO VERDICT.',
  },
  {
    id: '02',
    title: 'An agent actively working',
    entry: 'demo=11&loop=0&hold=1',
    note: 'The Fabricator building, eleven seconds into the loop — his own beat, between 8 s and 14 s.',
  },
  {
    id: '03',
    title: 'Successful verification',
    entry: 'demo=30&loop=0&hold=1',
    note: 'The Prover has reported on the passing loop: all required checks passed, the candidate ready for review.',
  },
  {
    id: '04',
    title: 'Blocked or failed verification',
    entry: 'demo=30&loop=1&hold=1',
    note: 'The same beat on loop 1, which ends BLOCKED: a required check failed and Virgil stops the candidate.',
  },
  {
    id: '05',
    title: 'Owner decision required',
    entry: 'demo=50&loop=0&hold=1',
    note: 'The owner gate: every agent idle, every screen quiet, one thing lit. Merge is the owner’s alone in every phase.',
  },
  {
    id: '06',
    title: 'Virgil’s full conversation',
    entry: 'demo=50&loop=0&hold=1&win=virgil',
    after: expandEvidence,
    scroll: 'top',
    note: 'His window at the owner gate with every disclosure opened: current project truth, what each agent is doing, the next decision, the whole conversation, the controls.',
  },
  {
    id: '07',
    title: 'The Fabricator window',
    entry: 'demo=11&loop=0&hold=1&win=fabricator',
    scroll: 'top',
    note: 'Opened while he is building. His completion report is a claim, not evidence, and the window says so.',
  },
  {
    id: '08',
    title: 'The Prover window, collapsed',
    entry: 'demo=30&loop=0&hold=1&win=prover',
    scroll: 'top',
    note: 'The conclusion first, the suggested actions, then five collapsed disclosures. One of five open by default.',
  },
  {
    id: '09',
    title: 'The Prover window, expanded',
    entry: 'demo=30&loop=0&hold=1&win=prover',
    after: expandEvidence,
    scroll: 'evidence',
    note: 'The same window with every disclosure opened: the checks, the verified facts against claims, the gates, and where the numbers come from.',
  },
  {
    id: '10',
    title: 'The Keeper window',
    entry: 'demo=42&loop=0&hold=1&win=keeper',
    after: expandEvidence,
    scroll: 'top',
    note: 'Opened while he is reviewing. Findings with identities and severities, refusals with their exact reasons from authority.json.',
  },
  {
    id: '11',
    title: 'The composer, with the iPhone keyboard considered',
    entry: 'demo=30&loop=0&hold=1&win=prover',
    after: async (page: Page) => {
      await page.waitForSelector('.v11w-composer textarea, .v11w-composer input', {
        timeout: 60_000,
      });
      const field = page.locator('.v11w-composer textarea, .v11w-composer input').first();
      await field.click();
      await field.type('Why did check 7 fail?', { delay: 10 });
      await page.evaluate(
        (px) =>
          (window as { __virgilRaiseKeyboard?: (n: number) => void }).__virgilRaiseKeyboard?.(px),
        KEYBOARD_PX,
      );
      await page.waitForTimeout(1200);
    },
    note: 'A 336 px keyboard substituted through visualViewport, with a question typed. SIMULATED: no real iOS keyboard has been raised.',
  },
  {
    id: '12',
    title: 'Reduced-motion presentation',
    entry: 'demo=11&loop=0&hold=1&motion=reduce',
    reducedMotion: true,
    note: 'Both entry points at once — the URL parameter and the media preference. Motion is honoured by arriving, never by hiding.',
  },
  {
    id: '13',
    title: 'Reduced-performance presentation',
    entry: 'demo=11&loop=0&hold=1&perf=reduced',
    settleMs: 24_000,
    note: 'The graceful mode forced. Fewer stars, no post-processing, no shadows, the screens redrawing half as often — and nothing drawn smaller or softer.',
  },
];

// -------------------------------------------------------------- contact sheet

if (process.argv[2] === 'sheet') {
  const frames = readdirSync(shots)
    .filter((n) => /^\d\d-.*\.png$/.test(n))
    .sort();
  if (frames.length === 0) throw new Error(`no frames in ${shots}`);
  const cells = frames
    .map((name) => {
      const id = name.slice(0, 2);
      const shot = SHOTS.find((s) => s.id === id);
      return `<figure><img src="${name}" alt="${shot?.title ?? name}"><figcaption><b>${id} · ${
        shot?.title ?? name
      }</b><code>#/?${shot?.entry ?? '—'}</code></figcaption></figure>`;
    })
    .join('\n');
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;padding:22px;background:#05070f;color:#dfe9f2;font:13px/1.4 -apple-system,system-ui,sans-serif}
    h1{font-size:17px;margin:0 0 4px}
    p.k{margin:0 0 18px;color:#8fa6bb;font-size:11.5px;max-width:1500px}
    .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16px}
    figure{margin:0}
    img{width:100%;display:block;border:1px solid #1e2a3d;background:#000}
    figcaption{padding-top:6px;font-size:11px;color:#b9cadb}
    figcaption b{display:block;color:#e7f0f7}
    figcaption code{display:block;color:#7ec8e3;font-size:10.5px;word-break:break-all}
  </style>
  <h1>V11 stage 4 — the twelve review states, 390 × 844, from the built Owner Build</h1>
  <p class="k">Every frame below was rendered in <b>software</b> by SwiftShader in a headless Chromium at a
  simulated 390 × 844 viewport. No iPhone and no GPU was used. These are not evidence of how the world looks on
  real graphics hardware; those two checks are deferred by OD-0005 and are recorded as NOT PERFORMED. The URL
  under each frame is the deterministic entry point that reaches it, appended to the artifact's own file:// URL.</p>
  <div class="grid">${cells}</div>`;
  writeFileSync(resolve(shots, 'contact-sheet.html'), html);
  const preinstalled =
    process.env.CHROMIUM_EXECUTABLE ??
    (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
      ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
      : '/opt/pw-browsers/chromium');
  const sheetBrowser: Browser = await chromium.launch(
    existsSync(preinstalled) ? { executablePath: preinstalled } : {},
  );
  const sheetPage = await sheetBrowser.newPage({ viewport: { width: 1720, height: 1200 } });
  await sheetPage.goto(pathToFileURL(resolve(shots, 'contact-sheet.html')).href, {
    waitUntil: 'load',
  });
  await sheetPage.waitForTimeout(1500);
  await sheetPage.screenshot({ path: resolve(shots, 'contact-sheet.png'), fullPage: true });
  await sheetBrowser.close();
  console.log(`capture v11 states: contact sheet of ${frames.length} frames in ${shots}`);
  process.exit(0);
}

// ------------------------------------------------------------------ capturing

const from = Number.parseInt(process.argv[2] ?? '0', 10);
const count = Number.parseInt(process.argv[3] ?? String(SHOTS.length), 10);
const slice = SHOTS.slice(from, from + count);
if (slice.length === 0) throw new Error(`no shots at ${from}..${from + count}`);

const preinstalled =
  process.env.CHROMIUM_EXECUTABLE ??
  (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
    : '/opt/pw-browsers/chromium');
const browser: Browser = await chromium.launch(
  existsSync(preinstalled) ? { executablePath: preinstalled } : {},
);

const errors: string[] = [];

for (const shot of slice) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: shot.reducedMotion ? 'reduce' : 'no-preference',
  });
  await context.addInitScript(KEYBOARD_SHIM);
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${shot.id}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`${shot.id} uncaught: ${e}`));
  const started = Date.now();
  await page.goto(`${fileUrl}#/?${shot.entry}`, { waitUntil: 'load' });
  await page.locator('canvas').waitFor({ timeout: 60_000 });
  await page.waitForFunction(() => '__virgilRoomReady' in window, undefined, { timeout: 420_000 });
  await page.waitForTimeout(shot.settleMs ?? 4000);
  if (shot.after) await shot.after(page);
  if (shot.scroll) {
    await page.evaluate((where: string) => {
      const body = document.querySelector<HTMLElement>('.v11w-body');
      if (!body) return;
      if (where === 'top') {
        body.scrollTop = 0;
        return;
      }
      const first = document.querySelector<HTMLElement>('.v11w-disclose');
      body.scrollTop = first ? Math.max(0, first.offsetTop - 8) : 0;
    }, shot.scroll);
    await page.waitForTimeout(600);
  }
  const state = await page.evaluate(
    () => (window as { __virgilV11?: Record<string, unknown> }).__virgilV11 ?? {},
  );
  const name = `${shot.id}-${shot.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}.png`;
  await page.screenshot({ path: resolve(shots, name) });
  console.log(
    `capture v11 states: ${shot.id} "${shot.title}" #/?${shot.entry} → ${name} in ${Math.round(
      (Date.now() - started) / 1000,
    )} s; ${JSON.stringify(state)}`,
  );
  await context.close();
}

await browser.close();
console.log(`capture v11 states: ${slice.length} frames in ${shots}`);
console.log(`capture v11 states: console errors ${errors.length}`);
for (const error of errors) console.log(`capture v11 states: ${error}`);
console.log(
  'capture v11 states: SIMULATED viewport, software rendering, simulated keyboard. Not evidence of how this looks or behaves on a real device; those checks are NOT PERFORMED.',
);
