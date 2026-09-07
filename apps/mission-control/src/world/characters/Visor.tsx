import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { room } from '../room/palette.js';

/**
 * A character's face: an emissive panel drawn per frame onto a canvas
 * texture, in the pattern `ADR-0010` approved for labels — no font fetch, no
 * `data:` URI, nothing outside the document. Anchored to the head joint of a
 * rigged character (`createPortal`) or fixed in front of a static one.
 *
 * What it does: irregular blinking, eye shape by state, colour by state, a
 * pulse whose rate follows activity. Because the panel is emissive it also
 * carries a point light, so a face lights its own chest and that light
 * changes colour with state — no refusal clip exists yet, and this is how a
 * blocked state is expressed now; a clip drops in later without rework.
 *
 * This is route 2 of the three the brief allowed: an **opaque** panel that
 * covers the baked visor entirely (partial coverage would show two sets of
 * eyes). Route 1 — painting the visor dark in the texture — was not feasible:
 * Meshy's base-colour atlas is a fragmented UV layout in which the visor
 * region cannot be identified without a UV analysis this pass did not have
 * time for. The baked face remains underneath as the reduced-motion and
 * failure fallback: with reduced motion the panel is not drawn at all.
 */
export type FaceState = 'idle' | 'working' | 'passed' | 'blocked' | 'attentive';

const FACE_COLOUR: Record<FaceState, string> = {
  idle: room.emit.teal,
  attentive: room.emit.ice,
  working: room.warm.amber,
  passed: '#b6ff5c',
  blocked: '#ff3b5c',
};

const PULSE_HZ: Record<FaceState, number> = {
  idle: 0.35,
  attentive: 0.6,
  working: 1.6,
  passed: 0.5,
  blocked: 2.4,
};

interface FaceStyle {
  /** Eye width and height as fractions of the panel. */
  eye: [number, number];
  /** Eye corner radius fraction; 1 is a full pill. */
  round: number;
  /** Vertical tilt of the eyes in radians, positive = outer corners up. */
  tilt: number;
  /** Whether a mouth line is drawn. */
  smile: boolean;
}

const FACE_STYLE: Record<FaceState, FaceStyle> = {
  idle: { eye: [0.13, 0.3], round: 1, tilt: 0, smile: true },
  attentive: { eye: [0.15, 0.36], round: 0.8, tilt: 0.08, smile: false },
  working: { eye: [0.16, 0.18], round: 0.5, tilt: -0.06, smile: false },
  passed: { eye: [0.15, 0.22], round: 1, tilt: 0.22, smile: true },
  blocked: { eye: [0.17, 0.14], round: 0.25, tilt: -0.28, smile: false },
};

export function Visor({
  state = 'idle',
  width = 0.42,
  height = 0.28,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  lightIntensity = 1.4,
  eyes = true,
  curve = 1.15,
}: {
  state?: FaceState;
  width?: number;
  height?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  lightIntensity?: number;
  /** False for a character whose visor the owner made blank: colour and pulse only. */
  eyes?: boolean;
  /** Arc of the panel in radians; flatter for a small visor on a large dome. */
  curve?: number;
}) {
  const { reducedMotion } = useSettings();
  const CURVE = curve;
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 168;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return { canvas, texture };
  }, []);
  const light = useRef<THREE.PointLight>(null);
  const clock = useRef({ t: 0, nextBlink: 2 + Math.random() * 3, blinkEnd: 0, lastDraw: -1 });
  const colour = useMemo(() => new THREE.Color(FACE_COLOUR[state]), [state]);

  useFrame((_, delta) => {
    const c = clock.current;
    c.t += reducedMotion ? 0 : delta;
    // Irregular blinking: the next gap is random, and one blink in four is a
    // double. Blocked never blinks; it stares.
    let open = 1;
    if (state !== 'blocked' && !reducedMotion) {
      if (c.t >= c.nextBlink) {
        c.blinkEnd = c.t + 0.13;
        c.nextBlink = c.t + (Math.random() < 0.25 ? 0.32 : 2.2 + Math.random() * 4.5);
      }
      if (c.t < c.blinkEnd) open = Math.abs(Math.sin(((c.blinkEnd - c.t) / 0.13) * Math.PI));
    }
    const pulse = 0.82 + 0.18 * Math.sin(c.t * Math.PI * 2 * PULSE_HZ[state]);
    if (light.current) {
      light.current.color.copy(colour);
      light.current.intensity = lightIntensity * pulse * (state === 'blocked' ? 1.35 : 1);
    }
    // 24 fps is plenty for a face; the texture upload is the cost.
    if (c.t - c.lastDraw < 1 / 24 && c.lastDraw >= 0) return;
    c.lastDraw = c.t;
    draw(canvas, FACE_STYLE[state], FACE_COLOUR[state], open, pulse, eyes);
    texture.needsUpdate = true;
  });

  if (reducedMotion) return null;

  return (
    <group position={position} rotation={rotation}>
      {/* A shallow cylinder segment rather than a flat plate, so the panel
          wraps the head's curve and does not read as a plate from the side.
          The arc subtends `curve` radians; its chord is `width`. */}
      <mesh position={[0, 0, -width / (2 * Math.sin(CURVE / 2))]} rotation={[0, Math.PI, 0]}>
        <cylinderGeometry
          args={[
            width / (2 * Math.sin(CURVE / 2)),
            width / (2 * Math.sin(CURVE / 2)),
            height,
            24,
            1,
            true,
            Math.PI - CURVE / 2,
            CURVE,
          ]}
        />
        <meshBasicMaterial map={texture} toneMapped={false} side={THREE.BackSide} />
      </mesh>
      {/* The face's own light, just in front of the panel, onto the chest. */}
      <pointLight ref={light} position={[0, -0.05, 0.12]} distance={1.6} decay={2} />
    </group>
  );
}

function draw(
  canvas: HTMLCanvasElement,
  style: FaceStyle,
  colour: string,
  open: number,
  pulse: number,
  eyes: boolean,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  // The visor: near-black with a faint cool gradient, so it reads as glass.
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0d1020');
  bg.addColorStop(1, '#05060e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  // A soft wash of the state colour across the glass.
  ctx.globalAlpha = 0.1 * pulse;
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;

  if (!eyes) {
    // A blank visor, by the owner's design: a single horizontal scan line
    // carries colour and pulse, and nothing else.
    ctx.strokeStyle = colour;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.55 + 0.45 * pulse;
    ctx.beginPath();
    ctx.moveTo(w * 0.22, h * 0.5);
    ctx.lineTo(w * 0.78, h * 0.5);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }

  const ew = w * style.eye[0];
  const eh = h * style.eye[1] * Math.max(0.06, open);
  const r = Math.min(ew, eh) * 0.5 * style.round;
  ctx.shadowColor = colour;
  ctx.shadowBlur = 18 * pulse;
  ctx.fillStyle = colour;
  for (const side of [-1, 1]) {
    const cx = w * 0.5 + side * w * 0.2;
    const cy = h * 0.46;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-side * style.tilt);
    roundRect(ctx, -ew / 2, -eh / 2, ew, eh, r);
    ctx.fill();
    ctx.restore();
  }
  if (style.smile) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.6, w * 0.07, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
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
