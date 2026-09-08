import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import type { DemoState } from '../room/demo.js';
import { demoStart } from '../room/demo.js';
import { type ReplaySpeed, replayAt, replayLength } from './replayTimeline.js';

/**
 * The replay's clock, on the render loop.
 *
 * It is `useDemo`'s twin and deliberately so: the same per-frame advance,
 * the same 0.1 s cap so a slow frame skips no beat, the same
 * `#/?demo=<seconds>` entry point, and the same `window.__virgilDemo`
 * publication — the captures poll that object and seek on it, because the
 * clock advances per rendered frame and wall-clock waiting never reaches a
 * beat.
 *
 * `seconds` here is **playback** time and nothing else. It never appears
 * as a duration of the recorded work; `recordedRun.ts` owns those, and
 * where the repository has none the surfaces say `NOT RECORDED`.
 */
export function useReplay(running: boolean, speed: ReplaySpeed): DemoState {
  const clock = useRef(demoStart());
  const [state, setState] = useState<DemoState>(() => replayAt(clock.current.t, speed, running));
  const shown = useRef({ beat: '', speed: '' });
  useFrame((_, delta) => {
    if (!running) {
      if (state.running) setState(replayAt(0, speed, false));
      return;
    }
    clock.current.t += Math.min(delta, 0.1);
    const length = replayLength(speed);
    if (clock.current.t >= length) {
      clock.current.t -= length;
      clock.current.loop += 1;
    }
    (window as Window & { __virgilDemo?: { seconds: number; loop: number } }).__virgilDemo = {
      seconds: clock.current.t,
      loop: clock.current.loop,
    };
    const next = replayAt(clock.current.t, speed, true);
    // React re-renders on a beat boundary or a speed change, never per
    // frame: the canvases carry their own clocks from there.
    const beat = next.replay?.beatId ?? '';
    if (shown.current.beat !== beat || shown.current.speed !== speed || !state.running) {
      shown.current = { beat, speed };
      setState(next);
    }
  });
  return state;
}
