import * as THREE from 'three';
import type { VisorMask } from '../characters/visorFit.js';
import {
  fitScreenOutline,
  type PlanePoint,
  type RoundedRect,
  roundedRectOutline,
  roundedRectSurface,
  type ScreenOutline,
} from './screenOutline.js';

/**
 * **A console's screen is drawn on a flat plane fitted to the model's own
 * screen triangles, not on the triangles themselves.**
 *
 * V8 drew the live screen straight onto the console's selected triangles,
 * the way a visor is drawn onto a head — one builder, two hosts. On a head
 * that is right: a face should follow the skull. On a screen it is wrong,
 * and the owner said so: *"the text on the screens are much better, but
 * the screens dont look flat and smooth. I think it is the original meshy
 * files. the screens on the consoles look all crooked and lots of
 * different slants. Can you make it completely smooth like Virgils
 * screens??"* He is right about the cause. A Meshy console's screen is 38,
 * 23 and 41 triangles whose normals scatter about the measured means, so
 * the text followed the lumps. Virgil's slabs read as objects because they
 * are authored flat geometry with convex glass over them.
 *
 * So the selection still comes from the model — `asset-pipeline/fit-screen.mjs`
 * read it off the console's own mesh and nothing here hand-places a screen
 * — but the drawing surface is a **plane least-squares-fitted to that
 * selection**, area-weighted, and a single flat rectangle in it. The
 * console's own lumpy triangles are left exactly where they are, behind
 * the rectangle; no geometry is deleted from the owner's model.
 *
 * `test/console-screens.test.ts` records the residuals of the fit in
 * millimetres — the measurement of how crooked the surface is, and the
 * whole justification for this change — and fails if the surface is not
 * planar, if the outline leaves the selection's own footprint, or if any
 * of the original triangles reaches through it.
 *
 * **V8.2: the drawn area is the opening's own shape, at full bleed.** The
 * owner, on the V8.1 frames: *"the screens are better, but they are still
 * sharp edges, a rectangle, instead of going right to the end of the
 * screen. the screens need to curve on the corners. and go right to the
 * end."* V8.1 drew an axis-aligned rectangle inset 35 mm from the
 * selection's extent, with square corners, floating inside a rounded
 * opening — and V8 had inset the picture inside the canvas as well, in
 * ink, so the honesty band would clear the bezel's lip. Both insets are
 * gone. `screenOutline.ts` fits a rounded rectangle to the selection's own
 * border and measures its corner radius; the picture and the glass are
 * both built to that one outline, contracted only by the few millimetres
 * that keep them inside the selection; and the band is laid out within the
 * rounded area rather than the picture shrunk away from it.
 */

/** How far clear of the highest lump of the original surface the picture stands. */
export const SCREEN_LIFT_MARGIN_M = 0.004;
/**
 * The glass's swell at the centre, as a fraction of the rectangle's width
 * — Virgil's slabs use 0.03 m on 1.3 m, and a console screen gets the
 * same ratio so the two read as the same kind of object.
 */
export const SCREEN_BULGE_RATIO = 0.03 / 1.3;
/**
 * How wide the picture's soft edge is, in canvas pixels. The outline is a
 * mask derived from 23–41 coarse triangles; without a feather its arcs
 * alias against the dark recess behind them. One and a half pixels of the
 * 1024-pixel canvas is 1.3–1.4 mm on these screens.
 */
export const SCREEN_FEATHER_PIXELS = 1.5;
/** The canvas the live picture is drawn on, in pixels across. */
export const SCREEN_CANVAS_PIXELS = 1024;
/** How many points the drawn outline is tessellated at, and how many rings each surface has. */
export const SCREEN_OUTLINE_SEGMENTS = 240;
export const SCREEN_FACE_RINGS = 2;
export const SCREEN_GLASS_RINGS = 8;

interface Corner {
  u: number;
  v: number;
  h: number;
}

/**
 * Sutherland–Hodgman against one directed edge of a convex polygon,
 * interpolating the height: inside is to the left of a→b. Generalised in
 * V8.2 from the four edges of a rectangle to the tessellated rounded
 * outline, so the lift is measured under what is actually drawn.
 */
