import type { Role } from '../../room/cast.js';
import type { Outcome, Report, ScreenContent, StationState } from '../../room/demo.js';
import { CANDIDATE_ID } from '../candidate.js';
import { bandLines } from '../draw.js';
import {
  evidenceLines,
  FABRICATOR_COMMITS,
  FABRICATOR_FILES,
  fabricatorTally,
  keeperTally,
  proverChecks,
  proverTally,
} from '../tally.js';
import type { HopWork } from '../work.js';
import {
  bodyRect,
  type Ctx,
  edgeLight,
  fit,
  glassField,
  headerRail,
  heroBand,
  heroBlock,
  heroRect,
  honestyBand,
  joins,
  litDot,
  microRail,
  mono,
  quieten,
  reflections,
  scrim,
  spaced,
  sweep,
  wellRecess,
  wellRect,
} from './chrome.js';
import { accentOf, colourOf, primaryFor, verdictPrimary } from './content.js';
import { agentMark, statusMark, strokePath } from './marks.js';
import { archive, arrival, assembly, checkNames, orbits, scanning, star } from './motifs.js';
import { ARRIVE_SECONDS, clamp01, dim, metrics, STATUS, STRUCTURE, TEXT } from './system.js';

/**
 * **The four displays, drawn.**
 *
 * One function per display family, each of them the same five calls in the
 * same order — the field, the structure, the hero, the agent's picture, the
 * band — so that the shared system is enforced by the shape of the code
 * rather than by a reviewer's memory. The only thing that differs between
 * them is the picture in the well, the vocabulary in the rail, and which
 * accent the edge light takes.
 *
 * Every one is a pure function of its arguments. `t` is the display's own
 * clock in seconds; `since` is seconds since the state last changed, which
 * is what drives the arrival and the one sweep.
 */

export interface ConsoleScreenInput {
  role: Role;
  label: string;
  state: StationState;
  report: Report;
  outcome: Outcome;
  /** 0..1: how quiet the screen is held during the owner gate. */
  quiet: number;
  /** The drawn outline's corner radius, in canvas pixels. */
  corner: number;
  /** The run's own work, where the caller has it; the fixtures otherwise. */
  work?: HopWork | undefined;
  t: number;
  since: number;
}

