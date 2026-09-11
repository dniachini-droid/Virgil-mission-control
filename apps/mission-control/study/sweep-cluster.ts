import { overviewPose, PORTRAIT_FRAME } from '../src/world/mobile/composition.js';
import { CAST, ROLES } from '../src/world/room/cast.js';
import { layout } from '../src/world/room/palette.js';
import {
  type ClusterOrientation,
  type ClusterParams,
  V11_CLUSTER,
  V11_CLUSTER_LANDSCAPE,
} from '../src/world/screens/v11/bank.js';
import { cameraFor, corners, displays, projected, slabOutlines } from './measureDisplays.js';

/**
 * **The parameter sweep that chose the cluster's numbers, and the report that
 * says what they measure.**
 *
 * The owner's stage-3 instructions cannot be satisfied by arithmetic, because
 * the composition solver re-frames the camera against the cluster's own
 * corners: move a slab down and the camera comes nearer, which makes
 * everything — including that slab — larger again. So the numbers are found by
 * running the real solver on every trial.
 *
 * It is run through Vite rather than `tsx`, because it imports the shipped
 * model payloads and those arrive through Vite's `?raw` loader:
 *
 *   npx vitest run --config study/vitest.sweep.config.ts
 *   VIRGIL_SWEEP=portrait npx vitest run --config study/vitest.sweep.config.ts
 *   VIRGIL_SWEEP=landscape npx vitest run --config study/vitest.sweep.config.ts
 */

/**
 * **The reserved band at the top of a portrait frame.** The world paints under
 * the Dynamic Island on purpose — the picture should reach the glass — but a
 * slab whose top edge lands inside that band is clipped on a real device even
 * though it is inside the frame. That is what the owner's own screenshot
 * showed, and this container reports every inset as zero, so the band has to be
 * asserted rather than measured here. 59 px is what a 14 Pro / 15 reports as
 * `safe-area-inset-top`; the `⋯` control sits inside it plus a 12 px gutter and
 * is 48 px tall.
 */
export const RESERVED_TOP_PX = 59;
/** And the `⋯` development entry, which the primary may not sit under either. */
export const CHROME_TOP_PX = RESERVED_TOP_PX + 12 + 48;

export interface Measured {
  slabWidth: number;
  slabHeight: number;
  sameSize: number;
  gapH: number;
  gapV: number;
  topPx: number;
  sideMargin: number;
  /**
   * **Whether any slab covers a console's own screen**, in projected pixels.
   * The owner's highest-priority constraint is that the three physical consoles
   * stay readable, and the only honest test of that is whether the boxes
   * intersect on screen: positive is clear air between them, negative is a slab
   * standing over a console's picture.
   */
  consoleClearance: number;
  /** The intersection area, in square pixels. Must be zero. */
  overlapArea: number;
  consoles: Record<string, number>;
  fov: number;
  distance: number;
}

