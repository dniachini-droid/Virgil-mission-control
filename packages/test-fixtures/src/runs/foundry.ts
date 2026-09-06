import type { DomainEvent } from '@virgil/agent-contracts';
import { at, BASE_SHA, HEAD_SHA, HEAD_SHA_2, HEAD_SHA_3, MERGE_SHA, sha } from '../ids.js';

type Actor = DomainEvent['actor'];
const owner: Actor = { kind: 'owner', displayName: 'Owner' };
const virgil: Actor = { kind: 'virgil', roleId: 'virgil', sessionId: 'sess-virgil' };
const fab: Actor = { kind: 'agent', roleId: 'fabricator', sessionId: 'sess-fab-1' };
const fab2: Actor = { kind: 'agent', roleId: 'fabricator', sessionId: 'sess-fab-2' };
const prover: Actor = { kind: 'agent', roleId: 'prover', sessionId: 'sess-prover-1' };
const keeper: Actor = { kind: 'agent', roleId: 'keeper', sessionId: 'sess-keeper-1' };
const keeper2: Actor = { kind: 'agent', roleId: 'keeper', sessionId: 'sess-keeper-2' };
const arbiter: Actor = { kind: 'agent', roleId: 'arbiter', sessionId: 'sess-arbiter-1' };
const git: Actor = { kind: 'git' };
const github: Actor = { kind: 'github' };
const system: Actor = { kind: 'system' };

type Ev = { kind: DomainEvent['evidence'][number]['kind']; ref: string; hash?: string };
const ev = (kind: Ev['kind'], ref: string, hash?: string): Ev =>
  hash ? { kind, ref, hash } : { kind, ref };

/** Builds a strictly ordered operational event stream. */
export class RunBuilder {
  private seq = 0;
  readonly events: DomainEvent[] = [];
  constructor(private readonly runId: string) {}
  add(
    type: string,
    actor: Actor,
    payload: Record<string, unknown>,
    evidence: Ev[],
    extra: {
      grant?: string;
      causedBy?: string;
      durability?: 'durable_audit' | 'replayable_operational';
    } = {},
  ): string {
    const seq = this.seq++;
    const eventId = `${this.runId}-e${String(seq).padStart(3, '0')}`;
    const event = {
      eventId,
      seq,
      streamId: this.runId,
      authority: 'operational',
      type,
      occurredAt: at(seq),
      recordedAt: at(seq),
      actor,
      evidence,
      durability: extra.durability ?? 'durable_audit',
      payload,
      ...(extra.grant ? { authorityGrantId: extra.grant } : {}),
      ...(extra.causedBy ? { causedBy: extra.causedBy } : {}),
    } as unknown as DomainEvent;
    this.events.push(event);
    return eventId;
  }
}

const FILE = 'apps/mission-control/src/world/Capsule.tsx';
const TEST = 'apps/mission-control/src/world/Capsule.test.tsx';

