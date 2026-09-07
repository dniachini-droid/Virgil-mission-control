import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readFrontmatter } from './derive.js';
import { type GraphNode, type KnowledgeGraph, ownerControlledAuthority } from './ontology.js';

export type FindingClass =
  | 'contradiction'
  | 'stale_or_superseded_presented_as_current'
  | 'orphan_node'
  | 'broken_reference'
  | 'broken_provenance_tether'
  | 'repeated_concept_without_page'
  | 'unsupported_claim'
  | 'echo_chamber_around_outdated_source'
  | 'copied_live_operational_state'
  | 'proposed_repair_awaiting_approval';

export interface ScanFinding {
  findingId: string;
  scanId: string;
  findingClass: FindingClass;
  severity: 'blocking' | 'major' | 'minor' | 'informational';
  nodeIds: string[];
  claimIds: string[];
  evidence: Array<{
    kind: 'wiki_page' | 'raw_source' | 'code_path' | 'event';
    ref: string;
    description?: string;
  }>;
  explanation: string;
  proposedRepair?: string;
  repairRequiresOwner: boolean;
  status: 'open';
  raisedAt: string;
}

export interface ScanResult {
  scanId: string;
  findings: ScanFinding[];
  counts: Record<FindingClass, number>;
  blocking: number;
}

const severityOf: Record<FindingClass, ScanFinding['severity']> = {
  broken_provenance_tether: 'blocking',
  copied_live_operational_state: 'blocking',
  stale_or_superseded_presented_as_current: 'blocking',
  contradiction: 'major',
  unsupported_claim: 'major',
  echo_chamber_around_outdated_source: 'major',
  orphan_node: 'minor',
  broken_reference: 'minor',
  repeated_concept_without_page: 'minor',
  proposed_repair_awaiting_approval: 'informational',
};

const STATE_TOKENS = [
  'BUILDING',
  'BUILDER_REPORTED_COMPLETE',
  'VERIFICATION_INCOMPLETE',
  'READY_FOR_REVIEW',
  'REVIEW_IN_PROGRESS',
  'PASS_WITH_NON_BLOCKING_FINDINGS',
  'BLOCKED',
  'INSUFFICIENT_EVIDENCE',
  'REPAIR_AUTHORISED',
  'RE_REVIEW_REQUIRED',
  'SAFE_TO_MERGE',
  'MERGED',
  'DEPLOYED',
  'QUARANTINED',
  'OWNER_DECISION_REQUIRED',
];

