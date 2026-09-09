import type { Tier } from '../../ui/settings.js';

/**
 * **The graceful reduced-performance mode, and the arithmetic that decides
 * when it engages.**
 *
 * The owner's brief for stage 4: *"Maintain visual quality without making the
 * iPhone hot or unresponsive"*, and, as the constraint on how:
 * **"a graceful reduced-performance mode rather than a visibly blurry
 * default."** Those two sentences pull in opposite directions and this file is
 * where the pull is resolved, in the order
 * `docs/architecture/PERFORMANCE_STRATEGY.md` already sets out (Amendment 1
 * section S): *particle density, volumetric resolution, reflection and shadow
 * quality, background traffic, geometry detail, post-processing intensity* —
 * and **resolution is not on that list at all**, which is why it is the last
 * thing this ladder touches rather than the first.
 *
 * Why it is load-bearing now. Stage 3 found that every version to date drew a
 * phone at a pixel ratio of 1.25 — 42 % of a DPR-3 iPhone — and raised the
 * default. Raising it is the right answer to the owner's crispness question
 * and it is also the one change in this project that can make his phone hot,
 * because it is 2.56× the fragments at `standard` and 5.76× at `native`. This
 * container cannot tell him which: it rasterises in software at about 1.5
 * frames a second. So the product has to protect him itself, and it does it by
 * **measuring the frames it is actually drawing** and giving up invisible work
 * before it gives up a single pixel of sharpness.
 *
 * **Three things are never given up, at any level**, because they are what the
 * interface is for and because the brief names them: the characters' facial
 * and state animation; the in-world displays' resolution, which stays at the
 * brief's 1024 px floor at every tier; and the honesty markings. `LEVELS`
 * below declares that as data so `test/performance-v11.test.ts` can hold it
 * rather than this comment being the only guarantee.
 */

// --------------------------------------------------------------- the ladder

/** How much the world is doing. `full` is the authored scene. */
export type Level = 'full' | 'reduced' | 'minimal';

export const LEVELS: readonly Level[] = ['full', 'reduced', 'minimal'];

export interface LevelPlan {
  id: Level;
  label: string;
  /** What the reader is told, when they are told anything. */
  note: string;
  /** Steps the device tier down by this many places, which is what carries
   *  particle count, star density, shadows and anisotropy with it. */
  tierSteps: number;
  /** Multiplies the in-world displays' redraw rate. Invisible work: the
   *  pictures are slow by design and 12 fps is already indistinguishable
   *  from 18. */
  redrawScale: number;
  /** Whether the post-processing chain runs at all. Already off on the two
   *  coarse tiers, so this only bites on a laptop or a desktop. */
  post: boolean;
  /** Whether the renderer draws real-time shadows. Already off on the coarse
   *  tiers for the same reason. */
  shadows: boolean;
  /** Multiplies the chosen pixel-ratio ceiling. **Only the last level touches
   *  this**, and never below `MIN_PIXEL_RATIO`. */
  pixelScale: number;
  /** Facial and state animation. Never anything but true; declared so a test
   *  can fail if a future level tries. */
  faces: true;
  /** The displays' texture width, which never falls below the brief's floor.
   *  Declared for the same reason. */
  displayResolution: 'unchanged';
}

export const LEVEL_PLANS: Record<Level, LevelPlan> = {
  full: {
    id: 'full',
    label: 'Full',
    note: 'The scene as authored.',
    tierSteps: 0,
    redrawScale: 1,
    post: true,
    shadows: true,
    pixelScale: 1,
    faces: true,
    displayResolution: 'unchanged',
  },
  reduced: {
    id: 'reduced',
    label: 'Reduced',
    note: 'Fewer stars, no post-processing, no shadows, the screens redrawing half as often. Nothing is drawn smaller or softer.',
    tierSteps: 1,
    redrawScale: 0.5,
    post: false,
    shadows: false,
    pixelScale: 1,
    faces: true,
    displayResolution: 'unchanged',
  },
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    note: 'Everything Reduced does, and the world is drawn at a lower pixel ratio — never below one device pixel per CSS pixel.',
    tierSteps: 2,
    redrawScale: 0.25,
    post: false,
    shadows: false,
    pixelScale: 0.625,
    faces: true,
    displayResolution: 'unchanged',
  },
};

/** The tiers, coarsest last, so a step down is one place along. */
const TIER_ORDER: readonly Tier[] = ['ultra', 'desktop', 'laptop', 'mobile', 'constrained'];

export function tierAfter(tier: Tier, steps: number): Tier {
  const at = TIER_ORDER.indexOf(tier);
  if (at < 0) return tier;
  return TIER_ORDER[Math.min(TIER_ORDER.length - 1, at + Math.max(0, steps))] as Tier;
}