/** Common prologue: idea → scope → plan → work order → grant → branch → worktree → fabricator at work → sealed commit → push → PR → handoff to Prover. */
function prologue(b: RunBuilder, headSha: string): void {
  b.add(
    'idea_received',
    owner,
    { ideaId: 'idea-1', summary: 'Sealed capsule shows short SHA on hull' },
    [ev('event', 'owner-message-1')],
  );
  b.add(
    'scope_proposed',
    { kind: 'agent', roleId: 'cartographer', sessionId: 'sess-carto-1' },
    { contractId: 'AC-1' },
    [ev('code_path', 'docs/product/acceptance/AC-1.md')],
  );
  b.add('scope_approved', owner, { contractId: 'AC-1', decisionId: 'OD-0002' }, [
    ev('owner_decision', 'OD-0002'),
  ]);
  b.add(
    'plan_completed',
    { kind: 'agent', roleId: 'architect', sessionId: 'sess-arch-1' },
    { planId: 'PLAN-1', contractId: 'AC-1', verdict: 'go' },
    [ev('code_path', 'docs/architecture/plans/PLAN-1.md')],
  );
  b.add('work_order_created', virgil, { workOrderId: 'WO-1', contractId: 'AC-1' }, [
    ev('event', 'PLAN-1'),
  ]);
  b.add(
    'authority_granted',
    virgil,
    {
      grantId: 'G-fab-1',
      roleId: 'fabricator',
      tier: 'TIER_2',
      permittedPaths: ['apps/mission-control/src/world/**'],
      expiresAt: at(600),
    },
    [ev('owner_decision', 'OD-0002')],
  );
  b.add(
    'branch_created',
    git,
    { branch: 'feature/capsule-sha', baseSha: BASE_SHA },
    [ev('git_ref', 'refs/heads/feature/capsule-sha')],
    { grant: 'G-fab-1' },
  );
  b.add(
    'worktree_created',
    git,
    { worktree: '.worktrees/capsule-sha', branch: 'feature/capsule-sha', baseSha: BASE_SHA },
    [ev('git_ref', '.worktrees/capsule-sha')],
    { grant: 'G-fab-1' },
  );
  b.add(
    'agent_assigned',
    virgil,
    { assignmentId: 'ASG-1', roleId: 'fabricator', stage: 'build', grantId: 'G-fab-1' },
    [ev('event', 'WO-1')],
  );
  b.add(
    'agent_started',
    fab,
    { roleId: 'fabricator', sessionId: 'sess-fab-1', grantId: 'G-fab-1' },
    [ev('event', 'ASG-1')],
    { grant: 'G-fab-1' },
  );
  b.add(
    'file_read',
    fab,
    { roleId: 'fabricator', path: FILE },
    [ev('code_path', FILE, `sha256:${sha('capsule-v0').padEnd(64, '0')}`)],
    { grant: 'G-fab-1', durability: 'replayable_operational' },
  );
  b.add(
    'repository_searched',
    fab,
    {
      roleId: 'fabricator',
      scope: 'directory',
      scopePath: 'apps/mission-control/src/world',
      patternClass: 'identifier',
      matchCount: 3,
    },
    [ev('command_output', 'search-1')],
    { grant: 'G-fab-1', durability: 'replayable_operational' },
  );
  b.add(
    'file_modified',
    fab,
    {
      roleId: 'fabricator',
      path: FILE,
      added: 18,
      removed: 4,
      hashBefore: `sha256:${sha('capsule-v0').padEnd(64, '0')}`,
      hashAfter: `sha256:${sha('capsule-v1').padEnd(64, '0')}`,
    },
    [ev('diff', `${FILE}@working`)],
    { grant: 'G-fab-1', durability: 'replayable_operational' },
  );
  b.add(
    'file_created',
    fab,
    {
      roleId: 'fabricator',
      path: TEST,
      bytes: 912,
      hash: `sha256:${sha('test-v1').padEnd(64, '0')}`,
    },
    [ev('code_path', TEST)],
    { grant: 'G-fab-1', durability: 'replayable_operational' },
  );
  b.add(
    'command_started',
    fab,
    {
      roleId: 'fabricator',
      commandId: 'cmd-1',
      commandClass: 'unit-test',
      target: 'apps/mission-control',
    },
    [],
    { grant: 'G-fab-1', durability: 'replayable_operational' },
  );
  b.add(
    'command_completed',
    fab,
    { roleId: 'fabricator', commandId: 'cmd-1', exitCode: 0, elapsedMs: 4200 },
    [ev('command_output', 'cmd-1')],
    { grant: 'G-fab-1', durability: 'replayable_operational' },
  );
  b.add(
    'changes_staged',
    fab,
    { roleId: 'fabricator', paths: [FILE, TEST], rejectedOutOfBoundary: [] },
    [ev('git_ref', 'index')],
    { grant: 'G-fab-1', durability: 'replayable_operational' },
  );
  b.add(
    'candidate_committed',
    git,
    {
      artifactId: 'ART-1',
      lineageId: 'LIN-1',
      headSha,
      parentSha: BASE_SHA,
      baseSha: BASE_SHA,
      manifest: [FILE, TEST],
      branch: 'feature/capsule-sha',
    },
    [ev('git_object', headSha)],
    { grant: 'G-fab-1' },
  );
  b.add('push_started', fab, { headSha, branch: 'feature/capsule-sha', remote: 'origin' }, [], {
    grant: 'G-fab-1',
    durability: 'replayable_operational',
  });
  b.add(
    'candidate_pushed',
    github,
    { headSha, remoteSha: headSha, branch: 'feature/capsule-sha', remote: 'origin' },
    [ev('git_ref', `origin/feature/capsule-sha@${headSha}`)],
    { grant: 'G-fab-1' },
  );
  b.add('pr_opened', github, { number: 41, headSha, draft: true }, [ev('pull_request', '41')], {
    grant: 'G-fab-1',
  });
  b.add(
    'handoff_prepared',
    fab,
    {
      handoffId: 'H-1',
      fromRole: 'fabricator',
      toRole: 'prover',
      stage: 'verification',
      sealed: true,
      missing: [],
    },
    [ev('git_object', headSha), ev('pull_request', '41')],
    { grant: 'G-fab-1' },
  );
  b.add(
    'agent_result_received',
    fab,
    {
      resultId: 'R-fab-1',
      roleId: 'fabricator',
      sessionId: 'sess-fab-1',
      claimedComplete: true,
      stopReason: 'handoff_prepared',
    },
    [ev('event', 'H-1')],
    { grant: 'G-fab-1' },
  );
  b.add(
    'handoff_started',
    virgil,
    { handoffId: 'H-1', fromRole: 'fabricator', toRole: 'prover', stage: 'verification' },
    [ev('event', 'H-1')],
  );
  b.add(
    'authority_granted',
    virgil,
    {
      grantId: 'G-prover-1',
      roleId: 'prover',
      tier: 'TIER_2',
      permittedPaths: [TEST],
      expiresAt: at(600),
    },
    [ev('owner_decision', 'OD-0002')],
  );
  b.add(
    'agent_started',
    prover,
    { roleId: 'prover', sessionId: 'sess-prover-1', grantId: 'G-prover-1' },
    [ev('event', 'H-1')],
    { grant: 'G-prover-1' },
  );
  b.add(
    'handoff_received',
    prover,
    { handoffId: 'H-1', toRole: 'prover', verified: { sha: true, manifest: true, identity: true } },
    [ev('git_object', headSha)],
    { grant: 'G-prover-1' },
  );
}

