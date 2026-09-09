import * as THREE from 'three';
import { buildGeometry, decodeMeshyPayload } from '../src/world/assets/meshyAsset.js';
import { placedPositions } from '../src/world/characters/visorFit.js';
import {
  fabricatorStationBase64Payload,
  keeperStationBase64Payload,
  proverStationBase64Payload,
} from '../src/world/props/v6Assets.js';
import { CAST, ROLES, type Role } from '../src/world/room/cast.js';
import { screenPlan } from '../src/world/screens/screenPlane.js';
import { type ClusterOrientation, v11Cluster } from '../src/world/screens/v11/bank.js';
import { v11SlabPlan } from '../src/world/screens/v11/ScreenBankV11.js';

/**
 * **Where every display is, and how large it comes out on a given viewport.**
 *
 * Extracted from `test/screen-geometry-v11.test.ts` so that the committed test,
 * the parameter sweep that chose the cluster's numbers, and any later question
 * all measure with the same code. Stage 2 recorded why: V9's measuring script
 * was thrown away, could not be reproduced when the owner asked a follow-up,
 * and a defect was left unfixed because of it.
 *
 * Nothing here is part of the product; it is imported only by the study and by
 * the tests.
 */

const PAYLOADS: Record<Role, string> = {
  fabricator: fabricatorStationBase64Payload,
  prover: proverStationBase64Payload,
  keeper: keeperStationBase64Payload,
};

export type Quad = [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3];

export interface Display {
  quad: Quad;
  aspect: number;
  openingMm: [number, number];
}

export function cameraFor(
  pose: { position: readonly number[]; target: readonly number[]; fov: number },
  w: number,
  h: number,
): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(pose.fov, w / h, 0.1, 200);
  camera.position.set(
    pose.position[0] as number,
    pose.position[1] as number,
    pose.position[2] as number,
  );
  camera.lookAt(pose.target[0] as number, pose.target[1] as number, pose.target[2] as number);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return camera;
}

/** A quad's four corners in CSS pixels on a `w` x `h` viewport. */
export function corners(
  quad: Quad,
  camera: THREE.PerspectiveCamera,
  w: number,
  h: number,
): [number, number][] {
  return quad.map((corner) => {
    const p = corner.clone().project(camera);
    return [((p.x + 1) / 2) * w, ((1 - p.y) / 2) * h] as [number, number];
  });
}

/** A quad's mean width and height on screen, in CSS pixels. */
export function projected(
  quad: Quad,
  camera: THREE.PerspectiveCamera,
  w: number,
  h: number,
): { widthPx: number; heightPx: number } {
  const pts = corners(quad, camera, w, h);
  const edge = (a: number, b: number) => {
    const p = pts[a] as [number, number];
    const q = pts[b] as [number, number];
    return Math.hypot(p[0] - q[0], p[1] - q[1]);
  };
  return {
    widthPx: (edge(0, 1) + edge(3, 2)) / 2,
    heightPx: (edge(0, 3) + edge(1, 2)) / 2,
  };
}

/**
 * The three consoles' screen boxes. **Cached**, because decoding the three
 * shipped payloads takes about a tenth of a second and the parameter sweep asks
 * for them a few thousand times; they do not depend on the cluster.
 */
let consoleCache: Record<string, Display> | null = null;

