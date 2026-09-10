import { useEffect, useState } from 'react';
import { type DemoState, demoAt } from '../room/demo.js';

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
 * `mobile/MobileRoom` — so its 8,528,318 bytes cannot move by anything here.
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
    runs: { name: string; status: string; conclusion: string | null; url: string | null }[];
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
export function stateFromAnswer(answer: LiveAnswer, now = Date.now()): DemoState | null {
  if (!answer.ok) return null;
  const base = demoAt(0, 0, false);
  // `exactOptionalPropertyTypes` is on, and it is right to be: an absent field
  // and a field explicitly set to `undefined` are different claims, and the
  // screens read the first as "the demonstration supplies its own" and would
  // read the second as a value. So an unread field is left off entirely rather
  // than written as `undefined`.
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

  const cast = { ...base.cast };
  if (report) {
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
        /**
         * **An empty schedule, so the console cannot fall back to the script.
         * The Keeper's KP2-05.**
         *
         * `screens/v11/screens.ts` reaches for `tally.ts`'s fixtures whenever
         * `work` is absent, and live mode never set it. A hosted page reporting
         * this repository therefore drew `FILES 8 · COMMITS 3`, `PASSED 14` and
         * `FINDINGS 3` — every one a constant in the demonstration — on the same
         * screen that says the figures come from GitHub.
         *
         * Passing an empty one is not a claim that the work is empty. The rails
         * read an empty schedule as **nothing read** and draw `—` and `NOT READ`,
         * which is what is true until a real source is wired to each of them.
         */
        work: EMPTY_WORK[role],
      };
    }
  }

  return {
    ...base,
    mode: 'live',
    running: false,
    cast,
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
      /** Who holds it. `virgil` is between roles, and the slabs draw that already. */
      active: report?.holder && report.holder !== 'virgil' ? report.holder : null,
      candidate: (report?.candidate?.state ?? null) as CandidateName,
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
export function useLive(enabled: boolean): Live {
  const [live, setLive] = useState<Live>({ state: null, answer: null, error: null, asOf: null });

  useEffect(() => {
    if (!__LIVE__ || !enabled) return;
    let cancelled = false;

    const read = async () => {
      try {
        const response = await fetch('/api/state', { headers: { accept: 'application/json' } });
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
  }, [enabled]);

  return live;
}

/** Whether this build can read live state at all. Compiled to a constant. */
export function liveIsCompiledIn(): boolean {
  return __LIVE__;
}