export function drawConsoleScreen(canvas: HTMLCanvasElement, input: ConsoleScreenInput) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { role, label, state, report, outcome, quiet, corner, work, t, since } = input;
  const m = metrics(canvas.width, canvas.height, corner);
  const accent = accentOf(role);
  const primary = primaryFor(role, state, report);
  const colour = colourOf(primary.status);
  const arrive = clamp01(since / ARRIVE_SECONDS);

  glassField(ctx, m, primary.status);
  const well = wellRect(m);
  wellRecess(ctx, m, well);
  headerRail(
    ctx,
    m,
    label,
    accent.key,
    chipsFor(role, state, outcome),
    agentMark[role] ?? agentMark.virgil!,
  );
  heroBlock(
    ctx,
    m,
    heroRect(m),
    primary.word,
    primary.lead,
    colour,
    arrive,
    statusMark(primary.mark, t),
  );

  // **The rail is computed before the picture, and always drawn.** The
  // first version drew it inside each role's branch, so the secondary
  // detail vanished for the six seconds a hand-off takes to arrive — and
  // the brief's *"secondary technical detail for richness and
  // credibility"* is not something a display is allowed to lose while it
  // is busy.
  const working = state === 'WORKING' ? since : state === 'REPORTED' ? 99 : 0;
  let rail: { label: string; value: string; colour?: string | undefined }[];
  let picture: () => void;
  if (role === 'fabricator') {
    const build = work?.kind === 'build' ? work : null;
    const files = build?.files ?? FABRICATOR_FILES;
    const commits = build?.commits ?? FABRICATOR_COMMITS;
    const tally = fabricatorTally(working, files, commits);
    const progress =
      state === 'READY' || state === 'RECEIVING'
        ? 0
        : state === 'REPORTED'
          ? 1
          : clamp01(since / 6);
    rail = [
      { label: 'files changed', value: `${tally.files} / ${files.length}` },
      { label: 'commits', value: `${tally.commits} / ${commits.length}` },
      { label: 'branch', value: 'claude/…-v11' },
      { label: 'head', value: CANDIDATE_ID.slice(0, 7) },
    ];
    picture = () =>
      assembly(ctx, m, well, t, progress, tally.files, files.length, accent.key, accent.second);
  } else if (role === 'prover') {
    const schedule = work?.kind === 'checks' ? work.checks : proverChecks(outcome);
    const tally = proverTally(working, outcome, schedule);
    rail = [
      {
        label: 'passed',
        value: `${tally.passed}`,
        colour: tally.passed > 0 ? STATUS.green : undefined,
      },
      {
        label: 'failed',
        value: `${tally.failed}`,
        colour: tally.failed > 0 ? STATUS.red : undefined,
      },
      {
        label: 'skipped',
        value: `${tally.skipped}`,
        colour: tally.skipped > 0 ? STATUS.amber : undefined,
      },
      { label: 'of', value: `${tally.total} required` },
    ];
    picture = () =>
      scanning(
        ctx,
        m,
        well,
        t,
        state === 'WORKING' ? since : 0,
        tally.checks,
        failureLabel(outcome, tally.checks),
        outcome,
        accent.key,
        accent.second,
      );
  } else {
    const review = work?.kind === 'review' ? work : null;
    const tally = keeperTally(working, review?.findings, review?.readSeconds ?? 5.6);
    const sealing = state === 'REPORTED' ? clamp01(since / 1.6) : 0;
    rail = [
      { label: 'findings', value: `${tally.findings}` },
      {
        label: 'blocking',
        value: `${tally.blocking}`,
        colour: tally.blocking > 0 ? STATUS.red : undefined,
      },
      { label: 'provenance', value: 'SEALED · 5 LINKS' },
      { label: 'authority', value: 'TIER 2' },
    ];
    picture = () =>
      archive(
        ctx,
        m,
        well,
        t,
        state === 'READY' ? 0 : tally.read,
        tally.raised,
        sealing,
        report === 'BLOCKED',
        accent.key,
      );
  }
  // The hand-off arriving is the same event on all three consoles, so it is
  // one picture with the agent's own accent rather than three; the agent's
  // own picture returns the moment the work starts.
  if (state === 'RECEIVING') arrival(ctx, m, well, t, since, accent.key);
  else picture();
  microRail(ctx, m, rail);

  edgeLight(ctx, m, colour, t);
  joins(ctx, m);
  quieten(ctx, m, quiet);
  reflections(ctx, m, t);
  sweep(ctx, m, since, colour);
  honestyBand(ctx, m, bandLines());
}

function chipsFor(role: Role, state: StationState, outcome: Outcome): string[] {
  const hop = role === 'fabricator' ? '1' : role === 'prover' ? '2' : '3';
  return [`HOP ${hop}/3`, state, outcome === 'PASS' ? 'TIER 2' : 'TIER 2'];
}

/** The name of the check that failed or could not run, for the isolated node. */
function failureLabel(outcome: Outcome, checks: readonly { state: string }[]): string[] {
  const index = checks.findIndex((c) => c.state === 'failed' || c.state === 'skipped');
  if (index < 0) return [];
  const names = checkNames(
    new Array(checks.length).fill({ start: 0, seconds: 0, result: 'passed' }),
  );
  const which = names[index] ?? 'REQUIRED CHECK';
  return [outcome === 'BLOCKED' ? `${which} FAILED` : `${which} COULD NOT RUN`];
}

// ------------------------------------------------------------- the slabs

export type SlabKind = 'roles' | 'verdict' | 'candidate';

export interface SlabInput {
  kind: SlabKind;
  content: ScreenContent;
  outcome: Outcome;
  /** The demonstration's own clock, for the elapsed figures. */
  seconds: number;
  corner: number;
  t: number;
  since: number;
}

/**
 * **Virgil's three slabs.** Authored geometry, so this is the clearest
 * statement of the system: the same chrome, the same hero, the same rail,
 * and gold where the agents have their own accent, because gold is
 * Virgil's and ownership's.
 *
 *  - **`roles`** — who holds the hop: the dependency constellation, and the
 *    ledger beneath it. The owner's V9 decision put the ledger on this slab
 *    (*"a list of the agents used, and next to it the outcome, and that
 *    updates … but also remains on the screen so at a glance you can see
 *    where its up to"*) and that decision is kept; it is restyled, not
 *    replaced.
 *  - **`verdict`** — the latest verdict, over the orbital paths, with the
 *    deterministic evidence under it.
 *  - **`candidate`** — the candidate's state in the constitution's own
 *    vocabulary, its identity, and **what is waiting on the owner**, which
 *    is the one thing on any of these screens that asks for an action.
 */
