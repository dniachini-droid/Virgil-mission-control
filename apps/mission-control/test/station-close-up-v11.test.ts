import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  buildGeometry,
  decodeMeshyPayload,
  type MeshyAssetMetadata,
} from '../src/world/assets/meshyAsset.js';
import { BREATH_EXTREMES } from '../src/world/characters/breathing.js';
import { OVERSHOOT } from '../src/world/characters/locomotion.js';
import type { VisorMask } from '../src/world/characters/visorFit.js';
import { orientationFor } from '../src/world/mobile/composition.js';
import { mobileLimits } from '../src/world/mobile/MobileRoom.js';
import {
  AIM,
  BUST_FROM,
  BUST_HALF,
  bustPoints,
  clusterPoints,
  ELEVATION,
  FIGURE_TOP,
  facePoints,
  LENS,
  MARGIN,
  MAX_DISTANCE,
  MIN_DISTANCE,
  SCREEN,
  SWING,
  screenAt,
  screenKept,
  solveDistance,
  stationCloseUpPose,
  TILT,
} from '../src/world/mobile/stationCloseUp.js';
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
import { closeUpPose, screenAxis, screenCorners } from '../src/world/room/closeUp.js';
import { layout } from '../src/world/room/palette.js';
import { v11Cluster } from '../src/world/screens/v11/bank.js';

/**
 * **A V11 station close-up shows the character at their station, and the
 * primary state on their console's screen.**
 *
 * The oldest open visual defect in the project: V8.1 measured that no pose in
 * the family it searched — 242 candidates — held both the whole of a console's
 * screen and its character for all three roles at a phone's aspect, chose the
 * screen, and recorded that the characters were "largely cropped in their own
 * close-up" as a loss against the owner's V8 §0.10.8 direction. V9 deferred
 * it, V11 stage 2 deferred it again and named the remedy. The owner has now
 * asked for it, and stage 3's window removed the premise that made the screen
 * have to win: the window carries the whole of the hop, so the screen has to
 * carry its **state**, not its text.
 *
 * `mobile/stationCloseUp.ts` is that pose. This file holds it, and everything
 * here is measured from the set's own geometry rather than quoted:
 *
 *  1. **the character is in the frame**, from mid-shin to over the crown and
 *     `BUST_HALF` either side, with air around them, at every viewport;
 *  2. **the part of the screen the primary state is drawn on is in the frame**,
 *     at every viewport;
 *  3. **nothing hides any of that screen that the console does not already
 *     hide** — a ray from the pose to every sample of the console's own screen
 *     triangles, against the whole set: the three console bodies, the three
 *     characters at every yaw of their turn including the overshoot and both
 *     breathing extremes, Virgil's console, and **Virgil's three slabs**, which
 *     `close-up-sight.test.ts` could leave out at 3 m and this pose cannot;
 *  4. **the character is not behind anything either**, which is the check the
 *     old file never made and the first frames of this pass needed: at a low
 *     elevation and six metres out, Virgil's own console stands in front of the
 *     Prover's torso;
 *  5. **the camera is on the screen's own axis, swung by `SWING` and no more**,
 *     so the property V8.1 established is kept and stated;
 *  6. **the pose satisfies every orbit bound `mobileLimits` hands the
 *     controls** — the shape of the V8 defect, where the previous view's
 *     `minDistance` clamped a close-up 2.62 m backwards into Virgil's head;
 *  7. **V10's own close-up is untouched**, asserted by computing it here.
 *
 * And two things are **measured and printed rather than asserted**, because
 * they are costs and not requirements: how much of each screen the frame gives
 * up, and how much of Virgil's slab cluster is in shot. The run record carries
 * both.
 */

const VIEWPORTS: [string, number, number][] = [
  ['390×844 portrait', 390, 844],
  ['430×932 portrait', 430, 932],
  ['844×390 landscape', 844, 390],
];

/** A placed static model, as `Models.tsx` places it. */
function placed(
  metadata: MeshyAssetMetadata,
  base64: string,
  at: readonly [number, number, number],
  rotationY: number,
  name: string,
): THREE.Mesh {
  const geometry = buildGeometry(metadata, decodeMeshyPayload(metadata, base64));
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const { scale, positionScale, baseOffsetY } = metadata.runtime;
  mesh.scale.setScalar(scale * positionScale);
  mesh.position.set(at[0], at[1] + baseOffsetY, at[2]);
  mesh.rotation.y = rotationY;
  mesh.name = name;
  mesh.updateMatrixWorld(true);
  return mesh;
}

