/**
 * **Verifies the hosted build — the third target, and the one the owner actually
 * opens.**
 *
 * The Keeper's KP2-09: *"Both Owner Builds have a build, a verifier, a digest
 * and a reproducibility job; the third target — the only one that can start a
 * session, and the one the owner will actually open on his phone — has none. If
 * `build:web` broke, nothing in this repository would fail."* It also named the
 * consequence: the absence of any check over `dist/web` is why two defects the
 * owner found himself reached the artifact — a transport written and never
 * wired, and a screen drawing recorded numbers while saying they came from
 * GitHub.
 *
 * **This asserts the opposite promise to the Owner Build's, and that is the
 * point.** `verify-owner-build*.ts` proves a file makes *no* request. Here the
 * page must make one, to `/api/state`, or the live path is not wired at all —
 * precisely the defect that shipped and was invisible because nothing looked.
 * The two verifiers are mirror images and neither substitutes for the other.
 *
 * What it does not do: reach the network, hold a credential, or contact Netlify
 * or GitHub. The endpoint is stubbed by a local server serving the built
 * directory, so this proves the page's behaviour against an answer, not the
 * endpoint's behaviour against GitHub. `netlify/functions/state.mjs` is still
 * covered by source-reading tests and by nothing stronger.
 *
 * Usage: pnpm --filter mission-control build:web &&
 *        pnpm --filter mission-control verify:web
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const outDir = resolve(import.meta.dirname, '../dist/web');
const netlifyToml = resolve(import.meta.dirname, '../../../netlify.toml');

/**
 * **The production Content-Security-Policy, read from `netlify.toml` and served
 * here — the Keeper's KP2-19.**
 *
 * The policy allowed `script-src 'unsafe-inline'` on the one page that holds the
 * credential for starting sessions. The build has no inline script, so the
 * allowance bought nothing and cost the protection it exists to give. Removing
 * it is easy; knowing it stays removed *and* that the page still runs under it
 * is not, and was previously checked by nobody — a stricter policy that breaks
 * the app would be found by the owner opening it on his phone.
 *
 * So the header the site actually sends is applied to the page this check drives.
 * A violation surfaces as a console error, which this already fails on.
 */
// **KP5-10.** `.exec` takes the *first* policy in the file. A second `[[headers]]`
// block added later is the one the site sends and would have been invisible here,
// which is the ordering trap this file's own redirect comments warn about. All of
// them are read; every one must be free of the allowance, and the last is the one
// the page is served under.
const policies = [
  ...readFileSync(netlifyToml, 'utf8').matchAll(/Content-Security-Policy\s*=\s*"([^"]+)"/g),
]
  .map((match) => match[1] ?? '')
  .filter((policy) => policy.length > 0);
const CSP = policies[policies.length - 1] ?? '';
if (!CSP.includes('script-src')) {
  throw new Error('no Content-Security-Policy found in netlify.toml');
}
for (const policy of policies) {
  if (/script-src[^;]*unsafe-inline/.test(policy)) {
    throw new Error(
      "netlify.toml allows script-src 'unsafe-inline' on the page that holds the instruct secret",
    );
  }
}
const failures: string[] = [];
const startedAt = Date.now();

function mark(label: string): void {
  console.log(`web build verify: … ${label} at ${Math.round((Date.now() - startedAt) / 1000)}s`);
}

/**
 * The answer the page is given: unlike the recording in every value, so that
 * anything the recording supplies is visible as not this.
 */
const ANSWER = {
  ok: true,
  asOf: '2026-09-10T06:01:59.047Z',
  repo: 'a-repository/that-is-not-the-fixture',
  branch: 'claude/a-branch-the-recording-never-names',
  head: {
    sha: 'c0ffee11c0ffee11c0ffee11c0ffee11c0ffee11',
    shortSha: 'c0ffee1',
    message: 'A commit the recording never names',
    committedAt: '2026-09-10T05:41:40Z',
  },
  pull: null,
  /**
   * **KP5-07.** `checks` was `null` here, so the only branch of the repair for
   * `KP2-16` that had ever executed was the one that says nothing was read. The
   * counts are deliberately unlike any in the recording, and prime, so a fixture
   * cannot coincide with them.
   */
  checks: { total: 7, passed: 5, failed: 1, running: 1, noResult: 0, runs: [] },
  githubReviews: null,
  keeperVerdict: null,
  keeperVerdictReason: 'No Keeper review record is published where this function can read it.',
  sessionReport: null,
  sessionReportedIn: null,
  sessionReportStatus: 'absent',
  sessionReportReason: 'No session has written .virgil/state.json on this branch.',
};

/**
 * **KP5-08(a): the four states of a session report, of which one was exercised.**
 *
 * `KP4-03` was a false sentence about a refused report, and the repair of that
 * repair was a second false sentence about an absent one. Both were guarded by
 * source-text assertions and neither by anything that ran the page. These are the
 * other three answers, and each names the sentence it must produce.
 */
const REPORT_STATES: { state: string; answer: Record<string, unknown>; must: RegExp }[] = [
  {
    state: 'refused',
    answer: {
      sessionReport: null,
      sessionReportStatus: 'refused',
      sessionReportReason: '.virgil/state.json has no readable time on it.',
    },
    must: /did write a report and this build refused it/i,
  },
  {
    state: 'unreadable',
    answer: {
      sessionReport: null,
      sessionReportStatus: 'unreadable',
      sessionReportReason: '.virgil/state.json is not readable JSON.',
    },
    must: /could not read it/i,
  },
  {
    state: 'read',
    answer: {
      sessionReportStatus: 'read',
      sessionReportReason: null,
      sessionReportedIn: 'd00dfeed'.repeat(5),
      sessionReport: {
        schema: 'virgil.session-status.v1',
        reportedAt: new Date().toISOString(),
        aboutCommit: 'c0ffee11c0ffee11c0ffee11c0ffee11c0ffee11',
        branch: 'claude/a-branch-the-recording-never-names',
        candidate: null,
        holder: 'keeper',
        hops: [
          { role: 'fabricator', activity: 'READY', reported: null, at: null },
          { role: 'prover', activity: 'READY', reported: null, at: null },
          { role: 'keeper', activity: 'WORKING', reported: null, at: new Date().toISOString() },
        ],
        review: null,
        note: 'A session is reviewing.',
      },
    },
    must: /comes from the agents’ own report/i,
  },
];

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

/** Serves the built directory, and answers `/api/state` however this file says. */
function serve(
  state: (branch: string | null) => { status: number; body: string },
): Promise<{ server: Server; url: string }> {
  const server = createServer((request, response) => {
    const path = (request.url ?? '/').split('?')[0] ?? '/';
    if (path === '/api/state') {
      /**
       * **The stub is given the branch the page asked for — slice five.**
       *
       * Before this it ignored the query entirely, which would have made a check
       * that the page asks for the chosen branch impossible to write: the answer
       * would have been the same whatever was requested, and the check would
       * have passed a page that never sent the parameter at all.
       */
      const query = (request.url ?? '').split('?')[1] ?? '';
      const asked = new URLSearchParams(query).get('branch');
      askedFor.push(asked);
      const answer = state(asked);
      /**
       * **Answered immediately here, and deliberately not always.**
       *
       * `KP10-02` was found by making this line answer four seconds late, which
       * is what a loaded CI runner does to a local stub. Under that delay eleven
       * assertions across four case families failed against a build that was
       * correct — the badge, the four report states, the Prover's window, the
       * branch-choice badge, the endpoint-failure notice, and the two slice-six
       * threads the reviewer reported. Every one was the same defect: acting on a
       * page whose `/api/state` had not answered yet.
       *
       * Re-inserting a `setTimeout` of a few seconds around these two lines
       * reproduces all of it, and is how a future change to this file should be
       * tested before it is trusted.
       */
      response.writeHead(answer.status, { 'content-type': 'application/json; charset=utf-8' });
      response.end(answer.body);
      return;
    }
    const candidate = path === '/' ? '/owner-v11.html' : path;
    const onDisk = join(outDir, candidate);
    try {
      if (statSync(onDisk).isFile()) {
        response.writeHead(200, {
          'content-type': TYPES[extname(onDisk)] ?? 'application/octet-stream',
          'content-security-policy': CSP,
        });
        response.end(readFileSync(onDisk));
        return;
      }
    } catch {
      // Falls through to the page, as the hosted redirect does.
    }
    response.writeHead(200, {
      'content-type': TYPES['.html'] as string,
      'content-security-policy': CSP,
    });
    response.end(readFileSync(join(outDir, 'owner-v11.html')));
  });
  return new Promise((done) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      done({ server, url: `http://127.0.0.1:${port}/` });
    });
  });
}

