import {
  CAST,
  eyeHeight,
  figurePlacement,
  placedReach,
  type Role,
  screenCentre,
} from '../room/cast.js';
import { fovFor, screenAxis } from '../room/closeUp.js';
import type { CameraPose } from '../room/palette.js';
import { type ClusterOrientation, v11Cluster } from '../screens/v11/bank.js';

/** Virgil's slab, as `screens/v11/ScreenBankV11.tsx` builds it (`V11_SLAB`). */
const SLAB_OUTER_WIDTH = 1.54;
const SLAB_OUTER_HEIGHT = 1.04;
const SLAB_DEPTH = 0.2;

/**
 * **The V11 station close-up: the character at their console, with the
 * console's screen present beside them.**
 *
 * This is the repair of the oldest open visual defect in the project. V8.1
 * found that the three station close-ups showed the console and cropped the
 * character out of their own shot; V9 deferred it to the panel pass; V11
 * stage 2 deferred it again and named the remedy. It contradicts the owner's
 * V8 §0.10.8 direction — *"have each agent at the console, sightly to the
 * left so it doesnt obstruct the screens, faciung forward"* — and the V11
 * brief's requirement that the Fabricator, the Prover and the Keeper stay
 * recognisable.
 *
 * **Why V8.1 could not fix it, and why this can.** `room/closeUp.ts` frames
 * the whole of the screen from 3.0 m on the screen's own axis, because at
 * V8.1 the console screen had to carry the full text of the hop: it was the
 * only place the reader could read what had happened. Holding the whole of
 * that screen at 390 CSS px takes a 67°–71° lens whose horizontal half-angle
 * is 17.1°, and the character stands about two metres in front of their
 * console and up to 47° off the screen's axis, so the two cannot both be in
 * that frame. V8.1 searched 242 poses, found none that held both for all
 * three roles, and chose the screen. That was the right choice **then**.
 *
 * **Stage 3 removed the premise.** The full-screen window
 * (`window/AgentWindow.tsx`) now carries the whole of the hop — the
 * conclusion, what it means, what happens next, and the evidence — so the
 * in-world screen no longer has to be read word for word. It has to be
 * *present*, and its **primary state** has to read. That frees the frame for
 * the character, which is what the owner asked for in the first place.
 *
 * **What is required of the frame, and what is not.** The frame must hold:
 *
 *  - the character from `BUST_FROM` up to `FIGURE_TOP` and `BUST_HALF` to
 *    either side of where they stand — head and torso, the part that makes
 *    them recognisable. Their legs and feet may fall outside it, and at
 *    these distances they usually do;
 *  - every corner of the screen's own measured box, which — measured, below
 *    — the solved distance turns out to give for nothing on all three
 *    consoles. So the screen is in fact still whole, and this file does not
 *    *require* it to be: `SCREEN` is the fraction of the screen's width,
 *    measured from the character's own edge of it, that the frame must hold.
 *    It is 1 because 1 costs nothing here, and it is a parameter rather than
 *    an assumption so that a later change to the set which does make it cost
 *    something fails a measurement instead of quietly cropping the state.
 *
 * **Which edge is croppable is not arbitrary.** The primary state — the hero
 * term, `BUILDING`, `VERIFYING`, `SAFE TO MERGE` — is drawn at the **left**
 * of the display canvas (`screens/v11/chrome.ts`, `heroRect`), and the canvas
 * maps its left edge onto the station's own −x side
 * (`screens/screenPlane.ts`: `right = up × normal`, so the canvas's u runs
 * along the station's +x). The character stands at `STAND_SIDE` = −0.88 in
 * that same frame, which is *past* the screen's −x edge. So the primary state
 * is on the character's side of the glass: a frame that keeps the character
 * and loses the far edge of the screen loses the micro-rail, never the state.
 *
 * **How the pose is arrived at.** The camera keeps the one property V8.1
 * established and this file may not lose — it stands on the screen's own
 * measured axis, which is the direction from which nothing standing proud of
 * the console can cover the screen — swung `SWING` toward the character and
 * pitched to `ELEVATION` of the axis's own rise. Only its **distance** is
 * solved, and it is solved rather than chosen: the smallest distance at which
 * the required points fit inside `LENS` at this viewport's aspect, by
 * bisection over `fovFor`, the same function `closeUp.ts` and
 * `composition.ts` use. Change a console's position, a character's height or
 * a model, and the distance follows.
 *
 * That is stage 2's own named remedy — *"standing the camera further back
 * along the same axis"* — carried out with the lens held instead of the
 * screen's on-screen size, which is the part stage 2 could not have without
 * stage 3's window.
 *
 * **What it costs**, measured at 390 × 844 and recorded in the run record
 * rather than argued here: the screens fall from 200 / 174 / 177 CSS px wide
 * to about 148 / 153 / 140, which is 2.2–2.4× this project's own measured
 * 64 px collapse threshold (`PHASE_1_CONVERSATION_INTERFACE.md`), so the
 * primary state reads and the four-column micro-rail does not — which is
 * what stage 2 says that rail is for.
 *
 * **V10 is untouched.** `room/closeUp.ts` is not edited and V10's own
 * close-ups still come from it, byte for byte; this file is reached only from
 * `mobilePose`, which only the V11 entry mounts.
 * `test/station-close-up-v11.test.ts` holds every number below against the
 * set's own geometry and casts rays from the solved pose.
 */

