import { useFrame } from '@react-three/fiber';
import { use, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import type { StationState } from '../room/demo.js';
import { layout, room } from '../room/palette.js';
import { DISPLAY, loadScreenFonts, MONO } from './fonts.js';

/**
 * Readable screens, drawn onto canvas textures in the `ADR-0010` pattern:
 * no font fetch, no `data:` URI, nothing outside the document. V5 sets them
 * in two bundled faces (`fonts.ts`), which the ADR's own Consequences line
 * anticipates.
 *
 * Three upright panels stand behind Virgil on the far arc of his console,
 * facing the camera — the front-to-back read the owner asked for is his face,
 * then the screens, then the window. The console model's own screens are
 * low, tilted inward and a few dozen pixels tall from the authored camera,
 * below the ~96 px at which text stays legible, so they keep their baked
 * glow and the readable content lives on these. **This is geometry the
 * owner did not supply**, added for that reason and reported as such.
 *
 * V5, on the owner's V4 verdict:
 *
 *  - **The stands are gone.** They hung from each panel and touched nothing;
 *    the panels float, which the owner approved.
 *  - **Each panel is a slab**, not a plane: a rounded-rectangle frame with
 *    real thickness and bevelled edges that catch the room's warm light and
 *    the window's cool light, a back plate, and the display recessed inside
 *    the bezel (`Slab`).
 *  - **Two typefaces.** Tektur for titles, headlines and the honesty band;
 *    Geist Mono for anything data-shaped. One face doing both jobs is what
 *    made V4 read as basic.
 *  - **The station's panel has states of its own** — a receiving beat where
 *    the hand-off visibly arrives, and a working state with progress that
 *    ticks in rhythm (`drawStation`).
 *
 * Everything drawn here is **illustrative** — role names from
 * `.claude/agents/`, the state vocabulary of `constitution/STATE_LANGUAGE.md`,
 * the verdicts of `constitution/REVIEW_POLICY.md`, a scrolling abbreviated
 * SHA, check names that are categories and not results — and is labelled so
 * on every panel, on the amber band along its foot. None of it is this
 * repository's real state, and it never claims to be.
 */

export interface ScreenContent {
  /** The verdict currently shown on the review panel. */
  verdict: 'PASS' | 'PASS_WITH_NON_BLOCKING_FINDINGS' | 'BLOCKED' | 'INSUFFICIENT_EVIDENCE' | '—';
  /** Which role is active, if any. */
  active: string | null;
  /** The phase label shown on the candidate panel. */
  phase: string;
}

const ROLES = ['Virgil', 'Fabricator', 'Prover', 'Keeper', 'Arbiter'];
const STATES = [
  'ASSIGNED',
  'IN_PROGRESS',
  'BUILDER_REPORTED_COMPLETE',
  'CHECKS_PASSED',
  'REVIEWED',
];
/**
 * Illustrative check categories for the station's working state. They are
 * the kinds of deterministic check this repository runs, not any run of
 * them; nothing here is looked up, and every count is a fixed number from
 * the timeline.
 */
const CHECKS = ['LINT', 'TYPES', 'TESTS', 'SCHEMA', 'TETHER'];

// Tektur ships as Medium (500) and Geist Mono as Regular (400); asking for
// other weights would get a synthetic bold, so hierarchy is size and colour.
const display = (px: number) => `500 ${px}px ${DISPLAY}`;
const mono = (px: number) => `400 ${px}px ${MONO}`;
/** The honesty band along the foot of every panel, in canvas pixels. */
const BAND_HEIGHT = 72;
const DIM = 'rgba(207,228,255,0.5)';
const TEXT = 'rgba(214,232,255,0.92)';
const PASS_GREEN = '#b6ff5c';
const BLOCK_RED = '#ff3b5c';

export function ScreenBank({ content }: { content: ScreenContent }) {
  const [cx, , cz] = layout.consoleCentre;
  // Behind the outer track (1.72 m + band) so no planet passes through a panel.
  const y = 1.42;
  const z = cz - 1.95;
  return (
    <group>
      <Panel
        position={[cx - 1.5, y, z + 0.25]}
        rotation={[0, 0.22, 0]}
        draw={(c, t) => drawRoles(c, t, content)}
      />
      <Panel
        position={[cx, y + 0.05, z - 0.08]}
        rotation={[0, 0, 0]}
        draw={(c, t) => drawReview(c, t, content)}
      />
      <Panel
        position={[cx + 1.5, y, z + 0.25]}
        rotation={[0, -0.22, 0]}
        draw={(c, t) => drawCandidate(c, t, content)}
      />
    </group>
  );
}

/**
 * The panel on a side station. It knows the station's state and, once a
 * verdict is reported, the verdict; it keeps its own note of when the state
 * last changed so the receiving and working drawings can run from that
 * moment.
 */
export function StationPanel({
  position,
  rotation,
  occupant,
  state,
  verdict,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  occupant: string | null;
  state: StationState;
  verdict: ScreenContent['verdict'];
}) {
  const since = useRef({ state: '' as string, at: 0 });
  return (
    <Panel
      position={position}
      rotation={rotation}
      width={0.9}
      height={0.6}
      fps={20}
      draw={(c, t) => {
        if (since.current.state !== state) since.current = { state, at: t };
        drawStation(c, t, t - since.current.at, occupant, state, verdict);
      }}
    />
  );
}

/**
 * A slab with a display recessed in it: a rounded-rectangle frame with real
 * depth and bevelled edges, a back plate, and the canvas set 12 mm behind
 * the frame's front face inside the bezel. Slate body, so the warm key and
 * the cool window each catch on a different edge; nothing on it is teal or
 * magenta, which are only ever emitted.
 */
function Slab({
  width,
  height,
  texture,
}: {
  width: number;
  height: number;
  texture: THREE.Texture;
}) {
  const bezel = 0.04;
  const depth = 0.05;
  const recess = 0.012;
  const radius = 0.07;
  const { frame, back } = useMemo(() => {
    const outer = roundedRect(width + 2 * bezel, height + 2 * bezel, radius);
    outer.holes.push(roundedRectPath(width, height, radius - bezel));
    const frame = new THREE.ExtrudeGeometry(outer, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 3,
      curveSegments: 12,
    });
    const back = new THREE.ExtrudeGeometry(
      roundedRect(width + 2 * bezel, height + 2 * bezel, radius),
      {
        depth: 0.01,
        bevelEnabled: false,
        curveSegments: 12,
      },
    );
    return { frame, back };
  }, [width, height]);
  return (
    <group>
      {/* The frame is extruded from z = -depth to z = 0, so its front face is the panel's plane. */}
      <mesh geometry={frame} position={[0, 0, -depth]} castShadow receiveShadow>
        <meshStandardMaterial color={room.surface.slateDark} roughness={0.32} metalness={0.7} />
      </mesh>
      <mesh geometry={back} position={[0, 0, -depth - 0.004]}>
        <meshStandardMaterial color={room.surface.slate} roughness={0.5} metalness={0.5} />
      </mesh>
      {/* The display, a little wider than the bezel's hole so its corners hide behind it. */}
      <mesh position={[0, 0, -recess]}>
        <planeGeometry args={[width + bezel * 0.5, height + bezel * 0.5]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
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
  fps = 10,
  draw,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width?: number;
  height?: number;
  /** How often the canvas is redrawn; screens tick, they do not need to be smooth. */
  fps?: number;
  draw: (canvas: HTMLCanvasElement, t: number) => void;
}) {
  // Suspends until both faces are registered, so the first frame is set in
  // them and never in the fallback.
  use(loadScreenFonts());
  const { reducedMotion } = useSettings();
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = Math.round((1024 * height) / width);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return { canvas, texture };
  }, [width, height]);
  const clock = useRef({ t: 0, last: -1 });

  useFrame((_, delta) => {
    const c = clock.current;
    if (!reducedMotion) c.t += delta;
    if (c.last >= 0 && c.t - c.last < 1 / fps) return;
    c.last = c.t;
    draw(canvas, c.t);
    texture.needsUpdate = true;
  });

  return (
    <group position={position} rotation={rotation}>
      <Slab width={width} height={height} texture={texture} />
    </group>
  );
}

