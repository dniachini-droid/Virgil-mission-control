import * as THREE from 'three';

/**
 * Makes a visor smooth without changing its silhouette.
 *
 * **V8.3, item 2.** The owner, of the four faces: *"the agents' visors …
 * they are not compleely smooth and black…… I wonder if we can spend a lot
 * of time on this…. since even small inperfections make them look cheap"*,
 * and then, deciding the method: *"if we replace the visors, they need to
 * be curved like they currently are, but completley smooth, convex"*.
 *
 * What the coordinator measured on the committed payloads and recorded in
 * `docs/process/PHASE_1_BACKLOG.md`, which this file starts from rather
 * than re-deriving: the cause is **facet size** — 34.6–47.7 mm across a
 * face of 247–339 mm radius — and not the asset pipeline, whose `INT8`
 * normals decode to within 0.58 % of unit length. And a best-fit sphere is
 * 42, 155 and 122 mm away from the three selections, so **snapping to a
 * sphere would deform the faces the owner designed** and is not done here.
 *
 * So: Loop subdivision of the head's own selected triangles, with the
 * **boundary pinned exactly** — a boundary edge is split at its own
 * midpoint and a boundary vertex never moves — so the outline the face
 * starts and ends on is the same polyline, to the last bit, as the painted
 * triangles gave. That is V7's reason for existing (an overlaid cap in V6
 * made the owner say the face looked *"pasted on"*), and it is the one
 * thing smoothing must not touch.
 *
 * Then three things subdivision alone does not give:
 *
 *  - **dimples corrected against a fitted quadric.** A vertex is dimpled
 *    when a neighbour rises above its tangent plane — measured as a slope,
 *    so the test means the same thing at every level of subdivision. The
 *    correction fits a quadric to the vertex's own neighbourhood in its
 *    tangent frame and moves the vertex onto it. **Never onto a sphere.**
 *    Every move is capped at a fraction of the local edge, and is **kept
 *    only if it makes that vertex less dimpled and does not push it back
 *    inside the head** — so a correction can never make the surface worse;
 *  - **the lift.** Loop's limit surface lies inside its control mesh on a
 *    convex cap, so the head's own faceted triangles would poke through the
 *    face and show as black flecks across an eye. Every interior vertex is
 *    pushed out along its normal by the measured worst penetration plus a
 *    margin; boundary vertices are not pushed, so the silhouette is exact;
 *  - **normals recomputed on the welded surface** and oriented by the
 *    model's own, so nothing terraces, no shading seam appears where the
 *    model's uv seam crosses the face, and a triangle wound against its
 *    neighbours cannot send the glass inside the head.
 *
 * **Convexity is verified, not forced, and the reason is measured.** The
 * check is the one the direction names: a quadric fitted over a fixed
 * physical neighbourhood — the same radius at every subdivision level, so
 * the answer is about the shape and not the tessellation — and the patch is
 * convex when neither principal curvature of that quadric bends the wrong
 * way. What the check finds is that none of these four selections is a
 * convex cap and never was: the painted region wraps round the sides of
 * every head, not only the Prover's. Flattening those parts out would be
 * deforming the owner's faces, which is the one thing the backlog entry
 * forbids, so the residual is measured and reported per visor instead.
 *
 * The mesh arrives welded by position, because a Meshy head is split along
 * its uv seams: two vertices at the same point with different uvs are one
 * point of the surface and must smooth as one, and the edge between them is
 * interior, not silhouette. Positions and topology are solved on the welded
 * surface; uv, the face's planar uv and the skin weights ride along on the
 * wedges, interpolated linearly, so the face image and the paint mask land
 * exactly where they land today.
 *
 * Pure three.js: no renderer, no document. `test/visor-smoothing.test.ts`
 * runs all of it under node.
 */

/**
 * How many times each visor triangle is split four ways. **Two**: 16× the
 * triangles and about a quarter of the facet. Three would go further and
 * cost 92,736 triangles for the four faces against 23,184; two is what the
 * frames and `docs/architecture/PERFORMANCE_STRATEGY.md` between them
 * allow, and the run record reports both numbers.
 */
export const VISOR_SUBDIVISIONS = 2;

/**
 * How many levels a tier gets. Two everywhere the frame budget allows it;
 * **one on `mobile` and `constrained`**, for the same reason the three rim
 * lights collapse to one there (`room/LightingRig.tsx`). The arithmetic,
 * against `docs/architecture/PERFORMANCE_STRATEGY.md`: two levels put
 * 23,184 triangles in the four faces and the same again in their glass,
 * **43,470 more than the 2,898 they replace** — 14.5 % of the mobile tier's
 * 300 k and **36.2 % of the constrained tier's 120 k**, which is too much of
 * a small budget for four faces that are ten pixels across on a phone. One
 * level costs 8,694 more, or 7.2 % of the constrained tier. Nothing here is
 * a frame time: none has been measured on this branch or any other
 * (`docs/decisions/OD-0005-phase-1-visual-checks-and-reference.md`).
 */
export function visorSubdivisions(tier: string): number {
  return tier === 'mobile' || tier === 'constrained' ? 1 : VISOR_SUBDIVISIONS;
}

/** The margin, in metres, the lift keeps over each vertex's measured penetration. */
export const VISOR_LIFT_MARGIN_M = 0.0004;

/**
 * The steepest the lift field is allowed to be, as a slope. The lift is
 * per vertex, not one number for the whole face: a uniform lift big enough
 * for the deepest point would stand 5 mm proud of a pinned rim, which is a
 * cap sitting on a head — the exact fault V7 exists to have removed. Held
 * to this slope it rises from nothing at the rim over 30–40 mm.
 */
export const LIFT_SLOPE = 0.12;

/** How many times the lift is measured, applied and measured again. */
export const LIFT_PASSES = 6;

/**
 * A neighbour rising this far above a vertex's tangent plane, as a fraction
 * of its distance from the vertex, is a dimple. A slope, not a length, so
 * one number means the same thing before and after subdivision.
 */
export const DIMPLE_SLOPE = 0.02;

/**
 * The radius, in metres, of the neighbourhood the convexity quadric is
 * fitted over. Fixed in metres so the answer describes the shape rather
 * than the tessellation.
 */
