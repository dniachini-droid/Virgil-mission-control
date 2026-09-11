/**
 * **The one place that holds the token, and the only thing that talks to
 * GitHub.**
 *
 * Phase 2, slice one (`docs/process/PHASE_2_SLICE_1_BRIEF.md`), authorised by
 * `docs/decisions/OD-0009-netlify-and-phase-2-authorisation.md`.
 *
 * The page may not hold a credential — anyone who opens a page can read
 * everything in it — so the page never talks to GitHub. It asks this function,
 * and this function asks GitHub. The token lives in Netlify's environment
 * settings, put there by the owner. No session creates it, holds it, sees it or
 * writes it anywhere, which is `CLAUDE.md`'s hard limit and OD-0009's explicit
 * exclusion.
 *
 * **Read-only, by construction as well as by intent.** Every request below is a
 * GET. Nothing here creates, updates, merges, comments or labels, and the token
 * the owner installs should be scoped to reading this one repository so that the
 * intent is enforced by GitHub rather than by this file's good behaviour.
 *
 * **What it will not do: translate GitHub's vocabulary into the constitution's.**
 * GitHub knows `APPROVED`, `CHANGES_REQUESTED` and `COMMENTED`. The constitution
 * knows four review verdicts — `PASS`, `PASS_WITH_NON_BLOCKING_FINDINGS`,
 * `BLOCKED`, `INSUFFICIENT_EVIDENCE` — returned by a Keeper reviewing a candidate
 * against an approved contract. They are not the same thing and one does not
 * imply the other: a human clicking Approve on a pull request has not performed a
 * Keeper review, and drawing `PASS` on the verdict slab because someone clicked
 * Approve would be exactly the class of lie this project keeps catching. So this
 * function reports GitHub's own words under GitHub's own name, and reports the
 * Keeper's verdict as **not reported**, which is what it is.
 *
 * **Unknown looks unknown.** Every failure path returns `ok: false` and a reason.
 * It never falls back to a previous value dressed as current, never returns zero
 * where it means "no answer", and always carries the time it looked.
 */

const GITHUB = 'https://api.github.com';

/** How long an answer is reused. GitHub's rate limit is the reason. */
const CACHE_SECONDS = 25;

/** @type {{ at: number, body: string } | null} */
let cached = null;

function iso(ms = Date.now()) {
  return new Date(ms).toISOString();
}