// ------------------------------------------------------------- drawing

type Ctx = CanvasRenderingContext2D;

function spaced(ctx: Ctx, em: string) {
  // Chromium, Safari 17.4 and Firefox 130 honour it; elsewhere it is ignored.
  (ctx as Ctx & { letterSpacing?: string }).letterSpacing = em;
}

/** Sets `font` at the largest size, at most `px`, at which `text` fits `maxWidth`. */
function fitFont(
  ctx: Ctx,
  kind: (px: number) => string,
  px: number,
  text: string,
  maxWidth: number,
) {
  let size = px;
  ctx.font = kind(size);
  while (size > 24 && ctx.measureText(text).width > maxWidth) {
    size -= 4;
    ctx.font = kind(size);
  }
  return size;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/**
 * The frame every panel shares: dark glass with a faint wash of its tint,
 * corner marks, the title in Tektur with a rule under it, a small mono tag
 * naming the whole thing scripted, and the band along the foot that keeps
 * it honest — solid amber, dark letter-spaced Tektur, every panel, every
 * frame. Returns the height left above the band.
 */
function frame(ctx: Ctx, w: number, h: number, title: string, tint: string): number {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0a1028');
  bg.addColorStop(1, '#04060f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const wash = ctx.createRadialGradient(w * 0.15, 0, 0, w * 0.15, 0, w * 0.9);
  wash.addColorStop(0, tint);
  wash.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  // A hairline inset and corner marks.
  ctx.strokeStyle = tint;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, w - 28, h - 28);
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 4;
  const m = 26;
  for (const [sx, sy] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const) {
    const x = sx > 0 ? 14 : w - 14;
    const y = sy > 0 ? 14 : h - 14;
    ctx.beginPath();
    ctx.moveTo(x, y + sy * m);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * m, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Title.
  ctx.fillStyle = tint;
  ctx.font = display(44);
  spaced(ctx, '0.22em');
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(title, 48, 40);
  spaced(ctx, '0em');
  // The tag, top right, in mono.
  ctx.font = mono(24);
  spaced(ctx, '0.12em');
  ctx.fillStyle = DIM;
  ctx.textAlign = 'right';
  ctx.fillText('SCRIPTED · ILLUSTRATIVE', w - 48, 52);
  spaced(ctx, '0em');
  ctx.textAlign = 'left';
  // The rule under the title: a bright lead-in, then faint.
  ctx.fillStyle = tint;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(48, 102, w - 96, 2);
  ctx.globalAlpha = 1;
  ctx.fillRect(48, 101, 140, 4);
  // The honesty band.
  ctx.fillStyle = room.warm.amber;
  ctx.fillRect(0, h - BAND_HEIGHT, w, BAND_HEIGHT);
  ctx.fillStyle = room.warm.amberDeep;
  ctx.fillRect(0, h - BAND_HEIGHT, w, 3);
  ctx.fillStyle = '#1a1206';
  ctx.font = display(36);
  spaced(ctx, '0.26em');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ILLUSTRATIVE · NOT REAL STATE', w / 2 + 6, h - BAND_HEIGHT / 2 + 2);
  spaced(ctx, '0em');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  return h - BAND_HEIGHT;
}

/** A small mono field label. */
function label(ctx: Ctx, text: string, x: number, y: number) {
  ctx.font = mono(26);
  spaced(ctx, '0.16em');
  ctx.fillStyle = DIM;
  ctx.fillText(text, x, y);
  spaced(ctx, '0em');
}

/** A ring lamp: an outline that fills when lit. */
function lamp(ctx: Ctx, x: number, y: number, r: number, colour: string, lit: boolean) {
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (lit) {
    ctx.shadowColor = colour;
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/** A tick, drawn in a 24 px box at (x, y). */
function tick(ctx: Ctx, x: number, y: number, colour: string) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + 12);
  ctx.lineTo(x + 9, y + 21);
  ctx.lineTo(x + 24, y + 3);
  ctx.stroke();
}

function cross(ctx: Ctx, x: number, y: number, colour: string) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 2, y + 2);
  ctx.lineTo(x + 22, y + 22);
  ctx.moveTo(x + 22, y + 2);
  ctx.lineTo(x + 2, y + 22);
  ctx.stroke();
}

