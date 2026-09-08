import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import type { Activity } from '../characters/Figure.js';
import type { VirgilPose } from '../characters/VirgilRigged.js';
import type { FaceState } from '../characters/Visor.js';
import type { ScreenContent } from '../screens/ScreenBank.js';
import type { Role } from './cast.js';

/**
 * A scripted demonstration, thirty seconds, looping, through the three
 * hops the constitution describes: Virgil hands off to the Fabricator, who
 * builds and **reports complete** (a claim, never evidence —
 * `.claude/agents/fabricator.md`); Virgil hands off to the Prover, who
 * runs checks and returns a verdict; on a PASS the Keeper reviews and
 * returns his; Virgil reacts — a nod on a PASS, and on a BLOCKED, for the
 * first time, the **refusal**: `Angry_Ground_Stomp`.
 *
 * **Nothing behind this is real.** No event, no check, no review drives it;
 * it is a timeline of fixed numbers, and every surface it touches says so —
 * the badge on the page, the ILLUSTRATIVE band on every screen, and the
 * owner document. Alternate loops end in PASS and BLOCKED so the blocked
 * state is seen.
 */
export type StationState = 'READY' | 'RECEIVING' | 'WORKING' | 'REPORTED';
/** What a station reports. COMPLETE is the Fabricator's claim, not a verdict. */
export type Report = 'PASS' | 'BLOCKED' | 'COMPLETE' | '—';

export interface MemberState {
  face: FaceState;
  activity: Activity;
  station: StationState;
  report: Report;
}

export interface DemoState {
  running: boolean;
  seconds: number;
  loop: number;
  pose: VirgilPose;
  virgilFace: FaceState;
  cast: Record<Role, MemberState>;
  content: ScreenContent;
}

export const DEMO_LENGTH = 30;

const IDLE: MemberState = { face: 'idle', activity: 'rest', station: 'READY', report: '—' };

