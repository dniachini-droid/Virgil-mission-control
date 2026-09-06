import { z } from 'zod';
import {
  Actor,
  AuthorityTier,
  CandidateState,
  ChainContext,
  CheckRun,
  DeploymentState,
  EvidenceRef,
  Id,
  PrIdentity,
  RepoPath,
  RepoPathPattern,
  ReviewVerdict,
  RoleId,
  Severity,
  Sha,
  Timestamp,
} from './common.js';

export const ProjectManifest = z.object({
  projectId: Id,
  name: z.string(),
  repository: z.string().describe('Allowlist entry id, never a raw path or URL'),
  defaultBranch: z.string(),
  protectedBranches: z.array(z.string()),
  allowlistEntryId: Id,
  governingDecisions: z.array(Id).describe('Owner decision ids that govern this project'),
  governingKnowledgeNodes: z
    .array(Id)
    .describe('Wiki node ids whose principles govern this project'),
  createdAt: Timestamp,
});

export const OwnerDecisionQuestion = z.object({
  questionId: Id,
  question: z.string(),
  consequence: z.string(),
  recommendedDefault: z.string(),
});

export const AcceptanceContract = z.object({
  contractId: Id,
  projectId: Id,
  version: z.string(),
  status: z.enum(['proposed', 'owner_accepted', 'superseded']),
  problem: z.string(),
  intendedUser: z.string(),
  productPromise: z.string(),
  v1Boundary: z.string(),
  userJourneys: z.array(z.string()).min(1),
  acceptanceCriteria: z
    .array(z.object({ criterionId: Id, statement: z.string(), evidenceRequired: z.string() }))
    .min(1),
  nonGoals: z.array(z.string()),
  assumptions: z.array(z.string()),
  openOwnerDecisions: z.array(OwnerDecisionQuestion),
  failureConditions: z.array(z.string()),
  acceptedByDecisionId: Id.optional(),
  authoredBy: Actor,
  createdAt: Timestamp,
});

export const RiskClassification = z.object({
  classificationId: Id,
  contractId: Id,
  level: z.enum(['low', 'moderate', 'high', 'critical']),
  flags: z
    .object({
      domain: z
        .enum(['none', 'scientific', 'medical', 'legal', 'financial', 'business_logic'])
        .default('none'),
      safetyLogic: z.boolean().default(false),
      destructiveOperations: z.boolean().default(false),
      stateMachineChange: z.boolean().default(false),
      crossComponent: z.boolean().default(false),
      apiChange: z.boolean().default(false),
      migration: z.boolean().default(false),
      sharedInfrastructure: z.boolean().default(false),
      renderedUi: z.boolean().default(false),
      accessibility: z.boolean().default(false),
      mobile: z.boolean().default(false),
      userFacingCopy: z.boolean().default(false),
      authentication: z.boolean().default(false),
      secrets: z.boolean().default(false),
      personalData: z.boolean().default(false),
      payments: z.boolean().default(false),
      externalActions: z.boolean().default(false),
      permissionChange: z.boolean().default(false),
      generatedArtifacts: z.boolean().default(false),
      uploads: z.boolean().default(false),
      canonicalFiles: z.boolean().default(false),
      remoteLocalEquality: z.boolean().default(false),
      expensiveRendering: z.boolean().default(false),
      largeData: z.boolean().default(false),
      concurrency: z.boolean().default(false),
      resourceBudget: z.boolean().default(false),
    })
    .describe('Risk flags that activate conditional specialists'),
  requiredFormation: z.array(RoleId).min(1).describe('Smallest adequate reviewer formation'),
  requiresArbiter: z.boolean(),
  rationale: z.string(),
});

export const ImplementationPlan = z.object({
  planId: Id,
  contractId: Id,
  projectId: Id,
  baseSha: Sha,
  status: z.enum(['proposed', 'go', 'no_go']),
  repositoryFindings: z.array(z.string()),
  moduleDependencyMap: z.array(z.object({ module: z.string(), dependsOn: z.array(z.string()) })),
  proposedArchitecture: z.string(),
  dataSchemaChanges: z.array(z.string()),
  migrationBoundary: z.string(),
  testingStrategy: z.string(),
  riskClassification: RiskClassification,
  taskGraph: z.array(
    z.object({
      taskId: Id,
      title: z.string(),
      dependsOn: z.array(Id),
      permittedPaths: z.array(RepoPathPattern),
      requiredChecks: z.array(Id),
    }),
  ),
  permittedPaths: z.array(RepoPathPattern).min(1),
  protectedPaths: z.array(RepoPathPattern),
  untouchedAreas: z.array(z.string()),
  requiredChecks: z
    .array(z.object({ checkId: Id, name: z.string(), commandClass: z.string() }))
    .min(1),
  goNoGo: z.object({ verdict: z.enum(['go', 'no_go']), reasons: z.array(z.string()) }),
  authoredBy: Actor,
  createdAt: Timestamp,
});

