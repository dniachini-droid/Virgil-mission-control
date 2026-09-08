import * as THREE from 'three';
import { createGlassMaterial as createGlass, PAINT_TEST, type PaintRule } from '../glass.js';
import {
  buildFlatScreen,
  type FlatScreen,
  screenPlan,
  screenUvBounds,
} from '../screens/screenPlane.js';

/**
 * Fits a face to a head's own geometry.
 *
 * **V7: the face is drawn on the head's own triangles.** The owner, of V6:
 * "you can kind of see that his visor underneath is like a different colour
 * black and looks like it's kinda pasted on … I really want us to map the
 * entire visor and have the face … almost perfectly mapped to where the
 * visor starts and ends … I wanted it to actually wrap around." V4 to V6
 * fitted a separate panel over the head — a grid ray-cast onto the front
 * triangles and lifted a few millimetres — and inset it to clear a brow
 * groove; that inset is exactly what read as pasted on.
 *
 * So there is no panel. `asset-pipeline/fit-visor.mjs` reads each model's
 * own base-colour texture, finds the triangles that carry the painted
 * visor (near-black, neutral paint; the rule is `VISOR_PAINT`), and
 * records them as a `VisorMask` beside the payload. `buildVisorMeshes`
 * copies **those triangles** out of the head's geometry, with their skin
 * weights if the head is skinned, and gives them two materials:
 *
 *  - the **face**: a shader that samples the model's own paint at each
 *    pixel and keeps only the painted ones, drawing the live face canvas
 *    there — so the face starts and ends where the paint does, by
 *    construction, and wraps because it *is* the head's surface. It is
 *    coplanar with the head and wins by polygon offset;
 *  - the **glass**: the same triangles pushed `GLASS_GAP_M` out along their
 *    normals, a glossy transparent physical material masked to the same
 *    paint, so the eyes sit under a layer of glass and a highlight travels
 *    across it as the camera moves. The owner: "have the eyes underneath
 *    the layer of the glass."
 *
 * For the rigged Virgil both are `SkinnedMesh`es bound to his skeleton, so
 * they deform exactly with his head through every clip and there is no
 * residual to hide. `test/visor.test.ts` builds each visor exactly as the
 * set does and checks the mask against the geometry, the glass against
 * the face, and the flags a culled or hidden face depends on (KR-57).
 *
 * All four heads use it — Virgil first, by the owner's instruction, then
 * the three figures once his was seen to work. The pipeline records, per
 * head, how ragged the paint's edge is.
 *
 * **V8: the consoles' screens use the same builder** (`screens/ConsoleScreen.tsx`,
 * `asset-pipeline/fit-screen.mjs`, §0.10.2). A screen mask names the
 * console's own screen triangles with a rule that keeps every pixel, the
 * glass stands a little further off (`gap`), and the face material
 * carries the CRT power uniforms (`crt.ts`) a screen turns on and off
 * with — at their identity for a visor. One face, one glass, two hosts.
 *
 * Everything in this file is pure three.js and runs without a renderer.
 */

/**
 * The default paint rule, on linear colour: near-black and neutral.
 * `fit-visor.mjs` starts from these numbers, may relax them for one head
 * whose paint needs it, and records the rule it used in the mask; the
 * shader is given the mask's rule, never this constant, so the two agree.
 */
export const VISOR_PAINT = { luminance: 0.045, chroma: 0.03 } as const;

export type { PaintRule };

/** How far the glass stands off the face, in metres. */
export const GLASS_GAP_M = 0.006;

