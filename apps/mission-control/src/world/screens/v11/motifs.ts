import type { Outcome } from '../../room/demo.js';
import type { Check, Finding } from '../tally.js';
import { type Ctx, fit, hairline, litDot, mono, type Rect, roundRect, spaced } from './chrome.js';
import { strokePath } from './marks.js';
import {
  CORE,
  clamp01,
  dim,
  easeOut,
  GLASS,
  type Metrics,
  STATUS,
  STRUCTURE,
  TEXT,
} from './system.js';

/**
 * **The four agents' own pictures: what each display is actually showing.**
 *
 * The brief asks each display to carry *"a meaningful animated
 * visualisation of current activity"* and gives each agent a distinct
 * personality inside one shared system. These are those four pictures.
 * They all draw into the same well (`chrome.ts`'s `wellRect`), all use the
 * same units, the same hairline weight and the same two type faces, and
 * none of them chooses a status colour — that comes from `content.ts`.
 *
 * Every one is a **pure function of `t`, `since` and the work data**, so a
 * frame at a given demonstration second is the same frame every time and
 * the captures are reproducible.
 */

/** A deterministic value in 0..1 from an integer: the constellations' scatter. */
function hash(i: number): number {
  return (((i * 2654435761) >>> 0) % 100000) / 100000;
}

// ------------------------------------------------------- Virgil: orbits

/**
 * **Virgil: elegant gold orbital paths and a luminous planet for the
 * active work.** Three concentric ellipses at the same inclination, drawn
 * in gold at three weights so the set reads as an orrery seen slightly
 * from above rather than as three rings. The active hop's planet travels
 * the middle track on a **ninety-second period** — the slowest motion in
 * the whole system, because the brief asks Virgil's for *"slow, graceful
 * astronomical motion"* — and a fine gold radius joins it to the centre,
 * which is the candidate.
 *
 * Where a hop has completed, its own small body rests on the outer track
 * at the angle it finished at, so the picture accumulates rather than
 * resetting: the run's history is in the geometry.
 */
export function orbits(
  ctx: Ctx,
  m: Metrics,
  r: Rect,
  t: number,
  active: number,
  done: readonly { at: number; colour: string }[],
  colour: string,
) {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h * 0.52;
  const rx = r.w * 0.42;
  const ry = r.h * 0.3;
  const tilt = -0.16;
  ctx.save();
  // The three tracks.
  const tracks = [0.62, 0.82, 1.0];
  tracks.forEach((k, i) => {
    ctx.strokeStyle = STRUCTURE.gold;
    ctx.globalAlpha = 0.2 + 0.16 * i;
    ctx.lineWidth = m.hair * (i === 1 ? 1.6 : 1);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * k, ry * k, tilt, 0, Math.PI * 2);
    ctx.stroke();
  });
  // A faint filled ecliptic, so the plane reads.
  const plane = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
  plane.addColorStop(0, `${GLASS.sapphire}55`);
  plane.addColorStop(1, `${GLASS.sapphire}00`);
  ctx.globalAlpha = 1;
  ctx.fillStyle = plane;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, tilt, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // The candidate at the centre: a small body with a gold rim.
  const core = Math.min(r.w, r.h) * 0.062;
  ctx.save();
  const body = ctx.createRadialGradient(cx - core * 0.4, cy - core * 0.4, 0, cx, cy, core);
  body.addColorStop(0, dim(0.5));
  body.addColorStop(1, `${GLASS.sapphire}`);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, core, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = STRUCTURE.goldBright;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = m.hair;
  ctx.stroke();
  ctx.restore();
  const onTrack = (k: number, angle: number) => {
    const c = Math.cos(angle) * rx * k;
    const s = Math.sin(angle) * ry * k;
    return [
      cx + c * Math.cos(tilt) - s * Math.sin(tilt),
      cy + c * Math.sin(tilt) + s * Math.cos(tilt),
    ] as [number, number];
  };
  // The hops that have finished, resting where they ended.
  done.forEach((hop, i) => {
    const [x, y] = onTrack(tracks[2] as number, hop.at);
    litDot(ctx, x, y, Math.min(r.w, r.h) * 0.017, hop.colour, 0.8);
    void i;
  });
  // The active work: a luminous planet, and its radius to the centre.
  if (active >= 0) {
    const angle = (t / 90) * Math.PI * 2 + active * 2.1;
    const [x, y] = onTrack(tracks[1] as number, angle);
    ctx.save();
    ctx.strokeStyle = STRUCTURE.gold;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = m.hair;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
    litDot(ctx, x, y, Math.min(r.w, r.h) * 0.032, colour, 1);
  }
}

