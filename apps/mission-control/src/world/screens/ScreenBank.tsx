import { useFrame } from '@react-three/fiber';
import type { CandidateState } from '@virgil/domain';
import { use, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { createGlassMaterial, createRoundedConvexGlassGeometry } from '../glass.js';
import type { SlabName } from '../panel/panelContent.js';
import type { ReplaySpeed } from '../replay/replayTimeline.js';
import { LONGEST_RECORDED_HOP, replayLedgerAt } from '../replay/replayTimeline.js';
import type { Outcome, RunMode, ScreenContent } from '../room/demo.js';
import { layout, room } from '../room/palette.js';
import { RETURNING, SLAB_ARRIVAL } from './arrival.js';
import { CANDIDATE_ID } from './candidate.js';
import {
  BAND_HEIGHT,
  bigWord,
  brackets,
  type Ctx,
  DIM,
  dataLine,
  display,
  FAINT,
  finish,
  fitFont,
  frame,
  mono,
  OWNER_GOLD,
  quieten,
  RULE,
  roundRect,
  spaced,
  TEXT,
} from './draw.js';
import { loadScreenFonts } from './fonts.js';
import {
  elapsedOf,
  inFlight,
  isSettled,
  LEDGER_HEAD_PX,
  LEDGER_ROWS,
  LONGEST_HOP,
  ledgerAt,
  ledgerRowHeight,
  rowAtUv,
} from './ledger.js';
import { clamp01, drift, easeOut, landing } from './motion.js';
import { drawReturn, withdrawal } from './returning.js';
import { evidenceLines } from './tally.js';
import { drawVerdictMark, verdictLook } from './verdicts.js';

/**
 * Virgil's three slabs, above him: the owner's one exception to the
 * consoles carrying their own screens (`docs/process/PHASE_1_STYLISED_SPEC.md`
 * §0.9, §0.10.2), because his ring console's screens face inward and are
 * unreadably small. They are drawn onto canvas textures in the `ADR-0010`
 * pattern — no font fetch, no `data:` URI — in two bundled faces
 * (`fonts.ts`), and they stay **on**: he is always conducting, where the
 * three agents' screens wake when summoned and go dark when done
 * (`ConsoleScreen.tsx`).
 *
 * Left, **ROLES**: who holds the hop. Centre, **VERDICT**: the latest
 * verdict, arriving as a convergence (`returning.ts`) with the
 * deterministic evidence beneath it, and until there is one, what the
 * candidate is doing instead — never a fixed word. Right, **CANDIDATE**:
 * the candidate's state in the constitution's own vocabulary, driven from
 * the demonstration's beat, and its identity, which does not change while
 * judgement proceeds. During the owner gate (§0.10.10) the right slab is
 * the one thing lit and the other two go quiet.
 *
 * Everything drawn here is **illustrative** and is labelled so on every
 * panel, on the thick amber stripe along its foot.
 */

export function ScreenBank({
  content,
  outcome,
  seconds,
  mode,
  speed,
  onOpen,
}: {
  content: ScreenContent;
  outcome: Outcome;
  /** The demonstration's own clock: the ledger's elapsed column is time. */
  seconds: number;
  /** Which mode is running: the two bands and the two ledgers differ. */
  mode: RunMode;
  /** The replay's speed, which decides where its playback clock is. */
  speed: ReplaySpeed;
  /** Clicking a slab opens that slab's own record in the panel (V9). */
  onOpen: (slab: SlabName, row?: number) => void;
}) {
  const { y, z, spread, splay } = layout.screenBank;
  const since = useRef({ verdict: '' as string, at: 0, candidate: '' as string, candidateAt: 0 });
  /*
   * The demonstration's clock, carried between phase boundaries. `useDemo`
   * re-renders React only when a beat changes, so `seconds` is the time of
   * the last boundary; the slab's own clock advances every frame, and the
   * elapsed column has to be time and not a step. This is the whole of the
   * arithmetic that makes the bar grow.
   */
  const demoClock = useRef({ seconds: -1, atT: 0 });
  return (
    <group>
      <Panel
        position={[-spread, y - 0.08, z + 0.35]}
        rotation={[-0.1, splay, 0]}
        fps={24}
        onOpen={() => onOpen('roles')}
        onOpenRow={(row) => onOpen('roles', row)}
        draw={(c, t, corner) => {
          const dc = demoClock.current;
          if (dc.seconds !== seconds) {
            dc.seconds = seconds;
            dc.atT = t;
          }
          drawLedger(c, t, seconds + (t - dc.atT), content, outcome, corner, mode, speed);
        }}
      />
      <Panel
        position={[0, y, z]}
        rotation={[-0.1, 0, 0]}
        fps={24}
        onOpen={() => onOpen('verdict')}
        draw={(c, t, corner) => {
          const s = since.current;
          if (s.verdict !== content.verdict) {
            s.verdict = content.verdict;
            s.at = t;
          }
          drawVerdict(c, t, t - s.at, content, outcome, corner);
        }}
      />
      <Panel
        position={[spread, y - 0.08, z + 0.35]}
        rotation={[-0.1, -splay, 0]}
        onOpen={() => onOpen('candidate')}
        draw={(c, t, corner) => {
          const s = since.current;
          const key = `${content.candidate}:${content.ownerGate}`;
          if (s.candidate !== key) {
            s.candidate = key;
            s.candidateAt = t;
          }
          drawCandidate(c, t, t - s.candidateAt, content, corner);
        }}
      />
    </group>
  );
}

/**
 * The screen as an **object** (V7, §0.3). The owner, of V6: "it just
 * looks cheap and everything else looks really nice … I don't want richer
 * details. I just want it to look nicer … More like a screen. Shiny and a
 * bit of light reflecting off it." And, precisely: a slight curve
 * outwards, the text sitting below the glass, and a case in the
 * characters' own cream that bulges out like the old Macs.
 *
 * So, front to back: a **convex sheet of glass** with a CRT's profile
 * (`glass.ts`), rising `bulge` at its centre; behind it, recessed `recess`
 * under the case's front plane, the **display** — the canvas, unlit and
 * untone-mapped, with the honesty band baked into it; round the opening a
 * pillowy **front plate** with a deep bevel; and behind that the
 * **swollen shell**, a half-ellipsoid, in the cream sampled from the
 * cast's own textures (`room.surface.castCream`).
 */
/**
 * A slab's authored proportions, in one place because the front plate,
 * the glass over it and the canvas drawn behind it all have to agree —
 * and, since V8.2, because the layout of the picture has to know where the
 * rounded corner of the opening is. See `frame` and `band` in `draw.ts`.
 */
export function slabPlan(width: number, height: number) {
  const bezel = 0.09 * (width / 1.3) + 0.03;
  const radius = 0.16 * (width / 1.3) + 0.02;
  const openingRadius = Math.max(0.03, radius - bezel);
  // The display plane is wider than the opening, so its own edge hides
  // behind the plate's lip; that overhang is how much of the canvas is
  // never seen.
  const overhang = SLAB_OVERHANG_M;
  const displayWidth = width + 2 * overhang;
  const displayHeight = height + 2 * overhang;
  return {
    bezel,
    plate: 0.05,
    // Shallow, and the lip thin: a 14 mm recess under a 22 mm lip hid the
    // display's edge — and part of the honesty band — from oblique angles
    // in the first V7 capture. 8 mm under 10 mm keeps the parallax and
    // keeps the band whole.
    recess: 0.008,
    bulge: 0.03 * (width / 1.3),
    radius,
    openingRadius,
    displayWidth,
    displayHeight,
    /**
     * The corner radius the picture is laid out inside, in the canvas's own
     * pixels, measured from the **canvas's** edge rather than the opening's:
     * the opening's radius plus the overhang the plate hides. That is a
     * little more than the opening's own curve asks for, deliberately — it
     * is the conservative direction, and `test/console-screens.test.ts`
     * checks the band's words against the real opening.
     */
    cornerPixels: ((openingRadius + overhang) / displayWidth) * SLAB_CANVAS_PIXELS,
    /**
     * **The canvas is drawn at the display plane's aspect, not the
     * opening's (V8.3).** It is mapped onto a plane `displayWidth` by
     * `displayHeight`, and it was sized `width` by `height` — the opening's
     * — so a 1.3 × 0.8 m opening behind a 1.36 × 0.86 m plane stretched the
     * whole picture horizontally by **2.78 %**: every letter, the verdict
     * ring out of round, the honesty band's four words wider than they were
     * set. V8.1 fixed exactly this fault for the consoles' screens
     * (`screenPlane.ts`); V8.2 measured it here, recorded it in the run
     * record and left it as outside its two items. It is inside this one,
     * because it is the same surface.
     */
    canvasWidthPixels: SLAB_CANVAS_PIXELS,
    canvasHeightPixels: Math.max(
      64,
      Math.round((SLAB_CANVAS_PIXELS * displayHeight) / displayWidth),
    ),
  };
}

/** The width of a slab's canvas, in pixels. Its height follows the display plane's aspect. */
export const SLAB_CANVAS_PIXELS = 1024;

/**
 * **How far the display plane stands outside the opening, in metres**
 * (V9, item 8). The owner: *"Virgil's screen doesn't go all the way to
 * the bottom - there's a gap and it's awkward. Fix that too."*
 *
 * The plane has to be a little larger than the opening so that its own
 * cut edge is hidden behind the plate's lip rather than showing as a hard
 * line inside the picture. From V7 to V8.3 that margin was `bezel / 4` —
 * **30 mm on a 1.3 × 0.8 m slab**, which is 3.49 % of the plane's height
 * at the top and the same again at the bottom, and therefore **22.6 of
 * the honesty band's 118 canvas pixels, a fifth of the band, permanently
 * behind the bezel.** The picture stopped short of the frame, and the
 * band's own words sat higher in the opening than they were set to.
 *
 * It is now **6 mm**: the smallest margin that still hides the plane's
 * edge behind a lip 50 mm deep at every angle the board camera reaches,
 * and the same 6 mm the glass has stood off the opening's own curve
 * since V8.2, so the two are one number instead of two. The hidden share
 * of each edge goes from 3.49 % to 0.73 %, and 116 of the band's 118
 * pixels are now inside the opening. `test/console-screens.test.ts`
 * computes both fractions rather than quoting them.
 *
 * **This is authored geometry — ours, not Meshy's** — so unlike a
 * console's screen there is no irregular opening to fit and no excuse for
 * a mismatch: the opening, the plane, the canvas, the corner radius and
 * the glass all now come from this one number and the two the slab is
 * authored at.
 */
export const SLAB_OVERHANG_M = 0.006;

function Slab({
  width,
  height,
  texture,
  onOpen,
  onOpenRow,
  canvasHeight,
}: {
  width: number;
  height: number;
  texture: THREE.Texture;
  onOpen: () => void;
  /** A click inside the ledger's rows, if this slab has any. */
  onOpenRow?: ((row: number) => void) | undefined;
  canvasHeight: number;
}) {
  const { bezel, plate, recess, bulge, radius, openingRadius, displayWidth, displayHeight } =
    slabPlan(width, height);
  const { front, shell, glass } = useMemo(() => {
    const outer = roundedRect(width + 2 * bezel, height + 2 * bezel, radius);
    outer.holes.push(roundedRectPath(width, height, openingRadius));
    const front = new THREE.ExtrudeGeometry(outer, {
      depth: plate,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.01,
      bevelSegments: 4,
      curveSegments: 14,
    });
    // The back half of a sphere, scaled to the case: rim toward the plate.
    const shell = new THREE.SphereGeometry(1, 36, 18, 0, Math.PI);
    // The glass is a little wider than the opening and starts a few
    // millimetres inside the plate, so its edge is under the lip. **V8.2:
    // it follows the opening's curve.** It was a rectangle, and its square
    // corners stood 17 mm out over the plate's rounded corners — the same
    // fault as the console screens', on the authored geometry that is
    // supposed to be their reference. Its radius is the opening's plus the
    // 6 mm it overhangs by, so the two curves are concentric.
    const glass = createRoundedConvexGlassGeometry(
      width + 2 * SLAB_OVERHANG_M,
      height + 2 * SLAB_OVERHANG_M,
      openingRadius + SLAB_OVERHANG_M,
      bulge + 0.004,
      160,
    );
    return { front, shell, glass };
  }, [width, height, bezel, radius, bulge, openingRadius, plate]);
  const glassMaterial = useMemo(() => createGlassMaterial(), []);
  return (
    <group>
      {/* The front plate: extruded from z = −plate to 0, bevelled both ways. */}
      <mesh geometry={front} position={[0, 0, -plate]} castShadow receiveShadow>
        <meshStandardMaterial color={room.surface.castCream} roughness={0.55} metalness={0} />
      </mesh>
      {/* The shell, swelling backwards from just inside the plate. */}
      <mesh
        geometry={shell}
        position={[0, -height * 0.04, -plate + 0.01]}
        rotation={[0, Math.PI, 0]}
        scale={[width / 2 + bezel * 0.92, height / 2 + bezel * 0.92, 0.42 * height + 0.06]}
        castShadow
      >
        <meshStandardMaterial color={room.surface.castCream} roughness={0.55} metalness={0} />
      </mesh>
      {/* The display, under the glass: a little wider than the opening so its
          edges hide behind the lip. Its plane's own size, which the canvas
          is now drawn at (V8.3). */}
      <mesh
        position={[0, 0, -recess]}
        onClick={(event) => {
          event.stopPropagation();
          // A ledger row, if the point is in one: the owner's *"clicking a
          // row opens that hop"*. The row is derived from the texture
          // coordinate the raycast returned, through the same layout the
          // drawing uses (`ledger.ts`), so the two cannot disagree.
          const row =
            onOpenRow && event.uv
              ? rowAtUv(event.uv.y, canvasHeight, canvasHeight - BAND_HEIGHT)
              : null;
          if (onOpenRow && row !== null) onOpenRow(row);
          else onOpen();
        }}
      >
        <planeGeometry args={[displayWidth, displayHeight]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* The glass, curved outwards. */}
      <mesh geometry={glass} material={glassMaterial} position={[0, 0, -0.004]} renderOrder={1} />
    </group>
  );
}

function roundedRectPath(w: number, h: number, r: number): THREE.Path {
  const path = new THREE.Path();
  tracePath(path, w, h, r);
  return path;
}

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const shape = new THREE.Shape();
  tracePath(shape, w, h, r);
  return shape;
}