const built = readdirSync(outDir);
if (!built.includes('owner-v11.html')) {
  throw new Error(`no hosted build in ${outDir}: run build:web first`);
}
console.log(`web build verify: directory ${outDir}, ${built.length} entries`);
console.log(`web build verify: serving under the site's own CSP — ${CSP}`);

/**
 * **The mirror of the Owner Build's string check.** There these strings must be
 * absent; here they must be present, because their absence would mean `__LIVE__`
 * was false when this was built and the hosted target is a second Owner Build
 * that can do nothing.
 */
{
  const bundle = readdirSync(join(outDir, 'assets'))
    .filter((name) => name.endsWith('.js'))
    .map((name) => readFileSync(join(outDir, 'assets', name), 'utf8'))
    .join('\n');
  for (const needle of ['/api/state', '/api/instruct', 'x-virgil-secret']) {
    if (!bundle.includes(needle)) {
      failures.push(
        `the hosted bundle does not contain ${needle}; was it built with __LIVE__ false?`,
      );
    }
  }
  mark('the bundle carries the live-mode strings the Owner Build must not');
}

let answer: { status: number; body: string } = { status: 200, body: JSON.stringify(ANSWER) };
/** Every branch the page has asked about, in order, so a tap can be proved. */
const askedFor: (string | null)[] = [];
/** Set when a case needs the answer to depend on which branch was asked for. */
type AnswerFor = (branch: string | null) => { status: number; body: string };
let answerFor: AnswerFor | null = null;
const { server, url } = await serve((branch) => {
  const per = answerFor;
  return per ? per(branch) : answer;
});

// The same substitution `verify-owner-build-v11.ts` makes, and for the same
// reason: CI installs the Chromium the lockfile pins, and this container has one
// preinstalled that Playwright will not find on its own.
const preinstalled =
  process.env.CHROMIUM_EXECUTABLE ??
  (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
    : '/opt/pw-browsers/chromium');
const substituted = existsSync(preinstalled);
const browser = await chromium.launch(substituted ? { executablePath: preinstalled } : {});
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

/**
 * **Waits are measured in this machine's frames, not in seconds — K11-04, which
 * `verify-owner-build-v11.ts` learned and this file did not.**
 *
 * The first version used `page.waitForTimeout(3000)` and Playwright's 30-second
 * default. It passed here, where a frame takes about 1.5 s, and failed in CI,
 * where a frame takes 6.7 s: `page.click('.v11-badge')` found the element,
 * called it visible, enabled and stable, and then timed out *performing the
 * click*, because a WebGL render loop at 6.7 s a frame starves the main thread
 * that has to answer it. A false failure on a working page, which is exactly
 * what that finding is about.
 *
 * So the deadline is derived from the machine: six frames are timed, and every
 * wait is given thirty of them or sixty seconds, whichever is longer. A slower
 * machine is given proportionally longer rather than being called broken.
 */
async function framePeriodMs(): Promise<number> {
  const started = Date.now();
  // One `evaluate` per frame, and **no named inner function**: `tsx` compiles a
  // named arrow into an esbuild `__name(...)` call that is not defined inside
  // the page. `verify-owner-build-v11.ts` records that exact failure above its
  // own `frames`, and the first version of this function reproduced it anyway.
  // The per-frame round trip makes the estimate a little long, which errs
  // towards a longer budget and is the safe direction.
  for (let i = 0; i < 6; i += 1) {
    await page.evaluate(
      () =>
        new Promise<void>((done) => {
          requestAnimationFrame(() => done());
        }),
    );
  }
  return Math.max(16, (Date.now() - started) / 6);
}

/**
 * A press that survives a starved main thread.
 *
 * A real `page.click` is tried first, because it is the thing the owner does and
 * it exercises hit-testing. If the render loop is busy enough that Playwright
 * cannot land it inside the budget, the click is dispatched on the element
 * instead — weaker, and **said so in the output** rather than passed off as the
 * same thing. What that fallback still proves is what this file is about: that
 * pressing the control shows what the page read. Whether the control is big
 * enough and where it sits are measured by `verify-owner-build-v11.ts` at three
 * viewports, which is the right place for them.
 */
const dispatched: string[] = [];

async function press(selector: string): Promise<void> {
  try {
    await page.click(selector);
  } catch (error) {
    /**
     * **KP5-02, three faults in one `catch`.**
     *
     * The first version caught everything, announced *"would not take a real
     * click inside the budget"* — a cause it could not know — and passed. The
     * Keeper proved it by covering the page with a transparent overlay, on which
     * nothing can be pressed, and getting `PASS` and exit 0. Interception,
     * invisibility, detachment and a viewport miss are all real defects on a page
     * the owner presses with his thumb, and all four became a pass.
     *
     * So: the fallback is for a **timeout** and nothing else — anything that is
     * not a timeout is a failure, with Playwright's own message kept. The
     * reported cause is the message rather than a guess. And every fallback is
     * counted into the final line, so a result that says PASS says what kind of
     * PASS it is.
     */
    const message = error instanceof Error ? error.message : String(error);
    if (!/Timeout \d+ms exceeded/.test(message)) {
      failures.push(`${selector} could not be pressed: ${message.split('\n')[0]}`);
      return;
    }
    /**
     * **A timeout is not enough to justify the fallback, which the first repair
     * of KP5-02 assumed.** Playwright retries a click on a covered element until
     * the deadline, so an overlay nothing can be pressed through produces the
     * same `Timeout` as a starved main thread — the Keeper's overlay page still
     * passed, merely with a more honest label.
     *
     * The question that separates them is answerable in one call: is the control
     * the thing at its own centre point? If something else is on top, a person
     * pressing there presses that instead, and the page is broken however fast
     * the machine is. If the control *is* the hit target and the click still
     * timed out, nothing is in its way and the machine is the reason.
     */
    const reach = await page.evaluate((css) => {
      const element = document.querySelector(css) as HTMLElement | null;
      if (!element) return { on: false as const };
      const box = element.getBoundingClientRect();
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      // `top === element` or a child of it. **Not** `top.contains(element)`: an
      // overlay drawn as `body::after` reports `body` as the hit target, and
      // `body` contains every control on the page, so that clause declared a
      // covered button reachable and passed the Keeper's overlay a second time.
      const reachable = top === element || element.contains(top);
      if (!reachable) {
        return {
          on: true as const,
          reachable: false as const,
          covering: `${top?.tagName.toLowerCase() ?? 'nothing'}${top?.className ? `.${String(top.className).split(' ')[0]}` : ''}`,
        };
      }
      element.click();
      return { on: true as const, reachable: true as const };
    }, selector);
    if (!reach.on) {
      failures.push(`${selector} is not on the page at all`);
      return;
    }
    if (!reach.reachable) {
      failures.push(
        `${selector} cannot be pressed: ${reach.covering} is on top of it at its own centre. A control the owner's thumb cannot reach is not a working control, however fast the machine is.`,
      );
      return;
    }
    dispatched.push(selector);
    console.log(
      `web build verify: NOTE — ${selector} timed out taking a real click; dispatched on the element instead. Playwright said: ${message.split('\n')[0]}`,
    );
  }
}

/**
 * **A press on the world, which is not a DOM control and must not be pressed
 * like one.**
 *
 * The 48 px boxes under `[data-touch-target][data-world="1"]` carry
 * `pointer-events: none` deliberately — `mobile.css` calls it *"load-bearing and
 * not a detail: an overlay that took the press would take it from the camera"*.
 * The product's hit test runs on the stage, from a real pointer press, and asks
 * `targetAt(x, y)` which box the point fell in. So `page.click(selector)` can
 * never land on one: Playwright waits for an element that by design receives no
 * pointer events, times out, and `press`'s fallback then correctly reports the
 * canvas as being on top of it. The page was right; this check was wrong.
 *
 * This presses where the box is, the way a thumb does — move, down, up — and
 * still refuses when something is really in the way: the point must belong to
 * the canvas, because pressing the world means pressing the world. An overlay
 * over the page is reported here, not pressed through.
 */
async function pressWorld(id: string): Promise<boolean> {
  const at = await page.evaluate((target) => {
    const node = document.querySelector(
      `[data-touch-target="${target}"][data-world="1"]`,
    ) as HTMLElement | null;
    if (!node) return { on: false as const };
    if (node.style.display === 'none') return { on: true as const, shown: false as const };
    const box = node.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const top = document.elementFromPoint(x, y);
    return {
      on: true as const,
      shown: true as const,
      x,
      y,
      canvas: top?.tagName === 'CANVAS',
      covering: `${top?.tagName.toLowerCase() ?? 'nothing'}${top?.className ? `.${String(top.className).split(' ')[0]}` : ''}`,
    };
  }, id);
  if (!at.on) {
    failures.push(`the world has no ${id} to press`);
    return false;
  }
  if (!at.shown) {
    failures.push(`${id} is not on screen, so nothing can press it`);
    return false;
  }
  if (!at.canvas) {
    failures.push(
      `${id} cannot be pressed: ${at.covering} is on top of the world at that point, so a thumb there presses that instead`,
    );
    return false;
  }
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.up();
  return true;
}

