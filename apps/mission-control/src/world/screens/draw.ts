import { room } from '../room/palette.js';
import { DISPLAY, MONO } from './fonts.js';
import { clamp01, easeOut, landing } from './motion.js';

/**
 * What every screen shares: the frame, the honesty band, the two faces,
 * the heavy shapes. Drawn onto canvas textures in the `ADR-0010` pattern:
 * no font fetch, no `data:` URI, nothing outside the document.
 *
 * V6 (`docs/process/PHASE_1_STYLISED_SPEC.md` §4): "as if from a console
 * from a space animation movie". The defining rule is subtraction — three
 * or four words per panel, enormous; flat saturated colour on near-black;
 * chunky geometry only; rules of eight to twelve canvas pixels, never
 * hairlines; one deliberate imperfection per screen. V8 (§0.10.6)
 * reverses one thing: the motion is no longer stepped. It eases, lands
 * and settles (`motion.ts`).
 *
 * Everything drawn here is **illustrative** and is labelled so on every
 * panel, on the thick amber stripe along its foot. None of it is this
 * repository's real state, and it never claims to be.
 */

export type Ctx = CanvasRenderingContext2D;

export const display = (px: number) => `700 ${px}px ${DISPLAY}`;
export const mono = (px: number) => `700 ${px}px ${MONO}`;
/** The honesty stripe along the foot of every panel, in canvas pixels. */
export const BAND_HEIGHT = 118;
export const INK = '#070a18';
export const TEXT = '#e6f0ff';
export const DIM = 'rgba(214,232,255,0.55)';
export const FAINT = 'rgba(214,232,255,0.14)';
export const PASS_GREEN = '#b6ff5c';
export const BLOCK_RED = '#ff3b5c';
/** INSUFFICIENT_EVIDENCE: cool and neutral — not green, and never red. */
export const EVIDENCE_BLUE = '#9dc0ff';
/** The owner's colour: used for the one thing waiting on them, and for nothing else. */
export const OWNER_GOLD = room.surface.goldBright;
export const RULE = 10;

export function spaced(ctx: Ctx, em: string) {
  // Chromium, Safari 17.4 and Firefox 130 honour it; elsewhere it is ignored.
  (ctx as Ctx & { letterSpacing?: string }).letterSpacing = em;
}

/** Sets `font` at the largest size, at most `px`, at which `text` fits `maxWidth`. */
export function fitFont(
  ctx: Ctx,
  kind: (px: number) => string,
  px: number,
  text: string,
  maxWidth: number,
) {
  let size = px;
  ctx.font = kind(size);
  while (size > 40 && ctx.measureText(text).width > maxWidth) {
    size -= 6;
    ctx.font = kind(size);
  }
  return size;
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/** A deterministic flicker: 1 most of the time, a little dimmer now and then. */
export function flicker(t: number): number {
  const k = Math.floor(t * 12);
  const h = ((k * 2654435761) >>> 0) % 97;
  return h < 4 ? 0.9 : h < 7 ? 0.95 : 1;
}

/**
 * The frame every panel shares: flat near-black, a thick inset rule and
 * corner brackets in the tint, the title — one word, big — and the stripe
 * along the foot that keeps it honest: solid amber, four heavy dark words,
 * every panel, every frame. Returns the height left above the stripe.
 * `lift` brightens the rule for a verdict's moment.
 */
export function frame(ctx: Ctx, w: number, h: number, title: string, tint: string, lift = 0) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  // A thick inset rule and heavy corner brackets. Never a hairline.
  ctx.strokeStyle = tint;
  ctx.globalAlpha = 0.35 + 0.55 * clamp01(lift);
  ctx.lineWidth = RULE;
  ctx.strokeRect(22, 22, w - 44, h - BAND_HEIGHT - 44);
  ctx.globalAlpha = 1;
  ctx.lineWidth = RULE + 6;
  ctx.lineCap = 'butt';
  const m = 64;
  for (const [sx, sy] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const) {
    const x = sx > 0 ? 22 : w - 22;
    const y = sy > 0 ? 22 : h - BAND_HEIGHT - 22;
    ctx.beginPath();
    ctx.moveTo(x, y + sy * m);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * m, y);
    ctx.stroke();
  }
  // Title: one word.
  ctx.fillStyle = tint;
  ctx.font = display(72);
  spaced(ctx, '0.08em');
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(title, 64, 54);
  spaced(ctx, '0em');
  band(ctx, w, h);
  return h - BAND_HEIGHT;
}

