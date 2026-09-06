import type { DomainEvent } from '@virgil/agent-contracts';
import {
  at,
  blockedThenRepairedRun,
  HEAD_SHA,
  HEAD_SHA_2,
  MERGE_SHA,
  passingRun,
  repairLimitRun,
} from '@virgil/test-fixtures';
import { describe, expect, it } from 'vitest';
import {
  candidateStates,
  guardedResumeStates,
  initialRunState,
  newLineage,
  patternReachesProtectedBoundary,
  privilegedResumeStates,
  type RunState,
  replay,
  resumeTargetAllowlist,
  validateEvent,
} from '../src/index.js';

/**
 * Consolidation regressions for the owner's binding repair requirements beyond the first repair:
 * K-01 resume targets are restricted to the recorded safe resume state or an explicit allowlist and
 * never a privileged or terminal state; repair cycles survive replayed owner decisions; K-03 repair
 * authorisation needs a recorded owner decision; repository paths are normalised so traversal cannot
 * escape an authorised pattern.
 */

type Actor = DomainEvent['actor'];
type Ev = { kind: DomainEvent['evidence'][number]['kind']; ref: string };
const owner: Actor = { kind: 'owner', displayName: 'Owner' };
const virgil: Actor = { kind: 'virgil', roleId: 'virgil', sessionId: 'sess-virgil' };
const fab: Actor = { kind: 'agent', roleId: 'fabricator', sessionId: 'sess-fab-1' };
const fab2: Actor = { kind: 'agent', roleId: 'fabricator', sessionId: 'sess-fab-2' };
const system: Actor = { kind: 'system' };
const ev = (kind: Ev['kind'], ref: string): Ev => ({ kind, ref });

function prefixThrough(base: DomainEvent[], type: string, occurrence = 0): DomainEvent[] {
  let seen = -1;
  const idx = base.findIndex((e) => e.type === type && ++seen === occurrence);
  if (idx < 0) throw new Error(`no ${type}`);
  return base.slice(0, idx + 1);
}

class Tail {
  readonly events: DomainEvent[];
  private seq: number;
  constructor(prefix: DomainEvent[]) {
    this.events = [...prefix];
    this.seq = prefix.length;
  }
  add(
    type: string,
    actor: Actor,
    payload: Record<string, unknown>,
    evidence: Ev[] = [],
    grant?: string,
  ): this {
    const seq = this.seq++;
    this.events.push({
      eventId: `con-e${String(seq).padStart(3, '0')}`,
      seq,
      streamId: 'con',
      authority: 'operational',
      type,
      occurredAt: at(seq),
      recordedAt: at(seq),
      actor,
      evidence,
      durability: 'durable_audit',
      payload,
      ...(grant ? { authorityGrantId: grant } : {}),
    } as unknown as DomainEvent);
    return this;
  }
}

const rejected = (run: RunState, type: string) =>
  run.invalidTransitions.filter((x) => x.type === type);
const lastOf = (run: RunState, type: string) => rejected(run, type).at(-1);
const question = {
  questionId: 'Q-c',
  question: 'Continue?',
  consequence: 'none',
  recommendedDefault: 'continue',
};
const decide = (t: Tail, id: string, extra: Record<string, unknown> = {}) =>
  t.add('owner_decision', owner, { decisionId: id, kind: 'continue', ...extra }, [
    ev('owner_decision', id),
  ]);