function drawRoles(canvas: HTMLCanvasElement, t: number, content: ScreenContent) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const floor = frame(ctx, w, h, 'ROLES', room.emit.cyan);
  const top = 126;
  const rowHeight = Math.floor((floor - top - 12) / ROLES.length);
  ROLES.forEach((role, i) => {
    const y = top + i * rowHeight;
    const active = content.active === role;
    if (active) {
      ctx.fillStyle = room.warm.amber;
      ctx.globalAlpha = 0.12 + 0.05 * Math.sin(t * 6);
      roundRect(ctx, 30, y, w - 60, rowHeight - 8, 10);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillRect(30, y, 8, rowHeight - 8);
    } else {
      ctx.fillStyle = 'rgba(207,228,255,0.07)';
      ctx.fillRect(48, y + rowHeight - 10, w - 96, 1);
    }
    ctx.font = display(50);
    spaced(ctx, '0.06em');
    ctx.fillStyle = active ? room.warm.amber : TEXT;
    ctx.textBaseline = 'middle';
    ctx.fillText(role.toUpperCase(), 62, y + rowHeight / 2 - 4);
    spaced(ctx, '0em');
    const state = active ? 'IN_PROGRESS' : (STATES[(i + Math.floor(t / 7)) % STATES.length] ?? '');
    lamp(ctx, 560, y + rowHeight / 2 - 4, 9, active ? room.warm.amber : room.emit.cyan, active);
    ctx.font = mono(30);
    spaced(ctx, '0.04em');
    ctx.fillStyle = active ? room.warm.amber : DIM;
    ctx.fillText(state, 590, y + rowHeight / 2 - 4);
    spaced(ctx, '0em');
    ctx.textBaseline = 'top';
  });
}