function clip(polygon: Corner[], a: PlanePoint, b: PlanePoint): Corner[] {
  const side = (q: Corner) => (b.u - a.u) * (q.v - a.v) - (b.v - a.v) * (q.u - a.u);
  const out: Corner[] = [];
  for (let i = 0; i < polygon.length; i += 1) {
    const p = polygon[i] as Corner;
    const q = polygon[(i + 1) % polygon.length] as Corner;
    const dp = side(p);
    const dq = side(q);
    if (dp >= 0) out.push(p);
    if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
      const k = dp / (dp - dq);
      out.push({
        u: p.u + (q.u - p.u) * k,
        v: p.v + (q.v - p.v) * k,
        h: p.h + (q.h - p.h) * k,
      });
    }
  }
  return out;
}

/**
 * How far the model's own screen surface reaches out in front of the
 * fitted plane **under the drawn outline**, exactly: each selected
 * triangle clipped to the outline, and the height read at the corners of
 * what survives. The height is linear over a triangle, so its maximum
 * over the clipped polygon is at one of those corners.
 *
 * This is the bound the picture has to clear, and it is measured under the
 * outline rather than over the whole selection because a lump out under
 * the bezel is not behind the picture and cannot come through it — lifting
 * for one would stand the picture needlessly proud of the console.
 */
export function surfaceHeightUnder(
  mask: VisorMask,
  positions: ArrayLike<number>,
  index: ArrayLike<number>,
  plane: ScreenPlane,
  outline: RoundedRect,
): number {
  const polygon = roundedRectOutline(outline, 64);
  const p = new THREE.Vector3();
  const cache = new Map<number, Corner>();
  const at = (v: number): Corner => {
    const seen = cache.get(v);
    if (seen) return seen;
    p.set(
      positions[v * 3] as number,
      positions[v * 3 + 1] as number,
      positions[v * 3 + 2] as number,
    ).sub(plane.centre);
    const corner = { u: p.dot(plane.right), v: p.dot(plane.up), h: p.dot(plane.normal) };
    cache.set(v, corner);
    return corner;
  };
  let highest = 0;
  for (const t of mask.triangles) {
    let cut: Corner[] = [
      at(index[t * 3] as number),
      at(index[t * 3 + 1] as number),
      at(index[t * 3 + 2] as number),
    ];
    // The outline is sampled anticlockwise, so inside is to the left.
    for (let i = 0; i < polygon.length && cut.length > 0; i += 1) {
      cut = clip(cut, polygon[i] as PlanePoint, polygon[(i + 1) % polygon.length] as PlanePoint);
    }
    for (const q of cut) highest = Math.max(highest, q.h);
  }
  return highest;
}

export interface ScreenPlane {
  /** The centre of the fitted plane, in the placed frame: metres, base at the origin. */
  centre: THREE.Vector3;
  /** The plane's unit normal, pointing out of the screen. */
  normal: THREE.Vector3;
  /** The plane's horizontal axis (the screen's width) and vertical axis (its height). */
  right: THREE.Vector3;
  up: THREE.Vector3;
  /** The selection's own extent in the plane, from its centre. */
  halfWidth: number;
  halfHeight: number;
  /** How far the selection's vertices depart from the fitted plane, in metres. */
  rms: number;
  /** The furthest any vertex stands in front of the plane, along +normal. */
  maxFront: number;
  /**
   * How far the surface reaches out **under what is drawn** is no longer a
   * property of the plane: it depends on the outline, which is fitted after
   * the plane. `surfaceHeightUnder` measures it.
   */
  /** The furthest any vertex stands behind it. */
  maxBehind: number;
  /** How many vertices the fit was over. */
  vertices: number;
}

/**
 * Fits one plane to a console's own screen triangles by area-weighted
 * least squares, in the mask's frame (the placed frame: metres, base at
 * the origin — the frame `fit-screen.mjs` recorded and `placedPositions`
 * returns).
 *
 * The fit is done as a height field over the measured mean normal, which
 * is the right parameterisation because the surface is nearly planar
 * already: the residual of that fit **is** the number the owner is
 * looking at.
 */