describe('K-01: resume targets are the recorded safe state or the explicit allowlist', () => {
  it('partitions every candidate state into privileged, guarded or allowlisted', () => {
    const all = new Set([
      ...privilegedResumeStates,
      ...guardedResumeStates,
      ...resumeTargetAllowlist,
    ]);
    expect([...all].sort()).toEqual([...candidateStates].sort());
    expect([...privilegedResumeStates].some((s) => resumeTargetAllowlist.has(s))).toBe(false);
    expect([...guardedResumeStates].some((s) => resumeTargetAllowlist.has(s))).toBe(false);
  });
  it('a halt from SAFE_TO_MERGE records the review state; eligibility must be re-earned by the gate', () => {
    const base = prefixThrough(passingRun(), 'safe_to_merge');
    const halted = new Tail(base).add('owner_decision_required', virgil, question);
    const h = replay('con', halted.events);
    expect(h.lineage?.state).toBe('OWNER_DECISION_REQUIRED');
    expect(h.lineage?.resumeState).toBe('PASS_WITH_NON_BLOCKING_FINDINGS');
    // Even naming the pre-halt state explicitly cannot resume into SAFE_TO_MERGE.
    const byDecree = replay(
      'con',
      decide(new Tail(halted.events), 'OD-0010', { resumesTo: 'SAFE_TO_MERGE' }).events,
    );
    expect(byDecree.lineage?.state).toBe('OWNER_DECISION_REQUIRED');
    expect(lastOf(byDecree, 'owner_decision')?.kind).toBe('authority');
    expect(byDecree.decisions['OD-0010']).toBeUndefined();
    // Resuming without a target lands in the review state, and the gate decision re-earns eligibility.
    const resumed = decide(new Tail(halted.events), 'OD-0010').add('safe_to_merge', system, {
      lineageId: 'LIN-1',
      headSha: HEAD_SHA,
      gateReportId: 'GR-2',
    });
    const r = replay('con', resumed.events);
    expect(r.transitions.slice(-2).map((t) => t.to)).toEqual([
      'PASS_WITH_NON_BLOCKING_FINDINGS',
      'SAFE_TO_MERGE',
    ]);
    expect(rejected(r, 'owner_decision')).toEqual([]);
  });
  it('a halt during an authorised repair withdraws the contract and keeps the cycle counted', () => {
    const base = prefixThrough(blockedThenRepairedRun(), 'repair_started');
    const halted = new Tail(base).add('owner_decision_required', virgil, question);
    const h = replay('con', halted.events);
    expect(h.lineage?.resumeState).toBe('QUARANTINED');
    expect(h.lineage?.activeRepairContractId).toBeUndefined();
    expect(h.lineage?.withdrawnRepairContractIds).toEqual(['RC-1']);
    expect(h.lineage?.repairCycles).toBe(1);
    const resumed = decide(new Tail(halted.events), 'OD-0011');
    const r = replay('con', resumed.events);
    expect(r.lineage?.state).toBe('QUARANTINED');
    // The withdrawn contract cannot complete, and the resume cannot re-enter REPAIR_AUTHORISED.
    const completed = new Tail(resumed.events).add(
      'repair_completed',
      fab2,
      { repairContractId: 'RC-1', lineageId: 'LIN-1', previousSha: HEAD_SHA, newSha: HEAD_SHA_2 },
      [],
      'G-fab-2',
    );
    const c = replay('con', completed.events);
    expect(lastOf(c, 'repair_completed')?.kind).toBe('authority');
    expect(c.lineage?.currentSha).toBe(HEAD_SHA);
    const decree = decide(new Tail(halted.events), 'OD-0012', { resumesTo: 'REPAIR_AUTHORISED' });
    expect(lastOf(replay('con', decree.events), 'owner_decision')?.kind).toBe('authority');
  });
  it('a halt in a terminal state records the question and cannot suspend the merge', () => {
    const base = prefixThrough(passingRun(), 'merged_by_owner');
    const t = new Tail(base).add('owner_decision_required', virgil, question);
    const s = replay('con', t.events);
    expect(s.lineage?.state).toBe('MERGED');
    expect(s.lineage?.pendingOwnerQuestion?.questionId).toBe('Q-c');
    expect(s.invalidTransitions).toEqual([]);
    const answered = decide(new Tail(t.events), 'OD-0013');
    const a = replay('con', answered.events);
    expect(a.lineage?.state).toBe('MERGED');
    expect(a.lineage?.pendingOwnerQuestion).toBeUndefined();
    expect(a.ownerQuestions.find((q) => q.questionId === 'Q-c')?.answeredBy).toBe('OD-0013');
    // Deployment still needs its own owner decision; the halt granted nothing.
    const deployed = new Tail(answered.events).add('deployment_started', owner, {
      deploymentId: 'DEP-x',
      mergeSha: MERGE_SHA,
      target: 'staging',
      decisionId: 'OD-0013',
    });
    expect(replay('con', deployed.events).lineage?.deployment).toBe('NOT_STARTED');
  });
  it('an explicit allowlisted target is accepted; guarded and halt states are not', () => {
    const halted = prefixThrough(repairLimitRun(), 'owner_decision_required');
    const ok = decide(new Tail(halted), 'OD-0014', { resumesTo: 'QUARANTINED' });
    expect(replay('con', ok.events).lineage?.state).toBe('QUARANTINED');
    for (const target of ['READY_FOR_REVIEW', 'OWNER_DECISION_REQUIRED', 'DEPLOYED']) {
      const bad = decide(new Tail(halted), 'OD-0015', { resumesTo: target });
      const s = replay('con', bad.events);
      expect(s.lineage?.state).toBe('OWNER_DECISION_REQUIRED');
      expect(lastOf(s, 'owner_decision')?.reason).toContain(target);
    }
  });
  it('a replayed owner decision does not reset or extend the repair cycles', () => {
    const full = repairLimitRun();
    const s = replay('con', full);
    expect(s.lineage?.repairCycles).toBe(2);
    const replayedDecision = full.find(
      (e) =>
        e.type === 'owner_decision' &&
        (e.payload as { decisionId: string }).decisionId === 'OD-0005',
    ) as DomainEvent;
    const t = new Tail(full).add('owner_decision_required', virgil, question);
    t.events.push({
      ...replayedDecision,
      eventId: 'con-replay',
      seq: t.events.length,
    } as DomainEvent);
    const r = replay('con', t.events);
    expect(r.invalidTransitions.at(-1)).toMatchObject({
      type: 'owner_decision',
      kind: 'consistency',
    });
    expect(r.lineage?.state).toBe('OWNER_DECISION_REQUIRED');
    expect(r.lineage?.repairCycles).toBe(2);
    expect(r.decisions['OD-0005']?.consumedBy).toHaveLength(1);
  });
});

