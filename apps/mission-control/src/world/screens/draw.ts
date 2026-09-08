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

/** The band's four words. Never abbreviated, never dropped, never dimmed. */
export const BAND_WORDS = 'ILLUSTRATIVE · NOT REAL STATE';

/**
 * **The band on two lines, for a small screen** (V9, item 3.2).
 *
 * The defect, which V8.1 named and left as "an owner decision about type
 * size" and V8.2 and V8.3 left again: at the wide view on a phone the
 * slabs' honesty bands are unreadable. Measured rather than guessed —
 * each slab is about 110 screen pixels wide there, and the band's
 * twenty-nine characters on one line get **3.8 pixels each**, which no
 * size or weight can rescue. The banner above the canvas still says it in
 * words, so the truth is not lost, but the band is not doing its job.
 *
 * What is done about it is a **layout** change and not a content one:
 * on the coarse tiers the four words are set on **two lines**, at the two
 * words the sentence already divides into, which takes the per-character
 * width to **7.9 pixels — 2.1× — inside the same band height.** Nothing
 * is abbreviated, nothing is dropped, nothing is dimmed, and the rule
 * above still holds exactly as written.
 *
 * It is a module setting rather than a parameter because every screen and
 * every slab in the set shares one answer to it, and it is read once from
 * the tier at mount (`room/VirgilRoom.tsx`).
 */
let bandOnTwoLines = false;
export function setBandOnTwoLines(value: boolean): void {
  bandOnTwoLines = value;
}
export function bandIsOnTwoLines(): boolean {
  return bandOnTwoLines;
}
/** The two lines the band divides into. Their words are the band's words. */
export const BAND_LINES = BAND_WORDS.split(' · ');

/**
 * **The band for the replay, and why it had to change.**
 *
 * Every viewing point from V0 to V9 showed invented content and marked it
 * `ILLUSTRATIVE · NOT REAL STATE`. The replay shows a run that actually
 * happened, read out of the repository's own committed record. That band
 * would now understate the truth as badly as dropping it would overstate
 * it: a reader told the Keeper's `BLOCKED` on `956be26` is illustrative
 * would disbelieve a true thing.
 *
 * So the band says what the thing actually is, and names the run and its
 * candidate: a recorded run, replayed, and **not live state**. It is past
 * fact about a merged lineage, not this repository's condition now, and
 * "NOT LIVE STATE" is the load-bearing half of it.
 *
 * Three lines rather than one because it has three things to say and the
 * band's height is fixed. **Nothing is abbreviated, dropped or dimmed**,
 * which is the same rule the two-line phone layout keeps; the cost is
 * recorded honestly in the run record — a coarse-tier slab gives each
 * character about 4.4 pixels here against the demonstration band's 7.9,
 * and the badge above the canvas carries the whole sentence in words.
 */
export const REPLAY_BAND_LINES = [
  'PHASE 0 CONSOLIDATION',
  'RECORDED RUN · REPLAYED',
  'NOT LIVE STATE · 3B9A964E',
];
export const REPLAY_BAND_WORDS = REPLAY_BAND_LINES.join(' · ');

/**
 * Which band is drawn. Set once per render from the mode, before any
 * canvas is drawn, exactly as `setBandOnTwoLines` is set from the tier.
 * The two modes make opposite claims about their own truthfulness, so the
 * one thing that may never be ambiguous is which of them is on.
 */
let bandReplay = false;
export function setBandReplay(value: boolean): void {
  bandReplay = value;
}
export function bandIsReplay(): boolean {
  return bandReplay;
}

/** The lines the band is drawing right now, in the order it draws them. */
export function bandLines(): string[] {
  if (bandReplay) return [...REPLAY_BAND_LINES];
  return bandOnTwoLines ? [...BAND_LINES] : [BAND_WORDS];
}

/**
 * How far in from a straight edge the rounded corner has eaten, at
 * `depth` pixels along that edge from the corner. Zero past the corner's
 * own radius. V8.2: a console's picture is drawn to the model's own
 * rounded opening (`screens/screenOutline.ts`), so anything that used to
 * sit a fixed 22 or 64 pixels from a square corner has to know where the
 * curve is instead.
 */
export function cornerInset(corner: number, depth: number): number {
  if (!(corner > 0) || depth >= corner) return 0;
  return corner - Math.sqrt(Math.max(0, corner * corner - (corner - depth) ** 2));
}

/**
 * The smallest margin at which an axis-aligned rectangle inset by it on
 * every side lies inside a rounded rectangle of radius `corner`: the
 * corner's own sagitta, `r · (1 − 1/√2)`.
 */
export function cornerMargin(corner: number, base: number): number {
  return Math.max(base, Math.ceil(corner * (1 - Math.SQRT1_2)));
}

/**
 * The frame every panel shares: flat near-black, a thick inset rule and
 * corner brackets in the tint, the title — one word, big — and the stripe
 * along the foot that keeps it honest: solid amber, four heavy dark words,
 * every panel, every frame. Returns the height left above the stripe.
 * `lift` brightens the rule for a verdict's moment. `corner` is the
 * picture's own corner radius in canvas pixels, which the rule, the
 * brackets and the band are all laid out inside.
 */
