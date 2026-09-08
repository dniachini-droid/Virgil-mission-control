import { describe, expect, it } from 'vitest';
import { spotLevel } from '../src/world/room/Models.js';
import { RECEIVING, RETURNING } from '../src/world/screens/arrival.js';
import {
  collapse,
  crtFrame,
  OFF,
  ON,
  POWER_OFF_SECONDS,
  POWER_ON_SECONDS,
  warmUp,
} from '../src/world/screens/crt.js';
import {
  easeInOut,
  easeOut,
  landing,
  roll,
  scatter,
  staggered,
  staggerLength,
} from '../src/world/screens/motion.js';
import {
  fabricatorTally,
  keeperTally,
  PROVER_CHECKS,
  proverTally,
} from '../src/world/screens/tally.js';
import { verdictLook } from '../src/world/screens/verdicts.js';

/**
 * The screens' motion, held by shape rather than by look — what a
 * renderer cannot check, a function can: the easings have no velocity
 * at their ends and land with one overshoot; things arrive in sequence;
 * the counts only go up and resolve to totals that agree with the loop;
 * the CRT collapses to a line, then a point, then nothing; the spot rises
 * fast and decays slowly; and the four verdicts are four different
 * looks. The owner document reports what the frames actually showed.
 */

describe('the motion vocabulary', () => {
  it('eases with no velocity at the ends and lands with one overshoot', () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 9);
    expect(1 - easeOut(0.95)).toBeLessThan(0.001);
    let peak = 0;
    for (let t = 0; t <= 1; t += 0.001) peak = Math.max(peak, landing(t));
    expect(peak).toBeGreaterThan(1.02);
    expect(peak).toBeLessThan(1.2);
    expect(landing(1)).toBe(1);
    expect(landing(0)).toBeCloseTo(0, 6);
  });

  it('staggers: item i starts i beats after the first, and the run has a known length', () => {
    expect(staggered(0, 0, 1, 0.2)).toBe(0);
    expect(staggered(0.5, 0, 1, 0.2)).toBeCloseTo(0.5, 9);
    expect(staggered(0.5, 2, 1, 0.2)).toBeCloseTo(0.1, 9);
    expect(staggered(5, 3, 1, 0.2)).toBe(1);
    expect(staggerLength(12, 0.7, 0.19)).toBeCloseTo(11 * 0.19 + 0.7, 9);
  });

  it('scatters deterministically and rolls counters monotonically', () => {
    expect(scatter(7, 1)).toBe(scatter(7, 1));
    expect(scatter(7, 1)).not.toBe(scatter(8, 1));
    expect(scatter(7, 1)).toBeGreaterThanOrEqual(0);
    expect(scatter(7, 1)).toBeLessThan(1);
    let last = -1;
    for (let p = 0; p <= 1; p += 0.01) {
      const { value, slide } = roll(0, 5, p);
      expect(value).toBeGreaterThanOrEqual(last);
      expect(slide).toBeGreaterThanOrEqual(0);
      expect(slide).toBeLessThan(1);
      last = value;
    }
    expect(roll(0, 5, 1).value).toBe(5);
  });
});

describe('the receiving and returning beats', () => {
  it('have distinct stages in order, and the receiving beat is not quick', () => {
    expect(RECEIVING.approach).toBeLessThan(RECEIVING.transfer);
    expect(RECEIVING.transfer).toBeLessThan(RECEIVING.unpack);
    expect(RECEIVING.unpack).toBeLessThan(RECEIVING.settle);
    expect(RECEIVING.settle).toBeLessThan(RECEIVING.held);
    expect(RECEIVING.held).toBeGreaterThanOrEqual(5);
    expect(RETURNING.gather).toBeLessThan(RETURNING.converge);
    expect(RETURNING.converge).toBeLessThan(RETURNING.seal);
    expect(RETURNING.seal).toBeLessThan(RETURNING.land);
    expect(RETURNING.land).toBeLessThan(RETURNING.evidence);
    expect(RETURNING.evidence).toBeLessThan(RETURNING.held);
  });
});

