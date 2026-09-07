import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { room } from '../room/palette.js';
import {
  buildVisorGeometry,
  createVisorMaterial,
  type HeadSurface,
  visorCentre,
} from './visorFit.js';

/**
 * A character's face: an emissive panel drawn per frame onto a canvas
 * texture, in the pattern `ADR-0010` approved for labels — no font fetch, no
 * `data:` URI, nothing outside the document.
 *
 * V4: the panel is no longer a plate at hand-set coordinates. It is a mesh
 * fitted to the head's own front surface (`visorFit.ts`) — flat on Virgil's
 * flat visor, a spherical cap on the Prover's dome — and its outline is a
 * rounded visor shape cut from the canvas, not the mesh's rectangle. It is
 * parented wherever the head is: Virgil's head joint, the Prover's breathing
 * group.
 *
 * What the face does: irregular blinking with a fast close and slow open,
 * a blink on every change of state, eye forms per state, a wash of the
 * state's colour across the glass and a rim of it along the bottom so the
 * colour reads even when the eyes are a few pixels, and a point light in
 * the state's colour that lights the chest. No refusal clip exists yet, and
 * this is how a blocked state is expressed now.
 *
 * With reduced motion the panel is not drawn; the baked face remains.
 */
export type FaceState = 'idle' | 'working' | 'passed' | 'blocked' | 'attentive';

