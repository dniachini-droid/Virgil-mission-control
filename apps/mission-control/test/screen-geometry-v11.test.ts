import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildGeometry, decodeMeshyPayload } from '../src/world/assets/meshyAsset.js';
import { placedPositions } from '../src/world/characters/visorFit.js';
import { mobilePose, overviewPose, PORTRAIT_FRAME } from '../src/world/mobile/composition.js';
import {
  fabricatorStationBase64Payload,
  keeperStationBase64Payload,
  proverStationBase64Payload,
} from '../src/world/props/v6Assets.js';
import { CAST, ROLES, type Role } from '../src/world/room/cast.js';
import { layout } from '../src/world/room/palette.js';
import { screenPlan } from '../src/world/screens/screenPlane.js';
import { V11_CLUSTER, v11Cluster } from '../src/world/screens/v11/bank.js';
import { bezelPlan } from '../src/world/screens/v11/bezel.js';
import { TEXTURE_WIDTH, textureBytes } from '../src/world/screens/v11/resolution.js';
import { v11SlabPlan } from '../src/world/screens/v11/ScreenBankV11.js';
import { cameraFor, displays, projected, slabOutlines } from '../study/measureDisplays.js';

/**
 * **How large each display actually is, in CSS pixels, on the viewports the
 * owner uses — and what follows from that.**
 *
 * This is the measurement the V11 brief makes the acceptance check for
 * stage 2: *"Measure the physical size each display occupies on a 390-CSS-px
 * portrait viewport, in CSS pixels, and state whether the primary status is
 * legible at that size. That is the number that decides whether this stage
 * succeeded."*
 *
 * It is a committed test and not a scratch script on purpose. V10 recorded
 * that V9's measuring script was thrown away and then could not be
 * reproduced when the owner asked a follow-up question, and that a defect
 * was left unfixed as a result. The numbers below are therefore recorded
 * as assertions: a change to the models, the composition, the close-up
 * camera or the authored slabs that moves any display's on-screen size
 * fails here and has to be looked at.
 *
 * **The threshold every assertion is against is 64 CSS pixels of display
 * width**, which is where this project has already measured screen text to
 * collapse (`docs/process/PHASE_1_CONVERSATION_INTERFACE.md`, and
 * `PHASE_1_PLAN.md`: contrast 0.715 at 480 px falling to 0.358 at 48 px,
 * "collapsing between 96 px and 64 px").
 */

const PAYLOADS: Record<Role, string> = {
  fabricator: fabricatorStationBase64Payload,
  prover: proverStationBase64Payload,
  keeper: keeperStationBase64Payload,
};

/** The 64 CSS pixels of display width below which screen text collapses. */
export const TEXT_COLLAPSE_PX = 64;

type Quad = [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3];

/**
 * **The measurement itself lives in `study/measureDisplays.ts`**, so that this
 * test, the parameter sweep that chose the cluster's numbers and any later
 * question all measure with one piece of code. It used to be duplicated here,
 * and the copy took no orientation — which is how a landscape frame came to be
 * judged against the portrait cluster.
 */
const DISPLAYS = displays('portrait');

describe('the models’ own openings, as measured', () => {
  /**
   * The V11 brief quotes V8.2's figures for the *fitted* outline; the drawn
   * one is that fit contracted by the least inset that puts it inside the
   * selection's footprint. Both are asserted, because the overlay
   * (`bezel.ts`) is derived from them and a payload change must not move
   * them silently.
   */
  const EXPECTED: Record<
    Role,
    { fitted: [number, number, number]; drawn: [number, number, number] }
  > = {
    fabricator: { fitted: [955.4, 569.0, 77.9], drawn: [939.3, 552.9, 77.9] },
    prover: { fitted: [885.7, 488.7, 42.9], drawn: [855.0, 458.1, 42.9] },
    keeper: { fitted: [886.6, 590.4, 81.1], drawn: [871.6, 575.4, 81.1] },
  };

  it.each(ROLES)('%s: the fit and the drawn outline are where they were measured', (role) => {
    const { metadata, screen } = CAST[role].station;
    const geometry = buildGeometry(metadata, decodeMeshyPayload(metadata, PAYLOADS[role]));
    const mesh = new THREE.Mesh(geometry);
    const { scale, positionScale, baseOffsetY } = metadata.runtime;
    mesh.scale.setScalar(scale * positionScale);
    mesh.position.y = baseOffsetY;
    const plan = screenPlan(
      screen,
      placedPositions(mesh),
      (geometry.index as THREE.BufferAttribute).array,
    );
    const want = EXPECTED[role];
    expect(2000 * plan.outline.fitted.halfWidth).toBeCloseTo(want.fitted[0], 0);
    expect(2000 * plan.outline.fitted.halfHeight).toBeCloseTo(want.fitted[1], 0);
    expect(1000 * plan.outline.fitted.radius).toBeCloseTo(want.fitted[2], 0);
    expect(2000 * plan.outline.drawn.halfWidth).toBeCloseTo(want.drawn[0], 0);
    expect(2000 * plan.outline.drawn.halfHeight).toBeCloseTo(want.drawn[1], 0);
    expect(1000 * plan.outline.drawn.radius).toBeCloseTo(want.drawn[2], 0);
  });
});