describe('the counts', () => {
  it('the Prover’s only go up, and resolve to what the loop says', () => {
    for (const outcome of ['PASS', 'BLOCKED', 'INSUFFICIENT_EVIDENCE'] as const) {
      let lastDone = 0;
      for (let s = 0; s <= 7; s += 0.05) {
        const t = proverTally(s, outcome);
        const done = t.passed + t.failed + t.skipped;
        expect(done).toBeGreaterThanOrEqual(lastDone);
        expect(done + t.running).toBeLessThanOrEqual(t.total);
        expect(t.checks).toHaveLength(PROVER_CHECKS);
        lastDone = done;
      }
      const end = proverTally(7, outcome);
      expect(end.running).toBe(0);
      expect(end.passed + end.failed + end.skipped).toBe(PROVER_CHECKS);
      expect(end.failed).toBe(outcome === 'BLOCKED' ? 1 : 0);
      expect(end.skipped).toBe(outcome === 'INSUFFICIENT_EVIDENCE' ? 1 : 0);
    }
    // Several checks run at once: a process, not a single bar.
    expect(proverTally(2, 'PASS').running).toBeGreaterThanOrEqual(2);
  });

  it('the Keeper’s findings are raised one by one, none blocking, and persist', () => {
    let last = 0;
    for (let s = 0; s <= 6; s += 0.05) {
      const t = keeperTally(s);
      expect(t.findings).toBeGreaterThanOrEqual(last);
      expect(t.blocking).toBe(0);
      last = t.findings;
    }
    expect(keeperTally(6).findings).toBe(3);
    expect(keeperTally(0).findings).toBe(0);
  });

  it('the Fabricator’s files and commits accumulate', () => {
    expect(fabricatorTally(0).files).toBe(0);
    expect(fabricatorTally(6).files).toBe(8);
    expect(fabricatorTally(6).commits).toBe(3);
    expect(fabricatorTally(3).commits).toBe(1);
  });
});

describe('the CRT', () => {
  it('turns on like a television: dark, a bloom and a line, the picture opening, an overshoot', () => {
    expect(warmUp(0).scale).toEqual([0, 0]);
    expect(warmUp(0.1).glow).toBeGreaterThan(0);
    const line = warmUp(0.35);
    expect(line.scale[1]).toBeLessThan(0.05);
    expect(line.flash).toBeGreaterThan(0.3);
    const opening = warmUp(0.65);
    expect(opening.scale[1]).toBeGreaterThan(0.3);
    expect(opening.scale[1]).toBeLessThan(1);
    expect(warmUp(0.95).power).toBeGreaterThan(1);
    expect(warmUp(POWER_ON_SECONDS)).toEqual(ON);
  });

  it('turns off with the exaggerated collapse: to a line, to a point, an afterglow, nothing', () => {
    const toLine = collapse(0.3);
    expect(toLine.scale[0]).toBe(1);
    expect(toLine.scale[1]).toBeLessThan(0.6);
    expect(toLine.power).toBeGreaterThan(1);
    const line = collapse(0.42);
    expect(line.scale[1]).toBeLessThan(0.05);
    const toPoint = collapse(0.7);
    expect(toPoint.scale[0]).toBeLessThan(0.5);
    expect(toPoint.scale[1]).toBeLessThan(0.05);
    const glow = collapse(1.0);
    expect(glow.scale).toEqual([0, 0]);
    expect(glow.glow).toBeGreaterThan(0.5);
    expect(collapse(2.0).glow).toBeLessThan(glow.glow);
    expect(collapse(POWER_OFF_SECONDS)).toEqual(OFF);
    // The glass and the case never move: only the image's scale is returned.
    expect(Object.keys(collapse(0.5)).sort()).toEqual([
      'flash',
      'glow',
      'power',
      'scale',
      'settled',
    ]);
  });

  it('is instant with reduced motion', () => {
    expect(crtFrame(true, 0, true)).toEqual(ON);
    expect(crtFrame(false, 0, true)).toEqual(OFF);
    expect(crtFrame(true, 0, false).settled).toBe(false);
  });
});

describe('the spotlight', () => {
  it('rises fast and decays slowly, still visible while the next console starts', () => {
    let level = 0;
    for (let i = 0; i < 20; i += 1) level = spotLevel(level, true, 0.05);
    expect(level).toBeGreaterThan(0.9);
    const lit = level;
    for (let i = 0; i < 20; i += 1) level = spotLevel(level, false, 0.05);
    // One second after work ends, most of the light is still there.
    expect(level).toBeGreaterThan(lit * 0.6);
    for (let i = 0; i < 100; i += 1) level = spotLevel(level, false, 0.05);
    // Six seconds after, a trace: the disc holds a short history of itself.
    expect(level).toBeGreaterThan(0.05);
    expect(level).toBeLessThan(0.3);
    for (let i = 0; i < 400; i += 1) level = spotLevel(level, false, 0.05);
    expect(level).toBeLessThan(0.01);
  });
});

describe('the four verdicts', () => {
  it('are four different looks, and INSUFFICIENT_EVIDENCE is not red', () => {
    const looks = (
      ['PASS', 'PASS_WITH_NON_BLOCKING_FINDINGS', 'BLOCKED', 'INSUFFICIENT_EVIDENCE'] as const
    ).map(verdictLook);
    const keys = looks.map((l) => `${l.tint}|${l.lines.join('/')}`);
    expect(new Set(keys).size).toBe(4);
    expect(verdictLook('INSUFFICIENT_EVIDENCE').tint).not.toBe(verdictLook('BLOCKED').tint);
    expect(verdictLook('INSUFFICIENT_EVIDENCE').tint).not.toBe(verdictLook('PASS').tint);
    expect(verdictLook('PASS_WITH_NON_BLOCKING_FINDINGS').lines).toHaveLength(2);
    expect(verdictLook('COMPLETE').lines).toEqual(['COMPLETE']);
  });
});
