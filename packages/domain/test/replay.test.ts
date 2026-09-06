import {
  authorityViolationRun,
  blockedThenRepairedRun,
  HEAD_SHA,
  HEAD_SHA_2,
  HEAD_SHA_3,
  passingRun,
  repairLimitRun,
  staleReviewRun,
} from '@virgil/test-fixtures';
import { describe, expect, it } from 'vitest';
import { fingerprint, replay, replayFrames, replayTo } from '../src/index.js';

describe('replay of the passing run', () => {
  const events = passingRun();
  const state = replay('run-pass', events);
  it('rebuilds the full chain without invalid transitions', () => {
    expect(state.invalidTransitions).toEqual([]);
    expect(state.lineage?.state).toBe('DEPLOYED');
    expect(state.lineage?.deployment).toBe('SUCCEEDED');
    expect(state.lineage?.mergeSha).toBeDefined();
  });
  it('passes through every distinct state in order', () => {
    const path = state.transitions.map((t) => t.to);
    expect(path).toEqual([
      'BUILDER_REPORTED_COMPLETE',
      'VERIFICATION_INCOMPLETE',
      'READY_FOR_REVIEW',
      'REVIEW_IN_PROGRESS',
      'PASS_WITH_NON_BLOCKING_FINDINGS',
      'SAFE_TO_MERGE',
      'MERGED',
      'DEPLOYED',
    ]);
  });
  it('keeps the non-blocking finding visible after the passing verdict', () => {
    expect(state.lineage?.findings['F-1']?.status).toBe('non_blocking_persisted');
  });
  it('keeps the skipped check visible as skipped, never as passed', () => {
    expect(state.lineage?.checks['visual-regression']?.result).toBe('skipped');
    expect(state.lineage?.checks['visual-regression']?.skipReason).toContain('GPU');
  });
  it('scrubs to any event (timeline replay)', () => {
    const reviewStart = events.find((e) => e.type === 'review_started');
    const before = replayTo('run-pass', events, (reviewStart?.seq ?? 0) - 1);
    const atReview = replayTo('run-pass', events, reviewStart?.seq ?? 0);
    expect(before.lineage?.state).toBe('READY_FOR_REVIEW');
    expect(atReview.lineage?.state).toBe('REVIEW_IN_PROGRESS');
    expect(atReview.lineage?.reviewSeal?.sha).toBe(HEAD_SHA);
    expect(replayFrames('run-pass', events)).toHaveLength(events.length);
  });
  it('is deterministic', () => {
    expect(fingerprint(replay('run-pass', passingRun()))).toBe(fingerprint(state));
  });
  it('rejects out-of-order facts', () => {
    const shuffled = [...events];
    const a = shuffled[5];
    const b = shuffled[6];
    if (a && b) {
      shuffled[5] = b;
      shuffled[6] = a;
    }
    expect(
      replay('run-pass', shuffled).invalidTransitions.some((x) =>
        x.reason.startsWith('out-of-order'),
      ),
    ).toBe(true);
  });
  it('records files as read, unstaged, staged and committed distinctly', () => {
    const frames = replayFrames('run-pass', events);
    const statuses = frames
      .map((f) => f.state.files['apps/mission-control/src/world/Capsule.tsx']?.status)
      .filter(Boolean);
    expect([...new Set(statuses)]).toEqual(['read', 'unstaged', 'staged', 'committed']);
  });
});

describe('blocked, quarantined, repaired and re-reviewed run', () => {
  const state = replay('run-blocked', blockedThenRepairedRun());
  it('ends SAFE_TO_MERGE with the airlock closed', () => {
    expect(state.invalidTransitions).toEqual([]);
    expect(state.lineage?.state).toBe('SAFE_TO_MERGE');
    expect(state.lineage?.mergeSha).toBeUndefined();
    expect(state.lineage?.deployment).toBe('NOT_STARTED');
  });
  it('produced a new SHA and counted one repair cycle', () => {
    expect(state.lineage?.shaHistory).toEqual([HEAD_SHA, HEAD_SHA_2]);
    expect(state.lineage?.repairCycles).toBe(1);
    expect(state.lineage?.currentSha).toBe(HEAD_SHA_2);
  });
  it('walked BLOCKED → QUARANTINED → REPAIR_AUTHORISED → RE_REVIEW_REQUIRED → fresh verification and review', () => {
    const path = state.transitions.map((t) => t.to);
    expect(path).toEqual([
      'BUILDER_REPORTED_COMPLETE',
      'VERIFICATION_INCOMPLETE',
      'BLOCKED',
      'QUARANTINED',
      'REPAIR_AUTHORISED',
      'RE_REVIEW_REQUIRED',
      'VERIFICATION_INCOMPLETE',
      'READY_FOR_REVIEW',
      'REVIEW_IN_PROGRESS',
      'READY_FOR_REVIEW',
      'SAFE_TO_MERGE',
    ]);
  });
  it('kept the blocking finding identity through acceptance and repair', () => {
    expect(state.lineage?.findings['F-2']).toMatchObject({ blocking: true, status: 'repaired' });
  });
});

describe('repair limit', () => {
  const state = replay('run-limit', repairLimitRun());
  it('rejects cycle 2 without owner authority, accepts it with, rejects cycle 3', () => {
    const rejected = state.invalidTransitions.filter((x) => x.type === 'repair_authorised');
    expect(rejected).toHaveLength(2);
    expect(state.lineage?.repairCycles).toBe(2);
    expect(state.transitions.some((t) => t.to === 'OWNER_DECISION_REQUIRED')).toBe(true);
    expect(state.lineage?.shaHistory).toEqual([HEAD_SHA, HEAD_SHA_2, HEAD_SHA_3]);
  });
});

describe('stale review', () => {
  const state = replay('run-stale', staleReviewRun());
  it('loses eligibility when the candidate changes after review', () => {
    expect(state.lineage?.state).toBe('RE_REVIEW_REQUIRED');
    expect(state.lineage?.reviewSeal).toBeUndefined();
    expect(state.lineage?.priorSeals[0]).toMatchObject({ sha: HEAD_SHA, stale: true });
    expect(state.invalidTransitions.some((x) => x.type === 'safe_to_merge')).toBe(true);
  });
});

describe('authority violations', () => {
  const state = replay('run-authority', authorityViolationRun());
  it('rejects a builder reviewing its own candidate', () => {
    const rejected = state.invalidTransitions.filter((x) => x.type === 'review_started');
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.kind).toBe('authority');
    expect(rejected[0]?.reason).toContain('fabricator');
    expect(state.lineage?.reviewSeal?.reviewerSession).toBe('sess-keeper-1');
  });
  it('rejects merge before eligibility and merge by a non-owner', () => {
    const merges = state.invalidTransitions.filter((x) => x.type === 'merged_by_owner');
    expect(merges).toHaveLength(2);
    expect(state.lineage?.state).toBe('SAFE_TO_MERGE');
    expect(state.lineage?.mergeSha).toBeUndefined();
  });
});
