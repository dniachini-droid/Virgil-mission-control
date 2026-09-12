/**
 * **The one endpoint that can cause something to happen.**
 *
 * Phase 2 slice three (`docs/process/PHASE_2_SLICE_3_BRIEF.md`). Everything else
 * this site serves is read-only by construction. This starts a real session on
 * the owner's instruction, and it is therefore the first thing in the project
 * with the power to change the repository.
 *
 * **What it will not do, enforced here rather than downstream:**
 *
 *  - **Run for anyone but him.** Every request must carry the shared secret. A
 *    URL is not a secret; an endpoint is reachable whether or not a password sits
 *    in front of the page. Without `INSTRUCT_SECRET` installed it refuses every
 *    request rather than defaulting to open, which is the difference between a
 *    guard and a decoration.
 *  - **Touch the default branch.** Refused here and refused again by the
 *    workflow's first step, before anything is installed. Two refusals, because
 *    this is the line the whole system exists to hold.
 *  - **Start a second run while one is in flight**, or more than `MAX_PER_DAY`.
 *    The failure mode is not one expensive run, it is fifty cheap ones, and a
 *    typed instruction is cheap to send and expensive to serve. Both limits are
 *    answered from GitHub's own record of runs, so there is no state here to
 *    drift or be lost.
 *  - **Merge, deploy, or open a pull request.** The token it uses can trigger a
 *    workflow and read runs. Nothing here asks for more, and the workflow it
 *    starts is granted `contents: write` and nothing else.
 *
 * The token and the secret live in Netlify's environment settings, put there by
 * the owner. No session creates, holds, sees or writes either
 * (`CLAUDE.md`; `OD-0009`).
 */

const GITHUB = 'https://api.github.com';
const WORKFLOW = 'instruct.yml';

/** How many runs the owner may start in a day. A ceiling, not a target. */
const MAX_PER_DAY = 20;

/** The longest instruction accepted. Long enough to be clear, short enough to read. */
const MAX_INSTRUCTION = 2000;

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function refuse(reason, status = 400) {
  return json({ ok: false, reason }, status);
}

