import type { CandidateState } from '@virgil/domain';
import type { Role } from '../../room/cast.js';
import {
  BEATS,
  type Outcome,
  type Report,
  type ScreenContent,
  type StationState,
} from '../../room/demo.js';
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
  backdrop,
  bodyRect,
  type Ctx,
  edgeLight,
  fit,
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
  /**
   * Whether the honesty band is drawn. `mode === 'replay'` and nothing
   * else: the scripted mode's labelling lives on the persistent
   * `Demo data` badge (`system.ts`, `BAND_PIXELS_AT_1024`), and the
   * replay's three lines make the opposite claim about content that is
   * real.
   */
  showBand: boolean;
  /**
   * **The candidate this station is working on, and the branch it is on.**
   *
   * The Keeper's **KS4-04**: the Fabricator's rail read
   * `{ label: 'branch', value: 'claude/…-v11' }` and
   * `{ label: 'head', value: CANDIDATE_ID.slice(0, 7) }` — two constants
   * with no mode branch, where every other surface reads
   * `content.candidateId ?? CANDIDATE_ID`. So in the replay, whose slabs
   * carry the real candidate `956be26064` and the band
   * `RECORDED RUN · REPLAYED`, this console printed `HEAD 9ABCDEF` and the
   * wrong branch: a fabricated commit inside a frame that says it is
   * showing recorded history.
   *
   * Unset is the scripted demonstration, and the fallbacks are its own
   * data-shaped identity from `screens/candidate.ts`, which is deliberately
   * not a commit of this repository.
   */
  candidateId?: string | undefined;
  branch?: string | undefined;
}

export function drawConsoleScreen(canvas: HTMLCanvasElement, input: ConsoleScreenInput) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const {
    role,
    label,
    state,
    report,
    outcome,
    quiet,
    corner,
    work,
    t,
    since,
    showBand,
    candidateId,
    branch,
  } = input;
  const m = metrics(canvas.width, canvas.height, corner, showBand);
  const accent = accentOf(role);
  const primary = primaryFor(role, state, report);
  const colour = colourOf(primary.status);
  const arrive = clamp01(since / ARRIVE_SECONDS);

  const well = wellRect(m);
  backdrop(ctx, m, primary.status, well);
  headerRail(
    ctx,
    m,
    label,
    accent.key,
    chipsFor(role, state),
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
      { label: 'branch', value: branch ?? 'claude/…-v11' },
      { label: 'head', value: (candidateId ?? CANDIDATE_ID).slice(0, 7) },
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
        failureLabel(tally.checks),
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
  if (m.band > 0) honestyBand(ctx, m, bandLines());
}

/**
 * The header's chips. **The scripted outcome is not one of them.** The
 * first version passed it in and then chose between two identical strings,
 * which was harmless but is the exact shape of a leak, and the audit that
 * removed `HEADING FOR <outcome>` from the verdict slab took this
 * parameter with it.
 */
function chipsFor(role: Role, state: StationState): string[] {
  const hop = role === 'fabricator' ? '1' : role === 'prover' ? '2' : '3';
  return [`HOP ${hop}/3`, state, 'TIER 2'];
}

/**
 * The name of the check that failed or could not run, for the isolated
 * node. **Worded from the check's own resolved state, not from the loop's
 * scripted outcome**: a check that has not resolved contributes nothing
 * here, so this string cannot exist before the thing it describes.
 */
function failureLabel(checks: readonly { state: string }[]): string[] {
  const index = checks.findIndex((c) => c.state === 'failed' || c.state === 'skipped');
  if (index < 0) return [];
  const names = checkNames(
    new Array(checks.length).fill({ start: 0, seconds: 0, result: 'passed' }),
  );
  const which = names[index] ?? 'REQUIRED CHECK';
  return [checks[index]?.state === 'failed' ? `${which} FAILED` : `${which} COULD NOT RUN`];
}

// ------------------------------------------------------------- the slabs

export type SlabKind = 'roles' | 'verdict' | 'candidate';

/** What share of the body the run ledger takes on the roles slab. */
export const LEDGER_SHARE = 0.48;

/** Where the run ledger's three rows are, from the canvas alone. */
export function ledgerRect(m: Metrics_): { x: number; y: number; w: number; h: number } {
  const body = bodyRect(m);
  return { ...body, y: body.y + body.h * (1 - LEDGER_SHARE), h: body.h * LEDGER_SHARE };
}

/**
 * Which of the run ledger's three rows a texture coordinate falls in, or
 * `null` if it is not in the ledger at all. Pure, and computed from the
 * same rectangle the drawing uses, so a tap and a picture cannot disagree
 * about which hop a row is (V9's requirement, kept).
 */