export const CONVEXITY_RADIUS_M = 0.025;

/**
 * A principal curvature bending the wrong way by less than this, in
 * reciprocal metres, is flat: a bowl of radius 2 m on a face of radius
 * 0.25 m is not a dent anyone can see.
 */
export const CONVEXITY_TOLERANCE_PER_M = 0.5;

export interface WedgeMesh {
  /** Wedge positions, xyz. */
  position: Float32Array;
  /** Wedge uv, for the paint mask. */
  uv: Float32Array;
  /** Wedge planar uv, for the face canvas. */
  faceUv: Float32Array;
  /** Four bone indices per wedge, or null for a static head. */
  skinIndex: Uint16Array | null;
  /** Four bone weights per wedge, or null. */
  skinWeight: Float32Array | null;
  /**
   * The model's own vertex normals, used only to orient what is computed.
   * A decimated Meshy head has triangles wound against their neighbours —
   * the Fabricator's screen selection has exactly one, recorded in the V8.2
   * run record — so a normal taken from the winding alone can come back
   * inside the head, and the glass with it.
   */
  normalHint: Float32Array | null;
  /** Triangles over wedges. */
  index: number[];
  /** For each triangle, the index into `mask.triangles` it descends from. */
  parent: number[];
}

export interface ConvexityResult {
  /** Interior vertices the quadric could be fitted at. */
  sampled: number;
  /** Of those, the ones whose fitted patch bends the wrong way. */
  concave: number;
  /** The worst wrong-way principal curvature, in reciprocal metres. */
  worstCurvaturePerM: number;
  /** The 95th percentile of that curvature over the sampled patches. */
  percentile95PerM: number;
  /** The mean residual of the quadric fits, in metres: how well a quadric describes this surface. */
  fitResidualM: number;
}

export interface SmoothingReport {
  trianglesBefore: number;
  trianglesAfter: number;
  verticesAfter: number;
  /** Mean edge length before and after, in millimetres. */
  facetBeforeMm: number;
  facetAfterMm: number;
  /** The boundary, which must not have moved. */
  boundaryVertices: number;
  /** The worst distance, in metres, from a boundary vertex to the original boundary polyline. */
  boundaryMovedM: number;
  /** Interior vertices, and how many of them a neighbour rises above. */
  interiorVertices: number;
  dimpled: number;
  worstDimpleSlope: number;
  /** How far the head's own facets stood in front of the smoothed face, and the lift that answered it. */
  penetrationBeforeM: number;
  /** The largest per-vertex lift, in metres; the field is zero at the pinned boundary. */
  liftM: number;
  /** The mean lift over the interior, in metres. */
  meanLiftM: number;
  penetrationAfterM: number;
  /** The convexity verification, on the geometry actually returned. */
  convexity: ConvexityResult;
}

export interface SmoothedVisor {
  mesh: WedgeMesh;
  /** Vertex normals, recomputed on the welded surface. */
  normal: Float32Array;
  report: SmoothingReport;
}

const key = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);

/** Welds wedges that share a position, to a hundredth of a millimetre in the source's own units. */
function weld(position: Float32Array, scaleToMetres: number): { of: Int32Array; count: number } {
  const quantum = 1e-5 / Math.max(scaleToMetres, 1e-9);
  const map = new Map<string, number>();
  const of = new Int32Array(position.length / 3);
  let count = 0;
  for (let i = 0; i < of.length; i += 1) {
    const k = `${Math.round((position[i * 3] as number) / quantum)},${Math.round(
      (position[i * 3 + 1] as number) / quantum,
    )},${Math.round((position[i * 3 + 2] as number) / quantum)}`;
    let id = map.get(k);
    if (id === undefined) {
      id = count;
      count += 1;
      map.set(k, id);
    }
    of[i] = id;
  }
  return { of, count };
}

interface Welded {
  /** Welded positions, xyz, as they were when the surface was built. */
  p: Float64Array;
  count: number;
  /** Triangles over welded vertices. */
  tri: Int32Array;
  /** Welded vertex ids that lie on the surface's boundary. */
  onBoundary: Uint8Array;
  /** The 1-ring of each welded vertex. */
  ring: number[][];
  /** One wedge per welded vertex, for reading its position and normal. */
  wedgeOf: Int32Array;
  /** Every wedge of each welded vertex, for writing a position back. */
  wedgesOf: number[][];
}

function weldedSurface(mesh: WedgeMesh, of: Int32Array, count: number): Welded {
  const p = new Float64Array(count * 3);
  const seen = new Uint8Array(count);
  const wedgeOf = new Int32Array(count).fill(-1);
  const wedgesOf: number[][] = Array.from({ length: count }, () => []);
  for (let i = 0; i < of.length; i += 1) {
    const w = of[i] as number;
    (wedgesOf[w] as number[]).push(i);
    if (seen[w]) continue;
    seen[w] = 1;
    wedgeOf[w] = i;
    p[w * 3] = mesh.position[i * 3] as number;
    p[w * 3 + 1] = mesh.position[i * 3 + 1] as number;
    p[w * 3 + 2] = mesh.position[i * 3 + 2] as number;
  }
  const tri = new Int32Array(mesh.index.length);
  for (let i = 0; i < mesh.index.length; i += 1) tri[i] = of[mesh.index[i] as number] as number;
  // An edge used by one triangle is the boundary; used by two or more, interior.
  const uses = new Map<string, number>();
  for (let t = 0; t < tri.length; t += 3) {
    for (let k = 0; k < 3; k += 1) {
      const a = tri[t + k] as number;
      const b = tri[t + ((k + 1) % 3)] as number;
      if (a === b) continue;
      const e = key(a, b);
      uses.set(e, (uses.get(e) ?? 0) + 1);
    }
  }
  const onBoundary = new Uint8Array(count);
  const ringSets: Set<number>[] = Array.from({ length: count }, () => new Set<number>());
  for (const [e, n] of uses) {
    const [a, b] = e.split(':').map(Number) as [number, number];
    (ringSets[a] as Set<number>).add(b);
    (ringSets[b] as Set<number>).add(a);
    if (n === 1) {
      onBoundary[a] = 1;
      onBoundary[b] = 1;
    }
  }
  return { p, count, tri, onBoundary, ring: ringSets.map((s) => [...s]), wedgeOf, wedgesOf };
}

