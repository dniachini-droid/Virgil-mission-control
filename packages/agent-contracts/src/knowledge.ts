import { z } from 'zod';
import { ContentHash, EvidenceRef, Id, RepoPath, Timestamp } from './common.js';

/** Epistemic classes. The ontology distinguishes raw evidence, durable knowledge, owner decisions, hypotheses, contradictions, supersession, unverified claims and live signals. */
export const EpistemicClass = z.enum([
  'immutable_raw_evidence',
  'durable_compiled_knowledge',
  'owner_approved_decision',
  'ai_generated_hypothesis',
  'contested_claim',
  'superseded_claim',
  'unverified_claim',
  'live_operational_signal',
  'deterministically_verified_fact',
]);

export const AuthorityClass = z.enum([
  'commission',
  'owner_decision',
  'constitution',
  'adr',
  'verified_evidence',
  'compiled',
  'hypothesis',
  'output',
]);

export const RawSourceKind = z.enum([
  'specification',
  'research_document',
  'image_reference',
  'owner_decision',
  'dataset',
  'run_record',
  'design_note',
  'unclassified',
]);

export const RawSourceRecord = z.object({
  sourceId: Id,
  kind: RawSourceKind,
  title: z.string(),
  canonicalPath: RepoPath.describe(
    'Path of the immutable source; the record never duplicates its content',
  ),
  contentHash: ContentHash.optional(),
  bytes: z.number().int().nonnegative().optional(),
  provenance: z.string().describe('Where the source came from and who curated it'),
  ingestionState: z.enum(['arrived', 'hashed', 'sealed', 'compiled']),
  addedAt: Timestamp,
  addedBy: z.string(),
  relatedSourceIds: z.array(Id).default([]),
  immutable: z.literal(true),
});

export const KnowledgeNodeKind = z.enum([
  'principle',
  'architecture_concept',
  'agent_role',
  'decision',
  'lesson',
  'open_question',
  'glossary_term',
  'visual_language',
  'governance',
  'contradiction_field',
]);

export const AtomicClaim = z.object({
  claimId: Id,
  nodeId: Id,
  statement: z.string(),
  epistemicClass: EpistemicClass,
  authorityClass: AuthorityClass,
  supportTetherIds: z.array(Id),
  contestedBy: z.array(Id).default([]),
  supersededBy: Id.optional(),
  verifiedAt: Timestamp.optional(),
  verificationSignature: z
    .string()
    .optional()
    .describe('Present only for deterministically verified facts'),
});

export const KnowledgeNode = z.object({
  nodeId: Id,
  kind: KnowledgeNodeKind,
  title: z.string(),
  path: RepoPath,
  epistemicClass: EpistemicClass,
  authorityClass: AuthorityClass,
  summary: z.string(),
  claims: z.array(AtomicClaim),
  related: z.array(Id).default([]),
  compiledAt: Timestamp,
  lastVerifiedAt: Timestamp.optional(),
  compiledBy: z.string().describe('Maintaining agent or skill'),
  supersededBy: Id.optional(),
  supersedes: z.array(Id).default([]),
  affectsDecisions: z.array(Id).default([]),
  affectsCodeSurfaces: z.array(RepoPath).default([]),
  status: z.enum(['current', 'contested', 'superseded', 'proposed', 'unverified']),
});

export const TetherKind = z.enum([
  'raw_source',
  'owner_decision',
  'adr',
  'schema',
  'code_path',
  'verified_run',
  'event',
  'wiki_page',
]);
export const TetherState = z.enum(['intact', 'broken', 'stale', 'absent']);

export const ProvenanceTether = z.object({
  tetherId: Id,
  fromClaimId: Id,
  kind: TetherKind,
  target: EvidenceRef,
  expectedHash: ContentHash.optional(),
  state: TetherState,
  createdAt: Timestamp,
  lastCheckedAt: Timestamp.optional(),
});

export const KnowledgeRelationship = z.object({
  relationshipId: Id,
  kind: z.enum(['supports', 'contradicts', 'supersedes']),
  fromId: Id.describe('Claim or source id'),
  toId: Id.describe('Claim id'),
  evidence: z.array(EvidenceRef),
  createdAt: Timestamp,
  createdBy: z.string(),
});