/** The honesty stripe. Drawn last on every screen, over everything, every frame. */
export function band(ctx: Ctx, w: number, h: number) {
  ctx.globalAlpha = 1;
  ctx.fillStyle = room.warm.amber;
  ctx.fillRect(0, h - BAND_HEIGHT, w, BAND_HEIGHT);
  ctx.fillStyle = room.warm.amberDeep;
  ctx.fillRect(0, h - BAND_HEIGHT, w, RULE);
  ctx.fillStyle = '#1a1206';
  // Spacing is set before fitting, so the measure includes it and the
  // four words never run under the bezel.
  spaced(ctx, '0.06em');
  fitFont(ctx, display, 64, 'ILLUSTRATIVE · NOT REAL STATE', w - 96);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ILLUSTRATIVE · NOT REAL STATE', w / 2 + 4, h - BAND_HEIGHT / 2 + RULE / 2 + 2);
  spaced(ctx, '0em');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

/** The imperfection: a scanline sweeping down every few seconds, and the flicker. */
export function finish(ctx: Ctx, w: number, h: number, t: number) {
  const floor = h - BAND_HEIGHT;
  const y = ((t * 0.28) % 1) * floor;
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = TEXT;
  ctx.fillRect(0, y - 4, w, 8);
  ctx.globalAlpha = 0.06;
  ctx.fillRect(0, y - 24, w, 48);
  const f = flicker(t);
  if (f < 1) {
    ctx.globalAlpha = 1 - f;
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, w, floor);
  }
  ctx.globalAlpha = 1;
}

/** Everything above the band dimmed: a screen that is quiet, not off. */
export function quieten(ctx: Ctx, w: number, h: number, amount: number) {
  ctx.globalAlpha = clamp01(amount);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h - BAND_HEIGHT);
  ctx.globalAlpha = 1;
}

/**
 * The big word: fitted to the width, in its colour. `arrive` in 0..1
 * lands it with weight — from a little larger and fainter to its place —
 * and 1 is at rest.
 */
export function bigWord(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  colour: string,
  arrive = 1,
  px = 200,
) {
  spaced(ctx, '0.02em');
  const size = fitFont(ctx, display, px, text, maxWidth);
  const k = landing(arrive, 0.12);
  const scale = arrive >= 1 ? 1 : 1.35 - 0.35 * k;
  ctx.save();
  ctx.globalAlpha *= arrive >= 1 ? 1 : easeOut(arrive);
  ctx.translate(x, y + (px - size) / 2 + size * 0.55);
  ctx.scale(scale, scale);
  ctx.fillStyle = colour;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);
  ctx.restore();
  spaced(ctx, '0em');
  ctx.textBaseline = 'top';
  return size;
}

/** A line of data-shaped text in the mono face, at most `px`, fitted to `maxWidth`. */
export function dataLine(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  colour: string,
  px = 46,
) {
  fitFont(ctx, mono, px, text, maxWidth);
  ctx.fillStyle = colour;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(text, x, y);
}

/** A heavy ring, filled when lit. */
export function ring(ctx: Ctx, x: number, y: number, r: number, colour: string, lit: boolean) {
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = RULE;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (lit) ctx.fill();
  else {
    ctx.globalAlpha = 0.45;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/** A tick in a `size` box at (x, y), drawn `progress` of the way. */
export function tick(ctx: Ctx, x: number, y: number, colour: string, size = 56, progress = 1) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = size * 0.22;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const a: [number, number] = [x, y + size * 0.52];
  const b: [number, number] = [x + size * 0.36, y + size * 0.86];
  const c: [number, number] = [x + size, y + size * 0.14];
  strokeAlong(ctx, [a, b, c], progress);
}

/** A cross in a `size` box, drawn `progress` of the way: one stroke, then the other. */
export function cross(ctx: Ctx, x: number, y: number, colour: string, size = 56, progress = 1) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = size * 0.22;
  ctx.lineCap = 'round';
  const p = clamp01(progress);
  strokeAlong(
    ctx,
    [
      [x + size * 0.1, y + size * 0.1],
      [x + size * 0.9, y + size * 0.9],
    ],
    clamp01(p * 2),
  );
  strokeAlong(
    ctx,
    [
      [x + size * 0.9, y + size * 0.1],
      [x + size * 0.1, y + size * 0.9],
    ],
    clamp01(p * 2 - 1),
  );
}

