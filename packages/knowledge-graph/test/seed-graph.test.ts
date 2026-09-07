import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  deriveGraph,
  projectSeedGraph,
  SEED_GRAPH_DERIVED_AT,
  serialiseSeedGraph,
} from '../src/index.js';

const repoRoot = resolve(import.meta.dirname, '../../..');
const seedFile = resolve(repoRoot, 'packages/test-fixtures/knowledge/seed-graph.json');

/**
 * Freshness (Keeper finding K-15): the committed seed graph is a derived artifact. If any file the
 * graph is derived from changes, this test fails until `pnpm --filter @virgil/knowledge-graph
 * export-seed-graph` is re-run and the result committed.
 */
describe('committed seed graph freshness', () => {
  const fresh = projectSeedGraph(deriveGraph({ repoRoot, now: SEED_GRAPH_DERIVED_AT }));
  const committedText = readFileSync(seedFile, 'utf8');
  it('matches a fresh derivation byte for byte', () => {
    expect(committedText).toBe(serialiseSeedGraph(fresh));
  });
  it('carries the hash of the graph it was derived from', () => {
    const committed = JSON.parse(committedText) as { graphHash: string };
    expect(committed.graphHash).toBe(fresh.graphHash);
  });
  it('is a pure projection: deriving twice yields the same seed', () => {
    const again = projectSeedGraph(deriveGraph({ repoRoot, now: SEED_GRAPH_DERIVED_AT }));
    expect(serialiseSeedGraph(again)).toBe(serialiseSeedGraph(fresh));
  });
});
