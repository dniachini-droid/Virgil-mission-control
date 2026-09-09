import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROLES, type Role } from '../src/world/room/cast.js';
import { BEATS, demoAt, loopLength, type Outcome } from '../src/world/room/demo.js';
import { splitHero } from '../src/world/screens/v11/chrome.js';
import { primaryFor, verdictPrimary } from '../src/world/screens/v11/content.js';
import { drawConsoleScreen, drawSlab, type SlabKind } from '../src/world/screens/v11/screens.js';
import { ARRIVE_SECONDS, SETTLED_SINCE, sinceFor } from '../src/world/screens/v11/system.js';

/**
 * **Nothing on any display may name a verdict before the review that
 * returns it has reported — and no word in a verdict or candidate-state
 * position may be one this project invented.**
 *
 * Both faults were real and both were found by reading rather than by a
 * check, which is why this file exists.
 *
 *  - The verdict slab's `default` branch drew the large word `IN FLIGHT`
 *    under a heading that reads `VERDICT`. `IN FLIGHT` is not one of
 *    `constitution/authority.json`'s four `reviewVerdicts`, and the big
 *    word is what reads at distance while the small line under it does not.
 *  - The same branch's lead read `HEADING FOR ${outcome}` — the scripted
 *    demonstration knows how its loop ends, so the display announced the
 *    verdict in prose while the reviewer was still working. Nothing in this
 *    architecture can know a verdict before a review returns one; a display
 *    that implies otherwise teaches the owner something untrue about his own
 *    system. The verdict slab's evidence rail leaked the same way, drawing
 *    `301 PASSED · 1 FAILED` from the loop's ending before the Prover
 *    reported, and the Prover's own gates closed in red for the same reason.
 *
 * V10's test for *no verdict before its review reported* looked only at the
 * rendered verdict word and could not see prose or a rail. **This asserts
 * over the whole of every screen's text, at every second of every loop.**
 *
 * The one thing it deliberately allows: **a check that resolves while the
 * Prover works.** `tally.ts`'s schedule decides which check fails, so a
 * failing check is derived from the loop's ending — but a check failing is
 * an *event that precedes* the verdict, not the verdict, and hiding it
 * would be dishonest in the other direction: the owner asked to see the
 * work. What may not appear is the **verdict's own word**, and that is
 * what is asserted.
 */

const authority = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../../constitution/authority.json'), 'utf8'),
) as { reviewVerdicts: string[]; candidateStates: string[] };

/**
 * How a constitution term is rendered on a display: the underscores become
 * spaces, and `NON_BLOCKING` becomes `NON-BLOCKING`, which is the same two
 * words hyphenated as English hyphenates a compound modifier and not an
 * abbreviation of anything. Comparisons below normalise both sides, so a
 * hyphen can never hide a dropped word.
 */
const spaced = (term: string) => term.replace(/[_-]/g, ' ');

/**
 * A 2D context that records the text drawn on it and does nothing else.
 * Enough of the interface for `screens.ts` to run under node with no
 * renderer, and `measureText` returns a width proportional to the string,
 * which is all the fitter needs to be deterministic.
 */
function recorder(width: number, height: number) {
  const text: string[] = [];
  let size = 16;
  const gradient = { addColorStop: () => undefined };
  const ctx = {
    canvas: { width, height },
    get font() {
      return `${size}px x`;
    },
    set font(value: string) {
      const parsed = /(\d+(?:\.\d+)?)px/.exec(value);
      size = parsed ? Number(parsed[1]) : 16;
    },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    textAlign: 'left',
    textBaseline: 'top',
    letterSpacing: '0em',
    imageSmoothingQuality: 'high',
    save: () => undefined,
    restore: () => undefined,
    translate: () => undefined,
    scale: () => undefined,
    rotate: () => undefined,
    clip: () => undefined,
    beginPath: () => undefined,
    closePath: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    quadraticCurveTo: () => undefined,
    bezierCurveTo: () => undefined,
    arc: () => undefined,
    arcTo: () => undefined,
    absarc: () => undefined,
    ellipse: () => undefined,
    rect: () => undefined,
    fill: () => undefined,
    stroke: () => undefined,
    fillRect: () => undefined,
    strokeRect: () => undefined,
    clearRect: () => undefined,
    setLineDash: () => undefined,
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    measureText: (value: string) => ({ width: value.length * size * 0.6 }),
    fillText: (value: string) => {
      text.push(value);
    },
    strokeText: (value: string) => {
      text.push(value);
    },
  };
  return { ctx, text };
}