/** Loop's interior vertex weight for a vertex of valence n. */
export function loopBeta(n: number): number {
  if (n === 3) return 3 / 16;
  const c = 3 / 8 + 0.25 * Math.cos((2 * Math.PI) / n);
  return (1 / n) * (5 / 8 - c * c);
}

/**
 * One level of Loop subdivision with the boundary pinned. Positions come
 * from the welded solve, attributes from the wedges, so a uv seam stays a
 * uv seam and is not a crease.
 */
function subdivideOnce(mesh: WedgeMesh, scaleToMetres: number): WedgeMesh {
  const { of, count } = weld(mesh.position, scaleToMetres);
  const s = weldedSurface(mesh, of, count);

  // Interior edges need the two opposite corners; collect them per welded edge.
  const opposite = new Map<string, number[]>();
  for (let t = 0; t < s.tri.length; t += 3) {
    for (let k = 0; k < 3; k += 1) {
      const a = s.tri[t + k] as number;
      const b = s.tri[t + ((k + 1) % 3)] as number;
      const c = s.tri[t + ((k + 2) % 3)] as number;
      const e = key(a, b);
      const list = opposite.get(e);
      if (list) list.push(c);
      else opposite.set(e, [c]);
    }
  }

  // Repositioned original welded vertices: boundary pinned, interior by Loop.
  const movedWeld = new Float64Array(s.count * 3);
  for (let v = 0; v < s.count; v += 1) {
    const ring = s.ring[v] as number[];
    const n = ring.length;
    if (s.onBoundary[v] || n < 3) {
      movedWeld[v * 3] = s.p[v * 3] as number;
      movedWeld[v * 3 + 1] = s.p[v * 3 + 1] as number;
      movedWeld[v * 3 + 2] = s.p[v * 3 + 2] as number;
      continue;
    }
    const beta = loopBeta(n);
    let x = 0;
    let y = 0;
    let z = 0;
    for (const u of ring) {
      x += s.p[u * 3] as number;
      y += s.p[u * 3 + 1] as number;
      z += s.p[u * 3 + 2] as number;
    }
    movedWeld[v * 3] = (1 - n * beta) * (s.p[v * 3] as number) + beta * x;
    movedWeld[v * 3 + 1] = (1 - n * beta) * (s.p[v * 3 + 1] as number) + beta * y;
    movedWeld[v * 3 + 2] = (1 - n * beta) * (s.p[v * 3 + 2] as number) + beta * z;
  }

  // A new welded point per welded edge. **Boundary edges split at their own
  // midpoint**, which leaves the boundary polyline geometrically identical.
  const edgePoint = new Map<string, [number, number, number]>();
  for (const [e, opp] of opposite) {
    const [a, b] = e.split(':').map(Number) as [number, number];
    const ax = s.p[a * 3] as number;
    const ay = s.p[a * 3 + 1] as number;
    const az = s.p[a * 3 + 2] as number;
    const bx = s.p[b * 3] as number;
    const by = s.p[b * 3 + 1] as number;
    const bz = s.p[b * 3 + 2] as number;
    if (opp.length !== 2) {
      edgePoint.set(e, [(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2]);
      continue;
    }
    const [c, d] = opp as [number, number];
    edgePoint.set(e, [
      0.375 * (ax + bx) + 0.125 * ((s.p[c * 3] as number) + (s.p[d * 3] as number)),
      0.375 * (ay + by) + 0.125 * ((s.p[c * 3 + 1] as number) + (s.p[d * 3 + 1] as number)),
      0.375 * (az + bz) + 0.125 * ((s.p[c * 3 + 2] as number) + (s.p[d * 3 + 2] as number)),
    ]);
  }

  // Original wedges keep their attributes and take their repositioned welded
  // point; a new wedge per *wedge* edge, so two triangles across a uv seam
  // share one point and keep two sets of uvs.
  const wedges = mesh.position.length / 3;
  const outPosition: number[] = [];
  const outUv: number[] = [];
  const outFaceUv: number[] = [];
  const outSkinIndex: number[] = [];
  const outSkinWeight: number[] = [];
  const outHint: number[] = [];
  for (let i = 0; i < wedges; i += 1) {
    const w = of[i] as number;
    outPosition.push(
      movedWeld[w * 3] as number,
      movedWeld[w * 3 + 1] as number,
      movedWeld[w * 3 + 2] as number,
    );
    outUv.push(mesh.uv[i * 2] as number, mesh.uv[i * 2 + 1] as number);
    outFaceUv.push(mesh.faceUv[i * 2] as number, mesh.faceUv[i * 2 + 1] as number);
    if (mesh.normalHint)
      outHint.push(
        mesh.normalHint[i * 3] as number,
        mesh.normalHint[i * 3 + 1] as number,
        mesh.normalHint[i * 3 + 2] as number,
      );
    if (mesh.skinIndex && mesh.skinWeight) {
      for (let k = 0; k < 4; k += 1) {
        outSkinIndex.push(mesh.skinIndex[i * 4 + k] as number);
        outSkinWeight.push(mesh.skinWeight[i * 4 + k] as number);
      }
    }
  }
  const midOf = new Map<string, number>();
  const midpoint = (a: number, b: number): number => {
    const k = key(a, b);
    const found = midOf.get(k);
    if (found !== undefined) return found;
    const id = outPosition.length / 3;
    const point = edgePoint.get(key(of[a] as number, of[b] as number)) as [number, number, number];
    outPosition.push(point[0], point[1], point[2]);
    outUv.push(
      ((mesh.uv[a * 2] as number) + (mesh.uv[b * 2] as number)) / 2,
      ((mesh.uv[a * 2 + 1] as number) + (mesh.uv[b * 2 + 1] as number)) / 2,
    );
    outFaceUv.push(
      ((mesh.faceUv[a * 2] as number) + (mesh.faceUv[b * 2] as number)) / 2,
      ((mesh.faceUv[a * 2 + 1] as number) + (mesh.faceUv[b * 2 + 1] as number)) / 2,
    );
    if (mesh.normalHint) {
      const hx = ((mesh.normalHint[a * 3] as number) + (mesh.normalHint[b * 3] as number)) / 2;
      const hy =
        ((mesh.normalHint[a * 3 + 1] as number) + (mesh.normalHint[b * 3 + 1] as number)) / 2;
      const hz =
        ((mesh.normalHint[a * 3 + 2] as number) + (mesh.normalHint[b * 3 + 2] as number)) / 2;
      const len = Math.hypot(hx, hy, hz) || 1;
      outHint.push(hx / len, hy / len, hz / len);
    }
    if (mesh.skinIndex && mesh.skinWeight) {
      const blend = new Map<number, number>();
      for (const v of [a, b]) {
        for (let k2 = 0; k2 < 4; k2 += 1) {
          const bone = mesh.skinIndex[v * 4 + k2] as number;
          const w = mesh.skinWeight[v * 4 + k2] as number;
          if (w > 0) blend.set(bone, (blend.get(bone) ?? 0) + w / 2);
        }
      }
      const top = [...blend.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4);
      const total = top.reduce((acc, [, w]) => acc + w, 0) || 1;
      for (let k2 = 0; k2 < 4; k2 += 1) {
        const entry = top[k2];
        outSkinIndex.push(entry ? entry[0] : 0);
        outSkinWeight.push(entry ? entry[1] / total : 0);
      }
    }
    midOf.set(k, id);
    return id;
  };

  const outIndex: number[] = [];
  const outParent: number[] = [];
  for (let t = 0; t < mesh.index.length; t += 3) {
    const a = mesh.index[t] as number;
    const b = mesh.index[t + 1] as number;
    const c = mesh.index[t + 2] as number;
    const ab = midpoint(a, b);
    const bc = midpoint(b, c);
    const ca = midpoint(c, a);
    const parent = mesh.parent[t / 3] as number;
    outIndex.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
    outParent.push(parent, parent, parent, parent);
  }

  return {
    position: Float32Array.from(outPosition),
    uv: Float32Array.from(outUv),
    faceUv: Float32Array.from(outFaceUv),
    skinIndex: mesh.skinIndex ? Uint16Array.from(outSkinIndex) : null,
    skinWeight: mesh.skinWeight ? Float32Array.from(outSkinWeight) : null,
    normalHint: mesh.normalHint ? Float32Array.from(outHint) : null,
    index: outIndex,
    parent: outParent,
  };
}

/** Area-weighted vertex normals over the welded surface, oriented by the model's own. */
function weldedNormals(mesh: WedgeMesh, of: Int32Array, count: number): Float32Array {
  const acc = new Float64Array(count * 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let t = 0; t < mesh.index.length; t += 3) {
    const i0 = mesh.index[t] as number;
    const i1 = mesh.index[t + 1] as number;
    const i2 = mesh.index[t + 2] as number;
    a.fromArray(mesh.position, i0 * 3);
    b.fromArray(mesh.position, i1 * 3);
    c.fromArray(mesh.position, i2 * 3);
    n.crossVectors(b.clone().sub(a), c.clone().sub(a)); // its length is twice the area: the weight
    // A triangle wound against its neighbours would subtract instead of add.
    if (mesh.normalHint) {
      const hx =
        (mesh.normalHint[i0 * 3] as number) +
        (mesh.normalHint[i1 * 3] as number) +
        (mesh.normalHint[i2 * 3] as number);
      const hy =
        (mesh.normalHint[i0 * 3 + 1] as number) +
        (mesh.normalHint[i1 * 3 + 1] as number) +
        (mesh.normalHint[i2 * 3 + 1] as number);
      const hz =
        (mesh.normalHint[i0 * 3 + 2] as number) +
        (mesh.normalHint[i1 * 3 + 2] as number) +
        (mesh.normalHint[i2 * 3 + 2] as number);
      if (n.x * hx + n.y * hy + n.z * hz < 0) n.negate();
    }
    for (const i of [i0, i1, i2]) {
      const w = of[i] as number;
      acc[w * 3] = (acc[w * 3] as number) + n.x;
      acc[w * 3 + 1] = (acc[w * 3 + 1] as number) + n.y;
      acc[w * 3 + 2] = (acc[w * 3 + 2] as number) + n.z;
    }
  }
  // **The orientation is decided once per welded point, not per wedge.**
  // A head mesh duplicates a vertex at a hard crease and gives the two
  // copies opposing normals; deciding per wedge gave the two copies of one
  // point opposite normals, and the lift then pushed them apart and tore a
  // 24 mm slit through the Fabricator's face. Measured: 145 boundary edges
  // before, 149 after. One point, one normal.
  const hint = new Float64Array(count * 3);
  if (mesh.normalHint)
    for (let i = 0; i < mesh.position.length / 3; i += 1) {
      const w = of[i] as number;
      hint[w * 3] = (hint[w * 3] as number) + (mesh.normalHint[i * 3] as number);
      hint[w * 3 + 1] = (hint[w * 3 + 1] as number) + (mesh.normalHint[i * 3 + 1] as number);
      hint[w * 3 + 2] = (hint[w * 3 + 2] as number) + (mesh.normalHint[i * 3 + 2] as number);
    }
  const perWeld = new Float32Array(count * 3);
  for (let w = 0; w < count; w += 1) {
    n.set(acc[w * 3] as number, acc[w * 3 + 1] as number, acc[w * 3 + 2] as number);
    if (n.lengthSq() < 1e-20) n.set(0, 0, 1);
    else n.normalize();
    if (mesh.normalHint) {
      const d =
        n.x * (hint[w * 3] as number) +
        n.y * (hint[w * 3 + 1] as number) +
        n.z * (hint[w * 3 + 2] as number);
      if (d < 0) n.negate();
    }
    perWeld[w * 3] = n.x;
    perWeld[w * 3 + 1] = n.y;
    perWeld[w * 3 + 2] = n.z;
  }
  const out = new Float32Array(mesh.position.length);
  for (let i = 0; i < out.length / 3; i += 1) {
    const w = of[i] as number;
    out[i * 3] = perWeld[w * 3] as number;
    out[i * 3 + 1] = perWeld[w * 3 + 1] as number;
    out[i * 3 + 2] = perWeld[w * 3 + 2] as number;
  }
  return out;
}

/** The mean edge length of a wedge mesh, in metres. */
function meanEdge(mesh: WedgeMesh, scaleToMetres: number): number {
  let total = 0;
  let n = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let t = 0; t < mesh.index.length; t += 3) {
    for (let k = 0; k < 3; k += 1) {
      a.fromArray(mesh.position, (mesh.index[t + k] as number) * 3);
      b.fromArray(mesh.position, (mesh.index[t + ((k + 1) % 3)] as number) * 3);
      total += a.distanceTo(b);
      n += 1;
    }
  }
  return n === 0 ? 0 : (total / n) * scaleToMetres;
}

