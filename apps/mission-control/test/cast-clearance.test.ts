import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  buildGeometry,
  decodeMeshyPayload,
  type MeshyAssetMetadata,
} from '../src/world/assets/meshyAsset.js';
import { BREATH, BREATH_EXTREMES, type Breath } from '../src/world/characters/breathing.js';
import { placedPositions } from '../src/world/characters/visorFit.js';
import {
  console3Base64Payload,
  console3Metadata,
  fabricator2Base64Payload,
  fabricatorStationBase64Payload,
  keeper2Base64Payload,
  keeperStationBase64Payload,
  prover2Base64Payload,
  proverStationBase64Payload,
} from '../src/world/props/v6Assets.js';
import {
  CAST,
  FACE_TURN,
  figurePlacement,
  idlePlacement,
  ROLES,
  type Role,
  STAND_GAP,
} from '../src/world/room/cast.js';
import { layout } from '../src/world/room/palette.js';
import {
  decodeVirgilPayload,
  parseVirgilGlb,
  virgilRiggedMetadata,
} from '../src/world/virgil/virgilRigged.js';

/**
 * Nobody stands in anything. V5 held the Prover clear of his station by
 * re-measuring the station from its payload and voxelising both surfaces;
 * V6 does the same for all three characters at their own stations, and
 * for Virgil on his console's deck. V7 adds each character's idle
 * position (they stand aside until a job arrives, §0.7) and the path
 * between the two. The numbers in `palette.ts` and `cast.ts` are held to
 * the models rather than remembered from them.
 */

function placed(metadata: MeshyAssetMetadata, base64: string) {
  const geometry = buildGeometry(metadata, decodeMeshyPayload(metadata, base64));
  const mesh = new THREE.Mesh(geometry);
  const { scale, positionScale, baseOffsetY } = metadata.runtime;
  mesh.scale.setScalar(scale * positionScale);
  mesh.position.y = baseOffsetY;
  return { geometry, mesh, positions: placedPositions(mesh) };
}

const PAYLOADS: Record<Role, { station: string; figure: string }> = {
  fabricator: { station: fabricatorStationBase64Payload, figure: fabricator2Base64Payload },
  prover: { station: proverStationBase64Payload, figure: prover2Base64Payload },
  keeper: { station: keeperStationBase64Payload, figure: keeper2Base64Payload },
};

/** Every surface hit under (x, z), highest first, in the model's own frame. */
function hitsBelow(geometry: THREE.BufferGeometry, mesh: THREE.Mesh, x: number, z: number) {
  const probe = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  probe.scale.copy(mesh.scale);
  probe.position.copy(mesh.position);
  probe.updateMatrixWorld();
  const ray = new THREE.Raycaster(new THREE.Vector3(x, 4, z), new THREE.Vector3(0, -1, 0));
  return ray.intersectObject(probe, false).map((h) => h.point.y);
}

const VOXEL = 0.015;
const voxelKey = (x: number, y: number, z: number) =>
  `${Math.floor(x / VOXEL)},${Math.floor(y / VOXEL)},${Math.floor(z / VOXEL)}`;

/** The voxels a mesh's surface passes through under `m`, sampled at half a voxel. */
function surfaceVoxels(
  positions: ArrayLike<number>,
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

describe.each(ROLES)('the %s at their station', (role) => {
  const station = placed(CAST[role].station.metadata, PAYLOADS[role].station);
  const figure = placed(CAST[role].model.metadata, PAYLOADS[role].figure);
  const placement = figurePlacement(role);

  it('stands on the floor, clear of the station’s front edge, at its front-left corner', () => {
    let stationFront = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < station.positions.length; i += 3) {
      stationFront = Math.max(stationFront, station.positions[i + 2] as number);
    }
    let figureBack = Number.POSITIVE_INFINITY;
    for (let i = 0; i < figure.positions.length; i += 3) {
      figureBack = Math.min(figureBack, figure.positions[i + 2] as number);
    }
    const [x, y, z] = placement.local;
    expect(y).toBe(0);
    expect(x).toBeLessThan(0);
    // The standing point is derived from the two models' measured fronts.
    expect(z + figureBack - stationFront).toBeCloseTo(STAND_GAP, 3);
    expect(placement.rotationY).toBeCloseTo(CAST[role].rotationY * FACE_TURN, 6);
    // Feet on the floor.
    let lowest = Number.POSITIVE_INFINITY;
    for (let i = 0; i < figure.positions.length; i += 3) {
      lowest = Math.min(lowest, figure.positions[i + 1] as number);
    }
    expect(lowest).toBeGreaterThanOrEqual(-0.001);
    expect(lowest).toBeLessThan(0.005);
  });

  // Voxelising two surfaces at 15 mm takes seconds, and ten under a loaded
  // machine: pnpm check once failed this on Vitest's 5 s default while two
  // software-rendering captures ran beside it. The bound is the geometry's,
  // not the clock's.
  it('touches no station geometry at any extreme of their breathing, at work, idle, and on the way', {
    timeout: 180_000,
  }, () => {
    const stationIndex = station.geometry.index as THREE.BufferAttribute;
    const figureIndex = figure.geometry.index as THREE.BufferAttribute;
    const ABOVE_FLOOR = 0.02;
    const stationVoxels = surfaceVoxels(
      station.positions,
      stationIndex.array,
      new THREE.Matrix4(),
      ABOVE_FLOOR,
    );
    expect(stationVoxels.size).toBeGreaterThan(5_000);
    expect(BREATH.rise).toBeLessThanOrEqual(0.02);
    const idle = idlePlacement(role);
    // The figure in the station's frame: turned by (FACE_TURN − 1) of the
    // station's rotation, since both are placed in the room and the figure
    // turns a little more toward the camera than the station does. Every
    // breathing extreme at the working position; the rest pose at the idle
    // position and at the middle of the glide between them.
    const poses: { label: string; local: [number, number, number]; yaw: number; b: Breath }[] =
      [];
    for (const b of [{ rise: 0, sway: 0, yaw: 0 }, ...BREATH_EXTREMES]) {
      poses.push({ label: 'working', local: placement.local, yaw: placement.rotationY, b });
    }
    const still = { rise: 0, sway: 0, yaw: 0 };
    poses.push({ label: 'idle', local: idle.local, yaw: idle.rotationY, b: still });
    poses.push({
      label: 'midway',
      local: [
        (placement.local[0] + idle.local[0]) / 2,
        0,
        (placement.local[2] + idle.local[2]) / 2,
      ],
      yaw: (placement.rotationY + idle.rotationY) / 2,
      b: still,
    });
    for (const { label, local, yaw, b } of poses) {
      const relativeYaw = yaw - CAST[role].rotationY;
      const [x, y, z] = local;
      const m = new THREE.Matrix4().makeRotationFromEuler(
        new THREE.Euler(0, relativeYaw + b.yaw, b.sway, 'XYZ'),
      );
      m.setPosition(x, y + b.rise, z);
      const voxels = surfaceVoxels(figure.positions, figureIndex.array, m, ABOVE_FLOOR);
      let shared = 0;
      for (const key of voxels) if (stationVoxels.has(key)) shared += 1;
      expect(
        shared,
        `${label}, breathing ${JSON.stringify(b)}: ${shared} shared surface voxels`,
      ).toBe(0);
    }
  });
});

