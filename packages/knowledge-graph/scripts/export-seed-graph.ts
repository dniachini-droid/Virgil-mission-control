import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deriveGraph } from '../src/index.js';

/** Exports a browser-safe projection of the real knowledge graph for the Mind spike. Derived, never hand-edited. */
const repoRoot = resolve(import.meta.dirname, '../../..');
const g = deriveGraph({ repoRoot, now: '2026-09-06T00:00:00+00:00' });
const nodes = g.nodes
  .filter(
    (n) =>
      n.nodeType === 'wiki_page' || n.nodeType === 'raw_source' || n.nodeType === 'owner_decision',
  )
  .map((n) => ({
    id: n.id,
    nodeType: n.nodeType,
    kind: n.kind ?? null,
    title: n.title,
    epistemicClass: n.epistemicClass,
    authorityClass: n.authorityClass,
    status: n.status ?? null,
    claimCount: Number(n.meta?.claimCount ?? 0),
  }));
const ids = new Set(nodes.map((n) => n.id));
const edges = g.edges
  .filter(
    (e) =>
      ids.has(e.from) &&
      ids.has(e.to) &&
      (e.kind === 'tether' || e.kind === 'related' || e.kind === 'links_to'),
  )
  .map((e) => ({ kind: e.kind, from: e.from, to: e.to, state: e.state ?? null }));
const out = {
  derivedFrom: 'knowledge/ via @virgil/knowledge-graph deriveGraph',
  graphHash: g.hash,
  nodes,
  edges,
};
const file = resolve(repoRoot, 'packages/test-fixtures/knowledge/seed-graph.json');
writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
console.log(`seed graph: ${nodes.length} nodes, ${edges.length} edges → ${file}`);