export function frame(
  ctx: Ctx,
  w: number,
  h: number,
  title: string,
  tint: string,
  lift = 0,
  corner = 0,
) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  // A thick inset rule and heavy corner brackets. Never a hairline. The
  // margin is 22 px on a square screen and the corner's sagitta on a
  // rounded one, so the rule never crosses the curve.
  const margin = cornerMargin(corner, 22);
  ctx.strokeStyle = tint;
  ctx.globalAlpha = 0.35 + 0.55 * clamp01(lift);
  ctx.lineWidth = RULE;
  ctx.strokeRect(margin, margin, w - 2 * margin, h - BAND_HEIGHT - 2 * margin);
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
    const x = sx > 0 ? margin : w - margin;
    const y = sy > 0 ? margin : h - BAND_HEIGHT - margin;
    ctx.beginPath();
    ctx.moveTo(x, y + sy * m);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * m, y);
    ctx.stroke();
  }
  // Title: one word, clear of the top-left curve.
  ctx.fillStyle = tint;
  ctx.font = display(72);
  spaced(ctx, '0.08em');
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(title, Math.max(64, margin + 42), 54 + cornerInset(corner, 54 + 72));
  spaced(ctx, '0em');
  expandCue(ctx, w, margin, tint, corner);
  band(ctx, w, h, corner);
  return h - BAND_HEIGHT;
}

/**
 * The affordance, drawn on every screen: **a phone has no hover.**
 *
 * The owner's rule (`docs/process/PHASE_1_CONVERSATION_INTERFACE.md`
 * §5b): *"a persistent cue on each screen — a corner bracket or expand
 * glyph — rather than a highlight that only a mouse can find."* So it is
 * baked into the picture, in the tint, at the top right inside the
 * screen's own bracket: two chevrons pointing out of the corner. It says
 * the surface opens; it says nothing about state, and it never moves, so
 * it cannot be read as a beat.
 */
export function expandCue(ctx: Ctx, w: number, margin: number, tint: string, corner: number) {
  const x = w - margin - 40 - Math.ceil(cornerInset(corner, 44));
  const y = margin + 40;
  ctx.save();
  ctx.strokeStyle = tint;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = RULE - 2;
  ctx.lineCap = 'butt';
  for (const k of [0, 1]) {
    const o = k * 22;
    ctx.beginPath();
    ctx.moveTo(x - 18 + o, y + 18 - o);
    ctx.lineTo(x + o, y + 18 - o);
    ctx.lineTo(x + o, y - o);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/**
 * The honesty stripe. Drawn last on every screen, over everything, every
 * frame.
 *
 * V8.2: the picture now goes to the physical edge of the model's own
 * opening, whose corners are round, and the band sits along its foot —
 * which is exactly where the two bottom curves are. It was the reason the
 * picture was inset in the first place (V8, `1cb9bec`), so the answer here
 * is to **lay it out inside the rounded area**: the stripe is clipped to
 * the outline so its ends follow the curve, and the four words are fitted
 * to the width the curve leaves at the lowest point the glyphs reach. The
 * one thing never done is shrinking the picture, dropping the words or
 * dimming them.
 */
export function band(ctx: Ctx, w: number, h: number, corner = 0) {
  ctx.globalAlpha = 1;
  ctx.save();
  if (corner > 0) {
    roundRect(ctx, 0, 0, w, h, corner);
    ctx.clip();
  }
  ctx.fillStyle = room.warm.amber;
  ctx.fillRect(0, h - BAND_HEIGHT, w, BAND_HEIGHT);
  ctx.fillStyle = room.warm.amberDeep;
  ctx.fillRect(0, h - BAND_HEIGHT, w, RULE);
  ctx.restore();
  ctx.fillStyle = '#1a1206';
  // Spacing is set before fitting, so the measure includes it and the
  // four words never run under the bezel or into the corner's curve.
  spaced(ctx, '0.06em');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const middle = h - BAND_HEIGHT / 2 + RULE / 2 + 2;
  const lines = bandLines();
  if (lines.length > 1) {
    // Several lines in the same band: each is fitted on its own, so the
    // shorter one is not held down to the longest one's size.
    const width = bandTextWidth(w, corner);
    const pitch = (BAND_HEIGHT - RULE) / (lines.length + 0.38);
    const cap = Math.floor(pitch * 0.95);
    lines.forEach((line, i) => {
      fitFont(ctx, display, cap, line, width);
      ctx.fillText(line, w / 2 + 4, middle + (i - (lines.length - 1) / 2) * pitch);
    });
  } else {
    const only = lines[0] as string;
    fitFont(ctx, display, 64, only, bandTextWidth(w, corner));
    ctx.fillText(only, w / 2 + 4, middle);
  }
  spaced(ctx, '0em');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

/** Where the band's glyph box sits, measured up from the foot of the picture. */
export const BAND_TEXT_BOTTOM = BAND_HEIGHT / 2 - RULE / 2 - 2 - 0.38 * 64;

/**
 * The width the band's words are fitted to: the full width less 48 px a
 * side on a square screen, and less whatever the bottom corners take at
 * the lowest point the glyphs reach on a rounded one.
 */
export function bandTextWidth(w: number, corner: number): number {
  return w - 2 * (48 + Math.ceil(cornerInset(corner, BAND_TEXT_BOTTOM)));
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