export function demoAt(seconds: number, loop: number, running: boolean): DemoState {
  const outcome: 'PASS' | 'BLOCKED' = loop % 2 === 0 ? 'PASS' : 'BLOCKED';
  const base: DemoState = {
    running,
    seconds,
    loop,
    pose: 'rest',
    virgilFace: 'idle',
    cast: { fabricator: IDLE, prover: IDLE, keeper: IDLE },
    content: { verdict: '—', active: null, phase: 'READY' },
  };
  if (!running) return base;
  const at = (overrides: Partial<DemoState>, cast: Partial<Record<Role, MemberState>>) => ({
    ...base,
    ...overrides,
    cast: { ...base.cast, ...cast },
  });
  if (seconds < 2.5) return base;
  // Hand-off to the Fabricator.
  if (seconds < 5.5) {
    return at(
      {
        pose: 'handoff',
        virgilFace: 'attentive',
        content: { verdict: '—', active: 'Fabricator', phase: 'HAND-OFF' },
      },
      {
        fabricator: { face: 'attentive', activity: 'receiving', station: 'RECEIVING', report: '—' },
      },
    );
  }
  // The Fabricator builds.
  if (seconds < 10) {
    return at(
      {
        virgilFace: 'attentive',
        content: { verdict: '—', active: 'Fabricator', phase: 'BUILD' },
      },
      { fabricator: { face: 'working', activity: 'working', station: 'WORKING', report: '—' } },
    );
  }
  // The Fabricator reports complete: a claim, shown in ice, not a verdict.
  if (seconds < 12) {
    return at(
      {
        virgilFace: 'attentive',
        content: { verdict: '—', active: 'Fabricator', phase: 'CLAIMED' },
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
  if (seconds < 15) {
    return at(
      {
        pose: 'handoff',
        virgilFace: 'attentive',
        content: { verdict: '—', active: 'Prover', phase: 'HAND-OFF' },
      },
      { prover: { face: 'attentive', activity: 'receiving', station: 'RECEIVING', report: '—' } },
    );
  }
  // The Prover verifies.
  if (seconds < 20) {
    return at(
      {
        virgilFace: 'attentive',
        content: { verdict: '—', active: 'Prover', phase: 'VERIFY' },
      },
      { prover: { face: 'working', activity: 'working', station: 'WORKING', report: '—' } },
    );
  }
  // The Prover's verdict. On a BLOCKED the loop ends here with the refusal.
  if (outcome === 'BLOCKED') {
    if (seconds < 24) {
      return at(
        {
          pose: 'blocked',
          virgilFace: 'blocked',
          content: { verdict: 'BLOCKED', active: null, phase: 'VERDICT' },
        },
        {
          prover: { face: 'blocked', activity: 'reported', station: 'REPORTED', report: 'BLOCKED' },
        },
      );
    }
    return base;
  }
  if (seconds < 22) {
    return at(
      {
        pose: 'nod',
        virgilFace: 'passed',
        content: { verdict: 'PASS', active: null, phase: 'VERDICT' },
      },
      { prover: { face: 'passed', activity: 'reported', station: 'REPORTED', report: 'PASS' } },
    );
  }
  // The Keeper reviews.
  if (seconds < 24) {
    return at(
      {
        virgilFace: 'attentive',
        content: { verdict: 'PASS', active: 'Keeper', phase: 'REVIEW' },
      },
      {
        prover: { face: 'idle', activity: 'reported', station: 'REPORTED', report: 'PASS' },
        keeper: { face: 'attentive', activity: 'receiving', station: 'RECEIVING', report: '—' },
      },
    );
  }
  if (seconds < 27.5) {
    return at(
      {
        virgilFace: 'attentive',
        content: { verdict: 'PASS', active: 'Keeper', phase: 'REVIEW' },
      },
      {
        prover: { face: 'idle', activity: 'reported', station: 'REPORTED', report: 'PASS' },
        keeper: { face: 'working', activity: 'working', station: 'WORKING', report: '—' },
      },
    );
  }
  return at(
    {
      pose: 'nod',
      virgilFace: 'passed',
      content: { verdict: 'PASS', active: null, phase: 'REVIEWED' },
    },
    {
      prover: { face: 'idle', activity: 'reported', station: 'REPORTED', report: 'PASS' },
      keeper: { face: 'passed', activity: 'reported', station: 'REPORTED', report: 'PASS' },
    },
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
        content: { verdict: '—', active: 'Prover', phase: 'HAND-OFF' },
      };
    case 'working':
      return {
        ...base,
        virgilFace: 'working',
        cast: all({ face: 'working', activity: 'working', station: 'WORKING', report: '—' }),
        content: { verdict: '—', active: 'Prover', phase: 'VERIFY' },
      };
    case 'passed':
      return {
        ...base,
        virgilFace: 'passed',
        cast: all({ face: 'passed', activity: 'reported', station: 'REPORTED', report: 'PASS' }),
        content: { verdict: 'PASS', active: null, phase: 'VERDICT' },
      };
    case 'blocked':
      return {
        ...base,
        pose: 'blocked',
        virgilFace: 'blocked',
        cast: all({
          face: 'blocked',
          activity: 'reported',
          station: 'REPORTED',
          report: 'BLOCKED',
        }),
        content: { verdict: 'BLOCKED', active: null, phase: 'VERDICT' },
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
 * Advances the demo clock on the render loop and returns the current state;
 * re-renders React only when a phase boundary is crossed.
 */
export function useDemo(running: boolean): DemoState {
  const clock = useRef({ t: 0, loop: 0 });
  const [state, setState] = useState<DemoState>(() => demoAt(0, 0, running));
  useFrame((_, delta) => {
    if (!running) {
      if (state.running) setState(demoAt(0, 0, false));
      return;
    }
    clock.current.t += delta;
    if (clock.current.t >= DEMO_LENGTH) {
      clock.current.t -= DEMO_LENGTH;
      clock.current.loop += 1;
    }
    const next = demoAt(clock.current.t, clock.current.loop, true);
    if (
      next.pose !== state.pose ||
      next.virgilFace !== state.virgilFace ||
      memberChanged(next.cast.fabricator, state.cast.fabricator) ||
      memberChanged(next.cast.prover, state.cast.prover) ||
      memberChanged(next.cast.keeper, state.cast.keeper) ||
      next.content.verdict !== state.content.verdict ||
      next.content.active !== state.content.active ||
      next.content.phase !== state.content.phase ||
      next.running !== state.running
    ) {
      setState(next);
    }
  });
  return state;
}