export function drawSlab(canvas: HTMLCanvasElement, input: SlabInput) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { kind, content, outcome, seconds, corner, t, since } = input;
  const m = metrics(canvas.width, canvas.height, corner);
  const accent = accentOf('virgil');
  const gate = content.ownerGate;

  if (kind === 'verdict') {
    // **The showpiece.** The orrery runs the whole width of the body and
    // the verdict is set over it, on a scrim rather than in a box: the
    // brief's *"layered graphics with depth"* is a picture behind the type,
    // not a picture beside it, and this is the one display large enough on
    // a phone to be read that way.
    const primary = verdictPrimary(content.verdict, outcome);
    const colour = colourOf(primary.status);
    glassField(ctx, m, primary.status);
    const body = bodyRect(m);
    wellRecess(ctx, m, body);
    headerRail(
      ctx,
      m,
      'Verdict',
      accent.key,
      ['REVIEW POLICY', content.verdict === '—' ? 'IN FLIGHT' : 'RETURNED'],
      agentMark.virgil!,
    );
    const active =
      content.active === null ? -1 : ['Fabricator', 'Prover', 'Keeper'].indexOf(content.active);
    orbits(ctx, m, body, t, active, finishedHops(content, outcome), colour);
    scrim(ctx, body);
    // The overlay layout is not competing with a picture beneath it for
    // height — the orrery is *behind* the type — so the verdict gets three
    // quarters of the body and is the largest word in the set.
    heroBand(
      ctx,
      m,
      body,
      primary.word,
      primary.lead,
      colour,
      clamp01(since / ARRIVE_SECONDS),
      statusMark(primary.mark, t),
      0.76,
    );
    const lines = content.evidence ? [...content.evidence] : evidenceLines(outcome);
    microRail(
      ctx,
      m,
      lines
        .slice(0, 3)
        .map((line) => {
          const at = line.indexOf(' ');
          return { label: line.slice(0, at), value: line.slice(at + 1) };
        })
        .concat([{ label: 'candidate', value: content.candidateId ?? CANDIDATE_ID.slice(0, 7) }]),
    );
    edgeLight(ctx, m, colour, t);
    joins(ctx, m);
    quieten(ctx, m, gate ? 0.6 : 0);
    reflections(ctx, m, t);
    sweep(ctx, m, since, colour);
    honestyBand(ctx, m, bandLines());
    return;
  }

  if (kind === 'roles') {
    const status = content.active ? 'cyan' : 'gold';
    glassField(ctx, m, status);
    const body = bodyRect(m);
    wellRecess(ctx, m, body);
    headerRail(
      ctx,
      m,
      'The run',
      accent.key,
      ['3 HOPS', content.active ? content.active.toUpperCase() : 'AT REST'],
      agentMark.virgil!,
    );
    const holder = content.active ?? 'VIRGIL';
    const used = heroBand(
      ctx,
      m,
      body,
      holder.toUpperCase(),
      content.active
        ? 'HOLDS THE HOP UNDER AN AUTHORITY GRANT'
        : 'NO HOP IN FLIGHT. VIRGIL HOLDS THE RUN.',
      content.active ? STATUS.cyan : STATUS.gold,
      clamp01(since / ARRIVE_SECONDS),
      statusMark(content.active ? 'working' : 'standby', t),
      0.5,
    );
    const rest = { ...body, y: body.y + used, h: body.h - used };
    runLedger(ctx, m, rest, content, outcome, seconds, t);
    microRail(ctx, m, [
      {
        label: 'hops',
        value: `${hopNodes(content, outcome).filter((n) => n.state === 'done').length} / 3 returned`,
      },
      { label: 'candidate', value: content.candidateId ?? CANDIDATE_ID.slice(0, 7) },
      { label: 'authority', value: 'TIER 2 · TIER 1' },
      { label: 'elapsed', value: `${seconds.toFixed(0)}s` },
    ]);
    edgeLight(ctx, m, content.active ? STATUS.cyan : STATUS.gold, t);
    joins(ctx, m);
    quieten(ctx, m, gate ? 0.6 : 0);
    reflections(ctx, m, t);
    sweep(ctx, m, since, STATUS.cyan);
    honestyBand(ctx, m, bandLines());
    return;
  }

  // The candidate slab.
  const state = content.candidate ?? 'NO CANDIDATE';
  const status = gate
    ? 'amber'
    : content.candidate === 'BLOCKED'
      ? 'red'
      : content.candidate
        ? 'cyan'
        : 'gold';
  const colour = STATUS[status];
  glassField(ctx, m, status, gate ? 0.12 : 0.085);
  const body = bodyRect(m);
  wellRecess(ctx, m, body);
  headerRail(
    ctx,
    m,
    'Candidate',
    accent.key,
    ['STATE LANGUAGE', content.candidateId ?? CANDIDATE_ID.slice(0, 7)],
    agentMark.virgil!,
  );
  const used = heroBand(
    ctx,
    m,
    body,
    state.replace(/_/g, ' '),
    gate
      ? 'EVERY MERGE GATE PASSES. ELIGIBLE. NOT MERGED.'
      : 'ITS STATE IN THE CONSTITUTION’S OWN WORDS',
    colour,
    clamp01(since / ARRIVE_SECONDS),
    statusMark(
      gate
        ? 'waiting'
        : content.candidate === 'BLOCKED'
          ? 'blocked'
          : content.candidate
            ? 'working'
            : 'standby',
      t,
    ),
    0.44,
  );
  const rest = { ...body, y: body.y + used, h: body.h - used };
  dossier(ctx, m, { ...rest, h: rest.h * 0.5 }, content, t);
  ownerCard(ctx, m, { ...rest, y: rest.y + rest.h * 0.52, h: rest.h * 0.48 }, gate, t);
  microRail(ctx, m, [
    { label: 'identity', value: content.candidateId ?? CANDIDATE_ID.slice(0, 7) },
    { label: 'lineage', value: 'ONE IMMUTABLE COMMIT' },
    { label: 'merge', value: 'OWNER ONLY', colour: gate ? STATUS.amber : undefined },
    {
      label: 'decisions',
      value: gate ? '1 AWAITING' : '0 AWAITING',
      colour: gate ? STATUS.amber : undefined,
    },
  ]);
  edgeLight(ctx, m, colour, t);
  joins(ctx, m);
  reflections(ctx, m, t);
  sweep(ctx, m, since, colour);
  honestyBand(ctx, m, bandLines());
}

