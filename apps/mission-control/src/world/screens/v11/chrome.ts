import { DISPLAY, MONO } from '../fonts.js';
import {
  ARRIVE_SECONDS,
  CORE,
  clamp01,
  dim,
  easeOut,
  GLASS,
  type Metrics,
  STATUS,
  STRUCTURE,
  type StatusKey,
  SWEEP_SECONDS,
  TEXT,
} from './system.js';

/**
 * **The shared chrome: the glass, the frame, the rails and the band.**
 *
 * Everything on all four displays that is not the agent's own picture is
 * drawn here, so the four screens are unmistakably one instrument family.
 * The order the functions are called in is itself part of the design and is
 * fixed by `drawShell` — the field, then the layered structure, then the
 * agent's picture into the well, then the reflections **over** the picture,
 * which is what makes the glass read as a surface in front of the content
 * rather than a colour behind it.
 */

export type Ctx = CanvasRenderingContext2D;

export const display = (px: number) => `700 ${Math.round(px)}px ${DISPLAY}`;
export const mono = (px: number) => `700 ${Math.round(px)}px ${MONO}`;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
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

/** Letter spacing, where the engine honours it. */
export function spaced(ctx: Ctx, em: string) {
  (ctx as Ctx & { letterSpacing?: string }).letterSpacing = em;
}

/**
 * The largest size at or below `px` whose `text` fits `maxWidth`, in one
 * pass rather than V10's descending loop: the ratio is measured once and
 * applied, which is exact for canvas text and does not depend on a step.
 */
export function fit(
  ctx: Ctx,
  kind: (px: number) => string,
  px: number,
  text: string,
  maxWidth: number,
  min = 0,
): number {
  ctx.font = kind(px);
  const measured = ctx.measureText(text).width;
  if (measured <= maxWidth || measured === 0) return px;
  const size = Math.max(min, Math.floor((px * maxWidth) / measured));
  ctx.font = kind(size);
  return size;
}

/** A rule of the system's own minimum weight. */
export function hairline(
  ctx: Ctx,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  colour: string,
  weight: number,
  alpha = 1,
) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = weight;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

/**
 * A lit point: a wide soft halo in the colour, a narrow one, and a small
 * white-hot core. The halo is under the bloom threshold and the core is
 * over it, so the bloom pass picks up a point and not a smear.
 */