/**
 * **The dependency constellation**: the three hops as nodes joined by fine
 * golden lines, the completed edges solid and the ones still ahead drawn as
 * a faint dotted path. The brief asks for *"constellation-like dependency
 * maps"*, and a dependency map of this system is exactly three nodes and
 * two edges — so it is drawn honestly at that size rather than padded with
 * invented nodes.
 */
export function dependencyChain(
  ctx: Ctx,
  m: Metrics,
  r: Rect,
  nodes: readonly { label: string; state: 'done' | 'active' | 'ahead'; colour: string }[],
  t: number,
) {
  const { u, hair } = m;
  const pad = 3.2 * u;
  const step = (r.w - 2 * pad) / Math.max(1, nodes.length - 1);
  const y = r.y + r.h * 0.5;
  const rise = r.h * 0.13;
  const at = (i: number): [number, number] => [
    r.x + pad + i * step,
    y + (i % 2 === 0 ? -rise * 0.5 : rise * 0.5),
  ];
  // The edges first, so the nodes sit over them.
  for (let i = 1; i < nodes.length; i += 1) {
    const a = at(i - 1);
    const b = at(i);
    const done = (nodes[i] as { state: string }).state !== 'ahead';
    ctx.save();
    ctx.strokeStyle = STRUCTURE.gold;
    ctx.globalAlpha = done ? 0.55 : 0.2;
    ctx.lineWidth = hair;
    if (!done) ctx.setLineDash([hair * 3, hair * 4]);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.restore();
    // A token travelling the live edge.
    if ((nodes[i] as { state: string }).state === 'active') {
      const k = (t / 6) % 1;
      litDot(
        ctx,
        a[0] + (b[0] - a[0]) * k,
        a[1] + (b[1] - a[1]) * k,
        hair * 1.3,
        STATUS.cyan,
        Math.sin(Math.PI * k),
      );
    }
  }
  nodes.forEach((node, i) => {
    const [x, ny] = at(i);
    const rr = 1.5 * u;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, ny, rr, 0, Math.PI * 2);
    ctx.fillStyle = node.state === 'ahead' ? dim(0.06) : `${node.colour}22`;
    ctx.fill();
    ctx.strokeStyle = node.state === 'ahead' ? dim(0.28) : node.colour;
    ctx.lineWidth = hair * 1.4;
    ctx.stroke();
    ctx.restore();
    if (node.state === 'active') litDot(ctx, x, ny, hair * 1.2, node.colour, 1);
    if (node.state === 'done') {
      strokePath(
        ctx,
        [
          [x - rr * 0.44, ny + rr * 0.02],
          [x - rr * 0.1, ny + rr * 0.38],
          [x + rr * 0.5, ny - rr * 0.38],
        ],
        node.colour,
        hair * 1.5,
      );
    }
    spaced(ctx, '0.1em');
    ctx.font = mono(m.type.micro);
    ctx.fillStyle = node.state === 'ahead' ? dim(0.34) : dim(0.72);
    ctx.textAlign = 'center';
    ctx.fillText(node.label, x, ny + rr + m.type.micro * 1.4);
    ctx.textAlign = 'left';
    spaced(ctx, '0em');
  });
}

// -------------------------------------------------- Fabricator: assembly

/**
 * **The Fabricator: cyan and warm amber assembly diagrams, rotating
 * component views, layered build structures, files joining together.**
 *
 * Five plates in axonometric, seen from a viewpoint that turns slowly
 * through ±14° on a **twenty-four-second** period — the *"rotating
 * component view"*. The plates start apart and close as the build
 * progresses, which is the *"layered build structure"* assembling; each
 * file that lands arrives as a small amber tag from the left and becomes a
 * notch on the plate it joined, so the count on the rail and the picture
 * are the same fact. Mechanical but friendly: every corner is rounded and
 * nothing is drawn in outline alone.
 */