interface ParentPlane {
  nx: number;
  ny: number;
  nz: number;
  d: number;
}

/** The plane of each original selected triangle, outward normal, in the source's units. */
function parentPlanes(origin: WedgeMesh): ParentPlane[] {
  const out: ParentPlane[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let t = 0; t < origin.index.length; t += 3) {
    a.fromArray(origin.position, (origin.index[t] as number) * 3);
    b.fromArray(origin.position, (origin.index[t + 1] as number) * 3);
    c.fromArray(origin.position, (origin.index[t + 2] as number) * 3);
    n.crossVectors(b.clone().sub(a), c.clone().sub(a));
    if (n.lengthSq() < 1e-24) n.set(0, 0, 1);
    else n.normalize();
    if (origin.normalHint) {
      let hx = 0;
      let hy = 0;
      let hz = 0;
      for (let k = 0; k < 3; k += 1) {
        const i = origin.index[t + k] as number;
        hx += origin.normalHint[i * 3] as number;
        hy += origin.normalHint[i * 3 + 1] as number;
        hz += origin.normalHint[i * 3 + 2] as number;
      }
      if (n.x * hx + n.y * hy + n.z * hz < 0) n.negate();
    }
    out[origin.parent[t / 3] as number] = { nx: n.x, ny: n.y, nz: n.z, d: n.dot(a) };
  }
  return out;
}

