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
  stepFor,
} from '../src/world/mobile/composition.js';
import { bustPoints, screenKept } from '../src/world/mobile/stationCloseUp.js';
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

/**
 * **The two steps, as the owner decided them on 10 September**, reversing his
 * own decision of 8 September: *"first zoom in to their close up view. And THEN
 * when you click their screen, that's when it should open the window."*
 *
 * `stepFor` is the whole rule and these are its cases. The behaviour itself is
 * driven in a browser at three viewports by `e2e/verify-owner-build-v11.ts`,
 * which presses twice and measures each step; a source-level test cannot tell
 * whether a real thumb reaches a real target.
 */
describe('tapping a station is two steps', () => {
  const list = anchors();
  const at = (id: string) => {
    const found = list.find((anchor) => anchor.id === id);
    if (!found) throw new Error(`no anchor ${id}`);
    return found;
  };

  it('travels and opens nothing on the first tap, from the overview', () => {
    for (const anchor of list) {
      const step = stepFor(anchor, 'all');
      expect(step.window, `${anchor.id} opened a window on the first tap`).toBeNull();
      expect(step.focus, anchor.id).toBe(anchor.focus);
    }
  });

  it('opens on the second tap, and does not move the camera again', () => {
    for (const anchor of list) {
      const step = stepFor(anchor, anchor.focus);
      expect(step.window, `${anchor.id} did not open on the second tap`).toEqual(anchor.window);
      expect(step.focus, `${anchor.id} moved the camera on the tap that opened`).toBe(anchor.focus);
    }
  });

  it('treats a character and their own screen as one station, in both orders', () => {
    for (const role of ROLES) {
      // Screen first: it travels, exactly as the character would.
      expect(stepFor(at(`${role}-screen`), 'all').window).toBeNull();
      // Then either part of the station opens it.
      expect(stepFor(at(`${role}-screen`), role).window).toEqual({ agent: role });
      expect(stepFor(at(role), role).window).toEqual({ agent: role });
    }
  });

  it('travels to another station rather than opening it, from a station', () => {
    expect(stepFor(at('keeper'), 'fabricator')).toEqual({ focus: 'keeper', window: null });
    expect(stepFor(at('prover-screen'), 'virgil')).toEqual({ focus: 'prover', window: null });
    // Virgil's slabs are their own station: they are above the frame at his
    // close-up and project to nothing there, so a tap that reaches one has come
    // from somewhere else and is a first step.
    expect(stepFor(at('board-verdict'), 'virgil')).toEqual({ focus: 'board', window: null });
    expect(stepFor(at('board-verdict'), 'board').window).toEqual({ agent: 'virgil', at: 'truth' });
  });

  it('gives Virgil a second step of his own, because he has no screen', () => {
    // His console is a bare ring (`room/Models.tsx`) and his displays are the
    // three slabs, out of frame at his close-up. The station is the unit, so
    // the second tap on him is what opens his conversation.
    expect(stepFor(at('virgil'), 'all')).toEqual({ focus: 'virgil', window: null });
    expect(stepFor(at('virgil'), 'virgil')).toEqual({
      focus: 'virgil',
      window: { agent: 'virgil' },
    });
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

  /**
   * **This assertion was replaced, and the replacement is the stronger one.**
   *
   * It used to require the whole of `screenCorners(role)` — the axis-aligned
   * box of the console's own screen triangles — inside the station close-up's
   * frame, because until stage 3 that screen was the only place a reader could
   * read what had happened. Stage 3's window carries that now, and the owner
   * has asked for the frame the screen was winning at the character's expense
   * (`mobile/stationCloseUp.ts`). So the requirement is no longer "the whole
   * screen" and asserting it would be asserting a thing the product no longer
   * does.
   *
   * What is required instead is **both** of the two things the old form did not
   * hold together: the part of the screen the **primary state** is drawn on,
   * and the **character**. `test/station-close-up-v11.test.ts` holds the whole
   * of that contract, casts rays at it and measures what the frame gives up;
   * this is the composition-level statement of it, in the file that owns
   * `mobilePose`.
   */
  it('holds each specialist’s primary state and each specialist in their close-up', () => {
    for (const [name, width, height] of VIEWPORTS) {
      const aspect = width / height;
      for (const role of ROLES) {
        const pose = mobilePose(role, aspect);
        expect(
          fits(pose, screenKept(role), aspect),
          `${name} ${role}: the screen's primary-state end is outside the frame`,
        ).toBeLessThanOrEqual(1);
        expect(
          fits(pose, bustPoints(role), aspect),
          `${name} ${role}: the character is outside the frame`,
        ).toBeLessThanOrEqual(1);
      }
    }
  });
});
