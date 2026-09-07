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
 * V4, on the owner's "the screens need work": legibility first. From the
 * authored camera a 1.3 m panel is about 200 px wide, so every panel now
 * carries one headline sized to be read from there (the verdict, the phase,
 * the active role), a small number of secondary lines that read on
 * approach, and a solid amber band along its foot that says ILLUSTRATIVE ·
 * NOT REAL STATE, which reads from anywhere. The canvas is 1024 px across
 * so the headline stays crisp when the camera comes close.
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

const ROLES = ['Virgil', 'Fabricator', 'Prover', 'Keeper', 'Arbiter'];
const STATES = [
  'ASSIGNED',
  'IN_PROGRESS',
  'BUILDER_REPORTED_COMPLETE',
  'CHECKS_PASSED',
  'REVIEWED',
];

const FAMILY = 'ui-monospace, Menlo, Consolas, "Liberation Mono", monospace';
const font = (weight: number, px: number) => `${weight} ${px}px ${FAMILY}`;
const TITLE = font(700, 52);
const HEADLINE = font(800, 132);
const LARGE = font(700, 80);
const MEDIUM = font(700, 60);
const SMALL = font(500, 40);
const BAND = font(800, 40);
/** The honesty band along the foot of every panel, in canvas pixels. */
const BAND_HEIGHT = 64;
const DIM = 'rgba(207,228,255,0.55)';
const TEXT = 'rgba(214,232,255,0.9)';

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
      width={0.8}
      height={0.5}
      draw={(c, t) => drawStation(c, t, occupant, state)}
    />
  );
}

function Panel({
  position,
  rotation,
  width = 1.3,
  height = 0.8,
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

/**
 * The frame every panel shares: dark glass, a tinted border, the title, and
 * the band along the foot that keeps it honest — solid amber, dark text,
 * every panel, every frame. Returns the height left above the band.
 */
function frame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  title: string,
  tint: string,
): number {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0b1230');
  bg.addColorStop(1, '#060818');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let y = 0; y < h; y += 6) ctx.fillRect(0, y, w, 2);
  ctx.strokeStyle = tint;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.globalAlpha = 1;
  ctx.fillStyle = tint;
  ctx.font = TITLE;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(title, 36, 28);
  // A rule under the title.
  ctx.globalAlpha = 0.5;
  ctx.fillRect(36, 92, w - 72, 3);
  ctx.globalAlpha = 1;
  // The honesty band.
  ctx.fillStyle = room.warm.amber;
  ctx.fillRect(0, h - BAND_HEIGHT, w, BAND_HEIGHT);
  ctx.fillStyle = '#1a1206';
  ctx.font = BAND;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ILLUSTRATIVE · NOT REAL STATE', w / 2, h - BAND_HEIGHT / 2 + 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  return h - BAND_HEIGHT;
}

