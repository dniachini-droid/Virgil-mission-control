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

/**
 * One cached answer **per branch**, because the answer is now about a branch the
 * caller names. A single slot would serve `main`'s answer to a request about a
 * work branch for up to 25 seconds, which is a screen showing one branch's
 * commits under another branch's name — the exact class of untruth this file
 * exists to prevent.
 *
 * Bounded, because a cache keyed by something a caller supplies is a cache a
 * caller can grow without limit.
 * @type {Map<string, { at: number, body: string }>}
 */
const cached = new Map();
const CACHE_BRANCHES = 16;

/**
 * How many branches the list carries. The count of what exists is reported
 * beside it, so a repository with forty branches shows eight and says forty
 * rather than showing eight and implying eight.
 */
const WATCHED_BRANCHES = 8;

function remember(key, body) {
  if (cached.size >= CACHE_BRANCHES && !cached.has(key)) {
    const oldest = cached.keys().next().value;
    if (oldest !== undefined) cached.delete(oldest);
  }
  cached.delete(key);
  cached.set(key, { at: Date.now(), body });
}

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

/**
 * Whether a string is a branch name this function will put in a URL.
 *
 * Git's `check-ref-format` rules, the ones that matter here: no component
 * beginning with a dot, no `..`, no ASCII control characters, no space, no
 * `~ ^ : ? * [ \`, no trailing dot, no trailing `.lock`, no leading or trailing
 * slash and no doubled slash. Length is bounded because an unbounded name is an
 * unbounded URL.
 */
export function isBranchName(value) {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > 255) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f ~^:?*[\\]/.test(value)) return false;
  if (value.includes('..') || value.includes('//')) return false;
  if (value.startsWith('/') || value.endsWith('/')) return false;
  if (value.endsWith('.') || value.endsWith('.lock')) return false;
  return value.split('/').every((part) => part.length > 0 && !part.startsWith('.'));
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

/**
 * **Every branch the repository has, in one call.**
 *
 * `/branches` gives a name and a head sha per branch and **no dates**. There is
 * no REST call that gives the list with commit times, so the choice was one call
 * without dates or one call per branch with them. The slice's brief promised one
 * call, so one call it is, and the rows say what they do not know rather than
 * having a date invented for them.
 *
 * What *is* known cheaply: the open pull requests are already fetched for the
 * branch being shown, and each one carries its branch name and when it was last
 * updated. So a branch with an open pull request gets a real time; a branch
 * without one says so. That is less than the brief implied and it is said here
 * rather than smoothed over.
 *
 * Returns `null` — not `[]` — when the list could not be read. Zero branches and
 * "not read" are different claims and every surface downstream has to be able to
 * tell them apart.
 */