export const AgentAuthorityGrant = z.object({
  grantId: Id,
  runId: Id,
  roleId: RoleId,
  sessionId: Id.optional(),
  tier: AuthorityTier,
  permittedActions: z.array(z.string()).min(1),
  repository: z.string(),
  worktree: z.string().optional(),
  branch: z.string().optional(),
  permittedPaths: z.array(RepoPathPattern),
  prohibitedPaths: z.array(RepoPathPattern),
  requiredChecks: z.array(Id),
  stopConditions: z.array(z.string()).min(1),
  grantedBy: Actor,
  grantedByDecisionId: Id.optional().describe('Owner decision id when tier requires it'),
  issuedAt: Timestamp,
  expiresAt: Timestamp,
  revokedAt: Timestamp.optional(),
  revokedReason: z.string().optional(),
});

export const StageAssignment = z.object({
  assignmentId: Id,
  runId: Id,
  stage: z.enum([
    'scope',
    'plan',
    'build',
    'verification',
    'review',
    'adjudication',
    'repair',
    're_review',
    'owner_gate',
    'deploy',
  ]),
  roleId: RoleId,
  grantId: Id,
  inputs: z.array(EvidenceRef),
  workOrderId: Id.optional(),
  assignedBy: Actor,
  assignedAt: Timestamp,
});

export const WorkOrder = z.object({
  workOrderId: Id,
  contractId: Id,
  intendedUser: z.string(),
  productPromise: z.string(),
  acceptanceCriteria: z.array(Id).min(1),
  nonGoals: z.array(z.string()),
  permittedSurfaces: z.array(RepoPathPattern),
  protectedSurfaces: z.array(RepoPathPattern),
  requiredEvidence: z.array(z.string()),
  stopConditions: z.array(z.string()),
  openOwnerDecisions: z.array(Id),
});

export const CandidateArtifact = ChainContext.extend({
  artifactId: Id,
  lineageId: Id.describe('Stable identity across repairs of the same candidate'),
  headSha: Sha,
  baseSha: Sha,
  parentSha: Sha.optional(),
  shortSha: z.string(),
  branch: z.string(),
  worktree: z.string(),
  manifest: z.array(
    z.object({
      path: RepoPath,
      change: z.enum(['added', 'modified', 'moved', 'deleted']),
      hash: z.string().optional(),
    }),
  ),
  author: Actor,
  committedAt: Timestamp,
  pushed: z.boolean(),
  remoteSha: Sha.optional(),
  sealed: z
    .literal(true)
    .describe('A candidate is always sealed; a repair produces a new artifact'),
});

export const MachineVerificationResult = ChainContext.extend({
  verificationId: Id,
  headSha: Sha,
  checks: z.array(CheckRun).min(1),
  allRequiredCompleted: z.boolean(),
  anyRequiredFailed: z.boolean(),
  mutationControl: z
    .object({
      disposableCopyRef: z.string(),
      seededDefect: z.string(),
      detectedByCheckId: Id.optional(),
      detected: z.boolean(),
    })
    .optional(),
  baselineFailures: z.array(Id),
  signature: z.string().describe('Machine verification signature over completed checks only'),
  startedAt: Timestamp,
  completedAt: Timestamp,
});

export const ReviewFinding = z.object({
  findingId: Id.describe('Stable identity; never renumbered'),
  raisedBy: Actor,
  severity: Severity,
  blocking: z.boolean(),
  surface: RepoPath.or(z.string()).describe('Exact affected surface'),
  criterionId: Id.optional().describe('Acceptance criterion or authority concerned'),
  title: z.string(),
  description: z.string(),
  reproduction: z.array(EvidenceRef).describe('Reproduction evidence; empty means unsupported'),
  status: z.enum([
    'raised',
    'reproduced',
    'rejected_unsupported',
    'consolidated',
    'repaired',
    'verified_repaired',
    'non_blocking_persisted',
  ]),
  consolidatedInto: Id.optional(),
  injectionAttempt: z.boolean().default(false),
});

export const ReviewReport = ChainContext.extend({
  reportId: Id,
  reviewedSha: Sha,
  reviewer: Actor,
  independentOfSessions: z
    .array(Id)
    .describe('Session ids of builder and prover this reviewer is independent of'),
  verdict: ReviewVerdict,
  findings: z.array(ReviewFinding),
  checksReproduced: z.array(Id),
  evidenceExamined: z.array(EvidenceRef).min(1),
  startedAt: Timestamp,
  completedAt: Timestamp,
});

export const Adjudication = z.object({
  adjudicationId: Id,
  lineageId: Id,
  reviewedSha: Sha,
  adjudicator: Actor,
  reports: z.array(Id).min(1),
  accepted: z.array(
    z.object({ findingId: Id, severity: Severity, reproduction: z.array(EvidenceRef).min(1) }),
  ),
  rejected: z.array(z.object({ findingId: Id, reason: z.string() })),
  consolidations: z.array(z.object({ into: Id, from: z.array(Id).min(1) })),
  repairContractId: Id.optional(),
  repairCycleCount: z.number().int().nonnegative(),
  ownerDecisionRequired: z.boolean(),
  completedAt: Timestamp,
});

