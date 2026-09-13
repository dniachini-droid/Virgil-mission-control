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
  citedDecisionValid,
  fingerprint,
  guards,
  type LineageState,
  newLineage,
  patternReachesProtectedBoundary,
  type RunState,
  replay,
  replayFrames,
  taintedForReview,
} from '../src/index.js';

/**
 * Adversarial regressions for the Keeper findings K-01 (owner-decision and repair-limit bypasses),
 * K-02 (verification_completed trusting contradictory payload data) and K-03 (missing actor,
 * authority, decision and reviewer-independence validation). Every case is an exploit that the
 * base reducer accepted; each must now be rejected, recorded, and leave no effect.
 */

type Actor = DomainEvent['actor'];
type Ev = { kind: DomainEvent['evidence'][number]['kind']; ref: string };
const owner: Actor = { kind: 'owner', displayName: 'Owner' };
const virgil: Actor = { kind: 'virgil', roleId: 'virgil', sessionId: 'sess-virgil' };
const fab: Actor = { kind: 'agent', roleId: 'fabricator', sessionId: 'sess-fab-1' };
const fab2: Actor = { kind: 'agent', roleId: 'fabricator', sessionId: 'sess-fab-2' };
const prover: Actor = { kind: 'agent', roleId: 'prover', sessionId: 'sess-prover-1' };
const keeper: Actor = { kind: 'agent', roleId: 'keeper', sessionId: 'sess-keeper-1' };
const system: Actor = { kind: 'system' };
const ev = (kind: Ev['kind'], ref: string): Ev => ({ kind, ref });

/** Events of `base` up to and including the n-th event of `type`, then the tail built from the next seq. */
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
      eventId: `adv-e${String(seq).padStart(3, '0')}`,
      seq,
      streamId: 'adv',
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

/** Replace the payload of the n-th event of `type` in place of a copy of the log. */
interface Patch {
  type?: string;
  actor?: Actor;
  authorityGrantId?: string;
  occurredAt?: string;
  payload?: Record<string, unknown>;
}

function mutate(
  base: DomainEvent[],
  type: string,
  fn: (e: DomainEvent) => Patch,
  occurrence = 0,
): DomainEvent[] {
  let seen = -1;
  return base.map((e) => {
    if (e.type !== type || ++seen !== occurrence) return e;
    const patch = fn(e);
    return {
      ...e,
      ...patch,
      payload: { ...(e.payload as object), ...(patch.payload ?? {}) },
    } as DomainEvent;
  });
}

const rejected = (run: RunState, type: string) =>
  run.invalidTransitions.filter((x) => x.type === type);
const lastOf = (run: RunState, type: string) => rejected(run, type).at(-1);

/** The state at the moment the run halted for the owner, from the repair-limit fixture. */
function haltedRun(): DomainEvent[] {
  return prefixThrough(repairLimitRun(), 'owner_decision_required');
}

