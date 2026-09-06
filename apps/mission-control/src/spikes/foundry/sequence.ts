import type { DomainEvent } from '@virgil/agent-contracts';
import { blockedThenRepairedRun, passingRun } from '@virgil/test-fixtures';
import { type AnimationRefusal, animationFor, tokens } from '@virgil/visual-language';
import { CAMERAS } from '../../world/foundry/layout.js';

export type RunVariant = 'success' | 'failed';

export interface FoundryStep {
  id: string;
  title: string;
  event?: DomainEvent;
  refusal?: AnimationRefusal;
  durationMs: number;
  camera: keyof typeof CAMERAS;
  candidateState: keyof typeof tokens.stateForm;
  note: string;
}

export const cameras = CAMERAS;

function stepFrom(
  id: string,
  title: string,
  event: DomainEvent | undefined,
  camera: FoundryStep['camera'],
  candidateState: FoundryStep['candidateState'],
  note: string,
): FoundryStep {
  if (!event) return { id, title, durationMs: 900, camera, candidateState, note };
  const r = animationFor(event);
  if ('refusal' in r)
    return { id, title, event, refusal: r.refusal, durationMs: 220, camera, candidateState, note };
  return {
    id,
    title,
    event,
    durationMs: r.mapping.fullMotion.durationMs,
    camera,
    candidateState,
    note,
  };
}

/**
 * The bounded Phase 0.5 sequence: file modification → unstaged modules → staging → commit
 * sealing → verification → evidence-backed handoff → independent Keeper review → non-blocking
 * finding → review pass → safe-to-merge eligibility outside the closed owner airlock. The failed
 * variant diverges at the unit check: failure, verification completed with a failure, quarantine.
 * Both end with a tampered push confirmation that the grammar refuses.
 */
