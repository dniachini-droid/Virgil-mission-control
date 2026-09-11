import { useSyncExternalStore } from 'react';
import type { DemoState } from '../room/demo.js';
import { demoAt } from '../room/demo.js';

/**
 * The demonstration's current state, readable from outside the canvas.
 *
 * The panel is DOM, not three.js, and the owner's decision requires it to
 * render **complete before the camera flight starts**
 * (`docs/process/PHASE_1_CONVERSATION_INTERFACE.md` §5b): *"tapping a
 * screen opens the panel straight away and takes you there — but the panel
 * opens up so you can see it instantly, while you are being taken there."*
 * So the panel cannot be a child of `<Canvas>` and cannot wait on a frame.
 *
 * It also must not make the scene re-render. Lifting the demonstration's
 * state into `VirgilRoom`'s own React state would put a `setState` from
 * inside `useFrame` above the canvas and re-render every mesh on every
 * phase boundary. This is the smallest thing that avoids both: a module
 * store the cast writes and the panel subscribes to, so a beat change
 * re-renders the panel and nothing else.
 *
 * It holds no operational value: the demonstration is scripted, every
 * number in it is fixed, and the panel says so on its own band.
 */

let current: DemoState = demoAt(0, 0, false);
const listeners = new Set<() => void>();

export function publishDemoState(state: DemoState): void {
  if (state === current) return;
  current = state;
  for (const listener of listeners) listener();
}

export function demoSnapshot(): DemoState {
  return current;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The current demonstration state, for a DOM component. */
export function useDemoState(): DemoState {
  return useSyncExternalStore(subscribe, demoSnapshot, demoSnapshot);
}
