import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  anchors,
  backdropFor,
  compositionPoints,
  enclosurePoints,
  LANDSCAPE_BACKDROP,
  mobilePose,
  orientationFor,
  overviewPose,
  PORTRAIT_MAX_ASPECT,
} from '../src/world/mobile/composition.js';
import { figurePlacement, ROLES } from '../src/world/room/cast.js';
import { fovFor, screenCorners } from '../src/world/room/closeUp.js';
import { layout, tabletopCamera } from '../src/world/room/palette.js';

/**
 * **The composition contract.**
 *
 * The V11 brief asks for a portrait composition that is authored rather than a
 * shrunken desktop camera, with Virgil the focal point and the three
 * specialists recognisable, separated and unclipped. Three of those four are
 * judgements that only looking at a frame can settle, and the run record
 * records what looking found. **What a test can settle is whether anything is
 * outside the frame**, and that is what this file does: it projects every point
 * the composition may not lose through the pose the code produces and fails if
 * one of them is not inside it.
 *
 * The viewports are the ones the brief names — 390 and 430 CSS px portrait, and
 * a landscape phone — plus a desktop width, because a phone-first composition
 * that breaks the desktop is still broken.
 */

const VIEWPORTS: [string, number, number][] = [
  ['iPhone portrait 390', 390, 844],
  ['iPhone portrait 430', 430, 932],
  ['iPhone landscape', 844, 390],
  ['a small portrait', 320, 568],
  ['desktop', 1440, 900],
];

/** Whether every point is inside the frame this pose describes at this aspect. */
function fits(
  pose: { position: [number, number, number]; target: [number, number, number]; fov: number },
  points: [number, number, number][],
  aspect: number,
): number {
  return fovFor(pose.position, pose.target, points, aspect) / pose.fov;
}

describe('the overview holds the whole composition at every viewport', () => {
  for (const [name, width, height] of VIEWPORTS) {
    const aspect = width / height;
    it(`${name} (${width} x ${height}) loses no character, screen or slab`, () => {
      const pose = overviewPose(aspect);
      // A ratio of 1 means a point sits exactly on the frame's edge. Every
      // critical point must be strictly inside, with air.
      // **The cluster the frame is judged against is this orientation's own.**
      // Portrait and landscape hang the three slabs differently
      // (`screens/v11/bank.ts`), and judging a landscape frame against the
      // portrait cluster is precisely the fault that cost landscape its
      // consoles at stage 2.
      expect(
        fits(pose, compositionPoints(orientationFor(aspect)), aspect),
        `${name}: a critical point is on or outside the frame`,
      ).toBeLessThan(0.95);
    });

    it(`${name} contains the consoles' own measured boxes`, () => {
      const pose = overviewPose(aspect);
      expect(fits(pose, enclosurePoints(), aspect)).toBeLessThanOrEqual(1);
    });

    it(`${name} keeps the camera above the set and looking down at it`, () => {
      const pose = overviewPose(aspect);
      expect(pose.position[1]).toBeGreaterThan(pose.target[1]);
      // In front of the set, never behind it: the back of the set is undressed.
      expect(pose.position[2]).toBeGreaterThan(pose.target[2]);
    });
  }
});

describe('portrait is authored, not the desktop camera shrunk', () => {
  const aspect = 390 / 844;

  it('is not the V10 tabletop pose', () => {
    const v10 = tabletopCamera(aspect);
    const v11 = overviewPose(aspect);
    expect(v11.position).not.toEqual(v10.position);
    expect(v11.fov).not.toBeCloseTo(v10.fov, 3);
  });

  it('fixes what the V10 pose does at this viewport: V10 loses the set, V11 does not', () => {
    // The measurement that justifies the whole file. V10's camera stops at its
    // 62 degree ceiling and the outer consoles fall off the sides.
    const v10 = tabletopCamera(aspect);
    expect(fits(v10, enclosurePoints(), aspect)).toBeGreaterThan(1);
    expect(fits(overviewPose(aspect), enclosurePoints(), aspect)).toBeLessThanOrEqual(1);
  });

  it('stands higher than the landscape camera, because portrait reads the set’s depth', () => {
    const portrait = overviewPose(390 / 844);
    const landscape = overviewPose(844 / 390);
    const rise = (p: ReturnType<typeof overviewPose>) => p.position[1] - p.target[1];
    expect(rise(portrait)).toBeGreaterThan(rise(landscape));
  });

  it('puts Virgil nearer the camera than any specialist, so he reads as the subject', () => {
    const pose = overviewPose(aspect);
    const distance = (point: readonly [number, number, number]) =>
      Math.hypot(
        point[0] - pose.position[0],
        point[1] - pose.position[1],
        point[2] - pose.position[2],
      );
    const virgil = distance(layout.virgilAt);
    for (const role of ROLES) {
      const stand = figurePlacement(role).at;
      expect(distance(stand), `${role} stands nearer than Virgil`).toBeGreaterThan(virgil);
    }
  });
});

