import { operationalEventTypes } from '@virgil/agent-contracts';
import { describe, expect, it } from 'vitest';
import { authorityConfig, candidateStates, guards, transitions } from '../src/index.js';

describe('transition table (constitution/authority.json)', () => {
  it('has exactly the fifteen states of the state language', () => {
    expect(candidateStates).toHaveLength(15);
    expect(new Set(candidateStates).size).toBe(15);
  });
  it('references only known states and known event types', () => {
    const states = new Set<string>(candidateStates);
    const events = new Set<string>(operationalEventTypes);
    for (const t of transitions) {
      expect(t.from === '*' || states.has(t.from), `from ${t.from}`).toBe(true);
      expect(t.to === '$resumesTo' || states.has(t.to), `to ${t.to}`).toBe(true);
      expect(events.has(t.on), `event ${t.on}`).toBe(true);
    }
  });
  it('references only implemented guards', () => {
    for (const t of transitions)
      if (t.guard) expect(guards[t.guard], `guard ${t.guard}`).toBeTypeOf('function');
  });
  it('makes every state other than BUILDING reachable', () => {
    const targets = new Set(transitions.map((t) => t.to));
    for (const s of candidateStates) if (s !== 'BUILDING') expect(targets.has(s), s).toBe(true);
  });
  it('allows MERGED only from SAFE_TO_MERGE via merged_by_owner with an owner actor guard', () => {
    const toMerged = transitions.filter((t) => t.to === 'MERGED' && t.from !== 'MERGED');
    expect(toMerged).toHaveLength(1);
    expect(toMerged[0]).toMatchObject({
      from: 'SAFE_TO_MERGE',
      on: 'merged_by_owner',
      guard: 'actor_is_owner',
    });
  });
  it('never lets a review verdict reach SAFE_TO_MERGE or MERGED directly', () => {
    for (const t of transitions.filter((x) => x.on.startsWith('review_')))
      expect(['SAFE_TO_MERGE', 'MERGED', 'DEPLOYED']).not.toContain(t.to);
  });
  it('encodes the repair limit as data', () => {
    expect(authorityConfig.repairLimits.maxCyclesWithoutOwner).toBe(1);
    expect(authorityConfig.repairLimits.maxCyclesWithOwner).toBe(2);
    expect(
      transitions
        .filter((t) => t.on === 'repair_authorised')
        .every((t) => t.guard === 'repair_cycle_within_limit'),
    ).toBe(true);
  });
});
