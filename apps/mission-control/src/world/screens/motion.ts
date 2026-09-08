/**
 * The motion vocabulary of the screens: easings with weight, staggers,
 * and a deterministic scatter.
 *
 * V8 (`docs/process/PHASE_1_STYLISED_SPEC.md` §0.10.6). The owner, three
 * times, of the screen animations: "they look a little basic … not
 * something that is basic clip art that is animated"; "make the
 * animations more... futeristic. put work into those animations, make it
 * look detailed." Not more content — the answer is in the qualities that
 * make interface motion read as engineered rather than decorated: easing
 * that is not linear; motion that has weight and settles rather than
 * snapping to a stop; elements that arrive in sequence rather than all at
 * once; secondary motion that follows primary motion a beat later. These
 * are those qualities as functions, so every drawing uses the same ones
 * and `test/screen-motion.test.ts` can hold their shape. **This reverses
 * §4's "stepped and snappy"**, by the owner's later direction.
 *
 * Everything here is pure and deterministic in `t`, so the same second
 * of a loop draws the same frame on every machine.
 */

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Cubic ease-out: fast start, long settle. */
export const easeOut = (t: number) => 1 - (1 - clamp01(t)) ** 3;
/** Cubic ease-in: gathers speed. */
export const easeIn = (t: number) => clamp01(t) ** 3;
/** Ease in and out: no velocity at either end. */
export const easeInOut = (t: number) => {
  const k = clamp01(t);
  return k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
};

/**
 * Arrives with weight: overshoots by `amount` of the way and settles
 * back. `t` in 0..1. The look of something landing rather than stopping.
 */
export function landing(t: number, amount = 0.18): number {
  const k = clamp01(t);
  if (k >= 1) return 1;
  const c1 = backCoefficient(amount);
  const c3 = c1 + 1;
  return 1 + c3 * (k - 1) ** 3 + c1 * (k - 1) ** 2;
}

/**
 * The "back" easing's coefficient for a given overshoot: its peak is
 * 1 + 4c₁³ / (27 (c₁ + 1)²), solved for c₁ by bisection and memoised.
 */
const coefficients = new Map<number, number>();
function backCoefficient(amount: number): number {
  const known = coefficients.get(amount);
  if (known !== undefined) return known;
  let lo = 0;
  let hi = 8;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    const peak = (4 * mid ** 3) / (27 * (mid + 1) ** 2);
    if (peak < amount) lo = mid;
    else hi = mid;
  }
  coefficients.set(amount, hi);
  return hi;
}

/**
 * The progress of item `i` of `n` when they arrive in sequence: each
 * starts `stagger` seconds after the last and takes `duration` seconds.
 * Returns 0 before it starts and 1 once it has landed. Elements arriving
 * one after another, not all at once.
 */
export function staggered(t: number, i: number, duration: number, stagger: number): number {
  return clamp01((t - i * stagger) / duration);
}

/** How long a staggered run of `n` items takes to finish. */
export function staggerLength(n: number, duration: number, stagger: number): number {
  return (n - 1) * stagger + duration;
}

/**
 * Secondary motion: the same progress, a beat later and a little softer,
 * for the thing that follows the thing that moved.
 */
export function follow(progress: number, t: number, beat: number, duration: number): number {
  if (progress <= 0) return 0;
  return easeOut(clamp01((t - beat) / duration));
}

/** A deterministic scatter in [0, 1) from an integer seed and a salt. */
export function scatter(seed: number, salt = 0): number {
  let h = (seed * 374761393 + salt * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** A slow drift, for the thing that should never be quite still. */
export function drift(t: number, hz: number, phase = 0): number {
  return Math.sin(t * Math.PI * 2 * hz + phase);
}

/**
 * A number rolling from `from` to `to`, as a counter does: the value at
 * `progress`, and how far the last digit is through its roll (0..1), for
 * the drawing to slide it.
 */
export function roll(from: number, to: number, progress: number): { value: number; slide: number } {
  const k = clamp01(progress);
  const exact = from + (to - from) * easeOut(k);
  const value = Math.floor(exact + 1e-9);
  return { value, slide: exact - value };
}