function drawRoles(canvas: HTMLCanvasElement, t: number, content: ScreenContent) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const floor = frame(ctx, w, h, 'ROLES', room.emit.cyan);
  const rowHeight = Math.floor((floor - 110) / ROLES.length);
  ROLES.forEach((role, i) => {
    const y = 110 + i * rowHeight;
    const active = content.active === role;
    if (active) {
      ctx.fillStyle = room.warm.amber;
      ctx.globalAlpha = 0.16 + 0.08 * Math.sin(t * 6);
      ctx.fillRect(20, y - 6, w - 40, rowHeight - 4);
      ctx.globalAlpha = 1;
      ctx.fillRect(20, y - 6, 14, rowHeight - 4);
    }
    ctx.font = MEDIUM;
    ctx.fillStyle = active ? room.warm.amber : TEXT;
    ctx.fillText(role.toUpperCase(), 52, y + 8);
    const state = active ? 'IN_PROGRESS' : (STATES[(i + Math.floor(t / 7)) % STATES.length] ?? '');
    // A lamp and the state word.
    ctx.fillStyle = active ? room.warm.amber : room.emit.cyan;
    ctx.globalAlpha = active ? 1 : 0.55;
    ctx.beginPath();
    ctx.arc(560, y + rowHeight / 2 - 2, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = SMALL;
    ctx.fillStyle = active ? room.warm.amber : DIM;
    ctx.fillText(state, 590, y + 18);
    ctx.globalAlpha = 1;
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
  const floor = frame(ctx, w, h, 'REVIEW', tint);
  ctx.font = SMALL;
  ctx.fillStyle = DIM;
  ctx.fillText('verdict', 36, 112);
  const label = verdict === '—' ? 'AWAITING REVIEW' : verdict;
  ctx.font = label.length <= 8 ? HEADLINE : label.length <= 16 ? LARGE : font(700, 46);
  ctx.fillStyle = tint;
  ctx.shadowColor = tint;
  ctx.shadowBlur = 24;
  ctx.fillText(label, 36, label.length <= 8 ? 150 : 172);
  ctx.shadowBlur = 0;
  ctx.font = SMALL;
  ctx.fillStyle = DIM;
  ctx.fillText('evidence', 36, 318);
  const bars = ['checks', 'tethers', 'review'];
  const barTop = 366;
  const pitch = Math.floor((floor - barTop - 8) / bars.length);
  bars.forEach((name, i) => {
    const y = barTop + i * pitch;
    ctx.font = SMALL;
    ctx.fillStyle = TEXT;
    ctx.fillText(name, 36, y);
    const fill =
      verdict === '—'
        ? (0.5 + 0.5 * Math.sin(t * 2 + i)) * 0.6
        : verdict === 'BLOCKED' && i === 2
          ? 0.3
          : 1;
    ctx.fillStyle = 'rgba(207,228,255,0.15)';
    ctx.fillRect(230, y + 6, w - 266, 30);
    ctx.fillStyle = tint;
    ctx.fillRect(230, y + 6, (w - 266) * fill, 30);
  });
}

function drawCandidate(canvas: HTMLCanvasElement, t: number, content: ScreenContent) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const floor = frame(ctx, w, h, 'CANDIDATE', room.emit.magenta);
  ctx.font = SMALL;
  ctx.fillStyle = DIM;
  ctx.fillText('phase', 36, 112);
  ctx.font = LARGE;
  ctx.fillStyle = room.emit.ice;
  ctx.fillText(content.phase.split(' · ')[0]?.toUpperCase() ?? '', 36, 150);
  ctx.font = SMALL;
  ctx.fillStyle = DIM;
  ctx.fillText('head (illustrative)', 36, 258);
  // A scrolling abbreviated SHA. Deterministic from time so it never reads as
  // a real commit: hex digits walk, they are not looked up anywhere.
  ctx.font = font(800, 104);
  ctx.fillStyle = room.emit.magenta;
  ctx.shadowColor = room.emit.magenta;
  ctx.shadowBlur = 18;
  let sha = '';
  for (let i = 0; i < 10; i += 1) {
    sha += ((Math.floor(t * 1.5) * 7 + i * 13 + Math.floor(t / 3) * 5) % 16).toString(16);
  }
  ctx.fillText(sha, 36, 296);
  ctx.shadowBlur = 0;
  ctx.font = SMALL;
  ctx.fillStyle = DIM;
  ctx.fillText('provenance tether', 36, 420);
  const lineY = Math.min(500, floor - 40);
  ctx.strokeStyle = room.emit.teal;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = 36; x < w - 36; x += 8) {
    const y = lineY + Math.sin(x * 0.03 + t * 2) * 10;
    if (x === 36) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = room.emit.teal;
  ctx.shadowColor = room.emit.teal;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  const dotX = 36 + ((t * 90) % (w - 72));
  ctx.arc(dotX, lineY + Math.sin(dotX * 0.03 + t * 2) * 10, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawStation(canvas: HTMLCanvasElement, t: number, occupant: string | null, state: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const tint = occupant ? room.warm.amber : room.emit.cyan;
  const floor = frame(ctx, w, h, 'STATION', tint);
  ctx.font = SMALL;
  ctx.fillStyle = DIM;
  ctx.fillText('occupant', 36, 112);
  ctx.font = font(800, 116);
  ctx.fillStyle = tint;
  ctx.shadowColor = tint;
  ctx.shadowBlur = 20;
  ctx.fillText(occupant ? occupant.toUpperCase() : 'UNASSIGNED', 36, 150);
  ctx.shadowBlur = 0;
  ctx.font = SMALL;
  ctx.fillStyle = DIM;
  ctx.fillText('state', 36, 300);
  ctx.font = LARGE;
  ctx.fillStyle = room.emit.ice;
  ctx.fillText(state, 36, 340);
  ctx.fillStyle = tint;
  const pipY = floor - 48;
  for (let i = 0; i < 12; i += 1) {
    const active = occupant ? (i + Math.floor(t * 4)) % 12 < 6 : i < 3;
    ctx.globalAlpha = active ? 0.9 : 0.2;
    ctx.fillRect(36 + i * 80, pipY, 56, 22);
  }
  ctx.globalAlpha = 1;
}
