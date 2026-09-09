import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Tier } from '../src/ui/settings.js';
import {
  autoPixelRatio,
  FRAME_BUDGET_MS,
  type GovernorState,
  LEVEL_PLANS,
  LEVELS,
  type Level,
  loopFor,
  MIN_PIXEL_RATIO,
  newGovernor,
  observeFrame,
  PIXEL_BUDGET,
  SAMPLE_FRAMES,
  STEP_UP_AFTER_MS,
  STEP_UP_UNDER,
  sceneLoad,
  setSceneLoad,
  tierAfter,
  WINDOW_OPEN_FPS,
} from '../src/world/mobile/performance.js';
import { ceilingFor, dprFor, LOW_CEILING, NATIVE_CAP } from '../src/world/mobile/pixelRatio.js';

/**
 * **V11 stage 4: the graceful reduced-performance mode, held by arithmetic.**
 *
 * Every figure the mode turns on is either derived here or refused here. There
 * is no GPU in this container and no device has been measured, so what these
 * tests can hold is exactly what a pure function can be held to: the ladder's
 * order, the invariants that survive every rung of it, the pixel budget's
 * arithmetic, and the governor's step-down and step-up rules driven over a
 * synthetic frame trace.
 *
 * **What they cannot hold, and what the run record therefore records as not
 * performed:** whether any of it keeps an iPhone cool. Nothing here is a
 * measurement of a device.
 */

const TIERS: readonly Tier[] = ['ultra', 'desktop', 'laptop', 'mobile', 'constrained'];

describe('the ladder', () => {
  it('gives up invisible work before it gives up a single pixel of sharpness', () => {
    // Amendment 1 section S puts resolution nowhere in the reduction order.
    // So the only level that touches the pixel ratio is the last one, and
    // every earlier one has already given up something invisible.
    expect(LEVEL_PLANS.full.pixelScale).toBe(1);
    expect(LEVEL_PLANS.reduced.pixelScale).toBe(1);
    expect(LEVEL_PLANS.minimal.pixelScale).toBeLessThan(1);
    expect(LEVEL_PLANS.reduced.redrawScale).toBeLessThan(LEVEL_PLANS.full.redrawScale);
    expect(LEVEL_PLANS.reduced.post).toBe(false);
    expect(LEVEL_PLANS.reduced.shadows).toBe(false);
  });

  it('never stops the characters’ faces or shrinks a display, at any level', () => {
    // The brief: "preserve character facial and state animation", and
    // "a graceful reduced-performance mode rather than a visibly blurry
    // default". Both are declared as data so this can fail rather than a
    // comment being the only guarantee.
    for (const level of LEVELS) {
      expect(LEVEL_PLANS[level].faces).toBe(true);
      expect(LEVEL_PLANS[level].displayResolution).toBe('unchanged');
    }
  });

  it('is monotonic: every rung does at least as little as the one above it', () => {
    for (let i = 1; i < LEVELS.length; i += 1) {
      const above = LEVEL_PLANS[LEVELS[i - 1] as Level];
      const below = LEVEL_PLANS[LEVELS[i] as Level];
      expect(below.tierSteps).toBeGreaterThanOrEqual(above.tierSteps);
      expect(below.redrawScale).toBeLessThanOrEqual(above.redrawScale);
      expect(below.pixelScale).toBeLessThanOrEqual(above.pixelScale);
      expect(Number(below.post)).toBeLessThanOrEqual(Number(above.post));
      expect(Number(below.shadows)).toBeLessThanOrEqual(Number(above.shadows));
    }
  });

  it('steps the tier down without ever falling off the end of the table', () => {
    expect(tierAfter('mobile', 1)).toBe('constrained');
    expect(tierAfter('mobile', 2)).toBe('constrained');
    expect(tierAfter('ultra', 2)).toBe('laptop');
    expect(tierAfter('constrained', 5)).toBe('constrained');
    expect(tierAfter('desktop', 0)).toBe('desktop');
  });

  it('never draws below one device pixel per CSS pixel, even at the bottom rung', () => {
    for (const tier of TIERS) {
      const [min, max] = dprFor(tier, 'low', 3, undefined, LEVEL_PLANS.minimal.pixelScale);
      expect(min).toBe(MIN_PIXEL_RATIO);
      expect(max).toBeGreaterThanOrEqual(MIN_PIXEL_RATIO);
    }
  });
});

