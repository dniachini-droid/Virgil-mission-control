import type { Role } from '../room/cast.js';
import type { Outcome, Report, StationState } from '../room/demo.js';
import { room } from '../room/palette.js';
import { type Arrival, arrivalPoint, RECEIVING, SCREEN_ARRIVAL } from './arrival.js';
import {
  BLOCK_RED,
  bigWord,
  blocks,
  brackets,
  type Ctx,
  counter,
  cross,
  DIM,
  EVIDENCE_BLUE,
  FAINT,
  finish,
  frame,
  glowDot,
  INK,
  PASS_GREEN,
  quieten,
  RULE,
  roundRect,
  TEXT,
  tick,
} from './draw.js';
import {
  clamp01,
  drift,
  easeInOut,
  easeOut,
  follow,
  landing,
  roll,
  scatter,
  staggered,
} from './motion.js';
import { drawReturn, withdrawal } from './returning.js';
import {
  type Check,
  FABRICATOR_COMMITS,
  FABRICATOR_FILES,
  fabricatorTally,
  keeperTally,
  proverChecks,
  proverTally,
} from './tally.js';
import { verdictLook } from './verdicts.js';
import type { HopWork } from './work.js';

/**
 * What an agent's console screen shows: the occupant's name as the
 * title, the state as the big word, and the work — drawn onto the
 * console's own screen triangles (`ConsoleScreen.tsx`).
 *
 * V8 (`docs/process/PHASE_1_STYLISED_SPEC.md` §0.10.6). The owner, of
 * V7's screens: "not something that is basic clip art that is animated";
 * "make the animations more... futeristic. put work into those
 * animations, make it look detailed. And don't make the 'recieving'
 * screen so quick, it should really have an awesome animation of
 * information being transmitted and recieving." Not more words. So:
 *
 *  - **RECEIVING is the centrepiece**, six seconds in four stages the eye
 *    can follow (`RECEIVING` in `arrival.ts`): a signal at the arrival
 *    point and a carrier reaching in from it; packets crossing from the
 *    arrival point and landing one after another, each with weight, a
 *    receipt ring filling a beat behind them; the landed packets
 *    unpacking upward into a grid, each cell decoding as it lands while
 *    the carrier withdraws; the grid settling under a bracket that draws
 *    itself, the state word landing last. Then a slow shimmer.
 *  - **WORKING is a process, not a spinner**: for the Prover, checks that
 *    start in sequence and overlap, each filling with a bright head and
 *    ending in a tick that pops, a cross, or a stalled hollow, the counts
 *    rolling; for the Keeper, a page being read with a cursor and
 *    findings flagged as they are raised; for the Fabricator, files
 *    written and commits made. The counts are `tally.ts`.
 *  - **REPORTED is the return** (`returning.ts`): the working content
 *    withdraws and the verdict converges — many pieces gathering into
 *    one ring — with the agent's own counts beneath it.
 *  - **READY** is quiet: the screen is only on while there is work
 *    (`crt.ts`), so this is what shows for the moment before it goes dark.
 *
 * `since` is seconds since the state last changed; `t` is the screen's
 * own clock for the imperfections.
 */
/**
 * **The picture is drawn full bleed.**
 *
 * V8 drew it into an inset of the canvas — 3 % of the width on three sides
 * and 9 % of the height at the foot, in ink — so that the honesty band
 * cleared the console's bezel lip, which from a camera above a tilted-back
 * screen hides a strip along the screen's foot. Together with the 35 mm
 * the drawn rectangle was itself inset by, that is the gap the owner saw:
 * *"they are still sharp edges, a rectangle, instead of going right to the
 * end of the screen."*
 *
 * Both insets are gone. The picture now covers the model's own opening
 * (`screenOutline.ts`), and the band is laid out **inside the rounded
 * area** instead — `draw.ts`'s `band` clips the stripe to the outline and
 * fits the four words to the width the bottom curves leave. The bezel-lip
 * problem the V8 inset was solving is answered by the close-up camera
 * standing on the screen's own axis (V8.1, `room/closeUp.ts`), which is
 * the one direction from which nothing standing proud of a surface can
 * cover it, and by `test/close-up-sight.test.ts`, which fails if any point
 * of the drawn outline is hidden by anything the model does not already
 * hide.
 */
