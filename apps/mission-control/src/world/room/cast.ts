import type { MeshyAsset, MeshyAssetMetadata } from '../assets/meshyAsset.js';
import type { VisorMask } from '../characters/visorFit.js';
import {
  fabricator2Metadata,
  fabricator2VisorMask,
  fabricatorStationMetadata,
  fabricatorStationScreenMask,
  keeper2Metadata,
  keeper2VisorMask,
  keeperStationMetadata,
  keeperStationScreenMask,
  loadFabricator2,
  loadFabricatorStation,
  loadKeeper2,
  loadKeeperStation,
  loadProver2,
  loadProverStation,
  prover2Metadata,
  prover2VisorMask,
  proverStationMetadata,
  proverStationScreenMask,
} from '../props/v6Assets.js';
import { layout } from './palette.js';

/**
 * The cast: which model plays which role, and where each stands.
 *
 * This is **data, on purpose**. The owner identified one of the three new
 * characters (the widest, "the fatteest one is the fabricator") and said of
 * the other two "it doesnt matter. we cna swap them later"
 * (`docs/process/PHASE_1_STYLISED_SPEC.md` §1.1). So the Prover and the
 * Keeper are provisional assignments, and exchanging them is meant to be
 * one edit: swap the two `model:` values marked below. Nothing in any
 * component knows which file is which; components ask this table.
 *
 * Each character has their own station, by the owner's later direction
 * (§1.2). V8 (§0.10.8), the owner: "have each agent at the console,
 * sightly to the left so it doesnt obstruct the screens, faciung forward.
 * When they get sent work, an animation plays on their face/eyes and they
 * turn aroundfacing the screeen. When its done, they turn aroiund and face
 * the front again." So a character has **one** standing point — on the
 * floor in front of their console, to its left, clear of it by a margin
 * that holds at every angle of the turn — and **two facings**: the front
 * (`figurePlacement`) and their console's screen (`workingPlacement`).
 * The standing point is derived from the models' measured bounds, not set
 * by hand, and the screen is the one `fit-screen.mjs` found on the
 * console's own mesh.
 */
export type Role = 'fabricator' | 'prover' | 'keeper';
export const ROLES: readonly Role[] = ['fabricator', 'prover', 'keeper'];

export interface FigureModel {
  load: () => Promise<MeshyAsset>;
  metadata: MeshyAssetMetadata;
  /** Which of this model's own triangles carry its painted visor. Travels with the model. */
  visor: VisorMask;
}

export interface StationModel {
  load: () => Promise<MeshyAsset>;
  metadata: MeshyAssetMetadata;
  /** Which of this console's own triangles are its screen. Travels with the model. */
  screen: VisorMask;
}

export interface CastMember {
  label: string;
  /** The owner's own word for the role, where it differs from the project's. */
  alias?: string;
  /** Whether the owner identified this model, or a session assigned it. */
  identification: 'owner-identified' | 'provisional (session assignment)';
  model: FigureModel;
  station: StationModel;
  /** Where the station stands, and which way its front faces. */
  at: readonly [number, number, number];
  rotationY: number;
}

/** `fabricator-model-candidate-02.glb` — the widest. Owner-identified. */
const FABRICATOR_MODEL: FigureModel = {
  load: loadFabricator2,
  metadata: fabricator2Metadata,
  visor: fabricator2VisorMask,
};
/** `prover-model-candidate-02.glb` — the deepest; assigned from its upload filename. */
const PROVER_MODEL: FigureModel = {
  load: loadProver2,
  metadata: prover2Metadata,
  visor: prover2VisorMask,
};
/** `keeper-model-candidate-02.glb` — the slimmest; assigned by elimination. */
const KEEPER_MODEL: FigureModel = {
  load: loadKeeper2,
  metadata: keeper2Metadata,
  visor: keeper2VisorMask,
};