describe('K-01: owner_decision resume cannot manufacture a protected state', () => {
  it('halts from BLOCKED and records BLOCKED, not OWNER_DECISION_REQUIRED, as the resume state', () => {
    const s = replay('adv', haltedRun());
    expect(s.lineage?.state).toBe('OWNER_DECISION_REQUIRED');
    expect(s.lineage?.resumeState).toBe('BLOCKED');
  });
  it('resumes to the recorded pre-halt state when resumesTo is omitted', () => {
    const t = new Tail(haltedRun()).add(
      'owner_decision',
      owner,
      { decisionId: 'OD-0005', kind: 'additional_repair_round' },
      [ev('owner_decision', 'OD-0005')],
    );
    const s = replay('adv', t.events);
    expect(s.lineage?.state).toBe('BLOCKED');
    expect(rejected(s, 'owner_decision')).toEqual([]);
  });
  for (const target of [
    'SAFE_TO_MERGE',
    'MERGED',
    'DEPLOYED',
    'REPAIR_AUTHORISED',
    'READY_FOR_REVIEW',
    'REVIEW_IN_PROGRESS',
    'PASS_WITH_NON_BLOCKING_FINDINGS',
  ]) {
    it(`rejects an owner resume into ${target} through the wildcard`, () => {
      const t = new Tail(haltedRun()).add(
        'owner_decision',
        owner,
        { decisionId: 'OD-0005', kind: 'continue', resumesTo: target },
        [ev('owner_decision', 'OD-0005')],
      );
      const s = replay('adv', t.events);
      expect(s.lineage?.state).toBe('OWNER_DECISION_REQUIRED');
      expect(lastOf(s, 'owner_decision')?.kind).toBe('authority');
      expect(lastOf(s, 'owner_decision')?.reason).toContain(target);
      expect(s.decisions['OD-0005']).toBeUndefined();
    });
  }
  it('rejects an owner_decision from a non-owner actor even with an owner-looking payload', () => {
    for (const actor of [virgil, fab, system]) {
      const t = new Tail(haltedRun()).add(
        'owner_decision',
        actor,
        { decisionId: 'OD-0005', kind: 'additional_repair_round', resumesTo: 'BLOCKED' },
        [ev('owner_decision', 'OD-0005')],
      );
      const s = replay('adv', t.events);
      expect(s.lineage?.state).toBe('OWNER_DECISION_REQUIRED');
      expect(lastOf(s, 'owner_decision')?.kind).toBe('authority');
      expect(s.decisions['OD-0005']).toBeUndefined();
    }
  });
  it('rejects an owner_decision that does not cite its own recorded decision as evidence', () => {
    const t = new Tail(haltedRun()).add('owner_decision', owner, {
      decisionId: 'OD-0005',
      kind: 'additional_repair_round',
    });
    const s = replay('adv', t.events);
    expect(lastOf(s, 'owner_decision')?.kind).toBe('authority');
    expect(s.decisions['OD-0005']).toBeUndefined();
  });
  it('re-validates the invariant when resuming into the review state it halted back to', () => {
    // Halt from SAFE_TO_MERGE records the pre-eligibility state; the candidate then changes while
    // halted, so resuming into that review state must be refused (its seal is stale).
    const base = prefixThrough(passingRun(), 'safe_to_merge');
    const t = new Tail(base)
      .add('owner_decision_required', virgil, {
        questionId: 'Q-x',
        question: 'Merge now?',
        consequence: 'none',
        recommendedDefault: 'merge',
      })
      .add(
        'candidate_changed_after_review',
        { kind: 'github' },
        {
          lineageId: 'LIN-1',
          reviewedSha: HEAD_SHA,
          newSha: HEAD_SHA_2,
        },
      )
      .add('owner_decision', owner, { decisionId: 'OD-0009', kind: 'continue' }, [
        ev('owner_decision', 'OD-0009'),
      ]);
    const s = replay('adv', t.events);
    expect(s.lineage?.resumeState).toBe('PASS_WITH_NON_BLOCKING_FINDINGS');
    expect(s.lineage?.state).toBe('OWNER_DECISION_REQUIRED');
    expect(lastOf(s, 'owner_decision')?.kind).toBe('consistency');
  });
});

