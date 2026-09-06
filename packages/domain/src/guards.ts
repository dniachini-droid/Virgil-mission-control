import type { DomainEvent } from '@virgil/agent-contracts';
import type { LineageState, RunState } from './state.js';
import { repairLimits } from './transitions.js';

type Guard = (ctx: {
  run: RunState;
  lineage: LineageState;
  event: DomainEvent;
  payload: Record<string, unknown>;
}) => boolean;

const passVerdicts = new Set(['PASS', 'PASS_WITH_NON_BLOCKING_FINDINGS']);

function mergeGatesPass(lineage: LineageState, headSha: string): boolean {
  const seal = lineage.reviewSeal;
  return (
    !!seal &&
    !seal.stale &&
    seal.sha === headSha &&
    passVerdicts.has(seal.verdict) &&
    lineage.currentSha === headSha &&
    lineage.verificationSha === headSha &&
    !!lineage.verificationSignature &&
    lineage.pushed &&
    lineage.remoteSha === headSha &&
    !lineage.mismatch &&
    !Object.values(lineage.findings).some(
      (f) => f.blocking && f.status !== 'rejected_unsupported' && f.status !== 'repaired',
    )
  );
}

export const guards: Record<string, Guard> = {
  result_claims_complete: ({ payload }) => payload.claimedComplete === true,
  check_is_required: ({ payload }) => payload.required === true,
  review_eligibility_gate_passes: ({ lineage, payload }) =>
    payload.allRequiredCompleted === true &&
    payload.anyRequiredFailed === false &&
    lineage.pushed &&
    lineage.remoteSha === lineage.currentSha &&
    payload.headSha === lineage.currentSha &&
    !lineage.mismatch,
  required_check_failed: ({ payload }) => payload.anyRequiredFailed === true,
  required_checks_missing: ({ payload }) =>
    payload.allRequiredCompleted !== true && payload.anyRequiredFailed !== true,
  reviewer_independent_of_builder: ({ lineage, payload }) =>
    typeof payload.reviewerSession === 'string' &&
    !lineage.builderSessions.includes(payload.reviewerSession) &&
    payload.reviewedSha === lineage.currentSha,
  verdict_pass_with_non_blocking: ({ payload }) =>
    payload.verdict === 'PASS_WITH_NON_BLOCKING_FINDINGS',
  verdict_pass: ({ payload }) => payload.verdict === 'PASS',
  all_merge_gates_pass_and_review_passed: ({ lineage, payload }) =>
    mergeGatesPass(lineage, String(payload.headSha)),
  all_merge_gates_pass: ({ lineage, payload }) => mergeGatesPass(lineage, String(payload.headSha)),
  repair_cycle_within_limit: ({ lineage, payload }) => {
    const count = Number(payload.repairCycleCount);
    if (count !== lineage.repairCycles + 1) return false;
    if (count <= repairLimits.maxCyclesWithoutOwner) return true;
    return typeof payload.ownerDecisionId === 'string' && count <= repairLimits.maxCyclesWithOwner;
  },
  new_sha_differs_from_reviewed_sha: ({ lineage, payload }) =>
    payload.newSha !== payload.previousSha &&
    payload.newSha !== lineage.reviewSeal?.sha &&
    lineage.shaHistory.includes(String(payload.previousSha)),
  actor_is_owner: ({ event, payload }) =>
    event.actor.kind === 'owner' && typeof payload.decisionId === 'string',
  deploy_authority_present: ({ event, payload }) =>
    typeof payload.decisionId === 'string' &&
    (event.actor.kind === 'owner' || !!event.authorityGrantId),
};

export function evaluateGuard(name: string | undefined, ctx: Parameters<Guard>[0]): boolean {
  if (!name) return true;
  const g = guards[name];
  if (!g) throw new Error(`Unknown guard in authority.json: ${name}`);
  return g(ctx);
}
