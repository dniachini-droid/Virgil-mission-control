import { candidateScenarios } from '@virgil/test-fixtures';
import { describe, expect, it } from 'vitest';
import {
  type GateEvidence,
  gateIds,
  gates,
  mergeEligibility,
  pathPermitted,
  repairAuthorisation,
  reviewEligibility,
  withAgentClaim,
} from '../src/index.js';

describe('deterministic gates against the defective-candidate fixture suite', () => {
  for (const scenario of candidateScenarios) {
    it(`${scenario.scenarioId}: ${scenario.title}`, () => {
      const e = scenario.evidence as GateEvidence;
      const review = reviewEligibility(e);
      const merge = mergeEligibility(e);
      const repair = e.requestedRepairCycle !== undefined ? repairAuthorisation(e) : undefined;
      expect(review.overall, `review eligibility ${JSON.stringify(review.failing)}`).toBe(
        scenario.expected.reviewEligibility,
      );
      expect(merge.overall, `merge eligibility ${JSON.stringify(merge.failing)}`).toBe(
        scenario.expected.mergeEligibility,
      );
      const failing = new Set([...merge.failing, ...(repair?.failing ?? [])]);
      expect([...failing].sort()).toEqual([...scenario.expected.failingGates].sort());
    });
  }
  it('harmless candidate raises no false blockers on any gate', () => {
    const harmless = candidateScenarios.find((s) => s.scenarioId === 'harmless-candidate');
    const e = harmless?.evidence as GateEvidence;
    for (const id of gateIds) {
      const d = gates[id]({ ...e, requestedRepairCycle: 1, requestedAction: 'review' });
      expect(d.result, id).toBe('pass');
    }
  });
});

describe('gate semantics', () => {
  it('treats missing evidence as insufficient, never as pass', () => {
    const empty: GateEvidence = {};
    const r = mergeEligibility(empty);
    expect(r.overall).toBe('insufficient_evidence');
    expect(
      r.decisions.every(
        (d) =>
          d.result !== 'pass' ||
          [
            'artifact_hashes_equal',
            'cited_owner_decisions_exist',
            'merge_authority',
            'deploy_authority',
            'mutation_control_detected',
          ].includes(d.gateId),
      ),
    ).toBe(true);
  });
  it('an agent claim of safety cannot override a failing gate', () => {
    const stale = candidateScenarios.find((s) => s.scenarioId === 'stale-reviewed-sha');
    const r = withAgentClaim(mergeEligibility(stale?.evidence as GateEvidence), true);
    expect(r.overall).toBe('fail');
  });
  it('eligibility does not grant merge authority', () => {
    const harmless = candidateScenarios.find((s) => s.scenarioId === 'harmless-candidate');
    const e = { ...(harmless?.evidence as GateEvidence), requestedAction: 'merge' as const };
    expect(gates.merge_authority(e).result).toBe('fail');
    const withDecision = {
      ...e,
      ownerDecisions: [
        ...(e.ownerDecisions ?? []),
        { decisionId: 'OD-0003', kind: 'merge', exists: true },
      ],
    };
    expect(gates.merge_authority(withDecision).result).toBe('pass');
  });
  it('path permission handles globs and rejects traversal-like escapes', () => {
    expect(pathPermitted('apps/x/src/a.ts', ['apps/x/src/**'])).toBe(true);
    expect(pathPermitted('apps/x/src', ['apps/x/src/**'])).toBe(true);
    expect(pathPermitted('apps/y/src/a.ts', ['apps/x/src/**'])).toBe(false);
    expect(pathPermitted('constitution/authority.json', ['apps/**'])).toBe(false);
    expect(pathPermitted('docs/a.md', ['docs/*.md'])).toBe(true);
    expect(pathPermitted('docs/sub/a.md', ['docs/*.md'])).toBe(false);
    // Normalised before comparison: traversal, absolute and encoded paths never match any pattern.
    expect(pathPermitted('apps/x/src/../../../constitution/authority.json', ['apps/**'])).toBe(
      false,
    );
    expect(pathPermitted('apps/x/src/%2e%2e/%2e%2e/constitution/authority.json', ['**'])).toBe(
      false,
    );
    expect(pathPermitted('/apps/x/src/a.ts', ['apps/**'])).toBe(false);
    expect(pathPermitted('apps/x/./src//a.ts', ['apps/x/src/**'])).toBe(true);
    const escaped = gates.diff_within_permitted_paths({
      changedPaths: ['apps/x/src/a.ts', 'apps/x/src/../../../constitution/authority.json'],
      permittedPaths: ['apps/x/src/**'],
    });
    expect(escaped.result).toBe('fail');
    expect(escaped.reason).toContain('constitution/authority.json');
  });
  it('repair cycle: 1 normal, 2 with owner decision, 3 never', () => {
    const base: GateEvidence = { repairCycleCount: 0, requestedRepairCycle: 1 };
    expect(gates.repair_cycle_within_limit(base).result).toBe('pass');
    expect(
      gates.repair_cycle_within_limit({ repairCycleCount: 1, requestedRepairCycle: 2 }).result,
    ).toBe('fail');
    const od = [{ decisionId: 'OD-0005', kind: 'additional_repair_round', exists: true }];
    expect(
      gates.repair_cycle_within_limit({
        repairCycleCount: 1,
        requestedRepairCycle: 2,
        ownerDecisions: od,
      }).result,
    ).toBe('pass');
    expect(
      gates.repair_cycle_within_limit({
        repairCycleCount: 2,
        requestedRepairCycle: 3,
        ownerDecisions: od,
      }).result,
    ).toBe('fail');
  });
});
