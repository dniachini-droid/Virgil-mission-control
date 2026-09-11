import { useFrame } from '@react-three/fiber';
import type { CandidateState } from '@virgil/domain';
import { useRef, useState } from 'react';
import type { Activity } from '../characters/Figure.js';
import type { VirgilPose } from '../characters/VirgilRigged.js';
import type { FaceState } from '../characters/Visor.js';
import type { HopWork } from '../screens/work.js';
import type { Role } from './cast.js';

/**
 * A scripted demonstration, looping, through the three hops the
 * constitution describes: Virgil hands off to the Fabricator, who builds
 * and **reports complete** (a claim, never evidence —
 * `.claude/agents/fabricator.md`); Virgil hands off to the Prover, who
 * runs checks and returns a verdict; on a PASS the Keeper reviews and
 * returns his; Virgil reacts — a nod on a PASS, and on a BLOCKED the
 * **refusal**: `Angry_Ground_Stomp`.
 *
 * **Nothing behind this is real.** No event, no check, no review drives it;
 * it is a timeline of fixed numbers, and every surface it touches says so —
 * the badge on the page, the ILLUSTRATIVE band on every screen, and the
 * owner document.
 *
 * V8 (`docs/process/PHASE_1_STYLISED_SPEC.md` §0.10.6–7, §0.10.10):
 *
 *  - **three loops, not two**, so that all four verdicts of
 *    `constitution/REVIEW_POLICY.md` are seen: the first ends in PASS and
 *    then the Keeper's `PASS_WITH_NON_BLOCKING_FINDINGS` — his illustrative
 *    review raises findings, none blocking, and that is the verdict the
 *    policy gives such a review, not a bare PASS; the second in BLOCKED,
 *    with the refusal; the third in `INSUFFICIENT_EVIDENCE`, which is not
 *    a failure — a required check could not run — so Virgil does not
 *    refuse, he waits;
 *  - **the receiving beats are six seconds**, because the owner asked
 *    that the receiving screen not be "so quick" and it is the
 *    centrepiece; the working beats six; the verdicts long enough for
 *    the return to converge;
 *  - **an owner-gate beat** at the end of the passing loop: after the
 *    Keeper's verdict the candidate is `SAFE_TO_MERGE` — "every merge gate
 *    passes. Eligible. Not merged." (`STATE_LANGUAGE.md`) — and merge is
 *    owner-only in every phase, so the system stops and turns to them:
 *    every agent idle, every screen quiet, one thing lit (`ScreenBank.tsx`).
 *
 * **The candidate's state is carried in the project's own words.** The
 * owner, reading V7 closely: "when the fabricator is building, virgil's
 * screen says awaiting review. its actually awaiting on the build." The
 * fault was a fixed label across beats the sequence moves through. So
 * every beat now names the `CandidateState` it is genuinely in, from
 * `constitution/STATE_LANGUAGE.md` and the transition table in
 * `constitution/authority.json` (`packages/domain`), and the slabs are
 * drawn from that; `test/demo.test.ts` holds each word to the vocabulary
 * and each step to an allowed transition. Two beats have no word there,
 * and this is recorded rather than invented for: the rest between loops,
 * when no lineage exists (`candidate: null`, drawn as "no candidate"),
 * and a hand-off itself — the grant issued, the agent not yet started —
 * which the vocabulary folds into the state the candidate is already in.
 */
export type StationState = 'READY' | 'RECEIVING' | 'WORKING' | 'REPORTED';
/** The four verdicts of `REVIEW_POLICY.md`, and none shown. */
export type Verdict =
  | 'PASS'
  | 'PASS_WITH_NON_BLOCKING_FINDINGS'
  | 'BLOCKED'
  | 'INSUFFICIENT_EVIDENCE'
  | '—';
/** What a station reports: a verdict, or COMPLETE — the Fabricator's claim, not a verdict. */
export type Report = Verdict | 'COMPLETE';
/** How a loop ends. Decides what the Prover's checks do as they run. */
export type Outcome = 'PASS' | 'BLOCKED' | 'INSUFFICIENT_EVIDENCE';
export const OUTCOMES: readonly Outcome[] = ['PASS', 'BLOCKED', 'INSUFFICIENT_EVIDENCE'];

