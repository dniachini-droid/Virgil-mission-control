import type { DomainEvent } from '@virgil/agent-contracts';
import { pathPermitted } from '@virgil/gate-engine';
import {
  at,
  HEAD_SHA,
  HEAD_SHA_2,
  MERGE_SHA,
  passingRun,
  repairLimitRun,
} from '@virgil/test-fixtures';
import { type RunState, replay, replayFrames } from '../src/index.js';

/**
 * Adversarial probe for Keeper findings K-01, K-02, K-03 and repository-path traversal. Prints, for
 * each exploit, what the reducer did. Run it twice to see the repair:
 *
 *   pnpm --filter @virgil/domain probe                      # repaired sources (this branch)
 *   git checkout 4b834a4 -- packages/domain/src packages/test-fixtures/src \
 *       packages/agent-contracts/src packages/gate-engine/src
 *   pnpm --filter @virgil/domain probe                      # Phase 0 base sources: every exploit succeeds
 *   git checkout HEAD -- packages/domain/src packages/test-fixtures/src \
 *       packages/agent-contracts/src packages/gate-engine/src
 *
 * The durable regressions are packages/domain/test/adversarial.test.ts and resume-and-paths.test.ts;
 * this script exists so a reviewer can watch the exploits fail without reading the tests. The
 * outputs of both runs are recorded in docs/process/CONSOLIDATION_RUN_RECORD.md.
 */

type Actor = DomainEvent['actor'];
type Ev = DomainEvent['evidence'][number];
const owner: Actor = { kind: 'owner', displayName: 'Owner' };
const virgil: Actor = { kind: 'virgil', roleId: 'virgil', sessionId: 'sess-virgil' };
const fab: Actor = { kind: 'agent', roleId: 'fabricator', sessionId: 'sess-fab-1' };
const ev = (kind: Ev['kind'], ref: string): Ev => ({ kind, ref });

function prefixThrough(base: DomainEvent[], type: string, occurrence = 0): DomainEvent[] {
  let seen = -1;
  const idx = base.findIndex((e) => e.type === type && ++seen === occurrence);
  if (idx < 0) throw new Error(`no ${type}`);
  return base.slice(0, idx + 1);
}
function add(
  events: DomainEvent[],
  type: string,
  actor: Actor,
  payload: Record<string, unknown>,
  evidence: Ev[] = [],
  grant?: string,
): DomainEvent[] {
  const seq = events.length;
  const e = {
    eventId: `probe-${seq}`,
    seq,
    streamId: 'probe',
    authority: 'operational',
    type,
    occurredAt: at(seq),
    recordedAt: at(seq),
    actor,
    evidence,
    durability: 'durable_audit',
    payload,
    ...(grant ? { authorityGrantId: grant } : {}),
  } as unknown as DomainEvent;
  return [...events, e];
}
function mutate(
  base: DomainEvent[],
  type: string,
  fn: (e: DomainEvent) => Record<string, unknown>,
  occurrence = 0,
): DomainEvent[] {
  let seen = -1;
  return base.map((e) => {
    if (e.type !== type || ++seen !== occurrence) return e;
    const patch = fn(e);
    return {
      ...e,
      ...patch,
      payload: { ...(e.payload as object), ...((patch.payload as object) ?? {}) },
    } as DomainEvent;
  });
}
const rejection = (run: RunState, type: string): string | null =>
  run.invalidTransitions.filter((x) => x.type === type).at(-1)?.reason ?? null;
const out: Record<string, Record<string, unknown>> = {};

