import { z } from 'zod';
import {
  Actor,
  AuthorityTier,
  CandidateState,
  CheckResult,
  EvidenceRef,
  Id,
  RepoPath,
  RepoPathPattern,
  ReviewVerdict,
  RoleId,
  Severity,
  Sha,
  Timestamp,
} from './common.js';

/** Durability classes (Amendment 1, event-model amendments). */
export const Durability = z.enum(['durable_audit', 'replayable_operational']);

const P = {
  none: z.object({}).strict(),
  idea: z.object({ ideaId: Id, summary: z.string() }),
  scope: z.object({ contractId: Id }),
  scopeApproved: z.object({ contractId: Id, decisionId: Id }),
  plan: z.object({ planId: Id, contractId: Id, verdict: z.enum(['go', 'no_go']) }),
  workOrder: z.object({ workOrderId: Id, contractId: Id }),
  authority: z.object({
    grantId: Id,
    roleId: RoleId,
    tier: AuthorityTier,
    permittedPaths: z.array(RepoPathPattern),
    expiresAt: Timestamp,
  }),
  authorityRevoked: z.object({ grantId: Id, reason: z.string() }),
  branch: z.object({ branch: z.string(), baseSha: Sha }),
  worktree: z.object({ worktree: z.string(), branch: z.string(), baseSha: Sha }),
  agentAssigned: z.object({ assignmentId: Id, roleId: RoleId, stage: z.string(), grantId: Id }),
  agent: z.object({ roleId: RoleId, sessionId: Id, grantId: Id }),
  agentWaiting: z.object({
    roleId: RoleId,
    sessionId: Id,
    waitingOn: z.string(),
    blockerKind: z.enum(['dependency', 'blocker', 'owner_question']),
  }),
  agentResult: z.object({
    resultId: Id,
    roleId: RoleId,
    sessionId: Id,
    claimedComplete: z.boolean(),
    stopReason: z.string(),
  }),
  fileRead: z.object({
    roleId: RoleId,
    path: RepoPath,
    byteRange: z.tuple([z.number().int(), z.number().int()]).optional(),
  }),
  search: z.object({
    roleId: RoleId,
    scope: z.enum(['file', 'directory', 'repository']),
    scopePath: RepoPath.optional(),
    patternClass: z.string(),
    matchCount: z.number().int().nonnegative(),
  }),
  fileCreated: z.object({
    roleId: RoleId,
    path: RepoPath,
    bytes: z.number().int().nonnegative(),
    hash: z.string(),
  }),
  fileModified: z.object({
    roleId: RoleId,
    path: RepoPath,
    added: z.number().int().nonnegative(),
    removed: z.number().int().nonnegative(),
    hashBefore: z.string(),
    hashAfter: z.string(),
  }),
  fileMoved: z.object({ roleId: RoleId, from: RepoPath, to: RepoPath, hash: z.string() }),
  fileDeleted: z.object({ roleId: RoleId, path: RepoPath, hashBefore: z.string() }),
  command: z.object({
    roleId: RoleId,
    commandId: Id,
    commandClass: z.string(),
    target: z.string(),
  }),
  commandDone: z.object({
    roleId: RoleId,
    commandId: Id,
    exitCode: z.number().int(),
    elapsedMs: z.number().int().nonnegative(),
  }),
  commandFailed: z.object({
    roleId: RoleId,
    commandId: Id,
    exitCode: z.number().int(),
    elapsedMs: z.number().int().nonnegative(),
    failureClass: z.string(),
  }),
  staged: z.object({
    roleId: RoleId,
    paths: z.array(RepoPath),
    rejectedOutOfBoundary: z.array(RepoPath),
  }),
  committed: z.object({
    artifactId: Id,
    lineageId: Id,
    headSha: Sha,
    parentSha: Sha,
    baseSha: Sha,
    manifest: z.array(RepoPath),
    branch: z.string(),
  }),
  pushStarted: z.object({ headSha: Sha, branch: z.string(), remote: z.string() }),
  pushed: z.object({ headSha: Sha, remoteSha: Sha, branch: z.string(), remote: z.string() }),
  pushFailed: z.object({
    headSha: Sha,
    branch: z.string(),
    remote: z.string(),
    failureClass: z.string(),
  }),
  mismatch: z.object({
    localSha: Sha,
    remoteSha: Sha.optional(),
    localHash: z.string().optional(),
    remoteHash: z.string().optional(),
    kind: z.enum(['sha', 'artifact_hash', 'manifest']),
  }),
  pr: z.object({ number: z.number().int().positive(), headSha: Sha, draft: z.boolean() }),
  handoffPrepared: z.object({
    handoffId: Id,
    fromRole: RoleId,
    toRole: RoleId,
    stage: z.string(),
    sealed: z.boolean(),
    missing: z.array(z.string()),
  }),
  handoff: z.object({ handoffId: Id, fromRole: RoleId, toRole: RoleId, stage: z.string() }),
  handoffReceived: z.object({
    handoffId: Id,
    toRole: RoleId,
    verified: z.object({ sha: z.boolean(), manifest: z.boolean(), identity: z.boolean() }),
  }),
  verification: z.object({ verificationId: Id, headSha: Sha, requiredChecks: z.array(Id) }),
  check: z.object({
    verificationId: Id,
    checkId: Id,
    name: z.string(),
    required: z.boolean(),
    parallelGroup: z.string().optional(),
  }),
  checkDone: z.object({
    verificationId: Id,
    checkId: Id,
    name: z.string(),
    required: z.boolean(),
    exitCode: z.number().int(),
    elapsedMs: z.number().int().nonnegative(),
  }),
  checkFailed: z.object({
    verificationId: Id,
    checkId: Id,
    name: z.string(),
    required: z.boolean(),
    exitCode: z.number().int(),
    failedSurface: z.string().optional(),
  }),
  checkSkipped: z.object({
    verificationId: Id,
    checkId: Id,
    name: z.string(),
    required: z.boolean(),
    reason: z.string(),
  }),
  verificationDone: z.object({
    verificationId: Id,
    headSha: Sha,
    results: z.record(Id, CheckResult),
    allRequiredCompleted: z.boolean(),
    anyRequiredFailed: z.boolean(),
    signature: z.string(),
  }),
  review: z.object({
    reportId: Id,
    reviewedSha: Sha,
    reviewerRole: RoleId,
    reviewerSession: Id,
    independentOfSessions: z.array(Id),
  }),
  finding: z.object({
    findingId: Id,
    reportId: Id,
    severity: Severity,
    blocking: z.boolean(),
    surface: z.string(),
    criterionId: Id.optional(),
    reproduced: z.boolean(),
  }),
  reviewVerdict: z.object({
    reportId: Id,
    reviewedSha: Sha,
    verdict: ReviewVerdict,
    findingIds: z.array(Id),
  }),
  quarantine: z.object({
    lineageId: Id,
    headSha: Sha,
    reason: z.enum([
      'proven_defect',
      'insufficient_evidence',
      'artifact_mismatch',
      'unapproved_path',
      'stale_review',
    ]),
    findingIds: z.array(Id),
  }),
  adjudication: z.object({
    adjudicationId: Id,
    acceptedFindingIds: z.array(Id),
    rejectedFindingIds: z.array(Id),
    repairContractId: Id.optional(),
    repairCycleCount: z.number().int(),
  }),
  repairAuthorised: z.object({
    repairContractId: Id,
    lineageId: Id,
    reviewedSha: Sha,
    acceptedFindingIds: z.array(Id),
    permittedFiles: z.array(RepoPathPattern),
    repairCycleCount: z.number().int().positive(),
    ownerDecisionId: Id.optional(),
  }),
  repairStarted: z.object({ repairContractId: Id, roleId: RoleId, sessionId: Id }),
  repairCompleted: z.object({ repairContractId: Id, lineageId: Id, previousSha: Sha, newSha: Sha }),
  changedAfterReview: z.object({ lineageId: Id, reviewedSha: Sha, newSha: Sha }),
  safeToMerge: z.object({ lineageId: Id, headSha: Sha, gateReportId: Id }),
  merged: z.object({
    lineageId: Id,
    headSha: Sha,
    mergeSha: Sha,
    decisionId: Id,
    targetBranch: z.string(),
  }),
  deploy: z.object({ deploymentId: Id, mergeSha: Sha, target: z.string(), decisionId: Id }),
  deployFailed: z.object({ deploymentId: Id, failureClass: z.string() }),
  deployed: z.object({ deploymentId: Id, mergeSha: Sha, target: z.string() }),
  ownerRequired: z.object({
    questionId: Id,
    question: z.string(),
    consequence: z.string(),
    recommendedDefault: z.string(),
    haltedStage: z.string().optional(),
  }),
  ownerDecision: z.object({
    decisionId: Id,
    kind: z.string(),
    resumesTo: CandidateState.optional(),
  }),
};