function tracePath(path: THREE.Path, w: number, h: number, r: number) {
  const x = -w / 2;
  const y = -h / 2;
  const rr = Math.max(0.001, Math.min(r, w / 2, h / 2));
  path.moveTo(x + rr, y);
  path.lineTo(x + w - rr, y);
  path.absarc(x + w - rr, y + rr, rr, -Math.PI / 2, 0, false);
  path.lineTo(x + w, y + h - rr);
  path.absarc(x + w - rr, y + h - rr, rr, 0, Math.PI / 2, false);
  path.lineTo(x + rr, y + h);
  path.absarc(x + rr, y + h - rr, rr, Math.PI / 2, Math.PI, false);
  path.lineTo(x, y + rr);
  path.absarc(x + rr, y + rr, rr, Math.PI, Math.PI * 1.5, false);
}

function Panel({
  position,
  rotation,
  width = 1.3,
  height = 0.8,
  fps = 12,
  draw,
  onOpen,
  onOpenRow,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width?: number;
  height?: number;
  /** How often the canvas is redrawn. */
  fps?: number;
  draw: (canvas: HTMLCanvasElement, t: number, corner: number) => void;
  onOpen: () => void;
  onOpenRow?: ((row: number) => void) | undefined;
}) {
  // Suspends until both faces are registered, so the first frame is set in
  // them and never in the fallback.
  use(loadScreenFonts());
  const { reducedMotion } = useSettings();
  const plan = useMemo(() => slabPlan(width, height), [width, height]);
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas');
    // The display plane's aspect, not the opening's: see `slabPlan`.
    canvas.width = plan.canvasWidthPixels;
    canvas.height = plan.canvasHeightPixels;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return { canvas, texture };
  }, [plan]);
  const clock = useRef({ t: 0, last: -1 });

  useFrame((_, delta) => {
    const c = clock.current;
    if (!reducedMotion) c.t += Math.min(delta, 0.1);
    if (c.last >= 0 && c.t - c.last < 1 / fps) return;
    c.last = c.t;
    draw(canvas, c.t, plan.cornerPixels);
    texture.needsUpdate = true;
  });

  return (
    <group position={position} rotation={rotation}>
      <Slab
        width={width}
        height={height}
        texture={texture}
        onOpen={onOpen}
        onOpenRow={onOpenRow}
        canvasHeight={plan.canvasHeightPixels}
      />
    </group>
  );
}

