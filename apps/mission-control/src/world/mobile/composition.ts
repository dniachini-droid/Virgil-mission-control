import { CAST, eyeHeight, figurePlacement, ROLES, type Role, screenCentre } from '../room/cast.js';
import { fovFor, screenCorners } from '../room/closeUp.js';
import { type CameraPose, layout } from '../room/palette.js';
import {
  type ClusterOrientation,
  v11Cluster,
  v11ClusterCentre,
  v11SlabAt,
} from '../screens/v11/bank.js';
import type { WindowTarget } from '../window/windowContent.js';
import { stationCloseUpPose } from './stationCloseUp.js';

/**
 * **V11 stage 1: a composition authored for a phone held upright, and a
 * second one authored for a phone held sideways.**
 *
 * The V10 tabletop camera (`palette.ts`, `tabletopCamera`) answers a portrait
 * viewport by widening the lens to its ceiling of 62° and stopping there. At
 * 390 × 844 that ceiling holds ±3.6 m of a set that is ±4.35 m wide, so the
 * Fabricator's and the Keeper's consoles run off the sides: the desktop camera
 * shrunk, which is exactly what the brief says not to ship
 * (`docs/process/V11_BRIEF.md`, stage 1).
 *
 * The authored answer is not a wider lens. It is **a different reading of the
 * set**: a phone held upright is tall where the set is wide, and the set is
 * also 6.5 m *deep* — Virgil at z = +0.3, the Prover at z = −5.15. Raising the
 * camera and pitching it down maps that depth onto the screen's long axis, so
 * portrait gets Virgil low and large in the frame with the three specialists
 * stepped up and away behind him: the Fabricator up-left, the Prover at the
 * top, the Keeper up-right. Nothing is cropped, Virgil is the nearest and
 * largest figure, and the three are separated by the geometry of the set
 * rather than by a lens.
 *
 * Landscape keeps the near-level, stage-like reading the owner asked for at V8
 * ("almost level with the characters, maybe a tiny bit higher") because a wide
 * viewport can hold the set that way. It is a **secondary** layout, authored
 * rather than inherited: its own elevation, its own target and its own
 * backdrop placement.
 *
 * **Every number here is solved against the set's own measured geometry**, in
 * the idiom `closeUp.ts` established: the frame is required to hold a list of
 * points that the composition may not lose, and the distance is the nearest
 * the camera may stand and still hold them at this viewport's aspect. Change a
 * console's position and the camera follows it; nothing below was read off a
 * screenshot. `test/mobile-composition.test.ts` holds the contract.
 */

type Vec3 = [number, number, number];

export type Orientation = 'portrait' | 'landscape';

/** Below this aspect the phone is upright. 0.95 rather than 1 so a near-square never oscillates. */
export const PORTRAIT_MAX_ASPECT = 0.95;

export function orientationFor(aspect: number): Orientation {
  return aspect < PORTRAIT_MAX_ASPECT ? 'portrait' : 'landscape';
}

export interface Frame {
  /** Degrees above the target the camera stands. */
  elevation: number;
  target: Vec3;
  /** The camera may stand no nearer than this, whatever the lens allows. */
  minDistance: number;
  /** And no further; past this the set stops reading as a place. */
  maxDistance: number;
  minFov: number;
  maxFov: number;
  /**
   * Air around the **critical** points — the four characters, the four
   * screens — inside the frame. They may not sit on an edge.
   */
  margin: number;
  /**
   * Air around the **enclosing** points: the consoles' own measured boxes.
   * Furniture only has to be inside the frame, not framed, and holding it to
   * the same margin as a face would push the camera back and shrink the set
   * for the sake of the corner of a desk. A little over 1 rather than exactly
   * 1: at exactly 1 the Fabricator's console sat on the left edge of the first
   * portrait capture, which looks like a mistake even when it is not one.
   */
  enclosureMargin: number;
}