export async function readBranches(repo, token, defaultBranch, pulls) {
  let raw;
  try {
    raw = await gh(`/repos/${repo}/branches?per_page=100`, token);
  } catch (error) {
    return {
      branches: null,
      reason: `The branch list could not be read (${error?.status ?? 'no status'}).`,
      total: 0,
    };
  }
  if (!Array.isArray(raw)) {
    return {
      branches: null,
      reason: 'The branch list came back in a shape this function does not recognise.',
      total: 0,
    };
  }
  const openFor = new Map();
  if (Array.isArray(pulls)) {
    for (const pull of pulls) {
      const ref = pull?.head?.ref;
      if (typeof ref === 'string' && ref.length > 0) {
        openFor.set(ref, {
          number: pull.number,
          title: pull.title ?? null,
          draft: Boolean(pull.draft),
          url: pull.html_url ?? null,
          updatedAt: pull.updated_at ?? null,
        });
      }
    }
  }
  const rows = raw
    .filter((entry) => typeof entry?.name === 'string' && entry.name.length > 0)
    .map((entry) => ({
      name: entry.name,
      sha: typeof entry.commit?.sha === 'string' ? entry.commit.sha : null,
      shortSha: typeof entry.commit?.sha === 'string' ? entry.commit.sha.slice(0, 7) : null,
      isDefault: entry.name === defaultBranch,
      protected: Boolean(entry.protected),
      /** Null means no open pull request, which is a fact, not a missing read. */
      pull: openFor.get(entry.name) ?? null,
      /**
       * When this branch last moved — **only where it is known**. It comes from
       * the branch's open pull request and nowhere else, so a branch without one
       * reads `null`, which the interface must draw as "not read" rather than as
       * old.
       */
      updatedAt: openFor.get(entry.name)?.updatedAt ?? null,
    }));

  /**
   * The default branch first, because it is the one that is true of the project
   * rather than of somebody's work. Then branches with an open pull request,
   * newest first, because those are the ones something is happening on and the
   * only ones whose time is known. Then the rest by name — not by age, which
   * would be a claim about recency this function cannot make.
   */
  rows.sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    const aHas = a.updatedAt !== null;
    const bHas = b.updatedAt !== null;
    if (aHas !== bHas) return aHas ? -1 : 1;
    if (aHas && bHas && a.updatedAt !== b.updatedAt) {
      return a.updatedAt < b.updatedAt ? 1 : -1;
    }
    return a.name.localeCompare(b.name);
  });

  /**
   * **The Keeper's KP8-01: the cap decided what existed, and it must not.**
   *
   * This returned only `rows.slice(0, WATCHED_BRANCHES)`, and the handler then
   * asked whether the branch being shown was in *that*. On a repository with
   * nine branches the ninth was reported `branchExists: false`, and the page
   * told the owner it had been "merged and deleted" — about a branch with live
   * commits, on the surface built to cure exactly that kind of false statement.
   * On this repository the branch that fell off the end was the one the owner
   * was being asked to merge.
   *
   * So three things travel now, and they answer three different questions:
   * `names` is every branch there is, and is the only thing existence is ever
   * decided against; `branches` is what the interface draws; `total` is how many
   * there are. The cap is a drawing decision and has no say in what is true.
   *
   * And the branch being shown is **pinned into the list** by the caller below,
   * wherever it sorts, because a list that omits the row you are looking at
   * offers no way back to it.
   */
  return {
    branches: rows.slice(0, WATCHED_BRANCHES),
    all: rows,
    names: rows.map((entry) => entry.name),
    reason: null,
    total: rows.length,
  };
}

/**
 * The list as drawn, with the branch being shown guaranteed to be in it.
 *
 * Past the cap it replaces the last row rather than growing the list, so the
 * count the interface reports stays the count it draws.
 */
function withShowing(list, wanted) {
  if (list.branches === null || list.all === undefined) return list.branches;
  if (list.branches.some((entry) => entry.name === wanted)) return list.branches;
  const found = list.all.find((entry) => entry.name === wanted);
  if (!found) return list.branches;
  return [...list.branches.slice(0, Math.max(0, WATCHED_BRANCHES - 1)), found];
}

