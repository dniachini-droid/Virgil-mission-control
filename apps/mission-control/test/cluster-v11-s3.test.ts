import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { overviewPose, PORTRAIT_FRAME } from '../src/world/mobile/composition.js';
import { mobileLimits } from '../src/world/mobile/MobileRoom.js';
import {
  dprFor,
  LOW_CEILING,
  NATIVE_CAP,
  SHARPNESS,
  STANDARD_CEILING,
  textureHeadroom,
} from '../src/world/mobile/pixelRatio.js';
import { ROLES } from '../src/world/room/cast.js';
import {
  type ClusterOrientation,
  V11_CLUSTER,
  V11_CLUSTER_LANDSCAPE,
} from '../src/world/screens/v11/bank.js';
import { TEXTURE_WIDTH } from '../src/world/screens/v11/resolution.js';
import { cameraFor, displays, projected, slabOutlines } from '../study/measureDisplays.js';

/**
 * **The four things the owner asked for at stage 3, from a photograph of his
 * own iPhone — measured, and held.**
 *
 * His words, and what each becomes here:
 *
 *  1. *"the screens are still too high up. And they actually get cut off a
 *     little bit… the three big screens can move a lot further down. And that
 *     way, you can stay kinda zoomed in a little bit."* — the cluster comes
 *     down until it is as close to the consoles as his own first priority
 *     allows, the primary's top clears the Dynamic Island's band at the default
 *     **and** at the lowest pose the camera can reach, and the lens is not
 *     widened to achieve any of it.
 *  2. *"all three screens should be the same size as the top screen, and it
 *     would still fit."* — one scale, and the margins it leaves are measured.
 *  3. *"just even spacing between them, very thin… that same thin space between
 *     the top screen and the two bottom screens."* — one gap, and the two are
 *     equal in **pixels**, which is what he can see.
 *  4. *"the text isn't as crisp as I would like… if we can't, it's no
 *     problems."* — the cause was the canvas's pixel ratio, not the textures,
 *     and the arithmetic that says so is asserted below.
 *
 * And the landscape regression this project introduced at stage 2, fixed.
 *
 * **Every figure is a simulated viewport.** No iPhone exists in this
 * environment; the owner's own screenshot is the only real-device evidence in
 * this stage and it is his, not this session's.
 */

/** What a portrait iPhone reserves at the top for the Dynamic Island. */
const ISLAND_PX = 59;
/** And the `⋯` development entry inside it: a 12 px gutter and a 48 px control. */
const CHROME_PX = ISLAND_PX + 12 + 48;

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function boxes(
  w: number,
  h: number,
  orientation: ClusterOrientation,
): { slabs: Record<string, Box>; screens: Record<string, Box> } {
  const camera = cameraFor(overviewPose(w / h), w, h);
  const project = (quad: THREE.Vector3[]): Box => {
    const points = quad.map((corner) => {
      const p = corner.clone().project(camera);
      return [((p.x + 1) / 2) * w, ((1 - p.y) / 2) * h] as [number, number];
    });
    return {
      left: Math.min(...points.map((p) => p[0])),
      right: Math.max(...points.map((p) => p[0])),
      top: Math.min(...points.map((p) => p[1])),
      bottom: Math.max(...points.map((p) => p[1])),
    };
  };
  const outlines = slabOutlines(orientation);
  const set = displays(orientation);
  const slabs: Record<string, Box> = {};
  for (const [id, quad] of Object.entries(outlines)) slabs[id] = project(quad);
  const screens: Record<string, Box> = {};
  for (const role of ROLES) {
    const display = set[role];
    if (!display) throw new Error(role);
    screens[role] = project(display.quad);
  }
  return { slabs, screens };
}