// ------------------------------------------------------------- drawing

/**
 * **The ledger** (V9, item 2). The owner: *"the screen on the far left
 * (virgils far left screen) should really have a list of the agents used,
 * and next to it the outcome, and that updates (with fancy animations) as
 * it happens, but also remains on the screen so at a glance you can see
 * where its up to."*
 *
 * `ledger.ts` derives the board; this draws it. Every row is drawn so
 * that it reads at three distances, which is what "at a glance" has to
 * mean on a 0.9 m slab at eleven metres:
 *
 *  - **at distance**, the role's glyph in a heavy box, the verdict's own
 *    shape from `verdicts.ts`, its colour, and the elapsed bar's length;
 *  - **up close**, the role's name and the elapsed seconds as text;
 *  - **in the panel**, the whole hop — one click on the row.
 *
 * The returning convergence lands into its row: a row's mark seals over
 * the same `RETURNING` window the console and the verdict slab use, so
 * the beat and the record are one event and there is no second source of
 * truth about when a verdict arrived.
 */
function drawLedger(
  canvas: HTMLCanvasElement,
  t: number,
  seconds: number,
  content: ScreenContent,
  outcome: Outcome,
  corner: number,
  mode: RunMode,
  speed: ReplaySpeed,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  // One board, two sources. The replay's rows carry **recorded** time and
  // the demonstration's carry the demonstration's own clock; the drawing
  // below is the same for both and reads which it has from the row.
  const rows = mode === 'replay' ? replayLedgerAt(seconds, speed) : ledgerAt(seconds, outcome);
  const settled = isSettled(rows, outcome);
  const open = inFlight(rows);
  const tint = open ? room.warm.amber : settled ? room.emit.teal : room.emit.cyan;
  const floor = frame(ctx, w, h, 'LEDGER', tint, 0, corner);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, floor);
  ctx.clip();

  // The candidate this board belongs to. It clears per candidate (the
  // owner's decision), so its identity has to be on it or a new run
  // cannot be told from a continuation of the old one. On its own line,
  // clear of the title above and the first row below.
  const head = LEDGER_HEAD_PX;
  dataLine(
    ctx,
    content.candidate ? `CANDIDATE ${content.candidateId ?? CANDIDATE_ID}` : 'NO CANDIDATE',
    64,
    head - 58,
    w - 128,
    content.candidate ? room.emit.magenta : DIM,
    44,
  );

  const rowHeight = ledgerRowHeight(floor);
  for (let i = 0; i < LEDGER_ROWS; i += 1) {
    const y = head + i * rowHeight;
    const row = rows[i];
    // The rule under every slot, whether or not a hop has reached it: the
    // board's shape does not change as it fills, so nothing jumps.
    ctx.strokeStyle = FAINT;
    ctx.lineWidth = RULE - 4;
    ctx.beginPath();
    ctx.moveTo(64, y + rowHeight - 12);
    ctx.lineTo(w - 64, y + rowHeight - 12);
    ctx.stroke();
    if (!row) continue;

    const look = verdictLook(row.report ?? '—');
    const colour = row.report ? look.tint : room.warm.amber;
    const centre = y + rowHeight / 2 - 8;
    // 1. The glyph, in a heavy box: the role, at any distance.
    ctx.strokeStyle = colour;
    ctx.lineWidth = RULE;
    ctx.strokeRect(64, centre - 46, 92, 92);
    ctx.fillStyle = colour;
    ctx.font = display(72);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(row.glyph, 64 + 46, centre + 4);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // 2. The name, up close.
    ctx.fillStyle = row.report ? TEXT : DIM;
    ctx.font = display(52);
    ctx.textBaseline = 'middle';
    ctx.fillText(row.label, 188, centre - 18);
    ctx.textBaseline = 'top';

    // 3. The time column.
    //
    //    In the demonstration it is the elapsed bar: its length is the
    //    time, against the longest hop any of them takes, so two rows can
    //    be compared.
    //
    //    **In the replay it is recorded time and never playback time.**
    //    Exactly one of this run's hops has a duration in the repository;
    //    for the other eight the column prints `NOT RECORDED` and **no
    //    bar is drawn at all**, because a bar is a length and a length
    //    would be a claim the record cannot support. A compressed clock
    //    reporting compressed durations would be a lie about how long the
    //    work took, and this is where that lie is refused.
    const barX = 188;
    // The number sits between the bar and the mark, so the three never
    // overlap however long the number gets; the replay's words need more.
    const numberW = row.recorded ? 300 : 140;
    const markW = 150;
    const barW = w - 64 - markW - numberW - barX;
    const bar = row.recorded ? row.recorded.seconds : elapsedOf(row, seconds);
    const longest = row.recorded ? LONGEST_RECORDED_HOP : LONGEST_HOP;
    if (bar !== null) {
      ctx.fillStyle = FAINT;
      roundRect(ctx, barX, centre + 16, barW, 22, 6);
      ctx.fill();
      ctx.fillStyle = colour;
      const fraction = clamp01(bar / longest);
      roundRect(ctx, barX, centre + 16, Math.max(6, barW * fraction), 22, 6);
      ctx.fill();
      // A live row's bar carries a bright head, so "still running" reads
      // without waiting to see whether the bar grows.
      if (!row.report && !row.recorded) {
        ctx.fillStyle = room.emit.ice;
        const headX = barX + Math.max(6, barW * fraction);
        ctx.globalAlpha = 0.5 + 0.5 * (0.5 + 0.5 * drift(t, 1.4));
        roundRect(ctx, headX - 14, centre + 14, 14, 26, 5);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    ctx.font = mono(row.recorded ? 34 : 40);
    ctx.fillStyle = row.recorded
      ? row.recorded.seconds === null
        ? DIM
        : TEXT
      : row.report
        ? DIM
        : room.emit.ice;
    ctx.textAlign = 'right';
    ctx.fillText(
      row.recorded ? row.recorded.text : `${elapsedOf(row, seconds).toFixed(1)}S`,
      barX + barW + numberW - 16,
      centre + 16,
    );
    ctx.textAlign = 'left';

    // 4. The verdict's own shape, in its own colour — and while the hop
    //    is unresolved, an open mark, never a blank. The seal is driven
    //    from the report's own arrival, so the convergence on the
    //    console and the mark on this row are the same event.
    // Small enough that a mark and its findings sit inside their own row:
    // the notches ride 26 px outside the ring, so 34 + 26 is under half a
    // row's height and two rows' marks cannot touch.
    const markX = w - 64 - 46;
    const since = row.endedAt === null ? 0 : seconds - row.endedAt;
    const seal =
      row.report === null
        ? 0.42 + 0.14 * drift(t, 0.5)
        : clamp01((since - RETURNING.converge) / (RETURNING.land - RETURNING.converge));
    const mark = row.report === null ? 0 : clamp01((since - RETURNING.land) / 0.5);
    drawVerdictMark(
      ctx,
      markX,
      centre,
      34,
      row.report ?? 'INSUFFICIENT_EVIDENCE',
      seal,
      mark,
      row.report === 'PASS_WITH_NON_BLOCKING_FINDINGS' ? 3 : 0,
    );
  }
  ctx.restore();
  finish(ctx, w, h, t);
  if (content.ownerGate) quieten(ctx, w, h, 0.72);
}

/**
 * The candidate's state, in words the constitution defines, split for a
 * screen. Underscores become spaces; a long state breaks into two lines.
 */
export function stateLines(state: CandidateState | null): [string] | [string, string] {
  if (state === null) return ['NO CANDIDATE'];
  const words = state.split('_');
  if (words.length <= 2) return [words.join(' ')];
  const cut = Math.ceil(words.length / 2);
  return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
}

/**
 * The verdict slab. With a verdict: the return, converging, and the
 * evidence beneath. Without one: what the candidate is doing instead,
 * from its state — "NO VERDICT", then BUILDING, or VERIFICATION
 * INCOMPLETE — never a fixed word that could drift out of step.
 */
function drawVerdict(
  canvas: HTMLCanvasElement,
  t: number,
  since: number,
  content: ScreenContent,
  outcome: Outcome,
  corner: number,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const verdict = content.verdict;
  const look = verdictLook(verdict);
  const tint = look.tint;
  const lift = verdict !== '—' ? clamp01(1 - (since - 1.5) / 2.5) : 0;
  const floor = frame(ctx, w, h, 'VERDICT', tint, lift, corner);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, floor);
  ctx.clip();
  if (verdict === '—') {
    const gone = 1 - withdrawal(since);
    void gone;
    bigWord(ctx, 'NO VERDICT', 64, 150, w - 128 - 40, DIM, clamp01(since / 0.5), 150);
    const lines = stateLines(content.candidate);
    spaced(ctx, '0.04em');
    fitFont(ctx, display, 60, lines.join(' '), w - 128);
    ctx.fillStyle = tint;
    ctx.textBaseline = 'top';
    ctx.globalAlpha = easeOut(clamp01((since - 0.2) / 0.5));
    ctx.fillText(lines.join(' '), 64, 330);
    ctx.globalAlpha = 1;
    spaced(ctx, '0em');
    // A slow scan across the foot: something is happening, elsewhere.
    const x = 64 + ((t * 0.5) % 1) * (w - 128);
    ctx.fillStyle = tint;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(x - 60, floor - 60, 120, RULE);
    ctx.globalAlpha = 1;
  } else {
    const findings = verdict === 'PASS_WITH_NON_BLOCKING_FINDINGS' ? 3 : 0;
    drawReturn(
      ctx,
      w,
      floor,
      since,
      SLAB_ARRIVAL,
      verdict,
      {
        cx: w - 64 - 150,
        cy: 150 + (floor - 150) / 2 - 30,
        r: 118,
        wordX: 64,
        wordY: 130,
        wordWidth: w - 128 - 330,
        linesX: 64,
        linesY: floor - 30 - 3 * 48,
        linesWidth: w - 128 - 330,
        pitch: 48,
      },
      // The replay carries the run's own counts under the verdict; the
      // demonstration falls back to `tally.ts`'s illustrative lines.
      content.evidence ? [...content.evidence] : evidenceLines(outcome),
      findings,
    );
  }
  ctx.restore();
  finish(ctx, w, h, t);
  if (content.ownerGate) quieten(ctx, w, h, 0.72);
}

