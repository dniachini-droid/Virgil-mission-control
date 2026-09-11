import type { VisorMask } from '../characters/visorFit.js';
import { CAST, eyeHeight, figurePlacement, type Role, screenCentre } from './cast.js';
import type { CameraPose } from './palette.js';

/**
 * Where a close-up stands, derived from the console's own screen.
 *
 * The close-up views (`1`–`4`, `#/?cam=…`) exist to make one console's
 * screen readable — the owner's V8 direction (§0.10.2, §0.10.8): each
 * character at their console with the information on the console's own
 * screen, and a view that goes to them. V8 posed that camera by hand: out
 * in front of the character, well to one side, "so the camera looks past
 * the character's shoulder at the screen". Rendering the V8 artifact and
 * measuring showed what that obliquity costs.
 *
 * From V8's Prover close-up, **75 of the 139 sample points on his screen
 * that his console does not itself hide were behind something**: a dial on
 * his own console's face, and the Keeper's body, who stands almost exactly
 * on that sight line. `INSUFFICIENT_EVIDENCE`, the longest word the
 * demonstration shows, was clipped. From V8's Keeper close-up 23 of 215
 * were behind his console's own casing. And at 390 px wide the Fabricator's
 * screen needed a 44° lens and had 40, so its right-hand end was outside
 * the frame.
 *
 * So the close-up is no longer posed; it is **derived from the screen**:
 *
 *  - the camera stands **on the screen's own axis** — the mean normal that
 *    `asset-pipeline/fit-screen.mjs` measured over the console's own screen
 *    triangles, turned into the room by the station's yaw. Looking down a
 *    surface's own normal is the one direction from which nothing standing
 *    proud of that surface, on that surface's own object, can cover it;
 *  - at `DISTANCE` metres, and at `ELEVATION` of the screen's own rise, so
 *    the camera is a little above the axis rather than exactly on it —
 *    which is what clears the characters standing in front;
 *  - it aims a fraction `AIM` of the way from the screen's centre toward
 *    its character's eyes, so the character is in the shot beside their
 *    screen and their face and turn can be read;
 *  - its lens is **the angle the screen needs**: wide enough to hold the
 *    whole of the screen's measured box with `MARGIN` of air at this
 *    viewport's aspect, opened further toward holding the character too,
 *    and never wider than `MAX_FOV`. So a phone gets the wider lens a
 *    phone needs, and the screen is in the frame at every aspect by
 *    construction rather than by a number that happened to work at one.
 *
 * The **cost**, recorded rather than hidden: a camera on the screen's axis
 * cannot always hold both the screen and the character in a lens that is
 * not a fisheye — the characters stand about two metres in front of their
 * consoles and a metre to the side, which is up to 47° off the screen's
 * axis. Where the two do not fit, the lens stops at `MAX_FOV` and the
 * **screen wins**: the character may be cropped. That is a choice between
 * two things the owner asked for, made in favour of the one the view
 * exists for, and it is this file's to revisit if the owner disagrees.
 *
 * Every number below was chosen by measuring, not by eye:
 * `test/close-up-sight.test.ts` casts a ray from this pose to every sample
 * point of every screen against the whole set — all three consoles, all
 * three characters through the whole of their turn, Virgil's console and
 * the rigged Virgil through all three of his clips — and fails if any
 * point the console does not itself hide is behind anything.
 */

/** How far off the screen the camera stands, along the screen's axis. */
export const DISTANCE = 3.0;
/**
 * How much of the screen's own rise the camera takes. The screens tilt
 * back 12.6°–14.1°; at 1.25 of that the camera is 16°–18° above the
 * screen's centre, which is what clears the character standing in front of
 * the console and the console's own casing below the screen.
 */
export const ELEVATION = 1.25;
/** How far the camera swings off the axis about the vertical, in radians. Zero: it stands on it. */
export const SWING = 0;
/** How far from the screen's centre toward the character's eyes the camera aims. */
export const AIM = 0.3;
/** Air around the screen inside the frame: the lens holds the screen's box times this. */
export const MARGIN = 1.14;
/** The narrowest and widest lens a close-up may use. */
export const MIN_FOV = 26;
export const MAX_FOV = 52;

type Vec3 = [number, number, number];

/** The mask's measured screen box, as its eight corners in the station's own frame. */
function screenBoxLocal(mask: VisorMask): Vec3[] {
  const { min, max } = mask.measured.triangleBounds;
  const corners: Vec3[] = [];
  for (const x of [min[0] as number, max[0] as number]) {
    for (const y of [min[1] as number, max[1] as number]) {
      for (const z of [min[2] as number, max[2] as number]) corners.push([x, y, z]);
    }
  }
  return corners;
}

