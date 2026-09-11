import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Report } from '../src/world/room/demo.js';
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
import { BAND_HEIGHT, BAND_LINES, BAND_WORDS } from '../src/world/screens/draw.js';
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
  evidenceRows,
  type ReturnLayout,
  SECOND_LINE_MIN,
  withAlpha,
} from '../src/world/screens/returning.js';
import {
  fabricatorTally,
  keeperTally,
  PROVER_CHECKS,
  proverTally,
} from '../src/world/screens/tally.js';
import { verdictLook } from '../src/world/screens/verdicts.js';

const src = (relative: string) =>
  readFileSync(fileURLToPath(new URL(`../src/${relative}`, import.meta.url)), 'utf8');

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

/**
 * **V9, item 3.1 — the verdict's words must not run over the rows
 * beneath them.** The owner's defect: on the Prover's console
 * `INSUFFICIENT EVIDENCE` overlapped the tally line under it. It was
 * arithmetic, it had been there since V8, and it was deliberately skipped
 * twice. So the layout is measured here, for every role, every report and
 * every console's own aspect, rather than looked at once.
 */
describe('the return’s layout leaves the rows clear of the words', () => {
  const SECOND_LINE_TOP = 190;
  const WORD_GAP = 22;
  /** The three consoles' measured aspects (`console-screens.test.ts`), and the slabs'. */
  const SURFACES: { label: string; aspect: number; slab: boolean }[] = [
    { label: 'fabricator', aspect: 1.731, slab: false },
    { label: 'prover', aspect: 1.725, slab: false },
    { label: 'keeper', aspect: 1.562, slab: false },
    { label: 'slab', aspect: 1024 / 634, slab: true },
  ];
  const REPORTS: Report[] = [
    'PASS',
    'PASS_WITH_NON_BLOCKING_FINDINGS',
    'BLOCKED',
    'INSUFFICIENT_EVIDENCE',
    'COMPLETE',
  ];

  /**
   * **And the second line fits its box across, not only down** (V10).
   *
   * V9 measured the second line's foot and stopped there. Its width was
   * never checked, and one string in the vocabulary did not fit: `WITH
   * NON-BLOCKING FINDINGS` measures **673 px at 40 px** — `fitFont`'s
   * floor until V10 — in this build's own Outfit Bold at 0.04em, against
   * a **566 px** box. It ran 107 px past its box and into the verdict's
   * mark, on the one verdict this project's real run ended on.
   *
   * The number below is that single measurement, taken in the built
   * artifact with the committed subset loaded and recorded in the V10 run
   * record. Only the string that was measured is asserted: the others are
   * shorter, and modelling their widths from a character count would be
   * inventing a figure. If the subset changes this must be re-measured,
   * not adjusted.
   */
  const MEASURED = { text: 'WITH NON-BLOCKING FINDINGS', px: 40, width: 673 };
  const FIT_STEP = 6;
  const FIT_FROM = 56;

  it('sets the longest second line small enough to fit its box', () => {
    const box = 1024 - 128 - 330;
    expect(verdictLook('PASS_WITH_NON_BLOCKING_FINDINGS').lines[1]).toBe(MEASURED.text);
    // The measured width is linear in the font size, which is what a
    // canvas does with a scalable face.
    const widthAt = (px: number) => (MEASURED.width * px) / MEASURED.px;
    // The fitter's own walk, with the floor `drawReturn` gives it.
    let size = FIT_FROM;
    while (size > SECOND_LINE_MIN && widthAt(size) > box) size -= FIT_STEP;
    expect(size, 'the fitter could not go small enough to fit the box').toBeLessThan(40);
    expect(
      Math.round(widthAt(size)),
      `“${MEASURED.text}” is ${Math.round(widthAt(size))} px in a ${box} px box`,
    ).toBeLessThanOrEqual(box);
  });

  it('never puts a row inside the second line’s glyph box, on any surface', () => {
    for (const surface of SURFACES) {
      const width = 1024;
      const height = Math.max(64, Math.round(width / surface.aspect));
      const floor = height - BAND_HEIGHT;
      for (const report of REPORTS) {
        const words = verdictLook(report).lines;
        // The counts under a verdict: two rows for a console, three for
        // the slab's evidence.
        for (const count of [2, 3]) {
          const layout: ReturnLayout = surface.slab
            ? {
                cx: width - 64 - 150,
                cy: 150 + (floor - 150) / 2 - 30,
                r: 118,
                wordX: 64,
                wordY: 130,
                wordWidth: width - 128 - 330,
                linesX: 64,
                linesY: floor - 30 - 3 * 48,
                linesWidth: width - 128 - 330,
                pitch: 48,
              }
            : {
                cx: width - 64 - 150,
                cy: 150 + (floor - 150) / 2 - 20,
                r: 118,
                wordX: 64,
                wordY: 130,
                wordWidth: width - 128 - 330,
                linesX: 64,
                linesY: floor - 40 - count * 48,
                linesWidth: width - 128 - 330,
                pitch: 48,
              };
          // The worst case for the second line's size: the largest the
          // fitter may return, which is what `drawReturn` measures.
          const wordsBottom = words[1] ? layout.wordY + SECOND_LINE_TOP + 56 : layout.wordY;
          const rows = evidenceRows(layout, count, wordsBottom + WORD_GAP, floor);
          const message = `${surface.label} · ${report} · ${count} rows`;
          if (words[1]) {
            expect(rows.top, `${message}: a row inside the second line`).toBeGreaterThanOrEqual(
              wordsBottom + WORD_GAP,
            );
          }
          // Every row is above the honesty band, and the rows do not
          // overlap each other.
          const lastFoot = rows.top + (count - 1) * rows.pitch + rows.pitch * 0.72;
          expect(lastFoot, `${message}: a row under the band`).toBeLessThanOrEqual(floor);
          expect(rows.pitch, `${message}: the rows overlap each other`).toBeGreaterThanOrEqual(26);
        }
      }
    }
  });

  it('reproduces the 36 pixels of overlap the old layout had, so the defect is on record', () => {
    // The Prover's console: 1024 × 594, floor 476. `INSUFFICIENT` /
    // `EVIDENCE` set the second line at 130 + 190 = 320 with glyphs to
    // 376, and two tally rows started at 476 − 40 − 96 = 340.
    const height = Math.round(1024 / 1.725);
    expect(height).toBe(594);
    const floor = height - BAND_HEIGHT;
    expect(floor).toBe(476);
    const oldTop = floor - 40 - 2 * 48;
    expect(oldTop).toBe(340);
    const secondFoot = 130 + 190 + 56;
    expect(secondFoot).toBe(376);
    expect(secondFoot - oldTop).toBe(36);
    // And it is gone: the row is pushed clear.
    const layout: ReturnLayout = {
      cx: 810,
      cy: 313,
      r: 118,
      wordX: 64,
      wordY: 130,
      wordWidth: 566,
      linesX: 64,
      linesY: oldTop,
      linesWidth: 566,
      pitch: 48,
    };
    const rows = evidenceRows(layout, 2, secondFoot + 22, floor);
    expect(rows.top).toBeGreaterThanOrEqual(secondFoot);
  });
});

