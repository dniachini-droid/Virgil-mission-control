import type { DomainEvent } from '@virgil/agent-contracts';
import {
  EpistemicVisualProjectionContract,
  OperationalAnimationGrammar,
  RolePerformanceBible,
} from '@virgil/agent-contracts';
import grammarJson from '../data/animation-grammar.json' with { type: 'json' };
import contractJson from '../data/epistemic-contract.json' with { type: 'json' };
import rolesJson from '../data/role-performance.json' with { type: 'json' };
import tokensJson from '../data/tokens.json' with { type: 'json' };

/** Parsed and validated at import time: invalid data fails fast rather than rendering something unspecified. */
export const epistemicContract = EpistemicVisualProjectionContract.parse(contractJson);
export const animationGrammar = OperationalAnimationGrammar.parse(grammarJson);
export const rolePerformance = RolePerformanceBible.parse(rolesJson);
export const tokens = tokensJson;

export type EpistemicEntry = (typeof epistemicContract.entries)[number];
export type AnimationMapping = (typeof animationGrammar.mappings)[number];
export type AmbientAnimation = (typeof animationGrammar.ambient)[number];
export type RolePerformance = (typeof rolePerformance.roles)[number];
export type CandidateStateName = keyof typeof tokensJson.stateForm;

/** Project an epistemic class to its one stable representation. The renderer never chooses. */
export function projectEpistemic(epistemicClass: string): EpistemicEntry {
  const entry = epistemicContract.entries.find((e) => e.epistemicClass === epistemicClass);
  if (!entry) throw new Error(`No visual projection for epistemic class ${epistemicClass}`);
  return entry;
}

export function projectTetherState(state: string) {
  const t = (epistemicContract.tetherStates as Record<string, unknown>)[state];
  if (!t) throw new Error(`No tether projection for state ${state}`);
  return t as (typeof epistemicContract.tetherStates)[keyof typeof epistemicContract.tetherStates];
}

/** Candidate state → form + colour token. Form is primary; colour is secondary. */
export function projectCandidateState(state: CandidateStateName) {
  const form = tokensJson.stateForm[state];
  const colourToken = tokensJson.stateColour[state];
  if (!form || !colourToken) throw new Error(`No state projection for ${state}`);
  return {
    state,
    form,
    colourToken,
    colour: (tokensJson.palette as Record<string, string>)[colourToken],
  };
}

export function projectCheckResult(result: keyof typeof tokensJson.checkResultForm) {
  return { result, form: tokensJson.checkResultForm[result] };
}

export const mappingByEvent: ReadonlyMap<string, AnimationMapping> = new Map(
  animationGrammar.mappings.map((m) => [m.eventType, m]),
);

export interface AnimationRefusal {
  eventType: string;
  reason: 'no_mapping' | 'missing_required_evidence' | 'telemetry_not_event';
  missing?: string[];
}

/**
 * The only way the world obtains an authenticated animation. Returns the mapping when the event
 * carries every required evidence kind; otherwise a refusal. Prose never substitutes for evidence.
 */
export function animationFor(
  event: Pick<DomainEvent, 'type' | 'evidence'>,
): { mapping: AnimationMapping } | { refusal: AnimationRefusal } {
  const mapping = mappingByEvent.get(event.type);
  if (!mapping) return { refusal: { eventType: event.type, reason: 'no_mapping' } };
  const kinds = new Set(event.evidence.map((e) => e.kind));
  const missing = mapping.requiredEvidence.filter((k) => !kinds.has(k));
  if (missing.length > 0)
    return { refusal: { eventType: event.type, reason: 'missing_required_evidence', missing } };
  return { mapping };
}

/** Ambient motion cannot be requested for a worker instrument, an artifact, a tether or a gate. */
export function ambientPermittedOn(ambientId: string, target: string): boolean {
  const a = animationGrammar.ambient.find((x) => x.ambientId === ambientId);
  if (!a) return false;
  const t = target.toLowerCase();
  return !a.neverAttachedTo.some((n) => {
    const term = n.toLowerCase();
    const singular = term.endsWith('s') ? term.slice(0, -1) : term;
    return (
      t.includes(term) ||
      t.includes(singular) ||
      term.split(' ').some((w) => w.length > 4 && t.includes(w.endsWith('s') ? w.slice(0, -1) : w))
    );
  });
}

export function performanceOf(roleId: string): RolePerformance {
  const r = rolePerformance.roles.find((x) => x.roleId === roleId);
  if (!r) throw new Error(`No performance for role ${roleId}`);
  return r;
}
