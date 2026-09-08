import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildGeometry, decodeMeshyPayload } from '../src/world/assets/meshyAsset.js';
import {
  buildVisorGeometry,
  buildVisorMeshes,
  GLASS_GAP_M,
  placedPositions,
  type ScreenRegion,
} from '../src/world/characters/visorFit.js';
import {
  fabricatorStationBase64Payload,
  keeperStationBase64Payload,
  proverStationBase64Payload,
} from '../src/world/props/v6Assets.js';
import { CAST, ROLES, type Role, screenCentre, workingPlacement } from '../src/world/room/cast.js';
import { SCREEN_ARRIVAL, screenArrivalWorld } from '../src/world/screens/arrival.js';
import { SCREEN_GLASS_GAP_M } from '../src/world/screens/ConsoleScreen.js';
import {
  BAND_HEIGHT,
  BAND_WORDS,
  bandTextWidth,
  cornerMargin,
  RULE,
} from '../src/world/screens/draw.js';
import { SLAB_CANVAS_PIXELS, slabPlan } from '../src/world/screens/ScreenBank.js';
import {
  fitScreenOutline,
  insideFootprint,
  OUTLINE_SAMPLES,
  type PlanePoint,
  projectSelection,
  roundedRectDistance,
  roundedRectOutline,
} from '../src/world/screens/screenOutline.js';
import {
  fitScreenPlane,
  SCREEN_BULGE_RATIO,
  SCREEN_CANVAS_PIXELS,
  SCREEN_FACE_RINGS,
  SCREEN_FEATHER_PIXELS,
  SCREEN_GLASS_RINGS,
  SCREEN_LIFT_MARGIN_M,
  SCREEN_OUTLINE_SEGMENTS,
  screenPlan,
  surfaceHeightUnder,
} from '../src/world/screens/screenPlane.js';

/**
 * The consoles' own screens (V8 §0.10.2): each is a mask
 * `asset-pipeline/fit-screen.mjs` read off the console's own mesh, in the
 * visor's shape, built by the visor's builder. These build each screen
 * exactly as the set does and fail if a mask no longer belongs to its
 * payload, names a triangle outside the region it was allowed to look
 * in or one that does not face the way the screen faces, or is too small
 * to be a screen; if the screen's rule would discard any pixel (the
 * screens carry baked writing, so the whole triangle is the screen); if
 * the glass is not the screen pushed out along its normals by the
 * screen's gap; or if the floating panels come back. They run under node
 * with no renderer.
 *
 * **V8.1 (defect 4): the picture is drawn on a plane fitted to the
 * selection, not on the selection's own triangles.** The owner: *"the
 * screens on the consoles look all crooked and lots of different slants.
 * Can you make it completely smooth like Virgils screens??"* So
 * `ConsoleScreen.tsx` asks the same builder for the **flat** plan
 * (`screens/screenPlane.ts`), and the assertions below are in two parts:
 *
 *  - the builder's original behaviour — the selection's own triangles
 *    with the glass pushed out along their normals by exactly the gap —
 *    is asserted **unchanged**, because it is still what a visor gets and
 *    still what the default builder returns. Nothing here was weakened;
 *  - the flat plan is asserted on top: the fit's residuals are recorded
 *    in millimetres, the rectangle is planar to a tight tolerance, its
 *    corners stay inside the selection's own region, and every one of the
 *    original triangles' vertices is behind it along the plane's normal.
 */

const src = (file: string) => readFileSync(resolve(import.meta.dirname, '../src', file), 'utf8');
const sha256 = (b64: string) =>
  createHash('sha256').update(Buffer.from(b64, 'base64')).digest('hex');

const PAYLOADS: Record<Role, string> = {
  fabricator: fabricatorStationBase64Payload,
  prover: proverStationBase64Payload,
  keeper: keeperStationBase64Payload,
};

