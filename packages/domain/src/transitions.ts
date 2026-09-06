import authority from '../../../constitution/authority.json' with { type: 'json' };
import type { CandidateState } from './state.js';

export interface Transition {
  from: CandidateState | '*';
  on: string;
  to: CandidateState | '$resumesTo';
  guard?: string;
}

export const authorityConfig = authority;
export const transitions: readonly Transition[] = authority.transitions as Transition[];
export const candidateStates = authority.candidateStates as readonly CandidateState[];
export const repairLimits = authority.repairLimits;

/** Event types that participate in the candidate state machine. */
export const lineageEventTypes: ReadonlySet<string> = new Set(transitions.map((t) => t.on));

/** Lineage events for which a non-matching guard is a legitimate no-op rather than an invalid transition. */
export const softLineageEvents: ReadonlySet<string> = new Set([
  'agent_result_received',
  'adjudication_completed',
  'repair_started',
  'candidate_committed',
  'candidate_pushed',
  'deployment_started',
  'deployment_failed',
  'owner_decision',
]);

export function candidateTransitions(
  state: CandidateState | null,
  eventType: string,
): Transition[] {
  return transitions.filter((t) => t.on === eventType && (t.from === '*' || t.from === state));
}
