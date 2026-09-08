import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  drawFloorGraphic,
  type FloorGraphicSpec,
  floorToPixel,
  INLAY,
} from '../src/world/room/floorGraphic.js';
import { layout, room } from '../src/world/room/palette.js';

/**
 * The floor flickered on the owner's phone (V7 brief §5): the gold rings
 * and the navy disc were separate meshes a millimetre apart, and the depth
 * buffer swapped them frame to frame. The repair is one texture on one
 * face. This holds it there: the graphic is drawn where the layout says,
 * everything drawn lands inside the disc, and no second floor surface is
 * put back over the tabletop.
 */

/** A recording 2D context: enough of the API for `drawFloorGraphic`. */
function recorder() {
  const arcs: { x: number; y: number; r: number; op: 'fill' | 'stroke'; style: string }[] = [];
  const polygons: { points: [number, number][]; style: string }[] = [];
  let path:
    | { kind: 'arc'; x: number; y: number; r: number }
    | { kind: 'poly'; points: [number, number][] }
    | null = null;
  const ctx = {
    fillStyle: '' as string,
    strokeStyle: '' as string,
    lineWidth: 1,
    clearRect() {},
    fillRect() {},
    beginPath() {
      path = null;
    },
    arc(x: number, y: number, r: number) {
      path = { kind: 'arc', x, y, r };
    },
    moveTo(x: number, y: number) {
      path = { kind: 'poly', points: [[x, y]] };
    },
    lineTo(x: number, y: number) {
      if (path?.kind === 'poly') path.points.push([x, y]);
    },
    closePath() {},
    fill() {
      if (path?.kind === 'arc') arcs.push({ ...path, op: 'fill', style: ctx.fillStyle });
      if (path?.kind === 'poly') polygons.push({ points: path.points, style: ctx.fillStyle });
    },
    stroke() {
      if (path?.kind === 'arc') arcs.push({ ...path, op: 'stroke', style: ctx.strokeStyle });
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, arcs, polygons };
}

const spec: FloorGraphicSpec = {
  centre: [layout.tabletop.centre[0], layout.tabletop.centre[2]],
  size: layout.tabletop.radius * 2,
  console: [layout.consoleCentre[0], layout.consoleCentre[2]],
  star: layout.tabletop.starAt,
  pixels: 2048,
};
const k = spec.pixels / spec.size;

describe('the floor graphic', () => {
  const { ctx, arcs, polygons } = recorder();
  drawFloorGraphic(ctx, spec);

  it('draws the rings round the console foot, in gold, at the layout’s radii', () => {
    const [cx, cy] = floorToPixel(spec, spec.console[0], spec.console[1]);
    const rings = arcs.filter(
      (a) => a.op === 'stroke' && Math.abs(a.x - cx) < 1e-6 && Math.abs(a.y - cy) < 1e-6,
    );
    expect(rings.map((r) => r.style)).toEqual(INLAY.rings.map(() => room.surface.gold));
    expect(rings.map((r) => r.r / k)).toEqual(INLAY.rings.map((r) => r.r + r.w / 2));
    const navy = arcs.find((a) => a.op === 'fill' && a.x === cx && a.y === cy);
    expect(navy?.style).toBe(room.surface.navy);
    expect((navy as { r: number }).r / k).toBeCloseTo(INLAY.navyRadius, 6);
  });

  it('draws one four-point star where the layout puts it, on a navy disc with a gold ring', () => {
    const [sx, sy] = floorToPixel(spec, spec.star[0], spec.star[1]);
    expect(polygons).toHaveLength(1);
    const star = polygons[0] as { points: [number, number][]; style: string };
    expect(star.style).toBe(room.surface.gold);
    expect(star.points).toHaveLength(8);
    const radii = star.points.map(([x, y]) => Math.hypot(x - sx, y - sy) / k);
    for (let i = 0; i < 8; i += 1) {
      expect(radii[i]).toBeCloseTo(i % 2 === 0 ? INLAY.starOuter : INLAY.starInner, 6);
    }
    const disc = arcs.find(
      (a) => a.op === 'fill' && Math.abs(a.x - sx) < 1e-6 && Math.abs(a.y - sy) < 1e-6,
    );
    expect(disc?.style).toBe(room.surface.navy);
    const ring = arcs.find(
      (a) => a.op === 'stroke' && Math.abs(a.x - sx) < 1e-6 && Math.abs(a.y - sy) < 1e-6,
    );
    expect(ring?.style).toBe(room.surface.gold);
  });

  it('lands everything inside the disc, so nothing is cut by its edge', () => {
    const [cx, cz] = spec.centre;
    const R = layout.tabletop.radius;
    const outer = INLAY.rings[INLAY.rings.length - 1] as { r: number; w: number };
    const consoleReach = Math.hypot(spec.console[0] - cx, spec.console[1] - cz) + outer.r + outer.w;
    expect(consoleReach).toBeLessThan(R);
    const starReach =
      Math.hypot(spec.star[0] - cx, spec.star[1] - cz) + INLAY.starRing.r + INLAY.starRing.w;
    expect(starReach).toBeLessThan(R);
    // And the star is not under the console: it is there to be seen.
    expect(
      Math.hypot(spec.star[0] - spec.console[0], spec.star[1] - spec.console[1]),
    ).toBeGreaterThan(layout.consoleWidth / 2 + INLAY.starRing.r);
  });

  it('maps metres to pixels with −z at the top of the canvas', () => {
    expect(floorToPixel(spec, cxOf(spec), czOf(spec))).toEqual([spec.pixels / 2, spec.pixels / 2]);
    const [, top] = floorToPixel(spec, cxOf(spec), czOf(spec) - spec.size / 2);
    expect(top).toBe(0);
  });
});

const cxOf = (s: FloorGraphicSpec) => s.centre[0];
const czOf = (s: FloorGraphicSpec) => s.centre[1];

describe('the tabletop floor', () => {
  const src = readFileSync(resolve(import.meta.dirname, '../src/world/room/Tabletop.tsx'), 'utf8');

  it('has one top face carrying the graphic as a texture, and no coplanar inlay meshes', () => {
    expect(src).toContain('createFloorTexture(');
    expect(src).not.toContain('polygonOffset');
    expect(src).not.toContain('FloorInlay');
    expect(src).not.toMatch(/<ringGeometry/);
    expect((src.match(/<circleGeometry/g) ?? []).length).toBe(1);
  });
});