export function ledgerRowAtUv(
  uvY: number,
  canvasWidth: number,
  canvasHeight: number,
  showBand = false,
): number | null {
  const m = metrics(canvasWidth, canvasHeight, 0, showBand);
  const r = ledgerRect(m);
  // The texture's v runs up; the canvas's y runs down.
  const y = (1 - uvY) * canvasHeight;
  if (y < r.y || y > r.y + r.h) return null;
  const row = Math.floor(((y - r.y) / r.h) * 3);
  return Math.max(0, Math.min(2, row));
}

export interface SlabInput {
  kind: SlabKind;
  content: ScreenContent;
  outcome: Outcome;
  /** The demonstration's own clock, for the elapsed figures. */
  seconds: number;
  corner: number;
  t: number;
  since: number;
  /** Whether the honesty band is drawn: `mode === 'replay'` and nothing else. */
  showBand: boolean;
  /**
   * **Whether this is the replay** — which is a different question from
   * whether the band is painted, and the Keeper's **KS4-07** is that the
   * ledger was asking the second one to answer the first.
   *
   * `showBand` decides whether three lines of honesty text are drawn.
   * `replay` decides whether the repository has a per-hop duration for
   * this slab to draw a length from, and whether the run's elapsed figure
   * is a recorded one. Both happen to be `mode === 'replay'` today; they
   * are not the same fact, and the day one of them moves the other must
   * not follow it silently.
   */
  replay: boolean;
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
  const { kind, content, outcome, seconds, corner, t, since, showBand, replay } = input;
  const m = metrics(canvas.width, canvas.height, corner, showBand);
  const accent = accentOf('virgil');
  const gate = content.ownerGate;

  if (kind === 'verdict') {
    // **The showpiece.** The orrery runs the whole width of the body and
    // the verdict is set over it, on a scrim rather than in a box: the
    // brief's *"layered graphics with depth"* is a picture behind the type,
    // not a picture beside it, and this is the one display large enough on
    // a phone to be read that way.
    const primary = verdictPrimary(
      content.verdict,
      content.active,
      content.candidate === 'SAFE_TO_MERGE',
    );
    const colour = colourOf(primary.status);
    const body = bodyRect(m);
    backdrop(ctx, m, primary.status, body);
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
    orbits(ctx, m, body, t, active, finishedHops(content), colour);
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
    // **The evidence appears with the verdict, never before it.** The
    // first version drew `evidenceLines(outcome)` unconditionally, so on a
    // loop scripted to end BLOCKED the rail read `301 PASSED · 1 FAILED`
    // while the Prover was still working — the scripted outcome leaking
    // into the rail exactly as it had leaked into the lead. Until a verdict
    // has returned the rail says what is true instead: who holds the hop,
    // which candidate, under what authority, and that no evidence has come
    // back yet.
    const returned = content.verdict !== '—';
    microRail(
      ctx,
      m,
      returned
        ? (content.evidence ? [...content.evidence] : evidenceLines(outcome))
            .slice(0, 3)
            .map((line) => {
              const at = line.indexOf(' ');
              return { label: line.slice(0, at), value: line.slice(at + 1) };
            })
            .concat([
              { label: 'candidate', value: content.candidateId ?? CANDIDATE_ID.slice(0, 7) },
            ])
        : [
            { label: 'holder', value: content.active ? content.active.toUpperCase() : 'VIRGIL' },
            { label: 'candidate', value: content.candidateId ?? CANDIDATE_ID.slice(0, 7) },
            { label: 'authority', value: 'TIER 2' },
            { label: 'evidence', value: 'NONE RETURNED YET' },
          ],
    );
    edgeLight(ctx, m, colour, t);
    joins(ctx, m);
    quieten(ctx, m, gate ? 0.6 : 0);
    reflections(ctx, m, t);
    sweep(ctx, m, since, colour);
    if (m.band > 0) honestyBand(ctx, m, bandLines());
    return;
  }