function soup(name: string, vertices: number[]): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  mesh.name = name;
  mesh.updateMatrixWorld(true);
  return mesh;
}

/** A console's own triangles with its screen removed: what the model itself hides. */
function consoleBody(role: Role, station: THREE.Mesh): THREE.Mesh {
  const mask = CAST[role].station.screen as VisorMask;
  const index = station.geometry.index as THREE.BufferAttribute;
  const position = station.geometry.getAttribute('position');
  const screen = new Set(mask.triangles);
  const body: number[] = [];
  const p = new THREE.Vector3();
  for (let t = 0; t < index.count / 3; t += 1) {
    if (screen.has(t)) continue;
    for (let k = 0; k < 3; k += 1) {
      p.fromBufferAttribute(position, index.getX(t * 3 + k)).applyMatrix4(station.matrixWorld);
      body.push(p.x, p.y, p.z);
    }
  }
  return soup(`${role} console body`, body);
}

/**
 * Points spread over a console's own screen triangles, in the room, each
 * carrying the `u` of the screen's own rectangle it lies nearest — so the
 * third of the screen the **primary state** is drawn on can be counted
 * separately from the micro-rail at the far end. Lifted 2 mm along the
 * screen's own normal so a ray reaches them rather than grazing their plane.
 */
function screenSamples(
  role: Role,
  station: THREE.Mesh,
): { point: THREE.Vector3; u: number; v: number }[] {
  const mask = CAST[role].station.screen as VisorMask;
  const index = station.geometry.index as THREE.BufferAttribute;
  const position = station.geometry.getAttribute('position');
  const lift = new THREE.Vector3(...screenAxis(role)).multiplyScalar(0.002);
  const at = screenAt(role);
  // The rectangle's own end points, to turn a room point back into a u.
  const left = new THREE.Vector3(...at(-1, 0));
  const right = new THREE.Vector3(...at(1, 0));
  const span = right.clone().sub(left);
  const lengthSq = span.lengthSq();
  const foot = new THREE.Vector3(...at(0, -1));
  const head = new THREE.Vector3(...at(0, 1));
  const rise = head.clone().sub(foot);
  const riseSq = rise.lengthSq();
  const seen = new Set<string>();
  const out: { point: THREE.Vector3; u: number; v: number }[] = [];
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
        const along = p.clone().sub(left).dot(span) / lengthSq;
        const up = p.clone().sub(foot).dot(rise) / riseSq;
        out.push({ point: p.clone(), u: -1 + 2 * along, v: -1 + 2 * up });
      }
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
  for (const breath of BREATH_EXTREMES) {
    yaws.push({ label: 'front, swayed', yaw: front.rotationY + breath.yaw });
    yaws.push({ label: 'at the screen, swayed', yaw: atScreen.rotationY + breath.yaw });
  }
  return yaws;
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

/** Virgil's three slabs as boxes of their own measured overall size. */
const SLAB = { width: 1.54, height: 1.04, depth: 0.2 };
function slabMeshes(): THREE.Mesh[] {
  return v11Cluster('portrait').map((placement) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(
        SLAB.width * placement.scale,
        SLAB.height * placement.scale,
        SLAB.depth,
      ),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    );
    mesh.position.set(...placement.position);
    mesh.rotation.set(...placement.rotation);
    mesh.name = `Virgil's ${placement.kind} slab`;
    mesh.updateMatrixWorld(true);
    return mesh;
  });
}

interface TheSet {
  occluders: THREE.Mesh[];
  bodyOf: Record<Role, THREE.Mesh>;
  samplesOf: Record<Role, { point: THREE.Vector3; u: number; v: number }[]>;
  figuresOf: Record<Role, THREE.Mesh[]>;
}

function theSet(): TheSet {
  const occluders: THREE.Mesh[] = [];
  const bodyOf = {} as Record<Role, THREE.Mesh>;
  const samplesOf = {} as Record<Role, { point: THREE.Vector3; u: number; v: number }[]>;
  const figuresOf = {} as Record<Role, THREE.Mesh[]>;
  for (const role of ROLES) {
    const member = CAST[role];
    const station = placed(
      member.station.metadata,
      STATION_PAYLOAD[role],
      member.at,
      member.rotationY,
      `${role} station`,
    );
    bodyOf[role] = consoleBody(role, station);
    samplesOf[role] = screenSamples(role, station);
    occluders.push(bodyOf[role]);
    const place = figurePlacement(role);
    figuresOf[role] = figureYaws(role).map(({ label, yaw }) =>
      placed(
        member.model.metadata,
        FIGURE_PAYLOAD[role],
        place.at,
        yaw,
        `${member.label} (${label})`,
      ),
    );
    for (const figure of figuresOf[role]) occluders.push(figure);
  }
  occluders.push(
    placed(console3Metadata, console3Base64Payload, layout.consoleCentre, 0, "Virgil's console"),
  );
  for (const slab of slabMeshes()) occluders.push(slab);
  return { occluders, bodyOf, samplesOf, figuresOf };
}

