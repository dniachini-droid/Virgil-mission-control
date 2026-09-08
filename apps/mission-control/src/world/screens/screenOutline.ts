import * as THREE from 'three';
import type { VisorMask } from '../characters/visorFit.js';

/**
 * **A console's screen is drawn to the shape of the model's own opening,
 * not to a rectangle floating inside it.**
 *
 * V8 inset the console pictures so the honesty band would clear the
 * bezel's lip (`1cb9bec`), and V8.1 drew each one as an axis-aligned
 * rectangle in the fitted plane. The owner, on the V8.1 frames: *"the
 * screens are better, but they are still sharp edges, a rectangle,
 * instead of going right to the end of the screen. the screens need to
 * curve on the corners. and go right to the end."*
 *
 * Both faults have one cause: the drawn area was **chosen** — an extent
 * minus a 35 mm inset, with square corners — instead of **derived**. Each
 * Meshy console's recessed screen opening has its own real shape, and the
 * principle that made the visors work in V7 (the boundary comes from the
 * model's own painted triangles) applies here too. So:
 *
 *  1. the selection is **projected into the fitted plane** and its
 *     **border** taken: the edges exactly one selected triangle uses;
 *  2. a **rounded rectangle is least-squares-fitted** to that border over
 *     its centre, half-extents and **corner radius**, so the radius is
 *     measured off the geometry rather than picked by eye. The residual is
 *     reported in millimetres and recorded in
 *     `test/console-screens.test.ts`, exactly as the plane's residual is,
 *     so a payload change or a re-fit that moves it fails a check;
 *  3. the outline is then **contracted by the least amount that puts it
 *     wholly inside the selection's own footprint** (`inset`), keeping the
 *     measured radius, because a least-squares fit crosses the jagged
 *     border it is fitted to and the picture must not spill onto the
 *     bezel. On these three payloads that contraction is 7.5, 15.3 and
 *     8.1 mm — derived and minimal, where V8.1's was a chosen 35 mm a
 *     side. It is reported, because it is the whole of the gap between the
 *     picture's edge and the model's own.
 *
 * The picture and the convex glass are both built to this one outline
 * (`screenPlane.ts`), so a rounded picture never sits behind rectangular
 * glass, and the picture is feathered over the last canvas pixel and a
 * half of its edge, because a mask taken from 23–41 coarse triangles would
 * otherwise alias along the arcs.
 *
 * **Two measured facts about these payloads that the method has to
 * survive, both found by getting it wrong first.**
 *
 *  - *One of the Fabricator's screen triangles is wound against its
 *    neighbours.* Of its 38 triangles, exactly one **directed** edge a→b
 *    occurs twice — two triangles sharing an edge with the same winding.
 *    A border test that asks "is the reverse half-edge missing?" calls
 *    that interior edge a border on both sides. So the rule here is the
 *    undirected one: **an edge is on the border when exactly one selected
 *    triangle uses it**, whatever its winding.
 *  - *Nothing here chains the border into a loop.* An earlier version did,
 *    and on the Fabricator the walk took a wrong turn at a pinch and
 *    returned a self-crossing loop that wandered through the middle of the
 *    screen: 204 mm of fit error and a 199 mm inset, for a boundary that
 *    is in fact a clean rounded rectangle. Ordering is not needed and is
 *    not used. The fit samples the border **segments**, which is
 *    order-independent, and containment is tested against the **union of
 *    the projected triangles**, which is order-independent too — and is
 *    also the stricter test, because it is the selection itself rather
 *    than a polygon derived from it.
 *
 * Everything here is plain geometry: no renderer, no document.
 */

/**
 * What `fitScreenPlane` returns and all this module needs of it: the
 * fitted plane's frame. Declared here rather than imported, so the
 * dependency runs one way — `screenPlane.ts` uses this file, and this file
 * uses nothing of it.
 */
export interface PlaneFrame {
  centre: THREE.Vector3;
  normal: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
  halfWidth: number;
  halfHeight: number;
}