function drawnText(
  draw: (canvas: HTMLCanvasElement) => void,
  width: number,
  height: number,
): string[] {
  const { ctx, text } = recorder(width, height);
  const canvas = { width, height, getContext: () => ctx } as unknown as HTMLCanvasElement;
  draw(canvas);
  return text;
}

const CONSOLE_SIZE: Record<Role, [number, number]> = {
  fabricator: [1024, 603],
  prover: [1024, 549],
  keeper: [1024, 676],
};
const SLAB_SIZE: [number, number] = [1024, 679];
const SLABS: SlabKind[] = ['roles', 'verdict', 'candidate'];

/** Every second of every loop of the demonstration, as the world sees it. */
function beats(): { seconds: number; loop: number }[] {
  const list: { seconds: number; loop: number }[] = [];
  for (const loop of [0, 1, 2]) {
    for (let seconds = 0; seconds <= loopLength(loop); seconds += 0.5) {
      list.push({ seconds, loop });
    }
  }
  return list;
}

describe('no display names a verdict before its review has reported', () => {
  it.each(beats())('loop $loop at $seconds s', ({ seconds, loop }) => {
    const state = demoAt(seconds, loop, true);
    const outcomeWord = spaced(state.outcome);
    // A verdict has returned when the slabs carry one.
    const returned = state.content.verdict !== '—';
    const all: string[] = [];
    for (const role of ROLES) {
      const member = state.cast[role];
      const [w, h] = CONSOLE_SIZE[role];
      all.push(
        ...drawnText(
          (canvas) =>
            drawConsoleScreen(canvas, {
              role,
              label: role,
              state: member.station,
              report: member.report,
              outcome: state.outcome,
              quiet: state.content.ownerGate ? 0.75 : 0,
              corner: 80,
              t: seconds,
              since: 1.2,
              showBand: false,
            }),
          w,
          h,
        ),
      );
    }
    for (const kind of SLABS) {
      all.push(
        ...drawnText(
          (canvas) =>
            drawSlab(canvas, {
              kind,
              content: state.content,
              outcome: state.outcome,
              seconds,
              corner: 20,
              t: seconds,
              since: 1.2,
              showBand: false,
            }),
          SLAB_SIZE[0],
          SLAB_SIZE[1],
        ),
      );
    }
    const joined = all.join(' | ').toUpperCase();
    if (!returned) {
      // **Matched as whole words.** `PASS` is a substring of `PASSED`, and
      // `PASSED` is the Prover's own count label — *how many of the
      // fourteen required checks have passed so far* — which is the work
      // happening and is not a verdict. A substring match would have
      // banned it and taught the wrong lesson.
      const whole = (word: string) => new RegExp(`(^|[^A-Z])${word}([^A-Z]|$)`).test(joined);
      // The outcome's own word may not appear anywhere, in any field, on
      // any of the six displays, until a verdict has returned.
      expect(
        whole(outcomeWord),
        `loop ${loop} at ${seconds}s named ${outcomeWord}: ${joined}`,
      ).toBe(false);
      // Nor may any of the other three, which would be worse.
      for (const verdict of authority.reviewVerdicts) {
        const word = spaced(verdict);
        expect(whole(word), `loop ${loop} at ${seconds}s named ${word}: ${joined}`).toBe(false);
      }
    }
  });
});

/**
 * **A state sentence may not appear before its state, and this is stage 4's
 * addition after a frame showed one that did.**
 *
 * `EVERY GATE PASSES. ELIGIBLE, NOT MERGED.` is `STATE_LANGUAGE.md`'s sentence
 * for `SAFE_TO_MERGE` and for nothing else. It was printed under the word
 * `PASS` unconditionally, so at the passing loop's thirtieth second — where
 * the Prover has returned PASS and the candidate is `READY_FOR_REVIEW` — the
 * verdict slab told the reader the candidate was eligible to merge before any
 * merge gate had been evaluated and before the Keeper had reviewed anything.
 *
 * Stage 2's audit could not see it: it looked for a **verdict word** appearing
 * early, and the verdict word here was honest. This looks for the sentence.
 */
