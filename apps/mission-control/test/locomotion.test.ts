import { describe, expect, it } from 'vitest';
import {
  createLocomotion,
  ease,
  OVERSHOOT,
  type Pose,
  settle,
  TURN_SECONDS,
  turn,
  turnPose,
} from '../src/world/characters/locomotion.js';
import { figurePlacement, ROLES, workingPlacement } from '../src/world/room/cast.js';

/**
 * The turn (V8 §0.10.8): a character stands in one place and has two
 * facings — the front, and their console's screen — and the move between
 * them is a whole-body turn on one axis that has to read as deliberate:
 * it starts from rest, overshoots by a few degrees and settles. These
 * hold what any replacement must also hold — it starts where it is,
 * arrives exactly where it is sent, never jumps when re-sent midway, and
 * reports `moving` only while it moves — and what the turn itself must
 * hold: one overshoot, no more than the recorded amount, and a settle.
 * The `Locomotion` interface is still the seam a walk-clip mover would
 * fill; nothing here waits on the owner's walking rigs.
 */

const A: Pose = { position: [0, 0, 0], rotationY: 0 };
const B: Pose = { position: [0, 0, 0], rotationY: 2.4 };
const C: Pose = { position: [1, 0, -2], rotationY: 0.5 };

describe('the settle', () => {
  it('starts from rest, rises through the target once, and settles within the turn', () => {
    expect(settle(0)).toBe(0);
    // No velocity at the start: the first hundredth is tiny.
    expect(settle(0.01)).toBeLessThan(0.002);
    let peak = 0;
    let crossings = 0;
    let last = 0;
    for (let t = 0; t <= TURN_SECONDS; t += 0.005) {
      const s = settle(t);
      if (s > 1 !== last > 1 && t > 0.01) crossings += 1;
      peak = Math.max(peak, s);
      last = s;
    }
    // Overshoots, once, by the recorded amount — a few degrees on a turn, never a swing.
    expect(peak).toBeGreaterThan(1.02);
    expect(peak).toBeLessThanOrEqual(1 + OVERSHOOT + 1e-6);
    expect(OVERSHOOT).toBeLessThan(0.06);
    expect(crossings).toBeLessThanOrEqual(2);
    // Settled by the end: within half a percent.
    expect(Math.abs(settle(TURN_SECONDS) - 1)).toBeLessThan(0.005);
  });

  it('eases positions with no velocity at either end', () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.05)).toBeLessThan(0.05);
    expect(1 - ease(0.95)).toBeLessThan(0.05);
  });
});

describe('the turn', () => {
  it('starts where it is, ends where it is sent, and takes the short way round', () => {
    expect(turnPose(A, B, 0)).toEqual(A);
    expect(turnPose(A, B, TURN_SECONDS).rotationY).toBeCloseTo(B.rotationY, 9);
    const mid = turnPose(A, B, TURN_SECONDS * 0.3);
    expect(mid.rotationY).toBeGreaterThan(0);
    expect(mid.rotationY).toBeLessThan(B.rotationY);
    // A target 350° away is 10° the other way.
    const wrapped = turnPose(A, { position: [0, 0, 0], rotationY: (350 * Math.PI) / 180 }, 0.3);
    expect(wrapped.rotationY).toBeLessThan(0);
    // Positions, when they differ, move with the plain ease.
    const moved = turnPose(A, C, TURN_SECONDS / 2);
    expect(moved.position[0]).toBeCloseTo(0.5, 9);
    expect(moved.position[2]).toBeCloseTo(-1, 9);
  });

  it('is still until sent somewhere, then arrives in its time and stays', () => {
    const mover = turn(A, 1);
    expect(mover.update(0.1, A)).toEqual({ pose: A, moving: false });
    let step = mover.update(0.2, B);
    expect(step.moving).toBe(true);
    expect(step.pose.rotationY).toBeGreaterThan(0);
    expect(step.pose.rotationY).toBeLessThan(B.rotationY);
    step = mover.update(0.2, B);
    expect(step.moving).toBe(true);
    for (let i = 0; i < 3; i += 1) step = mover.update(0.2, B);
    expect(step).toEqual({ pose: B, moving: false });
    expect(mover.update(5, B)).toEqual({ pose: B, moving: false });
    expect(mover.pose).toEqual(B);
  });

  it('overshoots the facing by a few degrees and comes back', () => {
    const mover = turn(A, TURN_SECONDS);
    let peak = 0;
    for (let t = 0; t < TURN_SECONDS; t += 0.01) {
      peak = Math.max(peak, mover.update(0.01, B).pose.rotationY);
    }
    expect(peak).toBeGreaterThan(B.rotationY);
    expect(peak - B.rotationY).toBeLessThan(B.rotationY * OVERSHOOT + 1e-6);
    expect(mover.update(0.1, B).pose.rotationY).toBeCloseTo(B.rotationY, 9);
  });

  it('never jumps when re-sent midway: the new turn starts from where it is', () => {
    const mover = turn(A, 1);
    mover.update(0.4, B);
    const before = mover.pose;
    const back = mover.update(0, A);
    expect(back.pose).toEqual(before);
    expect(back.moving).toBe(true);
    for (let i = 0; i < 10; i += 1) mover.update(0.1, A);
    expect(mover.update(0.1, A)).toEqual({ pose: A, moving: false });
  });

  it('is what the set uses', () => {
    expect(createLocomotion).toBe(turn);
    // An infinite step is an instant move: what reduced motion asks for.
    const mover = createLocomotion(A);
    expect(mover.update(Number.POSITIVE_INFINITY, B)).toEqual({ pose: B, moving: false });
  });
});

describe.each(ROLES)('the %s’s two facings', (role) => {
  it('share one standing point, facing the front and facing the screen', () => {
    const front = figurePlacement(role);
    const atScreen = workingPlacement(role);
    expect(atScreen.local).toEqual(front.local);
    expect(atScreen.at).toEqual(front.at);
    // The screen is behind them: the turn is more than a quarter and less
    // than a half circle, since they stand to the console's left.
    let dr = atScreen.rotationY - front.rotationY;
    dr = Math.atan2(Math.sin(dr), Math.cos(dr));
    expect(Math.abs(dr)).toBeGreaterThan(Math.PI / 2);
    expect(Math.abs(dr)).toBeLessThan(Math.PI);
  });
});
