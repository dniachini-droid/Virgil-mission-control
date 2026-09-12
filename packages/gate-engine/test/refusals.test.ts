import { describe, expect, it } from 'vitest';
import { type GateEvidence, type GateId, gateIds, gates } from '../src/index.js';

/**
 * **Every gate is driven to `fail` here, and nothing may be added to `gates`
 * without appearing below.**
 *
 * `docs/process/GATE_PROOF_AND_FINDINGS_BRIEF.md`, finding **XR-01**. Twenty
 * gates existed and eight of them had never been observed refusing anything:
 * `repository_allowlisted`, `working_tree_clean`, `branch_identity`,
 * `approved_base_ancestry`, `commit_and_push_complete`, `required_checks_ran`,
 * `deploy_authority`, and `merge_authority` — which had one case inside a test
 * about something else, where its removal would have gone unremarked.
 *
 * `gates.test.ts` asserts the harmless candidate raises no false blockers on any
 * gate. Nothing asserted the other direction, so for those eight a passing suite
 * could not distinguish a gate that works from a gate that cannot fire.
 *
 * **Why that is worse here than in most repositories.**
 * `docs/architecture/ENFORCEMENT_BOUNDARIES.md` records that the engine *"has no
 * evidence until Phase 2 adapters exist; today only fixtures feed it."* Until
 * those adapters land, a fixture is the only thing that ever exercises a gate,
 * so a gate no fixture refuses has never run its refusal path at all — not in
 * CI, not in a session, not anywhere.
 *
 * **This file changes no gate's behaviour.** It only asks each one to say no,
 * with the smallest evidence that should make it. Where a gate turns out to be
 * unable to refuse, that is a finding to raise, not something to fix from here.
 */

/**
 * The base is deliberately *healthy*: every field set to the value that passes.
 * Each case below then spoils exactly one thing.
 *
 * That shape is the point. A refusal case built from an empty object would
 * mostly prove the gate returns `insufficient_evidence`, which is a different
 * answer and is already covered. One spoiled field against an otherwise clean
 * candidate is what a real refusal looks like.
 */
const HEAD = 'a'.repeat(40);
const BASE = 'b'.repeat(40);
const HEALTHY: GateEvidence = {
  repository: 'owner/virgil-mission-control',
  allowlistedRepositories: ['owner/virgil-mission-control'],
  workingTreeClean: true,
  branch: 'claude/a-working-branch',
  expectedBranch: 'claude/a-working-branch',
  baseSha: BASE,
  headSha: HEAD,
  headIsDescendantOfBase: true,
  committed: true,
  localHeadSha: HEAD,
  remoteHeadSha: HEAD,
  reviewedSha: HEAD,
  requiredCheckIds: ['typecheck', 'unit'],
  checks: [
    { checkId: 'typecheck', required: true, result: 'passed', exitCode: 0, ranAgainstSha: HEAD },
    { checkId: 'unit', required: true, result: 'passed', exitCode: 0, ranAgainstSha: HEAD },
  ],
  requiredReviewerRoles: ['keeper'],
  reviewers: [
    { roleId: 'keeper', sessionId: 'session-keeper', reviewedSha: HEAD, verdict: 'PASS' },
  ],
  builderSessionIds: ['session-fabricator'],
  proverSessionIds: ['session-prover'],
  changedPaths: ['packages/gate-engine/test/refusals.test.ts'],
  permittedPaths: ['packages/gate-engine/test/**'],
  artifactHashes: [{ path: 'dist/owner.html', local: 'c0ffee', remote: 'c0ffee' }],
  baselineFailingCheckIds: [],
  candidateFailingCheckIds: [],
  repairCycleCount: 0,
  requestedRepairCycle: 1,
  ownerDecisions: [],
  requestedAction: 'review',
  citedOwnerDecisionIds: [],
  mutationControl: { seeded: true, detected: true, detectedByCheckId: 'unit' },
};