export function drawStation(
  canvas: HTMLCanvasElement,
  t: number,
  since: number,
  occupant: string,
  role: Role,
  state: StationState,
  report: Report,
  outcome: Outcome,
  quiet = 0,
  corner = 0,
  /**
   * What this station is doing, when the caller has it as data (the
   * replay). Absent in the scripted demonstration, which falls back to
   * `tally.ts`'s illustrative fixtures. `screens/work.ts` says why.
   */
  work?: HopWork,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  // Everything is drawn inside the outline, in the canvas as well as in
  // the geometry: two independent guards on the same rule.
  if (corner > 0) {
    roundRect(ctx, 0, 0, w, h, corner);
    ctx.clip();
  }
  drawStationPicture(
    ctx,
    w,
    h,
    t,
    since,
    occupant,
    role,
    state,
    report,
    outcome,
    quiet,
    corner,
    work,
  );
  ctx.restore();
}

function drawStationPicture(
  ctx: Ctx,
  w: number,
  h: number,
  t: number,
  since: number,
  occupant: string,
  role: Role,
  state: StationState,
  report: Report,
  outcome: Outcome,
  quiet: number,
  corner: number,
  work: HopWork | undefined,
) {
  const reported = state === 'REPORTED';
  const tint =
    state === 'RECEIVING'
      ? room.emit.ice
      : state === 'WORKING'
        ? room.warm.amber
        : reported
          ? verdictLook(report).tint
          : room.emit.cyan;
  const lift = reported ? clamp01(1 - (since - 1.5) / 2.5) : 0;
  const floor = frame(ctx, w, h, occupant.toUpperCase(), tint, lift, corner);
  const arrival = SCREEN_ARRIVAL[role];
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, floor);
  ctx.clip();
  if (state === 'READY') drawReady(ctx, w, floor, t, tint);
  else if (state === 'RECEIVING') drawReceiving(ctx, w, floor, since, t, arrival, tint);
  else if (state === 'WORKING') drawWorking(ctx, w, floor, since, role, outcome, tint, work);
  else drawReported(ctx, w, floor, since, role, report, outcome, arrival, work);
  ctx.restore();
  finish(ctx, w, h, t);
  if (quiet > 0) quieten(ctx, w, h, quiet);
}

/** Switched on, waiting: three blocks lit and a fourth breathing. */
function drawReady(ctx: Ctx, w: number, floor: number, t: number, tint: string) {
  bigWord(ctx, 'READY', 64, 140, w - 128, tint);
  const breath = 0.5 + 0.5 * drift(t, 0.5);
  blocks(ctx, 64, floor - 110, w - 128, 56, 8, 3, tint, breath);
}

// ------------------------------------------------------------ receiving

const PACKETS = 12;
const GRID_COLUMNS = 4;

/**
 * The geometry of the receiving screen: the landing row across the
 * lower middle, the grid above it, the receipt ring at the far side
 * from the arrival point.
 */
function receivingLayout(w: number, floor: number, arrival: Arrival) {
  const rowY = floor - 96;
  const rowX = 64;
  const rowW = w - 128 - 170;
  const gridTop = 160;
  const gridBottom = rowY - 40;
  const gridX = rowX;
  const gridW = rowW;
  const ringX = arrival.edge === 'left' ? w - 64 - 70 : w - 64 - 70;
  const ringY = rowY + 28;
  return { rowY, rowX, rowW, gridTop, gridBottom, gridX, gridW, ringX, ringY };
}

