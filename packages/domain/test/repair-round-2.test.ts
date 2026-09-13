import type { DomainEvent } from '@virgil/agent-contracts';
import {
  at,
  HEAD_SHA,
  HEAD_SHA_2,
  MERGE_SHA,
  passingRun,
  repairLimitRun,
} from '@virgil/test-fixtures';
import { describe, expect, it } from 'vitest';
import { type RunState, replay } from '../src/index.js';

/**
 * Regressions for the Keeper findings on the first consolidation candidate (956be26), repaired in
 * the owner-authorised second round: KR-01 (writes bound to the actor's own grant, role,
 * registration and expiry; every writer is a builder), KR-02 (the reducer fails closed on any
 * event the contract does not accept), KR-04 (a merge decision applies to one exact SHA).
 */

type Actor = DomainEvent['actor'];
type Ev = { kind: DomainEvent['evidence'][number]['kind']; ref: string };
const owner: Actor = { kind: 'owner', displayName: 'Owner' };
const virgil: Actor = { kind: 'virgil', roleId: 'virgil', sessionId: 'sess-virgil' };
const fab: Actor = { kind: 'agent', roleId: 'fabricator', sessionId: 'sess-fab-1' };
const keeperAsFab: Actor = { kind: 'agent', roleId: 'fabricator', sessionId: 'sess-keeper-1' };
const keeper: Actor = { kind: 'agent', roleId: 'keeper', sessionId: 'sess-keeper-1' };
const ev = (kind: Ev['kind'], ref: string): Ev => ({ kind, ref });

function prefixThrough(base: DomainEvent[], type: string, occurrence = 0): DomainEvent[] {
  let seen = -1;
  const idx = base.findIndex((e) => e.type === type && ++seen === occurrence);
  if (idx < 0) throw new Error(`no ${type}`);
  return base.slice(0, idx + 1);
}
function make(
  seq: number,
  type: string,
  actor: Actor,
  payload: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): DomainEvent {
  return {
    eventId: `r2-e${String(seq).padStart(3, '0')}`,
    seq,
    streamId: 'r2',
    authority: 'operational',
    type,
    occurredAt: at(seq),
    recordedAt: at(seq),
    actor,
    evidence: [],
    durability: 'durable_audit',
    payload,
    ...extra,
  } as unknown as DomainEvent;
}
const add = (
  events: DomainEvent[],
  type: string,
  actor: Actor,
  payload: Record<string, unknown>,
  extra: Record<string, unknown> = {},
) => [...events, make(events.length, type, actor, payload, extra)];
const rejected = (run: RunState, type: string) =>
  run.invalidTransitions.filter((x) => x.type === type);
const lastOf = (run: RunState, type: string) => rejected(run, type).at(-1);
const FILE = 'apps/example-app/src/world/Capsule.tsx';
const write = (path = FILE) => ({
  roleId: 'fabricator',
  path,
  added: 1,
  removed: 0,
  hashBefore: 'a',
  hashAfter: 'b',
});

