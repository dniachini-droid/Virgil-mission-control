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
  fitScreenPlane,
  flatScreenAspect,
  SCREEN_BULGE_RATIO,
  SCREEN_INSET_M,
  SCREEN_LIFT_MARGIN_M,
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
      fabricator: { rms: 1.85, front: 6.3, underRect: 5.84, behind: 3.23 },
      prover: { rms: 9.39, front: 29.21, underRect: 25.98, behind: 4.08 },
      keeper: { rms: 2.4, front: 1.76, underRect: 1.76, behind: 7.21 },
    }[role];
    expect(
      {
        rms: mm(plane.rms),
        front: mm(plane.maxFront),
        underRect: mm(plane.maxFrontUnderRect),
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

  it('draws on one flat rectangle: planar, inside the bezel, in front of every lump', () => {
    const flat = buildVisorMeshes(
      mesh,
      screen,
      positions,
      scale * positionScale,
      new THREE.Texture(),
      new THREE.Texture(),
      { gapMetres: SCREEN_GLASS_GAP_M, flat: true },
    );
    const plane = fitScreenPlane(screen, positions, index.array);
    const toPlaced = new THREE.Matrix4().makeScale(
      scale * positionScale,
      scale * positionScale,
      scale * positionScale,
    );
    toPlaced.setPosition(0, baseOffsetY, 0);
    const facePos = flat.face.geometry.getAttribute('position');
    // Two triangles: a rectangle, not a strip of the model's surface.
    expect(facePos.count).toBe(4);
    expect((flat.face.geometry.index as THREE.BufferAttribute).count).toBe(6);
    const corners: THREE.Vector3[] = [];
    for (let i = 0; i < facePos.count; i += 1) {
      corners.push(new THREE.Vector3().fromBufferAttribute(facePos, i).applyMatrix4(toPlaced));
    }
    // **Planar by construction, asserted anyway**: every corner the same
    // distance off the fitted plane, to a hundredth of a millimetre.
    const lift = plane.maxFrontUnderRect + SCREEN_LIFT_MARGIN_M;
    for (const [i, c] of corners.entries()) {
      const h = c.clone().sub(plane.centre).dot(plane.normal);
      expect(
        h,
        `${role}: corner ${i} stands ${(h * 1000).toFixed(3)} mm off the plane`,
      ).toBeCloseTo(lift, 5);
    }
    // A rectangle: opposite edges equal, corners square.
    const edge = (a: number, b: number) =>
      (corners[b] as THREE.Vector3).clone().sub(corners[a] as THREE.Vector3);
    expect(edge(0, 1).length()).toBeCloseTo(edge(3, 2).length(), 6);
    expect(edge(0, 3).length()).toBeCloseTo(edge(1, 2).length(), 6);
    expect(edge(0, 1).normalize().dot(edge(0, 3).normalize())).toBeCloseTo(0, 6);
    // Its size is the selection's own extent, inset on every side.
    const width = edge(0, 1).length();
    const height = edge(0, 3).length();
    // To a micrometre: the geometry attribute is float32, so the corners
    // carry about 60 nm of quantisation at this size.
    expect(width).toBeCloseTo(2 * plane.halfWidth - 2 * SCREEN_INSET_M, 6);
    expect(height).toBeCloseTo(2 * plane.halfHeight - 2 * SCREEN_INSET_M, 6);
    expect(SCREEN_INSET_M).toBeGreaterThan(0.02);
    // Inside the region `fit-screen.mjs` was allowed to look in — so the
    // rectangle's edge cannot have escaped the console's own screen recess.
    const { x0, x1, y0, y1 } = screen.region as ScreenRegion;
    for (const c of corners) {
      expect(c.x).toBeGreaterThanOrEqual(x0 - 1e-6);
      expect(c.x).toBeLessThanOrEqual(x1 + 1e-6);
      expect(c.y).toBeGreaterThanOrEqual(y0 - 1e-6);
      expect(c.y).toBeLessThanOrEqual(y1 + 1e-6);
    }
    // And inside the selection's measured extent, by the inset, in the plane.
    for (const c of corners) {
      const d = c.clone().sub(plane.centre);
      // 1 µm of slack: the corners are stored as float32.
      expect(Math.abs(d.dot(plane.right))).toBeLessThanOrEqual(
        plane.halfWidth - SCREEN_INSET_M + 1e-6,
      );
      expect(Math.abs(d.dot(plane.up))).toBeLessThanOrEqual(
        plane.halfHeight - SCREEN_INSET_M + 1e-6,
      );
    }
    // **Nothing pokes through**: every vertex of every original screen
    // triangle is behind the rectangle's plane, along its normal.
    const source = mesh.geometry.getAttribute('position');
    const v = new THREE.Vector3();
    for (const t of screen.triangles) {
      for (let k = 0; k < 3; k += 1) {
        v.fromArray(positions, index.getX(t * 3 + k) * 3);
        const h = v.clone().sub(plane.centre).dot(plane.normal);
        expect(
          h,
          `${role}: an original screen vertex reaches ${(h * 1000).toFixed(2)} mm out`,
        ).toBeLessThan(lift - 1e-9);
      }
    }
    expect(source.count).toBeGreaterThan(0);
    // The glass: the same convex profile Virgil's slabs use, the screen's
    // gap in front of the rectangle at its edges and bulging out at its
    // centre. (The visors keep the exact-gap rule; `visor.test.ts` holds it.)
    const glassPos = flat.glass.geometry.getAttribute('position');
    expect(glassPos.count).toBeGreaterThan(100);
    const bulge = width * SCREEN_BULGE_RATIO;
    let nearest = Number.POSITIVE_INFINITY;
    let furthest = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < glassPos.count; i += 1) {
      const g = new THREE.Vector3().fromBufferAttribute(glassPos, i).applyMatrix4(toPlaced);
      const d = g.clone().sub(plane.centre);
      const h = d.dot(plane.normal) - lift;
      nearest = Math.min(nearest, h);
      furthest = Math.max(furthest, h);
      // Every point of the glass is over the rectangle, never beyond it.
      expect(Math.abs(d.dot(plane.right))).toBeLessThanOrEqual(width / 2 + 1e-6);
      expect(Math.abs(d.dot(plane.up))).toBeLessThanOrEqual(height / 2 + 1e-6);
    }
    expect(nearest, `${role}: the glass's edge sits at the screen's own gap`).toBeCloseTo(
      SCREEN_GLASS_GAP_M,
      6,
    );
    expect(furthest, `${role}: the glass swells by the slabs' own ratio`).toBeCloseTo(
      SCREEN_GLASS_GAP_M + bulge,
      6,
    );
    // The live canvas is drawn at the rectangle's aspect, not the paint bounds'.
    expect(flatScreenAspect(screen, positions, index.array)).toBeCloseTo(width / height, 6);
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
