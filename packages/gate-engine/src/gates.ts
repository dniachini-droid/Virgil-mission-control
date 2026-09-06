import { type EvidenceRef, pathPermitted as sharedPathPermitted } from '@virgil/agent-contracts';
import authority from '../../../constitution/authority.json' with { type: 'json' };
import type { GateEvidence } from './evidence.js';

export type GateResult = 'pass' | 'fail' | 'insufficient_evidence';
export interface GateDecision {
  gateId: string;
  result: GateResult;
  reason: string;
  evidence: EvidenceRef[];
}

const pass = (gateId: string, reason: string, evidence: EvidenceRef[] = []): GateDecision => ({
  gateId,
  result: 'pass',
  reason,
  evidence,
});
const fail = (gateId: string, reason: string, evidence: EvidenceRef[] = []): GateDecision => ({
  gateId,
  result: 'fail',
  reason,
  evidence,
});
const missing = (gateId: string, reason: string): GateDecision => ({
  gateId,
  result: 'insufficient_evidence',
  reason,
  evidence: [],
});
const ref = (kind: EvidenceRef['kind'], r: string): EvidenceRef => ({ kind, ref: r });

/**
 * Permitted-path matching is shared with the contracts and the domain reducer
 * (`@virgil/agent-contracts` paths.ts): every path and pattern is normalised first and a path that
 * cannot be normalised (traversal, absolute, encoded separators) is never permitted.
 */
export const pathPermitted = sharedPathPermitted;

