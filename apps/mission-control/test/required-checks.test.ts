import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * These assertions are about the wiring of the checks, not about the code the
 * checks look at, and they exist because of a specific failure mode this
 * repository has already been told about.
 *
 * KR-50 and KR-59: `build:owner` and `verify:owner` were reachable from no
 * required check and no workflow, so the only guard that catches a network
 * escape in the Owner Build was the one guard nothing ran. A workflow file
 * alone would not answer that, because a workflow file is one edit away from
 * gone and nothing would notice. So the wiring is asserted here: remove
 * `verify:owner` from the root `check` script, break the turbo dependency that
 * makes it build the artifact first, delete a step from the workflow, or add a
 * `continue-on-error` to it, and `pnpm test` fails — which means `pnpm check`
 * fails, which means the workflow fails.
 *
 * What these assertions do **not** establish, stated plainly for the same
 * reason `ENFORCEMENT_BOUNDARIES.md` states it about `.claude/settings.json`:
 * they read files. They prove the commands are declared, in the scripts and in
 * the workflow. They do not prove GitHub Actions runs them, and no test here
 * can. The evidence that they ran is a run's own log.
 */

const repoRoot = resolve(import.meta.dirname, '../../..');

const rootPackage = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const appPackage = JSON.parse(
  readFileSync(resolve(repoRoot, 'apps/mission-control/package.json'), 'utf8'),
) as { scripts: Record<string, string> };
const turbo = JSON.parse(readFileSync(resolve(repoRoot, 'turbo.json'), 'utf8')) as {
  tasks: Record<string, { dependsOn?: string[]; cache?: boolean }>;
};
const workflow = readFileSync(resolve(repoRoot, '.github/workflows/checks.yml'), 'utf8');

describe('verify:owner is reachable from a required check', () => {
  it('runs as part of the root `check` script, not only from a workflow file', () => {
    expect(rootPackage.scripts.check).toContain('pnpm verify:owner');
    expect(rootPackage.scripts['verify:owner']).toBe('turbo run verify:owner');
  });

  it('cannot verify a stale artifact: the turbo graph builds it first', () => {
    expect(turbo.tasks['build:owner']).toBeDefined();
    expect(turbo.tasks['verify:owner']?.dependsOn).toContain('build:owner');
  });

  it('is never satisfied from the turbo cache, because a cached browser run is no run', () => {
    expect(turbo.tasks['build:owner']?.cache).toBe(false);
    expect(turbo.tasks['verify:owner']?.cache).toBe(false);
  });
});

describe('the checks workflow', () => {
  it('runs on every branch and on pull requests', () => {
    expect(workflow).toMatch(/^on:$/m);
    expect(workflow).toMatch(/branches: \['\*\*'\]/);
    expect(workflow).toMatch(/^ {2}pull_request:$/m);
  });

  // One entry per numbered step of the brief this workflow was built to.
  const requiredCommands = [
    'pnpm install --frozen-lockfile',
    'pnpm check',
    'pnpm --filter @virgil/knowledge-lint run lint',
    'pnpm --filter mission-control run build:owner',
    'pnpm --filter mission-control run verify:owner',
    'sha256sum -c *.sha256',
    'pnpm reproduce:owner',
  ];

  for (const command of requiredCommands) {
    it(`declares \`${command}\``, () => {
      expect(workflow).toContain(command);
    });
  }

  it('installs the browser `verify:owner` needs, at the version the lockfile pins', () => {
    expect(workflow).toContain('pnpm --filter mission-control run install:browser');
    // No version or revision here: the script asks Playwright for the Chromium
    // that the `@playwright/test` in `pnpm-lock.yaml` resolves to.
    expect(appPackage.scripts['install:browser']).toBe('playwright install --with-deps chromium');
  });

  it('fetches full history, because the rebuild happens at the artifact’s own commit', () => {
    expect(workflow).toContain('fetch-depth: 0');
  });

  it('suppresses no failure', () => {
    expect(workflow).not.toContain('continue-on-error');
    expect(workflow).not.toMatch(/\|\|\s*true/);
    expect(workflow).not.toContain('if: always()');
  });
});

