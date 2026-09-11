import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { layout } from '../src/world/room/palette.js';
import { slabPlan } from '../src/world/screens/ScreenBank.js';
import { TEXTURE_WIDTH } from '../src/world/screens/v11/resolution.js';
import { buildV11Slab, V11_SLAB, v11SlabPlan } from '../src/world/screens/v11/ScreenBankV11.js';
import { LEDGER_SHARE, ledgerRect, ledgerRowAtUv } from '../src/world/screens/v11/screens.js';
import { metrics } from '../src/world/screens/v11/system.js';

/**
 * **Virgil's rebuilt slabs, as arithmetic.**
 *
 * The owner asked for *"more display glass and less bulky beige framing"*
 * and, for Virgil's own slabs, for a rebuild rather than a workaround. The
 * table in `ScreenBankV11.tsx` claims a 73 % thinner bezel, 38 % more glass
 * and a 62 % shallower case in the same overall extent. These compute every
 * one of those figures from both versions' own code, so the claim cannot
 * drift from the geometry — and they hold the one constraint that makes it
 * safe: **the overall extent is unchanged**, because
 * `mobile/composition.ts` solves stage 1's portrait frame against it.
 */

describe('the rebuilt slab, against V10’s', () => {
  const v10 = slabPlan(1.3, 0.8);
  const v11 = v11SlabPlan(1024);

  it('occupies exactly the extent the composition solves against', () => {
    // `compositionPoints()` uses `1.3 / 2 + 0.12` and `0.8 / 2 + 0.12`.
    expect(V11_SLAB.outerWidth).toBeCloseTo(1.3 + 2 * 0.12, 9);
    expect(V11_SLAB.outerHeight).toBeCloseTo(0.8 + 2 * 0.12, 9);
    expect(v10.bezel).toBeCloseTo(0.12, 9);
  });

  it('has a bezel a little under a third of V10’s', () => {
    expect(V11_SLAB.bezel).toBeLessThan(v10.bezel * 0.3);
    expect(1 - V11_SLAB.bezel / v10.bezel).toBeGreaterThan(0.7);
  });

  it('turns that into 38 % more black glass', () => {
    const before = 1.3 * 0.8;
    expect(v11.glassArea / before).toBeGreaterThan(1.38);
    expect(v11.openingWidth).toBeCloseTo(1.476, 6);
    expect(v11.openingHeight).toBeCloseTo(0.976, 6);
  });

  it('is far shallower behind the plate than V10’s swollen shell', () => {
    // V10: a half-ellipsoid scaled to 0.42 * height + 0.06 deep.
    const v10Depth = 0.42 * 0.8 + 0.06;
    expect(V11_SLAB.shellDepth).toBeLessThan(v10Depth * 0.4);
    expect(V11_SLAB.plate).toBeLessThan(v10.plate);
    expect(V11_SLAB.bulge).toBeLessThan(v10.bulge);
  });

  it('carries a gold lip inside a bezel thin enough for the lip to read', () => {
    expect(V11_SLAB.lip).toBeGreaterThan(0.003);
    expect(V11_SLAB.lip).toBeLessThan(V11_SLAB.bezel / 4);
  });

  it('hides the display plane’s cut edge behind the lip, as V10 does', () => {
    expect(v11.displayWidth).toBeGreaterThan(v11.openingWidth);
    expect(v11.displayWidth - v11.openingWidth).toBeCloseTo(2 * V11_SLAB.overhang, 9);
    // Under a plate 30 mm deep with a 9 mm recess, a 5 mm overhang is
    // hidden at every angle the board camera reaches.
    expect(V11_SLAB.overhang).toBeLessThan(V11_SLAB.recess);
  });

  it('draws the canvas at the display plane’s own aspect at every tier', () => {
    for (const width of Object.values(TEXTURE_WIDTH)) {
      const plan = v11SlabPlan(width);
      expect(plan.canvasWidth / plan.canvasHeight).toBeCloseTo(
        plan.displayWidth / plan.displayHeight,
        2,
      );
    }
  });

  it('still stands where the touch anchors and the panel expect it', () => {
    // Nothing here may move the three slabs: stage 1's anchors, its
    // measured 48 px targets and the panel's own routes all name them.
    const { spread, y, z } = layout.screenBank;
    expect(spread).toBeGreaterThan(0);
    expect(Number.isFinite(y) && Number.isFinite(z)).toBe(true);
  });
});