describe('K-01: repair authorisation and cycle counts derive from recorded events', () => {
  function afterFirstRepairAuthorised(): DomainEvent[] {
    return prefixThrough(repairLimitRun(), 'repair_authorised');
  }
  const contract = (n: number, extra: Record<string, unknown> = {}) => ({
    repairContractId: `RC-${n}`,
    lineageId: 'LIN-1',
    reviewedSha: HEAD_SHA_2,
    acceptedFindingIds: ['F-3'],
    permittedFiles: ['apps/example-app/src/world/Capsule.tsx'],
    repairCycleCount: n,
    ...extra,
  });
  it('counts cycles from accepted transitions, not from the payload', () => {
    const s = replay('adv', afterFirstRepairAuthorised());
    expect(s.lineage?.repairCycles).toBe(1);
    const t = new Tail(afterFirstRepairAuthorised()).add('repair_authorised', virgil, {
      ...contract(1, { reviewedSha: HEAD_SHA, acceptedFindingIds: ['F-2'] }),
      repairContractId: 'RC-1',
    });
    const s2 = replay('adv', t.events);
    expect(s2.lineage?.repairCycles).toBe(1);
    expect(rejected(s2, 'repair_authorised').length).toBeGreaterThan(0);
  });
  it('rejects cycle 2 citing an invented owner decision id', () => {
    const base = prefixThrough(repairLimitRun(), 'adjudication_completed', 1);
    const t = new Tail(base).add(
      'repair_authorised',
      virgil,
      contract(2, { ownerDecisionId: 'OD-fake' }),
    );
    const s = replay('adv', t.events);
    expect(s.lineage?.state).toBe('BLOCKED');
    expect(s.lineage?.repairCycles).toBe(1);
    expect(lastOf(s, 'repair_authorised')?.reason).toContain('repair_cycle_within_limit');
  });
  it('rejects cycle 2 citing a recorded owner decision of the wrong kind', () => {
    const base = prefixThrough(repairLimitRun(), 'adjudication_completed', 1);
    const t = new Tail(base).add(
      'repair_authorised',
      virgil,
      contract(2, { ownerDecisionId: 'OD-0002' }),
    );
    const s = replay('adv', t.events);
    expect(s.lineage?.repairCycles).toBe(1);
    expect(lastOf(s, 'repair_authorised')?.kind).toBe('transition');
  });
  it('consumes an additional-round decision once and refuses its reuse', () => {
    const s = replay('adv', repairLimitRun());
    expect(s.decisions['OD-0005']?.consumedBy).toHaveLength(1);
    expect(citedDecisionValid(s, 'OD-0005', 'additional_repair_round', { oneShot: true })).toBe(
      false,
    );
    expect(s.lineage?.repairCycles).toBe(2);
  });
  it('rejects a repair contract that no recorded adjudication defines', () => {
    const base = prefixThrough(repairLimitRun(), 'verification_completed', 0);
    const t = new Tail(base).add('repair_authorised', virgil, {
      ...contract(1, { reviewedSha: HEAD_SHA, acceptedFindingIds: ['F-2'] }),
      repairContractId: 'RC-ghost',
    });
    const s = replay('adv', t.events);
    expect(s.lineage?.state).toBe('BLOCKED');
    expect(lastOf(s, 'repair_authorised')?.kind).toBe('authority');
  });
  it('rejects a repair authorised by the builder or an agent instead of Virgil or the owner', () => {
    const base = prefixThrough(repairLimitRun(), 'adjudication_completed', 0);
    for (const actor of [fab, prover, keeper]) {
      const t = new Tail(base).add('repair_authorised', actor, {
        ...contract(1, { reviewedSha: HEAD_SHA, acceptedFindingIds: ['F-2'] }),
        repairContractId: 'RC-1',
      });
      const s = replay('adv', t.events);
      expect(s.lineage?.state).toBe('BLOCKED');
      expect(lastOf(s, 'repair_authorised')?.kind).toBe('authority');
    }
  });
  it('rejects a payload cycle count that skips ahead', () => {
    const base = prefixThrough(repairLimitRun(), 'adjudication_completed', 0);
    const t = new Tail(base).add('repair_authorised', virgil, {
      ...contract(3, {
        reviewedSha: HEAD_SHA,
        acceptedFindingIds: ['F-2'],
        ownerDecisionId: 'OD-0002',
      }),
      repairContractId: 'RC-1',
    });
    const s = replay('adv', t.events);
    expect(s.lineage?.repairCycles).toBe(0);
    expect(rejected(s, 'repair_authorised')).toHaveLength(1);
  });
});

