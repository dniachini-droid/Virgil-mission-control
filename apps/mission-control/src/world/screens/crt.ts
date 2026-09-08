/**
 * A screen turning on and off like a television.
 *
 * V8 (`docs/process/PHASE_1_STYLISED_SPEC.md` §0.10.12). The owner: "we
 * should avoid having every screen on if its not in use. Ie - when the
 * keepewr isnt doing work it should stay off his screen. And when it
 * turns on, make it turn on like a tv, and whene it turns off, an
 * exadurated old tv turning off type animation, where it shrinks in
 * circular mannner - you know how old tvs. used to turn off."
 *
 * This is the pure part: given whether the screen should be on and how
 * long ago that changed, what the display shader should do this frame.
 * The shader (`characters/visorFit.ts`, the one face material) scales the
 * *image* about its centre and brightens it — the glass, the case and the
 * bezel never move, only the picture inside them, which is what makes it
 * read as a screen switching off rather than an object shrinking.
 *
 * **Power-on, a CRT warming up:** a moment of nothing with a faint dot
 * growing at the centre; a bloom of light and a bright horizontal line;
 * the line opens vertically into the picture; the brightness overshoots
 * and flickers into stability. Not a fade-in.
 *
 * **Power-off, the exaggerated collapse:** the picture collapses
 * vertically into a thin bright line; the line contracts horizontally to
 * a point; a small afterglow dot lingers and fades. This is the classic
 * sequence; if the owner meant a circular iris closing inward instead,
 * `collapse` is the one function to change, and the owner document says
 * which was built.
 *
 * `test/screen-motion.test.ts` holds the shape of both.
 */

export interface CrtFrame {
  /** The image's scale about its centre, x and y; (1, 1) is the whole picture. */
  scale: [number, number];
  /** Brightness multiplier on the image; 1 is nominal. */
  power: number;
  /** An added white flash over the visible image. */
  flash: number;
  /** The afterglow dot at the centre. */
  glow: number;
  /** Whether the transition has finished. */
  settled: boolean;
}

export const POWER_ON_SECONDS = 1.5;
export const POWER_OFF_SECONDS = 2.4;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeIn = (t: number) => t * t * t;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** The picture, on and steady. */
export const ON: CrtFrame = { scale: [1, 1], power: 1, flash: 0, glow: 0, settled: true };
/** Nothing: the screen dark. */
export const OFF: CrtFrame = { scale: [0, 0], power: 0, flash: 0, glow: 0, settled: true };

/** A deterministic flicker in [0, 1): the same at the same time. */
function jitter(t: number, rate: number): number {
  const k = Math.floor(t * rate);
  return (((k * 2654435761) >>> 0) % 1000) / 1000;
}

/** Turning on: `t` seconds after power was applied. */
export function warmUp(t: number): CrtFrame {
  if (t >= POWER_ON_SECONDS) return ON;
  if (t < 0.28) {
    // A dot gathers at the centre, dim, then brightens fast.
    const k = clamp01(t / 0.28);
    return { scale: [0, 0], power: 0, flash: 0, glow: 0.15 + 0.85 * easeIn(k), settled: false };
  }
  if (t < 0.42) {
    // The bloom: a bright line the full width, a flash over it.
    const k = clamp01((t - 0.28) / 0.14);
    return {
      scale: [easeOut(k), 0.035],
      power: 1.2,
      flash: 0.9 * (1 - k * 0.4),
      glow: 1 - k,
      settled: false,
    };
  }
  if (t < 0.9) {
    // The line opens vertically into the picture; the flash drains.
    const k = clamp01((t - 0.42) / 0.48);
    return {
      scale: [1, 0.035 + 0.965 * easeOut(k)],
      power: 1.2 + 0.25 * (1 - k),
      flash: 0.55 * (1 - easeOut(k)),
      glow: 0,
      settled: false,
    };
  }
  // Overshoot settling, with a few dips as the picture stabilises.
  const k = clamp01((t - 0.9) / (POWER_ON_SECONDS - 0.9));
  const dip = jitter(t, 24) < 0.22 ? 0.12 * (1 - k) : 0;
  return {
    scale: [1, 1],
    power: 1 + 0.32 * (1 - easeOut(k)) - dip,
    flash: 0,
    glow: 0,
    settled: false,
  };
}

/** Turning off: `t` seconds after power was cut. The exaggerated collapse. */
export function collapse(t: number): CrtFrame {
  if (t >= POWER_OFF_SECONDS) return OFF;
  if (t < 0.42) {
    // Vertical collapse into a thin, bright line: it gathers speed at once.
    const k = clamp01(t / 0.42) ** 2;
    return {
      scale: [1, 1 - 0.975 * k],
      power: 1 + 0.6 * k,
      flash: 0.35 * k,
      glow: 0,
      settled: false,
    };
  }
  if (t < 0.8) {
    // The line contracts horizontally to a point.
    const k = clamp01((t - 0.42) / 0.38) ** 2;
    return {
      scale: [1 - 0.995 * k, 0.025],
      power: 1.6,
      flash: 0.35 + 0.4 * k,
      glow: 0.5 * k,
      settled: false,
    };
  }
  // The afterglow dot lingers and fades, slowly.
  const k = clamp01((t - 0.8) / (POWER_OFF_SECONDS - 0.8));
  return { scale: [0, 0], power: 0, flash: 0, glow: 0.9 * (1 - easeOut(k)), settled: false };
}

/**
 * What the display does this frame: `on` is whether power is applied,
 * `since` how long ago that last changed. With reduced motion the
 * transitions are instant.
 */
export function crtFrame(on: boolean, since: number, reducedMotion = false): CrtFrame {
  if (reducedMotion) return on ? ON : OFF;
  return on ? warmUp(since) : collapse(since);
}
