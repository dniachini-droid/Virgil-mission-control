import type { Report } from '../room/demo.js';
import { type Arrival, arrivalPoint, RETURNING } from './arrival.js';
import { bigWord, type Ctx, DIM, dataLine, display, fitFont, glowDot, spaced } from './draw.js';
import { clamp01, easeIn, easeInOut, easeOut, landing, scatter, staggered } from './motion.js';
import { drawVerdictMark, verdictLook } from './verdicts.js';

/**
 * The return: a verdict converging onto a screen.
 *
 * V8 (`docs/process/PHASE_1_STYLISED_SPEC.md` §0.10.6). The owner: "when
 * virgil recieves a pass or a block - the information should come back
 * onto the screen and almost converge, or like millions of pieces of
 * data coming to gether, or some other creative way." Built as the
 * **inverse of receiving** (`stationScreen.ts`): receiving disperses —
 * something arrives and unpacks; returning converges — many small pieces
 * travel in from the arrival edge and across the screen and gather into
 * one ring, which seals segment by segment as they arrive; the ring
 * pulses once — the verdict's moment, an event rather than a colour
 * change — the mark inside draws itself with weight, the words land, and
 * the evidence rows arrive in sequence beneath. Built as a pair with
 * receiving they read as a cycle. The same drawing serves an agent's
 * console (their own verdict, with their counts beneath) and Virgil's
 * review slab (the verdict returned to him, with the deterministic
 * evidence beneath).
 *
 * `since` is seconds since the verdict was given; the moments are in
 * `arrival.ts` (`RETURNING`), which is where a tube would deliver into.
 */

const PIECES = 150;

/**
 * A hex colour at an alpha, as an `rgba()` string: the gradient stops of
 * the verdict's tint need it, and every colour in this world is a hex
 * literal (`draw.ts`, `room/palette.ts`).
 */
