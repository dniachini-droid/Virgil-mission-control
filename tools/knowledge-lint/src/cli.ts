/**
 * **Mind Scan and the lesson checks, one command and one exit code.**
 *
 * Two scans run here because their finding vocabularies live in different
 * places — Mind Scan's is a contract in `@virgil/agent-contracts`, the lesson
 * classes are local to `@virgil/knowledge-graph` (`src/lessons.ts` says why).
 * That is a fact about the source and it is deliberately not a fact about using
 * this: one run, one report, one exit code. Two commands would be two answers,
 * and `KP3-05` is what two checkers that can disagree cost here.
 */
import { resolve } from 'node:path';
import { deriveGraph, scanGraph, scanLessons } from '@virgil/knowledge-graph';

const repoRoot = resolve(import.meta.dirname, '../../..');
const graph = deriveGraph({ repoRoot, now: new Date().toISOString() });
const result = scanGraph(graph, { repoRoot, scanId: `scan-${Date.now()}` });
const lessons = scanLessons({ repoRoot });

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

const governs = graph.edges.filter((e) => e.kind === 'governs').length;
console.log(
  `lessons: ${lessons.lessons.length} pages governing ${governs} files, ${lessons.captures.length} captures (${lessons.captures.filter((c) => c.state === 'open').length} open), loader ${lessons.loaderBytes ?? 'absent'} bytes`,
);
if (lessons.findings.length === 0) {
  console.log('lesson scan: no findings');
} else {
  for (const f of lessons.findings)
    console.log(
      `${f.severity.padEnd(13)} ${f.findingClass.padEnd(42)} ${f.subject} — ${f.explanation}`,
    );
  console.log(`lesson scan: ${lessons.findings.length} findings, ${lessons.blocking} blocking`);
}

process.exit(result.blocking + lessons.blocking > 0 ? 1 : 0);