/** Strip fenced code and inline code so state names in code spans are allowed. */
function proseOnly(body: string): string {
  return body.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]*`/g, ' ');
}

export function scanGraph(
  graph: KnowledgeGraph,
  opts: { repoRoot: string; knowledgeDir?: string; scanId?: string; now?: string },
): ScanResult {
  const scanId = opts.scanId ?? 'scan';
  const now = opts.now ?? graph.derivedAt;
  const findings: ScanFinding[] = [];
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  let n = 0;
  const add = (
    findingClass: FindingClass,
    nodeIds: string[],
    claimIds: string[],
    explanation: string,
    evidence: ScanFinding['evidence'],
    proposedRepair?: string,
  ) => {
    const requiresOwner = nodeIds.some((id) =>
      ownerControlledAuthority.has(byId.get(id)?.authorityClass ?? 'compiled'),
    );
    findings.push({
      findingId: `${scanId}-${String(++n).padStart(3, '0')}`,
      scanId,
      findingClass,
      severity: severityOf[findingClass],
      nodeIds,
      claimIds,
      evidence,
      explanation,
      ...(proposedRepair ? { proposedRepair } : {}),
      repairRequiresOwner: requiresOwner,
      status: 'open',
      raisedAt: now,
    });
  };
  const pageOf = (claim: GraphNode) => String(claim.meta?.page ?? '');
  const pages = graph.nodes.filter((x) => x.nodeType === 'wiki_page');
  const claims = graph.nodes.filter((x) => x.nodeType === 'claim');
  const tethers = graph.edges.filter((e) => e.kind === 'tether');

  // broken / stale / absent tethers
  for (const t of tethers.filter((e) => e.state !== 'intact')) {
    const owner = byId.get(t.from);
    const page = owner?.nodeType === 'claim' ? pageOf(owner) : t.from;
    add(
      'broken_provenance_tether',
      [page],
      owner?.nodeType === 'claim' ? [t.from] : [],
      `Tether from ${t.from} to ${t.to} is ${t.state}: ${t.reason ?? ''}`.trim(),
      [
        { kind: 'wiki_page', ref: byId.get(page)?.path ?? page },
        { kind: 'raw_source', ref: t.to },
      ],
      'Re-seal the source or repoint the claim to an existing source; never edit the raw record.',
    );
  }

  // unsupported claims (no intact tether at all)
  for (const c of claims) {
    const any = tethers.filter((t) => t.from === c.id);
    if (any.length === 0)
      add(
        'unsupported_claim',
        [pageOf(c)],
        [c.id],
        `Claim ${c.id} ("${c.title}") has no intact provenance tether.`,
        [{ kind: 'wiki_page', ref: byId.get(pageOf(c))?.path ?? pageOf(c) }],
        'Add a source or mark the claim as a hypothesis.',
      );
  }

  // contradictions between supported claims
  const seenPairs = new Set<string>();
  for (const e of graph.edges.filter((x) => x.kind === 'contradicts')) {
    const key = [e.from, e.to].sort().join('|');
    if (seenPairs.has(key)) continue;
    seenPairs.add(key);
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) continue;
    add(
      'contradiction',
      [...new Set([pageOf(a), pageOf(b)])],
      [a.id, b.id],
      `Claims ${a.id} and ${b.id} contradict each other; both keep their sources and classes.`,
      [
        { kind: 'wiki_page', ref: a.path ?? '' },
        { kind: 'wiki_page', ref: b.path ?? '' },
      ],
      'Resolve by owner decision or verified evidence; then mark the losing claim supersededBy.',
    );
  }

  // superseded presented as current
  for (const p of pages) {
    if (p.supersededBy && p.status === 'current')
      add(
        'stale_or_superseded_presented_as_current',
        [p.id],
        [],
        `Page ${p.id} has supersededBy=${p.supersededBy} but status current.`,
        [{ kind: 'wiki_page', ref: p.path ?? p.id }],
        'Set status: superseded.',
      );
  }
  for (const e of graph.edges.filter((x) => x.kind === 'supersedes')) {
    const target = byId.get(e.to);
    if (target?.nodeType === 'wiki_page' && target.status === 'current')
      add(
        'stale_or_superseded_presented_as_current',
        [target.id],
        [],
        `Page ${target.id} is superseded by ${e.from} yet presented as current.`,
        [{ kind: 'wiki_page', ref: target.path ?? target.id }],
        'Set status: superseded and supersededBy.',
      );
  }

  // broken references
  for (const e of graph.edges.filter((x) => x.kind === 'links_to' || x.kind === 'related')) {
    if (!byId.has(e.to))
      add(
        'broken_reference',
        [e.from],
        [],
        `${e.kind} from ${e.from} to missing node ${e.to}.`,
        [{ kind: 'wiki_page', ref: byId.get(e.from)?.path ?? e.from }],
        `Create ${e.to} or fix the link.`,
      );
  }

  // orphans: no inbound structural edge and not in index.md
  const kdir = resolve(opts.repoRoot, opts.knowledgeDir ?? 'knowledge');
  const indexPath = resolve(kdir, 'index.md');
  const indexText = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : '';
  for (const p of pages) {
    const inbound = graph.edges.some(
      (e) =>
        e.to === p.id && (e.kind === 'links_to' || e.kind === 'related' || e.kind === 'supersedes'),
    );
    const indexed =
      indexText.includes(`[[${p.id}]]`) ||
      indexText.includes(`(${p.path})`) ||
      indexText.includes(p.id);
    if (!inbound && !indexed)
      add(
        'orphan_node',
        [p.id],
        [],
        `Page ${p.id} has no inbound link and is not in index.md.`,
        [{ kind: 'wiki_page', ref: p.path ?? p.id }],
        'Link it from a related page and add it to index.md.',
      );
  }

  // echo chamber: a region of two or more mutually linked pages whose tethers all lead to superseded or stale sources
  const outdatedPages = new Set(
    pages
      .filter((p) => {
        const claimIds = graph.edges
          .filter((e) => e.kind === 'contains' && e.from === p.id)
          .map((e) => e.to);
        const ts = tethers.filter((t) => t.from === p.id || claimIds.includes(t.from));
        if (ts.length === 0) return false;
        return ts.every((t) => {
          const target = byId.get(t.to);
          return (
            t.state === 'stale' ||
            (target?.nodeType === 'wiki_page' && target.status === 'superseded') ||
            !!target?.supersededBy
          );
        });
      })
      .map((p) => p.id),
  );
  const reportedRegion = new Set<string>();
  for (const id of outdatedPages) {
    if (reportedRegion.has(id)) continue;
    const region = new Set<string>([id]);
    const queue = [id];
    while (queue.length) {
      const cur = queue.pop() as string;
      for (const e of graph.edges.filter(
        (x) => (x.kind === 'links_to' || x.kind === 'related') && (x.from === cur || x.to === cur),
      )) {
        const other = e.from === cur ? e.to : e.from;
        if (outdatedPages.has(other) && !region.has(other)) {
          region.add(other);
          queue.push(other);
        }
      }
    }
    if (region.size >= 2) {
      for (const r of region) reportedRegion.add(r);
      const ids = [...region].sort();
      add(
        'echo_chamber_around_outdated_source',
        ids,
        [],
        `Pages ${ids.join(', ')} link each other and every tether resolves to superseded or stale authority.`,
        ids.map((x) => ({ kind: 'wiki_page' as const, ref: byId.get(x)?.path ?? x })),
        'Recompile the region from current sources.',
      );
    }
  }

  // copied live state and repeated concepts need page bodies
  const termCounts = new Map<string, Set<string>>();
  for (const p of pages) {
    if (!p.path) continue;
    const full = resolve(opts.repoRoot, p.path);
    if (!existsSync(full)) continue;
    const { body } = readFrontmatter(readFileSync(full, 'utf8'));
    const prose = proseOnly(body);
    const shas = prose.match(/\b[0-9a-f]{40}\b/g) ?? [];
    const prs = prose.match(/\b(?:PR|pull request)\s*#?\d+\b|(?<![\w/])#\d{1,6}\b/gi) ?? [];
    const states = STATE_TOKENS.filter((tok) =>
      new RegExp(`(?<![\\w_])${tok}(?![\\w_])`).test(prose),
    );
    if (shas.length || prs.length || states.length) {
      add(
        'copied_live_operational_state',
        [p.id],
        [],
        `Live operational values in durable prose: ${[...shas.map((s) => `sha ${s.slice(0, 7)}`), ...prs, ...states.map((s) => `state ${s}`)].join(', ')}.`,
        [{ kind: 'wiki_page', ref: p.path }],
        'Replace with a link to the live authority (read model, Git, GitHub) or wrap state names in code spans when naming the vocabulary.',
      );
    }
    for (const m of body.matchAll(/^#{2,4}\s+(.+)$|\*\*([^*\n]{3,60})\*\*/gm)) {
      const term = (m[1] ?? m[2] ?? '').trim().toLowerCase();
      if (!term) continue;
      const set = termCounts.get(term) ?? new Set<string>();
      set.add(p.id);
      termCounts.set(term, set);
    }
  }
  const titles = new Set(pages.flatMap((p) => [p.id.toLowerCase(), p.title.toLowerCase()]));
  for (const [term, ids] of termCounts) {
    if (ids.size >= 3 && !titles.has(term) && !titles.has(term.replace(/\s+/g, '-')))
      add(
        'repeated_concept_without_page',
        [...ids],
        [],
        `Concept "${term}" appears in ${ids.size} pages but has no page of its own.`,
        [...ids].map((id) => ({ kind: 'wiki_page' as const, ref: byId.get(id)?.path ?? id })),
        `Create a page for "${term}" and link the occurrences.`,
      );
  }

  // pending proposals
  for (const o of graph.nodes.filter((x) => x.nodeType === 'output' && x.meta?.proposal === true)) {
    add(
      'proposed_repair_awaiting_approval',
      [o.id],
      [],
      `Proposal ${o.id} awaits an owner decision.`,
      [{ kind: 'code_path', ref: o.path ?? o.id }],
    );
    const last = findings.at(-1);
    if (last) last.repairRequiresOwner = true;
  }

  const counts = Object.fromEntries(Object.keys(severityOf).map((k) => [k, 0])) as Record<
    FindingClass,
    number
  >;
  for (const f of findings) counts[f.findingClass] += 1;
  return {
    scanId,
    findings,
    counts,
    blocking: findings.filter((f) => f.severity === 'blocking').length,
  };
}
