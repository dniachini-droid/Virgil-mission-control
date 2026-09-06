import type { DomainEvent } from '@virgil/agent-contracts';
import {
  derivedVerification,
  evaluateGuard,
  safeResumeStateFor,
  terminalStates,
} from './guards.js';
import {
  type CandidateState,
  type InvalidEventKind,
  type LineageState,
  newLineage,
  type RunState,
} from './state.js';
import {
  candidateTransitions,
  guardSoftEvents,
  lineageEventTypes,
  softLineageEvents,
} from './transitions.js';
import { validateEvent } from './validation.js';

type P = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === 'string' ? v : String(v);
}

function addUnique(list: string[], value: string | undefined): void {
  if (value && !list.includes(value)) list.push(value);
}

const reviewerRoleIds = new Set([
  'keeper',
  'arbiter',
  'domain-verifier',
  'breaker',
  'integrator',
  'interface-keeper',
  'security-sentinel',
  'transport-inspector',
  'performance-examiner',
]);

function recordDecision(run: RunState, event: DomainEvent, decisionId: string, kind: string): void {
  run.decisions[decisionId] = {
    decisionId,
    kind,
    seq: event.seq,
    eventId: event.eventId,
    consumedBy: [],
  };
}

function consumeDecision(run: RunState, decisionId: unknown, eventId: string): void {
  const d = typeof decisionId === 'string' ? run.decisions[decisionId] : undefined;
  if (d) d.consumedBy.push(eventId);
}

function reject(
  run: RunState,
  event: DomainEvent,
  kind: InvalidEventKind,
  reason: string,
): ApplyResult {
  run.invalidTransitions.push({
    seq: event.seq,
    eventId: event.eventId,
    type: event.type,
    state: run.lineage?.state ?? null,
    reason,
    kind,
  });
  return { run, accepted: false, transitioned: false, reason };
}

