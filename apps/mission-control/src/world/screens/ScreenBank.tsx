import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { layout, room } from '../room/palette.js';

/**
 * Readable screens, drawn onto canvas textures in the `ADR-0010` pattern:
 * no font fetch, no `data:` URI, nothing outside the document.
 *
 * Three upright panels stand behind Virgil on the far arc of his console,
 * facing the camera — the front-to-back read the owner asked for is his face,
 * then the screens, then the window. The console model's own screens are
 * low, tilted inward and a few dozen pixels tall from the authored camera,
 * below the ~96 px at which text stays legible, so they keep their baked
 * glow and the readable content lives on these. **This is geometry the
 * owner did not supply**, added for that reason and reported as such.
 *
 * Everything drawn here is **illustrative** — role names from
 * `.claude/agents/`, the state vocabulary of `constitution/STATE_LANGUAGE.md`,
 * the verdicts of `constitution/REVIEW_POLICY.md`, a scrolling abbreviated
 * SHA — and is labelled so on every panel. None of it is this repository's
 * real state, and it never claims to be.
 */

export interface ScreenContent {
  /** The verdict currently shown on the review panel. */
  verdict: 'PASS' | 'PASS_WITH_NON_BLOCKING_FINDINGS' | 'BLOCKED' | 'INSUFFICIENT_EVIDENCE' | '—';
  /** Which role is active, if any. */
  active: string | null;
  /** The phase label shown on the candidate panel. */
  phase: string;
}

const ROLES = ['Virgil', 'Fabricator', 'Prover', 'Keeper', 'Arbiter', 'Sentinel', 'Examiner'];
const STATES = [
  'ASSIGNED',
  'IN_PROGRESS',
  'BUILDER_REPORTED_COMPLETE',
  'CHECKS_PASSED',
  'REVIEWED',
];

const MONO = '600 22px ui-monospace, Menlo, Consolas, "Liberation Mono", monospace';
const MONO_SMALL = '500 16px ui-monospace, Menlo, Consolas, "Liberation Mono", monospace';
const MONO_BIG = '700 34px ui-monospace, Menlo, Consolas, "Liberation Mono", monospace';

export function ScreenBank({ content }: { content: ScreenContent }) {
  const [cx, , cz] = layout.consoleCentre;
  const y = 1.3;
  const z = cz - 1.05;
  return (
    <group>
      <Panel
        position={[cx - 1.2, y, z + 0.1]}
        rotation={[0, 0.22, 0]}
        draw={(c, t) => drawRoles(c, t, content)}
      />
      <Panel
        position={[cx, y + 0.05, z - 0.08]}
        rotation={[0, 0, 0]}
        draw={(c, t) => drawReview(c, t, content)}
      />
      <Panel
        position={[cx + 1.2, y, z + 0.1]}
        rotation={[0, -0.22, 0]}
        draw={(c, t) => drawCandidate(c, t, content)}
      />
    </group>
  );
}

/** The small panel on a side station: a glowing strip of station state. */
export function StationPanel({
  position,
  rotation,
  occupant,
  state,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  occupant: string | null;
  state: string;
}) {
  return (
    <Panel
      position={position}
      rotation={rotation}
      width={0.64}
      height={0.4}
      draw={(c, t) => drawStation(c, t, occupant, state)}
    />
  );
}

function Panel({
  position,
  rotation,
  width = 0.96,
  height = 0.6,
  draw,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width?: number;
  height?: number;
  draw: (canvas: HTMLCanvasElement, t: number) => void;
}) {
  const { reducedMotion } = useSettings();
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = Math.round((512 * height) / width);
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
    // Eight frames a second: screens tick, they do not need to be smooth.
    if (c.last >= 0 && c.t - c.last < 1 / 8) return;
    c.last = c.t;
    draw(canvas, c.t);
    texture.needsUpdate = true;
  });

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* A thin brass frame so the panel reads as a fixture, not a sticker. */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[width + 0.05, height + 0.05]} />
        <meshStandardMaterial color={room.surface.brass} roughness={0.4} metalness={0.85} />
      </mesh>
      <mesh position={[0, -height / 2 - 0.09, -0.02]}>
        <boxGeometry args={[0.06, 0.18, 0.03]} />
        <meshStandardMaterial color={room.surface.brass} roughness={0.4} metalness={0.85} />
      </mesh>
    </group>
  );
}

// ------------------------------------------------------------- drawing

function frame(ctx: CanvasRenderingContext2D, w: number, h: number, title: string, tint: string) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0b1230');
  bg.addColorStop(1, '#060818');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = tint;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.globalAlpha = 1;
  ctx.fillStyle = tint;
  ctx.font = MONO;
  ctx.textBaseline = 'top';
  ctx.fillText(title, 22, 18);
  // The label that keeps this honest, on every panel, every frame.
  ctx.font = MONO_SMALL;
  ctx.fillStyle = room.warm.amber;
  ctx.textAlign = 'right';
  ctx.fillText('ILLUSTRATIVE', w - 22, 22);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
}