/** The region `fit-visor.mjs` looked in: a head's front. */
export interface VisorRegion {
  halfWidth: number;
  y0: number;
  y1: number;
  zMin: number;
}
/** The region `fit-screen.mjs` looked in: a box holding a console's screen. */
export interface ScreenRegion {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

/** What `fit-visor.mjs` writes — and, in the same shape, `fit-screen.mjs`. */
export interface VisorMask {
  source: { asset: string; payloadSha256: string };
  frame: string;
  joint: string | null;
  /** `screen` for a console's screen; absent for a visor. */
  kind?: string;
  paint: PaintRule & { space: string; samplesPerTriangle: number; overridesDefault: boolean };
  region: VisorRegion | ScreenRegion;
  measured: {
    trianglesConsidered: number;
    trianglesPainted: number;
    trianglesWhollyPainted: number;
    trianglesPartlyPainted: number;
    triangleBounds: { min: number[]; max: number[] };
    paintBounds: { min: number[]; max: number[] };
    centre: number[];
    /** A screen's area and mean normal (`fit-screen.mjs`); absent for a visor. */
    areaSquareMetres?: number;
    meanNormal?: number[];
  };
  /** Triangle indices into the head geometry's index buffer (triangle n is indices 3n..3n+2). */
  triangles: number[];
}

export interface VisorGeometry {
  face: THREE.BufferGeometry;
  glass: THREE.BufferGeometry;
  /** What was built, for a console's screen: its outline, lift and feather. */
  screen?: FlatScreen['plan'];
}

/**
 * The visor's geometry, copied out of the head's own. `source` is the head
 * mesh's geometry in the frame it is rendered in; `fitPositions` are the
 * same vertices, in the mask's frame, used only for the face's planar UVs
 * (`faceUv`: the paint's bounds mapped to the canvas); `metresPerUnit`
 * converts the glass gap into the source's units.
 */
export function buildVisorGeometry(
  source: THREE.BufferGeometry,
  mask: VisorMask,
  fitPositions: ArrayLike<number>,
  metresPerUnit: number,
  gapMetres = GLASS_GAP_M,
  flat: { toSource: THREE.Matrix4 } | null = null,
): VisorGeometry {
  // **A console's screen is drawn flat** (`screens/screenPlane.ts`): the
  // selection is still the model's, but the surface is a plane fitted to
  // it and one rectangle in that plane, because a screen that follows a
  // Meshy console's lumps reads as crooked and the owner said so. A
  // visor is never flattened: a face should follow the skull.
  if (flat) return buildFlatVisorGeometry(source, mask, fitPositions, gapMetres, flat.toSource);
  const index = source.index;
  if (!index) throw new Error('visor: the head geometry has no index');
  const position = source.getAttribute('position');
  const normal = source.getAttribute('normal');
  const uv = source.getAttribute('uv');
  if (!position || !normal || !uv)
    throw new Error('visor: the head geometry lacks position, normal or uv');
  const skinIndex = source.getAttribute('skinIndex');
  const skinWeight = source.getAttribute('skinWeight');

  // Unique vertices of the mask's triangles, remapped to a compact range.
  const remap = new Map<number, number>();
  const order: number[] = [];
  const faceIndex: number[] = [];
  for (const t of mask.triangles) {
    for (let k = 0; k < 3; k += 1) {
      const v = index.getX(t * 3 + k);
      let mapped = remap.get(v);
      if (mapped === undefined) {
        mapped = order.length;
        remap.set(v, mapped);
        order.push(v);
      }
      faceIndex.push(mapped);
    }
  }
  const count = order.length;
  const positions = new Float32Array(count * 3);
  const glassPositions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const faceUv = new Float32Array(count * 2);
  const joints = skinIndex ? new Uint16Array(count * 4) : null;
  const weights = skinWeight ? new Float32Array(count * 4) : null;
  const { min, max } = mask.measured.paintBounds;
  const width = (max[0] as number) - (min[0] as number);
  const height = (max[1] as number) - (min[1] as number);
  const gap = gapMetres / metresPerUnit;
  const n = new THREE.Vector3();
  for (let i = 0; i < count; i += 1) {
    const v = order[i] as number;
    n.set(normal.getX(v), normal.getY(v), normal.getZ(v)).normalize();
    const x = position.getX(v);
    const y = position.getY(v);
    const z = position.getZ(v);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    glassPositions[i * 3] = x + n.x * gap;
    glassPositions[i * 3 + 1] = y + n.y * gap;
    glassPositions[i * 3 + 2] = z + n.z * gap;
    normals[i * 3] = n.x;
    normals[i * 3 + 1] = n.y;
    normals[i * 3 + 2] = n.z;
    uvs[i * 2] = uv.getX(v);
    uvs[i * 2 + 1] = uv.getY(v);
    // The canvas over the paint's own extent; the canvas's top at the paint's top.
    faceUv[i * 2] = ((fitPositions[v * 3] as number) - (min[0] as number)) / width;
    faceUv[i * 2 + 1] = ((fitPositions[v * 3 + 1] as number) - (min[1] as number)) / height;
    if (joints && skinIndex) {
      joints[i * 4] = skinIndex.getX(v);
      joints[i * 4 + 1] = skinIndex.getY(v);
      joints[i * 4 + 2] = skinIndex.getZ(v);
      joints[i * 4 + 3] = skinIndex.getW(v);
    }
    if (weights && skinWeight) {
      weights[i * 4] = skinWeight.getX(v);
      weights[i * 4 + 1] = skinWeight.getY(v);
      weights[i * 4 + 2] = skinWeight.getZ(v);
      weights[i * 4 + 3] = skinWeight.getW(v);
    }
  }
  const make = (pos: Float32Array) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    g.setAttribute('faceUv', new THREE.BufferAttribute(faceUv, 2));
    if (joints) g.setAttribute('skinIndex', new THREE.BufferAttribute(joints, 4));
    if (weights) g.setAttribute('skinWeight', new THREE.BufferAttribute(weights, 4));
    g.setIndex(faceIndex);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  };
  return { face: make(positions), glass: make(glassPositions) };
}

