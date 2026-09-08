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
  type VisorRegion,
} from '../src/world/characters/visorFit.js';
import {
  distanceToSegments,
  surfaceBoundary,
  VISOR_SUBDIVISIONS,
} from '../src/world/characters/visorSmooth.js';
import {
  createGlassMaterial as createPlainGlass,
  GLASS_DIRECT_GAIN,
  GLASS_ENV_FACING,
  PAINT_RIM_METRES,
  REFLECTION_PATCH,
} from '../src/world/glass.js';
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

  // A visor's region is a head's front; a screen's (`fit-screen.mjs`) is a box.
  expect('halfWidth' in mask.region, `${label}: a visor's region`).toBe(true);
  const { halfWidth, y0, y1, zMin } = mask.region as VisorRegion;
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
  // A visor is wider than it is tall, and is not a sliver. The widest is
  // the Prover's band across his dome, measured at 3.16 : 1 off the 512²
  // payload (the 1024² one had a stray dark speck near the helmet's top
  // that stretched the bounds to 2.0 : 1 and put his eyes low).
  expect(faceAspect(mask)).toBeGreaterThan(1);
  expect(faceAspect(mask)).toBeLessThan(3.5);
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
  // **V8.3: the face is the Loop limit surface of the mask's triangles**
  // (`visorSmooth.ts`), so each of them is exactly four to the level.
  const split = 4 ** VISOR_SUBDIVISIONS;
  expect(faceIndex.count).toBe(mask.triangles.length * 3 * split);
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
  // **The silhouette is still the head's own painted edge.** V7's whole
  // reason for existing was that an overlaid cap read as pasted on, and
  // until V8.3 that was held by the face being the head's triangles
  // unchanged. It is now the limit surface of those triangles, so the
  // statement is made where it belongs — on the boundary — and in both
  // directions: every boundary point of what is drawn lies on the
  // selection's own boundary polyline, and every boundary point of the
  // selection lies on what is drawn. Both to a micrometre, which is
  // stronger than the old form, because the old form checked twelve
  // triangles and this checks the whole outline.
  const headIndex = head.geometry.index as THREE.BufferAttribute;
  const headPos = head.geometry.getAttribute('position');
  const control = new Float32Array(headPos.count * 3);
  for (let i = 0; i < headPos.count; i += 1) {
    control[i * 3] = headPos.getX(i);
    control[i * 3 + 1] = headPos.getY(i);
    control[i * 3 + 2] = headPos.getZ(i);
  }
  const controlIndex: number[] = [];
  for (const t of mask.triangles)
    for (let k = 0; k < 3; k += 1) controlIndex.push(headIndex.getX(t * 3 + k));
  const controlEdges = surfaceBoundary(control, controlIndex, metresPerUnit);
  const builtPositions = new Float32Array(facePos.count * 3);
  for (let i = 0; i < facePos.count; i += 1) {
    builtPositions[i * 3] = facePos.getX(i);
    builtPositions[i * 3 + 1] = facePos.getY(i);
    builtPositions[i * 3 + 2] = facePos.getZ(i);
  }
  const builtEdges = surfaceBoundary(builtPositions, faceIndex.array, metresPerUnit);
  expect(controlEdges.length, `${label}: the selection has a boundary`).toBeGreaterThan(20);
  // Exactly twice as many segments per level: each boundary edge is split
  // at its own midpoint, which is what leaves the polyline where it was.
  expect(builtEdges.length).toBe(controlEdges.length * 2 ** VISOR_SUBDIVISIONS);
  const micron = 1e-6 / metresPerUnit;
  for (const [x, y, z, x2, y2, z2] of builtEdges) {
    for (const [px, py, pz] of [
      [x, y, z],
      [x2, y2, z2],
    ] as [number, number, number][]) {
      expect(
        distanceToSegments(px, py, pz, controlEdges) * metresPerUnit,
        `${label}: a drawn boundary point left the selection's outline`,
      ).toBeLessThan(1e-6);
    }
  }
  for (const [x, y, z, x2, y2, z2] of controlEdges) {
    for (const [px, py, pz] of [
      [x, y, z],
      [x2, y2, z2],
    ] as [number, number, number][]) {
      expect(
        distanceToSegments(px, py, pz, builtEdges) * metresPerUnit,
        `${label}: the selection's outline is not all drawn`,
      ).toBeLessThan(1e-6);
    }
  }
  void micron;
  // And what the builder reports about it agrees with what was measured here.
  const report = geometry.smoothing;
  expect(report, `${label}: the smoothing reports what it did`).toBeDefined();
  expect((report as NonNullable<typeof report>).boundaryMovedM).toBeLessThan(1e-6);
  // The head's own facets do not poke through the smoothed face.
  expect((report as NonNullable<typeof report>).penetrationAfterM).toBeLessThan(1e-6);
  expect((report as NonNullable<typeof report>).facetAfterMm).toBeLessThan(
    (report as NonNullable<typeof report>).facetBeforeMm / 3,
  );

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
  /*
   * **The light sits at the paint's centre and BEHIND it** (V9, item 7).
   * From V5 to V8.3 it sat 0.12 m *in front* of the glass, and the glass
   * reflected it as a bright dot between the eyes — fixed to the head, so
   * it travelled with the face and not with the camera, which is what the
   * owner reported: *"there's still a light coloured mark in the middle on
   * the black … Prover as well when you look closely. Fix them all."*
   * V8.3's 2.6× lift of the direct specular made it brighter still. The
   * assertion this replaces said the light was in front; the new one is
   * the property that matters and is the stronger of the two, because a
   * front-facing glass cannot see a light behind it at all.
   */
  expect(visor.lightAt.z).toBeLessThan(mask.measured.paintBounds.max[2] as number);
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

  /**
   * **V8.3, item 1: the glass reflects rather than washes.** The owner's
   * instruction for the console screens was *"make them compleetyley black,
   * reflective, and text sitting slightly under it"*, and in V8.2 the
   * picture's own near-black ink read at luminance 93 of 255 because the
   * glass added eight per cent of a twenty-metre light panel across the
   * whole surface. These hold the shape of the answer: the environment is
   * kept where the glass turns away and cut where it faces you, the room's
   * own lamps are lifted, and the paint mask that stops a visor's glass at
   * the paint's edge still runs first.
   */
  it('glass: the environment is shaped by angle and the direct highlight is lifted', () => {
    expect(GLASS_ENV_FACING).toBeGreaterThan(0);
    expect(GLASS_ENV_FACING).toBeLessThan(0.1);
    expect(GLASS_DIRECT_GAIN).toBeGreaterThan(1);
    // The patch keeps everything at grazing and only a sixteenth facing.
    expect(REFLECTION_PATCH).toContain('radiance *= envKeep');
    expect(REFLECTION_PATCH).toContain('clearcoatRadiance *= envKeep');
    expect(REFLECTION_PATCH).toContain('mix( uEnvFacing, 1.0, grazing )');

    for (const material of [createPlainGlass(), createGlassMaterial(new THREE.Texture())]) {
      const shader = {
        uniforms: {} as Record<string, { value: unknown }>,
        vertexShader: '',
        fragmentShader: [
          '#include <clipping_planes_fragment>',
          '#include <lights_fragment_begin>',
          '#include <lights_fragment_maps>',
          '#include <lights_fragment_end>',
        ].join('\n'),
      };
      (material.onBeforeCompile as (s: typeof shader) => void)(shader);
      expect(shader.uniforms.uEnvFacing?.value).toBe(GLASS_ENV_FACING);
      expect(shader.uniforms.uDirectGain?.value).toBe(GLASS_DIRECT_GAIN);
      const out = shader.fragmentShader;
      // The direct specular is lifted after the lamps have been summed, and
      // the environment shaped after the maps have been sampled: both after
      // the chunk that defines what they touch, never before it.
      expect(out.indexOf('reflectedLight.directSpecular *= uDirectGain')).toBeGreaterThan(
        out.indexOf('#include <lights_fragment_begin>'),
      );
      expect(out.indexOf('radiance *= envKeep')).toBeGreaterThan(
        out.indexOf('#include <lights_fragment_maps>'),
      );
      expect(out.indexOf('radiance *= envKeep')).toBeLessThan(
        out.indexOf('#include <lights_fragment_end>'),
      );
    }
    // And the masked glass still discards the unpainted pixels first, so a
    // visor's glass still stops exactly where the paint stops.
    const masked = {
      uniforms: {} as Record<string, { value: unknown }>,
      vertexShader: ['#include <begin_vertex>', '#include <project_vertex>'].join('\n'),
      fragmentShader: [
        '#include <clipping_planes_fragment>',
        '#include <lights_fragment_begin>',
        '#include <lights_fragment_maps>',
        '#include <lights_fragment_end>',
      ].join('\n'),
    };
    const material = createGlassMaterial(new THREE.Texture());
    (material.onBeforeCompile as (s: typeof masked) => void)(masked);
    expect(masked.fragmentShader).toContain('discard');
    expect(masked.fragmentShader.indexOf('discard')).toBeLessThan(
      masked.fragmentShader.indexOf('radiance *= envKeep'),
    );
    /*
     * **V9, item 7: the discard is confined to the rim band**, so the
     * paint decides the silhouette and nothing else. The glass must carry
     * the same per-vertex rim as the face — a glass with holes the face
     * does not have would be the same defect in the layer in front of it.
     */
    expect(masked.fragmentShader).toContain('uniform float uRimMetres');
    expect(masked.fragmentShader).toContain('varying float vRim');
    expect(masked.fragmentShader).toMatch(/if \(vRim < uRimMetres\) \{[\s\S]*discard;[\s\S]*\}/);
    expect(masked.vertexShader).toContain('attribute float rim');
    expect(masked.vertexShader).toContain('vRim = rim;');
    // The band is the visor's, and it is a real length, not zero.
    expect(masked.uniforms.uRimMetres?.value).toBe(0);
    const banded = {
      uniforms: {} as Record<string, { value: unknown }>,
      vertexShader: '#include <begin_vertex>',
      fragmentShader: [
        '#include <clipping_planes_fragment>',
        '#include <lights_fragment_begin>',
        '#include <lights_fragment_maps>',
      ].join('\n'),
    };
    const visorGlass = createGlassMaterial(new THREE.Texture(), VISOR_PAINT, PAINT_RIM_METRES);
    (visorGlass.onBeforeCompile as (s: typeof banded) => void)(banded);
    expect(banded.uniforms.uRimMetres?.value).toBe(PAINT_RIM_METRES);
    expect(PAINT_RIM_METRES).toBeGreaterThan(0.005);
    expect(PAINT_RIM_METRES).toBeLessThan(0.03);
    // The two programs must not share a cache entry: one discards, one does not.
    expect(createPlainGlass().customProgramCacheKey?.()).not.toBe(
      material.customProgramCacheKey?.(),
    );
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
    // V8.3: the level of subdivision comes from the tier, in one place.
    expect(visor).toContain('subdivisions: visorSubdivisions(tier)');
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

  /*
   * **V9, item 7: the rim.** The paint rule discards where the model's own
   * paint is not the visor's, and it was doing that everywhere inside the
   * visor as well as at its edge — which is the light-coloured mark the
   * owner reported on all four. It is now confined to a band along the
   * mask's own boundary, and the band is measured per vertex, in metres,
   * against that boundary. Held here: the attribute exists on both meshes,
   * it is zero on the outline and grows inward, and it reaches well past
   * the band, so there is interior for the fill to cover.
   */
  it('carries a per-vertex rim distance so the paint decides only the edge', () => {
    const built = buildVisorMeshes(
      mesh,
      visor,
      positions,
      scale * positionScale,
      new THREE.Texture(),
      new THREE.Texture(),
    );
    for (const [name, part] of [
      ['face', built.face],
      ['glass', built.glass],
    ] as const) {
      const rim = part.geometry.getAttribute('rim');
      expect(rim, `${role}: the ${name} has no rim attribute`).toBeTruthy();
      expect(rim.itemSize).toBe(1);
      expect(rim.count).toBe(part.geometry.getAttribute('position').count);
      let smallest = Number.POSITIVE_INFINITY;
      let largest = 0;
      for (let i = 0; i < rim.count; i += 1) {
        const value = rim.getX(i);
        expect(value, `${role}: a negative rim distance`).toBeGreaterThanOrEqual(0);
        smallest = Math.min(smallest, value);
        largest = Math.max(largest, value);
      }
      // Zero on the outline, and the interior reaches far past the band.
      expect(smallest, `${role}: nothing sits on the outline`).toBeLessThan(1e-6);
      expect(largest, `${role}: the visor has no interior past the rim band`).toBeGreaterThan(
        PAINT_RIM_METRES * 2,
      );
    }
    // The band the shader is given is the visor's, not a screen's zero.
    const material = built.face.material as THREE.ShaderMaterial;
    expect(material.uniforms.uRimMetres?.value).toBe(PAINT_RIM_METRES);
    const glass = built.glass.material as THREE.MeshPhysicalMaterial;
    const captured = {
      uniforms: {} as Record<string, { value: unknown }>,
      vertexShader: '#include <begin_vertex>',
      fragmentShader: '#include <clipping_planes_fragment>',
    };
    (glass.onBeforeCompile as (shader: typeof captured) => void)(captured);
    expect(captured.uniforms.uRimMetres?.value).toBe(PAINT_RIM_METRES);
  });

  /*
   * **V9, item 7's second cause.** The face's own point light sat 0.12 m
   * *in front of* the glass, at the visor's own centre, and the glass
   * reflected it as a bright dot between the eyes — fixed to the head, so
   * it moved with the face and not with the camera, which is exactly what
   * the owner reported from his own machine: *"The marks stay in the same
   * place I think."* V8.3 made it worse by lifting the direct specular
   * 2.6× for every light, that one included. The light is now behind the
   * display, so a front-facing glass cannot see it at all.
   */
  it('keeps the face’s own light behind the glass it would otherwise reflect', () => {
    const built = buildVisorMeshes(
      mesh,
      visor,
      positions,
      scale * positionScale,
      new THREE.Texture(),
      new THREE.Texture(),
    );
    const front = visor.measured.paintBounds.max[2] as number;
    expect(built.lightAt.z, `${role}: the face light is in front of its own glass`).toBeLessThan(
      front,
    );
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