export const CAST: Record<Role, CastMember> = {
  fabricator: {
    label: 'Fabricator',
    alias: 'builder',
    identification: 'owner-identified',
    model: FABRICATOR_MODEL,
    station: {
      load: loadFabricatorStation,
      metadata: fabricatorStationMetadata,
      screen: fabricatorStationScreenMask,
    },
    at: layout.stations.fabricator.at,
    rotationY: layout.stations.fabricator.rotationY,
  },
  prover: {
    label: 'Prover',
    identification: 'provisional (session assignment)',
    model: PROVER_MODEL, // ← to swap the Prover and the Keeper, exchange this line's value…
    station: {
      load: loadProverStation,
      metadata: proverStationMetadata,
      screen: proverStationScreenMask,
    },
    at: layout.stations.prover.at,
    rotationY: layout.stations.prover.rotationY,
  },
  keeper: {
    label: 'Keeper',
    identification: 'provisional (session assignment)',
    model: KEEPER_MODEL, // ← …with this one, then rename the two files and rewrite their register rows.
    station: {
      load: loadKeeperStation,
      metadata: keeperStationMetadata,
      screen: keeperStationScreenMask,
    },
    at: layout.stations.keeper.at,
    rotationY: layout.stations.keeper.rotationY,
  },
};

/**
 * Clearance between a station's front edge and the nearest the character
 * comes to it at **any** angle of the turn: the character's footprint is
 * taken as a circle of its widest horizontal reach, so turning in place
 * can never sweep a shoulder into the console.
 */
export const STAND_GAP = 0.2;
/** How far to the station's left (its −x) the character stands, so its screen shows. */
export const STAND_SIDE = -0.55;
/** The character faces the camera a little more squarely than the station does. */
export const FACE_TURN = 0.7;

/** A point in a station's frame, in the room. */
export function stationToWorld(
  role: Role,
  dx: number,
  dy: number,
  dz: number,
): [number, number, number] {
  const { at, rotationY: r } = CAST[role];
  return [
    at[0] + Math.cos(r) * dx + Math.sin(r) * dz,
    at[1] + dy,
    at[2] - Math.sin(r) * dx + Math.cos(r) * dz,
  ];
}

/** The placed half-depth of a model along +z (its front), from its measured bounds. */
export function placedFront(metadata: MeshyAssetMetadata): number {
  return (metadata.measured.boundsMax[2] as number) * metadata.runtime.scale;
}

/**
 * A model's widest horizontal reach from its own axis, from its measured
 * bounds: the radius of the circle it sweeps when it turns in place.
 */
export function placedReach(metadata: MeshyAssetMetadata): number {
  const x = Math.max(
    Math.abs(metadata.measured.boundsMax[0] as number),
    Math.abs(metadata.measured.boundsMin[0] as number),
  );
  const z = Math.max(
    Math.abs(metadata.measured.boundsMax[2] as number),
    Math.abs(metadata.measured.boundsMin[2] as number),
  );
  return Math.hypot(x, z) * metadata.runtime.scale;
}

export interface Placement {
  /** In the station's frame. */
  local: [number, number, number];
  at: [number, number, number];
  rotationY: number;
}

/**
 * Where a character stands, facing the front: on the floor, `STAND_GAP`
 * clear of the station's front edge at every angle of the turn (both
 * measured), to the console's left, turned toward the camera.
 * `test/cast-clearance.test.ts` holds the figure clear of the station at
 * every extreme of its breathing and through the whole turn.
 */
export function figurePlacement(role: Role): Placement {
  const member = CAST[role];
  const dz = placedFront(member.station.metadata) + STAND_GAP + placedReach(member.model.metadata);
  return {
    local: [STAND_SIDE, 0, dz],
    at: stationToWorld(role, STAND_SIDE, 0, dz),
    rotationY: member.rotationY * FACE_TURN,
  };
}

/**
 * The same standing point, facing the console's screen: the yaw that
 * points the character at the centre of the screen `fit-screen.mjs`
 * found, which is behind them and a little to their right. The turn
 * between the two facings is `characters/locomotion.ts`.
 */
export function workingPlacement(role: Role): Placement {
  const front = figurePlacement(role);
  const member = CAST[role];
  const [sx, , sz] = member.station.screen.measured.centre as [number, number, number];
  const [x, , z] = front.local;
  // +z is the front in the station's frame; a yaw of 0 faces +z.
  const yawLocal = Math.atan2(sx - x, sz - z);
  return {
    local: front.local,
    at: front.at,
    rotationY: member.rotationY + yawLocal,
  };
}

/** A character's eye height: the centre of the painted visor that travels with the model. */
export function eyeHeight(role: Role): number {
  return CAST[role].model.visor.measured.centre[1] as number;
}

/** The centre of a console's screen, in the room. */
export function screenCentre(role: Role): [number, number, number] {
  const [sx, sy, sz] = CAST[role].station.screen.measured.centre as [number, number, number];
  return stationToWorld(role, sx, sy, sz);
}
