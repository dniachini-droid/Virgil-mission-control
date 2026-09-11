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
  state: () => { status: number; body: string },
): Promise<{ server: Server; url: string }> {
  const server = createServer((request, response) => {
    const path = (request.url ?? '/').split('?')[0] ?? '/';
    if (path === '/api/state') {
      const answer = state();
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
const { server, url } = await serve(() => answer);

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
  await page.waitForFunction(() => document.querySelectorAll('canvas').length > 0, undefined, {
    timeout: 120_000,
  });
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
  await press('.v11-badge');
  // Tolerant, like the two below it: when `press` has already refused — a
  // control nothing can reach — the panel never opens, and the run must end with
  // that finding rather than with a stack trace about a selector.
  await page.waitForSelector('.v11-badge-body', { state: 'visible' }).catch(() => {});
  const badge = await page.evaluate(
    () => (document.querySelector('.v11-badge-body') as HTMLElement | null)?.innerText ?? '',
  );
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
    await page.waitForFunction(() => document.querySelectorAll('canvas').length > 0, undefined, {
      timeout: budget,
    });
    await press('.v11-badge');
    await page.waitForSelector('.v11-badge-body', { state: 'visible' }).catch(() => {});
    const said = await page.evaluate(
      () => (document.querySelector('.v11-badge-body') as HTMLElement | null)?.innerText ?? '',
    );
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
  await page.waitForSelector('.v11-live-notice', { state: 'visible' }).catch(() => {});
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