export default async function handler(request) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token) return fail('No token is installed, so nothing has been read.');
  if (!repo) return fail('No repository is configured, so nothing has been read.');

  const url = new URL(request.url);
  const forced = url.searchParams.get('fresh') === '1';
  /**
   * **Which branch is being asked about, and why the caller may say.**
   *
   * Until slice five this was `GITHUB_BRANCH` and nothing else, which made the
   * whole site depend on one name written in one settings box — and took it down
   * three times in one day when the branch that name pointed at was merged and
   * deleted. The caller now names the branch; the variable becomes the default
   * when they do not.
   *
   * Refused rather than trusted: the name reaches three GitHub URLs below — the
   * head commit, the session report's file read, and the commit that last
   * changed it. Git's own rules forbid a leading dot, `..`, a trailing `.lock`,
   * a space and the ASCII control range, and this refuses beyond them — no `..`
   * anywhere, no leading slash, nothing over 255 bytes — so that a crafted name
   * cannot reach past the path or query position it belongs in.
   *
   * **`encodeURIComponent` at each of those three call sites is the defence that
   * bears the load, and this is a second layer, not the first.** The Keeper's
   * KP8-11 established that precisely: several names git itself refuses do pass
   * this check — `%2e%2e%2fetc`, `main#frag`, `main&per_page=1`, a leading dash,
   * zero-width characters — and every one of them is neutralised by the encoding
   * before it reaches a URL. Saying so here rather than letting this function
   * look like the thing standing between a crafted name and GitHub.
   */
  const asked = url.searchParams.get('branch');
  if (asked !== null && !isBranchName(asked)) {
    return fail(`That is not a branch name this function will ask GitHub about.`);
  }
  const key = asked ?? branch ?? '';
  const hit = cached.get(key);
  if (!forced && hit && Date.now() - hit.at < CACHE_SECONDS * 1000) {
    return new Response(hit.body, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': `public, max-age=${CACHE_SECONDS}`,
      },
    });
  }

  try {
    const repository = await gh(`/repos/${repo}`, token);
    /**
     * **The Keeper's KP8-04, half of it.** This read
     * `asked || branch || repository.default_branch`, so an omitted parameter
     * resolved to `GITHUB_BRANCH` before the repository's own default. The
     * interface sent nothing for the default-branch row, so tapping `main` asked
     * for whatever that hosting setting named — on this deployment, a deleted
     * branch — and the owner could not reach the default at all without editing
     * a setting the app cannot touch. That is the first half of the instruction
     * this slice was built from, "the state of what's been merged", unreachable.
     *
     * `GITHUB_BRANCH` is now what it was demoted to be: the branch shown when
     * nobody has said which. The row sends its own name explicitly
     * (`MobileRoom.tsx`), so the interface never depends on this precedence at
     * all — but the precedence is wrong on its own terms and is fixed here too,
     * because two defences against one defect is the point.
     */
    const wanted = asked || branch || repository.default_branch;

    /**
     * **The branch list is read before the branch, and that order is the repair.**
     *
     * Until now the head commit was fetched first, so a branch that had been
     * merged and deleted produced a 422 and the *whole page* went dark — three
     * times in one day, on a repository where deleting a merged branch is the
     * normal end of a slice. The list is what lets the page keep working and
     * offer somewhere else to look, so it is read first and its failure is its
     * own rather than the answer's.
     */
    const pullsForList = await gh(`/repos/${repo}/pulls?state=open&per_page=20`, token).catch(
      () => null,
    );
    const list = await readBranches(repo, token, repository.default_branch, pullsForList);

    /**
     * A branch that is not there is a fact about the repository, not a failure to
     * read it. The answer stays `ok: true` — the list is real, the repository is
     * real, the default branch is real — and says which name was asked for and
     * that it is gone. The page then has everything it needs to say so and to
     * offer the branches that do exist.
     */
    // Against every branch there is, never against the eight that are drawn.
    const exists = list.names === undefined ? null : list.names.includes(wanted);
    if (exists === false) {
      const answer = JSON.stringify({
        ok: true,
        asOf: iso(),
        cachedForSeconds: CACHE_SECONDS,
        repo,
        branch: wanted,
        branchExists: false,
        isDefaultBranch: false,
        defaultBranch: repository.default_branch,
        branches: withShowing(list, wanted),
        branchesReason: list.reason,
        branchesTotal: list.total,
        branchesWatched: WATCHED_BRANCHES,
        head: null,
        pull: null,
        checks: null,
        checksReason: `The branch ${wanted} is not in this repository, so there was nothing to read checks against.`,
        githubReviews: null,
        keeperVerdict: null,
        keeperVerdictReason:
          'No Keeper review record is published where this function can read it.',
        sessionReport: null,
        sessionReportedIn: null,
        sessionReportReason: `The branch ${wanted} is not in this repository, so no session report could be read from it.`,
        sessionReportStatus: 'absent',
      });
      remember(key, answer);
      return new Response(answer, {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': `public, max-age=${CACHE_SECONDS}`,
        },
      });
    }

    const ref = wanted;
    const head = await gh(`/repos/${repo}/commits/${encodeURIComponent(ref)}`, token);
    const sha = head.sha;

    // Either of these may fail on its own without making the rest unknowable, so
    // each failure becomes `null` — "not read" — rather than taking the whole
    // answer down or, worse, becoming a zero.
    const [checkResult, session] = await Promise.all([
      readChecks(repo, sha, token),
      readSessionReport(repo, ref, token),
    ]);
    // Already fetched above for the list. Fetching it twice would be paying
    // twice for one answer, on a project a bill has already stopped once.
    const pulls = pullsForList;

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
      branchExists: true,
      isDefaultBranch: ref === repository.default_branch,
      defaultBranch: repository.default_branch,
      /**
       * Every branch, so the page can offer somewhere else to look without
       * another request — and so that no single name written in a settings box
       * can take the page down again.
       */
      branches: withShowing(list, ref),
      branchesReason: list.reason,
      branchesTotal: list.total,
      branchesWatched: WATCHED_BRANCHES,
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
    remember(key, answer);
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
