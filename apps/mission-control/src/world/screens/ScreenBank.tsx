import { useFrame } from '@react-three/fiber';
import { use, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import type { Report, StationState } from '../room/demo.js';
import { layout, room } from '../room/palette.js';
import { DISPLAY, loadScreenFonts, MONO } from './fonts.js';

/**
 * Readable screens, drawn onto canvas textures in the `ADR-0010` pattern:
 * no font fetch, no `data:` URI, nothing outside the document, set in two
 * bundled faces (`fonts.ts`).
 *
 * V6 (`docs/process/PHASE_1_STYLISED_SPEC.md` §4) — "as if from a console
 * from a space animation movie". **The defining rule is subtraction.** A
 * realistic console is dense; an animated one has four words the size of
 * your fist and nothing else. So every panel here is three or four words,
 * enormous, in flat saturated colour on near-black with no gradient;
 * chunky geometry only — thick bars, rings, brackets, crosshairs; rules of
 * eight to twelve canvas pixels (two or three on the owner's screen from
 * the room's camera), never hairlines; motion **stepped and snappy** — hard
 * jumps between states, bars that fill in quantised steps — because smooth
 * easing reads realistic; and one deliberate imperfection per screen, a
 * scanline sweep and a faint flicker, which is what makes a screen feel
 * switched on.
 *
 * Three upright slabs stand behind Virgil on the far side of his console,
 * facing the camera; one floats beside each character at their station.
 * **This is geometry the owner did not supply**, added because the models'
 * own painted screens are a few dozen pixels tall from the camera, and
 * reported as such.
 *
 * Everything drawn here is **illustrative** — role names from
 * `.claude/agents/`, the state vocabulary of `constitution/STATE_LANGUAGE.md`,
 * the verdicts of `constitution/REVIEW_POLICY.md`, a walking hex string
 * that is a texture and not a value — and is labelled so on every panel,
 * on the thick amber stripe along its foot. None of it is this repository's
 * real state, and it never claims to be.
 */

export interface ScreenContent {
  /** The verdict currently shown on the review panel. */
  verdict: 'PASS' | 'PASS_WITH_NON_BLOCKING_FINDINGS' | 'BLOCKED' | 'INSUFFICIENT_EVIDENCE' | '—';
  /** Which role is active, if any. */
  active: string | null;
  /** The phase word shown on the candidate panel: one word, enormous. */
  phase: string;
}

const ROLES = ['Virgil', 'Fabricator', 'Prover', 'Keeper'];

const display = (px: number) => `700 ${px}px ${DISPLAY}`;
const mono = (px: number) => `700 ${px}px ${MONO}`;
/** The honesty stripe along the foot of every panel, in canvas pixels. */
const BAND_HEIGHT = 118;
const INK = '#070a18';
const TEXT = '#e6f0ff';
const DIM = 'rgba(214,232,255,0.55)';
const PASS_GREEN = '#b6ff5c';
const BLOCK_RED = '#ff3b5c';
const RULE = 10;

export function ScreenBank({ content }: { content: ScreenContent }) {
  const { y, z, spread, splay } = layout.screenBank;
  return (
    <group>
      <Panel
        position={[-spread, y - 0.08, z + 0.35]}
        rotation={[-0.12, splay, 0]}
        draw={(c, t) => drawRoles(c, t, content)}
      />
      <Panel
        position={[0, y, z]}
        rotation={[-0.12, 0, 0]}
        draw={(c, t) => drawReview(c, t, content)}
      />
      <Panel
        position={[spread, y - 0.08, z + 0.35]}
        rotation={[-0.12, -splay, 0]}
        draw={(c, t) => drawCandidate(c, t, content)}
      />
    </group>
  );
}

/**
 * The panel beside a character's station. It knows the station's state
 * and, once reported, the report; it keeps its own note of when the state
 * last changed so the receiving and working drawings can run from that
 * moment.
 */
export function StationPanel({
  position,
  rotation,
  occupant,
  state,
  report,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  occupant: string;
  state: StationState;
  report: Report;
}) {
  const since = useRef({ state: '' as string, at: 0 });
  return (
    <Panel
      position={position}
      rotation={rotation}
      width={0.9}
      height={0.6}
      fps={12}
      draw={(c, t) => {
        if (since.current.state !== state) since.current = { state, at: t };
        drawStation(c, t, t - since.current.at, occupant, state, report);
      }}
    />
  );
}

/**
 * A slab with a display recessed in it: a rounded-rectangle frame with real
 * depth, a back plate, and the canvas set behind the frame's front face
 * inside the bezel. V6: thicker bezel, flat shading, a saturated matte
 * frame colour and no specular — a cartoon prop, not an instrument.
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
  const bezel = 0.075;
  const depth = 0.09;
  const recess = 0.014;
  const radius = 0.1;
  const { frame, back } = useMemo(() => {
    const outer = roundedRect(width + 2 * bezel, height + 2 * bezel, radius);
    outer.holes.push(roundedRectPath(width, height, Math.max(0.02, radius - bezel)));
    const frame = new THREE.ExtrudeGeometry(outer, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
      curveSegments: 10,
    });
    const back = new THREE.ExtrudeGeometry(
      roundedRect(width + 2 * bezel, height + 2 * bezel, radius),
      {
        depth: 0.012,
        bevelEnabled: false,
        curveSegments: 10,
      },
    );
    return { frame, back };
  }, [width, height]);
  return (
    <group>
      {/* The frame is extruded from z = -depth to z = 0, so its front face is the panel's plane. */}
      <mesh geometry={frame} position={[0, 0, -depth]} castShadow receiveShadow>
        <meshStandardMaterial
          color={room.surface.frame}
          roughness={0.9}
          metalness={0}
          flatShading
        />
      </mesh>
      <mesh geometry={back} position={[0, 0, -depth - 0.005]}>
        <meshStandardMaterial color={room.surface.frameDark} roughness={0.95} metalness={0} />
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
  while (size > 40 && ctx.measureText(text).width > maxWidth) {
    size -= 6;
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

/** A deterministic flicker: 1 most of the time, a little dimmer now and then. */
function flicker(t: number): number {
  const k = Math.floor(t * 12);
  const h = ((k * 2654435761) >>> 0) % 97;
  return h < 4 ? 0.9 : h < 7 ? 0.95 : 1;
}

/**
 * The frame every panel shares: flat near-black, a thick inset rule and
 * corner brackets in the tint, the title — one word, big — and the stripe
 * along the foot that keeps it honest: solid amber, four heavy dark words,
 * every panel, every frame. Then the scanline sweep and the flicker over
 * everything. Returns the height left above the stripe.
 */
function frame(ctx: Ctx, w: number, h: number, title: string, tint: string): number {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  // A thick inset rule and heavy corner brackets. Never a hairline.
  ctx.strokeStyle = tint;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = RULE;
  ctx.strokeRect(22, 22, w - 44, h - BAND_HEIGHT - 44);
  ctx.globalAlpha = 1;
  ctx.lineWidth = RULE + 6;
  ctx.lineCap = 'butt';
  const m = 64;
  for (const [sx, sy] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const) {
    const x = sx > 0 ? 22 : w - 22;
    const y = sy > 0 ? 22 : h - BAND_HEIGHT - 22;
    ctx.beginPath();
    ctx.moveTo(x, y + sy * m);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * m, y);
    ctx.stroke();
  }
  // Title: one word.
  ctx.fillStyle = tint;
  ctx.font = display(72);
  spaced(ctx, '0.08em');
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(title, 64, 54);
  spaced(ctx, '0em');
  // The honesty stripe.
  ctx.fillStyle = room.warm.amber;
  ctx.fillRect(0, h - BAND_HEIGHT, w, BAND_HEIGHT);
  ctx.fillStyle = room.warm.amberDeep;
  ctx.fillRect(0, h - BAND_HEIGHT, w, RULE);
  ctx.fillStyle = '#1a1206';
  // Spacing is set before fitting, so the measure includes it and the
  // four words never run under the bezel.
  spaced(ctx, '0.06em');
  fitFont(ctx, display, 64, 'ILLUSTRATIVE · NOT REAL STATE', w - 96);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ILLUSTRATIVE · NOT REAL STATE', w / 2 + 4, h - BAND_HEIGHT / 2 + RULE / 2 + 2);
  spaced(ctx, '0em');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  return h - BAND_HEIGHT;
}

