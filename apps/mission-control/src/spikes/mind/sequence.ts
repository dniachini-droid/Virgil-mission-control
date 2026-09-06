import type { DomainEvent } from '@virgil/agent-contracts';
import { mindSequence } from '@virgil/test-fixtures';
import { type AnimationRefusal, animationFor } from '@virgil/visual-language';
import type { CameraPose } from '../../world/CameraRig.js';

export interface MindStep {
  id: string;
  title: string;
  event?: DomainEvent;
  refusal?: AnimationRefusal;
  durationMs: number;
  camera: keyof typeof cameras;
  epistemic: string;
  note: string;
}

export const cameras = {
  overview: { position: [-4.5, 8, 22.5], target: [-3.5, 1.6, -1.5] },
  gateway: { position: [-19, 4.5, 11], target: [-13, 1.8, 2.4] },
  archive: { position: [-12.5, 3.8, 8.5], target: [-8.6, 1.6, 0.4] },
  forge: { position: [1.4, 4.4, 8.8], target: [0.4, 2.0, 0] },
  galaxy: { position: [6, 6.5, 14], target: [-1, 4, -8] },
  contested: { position: [9.5, 3.8, 7.5], target: [7.4, 1.9, 0.6] },
} satisfies Record<string, CameraPose>;

const events = mindSequence();
const byType = (type: string, n = 0) => events.filter((e) => e.type === type)[n];

function step(
  id: string,
  title: string,
  event: DomainEvent | undefined,
  camera: MindStep['camera'],
  epistemic: string,
  note: string,
): MindStep {
  if (!event) return { id, title, durationMs: 900, camera, epistemic, note };
  const r = animationFor(event);
  if ('refusal' in r)
    return { id, title, event, refusal: r.refusal, durationMs: 220, camera, epistemic, note };
  return { id, title, event, durationMs: r.mapping.fullMotion.durationMs, camera, epistemic, note };
}

export const mindSteps: MindStep[] = [
  step(
    'overview',
    'the Mind',
    undefined,
    'overview',
    'durable_compiled_knowledge',
    'Archive Nebula on the left (sealed sources), Synaptic Forge in the centre (proposals), Living Knowledge Galaxy on the right (durable structures). Not a folder browser.',
  ),
  step(
    'arrive',
    'source arrival',
    byType('run_record_deposited'),
    'gateway',
    'immutable_raw_evidence',
    'A verified run artifact crosses the gateway. It is evidence at the threshold, not a source record and not knowledge.',
  ),
  step(
    'record',
    'raw record',
    byType('raw_source_added'),
    'archive',
    'immutable_raw_evidence',
    'The transmission becomes a source object with identity, canonical path, provenance and ingestion state.',
  ),
  step(
    'hash',
    'hashed and sealed',
    byType('raw_source_hashed'),
    'archive',
    'immutable_raw_evidence',
    'The content hash engraves onto the object and the seal closes. From now on it only projects; it never opens.',
  ),
  step(
    'read',
    'non-destructive read',
    byType('raw_source_read'),
    'archive',
    'immutable_raw_evidence',
    'A light projection emerges beside the unchanged source. The original does not move.',
  ),
  step(
    'propose',
    'compilation proposed',
    byType('knowledge_compilation_proposed'),
    'forge',
    'ai_generated_hypothesis',
    'Concept fragments separate from the projection into the Forge as translucent proposals with dashed tethers to their sources.',
  ),
  step(
    'tether',
    'provenance tether',
    byType('provenance_tether_created'),
    'forge',
    'deterministically_verified_fact',
    'A complete tether forms from the claim to the verified run record and the commission. The claim gains only the stability its authority class allows.',
  ),
  step(
    'contest',
    'contested claim',
    byType('claim_contested'),
    'contested',
    'contested_claim',
    'The bloom claim conflicts with a supported art-bible claim. Both stay separately inspectable inside an interference field; nothing is averaged away.',
  ),
  step(
    'durable',
    'durable node',
    byType('wiki_page_created'),
    'galaxy',
    'durable_compiled_knowledge',
    'After verification approval, the supported fragments assemble into a durable structure with its tethers, compiler identity, dates and authority class.',
  ),
  step(
    'scan',
    'Mind Scan finding',
    byType('wiki_lint_finding_raised'),
    'contested',
    'unverified_claim',
    'One coherent wave crosses the galaxy once; a diagnostic beacon attaches to the contested pair with a tether to its evidence. The scan proposes; it does not rewrite.',
  ),
];

export const mindDurations = mindSteps.map((s) => s.durationMs);
