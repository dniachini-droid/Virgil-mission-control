import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { knowledgeEventTypes, operationalEventTypes } from '@virgil/agent-contracts';
import { parse as parseYaml } from 'yaml';
import {
  type AuthorityClassName,
  authorityRank,
  classifyTetherRef,
  epistemicClassForClaim,
  type GraphEdge,
  type GraphNode,
  type KnowledgeGraph,
} from './ontology.js';

export interface DeriveOptions {
  /** Repository root; knowledge/ and docs/ resolve from here. */
  repoRoot: string;
  /** Knowledge directory relative to repoRoot (default knowledge). */
  knowledgeDir?: string;
  /** Fixed timestamp for reproducible output. */
  now?: string;
}

interface Frontmatter {
  data: Record<string, unknown>;
  body: string;
}

export function readFrontmatter(text: string): Frontmatter {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text };
  return { data: (parseYaml(m[1] ?? '') as Record<string, unknown>) ?? {}, body: m[2] ?? '' };
}

export function sha256File(path: string): string {
  return `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`;
}

function walk(dir: string, filter: (f: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, filter));
    else if (filter(full)) out.push(full);
  }
  return out;
}

const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/**
 * Derive the provenance graph from inspectable files. Pure function of the file tree and options.now;
 * running it twice on the same tree yields an identical graph hash. It never writes.
 */