describe('the run ledger’s rows, which a tap has to reach', () => {
  const plan = v11SlabPlan(1024);

  it('puts the three rows where the drawing puts them', () => {
    const m = metrics(plan.canvasWidth, plan.canvasHeight);
    const r = ledgerRect(m);
    expect(r.h / (r.h / LEDGER_SHARE)).toBeCloseTo(LEDGER_SHARE, 6);
    expect(r.y).toBeGreaterThan(m.pad + m.header);
    expect(r.y + r.h).toBeLessThanOrEqual(plan.canvasHeight - m.band);
  });

  it('answers which hop a texture coordinate is in, and nothing outside it', () => {
    const m = metrics(plan.canvasWidth, plan.canvasHeight);
    const r = ledgerRect(m);
    const uvAt = (y: number) => 1 - y / plan.canvasHeight;
    expect(ledgerRowAtUv(uvAt(r.y + r.h * 0.1), plan.canvasWidth, plan.canvasHeight)).toBe(0);
    expect(ledgerRowAtUv(uvAt(r.y + r.h * 0.5), plan.canvasWidth, plan.canvasHeight)).toBe(1);
    expect(ledgerRowAtUv(uvAt(r.y + r.h * 0.9), plan.canvasWidth, plan.canvasHeight)).toBe(2);
    // The header, the hero and the honesty band are not ledger rows.
    expect(ledgerRowAtUv(uvAt(m.pad + 1), plan.canvasWidth, plan.canvasHeight)).toBeNull();
    expect(
      ledgerRowAtUv(uvAt(plan.canvasHeight - m.band / 2), plan.canvasWidth, plan.canvasHeight),
    ).toBeNull();
  });

  it('is the same answer at every tier’s canvas', () => {
    for (const width of Object.values(TEXTURE_WIDTH)) {
      const p = v11SlabPlan(width);
      const m = metrics(p.canvasWidth, p.canvasHeight);
      const r = ledgerRect(m);
      for (const [fraction, want] of [
        [0.1, 0],
        [0.5, 1],
        [0.9, 2],
      ] as [number, number][]) {
        const uv = 1 - (r.y + r.h * fraction) / p.canvasHeight;
        expect(ledgerRowAtUv(uv, p.canvasWidth, p.canvasHeight), `${width} ${fraction}`).toBe(want);
      }
    }
  });
});

describe('the slab’s five layers, stacked front to back', () => {
  /**
   * **The check that would have caught the blank slabs.**
   *
   * The first version of `ScreenBankV11` put the shell's front bevel at
   * z = +0.009, in front of the display plane at −0.009, and the built
   * artifact rendered three blank cream rectangles where Virgil's screens
   * should be — with no console error and nothing thrown, because a solid
   * mesh in front of a live one is not an error. It was found by looking
   * at a frame, which is the only way it could have been found, and it
   * cost a full owner build to find.
   *
   * These assertions cost 30 ms and are exact: `ExtrudeGeometry`'s bevel
   * reaches past both ends of its depth, so the only safe way to place
   * these layers is by their **measured** extents, which is what
   * `buildV11Slab` now does and what this holds it to.
   */
  const plan = v11SlabPlan(1024);
  const parts = buildV11Slab(plan);
  const extent = (geometry: THREE.BufferGeometry, at: number) => {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox as THREE.Box3;
    return { front: box.max.z + at, back: box.min.z + at };
  };

  it('puts the plate’s front face at the group’s origin', () => {
    expect(extent(parts.front, parts.plateAt).front).toBeCloseTo(V11_SLAB.z.plate, 9);
  });

  it('keeps the shell — bevel included — behind the display plane', () => {
    const shell = extent(parts.shell, parts.shellAt);
    expect(shell.front).toBeCloseTo(V11_SLAB.z.shellFront, 9);
    expect(shell.front).toBeLessThan(V11_SLAB.z.display - 0.005);
  });

  it('keeps the gold lip in front of the display and behind the plate', () => {
    const lip = extent(parts.lip, parts.lipAt);
    expect(lip.front).toBeGreaterThan(V11_SLAB.z.display);
    expect(lip.front).toBeLessThan(V11_SLAB.z.plate);
    // And behind the glass, so the lip is seen through it.
    expect(lip.front).toBeLessThan(V11_SLAB.z.glass);
  });

  it('keeps the glass in front of everything the picture is seen through', () => {
    const glass = extent(parts.glass, V11_SLAB.z.glass);
    expect(glass.front).toBeGreaterThan(V11_SLAB.z.plate);
    expect(V11_SLAB.z.glass).toBeGreaterThan(V11_SLAB.z.display);
  });

  it('leaves the gold lip visible inside the plate’s own bevelled opening', () => {
    // The plate's front opening is the opening less the bevel on each
    // side; a lip outside that is a lip nobody sees.
    const visibleOpening = plan.openingWidth - 2 * V11_SLAB.bevelSize;
    const lipOuter = plan.openingWidth - 2 * V11_SLAB.bevelSize + 0.002;
    expect(lipOuter - visibleOpening).toBeLessThan(0.004);
    expect(V11_SLAB.bevelSize).toBeLessThan(plan.openingRadius);
  });

  it('covers the whole opening with the display plane', () => {
    expect(plan.displayWidth).toBeGreaterThan(plan.openingWidth);
    expect(plan.displayHeight).toBeGreaterThan(plan.openingHeight);
  });
});
