import type { CandidateState } from '@virgil/domain';
import type { Activity } from '../characters/Figure.js';
import type { VirgilPose } from '../characters/VirgilRigged.js';
import type { FaceState } from '../characters/Visor.js';
import type { Role } from '../room/cast.js';
import type {
  DemoState,
  MemberState,
  Outcome,
  Report,
  StationState,
  Verdict,
} from '../room/demo.js';
import type { LedgerRow } from '../screens/ledger.js';
import type { HopWork } from '../screens/work.js';
import {
  BUILD_1_FROM,
  BUILD_1_SECONDS,
  CANDIDATES,
  CHECKS_CANDIDATE_1,
  CHECKS_CANDIDATE_2,
  FINDINGS_REVIEW_1,
  FINDINGS_REVIEW_2,
  type Instant,
  RUN,
  RUN_SECONDS,
  recordedDuration,
} from './recordedRun.js';

/**
 * **The replay: a recorded run, played back faster than it happened.**
 *
 * Two clocks, and the whole honesty of this mode is in keeping them apart.
 *
 *  - **Recorded time** is a set of UTC instants read out of the repository
 *    (`recordedRun.ts`): git committer timestamps and the run record's own
 *    `startedAt` and `completedAt`. It is what the ledger, the slabs and
 *    the panel *report*. Where the repository has no instant for a beat,
 *    every surface that could print a duration prints `NOT RECORDED`
 *    instead of a number. Exactly one of this run's nine hops has a
 *    duration in the record.
 *  - **Playback time** is how long a beat is on screen. It is a pacing
 *    choice made here — a weight per beat — and it is **not proportional
 *    to recorded time and does not claim to be**. Nothing derived from it
 *    is ever shown as a duration of the work.
 *
 * The one number that joins them is the speed control's own label, and it
 * is derived rather than asserted: the run's recorded span divided by the
 * chosen playback length. At the default that is 90× — an hour and a half
 * of recorded work in sixty seconds of screen time.
 *
 * A compressed clock that reported compressed durations would be a lie
 * about how long the work took, and it is the one thing this module is
 * built to make impossible: no beat's playback length is ever read back
 * out as a recorded duration.
 */

/** How long the whole replay runs on screen, per speed. */
export const PLAYBACK_SECONDS = { fastest: 30, fast: 60, slow: 180 } as const;
export type ReplaySpeed = keyof typeof PLAYBACK_SECONDS;
export const REPLAY_SPEEDS: readonly ReplaySpeed[] = ['slow', 'fast', 'fastest'];
/** Fast by default: it is what the owner asked for. */
export const DEFAULT_SPEED: ReplaySpeed = 'fast';

/**
 * The compression the viewer is actually watching, derived from the two
 * clocks rather than declared: the recorded span over the playback length.
 */
export function compressionOf(speed: ReplaySpeed): number {
  return Math.round(RUN_SECONDS / PLAYBACK_SECONDS[speed]);
}

/** The speed control's label: `90×`. */
export function speedLabel(speed: ReplaySpeed): string {
  return `${compressionOf(speed)}×`;
}

/** A rest at the end before the run plays again, so the merge is not clipped. */
const REST_WEIGHT = 2.6;

export interface ReplayBeat {
  id: string;
  /** Which candidate this beat belongs to: 0 is `956be26064`, 1 is `3b9a964e7d`. */
  segment: 0 | 1;
  /** The role whose station is lit, or null for an owner beat and the rest. */
  role: Role | null;
  station: StationState;
  activity: Activity;
  face: FaceState;
  report: Report;
  /** The candidate's state in the constitution's words at this beat. */
  candidate: CandidateState | null;
  /** What the verdict slab shows. */
  verdict: Verdict;
  ownerGate: boolean;
  pose: VirgilPose;
  virgilFace: FaceState;
  /** Who holds the hop, for the ROLES reading. */
  active: string | null;
  /** Pacing only. Never a claim about how long anything took. */
  weight: number;
  /** The recorded duration of this beat, when the repository has one. */
  recordedSeconds: number | null;
  /** The recorded instant this beat's evidence is stamped with, when it has one. */
  recordedAt: Instant | null;
  /** One line of what the record says happened here. */
  what: string;
}

