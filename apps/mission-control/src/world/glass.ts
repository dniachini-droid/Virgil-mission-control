import * as THREE from 'three';
import { roundedRectSurface } from './screens/screenOutline.js';

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
 *
 * **V8.3: a reflection, not a wash.** The owner's instruction for the
 * console screens was *"make them compleetyley black, reflective, and text
 * sitting slightly under it"* (§0.9), and in V8.2 they came out grey-brown:
 * measured off the committed artifact, the picture's own near-black ink
 * (`draw.ts`, `#070a18`) read at **luminance 93 of 255** on the
 * Fabricator's screen and 93–99 on Virgil's three slabs. The arithmetic
 * says exactly where that came from. A dielectric reflects about 4 % of
 * what it faces at normal incidence, the clearcoat adds another 4 %, and
 * what these screens face is `LightingRig.tsx`'s **20 × 6 m warm panel at
 * z = +16 — directly behind the camera**. Eight per cent of a large soft
 * warm source, added, is a full-screen milky grey. V8.2 found the same
 * thing from the other end when it raised the environment and had to
 * revert; it left the diagnosis in the run record and the defect in place.
 *
 * It is not solved by turning the environment down, which would take the
 * glass's whole reason for existing with it. It is solved by **shaping the
 * environment's contribution by angle**: the indirect specular is scaled by
 * `GLASS_ENV_FACING` where the glass faces you and left alone where it
 * turns away, so a convex screen is near-black across its middle and keeps
 * its bright rim where the curve rolls off. The **direct** specular — the
 * room's own lamps, which are small — is not damped but lifted, so what is
 * left is a hard highlight that travels across the CRT profile as the
 * camera moves. That is the picture the owner asked for: a reflection of
 * something, not a veil over everything.
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

/**
 * How much of the reflected environment survives where the glass faces the
 * camera. One in sixteen: measured against the frames, this is what takes
 * the display's own ink back to near-black while leaving the rim.
 */
export const GLASS_ENV_FACING = 0.06;

/**
 * How much the direct specular is lifted. The room's lamps are small, so
 * their reflection in the glass is a highlight rather than a wash, and it
 * has to carry the "reflective" reading now that the environment does not.
 */
export const GLASS_DIRECT_GAIN = 2.6;

/**
 * The patch that makes the glass reflect rather than wash. Inserted into
 * three.js's own physical shader at two named points:
 *
 *  - after `<lights_fragment_begin>`, where `reflectedLight.directSpecular`
 *    holds the room's lamps and nothing else — lifted;
 *  - after `<lights_fragment_maps>`, where `radiance` and
 *    `clearcoatRadiance` hold the reflected environment before the BRDF
 *    weighs them — scaled by an angle, so a surface facing the camera keeps
 *    a sixteenth of it and one turning away keeps all of it.
 *
 * Fresnel already does some of this and is not enough: at normal incidence
 * Schlick still passes the dielectric's own 4 %, and 4 % of a twenty-metre
 * light panel is the grey the owner is looking at.
 */
export const REFLECTION_PATCH = /* glsl */ `
  float facing = saturate( dot( geometryNormal, geometryViewDir ) );
  float grazing = pow( 1.0 - facing, 5.0 );
  float envKeep = mix( uEnvFacing, 1.0, grazing );
  radiance *= envKeep;
  clearcoatRadiance *= envKeep;
`;

function reflectionUniforms(shader: {
  uniforms: Record<string, { value: unknown }>;
  fragmentShader: string;
}) {
  shader.uniforms.uEnvFacing = { value: GLASS_ENV_FACING };
  shader.uniforms.uDirectGain = { value: GLASS_DIRECT_GAIN };
  shader.fragmentShader = `uniform float uEnvFacing;\nuniform float uDirectGain;\n${shader.fragmentShader
    .replace(
      '#include <lights_fragment_begin>',
      '#include <lights_fragment_begin>\n  reflectedLight.directSpecular *= uDirectGain;',
    )
    .replace(
      '#include <lights_fragment_maps>',
      `#include <lights_fragment_maps>\n${REFLECTION_PATCH}`,
    )}`;
}

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
  if (mask) material.defines = { USE_UV: '' };
  material.onBeforeCompile = (shader) => {
    if (mask) {
      shader.uniforms.tPaint = { value: mask.paint };
      shader.uniforms.uPaintLuminance = { value: mask.rule.luminance };
      shader.uniforms.uPaintChroma = { value: mask.rule.chroma };
      shader.fragmentShader = `uniform sampler2D tPaint;\nuniform float uPaintLuminance;\nuniform float uPaintChroma;\n${shader.fragmentShader.replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>\n${PAINT_TEST.replace('PAINT_UV', 'vUv')}`,
      )}`;
    }
    reflectionUniforms(shader);
  };
  material.customProgramCacheKey = () => (mask ? 'glass-masked-v8-3' : 'glass-v8-3');
  return material;
}

/**
 * A convex sheet of glass over a `width` × `height` opening: a grid whose
 * z rises to `bulge` at the centre and falls to zero at the edges with a
 * CRT's profile — flat-ish in the middle, curving away at the sides —
 * z = bulge · (1 − u⁴)(1 − v⁴). The owner: "a slight curve outwards. That
 * makes it look cartoony." Normals are computed, so the highlight bends
 * with the curve.
 *
 * **V8.2: the rounded variant is the one the screens use.** Virgil's slabs
 * have a rounded opening in their front plate and had rectangular glass
 * over it, whose square corners stood about 17 mm out over the curve; a
 * console's screen is now drawn to the model's own rounded opening
 * (`screens/screenOutline.ts`) and its glass has to follow the same
 * outline, because a rounded picture behind rectangular glass would be
 * worse than a square one. `createRoundedConvexGlassGeometry` takes the
 * corner radius and carries the same profile radially, so both kinds of
 * screen keep one glass.
 */
export function createRoundedConvexGlassGeometry(
  width: number,
  height: number,
  radius: number,
  bulge: number,
  segments = 160,
  rings = 8,
): THREE.BufferGeometry {
  const surface = roundedRectSurface(
    { centreU: 0, centreV: 0, halfWidth: width / 2, halfHeight: height / 2, radius },
    rings,
    segments,
    // The same law as the rectangular profile, radially: flat-ish in the
    // middle, curving away at the edge, and exactly zero at the edge.
    (rho) => bulge * (1 - rho ** 4),
  );
  const count = surface.u.length;
  const position = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  for (let i = 0; i < count; i += 1) {
    position[i * 3] = surface.u[i] as number;
    position[i * 3 + 1] = surface.v[i] as number;
    position[i * 3 + 2] = surface.h[i] as number;
    uv[i * 2] = (surface.u[i] as number) / width + 0.5;
    uv[i * 2 + 1] = (surface.v[i] as number) / height + 0.5;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setIndex(surface.index);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

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
