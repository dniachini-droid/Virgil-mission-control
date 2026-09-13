import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * **The plan is checked against the tree it describes — `KXR-76/PR33`.**
 *
 * `docs/process/ROADMAP.md` went false twice in two days. Both times the owner
 * or a reviewer caught it; neither time did a check, because nothing in this
 * repository reads that file. `docs/process/FINDINGS.md` cannot rot for exactly
 * one reason: hundreds of assertions read it on every run. That difference is
 * the whole of the problem and this file is the whole of the answer.
 *
 * **What it measures, and the one thing it refuses to do.** The plan carries,
 * in its status line, the commit it was last true at. This counts how far the
 * first-parent history of `origin/main` has moved past that commit and fails
 * past a threshold. It never says the plan's prose is wrong — it cannot know
 * that. It says the evidence underneath the prose moved, names the commit and
 * the count, and asks for a fresh look.
 *
 * **Borrowed.** The shape is taken from `hibi` (https://github.com/npupko/hibi,
 * MIT), read at the owner's instruction on 2026-09-13: *a document's claim is
 * anchored to the thing that makes it true, and the check reports that the
 * evidence moved rather than that the sentence is wrong.* No code was copied —
 * hibi is some fifteen thousand lines, nineteen schemas, a plug-in protocol and
 * language parsers, and none of that is here or wanted. Its other good idea,
 * that the warning belongs in the raw file a person reads, is taken only as far
 * as a standing sentence in the plan itself; writing a live warning into the
 * file needs machinery, and a red check is already better than nothing.
 *
 * **Why first-parent.** `git rev-list --count f2aa068..origin/main` answers 5;
 * with `--first-parent` it answers 1. The second is the number worth having: it
 * counts landings on `main`, so a pull request with nine commits costs one, and
 * the threshold means "pieces of work" rather than "keystrokes".
 *
 * **Why it fails rather than warns.** Two soft signals already exist for this
 * exact problem — the status line itself, and a rule in the owner's window
 * requiring it be read — and both failed on the day they were written. A third
 * soft signal would be the third. The protection against a check nobody
 * respects is the threshold below, not a softer verdict.
 *
 * **What it cannot do.** Turbo hashes files, and `main` moving changes no file
 * on a branch, so a cached `test` task can replay a pass that a fresh run would
 * fail. Same class as `KXR-29`, and not fixable from here: the input is Git
 * history, which no `inputs` list can name. `pnpm test --force` measures.
 */
const root = resolve(import.meta.dirname, '../../..');

/** The plan, relative to a repository root, so a throwaway copy can be read the same way. */
const PLAN = 'docs/process/ROADMAP.md';

/**
 * **Three landings, and the reasoning rather than the number.**
 *
 * The second time the plan went false, five pull requests had merged behind it
 * and the file was actively sending the next session to do work already done.
 * So five is the observed distance at which staleness does harm, and the
 * threshold has to sit below it. One or two would fire on ordinary work: a
 * branch is routinely cut while a sibling or two is in flight, and their
 * merging is not yet a reason to distrust anything. Three is the first number
 * below the observed harm and above the ordinary churn.
 *
 * It is meant to be got wrong once and adjusted: too loud, raise it; a
 * staleness slips through, drop it.
 */
const THRESHOLD = 3;

/** The bold status line, and the commit it anchors to. */
const STATUS_LINE = /^\*\*Status:.*$/gm;
const ANCHOR = /\bat\s+`([0-9a-f]{7,40})`/;

type Verdict =
  /** The measurement was made: `main` is `count` landings past `sha`. */
  | { kind: 'measured'; sha: string; count: number }
  /** The plan's own claim is missing or unreadable, which is this check's business. */
  | { kind: 'complaint'; because: string }
  /** The clone has no history to measure against, which is not. */
  | { kind: 'cannot-measure'; because: string };

function git(dir: string, ...args: string[]): { ok: boolean; out: string } {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout ?? '').trim() };
}

/**
 * Read the plan's anchor and measure the distance from it, or say precisely why
 * neither could be done. Takes the repository root as an argument so that the
 * refusals below can be demonstrated on a throwaway repository rather than
 * asserted about this one.
 */