export function fitScreenPlane(
  mask: VisorMask,
  positions: ArrayLike<number>,
  index: ArrayLike<number>,
): ScreenPlane {
  const meanNormal = mask.measured.meanNormal;
  if (!meanNormal) throw new Error('screen plane: the mask carries no mean normal');
  const n0 = new THREE.Vector3(
    meanNormal[0] as number,
    meanNormal[1] as number,
    meanNormal[2] as number,
  ).normalize();
  // A basis on the screen: e1 horizontal (the screen's width), e2 up it.
  const e1 = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), n0);
  if (e1.lengthSq() < 1e-9) e1.set(1, 0, 0);
  e1.normalize();
  const e2 = new THREE.Vector3().crossVectors(n0, e1).normalize();

  // Each vertex once, weighted by a third of the area of the triangles on it.
  const weight = new Map<number, number>();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  for (const t of mask.triangles) {
    const v0 = index[t * 3] as number;
    const v1 = index[t * 3 + 1] as number;
    const v2 = index[t * 3 + 2] as number;
    a.fromArray(positions as ArrayLike<number> & number[], v0 * 3);
    b.fromArray(positions as ArrayLike<number> & number[], v1 * 3);
    c.fromArray(positions as ArrayLike<number> & number[], v2 * 3);
    const area = ab.copy(b).sub(a).cross(ac.copy(c).sub(a)).length() / 2;
    for (const v of [v0, v1, v2]) weight.set(v, (weight.get(v) ?? 0) + area / 3);
  }

  // Weighted centroid.
  const centroid = new THREE.Vector3();
  let total = 0;
  const p = new THREE.Vector3();
  for (const [v, w] of weight) {
    p.fromArray(positions as ArrayLike<number> & number[], v * 3);
    centroid.addScaledVector(p, w);
    total += w;
  }
  if (total <= 0) throw new Error('screen plane: the selection has no area');
  centroid.divideScalar(total);

  // Least squares w = α·u + β·v + γ over (e1, e2, n0) about the centroid.
  let suu = 0;
  let suv = 0;
  let svv = 0;
  let su = 0;
  let sv = 0;
  let s1 = 0;
  let suw = 0;
  let svw = 0;
  let sw = 0;
  for (const [v, w] of weight) {
    p.fromArray(positions as ArrayLike<number> & number[], v * 3).sub(centroid);
    const u = p.dot(e1);
    const t = p.dot(e2);
    const h = p.dot(n0);
    suu += w * u * u;
    suv += w * u * t;
    svv += w * t * t;
    su += w * u;
    sv += w * t;
    s1 += w;
    suw += w * u * h;
    svw += w * t * h;
    sw += w * h;
  }
  const m = new THREE.Matrix3().set(suu, suv, su, suv, svv, sv, su, sv, s1);
  const solved = new THREE.Vector3(suw, svw, sw).applyMatrix3(m.clone().invert());
  const alpha = solved.x;
  const beta = solved.y;
  const gamma = solved.z;

  // The plane: normal (−α, −β, 1) in the basis, through centroid + γ·n0.
  const normal = new THREE.Vector3()
    .addScaledVector(e1, -alpha)
    .addScaledVector(e2, -beta)
    .addScaledVector(n0, 1)
    .normalize();
  if (normal.dot(n0) < 0) normal.negate();
  const centre = centroid.clone().addScaledVector(n0, gamma);
  // The plane's own axes: horizontal first, so the screen is never rolled.
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), normal);
  if (right.lengthSq() < 1e-9) right.set(1, 0, 0);
  right.normalize();
  const up = new THREE.Vector3().crossVectors(normal, right).normalize();

  let sumSquares = 0;
  let count = 0;
  let maxFront = 0;
  let maxBehind = 0;
  let halfWidth = 0;
  let halfHeight = 0;
  for (const v of weight.keys()) {
    p.fromArray(positions as ArrayLike<number> & number[], v * 3).sub(centre);
    const h = p.dot(normal);
    sumSquares += h * h;
    count += 1;
    maxFront = Math.max(maxFront, h);
    maxBehind = Math.max(maxBehind, -h);
    halfWidth = Math.max(halfWidth, Math.abs(p.dot(right)));
    halfHeight = Math.max(halfHeight, Math.abs(p.dot(up)));
  }

  return {
    centre,
    normal,
    right,
    up,
    halfWidth,
    halfHeight,
    rms: Math.sqrt(sumSquares / count),
    maxFront,
    maxBehind,
    vertices: count,
  };
}