/** The three hops, as the dependency constellation's nodes. */
function hopNodes(content: ScreenContent, outcome: Outcome) {
  const order = ['Fabricator', 'Prover', 'Keeper'];
  const activeAt = content.active ? order.indexOf(content.active) : -1;
  return order.map((label, i) => {
    const state: 'done' | 'active' | 'ahead' =
      activeAt < 0
        ? content.verdict === '—'
          ? 'ahead'
          : 'done'
        : i < activeAt
          ? 'done'
          : i === activeAt
            ? 'active'
            : 'ahead';
    const colour =
      state === 'done'
        ? outcome === 'BLOCKED' && i === 1
          ? STATUS.red
          : STATUS.green
        : STATUS.cyan;
    return { label: label.toUpperCase().slice(0, 10), state, colour };
  });
}

/** Where the finished hops rest on the outer orbital track. */
function finishedHops(content: ScreenContent, outcome: Outcome) {
  return hopNodes(content, outcome)
    .map((node, i) => ({ node, i }))
    .filter(({ node }) => node.state === 'done')
    .map(({ node, i }) => ({ at: 2.4 + i * 1.9, colour: node.colour }));
}

/**
 * **The run ledger, and the dependency chain, as one element.**
 *
 * The owner's V9 requirement stands unchanged: *"the screen on the far
 * left … should really have a list of the agents used, and next to it the
 * outcome, and that updates (with fancy animations) as it happens, but also
 * remains on the screen so at a glance you can see where its up to."* So
 * this is still a ledger of three rows that stays on screen.
 *
 * What V11 changes is that the *"constellation-like dependency map"* the
 * brief asks for is drawn **through** it rather than beside it: each row's
 * node is joined to the next by a fine gold line, solid where the hop has
 * returned and dotted where it is still ahead, with a token travelling the
 * live edge. The first study frame drew the two separately and they
 * overlapped; they are one picture because they are one fact — which hop
 * holds the run, and in what order.
 */