export function measure(w: number, h: number, orientation: ClusterOrientation): Measured {
  const pose = overviewPose(w / h);
  const camera = cameraFor(pose, w, h);
  const d = displays(orientation);
  const outlines = slabOutlines(orientation);
  const box = (quad: [number, number][]) => ({
    left: Math.min(...quad.map((p) => p[0])),
    right: Math.max(...quad.map((p) => p[0])),
    top: Math.min(...quad.map((p) => p[1])),
    bottom: Math.max(...quad.map((p) => p[1])),
  });
  const primary = box(corners(outlines['slab-verdict'] as never, camera, w, h));
  const left = box(corners(outlines['slab-roles'] as never, camera, w, h));
  const right = box(corners(outlines['slab-candidate'] as never, camera, w, h));
  const sizes = ['slab-verdict', 'slab-roles', 'slab-candidate'].map((id) => {
    const display = d[id];
    if (!display) throw new Error(id);
    return projected(display.quad, camera, w, h);
  });
  const widths = sizes.map((s) => s.widthPx);
  const consoleBoxes = ROLES.map((role) => {
    const display = d[role];
    if (!display) throw new Error(role);
    return box(corners(display.quad, camera, w, h));
  });
  const slabBoxes = [primary, left, right];
  let clearance = Number.POSITIVE_INFINITY;
  let overlapArea = 0;
  for (const console_ of consoleBoxes) {
    for (const slab of slabBoxes) {
      const overlapX = Math.min(console_.right, slab.right) - Math.max(console_.left, slab.left);
      if (overlapX <= 0) continue;
      // They share a column of the screen, so the vertical distance between
      // them is what decides whether one covers the other.
      clearance = Math.min(clearance, console_.top - slab.bottom);
      const overlapY = Math.min(console_.bottom, slab.bottom) - Math.max(console_.top, slab.top);
      if (overlapY > 0) overlapArea += overlapX * overlapY;
    }
  }
  const consoles: Record<string, number> = {};
  for (const role of ROLES) {
    const display = d[role];
    if (!display) throw new Error(role);
    consoles[role] = projected(display.quad, camera, w, h).widthPx;
  }
  void CAST;
  void layout;
  return {
    slabWidth: widths[0] as number,
    slabHeight: sizes[0]?.heightPx as number,
    // How far the three differ, as a fraction of the largest.
    sameSize: (Math.max(...widths) - Math.min(...widths)) / Math.max(...widths),
    gapH: right.left - left.right,
    gapV: Math.min(left.top, right.top) - primary.bottom,
    topPx: primary.top,
    sideMargin: Math.min(left.left, w - right.right),
    consoleClearance: Number.isFinite(clearance) ? clearance : 999,
    overlapArea,
    consoles,
    fov: pose.fov,
    distance: Math.hypot(
      pose.position[0] - pose.target[0],
      pose.position[1] - pose.target[1],
      pose.position[2] - pose.target[2],
    ),
  };
}

function report(orientation: ClusterOrientation): void {
  const cases: [number, number][] =
    orientation === 'portrait'
      ? [
          [390, 844],
          [430, 932],
        ]
      : [
          [844, 390],
          [1280, 800],
        ];
  for (const [w, h] of cases) {
    const m = measure(w, h, orientation);
    console.log(
      `${w}x${h} ${orientation}: slab ${m.slabWidth.toFixed(1)}x${m.slabHeight.toFixed(1)} px, ` +
        `spread ${(m.sameSize * 100).toFixed(1)}%, gapH ${m.gapH.toFixed(1)}, gapV ${m.gapV.toFixed(1)}, ` +
        `top ${m.topPx.toFixed(1)}, side ${m.sideMargin.toFixed(1)}, consoleClear ${m.consoleClearance.toFixed(1)}, overlap ${m.overlapArea.toFixed(0)}, ` +
        `consoles ${ROLES.map((r) => (m.consoles[r] ?? 0).toFixed(1)).join('/')}, ` +
        `fov ${m.fov.toFixed(1)}, dist ${m.distance.toFixed(2)}`,
    );
  }
}

/** Overwrites the live parameters for one trial. Only the sweep does this. */
function apply(target: ClusterParams, trial: Partial<ClusterParams>): void {
  Object.assign(target, trial);
}