export function foundrySequence(variant: RunVariant): FoundryStep[] {
  const events = variant === 'failed' ? blockedThenRepairedRun() : passingRun();
  const byType = (type: string, n = 0) => events.filter((e) => e.type === type)[n];
  const check = (type: string, checkId: string) =>
    events.find((e) => e.type === type && (e.payload as { checkId?: string }).checkId === checkId);
  const tampered: DomainEvent = {
    ...(byType('candidate_pushed') as DomainEvent),
    eventId: 'tampered-push',
    seq: 999,
    evidence: [],
  } as DomainEvent;

  const common: FoundryStep[] = [
    stepFrom(
      'overview',
      'the bay',
      undefined,
      'overview',
      'BUILDING',
      'One Foundry work bay: the Fabricator bench, cradle and commit press in the foreground; the Prover scanner in the middle; the Keeper platform across the gap; Virgil at the control centre with the closed owner airlock behind. Nothing works without an event.',
    ),
    stepFrom(
      'read',
      'file read',
      byType('file_read'),
      'bench',
      'BUILDING',
      'The Fabricator opens Capsule.tsx as a cross-section under the bench lamp. Reading never resembles editing.',
    ),
    stepFrom(
      'search',
      'search',
      byType('repository_searched'),
      'bench',
      'BUILDING',
      'A pulse sweeps only the authorised directory scope across the bench top.',
    ),
    stepFrom(
      'edit',
      'file edit',
      byType('file_modified'),
      'bench',
      'BUILDING',
      'The module lifts and splits into a diff plane; removed material streams to the audit vent; new parts arrive on the wand. Unstaged, unsealed.',
    ),
    stepFrom(
      'unstaged',
      'unstaged modules',
      byType('file_created'),
      'bench',
      'BUILDING',
      'A second module is fabricated from a frame. Both hover in the racks, marked unstaged.',
    ),
    stepFrom(
      'staged',
      'staging',
      byType('changes_staged'),
      'cradle',
      'BUILDING',
      'The Fabricator carries the modules into the magnetic cradle. Nothing out of boundary was offered; nothing is repelled.',
    ),
    stepFrom(
      'commit',
      'commit sealing',
      byType('candidate_committed'),
      'press',
      'BUILDING',
      'The press closes over the staged assembly and opens on a sealed capsule with its short SHA. A candidate, not a verified artifact.',
    ),
    stepFrom(
      'push',
      'push transit',
      byType('push_started'),
      'press',
      'BUILDING',
      'The press transmitter charges toward the allowlisted remote; local and remote beacons are out of phase.',
    ),
    stepFrom(
      'pushed',
      'remote confirmed',
      byType('candidate_pushed'),
      'press',
      'BUILDING',
      'Only the remote ref evidence phase-locks the beacons. The capsule is registered at origin.',
    ),
    stepFrom(
      'handoff-prover',
      'handoff → Prover',
      byType('handoff_started'),
      'lane',
      'BUILDER_REPORTED_COMPLETE',
      'Virgil opens one route. The sealed capsule rides the lane to the scanner dock. No authority token travels.',
    ),
    stepFrom(
      'received-prover',
      'received',
      byType('handoff_received'),
      'scanner',
      'BUILDER_REPORTED_COMPLETE',
      'The Prover verifies identity, SHA and manifest and docks the capsule. Receipt is not acceptance.',
    ),
    stepFrom(
      'verification',
      'verification',
      byType('verification_started'),
      'scanner',
      'VERIFICATION_INCOMPLETE',
      'The Prover deploys the diagnostic mast. One channel per required check waits unpowered.',
    ),
    stepFrom(
      'checks-static',
      'static checks',
      check('check_started', 'typecheck'),
      'scanner',
      'VERIFICATION_INCOMPLETE',
      'tsc and biome sweep together: parallel checks sweep at once so they never read as sequential.',
    ),
    stepFrom(
      'pass-typecheck',
      'tsc passed',
      check('check_passed', 'typecheck'),
      'scanner',
      'VERIFICATION_INCOMPLETE',
      'The typecheck arc closes into a stable band on the capsule.',
    ),
    stepFrom(
      'pass-lint',
      'biome passed',
      check('check_passed', 'lint'),
      'scanner',
      'VERIFICATION_INCOMPLETE',
      'The lint arc closes. Two bands; the unit channel is still dark.',
    ),
    stepFrom(
      'check-unit',
      'unit running',
      check('check_started', 'unit'),
      'scanner',
      'VERIFICATION_INCOMPLETE',
      'vitest sweeps alone, after the static group.',
    ),
  ];

  const unitPassed = stepFrom(
    'pass-unit',
    'unit passed',
    check('check_passed', 'unit'),
    'scanner',
    'VERIFICATION_INCOMPLETE',
    'Three bands. The optional visual check has not run.',
  );
  const unitFailed = stepFrom(
    'fail-unit',
    'unit FAILED',
    check('check_failed', 'unit'),
    'scanner',
    'VERIFICATION_INCOMPLETE',
    'The unit arc breaks at Capsule.tsx:42 with a fault tether to the check run. A failure is never dimmed.',
  );
  const skipped = stepFrom(
    'skip-visual',
    'visual skipped',
    check('check_skipped', 'visual-regression'),
    'scanner',
    'VERIFICATION_INCOMPLETE',
    'No GPU in the verification container: the visual channel stays unpowered, labelled with its reason. It never closes.',
  );

  if (variant === 'failed') {
    return [
      ...common,
      unitFailed,
      skipped,
      stepFrom(
        'verification-failed',
        'verification failed',
        byType('verification_completed'),
        'scanner',
        'BLOCKED',
        'All required checks completed and one failed. No signature engages. The Prover cannot fix the candidate.',
      ),
      stepFrom(
        'quarantined',
        'quarantined',
        byType('candidate_quarantined'),
        'scanner',
        'QUARANTINED',
        'Virgil quarantines the candidate: a rigid lattice closes over the dock and the corridor to the Keeper stays dark.',
      ),
      stepFrom(
        'tampered',
        'refused: push without evidence',
        tampered,
        'overview',
        'QUARANTINED',
        'A push confirmation offered without remote evidence. The grammar refuses it: nothing moves and the refusal is itself visible.',
      ),
    ];
  }
  return [
    ...common,
    unitPassed,
    skipped,
    stepFrom(
      'verified',
      'signature',
      byType('verification_completed'),
      'scanner',
      'READY_FOR_REVIEW',
      'Every required check completed and passed: the machine-verification signature engages over the dock.',
    ),
    stepFrom(
      'handoff-keeper',
      'handoff → Keeper',
      byType('handoff_started', 1),
      'gap',
      'READY_FOR_REVIEW',
      'Virgil opens the second route. The capsule crosses the visible gap to the separate inspection platform.',
    ),
    stepFrom(
      'received-keeper',
      'received',
      byType('handoff_received', 1),
      'keeper',
      'READY_FOR_REVIEW',
      'The Keeper verifies identity, SHA and manifest at the lectern. It has no arms: it cannot open the capsule.',
    ),
    stepFrom(
      'review',
      'independent review',
      byType('review_started'),
      'keeper',
      'REVIEW_IN_PROGRESS',
      'Drones orbit the exact SHA under the magnifier; the reviewer session is independent of the builder and prover sessions.',
    ),
    stepFrom(
      'finding',
      'non-blocking finding',
      byType('finding_raised'),
      'keeper',
      'REVIEW_IN_PROGRESS',
      'One finding pinned with a stable id and a reproduced surface. Minor, non-blocking; it persists.',
    ),
    stepFrom(
      'review-pass',
      'review pass',
      byType('review_passed'),
      'keeper',
      'PASS_WITH_NON_BLOCKING_FINDINGS',
      'The inspection ring closes with the pin attached. One verdict, from one reviewer, on one SHA.',
    ),
    stepFrom(
      'eligible',
      'safe to merge',
      byType('safe_to_merge'),
      'airlock',
      'SAFE_TO_MERGE',
      'The gate engine assembles the eligibility key on the pedestal outside the owner airlock. Virgil presents it. The airlock stays closed: safe-to-merge is not merged.',
    ),
    stepFrom(
      'tampered',
      'refused: push without evidence',
      tampered,
      'overview',
      'SAFE_TO_MERGE',
      'A push confirmation offered without remote evidence. The grammar refuses it: nothing moves and the refusal is itself visible.',
    ),
  ];
}

export const foundrySteps = foundrySequence('success');
export const foundryStepsFailed = foundrySequence('failed');
export const foundryDurations = foundrySteps.map((s) => s.durationMs);