describe('K-03: repair authorisation requires a recorded owner decision', () => {
  const contract = {
    repairContractId: 'RC-1',
    lineageId: 'LIN-1',
    reviewedSha: HEAD_SHA,
    acceptedFindingIds: ['F-2'],
    permittedFiles: ['apps/mission-control/src/world/Capsule.tsx'],
    repairCycleCount: 1,
  };
  const event = (payload: Record<string, unknown>, actor: Actor = virgil) =>
    ({
      eventId: 'x',
      seq: 1,
      streamId: 'con',
      authority: 'operational',
      type: 'repair_authorised',
      occurredAt: at(1),
      recordedAt: at(1),
      actor,
      evidence: [],
      durability: 'durable_audit',
      payload,
    }) as unknown as DomainEvent;
  function runWith(decisions: RunState['decisions']): RunState {
    const run = initialRunState('con');
    run.lineage = { ...newLineage('LIN-1'), currentSha: HEAD_SHA, state: 'BLOCKED' };
    run.decisions = decisions;
    run.lineage.adjudications['ADJ-1'] = {
      adjudicationId: 'ADJ-1',
      seq: 0,
      repairContractId: 'RC-1',
      acceptedFindingIds: ['F-2'],
      rejectedFindingIds: [],
      repairCycleCount: 1,
    };
    return run;
  }
  const scope = {
    'OD-0002': {
      decisionId: 'OD-0002',
      kind: 'scope_approved',
      seq: 0,
      eventId: 'e',
      consumedBy: [],
    },
  };
  it('rejects a repair contract when no owner scope decision is recorded', () => {
    expect(validateEvent(runWith({}), event(contract))).toMatchObject({
      kind: 'authority',
      reason: expect.stringContaining('owner scope decision'),
    });
    expect(validateEvent(runWith(scope), event(contract))).toBeUndefined();
  });
  it('rejects a repair contract whose permitted files traverse or reach a protected boundary', () => {
    for (const bad of [
      'apps/mission-control/../../constitution/authority.json',
      '/etc/passwd',
      'apps/%2e%2e/constitution/**',
      'constitution/**',
    ]) {
      const r = validateEvent(runWith(scope), event({ ...contract, permittedFiles: [bad] }));
      expect(r?.kind, bad).toBe('authority');
    }
  });
});

