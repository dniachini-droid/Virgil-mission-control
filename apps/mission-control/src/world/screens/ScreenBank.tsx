import { useFrame } from '@react-three/fiber';
import type { CandidateState } from '@virgil/domain';
import { use, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { createGlassMaterial, createRoundedConvexGlassGeometry } from '../glass.js';
import type { Outcome, ScreenContent } from '../room/demo.js';
import { layout, room } from '../room/palette.js';
import { SLAB_ARRIVAL } from './arrival.js';
import {
  bigWord,
  brackets,
  type Ctx,
  DIM,
  dataLine,
  display,
  finish,
  fitFont,
  frame,
  mono,
  OWNER_GOLD,
  quieten,
  RULE,
  ring,
  spaced,
  TEXT,
} from './draw.js';
import { loadScreenFonts } from './fonts.js';
import { clamp01, drift, easeOut, landing } from './motion.js';
import { drawReturn, withdrawal } from './returning.js';
import { evidenceLines } from './tally.js';
import { verdictLook } from './verdicts.js';

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

const ROLES = ['Virgil', 'Fabricator', 'Prover', 'Keeper'];

export function ScreenBank({ content, outcome }: { content: ScreenContent; outcome: Outcome }) {
  const { y, z, spread, splay } = layout.screenBank;
  const since = useRef({ verdict: '' as string, at: 0, candidate: '' as string, candidateAt: 0 });
  return (
    <group>
      <Panel
        position={[-spread, y - 0.08, z + 0.35]}
        rotation={[-0.1, splay, 0]}
        draw={(c, t, corner) => drawRoles(c, t, content, corner)}
      />
      <Panel
        position={[0, y, z]}
        rotation={[-0.1, 0, 0]}
        fps={24}
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
  const overhang = (bezel * 0.5) / 2;
  const displayWidth = width + bezel * 0.5;
  const displayHeight = height + bezel * 0.5;
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

function Slab({
  width,
  height,
  texture,
}: {
  width: number;
  height: number;
  texture: THREE.Texture;
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
      width + 0.012,
      height + 0.012,
      openingRadius + 0.006,
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
      <mesh position={[0, 0, -recess]}>
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
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width?: number;
  height?: number;
  /** How often the canvas is redrawn. */
  fps?: number;
  draw: (canvas: HTMLCanvasElement, t: number, corner: number) => void;
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
      <Slab width={width} height={height} texture={texture} />
    </group>
  );
}

// ------------------------------------------------------------- drawing

function drawRoles(canvas: HTMLCanvasElement, t: number, content: ScreenContent, corner: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const floor = frame(ctx, w, h, 'ROLES', room.emit.cyan, 0, corner);
  const active = content.active ?? 'VIRGIL';
  bigWord(ctx, active.toUpperCase(), 64, 150, w - 128, content.active ? room.warm.amber : TEXT);
  // Four rings, one per role; the active one filled, the others glowing in
  // turn, softly, so the row reads as switched on.
  const y = floor - 92;
  const pitch = (w - 128) / ROLES.length;
  ROLES.forEach((role, i) => {
    const on = role === active;
    const wave = content.active ? 0 : 0.5 + 0.5 * drift(t, 0.35, -i * 1.2);
    ring(ctx, 64 + pitch * i + 40, y, 30, on ? room.warm.amber : room.emit.cyan, on);
    if (!on && wave > 0) {
      ctx.globalAlpha = 0.5 * wave;
      ctx.fillStyle = room.emit.cyan;
      ctx.beginPath();
      ctx.arc(64 + pitch * i + 40, y, 22 * wave, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  });
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
      evidenceLines(outcome),
      findings,
    );
  }
  ctx.restore();
  finish(ctx, w, h, t);
  if (content.ownerGate) quieten(ctx, w, h, 0.72);
}

/** Deterministic "hex" from an integer: a texture, not a value. */
function hex(seed: number, length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) out += ((seed * 31 + i * 17 + (seed >> 3)) % 16).toString(16);
  return out;
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
  // The identity: fixed for the candidate, data-shaped, never a real commit.
  if (content.candidate) {
    ctx.font = mono(84);
    ctx.fillStyle = room.emit.magenta;
    ctx.textBaseline = 'top';
    ctx.fillText(hex(7, 10), 64, floor - 124);
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