type Vec3 = [number, number, number];

/**
 * How far the camera swings off the screen's axis, **away from the
 * character**, in radians. Six degrees, and the six is measured rather than
 * chosen.
 *
 * At a close-up distance of three metres the character stands well clear of
 * their own glass in the frame, because perspective throws them 1.5 to 3
 * times their real offset. From five or six metres out that factor falls
 * toward 1 and the **Fabricator's own arm and backpack cross the left end of
 * his screen** — which is the end the primary state is drawn on. Rays from
 * the pose to the 73 samples of his screen his console does not itself hide,
 * with him in his front-facing pose, are blocked at:
 *
 * | swing | −8° | −4° | 0° | +3° | **+6°** | +10° |
 * |---|---|---|---|---|---|---|
 * | of 73 | 13 | 7 | 4 | 3 | **0** | 0 |
 * | of the 26 in the hero third | 12 | 7 | 4 | 3 | **0** | 0 |
 *
 * and the first built frame of this pass showed exactly that: `STANDBY` read
 * as `ANDBY`. At +6° all three screens are wholly unoccluded at every yaw of
 * the turn, and the Prover's and the Keeper's are at 0° too. What the swing
 * costs is 0.1–0.9 m of extra distance and about four CSS pixels of face.
 * Beyond +10° it buys nothing and keeps costing.
 */
export const SWING = 6 * (Math.PI / 180);
/**
 * How much of the screen's own rise the camera takes. It is **bounded from
 * both sides by the set**, and both bounds are measured:
 *
 *  - **above.** V10's close-up takes 1.25 and looks down onto the glass from
 *    3 m. From six metres the same 1.25 lifts the camera to y ≈ 3.3 and puts
 *    **Virgil's candidate slab between the camera and the Keeper's screen** —
 *    73 of the Keeper's 75 unhidden screen samples blocked at 1.35, 37 at
 *    1.2, 1 at 1.05, and 0 at 0.9 and below;
 *  - **below.** At 0.35 the camera is nearly level with the glass, and from
 *    six metres out **Virgil's own console stands in front of the Prover** —
 *    1 of the 18 points of his torso blocked at 6.0 m, 3 at 6.5, 6 at 9.0.
 *    Nothing is blocked at 0.6 and above at any distance the solve reaches.
 *
 * 0.7 sits inside both, and inside it the frame is a little more level with
 * the character's face than V10's — the reading the owner asked for at V8
 * (*"almost level with the characters, maybe a tiny bit higher"*) — and it is
 * where the least of Virgil's slab cluster is in shot.
 */
export const ELEVATION = 0.7;
/**
 * How far from the screen's centre toward the character's chest the camera
 * aims. V10's close-up takes 0.3, which centres the console; 0.85 centres the
 * pair, with the character a little off the middle of the frame and their
 * console beside them.
 */
