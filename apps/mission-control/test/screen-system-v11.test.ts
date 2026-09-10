import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BAND_HEIGHT } from '../src/world/screens/draw.js';
import { splitHero } from '../src/world/screens/v11/chrome.js';
import { primaryFor } from '../src/world/screens/v11/content.js';
import {
  ANISOTROPY,
  REDRAW_FPS,
  SOFTWARE_REDRAW_FPS,
  TEXTURE_WIDTH,
  textureBytes,
} from '../src/world/screens/v11/resolution.js';
import {
  ARRIVE_SECONDS,
  BAND_PIXELS_AT_1024,
  BLOOM_THRESHOLD,
  CORE,
  GLASS,
  luminance,
  metrics,
  STATUS,
  STRUCTURE,
  SWEEP_SECONDS,
  TEXT,
} from '../src/world/screens/v11/system.js';

/**
 * **The V11 shared display system, checked without a renderer.**
 *
 * These are the properties the design rests on that a frame cannot show a
 * reader: which side of the bloom threshold each colour is on, that the
 * honesty band is not one pixel smaller than V10's, that the two epistemic
 * rules in `content.ts` hold for every state in the vocabulary, that no
 * rule is drawn thinner than two canvas pixels at any tier, and that the
 * texture memory the six displays add fits the tier budgets in
 * `docs/architecture/PERFORMANCE_STRATEGY.md`.
 *
 * They are deliberately arithmetic rather than pictorial: `pnpm check` runs
 * with no GPU, and a claim about a colour's luminance or a budget's
 * headroom is exactly the kind of claim a container can settle.
 */

const src = (file: string) => readFileSync(resolve(import.meta.dirname, '../src', file), 'utf8');

describe('the bloom contract', () => {
  it('keeps every type and fill colour under the threshold the bloom pass uses', () => {
    // The display material is `toneMapped={false}`, so the texture's own
    // luminance is what the bloom pass sees. Anything at or over 0.86
    // blooms, and text that blooms loses its counters.
    expect(luminance(TEXT)).toBeLessThan(BLOOM_THRESHOLD);
    for (const [name, colour] of Object.entries(STATUS)) {
      expect(luminance(colour), `${name} ${colour}`).toBeLessThan(BLOOM_THRESHOLD);
    }
    for (const [name, colour] of Object.entries(GLASS)) {
      expect(luminance(colour), `${name} ${colour}`).toBeLessThan(BLOOM_THRESHOLD);
    }
    expect(luminance(STRUCTURE.gold)).toBeLessThan(BLOOM_THRESHOLD);
    expect(luminance(STRUCTURE.goldBright)).toBeLessThan(BLOOM_THRESHOLD);
  });

  it('keeps the one core colour over it, because that core is meant to bloom', () => {
    expect(luminance(CORE)).toBeGreaterThan(BLOOM_THRESHOLD);
  });

  it('leaves the type real headroom rather than sitting on the line', () => {
    expect(BLOOM_THRESHOLD - luminance(TEXT)).toBeGreaterThan(0.005);
  });

  it('keeps the ivory structure colours bright enough to read as pearl', () => {
    expect(luminance(STRUCTURE.pearl)).toBeGreaterThan(0.9);
    expect(luminance(STRUCTURE.ivory)).toBeGreaterThan(0.85);
  });
});

describe('the honesty band', () => {
  /**
   * The owner, of the stage-2 frames: *"No bands. No demo signage on the
   * screens. And the screens now will use the entire space of the screen
   * properly."* So in the scripted mode there is no band at all, and the
   * whole display area is laid out — a margin below the rail, not a gap
   * where the band used to be.
   *
   * In the replay it stays, at V10's own height, because there the three
   * lines say `NOT LIVE STATE` about content that is real.
   */
  it('is not drawn at all in the scripted mode', () => {
    for (const width of Object.values(TEXTURE_WIDTH)) {
      for (const aspect of [1.699, 1.8665, 1.5146, 1.507]) {
        const m = metrics(width, Math.round(width / aspect), 80);
        expect(m.band).toBe(0);
      }
    }
  });

  it('is exactly V10’s height in the replay, at V10’s canvas width', () => {
    expect(BAND_PIXELS_AT_1024).toBe(BAND_HEIGHT);
    expect(metrics(1024, 603, 80, true).band).toBe(BAND_HEIGHT);
    expect(metrics(1024, 679, 20, true).band).toBe(BAND_HEIGHT);
  });

  it('grows with the canvas in the replay, so its share never shrinks', () => {
    for (const width of [1024, 1536, 2048]) {
      for (const aspect of [1.699, 1.8665, 1.5146, 1.507]) {
        const height = Math.round(width / aspect);
        const share = metrics(width, height, 80, true).band / height;
        const v10 = BAND_HEIGHT / Math.round(1024 / aspect);
        expect(share).toBeGreaterThanOrEqual(v10 - 1e-3);
      }
    }
  });

  it('gives the freed area to the layout rather than leaving it empty', () => {
    // The body is taller without the band by the band's height less the
    // margin the rounded corner needs: nothing is wasted beyond that.
    // Each display's own measured corner radius, in its own canvas pixels.
    for (const [aspect, corner] of [
      [1.699, 85],
      [1.507, 17],
    ] as [number, number][]) {
      const height = Math.round(1024 / aspect);
      const withBand = metrics(1024, height, corner, true);
      const without = metrics(1024, height, corner, false);
      const gained = bodyHeight(without) - bodyHeight(withBand);
      expect(gained).toBeGreaterThan(withBand.band - without.foot - 1);
      expect(without.foot).toBeGreaterThan(0);
      expect(without.foot).toBeLessThan(withBand.band * 0.5);
    }
  });
});

