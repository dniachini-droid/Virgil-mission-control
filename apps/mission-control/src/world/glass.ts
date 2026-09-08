import * as THREE from 'three';

/**
 * The one glass in the set, shared by the visors (`characters/visorFit.ts`)
 * and the screens (`screens/ScreenBank.tsx`), so that they read as one
 * system rather than two attempts — and so that the consoles' own screens,
 * queued for the pass after V7 (`docs/process/PHASE_1_STYLISED_SPEC.md`
 * §0.9), get the same material by importing it rather than by copying it.
 *
 * V7 (§0.3): **everything matte except the screens and the visors.** In a
 * matte world the only glossy things draw the eye, and the screens are the
 * information. The owner: "Shiny and a bit of light reflecting off it."
 *
 * What it is: a clear-coated, nearly black physical material drawn
 * **additively**, so what it contributes is the reflection of the lights
 * and the environment and nothing else — a highlight that slides across
 * the curve as the camera moves, a rim where the glass turns away — and
 * what sits under it (a face, a display) is not dimmed. It writes no
 * depth, so the thing under it still occludes correctly against the
 * world. Optionally masked to a texture's paint (`PaintMask`), which is
 * how a visor's glass stops at the paint's edge.
 */

export interface PaintRule {
  luminance: number;
  chroma: number;
}

export interface PaintMask {
  /** The texture whose near-black, neutral paint the glass is confined to. */
  paint: THREE.Texture;
  rule: PaintRule;
}

/** The GLSL that keeps only the painted pixels; `PAINT_UV` is the UV to sample at. */
export const PAINT_TEST = /* glsl */ `
  vec3 paint = texture2D(tPaint, PAINT_UV).rgb;
  float paintLuminance = dot(paint, vec3(0.2126, 0.7152, 0.0722));
  float paintChroma = max(max(paint.r, paint.g), paint.b) - min(min(paint.r, paint.g), paint.b);
  if (paintLuminance >= uPaintLuminance || paintChroma >= uPaintChroma) discard;
`;

export function createGlassMaterial(mask?: PaintMask): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color: '#000000',
    roughness: 0.07,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.2,
    specularIntensity: 1,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.FrontSide,
    name: mask ? 'glass-masked' : 'glass',
  });
  if (mask) {
    material.defines = { USE_UV: '' };
    material.onBeforeCompile = (shader) => {
      shader.uniforms.tPaint = { value: mask.paint };
      shader.uniforms.uPaintLuminance = { value: mask.rule.luminance };
      shader.uniforms.uPaintChroma = { value: mask.rule.chroma };
      shader.fragmentShader = `uniform sampler2D tPaint;\nuniform float uPaintLuminance;\nuniform float uPaintChroma;\n${shader.fragmentShader.replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>\n${PAINT_TEST.replace('PAINT_UV', 'vUv')}`,
      )}`;
    };
    material.customProgramCacheKey = () => 'glass-masked-v7';
  }
  return material;
}

/**
 * A convex sheet of glass over a `width` × `height` opening: a grid whose
 * z rises to `bulge` at the centre and falls to zero at the edges with a
 * CRT's profile — flat-ish in the middle, curving away at the sides —
 * z = bulge · (1 − u⁴)(1 − v⁴). The owner: "a slight curve outwards. That
 * makes it look cartoony." Normals are computed, so the highlight bends
 * with the curve.
 */
export function createConvexGlassGeometry(
  width: number,
  height: number,
  bulge: number,
  segments = 24,
): THREE.BufferGeometry {
  const cols = segments;
  const rows = Math.max(8, Math.round((segments * height) / width));
  const count = (rows + 1) * (cols + 1);
  const position = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  for (let r = 0; r <= rows; r += 1) {
    const v = r / rows;
    const y = (v - 0.5) * height;
    const vv = (v - 0.5) * 2;
    for (let c = 0; c <= cols; c += 1) {
      const u = c / cols;
      const x = (u - 0.5) * width;
      const uu = (u - 0.5) * 2;
      const i = r * (cols + 1) + c;
      position[i * 3] = x;
      position[i * 3 + 1] = y;
      position[i * 3 + 2] = bulge * (1 - uu ** 4) * (1 - vv ** 4);
      uv[i * 2] = u;
      uv[i * 2 + 1] = v;
    }
  }
  const index: number[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const i = r * (cols + 1) + c;
      index.push(i, i + 1, i + cols + 1, i + 1, i + cols + 2, i + cols + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
