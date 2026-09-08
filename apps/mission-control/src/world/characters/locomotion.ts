/**
 * How a character moves between their two facings.
 *
 * V8 (`docs/process/PHASE_1_STYLISED_SPEC.md` §0.10.8). The owner: "have
 * each agent at the console, sightly to the left so it doesnt obstruct
 * the screens, faciung forward. When they get sent work, an animation
 * plays on their face/eyes and they turn aroundfacing the screeen. When
 * its done, they turn aroiund and face the front again." So the move is
 * a **turn in place** on one axis — no rig, no walk clip; the three
 * walking rigs the owner has pending are not needed for this — and it
 * has to read as *deliberate*, not mechanical: it eases in and out,
 * overshoots the facing by a few degrees and settles, and the breathing
 * (`breathing.ts`) continues through it, added on top by `Figure.tsx`.
 *
 * The rotation follows the step response of an underdamped second-order
 * system (`settle`): it starts from rest with no velocity, accelerates,
 * decelerates through the target, overshoots by `OVERSHOOT` of the way
 * and settles — which is what a body turning under its own weight does,
 * and why it does not look like a tween. The position, when the two poses
 * differ, follows a plain smoothstep. Pure, so `test/locomotion.test.ts`
 * can hold it: a turn starts where it is, arrives exactly where it is
 * sent, never jumps when re-sent midway, overshoots once by no more than
 * the recorded amount, and reports `moving` only while it moves.
 *
 * The `Locomotion` interface is the seam V7 left for walking. It stays:
 * a mover that walks between two positions drops in here unchanged.
 */

export interface Pose {
  position: [number, number, number];
  rotationY: number;
}

export interface Locomotion {
  /** The pose this frame, `dt` seconds on, heading for `target`. */
  update(dt: number, target: Pose): { pose: Pose; moving: boolean };
  /** Where it is now. */
  readonly pose: Pose;
}

/** Smoothstep: no velocity at either end, which is what a settle looks like. */
export const ease = (t: number) => t * t * (3 - 2 * t);

/** The damping ratio of the turn: 0.7 overshoots by about 4.6 % and settles in one swing. */
const DAMPING = 0.7;
/** The natural frequency, chosen so a `TURN_SECONDS` turn is within 0.5 % of settled at its end. */
const OMEGA = 5;
/** How long a turn takes, whatever its angle. */
export const TURN_SECONDS = 1.6;
/** The most the turn overshoots its target, as a fraction of the way: the peak of `settle`. */
export const OVERSHOOT = Math.exp((-DAMPING * Math.PI) / Math.sqrt(1 - DAMPING * DAMPING));

/**
 * The step response of an underdamped second-order system at time `t`
 * (seconds): 0 at rest, rising to 1 with one overshoot of `OVERSHOOT`,
 * settling. Velocity is zero at t = 0.
 */
export function settle(t: number): number {
  if (t <= 0) return 0;
  const wd = OMEGA * Math.sqrt(1 - DAMPING * DAMPING);
  const decay = Math.exp(-DAMPING * OMEGA * t);
  return (
    1 - decay * (Math.cos(wd * t) + (DAMPING / Math.sqrt(1 - DAMPING * DAMPING)) * Math.sin(wd * t))
  );
}

const same = (a: Pose, b: Pose) =>
  a.position[0] === b.position[0] &&
  a.position[1] === b.position[1] &&
  a.position[2] === b.position[2] &&
  a.rotationY === b.rotationY;

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/**
 * The pose `k` of the way from `from` to `to`, `k` in seconds over
 * `TURN_SECONDS`: the position on a smoothstep, the rotation on the
 * spring — so it overshoots and settles — taking the short way round.
 */
export function turnPose(from: Pose, to: Pose, seconds: number, duration = TURN_SECONDS): Pose {
  if (seconds >= duration) return to;
  const t = Math.min(1, Math.max(0, seconds / duration));
  const e = ease(t);
  const s = settle(t * duration);
  let dr = to.rotationY - from.rotationY;
  dr = Math.atan2(Math.sin(dr), Math.cos(dr));
  return {
    position: [
      lerp(from.position[0], to.position[0], e),
      lerp(from.position[1], to.position[1], e),
      lerp(from.position[2], to.position[2], e),
    ],
    rotationY: from.rotationY + dr * s,
  };
}

/**
 * The turn: from wherever it is to the target in `seconds`, with the
 * spring's overshoot and settle. A new target midway restarts from the
 * current pose, so there is never a jump. An infinite step (reduced
 * motion) is an instant move.
 */
export function turn(start: Pose, seconds = TURN_SECONDS): Locomotion {
  let from: Pose = start;
  let to: Pose = start;
  let elapsed = seconds;
  let current: Pose = start;
  return {
    get pose() {
      return current;
    },
    update(dt, target) {
      if (!same(target, to)) {
        from = current;
        to = target;
        elapsed = 0;
      }
      if (elapsed >= seconds) {
        current = to;
        return { pose: current, moving: false };
      }
      elapsed = Math.min(seconds, elapsed + Math.max(0, dt));
      current = elapsed >= seconds ? to : turnPose(from, to, elapsed, seconds);
      return { pose: current, moving: elapsed < seconds };
    },
  };
}

/** The behaviour the set uses. A walk-clip mover drops in here. */
export const createLocomotion: (start: Pose, seconds?: number) => Locomotion = turn;