/** The body's height, from the metrics alone: what `bodyRect` computes. */
function bodyHeight(m: ReturnType<typeof metrics>): number {
  const top = m.pad + m.header + 1.6 * m.u;
  return m.h - m.band - m.foot - m.rail - 1.2 * m.u - top;
}

describe('the status vocabulary', () => {
  it('never draws the Fabricator’s COMPLETE as a pass: it is a claim, not evidence', () => {
    const primary = primaryFor('fabricator', 'REPORTED', 'COMPLETE');
    expect(primary.status).toBe('cyan');
    expect(primary.mark).toBe('reported');
    expect(primary.status).not.toBe('green');
    // **The property, not the word.** This asserted that the lead contained
    // `CLAIM`, which held the epistemics to one piece of the repository's own
    // vocabulary; the plain-language pass says the same thing in English —
    // *"THE FABRICATOR SAYS THE CODE IS FINISHED. THE CHECKS HAVE NOT
    // CONFIRMED THAT YET."* What matters is that
    // the lead names **who said it** and denies that anything has been
    // checked, and that it never reads as a result.
    expect(primary.lead).toMatch(/BUILDER SAYS|FABRICATOR SAYS|CLAIM/);
    expect(primary.lead).toMatch(/NOTHING IS CHECKED|NOT EVIDENCE|HAVE NOT CONFIRMED/);
    expect(primary.lead).not.toMatch(/\bPASSED\b|\bVERIFIED\b|\bPROVED\b/);
  });

  it('never draws INSUFFICIENT_EVIDENCE as a failure: it is a gap, not a refusal', () => {
    for (const role of ['fabricator', 'prover', 'keeper'] as const) {
      const primary = primaryFor(role, 'REPORTED', 'INSUFFICIENT_EVIDENCE');
      expect(primary.status).toBe('amber');
      expect(primary.mark).toBe('insufficient');
      expect(primary.status).not.toBe('red');
    }
  });

  it('gives every state in the vocabulary exactly one status colour and one mark', () => {
    const reports = [
      '—',
      'COMPLETE',
      'PASS',
      'PASS_WITH_NON_BLOCKING_FINDINGS',
      'BLOCKED',
      'INSUFFICIENT_EVIDENCE',
    ] as const;
    for (const role of ['fabricator', 'prover', 'keeper'] as const) {
      for (const state of ['READY', 'RECEIVING', 'WORKING', 'REPORTED'] as const) {
        for (const report of reports) {
          const primary = primaryFor(role, state, report);
          expect(Object.keys(STATUS)).toContain(primary.status);
          expect(primary.word.length).toBeGreaterThan(0);
          expect(primary.lead.length).toBeGreaterThan(0);
          // Every hero term is upper case: the display face is subset to
          // capitals (`asset-pipeline/subset-font.mjs`) and a lower-case
          // glyph would silently fall back to the system monospace.
          expect(primary.word).toBe(primary.word.toUpperCase());
          expect(primary.lead).toBe(primary.lead.toUpperCase());
        }
      }
    }
  });

  it('only ever refuses in red, and only ever asks for the owner in amber', () => {
    expect(primaryFor('prover', 'REPORTED', 'BLOCKED').status).toBe('red');
    expect(primaryFor('prover', 'REPORTED', 'PASS').status).toBe('green');
    expect(primaryFor('prover', 'WORKING', '—').status).toBe('cyan');
  });
});

