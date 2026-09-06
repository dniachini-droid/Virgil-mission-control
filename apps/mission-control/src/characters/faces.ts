import * as THREE from 'three';

/**
 * Screen-face expression atlas: sixteen original glyphs drawn once into a 4×4 canvas as a
 * white-on-black mask. The screen shader colours the mask per character at draw time, so one
 * texture serves every role with its own eye colour and glow.
 *
 * The glyph language is a robot instrument screen, not an emoji: rounded-rectangle LED eyes,
 * an equaliser-bar mouth, and instrument glyphs (reticle, prohibition ring, seal hexagon, route
 * arrows, warning triangle) for operational states. Expressions change only with authenticated
 * steps and the character's own blink clock.
 */
export const FACE_COLS = 4;
export const FACE_ROWS = 4;

export const FACE = {
  rest: 0,
  blink: 1,
  focus: 2,
  scan: 3,
  think: 4,
  wait: 5,
  alert: 6,
  refuse: 7,
  pass: 8,
  finding: 9,
  seal: 10,
  route: 11,
  boot: 12,
  calm: 13,
  warn: 14,
  off: 15,
} as const;
export type FaceId = (typeof FACE)[keyof typeof FACE];

/** Atlas UV offset for a frame (bottom-left origin, as the shader samples it). */
export function faceFrameOffset(frame: number): [number, number] {
  return [(frame % FACE_COLS) / FACE_COLS, 1 - (Math.floor(frame / FACE_COLS) + 1) / FACE_ROWS];
}

type Ctx = CanvasRenderingContext2D;

const EYE_L = 0.31;
const EYE_R = 0.69;
const EYE_Y = 0.4;
const MOUTH_Y = 0.72;