// ------------------------------------------------------- the sensible default

/**
 * **The frame budget per tier**, straight out of
 * `docs/architecture/PERFORMANCE_STRATEGY.md`'s own table: 60 fps at the two
 * top tiers, 45 on a laptop, 30 on a phone, 20 on a constrained device.
 * Quoted from the authority rather than re-invented here, so the two cannot
 * drift apart.
 */
export const FRAME_BUDGET_MS: Record<Tier, number> = {
  ultra: 16.6,
  desktop: 16.6,
  laptop: 22,
  mobile: 33,
  constrained: 50,
};

/**
 * **How many pixels the canvas may be, which is the cap that actually
 * matters.** A pixel ratio on its own is not a budget: 2× of a 390-point
 * phone is 1.3 megapixels and 2× of a 1440-point tablet is 16. Fragment cost
 * follows the product, so the product is what is capped, and the ratio is
 * derived from it.
 *
 * The figures are set from the tier table's texture budgets and their frame
 * budgets in the same proportion, and they are **a target, not a measured
 * property** — the same status `PERFORMANCE_STRATEGY.md` gives every number in
 * its own table. What they are not is an assumption that 2× is right
 * everywhere, which is what stage 3 shipped and what this stage was told to
 * replace with something that picks.
 */
export const PIXEL_BUDGET: Record<Tier, number> = {
  ultra: 4_000_000,
  desktop: 3_000_000,
  laptop: 2_200_000,
  mobile: 1_600_000,
  constrained: 1_000_000,
};

/** Nothing ever draws below one device pixel per CSS pixel. */
export const MIN_PIXEL_RATIO = 1;

export interface Viewport {
  cssWidth: number;
  cssHeight: number;
  devicePixelRatio: number;
}

/**
 * **The default pixel ratio, chosen rather than assumed.**
 *
 * Three bounds, and the smallest wins:
 *
 *  1. the device's own ratio — asking for more than the panel has is pure
 *     waste;
 *  2. the tier's ceiling, which is what `pixelRatio.ts` already held;
 *  3. **the pixel budget**, which is the new one and the one that makes this a
 *     decision: at 390 × 844 a DPR-3 iPhone asked for `native` would draw 2.96
 *     megapixels, and the mobile budget is 1.6, so the automatic answer is
 *     2.20 and not 3.
 *
 * A floor of `MIN_PIXEL_RATIO` under all three, because a blurry default is
 * the thing the brief explicitly refuses.
 *
 * The owner's explicit choices in the hidden menu — `Low`, `Standard`,
 * `Native` — are **not** passed through this: an override that silently
 * refuses to do what it says is worse than no override. This governs `Auto`,
 * which is the default.
 */
export function autoPixelRatio(tier: Tier, viewport: Viewport, tierCeiling: number): number {
  const css = Math.max(1, viewport.cssWidth * viewport.cssHeight);
  const fromBudget = Math.sqrt(PIXEL_BUDGET[tier] / css);
  const device = Math.max(1, viewport.devicePixelRatio || 1);
  // Rounded **down** to two places, never up: a cap that rounds up is not a
  // cap. At 1024 x 1366 the budget allows 1.0687…, and 1.07 would put the
  // canvas 1,468 pixels over it.
  return Math.max(
    MIN_PIXEL_RATIO,
    Math.min(device, tierCeiling, Math.floor(fromBudget * 100) / 100),
  );
}

// ----------------------------------------------------------- the governor

/**
 * **When the mode engages, and when it lets go again.**
 *
 * `PERFORMANCE_STRATEGY.md` describes this and records it as design-level
 * only — *"runtime adaptation from 120-frame sampling with step-down and
 * step-up rules"* was one of the things nothing implemented. This implements
 * it, for V11's route only, and keeps the document's own rules:
 *
 *  - sample over a window of frames rather than reacting to one slow one;
 *  - **two consecutive windows over the tier's budget** step down one level;
 *  - sixty seconds under 70 % of the budget may step up one level;
 *  - never above the level the session started at without the reader saying
 *    so, which here means choosing a level in the hidden menu.
 *
 * It is a plain object with pure transitions so `test/performance-v11.test.ts`
 * can drive it over a synthetic frame trace instead of over a real renderer,
 * which is the only way any of this could be tested here at all.
 */
export const SAMPLE_FRAMES = 90;
export const STEP_UP_AFTER_MS = 60_000;
export const STEP_UP_UNDER = 0.7;

export interface GovernorState {
  level: Level;
  /** Frames accumulated into the current window. */
  frames: number;
  /** Milliseconds accumulated into the current window. */
  elapsedMs: number;
  /** How many consecutive completed windows were over budget. */
  overRuns: number;
  /** How long the current window has been comfortably under budget. */
  underMs: number;
  /** The mean frame time of the last completed window, or 0. */
  lastMeanMs: number;
  /** Why the level is what it is, in one sentence, for the menu. */
  reason: string;
}