const idle = {
  station: 'READY' as StationState,
  activity: 'rest' as Activity,
  face: 'idle' as FaceState,
  report: '—' as Report,
};

function receiving(
  id: string,
  segment: 0 | 1,
  role: Role,
  label: string,
  candidate: CandidateState,
  verdict: Verdict,
  what: string,
  weight = 1.3,
): ReplayBeat {
  return {
    id,
    segment,
    role,
    station: 'RECEIVING',
    activity: 'receiving',
    face: 'attentive',
    report: '—',
    candidate,
    verdict,
    ownerGate: false,
    pose: 'handoff',
    virgilFace: 'attentive',
    active: label,
    weight,
    recordedSeconds: null,
    recordedAt: null,
    what,
  };
}

function working(
  id: string,
  segment: 0 | 1,
  role: Role,
  label: string,
  candidate: CandidateState,
  verdict: Verdict,
  what: string,
  recordedSeconds: number | null = null,
  weight = 2.4,
): ReplayBeat {
  return {
    id,
    segment,
    role,
    station: 'WORKING',
    activity: 'working',
    face: 'working',
    report: '—',
    candidate,
    verdict,
    ownerGate: false,
    pose: 'rest',
    virgilFace: 'attentive',
    active: label,
    weight,
    recordedSeconds,
    recordedAt: null,
    what,
  };
}

function reported(
  id: string,
  segment: 0 | 1,
  role: Role,
  label: string,
  report: Report,
  candidate: CandidateState,
  verdict: Verdict,
  face: FaceState,
  pose: VirgilPose,
  virgilFace: FaceState,
  what: string,
  recordedAt: Instant | null = null,
  weight = 1.8,
): ReplayBeat {
  return {
    id,
    segment,
    role,
    station: 'REPORTED',
    activity: 'reported',
    face,
    report,
    candidate,
    verdict,
    ownerGate: false,
    pose,
    virgilFace,
    active: label,
    weight,
    recordedSeconds: null,
    recordedAt,
    what,
  };
}

function owner(
  id: string,
  segment: 0 | 1,
  candidate: CandidateState,
  verdict: Verdict,
  what: string,
  recordedAt: Instant | null,
  ownerGate: boolean,
  weight = 2.2,
): ReplayBeat {
  return {
    id,
    segment,
    role: null,
    ...idle,
    candidate,
    verdict,
    ownerGate,
    pose: 'rest',
    virgilFace: 'idle',
    active: null,
    weight,
    recordedSeconds: null,
    recordedAt,
    what,
  };
}

const CANDIDATE_1 = CANDIDATES[0] as (typeof CANDIDATES)[number];
const CANDIDATE_2 = CANDIDATES[1] as (typeof CANDIDATES)[number];

/**
 * The run, beat by beat.
 *
 * **Every state change here is a transition the constitution's own table
 * allows** (`constitution/authority.json`, through
 * `packages/domain/src/transitions.ts`), and `test/replay.test.ts` walks
 * the whole sequence against it, the way `demo.test.ts` does for the
 * scripted demonstration. The path is:
 *
 * `BUILDING → BUILDER_REPORTED_COMPLETE → VERIFICATION_INCOMPLETE →
 * READY_FOR_REVIEW → REVIEW_IN_PROGRESS → BLOCKED → REPAIR_AUTHORISED →
 * RE_REVIEW_REQUIRED → VERIFICATION_INCOMPLETE → READY_FOR_REVIEW →
 * REVIEW_IN_PROGRESS → PASS_WITH_NON_BLOCKING_FINDINGS → SAFE_TO_MERGE →
 * MERGED`
 *
 * — which is what this run actually did, and it is legal end to end.
 */