export const FACE_COLOUR: Record<FaceState, string> = {
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

/** Seconds between blinks: [min, max]. Blocked never blinks; it stares. */
const BLINK_GAP: Record<FaceState, [number, number]> = {
  idle: [2.4, 6],
  attentive: [1.2, 3],
  working: [4, 9],
  passed: [2, 4],
  blocked: [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
};

type EyeForm = 'oval' | 'lidded' | 'arc' | 'slit';
type Mouth = 'none' | 'smile' | 'grin' | 'flat';

interface FaceStyle {
  form: EyeForm;
  /** Eye width and height as fractions of the panel. */
  eye: [number, number];
  /** Tilt in radians; positive raises the inner corners (worried), negative lowers them (angry). */
  tilt: number;
  mouth: Mouth;
  /** A heavy brow line over each eye. */
  brow: boolean;
  /** A bar that scans beneath the eyes: thinking. */
  scan: boolean;
}

const FACE_STYLE: Record<FaceState, FaceStyle> = {
  idle: { form: 'oval', eye: [0.15, 0.38], tilt: 0, mouth: 'smile', brow: false, scan: false },
  attentive: {
    form: 'oval',
    eye: [0.17, 0.46],
    tilt: -0.06,
    mouth: 'none',
    brow: false,
    scan: false,
  },
  working: {
    form: 'lidded',
    eye: [0.18, 0.48],
    tilt: 0,
    mouth: 'none',
    brow: false,
    scan: true,
  },
  passed: { form: 'arc', eye: [0.17, 0.3], tilt: 0, mouth: 'grin', brow: false, scan: false },
  blocked: {
    form: 'slit',
    eye: [0.2, 0.11],
    tilt: -0.32,
    mouth: 'flat',
    brow: true,
    scan: false,
  },
};

export function Visor({
  state = 'idle',
  surface,
  lightIntensity = 1.6,
  eyes = true,
}: {
  state?: FaceState;
  /** The head surface the panel is fitted to, from `fitHeadSurface`. */
  surface: HeadSurface;
  lightIntensity?: number;
  /** False for a character whose visor the owner made blank: colour and pulse only. */
  eyes?: boolean;
}) {
  const { reducedMotion } = useSettings();
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 240;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return { canvas, texture };
  }, []);
  const geometry = useMemo(() => buildVisorGeometry(surface), [surface]);
  const material = useMemo(() => createVisorMaterial(texture), [texture]);
  const centre = useMemo(() => visorCentre(surface), [surface]);
  const light = useRef<THREE.PointLight>(null);
  const clock = useRef({ t: 0, nextBlink: 1.5, blinkStart: -1, half: false, lastDraw: -1 });
  const colour = useMemo(() => new THREE.Color(FACE_COLOUR[state]), [state]);

  // A blink on every change of state: the face registers the change.
  useEffect(() => {
    const c = clock.current;
    if (state !== 'blocked') c.blinkStart = c.t;
  }, [state]);

  useFrame((_, delta) => {
    const c = clock.current;
    c.t += reducedMotion ? 0 : delta;
    let open = 1;
    if (state !== 'blocked' && !reducedMotion) {
      if (c.t >= c.nextBlink) {
        c.blinkStart = c.t;
        c.half = Math.random() < 0.18;
        const [lo, hi] = BLINK_GAP[state];
        // One blink in four is a double.
        c.nextBlink = c.t + (Math.random() < 0.25 ? 0.36 : lo + Math.random() * (hi - lo));
      }
      const p = (c.t - c.blinkStart) / 0.26;
      if (c.blinkStart >= 0 && p < 1) {
        // Fast close, short hold, slower open.
        const lid = p < 0.3 ? p / 0.3 : p < 0.45 ? 1 : 1 - (p - 0.45) / 0.55;
        open = 1 - lid * (c.half ? 0.55 : 1);
      }
    }
    const pulse = 0.82 + 0.18 * Math.sin(c.t * Math.PI * 2 * PULSE_HZ[state]);
    if (light.current) {
      light.current.color.copy(colour);
      light.current.intensity = lightIntensity * pulse * (state === 'blocked' ? 1.4 : 1);
    }
    // 24 fps is plenty for a face; the texture upload is the cost.
    if (c.t - c.lastDraw < 1 / 24 && c.lastDraw >= 0) return;
    c.lastDraw = c.t;
    draw(
      canvas,
      FACE_STYLE[state],
      FACE_COLOUR[state],
      open,
      pulse,
      eyes,
      surface.spec.corner,
      c.t,
    );
    texture.needsUpdate = true;
  });

  if (reducedMotion) return null;

  return (
    <group>
      <mesh geometry={geometry} material={material} frustumCulled={false} />
      {/* The face's own light, just in front of the panel, onto the chest. */}
      <pointLight
        ref={light}
        position={[centre.x, centre.y - 0.04, centre.z + 0.12]}
        distance={2.2}
        decay={2}
      />
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
  corner: number,
  t: number,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  // The visor's outline: everything outside it is transparent and the
  // material cuts it away, so the head shows through the corners.
  ctx.save();
  roundRect(ctx, 0, 0, w, h, corner * h);
  ctx.clip();
  // Near-black glass with a faint cool gradient.
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0c1024');
  bg.addColorStop(1, '#04050c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  // The state's colour washed up from below, and a rim of it along the
  // bottom edge: the colour is legible even when the eyes are not.
  const wash = ctx.createRadialGradient(w / 2, h * 0.95, h * 0.1, w / 2, h * 0.7, w * 0.7);
  wash.addColorStop(0, colour);
  wash.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.22 * pulse;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.55 + 0.35 * pulse;
  const rim = ctx.createLinearGradient(0, h * 0.86, 0, h);
  rim.addColorStop(0, 'rgba(0,0,0,0)');
  rim.addColorStop(1, colour);
  ctx.fillStyle = rim;
  ctx.fillRect(0, h * 0.86, w, h * 0.14);
  ctx.globalAlpha = 1;

  if (!eyes) {
    // A blank visor, by the owner's design: one horizontal scan line carries
    // colour and pulse, and nothing else.
    ctx.strokeStyle = colour;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.shadowColor = colour;
    ctx.shadowBlur = 16;
    ctx.globalAlpha = 0.55 + 0.45 * pulse;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h * 0.5);
    ctx.lineTo(w * 0.8, h * 0.5);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const ew = w * style.eye[0];
  const eh = h * style.eye[1];
  const cy = h * 0.47;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const cx = w * 0.5 + side * w * 0.21;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(side * style.tilt);
    ctx.shadowColor = colour;
    ctx.shadowBlur = 26 * pulse;
    ctx.fillStyle = colour;
    ctx.strokeStyle = colour;
    if (style.form === 'arc') {
      // Eyes closed in a smile: a thick arch.
      ctx.lineWidth = Math.max(6, ew * 0.32);
      ctx.beginPath();
      ctx.arc(0, eh * 0.35, ew * 0.5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = Math.max(3, ew * 0.12);
      ctx.beginPath();
      ctx.arc(0, eh * 0.35, ew * 0.5, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
    } else {
      const lid = style.form === 'lidded' ? 0.38 : 0;
      const oh = Math.max(eh * 0.08, eh * open);
      const r = style.form === 'slit' ? Math.min(ew, oh) * 0.5 : Math.min(ew, oh) * 0.5;
      if (lid > 0) {
        // Half-lidded: the upper part of the eye is under the lid.
        ctx.beginPath();
        ctx.rect(-ew, -oh / 2 + oh * lid, ew * 2, oh);
        ctx.clip();
      }
      roundRect(ctx, -ew / 2, -oh / 2, ew, oh, r);
      ctx.fill();
      // A lighter core so the eye reads as a lamp, not a sticker.
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      const kw = ew * 0.55;
      const kh = oh * 0.55;
      roundRect(
        ctx,
        -kw / 2,
        -kh / 2 + (lid > 0 ? oh * lid * 0.5 : 0),
        kw,
        kh,
        Math.min(kw, kh) / 2,
      );
      ctx.fill();
    }
    ctx.restore();
    if (style.brow) {
      // A heavy brow slanting down toward the centre.
      ctx.save();
      ctx.translate(cx, cy - eh * 1.4);
      ctx.rotate(side * style.tilt);
      ctx.strokeStyle = colour;
      ctx.shadowColor = colour;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-ew * 0.55, 0);
      ctx.lineTo(ew * 0.55, 0);
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.shadowColor = colour;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = colour;
  if (style.mouth === 'smile' || style.mouth === 'grin') {
    const grin = style.mouth === 'grin';
    ctx.lineWidth = grin ? 7 : 5;
    ctx.beginPath();
    ctx.arc(
      w * 0.5,
      h * (grin ? 0.62 : 0.66),
      w * (grin ? 0.12 : 0.07),
      Math.PI * 0.15,
      Math.PI * 0.85,
    );
    ctx.stroke();
  } else if (style.mouth === 'flat') {
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(w * 0.4, h * 0.76);
    ctx.lineTo(w * 0.6, h * 0.76);
    ctx.stroke();
  }
  if (style.scan) {
    // A bar sweeping beneath the eyes: thinking.
    const x = w * 0.5 + w * 0.3 * Math.sin(t * 2.6);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = colour;
    ctx.shadowBlur = 10;
    ctx.fillRect(x - w * 0.07, h * 0.73, w * 0.14, h * 0.05);
    ctx.globalAlpha = 1;
  }
  ctx.shadowBlur = 0;
  ctx.restore();
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
