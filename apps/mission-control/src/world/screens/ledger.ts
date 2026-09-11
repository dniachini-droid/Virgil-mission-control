import { CAST, ROLES, type Role } from '../room/cast.js';
import { BEATS, type Outcome, type Report } from '../room/demo.js';

/**
 * **The ledger on Virgil's far-left slab.**
 *
 * The owner's direction of 8 September, in his words: *"if im not looking
 * at the screen the moment an agent is giiven a job, i'll miss the
 * 'receiiving' animaton, or when it gets back to virgil, the 'pass'
 * animation. So Im thining.... the screen on the far left (virgils far
 * left screen) should really have a list of the agents used, and next to
 * it the outcome, and that updates (with fancy animations) as it happens,
 * but also remains on the screen so at a glance you can see where its up
 * to."*
 *
 * The defect he found is structural: **the information was the
 * animation.** Every state in the slice was announced by a transient beat
 * and nothing persisted to be read by someone who looked away. The
 * interface had an alarm and no status board.
 *
 * What this is, and each point is a constraint on the code:
 *
 *  - **it is a ledger, not a status light: rows are appended and never
 *    rewritten**, and a row stays when the next agent starts. That is the
 *    shape of `packages/domain` — the event log is the truth and the
 *    current state is derived from it — so the display mirrors the model
 *    instead of inventing a parallel one. The slab's old `ROLES`
 *    indicator was a light that moved and is strictly dominated by this;
 *    it is merged in, not placed beside it;
 *  - **elapsed time is a column.** Who came back tells the story; how
 *    long ago tells you whether the board is live or stale. Without it a
 *    finished board reads as a working one, which is the same class of
 *    untruth as the "awaiting review" during a build the owner caught in
 *    V7;
 *  - **in flight reads as unresolved, not blank** — an open mark,
 *    distinguishable from "no answer is coming";
 *  - **it must survive the wide view**, which is what "at a glance"
 *    means. `screen-fonts` measured screen text readable to about 96 px
 *    and collapsed by 64 px, so a row reads as **shape and colour at
 *    distance and as text up close**: a role glyph, the verdict's own
 *    shape from `verdicts.ts`, its colour, and an elapsed bar whose
 *    length is the time. Now that the panel exists the row does not have
 *    to carry everything — clicking a row opens that hop in the panel;
 *  - **it clears per candidate**, the owner's decision of 8 September,
 *    with the candidate's identity shown so a new run reads as one.
 *    Accumulating all three loops was the alternative and is not what he
 *    asked for.
 *
 * This module is the derivation and nothing else: pure, no canvas, so
 * `test/ledger.test.ts` can hold the append-only property over the whole
 * demonstration rather than over a screenshot.
 */

export interface LedgerRow {
  role: Role;
  /** One character, for the glyph that survives the wide view. */
  glyph: string;
  label: string;
  /** When the hop began, in seconds from the loop's start. */
  startedAt: number;
  /** When it reported, or null while it is still in flight. */
  endedAt: number | null;
  /** What it returned, or null while unresolved. */
  report: Report | null;
  /**
   * **Recorded time, when the row has any** (the replay).
   *
   * Present only in the replay, where `startedAt` and `endedAt` are beat
   * indices on the playback clock and would be a lie if drawn as a
   * duration. `seconds` is what the repository records for this hop, or
   * `null` when it records nothing; `text` is what the column prints, and
   * for a hop with no recorded duration that is the words `NOT RECORDED`
   * and **no bar**, because a bar is a length and a length is a claim.
   *
   * Absent in the scripted demonstration, whose elapsed column is the
   * demonstration's own clock and says so.
   */
  recorded?: { seconds: number | null; text: string };
}

/** The hops of one candidate, and when each begins and reports. */
interface Hop {
  role: Role;
  startedAt: number;
  endedAt: number;
  /** Which outcomes reach this hop at all. */
  reachedBy: readonly Outcome[];
}

const ALL_OUTCOMES: readonly Outcome[] = ['PASS', 'BLOCKED', 'INSUFFICIENT_EVIDENCE'];

/**
 * The three hops, read off `demo.ts`'s own beats rather than restated, so
 * the board and the world cannot disagree about when anything happened.
 * The Keeper is only reached when verification passes: a blocked or
 * insufficient-evidence candidate never gets a review, and the board has
 * to show that rather than an empty third row.
 */
