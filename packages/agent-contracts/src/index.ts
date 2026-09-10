export * from './common.js';
export * from './events.js';
export * from './knowledge.js';
export * from './operational.js';
export * from './paths.js';
export * from './visual.js';

import * as common from './common.js';
import * as events from './events.js';
import * as knowledge from './knowledge.js';
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
} as const;

/**
 * **Kept out of the registry above, and out of this file's exports, on purpose.**
 *
 * `src/live.ts` is Phase 2 slice two's session-status schema. Adding it to the
 * barrel put **914 bytes into V10's Owner Build**: V10 imports this package, so
 * everything the barrel re-exports is reachable from V10's bundle whether V10
 * uses it or not. V10's byte count caught it on the next build.
 *
 * That count is **retired** by `OD-0010` and is no longer a contract; this
 * paragraph said the build "may not move" and quoted a figure that is no longer
 * current (the Keeper's KP3-12). The reason to keep the schema out of the barrel
 * does not depend on the contract: 914 bytes of unreachable code in a build the
 * owner opens from a file is waste whether or not anything is counting.
 *
 * So the schema is registered where it is needed and nowhere else. `export-
 * schemas` imports it directly and writes `schemas/session-status-report.schema.json`
 * exactly as before; nothing that compiles into V10 can see it.
 */

export type SchemaName = keyof typeof schemaRegistry;