/**
 * The candidate slab: its state, in the constitution's words, landing
 * with weight on each change; beneath it an identity-shaped string that
 * **does not change** while the candidate is judged — review is of one
 * exact immutable SHA, and V6's hex walked every 0.7 s, which was the
 * wrong picture. During the owner gate this is the one thing lit.
 */
function drawCandidate(
  canvas: HTMLCanvasElement,
  t: number,
  since: number,
  content: ScreenContent,
  corner: number,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  if (content.ownerGate) {
    drawOwnerGate(ctx, w, h, t, since, corner);
    return;
  }
  const floor = frame(ctx, w, h, 'CANDIDATE', room.emit.magenta, 0, corner);
  const lines = stateLines(content.candidate);
  const arrive = clamp01(since / 0.5);
  bigWord(ctx, lines[0], 64, 130, w - 128, content.candidate ? room.emit.ice : DIM, arrive, 150);
  if (lines[1]) {
    ctx.save();
    ctx.globalAlpha = easeOut(clamp01((since - 0.2) / 0.45));
    spaced(ctx, '0.04em');
    fitFont(ctx, display, 72, lines[1], w - 128);
    ctx.fillStyle = room.emit.ice;
    ctx.textBaseline = 'top';
    ctx.fillText(lines[1], 64, 300 + (1 - landing(clamp01((since - 0.2) / 0.45), 0.1)) * 30);
    spaced(ctx, '0em');
    ctx.restore();
  }
  // The identity: fixed for the candidate. In the demonstration it is
  // data-shaped and is never a real commit; in the replay it is the run's
  // own candidate SHA, and the band says which of the two you are reading.
  if (content.candidate) {
    ctx.font = mono(84);
    ctx.fillStyle = room.emit.magenta;
    ctx.textBaseline = 'top';
    ctx.fillText(content.candidateId ?? CANDIDATE_ID, 64, floor - 124);
    ctx.strokeStyle = room.emit.magenta;
    ctx.lineWidth = RULE;
    ctx.globalAlpha = 0.5;
    ctx.strokeRect(48, floor - 142, w - 96, 118);
    ctx.globalAlpha = 1;
  }
  finish(ctx, w, h, t);
}