/** Auxiliary (non-state-machine) effects. Facts are recorded exactly; nothing is inferred. */
function applyAuxiliary(run: RunState, event: DomainEvent): void {
  const p = event.payload as P;
  const seq = event.seq;
  switch (event.type) {
    case 'idea_received':
      run.stage.idea = str(p.ideaId);
      break;
    case 'scope_proposed':
      run.stage.contractId = str(p.contractId);
      break;
    case 'scope_approved':
      run.stage.contractId = str(p.contractId);
      run.stage.scopeApproved = true;
      recordDecision(run, event, str(p.decisionId), 'scope_approved');
      break;
    case 'plan_completed':
      run.stage.planId = str(p.planId);
      run.stage.planVerdict = str(p.verdict);
      break;
    case 'work_order_created':
      run.stage.workOrderId = str(p.workOrderId);
      break;
    case 'authority_granted':
      run.grants[str(p.grantId)] = {
        grantId: str(p.grantId),
        roleId: str(p.roleId),
        tier: str(p.tier),
        permittedPaths: (p.permittedPaths as string[]) ?? [],
        expiresAt: str(p.expiresAt),
        revoked: false,
      };
      break;
    case 'authority_revoked': {
      const g = run.grants[str(p.grantId)];
      if (g) {
        g.revoked = true;
        g.revokedReason = str(p.reason);
      }
      break;
    }
    case 'branch_created':
      run.branches[str(p.branch)] = { baseSha: str(p.baseSha) };
      break;
    case 'worktree_created':
      run.worktrees[str(p.worktree)] = { branch: str(p.branch), baseSha: str(p.baseSha) };
      break;
    case 'agent_started': {
      const sessionId = str(p.sessionId);
      run.agents[sessionId] = {
        sessionId,
        roleId: str(p.roleId),
        grantId: str(p.grantId),
        status: 'active',
      };
      if (p.roleId === 'fabricator') {
        if (!run.lineage) run.lineage = newLineage(run.runId);
        addUnique(run.lineage.builderSessions, sessionId);
      } else if (p.roleId === 'prover') {
        if (run.lineage) addUnique(run.lineage.proverSessions, sessionId);
      } else if (reviewerRoleIds.has(str(p.roleId))) {
        if (run.lineage) addUnique(run.lineage.reviewerSessions, sessionId);
      }
      break;
    }
    case 'agent_waiting': {
      const a = run.agents[str(p.sessionId)];
      if (a) {
        a.status = 'waiting';
        a.waitingOn = str(p.waitingOn);
      }
      break;
    }
    case 'agent_result_received': {
      const a = run.agents[str(p.sessionId)];
      if (a) {
        a.status = 'completed';
        a.claimedComplete = p.claimedComplete === true;
      }
      break;
    }
    case 'file_read':
      run.files[str(p.path)] = {
        path: str(p.path),
        status: run.files[str(p.path)]?.status ?? 'read',
        lastOperation: 'read',
        lastSeq: seq,
      };
      break;
    case 'file_created':
      run.files[str(p.path)] = {
        path: str(p.path),
        status: 'unstaged',
        lastOperation: 'created',
        lastSeq: seq,
        hash: str(p.hash),
      };
      break;
    case 'file_modified':
      run.files[str(p.path)] = {
        path: str(p.path),
        status: 'unstaged',
        lastOperation: 'modified',
        lastSeq: seq,
        hash: str(p.hashAfter),
      };
      break;
    case 'file_moved':
      delete run.files[str(p.from)];
      run.files[str(p.to)] = {
        path: str(p.to),
        status: 'unstaged',
        lastOperation: `moved_from:${str(p.from)}`,
        lastSeq: seq,
        hash: str(p.hash),
      };
      break;
    case 'file_deleted':
      run.files[str(p.path)] = {
        path: str(p.path),
        status: 'deleted',
        lastOperation: 'deleted',
        lastSeq: seq,
        hash: str(p.hashBefore),
      };
      break;
    case 'command_started':
      run.commands[str(p.commandId)] = {
        commandClass: str(p.commandClass),
        target: str(p.target),
        status: 'started',
      };
      break;
    case 'command_completed': {
      const c = run.commands[str(p.commandId)];
      if (c) {
        c.status = 'completed';
        c.exitCode = Number(p.exitCode);
      }
      break;
    }
    case 'command_failed': {
      const c = run.commands[str(p.commandId)];
      if (c) {
        c.status = 'failed';
        c.exitCode = Number(p.exitCode);
        c.failureClass = str(p.failureClass);
      }
      break;
    }
    case 'changes_staged':
      for (const path of p.paths as string[]) {
        const f = run.files[path];
        if (f && f.status === 'unstaged') f.status = 'staged';
      }
      break;
    case 'candidate_committed': {
      if (!run.lineage) run.lineage = newLineage(str(p.lineageId));
      const l = run.lineage;
      if (!l.currentSha) l.lineageId = str(p.lineageId);
      l.currentSha = str(p.headSha);
      l.parentSha = str(p.parentSha);
      l.baseSha = str(p.baseSha);
      l.pushed = false;
      l.remoteSha = undefined;
      l.shaHistory.push(str(p.headSha));
      for (const path of p.manifest as string[]) {
        const f = run.files[path];
        if (f && (f.status === 'staged' || f.status === 'deleted')) f.status = 'committed';
      }
      break;
    }
    case 'candidate_pushed':
      if (run.lineage && run.lineage.currentSha === p.headSha) {
        run.lineage.pushed = p.remoteSha === p.headSha;
        run.lineage.remoteSha = str(p.remoteSha);
        if (p.remoteSha !== p.headSha)
          run.lineage.mismatch = {
            kind: 'sha',
            localSha: str(p.headSha),
            remoteSha: str(p.remoteSha),
          };
      }
      break;
    case 'push_failed':
      if (run.lineage) run.lineage.pushed = false;
      break;
    case 'remote_artifact_mismatch':
      if (run.lineage) {
        run.lineage.mismatch = {
          kind: str(p.kind),
          localSha: str(p.localSha),
          ...(p.remoteSha ? { remoteSha: str(p.remoteSha) } : {}),
        };
        run.lineage.pushed = false;
      }
      break;
    case 'pr_opened':
      if (run.lineage)
        run.lineage.pr = {
          number: Number(p.number),
          headSha: str(p.headSha),
          draft: p.draft === true,
        };
      break;
    case 'handoff_prepared':
      run.handoffs[str(p.handoffId)] = {
        handoffId: str(p.handoffId),
        fromRole: str(p.fromRole),
        toRole: str(p.toRole),
        stage: str(p.stage),
        status: p.sealed === true ? 'prepared' : 'prepared_unsealed',
        missing: (p.missing as string[]) ?? [],
      };
      break;
    case 'handoff_started': {
      const h = run.handoffs[str(p.handoffId)];
      if (h && h.status === 'prepared') h.status = 'in_transit';
      break;
    }
    case 'handoff_received': {
      const h = run.handoffs[str(p.handoffId)];
      if (h) {
        h.status = 'received';
        h.receiptVerified = p.verified as { sha: boolean; manifest: boolean; identity: boolean };
      }
      break;
    }
    case 'verification_started':
      if (run.lineage) {
        run.lineage.verificationSignature = undefined;
        run.lineage.verificationSha = undefined;
        run.lineage.activeVerificationId = str(p.verificationId);
        run.lineage.activeVerificationSha = str(p.headSha);
        run.lineage.requiredCheckIds = [...(p.requiredChecks as string[])];
        addUnique(run.lineage.proverSessions, event.actor.sessionId);
        for (const id of p.requiredChecks as string[]) {
          run.lineage.checks[id] = {
            checkId: id,
            name: id,
            required: true,
            result: 'running',
            verificationId: str(p.verificationId),
          };
        }
      }
      break;
    case 'check_started':
    case 'check_passed':
    case 'check_failed':
    case 'check_skipped': {
      if (!run.lineage) break;
      const checkId = str(p.checkId);
      /** A check declared required by verification_started stays required whatever a later payload says. */
      const required = p.required === true || run.lineage.requiredCheckIds.includes(checkId);
      addUnique(run.lineage.proverSessions, event.actor.sessionId);
      const base = {
        checkId,
        name: str(p.name),
        required,
        verificationId: str(p.verificationId),
      };
      run.lineage.checks[checkId] =
        event.type === 'check_started'
          ? { ...base, result: 'running' }
          : event.type === 'check_passed'
            ? { ...base, result: 'passed', exitCode: Number(p.exitCode) }
            : event.type === 'check_failed'
              ? {
                  ...base,
                  result: 'failed',
                  exitCode: Number(p.exitCode),
                  ...(p.failedSurface ? { failedSurface: str(p.failedSurface) } : {}),
                }
              : { ...base, result: 'skipped', skipReason: str(p.reason) };
      break;
    }
    case 'verification_completed': {
      /** The signature is issued from recorded check results, never from the payload's own claim. */
      if (!run.lineage) break;
      addUnique(run.lineage.proverSessions, event.actor.sessionId);
      const v = derivedVerification(run.lineage);
      if (
        v.allRequiredPassed &&
        p.verificationId === v.verificationId &&
        p.headSha === run.lineage.currentSha &&
        run.lineage.activeVerificationSha === run.lineage.currentSha
      ) {
        run.lineage.verificationSignature = str(p.signature);
        run.lineage.verificationSha = str(p.headSha);
      }
      break;
    }
    case 'finding_raised':
      if (run.lineage)
        run.lineage.findings[str(p.findingId)] = {
          findingId: str(p.findingId),
          reportId: str(p.reportId),
          severity: str(p.severity),
          blocking: p.blocking === true,
          surface: str(p.surface),
          reproduced: p.reproduced === true,
          status: 'raised',
        };
      break;
    case 'review_passed':
    case 'review_blocked':
    case 'review_insufficient_evidence':
      if (run.lineage?.reviewSeal && run.lineage.reviewSeal.reportId === p.reportId) {
        run.lineage.reviewSeal.verdict = str(p.verdict);
        if (event.type === 'review_passed') {
          for (const id of p.findingIds as string[]) {
            const f = run.lineage.findings[id];
            if (f && !f.blocking) f.status = 'non_blocking_persisted';
          }
        }
      }
      break;
    case 'adjudication_completed':
      if (run.lineage) {
        run.lineage.adjudications[str(p.adjudicationId)] = {
          adjudicationId: str(p.adjudicationId),
          seq,
          repairContractId: typeof p.repairContractId === 'string' ? p.repairContractId : undefined,
          acceptedFindingIds: [...((p.acceptedFindingIds as string[]) ?? [])],
          rejectedFindingIds: [...((p.rejectedFindingIds as string[]) ?? [])],
          repairCycleCount: Number(p.repairCycleCount),
        };
        addUnique(run.lineage.reviewerSessions, event.actor.sessionId);
        for (const id of p.acceptedFindingIds as string[]) {
          const f = run.lineage.findings[id];
          if (f) f.status = 'accepted';
        }
        for (const id of p.rejectedFindingIds as string[]) {
          const f = run.lineage.findings[id];
          if (f) f.status = 'rejected_unsupported';
        }
      }
      break;
    case 'repair_started':
      if (run.lineage) addUnique(run.lineage.repairerSessions, str(p.sessionId));
      break;
    case 'repair_completed':
      if (run.lineage) {
        addUnique(run.lineage.repairerSessions, event.actor.sessionId);
        run.lineage.currentSha = str(p.newSha);
        if (run.lineage.shaHistory.at(-1) !== str(p.newSha))
          run.lineage.shaHistory.push(str(p.newSha));
        run.lineage.pushed = false;
        run.lineage.remoteSha = undefined;
        run.lineage.verificationSignature = undefined;
        run.lineage.verificationSha = undefined;
        if (run.lineage.reviewSeal) {
          run.lineage.reviewSeal.stale = true;
          run.lineage.priorSeals.push(run.lineage.reviewSeal);
          run.lineage.reviewSeal = undefined;
        }
        run.lineage.activeRepairContractId = undefined;
      }
      break;
    case 'candidate_changed_after_review':
      if (run.lineage) {
        run.lineage.currentSha = str(p.newSha);
        if (run.lineage.shaHistory.at(-1) !== str(p.newSha))
          run.lineage.shaHistory.push(str(p.newSha));
        run.lineage.pushed = false;
        run.lineage.remoteSha = undefined;
        run.lineage.verificationSignature = undefined;
        run.lineage.verificationSha = undefined;
        if (run.lineage.reviewSeal) {
          run.lineage.reviewSeal.stale = true;
          run.lineage.priorSeals.push(run.lineage.reviewSeal);
          run.lineage.reviewSeal = undefined;
        }
      }
      break;
    case 'owner_decision_required':
      run.ownerQuestions.push({
        questionId: str(p.questionId),
        question: str(p.question),
        recommendedDefault: str(p.recommendedDefault),
      });
      if (run.lineage)
        run.lineage.pendingOwnerQuestion = {
          questionId: str(p.questionId),
          question: str(p.question),
          recommendedDefault: str(p.recommendedDefault),
        };
      break;
    case 'owner_decision': {
      recordDecision(run, event, str(p.decisionId), str(p.kind));
      const q = run.ownerQuestions.find((x) => !x.answeredBy);
      if (q) q.answeredBy = str(p.decisionId);
      if (run.lineage) run.lineage.pendingOwnerQuestion = undefined;
      break;
    }
    default:
      break;
  }
}