describe('the sensible default, which stage 3 assumed and stage 4 derives', () => {
  const iphone = { cssWidth: 390, cssHeight: 844, devicePixelRatio: 3 };

  it('bounds a DPR-3 iPhone by the mobile pixel budget rather than by 2 or by 3', () => {
    const ratio = autoPixelRatio('mobile', iphone, 2);
    // 390 x 844 is 329,160 CSS pixels; the mobile budget is 1.6 M; so the
    // budget alone would allow sqrt(1.6e6 / 329160) = 2.20, and the tier's own
    // ceiling of 2 is the binding one here. Both are below the device's 3.
    expect(Math.sqrt(PIXEL_BUDGET.mobile / (390 * 844))).toBeGreaterThan(2);
    expect(ratio).toBe(2);
    expect(ratio * ratio * 390 * 844).toBeLessThanOrEqual(PIXEL_BUDGET.mobile);
  });

  it('gives a big screen a smaller answer than a small one, which a flat 2 could not', () => {
    const tablet = { cssWidth: 1024, cssHeight: 1366, devicePixelRatio: 2 };
    const phone = autoPixelRatio('mobile', iphone, 2);
    const slab = autoPixelRatio('mobile', tablet, 2);
    expect(slab).toBeLessThan(phone);
    expect(slab * slab * 1024 * 1366).toBeLessThanOrEqual(PIXEL_BUDGET.mobile + 1);
  });

  it('never asks a panel for more pixels than it has', () => {
    const cheap = { cssWidth: 360, cssHeight: 640, devicePixelRatio: 1 };
    expect(autoPixelRatio('mobile', cheap, 2)).toBe(1);
  });

  it('leaves the three explicit settings exactly as stage 3 left them', () => {
    // An override that quietly refuses to do what it says is worse than no
    // override, so `auto` is the only setting the budget governs.
    expect(ceilingFor('mobile', 'low', 3, iphone)).toBe(LOW_CEILING.mobile);
    expect(ceilingFor('mobile', 'standard', 3, iphone)).toBe(2);
    expect(ceilingFor('mobile', 'native', 3, iphone)).toBe(3);
    expect(ceilingFor('mobile', 'native', 4, iphone)).toBe(NATIVE_CAP);
  });

  it('does not get quietly lowered by the ladder stepping the tier down', () => {
    /**
     * **`verify:owner:v11` found this at a device pixel ratio of 3 and it is
     * the one thing the brief forbids.** The ladder steps the tier down to shed
     * the scene's costs, and the pixel-ratio ceiling is read per tier — so
     * `reduced` drew at 1.25 against `full`'s 2 and was blurrier. The ceiling
     * now comes from the **detected** tier, so `pixelScale` is the only lever
     * on resolution and only the last rung pulls it.
     */
    const detected = 'mobile';
    const stepped = tierAfter(detected, LEVEL_PLANS.reduced.tierSteps);
    expect(stepped).toBe('constrained');
    expect(ceilingFor(stepped, 'auto', 3, iphone)).toBeLessThan(
      ceilingFor(detected, 'auto', 3, iphone),
    );
    const [, atFull] = dprFor(detected, 'auto', 3, iphone, LEVEL_PLANS.full.pixelScale);
    const [, atReduced] = dprFor(detected, 'auto', 3, iphone, LEVEL_PLANS.reduced.pixelScale);
    const [, atMinimal] = dprFor(detected, 'auto', 3, iphone, LEVEL_PLANS.minimal.pixelScale);
    expect(atReduced).toBe(atFull);
    expect(atMinimal).toBeLessThan(atFull);
    expect(atMinimal).toBeGreaterThanOrEqual(MIN_PIXEL_RATIO);
  });

  it('is what the world actually asks the canvas for', () => {
    const [min, max] = dprFor('mobile', 'auto', 3, iphone, 1);
    expect(min).toBe(1);
    expect(max).toBe(2);
    const [, reduced] = dprFor('mobile', 'auto', 3, iphone, LEVEL_PLANS.minimal.pixelScale);
    expect(reduced).toBe(1.25);
    expect(reduced).toBe(LOW_CEILING.mobile);
  });
});