describe('KR-01: writes, staging and commits are bound to the actor\u2019s own grant and registration', () => {
  const afterFabStart = () => prefixThrough(passingRun(), 'agent_started');
  it('rejects a write by an unregistered session citing another session\u2019s grant', () => {
    const s = replay(
      'r2',
      add(afterFabStart(), 'file_modified', keeperAsFab, write(), { authorityGrantId: 'G-fab-1' }),
    );
    expect(lastOf(s, 'file_modified')?.kind).toBe('authority');
    expect(lastOf(s, 'file_modified')?.reason).toContain('not registered');
    expect(s.lineage?.builderSessions).toEqual(['sess-fab-1']);
    expect(Object.keys(s.files)).toEqual([]);
  });
  it('rejects a registered Keeper writing to the candidate under the Fabricator\u2019s grant', () => {
    const base = prefixThrough(passingRun(), 'review_started');
    const s = replay(
      'r2',
      add(base, 'file_modified', keeper, write(), { authorityGrantId: 'G-fab-1' }),
    );
    expect(lastOf(s, 'file_modified')?.kind).toBe('authority');
    expect(lastOf(s, 'file_modified')?.reason).toContain('registered under G-keeper-1');
    const own = replay(
      'r2',
      add(base, 'file_modified', keeper, write(), { authorityGrantId: 'G-keeper-1' }),
    );
    expect(lastOf(own, 'file_modified')?.reason).toContain('may not modify the candidate');
  });
  it('rejects a write after the grant expired, and a write by Virgil', () => {
    const expired = add(afterFabStart(), 'file_modified', fab, write(), {
      authorityGrantId: 'G-fab-1',
      occurredAt: at(700),
    });
    expect(lastOf(replay('r2', expired), 'file_modified')?.reason).toContain('expired');
    const byVirgil = add(afterFabStart(), 'file_modified', virgil, write(), {});
    expect(lastOf(replay('r2', byVirgil), 'file_modified')?.reason).toContain('no write boundary');
  });
  it('tracks every session that wrote or committed as a builder, so it cannot review', () => {
    const edited = passingRun().map((e) =>
      e.type === 'file_modified' || e.type === 'file_created'
        ? ({ ...e, actor: { ...e.actor, sessionId: 'sess-keeper-1' } } as DomainEvent)
        : e,
    );
    const s = replay('r2', edited);
    expect(
      rejected(s, 'file_modified').length + rejected(s, 'file_created').length,
    ).toBeGreaterThan(0);
    expect(s.lineage?.reviewSeal?.reviewerSession).toBe('sess-keeper-1');
    // A registered Fabricator session that writes is a builder even if it never started as one.
    const base = prefixThrough(passingRun(), 'agent_started');
    const second = add(
      add(base, 'authority_granted', virgil, {
        grantId: 'G-fab-x',
        roleId: 'fabricator',
        tier: 'TIER_2',
        permittedPaths: ['apps/example-app/src/world/**'],
        expiresAt: at(600),
      }),
      'agent_started',
      { kind: 'agent', roleId: 'fabricator', sessionId: 'sess-fab-x' },
      { roleId: 'fabricator', sessionId: 'sess-fab-x', grantId: 'G-fab-x' },
      { authorityGrantId: 'G-fab-x' },
    );
    const written = add(
      second,
      'file_modified',
      { kind: 'agent', roleId: 'fabricator', sessionId: 'sess-fab-x' },
      write(),
      {
        authorityGrantId: 'G-fab-x',
      },
    );
    expect(replay('r2', written).lineage?.builderSessions).toEqual(['sess-fab-1', 'sess-fab-x']);
  });
  it('rejects a commit by an unregistered agent session and records no candidate', () => {
    const base = prefixThrough(passingRun(), 'changes_staged');
    const s = replay(
      'r2',
      add(base, 'candidate_committed', keeperAsFab, {
        artifactId: 'ART-x',
        lineageId: 'LIN-1',
        headSha: HEAD_SHA,
        parentSha: HEAD_SHA_2,
        baseSha: HEAD_SHA_2,
        manifest: [FILE],
        branch: 'feature/x',
      }),
    );
    expect(lastOf(s, 'candidate_committed')?.kind).toBe('authority');
    expect(s.lineage?.currentSha).toBeUndefined();
  });
});