export const RepairContract = ChainContext.extend({
  repairContractId: Id,
  lineageId: Id,
  reviewedSha: Sha,
  acceptedFindingIds: z.array(Id).min(1),
  reproductionEvidence: z.array(EvidenceRef).min(1),
  permittedFiles: z.array(RepoPathPattern).min(1),
  prohibitedCollateral: z.array(z.string()),
  requiredChecks: z.array(Id).min(1),
  maximumScope: z.string(),
  repairCycleCount: z.number().int().positive(),
  stopConditions: z.array(z.string()).min(1),
  authorisedBy: Actor,
  authorisedByDecisionId: Id.optional(),
  issuedAt: Timestamp,
});

export const GateDecision = z.object({
  gateId: z.string(),
  result: z.enum(['pass', 'fail', 'insufficient_evidence']),
  reason: z.string(),
  evidence: z.array(EvidenceRef),
  evaluatedAt: Timestamp.optional(),
});

export const GateReport = z.object({
  reportId: Id,
  purpose: z.enum([
    'review_eligibility',
    'merge_eligibility',
    'repair_authorisation',
    'deploy_authority',
  ]),
  headSha: Sha.optional(),
  decisions: z.array(GateDecision).min(1),
  overall: z.enum(['pass', 'fail', 'insufficient_evidence']),
  evaluatedAt: Timestamp,
});

export const OwnerDecision = z.object({
  decisionId: Id,
  kind: z.enum([
    'scope_acceptance',
    'material_product_decision',
    'authority_change',
    'scope_expansion',
    'additional_repair_round',
    'retry_after_failure',
    'merge',
    'deployment',
    'permission_expansion',
    'phase_approval',
    'knowledge_authority',
  ]),
  question: z.string(),
  decision: z.string(),
  consequences: z.array(z.string()),
  resumesTo: CandidateState.optional(),
  appliesTo: z.array(EvidenceRef),
  decidedAt: Timestamp,
  recordPath: RepoPath.optional().describe('docs/decisions/OD-*.md when recorded as a file'),
});

export const Handoff = z.object({
  handoffId: Id,
  runId: Id,
  fromRole: RoleId,
  toRole: RoleId,
  stage: z.string(),
  artifact: EvidenceRef,
  manifest: z.array(RepoPath),
  evidence: z.array(EvidenceRef).min(1),
  risks: z.array(z.string()),
  nextStageContract: EvidenceRef,
  authorityTravels: z
    .literal(false)
    .describe('Authority never travels with a handoff; a separate grant event is required'),
  sealed: z
    .boolean()
    .describe('False when required information is absent; an unsealed handoff cannot transit'),
  missing: z.array(z.string()),
  preparedAt: Timestamp,
  receivedAt: Timestamp.optional(),
  receiptVerified: z
    .object({ sha: z.boolean(), manifest: z.boolean(), identity: z.boolean() })
    .optional(),
});

export const AgentResult = ChainContext.extend({
  resultId: Id,
  runId: Id,
  roleId: RoleId,
  sessionId: Id,
  grantId: Id,
  claimedComplete: z.boolean().describe('A claim only. Never evidence.'),
  stopReason: z.string(),
  evidence: z.array(EvidenceRef),
  payloadSchema: z.string(),
  payload: z.unknown(),
  elapsedMs: z.number().int().nonnegative(),
  usage: z
    .object({
      inputTokens: z.number().int().nonnegative(),
      outputTokens: z.number().int().nonnegative(),
    })
    .optional(),
  nextAction: z.string(),
  startedAt: Timestamp,
  completedAt: Timestamp,
});

export const RunRecord = ChainContext.extend({
  runId: Id,
  phase: z.string(),
  purpose: z.string(),
  commands: z.array(
    z.object({
      commandClass: z.string(),
      summary: z.string(),
      exitCode: z.number().int().optional(),
    }),
  ),
  filesChanged: z.array(RepoPath),
  checksRun: z.array(CheckRun),
  checksSkipped: z.array(z.object({ checkId: Id, reason: z.string() })),
  limitations: z.array(z.string()),
  commits: z.array(z.object({ sha: Sha, message: z.string() })),
  candidateState: CandidateState.optional(),
  deploymentState: DeploymentState.optional(),
  verdict: z.enum(['GO', 'NO_GO', 'BLOCKED_PENDING_REAL_GPU_REVIEW']).optional(),
  openOwnerDecisions: z.array(OwnerDecisionQuestion),
  risks: z.array(z.string()),
  nextAction: z.string(),
  startedAt: Timestamp,
  completedAt: Timestamp.optional(),
  pr: PrIdentity.optional(),
});

export const RepositoryAllowlistEntry = z.object({
  entryId: Id,
  repository: z.string(),
  permittedOperations: z.array(
    z.object({
      roleId: RoleId,
      operations: z.array(z.enum(['read', 'worktree', 'push_branch_pattern', 'open_draft_pr'])),
    }),
  ),
  pushBranchPattern: z.string().optional(),
  protectedBranches: z.array(z.string()),
  addedByDecisionId: Id,
});
export const RepositoryAllowlist = z.object({
  version: z.string(),
  entries: z.array(RepositoryAllowlistEntry),
});
