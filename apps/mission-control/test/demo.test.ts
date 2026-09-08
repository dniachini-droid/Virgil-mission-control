import { CandidateState } from '@virgil/agent-contracts';
import { describe, expect, it } from 'vitest';
import authority from '../../../constitution/authority.json' with { type: 'json' };
import { CLIP_FOR } from '../src/world/characters/VirgilRigged.js';
import { FACE_COLOUR, FACE_STYLE, faceAppearance } from '../src/world/characters/Visor.js';
import { ROLES } from '../src/world/room/cast.js';
import {
  BEATS,
  DEMO_LENGTH,
  demoAt,
  forcedState,
  loopLength,
  OUTCOMES,
  outcomeOf,
} from '../src/world/room/demo.js';
import { stateLines } from '../src/world/screens/ScreenBank.js';
import { virgilRiggedMetadata } from '../src/world/virgil/virgilRigged.js';

/**
 * The refusal is wired, the demonstration says what it is and depicts a
 * sequence that could happen, and a face under reduced motion is still a
 * face (KR-55).
 *
 * V8: the owner found that Virgil's screen said "awaiting review" while
 * the Fabricator built. The honesty band was true — nothing shown was
 * real — but an illustrative demonstration must still be **coherent**:
 * a sequence that could happen, in the words the constitution defines.
 * So every candidate state the demonstration shows is held to
 * `constitution/authority.json`'s `candidateStates`, and every step
 * between two states to its transition table, and the Fabricator never
 * reports a verdict.
 */

const transitions = authority.transitions as { from: string; to: string }[];

describe('the refusal', () => {
  it('is Angry_Ground_Stomp, and it is shipped', () => {
    expect(CLIP_FOR.blocked).toBe('Angry_Ground_Stomp');
    const shipped = virgilRiggedMetadata.reductions.clipsShipped.map((c) => c.name);
    expect(shipped).toContain('Angry_Ground_Stomp');
    expect(shipped).toContain('Idle_11');
    expect(shipped).toContain('Agree_Gesture');
    // The owner's direction: Running and Walking do not ship; nor the bind pose.
    expect(shipped).not.toContain('Running');
    expect(shipped).not.toContain('Walking');
    expect(shipped).not.toContain('restpose');
    expect(virgilRiggedMetadata.reductions.clipsDropped).toEqual(
      expect.arrayContaining(['Running', 'Walking', 'restpose']),
    );
  });

  it('plays on a BLOCKED verdict and only then — never on INSUFFICIENT_EVIDENCE', () => {
    const blocked = demoAt(BEATS.proverReported + 1, 1, true);
    expect(blocked.outcome).toBe('BLOCKED');
    expect(blocked.pose).toBe('blocked');
    expect(blocked.virgilFace).toBe('blocked');
    expect(blocked.cast.prover.report).toBe('BLOCKED');
    expect(blocked.content.verdict).toBe('BLOCKED');
    const passed = demoAt(BEATS.proverReported + 1, 0, true);
    expect(passed.pose).toBe('nod');
    expect(passed.virgilFace).toBe('passed');
    // Insufficient evidence is not a failure: no refusal, he waits.
    const insufficient = demoAt(BEATS.proverReported + 1, 2, true);
    expect(insufficient.outcome).toBe('INSUFFICIENT_EVIDENCE');
    expect(insufficient.pose).toBe('rest');
    expect(insufficient.virgilFace).toBe('attentive');
    expect(insufficient.cast.prover.report).toBe('INSUFFICIENT_EVIDENCE');
    expect(insufficient.cast.prover.face).not.toBe('blocked');
    for (let loop = 0; loop < 3; loop += 1) {
      for (let t = 0; t < loopLength(loop); t += 0.25) {
        const s = demoAt(t, loop, true);
        if (s.pose === 'blocked') expect(s.content.verdict).toBe('BLOCKED');
        if (s.virgilFace === 'blocked') expect(s.content.verdict).toBe('BLOCKED');
        // A blocked candidate does not vanish when he stops refusing: the slabs keep saying so.
        if (s.content.verdict === 'BLOCKED') expect(s.content.candidate).toBe('BLOCKED');
        if (s.content.verdict === 'INSUFFICIENT_EVIDENCE') expect(s.pose).not.toBe('blocked');
      }
    }
    expect(forcedState('blocked').pose).toBe('blocked');
  });
});