describe('K-01: merge and deploy require a recorded owner decision of the right kind', () => {
  const merge = (extra: Record<string, unknown>) => ({
    lineageId: 'LIN-1',
    headSha: HEAD_SHA,
    mergeSha: MERGE_SHA,
    decisionId: 'OD-0003',
    targetBranch: 'main',
    ...extra,
  });
  const eligible = () => prefixThrough(passingRun(), 'safe_to_merge');
  it('rejects a merge citing an unrecorded decision id', () => {
    const s = replay(
      'adv',
      new Tail(eligible()).add('merged_by_owner', owner, merge({ decisionId: 'OD-none' })).events,
    );
    expect(s.lineage?.state).toBe('SAFE_TO_MERGE');
    expect(s.lineage?.mergeSha).toBeUndefined();
    expect(lastOf(s, 'merged_by_owner')?.reason).toContain('actor_is_owner');
  });
  it('rejects a merge citing a recorded decision of another kind (scope acceptance)', () => {
    const s = replay(
      'adv',
      new Tail(eligible()).add('merged_by_owner', owner, merge({ decisionId: 'OD-0002' })).events,
    );
    expect(s.lineage?.state).toBe('SAFE_TO_MERGE');
    expect(s.lineage?.mergeSha).toBeUndefined();
  });
  it('rejects a merge whose SHA is not the eligible candidate', () => {
    const t = new Tail(eligible())
      .add(
        'owner_decision',
        owner,
        { decisionId: 'OD-0003', kind: 'merge', appliesToSha: HEAD_SHA },
        [ev('owner_decision', 'OD-0003')],
      )
      .add('merged_by_owner', owner, merge({ headSha: HEAD_SHA_2 }));
    const s = replay('adv', t.events);
    expect(s.lineage?.state).toBe('SAFE_TO_MERGE');
    expect(lastOf(s, 'merged_by_owner')?.kind).toBe('consistency');
  });
  it('rejects a merge from a passing review that skipped the safe_to_merge gate decision', () => {
    const t = new Tail(prefixThrough(passingRun(), 'review_passed'))
      .add(
        'owner_decision',
        owner,
        { decisionId: 'OD-0003', kind: 'merge', appliesToSha: HEAD_SHA },
        [ev('owner_decision', 'OD-0003')],
      )
      .add('merged_by_owner', owner, merge({}));
    const s = replay('adv', t.events);
    expect(s.lineage?.state).toBe('PASS_WITH_NON_BLOCKING_FINDINGS');
    expect(lastOf(s, 'merged_by_owner')?.reason).toContain('not allowed');
  });
  it('accepts the governed merge and consumes the decision exactly once', () => {
    const s = replay('adv', passingRun());
    expect(s.lineage?.state).toBe('DEPLOYED');
    expect(s.decisions['OD-0003']?.consumedBy).toHaveLength(1);
    expect(s.invalidTransitions).toEqual([]);
  });
  it('rejects a deployment started by an agent under a grant with an invented decision', () => {
    const base = prefixThrough(passingRun(), 'merged_by_owner');
    const t = new Tail(base).add(
      'deployment_started',
      fab,
      { deploymentId: 'DEP-x', mergeSha: MERGE_SHA, target: 'staging', decisionId: 'OD-0004' },
      [],
      'G-fab-1',
    );
    const s = replay('adv', t.events);
    expect(s.lineage?.deployment).toBe('NOT_STARTED');
    expect(lastOf(s, 'deployment_started')?.reason).toContain('deploy_authority_present');
  });
  it('rejects a deployment citing a recorded decision of the wrong kind', () => {
    const base = prefixThrough(passingRun(), 'merged_by_owner');
    const t = new Tail(base).add('deployment_started', owner, {
      deploymentId: 'DEP-x',
      mergeSha: MERGE_SHA,
      target: 'staging',
      decisionId: 'OD-0003',
    });
    const s = replay('adv', t.events);
    expect(s.lineage?.deployment).toBe('NOT_STARTED');
  });
  it('rejects deployed without a started deployment', () => {
    const base = prefixThrough(passingRun(), 'merged_by_owner');
    const t = new Tail(base).add('deployed', system, {
      deploymentId: 'DEP-x',
      mergeSha: MERGE_SHA,
      target: 'staging',
    });
    const s = replay('adv', t.events);
    expect(s.lineage?.state).toBe('MERGED');
    expect(s.lineage?.deployment).toBe('NOT_STARTED');
    expect(lastOf(s, 'deployed')?.kind).toBe('consistency');
  });
});