function drawReview(canvas: HTMLCanvasElement, t: number, content: ScreenContent) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const verdict = content.verdict;
  const tint =
    verdict === 'BLOCKED'
      ? BLOCK_RED
      : verdict === 'PASS'
        ? PASS_GREEN
        : verdict === '—'
          ? room.emit.cyan
          : room.warm.amber;
  const floor = frame(ctx, w, h, 'REVIEW', tint);
  label(ctx, 'VERDICT', 48, 126);
  const text = verdict === '—' ? 'AWAITING REVIEW' : verdict.replace(/_/g, ' ');
  const size = fitFont(ctx, display, 136, text, w - 96);
  spaced(ctx, '0.03em');
  ctx.fillStyle = tint;
  ctx.shadowColor = tint;
  ctx.shadowBlur = 26;
  ctx.fillText(text, 48, 164 + (136 - size) / 2);
  ctx.shadowBlur = 0;
  spaced(ctx, '0em');
  label(ctx, 'EVIDENCE', 48, 330);
  const bars = ['checks', 'tethers', 'review'];
  const barTop = 378;
  const pitch = Math.floor((floor - barTop - 12) / bars.length);
  bars.forEach((name, i) => {
    const y = barTop + i * pitch;
    ctx.font = mono(30);
    ctx.fillStyle = TEXT;
    ctx.fillText(name, 48, y + 2);
    const fill =
      verdict === '—'
        ? (0.5 + 0.5 * Math.sin(t * 2 + i)) * 0.6
        : verdict === 'BLOCKED' && i === 2
          ? 0.3
          : 1;
    const x0 = 250;
    const x1 = w - 48;
    ctx.fillStyle = 'rgba(207,228,255,0.12)';
    roundRect(ctx, x0, y + 8, x1 - x0, 20, 10);
    ctx.fill();
    ctx.fillStyle = tint;
    ctx.shadowColor = tint;
    ctx.shadowBlur = 10;
    roundRect(ctx, x0, y + 8, (x1 - x0) * fill, 20, 10);
    ctx.fill();
    ctx.shadowBlur = 0;
  });
}

