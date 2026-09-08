import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildGeometry, decodeMeshyPayload } from '../src/world/assets/meshyAsset.js';
import {
  bonePositions,
  buildVisorGeometry,
  buildVisorMeshes,
  createFaceMaterial,
  createGlassMaterial,
  faceAspect,
  GLASS_GAP_M,
  placedPositions,
  VISOR_PAINT,
  type VisorMask,
} from '../src/world/characters/visorFit.js';
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
 * The visors hid a defect once: in V3 both panels were silently culled, and
 * the close-ups that seemed to show a fitted face were showing the baked
 * texture underneath. V7 has no panel: the face is drawn on the head's own
 * triangles, named by a mask `asset-pipeline/fit-visor.mjs` read off the
 * model's own paint. These tests build each visor exactly as the set does
 * — same payloads, same masks, same builder — and fail if a mask no longer
 * belongs to its payload, names a triangle that is not the head's front,
 * or is too small to be a visor; if the face's UVs leave the canvas; if the
 * glass is not the face pushed out along its normals by the recorded gap;
 * or if a mesh stops being uncullable, visible or, for the face,
 * double-sided (KR-57). They run under node with no renderer.
 *
 * What they cannot check without a GPU is the paint itself: that the
 * shader keeps exactly the painted pixels. The pipeline records how many
 * of each mask's triangles are wholly painted and how many straddle the
 * paint's edge, and the owner document reports the close-ups.
 */

const src = (file: string) => readFileSync(resolve(import.meta.dirname, '../src', file), 'utf8');
const sha256 = (b64: string) =>
  createHash('sha256').update(Buffer.from(b64, 'base64')).digest('hex');

/**
 * The checks every mask must pass against its head's geometry, in the
 * mask's own frame: `positions` are the head's vertices there, `isHead`
 * says which vertices belong to the head.
 */
function expectMask(
  label: string,
  mask: VisorMask,
  positions: Float32Array,
  index: ArrayLike<number>,
  isHead: (vertex: number) => boolean,
) {
  // The rule the pipeline used is the default unless the mask says it
  // was relaxed for this head, and a relaxed rule is still far below cream.
  if (mask.paint.overridesDefault) {
    expect(mask.paint.luminance).toBeGreaterThanOrEqual(VISOR_PAINT.luminance);
    expect(mask.paint.luminance).toBeLessThan(0.1);
    expect(mask.paint.chroma).toBeLessThan(0.1);
  } else {
    expect(mask.paint.luminance, `${label}: the pipeline's luminance rule`).toBe(
      VISOR_PAINT.luminance,
    );
    expect(mask.paint.chroma, `${label}: the pipeline's chroma rule`).toBe(VISOR_PAINT.chroma);
  }
  expect(mask.paint.space).toBe('linear');
  expect(mask.triangles.length).toBeGreaterThan(200);
  expect(mask.triangles.length).toBe(mask.measured.trianglesPainted);
  expect(mask.measured.trianglesWhollyPainted + mask.measured.trianglesPartlyPainted).toBe(
    mask.measured.trianglesPainted,
  );
  expect(new Set(mask.triangles).size, `${label}: duplicate triangles`).toBe(mask.triangles.length);

  const { halfWidth, y0, y1, zMin } = mask.region;
  const bounds = new THREE.Box3();
  const p = new THREE.Vector3();
  for (const t of mask.triangles) {
    expect(t, `${label}: triangle ${t} is past the end of the index`).toBeLessThan(
      index.length / 3,
    );
    for (let k = 0; k < 3; k += 1) {
      const v = index[t * 3 + k] as number;
      expect(isHead(v), `${label}: triangle ${t} has a vertex that is not the head's`).toBe(true);
      p.fromArray(positions, v * 3);
      // Every vertex inside the region the pipeline was allowed to look in.
      expect(Math.abs(p.x)).toBeLessThanOrEqual(halfWidth + 1e-6);
      expect(p.y).toBeGreaterThanOrEqual(y0 - 1e-6);
      expect(p.y).toBeLessThanOrEqual(y1 + 1e-6);
      expect(p.z).toBeGreaterThanOrEqual(zMin - 1e-6);
      bounds.expandByPoint(p);
    }
  }
  // The recorded bounds are the triangles' bounds, and the paint's sit inside them.
  const recorded = mask.measured.triangleBounds;
  expect(bounds.min.toArray().map((v) => +v.toFixed(5))).toEqual(
    recorded.min.map((v) => +v.toFixed(5)),
  );
  expect(bounds.max.toArray().map((v) => +v.toFixed(5))).toEqual(
    recorded.max.map((v) => +v.toFixed(5)),
  );
  const paint = mask.measured.paintBounds;
  for (let a = 0; a < 3; a += 1) {
    expect(paint.min[a] as number).toBeGreaterThanOrEqual((recorded.min[a] as number) - 1e-6);
    expect(paint.max[a] as number).toBeLessThanOrEqual((recorded.max[a] as number) + 1e-6);
  }
  // A visor is wider than it is tall, and is not a sliver.
  expect(faceAspect(mask)).toBeGreaterThan(1);
  expect(faceAspect(mask)).toBeLessThan(3);
  expect((paint.max[1] as number) - (paint.min[1] as number)).toBeGreaterThan(0.1);
}

