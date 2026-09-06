import { describe, expect, it } from 'vitest';
import { foundrySequence, foundrySteps } from '../src/spikes/foundry/sequence.js';
import { mindSteps } from '../src/spikes/mind/sequence.js';

describe('Foundry spike sequence', () => {
  it('shows the Phase 0.5 operational sequence in order, each step backed by a recorded event', () => {
    const ids = foundrySteps.map((s) => s.id);
    expect(ids).toEqual([
      'overview',
      'read',
      'search',
      'edit',
      'unstaged',
      'staged',
      'commit',
      'push',
      'pushed',
      'handoff-prover',
      'received-prover',
      'verification',
      'checks-static',
      'pass-typecheck',
      'pass-lint',
      'check-unit',
      'pass-unit',
      'skip-visual',
      'verified',
      'handoff-keeper',
      'received-keeper',
      'review',
      'finding',
      'review-pass',
      'eligible',
      'tampered',
    ]);
    for (const s of foundrySteps.slice(1, -1)) {
      expect(s.event, s.id).toBeDefined();
      expect(s.refusal, s.id).toBeUndefined();
    }
    for (const s of foundrySteps.slice(1, -1))
      expect(s.event?.evidence.length, s.id).toBeGreaterThan(0);
  });
  it('the failed-check variant breaks the unit arc, completes verification with a failure and quarantines; nothing merges', () => {
    const ids = foundrySequence('failed').map((s) => s.id);
    expect(ids.slice(-5)).toEqual([
      'fail-unit',
      'skip-visual',
      'verification-failed',
      'quarantined',
      'tampered',
    ]);
    expect(ids).not.toContain('eligible');
    for (const s of foundrySequence('failed'))
      expect(['MERGED', 'DEPLOYED', 'SAFE_TO_MERGE']).not.toContain(s.candidateState);
  });
  it('takes each step duration from the animation grammar, never from the renderer', () => {
    expect(foundrySteps.find((s) => s.id === 'commit')?.durationMs).toBe(1800);
    expect(foundrySteps.find((s) => s.id === 'handoff-prover')?.durationMs).toBe(2000);
    expect(foundrySteps.find((s) => s.id === 'checks-static')?.durationMs).toBe(700);
  });
  it('refuses the tampered push confirmation and renders no motion for it', () => {
    const t = foundrySteps.find((s) => s.id === 'tampered');
    expect(t?.refusal?.reason).toBe('missing_required_evidence');
    expect(t?.refusal?.missing).toEqual(['git_ref']);
    expect(t?.durationMs).toBe(220);
  });
  it('ends at safe-to-merge and never presents the candidate as merged or deployed', () => {
    for (const s of foundrySteps) expect(['MERGED', 'DEPLOYED']).not.toContain(s.candidateState);
    expect(foundrySteps.find((s) => s.id === 'eligible')?.candidateState).toBe('SAFE_TO_MERGE');
    expect(foundrySteps.find((s) => s.id === 'commit')?.candidateState).toBe('BUILDING');
    expect(foundrySteps.find((s) => s.id === 'review')?.candidateState).toBe('REVIEW_IN_PROGRESS');
  });
});

describe('Mind spike sequence', () => {
  it('shows arrival, hashing, non-destructive reading, proposal, tether, durable node, contested claim and scan finding from recorded knowledge events', () => {
    expect(mindSteps.map((s) => s.id)).toEqual([
      'overview',
      'arrive',
      'record',
      'hash',
      'read',
      'propose',
      'tether',
      'contest',
      'durable',
      'scan',
    ]);
    for (const s of mindSteps.slice(1)) {
      expect(s.event?.authority, s.id).toBe('knowledge');
      expect(s.refusal, s.id).toBeUndefined();
    }
  });
  it('classifies each step with a contract epistemic class and never claims private thoughts', () => {
    const classes = new Set(mindSteps.map((s) => s.epistemic));
    expect(classes.has('immutable_raw_evidence')).toBe(true);
    expect(classes.has('contested_claim')).toBe(true);
    expect(classes.has('durable_compiled_knowledge')).toBe(true);
    for (const s of mindSteps)
      expect(`${s.title} ${s.note}`.toLowerCase()).not.toMatch(/thought|reasoning|conscious/);
  });
});