/** The imperfection: a scanline sweeping down every few seconds, and the flicker. */
function finish(ctx: Ctx, w: number, h: number, t: number) {
  const floor = h - BAND_HEIGHT;
  const y = ((t * 0.28) % 1) * floor;
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = TEXT;
  ctx.fillRect(0, y - 4, w, 8);
  ctx.globalAlpha = 0.06;
  ctx.fillRect(0, y - 24, w, 48);
  const f = flicker(t);
  if (f < 1) {
    ctx.globalAlpha = 1 - f;
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, w, floor);
  }
  ctx.globalAlpha = 1;
}

/** The big word: fitted to the width, in its colour, no shadow. */
function bigWord(ctx: Ctx, text: string, x: number, y: number, maxWidth: number, colour: string) {
  spaced(ctx, '0.02em');
  const size = fitFont(ctx, display, 200, text, maxWidth);
  ctx.fillStyle = colour;
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y + (200 - size) / 2);
  spaced(ctx, '0em');
  return size;
}

/** A heavy ring, filled when lit. */
function ring(ctx: Ctx, x: number, y: number, r: number, colour: string, lit: boolean) {
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = RULE;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (lit) ctx.fill();
  else {
    ctx.globalAlpha = 0.45;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/** A tick in a 56 px box at (x, y). */
function tick(ctx: Ctx, x: number, y: number, colour: string, size = 56) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = size * 0.22;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.52);
  ctx.lineTo(x + size * 0.36, y + size * 0.86);
  ctx.lineTo(x + size, y + size * 0.14);
  ctx.stroke();
}