/** Operational event catalogue: type → payload schema and default durability. */
export const operationalEventCatalogue = {
  idea_received: { payload: P.idea, durability: 'durable_audit' },
  scope_proposed: { payload: P.scope, durability: 'durable_audit' },
  scope_approved: { payload: P.scopeApproved, durability: 'durable_audit' },
  plan_completed: { payload: P.plan, durability: 'durable_audit' },
  work_order_created: { payload: P.workOrder, durability: 'durable_audit' },
  authority_granted: { payload: P.authority, durability: 'durable_audit' },
  authority_revoked: { payload: P.authorityRevoked, durability: 'durable_audit' },
  branch_created: { payload: P.branch, durability: 'durable_audit' },
  worktree_created: { payload: P.worktree, durability: 'durable_audit' },
  agent_assigned: { payload: P.agentAssigned, durability: 'durable_audit' },
  agent_started: { payload: P.agent, durability: 'durable_audit' },
  agent_waiting: { payload: P.agentWaiting, durability: 'replayable_operational' },
  agent_result_received: { payload: P.agentResult, durability: 'durable_audit' },
  file_read: { payload: P.fileRead, durability: 'replayable_operational' },
  repository_searched: { payload: P.search, durability: 'replayable_operational' },
  file_created: { payload: P.fileCreated, durability: 'replayable_operational' },
  file_modified: { payload: P.fileModified, durability: 'replayable_operational' },
  file_moved: { payload: P.fileMoved, durability: 'replayable_operational' },
  file_deleted: { payload: P.fileDeleted, durability: 'durable_audit' },
  command_started: { payload: P.command, durability: 'replayable_operational' },
  command_completed: { payload: P.commandDone, durability: 'replayable_operational' },
  command_failed: { payload: P.commandFailed, durability: 'durable_audit' },
  changes_staged: { payload: P.staged, durability: 'replayable_operational' },
  candidate_committed: { payload: P.committed, durability: 'durable_audit' },
  push_started: { payload: P.pushStarted, durability: 'replayable_operational' },
  candidate_pushed: { payload: P.pushed, durability: 'durable_audit' },
  push_failed: { payload: P.pushFailed, durability: 'durable_audit' },
  remote_artifact_mismatch: { payload: P.mismatch, durability: 'durable_audit' },
  pr_opened: { payload: P.pr, durability: 'durable_audit' },
  handoff_prepared: { payload: P.handoffPrepared, durability: 'durable_audit' },
  handoff_started: { payload: P.handoff, durability: 'durable_audit' },
  handoff_received: { payload: P.handoffReceived, durability: 'durable_audit' },
  verification_started: { payload: P.verification, durability: 'durable_audit' },
  check_started: { payload: P.check, durability: 'replayable_operational' },
  check_passed: { payload: P.checkDone, durability: 'durable_audit' },
  check_failed: { payload: P.checkFailed, durability: 'durable_audit' },
  check_skipped: { payload: P.checkSkipped, durability: 'durable_audit' },
  verification_completed: { payload: P.verificationDone, durability: 'durable_audit' },
  review_started: { payload: P.review, durability: 'durable_audit' },
  finding_raised: { payload: P.finding, durability: 'durable_audit' },
  review_passed: { payload: P.reviewVerdict, durability: 'durable_audit' },
  review_blocked: { payload: P.reviewVerdict, durability: 'durable_audit' },
  review_insufficient_evidence: { payload: P.reviewVerdict, durability: 'durable_audit' },
  candidate_quarantined: { payload: P.quarantine, durability: 'durable_audit' },
  adjudication_completed: { payload: P.adjudication, durability: 'durable_audit' },
  repair_authorised: { payload: P.repairAuthorised, durability: 'durable_audit' },
  repair_started: { payload: P.repairStarted, durability: 'durable_audit' },
  repair_completed: { payload: P.repairCompleted, durability: 'durable_audit' },
  candidate_changed_after_review: { payload: P.changedAfterReview, durability: 'durable_audit' },
  safe_to_merge: { payload: P.safeToMerge, durability: 'durable_audit' },
  merged_by_owner: { payload: P.merged, durability: 'durable_audit' },
  deployment_started: { payload: P.deploy, durability: 'durable_audit' },
  deployment_failed: { payload: P.deployFailed, durability: 'durable_audit' },
  deployed: { payload: P.deployed, durability: 'durable_audit' },
  owner_decision_required: { payload: P.ownerRequired, durability: 'durable_audit' },
  owner_decision: { payload: P.ownerDecision, durability: 'durable_audit' },
} as const;