export function deriveGraph(opts: DeriveOptions): KnowledgeGraph {
  const root = resolve(opts.repoRoot);
  const kdir = resolve(root, opts.knowledgeDir ?? 'knowledge');
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const addNode = (n: GraphNode) => {
    if (!nodes.has(n.id)) nodes.set(n.id, n);
    return n;
  };
  const rel = (p: string) => relative(root, p).split('\\').join('/');

  // Raw source records
  for (const file of walk(join(kdir, 'raw'), (f) => f.endsWith('.source.md'))) {
    const { data } = readFrontmatter(readFileSync(file, 'utf8'));
    const id = str(data.sourceId);
    if (!id) continue;
    const canonical = str(data.canonicalPath);
    const target = resolve(root, canonical);
    const exists = existsSync(target);
    const currentHash = exists ? sha256File(target) : undefined;
    const recordedHash = str(data.contentHash) || undefined;
    addNode({
      id,
      nodeType: 'raw_source',
      title: str(data.title, id),
      path: rel(file),
      epistemicClass:
        str(data.kind) === 'owner_decision' ? 'owner_approved_decision' : 'immutable_raw_evidence',
      authorityClass:
        str(data.kind) === 'owner_decision'
          ? 'owner_decision'
          : str(data.kind) === 'run_record'
            ? 'verified_evidence'
            : 'commission',
      ...(recordedHash ? { hash: recordedHash } : {}),
      meta: {
        kind: str(data.kind),
        canonicalPath: canonical,
        ingestionState: str(data.ingestionState),
        canonicalExists: exists,
        hashMatches: recordedHash && currentHash ? recordedHash === currentHash : undefined,
        ...(currentHash ? { currentHash } : {}),
      },
    });
  }

  // Owner decisions and ADRs
  for (const file of walk(join(root, 'docs/decisions'), (f) => /\/(OD|ADR)-\d{4}.*\.md$/.test(f))) {
    const p = rel(file);
    const isOd = /\/OD-/.test(p);
    const proposed = p.endsWith('.proposed.md');
    const title = (readFileSync(file, 'utf8').match(/^# (.+)$/m)?.[1] ?? p).trim();
    addNode({
      id: p,
      nodeType: isOd ? 'owner_decision' : 'adr',
      title,
      path: p,
      epistemicClass: proposed
        ? 'ai_generated_hypothesis'
        : isOd
          ? 'owner_approved_decision'
          : 'durable_compiled_knowledge',
      authorityClass: proposed ? 'hypothesis' : isOd ? 'owner_decision' : 'adr',
      hash: sha256File(file),
    });
  }

  // Wiki pages and claims
  const pageIds = new Set<string>();
  const pages: Array<{ id: string; data: Record<string, unknown>; body: string; path: string }> =
    [];
  for (const file of walk(join(kdir, 'wiki'), (f) => f.endsWith('.md'))) {
    const { data, body } = readFrontmatter(readFileSync(file, 'utf8'));
    const id = str(data.nodeId);
    if (!id) continue;
    pageIds.add(id);
    pages.push({ id, data, body, path: rel(file) });
  }
  for (const page of pages) {
    const { id, data, body, path } = page;
    const authority = (str(data.authorityClass, 'compiled') as AuthorityClassName) ?? 'compiled';
    const status = str(data.status, 'current');
    const supersededBy = str(data.supersededBy) || undefined;
    const claimsRaw = arr(data.claims) as Array<Record<string, unknown>>;
    const pageEpistemic =
      status === 'superseded'
        ? 'superseded_claim'
        : status === 'contested'
          ? 'contested_claim'
          : status === 'proposed'
            ? 'ai_generated_hypothesis'
            : status === 'unverified'
              ? 'unverified_claim'
              : authority === 'owner_decision'
                ? 'owner_approved_decision'
                : 'durable_compiled_knowledge';
    addNode({
      id,
      nodeType: 'wiki_page',
      title: str(data.title, id),
      path,
      epistemicClass: pageEpistemic,
      authorityClass: authority,
      kind: str(data.kind, 'glossary_term') as NonNullable<GraphNode['kind']>,
      status,
      compiledAt: str(data.compiledAt),
      lastVerifiedAt: str(data.lastVerifiedAt),
      compiledBy: str(data.compiledBy),
      ...(supersededBy ? { supersededBy } : {}),
      hash: sha256File(resolve(root, path)),
      meta: { claimCount: claimsRaw.length, bodyLength: body.length },
    });
    for (const s of arr(data.sources) as Array<Record<string, unknown>>) {
      const ref = str(s.ref);
      if (ref) edges.push(tether(root, nodes, `${id}`, ref, 'page'));
    }
    for (const r of arr(data.related))
      if (typeof r === 'string')
        edges.push({ id: `related:${id}->${r}`, kind: 'related', from: id, to: r });
    for (const r of arr(data.supersedes))
      if (typeof r === 'string')
        edges.push({ id: `supersedes:${id}->${r}`, kind: 'supersedes', from: id, to: r });
    if (supersededBy)
      edges.push({
        id: `supersedes:${supersededBy}->${id}`,
        kind: 'supersedes',
        from: supersededBy,
        to: id,
      });
    for (const link of body.matchAll(/\[\[([a-z0-9-]+)\]\]/g)) {
      const to = link[1] ?? '';
      edges.push({ id: `link:${id}->${to}`, kind: 'links_to', from: id, to });
    }
    const contradicts = new Set(
      arr(data.contradicts).filter((x): x is string => typeof x === 'string'),
    );
    for (const c of claimsRaw) {
      const cid = str(c.id);
      if (!cid) continue;
      const sources = arr(c.sources).filter((x): x is string => typeof x === 'string');
      const claimSuperseded = typeof c.supersededBy === 'string';
      const claimContested =
        contradicts.size > 0 && (arr(c.contradicts).length > 0 || status === 'contested');
      addNode({
        id: cid,
        nodeType: 'claim',
        title: str(c.statement),
        path,
        epistemicClass: epistemicClassForClaim({
          sourceCount: sources.length,
          contested: claimContested || arr(c.contradicts).length > 0,
          superseded: claimSuperseded,
          verifiedSignature: typeof c.verificationSignature === 'string',
          authority,
        }),
        authorityClass: authority,
        ...(claimSuperseded ? { supersededBy: str(c.supersedBy) || str(c.supersededBy) } : {}),
        meta: { page: id, sourceCount: sources.length },
      });
      edges.push({ id: `contains:${id}->${cid}`, kind: 'contains', from: id, to: cid });
      for (const src of sources) edges.push(tether(root, nodes, cid, src, 'claim'));
      for (const other of arr(c.contradicts))
        if (typeof other === 'string')
          edges.push({
            id: `contradicts:${cid}->${other}`,
            kind: 'contradicts',
            from: cid,
            to: other,
          });
      if (claimSuperseded)
        edges.push({
          id: `supersedes:${str(c.supersededBy)}->${cid}`,
          kind: 'supersedes',
          from: str(c.supersededBy),
          to: cid,
        });
    }
  }

  // Outputs and proposals
  for (const file of walk(
    join(kdir, 'outputs'),
    (f) => f.endsWith('.md') && !f.endsWith('README.md'),
  )) {
    const p = rel(file);
    const { data } = readFrontmatter(readFileSync(file, 'utf8'));
    const isProposal = p.includes('/proposals/');
    addNode({
      id: p,
      nodeType: 'output',
      title: str(data.title, p),
      path: p,
      epistemicClass: 'ai_generated_hypothesis',
      authorityClass: isProposal ? 'hypothesis' : 'output',
      hash: sha256File(file),
      meta: {
        proposal: isProposal,
        sourceNodeIds: arr(data.sourceNodeIds),
        governingVersion: str(data.governingVersion),
      },
    });
    for (const s of arr(data.sourceNodeIds))
      if (typeof s === 'string')
        edges.push({ id: `supports:${s}->${p}`, kind: 'supports', from: s, to: p });
  }

  // Authority rank propagation: a claim's effective rank is min(page authority, weakest supporting source)
  for (const n of nodes.values()) {
    if (n.nodeType !== 'claim') continue;
    const supports = edges.filter(
      (e) => e.kind === 'tether' && e.from === n.id && e.state === 'intact',
    );
    const ranks = supports.map(
      (e) => authorityRank[nodes.get(e.to)?.authorityClass ?? 'hypothesis'] ?? 0,
    );
    const own = authorityRank[n.authorityClass] ?? 0;
    n.meta = {
      ...(n.meta ?? {}),
      effectiveRank: ranks.length
        ? Math.min(own, ...ranks)
        : Math.min(own, authorityRank.hypothesis),
    };
  }

  const sortedNodes = [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id));
  const sortedEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));
  const hash = createHash('sha256')
    .update(JSON.stringify({ nodes: sortedNodes, edges: sortedEdges }))
    .digest('hex');
  return {
    version: '1.0.0',
    derivedAt: opts.now ?? '1970-01-01T00:00:00+00:00',
    root: rel(kdir) || 'knowledge',
    nodes: sortedNodes,
    edges: sortedEdges,
    hash: `sha256:${hash}`,
  };
}