export const REPLAY_BEATS: readonly ReplayBeat[] = [
  receiving(
    'f1-receiving',
    0,
    'fabricator',
    'Fabricator',
    'BUILDING',
    '—',
    'A TIER_2 grant on one consolidation branch, four permitted actions',
    1.4,
  ),
  working(
    'f1-working',
    0,
    'fabricator',
    'Fabricator',
    'BUILDING',
    '—',
    'Seven commits on top of the Phase 0 tip; 75 paths changed',
    BUILD_1_SECONDS,
    2.6,
  ),
  reported(
    'f1-reported',
    0,
    'fabricator',
    'Fabricator',
    'COMPLETE',
    'BUILDER_REPORTED_COMPLETE',
    '—',
    'attentive',
    'rest',
    'attentive',
    'The first candidate, 956be26064: a claim of completion, not evidence',
    CANDIDATE_1.committedAt,
    1.6,
  ),
  receiving(
    'p1-receiving',
    0,
    'prover',
    'Prover',
    'BUILDER_REPORTED_COMPLETE',
    '—',
    'The candidate handed to verification',
    1.2,
  ),
  working(
    'p1-working',
    0,
    'prover',
    'Prover',
    'VERIFICATION_INCOMPLETE',
    '—',
    'Nine deterministic checks on the final validated tree',
  ),
  reported(
    'p1-reported',
    0,
    'prover',
    'Prover',
    'PASS',
    'READY_FOR_REVIEW',
    'PASS',
    'passed',
    'nod',
    'passed',
    'All nine passed. READY FOR REVIEW is not reviewed',
    null,
    1.6,
  ),
  receiving(
    'k1-receiving',
    0,
    'keeper',
    'Keeper',
    'READY_FOR_REVIEW',
    'PASS',
    'A fresh read-only Keeper session takes the candidate',
    1.2,
  ),
  working(
    'k1-working',
    0,
    'keeper',
    'Keeper',
    'REVIEW_IN_PROGRESS',
    'PASS',
    'Ten findings raised, two of them blocking',
  ),
  reported(
    'k1-reported',
    0,
    'keeper',
    'Keeper',
    'BLOCKED',
    'BLOCKED',
    'BLOCKED',
    'blocked',
    'blocked',
    'blocked',
    'BLOCKED on KR-01 and KR-02, with every deterministic check green',
    null,
    2.4,
  ),
  owner(
    'owner-repair',
    0,
    'REPAIR_AUTHORISED',
    'BLOCKED',
    'OD-0003: one additional repair round, KR-01, KR-02, KR-04 and KR-05 only',
    null,
    false,
    2.0,
  ),
  receiving(
    'f2-receiving',
    1,
    'fabricator',
    'Fabricator',
    'REPAIR_AUTHORISED',
    'BLOCKED',
    'The repair contract: four accepted findings, and nothing else',
    1.2,
  ),
  working(
    'f2-working',
    1,
    'fabricator',
    'Fabricator',
    'REPAIR_AUTHORISED',
    'BLOCKED',
    'One commit, 25 paths; the four findings repaired with regression tests',
    null,
    2.2,
  ),
  reported(
    'f2-reported',
    1,
    'fabricator',
    'Fabricator',
    'COMPLETE',
    'RE_REVIEW_REQUIRED',
    '—',
    'attentive',
    'rest',
    'attentive',
    'A new SHA, 3b9a964e7d: a repair produces a new candidate, never a new verdict',
    CANDIDATE_2.committedAt,
    1.6,
  ),
  receiving(
    'p2-receiving',
    1,
    'prover',
    'Prover',
    'RE_REVIEW_REQUIRED',
    '—',
    'The repaired candidate handed to verification',
    1.2,
  ),
  working(
    'p2-working',
    1,
    'prover',
    'Prover',
    'VERIFICATION_INCOMPLETE',
    '—',
    'Nine checks run and three skipped, with their reasons recorded',
  ),
  reported(
    'p2-reported',
    1,
    'prover',
    'Prover',
    'PASS',
    'READY_FOR_REVIEW',
    'PASS',
    'passed',
    'nod',
    'passed',
    'Nine passed, three skipped, none of them required',
    null,
    1.6,
  ),
  receiving(
    'k2-receiving',
    1,
    'keeper',
    'Keeper',
    'READY_FOR_REVIEW',
    'PASS',
    'The second independent review, of the exact new SHA',
    1.2,
  ),
  working(
    'k2-working',
    1,
    'keeper',
    'Keeper',
    'REVIEW_IN_PROGRESS',
    'PASS',
    'KR-01, KR-02, KR-04 and KR-05 resolved; four gaps confirmed open',
  ),
  reported(
    'k2-reported',
    1,
    'keeper',
    'Keeper',
    'PASS_WITH_NON_BLOCKING_FINDINGS',
    'PASS_WITH_NON_BLOCKING_FINDINGS',
    'PASS_WITH_NON_BLOCKING_FINDINGS',
    'passed',
    'nod',
    'passed',
    'Four findings, none blocking: never a bare PASS',
    null,
    2.4,
  ),
  owner(
    'owner-gate',
    1,
    'SAFE_TO_MERGE',
    'PASS_WITH_NON_BLOCKING_FINDINGS',
    'Every merge gate passes. Eligible, and not merged: merge is the owner’s',
    null,
    true,
    2.2,
  ),
  owner(
    'owner-merged',
    1,
    'MERGED',
    'PASS_WITH_NON_BLOCKING_FINDINGS',
    'OD-0004: merged as cd0981d. The reviewed candidate is an ancestor of main',
    RUN.mergedAt,
    false,
    2.4,
  ),
  {
    id: 'rest',
    segment: 1,
    role: null,
    ...idle,
    candidate: 'MERGED',
    verdict: 'PASS_WITH_NON_BLOCKING_FINDINGS',
    ownerGate: false,
    pose: 'rest',
    virgilFace: 'idle',
    active: null,
    weight: REST_WEIGHT,
    recordedSeconds: null,
    recordedAt: RUN.completedAt,
    what: 'The run closed at 01:00 UTC. Four gaps stayed open and are open today',
  },
];

