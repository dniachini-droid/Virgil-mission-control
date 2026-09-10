export * from './common.js';
export * from './events.js';
export * from './knowledge.js';
export * from './live.js';
export * from './operational.js';
export * from './paths.js';
export * from './visual.js';

import * as common from './common.js';
import * as events from './events.js';
import * as knowledge from './knowledge.js';
import * as live from './live.js';
import * as operational from './operational.js';
import * as visual from './visual.js';

/** Registry of exported schemas by kebab-case name. Names match schemas/<name>.schema.json. */
export const schemaRegistry = {
  'project-manifest': operational.ProjectManifest,
  'acceptance-contract': operational.AcceptanceContract,
  'implementation-plan': operational.ImplementationPlan,
  'risk-classification': operational.RiskClassification,
  'stage-assignment': operational.StageAssignment,
  'work-order': operational.WorkOrder,
  'agent-authority-grant': operational.AgentAuthorityGrant,
  'agent-result': operational.AgentResult,
  handoff: operational.Handoff,
  'candidate-artifact': operational.CandidateArtifact,
  'machine-verification-result': operational.MachineVerificationResult,
  'review-finding': operational.ReviewFinding,
  'review-report': operational.ReviewReport,
  adjudication: operational.Adjudication,
  'repair-contract': operational.RepairContract,
  'gate-decision': operational.GateDecision,
  'gate-report': operational.GateReport,
  'owner-decision': operational.OwnerDecision,
  'run-record': operational.RunRecord,
  'repository-allowlist': operational.RepositoryAllowlist,
  'domain-event': events.DomainEvent,
  'telemetry-signal': events.TelemetrySignal,
  'raw-source-record': knowledge.RawSourceRecord,
  'knowledge-node': knowledge.KnowledgeNode,
  'atomic-claim': knowledge.AtomicClaim,
  'provenance-tether': knowledge.ProvenanceTether,
  'knowledge-relationship': knowledge.KnowledgeRelationship,
  'knowledge-compilation-proposal': knowledge.KnowledgeCompilationProposal,
  'knowledge-compilation-result': knowledge.KnowledgeCompilationResult,
  'mind-scan-finding': knowledge.MindScanFinding,
  'epistemic-visual-projection-contract': knowledge.EpistemicVisualProjectionContract,
  'operational-animation-grammar': visual.OperationalAnimationGrammar,
  'animation-mapping': visual.AnimationMapping,
  'role-performance-bible': visual.RolePerformanceBible,
  'agent-definition-frontmatter': visual.AgentDefinitionFrontmatter,
  'permission-matrix': visual.PermissionMatrix,
  'authority-config': visual.AuthorityConfig,
  'evidence-ref': common.EvidenceRef,
  'check-run': common.CheckRun,
  // Phase 2 slice two. A session's own report of what it is doing, and the only
  // schema in this registry whose contents are a claim by construction rather
  // than a record of something that happened.
  'session-status-report': live.SessionStatusReport,
} as const;

export type SchemaName = keyof typeof schemaRegistry;
