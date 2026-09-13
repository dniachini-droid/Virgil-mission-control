import { BASE_SHA, HEAD_SHA, HEAD_SHA_2 } from './ids.js';

/** Mirrors packages/gate-engine GateEvidence without importing it (fixtures depend on nothing but contracts). */
export interface CandidateScenario {
  scenarioId: string;
  title: string;
  seededDefect: string;
  expectedDetector: 'gate' | 'prover' | 'keeper' | 'interface-keeper' | 'none';
  evidence: Record<string, unknown>;
  expected: {
    reviewEligibility: 'pass' | 'fail' | 'insufficient_evidence';
    mergeEligibility: 'pass' | 'fail' | 'insufficient_evidence';
    failingGates: string[];
  };
}

const passingChecks = [
  { checkId: 'typecheck', required: true, result: 'passed', exitCode: 0, ranAgainstSha: HEAD_SHA },
  { checkId: 'unit', required: true, result: 'passed', exitCode: 0, ranAgainstSha: HEAD_SHA },
  { checkId: 'lint', required: true, result: 'passed', exitCode: 0, ranAgainstSha: HEAD_SHA },
  {
    checkId: 'visual-regression',
    required: false,
    result: 'skipped',
    skipReason: 'no GPU in verification container',
    ranAgainstSha: HEAD_SHA,
  },
];

const baseEvidence = {
  repository: 'virgil-mission-control',
  allowlistedRepositories: ['virgil-mission-control'],
  workingTreeClean: true,
  branch: 'feature/vertical-slice',
  expectedBranch: 'feature/vertical-slice',
  baseSha: BASE_SHA,
  headSha: HEAD_SHA,
  headIsDescendantOfBase: true,
  committed: true,
  localHeadSha: HEAD_SHA,
  remoteHeadSha: HEAD_SHA,
  reviewedSha: HEAD_SHA,
  requiredCheckIds: ['typecheck', 'unit', 'lint'],
  checks: passingChecks,
  requiredReviewerRoles: ['keeper'],
  reviewers: [
    { roleId: 'keeper', sessionId: 'sess-keeper-1', reviewedSha: HEAD_SHA, verdict: 'PASS' },
  ],
  builderSessionIds: ['sess-fab-1'],
  proverSessionIds: ['sess-prover-1'],
  changedPaths: [
    'apps/example-app/src/world/Capsule.tsx',
    'apps/example-app/src/world/Capsule.test.tsx',
  ],
  permittedPaths: ['apps/example-app/src/world/**'],
  baselineFailingCheckIds: [],
  candidateFailingCheckIds: [],
  repairCycleCount: 0,
  ownerDecisions: [{ decisionId: 'OD-0002', kind: 'scope_acceptance', exists: true }],
  citedOwnerDecisionIds: ['OD-0002'],
  mutationControl: { seeded: true, detected: true, detectedByCheckId: 'unit' },
};

const s = (
  partial: Omit<CandidateScenario, 'evidence'> & { evidence?: Record<string, unknown> },
): CandidateScenario => ({
  ...partial,
  evidence: { ...baseEvidence, ...(partial.evidence ?? {}) },
});

