import * as THREE from 'three';

/**
 * Fits a visor panel to a head's own geometry.
 *
 * V3 placed each face as a curved plate at hand-set coordinates, fitted to
 * the bezel by close-up screenshot. On the Prover that put a rectangle on a
 * sphere, and on Virgil it put the edges of a strongly curved plate inside
 * his flat visor — his face front is a flat plate (z 0.23–0.25 across
 * x ±0.32, y 0.09–0.45 in head-bone units) and the Prover's is a sphere
 * (centre y 1.08, R 0.22 m, RMS 6.5 mm over 805 vertices). Neither is a
 * cylinder segment.
 *
 * So the panel is now **derived from the head**: a grid over the panel's
 * extent in the head's frame, each node ray-cast onto the head's front
 * triangles along −z, and lifted `offset` off the surface it hit. A flat face
 * gets a flat panel, a dome gets a spherical cap, and there is no coordinate
 * to eyeball. `test/visor.test.ts` runs the same fit on the same geometry in
 * node and fails if a panel leaves its head or stops hugging it — the defect
 * V3 found (both panels silently culled) hid itself once, and nothing here is
 * allowed to hide again.
 *
 * Everything in this file is pure three.js and runs without a renderer.
 */

export interface VisorSpec {
  /** Half the panel's width, in the parent frame's units. */
  halfWidth: number;
  /** Bottom and top of the panel in the parent frame. */
  y0: number;
  y1: number;
  /** Grid cells across and up. */
  cols: number;
  rows: number;
  /** How far the panel stands off the surface, along +z. */
  offset: number;
  /** Only geometry in front of this z counts as the face. */
  zMin: number;
  /** Corner rounding of the visor's outline, as a fraction of its height. */
  corner: number;
}

export interface HeadSurface {
  spec: VisorSpec;
  /** Surface z at each grid node, row-major, (rows + 1) × (cols + 1). */
  z: Float32Array;
  /** Bounds of the front triangles the fit used. */
  bounds: THREE.Box3;
  /** How many triangles were candidates. */
  triangles: number;
}

/**
 * Virgil's visor in the `Head` joint's frame (source units; the scene is
 * scaled 0.769 to 1.8 m). His measured plate runs x ±0.32 and y 0.09–0.45,
 * with a recessed groove (z 0.20) along y 0.45–0.47 where it ends; the
 * panel stops short of the plate's edge on every side and clear of the
 * groove, so that it is fitted to the plate and bridges nothing.
 */
export const VIRGIL_VISOR: VisorSpec = {
  halfWidth: 0.25,
  y0: 0.15,
  y1: 0.43,
  cols: 20,
  rows: 12,
  offset: 0.004,
  zMin: 0.12,
  corner: 0.22,
};

/**
 * The Prover's visor in his placed frame (metres, feet at the origin). His
 * dome is the sphere centred at y 1.08; the band is centred on that, where
 * the sphere faces forward, and ends well below the halo ring at y 1.35.
 */
export const PROVER_VISOR: VisorSpec = {
  halfWidth: 0.15,
  y0: 0.985,
  y1: 1.175,
  cols: 24,
  rows: 12,
  offset: 0.003,
  zMin: 0.05,
  corner: 0.45,
};

/**
 * Samples the head's front surface under the panel. `positions` is a flat
 * xyz array in the parent frame; `index` triangulates it; `keep` may drop
 * vertices that do not belong to the head (for a skinned mesh, those not
 * weighted to the head joint). Throws if any grid node finds no surface —
 * the fit is only allowed to succeed completely.
 */