const K = {
  rawAdded: z.object({
    sourceId: Id,
    canonicalPath: RepoPath,
    sourceKind: z.string(),
    provenance: z.string(),
  }),
  rawHashed: z.object({ sourceId: Id, hash: z.string(), bytes: z.number().int().nonnegative() }),
  rawRead: z.object({ sourceId: Id, readerRole: z.string(), nonDestructive: z.literal(true) }),
  runDeposited: z.object({ runId: Id, runRecordRef: EvidenceRef, sourceId: Id }),
  compilationProposed: z.object({
    proposalId: Id,
    sourceIds: z.array(Id).min(1),
    proposedNodeIds: z.array(Id),
    proposedClaimIds: z.array(Id),
    compiler: z.string(),
    requiresOwnerApproval: z.boolean(),
  }),
  compilationApproved: z.object({
    proposalId: Id,
    approvedBy: z.enum(['verification', 'owner']),
    decisionId: Id.optional(),
  }),
  page: z.object({
    nodeId: Id,
    path: RepoPath,
    authorityClass: z.string(),
    compiler: z.string(),
    proposalId: Id.optional(),
  }),
  tether: z.object({
    tetherId: Id,
    fromClaimId: Id,
    toEvidence: EvidenceRef,
    tetherKind: z.string(),
  }),
  tetherBroken: z.object({
    tetherId: Id,
    reason: z.enum(['target_missing', 'hash_changed', 'source_superseded', 'stale']),
  }),
  claimSupported: z.object({
    claimId: Id,
    sourceIds: z.array(Id).min(1),
    authorityClass: z.string(),
  }),
  claimContested: z.object({ claimId: Id, contestedByClaimId: Id, fieldId: Id }),
  claimSuperseded: z.object({ claimId: Id, supersededByClaimId: Id, byEvidence: EvidenceRef }),
  gap: z.object({ gapId: Id, concept: z.string(), evidence: z.array(EvidenceRef) }),
  lint: z.object({ scanId: Id, scope: z.string() }),
  lintFinding: z.object({
    scanId: Id,
    findingId: Id,
    findingClass: z.string(),
    nodeIds: z.array(Id),
    evidence: z.array(EvidenceRef),
  }),
  lintDone: z.object({
    scanId: Id,
    findingCount: z.number().int().nonnegative(),
    proposedRepairs: z.number().int().nonnegative(),
  }),
  output: z.object({
    outputId: Id,
    path: RepoPath,
    sourceNodeIds: z.array(Id),
    governingVersion: z.string(),
  }),
};