describe('how large each display is on a 390 x 844 portrait viewport', () => {
  const W = 390;
  const H = 844;

  /**
   * The measured sizes, in CSS pixels, at the overview. **These are the
   * numbers the stage is judged on.** Each is the mean of the quad's two
   * opposite edges, so a display seen a little obliquely is described by
   * its own width and height rather than by a bounding box.
   */
  const OVERVIEW: Record<string, [number, number]> = {
    fabricator: [43.1, 25.4],
    prover: [36.1, 19.3],
    keeper: [39.1, 25.9],
    // **All three slabs the same size**, which is the owner's stage-3
    // instruction from his own phone. The pair comes out 2.2 % narrower than
    // the primary because it is turned inward toward Virgil, which is also his
    // instruction; nothing is scaled differently.
    'slab-roles': [156.9, 104.5],
    'slab-verdict': [160.5, 109.3],
    'slab-candidate': [156.9, 104.5],
  };

  it.each(Object.keys(OVERVIEW))('%s is the size it was measured at', (id) => {
    const display = DISPLAYS[id];
    if (!display) throw new Error(`no display ${id}`);
    const { widthPx, heightPx } = projected(
      display.quad,
      cameraFor(overviewPose(W / H), W, H),
      W,
      H,
    );
    const want = OVERVIEW[id] as [number, number];
    expect(widthPx).toBeCloseTo(want[0], 0);
    expect(heightPx).toBeCloseTo(want[1], 0);
  });

  /**
   * **The finding this stage's hierarchy is built on.** Virgil's three
   * slabs are wider than the 64 CSS pixels at which screen text collapses;
   * the three consoles' displays are not, by a factor of about 1.6. So the
   * readable overview state lives on the slabs, and the consoles carry
   * theirs as colour and as a mark until the camera goes to them. That is
   * not a preference — it is what these two assertions say.
   */
  it('puts Virgil’s slabs above the 64 px text-collapse threshold', () => {
    for (const id of ['slab-roles', 'slab-verdict', 'slab-candidate']) {
      const display = DISPLAYS[id];
      if (!display) throw new Error(`no display ${id}`);
      const { widthPx } = projected(display.quad, cameraFor(overviewPose(W / H), W, H), W, H);
      expect(widthPx, id).toBeGreaterThan(TEXT_COLLAPSE_PX);
    }
  });

  it('leaves the three consoles below it, which is why their state is a mark and a colour', () => {
    for (const role of ROLES) {
      const display = DISPLAYS[role];
      if (!display) throw new Error(`no display ${role}`);
      const { widthPx } = projected(display.quad, cameraFor(overviewPose(W / H), W, H), W, H);
      expect(widthPx, role).toBeLessThan(TEXT_COLLAPSE_PX);
    }
  });

  /** The close-ups, where the words are meant to be read. */
  const CLOSE_UP: Record<string, [number, number]> = {
    fabricator: [200.2, 117.4],
    prover: [174.4, 93.3],
    keeper: [177.2, 117.1],
  };

  it.each(ROLES)('%s’s close-up is the size it was measured at, and is legible there', (role) => {
    const display = DISPLAYS[role];
    if (!display) throw new Error(`no display ${role}`);
    const { widthPx, heightPx } = projected(
      display.quad,
      cameraFor(mobilePose(role, W / H), W, H),
      W,
      H,
    );
    const want = CLOSE_UP[role] as [number, number];
    expect(widthPx).toBeCloseTo(want[0], 0);
    expect(heightPx).toBeCloseTo(want[1], 0);
    // Comfortably over the threshold: 2.7x to 3.1x it.
    expect(widthPx).toBeGreaterThan(TEXT_COLLAPSE_PX * 2.5);
  });

  it('shows the slabs well over the threshold when the camera goes to the board', () => {
    for (const id of ['slab-roles', 'slab-verdict', 'slab-candidate']) {
      const display = DISPLAYS[id];
      if (!display) throw new Error(`no display ${id}`);
      const { widthPx } = projected(
        display.quad,
        cameraFor(mobilePose('board', W / H), W, H),
        W,
        H,
      );
      expect(widthPx, id).toBeGreaterThan(TEXT_COLLAPSE_PX * 1.6);
    }
  });
});

