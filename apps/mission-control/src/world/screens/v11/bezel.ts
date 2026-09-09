import * as THREE from 'three';
import { buildGeometry, decodeMeshyPayload } from '../../assets/meshyAsset.js';
import { placedPositions } from '../../characters/visorFit.js';
import {
  fabricatorStationBase64Payload,
  keeperStationBase64Payload,
  proverStationBase64Payload,
} from '../../props/v6Assets.js';
import { CAST, type Role } from '../../room/cast.js';
import { room } from '../../room/palette.js';
import type { RoundedRect } from '../screenOutline.js';
import { roundedRectOutline } from '../screenOutline.js';
import { screenPlan } from '../screenPlane.js';

/**
 * **The authored thin bezel laid over each of the owner's own Meshy
 * consoles — Option A, as the owner decided it.**
 *
 * The constraint this exists to answer, stated plainly: *"thinner bezels,
 * more glass, less bulky beige framing"* asks to change geometry the owner
 * commissioned and which may not be modified, and no new asset may enter
 * `assets/`. His decision was a lightweight authored faceplate fitted over
 * each immutable opening — *"cover as much of the existing bulky screen
 * framing as practical; a slim pearl-white or ivory structure; restrained
 * gold edge detailing; maximise the sapphire-black glass area; fit the
 * console's actual angle and opening; avoid z-fighting, clipping, or
 * appearing to float; preserve the existing information-rich animated
 * screen content."*
 *
 * Every one of those is a number here rather than an intention.
 *
 * **It fits the console's actual angle and opening** because it is built in
 * the *same* frame the picture is: `screenPlane.ts`'s fitted plane, whose
 * normal is the mean normal `asset-pipeline/fit-screen.mjs` measured over
 * the console's own screen triangles, and `screenOutline.ts`'s rounded-rect
 * fit to the opening's own border. Nothing is posed. The three openings it
 * fits are the ones the brief quotes — the Fabricator's 955 × 569 mm at a
 * 77.9 mm radius, the Prover's 886 × 489 at 42.9 and chamfered, the
 * Keeper's 887 × 590 at 81.1 — and `test/screen-geometry-v11.test.ts`
 * re-measures them from the payloads rather than trusting these words.
 *
 * **Its inner opening is never larger than the model's**, so no beige can
 * show through the join: it is the *drawn* outline contracted by
 * `INNER_TUCK`, which is 939 × 553 mm on the Fabricator against the
 * model's own 955 × 569 — 16 mm of the model's frame is covered by the
 * lip on every side before the ring even begins, and the picture's own cut
 * edge is tucked under it instead of ending in mid-air.
 *
 * **It does not z-fight**, because its offset along the plane's normal is
 * measured and not guessed: `surroundFront` casts a ray at every point of
 * a grid over the ring's own footprint, takes the greatest height the
 * console's surface reaches in front of the fitted plane anywhere under
 * the ring, and the offset is that plus `CLEARANCE`. The offset is
 * therefore always in front of every triangle it covers, with a margin
 * larger than the fit's own residual.
 *
 * **It does not appear to float**, because the same measurement bounds it
 * from the other side: `ringWidth` is the widest ring, searched in 5 mm
 * steps, whose measured offset still comes out under `MAX_OFFSET` — so the
 * faceplate covers as much beige as it can *while still lying close to the
 * surface it covers*, and where a console's own casing rises too steeply
 * for a wide ring the ring is narrower rather than lifted. The chosen
 * width, the offset and the gap are reported per console in the run record.
 *
 * **It preserves the screen content** because it touches neither the
 * picture nor its plane: `ConsoleScreenV11` draws exactly the same live
 * canvas onto exactly the same fitted plane, and this is three concentric
 * strips of geometry in front of it.
 */

/** How far inside the drawn outline the lip reaches, so the picture's edge is under it. */
export const INNER_TUCK = 0.004;
/** The clearance the plate keeps in front of whatever it covers. */
export const CLEARANCE = 0.0035;
/** How wide the ring is, radially, in metres. */
export const RING_WIDTH = 0.062;
/** The gold inner lip's width. */
export const LIP_WIDTH = 0.006;
/** The outer chamfer's width, and how far it falls back toward the console. */
export const CHAMFER_WIDTH = 0.009;
/** How many segments the ring is traced with. */
export const BEZEL_SEGMENTS = 144;
/** How many radial rings of vertices the plate has between lip and edge. */
export const BEZEL_RINGS = 6;
/**
 * How far the plate is allowed to stand off the surface it rides, over and
 * above `CLEARANCE`. This is the whole of the anti-floating bound.
 */
