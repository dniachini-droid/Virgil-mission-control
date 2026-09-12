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

/**
 * **`null` means a live page that has read nothing yet — `KP10-13`.**
 *
 * This began as `demoAt(0, 0, false)`: the recording at its first frame, held
 * as the initial value so the panel always had something to draw. On the
 * recording that is correct. On the hosted build it was the defect the whole
 * slice exists to prevent.
 *
 * `MobileRoom` computes a live state and **returns before publishing it** while
 * it is null — correctly, because a live page with nothing read must draw no
 * world. But the store kept its initial value, so tapping *"Talk to Virgil"*
 * opened a window carrying `mode: 'demo'` and the reviewer read this, on the
 * deployed site, while the page's own notice said it had read nothing:
 *
 * > Good evening. No work has started. I'll tell you who has it, what the
 * > checks found, what the review found and whether you need to decide.
 *
 * Not one line of that is a fact about the owner's repository. Every guard in
 * the slice — the Fabricator's and Keeper's windows refusing the recording on
 * live, `liveVirgilThread` drawing only what the file holds, the browser's
 * third re-validation — checks a **live** state. There was no live state here
 * to check; there was the recording.
 *
 * And it was not only a race. An endpoint answering 500 leaves the page in that
 * condition permanently: the notice says the repository could not be read while
 * one press away the window narrates the project.
 *
 * So the store can hold nothing, and a surface with nothing says so.
 */
let current: DemoState | null = demoAt(0, 0, false);
const listeners = new Set<() => void>();

function announce(): void {
  for (const listener of listeners) listener();
}

export function publishDemoState(state: DemoState): void {
  if (state === current) return;
  current = state;
  announce();
}

/**
 * **A live page that has read nothing publishes that fact.**
 *
 * The counterpart to `publishDemoState`, and the repair for `KP10-13`. It is
 * deliberately not "publish an empty live state": a state built from
 * `demoAt` carries the recording's candidate id, its commits and its checks,
 * and handing that to a window with `mode: 'live'` would be `KP8-02` — a live
 * page drawing `9abcdef` beside a real branch name.
 *
 * Nothing is nothing. The surfaces say so.
 */
export function publishNothingRead(): void {
  if (current === null) return;
  current = null;
  announce();
}

export function demoSnapshot(): DemoState | null {
  return current;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The current demonstration state, for a DOM component. */
export function useDemoState(): DemoState | null {
  return useSyncExternalStore(subscribe, demoSnapshot, demoSnapshot);
}
