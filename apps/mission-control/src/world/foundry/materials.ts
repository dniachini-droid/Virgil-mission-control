import * as THREE from 'three';
import { M } from '../../characters/parts.js';

/**
 * Station materials and the drawn floor plating. Nothing here is a downloaded texture: the
 * plating is drawn to a canvas at boot (neutral grey so the material colour multiplies through)
 * and its normal map is derived from the same height field, which is what makes a large flat
 * deck read as bolted metal rather than wallpaper under one key light.
 */
let plating: { map: THREE.CanvasTexture; normal: THREE.CanvasTexture } | null = null;

export function platingTextures(size = 1024) {
  if (plating) return plating;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  // Height field: panels with recessed seams and raised bolts.
  ctx.fillStyle = '#8c8c8c';
  ctx.fillRect(0, 0, size, size);
  const cols = 4;
  const rows = 4;
  const pw = size / cols;
  const ph = size / rows;
  const seam = size * 0.012;
  ctx.fillStyle = '#5a5a5a';
  for (let i = 0; i <= cols; i++) ctx.fillRect(i * pw - seam / 2, 0, seam, size);
  for (let j = 0; j <= rows; j++) ctx.fillRect(0, j * ph - seam / 2, size, seam);
  // Half the panels carry a lighter inset plate so the deck is not one repeating tile.
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if ((i + j) % 2 === 0) continue;
      ctx.fillStyle = '#979797';
      const inset = pw * 0.12;
      ctx.beginPath();
      ctx.roundRect(i * pw + inset, j * ph + inset, pw - inset * 2, ph - inset * 2, pw * 0.05);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#b0b0b0';
  const boltR = size * 0.006;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      for (const [ox, oy] of [
        [0.08, 0.08],
        [0.92, 0.08],
        [0.08, 0.92],
        [0.92, 0.92],
      ]) {
        ctx.beginPath();
        ctx.arc(i * pw + (ox ?? 0) * pw, j * ph + (oy ?? 0) * ph, boltR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  // Normal map by Sobel over the height field.
  const img = ctx.getImageData(0, 0, size, size).data;
  const n = document.createElement('canvas');
  n.width = size;
  n.height = size;
  const nctx = n.getContext('2d');
  if (!nctx) throw new Error('2d context unavailable');
  const out = nctx.createImageData(size, size);
  const h = (x: number, y: number) =>
    (img[(((y + size) % size) * size + ((x + size) % size)) * 4] ?? 0) / 255;
  const strength = 2.2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx =
        h(x + 1, y - 1) +
        2 * h(x + 1, y) +
        h(x + 1, y + 1) -
        (h(x - 1, y - 1) + 2 * h(x - 1, y) + h(x - 1, y + 1));
      const dy =
        h(x - 1, y + 1) +
        2 * h(x, y + 1) +
        h(x + 1, y + 1) -
        (h(x - 1, y - 1) + 2 * h(x, y - 1) + h(x + 1, y - 1));
      const nx = -dx * strength;
      const ny = -dy * strength;
      const len = Math.hypot(nx, ny, 1);
      const o = (y * size + x) * 4;
      out.data[o] = ((nx / len) * 0.5 + 0.5) * 255;
      out.data[o + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      out.data[o + 2] = (1 / len) * 0.5 * 255 + 127;
      out.data[o + 3] = 255;
    }
  }
  nctx.putImageData(out, 0, 0);
  const normal = new THREE.CanvasTexture(n);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  normal.colorSpace = THREE.NoColorSpace;
  normal.anisotropy = 8;
  plating = { map, normal };
  return plating;
}

export function deckMaterial(color = '#1c1a2e', repeat = 3) {
  const { map, normal } = platingTextures();
  const m = new THREE.MeshPhysicalMaterial({
    color,
    map,
    normalMap: normal,
    normalScale: new THREE.Vector2(0.6, 0.6),
    metalness: 0.78,
    roughness: 0.48,
    envMapIntensity: 0.9,
  });
  map.repeat.set(repeat, repeat);
  normal.repeat.set(repeat, repeat);
  return m;
}

const structural = (color: string, metalness: number, roughness: number) => {
  const key = `struct:${color}:${metalness}:${roughness}`;
  return matOnce(
    key,
    () => new THREE.MeshPhysicalMaterial({ color, metalness, roughness, envMapIntensity: 0.8 }),
  );
};
const structCache = new Map<string, THREE.MeshPhysicalMaterial>();
function matOnce(key: string, make: () => THREE.MeshPhysicalMaterial) {
  const hit = structCache.get(key);
  if (hit) return hit;
  const m = make();
  structCache.set(key, m);
  return m;
}

export const ST = {
  /** Station alloys: low metalness so coloured lights tint them gently instead of turning them gold. */
  alloy: () => structural('#2c2942', 0.55, 0.5),
  dark: () => structural('#14111f', 0.5, 0.62),
  frame: () => structural('#3a3756', 0.45, 0.55),
  ceramic: () => M.shell('#d9d3e6'),
  ceramicWarm: () => M.shell('#efe6d6'),
  /** Iridescent hull for the capsule and hero mechanisms. */
  hull: () =>
    new THREE.MeshPhysicalMaterial({
      color: '#241f3d',
      metalness: 0.9,
      roughness: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      iridescence: 0.75,
      iridescenceIOR: 1.4,
      iridescenceThicknessRange: [120, 480],
      envMapIntensity: 1.5,
    }),
  brass: () => M.alloy('#c9a24d'),
  gold: () => M.alloy('#f5c451'),
  glass: (c = '#9ad0ff') => M.glass(c),
  glow: (c: string, i = 1.5) => M.glow(c, i),
  cable: () => M.rubber('#221f30'),
};
