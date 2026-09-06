import type { DomainEvent } from '@virgil/agent-contracts';
import { passingRun } from '@virgil/test-fixtures';
import { describe, expect, it } from 'vitest';
import { replay, replayFrames } from '../src/index.js';

function stateAfter(events: DomainEvent[], type: string, occurrence = 0) {
  const frames = replayFrames('r', events);
  const hits = frames.filter((f) => f.type === type);
  return hits[occurrence]?.state;
}

describe('distinct states never collapse', () => {
  const events = passingRun();
  it('builder completion is a claim, not verification', () => {
    expect(stateAfter(events, 'agent_result_received')?.lineage?.state).toBe(
      'BUILDER_REPORTED_COMPLETE',
    );
  });
  it('verification completion is eligibility, not review', () => {
    expect(stateAfter(events, 'verification_completed')?.lineage?.state).toBe('READY_FOR_REVIEW');
  });
  it('a passing review is not safe-to-merge', () => {
    expect(stateAfter(events, 'review_passed')?.lineage?.state).toBe(
      'PASS_WITH_NON_BLOCKING_FINDINGS',
    );
  });
  it('safe-to-merge is not merged', () => {
    expect(stateAfter(events, 'safe_to_merge')?.lineage?.state).toBe('SAFE_TO_MERGE');
  });
  it('merged is not deployed; deployment started is not deployed', () => {
    const merged = stateAfter(events, 'merged_by_owner');
    expect(merged?.lineage?.state).toBe('MERGED');
    expect(merged?.lineage?.deployment).toBe('NOT_STARTED');
    const started = stateAfter(events, 'deployment_started');
    expect(started?.lineage?.state).toBe('MERGED');
    expect(started?.lineage?.deployment).toBe('STARTED');
    expect(stateAfter(events, 'deployed')?.lineage?.deployment).toBe('SUCCEEDED');
  });
  it('a skipped required check yields INSUFFICIENT_EVIDENCE, never READY_FOR_REVIEW', () => {
    const modified = events.map((e) => {
      if (e.type === 'check_passed' && (e.payload as { checkId: string }).checkId === 'unit') {
        return {
          ...e,
          type: 'check_skipped',
          payload: { ...(e.payload as object), reason: 'runner unavailable' },
        } as unknown as DomainEvent;
      }
      if (e.type === 'verification_completed') {
        const payload = e.payload as { results: Record<string, string> };
        return {
          ...e,
          payload: {
            ...(e.payload as object),
            results: { ...payload.results, unit: 'skipped' },
            allRequiredCompleted: false,
            anyRequiredFailed: false,
          },
        } as unknown as DomainEvent;
      }
      return e;
    });
    const s = replay('r', modified);
    const afterVerification = replayFrames('r', modified).find(
      (f) => f.type === 'verification_completed',
    )?.state;
    expect(afterVerification?.lineage?.state).toBe('INSUFFICIENT_EVIDENCE');
    expect(s.lineage?.state).not.toBe('DEPLOYED');
    expect(s.invalidTransitions.length).toBeGreaterThan(0);
  });
  it('a pull request being open changes no candidate state', () => {
    expect(stateAfter(events, 'pr_opened')?.lineage?.state).toBe('BUILDING');
  });
});