describe('repository paths are normalised; traversal cannot escape an authorised pattern', () => {
  it('rejects grants whose permitted paths cannot be normalised or reach a protected boundary', () => {
    const base = prefixThrough(passingRun(), 'scope_approved');
    const cases: Array<[string, string]> = [
      ['apps/mission-control/../../constitution/**', 'parent traversal'],
      ['apps/mission-control/%2e%2e/**', 'percent-encoded'],
      ['/apps/**', 'absolute'],
      ['apps\\mission-control\\**', 'backslash'],
      ['C:/apps/**', 'drive-letter'],
      ['apps/mission-control/src/**/../../../constitution/authority.json', 'parent traversal'],
    ];
    for (const [path, reason] of cases) {
      const t = new Tail(base).add('authority_granted', virgil, {
        grantId: 'G-bad',
        roleId: 'fabricator',
        tier: 'TIER_2',
        permittedPaths: [path],
        expiresAt: at(600),
      });
      const s = replay('con', t.events);
      expect(s.grants['G-bad'], path).toBeUndefined();
      expect(lastOf(s, 'authority_granted')?.reason, path).toContain(reason);
    }
    expect(patternReachesProtectedBoundary('apps/../constitution/**')).toContain('unnormalisable');
    expect(patternReachesProtectedBoundary('apps/./mission-control/src/**')).toBeUndefined();
  });
  it('rejects file writes outside the actor grant and any traversal path, and records no file', () => {
    const base = prefixThrough(passingRun(), 'agent_started');
    const write = (path: string) =>
      new Tail(base).add(
        'file_modified',
        fab,
        { roleId: 'fabricator', path, added: 1, removed: 0, hashBefore: 'a', hashAfter: 'b' },
        [],
        'G-fab-1',
      );
    for (const path of [
      'constitution/authority.json',
      'apps/mission-control/src/world/../../../../constitution/authority.json',
      '../constitution/authority.json',
      'apps/mission-control/src/world/%2e%2e/x.ts',
    ]) {
      const s = replay('con', write(path).events);
      expect(lastOf(s, 'file_modified')?.kind, path).toBe('authority');
      expect(Object.keys(s.files), path).toEqual([]);
    }
    const inside = replay('con', write('apps/mission-control/src/./world//Capsule.tsx').events);
    expect(rejected(inside, 'file_modified')).toEqual([]);
    const noGrant = new Tail(base).add('file_created', fab, {
      roleId: 'fabricator',
      path: 'apps/mission-control/src/world/New.tsx',
      bytes: 1,
      hash: 'h',
    });
    expect(lastOf(replay('con', noGrant.events), 'file_created')?.reason).toContain('grant');
  });
  it('rejects staging or committing paths outside the boundary or with traversal', () => {
    const base = prefixThrough(passingRun(), 'file_created');
    const staged = new Tail(base).add(
      'changes_staged',
      fab,
      {
        roleId: 'fabricator',
        paths: ['apps/mission-control/src/world/Capsule.tsx', 'constitution/authority.json'],
        rejectedOutOfBoundary: [],
      },
      [],
      'G-fab-1',
    );
    const s = replay('con', staged.events);
    expect(lastOf(s, 'changes_staged')?.reason).toContain('constitution/authority.json');
    expect(s.files['apps/mission-control/src/world/Capsule.tsx']?.status).not.toBe('staged');
    const committed = new Tail(prefixThrough(passingRun(), 'changes_staged')).add(
      'candidate_committed',
      { kind: 'git' },
      {
        artifactId: 'ART-x',
        lineageId: 'LIN-1',
        headSha: HEAD_SHA,
        parentSha: HEAD_SHA_2,
        baseSha: HEAD_SHA_2,
        manifest: ['apps/../constitution/authority.json'],
        branch: 'feature/x',
      },
    );
    const c = replay('con', committed.events);
    expect(lastOf(c, 'candidate_committed')?.kind).toBe('consistency');
    expect(c.lineage?.currentSha).toBeUndefined();
  });
});
