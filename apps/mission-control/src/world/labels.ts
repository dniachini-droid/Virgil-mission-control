import * as THREE from 'three';

const cache = new Map<string, THREE.CanvasTexture>();

export interface LabelOptions {
  size?: number;
  fg?: string;
  bg?: string;
  border?: string;
  mono?: boolean;
  pad?: number;
}

/** Text as a canvas texture: self-contained, no font downloads, crisp at label sizes. */
export function labelTexture(
  text: string,
  opts: LabelOptions = {},
): { texture: THREE.CanvasTexture; aspect: number } {
  const key = JSON.stringify([text, opts]);
  const hit = cache.get(key);
  const size = opts.size ?? 40;
  const pad = opts.pad ?? 18;
  const font = `${opts.mono === false ? '500' : '600'} ${size}px ${opts.mono === false ? "'Inter', 'Segoe UI', system-ui, sans-serif" : "'IBM Plex Mono', 'JetBrains Mono', ui-monospace, Menlo, monospace"}`;
  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) throw new Error('2d context unavailable');
  measure.font = font;
  const w = Math.ceil(measure.measureText(text).width) + pad * 2;
  const h = Math.ceil(size * 1.5) + pad;
  if (hit) return { texture: hit, aspect: w / h };
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  ctx.fillStyle = opts.bg ?? 'rgba(10,7,22,0.88)';
  ctx.beginPath();
  ctx.roundRect(1, 1, w - 2, h - 2, 6);
  ctx.fill();
  if (opts.border) {
    ctx.strokeStyle = opts.border;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.font = font;
  ctx.fillStyle = opts.fg ?? '#efe9ff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, pad, h / 2 + 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  cache.set(key, texture);
  return { texture, aspect: w / h };
}