function body(value) {
  return new Response(JSON.stringify(value), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${CACHE_SECONDS}`,
    },
  });
}

function fail(reason) {
  return body({ ok: false, asOf: iso(), reason });
}

async function gh(path, token) {
  const response = await fetch(`${GITHUB}${path}`, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'user-agent': 'virgil-mission-control',
      'x-github-api-version': '2022-11-28',
    },
  });
  if (!response.ok) {
    // The status and the path. Never the token, and never the headers.
    const error = new Error(`GitHub answered ${response.status} for ${path}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

/**
 * **Three sources for the same question, tried in order, and the answer says
 * which one replied.**
 *
 * The owner's token could not be given the `Checks` permission — it was not
 * offered in his account's permission list — so the first source is unavailable
 * to him and would have left the screen permanently blank about the one thing
 * worth watching. `Actions` was offered and gives the workflow runs, which are
 * the CI jobs themselves; commit statuses are the older mechanism and are the
 * last resort.
 *
 * **The source is reported, not hidden.** "Fourteen checks passed" means a
 * different thing depending on where the number came from, and a screen that
 * conceals its provenance is one step from a screen that misstates it.
 */

/** The four states kept apart everywhere: a run that has not finished is not a
 * failure, and one that finished with no conclusion is not a pass. */
function tally(entries) {
  const counted = { total: entries.length, passed: 0, failed: 0, running: 0, noResult: 0 };
  for (const entry of entries) {
    if (entry.state === 'passed') counted.passed += 1;
    else if (entry.state === 'failed') counted.failed += 1;
    else if (entry.state === 'running') counted.running += 1;
    else counted.noResult += 1;
  }
  return counted;
}

function fromCheckRuns(runs) {
  return runs.map((run) => ({
    name: run.name,
    state:
      run.status !== 'completed'
        ? 'running'
        : run.conclusion === 'success'
          ? 'passed'
          : run.conclusion === 'failure' || run.conclusion === 'timed_out'
            ? 'failed'
            : 'noResult',
    detail: run.conclusion ?? run.status,
    url: run.html_url ?? null,
  }));
}

function fromWorkflowRuns(runs) {
  return runs.map((run) => ({
    name: run.name ?? run.display_title ?? 'workflow',
    state:
      run.status !== 'completed'
        ? 'running'
        : run.conclusion === 'success'
          ? 'passed'
          : run.conclusion === 'failure' || run.conclusion === 'timed_out'
            ? 'failed'
            : 'noResult',
    detail: run.conclusion ?? run.status,
    url: run.html_url ?? null,
  }));
}

function fromStatuses(statuses) {
  return statuses.map((status) => ({
    name: status.context,
    state:
      status.state === 'success'
        ? 'passed'
        : status.state === 'failure' || status.state === 'error'
          ? 'failed'
          : status.state === 'pending'
            ? 'running'
            : 'noResult',
    detail: status.state,
    url: status.target_url ?? null,
  }));
}

/**
 * Asks each source in turn and returns the first that answers, with its name.
 * A source that refuses the token is skipped; a source that answers with an
 * empty list has answered, and "no checks ran on this commit" is a real answer
 * and is not the same as "could not read".
 */
async function readChecks(repo, sha, token) {
  const attempts = [
    {
      source: 'check runs',
      read: async () => {
        const body = await gh(`/repos/${repo}/commits/${sha}/check-runs?per_page=100`, token);
        return fromCheckRuns(body.check_runs ?? []);
      },
    },
    {
      source: 'workflow runs',
      read: async () => {
        const body = await gh(`/repos/${repo}/actions/runs?head_sha=${sha}&per_page=50`, token);
        return fromWorkflowRuns(body.workflow_runs ?? []);
      },
    },
    {
      source: 'commit statuses',
      read: async () => {
        const body = await gh(`/repos/${repo}/commits/${sha}/status`, token);
        return fromStatuses(body.statuses ?? []);
      },
    },
  ];
  const refused = [];
  for (const attempt of attempts) {
    try {
      const entries = await attempt.read();
      return { source: attempt.source, entries, ...tally(entries) };
    } catch (error) {
      refused.push(`${attempt.source} (${error?.status ?? 'no status'})`);
    }
  }
  return { unreadable: `No source could be read: ${refused.join(', ')}.` };
}

/**
 * **The sessions' own report, and the commit it was committed in.**
 *
 * Phase 2 slice two. GitHub cannot see an agent, so what the agents are doing is
 * reported into `.virgil/state.json` by the sessions doing the work
 * (`packages/agent-contracts/src/live.ts`, schema `virgil.session-status.v1`).
 *
 * **It is returned as a claim and labelled as one.** `CLAUDE.md`: a builder's
 * success report is not evidence. So this does not merge the report into the
 * facts above it — the two travel separately in the answer, under different
 * names, and the surfaces are required to draw them differently. What makes the
 * claim worth carrying at all is that it is traceable: `reportedIn` is the
 * commit the file was last changed in, so the owner can open exactly the version
 * the screen is drawing.
 *
 * A file that is missing, unreadable, not JSON, or of a schema version this
 * function does not recognise is **not** a reason to show nothing else. It comes
 * back null with a reason, and the room stays at rest, which is what it looks
 * like when nobody has said anything.
 */
/**
 * **The shape check that runs on the wire, and the whole of it.**
 *
 * `.virgil/state.json` is written by a session about itself, which makes it a
 * claim rather than evidence, and the surfaces draw it. Zod is not reachable
 * from here — a Netlify function is deployed on its own, with no bundler and no
 * workspace resolution — so `SessionStatusReport` is re-implemented by hand, and
 * a second implementation of an intent is free to drift from the first.
 *
 * **The Keeper's KP3-05.** The drift test that guarded this used nine cases
 * written by hand, which proved the two agreed on nine reports and was described
 * as though it proved they agreed. It did not: when the pairing was replaced by
 * cases generated from the report's own shape, the two disagreed on **106** of
 * them. Every field below carries the repair for one family of those — the
 * timestamps that were any string at all, the counts and the note that were
 * unchecked, the record path that could be `/etc/passwd`, the keys that could be
 * missing, the unknown keys that travelled through a schema declared `.strict()`,
 * and a `holder` this refused while the schema allowed it.
 *
 * The generator is `apps/mission-control/test/live-state-v11.test.ts`. It is not
 * a proof of equivalence either — it tests the values it generates — but it is
 * the difference between agreeing on nine reports and agreeing on some hundreds,
 * and it fails the moment one side moves without the other.
 */
export function shapeComplaint(report) {
  const isString = (value) => typeof value === 'string' && value.length > 0;
  const isSha = (value) => typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
  /**
   * ISO-8601 with an offset, which is what `Timestamp` in `common.ts` is.
   *
   * **The reason first given here was false, and the Keeper's KP4-05 caught it.**
   * It said `liveState.ts` would read an unparseable timestamp as *fresh*. It
   * would not: `reportIsCurrent` opens with `if (Number.isNaN(at)) return false`,
   * and even without that line the comparison against `NaN` is `false`, which is
   * *not current* — the opposite of what was claimed. A comment asserting a
   * defect that does not exist is the same species of artefact as one asserting
   * a guard that does not exist, and this file has been the subject of both.
   *
   * The true reason is narrower and is enough. The schema requires an instant
   * and this must refuse exactly what the schema refuses, or the two disagree
   * about a report and which is right depends on which you ask. Beyond that, a
   * timestamp is the only thing in the report that says *when*, and a reader
   * downstream of this one — a future one, not `reportIsCurrent` — has no way to
   * tell a broken clock from an old one if this admits both.
   */
  const isInstant = (value) =>
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?(Z|[+-]([01]\d|2[0-3]):[0-5]\d)$/.test(
      value,
    ) &&
    !Number.isNaN(Date.parse(value)) &&
    /**
     * A date that exists. `2026-02-30` matches the shape, parses without error
     * and rolls forward to 2 March — so it passed here while the schema refused
     * it. One of the two divergences `KP4-09` found outside the generated
     * battery.
     *
     * **And the first repair of it opened a third, in the other direction —
     * `KP5-04`.** It compared `new Date(value).toISOString()`, which is UTC,
     * against the date written in the string, which is local to its offset. So
     * every legal timestamp whose offset carries it over a UTC date boundary —
     * `2026-09-10T01:00:00+05:00` — was refused on the wire and accepted by the
     * schema. The generated battery could not see it: of 57 values it holds one
     * offset, `+00:00`, whose UTC date never differs.
     *
     * The calendar check is done in the timezone the string is written in. The
     * parts are compared against `Date.UTC` of the same parts, which is the same
     * arithmetic the calendar is, and no offset enters it.
     */
    (() => {
      const year = Number(value.slice(0, 4));
      const month = Number(value.slice(5, 7));
      const day = Number(value.slice(8, 10));
      const asDate = new Date(Date.UTC(year, month - 1, day));
      return (
        asDate.getUTCFullYear() === year &&
        asDate.getUTCMonth() === month - 1 &&
        asDate.getUTCDate() === day
      );
    })();
  // Safe, not merely integral: `2 ** 53` is an integer to JavaScript and is not
  // one the schema accepts. KP4-09's second divergence.
  const isCount = (value) => Number.isSafeInteger(value) && value >= 0;
  /**
   * `normaliseRepoPath` from `packages/agent-contracts/src/paths.ts`, ported
   * rather than imported for the reason at the head of this function. It refuses
   * what that refuses: absolute, home-relative, drive-lettered, URL, backslashed,
   * percent-encoded, whitespaced, traversing, globbed, or resolving to the root.
   */
  const isRepoPath = (value) => {
    if (typeof value !== 'string' || value.length === 0 || value.length > 4096) return false;
    if (value.includes('\0') || value.includes('\\')) return false;
    if (/%(2e|2f|5c|00)/i.test(value)) return false;
    if (/^[A-Za-z]:/.test(value)) return false;
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return false;
    if (value.startsWith('/') || value.startsWith('~')) return false;
    if (/\s/.test(value)) return false;
    let segments = 0;
    for (const segment of value.split('/')) {
      if (segment === '' || segment === '.') continue;
      if (segment === '..' || /^\.{3,}$/.test(segment) || segment.includes('*')) return false;
      segments += 1;
    }
    return segments > 0;
  };
  /** The key a `.strict()` object would refuse, or undefined if there is none. */
  const stray = (object, keys) => Object.keys(object).find((key) => !keys.includes(key));

  // The three roles with a station, which is what a hop is. Narrower than the
  // cast on purpose: a hop naming the Architect describes a station there is
  // nothing to draw. `StationRole` in `packages/agent-contracts/src/live.ts`.
  const STATION_ROLES = ['fabricator', 'prover', 'keeper'];
  // Who may *hold* the work, which is the whole cast: between roles is a real
  // place for it to be. Copied from `constitution/permission-matrix.json`,
  // because this file is deployed alone; held against the real list by a test.
  const HOLDER_ROLES = [
    'virgil',
    'cartographer',
    'architect',
    'fabricator',
    'prover',
    'keeper',
    'arbiter',
    'domain-verifier',
    'breaker',
    'integrator',
    'interface-keeper',
    'security-sentinel',
    'transport-inspector',
    'performance-examiner',
  ];
  const ACTIVITIES = ['READY', 'RECEIVING', 'WORKING', 'REPORTED'];
  const VERDICTS = ['PASS', 'PASS_WITH_NON_BLOCKING_FINDINGS', 'BLOCKED', 'INSUFFICIENT_EVIDENCE'];
  // The fifteen of `constitution/authority.json`, written out for the same
  // reason as the roles above, and held against the real list by the same test.
  const CANDIDATE_STATES = [
    'BUILDING',
    'BUILDER_REPORTED_COMPLETE',
    'VERIFICATION_INCOMPLETE',
    'READY_FOR_REVIEW',
    'REVIEW_IN_PROGRESS',
    'PASS_WITH_NON_BLOCKING_FINDINGS',
    'BLOCKED',
    'INSUFFICIENT_EVIDENCE',
    'REPAIR_AUTHORISED',
    'RE_REVIEW_REQUIRED',
    'SAFE_TO_MERGE',
    'MERGED',
    'DEPLOYED',
    'QUARANTINED',
    'OWNER_DECISION_REQUIRED',
  ];

  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    return 'is not an object.';
  }
  /**
   * The version, checked here rather than beside the call. It was checked in
   * `readSessionReport` and not in this function, so the generated cases found
   * the two disagreeing about a report declaring another schema — the wire
   * refused it, this said nothing, and which was true depended on which one you
   * asked. There is one implementation now and this is it.
   */
  if (report.schema !== 'virgil.session-status.v1') {
    return `declares schema "${String(report.schema ?? '(none)')}", which this build does not read.`;
  }
  // Every key is required. A nullable field is not an optional one: `review:
  // null` says a review has not happened, and a missing `review` says the writer
  // and this reader disagree about what a report is.
  for (const key of ['candidate', 'holder', 'hops', 'review', 'note']) {
    if (!(key in report)) return `leaves out "${key}", which every report carries.`;
  }
  const strayKey = stray(report, [
    'schema',
    'reportedAt',
    'aboutCommit',
    'branch',
    'candidate',
    'holder',
    'hops',
    'review',
    'note',
  ]);
  if (strayKey) return `carries "${strayKey}", which this build does not know how to read.`;

  if (!isInstant(report.reportedAt)) return 'has no readable time on it.';
  if (!isSha(report.aboutCommit)) return 'does not say which commit it is about.';
  if (!isString(report.branch)) return 'names no branch.';
  if (report.holder !== null && !HOLDER_ROLES.includes(report.holder)) {
    return `names a holder this build does not know: ${String(report.holder)}.`;
  }
  if (!Array.isArray(report.hops) || report.hops.length > 16) return 'has no readable hops.';
  for (const hop of report.hops) {
    if (!hop || typeof hop !== 'object' || Array.isArray(hop)) {
      return 'has a hop that is not an object.';
    }
    const strayHopKey = stray(hop, ['role', 'activity', 'reported', 'at']);
    if (strayHopKey) return `has a hop carrying "${strayHopKey}", which this build does not read.`;
    if (!STATION_ROLES.includes(hop.role))
      return `has a hop for an unknown role: ${String(hop.role)}.`;
    if (!ACTIVITIES.includes(hop.activity)) {
      return `has a hop in an unknown state: ${String(hop.activity)}.`;
    }
    if (hop.reported !== null && hop.reported !== 'COMPLETE' && !VERDICTS.includes(hop.reported)) {
      return `has a hop reporting something that is not a verdict: ${String(hop.reported)}.`;
    }
    if (hop.at !== null && !isInstant(hop.at)) return 'has a hop with an unreadable time on it.';
  }
  /**
   * **`candidate`, which the first version of this check did not look at — the
   * Keeper's KP3-02.**
   *
   * The check was added to stop a session writing a verdict onto the verdict
   * slab and did not cover the field beside it feeding the slab beside it, so
   * `{"state": "APPROVED BY THE OWNER"}` travelled through and was printed under
   * *"THE STATUS RECORDED BY THE PROJECT"*. The client refuses it now as well;
   * both refuse it, because one of them being enough is what was assumed last
   * time.
   */
  if (report.candidate !== null) {
    const candidate = report.candidate;
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      return 'has a candidate that is not an object.';
    }
    const strayCandidateKey = stray(candidate, ['sha', 'shortSha', 'state']);
    if (strayCandidateKey) {
      return `names a candidate carrying "${strayCandidateKey}", which this build does not read.`;
    }
    if (!isSha(candidate.sha)) return 'names a candidate with no commit.';
    if (typeof candidate.shortSha !== 'string' || !/^[0-9a-f]{7,12}$/.test(candidate.shortSha)) {
      return 'names a candidate whose short commit is not a short commit.';
    }
    if (!('state' in candidate)) return 'names a candidate that does not say what state it is in.';
    if (candidate.state !== null && !CANDIDATE_STATES.includes(candidate.state)) {
      return `claims a candidate state that is not one of the fifteen: ${String(candidate.state)}.`;
    }
  }
  if (report.review !== null) {
    const review = report.review;
    if (!review || typeof review !== 'object' || Array.isArray(review)) {
      return 'has a review that is not an object.';
    }
    const strayReviewKey = stray(review, [
      'verdict',
      'recordPath',
      'recordCommit',
      'findings',
      'blocking',
    ]);
    if (strayReviewKey) {
      return `claims a review carrying "${strayReviewKey}", which this build does not read.`;
    }
    if (!VERDICTS.includes(review.verdict)) {
      return `claims a verdict that is not one of the four: ${String(review.verdict)}.`;
    }
    // Required even though nothing follows them yet. A report that names no
    // record is refused here rather than admitted and then ignored downstream.
    if (!isRepoPath(review.recordPath) || !isSha(review.recordCommit)) {
      return 'claims a verdict without naming the record it came from and the commit it was read at.';
    }
    if (!isCount(review.findings) || !isCount(review.blocking)) {
      return 'claims a review whose findings do not count.';
    }
  }
  if (report.note !== null && (typeof report.note !== 'string' || report.note.length > 300)) {
    return 'carries a note that is not one sentence of readable text.';
  }
  return null;
}