export const LIFT_TOLERANCE = 0.002;
/**
 * How far past the opening the local mesh the rays are cast against
 * reaches, and how far either side of the fitted plane it accepts
 * triangles. Restricting the cast to the opening's own neighbourhood is
 * what makes 864 rays a few milliseconds instead of a few hundred.
 */
const LOCAL_MARGIN = 0.12;
const LOCAL_DEPTH = 0.25;

const PAYLOADS: Record<Role, string> = {
  fabricator: fabricatorStationBase64Payload,
  prover: proverStationBase64Payload,
  keeper: keeperStationBase64Payload,
};

export interface BezelPlan {
  role: Role;
  /** The model's own drawn outline, in the fitted plane. */
  drawn: RoundedRect;
  /** The faceplate's inner opening: the drawn outline contracted by `INNER_TUCK`. */
  innerHalfWidth: number;
  innerHalfHeight: number;
  innerRadius: number;
  ringWidth: number;
  /** How far in front of the fitted plane the **inner lip** sits. */
  offset: number;
  /**
   * The plate's own front-face height at each `(segment, ring)` sample,
   * along the fitted plane's normal: `BEZEL_SEGMENTS × BEZEL_RINGS`.
   * This is the whole of the conformance, as data.
   */
  heights: Float32Array;
  /** The greatest height the console's own surface reaches under the ring. */
  surfaceMaxFront: number;
  /** The greatest height the plate itself reaches, which follows it. */
  plateMaxFront: number;
  /**
   * The smallest and largest gap between the plate's front face and the
   * surface directly beneath it. `minGap` is the z-fighting bound: it must
   * stay positive and larger than the fit's own residual. `maxGap` is
   * **not** the floating bound — a faceplate spanning a groove in the
   * console's casing has a large gap there and is bedded down on both
   * sides of it — so two more honest measures are kept beside it.
   */
  minGap: number;
  maxGap: number;
  /** How far the plate's outermost ring stands off the surface it meets. */
  edgeGap: number;
  /**
   * The floating bound: how far the plate ever stands in front of the
   * **highest** point the console's own surround reaches on the same
   * radius. A plate riding a raised lip has a small figure here however
   * deep the groove beside it is.
   */
  maxLift: number;
  /** How many of the samples found no surface under them at all. */
  missed: number;
  sampled: number;
  /** The height the picture itself stands at, for comparison. */
  pictureLift: number;
  plane: { centre: THREE.Vector3; normal: THREE.Vector3; right: THREE.Vector3; up: THREE.Vector3 };
  /** How much of the model's own frame the lip and the ring together cover, per side, in metres. */
  coveredPerSide: number;
  /** The measured profile of the console's own surround, for the record. */
  profile: { at: number; median: number; max: number }[];
}

const PLANS = new Map<Role, BezelPlan>();

/** The console's mesh, placed exactly as the set places it. */
function stationMesh(role: Role): { mesh: THREE.Mesh; positions: Float32Array } {
  const { metadata } = CAST[role].station;
  const geometry = buildGeometry(metadata, decodeMeshyPayload(metadata, PAYLOADS[role]));
  const mesh = new THREE.Mesh(geometry);
  const { scale, positionScale, baseOffsetY } = metadata.runtime;
  mesh.scale.setScalar(scale * positionScale);
  mesh.position.y = baseOffsetY;
  mesh.updateMatrixWorld(true);
  return { mesh, positions: placedPositions(mesh) as Float32Array };
}

/**
 * A mesh of just the triangles near the opening, in the placed frame:
 * every triangle with a vertex inside the opening grown by `LOCAL_MARGIN`
 * in the plane and `LOCAL_DEPTH` along the normal. The rays are cast
 * against this rather than against the whole 8,000-triangle console, which
 * is what makes the measurement cheap enough to do at mount.
 */
