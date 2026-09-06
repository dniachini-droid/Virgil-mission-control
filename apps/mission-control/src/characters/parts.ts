import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * Shared geometry and material vocabulary for the character family and their equipment.
 * Geometries are cached by signature so four characters and their parts share buffers; the
 * same cache is what an instancing pass would draw from later.
 */
const geoCache = new Map<string, THREE.BufferGeometry>();
function cached<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  const hit = geoCache.get(key);
  if (hit) return hit as T;
  const g = make();
  geoCache.set(key, g);
  return g;
}

export const G = {
  rbox: (w: number, h: number, d: number, r: number, seg = 3) =>
    cached(`rbox:${w},${h},${d},${r},${seg}`, () => new RoundedBoxGeometry(w, h, d, seg, r)),
  sphere: (r: number, ws = 24, hs = 16) =>
    cached(`sph:${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, ws, hs)),
  capsule: (r: number, len: number, cs = 4, rs = 12) =>
    cached(`cap:${r},${len},${cs},${rs}`, () => new THREE.CapsuleGeometry(r, len, cs, rs)),
  cyl: (rt: number, rb: number, h: number, seg = 20, open = false) =>
    cached(
      `cyl:${rt},${rb},${h},${seg},${open}`,
      () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open),
    ),
  torus: (r: number, t: number, rs = 10, ts = 40, arc = Math.PI * 2) =>
    cached(`tor:${r},${t},${rs},${ts},${arc}`, () => new THREE.TorusGeometry(r, t, rs, ts, arc)),
  cone: (r: number, h: number, seg = 16) =>
    cached(`cone:${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg)),
  plane: (w: number, h: number) => cached(`pl:${w},${h}`, () => new THREE.PlaneGeometry(w, h)),
  /** A squashed dome/drum profile: lathe of a rounded profile. */
  drum: (r: number, h: number, round: number, seg = 28) =>
    cached(`drum:${r},${h},${round},${seg}`, () => {
      const pts: THREE.Vector2[] = [];
      const n = 10;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        // Profile from bottom centre out to the rim, up the side, and back to the top centre.
        const a = t * Math.PI;
        const x = Math.sin(a) * r;
        const y = -h / 2 + t * h;
        const rr = Math.min(1, x / Math.max(1e-4, r));
        const round1 = 1 - (1 - rr) ** (2 / Math.max(0.2, round));
        pts.push(new THREE.Vector2(r * round1 * Math.sin(a) ** 0.35 + 0.0001, y));
      }
      return new THREE.LatheGeometry(pts, seg);
    }),
  /** A dished antenna or lens: a shallow spherical cap. */
  dish: (r: number, depth: number, seg = 20) =>
    cached(`dish:${r},${depth},${seg}`, () => {
      const R = (r * r + depth * depth) / (2 * depth);
      const theta = Math.asin(Math.min(1, r / R));
      const g = new THREE.SphereGeometry(R, seg, 10, 0, Math.PI * 2, 0, theta);
      g.translate(0, -R + depth, 0);
      return g;
    }),
};

/** Palette for the character family. Shells are light ceramic so the bots read against dark alloy stations. */
export const SHELL = {
  ivory: '#e9e4ea',
  cream: '#f2ece2',
  frost: '#dfe8f2',
  senior: '#f6f2ff',
  alloy: '#2a2740',
  dark: '#15121f',
  joint: '#3a3652',
  rubber: '#1e1b2b',
  brass: '#c9a24d',
};

const matCache = new Map<string, THREE.Material>();
function mat<T extends THREE.Material>(key: string, make: () => T): T {
  const hit = matCache.get(key);
  if (hit) return hit as T;
  const m = make();
  matCache.set(key, m);
  return m;
}

export const M = {
  /** Glossy ceramic shell with a hint of thin-film iridescence. */
  shell: (color: string) =>
    mat(
      `shell:${color}`,
      () =>
        new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.34,
          metalness: 0.05,
          clearcoat: 0.6,
          clearcoatRoughness: 0.25,
          iridescence: 0.18,
          iridescenceIOR: 1.3,
          envMapIntensity: 1.1,
        }),
    ),
  /** Dark brushed alloy for joints, frames and equipment. */
  alloy: (color = SHELL.alloy) =>
    mat(
      `alloy:${color}`,
      () =>
        new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.42,
          metalness: 0.85,
          envMapIntensity: 1.2,
        }),
    ),
  /** Matte rubber for boots, grips and cable sleeves. */
  rubber: (color = SHELL.rubber) =>
    mat(
      `rubber:${color}`,
      () => new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.05 }),
    ),
  /** Emissive accent: lamps, trim lines, instrument glows. Intensity is animated per part. */
  glow: (color: string, intensity = 1.6) =>
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 0.5,
      metalness: 0,
      toneMapped: false,
    }),
  /** Tinted glass for lenses and domes. */
  glass: (color = '#9ad0ff') =>
    mat(
      `glass:${color}`,
      () =>
        new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.08,
          metalness: 0,
          transmission: 0.6,
          thickness: 0.4,
          transparent: true,
          opacity: 0.9,
          envMapIntensity: 1.4,
        }),
    ),
};

/** Convenience: a mesh with shadows enabled and a name for debugging and picking. */
export function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name = '',
): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = true;
  m.receiveShadow = true;
  m.name = name;
  return m;
}

export function place<T extends THREE.Object3D>(
  o: T,
  x = 0,
  y = 0,
  z = 0,
  rx = 0,
  ry = 0,
  rz = 0,
): T {
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  return o;
}

export const damp = THREE.MathUtils.damp;
export const lerp = THREE.MathUtils.lerp;