function verification(
  b: RunBuilder,
  headSha: string,
  opts: { failUnit?: boolean; verificationId: string },
): void {
  const v = opts.verificationId;
  b.add(
    'verification_started',
    prover,
    { verificationId: v, headSha, requiredChecks: ['typecheck', 'unit', 'lint'] },
    [ev('git_object', headSha)],
    { grant: 'G-prover-1' },
  );
  b.add(
    'check_started',
    prover,
    {
      verificationId: v,
      checkId: 'typecheck',
      name: 'tsc',
      required: true,
      parallelGroup: 'static',
    },
    [],
    { grant: 'G-prover-1', durability: 'replayable_operational' },
  );
  b.add(
    'check_started',
    prover,
    { verificationId: v, checkId: 'lint', name: 'biome', required: true, parallelGroup: 'static' },
    [],
    { grant: 'G-prover-1', durability: 'replayable_operational' },
  );
  b.add(
    'check_passed',
    prover,
    {
      verificationId: v,
      checkId: 'typecheck',
      name: 'tsc',
      required: true,
      exitCode: 0,
      elapsedMs: 3100,
    },
    [ev('check_run', `${v}/typecheck`)],
    { grant: 'G-prover-1' },
  );
  b.add(
    'check_passed',
    prover,
    {
      verificationId: v,
      checkId: 'lint',
      name: 'biome',
      required: true,
      exitCode: 0,
      elapsedMs: 800,
    },
    [ev('check_run', `${v}/lint`)],
    { grant: 'G-prover-1' },
  );
  b.add(
    'check_started',
    prover,
    { verificationId: v, checkId: 'unit', name: 'vitest', required: true },
    [],
    { grant: 'G-prover-1', durability: 'replayable_operational' },
  );
  if (opts.failUnit) {
    b.add(
      'check_failed',
      prover,
      {
        verificationId: v,
        checkId: 'unit',
        name: 'vitest',
        required: true,
        exitCode: 1,
        failedSurface: `${FILE}:42`,
      },
      [ev('check_run', `${v}/unit`)],
      { grant: 'G-prover-1' },
    );
  } else {
    b.add(
      'check_passed',
      prover,
      {
        verificationId: v,
        checkId: 'unit',
        name: 'vitest',
        required: true,
        exitCode: 0,
        elapsedMs: 5200,
      },
      [ev('check_run', `${v}/unit`)],
      { grant: 'G-prover-1' },
    );
  }
  b.add(
    'check_skipped',
    prover,
    {
      verificationId: v,
      checkId: 'visual-regression',
      name: 'playwright-visual',
      required: false,
      reason: 'no GPU in verification container',
    },
    [ev('check_run', `${v}/visual-regression`)],
    { grant: 'G-prover-1' },
  );
  b.add(
    'verification_completed',
    prover,
    {
      verificationId: v,
      headSha,
      results: {
        typecheck: 'passed',
        lint: 'passed',
        unit: opts.failUnit ? 'failed' : 'passed',
        'visual-regression': 'skipped',
      },
      allRequiredCompleted: true,
      anyRequiredFailed: !!opts.failUnit,
      signature: `mv:${sha(`${v}-${headSha}`).slice(0, 16)}`,
    },
    [ev('check_run', v)],
    { grant: 'G-prover-1' },
  );
}