function inspect(dir: string): Verdict {
  let text: string;
  try {
    text = readFileSync(resolve(dir, PLAN), 'utf8');
  } catch {
    return { kind: 'complaint', because: `${PLAN} could not be read` };
  }

  const lines = text.match(STATUS_LINE) ?? [];
  if (lines.length === 0) {
    return {
      kind: 'complaint',
      because: `${PLAN} carries no line beginning "**Status:", so nothing says which commit it was last true at`,
    };
  }
  if (lines.length > 1) {
    return {
      kind: 'complaint',
      because: `${PLAN} carries ${lines.length} lines beginning "**Status:", so which one anchors the plan is ambiguous`,
    };
  }

  const line = lines[0] ?? '';
  const found = ANCHOR.exec(line);
  if (found?.[1] === undefined) {
    return {
      kind: 'complaint',
      because: `${PLAN}'s status line names no commit in the shape "at \`<sha>\`": ${line.slice(0, 120)}`,
    };
  }
  const sha = found[1];

  if (!git(dir, 'rev-parse', '--verify', '--quiet', 'origin/main^{commit}').ok) {
    return {
      kind: 'cannot-measure',
      because:
        'origin/main is not in this clone, so there is no history to measure the plan against. Run `git fetch origin main`',
    };
  }

  if (!git(dir, 'rev-parse', '--verify', '--quiet', `${sha}^{commit}`).ok) {
    // A shallow clone is missing almost everything, and accusing the plan of
    // naming a bad commit on that evidence would be a false accusation.
    if (git(dir, 'rev-parse', '--is-shallow-repository').out === 'true') {
      return {
        kind: 'cannot-measure',
        because: `this clone is shallow and does not reach \`${sha}\`, so the distance cannot be counted. Deepen it with \`git fetch --unshallow\``,
      };
    }
    return {
      kind: 'complaint',
      because: `${PLAN}'s status line names \`${sha}\`, which is not a commit in this repository`,
    };
  }

  const counted = git(dir, 'rev-list', '--count', '--first-parent', `${sha}..origin/main`);
  if (!counted.ok) {
    return { kind: 'cannot-measure', because: `could not count commits since \`${sha}\`` };
  }
  return { kind: 'measured', sha, count: Number(counted.out) };
}

/** What a reader is told when the evidence has moved. Never that the prose is wrong. */
function complaint(v: Extract<Verdict, { kind: 'measured' }>): string {
  return `${PLAN} says it was last true at \`${v.sha}\`, and ${v.count} pieces of work have landed on main since — more than the ${THRESHOLD} this repository tolerates. Nothing here says the plan is wrong; it says the evidence under it moved. Read it against the tree, correct what has changed, and re-stamp the status line at the current head.`;
}

describe('the plan cannot go stale in silence', () => {
  it('anchors itself to a commit that exists', () => {
    const v = inspect(root);
    expect(v.kind === 'complaint' ? v.because : 'anchored').toBe('anchored');
  });

  it('is no further behind main than the threshold allows', (ctx) => {
    const v = inspect(root);
    if (v.kind === 'cannot-measure') {
      // **Skipped, not passed**, and the difference is the point. There is no
      // history here to measure against, so the honest answer is that the
      // question was not asked — which the run summary then says out loud.
      // A green tick here would be the exact lie this file exists to prevent.
      ctx.skip(`the plan was not measured: ${v.because}`);
      return;
    }
    if (v.kind === 'complaint') return; // The assertion above owns this.
    expect(v.count, complaint(v)).toBeLessThanOrEqual(THRESHOLD);
  });
});

/**
 * **Proved on throwaway repositories, because a check nobody has watched refuse
 * is not evidence.** Each case builds a real repository with real history
 * outside this one, so the counts asserted below are counted rather than
 * claimed.
 */
function scratch(landings: number): {
  dir: string;
  first: string;
  head: string;
  plan: (status: string) => void;
} {
  const dir = mkdtempSync(join(tmpdir(), 'virgil-roadmap-'));
  const run = (...args: string[]) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
  run('init', '-q', '-b', 'main');
  run('config', 'user.email', 'test@example.invalid');
  run('config', 'user.name', 'test');
  const shas: string[] = [];
  for (let i = 0; i <= landings; i += 1) {
    writeFileSync(join(dir, `${i}.txt`), `${i}\n`);
    run('add', '-A');
    run('commit', '-qm', `landing ${i}`);
    shas.push(run('rev-parse', 'HEAD').stdout.trim());
  }
  // A remote-tracking ref without a remote: `origin/main` is what the check
  // measures against, and a throwaway repository has no remote to fetch from.
  run('update-ref', 'refs/remotes/origin/main', 'HEAD');
  return {
    dir,
    first: shas[0] ?? '',
    head: shas[shas.length - 1] ?? '',
    plan: (status: string) => {
      mkdirSync(dirname(join(dir, PLAN)), { recursive: true });
      writeFileSync(join(dir, PLAN), `# Roadmap\n\n${status}\n`);
    },
  };
}

