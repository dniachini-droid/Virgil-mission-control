import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { deriveGraph, scanGraph } from '../src/index.js';

const repoRoot = resolve(import.meta.dirname, '../../..');
const fixtures = resolve(repoRoot, 'packages/test-fixtures/knowledge');

function treeHash(dir: string): string {
  const h = createHash('sha256');
  const walk = (d: string) => {
    for (const e of readdirSync(d).sort()) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) walk(p);
      else h.update(p).update(readFileSync(p));
    }
  };
  walk(dir);
  return h.digest('hex');
}

describe('provenance graph derivation', () => {
  it('is reproducible: two derivations of the real knowledge tree have the same hash', () => {
    const a = deriveGraph({ repoRoot, now: '2026-09-06T00:00:00+00:00' });
    const b = deriveGraph({ repoRoot, now: '2026-09-06T00:00:00+00:00' });
    expect(a.hash).toBe(b.hash);
    expect(a.nodes.length).toBeGreaterThan(10);
  });
  it('never modifies raw sources', () => {
    const before = treeHash(resolve(repoRoot, 'knowledge/raw'));
    deriveGraph({ repoRoot });
    scanGraph(deriveGraph({ repoRoot }), { repoRoot });
    expect(treeHash(resolve(repoRoot, 'knowledge/raw'))).toBe(before);
  });
  it('derives the seed wiki with every tether intact and every claim tethered', () => {
    const g = deriveGraph({ repoRoot, now: '2026-09-06T00:00:00+00:00' });
    const tethers = g.edges.filter((e) => e.kind === 'tether');
    expect(tethers.length).toBeGreaterThan(20);
    expect(tethers.filter((t) => t.state !== 'intact')).toEqual([]);
    for (const c of g.nodes.filter((n) => n.nodeType === 'claim')) {
      expect(c.epistemicClass, c.id).not.toBe('unverified_claim');
      expect(
        tethers.some((t) => t.from === c.id),
        c.id,
      ).toBe(true);
    }
  });
  it('resolves raw sources by canonical path and verifies the sealed hash', () => {
    const g = deriveGraph({ repoRoot });
    const commission = g.nodes.find((n) => n.id === 'src-master-commission');
    expect(commission?.meta?.canonicalExists).toBe(true);
    expect(commission?.meta?.hashMatches).toBe(true);
    expect(commission?.epistemicClass).toBe('immutable_raw_evidence');
    const od = g.nodes.find((n) => n.id === 'src-od-0001');
    expect(od?.epistemicClass).toBe('owner_approved_decision');
  });
  it('classifies epistemic state from evidence, not from prose', () => {
    const g = deriveGraph({
      repoRoot: resolve(fixtures, 'contested-lesson'),
      now: '2026-09-06T00:00:00+00:00',
    });
    const claims = g.nodes.filter((n) => n.nodeType === 'claim');
    expect(claims.map((c) => c.epistemicClass)).toEqual(['contested_claim', 'contested_claim']);
    const u = deriveGraph({ repoRoot: resolve(fixtures, 'unsupported-claim') });
    expect(u.nodes.find((n) => n.id === 'C-b')?.epistemicClass).toBe('unverified_claim');
    const s = deriveGraph({ repoRoot: resolve(fixtures, 'superseded-as-current') });
    expect(s.nodes.find((n) => n.id === 'old-rule')?.supersededBy).toBe('new-rule');
  });
  it("caps a claim's effective authority rank at its weakest supporting source", () => {
    const g = deriveGraph({ repoRoot });
    for (const c of g.nodes.filter((n) => n.nodeType === 'claim'))
      expect(Number(c.meta?.effectiveRank)).toBeLessThanOrEqual(4);
  });
});