/**
 * **V9, item 3.3 — the verdict's colour is a tint on a black ground.**
 * V8.3 measured Virgil's centre slab at a median luminance of 52.4
 * against 39.0–39.9 for the other four surfaces and established that the
 * excess is the verdict's own green. Most of it was a flat fill of the
 * tint over the whole picture. It is a radial gradient centred on the
 * ring now, so the ground away from the ring is exactly as black as
 * every other display.
 */
describe('the verdict’s moment tints rather than washes', () => {
  it('spreads the tint from the ring and not across the picture', () => {
    const returning = src('world/screens/returning.ts');
    expect(returning).toContain('createRadialGradient');
    // No flat fill of the tint over the whole picture.
    expect(returning).not.toMatch(/ctx\.fillStyle = tint;\s*\n\s*ctx\.fillRect\(0, 0, w, h\)/);
    // The gradient reaches zero, so there is a black ground to tint.
    expect(returning).toContain('withAlpha(tint, 0)');
  });

  it('turns a hex colour into an rgba stop without inventing one', () => {
    expect(withAlpha('#b6ff5c', 0.5)).toBe('rgba(182, 255, 92, 0.5)');
    expect(withAlpha('#000', 1)).toBe('rgba(0, 0, 0, 1)');
    // Clamped, so a stop can never be out of range.
    expect(withAlpha('#ffffff', 2)).toBe('rgba(255, 255, 255, 1)');
    expect(withAlpha('#ffffff', -1)).toBe('rgba(255, 255, 255, 0)');
  });
});

/**
 * **V9, item 3.2 — the honesty band on two lines for a small screen.**
 * The layout changes; the words do not. This is the assertion that keeps
 * the second half of that sentence true.
 */
describe('the honesty band on a small screen', () => {
  it('divides the same four words in two and abbreviates nothing', () => {
    expect(BAND_LINES).toHaveLength(2);
    expect(BAND_LINES.join(' · ')).toBe(BAND_WORDS);
    for (const word of ['ILLUSTRATIVE', 'NOT', 'REAL', 'STATE']) {
      expect(BAND_LINES.join(' ')).toContain(word);
    }
    // Every character is one the display subset can set.
    expect(BAND_LINES.join('')).toMatch(/^[A-Z ]+$/);
  });

  it('is switched by the tier, once, and defaults to one line', () => {
    const room = src('world/room/VirgilRoom.tsx');
    expect(room).toContain('setBandOnTwoLines(coarse)');
    const draw = src('world/screens/draw.ts');
    expect(draw).toContain('let bandOnTwoLines = false;');
    // The words are never rewritten, only laid out differently: the
    // sentence is declared exactly once and the two lines come from it.
    expect(draw).not.toMatch(/BAND_WORDS\s*=\s*bandOnTwoLines/);
    expect(draw.match(/'ILLUSTRATIVE · NOT REAL STATE'/g) ?? []).toHaveLength(1);
    expect(draw).toContain("export const BAND_LINES = BAND_WORDS.split(' · ');");
  });

  it('more than doubles the width each character gets', () => {
    // A slab at the wide view on a phone is about 110 screen pixels wide.
    const oneLine = 110 / BAND_WORDS.length;
    const twoLine = 110 / Math.max(...BAND_LINES.map((l) => l.length));
    expect(oneLine).toBeLessThan(4);
    expect(twoLine / oneLine).toBeGreaterThan(2);
  });
});