describe('the demonstration', () => {
  it('runs the three hops in order and rests at both ends', () => {
    expect(demoAt(0, 0, true).pose).toBe('rest');
    expect(demoAt(BEATS.handoffToFabricator + 1, 0, true).cast.fabricator.station).toBe(
      'RECEIVING',
    );
    expect(demoAt(BEATS.fabricatorWorking + 1, 0, true).cast.fabricator.station).toBe('WORKING');
    expect(demoAt(BEATS.fabricatorReported + 1, 0, true).cast.fabricator.report).toBe('COMPLETE');
    expect(demoAt(BEATS.handoffToProver + 1, 0, true).cast.prover.station).toBe('RECEIVING');
    expect(demoAt(BEATS.proverWorking + 1, 0, true).cast.prover.station).toBe('WORKING');
    expect(demoAt(BEATS.handoffToKeeper + 1, 0, true).cast.keeper.station).toBe('RECEIVING');
    expect(demoAt(BEATS.keeperWorking + 1, 0, true).cast.keeper.station).toBe('WORKING');
    expect(demoAt(BEATS.keeperReported + 1, 0, true).cast.keeper.report).toBe(
      'PASS_WITH_NON_BLOCKING_FINDINGS',
    );
    expect(demoAt(BEATS.keeperReported + 1, 1, true).pose).toBe('rest');
    expect(demoAt(DEMO_LENGTH - 0.01, 0, true).content.ownerGate).toBe(true);
    expect(loopLength(0)).toBe(BEATS.passEnd);
    expect(loopLength(1)).toBe(BEATS.otherEnd);
    expect(OUTCOMES.map((_, i) => outcomeOf(i))).toEqual(OUTCOMES);
  });

  it('gives the receiving beats real duration: six seconds each', () => {
    expect(BEATS.fabricatorWorking - BEATS.handoffToFabricator).toBeGreaterThanOrEqual(6);
    expect(BEATS.proverWorking - BEATS.handoffToProver).toBeGreaterThanOrEqual(6);
    expect(BEATS.keeperWorking - BEATS.handoffToKeeper).toBeGreaterThanOrEqual(6);
  });

  it('never lets the Fabricator report a verdict: a builder’s report is a claim', () => {
    for (let loop = 0; loop < 3; loop += 1) {
      for (let t = 0; t < loopLength(loop); t += 0.25) {
        const report = demoAt(t, loop, true).cast.fabricator.report;
        expect(['—', 'COMPLETE']).toContain(report);
      }
    }
  });

  it('shows all four verdicts of REVIEW_POLICY.md across its loops, and nothing else', () => {
    const seen = new Set<string>();
    for (let loop = 0; loop < 3; loop += 1) {
      for (let t = 0; t < loopLength(loop); t += 0.25) {
        const s = demoAt(t, loop, true);
        seen.add(s.content.verdict);
        for (const role of ROLES) seen.add(s.cast[role].report);
      }
    }
    const verdicts = [
      'PASS',
      'PASS_WITH_NON_BLOCKING_FINDINGS',
      'BLOCKED',
      'INSUFFICIENT_EVIDENCE',
    ];
    for (const verdict of verdicts) expect(seen.has(verdict), verdict).toBe(true);
    // REVIEW_POLICY.md: "Nothing else is a verdict." COMPLETE is the Fabricator's claim.
    for (const word of seen) expect(['—', 'COMPLETE', ...verdicts]).toContain(word);
  });

  it('names the candidate’s state in the constitution’s words, and moves only along its transitions', () => {
    for (let loop = 0; loop < 3; loop += 1) {
      let previous: string | null = null;
      for (let t = 0; t < loopLength(loop); t += 0.05) {
        const { candidate } = demoAt(t, loop, true).content;
        if (candidate !== null) expect(CandidateState.options).toContain(candidate);
        if (previous !== null && candidate !== null && candidate !== previous) {
          expect(
            transitions.some((x) => x.from === previous && x.to === candidate),
            `${previous} → ${candidate} at ${t.toFixed(2)} s of loop ${loop}`,
          ).toBe(true);
        }
        // A candidate does not vanish mid-loop: once one exists it has a state until the loop ends.
        if (previous !== null) expect(candidate).not.toBeNull();
        previous = candidate;
      }
    }
  });

  it('says what the candidate is doing while there is no verdict, never a fixed word', () => {
    // While the Fabricator builds, the candidate is BUILDING — not awaiting review.
    const building = demoAt(BEATS.fabricatorWorking + 1, 0, true);
    expect(building.content.verdict).toBe('—');
    expect(building.content.candidate).toBe('BUILDING');
    expect(stateLines(building.content.candidate)).toEqual(['BUILDING']);
    const claimed = demoAt(BEATS.fabricatorReported + 1, 0, true);
    expect(claimed.content.candidate).toBe('BUILDER_REPORTED_COMPLETE');
    expect(stateLines(claimed.content.candidate)).toEqual(['BUILDER REPORTED', 'COMPLETE']);
    const verifying = demoAt(BEATS.proverWorking + 1, 0, true);
    expect(verifying.content.candidate).toBe('VERIFICATION_INCOMPLETE');
    const reviewing = demoAt(BEATS.keeperWorking + 1, 0, true);
    expect(reviewing.content.candidate).toBe('REVIEW_IN_PROGRESS');
    expect(stateLines(null)).toEqual(['NO CANDIDATE']);
  });

  it('stops and turns to the owner at SAFE_TO_MERGE: everyone at rest, one thing lit', () => {
    const gate = demoAt(BEATS.ownerGate + 1, 0, true);
    expect(gate.content.ownerGate).toBe(true);
    expect(gate.content.candidate).toBe('SAFE_TO_MERGE');
    expect(gate.pose).toBe('rest');
    expect(gate.virgilFace).toBe('idle');
    for (const role of ROLES) expect(gate.cast[role].activity).toBe('rest');
    // Only there: never during a hop.
    for (let loop = 0; loop < 3; loop += 1) {
      for (let t = 0; t < loopLength(loop); t += 0.25) {
        const s = demoAt(t, loop, true);
        if (s.content.ownerGate) expect(s.content.candidate).toBe('SAFE_TO_MERGE');
      }
    }
  });

  it('is nothing when not running', () => {
    const idle = demoAt(15, 0, false);
    expect(idle.pose).toBe('rest');
    for (const role of ROLES) expect(idle.cast[role].station).toBe('READY');
    expect(idle.content.verdict).toBe('—');
    expect(idle.content.candidate).toBeNull();
  });
});

