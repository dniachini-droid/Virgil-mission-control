import { layout } from '../../room/palette.js';

/**
 * **Where V11 hangs Virgil's three slabs, and why it is not
 * `layout.screenBank`.**
 *
 * `layout.screenBank` is **shared with V10**, which must keep rendering
 * exactly as it does at `#/v10` (`docs/process/V11_BRIEF.md`, "The
 * preservation contract"). So V11's own arrangement lives here and is read
 * by the three V11-only places that need it — `ScreenBankV11.tsx`, which
 * hangs the slabs; `mobile/composition.ts`, which solves the portrait frame
 * against their corners and puts a touch target on each; and the board
 * camera. Those must never disagree, which is why this is one function and
 * not three sets of numbers.
 *
 * **Two owner instructions shaped it.**
 *
 * First, after the stage-2 overview frame: *"we need to bring all of the
 * three screens above virgil… not increase their height. Just move them up
 * a bit higher just so that they're not… blocking the consoles behind."*
 *
 * Then, seeing them still in a row: *"They are currently arranged in one
 * horizontal row and appear too small on the iPhone. Preserve their
 * existing visual design, content and animations, but enlarge them and
 * arrange them in a shallow triangular composition"* — the verdict screen
 * at the top centre, 25–35 % larger than the other two; the two supporting
 * screens underneath it, offset left and right and angled subtly inward
 * toward Virgil; shallow and wide, not a tall pyramid; the cluster centred
 * above Virgil. And, when the two collided: *"Just move the screens as I
 * have instructed. Everything else remains the same."*
 *
 * **So this file changes position and scale, and nothing else.** The slab
 * is the same object `ScreenBankV11.tsx` built — 1.540 × 1.040 m overall
 * with a 1.476 × 0.976 m opening — drawn with the same canvas, the same
 * layout, the same type and the same animations. `scale` multiplies the
 * whole group, so a larger slab is the same design seen larger and not a
 * redesign.
 *
 * **The owner's own priority order settles the conflicts**, highest first:
 * the three physical consoles and their screens stay readable; the primary
 * clears the safe area and the `⋯` control; the size and gap targets are
 * met as closely as those two allow.
 *
 * **All three are satisfied at once**, which was not obvious and was found
 * by sweeping 1,600 combinations of the five numbers below against the
 * composition solver itself — each trial re-solved the camera, because
 * enlarging a slab moves the camera that frames it, so the on-screen size
 * is not proportional to the scale. Measured at 390 × 844:
 *
 * | | target | measured |
 * |---|---|---|
 * | primary | 155–175 CSS px | **172** |
 * | supporting, each | 125–140 | **131** |
 * | gap between the pair | 10–16 | **14** |
 * | primary larger than the pair | 25–35 % | **28.4 %** |
 * | supporting pair clear of the consoles | — | **42 px** |
 * | above the primary, at 390 and 430 | — | **103 px, 115 px** |
 *
 * The cluster is 4.68 m wide and 3.51 m tall, so it is shallow and wide
 * rather than a tall pyramid, and it is centred on the line through Virgil.
 */

/**
 * The cluster's parameters, in metres and multiples. A mutable object
 * rather than separate constants so that a measurement harness can sweep
 * it and the solver can be run against each trial — which is how the
 * values below were chosen.
 */
export const V11_CLUSTER = {
  /** How far above `layout.screenBank.y` the **primary** slab's centre sits. */
  lift: 3.2,
  /**
   * The primary slab's scale, and the supporting pair's. The ratio is
   * 1.284, inside the owner's *"approximately 25–35 % larger"*.
   */
  primaryScale: 1.9,
  supportScale: 1.48,
  /** How far below the primary's centre the supporting pair's centres sit. */
  drop: 1.75,
  /** How far to each side of the centre line the supporting pair stands. */
  spread: 1.2,
  /** How far in front of the primary's plane the supporting pair stands. */
  forward: 0.45,
  /** How far the supporting pair turns inward, toward Virgil, in radians. */
  splay: 0.2,
  /** The primary's own pitch, and the supporting pair's. */
  pitch: -0.1,
};

export interface SlabPlacement {
  kind: 'roles' | 'verdict' | 'candidate';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

/**
 * The three slabs' placements: the verdict at the apex, the run ledger to
 * the lower left and the candidate to the lower right.
 */
export function v11Cluster(): SlabPlacement[] {
  const { y, z } = layout.screenBank;
  const c = V11_CLUSTER;
  const apexY = y + c.lift;
  const supportY = apexY - c.drop;
  const supportZ = z + c.forward;
  return [
    {
      kind: 'verdict',
      position: [0, apexY, z],
      rotation: [c.pitch, 0, 0],
      scale: c.primaryScale,
    },
    {
      kind: 'roles',
      position: [-c.spread, supportY, supportZ],
      rotation: [c.pitch, c.splay, 0],
      scale: c.supportScale,
    },
    {
      kind: 'candidate',
      position: [c.spread, supportY, supportZ],
      rotation: [c.pitch, -c.splay, 0],
      scale: c.supportScale,
    },
  ];
}

/** Where a slab of this kind is, for the anchors and the board camera. */
export function v11SlabAt(kind: SlabPlacement['kind']): SlabPlacement {
  const found = v11Cluster().find((placement) => placement.kind === kind);
  if (!found) throw new Error(`no slab ${kind}`);
  return found;
}

/** The cluster's own centre and extent, for the board camera. */
export function v11ClusterCentre(): { y: number; z: number; halfWidth: number } {
  const { y, z } = layout.screenBank;
  const c = V11_CLUSTER;
  return {
    y: y + c.lift - c.drop * 0.42,
    z: z + c.forward * 0.5,
    halfWidth: c.spread + 0.77 * c.supportScale + 0.3,
  };
}