/** Effects that happen only when the state machine accepted the transition. */
function applyOnTransition(
  run: RunState,
  lineage: LineageState,
  event: DomainEvent,
  from: CandidateState,
  to: CandidateState,
): void {
  const p = event.payload as P;
  switch (event.type) {
    case 'review_started':
      lineage.reviewSeal = {
        reportId: str(p.reportId),
        sha: str(p.reviewedSha),
        verdict: 'REVIEW_IN_PROGRESS',
        reviewerSession: str(p.reviewerSession),
        stale: false,
      };
      addUnique(lineage.reviewerSessions, str(p.reviewerSession));
      break;
    case 'repair_completed':
      for (const f of Object.values(lineage.findings))
        if (f.status === 'accepted') f.status = 'repaired';
      break;
    case 'repair_authorised':
      /** Counted from accepted transitions; the payload's count was only checked against this value. */
      lineage.repairCycles += 1;
      lineage.activeRepairContractId = str(p.repairContractId);
      lineage.quarantineReason = undefined;
      if (typeof p.ownerDecisionId === 'string')
        consumeDecision(run, p.ownerDecisionId, event.eventId);
      break;
    case 'owner_decision_required':
      /**
       * The resume target is the safe state derived from the state the machinery halted from, never the
       * halt state itself and never an eligibility state (K-01). A halt during an authorised repair
       * withdraws the repair authority; the cycle stays counted.
       */
      if (from !== 'OWNER_DECISION_REQUIRED') {
        lineage.resumeState = safeResumeStateFor(from, lineage);
        if (from === 'REPAIR_AUTHORISED' && lineage.activeRepairContractId) {
          lineage.withdrawnRepairContractIds.push(lineage.activeRepairContractId);
          lineage.activeRepairContractId = undefined;
        }
      }
      break;
    case 'candidate_quarantined':
      lineage.quarantineReason = str(p.reason);
      break;
    case 'merged_by_owner':
      lineage.mergeSha = str(p.mergeSha);
      consumeDecision(run, p.decisionId, event.eventId);
      break;
    case 'deployment_started':
      lineage.deployment = 'STARTED';
      lineage.deploymentId = str(p.deploymentId);
      break;
    case 'deployment_failed':
      lineage.deployment = 'FAILED';
      break;
    case 'deployed':
      lineage.deployment = 'SUCCEEDED';
      break;
    default:
      break;
  }
  if (to !== 'OWNER_DECISION_REQUIRED' && event.type === 'owner_decision')
    lineage.resumeState = undefined;
}