function handoffToKeeper(
  b: RunBuilder,
  headSha: string,
  id: string,
  reviewer: Actor,
  grantId: string,
): void {
  b.add(
    'handoff_prepared',
    prover,
    {
      handoffId: id,
      fromRole: 'prover',
      toRole: 'keeper',
      stage: 'review',
      sealed: true,
      missing: [],
    },
    [ev('git_object', headSha)],
    { grant: 'G-prover-1' },
  );
  b.add(
    'handoff_started',
    virgil,
    { handoffId: id, fromRole: 'prover', toRole: 'keeper', stage: 'review' },
    [ev('event', id)],
  );
  b.add(
    'authority_granted',
    virgil,
    { grantId, roleId: 'keeper', tier: 'TIER_2', permittedPaths: [], expiresAt: at(600) },
    [ev('owner_decision', 'OD-0002')],
  );
  b.add(
    'agent_started',
    reviewer,
    { roleId: 'keeper', sessionId: reviewer.sessionId, grantId },
    [ev('event', id)],
    { grant: grantId },
  );
  b.add(
    'handoff_received',
    reviewer,
    { handoffId: id, toRole: 'keeper', verified: { sha: true, manifest: true, identity: true } },
    [ev('git_object', headSha)],
    { grant: grantId },
  );
}