describe('KR-02: the reducer fails closed on anything the contract does not accept', () => {
  it('rejects an owner_decision tagged with an unknown authority and applies no effect', () => {
    const halted = prefixThrough(repairLimitRun(), 'owner_decision_required');
    const forged = add(halted, 'owner_decision', fab, {
      decisionId: 'OD-evil',
      kind: 'continue',
      resumesTo: 'MERGED',
    });
    const last = forged.at(-1) as DomainEvent;
    const tagged = [
      ...forged.slice(0, -1),
      { ...last, authority: 'governance' } as unknown as DomainEvent,
    ];
    const s = replay('r2', tagged);
    expect(s.lineage?.state).toBe('OWNER_DECISION_REQUIRED');
    expect(s.decisions['OD-evil']).toBeUndefined();
    expect(lastOf(s, 'owner_decision')?.kind).toBe('contract');
  });
  it('rejects a self-grant tagged with an unknown authority, and a malformed payload', () => {
    const base = prefixThrough(passingRun(), 'scope_approved');
    const grant = add(base, 'authority_granted', fab, {
      grantId: 'G-self',
      roleId: 'fabricator',
      tier: 'TIER_2',
      permittedPaths: ['**'],
      expiresAt: at(600),
    });
    const last = grant.at(-1) as DomainEvent;
    const tagged = [
      ...grant.slice(0, -1),
      { ...last, authority: 'governance' } as unknown as DomainEvent,
    ];
    expect(replay('r2', tagged).grants['G-self']).toBeUndefined();
    const malformed = add(base, 'authority_granted', virgil, {
      grantId: 'G-m',
      roleId: 'fabricator',
    });
    const s = replay('r2', malformed);
    expect(s.grants['G-m']).toBeUndefined();
    expect(lastOf(s, 'authority_granted')?.kind).toBe('contract');
    expect(lastOf(s, 'authority_granted')?.reason).toContain('contract');
  });
  it('rejects an event with an unknown type or a non-owner actor kind', () => {
    const base = prefixThrough(passingRun(), 'scope_approved');
    const unknownType = add(base, 'merge_now', owner, {});
    expect(lastOf(replay('r2', unknownType), 'merge_now')?.kind).toBe('contract');
    const badActor = add(base, 'owner_decision', { kind: 'root' } as unknown as Actor, {
      decisionId: 'OD-r',
      kind: 'continue',
    });
    const s = replay('r2', badActor);
    expect(s.decisions['OD-r']).toBeUndefined();
    expect(lastOf(s, 'owner_decision')?.kind).toBe('contract');
  });
});

describe('KR-04: a merge decision applies to one exact SHA', () => {
  const merge = (decisionId: string) => ({
    lineageId: 'LIN-1',
    headSha: HEAD_SHA,
    mergeSha: MERGE_SHA,
    decisionId,
    targetBranch: 'main',
  });
  it('rejects a merge decision that names no SHA', () => {
    const s = replay(
      'r2',
      add(
        prefixThrough(passingRun(), 'safe_to_merge'),
        'owner_decision',
        owner,
        {
          decisionId: 'OD-nosha',
          kind: 'merge',
        },
        { evidence: [ev('owner_decision', 'OD-nosha')] },
      ),
    );
    expect(s.decisions['OD-nosha']).toBeUndefined();
    expect(lastOf(s, 'owner_decision')?.reason).toContain('must name the candidate SHA');
  });
  it('rejects a merge citing a decision recorded for another SHA, even one recorded early', () => {
    const base = prefixThrough(passingRun(), 'scope_approved');
    const early = add(
      base,
      'owner_decision',
      owner,
      {
        decisionId: 'OD-early',
        kind: 'merge',
        appliesToSha: HEAD_SHA_2,
      },
      { evidence: [ev('owner_decision', 'OD-early')] },
    );
    const rest = passingRun()
      .slice(base.length)
      .filter(
        (e) =>
          e.type !== 'owner_decision' ||
          (e.payload as { decisionId: string }).decisionId !== 'OD-0003',
      )
      .map((e) =>
        e.type === 'merged_by_owner'
          ? ({
              ...e,
              payload: { ...(e.payload as object), decisionId: 'OD-early' },
              evidence: [ev('owner_decision', 'OD-early')],
            } as DomainEvent)
          : e,
      );
    const events = [...early, ...rest].map((e, i) => ({ ...e, seq: i }) as DomainEvent);
    const s = replay('r2', events);
    expect(s.lineage?.state).toBe('SAFE_TO_MERGE');
    expect(s.lineage?.mergeSha).toBeUndefined();
    expect(lastOf(s, 'merged_by_owner')?.reason).toContain('applies to');
  });
  it('accepts the governed merge whose decision names the candidate SHA', () => {
    const s = replay('r2', passingRun());
    expect(s.decisions['OD-0003']?.appliesToSha).toBe(HEAD_SHA);
    expect(s.lineage?.state).toBe('DEPLOYED');
    expect(s.invalidTransitions).toEqual([]);
  });
});
