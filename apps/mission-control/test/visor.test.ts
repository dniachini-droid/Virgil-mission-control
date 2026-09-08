import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildGeometry, decodeMeshyPayload } from '../src/world/assets/meshyAsset.js';
import {
  bonePositions,
  buildVisorGeometry,
  buildVisorMesh,
  createVisorMaterial,
  fitHeadSurface,
  type HeadSurface,
  placedPositions,
  VIRGIL_VISOR,
} from '../src/world/characters/visorFit.js';
import {
  fabricator2Base64Payload,
  keeper2Base64Payload,
  prover2Base64Payload,
} from '../src/world/props/v6Assets.js';
import { CAST, ROLES, type Role } from '../src/world/room/cast.js';
import { decodeVirgilPayload, parseVirgilGlb } from '../src/world/virgil/virgilRigged.js';

/**
 * The visors hid a defect once: in V3 both panels were silently culled, and
 * the close-ups that seemed to show a fitted face were showing the baked
 * texture underneath. These tests build each visor exactly as the set
 * does — same payloads, same fit, same specs, same mesh builder — and fail
 * if a panel stops being double-sided, gets culled or hidden, leaves its
 * head, floats off it, or lets the head poke through it. They run under
 * node with no renderer.
 *
 * KR-57: three mutations survived V5's tests — re-siding the material
 * after `createVisorMaterial()` returned, deleting `frustumCulled={false}`,
 * and adding `visible={false}`. The mesh is now built by `buildVisorMesh`
 * and those three properties are asserted on the object it returns; and
 * `Visor.tsx` is held to using it and nothing else, so the routes by which
 * a component could undo them are closed by source guards below.
 */

const src = (file: string) => readFileSync(resolve(import.meta.dirname, '../src', file), 'utf8');

/** Bilinear panel height at (x, y), from the fitted surface plus its offset. */
function panelZ(surface: HeadSurface, x: number, y: number): number {
  const { spec, z } = surface;
  const u = ((x + spec.halfWidth) / (2 * spec.halfWidth)) * spec.cols;
  const v = ((y - spec.y0) / (spec.y1 - spec.y0)) * spec.rows;
  const c0 = Math.min(spec.cols - 1, Math.max(0, Math.floor(u)));
  const r0 = Math.min(spec.rows - 1, Math.max(0, Math.floor(v)));
  const fu = Math.min(1, Math.max(0, u - c0));
  const fv = Math.min(1, Math.max(0, v - r0));
  const at = (r: number, c: number) => z[r * (spec.cols + 1) + c] as number;
  const top = at(r0, c0) * (1 - fu) + at(r0, c0 + 1) * fu;
  const bottom = at(r0 + 1, c0) * (1 - fu) + at(r0 + 1, c0 + 1) * fu;
  return top * (1 - fv) + bottom * fv + spec.offset;
}

/**
 * The checks every visor must pass, against the head's own geometry, with
 * three's Raycaster — a different implementation from the fit's:
 *  - every panel vertex lies inside the head's bounding box (grown only by
 *    the offset plus 2 mm in front);
 *  - no head vertex under the panel is in front of it (nothing pokes through);
 *  - from every panel vertex, the head surface is directly behind it, at
 *    least the offset away and at most `MAX_GAP` away (nothing floats). The
 *    fit lifts nodes over relief, so the gap is not the offset everywhere.
 *    V5's bound was 15 mm, measured against a worst of 13.0 mm on the
 *    ornate Virgil's plate seams; the V6 worst gaps are recorded in
 *    `docs/process/PHASE_1_HOW_TO_LOOK_V6.md`. The worst gaps are reported
 *    on failure.
 */
const MAX_GAP = 0.015;