/** Strokes a polyline `progress` of its length. */
export function strokeAlong(ctx: Ctx, points: [number, number][], progress: number) {
  const p = clamp01(progress);
  if (p <= 0 || points.length < 2) return;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const [ax, ay] = points[i - 1] as [number, number];
    const [bx, by] = points[i] as [number, number];
    total += Math.hypot(bx - ax, by - ay);
  }
  let remaining = total * p;
  ctx.beginPath();
  ctx.moveTo(...(points[0] as [number, number]));
  for (let i = 1; i < points.length && remaining > 0; i += 1) {
    const [ax, ay] = points[i - 1] as [number, number];
    const [bx, by] = points[i] as [number, number];
    const len = Math.hypot(bx - ax, by - ay);
    if (len <= remaining) {
      ctx.lineTo(bx, by);
      remaining -= len;
    } else {
      const k = remaining / len;
      ctx.lineTo(ax + (bx - ax) * k, ay + (by - ay) * k);
      remaining = 0;
    }
  }
  ctx.stroke();
}

/** A row of chunky blocks, `lit` of `n` filled; `partial` (0..1) is how far the next is lit. */
export function blocks(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  n: number,
  lit: number,
  colour: string,
  partial = 0,
) {
  const gap = 12;
  const bw = (w - (n - 1) * gap) / n;
  for (let k = 0; k < n; k += 1) {
    ctx.fillStyle = k < lit ? colour : FAINT;
    roundRect(ctx, x + k * (bw + gap), y, bw, h, 8);
    ctx.fill();
    if (k === lit && partial > 0) {
      ctx.fillStyle = colour;
      ctx.globalAlpha = 0.5 + 0.5 * partial;
      roundRect(ctx, x + k * (bw + gap), y, bw * partial, h, 8);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

/** An open bracket frame round a box: two heavy corner pairs. */
export function brackets(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  colour: string,
  progress = 1,
) {
  const m = Math.min(w, h) * 0.22 * clamp01(progress);
  ctx.strokeStyle = colour;
  ctx.lineWidth = RULE;
  ctx.lineCap = 'butt';
  for (const [sx, sy] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const) {
    const cx = sx > 0 ? x : x + w;
    const cy = sy > 0 ? y : y + h;
    ctx.beginPath();
    ctx.moveTo(cx, cy + sy * m);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + sx * m, cy);
    ctx.stroke();
  }
}

/**
 * A counter: a label and a number that rolls — the last digit slides
 * up as it changes, the way a mechanical counter turns. Right-aligned
 * to `x + w`.
 */
export function counter(
  ctx: Ctx,
  label: string,
  value: number,
  slide: number,
  x: number,
  y: number,
  w: number,
  colour: string,
  px = 52,
) {
  ctx.font = mono(px);
  ctx.textBaseline = 'top';
  const digits = String(value);
  const numberWidth = ctx.measureText(digits.length < 2 ? '00' : digits).width;
  ctx.textAlign = 'left';
  ctx.fillStyle = DIM;
  ctx.font = mono(px * 0.5);
  ctx.fillText(label, x, y + px * 0.3);
  ctx.font = mono(px);
  ctx.fillStyle = colour;
  const nx = x + w - numberWidth;
  if (slide <= 0.001 || slide >= 0.999) {
    ctx.fillText(digits, nx, y);
    return;
  }
  // The rolling digit: the current value sliding up out of view, the next one in.
  const next = String(value + 1);
  ctx.save();
  ctx.beginPath();
  ctx.rect(nx - 4, y - 4, numberWidth + 60, px + 8);
  ctx.clip();
  const shift = easeOut(slide) * px;
  ctx.globalAlpha = 1 - slide * 0.6;
  ctx.fillText(digits, nx, y - shift);
  ctx.globalAlpha = 0.4 + slide * 0.6;
  ctx.fillText(next, nx, y + px - shift);
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** A glowing point: a soft disc with a hot core. */
export function glowDot(ctx: Ctx, x: number, y: number, r: number, colour: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.shadowColor = colour;
  ctx.shadowBlur = r * 2.2;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
