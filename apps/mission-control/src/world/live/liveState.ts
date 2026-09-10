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

/** How often the page asks again. The function caches for 25 s; this is not tighter. */
const POLL_MS = 30_000;

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
export function stateFromAnswer(answer: LiveAnswer): DemoState | null {
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
  return {
    ...base,
    mode: 'live',
    running: false,
    content: {
      ...base.content,
      ...known,
      // Not known, and left saying so. See the header for why each of these is
      // a refusal rather than an omission.
      verdict: '—',
      active: null,
      candidate: null,
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