export interface FlatScreen {
  /** The surface the picture is drawn on: flat, and the shape of the opening. */
  face: THREE.BufferGeometry;
  /** The convex glass over it, on the same outline. */
  glass: THREE.BufferGeometry;
  /** What was built, for the record and for the tests. */
  plan: {
    width: number;
    height: number;
    /** The drawn corner radius: the measured one, unless the extents are smaller. */
    radius: number;
    /** How far the surface stands off the fitted plane, along its normal. */
    lift: number;
    /** The glass's swell at its centre, above the picture. */
    bulge: number;
    /** How wide the picture's soft edge is, in metres. */
    feather: number;
    /** The drawn outline, in the plane. */
    outline: RoundedRect;
    /** The extremes of the drawn outline in the placed frame, for the sight tests. */
    edge: THREE.Vector3[];
  };
}

/**
 * The screen and its glass, in the fitted plane, in the mask's frame.
 *
 *  - the **picture**: one flat surface in the shape of the model's own
 *    opening (`screenOutline.ts`) — full bleed, with the corners rounded
 *    to the radius measured off the geometry — stood off the plane by the
 *    highest lump of the original surface *under the outline* plus
 *    `SCREEN_LIFT_MARGIN_M`, so nothing pokes through it and nothing
 *    z-fights with it. Planar by construction: every vertex has the same
 *    height;
 *  - the **glass**: the same outline, `gapMetres` in front of the picture
 *    at its edge and swelling by `SCREEN_BULGE_RATIO` of the width at its
 *    centre with a CRT's profile — the ratio and the profile Virgil's
 *    slabs use, so a console screen and a slab are the same kind of
 *    object. **The glass follows the picture's outline**, because a
 *    rounded picture behind rectangular glass would be worse than a square
 *    one.
 */