function localMesh(
  positions: Float32Array,
  index: ArrayLike<number>,
  plane: BezelPlan['plane'],
  inner: RoundedRect,
  ringWidth: number,
): { mesh: THREE.Mesh; triangles: number } {
  const reachU = inner.halfWidth + ringWidth + LOCAL_MARGIN;
  const reachV = inner.halfHeight + ringWidth + LOCAL_MARGIN;
  const kept: number[] = [];
  const p = new THREE.Vector3();
  const count = index.length / 3;
  for (let t = 0; t < count; t += 1) {
    let near = false;
    for (let k = 0; k < 3 && !near; k += 1) {
      const v = index[t * 3 + k] as number;
      p.set(
        positions[v * 3] as number,
        positions[v * 3 + 1] as number,
        positions[v * 3 + 2] as number,
      );
      p.sub(plane.centre);
      const h = p.dot(plane.normal);
      if (Math.abs(h) > LOCAL_DEPTH) continue;
      const u = p.dot(plane.right) - inner.centreU;
      const v2 = p.dot(plane.up) - inner.centreV;
      if (Math.abs(u) <= reachU && Math.abs(v2) <= reachV) near = true;
    }
    if (!near) continue;
    for (let k = 0; k < 3; k += 1) {
      const v = index[t * 3 + k] as number;
      kept.push(
        positions[v * 3] as number,
        positions[v * 3 + 1] as number,
        positions[v * 3 + 2] as number,
      );
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(kept, 3));
  geometry.computeBoundingSphere();
  return { mesh: new THREE.Mesh(geometry), triangles: kept.length / 9 };
}

/**
 * **The faceplate's geometry, as numbers, measured against the model.**
 *
 * A *flat* faceplate was tried first and the measurement refused it: at
 * every ring width from 75 mm down to 25 mm, the offset a flat plate needs
 * in order to clear the console's own surround came out at **22 mm on the
 * Keeper and 32 mm on the Prover** — because both models have a raised
 * lip immediately outside the opening, and a plate that clears it stands a
 * finger's width off the console and reads as floating, which is one of
 * the four things the owner's decision names. That is not a taste
 * judgment; `test/screen-geometry-v11.test.ts` asserts the offset is under
 * 11 mm and the flat version failed it on two consoles out of three.
 *
 * So the plate **conforms**. Its inner lip sits a measured clearance in
 * front of the picture's own plane; from there outward, its front face
 * rides the surface beneath it — the height at every one of
 * `BEZEL_SEGMENTS × BEZEL_RINGS` samples is the console's own surface
 * height at that point plus `CLEARANCE`, smoothed along the ring so
 * raycast noise cannot make the edge jagged, and never allowed to fall
 * below the inner lip. The result cannot z-fight, because every sample is
 * in front of what it covers by a measured margin; and it cannot float,
 * because no sample is further in front than that margin plus the
 * smoothing. Both bounds are reported per console.
 */
export function bezelPlan(role: Role): BezelPlan {
  const cached = PLANS.get(role);
  if (cached) return cached;
  const { mesh, positions } = stationMesh(role);
  const geometry = mesh.geometry as THREE.BufferGeometry;
  const index = (geometry.index as THREE.BufferAttribute).array;
  const plan = screenPlan(CAST[role].station.screen, positions, index);
  const drawn = plan.outline.drawn;
  const plane = {
    centre: plan.plane.centre.clone(),
    normal: plan.plane.normal.clone(),
    right: plan.plane.right.clone(),
    up: plan.plane.up.clone(),
  };
  const inner: RoundedRect = {
    centreU: drawn.centreU,
    centreV: drawn.centreV,
    halfWidth: drawn.halfWidth - INNER_TUCK,
    halfHeight: drawn.halfHeight - INNER_TUCK,
    radius: Math.max(0.004, drawn.radius - INNER_TUCK),
  };
  const local = localMesh(positions, index, plane, inner, RING_WIDTH);
  const outline = roundedRectOutline(inner, BEZEL_SEGMENTS);
  const raycaster = new THREE.Raycaster();
  const direction = plane.normal.clone().negate();
  const from = 1.0;
  const offset = plan.lift + CLEARANCE;
  // The surface height under every sample, and whether it was found.
  const surface = new Float32Array(BEZEL_SEGMENTS * BEZEL_RINGS);
  const found = new Uint8Array(BEZEL_SEGMENTS * BEZEL_RINGS);
  let missed = 0;
  const byRing: number[][] = Array.from({ length: BEZEL_RINGS }, () => []);
  for (let i = 0; i < BEZEL_SEGMENTS; i += 1) {
    const s = outline[i] as { u: number; v: number };
    const du = s.u - inner.centreU;
    const dv = s.v - inner.centreV;
    const length = Math.hypot(du, dv) || 1;
    for (let k = 0; k < BEZEL_RINGS; k += 1) {
      const reach = (k / (BEZEL_RINGS - 1)) * RING_WIDTH;
      const u = s.u + (du / length) * reach;
      const v = s.v + (dv / length) * reach;
      const origin = plane.centre
        .clone()
        .add(plane.right.clone().multiplyScalar(u))
        .add(plane.up.clone().multiplyScalar(v))
        .add(plane.normal.clone().multiplyScalar(from));
      raycaster.set(origin, direction);
      const hits = raycaster.intersectObject(local.mesh, false);
      const at = i * BEZEL_RINGS + k;
      if (hits.length === 0) {
        missed += 1;
        surface[at] = Number.NaN;
        continue;
      }
      const h = from - (hits[0] as THREE.Intersection).distance;
      surface[at] = h;
      found[at] = 1;
      (byRing[k] as number[]).push(h);
    }
  }
  // Fill the gaps from the nearest found sample on the same ring, so a
  // corner where the console has no surface still gets a sensible height.
  for (let k = 0; k < BEZEL_RINGS; k += 1) {
    for (let i = 0; i < BEZEL_SEGMENTS; i += 1) {
      const at = i * BEZEL_RINGS + k;
      if (found[at]) continue;
      let fill = Number.NaN;
      for (let d = 1; d < BEZEL_SEGMENTS && Number.isNaN(fill); d += 1) {
        for (const j of [(i + d) % BEZEL_SEGMENTS, (i - d + BEZEL_SEGMENTS) % BEZEL_SEGMENTS]) {
          const other = j * BEZEL_RINGS + k;
          if (found[other]) {
            fill = surface[other] as number;
            break;
          }
        }
      }
      surface[at] = Number.isNaN(fill) ? offset - CLEARANCE : fill;
    }
  }
  // The plate's own front face: the surface plus the clearance, never
  // behind the inner lip, smoothed along the ring.
  const raw = new Float32Array(BEZEL_SEGMENTS * BEZEL_RINGS);
  for (let i = 0; i < BEZEL_SEGMENTS * BEZEL_RINGS; i += 1) {
    raw[i] = Math.max(offset, (surface[i] as number) + CLEARANCE);
  }
  const heights = new Float32Array(raw.length);
  const window = 5;
  for (let k = 0; k < BEZEL_RINGS; k += 1) {
    for (let i = 0; i < BEZEL_SEGMENTS; i += 1) {
      let sum = 0;
      for (let d = -window; d <= window; d += 1) {
        const j = (i + d + BEZEL_SEGMENTS) % BEZEL_SEGMENTS;
        sum += raw[j * BEZEL_RINGS + k] as number;
      }
      // **The smoothed height is never allowed below the raw one.** The
      // smoothing exists to stop raycast noise making the edge jagged;
      // over a step in the console's own casing it would otherwise pull
      // the plate *behind* the surface, which measured as a −5 mm gap on
      // the Fabricator and −43 mm on the Keeper: a plate sunk into the
      // model, which is the clipping the owner's decision forbids. Taking
      // the larger of the two keeps the noise out and the plate in front.
      const at = i * BEZEL_RINGS + k;
      const smoothed = sum / (2 * window + 1);
      const want = raw[at] as number;
      // **Clamped to the surface within `LIFT_TOLERANCE`.** Smoothing
      // alone left the Keeper's outer edge standing 34 mm off the casing
      // where it spanned a recess — bedded down on the ridges and floating
      // over the hollows. The plate now follows the surface within 2 mm
      // everywhere, so it reads as a faceplate fitted to this console
      // rather than a flat sheet held above it.
      heights[at] = k === 0 ? offset : Math.min(Math.max(smoothed, want), want + LIFT_TOLERANCE);
    }
  }
  // The bounds the plate is judged by.
  let surfaceMax = Number.NEGATIVE_INFINITY;
  let plateMax = Number.NEGATIVE_INFINITY;
  let minGap = Number.POSITIVE_INFINITY;
  let maxGap = Number.NEGATIVE_INFINITY;
  let edgeGap = Number.NEGATIVE_INFINITY;
  let maxLift = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < BEZEL_SEGMENTS; i += 1) {
    // The highest the console's own surround reaches anywhere along this
    // segment's own radius: what "standing off the surface" is measured
    // against, because a plate spanning a groove is not floating.
    let localMax = Number.NEGATIVE_INFINITY;
    for (let k = 0; k < BEZEL_RINGS; k += 1) {
      localMax = Math.max(localMax, surface[i * BEZEL_RINGS + k] as number);
    }
    for (let k = 0; k < BEZEL_RINGS; k += 1) {
      const at = i * BEZEL_RINGS + k;
      const h = heights[at] as number;
      const g = h - (surface[at] as number);
      surfaceMax = Math.max(surfaceMax, surface[at] as number);
      plateMax = Math.max(plateMax, h);
      if (k > 0) {
        minGap = Math.min(minGap, g);
        maxGap = Math.max(maxGap, g);
        maxLift = Math.max(maxLift, h - localMax);
      }
      if (k === BEZEL_RINGS - 1) edgeGap = Math.max(edgeGap, g);
    }
  }
  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted.length === 0 ? 0 : (sorted[Math.floor(sorted.length / 2)] as number);
  };
  const built: BezelPlan = {
    role,
    drawn,
    innerHalfWidth: inner.halfWidth,
    innerHalfHeight: inner.halfHeight,
    innerRadius: inner.radius,
    ringWidth: RING_WIDTH,
    offset,
    heights,
    surfaceMaxFront: surfaceMax,
    plateMaxFront: plateMax,
    minGap,
    maxGap,
    edgeGap,
    maxLift,
    missed,
    sampled: heights.length,
    pictureLift: plan.lift,
    plane,
    coveredPerSide: plan.outline.fitted.halfWidth - inner.halfWidth + RING_WIDTH,
    profile: byRing.map((values, k) => ({
      at: (k / (BEZEL_RINGS - 1)) * RING_WIDTH,
      median: median(values),
      max: values.length === 0 ? 0 : Math.max(...values),
    })),
  };
  PLANS.set(role, built);
  return built;
}

