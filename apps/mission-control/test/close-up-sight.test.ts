import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  buildGeometry,
  decodeMeshyPayload,
  type MeshyAssetMetadata,
} from '../src/world/assets/meshyAsset.js';
import { BREATH_EXTREMES } from '../src/world/characters/breathing.js';
import { OVERSHOOT } from '../src/world/characters/locomotion.js';
import { CLIP_FOR } from '../src/world/characters/VirgilRigged.js';
import { placedPositions, type VisorMask } from '../src/world/characters/visorFit.js';
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
  figurePlacement,
  ROLES,
  type Role,
  screenCentre,
  workingPlacement,
} from '../src/world/room/cast.js';
import { MAX_FOV, MIN_FOV, screenAxis, screenCorners } from '../src/world/room/closeUp.js';
import { layout } from '../src/world/room/palette.js';
import { cameraPose, limitsFor } from '../src/world/room/VirgilRoom.js';
import {
  fitScreenPlane,
  SCREEN_INSET_M,
  SCREEN_LIFT_MARGIN_M,
} from '../src/world/screens/screenPlane.js';
import {
  decodeVirgilPayload,
  parseVirgilGlb,
  virgilRiggedMetadata,
} from '../src/world/virgil/virgilRigged.js';

/**
 * **A close-up shows the whole of its station's screen.**
 *
 * The close-up views (`1`–`4`, `#/?cam=…`) exist to make one console's
 * screen readable. V8 shipped with three ways of losing that, none of
 * which any check caught and all of which were found by rendering the
 * artifact and looking at the frames:
 *
 *  - **the camera never reached the pose `cameraPose` authored.** `Rig`
 *    lifted the orbit limits through React state, which lands a frame or
 *    two late; on a software renderer the flight finished inside one
 *    frame, so `OrbitControls.update()` still carried the wide tabletop's
 *    `minDistance: 6` and pushed the camera 2.62 m back along its own
 *    view axis, into Virgil, whose head then filled the frame. Measured:
 *    all three close-ups came to rest at exactly 6.000 m from their
 *    target instead of 3.38 m;
 *  - **the Prover's own console carries a dial that stood in front of his
 *    screen** at V8's oblique angle, and the Keeper stands almost exactly
 *    on that sight line: 75 of the 139 sample points his console does not
 *    itself hide were behind something, and `INSUFFICIENT_EVIDENCE` was
 *    clipped. The Keeper's own casing hid 23 of his 215;
 *  - **a phone cropped the Fabricator's screen**: it needed a 44° lens at
 *    390 × 599 and had a fixed 40°.
 *
 * So the pose is derived from the screen (`closeUp.ts`) and the result is
 * measured here rather than trusted. For each role, from that role's
 * close-up camera, a ray to **every sample point of the console's own
 * screen triangles** must reach the screen before it reaches anything
 * else; and every corner of the screen's measured box must land inside
 * the frame with air around it, at both viewports.
 *
 * **What counts as the screen.** A console's screen mask runs right up to
 * — and a little under — the console's own bezel: looking straight down
 * the Fabricator's screen's own normal from six metres off, 91 of its 223
 * sample points are behind its own casing, and 2 of the Keeper's 226. No
 * camera anywhere can see those, so requiring it would be requiring the
 * impossible. The requirement is therefore the honest one: **the camera
 * must hide nothing that the model does not already hide.** The head-on
 * reference is computed here, from the same geometry, so the bar cannot
 * drift.
 *
 * What stands in the way is enumerated from the set, not guessed: all
 * three consoles (each one's own body, its screen triangles removed), all
 * three characters at every yaw of their turn including the overshoot and
 * both breathing extremes, Virgil's console, and the rigged Virgil sampled
 * through every clip he can be playing.
 *
 * Two things are deliberately **not** occluders, and the omission is
 * recorded rather than hidden: the orrery's tracks and planets, which are
 * additive and transparent and read as light rather than as surfaces, and
 * Virgil's three slabs, which are 1.4 m above every sight line here.
 * Neither is a character or a console.
 */

/** A placed static model, as `Models.tsx` places it. */
function placed(
  metadata: MeshyAssetMetadata,
  base64: string,
  at: readonly [number, number, number],
  rotationY: number,
): THREE.Mesh {
  const geometry = buildGeometry(metadata, decodeMeshyPayload(metadata, base64));
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const { scale, positionScale, baseOffsetY } = metadata.runtime;
  mesh.scale.setScalar(scale * positionScale);
  mesh.position.set(at[0], at[1] + baseOffsetY, at[2]);
  mesh.rotation.y = rotationY;
  mesh.updateMatrixWorld(true);
  return mesh;
}