interface Refusal {
  /** The gate this case exists to make say no. */
  gate: GateId;
  /** What is wrong with the candidate, in the words a reader needs. */
  what: string;
  /** The one thing spoiled, against an otherwise healthy candidate. */
  spoil: Partial<GateEvidence>;
  /** A fragment the refusal's own reason must contain, so it refuses for this. */
  because: RegExp;
}

/**
 * One case per gate, in the order `gates` declares them.
 *
 * **`because` is not decoration.** A gate that refused for an unrelated reason
 * would satisfy `result === 'fail'` and prove nothing about the path this case
 * is aiming at — that is how `merge_authority` came to have a case that could be
 * deleted unremarked. The reason is read, so the case is tied to the refusal it
 * claims to exercise.
 */
const REFUSALS: Refusal[] = [
  {
    gate: 'repository_allowlisted',
    what: 'work offered against a repository nobody allowed',
    spoil: { repository: 'someone-else/a-repository-nobody-allowed' },
    because: /not on the allowlist/,
  },
  {
    gate: 'working_tree_clean',
    what: 'a candidate whose tree has uncommitted changes, so the SHA is not what was built',
    spoil: { workingTreeClean: false },
    because: /uncommitted changes/,
  },
  {
    gate: 'branch_identity',
    what: 'work done on a branch other than the one assigned',
    spoil: { branch: 'main' },
    because: /expected/,
  },
  {
    gate: 'approved_base_ancestry',
    what: 'a head that does not descend from the approved base',
    spoil: { headIsDescendantOfBase: false },
    because: /does not descend/,
  },
  {
    gate: 'commit_and_push_complete',
    what: 'a candidate committed locally and never pushed, which exists only in one container',
    spoil: { remoteHeadSha: undefined },
    because: /push not confirmed/,
  },
  {
    gate: 'local_remote_sha_equal',
    what: 'a local head that is not the remote head',
    spoil: { remoteHeadSha: BASE },
    because: /differs from remote/,
  },
  {
    gate: 'reviewed_sha_is_current',
    what: 'a candidate that moved after it was reviewed',
    spoil: { reviewedSha: BASE },
    because: /stale/,
  },
  {
    gate: 'required_checks_ran',
    what: 'a required check that was skipped rather than run',
    spoil: {
      checks: [
        { checkId: 'typecheck', required: true, result: 'passed', exitCode: 0, ranAgainstSha: HEAD },
        { checkId: 'unit', required: true, result: 'skipped', skipReason: 'not today' },
      ],
    },
    because: /did not complete: unit/,
  },
  {
    gate: 'check_exit_codes',
    what: 'a required check that ran and failed',
    spoil: {
      checks: [
        { checkId: 'typecheck', required: true, result: 'passed', exitCode: 0, ranAgainstSha: HEAD },
        { checkId: 'unit', required: true, result: 'failed', exitCode: 1, ranAgainstSha: HEAD },
      ],
    },
    because: /failed required checks: unit/,
  },
  {
    gate: 'required_reviewer_present',
    what: 'a required reviewer who has not reported',
    spoil: { reviewers: [] },
    because: /missing reviewer verdicts: keeper/,
  },
  {
    gate: 'reviewer_independence',
    what: 'the session that built the work reviewing the work',
    spoil: {
      reviewers: [
        { roleId: 'keeper', sessionId: 'session-fabricator', reviewedSha: HEAD, verdict: 'PASS' },
      ],
    },
    because: /shared with builder or prover/,
  },
  {
    gate: 'review_verdict_passing',
    what: 'a review that returned BLOCKED',
    spoil: {
      reviewers: [
        { roleId: 'keeper', sessionId: 'session-keeper', reviewedSha: HEAD, verdict: 'BLOCKED' },
      ],
    },
    because: /non-passing verdicts/,
  },
  {
    gate: 'diff_within_permitted_paths',
    what: 'a diff that reaches outside the paths the work was permitted',
    spoil: { changedPaths: ['constitution/authority.json'] },
    because: /unapproved paths in diff: constitution\/authority\.json/,
  },
  {
    gate: 'artifact_hashes_equal',
    what: 'an artifact whose local bytes are not the bytes that were published',
    spoil: { artifactHashes: [{ path: 'dist/owner.html', local: 'c0ffee', remote: 'decafb' }] },
    because: /artifact mismatch/,
  },
  {
    gate: 'no_new_failures_vs_baseline',
    what: 'a candidate that breaks something the baseline had working',
    spoil: { candidateFailingCheckIds: ['unit'] },
    because: /new failures introduced: unit/,
  },
  {
    gate: 'repair_cycle_within_limit',
    what: 'a repair round past the limit with no owner decision authorising it',
    spoil: { repairCycleCount: 4, requestedRepairCycle: 5 },
    because: /exceeds limit|OWNER_DECISION_REQUIRED/,
  },
  {
    gate: 'cited_owner_decisions_exist',
    what: 'work citing an owner decision that does not exist',
    spoil: {
      citedOwnerDecisionIds: ['OD-0099'],
      ownerDecisions: [{ decisionId: 'OD-0099', kind: 'merge', exists: false }],
    },
    because: /do not exist: OD-0099/,
  },
  {
    gate: 'mutation_control_detected',
    what: 'a seeded defect the suite did not notice',
    spoil: { mutationControl: { seeded: true, detected: false } },
    because: /did not detect the seeded mutation/,
  },
  {
    gate: 'merge_authority',
    what: 'a merge requested with no owner decision for this SHA',
    spoil: { requestedAction: 'merge' },
    because: /eligibility does not open the airlock/,
  },
  {
    gate: 'deploy_authority',
    what: 'a deployment requested with no owner decision',
    spoil: { requestedAction: 'deploy' },
    because: /no owner deployment decision/,
  },
];

