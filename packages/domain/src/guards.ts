import type { DomainEvent } from '@virgil/agent-contracts';
import type { CandidateState, LineageState, RunState } from './state.js';
import { repairLimits } from './transitions.js';

export interface GuardContext {
  run: RunState;
  lineage: LineageState;
  event: DomainEvent;
  payload: Record<string, unknown>;
}
type Guard = (ctx: GuardContext) => boolean;

const passVerdicts = new Set(['PASS', 'PASS_WITH_NON_BLOCKING_FINDINGS']);

/**
 * Owner-decision kinds the reducer requires for one-shot owner-only actions. The literal values match
 * the gate engine's `merge_authority`, `deploy_authority` and `repair_cycle_within_limit` gates.
 */
export const ownerDecisionKinds = {
  merge: 'merge',
  deploy: 'deployment',
  additionalRepairRound: 'additional_repair_round',
} as const;

/** A decision cited as authority must have been recorded by an owner-actor event and, for one-shot kinds, be unconsumed. */
export function citedDecisionValid(
  run: RunState,
  decisionId: unknown,
  kind: string,
  opts: { oneShot: boolean },
): boolean {
  if (typeof decisionId !== 'string') return false;
  const d = run.decisions[decisionId];
  if (!d || d.kind !== kind) return false;
  return !opts.oneShot || d.consumedBy.length === 0;
}

/**
 * Deterministic verification status derived only from recorded check events for the active
 * verification. Payload claims such as `allRequiredCompleted` are never consulted.
 */
export function derivedVerification(lineage: LineageState): {
  verificationId: string | undefined;
  requiredIds: string[];
  allRequiredPassed: boolean;
  anyRequiredFailed: boolean;
  missing: string[];
} {
  const verificationId = lineage.activeVerificationId;
  const declared = new Set(lineage.requiredCheckIds);
  for (const c of Object.values(lineage.checks))
    if (c.required && c.verificationId === verificationId) declared.add(c.checkId);
  const requiredIds = [...declared].sort();
  const missing: string[] = [];
  let anyRequiredFailed = false;
  for (const id of requiredIds) {
    const c = lineage.checks[id];
    if (!c || c.verificationId !== verificationId) {
      missing.push(id);
      continue;
    }
    if (c.result === 'failed') anyRequiredFailed = true;
    else if (c.result !== 'passed' || (c.exitCode !== undefined && c.exitCode !== 0))
      missing.push(id);
  }
  const allRequiredPassed =
    verificationId !== undefined &&
    requiredIds.length > 0 &&
    missing.length === 0 &&
    !anyRequiredFailed;
  return { verificationId, requiredIds, allRequiredPassed, anyRequiredFailed, missing };
}

/** Verification evidence on the current SHA, pushed and remote-equal: the precondition of READY_FOR_REVIEW. */
export function verificationCurrent(lineage: LineageState): boolean {
  return (
    !!lineage.currentSha &&
    lineage.verificationSha === lineage.currentSha &&
    !!lineage.verificationSignature &&
    lineage.pushed &&
    lineage.remoteSha === lineage.currentSha &&
    !lineage.mismatch
  );
}

/** A fresh seal on the current SHA with the given verdicts. */
function sealCurrent(lineage: LineageState, verdicts: ReadonlySet<string>): boolean {
  const seal = lineage.reviewSeal;
  return !!seal && !seal.stale && seal.sha === lineage.currentSha && verdicts.has(seal.verdict);
}

export function mergeGatesPass(lineage: LineageState, headSha: string): boolean {
  return (
    lineage.currentSha === headSha &&
    verificationCurrent(lineage) &&
    sealCurrent(lineage, passVerdicts) &&
    !Object.values(lineage.findings).some(
      (f) => f.blocking && f.status !== 'rejected_unsupported' && f.status !== 'repaired',
    )
  );
}

/**
 * States that may only be entered through a guarded transition. An `owner_decision` may resume
 * into one of them only when it is the recorded pre-halt state and its invariant still holds.
 */
export const protectedStates: ReadonlySet<CandidateState> = new Set<CandidateState>([
  'READY_FOR_REVIEW',
  'REVIEW_IN_PROGRESS',
  'PASS_WITH_NON_BLOCKING_FINDINGS',
  'REPAIR_AUTHORISED',
  'SAFE_TO_MERGE',
  'MERGED',
  'DEPLOYED',
]);

