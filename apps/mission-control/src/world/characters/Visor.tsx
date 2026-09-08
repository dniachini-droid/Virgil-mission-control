import { createPortal, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { room } from '../room/palette.js';
import { buildVisorMeshes, faceAspect, type VisorMask } from './visorFit.js';

/**
 * A character's face, drawn per frame onto a canvas texture in the
 * pattern `ADR-0010` approved for labels — no font fetch, no `data:` URI,
 * nothing outside the document — and shown **on the head's own triangles**.
 *
 * V7 (`docs/process/PHASE_1_STYLISED_SPEC.md` §2.1): there is no panel.
 * `buildVisorMeshes` copies the triangles that carry the model's painted
 * visor out of the head, and the face material keeps only the painted
 * pixels, so the face starts and ends where the paint does and wraps
 * because it is the head's curve. Over it, the same triangles a few
 * millimetres out carry a layer of glossy glass, so the eyes sit under
 * the glass and a highlight travels across it as the camera moves. The
 * meshes go beside the head mesh under its parent (for the rigged Virgil,
 * bound to his skeleton); the face's light goes wherever the head's frame
 * is — his head joint, a figure's breathing group.
 *
 * What the face does: irregular blinking with a fast close and slow open,
 * a blink on every change of state, eye forms per state, a wash of the
 * state's colour up from below and a rim of it along the bottom so the
 * colour reads even when the eyes are a few pixels, and a point light in
 * the state's colour that lights the chest. V8 (§0.10.8) adds the
 * **flare**: the owner asked that when work arrives "an animation plays
 * on their face/eyes" before they turn to their screen, so on becoming
 * attentive the eyes widen sharply and a ring of the state's colour
 * bursts out of each and fades over `FLARE_SECONDS` — the face registers
 * the summons, then the body turns (`Figure.tsx`).
 *
 * **Reduced motion (KR-55).** V5 returned nothing under reduced motion,
 * which removed the face and its light entirely — Virgil showed a baked
 * grin, the Prover a blank dome — and lost the blocked-versus-passed
 * distinction `docs/art-direction/OPERATIONAL_ANIMATION.md` forbids losing.
 * The clock is frozen and a **static face** is drawn: eyes open, no
 * blink, no pulse, the state's form and colour, redrawn only when the state
 * changes. `faceAppearance` is the pure decision and is tested.
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

export type EyeForm = 'oval' | 'lidded' | 'arc' | 'slit';
export type Mouth = 'none' | 'smile' | 'grin' | 'flat';

export interface FaceStyle {
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

export const FACE_STYLE: Record<FaceState, FaceStyle> = {
  idle: { form: 'oval', eye: [0.16, 0.42], tilt: 0, mouth: 'smile', brow: false, scan: false },
  attentive: {
    form: 'oval',
    eye: [0.18, 0.5],
    tilt: -0.06,
    mouth: 'none',
    brow: false,
    scan: false,
  },
  working: {
    form: 'lidded',
    eye: [0.19, 0.5],
    tilt: 0,
    mouth: 'none',
    brow: false,
    scan: true,
  },
  passed: { form: 'arc', eye: [0.18, 0.32], tilt: 0, mouth: 'grin', brow: false, scan: false },
  blocked: {
    form: 'slit',
    eye: [0.21, 0.12],
    tilt: -0.32,
    mouth: 'flat',
    brow: true,
    scan: false,
  },
};

export interface FaceAppearance {
  style: FaceStyle;
  colour: string;
  /** 0 closed .. 1 open. */
  open: number;
  /** The glow's pulse, 0.64 .. 1. */
  pulse: number;
  /** The summons registering: 1 at the moment of becoming attentive, 0 once it has passed. */
  flare: number;
  /** Whether the canvas needs drawing this frame. */
  draw: boolean;
}

/** How long the flare takes to pass. `Figure.tsx` waits for it before the turn. */
export const FLARE_SECONDS = 0.9;

export interface FaceClock {
  t: number;
  nextBlink: number;
  blinkStart: number;
  half: boolean;
  lastDraw: number;
  /** The state last drawn, so a static face is redrawn only on a change. */
  drawnState: FaceState | null;
  /** When the state last changed, on this clock; the flare runs from it. */
  stateAt?: number;
}

/**
 * What the face looks like this frame. Pure, so a test can hold it: with
 * reduced motion the answer does not depend on time, the eyes are open, the
 * pulse is flat, and the state's form and colour are still the state's —
 * a blocked face and a passed face stay different.
 */
