import type { DomainEvent } from '@virgil/agent-contracts';
import matrix from '../../../constitution/permission-matrix.json' with { type: 'json' };
import {
  derivedVerification,
  mergeGatesPass,
  protectedStateInvariantHolds,
  protectedStates,
  taintedForReview,
} from './guards.js';
import type { CandidateState, InvalidEventKind, LineageState, RunState } from './state.js';
import { authorityConfig } from './transitions.js';

export interface EventRejection {
  kind: Exclude<InvalidEventKind, 'transition' | 'order'>;
  reason: string;
}

type P = Record<string, unknown>;
const authority = (reason: string): EventRejection => ({ kind: 'authority', reason });
const consistency = (reason: string): EventRejection => ({ kind: 'consistency', reason });

const tierOrder = Object.keys(authorityConfig.tiers);
const roleById = new Map(matrix.roles.map((r) => [r.id, r]));
const reviewerRoles = new Set(matrix.roles.filter((r) => r.stage === 'review').map((r) => r.id));
/** Only the owner and Virgil may issue or revoke grants (AUTHORITY_TIERS.md, THREAT_MODEL T8). */
const grantIssuers = new Set(['owner', 'virgil']);
/** Protected boundaries expressed as repository paths; mechanism names are not paths. */
const protectedPathBoundaries = authorityConfig.protectedBoundaries.filter((b) => b.includes('/'));
/** Events that record a decision id rather than cite one. */
const decisionRecordingEvents = new Set(['owner_decision', 'scope_approved']);

const literalPrefix = (pattern: string): string => pattern.split('*')[0] ?? '';

/** True when a permitted-path pattern could reach a protected boundary. */
export function patternReachesProtectedBoundary(pattern: string): string | undefined {
  const prefix = literalPrefix(pattern);
  return protectedPathBoundaries.find((b) => {
    const bp = literalPrefix(b);
    return prefix.startsWith(bp) || bp.startsWith(prefix);
  });
}

function sessionOf(event: DomainEvent): string | undefined {
  return event.actor.sessionId;
}

function grantActiveFor(
  run: RunState,
  grantId: unknown,
  roleId: string,
  occurredAt: string,
): string | undefined {
  if (typeof grantId !== 'string') return 'no authority grant referenced';
  const g = run.grants[grantId];
  if (!g) return `grant ${grantId} is not recorded`;
  if (g.revoked) return `grant ${grantId} is revoked`;
  if (g.roleId !== roleId) return `grant ${grantId} was issued to role ${g.roleId}, not ${roleId}`;
  if (Date.parse(g.expiresAt) <= Date.parse(occurredAt)) return `grant ${grantId} has expired`;
  return undefined;
}

function registeredAs(run: RunState, sessionId: unknown, roleId: string): boolean {
  return typeof sessionId === 'string' && run.agents[sessionId]?.roleId === roleId;
}

/** Verification facts may only be recorded by a registered Prover session or the system, never by a builder or repairer. */
function verifierProblem(
  run: RunState,
  lineage: LineageState,
  event: DomainEvent,
): string | undefined {
  const a = event.actor;
  if (a.kind === 'system') return undefined;
  const s = sessionOf(event);
  if (a.kind !== 'agent' || !s)
    return `verification facts require a Prover session or the system, got ${a.kind}`;
  if (lineage.builderSessions.includes(s) || lineage.repairerSessions.includes(s))
    return `session ${s} built or repaired this candidate and cannot verify it`;
  if (!registeredAs(run, s, 'prover')) return `session ${s} is not a registered Prover session`;
  return undefined;
}

function citedDecisionsRecorded(run: RunState, event: DomainEvent): EventRejection | undefined {
  const own = decisionRecordingEvents.has(event.type)
    ? String((event.payload as P).decisionId ?? '')
    : undefined;
  for (const ref of event.evidence) {
    if (ref.kind !== 'owner_decision') continue;
    if (ref.ref === own) continue;
    if (!run.decisions[ref.ref])
      return authority(`cited owner decision ${ref.ref} is not recorded in this run`);
  }
  return undefined;
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  const sa = new Set(a);
  return sa.size === new Set(b).size && b.every((x) => sa.has(x));
}

