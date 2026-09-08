/**
 * How a character gets from where they idle to where they work.
 *
 * V7 (`docs/process/PHASE_1_STYLISED_SPEC.md` §0.7): the owner is sending
 * rigged Fabricator, Prover and Keeper with walk clips, later, so that
 * agents can idle standing aside and walk up to their panel when a job
 * starts. Not built yet — the files have not arrived — but the seam is:
 * a station has an **idle** position and a **working** position
 * (`cast.ts`), and the move between them is **one swappable behaviour**,
 * a `Locomotion`. `glide` is the placeholder, a procedural ease with no
 * legs; a walk-clip mover replaces `createLocomotion` and nothing
 * upstream changes — `Figure.tsx` only asks for this frame's pose and
 * whether the character is still moving (which is what selects the clip).
 *
 * Pure, so `test/locomotion.test.ts` can hold it: a glide starts where it
 * is, arrives exactly where it is sent, never jumps when re-sent midway,
 * and reports `moving` only while it moves.
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

const same = (a: Pose, b: Pose) =>
  a.position[0] === b.position[0] &&
  a.position[1] === b.position[1] &&
  a.position[2] === b.position[2] &&
  a.rotationY === b.rotationY;

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** The pose `k` of the way (eased) from `from` to `to`. */
export function glidePose(from: Pose, to: Pose, k: number): Pose {
  const e = ease(Math.min(1, Math.max(0, k)));
  return {
    position: [
      lerp(from.position[0], to.position[0], e),
      lerp(from.position[1], to.position[1], e),
      lerp(from.position[2], to.position[2], e),
    ],
    rotationY: lerp(from.rotationY, to.rotationY, e),
  };
}

/**
 * The placeholder: a glide taking `seconds` from wherever it is to the
 * target. A new target midway restarts the glide from the current pose,
 * so there is never a jump.
 */
export function glide(start: Pose, seconds = 1.4): Locomotion {
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
      current = glidePose(from, to, elapsed / seconds);
      return { pose: current, moving: elapsed < seconds };
    },
  };
}

/** The behaviour the set uses. A walk-clip mover drops in here. */
export const createLocomotion: (start: Pose, seconds?: number) => Locomotion = glide;