function yaw(v: Vec3, r: number): Vec3 {
  return [Math.cos(r) * v[0] + Math.sin(r) * v[2], v[1], -Math.sin(r) * v[0] + Math.cos(r) * v[2]];
}

/** The screen's measured box, in the room. */
export function screenCorners(role: Role): Vec3[] {
  const member = CAST[role];
  const mask = member.station.screen as VisorMask;
  const [ax, ay, az] = member.at;
  return screenBoxLocal(mask).map((corner) => {
    const [x, y, z] = yaw(corner, member.rotationY);
    return [ax + x, ay + y, az + z] as Vec3;
  });
}

/**
 * The screen's own axis in the room: the outward direction of the mean
 * normal `fit-screen.mjs` measured, turned by the station's yaw.
 */
export function screenAxis(role: Role): Vec3 {
  const mask = CAST[role].station.screen as VisorMask;
  const normal = mask.measured.meanNormal as number[] | undefined;
  if (!normal) throw new Error(`${role}: the screen mask carries no mean normal`);
  const length = Math.hypot(normal[0] as number, normal[1] as number, normal[2] as number);
  const unit: Vec3 = [
    (normal[0] as number) / length,
    (normal[1] as number) / length,
    (normal[2] as number) / length,
  ];
  return yaw(unit, CAST[role].rotationY);
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function unit(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/**
 * The vertical field of view that holds every one of `points` inside the
 * frame, looking from `from` at `at` with this aspect. Pure trigonometry
 * on the camera's own basis, so the framing is answerable to the geometry
 * at any viewport rather than to a number read off one screenshot.
 */
export function fovFor(from: Vec3, at: Vec3, points: Vec3[], aspect: number): number {
  const forward = unit(subtract(at, from));
  const right = unit(cross(forward, [0, 1, 0]));
  const up = unit(cross(right, forward));
  let tangent = 0;
  for (const point of points) {
    const v = subtract(point, from);
    const depth = dot(v, forward);
    if (depth <= 0.05) return 180;
    tangent = Math.max(
      tangent,
      Math.abs(dot(v, up)) / depth,
      Math.abs(dot(v, right)) / (depth * aspect),
    );
  }
  return 2 * Math.atan(tangent) * (180 / Math.PI);
}

/** Where the character's eyes are, in the room: the point the close-up wants beside the screen. */
export function eyePoint(role: Role): Vec3 {
  const { at } = figurePlacement(role);
  return [at[0], eyeHeight(role), at[2]];
}

/**
 * The close-up for a role at a viewport's aspect: on the screen's own
 * axis, aimed between the screen and its character, with the lens the
 * screen needs.
 */
export function closeUpPose(role: Role, aspect: number): CameraPose {
  const centre = screenCentre(role) as Vec3;
  const axis = screenAxis(role);
  // The axis, swung about the vertical and re-pitched to ELEVATION of its
  // own rise, so the direction is the screen's and only its steepness is
  // this file's choice.
  const rise = Math.asin(Math.max(-1, Math.min(1, axis[1])));
  const flat = Math.hypot(axis[0], axis[2]) || 1;
  const swung = yaw([axis[0] / flat, 0, axis[2] / flat], SWING);
  const pitch = rise * ELEVATION;
  const position: Vec3 = [
    centre[0] + swung[0] * DISTANCE * Math.cos(pitch),
    centre[1] + DISTANCE * Math.sin(pitch),
    centre[2] + swung[2] * DISTANCE * Math.cos(pitch),
  ];
  const eyes = eyePoint(role);
  const target: Vec3 = [
    centre[0] + (eyes[0] - centre[0]) * AIM,
    centre[1] + (eyes[1] - centre[1]) * AIM,
    centre[2] + (eyes[2] - centre[2]) * AIM,
  ];
  const corners = screenCorners(role);
  const screenFov = fovFor(position, target, corners, aspect) * MARGIN;
  const withCharacter = fovFor(position, target, [...corners, eyes], aspect) * MARGIN;
  // Wide enough for the screen **always** — `MAX_FOV` does not cap that,
  // because a cropped screen is the defect this file exists to stop —
  // and wider for the character where a lens that is not a fisheye can
  // hold both.
  const fov = Math.max(MIN_FOV, screenFov, Math.min(withCharacter, MAX_FOV));
  return { position, target, fov };
}
