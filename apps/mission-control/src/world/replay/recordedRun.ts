/**
 * **A run that actually happened, read out of this repository.**
 *
 * The owner's direction of 8 September: *"once this is all done, queue up
 * a job that runs an example script (just take one from this chat window)
 * - but not normal speed. Make it faster so I can see. With the new text
 * on screens too."*
 *
 * The source is **not** a chat transcript. It is the repository's own
 * committed record: `git` commit timestamps, SHAs and file counts;
 * `docs/process/run-records/consolidation.run-record.json` (the
 * machine-readable twin validated by
 * `packages/agent-contracts/test/run-record.test.ts`);
 * `docs/process/CONSOLIDATION_RUN_RECORD.md`; and the owner's decisions
 * `OD-0003` and `OD-0004`, which carry authority layer 1. Every fact below
 * carries a `Provenance` — the document, the section and the commit it
 * came from — and the panel prints it, so that every line on screen can be
 * answered with "where in the repository does this come from".
 *
 * **Why this run and not a V8.x pass.** The two honest options in
 * `docs/process/PHASE_1_BACKLOG.md` were a V8.x pass with the review hop
 * shown as missing, or this one. This one is chosen because it is the only
 * run in this repository whose **independent review has a recorded
 * verdict**, and because of what that verdict was: the deterministic
 * checks were **all green** on the first candidate and the independent
 * Keeper still returned **BLOCKED**. A replay that shows nine green checks
 * followed by a blocking review is the strongest available demonstration
 * of the thing the whole constitution is for — that a builder's report and
 * a passing check suite are not a review. A V8.x replay would have shown
 * the absence of a hop; this one shows what the hop is worth.
 *
 * It does not hide the gap the other option would have surfaced. The
 * Phase 1 viewing points V6 to V9 have had **no independent review at
 * all**, and `PHASE_1_HOW_TO_LOOK_V10_REPLAY.md` and the run record say so
 * in the same breath as this.
 *
 * **Nothing here is invented, and nothing here is live.** These are past
 * facts about a merged lineage, played back. The honesty band says exactly
 * that (`screens/draw.ts`, `REPLAY_BAND_LINES`).
 */

/** An ISO 8601 instant in UTC, exactly as the repository records it. */
export type Instant = string;

/** Where a fact came from: the file, the part of it, and the commit. */
export interface Provenance {
  /** The repository-relative path, or `git` for a fact read off the history itself. */
  document: string;
  /** The section, table, field or command inside it. */
  section: string;
  /** The commit whose content this is. */
  commit: string;
}

/** Seconds between two recorded instants. Derived, never restated. */
export function secondsBetween(from: Instant, to: Instant): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 1000);
}

/**
 * A recorded duration, formatted for a screen: `1 H 30 M`, `24 M 57 S`,
 * `48 S`. Upper case and spaced, because the display face has no lower
 * case and the screens set everything in it.
 */