/** The checks on what the builder makes: geometry, materials, flags. */
function expectVisor(
  label: string,
  head: THREE.Mesh,
  mask: VisorMask,
  fitPositions: Float32Array,
  metresPerUnit: number,
) {
  const face = new THREE.Texture();
  const paint = new THREE.Texture();
  const geometry = buildVisorGeometry(head.geometry, mask, fitPositions, metresPerUnit);
  const faceIndex = geometry.face.index as THREE.BufferAttribute;
  expect(faceIndex.count).toBe(mask.triangles.length * 3);
  expect(geometry.glass.index).toBe(geometry.glass.index);
  const facePos = geometry.face.getAttribute('position');
  const glassPos = geometry.glass.getAttribute('position');
  const normal = geometry.face.getAttribute('normal');
  const faceUv = geometry.face.getAttribute('faceUv');
  expect(facePos.count).toBe(glassPos.count);
  const gap = GLASS_GAP_M / metresPerUnit;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < facePos.count; i += 1) {
    a.fromBufferAttribute(facePos, i);
    b.fromBufferAttribute(glassPos, i);
    n.fromBufferAttribute(normal, i);
    // The glass is the face pushed out along its own normal by the gap, exactly.
    expect(b.distanceTo(a), `${label}: glass vertex ${i} gap`).toBeCloseTo(gap, 6);
    expect(b.sub(a).normalize().dot(n), `${label}: glass vertex ${i} direction`).toBeCloseTo(1, 4);
    // The face's UVs stay on the canvas.
    const u = faceUv.getX(i);
    const v = faceUv.getY(i);
    expect(u, `${label}: faceUv u of vertex ${i}`).toBeGreaterThanOrEqual(-0.2);
    expect(u).toBeLessThanOrEqual(1.2);
    expect(v, `${label}: faceUv v of vertex ${i}`).toBeGreaterThanOrEqual(-0.2);
    expect(v).toBeLessThanOrEqual(1.2);
  }
  // The head's own triangles: every face triangle is a triangle of the head.
  const headIndex = head.geometry.index as THREE.BufferAttribute;
  const headPos = head.geometry.getAttribute('position');
  for (let t = 0; t < 12; t += 1) {
    const source = mask.triangles[t] as number;
    for (let k = 0; k < 3; k += 1) {
      const hv = headIndex.getX(source * 3 + k);
      a.fromBufferAttribute(headPos, hv);
      b.fromBufferAttribute(facePos, faceIndex.getX(t * 3 + k));
      expect(a.distanceTo(b), `${label}: face triangle ${t} is not the head's`).toBeLessThan(1e-6);
    }
  }

  const visor = buildVisorMeshes(head, mask, fitPositions, metresPerUnit, face, paint);
  for (const mesh of [visor.face, visor.glass]) {
    expect(mesh.frustumCulled).toBe(false);
    expect(mesh.visible).toBe(true);
    expect((mesh as THREE.SkinnedMesh).isSkinnedMesh === true).toBe(
      (head as THREE.SkinnedMesh).isSkinnedMesh === true,
    );
    expect(mesh.position.equals(head.position)).toBe(true);
    expect(mesh.scale.equals(head.scale)).toBe(true);
  }
  const faceMaterial = visor.face.material as THREE.ShaderMaterial;
  expect(faceMaterial.side).toBe(THREE.DoubleSide);
  expect(faceMaterial.polygonOffset).toBe(true);
  expect(faceMaterial.uniforms.tFace?.value).toBe(face);
  expect(faceMaterial.uniforms.tPaint?.value).toBe(paint);
  // The shader is given the mask's own rule, so pipeline and shader agree.
  expect(faceMaterial.uniforms.uPaintLuminance?.value).toBe(mask.paint.luminance);
  expect(faceMaterial.uniforms.uPaintChroma?.value).toBe(mask.paint.chroma);
  const glassMaterial = visor.glass.material as THREE.MeshPhysicalMaterial;
  expect(glassMaterial.transparent).toBe(true);
  expect(glassMaterial.depthWrite).toBe(false);
  expect(glassMaterial.roughness).toBeLessThan(0.15);
  // The light sits in front of the paint, at its centre.
  expect(visor.lightAt.z).toBeGreaterThan(mask.measured.paintBounds.max[2] as number);
  expect(visor.lightAt.x).toBeCloseTo(mask.measured.centre[0] as number, 6);
  if ((head as THREE.SkinnedMesh).isSkinnedMesh) {
    const skinned = head as THREE.SkinnedMesh;
    expect((visor.face as THREE.SkinnedMesh).skeleton).toBe(skinned.skeleton);
    expect((visor.glass as THREE.SkinnedMesh).skeleton).toBe(skinned.skeleton);
    expect(geometry.face.getAttribute('skinIndex')).toBeDefined();
    expect(geometry.face.getAttribute('skinWeight')).toBeDefined();
  }
}