const STATION_PAYLOAD: Record<Role, string> = {
  fabricator: fabricatorStationBase64Payload,
  prover: proverStationBase64Payload,
  keeper: keeperStationBase64Payload,
};
const FIGURE_PAYLOAD: Record<Role, string> = {
  fabricator: fabricator2Base64Payload,
  prover: prover2Base64Payload,
  keeper: keeper2Base64Payload,
};

/** Triangles in the room, frozen, so a ray can be tested against one pose. */
function soup(name: string, vertices: number[]): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  mesh.name = name;
  mesh.updateMatrixWorld(true);
  return mesh;
}

/** A console's own triangles, split into its screen and the rest of its body. */
function consoleParts(role: Role, station: THREE.Mesh) {
  const mask = CAST[role].station.screen as VisorMask;
  const index = station.geometry.index as THREE.BufferAttribute;
  const position = station.geometry.getAttribute('position');
  const screenTriangles = new Set(mask.triangles);
  const screen: number[] = [];
  const body: number[] = [];
  const p = new THREE.Vector3();
  for (let t = 0; t < index.count / 3; t += 1) {
    const into = screenTriangles.has(t) ? screen : body;
    for (let k = 0; k < 3; k += 1) {
      p.fromBufferAttribute(position, index.getX(t * 3 + k)).applyMatrix4(station.matrixWorld);
      into.push(p.x, p.y, p.z);
    }
  }
  return { screen: soup(`${role} screen`, screen), body: soup(`${role} console body`, body) };
}

/**
 * Points spread over a console's own screen triangles, in the room: the
 * vertices, the edge midpoints and the interior of each, from the mask
 * `fit-screen.mjs` recorded, so these are the screen's real extent and
 * not a rectangle guessed around it. Lifted 2 mm along the screen's own
 * normal so a ray reaches them rather than grazing their plane.
 */
function screenSamples(role: Role, station: THREE.Mesh): THREE.Vector3[] {
  return [...maskSamples(role, station), ...flatCorners(role, station)];
}

/**
 * The four corners of the flat rectangle the picture is actually drawn on
 * (V8.1, `screens/screenPlane.ts`), in the room. They stand 6–30 mm in
 * front of the model's own surface, so they are easier to see than the
 * samples below — but they are what a reader reads, so they are asserted
 * rather than argued.
 */
function flatCorners(role: Role, station: THREE.Mesh): THREE.Vector3[] {
  const mask = CAST[role].station.screen as VisorMask;
  const { scale, positionScale, baseOffsetY } = CAST[role].station.metadata.runtime;
  const local = new THREE.Mesh(station.geometry);
  local.scale.setScalar(scale * positionScale);
  local.position.y = baseOffsetY;
  const index = (station.geometry.index as THREE.BufferAttribute).array;
  const plane = fitScreenPlane(mask, placedPositions(local), index);
  const halfWidth = plane.halfWidth - SCREEN_INSET_M;
  const halfHeight = plane.halfHeight - SCREEN_INSET_M;
  const origin = plane.centre
    .clone()
    .addScaledVector(plane.normal, plane.maxFrontUnderRect + SCREEN_LIFT_MARGIN_M);
  // The placed frame into the room: the station's own yaw and position.
  const toRoom = new THREE.Matrix4()
    .makeRotationY(CAST[role].rotationY)
    .premultiply(new THREE.Matrix4().makeTranslation(...CAST[role].at));
  const out: THREE.Vector3[] = [];
  for (const [u, v] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ] as [number, number][]) {
    out.push(
      origin
        .clone()
        .addScaledVector(plane.right, u * halfWidth)
        .addScaledVector(plane.up, v * halfHeight)
        .applyMatrix4(toRoom),
    );
  }
  return out;
}