/**
 * Waits for the camera to stop, and says whether it did.
 *
 * Not politeness. A press counts as a tap only if the camera did not move
 * during it — `gesture.ts`, `CAMERA_SLOP` of 0.005 world units, on the reasoning
 * that the surest evidence a gesture was navigation is that it navigated. Press
 * the Prover's screen while the camera is still travelling towards him and the
 * press is correctly refused, and the window never opens.
 *
 * What is observable from outside is where the world's own targets are drawn:
 * they are projected through the camera every frame, so they stop moving exactly
 * when it does. Repeated identical samples, inside the frame-derived budget — a
 * condition, not an interval.
 */
async function worldStill(budget: number): Promise<boolean> {
  const deadline = Date.now() + budget;
  let last = '';
  let same = 0;
  while (Date.now() < deadline) {
    const now = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-touch-target][data-world="1"]'))
        .map((node) => {
          const element = node as HTMLElement;
          if (element.style.display === 'none') return '';
          const box = element.getBoundingClientRect();
          return `${element.dataset.touchTarget}:${Math.round(box.left)},${Math.round(box.top)}`;
        })
        .join('|'),
    );
    if (now.replace(/\|/g, '').length > 0 && now === last) {
      same += 1;
      if (same >= 2) return true;
    } else {
      same = 0;
    }
    last = now;
    await page.waitForTimeout(100);
  }
  return false;
}

/**
 * The open window's text, and **only when a person could actually read it** —
 * the Keeper's KP7-05.
 *
 * The first version of the slice-four case asked for `.v11w-sheet`'s `innerText`
 * and asserted against that. `innerText` falls back to `textContent` for an
 * element that is not being rendered, so a sheet that opened in state and was
 * hidden, clipped, or translated off screen satisfied every assertion in the
 * case. That is the KP5-02 family again — a check that passes a page nobody
 * could use — in the file whose whole subject is not doing that.
 *
 * So the sheet must be on screen and be the thing at its own centre point before
 * a word of it is read. Returns `null` with the reason pushed as a failure when
 * it is not.
 */
/**
 * **The world is drawn *and* the endpoint has answered — the root of `KP10-02`.**
 *
 * Nine places in this file waited for `document.querySelectorAll('canvas')` after
 * navigating and then acted. A canvas appears as soon as the world draws, which
 * is before `/api/state` has said anything — so every one of them could act on a
 * page that had read nothing yet.
 *
 * The reviewer found two. Reproducing the condition — the stub answering four
 * seconds late, which is what a loaded runner does — found it in the badge
 * cases, the four report-state cases, and the Prover's, where the page correctly
 * covers the world with `.v11-live-notice` while it has nothing, so a press on
 * the Prover is correctly refused and the check reads that as a defect.
 *
 * `.v11-live-notice` is the page saying it has nothing to draw. Its absence,
 * with a canvas present, is the page saying it has an answer. That is the
 * condition these cases always meant, and it is one line rather than nine.
 *
 * **Not for the cases whose whole subject is an unreadable answer** — those wait
 * for the notice to *appear*, and are right to.
 */
async function worldReady(wait: number): Promise<boolean> {
  return page
    .waitForFunction(
      () =>
        document.querySelectorAll('canvas').length > 0 &&
        document.querySelector('.v11-live-notice') === null,
      undefined,
      { timeout: wait },
    )
    .then(() => true)
    .catch(() => false);
}

/**
 * **Reads the badge, and not before the endpoint has answered — `KP10-02`, one
 * case family wider than it was found.**
 *
 * The reviewer found the race in the two slice-six cases. Reproducing it — by
 * making the stub answer four seconds late, which is what a loaded CI runner
 * does — showed the badge and report-state cases have exactly the same defect:
 * they press and read with only a canvas wait between, and a canvas appears
 * before `/api/state` has said anything. Under that delay eight of them failed
 * against a correct build, with the badge reading *"branch —, read from GitHub
 * never yet"* — the page honestly saying it had nothing yet, and the check
 * calling that a lie.
 *
 * Fixing only the two that were reported would have left the same fault in the
 * same file, already known, which is the shape of every finding this file keeps
 * producing.
 */
async function readBadge(marker: string | RegExp, what: string, wait: number): Promise<string> {
  await press('.v11-badge');
  // Tolerant, as before: when `press` has already refused — a control nothing
  // can reach — the panel never opens, and the run must end with that finding
  // rather than a stack trace about a selector.
  await page
    .waitForSelector('.v11-badge-body', { state: 'visible', timeout: wait })
    .catch(() => {});
  await page
    .waitForFunction(
      (needle: string) => {
        const text =
          (document.querySelector('.v11-badge-body') as HTMLElement | null)?.innerText ?? '';
        return needle.startsWith('re:')
          ? new RegExp(needle.slice(3)).test(text)
          : text.includes(needle);
      },
      marker instanceof RegExp ? `re:${marker.source}` : marker,
      { timeout: wait },
    )
    .catch(() => {
      // Not a failure here. The assertions that follow say precisely what was
      // missing; this only stops them being asked too early.
      void what;
    });
  return page.evaluate(
    () => (document.querySelector('.v11-badge-body') as HTMLElement | null)?.innerText ?? '',
  );
}

/**
 * **Opens a window the way a person does, and does not read it until it is
 * actually there — `KP10-02`.**
 *
 * The slice-six cases pressed `.v11-talk` and read the sheet with nothing
 * between them but a wait for a canvas. A canvas appears as soon as the world
 * draws; the conversation appears only once `/api/state` has answered. On a busy
 * machine the read landed between the two, the thread was drawn by
 * `nothingSaidYet` — one turn, which is exactly the `1 messages` the failure
 * reported — and ten assertions failed against a build that was correct.
 *
 * It is `K11-04` for the third time in this file, and the second time in the
 * commit that repaired it 150 lines above for the branch list, in a paragraph
 * saying a check that reddens for how busy the machine is "teaches everyone to
 * ignore it". A reviewer found it by running the candidate's own acceptance
 * check in CI, where this file had never run.
 *
 * So it is a helper rather than two patched call sites. Three conditions, in the
 * order they become true, each a **positive** signal so a premature read cannot
 * pass by being early:
 *
 *  1. the press is read and the window the product opens is the one expected —
 *    the condition the Prover's cases have always waited on and these did not;
 *  2. the sheet is on screen;
 *  3. **something only the answer being present can produce** is in it.
 *
 * A timeout on (3) is a real failure and is reported as one: it means the page
 * never drew what the endpoint gave it. What it can no longer be is a race.
 */
async function openAndRead(
  control: string,
  agent: string,
  marker: string,
  what: string,
  /** The frame-derived wait, passed in because it is block-scoped below — the
   * same convention `worldStill` follows. */
  wait: number,
): Promise<string | null> {
  await press(control);
  const opened = await page
    .waitForFunction(
      (want) =>
        (window as { __virgilV11?: { window?: string | null } }).__virgilV11?.window === want,
      agent,
      { timeout: wait },
    )
    .then(() => true)
    .catch(() => false);
  if (!opened) {
    const actual = await page.evaluate(
      () => (window as { __virgilV11?: { window?: string | null } }).__virgilV11?.window ?? null,
    );
    failures.push(
      `${what}: pressing ${control} opened ${actual ?? 'no window'}, not the ${agent}’s`,
    );
    return null;
  }
  await page.waitForSelector('.v11w-sheet', { state: 'visible', timeout: wait }).catch(() => {});
  const arrived = await page
    .waitForFunction(
      (needle) =>
        ((document.querySelector('.v11w-sheet') as HTMLElement | null)?.innerText ?? '').includes(
          needle,
        ),
      marker,
      { timeout: wait },
    )
    .then(() => true)
    .catch(() => false);
  if (!arrived) {
    const seen = await page.evaluate(
      () => (document.querySelector('.v11w-sheet') as HTMLElement | null)?.innerText ?? '',
    );
    failures.push(
      `${what}: the window never drew "${marker}", which the answer carried. It shows: "${seen.slice(0, 240)}"`,
    );
    return null;
  }
  return readSheet(what);
}

async function readSheet(what: string): Promise<string | null> {
  return readVisible('.v11w-sheet', what);
}