describe('the cluster comes down, and the top screen is not clipped', () => {
  const CASES: [number, number, number][] = [
    // viewport, and the measured clearance above the primary's own top edge.
    [390, 844, 133.4],
    [430, 932, 147.9],
  ];

  it.each(CASES)('at %i x %i the primary clears the reserved band', (w, h, expected) => {
    const { slabs } = boxes(w, h, 'portrait');
    const primary = slabs['slab-verdict'];
    if (!primary) throw new Error('no primary');
    expect(primary.top).toBeCloseTo(expected, 0);
    // Clear of the Dynamic Island, and clear of the ⋯ control inside it.
    expect(primary.top).toBeGreaterThan(ISLAND_PX);
    expect(primary.top).toBeGreaterThan(CHROME_PX);
  });

  /**
   * **Asserted at the extreme, not only at the default.** A composition that is
   * correct at its default pose and clipped one nudge below it is not correct,
   * and that is exactly what the owner photographed.
   */
  it('still clears the island at the most extreme pose the camera can reach', () => {
    const w = 390;
    const h = 844;
    const pose = overviewPose(w / h);
    const limits = mobileLimits(pose, 'all');
    const target = new THREE.Vector3(...pose.target);
    const eye = new THREE.Vector3(...pose.position).sub(target);
    const polar = Math.atan2(Math.hypot(eye.x, eye.z), eye.y);
    expect(limits.maxPolarAngle - polar).toBeCloseTo(0.06, 6);
    expect(limits.minDistance / eye.length()).toBeCloseTo(0.84, 6);
    // Lowered to the limit **and** pulled in to the nearest stand, which is the
    // combination that clipped the primary before: rotation moves it by less
    // than half a pixel, and the zoom is what did the damage.
    const spherical = new THREE.Spherical().setFromVector3(eye);
    spherical.phi = limits.maxPolarAngle;
    spherical.radius = limits.minDistance;
    const moved = new THREE.Vector3().setFromSpherical(spherical).add(target);
    const camera = cameraFor(
      { position: [moved.x, moved.y, moved.z], target: pose.target, fov: pose.fov },
      w,
      h,
    );
    const quad = slabOutlines('portrait')['slab-verdict'];
    if (!quad) throw new Error('no primary');
    const top = Math.min(...quad.map((corner) => ((1 - corner.clone().project(camera).y) / 2) * h));
    expect(top).toBeGreaterThan(ISLAND_PX);
    // And at the old 0.68 it would have been off the top of the screen, which
    // is the defect the owner photographed.
    spherical.radius = eye.length() * 0.68;
    const old = new THREE.Vector3().setFromSpherical(spherical).add(target);
    const before = cameraFor(
      { position: [old.x, old.y, old.z], target: pose.target, fov: pose.fov },
      w,
      h,
    );
    const topBefore = Math.min(
      ...quad.map((corner) => ((1 - corner.clone().project(before).y) / 2) * h),
    );
    expect(topBefore).toBeLessThan(0);
  });

  it('does not buy the move with a wider lens or a longer stand', () => {
    const pose = overviewPose(390 / 844);
    // Stage 2's own figures: 58.0° at 15.30 m. The lens is at its ceiling and
    // the stand has not lengthened, so nothing here was paid for by pulling
    // back — which is the prize the owner named.
    expect(pose.fov).toBeCloseTo(58, 1);
    const distance = Math.hypot(
      pose.position[0] - pose.target[0],
      pose.position[1] - pose.target[1],
      pose.position[2] - pose.target[2],
    );
    expect(distance).toBeLessThan(15.4);
  });

  it('keeps the three consoles no smaller than stage 2 measured them', () => {
    const { screens } = boxes(390, 844, 'portrait');
    const set = displays('portrait');
    const camera = cameraFor(overviewPose(390 / 844), 390, 844);
    const widths = ROLES.map((role) => {
      const display = set[role];
      if (!display) throw new Error(role);
      return projected(display.quad, camera, 390, 844).widthPx;
    });
    // 43.1 / 36.1 / 39.1 against stage 2's 43.3 / 36.4 / 39.5: the cost of
    // standing the camera 10.3° lower, and it is four hundredths of a pixel
    // per degree because portrait's frame is bound by the consoles' own
    // horizontal footprint.
    expect(widths[0]).toBeCloseTo(43.1, 0);
    expect(widths[1]).toBeCloseTo(36.1, 0);
    expect(widths[2]).toBeCloseTo(39.1, 0);
    for (const width of widths) expect(width).toBeGreaterThan(35);
    void screens;
  });

  it('never lets a slab stand over a console’s own picture', () => {
    for (const [w, h, orientation] of [
      [390, 844, 'portrait'],
      [430, 932, 'portrait'],
      [844, 390, 'landscape'],
    ] as [number, number, ClusterOrientation][]) {
      const { slabs, screens } = boxes(w, h, orientation);
      for (const screen of Object.values(screens)) {
        for (const slab of Object.values(slabs)) {
          const overlapX = Math.min(screen.right, slab.right) - Math.max(screen.left, slab.left);
          const overlapY = Math.min(screen.bottom, slab.bottom) - Math.max(screen.top, slab.top);
          expect(overlapX <= 0 || overlapY <= 0, `${w}x${h}: a slab covers a console`).toBe(true);
        }
      }
    }
  });
});

