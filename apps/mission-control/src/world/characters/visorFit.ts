import * as THREE from 'three';

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
 * Everything in this file is pure three.js and runs without a renderer.
 */

/**
 * The default paint rule, on linear colour: near-black and neutral.
 * `fit-visor.mjs` starts from these numbers, may relax them for one head
 * whose paint needs it, and records the rule it used in the mask; the
 * shader is given the mask's rule, never this constant, so the two agree.
 */
export const VISOR_PAINT = { luminance: 0.045, chroma: 0.03 } as const;

export interface PaintRule {
  luminance: number;
  chroma: number;
}

/** How far the glass stands off the face, in metres. */
export const GLASS_GAP_M = 0.006;

/** What `fit-visor.mjs` writes. */
export interface VisorMask {
  source: { asset: string; payloadSha256: string };
  frame: string;
  joint: string | null;
  paint: PaintRule & { space: string; samplesPerTriangle: number; overridesDefault: boolean };
  region: { halfWidth: number; y0: number; y1: number; zMin: number };
  measured: {
    trianglesConsidered: number;
    trianglesPainted: number;
    trianglesWhollyPainted: number;
    trianglesPartlyPainted: number;
    triangleBounds: { min: number[]; max: number[] };
    paintBounds: { min: number[]; max: number[] };
    centre: number[];
  };
  /** Triangle indices into the head geometry's index buffer (triangle n is indices 3n..3n+2). */
  triangles: number[];
}

export interface VisorGeometry {
  face: THREE.BufferGeometry;
  glass: THREE.BufferGeometry;
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
): VisorGeometry {
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
  const gap = GLASS_GAP_M / metresPerUnit;
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

const PAINT_TEST = /* glsl */ `
  vec3 paint = texture2D(tPaint, PAINT_UV).rgb;
  float paintLuminance = dot(paint, vec3(0.2126, 0.7152, 0.0722));
  float paintChroma = max(max(paint.r, paint.g), paint.b) - min(min(paint.r, paint.g), paint.b);
  if (paintLuminance >= uPaintLuminance || paintChroma >= uPaintChroma) discard;
`;

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
  varying vec2 vUv;
  varying vec2 vFaceUv;
  void main() {
    ${PAINT_TEST.replace('PAINT_UV', 'vUv')}
    gl_FragColor = vec4(texture2D(tFace, vFaceUv).rgb, 1.0);
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
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tFace: { value: face },
      tPaint: { value: paint },
      uPaintLuminance: { value: rule.luminance },
      uPaintChroma: { value: rule.chroma },
    },
    vertexShader: FACE_VERTEX,
    fragmentShader: FACE_FRAGMENT,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    name: 'visor-face',
  });
}

/**
 * The glass: glossy, clear-coated, nearly black, so what it adds is the
 * reflection of the lights and the environment and nothing else — a
 * highlight that slides across the curve as the camera moves, and a rim
 * where the glass turns away. Masked to the same paint as the face.
 */
export function createGlassMaterial(
  paint: THREE.Texture,
  rule: PaintRule = VISOR_PAINT,
): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color: '#0a0f1e',
    roughness: 0.07,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.4,
    specularIntensity: 1,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    side: THREE.FrontSide,
    name: 'visor-glass',
  });
  material.defines = { USE_UV: '' };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.tPaint = { value: paint };
    shader.uniforms.uPaintLuminance = { value: rule.luminance };
    shader.uniforms.uPaintChroma = { value: rule.chroma };
    shader.fragmentShader = `uniform sampler2D tPaint;\nuniform float uPaintLuminance;\nuniform float uPaintChroma;\n${shader.fragmentShader.replace(
      '#include <clipping_planes_fragment>',
      `#include <clipping_planes_fragment>\n${PAINT_TEST.replace('PAINT_UV', 'vUv')}`,
    )}`;
  };
  material.customProgramCacheKey = () => 'visor-glass-v7';
  return material;
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
): VisorMeshes {
  const geometry = buildVisorGeometry(head.geometry, mask, fitPositions, metresPerUnit);
  const faceMaterial = createFaceMaterial(faceTexture, paint, mask.paint);
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