/**
 * **The same rule for every panel this file reads — the Keeper's KP8-07.**
 *
 * `readSheet` was written for `KP7-05` and closed the hole properly, and then
 * the slice-five cases read `.v11-branches` with a bare `innerText` and did not
 * use it. `innerText` falls back to `textContent` for an element that is not
 * rendered, so a panel hidden by a CSS regression would have satisfied every
 * assertion — including the one whose comment reads *"the way out is on screen
 * without another press"*, which was counting DOM nodes.
 *
 * One helper, taking the selector, so the next panel cannot be read the wrong
 * way by being new.
 */
async function readVisible(selector: string, what: string): Promise<string | null> {
  const seen = await page.evaluate((css) => {
    const sheet = document.querySelector(css) as HTMLElement | null;
    if (!sheet) return { on: false as const };
    const box = sheet.getBoundingClientRect();
    const onScreen =
      box.width > 0 &&
      box.height > 0 &&
      box.right > 0 &&
      box.bottom > 0 &&
      box.left < window.innerWidth &&
      box.top < window.innerHeight;
    const x = Math.min(Math.max(box.left + box.width / 2, 1), window.innerWidth - 1);
    const y = Math.min(Math.max(box.top + box.height / 2, 1), window.innerHeight - 1);
    const top = document.elementFromPoint(x, y);
    const style = window.getComputedStyle(sheet);
    return {
      on: true as const,
      onScreen,
      visible: style.visibility !== 'hidden' && Number(style.opacity) > 0.01,
      reachable: top === sheet || sheet.contains(top),
      covering: `${top?.tagName.toLowerCase() ?? 'nothing'}${top?.className ? `.${String(top.className).split(' ')[0]}` : ''}`,
      box: `${Math.round(box.left)},${Math.round(box.top)} ${Math.round(box.width)}x${Math.round(box.height)}`,
      text: sheet.innerText,
    };
  }, selector);
  if (!seen.on) {
    failures.push(`${what}: no window is on the page at all`);
    return null;
  }
  if (!seen.onScreen) {
    failures.push(`${what}: the window is off screen at ${seen.box}, so nothing in it can be read`);
    return null;
  }
  if (!seen.visible) {
    failures.push(`${what}: the window is on the page but not visible`);
    return null;
  }
  if (!seen.reachable) {
    failures.push(`${what}: ${seen.covering} is on top of the window at its own centre`);
    return null;
  }
  return seen.text;
}

