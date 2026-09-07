import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import type { VirgilPose } from '../characters/VirgilRigged.js';
import type { FaceState } from '../characters/Visor.js';
import type { ScreenContent } from '../screens/ScreenBank.js';

/**
 * A scripted demonstration, twenty seconds, looping: Virgil surveys, turns
 * toward the Prover, hands off with `Agree_Gesture`, the station lights and
 * the Prover's face goes to working, a verdict returns, Virgil reacts, reset.
 *
 * **Nothing behind this is real.** No event, no check, no review drives it;
 * it is a timeline of fixed numbers, and every surface it touches says so —
 * the badge on the page, the ILLUSTRATIVE label on every screen, and the
 * owner document. It exists to show what the product does, with only what
 * exists today. Alternate loops end in PASS and BLOCKED so the blocked state
 * is seen, expressed through face, light and colour (no refusal clip exists).
 */
export interface DemoState {
  running: boolean;
  seconds: number;
  loop: number;
  pose: VirgilPose;
  virgilFace: FaceState;
  proverFace: FaceState;
  stationState: string;
  content: ScreenContent;
}

export const DEMO_LENGTH = 20;

export function demoAt(seconds: number, loop: number, running: boolean): DemoState {
  const outcome = loop % 2 === 0 ? 'PASS' : 'BLOCKED';
  const base: DemoState = {
    running,
    seconds,
    loop,
    pose: 'idle',
    virgilFace: 'idle',
    proverFace: 'idle',
    stationState: 'READY',
    content: { verdict: '—', active: null, phase: 'build · illustrative' },
  };
  if (!running) return base;
  if (seconds < 4) return base;
  if (seconds < 7) {
    return { ...base, pose: 'look', virgilFace: 'attentive', stationState: 'READY' };
  }
  if (seconds < 10) {
    return {
      ...base,
      pose: 'handoff',
      virgilFace: 'attentive',
      proverFace: 'attentive',
      stationState: 'RECEIVING',
      content: { verdict: '—', active: 'Prover', phase: 'hand-off · illustrative' },
    };
  }
  if (seconds < 16) {
    return {
      ...base,
      pose: 'handoff',
      virgilFace: 'attentive',
      proverFace: 'working',
      stationState: 'WORKING',
      content: { verdict: '—', active: 'Prover', phase: 'verification · illustrative' },
    };
  }
  if (seconds < 19) {
    const face: FaceState = outcome === 'PASS' ? 'passed' : 'blocked';
    return {
      ...base,
      pose: 'idle',
      virgilFace: face,
      proverFace: face,
      stationState: 'REPORTED',
      content: { verdict: outcome, active: null, phase: 'verdict · illustrative' },
    };
  }
  return base;
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
      next.proverFace !== state.proverFace ||
      next.stationState !== state.stationState ||
      next.content.verdict !== state.content.verdict ||
      next.content.active !== state.content.active ||
      next.running !== state.running
    ) {
      setState(next);
    }
  });
  return state;
}