export function passingRun(): DomainEvent[] {
  const b = new RunBuilder('run-pass');
  prologue(b, HEAD_SHA);
  verification(b, HEAD_SHA, { verificationId: 'V-1' });
  handoffToKeeper(b, HEAD_SHA, 'H-2', keeper, 'G-keeper-1');
  b.add(
    'review_started',
    keeper,
    {
      reportId: 'RR-1',
      reviewedSha: HEAD_SHA,
      reviewerRole: 'keeper',
      reviewerSession: 'sess-keeper-1',
      independentOfSessions: ['sess-fab-1', 'sess-prover-1'],
    },
    [ev('git_object', HEAD_SHA), ev('diff', `${BASE_SHA}..${HEAD_SHA}`)],
    { grant: 'G-keeper-1' },
  );
  b.add(
    'finding_raised',
    keeper,
    {
      findingId: 'F-1',
      reportId: 'RR-1',
      severity: 'minor',
      blocking: false,
      surface: `${FILE}:17`,
      criterionId: 'AC-1.3',
      reproduced: true,
    },
    [ev('diff', `${FILE}:17`)],
    { grant: 'G-keeper-1' },
  );
  b.add(
    'review_passed',
    keeper,
    {
      reportId: 'RR-1',
      reviewedSha: HEAD_SHA,
      verdict: 'PASS_WITH_NON_BLOCKING_FINDINGS',
      findingIds: ['F-1'],
    },
    [ev('review_report', 'RR-1')],
    { grant: 'G-keeper-1' },
  );
  b.add('safe_to_merge', system, { lineageId: 'LIN-1', headSha: HEAD_SHA, gateReportId: 'GR-1' }, [
    ev('gate_decision', 'GR-1'),
  ]);
  b.add('owner_decision', owner, { decisionId: 'OD-0003', kind: 'merge' }, [
    ev('owner_decision', 'OD-0003'),
  ]);
  b.add(
    'merged_by_owner',
    owner,
    {
      lineageId: 'LIN-1',
      headSha: HEAD_SHA,
      mergeSha: MERGE_SHA,
      decisionId: 'OD-0003',
      targetBranch: 'main',
    },
    [ev('git_object', MERGE_SHA), ev('owner_decision', 'OD-0003')],
  );
  b.add('owner_decision', owner, { decisionId: 'OD-0004', kind: 'deployment' }, [
    ev('owner_decision', 'OD-0004'),
  ]);
  b.add(
    'deployment_started',
    owner,
    { deploymentId: 'DEP-1', mergeSha: MERGE_SHA, target: 'staging', decisionId: 'OD-0004' },
    [ev('owner_decision', 'OD-0004')],
  );
  b.add('deployed', system, { deploymentId: 'DEP-1', mergeSha: MERGE_SHA, target: 'staging' }, [
    ev('command_output', 'deploy-1'),
  ]);
  return b.events;
}