function drawReceiving(
  ctx: Ctx,
  w: number,
  floor: number,
  since: number,
  t: number,
  arrival: Arrival,
  tint: string,
) {
  const L = receivingLayout(w, floor, arrival);
  const [ax, ay] = arrivalPoint(arrival, w, floor);
  const cellW = (L.rowW - (PACKETS - 1) * 10) / PACKETS;
  const slotX = (k: number) => L.rowX + k * (cellW + 10) + cellW / 2;
  const slotY = L.rowY + 28;
  // Where each landed packet goes when it unpacks: a grid, filled from
  // the arrival side.
  const rows = Math.ceil(PACKETS / GRID_COLUMNS);
  const gridCellW = (L.gridW - (GRID_COLUMNS - 1) * 16) / GRID_COLUMNS;
  const gridCellH = (L.gridBottom - L.gridTop - (rows - 1) * 16) / rows;
  const gridSlot = (k: number): [number, number] => {
    const col = k % GRID_COLUMNS;
    const row = Math.floor(k / GRID_COLUMNS);
    const c = arrival.edge === 'right' ? GRID_COLUMNS - 1 - col : col;
    return [
      L.gridX + c * (gridCellW + 16) + gridCellW / 2,
      L.gridBottom - row * (gridCellH + 16) - gridCellH / 2,
    ];
  };

  // 1. The signal and the carrier: a point of light at the arrival point,
  //    a line reaching from it to the landing row, easing in.
  const signal = clamp01(since / 0.35);
  const carrier = easeOut(clamp01((since - 0.25) / 0.65));
  // The carrier withdraws as the packets unpack: the secondary motion of
  // the unpacking.
  const withdraw = easeInOut(clamp01((since - RECEIVING.unpack - 0.3) / 1.0));
  const carrierEnd: [number, number] = [slotX(arrival.edge === 'right' ? PACKETS - 1 : 0), slotY];
  const carrierFrom = 1 - carrier * (1 - withdraw);
  if (carrier > 0 && withdraw < 1) {
    ctx.strokeStyle = tint;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.35 * (1 - withdraw);
    ctx.lineWidth = RULE;
    ctx.setLineDash([22, 18]);
    ctx.lineDashOffset = -since * 260;
    ctx.beginPath();
    ctx.moveTo(ax + (carrierEnd[0] - ax) * carrierFrom, ay + (carrierEnd[1] - ay) * carrierFrom);
    ctx.lineTo(carrierEnd[0], carrierEnd[1]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  if (signal > 0 && since < RECEIVING.unpack + 0.6) {
    const fade = clamp01((RECEIVING.unpack + 0.6 - since) / 0.5);
    const emitting = since >= RECEIVING.transfer && since < RECEIVING.unpack;
    const beat = emitting
      ? 1 + 0.5 * Math.max(0, Math.sin(((since - RECEIVING.transfer) / 0.19) * Math.PI * 2))
      : 1;
    glowDot(ctx, ax, ay, (14 + 10 * easeOut(signal)) * beat, tint, fade);
  }

  // 2. The packets: each leaves the arrival point in turn, crosses to its
  //    slot in the row on an ease-in-out, and lands with weight. Its slot
  //    lights as it lands.
  const landed: number[] = [];
  for (let k = 0; k < PACKETS; k += 1) {
    const order = arrival.edge === 'right' ? PACKETS - 1 - k : k;
    const p = staggered(since - RECEIVING.transfer, order, 0.7, 0.19);
    if (p <= 0) continue;
    const [tx, ty] = [slotX(k), slotY];
    if (p < 1) {
      const e = easeInOut(p);
      const x = ax + (tx - ax) * e;
      const y = ay + (ty - ay) * e - Math.sin(e * Math.PI) * 42;
      const size = 10 + 6 * Math.sin(e * Math.PI);
      ctx.fillStyle = tint;
      ctx.globalAlpha = 0.9;
      roundRect(ctx, x - size, y - size * 0.6, size * 2, size * 1.2, 6);
      ctx.fill();
      // Its trail: the same packet a beat earlier, fainter.
      const eb = easeInOut(clamp01(p - 0.08));
      ctx.globalAlpha = 0.3;
      roundRect(
        ctx,
        ax + (tx - ax) * eb - size * 0.7,
        ay + (ty - ay) * eb - Math.sin(eb * Math.PI) * 42 - size * 0.4,
        size * 1.4,
        size * 0.8,
        5,
      );
      ctx.fill();
      ctx.globalAlpha = 1;
    } else landed.push(k);
  }
  // 3. The landed row, and the unpacking: each landed packet rises to its
  //    grid cell, staggered, landing with overshoot and decoding as it
  //    does — from a solid block to a bracketed cell with a bar inside.
  for (let k = 0; k < PACKETS; k += 1) {
    const order = arrival.edge === 'right' ? PACKETS - 1 - k : k;
    const landedAt = RECEIVING.transfer + order * 0.19 + 0.7;
    if (since < landedAt) {
      // Its empty slot, faint.
      ctx.fillStyle = FAINT;
      roundRect(ctx, slotX(k) - cellW / 2, slotY - 20, cellW, 40, 8);
      ctx.fill();
      continue;
    }
    const pop = landing(clamp01((since - landedAt) / 0.35), 0.3);
    const rise = staggered(since - RECEIVING.unpack, order, 0.75, 0.09);
    const [gx, gy] = gridSlot(k);
    const e = easeInOut(rise);
    const x = slotX(k) + (gx - slotX(k)) * e;
    const y = slotY + (gy - slotY) * e;
    const width = cellW * pop + (gridCellW - cellW) * e;
    const height = 40 * pop + (gridCellH - 40) * e;
    const settled = landing(clamp01((since - RECEIVING.unpack - order * 0.09 - 0.75) / 0.4), 0.22);
    const sw = width * (rise >= 1 ? settled : 1);
    const sh = height * (rise >= 1 ? settled : 1);
    ctx.fillStyle = tint;
    ctx.globalAlpha = rise >= 1 ? 0.22 : 0.9 - 0.6 * e;
    roundRect(ctx, x - sw / 2, y - sh / 2, sw, sh, 10);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (rise >= 1) {
      // Decoded: a bracketed cell with a bar inside, the bar's length its own.
      brackets(ctx, x - sw / 2, y - sh / 2, sw, sh, tint, settled);
      const barW =
        sw *
        (0.35 + 0.5 * scatter(k, 11)) *
        clamp01((since - RECEIVING.unpack - order * 0.09 - 0.9) / 0.4);
      ctx.fillStyle = tint;
      ctx.globalAlpha = 0.85;
      roundRect(ctx, x - sw / 2 + sh * 0.3, y - 8, barW, 16, 6);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  // 4. The receipt ring, a beat behind the landings: fills as packets land.
  const received = landed.length / PACKETS;
  const ringFill = follow(received, since - RECEIVING.transfer, 0.15, 0.4) * received;
  ctx.strokeStyle = tint;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.arc(L.ringX, L.ringY, 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (ringFill > 0) {
    ctx.beginPath();
    ctx.arc(L.ringX, L.ringY, 46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ringFill);
    ctx.stroke();
  }
  if (received >= 1) {
    const done = landing(clamp01((since - RECEIVING.unpack) / 0.4), 0.3);
    ctx.save();
    ctx.translate(L.ringX, L.ringY);
    ctx.scale(done, done);
    tick(ctx, -24, -24, tint, 48, 1);
    ctx.restore();
  }
  // 5. The settle: a bracket frame draws round the grid, and the state
  //    word lands last, with weight.
  const settleP = clamp01((since - RECEIVING.settle) / 0.7);
  if (settleP > 0) {
    brackets(
      ctx,
      L.gridX - 14,
      L.gridTop - 14,
      L.gridW + 28,
      L.gridBottom - L.gridTop + 28,
      tint,
      settleP,
    );
  }
  const word = clamp01((since - RECEIVING.settle - 0.2) / 0.6);
  if (word > 0) bigWord(ctx, 'RECEIVING', 64, 130, w - 128 - 40, tint, word, 150);
  else {
    // Before it lands: the word faint, a placeholder.
    ctx.save();
    ctx.globalAlpha = 0.3;
    bigWord(ctx, 'RECEIVING', 64, 130, w - 128 - 40, tint, 1, 150);
    ctx.restore();
  }
  // Held: a light sweeping across the grid every couple of seconds.
  if (since > RECEIVING.held) {
    const sweep = ((since - RECEIVING.held) % 2.4) / 2.4;
    const x = L.gridX + L.gridW * sweep;
    const g = ctx.createLinearGradient(x - 120, 0, x + 120, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.16)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(L.gridX, L.gridTop, L.gridW, L.gridBottom - L.gridTop);
  }
}

// ------------------------------------------------------------ working

function drawWorking(
  ctx: Ctx,
  w: number,
  floor: number,
  since: number,
  role: Role,
  outcome: Outcome,
  tint: string,
  work?: HopWork,
) {
  const arrive = clamp01(since / 0.5);
  bigWord(ctx, 'WORKING', 64, 130, w - 128 - 300, tint, arrive, 150);
  if (role === 'prover') drawProverWork(ctx, w, floor, since, outcome, tint, work);
  else if (role === 'keeper') drawKeeperWork(ctx, w, floor, since, tint, work);
  else drawFabricatorWork(ctx, w, floor, since, tint, work);
}

/** The Prover: checks running in sequence and overlapping, counted. */
function drawProverWork(
  ctx: Ctx,
  w: number,
  floor: number,
  since: number,
  outcome: Outcome,
  tint: string,
  work?: HopWork,
) {
  const schedule = work?.kind === 'checks' ? work.checks : undefined;
  const tally = proverTally(since, outcome, schedule);
  const top = 300;
  const bottom = floor - 40;
  const visible = 6;
  const pitch = (bottom - top) / visible;
  const barX = 64;
  const barW = w - 128 - 400;
  // The list scrolls: the newest running check is kept in view, and the
  // rows above slide up — the secondary motion of the process advancing.
  let first = 0;
  for (let i = 0; i < tally.checks.length; i += 1) {
    const c = tally.checks[i] as { state: string; progress: number };
    if (c.state === 'running' && c.progress > 0) first = Math.max(0, i - (visible - 2));
  }
  const scroll = easeOut(clamp01((since - proverStartOf(first, schedule)) / 0.35));
  const offset = first > 0 ? (1 - scroll) * pitch : 0;
  for (
    let i = Math.max(0, first - 1);
    i < Math.min(tally.checks.length, first + visible + 1);
    i += 1
  ) {
    const c = tally.checks[i] as { state: string; progress: number };
    const y = top + (i - first) * pitch + offset;
    if (y < top - pitch || y > bottom) continue;
    const started = c.progress > 0 || c.state !== 'running';
    ctx.globalAlpha = started ? 1 : 0.3;
    // The check's index, data-shaped.
    ctx.fillStyle = DIM;
    ctx.font = `700 34px ${'"GeistMono Bold"'}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1).padStart(2, '0'), barX, y + pitch / 2);
    // The bar: faint track, filling with a bright head while it runs.
    ctx.fillStyle = FAINT;
    roundRect(ctx, barX + 70, y + pitch * 0.28, barW, pitch * 0.44, 8);
    ctx.fill();
    const fill = c.state === 'running' ? easeOut(c.progress) : 1;
    if (fill > 0) {
      ctx.fillStyle =
        c.state === 'failed' ? BLOCK_RED : c.state === 'skipped' ? EVIDENCE_BLUE : tint;
      ctx.globalAlpha = c.state === 'skipped' ? 0.5 : started ? 0.9 : 0.3;
      roundRect(ctx, barX + 70, y + pitch * 0.28, barW * fill, pitch * 0.44, 8);
      ctx.fill();
      if (c.state === 'running' && c.progress > 0 && c.progress < 1) {
        glowDot(ctx, barX + 70 + barW * fill, y + pitch / 2, pitch * 0.2, tint, 0.9);
      }
    }
    ctx.globalAlpha = 1;
    // The outcome, popping in: a tick, a cross, or the hollow of a check that could not run.
    const mx = barX + 70 + barW + 26;
    const ms = pitch * 0.62;
    if (c.state === 'passed') {
      const pop = landing(clamp01((since - proverEndOf(i, outcome, schedule)) / 0.3), 0.3);
      ctx.save();
      ctx.translate(mx + ms / 2, y + pitch / 2);
      ctx.scale(pop, pop);
      tick(ctx, -ms / 2, -ms / 2, PASS_GREEN, ms, 1);
      ctx.restore();
    } else if (c.state === 'failed') {
      const pop = landing(clamp01((since - proverEndOf(i, outcome, schedule)) / 0.3), 0.3);
      ctx.save();
      ctx.translate(mx + ms / 2, y + pitch / 2);
      ctx.scale(pop, pop);
      cross(ctx, -ms / 2, -ms / 2, BLOCK_RED, ms, 1);
      ctx.restore();
    } else if (c.state === 'skipped') {
      ctx.strokeStyle = EVIDENCE_BLUE;
      ctx.lineWidth = 8;
      ctx.setLineDash([10, 8]);
      ctx.strokeRect(mx + 4, y + pitch / 2 - ms / 2 + 4, ms - 8, ms - 8);
      ctx.setLineDash([]);
    }
  }
  // The counts, right: passed, failed, running, each rolling as it changes.
  const cx = w - 64 - 330;
  const cw = 330;
  const rows: [string, number, string][] = [
    ['PASSED', tally.passed, PASS_GREEN],
    ['FAILED', tally.failed, tally.failed > 0 ? BLOCK_RED : DIM],
    ['RUNNING', tally.running, tint],
  ];
  if (tally.skipped > 0) rows.push(['SKIPPED', tally.skipped, EVIDENCE_BLUE]);
  rows.forEach(([label, value, colour], i) => {
    counter(ctx, label, value, 0, cx, 300 + i * 78, cw, colour, 60);
  });
  // The running total, small, beneath.
  ctx.fillStyle = DIM;
  ctx.font = `700 30px ${'"GeistMono Bold"'}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'right';
  ctx.fillText(
    `${tally.passed + tally.failed + tally.skipped} OF ${tally.total}`,
    cx + cw,
    300 + rows.length * 78 + 10,
  );
  ctx.textAlign = 'left';
}

/**
 * When check `i` starts and ends, in seconds into the working beat. Both
 * read the schedule in force — the replay's recorded checks when it has
 * one, the demonstration's fixture otherwise — so the tick can never pop
 * at a moment the bar did not finish.
 */
function proverStartOf(i: number, schedule?: readonly Check[]): number {
  const check = (schedule ?? proverChecks('PASS'))[i];
  return check ? check.start : 0.2 + i * 0.36;
}
function proverEndOf(i: number, outcome: Outcome, schedule?: readonly Check[]): number {
  const check = (schedule ?? proverChecks(outcome))[i];
  return check ? check.start + check.seconds : 0.2 + i * 0.36 + 0.85 + ((i * 7) % 4) * 0.08;
}

/** The Keeper: a page being read, a cursor moving down it, findings flagged. */
function drawKeeperWork(
  ctx: Ctx,
  w: number,
  floor: number,
  since: number,
  tint: string,
  work?: HopWork,
) {
  const review = work?.kind === 'review' ? work : undefined;
  const tally = keeperTally(since, review?.findings, review?.readSeconds);
  const top = 300;
  const bottom = floor - 40;
  const pageX = 64;
  const pageW = w - 128 - 400;
  const lines = 11;
  const pitch = (bottom - top) / lines;
  // The page: lines of varying length, data-shaped; the read ones lit.
  for (let i = 0; i < lines; i += 1) {
    const y = top + i * pitch + pitch * 0.3;
    const len = pageW * (0.35 + 0.6 * scatter(i, 21));
    const readAt = i / lines;
    const read = tally.read >= readAt;
    ctx.fillStyle = read ? tint : FAINT;
    ctx.globalAlpha = read ? 0.55 : 1;
    roundRect(ctx, pageX + 40, y, len, pitch * 0.4, 6);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // The cursor: a bar at the line being read, gliding down the page with
  // a glow at its head; it pauses on a finding.
  const cy = top + tally.read * (bottom - top);
  ctx.fillStyle = tint;
  ctx.globalAlpha = 0.9;
  roundRect(ctx, pageX, cy - 6, 24, 12 + pitch * 0.4, 4);
  ctx.fill();
  ctx.globalAlpha = 1;
  glowDot(ctx, pageX + 12, cy + pitch * 0.2, 12, tint, 0.8);
  // The findings: a bracket pops beside the flagged line, amber, and
  // persists — a finding is never dropped. Severity by the mark inside.
  for (const f of tally.raised) {
    const pop = landing(clamp01((since - f.at) / 0.4), 0.35);
    const y = top + f.line * (bottom - top);
    const colour = f.severity === 'blocking' ? BLOCK_RED : room.warm.amber;
    ctx.save();
    ctx.translate(pageX + 40 + pageW + 30, y + pitch * 0.4);
    ctx.scale(pop, pop);
    ctx.strokeStyle = colour;
    ctx.lineWidth = RULE;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(-14, -34);
    ctx.lineTo(-34, -34);
    ctx.lineTo(-34, 34);
    ctx.lineTo(-14, 34);
    ctx.stroke();
    ctx.fillStyle = colour;
    const marks =
      f.severity === 'major' ? 3 : f.severity === 'minor' ? 2 : f.severity === 'blocking' ? 4 : 1;
    for (let m = 0; m < marks; m += 1) {
      roundRect(ctx, -6, -30 + m * 17, 26, 11, 4);
      ctx.fill();
    }
    ctx.restore();
    // And the flagged line itself takes the colour.
    ctx.fillStyle = colour;
    ctx.globalAlpha = 0.5 * pop;
    roundRect(
      ctx,
      pageX + 40,
      y + pitch * 0.3,
      pageW * (0.35 + 0.6 * scatter(Math.round(f.line * lines), 21)),
      pitch * 0.4,
      6,
    );
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // The counts, right: findings, and how many are blocking.
  const cx = w - 64 - 330;
  const cw = 330;
  const last = tally.raised[tally.raised.length - 1];
  const slide = last ? 1 - clamp01((since - last.at) / 0.5) : 0;
  const rolling = roll(Math.max(0, tally.findings - 1), tally.findings, 1 - slide);
  counter(ctx, 'FINDINGS', rolling.value, rolling.slide, cx, 300, cw, room.warm.amber, 60);
  counter(
    ctx,
    'BLOCKING',
    tally.blocking,
    0,
    cx,
    378,
    cw,
    tally.blocking > 0 ? BLOCK_RED : DIM,
    60,
  );
}

/** The Fabricator: files written, commits made. */
function drawFabricatorWork(
  ctx: Ctx,
  w: number,
  floor: number,
  since: number,
  tint: string,
  work?: HopWork,
) {
  const build = work?.kind === 'build' ? work : undefined;
  const fileTimes = build ? build.files : FABRICATOR_FILES;
  const commitTimes = build ? build.commits : FABRICATOR_COMMITS;
  const tally = fabricatorTally(since, fileTimes, commitTimes);
  const top = 300;
  const bottom = floor - 40;
  const x = 64;
  const colW = w - 128 - 400;
  const rows = 8;
  const pitch = (bottom - top) / rows;
  for (let i = 0; i < rows; i += 1) {
    const y = top + i * pitch + pitch * 0.25;
    const len = colW * (0.4 + 0.55 * scatter(i, 31));
    if (i < tally.files) {
      const pop = landing(clamp01((since - (fileTimes[i] ?? 0)) / 0.35), 0.2);
      ctx.fillStyle = tint;
      ctx.globalAlpha = 0.85;
      roundRect(ctx, x, y, len * pop, pitch * 0.5, 6);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (i === tally.files) {
      // The file being written: its bar growing, with a cursor at its head.
      ctx.fillStyle = tint;
      ctx.globalAlpha = 0.6;
      roundRect(ctx, x, y, len * easeOut(tally.writing), pitch * 0.5, 6);
      ctx.fill();
      ctx.globalAlpha = 1;
      const blink = Math.floor(since * 6) % 2 === 0;
      if (blink) {
        ctx.fillStyle = TEXT;
        ctx.fillRect(x + len * easeOut(tally.writing) + 8, y - 2, 10, pitch * 0.5 + 4);
      }
    } else {
      ctx.fillStyle = FAINT;
      roundRect(ctx, x, y, len, pitch * 0.5, 6);
      ctx.fill();
    }
  }
  // Commits: a marker per commit down the right of the column, popping.
  const markers = Math.min(tally.commits, 3);
  for (let c = 0; c < markers; c += 1) {
    const at = commitTimes[c] ?? 0;
    const pop = landing(clamp01((since - at) / 0.4), 0.3);
    const y = top + (bottom - top) * (0.2 + c * 0.3);
    ctx.save();
    ctx.translate(x + colW + 40, y);
    ctx.scale(pop, pop);
    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = tint;
    ctx.lineWidth = 6;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  const cx = w - 64 - 330;
  const cw = 330;
  counter(ctx, 'FILES', tally.files, 0, cx, 300, cw, tint, 60);
  counter(ctx, 'COMMITS', tally.commits, 0, cx, 378, cw, tint, 60);
}

// ------------------------------------------------------------ reported

/** The return: the verdict converging, with the agent's own counts beneath. */
function drawReported(
  ctx: Ctx,
  w: number,
  floor: number,
  since: number,
  role: Role,
  report: Report,
  outcome: Outcome,
  arrival: Arrival,
  work?: HopWork,
) {
  // The working content withdraws quickly toward the centre and fades.
  const gone = withdrawal(since);
  if (gone < 1) {
    ctx.save();
    ctx.globalAlpha = 1 - gone;
    ctx.translate(w / 2, floor / 2);
    ctx.scale(1 - gone * 0.4, 1 - gone * 0.4);
    ctx.translate(-w / 2, -floor / 2);
    drawWorking(ctx, w, floor, 100, role, outcome, room.warm.amber, work);
    ctx.restore();
  }
  const lines = countsFor(role, outcome, work);
  const findings =
    report === 'PASS_WITH_NON_BLOCKING_FINDINGS'
      ? work?.kind === 'review'
        ? work.findings.length
        : keeperTally(100).findings
      : 0;
  drawReturn(
    ctx,
    w,
    floor,
    since,
    arrival,
    report,
    {
      cx: w - 64 - 150,
      cy: 150 + (floor - 150) / 2 - 20,
      r: 118,
      wordX: 64,
      wordY: 130,
      wordWidth: w - 128 - 330,
      linesX: 64,
      linesY: floor - 40 - lines.length * 48,
      linesWidth: w - 128 - 330,
      pitch: 48,
    },
    lines,
    findings,
  );
}

/**
 * The agent's own counts at the verdict: the shape of what they produced.
 * **Exported because the panel reads it** — the screen is a summary of the
 * panel and the two must not be separately written texts
 * (`docs/process/PHASE_1_CONVERSATION_INTERFACE.md` §5b).
 */
export function countsFor(role: Role, outcome: Outcome, work?: HopWork): string[] {
  // The replay carries its own two lines, read off the record rather than
  // computed from a fixture; they are the same shape and the same place.
  if (work) return [...work.counts];
  if (role === 'prover') {
    const t = proverTally(100, outcome);
    const parts = [`PASSED ${t.passed}`, `FAILED ${t.failed}`];
    if (t.skipped > 0) parts.push(`SKIPPED ${t.skipped}`);
    return [parts.join(' · '), `${t.total} CHECKS`];
  }
  if (role === 'keeper') {
    const t = keeperTally(100);
    return [`FINDINGS ${t.findings} · BLOCKING ${t.blocking}`, 'NON-BLOCKING PERSIST'];
  }
  const t = fabricatorTally(100);
  return [`FILES ${t.files} · COMMITS ${t.commits}`, 'A CLAIM · NOT EVIDENCE'];
}