{
  const halted = prefixThrough(repairLimitRun(), 'owner_decision_required');
  const s = replay(
    'p',
    add(halted, 'owner_decision', fab, { decisionId: 'OD-x', kind: 'merge', resumesTo: 'MERGED' }, [
      ev('owner_decision', 'OD-x'),
    ]),
  );
  out['K-01a non-owner owner_decision resuming into MERGED'] = {
    state: s.lineage?.state,
    rejected: rejection(s, 'owner_decision'),
  };
  const d = replay(
    'p',
    add(
      halted,
      'owner_decision',
      owner,
      { decisionId: 'OD-y', kind: 'merge', resumesTo: 'SAFE_TO_MERGE' },
      [ev('owner_decision', 'OD-y')],
    ),
  );
  out['K-01b owner resuming into SAFE_TO_MERGE by decree from a BLOCKED halt'] = {
    state: d.lineage?.state,
    rejected: rejection(d, 'owner_decision'),
  };
}
{
  const s = replay(
    'p',
    add(prefixThrough(repairLimitRun(), 'verification_completed', 1), 'repair_authorised', virgil, {
      repairContractId: 'RC-2',
      lineageId: 'LIN-1',
      reviewedSha: HEAD_SHA_2,
      acceptedFindingIds: ['F-3'],
      permittedFiles: ['apps/mission-control/src/world/Capsule.tsx'],
      repairCycleCount: 2,
      ownerDecisionId: 'OD-fake',
    }),
  );
  out['K-01c second repair cycle citing an invented owner decision id'] = {
    state: s.lineage?.state,
    repairCycles: s.lineage?.repairCycles,
    rejected: rejection(s, 'repair_authorised'),
  };
}
{
  const forged = mutate(
    passingRun(),
    'check_passed',
    () => ({ type: 'check_skipped', payload: { reason: 'runner unavailable' } }),
    2,
  );
  const frames = replayFrames('p', forged);
  const final = frames.at(-1)?.state;
  out['K-02 required check skipped while the completion claims allRequiredCompleted'] = {
    reachedReadyForReview: frames.some((f) => f.state.lineage?.state === 'READY_FOR_REVIEW'),
    stateAfterCompletion: frames.find((f) => f.type === 'verification_completed')?.state.lineage
      ?.state,
    finalState: final?.lineage?.state,
    signatureIssued: !!final?.lineage?.verificationSignature,
    rejected: final ? rejection(final, 'verification_completed') : null,
  };
}
{
  const forged = mutate(passingRun(), 'review_started', () => ({
    actor: { kind: 'agent', roleId: 'keeper', sessionId: 'sess-prover-1' },
    authorityGrantId: 'G-prover-1',
    payload: { reviewerSession: 'sess-prover-1', independentOfSessions: [] },
  }));
  const s = replay('p', forged);
  out['K-03a the Prover session reviews the candidate it verified'] = {
    reviewerSession: s.lineage?.reviewSeal?.reviewerSession ?? null,
    state: s.lineage?.state,
    rejected: rejection(s, 'review_started'),
  };
}
{
  const s = replay(
    'p',
    add(prefixThrough(passingRun(), 'safe_to_merge'), 'merged_by_owner', owner, {
      lineageId: 'LIN-1',
      headSha: HEAD_SHA,
      mergeSha: MERGE_SHA,
      decisionId: 'OD-none',
      targetBranch: 'main',
    }),
  );
  out['K-03b merge citing an unrecorded owner decision'] = {
    state: s.lineage?.state,
    mergeSha: s.lineage?.mergeSha ?? null,
    rejected: rejection(s, 'merged_by_owner'),
  };
}
{
  const base = prefixThrough(passingRun(), 'scope_approved');
  const self = replay(
    'p',
    add(base, 'authority_granted', fab, {
      grantId: 'G-self',
      roleId: 'fabricator',
      tier: 'TIER_2',
      permittedPaths: ['**'],
      expiresAt: at(600),
    }),
  );
  out['K-03c a Fabricator grants itself TIER_2 over everything'] = {
    grantRecorded: !!self.grants['G-self'],
    rejected: rejection(self, 'authority_granted'),
  };
  const trav = replay(
    'p',
    add(base, 'authority_granted', virgil, {
      grantId: 'G-trav',
      roleId: 'fabricator',
      tier: 'TIER_2',
      permittedPaths: ['apps/mission-control/../../constitution/**'],
      expiresAt: at(600),
    }),
  );
  out['PATH grant whose permitted path traverses into constitution/'] = {
    grantRecorded: !!trav.grants['G-trav'],
    rejected: rejection(trav, 'authority_granted'),
  };
}
out['PATH gate: traversal path against a permitted pattern'] = {
  permitted: pathPermitted('apps/x/src/../../../constitution/authority.json', ['apps/**']),
};
console.log(JSON.stringify(out, null, 2));