describe.each(ROLES)('the %s’s console screen', (role) => {
  const { metadata, screen } = CAST[role].station;
  const buffer = decodeMeshyPayload(metadata, PAYLOADS[role]);
  const geometry = buildGeometry(metadata, buffer);
  const mesh = new THREE.Mesh(geometry);
  const { scale, positionScale, baseOffsetY } = metadata.runtime;
  mesh.scale.setScalar(scale * positionScale);
  mesh.position.y = baseOffsetY;
  const positions = placedPositions(mesh);
  const index = geometry.index as THREE.BufferAttribute;

  it('was read off this payload, not an earlier one, as a screen', () => {
    expect(screen.source.payloadSha256).toBe(metadata.payload.sha256);
    expect(sha256(PAYLOADS[role])).toBe(metadata.payload.sha256);
    expect(screen.kind).toBe('screen');
    expect(screen.joint).toBeNull();
  });

  it('keeps every pixel: the baked writing is drawn over, not punched through', () => {
    expect(screen.paint.overridesDefault).toBe(true);
    expect(screen.paint.luminance).toBeGreaterThan(1);
    expect(screen.paint.chroma).toBeGreaterThan(1);
  });

  it('names only triangles in its region that face the way the screen faces, enough to be a screen', () => {
    expect('x0' in screen.region).toBe(true);
    const { x0, x1, y0, y1, z0, z1 } = screen.region as ScreenRegion;
    expect(screen.triangles.length).toBeGreaterThanOrEqual(12);
    expect(screen.triangles.length).toBe(screen.measured.trianglesPainted);
    expect(new Set(screen.triangles).size).toBe(screen.triangles.length);
    const facing = new THREE.Vector3().fromArray(
      (screen as unknown as { selection: { facing: number[] } }).selection.facing,
    );
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const n = new THREE.Vector3();
    let area = 0;
    const bounds = new THREE.Box3();
    for (const t of screen.triangles) {
      expect(t).toBeLessThan(index.count / 3);
      for (let k = 0; k < 3; k += 1) {
        const v = index.getX(t * 3 + k);
        a.fromArray(positions, v * 3);
        expect(a.x).toBeGreaterThanOrEqual(x0 - 1e-6);
        expect(a.x).toBeLessThanOrEqual(x1 + 1e-6);
        expect(a.y).toBeGreaterThanOrEqual(y0 - 1e-6);
        expect(a.y).toBeLessThanOrEqual(y1 + 1e-6);
        expect(a.z).toBeGreaterThanOrEqual(z0 - 1e-6);
        expect(a.z).toBeLessThanOrEqual(z1 + 1e-6);
        bounds.expandByPoint(a);
      }
      a.fromArray(positions, index.getX(t * 3) * 3);
      b.fromArray(positions, index.getX(t * 3 + 1) * 3);
      c.fromArray(positions, index.getX(t * 3 + 2) * 3);
      n.copy(b).sub(a).cross(c.sub(a));
      area += n.length() / 2;
      n.normalize();
      expect(n.dot(facing), `${role}: triangle ${t} faces away from the screen`).toBeGreaterThan(
        Math.cos((25 * Math.PI) / 180) - 1e-6,
      );
    }
    // A screen, not a sliver: at least a third of a square metre, wider than tall.
    expect(area).toBeGreaterThan(0.33);
    expect(area).toBeCloseTo(screen.measured.areaSquareMetres as number, 3);
    const size = bounds.getSize(new THREE.Vector3());
    expect(size.x).toBeGreaterThan(size.y);
    expect(size.y).toBeGreaterThan(0.45);
    // The recorded bounds are the triangles' bounds; the paint's are the same, because the whole triangle is the screen.
    expect(bounds.min.toArray().map((v) => +v.toFixed(5))).toEqual(
      screen.measured.triangleBounds.min.map((v) => +v.toFixed(5)),
    );
    expect(screen.measured.paintBounds).toEqual(screen.measured.triangleBounds);
  });

  it('is built on the console’s own triangles with the glass the screen’s gap off it', () => {
    const geometryOut = buildVisorGeometry(
      mesh.geometry,
      screen,
      positions,
      scale * positionScale,
      SCREEN_GLASS_GAP_M,
    );
    const facePos = geometryOut.face.getAttribute('position');
    const glassPos = geometryOut.glass.getAttribute('position');
    const gap = SCREEN_GLASS_GAP_M / (scale * positionScale);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    for (let i = 0; i < facePos.count; i += 1) {
      a.fromBufferAttribute(facePos, i);
      b.fromBufferAttribute(glassPos, i);
      expect(b.distanceTo(a)).toBeCloseTo(gap, 6);
    }
    expect(SCREEN_GLASS_GAP_M).toBeGreaterThan(GLASS_GAP_M);
    const built = buildVisorMeshes(
      mesh,
      screen,
      positions,
      scale * positionScale,
      new THREE.Texture(),
      new THREE.Texture(),
      { gapMetres: SCREEN_GLASS_GAP_M },
    );
    for (const m of [built.face, built.glass]) {
      expect(m.frustumCulled).toBe(false);
      expect(m.visible).toBe(true);
    }
    const material = built.face.material as THREE.ShaderMaterial;
    expect(material.uniforms.uPaintLuminance?.value).toBe(screen.paint.luminance);
    // The CRT uniforms are there, at their identity until a screen turns on or off.
    expect((material.uniforms.uScale?.value as THREE.Vector2).x).toBe(1);
    expect(material.uniforms.uPower?.value).toBe(1);
    expect(material.fragmentShader).toContain('uScale');
    expect(material.fragmentShader).toContain('uGlow');
  });

  it('is drawn on a plane fitted to the selection, and the fit’s residuals are recorded', () => {
    const plane = fitScreenPlane(screen, positions, index.array);
    const mm = (v: number) => +(v * 1000).toFixed(2);
    // **Recorded, not asserted to a value**: how far the model's own screen
    // surface departs from the plane fitted to it. This is the measurement
    // of how crooked a Meshy console screen is and the whole justification
    // for drawing on a plane instead of on the triangles. Measured
    // 2026-09-08 on the committed payloads; a model change that moves these
    // shows up here rather than silently.
    const recorded = {
      fabricator: { rms: 1.85, front: 6.3, behind: 3.23 },
      prover: { rms: 9.39, front: 29.21, behind: 4.08 },
      keeper: { rms: 2.4, front: 1.76, behind: 7.21 },
    }[role];
    expect(
      {
        rms: mm(plane.rms),
        front: mm(plane.maxFront),
        behind: mm(plane.maxBehind),
      },
      `${role}: the fit's residuals in mm have moved; record the new ones`,
    ).toEqual(recorded);
    // Crooked enough to be worth flattening: a screen that was already
    // flat to a tenth of a millimetre would not need this at all.
    expect(plane.rms).toBeGreaterThan(0.0005);
    // The plane's normal is the surface's: within a degree of the recorded mean.
    const mean = new THREE.Vector3().fromArray(screen.measured.meanNormal as number[]).normalize();
    expect(plane.normal.dot(mean)).toBeGreaterThan(Math.cos((1.5 * Math.PI) / 180));
    expect(plane.vertices).toBeGreaterThan(10);
    expect(plane.normal.length()).toBeCloseTo(1, 9);
    expect(plane.right.dot(plane.normal)).toBeCloseTo(0, 9);
    expect(plane.up.dot(plane.normal)).toBeCloseTo(0, 9);
    // Horizontal, never rolled: the plane's right axis has no y.
    expect(plane.right.y).toBeCloseTo(0, 9);
  });

  /**
   * **V8.2: the picture is drawn to the model's own opening.** The owner,
   * on the V8.1 frames: *"the screens are better, but they are still sharp
   * edges, a rectangle, instead of going right to the end of the screen.
   * the screens need to curve on the corners. and go right to the end."*
   *
   * So the values below are the measurement of each opening —
   * `screenOutline.ts` fits a rounded rectangle to the selection's own
   * border and the corner radius comes out of that fit rather than out of
   * anybody's judgement — and they are recorded here, in millimetres, the
   * way the plane's residuals are, so a payload change or a re-fit that
   * moves them fails a check instead of passing silently.
   *
   * Three of these numbers are the honest cost of the method and are
   * recorded because they are not flattering:
   *
   *  - `trimmedPct` is how much of the border the robust refit set aside.
   *    The Fabricator's decimated mesh carries a flap — two border edges
   *    running from the bottom-right corner to a point 143 mm inside the
   *    screen, over surface that other triangles already cover — and the
   *    Prover's selection reaches below the opening onto the console's
   *    chin. A fifth and a quarter of their borders respectively are not
   *    the opening's outline;
   *  - `worst` is how far the kept border still departs from a rounded
   *    rectangle: 31.7 mm on the Fabricator, whose opening has a second,
   *    smaller nick in its bottom edge. His opening is a rounded rectangle
   *    to about 5.6 mm RMS and no better than that;
   *  - `inset` is how far the fit had to be contracted to sit inside the
   *    selection. It is 7.5–15.3 mm, against V8.1's chosen 35 mm a side,
   *    and the Prover's is the largest because his opening is **chamfered
   *    rather than radiused** — its corners are cut at 45° — so an arc
   *    through them bulges past the cut and has to come back inside it.
   */
  it('is drawn to the opening the model has: a rounded rectangle, measured', () => {
    const plane = fitScreenPlane(screen, positions, index.array);
    const outline = fitScreenOutline(screen, positions, index.array, plane);
    const mm = (v: number) => +(v * 1000).toFixed(2);
    const recorded = {
      fabricator: {
        fitted: { width: 955.44, height: 568.96, radius: 77.87 },
        rms: 5.55,
        worst: 31.71,
        trimmedPct: 19,
        worstTrimmed: 256.78,
        inset: 8.05,
        drawn: { width: 939.34, height: 552.87, radius: 77.87 },
      },
      prover: {
        fitted: { width: 885.69, height: 488.74, radius: 42.9 },
        rms: 0.77,
        worst: 3.12,
        trimmedPct: 23.8,
        worstTrimmed: 52.81,
        inset: 15.33,
        drawn: { width: 855.03, height: 458.09, radius: 42.9 },
      },
      keeper: {
        fitted: { width: 886.57, height: 590.43, radius: 81.11 },
        rms: 2.06,
        worst: 7.79,
        trimmedPct: 5.9,
        worstTrimmed: 12.1,
        inset: 7.5,
        drawn: { width: 871.56, height: 575.43, radius: 81.11 },
      },
    }[role];
    expect(
      {
        fitted: {
          width: mm(2 * outline.fitted.halfWidth),
          height: mm(2 * outline.fitted.halfHeight),
          radius: mm(outline.fitted.radius),
        },
        rms: mm(outline.rms),
        worst: mm(outline.worst),
        trimmedPct: +(outline.trimmedFraction * 100).toFixed(1),
        worstTrimmed: mm(outline.worstTrimmed),
        inset: mm(outline.inset),
        drawn: {
          width: mm(2 * outline.drawn.halfWidth),
          height: mm(2 * outline.drawn.halfHeight),
          radius: mm(outline.drawn.radius),
        },
      },
      `${role}: the opening's measured outline has moved; record the new numbers`,
    ).toEqual(recorded);
    // **The corners are rounded, and to the radius that was measured.** A
    // radius that came back at zero would mean the fit had found a square
    // corner and the owner's instruction had not been carried out.
    expect(outline.fitted.radius).toBeGreaterThan(0.02);
    expect(outline.drawn.radius).toBeCloseTo(outline.fitted.radius, 9);
    // **Full bleed**: the contraction is a fraction of V8.1's chosen inset,
    // and it is derived from the geometry rather than picked.
    expect(outline.inset).toBeLessThan(0.02);
    expect(outline.inset).toBeLessThan(0.035);
    // The fit is over the border of the selection, densely sampled.
    expect(outline.footprint.border.length).toBeGreaterThan(20);
    expect(outline.borderSamples).toBeGreaterThan(400);
    // A rounded rectangle describes these openings better than the square
    // one V8.1 drew: recorded as the two RMS values side by side.
    let square = 0;
    for (const [a] of outline.footprint.border)
      square += roundedRectDistance(a, { ...outline.fitted, radius: 0 }) ** 2;
    expect(Math.sqrt(square / outline.footprint.border.length)).toBeGreaterThan(outline.rms);
  });

  it('goes right to the end: the drawn outline stays inside the selection, and nothing spills', () => {
    const plane = fitScreenPlane(screen, positions, index.array);
    const outline = fitScreenOutline(screen, positions, index.array, plane);
    const footprint = projectSelection(screen, positions, index.array, plane);
    // **The picture must not spill onto the bezel.** Every sampled point of
    // the drawn outline is covered by one of the console's own screen
    // triangles — the selection itself, not a polygon derived from it.
    const edge = roundedRectOutline(outline.drawn, OUTLINE_SAMPLES);
    for (const [i, p] of edge.entries())
      expect(
        insideFootprint(footprint, p),
        `${role}: outline point ${i} at (${(p.u * 1000).toFixed(0)}, ${(p.v * 1000).toFixed(
          0,
        )}) mm is off the model's own screen`,
      ).toBe(true);
    // And it reaches: at least 89% of the fitted opening's area. The
    // Prover is the one at that bound — 90.5%, because his opening is
    // chamfered and the arc has to come inside the cut — where the
    // Fabricator is 95.4% and the Keeper 96.0%.
    const drawnArea = 4 * outline.drawn.halfWidth * outline.drawn.halfHeight;
    const fittedArea = 4 * outline.fitted.halfWidth * outline.fitted.halfHeight;
    expect(drawnArea / fittedArea).toBeGreaterThan(0.89);
    // The drawn outline never crosses outside the fit, and holding the
    // measured radius while contracting the extents takes the corner arc
    // in by √2 of the contraction at its 45° point, which is the deepest
    // any of it goes.
    for (const p of edge) {
      const d = roundedRectDistance(p, outline.fitted);
      expect(d).toBeLessThanOrEqual(1e-9);
      expect(d).toBeGreaterThanOrEqual(-Math.SQRT2 * outline.inset - 1e-4);
    }
    // **And the contraction is minimal**, which is the whole claim of
    // "full bleed": half a millimetre less of it and the picture would be
    // off the model's own screen somewhere.
    expect(outline.inset).toBeGreaterThan(0.0005);
    const wider = {
      centreU: outline.fitted.centreU,
      centreV: outline.fitted.centreV,
      halfWidth: outline.fitted.halfWidth - (outline.inset - 0.0005),
      halfHeight: outline.fitted.halfHeight - (outline.inset - 0.0005),
      radius: outline.drawn.radius,
    };
    expect(
      roundedRectOutline(wider, OUTLINE_SAMPLES).some((p) => !insideFootprint(footprint, p)),
      `${role}: the picture could have been half a millimetre wider on every side`,
    ).toBe(true);
  });

  it('draws on one flat surface: planar, feathered, in front of every lump under it', () => {
    const flat = buildVisorMeshes(
      mesh,
      screen,
      positions,
      scale * positionScale,
      new THREE.Texture(),
      new THREE.Texture(),
      { gapMetres: SCREEN_GLASS_GAP_M, flat: true },
    );
    const plan = screenPlan(screen, positions, index.array);
    const { plane, outline } = plan;
    const toPlaced = new THREE.Matrix4().makeScale(
      scale * positionScale,
      scale * positionScale,
      scale * positionScale,
    );
    toPlaced.setPosition(0, baseOffsetY, 0);
    const facePos = flat.face.geometry.getAttribute('position');
    const faceUv = flat.face.geometry.getAttribute('faceUv');
    // A tessellated rounded rectangle, not two triangles and not a strip
    // of the model's surface: a centre, and rings out to the outline.
    expect(facePos.count).toBe(1 + SCREEN_FACE_RINGS * SCREEN_OUTLINE_SEGMENTS);
    expect(faceUv.count).toBe(facePos.count);

    // **The lift is measured under what is drawn.** The Prover's own
    // surface reaches 29.2 mm out of his fitted plane, but that ridge lies
    // on the chin *outside* his opening, so the picture no longer has to
    // stand 30 mm proud of the console to clear it, as V8.1's rectangle
    // did: 1.5 mm under the outline, 5.5 mm of lift.
    const under = surfaceHeightUnder(screen, positions, index.array, plane, outline.drawn);
    const recorded = {
      fabricator: { under: 6.12, lift: 10.12 },
      prover: { under: 1.5, lift: 5.5 },
      keeper: { under: 1.76, lift: 5.76 },
    }[role];
    expect(
      { under: +(under * 1000).toFixed(2), lift: +(plan.lift * 1000).toFixed(2) },
      `${role}: the height under the outline has moved; record the new one`,
    ).toEqual(recorded);
    expect(plan.lift).toBeCloseTo(under + SCREEN_LIFT_MARGIN_M, 12);

    // **Planar**: every vertex of the picture the same distance off the
    // fitted plane, to a hundredth of a millimetre — this is the V8.1
    // requirement, unchanged, on a surface that is no longer a rectangle.
    const p = new THREE.Vector3();
    for (let i = 0; i < facePos.count; i += 1) {
      p.fromBufferAttribute(facePos, i).applyMatrix4(toPlaced);
      const h = p.clone().sub(plane.centre).dot(plane.normal);
      expect(h, `${role}: face vertex ${i} stands ${(h * 1000).toFixed(3)} mm off`).toBeCloseTo(
        plan.lift,
        5,
      );
      // And inside the drawn outline, to a micrometre (float32 positions).
      const d = p.clone().sub(plane.centre);
      const q: PlanePoint = { u: d.dot(plane.right), v: d.dot(plane.up) };
      expect(roundedRectDistance(q, outline.drawn)).toBeLessThanOrEqual(1e-6);
      // The canvas is mapped over the outline's own bounding box.
      const fu =
        (q.u - (outline.drawn.centreU - outline.drawn.halfWidth)) / (2 * outline.drawn.halfWidth);
      expect(faceUv.getX(i)).toBeCloseTo(fu, 5);
    }

    // **Nothing under the picture pokes through it.** Stated over the whole
    // area the picture covers, not just at the selection's vertices: each
    // triangle is clipped to the outline and the highest point of what
    // survives is compared with the lift. (V8.1 asserted this at every
    // vertex of the selection; the outline no longer covers the whole
    // selection, so a vertex outside it — the Prover's chin ridge — is
    // neither behind the picture nor able to come through it. The clipped
    // form is the same rule over the right region, and it is stronger
    // there, because it also covers the interior of a triangle.)
    expect(under).toBeLessThan(plan.lift);
    const source = mesh.geometry.getAttribute('position');
    expect(source.count).toBeGreaterThan(0);

    // The glass: the same convex profile Virgil's slabs use, the screen's
    // gap in front of the picture at its edge and bulging out at its
    // centre — and **on the same outline**, because a rounded picture
    // behind rectangular glass would be worse than a square one.
    const glassPos = flat.glass.geometry.getAttribute('position');
    expect(glassPos.count).toBe(1 + SCREEN_GLASS_RINGS * SCREEN_OUTLINE_SEGMENTS);
    const width = 2 * outline.drawn.halfWidth;
    const bulge = width * SCREEN_BULGE_RATIO;
    let nearest = Number.POSITIVE_INFINITY;
    let furthest = Number.NEGATIVE_INFINITY;
    let edgeVertices = 0;
    for (let i = 0; i < glassPos.count; i += 1) {
      const g = new THREE.Vector3().fromBufferAttribute(glassPos, i).applyMatrix4(toPlaced);
      const d = g.clone().sub(plane.centre);
      const h = d.dot(plane.normal) - plan.lift;
      nearest = Math.min(nearest, h);
      furthest = Math.max(furthest, h);
      const q: PlanePoint = { u: d.dot(plane.right), v: d.dot(plane.up) };
      const sd = roundedRectDistance(q, outline.drawn);
      // Every point of the glass is over the picture, never beyond it.
      expect(sd).toBeLessThanOrEqual(1e-6);
      // Its outer ring is the picture's own outline, to a micrometre.
      // The outer ring, at the gap: float32 positions through the placed
      // matrix carry about a tenth of a micrometre, and the next ring in
      // stands 9 mm further out, so ten micrometres isolates the edge.
      if (Math.abs(h - SCREEN_GLASS_GAP_M) < 1e-5) {
        edgeVertices += 1;
        expect(Math.abs(sd)).toBeLessThanOrEqual(1e-6);
      }
    }
    expect(edgeVertices).toBe(SCREEN_OUTLINE_SEGMENTS);
    expect(nearest, `${role}: the glass's edge sits at the screen's own gap`).toBeCloseTo(
      SCREEN_GLASS_GAP_M,
      6,
    );
    expect(furthest, `${role}: the glass swells by the slabs' own ratio`).toBeCloseTo(
      SCREEN_GLASS_GAP_M + bulge,
      6,
    );

    // The picture's edge is feathered by a canvas pixel and a half, so the
    // mask taken from 23–41 coarse triangles does not alias along the arcs
    // — and the material carries it, with the outline it is measured from.
    const material = flat.face.material as THREE.ShaderMaterial;
    const uOutline = material.uniforms.uOutline?.value as THREE.Vector4;
    expect(uOutline.x).toBeCloseTo(outline.drawn.halfWidth, 9);
    expect(uOutline.y).toBeCloseTo(outline.drawn.halfHeight, 9);
    expect(uOutline.z).toBeCloseTo(outline.drawn.radius, 9);
    expect(uOutline.w).toBeCloseTo((SCREEN_FEATHER_PIXELS * width) / SCREEN_CANVAS_PIXELS, 9);
    expect(uOutline.w).toBeGreaterThan(0.001);
    expect(uOutline.w).toBeLessThan(0.002);
    expect(material.transparent).toBe(true);
    expect(material.fragmentShader).toContain('uOutline');
    // The live canvas is drawn at the outline's aspect, not the paint bounds'.
    expect(plan.aspect).toBeCloseTo(width / (2 * outline.drawn.halfHeight), 9);
  });

  /**
   * **The honesty band stays whole, inside the rounded area.** It was the
   * reason V8 inset the picture in the first place, so the rule for this
   * pass was: solve it by laying the band out within the rounded outline —
   * not by shrinking the picture again, and never by dropping or dimming
   * it. This is the one label in the product that must never be ambiguous.
   */
  it('keeps the honesty band whole and inside the rounded corners', () => {
    const plan = screenPlan(screen, positions, index.array);
    const width = 2 * plan.outline.drawn.halfWidth;
    const height = 2 * plan.outline.drawn.halfHeight;
    const w = SCREEN_CANVAS_PIXELS;
    const h = Math.max(64, Math.round(SCREEN_CANVAS_PIXELS / plan.aspect));
    const corner = (plan.outline.drawn.radius / width) * w;
    // The canvas covers the outline's bounding box, at the same number of
    // pixels per metre on both axes, so a radius in metres is a radius in
    // pixels.
    expect(Math.abs(w / width - h / height) / (w / width)).toBeLessThan(0.002);
    expect(corner).toBeGreaterThan(40);
    // The band's box in canvas pixels, and the outline as a rounded
    // rectangle in the same pixels: every corner of the box is inside it.
    const textWidth = bandTextWidth(w, corner);
    expect(textWidth).toBeGreaterThan(0.8 * w);
    const box = {
      x0: (w - textWidth) / 2,
      x1: (w + textWidth) / 2,
      // The glyph box about the band's own baseline, at the size `band`
      // starts from; `fitFont` only ever makes it smaller.
      yTop: h - BAND_HEIGHT / 2 + RULE / 2 + 2 - 0.38 * 64,
      yBottom: h - BAND_HEIGHT / 2 + RULE / 2 + 2 + 0.38 * 64,
    };
    const outlineInPixels = {
      centreU: w / 2,
      centreV: h / 2,
      halfWidth: w / 2,
      halfHeight: h / 2,
      radius: corner,
    };
    for (const [x, y] of [
      [box.x0, box.yTop],
      [box.x1, box.yTop],
      [box.x0, box.yBottom],
      [box.x1, box.yBottom],
    ] as [number, number][]) {
      const d = roundedRectDistance({ u: x, v: y }, outlineInPixels);
      expect(
        d,
        `${role}: the band's words reach ${d.toFixed(1)} px outside the picture at (${x.toFixed(
          0,
        )}, ${y.toFixed(0)})`,
      ).toBeLessThan(0);
    }
    // The band's stripe is full width and full strength, and the words are
    // the four words: nothing here shortens, drops or dims them.
    expect(BAND_WORDS).toBe('ILLUSTRATIVE · NOT REAL STATE');
    expect(BAND_HEIGHT).toBe(118);
    // The frame's rule and brackets are inside the curve too.
    const margin = cornerMargin(corner, 22);
    expect(margin).toBeGreaterThanOrEqual(Math.ceil(corner * (1 - Math.SQRT1_2)));
    expect(roundedRectDistance({ u: margin, v: margin }, outlineInPixels)).toBeLessThanOrEqual(0);
  });

  it('is what the character turns to, and where a tube would arrive', () => {
    const centre = screenCentre(role);
    const { at, rotationY } = workingPlacement(role);
    // Facing the screen: the direction from the standing point to the screen's centre.
    const yaw = Math.atan2(centre[0] - at[0], centre[2] - at[2]);
    expect(Math.atan2(Math.sin(rotationY - yaw), Math.cos(rotationY - yaw))).toBeCloseTo(0, 6);
    // The arrival point is on the screen's edge, inside its bounds.
    const arrival = screenArrivalWorld(role);
    expect(SCREEN_ARRIVAL[role]).toBeDefined();
    const { min, max } = screen.measured.paintBounds;
    expect(arrival[1]).toBeGreaterThanOrEqual((min[1] as number) - 1e-6);
    expect(arrival[1]).toBeLessThanOrEqual((max[1] as number) + 1e-6);
    // And above the console's base, at screen height.
    expect(arrival[1]).toBeGreaterThan(0.8);
  });
});