export interface MemberState {
  face: FaceState;
  activity: Activity;
  station: StationState;
  report: Report;
  /**
   * What this station is doing, when the caller has it as data (the
   * replay). Absent in the scripted demonstration, which uses `tally.ts`'s
   * illustrative fixtures. See `screens/work.ts`.
   */
  work?: HopWork;
}

export interface ScreenContent {
  /** The verdict currently shown on the review slab. */
  verdict: Verdict;
  /** Which role is active, if any. */
  active: string | null;
  /** The candidate's state, in the constitution's words; null when no candidate is in flight. */
  candidate: CandidateState | null;
  /** The system has stopped and is waiting on the owner: everything quiet, one thing lit. */
  ownerGate: boolean;
  /**
   * The candidate's identity as the slabs and the ledger show it. The
   * demonstration leaves it unset and `screens/candidate.ts` supplies its
   * data-shaped string; the replay sets the run's real short SHA.
   */
  candidateId?: string;
  /**
   * The deterministic evidence under the verdict on the centre slab. The
   * demonstration leaves it unset and `tally.ts`'s illustrative lines are
   * used; the replay sets the run's own counts.
   */
  evidence?: readonly string[];
  /**
   * **How long the run this content describes actually took, as a string
   * the record can answer for** — never a clock the page has been running.
   *
   * The scripted demonstration leaves it unset, because its own `seconds`
   * *is* the elapsed time of the thing it demonstrates. The replay sets it
   * from the run record's `startedAt` and `completedAt`, because there
   * `seconds` is playback time and printing that as a duration of the
   * recorded work is the Keeper's KS4-02. Unset in the replay means the
   * slab prints `NOT RECORDED`, which is the house rule and not a fallback.
   */
  recordedElapsed?: string;
  /**
   * The branch the candidate is on, as a console shows it. The
   * demonstration leaves it unset and the Fabricator's console falls back
   * to its own data-shaped string; the replay sets the recorded run's.
   *
   * It exists because of the Keeper's **KS4-04**: the Fabricator's rail
   * printed `BRANCH claude/…-v11` and `HEAD 9abcdef` as constants with no
   * mode branch, so the replay — which is recorded history and the one
   * place where every value on screen is supposed to be real — carried a
   * fabricated commit and the wrong branch beside three slabs showing the
   * real candidate.
   */
  branch?: string;
}

/**
 * Which of the two modes is running.
 *
 * `demo` is the scripted thirty-second demonstration of invented content;
 * `replay` is a recorded run played back faster than it happened
 * (`world/replay/`); `live` is this repository's real state, read from
 * `/api/state` by the hosted build only (`world/live/liveState.ts`, Phase 2
 * slice one). **The three make different claims about their own
 * truthfulness**, so nothing may be ambiguous about which is on: the
 * honesty band's words change, the badge changes, and the panel's band
 * changes with them.
 *
 * `live` is unreachable in the Owner Build, which compiles the live module out
 * and makes no network request at all; a state carrying it there would be a
 * state nothing can produce.
 */
export type RunMode = 'demo' | 'replay' | 'live';

export interface DemoState {
  running: boolean;
  seconds: number;
  loop: number;
  /** How this loop ends: what the Prover's checks are heading for. */
  outcome: Outcome;
  /** Which mode produced this state. */
  mode: RunMode;
  /**
   * Which beat of the recorded run is on screen, and at what speed. Set
   * only in `replay`; the panel reads it to fetch that hop's record.
   */
  replay?: { beatId: string; speed: string };
  pose: VirgilPose;
  virgilFace: FaceState;
  cast: Record<Role, MemberState>;
  content: ScreenContent;
}

/** The beats, in seconds from the loop's start. */
export const BEATS = {
  handoffToFabricator: 2,
  fabricatorWorking: 8,
  fabricatorReported: 14,
  handoffToProver: 17,
  proverWorking: 23,
  proverReported: 29,
  // The passing loop continues.
  handoffToKeeper: 32,
  keeperWorking: 38,
  keeperReported: 44,
  ownerGate: 48,
  passEnd: 56,
  // The blocked and insufficient-evidence loops rest after the verdict.
  verdictEnd: 35,
  otherEnd: 44,
} as const;

