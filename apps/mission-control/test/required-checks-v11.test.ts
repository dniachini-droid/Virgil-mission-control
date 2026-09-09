import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The V11 half of `required-checks.test.ts`, and it exists for the same reason
 * that file does: KR-50 and KR-59 were findings about a guard that nothing ran.
 * A second Owner Build with its own verify is a second chance to make the same
 * mistake, so the wiring is asserted rather than assumed. Remove
 * `verify:owner:v11` from the root `check` script, break the turbo dependency
 * that builds the artifact first, or drop the step from the workflow, and
 * `pnpm test` fails — which means `pnpm check` fails.
 *
 * And the same disclaimer, for the same reason: these assertions read files.
 * They prove the commands are declared. They do not prove GitHub Actions runs
 * them, and no test here can.
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

describe('`pnpm check` exercises both verifies', () => {
  it('runs V10’s and then V11’s, and neither has replaced the other', () => {
    expect(rootPackage.scripts.check).toContain('pnpm verify:owner');
    expect(rootPackage.scripts.check).toContain('pnpm verify:owner:v11');
    expect(rootPackage.scripts['verify:owner']).toBe('turbo run verify:owner');
    expect(rootPackage.scripts['verify:owner:v11']).toBe('turbo run verify:owner:v11');
  });

  it('declares the V11 build and reproducer at the root as well', () => {
    expect(rootPackage.scripts['build:owner:v11']).toBe('turbo run build:owner:v11');
    expect(rootPackage.scripts['reproduce:owner:v11']).toBe(
      'node apps/mission-control/owner-build/reproduce-v11.mjs',
    );
    // V10's are untouched.
    expect(rootPackage.scripts['build:owner']).toBe('turbo run build:owner');
    expect(rootPackage.scripts['reproduce:owner']).toBe(
      'node apps/mission-control/owner-build/reproduce.mjs',
    );
  });

  it('cannot verify a stale V11 artifact: the turbo graph builds it first', () => {
    expect(turbo.tasks['build:owner:v11']).toBeDefined();
    expect(turbo.tasks['verify:owner:v11']?.dependsOn).toContain('build:owner:v11');
  });

  it('is never satisfied from the turbo cache, because a cached browser run is no run', () => {
    expect(turbo.tasks['build:owner:v11']?.cache).toBe(false);
    expect(turbo.tasks['verify:owner:v11']?.cache).toBe(false);
  });

  it('builds V11 into its own directory, so V10’s verify still finds exactly one artifact', () => {
    expect(appPackage.scripts['build:owner:v11']).toContain('vite.owner.v11.config.ts');
    expect(appPackage.scripts['build:owner:v11']).toContain('owner-build/inline-v11.mjs');
    expect(appPackage.scripts['build:owner']).toBe(
      'vite build --config vite.owner.config.ts && node owner-build/inline.mjs',
    );
  });
});

describe('the checks workflow covers V11', () => {
  const requiredCommands = [
    'pnpm --filter mission-control run build:owner:v11',
    'pnpm --filter mission-control run verify:owner:v11',
    'pnpm reproduce:owner:v11',
  ];

  for (const command of requiredCommands) {
    it(`declares \`${command}\``, () => {
      expect(workflow).toContain(command);
    });
  }

  it('still declares every V10 command beside them', () => {
    for (const command of [
      'pnpm --filter mission-control run build:owner',
      'pnpm --filter mission-control run verify:owner',
      'pnpm reproduce:owner',
      'sha256sum -c *.sha256',
    ]) {
      expect(workflow).toContain(command);
    }
  });

  it('suppresses no failure', () => {
    expect(workflow).not.toContain('continue-on-error');
    expect(workflow).not.toMatch(/\|\|\s*true/);
    expect(workflow).not.toContain('if: always()');
  });
});

describe('the V11 verify is a measurement, not a reading', () => {
  const verify = readFileSync(
    resolve(repoRoot, 'apps/mission-control/e2e/verify-owner-build-v11.ts'),
    'utf8',
  );

  it('opens the artifact from a file:// URL and fails on any off-document request', () => {
    expect(verify).toContain('pathToFileURL');
    expect(verify).toContain('off-document requests');
  });

  it('measures the touch targets rather than counting them in the source', () => {
    expect(verify).toContain('getBoundingClientRect()');
    expect(verify).toContain('const MIN_TOUCH_PX = 44');
  });

  it('drives the gesture guard with a real drag and a real tap', () => {
    expect(verify).toContain('page.mouse.down()');
    expect(verify).toContain('drag across the Virgil target opened a panel');
  });

  it('visits the two portrait widths the brief names, and a landscape one', () => {
    expect(verify).toContain('width: 390');
    expect(verify).toContain('width: 430');
    expect(verify).toContain("name: 'landscape-844'");
  });

  it('says in its own output that every iPhone figure is simulated', () => {
    expect(verify).toContain('SIMULATED viewports in headless Chromium');
    expect(verify).toContain('NOT PERFORMED, never met');
  });

  it('checks that V10’s route inside the V11 build still carries V10’s chrome', () => {
    expect(verify).toContain("'#/v10'");
    expect(verify).toContain('.room-controls');
    expect(verify).toContain('.owner-footer');
  });
});