async function gh(path, token, init = {}) {
  const response = await fetch(`${GITHUB}${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'user-agent': 'virgil-mission-control',
      'x-github-api-version': '2022-11-28',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const error = new Error(`GitHub answered ${response.status} for ${path}`);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

/**
 * **A wrong guess has to cost something — the system audit's `SA-S-02`.**
 *
 * There was no limit of any kind on wrong guesses at `INSTRUCT_SECRET`. The
 * daily ceiling and the one-at-a-time rule sit *after* the comparison and bound
 * successful runs, not attempts, so a wrong guess cost the attacker nothing and
 * the rate was whatever their connection allowed, indefinitely. The endpoint's
 * address and its header name are both world-readable in this repository. What a
 * landed guess buys is a session running `--dangerously-skip-permissions` with
 * the owner's Claude subscription token in scope.
 *
 * `docs/process/PHASE_2_SLICE_6_BRIEF.md` makes this a **precondition** of
 * switching the composer on rather than a recommendation, because today the
 * composer is disabled and nobody has ever used it: turning it on makes this
 * live.
 *
 * **What this is, exactly, and it is less than it looks.** The counters live in
 * this process's memory. A Netlify Function is a Lambda: an instance is reused
 * while it is warm, and a second instance has its own empty map. So an attacker
 * who opens enough concurrent connections, or who waits for a cold start, gets a
 * fresh allowance. This raises the cost of guessing; it does not bound it
 * globally, and a shared store is what would.
 *
 * **So it is not the protection. The secret's entropy is.** The audit's first
 * instruction is the one that matters — rotate `INSTRUCT_SECRET` to 32 or more
 * random characters — and no code here can do that or check that it was done.
 * This is the second layer, recorded as a second layer, in
 * `docs/architecture/ENFORCEMENT_BOUNDARIES.md`.
 *
 * **And there is deliberately no artificial delay on a wrong guess.** The
 * obvious way to make guessing expensive is to sleep before refusing, and on a
 * free plan that spends the site's own function allowance on the attacker's
 * behalf: a slow refusal is a way to take the site down. A refusal that returns
 * immediately costs the attacker a round trip and the site almost nothing.
 */
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

/** Wrong guesses from one address before it is refused without being compared. */
const MAX_ATTEMPTS = 5;

/**
 * How many addresses are remembered at once. A Lambda's memory is not a place to
 * keep an unbounded map fed by strangers, so the oldest entry is dropped when
 * this is reached — which means a flood of addresses can evict a real
 * attacker's entry. That is the honest cost of not having a shared store, and it
 * is written here rather than discovered.
 */
const REMEMBERED_ADDRESSES = 5000;

const attempts = new Map();

/**
 * Who is asking, as well as this can be known.
 *
 * Netlify sets `x-nf-client-connection-ip` from the connection itself, which a
 * client cannot forge; `x-forwarded-for` can be, and is used only as a fallback.
 * **When neither is readable the request is counted against one shared bucket
 * rather than waved through** — `KP2-07`'s rule, one endpoint over: a limit that
 * cannot be attributed has not been satisfied, and the version of this that
 * returns `null` for "unknown" is the version where sending no headers is the
 * way around it.
 */
function addressOf(request) {
  const direct = request.headers.get('x-nf-client-connection-ip');
  if (direct) return direct.trim();
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first || 'unattributed';
}

/** True when this address has spent its attempts and the window has not passed. */
function lockedOut(address, now) {
  const seen = attempts.get(address);
  if (!seen) return false;
  if (now - seen.first > ATTEMPT_WINDOW_MS) {
    attempts.delete(address);
    return false;
  }
  return seen.count >= MAX_ATTEMPTS;
}

function recordWrongGuess(address, now) {
  const seen = attempts.get(address);
  if (seen && now - seen.first <= ATTEMPT_WINDOW_MS) {
    seen.count += 1;
    return;
  }
  if (attempts.size >= REMEMBERED_ADDRESSES) {
    // Insertion order: the oldest entry goes. Documented above as a real
    // weakness rather than left as a surprise.
    const oldest = attempts.keys().next();
    if (!oldest.done) attempts.delete(oldest.value);
  }
  attempts.set(address, { first: now, count: 1 });
}

/** Exported for the checks, which drive the handler rather than read it. */
export function forgetAttempts() {
  attempts.clear();
}

/**
 * Constant-time-ish comparison. The timing of a string compare is a poor way to
 * learn a secret over the internet, but writing the careless version invites
 * someone to reason about whether it mattered.
 */
function secretMatches(given, expected) {
  if (typeof given !== 'string' || given.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < given.length; i += 1) {
    difference |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return difference === 0;
}

export default async function handler(request) {
  if (request.method !== 'POST') return refuse('This endpoint takes a POST.', 405);

  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const secret = process.env.INSTRUCT_SECRET;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  // Absent configuration is a closed door, never an open one.
  if (!secret) return refuse('No shared secret is installed, so nothing can be started.', 503);
  if (!token) return refuse('No dispatch token is installed, so nothing can be started.', 503);
  if (!repo) return refuse('No repository is configured.', 503);
  if (!branch) return refuse('No branch is configured.', 503);

  /**
   * The limit is checked **before** the comparison, and a locked-out address is
   * refused without its guess being looked at. Checking afterwards would let an
   * attacker keep testing and merely change what they are told, which is not a
   * limit on guessing.
   *
   * A missing header counts as a wrong guess, because it is one.
   */
  const address = addressOf(request);
  const at = Date.now();
  if (lockedOut(address, at)) {
    return refuse(
      `That is ${MAX_ATTEMPTS} wrong attempts. Nothing more from here will be looked at for ${
        ATTEMPT_WINDOW_MS / 60000
      } minutes.`,
      429,
    );
  }
  if (!secretMatches(request.headers.get('x-virgil-secret') ?? '', secret)) {
    recordWrongGuess(address, at);
    // The refusal says nothing about how close the guess was, how many attempts
    // remain, or whether a secret is installed. "Refused." is the whole answer.
    return refuse('Refused.', 401);
  }
  // A correct secret is the owner. Whatever went wrong before it did not.
  attempts.delete(address);

  let body;
  try {
    body = await request.json();
  } catch {
    return refuse('The request body is not readable JSON.');
  }

  const instruction = typeof body?.instruction === 'string' ? body.instruction.trim() : '';
  if (!instruction) return refuse('An instruction is required.');
  if (instruction.length > MAX_INSTRUCTION) {
    return refuse(`An instruction may be at most ${MAX_INSTRUCTION} characters.`);
  }

  try {
    const repository = await gh(`/repos/${repo}`, token);
    if (branch === repository.default_branch || branch === 'main' || branch === 'master') {
      return refuse('This will not run against the default branch.', 403);
    }

    /**
     * One at a time, and a ceiling. Both answered from GitHub's own record, so
     * there is nothing here to keep, lose, or disagree with.
     *
     * **And both refuse rather than wave through when that record cannot be
     * read — the Keeper's KP2-07.** This was `.catch(() => null)` falling to an
     * empty list, so a failing query did not disable one limit, it disabled
     * *both*: no run looks in flight and no run counts against the day. The
     * moment GitHub returned a 500 or the token expired, the endpoint that
     * starts sessions on the owner's repository became unlimited, silently, and
     * looked exactly as it does when nothing has been started yet.
     *
     * A limit that cannot be checked has not been satisfied. So an unreadable
     * record is a refusal, and the refusal says which it was, because "try
     * again" is a different instruction to the owner than "you have hit the
     * ceiling".
     */
    let list;
    try {
      const runs = await gh(
        `/repos/${repo}/actions/workflows/${WORKFLOW}/runs?per_page=100`,
        token,
      );
      list = runs?.workflow_runs;
      if (!Array.isArray(list)) throw new Error('the runs query returned no list of runs');
    } catch (error) {
      return refuse(
        `The record of what is already running could not be read (${
          error?.status ?? error?.message ?? 'no reason given'
        }), so nothing was started. The limits are counted from that record, and a limit that cannot be counted has not been met.`,
        503,
      );
    }

    const inFlight = list.find((run) => run.status === 'queued' || run.status === 'in_progress');
    if (inFlight) {
      return json(
        {
          ok: false,
          reason: 'A session is already working. One at a time.',
          runUrl: inFlight.html_url,
        },
        409,
      );
    }

    const since = Date.now() - 24 * 60 * 60 * 1000;
    const today = list.filter((run) => Date.parse(run.created_at) >= since).length;
    if (today >= MAX_PER_DAY) {
      return refuse(
        `That is ${today} runs in a day, which is the ceiling. Nothing was started.`,
        429,
      );
    }

    await gh(`/repos/${repo}/actions/workflows/${WORKFLOW}/dispatches`, token, {
      method: 'POST',
      body: JSON.stringify({ ref: branch, inputs: { instruction, branch } }),
    });

    return json({
      ok: true,
      startedAt: new Date().toISOString(),
      branch,
      runsInTheLastDay: today + 1,
      ceiling: MAX_PER_DAY,
      // GitHub's dispatch returns no run id, so this does not invent one. The
      // room finds the run the way it finds everything else: by asking.
      note: 'A run has been asked for. It appears in the room when GitHub reports it.',
    });
  } catch (error) {
    const status = error?.status;
    if (status === 401 || status === 403) {
      return refuse('The dispatch token was refused, or may not start this workflow.', 502);
    }
    if (status === 404) {
      return refuse(
        'GitHub has no such workflow on the default branch. A workflow can only be started once it exists there.',
        502,
      );
    }
    return refuse(
      `Nothing was started: ${error instanceof Error ? error.message : String(error)}`,
      502,
    );
  }
}

export const config = { path: '/api/instruct' };
