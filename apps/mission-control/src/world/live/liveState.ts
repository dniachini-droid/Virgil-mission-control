import { useEffect, useState } from 'react';
import authority from '../../../../../constitution/authority.json' with { type: 'json' };
import { type DemoState, demoAt } from '../room/demo.js';
import type { CheckState } from '../window/blocks.js';

/**
 * **The world, reporting this repository instead of replaying a recording.**
 *
 * Phase 2, slice one (`docs/process/PHASE_2_SLICE_1_BRIEF.md`), authorised by
 * `docs/decisions/OD-0009-netlify-and-phase-2-authorisation.md`. The owner's
 * question is the whole reason it exists: *"but does that mean when I type stuff
 * into it, it wont show live updates of how each job is going? isnt that the
 * point of this UI??"*
 *
 * **This module is compiled into the hosted build and out of the Owner Build.**
 * `__LIVE__` is defined `true` only by `vite.web.config.ts`; every other config
 * defines it `false`, so the fetch below is eliminated from the single-file
 * builds. That is not a nicety. The Owner Build's defining promise is that it
 * makes **zero** network requests and therefore works from `file://` with no
 * server, and `e2e/verify-owner-build*.ts` fails the build if it makes one. V10
 * never imports this file at all — it renders through `room/VirgilRoom`, not
 * `mobile/MobileRoom` — so nothing here can reach V10's build. (This sentence
 * used to end "so its 8,528,318 bytes cannot move", which was a figure two
 * builds out of date and a contract `OD-0010` has since retired: the Keeper's
 * KP3-12.)
 *
 * **What it may not do, which is most of what this file is about.**
 *
 * The screens it feeds were built to draw a scripted run whose every value was
 * chosen to be interesting. Real state is mostly quiet, and the temptation is to
 * fill the quiet in. Every field below is either read from the answer or left in
 * the state that means *not known*, and there is no third case:
 *
 *  - **No verdict is invented.** `keeperVerdict` is `null` from the function and
 *    stays `'—'` here. A GitHub approval is not a Keeper review and the function
 *    refuses to translate one into the other; this file must not undo that by
 *    inferring a verdict from checks passing. Checks passing is the Prover's
 *    business. The verdict is the Keeper's, and no Keeper has reported.
 *  - **No candidate state is inferred.** `constitution/authority.json` names
 *    fifteen `candidateStates` and a commit on a branch is not evidence of any
 *    of them. `candidate` stays `null`, which the slabs already draw as *no
 *    candidate*, until something authoritative publishes one.
 *  - **No agent is shown working.** Nothing here can observe an agent, so the
 *    cast stays at rest. A figure animated because a check happens to be running
 *    would be a picture of something that is not happening.
 *  - **A failure is not a zero.** When the answer cannot be read the state is
 *    `null` and the caller keeps showing nothing rather than showing noughts.
 */

declare const __LIVE__: boolean;

type ScreenVerdict = DemoState['content']['verdict'];
type CandidateName = DemoState['content']['candidate'];

/** The report's words for what a station is doing, in the world's own words. */
/**
 * **What each station is given when nothing about its work has been read.**
 *
 * Empty rather than absent: absent is what let the demonstration's fixtures in.
 * Each is the right `kind` for its role, so the console takes this branch rather
 * than the fallback, and every list in it is empty, which the rails draw as `—`.
 */
const EMPTY_WORK = {
  fabricator: { kind: 'build', files: [], commits: [], counts: [] },
  prover: { kind: 'checks', checks: [], counts: [] },
  keeper: { kind: 'review', findings: [], readSeconds: 0, counts: [] },
} as const;

/**
 * **A word is a candidate state only if the constitution says so.**
 *
 * `constitution/authority.json` names fifteen. Anything else is not a state this
 * project has, whoever wrote it into the report, and the slab shows no state
 * rather than showing a word — which is what `null` already means there and what
 * the demonstration already draws for a beat with no lineage.
 *
 * The list is imported rather than retyped: a second copy of the constitution's
 * vocabulary is free to drift from the first, which is the failure the schema in
 * `agent-contracts` exists to prevent and which a hand-written check here would
 * reintroduce.
 */