/** A point in the fitted plane, relative to the plane's centre, in metres. */
export interface PlanePoint {
  u: number;
  v: number;
}

/** An axis-aligned rounded rectangle in the fitted plane. */
export interface RoundedRect {
  centreU: number;
  centreV: number;
  halfWidth: number;
  halfHeight: number;
  radius: number;
}

/** The selection as seen in its own plane. */
export interface SelectionFootprint {
  /** Every selected triangle, projected. */
  triangles: [PlanePoint, PlanePoint, PlanePoint][];
  /** The edges exactly one selected triangle uses: the selection's border. */
  border: [PlanePoint, PlanePoint][];
  /** How many edges were shared by two or more triangles, and how many by one. */
  interiorEdges: number;
}

export interface ScreenOutline {
  /** The rounded rectangle fitted to the border: the measurement. */
  fitted: RoundedRect;
  /** The fit contracted by `inset`: what is actually drawn. */
  drawn: RoundedRect;
  /** How far the border departs from the fitted outline, in metres, over the kept samples. */
  rms: number;
  /** The worst departure over the kept samples, either way. */
  worst: number;
  /** The worst departure with the border inside the fit — the side that spills. */
  worstOutside: number;
  /** The least contraction that puts the outline inside the footprint, in metres. */
  inset: number;
  /** What it was fitted to. */
  footprint: SelectionFootprint;
  borderSamples: number;
  /**
   * How much of the border the trimmed refit set aside as not belonging to
   * the opening's outline, and how far the worst of it lies from the fit.
   * Both are reported rather than hidden: they are the measure of how far
   * a station's selection is from being one clean rounded opening.
   */
  trimmed: number;
  trimmedFraction: number;
  worstTrimmed: number;
}

/**
 * The signed distance from a point to an axis-aligned rounded rectangle:
 * negative inside, positive outside, and exact. This is the residual the
 * fit minimises.
 */