describe('the other two viewports, recorded so a change is noticed', () => {
  const CASES: [number, number, Record<string, [number, number]>][] = [
    [
      430,
      932,
      {
        fabricator: [47.5, 28.0],
        prover: [39.9, 21.3],
        keeper: [43.1, 28.6],
        'slab-verdict': [176.9, 120.4],
      },
    ],
    [
      844,
      390,
      /**
       * **Landscape's consoles are recovered, and this is the number.**
       *
       * Stage 2 recorded them at 23.4 / 19.6 / 21.2 CSS px and attributed the
       * fall to the enlarged cluster. That was half the truth: `slabCorners()`
       * defaulted to the **portrait** cluster, so the landscape frame was
       * solved to hold geometry that is not on screen in landscape at all, and
       * the solver retreated to 13.89 m at its widest lens. Landscape has its
       * own cluster now and the solver is back at its nearest stand, 10.50 m,
       * at 38.6° instead of 50°.
       *
       * 45.2 / 35.8 / 40.6 — above stage 1's 40.7 / 34.2 / 36.9, which was
       * measured before any cluster existed.
       */
      {
        fabricator: [45.2, 26.0],
        prover: [35.8, 19.2],
        keeper: [40.6, 26.4],
        'slab-verdict': [85.3, 58.3],
      },
    ],
  ];

  it.each(CASES)('at %i x %i', (w, h, expected) => {
    // The cluster is this viewport's own: landscape hangs the three slabs
    // differently, and measuring one against the other is the fault that cost
    // landscape its consoles at stage 2.
    const set = displays(w > h ? 'landscape' : 'portrait');
    for (const [id, want] of Object.entries(expected)) {
      const display = set[id];
      if (!display) throw new Error(`no display ${id}`);
      const { widthPx, heightPx } = projected(
        display.quad,
        cameraFor(overviewPose(w / h), w, h),
        w,
        h,
      );
      expect(widthPx, id).toBeCloseTo(want[0], 0);
      expect(heightPx, id).toBeCloseTo(want[1], 0);
    }
  });
});

describe('the texture memory the six displays add', () => {
  it('is what the run record states, per tier', () => {
    const ids = [...ROLES, 'slab-roles', 'slab-verdict', 'slab-candidate'];
    const totals: Record<string, number> = {};
    for (const [tier, width] of Object.entries(TEXTURE_WIDTH)) {
      let bytes = 0;
      for (const id of ids) {
        const display = DISPLAYS[id];
        if (!display) throw new Error(`no display ${id}`);
        bytes += textureBytes(width, display.aspect);
      }
      totals[tier] = bytes / (1024 * 1024);
    }
    // Recorded to a tenth of a megabyte, so the run record's figures and
    // the code cannot drift apart.
    expect(totals.mobile).toBeCloseTo(20.14, 1);
    expect(totals.constrained).toBeCloseTo(20.14, 1);
    expect(totals.laptop).toBeCloseTo(45.32, 1);
    expect(totals.desktop).toBeCloseTo(80.57, 1);
    expect(totals.ultra).toBeCloseTo(80.57, 1);
  });
});

