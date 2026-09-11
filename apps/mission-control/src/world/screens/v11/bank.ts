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
 * **Stage 3 re-solved all of it against real-device evidence.** The owner
 * photographed his own iPhone with the camera at its lowest position, which is
 * how he wants it to start, and found three faults the container could not
 * show: the cluster still sits too high with a band of empty space under it,
 * the top screen is **clipped**, and the two lower screens are attached to the
 * top one instead of evenly spaced. All three slabs are now the same size, one
 * thin gap is used both between the lower pair and under the primary, and the
 * whole cluster comes down into the empty band — which is also what lets the
 * camera stay near, since the solver retreats only when it must.
 *
 * The numbers were found by sweeping the parameters against the composition
 * solver itself (`study/sweep-cluster.ts`), because enlarging or moving a slab
 * moves the camera that frames it: on-screen size is not proportional to
 * scale. `test/cluster-v11-s3.test.ts` holds every measured figure.
 *
/** The cluster's parameters, in metres, multiples and radians. */
export interface ClusterParams {
  /** How far above `layout.screenBank.y` the **primary** slab's centre sits. */
  lift: number;
  /**
   * The scale of all three slabs. **One value, because the owner looked at his
   * own phone and said so**: *"I actually think that all three screens should
   * be the same size as the top screen, and it would still fit."* It does fit,
   * and the margins it leaves are measured rather than assumed —
   * `test/cluster-v11-s3.test.ts` and the run record carry them.
   */
  scale: number;
  /**
   * **One gap, used twice.** *"I want there to be just even spacing between
   * them, very thin. So there's thin space between the two bottom screens. I
   * want that same thin space between the top screen and the two bottom
   * screens."* So the horizontal spread and the vertical drop are both derived
   * from this single number and the slab's own overall size, and neither is a
   * free parameter that could drift away from the other.
   */
  gap: number;
  /** How far in front of the primary's plane the supporting pair stands. */
  forward: number;
  /** How far the supporting pair turns inward, toward Virgil, in radians. */
  splay: number;
  /** The whole cluster's pitch. */
  pitch: number;
  /**
   * **What the one gap has to be multiplied by vertically for the two gaps to
   * come out equal on screen.**
   *
   * The owner asked for one thin space used twice: *"there's thin space between
   * the two bottom screens. I want that same thin space between the top screen
   * and the two bottom screens."* He means what he sees, and perspective is not
   * obliged to agree with arithmetic — the lower pair stands slightly nearer
   * the camera than the primary and the whole cluster is pitched, so an equal
   * distance in metres came out as 9.6 px horizontally and 7.3 px vertically.
   * This is the measured correction that makes the two equal in **pixels**,
   * which is the thing he can see. It is one gap still; this is the lens, not a
   * second gap.
   */
  verticalGapFactor: number;
}

/** The slab's own overall size, bezel included. `ScreenBankV11.tsx` builds it. */
const SLAB_WIDTH = 1.54;
const SLAB_HEIGHT = 1.04;

/**
 * **Portrait**, which is the composition the owner names as primary and the one
 * every target he has set is measured at.
 *
 * The numbers changed at stage 3 on his own real-device evidence — a screenshot
 * from his iPhone, which is better evidence than anything this container can
 * render:
 *
 *  1. *"you can actually see on the phone that the screens are still too high
 *     up. And they actually get cut off a little bit. So there's still a lot of
 *     space between where the top of the consoles are and those screens are…
 *     the three big screens can move a lot further down. And that way, you can
 *     stay kinda zoomed in a little bit."* — so `lift` comes down a long way,
 *     and **not** by widening the lens: the prize he names is staying zoomed
 *     in, and lowering the cluster is what lets the solver keep the camera at
 *     its nearest stand.
 *  2. all three the same size, above.
 *  3. one thin even gap, above.
 *
 * The clearance above the primary is measured against a **reserved top band**,
 * because the world paints under the Dynamic Island by design and a slab whose
 * top edge sits in that band is clipped on a real device even though it is
 * inside the frame. That is exactly what his screenshot showed and what the
 * container, which reports every inset as zero, cannot show.
 */
