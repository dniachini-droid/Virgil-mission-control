import type { Outcome } from '../room/demo.js';

/**
 * The counts on the agents' screens, as the work runs.
 *
 * V8 (`docs/process/PHASE_1_STYLISED_SPEC.md` §0.10.7). The owner: "there
 * should also be a counter for the keeper, for example how many issues it
 * found and blockers it found … same as the proover, like the outcomes of
 * its tests as it works (but it shoudlnt recquire a change in how the
 * actual agent reacts)." So each agent's screen counts, in the
 * repository's own vocabulary, and the faces and lights are untouched:
 *
 *  - **the Fabricator**: what a candidate-artifact record carries —
 *    `filesChanged` and `commits` (`schemas/candidate-artifact.schema.json`);
 *  - **the Prover**: check outcomes — `constitution/authority.json`
 *    `checkResults`: `running`, `passed`, `failed`, `skipped`; a
 *    verification record's `checksRun` and `checksSkipped`
 *    (`packages/agent-contracts/src/operational.ts`);
 *  - **the Keeper**: findings, each with a severity —
 *    `packages/agent-contracts/src/common.ts` `Severity`: `blocking`,
 *    `major`, `minor`, `informational` — counted as they are raised, and
 *    how many are blocking (`REVIEW_POLICY.md`: "Every finding has a
 *    stable identity, a severity …").
 *
 * **Every number here is illustrative.** They are fixed schedules in
 * seconds since the work began, chosen so the counts accumulate visibly
 * over a six-second beat and resolve at the verdict; the screen they are
 * drawn on says so on its band. They never read this repository's state.
 * Pure, so `test/screen-motion.test.ts` holds them: monotonic, resolving
 * to totals that agree with the loop's outcome.
 */

export type CheckResult = 'running' | 'passed' | 'failed' | 'skipped';

export interface Check {
  /** When it starts, seconds into the working beat. */
  start: number;
  /** How long it runs. */
  seconds: number;
  /** How it ends, for this loop. */
  result: Exclude<CheckResult, 'running'>;
}

/** How many checks the Prover runs, and the one that fails or is skipped, per outcome. */
export const PROVER_CHECKS = 14;
const FAILING_CHECK = 9;
const SKIPPED_CHECK = 11;

/** The Prover's checks for a loop that ends in `outcome`: a fixed schedule. */
export function proverChecks(outcome: Outcome): Check[] {
  const checks: Check[] = [];
  for (let i = 0; i < PROVER_CHECKS; i += 1) {
    const start = 0.2 + i * 0.36;
    const seconds = 0.85 + ((i * 7) % 4) * 0.08;
    let result: Check['result'] = 'passed';
    if (outcome === 'BLOCKED' && i === FAILING_CHECK) result = 'failed';
    if (outcome === 'INSUFFICIENT_EVIDENCE' && i === SKIPPED_CHECK) result = 'skipped';
    checks.push({ start, seconds, result });
  }
  return checks;
}

export interface ProverTally {
  running: number;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  /** Each check's state at this moment, and how far through it is. */
  checks: { state: CheckResult; progress: number }[];
}

/**
 * The Prover's counts `since` seconds into the working beat.
 *
 * `schedule` overrides the demonstration's fixture: the replay passes the
 * checks the record actually names, with the results it records
 * (`screens/work.ts`). Nothing else changes — the same arithmetic, the
 * same drawing.
 */
export function proverTally(
  since: number,
  outcome: Outcome,
  schedule?: readonly Check[],
): ProverTally {
  const checks = schedule ? [...schedule] : proverChecks(outcome);
  const tally: ProverTally = {
    running: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    total: checks.length,
    checks: [],
  };
  for (const check of checks) {
    if (since < check.start) {
      tally.checks.push({ state: 'running', progress: 0 });
      continue;
    }
    const progress = Math.min(1, (since - check.start) / check.seconds);
    // A skipped check never runs: it stalls at once and is recorded.
    if (check.result === 'skipped') {
      const stalled = since >= check.start + 0.35;
      if (stalled) tally.skipped += 1;
      else tally.running += 1;
      tally.checks.push({ state: stalled ? 'skipped' : 'running', progress: 0.12 });
      continue;
    }
    if (progress < 1) {
      tally.running += 1;
      tally.checks.push({ state: 'running', progress });
      continue;
    }
    tally[check.result] += 1;
    tally.checks.push({ state: check.result, progress: 1 });
  }
  return tally;
}

