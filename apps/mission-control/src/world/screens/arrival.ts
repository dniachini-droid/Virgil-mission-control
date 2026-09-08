import { CAST, type Role, stationToWorld } from '../room/cast.js';

/**
 * Where a transfer enters a screen, and when: the seam for the tubes.
 *
 * V8 (`docs/process/PHASE_1_STYLISED_SPEC.md` §0.10.9). The owner: "Maybe
 * later we can have tubes connecting all of the consoles and as part of
 * the handoff to another agent, light travels across the tube to the
 * correct console, and back again." Not built. What is built is the
 * discipline that lets it be built without rebuilding the animations:
 * every receiving animation begins at an **arrival point** — a place on
 * the screen and a moment — and every returning animation converges
 * from the same edge, so a tube terminating at a console can later feed
 * into both. This file is the one place that says where and when. The
 * walking seam (`characters/locomotion.ts`) is the same idea.
 *
 * The edge is the side of each console's screen that faces Virgil's
 * console, in the console's own frame: the Fabricator's stands to
 * Virgil's left, turned in, so its screen's right edge is nearest him;
 * the Keeper's mirrors it; the Prover's stands directly behind, so the
 * transfer comes up from the screen's foot. Virgil's review slab receives
 * from its foot too: the agents stand below it.
 */
export type Edge = 'left' | 'right' | 'top' | 'bottom';

export interface Arrival {
  edge: Edge;
  /** Where along the edge, 0..1 (left to right, or top to bottom). */
  along: number;
}

export const SCREEN_ARRIVAL: Record<Role, Arrival> = {
  fabricator: { edge: 'right', along: 0.55 },
  prover: { edge: 'bottom', along: 0.5 },
  keeper: { edge: 'left', along: 0.55 },
};

/** Virgil's review slab: the verdict returns from below. */
export const SLAB_ARRIVAL: Arrival = { edge: 'bottom', along: 0.5 };

/**
 * The moments of a receiving beat, seconds after the transfer begins.
 * A tube would run its light for `approach` and hand over at `transfer`,
 * which is where the packets start to land.
 */
export const RECEIVING = {
  /** The signal at the arrival point, and the carrier reaching in. */
  approach: 0,
  /** Packets crossing from the arrival point and landing. */
  transfer: 0.9,
  /** The landed packets unpacking into the grid. */
  unpack: 3.3,
  /** The grid settling; the state word landing. */
  settle: 4.7,
  /** From here the screen holds, with a slow shimmer. */
  held: 6,
} as const;

/**
 * The moments of a returning beat, seconds after the verdict is given.
 * A tube would carry the light back over `gather`; the pieces arrive over
 * `converge`, the ring `seals`, the mark and the words `land`.
 */
export const RETURNING = {
  /** The working content withdraws. */
  gather: 0,
  /** Pieces converging from the arrival edge and across the screen. */
  converge: 0.2,
  /** The ring closing, segment by segment, and the pulse. */
  seal: 1.5,
  /** The mark drawing and the words landing with weight. */
  land: 2.1,
  /** The evidence rows arriving in sequence. */
  evidence: 2.7,
  /** From here the screen holds. */
  held: 4,
} as const;

/** The arrival point on a canvas of `w` × `h` (above the honesty band). */
export function arrivalPoint(arrival: Arrival, w: number, h: number): [number, number] {
  switch (arrival.edge) {
    case 'left':
      return [0, h * arrival.along];
    case 'right':
      return [w, h * arrival.along];
    case 'top':
      return [w * arrival.along, 0];
    default:
      return [w * arrival.along, h];
  }
}

/**
 * The arrival point on a console's screen, in the room: where a tube
 * would terminate. Read off the screen mask that travels with the model
 * (`fit-screen.mjs`), so it moves with the console.
 */
export function screenArrivalWorld(role: Role): [number, number, number] {
  const { min, max } = CAST[role].station.screen.measured.paintBounds;
  const arrival = SCREEN_ARRIVAL[role];
  const [x0, y0, z0] = min as [number, number, number];
  const [x1, y1, z1] = max as [number, number, number];
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
  let x = lerp(x0, x1, 0.5);
  let y = lerp(y0, y1, 0.5);
  switch (arrival.edge) {
    case 'left':
      x = x0;
      y = lerp(y1, y0, arrival.along);
      break;
    case 'right':
      x = x1;
      y = lerp(y1, y0, arrival.along);
      break;
    case 'top':
      x = lerp(x0, x1, arrival.along);
      y = y1;
      break;
    default:
      x = lerp(x0, x1, arrival.along);
      y = y0;
  }
  // The screen is tilted back: its z follows its y across the paint's bounds.
  const z = y1 === y0 ? z1 : lerp(z0, z1, (y - y0) / (y1 - y0));
  return stationToWorld(role, x, y, z);
}