export function fitHeadSurface(
  positions: ArrayLike<number>,
  index: ArrayLike<number>,
  spec: VisorSpec,
  keep?: (vertex: number) => boolean,
): HeadSurface {
  // A triangle is a candidate when it belongs to the head, reaches in front
  // of `zMin`, and any of its vertices falls under the panel (plus a margin):
  // a flat plate is made of large triangles whose corners lie well outside
  // the panel, and requiring all three inside would leave holes under it.
  const margin = 0.03;
  const under = (v: number) =>
    Math.abs(positions[v * 3] as number) <= spec.halfWidth + margin &&
    (positions[v * 3 + 1] as number) >= spec.y0 - margin &&
    (positions[v * 3 + 1] as number) <= spec.y1 + margin;
  const z = (v: number) => positions[v * 3 + 2] as number;
  const inBox = (ia: number, ib: number, ic: number) =>
    (keep ? keep(ia) && keep(ib) && keep(ic) : true) &&
    Math.max(z(ia), z(ib), z(ic)) > spec.zMin &&
    (under(ia) || under(ib) || under(ic));

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const tris: [THREE.Vector3, THREE.Vector3, THREE.Vector3][] = [];
  const bounds = new THREE.Box3();
  for (let i = 0; i < index.length; i += 3) {
    const ia = index[i] as number;
    const ib = index[i + 1] as number;
    const ic = index[i + 2] as number;
    if (!inBox(ia, ib, ic)) continue;
    const ta = a.fromArray(positions, ia * 3).clone();
    const tb = b.fromArray(positions, ib * 3).clone();
    const tc = c.fromArray(positions, ic * 3).clone();
    tris.push([ta, tb, tc]);
    bounds.expandByPoint(ta).expandByPoint(tb).expandByPoint(tc);
  }
  if (tris.length === 0) throw new Error('visor fit: no front triangles under the panel');

  const ray = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 0, -1));
  const hit = new THREE.Vector3();
  const heights = new Float32Array((spec.rows + 1) * (spec.cols + 1));
  const misses: string[] = [];
  for (let r = 0; r <= spec.rows; r += 1) {
    const y = spec.y0 + ((spec.y1 - spec.y0) * r) / spec.rows;
    for (let col = 0; col <= spec.cols; col += 1) {
      const x = -spec.halfWidth + (2 * spec.halfWidth * col) / spec.cols;
      ray.origin.set(x, y, bounds.max.z + 1);
      let best = Number.NEGATIVE_INFINITY;
      for (const [ta, tb, tc] of tris) {
        if (ray.intersectTriangle(ta, tb, tc, false, hit) && hit.z > best) best = hit.z;
      }
      if (best === Number.NEGATIVE_INFINITY) misses.push(`(${x.toFixed(3)}, ${y.toFixed(3)})`);
      heights[r * (spec.cols + 1) + col] = best;
    }
  }
  if (misses.length > 0) {
    throw new Error(`visor fit: no surface under ${misses.length} node(s): ${misses.join(' ')}`);
  }

  // Clearing pass. A ray samples the surface at a point; a rivet or a groove
  // edge between two nodes can still stand in front of the panel drawn
  // between them. Every head vertex under the panel is checked against the
  // bilinear surface at its own (x, y), and the four nodes around it are
  // lifted by any deficit — the interpolation weights sum to one, so one
  // pass leaves nothing in front. `test/visor.test.ts` checks that it did.
  const stride = spec.cols + 1;
  const cellW = (2 * spec.halfWidth) / spec.cols;
  const cellH = (spec.y1 - spec.y0) / spec.rows;
  for (const [ta, tb, tc] of tris) {
    for (const p of [ta, tb, tc]) {
      if (Math.abs(p.x) > spec.halfWidth || p.y < spec.y0 || p.y > spec.y1) continue;
      const u = Math.min(spec.cols - 1e-9, (p.x + spec.halfWidth) / cellW);
      const v = Math.min(spec.rows - 1e-9, (p.y - spec.y0) / cellH);
      const c0 = Math.floor(u);
      const r0 = Math.floor(v);
      const fu = u - c0;
      const fv = v - r0;
      const i00 = r0 * stride + c0;
      const i01 = i00 + 1;
      const i10 = i00 + stride;
      const i11 = i10 + 1;
      const here =
        (heights[i00] as number) * (1 - fu) * (1 - fv) +
        (heights[i01] as number) * fu * (1 - fv) +
        (heights[i10] as number) * (1 - fu) * fv +
        (heights[i11] as number) * fu * fv;
      const deficit = p.z - here;
      if (deficit > 0) {
        heights[i00] = (heights[i00] as number) + deficit;
        heights[i01] = (heights[i01] as number) + deficit;
        heights[i10] = (heights[i10] as number) + deficit;
        heights[i11] = (heights[i11] as number) + deficit;
      }
    }
  }
  return { spec, z: heights, bounds, triangles: tris.length };
}

/**
 * The panel mesh: the grid lifted `offset` off the surface, with UVs that
 * put the canvas's top at the panel's top. Winding faces +z; the material
 * is double-sided regardless, because which side faces the viewer depends
 * on the parent frame and a culled visor is a face that is not there.
 */
export function buildVisorGeometry(surface: HeadSurface): THREE.BufferGeometry {
  const { spec, z } = surface;
  const stride = spec.cols + 1;
  const count = (spec.rows + 1) * stride;
  const position = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  for (let r = 0; r <= spec.rows; r += 1) {
    const v = r / spec.rows;
    const y = spec.y0 + (spec.y1 - spec.y0) * v;
    for (let col = 0; col <= spec.cols; col += 1) {
      const u = col / spec.cols;
      const i = r * stride + col;
      position[i * 3] = -spec.halfWidth + 2 * spec.halfWidth * u;
      position[i * 3 + 1] = y;
      position[i * 3 + 2] = (z[i] as number) + spec.offset;
      uv[i * 2] = u;
      uv[i * 2 + 1] = v;
    }
  }
  const index: number[] = [];
  for (let r = 0; r < spec.rows; r += 1) {
    for (let col = 0; col < spec.cols; col += 1) {
      const i = r * stride + col;
      index.push(i, i + 1, i + stride, i + 1, i + stride + 1, i + stride);
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

/**
 * The one material a visor may use. Double-sided (see above); emissive in
 * the sense that it is unlit and untone-mapped, so the canvas's colours are
 * the colours seen; cut out by alpha so the visor's rounded outline, not the
 * grid's rectangle, is its silhouette.
 */
export function createVisorMaterial(map: THREE.Texture): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map,
    toneMapped: false,
    side: THREE.DoubleSide,
    alphaTest: 0.5,
  });
}

/** The centre of the panel's front, for placing its light. */
export function visorCentre(surface: HeadSurface): THREE.Vector3 {
  const { spec, z } = surface;
  const i = Math.floor(spec.rows / 2) * (spec.cols + 1) + Math.floor(spec.cols / 2);
  return new THREE.Vector3(0, (spec.y0 + spec.y1) / 2, (z[i] as number) + spec.offset);
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
