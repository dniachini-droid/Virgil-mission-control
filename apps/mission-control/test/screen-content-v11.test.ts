import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { playbackSchedule, replayAt } from '../src/world/replay/replayTimeline.js';
import { ROLES, type Role } from '../src/world/room/cast.js';
import { BEATS, demoAt, loopLength, type Outcome } from '../src/world/room/demo.js';
import { splitHero } from '../src/world/screens/v11/chrome.js';
import { primaryFor, READY_TO_GO_IN, verdictPrimary } from '../src/world/screens/v11/content.js';
import { contentFor } from '../src/world/screens/v11/recorded.js';
import {
  drawConsoleScreen,
  drawSlab,
  HOP_ORDER,
  hopNodes,
  hopsReturned,
  LONGEST_SCRIPTED_HOP,
  ledgerBarFill,
  type SlabKind,
} from '../src/world/screens/v11/screens.js';
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
              replay: false,
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
/**
 * **The Keeper's K11-02, repaired at its cause and held here.**
 *
 * The ledger's bar was `done ? 1 : active ? clamp01((seconds % 6) / 6) : 0` —
 * a six-second sawtooth of the global clock, the same for whichever hop was
 * running, and a full bar for every returned hop whatever its length. The
 * review recorded that **no test asserted the bar's semantics**, and that a
 * grep for `elapsed` across the V11 screen tests returned nothing. This is
 * that test.
 */
describe('a bar is a length and a length is a claim', () => {
  it('is a real fraction of the hop\u2019s own window, against the longest hop', () => {
    // The script's hops are 12 seconds each (2 to 14, 17 to 29, 32 to 44), so
    // each returned hop draws a full bar because it genuinely is the longest.
    expect(LONGEST_SCRIPTED_HOP).toBe(BEATS.fabricatorReported - BEATS.handoffToFabricator);
    expect(BEATS.proverReported - BEATS.handoffToProver).toBe(LONGEST_SCRIPTED_HOP);
    expect(BEATS.keeperReported - BEATS.handoffToKeeper).toBe(LONGEST_SCRIPTED_HOP);
    for (const i of [0, 1, 2]) expect(ledgerBarFill('done', i, 40, false)).toBe(1);
  });

  it('grows from the hop\u2019s own start, not from a sawtooth of the global clock', () => {
    expect(ledgerBarFill('active', 0, BEATS.handoffToFabricator, false)).toBe(0);
    expect(ledgerBarFill('active', 0, 8, false)).toBeCloseTo(0.5, 6);
    expect(ledgerBarFill('active', 0, BEATS.fabricatorReported, false)).toBe(1);
    // The Prover's hop opens at 17, so at 8 s nothing of it has run — where the
    // old expression drew a sawtooth for whichever hop happened to be active.
    expect(ledgerBarFill('active', 1, 8, false)).toBe(0);
    expect(ledgerBarFill('active', 1, 23, false)).toBeCloseTo(0.5, 6);
  });

  it('draws nothing at all for a hop that has not started', () => {
    for (const i of [0, 1, 2]) expect(ledgerBarFill('ahead', i, 40, false)).toBe(0);
  });

  it('and nothing at all in the replay, which hands this slab no duration', () => {
    for (const state of ['done', 'active', 'ahead'] as const) {
      for (const i of [0, 1, 2]) expect(ledgerBarFill(state, i, 40, true)).toBe(0);
    }
  });
});

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
      replay: false,
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

/**
 * **The same assertion after the plain-language pass, against the property
 * rather than against the old words.**
 *
 * It compared the lead to the literal `ELIGIBLE, NOT MERGED`, which is the
 * wording the owner rejected as jargon. The sentence it holds is now the
 * owner's own — `READY_TO_GO_IN`, *"READY TO GO INTO THE PROJECT. WAITING ON
 * YOU."* — and it is imported rather than quoted, so the sentence may be
 * reworded again without this test either failing spuriously or, worse,
 * silently ceasing to guard anything because the string it looked for no
 * longer exists anywhere.
 */