function drawRoles(canvas: HTMLCanvasElement, t: number, content: ScreenContent) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  frame(ctx, w, h, 'ROLES', room.emit.cyan);
  ctx.font = MONO;
  ROLES.forEach((role, i) => {
    const y = 64 + i * 34;
    const active = content.active === role;
    ctx.fillStyle = active ? room.warm.amber : 'rgba(207,228,255,0.85)';
    ctx.fillText(role.toUpperCase(), 30, y);
    const state = active ? 'IN_PROGRESS' : (STATES[(i + Math.floor(t / 7)) % STATES.length] ?? '');
    ctx.fillStyle = active ? room.warm.amber : 'rgba(207,228,255,0.45)';
    ctx.font = MONO_SMALL;
    ctx.fillText(state, 250, y + 4);
    ctx.font = MONO;
    if (active) {
      ctx.fillStyle = room.warm.amber;
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6);
      ctx.fillRect(14, y + 4, 8, 16);
      ctx.globalAlpha = 1;
    }
  });
}

function drawReview(canvas: HTMLCanvasElement, t: number, content: ScreenContent) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const verdict = content.verdict;
  const tint =
    verdict === 'BLOCKED'
      ? '#ff3b5c'
      : verdict === 'PASS'
        ? '#b6ff5c'
        : verdict === '—'
          ? room.emit.cyan
          : room.warm.amber;
  frame(ctx, w, h, 'REVIEW', tint);
  ctx.font = MONO_SMALL;
  ctx.fillStyle = 'rgba(207,228,255,0.6)';
  ctx.fillText('verdict', 30, 70);
  ctx.font = verdict.length > 12 ? MONO : MONO_BIG;
  ctx.fillStyle = tint;
  ctx.shadowColor = tint;
  ctx.shadowBlur = 14;
  ctx.fillText(verdict === '—' ? 'AWAITING REVIEW' : verdict, 30, 96);
  ctx.shadowBlur = 0;
  ctx.font = MONO_SMALL;
  ctx.fillStyle = 'rgba(207,228,255,0.6)';
  ctx.fillText('evidence', 30, 160);
  const bars = ['checks', 'tethers', 'review'];
  bars.forEach((label, i) => {
    const y = 186 + i * 30;
    ctx.fillStyle = 'rgba(207,228,255,0.7)';
    ctx.fillText(label, 30, y);
    const fill =
      verdict === '—'
        ? (0.5 + 0.5 * Math.sin(t * 2 + i)) * 0.6
        : verdict === 'BLOCKED' && i === 2
          ? 0.3
          : 1;
    ctx.fillStyle = 'rgba(207,228,255,0.15)';
    ctx.fillRect(130, y + 2, w - 160, 14);
    ctx.fillStyle = tint;
    ctx.fillRect(130, y + 2, (w - 160) * fill, 14);
  });
}

function drawCandidate(canvas: HTMLCanvasElement, t: number, content: ScreenContent) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  frame(ctx, w, h, 'CANDIDATE', room.emit.magenta);
  ctx.font = MONO_SMALL;
  ctx.fillStyle = 'rgba(207,228,255,0.6)';
  ctx.fillText('phase', 30, 70);
  ctx.font = MONO;
  ctx.fillStyle = room.emit.ice;
  ctx.fillText(content.phase, 30, 92);
  ctx.font = MONO_SMALL;
  ctx.fillStyle = 'rgba(207,228,255,0.6)';
  ctx.fillText('head (illustrative)', 30, 136);
  // A scrolling abbreviated SHA. Deterministic from time so it never reads as
  // a real commit: hex digits walk, they are not looked up anywhere.
  ctx.font = MONO_BIG;
  ctx.fillStyle = room.emit.magenta;
  let sha = '';
  for (let i = 0; i < 10; i += 1) {
    sha += ((Math.floor(t * 1.5) * 7 + i * 13 + Math.floor(t / 3) * 5) % 16).toString(16);
  }
  ctx.fillText(sha, 30, 158);
  ctx.font = MONO_SMALL;
  ctx.fillStyle = 'rgba(207,228,255,0.6)';
  ctx.fillText('provenance tether', 30, 214);
  ctx.strokeStyle = room.emit.teal;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 30; x < w - 30; x += 6) {
    const y = 258 + Math.sin(x * 0.05 + t * 2) * 8;
    if (x === 30) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = room.emit.teal;
  ctx.beginPath();
  const dotX = 30 + ((t * 60) % (w - 60));
  ctx.arc(dotX, 258 + Math.sin(dotX * 0.05 + t * 2) * 8, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawStation(canvas: HTMLCanvasElement, t: number, occupant: string | null, state: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const tint = occupant ? room.warm.amber : room.emit.cyan;
  frame(ctx, w, h, 'STATION', tint);
  ctx.font = MONO_SMALL;
  ctx.fillStyle = 'rgba(207,228,255,0.6)';
  ctx.fillText('occupant', 30, 70);
  ctx.font = MONO_BIG;
  ctx.fillStyle = tint;
  ctx.fillText(occupant ? occupant.toUpperCase() : 'UNASSIGNED', 30, 92);
  ctx.font = MONO_SMALL;
  ctx.fillStyle = 'rgba(207,228,255,0.6)';
  ctx.fillText('state', 30, 150);
  ctx.font = MONO;
  ctx.fillStyle = room.emit.ice;
  ctx.fillText(state, 30, 172);
  ctx.fillStyle = tint;
  for (let i = 0; i < 12; i += 1) {
    const active = occupant ? (i + Math.floor(t * 4)) % 12 < 6 : i < 3;
    ctx.globalAlpha = active ? 0.9 : 0.2;
    ctx.fillRect(30 + i * 36, h - 46, 26, 12);
  }
  ctx.globalAlpha = 1;
}