/**
 * Upright. The elevation is the whole idea: high enough that Virgil's
 * console rim (0.87 m at z = +0.3) cannot cut across the specialists
 * standing 2–3.5 m behind it, and low enough that the set reads as a place
 * seen from within rather than a map.
 *
 * **Stage 2 brought it down from 28° to 22°**, on the owner's instruction
 * after seeing the stage-2 overview: *"the default camera angle is too high
 * up… bring the camera down a little bit more level so it's not looking on
 * top of the tabletop."* At 28° the camera stood 8.48 m up and the disc's
 * top surface was displayed; at 22° it stands 7.02 m up and the disc is
 * foreshortened, which is the difference between looking down onto the
 * tabletop and standing at it. The camera stays movable — he raised
 * locking it and deferred it: *"we could potentially even, like, lock that
 * in place, but we can do that later. Still make it movable."*
 *
 * **Stage 3 brings it down again, to 11.7°, because that is where the owner
 * put it himself.** He photographed his own iPhone *"with the camera at its
 * lowest position — which he says is how he wants it to start by default."*
 * The lowest position was not a number anybody chose: it was 22° minus the
 * 0.18 rad of downward travel `mobileLimits` allows the overview, which is
 * 10.31°, so the pose he was looking at is **11.69°** and that is now the
 * default. Nothing else about the frame is touched.
 *
 * What it costs, measured rather than described: the three consoles go from
 * 43.3 / 36.4 / 39.5 CSS px to 43.1 / 36.1 / 39.1 at 390 × 844 — four
 * hundredths of a pixel per degree, because portrait's frame is bound by the
 * consoles' own horizontal footprint and not by the elevation. The slabs come
 * down with it, which is the other half of what he asked for.
 *
 * **And the downward travel is tightened from 0.18 rad to 0.06.** That is not
 * a tidy-up: his screenshot at the old limit showed the top screen **clipped**,
 * and a composition that is only correct at its default pose is not correct.
 * `mobileLimits` keeps the upward travel and the pan-free orbit he asked to
 * keep, and `test/cluster-v11-s3.test.ts` measures the clearance at the lowest
 * pose the camera can now reach rather than only at the default.
 */
export const PORTRAIT_FRAME: Frame = {
  elevation: 11.7,
  target: [0, 1.3, -2.35],
  minDistance: 11.5,
  maxDistance: 19,
  minFov: 40,
  maxFov: 58,
  margin: 1.11,
  enclosureMargin: 1.035,
};

/** Sideways. Near-level, as V8 authored the wide view, and its own distance. */
export const LANDSCAPE_FRAME: Frame = {
  elevation: 15,
  target: [0, 1.25, -2.25],
  minDistance: 10.5,
  maxDistance: 18,
  minFov: 32,
  maxFov: 50,
  margin: 1.08,
  enclosureMargin: 1.0,
};

export function frameFor(orientation: Orientation): Frame {
  return orientation === 'portrait' ? PORTRAIT_FRAME : LANDSCAPE_FRAME;
}

/** How tall a character's head stands above the centre of their painted visor. */
const HEAD_ABOVE_EYES = 0.3;

/** A slab's own overall half extents, before its scale. */
const SLAB_HALF_WIDTH = 1.3 / 2 + 0.12;
const SLAB_HALF_HEIGHT = 0.8 / 2 + 0.12;

/**
 * The twelve corners of Virgil's three slabs, in the room, at the scale
 * and the yaw `screens/v11/bank.ts` gives each. The composition is solved
 * against these, so enlarging a slab or moving the cluster automatically
 * re-frames the overview rather than silently pushing a corner off screen.
 */
export function slabCorners(orientation: ClusterOrientation = 'portrait'): Vec3[] {
  const corners: Vec3[] = [];
  for (const placement of v11Cluster(orientation)) {
    const [px, py, pz] = placement.position;
    const yaw = placement.rotation[1];
    const hw = SLAB_HALF_WIDTH * placement.scale;
    const hh = SLAB_HALF_HEIGHT * placement.scale;
    for (const dx of [-hw, hw]) {
      for (const dy of [-hh, hh]) {
        corners.push([px + dx * Math.cos(yaw), py + dy, pz - dx * Math.sin(yaw)]);
      }
    }
  }
  return corners;
}

