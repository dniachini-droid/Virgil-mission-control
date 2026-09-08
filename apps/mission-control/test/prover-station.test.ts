import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  buildGeometry,
  decodeMeshyPayload,
  type MeshyAssetMetadata,
} from '../src/world/assets/meshyAsset.js';
import { BREATH, BREATH_EXTREMES } from '../src/world/characters/breathing.js';
import { placedPositions } from '../src/world/characters/visorFit.js';
import proverBase64 from '../src/world/props/prover-asset.b64.txt?raw';
import proverMetadata from '../src/world/props/prover-asset.json';
import stationBase64 from '../src/world/props/station-asset.b64.txt?raw';
import stationMetadata from '../src/world/props/station-asset.json';
import { layout } from '../src/world/room/palette.js';

/**
 * The owner's V5 note: "the prover is standing behind the console. he isnt
 * sitting in the middle inside the console." He now stands in the centre of
 * his station, on its own floor — and these tests re-measure the station
 * from its payload, exactly as the room builds it, so that the numbers in
 * `palette.ts` are held to the model rather than remembered from it.
 *
 * Measured 2026-09-08 (source units × 0.85, base lifted 0.301 m): a raised
 * deck at 0.108 m, flat to within 4 mm over |x| ≤ 0.3 from z −0.2 to the
 * open front at z +0.55 (and at the centre line back to z −0.4), on a base
 * at 0.010 m; desks rising to 0.44–0.60 m in a U at the back (z < −0.45)
 * and both sides (|x| > 0.6), the side desks starting to rise at |x| ≈ 0.45
 * toward the back; the +z side open. Then the
 * Prover, placed where `palette.ts` puts him and moved through every
 * extreme of his breathing, shares no surface voxel with the station above
 * the deck: nothing clips him.
 */

function placed(metadata: MeshyAssetMetadata, base64: string) {
  const geometry = buildGeometry(metadata, decodeMeshyPayload(metadata, base64));
  const mesh = new THREE.Mesh(geometry);
  const { scale, positionScale, baseOffsetY } = metadata.runtime;
  mesh.scale.setScalar(scale * positionScale);
  mesh.position.y = baseOffsetY;
  return { geometry, mesh, positions: placedPositions(mesh) };
}

const station = placed(stationMetadata, stationBase64);
const prover = placed(proverMetadata, proverBase64);

/** Every surface hit under (x, z), highest first, in the station's frame. */
function hitsBelow(x: number, z: number): number[] {
  const probe = new THREE.Mesh(
    station.geometry,
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  );
  probe.scale.copy(station.mesh.scale);
  probe.position.copy(station.mesh.position);
  probe.updateMatrixWorld();
  const ray = new THREE.Raycaster(new THREE.Vector3(x, 2, z), new THREE.Vector3(0, -1, 0));
  return ray.intersectObject(probe, false).map((h) => h.point.y);
}

const VOXEL = 0.015;
const voxelKey = (x: number, y: number, z: number) =>
  `${Math.floor(x / VOXEL)},${Math.floor(y / VOXEL)},${Math.floor(z / VOXEL)}`;

/** The voxels a mesh's surface passes through under `m`, sampled at half a voxel. */
function surfaceVoxels(
  positions: Float32Array,
  index: ArrayLike<number>,
  m: THREE.Matrix4,
  minY: number,
): Set<string> {
  const set = new Set<string>();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (let t = 0; t < index.length; t += 3) {
    a.fromArray(positions, (index[t] as number) * 3).applyMatrix4(m);
    b.fromArray(positions, (index[t + 1] as number) * 3).applyMatrix4(m);
    c.fromArray(positions, (index[t + 2] as number) * 3).applyMatrix4(m);
    if (a.y < minY && b.y < minY && c.y < minY) continue;
    const longest = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a));
    const steps = Math.max(1, Math.ceil(longest / (VOXEL / 2)));
    for (let i = 0; i <= steps; i += 1) {
      for (let j = 0; j <= steps - i; j += 1) {
        const u = i / steps;
        const v = j / steps;
        const w = 1 - u - v;
        p.set(
          a.x * u + b.x * v + c.x * w,
          a.y * u + b.y * v + c.y * w,
          a.z * u + b.z * v + c.z * w,
        );
        if (p.y >= minY) set.add(voxelKey(p.x, p.y, p.z));
      }
    }
  }
  return set;
}