describe('K-02: verification eligibility derives from recorded checks, never from the payload', () => {
  const skipUnit = (events: DomainEvent[]) =>
    mutate(
      events,
      'check_passed',
      () => ({ type: 'check_skipped', payload: { reason: 'runner unavailable' } }),
      2,
    );
  it('rejects a completion that claims all required checks completed while one was skipped', () => {
    const s = replay('adv', skipUnit(passingRun()));
    const done = lastOf(s, 'verification_completed');
    expect(done?.kind).toBe('consistency');
    expect(done?.reason).toContain('contradicts');
    const frames = replayFrames('adv', skipUnit(passingRun()));
    expect(frames.map((f) => f.state.lineage?.state)).not.toContain('READY_FOR_REVIEW');
    expect(s.lineage?.verificationSignature).toBeUndefined();
    expect(s.lineage?.state).toBe('VERIFICATION_INCOMPLETE');
    expect(s.lineage?.checks.unit?.result).toBe('skipped');
    expect(s.lineage?.checks.unit?.required).toBe(true);
  });
  it('rejects a completion that claims no required check failed while one failed', () => {
    const failed = mutate(
      passingRun(),
      'check_passed',
      () => ({ type: 'check_failed', payload: { exitCode: 1 } }),
      2,
    );
    const lying = mutate(failed, 'verification_completed', () => ({
      payload: {
        results: {
          typecheck: 'passed',
          lint: 'passed',
          unit: 'failed',
          'visual-regression': 'skipped',
        },
      },
    }));
    const s = replay('adv', lying);
    expect(lastOf(s, 'verification_completed')?.kind).toBe('consistency');
    expect(s.lineage?.state).toBe('BLOCKED');
    expect(s.lineage?.verificationSignature).toBeUndefined();
  });
  it('rejects a completion whose results record contradicts the recorded checks', () => {
    const lying = mutate(skipUnit(passingRun()), 'verification_completed', () => ({
      payload: { allRequiredCompleted: false, anyRequiredFailed: false },
    }));
    const s = replay('adv', lying);
    expect(lastOf(s, 'verification_completed')?.reason).toContain('results[unit]');
    expect(s.lineage?.state).toBe('VERIFICATION_INCOMPLETE');
  });
  it('rejects a completion for a required check that never ran', () => {
    const missing = passingRun().filter(
      (e) =>
        !(e.type.startsWith('check_') && (e.payload as { checkId: string }).checkId === 'unit'),
    );
    const renumbered = missing.map((e, i) => ({ ...e, seq: i }) as DomainEvent);
    const s = replay('adv', renumbered);
    expect(lastOf(s, 'verification_completed')?.reason).toContain('missing unit');
    expect(s.lineage?.state).toBe('VERIFICATION_INCOMPLETE');
  });
  it('a skipped required check cannot reach READY_FOR_REVIEW even with an honest completion', () => {
    const honest = mutate(skipUnit(passingRun()), 'verification_completed', (e) => ({
      payload: {
        results: { ...(e.payload as { results: Record<string, string> }).results, unit: 'skipped' },
        allRequiredCompleted: false,
        anyRequiredFailed: false,
      },
    }));
    const s = replay('adv', honest);
    const frames = replayFrames('adv', honest);
    expect(frames.map((f) => f.state.lineage?.state)).not.toContain('READY_FOR_REVIEW');
    expect(frames.find((f) => f.type === 'verification_completed')?.state.lineage?.state).toBe(
      'INSUFFICIENT_EVIDENCE',
    );
    expect(s.lineage?.verificationSignature).toBeUndefined();
  });
  it('refuses to downgrade a declared-required check to optional', () => {
    const downgraded = mutate(
      passingRun(),
      'check_passed',
      () => ({ type: 'check_skipped', payload: { required: false, reason: 'not needed' } }),
      2,
    );
    const s = replay('adv', downgraded);
    expect(lastOf(s, 'check_skipped')?.reason).toContain('cannot be re-declared optional');
    expect(s.lineage?.checks.unit?.required).toBe(true);
    expect(s.lineage?.checks.unit?.result).toBe('running');
    expect(s.lineage?.state).toBe('VERIFICATION_INCOMPLETE');
  });
  it('rejects a passed check with a non-zero exit code', () => {
    const s = replay(
      'adv',
      mutate(passingRun(), 'check_passed', () => ({ payload: { exitCode: 2 } }), 2),
    );
    expect(lastOf(s, 'check_passed')?.kind).toBe('consistency');
    expect(s.lineage?.state).toBe('VERIFICATION_INCOMPLETE');
  });
  it('rejects verification facts emitted by the builder session', () => {
    const forged = mutate(
      passingRun(),
      'check_passed',
      () => ({ actor: fab, authorityGrantId: 'G-fab-1' }),
      2,
    );
    const s = replay('adv', forged);
    expect(lastOf(s, 'check_passed')?.kind).toBe('authority');
    expect(s.lineage?.checks.unit?.result).toBe('running');
    expect(s.lineage?.state).toBe('VERIFICATION_INCOMPLETE');
  });
  it('rejects a completion naming another verification id or SHA', () => {
    const otherId = mutate(passingRun(), 'verification_completed', () => ({
      payload: { verificationId: 'V-9' },
    }));
    expect(lastOf(replay('adv', otherId), 'verification_completed')?.kind).toBe('consistency');
    const otherSha = mutate(passingRun(), 'verification_completed', () => ({
      payload: { headSha: HEAD_SHA_2 },
    }));
    expect(lastOf(replay('adv', otherSha), 'verification_completed')?.kind).toBe('consistency');
  });
});

