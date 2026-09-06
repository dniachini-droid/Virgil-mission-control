import type {
  AuthorityClass,
  EpistemicClass,
  KnowledgeNodeKind,
  TetherKind,
  TetherState,
} from '@virgil/agent-contracts';
import type { z } from 'zod';

export type EpistemicClassName = z.infer<typeof EpistemicClass>;
export type AuthorityClassName = z.infer<typeof AuthorityClass>;
export type NodeKindName = z.infer<typeof KnowledgeNodeKind>;
export type TetherKindName = z.infer<typeof TetherKind>;
export type TetherStateName = z.infer<typeof TetherState>;

/** Authority rank: higher may never be rendered with the stability of a lower one, and a claim's rank never exceeds its weakest supporting source's rank. */
export const authorityRank: Record<AuthorityClassName, number> = {
  commission: 9,
  owner_decision: 9,
  constitution: 8,
  adr: 7,
  verified_evidence: 6,
  compiled: 4,
  hypothesis: 2,
  output: 1,
};

/** Authority classes that may only change through an owner decision (propose, never apply). */
export const ownerControlledAuthority: ReadonlySet<AuthorityClassName> = new Set([
  'commission',
  'owner_decision',
  'constitution',
  'adr',
]);

export interface GraphNode {
  id: string;
  nodeType:
    | 'raw_source'
    | 'wiki_page'
    | 'claim'
    | 'owner_decision'
    | 'adr'
    | 'schema'
    | 'code_path'
    | 'event_definition'
    | 'verified_run'
    | 'output'
    | 'scan_finding';
  title: string;
  path?: string;
  epistemicClass: EpistemicClassName;
  authorityClass: AuthorityClassName;
  kind?: NodeKindName;
  status?: string;
  hash?: string;
  compiledAt?: string;
  lastVerifiedAt?: string;
  compiledBy?: string;
  supersededBy?: string;
  meta?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  kind: 'supports' | 'contradicts' | 'supersedes' | 'related' | 'contains' | 'links_to' | 'tether';
  from: string;
  to: string;
  tetherKind?: TetherKindName;
  state?: TetherStateName;
  reason?: string;
}

export interface KnowledgeGraph {
  version: string;
  derivedAt: string;
  root: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  hash: string;
}

export function classifyTetherRef(ref: string): TetherKindName {
  if (ref.startsWith('src-')) return 'raw_source';
  if (ref.startsWith('docs/decisions/OD-')) return 'owner_decision';
  if (ref.startsWith('docs/decisions/ADR-')) return 'adr';
  if (ref.startsWith('schemas/')) return 'schema';
  if (ref.startsWith('event:')) return 'event';
  if (ref.startsWith('run:')) return 'verified_run';
  if (ref.startsWith('wiki:')) return 'wiki_page';
  return 'code_path';
}

export function epistemicClassForClaim(args: {
  sourceCount: number;
  contested: boolean;
  superseded: boolean;
  verifiedSignature: boolean;
  authority: AuthorityClassName;
}): EpistemicClassName {
  if (args.superseded) return 'superseded_claim';
  if (args.contested) return 'contested_claim';
  if (args.sourceCount === 0) return 'unverified_claim';
  if (args.authority === 'hypothesis') return 'ai_generated_hypothesis';
  if (args.authority === 'owner_decision' || args.authority === 'commission')
    return 'owner_approved_decision';
  if (args.verifiedSignature) return 'deterministically_verified_fact';
  return 'durable_compiled_knowledge';
}
