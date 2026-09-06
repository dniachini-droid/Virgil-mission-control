import * as THREE from 'three';
import { G, mesh, place } from '../../characters/parts.js';
import { L } from './layout.js';
import { deckMaterial, ST } from './materials.js';
import type { BayState } from './state.js';

/**
 * The place: main deck, the Keeper's separate platform across a real gap, station hull walls
 * and gantries behind, and distant harmless transports. Nothing here carries operational meaning
 * except the gap, which is the physical separation the review policy requires.
 */
export function buildBackdrop() {
  const group = new THREE.Group();
  group.name = 'backdrop';
  const deck = deckMaterial('#1c1a2e', 4);
  const deckKeeper = deckMaterial('#1a1f2e', 2);

  // Main deck: a wide plate from the bench to the gap, with a kerb of cyan seam at the bay edge.
  const main = mesh(new THREE.BoxGeometry(22, 0.6, 16), deck, 'main-deck');
  place(main, -1.4, -0.3, 0);
  group.add(main);
  const mainEdge = mesh(G.rbox(22.2, 0.08, 16.2, 0.03), ST.frame(), 'main-edge');
  place(mainEdge, -1.4, -0.62, 0);
  group.add(mainEdge);
  const bayKerb = mesh(G.rbox(9.6, 0.03, 0.06, 0.01), ST.glow('#5ef2ff', 0.7), 'bay-kerb');
  place(bayKerb, -4.4, 0.02, 5.4);
  group.add(bayKerb);
  const bayKerb2 = mesh(G.rbox(0.06, 0.03, 8.4, 0.01), ST.glow('#5ef2ff', 0.7), 'bay-kerb-2');
  place(bayKerb2, 0.4, 0.02, 1.2);
  group.add(bayKerb2);
  // Under-deck structure visible through the gap: dark trusses and a soft glow from below.
  for (let i = 0; i < 5; i++) {
    const truss = mesh(G.rbox(0.25, 1.6, 0.25, 0.03), ST.frame(), 'truss');
    place(truss, L.gapStart - 0.2, -1.4, -6 + i * 3);
    group.add(truss);
    const truss2 = mesh(G.rbox(0.25, 1.6, 0.25, 0.03), ST.frame(), 'truss');
    place(truss2, L.gapEnd + 0.2, -1.4, -6 + i * 3);
    group.add(truss2);
  }
  const gapGlow = new THREE.Mesh(
    G.plane(2.0, 16),
    new THREE.MeshBasicMaterial({
      color: '#3b1f7a',
      transparent: true,
      opacity: 0.55,
      toneMapped: false,
    }),
  );
  place(gapGlow, (L.gapStart + L.gapEnd) / 2, -2.4, 0, -Math.PI / 2);
  group.add(gapGlow);
  // Keeper platform: octagonal, its own kerb in evidence ice, separated by the gap.
  const keeperDeck = mesh(G.cyl(4.8, 5.1, 0.6, 8), deckKeeper, 'keeper-deck');
  place(keeperDeck, L.keeper.x, -0.3, L.keeper.z, 0, Math.PI / 8);
  group.add(keeperDeck);
  const keeperKerb = mesh(G.torus(4.8, 0.03, 6, 8), ST.glow('#bfe9ff', 0.6), 'keeper-kerb');
  place(keeperKerb, L.keeper.x, 0.02, L.keeper.z, Math.PI / 2, 0, Math.PI / 8);
  group.add(keeperKerb);
  // Gap marker plates on both sides: the review policy made physical.
  const gapPlate = mesh(G.rbox(0.9, 0.04, 2.2, 0.01), ST.glow('#7c7790', 0.5), 'gap-plate');
  place(gapPlate, L.gapStart - 0.5, 0.01, 0);
  group.add(gapPlate);
  const gapPlate2 = mesh(G.rbox(0.9, 0.04, 2.2, 0.01), ST.glow('#7c7790', 0.5), 'gap-plate');
  place(gapPlate2, L.gapEnd + 0.5, 0.01, 0);
  group.add(gapPlate2);
  // Rear hull: a tall curved wall with ribs and window strips, behind the control centre.
  const wall = mesh(G.cyl(24, 24.6, 5.2, 48, true), ST.dark(), 'hull-wall');
  (wall.material as THREE.Material).side = THREE.BackSide;
  place(wall, 2.6, 2.6, 6);
  group.add(wall);
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * 0.62 + (i / 8) * Math.PI * 0.76;
    const x = 2.6 + Math.cos(a) * 23.4;
    const z = 6 + Math.sin(a) * 23.4;
    const rib = mesh(G.rbox(0.5, 6.4, 0.5, 0.05), ST.frame(), 'rib');
    place(rib, x, 3.2, z, 0, -a, 0);
    group.add(rib);
    if (i < 8) {
      const a2 = a + (Math.PI * 0.76) / 16;
      const wx = 2.6 + Math.cos(a2) * 23.5;
      const wz = 6 + Math.sin(a2) * 23.5;
      const strip = mesh(
        G.rbox(1.8, 0.14, 0.05, 0.02),
        ST.glow(i % 2 ? '#146b78' : '#8a2f8f', 0.8),
        'window-strip',
      );
      place(strip, wx, 1.6 + (i % 3) * 1.3, wz, 0, -a2 + Math.PI / 2, 0);
      group.add(strip);
    }
  }
  // Overhead gantry across the bay, with hanging cable loops and two lamps.
  const gantry = mesh(G.rbox(20, 0.3, 0.5, 0.05), ST.frame(), 'gantry');
  place(gantry, 2, 6.4, -3);
  group.add(gantry);
  for (const x of [-7, 2, 11]) {
    const col = mesh(G.rbox(0.4, 6.4, 0.4, 0.05), ST.frame(), 'gantry-column');
    place(col, x, 3.2, -3);
    group.add(col);
  }
  for (let i = 0; i < 6; i++) {
    const loop = mesh(G.torus(0.9, 0.04, 6, 24, Math.PI), ST.cable(), 'cable-loop');
    place(loop, -6 + i * 3.2, 6.2, -2.8, 0, 0, Math.PI);
    group.add(loop);
  }
  for (const x of [-4, 7]) {
    const lampHead = mesh(G.cone(0.3, 0.4, 12), ST.alloy(), 'gantry-lamp');
    place(lampHead, x, 6.0, -2.6, Math.PI);
    group.add(lampHead);
    const bulb = mesh(G.cyl(0.2, 0.2, 0.03, 12), ST.glow('#ffe8c2', 1.6), 'gantry-bulb');
    place(bulb, x, 5.78, -2.6);
    group.add(bulb);
  }
  // Distant background hull pieces and a far ring so the bay sits inside something big.
  const farRing = mesh(G.torus(60, 1.2, 12, 96), ST.dark(), 'far-ring');
  place(farRing, 2, 8, -40, Math.PI / 2 + 0.25);
  group.add(farRing);
  const farRingTrim = mesh(G.torus(60, 0.12, 6, 96), ST.glow('#3b1f7a', 0.9), 'far-ring-trim');
  place(farRingTrim, 2, 8.6, -40, Math.PI / 2 + 0.25);
  group.add(farRingTrim);
  for (let i = 0; i < 6; i++) {
    const block = mesh(G.rbox(6 + i * 2, 3 + (i % 2) * 2, 4, 0.2), ST.dark(), 'far-block');
    place(block, -30 + i * 14, 2 + (i % 3) * 3, -34 - (i % 2) * 8, 0, (i % 3) * 0.3);
    group.add(block);
  }
  // Distant harmless transports: three small craft on far lanes that never dock.
  const transports: THREE.Group[] = [];
  for (let i = 0; i < 3; i++) {
    const tr = new THREE.Group();
    const hull = mesh(G.capsule(0.35, 1.2, 4, 12), ST.alloy(), 'transport');
    hull.rotation.z = Math.PI / 2;
    tr.add(hull);
    const tail = mesh(G.sphere(0.16, 8, 6), ST.glow('#c56f9a', 2.2), 'transport-tail');
    place(tail, -0.95, 0, 0);
    tr.add(tail);
    group.add(tr);
    transports.push(tr);
  }

  return {
    group,
    update(_s: BayState, t: number, _dt: number, motion: number) {
      transports.forEach((tr, i) => {
        const speed = 0.06 + i * 0.02;
        const k = ((t * speed + i * 0.33) % 1) * (motion ? 1 : 0) + (motion ? 0 : 0.3 + i * 0.2);
        tr.position.set(-45 + k * 90, 6 + i * 3 + Math.sin(k * 6) * 0.5, -28 - i * 6);
        tr.rotation.y = 0;
      });
    },
  };
}
