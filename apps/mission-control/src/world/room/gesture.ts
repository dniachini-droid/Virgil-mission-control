/**
 * **A tap, told apart from a drag, a pinch and a wheel** (V10, defect A).
 *
 * The owner, using V9 on real hardware: *"the opening of the windows is
 * way too sensitive. Ie when I'm trying to scroll and move the camera or
 * zoom in, a window opens."*
 *
 * The cause is not a threshold set too low; there was no threshold.
 * React Three Fiber's `onClick` fires on the pointer-up whose press began
 * on the same object, with no regard for how far the pointer travelled,
 * how long it was down, whether a second finger joined it or whether the
 * wheel turned in between. Orbiting the camera starts and ends on the
 * same screen, so orbiting opened that screen's document — every time.
 *
 * So a press is recorded when it begins and interrogated when it ends,
 * and a handler in the world asks `wasTap()` before it acts. A tap is a
 * press that
 *
 *  - moved less than `TAP_SLOP` CSS pixels from where it went down,
 *  - lasted less than `TAP_MS`,
 *  - was the only pointer down at any moment of it,
 *  - had no wheel turn during it, and
 *  - did not move the camera: the world's own view is sampled at the
 *    press and compared at the release, because the surest evidence that
 *    a gesture was navigation is that it navigated.
 *
 * The state is not cleared on pointer-up. It is cleared on the next
 * pointer-down, so that a handler running during the up — which is when
 * React Three Fiber dispatches its click — still sees the press that has
 * just finished, whatever order the listeners happen to run in.
 *
 * Nothing here decides *what* opens; `VirgilRoom` and the screens do. It
 * decides only whether a gesture was a tap, and it is deliberately a
 * plain module rather than a hook so that a raycast handler deep in the
 * scene can ask it without threading state through the tree.
 */

/** How far a pointer may travel and still be a tap, in CSS pixels. */
export const TAP_SLOP = 6;
/** How long a press may last and still be a tap, in milliseconds. */
export const TAP_MS = 400;
/**
 * How far the camera may drift during a press and still leave it a tap,
 * in metres. Damping keeps the camera easing for a moment after a fling,
 * and a still finger is not navigation; five millimetres at the two-metre
 * viewing distance of this set is under a fifth of a degree.
 */
export const CAMERA_SLOP = 0.005;

interface Press {
  x: number;
  y: number;
  at: number;
  /** The furthest the pointer has been from where it went down. */
  moved: number;
  /** How many pointers have been down at once during this press. */
  most: number;
  /** When the pointer came up, or 0 while it is still down. */
  upAt: number;
  /** A wheel turned during this press. */
  wheeled: boolean;
  /** Where the camera was when the press began, when the world offers it. */
  camera: readonly number[] | null;
  /** How far the camera has moved since, as the world last reported it. */
  cameraMoved: number;
}

const NO_PRESS: Press = {
  x: 0,
  y: 0,
  at: 0,
  moved: Number.POSITIVE_INFINITY,
  most: 0,
  upAt: 0,
  wheeled: true,
  camera: null,
  cameraMoved: Number.POSITIVE_INFINITY,
};

let press: Press = NO_PRESS;
const down = new Set<number>();
/** Set by the rig each frame, so a press can be compared against the view. */
let cameraNow: readonly number[] | null = null;

/** The rig publishes the camera here; six numbers, position then target. */
export function reportCamera(values: readonly number[]): void {
  cameraNow = values;
  // Only while the finger is down. Damping keeps the view easing for
  // about a second after a fling, and counting that tail would refuse the
  // tap that follows an orbit — which is a real press, made after the
  // gesture ended. The question is whether *this press* navigated.
  if (press.camera && press.upAt === 0) {
    let sum = 0;
    for (let i = 0; i < press.camera.length && i < values.length; i += 1) {
      const d = (values[i] as number) - (press.camera[i] as number);
      sum += d * d;
    }
    press.cameraMoved = Math.sqrt(sum);
  }
}

