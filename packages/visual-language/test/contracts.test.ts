import {
  EpistemicClass,
  knowledgeEventTypes,
  operationalEventTypes,
} from '@virgil/agent-contracts';
import { describe, expect, it } from 'vitest';
import {
  ambientPermittedOn,
  animationFor,
  animationGrammar,
  epistemicContract,
  mappingByEvent,
  performanceOf,
  projectCandidateState,
  projectCheckResult,
  projectEpistemic,
  rolePerformance,
  tokens,
} from '../src/index.js';

describe('epistemic visual contract', () => {
  it('covers each of the nine classes exactly once', () => {
    const classes = epistemicContract.entries.map((e) => e.epistemicClass).sort();
    expect(classes).toEqual([...EpistemicClass.options].sort());
  });
  it('never renders a weaker authority with the stability of a stronger one', () => {
    const rank9 = new Set(['owner_approved_decision', 'immutable_raw_evidence']);
    const persistent = epistemicContract.entries.filter((e) => e.persistent);
    for (const a of persistent) {
      for (const b of persistent) {
        if (
          b.authorityRank > a.authorityRank &&
          !(rank9.has(a.epistemicClass) && rank9.has(b.epistemicClass))
        ) {
          expect(
            a.visualStability,
            `${a.epistemicClass} (${a.visualStability}) vs ${b.epistemicClass} (${b.visualStability})`,
          ).toBeLessThanOrEqual(b.visualStability);
        }
      }
    }
  });
  it('pairs every class with a distinct form and pattern, never colour alone', () => {
    const forms = epistemicContract.entries.map((e) => e.visual.form);
    expect(new Set(forms).size).toBe(forms.length);
    const patterns = epistemicContract.entries.map((e) => e.visual.pattern);
    expect(new Set(patterns).size).toBe(patterns.length);
  });
  it('marks only the live signal as non-persistent and only decision and verified fact with an authority mark', () => {
    expect(
      epistemicContract.entries.filter((e) => !e.persistent).map((e) => e.epistemicClass),
    ).toEqual(['live_operational_signal']);
    expect(
      epistemicContract.entries
        .filter((e) => e.visual.authorityMark)
        .map((e) => e.epistemicClass)
        .sort(),
    ).toEqual(['deterministically_verified_fact', 'owner_approved_decision']);
  });
  it('projects deterministically and refuses unknown classes', () => {
    expect(projectEpistemic('contested_claim').visual.form).toBe('interference_or_bifurcated_node');
    expect(() => projectEpistemic('certain_truth')).toThrow();
  });
});

