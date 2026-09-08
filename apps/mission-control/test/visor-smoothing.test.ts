import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildGeometry, decodeMeshyPayload } from '../src/world/assets/meshyAsset.js';
import {
  bonePositions,
  buildVisorGeometry,
  placedPositions,
  reprojectFaceUv,
} from '../src/world/characters/visorFit.js';
import {
  CONVEXITY_RADIUS_M,
  DIMPLE_SLOPE,
  LIFT_SLOPE,
  loopBeta,
  type SmoothingReport,
  surfaceBoundary,
  VISOR_SUBDIVISIONS,
  visorSubdivisions,
} from '../src/world/characters/visorSmooth.js';
import {
  fabricator2Base64Payload,
  keeper2Base64Payload,
  prover2Base64Payload,
} from '../src/world/props/v6Assets.js';
import { CAST, ROLES, type Role } from '../src/world/room/cast.js';
import {
  decodeVirgilPayload,
  parseVirgilGlb,
  virgilRiggedMetadata,
  virgilVisorMask,
} from '../src/world/virgil/virgilRigged.js';

/**
 * **The visors, subdivided and smoothed (V8.3, item 2).** The owner:
 * *"they are not compleely smooth and black…… even small inperfections make
 * them look cheap"*, and *"if we replace the visors, they need to be curved
 * like they currently are, but completley smooth, convex."*
 *
 * These tests build each of the four faces exactly as the set does — same
 * payloads, same masks, same builder — and hold the four promises the
 * change is allowed to make:
 *
 *  1. **the silhouette is untouched.** The boundary of what is drawn is the
 *     boundary of the head's own painted triangles, segment for segment and
 *     to a micrometre. This is V7's reason for existing: an overlaid cap in
 *     V6 made the owner say the face looked *"pasted on"*, and any drift of
 *     the outline puts that back. It is also checked from the geometry in
 *     `visor.test.ts`, in both directions;
 *  2. **the facet is a quarter of what it was**, which is the defect;
 *  3. **the head's own facets do not poke through the smoothed face** —
 *     zero penetration after the lift, and the lift's own field has a
 *     bounded slope so nothing steps at the pinned rim;
 *  4. **convexity is measured and reported**, against a quadric fitted over
 *     a fixed physical neighbourhood and never against a sphere.
 *
 * The numbers below are recorded, not asserted loosely: they are what these
 * payloads give, and a change in the smoothing that moves them will fail
 * here and have to say why.
 */

const PAYLOADS: Record<Role, string> = {
  fabricator: fabricator2Base64Payload,
  prover: prover2Base64Payload,
  keeper: keeper2Base64Payload,
};

/**
 * Measured on the committed payloads, 2026-09-08, at `VISOR_SUBDIVISIONS`.
 * `facetBefore` is the coordinator's own measurement in
 * `docs/process/PHASE_1_BACKLOG.md` (47.7 / 34.6 / 39.3 mm) reproduced
 * here; `convex` is the share of sampled patches whose fitted quadric bends
 * the right way in both directions.
 */
const EXPECTED: Record<
  string,
  {
    triangles: number;
    facetBeforeMm: number;
    facetAfterMm: number;
    maxLiftMm: number;
    convexShare: number;
  }
> = {
  fabricator: {
    triangles: 3760,
    facetBeforeMm: 47.7,
    facetAfterMm: 11.3,
    maxLiftMm: 6.2,
    convexShare: 0.78,
  },
  prover: {
    triangles: 3312,
    facetBeforeMm: 34.6,
    facetAfterMm: 8.3,
    maxLiftMm: 4.0,
    convexShare: 0.95,
  },
  keeper: {
    triangles: 8784,
    facetBeforeMm: 39.3,
    facetAfterMm: 9.2,
    maxLiftMm: 4.7,
    convexShare: 0.49,
  },
  virgil: {
    triangles: 7328,
    facetBeforeMm: 43.5,
    facetAfterMm: 10.4,
    maxLiftMm: 2.6,
    convexShare: 0.97,
  },
};

/**
 * The face's canvas coordinates must stay an exact planar map of position,
 * because that is what they are: `faceUv` is the mask frame's x and y, and
 * the mask frame is an affine image of this one. If subdivision had left
 * them averaged along each edge instead of re-projected, the residual here
 * would be millimetres — and the first build of this pass, which did leave
 * them averaged, gave Virgil lumpy eye edges where they had been clean.
 */
function expectFaceUvIsPlanar(label: string, geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute('position');
  const faceUv = geometry.getAttribute('faceUv');
  const p = new Float32Array(position.count * 3);
  const uv = new Float32Array(faceUv.count * 2);
  for (let i = 0; i < position.count; i += 1) {
    p[i * 3] = position.getX(i);
    p[i * 3 + 1] = position.getY(i);
    p[i * 3 + 2] = position.getZ(i);
    uv[i * 2] = faceUv.getX(i);
    uv[i * 2 + 1] = faceUv.getY(i);
  }
  // Fitting the map to itself: a planar map reproduces itself exactly.
  const fit = reprojectFaceUv(p, uv, new Float32Array(0), new Float32Array(0));
  expect(fit.residual, `${label}: faceUv is not a planar map of position`).toBeLessThan(1e-4);
}