export function faceAppearance(
  state: FaceState,
  reducedMotion: boolean,
  clock: FaceClock,
  delta: number,
  random: () => number = Math.random,
): FaceAppearance {
  const style = FACE_STYLE[state];
  const colour = FACE_COLOUR[state];
  if (reducedMotion) {
    const draw = clock.drawnState !== state;
    clock.drawnState = state;
    return { style, colour, open: 1, pulse: 1, flare: 0, draw };
  }
  if (clock.drawnState !== state) clock.stateAt = clock.t;
  clock.t += delta;
  let open = 1;
  if (state !== 'blocked') {
    if (clock.t >= clock.nextBlink) {
      clock.blinkStart = clock.t;
      clock.half = random() < 0.18;
      const [lo, hi] = BLINK_GAP[state];
      // One blink in four is a double.
      clock.nextBlink = clock.t + (random() < 0.25 ? 0.36 : lo + random() * (hi - lo));
    }
    const p = (clock.t - clock.blinkStart) / 0.26;
    if (clock.blinkStart >= 0 && p < 1) {
      // Fast close, short hold, slower open.
      const lid = p < 0.3 ? p / 0.3 : p < 0.45 ? 1 : 1 - (p - 0.45) / 0.55;
      open = 1 - lid * (clock.half ? 0.55 : 1);
    }
  }
  const pulse = 0.82 + 0.18 * Math.sin(clock.t * Math.PI * 2 * PULSE_HZ[state]);
  // The flare: only on becoming attentive, and only while it lasts.
  const sinceState = clock.t - (clock.stateAt ?? clock.t);
  const flare =
    state === 'attentive' && sinceState < FLARE_SECONDS ? 1 - sinceState / FLARE_SECONDS : 0;
  // 24 fps is plenty for a face; the texture upload is the cost — but the
  // flare is drawn every frame while it lasts.
  const draw = clock.lastDraw < 0 || clock.t - clock.lastDraw >= 1 / 24 || flare > 0;
  if (draw) clock.lastDraw = clock.t;
  clock.drawnState = state;
  return { style, colour, open, pulse, flare, draw };
}

/** Where a visor is: the head, the mask that names its triangles, and the frames things go in. */
export interface VisorAnchor {
  /** The head mesh whose triangles carry the visor. */
  head: THREE.Mesh;
  mask: VisorMask;
  /** The head's vertices in the mask's frame, for the face's UVs. */
  fitPositions: ArrayLike<number>;
  /** Metres per unit of the head geometry's own frame. */
  metresPerUnit: number;
  /** The head's own base-colour texture: the paint the face is masked to. */
  paint: THREE.Texture;
  /** Where the visor meshes go: beside the head mesh, under its parent. */
  meshParent: THREE.Object3D;
  /** Where the light goes: an object whose frame is the mask's frame. */
  lightParent: THREE.Object3D;
}

export function Visor({
  state = 'idle',
  anchor,
  lightIntensity = 1.6,
  eyes = true,
}: {
  state?: FaceState;
  anchor: VisorAnchor;
  lightIntensity?: number;
  /** False for a character whose visor the owner made blank: colour and pulse only. */
  eyes?: boolean;
}) {
  const { reducedMotion } = useSettings();
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = Math.max(64, Math.round(512 / faceAspect(anchor.mask)));
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return { canvas, texture };
  }, [anchor.mask]);
  // The one way a visor is made (KR-57): its geometry, materials, culling
  // and visibility are set in `buildVisorMeshes` and tested on the objects.
  const visor = useMemo(
    () =>
      buildVisorMeshes(
        anchor.head,
        anchor.mask,
        anchor.fitPositions,
        anchor.metresPerUnit,
        texture,
        anchor.paint,
      ),
    [anchor, texture],
  );
  const light = useRef<THREE.PointLight>(null);
  const clock = useRef<FaceClock>({
    t: 0,
    nextBlink: 1.5,
    blinkStart: -1,
    half: false,
    lastDraw: -1,
    drawnState: null,
  });
  const colour = useMemo(() => new THREE.Color(FACE_COLOUR[state]), [state]);

  // A blink on every change of state: the face registers the change.
  useEffect(() => {
    const c = clock.current;
    if (state !== 'blocked') c.blinkStart = c.t;
  }, [state]);

  useFrame((_, delta) => {
    const c = clock.current;
    const look = faceAppearance(state, reducedMotion, c, Math.min(delta, 0.1));
    if (light.current) {
      light.current.color.copy(colour);
      light.current.intensity = lightIntensity * look.pulse * (state === 'blocked' ? 1.4 : 1);
    }
    if (!look.draw) return;
    drawFace(canvas, look.style, look.colour, look.open, look.pulse, eyes, c.t, look.flare);
    texture.needsUpdate = true;
  });

  return (
    <>
      {createPortal(
        <>
          <primitive object={visor.face} />
          <primitive object={visor.glass} />
        </>,
        anchor.meshParent,
      )}
      {createPortal(
        // The face's own light, just in front of the glass, onto the chest.
        <pointLight
          ref={light}
          position={[visor.lightAt.x, visor.lightAt.y, visor.lightAt.z]}
          distance={2.2}
          decay={2}
        />,
        anchor.lightParent,
      )}
    </>
  );
}