describe('the authored bezel overlay, derived from each model’s own opening', () => {
  it.each(ROLES)('%s: its inner opening is never larger than the model’s', (role) => {
    const plan = bezelPlan(role);
    expect(plan.innerHalfWidth).toBeLessThanOrEqual(plan.drawn.halfWidth + 1e-9);
    expect(plan.innerHalfHeight).toBeLessThanOrEqual(plan.drawn.halfHeight + 1e-9);
    // The lip tucks 4 mm under the picture's own edge on every side.
    expect(plan.drawn.halfWidth - plan.innerHalfWidth).toBeCloseTo(0.004, 6);
  });

  it.each(ROLES)('%s: its inner lip sits just in front of the picture’s own plane', (role) => {
    const plan = bezelPlan(role);
    expect(plan.offset).toBeGreaterThan(plan.pictureLift);
    expect(plan.offset - plan.pictureLift).toBeCloseTo(0.0035, 6);
    // Never so far in front of the picture that the lip casts a visible step.
    expect(plan.offset).toBeLessThan(0.015);
  });

  it.each(ROLES)('%s: never z-fights — every sample is in front of what it covers', (role) => {
    const plan = bezelPlan(role);
    expect(plan.minGap).toBeGreaterThan(0.0015);
  });

  it.each(ROLES)('%s: never floats — it beds down on the surround it rides', (role) => {
    const plan = bezelPlan(role);
    // Its outer edge meets the console: within 6 mm everywhere.
    expect(plan.edgeGap).toBeLessThan(0.006);
    // And it never stands more than 6 mm in front of the highest point the
    // console's own surround reaches on the same radius. `maxGap` is
    // larger than this on all three consoles and is *not* the floating
    // measure: it is how deep a groove the plate spans.
    expect(plan.maxLift).toBeLessThan(0.006);
  });

  it.each(ROLES)(
    '%s: covers real framing, and found a surface under nearly every sample',
    (role) => {
      const plan = bezelPlan(role);
      // 62 mm of ring plus the 4–15 mm the drawn outline already gave up.
      expect(plan.coveredPerSide).toBeGreaterThan(0.062);
      expect(plan.missed / plan.sampled).toBeLessThan(0.2);
    },
  );

  it('measures a surround that a flat faceplate could not have covered', () => {
    // The finding that decided the design: both of these consoles' own
    // surrounds rise more than a centimetre within 62 mm of the opening,
    // so a flat plate clearing them would have stood off the console.
    expect(bezelPlan('prover').surfaceMaxFront).toBeGreaterThan(0.01);
    expect(bezelPlan('keeper').surfaceMaxFront).toBeGreaterThan(0.01);
  });
});