export function outcomeOf(loop: number): Outcome {
  return OUTCOMES[((loop % 3) + 3) % 3] as Outcome;
}

/** How long loop `loop` runs. */
export function loopLength(loop: number): number {
  return outcomeOf(loop) === 'PASS' ? BEATS.passEnd : BEATS.otherEnd;
}

/** The longest loop; the captures wait for it. */
export const DEMO_LENGTH = BEATS.passEnd;

const IDLE: MemberState = { face: 'idle', activity: 'rest', station: 'READY', report: '—' };

export function demoAt(seconds: number, loop: number, running: boolean): DemoState {
  const outcome = outcomeOf(loop);
  const base: DemoState = {
    running,
    seconds,
    loop,
    outcome,
    mode: 'demo',
    pose: 'rest',
    virgilFace: 'idle',
    cast: { fabricator: IDLE, prover: IDLE, keeper: IDLE },
    content: { verdict: '—', active: null, candidate: null, ownerGate: false },
  };
  if (!running) return base;
  const at = (overrides: Partial<DemoState>, cast: Partial<Record<Role, MemberState>>) => ({
    ...base,
    ...overrides,
    cast: { ...base.cast, ...cast },
  });
  const content = (partial: Partial<ScreenContent>): ScreenContent => ({
    ...base.content,
    ...partial,
  });
  if (seconds < BEATS.handoffToFabricator) return base;
  // Hand-off to the Fabricator: the receiving beat, six seconds.
  if (seconds < BEATS.fabricatorWorking) {
    return at(
      {
        pose: 'handoff',
        virgilFace: 'attentive',
        content: content({ active: 'Fabricator', candidate: 'BUILDING' }),
      },
      {
        fabricator: { face: 'attentive', activity: 'receiving', station: 'RECEIVING', report: '—' },
      },
    );
  }
  // The Fabricator builds.
  if (seconds < BEATS.fabricatorReported) {
    return at(
      {
        virgilFace: 'attentive',
        content: content({ active: 'Fabricator', candidate: 'BUILDING' }),
      },
      { fabricator: { face: 'working', activity: 'working', station: 'WORKING', report: '—' } },
    );
  }
  // The Fabricator reports complete: a claim, shown in ice, not a verdict.
  if (seconds < BEATS.handoffToProver) {
    return at(
      {
        virgilFace: 'attentive',
        content: content({ active: 'Fabricator', candidate: 'BUILDER_REPORTED_COMPLETE' }),
      },
      {
        fabricator: {
          face: 'attentive',
          activity: 'reported',
          station: 'REPORTED',
          report: 'COMPLETE',
        },
      },
    );
  }
  // Hand-off to the Prover.
  if (seconds < BEATS.proverWorking) {
    return at(
      {
        pose: 'handoff',
        virgilFace: 'attentive',
        content: content({ active: 'Prover', candidate: 'BUILDER_REPORTED_COMPLETE' }),
      },
      { prover: { face: 'attentive', activity: 'receiving', station: 'RECEIVING', report: '—' } },
    );
  }
  // The Prover verifies.
  if (seconds < BEATS.proverReported) {
    return at(
      {
        virgilFace: 'attentive',
        content: content({ active: 'Prover', candidate: 'VERIFICATION_INCOMPLETE' }),
      },
      { prover: { face: 'working', activity: 'working', station: 'WORKING', report: '—' } },
    );
  }
  // The Prover's verdict.
  if (outcome === 'BLOCKED') {
    // The refusal. The loop ends here.
    if (seconds < BEATS.verdictEnd) {
      return at(
        {
          pose: 'blocked',
          virgilFace: 'blocked',
          content: content({ verdict: 'BLOCKED', candidate: 'BLOCKED' }),
        },
        {
          prover: { face: 'blocked', activity: 'reported', station: 'REPORTED', report: 'BLOCKED' },
        },
      );
    }
    // The loop rests, but a blocked candidate does not vanish: the slabs
    // keep saying BLOCKED until the next candidate begins.
    return at({ content: content({ verdict: 'BLOCKED', candidate: 'BLOCKED' }) }, {});
  }
  if (outcome === 'INSUFFICIENT_EVIDENCE') {
    // Not a failure: a required check could not run, so the Prover
    // cannot tell. Virgil does not refuse; he waits for the missing proof.
    if (seconds < BEATS.verdictEnd) {
      return at(
        {
          virgilFace: 'attentive',
          content: content({
            verdict: 'INSUFFICIENT_EVIDENCE',
            candidate: 'INSUFFICIENT_EVIDENCE',
          }),
        },
        {
          prover: {
            face: 'attentive',
            activity: 'reported',
            station: 'REPORTED',
            report: 'INSUFFICIENT_EVIDENCE',
          },
        },
      );
    }
    return at(
      {
        content: content({
          verdict: 'INSUFFICIENT_EVIDENCE',
          candidate: 'INSUFFICIENT_EVIDENCE',
        }),
      },
      {},
    );
  }
  // PASS: verification completed and the gate passed, so the candidate
  // is READY_FOR_REVIEW — which is not reviewed. Virgil nods, and the
  // Keeper reviews.
  const proverPassed: MemberState = {
    face: 'idle',
    activity: 'reported',
    station: 'REPORTED',
    report: 'PASS',
  };
  if (seconds < BEATS.handoffToKeeper) {
    return at(
      {
        pose: 'nod',
        virgilFace: 'passed',
        content: content({ verdict: 'PASS', candidate: 'READY_FOR_REVIEW' }),
      },
      { prover: { ...proverPassed, face: 'passed' } },
    );
  }
  if (seconds < BEATS.keeperWorking) {
    return at(
      {
        pose: 'handoff',
        virgilFace: 'attentive',
        content: content({ verdict: 'PASS', active: 'Keeper', candidate: 'READY_FOR_REVIEW' }),
      },
      {
        prover: proverPassed,
        keeper: { face: 'attentive', activity: 'receiving', station: 'RECEIVING', report: '—' },
      },
    );
  }
  if (seconds < BEATS.keeperReported) {
    return at(
      {
        virgilFace: 'attentive',
        content: content({ verdict: 'PASS', active: 'Keeper', candidate: 'REVIEW_IN_PROGRESS' }),
      },
      {
        prover: proverPassed,
        keeper: { face: 'working', activity: 'working', station: 'WORKING', report: '—' },
      },
    );
  }
  // The Keeper's verdict: findings were raised, none blocking, so the
  // policy's word for it is PASS_WITH_NON_BLOCKING_FINDINGS, never PASS.
  if (seconds < BEATS.ownerGate) {
    return at(
      {
        pose: 'nod',
        virgilFace: 'passed',
        content: content({
          verdict: 'PASS_WITH_NON_BLOCKING_FINDINGS',
          candidate: 'PASS_WITH_NON_BLOCKING_FINDINGS',
        }),
      },
      {
        prover: proverPassed,
        keeper: {
          face: 'passed',
          activity: 'reported',
          station: 'REPORTED',
          report: 'PASS_WITH_NON_BLOCKING_FINDINGS',
        },
      },
    );
  }
  // The owner gate: SAFE_TO_MERGE — eligible, not merged. The system
  // stops and turns to the owner: every agent at rest, every screen
  // quiet, one thing lit.
  return at(
    {
      virgilFace: 'idle',
      content: content({
        verdict: 'PASS_WITH_NON_BLOCKING_FINDINGS',
        candidate: 'SAFE_TO_MERGE',
        ownerGate: true,
      }),
    },
    {},
  );
}