export function assembly(
  ctx: Ctx,
  m: Metrics,
  r: Rect,
  t: number,
  progress: number,
  files: number,
  totalFiles: number,
  key: string,
  second: string,
) {
  const { u, hair } = m;
  const cx = r.x + r.w * 0.54;
  const cy = r.y + r.h * 0.52;
  const yaw = Math.sin((t / 24) * Math.PI * 2) * 0.245;
  const plateW = r.w * 0.44;
  const plateD = r.h * 0.3;
  const layers = 5;
  const spread = (1 - easeOut(clamp01(progress))) * r.h * 0.11 + r.h * 0.035;
  // Back to front, so the near plates overlap the far ones.
  for (let i = layers - 1; i >= 0; i -= 1) {
    const y = cy + (i - (layers - 1) / 2) * spread;
    const skew = Math.sin(yaw) * plateW * 0.24;
    const width = plateW * (1 - 0.055 * i);
    const built = clamp01(progress * layers - i);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - width / 2 - skew, y - plateD / 2);
    ctx.lineTo(cx + width / 2 - skew, y - plateD / 2);
    ctx.lineTo(cx + width / 2 + skew, y + plateD / 2);
    ctx.lineTo(cx - width / 2 + skew, y + plateD / 2);
    ctx.closePath();
    const grad = ctx.createLinearGradient(
      cx - width / 2,
      y - plateD / 2,
      cx + width / 2,
      y + plateD / 2,
    );
    grad.addColorStop(0, `${key}${built > 0 ? '26' : '0e'}`);
    grad.addColorStop(1, `${GLASS.sapphire}44`);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = built > 0 ? key : dim(0.2);
    ctx.globalAlpha = built > 0 ? 0.55 + 0.4 * built : 0.5;
    ctx.lineWidth = hair * (built > 0 ? 1.5 : 1);
    ctx.stroke();
    ctx.restore();
    // The joins: two amber studs where this plate meets the one below.
    if (built > 0.6 && i < layers - 1) {
      for (const s of [-0.32, 0.32]) {
        litDot(ctx, cx + width * s + skew * s * 2, y + plateD / 2, hair * 0.9, second, 0.75);
      }
    }
  }
  // The files arriving: the next one in flight, the landed ones as notches.
  const notch = plateW / Math.max(6, totalFiles);
  for (let i = 0; i < Math.min(files, totalFiles); i += 1) {
    const x = cx - plateW / 2 + notch * (i + 0.5);
    ctx.save();
    ctx.fillStyle = second;
    ctx.globalAlpha = 0.8;
    roundRect(ctx, x - notch * 0.3, cy - plateD * 0.5 - 1.5 * u, notch * 0.6, 1.1 * u, hair);
    ctx.fill();
    ctx.restore();
  }
  const flight = (t * 0.55) % 1;
  if (files < totalFiles) {
    const fx =
      r.x + 1.2 * u + (cx - plateW / 2 + notch * (files + 0.5) - r.x - 1.2 * u) * easeOut(flight);
    const fy =
      r.y + r.h * 0.16 + (cy - plateD * 0.5 - 1.5 * u - r.y - r.h * 0.16) * easeOut(flight);
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = second;
    roundRect(ctx, fx - notch * 0.3, fy - 0.55 * u, notch * 0.6, 1.1 * u, hair);
    ctx.fill();
    ctx.restore();
  }
  // The four fabrication stages, along the well's foot.
  stageBar(ctx, m, r, ['PLAN', 'WRITE', 'COMMIT', 'PUSH'], progress, key, second);
}

