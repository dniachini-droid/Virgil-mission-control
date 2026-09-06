import type { DomainEvent } from '@virgil/agent-contracts';

export type CandidateState =
  | 'BUILDING'
  | 'BUILDER_REPORTED_COMPLETE'
  | 'VERIFICATION_INCOMPLETE'
  | 'READY_FOR_REVIEW'
  | 'REVIEW_IN_PROGRESS'
  | 'PASS_WITH_NON_BLOCKING_FINDINGS'
  | 'BLOCKED'
  | 'INSUFFICIENT_EVIDENCE'
  | 'REPAIR_AUTHORISED'
  | 'RE_REVIEW_REQUIRED'
  | 'SAFE_TO_MERGE'
  | 'MERGED'
  | 'DEPLOYED'
  | 'QUARANTINED'
  | 'OWNER_DECISION_REQUIRED';

export type DeploymentState = 'NOT_STARTED' | 'STARTED' | 'FAILED' | 'SUCCEEDED';
export type CheckResult = 'running' | 'passed' | 'failed' | 'skipped';

export interface CheckState {
  checkId: string;
  name: string;
  required: boolean;
  result: CheckResult;
  exitCode?: number;
  skipReason?: string;
  failedSurface?: string;
  verificationId: string;
}

export interface FindingState {
  findingId: string;
  reportId: string;
  severity: string;
  blocking: boolean;
  surface: string;
  reproduced: boolean;
  status: 'raised' | 'accepted' | 'rejected_unsupported' | 'non_blocking_persisted' | 'repaired';
}

export interface ReviewSeal {
  reportId: string;
  sha: string;
  verdict: string;
  reviewerSession: string;
  stale: boolean;
}

/** A recorded, owner-actor `owner_decision` (or `scope_approved`) fact. Only these may be cited as authority. */
export interface OwnerDecisionRecord {
  decisionId: string;
  kind: string;
  seq: number;
  eventId: string;
  /** Event ids that consumed this decision for a one-shot action (merge, additional repair round). */
  consumedBy: string[];
}

export interface AdjudicationRecord {
  adjudicationId: string;
  seq: number;
  repairContractId?: string | undefined;
  acceptedFindingIds: string[];
  rejectedFindingIds: string[];
  repairCycleCount: number;
}

export interface LineageState {
  lineageId: string;
  state: CandidateState;
  previousState?: CandidateState;
  currentSha?: string;
  baseSha?: string;
  parentSha?: string;
  remoteSha?: string | undefined;
  pushed: boolean;
  mismatch?: { kind: string; localSha: string; remoteSha?: string };
  pr?: { number: number; headSha: string; draft: boolean };
  /** Sessions that built the candidate (fabricator sessions and any session that edited files). */
  builderSessions: string[];
  /** Sessions that repaired the candidate under a repair contract. */
  repairerSessions: string[];
  /** Sessions that ran deterministic verification (Prover sessions and check emitters). */
  proverSessions: string[];
  /** Sessions that reviewed or adjudicated the candidate. */
  reviewerSessions: string[];
  /** The verification run currently in progress or last completed, and the checks it declared required. */
  activeVerificationId?: string | undefined;
  activeVerificationSha?: string | undefined;
  requiredCheckIds: string[];
  verificationSignature?: string | undefined;
  verificationSha?: string | undefined;
  checks: Record<string, CheckState>;
  findings: Record<string, FindingState>;
  reviewSeal?: ReviewSeal | undefined;
  priorSeals: ReviewSeal[];
  quarantineReason?: string | undefined;
  /** Derived by counting accepted `repair_authorised` transitions. Never read from a payload. */
  repairCycles: number;
  activeRepairContractId?: string | undefined;
  /** Repair contracts withdrawn because the machinery halted for an owner decision while a repair was authorised. */
  withdrawnRepairContractIds: string[];
  adjudications: Record<string, AdjudicationRecord>;
  shaHistory: string[];
  deployment: DeploymentState;
  deploymentId?: string | undefined;
  mergeSha?: string | undefined;
  /** The safe state an `owner_decision` resumes into, recorded when the machinery halted (see guards.ts `safeResumeStateFor`). */
  resumeState?: CandidateState | undefined;
  pendingOwnerQuestion?:
    | { questionId: string; question: string; recommendedDefault: string }
    | undefined;
}

