import type { KnowledgeGraph } from './ontology.js';

/** Fixed derivation timestamp for the committed seed projection; a pure function of the file tree needs no clock. */
export const SEED_GRAPH_DERIVED_AT = '2026-09-06T00:00:00+00:00';

export interface SeedGraphNode {
  id: string;
  nodeType: string;
  kind: string | null;
  title: string;
  epistemicClass: string;
  authorityClass: string;
  status: string | null;
  claimCount: number;
}

export interface SeedGraphEdge {
  kind: string;
  from: string;
  to: string;
  state: string | null;
}

export interface SeedGraph {
  derivedFrom: string;
  graphHash: string;
  nodes: SeedGraphNode[];
  edges: SeedGraphEdge[];
}

/**
 * Browser-safe projection of the real knowledge graph for the Mind spike. Derived, never hand-edited.
 * The export script writes it; the freshness test recomputes it and fails when the committed file is stale.
 */
export function projectSeedGraph(g: KnowledgeGraph): SeedGraph {
  const nodes = g.nodes
    .filter(
      (n) =>
        n.nodeType === 'wiki_page' ||
        n.nodeType === 'raw_source' ||
        n.nodeType === 'owner_decision',
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
  return {
    derivedFrom: 'knowledge/ via @virgil/knowledge-graph deriveGraph',
    graphHash: g.hash,
    nodes,
    edges,
  };
}

/** Canonical serialisation of the seed graph as committed. */
export function serialiseSeedGraph(seed: SeedGraph): string {
  return `${JSON.stringify(seed, null, 2)}\n`;
}