describe('K-03: actor, authority, decision and reviewer-independence validation', () => {
  it('rejects a self-issued grant and a grant into a protected boundary', () => {
    const base = prefixThrough(passingRun(), 'scope_approved');
    const selfGrant = new Tail(base).add('authority_granted', fab, {
      grantId: 'G-self',
      roleId: 'fabricator',
      tier: 'TIER_2',
      permittedPaths: ['**'],
      expiresAt: at(600),
    });
    const s1 = replay('adv', selfGrant.events);
    expect(s1.grants['G-self']).toBeUndefined();
    expect(lastOf(s1, 'authority_granted')?.kind).toBe('authority');
    const wide = new Tail(base).add('authority_granted', virgil, {
      grantId: 'G-wide',
      roleId: 'fabricator',
      tier: 'TIER_2',
      permittedPaths: ['constitution/authority.json'],
      expiresAt: at(600),
    });
    const s2 = replay('adv', wide.events);
    expect(s2.grants['G-wide']).toBeUndefined();
    expect(lastOf(s2, 'authority_granted')?.reason).toContain('protected boundary');
    expect(patternReachesProtectedBoundary('**')).toBe('constitution/');
    expect(patternReachesProtectedBoundary('docs/**')).toBeDefined();
    expect(patternReachesProtectedBoundary('apps/example-app/src/world/**')).toBeUndefined();
  });
  it('rejects a TIER_3 grant by Virgil and a grant beyond the role maxTier', () => {
    const base = prefixThrough(passingRun(), 'scope_approved');
    const t = new Tail(base).add('authority_granted', virgil, {
      grantId: 'G-t3',
      roleId: 'keeper',
      tier: 'TIER_3',
      permittedPaths: [],
      expiresAt: at(600),
    });
    const s = replay('adv', t.events);
    expect(s.grants['G-t3']).toBeUndefined();
  });
  it('rejects a Tier 2 grant by Virgil before the owner approved scope', () => {
    const base = prefixThrough(passingRun(), 'scope_proposed');
    const t = new Tail(base).add('authority_granted', virgil, {
      grantId: 'G-early',
      roleId: 'fabricator',
      tier: 'TIER_2',
      permittedPaths: ['apps/example-app/src/world/**'],
      expiresAt: at(600),
    });
    const s = replay('adv', t.events);
    expect(s.grants['G-early']).toBeUndefined();
    expect(lastOf(s, 'authority_granted')?.reason).toContain('scope_approved');
  });
  it('rejects an agent starting under an unknown, revoked, mismatched or expired grant', () => {
    const base = prefixThrough(passingRun(), 'agent_assigned');
    const cases: Array<[Record<string, unknown>, Actor, string]> = [
      [{ roleId: 'fabricator', sessionId: 'sess-fab-1', grantId: 'G-ghost' }, fab, 'not recorded'],
      [
        { roleId: 'keeper', sessionId: 'sess-keeper-1', grantId: 'G-fab-1' },
        keeper,
        'issued to role',
      ],
    ];
    for (const [payload, actor, reason] of cases) {
      const s = replay('adv', new Tail(base).add('agent_started', actor, payload).events);
      expect(lastOf(s, 'agent_started')?.reason).toContain(reason);
      expect(Object.keys(s.agents)).toEqual([]);
    }
    const revoked = new Tail(base)
      .add('authority_revoked', virgil, { grantId: 'G-fab-1', reason: 'test' })
      .add('agent_started', fab, {
        roleId: 'fabricator',
        sessionId: 'sess-fab-1',
        grantId: 'G-fab-1',
      });
    expect(lastOf(replay('adv', revoked.events), 'agent_started')?.reason).toContain('revoked');
    const expired = mutate(prefixThrough(passingRun(), 'agent_started'), 'agent_started', () => ({
      occurredAt: at(700),
    }));
    expect(lastOf(replay('adv', expired), 'agent_started')?.reason).toContain('expired');
  });
  it('rejects a cited owner decision that was never recorded', () => {
    const base = prefixThrough(passingRun(), 'scope_approved');
    const t = new Tail(base).add(
      'authority_granted',
      virgil,
      {
        grantId: 'G-x',
        roleId: 'fabricator',
        tier: 'TIER_2',
        permittedPaths: [],
        expiresAt: at(600),
      },
      [ev('owner_decision', 'OD-0099')],
    );
    const s = replay('adv', t.events);
    expect(s.grants['G-x']).toBeUndefined();
    expect(lastOf(s, 'authority_granted')?.reason).toContain('OD-0099');
  });
  it('tracks builders, repairers and Prover sessions as tainted for review', () => {
    const s = replay('adv', blockedThenRepairedRun());
    const tainted = taintedForReview(s.lineage as LineageState);
    expect([...tainted].sort()).toEqual(['sess-fab-1', 'sess-fab-2', 'sess-prover-1']);
    expect(s.lineage?.repairerSessions).toEqual(['sess-fab-2']);
    expect(s.lineage?.proverSessions).toEqual(['sess-prover-1']);
    expect(s.lineage?.reviewerSessions).toContain('sess-arbiter-1');
  });
  it('rejects the repairer session reviewing the repaired candidate', () => {
    const base = prefixThrough(blockedThenRepairedRun(), 'verification_completed', 1);
    const t = new Tail(base)
      .add('authority_granted', virgil, {
        grantId: 'G-k',
        roleId: 'keeper',
        tier: 'TIER_2',
        permittedPaths: [],
        expiresAt: at(600),
      })
      .add(
        'agent_started',
        { kind: 'agent', roleId: 'keeper', sessionId: 'sess-fab-2' },
        { roleId: 'keeper', sessionId: 'sess-fab-2', grantId: 'G-k' },
        [],
        'G-k',
      )
      .add(
        'review_started',
        { kind: 'agent', roleId: 'keeper', sessionId: 'sess-fab-2' },
        {
          reportId: 'RR-x',
          reviewedSha: HEAD_SHA_2,
          reviewerRole: 'keeper',
          reviewerSession: 'sess-fab-2',
          independentOfSessions: [],
        },
        [],
        'G-k',
      );
    const s = replay('adv', t.events);
    expect(lastOf(s, 'agent_started')?.reason).toContain('already acts as fabricator');
    expect(lastOf(s, 'review_started')?.kind).toBe('authority');
    expect(s.lineage?.state).toBe('READY_FOR_REVIEW');
    expect(s.lineage?.reviewSeal).toBeUndefined();
  });
  it('rejects the Prover session reviewing the candidate it verified', () => {
    const base = prefixThrough(passingRun(), 'verification_completed');
    const t = new Tail(base).add(
      'review_started',
      { kind: 'agent', roleId: 'keeper', sessionId: 'sess-prover-1' },
      {
        reportId: 'RR-x',
        reviewedSha: HEAD_SHA,
        reviewerRole: 'keeper',
        reviewerSession: 'sess-prover-1',
        independentOfSessions: [],
      },
      [],
      'G-prover-1',
    );
    const s = replay('adv', t.events);
    expect(lastOf(s, 'review_started')?.kind).toBe('authority');
    expect(s.lineage?.reviewSeal).toBeUndefined();
    const lineage = { ...newLineage('x'), currentSha: HEAD_SHA, proverSessions: ['sess-prover-1'] };
    expect(
      guards.reviewer_independent_of_builder?.({
        run: s,
        lineage,
        event: t.events.at(-1) as DomainEvent,
        payload: { reviewerSession: 'sess-prover-1', reviewedSha: HEAD_SHA },
      }),
    ).toBe(false);
  });
  it('rejects a review started by a session whose actor identity does not match the payload', () => {
    const forged = mutate(passingRun(), 'review_started', () => ({
      payload: { reviewerSession: 'sess-keeper-9' },
    }));
    const s = replay('adv', forged);
    expect(lastOf(s, 'review_started')?.reason).toContain('sess-keeper-9');
    expect(s.lineage?.reviewSeal).toBeUndefined();
  });
  it('rejects a verdict recorded by a session other than the reviewer that opened the report', () => {
    const forged = mutate(passingRun(), 'review_passed', () => ({
      actor: fab,
      authorityGrantId: 'G-fab-1',
    }));
    const s = replay('adv', forged);
    expect(lastOf(s, 'review_passed')?.kind).toBe('authority');
    expect(s.lineage?.reviewSeal?.verdict).toBe('REVIEW_IN_PROGRESS');
    expect(s.lineage?.state).toBe('REVIEW_IN_PROGRESS');
  });
  it('rejects a passing verdict on a report that raised a blocking finding', () => {
    const contradictory = mutate(passingRun(), 'finding_raised', () => ({
      payload: { severity: 'blocking', blocking: true },
    }));
    const s = replay('adv', contradictory);
    expect(lastOf(s, 'review_passed')?.reason).toContain('blocking findings F-1');
    expect(s.lineage?.state).toBe('REVIEW_IN_PROGRESS');
  });
  it('rejects adjudication by anyone but a registered, independent Arbiter', () => {
    const base = prefixThrough(blockedThenRepairedRun(), 'finding_raised');
    for (const actor of [fab, prover, keeper, virgil, { ...fab2, roleId: 'arbiter' } as Actor]) {
      const t = new Tail(base).add('adjudication_completed', actor, {
        adjudicationId: 'ADJ-x',
        acceptedFindingIds: [],
        rejectedFindingIds: ['F-2'],
        repairCycleCount: 1,
      });
      const s = replay('adv', t.events);
      expect(lastOf(s, 'adjudication_completed')?.kind).toBe('authority');
      expect(s.lineage?.findings['F-2']?.status).toBe('raised');
    }
  });
  it('rejects a gate decision recorded by an agent', () => {
    const forged = mutate(passingRun(), 'safe_to_merge', () => ({
      actor: fab,
      authorityGrantId: 'G-fab-1',
    }));
    const s = replay('adv', forged);
    expect(lastOf(s, 'safe_to_merge')?.kind).toBe('authority');
    expect(s.lineage?.state).toBe('PASS_WITH_NON_BLOCKING_FINDINGS');
  });
  it('rejects a repair completed under a contract that was never authorised', () => {
    const base = prefixThrough(repairLimitRun(), 'adjudication_completed', 0);
    const t = new Tail(base).add(
      'repair_completed',
      fab2,
      { repairContractId: 'RC-1', lineageId: 'LIN-1', previousSha: HEAD_SHA, newSha: HEAD_SHA_2 },
      [],
      'G-fab-1',
    );
    const s = replay('adv', t.events);
    expect(lastOf(s, 'repair_completed')?.kind).toBe('authority');
    expect(s.lineage?.currentSha).toBe(HEAD_SHA);
  });
});