async function readSessionReport(repo, ref, token) {
  let file;
  try {
    file = await gh(
      `/repos/${repo}/contents/.virgil/state.json?ref=${encodeURIComponent(ref)}`,
      token,
    );
  } catch (error) {
    return {
      report: null,
      // **Which of the three it is, not only what to say about it.** The page has
      // to tell "nobody has written one" from "one was written and refused":
      // they are different facts about the project and drawing either as the
      // other is a false statement on the owner's screen. It was one, briefly —
      // a repair for KP4-03 read any reason as a refusal, and the reason field
      // carries all three.
      status: error?.status === 404 ? 'absent' : 'unreadable',
      reason:
        error?.status === 404
          ? 'No session has written .virgil/state.json on this branch.'
          : `.virgil/state.json could not be read (${error?.status ?? 'no status'}).`,
    };
  }

  let report;
  try {
    report = JSON.parse(Buffer.from(file.content ?? '', 'base64').toString('utf8'));
  } catch {
    return {
      report: null,
      status: 'unreadable',
      reason: '.virgil/state.json is not readable JSON.',
    };
  }

  // A reader that does not recognise the version refuses the file rather than
  // guessing at it. Guessing is how a field means one thing to the writer and
  // another to the screen. The version check lives inside `shapeComplaint` and
  // not here, so that what the tests hold against the schema is the whole of
  // what the wire refuses rather than most of it.
  const wrong = shapeComplaint(report);
  if (wrong) return { report: null, status: 'refused', reason: `.virgil/state.json ${wrong}` };

  let reportedIn = null;
  try {
    const commits = await gh(
      `/repos/${repo}/commits?path=.virgil/state.json&sha=${encodeURIComponent(ref)}&per_page=1`,
      token,
    );
    reportedIn = Array.isArray(commits) && commits[0]?.sha ? commits[0].sha : null;
  } catch {
    reportedIn = null;
  }

  return { report, status: 'read', reason: null, reportedIn };
}

