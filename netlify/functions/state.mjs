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
 * The check runs for one commit, counted in four states that are kept distinct.
 * **A check that has not finished is not a failure**, and a check that finished
 * with no conclusion is not a pass. Each has its own count so that no screen has
 * to guess and none can flatten them.
 */
function countChecks(runs) {
  const counted = { total: runs.length, passed: 0, failed: 0, running: 0, noResult: 0 };
  const named = [];
  for (const run of runs) {
    const status = run.status;
    const conclusion = run.conclusion;
    if (status !== 'completed') counted.running += 1;
    else if (conclusion === 'success') counted.passed += 1;
    else if (conclusion === 'failure' || conclusion === 'timed_out') counted.failed += 1;
    else counted.noResult += 1;
    named.push({
      name: run.name,
      status,
      conclusion: conclusion ?? null,
      url: run.html_url ?? null,
    });
  }
  return { counted, named };
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
    const [checkRuns, pulls] = await Promise.all([
      gh(`/repos/${repo}/commits/${sha}/check-runs?per_page=100`, token).catch(() => null),
      gh(`/repos/${repo}/pulls?state=open&per_page=20`, token).catch(() => null),
    ]);

    const pull = Array.isArray(pulls) ? pulls.find((entry) => entry.head?.ref === ref) : undefined;

    let reviews = null;
    if (pull) {
      reviews = await gh(`/repos/${repo}/pulls/${pull.number}/reviews?per_page=50`, token).catch(
        () => null,
      );
    }

    const checks = checkRuns ? countChecks(checkRuns.check_runs ?? []) : null;

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
      checks: checks ? { ...checks.counted, runs: checks.named } : null,
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