function onDown(event: PointerEvent): void {
  down.add(event.pointerId);
  if (down.size > 1) {
    // A second finger joins: whatever this becomes, it is not a tap.
    press.most = down.size;
    return;
  }
  press = {
    x: event.clientX,
    y: event.clientY,
    at: performance.now(),
    moved: 0,
    most: 1,
    upAt: 0,
    wheeled: false,
    camera: cameraNow ? [...cameraNow] : null,
    cameraMoved: 0,
  };
}

function onMove(event: PointerEvent): void {
  if (down.size === 0) return;
  const dx = event.clientX - press.x;
  const dy = event.clientY - press.y;
  press.moved = Math.max(press.moved, Math.hypot(dx, dy));
}

function onUp(event: PointerEvent): void {
  // The press itself is kept: a handler asking during this very up must
  // see it. Only the set of live pointers is cleared.
  down.delete(event.pointerId);
  // **When the finger lifted, not when the handler ran.** The two are the
  // same on quick hardware and are not on slow: React Three Fiber does its
  // raycast during the up, behind whatever the renderer is doing, and in
  // the software-rendered capture container a tap measured 845 ms from
  // press to handler. Timing the gesture by the handler's clock would make
  // the rule depend on the frame rate, which is exactly the mistake that
  // put a threshold in the wrong place to begin with.
  if (press.upAt === 0) press.upAt = event.timeStamp || performance.now();
}

function onWheel(): void {
  press.wheeled = true;
}

/**
 * Whether the press that has just ended (or is ending now) was a tap.
 *
 * Called from a click handler in the scene. Pure with respect to the
 * world: it reads the record and changes nothing.
 */
export function wasTap(): boolean {
  const held = (press.upAt === 0 ? performance.now() : press.upAt) - press.at;
  return (
    press.most === 1 &&
    press.moved <= TAP_SLOP &&
    held <= TAP_MS &&
    !press.wheeled &&
    press.cameraMoved <= CAMERA_SLOP
  );
}

/** What the last press looked like. For tests and for the run record. */
export function lastPress(): Readonly<Press> {
  return press;
}

/** Listens on the window, so no element can swallow the record. */
export function watchGestures(): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener('pointerdown', onDown, { capture: true });
  window.addEventListener('pointermove', onMove, { capture: true });
  window.addEventListener('pointerup', onUp, { capture: true });
  window.addEventListener('pointercancel', onUp, { capture: true });
  window.addEventListener('wheel', onWheel, { capture: true, passive: true });
  return () => {
    window.removeEventListener('pointerdown', onDown, { capture: true });
    window.removeEventListener('pointermove', onMove, { capture: true });
    window.removeEventListener('pointerup', onUp, { capture: true });
    window.removeEventListener('pointercancel', onUp, { capture: true });
    window.removeEventListener('wheel', onWheel, { capture: true });
  };
}

/** For tests: forget everything, as though the page had just loaded. */
export function resetGestures(): void {
  press = NO_PRESS;
  down.clear();
  cameraNow = null;
}

/**
 * For tests: replay a gesture without a browser. The events are the ones
 * the window would deliver, in order.
 */
export function feedGesture(
  events: (
    | { type: 'down'; id?: number; x: number; y: number }
    | { type: 'move'; x: number; y: number }
    | { type: 'up'; id?: number }
    | { type: 'wheel' }
    | { type: 'camera'; values: readonly number[] }
  )[],
): void {
  for (const event of events) {
    switch (event.type) {
      case 'down':
        onDown({ pointerId: event.id ?? 1, clientX: event.x, clientY: event.y } as PointerEvent);
        break;
      case 'move':
        onMove({ clientX: event.x, clientY: event.y } as PointerEvent);
        break;
      case 'up':
        onUp({ pointerId: event.id ?? 1, timeStamp: performance.now() } as PointerEvent);
        break;
      case 'wheel':
        onWheel();
        break;
      default:
        reportCamera(event.values);
        break;
    }
  }
}