export const gates = {
  repository_allowlisted(e: GateEvidence): GateDecision {
    const id = 'repository_allowlisted';
    if (!e.repository || !e.allowlistedRepositories)
      return missing(id, 'repository or allowlist not provided');
    return e.allowlistedRepositories.includes(e.repository)
      ? pass(id, `${e.repository} is allowlisted`)
      : fail(id, `${e.repository} is not on the allowlist`);
  },
  working_tree_clean(e: GateEvidence): GateDecision {
    const id = 'working_tree_clean';
    if (e.workingTreeClean === undefined) return missing(id, 'working tree state not collected');
    return e.workingTreeClean
      ? pass(id, 'working tree clean')
      : fail(id, 'uncommitted changes present');
  },
  branch_identity(e: GateEvidence): GateDecision {
    const id = 'branch_identity';
    if (!e.branch || !e.expectedBranch)
      return missing(id, 'branch or expected branch not provided');
    return e.branch === e.expectedBranch
      ? pass(id, `on ${e.branch}`, [ref('git_ref', e.branch)])
      : fail(id, `on ${e.branch}, expected ${e.expectedBranch}`);
  },
  approved_base_ancestry(e: GateEvidence): GateDecision {
    const id = 'approved_base_ancestry';
    if (!e.baseSha || !e.headSha || e.headIsDescendantOfBase === undefined)
      return missing(id, 'ancestry not collected');
    return e.headIsDescendantOfBase
      ? pass(id, 'head descends from approved base', [ref('git_object', e.baseSha)])
      : fail(id, 'head does not descend from approved base');
  },
  commit_and_push_complete(e: GateEvidence): GateDecision {
    const id = 'commit_and_push_complete';
    if (e.committed === undefined || !e.headSha) return missing(id, 'commit state not collected');
    if (!e.committed) return fail(id, 'candidate not committed');
    if (!e.remoteHeadSha) return fail(id, 'push not confirmed by remote');
    return pass(id, 'committed and push confirmed', [ref('git_object', e.headSha)]);
  },
  local_remote_sha_equal(e: GateEvidence): GateDecision {
    const id = 'local_remote_sha_equal';
    if (!e.localHeadSha || !e.remoteHeadSha)
      return missing(id, 'local or remote SHA not collected');
    return e.localHeadSha === e.remoteHeadSha
      ? pass(id, 'local and remote phase-locked', [ref('git_object', e.localHeadSha)])
      : fail(
          id,
          `local ${e.localHeadSha.slice(0, 7)} differs from remote ${e.remoteHeadSha.slice(0, 7)}`,
        );
  },
  reviewed_sha_is_current(e: GateEvidence): GateDecision {
    const id = 'reviewed_sha_is_current';
    if (!e.headSha) return missing(id, 'head SHA not collected');
    if (!e.reviewedSha) return missing(id, 'no review recorded for this candidate');
    return e.reviewedSha === e.headSha
      ? pass(id, 'reviewed SHA is current', [ref('git_object', e.headSha)])
      : fail(id, 'candidate changed after review; review is stale');
  },
  required_checks_ran(e: GateEvidence): GateDecision {
    const id = 'required_checks_ran';
    if (!e.requiredCheckIds || !e.checks)
      return missing(id, 'required checks or check runs not collected');
    const byId = new Map(e.checks.map((c) => [c.checkId, c]));
    const notRun = e.requiredCheckIds.filter((c) => {
      const run = byId.get(c);
      return (
        !run ||
        run.result === 'running' ||
        run.result === 'skipped' ||
        (e.headSha && run.ranAgainstSha && run.ranAgainstSha !== e.headSha)
      );
    });
    return notRun.length === 0
      ? pass(id, 'every required check completed against this SHA')
      : fail(id, `required checks did not complete: ${notRun.join(', ')}`);
  },
  check_exit_codes(e: GateEvidence): GateDecision {
    const id = 'check_exit_codes';
    if (!e.checks) return missing(id, 'check runs not collected');
    const failed = e.checks.filter(
      (c) =>
        c.required && (c.result === 'failed' || (c.exitCode !== undefined && c.exitCode !== 0)),
    );
    return failed.length === 0
      ? pass(id, 'all required checks exited 0')
      : fail(
          id,
          `failed required checks: ${failed.map((c) => c.checkId).join(', ')}`,
          failed.map((c) => ref('check_run', c.checkId)),
        );
  },
  required_reviewer_present(e: GateEvidence): GateDecision {
    const id = 'required_reviewer_present';
    if (!e.requiredReviewerRoles || !e.reviewers)
      return missing(id, 'reviewer formation or reviews not collected');
    const present = new Set(
      e.reviewers
        .filter(
          (r) => r.reviewedSha === e.headSha && r.verdict && r.verdict !== 'REVIEW_IN_PROGRESS',
        )
        .map((r) => r.roleId),
    );
    const absent = e.requiredReviewerRoles.filter((r) => !present.has(r));
    return absent.length === 0
      ? pass(id, 'required reviewers reported on this SHA')
      : fail(id, `missing reviewer verdicts: ${absent.join(', ')}`);
  },
  reviewer_independence(e: GateEvidence): GateDecision {
    const id = 'reviewer_independence';
    if (!e.reviewers) return missing(id, 'reviews not collected');
    if (!e.builderSessionIds) return missing(id, 'builder session identities not collected');
    const tainted = new Set([...(e.builderSessionIds ?? []), ...(e.proverSessionIds ?? [])]);
    const violating = e.reviewers.filter((r) => tainted.has(r.sessionId));
    return violating.length === 0
      ? pass(id, 'reviewers independent of builder and prover sessions')
      : fail(
          id,
          `reviewer session shared with builder or prover: ${violating.map((r) => r.sessionId).join(', ')}`,
        );
  },
  review_verdict_passing(e: GateEvidence): GateDecision {
    const id = 'review_verdict_passing';
    if (!e.reviewers || e.reviewers.length === 0) return missing(id, 'no review recorded');
    const onSha = e.reviewers.filter((r) => r.reviewedSha === e.headSha);
    if (onSha.length === 0) return fail(id, 'no review of the current SHA');
    const bad = onSha.filter(
      (r) => r.verdict !== 'PASS' && r.verdict !== 'PASS_WITH_NON_BLOCKING_FINDINGS',
    );
    return bad.length === 0
      ? pass(id, 'all reviews of current SHA pass')
      : fail(
          id,
          `non-passing verdicts: ${bad.map((r) => `${r.roleId}=${r.verdict ?? 'none'}`).join(', ')}`,
        );
  },
  diff_within_permitted_paths(e: GateEvidence): GateDecision {
    const id = 'diff_within_permitted_paths';
    if (!e.changedPaths || !e.permittedPaths)
      return missing(id, 'changed or permitted paths not collected');
    const outside = e.changedPaths.filter((p) => !pathPermitted(p, e.permittedPaths ?? []));
    return outside.length === 0
      ? pass(id, 'diff within permitted paths')
      : fail(
          id,
          `unapproved paths in diff: ${outside.join(', ')}`,
          outside.map((p) => ref('diff', p)),
        );
  },
  artifact_hashes_equal(e: GateEvidence): GateDecision {
    const id = 'artifact_hashes_equal';
    if (!e.artifactHashes) return pass(id, 'no artifact hash comparison required');
    const incomplete = e.artifactHashes.filter((a) => !a.local || !a.remote);
    if (incomplete.length > 0)
      return missing(id, `hashes missing for: ${incomplete.map((a) => a.path).join(', ')}`);
    const mismatched = e.artifactHashes.filter((a) => a.local !== a.remote);
    return mismatched.length === 0
      ? pass(id, 'artifact hashes phase-locked')
      : fail(
          id,
          `artifact mismatch: ${mismatched.map((a) => a.path).join(', ')}`,
          mismatched.map((a) => ref('file_hash', a.path)),
        );
  },
  no_new_failures_vs_baseline(e: GateEvidence): GateDecision {
    const id = 'no_new_failures_vs_baseline';
    if (!e.candidateFailingCheckIds) return missing(id, 'candidate failures not collected');
    const baseline = new Set(e.baselineFailingCheckIds ?? []);
    const fresh = e.candidateFailingCheckIds.filter((c) => !baseline.has(c));
    return fresh.length === 0
      ? pass(id, 'no failures beyond known baseline')
      : fail(id, `new failures introduced: ${fresh.join(', ')}`);
  },
  repair_cycle_within_limit(e: GateEvidence): GateDecision {
    const id = 'repair_cycle_within_limit';
    if (e.requestedRepairCycle === undefined)
      return missing(id, 'requested repair cycle not provided');
    const { maxCyclesWithoutOwner, maxCyclesWithOwner } = authority.repairLimits;
    if (e.repairCycleCount !== undefined && e.requestedRepairCycle !== e.repairCycleCount + 1)
      return fail(id, 'requested cycle is not the next cycle');
    if (e.requestedRepairCycle <= maxCyclesWithoutOwner)
      return pass(id, `cycle ${e.requestedRepairCycle} within normal limit`);
    const ownerOk = (e.ownerDecisions ?? []).some(
      (d) => d.exists && d.kind === 'additional_repair_round',
    );
    if (e.requestedRepairCycle <= maxCyclesWithOwner && ownerOk)
      return pass(id, `cycle ${e.requestedRepairCycle} authorised by owner decision`);
    return fail(
      id,
      `cycle ${e.requestedRepairCycle} exceeds limit (${maxCyclesWithoutOwner} normal, ${maxCyclesWithOwner} with owner); OWNER_DECISION_REQUIRED`,
    );
  },
  cited_owner_decisions_exist(e: GateEvidence): GateDecision {
    const id = 'cited_owner_decisions_exist';
    if (!e.citedOwnerDecisionIds || e.citedOwnerDecisionIds.length === 0)
      return pass(id, 'no owner decisions cited');
    const known = new Map((e.ownerDecisions ?? []).map((d) => [d.decisionId, d]));
    const invented = e.citedOwnerDecisionIds.filter((c) => !known.get(c)?.exists);
    return invented.length === 0
      ? pass(id, 'every cited owner decision exists')
      : fail(id, `cited owner decisions do not exist: ${invented.join(', ')}`);
  },
  mutation_control_detected(e: GateEvidence): GateDecision {
    const id = 'mutation_control_detected';
    if (!e.mutationControl) return pass(id, 'no mutation control performed for this risk level');
    if (!e.mutationControl.seeded)
      return missing(id, 'mutation control declared but no defect seeded');
    return e.mutationControl.detected
      ? pass(id, `seeded defect detected by ${e.mutationControl.detectedByCheckId ?? 'a check'}`)
      : fail(
          id,
          'test suite did not detect the seeded mutation; verification cannot vouch for the candidate',
        );
  },
  merge_authority(e: GateEvidence): GateDecision {
    const id = 'merge_authority';
    if (e.requestedAction !== 'merge') return pass(id, 'merge not requested');
    const ok = (e.ownerDecisions ?? []).some(
      (d) => d.exists && d.kind === 'merge' && (!d.appliesToSha || d.appliesToSha === e.headSha),
    );
    return ok
      ? pass(id, 'owner merge decision present for this SHA')
      : fail(id, 'no owner merge decision for this SHA; eligibility does not open the airlock');
  },
  deploy_authority(e: GateEvidence): GateDecision {
    const id = 'deploy_authority';
    if (e.requestedAction !== 'deploy') return pass(id, 'deploy not requested');
    const ok = (e.ownerDecisions ?? []).some((d) => d.exists && d.kind === 'deployment');
    return ok
      ? pass(id, 'owner deployment decision present')
      : fail(id, 'no owner deployment decision');
  },
} as const;

export type GateId = keyof typeof gates;
export const gateIds = Object.keys(gates) as GateId[];