/** A row of named stages, the reached ones lit and the current one bright. */
export function stageBar(
  ctx: Ctx,
  m: Metrics,
  r: Rect,
  stages: readonly string[],
  progress: number,
  key: string,
  live: string,
) {
  const { u, hair } = m;
  const y = r.y + r.h - 2.6 * u;
  const pad = 1.6 * u;
  const each = (r.w - 2 * pad) / stages.length;
  const reached = clamp01(progress) * stages.length;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  stages.forEach((stage, i) => {
    const x = r.x + pad + i * each;
    const done = reached >= i + 1;
    const current = !done && reached > i;
    ctx.save();
    roundRect(ctx, x + 0.3 * u, y - 1.15 * u, each - 0.6 * u, 2.3 * u, 1.15 * u);
    ctx.fillStyle = done ? `${key}30` : current ? `${live}2e` : dim(0.045);
    ctx.fill();
    ctx.strokeStyle = done ? key : current ? live : dim(0.18);
    ctx.globalAlpha = done || current ? 0.8 : 1;
    ctx.lineWidth = hair;
    ctx.stroke();
    ctx.restore();
    spaced(ctx, '0.1em');
    fit(ctx, mono, m.type.micro, stage, each - 1.6 * u);
    ctx.fillStyle = done ? dim(0.9) : current ? live : dim(0.38);
    ctx.fillText(stage, x + each / 2, y);
    spaced(ctx, '0em');
  });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

// ------------------------------------------------------ Prover: scanning

/**
 * **The Prover: cyan and restrained green scanning lines, test nodes
 * resolving individually, diagnostic constellations, evidence travelling
 * through verification gates, failed checks isolated and clearly
 * identified.**
 *
 * The checks are a constellation, not a list: each is a node at a fixed
 * scattered position, joined to its two neighbours by a faint line, and
 * each resolves **on its own** — the ring closes, then a tick, a cross or a
 * hollow appears. One scanning line sweeps the field once per working
 * beat. A failed node is bracketed in red and named; a skipped one is
 * bracketed in amber, because a check that could not run is a gap and not
 * a failure. Precise, measured motion: nothing here eases, everything
 * moves linearly and stops exactly.
 */
export function scanning(
  ctx: Ctx,
  m: Metrics,
  r: Rect,
  t: number,
  since: number,
  checks: readonly { state: string; progress: number }[],
  names: readonly string[],
  outcome: Outcome,
  key: string,
  pass: string,
) {
  const { u, hair } = m;
  const field: Rect = { x: r.x + 1.4 * u, y: r.y + 1.4 * u, w: r.w - 2.8 * u, h: r.h - 6.4 * u };
  const n = checks.length;
  // Rows first, from the field's own aspect, then columns — so fourteen
  // nodes in a wide shallow well come out as two rows of seven rather
  // than three rows of six with two orphans on the last.
  const rows = Math.max(2, Math.round(Math.sqrt((n * field.h) / field.w)));
  const cols = Math.ceil(n / rows);
  const place = (i: number): [number, number] => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const jx = (hash(i * 3 + 1) - 0.5) * 0.5;
    const jy = (hash(i * 7 + 5) - 0.5) * 0.5;
    return [
      field.x + ((col + 0.5 + jx) / cols) * field.w,
      field.y + ((row + 0.5 + jy) / rows) * field.h,
    ];
  };
  // The constellation's edges.
  ctx.save();
  ctx.strokeStyle = dim(0.13);
  ctx.lineWidth = hair;
  ctx.beginPath();
  for (let i = 1; i < n; i += 1) {
    const a = place(i - 1);
    const b = place(i);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
  }
  ctx.stroke();
  ctx.restore();
  // The scanning line: one pass per beat, its head white-hot.
  const sweepY = field.y + ((since / 6) % 1) * field.h;
  ctx.save();
  const grad = ctx.createLinearGradient(0, sweepY - 3.4 * u, 0, sweepY);
  grad.addColorStop(0, `${key}00`);
  grad.addColorStop(1, `${key}3a`);
  ctx.fillStyle = grad;
  ctx.fillRect(field.x, sweepY - 3.4 * u, field.w, 3.4 * u);
  ctx.strokeStyle = CORE;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = hair;
  ctx.beginPath();
  ctx.moveTo(field.x, sweepY);
  ctx.lineTo(field.x + field.w, sweepY);
  ctx.stroke();
  ctx.restore();
  // The nodes.
  const rr = Math.min(field.w, field.h) * 0.055;
  let failedAt: [number, number] | null = null;
  let skippedAt: [number, number] | null = null;
  checks.forEach((check, i) => {
    const [x, y] = place(i);
    const colour =
      check.state === 'passed'
        ? pass
        : check.state === 'failed'
          ? STATUS.red
          : check.state === 'skipped'
            ? STATUS.amber
            : key;
    ctx.save();
    ctx.strokeStyle = check.state === 'running' ? dim(0.26) : colour;
    ctx.lineWidth = hair * 1.4;
    ctx.beginPath();
    ctx.arc(
      x,
      y,
      rr,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * (check.state === 'running' ? check.progress : 1),
    );
    ctx.stroke();
    ctx.restore();
    if (check.state === 'passed')
      strokePath(
        ctx,
        [
          [x - rr * 0.46, y + rr * 0.02],
          [x - rr * 0.1, y + rr * 0.4],
          [x + rr * 0.5, y - rr * 0.4],
        ],
        pass,
        hair * 1.5,
      );
    if (check.state === 'failed') {
      failedAt = [x, y];
      strokePath(
        ctx,
        [
          [x - rr * 0.42, y - rr * 0.42],
          [x + rr * 0.42, y + rr * 0.42],
        ],
        STATUS.red,
        hair * 1.6,
      );
      strokePath(
        ctx,
        [
          [x + rr * 0.42, y - rr * 0.42],
          [x - rr * 0.42, y + rr * 0.42],
        ],
        STATUS.red,
        hair * 1.6,
      );
    }
    if (check.state === 'skipped') {
      skippedAt = [x, y];
      strokePath(
        ctx,
        [
          [x - rr * 0.42, y],
          [x + rr * 0.42, y],
        ],
        STATUS.amber,
        hair * 1.6,
      );
    }
  });
  // The one that matters, isolated and named.
  const flagged: [[number, number], string, string] | null = failedAt
    ? [failedAt, STATUS.red, names[0] ?? 'REQUIRED CHECK']
    : skippedAt
      ? [skippedAt, STATUS.amber, names[0] ?? 'REQUIRED CHECK']
      : null;
  if (flagged) {
    const [[x, y], colour, label] = flagged;
    const bw = rr * 3.1;
    ctx.save();
    ctx.strokeStyle = colour;
    ctx.lineWidth = hair * 1.3;
    ctx.globalAlpha = 0.9;
    const arm = bw * 0.3;
    ctx.beginPath();
    for (const sx of [-1, 1])
      for (const sy of [-1, 1]) {
        ctx.moveTo(x + sx * bw, y + sy * bw - sy * arm);
        ctx.lineTo(x + sx * bw, y + sy * bw);
        ctx.lineTo(x + sx * bw - sx * arm, y + sy * bw);
      }
    ctx.stroke();
    ctx.restore();
    // The label, on its own small plate so it reads over the nodes it has
    // to sit among. The brief asks that failed checks be *"isolated and
    // clearly identified"*, and a name laid straight over a constellation
    // is neither.
    spaced(ctx, '0.08em');
    const size = fit(ctx, mono, m.type.micro, label, r.w * 0.56);
    const tw = ctx.measureText(label).width;
    const lx = Math.min(
      Math.max(x, field.x + tw / 2 + 1.4 * u),
      field.x + field.w - tw / 2 - 1.4 * u,
    );
    const ly = y + bw + size * 1.1;
    ctx.save();
    ctx.fillStyle = 'rgba(3,5,12,0.86)';
    roundRect(ctx, lx - tw / 2 - 0.8 * u, ly - size * 0.78, tw + 1.6 * u, size * 1.56, 0.5 * u);
    ctx.fill();
    ctx.strokeStyle = colour;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = hair;
    ctx.stroke();
    ctx.restore();
    ctx.font = mono(size);
    ctx.fillStyle = colour;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, lx, ly);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    spaced(ctx, '0em');
  }
  // The three gates the evidence travels through, along the foot.
  gates(ctx, m, r, t, outcome, key, pass);
}