export const V11_CLUSTER: ClusterParams = {
  lift: 2.6,
  scale: 1.9,
  gap: 0.14,
  forward: 0.06,
  splay: 0.16,
  pitch: -0.1,
  verticalGapFactor: 1.3,
};

/**
 * **Landscape, and it has its own numbers now.**
 *
 * Stage 2 recorded the cost of not having them: *"landscape pays for the
 * cluster… holding a 2.93 m primary inside an 844 x 390 frame takes the solver
 * to its widest lens and furthest distance, so the three consoles' displays
 * there fall from 40.7 to 23.4 CSS px."* That is a regression this project
 * introduced, so it is this project's to fix, and the fix is not a compromise
 * in portrait: landscape gets a cluster scaled for a wide, shallow frame
 * instead of inheriting the one solved for a tall one — and the real cause was
 * smaller than that and worse: `slabCorners()` took no orientation, so the
 * landscape frame was solved against the **portrait** cluster's corners.
 */
export const V11_CLUSTER_LANDSCAPE: ClusterParams = {
  lift: 0.9,
  scale: 0.92,
  gap: 0.08,
  forward: 0.06,
  splay: 0.16,
  pitch: -0.1,
  verticalGapFactor: 1.3,
};

export type ClusterOrientation = 'portrait' | 'landscape';

export function clusterFor(orientation: ClusterOrientation): ClusterParams {
  return orientation === 'landscape' ? V11_CLUSTER_LANDSCAPE : V11_CLUSTER;
}

export interface SlabPlacement {
  kind: 'roles' | 'verdict' | 'candidate';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

/**
 * The three slabs' placements: the verdict at the apex, the run ledger to
 * the lower left and the candidate to the lower right.
 *
 * The spread and the drop are **derived** from the one gap and the slab's own
 * size, so the horizontal space between the lower pair and the vertical space
 * under the primary are the same distance by construction. What they come out
 * as on screen is measured, because perspective is not obliged to agree with
 * arithmetic: the pair stands a little nearer the camera than the primary.
 */
export function v11Cluster(orientation: ClusterOrientation = 'portrait'): SlabPlacement[] {
  const { y, z } = layout.screenBank;
  const c = clusterFor(orientation);
  const apexY = y + c.lift;
  const spread = (SLAB_WIDTH * c.scale + c.gap) / 2;
  const drop = SLAB_HEIGHT * c.scale + c.gap * c.verticalGapFactor;
  const supportY = apexY - drop;
  const supportZ = z + c.forward;
  return [
    {
      kind: 'verdict',
      position: [0, apexY, z],
      rotation: [c.pitch, 0, 0],
      scale: c.scale,
    },
    {
      kind: 'roles',
      position: [-spread, supportY, supportZ],
      rotation: [c.pitch, c.splay, 0],
      scale: c.scale,
    },
    {
      kind: 'candidate',
      position: [spread, supportY, supportZ],
      rotation: [c.pitch, -c.splay, 0],
      scale: c.scale,
    },
  ];
}

/** Where a slab of this kind is, for the anchors and the board camera. */
export function v11SlabAt(
  kind: SlabPlacement['kind'],
  orientation: ClusterOrientation = 'portrait',
): SlabPlacement {
  const found = v11Cluster(orientation).find((placement) => placement.kind === kind);
  if (!found) throw new Error(`no slab ${kind}`);
  return found;
}

/** The cluster's own centre and extent, for the board camera. */
export function v11ClusterCentre(orientation: ClusterOrientation = 'portrait'): {
  y: number;
  z: number;
  halfWidth: number;
} {
  const { y, z } = layout.screenBank;
  const c = clusterFor(orientation);
  const drop = SLAB_HEIGHT * c.scale + c.gap * c.verticalGapFactor;
  const spread = (SLAB_WIDTH * c.scale + c.gap) / 2;
  return {
    y: y + c.lift - drop * 0.5,
    z: z + c.forward * 0.5,
    halfWidth: spread + (SLAB_WIDTH * c.scale) / 2 + 0.2,
  };
}
