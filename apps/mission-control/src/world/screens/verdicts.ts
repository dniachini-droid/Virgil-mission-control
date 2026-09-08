import type { Report, Verdict } from '../room/demo.js';
import { room } from '../room/palette.js';
import {
  BLOCK_RED,
  type Ctx,
  cross,
  EVIDENCE_BLUE,
  PASS_GREEN,
  RULE,
  strokeAlong,
  tick,
} from './draw.js';
import { clamp01, easeOut, landing, staggered } from './motion.js';

/**
 * The four verdicts, each with its own shape.
 *
 * `constitution/REVIEW_POLICY.md`: "`PASS`, `PASS_WITH_NON_BLOCKING_FINDINGS`,
 * `BLOCKED`, `INSUFFICIENT_EVIDENCE`. A blocked verdict names a proven
 * defect … An insufficient-evidence verdict names the missing proof. The
 * two are different states with different geometry, never distinguished
 * by colour alone. Non-blocking findings persist and stay inspectable
 * after a passing verdict." `STATE_LANGUAGE.md`: "Nothing else is a
 * verdict."
 *
 * V7 showed two colours for four outcomes, and the two it collapsed were
 * the ones that carry the most meaning: every independent review of this
 * repository has returned `PASS_WITH_NON_BLOCKING_FINDINGS` — never a bare
 * `PASS` — and `INSUFFICIENT_EVIDENCE` is not a failure. So (V8 §0.10.7,
 * confirmed by the owner: "the screen should show the 4 verdicts") each
 * has a distinct geometry as well as a colour:
 *
 *  - **PASS** — green; a whole ring of twelve segments; a tick.
 *  - **PASS_WITH_NON_BLOCKING_FINDINGS** — green; the same ring with the
 *    findings riding on it as amber notches, one each, persisting; a tick.
 *    Two lines: PASS, then WITH NON-BLOCKING FINDINGS.
 *  - **BLOCKED** — red; the ring broken, every third segment gone; a cross.
 *  - **INSUFFICIENT_EVIDENCE** — a cool neutral blue, never red; the ring
 *    only outlined, thin, with a gap left open at the top where the
 *    missing proof would go; inside it an empty bracket, no tick and no
 *    cross. Two lines: INSUFFICIENT, then EVIDENCE.
 *
 * And **COMPLETE**, which is not a verdict but the Fabricator's claim: an
 * ice-coloured open circle with nothing inside it — a ring, not a tick.
 */

export interface VerdictLook {
  tint: string;
  /** The words, one or two lines; the first is the big one. */
  lines: [string] | [string, string];
}

export function verdictLook(report: Report): VerdictLook {
  switch (report) {
    case 'PASS':
      return { tint: PASS_GREEN, lines: ['PASS'] };
    case 'PASS_WITH_NON_BLOCKING_FINDINGS':
      return { tint: PASS_GREEN, lines: ['PASS', 'WITH NON-BLOCKING FINDINGS'] };
    case 'BLOCKED':
      return { tint: BLOCK_RED, lines: ['BLOCKED'] };
    case 'INSUFFICIENT_EVIDENCE':
      return { tint: EVIDENCE_BLUE, lines: ['INSUFFICIENT', 'EVIDENCE'] };
    case 'COMPLETE':
      return { tint: room.emit.ice, lines: ['COMPLETE'] };
    default:
      return { tint: room.emit.cyan, lines: ['AWAITING'] };
  }
}

export const SEGMENTS = 12;

/**
 * The verdict's ring and mark at (cx, cy), radius r. `seal` (0..1) is how
 * far the ring has closed — segments light in sequence — and `mark`
 * (0..1) how far the mark inside has drawn; `findings` is how many
 * non-blocking findings ride on a passing ring.
 */
export function drawVerdictMark(
  ctx: Ctx,
  cx: number,
  cy: number,
  r: number,
  report: Report | Verdict,
  seal: number,
  mark: number,
  findings = 0,
) {
  const { tint } = verdictLook(report as Report);
  const hollow = report === 'INSUFFICIENT_EVIDENCE';
  const claim = report === 'COMPLETE';
  const broken = report === 'BLOCKED';
  ctx.save();
  ctx.lineCap = 'butt';
  if (claim) {
    // A claim: one thin open circle, drawn round, nothing inside.
    ctx.strokeStyle = tint;
    ctx.lineWidth = RULE;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * easeOut(seal));
    ctx.stroke();
    ctx.restore();
    return;
  }
  // The gap INSUFFICIENT_EVIDENCE leaves open at the top: two segments.
  const missing = hollow ? new Set([0, SEGMENTS - 1]) : new Set<number>();
  for (let k = 0; k < SEGMENTS; k += 1) {
    if (broken && k % 3 === 1) continue;
    const a0 = -Math.PI / 2 + (k / SEGMENTS) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2) / SEGMENTS - 0.09;
    const lit = staggered(seal * (SEGMENTS + 1), k, 1, 1);
    if (lit <= 0) continue;
    ctx.strokeStyle = tint;
    if (missing.has(k)) {
      // Where the proof would go: a faint dotted trace, not a segment.
      ctx.globalAlpha = 0.22 * lit;
      ctx.lineWidth = 6;
      ctx.setLineDash([6, 12]);
    } else {
      ctx.globalAlpha = lit;
      ctx.lineWidth = hollow ? 10 : 26;
      ctx.setLineDash(hollow ? [18, 10] : []);
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Findings riding on a passing ring: amber notches at segment joins,
  // persisting after the verdict — the policy's "stay inspectable".
  for (let f = 0; f < findings; f += 1) {
    const at = staggered(seal * (SEGMENTS + 1), 2 + f * 3, 1, 1);
    if (at <= 0) continue;
    const a = -Math.PI / 2 + ((2 + f * 3) / SEGMENTS) * Math.PI * 2 - 0.045;
    const k = landing(at, 0.25);
    const nr = r + 26 * k;
    ctx.globalAlpha = 1;
    ctx.fillStyle = room.warm.amber;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * nr, cy + Math.sin(a) * nr, 15 * k, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // The mark inside, with weight: it scales in past its size and settles.
  const m = clamp01(mark);
  if (m > 0) {
    const size = r * 0.78;
    const scale = landing(m, 0.16);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    if (broken) cross(ctx, cx - size / 2, cy - size / 2, tint, size, m);
    else if (hollow) {
      // An empty bracket: the slot for the evidence that is not there.
      ctx.strokeStyle = tint;
      ctx.lineWidth = 12;
      ctx.lineCap = 'butt';
      const bw = size * 0.72;
      const bh = size * 0.62;
      const x = cx - bw / 2;
      const y = cy - bh / 2;
      strokeAlong(
        ctx,
        [
          [x + bw * 0.28, y],
          [x, y],
          [x, y + bh],
          [x + bw * 0.28, y + bh],
        ],
        m,
      );
      strokeAlong(
        ctx,
        [
          [x + bw * 0.72, y],
          [x + bw, y],
          [x + bw, y + bh],
          [x + bw * 0.72, y + bh],
        ],
        m,
      );
      ctx.globalAlpha = 0.45 * m;
      ctx.fillStyle = tint;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.fill();
    } else tick(ctx, cx - size / 2, cy - size / 2, tint, size, m);
    ctx.restore();
  }
  ctx.restore();
}