/** Evidence travelling left to right through three verification gates. */
function gates(
  ctx: Ctx,
  m: Metrics,
  r: Rect,
  t: number,
  outcome: Outcome,
  key: string,
  pass: string,
) {
  const { u, hair } = m;
  const y = r.y + r.h - 2.9 * u;
  const x0 = r.x + 2.2 * u;
  const x1 = r.x + r.w - 2.2 * u;
  hairline(ctx, x0, y, x1, y, TEXT, hair, 0.16);
  const labels = ['CHECKS', 'EVIDENCE', 'GATE'];
  labels.forEach((label, i) => {
    const x = x0 + ((i + 1) / (labels.length + 1)) * (x1 - x0);
    const open = outcome === 'PASS' || i < 2;
    ctx.save();
    ctx.strokeStyle = open ? key : STATUS.red;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = hair * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y - 1.5 * u);
    ctx.lineTo(x, y - 0.3 * u);
    ctx.moveTo(x, y + 0.3 * u);
    ctx.lineTo(x, y + 1.5 * u);
    ctx.stroke();
    ctx.restore();
    spaced(ctx, '0.1em');
    ctx.font = mono(m.type.micro);
    ctx.fillStyle = dim(0.44);
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + 2.1 * u);
    ctx.textAlign = 'left';
    spaced(ctx, '0em');
  });
  // Three tokens in flight, staggered.
  for (let i = 0; i < 3; i += 1) {
    const k = (t * 0.14 + i / 3) % 1;
    const x = x0 + k * (x1 - x0);
    if (outcome !== 'PASS' && k > 0.75) continue;
    litDot(ctx, x, y, hair, k > 0.75 ? pass : key, Math.sin(Math.PI * Math.min(1, k * 1.2)));
  }
}