describe('the ready-to-go-in sentence appears only in the state it names', () => {
  it('at every half-second of all three loops', () => {
    for (let loop = 0; loop < 3; loop += 1) {
      for (let seconds = 0; seconds <= loopLength(loop); seconds += 0.5) {
        const state = demoAt(seconds, loop, true);
        const primary = verdictPrimary(
          state.content.verdict,
          state.content.active,
          state.content.candidate === 'SAFE_TO_MERGE',
        );
        const claims = primary.lead === READY_TO_GO_IN;
        expect(
          claims,
          `loop ${loop} at ${seconds}s: candidate ${state.content.candidate}, lead "${primary.lead}"`,
        ).toBe(state.content.candidate === 'SAFE_TO_MERGE');
      }
    }
  });

  it('and a returned PASS that is only a check says exactly that', () => {
    // Checked is not reviewed, and the lead has to keep the two apart. It says
    // so in English now; what is asserted is that both halves are there and
    // that the sentence cannot be read the other way round.
    const checked = verdictPrimary('PASS', null, false).lead;
    expect(checked).toMatch(/^THE CHECKS PASSED\./);
    expect(checked).toMatch(/NOBODY HAS REVIEWED IT YET|HAS NOT REVIEWED IT YET/);
    expect(verdictPrimary('PASS', null, true).lead).toBe(READY_TO_GO_IN);
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

/**
 * **The Keeper's KS4-01, and the test that did not exist.**
 *
 * For three seconds of every passing loop the run slab drew the Keeper's hop
 * as returned — filled dot, full green bar, `HOPS 3 / 3 returned` — while the
 * candidate slab in the same frame read `READY FOR REVIEW`, the verdict slab
 * read `VERIFICATION PASSED. NOT YET REVIEWED.` and the Keeper's station was
 * dark with report `—`. `constitution/STATE_LANGUAGE.md`, *Distinctions that
 * must never collapse*: **`READY_FOR_REVIEW` is not reviewed.**
 *
 * The review found it, and then found why nothing else had: this file asserted
 * the *words* a display uses and the bar's arithmetic, and nothing anywhere
 * asserted **hop state**. A grep for `returned`, `hopNodes` or `hops` across
 * the V11 tests returned comments. Two reviews had touched the function and
 * `hopNodes` was byte-identical through both.
 *
 * So the expectation below is written from `demo.ts`'s `BEATS` and from
 * nothing in `screens.ts`, and it is checked at **every half second of all
 * three loops** and at **every beat of the replay** — three ways over: the
 * pure derivation, the number the micro-rail prints, and the bar each row
 * draws. A row cannot claim a hop that has not run without one of them
 * failing.
 */
describe('no row claims a hop that has not run', () => {
  type HopState = 'done' | 'active' | 'ahead';

  /**
   * What the three rows must read at `t`, derived from the script's own
   * beats. A hop is `active` from the moment the hand-off starts until the
   * next hop's hand-off starts — which is when the previous holder actually
   * lets go — and `done` only after that. On the two loops that end in a
   * refusal the Keeper never receives the candidate at all, so his row is
   * `ahead` for the whole loop and to the end of it.
   */
  function expected(t: number, outcome: Outcome): [HopState, HopState, HopState] {
    if (t < BEATS.handoffToFabricator) return ['ahead', 'ahead', 'ahead'];
    if (t < BEATS.handoffToProver) return ['active', 'ahead', 'ahead'];
    if (t < BEATS.proverReported) return ['done', 'active', 'ahead'];
    if (outcome !== 'PASS') return ['done', 'done', 'ahead'];
    // The passing loop only. This is the window KS4-01 lived in: the Prover
    // has returned PASS, and the Keeper has not been handed anything.
    if (t < BEATS.handoffToKeeper) return ['done', 'done', 'ahead'];
    if (t < BEATS.keeperReported) return ['done', 'done', 'active'];
    return ['done', 'done', 'done'];
  }

  it.each(beats())('loop $loop at $seconds s', ({ seconds, loop }) => {
    const state = demoAt(seconds, loop, true);
    const want = expected(seconds, state.outcome);
    const nodes = hopNodes(state.content);
    const where = `loop ${loop} at ${seconds}s (candidate ${state.content.candidate}, verdict ${state.content.verdict}, active ${state.content.active})`;

    expect(
      nodes.map((n) => n.state),
      where,
    ).toEqual(want);

    // The number printed and the rows drawn are one derivation.
    expect(hopsReturned(state.content), where).toBe(want.filter((s) => s === 'done').length);

    // And a bar is a length and a length is a claim: a hop that has not run
    // draws none, whatever the global clock says.
    for (const i of [0, 1, 2]) {
      if (want[i] === 'ahead') {
        expect(ledgerBarFill(want[i] as HopState, i, seconds, false), `${where} row ${i}`).toBe(0);
      }
    }
  });

  /**
   * The same assertion made from the glass rather than from the function:
   * the run slab's micro-rail is rendered and the `N / 3 returned` it prints
   * is read back. This is the surface the review photographed.
   */
  it.each(beats())('the run slab prints it, loop $loop at $seconds s', ({ seconds, loop }) => {
    const state = demoAt(seconds, loop, true);
    const want = expected(seconds, state.outcome).filter((s) => s === 'done').length;
    const drawn = drawnText(
      (canvas) =>
        drawSlab(canvas, {
          kind: 'roles',
          content: state.content,
          outcome: state.outcome,
          seconds,
          corner: 20,
          t: seconds,
          since: 1.2,
          showBand: false,
          replay: false,
        }),
      SLAB_SIZE[0],
      SLAB_SIZE[1],
    );
    // The rail's column is labelled `STEPS DONE` and its value is the count;
    // the word *returned* moved out of the value when the vocabulary did.
    const rail = drawn.filter((line) => /^\d+ \/ 3$/.test(line));
    expect(rail, `loop ${loop} at ${seconds}s`).toEqual([`${want} / 3`]);
  });

  /**
   * The three seconds themselves, named, so a regression is reported as the
   * finding it is rather than as an arithmetic difference.
   */
  it('never draws the Keeper as returned while the candidate is READY_FOR_REVIEW', () => {
    const offenders: string[] = [];
    for (const { seconds, loop } of beats()) {
      const { content } = demoAt(seconds, loop, true);
      if (content.candidate !== 'READY_FOR_REVIEW') continue;
      const keeper = hopNodes(content)[2] as { state: HopState };
      if (keeper.state === 'done') offenders.push(`loop ${loop} at ${seconds}s`);
      expect(ledgerBarFill(keeper.state, 2, seconds, false)).toBeLessThan(1);
    }
    // The window exists — 29 s to 32 s of the passing loop — so this test is
    // exercising the state it names and not passing by never reaching it.
    const window_ = beats().filter(
      ({ seconds, loop }) => demoAt(seconds, loop, true).content.candidate === 'READY_FOR_REVIEW',
    );
    expect(window_.length).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });

  /**
   * **The general rule, over the whole vocabulary rather than the script.**
   * For every candidate state the constitution defines and every possible
   * holder, no hop after the holder is ever `done`, and the Keeper's row is
   * `done` only where a review verdict is the state itself. This is what
   * stops the next surface being written from `content.verdict` again.
   */
  it('credits no hop that the candidate’s own state cannot account for', () => {
    const reviewed = new Set([
      'PASS_WITH_NON_BLOCKING_FINDINGS',
      'SAFE_TO_MERGE',
      'MERGED',
      'DEPLOYED',
    ]);
    for (const candidate of [...authority.candidateStates, null] as (string | null)[]) {
      for (const active of [null, ...HOP_ORDER]) {
        for (const verdict of ['—', ...authority.reviewVerdicts]) {
          const content = {
            verdict,
            active,
            candidate,
            ownerGate: false,
          } as unknown as Parameters<typeof hopNodes>[0];
          const nodes = hopNodes(content);
          const where = `candidate ${candidate}, active ${active}, verdict ${verdict}`;
          const holder = active === null ? -1 : HOP_ORDER.indexOf(active);
          if (holder >= 0) {
            // Nothing after the holder has run, and the holder has not
            // returned: the run cannot be ahead of where the run is.
            for (let i = holder; i < 3; i += 1) {
              expect(nodes[i]?.state, `${where} row ${i}`).not.toBe('done');
            }
          }
          if (holder !== 2 && !reviewed.has(candidate ?? '')) {
            expect(nodes[2]?.state, where).toBe('ahead');
          }
          // A verdict on the glass never moves a row on its own.
          expect(hopsReturned(content), where).toBe(nodes.filter((n) => n.state === 'done').length);
        }
      }
    }
  });

  /**
   * **The replay, beat by beat.** It plays recorded history, so a hop drawn as
   * returned there is a claim about something that happened. The Keeper of the
   * first candidate reviewed and blocked it; the Keeper of the second reviewed
   * and passed it — and in neither segment may his row fill before he has the
   * candidate.
   */
  it('claims nothing in the replay either', () => {
    for (const { beat, at } of playbackSchedule('fast')) {
      const state = replayAt(at + 0.05, 'fast', true);
      const nodes = hopNodes(state.content);
      const where = `beat ${beat.id} (candidate ${state.content.candidate}, active ${state.content.active})`;
      const holder =
        state.content.active === null
          ? -1
          : (HOP_ORDER as readonly string[]).indexOf(state.content.active);
      if (holder >= 0) {
        expect(nodes[holder]?.state, where).toBe('active');
        for (let i = holder + 1; i < 3; i += 1) {
          expect(nodes[i]?.state, where).toBe('ahead');
        }
      }
      if (state.content.candidate === 'READY_FOR_REVIEW') {
        expect(nodes[2]?.state, where).not.toBe('done');
      }
      // No bar at all in the replay: no per-hop duration reaches this slab.
      for (const [i, node] of nodes.entries()) {
        expect(ledgerBarFill(node.state, i, at, true), `${where} row ${i}`).toBe(0);
      }
    }
  });
});

/**
 * **The Keeper's KS4-02 and KS4-07, which are one repair seen twice.**
 *
 * KS4-02: `useReplay.ts` states its own invariant in its header — *"`seconds`
 * here is **playback** time and nothing else. **It never appears as a duration
 * of the recorded work**"* — and the run slab's micro-rail printed
 * `{ label: 'elapsed', value: seconds.toFixed(0) + 's' }` in both modes. So the
 * slab that carries `PHASE 0 CONSOLIDATION · RECORDED RUN · REPLAYED` and the
 * real candidate `956be26064` counted `0s`, `2s`, `4s` up the wall clock for a
 * run that took an hour and a half. K11-02 had already removed the *bar* from
 * the replay for that reason and left the number beside it.
 *
 * KS4-07: the parameter deciding whether a duration exists to draw was the same
 * one deciding whether an honesty band is painted. Correct today by coincidence
 * between two unrelated booleans. They are two parameters now, and these
 * assertions hold the band still while moving the other.
 */
describe('playback time is not the recorded run’s elapsed time', () => {
  /** A recorder that also counts filled rectangles, which is what a bar is. */
  function rectRecorder(width: number, height: number) {
    const base = recorder(width, height);
    let rects = 0;
    const ctx = base.ctx as unknown as { fillRect: () => void };
    ctx.fillRect = () => {
      rects += 1;
    };
    return {
      canvas: { width, height, getContext: () => base.ctx } as unknown as HTMLCanvasElement,
      text: base.text,
      count: () => rects,
    };
  }

  function rolesSlab(
    content: Parameters<typeof hopNodes>[0],
    seconds: number,
    showBand: boolean,
    replay: boolean,
  ) {
    const rec = rectRecorder(SLAB_SIZE[0], SLAB_SIZE[1]);
    drawSlab(rec.canvas, {
      kind: 'roles',
      content,
      outcome: 'PASS',
      seconds,
      corner: 20,
      t: seconds,
      since: 1.2,
      showBand,
      replay,
    });
    return rec;
  }

  const replayed = {
    ...replayAt(playbackSchedule('fast')[0]?.at ?? 0, 'fast', true),
    content: contentFor(
      replayAt(playbackSchedule('fast')[0]?.at ?? 0, 'fast', true).content,
      'replay',
    ),
  };

  it('prints the record’s own duration in the replay, never the playback clock', () => {
    const drawn = rolesSlab(replayed.content, 137, true, true).text;
    // The record's `startedAt` to `completedAt`, which the panel and V10's own
    // page already print, and which is what this column now names.
    expect(replayed.content.recordedElapsed).toBe('1 H 30 M');
    expect(drawn).toContain('RECORDED');
    expect(drawn).toContain('1 H 30 M');
    // The playback clock appears nowhere on the slab, in any column.
    expect(drawn).not.toContain('137s');
    expect(drawn.some((line) => /^\d+s$/.test(line))).toBe(false);
    expect(drawn).not.toContain('ELAPSED');
  });

  it('says NOT RECORDED rather than inventing one, where the record has none', () => {
    const { recordedElapsed: _drop, ...bare } = replayed.content;
    const drawn = rolesSlab(bare, 137, true, true).text;
    expect(drawn).toContain('NOT RECORDED');
    expect(drawn).not.toContain('137s');
  });

  it('still prints the demonstration’s own clock, which is the thing it demonstrates', () => {
    const { content } = demoAt(31, 0, true);
    const drawn = rolesSlab(content, 31, false, false).text;
    expect(drawn).toContain('ELAPSED');
    expect(drawn).toContain('31s');
    expect(drawn).not.toContain('NOT RECORDED');
  });

  /**
   * KS4-07, measured: the honesty band is held **off** in both runs, so the
   * only thing that changes is `replay` — and the bars go with it. Before the
   * split this state could not be constructed at all, because one boolean was
   * both answers.
   */
  it('lets the band and the duration claim move independently', () => {
    const { content } = demoAt(40, 0, true);
    const solid = rolesSlab(content, 40, false, false);
    const empty = rolesSlab(content, 40, false, true);
    const filled = hopNodes(content).filter(
      (node, i) => ledgerBarFill(node.state, i, 40, false) > 0,
    ).length;
    expect(filled).toBeGreaterThan(0);
    expect(solid.count() - empty.count()).toBe(filled);
    // And the reverse: with `replay` held false, painting the band adds a band
    // and takes away no bar.
    const banded = rolesSlab(content, 40, true, false);
    expect(banded.text).toContain('ELAPSED');
    expect(
      hopNodes(content).filter((node, i) => ledgerBarFill(node.state, i, 40, false) > 0).length,
    ).toBe(filled);
  });
});

/**
 * **The Keeper's KS4-04: a fabricated commit inside the replay.**
 *
 * The Fabricator's console rail was two constants —
 * `{ label: 'branch', value: 'claude/…-v11' }` and
 * `{ label: 'head', value: CANDIDATE_ID.slice(0, 7) }` — with no mode branch,
 * where every other surface reads `content.candidateId ?? CANDIDATE_ID`. The
 * replay is a replay of recorded history and is the one place where every
 * value on the glass is supposed to be real; it showed `HEAD 9ABCDEF` and a
 * branch that is not the run's, beside three slabs carrying the real candidate
 * and the band `RECORDED RUN · REPLAYED`.
 *
 * The demonstration's identity is data-shaped on purpose and stays, so this
 * asserts the mode split rather than banning the string.
 */
describe('the replay prints no invented identity', () => {
  function consoleText(
    role: Role,
    member: { station: string; report: string },
    content: { candidateId?: string | undefined; branch?: string | undefined },
  ) {
    const [w, h] = CONSOLE_SIZE[role];
    return drawnText(
      (canvas) =>
        drawConsoleScreen(canvas, {
          role,
          label: role,
          state: member.station as Parameters<typeof drawConsoleScreen>[1]['state'],
          report: member.report as Parameters<typeof drawConsoleScreen>[1]['report'],
          outcome: 'PASS',
          quiet: 0,
          corner: 80,
          t: 3,
          since: 1.2,
          showBand: true,
          candidateId: content.candidateId,
          branch: content.branch,
        }),
      w,
      h,
    );
  }

  it('shows the recorded run’s own candidate and branch on every beat', () => {
    for (const { beat, at } of playbackSchedule('fast')) {
      if (!beat.role) continue;
      const state = replayAt(at + 0.05, 'fast', true);
      const member = state.cast[beat.role];
      const content = contentFor(state.content, 'replay');
      const drawn = consoleText(beat.role, member, content).join(' | ');
      const where = `beat ${beat.id}`;
      // Neither the demonstration's data-shaped commit nor its branch.
      expect(drawn, where).not.toContain('9abcdef');
      expect(drawn.toLowerCase(), where).not.toContain('-v11');
      if (beat.role === 'fabricator') {
        expect(drawn, where).toContain((content.candidateId as string).slice(0, 7));
        expect(drawn, where).toContain(content.branch as string);
      }
    }
  });

  it('the two candidates of the recorded run are both reached, and they differ', () => {
    const shown = new Set(
      playbackSchedule('fast').map(
        ({ at }) => replayAt(at + 0.05, 'fast', true).content.candidateId,
      ),
    );
    expect(shown.has('956be26064')).toBe(true);
    expect(shown.has('3b9a964e7d')).toBe(true);
    expect(shown.has('9abcdef012')).toBe(false);
  });

  it('leaves the scripted demonstration’s data-shaped identity exactly as it was', () => {
    const state = demoAt(10, 0, true);
    const drawn = consoleText(
      'fabricator',
      state.cast.fabricator,
      contentFor(state.content, 'demo'),
    ).join(' | ');
    expect(drawn).toContain('9abcdef');
    expect(drawn).toContain('claude/…-v11');
  });
});
