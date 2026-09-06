import * as THREE from 'three';
import { G, mesh, place } from '../../characters/parts.js';
import { L } from './layout.js';
import { ST } from './materials.js';
import { buildModule } from './props.js';
import type { BayState } from './state.js';

/**
 * Fabricator zone: the bench with its holographic module racks and audit vent, the magnetic
 * staging cradle, and the commit press that seals the capsule. Each builder returns the group
 * and an update that reads the bay state.
 */
const CYAN = '#5ef2ff';
const AMBER = '#ffb347';
const ASH = '#7c7790';

export interface Station {
  group: THREE.Group;
  update: (s: BayState, t: number, dt: number, motion: number) => void;
}

export function buildBench(): Station & {
  moduleA: ReturnType<typeof buildModule>;
  moduleB: ReturnType<typeof buildModule>;
} {
  const group = new THREE.Group();
  group.name = 'bench';
  group.position.copy(L.bench);
  // Body: a chunky work table with a recessed top, a warm ceramic front panel and dark alloy legs.
  const top = mesh(G.rbox(3.6, 0.16, 1.5, 0.05), ST.alloy(), 'bench-top');
  place(top, 0, 1.0, 0);
  group.add(top);
  const body = mesh(G.rbox(3.3, 0.7, 1.3, 0.06), ST.dark(), 'bench-body');
  place(body, 0, 0.55, 0);
  group.add(body);
  const front = mesh(G.rbox(3.0, 0.5, 0.06, 0.03), ST.ceramicWarm(), 'bench-front');
  place(front, 0, 0.55, 0.66);
  group.add(front);
  const frontTrim = mesh(G.rbox(2.8, 0.03, 0.02, 0.01), ST.glow(CYAN, 1.2), 'bench-trim');
  place(frontTrim, 0, 0.84, 0.7);
  group.add(frontTrim);
  for (const x of [-1.5, 1.5]) {
    const leg = mesh(G.rbox(0.3, 0.3, 1.3, 0.04), ST.frame(), 'bench-leg');
    place(leg, x, 0.15, 0);
    group.add(leg);
  }
  // Drawers and a tool holder rail with three hanging tools.
  for (const x of [-0.9, 0, 0.9]) {
    const drawer = mesh(G.rbox(0.7, 0.14, 0.02, 0.02), ST.frame(), 'drawer');
    place(drawer, x, 0.4, 0.69);
    group.add(drawer);
    const pull = mesh(G.rbox(0.18, 0.03, 0.03, 0.01), ST.ceramic(), 'drawer-pull');
    place(pull, x, 0.4, 0.71);
    group.add(pull);
  }
  const rail = mesh(G.cyl(0.025, 0.025, 1.6, 8), ST.frame(), 'tool-rail');
  place(rail, -0.6, 2.05, -0.55, 0, 0, Math.PI / 2);
  group.add(rail);
  const toolShapes: Array<[number, number, number]> = [
    [0.06, 0.32, 0.06],
    [0.1, 0.22, 0.05],
    [0.05, 0.4, 0.08],
  ];
  toolShapes.forEach(([w, h, d], i) => {
    const tool = mesh(G.rbox(w, h, d, 0.015), i === 1 ? ST.ceramic() : ST.alloy(), 'tool');
    place(tool, -1.15 + i * 0.5, 2.05 - h / 2 - 0.02, -0.55);
    group.add(tool);
    const hook = mesh(G.torus(0.04, 0.008, 6, 12), ST.frame(), 'hook');
    place(hook, -1.15 + i * 0.5, 2.05, -0.55);
    group.add(hook);
  });
  // Gantry posts and a lamp arm over the bench.
  for (const x of [-1.6, 1.6]) {
    const post = mesh(G.cyl(0.06, 0.08, 1.3, 10), ST.frame(), 'post');
    place(post, x, 1.7, -0.6);
    group.add(post);
  }
  const gantryBeam = mesh(G.rbox(3.5, 0.1, 0.16, 0.03), ST.frame(), 'gantry-beam');
  place(gantryBeam, 0, 2.36, -0.6);
  group.add(gantryBeam);
  const lampArm = mesh(G.cyl(0.03, 0.03, 0.9, 8), ST.frame(), 'lamp-arm');
  place(lampArm, 0.4, 2.2, -0.2, 0.9, 0, 0);
  group.add(lampArm);
  const lampHead = mesh(G.cone(0.16, 0.22, 16), ST.alloy(), 'lamp-head');
  place(lampHead, 0.4, 1.95, 0.22, Math.PI - 0.7, 0, 0);
  group.add(lampHead);
  const lampGlow = ST.glow('#fff2d6', 1.4);
  const lampBulb = mesh(G.cyl(0.11, 0.11, 0.02, 16), lampGlow, 'lamp-bulb');
  place(lampBulb, 0.4, 1.86, 0.29, -0.7, 0, 0);
  group.add(lampBulb);
  const light = new THREE.SpotLight('#ffe8c2', 6, 6, 0.9, 0.5, 1.4);
  light.position.set(0.4, 1.9, 0.25);
  light.target.position.set(-0.4, 0.9, 0.3);
  group.add(light, light.target);
  // Module racks: two hologram cradles above the bench top where the modules hover.
  const modA = buildModule(CYAN);
  const modB = buildModule(CYAN);
  const localA = L.moduleA.clone().sub(L.bench);
  const localB = L.moduleB.clone().sub(L.bench);
  modA.group.position.copy(localA);
  modB.group.position.copy(localB);
  group.add(modA.group, modB.group);
  const rackMat = ST.glow(CYAN, 0.6);
  for (const p of [localA, localB]) {
    const rack = mesh(G.torus(0.42, 0.02, 6, 32), rackMat, 'rack-ring');
    place(rack, p.x, 1.09, p.z, Math.PI / 2);
    group.add(rack);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      const prong = mesh(G.cyl(0.015, 0.02, 0.24, 6), ST.frame(), 'rack-prong');
      place(prong, p.x + Math.cos(a) * 0.4, 1.2, p.z + Math.sin(a) * 0.4);
      group.add(prong);
    }
  }
  // Audit vent to the left: a flared duct with an ash-grey glow where removed material streams.
  const vent = new THREE.Group();
  vent.position.copy(L.vent.clone().sub(L.bench));
  const duct = mesh(G.cyl(0.42, 0.6, 1.5, 16, true), ST.alloy(), 'vent-duct');
  duct.material = ST.alloy();
  (duct.material as THREE.Material).side = THREE.DoubleSide;
  place(duct, 0, 0.75, 0);
  vent.add(duct);
  const ventRing = mesh(G.torus(0.44, 0.05, 8, 24), ST.frame(), 'vent-ring');
  place(ventRing, 0, 1.5, 0, Math.PI / 2);
  vent.add(ventRing);
  const ventGlowMat = ST.glow(ASH, 0.5);
  const ventGlow = mesh(G.cyl(0.38, 0.38, 0.04, 16), ventGlowMat, 'vent-glow');
  place(ventGlow, 0, 1.46, 0);
  vent.add(ventGlow);
  const pipe = mesh(G.torus(0.9, 0.09, 8, 24, Math.PI / 2), ST.cable(), 'vent-pipe');
  place(pipe, 0.9, 0.5, 0, 0, 0, Math.PI / 2);
  vent.add(pipe);
  group.add(vent);
  // Instruments the choreography animates: inspection beam, search pulse, diff plane, streams.
  const beam = mesh(G.cyl(0.015, 0.015, 1, 6), ST.glow('#bfe9ff', 2), 'beam');
  beam.visible = false;
  group.add(beam);
  const pulse = new THREE.Mesh(
    new THREE.RingGeometry(0.92, 1, 64),
    new THREE.MeshBasicMaterial({
      color: CYAN,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  place(pulse, 0, 1.1, 0, -Math.PI / 2);
  pulse.visible = false;
  group.add(pulse);
  const diff = new THREE.Mesh(
    G.plane(0.9, 0.6),
    new THREE.MeshBasicMaterial({
      color: AMBER,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  place(diff, localA.x, localA.y + 0.62, localA.z + 0.35);
  diff.visible = false;
  group.add(diff);
  const removed: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const chip = mesh(G.rbox(0.09, 0.05, 0.09, 0.01), ST.glow(ASH, 0.8), 'chip');
    chip.visible = false;
    group.add(chip);
    removed.push(chip);
  }
  const added: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const part = mesh(G.rbox(0.16, 0.07, 0.13, 0.015), ST.glow('#b6ff5c', 2), 'part');
    part.visible = false;
    group.add(part);
    added.push(part);
  }
  const ventTarget = L.vent
    .clone()
    .sub(L.bench)
    .add(new THREE.Vector3(0, 1.45, 0));
  const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
  const win = (x: number, a: number, b: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));

  return {
    group,
    moduleA: modA,
    moduleB: modB,
    update(s, t, _dt, motion) {
      const e = motion === 0 ? (x: number) => (x > 0 ? 1 : 0) : ease;
      // Read: beam from the lamp head to module A; module opens as a cross-section.
      const reading = s.read > 0 && s.read < 1;
      const readK = e(win(s.read, 0, 0.5)) * (reading ? 1 : 0);
      beam.visible = reading;
      if (reading) {
        const from = new THREE.Vector3(0.4, 1.86, 0.29);
        const to = localA.clone();
        const len = from.distanceTo(to) * readK;
        beam.position.copy(from).lerp(to, 0.5 * readK);
        beam.lookAt(group.localToWorld(to.clone()));
        beam.rotateX(Math.PI / 2);
        beam.scale.set(1, Math.max(0.001, len), 1);
      }
      modA.setOpen(reading ? e(win(s.read, 0.2, 0.6)) * (1 - e(win(s.read, 0.85, 1))) : 0);
      // Search: a pulse ring sweeps the directory scope over the bench top.
      const searching = s.search > 0 && s.search < 1;
      pulse.visible = searching;
      if (searching) {
        const r = 0.3 + e(s.search) * 2.2;
        pulse.scale.set(r, r, 1);
        (pulse.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - s.search * 0.7);
      }
      // Edit: module A hovers, a diff plane forms, removed chips stream to the vent, parts arrive.
      const editing = s.edit > 0 && s.edit < 1;
      const hoverA = s.edit > 0 ? 0.35 * e(win(s.edit, 0, 0.4)) : 0;
      modA.group.position.y = localA.y + hoverA * (1 - s.staged);
      diff.visible = s.edit > 0 && s.staged < 0.2;
      (diff.material as THREE.MeshBasicMaterial).opacity = 0.5 * e(win(s.edit, 0.2, 0.7));
      diff.scale.setScalar(Math.max(0.001, e(win(s.edit, 0.2, 0.7))));
      removed.forEach((c, i) => {
        const k = win(s.edit, 0.25 + i * 0.05, 0.85 + i * 0.05);
        c.visible = editing && k > 0 && k < 1;
        const p = localA
          .clone()
          .add(new THREE.Vector3(0, 0.5, 0))
          .lerp(ventTarget, e(k));
        c.position.set(p.x, p.y + Math.sin(k * Math.PI) * 0.7, p.z);
      });
      added.forEach((p, i) => {
        const k = win(s.edit, 0.3 + i * 0.08, 0.9);
        p.visible = editing && k < 1;
        const start = new THREE.Vector3(
          localA.x + 1.2 + i * 0.2,
          localA.y + 1.2,
          localA.z - 0.4 + i * 0.3,
        );
        const end = new THREE.Vector3(localA.x + (i - 1) * 0.2, localA.y + 0.45, localA.z);
        p.position.copy(start.lerp(end, e(k)));
      });
      ventGlowMat.emissiveIntensity = 0.5 + (editing ? 1.5 : 0);
      modA.setEdge(0.4 + (s.edit > 0 ? 0.8 : 0) + (s.read > 0 && s.read < 1 ? 0.6 : 0));
      // Created: module B fabricates from a frame.
      modB.group.visible = s.created > 0;
      modB.setFrame(e(s.created));
      const hoverB = s.created > 0 ? 0.35 * e(win(s.created, 0.6, 1)) : 0;
      modB.group.position.y = localB.y + hoverB * (1 - s.staged);
      // Staged and committed: the modules leave for the cradle; the racks dim.
      rackMat.emissiveIntensity = 0.6 + (s.edit > 0 && s.staged < 1 ? 0.6 : 0);
      lampGlow.emissiveIntensity = 1.4 + (reading || editing ? 1.2 : 0);
      light.intensity = 6 + (reading || editing ? 5 : 0);
      void t;
    },
  };
}

export function buildCradle(bench: ReturnType<typeof buildBench>): Station {
  const group = new THREE.Group();
  group.name = 'cradle';
  group.position.copy(L.cradle);
  // Pedestal with a magnetic field ring and three field emitters.
  const base = mesh(G.cyl(0.9, 1.05, 0.5, 24), ST.dark(), 'cradle-base');
  place(base, 0, 0.25, 0);
  group.add(base);
  const column = mesh(G.cyl(0.3, 0.42, 0.6, 16), ST.alloy(), 'cradle-column');
  place(column, 0, 0.8, 0);
  group.add(column);
  const dish = mesh(G.cyl(0.85, 0.65, 0.16, 24), ST.ceramic(), 'cradle-dish');
  place(dish, 0, 1.15, 0);
  group.add(dish);
  const ringMat = ST.glow(CYAN, 0.5);
  const ring = mesh(G.torus(0.95, 0.045, 10, 48), ringMat, 'field-ring');
  place(ring, 0, 1.3, 0, Math.PI / 2);
  group.add(ring);
  const ring2 = mesh(G.torus(0.7, 0.03, 8, 40), ringMat, 'field-ring-2');
  place(ring2, 0, 1.75, 0, Math.PI / 2);
  group.add(ring2);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const post = mesh(G.cyl(0.04, 0.05, 1.0, 8), ST.frame(), 'emitter-post');
    place(post, Math.cos(a) * 0.95, 1.7, Math.sin(a) * 0.95);
    group.add(post);
    const emitter = mesh(G.cone(0.08, 0.16, 8), ringMat, 'emitter');
    place(emitter, Math.cos(a) * 0.95, 2.28, Math.sin(a) * 0.95);
    group.add(emitter);
  }
  // Cables to the deck.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.6;
    const cable = mesh(G.torus(0.5, 0.03, 6, 20, Math.PI / 2), ST.cable(), 'cable');
    place(cable, Math.cos(a) * 1.2, 0.02, Math.sin(a) * 1.2, Math.PI / 2, 0, a + Math.PI);
    group.add(cable);
  }
  const localA = L.moduleA.clone().sub(L.cradle);
  const localB = L.moduleB.clone().sub(L.cradle);
  const seatA = new THREE.Vector3(-0.42, 1.55, 0);
  const seatB = new THREE.Vector3(0.42, 1.55, 0);
  const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
  return {
    group,
    update(s, t, _dt, motion) {
      const e = motion === 0 ? (x: number) => (x > 0 ? 1 : 0) : ease;
      const k = e(s.staged);
      // Modules converge from the bench racks into the cradle seats; at commit they compress away.
      if (s.staged > 0) {
        const pa = localA
          .clone()
          .add(new THREE.Vector3(0, 0.35, 0))
          .lerp(seatA, k);
        const pb = localB
          .clone()
          .add(new THREE.Vector3(0, 0.35, 0))
          .lerp(seatB, k);
        bench.moduleA.group.position.copy(pa).add(L.cradle).sub(L.bench);
        bench.moduleB.group.position.copy(pb).add(L.cradle).sub(L.bench);
        const rise = Math.sin(k * Math.PI) * 0.8;
        bench.moduleA.group.position.y += rise;
        bench.moduleB.group.position.y += rise;
        const compress = e(Math.min(1, s.committed / 0.6));
        const scale = Math.max(0.001, 1 - compress);
        bench.moduleA.group.scale.setScalar(scale);
        bench.moduleB.group.scale.setScalar(scale);
        // Once committed the modules travel with the press: they are drawn into it.
        if (s.committed > 0) {
          const pressLocal = L.press
            .clone()
            .sub(L.bench)
            .add(new THREE.Vector3(0, 1.1, 0));
          bench.moduleA.group.position.lerp(pressLocal, compress);
          bench.moduleB.group.position.lerp(pressLocal, compress);
        }
      } else {
        bench.moduleA.group.scale.setScalar(1);
        bench.moduleB.group.scale.setScalar(1);
      }
      ringMat.emissiveIntensity = 0.5 + k * 2 * (1 - s.committed * 0.8);
      ring.rotation.z = motion ? t * (0.1 + k * 0.9) : 0;
      ring2.rotation.z = motion ? -t * (0.15 + k * 1.2) : 0;
    },
  };
}