export interface Finding {
  /** When it is raised, seconds into the review. */
  at: number;
  severity: 'blocking' | 'major' | 'minor' | 'informational';
  /** Which line of the reviewed text it flags, 0..1 down the page. */
  line: number;
}

/** The Keeper's illustrative review: three findings, none blocking. */
export const KEEPER_FINDINGS: readonly Finding[] = [
  { at: 1.5, severity: 'minor', line: 0.22 },
  { at: 3.1, severity: 'informational', line: 0.58 },
  { at: 4.5, severity: 'major', line: 0.81 },
];

export interface KeeperTally {
  findings: number;
  blocking: number;
  /** How far down the page the review has read, 0..1. */
  read: number;
  raised: Finding[];
}

/**
 * The Keeper's counts `since` seconds into the review. `schedule` and
 * `readSeconds` override the demonstration's fixture; the replay passes
 * the findings the independent Keeper actually raised, with the severities
 * the record gives them.
 */
export function keeperTally(
  since: number,
  schedule?: readonly Finding[],
  readSeconds = 5.6,
): KeeperTally {
  const all = schedule ?? KEEPER_FINDINGS;
  const raised = all.filter((f) => since >= f.at);
  return {
    findings: raised.length,
    blocking: raised.filter((f) => f.severity === 'blocking').length,
    read: Math.min(1, Math.max(0, since / readSeconds)),
    raised: [...raised],
  };
}

export interface FabricatorTally {
  files: number;
  commits: number;
  /** How far through the current file's write, 0..1. */
  writing: number;
}

/** When each file lands and each commit is made, seconds into the build. */
export const FABRICATOR_FILES = [0.4, 0.9, 1.5, 1.9, 2.6, 3.4, 4.1, 4.9];
export const FABRICATOR_COMMITS = [2.2, 4.4, 5.6];

/**
 * The Fabricator's counts `since` seconds into the build. `fileTimes` and
 * `commitTimes` override the demonstration's fixture; the replay passes
 * one entry per path and per commit the run really made, so the counter
 * reads the run's own numbers.
 */
export function fabricatorTally(
  since: number,
  fileTimes: readonly number[] = FABRICATOR_FILES,
  commitTimes: readonly number[] = FABRICATOR_COMMITS,
): FabricatorTally {
  const files = fileTimes.filter((t) => since >= t).length;
  const next = fileTimes[files];
  const previous = files > 0 ? (fileTimes[files - 1] as number) : 0;
  const writing = next === undefined ? 1 : Math.min(1, (since - previous) / (next - previous));
  return {
    files,
    commits: commitTimes.filter((t) => since >= t).length,
    writing: Math.max(0, writing),
  };
}

/**
 * The evidence beneath a verdict (V8 §0.10.7, candidate 1): the kinds of
 * deterministic check this repository really produces — the unit tests,
 * the typecheck tasks, the Owner Build's requests and off-document
 * requests, the knowledge graph's tethers — with illustrative numbers.
 * A verdict alone is a claim; these are what would make it a proof.
 */
export function evidenceLines(outcome: Outcome): string[] {
  switch (outcome) {
    case 'BLOCKED':
      return ['TESTS 301 PASSED · 1 FAILED', 'TYPECHECK 8 TASKS', 'REQUESTS 1 · OFF-DOCUMENT 0'];
    case 'INSUFFICIENT_EVIDENCE':
      return [
        'TESTS 302 PASSED · 0 FAILED',
        'REQUIRED CHECK SKIPPED · 1',
        'SOURCE LINKS 88 · 88 INTACT',
      ];
    default:
      return [
        'TESTS 302 PASSED · 0 FAILED',
        'REQUESTS 1 · OFF-DOCUMENT 0',
        'SOURCE LINKS 88 · 88 INTACT',
      ];
  }
}