describe('orientation', () => {
  it('calls a phone held upright portrait and a phone held sideways landscape', () => {
    expect(orientationFor(390 / 844)).toBe('portrait');
    expect(orientationFor(430 / 932)).toBe('portrait');
    expect(orientationFor(844 / 390)).toBe('landscape');
    expect(orientationFor(1440 / 900)).toBe('landscape');
  });

  it('does not oscillate around a square viewport', () => {
    expect(PORTRAIT_MAX_ASPECT).toBeLessThan(1);
    expect(orientationFor(1)).toBe('landscape');
  });
});

describe('the depth layers', () => {
  it('are exactly V10’s in landscape, so nothing about the wide view moves', () => {
    expect(LANDSCAPE_BACKDROP.planetAt).toEqual([...layout.tabletop.planetAt]);
    expect(LANDSCAPE_BACKDROP.stationAt).toEqual([...layout.tabletop.stationAt]);
    expect(backdropFor('landscape')).toBe(LANDSCAPE_BACKDROP);
  });

  it('are drawn inward for portrait, where the horizontal half-angle is about 13 degrees', () => {
    const portrait = backdropFor('portrait');
    expect(Math.abs(portrait.planetAt[0])).toBeLessThan(
      Math.abs(layout.tabletop.planetAt[0] as number),
    );
    expect(Math.abs(portrait.stationAt[0])).toBeLessThan(
      Math.abs(layout.tabletop.stationAt[0] as number),
    );
    // Still far behind the set, or they would stop being depth.
    expect(portrait.planetAt[2]).toBeLessThan(-20);
    expect(portrait.stationAt[2]).toBeLessThan(-20);
  });

  it('is an override, not a change: Tabletop still defaults to the world’s own values', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../src/world/room/Tabletop.tsx'),
      'utf8',
    );
    expect(source).toContain('planetAt = layout.tabletop.planetAt');
    expect(source).toContain('stationAt = layout.tabletop.stationAt');
  });
});

describe('what a tap can reach', () => {
  const list = anchors();
  const listFor = (aspect: number) => anchors(orientationFor(aspect));

  it('covers every character and every important screen, once each', () => {
    const ids = list.map((anchor) => anchor.id).sort();
    expect(ids).toEqual(
      [
        'board-candidate',
        'board-roles',
        'board-verdict',
        'fabricator',
        'fabricator-screen',
        'keeper',
        'keeper-screen',
        'prover',
        'prover-screen',
        'virgil',
      ].sort(),
    );
  });

  it('anchors each specialist on their own head and each screen on its own centre', () => {
    for (const role of ROLES) {
      const person = list.find((anchor) => anchor.id === role);
      const screen = list.find((anchor) => anchor.id === `${role}-screen`);
      expect(person, role).toBeDefined();
      expect(screen, `${role}-screen`).toBeDefined();
      const stand = figurePlacement(role).at;
      expect(person?.point[0]).toBeCloseTo(stand[0] as number, 6);
      expect(person?.point[2]).toBeCloseTo(stand[2] as number, 6);
      // The screen anchor is inside its own measured box.
      const corners = screenCorners(role);
      const xs = corners.map((c) => c[0]);
      const ys = corners.map((c) => c[1]);
      expect(screen?.point[0]).toBeGreaterThanOrEqual(Math.min(...xs) - 0.01);
      expect(screen?.point[0]).toBeLessThanOrEqual(Math.max(...xs) + 0.01);
      expect(screen?.point[1]).toBeGreaterThanOrEqual(Math.min(...ys) - 0.01);
      expect(screen?.point[1]).toBeLessThanOrEqual(Math.max(...ys) + 0.01);
    }
  });

  it('sends a specialist and their screen to the same window, so an overlap is harmless', () => {
    for (const role of ROLES) {
      const person = list.find((anchor) => anchor.id === role);
      const screen = list.find((anchor) => anchor.id === `${role}-screen`);
      expect(person?.window).toEqual(screen?.window);
      expect(person?.focus).toBe(screen?.focus);
    }
  });

  it('is projected inside the frame at every viewport the brief names', () => {
    for (const [name, width, height] of VIEWPORTS) {
      const aspect = width / height;
      const pose = overviewPose(aspect);
      const points = listFor(aspect).map((anchor) => anchor.point);
      expect(fits(pose, points, aspect), `${name}: an anchor is outside the frame`).toBeLessThan(1);
    }
  });
});

describe('every focus has a pose, at every viewport', () => {
  it('produces a finite lens and a camera that is not on its own target', () => {
    for (const [, width, height] of VIEWPORTS) {
      const aspect = width / height;
      for (const focus of ['all', 'virgil', 'board', ...ROLES] as const) {
        const pose = mobilePose(focus, aspect);
        expect(Number.isFinite(pose.fov)).toBe(true);
        expect(pose.fov).toBeGreaterThan(10);
        expect(pose.fov).toBeLessThan(90);
        const distance = Math.hypot(
          pose.position[0] - pose.target[0],
          pose.position[1] - pose.target[1],
          pose.position[2] - pose.target[2],
        );
        expect(distance).toBeGreaterThan(0.5);
      }
    }
  });

  it('holds each specialist’s own screen in their close-up on a phone', () => {
    const aspect = 390 / 844;
    for (const role of ROLES) {
      const pose = mobilePose(role, aspect);
      expect(fits(pose, screenCorners(role), aspect), role).toBeLessThanOrEqual(1);
    }
  });
});