  if (kind === 'roles') {
    const status = content.active ? 'cyan' : 'gold';
    const body = bodyRect(m);
    backdrop(ctx, m, status, body);
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
        : 'NO HOP IN FLIGHT. VIRGIL HOLDS IT.',
      content.active ? STATUS.cyan : STATUS.gold,
      clamp01(since / ARRIVE_SECONDS),
      statusMark(content.active ? 'working' : 'standby', t),
      1 - LEDGER_SHARE - 0.06,
    );
    // **The ledger's region is a fixed share of the body, not whatever the
    // hero left over.** The owner's V9 decision is that a tap on a row
    // opens that hop, and `ledgerRowAtUv` has to answer which row a
    // texture coordinate is in without measuring any text — so the split
    // is a constant and the hero is bounded to fit above it.
    void used;
    runLedger(ctx, m, ledgerRect(m), content, seconds, t, replay);
    microRail(ctx, m, [
      // **One derivation, printed and drawn.** The rail used to count the
      // rows' own `done` states, which is the same answer by luck rather
      // than by construction; both now come from `hopsReturned`.
      { label: 'hops', value: `${hopsReturned(content)} / ${HOP_ORDER.length} returned` },
      { label: 'candidate', value: content.candidateId ?? CANDIDATE_ID.slice(0, 7) },
      { label: 'authority', value: 'TIER 2 · TIER 1' },
      /**
       * **The Keeper's KS4-02.** This column printed `seconds` in both
       * modes. In the scripted demonstration `seconds` is the script's own
       * clock and the hops' windows are measured on it, so `ELAPSED 31S` is
       * true of the thing being demonstrated. In the **replay** `seconds` is
       * playback time — `useReplay.ts` says so in its own header: *"it never
       * appears as a duration of the recorded work"* — and it appeared as
       * one, climbing from `0s` beside a slab labelled `RECORDED RUN ·
       * REPLAYED` and a real candidate. The run it names took an hour and a
       * half; this number was the seconds since the page loaded.
       *
       * K11-02 removed the **bar** from the replay for exactly this reason
       * and left the number beside it, which makes the same kind of claim
       * about the whole run. So in the replay the column now reads the
       * record's own `startedAt` to `completedAt`, and where the caller
       * hands over no recorded figure it says `NOT RECORDED` rather than
       * a number.
       */
      replay
        ? { label: 'recorded', value: content.recordedElapsed ?? 'NOT RECORDED' }
        : { label: 'elapsed', value: `${seconds.toFixed(0)}s` },
    ]);
    edgeLight(ctx, m, content.active ? STATUS.cyan : STATUS.gold, t);
    joins(ctx, m);
    quieten(ctx, m, gate ? 0.6 : 0);
    reflections(ctx, m, t);
    sweep(ctx, m, since, STATUS.cyan);
    if (m.band > 0) honestyBand(ctx, m, bandLines());
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
  const body = bodyRect(m);
  backdrop(ctx, m, status, body, gate ? 0.12 : 0.085);
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
    gate ? 'EVERY GATE PASSES. ELIGIBLE, NOT MERGED.' : 'ITS STATE IN THE CONSTITUTION’S WORDS',
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
  if (m.band > 0) honestyBand(ctx, m, bandLines());
}

/**
 * The three hops, as the ledger's rows and the dependency chain's nodes.
 *
 * **Derived from who holds or has returned the candidate — never from
 * whether a verdict exists.** Three faults have been fixed here, and the
 * third one is the reason this comment is now this long.
 *
 * A returned hop's colour used to be chosen by `outcome === 'BLOCKED' && i
 * === 1`, which is the scripted ending reaching a display; and when a loop
 * ended in a refusal all three hops were marked returned and green, though
 * the Keeper never ran at all on that loop.
 *
 * The third fault, the Keeper's **KS4-01**, survived both of those repairs
 * and survived a review that named this function as their fix. It was one
 * expression:
 *
 * ```js
 * const lastRan = content.verdict === '—' ? -1 : refused ? 1 : 2;
 * ```
 *
 * *"the Prover on a refusal or a gap, the Keeper on a pass"* — which is
 * only true **after** the Keeper has reported. In the passing loop the
 * Prover writes `verdict: 'PASS'` at 29 s and the Keeper does not receive
 * the hop until 32 s, so for three seconds `lastRan` was 2 and the
 * Keeper's row drew a filled dot, a full green bar and `3 / 3 returned`
 * while the candidate slab beside it read `READY FOR REVIEW`, the verdict
 * slab read `VERIFICATION PASSED. NOT YET REVIEWED.` and the Keeper's own
 * station was dark. `constitution/STATE_LANGUAGE.md`, under *Distinctions
 * that must never collapse*: **`READY_FOR_REVIEW` is not reviewed.** And
 * because the K11-02 repair had made the bar a real measurement, the row
 * was by then drawing twelve seconds of elapsed work that had not
 * happened: the repair made the claim quantitative without making it true.
 *
 * A verdict existing is not evidence that any particular hop returned it.
 * So the question the ledger asks is now the only one that answers itself:
 * **who holds the candidate, and how far can its own state prove the run
 * has got?** `hopsReturned` answers it, `RETURNED_AT_STATE` is the whole
 * of the second half, and `test/screen-content-v11.test.ts` walks every
 * half second of all three loops and every beat of the replay against the
 * demonstration's own `BEATS` rather than against this code.
 */
