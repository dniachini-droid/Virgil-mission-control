import { describe, expect, it } from 'vitest';
import { CLIP_FOR } from '../src/world/characters/VirgilRigged.js';
import { FACE_COLOUR, FACE_STYLE, faceAppearance } from '../src/world/characters/Visor.js';
import { ROLES } from '../src/world/room/cast.js';
import { DEMO_LENGTH, demoAt, forcedState } from '../src/world/room/demo.js';
import { virgilRiggedMetadata } from '../src/world/virgil/virgilRigged.js';

/**
 * The refusal is wired, the demonstration says what it is, and a face
 * under reduced motion is still a face (KR-55).
 */

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

  it('plays on a BLOCKED verdict and only then', () => {
    const blocked = demoAt(21, 1, true);
    expect(blocked.pose).toBe('blocked');
    expect(blocked.virgilFace).toBe('blocked');
    expect(blocked.cast.prover.report).toBe('BLOCKED');
    expect(blocked.content.verdict).toBe('BLOCKED');
    const passed = demoAt(21, 0, true);
    expect(passed.pose).toBe('nod');
    expect(passed.virgilFace).toBe('passed');
    for (let t = 0; t < DEMO_LENGTH; t += 0.25) {
      for (const loop of [0, 1]) {
        const s = demoAt(t, loop, true);
        if (s.pose === 'blocked') expect(s.content.verdict).toBe('BLOCKED');
        if (s.content.verdict === 'BLOCKED') expect(s.virgilFace).toBe('blocked');
      }
    }
    expect(forcedState('blocked').pose).toBe('blocked');
  });
});

describe('the demonstration', () => {
  it('runs the three hops in order and rests at both ends', () => {
    expect(demoAt(0, 0, true).pose).toBe('rest');
    expect(demoAt(4, 0, true).cast.fabricator.station).toBe('RECEIVING');
    expect(demoAt(8, 0, true).cast.fabricator.station).toBe('WORKING');
    expect(demoAt(11, 0, true).cast.fabricator.report).toBe('COMPLETE');
    expect(demoAt(14, 0, true).cast.prover.station).toBe('RECEIVING');
    expect(demoAt(18, 0, true).cast.prover.station).toBe('WORKING');
    expect(demoAt(23, 0, true).cast.keeper.station).toBe('RECEIVING');
    expect(demoAt(26, 0, true).cast.keeper.station).toBe('WORKING');
    expect(demoAt(29, 0, true).cast.keeper.report).toBe('PASS');
    expect(demoAt(29, 1, true).pose).toBe('rest');
    expect(demoAt(DEMO_LENGTH - 0.01, 0, true).cast.keeper.report).toBe('PASS');
  });

  it('never lets the Fabricator report a verdict: a builder’s report is a claim', () => {
    for (let t = 0; t < DEMO_LENGTH; t += 0.25) {
      for (const loop of [0, 1]) {
        const report = demoAt(t, loop, true).cast.fabricator.report;
        expect(['—', 'COMPLETE']).toContain(report);
      }
    }
  });

  it('is nothing when not running', () => {
    const idle = demoAt(15, 0, false);
    expect(idle.pose).toBe('rest');
    for (const role of ROLES) expect(idle.cast[role].station).toBe('READY');
    expect(idle.content.verdict).toBe('—');
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
});
