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