function drawCandidate(canvas: HTMLCanvasElement, t: number, content: ScreenContent) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const floor = frame(ctx, w, h, 'CANDIDATE', room.emit.magenta);
  label(ctx, 'PHASE', 48, 126);
  ctx.font = display(84);
  spaced(ctx, '0.04em');
  ctx.fillStyle = room.emit.ice;
  ctx.fillText(content.phase.split(' · ')[0]?.toUpperCase() ?? '', 48, 160);
  spaced(ctx, '0em');
  label(ctx, 'HEAD (ILLUSTRATIVE)', 48, 272);
  // A scrolling abbreviated SHA. Deterministic from time so it never reads as
  // a real commit: hex digits walk, they are not looked up anywhere.
  ctx.font = mono(104);
  ctx.fillStyle = room.emit.magenta;
  ctx.shadowColor = room.emit.magenta;
  ctx.shadowBlur = 18;
  let sha = '';
  for (let i = 0; i < 10; i += 1) {
    sha += ((Math.floor(t * 1.5) * 7 + i * 13 + Math.floor(t / 3) * 5) % 16).toString(16);
  }
  ctx.fillText(sha, 48, 306);
  ctx.shadowBlur = 0;
  label(ctx, 'PROVENANCE TETHER', 48, 436);
  const lineY = Math.min(508, floor - 44);
  ctx.strokeStyle = room.emit.teal;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = 48; x < w - 48; x += 8) {
    const y = lineY + Math.sin(x * 0.03 + t * 2) * 10;
    if (x === 48) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = room.emit.teal;
  ctx.shadowColor = room.emit.teal;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  const dotX = 48 + ((t * 90) % (w - 96));
  ctx.arc(dotX, lineY + Math.sin(dotX * 0.03 + t * 2) * 10, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

// ------------------------------------------------------------- the station

/** Deterministic "hex" from integers: a texture, not a value. */
function hex(seed: number, length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) out += ((seed * 31 + i * 17 + (seed >> 3)) % 16).toString(16);
  return out;
}

const ease = (x: number) => 1 - (1 - x) ** 3;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Receiving: eight packets travel in along a channel and seal a manifest. */
const PACKETS = 8;
const PACKET_GAP = 0.26;
const PACKET_FLIGHT = 0.5;
const RECEIVING_LOOP = 3.4;
/** Working: five checks, each ticking through eight steps. */
const CHECK_SECONDS = 1.05;
const CHECK_STEPS = 8;
const WORKING_LOOP = 8.5;
const BEAT = CHECK_SECONDS / 2;

/**
 * The station panel: occupant, state, and a field that is different in
 * each state. In RECEIVING the field is an arrival — packets travelling in
 * along a channel, each one sealing a segment of a manifest, while the word
 * itself resolves out of hex as they land. In WORKING it is a run of five
 * illustrative checks with bars that advance in quantised steps to a beat,
 * a pulse line that keeps the same beat, and a count. In REPORTED it is the
 * verdict with the run's ticks under it. Nothing is measured; `since` is
 * seconds since the state last changed.
 */
function drawStation(
  canvas: HTMLCanvasElement,
  t: number,
  since: number,
  occupant: string | null,
  state: StationState,
  verdict: ScreenContent['verdict'],
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const stateColour =
    state === 'RECEIVING'
      ? room.emit.ice
      : state === 'WORKING'
        ? room.warm.amber
        : state === 'REPORTED'
          ? verdict === 'BLOCKED'
            ? BLOCK_RED
            : PASS_GREEN
          : room.emit.cyan;
  const tint = occupant ? stateColour : room.emit.cyan;
  const floor = frame(ctx, w, h, 'STATION', tint);
  label(ctx, 'OCCUPANT', 48, 126);
  ctx.font = display(78);
  spaced(ctx, '0.05em');
  ctx.fillStyle = occupant ? TEXT : DIM;
  ctx.fillText(occupant ? occupant.toUpperCase() : 'UNASSIGNED', 48, 154);
  spaced(ctx, '0em');
  label(ctx, 'STATE', 560, 126);
  // The state word; in RECEIVING it resolves out of hex, letter by letter,
  // as the packets land.
  ctx.font = display(64);
  spaced(ctx, '0.08em');
  let word = state as string;
  if (state === 'RECEIVING') {
    const s = since % RECEIVING_LOOP;
    word = [...state]
      .map((ch, i) => (s > 0.35 + i * 0.24 ? ch : hex(Math.floor(t * 18) + i * 7, 1).toUpperCase()))
      .join('');
  }
  ctx.fillStyle = stateColour;
  ctx.shadowColor = stateColour;
  ctx.shadowBlur = 18;
  ctx.fillText(word, 560, 160);
  ctx.shadowBlur = 0;
  spaced(ctx, '0em');

  const top = 262;
  const bottom = floor - 20;
  if (state === 'READY' || !occupant) {
    ctx.font = mono(28);
    ctx.fillStyle = DIM;
    ctx.fillText(occupant ? 'awaiting hand-off' : 'no occupant', 48, top + 8);
    for (let i = 0; i < 16; i += 1) {
      const lit = i < 3;
      ctx.fillStyle = tint;
      ctx.globalAlpha = lit ? 0.85 : 0.14;
      roundRect(ctx, 48 + i * 58, top + 70, 42, 16, 5);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    return;
  }

  if (state === 'RECEIVING') {
    const s = since % RECEIVING_LOOP;
    const channelY = top + 60;
    const boxX = 690;
    const boxW = w - 48 - boxX;
    const boxY = top;
    const boxH = bottom - top;
    // The channel.
    const reach = ease(clamp01(s / 0.4));
    ctx.strokeStyle = room.emit.ice;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(48, channelY);
    ctx.lineTo(48 + (boxX - 48) * reach, channelY);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // The manifest box.
    let landed = 0;
    for (let k = 0; k < PACKETS; k += 1) {
      const start = 0.3 + k * PACKET_GAP;
      if (s >= start + PACKET_FLIGHT) landed += 1;
    }
    const sealed = landed === PACKETS;
    ctx.strokeStyle = sealed ? PASS_GREEN : room.emit.ice;
    ctx.globalAlpha = sealed ? 0.95 : 0.6;
    ctx.lineWidth = 3;
    roundRect(ctx, boxX, boxY, boxW, boxH, 14);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = mono(24);
    spaced(ctx, '0.12em');
    ctx.fillStyle = DIM;
    ctx.fillText('MANIFEST', boxX + 18, boxY + 14);
    ctx.textAlign = 'right';
    ctx.fillStyle = sealed ? PASS_GREEN : room.emit.ice;
    ctx.fillText(sealed ? 'SEALED' : `${landed}/${PACKETS}`, boxX + boxW - 18, boxY + 14);
    ctx.textAlign = 'left';
    spaced(ctx, '0em');
    // Segments inside the box, one per packet.
    const segW = (boxW - 36 - (PACKETS - 1) * 6) / PACKETS;
    for (let k = 0; k < PACKETS; k += 1) {
      ctx.fillStyle = k < landed ? (sealed ? PASS_GREEN : room.emit.ice) : 'rgba(207,228,255,0.12)';
      roundRect(ctx, boxX + 18 + k * (segW + 6), boxY + 52, segW, 14, 4);
      ctx.fill();
    }
    // The landed chunks, listed.
    ctx.font = mono(22);
    for (let k = 0; k < landed; k += 1) {
      ctx.fillStyle = k === landed - 1 ? room.emit.ice : DIM;
      ctx.fillText(`${hex(k + 3, 8)}  ${hex(k * 5 + 1, 4)}`, boxX + 18, boxY + 84 + k * 27);
    }
    // The packets in flight, with a trail.
    for (let k = 0; k < PACKETS; k += 1) {
      const start = 0.3 + k * PACKET_GAP;
      const p = (s - start) / PACKET_FLIGHT;
      if (p < 0 || p >= 1) continue;
      const x = 48 + (boxX - 48) * ease(p);
      const trail = 90 * (1 - p) + 30;
      const grad = ctx.createLinearGradient(x - trail, 0, x, 0);
      grad.addColorStop(0, 'rgba(207,228,255,0)');
      grad.addColorStop(1, room.emit.ice);
      ctx.fillStyle = grad;
      ctx.fillRect(x - trail, channelY - 3, trail, 6);
      ctx.font = mono(26);
      ctx.fillStyle = room.emit.ice;
      ctx.shadowColor = room.emit.ice;
      ctx.shadowBlur = 16;
      ctx.fillText(hex(k + 3, 4), x - 28, channelY - 44);
      ctx.beginPath();
      ctx.arc(x, channelY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    // A landing flash on the box edge.
    for (let k = 0; k < PACKETS; k += 1) {
      const land = 0.3 + k * PACKET_GAP + PACKET_FLIGHT;
      const f = (s - land) / 0.25;
      if (f < 0 || f >= 1) continue;
      ctx.globalAlpha = 1 - f;
      ctx.fillStyle = room.emit.ice;
      ctx.shadowColor = room.emit.ice;
      ctx.shadowBlur = 24;
      ctx.fillRect(boxX - 3, channelY - 26 - f * 20, 6, 52 + f * 40);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    ctx.font = mono(24);
    ctx.fillStyle = DIM;
    ctx.fillText(
      sealed ? 'hand-off landed · scripted' : 'hand-off arriving · scripted',
      48,
      bottom - 26,
    );
    return;
  }

  const runFor = CHECKS.length * CHECK_SECONDS;
  if (state === 'WORKING') {
    const s = since % WORKING_LOOP;
    const done = Math.min(CHECKS.length, Math.floor(s / CHECK_SECONDS));
    const complete = s >= runFor;
    // The pulse line: a beat every half check, travelling right.
    const pulseY = top + 8;
    ctx.strokeStyle = room.warm.amber;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.globalAlpha = complete ? 0.45 : 0.85;
    ctx.beginPath();
    for (let x = 48; x <= 640; x += 4) {
      const phase = ((x - 48) / 592) * 3 - ((s / BEAT) % 3);
      const frac = ((phase % 1) + 1) % 1;
      const spike = frac < 0.12 ? Math.sin((frac / 0.12) * Math.PI) : 0;
      const y = pulseY + 14 - spike * 22;
      if (x === 48) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    // The count.
    ctx.font = display(64);
    ctx.textAlign = 'right';
    ctx.fillStyle = room.warm.amber;
    ctx.shadowColor = room.warm.amber;
    ctx.shadowBlur = 14;
    ctx.fillText(`${done}/${CHECKS.length}`, w - 48, top - 12);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
    // The checks.
    const listTop = top + 56;
    const pitch = Math.floor((bottom - listTop) / CHECKS.length);
    CHECKS.forEach((name, i) => {
      const y = listTop + i * pitch;
      const local = (s - i * CHECK_SECONDS) / CHECK_SECONDS;
      const running = local >= 0 && local < 1 && !complete;
      const finished = local >= 1 || complete;
      const steps = finished ? CHECK_STEPS : running ? Math.floor(local * CHECK_STEPS) : 0;
      ctx.font = mono(28);
      spaced(ctx, '0.1em');
      ctx.fillStyle = running ? room.warm.amber : finished ? TEXT : DIM;
      ctx.fillText(name, 48, y + 2);
      spaced(ctx, '0em');
      const x0 = 250;
      const x1 = w - 130;
      const stepW = (x1 - x0 - (CHECK_STEPS - 1) * 6) / CHECK_STEPS;
      for (let k = 0; k < CHECK_STEPS; k += 1) {
        const lit = k < steps;
        ctx.fillStyle = lit ? room.warm.amber : 'rgba(207,228,255,0.1)';
        if (lit && running && k === steps - 1) {
          ctx.shadowColor = room.warm.amber;
          ctx.shadowBlur = 14;
        }
        roundRect(ctx, x0 + k * (stepW + 6), y + 8, stepW, 16, 4);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      if (finished) tick(ctx, w - 92, y + 4, room.warm.amber);
      else if (running) {
        ctx.font = mono(24);
        ctx.fillStyle = room.warm.amber;
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin((s / BEAT) * Math.PI * 2);
        ctx.fillText('run', w - 96, y + 6);
        ctx.globalAlpha = 1;
      }
    });
    if (complete) {
      ctx.font = mono(24);
      ctx.fillStyle = room.warm.amber;
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(s * 5);
      ctx.fillText('run complete · reporting · scripted', 48, bottom - 26 + 20);
      ctx.globalAlpha = 1;
    }
    return;
  }

  // REPORTED: the verdict, and the run's marks under it.
  const passed = verdict !== 'BLOCKED';
  const colour = passed ? PASS_GREEN : BLOCK_RED;
  const text = verdict === '—' ? 'REPORTED' : verdict.replace(/_/g, ' ');
  const size = fitFont(ctx, display, 120, text, w - 96);
  spaced(ctx, '0.04em');
  ctx.fillStyle = colour;
  ctx.shadowColor = colour;
  ctx.shadowBlur = 24;
  ctx.fillText(text, 48, top + (120 - size) / 2);
  ctx.shadowBlur = 0;
  spaced(ctx, '0em');
  const rowY = top + 150;
  const colW = (w - 96) / CHECKS.length;
  CHECKS.forEach((name, i) => {
    const x = 48 + i * colW;
    // On BLOCKED the last category carries the cross — a fixed choice of
    // the timeline, not a finding of anything.
    const failed = !passed && i === CHECKS.length - 1;
    if (failed) cross(ctx, x, rowY, BLOCK_RED);
    else tick(ctx, x, rowY, colour);
    ctx.font = mono(24);
    spaced(ctx, '0.1em');
    ctx.fillStyle = failed ? BLOCK_RED : DIM;
    ctx.fillText(name, x + 36, rowY + 2);
    spaced(ctx, '0em');
  });
  ctx.font = mono(24);
  ctx.fillStyle = DIM;
  ctx.fillText('verdict returned · scripted', 48, bottom - 26);
}
