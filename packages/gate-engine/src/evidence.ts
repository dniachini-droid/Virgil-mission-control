/**
 * Evidence the gate engine consumes. Every field is a machine fact collected by an adapter
 * (Git, GitHub, check runner, event store). Fields left undefined mean "no evidence", which is
 * never treated as a pass.
 */
export interface CheckEvidence {
  checkId: string;
  required: boolean;
  result: 'running' | 'passed' | 'failed' | 'skipped';
  exitCode?: number;
  skipReason?: string;
  ranAgainstSha?: string;
}

export interface ReviewerEvidence {
  roleId: string;
  sessionId: string;
  reviewedSha: string;
  verdict?:
    | 'PASS'
    | 'PASS_WITH_NON_BLOCKING_FINDINGS'
    | 'BLOCKED'
    | 'INSUFFICIENT_EVIDENCE'
    | 'REVIEW_IN_PROGRESS';
}

export interface OwnerDecisionEvidence {
  decisionId: string;
  kind: string;
  appliesToSha?: string;
  recordPath?: string;
  exists: boolean;
}

export interface GateEvidence {
  repository?: string;
  allowlistedRepositories?: string[];
  workingTreeClean?: boolean;
  branch?: string;
  expectedBranch?: string;
  baseSha?: string;
  headSha?: string;
  headIsDescendantOfBase?: boolean;
  committed?: boolean;
  localHeadSha?: string;
  remoteHeadSha?: string;
  reviewedSha?: string;
  requiredCheckIds?: string[];
  checks?: CheckEvidence[];
  requiredReviewerRoles?: string[];
  reviewers?: ReviewerEvidence[];
  builderSessionIds?: string[];
  proverSessionIds?: string[];
  changedPaths?: string[];
  permittedPaths?: string[];
  artifactHashes?: Array<{ path: string; local?: string; remote?: string }>;
  baselineFailingCheckIds?: string[];
  candidateFailingCheckIds?: string[];
  repairCycleCount?: number;
  requestedRepairCycle?: number;
  ownerDecisions?: OwnerDecisionEvidence[];
  requestedAction?: 'review' | 'merge' | 'deploy' | 'repair';
  citedOwnerDecisionIds?: string[];
  mutationControl?: { seeded: boolean; detected: boolean; detectedByCheckId?: string };
}