// -------------------------------------------------- Keeper: the archive

/**
 * **The Keeper: violet and sapphire archival cards, evidence stars joined
 * by fine golden lines, provenance chains, historical layers, sealing and
 * refusal animations.**
 *
 * Four cards receding into the depth of the glass, the front one being
 * read: a cursor travels down it and each finding is flagged in the margin
 * as it is raised, in its own severity's colour. Across the card runs the
 * **provenance chain** — evidence stars joined by fine gold lines, one
 * star per link, the chain drawing itself as the review proceeds. Behind
 * the cards are the **historical layers**: the outlines of everything
 * already sealed, fainter the further back. Calm and deliberate: nothing
 * on this screen moves faster than the cursor.
 */
export function archive(
  ctx: Ctx,
  m: Metrics,
  r: Rect,
  t: number,
  read: number,
  raised: readonly Finding[],
  sealed: number,
  refused: boolean,
  key: string,
) {
  const { u, hair } = m;
  const cardW = r.w * 0.62;
  const cardH = r.h * 0.66;
  const cx = r.x + r.w * 0.5;
  const cy = r.y + r.h * 0.46;
  // The historical layers behind: four, receding up and to the right.
  for (let i = 4; i >= 1; i -= 1) {
    const k = i / 4;
    ctx.save();
    ctx.globalAlpha = 0.1 + 0.1 * (1 - k);
    roundRect(
      ctx,
      cx - cardW / 2 + i * 1.5 * u,
      cy - cardH / 2 - i * 1.1 * u,
      cardW,
      cardH,
      1.2 * u,
    );
    ctx.strokeStyle = key;
    ctx.lineWidth = hair;
    ctx.stroke();
    ctx.restore();
  }
  // The card being read.
  ctx.save();
  roundRect(ctx, cx - cardW / 2, cy - cardH / 2, cardW, cardH, 1.2 * u);
  const face = ctx.createLinearGradient(0, cy - cardH / 2, 0, cy + cardH / 2);
  face.addColorStop(0, `${key}22`);
  face.addColorStop(1, `${GLASS.sapphire}55`);
  ctx.fillStyle = face;
  ctx.fill();
  ctx.strokeStyle = key;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = hair * 1.4;
  ctx.stroke();
  ctx.restore();
  // Its ruled lines, and the cursor's position down them.
  const rows = 9;
  ctx.save();
  roundRect(ctx, cx - cardW / 2, cy - cardH / 2, cardW, cardH, 1.2 * u);
  ctx.clip();
  for (let i = 0; i < rows; i += 1) {
    const y = cy - cardH / 2 + ((i + 1) / (rows + 1)) * cardH;
    const width = cardW * (0.52 + 0.3 * hash(i * 11 + 3));
    const past = (i + 1) / (rows + 1) <= read;
    hairline(
      ctx,
      cx - cardW / 2 + 1.6 * u,
      y,
      cx - cardW / 2 + 1.6 * u + width,
      y,
      past ? TEXT : TEXT,
      hair * 1.4,
      past ? 0.5 : 0.14,
    );
  }
  // The cursor.
  const cursorY = cy - cardH / 2 + clamp01(read) * cardH;
  ctx.save();
  const glow = ctx.createLinearGradient(0, cursorY - 1.6 * u, 0, cursorY + 1.6 * u);
  glow.addColorStop(0, `${key}00`);
  glow.addColorStop(0.5, `${key}55`);
  glow.addColorStop(1, `${key}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(cx - cardW / 2, cursorY - 1.6 * u, cardW, 3.2 * u);
  ctx.restore();
  hairline(ctx, cx - cardW / 2, cursorY, cx + cardW / 2, cursorY, CORE, hair, 0.5);
  ctx.restore();
  // The provenance chain across the card: stars joined by fine gold lines.
  const links = 5;
  const chain: [number, number][] = [];
  for (let i = 0; i < links; i += 1) {
    chain.push([
      cx - cardW * 0.4 + (i / (links - 1)) * cardW * 0.8,
      cy + cardH * (0.1 + 0.26 * (hash(i * 17 + 9) - 0.5)),
    ]);
  }
  const drawn = clamp01(read * 1.15);
  strokePath(ctx, chain, STRUCTURE.gold, hair, drawn);
  chain.forEach((point, i) => {
    if (i / (links - 1) > drawn + 0.02) return;
    star(ctx, point[0], point[1], 1.15 * u, STRUCTURE.goldBright);
  });
  // The findings, flagged in the margin in their own severity's colour.
  const severity: Record<string, string> = {
    blocking: STATUS.red,
    major: STATUS.amber,
    minor: STATUS.cyan,
    informational: dim(0.6),
  };
  // The findings are flagged **inside** the card's own right margin: a
  // margin outside it ran off the well's edge and was clipped, which is
  // what the first study frame showed.
  raised.forEach((finding) => {
    const y = cy - cardH / 2 + Math.min(0.94, Math.max(0.06, finding.line)) * cardH;
    const colour = severity[finding.severity] ?? key;
    const x = cx + cardW / 2 - 1.4 * u;
    ctx.save();
    ctx.fillStyle = colour;
    roundRect(ctx, x - 0.9 * u, y - 0.5 * u, 0.9 * u, 1 * u, 0.45 * u);
    ctx.fill();
    ctx.restore();
    spaced(ctx, '0.08em');
    ctx.font = mono(m.type.micro * 0.9);
    ctx.fillStyle = colour;
    ctx.textAlign = 'right';
    ctx.fillText(finding.severity.slice(0, 3).toUpperCase(), x - 1.5 * u, y - m.type.micro * 0.45);
    ctx.textAlign = 'left';
    spaced(ctx, '0em');
  });
  // Sealing, or refusal. Both are drawn, never both at once.
  if (sealed > 0 && !refused) {
    const k = easeOut(clamp01(sealed));
    const sx = cx;
    const sy = cy + cardH / 2 + 2.2 * u;
    const rr = 1.8 * u;
    const hex: [number, number][] = [];
    for (let i = 0; i <= 6; i += 1) {
      const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
      hex.push([sx + Math.cos(a) * rr, sy + Math.sin(a) * rr]);
    }
    strokePath(ctx, hex, STRUCTURE.goldBright, hair * 1.6, k);
    if (k > 0.9) litDot(ctx, sx, sy, hair * 1.2, STRUCTURE.goldBright, 1);
  }
  if (refused) {
    const k = easeOut(clamp01(sealed));
    strokePath(
      ctx,
      [
        [cx - cardW * 0.44, cy + cardH / 2 + 2.2 * u],
        [cx + cardW * 0.44, cy + cardH / 2 + 2.2 * u],
      ],
      STATUS.red,
      hair * 2,
      k,
    );
  }
  void t;
}

/** A four-pointed star: what an evidence node is, everywhere in the system. */
export function star(ctx: Ctx, x: number, y: number, r: number, colour: string) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.16, y - r * 0.16, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.16, y + r * 0.16, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.16, y + r * 0.16, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.16, y - r * 0.16, x, y - r);
  ctx.fill();
  ctx.restore();
}

/** The Prover's own check names, for the isolated failure's label. */
export function checkNames(checks: readonly Check[]): string[] {
  return checks.map((_, i) => `CHECK ${String(i + 1).padStart(2, '0')}`);
}

// ------------------------------------------------- the hand-off arriving

/**
 * **The hand-off, arriving.** The owner's V8 direction, unchanged and
 * still binding: *"don't make the 'recieving' screen so quick, it should
 * really have an awesome animation of information being transmitted and
 * recieving."* So the receiving beat is six seconds in four stages the eye
 * can follow, and it is shared by all three consoles because a hand-off is
 * the same event whoever receives it — only the accent differs.
 *
 *  1. **0.0–1.2 s** a carrier reaches in from the left edge, a fine line
 *     with a lit head, and a signal pulses at the arrival point;
 *  2. **1.2–3.6 s** packets cross one after another and land with weight
 *     into the receipt grid, each one settling before the next arrives;
 *  3. **3.6–5.0 s** the landed packets decode: each cell of the grid
 *     lights in turn and its contents resolve;
 *  4. **5.0–6.0 s** the grid settles under a bracket that draws itself and
 *     the authority the grant carries is named.
 */
export function arrival(ctx: Ctx, m: Metrics, r: Rect, t: number, since: number, key: string) {
  const { u, hair } = m;
  const cols = 6;
  const rows = 3;
  const gridW = r.w * 0.62;
  const gridH = r.h * 0.5;
  const gx = r.x + r.w - gridW - 1.8 * u;
  const gy = r.y + r.h * 0.5 - gridH * 0.5;
  const cw = gridW / cols;
  const ch = gridH / rows;
  const total = cols * rows;
  const port: [number, number] = [r.x + 1.8 * u, r.y + r.h * 0.5];

  // 1. The carrier.
  const reach = clamp01(since / 1.2);
  strokePath(ctx, [port, [gx, gy + gridH / 2]], `${key}66`, hair, reach);
  const pulse = 0.5 + 0.5 * Math.sin(since * 6);
  litDot(ctx, port[0], port[1], hair * 1.4, key, 0.5 + 0.5 * pulse);

  // The grid's cells: empty, landed, decoded.
  const landed = clamp01((since - 1.2) / 2.4) * total;
  const decoded = clamp01((since - 3.6) / 1.4) * total;
  for (let i = 0; i < total; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = gx + col * cw;
    const y = gy + row * ch;
    const has = landed > i;
    const lit = decoded > i;
    ctx.save();
    roundRect(ctx, x + 0.3 * u, y + 0.3 * u, cw - 0.6 * u, ch - 0.6 * u, 0.4 * u);
    ctx.fillStyle = lit ? `${key}2e` : has ? `${key}16` : dim(0.035);
    ctx.fill();
    ctx.strokeStyle = has ? key : dim(0.16);
    ctx.globalAlpha = has ? 0.7 : 1;
    ctx.lineWidth = hair;
    ctx.stroke();
    ctx.restore();
    if (lit) {
      // The decoded contents: two short data rules inside the cell.
      hairline(ctx, x + 0.9 * u, y + ch * 0.4, x + cw - 1.4 * u, y + ch * 0.4, TEXT, hair, 0.55);
      hairline(ctx, x + 0.9 * u, y + ch * 0.62, x + cw - 2.2 * u, y + ch * 0.62, TEXT, hair, 0.3);
    }
  }

  // 2. The packet in flight, landing into the next empty cell.
  if (landed < total && since > 1.2) {
    const next = Math.floor(landed);
    const k = landed - next;
    const col = next % cols;
    const row = Math.floor(next / cols);
    const tx = gx + col * cw + cw / 2;
    const ty = gy + row * ch + ch / 2;
    const px = port[0] + (tx - port[0]) * easeOut(k);
    const py = port[1] + (ty - port[1]) * easeOut(k);
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = key;
    roundRect(ctx, px - 0.9 * u, py - 0.5 * u, 1.8 * u, 1 * u, 0.3 * u);
    ctx.fill();
    ctx.restore();
    litDot(ctx, px, py, hair * 0.9, CORE, 0.7);
  }

  // 4. The bracket, and what the grant carries.
  const settle = clamp01((since - 5) / 1);
  if (settle > 0) {
    const arm = 2 * u;
    ctx.save();
    ctx.strokeStyle = STRUCTURE.goldBright;
    ctx.globalAlpha = 0.7 * settle;
    ctx.lineWidth = hair;
    ctx.beginPath();
    ctx.moveTo(gx, gy + gridH + 1.2 * u - arm * 0);
    ctx.lineTo(gx, gy + gridH + 1.4 * u);
    ctx.lineTo(gx + gridW, gy + gridH + 1.4 * u);
    ctx.lineTo(gx + gridW, gy + gridH + 1.2 * u);
    ctx.stroke();
    ctx.restore();
    spaced(ctx, '0.12em');
    ctx.font = mono(m.type.micro);
    ctx.fillStyle = dim(0.6 * settle);
    ctx.textAlign = 'center';
    ctx.fillText(
      'AUTHORITY GRANT · PERMITTED PATHS · EXPIRY',
      gx + gridW / 2,
      gy + gridH + 2.2 * u,
    );
    ctx.textAlign = 'left';
    spaced(ctx, '0em');
  }
  void t;
}