function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, Math.min(r, w / 2, h / 2));
  ctx.fill();
}
function bar(ctx: Ctx, x: number, y: number, w: number, h: number) {
  rrect(ctx, x, y, w, h, 0.02);
}
/** Default eye: a rounded LED block with a small dark highlight notch. */
function eye(ctx: Ctx, x: number, y: number, w = 0.21, h = 0.25, notch = true) {
  rrect(ctx, x, y, w, h, 0.05);
  if (notch) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    rrect(ctx, x + w * 0.22, y - h * 0.25, w * 0.22, h * 0.2, 0.02);
    ctx.restore();
  }
}
function ring(ctx: Ctx, x: number, y: number, r: number, width: number) {
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}
/** Equaliser mouth: three short vertical bars, heights in 0..1 of the max. */
function equaliser(ctx: Ctx, heights: [number, number, number], y = MOUTH_Y) {
  const xs = [0.42, 0.5, 0.58];
  heights.forEach((h, i) => bar(ctx, xs[i] ?? 0.5, y, 0.05, 0.035 + h * 0.12));
}
function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, w: number) {
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

const DRAW: Record<keyof typeof FACE, (ctx: Ctx) => void> = {
  rest(ctx) {
    eye(ctx, EYE_L, EYE_Y);
    eye(ctx, EYE_R, EYE_Y);
    equaliser(ctx, [0.35, 0.55, 0.35]);
  },
  blink(ctx) {
    bar(ctx, EYE_L, EYE_Y + 0.03, 0.19, 0.035);
    bar(ctx, EYE_R, EYE_Y + 0.03, 0.19, 0.035);
    equaliser(ctx, [0.35, 0.55, 0.35]);
  },
  // Working: eyes narrowed to determined wide blocks with an inward brow tilt.
  focus(ctx) {
    ctx.save();
    ctx.translate(EYE_L, EYE_Y);
    ctx.rotate(-0.18);
    eye(ctx, 0, 0, 0.2, 0.11, false);
    ctx.restore();
    ctx.save();
    ctx.translate(EYE_R, EYE_Y);
    ctx.rotate(0.18);
    eye(ctx, 0, 0, 0.2, 0.11, false);
    ctx.restore();
    equaliser(ctx, [0.7, 0.4, 0.7]);
  },
  // Scanning: reticle rings with cross ticks; the Prover's working face.
  scan(ctx) {
    for (const x of [EYE_L, EYE_R]) {
      ring(ctx, x, EYE_Y, 0.085, 0.032);
      rrect(ctx, x, EYE_Y, 0.035, 0.035, 0.01);
      line(ctx, x - 0.13, EYE_Y, x - 0.1, EYE_Y, 0.02);
      line(ctx, x + 0.1, EYE_Y, x + 0.13, EYE_Y, 0.02);
    }
    equaliser(ctx, [0.2, 0.9, 0.2]);
  },
  think(ctx) {
    eye(ctx, EYE_L - 0.03, EYE_Y - 0.04, 0.15, 0.17);
    eye(ctx, EYE_R - 0.03, EYE_Y - 0.04, 0.15, 0.17);
    equaliser(ctx, [0.15, 0.15, 0.6]);
  },
  // Waiting on a dependency or the owner: big open eyes with a bright notch, a small ring mouth.
  wait(ctx) {
    eye(ctx, EYE_L, EYE_Y, 0.2, 0.25);
    eye(ctx, EYE_R, EYE_Y, 0.2, 0.25);
    ring(ctx, 0.5, MOUTH_Y, 0.04, 0.03);
  },
  alert(ctx) {
    eye(ctx, EYE_L, EYE_Y, 0.19, 0.27, false);
    eye(ctx, EYE_R, EYE_Y, 0.19, 0.27, false);
    bar(ctx, EYE_L, EYE_Y - 0.2, 0.2, 0.03);
    bar(ctx, EYE_R, EYE_Y - 0.2, 0.2, 0.03);
    bar(ctx, 0.5, MOUTH_Y, 0.22, 0.05);
  },
  // Refusal: eyes flatten to lines and the prohibition glyph (ring with a slash) takes the mouth.
  refuse(ctx) {
    bar(ctx, EYE_L, EYE_Y, 0.2, 0.04);
    bar(ctx, EYE_R, EYE_Y, 0.2, 0.04);
    ring(ctx, 0.5, MOUTH_Y - 0.02, 0.075, 0.03);
    line(ctx, 0.45, MOUTH_Y - 0.07, 0.55, MOUTH_Y + 0.03, 0.03);
  },
  // A recorded pass: rest eyes with a check mark.
  pass(ctx) {
    eye(ctx, EYE_L, EYE_Y);
    eye(ctx, EYE_R, EYE_Y);
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(0.41, MOUTH_Y - 0.01);
    ctx.lineTo(0.48, MOUTH_Y + 0.05);
    ctx.lineTo(0.6, MOUTH_Y - 0.07);
    ctx.stroke();
  },
  // A finding pinned: one eye magnified to a lens ring. The Keeper's signature.
  finding(ctx) {
    eye(ctx, EYE_L, EYE_Y, 0.15, 0.17);
    ring(ctx, EYE_R, EYE_Y, 0.11, 0.035);
    rrect(ctx, EYE_R, EYE_Y, 0.06, 0.07, 0.02);
    equaliser(ctx, [0.3, 0.3, 0.3]);
  },
  // Sealing: eyes bright lines, mouth a hexagon seal.
  seal(ctx) {
    bar(ctx, EYE_L, EYE_Y, 0.2, 0.06);
    bar(ctx, EYE_R, EYE_Y, 0.2, 0.06);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const px = 0.5 + Math.cos(a) * 0.07;
      const py = MOUTH_Y - 0.01 + Math.sin(a) * 0.07;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  },
  // Route opening: both eyes become arrows pointing the same way. Virgil's conducting face.
  route(ctx) {
    for (const x of [EYE_L, EYE_R]) {
      ctx.beginPath();
      ctx.moveTo(x - 0.1, EYE_Y - 0.08);
      ctx.lineTo(x + 0.06, EYE_Y);
      ctx.lineTo(x - 0.1, EYE_Y + 0.08);
      ctx.lineTo(x - 0.05, EYE_Y);
      ctx.closePath();
      ctx.fill();
    }
    equaliser(ctx, [0.5, 0.5, 0.5]);
  },
  boot(ctx) {
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 3; i++) bar(ctx, 0.5, 0.3 + i * 0.08, 0.6, 0.025);
    ctx.globalAlpha = 1;
    bar(ctx, 0.36, 0.66, 0.32, 0.05);
    ctx.globalAlpha = 0.3;
    bar(ctx, 0.66, 0.66, 0.28, 0.05);
    ctx.globalAlpha = 1;
  },
  // Calm attention: half-lidded eyes (flat top), soft mouth.
  calm(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, EYE_Y - 0.03, 1, 0.3);
    ctx.clip();
    eye(ctx, EYE_L, EYE_Y, 0.17, 0.2, false);
    eye(ctx, EYE_R, EYE_Y, 0.17, 0.2, false);
    ctx.restore();
    equaliser(ctx, [0.3, 0.4, 0.3]);
  },
  // Warning: tall eyes and a triangle glyph.
  warn(ctx) {
    eye(ctx, EYE_L, EYE_Y, 0.16, 0.26, false);
    eye(ctx, EYE_R, EYE_Y, 0.16, 0.26, false);
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(0.5, MOUTH_Y - 0.09);
    ctx.lineTo(0.58, MOUTH_Y + 0.05);
    ctx.lineTo(0.42, MOUTH_Y + 0.05);
    ctx.closePath();
    ctx.stroke();
    bar(ctx, 0.5, MOUTH_Y + 0.0, 0.02, 0.05);
  },
  off(ctx) {
    rrect(ctx, 0.5, 0.52, 0.03, 0.03, 0.01);
  },
};

let cached: THREE.CanvasTexture | null = null;

/** Build (once) the mask atlas. Requires a 2D canvas; only called from the renderer. */
export function faceAtlas(size = 1024): THREE.CanvasTexture {
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  const cell = size / FACE_COLS;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  for (const [name, index] of Object.entries(FACE) as Array<[keyof typeof FACE, number]>) {
    ctx.save();
    ctx.translate((index % FACE_COLS) * cell, Math.floor(index / FACE_COLS) * cell);
    ctx.scale(cell, cell);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    DRAW[name](ctx);
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  cached = texture;
  return texture;
}