export function buildFlatScreen(
  plane: ScreenPlane,
  outline: ScreenOutline,
  lift: number,
  gapMetres: number,
  uvBounds: { min: [number, number]; max: [number, number] },
): FlatScreen {
  const rect = outline.drawn;
  const width = 2 * rect.halfWidth;
  const height = 2 * rect.halfHeight;
  const bulge = width * SCREEN_BULGE_RATIO;
  const feather = (SCREEN_FEATHER_PIXELS * width) / SCREEN_CANVAS_PIXELS;
  const u0 = rect.centreU - rect.halfWidth;
  const v0 = rect.centreV - rect.halfHeight;

  const build = (rings: number, height_: (rho: number) => number, offset: number) => {
    const surface = roundedRectSurface(rect, rings, SCREEN_OUTLINE_SEGMENTS, height_);
    const count = surface.u.length;
    const position = new Float32Array(count * 3);
    const normals = new Float32Array(count * 3);
    const uvs = new Float32Array(count * 2);
    const faceUv = new Float32Array(count * 2);
    const p = new THREE.Vector3();
    for (let i = 0; i < count; i += 1) {
      p.copy(plane.centre)
        .addScaledVector(plane.right, surface.u[i] as number)
        .addScaledVector(plane.up, surface.v[i] as number)
        .addScaledVector(plane.normal, offset + (surface.h[i] as number));
      position[i * 3] = p.x;
      position[i * 3 + 1] = p.y;
      position[i * 3 + 2] = p.z;
      normals[i * 3] = plane.normal.x;
      normals[i * 3 + 1] = plane.normal.y;
      normals[i * 3 + 2] = plane.normal.z;
      // The canvas, undistorted, over the outline's own bounding box.
      const fu = ((surface.u[i] as number) - u0) / width;
      const fv = ((surface.v[i] as number) - v0) / height;
      faceUv[i * 2] = fu;
      faceUv[i * 2 + 1] = fv;
      // The paint's own uv island, so the paint test samples the screen.
      uvs[i * 2] = uvBounds.min[0] + (uvBounds.max[0] - uvBounds.min[0]) * fu;
      uvs[i * 2 + 1] = uvBounds.min[1] + (uvBounds.max[1] - uvBounds.min[1]) * fv;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setAttribute('faceUv', new THREE.BufferAttribute(faceUv, 2));
    geometry.setIndex(surface.index);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  };

  const face = build(SCREEN_FACE_RINGS, () => 0, lift);
  const glass = build(
    SCREEN_GLASS_RINGS,
    // The CRT's profile, radially: flat-ish in the middle, curving away at
    // the sides, and exactly zero at the edge.
    (rho) => bulge * (1 - rho ** 4),
    lift + gapMetres,
  );

  const edge = roundedRectOutline(rect, 16).map((q) =>
    plane.centre
      .clone()
      .addScaledVector(plane.right, q.u)
      .addScaledVector(plane.up, q.v)
      .addScaledVector(plane.normal, lift),
  );

  return {
    face,
    glass,
    plan: { width, height, radius: rect.radius, lift, bulge, feather, outline: rect, edge },
  };
}

/** The uv bounds of a mask's own triangles: the paint island the screen sits in. */
export function screenUvBounds(
  mask: VisorMask,
  uv: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  index: ArrayLike<number>,
): { min: [number, number]; max: [number, number] } {
  let minU = Number.POSITIVE_INFINITY;
  let minV = Number.POSITIVE_INFINITY;
  let maxU = Number.NEGATIVE_INFINITY;
  let maxV = Number.NEGATIVE_INFINITY;
  for (const t of mask.triangles) {
    for (let k = 0; k < 3; k += 1) {
      const v = index[t * 3 + k] as number;
      minU = Math.min(minU, uv.getX(v));
      maxU = Math.max(maxU, uv.getX(v));
      minV = Math.min(minV, uv.getY(v));
      maxV = Math.max(maxV, uv.getY(v));
    }
  }
  return { min: [minU, minV], max: [maxU, maxV] };
}

/**
 * **The whole plan for one console's screen**: the plane fitted to the
 * selection, the outline fitted to its border, and how far the picture has
 * to stand off the plane to clear the model's own lumps under that
 * outline.
 *
 * Memoised on the mask and the position array, because the fit costs
 * 40–90 ms per console — the plane's least squares, the outline's trimmed
 * Nelder–Mead over about 800 border samples, and the containment bisection
 * — and it is asked for twice per console: once for the canvas's aspect
 * and once to build the geometry. The cache is keyed on both inputs and
 * holds neither alive, so a payload change cannot be served a stale plan.
 */
const PLANS = new WeakMap<VisorMask, WeakMap<object, ScreenPlan>>();

export interface ScreenPlan {
  plane: ScreenPlane;
  outline: ScreenOutline;
  /** How far the picture stands off the fitted plane. */
  lift: number;
  /**
   * The drawn outline's own aspect — width over height in the fitted plane
   * — which is what the live canvas has to be drawn at. It is not the
   * paint bounds' aspect: the selection's y extent spans a surface tilted
   * back by 12.6°–14.1°, so its height in the plane is longer than its
   * height in y. Using the paint bounds' aspect stretched the picture by
   * about 2% (V8.1).
   */
  aspect: number;
}

export function screenPlan(
  mask: VisorMask,
  positions: ArrayLike<number>,
  index: ArrayLike<number>,
): ScreenPlan {
  let byPositions = PLANS.get(mask);
  if (!byPositions) {
    byPositions = new WeakMap();
    PLANS.set(mask, byPositions);
  }
  const cached = byPositions.get(positions as unknown as object);
  if (cached) return cached;
  const plane = fitScreenPlane(mask, positions, index);
  const outline = fitScreenOutline(mask, positions, index, plane);
  const lift =
    surfaceHeightUnder(mask, positions, index, plane, outline.drawn) + SCREEN_LIFT_MARGIN_M;
  const plan: ScreenPlan = {
    plane,
    outline,
    lift,
    aspect: outline.drawn.halfWidth / outline.drawn.halfHeight,
  };
  byPositions.set(positions as unknown as object, plan);
  return plan;
}
