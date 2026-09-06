import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { deriveGraph, type FindingClass, scanGraph } from '../src/index.js';

const repoRoot = resolve(import.meta.dirname, '../../..');
const fixtures = resolve(repoRoot, 'packages/test-fixtures/knowledge');

const expected: Record<string, FindingClass[]> = {
  clean: [],
  'contested-lesson': ['contradiction'],
  'superseded-as-current': ['stale_or_superseded_presented_as_current'],
  'orphan-page': ['orphan_node'],
  'broken-link': ['broken_reference'],
  'broken-tether': ['broken_provenance_tether'],
  'stale-hash': ['broken_provenance_tether'],
  'unsupported-claim': ['unsupported_claim'],
  'echo-chamber': ['broken_provenance_tether', 'echo_chamber_around_outdated_source'],
  'copied-live-state': ['copied_live_operational_state'],
  'repeated-concept': ['repeated_concept_without_page'],
  'pending-proposal': ['proposed_repair_awaiting_approval'],
};

describe('Mind Scan fixtures', () => {
  for (const [name, classes] of Object.entries(expected)) {
    it(`${name} → ${classes.join(', ') || 'no findings'}`, () => {
      const root = resolve(fixtures, name);
      const graph = deriveGraph({ repoRoot: root, now: '2026-09-06T00:00:00+00:00' });
      const result = scanGraph(graph, { repoRoot: root, scanId: name });
      const found = [...new Set(result.findings.map((f) => f.findingClass))].sort();
      expect(found, JSON.stringify(result.findings.map((f) => f.explanation))).toEqual(
        [...classes].sort(),
      );
      for (const f of result.findings) {
        expect(f.evidence.length).toBeGreaterThan(0);
        expect(f.nodeIds.length).toBeGreaterThan(0);
      }
    });
  }
  it('reports contradictions with both claims and never merges them', () => {
    const root = resolve(fixtures, 'contested-lesson');
    const result = scanGraph(deriveGraph({ repoRoot: root }), { repoRoot: root });
    const f = result.findings.find((x) => x.findingClass === 'contradiction');
    expect(f?.claimIds.sort()).toEqual(['C-bloom-note', 'C-bloom-run']);
    expect(f?.severity).toBe('major');
  });
  it('marks repairs on owner-controlled pages as requiring the owner', () => {
    const root = resolve(fixtures, 'pending-proposal');
    const result = scanGraph(deriveGraph({ repoRoot: root }), { repoRoot: root });
    expect(result.findings[0]?.repairRequiresOwner).toBe(true);
  });
  it('the real knowledge tree has no blocking findings', () => {
    const graph = deriveGraph({ repoRoot });
    const result = scanGraph(graph, { repoRoot });
    expect(
      result.findings.filter((f) => f.severity === 'blocking'),
      JSON.stringify(result.findings, null, 1),
    ).toEqual([]);
  });
});