const TOTAL_WEIGHT = REPLAY_BEATS.reduce((sum, beat) => sum + beat.weight, 0);

/** How long a beat is on screen, at this speed. Playback time only. */
export function playbackSecondsOf(beat: ReplayBeat, speed: ReplaySpeed): number {
  return (beat.weight / TOTAL_WEIGHT) * PLAYBACK_SECONDS[speed];
}

/** Where each beat starts and ends on the playback clock. */
export function playbackSchedule(speed: ReplaySpeed): { beat: ReplayBeat; at: number }[] {
  let at = 0;
  return REPLAY_BEATS.map((beat) => {
    const entry = { beat, at };
    at += playbackSecondsOf(beat, speed);
    return entry;
  });
}

/** The whole replay's playback length. */
export function replayLength(speed: ReplaySpeed): number {
  return PLAYBACK_SECONDS[speed];
}

/** Which beat the playback clock is in, and how long it has been there. */
export function beatAt(seconds: number, speed: ReplaySpeed): { index: number; since: number } {
  const schedule = playbackSchedule(speed);
  for (let i = schedule.length - 1; i >= 0; i -= 1) {
    const entry = schedule[i] as { beat: ReplayBeat; at: number };
    if (seconds >= entry.at) return { index: i, since: seconds - entry.at };
  }
  return { index: 0, since: Math.max(0, seconds) };
}

// -------------------------------------------------------------- the work

/**
 * What the active station is doing, with the run's own counts.
 *
 * The schedules are spread across the beat's **playback** length, because
 * that is what the animation runs on; the counts and the names are the
 * record's. `screens/work.ts` explains why the drawing takes them as data
 * rather than reading `tally.ts`'s illustrative fixtures.
 */