/**
 * The points the overview may not lose. Virgil, his console and his three
 * slabs; each specialist's head; each console's own measured screen box. If
 * one of these leaves the frame the composition has failed, and the solver
 * below is what stops it happening at a viewport nobody tried.
 */
export function compositionPoints(orientation: ClusterOrientation = 'portrait'): Vec3[] {
  const points: Vec3[] = [];
  const [vx, vy, vz] = layout.virgilAt;
  // Virgil: the top of his head, and the four corners of his console deck.
  points.push([vx, vy + layout.virgilHeight, vz]);
  const half = layout.consoleWidth / 2;
  for (const dx of [-half, half]) {
    for (const dz of [-1.15, 1.15]) points.push([vx + dx, vy, vz + dz]);
  }
  // His three slabs, as boxes: the board has to be legible from the overview.
  // Virgil's cluster: each slab's four corners, at its own scale and yaw
  // (`screens/v11/bank.ts`). The overview may not lose one of them.
  for (const corner of slabCorners(orientation)) points.push(corner);
  for (const role of ROLES) {
    const stand = figurePlacement(role).at;
    points.push([stand[0], eyeHeight(role) + HEAD_ABOVE_EYES, stand[2]]);
    points.push([stand[0], 0, stand[2]]);
    for (const corner of screenCorners(role)) points.push(corner);
  }
  return points;
}

function poseAt(frame: Frame, distance: number): { position: Vec3; target: Vec3 } {
  const elevation = frame.elevation * (Math.PI / 180);
  const [tx, ty, tz] = frame.target;
  return {
    position: [tx, ty + distance * Math.sin(elevation), tz + distance * Math.cos(elevation)],
    target: [tx, ty, tz],
  };
}

/**
 * **The consoles' own measured boxes**, in the room: the three stations and
 * Virgil's. These are what a portrait frame loses first — the Fabricator's
 * console runs a metre wider than his screen, and the first portrait capture
 * cut it at the left edge while every critical point was comfortably inside.
 * Found by measuring the shipped payloads rather than by adding a fudge to the
 * half-width.
 */
export function enclosurePoints(): Vec3[] {
  const points: Vec3[] = [];
  for (const role of ROLES) {
    const member = CAST[role];
    const { boundsMin, boundsMax } = member.station.metadata.measured;
    const scale = member.station.metadata.runtime.scale;
    const [ax, ay, az] = member.at;
    const r = member.rotationY;
    for (const bx of [boundsMin[0] as number, boundsMax[0] as number]) {
      for (const by of [boundsMin[1] as number, boundsMax[1] as number]) {
        for (const bz of [boundsMin[2] as number, boundsMax[2] as number]) {
          const x = bx * scale;
          const y = by * scale;
          const z = bz * scale;
          points.push([
            ax + Math.cos(r) * x + Math.sin(r) * z,
            ay + y,
            az - Math.sin(r) * x + Math.cos(r) * z,
          ]);
        }
      }
    }
  }
  const [vx, vy, vz] = layout.virgilAt;
  const half = layout.consoleWidth / 2;
  for (const dx of [-half, half]) {
    for (const dz of [-1.3, 1.3]) points.push([vx + dx, vy + layout.consoleRim, vz + dz]);
  }
  return points;
}

/**
 * The lens this frame needs at this distance: wide enough to frame every
 * critical point with air, **and** wide enough to contain every enclosing
 * point at all. Whichever of the two demands more wins.
 */
export function neededFov(
  frame: Frame,
  distance: number,
  aspect: number,
  points: Vec3[],
  enclosure: Vec3[] = [],
): number {
  const { position, target } = poseAt(frame, distance);
  return Math.max(
    fovFor(position, target, points, aspect) * frame.margin,
    enclosure.length === 0
      ? 0
      : fovFor(position, target, enclosure, aspect) * frame.enclosureMargin,
  );
}