describe('the governor, driven over a frame trace', () => {
  const budget = FRAME_BUDGET_MS.mobile;
  const run = (state: GovernorState, frameMs: number, frames: number, ceiling: Level = 'full') => {
    let at = state;
    for (let i = 0; i < frames; i += 1) at = observeFrame(at, frameMs, budget, ceiling);
    return at;
  };

  it('does not react to one slow frame, or to one slow window', () => {
    let state = newGovernor();
    state = observeFrame(state, 400, budget);
    expect(state.level).toBe('full');
    state = run(newGovernor(), budget + 10, SAMPLE_FRAMES);
    expect(state.level).toBe('full');
    expect(state.overRuns).toBe(1);
  });

  it('steps down after two consecutive windows over the tier’s budget', () => {
    const state = run(newGovernor(), budget + 10, SAMPLE_FRAMES * 2);
    expect(state.level).toBe('reduced');
    expect(state.lastMeanMs).toBeCloseTo(budget + 10, 5);
    expect(state.reason).toContain('against a 33 ms budget');
  });

  it('reaches the bottom rung and then stops, saying so rather than looping', () => {
    const state = run(newGovernor(), 500, SAMPLE_FRAMES * 8);
    expect(state.level).toBe('minimal');
    expect(state.reason).toContain('nothing further is given up');
  });

  it('gives a level back after a minute comfortably inside the budget', () => {
    let state = run(newGovernor(), budget + 10, SAMPLE_FRAMES * 2);
    expect(state.level).toBe('reduced');
    const fast = budget * STEP_UP_UNDER - 1;
    const frames = Math.ceil(STEP_UP_AFTER_MS / fast) + SAMPLE_FRAMES;
    state = run(state, fast, frames);
    expect(state.level).toBe('full');
    expect(state.reason).toContain('one level given back');
  });

  it('never climbs above the level the reader chose', () => {
    let state = newGovernor('minimal');
    const fast = 1;
    state = run(state, fast, Math.ceil(STEP_UP_AFTER_MS / fast) + SAMPLE_FRAMES, 'minimal');
    expect(state.level).toBe('minimal');
  });

  it('resets its patience the moment a window comes back inside the budget', () => {
    let state = run(newGovernor(), budget + 10, SAMPLE_FRAMES);
    expect(state.overRuns).toBe(1);
    state = run(state, 1, SAMPLE_FRAMES);
    expect(state.overRuns).toBe(0);
    expect(state.level).toBe('full');
  });
});

describe('the two cases where the world is asked to stop or slow down', () => {
  it('stops rendering entirely when the page is hidden', () => {
    expect(loopFor(true, false)).toEqual({ loop: 'never', fps: 0 });
    expect(loopFor(true, true)).toEqual({ loop: 'never', fps: 0 });
  });

  it('reduces rather than pauses when a window is open over the world', () => {
    // Reduced and not paused for one reason: the window's own content is
    // published from the demonstration's clock, which advances inside
    // `useFrame`. Stopping the loop would freeze the thing being read.
    expect(loopFor(false, true)).toEqual({ loop: 'demand', fps: WINDOW_OPEN_FPS });
  });

  it('runs the world normally when nothing is over it', () => {
    expect(loopFor(false, false)).toEqual({ loop: 'always', fps: 0 });
  });

  it('keeps the demonstration honest at the reduced rate', () => {
    // Every animated thing in this set caps its own frame delta at 0.1 s so a
    // slow frame cannot skip a beat. A metronome slower than 10 fps would sit
    // outside that cap and the demonstration would run slow; 15 is inside it.
    expect(1 / WINDOW_OPEN_FPS).toBeLessThan(0.1);
  });
});