/**
 * Every face and screen held in one state, for looking at that state at
 * rest (`#/?state=…`). Nothing runs; nothing is real; the content says so.
 */
export function forcedState(face: FaceState): DemoState {
  const base = demoAt(0, 0, false);
  const all = (member: MemberState): Record<Role, MemberState> => ({
    fabricator: member,
    prover: member,
    keeper: member,
  });
  switch (face) {
    case 'attentive':
      return {
        ...base,
        virgilFace: 'attentive',
        cast: all({ face: 'attentive', activity: 'receiving', station: 'RECEIVING', report: '—' }),
        content: {
          verdict: '—',
          active: 'Prover',
          candidate: 'BUILDER_REPORTED_COMPLETE',
          ownerGate: false,
        },
      };
    case 'working':
      return {
        ...base,
        virgilFace: 'working',
        cast: all({ face: 'working', activity: 'working', station: 'WORKING', report: '—' }),
        content: {
          verdict: '—',
          active: 'Prover',
          candidate: 'VERIFICATION_INCOMPLETE',
          ownerGate: false,
        },
      };
    case 'passed':
      return {
        ...base,
        virgilFace: 'passed',
        cast: all({ face: 'passed', activity: 'reported', station: 'REPORTED', report: 'PASS' }),
        content: { verdict: 'PASS', active: null, candidate: 'READY_FOR_REVIEW', ownerGate: false },
      };
    case 'blocked':
      return {
        ...base,
        outcome: 'BLOCKED',
        pose: 'blocked',
        virgilFace: 'blocked',
        cast: all({
          face: 'blocked',
          activity: 'reported',
          station: 'REPORTED',
          report: 'BLOCKED',
        }),
        content: { verdict: 'BLOCKED', active: null, candidate: 'BLOCKED', ownerGate: false },
      };
    default:
      return base;
  }
}