/**
 * Draws the face into the whole canvas. There is no outline here: the
 * face is shown only where the head's own paint is the visor's
 * (`visorFit.ts`), so the paint is the outline.
 */
export function drawFace(
  canvas: HTMLCanvasElement,
  style: FaceStyle,
  colour: string,
  open: number,
  pulse: number,
  eyes: boolean,
  t: number,
  flare = 0,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.save();
  // Near-black glass, flat: no gradient in this style. A little darker at
  // the edges, so the eyes sit in a depth rather than on a sticker.
  ctx.fillStyle = '#070a18';
  ctx.fillRect(0, 0, w, h);
  const depth = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.75);
  depth.addColorStop(0, 'rgba(0,0,0,0)');
  depth.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = depth;
  ctx.fillRect(0, 0, w, h);
  // The state's colour washed up from below, and a rim of it along the
  // bottom edge: the colour is legible even when the eyes are not.
  const wash = ctx.createRadialGradient(w / 2, h * 0.95, h * 0.1, w / 2, h * 0.7, w * 0.7);
  wash.addColorStop(0, colour);
  wash.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.22 * pulse;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.6 + 0.3 * pulse;
  ctx.fillStyle = colour;
  ctx.fillRect(0, h * 0.9, w, h * 0.1);
  ctx.globalAlpha = 1;

  if (!eyes) {
    // A blank visor, by the owner's design: one horizontal scan line carries
    // colour and pulse, and nothing else.
    ctx.strokeStyle = colour;
    ctx.lineWidth = 8;
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

  // The flare widens the eyes sharply at first and lets them relax back.
  const widen = 1 + 0.42 * flare * flare;
  const ew = w * style.eye[0] * widen;
  const eh = h * style.eye[1] * widen;
  const cy = h * 0.47;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const cx = w * 0.5 + side * w * 0.21;
    if (flare > 0) {
      // A ring bursting out of each eye and fading as it grows: the
      // summons registering before the body turns.
      const burst = 1 - flare;
      ctx.save();
      ctx.strokeStyle = colour;
      ctx.shadowColor = colour;
      ctx.shadowBlur = 18;
      ctx.globalAlpha = 0.85 * flare;
      ctx.lineWidth = Math.max(4, 12 * flare);
      ctx.beginPath();
      ctx.ellipse(cx, cy, ew * (0.6 + 1.6 * burst), eh * (0.6 + 1.6 * burst), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(side * style.tilt);
    ctx.shadowColor = colour;
    ctx.shadowBlur = 26 * pulse;
    ctx.fillStyle = colour;
    ctx.strokeStyle = colour;
    if (style.form === 'arc') {
      // Eyes closed in a smile: a thick arch.
      ctx.lineWidth = Math.max(8, ew * 0.36);
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
      const r = Math.min(ew, oh) * 0.5;
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
      ctx.lineWidth = 11;
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
    ctx.lineWidth = grin ? 9 : 7;
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
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(w * 0.4, h * 0.76);
    ctx.lineTo(w * 0.6, h * 0.76);
    ctx.stroke();
  }
  if (style.scan) {
    // A bar stepping beneath the eyes: thinking. Stepped, not eased.
    const step = Math.floor(t * 5) % 6;
    const x = w * 0.2 + ((w * 0.6) / 5) * step;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = colour;
    ctx.shadowBlur = 10;
    ctx.fillRect(x - w * 0.07, h * 0.73, w * 0.14, h * 0.06);
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