export default async function handler(request) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token) return fail('No token is installed, so nothing has been read.');
  if (!repo) return fail('No repository is configured, so nothing has been read.');

  const url = new URL(request.url);
  const forced = url.searchParams.get('fresh') === '1';
  if (!forced && cached && Date.now() - cached.at < CACHE_SECONDS * 1000) {
    return new Response(cached.body, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': `public, max-age=${CACHE_SECONDS}`,
      },
    });
  }

  try {
    const repository = await gh(`/repos/${repo}`, token);
    const ref = branch || repository.default_branch;
    const head = await gh(`/repos/${repo}/commits/${encodeURIComponent(ref)}`, token);
    const sha = head.sha;

    // Either of these may fail on its own without making the rest unknowable, so
    // each failure becomes `null` — "not read" — rather than taking the whole
    // answer down or, worse, becoming a zero.
    const [checkResult, pulls, session] = await Promise.all([
      readChecks(repo, sha, token),
      gh(`/repos/${repo}/pulls?state=open&per_page=20`, token).catch(() => null),
      readSessionReport(repo, ref, token),
    ]);

    const pull = Array.isArray(pulls) ? pulls.find((entry) => entry.head?.ref === ref) : undefined;

    let reviews = null;
    if (pull) {
      reviews = await gh(`/repos/${repo}/pulls/${pull.number}/reviews?per_page=50`, token).catch(
        () => null,
      );
    }

    const answer = JSON.stringify({
      ok: true,
      asOf: iso(),
      cachedForSeconds: CACHE_SECONDS,
      repo,
      branch: ref,
      isDefaultBranch: ref === repository.default_branch,
      head: {
        sha,
        shortSha: sha.slice(0, 7),
        message: (head.commit?.message ?? '').split('\n')[0],
        committedAt: head.commit?.committer?.date ?? null,
      },
      pull: pull
        ? {
            number: pull.number,
            title: pull.title,
            draft: Boolean(pull.draft),
            url: pull.html_url,
            base: pull.base?.ref ?? null,
          }
        : null,
      checks: checkResult.unreadable
        ? null
        : {
            source: checkResult.source,
            total: checkResult.total,
            passed: checkResult.passed,
            failed: checkResult.failed,
            running: checkResult.running,
            noResult: checkResult.noResult,
            runs: checkResult.entries,
          },
      // Why the counts are missing, when they are. A screen may say "not read"
      // only if it can say what was not read.
      checksReason: checkResult.unreadable ?? null,
      githubReviews: Array.isArray(reviews)
        ? reviews.map((review) => ({ state: review.state, submittedAt: review.submitted_at }))
        : null,
      /**
       * The Keeper's verdict, which is a different thing from a GitHub review
       * and is not derivable from one. Until this repository publishes a review
       * record this function can read, the honest answer is that none has been
       * reported — and a screen showing this must draw it as not reported, never
       * as an absence of findings.
       */
      keeperVerdict: null,
      keeperVerdictReason: 'No Keeper review record is published where this function can read it.',
      /**
       * **A claim, kept apart from the facts above it.** Everything under
       * `sessionReport` was written by a session about itself, which `CLAUDE.md`
       * says is not evidence. It travels under its own name so that no surface
       * can show it as though GitHub had said it, and `reportedIn` names the
       * commit the file was last changed in so the owner can read the exact
       * version any screen is drawing.
       */
      sessionReport: session.report,
      sessionReportedIn: session.reportedIn ?? null,
      sessionReportReason: session.reason,
      sessionReportStatus: session.status ?? null,
    });
    cached = { at: Date.now(), body: answer };
    return new Response(answer, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': `public, max-age=${CACHE_SECONDS}`,
      },
    });
  } catch (error) {
    const status = error?.status;
    if (status === 401 || status === 403) {
      return fail('The token was refused, or it is not permitted to read this repository.');
    }
    if (status === 404) {
      return fail('The repository or branch was not found by this token.');
    }
    return fail(`Nothing was read: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const config = { path: '/api/state' };