function runLedger(
  ctx: Ctx,
  m: Metrics_,
  r: { x: number; y: number; w: number; h: number },
  content: ScreenContent,
  outcome: Outcome,
  seconds: number,
  t: number,
) {
  const nodes = hopNodes(content, outcome);
  const { u, hair } = m;
  const pitch = r.h / nodes.length;
  const nodeX = r.x + 2.4 * u;
  const nodeR = 1.15 * u;
  const at = (i: number) => r.y + pitch * (i + 0.5);
  // The chain, first, so the nodes sit over it.
  for (let i = 1; i < nodes.length; i += 1) {
    const ahead = (nodes[i] as { state: string }).state === 'ahead';
    ctx.save();
    ctx.strokeStyle = STRUCTURE.gold;
    ctx.globalAlpha = ahead ? 0.2 : 0.6;
    ctx.lineWidth = hair;
    if (ahead) ctx.setLineDash([hair * 3, hair * 4]);
    ctx.beginPath();
    ctx.moveTo(nodeX, at(i - 1) + nodeR);
    ctx.lineTo(nodeX, at(i) - nodeR);
    ctx.stroke();
    ctx.restore();
    if ((nodes[i] as { state: string }).state === 'active') {
      const k = (t / 6) % 1;
      litDot(
        ctx,
        nodeX,
        at(i - 1) + nodeR + (pitch - 2 * nodeR) * k,
        hair * 1.2,
        STATUS.cyan,
        Math.sin(Math.PI * k),
      );
    }
  }
  ctx.textBaseline = 'middle';
  nodes.forEach((node, i) => {
    const y = at(i);
    // The node.
    ctx.save();
    ctx.beginPath();
    ctx.arc(nodeX, y, nodeR, 0, Math.PI * 2);
    ctx.fillStyle = node.state === 'ahead' ? dim(0.05) : `${node.colour}26`;
    ctx.fill();
    ctx.strokeStyle = node.state === 'ahead' ? dim(0.26) : node.colour;
    ctx.lineWidth = hair * 1.4;
    ctx.stroke();
    ctx.restore();
    if (node.state === 'done')
      strokePath(
        ctx,
        [
          [nodeX - nodeR * 0.44, y + nodeR * 0.02],
          [nodeX - nodeR * 0.1, y + nodeR * 0.38],
          [nodeX + nodeR * 0.5, y - nodeR * 0.38],
        ],
        node.colour,
        hair * 1.4,
      );
    if (node.state === 'active') litDot(ctx, nodeX, y, hair * 1.1, node.colour, 1);
    // The role's name.
    const labelX = nodeX + nodeR + 1.4 * u;
    spaced(ctx, '0.08em');
    fit(ctx, mono, m.type.data, node.label, r.w * 0.3);
    ctx.fillStyle = node.state === 'ahead' ? dim(0.32) : dim(0.86);
    ctx.textAlign = 'left';
    ctx.fillText(node.label, labelX, y);
    spaced(ctx, '0em');
    // The elapsed bar, and its own end mark.
    const barX = r.x + r.w * 0.46;
    const barW = r.w * 0.4;
    ctx.save();
    ctx.fillStyle = dim(0.07);
    ctx.fillRect(barX, y - 0.4 * u, barW, 0.8 * u);
    const fill =
      node.state === 'done' ? 1 : node.state === 'active' ? clamp01((seconds % 6) / 6) : 0;
    if (fill > 0) {
      ctx.fillStyle = node.colour;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(barX, y - 0.4 * u, barW * fill, 0.8 * u);
    }
    ctx.restore();
    if (node.state !== 'ahead') {
      ctx.save();
      ctx.fillStyle = node.colour;
      ctx.beginPath();
      ctx.arc(r.x + r.w - 1.6 * u, y, 0.68 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
}

/**
 * **The candidate's dossier**: its identity set large in the data face, the
 * provenance chain that stands behind it as four evidence stars joined by
 * fine gold lines, and the one state transition it has just made. It is
 * the *"secondary technical detail for richness and credibility"* the brief
 * asks for, and every line of it is answerable — the identity comes from
 * `screens/candidate.ts`, which is deliberately data-shaped and is not a
 * commit of this repository, and the band says the rest.
 */
function dossier(
  ctx: Ctx,
  m: Metrics_,
  r: { x: number; y: number; w: number; h: number },
  content: ScreenContent,
  t: number,
) {
  const { u, hair } = m;
  const id = content.candidateId ?? CANDIDATE_ID;
  const x = r.x + 1.8 * u;
  const top = r.y + 0.8 * u;
  const half = r.w * 0.46;
  spaced(ctx, '0.1em');
  ctx.font = mono(m.type.micro);
  ctx.fillStyle = dim(0.42);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText('CANDIDATE IDENTITY', x, top);
  ctx.textAlign = 'right';
  ctx.fillText('PROVENANCE · 4 LINKS', r.x + r.w - 1.8 * u, top);
  ctx.textAlign = 'left';
  spaced(ctx, '0em');
  fit(ctx, mono, m.type.title, id, half - 2 * u);
  ctx.fillStyle = dim(0.9);
  ctx.fillText(id, x, top + m.type.micro * 1.8);
  // The provenance chain, in the right half of the same row: four
  // evidence stars joined by fine gold lines. **Beside the identity, not
  // under it** — the study frame had it drawn through the identity's own
  // glyphs when the dossier's region was short.
  const chainY = top + m.type.micro * 1.8 + m.type.title * 0.55;
  const links = 4;
  const x0 = r.x + r.w - half;
  const chain: [number, number][] = [];
  for (let i = 0; i < links; i += 1) {
    chain.push([
      x0 + (i / (links - 1)) * (half - 2.4 * u),
      chainY + Math.sin(i * 1.7 + t * 0.08) * 0.7 * u,
    ]);
  }
  strokePath(ctx, chain, STRUCTURE.gold, hair, 1);
  for (const point of chain) star(ctx, point[0], point[1], 0.8 * u, STRUCTURE.goldBright);
}

/**
 * **What is waiting on the owner.** During the owner gate this is the one
 * lit thing on the set (the owner's V8 §0.10.10 direction), and it says
 * plainly what the decision is and that nothing has been merged.
 */
function ownerCard(
  ctx: Ctx,
  m: Metrics_,
  r: { x: number; y: number; w: number; h: number },
  gate: boolean,
  t: number,
) {
  const { u, hair } = m;
  // The card fills the region it is given, rather than half of it: the
  // study frame showed its two lines printed over each other whenever the
  // hero above it took a line more than the shortest state needs.
  const cardH = Math.max(3.4 * u, r.h - 1.4 * u);
  const y = r.y + (r.h - cardH) / 2;
  ctx.save();
  ctx.beginPath();
  const rr = 1.4 * u;
  const x = r.x + 1.6 * u;
  const w = r.w - 3.2 * u;
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + cardH, rr);
  ctx.arcTo(x + w, y + cardH, x, y + cardH, rr);
  ctx.arcTo(x, y + cardH, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.fillStyle = gate ? `${STATUS.amber}1c` : 'rgba(205,218,240,0.03)';
  ctx.fill();
  ctx.strokeStyle = gate ? STATUS.amber : dim(0.18);
  ctx.globalAlpha = gate ? 0.8 : 1;
  ctx.lineWidth = hair * (gate ? 1.6 : 1);
  ctx.stroke();
  ctx.restore();
  const pulse = gate ? 0.55 + 0.45 * (0.5 + 0.5 * Math.sin((t / 3.2) * Math.PI * 2)) : 0.4;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = gate ? STATUS.amber : dim(0.4);
  ctx.beginPath();
  ctx.arc(x + 2.4 * u, y + cardH / 2, 0.85 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const textX = x + 4.2 * u;
  const textW = w - 5.6 * u;
  const label = gate ? 'AWAITING OWNER DECISION' : 'NOTHING AWAITS THE OWNER';
  const note = gate ? 'MERGE IS OWNER-ONLY IN EVERY PHASE' : 'THE RUN PROCEEDS WITHOUT A GATE';
  // Two lines where the card is tall enough for two, one where it is not.
  const two = cardH >= m.type.data * 1.2 + m.type.micro * 1.5;
  ctx.fillStyle = gate ? STATUS.amber : dim(0.5);
  fit(ctx, mono, m.type.data, label, textW);
  ctx.fillText(label, textX, two ? y + cardH * 0.36 : y + cardH / 2);
  if (two) {
    ctx.fillStyle = dim(0.5);
    fit(ctx, mono, m.type.micro, note, textW);
    ctx.fillText(note, textX, y + cardH * 0.72);
  }
  ctx.textBaseline = 'top';
  void TEXT;
}

type Metrics_ = ReturnType<typeof metrics>;
