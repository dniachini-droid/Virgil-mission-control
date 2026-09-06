import type { DomainEvent } from '@virgil/agent-contracts';
import { passingRun } from '@virgil/test-fixtures';
import { type AnimationRefusal, animationFor, tokens } from '@virgil/visual-language';
import type { CameraPose } from '../../world/CameraRig.js';

export interface FoundryStep {
  id: string;
  title: string;
  event?: DomainEvent;
  refusal?: AnimationRefusal;
  durationMs: number;
  camera: keyof typeof cameras;
  candidateState: keyof typeof tokens.stateForm;
  note: string;
}

export const cameras = {
  overview: { position: [0, 26, 54], target: [2, 0, -2] },
  bench: { position: [-12, 4.6, 10.5], target: [-14.5, 1.1, 0.2] },
  cradle: { position: [-7.5, 6, 9.5], target: [-14, 1.8, 0] },
  lane: { position: [4, 9, 16], target: [10, 3, -14] },
  remote: { position: [22, 9, -14], target: [30, 5, -30] },
  corridor: { position: [-4, 7, 22], target: [-2, 1, 6] },
  chamber: { position: [8, 5, 22], target: [10, 1.2, 12] },
} satisfies Record<string, CameraPose>;

const events = passingRun();
const byType = (type: string, n = 0) => events.filter((e) => e.type === type)[n];

function step(
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

/** A tampered event: a push confirmation with no remote evidence. The grammar must refuse it. */
const tampered: DomainEvent = {
  ...(byType('candidate_pushed') as DomainEvent),
  eventId: 'tampered-push',
  seq: 999,
  evidence: [],
} as DomainEvent;

export const foundrySteps: FoundryStep[] = [
  step(
    'overview',
    'station',
    undefined,
    'overview',
    'BUILDING',
    'One project station with its isolated worktree bay, the Prover chamber, the Keeper station across a gap, and the remote station beyond the gulf. Nothing moves without an event.',
  ),
  step(
    'read',
    'file read',
    byType('file_read'),
    'bench',
    'BUILDING',
    'A narrow inspection beam opens the module as a cross-section in place. Reading never resembles editing.',
  ),
  step(
    'search',
    'search',
    byType('repository_searched'),
    'bench',
    'BUILDING',
    'A structured pulse sweeps only the authorised directory scope; the scope is visible.',
  ),
  step(
    'edit',
    'file edit',
    byType('file_modified'),
    'bench',
    'BUILDING',
    'The module separates into unchanged structure and a diff plane; removed material streams to the audit vent. Local, unsealed, not a commit.',
  ),
  step(
    'unstaged',
    'unstaged',
    byType('file_created'),
    'bench',
    'BUILDING',
    'A second module is fabricated; both hover around the bench with diff markers. They are not cargo.',
  ),
  step(
    'staged',
    'staging cradle',
    byType('changes_staged'),
    'cradle',
    'BUILDING',
    'Approved modules rise into the magnetic cradle. Out-of-boundary files would be repelled and marked.',
  ),
  step(
    'commit',
    'sealed commit',
    byType('candidate_committed'),
    'cradle',
    'BUILDING',
    'The assembly compresses into a sealed capsule; the short SHA ignites on the hull. A candidate, not a verified artifact.',
  ),
  step(
    'push',
    'push transit',
    byType('push_started'),
    'lane',
    'BUILDING',
    'The mass-driver lane charges; the transmission enters transit while local and remote beacons stay out of phase.',
  ),
  step(
    'pushed',
    'remote confirmed',
    byType('candidate_pushed'),
    'remote',
    'BUILDING',
    'Only the remote ref evidence phase-locks the beacons and materialises the registered capsule at the remote dock.',
  ),
  step(
    'handoff',
    'evidence-backed handoff',
    byType('handoff_started'),
    'corridor',
    'BUILDER_REPORTED_COMPLETE',
    'The sealed capsule travels the named corridor to the Prover. No authority token travels: the grant is a separate event.',
  ),
  step(
    'tampered',
    'refused: push without evidence',
    tampered,
    'overview',
    'BUILDER_REPORTED_COMPLETE',
    'A push confirmation offered without remote evidence. The grammar refuses it: nothing moves, and the refusal is itself visible.',
  ),
];

export const foundryDurations = foundrySteps.map((s) => s.durationMs);