/**
 * **Each hop's own window in the scripted demonstration**, quoted from
 * `world/room/demo.ts`'s `BEATS` rather than restated, so a change to the
 * script moves the bars with it: the Fabricator receives at 2 and reports at
 * 14, the Prover receives at 17 and reports at 29, the Keeper receives at 32
 * and reports at 44. In the order `hopNodes` lists them.
 */
const SCRIPTED_HOP_WINDOW: readonly (readonly [number, number])[] = [
  [BEATS.handoffToFabricator, BEATS.fabricatorReported],
  [BEATS.handoffToProver, BEATS.proverReported],
  [BEATS.handoffToKeeper, BEATS.keeperReported],
];

/** The longest of them, so the three lengths are comparable — `ledger.ts`'s own rule. */
export const LONGEST_SCRIPTED_HOP = SCRIPTED_HOP_WINDOW.reduce(
  (worst, [from, to]) => Math.max(worst, to - from),
  0,
);

/**
 * How much of a ledger row's track is filled, as a fraction of the longest hop
 * in the script. Pure, and exported, because the Keeper's K11-02 found the old
 * expression drawing a length that measured nothing and recorded that **no test
 * asserted the bar's semantics** — `test/screen-content-v11.test.ts` asserts
 * them here rather than trying to read a `fillRect` out of a canvas.
 *
 * `replay` returns 0 for every row: the replay hands this slab no per-hop
 * duration, and a bar is a length and a length is a claim.
 */
export function ledgerBarFill(
  state: 'done' | 'active' | 'ahead',
  index: number,
  seconds: number,
  replay: boolean,
): number {
  const window_ = SCRIPTED_HOP_WINDOW[index];
  if (replay || !window_) return 0;
  if (state === 'done') return clamp01((window_[1] - window_[0]) / LONGEST_SCRIPTED_HOP);
  if (state === 'active') return clamp01((seconds - window_[0]) / LONGEST_SCRIPTED_HOP);
  return 0;
}

/** The three hops, in the order the constitution runs them. */
export const HOP_ORDER = ['Fabricator', 'Prover', 'Keeper'] as const;

/**
 * **How many hops each candidate state can prove have returned.**
 *
 * One row per member of `packages/domain`'s `CandidateState`, so a state
 * added there fails this file's type check rather than silently taking a
 * default. Every number is the **floor** — the most a display may claim
 * when the state alone is all it knows. Where a state could have been
 * reached by more than one route the smaller route wins, because a ledger
 * that under-states what returned is merely incomplete and one that
 * over-states it is the fault this table exists to prevent.
 *
 *  - `BLOCKED` is established by `check_failed` on a required check **or**
 *    by a review verdict of BLOCKED (`STATE_LANGUAGE.md`). The first needs
 *    only the Prover, so the floor is 2 and the Keeper is not credited.
 *  - `INSUFFICIENT_EVIDENCE` likewise: a gate finding required evidence
 *    absent is verification having concluded, not a review.
 *  - `REPAIR_AUTHORISED` follows a refusal, and the cheapest refusal that
 *    reaches it is the Prover's.
 *  - `READY_FOR_REVIEW` is **2 and never 3**. It is the state this whole
 *    table was written for: it is not reviewed.
 *  - `RE_REVIEW_REQUIRED`, `QUARANTINED` and `OWNER_DECISION_REQUIRED` say
 *    nothing about how far this round of hops has got, so they credit
 *    nothing. In the replay a role holds the candidate at each of them, so
 *    the count comes from the holder instead and this row is the floor
 *    under a case that does not arise.
 */
const RETURNED_AT_STATE: Readonly<Record<CandidateState, 0 | 1 | 2 | 3>> = {
  BUILDING: 0,
  BUILDER_REPORTED_COMPLETE: 1,
  VERIFICATION_INCOMPLETE: 1,
  READY_FOR_REVIEW: 2,
  REVIEW_IN_PROGRESS: 2,
  BLOCKED: 2,
  INSUFFICIENT_EVIDENCE: 2,
  REPAIR_AUTHORISED: 2,
  PASS_WITH_NON_BLOCKING_FINDINGS: 3,
  SAFE_TO_MERGE: 3,
  MERGED: 3,
  DEPLOYED: 3,
  RE_REVIEW_REQUIRED: 0,
  QUARANTINED: 0,
  OWNER_DECISION_REQUIRED: 0,
};

