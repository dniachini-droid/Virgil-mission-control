import { describe, expect, it } from 'vitest';
import {
  createLocomotion,
  ease,
  glide,
  glidePose,
  type Pose,
} from '../src/world/characters/locomotion.js';
import { figurePlacement, IDLE_ASIDE, idlePlacement, ROLES } from '../src/world/room/cast.js';

/**
 * The seam for the walk clips the owner is sending later (V7 §0.7): a
 * station has an idle position and a working position, and the move
 * between them is one swappable behaviour. Today's behaviour is a glide,
 * and these hold what any replacement must also hold — it starts where it
 * is, arrives exactly where it is sent, never jumps when re-sent midway,
 * and reports `moving` only while it moves — so a walk-clip mover can be
 * dropped in against the same tests.
 */

const A: Pose = { position: [0, 0, 0], rotationY: 0 };
const B: Pose = { position: [1, 0, -2], rotationY: 0.5 };

describe('the glide', () => {
  it('eases with no velocity at either end', () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBe(0.5);
    // Flat at the ends: the first and last steps are the smallest.
    expect(ease(0.05)).toBeLessThan(0.05);
    expect(1 - ease(0.95)).toBeLessThan(0.05);
  });

  it('starts where it is, ends where it is sent, and moves only in between', () => {
    expect(glidePose(A, B, 0)).toEqual(A);
    expect(glidePose(A, B, 1)).toEqual(B);
    const mid = glidePose(A, B, 0.5);
    expect(mid.position[0]).toBeCloseTo(0.5, 9);
    expect(mid.position[2]).toBeCloseTo(-1, 9);
    expect(mid.rotationY).toBeCloseTo(0.25, 9);
    // Clamped outside [0, 1].
    expect(glidePose(A, B, -1)).toEqual(A);
    expect(glidePose(A, B, 2)).toEqual(B);
  });

  it('is still at its start until sent somewhere, then arrives in its time and stays', () => {
    const mover = glide(A, 1);
    expect(mover.update(0.1, A)).toEqual({ pose: A, moving: false });
    let step = mover.update(0.25, B);
    expect(step.moving).toBe(true);
    expect(step.pose.position[0]).toBeGreaterThan(0);
    expect(step.pose.position[0]).toBeLessThan(1);
    // Progress is monotonic.
    let last = step.pose.position[0];
    for (let i = 0; i < 2; i += 1) {
      step = mover.update(0.25, B);
      expect(step.pose.position[0]).toBeGreaterThan(last);
      last = step.pose.position[0];
    }
    step = mover.update(0.25, B);
    expect(step).toEqual({ pose: B, moving: false });
    expect(mover.update(5, B)).toEqual({ pose: B, moving: false });
    expect(mover.pose).toEqual(B);
  });

  it('never jumps when re-sent midway: the new glide starts from where it is', () => {
    const mover = glide(A, 1);
    mover.update(0.5, B);
    const before = mover.pose;
    const back = mover.update(0, A);
    expect(back.pose).toEqual(before);
    expect(back.moving).toBe(true);
    // And it arrives back at A.
    mover.update(0.5, A);
    expect(mover.update(0.5, A)).toEqual({ pose: A, moving: false });
  });

  it('is what the set uses', () => {
    expect(createLocomotion).toBe(glide);
    // An infinite step is an instant move: what reduced motion asks for.
    const mover = createLocomotion(A);
    expect(mover.update(Number.POSITIVE_INFINITY, B)).toEqual({ pose: B, moving: false });
  });
});

describe.each(ROLES)('the %s’s two positions', (role) => {
  it('idle aside of working, both on the floor, and the idle no nearer the station', () => {
    const working = figurePlacement(role);
    const idle = idlePlacement(role);
    expect(idle.local[1]).toBe(0);
    expect(idle.local[0]).toBeCloseTo(working.local[0] + IDLE_ASIDE[0], 9);
    expect(idle.local[2]).toBeCloseTo(working.local[2] + IDLE_ASIDE[1], 9);
    // Further forward than the working position: the straight path between
    // them stays in front of the station's face.
    expect(idle.local[2]).toBeGreaterThan(working.local[2]);
    expect(Math.abs(idle.rotationY)).toBeLessThanOrEqual(Math.abs(working.rotationY));
  });
});