export function litDot(ctx: Ctx, x: number, y: number, r: number, colour: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= clamp01(alpha);
  const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
  halo.addColorStop(0, colour);
  halo.addColorStop(0.35, `${colour}55`);
  halo.addColorStop(1, `${colour}00`);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, r * 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CORE;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * **The field: deep sapphire-black glass with internal depth.**
 *
 * Three layers, none of them a flat rectangle: a vertical gradient from
 * the lift at the top edge to the abyss at the foot, because a sheet of
 * glass in a lit room is brighter where it faces the light; a wide radial
 * warm-cool bloom offset toward the top-left, which is where this set's key
 * light is (`LightingRig.tsx`); and a very faint sapphire wash keyed to the
 * screen's dominant status, at most 9 % — enough that the display reads as
 * *cyan working* or *amber waiting* from the overview, where no text can
 * resolve at all, and far too faint to be the *"bright colour filling
 * entire screens"* the brief forbids.
 */
export function glassField(ctx: Ctx, m: Metrics, status: StatusKey, wash = 0.085) {
  const { w, h } = m;
  const vertical = ctx.createLinearGradient(0, 0, 0, h);
  vertical.addColorStop(0, GLASS.lift);
  vertical.addColorStop(0.42, GLASS.deep);
  vertical.addColorStop(1, GLASS.abyss);
  ctx.fillStyle = vertical;
  ctx.fillRect(0, 0, w, h);
  const bloom = ctx.createRadialGradient(w * 0.26, -h * 0.18, 0, w * 0.26, -h * 0.18, h * 1.5);
  bloom.addColorStop(0, `${GLASS.sapphire}66`);
  bloom.addColorStop(0.55, `${GLASS.sapphire}1e`);
  bloom.addColorStop(1, `${GLASS.sapphire}00`);
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = wash;
  ctx.fillStyle = STATUS[status];
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/**
 * The faint measured grid inside the glass: two pitches, the coarse one at
 * six units and the fine one at two, both at an alpha that reads as
 * *engineering* up close and as texture at distance. This is the first of
 * the layers the brief asks for — *"layered graphics with depth"* — and it
 * is drawn behind everything so nothing sits on top of the surface.
 */
export function graticule(ctx: Ctx, m: Metrics, r: Rect) {
  const { u, hair } = m;
  ctx.save();
  roundRect(ctx, r.x, r.y, r.w, r.h, 1.4 * u);
  ctx.clip();
  ctx.lineWidth = hair;
  for (const [pitch, alpha] of [
    [2 * u, 0.035],
    [6 * u, 0.075],
  ] as [number, number][]) {
    ctx.strokeStyle = dim(alpha);
    ctx.beginPath();
    for (let x = r.x + pitch; x < r.x + r.w; x += pitch) {
      ctx.moveTo(Math.round(x) + 0.5, r.y);
      ctx.lineTo(Math.round(x) + 0.5, r.y + r.h);
    }
    for (let y = r.y + pitch; y < r.y + r.h; y += pitch) {
      ctx.moveTo(r.x, Math.round(y) + 0.5);
      ctx.lineTo(r.x + r.w, Math.round(y) + 0.5);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * **The restrained illuminated edge.** Two concentric strokes just inside
 * the drawn outline: an ivory one, which is the light catching the bezel's
 * inner chamfer, and a gold one inside it. Both are the system's rule
 * weight and both are below the bloom threshold, so the edge is a detail
 * and not a neon border — the brief forbids *"thick neon borders"* by name.
 * A single soft accent glow rides the top edge only, where the room's key
 * light is, and it breathes on a twenty-second period.
 */
export function edgeLight(ctx: Ctx, m: Metrics, accent: string, t: number) {
  const { w, h, u, rule, corner } = m;
  const inner = 1.15 * u;
  ctx.save();
  roundRect(ctx, inner, inner, w - 2 * inner, h - 2 * inner, Math.max(0, corner - inner));
  ctx.strokeStyle = dim(0.3);
  ctx.lineWidth = rule;
  ctx.stroke();
  const gold = inner + 1.5 * rule;
  roundRect(ctx, gold, gold, w - 2 * gold, h - 2 * gold, Math.max(0, corner - gold));
  ctx.strokeStyle = STRUCTURE.gold;
  ctx.globalAlpha = 0.34;
  ctx.lineWidth = m.hair;
  ctx.stroke();
  ctx.restore();
  // The accent along the top edge, breathing.
  const breath = 0.5 + 0.5 * Math.sin((t / 20) * Math.PI * 2);
  const glow = ctx.createLinearGradient(0, inner, 0, inner + 7 * u);
  glow.addColorStop(
    0,
    `${accent}${Math.round(38 + 26 * breath)
      .toString(16)
      .padStart(2, '0')}`,
  );
  glow.addColorStop(1, `${accent}00`);
  ctx.save();
  roundRect(ctx, inner, inner, w - 2 * inner, h - 2 * inner, Math.max(0, corner - inner));
  ctx.clip();
  ctx.fillStyle = glow;
  ctx.fillRect(0, inner, w, 7 * u);
  ctx.restore();
}

/**
 * **Fine mechanical joins.** Four gold seam marks at the middles of the
 * edges and four corner brackets, each two units long: the marks a
 * precision instrument's faceplate has where its parts meet. They are the
 * smallest elements in the system and they are what makes the frame read
 * as assembled rather than drawn.
 */
export function joins(ctx: Ctx, m: Metrics) {
  const { w, h, u, hair } = m;
  const inset = 1.15 * u;
  ctx.save();
  ctx.strokeStyle = STRUCTURE.goldBright;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = hair;
  const arm = 1.6 * u;
  ctx.beginPath();
  // Seam ticks at the middle of each edge, pointing inward.
  ctx.moveTo(w / 2, inset);
  ctx.lineTo(w / 2, inset + arm);
  ctx.moveTo(w / 2, h - inset);
  ctx.lineTo(w / 2, h - inset - arm);
  ctx.moveTo(inset, h / 2);
  ctx.lineTo(inset + arm, h / 2);
  ctx.moveTo(w - inset, h / 2);
  ctx.lineTo(w - inset - arm, h / 2);
  ctx.stroke();
  ctx.restore();
}

/**
 * **The header rail**: the agent's mark, their name, and up to three data
 * chips at the right. This is the top of the hierarchy's second level —
 * identity and context, always in the same place on all four screens, so
 * the eye learns one instrument and reads four.
 */
export function headerRail(
  ctx: Ctx,
  m: Metrics,
  name: string,
  accent: string,
  chips: readonly string[],
  mark: (ctx: Ctx, x: number, y: number, r: number, colour: string) => void,
) {
  const { u, pad, header, w, hair } = m;
  const cy = pad + header / 2;
  const left = pad + 2.6 * u;
  mark(ctx, left, cy, 1.5 * u, accent);
  spaced(ctx, '0.13em');
  const size = fit(ctx, display, m.type.title, name.toUpperCase(), w * 0.42);
  ctx.fillStyle = TEXT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.toUpperCase(), left + 3.1 * u, cy + size * 0.02);
  spaced(ctx, '0em');
  // The chips, right-aligned, each in its own thin ivory box.
  let x = w - pad - 1.2 * u;
  ctx.textAlign = 'right';
  for (const chip of [...chips].reverse()) {
    ctx.font = mono(m.type.label);
    const tw = ctx.measureText(chip).width;
    const boxW = tw + 2.2 * u;
    const boxH = 3.1 * u;
    ctx.save();
    roundRect(ctx, x - boxW, cy - boxH / 2, boxW, boxH, 0.7 * u);
    ctx.fillStyle = dim(0.05);
    ctx.fill();
    ctx.strokeStyle = dim(0.22);
    ctx.lineWidth = hair;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = dim(0.72);
    ctx.fillText(chip, x - 1.1 * u, cy + m.type.label * 0.02);
    x -= boxW + 1.1 * u;
  }
  ctx.textAlign = 'left';
  // The gold rule under the rail, broken in the middle by a join.
  const ry = pad + header;
  const gap = 2.4 * u;
  hairline(ctx, pad, ry, w / 2 - gap, ry, STRUCTURE.gold, m.hair, 0.55);
  hairline(ctx, w / 2 + gap, ry, w - pad, ry, STRUCTURE.gold, m.hair, 0.55);
  hairline(ctx, w / 2 - gap * 0.5, ry, w / 2 + gap * 0.5, ry, STRUCTURE.goldBright, m.hair, 0.9);
}

/** Where the agent's own picture goes: the well, and the rect it may use. */
export function wellRect(m: Metrics): Rect {
  const { w, h, pad, header, band, foot, rail, u, heroWidth } = m;
  const top = pad + header + 1.6 * u;
  const bottom = h - band - foot - rail - 1.2 * u;
  const x = pad + heroWidth + 1.6 * u;
  return { x, y: top, w: w - pad - x, h: bottom - top };
}

/** Where the primary state goes. */
export function heroRect(m: Metrics): Rect {
  const { h, pad, header, band, foot, rail, u, heroWidth } = m;
  const top = pad + header + 1.6 * u;
  const bottom = h - band - foot - rail - 1.2 * u;
  return { x: pad + 1.4 * u, y: top, w: heroWidth, h: bottom - top };
}

/**
 * The well's own recess: a rounded rectangle a shade deeper than the
 * field with an inner shadow at its top edge and a light along its foot,
 * so the agent's picture sits *inside* the glass rather than on it. This
 * is the layer the brief's *"internal glass depth"* asks for.
 */
export function wellRecess(ctx: Ctx, m: Metrics, r: Rect) {
  const { u, hair } = m;
  ctx.save();
  roundRect(ctx, r.x, r.y, r.w, r.h, 1.4 * u);
  ctx.fillStyle = GLASS.abyss;
  ctx.globalAlpha = 0.55;
  ctx.fill();
  ctx.restore();
  graticule(ctx, m, r);
  ctx.save();
  roundRect(ctx, r.x, r.y, r.w, r.h, 1.4 * u);
  ctx.clip();
  const shade = ctx.createLinearGradient(0, r.y, 0, r.y + 3.4 * u);
  shade.addColorStop(0, 'rgba(0,0,0,0.5)');
  shade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shade;
  ctx.fillRect(r.x, r.y, r.w, 3.4 * u);
  ctx.restore();
  ctx.save();
  roundRect(ctx, r.x, r.y, r.w, r.h, 1.4 * u);
  ctx.strokeStyle = dim(0.16);
  ctx.lineWidth = hair;
  ctx.stroke();
  ctx.restore();
}

/**
 * **The primary state.** The top of the hierarchy: a status mark that reads
 * as shape and colour when the display is 25 CSS pixels tall, and the state
 * word under it, fitted to the hero column and never wrapped.
 *
 * The `arrive` in 0..1 lands the word from a little larger and fainter;
 * `lead` is the one-line conclusion under it, which is the *meaning* of the
 * state rather than its name.
 */
export function heroBlock(
  ctx: Ctx,
  m: Metrics,
  r: Rect,
  word: string,
  lead: string,
  colour: string,
  arrive: number,
  mark: (ctx: Ctx, cx: number, cy: number, radius: number, colour: string, k: number) => void,
) {
  const { u } = m;
  const k = easeOut(arrive);
  // The mark is the largest element on the screen and the only thing that
  // survives the overview, so it takes as much of the hero column as the
  // word and the conclusion can spare — measured in the study, not guessed.
  const radius = Math.min(r.w * 0.265, r.h * 0.2);
  const cx = r.x + radius + 0.6 * u;
  const cy = r.y + radius + 1.2 * u;
  mark(ctx, cx, cy, radius, colour, k);
  // The word, on one, two or three lines — whichever gives the largest
  // type inside the column's own width **and** the height the column has
  // left below the mark. Both bounds matter: a long term broken in two is
  // narrower per line but each line is half as tall.
  const top = cy + radius + 2.2 * u;
  spaced(ctx, '0.015em');
  const roomBelow = r.y + r.h - top;
  let parts = [word];
  let chosen = 0;
  for (let lines = 1; lines <= 3; lines += 1) {
    const attempt = splitHero(word, lines);
    if (lines > 1 && attempt.length !== lines) continue;
    const byWidth = Math.min(...attempt.map((part) => fit(ctx, display, m.type.hero, part, r.w)));
    const byHeight = roomBelow / (1.06 * attempt.length + 0.55);
    const candidate = Math.min(byWidth, byHeight);
    if (candidate > chosen) {
      chosen = candidate;
      parts = attempt;
    }
  }
  const size = Math.max(8, Math.floor(chosen));
  ctx.font = display(size);
  ctx.save();
  ctx.globalAlpha = k;
  ctx.translate(r.x, top + size * 0.5);
  const grow = 1 + 0.22 * (1 - k);
  ctx.scale(grow, grow);
  ctx.fillStyle = colour;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  parts.forEach((part, i) => {
    ctx.font = display(size);
    ctx.fillText(part, 0, i * size * 1.02);
  });
  ctx.restore();
  spaced(ctx, '0em');
  // The conclusion, on the mono face, dim. **How many lines it gets is
  // computed from the space left, not fixed at two**: the hero terms are
  // one or two lines long depending on the vocabulary, so a fixed
  // two-line conclusion ran into the secondary rail on exactly the states
  // whose terms are longest. It takes what is left, at most three lines,
  // and is set at a size that fits whatever that is.
  const leadTop = top + size * (0.56 + 1.02 * (parts.length - 1)) + size * 0.5 + 1.1 * u;
  const room = r.y + r.h - leadTop;
  const pitch = m.type.lead * 1.34;
  const allowed = Math.max(0, Math.min(3, Math.floor(room / pitch)));
  if (allowed > 0) {
    ctx.save();
    ctx.globalAlpha = k;
    ctx.fillStyle = dim(0.66);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    const lines = wrapMono(ctx, m.type.lead, lead, r.w, allowed);
    lines.forEach((line, i) => {
      ctx.font = mono(m.type.lead);
      ctx.fillText(line, r.x, leadTop + i * pitch);
    });
    ctx.restore();
  }
  return { markCentre: [cx, cy] as [number, number], radius, wordSize: size };
}

/**
 * **A hero term, broken over as many lines as it needs and no more.**
 *
 * The vocabulary is closed: `constitution/authority.json` names four
 * `reviewVerdicts` and fifteen `candidateStates`, and exactly one of the
 * nineteen — `PASS_WITH_NON_BLOCKING_FINDINGS`, 31 characters — is long
 * enough to need three lines in a console's hero column, which is 40 % of
 * a 1024-pixel canvas.
 *
 * It gets three, and the reason is worth stating because the alternative
 * was tried and rejected: the term had been abbreviated to `PASS WITH
 * FINDINGS`, which drops the one word the verdict exists to carry —
 * *non-blocking* — and shortening it to `PASS` names a **different one of
 * the four**. Neither is acceptable on a display whose whole job is to say
 * which verdict returned. So the term is set in full, at whatever size the
 * column allows, and the status mark beside it does the work at distance.
 *
 * The split is balanced rather than greedy — it minimises the longest
 * line — because the longest line is what bounds the type size.
 */
export function splitHero(word: string, maxLines = 3): string[] {
  const words = word.split(' ');
  if (words.length <= 1) return words;
  let best: string[] = [word];
  let bestLongest = word.length;
  for (let lines = 2; lines <= Math.min(maxLines, words.length); lines += 1) {
    const attempt = balance(words, lines);
    const longest = Math.max(...attempt.map((line) => line.length));
    if (longest < bestLongest) {
      best = attempt;
      bestLongest = longest;
    }
  }
  return best;
}

/**
 * Splits `words` into exactly `lines` runs, minimising the longest run's
 * character count. Exhaustive over the break points, which is trivial: no
 * term in either vocabulary has more than five words.
 */
export function balance(words: readonly string[], lines: number): string[] {
  const n = words.length;
  let best: string[] | null = null;
  let bestLongest = Number.POSITIVE_INFINITY;
  const cuts = (start: number, left: number, acc: number[]) => {
    if (left === 0) {
      const parts: string[] = [];
      let from = 0;
      for (const cut of [...acc, n]) {
        parts.push(words.slice(from, cut).join(' '));
        from = cut;
      }
      if (parts.some((part) => part.length === 0)) return;
      const longest = Math.max(...parts.map((part) => part.length));
      if (longest < bestLongest) {
        bestLongest = longest;
        best = parts;
      }
      return;
    }
    for (let cut = start + 1; cut <= n - left; cut += 1) cuts(cut, left - 1, [...acc, cut]);
  };
  cuts(0, lines - 1, []);
  return best ?? [words.join(' ')];
}

/**
 * **The hero as a band across the full width, for the displays that are
 * large enough on screen to carry readable text.**
 *
 * This is the one place the shared system has two layouts, and the reason
 * is measured rather than stylistic. At a 390 CSS-pixel portrait viewport
 * the three consoles' displays are 37–43 CSS pixels wide, which is below
 * the 64 pixels at which this project has already measured screen text to
 * collapse; **Virgil's three slabs are 74–75 pixels wide, which is above
 * it**. So a word set across a slab's full width — 90 % of 75 CSS pixels,
 * about ten pixels a character for a seven-letter term — genuinely reads
 * from the overview, and the same word set in a console's 40 % hero column
 * genuinely does not, at any size.
 *
 * The hierarchy that follows from that is the one the brief asks for and
 * it is a consequence of arithmetic: **the readable overview state lives on
 * Virgil's slabs**, which is also where the brief puts *"overall project
 * state, the current hand-off, owner decisions awaiting attention"*; the
 * three consoles carry their state as colour and as a mark from the
 * overview, and their words resolve when the camera goes to them.
 *
 * Returns the height the band used, so the caller can lay the picture out
 * under it.
 */
export function heroBand(
  ctx: Ctx,
  m: Metrics,
  r: Rect,
  word: string,
  lead: string,
  colour: string,
  arrive: number,
  mark: (ctx: Ctx, cx: number, cy: number, radius: number, colour: string, k: number) => void,
  maxFraction = 0.62,
): number {
  const { u, h } = m;
  const k = easeOut(arrive);
  const radius = Math.min(r.h * 0.34, h * 0.075);
  const cx = r.x + radius + 0.4 * u;
  const cy = r.y + radius + 0.4 * u;
  mark(ctx, cx, cy, radius, colour, k);
  const left = cx + radius + 1.8 * u;
  const width = r.x + r.w - left;
  // **The word is set as large as the band can hold it, and whether it
  // goes on one line or two is decided by which gives the larger type.**
  //
  // This is the arithmetic the first study frame got wrong. A long term
  // broken over two lines is *narrower* per line but each line is half as
  // tall, and on a 1.6-aspect slab the height is the binding constraint —
  // so `SAFE TO MERGE` broken in two came out at 60 canvas pixels where
  // the same term on one line comes out at 103. Both are tried and the
  // bigger wins; nothing is abbreviated either way.
  const budget = r.h * maxFraction;
  const leadPitch = m.type.lead * 1.3;
  const candidates: string[][] = [[word]];
  for (const lines of [2, 3]) {
    const split = splitHero(word, lines);
    if (split.length === lines) candidates.push(split);
  }
  let best = { parts: [word], size: 0 };
  for (const parts of candidates) {
    const byWidth = Math.min(...parts.map((part) => fit(ctx, display, h * 0.3, part, width)));
    const stack = 1.24 + 1.02 * (parts.length - 1);
    const byHeight = (budget - 0.4 * u - leadPitch) / stack;
    const size = Math.min(byWidth, byHeight);
    if (size > best.size) best = { parts, size };
  }
  const parts = best.parts;
  const size = Math.max(8, Math.floor(best.size));
  spaced(ctx, '0.015em');
  ctx.save();
  ctx.globalAlpha = k;
  ctx.translate(left, r.y + 0.4 * u + size * 0.62);
  const grow = 1 + 0.18 * (1 - k);
  ctx.scale(grow, grow);
  ctx.fillStyle = colour;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  parts.forEach((part, i) => {
    ctx.font = display(size);
    ctx.fillText(part, 0, i * size * 1.02);
  });
  ctx.restore();
  spaced(ctx, '0em');
  const wordBottom = r.y + 0.4 * u + size * (1.24 + 1.02 * (parts.length - 1));
  // The conclusion takes the lines the budget has left, at most two.
  const allowed = Math.max(0, Math.min(2, Math.floor((r.y + budget - wordBottom) / leadPitch)));
  const lines = allowed > 0 ? wrapMono(ctx, m.type.lead, lead, width, allowed) : [];
  ctx.save();
  ctx.globalAlpha = k;
  ctx.fillStyle = dim(0.66);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  lines.forEach((line, i) => {
    ctx.font = mono(m.type.lead);
    ctx.fillText(line, left, wordBottom + 0.3 * u + i * leadPitch);
  });
  ctx.restore();
  const used = Math.max(cy + radius, wordBottom + 0.3 * u + lines.length * leadPitch);
  return used - r.y + 1.2 * u;
}

/**
 * A soft dark scrim, so text laid **over** a picture keeps its contrast
 * without a box being drawn round it. Used where the slab's own motif runs
 * the full width of the body and the hero sits on top of it.
 */
export function scrim(ctx: Ctx, r: Rect, strength = 0.66) {
  const g = ctx.createRadialGradient(
    r.x + r.w * 0.22,
    r.y + r.h * 0.42,
    0,
    r.x + r.w * 0.22,
    r.y + r.h * 0.42,
    Math.max(r.w, r.h) * 0.72,
  );
  g.addColorStop(0, `rgba(3,5,12,${strength})`);
  g.addColorStop(0.55, `rgba(3,5,12,${strength * 0.55})`);
  g.addColorStop(1, 'rgba(3,5,12,0)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

/** The body of a display: everything between the header rule and the rail. */
export function bodyRect(m: Metrics): Rect {
  const { w, h, pad, header, band, foot, rail, u } = m;
  const top = pad + header + 1.6 * u;
  return {
    x: pad + 1.4 * u,
    y: top,
    w: w - 2 * pad - 2.8 * u,
    h: h - band - foot - rail - 1.2 * u - top,
  };
}

/** Greedy word wrap on the mono face, at most `max` lines, the last elided. */
export function wrapMono(ctx: Ctx, px: number, text: string, width: number, max: number): string[] {
  ctx.font = mono(px);
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  let truncated = false;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width || !line) {
      line = next;
      continue;
    }
    if (lines.length + 1 === max) {
      truncated = true;
      break;
    }
    lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  // **A sentence that had to stop says so.** A conclusion cut at a word
  // boundary reads as a whole sentence and is therefore a small untruth
  // about what the screen is telling you; an ellipsis is one character
  // and removes the ambiguity.
  if (truncated && lines.length > 0) {
    const last = lines.length - 1;
    let text = `${lines[last]} …`;
    while (ctx.measureText(text).width > width && text.length > 2) {
      text = `${text.slice(0, -3).trimEnd()} …`;
    }
    lines[last] = text;
  }
  return lines.slice(0, max);
}

/**
 * **The secondary detail rail.** Four columns of technical fact under the
 * well, each a small dim label over a brighter value. It is the third level
 * of the hierarchy and it is *meant* to be unreadable from the overview:
 * the owner's instruction is *"do not remove complexity merely because all
 * microtext cannot be read from the overview"*, so this rail carries real
 * counts, real identifiers and real check names, and it resolves when the
 * camera goes to the console.
 */
export function microRail(
  ctx: Ctx,
  m: Metrics,
  columns: readonly { label: string; value: string; colour?: string | undefined }[],
) {
  const { w, h, u, pad, band, foot, rail, hair, corner } = m;
  const top = h - band - foot - rail;
  // Where the band is gone the rail sits inside the rounded corner's own
  // curve, so its ends come in by however much that curve has eaten at the
  // height the rail's text reaches.
  const bite = band > 0 ? 0 : Math.ceil(cornerInset(corner, foot + rail * 0.3));
  hairline(ctx, pad + bite, top, w - pad - bite, top, TEXT, hair, 0.12);
  const usable = w - 2 * (pad + bite) - 2.8 * u;
  const each = usable / Math.max(1, columns.length);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  columns.forEach((column, i) => {
    const x = pad + bite + 1.4 * u + i * each;
    if (i > 0)
      hairline(ctx, x - 1.2 * u, top + 1.1 * u, x - 1.2 * u, top + rail - 1.4 * u, TEXT, hair, 0.1);
    spaced(ctx, '0.14em');
    ctx.font = mono(m.type.micro);
    ctx.fillStyle = dim(0.4);
    ctx.fillText(column.label.toUpperCase(), x, top + 1.3 * u);
    spaced(ctx, '0em');
    ctx.fillStyle = column.colour ?? dim(0.82);
    fit(ctx, mono, m.type.data, column.value, each - 1.6 * u);
    ctx.fillText(column.value, x, top + 1.3 * u + m.type.micro * 1.5);
  });
}

/**
 * **The honesty band.** V10's proportion, V10's words, V10's ink-on-amber
 * contrast, restyled: a gold hairline over the amber field, the words
 * letterspaced and fitted to the width the rounded corners leave, and on
 * two lines where a coarse display needs them. Nothing is abbreviated,
 * dropped, dimmed or shrunk.
 */
export function honestyBand(ctx: Ctx, m: Metrics, lines: readonly string[]) {
  const { w, h, band, u, corner, hair } = m;
  ctx.save();
  if (corner > 0) {
    roundRect(ctx, 0, 0, w, h, corner);
    ctx.clip();
  }
  const top = h - band;
  const field = ctx.createLinearGradient(0, top, 0, h);
  field.addColorStop(0, STATUS.amber);
  field.addColorStop(1, '#f5a049');
  ctx.fillStyle = field;
  ctx.fillRect(0, top, w, band);
  ctx.fillStyle = STRUCTURE.goldBright;
  ctx.fillRect(0, top, w, hair * 2);
  ctx.restore();
  ctx.fillStyle = '#1a1206';
  spaced(ctx, '0.08em');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const inset = corner > 0 ? cornerInset(corner, band * 0.45) : 0;
  const width = w - 2 * (2.4 * u + inset);
  const middle = top + band / 2 + hair;
  if (lines.length > 1) {
    const pitch = (band - hair * 2) / (lines.length + 0.42);
    lines.forEach((line, i) => {
      fit(ctx, display, Math.floor(pitch * 0.94), line, width);
      ctx.fillText(line, w / 2, middle + (i - (lines.length - 1) / 2) * pitch);
    });
  } else {
    const only = lines[0] as string;
    fit(ctx, display, band * 0.5, only, width);
    ctx.fillText(only, w / 2, middle);
  }
  spaced(ctx, '0em');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

/** How far a rounded corner eats into the width at a height above the foot. */
export function cornerInset(corner: number, depth: number): number {
  if (depth >= corner) return 0;
  return corner - Math.sqrt(Math.max(0, corner * corner - (corner - depth) ** 2));
}

/**
 * **The reflections, drawn last and over everything.** Two of them: a wide
 * diagonal sheen that travels the width once every ninety seconds, which is
 * the room moving past a curved sheet of glass, and a fixed soft highlight
 * in the upper left, which is this set's key light. Both are drawn at an
 * alpha that never lifts the field above the bloom threshold, so the glass
 * catches light without the text bleeding.
 */
export function reflections(ctx: Ctx, m: Metrics, t: number) {
  const { w, h, corner } = m;
  ctx.save();
  if (corner > 0) {
    roundRect(ctx, 0, 0, w, h, corner);
    ctx.clip();
  }
  // The travelling sheen.
  const phase = ((t / 90) % 1) * 2.4 - 0.7;
  const cx = phase * w;
  const sheen = ctx.createLinearGradient(cx - w * 0.24, 0, cx + w * 0.24, h);
  sheen.addColorStop(0, 'rgba(205,218,240,0)');
  sheen.addColorStop(0.5, 'rgba(205,218,240,0.055)');
  sheen.addColorStop(1, 'rgba(205,218,240,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);
  // The key light's highlight, fixed.
  const key = ctx.createRadialGradient(w * 0.2, h * 0.1, 0, w * 0.2, h * 0.1, h * 0.85);
  key.addColorStop(0, 'rgba(230,240,255,0.075)');
  key.addColorStop(0.6, 'rgba(230,240,255,0.018)');
  key.addColorStop(1, 'rgba(230,240,255,0)');
  ctx.fillStyle = key;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/**
 * The one sweep a state change is allowed: a fine bright line crossing the
 * whole picture once, over `SWEEP_SECONDS`, with a soft leading edge. It is
 * the answer to *"subtle screen-state transitions instead of harsh instant
 * replacements"* and it is the only flash in the system.
 */
export function sweep(ctx: Ctx, m: Metrics, since: number, accent: string) {
  if (since < 0 || since > SWEEP_SECONDS) return;
  const k = since / SWEEP_SECONDS;
  const { w, h, corner, u } = m;
  const y = easeOut(k) * h;
  ctx.save();
  if (corner > 0) {
    roundRect(ctx, 0, 0, w, h, corner);
    ctx.clip();
  }
  const fade = Math.sin(Math.PI * k);
  const grad = ctx.createLinearGradient(0, y - 6 * u, 0, y + 0.6 * u);
  grad.addColorStop(0, `${accent}00`);
  grad.addColorStop(
    1,
    `${accent}${Math.round(64 * fade)
      .toString(16)
      .padStart(2, '0')}`,
  );
  ctx.fillStyle = grad;
  ctx.fillRect(0, y - 6 * u, w, 6.6 * u);
  ctx.globalAlpha = 0.85 * fade;
  ctx.fillStyle = CORE;
  ctx.fillRect(0, y - m.hair, w, m.hair * 2);
  ctx.restore();
}

/** Everything above the band held quiet: a screen that is not off, but waiting. */
export function quieten(ctx: Ctx, m: Metrics, amount: number) {
  if (amount <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp01(amount) * 0.72;
  ctx.fillStyle = GLASS.abyss;
  ctx.fillRect(0, 0, m.w, m.h - m.band);
  ctx.restore();
}

export { ARRIVE_SECONDS };