/**
 * Event-level validity, independent of the transition table. A rejected event applies no effect:
 * no auxiliary fact, no transition. Facts can only enter the read model through valid events.
 */
export function validateEvent(run: RunState, event: DomainEvent): EventRejection | undefined {
  if (event.authority !== 'operational') return undefined;
  const cited = citedDecisionsRecorded(run, event);
  if (cited) return cited;
  const p = event.payload as P;
  const a = event.actor;
  const s = sessionOf(event);
  const lineage = run.lineage;

  switch (event.type) {
    case 'scope_approved':
    case 'owner_decision': {
      if (a.kind !== 'owner')
        return authority(`${event.type} requires an owner actor, got ${a.kind}`);
      const id = p.decisionId;
      if (typeof id !== 'string' || !id) return consistency(`${event.type} without a decision id`);
      if (run.decisions[id]) return consistency(`owner decision ${id} is already recorded`);
      if (
        event.type === 'owner_decision' &&
        !event.evidence.some((e) => e.kind === 'owner_decision' && e.ref === id)
      )
        return authority(`owner_decision ${id} must cite its recorded decision as evidence`);
      if (event.type === 'owner_decision' && lineage?.state === 'OWNER_DECISION_REQUIRED') {
        /**
         * The wildcard resume never manufactures eligibility or authority: a protected state can only
         * be resumed into when it is the recorded pre-halt state and its invariant still holds.
         */
        const recorded = lineage.resumeState;
        const target = (p.resumesTo as CandidateState | undefined) ?? recorded;
        if (target && protectedStates.has(target)) {
          if (target !== recorded)
            return authority(
              `owner_decision cannot resume into protected state ${target} (halted from ${recorded ?? 'none'})`,
            );
          if (!protectedStateInvariantHolds(lineage, target))
            return consistency(
              `owner_decision cannot resume into ${target}: its invariant no longer holds`,
            );
        }
      }
      return undefined;
    }
    case 'authority_granted': {
      if (!grantIssuers.has(a.kind))
        return authority(`only the owner or Virgil may grant authority, got ${a.kind}`);
      const grantId = String(p.grantId);
      if (run.grants[grantId]) return consistency(`grant ${grantId} is already recorded`);
      const role = roleById.get(String(p.roleId));
      if (!role) return authority(`unknown role ${String(p.roleId)}`);
      const tier = String(p.tier);
      const rank = tierOrder.indexOf(tier);
      if (rank < 0) return authority(`unknown authority tier ${tier}`);
      if (rank > tierOrder.indexOf(role.maxTier))
        return authority(`tier ${tier} exceeds ${role.id} maxTier ${role.maxTier}`);
      if (tier === 'TIER_3' && a.kind !== 'owner')
        return authority('a TIER_3 grant is an owner-only action');
      if (a.kind === 'virgil' && tier !== 'TIER_1' && !run.stage.scopeApproved)
        return authority('Virgil may grant beyond TIER_1 only after scope_approved by the owner');
      if (a.kind !== 'owner')
        for (const path of (p.permittedPaths as string[]) ?? []) {
          const boundary = patternReachesProtectedBoundary(path);
          if (boundary)
            return authority(`permitted path ${path} reaches protected boundary ${boundary}`);
        }
      return undefined;
    }
    case 'authority_revoked':
      if (!grantIssuers.has(a.kind))
        return authority(`only the owner or Virgil may revoke authority, got ${a.kind}`);
      if (!run.grants[String(p.grantId)])
        return consistency(`grant ${String(p.grantId)} is not recorded`);
      return undefined;
    case 'agent_started': {
      const sessionId = String(p.sessionId);
      const roleId = String(p.roleId);
      if (a.kind !== 'agent' && a.kind !== 'virgil')
        return authority(`agent_started requires an agent actor, got ${a.kind}`);
      if (s !== sessionId) return authority(`actor session ${s ?? 'none'} is not ${sessionId}`);
      if (a.roleId !== roleId)
        return authority(`actor role ${a.roleId ?? 'none'} is not ${roleId}`);
      const existing = run.agents[sessionId];
      if (existing && existing.roleId !== roleId)
        return authority(`session ${sessionId} already acts as ${existing.roleId}`);
      const problem = grantActiveFor(run, p.grantId, roleId, event.occurredAt);
      return problem ? authority(problem) : undefined;
    }
    case 'agent_result_received':
      if (s !== undefined && s !== String(p.sessionId))
        return authority(`actor session ${s} reports for ${String(p.sessionId)}`);
      return undefined;
    case 'candidate_committed': {
      if (!lineage || !lineage.currentSha) return undefined;
      if (p.lineageId !== lineage.lineageId)
        return consistency(
          `commit for lineage ${String(p.lineageId)} in lineage ${lineage.lineageId}`,
        );
      if (p.parentSha !== lineage.currentSha)
        return consistency('commit parent is not the current candidate head');
      return undefined;
    }
    case 'verification_started': {
      if (!lineage) return consistency('no candidate lineage to verify');
      const vp = verifierProblem(run, lineage, event);
      if (vp) return authority(vp);
      if (p.headSha !== lineage.currentSha)
        return consistency('verification_started names a SHA that is not the current candidate');
      const id = String(p.verificationId);
      if (
        lineage.activeVerificationId === id ||
        Object.values(lineage.checks).some((c) => c.verificationId === id)
      )
        return consistency(`verification ${id} was already recorded`);
      return undefined;
    }
    case 'check_started':
    case 'check_passed':
    case 'check_failed':
    case 'check_skipped': {
      if (!lineage) return consistency('no candidate lineage');
      const vp = verifierProblem(run, lineage, event);
      if (vp) return authority(vp);
      if (p.verificationId !== lineage.activeVerificationId)
        return consistency(
          `check for verification ${String(p.verificationId)} outside the active verification`,
        );
      const checkId = String(p.checkId);
      if (lineage.requiredCheckIds.includes(checkId) && p.required !== true)
        return consistency(
          `check ${checkId} was declared required and cannot be re-declared optional`,
        );
      if (event.type === 'check_passed' && p.exitCode !== 0)
        return consistency(`check ${checkId} passed with non-zero exit code`);
      if (event.type === 'check_failed' && p.exitCode === 0)
        return consistency(`check ${checkId} failed with exit code 0`);
      return undefined;
    }
    case 'verification_completed': {
      if (!lineage) return consistency('no candidate lineage');
      const vp = verifierProblem(run, lineage, event);
      if (vp) return authority(vp);
      if (p.verificationId !== lineage.activeVerificationId)
        return consistency('verification_completed for a verification that is not active');
      if (p.headSha !== lineage.activeVerificationSha || p.headSha !== lineage.currentSha)
        return consistency(
          'verification_completed names a SHA other than the verified current candidate',
        );
      const v = derivedVerification(lineage);
      const derivedCompleted = v.requiredIds.length > 0 && v.missing.length === 0;
      if (p.allRequiredCompleted !== derivedCompleted)
        return consistency(
          `allRequiredCompleted=${String(p.allRequiredCompleted)} contradicts recorded checks (${
            derivedCompleted ? 'complete' : `missing ${v.missing.join(', ') || 'declaration'}`
          })`,
        );
      if (p.anyRequiredFailed !== v.anyRequiredFailed)
        return consistency(
          `anyRequiredFailed=${String(p.anyRequiredFailed)} contradicts recorded checks`,
        );
      for (const [id, result] of Object.entries((p.results as Record<string, string>) ?? {})) {
        const c = lineage.checks[id];
        if (!c || c.verificationId !== lineage.activeVerificationId || c.result !== result)
          return consistency(`results[${id}]=${result} contradicts the recorded check`);
      }
      return undefined;
    }
    case 'review_started': {
      if (!lineage) return consistency('no candidate lineage');
      const role = String(p.reviewerRole);
      if (a.kind !== 'agent') return authority(`review requires an agent actor, got ${a.kind}`);
      if (s !== String(p.reviewerSession))
        return authority(
          `actor session ${s ?? 'none'} is not reviewerSession ${String(p.reviewerSession)}`,
        );
      if (a.roleId !== role)
        return authority(`actor role ${a.roleId ?? 'none'} is not reviewerRole ${role}`);
      if (!reviewerRoles.has(role)) return authority(`${role} is not a reviewer role`);
      if (!registeredAs(run, s, role))
        return authority(`session ${s} is not registered as ${role} under a grant`);
      return undefined;
    }
    case 'finding_raised': {
      if (!lineage) return consistency('no candidate lineage');
      if (a.kind !== 'agent' || !s) return authority('findings require an agent session');
      if (lineage.builderSessions.includes(s) || lineage.repairerSessions.includes(s))
        return authority(`builder session ${s} cannot raise review findings`);
      if (lineage.findings[String(p.findingId)])
        return consistency(
          `finding ${String(p.findingId)} already exists; identities are never reused`,
        );
      return undefined;
    }
    case 'review_passed':
    case 'review_blocked':
    case 'review_insufficient_evidence': {
      if (!lineage) return consistency('no candidate lineage');
      const seal = lineage.reviewSeal;
      if (!seal || seal.reportId !== p.reportId)
        return consistency(`no open review report ${String(p.reportId)} on this candidate`);
      if (s !== seal.reviewerSession)
        return authority(
          `verdict from session ${s ?? 'none'} on a review owned by ${seal.reviewerSession}`,
        );
      if (p.reviewedSha !== seal.sha)
        return consistency('verdict names a SHA other than the reviewed SHA');
      const verdict = String(p.verdict);
      const allowed =
        event.type === 'review_passed'
          ? ['PASS', 'PASS_WITH_NON_BLOCKING_FINDINGS']
          : event.type === 'review_blocked'
            ? ['BLOCKED']
            : ['INSUFFICIENT_EVIDENCE'];
      if (!allowed.includes(verdict))
        return consistency(`${event.type} cannot carry verdict ${verdict}`);
      const ids = (p.findingIds as string[]) ?? [];
      for (const id of ids)
        if (lineage.findings[id]?.reportId !== seal.reportId)
          return consistency(`finding ${id} does not belong to report ${seal.reportId}`);
      if (event.type === 'review_passed') {
        const blocking = Object.values(lineage.findings).filter(
          (f) => f.reportId === seal.reportId && f.blocking && f.status !== 'rejected_unsupported',
        );
        if (blocking.length > 0)
          return consistency(
            `passing verdict with blocking findings ${blocking.map((f) => f.findingId).join(', ')}`,
          );
      }
      return undefined;
    }
    case 'candidate_quarantined':
      if (!lineage) return consistency('no candidate lineage');
      if (p.headSha !== lineage.currentSha)
        return consistency('quarantine names a SHA that is not current');
      return undefined;
    case 'adjudication_completed': {
      if (!lineage) return consistency('no candidate lineage');
      if (a.kind !== 'agent' || a.roleId !== 'arbiter' || !registeredAs(run, s, 'arbiter'))
        return authority('adjudication requires a registered Arbiter session');
      if (taintedForReview(lineage).has(String(s)))
        return authority(`session ${s} worked on this candidate and cannot adjudicate it`);
      const id = String(p.adjudicationId);
      if (lineage.adjudications[id]) return consistency(`adjudication ${id} already recorded`);
      const accepted = (p.acceptedFindingIds as string[]) ?? [];
      const rejected = (p.rejectedFindingIds as string[]) ?? [];
      for (const f of [...accepted, ...rejected])
        if (!lineage.findings[f]) return consistency(`adjudicated finding ${f} is not recorded`);
      if (accepted.some((f) => rejected.includes(f)))
        return consistency('a finding cannot be both accepted and rejected');
      if (p.repairCycleCount !== lineage.repairCycles + 1)
        return consistency(
          `adjudication names repair cycle ${String(p.repairCycleCount)}; the next cycle is ${lineage.repairCycles + 1}`,
        );
      return undefined;
    }
    case 'repair_authorised': {
      if (!lineage) return consistency('no candidate lineage');
      if (!grantIssuers.has(a.kind))
        return authority(`only the owner or Virgil may authorise a repair, got ${a.kind}`);
      if (p.lineageId !== lineage.lineageId)
        return consistency('repair contract names another lineage');
      if (p.reviewedSha !== lineage.currentSha)
        return consistency('repair contract names a SHA that is not the current candidate');
      const adj = Object.values(lineage.adjudications).find(
        (x) => x.repairContractId === p.repairContractId,
      );
      if (!adj)
        return authority(
          `no recorded adjudication defines repair contract ${String(p.repairContractId)}`,
        );
      if (!sameSet(adj.acceptedFindingIds, (p.acceptedFindingIds as string[]) ?? []))
        return consistency('repair contract findings differ from the adjudicated findings');
      if (adj.repairCycleCount !== p.repairCycleCount)
        return consistency('repair contract cycle differs from the adjudicated cycle');
      return undefined;
    }
    case 'repair_started': {
      if (!lineage) return consistency('no candidate lineage');
      if (p.repairContractId !== lineage.activeRepairContractId)
        return authority(
          `repair contract ${String(p.repairContractId)} is not the authorised contract`,
        );
      if (a.kind !== 'agent' || s !== String(p.sessionId) || a.roleId !== 'fabricator')
        return authority('repair_started requires the Fabricator session it names');
      const problem = grantActiveFor(run, event.authorityGrantId, 'fabricator', event.occurredAt);
      return problem ? authority(problem) : undefined;
    }
    case 'repair_completed': {
      if (!lineage) return consistency('no candidate lineage');
      if (p.repairContractId !== lineage.activeRepairContractId)
        return authority(
          `repair contract ${String(p.repairContractId)} is not the authorised contract`,
        );
      if (p.lineageId !== lineage.lineageId) return consistency('repair names another lineage');
      if (a.kind !== 'agent' || a.roleId !== 'fabricator' || !s)
        return authority('repair_completed requires a Fabricator session');
      if (!lineage.repairerSessions.includes(s)) {
        const problem = grantActiveFor(run, event.authorityGrantId, 'fabricator', event.occurredAt);
        if (problem) return authority(problem);
      }
      return undefined;
    }
    case 'safe_to_merge':
      if (!lineage) return consistency('no candidate lineage');
      if (a.kind !== 'system' && a.kind !== 'virgil')
        return authority(
          `safe_to_merge is a gate decision recorded by the system or Virgil, got ${a.kind}`,
        );
      if (p.lineageId !== lineage.lineageId)
        return consistency('gate decision names another lineage');
      if (p.headSha !== lineage.currentSha)
        return consistency('gate decision names a SHA that is not current');
      return undefined;
    case 'merged_by_owner': {
      if (!lineage) return consistency('no candidate lineage');
      if (p.lineageId !== lineage.lineageId) return consistency('merge names another lineage');
      if (p.headSha !== lineage.currentSha)
        return consistency('merge names a SHA that is not the current candidate');
      if (!mergeGatesPass(lineage, String(p.headSha)))
        return consistency(
          'merge gates do not pass for this SHA (verification, review seal or findings)',
        );
      return undefined;
    }
    case 'deployment_started':
      if (!lineage) return consistency('no candidate lineage');
      if (p.mergeSha !== lineage.mergeSha)
        return consistency('deployment names a SHA that was not merged');
      return undefined;
    case 'deployment_failed':
    case 'deployed':
      if (!lineage) return consistency('no candidate lineage');
      if (p.deploymentId !== lineage.deploymentId || lineage.deployment !== 'STARTED')
        return consistency(`no started deployment ${String(p.deploymentId)}`);
      if (event.type === 'deployed' && p.mergeSha !== lineage.mergeSha)
        return consistency('deployed names a SHA that was not merged');
      return undefined;
    default:
      return undefined;
  }
}