describe('the spacing and type system', () => {
  it('draws no rule thinner than two canvas pixels, at any tier or aspect', () => {
    for (const width of Object.values(TEXTURE_WIDTH)) {
      for (const aspect of [1.699, 1.8665, 1.5146, 1.616]) {
        const m = metrics(width, Math.round(width / aspect));
        expect(m.hair).toBeGreaterThanOrEqual(2);
        expect(m.rule).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('scales every size with the canvas, so the design is one design at every tier', () => {
    const a = metrics(1024, 603);
    const b = metrics(2048, 1206);
    for (const key of ['u', 'pad', 'header', 'rail', 'heroWidth'] as const) {
      expect(b[key] / a[key]).toBeCloseTo(2, 2);
    }
    for (const key of ['hero', 'title', 'lead', 'label', 'data', 'micro'] as const) {
      expect(b.type[key] / a.type[key]).toBeCloseTo(2, 2);
    }
  });

  it('keeps the type scale strictly ordered', () => {
    const { type } = metrics(1024, 603);
    expect(type.hero).toBeGreaterThan(type.title);
    expect(type.title).toBeGreaterThan(type.lead);
    expect(type.lead).toBeGreaterThan(type.data);
    expect(type.data).toBeGreaterThan(type.label);
    expect(type.label).toBeGreaterThan(type.micro);
  });

  it('never breaks a hero term onto more lines than it needs, and never loses a word', () => {
    // Two lines is enough for every term in either vocabulary except
    // `PASS_WITH_NON_BLOCKING_FINDINGS`, which gets three rather than
    // being abbreviated (`chrome.ts`'s `splitHero`).
    const twoIsEnough = [
      'STANDBY',
      'INBOUND',
      'BUILDING',
      'VERIFYING',
      'REVIEWING',
      'REPORTED',
      'BLOCKED',
      'PASS',
      'INSUFFICIENT EVIDENCE',
      'SAFE TO MERGE',
      'NO VERDICT',
    ];
    for (const word of twoIsEnough) {
      // Asked for two, they fit in two and lose nothing. `splitHero`'s own
      // default is three because the caller tries every line count and
      // keeps whichever yields the largest type — the longest line bounds
      // the width, the line count bounds the height, and which of the two
      // binds depends on the column.
      expect(splitHero(word, 2).length, word).toBeLessThanOrEqual(2);
      expect(splitHero(word, 2).join(' ')).toBe(word);
    }
    for (const word of [...twoIsEnough, 'PASS WITH NON-BLOCKING FINDINGS']) {
      expect(splitHero(word).length, word).toBeLessThanOrEqual(3);
      expect(splitHero(word).join(' ')).toBe(word);
      // Every line non-empty, and the split balanced: the longest line is
      // no longer than it has to be, because it bounds the type size.
      for (const line of splitHero(word)) expect(line.length).toBeGreaterThan(0);
    }
  });
});

describe('the transitions', () => {
  it('arrives rather than appearing, and sweeps once', () => {
    expect(ARRIVE_SECONDS).toBeGreaterThan(0.3);
    expect(ARRIVE_SECONDS).toBeLessThan(1.2);
    expect(SWEEP_SECONDS).toBeLessThan(ARRIVE_SECONDS);
  });

  it('draws from the arguments only: no wall clock and no randomness', () => {
    for (const file of [
      'world/screens/v11/system.ts',
      'world/screens/v11/chrome.ts',
      'world/screens/v11/marks.ts',
      'world/screens/v11/motifs.ts',
      'world/screens/v11/screens.ts',
      'world/screens/v11/content.ts',
    ]) {
      const text = src(file);
      expect(text, file).not.toMatch(/Math\.random/);
      expect(text, file).not.toMatch(/Date\.now|new Date\(/);
      expect(text, file).not.toMatch(/performance\.now/);
    }
  });
});

describe('the texture budget', () => {
  /** The six displays this set has, at their measured aspects. */
  const ASPECTS = [1.699, 1.8665, 1.5146, 1.616, 1.616, 1.616];
  /** `docs/architecture/PERFORMANCE_STRATEGY.md`, the texture-memory column. */
  const BUDGET_MB = { ultra: 512, desktop: 256, laptop: 192, mobile: 128, constrained: 64 };

  it('stays inside every tier’s texture budget with room for the models', () => {
    for (const [tier, width] of Object.entries(TEXTURE_WIDTH)) {
      const bytes = ASPECTS.reduce((sum, aspect) => sum + textureBytes(width, aspect), 0);
      const mb = bytes / (1024 * 1024);
      const budget = BUDGET_MB[tier as keyof typeof BUDGET_MB];
      // A third of the tier's budget at most: the models, the environment
      // and the two backdrop planes have to fit in the same budget.
      expect(mb, `${tier} ${mb.toFixed(1)} MB of ${budget} MB`).toBeLessThan(budget / 3);
    }
  });

  it('never goes below the brief’s 1024 px floor, and never above its 2048 ceiling', () => {
    for (const width of Object.values(TEXTURE_WIDTH)) {
      expect(width).toBeGreaterThanOrEqual(1024);
      expect(width).toBeLessThanOrEqual(2048);
    }
  });

  it('reduces redraw rate rather than resolution on the coarse tiers', () => {
    expect(TEXTURE_WIDTH.constrained).toBe(TEXTURE_WIDTH.mobile);
    expect(REDRAW_FPS.constrained).toBeLessThan(REDRAW_FPS.mobile);
    expect(REDRAW_FPS.mobile).toBeLessThan(REDRAW_FPS.desktop);
    expect(ANISOTROPY.mobile).toBeGreaterThanOrEqual(2);
    // Slow enough that six live canvases and their mip chains are not the
    // frame's largest cost, which is what the first version of this table
    // measured as a 29 % regression against V10.
    expect(REDRAW_FPS.mobile).toBeLessThanOrEqual(12);
    expect(SOFTWARE_REDRAW_FPS).toBeLessThan(REDRAW_FPS.constrained);
  });

  it('counts mipmaps in the figure it reports', () => {
    // 4/3 of the base level, which is what a full mip chain costs.
    expect(textureBytes(1024, 1)).toBeCloseTo(1024 * 1024 * 4 * (4 / 3), 0);
  });
});