/** Blocked by a failed required check, quarantined, adjudicated, repaired once, re-verified, freshly re-reviewed, eligible. Airlock stays closed. */
export function blockedThenRepairedRun(): DomainEvent[] {
  const b = new RunBuilder('run-blocked');
  prologue(b, HEAD_SHA);
  verification(b, HEAD_SHA, { verificationId: 'V-1', failUnit: true });
  b.add(
    'candidate_quarantined',
    virgil,
    { lineageId: 'LIN-1', headSha: HEAD_SHA, reason: 'proven_defect', findingIds: [] },
    [ev('check_run', 'V-1/unit')],
  );
  b.add(
    'finding_raised',
    prover,
    {
      findingId: 'F-2',
      reportId: 'V-1',
      severity: 'blocking',
      blocking: true,
      surface: `${FILE}:42`,
      criterionId: 'AC-1.2',
      reproduced: true,
    },
    [ev('check_run', 'V-1/unit')],
    { grant: 'G-prover-1' },
  );
  b.add(
    'adjudication_completed',
    arbiter,
    {
      adjudicationId: 'ADJ-1',
      acceptedFindingIds: ['F-2'],
      rejectedFindingIds: [],
      repairContractId: 'RC-1',
      repairCycleCount: 1,
    },
    [ev('check_run', 'V-1/unit')],
  );
  b.add(
    'repair_authorised',
    virgil,
    {
      repairContractId: 'RC-1',
      lineageId: 'LIN-1',
      reviewedSha: HEAD_SHA,
      acceptedFindingIds: ['F-2'],
      permittedFiles: [FILE],
      repairCycleCount: 1,
    },
    [ev('adjudication', 'ADJ-1')],
  );
  b.add(
    'authority_granted',
    virgil,
    {
      grantId: 'G-fab-2',
      roleId: 'fabricator',
      tier: 'TIER_2',
      permittedPaths: [FILE],
      expiresAt: at(600),
    },
    [ev('adjudication', 'ADJ-1')],
  );
  b.add(
    'repair_started',
    fab2,
    { repairContractId: 'RC-1', roleId: 'fabricator', sessionId: 'sess-fab-2' },
    [ev('event', 'RC-1')],
    { grant: 'G-fab-2' },
  );
  b.add(
    'agent_started',
    fab2,
    { roleId: 'fabricator', sessionId: 'sess-fab-2', grantId: 'G-fab-2' },
    [ev('event', 'RC-1')],
    { grant: 'G-fab-2' },
  );
  b.add(
    'file_modified',
    fab2,
    {
      roleId: 'fabricator',
      path: FILE,
      added: 2,
      removed: 2,
      hashBefore: `sha256:${sha('capsule-v1').padEnd(64, '0')}`,
      hashAfter: `sha256:${sha('capsule-v2').padEnd(64, '0')}`,
    },
    [ev('diff', `${FILE}@working`)],
    { grant: 'G-fab-2', durability: 'replayable_operational' },
  );
  b.add(
    'changes_staged',
    fab2,
    { roleId: 'fabricator', paths: [FILE], rejectedOutOfBoundary: [] },
    [ev('git_ref', 'index')],
    { grant: 'G-fab-2', durability: 'replayable_operational' },
  );
  b.add(
    'candidate_committed',
    git,
    {
      artifactId: 'ART-2',
      lineageId: 'LIN-1',
      headSha: HEAD_SHA_2,
      parentSha: HEAD_SHA,
      baseSha: BASE_SHA,
      manifest: [FILE],
      branch: 'feature/capsule-sha',
    },
    [ev('git_object', HEAD_SHA_2)],
    { grant: 'G-fab-2' },
  );
  b.add(
    'repair_completed',
    fab2,
    { repairContractId: 'RC-1', lineageId: 'LIN-1', previousSha: HEAD_SHA, newSha: HEAD_SHA_2 },
    [ev('git_object', HEAD_SHA_2)],
    { grant: 'G-fab-2' },
  );
  b.add(
    'candidate_pushed',
    github,
    { headSha: HEAD_SHA_2, remoteSha: HEAD_SHA_2, branch: 'feature/capsule-sha', remote: 'origin' },
    [ev('git_ref', `origin/feature/capsule-sha@${HEAD_SHA_2}`)],
    { grant: 'G-fab-2' },
  );
  verification(b, HEAD_SHA_2, { verificationId: 'V-2' });
  handoffToKeeper(b, HEAD_SHA_2, 'H-3', keeper2, 'G-keeper-2');
  b.add(
    'review_started',
    keeper2,
    {
      reportId: 'RR-2',
      reviewedSha: HEAD_SHA_2,
      reviewerRole: 'keeper',
      reviewerSession: 'sess-keeper-2',
      independentOfSessions: ['sess-fab-1', 'sess-fab-2', 'sess-prover-1'],
    },
    [ev('git_object', HEAD_SHA_2)],
    { grant: 'G-keeper-2' },
  );
  b.add(
    'review_passed',
    keeper2,
    { reportId: 'RR-2', reviewedSha: HEAD_SHA_2, verdict: 'PASS', findingIds: [] },
    [ev('review_report', 'RR-2')],
    { grant: 'G-keeper-2' },
  );
  b.add(
    'safe_to_merge',
    system,
    { lineageId: 'LIN-1', headSha: HEAD_SHA_2, gateReportId: 'GR-2' },
    [ev('gate_decision', 'GR-2')],
  );
  return b.events;
}