function candidateStateOf(word: unknown): CandidateName {
  if (typeof word !== 'string') return null;
  const known: readonly string[] = authority.candidateStates;
  return known.includes(word) ? (word as CandidateName) : null;
}

const ACTIVITY: Record<string, 'rest' | 'receiving' | 'working' | 'reported'> = {
  READY: 'rest',
  RECEIVING: 'receiving',
  WORKING: 'working',
  REPORTED: 'reported',
};
const STATION: Record<string, 'READY' | 'RECEIVING' | 'WORKING' | 'REPORTED'> = {
  READY: 'READY',
  RECEIVING: 'RECEIVING',
  WORKING: 'WORKING',
  REPORTED: 'REPORTED',
};

/**
 * **The role as the constitution writes it, mapped to the name the room draws.**
 *
 * Three entries because the room has three stations. Everything else the cast
 * contains — the Architect, the Arbiter, the specialists, and `virgil`, which
 * means between roles — has no station here and maps to nothing, which the room
 * draws as at rest.
 */
const STATION_NAME: Record<string, string> = {
  fabricator: 'Fabricator',
  prover: 'Prover',
  keeper: 'Keeper',
};

/** How often the page asks again. The function caches for 25 s; this is not tighter. */
const POLL_MS = 30_000;

/**
 * **How old a session's report may be before the room stops drawing it as now.**
 *
 * The report is written by a session about itself, and the failure that matters
 * is not a session lying — it is a session **stopping**. A Fabricator left lit
 * looks exactly like a Fabricator still building, and the screen the owner opens
 * on his phone to find out whether anything is happening would answer *yes* for
 * ever.
 *
 * So a report has a shelf life. Past it the room goes to rest and the badge says
 * when the report was written, which is the honest reading: nobody has said
 * anything for a while, and this app cannot see agents by itself. Twenty minutes
 * is chosen to be longer than a quiet stretch inside a working session and much
 * shorter than a session being over.
 *
 * **The identifiers are not aged out with it.** The branch and commit come from
 * GitHub, not from the report, and they are as true at midnight as at noon.
 */
export const REPORT_GOES_COLD_MS = 20 * 60 * 1000;

/** Whether a report is still fresh enough to be drawn as what is happening now. */
export function reportIsCurrent(reportedAt: string, now = Date.now()): boolean {
  const at = Date.parse(reportedAt);
  if (Number.isNaN(at)) return false;
  // A report stamped in the future is not fresh, it is wrong; the clock that
  // wrote it cannot be trusted to say when it stops being true.
  if (at > now + 60_000) return false;
  return now - at <= REPORT_GOES_COLD_MS;
}

