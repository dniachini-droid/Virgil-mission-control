import * as THREE from 'three';
import type { VisorMask } from '../characters/visorFit.js';

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
 * whole justification for this change — and fails if the rectangle is not
 * planar, if any corner leaves the selection's own region, or if any of
 * the original triangles reaches through it.
 */

/** How far inside the selection's own extent the rectangle's edge sits. */
export const SCREEN_INSET_M = 0.035;
/** How far clear of the highest lump of the original surface the rectangle stands. */
export const SCREEN_LIFT_MARGIN_M = 0.004;
/**
 * The glass's swell at the centre, as a fraction of the rectangle's width
 * — Virgil's slabs use 0.03 m on 1.3 m, and a console screen gets the
 * same ratio so the two read as the same kind of object.
 */
export const SCREEN_BULGE_RATIO = 0.03 / 1.3;

interface Corner {
  u: number;
  v: number;
  h: number;
}

/** The rectangle's four edges, as (axis, sign): inside is `sign · axis ≤ half`. */
const EDGES = [
  { axis: 'u' as const, sign: 1 },
  { axis: 'u' as const, sign: -1 },
  { axis: 'v' as const, sign: 1 },
  { axis: 'v' as const, sign: -1 },
];

/** Sutherland–Hodgman against one edge of the rectangle, interpolating the height. */
function clip(
  polygon: Corner[],
  edge: (typeof EDGES)[number],
  halfWidth: number,
  halfHeight: number,
): Corner[] {
  const half = edge.axis === 'u' ? halfWidth : halfHeight;
  const value = (q: Corner) => edge.sign * (edge.axis === 'u' ? q.u : q.v);
  const out: Corner[] = [];
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i] as Corner;
    const b = polygon[(i + 1) % polygon.length] as Corner;
    const da = value(a) - half;
    const db = value(b) - half;
    if (da <= 0) out.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const k = da / (da - db);
      out.push({
        u: a.u + (b.u - a.u) * k,
        v: a.v + (b.v - a.v) * k,
        h: a.h + (b.h - a.h) * k,
      });
    }
  }
  return out;
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
   * The furthest the original surface stands in front of the plane **over
   * the rectangle's own footprint** — the bound the rectangle has to clear.
   * The surface is clipped to the rectangle exactly — each triangle is
   * cut against the rectangle's four edges and the height read at the
   * corners of what is left — because a lump out under the bezel is not
   * behind the rectangle and cannot come through it, and lifting the
   * picture to clear one would stand it needlessly proud of the console.
   * Measured on the committed payloads: it happens that all three
   * consoles' worst lump **is** inside the rectangle, so this is presently
   * equal to `maxFront` for all three. The distinction is kept because
   * the two are different quantities and a re-fit could separate them.
   */
  maxFrontUnderRect: number;
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
  const inPlane = new Map<number, { u: number; v: number; h: number }>();
  for (const v of weight.keys()) {
    p.fromArray(positions as ArrayLike<number> & number[], v * 3).sub(centre);
    const h = p.dot(normal);
    sumSquares += h * h;
    count += 1;
    maxFront = Math.max(maxFront, h);
    maxBehind = Math.max(maxBehind, -h);
    const u = p.dot(right);
    const t = p.dot(up);
    halfWidth = Math.max(halfWidth, Math.abs(u));
    halfHeight = Math.max(halfHeight, Math.abs(t));
    inPlane.set(v, { u, v: t, h });
  }

  // How far the surface reaches out over the rectangle's own footprint,
  // exactly: each triangle clipped to the rectangle, and the height read
  // at the corners of what survives. `h` is linear over a triangle, so
  // its maximum over the clipped polygon is at one of those corners.
  const rectHalfWidth = Math.max(0.025, halfWidth - SCREEN_INSET_M);
  const rectHalfHeight = Math.max(0.025, halfHeight - SCREEN_INSET_M);
  let maxFrontUnderRect = 0;
  for (const t of mask.triangles) {
    const corners = [index[t * 3], index[t * 3 + 1], index[t * 3 + 2]].map((v) =>
      inPlane.get(v as number),
    );
    if (corners.some((q) => q === undefined)) continue;
    let polygon = corners as Corner[];
    for (const edge of EDGES) {
      polygon = clip(polygon, edge, rectHalfWidth, rectHalfHeight);
      if (polygon.length === 0) break;
    }
    for (const q of polygon) maxFrontUnderRect = Math.max(maxFrontUnderRect, q.h);
  }

  return {
    centre,
    normal,
    right,
    up,
    halfWidth,
    halfHeight,
    maxFrontUnderRect,
    rms: Math.sqrt(sumSquares / count),
    maxFront,
    maxBehind,
    vertices: count,
  };
}