/** Repair limit: cycle 2 without owner → rejected; owner decision → cycle 2 accepted; cycle 3 → rejected even with owner. */
export function repairLimitRun(): DomainEvent[] {
  const b = new RunBuilder('run-limit');
  prologue(b, HEAD_SHA);
  verification(b, HEAD_SHA, { verificationId: 'V-1', failUnit: true });
  b.add(
    'repair_authorised',
    virgil,
    {
      repairContractId: 'RC-1',
      lineageId: 'LIN-1',
      reviewedSha: HEAD_SHA,
      acceptedFindingIds: ['F-2'],
      permittedFiles: [FILE],
      repairCycleCount: 1,
    },
    [ev('adjudication', 'ADJ-1')],
  );
  b.add(
    'candidate_committed',
    git,
    {
      artifactId: 'ART-2',
      lineageId: 'LIN-1',
      headSha: HEAD_SHA_2,
      parentSha: HEAD_SHA,
      baseSha: BASE_SHA,
      manifest: [FILE],
      branch: 'feature/capsule-sha',
    },
    [ev('git_object', HEAD_SHA_2)],
  );
  b.add(
    'repair_completed',
    fab2,
    { repairContractId: 'RC-1', lineageId: 'LIN-1', previousSha: HEAD_SHA, newSha: HEAD_SHA_2 },
    [ev('git_object', HEAD_SHA_2)],
  );
  b.add(
    'candidate_pushed',
    github,
    { headSha: HEAD_SHA_2, remoteSha: HEAD_SHA_2, branch: 'feature/capsule-sha', remote: 'origin' },
    [ev('git_ref', `origin@${HEAD_SHA_2}`)],
  );
  verification(b, HEAD_SHA_2, { verificationId: 'V-2', failUnit: true });
  // cycle 2 without owner authority: must be rejected
  b.add(
    'repair_authorised',
    virgil,
    {
      repairContractId: 'RC-2',
      lineageId: 'LIN-1',
      reviewedSha: HEAD_SHA_2,
      acceptedFindingIds: ['F-3'],
      permittedFiles: [FILE],
      repairCycleCount: 2,
    },
    [ev('adjudication', 'ADJ-2')],
  );
  b.add(
    'owner_decision_required',
    virgil,
    {
      questionId: 'Q-1',
      question: 'Authorise a second repair cycle?',
      consequence: 'Without it the candidate stays quarantined.',
      recommendedDefault: 'Authorise one further cycle',
      haltedStage: 'repair',
    },
    [ev('adjudication', 'ADJ-2')],
  );
  b.add(
    'owner_decision',
    owner,
    { decisionId: 'OD-0005', kind: 'additional_repair_round', resumesTo: 'BLOCKED' },
    [ev('owner_decision', 'OD-0005')],
  );
  b.add(
    'repair_authorised',
    virgil,
    {
      repairContractId: 'RC-2',
      lineageId: 'LIN-1',
      reviewedSha: HEAD_SHA_2,
      acceptedFindingIds: ['F-3'],
      permittedFiles: [FILE],
      repairCycleCount: 2,
      ownerDecisionId: 'OD-0005',
    },
    [ev('adjudication', 'ADJ-2'), ev('owner_decision', 'OD-0005')],
  );
  b.add(
    'candidate_committed',
    git,
    {
      artifactId: 'ART-3',
      lineageId: 'LIN-1',
      headSha: HEAD_SHA_3,
      parentSha: HEAD_SHA_2,
      baseSha: BASE_SHA,
      manifest: [FILE],
      branch: 'feature/capsule-sha',
    },
    [ev('git_object', HEAD_SHA_3)],
  );
  b.add(
    'repair_completed',
    fab2,
    { repairContractId: 'RC-2', lineageId: 'LIN-1', previousSha: HEAD_SHA_2, newSha: HEAD_SHA_3 },
    [ev('git_object', HEAD_SHA_3)],
  );
  b.add(
    'candidate_pushed',
    github,
    { headSha: HEAD_SHA_3, remoteSha: HEAD_SHA_3, branch: 'feature/capsule-sha', remote: 'origin' },
    [ev('git_ref', `origin@${HEAD_SHA_3}`)],
  );
  verification(b, HEAD_SHA_3, { verificationId: 'V-3', failUnit: true });
  // cycle 3: rejected even with an owner decision id
  b.add(
    'repair_authorised',
    virgil,
    {
      repairContractId: 'RC-3',
      lineageId: 'LIN-1',
      reviewedSha: HEAD_SHA_3,
      acceptedFindingIds: ['F-4'],
      permittedFiles: [FILE],
      repairCycleCount: 3,
      ownerDecisionId: 'OD-0005',
    },
    [ev('adjudication', 'ADJ-3')],
  );
  return b.events;
}