export const AIM = 0.85;
/** The lens the solve holds. A phone reads a 46° vertical frame as a shot, not a fisheye. */
export const LENS = 52;
/** Air around the required points inside that lens. */
export const MARGIN = 1.06;
/**
 * The lowest point of the character the frame must hold, in metres above the
 * floor: mid-shin. Their feet may fall outside the frame and usually do —
 * requiring them costs a metre of distance and buys a strip of floor.
 */
export const BUST_FROM = 0.35;
/** The highest — a little over a 1.7 m character's crown. */
export const FIGURE_TOP = 1.74;
/**
 * How far to either side of where they stand the frame must hold, in metres.
 * The Fabricator, the widest, is 1.15 m across, so 0.5 holds his shoulders
 * and a little air at every yaw of his turn.
 */
export const BUST_HALF = 0.42;
/**
 * **How far below the pair the camera aims, in metres of target height, to
 * push the lower edge of Virgil's slab cluster up out of the picture.**
 *
 * The cluster hangs at y = 2.50–6.64, x = ±3.0, z ≈ −1.3 — between a camera
 * standing off a console on the +z side and the console itself. The first
 * frames of this pass showed its lower edge as a cropped slab with legible
 * type across the top fifth of all three close-ups, reading as an overlay
 * rather than as depth. **The cluster is not moved**: the owner has declined
 * that, and `composition.ts`'s overview and `screens/v11/bank.ts` are
 * untouched. So the camera tilts down a little instead.
 *
 * **It is a reduction and not a cure, and the arithmetic says why.** Clearing
 * the cluster completely takes a tilt of 0.8 m on the Fabricator and 1.0 on
 * the Prover, and **no tilt clears it at all on the Keeper** — his candidate
 * slab reaches x = +0.07 and his own camera stands at x ≈ +1.2. Those tilts
 * put the character's feet at 0.21, 0.08 and 0.06 of the frame's own height
 * from its middle, which is to say they turn the lower half of the picture
 * into floor. 0.2 m takes the cluster's sample points in frame from 12, 10
 * and 17 to 6, 6 and 12 for a tenth of the frame's height, and that is where
 * it stops. What is left in shot is measured at every viewport in
 * `test/station-close-up-v11.test.ts` and recorded in the run record.
 */
export const TILT = 0.2;
/**
 * The fraction of the screen's width, from the character's own edge of it,
 * the frame must hold. 1 is the whole screen, and 1 is what the solve gives
 * on all three consoles at both phone viewports.
 */
export const SCREEN = 0.6;
/** The nearest and furthest the solve may stand. Both are bounds, not choices. */
export const MIN_DISTANCE = 3;
export const MAX_DISTANCE = 9;

function yaw(v: Vec3, r: number): Vec3 {
  return [Math.cos(r) * v[0] + Math.sin(r) * v[2], v[1], -Math.sin(r) * v[0] + Math.cos(r) * v[2]];
}

/**
 * The head-and-torso box the frame must hold: where the character stands,
 * from `BUST_FROM` to `FIGURE_TOP`, `BUST_HALF` to either side. Square in
 * plan rather than a circle of `placedReach`, because a character turning in
 * place — which they do, on the owner's own direction — sweeps that circle
 * with a shoulder, and requiring the swept circle is requiring a metre and a
 * half of air that no frame ever shows anything in.
 */
export function bustPoints(role: Role): Vec3[] {
  const { at } = figurePlacement(role);
  const out: Vec3[] = [];
  for (const dx of [-BUST_HALF, 0, BUST_HALF]) {
    for (const dz of [-BUST_HALF, 0, BUST_HALF]) {
      for (const y of [BUST_FROM, FIGURE_TOP]) out.push([at[0] + dx, y, at[2] + dz]);
    }
  }
  return out;
}

/** Where the character's own face is, as a small quad: what "recognisable" is measured on. */
export function facePoints(role: Role): Vec3[] {
  const { at } = figurePlacement(role);
  const eye = eyeHeight(role);
  const half = placedReach(CAST[role].model.metadata) * 0.22;
  return [
    [at[0] - half, eye - 0.13, at[2]],
    [at[0] + half, eye - 0.13, at[2]],
    [at[0] - half, eye + 0.13, at[2]],
    [at[0] + half, eye + 0.13, at[2]],
  ];
}