/**
 * The overview for a viewport: the **nearest** the camera may stand and still
 * hold the whole composition inside `maxFov`. Nearest, because distance is
 * what costs the set its presence; the lens is opened first and the camera
 * retreats only when the lens has run out. A bisection over a monotonically
 * decreasing function, so the answer is the same on every machine.
 */
export function overviewPose(aspect: number): CameraPose {
  const orientation = orientationFor(aspect);
  const frame = frameFor(orientation);
  /**
   * **The cluster the frame is solved against is this orientation's own**, and
   * that one missing argument is the whole of stage 2's landscape regression.
   *
   * `slabCorners()` defaulted to the portrait cluster, so a landscape frame was
   * solved to hold a 2.93 m primary hanging 2.6 m up — geometry that is not on
   * screen in landscape at all. The solver did exactly as it was told and
   * retreated to 13.89 m at its widest lens, and the three consoles fell from
   * 40.7 to 23.4 CSS px. Stage 2's run record attributed that to the cluster
   * being large, which was half the truth: landscape was paying for a cluster
   * it was not showing.
   */
  const points = compositionPoints(orientation);
  const enclosure = enclosurePoints();
  const at = (distance: number) => neededFov(frame, distance, aspect, points, enclosure);
  const near = at(frame.minDistance);
  if (near <= frame.maxFov) {
    const { position, target } = poseAt(frame, frame.minDistance);
    return { position, target, fov: Math.max(frame.minFov, near) };
  }
  let low = frame.minDistance;
  let high = frame.maxDistance;
  if (at(high) > frame.maxFov) {
    const { position, target } = poseAt(frame, high);
    // The set does not fit even at the back of the range. The lens takes the
    // rest, and it is recorded here rather than silently cropped.
    return { position, target, fov: at(high) };
  }
  for (let i = 0; i < 40; i += 1) {
    const mid = (low + high) / 2;
    if (at(mid) > frame.maxFov) low = mid;
    else high = mid;
  }
  const { position, target } = poseAt(frame, high);
  return {
    position,
    target,
    fov: Math.max(frame.minFov, Math.min(frame.maxFov, at(high))),
  };
}

/**
 * **The depth layers, placed per orientation.** The planet and the station are
 * planes at a fixed place in the world (`layout.tabletop.planetAt`,
 * `stationAt`) chosen for a wide, near-level camera. A portrait camera has a
 * horizontal half-angle of about 13°, so the planet at x = +9 m and the
 * station at x = −11 m fall outside it and the frame loses its depth
 * altogether. They are brought in and lifted for portrait, and left where V10
 * has them for landscape. This is a composition decision about a backdrop
 * plane, not a change to the world's geometry: nothing stands on them and
 * nothing is measured against them.
 */
export interface BackdropPlacement {
  planetAt: Vec3;
  stationAt: Vec3;
}

export const PORTRAIT_BACKDROP: BackdropPlacement = {
  planetAt: [3.9, 8.0, -30],
  stationAt: [-4.4, 4.6, -24],
};

export const LANDSCAPE_BACKDROP: BackdropPlacement = {
  planetAt: [...layout.tabletop.planetAt] as Vec3,
  stationAt: [...layout.tabletop.stationAt] as Vec3,
};

export function backdropFor(orientation: Orientation): BackdropPlacement {
  return orientation === 'portrait' ? PORTRAIT_BACKDROP : LANDSCAPE_BACKDROP;
}

// --------------------------------------------------------------- what a tap reaches

export type MobileFocus = 'all' | 'virgil' | 'board' | Role;