describe('what the in-world displays read', () => {
  it('is a module-level value, so six displays do not re-render when it changes', () => {
    const before = sceneLoad();
    setSceneLoad({ redrawScale: 0.5, reason: 'reduced' });
    expect(sceneLoad().redrawScale).toBe(0.5);
    setSceneLoad(before);
    expect(sceneLoad().redrawScale).toBe(1);
  });

  it('reaches every rung of the ladder, and zero stops a display without breaking it', () => {
    for (const level of LEVELS) {
      const scale = LEVEL_PLANS[level].redrawScale;
      expect(scale).toBeGreaterThan(0);
      expect(12 * scale).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('the tier table this file quotes', () => {
  it('carries PERFORMANCE_STRATEGY.md’s own frame budgets, not a second set', () => {
    expect(FRAME_BUDGET_MS.ultra).toBe(16.6);
    expect(FRAME_BUDGET_MS.desktop).toBe(16.6);
    expect(FRAME_BUDGET_MS.laptop).toBe(22);
    expect(FRAME_BUDGET_MS.mobile).toBe(33);
    expect(FRAME_BUDGET_MS.constrained).toBe(50);
  });

  it('has a pixel budget for every tier, coarser tiers lower', () => {
    for (let i = 1; i < TIERS.length; i += 1) {
      expect(PIXEL_BUDGET[TIERS[i] as Tier]).toBeLessThan(PIXEL_BUDGET[TIERS[i - 1] as Tier]);
    }
  });
});

/**
 * **The Keeper's KS4-09: "Reduced to reduced".**
 *
 * The governed notice's two strings are
 * `${plan.label} performance mode` when the reader chose the rung and
 * `Reduced to ${plan.label.toLowerCase()}` when the governor did, and the
 * second one reads *"Reduced to reduced"* at the middle rung. It is only
 * reachable on hardware where the governor engages, which is nowhere this
 * project has measured, so the review recorded it rather than demonstrating it.
 *
 * The notice is JSX with no seam to call, so this asserts the two templates
 * against every rung the ladder actually has — which is the property that was
 * wrong, and it fails again if a fourth rung is added whose label repeats its
 * verb.
 */
describe('the governed performance notice reads as English at every rung', () => {
  const forcedWord = (level: Level) => `${LEVEL_PLANS[level].label} performance mode`;
  const steppedWord = (level: Level) => `Stepped down to ${LEVEL_PLANS[level].label.toLowerCase()}`;

  it('never repeats the rung’s own name as its verb', () => {
    for (const level of LEVELS) {
      if (level === 'full') continue;
      const stepped = steppedWord(level);
      const label = LEVEL_PLANS[level].label.toLowerCase();
      // "Reduced to reduced" was exactly this: the label appearing twice.
      const occurrences = stepped.toLowerCase().split(label).length - 1;
      expect(occurrences, stepped).toBe(1);
      expect(stepped.toLowerCase()).not.toContain(`${label} to ${label}`);
    }
  });

  it('is the string the source actually renders, in both branches', () => {
    const room = readFileSync(
      resolve(import.meta.dirname, '../src/world/mobile/MobileRoom.tsx'),
      'utf8',
    );
    expect(room).toContain('`${plan.label} performance mode`');
    expect(room).toContain('`Stepped down to ${plan.label.toLowerCase()}`');
    // The forced string is the one in the deliverable frame and is unchanged.
    expect(forcedWord('reduced')).toBe('Reduced performance mode');
    expect(forcedWord('minimal')).toBe('Minimal performance mode');
    expect(steppedWord('reduced')).toBe('Stepped down to reduced');
    expect(steppedWord('minimal')).toBe('Stepped down to minimal');
  });
});
