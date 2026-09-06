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

/**
 * Lineage events that are legitimate facts outside the states the table lists them for (a commit
 * during repair, an owner decision recorded while nothing is halted). They are no-ops there, never
 * invalid transitions. Deployment events are not soft: outside MERGED they are recorded as invalid.
 */
export const softLineageEvents: ReadonlySet<string> = new Set([
  'agent_result_received',
  'adjudication_completed',
  'repair_started',
  'candidate_committed',
  'candidate_pushed',
  'owner_decision',
]);

/** Events whose failed guard is a legitimate no-op (a builder result that does not claim completion). */
export const guardSoftEvents: ReadonlySet<string> = new Set(['agent_result_received']);

export function candidateTransitions(
  state: CandidateState | null,
  eventType: string,
): Transition[] {
  return transitions.filter((t) => t.on === eventType && (t.from === '*' || t.from === state));
}