export interface AgentState {
  sessionId: string;
  roleId: string;
  grantId: string;
  status: 'active' | 'waiting' | 'completed';
  waitingOn?: string;
  claimedComplete?: boolean;
}

export interface GrantState {
  grantId: string;
  roleId: string;
  tier: string;
  permittedPaths: string[];
  expiresAt: string;
  revoked: boolean;
  revokedReason?: string;
}

export interface HandoffState {
  handoffId: string;
  fromRole: string;
  toRole: string;
  stage: string;
  status: 'prepared_unsealed' | 'prepared' | 'in_transit' | 'received' | 'interrupted';
  missing: string[];
  receiptVerified?: { sha: boolean; manifest: boolean; identity: boolean };
}

export interface FileState {
  path: string;
  status: 'read' | 'unstaged' | 'staged' | 'committed' | 'deleted' | 'moved';
  lastOperation: string;
  lastSeq: number;
  hash?: string;
}

export interface TransitionRecord {
  seq: number;
  eventId: string;
  type: string;
  from: CandidateState | null;
  to: CandidateState;
  guard?: string;
}

/**
 * An event the reducer refused. `kind` says why: `authority` (actor, grant or cited decision invalid),
 * `consistency` (payload contradicts recorded facts), `transition` (not allowed by the table or its guard),
 * `order` (out-of-order seq). Authority and consistency rejections apply no effect at all.
 */
export type InvalidEventKind = 'authority' | 'consistency' | 'transition' | 'order';

export interface InvalidTransition {
  seq: number;
  eventId: string;
  type: string;
  state: CandidateState | null;
  reason: string;
  kind: InvalidEventKind;
}

export interface RunState {
  runId: string;
  lastSeq: number;
  stage: {
    idea?: string;
    contractId?: string;
    scopeApproved?: boolean;
    planId?: string;
    planVerdict?: string;
    workOrderId?: string;
  };
  lineage: LineageState | null;
  grants: Record<string, GrantState>;
  agents: Record<string, AgentState>;
  handoffs: Record<string, HandoffState>;
  branches: Record<string, { baseSha: string }>;
  worktrees: Record<string, { branch: string; baseSha: string }>;
  files: Record<string, FileState>;
  commands: Record<
    string,
    {
      commandClass: string;
      target: string;
      status: 'started' | 'completed' | 'failed';
      exitCode?: number;
      failureClass?: string;
    }
  >;
  ownerQuestions: Array<{
    questionId: string;
    question: string;
    recommendedDefault: string;
    answeredBy?: string;
  }>;
  /** Owner decisions recorded by owner-actor events, keyed by decision id. */
  decisions: Record<string, OwnerDecisionRecord>;
  transitions: TransitionRecord[];
  invalidTransitions: InvalidTransition[];
  events: number;
  lastEventType?: DomainEvent['type'];
}

export function initialRunState(runId: string): RunState {
  return {
    runId,
    lastSeq: -1,
    stage: {},
    lineage: null,
    grants: {},
    agents: {},
    handoffs: {},
    branches: {},
    worktrees: {},
    files: {},
    commands: {},
    ownerQuestions: [],
    decisions: {},
    transitions: [],
    invalidTransitions: [],
    events: 0,
  };
}

export function newLineage(lineageId: string): LineageState {
  return {
    lineageId,
    state: 'BUILDING',
    pushed: false,
    builderSessions: [],
    repairerSessions: [],
    proverSessions: [],
    reviewerSessions: [],
    requiredCheckIds: [],
    checks: {},
    findings: {},
    priorSeals: [],
    repairCycles: 0,
    withdrawnRepairContractIds: [],
    adjudications: {},
    shaHistory: [],
    deployment: 'NOT_STARTED',
  };
}