function memberChanged(a: MemberState, b: MemberState): boolean {
  return (
    a.face !== b.face ||
    a.activity !== b.activity ||
    a.station !== b.station ||
    a.report !== b.report
  );
}

/**
 * Where the demo clock starts: `#/?demo=<seconds>&loop=<n>` opens the
 * demonstration at that moment of that loop, so the captures can take a
 * frame sequence of one beat deterministically. Not a feature; a way to
 * see. Read once at mount.
 */
export function demoStart(): { t: number; loop: number } {
  if (typeof window === 'undefined') return { t: 0, loop: 0 };
  const query = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const t = Number.parseFloat(query.get('demo') ?? '');
  const loop = Number.parseInt(query.get('loop') ?? '', 10);
  return {
    t: Number.isFinite(t) && t >= 0 ? t : 0,
    loop: Number.isFinite(loop) && loop >= 0 ? loop : 0,
  };
}

/**
 * Advances the demo clock on the render loop and returns the current state;
 * re-renders React only when a phase boundary is crossed. Publishes the
 * clock on `window.__virgilDemo` so a capture can label its frames with
 * the demonstration's own time rather than the wall clock's.
 */
export function useDemo(running: boolean): DemoState {
  const clock = useRef(demoStart());
  const [state, setState] = useState<DemoState>(() =>
    demoAt(clock.current.t, clock.current.loop, running),
  );
  useFrame((_, delta) => {
    if (!running) {
      if (state.running) setState(demoAt(0, 0, false));
      return;
    }
    // Capped, as the rigged Virgil caps his mixer: a slow frame or a tab
    // returning from the background advances the demonstration by at most
    // a tenth of a second, so no beat is skipped.
    clock.current.t += Math.min(delta, 0.1);
    if (clock.current.t >= loopLength(clock.current.loop)) {
      clock.current.t -= loopLength(clock.current.loop);
      clock.current.loop += 1;
    }
    (window as Window & { __virgilDemo?: { seconds: number; loop: number } }).__virgilDemo = {
      seconds: clock.current.t,
      loop: clock.current.loop,
    };
    const next = demoAt(clock.current.t, clock.current.loop, true);
    if (
      next.pose !== state.pose ||
      next.virgilFace !== state.virgilFace ||
      next.outcome !== state.outcome ||
      memberChanged(next.cast.fabricator, state.cast.fabricator) ||
      memberChanged(next.cast.prover, state.cast.prover) ||
      memberChanged(next.cast.keeper, state.cast.keeper) ||
      next.content.verdict !== state.content.verdict ||
      next.content.active !== state.content.active ||
      next.content.candidate !== state.content.candidate ||
      next.content.ownerGate !== state.content.ownerGate ||
      next.running !== state.running
    ) {
      setState(next);
    }
  });
  return state;
}