/**
 * The flat variant, for a console's screen: the plane `screenPlane.ts`
 * fits to the model's own screen triangles, one rectangle in it, and the
 * convex glass Virgil's slabs use in front of it. `fitPositions` are the
 * selection's vertices in the mask's frame — metres, base at the origin —
 * which is the frame the fit and the rectangle are computed in; the
 * geometry is returned in the source's own units, as the lumpy variant
 * is, so the two are interchangeable under the same mesh transform.
 */
function buildFlatVisorGeometry(
  source: THREE.BufferGeometry,
  mask: VisorMask,
  fitPositions: ArrayLike<number>,
  gapMetres: number,
  toSource: THREE.Matrix4,
): VisorGeometry {
  const index = source.index;
  const uv = source.getAttribute('uv');
  if (!index || !uv) throw new Error('screen: the console geometry lacks an index or uv');
  const plan = screenPlan(mask, fitPositions, index.array);
  const flat = buildFlatScreen(
    plan.plane,
    plan.outline,
    plan.lift,
    gapMetres,
    screenUvBounds(mask, uv, index.array),
  );
  // The fit is in the mask's frame — metres, base at the origin. The mesh
  // these go beside carries the model's own scale and base lift, so that
  // is divided back out here rather than assumed to be identity.
  flat.face.applyMatrix4(toSource);
  flat.glass.applyMatrix4(toSource);
  flat.face.computeVertexNormals();
  flat.glass.computeVertexNormals();
  flat.face.computeBoundingBox();
  flat.face.computeBoundingSphere();
  flat.glass.computeBoundingBox();
  flat.glass.computeBoundingSphere();
  return { face: flat.face, glass: flat.glass, screen: flat.plan };
}

const FACE_VERTEX = /* glsl */ `
  #include <common>
  #include <skinning_pars_vertex>
  attribute vec2 faceUv;
  varying vec2 vUv;
  varying vec2 vFaceUv;
  void main() {
    vUv = uv;
    vFaceUv = faceUv;
    #include <skinbase_vertex>
    #include <begin_vertex>
    #include <skinning_vertex>
    #include <project_vertex>
  }
`;

const FACE_FRAGMENT = /* glsl */ `
  uniform sampler2D tFace;
  uniform sampler2D tPaint;
  uniform float uPaintLuminance;
  uniform float uPaintChroma;
  // The CRT (screens/crt.ts): the image's scale about its centre, its
  // brightness, an added flash, and the afterglow dot. Identity for a visor.
  uniform vec2 uScale;
  uniform float uPower;
  uniform float uFlash;
  uniform float uGlow;
  uniform float uAspect;
  // The drawn outline (screens/screenOutline.ts): half extents, corner
  // radius and feather, in metres. All zero for a visor, whose edge is the
  // head's own paint and needs no mask.
  uniform vec4 uOutline;
  varying vec2 vUv;
  varying vec2 vFaceUv;
  void main() {
    ${PAINT_TEST.replace('PAINT_UV', 'vUv')}
    vec2 c = vFaceUv - 0.5;
    vec2 q = c / max(uScale, vec2(0.0005));
    float inside = step(abs(q.x), 0.5) * step(abs(q.y), 0.5);
    vec3 image = texture2D(tFace, q + 0.5).rgb * inside;
    // The same light in a thinner band is brighter: the collapsing line glows.
    float squeeze = min(1.0 / max(uScale.x * uScale.y, 0.04), 5.0);
    vec3 colour = image * uPower * squeeze + uFlash * inside * vec3(0.92, 0.96, 1.0);
    float d = length(vec2(c.x * uAspect, c.y));
    colour += uGlow * vec3(0.85, 0.95, 1.0) * smoothstep(0.05, 0.0, d);
    // The picture's own edge, feathered: the outline is a mask taken from
    // 23-41 coarse triangles, and its arcs would alias against the dark
    // recess behind them. Measured on the outline itself, not on the CRT's
    // scaled image, so the physical edge does not move as a screen wakes.
    float alpha = 1.0;
    if (uOutline.w > 0.0) {
      vec2 q2 = (vFaceUv - 0.5) * vec2(2.0 * uOutline.x, 2.0 * uOutline.y);
      vec2 e = abs(q2) - (vec2(uOutline.x, uOutline.y) - uOutline.z);
      float sd = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0) - uOutline.z;
      alpha = 1.0 - smoothstep(-uOutline.w, 0.0, sd);
    }
    gl_FragColor = vec4(colour, alpha);
    #include <colorspace_fragment>
  }
`;