/** Review passes, then the candidate changes: eligibility must be lost and safe_to_merge rejected. */
export function staleReviewRun(): DomainEvent[] {
  const b = new RunBuilder('run-stale');
  prologue(b, HEAD_SHA);
  verification(b, HEAD_SHA, { verificationId: 'V-1' });
  handoffToKeeper(b, HEAD_SHA, 'H-2', keeper, 'G-keeper-1');
  b.add(
    'review_started',
    keeper,
    {
      reportId: 'RR-1',
      reviewedSha: HEAD_SHA,
      reviewerRole: 'keeper',
      reviewerSession: 'sess-keeper-1',
      independentOfSessions: ['sess-fab-1'],
    },
    [ev('git_object', HEAD_SHA)],
    { grant: 'G-keeper-1' },
  );
  b.add(
    'review_passed',
    keeper,
    { reportId: 'RR-1', reviewedSha: HEAD_SHA, verdict: 'PASS', findingIds: [] },
    [ev('review_report', 'RR-1')],
    { grant: 'G-keeper-1' },
  );
  b.add(
    'candidate_changed_after_review',
    github,
    { lineageId: 'LIN-1', reviewedSha: HEAD_SHA, newSha: HEAD_SHA_2 },
    [ev('git_object', HEAD_SHA_2)],
  );
  b.add(
    'safe_to_merge',
    system,
    { lineageId: 'LIN-1', headSha: HEAD_SHA_2, gateReportId: 'GR-x' },
    [ev('gate_decision', 'GR-x')],
  );
  return b.events;
}

/** Authority violations that the reducer must reject. */
export function authorityViolationRun(): DomainEvent[] {
  const b = new RunBuilder('run-authority');
  prologue(b, HEAD_SHA);
  verification(b, HEAD_SHA, { verificationId: 'V-1' });
  // builder session attempts to review its own candidate
  b.add(
    'review_started',
    fab,
    {
      reportId: 'RR-bad',
      reviewedSha: HEAD_SHA,
      reviewerRole: 'keeper',
      reviewerSession: 'sess-fab-1',
      independentOfSessions: [],
    },
    [ev('git_object', HEAD_SHA)],
  );
  handoffToKeeper(b, HEAD_SHA, 'H-2', keeper, 'G-keeper-1');
  b.add(
    'review_started',
    keeper,
    {
      reportId: 'RR-1',
      reviewedSha: HEAD_SHA,
      reviewerRole: 'keeper',
      reviewerSession: 'sess-keeper-1',
      independentOfSessions: ['sess-fab-1'],
    },
    [ev('git_object', HEAD_SHA)],
    { grant: 'G-keeper-1' },
  );
  b.add(
    'review_passed',
    keeper,
    { reportId: 'RR-1', reviewedSha: HEAD_SHA, verdict: 'PASS', findingIds: [] },
    [ev('review_report', 'RR-1')],
    { grant: 'G-keeper-1' },
  );
  // merge attempted before safe_to_merge, and by a non-owner
  b.add(
    'merged_by_owner',
    virgil,
    {
      lineageId: 'LIN-1',
      headSha: HEAD_SHA,
      mergeSha: MERGE_SHA,
      decisionId: 'OD-none',
      targetBranch: 'main',
    },
    [ev('git_object', MERGE_SHA)],
  );
  b.add('safe_to_merge', system, { lineageId: 'LIN-1', headSha: HEAD_SHA, gateReportId: 'GR-1' }, [
    ev('gate_decision', 'GR-1'),
  ]);
  b.add(
    'merged_by_owner',
    virgil,
    {
      lineageId: 'LIN-1',
      headSha: HEAD_SHA,
      mergeSha: MERGE_SHA,
      decisionId: 'OD-0003',
      targetBranch: 'main',
    },
    [ev('git_object', MERGE_SHA)],
  );
  return b.events;
}

export const foundryRuns = {
  passingRun,
  blockedThenRepairedRun,
  repairLimitRun,
  staleReviewRun,
  authorityViolationRun,
};