/**
 * **How many of the three hops have actually returned the candidate.**
 *
 * Pure and exported, because it is the number the run slab's micro-rail
 * prints as `N / 3 returned` and the number its rows are drawn from, and
 * those two may never be derived separately again.
 *
 * Two rules, in this order:
 *
 *  1. **Whoever holds the candidate has not returned it**, and every hop
 *     before the holder must have returned it for the run to have reached
 *     them. So the holder's index *is* the count.
 *  2. With nobody holding it, the candidate's own state in the
 *     constitution's vocabulary is the only evidence there is, and
 *     `RETURNED_AT_STATE` reads it.
 *
 * Nothing here consults `content.verdict`. A verdict on the glass says
 * that *something* returned one; it does not say **who**, and reading it
 * as though it did is what KS4-01 was.
 */
export function hopsReturned(content: ScreenContent): number {
  const holder = content.active ? (HOP_ORDER as readonly string[]).indexOf(content.active) : -1;
  if (holder >= 0) return holder;
  return content.candidate === null ? 0 : RETURNED_AT_STATE[content.candidate];
}

export function hopNodes(content: ScreenContent) {
  const holder = content.active ? (HOP_ORDER as readonly string[]).indexOf(content.active) : -1;
  const returned = hopsReturned(content);
  // **The refusal is read off the candidate's own state, not off the
  // verdict slab.** In the replay the verdict stays `BLOCKED` through the
  // owner's repair authorisation and into the second build, and colouring
  // a row from it there would attribute one hop's refusal to another.
  const refused = content.candidate === 'BLOCKED' || content.candidate === 'INSUFFICIENT_EVIDENCE';
  return HOP_ORDER.map((label, i) => {
    const state: 'done' | 'active' | 'ahead' =
      holder >= 0
        ? i < holder
          ? 'done'
          : i === holder
            ? 'active'
            : 'ahead'
        : i < returned
          ? 'done'
          : 'ahead';
    const colour =
      state === 'done' && refused && i === returned - 1
        ? content.candidate === 'BLOCKED'
          ? STATUS.red
          : STATUS.amber
        : state === 'done'
          ? STATUS.green
          : STATUS.cyan;
    return { label: label.toUpperCase().slice(0, 10), state, colour };
  });
}

/** Where the finished hops rest on the outer orbital track. */
function finishedHops(content: ScreenContent) {
  return hopNodes(content)
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
  seconds: number,
  t: number,
  /**
   * True in the replay, where this slab is handed no per-hop duration.
   * **Its own parameter, not the band's** (KS4-07): whether a length may be
   * drawn is not the same question as whether an honesty band is painted,
   * and the two were one boolean.
   */
  replay: boolean,
) {
  const nodes = hopNodes(content);
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
    /**
     * **The elapsed bar, and the repair the Keeper's K11-02 asked for at its
     * cause.**
     *
     * It used to be `done ? 1 : active ? clamp01((seconds % 6) / 6) : 0` —
     * a six-second sawtooth of the **global** clock for whichever hop was
     * running, identical for every hop and resetting every six seconds, and a
     * full bar for every returned hop whatever its length. It read as *how far
     * through this hop is* and it measured nothing. That is this project's own
     * named failure class: *a duration or bar drawn where no duration was
     * recorded*, and `screens/ledger.ts` states the rule it broke —
     * *"a bar is a length and a length is a claim"*, with `maxElapsed` there
     * precisely so lengths are comparable between rows.
     *
     * So a length is now drawn only where a duration exists:
     *
     *  - in the **scripted demonstration** each hop's window is a constant of
     *    the script (`demo.ts`'s own `BEATS`), so the bar is that hop's real
     *    elapsed seconds against the longest hop in the script — a returned
     *    hop keeps its own length rather than being rounded up to full, and a
     *    running one grows from its own start, not from a global sawtooth;
     *  - in the **replay** this slab is handed no per-hop duration at all, so
     *    **no bar is drawn**, exactly as `ledger.ts` requires. The track stays
     *    so the row keeps its shape; what is removed is the claim.
     */
    const barX = r.x + r.w * 0.46;
    const barW = r.w * 0.4;
    ctx.save();
    ctx.fillStyle = dim(0.07);
    ctx.fillRect(barX, y - 0.4 * u, barW, 0.8 * u);
    const fill = ledgerBarFill(node.state, i, seconds, replay);
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
