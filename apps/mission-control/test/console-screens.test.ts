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
