import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildGeometry, decodeMeshyPayload } from '../src/world/assets/meshyAsset.js';
import {
  bonePositions,
  buildVisorGeometry,
  createVisorMaterial,
  fitHeadSurface,
  type HeadSurface,
  PROVER_VISOR,
  placedPositions,
  VIRGIL_VISOR,
} from '../src/world/characters/visorFit.js';
import proverBase64 from '../src/world/props/prover-asset.b64.txt?raw';
import proverMetadata from '../src/world/props/prover-asset.json';
import { decodeVirgilPayload, parseVirgilGlb } from '../src/world/virgil/virgilRigged.js';

/**
 * The visors hid a defect once: in V3 both panels were silently culled, and
 * the close-ups that seemed to show a fitted face were showing the baked
 * texture underneath. These tests build each visor exactly as the room
 * does — same payloads, same fit, same specs, same material — and fail if a
 * panel stops being double-sided, leaves its head, floats off it, or lets
 * the head poke through it. They run under node with no renderer.
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
 *    fit lifts nodes over rivets and groove edges, so the gap is not the
 *    offset everywhere: measured on 2026-09-07, the worst is 13.0 mm, at
 *    Virgil's top corners over the seam that runs down each side of his
 *    plate — under the rounded corner the canvas cuts away. The worst
 *    gaps are reported on failure.
 */
const MAX_GAP = 0.015;

function expectFitted(
  label: string,
  surface: HeadSurface,
  positions: Float32Array,
  index: ArrayLike<number>,
  headBounds: THREE.Box3,
  isHead: (vertex: number) => boolean,
) {
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
}

describe('the visor material', () => {
  it('is double-sided, because a culled visor is a face that is not there', () => {
    const material = createVisorMaterial(new THREE.Texture());
    expect(material.side).toBe(THREE.DoubleSide);
    expect(material.toneMapped).toBe(false);
  });

  it('is the only material Visor.tsx uses', () => {
    const visor = src('world/characters/Visor.tsx');
    expect(visor).toContain('createVisorMaterial(');
    expect(visor).not.toMatch(/<mesh(Basic|Standard|Physical|Lambert|Phong)Material/);
    expect(visor).not.toMatch(/new THREE\.Mesh\w*Material/);
  });

  it('is fitted from the same specs the room uses', () => {
    expect(src('world/characters/VirgilRigged.tsx')).toContain('VIRGIL_VISOR');
    expect(src('world/room/Models.tsx')).toContain('PROVER_VISOR');
    // The Prover's face breathes with him: it is inside his animated group.
    const models = src('world/room/Models.tsx');
    expect(models.indexOf('<Visor')).toBeGreaterThan(models.indexOf('<group ref={group}'));
  });
});

describe("the Prover's visor", () => {
  const buffer = decodeMeshyPayload(proverMetadata, proverBase64);
  const geometry = buildGeometry(proverMetadata, buffer);
  const mesh = new THREE.Mesh(geometry);
  // As meshyAsset.ts places him: scaled to 1.6 m, lifted onto his feet.
  const { scale, positionScale, baseOffsetY } = proverMetadata.runtime;
  mesh.scale.setScalar(scale * positionScale);
  mesh.position.y = baseOffsetY;
  const positions = placedPositions(mesh);
  const index = geometry.index as THREE.BufferAttribute;

  // His head, independently of the fit: the dome between his collar and the
  // stem of his halo. Measured from the payload: the dome spans y 0.89–1.30
  // and the halo ring begins at y 1.35, out to |x| 0.44.
  const isHead = (v: number) => {
    const x = positions[v * 3] as number;
    const y = positions[v * 3 + 1] as number;
    return y >= 0.85 && y <= 1.33 && Math.abs(x) <= 0.3;
  };
  const headBounds = new THREE.Box3();
  for (let v = 0; v < positions.length / 3; v += 1) {
    if (isHead(v)) headBounds.expandByPoint(new THREE.Vector3().fromArray(positions, v * 3));
  }

  it('sits on his head, below the halo, and not on the halo ring', () => {
    expect(PROVER_VISOR.y1).toBeLessThan(1.33);
    expect(headBounds.max.y).toBeLessThan(1.34);
  });

  it('is a spherical cap that hugs the dome and never leaves it', () => {
    const surface = fitHeadSurface(positions, index.array, PROVER_VISOR);
    expectFitted('prover', surface, positions, index.array, headBounds, isHead);
    // It wraps: the centre stands well in front of the corners.
    const { spec, z } = surface;
    const centre = z[
      Math.floor(spec.rows / 2) * (spec.cols + 1) + Math.floor(spec.cols / 2)
    ] as number;
    const corner = z[0] as number;
    expect(centre - corner).toBeGreaterThan(0.03);
    expect(centre).toBeGreaterThan(0.19);
    expect(centre).toBeLessThan(0.23);
  });
});

describe("Virgil's visor", () => {
  it('is fitted to his flat visor plate in the head joint and never leaves his head', async () => {
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
    // His face front is a plate, not a dome: 5 cm of relief at most across
    // the whole panel (measured 4.5 cm: the side seams against the lifted
    // nodes), where a dome this wide would show more than 10 cm.
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const z of surface.z) {
      min = Math.min(min, z);
      max = Math.max(max, z);
    }
    expect(max - min).toBeLessThan(0.05);
    expect(max).toBeGreaterThan(0.22);
  });
});