/**
 * **Reduced motion may not delete the words.** Stage 4 captured the twelve
 * review states and the reduced-motion frame showed six displays with rails,
 * an orrery and **no hero word anywhere** — no `NO VERDICT`, no `FABRICATOR`,
 * no `BUILDING`, no status marks. It had been in the build since stage 2 and
 * no frame of it had ever been looked at.
 *
 * The cause is one line each in `ConsoleScreenV11` and `ScreenBankV11`: the
 * display's clock is held still under reduced motion, which is right for the
 * hover and the sweep, so `since` stayed at 0 and every `clamp01(since / n)`
 * with it. The remedy is the project's own rule — arrive, never hide — and
 * `sinceFor` is where it now lives.
 */
describe('reduced motion arrives; it does not hide', () => {
  const state = demoAt(30, 0, true);

  /**
   * The hero's opacity is `ctx.globalAlpha = easeOut(arrive)`
   * (`chrome.ts`, `heroBand`), so what the frame showed — words present in the
   * draw calls and invisible on the glass — is measured here as the alpha the
   * hero was drawn at, not as its absence.
   */
  function heroAlpha(since: number): number {
    const { ctx, text } = recorder(...SLAB_SIZE);
    const seen: { value: string; alpha: number }[] = [];
    const fill = ctx.fillText;
    ctx.fillText = (value: string) => {
      seen.push({ value, alpha: ctx.globalAlpha });
      fill(value);
    };
    const canvas = {
      width: SLAB_SIZE[0],
      height: SLAB_SIZE[1],
      getContext: () => ctx,
    } as unknown as HTMLCanvasElement;
    drawSlab(canvas, {
      kind: 'verdict',
      content: state.content,
      outcome: state.outcome,
      seconds: 30,
      corner: 18,
      t: 0,
      since,
      showBand: false,
    });
    void text;
    const hero = seen.find((entry) => entry.value === 'PASS');
    if (!hero) throw new Error(`no hero drawn: ${seen.map((e) => e.value).join(' | ')}`);
    return hero.alpha;
  }

  it('drew the verdict at zero opacity at the instant of a change, which is what the frame showed', () => {
    expect(heroAlpha(0)).toBe(0);
  });

  it('and draws it fully the moment the preference is set', () => {
    expect(heroAlpha(sinceFor(true, 0))).toBe(1);
  });

  it('for every console as well as every slab, at every beat of every loop', () => {
    for (const { seconds, loop } of beats()) {
      const beat = demoAt(seconds, loop, true);
      for (const role of ROLES) {
        const member = beat.cast[role];
        const drawn = drawnText(
          (canvas) =>
            drawConsoleScreen(canvas, {
              role,
              label: role,
              state: member.station,
              report: member.report,
              outcome: beat.outcome,
              quiet: 0,
              corner: 18,
              t: 0,
              since: sinceFor(true, 0),
              showBand: false,
            }),
          ...CONSOLE_SIZE[role],
        );
        expect(drawn.length, `${role} loop ${loop} at ${seconds}s drew nothing`).toBeGreaterThan(4);
      }
    }
  });

  it('leaves the ordinary path exactly as it was', () => {
    expect(sinceFor(false, 0.41)).toBe(0.41);
    expect(sinceFor(true, 0.41)).toBe(SETTLED_SINCE);
    // Every one-shot in `screens.ts` divides `since` by less than two seconds.
    expect(SETTLED_SINCE).toBeGreaterThan(ARRIVE_SECONDS * 10);
  });
});