describe('the candidate this suite calls healthy really is healthy', () => {
  /**
   * Without this, every case below could be passing because the base evidence is
   * broken rather than because the spoiled field did anything — and the whole
   * file would be measuring nothing while looking thorough.
   */
  it('passes every gate before anything is spoiled', () => {
    for (const id of gateIds) {
      const decision = gates[id](HEALTHY);
      expect(decision.result, `${id}: ${decision.reason}`).toBe('pass');
    }
  });
});

describe('every gate can refuse, and has been seen to', () => {
  for (const refusal of REFUSALS) {
    it(`${refusal.gate} refuses ${refusal.what}`, () => {
      const decision = gates[refusal.gate]({ ...HEALTHY, ...refusal.spoil });
      expect(decision.result, `${refusal.gate}: ${decision.reason}`).toBe('fail');
      // And refuses for the reason this case is about, not an unrelated one.
      expect(decision.reason).toMatch(refusal.because);
      expect(decision.gateId).toBe(refusal.gate);
    });
  }

  /**
   * **The coverage is enforced, not remembered.**
   *
   * This is the half that makes the rest durable. A gate added to `gates` with
   * no refusal case fails here, by name, on the push that adds it — rather than
   * being noticed by a reader months later, which is exactly how eight of them
   * accumulated.
   */
  it('every gate in the engine has a case above, named', () => {
    const covered = new Set(REFUSALS.map((r) => r.gate));
    const uncovered = gateIds.filter((id) => !covered.has(id));
    expect(
      uncovered,
      `these gates have never been observed refusing anything: ${uncovered.join(', ')}`,
    ).toEqual([]);
  });

  it('every case above names a gate the engine still has', () => {
    // The other direction: a case left behind after a gate is renamed or removed
    // reads as coverage and tests a gate that is gone.
    const known = new Set<string>(gateIds);
    const orphans = REFUSALS.map((r) => r.gate).filter((id) => !known.has(id));
    expect(orphans, `cases naming gates the engine does not have: ${orphans.join(', ')}`).toEqual(
      [],
    );
  });

  it('there is exactly one case per gate, and the counts agree', () => {
    // A reviewer can check this by reading, in about a minute, which is the
    // point: the count is the claim, and it is on one line.
    const named = REFUSALS.map((r) => r.gate);
    expect(new Set(named).size, 'a gate has more than one case').toBe(named.length);
    expect(named.length, 'the number of cases is not the number of gates').toBe(gateIds.length);
  });
});