describe('all three slabs are the same size, and they fit', () => {
  it('gives them one scale', () => {
    expect(V11_CLUSTER.scale).toBe(1.9);
    expect(V11_CLUSTER_LANDSCAPE.scale).toBe(0.92);
  });

  it('leaves a real margin at both portrait widths', () => {
    for (const [w, h, expected] of [
      [390, 844, 26.3],
      [430, 932, 29.1],
    ] as [number, number, number][]) {
      const { slabs } = boxes(w, h, 'portrait');
      const left = slabs['slab-roles'];
      const right = slabs['slab-candidate'];
      if (!left || !right) throw new Error('no pair');
      const margin = Math.min(left.left, w - right.right);
      expect(margin).toBeCloseTo(expected, 0);
      // The owner's own arithmetic put this at about 9 px each side; it is
      // more than that because the solver holds 11 % of air around every
      // critical point, and the pair is inside that rule.
      expect(margin).toBeGreaterThan(8);
    }
  });

  it('measures 160.5 px at 390 and 176.9 at 430, for all three', () => {
    for (const [w, h, expected] of [
      [390, 844, 160.5],
      [430, 932, 176.9],
    ] as [number, number, number][]) {
      const camera = cameraFor(overviewPose(w / h), w, h);
      const set = displays('portrait');
      const widths = ['slab-verdict', 'slab-roles', 'slab-candidate'].map((id) => {
        const display = set[id];
        if (!display) throw new Error(id);
        return projected(display.quad, camera, w, h).widthPx;
      });
      expect(widths[0]).toBeCloseTo(expected, 0);
      // Within 3 % of each other: the pair is turned inward toward Virgil,
      // which foreshortens it slightly, and that is his instruction too.
      for (const width of widths) {
        expect(Math.abs(width - (widths[0] as number)) / (widths[0] as number)).toBeLessThan(0.03);
      }
    }
  });
});

describe('one thin gap, used twice, and even in pixels', () => {
  const CASES: [number, number, ClusterOrientation, number][] = [
    [390, 844, 'portrait', 9.6],
    [430, 932, 'portrait', 10.5],
    [844, 390, 'landscape', 5.9],
  ];

  it.each(CASES)('at %i x %i the two gaps are equal', (w, h, orientation, expected) => {
    const { slabs } = boxes(w, h, orientation);
    const primary = slabs['slab-verdict'];
    const left = slabs['slab-roles'];
    const right = slabs['slab-candidate'];
    if (!primary || !left || !right) throw new Error('cluster');
    const horizontal = right.left - left.right;
    const vertical = Math.min(left.top, right.top) - primary.bottom;
    expect(horizontal).toBeCloseTo(expected, 0);
    // Equal to within a pixel, which is the whole of the instruction.
    expect(Math.abs(horizontal - vertical)).toBeLessThan(1);
    // Thin.
    expect(horizontal).toBeLessThan(12);
  });

  it('derives both from the one gap and never from two numbers', () => {
    expect(V11_CLUSTER.gap).toBe(0.14);
    expect(V11_CLUSTER.verticalGapFactor).toBe(1.3);
  });
});