describe('the visor materials (KR-57)', () => {
  it('face: double-sided, offset toward the camera, masked to the paint rule', () => {
    const material = createFaceMaterial(new THREE.Texture(), new THREE.Texture());
    expect(material.side).toBe(THREE.DoubleSide);
    expect(material.polygonOffset).toBe(true);
    expect(material.polygonOffsetFactor).toBeLessThan(0);
    expect(material.fragmentShader).toContain('discard');
    expect(material.fragmentShader).toContain('uPaintLuminance');
    expect(material.fragmentShader).toContain('uPaintChroma');
    // Untone-mapped: the canvas's colours are the colours seen.
    expect(material.fragmentShader).not.toContain('tonemapping_fragment');
    expect(material.vertexShader).toContain('skinning_vertex');
  });

  it('glass: transparent, glossy, does not write depth, and is masked to the same paint', () => {
    const material = createGlassMaterial(new THREE.Texture());
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.roughness).toBeLessThan(0.15);
    expect(material.clearcoat).toBe(1);
    expect(material.defines?.USE_UV).toBeDefined();
    expect(typeof material.onBeforeCompile).toBe('function');
  });

  it('is the only way Visor.tsx makes a mesh, and nothing there re-sides, culls or hides it', () => {
    const visor = src('world/characters/Visor.tsx');
    expect(visor).toContain('buildVisorMeshes(');
    expect(visor).toContain('<primitive object={visor.face} />');
    expect(visor).toContain('<primitive object={visor.glass} />');
    // No JSX mesh or material of its own: the builder is the only route.
    expect(visor).not.toMatch(/<mesh[\s>]/);
    expect(visor).not.toMatch(/<(mesh|shader)(Basic|Standard|Physical|Lambert|Phong)?Material/);
    expect(visor).not.toMatch(/new THREE\.(Mesh|Shader)\w*Material/);
    expect(visor).not.toContain('createFaceMaterial(');
    expect(visor).not.toContain('createGlassMaterial(');
    // The three survivors of V5's tests, by name.
    expect(visor).not.toMatch(/\.side\s*=/);
    expect(visor).not.toMatch(/frustumCulled\s*=/);
    expect(visor).not.toMatch(/visible\s*=/);
    expect(visor).not.toMatch(/visible=\{/);
    // KR-55: no early return that removes the face.
    expect(visor).not.toMatch(/return null/);
    // And no panel is left: the head's own triangles are the face.
    expect(src('world/characters/visorFit.ts')).not.toContain('fitHeadSurface');
    expect(src('world/characters/Figure.tsx')).not.toContain('PanelFace');
  });

  it('is fitted from the masks that travel with each model', () => {
    expect(src('world/characters/VirgilRigged.tsx')).toContain('virgilVisorMask');
    const figure = src('world/characters/Figure.tsx');
    expect(figure).toContain('member.model.visor');
    for (const role of ROLES) expect(CAST[role].model.visor.triangles.length).toBeGreaterThan(0);
  });
});