describe('operational animation grammar', () => {
  const consequential = [...operationalEventTypes, ...knowledgeEventTypes].filter(
    (t) => !['raw_source_added'].includes('never'),
  );
  it('maps every operational and knowledge event type', () => {
    const missing = consequential.filter((t) => !mappingByEvent.has(t));
    expect(missing).toEqual([]);
    expect(animationGrammar.mappings).toHaveLength(consequential.length);
  });
  it('defines all sixteen fields with reduced-motion, mobile, failure and replay equivalents for every mapping', () => {
    for (const m of animationGrammar.mappings) {
      expect(m.requiredEvidence.length, m.eventType).toBeGreaterThan(0);
      for (const f of [
        'persistentVisual',
        'reducedMotion',
        'mobileLowPerformance',
        'failureInterruption',
        'replay',
        'evidenceViewDestination',
        'stateBefore',
        'transitionalState',
        'stateAfter',
      ] as const) {
        expect((m[f] as string).length, `${m.eventType}.${f}`).toBeGreaterThan(5);
      }
      expect(m.soundHaptics.optional).toBe(true);
      expect(m.fullMotion.durationMs).toBeGreaterThanOrEqual(
        tokens.motion.authenticatedMinDurationMs,
      );
      expect(m.fullMotion.durationMs).toBeLessThanOrEqual(tokens.motion.authenticatedMaxDurationMs);
    }
  });
  it('refuses to animate an event that lacks its required evidence', () => {
    const r = animationFor({ type: 'candidate_pushed', evidence: [] });
    expect('refusal' in r && r.refusal.reason).toBe('missing_required_evidence');
    const ok = animationFor({
      type: 'candidate_pushed',
      evidence: [{ kind: 'git_ref', ref: 'origin/x' }],
    });
    expect('mapping' in ok).toBe(true);
    const claim = animationFor({
      type: 'merged_by_owner',
      evidence: [{ kind: 'git_object', ref: 'abc' }],
    });
    expect('refusal' in claim && claim.refusal.missing).toEqual(['owner_decision']);
  });
  it('refuses unknown event types and telemetry signals', () => {
    expect('refusal' in animationFor({ type: 'agent_heartbeat' as never, evidence: [] })).toBe(
      true,
    );
    expect(
      'refusal' in
        animationFor({
          type: 'work_done_trust_me' as never,
          evidence: [{ kind: 'event', ref: 'x' }],
        }),
    ).toBe(true);
  });
  it('ambient animations claim no work, need no event and cannot attach to instruments, artifacts, tethers or gates', () => {
    expect(animationGrammar.ambient.length).toBeGreaterThan(0);
    for (const a of animationGrammar.ambient) {
      expect(a.claimsWork).toBe(false);
      expect(a.requiresEvent).toBe(false);
      expect(['very_low', 'low']).toContain(a.maxIntensity);
    }
    expect(ambientPermittedOn('ambient-idle-posture', 'fabricator tool arms')).toBe(false);
    expect(ambientPermittedOn('ambient-idle-posture', 'fabricator torso')).toBe(true);
    expect(ambientPermittedOn('ambient-nebula-drift', 'sealed capsule')).toBe(false);
    expect(ambientPermittedOn('ambient-galaxy-parallax', 'provenance tether T-1')).toBe(false);
    expect(mappingByEvent.has('ambient')).toBe(false);
  });
  it('ambient motion is slower than any authenticated motion budget', () => {
    expect(tokens.motion.ambientMaxAngularSpeedDegPerSec).toBeLessThan(1);
    expect(tokens.motion.idleBreathPeriodSec).toBeGreaterThanOrEqual(4);
  });
  it('keeps skipped, failed, passed, reviewed, safe-to-merge, merged and deployed distinct by form', () => {
    const checkForms = ['running', 'passed', 'failed', 'skipped'].map(
      (r) => projectCheckResult(r as 'passed').form,
    );
    expect(new Set(checkForms).size).toBe(4);
    const states = [
      'READY_FOR_REVIEW',
      'REVIEW_IN_PROGRESS',
      'PASS_WITH_NON_BLOCKING_FINDINGS',
      'SAFE_TO_MERGE',
      'MERGED',
      'DEPLOYED',
      'BLOCKED',
      'INSUFFICIENT_EVIDENCE',
      'QUARANTINED',
    ] as const;
    const forms = states.map((s) => projectCandidateState(s).form);
    expect(new Set(forms).size).toBe(states.length);
    const after = [
      'check_skipped',
      'check_failed',
      'check_passed',
      'review_passed',
      'safe_to_merge',
      'merged_by_owner',
      'deployed',
    ].map((t) => mappingByEvent.get(t)?.stateAfter);
    expect(new Set(after).size).toBe(7);
    expect(mappingByEvent.get('check_skipped')?.mustNotResemble).toContain('check_passed');
    expect(mappingByEvent.get('safe_to_merge')?.mustNotResemble).toContain('merged_by_owner');
    expect(mappingByEvent.get('pr_opened')?.mustNotResemble).toContain('review_passed');
    expect(mappingByEvent.get('file_read')?.mustNotResemble).toContain('file_modified');
  });
  it('deployment states are separate persistent values', () => {
    expect(animationGrammar.distinctStates.deploymentStates).toEqual([
      'NOT_STARTED',
      'STARTED',
      'FAILED',
      'SUCCEEDED',
    ]);
    expect(mappingByEvent.get('deployment_started')?.stateAfter).not.toBe(
      mappingByEvent.get('deployed')?.stateAfter,
    );
    expect(mappingByEvent.get('deployment_failed')?.stateAfter).not.toBe(
      mappingByEvent.get('deployed')?.stateAfter,
    );
  });
  it('the same event keeps its meaning across modes', () => {
    for (const m of animationGrammar.mappings) {
      expect(m.reducedMotion.toLowerCase()).not.toContain('omit state');
      expect(m.mobileLowPerformance.length).toBeGreaterThan(0);
    }
  });
  it('the merge animation requires an owner decision and the push confirmation requires a remote ref', () => {
    expect(mappingByEvent.get('merged_by_owner')?.requiredEvidence).toContain('owner_decision');
    expect(mappingByEvent.get('candidate_pushed')?.requiredEvidence).toContain('git_ref');
    expect(mappingByEvent.get('safe_to_merge')?.requiredEvidence).toContain('gate_decision');
    expect(mappingByEvent.get('check_passed')?.requiredEvidence).toContain('check_run');
  });
});

describe('role performance bible', () => {
  it('covers all fourteen roles with distinct silhouettes, stations and instruments', () => {
    expect(rolePerformance.roles).toHaveLength(14);
    for (const key of [
      'silhouette',
      'station',
      'workingRitual',
      'idleBehaviour',
      'prohibitedActionRepresentation',
    ] as const) {
      const values = rolePerformance.roles.map((r) => r[key]);
      expect(new Set(values).size, key).toBe(14);
    }
    const instrumentSets = rolePerformance.roles.map((r) => r.instruments.join('|'));
    expect(new Set(instrumentSets).size).toBe(14);
  });
  it('every role is recognisable without colour and has a documented prohibited-action representation', () => {
    for (const r of rolePerformance.roles) {
      expect(r.recognisableWithoutColour.length).toBeGreaterThan(20);
      expect(r.prohibitedActionRepresentation.length).toBeGreaterThan(20);
      expect(Object.keys(tokens.palette)).toContain(r.colourAccentToken);
    }
    expect(performanceOf('virgil').neverTouches).toEqual(
      expect.arrayContaining(['code modules', 'merge mechanism', 'deployment controls']),
    );
    expect(performanceOf('keeper').silhouette.toLowerCase()).toContain('no arms');
  });
  it('idle behaviour never describes work', () => {
    for (const r of rolePerformance.roles) {
      const idle = r.idleBehaviour.toLowerCase();
      for (const verb of ['typing', 'scanning', 'fabricat', 'welding', 'searching']) {
        if (idle.includes(verb))
          expect(idle, `${r.roleId} idle`).toMatch(
            new RegExp(`no idle ${verb}|never ${verb}|not ${verb}|no ${verb}`),
          );
      }
    }
  });
});