export function buildPress(capsule: THREE.Group): Station {
  const group = new THREE.Group();
  group.name = 'press';
  group.position.copy(L.press);
  // A heavy clamshell sealer: base, hinge column, two jaws that close over the capsule bed.
  const base = mesh(G.rbox(2.6, 0.5, 1.9, 0.08), ST.dark(), 'press-base');
  place(base, 0, 0.25, 0);
  group.add(base);
  const bed = mesh(G.rbox(1.9, 0.3, 1.2, 0.06), ST.alloy(), 'press-bed');
  place(bed, 0, 0.65, 0);
  group.add(bed);
  const bedGlow = ST.glow(CYAN, 0.4);
  const bedTrim = mesh(G.rbox(1.7, 0.02, 1.0, 0.01), bedGlow, 'bed-trim');
  place(bedTrim, 0, 0.81, 0);
  group.add(bedTrim);
  const hingeCol = mesh(G.rbox(0.5, 1.9, 0.6, 0.06), ST.frame(), 'hinge-column');
  place(hingeCol, 0, 1.45, -0.95);
  group.add(hingeCol);
  const hingeBar = mesh(G.cyl(0.12, 0.12, 2.2, 16), ST.alloy(), 'hinge-bar');
  place(hingeBar, 0, 2.3, -0.75, 0, 0, Math.PI / 2);
  group.add(hingeBar);
  const jaws: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const jaw = new THREE.Group();
    jaw.position.set(0, 2.3, -0.75);
    const shell = mesh(G.rbox(1.7, 0.36, 1.15, 0.1), ST.alloy(), 'jaw');
    place(shell, 0, -0.26, 0.7);
    const inset = mesh(G.rbox(1.3, 0.1, 0.8, 0.04), ST.ceramic(), 'jaw-inset');
    place(inset, 0, -0.08, 0.7);
    jaw.add(inset);
    jaw.add(shell);
    const lip = mesh(G.rbox(1.95, 0.06, 1.35, 0.02), ST.frame(), 'jaw-lip');
    place(lip, 0, -0.56, 0.7);
    jaw.add(lip);
    const glyph = mesh(G.rbox(0.5, 0.03, 0.5, 0.01), bedGlow, 'jaw-glyph');
    place(glyph, 0, -0.04, 0.7);
    jaw.add(glyph);
    jaw.rotation.x = side < 0 ? -1.35 : 0;
    // Only the front jaw swings; the rear one is the fixed anvil. Keep both for the silhouette.
    if (side > 0) {
      jaw.rotation.x = 0;
      jaw.position.y = 2.3;
    }
    group.add(jaw);
    jaws.push(jaw);
  }
  // Only the first jaw (the lid) moves; drop the second to avoid a doubled shell.
  group.remove(jaws[1]!);
  const lid = jaws[0]!;
  // Handles the Fabricator pushes, SHA readout plate on the front, pistons at the sides.
  for (const x of [-1.15, 1.15]) {
    const piston = mesh(G.cyl(0.07, 0.07, 1.2, 10), ST.alloy(), 'piston');
    place(piston, x, 1.3, -0.2);
    group.add(piston);
    const sleeve = mesh(G.cyl(0.11, 0.11, 0.5, 10), ST.frame(), 'piston-sleeve');
    place(sleeve, x, 0.85, -0.2);
    group.add(sleeve);
  }
  const handle = mesh(G.cyl(0.05, 0.05, 1.5, 10), ST.cable(), 'handle');
  place(handle, 0, 1.15, 1.1, 0, 0, Math.PI / 2);
  group.add(handle);
  for (const x of [-0.6, 0.6]) {
    const stem = mesh(G.rbox(0.08, 0.5, 0.08, 0.02), ST.frame(), 'handle-stem');
    place(stem, x, 1.0, 1.0);
    group.add(stem);
  }
  const readoutMat = ST.glow(CYAN, 0.2);
  const readout = mesh(G.rbox(1.0, 0.24, 0.03, 0.03), readoutMat, 'readout');
  place(readout, 0, 0.32, 0.96);
  group.add(readout);
  // Cables into the deck.
  for (const x of [-0.8, 0.8]) {
    const cable = mesh(G.torus(0.6, 0.035, 6, 20, Math.PI / 2), ST.cable(), 'cable');
    place(cable, x, 0.02, -1.0, Math.PI / 2, 0, Math.PI);
    group.add(cable);
  }
  // The capsule rests on the bed until it leaves down the lane.
  capsule.position.set(0, 1.1, 0);
  group.add(capsule);
  const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
  const win = (x: number, a: number, b: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));
  return {
    group,
    update(s, t, _dt, motion) {
      const e = motion === 0 ? (x: number) => (x > 0 ? 1 : 0) : ease;
      // Committing: the lid closes over the bed, holds, then opens on the sealed capsule.
      const close = e(win(s.committed, 0, 0.35));
      const open = e(win(s.committed, 0.75, 1));
      lid.rotation.x = -1.35 * (1 - close) - 1.1 * open;
      const glow = close * (1 - open);
      bedGlow.emissiveIntensity = 0.4 + glow * 2.6 + (s.staged > 0 && s.committed === 0 ? 0.6 : 0);
      readoutMat.emissiveIntensity = 0.2 + (s.committed >= 0.75 ? 1.6 : 0);
      readout.scale.x =
        1 + (s.committed > 0 && s.committed < 1 && motion ? Math.sin(t * 30) * 0.01 : 0);
      // The capsule is only present once the seal exists; it grows out of the compression.
      const appear = s.committed > 0 ? e(win(s.committed, 0.35, 0.8)) : 0;
      capsule.visible = appear > 0.001 && s.laneA === 0;
      capsule.scale.setScalar(Math.max(0.001, appear));
      capsule.rotation.z = (1 - appear) * 0.6;
    },
  };
}