describe('the two composition edits the owner asked for after seeing stage 2', () => {
  /**
   * *"the default camera angle is too high up… bring the camera down a
   * little bit more level so it's not looking on top of the tabletop"*, and
   * *"we need to bring all of the three screens above virgil… not increase
   * their height. Just move them up a bit higher just so that they're not…
   * blocking the consoles behind."*
   *
   * Both are held here rather than described, because they interact: a
   * lower camera raises everything in frame and raising the slabs raises
   * them again, so the two together could push the slabs off the top edge.
   */
  it('stands the portrait camera where the owner put it himself at stage 3', () => {
    // Stage 1: 28°, 8.48 m up. Stage 2: 22°, 7.02 m. Stage 3: 11.7 °, which is
    // the lowest position his own orbit allowed at 22° and the one he
    // photographed — *"which he says is how he wants it to start by default."*
    expect(PORTRAIT_FRAME.elevation).toBeLessThan(22);
    expect(PORTRAIT_FRAME.elevation).toBeCloseTo(22 - 0.18 * (180 / Math.PI), 1);
    const pose = overviewPose(390 / 844);
    expect(pose.position[1]).toBeLessThan(5.0);
    expect(pose.position[1]).toBeGreaterThan(3.6);
  });

  /**
   * **The owner replaced two of stage 2's own targets at stage 3**, from a
   * photograph of his own iPhone, and these assertions move with him rather
   * than being deleted:
   *
   *  - *"I actually think that all three screens should be the same size as the
   *    top screen, and it would still fit."* So the 25–35 % ratio stage 2
   *    asserted here is gone and equality is asserted instead. It is not a
   *    weakening: equality is the harder thing to hold, because two slabs at
   *    the primary's size have to fit inside 390 px with a real margin, and
   *    `test/cluster-v11-s3.test.ts` measures that margin.
   *  - *"I want there to be just even spacing between them, very thin."* So the
   *    spread and the drop are no longer free numbers; both are derived from
   *    one gap, and the measured evenness is asserted in the same new file.
   */
  it('arranges the three slabs as a shallow triangle above Virgil', () => {
    const cluster = v11Cluster();
    const verdict = cluster.find((p) => p.kind === 'verdict');
    const roles = cluster.find((p) => p.kind === 'roles');
    const candidate = cluster.find((p) => p.kind === 'candidate');
    if (!verdict || !roles || !candidate) throw new Error('cluster');
    // The verdict is the apex, and all three are the same size.
    expect(verdict.position[1]).toBeGreaterThan(roles.position[1]);
    expect(verdict.position[0]).toBe(0);
    expect(verdict.scale).toBe(roles.scale);
    expect(verdict.scale).toBe(candidate.scale);
    // The pair is offset left and right, and turned inward toward Virgil.
    expect(roles.position[0]).toBeLessThan(0);
    expect(candidate.position[0]).toBeGreaterThan(0);
    expect(roles.rotation[1]).toBeGreaterThan(0);
    expect(candidate.rotation[1]).toBeLessThan(0);
    // Shallow and wide: wider than it is tall.
    const width = 2 * Math.abs(roles.position[0]) + 1.54 * V11_CLUSTER.scale;
    const height = verdict.position[1] - roles.position[1] + 1.04 * V11_CLUSTER.scale;
    expect(width).toBeGreaterThan(height);
    // One gap, used twice: the horizontal space between the pair and the
    // vertical space under the primary are the same distance in the world.
    const horizontal = 2 * Math.abs(roles.position[0]) - 1.54 * V11_CLUSTER.scale;
    const vertical = verdict.position[1] - roles.position[1] - 1.04 * V11_CLUSTER.scale;
    expect(horizontal).toBeCloseTo(V11_CLUSTER.gap, 6);
    expect(vertical).toBeCloseTo(V11_CLUSTER.gap * V11_CLUSTER.verticalGapFactor, 6);
    // Only the position and the scale moved: the slab is the object
    // `ScreenBankV11` built, at every scale.
    expect(v11SlabPlan(1024).openingWidth).toBeCloseTo(1.476, 6);
    expect(v11SlabPlan(1024).openingHeight).toBeCloseTo(0.976, 6);
  });

  it('clears the role consoles behind, which is what the lift is for', () => {
    for (const [w, h] of [
      [390, 844],
      [430, 932],
    ] as [number, number][]) {
      const camera = cameraFor(overviewPose(w / h), w, h);
      const slabBottom = Math.max(
        ...['slab-roles', 'slab-candidate'].map((id) => {
          const display = DISPLAYS[id];
          if (!display) throw new Error(id);
          return Math.max(
            ...display.quad.map((corner) => ((1 - corner.clone().project(camera).y) / 2) * h),
          );
        }),
      );
      const consoleTop = Math.min(
        ...ROLES.map((role) => {
          const display = DISPLAYS[role];
          if (!display) throw new Error(role);
          return Math.min(
            ...display.quad.map((corner) => ((1 - corner.clone().project(camera).y) / 2) * h),
          );
        }),
      );
      /**
       * The slabs' lowest edge sits clear above the consoles' highest screen
       * edge, in screen pixels, at both portrait viewports.
       *
       * **Stage 3 closes this gap deliberately**, from 42 px to 11.0 px at
       * 390 × 844 (12.3 at 430 × 932), because the owner looked at his own
       * phone and said so: *"there's still a lot of space between where the top
       * of the consoles are and those screens are… the three big screens can
       * move a lot further down."* It stays **positive**, which is his own
       * first priority — no slab may stand over a console's picture — and that
       * is what bounds how far down they could go.
       */
      expect(consoleTop - slabBottom, `${w}x${h}`).toBeGreaterThan(8);
    }
  });

  it('keeps the slabs inside the top of the frame at every viewport', () => {
    for (const [w, h] of [
      [390, 844],
      [430, 932],
      [844, 390],
    ] as [number, number][]) {
      const set = displays(w > h ? 'landscape' : 'portrait');
      const camera = cameraFor(overviewPose(w / h), w, h);
      const top = Math.min(
        ...['slab-roles', 'slab-verdict', 'slab-candidate'].map((id) => {
          const display = set[id];
          if (!display) throw new Error(id);
          return Math.min(
            ...display.quad.map((corner) => ((1 - corner.clone().project(camera).y) / 2) * h),
          );
        }),
      );
      expect(top, `${w}x${h}`).toBeGreaterThan(12);
    }
  });
});