export const HOPS: readonly Hop[] = [
  {
    role: 'fabricator',
    startedAt: BEATS.handoffToFabricator,
    endedAt: BEATS.fabricatorReported,
    reachedBy: ALL_OUTCOMES,
  },
  {
    role: 'prover',
    startedAt: BEATS.handoffToProver,
    endedAt: BEATS.proverReported,
    reachedBy: ALL_OUTCOMES,
  },
  {
    role: 'keeper',
    startedAt: BEATS.handoffToKeeper,
    endedAt: BEATS.keeperReported,
    reachedBy: ['PASS'],
  },
];

/** What each hop returns, for a loop that ends in `outcome`. */
export function reportOf(role: Role, outcome: Outcome): Report {
  if (role === 'fabricator') return 'COMPLETE';
  if (role === 'prover') return outcome;
  // The Keeper's illustrative review raises findings, none blocking, so
  // the policy's word for it is never a bare PASS.
  return 'PASS_WITH_NON_BLOCKING_FINDINGS';
}

/**
 * The board at `seconds` into a loop that ends in `outcome`.
 *
 * **Append-only by construction**: a row exists exactly when its hop has
 * started, and its `report` is written exactly once, when the hop reports.
 * Nothing already on the board is ever changed by a later beat — which is
 * the property `test/ledger.test.ts` checks over every beat of every loop.
 */
export function ledgerAt(seconds: number, outcome: Outcome): LedgerRow[] {
  const rows: LedgerRow[] = [];
  for (const hop of HOPS) {
    if (!hop.reachedBy.includes(outcome)) continue;
    if (seconds < hop.startedAt) continue;
    const reported = seconds >= hop.endedAt;
    rows.push({
      role: hop.role,
      glyph: CAST[hop.role].label.charAt(0).toUpperCase(),
      label: CAST[hop.role].label.toUpperCase(),
      startedAt: hop.startedAt,
      endedAt: reported ? hop.endedAt : null,
      report: reported ? reportOf(hop.role, outcome) : null,
    });
  }
  return rows;
}

/** How long a row has run, in seconds: to its report, or to now. */
export function elapsedOf(row: LedgerRow, seconds: number): number {
  return Math.max(0, (row.endedAt ?? seconds) - row.startedAt);
}

/**
 * The longest a hop takes, over every loop. The elapsed bars are drawn
 * against it so their lengths are comparable between rows — a bar that
 * rescaled itself would make a fast hop and a slow one look the same.
 */
export const LONGEST_HOP = HOPS.reduce(
  (worst, hop) => Math.max(worst, hop.endedAt - hop.startedAt),
  0,
);

/** How many rows the board can ever hold: one per hop. */
export const LEDGER_ROWS = HOPS.length;

/** Which row, if any, is still unresolved. */
export function inFlight(rows: LedgerRow[]): LedgerRow | null {
  return rows.find((row) => row.report === null) ?? null;
}

/**
 * Whether every hop this outcome reaches has reported: the board is
 * finished. Read together with the elapsed column, this is what stops a
 * finished board reading as a live one.
 */
export function isSettled(rows: LedgerRow[], outcome: Outcome): boolean {
  const expected = HOPS.filter((hop) => hop.reachedBy.includes(outcome)).length;
  return rows.length === expected && rows.every((row) => row.report !== null);
}

/**
 * Where the rows sit on the slab's canvas, in canvas pixels from its top.
 * Here rather than in the drawing, because a click on the slab has to be
 * turned into a row and the two must agree — the owner's decision that
 * *"clicking a row opens that hop in the panel"* is worth nothing if the
 * row the reader hits is not the row they can see.
 */
export const LEDGER_HEAD_PX = 196;
export const LEDGER_FOOT_PX = 30;

/** The height of one row, given the picture's height above the honesty band. */
export function ledgerRowHeight(floor: number): number {
  return Math.floor((floor - LEDGER_HEAD_PX - LEDGER_FOOT_PX) / LEDGER_ROWS);
}

/**
 * Which row a point on the slab is in, or null. `uvY` is the texture
 * coordinate the raycast returned, whose origin is at the bottom.
 */
export function rowAtUv(uvY: number, canvasHeight: number, floor: number): number | null {
  const y = (1 - uvY) * canvasHeight;
  const height = ledgerRowHeight(floor);
  if (y < LEDGER_HEAD_PX || y >= LEDGER_HEAD_PX + LEDGER_ROWS * height) return null;
  return Math.floor((y - LEDGER_HEAD_PX) / height);
}

/** The roles in hop order, for anything that needs the order and not the board. */
export const HOP_ORDER: readonly Role[] = HOPS.map((hop) => hop.role).filter((role) =>
  ROLES.includes(role),
);