export function withAlpha(colour: string, alpha: number): string {
  const hex = colour.replace('#', '');
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export interface ReturnLayout {
  /** The ring's centre and radius. */
  cx: number;
  cy: number;
  r: number;
  /** Where the words go: left edge, top, and the width they may fill. */
  wordX: number;
  wordY: number;
  wordWidth: number;
  /** Where the lines beneath start, and their pitch. */
  linesX: number;
  linesY: number;
  linesWidth: number;
  pitch: number;
}

/**
 * The convergence at `since` seconds: pieces gathering into the ring.
 * `w`, `h` are the canvas above the band.
 */
export function drawConvergence(
  ctx: Ctx,
  w: number,
  h: number,
  since: number,
  arrival: Arrival,
  cx: number,
  cy: number,
  r: number,
  tint: string,
) {
  const [ax, ay] = arrivalPoint(arrival, w, h);
  const span = RETURNING.seal - RETURNING.converge;
  for (let i = 0; i < PIECES; i += 1) {
    // Half the pieces come in through the arrival point, the rest from
    // across the screen: the result returning, and the evidence it is
    // made of gathering to meet it.
    const fromEdge = i % 2 === 0;
    const s1 = scatter(i, 1);
    const s2 = scatter(i, 2);
    const sx = fromEdge ? ax + (s1 - 0.5) * w * 0.12 : s1 * w;
    const sy = fromEdge ? ay + (s2 - 0.5) * h * 0.12 : s2 * h;
    // Each aims at its own point on the ring, so they build it rather than pile at its centre.
    const angle = scatter(i, 3) * Math.PI * 2;
    const tx = cx + Math.cos(angle) * r;
    const ty = cy + Math.sin(angle) * r;
    const start = RETURNING.converge + scatter(i, 4) * span * 0.55;
    const duration = span * (0.45 + scatter(i, 5) * 0.3);
    const p = clamp01((since - start) / duration);
    if (p <= 0 || p >= 1) continue;
    const k = easeInOut(p);
    // A slight curve on the way, so the paths are not all straight lines to one point.
    const bend = (scatter(i, 6) - 0.5) * 0.35;
    const mx = (sx + tx) / 2 + (ty - sy) * bend;
    const my = (sy + ty) / 2 - (tx - sx) * bend;
    const x = (1 - k) * (1 - k) * sx + 2 * (1 - k) * k * mx + k * k * tx;
    const y = (1 - k) * (1 - k) * sy + 2 * (1 - k) * k * my + k * k * ty;
    // The trail: the same piece a beat earlier, fainter — the secondary motion.
    const kb = easeInOut(clamp01(p - 0.06));
    const bx = (1 - kb) * (1 - kb) * sx + 2 * (1 - kb) * kb * mx + kb * kb * tx;
    const by = (1 - kb) * (1 - kb) * sy + 2 * (1 - kb) * kb * my + kb * kb * ty;
    const size = 3 + 5 * scatter(i, 7);
    ctx.strokeStyle = tint;
    ctx.lineWidth = size * 0.9;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.35 * (1 - p * 0.5);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // The signal at the arrival point while pieces are still coming through it.
  const signal =
    clamp01((since - RETURNING.converge) / 0.3) * clamp01((RETURNING.seal - since) / 0.4);
  if (signal > 0) glowDot(ctx, ax, ay, 18 + 6 * Math.sin(since * 22), tint, signal);
}

/**
 * The whole return: convergence, the seal and its pulse, the mark, the
 * words, the lines beneath. `findings` rides on a passing ring.
 */
/**
 * **How small the verdict’s second line may be set** (V10).
 *
 * The words under a verdict are fitted to a box that ends where the
 * verdict’s mark begins. `fitFont`’s floor was 40 px for every caller,
 * and one string in the vocabulary does not fit at 40: `WITH
 * NON-BLOCKING FINDINGS` measures **673 px** in this build’s own Outfit
 * Bold at 0.04em against a **566 px** box on a slab, so it ran 107 px —
 * about four characters — past its box and under the mark. The replay
 * made it plain, because `PASS_WITH_NON_BLOCKING_FINDINGS` is the real
 * verdict this run ended on and it stands on the centre slab for three
 * beats; but the scripted demonstration has shown the same collision
 * since V8 raised that verdict on the third loop.
 *
 * A floor of 26 lets the fitter reach 32 px, where the line measures
 * 538 px and fits. **The line is set smaller rather than shortened** —
 * the same choice the honesty band makes on a phone, for the same
 * reason: an abbreviation loses a word, and a smaller line loses none.
 */
export const SECOND_LINE_MIN = 26;

export function drawReturn(
  ctx: Ctx,
  w: number,
  h: number,
  since: number,
  arrival: Arrival,
  report: Report,
  layout: ReturnLayout,
  lines: string[],
  findings = 0,
) {
  const { tint, lines: words } = verdictLook(report);
  const { cx, cy, r } = layout;
  if (since < RETURNING.seal + 0.4) drawConvergence(ctx, w, h, since, arrival, cx, cy, r, tint);
  // The ring seals as the pieces arrive; the mark draws once it has.
  const seal = clamp01(
    (since - (RETURNING.converge + 0.5)) / (RETURNING.land - RETURNING.converge - 0.5),
  );
  const mark = clamp01((since - RETURNING.land) / 0.55);
  drawVerdictMark(ctx, cx, cy, r, report, seal, mark, findings);
  /*
   * The moment: a pulse expanding out of the sealed ring, once, and the
   * tint spreading from it.
   *
   * **V9, item 3.3 — the verdict's colour is a tint on a black ground,
   * not a wash over it.** The owner has asked repeatedly for the displays
   * to be black, and V8.3 measured the centre slab at a median luminance
   * of **52.4** against 39.0–39.9 for the other four surfaces, and
   * established that the excess is the verdict's own green rather than
   * the glass. This is where most of it was: a flat `fillRect` of the
   * tint over the **whole picture** at up to 0.16 alpha, which lifts
   * every pixel of a luminance-11 ink by about thirteen levels and is the
   * definition of a wash.
   *
   * It is now a radial gradient centred on the ring — brighter at the
   * centre than the flat wash was, so the verdict's force is not lost,
   * and zero by 1.9 radii, so the ground away from the ring stays exactly
   * as black as every other display. The expanding ring itself is
   * untouched: that is the event, and it is drawn, not washed.
   */
  const pulse = clamp01((since - RETURNING.seal) / 0.7);
  if (pulse > 0 && pulse < 1) {
    ctx.strokeStyle = tint;
    ctx.globalAlpha = 0.7 * (1 - easeOut(pulse));
    ctx.lineWidth = 14 * (1 - pulse) + 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r + easeOut(pulse) * r * 1.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const spread = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.9);
    const strength = 0.26 * (1 - pulse);
    spread.addColorStop(0, withAlpha(tint, strength));
    spread.addColorStop(0.55, withAlpha(tint, strength * 0.45));
    spread.addColorStop(1, withAlpha(tint, 0));
    ctx.fillStyle = spread;
    ctx.fillRect(0, 0, w, h);
  }
  // The words land with weight; the second line follows a beat later.
  const arriveWord = clamp01((since - RETURNING.land) / 0.5);
  if (arriveWord > 0) {
    bigWord(ctx, words[0], layout.wordX, layout.wordY, layout.wordWidth, tint, arriveWord);
  }
  /*
   * **The second line's own foot, measured** (V9, item 3.1). The owner's
   * defect: on the Prover's console `INSUFFICIENT EVIDENCE` ran over the
   * tally beneath it. It was arithmetic and not taste — the second line
   * sat at `wordY + 190` and was set at up to 56 px, so its glyphs
   * reached `wordY + 246`, while the lines beneath started at
   * `floor - 40 - lines · 48`. On the Prover's screen, whose canvas is
   * 1024 × 594 at its own aspect, that is 376 against 340: **36 pixels of
   * overlap**, on the longest word the demonstration shows. It has been
   * there since V8 and was deliberately skipped twice.
   *
   * The fix is to measure rather than to nudge: the second line reports
   * where its glyphs end, the rows below start at least `WORD_GAP` under
   * that, and if honouring both would push the last row past the band the
   * pitch closes up instead of the text colliding.
   * `test/screen-motion.test.ts` checks it for every role, every verdict
   * and every console's real aspect, so it cannot come back.
   */
  const SECOND_LINE_TOP = 190;
  const WORD_GAP = 22;
  let wordsBottom = layout.wordY;
  if (words[1]) {
    const arriveSecond = clamp01((since - RETURNING.land - 0.25) / 0.45);
    // The size is fitted whether or not the line is visible yet, so the
    // rows below never move as it arrives.
    spaced(ctx, '0.04em');
    const size = fitFont(ctx, display, 56, words[1], layout.wordWidth, SECOND_LINE_MIN);
    spaced(ctx, '0em');
    wordsBottom = layout.wordY + SECOND_LINE_TOP + size;
    if (arriveSecond > 0) {
      ctx.save();
      ctx.globalAlpha = easeOut(arriveSecond);
      spaced(ctx, '0.04em');
      fitFont(ctx, display, 56, words[1], layout.wordWidth, SECOND_LINE_MIN);
      ctx.fillStyle = tint;
      ctx.textBaseline = 'top';
      const slide = (1 - landing(arriveSecond, 0.1)) * 30;
      ctx.fillText(words[1], layout.wordX, layout.wordY + SECOND_LINE_TOP + slide);
      spaced(ctx, '0em');
      ctx.restore();
    }
  }
  const rows = evidenceRows(layout, lines.length, wordsBottom + WORD_GAP, h);
  // The lines beneath, in sequence: each slides up into place.
  lines.forEach((line, i) => {
    const p = staggered(since - RETURNING.evidence, i, 0.45, 0.22);
    if (p <= 0) return;
    ctx.save();
    ctx.globalAlpha = easeOut(p);
    const slide = (1 - easeOut(p)) * 36;
    dataLine(
      ctx,
      line,
      layout.linesX,
      rows.top + i * rows.pitch + slide,
      layout.linesWidth,
      i === 0 ? tint : DIM,
      rows.pitch * 0.72,
    );
    ctx.restore();
  });
  // Held: the ring breathes, slowly.
  if (since > RETURNING.held) {
    ctx.strokeStyle = tint;
    ctx.globalAlpha = 0.12 + 0.08 * Math.sin((since - RETURNING.held) * 1.6);
    ctx.lineWidth = 34;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/**
 * Where the evidence rows go, given the layout's wish, how many there
 * are, the lowest point the words above reach, and the height available.
 * Pure, so `test/screen-motion.test.ts` can hold it against every
 * console's own aspect (V9, item 3.1).
 */
export function evidenceRows(
  layout: ReturnLayout,
  count: number,
  clearOf: number,
  height: number,
): { top: number; pitch: number } {
  const top = Math.max(layout.linesY, clearOf);
  if (count === 0) return { top, pitch: layout.pitch };
  // The rows must also finish above the foot of the picture. Where the
  // wish and the clearance cannot both be met, the pitch closes up — the
  // one thing never done is letting two lines of type cross.
  const room = height - 12 - top;
  const pitch = Math.min(layout.pitch, Math.max(26, room / count));
  return { top, pitch };
}

/** How far the previous content should have withdrawn, 0..1, at the start of a return. */
export function withdrawal(since: number): number {
  return easeIn(clamp01((since - RETURNING.gather) / 0.35));
}
