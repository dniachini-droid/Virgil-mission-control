import * as THREE from 'three';
import { room } from './palette.js';

/**
 * The floor's inlay — the navy disc and gold rings round the console's
 * foot, and the four-point star from the approved reference — drawn as
 * **one texture on one surface**, never as separate coplanar meshes.
 *
 * V6 built the inlay from a disc, three rings and a star laid a millimetre
 * apart over the floor, each with the same `polygonOffset`; on the owner's
 * phone "the gold circles on the floor flicker". That is z-fighting: at
 * twelve metres a millimetre is inside the depth buffer's resolution on a
 * mobile GPU, so the two surfaces trade places from frame to frame. Drawing
 * everything into one canvas and mapping it onto the floor removes the
 * second surface altogether, so there is nothing left to fight — the
 * repair the brief named as "merging them into one material".
 *
 * Everything here is pure canvas drawing over a metres-to-pixels mapping,
 * so `test/floor.test.ts` can check the drawing without a renderer: the
 * inlay's colours land where the layout says, and nothing else is drawn
 * over the floor at runtime.
 */
export interface FloorGraphicSpec {
  /** The floor's extent in metres: a square of side `size` centred on `centre` (x, z). */
  centre: readonly [number, number];
  size: number;
  /** Where the console's foot is: the rings are drawn round it. */
  console: readonly [number, number];
  /** Where the star is. */
  star: readonly [number, number];
  /** Canvas pixels across the whole floor. */
  pixels: number;
}

/** The inlay's dimensions in metres, shared with the test. */
export const INLAY = {
  navyRadius: 2.35,
  rings: [
    { r: 1.95, w: 0.12 },
    { r: 2.35, w: 0.16 },
    { r: 2.72, w: 0.1 },
  ],
  starOuter: 1.05,
  starInner: 0.24,
  starDisc: 1.2,
  starRing: { r: 1.2, w: 0.11 },
} as const;

/** A metre on the floor to a pixel on the canvas: x → u, z → v (top of the canvas is −z). */
export function floorToPixel(spec: FloorGraphicSpec, x: number, z: number): [number, number] {
  const k = spec.pixels / spec.size;
  return [(x - spec.centre[0] + spec.size / 2) * k, (z - spec.centre[1] + spec.size / 2) * k];
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number, inner: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    // Turned 45°, as the V6 inlay was, so the points run along the axes.
    const a = (i / 8) * Math.PI * 2 + Math.PI / 4;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Draws the whole floor graphic into `ctx`, which must be `spec.pixels` square. */
export function drawFloorGraphic(ctx: CanvasRenderingContext2D, spec: FloorGraphicSpec) {
  const k = spec.pixels / spec.size;
  ctx.clearRect(0, 0, spec.pixels, spec.pixels);
  ctx.fillStyle = room.surface.cream;
  ctx.fillRect(0, 0, spec.pixels, spec.pixels);

  const [cx, cy] = floorToPixel(spec, spec.console[0], spec.console[1]);
  ctx.fillStyle = room.surface.navy;
  ctx.beginPath();
  ctx.arc(cx, cy, INLAY.navyRadius * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = room.surface.gold;
  for (const ring of INLAY.rings) {
    ctx.lineWidth = ring.w * k;
    ctx.beginPath();
    ctx.arc(cx, cy, (ring.r + ring.w / 2) * k, 0, Math.PI * 2);
    ctx.stroke();
  }

  const [sx, sy] = floorToPixel(spec, spec.star[0], spec.star[1]);
  ctx.fillStyle = room.surface.navy;
  ctx.beginPath();
  ctx.arc(sx, sy, INLAY.starDisc * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = room.surface.gold;
  star(ctx, sx, sy, INLAY.starOuter * k, INLAY.starInner * k);
  ctx.fill();
  ctx.strokeStyle = room.surface.gold;
  ctx.lineWidth = INLAY.starRing.w * k;
  ctx.beginPath();
  ctx.arc(sx, sy, (INLAY.starRing.r + INLAY.starRing.w / 2) * k, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * The floor texture, drawn once. `flipY` stays true (a plain canvas, not a
 * glTF image), so a plane rotated −90° about x maps the canvas's top to −z,
 * as `floorToPixel` assumes.
 */
export function createFloorTexture(spec: FloorGraphicSpec): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = spec.pixels;
  canvas.height = spec.pixels;
  const ctx = canvas.getContext('2d');
  if (ctx) drawFloorGraphic(ctx, spec);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}