function cross(ctx: Ctx, x: number, y: number, colour: string, size = 56) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = size * 0.22;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + size * 0.1, y + size * 0.1);
  ctx.lineTo(x + size * 0.9, y + size * 0.9);
  ctx.moveTo(x + size * 0.9, y + size * 0.1);
  ctx.lineTo(x + size * 0.1, y + size * 0.9);
  ctx.stroke();
}

/** A row of chunky blocks, `lit` of `n` filled — filled in hard steps, never eased. */
function blocks(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  n: number,
  lit: number,
  colour: string,
) {
  const gap = 12;
  const bw = (w - (n - 1) * gap) / n;
  for (let k = 0; k < n; k += 1) {
    ctx.fillStyle = k < lit ? colour : 'rgba(214,232,255,0.12)';
    roundRect(ctx, x + k * (bw + gap), y, bw, h, 8);
    ctx.fill();
  }
}

function drawRoles(canvas: HTMLCanvasElement, t: number, content: ScreenContent) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const floor = frame(ctx, w, h, 'ROLES', room.emit.cyan);
  const active = content.active ?? 'VIRGIL';
  bigWord(ctx, active.toUpperCase(), 64, 150, w - 128, content.active ? room.warm.amber : TEXT);
  // Four rings, one per role; the active one filled, the others blinking in
  // turn so the row reads as switched on.
  const y = floor - 92;
  const pitch = (w - 128) / ROLES.length;
  ROLES.forEach((role, i) => {
    const on = role === active || (!content.active && Math.floor(t * 2) % ROLES.length === i);
    ring(ctx, 64 + pitch * i + 40, y, 30, on ? room.warm.amber : room.emit.cyan, on);
  });
  finish(ctx, w, h, t);
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
  const word = verdict === '—' ? 'AWAITING' : verdict === 'PASS' ? 'PASS' : 'BLOCKED';
  bigWord(ctx, word, 64, 150, w - 470, tint);
  // A gauge ring of twelve heavy segments, right: stepping round while
  // awaiting, all lit on a PASS, and on a BLOCKED broken with a cross.
  const cx = w - 190;
  const cy = 150 + (floor - 150) / 2 - 10;
  const r = 118;
  const segments = 12;
  for (let k = 0; k < segments; k += 1) {
    const a0 = -Math.PI / 2 + (k / segments) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2) / segments - 0.09;
    const lit =
      verdict === '—'
        ? k === Math.floor(t * 4) % segments || k === (Math.floor(t * 4) + 1) % segments
        : verdict === 'BLOCKED'
          ? k % 3 !== 1
          : true;
    ctx.strokeStyle = tint;
    ctx.globalAlpha = lit ? 1 : 0.18;
    ctx.lineWidth = 26;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (verdict === 'BLOCKED') cross(ctx, cx - 44, cy - 44, tint, 88);
  else if (verdict === 'PASS') tick(ctx, cx - 44, cy - 44, tint, 88);
  finish(ctx, w, h, t);
}

/** Deterministic "hex" from integers: a texture, not a value. */
function hex(seed: number, length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) out += ((seed * 31 + i * 17 + (seed >> 3)) % 16).toString(16);
  return out;
}