/**
 * The owner gate (§0.10.10, candidate 3): SAFE_TO_MERGE — "every merge
 * gate passes. Eligible. Not merged." — and merge is owner-only. The
 * system has stopped and turned to the owner. Gold, used nowhere else; a
 * frame breathing slowly; the state's words; and what it is not.
 */
function drawOwnerGate(ctx: Ctx, w: number, h: number, t: number, since: number, corner: number) {
  const floor = frame(
    ctx,
    w,
    h,
    'OWNER',
    OWNER_GOLD,
    0.6 + 0.4 * (0.5 + 0.5 * drift(t, 0.25)),
    corner,
  );
  const arrive = clamp01(since / 0.7);
  const breath = 0.5 + 0.5 * drift(t, 0.25);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, floor);
  ctx.clip();
  // The frame breathing: an inner bracket that swells and settles.
  brackets(ctx, 40, 40, w - 80, floor - 80, OWNER_GOLD, 0.6 + 0.4 * breath);
  bigWord(ctx, 'SAFE TO MERGE', 64, 140, w - 128, OWNER_GOLD, arrive, 150);
  ctx.globalAlpha = easeOut(clamp01((since - 0.35) / 0.5));
  spaced(ctx, '0.05em');
  fitFont(ctx, display, 64, 'ELIGIBLE · NOT MERGED', w - 128);
  ctx.fillStyle = OWNER_GOLD;
  ctx.textBaseline = 'top';
  ctx.fillText('ELIGIBLE · NOT MERGED', 64, 320);
  spaced(ctx, '0em');
  ctx.globalAlpha = easeOut(clamp01((since - 0.7) / 0.5));
  dataLine(ctx, 'WAITING ON THE OWNER', 64, floor - 100, w - 128, TEXT, 52);
  ctx.globalAlpha = 1;
  ctx.restore();
  finish(ctx, w, h, t);
}