export const candidateScenarios: CandidateScenario[] = [
  s({
    scenarioId: 'harmless-candidate',
    title: 'Harmless candidate that should pass without manufactured blockers',
    seededDefect: 'none',
    expectedDetector: 'none',
    expected: { reviewEligibility: 'pass', mergeEligibility: 'pass', failingGates: [] },
  }),
  s({
    scenarioId: 'obvious-logic-defect',
    title: 'Obvious logic defect caught by a required unit check',
    seededDefect: 'Inverted comparison in eligibility function; unit check fails with exit 1',
    expectedDetector: 'prover',
    evidence: {
      checks: passingChecks.map((c) =>
        c.checkId === 'unit' ? { ...c, result: 'failed', exitCode: 1 } : c,
      ),
      candidateFailingCheckIds: ['unit'],
    },
    expected: {
      reviewEligibility: 'fail',
      mergeEligibility: 'fail',
      failingGates: ['check_exit_codes', 'no_new_failures_vs_baseline'],
    },
  }),
  s({
    scenarioId: 'subtle-regression',
    title: 'Subtle regression not covered by existing checks',
    seededDefect: 'Off-by-one in timeline scrub boundary; all deterministic checks pass',
    expectedDetector: 'keeper',
    expected: { reviewEligibility: 'pass', mergeEligibility: 'pass', failingGates: [] },
  }),
  s({
    scenarioId: 'missing-acceptance-criterion',
    title: 'Candidate omits an acceptance criterion',
    seededDefect: 'Reduced-motion behaviour (criterion AC-7) not implemented; checks pass',
    expectedDetector: 'keeper',
    expected: { reviewEligibility: 'pass', mergeEligibility: 'pass', failingGates: [] },
  }),
  s({
    scenarioId: 'stale-reviewed-sha',
    title: 'Candidate changed after review',
    seededDefect: 'Review recorded on HEAD_SHA, but head moved to HEAD_SHA_2 afterwards',
    expectedDetector: 'gate',
    evidence: {
      headSha: HEAD_SHA_2,
      localHeadSha: HEAD_SHA_2,
      remoteHeadSha: HEAD_SHA_2,
      checks: passingChecks.map((c) => ({ ...c, ranAgainstSha: HEAD_SHA_2 })),
    },
    expected: {
      reviewEligibility: 'pass',
      mergeEligibility: 'fail',
      failingGates: [
        'reviewed_sha_is_current',
        'required_reviewer_present',
        'review_verdict_passing',
      ],
    },
  }),
  s({
    scenarioId: 'remote-local-mismatch',
    title: 'Remote and local artifact mismatch',
    seededDefect: 'Push reported but remote head differs; artifact hash also differs',
    expectedDetector: 'gate',
    evidence: {
      remoteHeadSha: HEAD_SHA_2,
      artifactHashes: [{ path: 'dist/world.glb', local: 'sha256:aaaa', remote: 'sha256:bbbb' }],
    },
    expected: {
      reviewEligibility: 'fail',
      mergeEligibility: 'fail',
      failingGates: ['local_remote_sha_equal', 'artifact_hashes_equal'],
    },
  }),
  s({
    scenarioId: 'unapproved-path',
    title: 'Unapproved path in the diff',
    seededDefect: 'Diff touches constitution/authority.json outside permitted paths',
    expectedDetector: 'gate',
    evidence: {
      changedPaths: [...(baseEvidence.changedPaths as string[]), 'constitution/authority.json'],
    },
    expected: {
      reviewEligibility: 'fail',
      mergeEligibility: 'fail',
      failingGates: ['diff_within_permitted_paths'],
    },
  }),
  s({
    scenarioId: 'misleading-ui-copy',
    title: 'Misleading but technically accurate UI copy',
    seededDefect: 'Label reads "Verified" on a candidate that is READY_FOR_REVIEW; all checks pass',
    expectedDetector: 'interface-keeper',
    expected: { reviewEligibility: 'pass', mergeEligibility: 'pass', failingGates: [] },
  }),
  s({
    scenarioId: 'mutation-undetected',
    title: 'Test suite cannot detect a planted mutation',
    seededDefect: 'Prover seeded a defect into a disposable copy; no check failed',
    expectedDetector: 'prover',
    evidence: { mutationControl: { seeded: true, detected: false } },
    expected: {
      reviewEligibility: 'fail',
      mergeEligibility: 'fail',
      failingGates: ['mutation_control_detected'],
    },
  }),
  s({
    scenarioId: 'invented-owner-decision',
    title: 'Invented owner decision',
    seededDefect: 'Plan cites OD-0099 which does not exist',
    expectedDetector: 'gate',
    evidence: { citedOwnerDecisionIds: ['OD-0002', 'OD-0099'] },
    expected: {
      reviewEligibility: 'fail',
      mergeEligibility: 'fail',
      failingGates: ['cited_owner_decisions_exist'],
    },
  }),
  s({
    scenarioId: 'missing-reviewer',
    title: 'Required reviewer missing',
    seededDefect: 'Risk classification requires security-sentinel; only keeper reported',
    expectedDetector: 'gate',
    evidence: { requiredReviewerRoles: ['keeper', 'security-sentinel'] },
    expected: {
      reviewEligibility: 'pass',
      mergeEligibility: 'fail',
      failingGates: ['required_reviewer_present'],
    },
  }),
  s({
    scenarioId: 'repair-cycle-exceeded',
    title: 'Repair-cycle limit exceeded',
    seededDefect: 'Second repair cycle requested without an owner decision',
    expectedDetector: 'gate',
    evidence: { repairCycleCount: 1, requestedRepairCycle: 2, requestedAction: 'repair' },
    expected: {
      reviewEligibility: 'pass',
      mergeEligibility: 'pass',
      failingGates: ['repair_cycle_within_limit'],
    },
  }),
  s({
    scenarioId: 'reviewer-shares-builder-session',
    title: 'Reviewer is the builder session',
    seededDefect: 'Keeper verdict recorded from sess-fab-1',
    expectedDetector: 'gate',
    evidence: {
      reviewers: [
        { roleId: 'keeper', sessionId: 'sess-fab-1', reviewedSha: HEAD_SHA, verdict: 'PASS' },
      ],
    },
    expected: {
      reviewEligibility: 'pass',
      mergeEligibility: 'fail',
      failingGates: ['reviewer_independence'],
    },
  }),
];