export interface LiveAnswer {
  ok: boolean;
  asOf: string;
  reason?: string;
  repo?: string;
  branch?: string;
  head?: { sha: string; shortSha: string; message: string; committedAt: string | null };
  pull?: { number: number; title: string; draft: boolean; url: string; base: string | null } | null;
  checks?: {
    total: number;
    passed: number;
    failed: number;
    running: number;
    noResult: number;
    /**
     * Which GitHub API answered — `check runs`, `workflow runs` or `commit
     * statuses`. Reported rather than hidden: *"fourteen checks passed"* means a
     * different thing from each of the three (`netlify/functions/state.mjs`).
     */
    source?: string;
    /**
     * **Declared as the function actually sends it.** This said
     * `{ name, status, conclusion, url }` — GitHub's own fields — while
     * `state.mjs` has always mapped those to one `state` of its own and a
     * `detail` beside it. Nothing read the field, so nothing caught it; the
     * moment something did, the type would have described a payload that has
     * never existed on this wire.
     */
    runs: { name: string; state: string; detail?: string | null; url: string | null }[];
  } | null;
  githubReviews?: { state: string; submittedAt: string | null }[] | null;
  keeperVerdict?: null;
  keeperVerdictReason?: string;
  /**
   * **A claim, and it arrives under its own name so it cannot be mistaken for
   * one.** Written by the sessions doing the work into `.virgil/state.json`
   * (`@virgil/agent-contracts`, `virgil.session-status.v1`). `CLAUDE.md` says a
   * builder's success report is not evidence, and this is exactly that: it is
   * carried because it is traceable — committed, at a commit the answer names —
   * not because it is proven.
   */
  sessionReport?: {
    schema: string;
    reportedAt: string;
    aboutCommit: string;
    branch: string;
    candidate: { sha: string; shortSha: string; state: string | null } | null;
    holder: string | null;
    hops: { role: string; activity: string; reported: string | null; at: string | null }[];
    review: {
      verdict: string;
      recordPath: string;
      recordCommit: string;
      findings: number;
      blocking: number;
    } | null;
    note: string | null;
  } | null;
  sessionReportedIn?: string | null;
  sessionReportReason?: string | null;
  /**
   * Which of three situations the reason describes: nobody has written a report,
   * one exists and could not be read, or one was read and refused. The page says
   * different things about each and cannot tell them apart from the prose.
   */
  sessionReportStatus?: 'read' | 'absent' | 'unreadable' | 'refused' | null;
  /**
   * **Whether the branch being asked about is still in the repository.**
   *
   * `false` on an `ok: true` answer: the repository was read, the list was read,
   * and the branch named is not in it — a fact about the repository rather than
   * a failure to read it. Absent on an answer from before slice five.
   */
  branchExists?: boolean;
  /** The repository's own default branch, so the page can offer it as the way back. */
  defaultBranch?: string;
  /**
   * Every branch, capped at `branchesWatched` and ordered default-first. `null`
   * means the list could not be read, which is not the same as no branches.
   */
  branches?:
    | {
        name: string;
        sha: string | null;
        shortSha: string | null;
        isDefault: boolean;
        protected: boolean;
        pull: {
          number: number;
          title: string | null;
          draft: boolean;
          url: string | null;
          updatedAt: string | null;
        } | null;
        /**
         * When the branch last moved, **where that is known** — which is only
         * where it has an open pull request to read it from. `/branches` carries
         * no dates and there is no one call that does, so a branch without a
         * pull request reads `null` and must be drawn as "not read", never as
         * old.
         */
        updatedAt: string | null;
      }[]
    | null;
  branchesReason?: string | null;
  /** How many branches exist, which may be more than the list carries. */
  branchesTotal?: number;
  branchesWatched?: number;
  /**
   * Why no checks are in the answer, when none are.
   *
   * `state.mjs` has always sent it — `checksReason: checkResult.unreadable ?? null`
   * — naming each source that refused and the status it refused with. Nothing in
   * this app read it until the Prover's window needed to say *why* it is showing
   * nothing, which is the difference between "not read" and "none".
   */
  checksReason?: string | null;
}

export interface Live {
  /** The state the world should draw, or `null` while nothing has been read. */
  state: DemoState | null;
  /** The answer as it arrived, for the surfaces that report on the reading itself. */
  answer: LiveAnswer | null;
  /** What went wrong, in words a reader can act on. `null` when nothing has. */
  error: string | null;
  /** When the answer was taken, ISO, or `null`. Never defaulted to now. */
  asOf: string | null;
}

/**
 * The answer, as a `DemoState` the existing screens already know how to draw.
 *
 * `demoAt(0, 0, false)` is the room at rest: no pose, no activity, every station
 * `READY`, nothing reported. That is the correct starting point for real state,
 * because it is what the room looks like when nothing is happening — and when
 * nothing is happening, that is what should be on screen.
 */