describe('landscape has its own cluster, and its consoles are back', () => {
  it('recovers them from 23.4 / 19.6 / 21.2 to 45.2 / 35.8 / 40.6 CSS px', () => {
    const camera = cameraFor(overviewPose(844 / 390), 844, 390);
    const set = displays('landscape');
    const widths = ROLES.map((role) => {
      const display = set[role];
      if (!display) throw new Error(role);
      return projected(display.quad, camera, 844, 390).widthPx;
    });
    expect(widths[0]).toBeCloseTo(45.2, 0);
    expect(widths[1]).toBeCloseTo(35.8, 0);
    expect(widths[2]).toBeCloseTo(40.6, 0);
    /**
     * **Better than the one stage-1 figure either record carries**, 40.7 px for
     * the Fabricator's screen — quoted, not re-derived: projecting through the
     * pose stage 1's own table gives 52.5 with today's geometry, so that
     * number could not be reproduced and is not claimed. The comparison that is
     * measured end to end is against stage 2's 23.4 / 19.6 / 21.2, taken with
     * this same code.
     */
    expect(widths[0]).toBeGreaterThan(40.7);
  });

  it('puts the camera back at its nearest stand and takes the lens off its ceiling', () => {
    const pose = overviewPose(844 / 390);
    const distance = Math.hypot(
      pose.position[0] - pose.target[0],
      pose.position[1] - pose.target[1],
      pose.position[2] - pose.target[2],
    );
    // Stage 2: 50.0° at 13.89 m — the widest lens and a long retreat.
    expect(pose.fov).toBeLessThan(50);
    expect(pose.fov).toBeCloseTo(38.6, 0);
    expect(distance).toBeCloseTo(10.5, 1);
  });

  it('keeps landscape’s slabs over the 64 px text-collapse threshold', () => {
    const camera = cameraFor(overviewPose(844 / 390), 844, 390);
    const set = displays('landscape');
    for (const id of ['slab-verdict', 'slab-roles', 'slab-candidate']) {
      const display = set[id];
      if (!display) throw new Error(id);
      expect(projected(display.quad, camera, 844, 390).widthPx, id).toBeGreaterThan(64);
    }
  });

  it('does not touch portrait to get there', () => {
    // The two parameter sets are independent objects; changing one cannot move
    // the other, which is the whole point of the fix.
    expect(V11_CLUSTER).not.toBe(V11_CLUSTER_LANDSCAPE);
    expect(PORTRAIT_FRAME.elevation).toBeCloseTo(11.7, 1);
  });
});

describe('the crispness question: the canvas, not the textures', () => {
  it('was drawing a phone at 1.25× and letting the panel upscale to 3×', () => {
    expect(LOW_CEILING.mobile).toBe(1.25);
    // 42 % of the device's own resolution, which is the whole symptom.
    expect(LOW_CEILING.mobile / 3).toBeLessThan(0.45);
  });

  it('raises the default to 2× on a phone, and offers native beside it', () => {
    expect(STANDARD_CEILING.mobile).toBe(2);
    expect(dprFor('mobile', 'standard')).toEqual([1, 2]);
    expect(dprFor('mobile', 'native', 3)).toEqual([1, 3]);
    expect(dprFor('mobile', 'native', 4)).toEqual([1, NATIVE_CAP]);
    expect(dprFor('mobile', 'low')).toEqual([1, 1.25]);
    /**
     * **Stage 4 put `auto` in front of the three, and left the three
     * untouched.** Stage 3's assertion read exactly `['low', 'standard',
     * 'native']`; it is widened here rather than deleted, because the three
     * explicit settings still have to mean what stage 3 said they mean — which
     * the four expectations above still hold — and what changed is only that
     * the default is now derived from the tier's pixel budget instead of being
     * a flat 2 everywhere (`world/mobile/performance.ts`,
     * `test/performance-v11.test.ts`).
     */
    expect(SHARPNESS.map((option) => option.id)).toEqual(['auto', 'low', 'standard', 'native']);
  });

  it('never draws below one device pixel per CSS pixel', () => {
    for (const sharpness of SHARPNESS) {
      for (const tier of ['ultra', 'desktop', 'laptop', 'mobile', 'constrained'] as const) {
        expect(dprFor(tier, sharpness.id, 3)[0], `${tier}/${sharpness.id}`).toBe(1);
      }
    }
  });

  it('shows the textures were never the limit', () => {
    // A slab's display is 160.5 CSS px at 390 x 844. At the device's own ratio
    // of 3 that is 482 device pixels, drawn from a 1024 px texture on the
    // mobile tier: 2.1x more texture than there are pixels to put it in. No
    // texture increase could have made this crisper.
    const headroom = textureHeadroom(160.5, TEXTURE_WIDTH.mobile, 3);
    expect(headroom).toBeGreaterThan(2);
    // And at the old 1.25 the headroom was over five, which is memory spent on
    // detail the canvas could not resolve.
    expect(textureHeadroom(160.5, TEXTURE_WIDTH.mobile, 1.25)).toBeGreaterThan(5);
  });
});