export interface FlatScreen {
  /** The flat rectangle the picture is drawn on. */
  face: THREE.BufferGeometry;
  /** The convex glass over it, the same profile as Virgil's slabs. */
  glass: THREE.BufferGeometry;
  /** The rectangle's size and where it stands, for the record and for the tests. */
  plan: {
    width: number;
    height: number;
    /** How far the rectangle stands off the fitted plane, along its normal. */
    lift: number;
    /** The glass's swell at its centre, above the rectangle. */
    bulge: number;
    corners: THREE.Vector3[];
  };
}

/**
 * The flat screen and its glass, in the fitted plane, in the mask's frame.
 *
 *  - the **rectangle**: the selection's own extent inset by
 *    `SCREEN_INSET_M` so its edge stays under the console's bezel lip,
 *    stood off the plane by the highest lump of the original surface plus
 *    `SCREEN_LIFT_MARGIN_M`, so nothing pokes through it and nothing
 *    z-fights with it. Two triangles: planar by construction;
 *  - the **glass**: `createConvexGlassGeometry`'s profile — the same one
 *    Virgil's slabs use — `gapMetres` in front of the rectangle, so a
 *    console screen and a slab are the same kind of object.
 */
export function buildFlatScreen(
  plane: ScreenPlane,
  gapMetres: number,
  glassGeometry: (width: number, height: number, bulge: number) => THREE.BufferGeometry,
  uvBounds: { min: [number, number]; max: [number, number] },
): FlatScreen {
  const width = Math.max(0.05, 2 * plane.halfWidth - 2 * SCREEN_INSET_M);
  const height = Math.max(0.05, 2 * plane.halfHeight - 2 * SCREEN_INSET_M);
  const lift = plane.maxFrontUnderRect + SCREEN_LIFT_MARGIN_M;
  const bulge = width * SCREEN_BULGE_RATIO;
  const origin = plane.centre.clone().addScaledVector(plane.normal, lift);

  const at = (u: number, v: number, out: THREE.Vector3) =>
    out
      .copy(origin)
      .addScaledVector(plane.right, (u - 0.5) * width)
      .addScaledVector(plane.up, (v - 0.5) * height);

  const corners: THREE.Vector3[] = [];
  const position = new Float32Array(12);
  const normals = new Float32Array(12);
  const uvs = new Float32Array(8);
  const faceUv = new Float32Array(8);
  const p = new THREE.Vector3();
  const grid: [number, number][] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  for (const [i, [u, v]] of grid.entries()) {
    at(u, v, p);
    corners.push(p.clone());
    position[i * 3] = p.x;
    position[i * 3 + 1] = p.y;
    position[i * 3 + 2] = p.z;
    normals[i * 3] = plane.normal.x;
    normals[i * 3 + 1] = plane.normal.y;
    normals[i * 3 + 2] = plane.normal.z;
    // The paint's own uv island, so the paint test samples the screen.
    uvs[i * 2] = uvBounds.min[0] + (uvBounds.max[0] - uvBounds.min[0]) * u;
    uvs[i * 2 + 1] = uvBounds.min[1] + (uvBounds.max[1] - uvBounds.min[1]) * v;
    // The canvas, undistorted, over the whole rectangle. This is the fix.
    faceUv[i * 2] = u;
    faceUv[i * 2 + 1] = v;
  }
  const face = new THREE.BufferGeometry();
  face.setAttribute('position', new THREE.BufferAttribute(position, 3));
  face.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  face.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  face.setAttribute('faceUv', new THREE.BufferAttribute(faceUv, 2));
  face.setIndex([0, 1, 2, 0, 2, 3]);
  face.computeBoundingBox();
  face.computeBoundingSphere();

  // The glass is built in its own xy plane; put it in the fitted plane.
  const glass = glassGeometry(width, height, bulge);
  const basis = new THREE.Matrix4().makeBasis(plane.right, plane.up, plane.normal);
  basis.setPosition(origin.clone().addScaledVector(plane.normal, gapMetres));
  glass.applyMatrix4(basis);
  glass.computeBoundingBox();
  glass.computeBoundingSphere();

  return { face, glass, plan: { width, height, lift, bulge, corners } };
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
 * The flat rectangle's own aspect — width over height in the fitted plane
 * — which is what the live canvas has to be drawn at. It is not the
 * paint bounds' aspect: the selection's y extent spans a surface tilted
 * back by 12.6°–14.1°, so its height in the plane is longer than its
 * height in y, and the inset takes the same margin off both. Using the
 * paint bounds' aspect here stretched the picture by about 2%.
 */
export function flatScreenAspect(
  mask: VisorMask,
  positions: ArrayLike<number>,
  index: ArrayLike<number>,
): number {
  const plane = fitScreenPlane(mask, positions, index);
  const width = Math.max(0.05, 2 * plane.halfWidth - 2 * SCREEN_INSET_M);
  const height = Math.max(0.05, 2 * plane.halfHeight - 2 * SCREEN_INSET_M);
  return width / height;
}