/**
 * The four words the constitution has for how a check ended.
 *
 * `constitution/authority.json`, `checkResults`. They are layer 2 and only the
 * owner may change them, so this list is read against the wire rather than
 * extended to fit it: a result outside the four is not translated into one of
 * them, it is counted as having returned nothing.
 */
const CHECK_STATES: readonly string[] = ['running', 'passed', 'failed', 'skipped'];

/**
 * The checks the answer reported, as rows the Prover's window can draw.
 *
 * Two things it will not do. It will not invent a name: a run the API named with
 * an empty string is not drawn as a blank row, it is counted in `noResult`. And
 * it will not translate a result the constitution has no word for into one it
 * does — `noResult` is not `skipped`, `cancelled` is not `failed`. Those are
 * counted and said in a sentence, because the alternative is the interface
 * telling the owner something the evidence never said, which is the one thing
 * this whole build exists to avoid.
 */
function checksOf(answer: LiveAnswer): NonNullable<DemoState['checks']> | null {
  const read = answer.checks;
  if (!read || !Array.isArray(read.runs)) return null;
  const rows: { name: string; state: CheckState }[] = [];
  let noResult = 0;
  for (const run of read.runs) {
    const name = typeof run?.name === 'string' && run.name.length > 0 ? run.name : null;
    if (!name) {
      noResult += 1;
      continue;
    }
    if (CHECK_STATES.includes(run.state)) {
      rows.push({ name, state: run.state as CheckState });
    } else {
      noResult += 1;
    }
  }
  return { rows, noResult, source: typeof read.source === 'string' ? read.source : 'GitHub' };
}