function expectFitted(
  label: string,
  surface: HeadSurface,
  positions: Float32Array,
  index: ArrayLike<number>,
  headBounds: THREE.Box3,
  isHead: (vertex: number) => boolean,
): number {
  const { spec } = surface;
  const panel = buildVisorGeometry(surface);
  const vertices = panel.getAttribute('position');
  expect(vertices.count).toBe((spec.rows + 1) * (spec.cols + 1));
  const grown = headBounds.clone();
  grown.max.z += spec.offset + 0.002;
  for (let i = 0; i < vertices.count; i += 1) {
    const p = new THREE.Vector3().fromBufferAttribute(vertices, i);
    expect(
      grown.containsPoint(p),
      `${label}: panel vertex ${i} ${p.toArray()} leaves the head`,
    ).toBe(true);
  }

  let pokes = 0;
  let under = 0;
  for (let v = 0; v < positions.length / 3; v += 1) {
    if (!isHead(v)) continue;
    const x = positions[v * 3] as number;
    const y = positions[v * 3 + 1] as number;
    const z = positions[v * 3 + 2] as number;
    if (Math.abs(x) > spec.halfWidth || y < spec.y0 || y > spec.y1 || z < spec.zMin) continue;
    under += 1;
    if (z > panelZ(surface, x, y) + 0.0005) pokes += 1;
  }
  expect(under, `${label}: no head vertices under the panel at all`).toBeGreaterThan(20);
  expect(pokes, `${label}: head vertices in front of the panel`).toBe(0);

  // The head as a mesh in the panel's frame, and a ray from each panel
  // vertex straight back into it.
  const head = new THREE.BufferGeometry();
  head.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  head.setIndex(new THREE.BufferAttribute(Uint32Array.from(index), 1));
  const probe = new THREE.Mesh(head, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const raycaster = new THREE.Raycaster();
  const back = new THREE.Vector3(0, 0, -1);
  const gaps: { x: number; y: number; gap: number }[] = [];
  for (let i = 0; i < vertices.count; i += 1) {
    const p = new THREE.Vector3().fromBufferAttribute(vertices, i);
    raycaster.set(new THREE.Vector3(p.x, p.y, p.z + 0.001), back);
    const hit = raycaster.intersectObject(probe, false)[0];
    expect(hit, `${label}: nothing behind panel vertex ${i} at (${p.x}, ${p.y})`).toBeDefined();
    gaps.push({ x: p.x, y: p.y, gap: (hit as THREE.Intersection).distance - 0.001 });
  }
  gaps.sort((a, b) => b.gap - a.gap);
  const worst = gaps
    .slice(0, 5)
    .map((g) => `(${g.x.toFixed(3)}, ${g.y.toFixed(3)}) ${(g.gap * 1000).toFixed(1)} mm`)
    .join('; ');
  const least = gaps[gaps.length - 1] as { gap: number };
  expect(least.gap, `${label}: a panel vertex is inside the head`).toBeGreaterThan(
    spec.offset - 0.0005,
  );
  const floating = gaps.filter((g) => g.gap > MAX_GAP);
  expect(
    floating.length,
    `${label}: ${floating.length} of ${gaps.length} panel vertices float more than ${MAX_GAP * 1000} mm off the head; worst ${worst}`,
  ).toBe(0);
  return (gaps[0] as { gap: number }).gap;
}

describe('the visor mesh (KR-57)', () => {
  const texture = new THREE.Texture();

  it('has a double-sided, untone-mapped material, because a culled visor is a face that is not there', () => {
    const material = createVisorMaterial(texture);
    expect(material.side).toBe(THREE.DoubleSide);
    expect(material.toneMapped).toBe(false);
  });

  it('is built uncullable, visible and still double-sided by the one builder the component uses', () => {
    const surface: HeadSurface = {
      spec: VIRGIL_VISOR,
      z: new Float32Array((VIRGIL_VISOR.rows + 1) * (VIRGIL_VISOR.cols + 1)).fill(0.5),
      bounds: new THREE.Box3(),
      triangles: 1,
    };
    const mesh = buildVisorMesh(surface, texture);
    expect(mesh.frustumCulled).toBe(false);
    expect(mesh.visible).toBe(true);
    expect(mesh.material.side).toBe(THREE.DoubleSide);
    expect(mesh.material.map).toBe(texture);
    expect(mesh.geometry.getAttribute('position').count).toBe(
      (VIRGIL_VISOR.rows + 1) * (VIRGIL_VISOR.cols + 1),
    );
  });

  it('is the only way Visor.tsx makes a mesh, and nothing there re-sides, culls or hides it', () => {
    const visor = src('world/characters/Visor.tsx');
    expect(visor).toContain('buildVisorMesh(surface, texture)');
    expect(visor).toContain('<primitive object={mesh} />');
    // No JSX mesh or material of its own: the builder is the only route.
    expect(visor).not.toMatch(/<mesh[\s>]/);
    expect(visor).not.toMatch(/<mesh(Basic|Standard|Physical|Lambert|Phong)Material/);
    expect(visor).not.toMatch(/new THREE\.Mesh\w*Material/);
    expect(visor).not.toContain('createVisorMaterial(');
    // The three survivors of V5's tests, by name.
    expect(visor).not.toMatch(/\.side\s*=/);
    expect(visor).not.toMatch(/frustumCulled\s*=/);
    expect(visor).not.toMatch(/visible\s*=/);
    expect(visor).not.toMatch(/visible=\{/);
    // KR-55: no early return that removes the face.
    expect(visor).not.toMatch(/return null/);
  });

  it('is fitted from the specs that travel with each model', () => {
    expect(src('world/characters/VirgilRigged.tsx')).toContain('VIRGIL_VISOR');
    const figure = src('world/characters/Figure.tsx');
    expect(figure).toContain('member.model.visor');
    // A figure's face breathes with it: it is inside the breathing group.
    expect(figure.indexOf('<Visor')).toBeGreaterThan(figure.indexOf('<group'));
    for (const role of ROLES) expect(CAST[role].model.visor).toBeDefined();
  });
});

const PAYLOADS: Record<Role, string> = {
  fabricator: fabricator2Base64Payload,
  prover: prover2Base64Payload,
  keeper: keeper2Base64Payload,
};

/**
 * Each character's head, independently of the fit, in the placed frame
 * (metres, feet at the origin). Read off the previews and ray scans of
 * 2026-09-08: the Fabricator's boxy head spans y 1.13–1.51; the Prover's
 * helmet y 1.05–1.50 inside |x| 0.35 (his eye-stalks stand at ±0.5); the
 * Keeper's hood y 0.94–1.49.
 */
const HEAD: Record<Role, { y0: number; y1: number; halfWidth: number }> = {
  fabricator: { y0: 1.13, y1: 1.51, halfWidth: 0.42 },
  prover: { y0: 1.05, y1: 1.5, halfWidth: 0.35 },
  keeper: { y0: 0.94, y1: 1.49, halfWidth: 0.5 },
};

describe.each(ROLES)('the %s’s visor', (role) => {
  const { metadata, visor } = CAST[role].model;
  const buffer = decodeMeshyPayload(metadata, PAYLOADS[role]);
  const geometry = buildGeometry(metadata, buffer);
  const mesh = new THREE.Mesh(geometry);
  // As meshyAsset.ts places them: scaled to 1.7 m, lifted onto their feet.
  const { scale, positionScale, baseOffsetY } = metadata.runtime;
  mesh.scale.setScalar(scale * positionScale);
  mesh.position.y = baseOffsetY;
  const positions = placedPositions(mesh);
  const index = geometry.index as THREE.BufferAttribute;
  const head = HEAD[role];
  const isHead = (v: number) => {
    const x = positions[v * 3] as number;
    const y = positions[v * 3 + 1] as number;
    return y >= head.y0 && y <= head.y1 && Math.abs(x) <= head.halfWidth;
  };
  const headBounds = new THREE.Box3();
  for (let v = 0; v < positions.length / 3; v += 1) {
    if (isHead(v)) headBounds.expandByPoint(new THREE.Vector3().fromArray(positions, v * 3));
  }

  it('sits within the head', () => {
    expect(visor.y0).toBeGreaterThan(head.y0);
    expect(visor.y1).toBeLessThan(head.y1);
    expect(visor.halfWidth).toBeLessThan(head.halfWidth);
  });

  it('hugs the face and never leaves it', () => {
    const surface = fitHeadSurface(positions, index.array, visor);
    const worst = expectFitted(role, surface, positions, index.array, headBounds, isHead);
    expect(worst).toBeLessThanOrEqual(MAX_GAP);
  });
});

describe("Virgil's visor", () => {
  it('is fitted to the screen on his head in the head joint and never leaves his head', async () => {
    const gltf = await parseVirgilGlb(decodeVirgilPayload());
    let skinned: THREE.SkinnedMesh | null = null;
    gltf.scene.traverse((o) => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned = o as THREE.SkinnedMesh;
    });
    expect(skinned).not.toBeNull();
    const mesh = skinned as unknown as THREE.SkinnedMesh;
    const head = gltf.scene.getObjectByName('Head') as THREE.Bone;
    expect(head).toBeDefined();
    const { positions, weights } = bonePositions(mesh, head);
    const isHead = (v: number) => (weights[v] as number) > 0.5;
    const headBounds = new THREE.Box3();
    for (let v = 0; v < positions.length / 3; v += 1) {
      if (isHead(v)) headBounds.expandByPoint(new THREE.Vector3().fromArray(positions, v * 3));
    }
    const index = mesh.geometry.index as THREE.BufferAttribute;
    const surface = fitHeadSurface(positions, index.array, VIRGIL_VISOR, isHead);
    expectFitted('virgil', surface, positions, index.array, headBounds, isHead);
    // His screen is a dome, not a plate: measured 2026-09-08 on the fitted
    // panel at z 0.535 at its centre falling to 0.355 at the top corners in
    // joint units (0.6 m per unit) — 0.181 of relief, 10.9 cm at scale.
    // The bounds here hold that shape, not a plate's.
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const z of surface.z) {
      min = Math.min(min, z);
      max = Math.max(max, z);
    }
    expect(max - min).toBeGreaterThan(0.1);
    expect(max - min).toBeLessThan(0.25);
    expect(max).toBeGreaterThan(0.5);
  });
});