function expectSmoothing(label: string, report: SmoothingReport, triangleCount: number) {
  const want = EXPECTED[label] as NonNullable<(typeof EXPECTED)[string]>;

  // 1. Four children per triangle per level, and nothing lost.
  expect(report.trianglesBefore).toBe(triangleCount);
  expect(report.trianglesAfter).toBe(triangleCount * 4 ** VISOR_SUBDIVISIONS);
  expect(report.trianglesAfter, `${label}: the triangle count this pass adds`).toBe(want.triangles);

  // 2. The facet, which is the defect. The coordinator's measurement of the
  //    payloads, and about a quarter of it after two levels.
  expect(report.facetBeforeMm).toBeCloseTo(want.facetBeforeMm, 0);
  expect(report.facetAfterMm).toBeCloseTo(want.facetAfterMm, 0);
  expect(report.facetAfterMm).toBeLessThan(report.facetBeforeMm / 3.5);

  // 3. The silhouette, from the builder's own measurement. `visor.test.ts`
  //    checks the same thing from the geometry, in both directions.
  expect(report.boundaryVertices).toBeGreaterThan(100);
  expect(report.boundaryMovedM, `${label}: the boundary moved`).toBeLessThan(1e-6);

  // 4. The head cannot poke through, and the lift that achieves it is a
  //    gentle mound rather than one number for the whole face.
  expect(report.penetrationBeforeM * 1000, `${label}: what Loop's cutting cost`).toBeGreaterThan(1);
  expect(report.penetrationAfterM, `${label}: the head pokes through`).toBeLessThan(1e-6);
  expect(report.liftM * 1000).toBeCloseTo(want.maxLiftMm, 0);
  expect(report.meanLiftM, `${label}: the mean lift is far under the peak`).toBeLessThan(
    report.liftM / 2,
  );

  // 5. Convexity: verified against a fitted quadric over a fixed radius,
  //    never against a sphere, and reported rather than forced.
  const c = report.convexity;
  expect(c.sampled, `${label}: patches a quadric could be fitted at`).toBeGreaterThan(100);
  expect((c.sampled - c.concave) / c.sampled).toBeCloseTo(want.convexShare, 1);
  expect(c.fitResidualM, `${label}: a quadric describes this surface`).toBeLessThan(0.002);
}

describe.each(ROLES)('the %s’s visor, smoothed', (role) => {
  const { metadata, visor } = CAST[role].model;
  const buffer = decodeMeshyPayload(metadata, PAYLOADS[role]);
  const geometry = buildGeometry(metadata, buffer);
  const mesh = new THREE.Mesh(geometry);
  const { scale, positionScale, baseOffsetY } = metadata.runtime;
  mesh.scale.setScalar(scale * positionScale);
  mesh.position.y = baseOffsetY;
  const metresPerUnit = scale * positionScale;
  const built = buildVisorGeometry(
    geometry,
    visor,
    placedPositions(mesh),
    metresPerUnit,
    0.006,
    null,
    {
      verify: true,
    },
  );

  it('is the limit surface of the head’s own triangles, with its outline pinned', () => {
    if (process.env.VISOR_REPORT) console.log(role, JSON.stringify(built.smoothing));
    expectSmoothing(role, built.smoothing as SmoothingReport, visor.triangles.length);
    expectFaceUvIsPlanar(role, built.face);
  });

  it('has exactly the outline the painted triangles had, in total length', () => {
    const headIndex = geometry.index as THREE.BufferAttribute;
    const headPos = geometry.getAttribute('position');
    const control = new Float32Array(headPos.count * 3);
    for (let i = 0; i < headPos.count; i += 1) {
      control[i * 3] = headPos.getX(i);
      control[i * 3 + 1] = headPos.getY(i);
      control[i * 3 + 2] = headPos.getZ(i);
    }
    const controlIndex: number[] = [];
    for (const t of visor.triangles)
      for (let k = 0; k < 3; k += 1) controlIndex.push(headIndex.getX(t * 3 + k));
    const before = surfaceBoundary(control, controlIndex, metresPerUnit);
    const facePos = built.face.getAttribute('position');
    const after = new Float32Array(facePos.count * 3);
    for (let i = 0; i < facePos.count; i += 1) {
      after[i * 3] = facePos.getX(i);
      after[i * 3 + 1] = facePos.getY(i);
      after[i * 3 + 2] = facePos.getZ(i);
    }
    const built2 = surfaceBoundary(
      after,
      (built.face.index as THREE.BufferAttribute).array,
      metresPerUnit,
    );
    const length = (segs: [number, number, number, number, number, number][]) =>
      segs.reduce((a, [x, y, z, x2, y2, z2]) => a + Math.hypot(x2 - x, y2 - y, z2 - z), 0);
    // The same polyline, split: twice the segments per level, the same
    // total length to a micrometre, and no extra loop anywhere. A slit
    // opened inside the surface would show here as extra length, and one
    // did while this was being written — 182 mm of it on the Fabricator,
    // from deciding a normal's direction per wedge instead of per point.
    expect(built2.length).toBe(before.length * 2 ** VISOR_SUBDIVISIONS);
    expect(length(built2) * metresPerUnit).toBeCloseTo(length(before) * metresPerUnit, 6);
  });
});

