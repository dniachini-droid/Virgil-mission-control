import type { MeshyAsset, MeshyAssetMetadata } from '../assets/meshyAsset.js';
import {
  FABRICATOR_VISOR,
  KEEPER_VISOR,
  PROVER_VISOR,
  type VisorSpec,
} from '../characters/visorFit.js';
import {
  fabricator2Metadata,
  fabricatorStationMetadata,
  keeper2Metadata,
  keeperStationMetadata,
  loadFabricator2,
  loadFabricatorStation,
  loadKeeper2,
  loadKeeperStation,
  loadProver2,
  loadProverStation,
  prover2Metadata,
  proverStationMetadata,
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
 * (§1.2), and stands on the floor at its front-left corner facing the
 * camera, with the station's own screen visible beside their head and
 * their panel floating on their other side. The standing point is derived
 * from the two models' measured bounds, not set by hand.
 */
export type Role = 'fabricator' | 'prover' | 'keeper';
export const ROLES: readonly Role[] = ['fabricator', 'prover', 'keeper'];

export interface FigureModel {
  load: () => Promise<MeshyAsset>;
  metadata: MeshyAssetMetadata;
  /** The visor spec fitted to this model's own head. Travels with the model. */
  visor: VisorSpec;
}

export interface StationModel {
  load: () => Promise<MeshyAsset>;
  metadata: MeshyAssetMetadata;
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
  visor: FABRICATOR_VISOR,
};
/** `prover-model-candidate-02.glb` — the deepest; assigned from its upload filename. */
const PROVER_MODEL: FigureModel = {
  load: loadProver2,
  metadata: prover2Metadata,
  visor: PROVER_VISOR,
};
/** `keeper-model-candidate-02.glb` — the slimmest; assigned by elimination. */
const KEEPER_MODEL: FigureModel = {
  load: loadKeeper2,
  metadata: keeper2Metadata,
  visor: KEEPER_VISOR,
};

export const CAST: Record<Role, CastMember> = {
  fabricator: {
    label: 'Fabricator',
    alias: 'builder',
    identification: 'owner-identified',
    model: FABRICATOR_MODEL,
    station: { load: loadFabricatorStation, metadata: fabricatorStationMetadata },
    at: layout.stations.fabricator.at,
    rotationY: layout.stations.fabricator.rotationY,
  },
  prover: {
    label: 'Prover',
    identification: 'provisional (session assignment)',
    model: PROVER_MODEL, // ← to swap the Prover and the Keeper, exchange this line's value…
    station: { load: loadProverStation, metadata: proverStationMetadata },
    at: layout.stations.prover.at,
    rotationY: layout.stations.prover.rotationY,
  },
  keeper: {
    label: 'Keeper',
    identification: 'provisional (session assignment)',
    model: KEEPER_MODEL, // ← …with this one, then rename the two files and rewrite their register rows.
    station: { load: loadKeeperStation, metadata: keeperStationMetadata },
    at: layout.stations.keeper.at,
    rotationY: layout.stations.keeper.rotationY,
  },
};

/** Clearance between a station's front edge and the character in front of it. */
export const STAND_GAP = 0.2;
/** How far to the station's left (its −x) the character stands, so its screen shows. */
export const STAND_SIDE = -0.55;
/** The character turns a little more toward the camera than the station does. */
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

export interface Placement {
  /** In the station's frame. */
  local: [number, number, number];
  at: [number, number, number];
  rotationY: number;
}

/**
 * Where a character stands: on the floor, `STAND_GAP` clear of the station's
 * front edge (both measured), at its front-left corner, turned toward the
 * camera. `test/cast-clearance.test.ts` holds the figure clear of the
 * station at every extreme of its breathing.
 */
export function figurePlacement(role: Role): Placement {
  const member = CAST[role];
  const dz = placedFront(member.station.metadata) + STAND_GAP + placedFront(member.model.metadata);
  return {
    local: [STAND_SIDE, 0, dz],
    at: stationToWorld(role, STAND_SIDE, 0, dz),
    rotationY: member.rotationY * FACE_TURN,
  };
}

/**
 * Where the character's panel floats: over the station's front-right, at
 * head height, turned as the character is. No stand — the owner approved
 * floating panels in V4.
 */
export function panelPlacement(role: Role): {
  position: [number, number, number];
  rotation: [number, number, number];
} {
  const member = CAST[role];
  const dz = placedFront(member.station.metadata) + 0.05;
  return {
    position: stationToWorld(role, 0.62, 1.62, dz),
    rotation: [0, member.rotationY * FACE_TURN, 0],
  };
}

/** A character's eye height, from the visor spec that travels with the model. */
export function eyeHeight(role: Role): number {
  const { y0, y1 } = CAST[role].model.visor;
  return (y0 + y1) / 2;
}