function consoleDisplays(): Record<string, Display> {
  if (consoleCache) return consoleCache;
  const out: Record<string, Display> = {};
  for (const role of ROLES) {
    const { metadata, screen } = CAST[role].station;
    const geometry = buildGeometry(metadata, decodeMeshyPayload(metadata, PAYLOADS[role]));
    const mesh = new THREE.Mesh(geometry);
    const { scale, positionScale, baseOffsetY } = metadata.runtime;
    mesh.scale.setScalar(scale * positionScale);
    mesh.position.y = baseOffsetY;
    const positions = placedPositions(mesh);
    const plan = screenPlan(screen, positions, (geometry.index as THREE.BufferAttribute).array);
    const d = plan.outline.drawn;
    const origin = plan.plane.centre
      .clone()
      .add(plan.plane.right.clone().multiplyScalar(d.centreU))
      .add(plan.plane.up.clone().multiplyScalar(d.centreV))
      .add(plan.plane.normal.clone().multiplyScalar(plan.lift));
    const right = plan.plane.right.clone().multiplyScalar(d.halfWidth);
    const up = plan.plane.up.clone().multiplyScalar(d.halfHeight);
    const member = CAST[role];
    const group = new THREE.Group();
    group.position.set(member.at[0], member.at[1], member.at[2]);
    group.rotation.y = member.rotationY;
    group.updateMatrixWorld(true);
    const world = (p: THREE.Vector3) => p.clone().applyMatrix4(group.matrixWorld);
    out[role] = {
      quad: [
        world(origin.clone().sub(right).add(up)),
        world(origin.clone().add(right).add(up)),
        world(origin.clone().add(right).sub(up)),
        world(origin.clone().sub(right).sub(up)),
      ],
      aspect: plan.aspect,
      openingMm: [2 * d.halfWidth * 1000, 2 * d.halfHeight * 1000],
    };
  }
  consoleCache = out;
  return out;
}

/** The slab's own plan, cached for the same reason the consoles are. */
let slabPlanCache: ReturnType<typeof v11SlabPlan> | null = null;

function slabPlan(): ReturnType<typeof v11SlabPlan> {
  if (!slabPlanCache) slabPlanCache = v11SlabPlan(1024);
  return slabPlanCache;
}

/** The screen box of every display in the world, for one cluster orientation. */
export function displays(orientation: ClusterOrientation = 'portrait'): Record<string, Display> {
  const out: Record<string, Display> = { ...consoleDisplays() };
  const plan = slabPlan();
  for (const placement of v11Cluster(orientation)) {
    const group = new THREE.Group();
    group.position.set(...placement.position);
    group.rotation.set(...placement.rotation);
    group.scale.setScalar(placement.scale);
    group.updateMatrixWorld(true);
    const hw = plan.displayWidth / 2;
    const hh = plan.displayHeight / 2;
    out[`slab-${placement.kind}`] = {
      quad: [
        new THREE.Vector3(-hw, hh, 0).applyMatrix4(group.matrixWorld),
        new THREE.Vector3(hw, hh, 0).applyMatrix4(group.matrixWorld),
        new THREE.Vector3(hw, -hh, 0).applyMatrix4(group.matrixWorld),
        new THREE.Vector3(-hw, -hh, 0).applyMatrix4(group.matrixWorld),
      ],
      aspect: plan.displayWidth / plan.displayHeight,
      openingMm: [
        plan.displayWidth * placement.scale * 1000,
        plan.displayHeight * placement.scale * 1000,
      ],
    };
  }
  return out;
}

/**
 * The **whole slab**, bezel included, rather than the picture inside it: what
 * the reader sees as the edge of the screen, and therefore what may not be
 * clipped by the top of the frame or crowd the sides.
 */
export function slabOutlines(orientation: ClusterOrientation = 'portrait'): Record<string, Quad> {
  const out: Record<string, Quad> = {};
  const hw = 1.54 / 2;
  const hh = 1.04 / 2;
  for (const placement of v11Cluster(orientation)) {
    const group = new THREE.Group();
    group.position.set(...placement.position);
    group.rotation.set(...placement.rotation);
    group.scale.setScalar(placement.scale);
    group.updateMatrixWorld(true);
    out[`slab-${placement.kind}`] = [
      new THREE.Vector3(-hw, hh, 0).applyMatrix4(group.matrixWorld),
      new THREE.Vector3(hw, hh, 0).applyMatrix4(group.matrixWorld),
      new THREE.Vector3(hw, -hh, 0).applyMatrix4(group.matrixWorld),
      new THREE.Vector3(-hw, -hh, 0).applyMatrix4(group.matrixWorld),
    ];
  }
  return out;
}