export function roundedRectDistance(p: PlanePoint, rect: RoundedRect): number {
  const r = Math.max(0, Math.min(rect.radius, rect.halfWidth, rect.halfHeight));
  const qx = Math.abs(p.u - rect.centreU) - (rect.halfWidth - r);
  const qy = Math.abs(p.v - rect.centreV) - (rect.halfHeight - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/**
 * The rounded rectangle's outline, sampled at even arc length: four
 * straight runs and four quarter arcs, starting at the middle of the
 * bottom edge and going anticlockwise.
 */
export function roundedRectOutline(rect: RoundedRect, count: number): PlanePoint[] {
  const r = Math.max(0, Math.min(rect.radius, rect.halfWidth, rect.halfHeight));
  const ex = rect.halfWidth - r;
  const ey = rect.halfHeight - r;
  const su = 2 * ex;
  const sv = 2 * ey;
  const arc = (Math.PI / 2) * r;
  const perimeter = 2 * su + 2 * sv + 4 * arc;
  const points: PlanePoint[] = [];
  for (let i = 0; i < count; i += 1) {
    let s = (i / count) * perimeter;
    let u = 0;
    let v = 0;
    if (s < su) {
      u = rect.centreU - ex + s;
      v = rect.centreV - rect.halfHeight;
    } else if ((s -= su) < arc) {
      const a = -Math.PI / 2 + (r > 0 ? s / r : 0);
      u = rect.centreU + ex + r * Math.cos(a);
      v = rect.centreV - ey + r * Math.sin(a);
    } else if ((s -= arc) < sv) {
      u = rect.centreU + rect.halfWidth;
      v = rect.centreV - ey + s;
    } else if ((s -= sv) < arc) {
      const a = r > 0 ? s / r : 0;
      u = rect.centreU + ex + r * Math.cos(a);
      v = rect.centreV + ey + r * Math.sin(a);
    } else if ((s -= arc) < su) {
      u = rect.centreU + ex - s;
      v = rect.centreV + rect.halfHeight;
    } else if ((s -= su) < arc) {
      const a = Math.PI / 2 + (r > 0 ? s / r : 0);
      u = rect.centreU - ex + r * Math.cos(a);
      v = rect.centreV + ey + r * Math.sin(a);
    } else if ((s -= arc) < sv) {
      u = rect.centreU - rect.halfWidth;
      v = rect.centreV + ey - s;
    } else {
      const a = Math.PI + (r > 0 ? (s - sv) / r : 0);
      u = rect.centreU - ex + r * Math.cos(a);
      v = rect.centreV - ey + r * Math.sin(a);
    }
    points.push({ u, v });
  }
  return points;
}

/**
 * The selection in its own plane: every triangle projected, and the edges
 * exactly one triangle uses. Vertices are welded by position first,
 * because a Meshy console's mesh is split along its uv seams and two
 * coincident vertices carry different indices — without welding, an
 * interior edge reads as a border.
 */
export function projectSelection(
  mask: VisorMask,
  positions: ArrayLike<number>,
  index: ArrayLike<number>,
  plane: PlaneFrame,
): SelectionFootprint {
  const canonical = new Map<number, number>();
  const weld = new Map<string, number>();
  for (const t of mask.triangles) {
    for (let k = 0; k < 3; k += 1) {
      const v = index[t * 3 + k] as number;
      const key = `${Math.round((positions[v * 3] as number) * 1e6)},${Math.round(
        (positions[v * 3 + 1] as number) * 1e6,
      )},${Math.round((positions[v * 3 + 2] as number) * 1e6)}`;
      const found = weld.get(key);
      if (found === undefined) weld.set(key, v);
      canonical.set(v, found ?? v);
    }
  }
  const point = new THREE.Vector3();
  const cache = new Map<number, PlanePoint>();
  const project = (v: number): PlanePoint => {
    const seen = cache.get(v);
    if (seen) return seen;
    point
      .set(
        positions[v * 3] as number,
        positions[v * 3 + 1] as number,
        positions[v * 3 + 2] as number,
      )
      .sub(plane.centre);
    const p = { u: point.dot(plane.right), v: point.dot(plane.up) };
    cache.set(v, p);
    return p;
  };
  const triangles: [PlanePoint, PlanePoint, PlanePoint][] = [];
  const shared = new Map<string, { a: number; b: number; used: number }>();
  const id = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  for (const t of mask.triangles) {
    const vs = [0, 1, 2].map((k) => canonical.get(index[t * 3 + k] as number) as number);
    triangles.push([project(vs[0] as number), project(vs[1] as number), project(vs[2] as number)]);
    for (let k = 0; k < 3; k += 1) {
      const a = vs[k] as number;
      const b = vs[(k + 1) % 3] as number;
      if (a === b) continue;
      const seen = shared.get(id(a, b));
      if (seen) seen.used += 1;
      else shared.set(id(a, b), { a, b, used: 1 });
    }
  }
  const border: [PlanePoint, PlanePoint][] = [];
  let interiorEdges = 0;
  for (const e of shared.values()) {
    if (e.used === 1) border.push([project(e.a), project(e.b)]);
    else interiorEdges += 1;
  }
  return { triangles, border, interiorEdges };
}

/** Whether a point in the plane is covered by any of the selection's triangles. */
export function insideFootprint(footprint: SelectionFootprint, p: PlanePoint): boolean {
  for (const [a, b, c] of footprint.triangles) {
    const d1 = (b.u - a.u) * (p.v - a.v) - (b.v - a.v) * (p.u - a.u);
    const d2 = (c.u - b.u) * (p.v - b.v) - (c.v - b.v) * (p.u - b.u);
    const d3 = (a.u - c.u) * (p.v - c.v) - (a.v - c.v) * (p.u - c.u);
    if ((d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0)) return true;
  }
  return false;
}

/** The border segments resampled at about `spacing`, so a long edge does not outvote a short one. */
function sampleBorder(border: [PlanePoint, PlanePoint][], spacing: number): PlanePoint[] {
  const out: PlanePoint[] = [];
  for (const [a, b] of border) {
    const steps = Math.max(1, Math.round(Math.hypot(b.u - a.u, b.v - a.v) / spacing));
    for (let k = 0; k <= steps; k += 1) {
      const t = k / steps;
      out.push({ u: a.u + (b.u - a.u) * t, v: a.v + (b.v - a.v) * t });
    }
  }
  return out;
}

/** Nelder–Mead on a small parameter vector: no derivatives, and deterministic. */
function minimise(
  cost: (x: number[]) => number,
  start: number[],
  step: number[],
  iterations = 500,
): number[] {
  const n = start.length;
  let simplex = [start.slice()];
  for (let i = 0; i < n; i += 1) {
    const x = start.slice();
    x[i] = (x[i] as number) + (step[i] as number);
    simplex.push(x);
  }
  let values = simplex.map(cost);
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const order = values.map((v, i) => [v, i] as [number, number]).sort((a, b) => a[0] - b[0]);
    simplex = order.map(([, i]) => simplex[i] as number[]);
    values = order.map(([v]) => v);
    const best = simplex[0] as number[];
    const worst = simplex[n] as number[];
    if (
      Math.max(...simplex.map((s) => Math.hypot(...s.map((v, j) => v - (best[j] as number))))) <
      1e-10
    )
      break;
    const centroid = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i += 1)
      for (let j = 0; j < n; j += 1)
        centroid[j] = (centroid[j] as number) + ((simplex[i] as number[])[j] as number) / n;
    const along = (k: number) => centroid.map((c, j) => c + k * (c - (worst[j] as number)));
    const reflected = along(1);
    const fr = cost(reflected);
    if (fr < (values[0] as number)) {
      const expanded = along(2);
      const fe = cost(expanded);
      if (fe < fr) {
        simplex[n] = expanded;
        values[n] = fe;
      } else {
        simplex[n] = reflected;
        values[n] = fr;
      }
    } else if (fr < (values[n - 1] as number)) {
      simplex[n] = reflected;
      values[n] = fr;
    } else {
      const contracted = along(-0.5);
      const fc = cost(contracted);
      if (fc < (values[n] as number)) {
        simplex[n] = contracted;
        values[n] = fc;
      } else {
        for (let i = 1; i <= n; i += 1) {
          simplex[i] = (simplex[i] as number[]).map(
            (v, j) => (best[j] as number) + 0.5 * (v - (best[j] as number)),
          );
          values[i] = cost(simplex[i] as number[]);
        }
      }
    }
  }
  let k = 0;
  for (let i = 1; i < values.length; i += 1)
    if ((values[i] as number) < (values[k] as number)) k = i;
  return simplex[k] as number[];
}