/**
 * How far each **welded** vertex stands in front of the original triangles
 * it descends from, in the source's units. **The best of the parents it
 * belongs to**, not the worst: a painted region that wraps round the side
 * of a head has neighbouring facets nearly at right angles, and the
 * extension of one of them says nothing about the surface under the other.
 * Negative is the head's own facet poking through the face.
 *
 * Welded, not per wedge, because a vertex on a uv seam has wedges in
 * different triangles and the two halves must answer with the same number.
 */
function heightsAboveParents(
  position: Float32Array,
  planes: ParentPlane[],
  s: Welded,
  parentsOf: number[][],
): Float64Array {
  const best = new Float64Array(s.count);
  for (let v = 0; v < s.count; v += 1) best[v] = vertexHeight(position, planes, s, v, parentsOf);
  return best;
}

/** Solves a small linear system by Gaussian elimination with partial pivoting. */
function solve(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i] as number]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < n; r += 1)
      if (
        Math.abs((m[r] as number[])[col] as number) >
        Math.abs((m[pivot] as number[])[col] as number)
      )
        pivot = r;
    const pr = m[pivot] as number[];
    if (Math.abs(pr[col] as number) < 1e-18) return null;
    m[pivot] = m[col] as number[];
    m[col] = pr;
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const row = m[r] as number[];
      const f = (row[col] as number) / (pr[col] as number);
      if (f === 0) continue;
      for (let k = col; k <= n; k += 1) row[k] = (row[k] as number) - f * (pr[k] as number);
    }
  }
  return m.map((row, i) => (row[n] as number) / ((row as number[])[i] as number));
}

/** The welded vertices within `radius` of `v`, always including its first two rings. */
function neighbourhood(
  s: Welded,
  position: Float32Array,
  v: number,
  radius: number,
  maxHops = 6,
): number[] {
  const centre = new THREE.Vector3().fromArray(position, (s.wedgeOf[v] as number) * 3);
  const seen = new Set<number>([v]);
  let frontier = [v];
  const out: number[] = [];
  const p = new THREE.Vector3();
  for (let hop = 0; hop < maxHops; hop += 1) {
    const next: number[] = [];
    for (const u of frontier) {
      for (const w of s.ring[u] as number[]) {
        if (seen.has(w)) continue;
        seen.add(w);
        p.fromArray(position, (s.wedgeOf[w] as number) * 3);
        if (p.distanceTo(centre) <= radius || hop < 2) {
          out.push(w);
          next.push(w);
        }
      }
    }
    if (next.length === 0) break;
    frontier = next;
  }
  return out;
}

interface Quadric {
  /** z = a x² + b xy + c y² + d x + e y + f in the tangent frame at the vertex. */
  f: number;
  /** The two principal curvatures of the fit, in the frame's units. */
  k1: number;
  k2: number;
  /** Root-mean-square residual of the fit, in the frame's units. */
  residual: number;
  samples: number;
}

