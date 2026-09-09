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
import { V11_BANK_LIFT, v11Bank } from '../src/world/screens/v11/bank.js';
import { bezelPlan } from '../src/world/screens/v11/bezel.js';
import { TEXTURE_WIDTH, textureBytes } from '../src/world/screens/v11/resolution.js';
import { v11SlabPlan } from '../src/world/screens/v11/ScreenBankV11.js';

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

function cameraFor(
  pose: { position: readonly number[]; target: readonly number[]; fov: number },
  w: number,
  h: number,
) {
  const camera = new THREE.PerspectiveCamera(pose.fov, w / h, 0.1, 200);
  camera.position.set(
    pose.position[0] as number,
    pose.position[1] as number,
    pose.position[2] as number,
  );
  camera.lookAt(pose.target[0] as number, pose.target[1] as number, pose.target[2] as number);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return camera;
}

/** A world-space quad's mean width and height on screen, in CSS pixels. */
function projected(quad: Quad, camera: THREE.PerspectiveCamera, w: number, h: number) {
  const pts = quad.map((corner) => {
    const p = corner.clone().project(camera);
    return [((p.x + 1) / 2) * w, ((1 - p.y) / 2) * h] as [number, number];
  });
  const edge = (a: number, b: number) => {
    const p = pts[a] as [number, number];
    const q = pts[b] as [number, number];
    return Math.hypot(p[0] - q[0], p[1] - q[1]);
  };
  return {
    widthPx: (edge(0, 1) + edge(3, 2)) / 2,
    heightPx: (edge(0, 3) + edge(1, 2)) / 2,
  };
}

/** Every display's drawn outline, as a quad in the room, with its own aspect. */
function displays() {
  const out: Record<string, { quad: Quad; aspect: number; openingMm: [number, number] }> = {};
  for (const role of ROLES) {
    const { metadata, screen } = CAST[role].station;
    const geometry = buildGeometry(metadata, decodeMeshyPayload(metadata, PAYLOADS[role]));
    const mesh = new THREE.Mesh(geometry);
    const { scale, positionScale, baseOffsetY } = metadata.runtime;
    mesh.scale.setScalar(scale * positionScale);
    mesh.position.y = baseOffsetY;
    const positions = placedPositions(mesh);
    const plan = screenPlan(screen, positions, (geometry.index as THREE.BufferAttribute).array);
    const d = plan.outline.drawn;
    const origin = plan.plane.centre
      .clone()
      .add(plan.plane.right.clone().multiplyScalar(d.centreU))
      .add(plan.plane.up.clone().multiplyScalar(d.centreV))
      .add(plan.plane.normal.clone().multiplyScalar(plan.lift));
    const right = plan.plane.right.clone().multiplyScalar(d.halfWidth);
    const up = plan.plane.up.clone().multiplyScalar(d.halfHeight);
    const member = CAST[role];
    const group = new THREE.Group();
    group.position.set(member.at[0], member.at[1], member.at[2]);
    group.rotation.y = member.rotationY;
    group.updateMatrixWorld(true);
    const world = (p: THREE.Vector3) => p.clone().applyMatrix4(group.matrixWorld);
    out[role] = {
      quad: [
        world(origin.clone().sub(right).add(up)),
        world(origin.clone().add(right).add(up)),
        world(origin.clone().add(right).sub(up)),
        world(origin.clone().sub(right).sub(up)),
      ],
      aspect: plan.aspect,
      openingMm: [2 * d.halfWidth * 1000, 2 * d.halfHeight * 1000],
    };
  }
  const { y, z, spread, splay } = v11Bank();
  const plan = v11SlabPlan(1024);
  const slabs: [string, [number, number, number], [number, number, number]][] = [
    ['slab-roles', [-spread, y - 0.08, z + 0.35], [-0.1, splay, 0]],
    ['slab-verdict', [0, y, z], [-0.1, 0, 0]],
    ['slab-candidate', [spread, y - 0.08, z + 0.35], [-0.1, -splay, 0]],
  ];
  for (const [id, position, rotation] of slabs) {
    const group = new THREE.Group();
    group.position.set(position[0], position[1], position[2]);
    group.rotation.set(rotation[0], rotation[1], rotation[2]);
    group.updateMatrixWorld(true);
    const hw = plan.displayWidth / 2;
    const hh = plan.displayHeight / 2;
    out[id] = {
      quad: [
        new THREE.Vector3(-hw, hh, 0).applyMatrix4(group.matrixWorld),
        new THREE.Vector3(hw, hh, 0).applyMatrix4(group.matrixWorld),
        new THREE.Vector3(hw, -hh, 0).applyMatrix4(group.matrixWorld),
        new THREE.Vector3(-hw, -hh, 0).applyMatrix4(group.matrixWorld),
      ],
      aspect: plan.displayWidth / plan.displayHeight,
      openingMm: [plan.displayWidth * 1000, plan.displayHeight * 1000],
    };
  }
  return out;
}

const DISPLAYS = displays();

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
    fabricator: [43.3, 25.4],
    prover: [36.4, 19.5],
    keeper: [39.5, 26.0],
    'slab-roles': [87.6, 58.3],
    'slab-verdict': [85.4, 57.2],
    'slab-candidate': [87.6, 58.3],
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
        fabricator: [47.8, 28.0],
        prover: [40.2, 21.5],
        keeper: [43.5, 28.7],
        'slab-verdict': [94.1, 63.0],
      },
    ],
    [
      844,
      390,
      {
        fabricator: [40.7, 23.4],
        prover: [32.3, 17.3],
        keeper: [36.6, 23.8],
        'slab-verdict': [84.1, 57.8],
      },
    ],
  ];

  it.each(CASES)('at %i x %i', (w, h, expected) => {
    for (const [id, want] of Object.entries(expected)) {
      const display = DISPLAYS[id];
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
  it('stands the portrait camera lower than stage 1’s 28°', () => {
    expect(PORTRAIT_FRAME.elevation).toBeLessThan(28);
    const pose = overviewPose(390 / 844);
    // 7.02 m up against stage 1's 8.48.
    expect(pose.position[1]).toBeLessThan(7.5);
    expect(pose.position[1]).toBeGreaterThan(6.2);
  });

  it('lifts the slabs without changing their size', () => {
    expect(V11_BANK_LIFT).toBeGreaterThan(0.9);
    expect(v11Bank().y).toBeCloseTo(layout.screenBank.y + V11_BANK_LIFT, 9);
    // Only the position moved: the slab is the same object it was.
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
        ...['slab-roles', 'slab-verdict', 'slab-candidate'].map((id) => {
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
      // The slabs' lowest edge sits clear above the consoles' highest
      // screen edge, in screen pixels, at both portrait viewports.
      expect(consoleTop - slabBottom, `${w}x${h}`).toBeGreaterThan(20);
    }
  });

  it('keeps the slabs inside the top of the frame at every viewport', () => {
    for (const [w, h] of [
      [390, 844],
      [430, 932],
      [844, 390],
    ] as [number, number][]) {
      const camera = cameraFor(overviewPose(w / h), w, h);
      const top = Math.min(
        ...['slab-roles', 'slab-verdict', 'slab-candidate'].map((id) => {
          const display = DISPLAYS[id];
          if (!display) throw new Error(id);
          return Math.min(
            ...display.quad.map((corner) => ((1 - corner.clone().project(camera).y) / 2) * h),
          );
        }),
      );
      // Portrait leaves hundreds of pixels; landscape is the tight one, at
      // about 18 px, and it is recorded rather than asserted loosely.
      expect(top, `${w}x${h}`).toBeGreaterThan(12);
    }
  });
});