/** How densely the border is sampled for the fit, in metres. */
export const BORDER_SAMPLE_SPACING_M = 0.004;
/** How many points of the drawn outline are tested against the footprint. */
export const OUTLINE_SAMPLES = 512;

/**
 * The screen's outline: a rounded rectangle fitted to the selection's own
 * border in the fitted plane, and the contraction that keeps it inside the
 * selection.
 */
export function fitScreenOutline(
  mask: VisorMask,
  positions: ArrayLike<number>,
  index: ArrayLike<number>,
  plane: PlaneFrame,
): ScreenOutline {
  const footprint = projectSelection(mask, positions, index, plane);
  if (footprint.border.length < 6)
    throw new Error('screen outline: the selection has no usable border');
  const samples = sampleBorder(footprint.border, BORDER_SAMPLE_SPACING_M);

  const asRect = (x: number[]): RoundedRect => ({
    centreU: x[0] as number,
    centreV: x[1] as number,
    halfWidth: x[2] as number,
    halfHeight: x[3] as number,
    // The radius is a length: a negative one is the same shape as zero, so
    // it is clamped here and penalised in the cost, which keeps a gradient.
    radius: Math.max(0, Math.min(x[4] as number, x[2] as number, x[3] as number)),
  });
  const fitTo = (points: PlanePoint[]): RoundedRect => {
    const cost = (x: number[]) => {
      const rect = asRect(x);
      if (rect.halfWidth <= 0.02 || rect.halfHeight <= 0.02) return 1e6;
      let sum = 0;
      for (const p of points) sum += roundedRectDistance(p, rect) ** 2;
      return sum / points.length + ((x[4] as number) < 0 ? (x[4] as number) ** 2 : 0);
    };
    return asRect(
      minimise(
        cost,
        [0, 0, plane.halfWidth, plane.halfHeight, 0.04],
        [0.008, 0.008, 0.008, 0.008, 0.02],
      ),
    );
  };

  /**
   * A **trimmed** refit, because two of the three selections carry border
   * that is not the opening's outline, and it was measured before it was
   * handled. The Fabricator's decimated screen carries a flap — two border
   * edges running from its bottom-right corner to a point 143 mm inside the
   * screen, over surface that other triangles already cover — and the
   * Prover's selection reaches below the opening onto the console's chin in
   * three fragments. Fitted to every border sample, the Fabricator's
   * rounded rectangle comes back 71 mm short with a 3.6 mm radius, and the
   * Prover's with a radius of exactly zero: the outliers decide the shape.
   *
   * So the fit is repeated with the far samples set aside, three times.
   * The scale is the median absolute residual (times 1.4826, which makes it
   * an estimate of the standard deviation for a normal sample), and a
   * sample beyond 3.5 of those is set aside — the ordinary robust
   * criterion, with no per-station tuning anywhere. What was set aside is
   * counted and reported (`trimmed`, `worstTrimmed`), because a station
   * whose opening needs a third of its border ignored is a station whose
   * opening is not a rounded rectangle, and that is the owner's to know
   * rather than this file's to smooth over.
   */
  let kept = samples;
  let fitted = fitTo(kept);
  for (let pass = 0; pass < 3; pass += 1) {
    const residuals = samples.map((p) => Math.abs(roundedRectDistance(p, fitted)));
    const sorted = [...residuals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] as number;
    const limit = 3.5 * 1.4826 * median;
    if (!(limit > 0)) break;
    const next = samples.filter((_, i) => (residuals[i] as number) <= limit);
    if (next.length < samples.length / 3 || next.length === kept.length) break;
    kept = next;
    fitted = fitTo(kept);
  }

  let squares = 0;
  let worst = 0;
  let worstOutside = 0;
  for (const p of kept) {
    const d = roundedRectDistance(p, fitted);
    squares += d * d;
    worst = Math.max(worst, Math.abs(d));
    worstOutside = Math.max(worstOutside, -d);
  }
  const keptSet = new Set(kept);
  let worstTrimmed = 0;
  for (const p of samples)
    if (!keptSet.has(p))
      worstTrimmed = Math.max(worstTrimmed, Math.abs(roundedRectDistance(p, fitted)));

  /**
   * What is drawn: **the largest rounded rectangle of the fitted family
   * that lies wholly inside the selection.** The picture must not spill
   * onto the bezel, and a least-squares fit crosses the border it was
   * fitted to, so something has to give; the question is what.
   *
   * A uniform inward contraction of the fit is the obvious answer and it
   * is the wrong one for the Prover, whose opening is **chamfered rather
   * than rounded** — its corners are cut at 45° over about 50 mm. A
   * least-squares arc through a chamfer bulges past it, so contracting
   * uniformly until the arc clears it costs him 21.6 mm on every side:
   * 5 % of his screen's width and 9 % of its height, in a pass whose
   * instruction was to go right to the end. A **larger** radius at the
   * full extent tucks inside the same chamfer and clears it with no
   * contraction at all.
   *
   * So the radius and the contraction are searched together, and the
   * member with the greatest drawn area wins — area being
   * `4·hw·hh − (4−π)·r²`, which by itself prefers the smallest radius that
   * allows the least contraction. Both numbers are reported: `fitted` is
   * the measurement of the opening, `drawn` is what the picture uses, and
   * where they differ the difference is the shape of the opening telling
   * us it is not quite a rounded rectangle.
   */
  const clears = (rect: RoundedRect) =>
    roundedRectOutline(rect, OUTLINE_SAMPLES).every((p) => insideFootprint(footprint, p));
  const limit = Math.min(fitted.halfWidth, fitted.halfHeight);
  const at = (d: number): RoundedRect => ({
    centreU: fitted.centreU,
    centreV: fitted.centreV,
    halfWidth: fitted.halfWidth - d,
    halfHeight: fitted.halfHeight - d,
    // **The measured radius is kept**, not offset with the extents. A true
    // inward offset would take it down with them (the Prover's 42.9 mm to
    // 21.3 mm), and the corners are the thing the owner asked for. Holding
    // it also costs less: a relatively rounder corner tucks inside a
    // chamfer sooner, and the Prover's contraction falls from 21.6 mm to a
    // third of that.
    radius: Math.max(0.0005, Math.min(fitted.radius, fitted.halfWidth - d, fitted.halfHeight - d)),
  });
  let inset = 0;
  if (!clears(at(0))) {
    let low = 0;
    let high = limit - 0.02;
    for (let i = 0; i < 30; i += 1) {
      const mid = (low + high) / 2;
      if (clears(at(mid))) high = mid;
      else low = mid;
    }
    inset = high;
  }
  const drawn = at(inset);

  return {
    fitted,
    drawn,
    rms: Math.sqrt(squares / kept.length),
    worst,
    worstOutside,
    inset,
    footprint,
    borderSamples: samples.length,
    trimmed: samples.length - kept.length,
    trimmedFraction: (samples.length - kept.length) / samples.length,
    worstTrimmed,
  };
}