describe('invalid events are recorded explicitly and leave replay deterministic', () => {
  it('a rejected event applies no effect at all', () => {
    const base = prefixThrough(passingRun(), 'verification_started');
    const before = replay('adv', base);
    const forged = new Tail(base).add(
      'check_passed',
      fab,
      {
        verificationId: 'V-1',
        checkId: 'unit',
        name: 'vitest',
        required: true,
        exitCode: 0,
        elapsedMs: 1,
      },
      [],
      'G-fab-1',
    );
    const after = replay('adv', forged.events);
    const strip = (r: RunState) => ({
      ...r,
      lastSeq: 0,
      events: 0,
      lastEventType: undefined,
      invalidTransitions: [],
    });
    expect(JSON.stringify(strip(after))).toBe(JSON.stringify(strip(before)));
    expect(after.invalidTransitions).toHaveLength(1);
    expect(after.invalidTransitions[0]).toMatchObject({ type: 'check_passed', kind: 'authority' });
  });
  it('classifies every rejection and replays identically', () => {
    for (const build of [
      repairLimitRun,
      () => mutate(passingRun(), 'review_passed', () => ({ actor: fab })),
    ]) {
      const a = replay('adv', build());
      const b = replay('adv', build());
      expect(fingerprint(a)).toBe(fingerprint(b));
      for (const x of a.invalidTransitions)
        expect(['authority', 'consistency', 'transition', 'order']).toContain(x.kind);
    }
  });
});
