import { type Ctx, roundRect } from './chrome.js';
import { CORE, clamp01, dim, easeOut, STRUCTURE } from './system.js';

/**
 * **The marks: the one element of the system that survives the overview.**
 *
 * Measured, not assumed: at a 390 CSS-pixel portrait viewport the three
 * consoles' displays are 37–43 CSS pixels wide and 19–26 tall
 * (`test/screen-geometry-v11.test.ts`), and this project has already
 * measured that screen text collapses below about 64 pixels of display
 * width (`docs/process/PHASE_1_CONVERSATION_INTERFACE.md`). So **no text on
 * these displays is claimed legible from the overview**, and the primary
 * state has to be carried by something that is not text.
 *
 * That is what these are. Each status mark is a ring of about 0.24 of the
 * canvas height — eleven CSS pixels at the overview — whose *colour* and
 * whose *interior shape* are the state: a tick, a bar, a turning segment,
 * an inward chevron, a broken ring, a seal. Colour resolves at four
 * pixels; a shape this large resolves at eleven. The word beside it
 * resolves when the camera goes to the console.
 *
 * `k` in 0..1 is the arrival: 0 is the instant the state changed.
 */

export type MarkKind =
  | 'passed'
  | 'blocked'
  | 'working'
  | 'receiving'
  | 'reported'
  | 'waiting'
  | 'insufficient'
  | 'sealed'
  | 'standby';

/** The ring every mark is set in: a heavy arc with a deliberate gap at the top. */
function bezelRing(
  ctx: Ctx,
  cx: number,
  cy: number,
  r: number,
  colour: string,
  weight: number,
  progress = 1,
  gap = 0.16,
) {
  const start = -Math.PI / 2 + gap;
  const span = (Math.PI * 2 - 2 * gap) * clamp01(progress);
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = weight;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.arc(cx, cy, r, start, start + span);
  ctx.stroke();
  ctx.restore();
}

