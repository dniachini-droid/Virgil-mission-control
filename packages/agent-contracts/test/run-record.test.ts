import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RunRecord } from '../src/index.js';

describe('Phase 0 run record', () => {
  it('validates against the run-record contract and preserves skipped checks with reasons', () => {
    const doc = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, '../../../docs/process/run-records/phase-0.run-record.json'),
        'utf8',
      ),
    );
    const r = RunRecord.safeParse(doc);
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
    if (!r.success) return;
    expect(r.data.checksSkipped.length).toBeGreaterThan(0);
    for (const c of r.data.checksRun.filter((x) => x.result === 'skipped'))
      expect(c.skipReason).toBeTruthy();
    expect(r.data.verdict).toBe('BLOCKED_PENDING_REAL_GPU_REVIEW');
    expect(r.data.nextAction.length).toBeGreaterThan(10);
  });
});

describe('Consolidation run record', () => {
  it('validates, keeps skipped checks with reasons, and lists full commit SHAs', () => {
    const doc = JSON.parse(
      readFileSync(
        resolve(
          import.meta.dirname,
          '../../../docs/process/run-records/consolidation.run-record.json',
        ),
        'utf8',
      ),
    );
    const r = RunRecord.safeParse(doc);
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
    if (!r.success) return;
    expect(r.data.checksSkipped.length).toBeGreaterThan(0);
    for (const c of r.data.checksRun.filter((x) => x.result === 'skipped'))
      expect(c.skipReason).toBeTruthy();
    for (const c of r.data.checksSkipped)
      expect(
        r.data.checksRun.some((x) => x.checkId === c.checkId && x.result === 'skipped') ||
          c.checkId === 'mutation-control',
      ).toBe(true);
    expect(r.data.commits.length).toBeGreaterThanOrEqual(6);
    expect(r.data.verdict).toBeUndefined();
    expect(r.data.candidateState).toBe('BUILDER_REPORTED_COMPLETE');
    expect(r.data.nextAction.length).toBeGreaterThan(10);
  });
});