export function stateFromAnswer(answer: LiveAnswer, now = Date.now()): DemoState | null {
  if (!answer.ok) return null;
  /**
   * **The Keeper's KP8-02, and it is the defect this whole project exists to
   * prevent — created, not inherited.**
   *
   * Until slice five, every `ok: true` answer carried a head commit, so "the
   * page read nothing" and "`stateFromAnswer` returned `null`" were the same
   * thing, and `MobileRoom` drew no world at all in that case. A comment there
   * names what that guard is for, in these words: *"a lie with a specific shape:
   * `screens/candidate.ts` supplies a data-shaped identifier when none is set,
   * so a live page that had read nothing would draw `9abcdef` beside a real
   * branch name and look exactly like a page that had."*
   *
   * Slice five introduced an `ok: true` answer with `head: null` — the branch
   * asked for is not in the repository — and that walked straight through this
   * function. The result was a live state with no candidate id, every consumer
   * falling back to `CANDIDATE_ID`, and the room drawing `9abcdef012` under the
   * caption *"Exact version being worked on"* next to the real, deleted branch
   * name. The Fabricator's window drew eight invented file paths and a terminal
   * claiming `801 passed` with exit 0; the Keeper's drew three invented
   * findings. About a branch the same page had just said did not exist.
   *
   * The guarantee is restored where it belongs — here, once, rather than in each
   * of the dozen places that read `content.candidateId`. **No head, no state.**
   * The branch list is chrome and is drawn from `live.answer` regardless, so the
   * page still says which branch is gone and still offers the ones that are not:
   * nothing is lost by refusing to draw a world nobody can describe.
   */
  // **SA-U-04 / KP9-02: the guard and the read must name the same field.** This
  // checked `sha` while the identifier every screen draws comes from
  // `shortSha` one line below — so a head carrying one and not the other passed
  // the guard, left `candidateId` unset, and every consumer's `?? CANDIDATE_ID`
  // put `9abcdef012` on the slab under “Exact version being worked on”. Two
  // reviewers reproduced it; today's wire never sends that shape, and “the other
  // side always sets both” is the assumption this file rejects everywhere else.
  if (!answer.head?.sha || !answer.head?.shortSha) return null;
  const base = demoAt(0, 0, false);
  // `exactOptionalPropertyTypes` is on, and it is right to be: an absent field
  // and a field explicitly set to `undefined` are different claims, and the
  // screens read the first as "the demonstration supplies its own" and would
  // read the second as a value. So an unread field is left off entirely rather
  // than written as `undefined`.
  /**
   * Read once and used twice — the Prover's window and, since SA-U-06, his
   * station screen. Two surfaces, one reading, no way for them to disagree.
   */
  const read = checksOf(answer);
  const known: { candidateId?: string; branch?: string } = {};
  if (answer.head?.shortSha) known.candidateId = answer.head.shortSha;
  if (answer.branch) known.branch = answer.branch;
  /**
   * **The sessions' report, applied only where it is about this branch.**
   *
   * A report naming a different branch is not this branch's news, and applying
   * it would put one branch's agents on another's stage. The staleness question —
   * a report about an older commit — is answered by showing when it was written
   * and which commit it was committed in, rather than by a boolean: the file is
   * committed, so it can never name the commit that contains it, and any rule
   * phrased as "the head must equal aboutCommit" would call every report stale.
   */
  const onThisBranch =
    answer.sessionReport && answer.sessionReport.branch === answer.branch
      ? answer.sessionReport
      : null;
  /**
   * **And only while it is still current.** See `REPORT_GOES_COLD_MS`: the
   * failure this guards is a session stopping, not a session lying, and a
   * Fabricator left lit is indistinguishable from one still building. Past the
   * shelf life the room goes to rest and the badge says when the report was
   * written.
   */
  const report =
    onThisBranch && reportIsCurrent(onThisBranch.reportedAt, now) ? onThisBranch : null;

  /**
   * **Every station gets an empty schedule, always, before anything else. The
   * Keeper's KP3-01, and the reason its predecessor KP2-05 was only narrowed.**
   *
   * `screens/v11/screens.ts` reaches for `tally.ts`'s fixtures whenever `work`
   * is absent, so a hosted page reporting this repository drew `FILES 8 ·
   * COMMITS 3`, `PASSED 14` and `FINDINGS 3` — every one a constant in the
   * demonstration — on the same screen that says the figures come from GitHub.
   *
   * **The first repair assigned this inside the loop over the report's hops**,
   * which fixed the case it was tested against and left three that occur more
   * often than it: a station with no hop in the report, every station when the
   * report has gone cold — twenty minutes, by design — and every station when
   * there is no report at all. The page has a paragraph written specially for
   * the last two, so the contradiction sat next to its own explanation. A fourth
   * route was created by the repair itself: a report the wire check refuses
   * arrives as no report, which drew fixtures.
   *
   * So it is unconditional and it is first. A live cast member cannot reach the
   * console with `work` absent by any path, including paths nobody has thought
   * of yet, because there is no branch to miss. An empty schedule is not a claim
   * that the work is empty: the rails read it as **nothing read** and draw `—`
   * and `NOT READ`, which is what is true until a real source is wired to each.
   */
  const cast = { ...base.cast };
  for (const role of Object.keys(cast) as (keyof typeof cast)[]) {
    cast[role] = { ...cast[role], work: EMPTY_WORK[role] };
  }

  /**
   * **SA-U-06: the one live source that exists reaches the station screen too.**
   *
   * The loop above is unconditional and stays that way — every station starts
   * from nothing read, which is what is true until a real source is wired to it.
   * The Prover now has one. Before this, his window listed the checks and said
   * *"All 2 checks passed"* while his station screen, on the same page at the
   * same instant, said `NOT READ`: the owner walks over to the Prover to find
   * out whether his checks passed and the station tells him nobody knows.
   *
   * Counts only. `checks` stays empty because a `Check` carries a start time and
   * a duration, GitHub returns neither, and the console *animates* them —
   * filling that in would be inventing the motion this whole file exists to
   * refuse.
   */
  if (read) {
    cast.prover = {
      ...cast.prover,
      work: {
        kind: 'checks',
        checks: [],
        counts: [],
        read: {
          passed: read.rows.filter((row) => row.state === 'passed').length,
          failed: read.rows.filter((row) => row.state === 'failed').length,
          running: read.rows.filter((row) => row.state === 'running').length,
          skipped: read.rows.filter((row) => row.state === 'skipped').length,
          // Every check GitHub named, including the ones it had no word for —
          // the same total the window's heading counts.
          total: read.rows.length + read.noResult,
        },
      },
    };
  }

  /**
   * **KP4-06: the principle this file states for one field, applied to the one
   * beside it.**
   *
   * The candidate repair said it plainly — *"both refuse it, because one of them
   * being enough is what was assumed last time"* — and then this loop took
   * `report.hops` on trust. A report without the key throws `TypeError` here.
   * The deployed wire check refuses such a report today, so nothing reaches this
   * line through it; but the function and this page are separate artefacts that
   * can ship from different commits, and "the other side already checked" is the
   * assumption that produced the finding this repair was closing.
   */
  if (report && Array.isArray(report.hops)) {
    for (const hop of report.hops) {
      const role = hop.role as keyof typeof cast;
      if (!(role in cast)) continue;
      const activity = ACTIVITY[hop.activity] ?? 'rest';
      cast[role] = {
        ...cast[role],
        activity,
        station: STATION[hop.activity] ?? 'READY',
        report: (hop.reported ?? '—') as (typeof cast)[typeof role]['report'],
        face: activity === 'working' ? 'working' : 'idle',
      };
    }
  }

  /**
   * Read once: the window draws it and, since SA-U-06, so does the Prover's
   * station screen. Two surfaces, one reading, no chance of disagreeing.
   */
  return {
    ...base,
    mode: 'live',
    running: false,
    cast,
    /**
     * Present only here. `demoAt` leaves it off, so the recording and the replay
     * carry no checks and the Prover's window falls back to its recorded text —
     * a scripted run saying what it is.
     */
    checks: read,
    /**
     * Carried whether or not there is a reason, so that `checks: null` always
     * arrives with the question "why" already answered — with a sentence, or
     * with `null` meaning the source said nothing about it.
     */
    checksReason: typeof answer.checksReason === 'string' ? answer.checksReason : null,
    content: {
      ...base.content,
      ...known,
      /**
       * **No verdict reaches this slab from a session's report. The Keeper's
       * KP2-04, and the comment that used to stand here was the defect.**
       *
       * It said the schema would not represent a verdict without the record it
       * came from, *"so a session cannot claim one into this slab by writing a
       * word"*. Two things were wrong with that. The schema never ran on the live
       * path — `state.mjs` checks one version string and returns the file
       * verbatim — and `recordPath` and `recordCommit` were read by nothing at
       * all: no fetch, no resolution, no comparison. A reviewer fed a report
       * naming a file that does not exist and a commit that does not exist, and
       * `PASS` arrived on the slab as *"The Keeper has finished its review"*,
       * marked `verified`.
       *
       * So the verdict is not carried. Not narrowed, not validated harder —
       * **not carried**, until something actually reads the record at the commit
       * and can say the verdict is the record's. A pointer nothing follows is
       * decoration, and this project has no business drawing decoration as
       * evidence on the one surface whose whole subject is the difference.
       */
      verdict: '—' as ScreenVerdict,
      /**
       * **Who holds it, in the words the rest of the room already uses.**
       *
       * The report names a role the way the constitution does — `fabricator` —
       * and every surface downstream compares against `Fabricator`: the window
       * that highlights the station, and the action that offers *"Go to the
       * ..."*. So the raw string went in, matched nothing, and the action fell
       * through to its default, which is the Fabricator: the slab said KEEPER
       * and the button beneath it took the owner to the Fabricator. Found by the
       * generated wire cases of KP3-05, which is also why the wire now accepts
       * the whole cast rather than three of it.
       *
       * A role with no station is drawn as no station rather than as the wrong
       * one. That loses something true — the Architect holding the work reads
       * here as nobody at a station — and it is the honest half of the loss:
       * this build has three stations and cannot draw a fourth. Named in
       * `docs/architecture/ENFORCEMENT_BOUNDARIES.md` rather than left here.
       */
      active: STATION_NAME[report?.holder ?? ''] ?? null,
      /**
       * **The Keeper's KP3-02: the same defect as the verdict, one field over.**
       *
       * This was a bare cast, so a session writing `"APPROVED BY THE OWNER"`
       * into `candidate.state` had it printed on the slab under the caption
       * *"THE STATUS RECORDED BY THE PROJECT"*. The wire check added to close the
       * verdict path never looked at this field at all, which is what makes it
       * the same finding rather than a new one: the repair covered the field it
       * was pointed at and not the one beside it.
       *
       * A cast is not a check. The word must be one of the fifteen the
       * constitution names, or there is no word.
       */
      candidate: candidateStateOf(report?.candidate?.state),
      // Nothing here can observe an owner gate, and a report may not assert one.
      ownerGate: false,
    },
  };
}

