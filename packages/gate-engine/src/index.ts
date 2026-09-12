import type { GateEvidence } from './evidence.js';
import { type GateDecision, type GateId, type GateResult, gates } from './gates.js';

export * from './evidence.js';
export * from './gates.js';
export * from './tiers.js';

export interface GateReport {
  purpose: 'review_eligibility' | 'merge_eligibility' | 'repair_authorisation' | 'deploy_authority';
  decisions: GateDecision[];
  overall: GateResult;
  failing: GateId[];
  insufficient: GateId[];
}

function evaluate(purpose: GateReport['purpose'], ids: GateId[], e: GateEvidence): GateReport {
  const decisions = ids.map((id) => gates[id](e));
  const failing = decisions.filter((d) => d.result === 'fail').map((d) => d.gateId as GateId);
  const insufficient = decisions
    .filter((d) => d.result === 'insufficient_evidence')
    .map((d) => d.gateId as GateId);
  const overall: GateResult =
    failing.length > 0 ? 'fail' : insufficient.length > 0 ? 'insufficient_evidence' : 'pass';
  return { purpose, decisions, overall, failing, insufficient };
}

export const reviewEligibilityGates: GateId[] = [
  'repository_allowlisted',
  'branch_identity',
  'approved_base_ancestry',
  'commit_and_push_complete',
  'local_remote_sha_equal',
  'required_checks_ran',
  'check_exit_codes',
  'diff_within_permitted_paths',
  'artifact_hashes_equal',
  'no_new_failures_vs_baseline',
  'mutation_control_detected',
  'cited_owner_decisions_exist',
];

export const mergeEligibilityGates: GateId[] = [
  ...reviewEligibilityGates,
  'working_tree_clean',
  'reviewed_sha_is_current',
  'required_reviewer_present',
  'reviewer_independence',
  'review_verdict_passing',
];

export const repairAuthorisationGates: GateId[] = [
  'repair_cycle_within_limit',
  'cited_owner_decisions_exist',
];
export const deployAuthorityGates: GateId[] = [
  ...mergeEligibilityGates,
  'merge_authority',
  'deploy_authority',
];

export const reviewEligibility = (e: GateEvidence) =>
  evaluate('review_eligibility', reviewEligibilityGates, e);
export const mergeEligibility = (e: GateEvidence) =>
  evaluate('merge_eligibility', mergeEligibilityGates, e);
export const repairAuthorisation = (e: GateEvidence) =>
  evaluate('repair_authorisation', repairAuthorisationGates, e);
export const deployAuthority = (e: GateEvidence) =>
  evaluate('deploy_authority', deployAuthorityGates, e);

/** Agent prose cannot override a failing gate: this helper makes the rule explicit at call sites. */
export function withAgentClaim(report: GateReport, _agentClaimsSafe: boolean): GateReport {
  return report;
}