const requested: string[] = [];
page.on('request', (request) => requested.push(new URL(request.url()).pathname));
const consoleErrors: string[] = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  // 1. **It asks**, unprompted. The defect this catches is a transport that
  //    exists and is never called, which shipped once already.
  await page.goto(url, { waitUntil: 'load' });
  // A literal, because the frame-derived budget is measured from this page and
  // does not exist yet. Sixty seconds is the floor that budget itself takes.
  if (!(await worldReady(60_000))) {
    failures.push(
      'the page never finished reading /api/state, so nothing after this is a fact about the product',
    );
  }
  const frame = await framePeriodMs();
  const budget = Math.max(60_000, Math.round(frame * 30));
  context.setDefaultTimeout(budget);
  mark(
    `a frame takes ${Math.round(frame)} ms here, so every wait is given ${Math.round(budget / 1000)}s`,
  );

  // Waited for, not slept through: the request either arrives or the deadline
  // passes, and which happened is the finding.
  const deadline = Date.now() + budget;
  while (!requested.includes('/api/state') && Date.now() < deadline) {
    await page.waitForTimeout(250);
  }
  const asked = requested.filter((path) => path === '/api/state').length;
  if (asked === 0) {
    failures.push('the page never asked for /api/state: the live path is not wired');
  }
  mark(`the page made ${requested.length} requests, ${asked} to /api/state`);

  // 2. **It draws the answer it was given, and no other.** The world is a
  //    canvas, so the readable statement of what was read is the badge — which
  //    is also what the owner taps to find out where the numbers came from, and
  //    therefore the thing that must not be wrong.
  const badge = await readBadge(ANSWER.branch, 'the badge', budget);
  if (!badge.includes(ANSWER.branch)) {
    failures.push(`the badge does not name the branch it was told (${ANSWER.branch})`);
  }
  if (!badge.includes(ANSWER.repo)) {
    failures.push(`the badge does not name the repository it was told (${ANSWER.repo})`);
  }
  if (!/Of 7 checks on this commit, 5 passed, 1 failed, 1 still running/.test(badge)) {
    failures.push(
      `the badge does not report the check counts it was told: "${badge.slice(0, 200)}"`,
    );
  }
  mark('the badge names the branch, the repository and the check counts it was told');

  /**
   * **KP5-08(a).** Each remaining report state, driven through the real page and
   * required to produce its own sentence. The page has said a false thing about
   * two of these states inside the last two days; both times a source-text
   * assertion passed and nothing ran the branch.
   */
  for (const scenario of REPORT_STATES) {
    answer = { status: 200, body: JSON.stringify({ ...ANSWER, ...scenario.answer }) };
    await page.goto(`${url}?state=${scenario.state}`, { waitUntil: 'load' });
    if (!(await worldReady(budget))) {
      failures.push(
        'the page never finished reading /api/state, so nothing after this is a fact about the product',
      );
    }
    const said = await readBadge(scenario.must, `the ${scenario.state} report badge`, budget);
    if (!scenario.must.test(said)) {
      failures.push(
        `with a ${scenario.state} report the badge does not say so (${scenario.must}): "${said.slice(0, 200)}"`,
      );
    }
    // And the sentence for a different state must not appear beside it.
    if (scenario.state !== 'absent' && /No session has written a report/.test(said)) {
      failures.push(`with a ${scenario.state} report the badge also says no session wrote one`);
    }
  }
  answer = { status: 200, body: JSON.stringify(ANSWER) };
  mark(`each of ${REPORT_STATES.length + 1} report states says its own sentence`);

  /**
   * **Phase 2 slice four, proved through the page rather than in a unit test.**
   *
   * `PHASE_2_SLICE_4_BRIEF.md` promised this check by name: *"the hosted page is
   * given a known set of checks by the stub and the window must list exactly
   * those names and states — so the wiring is proved by a check that runs in CI,
   * not by me saying it works."*
   *
   * The names are deliberately unlike anything in the recording, and one check
   * returns a result the constitution has no word for. The window must list the
   * four it can name, and say in a sentence that one returned nothing — never
   * drawing it as `skipped`, which is a different fact.
   */
  const before = failures.length;
  const NAMED_CHECKS = [
    { name: 'a check the recording never names', state: 'passed' },
    { name: 'another the recording never names', state: 'failed' },
    { name: 'a third, still going', state: 'running' },
    { name: 'a fourth, which chose not to run', state: 'skipped' },
    { name: 'a fifth, which returned nothing', state: 'noResult' },
  ];
  answer = {
    status: 200,
    body: JSON.stringify({
      ...ANSWER,
      checks: {
        total: 5,
        passed: 1,
        failed: 1,
        running: 1,
        noResult: 1,
        source: 'check runs',
        runs: NAMED_CHECKS,
      },
    }),
  };
  await page.goto(`${url}?checks=1`, { waitUntil: 'load' });
  if (!(await worldReady(budget))) {
    failures.push(
      'the page never finished reading /api/state, so nothing after this is a fact about the product',
    );
  }
  /**
   * The Prover's window is opened the way a person opens it: two taps on the
   * world — the first travels to him, the second opens the record on his screen.
   * The page's `__virgilV11` hook is deliberately read-only, so no window can be
   * put on screen from outside the product, and that is the right design rather
   * than an obstacle to work around.
   */
  await page.waitForSelector('[data-touch-target="prover"]', { state: 'attached' }).catch(() => {});
  if (!(await worldStill(budget))) {
    failures.push('the world never settled, so no press on it could be read as a tap');
  }
  await pressWorld('prover');
  /**
   * The second tap is the Prover's *screen*, not the Prover again: the owner's
   * two-step rule is tap a character to travel, tap their screen to open the
   * record. Tapping the character twice travels and opens nothing, which is what
   * the rule is for and what the first version of this check got wrong.
   *
   * Two waits stand between the taps, and both are conditions rather than
   * intervals — the K11-04 lesson, in a file that had already learned it once.
   *
   *  - `focus` reaching the Prover is the product agreeing the first tap landed.
   *    It is set when the tap is read, not when the camera arrives.
   *  - `worldStill` is the camera arriving. It matters because a press during a
   *    camera move is not a tap (`gesture.ts`), so the second press would be
   *    refused — correctly — and the window would never open.
   */
  await page
    .waitForFunction(
      () => (window as { __virgilV11?: { focus?: string } }).__virgilV11?.focus === 'prover',
      undefined,
      { timeout: budget },
    )
    .catch(() => {});
  if (!(await worldStill(budget))) {
    failures.push('the camera never stopped after the first tap, so the second could not be one');
  }
  await pressWorld('prover-screen');
  await page
    .waitForFunction(
      () =>
        (window as { __virgilV11?: { window?: string | null } }).__virgilV11?.window === 'prover',
      undefined,
      { timeout: budget },
    )
    .catch(() => {});
  await page.waitForSelector('.v11w-sheet', { state: 'visible' }).catch(() => {});
  const onProver = await page.evaluate(
    () => (window as { __virgilV11?: { window?: string | null } }).__virgilV11?.window ?? null,
  );
  if (onProver !== 'prover') {
    failures.push(
      `two taps on the Prover opened ${onProver ?? 'no window'} rather than the Prover’s`,
    );
  }
  const prover = (await readSheet('the Prover’s window')) ?? '';
  for (const check of NAMED_CHECKS.filter((entry) => entry.state !== 'noResult')) {
    if (!prover.includes(check.name)) {
      failures.push(`the Prover’s window does not list "${check.name}", which it was told ran`);
    }
  }
  const nothingReturned = NAMED_CHECKS.find((entry) => entry.state === 'noResult');
  if (nothingReturned && prover.includes(nothingReturned.name)) {
    failures.push(
      `the Prover’s window lists "${nothingReturned.name}" among the checks with a state; it returned nothing and has none`,
    );
  }
  if (!/1 check returned no result/i.test(prover)) {
    failures.push(
      `the Prover’s window does not say a check returned no result: "${prover.slice(0, 240)}"`,
    );
  }
  // The recording's own six checks must not be underneath the live ones: that
  // is the confusion the whole slice exists to prevent, and it would read as a
  // pass against every assertion above.
  if (/biome lint|typecheck domain|unit gate-engine/i.test(prover)) {
    failures.push('the Prover’s window still lists the recording’s checks beside the real ones');
  }
  if (failures.length === before) {
    // Only when it held. Announcing the negative one line above its own failure
    // is KP5-09, and this file had reintroduced it.
    mark(
      `the Prover’s window lists ${NAMED_CHECKS.length - 1} named checks and counts the one with no result`,
    );
  }
  answer = { status: 200, body: JSON.stringify(ANSWER) };

  /**
   * **The other half of the same brief sentence, and the Keeper's KP7-01.**
   *
   * `PHASE_2_SLICE_4_BRIEF.md`: *"It draws nothing when nothing was read. If the
   * checks cannot be fetched, the window says they were not read — not zero, not
   * empty, not `skipped`."*
   *
   * The first build of the slice failed exactly here, and no check in this
   * repository would have caught it: the window fell through to the recorded
   * document and drew the recording's fourteen invented checks with *"14 checks
   * have run and passed"* marked verified, while the badge on the same page said
   * the results could not be read. The answer below is the one `state.mjs`
   * actually sends when every GitHub source refuses — `ok: true`, `checks: null`,
   * and a reason beside it.
   */
  const beforeUnread = failures.length;
  const WHY =
    'No source could be read: check runs (403), workflow runs (403), commit statuses (403).';
  answer = {
    status: 200,
    body: JSON.stringify({ ...ANSWER, checks: null, checksReason: WHY }),
  };
  await page.goto(`${url}?unread=1`, { waitUntil: 'load' });
  if (!(await worldReady(budget))) {
    failures.push(
      'the page never finished reading /api/state, so nothing after this is a fact about the product',
    );
  }
  await page.waitForSelector('[data-touch-target="prover"]', { state: 'attached' }).catch(() => {});
  if (!(await worldStill(budget))) {
    failures.push('the world never settled, so no press on it could be read as a tap');
  }
  await pressWorld('prover');
  await page
    .waitForFunction(
      () => (window as { __virgilV11?: { focus?: string } }).__virgilV11?.focus === 'prover',
      undefined,
      { timeout: budget },
    )
    .catch(() => {});
  if (!(await worldStill(budget))) {
    failures.push('the camera never stopped after the first tap, so the second could not be one');
  }
  await pressWorld('prover-screen');
  await page
    .waitForFunction(
      () =>
        (window as { __virgilV11?: { window?: string | null } }).__virgilV11?.window === 'prover',
      undefined,
      { timeout: budget },
    )
    .catch(() => {});
  const unread = (await readSheet('the Prover’s window with nothing read')) ?? '';
  // The names the recording invents. Any one of them on a live page is the
  // defect: a fixture drawn where a reader is owed a fact.
  for (const name of [
    'biome lint',
    'typecheck domain',
    'unit gate-engine',
    'unit mission-control',
  ]) {
    if (unread.includes(name)) {
      failures.push(
        `with no checks read, the Prover’s window draws the recording’s "${name}" — a fixture where a fact is owed`,
      );
    }
  }
  if (!/could not be read this time, so none are shown/i.test(unread)) {
    failures.push(
      `with no checks read, the Prover’s window does not say they were not read: "${unread.slice(0, 240)}"`,
    );
  }
  if (!unread.includes(WHY)) {
    failures.push('the Prover’s window does not name which sources refused, which the answer said');
  }
  // "0 of 14" and "all passed" are both claims about checks nobody read.
  if (/\b\d+ checks have run and passed\b|\ball \d+ checks? passed\b/i.test(unread)) {
    failures.push(
      `with no checks read, the Prover’s window still counts checks: "${unread.slice(0, 240)}"`,
    );
  }
  if (failures.length === beforeUnread) {
    mark('with nothing read, the Prover’s window says so and draws none of the recording’s checks');
  }
  answer = { status: 200, body: JSON.stringify(ANSWER) };

  /**
   * **Phase 2 slice five, proved on the page rather than described.**
   *
   * `PHASE_2_SLICE_5_BRIEF.md` promised these by name: the page lists exactly the
   * branches the stub names; choosing one changes which branch the room reads;
   * and a branch that no longer exists produces a message and a **working list**
   * rather than a dead page.
   *
   * That last one is not a hypothetical. On 2026-09-11 a merged branch was
   * deleted and this site went dark three separate times, because three places
   * had its name written down. This is the executable check that the app's share
   * of that cannot come back.
   */
  const beforeBranches = failures.length;
  const BRANCHES = [
    {
      name: 'main',
      sha: 'a'.repeat(40),
      shortSha: 'aaaaaaa',
      isDefault: true,
      protected: true,
      pull: null,
      updatedAt: null,
    },
    {
      name: 'claude/a-branch-the-recording-never-names',
      sha: 'b'.repeat(40),
      shortSha: 'bbbbbbb',
      isDefault: false,
      protected: false,
      pull: {
        number: 99,
        title: 'Something in flight',
        draft: false,
        url: 'https://example.invalid/99',
        updatedAt: '2026-09-11T12:00:00Z',
      },
      updatedAt: '2026-09-11T12:00:00Z',
    },
    {
      name: 'claude/one-with-no-pull-request',
      sha: 'c'.repeat(40),
      shortSha: 'ccccccc',
      isDefault: false,
      protected: false,
      pull: null,
      updatedAt: null,
    },
  ];
  const listed = {
    branches: BRANCHES,
    branchesReason: null,
    branchesTotal: 11,
    branchesWatched: 8,
    defaultBranch: 'main',
    branchExists: true,
  };
  /**
   * The answer now depends on which branch was asked for, which is the only way
   * to tell a page that really re-reads from one that merely repaints a label.
   * Each branch reports a commit message only it could have.
   */
  const SAID: Record<string, string> = {
    main: 'the commit that only main has',
    'claude/a-branch-the-recording-never-names': 'the commit that only the work branch has',
  };
  /**
   * **The Keeper's KP8-04, and why this check could not see it.**
   *
   * This stub used to resolve an omitted `?branch=` to `main` — modelling a
   * server whose default is the default branch, which is the one configuration
   * in which the defect is invisible. The real endpoint resolved an omitted
   * parameter to `GITHUB_BRANCH` first, and the interface sent nothing at all
   * for the default-branch row, so tapping `main` asked for whatever that
   * hosting setting named. On this deployment that is a deleted branch.
   *
   * The stub now answers for a branch nobody wants when the parameter is
   * missing, so a page that fails to name the branch it is asking for draws that
   * branch's commit and the check fails. A stub written in the shape that hides
   * the bug is not a check.
   */
  const IF_NOT_ASKED = 'claude/the-branch-a-hosting-setting-names';
  SAID[IF_NOT_ASKED] = 'the commit of the branch nobody chose';
  answerFor = (asked) => {
    const which = asked ?? IF_NOT_ASKED;
    return {
      status: 200,
      body: JSON.stringify({
        ...ANSWER,
        ...listed,
        branch: which,
        head: { ...ANSWER.head, message: SAID[which] ?? `the commit on ${which}` },
      }),
    };
  };
  askedFor.length = 0;
  await page.goto(`${url}?branches=1`, { waitUntil: 'load' });
  if (!(await worldReady(budget))) {
    failures.push(
      'the page never finished reading /api/state, so nothing after this is a fact about the product',
    );
  }
  await press('[data-touch-target="branches"]');
  await page.waitForSelector('.v11-branch-rows', { state: 'visible' }).catch(() => {});
  const rows = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.v11-branch-row-name')).map(
      (node) => (node as HTMLElement).innerText,
    ),
  );
  for (const entry of BRANCHES) {
    if (!rows.includes(entry.name)) {
      failures.push(`the branch list does not name "${entry.name}", which the answer listed`);
    }
  }
  if (rows.length !== BRANCHES.length) {
    failures.push(
      `the branch list draws ${rows.length} rows for ${BRANCHES.length} branches it was given`,
    );
  }
  await page
    .waitForSelector('.v11-branches', { state: 'visible', timeout: budget })
    .catch(() => {});
  const panel = (await readVisible('.v11-branches', 'the branch list')) ?? '';
  // Eleven exist and eight are carried: a list silently cut is a list lying
  // about what the repository has.
  if (!/11 branches/.test(panel)) {
    failures.push(`the branch list does not say how many branches exist: "${panel.slice(0, 200)}"`);
  }
  // A branch with no pull request has no time on this wire, and must say so
  // rather than showing a blank that reads as "just now".
  if (!/not read/i.test(panel)) {
    failures.push('a branch with no pull request does not say its time was not read');
  }

  /**
   * **The tap, and the only assertion that separates a working choice from a
   * repainted label**: after choosing, the page must *ask* for that branch and
   * must draw what that branch's answer said, not the previous one's.
   */
  await press('[data-touch-target="branch-claude/a-branch-the-recording-never-names"]');
  /**
   * **Waited for the request, not for a word on the page.**
   *
   * The first version of this waited for the chosen branch's commit message to
   * appear in `document.body.innerText`. That message is drawn on the candidate
   * slab, which is **inside the canvas** — so the condition could never become
   * true, the wait burned its whole 60-second budget every run, and the
   * assertions below then passed on their own merits while the check as a whole
   * took seventy-five seconds. A wait that can never succeed is a wait that is
   * measuring nothing, and on a project where a bill has already stopped work
   * once, a minute of CI per run is not free.
   *
   * The condition that actually answers the question is on this side: has the
   * page asked the endpoint for that branch yet?
   */
  {
    const deadline = Date.now() + budget;
    while (
      !askedFor.includes('claude/a-branch-the-recording-never-names') &&
      Date.now() < deadline
    ) {
      await page.waitForTimeout(100);
    }
  }
  if (!askedFor.includes('claude/a-branch-the-recording-never-names')) {
    failures.push(
      `choosing a branch never asked the endpoint for it; it asked for ${JSON.stringify(askedFor)}`,
    );
  }
  // The badge is read only once it carries the branch that was chosen. Reading
  // it the instant the press lands reads the *previous* branch's answer, which
  // is the confusion this whole case exists to catch — in the check rather than
  // in the product.
  const afterTap = await readBadge(
    'claude/a-branch-the-recording-never-names',
    'the badge after choosing a branch',
    budget,
  );
  if (!afterTap.includes('claude/a-branch-the-recording-never-names')) {
    failures.push(
      `after choosing a branch the page still names another: "${afterTap.slice(0, 200)}"`,
    );
  }

  /**
   * **The branch is gone — the failure that took this site down three times in
   * one day.** `ok: true`, the list is real, and the branch asked for is not in
   * it. The page must say so and must still offer the branches that do exist.
   */
  answerFor = () => ({
    status: 200,
    body: JSON.stringify({
      ...ANSWER,
      ...listed,
      branch: 'claude/virgil-mobile-v11',
      branchExists: false,
      head: null,
      checks: null,
      checksReason: 'The branch claude/virgil-mobile-v11 is not in this repository.',
      sessionReport: null,
      sessionReportStatus: 'absent',
    }),
  });
  await page.goto(`${url}?gone=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelectorAll('canvas').length > 0, undefined, {
    timeout: budget,
  });
  await page.waitForSelector('.v11-branch-gone', { state: 'visible' }).catch(() => {});
  const goneText =
    (await readVisible('.v11-branches', 'the branch list with the branch gone')) ?? '';
  if (!/is not in this repository any more/.test(goneText)) {
    failures.push(
      `a deleted branch does not produce a message saying so: "${goneText.slice(0, 200)}"`,
    );
  }
  // The whole point: the way out is on screen without another press.
  const goneRows = await page.evaluate(() => document.querySelectorAll('.v11-branch-row').length);
  if (goneRows !== BRANCHES.length) {
    failures.push(
      `with the branch gone the page offers ${goneRows} branches to switch to, not ${BRANCHES.length}: the dead-page failure is back`,
    );
  }
  // And it must not be dead: the world still draws.
  const stillThere = await page.evaluate(() => document.querySelectorAll('canvas').length);
  if (stillThere === 0) {
    failures.push('with the branch gone the world is not drawn at all');
  }

  /**
   * **The default-branch row selects the default branch — KP8-04.**
   *
   * The row the owner most needs: *"the state of what's been merged"*, the first
   * half of the instruction this slice was built from. It must ask for `main` by
   * name, not by omission, because an omitted parameter is resolved by a hosting
   * setting the app cannot see.
   */
  askedFor.length = 0;
  await press('[data-touch-target="branches"]');
  await page.waitForSelector('.v11-branch-rows', { state: 'visible' }).catch(() => {});
  await press('[data-touch-target="branch-main"]');
  {
    const deadline = Date.now() + budget;
    while (!askedFor.includes('main') && Date.now() < deadline) {
      await page.waitForTimeout(100);
    }
  }
  if (!askedFor.includes('main')) {
    failures.push(
      `tapping the default branch never asked for it by name; it asked for ${JSON.stringify(askedFor)}`,
    );
  }
  await press('.v11-badge');
  const onDefault = (await readVisible('.v11-badge-body', 'the badge')) ?? '';
  if (onDefault.includes(IF_NOT_ASKED)) {
    failures.push(
      'tapping the default branch landed on the branch a hosting setting names, not the default',
    );
  }

  /**
   * **A branch past the eight-row cap still exists — KP8-01.**
   *
   * The cap is a drawing decision. When it was allowed to decide what existed,
   * the ninth branch of nine was reported deleted and the page said it had been
   * "merged and deleted" — about this candidate's own branch, with the panel
   * beneath it simultaneously saying one more branch existed and was not listed.
   */
  const NINE = Array.from({ length: 9 }, (_, i) => ({
    name: i === 0 ? 'main' : `claude/branch-${String(i).padStart(2, '0')}`,
    sha: 'e'.repeat(40),
    shortSha: 'eeeeeee',
    isDefault: i === 0,
    protected: false,
    pull: null,
    updatedAt: null,
  }));
  const PAST_THE_CAP = NINE[8]?.name as string;
  answerFor = (asked) => {
    const which = asked ?? 'main';
    const known = NINE.some((entry) => entry.name === which);
    return {
      status: 200,
      body: JSON.stringify({
        ...ANSWER,
        branch: which,
        branchExists: known,
        defaultBranch: 'main',
        // Eight drawn, nine exist — and the ninth is the one being asked for,
        // which must therefore be pinned into the list it would otherwise miss.
        branches: known ? [...NINE.slice(0, 7), NINE[8]].filter(Boolean) : NINE.slice(0, 8),
        branchesReason: null,
        branchesTotal: 9,
        branchesWatched: 8,
        head: known ? { ...ANSWER.head, message: `the commit on ${which}` } : null,
        checks: known ? ANSWER.checks : null,
      }),
    };
  };
  await page.goto(`${url}?ninth=1&branch=${encodeURIComponent(PAST_THE_CAP)}`, {
    waitUntil: 'load',
  });
  if (!(await worldReady(budget))) {
    failures.push(
      'the page never finished reading /api/state, so nothing after this is a fact about the product',
    );
  }
  /**
   * **Waited for, not assumed — and this went red once before it was.**
   *
   * The read below raced the page's own fetch: `canvas` appears as soon as the
   * world draws, and the branch list appears only once `/api/state` has
   * answered. On a busy machine the read landed in between, `readVisible` found
   * no panel, and the case failed on a build that was correct. A check that goes
   * red for how busy the machine is teaches everyone to ignore it, which is
   * worse than not having it.
   *
   * `K11-04`'s rule, which this file records and had not applied here: wait for
   * the condition, never for an interval, and never for nothing at all.
   */
  const listedPastTheCap = await page
    .waitForSelector('.v11-branches', { state: 'visible', timeout: budget })
    .then(() => true)
    .catch(() => false);
  if (!listedPastTheCap) {
    failures.push('past the cap, the branch list never appeared, so nothing could be read from it');
  }
  const ninth = listedPastTheCap
    ? ((await readVisible('.v11-branches', 'the branch list past the cap')) ?? '')
    : '';
  if (/is not in this repository any more/.test(ninth)) {
    failures.push(
      `a branch past the eight-row cap is reported as deleted: "${ninth.slice(0, 200)}"`,
    );
  }

  /**
   * **A page that read nothing draws no world — KP8-02 and KP8-03.**
   *
   * The `ok: true` answer with no head commit is new, and it walked straight
   * through the one guard that kept a live page which had read nothing from
   * drawing the recording's fixtures: `9abcdef` under *"Exact version being
   * worked on"*, eight invented file paths, a terminal reading `801 passed`,
   * three invented review findings — beside the real name of a branch the same
   * page had just said did not exist.
   */
  answerFor = () => ({
    status: 200,
    body: JSON.stringify({
      ...ANSWER,
      ...listed,
      branch: 'claude/virgil-mobile-v11',
      branchExists: false,
      head: null,
      checks: null,
      sessionReport: null,
      sessionReportStatus: 'absent',
    }),
  });
  await page.goto(`${url}?nohead=1`, { waitUntil: 'load' });
  await page.waitForSelector('.v11-branch-gone', { state: 'visible' }).catch(() => {});
  /**
   * **Read through the world, not through the page text — and the first version
   * of this check was too weak to see its own defect.**
   *
   * It searched `document.body.innerText` for `9abcdef` and the Fabricator's
   * fixtures. `9abcdef` is drawn on a slab **inside the canvas**, where page text
   * cannot reach it, and the window fixtures only enter the DOM once a window is
   * open. So with the guard deliberately removed the check still passed, which
   * is the same species of failure as the defect it is here to catch.
   *
   * What is observable, and is the guarantee itself: with nothing read there is
   * no world, so there is nothing in the world to press and no record to open.
   * The taps are attempted the way a person would, and a window appearing is the
   * failure.
   */
  /**
   * The discriminating signal, and it is a **positive** one so the good case is
   * fast and the bad case cannot pass by being early.
   *
   * With nothing read, `stateFromAnswer` returns `null`, no world is drawn, and
   * `MobileRoom` renders the notice naming the branch that is not there. With
   * the guard removed the world draws instead and this notice never appears — so
   * waiting for it separates the two exactly. The first version of this check
   * asserted the absence of fixtures straight after navigation and passed with
   * the defect deliberately reinstated, because it looked before the world had
   * finished drawing. An absence asserted too early is not an absence, and this
   * file has now made that mistake twice.
   */
  const noticed = await page
    .waitForSelector('.v11-live-notice', { state: 'visible', timeout: budget })
    .then(() => true)
    .catch(() => false);
  if (!noticed) {
    failures.push(
      'with no commit read, the page never said so — it drew a world for a branch it has read nothing about',
    );
  }
  const saidWhich = await page.evaluate(
    () => (document.querySelector('.v11-live-notice') as HTMLElement | null)?.innerText ?? '',
  );
  if (noticed && !/not in this repository/.test(saidWhich)) {
    failures.push(`with no commit read, the page does not say why: "${saidWhich.slice(0, 160)}"`);
  }
  /**
   * **What this check is, and the two things it deliberately is not.**
   *
   * The discriminating assertion is the notice above, and it is exact: with the
   * guard removed the world draws, the notice never appears, and the wait fails.
   * Proved by removing the guard, rebuilding, and watching it go red.
   *
   * It is **not** a count of world targets. Those are projected from fixed
   * anchors by `TouchTargets`, which renders whether or not a world is drawn, so
   * the count is not a fact about whether anything was read — it passed once by
   * timing and failed the honest build on the next run.
   *
   * And it is **not** an attempt to press the world here. The branch panel is
   * open on this page by design, because the branch is gone and the way out must
   * be on screen, so it covers the world — and `pressWorld` correctly refuses,
   * which is the product being right rather than a defect to assert around.
   */
  const opened = await page.evaluate(
    () => (window as { __virgilV11?: { window?: string | null } }).__virgilV11?.window ?? null,
  );
  if (opened !== null) {
    failures.push(`with no commit read, a record window is open: ${opened}`);
  }
  const leaked = await page.evaluate(
    () => (document.querySelector('.v11w-sheet') as HTMLElement | null)?.innerText ?? '',
  );
  for (const fixture of ['9abcdef', '801 passed', 'Files changed', 'KV-01']) {
    if (leaked.includes(fixture)) {
      failures.push(
        `with no commit read, the page draws the recording's "${fixture}" beside a real branch name`,
      );
    }
  }
  // And it is not a dead page: the way out is still on screen.
  const wayOut = await page.evaluate(() => document.querySelectorAll('.v11-branch-row').length);
  if (wayOut === 0) {
    failures.push('with no commit read, the page offers no branch to switch to');
  }

  if (failures.length === beforeBranches) {
    mark(
      `the page lists ${BRANCHES.length} branches, reads the one it is told to, and survives one being deleted`,
    );
  }
  answerFor = null;
  answer = { status: 200, body: JSON.stringify(ANSWER) };

  /**
   * **Phase 2 slice six, proved on the page rather than described.**
   *
   * `PHASE_2_SLICE_6_BRIEF.md` names these by name, under *"How you will know it
   * works, without taking my word"*:
   *
   * > `verify:web` gains a case: a stubbed conversation must be drawn as a
   * > thread, in order, with the in-flight message marked as in flight and never
   * > as answered. A message whose run failed shows as failed, with the reason —
   * > proved by a stub, not by hoping.
   *
   * It is the one surface where an invented line would be read as **Virgil's own
   * words to him**, which is a worse failure than any this file already guards:
   * `SA-U-01` drew eight invented file paths, and he could tell they were
   * invented. He cannot tell that about a sentence addressed to him.
   */
  const beforeTalk = failures.length;
  const TALK = {
    schema: 'virgil.conversation.v1',
    updatedAt: '2026-09-12T05:00:00Z',
    exchanges: [
      {
        id: '801',
        askedAt: '2026-09-12T03:00:00Z',
        question: 'A question only this stub asks',
        state: 'failed',
        answeredAt: '2026-09-12T03:20:00Z',
        answer: null,
        reason: 'A reason only this stub gives',
        runUrl: 'https://example.invalid/actions/runs/801',
      },
      {
        id: '802',
        askedAt: '2026-09-12T04:00:00Z',
        question: 'A second question only this stub asks',
        state: 'answered',
        answeredAt: '2026-09-12T04:06:00Z',
        answer: 'An answer only this stub gives.',
        reason: null,
        runUrl: 'https://example.invalid/actions/runs/802',
      },
      {
        id: '803',
        askedAt: '2026-09-12T05:00:00Z',
        question: 'A third question, still being worked',
        state: 'asked',
        answeredAt: null,
        answer: null,
        reason: null,
        runUrl: 'https://example.invalid/actions/runs/803',
      },
    ],
  };
  answer = {
    status: 200,
    body: JSON.stringify({
      ...ANSWER,
      conversation: TALK,
      conversationStatus: 'read',
      conversationReason: null,
    }),
  };
  await page.goto(`${url}?talk=1`, { waitUntil: 'load' });
  if (!(await worldReady(budget))) {
    failures.push(
      'the page never finished reading /api/state, so nothing after this is a fact about the product',
    );
  }
  // The dock button, not a world target: "Talk to Virgil" is how a person opens
  // this, and pressing it the way a person does is the point of this file. The
  // marker is the oldest exchange the stub carries, so the wait ends only when
  // the whole thread has been drawn rather than the first line of it.
  const thread =
    (await openAndRead(
      '.v11-talk',
      'virgil',
      'A question only this stub asks',
      'Virgil’s window with a conversation',
      budget,
    )) ?? '';

  for (const said of [
    'A question only this stub asks',
    'A reason only this stub gives',
    'A second question only this stub asks',
    'An answer only this stub gives.',
    'A third question, still being worked',
  ]) {
    if (!thread.includes(said)) {
      failures.push(`the thread does not draw "${said}", which the answer carried`);
    }
  }

  /**
   * **Order, read off the page.** A thread out of order is a different
   * conversation: an answer above its question reads as Virgil having
   * anticipated it.
   */
  const positions = [
    'A question only this stub asks',
    'A reason only this stub gives',
    'A second question only this stub asks',
    'An answer only this stub gives.',
    'A third question, still being worked',
  ].map((said) => thread.indexOf(said));
  for (let i = 1; i < positions.length; i += 1) {
    const here = positions[i] ?? -1;
    const before = positions[i - 1] ?? -1;
    if (here >= 0 && before >= 0 && here < before) {
      failures.push(`the thread draws message ${i} before message ${i - 1}: it is out of order`);
    }
  }

  /**
   * **The in-flight message is marked in flight, and is never an answer.**
   *
   * Read from the DOM rather than from the prose, because "it says it is
   * working" and "the interface knows it is unfinished" are different claims and
   * only the second survives someone rewording the sentence.
   */
  const inFlight = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('.v11w-turn'));
    const working = nodes.find((node) =>
      (node as HTMLElement).innerText.includes('A session is working on this'),
    );
    return {
      found: working !== undefined,
      // `v11w-streaming` is set from `message.streaming` and nothing else, and
      // `still arriving` is what a person reads. Both, because the class alone
      // could be styled to nothing and the words alone could be typed by hand.
      marked: working?.classList.contains('v11w-streaming') === true,
      says: (working as HTMLElement | undefined)?.innerText.includes('still arriving') === true,
      messages: nodes.length,
      // Which speaker each message is from, in order — the failure must not be
      // in Virgil's voice.
      from: nodes.map((node) =>
        Array.from(node.classList)
          .find((name) => name.startsWith('is-'))
          ?.slice(3),
      ),
    };
  });
  if (!inFlight.found) {
    failures.push('the message still being worked is not drawn as being worked at all');
  }
  if (inFlight.found && !inFlight.marked) {
    failures.push('the message still being worked is not marked as unfinished by the interface');
  }
  if (inFlight.found && !inFlight.says) {
    failures.push('the message still being worked does not tell the owner it is still arriving');
  }
  if (
    inFlight.messages === 6 &&
    inFlight.from.join(',') !== 'owner,system,owner,virgil,owner,virgil'
  ) {
    // A run that died is not Virgil speaking. Putting it in his voice would make
    // the machinery sound like someone who had considered the question.
    failures.push(
      `the thread attributes its messages to ${JSON.stringify(inFlight.from)}, which is not who said them`,
    );
  }
  // Six messages: three questions, one failure, one answer, one in flight.
  if (inFlight.messages !== 6) {
    failures.push(
      `the thread draws ${inFlight.messages} messages for three exchanges; six were expected`,
    );
  }
  // And nothing anywhere claims an answer for it.
  if (
    /A third question, still being worked[\s\S]{0,400}An answer only this stub gives/.test(thread)
  ) {
    failures.push(
      'the in-flight message is followed by an answer that belongs to another exchange',
    );
  }

  /**
   * **Not one line of the recording's scripted thread.** The failure this file
   * exists for, on the surface where it would be least visible: these sentences
   * are plausible, addressed to him, and written by nobody.
   */
  for (const scripted of [
    'Good evening',
    'I’ve given the Fabricator the task',
    'The Prover is running the checks',
  ]) {
    if (thread.includes(scripted)) {
      failures.push(`the live thread drew the recording's scripted line "${scripted}"`);
    }
  }

  if (failures.length === beforeTalk) {
    mark('a conversation is drawn as a thread, in order, with the unfinished one unfinished');
  }

  /**
   * **And a conversation that could not be read is not a conversation with
   * nothing in it.** The same distinction the checks and the session report are
   * held to, on the surface the owner will use most.
   */
  const beforeUnreadTalk = failures.length;
  answer = {
    status: 200,
    body: JSON.stringify({
      ...ANSWER,
      conversation: null,
      conversationStatus: 'unreadable',
      conversationReason: 'A refusal only this stub gives.',
    }),
  };
  await page.goto(`${url}?talkgone=1`, { waitUntil: 'load' });
  if (!(await worldReady(budget))) {
    failures.push(
      'the page never finished reading /api/state, so nothing after this is a fact about the product',
    );
  }
  // The marker here is the refusal's own sentence, for the same reason: the
  // window opens before the endpoint answers, and the state before the answer
  // and the state this case is about both draw a single system turn.
  const unreadThread =
    (await openAndRead(
      '.v11-talk',
      'virgil',
      'A refusal only this stub gives.',
      'Virgil’s window with nothing read',
      budget,
    )) ?? '';
  if (!/could not be read/i.test(unreadThread)) {
    failures.push(
      `with no conversation read, the window does not say so: "${unreadThread.slice(0, 240)}"`,
    );
  }
  if (!unreadThread.includes('A refusal only this stub gives.')) {
    failures.push('with no conversation read, the window does not say why, which the answer said');
  }
  if (/Nothing has been said on this branch yet/.test(unreadThread)) {
    failures.push('a conversation that could not be read is drawn as nobody having said anything');
  }
  for (const said of ['An answer only this stub gives.', 'A reason only this stub gives']) {
    if (unreadThread.includes(said)) {
      failures.push(
        `with no conversation read, the window still draws "${said}" from the last one`,
      );
    }
  }
  if (failures.length === beforeUnreadTalk) {
    mark('a conversation that could not be read says so, and draws none of the previous one');
  }
  answer = { status: 200, body: JSON.stringify(ANSWER) };

  // Console errors are counted for the good answer only: the next phase makes
  // the endpoint fail on purpose and the browser logs that failed fetch.
  // Counting it would be counting this check's own stimulus as a defect.
  for (const error of consoleErrors.slice(0, 5)) failures.push(`console error: ${error}`);

  /**
   * 3. **It stays honest when the answer fails** — the owner's own finding, as
   *    an executable check. He opened the app and found `FILES CHANGED 0 / 8`
   *    under a badge saying the numbers came from GitHub: a screen filling its
   *    quiet with the recording.
   *
   *    **The first version of this asserted that no world would be drawn at all,
   *    and that was wrong about the product rather than a finding against it.**
   *    The room draws an empty world with a notice over it, which is a better
   *    answer than a blank page and is what the code has always said it does.
   *    The assertion is now the one that matters: the window is made of text,
   *    and no recorded value may appear in it.
   *
   *    What this does **not** reach: the values drawn inside the canvas, which
   *    no DOM query can see. Those are held by `screen-content-v11.test.ts`
   *    against a rendering harness that can. Said plainly, because a check that
   *    looks like it covers the screen while covering the text beside it is the
   *    half-coverage this repository keeps finding.
   */
  answer = { status: 500, body: JSON.stringify({ ok: false, reason: 'the endpoint failed' }) };
  await page.goto(`${url}?again=1`, { waitUntil: 'load' });
  // The notice exists before it says anything useful — it reads "Reading this
  // repository…" while the request is in flight and only then becomes the
  // refusal. Waiting for the element is waiting for the wrong thing.
  await page
    .waitForFunction(
      () =>
        /could not be read/i.test(
          (document.querySelector('.v11-live-notice') as HTMLElement | null)?.innerText ?? '',
        ),
      undefined,
      { timeout: budget },
    )
    .catch(() => {});
  const notice = await page.evaluate(
    () => (document.querySelector('.v11-live-notice') as HTMLElement | null)?.innerText ?? '',
  );
  if (!/could not be read/i.test(notice)) {
    failures.push(`with the endpoint failing, the page shows no notice saying so: "${notice}"`);
  }

  await press('.v11-talk');
  await page.waitForSelector('.v11w-sheet', { state: 'visible' }).catch(() => {});
  const windowText = await page.evaluate(
    () => (document.querySelector('.v11w-sheet') as HTMLElement | null)?.innerText ?? '',
  );
  if (windowText.length < 50) {
    failures.push('with the endpoint failing, no window opened to be checked');
  }
  const recorded = [
    /(^|\W)0 \/ 8(\W|$)/,
    /(^|\W)0 \/ 3(\W|$)/,
    /14 required/,
    /EVIDENCE LOCKED/,
    /NON-BLOCKING/,
  ];
  for (const value of recorded) {
    if (value.test(windowText)) {
      failures.push(`with the endpoint failing, the window drew a recorded value: ${value}`);
    }
  }
  mark('a failed answer says so, and the window carries no recorded value');
} finally {
  await browser.close();
  server.close();
}

if (failures.length > 0) {
  console.error('web build verify: FAIL');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  `web build verify: PASS — the page reads /api/state, names what it read, and when it reads nothing it says so and draws no recorded value.${
    dispatched.length > 0
      ? ` ${dispatched.length} control(s) — ${dispatched.join(', ')} — did not take a real click and were dispatched on the element, so this PASS is weaker than a PASS with none.`
      : ' Every control took a real click.'
  }`,
);