/**
 * The screen's own rectangle in the room, as a function of `(u, v)` in
 * −1..1, where **u = −1 is the character's edge** of it. Built from the mask's
 * measured triangle bounds on the mask's own mean-normal plane, so it is the
 * screen the model has and not a rectangle guessed around it.
 */
export function screenAt(role: Role): (u: number, v: number) => Vec3 {
  const member = CAST[role];
  const mask = member.station.screen;
  const bounds = mask.measured.triangleBounds as { min: number[]; max: number[] };
  const centre = mask.measured.centre as number[];
  const axis = mask.measured.meanNormal as number[];
  const length = Math.hypot(axis[0] as number, axis[1] as number, axis[2] as number);
  const n: Vec3 = [
    (axis[0] as number) / length,
    (axis[1] as number) / length,
    (axis[2] as number) / length,
  ];
  // right = up × n, up = n × right — the same basis `screenPlane.ts` builds,
  // so u runs along the station's +x and the canvas's own left edge is u = −1.
  const right: Vec3 = [n[2], 0, -n[0]];
  const rl = Math.hypot(right[0], right[2]) || 1;
  const r: Vec3 = [right[0] / rl, 0, right[2] / rl];
  const up: Vec3 = [
    n[1] * r[2] - n[2] * r[1],
    n[2] * r[0] - n[0] * r[2],
    n[0] * r[1] - n[1] * r[0],
  ];
  let halfWidth = 0;
  let halfHeight = 0;
  for (const x of [bounds.min[0] as number, bounds.max[0] as number]) {
    for (const y of [bounds.min[1] as number, bounds.max[1] as number]) {
      for (const z of [bounds.min[2] as number, bounds.max[2] as number]) {
        const d: Vec3 = [
          x - (centre[0] as number),
          y - (centre[1] as number),
          z - (centre[2] as number),
        ];
        halfWidth = Math.max(halfWidth, Math.abs(d[0] * r[0] + d[1] * r[1] + d[2] * r[2]));
        halfHeight = Math.max(halfHeight, Math.abs(d[0] * up[0] + d[1] * up[1] + d[2] * up[2]));
      }
    }
  }
  return (u, v) => {
    const local: Vec3 = [
      (centre[0] as number) + r[0] * u * halfWidth + up[0] * v * halfHeight,
      (centre[1] as number) + r[1] * u * halfWidth + up[1] * v * halfHeight,
      (centre[2] as number) + r[2] * u * halfWidth + up[2] * v * halfHeight,
    ];
    const w = yaw(local, member.rotationY);
    return [member.at[0] + w[0], member.at[1] + w[1], member.at[2] + w[2]];
  };
}

/**
 * The part of the screen the frame must hold: `SCREEN` of its width from the
 * character's own edge, over its whole height. The primary state is at that
 * edge, so this is the state and not the rail.
 */
export function screenKept(role: Role): Vec3[] {
  const at = screenAt(role);
  // u = −1 is the character's own edge of the glass; the kept span runs from
  // there toward the far edge at u = +1.
  const far = -1 + 2 * SCREEN;
  const out: Vec3[] = [];
  for (const u of [-1, (-1 + far) / 2, far]) {
    for (const v of [-1, 0, 1]) out.push(at(u, v));
  }
  return out;
}

/**
 * The corners of Virgil's three slabs, in the room, at the scale and yaw
 * `screens/v11/bank.ts` gives each — sampled over their faces rather than at
 * their eight corners, because it is a slab's **lower edge** that comes into
 * the top of a station frame and an eight-corner test misses it by
 * centimetres.
 */