/** Fits a quadric to a neighbourhood in the vertex's own tangent frame. */
function fitQuadric(
  position: Float32Array,
  normal: Float32Array,
  s: Welded,
  v: number,
  members: number[],
): Quadric | null {
  const iv = s.wedgeOf[v] as number;
  const centre = new THREE.Vector3().fromArray(position, iv * 3);
  const n = new THREE.Vector3().fromArray(normal, iv * 3);
  const t1 = new THREE.Vector3(1, 0, 0);
  if (Math.abs(n.x) > 0.9) t1.set(0, 1, 0);
  t1.crossVectors(n, t1).normalize();
  const t2 = new THREE.Vector3().crossVectors(n, t1).normalize();
  const d = new THREE.Vector3();
  const samples: [number, number, number][] = [];
  for (const u of members) {
    const iu = s.wedgeOf[u] as number;
    if (iu < 0) continue;
    d.fromArray(position, iu * 3).sub(centre);
    samples.push([d.dot(t1), d.dot(t2), d.dot(n)]);
  }
  if (samples.length < 10) return null;
  // Fitted on a unit neighbourhood. Six columns of x², xy, y², x, y, 1 in
  // raw millimetres are badly conditioned and return curvatures of a
  // thousand per metre — a dent a millimetre across — which is arithmetic,
  // not geometry. Scaled, the columns are all order one.
  let spread = 0;
  for (const [x, y] of samples) spread = Math.max(spread, Math.hypot(x, y));
  if (spread <= 0) return null;
  const basis = (x: number, y: number) => [x * x, x * y, y * y, x, y, 1];
  const ata = Array.from({ length: 6 }, () => new Array<number>(6).fill(0));
  const atb = new Array<number>(6).fill(0);
  for (const [x, y, z] of samples) {
    const g = basis(x / spread, y / spread);
    for (let i = 0; i < 6; i += 1) {
      for (let j = 0; j < 6; j += 1)
        (ata[i] as number[])[j] =
          ((ata[i] as number[])[j] as number) + (g[i] as number) * (g[j] as number);
      atb[i] = (atb[i] as number) + (g[i] as number) * (z / spread);
    }
  }
  const c = solve(ata, atb);
  if (!c) return null;
  let sq = 0;
  for (const [x, y, z] of samples) {
    const g = basis(x / spread, y / spread);
    let fit = 0;
    for (let i = 0; i < 6; i += 1) fit += (c[i] as number) * (g[i] as number);
    sq += (z / spread - fit) ** 2;
  }
  const residual = Math.sqrt(sq / samples.length);
  // A patch a quadric cannot describe is not evidence about curvature.
  if (residual > 0.2) return null;
  // In a tangent frame the gradient is small, so the Hessian's eigenvalues
  // are the principal curvatures at the origin to first order. Divided back
  // out of the unit neighbourhood, they are curvatures in the frame's units.
  const h11 = (2 * (c[0] as number)) / spread;
  const h12 = (c[1] as number) / spread;
  const h22 = (2 * (c[2] as number)) / spread;
  const tr = h11 + h22;
  const det = h11 * h22 - h12 * h12;
  const disc = Math.sqrt(Math.max(0, (tr / 2) * (tr / 2) - det));
  return {
    f: (c[5] as number) * spread,
    k1: tr / 2 + disc,
    k2: tr / 2 - disc,
    residual: residual * spread,
    samples: samples.length,
  };
}

/**
 * The convexity verification: a quadric fitted over a **fixed physical
 * radius**, so the answer is about the shape and not the tessellation, and
 * a patch counted as concave when a principal curvature bends the wrong
 * way. Never a sphere: `docs/process/PHASE_1_BACKLOG.md` measures these
 * selections at 42, 155 and 122 mm from one.
 */
export function verifyConvexity(
  position: Float32Array,
  normal: Float32Array,
  s: Welded,
  scaleToMetres: number,
  radiusM = CONVEXITY_RADIUS_M,
  tolerancePerM = CONVEXITY_TOLERANCE_PER_M,
): ConvexityResult {
  const radius = radiusM / scaleToMetres;
  // A patch that runs off the edge of the surface is fitted to less than a
  // patch, so the band one radius wide inside the rim is not sampled. The
  // question is whether the *face* is convex, not whether the fold where
  // the paint stops is.
  const rim: [number, number, number][] = [];
  for (let v = 0; v < s.count; v += 1) {
    if (!s.onBoundary[v]) continue;
    const i = s.wedgeOf[v] as number;
    rim.push([
      position[i * 3] as number,
      position[i * 3 + 1] as number,
      position[i * 3 + 2] as number,
    ]);
  }
  let sampled = 0;
  let concave = 0;
  let worst = 0;
  let residual = 0;
  const bends: number[] = [];
  for (let v = 0; v < s.count; v += 1) {
    if (s.onBoundary[v]) continue;
    const i = s.wedgeOf[v] as number;
    const x = position[i * 3] as number;
    const y = position[i * 3 + 1] as number;
    const z = position[i * 3 + 2] as number;
    let nearRim = false;
    for (const [rx, ry, rz] of rim) {
      if ((rx - x) ** 2 + (ry - y) ** 2 + (rz - z) ** 2 < radius * radius) {
        nearRim = true;
        break;
      }
    }
    if (nearRim) continue;
    const q = fitQuadric(position, normal, s, v, neighbourhood(s, position, v, radius));
    if (!q) continue;
    sampled += 1;
    residual += q.residual * scaleToMetres;
    // The surface bulges along +n, so a convex cap has both curvatures ≤ 0.
    const bend = q.k1 / scaleToMetres;
    bends.push(bend);
    if (bend > tolerancePerM) {
      concave += 1;
      if (bend > worst) worst = bend;
    }
  }
  bends.sort((a, b) => a - b);
  return {
    sampled,
    concave,
    worstCurvaturePerM: worst,
    percentile95PerM: bends.length === 0 ? 0 : (bends[Math.floor(bends.length * 0.95)] as number),
    fitResidualM: sampled === 0 ? 0 : residual / sampled,
  };
}

/**
 * The dimple measure: the steepest rise of a neighbour above the vertex's
 * own tangent plane, as a slope. Zero is locally convex.
 */
function dimpleSlope(position: Float32Array, normal: Float32Array, s: Welded, v: number): number {
  const iv = s.wedgeOf[v] as number;
  if (iv < 0) return 0;
  const px = position[iv * 3] as number;
  const py = position[iv * 3 + 1] as number;
  const pz = position[iv * 3 + 2] as number;
  const nx = normal[iv * 3] as number;
  const ny = normal[iv * 3 + 1] as number;
  const nz = normal[iv * 3 + 2] as number;
  let worst = 0;
  for (const u of s.ring[v] as number[]) {
    const iu = s.wedgeOf[u] as number;
    if (iu < 0) continue;
    const dx = (position[iu * 3] as number) - px;
    const dy = (position[iu * 3 + 1] as number) - py;
    const dz = (position[iu * 3 + 2] as number) - pz;
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-12) continue;
    const slope = (nx * dx + ny * dy + nz * dz) / len;
    if (slope > worst) worst = slope;
  }
  return worst;
}

function writeVertex(position: Float32Array, s: Welded, v: number, p: THREE.Vector3) {
  for (const i of s.wedgesOf[v] as number[]) p.toArray(position, i * 3);
}