const stamped = (sha: string) => `**Status: true against \`main\` at \`${sha}\`**`;

describe('the check, watched refusing', () => {
  it('fails when the anchor is far enough back, naming the commit and the count', () => {
    const repo = scratch(6);
    repo.plan(stamped(repo.first));

    const v = inspect(repo.dir);
    expect(v.kind).toBe('measured');
    if (v.kind !== 'measured') return;
    expect(v.count).toBe(6);
    expect(v.count).toBeGreaterThan(THRESHOLD);
    expect(complaint(v)).toContain(repo.first);
    expect(complaint(v)).toContain('6 pieces of work');
    // It reports movement, never a verdict on the prose.
    expect(complaint(v)).toContain('the evidence under it moved');
  });

  it('passes when the anchor names the current head', () => {
    const repo = scratch(6);
    repo.plan(stamped(repo.head));

    const v = inspect(repo.dir);
    expect(v.kind).toBe('measured');
    if (v.kind !== 'measured') return;
    expect(v.count).toBe(0);
    expect(v.count).toBeLessThanOrEqual(THRESHOLD);
  });

  it('counts landings rather than commits', () => {
    // Six commits on a branch, merged as one piece of work, is one landing.
    const repo = scratch(0);
    const run = (...args: string[]) => spawnSync('git', args, { cwd: repo.dir, encoding: 'utf8' });
    run('checkout', '-q', '-b', 'work');
    for (let i = 1; i <= 6; i += 1) {
      writeFileSync(join(repo.dir, `w${i}.txt`), `${i}\n`);
      run('add', '-A');
      run('commit', '-qm', `work ${i}`);
    }
    run('checkout', '-q', 'main');
    run('merge', '-q', '--no-ff', '-m', 'Merge pull request #1', 'work');
    run('update-ref', 'refs/remotes/origin/main', 'HEAD');
    repo.plan(stamped(repo.first));

    const v = inspect(repo.dir);
    expect(v.kind).toBe('measured');
    if (v.kind !== 'measured') return;
    expect(v.count).toBe(1);
  });

  it('fails when the status line is absent, rather than passing quietly', () => {
    const repo = scratch(2);
    repo.plan('There is no status line here at all.');
    const v = inspect(repo.dir);
    expect(v.kind).toBe('complaint');
    expect(v.kind === 'complaint' ? v.because : '').toContain('carries no line beginning');
  });

  it('fails when the status line is there but malformed', () => {
    const repo = scratch(2);
    repo.plan('**Status: true as of yesterday, roughly, against main**');
    const v = inspect(repo.dir);
    expect(v.kind).toBe('complaint');
    expect(v.kind === 'complaint' ? v.because : '').toContain('names no commit');
  });

  it('fails when the plan is missing entirely', () => {
    const repo = scratch(2);
    const v = inspect(repo.dir);
    expect(v.kind).toBe('complaint');
    expect(v.kind === 'complaint' ? v.because : '').toContain('could not be read');
  });

  it('fails when the named commit is not in the repository, and says so', () => {
    const absent = '0123456789abcdef0123456789abcdef01234567';
    const repo = scratch(2);
    repo.plan(stamped(absent));
    const v = inspect(repo.dir);
    expect(v.kind).toBe('complaint');
    expect(v.kind === 'complaint' ? v.because : '').toContain('not a commit in this repository');
    expect(v.kind === 'complaint' ? v.because : '').toContain(absent);
  });

  it('says it cannot measure, rather than accusing the plan, when there is no origin/main', () => {
    const repo = scratch(2);
    spawnSync('git', ['update-ref', '-d', 'refs/remotes/origin/main'], { cwd: repo.dir });
    repo.plan(stamped(repo.first));
    const v = inspect(repo.dir);
    expect(v.kind).toBe('cannot-measure');
    expect(v.kind === 'cannot-measure' ? v.because : '').toContain('origin/main');
  });
});