describe('a face under reduced motion (KR-55)', () => {
  const clock = () => ({
    t: 0,
    nextBlink: 1.5,
    blinkStart: -1,
    half: false,
    lastDraw: -1,
    drawnState: null,
  });

  it('is drawn, open-eyed and unpulsing, and does not depend on time', () => {
    const c = clock();
    const first = faceAppearance('idle', true, c, 0.016);
    expect(first.draw).toBe(true);
    expect(first.open).toBe(1);
    expect(first.pulse).toBe(1);
    expect(first.flare).toBe(0);
    // Time does not pass and nothing is redrawn until the state changes.
    const later = faceAppearance('idle', true, c, 5);
    expect(c.t).toBe(0);
    expect(later.draw).toBe(false);
    expect(later.open).toBe(1);
    const changed = faceAppearance('blocked', true, c, 0.016);
    expect(changed.draw).toBe(true);
  });

  it('keeps blocked and passed distinct — form, brow, mouth and colour', () => {
    const c = clock();
    const blocked = faceAppearance('blocked', true, c, 0.016);
    const passed = faceAppearance('passed', true, c, 0.016);
    expect(blocked.colour).not.toBe(passed.colour);
    expect(blocked.style.form).not.toBe(passed.style.form);
    expect(blocked.style.brow).toBe(true);
    expect(passed.style.brow).toBe(false);
    expect(blocked.style.mouth).toBe('flat');
    expect(passed.style.mouth).toBe('grin');
    expect(blocked.style).toEqual(FACE_STYLE.blocked);
    expect(blocked.colour).toBe(FACE_COLOUR.blocked);
  });

  it('blinks and pulses only when motion is allowed', () => {
    const c = clock();
    const a = faceAppearance('idle', false, c, 0.5, () => 0.5);
    expect(c.t).toBe(0.5);
    expect(a.pulse).not.toBe(1);
    // Past the first blink, the eyes close.
    faceAppearance('idle', false, c, 1.05, () => 0.5);
    const mid = faceAppearance('idle', false, c, 0.05, () => 0.5);
    expect(mid.open).toBeLessThan(1);
    // A blocked face stares: never blinks.
    const stare = clock();
    for (let i = 0; i < 100; i += 1)
      expect(faceAppearance('blocked', false, stare, 0.1).open).toBe(1);
  });

  it('flares on becoming attentive — the summons registering — and only then', () => {
    const c = clock();
    faceAppearance('idle', false, c, 0.5, () => 0.5);
    const summoned = faceAppearance('attentive', false, c, 0.016, () => 0.5);
    expect(summoned.flare).toBeGreaterThan(0.9);
    expect(summoned.draw).toBe(true);
    const later = faceAppearance('attentive', false, c, 0.5, () => 0.5);
    expect(later.flare).toBeLessThan(summoned.flare);
    faceAppearance('attentive', false, c, 1, () => 0.5);
    expect(faceAppearance('attentive', false, c, 0.016, () => 0.5).flare).toBe(0);
    // Working never flares.
    faceAppearance('working', false, c, 0.016, () => 0.5);
    expect(faceAppearance('working', false, c, 0.016, () => 0.5).flare).toBe(0);
  });
});