describe('the owner’s numeric targets for the slab cluster', () => {
  /**
   * *"primary screen 155–175 CSS px wide; supporting screens 125–140 CSS px
   * each; gap between the supporting screens 10–16 CSS px"*, at a 390 px
   * portrait viewport, under his priority order: the consoles stay
   * readable, the primary clears the safe area and the `⋯` control, then
   * the targets.
   */
  const W = 390;
  const H = 844;
  const box = (id: string) => {
    const display = DISPLAYS[id];
    if (!display) throw new Error(id);
    const camera = cameraFor(overviewPose(W / H), W, H);
    const points = display.quad.map((corner) => {
      const p = corner.clone().project(camera);
      return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * H] as [number, number];
    });
    const { widthPx, heightPx } = projected(display.quad, camera, W, H);
    return {
      widthPx,
      heightPx,
      left: Math.min(...points.map((p) => p[0])),
      right: Math.max(...points.map((p) => p[0])),
      top: Math.min(...points.map((p) => p[1])),
    };
  };

  it('meets the primary’s width target', () => {
    const primary = box('slab-verdict');
    expect(primary.widthPx).toBeGreaterThanOrEqual(155);
    expect(primary.widthPx).toBeLessThanOrEqual(175);
  });

  /**
   * **The stage-3 instruction replaces the stage-2 range**: *"I actually think
   * that all three screens should be the same size as the top screen, and it
   * would still fit."* The 125–140 px range is therefore gone, and equality is
   * asserted instead — the harder thing, because two slabs at the primary's
   * size have to fit inside 390 px with a margin, which is measured in
   * `test/cluster-v11-s3.test.ts`.
   */
  it('makes all three the same size, which is what he asked for', () => {
    const primary = box('slab-verdict').widthPx;
    for (const id of ['slab-roles', 'slab-candidate']) {
      // Within 3 %: the pair is turned inward toward Virgil, which
      // foreshortens it very slightly, and that inward angle is his
      // instruction too.
      expect(Math.abs(box(id).widthPx - primary) / primary, id).toBeLessThan(0.03);
    }
  });

  it('keeps one thin gap, used both between the pair and under the primary', () => {
    /**
     * Measured between the **slabs' own edges**, not between the pictures
     * inside them: what the reader sees as the space between two screens is
     * the space between their ivory bodies, and each body carries a 32 mm
     * bezel that the picture does not.
     */
    const camera = cameraFor(overviewPose(W / H), W, H);
    const edges = (id: string) => {
      const quad = slabOutlines('portrait')[id];
      if (!quad) throw new Error(id);
      const points = quad.map((corner) => {
        const p = corner.clone().project(camera);
        return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * H] as [number, number];
      });
      return {
        left: Math.min(...points.map((p) => p[0])),
        right: Math.max(...points.map((p) => p[0])),
        top: Math.min(...points.map((p) => p[1])),
        bottom: Math.max(...points.map((p) => p[1])),
      };
    };
    const horizontal = edges('slab-candidate').left - edges('slab-roles').right;
    const vertical = edges('slab-roles').top - edges('slab-verdict').bottom;
    // Thin, and the same both ways: 9.6 px and 9.7 px at 390 x 844.
    expect(horizontal).toBeGreaterThanOrEqual(6);
    expect(horizontal).toBeLessThanOrEqual(12);
    expect(vertical).toBeCloseTo(horizontal, 0);
  });

  it('clears the safe area and the ⋯ control above the primary', () => {
    // The control is 48 px at a 16 px inset, so it occupies y 16..64 at the
    // right edge. The primary's top is well below it and its own span does
    // not reach the control's column either.
    for (const [w, h] of [
      [390, 844],
      [430, 932],
    ] as [number, number][]) {
      const display = DISPLAYS['slab-verdict'];
      if (!display) throw new Error('slab-verdict');
      const camera = cameraFor(overviewPose(w / h), w, h);
      const points = display.quad.map((corner) => {
        const p = corner.clone().project(camera);
        return [((p.x + 1) / 2) * w, ((1 - p.y) / 2) * h] as [number, number];
      });
      expect(Math.min(...points.map((p) => p[1])), `${w}x${h}`).toBeGreaterThan(80);
      expect(Math.max(...points.map((p) => p[0])), `${w}x${h}`).toBeLessThan(w - 48);
    }
  });
});