/** The mean length of the edges at one vertex, in the source's units. */
function localEdge(position: Float32Array, s: Welded, v: number): number {
  const p = new THREE.Vector3().fromArray(position, (s.wedgeOf[v] as number) * 3);
  const q = new THREE.Vector3();
  let total = 0;
  let n = 0;
  for (const u of s.ring[v] as number[]) {
    q.fromArray(position, (s.wedgeOf[u] as number) * 3);
    total += p.distanceTo(q);
    n += 1;
  }
  return n === 0 ? 0 : total / n;
}

/** One vertex's height above the best of the original triangles it belongs to. */
function vertexHeight(
  position: Float32Array,
  planes: ParentPlane[],
  s: Welded,
  v: number,
  parentsOf: number[][],
): number {
  const iv = s.wedgeOf[v] as number;
  const x = position[iv * 3] as number;
  const y = position[iv * 3 + 1] as number;
  const z = position[iv * 3 + 2] as number;
  let best = Number.NEGATIVE_INFINITY;
  for (const parent of parentsOf[v] as number[]) {
    const plane = planes[parent];
    if (!plane) continue;
    const h = plane.nx * x + plane.ny * y + plane.nz * z - plane.d;
    if (h > best) best = h;
  }
  return Number.isFinite(best) ? best : 0;
}

/**
 * Smooths a visor. Subdivide with the boundary pinned; recompute normals;
 * lift each interior vertex clear of the head's own facets by a field whose
 * slope is bounded, so nothing steps at the rim; recompute normals; measure
 * what is left.
 *
 * **No dimple correction.** One was written, measured against these four
 * payloads and removed: moving a dimpled vertex onto a quadric fitted to
 * its own neighbourhood changed the count of dimpled vertices by a few per
 * cent, made the worst one worse as often as better, and tripled the time.
 * The subdivision is what removes the facets; the dimples that survive are
 * the folds of the owner's own selections, and the numbers for them are in
 * the report.
 *
 * `scaleToMetres` converts the source's units to metres, so every number in
 * the report is in metres. `verify` runs the convexity fit, which is a
 * measurement and not a change, and is **off by default**: it is two thirds
 * of the cost and `test/visor-smoothing.test.ts` is where the answer is
 * wanted. Building the four visors takes 179 ms without it and 390 ms with.
 */
export function smoothVisor(
  origin: WedgeMesh,
  scaleToMetres: number,
  { levels = VISOR_SUBDIVISIONS, verify = false }: { levels?: number; verify?: boolean } = {},
): SmoothedVisor {
  const planes = parentPlanes(origin);
  const originWeld = weld(origin.position, scaleToMetres);
  const originalBoundary = boundarySegments(weldedSurface(origin, originWeld.of, originWeld.count));

  let mesh = origin;
  for (let i = 0; i < levels; i += 1) mesh = subdivideOnce(mesh, scaleToMetres);

  const { of, count } = weld(mesh.position, scaleToMetres);
  const s = weldedSurface(mesh, of, count);
  let normal = weldedNormals(mesh, of, count);
  // Which original triangles each welded vertex descends from.
  const parentSets: Set<number>[] = Array.from({ length: count }, () => new Set<number>());
  for (let t = 0; t < mesh.index.length; t += 3) {
    const parent = mesh.parent[t / 3] as number;
    for (let k = 0; k < 3; k += 1)
      (parentSets[of[mesh.index[t + k] as number] as number] as Set<number>).add(parent);
  }
  const parentsOf = parentSets.map((set) => [...set]);

  // --- the lift, so the head's own facets cannot poke through the face ---
  //
  // Loop's limit surface lies inside its control mesh, so the flat facet the
  // head still draws stands a few millimetres in front of the smoothed face
  // and would show as black flecks across an eye. The answer is a lift, and
  // it has to be *per vertex*: the deepest point wants 2.1-4.7 mm and the
  // pinned rim wants none, and one number for both would put a 5 mm step
  // round the edge of every face.
  const margin = VISOR_LIFT_MARGIN_M / scaleToMetres;
  const applied = new Float64Array(count);
  let penetrationBeforeM = 0;
  for (let pass = 0; pass < LIFT_PASSES; pass += 1) {
    const heights = heightsAboveParents(mesh.position, planes, s, parentsOf);
    let deepest = 0;
    for (let v = 0; v < count; v += 1)
      if ((heights[v] as number) < deepest) deepest = heights[v] as number;
    if (pass === 0) penetrationBeforeM = Math.max(0, -deepest * scaleToMetres);
    // What each vertex needs, before the field is made gentle.
    const need = new Float64Array(count);
    let any = false;
    for (let v = 0; v < count; v += 1) {
      if (s.onBoundary[v]) continue;
      const short = -(heights[v] as number);
      if (short > -margin) {
        need[v] = short + margin;
        any = true;
      }
    }
    if (!any) break;
    spreadWithBoundedSlope(need, s, mesh.position, LIFT_SLOPE);
    for (let v = 0; v < count; v += 1) {
      const lift = need[v] as number;
      if (lift <= 0 || s.onBoundary[v]) continue;
      applied[v] = (applied[v] as number) + lift;
      for (const i of s.wedgesOf[v] as number[]) {
        mesh.position[i * 3] = (mesh.position[i * 3] as number) + (normal[i * 3] as number) * lift;
        mesh.position[i * 3 + 1] =
          (mesh.position[i * 3 + 1] as number) + (normal[i * 3 + 1] as number) * lift;
        mesh.position[i * 3 + 2] =
          (mesh.position[i * 3 + 2] as number) + (normal[i * 3 + 2] as number) * lift;
      }
    }
    normal = weldedNormals(mesh, of, count);
  }
  const heights = heightsAboveParents(mesh.position, planes, s, parentsOf);
  let deepestAfter = 0;
  for (let v = 0; v < count; v += 1)
    if ((heights[v] as number) < deepestAfter) deepestAfter = heights[v] as number;
  let maxLift = 0;
  let totalLift = 0;
  let interior = 0;
  for (let v = 0; v < count; v += 1) {
    if (s.onBoundary[v]) continue;
    interior += 1;
    totalLift += applied[v] as number;
    if ((applied[v] as number) > maxLift) maxLift = applied[v] as number;
  }

  // --- what is left, measured on the geometry actually returned ---
  let dimpled = 0;
  let worstDimple = 0;
  for (let v = 0; v < count; v += 1) {
    if (s.onBoundary[v]) continue;
    const slope = dimpleSlope(mesh.position, normal, s, v);
    if (slope > DIMPLE_SLOPE) dimpled += 1;
    if (slope > worstDimple) worstDimple = slope;
  }

  // --- the boundary must not have moved, and this is what says so ---
  let boundaryMoved = 0;
  let boundaryVertices = 0;
  for (let v = 0; v < count; v += 1) {
    if (!s.onBoundary[v]) continue;
    const i = s.wedgeOf[v] as number;
    if (i < 0) continue;
    boundaryVertices += 1;
    boundaryMoved = Math.max(
      boundaryMoved,
      distanceToSegments(
        mesh.position[i * 3] as number,
        mesh.position[i * 3 + 1] as number,
        mesh.position[i * 3 + 2] as number,
        originalBoundary,
      ),
    );
  }

  return {
    mesh,
    normal,
    report: {
      trianglesBefore: origin.index.length / 3,
      trianglesAfter: mesh.index.length / 3,
      verticesAfter: mesh.position.length / 3,
      facetBeforeMm: meanEdge(origin, scaleToMetres) * 1000,
      facetAfterMm: meanEdge(mesh, scaleToMetres) * 1000,
      boundaryVertices,
      boundaryMovedM: boundaryMoved * scaleToMetres,
      interiorVertices: interior,
      dimpled,
      worstDimpleSlope: worstDimple,
      penetrationBeforeM,
      liftM: maxLift * scaleToMetres,
      meanLiftM: interior === 0 ? 0 : (totalLift / interior) * scaleToMetres,
      penetrationAfterM: Math.max(0, -deepestAfter * scaleToMetres),
      convexity: verify
        ? verifyConvexity(mesh.position, normal, s, scaleToMetres)
        : {
            sampled: 0,
            concave: 0,
            worstCurvaturePerM: 0,
            percentile95PerM: 0,
            fitResidualM: 0,
          },
    },
  };
}