export interface Anchor {
  /** Stable, and the value of the DOM node's `data-touch-target`. */
  id: string;
  /** What a screen reader is told, and what the press feedback names. */
  label: string;
  /** Where in the world the target follows. */
  point: Vec3;
  /** Where the camera goes when it is tapped. */
  focus: MobileFocus;
  /**
   * Which window opens — **in the same event**, not once the camera has
   * arrived. The owner's decision of 8 September: one tap does both,
   * concurrently (`MobileRoom.tsx`, `select`).
   *
   * The three slabs open **Virgil's** window at the section each of them
   * summarises, because his is the central operating interface and the owner's
   * constraint is that the reader must not have to manage four separate chats
   * (`PHASE_1_CONVERSATION_INTERFACE.md` §4). The slab is the glance; his
   * window is the read.
   */
  window: WindowTarget;
}

function slabAnchor(id: string, label: string, point: Vec3, at: string): Anchor {
  return { id, label, point, focus: 'board', window: { agent: 'virgil', at } };
}

/**
 * Every character and every important screen, as a point in the world. The
 * DOM layer projects these each frame and puts a 44 px target on each; the
 * hit test is nearest-centre, so where two overlap the nearer one wins and
 * both open the same agent's record anyway.
 */
export function anchors(orientation: ClusterOrientation = 'portrait'): Anchor[] {
  const [vx, vy, vz] = layout.virgilAt;
  const list: Anchor[] = [
    {
      id: 'virgil',
      label: 'Virgil',
      // His face, not his feet: the point the eye goes to.
      point: [vx, vy + 1.42, vz],
      focus: 'virgil',
      window: { agent: 'virgil' },
    },
    slabAnchor(
      'board-roles',
      'The run ledger',
      v11SlabAt('roles', orientation).position,
      'sequence',
    ),
    slabAnchor(
      'board-verdict',
      'The verdict board',
      v11SlabAt('verdict', orientation).position,
      'truth',
    ),
    slabAnchor(
      'board-candidate',
      'The candidate board',
      v11SlabAt('candidate', orientation).position,
      'next',
    ),
  ];
  for (const role of ROLES) {
    const stand = figurePlacement(role).at;
    list.push({
      id: role,
      label: CAST[role].label,
      point: [stand[0], eyeHeight(role) + 0.06, stand[2]],
      focus: role,
      window: { agent: role },
    });
    const [sx, sy, sz] = screenCentre(role);
    list.push({
      id: `${role}-screen`,
      label: `${CAST[role].label}'s screen`,
      point: [sx, sy, sz],
      focus: role,
      window: { agent: role },
    });
  }
  return list;
}

/**
 * The camera for a focus at this viewport. `all` is the authored overview
 * above; a specialist gets `stationCloseUpPose`, which stands on the same
 * measured screen axis `closeUpPose` does but **solves its distance so the
 * character is in the shot with them** — the repair of the defect V8.1
 * opened and V9 and V11 stage 2 each deferred (`mobile/stationCloseUp.ts`).
 * V10's own close-ups still come from `closeUpPose`, unchanged. Virgil and
 * the board are authored here for the phone rather than inherited from the
 * desktop rig.
 */
export function mobilePose(focus: MobileFocus, aspect: number): CameraPose {
  if (focus === 'all') return overviewPose(aspect);
  if (focus === 'virgil') {
    const [vx, vy, vz] = layout.virgilAt;
    const eye = vy + 1.13;
    // Nearer and a little wider than the desktop pose, because a phone frame
    // is narrow: the lens holds his head and his console's near rim.
    const portrait = orientationFor(aspect) === 'portrait';
    const distance = portrait ? 3.4 : 3.0;
    return {
      position: [vx + 0.35, eye + 0.4, vz + distance],
      target: [vx, eye - 0.08, vz],
      fov: portrait ? 46 : 40,
    };
  }
  if (focus === 'board') {
    const orientation = orientationFor(aspect);
    const { y, z, halfWidth } = v11ClusterCentre(orientation);
    const fov = orientation === 'portrait' ? 52 : 44;
    const distance = Math.max(5, halfWidth / (Math.tan((fov / 2) * (Math.PI / 180)) * aspect));
    return { position: [0, y, z + distance], target: [0, y - 0.05, z], fov };
  }
  return stationCloseUpPose(focus, aspect, orientationFor(aspect));
}