function maskSamples(role: Role, station: THREE.Mesh): THREE.Vector3[] {
  const mask = CAST[role].station.screen as VisorMask;
  const index = station.geometry.index as THREE.BufferAttribute;
  const position = station.geometry.getAttribute('position');
  const lift = new THREE.Vector3(...screenAxis(role)).multiplyScalar(0.002);
  const seen = new Set<string>();
  const points: THREE.Vector3[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const p = new THREE.Vector3();
  const N = 3;
  for (const t of mask.triangles) {
    a.fromBufferAttribute(position, index.getX(t * 3)).applyMatrix4(station.matrixWorld);
    b.fromBufferAttribute(position, index.getX(t * 3 + 1)).applyMatrix4(station.matrixWorld);
    c.fromBufferAttribute(position, index.getX(t * 3 + 2)).applyMatrix4(station.matrixWorld);
    for (let i = 0; i <= N; i += 1) {
      for (let j = 0; j <= N - i; j += 1) {
        const u = i / N;
        const v = j / N;
        const w = 1 - u - v;
        p.set(
          a.x * u + b.x * v + c.x * w,
          a.y * u + b.y * v + c.y * w,
          a.z * u + b.z * v + c.z * w,
        ).add(lift);
        const key = `${Math.round(p.x * 400)},${Math.round(p.y * 400)},${Math.round(p.z * 400)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        points.push(p.clone());
      }
    }
  }
  return points;
}

/** How near a sample a hit has to be to count as the screen's own surface. */
const GRAZE = 0.002;

function visibleFrom(
  from: THREE.Vector3,
  samples: THREE.Vector3[],
  meshes: THREE.Mesh[],
  raycaster: THREE.Raycaster,
): { seen: THREE.Vector3[]; blocked: { point: THREE.Vector3; by: string; at: number }[] } {
  const seen: THREE.Vector3[] = [];
  const blocked: { point: THREE.Vector3; by: string; at: number }[] = [];
  for (const point of samples) {
    const direction = point.clone().sub(from);
    const distance = direction.length();
    raycaster.set(from, direction.normalize());
    raycaster.near = 0;
    raycaster.far = distance - GRAZE;
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) seen.push(point);
    else {
      const first = hits[0] as THREE.Intersection;
      blocked.push({ point, by: first.object.name, at: first.distance });
    }
  }
  return { seen, blocked };
}

/**
 * The rigged Virgil, posed. Sampled through every clip he can be playing:
 * his clips move him, carrying a hand or a stomping foot up to 0.70 m
 * further forward in +z and 0.21 m higher than his bind pose, which
 * `cast-clearance.test.ts` measures only at bind pose.
 */
async function virgilPoses(): Promise<THREE.Mesh[]> {
  const gltf = await parseVirgilGlb(decodeVirgilPayload());
  const { scale, baseOffsetY } = virgilRiggedMetadata.runtime;
  gltf.scene.scale.setScalar(scale);
  gltf.scene.position.y = baseOffsetY;
  const root = new THREE.Group();
  root.add(gltf.scene);
  root.position.set(...layout.virgilAt);
  let skin: THREE.SkinnedMesh | null = null;
  gltf.scene.traverse((object) => {
    if ((object as THREE.SkinnedMesh).isSkinnedMesh) skin = object as THREE.SkinnedMesh;
  });
  const mesh = skin as unknown as THREE.SkinnedMesh;
  const mixer = new THREE.AnimationMixer(root);
  const out: THREE.Mesh[] = [];
  for (const name of ['Idle_11', ...Object.values(CLIP_FOR)]) {
    const clip = THREE.AnimationClip.findByName(gltf.animations, name);
    if (!clip) throw new Error(`virgil rigged: no clip "${name}"`);
    for (let i = 0; i <= 6; i += 1) {
      mixer.stopAllAction();
      const action = mixer.clipAction(clip);
      action.reset();
      action.play();
      action.time = (clip.duration * i) / 6;
      action.setEffectiveWeight(1);
      mixer.update(0);
      root.updateMatrixWorld(true);
      // The skeleton cannot be held still while the next pose is
      // measured, so each pose is frozen into triangles of its own.
      const position = mesh.geometry.getAttribute('position');
      const index = mesh.geometry.index as THREE.BufferAttribute;
      const vertices: number[] = [];
      const p = new THREE.Vector3();
      for (let t = 0; t < index.count; t += 1) {
        p.fromBufferAttribute(position, index.getX(t));
        mesh.applyBoneTransform(index.getX(t), p);
        p.applyMatrix4(mesh.matrixWorld);
        vertices.push(p.x, p.y, p.z);
      }
      out.push(soup(`Virgil (${name} ${i}/6)`, vertices));
    }
  }
  return out;
}

/** Every yaw a character passes through: front, the turn, the overshoot, the sway. */
function figureYaws(role: Role): { label: string; yaw: number }[] {
  const front = figurePlacement(role);
  const atScreen = workingPlacement(role);
  let dr = atScreen.rotationY - front.rotationY;
  dr = Math.atan2(Math.sin(dr), Math.cos(dr));
  const yaws = [{ label: 'front', yaw: front.rotationY }];
  for (let k = 1; k <= 8; k += 1) {
    yaws.push({ label: `turn ${k}/8`, yaw: front.rotationY + dr * (k / 8) });
  }
  yaws.push({ label: 'overshoot', yaw: front.rotationY + dr * (1 + OVERSHOOT) });
  for (const b of BREATH_EXTREMES) {
    yaws.push({ label: `front, swayed`, yaw: front.rotationY + b.yaw });
    yaws.push({ label: `at the screen, swayed`, yaw: atScreen.rotationY + b.yaw });
  }
  return yaws;
}

interface Set_ {
  occluders: THREE.Mesh[];
  bodyOf: Record<Role, THREE.Mesh>;
  samplesOf: Record<Role, THREE.Vector3[]>;
}

/** Everything in the set that can stand between a close-up camera and a screen. */
async function theSet(): Promise<Set_> {
  const occluders: THREE.Mesh[] = [];
  const bodyOf = {} as Record<Role, THREE.Mesh>;
  const samplesOf = {} as Record<Role, THREE.Vector3[]>;
  for (const role of ROLES) {
    const member = CAST[role];
    const station = placed(
      member.station.metadata,
      STATION_PAYLOAD[role],
      member.at,
      member.rotationY,
    );
    const parts = consoleParts(role, station);
    bodyOf[role] = parts.body;
    samplesOf[role] = screenSamples(role, station);
    occluders.push(parts.body);
    const place = figurePlacement(role);
    for (const { label, yaw } of figureYaws(role)) {
      const figure = placed(member.model.metadata, FIGURE_PAYLOAD[role], place.at, yaw);
      figure.name = `${member.label} (${label})`;
      occluders.push(figure);
    }
  }
  const virgilConsole = placed(console3Metadata, console3Base64Payload, layout.consoleCentre, 0);
  virgilConsole.name = "Virgil's console";
  occluders.push(virgilConsole);
  for (const mesh of await virgilPoses()) occluders.push(mesh);
  return { occluders, bodyOf, samplesOf };
}

const VIEWPORTS = [
  { label: '1280×735 landscape', aspect: 1280 / 735 },
  { label: '390×599 portrait', aspect: 390 / 599 },
];

/** How far inside the frame a screen corner must land, as a fraction of the half-frame. */
const FRAME_MARGIN = 0.03;

describe('a close-up shows the whole of its station’s screen', () => {
  it('hides nothing of a screen that the console does not already hide', {
    timeout: 900_000,
  }, async () => {
    const set = await theSet();
    const raycaster = new THREE.Raycaster();
    const notes: string[] = [];
    for (const role of ROLES) {
      const samples = set.samplesOf[role];
      expect(samples.length, `${role}: screen samples`).toBeGreaterThan(50);
      // The reference: what is visible looking straight down the
      // screen's own normal from six metres off. The rest is under the
      // console's own bezel and no camera can ever see it.
      const axis = new THREE.Vector3(...screenAxis(role));
      const headOn = new THREE.Vector3(...screenCentre(role)).addScaledVector(axis, 6);
      const reference = visibleFrom(headOn, samples, [set.bodyOf[role]], raycaster);
      expect(
        reference.seen.length,
        `${role}: the console hides all of its own screen`,
      ).toBeGreaterThan(50);
      notes.push(
        `${role}: ${reference.seen.length}/${samples.length} samples visible head-on (${reference.blocked.length} under the console's own casing)`,
      );
      // And from the close-up: nothing may be behind anything.
      const pose = cameraPose('tabletop', role, VIEWPORTS[0]?.aspect ?? 16 / 9);
      const from = new THREE.Vector3(...pose.position);
      const seen = visibleFrom(from, reference.seen, set.occluders, raycaster);
      const worst = seen.blocked
        .slice(0, 5)
        .map(
          (b) =>
            `${b.by} at ${b.at.toFixed(2)} m covers (${b.point.x.toFixed(2)}, ${b.point.y.toFixed(2)}, ${b.point.z.toFixed(2)})`,
        );
      expect(
        worst,
        `${role}: ${seen.blocked.length} of ${reference.seen.length} visible screen samples are behind something from the close-up at ${pose.position.map((n) => n.toFixed(2)).join(', ')}`,
      ).toEqual([]);
    }
    // Recorded, not asserted: how much of each screen the model itself hides.
    expect(notes.length).toBe(3);
    console.log(notes.join('\n'));
  });

  it('holds the whole of the screen’s measured box inside the frame at both viewports', () => {
    for (const role of ROLES) {
      const corners = screenCorners(role).map((c) => new THREE.Vector3(...c));
      for (const viewport of VIEWPORTS) {
        const pose = cameraPose('tabletop', role, viewport.aspect);
        const camera = new THREE.PerspectiveCamera(pose.fov, viewport.aspect, 0.2, 400);
        camera.position.set(...pose.position);
        camera.lookAt(new THREE.Vector3(...pose.target));
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        let worst = 0;
        for (const corner of corners) {
          const ndc = corner.clone().project(camera);
          expect(
            ndc.z,
            `${role} at ${viewport.label}: the screen is in front of the camera`,
          ).toBeLessThan(1);
          worst = Math.max(worst, Math.abs(ndc.x), Math.abs(ndc.y));
        }
        expect(
          worst,
          `${role} at ${viewport.label}: the furthest corner of the screen sits at ${worst.toFixed(3)} of the half-frame with a ${pose.fov.toFixed(1)}° lens`,
        ).toBeLessThan(1 - FRAME_MARGIN);
      }
    }
  });

  it('poses the close-up on the screen’s own axis, and only widens the lens for the aspect', () => {
    for (const role of ROLES) {
      const wide = cameraPose('tabletop', role, VIEWPORTS[0]?.aspect ?? 16 / 9);
      const tall = cameraPose('tabletop', role, VIEWPORTS[1]?.aspect ?? 9 / 16);
      // Where it stands is the geometry's; only the lens answers the viewport.
      expect(wide.position, `${role}: the close-up stands in one place`).toEqual(tall.position);
      expect(wide.target, `${role}: the close-up looks at one point`).toEqual(tall.target);
      expect(tall.fov, `${role}: a phone needs the wider lens`).toBeGreaterThan(wide.fov);
      expect(wide.fov).toBeGreaterThanOrEqual(MIN_FOV);
      // The camera stands on the screen's own axis: its bearing from the
      // screen's centre is the measured mean normal's, in plan.
      const centre = screenCentre(role);
      const axis = screenAxis(role);
      const dx = wide.position[0] - centre[0];
      const dz = wide.position[2] - centre[2];
      const bearing = Math.atan2(dx, dz);
      const axisBearing = Math.atan2(axis[0], axis[2]);
      expect(
        Math.abs(Math.atan2(Math.sin(bearing - axisBearing), Math.cos(bearing - axisBearing))),
        `${role}: the close-up's bearing off the screen's own axis`,
      ).toBeLessThan(0.02);
      expect(
        wide.position[1],
        `${role}: the close-up is above the screen's centre`,
      ).toBeGreaterThan(centre[1]);
    }
  });

  it('bounds the orbit so that the pose it was given satisfies every bound', () => {
    for (const role of ROLES) {
      for (const viewport of VIEWPORTS) {
        const pose = cameraPose('tabletop', role, viewport.aspect);
        const limits = limitsFor('tabletop', role, pose);
        const dx = pose.position[0] - pose.target[0];
        const dy = pose.position[1] - pose.target[1];
        const dz = pose.position[2] - pose.target[2];
        const distance = Math.hypot(dx, dy, dz);
        const polar = Math.atan2(Math.hypot(dx, dz), dy);
        const azimuth = Math.atan2(dx, dz);
        const where = `${role} at ${viewport.label}`;
        // This is the shape of the V8 defect, held as a test: the wide
        // view's `minDistance: 6` clamped a 3.38 m close-up out to 6 m.
        expect(distance, `${where}: distance under minDistance`).toBeGreaterThanOrEqual(
          limits.minDistance,
        );
        expect(distance, `${where}: distance over maxDistance`).toBeLessThanOrEqual(
          limits.maxDistance,
        );
        expect(polar, `${where}: polar under minPolarAngle`).toBeGreaterThanOrEqual(
          limits.minPolarAngle,
        );
        expect(polar, `${where}: polar over maxPolarAngle`).toBeLessThanOrEqual(
          limits.maxPolarAngle,
        );
        expect(azimuth, `${where}: azimuth under minAzimuthAngle`).toBeGreaterThanOrEqual(
          limits.minAzimuthAngle,
        );
        expect(azimuth, `${where}: azimuth over maxAzimuthAngle`).toBeLessThanOrEqual(
          limits.maxAzimuthAngle,
        );
        expect(pose.fov, `${where}: the lens`).toBeLessThanOrEqual(MAX_FOV + 12);
      }
    }
  });
});