export const knowledgeEventCatalogue = {
  raw_source_added: { payload: K.rawAdded, durability: 'durable_audit' },
  raw_source_hashed: { payload: K.rawHashed, durability: 'durable_audit' },
  raw_source_read: { payload: K.rawRead, durability: 'replayable_operational' },
  run_record_deposited: { payload: K.runDeposited, durability: 'durable_audit' },
  knowledge_compilation_proposed: { payload: K.compilationProposed, durability: 'durable_audit' },
  knowledge_compilation_approved: { payload: K.compilationApproved, durability: 'durable_audit' },
  wiki_page_created: { payload: K.page, durability: 'durable_audit' },
  wiki_page_updated: { payload: K.page, durability: 'durable_audit' },
  provenance_tether_created: { payload: K.tether, durability: 'durable_audit' },
  provenance_tether_broken: { payload: K.tetherBroken, durability: 'durable_audit' },
  claim_supported: { payload: K.claimSupported, durability: 'durable_audit' },
  claim_contested: { payload: K.claimContested, durability: 'durable_audit' },
  claim_superseded: { payload: K.claimSuperseded, durability: 'durable_audit' },
  knowledge_gap_detected: { payload: K.gap, durability: 'durable_audit' },
  wiki_lint_started: { payload: K.lint, durability: 'replayable_operational' },
  wiki_lint_finding_raised: { payload: K.lintFinding, durability: 'durable_audit' },
  wiki_lint_completed: { payload: K.lintDone, durability: 'durable_audit' },
  knowledge_output_generated: { payload: K.output, durability: 'durable_audit' },
} as const;