function sweepPortrait(): void {
  const keep = { ...V11_CLUSTER };
  let best: { score: number; trial: Partial<ClusterParams>; m: Measured; m430: Measured } | null =
    null;
  for (let scale = 1.7; scale <= 2.15; scale += 0.05) {
    for (let lift = 1.2; lift <= 3.3; lift += 0.1) {
      for (const gap of [0.1, 0.12, 0.14, 0.16, 0.18]) {
        for (const forward of [0.06]) {
          const trial = { scale, lift, gap, forward };
          apply(V11_CLUSTER, trial);
          const m = measure(390, 844, 'portrait');
          const m430 = measure(430, 932, 'portrait');
          // The owner's constraints, hardest first.
          if (m.consoles.fabricator === undefined) continue;
          if ((m.consoles.fabricator as number) < 43.3) continue; // consoles no smaller than stage 2
          if (m.overlapArea > 0) continue; // no slab may stand over a console's screen
          if (m.consoleClearance < 6) continue; // and a little air between them
          if (m.topPx < CHROME_TOP_PX + 4) continue; // not clipped, and clear of the ⋯
          if (m430.topPx < CHROME_TOP_PX + 4) continue;
          if (m.sideMargin < 8) continue; // a real margin at 390
          if (Math.abs(m.gapH - m.gapV) > 1.5) continue; // one even gap
          if (m.gapH < 6 || m.gapH > 14) continue; // thin
          // Then: as large as possible, and as near as possible.
          const score = m.slabWidth * 2 + (m.consoles.fabricator as number) * 3 - m.distance;
          if (!best || score > best.score) best = { score, trial, m, m430 };
        }
      }
    }
  }
  apply(V11_CLUSTER, keep);
  if (!best) {
    console.log('portrait: no trial satisfied every constraint');
    return;
  }
  console.log('portrait best:', JSON.stringify(best.trial));
  console.log(
    `  390: slab ${best.m.slabWidth.toFixed(1)}x${best.m.slabHeight.toFixed(1)}, gapH ${best.m.gapH.toFixed(1)}, gapV ${best.m.gapV.toFixed(1)}, top ${best.m.topPx.toFixed(1)}, side ${best.m.sideMargin.toFixed(1)}, clear ${best.m.consoleClearance.toFixed(1)}, consoles ${ROLES.map((r) => (best?.m.consoles[r] ?? 0).toFixed(1)).join('/')}, fov ${best.m.fov.toFixed(1)}, dist ${best.m.distance.toFixed(2)}`,
  );
  console.log(
    `  430: slab ${best.m430.slabWidth.toFixed(1)}, top ${best.m430.topPx.toFixed(1)}, side ${best.m430.sideMargin.toFixed(1)}, consoles ${ROLES.map((r) => (best?.m430.consoles[r] ?? 0).toFixed(1)).join('/')}`,
  );
}

function sweepLandscape(): void {
  const keep = { ...V11_CLUSTER_LANDSCAPE };
  let best: { score: number; trial: Partial<ClusterParams>; m: Measured } | null = null;
  for (let scale = 0.8; scale <= 1.9; scale += 0.06) {
    for (let lift = 0.9; lift <= 2.6; lift += 0.1) {
      for (const gap of [0.08, 0.1, 0.12, 0.14]) {
        const trial = { scale, lift, gap, forward: 0.06 };
        apply(V11_CLUSTER_LANDSCAPE, trial);
        const m = measure(844, 390, 'landscape');
        if (m.consoles.fabricator === undefined) continue;
        if (m.overlapArea > 0) continue;
        if (m.consoleClearance < 6) continue;
        if (m.topPx < 12) continue;
        if (m.sideMargin < 12) continue;
        if (Math.abs(m.gapH - m.gapV) > 1.5) continue;
        if (m.gapH < 5 || m.gapH > 12) continue;
        // Landscape's whole point at stage 3 is the consoles coming back, so
        // they carry the weight; the slabs have to stay over the 64 px text
        // threshold.
        if (m.slabWidth < 66) continue;
        const score = (m.consoles.fabricator as number) * 4 + m.slabWidth;
        if (!best || score > best.score) best = { score, trial, m };
      }
    }
  }
  apply(V11_CLUSTER_LANDSCAPE, keep);
  if (!best) {
    console.log('landscape: no trial satisfied every constraint');
    return;
  }
  console.log('landscape best:', JSON.stringify(best.trial));
  console.log(
    `  844x390: slab ${best.m.slabWidth.toFixed(1)}x${best.m.slabHeight.toFixed(1)}, gapH ${best.m.gapH.toFixed(1)}, gapV ${best.m.gapV.toFixed(1)}, top ${best.m.topPx.toFixed(1)}, side ${best.m.sideMargin.toFixed(1)}, clear ${best.m.consoleClearance.toFixed(1)}, consoles ${ROLES.map((r) => (best?.m.consoles[r] ?? 0).toFixed(1)).join('/')}, fov ${best.m.fov.toFixed(1)}, dist ${best.m.distance.toFixed(2)}`,
  );
}

/**
 * What the elevation does to the frame, with the cluster held still. The owner
 * wants the **lowest** camera position to be the default, so the question this
 * answers is what that costs the three consoles.
 */