/** How near a sample a hit has to be to count as the surface itself. */
const GRAZE = 0.004;

function blockedBy(
  from: THREE.Vector3,
  points: THREE.Vector3[],
  meshes: THREE.Mesh[],
  raycaster: THREE.Raycaster,
): (string | null)[] {
  return points.map((point) => {
    const direction = point.clone().sub(from);
    const distance = direction.length();
    raycaster.set(from, direction.normalize());
    raycaster.near = 0;
    raycaster.far = distance - GRAZE;
    const hits = raycaster.intersectObjects(meshes, false);
    return hits.length ? ((hits[0] as THREE.Intersection).object.name ?? 'something') : null;
  });
}

function cameraFor(
  pose: { position: [number, number, number]; target: [number, number, number]; fov: number },
  aspect: number,
): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(pose.fov, aspect, 0.05, 400);
  camera.position.set(...pose.position);
  camera.lookAt(new THREE.Vector3(...pose.target));
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return camera;
}

/** The furthest any of `points` sits from the frame's centre, as a fraction of the half-frame. */
function worstInFrame(camera: THREE.PerspectiveCamera, points: [number, number, number][]): number {
  let worst = 0;
  for (const point of points) {
    const ndc = new THREE.Vector3(...point).project(camera);
    if (ndc.z >= 1) return Number.POSITIVE_INFINITY;
    worst = Math.max(worst, Math.abs(ndc.x), Math.abs(ndc.y));
  }
  return worst;
}

/** How far inside the frame a required point must land. */
const FRAME_MARGIN = 0.02;

/**
 * The region of a console's glass the **primary state** is drawn in, in the
 * screen's own (u, v): the left of the canvas, clear of the header rail above
 * and the band, foot and micro-rail below (`screens/v11/chrome.ts`,
 * `heroRect`). Taken wider than the rect, so it is a bound and not a fit.
 */
const HERO = { u: -0.25, v: 0.6 };

/** The most of one screen's samples that may be behind anything at all. */
const BLOCKED_BOUND = 8;