/** The dark disc the interior shape is drawn on, so the shape has contrast. */
function face(ctx: Ctx, cx: number, cy: number, r: number, colour: string) {
  const g = ctx.createRadialGradient(cx, cy - r * 0.3, 0, cx, cy, r);
  g.addColorStop(0, `${colour}52`);
  g.addColorStop(0.65, `${colour}24`);
  g.addColorStop(1, `${colour}0a`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

export function statusMark(kind: MarkKind, t = 0) {
  return (ctx: Ctx, cx: number, cy: number, r: number, colour: string, k = 1) => {
    // 0.17 of the radius, not 0.115: at the overview the whole mark is
    // about ten CSS pixels across, and a stroke of 0.115 r was 0.6 of a
    // pixel there — it vanished into the mipmap. This is the one number
    // that decides whether the primary state is visible from the overview
    // at all, and it was chosen by rendering the mark at 43 x 25 CSS px in
    // the study and looking at it.
    const weight = Math.max(2, r * 0.17);
    const inner = r * 0.62;
    ctx.save();
    face(ctx, cx, cy, r * 0.92, colour);
    // A faint outer graduation: sixteen ticks, the instrument's own dial.
    ctx.strokeStyle = dim(0.16);
    ctx.lineWidth = Math.max(2, r * 0.035);
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2;
      const x0 = cx + Math.cos(a) * r * 1.14;
      const y0 = cy + Math.sin(a) * r * 1.14;
      const x1 = cx + Math.cos(a) * r * (i % 4 === 0 ? 1.26 : 1.2);
      const y1 = cy + Math.sin(a) * r * (i % 4 === 0 ? 1.26 : 1.2);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    switch (kind) {
      case 'working': {
        bezelRing(ctx, cx, cy, r, `${colour}33`, weight, 1, 0.02);
        // One bright segment turning: a twelve-second revolution.
        const a = ((t / 12) % 1) * Math.PI * 2;
        ctx.save();
        ctx.strokeStyle = colour;
        ctx.lineWidth = weight;
        ctx.beginPath();
        ctx.arc(cx, cy, r, a, a + Math.PI * 0.62);
        ctx.stroke();
        ctx.restore();
        // The core: a lit point at the segment's head.
        const hx = cx + Math.cos(a + Math.PI * 0.62) * r;
        const hy = cy + Math.sin(a + Math.PI * 0.62) * r;
        ctx.fillStyle = CORE;
        ctx.beginPath();
        ctx.arc(hx, hy, weight * 0.62, 0, Math.PI * 2);
        ctx.fill();
        // Three bars inside, rising: work in progress.
        for (let i = 0; i < 3; i += 1) {
          const phase = (t * 0.7 + i * 0.33) % 1;
          const bh = inner * (0.32 + 0.62 * Math.abs(Math.sin(phase * Math.PI)));
          const bw = inner * 0.26;
          ctx.fillStyle = colour;
          ctx.globalAlpha = 0.55 + 0.35 * (1 - Math.abs(i - 1) * 0.4);
          roundRect(ctx, cx + (i - 1) * bw * 1.5 - bw / 2, cy + inner * 0.6 - bh, bw, bh, bw * 0.3);
          ctx.fill();
        }
        break;
      }
      case 'receiving': {
        bezelRing(ctx, cx, cy, r, `${colour}2e`, weight, 1, 0.02);
        bezelRing(ctx, cx, cy, r, colour, weight, k, 0.02);
        // Three chevrons closing inward on a four-second beat.
        for (let i = 0; i < 3; i += 1) {
          const phase = (t * 0.25 + i / 3) % 1;
          const rr = inner * (1.15 - 0.75 * phase);
          ctx.globalAlpha = Math.sin(Math.PI * phase) * 0.9;
          ctx.strokeStyle = colour;
          ctx.lineWidth = weight * 0.8;
          ctx.beginPath();
          ctx.moveTo(cx - rr * 0.7, cy - rr * 0.42);
          ctx.lineTo(cx, cy + rr * 0.24);
          ctx.lineTo(cx + rr * 0.7, cy - rr * 0.42);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        break;
      }
      case 'passed': {
        bezelRing(ctx, cx, cy, r, colour, weight, k, 0.02);
        // The tick, drawn rather than stamped.
        const pts: [number, number][] = [
          [cx - inner * 0.5, cy + inner * 0.04],
          [cx - inner * 0.13, cy + inner * 0.42],
          [cx + inner * 0.56, cy - inner * 0.42],
        ];
        strokePath(ctx, pts, colour, weight * 1.15, clamp01((k - 0.25) / 0.75));
        break;
      }
      case 'blocked': {
        bezelRing(ctx, cx, cy, r, colour, weight, k, 0.02);
        // A single heavy bar: a refusal is one gesture, not two crossed.
        ctx.save();
        ctx.globalAlpha = easeOut(clamp01((k - 0.2) / 0.8));
        ctx.fillStyle = colour;
        roundRect(
          ctx,
          cx - inner * 0.62,
          cy - weight * 0.72,
          inner * 1.24,
          weight * 1.44,
          weight * 0.7,
        );
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'insufficient': {
        // A ring with a piece genuinely missing: the evidence is not there.
        bezelRing(ctx, cx, cy, r, `${colour}30`, weight, 1, 0.02);
        bezelRing(ctx, cx, cy, r, colour, weight, 0.68 * k, 0.02);
        ctx.save();
        ctx.globalAlpha = easeOut(k);
        ctx.strokeStyle = colour;
        ctx.lineWidth = weight;
        ctx.beginPath();
        ctx.moveTo(cx, cy - inner * 0.46);
        ctx.lineTo(cx, cy + inner * 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy + inner * 0.44, weight * 0.62, 0, Math.PI * 2);
        ctx.fillStyle = colour;
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'reported': {
        bezelRing(ctx, cx, cy, r, colour, weight, k, 0.02);
        // An outward chevron: a claim leaving, not a verdict arriving.
        const pts: [number, number][] = [
          [cx - inner * 0.42, cy + inner * 0.44],
          [cx + inner * 0.3, cy],
          [cx - inner * 0.42, cy - inner * 0.44],
        ];
        strokePath(ctx, pts, colour, weight, clamp01((k - 0.2) / 0.8));
        break;
      }
      case 'waiting': {
        bezelRing(ctx, cx, cy, r, `${colour}44`, weight, 1, 0.02);
        // A slow pulse: the owner's attention is asked for, not demanded.
        const pulse = 0.5 + 0.5 * Math.sin((t / 3.2) * Math.PI * 2);
        ctx.save();
        ctx.globalAlpha = 0.4 + 0.6 * pulse;
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.arc(cx, cy, inner * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = CORE;
        ctx.beginPath();
        ctx.arc(cx, cy, inner * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        bezelRing(ctx, cx, cy, r * (1 + 0.06 * pulse), colour, weight * 0.5, 1, 0.02);
        break;
      }
      case 'sealed': {
        bezelRing(ctx, cx, cy, r, colour, weight, k, 0.02);
        // A hexagonal seal, drawn edge by edge.
        const hex: [number, number][] = [];
        for (let i = 0; i <= 6; i += 1) {
          const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
          hex.push([cx + Math.cos(a) * inner * 0.62, cy + Math.sin(a) * inner * 0.62]);
        }
        strokePath(ctx, hex, colour, weight * 0.85, clamp01((k - 0.15) / 0.85));
        ctx.save();
        ctx.globalAlpha = easeOut(clamp01((k - 0.6) / 0.4)) * 0.9;
        ctx.fillStyle = STRUCTURE.goldBright;
        ctx.beginPath();
        ctx.arc(cx, cy, inner * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }
      default: {
        // Standby: the instrument is powered and has nothing to say.
        bezelRing(ctx, cx, cy, r, dim(0.34), weight * 0.72, 1, 0.02);
        const breath = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin((t / 5) * Math.PI * 2));
        ctx.globalAlpha = breath;
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.arc(cx, cy, inner * 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
    ctx.restore();
  };
}

/** A polyline drawn to `progress` of its own length, with round joins. */
export function strokePath(
  ctx: Ctx,
  points: readonly [number, number][],
  colour: string,
  weight: number,
  progress = 1,
) {
  if (points.length < 2) return;
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1] as [number, number];
    const b = points[i] as [number, number];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    lengths.push(l);
    total += l;
  }
  const want = total * clamp01(progress);
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = weight;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  const first = points[0] as [number, number];
  ctx.moveTo(first[0], first[1]);
  let run = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1] as [number, number];
    const b = points[i] as [number, number];
    const l = lengths[i - 1] as number;
    if (run + l <= want) {
      ctx.lineTo(b[0], b[1]);
      run += l;
    } else {
      const f = l === 0 ? 0 : (want - run) / l;
      ctx.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f);
      break;
    }
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * The agents' own header marks: four small glyphs in one family — a ring
 * with something inside it — so identity is read before anything else.
 */
export const agentMark: Record<
  string,
  (ctx: Ctx, x: number, y: number, r: number, c: string) => void
> = {
  virgil(ctx, x, y, r, c) {
    ring(ctx, x, y, r, c, r * 0.2);
    ctx.save();
    ctx.strokeStyle = c;
    ctx.lineWidth = Math.max(2, r * 0.16);
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.5, r * 0.44, -0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    dot(ctx, x, y, r * 0.34, c);
  },
  fabricator(ctx, x, y, r, c) {
    ring(ctx, x, y, r, c, r * 0.2);
    ctx.save();
    ctx.strokeStyle = c;
    ctx.lineWidth = Math.max(2, r * 0.2);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y + r * 0.34);
    ctx.lineTo(x, y - r * 0.42);
    ctx.lineTo(x + r * 0.5, y + r * 0.34);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  },
  prover(ctx, x, y, r, c) {
    ring(ctx, x, y, r, c, r * 0.2);
    ctx.save();
    ctx.strokeStyle = c;
    ctx.lineWidth = Math.max(2, r * 0.2);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.46, y);
    ctx.lineTo(x, y - r * 0.46);
    ctx.lineTo(x + r * 0.46, y);
    ctx.lineTo(x, y + r * 0.46);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  },
  keeper(ctx, x, y, r, c) {
    ring(ctx, x, y, r, c, r * 0.2);
    ctx.save();
    ctx.fillStyle = c;
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 3; i += 1) {
      roundRect(ctx, x - r * 0.44, y - r * 0.42 + i * r * 0.32, r * 0.88, r * 0.18, r * 0.08);
      ctx.fill();
    }
    ctx.restore();
  },
};

function ring(ctx: Ctx, x: number, y: number, r: number, c: string, weight: number) {
  ctx.save();
  ctx.strokeStyle = c;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = Math.max(2, weight);
  ctx.beginPath();
  ctx.arc(x, y, r * 1.28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function dot(ctx: Ctx, x: number, y: number, r: number, c: string) {
  ctx.save();
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