describe('Virgil on his console', () => {
  const console_ = placed(console3Metadata, console3Base64Payload);

  it('has a raised deck at the height palette.ts stands him on, flat across its middle', () => {
    const centre = hitsBelow(console_.geometry, console_.mesh, 0, 0);
    expect(centre.length).toBeGreaterThan(0);
    expect(Math.abs((centre[0] as number) - layout.consoleDeck)).toBeLessThan(0.004);
    // The deck carries its own inlaid star and rings: measured 2026-09-08,
    // it varies by up to 13 mm over |x| ≤ 0.5, |z| ≤ 0.6 (the lowest sample
    // 0.157 m at (−0.25, −0.6)); his feet at the centre are at 0.170.
    for (const x of [-0.5, -0.25, 0, 0.25, 0.5]) {
      for (const z of [-0.6, -0.3, 0, 0.3, 0.6]) {
        const top = hitsBelow(console_.geometry, console_.mesh, x, z)[0] as number;
        expect(Math.abs(top - layout.consoleDeck), `deck at (${x}, ${z}) is ${top}`).toBeLessThan(
          0.02,
        );
      }
    }
    expect(layout.virgilAt[1]).toBe(layout.consoleDeck);
  });

  it('is a ring: a rim at the back and both sides, the front open', () => {
    expect(hitsBelow(console_.geometry, console_.mesh, 0, -1.3)[0] as number).toBeGreaterThan(0.7);
    expect(hitsBelow(console_.geometry, console_.mesh, 1.35, 0)[0] as number).toBeGreaterThan(0.45);
    expect(hitsBelow(console_.geometry, console_.mesh, -1.35, 0)[0] as number).toBeGreaterThan(
      0.45,
    );
    expect(hitsBelow(console_.geometry, console_.mesh, 0, 1.3)[0] as number).toBeLessThan(
      layout.consoleDeck + 0.05,
    );
  });

  it('stands on the deck at bind pose touching no console geometry above it', {
    timeout: 120_000,
  }, async () => {
    const gltf = await parseVirgilGlb(decodeVirgilPayload());
    let skinned: THREE.SkinnedMesh | null = null;
    gltf.scene.traverse((o) => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned = o as THREE.SkinnedMesh;
    });
    const mesh = skinned as unknown as THREE.SkinnedMesh;
    const position = mesh.geometry.getAttribute('position');
    const index = mesh.geometry.index as THREE.BufferAttribute;
    const { scale, baseOffsetY } = virgilRiggedMetadata.runtime;
    const virgil = new Float32Array(position.count * 3);
    let lowest = Number.POSITIVE_INFINITY;
    for (let i = 0; i < position.count; i += 1) {
      virgil[i * 3] = position.getX(i) * scale;
      virgil[i * 3 + 1] = position.getY(i) * scale + baseOffsetY;
      virgil[i * 3 + 2] = position.getZ(i) * scale;
      lowest = Math.min(lowest, virgil[i * 3 + 1] as number);
    }
    // Feet at the origin: the rigged file is exported with them at y = 0.
    expect(lowest).toBeGreaterThanOrEqual(-0.002);
    expect(lowest).toBeLessThan(0.01);
    const ABOVE_DECK = layout.consoleDeck + 0.02;
    const consoleIndex = console_.geometry.index as THREE.BufferAttribute;
    const consoleVoxels = surfaceVoxels(
      console_.positions,
      consoleIndex.array,
      new THREE.Matrix4(),
      ABOVE_DECK,
    );
    expect(consoleVoxels.size).toBeGreaterThan(5_000);
    for (const b of [{ rise: 0, sway: 0, yaw: 0 }, ...BREATH_EXTREMES]) {
      const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, b.yaw, b.sway, 'XYZ'));
      m.setPosition(0, layout.consoleDeck + b.rise, 0);
      const voxels = surfaceVoxels(virgil, index.array, m, ABOVE_DECK);
      let shared = 0;
      for (const key of voxels) if (consoleVoxels.has(key)) shared += 1;
      expect(shared, `breathing ${JSON.stringify(b)}: ${shared} shared surface voxels`).toBe(0);
    }
  });
});