export function recordedDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} H`);
  if (m > 0) parts.push(`${m} M`);
  if (s > 0 || parts.length === 0) parts.push(`${s} S`);
  return parts.join(' ');
}

/** `2026-09-07T00:02:14+00:00` as `07 SEP 00:02 UTC`, for a screen. */
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export function recordedClock(instant: Instant): string {
  const at = new Date(instant);
  const day = String(at.getUTCDate()).padStart(2, '0');
  const month = MONTHS[at.getUTCMonth()] as string;
  const hh = String(at.getUTCHours()).padStart(2, '0');
  const mm = String(at.getUTCMinutes()).padStart(2, '0');
  return `${day} ${month} ${hh}:${mm} UTC`;
}

/**
 * The run itself.
 *
 * `startedAt` and `completedAt` are the run record's own fields; the four
 * instants between them are git committer timestamps, which is what the
 * consolidation session's own clock wrote. The three cherry-picked commits
 * carry **author** dates from the branch they came from (22:44:03Z, before
 * the run began); their committer dates, 23:37:17Z, are when this run made
 * them, and those are the ones used.
 */
export const RUN = {
  id: 'phase-0-consolidation',
  /** Upper case: it is set in the display face, which has no lower case. */
  title: 'PHASE 0 CONSOLIDATION',
  repository: 'dniachini-droid/Virgil-mission-control',
  branch: 'claude/virgil-main-consolidation-6f5fuc',
  /** `main` when the branch was cut. */
  baseSha: '8210125705e01650ec82154fc4c2cee0ba076bdf',
  /** The Phase 0 foundation tip the consolidation built on top of. */
  phase0Tip: '4b834a4b496bb07a45bfb8c9ca1f0384b644b1f3',
  roleId: 'fabricator',
  authorityTier: 'TIER_2',
  startedAt: '2026-09-06T23:30:00+00:00',
  completedAt: '2026-09-07T01:00:00+00:00',
  pullRequest: '#1',
  mergeSha: 'cd0981d1cdbf6ac959e25c31856012aa776dd1c5',
  mergedAt: '2026-09-07T00:58:07+00:00',
  provenance: {
    document: 'docs/process/run-records/consolidation.run-record.json',
    section: 'runId, branch, baseSha, roleId, authorityTier, startedAt, completedAt',
    commit: '3b9a964',
  } satisfies Provenance,
} as const;

/** How long the run took, from its own record. Derived. */
export const RUN_SECONDS = secondsBetween(RUN.startedAt, RUN.completedAt);

/** The two candidate SHAs this one lineage produced. */
export interface RecordedCandidate {
  sha: string;
  /** The ten characters the slabs and the ledger show. */
  short: string;
  /** When its commit was made (git committer time). */
  committedAt: Instant;
  /** How many paths differ from the previous candidate, per `git diff --name-only`. */
  filesChanged: number;
  /** The commits that made it, oldest first. */
  commits: readonly { sha: string; subject: string }[];
  provenance: Provenance;
}

export const CANDIDATES: readonly RecordedCandidate[] = [
  {
    sha: '956be26064171f53022f92fc4429770bb727eaa5',
    short: '956be26064',
    committedAt: '2026-09-07T00:02:14+00:00',
    filesChanged: 75,
    commits: [
      { sha: '0e3c067', subject: 'validate actor, authority, decisions; derive verification' },
      { sha: '9c6ca36', subject: 'distinguish reducer, gate-engine and orchestration enforcement' },
      { sha: '0a82850', subject: 'regenerate the seed graph and add a freshness test' },
      { sha: 'e3e6488', subject: 'restrict resume targets; normalise repository paths' },
      { sha: '3bbf2c8', subject: 'state enforcement status per layer; record the consolidation' },
      { sha: '79b80e5', subject: 'import the approved visual canon, concepts and provenance' },
      { sha: '956be26', subject: 'consolidation run record, machine-readable twin, probe script' },
    ],
    provenance: {
      document: 'git',
      section: 'git log 4b834a4..956be26; git diff --name-only 4b834a4..956be26',
      commit: '956be26',
    },
  },
  {
    sha: '3b9a964e7de4c53560fd3128090cdba39b005c6c',
    short: '3b9a964e7d',
    committedAt: '2026-09-07T00:35:36+00:00',
    filesChanged: 25,
    commits: [
      { sha: '3b9a964', subject: 'second repair round: own-grant writes, fail-closed contract' },
    ],
    provenance: {
      document: 'git',
      section: 'git log 956be26..3b9a964; git diff --name-only 956be26..3b9a964',
      commit: '3b9a964',
    },
  },
];

/**
 * The paths the repair round touched, from `git diff --name-only
 * 956be26..3b9a964`. Twenty-five of them, and all twenty-five are here:
 * the panel scrolls rather than truncating.
 */
export const REPAIR_PATHS: readonly string[] = [
  '.claude/settings.json',
  'docs/architecture/ENFORCEMENT_BOUNDARIES.md',
  'docs/architecture/EVENT_MODEL.md',
  'docs/decisions/README.md',
  'docs/decisions/proposed/OD-0003-consolidation-repair-round.md',
  'docs/process/CONSOLIDATION_RUN_RECORD.md',
  'docs/process/PERMISSION_MATRIX.md',
  'docs/process/PHASE_0_TRACEABILITY.md',
  'docs/process/run-records/consolidation.run-record.json',
  'docs/security/THREAT_MODEL.md',
  'docs/testing/TEST_STRATEGY.md',
  'knowledge/log.md',
  'packages/agent-contracts/src/events.ts',
  'packages/agent-contracts/test/permission-matrix.test.ts',
  'packages/domain/scripts/k-probe.ts',
  'packages/domain/src/guards.ts',
  'packages/domain/src/reducer.ts',
  'packages/domain/src/state.ts',
  'packages/domain/src/validation.ts',
  'packages/domain/test/adversarial.test.ts',
  'packages/domain/test/repair-round-2.test.ts',
  'packages/domain/test/resume-and-paths.test.ts',
  'packages/test-fixtures/knowledge/seed-graph.json',
  'packages/test-fixtures/src/runs/foundry.ts',
  'schemas/domain-event.schema.json',
];

/** What the grant allowed the builder to do, verbatim from the run record. */
export const PERMITTED_ACTIONS: readonly string[] = [
  'commit_and_push_to_single_consolidation_branch',
  'open_one_pull_request_targeting_main',
  'repair_keeper_findings_k01_k02_k03_k15',
  'import_owner_approved_artifacts_with_provenance',
];

/** A deterministic check as the record names it, with what it printed. */
export interface RecordedCheck {
  id: string;
  name: string;
  result: 'passed' | 'failed' | 'skipped';
  /** The command output or reason, as the record has it. */
  evidence: string;
  required: boolean;
}

/**
 * The checks on the **first** candidate, from
 * `CONSOLIDATION_RUN_RECORD.md`, "Checks run on the final validated tree".
 * Nine of them, and **every one passed** — which is the point of the
 * replay: the independent review then blocked the candidate anyway.
 *
 * The unit-test count carries the Keeper's own correction (KR-10): the
 * table said 209, the first candidate had 210.
 */
export const CHECKS_CANDIDATE_1: readonly RecordedCheck[] = [
  {
    id: 'install',
    name: 'INSTALL FROM LOCKFILE',
    result: 'passed',
    evidence: 'pnpm install --frozen-lockfile · exit 0',
    required: true,
  },
  {
    id: 'biome',
    name: 'BIOME LINT AND FORMAT',
    result: 'passed',
    evidence: '108 files · no fixes needed',
    required: true,
  },
  {
    id: 'typecheck',
    name: 'TYPESCRIPT TYPECHECK',
    result: 'passed',
    evidence: 'TypeScript 7.0.2 · 8 targets · clean',
    required: true,
  },
  {
    id: 'unit',
    name: 'UNIT AND REGRESSION TESTS',
    result: 'passed',
    evidence: '210 passed (KR-10 corrected the table’s 209)',
    required: true,
  },
  {
    id: 'schema-freshness',
    name: 'SCHEMA REGENERATION',
    result: 'passed',
    evidence: '39 schemas exported · git diff schemas/ empty',
    required: true,
  },
  {
    id: 'seed-graph-freshness',
    name: 'SEED GRAPH FRESHNESS',
    result: 'passed',
    evidence: 'no diff · seed-graph.test.ts green',
    required: true,
  },
  {
    id: 'knowledge-lint',
    name: 'MIND SCAN',
    result: 'passed',
    evidence: '76 nodes · 166 edges · 94/94 tethers · no findings',
    required: true,
  },
  {
    id: 'build',
    name: 'PRODUCTION BUILD',
    result: 'passed',
    evidence: 'index-*.js 1,652.82 kB (448.94 kB gzip)',
    required: true,
  },
  {
    id: 'adversarial-probe',
    name: 'ADVERSARIAL PROBE',
    result: 'passed',
    evidence: 'nine exploits rejected on the branch, accepted on the base',
    required: true,
  },
];

export const CHECKS_CANDIDATE_1_PROVENANCE: Provenance = {
  document: 'docs/process/CONSOLIDATION_RUN_RECORD.md',
  section: 'Checks run on the final validated tree; KR-10 in the second repair round',
  commit: '956be26',
};

/**
 * The checks on the **second** candidate, from the machine-readable twin's
 * own `checksRun` array — nine that ran and passed, and three that were
 * skipped with the reasons it records.
 *
 * The twin's array has a thirteenth entry, `independent-review`, marked
 * **required and skipped**. It is deliberately not in this list: it is not
 * a check that session could run, it is the next hop, and it is the row
 * below on the ledger. `REVIEW_SKIPPED_NOTE` states that rather than
 * hiding it.
 */
export const CHECKS_CANDIDATE_2: readonly RecordedCheck[] = [
  {
    id: 'install',
    name: 'INSTALL FROM LOCKFILE',
    result: 'passed',
    evidence: 'pnpm install --frozen-lockfile · exit 0',
    required: true,
  },
  {
    id: 'biome',
    name: 'BIOME LINT AND FORMAT',
    result: 'passed',
    evidence: 'biome check . · 111 files · no fixes',
    required: true,
  },
  {
    id: 'typecheck',
    name: 'TYPESCRIPT TYPECHECK',
    result: 'passed',
    evidence: 'turbo run typecheck · 8 targets',
    required: true,
  },
  {
    id: 'unit',
    name: 'UNIT AND REGRESSION TESTS',
    result: 'passed',
    evidence: '225 tests · domain 104 · agent-contracts 54',
    required: true,
  },
  {
    id: 'schema-freshness',
    name: 'SCHEMA REGENERATION',
    result: 'passed',
    evidence: 'export-schemas · git diff schemas/ empty',
    required: true,
  },
  {
    id: 'seed-graph-freshness',
    name: 'SEED GRAPH FRESHNESS',
    result: 'passed',
    evidence: 'export-seed-graph · git diff empty',
    required: true,
  },
  {
    id: 'knowledge-lint',
    name: 'MIND SCAN',
    result: 'passed',
    evidence: '94/94 tethers intact · no findings',
    required: true,
  },
  {
    id: 'build',
    name: 'PRODUCTION BUILD',
    result: 'passed',
    evidence: 'turbo run build · exit 0',
    required: true,
  },
  {
    id: 'adversarial-probe',
    name: 'ADVERSARIAL PROBE',
    result: 'passed',
    evidence: 'KR-01, KR-02 and KR-04 rejected on this branch',
    required: true,
  },
  {
    id: 'gpu-visual-review',
    name: 'VISUAL JUDGMENT ON A GPU',
    result: 'skipped',
    evidence: 'no GPU in the container',
    required: false,
  },
  {
    id: 'performance-measurement',
    name: 'FRAME AND BYTE BUDGETS',
    result: 'skipped',
    evidence: 'no representative device · design-level only',
    required: false,
  },
  {
    id: 'triposr-licence-verification',
    name: 'GENERATOR LICENCE VERIFICATION',
    result: 'skipped',
    evidence: 'session policy denies web access · stated, not verified',
    required: false,
  },
];

export const CHECKS_CANDIDATE_2_PROVENANCE: Provenance = {
  document: 'docs/process/run-records/consolidation.run-record.json',
  section: 'checksRun[], checksSkipped[]',
  commit: '3b9a964',
};

/**
 * The thirteenth entry, kept in words rather than as a row. It is the
 * single most honest line in the record: the builder's own twin marks the
 * independent review as a **required check it did not run**, because it is
 * a different role's hop.
 */
export const REVIEW_SKIPPED_NOTE =
  'The twin’s checksRun has a thirteenth entry, independent-review, required and skipped: ' +
  '“A different role; this session cannot perform it.” It is not a check that was ducked. ' +
  'It is the next hop, and on this run it happened twice.';

/** A finding the independent Keeper raised, with the severity the record gives it. */
export interface RecordedFinding {
  id: string;
  severity: 'blocking' | 'major' | 'minor' | 'informational';
  /** What the record says it is, in one line. */
  what: string;
  /** How it was disposed of. */
  disposition: string;
}

/**
 * The review of the **first** candidate: ten findings, two of them
 * blocking, verdict `BLOCKED`. The severities and dispositions are the
 * table in `CONSOLIDATION_RUN_RECORD.md`, "Second repair round after the
 * Keeper review of `956be26`".
 */
export const FINDINGS_REVIEW_1: readonly RecordedFinding[] = [
  {
    id: 'KR-01',
    severity: 'blocking',
    what: 'file and commit events did not have to cite the actor’s own grant',
    disposition: 'repaired',
  },
  {
    id: 'KR-02',
    severity: 'blocking',
    what: 'events were reduced without being parsed against the contract first',
    disposition: 'repaired',
  },
  {
    id: 'KR-03',
    severity: 'major',
    what: 'the required-check list is declared by the verifying session and anchored to nothing',
    disposition: 'accepted gap',
  },
  {
    id: 'KR-04',
    severity: 'major',
    what: 'a merge decision did not have to name the SHA it applied to',
    disposition: 'repaired',
  },
  {
    id: 'KR-05',
    severity: 'major',
    what: 'the session allow list permitted any pnpm --filter command',
    disposition: 'repaired',
  },
  {
    id: 'KR-06',
    severity: 'minor',
    what: 'case folding and symlinks are outside the path normaliser',
    disposition: 'accepted gap',
  },
  {
    id: 'KR-07',
    severity: 'minor',
    what: 'an owner grant may confer write authority over a protected boundary',
    disposition: 'accepted gap',
  },
  {
    id: 'KR-08',
    severity: 'minor',
    what: 'finding_raised accepts any non-builder agent session',
    disposition: 'not in scope',
  },
  {
    id: 'KR-09',
    severity: 'informational',
    what: 'the gate evidence adapter must fold repairer sessions into builderSessionIds',
    disposition: 'accepted gap',
  },
  {
    id: 'KR-10',
    severity: 'informational',
    what: 'the record’s test count was 209 where the candidate had 210',
    disposition: 'corrected',
  },
];

export const FINDINGS_REVIEW_1_PROVENANCE: Provenance = {
  document: 'docs/process/CONSOLIDATION_RUN_RECORD.md',
  section: 'Second repair round after the Keeper review of 956be26',
  commit: '3b9a964',
};

/**
 * The review of the **second** candidate: `PASS_WITH_NON_BLOCKING_FINDINGS`.
 * It resolved KR-01, KR-02, KR-04 and KR-05 and confirmed four gaps open,
 * none of them blocking. The four are the ones still open today.
 */
export const FINDINGS_REVIEW_2: readonly RecordedFinding[] = FINDINGS_REVIEW_1.filter((f) =>
  ['KR-03', 'KR-06', 'KR-07', 'KR-09'].includes(f.id),
);

export const RESOLVED_BY_REPAIR: readonly string[] = ['KR-01', 'KR-02', 'KR-04', 'KR-05'];

export const FINDINGS_REVIEW_2_PROVENANCE: Provenance = {
  document: 'docs/decisions/OD-0004-non-blocking-findings-disposition.md',
  section: 'Question; Decision',
  commit: '3279e51',
};

/** The owner's two decisions on this run, in their own records. */
export const OWNER_DECISIONS = {
  repairRound: {
    id: 'OD-0003',
    title: 'ONE ADDITIONAL REPAIR ROUND',
    scope: 'KR-01, KR-02, KR-04 and KR-05 only',
    consequence: 'the last repair cycle permitted; a further BLOCKED verdict stops the lineage',
    provenance: {
      document: 'docs/decisions/OD-0003-consolidation-repair-round.md',
      section: 'Decision',
      commit: '3279e51',
    } satisfies Provenance,
  },
  merge: {
    id: 'OD-0004',
    title: 'MERGE PULL REQUEST #1',
    scope: 'KR-03 not repaired now and carried to Phase 1; KR-07 exemption kept',
    consequence: `merged as ${'cd0981d'}; the reviewed candidate is an ancestor of main`,
    provenance: {
      document: 'docs/decisions/OD-0004-non-blocking-findings-disposition.md',
      section: 'Decision; Consequences',
      commit: '3279e51',
    } satisfies Provenance,
  },
} as const;

/**
 * **What the record does not contain, said plainly.**
 *
 * The repository timestamps commits and the run's two ends. It does not
 * timestamp a hop. So of the nine hops this replay plays, exactly **one**
 * has a duration the repository can be asked for — the build of the first
 * candidate, from its first commit to the candidate commit. The rest read
 * `NOT RECORDED`, and no number is invented for them.
 *
 * This is the replay's own finding about how the project has been working,
 * and it is the argument for the open backlog item "record real runs as
 * events" (`docs/process/PHASE_1_BACKLOG.md`).
 */
export const TIMING_GAP_NOTE =
  'The repository timestamps commits and the run’s two ends, not hops. One of this run’s nine ' +
  'hops has a duration in the record; the other eight read NOT RECORDED, and no number is ' +
  'invented for them.';

/** The build of the first candidate: its first commit to its candidate commit. */
export const BUILD_1_FROM: Instant = '2026-09-06T23:37:17+00:00';
export const BUILD_1_SECONDS = secondsBetween(BUILD_1_FROM, CANDIDATES[0]?.committedAt as Instant);

export const BUILD_1_PROVENANCE: Provenance = {
  document: 'git',
  section: 'committer timestamps of 0e3c067 and 956be26',
  commit: '956be26',
};

/**
 * The three windows the recorded instants divide the run into, plus the
 * tail after the merge. They cover the run exactly, and a test checks that
 * they sum to `RUN_SECONDS`. Playback time is allotted in proportion to
 * them (`replayTimeline.ts`), which is the only place recorded time is
 * allowed to influence how long anything is on screen.
 */
export interface RecordedWindow {
  id: string;
  from: Instant;
  to: Instant;
  /** What the record says happened inside it, and nothing about how it divided. */
  contains: string;
  provenance: Provenance;
}

export const WINDOWS: readonly RecordedWindow[] = [
  {
    id: 'to-candidate-1',
    from: RUN.startedAt,
    to: CANDIDATES[0]?.committedAt as Instant,
    contains: 'the build of the first candidate and the checks on it',
    provenance: {
      document: 'docs/process/run-records/consolidation.run-record.json; git',
      section: 'startedAt; committer timestamp of 956be26',
      commit: '956be26',
    },
  },
  {
    id: 'to-candidate-2',
    from: CANDIDATES[0]?.committedAt as Instant,
    to: CANDIDATES[1]?.committedAt as Instant,
    contains: 'the first review, the owner’s repair authorisation, the repair and its checks',
    provenance: {
      document: 'git',
      section: 'committer timestamps of 956be26 and 3b9a964',
      commit: '3b9a964',
    },
  },
  {
    id: 'to-merge',
    from: CANDIDATES[1]?.committedAt as Instant,
    to: RUN.mergedAt,
    contains: 'the second review, the owner’s disposition and the merge',
    provenance: {
      document: 'git',
      section: 'committer timestamps of 3b9a964 and cd0981d',
      commit: 'cd0981d',
    },
  },
  {
    id: 'after-merge',
    from: RUN.mergedAt,
    to: RUN.completedAt,
    contains: 'the run closing after the merge',
    provenance: {
      document: 'docs/process/run-records/consolidation.run-record.json; git',
      section: 'completedAt; committer timestamp of cd0981d',
      commit: 'cd0981d',
    },
  },
];

export function windowSeconds(id: string): number {
  const window = WINDOWS.find((w) => w.id === id);
  if (!window) throw new Error(`no recorded window ${id}`);
  return secondsBetween(window.from, window.to);
}