describe("Virgil's visor, smoothed", () => {
  it('is the limit surface of his head’s own triangles, and keeps his skin weights', async () => {
    const gltf = await parseVirgilGlb(decodeVirgilPayload());
    let skinned: THREE.SkinnedMesh | null = null;
    gltf.scene.traverse((o) => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned = o as THREE.SkinnedMesh;
    });
    const mesh = skinned as unknown as THREE.SkinnedMesh;
    const head = gltf.scene.getObjectByName('Head') as THREE.Bone;
    const { positions } = bonePositions(mesh, head);
    const built = buildVisorGeometry(
      mesh.geometry,
      virgilVisorMask,
      positions,
      virgilRiggedMetadata.runtime.scale,
      0.006,
      null,
      { verify: true },
    );
    if (process.env.VISOR_REPORT) console.log('virgil', JSON.stringify(built.smoothing));
    expectSmoothing('virgil', built.smoothing as SmoothingReport, virgilVisorMask.triangles.length);
    expectFaceUvIsPlanar('virgil', built.face);

    // He is skinned, so every new vertex has to carry weights that still
    // sum to one, or his face would tear away from his head mid-clip.
    const weight = built.face.getAttribute('skinWeight');
    const index = built.face.getAttribute('skinIndex');
    expect(weight).toBeDefined();
    expect(index).toBeDefined();
    for (let i = 0; i < weight.count; i += 1) {
      const total = weight.getX(i) + weight.getY(i) + weight.getZ(i) + weight.getW(i);
      expect(total, `virgil: vertex ${i} weights`).toBeCloseTo(1, 5);
    }
    // The face and the glass are the same mesh a gap apart, so they carry
    // the same skinning and deform together.
    const glassWeight = built.glass.getAttribute('skinWeight');
    expect(glassWeight.count).toBe(weight.count);
  });
});

describe('the smoothing itself', () => {
  it('uses Loop’s own weights, and nothing invented', () => {
    // The published values: 3/16 at valence three, and the general rule.
    expect(loopBeta(3)).toBeCloseTo(3 / 16, 12);
    expect(loopBeta(6)).toBeCloseTo(1 / 16, 12);
    // At the regular valence the ring's total share is exactly 3/8 and the
    // vertex keeps 5/8. It is positive at every valence, largest at three
    // (9/16, Loop's own special case) and falls monotonically from there.
    expect(6 * loopBeta(6)).toBeCloseTo(3 / 8, 12);
    expect(3 * loopBeta(3)).toBeCloseTo(9 / 16, 12);
    let previous = Number.POSITIVE_INFINITY;
    for (let n = 3; n <= 16; n += 1) {
      const share = n * loopBeta(n);
      expect(loopBeta(n)).toBeGreaterThan(0);
      expect(share).toBeLessThanOrEqual(9 / 16);
      expect(share).toBeLessThan(previous);
      previous = share;
    }
  });

  it('costs what the run record says, against the tiers that have a budget', () => {
    // The four faces, at two levels and at one, from the numbers above.
    const two = Object.values(EXPECTED).reduce((a, e) => a + e.triangles, 0);
    expect(two).toBe(23184);
    const control = 235 + 207 + 549 + 458;
    const one = control * 4;
    // Face and glass are the same mesh a gap apart, so both are drawn.
    const addedAtTwo = 2 * (two - control);
    const addedAtOne = 2 * (one - control);
    expect(addedAtTwo).toBe(43470);
    expect(addedAtOne).toBe(8694);
    // `PERFORMANCE_STRATEGY.md`: mobile ≤ 300 k triangles, constrained ≤ 120 k.
    expect(addedAtTwo / 300_000).toBeLessThan(0.15);
    expect(addedAtTwo / 120_000).toBeGreaterThan(0.35);
    expect(addedAtOne / 120_000).toBeLessThan(0.08);
    // Which is why the two small tiers get one level and the rest get two.
    for (const tier of ['ultra', 'desktop', 'laptop']) expect(visorSubdivisions(tier)).toBe(2);
    for (const tier of ['mobile', 'constrained']) expect(visorSubdivisions(tier)).toBe(1);
  });

  it('states the numbers it works to, so a change to them is a change to the record', () => {
    expect(VISOR_SUBDIVISIONS).toBe(2);
    expect(DIMPLE_SLOPE).toBe(0.02);
    expect(LIFT_SLOPE).toBe(0.12);
    expect(CONVEXITY_RADIUS_M).toBe(0.025);
  });
});
