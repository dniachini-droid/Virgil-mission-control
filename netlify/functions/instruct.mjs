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

  if (!secretMatches(request.headers.get('x-virgil-secret') ?? '', secret)) {
    return refuse('Refused.', 401);
  }

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

    // One at a time, and a ceiling. Both answered from GitHub's own record, so
    // there is nothing here to keep, lose, or disagree with.
    const runs = await gh(
      `/repos/${repo}/actions/workflows/${WORKFLOW}/runs?per_page=100`,
      token,
    ).catch(() => null);
    const list = runs?.workflow_runs ?? [];

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
