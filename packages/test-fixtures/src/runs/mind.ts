import type { DomainEvent } from '@virgil/agent-contracts';
import { at, HEAD_SHA, MERGE_SHA, sha } from '../ids.js';

/** Knowledge-stream events for the Mind of Virgil spike and Phase 1 story: a verified run crosses the gateway and becomes one durable node with one contested claim and one scan finding. */
export function mindSequence(): DomainEvent[] {
  const worker = { kind: 'knowledge_worker', displayName: 'knowledge-maintenance/1.0.0' } as const;
  const owner = { kind: 'owner', displayName: 'Owner' } as const;
  const system = { kind: 'system' } as const;
  const runHash = `sha256:${sha('run-record-run-pass').padEnd(64, '0')}`;
  let seq = 0;
  const mk = (
    type: string,
    actor: DomainEvent['actor'],
    payload: Record<string, unknown>,
    evidence: Array<{ kind: DomainEvent['evidence'][number]['kind']; ref: string; hash?: string }>,
    durability: 'durable_audit' | 'replayable_operational' = 'durable_audit',
  ): DomainEvent => {
    const s = seq++;
    return {
      eventId: `mind-e${String(s).padStart(3, '0')}`,
      seq: s,
      streamId: 'knowledge-main',
      authority: 'knowledge',
      type,
      occurredAt: at(200 + s),
      recordedAt: at(200 + s),
      actor,
      evidence,
      durability,
      payload,
    } as unknown as DomainEvent;
  };
  return [
    mk(
      'run_record_deposited',
      system,
      {
        runId: 'run-pass',
        runRecordRef: { kind: 'run_record', ref: 'run-pass', hash: runHash },
        sourceId: 'src-run-pass',
      },
      [
        { kind: 'run_record', ref: 'run-pass', hash: runHash },
        { kind: 'git_object', ref: MERGE_SHA },
      ],
    ),
    mk(
      'raw_source_added',
      system,
      {
        sourceId: 'src-run-pass',
        canonicalPath: 'knowledge/raw/src-run-pass.source.md',
        sourceKind: 'run_record',
        provenance: 'Verified run run-pass, reviewed SHA and merge SHA recorded',
      },
      [{ kind: 'run_record', ref: 'run-pass' }],
    ),
    mk('raw_source_hashed', system, { sourceId: 'src-run-pass', hash: runHash, bytes: 4096 }, [
      { kind: 'file_hash', ref: 'knowledge/raw/src-run-pass.source.md', hash: runHash },
    ]),
    mk(
      'raw_source_read',
      worker,
      { sourceId: 'src-run-pass', readerRole: 'knowledge-maintenance', nonDestructive: true },
      [{ kind: 'raw_source', ref: 'src-run-pass' }],
      'replayable_operational',
    ),
    mk(
      'raw_source_read',
      worker,
      {
        sourceId: 'src-master-commission',
        readerRole: 'knowledge-maintenance',
        nonDestructive: true,
      },
      [{ kind: 'raw_source', ref: 'src-master-commission' }],
      'replayable_operational',
    ),
    mk(
      'knowledge_compilation_proposed',
      worker,
      {
        proposalId: 'KP-1',
        sourceIds: ['src-run-pass', 'src-master-commission'],
        proposedNodeIds: ['lesson-capsule-sha-legibility'],
        proposedClaimIds: ['C-lesson-sha-hull', 'C-lesson-bloom'],
        compiler: 'knowledge-maintenance/1.0.0',
        requiresOwnerApproval: false,
      },
      [
        { kind: 'raw_source', ref: 'src-run-pass' },
        { kind: 'raw_source', ref: 'src-master-commission' },
      ],
    ),
    mk(
      'claim_supported',
      worker,
      {
        claimId: 'C-lesson-sha-hull',
        sourceIds: ['src-run-pass', 'src-master-commission'],
        authorityClass: 'verified_evidence',
      },
      [{ kind: 'run_record', ref: 'run-pass' }],
    ),
    mk(
      'provenance_tether_created',
      worker,
      {
        tetherId: 'T-1',
        fromClaimId: 'C-lesson-sha-hull',
        toEvidence: { kind: 'run_record', ref: 'run-pass', hash: runHash },
        tetherKind: 'verified_run',
      },
      [{ kind: 'run_record', ref: 'run-pass' }],
    ),
    mk(
      'provenance_tether_created',
      worker,
      {
        tetherId: 'T-2',
        fromClaimId: 'C-lesson-sha-hull',
        toEvidence: { kind: 'raw_source', ref: 'src-master-commission' },
        tetherKind: 'raw_source',
      },
      [{ kind: 'raw_source', ref: 'src-master-commission' }],
    ),
    mk(
      'claim_contested',
      worker,
      {
        claimId: 'C-lesson-bloom',
        contestedByClaimId: 'C-artbible-bloom-cap',
        fieldId: 'CF-bloom',
      },
      [
        { kind: 'run_record', ref: 'run-pass' },
        { kind: 'wiki_page', ref: 'epistemic-visual-language' },
      ],
    ),
    mk(
      'knowledge_compilation_approved',
      system,
      { proposalId: 'KP-1', approvedBy: 'verification' },
      [
        { kind: 'gate_decision', ref: 'GR-1' },
        { kind: 'git_object', ref: HEAD_SHA },
      ],
    ),
    mk(
      'wiki_page_created',
      worker,
      {
        nodeId: 'lesson-capsule-sha-legibility',
        path: 'knowledge/wiki/lessons/lesson-capsule-sha-legibility.md',
        authorityClass: 'verified_evidence',
        compiler: 'knowledge-maintenance/1.0.0',
        proposalId: 'KP-1',
      },
      [{ kind: 'wiki_page', ref: 'lesson-capsule-sha-legibility' }],
    ),
    mk(
      'wiki_lint_started',
      system,
      { scanId: 'scan-1', scope: 'knowledge/wiki' },
      [],
      'replayable_operational',
    ),
    mk(
      'wiki_lint_finding_raised',
      system,
      {
        scanId: 'scan-1',
        findingId: 'scan-1-001',
        findingClass: 'contradiction',
        nodeIds: ['lesson-capsule-sha-legibility', 'epistemic-visual-language'],
        evidence: [
          { kind: 'wiki_page', ref: 'lesson-capsule-sha-legibility' },
          { kind: 'wiki_page', ref: 'epistemic-visual-language' },
        ],
      },
      [{ kind: 'wiki_page', ref: 'lesson-capsule-sha-legibility' }],
    ),
    mk('wiki_lint_completed', system, { scanId: 'scan-1', findingCount: 1, proposedRepairs: 1 }, [
      { kind: 'event', ref: 'scan-1' },
    ]),
    mk('owner_decision', owner, { decisionId: 'OD-0006', kind: 'knowledge_authority' }, [
      { kind: 'owner_decision', ref: 'OD-0006' },
    ]),
  ]
    .map((e) => {
      // owner_decision is an operational event type; the knowledge stream references it as evidence instead of carrying it.
      return e;
    })
    .filter((e) => e.type !== 'owner_decision');
}