export function clusterPoints(orientation: ClusterOrientation): Vec3[] {
  const out: Vec3[] = [];
  const N = 6;
  for (const placement of v11Cluster(orientation)) {
    const [px, py, pz] = placement.position;
    const [rx, ry] = placement.rotation;
    const hw = (SLAB_OUTER_WIDTH / 2) * placement.scale;
    const hh = (SLAB_OUTER_HEIGHT / 2) * placement.scale;
    for (let i = 0; i <= N; i += 1) {
      for (let j = 0; j <= N; j += 1) {
        for (const dz of [-SLAB_DEPTH, 0]) {
          const u = (-1 + (2 * i) / N) * hw;
          const v = (-1 + (2 * j) / N) * hh;
          // The slab's own pitch about x, then its splay about y.
          const y = v * Math.cos(rx) - dz * Math.sin(rx);
          const z = v * Math.sin(rx) + dz * Math.cos(rx);
          out.push([
            px + u * Math.cos(ry) + z * Math.sin(ry),
            py + y,
            pz - u * Math.sin(ry) + z * Math.cos(ry),
          ]);
        }
      }
    }
  }
  return out;
}

/** Where the camera stands and looks, at a distance along the pitched axis. */
function standAt(role: Role, distance: number, tilt = 0): { position: Vec3; target: Vec3 } {
  const centre = screenCentre(role) as Vec3;
  const axis = screenAxis(role);
  const rise = Math.asin(Math.max(-1, Math.min(1, axis[1])));
  const flat = Math.hypot(axis[0], axis[2]) || 1;
  const swung = yaw([axis[0] / flat, 0, axis[2] / flat], SWING);
  const pitch = rise * ELEVATION;
  const position: Vec3 = [
    centre[0] + swung[0] * distance * Math.cos(pitch),
    centre[1] + distance * Math.sin(pitch),
    centre[2] + swung[2] * distance * Math.cos(pitch),
  ];
  const { at } = figurePlacement(role);
  const chest: Vec3 = [at[0], eyeHeight(role) - 0.1, at[2]];
  const target: Vec3 = [
    centre[0] + (chest[0] - centre[0]) * AIM,
    centre[1] + (chest[1] - centre[1]) * AIM - tilt,
    centre[2] + (chest[2] - centre[2]) * AIM,
  ];
  return { position, target };
}

/** Everything this frame is required to hold, in the room. */
export function required(role: Role): Vec3[] {
  return [...screenKept(role), ...bustPoints(role)];
}

/**
 * The distance at which the required points fit inside `LENS` at this
 * aspect: the smallest one, found by bisection, clamped to the bounds. Not a
 * number read off a screenshot — a solve against the set's own geometry, so
 * every viewport gets its own answer and a change to the set moves it.
 */
export function solveDistance(role: Role, aspect: number, tilt = 0): number {
  const points = required(role);
  const fits = (distance: number) => {
    const { position, target } = standAt(role, distance, tilt);
    return fovFor(position, target, points, aspect) * MARGIN <= LENS;
  };
  if (fits(MIN_DISTANCE)) return MIN_DISTANCE;
  if (!fits(MAX_DISTANCE)) return MAX_DISTANCE;
  let near = MIN_DISTANCE;
  let far = MAX_DISTANCE;
  for (let i = 0; i < 40; i += 1) {
    const mid = (near + far) / 2;
    if (fits(mid)) far = mid;
    else near = mid;
  }
  return far;
}

/**
 * The V11 station close-up for a role at a viewport's aspect. In landscape
 * the frame is wide and shallow, the solve stands much nearer, and the
 * cluster is out of shot by construction — measured: 0 of its 294 sample
 * points in frame at 844 × 390 for all three roles — so the tilt is not
 * taken there.
 */
export function stationCloseUpPose(
  role: Role,
  aspect: number,
  orientation: ClusterOrientation,
): CameraPose {
  const tilt = orientation === 'portrait' ? TILT : 0;
  const distance = solveDistance(role, aspect, tilt);
  const { position, target } = standAt(role, distance, tilt);
  // The lens is `LENS` wherever the solve succeeded, and wide enough to hold
  // the required points wherever `MAX_DISTANCE` stopped it — because a primary
  // state out of frame is the defect this file exists to stop and it does not
  // reintroduce it. Note that this is the screen's own **plane rectangle**,
  // not the axis-aligned box of its triangles that `closeUp.ts` frames: the
  // box's corners are 60–120 mm off the glass on a screen tilted back 13°, and
  // requiring them is part of why V10's close-up needs a 67°–71° lens.
  const fov = Math.max(LENS, fovFor(position, target, required(role), aspect) * MARGIN);
  return { position, target, fov };
}