function workFor(beat: ReplayBeat, playback: number): HopWork | undefined {
  const span = Math.max(0.6, playback * 0.86);
  const spread = (n: number): number[] =>
    Array.from({ length: n }, (_, i) => 0.15 + ((i + 1) / (n + 1)) * span);
  if (beat.role === 'fabricator') {
    const candidate = beat.segment === 0 ? CANDIDATE_1 : CANDIDATE_2;
    return {
      kind: 'build',
      files: spread(candidate.filesChanged),
      commits: spread(candidate.commits.length),
      counts: [
        `FILES ${candidate.filesChanged} · COMMITS ${candidate.commits.length}`,
        'A CLAIM · NOT EVIDENCE',
      ],
    };
  }
  if (beat.role === 'prover') {
    const recorded = beat.segment === 0 ? CHECKS_CANDIDATE_1 : CHECKS_CANDIDATE_2;
    const step = span / (recorded.length + 1);
    const checks = recorded.map((check, i) => ({
      start: 0.15 + i * step,
      seconds: Math.max(0.25, step * 1.6),
      result: check.result === 'failed' ? ('failed' as const) : check.result,
    }));
    const passed = recorded.filter((c) => c.result === 'passed').length;
    const skipped = recorded.filter((c) => c.result === 'skipped').length;
    const parts = [`PASSED ${passed}`, 'FAILED 0'];
    if (skipped > 0) parts.push(`SKIPPED ${skipped}`);
    return {
      kind: 'checks',
      checks,
      counts: [parts.join(' · '), `${recorded.length} CHECKS`],
    };
  }
  if (beat.role === 'keeper') {
    const recorded = beat.segment === 0 ? FINDINGS_REVIEW_1 : FINDINGS_REVIEW_2;
    const step = span / (recorded.length + 1);
    const blocking = recorded.filter((f) => f.severity === 'blocking').length;
    return {
      kind: 'review',
      findings: recorded.map((finding, i) => ({
        at: 0.2 + i * step,
        severity: finding.severity,
        line: (i + 0.5) / recorded.length,
      })),
      readSeconds: span,
      counts: [
        `FINDINGS ${recorded.length} · BLOCKING ${blocking}`,
        blocking > 0 ? 'BLOCKING · THE LINEAGE STOPS' : 'NON-BLOCKING PERSIST',
      ],
    };
  }
  return undefined;
}

const workCache = new Map<string, HopWork | undefined>();
function cachedWork(beat: ReplayBeat, playback: number): HopWork | undefined {
  const key = `${beat.id}:${playback.toFixed(3)}`;
  if (!workCache.has(key)) workCache.set(key, workFor(beat, playback));
  return workCache.get(key);
}

// ------------------------------------------------------------ the state

const REST: MemberState = { face: 'idle', activity: 'rest', station: 'READY', report: '—' };

/**
 * **Which SHA the slabs show, which is not the same as which board is up.**
 *
 * The repair round is authorised on the first candidate and does not
 * produce the second SHA until it commits. So while the repair is
 * receiving and working, the candidate under the hand is still
 * `956be26064`, and showing `3b9a964e7d` there would be a small lie of
 * exactly the kind the owner caught in V7 — a label ahead of the fact it
 * describes. The **board** clears to the repair's own rows at that moment,
 * because that is where the repair's hop is appended; the **identity**
 * follows the commit.
 */
export function shaShownAt(beat: ReplayBeat) {
  const beforeTheCommit = beat.id === 'f2-receiving' || beat.id === 'f2-working';
  return beat.segment === 1 && !beforeTheCommit ? CANDIDATE_2 : CANDIDATE_1;
}

/**
 * The deterministic evidence under the verdict on Virgil's centre slab.
 *
 * A verdict alone is a claim; these are the facts the record carries under
 * it. Every line is a count from `recordedRun.ts` — the checks that ran,
 * the findings that were raised, the merge that followed — and never an
 * illustrative figure.
 */
export function evidenceFor(beat: ReplayBeat): string[] {
  if (beat.id === 'owner-merged' || beat.id === 'rest') {
    return [
      `MERGED AS ${RUN.mergeSha.slice(0, 7)}`,
      `PULL REQUEST ${RUN.pullRequest} · OD-0004`,
      'THE REVIEWED SHA IS AN ANCESTOR OF MAIN',
    ];
  }
  if (beat.verdict === 'BLOCKED') {
    return [
      `FINDINGS ${FINDINGS_REVIEW_1.length} · BLOCKING 2`,
      'KR-01 AND KR-02 BLOCKING',
      'EVERY DETERMINISTIC CHECK WAS GREEN',
    ];
  }
  if (beat.verdict === 'PASS_WITH_NON_BLOCKING_FINDINGS') {
    return [
      `FINDINGS ${FINDINGS_REVIEW_2.length} · BLOCKING 0`,
      'KR-01 KR-02 KR-04 KR-05 RESOLVED',
      'KR-03 KR-06 KR-07 KR-09 OPEN',
    ];
  }
  if (beat.segment === 0) {
    return [
      `${CHECKS_CANDIDATE_1.length} CHECKS PASSED · 0 FAILED`,
      'TESTS 210 PASSED',
      'PROBE · NINE EXPLOITS REJECTED',
    ];
  }
  return [
    `${CHECKS_CANDIDATE_2.filter((c) => c.result === 'passed').length} CHECKS PASSED · 3 SKIPPED`,
    'TESTS 225 PASSED',
    'TETHERS 94 · 94 INTACT',
  ];
}