/**
 * Reads `/api/state` and keeps reading while the page is open.
 *
 * Returns `state: null` until the first answer arrives, and again whenever an
 * answer cannot be read — never the previous answer dressed as current. A page
 * that shows a state is claiming the state is current, and the only honest
 * version of that claim is one that stops when the reading does.
 */
/**
 * Which branch the room is showing, remembered across reloads.
 *
 * The page's state, not the server's: nothing is written back, so choosing a
 * branch costs nothing and no other reader is affected by what you looked at.
 * `null` means "whatever the endpoint's own default is", which is what a first
 * visit gets.
 *
 * `localStorage` is wrapped because it throws in a private window and in a page
 * whose site data has been blocked, and a room that will not open because it
 * could not remember which branch you last looked at would be a worse failure
 * than forgetting.
 */
const BRANCH_KEY = 'virgil.branch';

export function rememberedBranch(): string | null {
  try {
    const value = window.localStorage.getItem(BRANCH_KEY);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function rememberBranch(name: string | null): void {
  try {
    if (name === null) window.localStorage.removeItem(BRANCH_KEY);
    else window.localStorage.setItem(BRANCH_KEY, name);
  } catch {
    // A browser that will not remember is not a browser that cannot show the
    // room. Nothing here is load-bearing.
  }
}

export function useLive(enabled: boolean, branch?: string | null): Live {
  const [live, setLive] = useState<Live>({ state: null, answer: null, error: null, asOf: null });

  useEffect(() => {
    if (!__LIVE__ || !enabled) return;
    let cancelled = false;

    const read = async () => {
      try {
        // The branch travels as a query parameter, so the browser and any cache
        // in front of it treat two branches as two answers rather than one.
        const where = branch ? `/api/state?branch=${encodeURIComponent(branch)}` : '/api/state';
        const response = await fetch(where, { headers: { accept: 'application/json' } });
        if (!response.ok) throw new Error(`the state endpoint answered ${response.status}`);
        const answer = (await response.json()) as LiveAnswer;
        if (cancelled) return;
        setLive({
          state: stateFromAnswer(answer),
          answer,
          error: answer.ok ? null : (answer.reason ?? 'The answer did not say why.'),
          asOf: answer.asOf ?? null,
        });
      } catch (error) {
        if (cancelled) return;
        setLive({
          state: null,
          answer: null,
          error: error instanceof Error ? error.message : String(error),
          asOf: null,
        });
      }
    };

    void read();
    const timer = window.setInterval(() => void read(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // `branch` is a dependency: changing which branch is showing must start a
    // new read immediately rather than at the next poll, or a tap appears to do
    // nothing for up to thirty seconds.
  }, [enabled, branch]);

  return live;
}

/** Whether this build can read live state at all. Compiled to a constant. */
export function liveIsCompiledIn(): boolean {
  return __LIVE__;
}