describe('the side station, measured from its payload', () => {
  it('has a flat deck at the height palette.ts stands the Prover on', () => {
    const centre = hitsBelow(0, 0);
    expect(centre.length).toBeGreaterThan(0);
    expect(Math.abs((centre[0] as number) - layout.stationFloor)).toBeLessThan(0.004);
    for (const x of [-0.3, -0.15, 0, 0.15, 0.3]) {
      for (const z of [-0.2, 0, 0.2, 0.4, 0.55]) {
        const top = hitsBelow(x, z)[0] as number;
        expect(Math.abs(top - layout.stationFloor), `deck at (${x}, ${z}) is ${top}`).toBeLessThan(
          0.006,
        );
      }
    }
  });

  it('is a U: desks at the back and both sides, the front open', () => {
    expect(hitsBelow(0, -0.6)[0] as number).toBeGreaterThan(0.4);
    expect(hitsBelow(0.7, 0)[0] as number).toBeGreaterThan(0.4);
    expect(hitsBelow(-0.7, 0)[0] as number).toBeGreaterThan(0.4);
    expect(hitsBelow(0, 0.65)[0] as number).toBeLessThan(0.15);
    // The open side faces the camera, which is at +z in the room.
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      layout.stationRotationY,
    );
    expect(forward.z).toBeGreaterThan(0.8);
  });

  it('puts the Prover on the deck at its centre', () => {
    const [x, y, z] = layout.proverInStation;
    expect(y).toBe(layout.stationFloor);
    expect(Math.abs(x)).toBeLessThan(0.05);
    expect(Math.abs(z)).toBeLessThan(0.15);
    // proverAt is the same point in the room's frame.
    const world = new THREE.Vector3(x, y, z)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), layout.stationRotationY)
      .add(new THREE.Vector3(...layout.stationAt));
    expect(world.distanceTo(new THREE.Vector3(...layout.proverAt))).toBeLessThan(0.001);
  });
});

describe('the Prover inside the station', () => {
  const index = station.geometry.index as THREE.BufferAttribute;
  const proverIndex = prover.geometry.index as THREE.BufferAttribute;
  // Only geometry above the deck can clip him; the deck itself is what he stands on.
  const ABOVE_DECK = layout.stationFloor + 0.02;
  const stationVoxels = surfaceVoxels(
    station.positions,
    index.array,
    new THREE.Matrix4(),
    ABOVE_DECK,
  );
  const relativeYaw = layout.proverRotationY - layout.stationRotationY;

  function proverMatrix(rise: number, sway: number, yaw: number): THREE.Matrix4 {
    const [x, y, z] = layout.proverInStation;
    const m = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(0, relativeYaw + yaw, sway, 'XYZ'),
    );
    m.setPosition(x, y + rise, z);
    return m;
  }

  it('stands with his feet on the deck, not in it', () => {
    let lowest = Number.POSITIVE_INFINITY;
    const v = new THREE.Vector3();
    const m = proverMatrix(0, 0, 0);
    for (let i = 0; i < prover.positions.length / 3; i += 1) {
      v.fromArray(prover.positions, i * 3).applyMatrix4(m);
      lowest = Math.min(lowest, v.y);
    }
    expect(lowest).toBeGreaterThanOrEqual(layout.stationFloor - 0.001);
    expect(lowest).toBeLessThan(layout.stationFloor + 0.005);
  });

  it('touches no station geometry at any extreme of his breathing', () => {
    expect(stationVoxels.size).toBeGreaterThan(10_000);
    expect(BREATH.rise).toBeLessThanOrEqual(0.02);
    for (const b of [{ rise: 0, sway: 0, yaw: 0 }, ...BREATH_EXTREMES]) {
      const voxels = surfaceVoxels(
        prover.positions,
        proverIndex.array,
        proverMatrix(b.rise, b.sway, b.yaw),
        ABOVE_DECK,
      );
      let shared = 0;
      for (const key of voxels) if (stationVoxels.has(key)) shared += 1;
      expect(shared, `breathing ${JSON.stringify(b)}: ${shared} shared surface voxels`).toBe(0);
    }
  });
});
