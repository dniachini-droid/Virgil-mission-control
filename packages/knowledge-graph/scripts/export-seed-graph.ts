import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  deriveGraph,
  projectSeedGraph,
  SEED_GRAPH_DERIVED_AT,
  serialiseSeedGraph,
} from '../src/index.js';

/** Exports the browser-safe seed projection for the Mind spike. Derived, never hand-edited; see test/seed-graph.test.ts. */
const repoRoot = resolve(import.meta.dirname, '../../..');
const seed = projectSeedGraph(deriveGraph({ repoRoot, now: SEED_GRAPH_DERIVED_AT }));
const file = resolve(repoRoot, 'packages/test-fixtures/knowledge/seed-graph.json');
writeFileSync(file, serialiseSeedGraph(seed));
console.log(`seed graph: ${seed.nodes.length} nodes, ${seed.edges.length} edges → ${file}`);