describe('the V11 station close-up frames the character', () => {
  it('holds the character and the primary-state end of their screen, with air', () => {
    for (const [label, width, height] of VIEWPORTS) {
      const aspect = width / height;
      const orientation = orientationFor(aspect);
      for (const role of ROLES) {
        const pose = stationCloseUpPose(role, aspect, orientation);
        const camera = cameraFor(pose, aspect);
        expect(
          worstInFrame(camera, bustPoints(role)),
          `${label} ${role}: the character sits at this fraction of the half-frame`,
        ).toBeLessThan(1 - FRAME_MARGIN);
        expect(
          worstInFrame(camera, screenKept(role)),
          `${label} ${role}: the screen's primary-state end sits at this fraction of the half-frame`,
        ).toBeLessThan(1 - FRAME_MARGIN);
        expect(
          worstInFrame(camera, facePoints(role)),
          `${label} ${role}: the character's face sits at this fraction of the half-frame`,
        ).toBeLessThan(1 - FRAME_MARGIN);
      }
    }
  });

  it('makes the character substantially of the frame, not a sliver at its edge', () => {
    // The acceptance test the owner set is judged from frames, which a test
    // cannot do. What a test can hold is that the character is not a sliver:
    // their head-and-torso box spans at least this much of the frame's height.
    const FLOOR = 0.3;
    for (const [label, width, height] of VIEWPORTS) {
      const aspect = width / height;
      const orientation = orientationFor(aspect);
      for (const role of ROLES) {
        const camera = cameraFor(stationCloseUpPose(role, aspect, orientation), aspect);
        const ys = bustPoints(role).map((p) => new THREE.Vector3(...p).project(camera).y);
        const span = (Math.max(...ys) - Math.min(...ys)) / 2;
        expect(
          span,
          `${label} ${role}: the character spans this much of the frame's height`,
        ).toBeGreaterThan(FLOOR);
      }
    }
  });

  it('stands on the screen’s own axis, swung by SWING and no more', () => {
    for (const [label, width, height] of VIEWPORTS) {
      const aspect = width / height;
      const orientation = orientationFor(aspect);
      for (const role of ROLES) {
        const pose = stationCloseUpPose(role, aspect, orientation);
        const centre = screenCentre(role);
        const axis = screenAxis(role);
        const bearing = Math.atan2(pose.position[0] - centre[0], pose.position[2] - centre[2]);
        const axisBearing = Math.atan2(axis[0], axis[2]);
        const off = Math.atan2(
          Math.sin(bearing - axisBearing - SWING),
          Math.cos(bearing - axisBearing - SWING),
        );
        expect(
          Math.abs(off),
          `${label} ${role}: the pose's bearing off the screen's axis, less SWING`,
        ).toBeLessThan(0.01);
        expect(
          pose.position[1],
          `${label} ${role}: the camera is above the screen's centre`,
        ).toBeGreaterThan(centre[1]);
      }
    }
  });

  it('solves the distance inside its bounds and keeps the lens at LENS', () => {
    for (const [label, width, height] of VIEWPORTS) {
      const aspect = width / height;
      const orientation = orientationFor(aspect);
      for (const role of ROLES) {
        const tilt = orientation === 'portrait' ? TILT : 0;
        const distance = solveDistance(role, aspect, tilt);
        expect(distance, `${label} ${role}: distance`).toBeGreaterThan(MIN_DISTANCE);
        expect(distance, `${label} ${role}: distance`).toBeLessThan(MAX_DISTANCE);
        expect(
          stationCloseUpPose(role, aspect, orientation).fov,
          `${label} ${role}: the lens the solve landed on`,
        ).toBeCloseTo(LENS, 6);
      }
    }
  });

  it('satisfies every orbit bound mobileLimits gives the controls', () => {
    for (const [label, width, height] of VIEWPORTS) {
      const aspect = width / height;
      const orientation = orientationFor(aspect);
      for (const role of ROLES) {
        const pose = stationCloseUpPose(role, aspect, orientation);
        const limits = mobileLimits(pose, role);
        const dx = pose.position[0] - pose.target[0];
        const dy = pose.position[1] - pose.target[1];
        const dz = pose.position[2] - pose.target[2];
        const distance = Math.hypot(dx, dy, dz);
        const polar = Math.atan2(Math.hypot(dx, dz), dy);
        const azimuth = Math.atan2(dx, dz);
        const where = `${label} ${role}`;
        expect(distance, `${where}: under minDistance`).toBeGreaterThanOrEqual(limits.minDistance);
        expect(distance, `${where}: over maxDistance`).toBeLessThanOrEqual(limits.maxDistance);
        expect(polar, `${where}: under minPolarAngle`).toBeGreaterThanOrEqual(limits.minPolarAngle);
        expect(polar, `${where}: over maxPolarAngle`).toBeLessThanOrEqual(limits.maxPolarAngle);
        expect(azimuth, `${where}: under minAzimuthAngle`).toBeGreaterThanOrEqual(
          limits.minAzimuthAngle,
        );
        expect(azimuth, `${where}: over maxAzimuthAngle`).toBeLessThanOrEqual(
          limits.maxAzimuthAngle,
        );
      }
    }
  });

  it('leaves V10’s own close-up exactly where V10 puts it', () => {
    // `room/closeUp.ts` is not edited by this work and V10's route still uses
    // it. Its own numbers are asserted by `close-up-sight.test.ts`; what is
    // asserted here is that the V11 pose is a **different** camera, so a
    // future edit that made `mobilePose` fall back to V10's would fail.
    const aspect = 390 / 844;
    for (const role of ROLES) {
      const ten = closeUpPose(role, aspect);
      const eleven = stationCloseUpPose(role, aspect, 'portrait');
      const moved = Math.hypot(
        ten.position[0] - eleven.position[0],
        ten.position[1] - eleven.position[1],
        ten.position[2] - eleven.position[2],
      );
      expect(moved, `${role}: how far the V11 close-up stands from V10's`).toBeGreaterThan(1.5);
      expect(eleven.fov, `${role}: V11's lens is narrower than V10's`).toBeLessThan(ten.fov);
    }
  });

  it('hides nothing of a screen that the console does not already hide, and nothing of the character', {
    timeout: 900_000,
  }, () => {
    const set = theSet();
    const raycaster = new THREE.Raycaster();
    const notes: string[] = [];
    for (const [label, width, height] of VIEWPORTS) {
      const aspect = width / height;
      const orientation = orientationFor(aspect);
      for (const role of ROLES) {
        const samples = set.samplesOf[role];
        expect(samples.length, `${role}: screen samples`).toBeGreaterThan(50);
        // The reference: what a camera looking straight down the screen's
        // own normal from six metres can see. The rest is under the console's
        // own bezel and no camera anywhere can see it.
        const axis = new THREE.Vector3(...screenAxis(role));
        const headOn = new THREE.Vector3(...screenCentre(role)).addScaledVector(axis, 6);
        const reference = blockedBy(
          headOn,
          samples.map((s) => s.point),
          [set.bodyOf[role]],
          raycaster,
        );
        const unhidden = samples.filter((_, i) => reference[i] === null);
        expect(unhidden.length, `${role}: the console hides all of its own screen`).toBeGreaterThan(
          50,
        );

        const pose = stationCloseUpPose(role, aspect, orientation);
        const from = new THREE.Vector3(...pose.position);
        const hits = blockedBy(
          from,
          unhidden.map((s) => s.point),
          set.occluders,
          raycaster,
        );
        const blocked = unhidden
          .map((s, i) => ({ s, by: hits[i] }))
          .filter((r) => r.by !== null && r.by !== undefined);
        /**
         * **The requirement, and why it is not "nothing at all".**
         *
         * The owner's instruction for this pass is that the screen "should
         * be present and its primary state readable; it no longer has to be
         * whole or unoccluded". So the bar is the primary state, and the
         * primary state has a place on the glass: `screens/v11/chrome.ts`
         * draws it in `heroRect`, which is the left of the canvas — the
         * character's own side — between the header rail at the top and the
         * band, foot and micro-rail at the bottom. `HERO` below is that
         * region in the screen's own (u, v), taken conservatively wider
         * than the rect.
         *
         * Measured at 390 × 844: the Fabricator's own shoulder covers 5 of
         * the 132 samples of his glass when he faces front, all of them in
         * the **bottom** 10 % of it at u −0.84 to −0.95, which is the foot
         * of the micro-rail. Nothing covers any of the other two screens at
         * any yaw. So what is asserted is the honest pair: **nothing in the
         * primary state's own region is ever behind anything**, and the
         * total is bounded, so a future change that started eating the
         * glass would fail here rather than pass quietly.
         */
        const inHero = blocked.filter((r) => r.s.u <= HERO.u && Math.abs(r.s.v) <= HERO.v);
        expect(
          inHero
            .slice(0, 5)
            .map(
              (r) =>
                `${r.by} covers the primary state at u ${r.s.u.toFixed(2)}, v ${r.s.v.toFixed(2)}`,
            ),
          `${label} ${role}: ${inHero.length} samples of the primary state's own region are behind something from (${pose.position.map((n) => n.toFixed(2)).join(', ')})`,
        ).toEqual([]);
        expect(
          blocked.length,
          `${label} ${role}: ${blocked.length} of ${unhidden.length} visible screen samples are behind something (${[...new Set(blocked.map((r) => r.by))].join(', ')})`,
        ).toBeLessThanOrEqual(BLOCKED_BOUND);

        // And the character. Everything in the set except this character's
        // own body, which is allowed to hide itself.
        const others = set.occluders.filter((mesh) => !set.figuresOf[role].includes(mesh));
        const bust = bustPoints(role).map((p) => new THREE.Vector3(...p));
        const behind = blockedBy(from, bust, others, raycaster).filter((n) => n !== null);
        expect(
          behind.slice(0, 5),
          `${label} ${role}: ${behind.length} of ${bust.length} points of the character are behind something`,
        ).toEqual([]);
        const who = [...new Set(blocked.map((r) => r.by))].join(', ') || 'nothing';
        notes.push(
          `${label} ${role}: ${unhidden.length}/${samples.length} screen samples the console does not hide; ${blocked.length} of those behind something from the close-up (${who}), 0 in the primary state's own region; the character 0/${bust.length} behind anything`,
        );
      }
    }
    expect(notes.length).toBe(VIEWPORTS.length * ROLES.length);
    console.log(notes.join('\n'));
  });

  it('records what each pose gives up, rather than asserting it away', () => {
    // Measured, printed, and carried into the run record: how much of each
    // screen the frame keeps, and how much of Virgil's slab cluster is in it.
    // Neither is a requirement — the owner's instruction is that the screen
    // "no longer has to be whole or unoccluded" — so neither is asserted
    // beyond the floor below, which is this project's own measured legibility
    // threshold rather than a preference.
    const lines: string[] = [];
    for (const [label, width, height] of VIEWPORTS) {
      const aspect = width / height;
      const orientation = orientationFor(aspect);
      const cluster = clusterPoints(orientation);
      for (const role of ROLES) {
        const pose = stationCloseUpPose(role, aspect, orientation);
        const camera = cameraFor(pose, aspect);
        const at = screenAt(role);
        const grid: THREE.Vector3[] = [];
        for (let i = 0; i <= 12; i += 1) {
          for (let j = 0; j <= 12; j += 1)
            grid.push(new THREE.Vector3(...at(-1 + i / 6, -1 + j / 6)));
        }
        const projected = grid.map((p) => p.clone().project(camera));
        const inside = projected.filter((q) => Math.abs(q.x) < 1 && Math.abs(q.y) < 1 && q.z < 1);
        const share = inside.length / projected.length;
        const visibleWidth =
          ((Math.max(...inside.map((q) => q.x)) - Math.min(...inside.map((q) => q.x))) / 2) * width;
        // The whole screen's width at this scale, which is what the type size
        // is answerable to. `PHASE_1_CONVERSATION_INTERFACE.md`: screen text
        // collapses below about 64 CSS px of display width.
        const wholeWidth =
          ((Math.max(...projected.map((q) => q.x)) - Math.min(...projected.map((q) => q.x))) / 2) *
          width;
        expect(
          wholeWidth,
          `${label} ${role}: the screen's width at this distance, against the 64 px collapse threshold`,
        ).toBeGreaterThan(96);
        const clusterInFrame = cluster
          .map((p) => new THREE.Vector3(...p).project(camera))
          .filter((q) => Math.abs(q.x) <= 1 && Math.abs(q.y) <= 1 && q.z < 1);
        const lowest = clusterInFrame.length
          ? ((1 - Math.max(...clusterInFrame.map((q) => q.y))) / 2) * height
          : Number.NaN;
        const deepest = clusterInFrame.length
          ? ((1 - Math.min(...clusterInFrame.map((q) => q.y))) / 2) * height
          : Number.NaN;
        const facePx =
          ((Math.max(...facePoints(role).map((p) => new THREE.Vector3(...p).project(camera).y)) -
            Math.min(...facePoints(role).map((p) => new THREE.Vector3(...p).project(camera).y))) /
            2) *
          height;
        lines.push(
          `${label} ${role}: screen ${(share * 100).toFixed(0)}% in frame, ${visibleWidth.toFixed(0)} of ${wholeWidth.toFixed(0)} CSS px wide; face ${facePx.toFixed(0)} px; slab cluster ${clusterInFrame.length}/${cluster.length} sample points in frame${clusterInFrame.length ? `, from the top of the frame down to ${deepest.toFixed(0)} px (its own top edge at ${lowest.toFixed(0)} px)` : ''}`,
        );
      }
    }
    console.log(lines.join('\n'));
    expect(lines.length).toBe(VIEWPORTS.length * ROLES.length);
  });

  it('keeps every constant of the pose where the search left it', () => {
    // A guard, not a tautology: these are the numbers the run record quotes,
    // and a silent edit to one of them would make the record wrong.
    expect(SWING).toBeCloseTo(6 * (Math.PI / 180), 12);
    expect(ELEVATION).toBe(0.7);
    expect(AIM).toBe(0.85);
    expect(LENS).toBe(52);
    expect(MARGIN).toBe(1.06);
    expect(BUST_FROM).toBe(0.35);
    expect(FIGURE_TOP).toBe(1.74);
    expect(BUST_HALF).toBe(0.42);
    expect(TILT).toBe(0.2);
    expect(SCREEN).toBe(0.6);
    // The Fabricator is the widest character; BUST_HALF must hold his shoulder.
    const wide = CAST.fabricator.model.metadata;
    const halfWidth =
      Math.max(
        Math.abs(wide.measured.boundsMax[0] as number),
        Math.abs(wide.measured.boundsMin[0] as number),
      ) * wide.runtime.scale;
    expect(BUST_HALF, 'BUST_HALF holds the widest character’s shoulder').toBeGreaterThan(
      halfWidth * 0.7,
    );
    // And the whole screen is still what `closeUp.ts` frames, unchanged.
    expect(screenCorners('fabricator').length).toBe(8);
  });
});