/**
 * The face's material: the live canvas, shown only where the head's own
 * paint is the visor's; unlit and untone-mapped, so the canvas's colours
 * are the colours seen; double-sided, because a culled visor is a face
 * that is not there; and offset toward the camera, because it shares its
 * triangles with the head underneath.
 */
export function createFaceMaterial(
  face: THREE.Texture,
  paint: THREE.Texture,
  rule: PaintRule = VISOR_PAINT,
  aspect = 1,
  outline?: { halfWidth: number; halfHeight: number; radius: number; feather: number },
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tFace: { value: face },
      tPaint: { value: paint },
      uPaintLuminance: { value: rule.luminance },
      uPaintChroma: { value: rule.chroma },
      uScale: { value: new THREE.Vector2(1, 1) },
      uPower: { value: 1 },
      uFlash: { value: 0 },
      uGlow: { value: 0 },
      uAspect: { value: aspect },
      uOutline: {
        value: outline
          ? new THREE.Vector4(
              outline.halfWidth,
              outline.halfHeight,
              outline.radius,
              outline.feather,
            )
          : new THREE.Vector4(0, 0, 0, 0),
      },
    },
    vertexShader: FACE_VERTEX,
    fragmentShader: FACE_FRAGMENT,
    side: THREE.DoubleSide,
    // A feathered edge needs the alpha it writes to be blended. A visor's
    // does not, and stays opaque, so nothing about the four heads changes.
    transparent: outline !== undefined,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    name: outline ? 'screen-face' : 'visor-face',
  });
}

/**
 * The visor's glass: the set's one glass (`../glass.ts`), masked to the
 * same paint as the face, so it stops where the paint stops.
 */
export function createGlassMaterial(
  paint: THREE.Texture,
  rule: PaintRule = VISOR_PAINT,
): THREE.MeshPhysicalMaterial {
  return createGlass({ paint, rule });
}

export interface VisorMeshes {
  face: THREE.Mesh;
  glass: THREE.Mesh;
  /** Where the face's light goes, in the mask's frame: the paint's centre, a little in front. */
  lightAt: THREE.Vector3;
}

/**
 * The whole visor, and the only way `Visor.tsx` may make one (KR-57):
 * two meshes sharing the head's triangles and, if the head is skinned,
 * its skeleton and bind matrix; both uncullable — they ride a joint whose
 * bounds three.js does not track — and visible; the face double-sided.
 * The meshes carry the head mesh's own local transform so they can be
 * placed beside it under the same parent.
 */