const PAYLOADS: Record<Role, string> = {
  fabricator: fabricator2Base64Payload,
  prover: prover2Base64Payload,
  keeper: keeper2Base64Payload,
};

/**
 * Each character's head, independently of the mask, in the placed frame
 * (metres, feet at the origin). Read off the previews and ray scans of
 * 2026-09-08: the Fabricator's boxy head spans y 1.13–1.51; the Prover's
 * helmet y 1.05–1.50 inside |x| 0.35 (his eye-stalks stand at ±0.5); the
 * Keeper's hood y 0.94–1.49. The Prover's and the Keeper's paint reaches
 * a little under the head's box — the helmet's collar, the hood's chin —
 * and the box is widened by that much, measured, not the mask trusted.
 */
const HEAD: Record<Role, { y0: number; y1: number; halfWidth: number }> = {
  fabricator: { y0: 1.09, y1: 1.53, halfWidth: 0.42 },
  prover: { y0: 0.99, y1: 1.5, halfWidth: 0.41 },
  keeper: { y0: 0.84, y1: 1.49, halfWidth: 0.5 },
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

  it('was read off this payload, not an earlier one', () => {
    expect(visor.source.payloadSha256).toBe(metadata.payload.sha256);
    expect(sha256(PAYLOADS[role])).toBe(metadata.payload.sha256);
    expect(visor.joint).toBeNull();
  });

  it('names only head-front triangles of the model, and enough of them to be a visor', () => {
    expectMask(role, visor, positions, index.array, isHead);
  });

  it('is built on the head’s own triangles with the glass a fixed gap off it', () => {
    expectVisor(role, mesh, visor, positions, scale * positionScale);
  });
});

describe("Virgil's visor", () => {
  it('was read off this payload with the default rule, and names his head joint', () => {
    expect(virgilVisorMask.source.payloadSha256).toBe(virgilRiggedMetadata.payload.sha256);
    expect(virgilVisorMask.joint).toBe('Head');
    expect(virgilVisorMask.paint.overridesDefault).toBe(false);
  });

  it('is his head’s own screen in the head joint, and the glass rides his skeleton', async () => {
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
    const index = mesh.geometry.index as THREE.BufferAttribute;
    expectMask('virgil', virgilVisorMask, positions, index.array, isHead);
    expectVisor('virgil', mesh, virgilVisorMask, positions, virgilRiggedMetadata.runtime.scale);
    // His screen is a dome, not a plate: the paint's z falls from 0.537 at
    // its centre to 0.152 at its edges in joint units (0.6 m each). The
    // mask holds that shape, not a plate's.
    const { min, max } = virgilVisorMask.measured.paintBounds;
    expect((max[2] as number) - (min[2] as number)).toBeGreaterThan(0.25);
    expect(max[2] as number).toBeGreaterThan(0.5);
    // And it is most of his face: wider than the V6 panel's ±0.42.
    expect(max[0] as number).toBeGreaterThan(0.6);
    expect(min[0] as number).toBeLessThan(-0.6);
  });
});