export function newGovernor(level: Level = 'full'): GovernorState {
  return {
    level,
    frames: 0,
    elapsedMs: 0,
    overRuns: 0,
    underMs: 0,
    lastMeanMs: 0,
    reason: 'Not yet measured.',
  };
}

/**
 * Feeds one frame in and returns the state after it. Pure: the caller owns the
 * state, so a test can drive a thousand frames in a millisecond.
 */
export function observeFrame(
  state: GovernorState,
  frameMs: number,
  budgetMs: number,
  ceiling: Level = 'full',
): GovernorState {
  const next: GovernorState = { ...state };
  next.frames += 1;
  next.elapsedMs += frameMs;
  if (frameMs < budgetMs * STEP_UP_UNDER) next.underMs += frameMs;
  else next.underMs = 0;
  if (next.frames < SAMPLE_FRAMES) return next;

  const mean = next.elapsedMs / next.frames;
  next.lastMeanMs = Math.round(mean * 100) / 100;
  next.frames = 0;
  next.elapsedMs = 0;

  if (mean > budgetMs) {
    next.overRuns += 1;
    if (next.overRuns >= 2) {
      const at = LEVELS.indexOf(next.level);
      if (at < LEVELS.length - 1) {
        next.level = LEVELS[at + 1] as Level;
        next.reason = `Two windows of ${SAMPLE_FRAMES} frames averaged ${next.lastMeanMs} ms against a ${budgetMs} ms budget.`;
      } else {
        next.reason = `Still ${next.lastMeanMs} ms a frame at the lowest level; nothing further is given up.`;
      }
      next.overRuns = 0;
      next.underMs = 0;
    }
    return next;
  }

  next.overRuns = 0;
  if (next.underMs >= STEP_UP_AFTER_MS) {
    const at = LEVELS.indexOf(next.level);
    const top = LEVELS.indexOf(ceiling);
    if (at > top) {
      next.level = LEVELS[at - 1] as Level;
      next.reason = `A minute under ${Math.round(budgetMs * STEP_UP_UNDER)} ms a frame; one level given back.`;
    }
    next.underMs = 0;
  }
  return next;
}

// ------------------------------------------------- what the scene reads back

/**
 * **The one place the in-world displays ask how hard to work.**
 *
 * A module-level value rather than React context, and deliberately: it is read
 * inside `useFrame`, sixty times a second, by six components that must not
 * re-render when it changes. `ConsoleScreenV11` and `ScreenBankV11` multiply
 * their tier's redraw rate by `redrawScale` and stop entirely at zero.
 *
 * It is V11's own. `src/ui/settings.ts` is shared with V10 and is not touched,
 * which is how every V11 stage has kept V10's build byte-count identical.
 */
export interface SceneLoad {
  /** Multiplies the displays' redraw rate; 0 stops them. */
  redrawScale: number;
  /** Why, for the record and for the menu. */
  reason: string;
}

let load: SceneLoad = { redrawScale: 1, reason: 'full' };

export function sceneLoad(): SceneLoad {
  return load;
}

export function setSceneLoad(next: SceneLoad): void {
  load = next;
}

/**
 * **How fast the world is asked to redraw itself, and the two cases where the
 * answer is "hardly at all".**
 *
 * The brief lists both: *"pause or reduce expensive scene animation when a
 * full-screen window is open"* and *"stop unnecessary rendering when the page
 * is hidden"*.
 *
 *  - **Hidden**: `never`. Not a throttle — a stop. The browser throttles a
 *    background tab on its own; a phone that has been locked or switched away
 *    from should not be drawing a 3D scene at all, and relying on somebody
 *    else's throttle is not the same as not asking.
 *  - **A window open over the world**: 15 frames a second, driven by an
 *    interval rather than by the display's own clock. Reduced and not paused,
 *    for one measured reason: the window's content is published from the
 *    demonstration's clock, which advances inside `useFrame`, so stopping the
 *    loop would freeze the thing the reader is looking at. 15 fps is a quarter
 *    of the work and keeps the clock honest — every animated thing in this set
 *    caps its own delta at 0.1 s, and 1/15 s is comfortably inside that cap,
 *    so no beat of the demonstration is skipped or slowed.
 */
export const WINDOW_OPEN_FPS = 15;

export type Loop = 'always' | 'demand' | 'never';

export function loopFor(hidden: boolean, windowOpen: boolean): { loop: Loop; fps: number } {
  if (hidden) return { loop: 'never', fps: 0 };
  if (windowOpen) return { loop: 'demand', fps: WINDOW_OPEN_FPS };
  return { loop: 'always', fps: 0 };
}