export interface ApplyResult {
  run: RunState;
  accepted: boolean;
  transitioned: boolean;
  reason?: string;
}

/** Pure fold step. Mutates a structured clone of the input; never the input. */
export function applyEvent(input: RunState, event: DomainEvent): ApplyResult {
  const run = structuredClone(input);
  if (event.seq <= run.lastSeq)
    return reject(run, event, 'order', `out-of-order seq ${event.seq} after ${run.lastSeq}`);
  run.lastSeq = event.seq;
  run.events += 1;
  run.lastEventType = event.type;

  if (event.authority === 'knowledge') {
    return { run, accepted: true, transitioned: false };
  }

  /** Authority and consistency come first: a rejected event leaves no trace except its rejection. */
  const rejection = validateEvent(run, event);
  if (rejection) return reject(run, event, rejection.kind, rejection.reason);

  applyAuxiliary(run, event);

  if (!lineageEventTypes.has(event.type)) return { run, accepted: true, transitioned: false };

  const lineage = run.lineage;
  if (!lineage) {
    if (softLineageEvents.has(event.type)) return { run, accepted: true, transitioned: false };
    return reject(run, event, 'transition', 'no candidate lineage exists yet');
  }

  /**
   * A merge or deployment that happened cannot be suspended: in a terminal state the owner question
   * is recorded as a fact (applyAuxiliary) and the lineage stays where it is, so that no later
   * `owner_decision` needs a terminal state as its resume target. Reducer policy; see
   * docs/architecture/ENFORCEMENT_BOUNDARIES.md.
   */
  if (event.type === 'owner_decision_required' && terminalStates.has(lineage.state))
    return { run, accepted: true, transitioned: false };

  const options = candidateTransitions(lineage.state, event.type);
  const payload = event.payload as P;
  const match = options.find((t) => evaluateGuard(t.guard, { run, lineage, event, payload }));
  if (!match) {
    /** A fact outside the machine's interest in this state is a no-op; a failed guard is recorded. */
    if (options.length === 0 && softLineageEvents.has(event.type))
      return { run, accepted: true, transitioned: false };
    if (options.length > 0 && guardSoftEvents.has(event.type))
      return { run, accepted: true, transitioned: false };
    const reason =
      options.length === 0
        ? `event ${event.type} not allowed in state ${lineage.state}`
        : `guard failed for ${event.type} in ${lineage.state}: ${options.map((o) => o.guard).join('|')}`;
    return reject(run, event, 'transition', reason);
  }

  let to: CandidateState;
  if (match.to === '$resumesTo') {
    /** Protected-state restrictions on the resume target were checked in validateEvent before any effect. */
    const resumesTo = (payload.resumesTo as CandidateState | undefined) ?? lineage.resumeState;
    if (!resumesTo)
      return reject(
        run,
        event,
        'transition',
        'owner_decision without resumesTo and no resume state',
      );
    to = resumesTo;
  } else {
    to = match.to;
  }
  const from = lineage.state;
  lineage.previousState = from;
  lineage.state = to;
  applyOnTransition(run, lineage, event, from, to);
  if (from !== to)
    run.transitions.push({
      seq: event.seq,
      eventId: event.eventId,
      type: event.type,
      from,
      to,
      ...(match.guard ? { guard: match.guard } : {}),
    });
  return { run, accepted: true, transitioned: from !== to };
}