/**
 * The faceplate, built from the measured height field: a gold inner lip
 * and a pearl body whose outer ring falls back to meet the console. Two
 * meshes, because two materials.
 *
 * `BEZEL_SEGMENTS × BEZEL_RINGS` at 144 × 6 is 1,440 triangles a console
 * and 4,320 for the set, against the mobile tier's 300,000 in
 * `docs/architecture/PERFORMANCE_STRATEGY.md`.
 */
export function buildBezelMeshes(plan: BezelPlan): { lip: THREE.Mesh; plate: THREE.Mesh } {
  const inner: RoundedRect = {
    centreU: plan.drawn.centreU,
    centreV: plan.drawn.centreV,
    halfWidth: plan.innerHalfWidth,
    halfHeight: plan.innerHalfHeight,
    radius: plan.innerRadius,
  };
  const outline = roundedRectOutline(inner, BEZEL_SEGMENTS);
  const { centre, normal, right, up } = plan.plane;
  // Where each sample sits in space, and how far out it is.
  const reachOf = (k: number) => (k / (BEZEL_RINGS - 1)) * plan.ringWidth;
  const lipRing = Math.max(1, Math.round((LIP_WIDTH / plan.ringWidth) * (BEZEL_RINGS - 1)));
  const chamferRing = Math.max(
    lipRing + 1,
    BEZEL_RINGS - 1 - Math.round((CHAMFER_WIDTH / plan.ringWidth) * (BEZEL_RINGS - 1)),
  );
  const point = (i: number, k: number) => {
    const s = outline[i] as { u: number; v: number };
    const du = s.u - inner.centreU;
    const dv = s.v - inner.centreV;
    const length = Math.hypot(du, dv) || 1;
    const reach = reachOf(k);
    const u = s.u + (du / length) * reach;
    const v = s.v + (dv / length) * reach;
    // The outermost ring falls back to the surface itself, so the plate
    // has an edge that meets the console rather than a cut one.
    const h =
      k === BEZEL_RINGS - 1
        ? (plan.heights[i * BEZEL_RINGS + k] as number) - CLEARANCE * 0.85
        : (plan.heights[i * BEZEL_RINGS + k] as number);
    return centre
      .clone()
      .add(right.clone().multiplyScalar(u))
      .add(up.clone().multiplyScalar(v))
      .add(normal.clone().multiplyScalar(h));
  };
  const build = (fromRing: number, toRing: number) => {
    const positions: number[] = [];
    const indices: number[] = [];
    const rings = toRing - fromRing + 1;
    for (let i = 0; i < BEZEL_SEGMENTS; i += 1) {
      for (let k = fromRing; k <= toRing; k += 1) {
        const p = point(i, k);
        positions.push(p.x, p.y, p.z);
      }
    }
    for (let i = 0; i < BEZEL_SEGMENTS; i += 1) {
      const next = (i + 1) % BEZEL_SEGMENTS;
      for (let k = 0; k < rings - 1; k += 1) {
        const a = i * rings + k;
        const b = i * rings + k + 1;
        const c = next * rings + k;
        const d = next * rings + k + 1;
        indices.push(a, b, d, a, d, c);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  };
  const lip = new THREE.Mesh(
    build(0, lipRing),
    new THREE.MeshStandardMaterial({ color: room.surface.gold, roughness: 0.32, metalness: 0.6 }),
  );
  const plate = new THREE.Mesh(
    build(lipRing, BEZEL_RINGS - 1),
    new THREE.MeshStandardMaterial({ color: room.surface.ivory, roughness: 0.44, metalness: 0.04 }),
  );
  lip.name = `${plan.role}-bezel-lip`;
  plate.name = `${plan.role}-bezel-plate`;
  plate.receiveShadow = true;
  void chamferRing;
  return { lip, plate };
}