/**
 * A tessellated rounded rectangle: the outline sampled at even arc length,
 * and rings scaled in toward the centre, so every iso-ring is a scaled
 * copy of the outline and the patch is smooth right into the corners.
 * `height(rho)` is the offset along the normal at radial fraction `rho`
 * — 1 at the edge, 0 at the centre — flat for the picture, the CRT's
 * profile for the glass.
 */
export function roundedRectSurface(
  rect: RoundedRect,
  rings: number,
  perimeterSamples: number,
  height: (rho: number) => number,
): { u: Float32Array; v: Float32Array; h: Float32Array; index: number[] } {
  const edge = roundedRectOutline(rect, perimeterSamples);
  const count = 1 + rings * edge.length;
  const u = new Float32Array(count);
  const v = new Float32Array(count);
  const h = new Float32Array(count);
  u[0] = rect.centreU;
  v[0] = rect.centreV;
  h[0] = height(0);
  for (let r = 1; r <= rings; r += 1) {
    const rho = r / rings;
    const height_ = height(rho);
    for (const [i, p] of edge.entries()) {
      const k = 1 + (r - 1) * edge.length + i;
      u[k] = rect.centreU + (p.u - rect.centreU) * rho;
      v[k] = rect.centreV + (p.v - rect.centreV) * rho;
      h[k] = height_;
    }
  }
  const index: number[] = [];
  const at = (r: number, i: number) => 1 + (r - 1) * edge.length + (i % edge.length);
  for (let i = 0; i < edge.length; i += 1) index.push(0, at(1, i), at(1, i + 1));
  for (let r = 1; r < rings; r += 1) {
    for (let i = 0; i < edge.length; i += 1) {
      index.push(at(r, i), at(r + 1, i), at(r + 1, i + 1));
      index.push(at(r, i), at(r + 1, i + 1), at(r, i + 1));
    }
  }
  return { u, v, h, index };
}