describe('the merge-eligibility sentence appears only in the state it names', () => {
  const ELIGIBLE = 'ELIGIBLE, NOT MERGED';

  it('at every half-second of all three loops', () => {
    for (let loop = 0; loop < 3; loop += 1) {
      for (let seconds = 0; seconds <= loopLength(loop); seconds += 0.5) {
        const state = demoAt(seconds, loop, true);
        const primary = verdictPrimary(
          state.content.verdict,
          state.content.active,
          state.content.candidate === 'SAFE_TO_MERGE',
        );
        const claims = primary.lead.includes(ELIGIBLE);
        expect(
          claims,
          `loop ${loop} at ${seconds}s: candidate ${state.content.candidate}, lead "${primary.lead}"`,
        ).toBe(state.content.candidate === 'SAFE_TO_MERGE');
      }
    }
  });

  it('and a returned PASS that is only a verification says exactly that', () => {
    expect(verdictPrimary('PASS', null, false).lead).toBe('VERIFICATION PASSED. NOT YET REVIEWED.');
    expect(verdictPrimary('PASS', null, true).lead).toContain(ELIGIBLE);
  });
});

describe('every word in a verdict position is one of the four, or none', () => {
  const allowed = new Set([...authority.reviewVerdicts.map(spaced), 'NO VERDICT']);

  it('for every verdict the demonstration can show', () => {
    for (const verdict of ['—', ...authority.reviewVerdicts]) {
      for (const active of [null, 'Fabricator', 'Prover', 'Keeper']) {
        const primary = verdictPrimary(verdict, active);
        expect(allowed, `${verdict} / ${active} → ${primary.word}`).toContain(spaced(primary.word));
      }
    }
  });

  it('and a station reporting a verdict shows that verdict, not a variant of it', () => {
    for (const role of ROLES) {
      for (const verdict of authority.reviewVerdicts) {
        const primary = primaryFor(role, 'REPORTED', verdict as 'PASS');
        expect(spaced(primary.word)).toBe(spaced(verdict));
      }
    }
  });

  it('and the Fabricator’s claim is not dressed as a verdict', () => {
    const primary = primaryFor('fabricator', 'REPORTED', 'COMPLETE');
    expect(allowed.has(spaced(primary.word))).toBe(false);
    expect(primary.word).toBe('REPORTED COMPLETE');
    expect(primary.status).toBe('cyan');
  });
});

describe('every word in a candidate-state position is one of the fifteen, or none', () => {
  it('over every beat of every loop', () => {
    const allowed = new Set([...authority.candidateStates.map(spaced), 'NO CANDIDATE']);
    for (const { seconds, loop } of beats()) {
      const state = demoAt(seconds, loop, true);
      const word = spaced(state.content.candidate ?? 'NO CANDIDATE');
      expect(allowed, `loop ${loop} at ${seconds}s → ${word}`).toContain(word);
    }
  });
});

describe('the long verdict is set in full, not abbreviated', () => {
  it('breaks over three lines rather than dropping a word', () => {
    const term = 'PASS WITH NON-BLOCKING FINDINGS';
    const parts = splitHero(term, 3);
    expect(parts.join(' ')).toBe(term);
    expect(parts.length).toBeLessThanOrEqual(3);
    // Balanced: the longest line is shorter than a greedy split's would be.
    expect(Math.max(...parts.map((part) => part.length))).toBeLessThan(22);
  });

  it('never drops NON-BLOCKING, which is the word the verdict exists to carry', () => {
    for (const role of ROLES) {
      const primary = primaryFor(role, 'REPORTED', 'PASS_WITH_NON_BLOCKING_FINDINGS');
      expect(primary.word).toContain('NON-BLOCKING');
    }
    expect(verdictPrimary('PASS_WITH_NON_BLOCKING_FINDINGS', null).word).toContain('NON-BLOCKING');
  });

  it('and the two-word terms stay on one line where they fit', () => {
    expect(splitHero('BLOCKED', 3)).toEqual(['BLOCKED']);
    expect(splitHero('INSUFFICIENT EVIDENCE', 3)).toEqual(['INSUFFICIENT', 'EVIDENCE']);
  });
});

describe('the beats the assertions above rest on', () => {
  it('are the demonstration’s own, so a change to the script is noticed', () => {
    expect(BEATS.proverReported).toBe(29);
    expect(BEATS.verdictEnd).toBe(35);
    expect(loopLength(0)).toBe(BEATS.passEnd);
    const outcomes: Outcome[] = ['PASS', 'BLOCKED', 'INSUFFICIENT_EVIDENCE'];
    for (const [loop, outcome] of outcomes.entries()) {
      expect(demoAt(1, loop, true).outcome).toBe(outcome);
    }
  });
});