/**
 * The world's state at `seconds` of playback. The same `DemoState` the
 * scripted demonstration produces, so every screen, slab, face and light
 * is driven by the one path through the code — the replay feeds them
 * different content and adds no second renderer.
 */
/**
 * `claude/virgil-main-consolidation-6f5fuc` as a console rail can set it:
 * the leading segment, an ellipsis, and the six characters that make it
 * this branch and no other. Derived, never retyped.
 */
const BRANCH_SHOWN = `${RUN.branch.split('/')[0]}/…-${RUN.branch.slice(-6)}`;

export function replayAt(seconds: number, speed: ReplaySpeed, running: boolean): DemoState {
  const beat = REPLAY_BEATS[beatAt(seconds, speed).index] as ReplayBeat;
  const candidate = shaShownAt(beat);
  const cast: Record<Role, MemberState> = {
    fabricator: REST,
    prover: REST,
    keeper: REST,
  };
  if (beat.role) {
    const work = cachedWork(beat, playbackSecondsOf(beat, speed));
    cast[beat.role] = {
      face: beat.face,
      activity: beat.activity,
      station: beat.station,
      report: beat.report,
      ...(work ? { work } : {}),
    };
  }
  return {
    running,
    seconds,
    loop: 0,
    // Carried for the code paths that still ask; the replay's verdicts come
    // from each hop's own recorded report, never from an outcome.
    outcome: beat.segment === 0 ? 'BLOCKED' : 'PASS',
    mode: 'replay',
    replay: { beatId: beat.id, speed },
    pose: beat.pose,
    virgilFace: beat.virgilFace,
    cast,
    content: {
      verdict: beat.verdict,
      active: beat.active,
      candidate: beat.candidate,
      ownerGate: beat.ownerGate,
      candidateId: candidate.short,
      evidence: evidenceFor(beat),
      // The run's own duration, from the record's `startedAt` and
      // `completedAt` — not the playback clock, which is what the run
      // slab used to print here (KS4-02).
      recordedElapsed: recordedDuration(RUN_SECONDS),
      // The run's real branch, abbreviated the way every identity on these
      // rails is abbreviated and derived from `RUN.branch` so it cannot
      // drift from it. The panel prints it whole (`replayContent.ts`).
      branch: BRANCH_SHOWN,
    },
  };
}

// ------------------------------------------------------------ the ledger

/** The hops of one candidate, in the order the record puts them. */
interface ReplayHop {
  role: Role;
  glyph: string;
  label: string;
  /** The beat the hop begins at. */
  from: string;
  /** The beat it reports at. */
  to: string;
  report: Report;
  /** The recorded duration, or null when the repository has none. */
  recordedSeconds: number | null;
}