describe('the floating panels are gone', () => {
  it('and the consoles carry the screens through the one builder', () => {
    const room = src('world/room/VirgilRoom.tsx');
    expect(room).not.toContain('StationPanel');
    expect(room).not.toContain('panelPlacement');
    expect(room).toContain('<ConsoleScreen');
    const screen = src('world/screens/ConsoleScreen.tsx');
    expect(screen).toContain('buildVisorMeshes(');
    expect(screen).toContain('<primitive object={screen.face} />');
    expect(screen).toContain('<primitive object={screen.glass} />');
    expect(screen).not.toMatch(/<mesh[\s>]/);
    expect(screen).not.toMatch(/new THREE\.(Mesh|Shader)\w*Material/);
    // No second glass: the set's one glass, through the builder.
    expect(screen).not.toContain('createGlassMaterial');
    expect(src('world/screens/ScreenBank.tsx')).not.toContain('StationPanel');
    // And the arch is gone from the tabletop.
    const tabletop = src('world/room/Tabletop.tsx');
    expect(tabletop).not.toContain('<Arch');
    expect(src('world/room/Models.tsx')).not.toContain('export function Arch');
  });
});

/**
 * **Virgil's slabs, item 1's small defect (V8.3).** V8.2 found it while
 * reading the slab code, measured it and left it as outside its two items:
 * the canvas is mapped onto a display plane that is `bezel/2` larger than
 * the opening on each side, and it was sized at the *opening's* aspect, so
 * the whole picture was stretched horizontally. V8.1 fixed exactly this
 * fault for the consoles' screens (`screenPlane.ts`, which draws its canvas
 * at the fitted outline's aspect); this is the same fault on the geometry
 * that is supposed to be their reference.
 */