/**
 * Raises a field so that it never falls by more than `slope` per metre of
 * surface travelled, leaving every value at least what it was. The lift
 * field starts as a set of spikes at the vertices that need clearing; this
 * turns it into a gentle mound with no step in it, and cannot lower a
 * requirement, so the clearance it was built for still holds.
 */
function spreadWithBoundedSlope(
  field: Float64Array,
  s: Welded,
  position: Float32Array,
  slope: number,
): void {
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let sweep = 0; sweep < 12; sweep += 1) {
    let changed = false;
    for (let v = 0; v < s.count; v += 1) {
      if (s.onBoundary[v]) continue;
      a.fromArray(position, (s.wedgeOf[v] as number) * 3);
      let best = field[v] as number;
      for (const u of s.ring[v] as number[]) {
        b.fromArray(position, (s.wedgeOf[u] as number) * 3);
        const candidate = (field[u] as number) - slope * a.distanceTo(b);
        if (candidate > best) best = candidate;
      }
      if (best > (field[v] as number) + 1e-12) {
        field[v] = best;
        changed = true;
      }
    }
    if (!changed) break;
  }
  // The rim is pinned and takes no lift at all.
  for (let v = 0; v < s.count; v += 1) if (s.onBoundary[v]) field[v] = 0;
}

/** A line segment, as six numbers: two endpoints. */
export type Segment = [number, number, number, number, number, number];

/** The boundary of a welded surface, as segments. */
function boundarySegments(s: Welded): Segment[] {
  const uses = new Map<string, number>();
  for (let t = 0; t < s.tri.length; t += 3) {
    for (let k = 0; k < 3; k += 1) {
      const a = s.tri[t + k] as number;
      const b = s.tri[t + ((k + 1) % 3)] as number;
      if (a === b) continue;
      const e = key(a, b);
      uses.set(e, (uses.get(e) ?? 0) + 1);
    }
  }
  const out: Segment[] = [];
  for (const [e, n] of uses) {
    if (n !== 1) continue;
    const [i, j] = e.split(':').map(Number) as [number, number];
    out.push([
      s.p[i * 3] as number,
      s.p[i * 3 + 1] as number,
      s.p[i * 3 + 2] as number,
      s.p[j * 3] as number,
      s.p[j * 3 + 1] as number,
      s.p[j * 3 + 2] as number,
    ]);
  }
  return out;
}

/**
 * The distance from a point to the nearest of a set of segments, in the
 * source's units. Measured against the segments and not their endpoints,
 * because a pinned boundary splits each of its edges at that edge's own
 * midpoint: the new points are new, and they are on the old polyline.
 */
export function distanceToSegments(x: number, y: number, z: number, segments: Segment[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (const [ax, ay, az, bx, by, bz] of segments) {
    const ex = bx - ax;
    const ey = by - ay;
    const ez = bz - az;
    const len = ex * ex + ey * ey + ez * ez;
    let t = len > 0 ? ((x - ax) * ex + (y - ay) * ey + (z - az) * ez) / len : 0;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(x - (ax + ex * t), y - (ay + ey * t), z - (az + ez * t));
    if (d < best) best = d;
  }
  return Number.isFinite(best) ? best : 0;
}

/**
 * The boundary of a triangle surface, as segments in the source's own
 * units, welded by position first so a uv seam is not mistaken for an edge.
 * This is what `test/visor.test.ts` compares before and after smoothing:
 * the silhouette is the one thing that must not have moved.
 */
export function surfaceBoundary(
  position: Float32Array,
  index: ArrayLike<number>,
  scaleToMetres: number,
): Segment[] {
  const { of, count } = weld(position, scaleToMetres);
  const mesh: WedgeMesh = {
    position,
    uv: new Float32Array((position.length / 3) * 2),
    faceUv: new Float32Array((position.length / 3) * 2),
    skinIndex: null,
    skinWeight: null,
    normalHint: null,
    index: Array.from(index as ArrayLike<number>, (v) => Number(v)),
    parent: [],
  };
  return boundarySegments(weldedSurface(mesh, of, count));
}