/** The invariant a protected state carries; used when an owner decision resumes into it. */
export function protectedStateInvariantHolds(
  lineage: LineageState,
  state: CandidateState,
): boolean {
  switch (state) {
    case 'READY_FOR_REVIEW':
      return verificationCurrent(lineage);
    case 'REVIEW_IN_PROGRESS':
      return verificationCurrent(lineage) && sealCurrent(lineage, new Set(['REVIEW_IN_PROGRESS']));
    case 'PASS_WITH_NON_BLOCKING_FINDINGS':
      return (
        verificationCurrent(lineage) &&
        sealCurrent(lineage, new Set(['PASS_WITH_NON_BLOCKING_FINDINGS']))
      );
    case 'REPAIR_AUTHORISED':
      return (
        !!lineage.activeRepairContractId && lineage.repairCycles <= repairLimits.maxCyclesWithOwner
      );
    case 'SAFE_TO_MERGE':
      return !!lineage.currentSha && mergeGatesPass(lineage, lineage.currentSha);
    case 'MERGED':
      return !!lineage.mergeSha;
    case 'DEPLOYED':
      return !!lineage.mergeSha && lineage.deployment === 'SUCCEEDED';
    default:
      return true;
  }
}

/** Every session that built, repaired, verified or adjudicated this candidate is tainted for review. */
export function taintedForReview(lineage: LineageState): ReadonlySet<string> {
  return new Set([
    ...lineage.builderSessions,
    ...lineage.repairerSessions,
    ...lineage.proverSessions,
  ]);
}

/**
 * Guard implementations. Names are fixed by `constitution/authority.json`; each implementation derives
 * its answer from recorded facts in the read model, never from a payload claim about those facts.
 */
export const guards: Record<string, Guard> = {
  result_claims_complete: ({ payload }) => payload.claimedComplete === true,
  check_is_required: ({ lineage, payload }) =>
    payload.required === true || lineage.requiredCheckIds.includes(String(payload.checkId)),
  review_eligibility_gate_passes: ({ lineage, payload }) => {
    const v = derivedVerification(lineage);
    return (
      v.allRequiredPassed &&
      payload.verificationId === v.verificationId &&
      payload.headSha === lineage.currentSha &&
      lineage.activeVerificationSha === lineage.currentSha &&
      lineage.pushed &&
      lineage.remoteSha === lineage.currentSha &&
      !lineage.mismatch
    );
  },
  required_check_failed: ({ lineage }) => derivedVerification(lineage).anyRequiredFailed,
  required_checks_missing: ({ lineage }) => {
    const v = derivedVerification(lineage);
    return !v.anyRequiredFailed && !v.allRequiredPassed;
  },
  reviewer_independent_of_builder: ({ lineage, payload }) =>
    typeof payload.reviewerSession === 'string' &&
    !taintedForReview(lineage).has(payload.reviewerSession) &&
    payload.reviewedSha === lineage.currentSha,
  verdict_pass_with_non_blocking: ({ payload }) =>
    payload.verdict === 'PASS_WITH_NON_BLOCKING_FINDINGS',
  verdict_pass: ({ payload }) => payload.verdict === 'PASS',
  all_merge_gates_pass_and_review_passed: ({ lineage, payload }) =>
    mergeGatesPass(lineage, String(payload.headSha)),
  all_merge_gates_pass: ({ lineage, payload }) => mergeGatesPass(lineage, String(payload.headSha)),
  repair_cycle_within_limit: ({ run, lineage, payload }) => {
    const count = Number(payload.repairCycleCount);
    if (!Number.isInteger(count) || count !== lineage.repairCycles + 1) return false;
    if (count <= repairLimits.maxCyclesWithoutOwner) return true;
    if (count > repairLimits.maxCyclesWithOwner) return false;
    return citedDecisionValid(
      run,
      payload.ownerDecisionId,
      ownerDecisionKinds.additionalRepairRound,
      {
        oneShot: true,
      },
    );
  },
  new_sha_differs_from_reviewed_sha: ({ lineage, payload }) =>
    payload.newSha !== payload.previousSha &&
    payload.newSha !== lineage.reviewSeal?.sha &&
    !lineage.priorSeals.some((s) => s.sha === payload.newSha) &&
    lineage.shaHistory.includes(String(payload.previousSha)) &&
    payload.newSha === lineage.currentSha,
  /** Merge: owner actor citing a recorded, unconsumed owner merge decision. SHA and gate checks live in validation.ts. */
  actor_is_owner: ({ run, event, payload }) =>
    event.actor.kind === 'owner' &&
    citedDecisionValid(run, payload.decisionId, ownerDecisionKinds.merge, { oneShot: true }),
  /** Deploy is owner-only: a recorded owner deployment decision, started by the owner or by the system on the owner's behalf. */
  deploy_authority_present: ({ run, lineage, event, payload }) =>
    (event.actor.kind === 'owner' || event.actor.kind === 'system') &&
    citedDecisionValid(run, payload.decisionId, ownerDecisionKinds.deploy, { oneShot: false }) &&
    payload.mergeSha === lineage.mergeSha,
};

export function evaluateGuard(name: string | undefined, ctx: GuardContext): boolean {
  if (!name) return true;
  const g = guards[name];
  if (!g) throw new Error(`Unknown guard in authority.json: ${name}`);
  return g(ctx);
}
