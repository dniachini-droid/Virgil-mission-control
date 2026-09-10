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
    const [checkResult, pulls] = await Promise.all([
      readChecks(repo, sha, token),
      gh(`/repos/${repo}/pulls?state=open&per_page=20`, token).catch(() => null),
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