function elevations(): void {
  const keep = PORTRAIT_FRAME.elevation;
  for (const elevation of [22, 20, 18, 16, 14, 12, 11.7, 10, 8]) {
    PORTRAIT_FRAME.elevation = elevation;
    const m = measure(390, 844, 'portrait');
    console.log(
      `elevation ${elevation}: consoles ${ROLES.map((r) => (m.consoles[r] ?? 0).toFixed(1)).join('/')}, ` +
        `slab ${m.slabWidth.toFixed(1)}, top ${m.topPx.toFixed(1)}, clear ${m.consoleClearance.toFixed(1)}, fov ${m.fov.toFixed(1)}, dist ${m.distance.toFixed(2)}`,
    );
  }
  PORTRAIT_FRAME.elevation = keep;
}

/** A scan of one parameter with the others held, for finding what binds. */
function scan(): void {
  const keep = { ...V11_CLUSTER };
  for (const scale of [1.6, 1.7, 1.8, 1.9, 2.0]) {
    for (let lift = 1.4; lift <= 3.4; lift += 0.2) {
      Object.assign(V11_CLUSTER, { scale, lift, gap: 0.14, forward: 0.06 });
      const m = measure(390, 844, 'portrait');
      console.log(
        `scale ${scale.toFixed(2)} lift ${lift.toFixed(2)}: slab ${m.slabWidth.toFixed(1)}, top ${m.topPx.toFixed(1)}, side ${m.sideMargin.toFixed(1)}, clear ${m.consoleClearance.toFixed(1)}, overlap ${m.overlapArea.toFixed(0)}, consoles ${ROLES.map((r) => (m.consoles[r] ?? 0).toFixed(1)).join('/')}, gapH ${m.gapH.toFixed(1)}, gapV ${m.gapV.toFixed(1)}, fov ${m.fov.toFixed(1)}, dist ${m.distance.toFixed(2)}`,
      );
    }
  }
  Object.assign(V11_CLUSTER, keep);
}

function scanLandscape(): void {
  const keep = { ...V11_CLUSTER_LANDSCAPE };
  for (const scale of [0.7, 0.9, 1.1, 1.3, 1.5]) {
    for (let lift = 0.8; lift <= 2.6; lift += 0.3) {
      Object.assign(V11_CLUSTER_LANDSCAPE, { scale, lift, gap: 0.12, forward: 0.06 });
      const m = measure(844, 390, 'landscape');
      console.log(
        `L scale ${scale.toFixed(2)} lift ${lift.toFixed(2)}: slab ${m.slabWidth.toFixed(1)}, top ${m.topPx.toFixed(1)}, side ${m.sideMargin.toFixed(1)}, clear ${m.consoleClearance.toFixed(1)}, overlap ${m.overlapArea.toFixed(0)}, consoles ${ROLES.map((r) => (m.consoles[r] ?? 0).toFixed(1)).join('/')}, gapH ${m.gapH.toFixed(1)}, gapV ${m.gapV.toFixed(1)}, fov ${m.fov.toFixed(1)}, dist ${m.distance.toFixed(2)}`,
      );
    }
  }
  Object.assign(V11_CLUSTER_LANDSCAPE, keep);
}

/** Every display's size at every viewport, to a tenth of a pixel. */
function sizes(): void {
  const cases: [number, number, ClusterOrientation][] = [
    [390, 844, 'portrait'],
    [430, 932, 'portrait'],
    [844, 390, 'landscape'],
    [1280, 800, 'landscape'],
  ];
  for (const [w, h, orientation] of cases) {
    const camera = cameraFor(overviewPose(w / h), w, h);
    const d = displays(orientation);
    const line = Object.entries(d)
      .map(([id, display]) => {
        const p = projected(display.quad, camera, w, h);
        return `${id} ${p.widthPx.toFixed(1)}x${p.heightPx.toFixed(1)}`;
      })
      .join(' | ');
    console.log(`SIZES ${w}x${h}: ${line}`);
  }
}

export function run(mode: string): void {
  if (mode === 'sizes') {
    sizes();
    return;
  }
  if (mode === 'scanl') {
    scanLandscape();
    return;
  }
  if (mode === 'scan') {
    scan();
    return;
  }
  if (mode === 'elevations') {
    elevations();
    return;
  }
  if (mode === 'portrait') sweepPortrait();
  else if (mode === 'landscape') sweepLandscape();
  else {
    report('portrait');
    report('landscape');
  }
}