function drawCandidate(canvas: HTMLCanvasElement, t: number, content: ScreenContent) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const floor = frame(ctx, w, h, 'CANDIDATE', room.emit.magenta);
  bigWord(ctx, content.phase.toUpperCase(), 64, 150, w - 128, room.emit.ice);
  // A walking hex string, stepping every 0.7 s: data-shaped, never a real
  // commit, and big enough to read across the room.
  ctx.font = mono(92);
  ctx.fillStyle = room.emit.magenta;
  ctx.textBaseline = 'top';
  ctx.fillText(hex(Math.floor(t / 0.7), 10), 64, floor - 130);
  // Brackets round it.
  ctx.strokeStyle = room.emit.magenta;
  ctx.lineWidth = RULE;
  ctx.globalAlpha = 0.5;
  ctx.strokeRect(48, floor - 148, w - 96, 126);
  ctx.globalAlpha = 1;
  finish(ctx, w, h, t);
}

// ------------------------------------------------------------- the station

/** Receiving: eight blocks land, one every 0.26 s from 0.8 s. */
const PACKETS = 8;
const PACKET_GAP = 0.26;
const RECEIVING_LOOP = 3.4;
/** Working: five checks, each ticking through eight steps. */
const CHECKS = 5;
const CHECK_SECONDS = 1.05;
const CHECK_STEPS = 8;
const WORKING_LOOP = 8.5;

/**
 * The station panel: the occupant's name as the title, the state as the
 * big word, and one chunky graphic that is different in each state, all
 * stepped. In RECEIVING the blocks land one by one; in WORKING five bars
 * fill in quantised steps with a tick as each completes; in REPORTED the
 * report word and a single huge mark. Nothing is measured; `since` is
 * seconds since the state last changed.
 */
function drawStation(
  canvas: HTMLCanvasElement,
  t: number,
  since: number,
  occupant: string,
  state: StationState,
  report: Report,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const reported = state === 'REPORTED';
  const tint =
    state === 'RECEIVING'
      ? room.emit.ice
      : state === 'WORKING'
        ? room.warm.amber
        : reported
          ? report === 'BLOCKED'
            ? BLOCK_RED
            : report === 'COMPLETE'
              ? room.emit.ice
              : PASS_GREEN
          : room.emit.cyan;
  const floor = frame(ctx, w, h, occupant.toUpperCase(), tint);
  const word = reported ? (report === '—' ? 'REPORTED' : report) : state;
  const graphicTop = floor - 150;
  bigWord(ctx, word, 64, 140, w - 128, tint);

  if (state === 'READY') {
    // Three of eight blocks lit, the fourth blinking: switched on, waiting.
    const blink = Math.floor(t * 2) % 2 === 0 ? 4 : 3;
    blocks(ctx, 64, graphicTop + 40, w - 128, 56, 8, blink, tint);
  } else if (state === 'RECEIVING') {
    const s = since % RECEIVING_LOOP;
    let landed = 0;
    for (let k = 0; k < PACKETS; k += 1) if (s >= 0.8 + k * PACKET_GAP) landed += 1;
    blocks(ctx, 64, graphicTop + 40, w - 128, 56, PACKETS, landed, tint);
  } else if (state === 'WORKING') {
    const s = since % WORKING_LOOP;
    const runFor = CHECKS * CHECK_SECONDS;
    const complete = s >= runFor;
    const pitch = 150 / CHECKS;
    const barW = w - 128 - 90;
    for (let i = 0; i < CHECKS; i += 1) {
      const local = (s - i * CHECK_SECONDS) / CHECK_SECONDS;
      const finished = local >= 1 || complete;
      const steps = finished ? CHECK_STEPS : local > 0 ? Math.floor(local * CHECK_STEPS) : 0;
      const y = graphicTop + 6 + i * pitch;
      blocks(ctx, 64, y, barW, pitch - 10, CHECK_STEPS, steps, tint);
      if (finished) tick(ctx, w - 64 - 56, y - 6, tint, pitch + 2);
    }
  } else {
    // REPORTED: one huge mark, right of the word.
    const x = w - 64 - 150;
    const y = graphicTop - 20;
    if (report === 'BLOCKED') cross(ctx, x, y, tint, 150);
    else if (report === 'PASS') tick(ctx, x, y, tint, 150);
    else {
      // COMPLETE is a claim: a ring, not a tick.
      ring(ctx, x + 75, y + 75, 66, tint, false);
      ctx.globalAlpha = 1;
    }
    blocks(ctx, 64, graphicTop + 96, w - 128 - 180, 40, 8, 8, tint);
  }
  finish(ctx, w, h, t);
}
