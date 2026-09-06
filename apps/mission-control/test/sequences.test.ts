import { describe, expect, it } from 'vitest';
import { foundrySteps } from '../src/spikes/foundry/sequence.js';
import { mindSteps } from '../src/spikes/mind/sequence.js';

describe('Foundry spike sequence', () => {
  it('shows the nine commissioned operations in order, each backed by a recorded event', () => {
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
      'handoff',
      'tampered',
    ]);
    for (const s of foundrySteps.slice(1, 10)) {
      expect(s.event, s.id).toBeDefined();
      expect(s.refusal, s.id).toBeUndefined();
      expect(s.event?.evidence.length, s.id).toBeGreaterThan(0);
    }
  });
  it('takes each step duration from the animation grammar, never from the renderer', () => {
    expect(foundrySteps.find((s) => s.id === 'commit')?.durationMs).toBe(1800);
    expect(foundrySteps.find((s) => s.id === 'handoff')?.durationMs).toBe(2000);
  });
  it('refuses the tampered push confirmation and renders no motion for it', () => {
    const t = foundrySteps.find((s) => s.id === 'tampered');
    expect(t?.refusal?.reason).toBe('missing_required_evidence');
    expect(t?.refusal?.missing).toEqual(['git_ref']);
    expect(t?.durationMs).toBe(220);
  });
  it('never presents the candidate as verified, reviewed or mergeable', () => {
    for (const s of foundrySteps)
      expect(['BUILDING', 'BUILDER_REPORTED_COMPLETE']).toContain(s.candidateState);
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