export type OperationalEventType = keyof typeof operationalEventCatalogue;
export type KnowledgeEventType = keyof typeof knowledgeEventCatalogue;
export const operationalEventTypes = Object.keys(
  operationalEventCatalogue,
) as OperationalEventType[];
export const knowledgeEventTypes = Object.keys(knowledgeEventCatalogue) as KnowledgeEventType[];

const envelopeBase = {
  eventId: Id,
  seq: z.number().int().nonnegative().describe('Monotonic position in the stream; replay order'),
  streamId: Id.describe('Run id for operational events; knowledge stream id for knowledge events'),
  occurredAt: Timestamp,
  recordedAt: Timestamp,
  actor: Actor,
  authorityGrantId: Id.optional().describe(
    'Grant under which the actor acted; absent for Tier 1 observation',
  ),
  evidence: z.array(EvidenceRef).describe('Machine or structured evidence supporting the fact'),
  causedBy: Id.optional().describe('Event id this event responds to'),
  durability: Durability,
};

type EnvelopeShape = typeof envelopeBase;
type MemberOf<A extends string, C extends Record<string, { payload: z.ZodTypeAny }>> = {
  [K in keyof C & string]: z.ZodObject<
    EnvelopeShape & { authority: z.ZodLiteral<A>; type: z.ZodLiteral<K>; payload: C[K]['payload'] }
  >;
}[keyof C & string];

function eventUnion<A extends string, C extends Record<string, { payload: z.ZodTypeAny }>>(
  authority: A,
  catalogue: C,
) {
  const members = Object.entries(catalogue).map(([type, def]) =>
    z.object({
      ...envelopeBase,
      authority: z.literal(authority),
      type: z.literal(type),
      payload: def.payload,
    }),
  );
  return z.discriminatedUnion('type', members as unknown as [MemberOf<A, C>, ...MemberOf<A, C>[]]);
}

export const OperationalEvent = eventUnion('operational', operationalEventCatalogue);
export const KnowledgeEvent = eventUnion('knowledge', knowledgeEventCatalogue);
export const DomainEvent = z
  .union([OperationalEvent, KnowledgeEvent])
  .describe(
    'Append-only fact. Operational and knowledge events keep distinct authority semantics.',
  );

/** Ephemeral telemetry is never appended to the event store and never drives an authenticated animation. */
export const TelemetrySignal = z.object({
  signal: z.enum([
    'agent_heartbeat',
    'render_frame_stats',
    'cursor_position',
    'progress_estimate',
    'network_latency',
  ]),
  at: Timestamp,
  value: z.unknown(),
});

export type OperationalEvent = z.infer<typeof OperationalEvent>;
export type KnowledgeEvent = z.infer<typeof KnowledgeEvent>;
export type DomainEvent = z.infer<typeof DomainEvent>;