function tether(
  root: string,
  nodes: Map<string, GraphNode>,
  from: string,
  ref: string,
  level: 'page' | 'claim',
): GraphEdge {
  const tetherKind = classifyTetherRef(ref);
  let to = ref;
  let state: GraphEdge['state'] = 'intact';
  let reason: string | undefined;
  switch (tetherKind) {
    case 'raw_source': {
      const src = nodes.get(ref);
      if (!src) {
        state = 'absent';
        reason = 'raw source record not found';
      } else if (src.meta?.canonicalExists === false) {
        state = 'broken';
        reason = 'canonical source file missing';
      } else if (src.meta?.hashMatches === false) {
        state = 'stale';
        reason = 'canonical source hash differs from sealed record';
      }
      break;
    }
    case 'event': {
      const type = ref.slice('event:'.length);
      const known =
        (operationalEventTypes as readonly string[]).includes(type) ||
        (knowledgeEventTypes as readonly string[]).includes(type);
      if (!known) {
        state = 'broken';
        reason = `unknown event type ${type}`;
      }
      to = ref;
      if (!nodes.has(ref))
        nodes.set(ref, {
          id: ref,
          nodeType: 'event_definition',
          title: type,
          epistemicClass: 'durable_compiled_knowledge',
          authorityClass: 'adr',
        });
      break;
    }
    case 'verified_run': {
      const runId = ref.slice('run:'.length);
      const candidates = [
        resolve(root, `docs/process/run-records/${runId}.md`),
        resolve(root, `docs/process/${runId}.md`),
      ];
      const found = candidates.find((c) => existsSync(c));
      if (!found) {
        state = 'broken';
        reason = `run record ${runId} not found`;
      }
      if (!nodes.has(ref))
        nodes.set(ref, {
          id: ref,
          nodeType: 'verified_run',
          title: runId,
          epistemicClass: 'deterministically_verified_fact',
          authorityClass: 'verified_evidence',
          ...(found ? { path: relative(root, found), hash: sha256File(found) } : {}),
        });
      break;
    }
    case 'wiki_page':
      to = ref.slice('wiki:'.length);
      if (!nodes.has(to)) {
        state = 'broken';
        reason = 'wiki page not found';
      }
      break;
    default: {
      const target = resolve(root, ref);
      if (!existsSync(target)) {
        state = 'broken';
        reason = 'path not found';
      } else if (!nodes.has(ref)) {
        nodes.set(ref, {
          id: ref,
          nodeType:
            tetherKind === 'owner_decision'
              ? 'owner_decision'
              : tetherKind === 'adr'
                ? 'adr'
                : tetherKind === 'schema'
                  ? 'schema'
                  : 'code_path',
          title: ref,
          path: ref,
          epistemicClass:
            tetherKind === 'owner_decision' ? 'owner_approved_decision' : 'immutable_raw_evidence',
          authorityClass:
            tetherKind === 'owner_decision'
              ? 'owner_decision'
              : tetherKind === 'adr'
                ? 'adr'
                : ref.startsWith('constitution/') ||
                    ref.startsWith('docs/product/VIRGIL_MASTER_COMMISSION')
                  ? 'constitution'
                  : 'verified_evidence',
          hash: sha256File(target),
        });
      }
    }
  }
  return {
    id: `tether:${level}:${from}->${to}`,
    kind: 'tether',
    from,
    to,
    tetherKind,
    state,
    ...(reason ? { reason } : {}),
  };
}