const HOPS_BY_SEGMENT: readonly (readonly ReplayHop[])[] = [
  [
    {
      role: 'fabricator',
      glyph: 'F',
      label: 'FABRICATOR',
      from: 'f1-receiving',
      to: 'f1-reported',
      report: 'COMPLETE',
      recordedSeconds: BUILD_1_SECONDS,
    },
    {
      role: 'prover',
      glyph: 'P',
      label: 'CHECKS',
      from: 'p1-receiving',
      to: 'p1-reported',
      report: 'PASS',
      recordedSeconds: null,
    },
    {
      role: 'keeper',
      glyph: 'K',
      label: 'REVIEW',
      from: 'k1-receiving',
      to: 'k1-reported',
      report: 'BLOCKED',
      recordedSeconds: null,
    },
  ],
  [
    {
      role: 'fabricator',
      glyph: 'F',
      label: 'REPAIR',
      from: 'f2-receiving',
      to: 'f2-reported',
      report: 'COMPLETE',
      recordedSeconds: null,
    },
    {
      role: 'prover',
      glyph: 'P',
      label: 'CHECKS',
      from: 'p2-receiving',
      to: 'p2-reported',
      report: 'PASS',
      recordedSeconds: null,
    },
    {
      role: 'keeper',
      glyph: 'K',
      label: 'REVIEW',
      from: 'k2-receiving',
      to: 'k2-reported',
      report: 'PASS_WITH_NON_BLOCKING_FINDINGS',
      recordedSeconds: null,
    },
  ],
];

const INDEX_OF = new Map(REPLAY_BEATS.map((beat, i) => [beat.id, i]));

/**
 * The board at `seconds` of playback: one row per hop of the candidate on
 * the board, appended when the hop starts and never rewritten.
 *
 * **The time column is recorded time, never playback time.** A hop with a
 * duration in the repository shows it; the other eight show `NOT
 * RECORDED`, and no bar is drawn for them, because a bar is a length and a
 * length would be a claim.
 */
export function replayLedgerAt(seconds: number, speed: ReplaySpeed): LedgerRow[] {
  const schedule = playbackSchedule(speed);
  const current = REPLAY_BEATS[beatAt(seconds, speed).index] as ReplayBeat;
  const here = INDEX_OF.get(current.id) as number;
  const hops = HOPS_BY_SEGMENT[current.segment] as readonly ReplayHop[];
  const rows: LedgerRow[] = [];
  for (const hop of hops) {
    const from = INDEX_OF.get(hop.from) as number;
    const to = INDEX_OF.get(hop.to) as number;
    if (here < from) continue;
    const done = here >= to;
    // `startedAt` and `endedAt` are **playback** seconds, and are used for
    // nothing but the seal's animation: the mark closes over the same
    // `RETURNING` window the console and the verdict slab use, so the beat
    // and the record are one event. The row's *recorded* time is the
    // `recorded` field below, and the two are never mixed.
    rows.push({
      role: hop.role,
      glyph: hop.glyph,
      label: hop.label,
      startedAt: (schedule[from] as { at: number }).at,
      endedAt: done ? (schedule[to] as { at: number }).at : null,
      report: done ? hop.report : null,
      recorded: {
        seconds: hop.recordedSeconds,
        text: hop.recordedSeconds === null ? 'NOT RECORDED' : recordedDuration(hop.recordedSeconds),
      },
    });
  }
  return rows;
}

/** The longest recorded hop, for the one bar the board can honestly draw. */
export const LONGEST_RECORDED_HOP = BUILD_1_SECONDS;

/** Which recorded window a hop's row sits in, for the panel. */
export function hopsOf(segment: 0 | 1): readonly ReplayHop[] {
  return HOPS_BY_SEGMENT[segment] as readonly ReplayHop[];
}

/** The beat a ledger row belongs to, so a click on a row opens that hop. */
export function beatForRow(seconds: number, speed: ReplaySpeed, row: number): ReplayBeat | null {
  const current = REPLAY_BEATS[beatAt(seconds, speed).index] as ReplayBeat;
  const rows = replayLedgerAt(seconds, speed);
  const hit = rows[row];
  if (!hit) return null;
  const hops = HOPS_BY_SEGMENT[current.segment] as readonly ReplayHop[];
  const hop = hops.find((h) => h.role === hit.role && h.label === hit.label);
  if (!hop) return null;
  const at = INDEX_OF.get(hop.to) as number;
  return REPLAY_BEATS[at] as ReplayBeat;
}

/** The beat the panel should describe: the one on screen now. */
export function currentBeat(seconds: number, speed: ReplaySpeed): ReplayBeat {
  return REPLAY_BEATS[beatAt(seconds, speed).index] as ReplayBeat;
}

export { BUILD_1_FROM, BUILD_1_SECONDS, type Outcome, RUN_SECONDS };