export const KnowledgeCompilationProposal = z.object({
  proposalId: Id,
  operation: z.enum(['ingest', 'compile', 'propose']),
  sourceIds: z.array(Id).min(1),
  proposedNodes: z.array(
    KnowledgeNode.pick({
      nodeId: true,
      kind: true,
      title: true,
      path: true,
      authorityClass: true,
      summary: true,
    }),
  ),
  proposedClaims: z.array(
    AtomicClaim.pick({ claimId: true, nodeId: true, statement: true, authorityClass: true }),
  ),
  proposedTethers: z.array(
    ProvenanceTether.pick({ tetherId: true, fromClaimId: true, kind: true, target: true }),
  ),
  affectedExistingNodes: z.array(
    z.object({ nodeId: Id, effect: z.enum(['strengthened', 'challenged', 'superseded']) }),
  ),
  requiresOwnerApproval: z
    .boolean()
    .describe('True for owner_decision, constitution or adr authority pages'),
  compiler: z.string(),
  proposedAt: Timestamp,
  status: z.enum(['proposed', 'approved', 'applied', 'rejected']),
});

export const KnowledgeCompilationResult = z.object({
  proposalId: Id,
  appliedAt: Timestamp,
  approvedBy: z.enum(['verification', 'owner']),
  decisionId: Id.optional(),
  createdNodeIds: z.array(Id),
  updatedNodeIds: z.array(Id),
  createdTetherIds: z.array(Id),
  contestedClaimIds: z.array(Id),
  supersededClaimIds: z.array(Id),
  rawSourcesUnchanged: z.literal(true).describe('Compilation never alters a raw source'),
});

export const MindScanFindingClass = z.enum([
  'contradiction',
  'stale_or_superseded_presented_as_current',
  'orphan_node',
  'broken_reference',
  'broken_provenance_tether',
  'repeated_concept_without_page',
  'unsupported_claim',
  'echo_chamber_around_outdated_source',
  'copied_live_operational_state',
  'proposed_repair_awaiting_approval',
]);

export const MindScanFinding = z.object({
  findingId: Id,
  scanId: Id,
  findingClass: MindScanFindingClass,
  severity: z.enum(['blocking', 'major', 'minor', 'informational']),
  nodeIds: z.array(Id),
  claimIds: z.array(Id).default([]),
  evidence: z.array(EvidenceRef).min(1),
  explanation: z.string(),
  proposedRepair: z.string().optional(),
  repairRequiresOwner: z.boolean(),
  status: z.enum(['open', 'proposed', 'resolved', 'dismissed_with_reason']),
  raisedAt: Timestamp,
});

/** Epistemic-to-visual projection contract entry. Rendering may not change classification. */
export const VisualForm = z.object({
  form: z.string().describe('Geometry family, e.g. solid_celestial_structure'),
  label: z.string().describe('Visible text label pattern'),
  pattern: z.string().describe('Surface or edge pattern independent of colour'),
  motion: z.string().describe('Motion signature; must be legible when reduced'),
  colourToken: z.string().describe('Palette token; never the sole state indicator'),
  authorityMark: z.string().optional(),
  tether: z.string().optional().describe('Tether rendering rule'),
  interaction: z.string().describe('Selection and inspection behaviour'),
  reducedMotion: z.string(),
  lowPerformance: z.string(),
});

export const EpistemicProjectionEntry = z.object({
  epistemicClass: EpistemicClass,
  authorityRank: z
    .number()
    .int()
    .min(0)
    .max(9)
    .describe('Higher ranks may never be rendered with the visual stability of a lower rank'),
  visualStability: z
    .number()
    .int()
    .min(0)
    .max(9)
    .describe('Perceived solidity; must not exceed what the authorityRank permits'),
  visual: VisualForm,
  persistent: z.boolean().describe('False only for live_operational_signal'),
});

export const EpistemicVisualProjectionContract = z.object({
  version: z.string(),
  entries: z.array(EpistemicProjectionEntry).length(9),
  tetherStates: z.record(
    TetherState,
    VisualForm.pick({
      form: true,
      pattern: true,
      motion: true,
      colourToken: true,
      reducedMotion: true,
    }),
  ),
  invariants: z.array(z.string()),
});