export function buildVisorMeshes(
  head: THREE.Mesh,
  mask: VisorMask,
  fitPositions: ArrayLike<number>,
  metresPerUnit: number,
  faceTexture: THREE.Texture,
  paint: THREE.Texture,
  options: { gapMetres?: number; flat?: boolean } = {},
): VisorMeshes {
  const gapMetres = options.gapMetres ?? GLASS_GAP_M;
  head.updateMatrix();
  const geometry = buildVisorGeometry(
    head.geometry,
    mask,
    fitPositions,
    metresPerUnit,
    gapMetres,
    options.flat ? { toSource: head.matrix.clone().invert() } : null,
  );
  const outline = geometry.screen
    ? {
        halfWidth: geometry.screen.width / 2,
        halfHeight: geometry.screen.height / 2,
        radius: geometry.screen.radius,
        feather: geometry.screen.feather,
      }
    : undefined;
  const faceMaterial = createFaceMaterial(
    faceTexture,
    paint,
    mask.paint,
    // A console screen's canvas is drawn at the outline's own aspect
    // (`screenPlane.ts`), so the afterglow dot is round on it too.
    geometry.screen ? geometry.screen.width / geometry.screen.height : faceAspect(mask),
    outline,
  );
  const glassMaterial = createGlassMaterial(paint, mask.paint);
  const skinned = (head as THREE.SkinnedMesh).isSkinnedMesh ? (head as THREE.SkinnedMesh) : null;
  const make = (g: THREE.BufferGeometry, m: THREE.Material, name: string) => {
    const mesh = skinned ? new THREE.SkinnedMesh(g, m) : new THREE.Mesh(g, m);
    if (skinned) (mesh as THREE.SkinnedMesh).bind(skinned.skeleton, skinned.bindMatrix);
    mesh.position.copy(head.position);
    mesh.quaternion.copy(head.quaternion);
    mesh.scale.copy(head.scale);
    mesh.frustumCulled = false;
    mesh.visible = true;
    mesh.name = name;
    return mesh;
  };
  const face = make(geometry.face, faceMaterial, 'visor-face');
  const glass = make(geometry.glass, glassMaterial, 'visor-glass');
  glass.renderOrder = 1;
  const [cx, cy] = mask.measured.centre;
  const front = mask.measured.paintBounds.max[2] as number;
  return {
    face,
    glass,
    lightAt: new THREE.Vector3(cx as number, cy as number, front + 0.12 / metresPerUnit),
  };
}

/** The face canvas's aspect for a mask: the paint's width over its height. */
export function faceAspect(mask: VisorMask): number {
  const { min, max } = mask.measured.paintBounds;
  return ((max[0] as number) - (min[0] as number)) / ((max[1] as number) - (min[1] as number));
}

/**
 * The world-frame vertices of a placed static mesh (`meshyAsset.ts` puts
 * the scale and base lift on the mesh itself), as a flat xyz array.
 */
export function placedPositions(mesh: THREE.Mesh): Float32Array {
  const attribute = mesh.geometry.getAttribute('position');
  mesh.updateMatrix();
  const out = new Float32Array(attribute.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < attribute.count; i += 1) {
    v.fromBufferAttribute(attribute, i).applyMatrix4(mesh.matrix);
    out[i * 3] = v.x;
    out[i * 3 + 1] = v.y;
    out[i * 3 + 2] = v.z;
  }
  return out;
}

/**
 * A skinned mesh's vertices in one joint's frame at bind pose, with each
 * vertex's weight to that joint. Rest-pose geometry in bone space is what a
 * panel parented to the bone must be fitted to.
 */
export function bonePositions(
  mesh: THREE.SkinnedMesh,
  bone: THREE.Bone,
): { positions: Float32Array; weights: Float32Array } {
  const boneIndex = mesh.skeleton.bones.indexOf(bone);
  if (boneIndex < 0) throw new Error(`visor fit: joint "${bone.name}" is not in the skeleton`);
  const inverse = mesh.skeleton.boneInverses[boneIndex];
  if (!inverse) throw new Error(`visor fit: no inverse bind matrix for "${bone.name}"`);
  const toBone = new THREE.Matrix4().multiplyMatrices(inverse, mesh.bindMatrix);
  const position = mesh.geometry.getAttribute('position');
  const skinIndex = mesh.geometry.getAttribute('skinIndex');
  const skinWeight = mesh.geometry.getAttribute('skinWeight');
  const positions = new Float32Array(position.count * 3);
  const weights = new Float32Array(position.count);
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i).applyMatrix4(toBone);
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
    let w = 0;
    if (skinIndex.getX(i) === boneIndex) w += skinWeight.getX(i);
    if (skinIndex.getY(i) === boneIndex) w += skinWeight.getY(i);
    if (skinIndex.getZ(i) === boneIndex) w += skinWeight.getZ(i);
    if (skinIndex.getW(i) === boneIndex) w += skinWeight.getW(i);
    weights[i] = w;
  }
  return { positions, weights };
}
