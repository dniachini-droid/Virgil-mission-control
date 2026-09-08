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
  // The moment: a pulse expanding out of the sealed ring, once, and a
  // wash of the tint across the screen that drains away.
  const pulse = clamp01((since - RETURNING.seal) / 0.7);
  if (pulse > 0 && pulse < 1) {
    ctx.strokeStyle = tint;
    ctx.globalAlpha = 0.7 * (1 - easeOut(pulse));
    ctx.lineWidth = 14 * (1 - pulse) + 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r + easeOut(pulse) * r * 1.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.16 * (1 - pulse);
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }
  // The words land with weight; the second line follows a beat later.
  const arriveWord = clamp01((since - RETURNING.land) / 0.5);
  if (arriveWord > 0) {
    bigWord(ctx, words[0], layout.wordX, layout.wordY, layout.wordWidth, tint, arriveWord);
  }
  if (words[1]) {
    const arriveSecond = clamp01((since - RETURNING.land - 0.25) / 0.45);
    if (arriveSecond > 0) {
      ctx.save();
      ctx.globalAlpha = easeOut(arriveSecond);
      spaced(ctx, '0.04em');
      fitFont(ctx, display, 56, words[1], layout.wordWidth);
      ctx.fillStyle = tint;
      ctx.textBaseline = 'top';
      const slide = (1 - landing(arriveSecond, 0.1)) * 30;
      ctx.fillText(words[1], layout.wordX, layout.wordY + 190 + slide);
      spaced(ctx, '0em');
      ctx.restore();
    }
  }
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
      layout.linesY + i * layout.pitch + slide,
      layout.linesWidth,
      i === 0 ? tint : DIM,
      layout.pitch * 0.72,
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

/** How far the previous content should have withdrawn, 0..1, at the start of a return. */
export function withdrawal(since: number): number {
  return easeIn(clamp01((since - RETURNING.gather) / 0.35));
}
