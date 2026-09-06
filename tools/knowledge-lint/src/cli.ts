import { resolve } from 'node:path';
import { deriveGraph, scanGraph } from '@virgil/knowledge-graph';

const repoRoot = resolve(import.meta.dirname, '../../..');
const graph = deriveGraph({ repoRoot, now: new Date().toISOString() });
const result = scanGraph(graph, { repoRoot, scanId: `scan-${Date.now()}` });

const pages = graph.nodes.filter((n) => n.nodeType === 'wiki_page').length;
const claims = graph.nodes.filter((n) => n.nodeType === 'claim').length;
const tethers = graph.edges.filter((e) => e.kind === 'tether');
console.log(
  `knowledge graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges, ${pages} pages, ${claims} claims, ${tethers.length} tethers (${tethers.filter((t) => t.state === 'intact').length} intact)`,
);
console.log(`graph hash ${graph.hash}`);
if (result.findings.length === 0) {
  console.log('mind scan: no findings');
} else {
  for (const f of result.findings)
    console.log(
      `${f.severity.padEnd(13)} ${f.findingClass.padEnd(42)} ${f.nodeIds.join(',')} — ${f.explanation}`,
    );
  console.log(`mind scan: ${result.findings.length} findings, ${result.blocking} blocking`);
}
process.exit(result.blocking > 0 ? 1 : 0);