/**
 * **The gate moved on 2026-09-10; these assertions are what stop it moving
 * further.**
 *
 * The repository exhausted its 2,000 included Actions minutes and every run
 * after 05:36 UTC failed in seconds with no runner and no logs — indistinguish-
 * able, on the face of it, from broken code. Four jobs at roughly eighty-five
 * machine-minutes a push, two of them driving a WebGL scene through a software
 * rasteriser, is a month's allowance in twenty-five pushes.
 *
 * So a push now runs the fast half and a pull request runs everything. That is a
 * real reduction in what a push proves, and the whole of the argument for it is
 * that **nothing reaches `main` except through a pull request**, where the full
 * gate still runs. These tests hold that argument to its terms: if the expensive
 * jobs were ever gated away from pull requests as well, the reduction would stop
 * being a change of timing and become a hole, and this file would fail.
 */
describe('the gate runs in full before anything can merge', () => {
  const gated = [
    'lint, typecheck, tests, owner build, owner verify',
    'Mind Scan, V10 owner build and verify, committed digests',
    'V11 owner build and verify',
    'newest Owner Build rebuilds byte for byte',
  ];

  it('offers a fast half, and it is lint, typecheck and the tests', () => {
    expect(workflow).toMatch(/^ {4}name: lint, typecheck, tests$/m);
    expect(workflow).toContain('run: pnpm lint');
    expect(workflow).toContain('run: pnpm typecheck');
    expect(workflow).toContain('run: pnpm test');
  });

  it('can be asked for the whole thing on demand', () => {
    expect(workflow).toMatch(/^ {2}workflow_dispatch:$/m);
  });

  /**
   * **This assertion was the Keeper's KP2-02 and is replaced by its inverse.**
   *
   * It required `paths-ignore` to list `docs/**`, `knowledge/**` and a glob
   * covering every markdown file,
   * and then claimed — in a comment — that *"nothing that changes what a check
   * measures is in the ignore list"*, while checking only that two unrelated
   * strings were absent. The claim was false: `knowledge-graph/src/derive.ts`
   * walks `docs/decisions`, `knowledge/raw` and `knowledge/wiki`, and
   * `seed-graph.test.ts` asserts a byte-for-byte match against a fresh
   * derivation. All three ignored patterns were inputs to it. A push touching
   * only an owner decision record broke the suite and ran no check at all.
   *
   * **The property is now enforced by deriving it rather than by naming it.**
   * The deriver's own source is read, every path literal it walks is extracted,
   * and each one is required not to be covered by any ignore pattern. If someone
   * adds `paths-ignore` back, this fails unless the deriver reads none of what
   * it ignores. A comment cannot drift away from that, because there is no
   * comment doing the work.
   */
  it('ignores no path that any check actually reads', () => {
    const deriver = readFileSync(
      resolve(repoRoot, 'packages/knowledge-graph/src/derive.ts'),
      'utf8',
    );
    // The directories the graph is derived from, taken from the deriver itself.
    const read = [...deriver.matchAll(/join\((?:root|kdir), '([^']+)'\)/g)].map((m) => m[1] ?? '');
    const roots = new Set(read.map((path) => path.split('/')[0] ?? ''));
    // `kdir` is `knowledge/`, which the join hides; it is added by name because
    // the deriver's own variable makes it invisible to the pattern above.
    roots.add('knowledge');
    expect(roots.size).toBeGreaterThan(1);

    const ignored = [...workflow.matchAll(/^ {6}- '([^']+)'$/gm)].map((m) => m[1] ?? '');
    for (const pattern of ignored) {
      const top = pattern.split('/')[0] ?? '';
      expect(
        roots.has(top) || pattern.startsWith('**'),
        `the workflow ignores ${pattern}, which a check reads`,
      ).toBe(false);
    }
  });

  it('holds the expensive jobs back from a push and from nothing else', () => {
    const conditions = workflow.match(/^ {4}if: .*$/gm) ?? [];
    expect(conditions.length).toBe(gated.length);
    for (const condition of conditions) {
      // The one permitted condition. Anything narrower — excluding pull
      // requests, or naming a branch — would take the full gate off the only
      // path into `main`.
      expect(condition.trim()).toBe("if: github.event_name != 'push'");
    }
  });

  it('still declares every expensive job, rather than deleting them', () => {
    for (const name of gated) {
      expect(workflow).toContain(name);
    }
  });
});
