import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * **Every repository-root path a test reads is declared to the cache — `KXR-29`.**
 *
 * `turbo.json` declared no `inputs` for the `test` task, so turbo hashed each
 * package's own files and nothing else. Tests that read from the repository root
 * — `constitution/`, `docs/`, `knowledge/` — could therefore have their inputs
 * change while turbo saw no change at all, and it replayed a cached pass. Three
 * commit messages claimed `pnpm check` passed when it had not been run.
 *
 * **The first repair fixed the instance and not the class.** It enumerated the
 * paths by hand, a reviewer reproduced the identical failure signature through
 * `docs/product/VIRGIL_MASTER_COMMISSION.md` — which the hand-written list did
 * not contain — and both the commit message and the pull request said the task
 * "now declares the root paths its tests actually read". It did not.
 *
 * A list maintained by hand is wrong the moment somebody adds a test. So this
 * reads what the tests actually reach for and refuses anything the cache is not
 * watching. The next missing path fails here rather than three commits later in
 * somebody else's review.
 *
 * **What this cannot do**, said rather than implied: it matches the shapes this
 * repository writes — `resolve(root, '…')`, `resolve(repoRoot, '…')`, and
 * `new URL('../../../…')`. A test reaching the root by a shape nobody wrote yet
 * is invisible to it, exactly as `KXR-29` was invisible to the list it replaces.
 * It is narrower than the problem and wider than the last attempt.
 *
 * **And `root` does not always mean the repository root.** A test that writes
 * into a scratch directory binds `root = mkdtempSync(…)` and then resolves
 * against it, which is the same shape and none of this check's business — the
 * cache cannot replay a stale pass over a directory created fresh each run.
 * Read textually, those reads were reported as undeclared inputs named
 * `answer.txt` and `nothing.txt`, which no `turbo.json` could ever declare.
 * So the binding is consulted, not just the call.
 */

const root = resolve(import.meta.dirname, '../../..');
const turbo = JSON.parse(readFileSync(resolve(root, 'turbo.json'), 'utf8')) as {
  tasks: Record<string, { inputs?: string[] }>;
};

/**
 * A file that binds `root` to a fresh temporary directory is not reaching the
 * repository root when it resolves against it, whatever the call looks like.
 */
const ROOT_IS_SCRATCH = /\broot\s*=\s*mkdtempSync\s*\(/;

/** The three ways a test in this repository reaches out of its own package. */
const REACHES = [
  /resolve\(\s*root\s*,\s*'([^']+)'/g,
  /resolve\(\s*repoRoot\s*,\s*'([^']+)'/g,
  // Exactly three levels: that is what reaches the repository root from a
  // package's `test/` directory. One or two levels stay inside the package and
  // are covered by `$TURBO_DEFAULT$`.
  /new URL\('\.\.\/\.\.\/\.\.\/([^']+)'/g,
];

function testFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) testFiles(full, out);
    else if (entry.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

/** The first path segment of everything the tests reach for at the root. */
function rootSegmentsRead(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const file of testFiles(root)) {
    // This file's own prose contains the shapes it searches for. Reading itself
    // would make it report its own documentation as an undeclared input — which
    // it did, on its first run.
    if (file.endsWith('cache-inputs.test.ts')) continue;
    const text = readFileSync(file, 'utf8');
    // `REACHES[0]` is the `resolve(root, …)` shape. When this file's `root` is a
    // scratch directory, that shape says nothing about the repository.
    const patterns = ROOT_IS_SCRATCH.test(text) ? REACHES.slice(1) : REACHES;
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match = pattern.exec(text);
      while (match !== null) {
        const path = (match[1] ?? '').replace(/^\.\//, '');
        const segment = path.split('/')[0] ?? '';
        // Paths inside the reading package are covered by $TURBO_DEFAULT$.
        if (segment && !file.startsWith(resolve(root, segment))) {
          found.set(segment, [...(found.get(segment) ?? []), file.replace(`${root}/`, '')]);
        }
        match = pattern.exec(text);
      }
    }
  }
  return found;
}

const declared = turbo.tasks.test?.inputs ?? [];
const covered = new Set(
  declared
    .filter((i) => i.startsWith('$TURBO_ROOT$/'))
    .map((i) => i.slice('$TURBO_ROOT$/'.length).replace(/\/\*\*$/, '')),
);

describe('the test cache watches everything the tests read', () => {
  it('declares inputs at all, or turbo hashes each package alone', () => {
    // The condition that produced the BLOCKED verdict: no `inputs` key.
    expect(declared.length, 'the test task declares no inputs').toBeGreaterThan(1);
    expect(declared, 'the package’s own files are no longer hashed').toContain('$TURBO_DEFAULT$');
  });

  it('finds root reads to check, or this proves nothing', () => {
    expect(rootSegmentsRead().size, 'no test reaches the repository root').toBeGreaterThan(2);
  });

  it('declares every root path the tests actually reach for', () => {
    const missing: string[] = [];
    for (const [segment, files] of rootSegmentsRead()) {
      if (!covered.has(segment)) {
        missing.push(
          `${segment} — read by ${files[0]}${files.length > 1 ? ` and ${files.length - 1} more` : ''}`,
        );
      }
    }
    expect(
      missing,
      `these are read by tests and not declared in turbo.json's test inputs, so a change to one of them will replay a cached pass: ${missing.join('; ')}`,
    ).toEqual([]);
  });
});
