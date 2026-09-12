import { existsSync, readFileSync } from 'node:fs';
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

  /**
   * The Keeper's **K11-01**: the compressed-format assessment the brief's
   * second caution requires was committed as a 577-line script that **nothing
   * invoked** — no `package.json` script, no test, no CI step — so its numbers
   * lived in one session's stdout and nowhere a reader could reach. The numbers
   * are in the run record now; this holds the command that re-derives them.
   *
   * It is not in `pnpm check` and this test does not ask for it there: the
   * script asserts nothing and prints measurements, and a step that cannot fail
   * does not belong in a gate.
   */
  it('names the compressed-format assessment, so it is a command and not an orphan', () => {
    expect(rootPackage.scripts['measure:compression:v11']).toBe(
      'node apps/mission-control/asset-pipeline/assess-compression.mjs',
    );
    expect(appPackage.scripts['measure:compression:v11']).toBe(
      'node asset-pipeline/assess-compression.mjs',
    );
    expect(
      existsSync(resolve(repoRoot, 'apps/mission-control/asset-pipeline/assess-compression.mjs')),
    ).toBe(true);
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
    // Stage 3's own surface, driven rather than read.
    expect(verify).toContain('the window was not open at the press');
    expect(verify).toContain('back is one step per level');
    expect(verify).toContain('__raiseKeyboard');
    expect(verify).toContain('session control(s) are enabled');
    expect(verify).toContain('a table comes before the conclusion');
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

  /**
   * The Keeper's **K11-04**. Nine `boundingBox({ timeout: 10_000 })` waits made
   * the verify's `PASS` partly a statement about the machine: in his container
   * they expired and reported *"the window has no back chevron"* about a
   * chevron that is rendered, committed and visible in a frame. A check that
   * cries wolf is worse than no check, so the waits are spent in rendered
   * frames instead — and this test is what stops the next one being written in
   * milliseconds.
   *
   * The exception, and it is a real one: the waits for the **document to load
   * and the world to be ready** are still wall-clock, because before the first
   * frame exists there is no frame to count. Every one of them is asserted
   * below to be exactly that and nothing else.
   */
  it('waits in frames, not in milliseconds, everywhere a frame exists to count', () => {
    expect(verify).toContain('const WAIT_FRAMES = 90');
    expect(verify).toContain('async function boxOf(');
    expect(verify).toContain('async function until(');
    // And a press that misses a moving target is retried against a new
    // measurement rather than timed to arrive after an interval.
    expect(verify).toContain('async function pressUntil(');
    // Not one locator bounding-box wait is left, and none may come back.
    expect(verify).not.toMatch(/\.boundingBox\(/);
    expect(verify).not.toMatch(/polling:/);

    const wallClock = verify
      .split('\n')
      .filter((line) => /timeout:/.test(line) && !/^\s*\*/.test(line));
    expect(wallClock).toHaveLength(5);
    for (const line of wallClock) {
      expect(line).toMatch(/canvas|heading|__virgilRoomReady|__virgilRenderer/);
    }
  });

  /**
   * **The budget for proving a negative, and the margin that keeps it honest.**
   *
   * `WAIT_FRAMES` is spent in full every time a loop waits for something that
   * must not happen, which is why the motion tail cost twenty minutes of a
   * thirty-minute CI job and had never once finished there. The first tap is now
   * watched for `NEGATIVE_FRAMES`, derived from the frame count an opening
   * actually takes — and a derived number is only derived while something checks
   * the derivation, so `bothTaps` fails when the positive grows past a quarter
   * of it. Delete that check and this test fails: shortening a negative wait
   * without the margin that justifies it is exactly how a check gets weakened to
   * make a job fit.
   */
  it('watches for what must not happen on a budget it can defend', () => {
    expect(verify).toContain('const NEGATIVE_FRAMES = 12');
    expect(verify).toContain('const MARGIN = 4');
    // The negative budget is used where the negative is, and the full budget is
    // still what a wait for something that must happen gets.
    expect(verify).toMatch(/const first = await tapAndWatch\([^)]*NEGATIVE_FRAMES,/s);
    expect(verify).toMatch(/const second = await tapAndWatch\([^)]*WAIT_FRAMES,/s);
    // The margin, and the failure it raises. Both, because a comparison whose
    // result goes nowhere is the shape of every guard this repository has
    // shipped and never wired.
    expect(verify).toContain('worst * MARGIN > NEGATIVE_FRAMES');
    expect(verify).toContain('The margin has gone');
    expect(verify).toMatch(/failures\.push\(\s*`\$\{label\}: the world took \$\{worst\} frames/);
  });

  it('checks that V10’s route inside the V11 build still carries V10’s chrome', () => {
    expect(verify).toContain("'#/v10'");
    expect(verify).toContain('.room-controls');
    expect(verify).toContain('.owner-footer');
  });
});

/**
 * **The Keeper's KS4-05, as much of it as a test can hold.**
 *
 * The review read the Actions API and found that this branch's gate had never
 * passed: 45 runs, no `success` on the checks job. Three exited 1 inside
 * `verify:owner:v11`; at the reviewed candidate the job hit `timeout-minutes:
 * 30` inside `pnpm check`, and the Mind Scan, both owner builds, both verifies
 * and the digest check were all reported `skipped` behind it. At the branch
 * point, before `pnpm check` ran the V11 verify at all, the same job took four
 * and a half minutes and passed.
 *
 * The workflow now runs the V11 verify's four parts as a matrix, at the same
 * time, each with its own log — and still runs the check **whole** once, in
 * `pnpm check`, because four partial runs are four partial runs. What a test
 * can hold is that the split stays complete: that every viewport the script
 * defines is covered by exactly one part, that exactly one part runs the tail,
 * and that the whole run has not quietly been replaced by the parts.
 *
 * And the disclaimer this file already carries applies twice over here. These
 * assertions read a file. They do not prove GitHub Actions ran anything, and
 * the evidence that CI is green is a run's own conclusion.
 */
describe('the V11 verify’s CI split covers the whole check', () => {
  const verify = readFileSync(
    resolve(repoRoot, 'apps/mission-control/e2e/verify-owner-build-v11.ts'),
    'utf8',
  );
  /** The viewport names the script itself defines, read from `ALL_VIEWPORTS`. */
  const viewports = [...verify.matchAll(/\{ name: '([a-z0-9-]+)', width: \d+/g)].map((m) => m[1]);
  const parts = [
    ...workflow.matchAll(/- name: [^\n]*\n\s+viewports: ([^\n]+)\n\s+tail: ([^\n]+)/g),
  ];

  it('reads three viewports out of the script, so this test cannot go stale', () => {
    expect(viewports).toEqual(['portrait-390', 'portrait-430', 'landscape-844']);
  });

  it('covers every viewport exactly once across the matrix', () => {
    const covered = parts.flatMap((m) => (m[1] === 'none' ? [] : (m[1] as string).split(',')));
    expect([...covered].sort()).toEqual([...viewports].sort());
  });

  it('runs the motion and performance tail in exactly one part', () => {
    const running = parts.filter((m) => m[2] !== 'skip');
    expect(running).toHaveLength(1);
    // And that part takes no viewport, so nothing is measured twice.
    expect(running[0]?.[1]).toBe('none');
  });

  /**
   * **These two assertions used to require the whole run on the critical path,
   * and the system audit established it should not be there — `SA-P-02`.**
   *
   * They pinned `run: pnpm check` inside a `checks:` job and a 45-minute cap on
   * it. That job was 32.8% of every pull request and held nothing the matrix
   * does not: its one unique property — the V11 verify running in a single
   * browser context — is destroyed on purpose by the script itself, which
   * reloads the document at the start of every viewport so that nothing carries
   * between them.
   *
   * What the tests above hold is the thing that actually matters and is
   * unchanged: **the split stays complete.** Every viewport the script defines
   * is covered by exactly one part, and exactly one part runs the tail. Take a
   * viewport out of the matrix and they fail.
   *
   * What is held here instead is that the whole run is still *obtainable*. Four
   * partial runs are four partial runs, and a run record quoting a bare `PASS`
   * needs somewhere to get one — so `workflow_dispatch` must stay, and this
   * asserts it does rather than asserting it runs on every pull request.
   */
  it('keeps the whole run obtainable on demand, rather than on every pull request', () => {
    expect(workflow).toContain('workflow_dispatch:');
    // And the duplicate job is gone: no job may run `pnpm check`, because every
    // command inside it already has its own job below.
    expect(workflow).not.toMatch(/^\s+- name: pnpm check$/m);
    expect(workflow).not.toMatch(/^\s+run: pnpm check$/m);
  });

  it('still runs every part of the gate, in jobs of its own', () => {
    // The commands `pnpm check` used to run. Each must appear somewhere in the
    // workflow, or removing that job quietly removed coverage — which is the
    // one way this change could have been wrong.
    for (const command of [
      'pnpm lint',
      'pnpm typecheck',
      'pnpm test',
      'run verify:owner',
      'run verify:owner:v11',
      'run verify:web',
    ]) {
      expect(workflow, `${command} lost its job`).toContain(command);
    }
  });

  it('does not let the Mind Scan or the digests queue behind a browser check', () => {
    const artifacts = workflow.slice(
      workflow.indexOf('  artifacts:'),
      workflow.indexOf('  verify-v11:'),
    );
    for (const command of [
      'pnpm --filter @virgil/knowledge-lint run lint',
      'pnpm --filter mission-control run build:owner',
      'pnpm --filter mission-control run verify:owner',
      'sha256sum -c *.sha256',
    ]) {
      expect(artifacts).toContain(command);
    }
    // No `needs:` anywhere: the four jobs do not queue behind one another.
    expect(workflow).not.toContain('needs:');
  });
});