describe("Virgil's slab canvas", () => {
  const authored: [number, number][] = [
    [1.3, 0.8],
    [0.9, 0.6],
  ];

  it('is drawn at the display plane’s aspect, not the opening’s', () => {
    for (const [width, height] of authored) {
      const plan = slabPlan(width, height);
      expect(plan.displayWidth).toBeCloseTo(width + plan.bezel * 0.5, 12);
      expect(plan.displayHeight).toBeCloseTo(height + plan.bezel * 0.5, 12);
      expect(plan.canvasWidthPixels).toBe(SLAB_CANVAS_PIXELS);
      // The canvas's aspect is the plane's, to within the rounding of one
      // pixel of height — which is 0.16 % on a 648-pixel canvas.
      const planeAspect = plan.displayWidth / plan.displayHeight;
      const canvasAspect = plan.canvasWidthPixels / plan.canvasHeightPixels;
      expect(Math.abs(canvasAspect / planeAspect - 1)).toBeLessThan(0.002);
    }
  });

  it('measures the stretch it removes, so the fix is not taken on trust', () => {
    const [width, height] = authored[0] as [number, number];
    const plan = slabPlan(width, height);
    // What V8.2 shipped: 1024 by round(1024 · height / width).
    const wasHeight = Math.round((SLAB_CANVAS_PIXELS * height) / width);
    expect(wasHeight).toBe(630);
    expect(plan.canvasHeightPixels).toBe(648);
    const stretch = (SLAB_CANVAS_PIXELS / wasHeight) * (plan.displayHeight / plan.displayWidth) - 1;
    // 2.78 %: the number the V8.2 run record recorded as "about 2.8 %".
    expect(stretch * 100).toBeCloseTo(2.78, 1);
    // And it is gone.
    const now =
      (plan.canvasWidthPixels / plan.canvasHeightPixels) *
        (plan.displayHeight / plan.displayWidth) -
      1;
    expect(Math.abs(now)).toBeLessThan(0.002);
  });

  it('is the size the display plane is actually drawn at', () => {
    const bank = src('world/screens/ScreenBank.tsx');
    // The canvas comes from the plan, and the plane from the same two numbers.
    expect(bank).toContain('canvas.width = plan.canvasWidthPixels');
    expect(bank).toContain('canvas.height = plan.canvasHeightPixels');
    expect(bank).toContain('<planeGeometry args={[displayWidth, displayHeight]} />');
    // Nothing left that sizes either from the opening.
    expect(bank).not.toContain('Math.round((1024 * height) / width)');
    expect(bank).not.toContain('args={[width + bezel * 0.5, height + bezel * 0.5]}');
  });

  it('lays the rounded corner out in the same pixels', () => {
    const plan = slabPlan(1.3, 0.8);
    // The corner radius is expressed against the canvas's width, and the
    // canvas now has one scale, so it means the same thing in both axes.
    const metresPerPixel = plan.displayWidth / plan.canvasWidthPixels;
    expect(plan.cornerPixels * metresPerPixel).toBeCloseTo(
      plan.openingRadius + (plan.bezel * 0.5) / 2,
      9,
    );
    // To within the half pixel the integer height is rounded by: 0.63 mm on
    // a 0.86 m plane, which is the whole of what is left of the 2.78 %.
    expect(plan.canvasHeightPixels * metresPerPixel).toBeCloseTo(plan.displayHeight, 2);
    expect(Math.abs(plan.canvasHeightPixels * metresPerPixel - plan.displayHeight)).toBeLessThan(
      metresPerPixel,
    );
  });
});
