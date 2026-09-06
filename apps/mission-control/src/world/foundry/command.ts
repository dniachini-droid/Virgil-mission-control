import * as THREE from 'three';
import { G, mesh, place } from '../../characters/parts.js';
import { labelTexture } from '../labels.js';
import type { Station } from './fabrication.js';
import { L } from './layout.js';
import { ST } from './materials.js';

/**
 * Virgil's control centre on a raised dais overlooking the bay, and the owner airlock behind
 * it with the eligibility pedestal outside. The airlock never opens in Phase 0.5: safe-to-merge
 * assembles a key outside it and nothing more.
 */
const WHITE = '#f4f1ff';
const GOLD = '#f5c451';
const LIME = '#b6ff5c';
const CYAN = '#5ef2ff';
const ICE = '#bfe9ff';

function plateMesh(text: string, color: string, height = 0.22, border?: string) {
  const { texture, aspect } = labelTexture(text, {
    size: 40,
    fg: color,
    pad: 14,
    ...(border ? { border } : {}),
  });
  return new THREE.Mesh(
    G.plane(height * aspect, height),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false }),
  );
}

export function buildControlCentre(): Station & { routes: Record<string, THREE.Mesh> } {
  const group = new THREE.Group();
  group.name = 'control-centre';
  group.position.copy(L.dais);
  const H = L.daisHeight;
  // Dais: a broad raised platform with a lit front edge and steps at the front.
  const dais = mesh(G.cyl(4.6, 5.0, H, 10), ST.dark(), 'dais');
  place(dais, 0, H / 2, 0);
  group.add(dais);
  const daisTrim = mesh(G.torus(4.62, 0.035, 6, 10), ST.glow(ICE, 0.35), 'dais-trim');
  place(daisTrim, 0, H + 0.01, 0, Math.PI / 2);
  group.add(daisTrim);
  for (let i = 0; i < 4; i++) {
    const step = mesh(G.rbox(3.0 - i * 0.2, 0.36, 0.7, 0.04), ST.alloy(), 'step');
    place(step, 0, 0.18 + i * 0.36, 4.9 - i * 0.55);
    group.add(step);
  }
  // Curved console bank: five panel segments in an arc facing the bay, each with a lit screen.
  const screens: THREE.MeshStandardMaterial[] = [];
  for (let i = -2; i <= 2; i++) {
    const a = i * 0.36;
    const seg = new THREE.Group();
    seg.position.set(Math.sin(a) * 2.6, H, 2.0 - Math.cos(a) * 2.6 + 2.6 * (1 - 1));
    seg.position.z = 1.9 - (1 - Math.cos(a)) * 2.6;
    seg.rotation.y = -a;
    const desk = mesh(G.rbox(1.5, 1.05, 0.55, 0.06), ST.alloy(), 'console-desk');
    place(desk, 0, 0.52, 0, -0.1);
    seg.add(desk);
    const screenMat = ST.glow(ICE, 0.3);
    screenMat.toneMapped = true;
    screens.push(screenMat);
    const screen = mesh(G.rbox(1.3, 0.55, 0.04, 0.03), screenMat, 'console-screen');
    place(screen, 0, 1.25, -0.1, -0.35);
    seg.add(screen);
    const bezel = mesh(G.rbox(1.4, 0.65, 0.06, 0.04), ST.frame(), 'console-bezel');
    place(bezel, 0, 1.25, -0.14, -0.35);
    seg.add(bezel);
    // Route levers on the two outer desks.
    if (Math.abs(i) === 2) {
      const lever = mesh(G.cyl(0.03, 0.03, 0.4, 8), ST.ceramic(), 'lever');
      place(lever, 0, 1.15, 0.05, -0.6);
      seg.add(lever);
      const knob = mesh(G.sphere(0.06, 10, 8), ST.glow(CYAN, 1), 'lever-knob');
      place(knob, 0, 1.33, 0.16);
      seg.add(knob);
    }
    group.add(seg);
  }
  // Orrery instrument: a tilted stack of rings on a central post behind the console.
  const orrery = new THREE.Group();
  orrery.position.set(0, H, -1.2);
  const post = mesh(G.cyl(0.08, 0.14, 1.6, 12), ST.frame(), 'orrery-post');
  place(post, 0, 0.8, 0);
  orrery.add(post);
  const rings: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const ring = mesh(
      G.torus(0.6 + i * 0.35, 0.02, 8, 64),
      ST.glow(i === 1 ? GOLD : WHITE, 0.8),
      'orrery-ring',
    );
    place(ring, 0, 1.8, 0, Math.PI / 2 + 0.3 * i, 0.2 * i);
    orrery.add(ring);
    rings.push(ring);
  }
  const core = mesh(G.sphere(0.16, 16, 12), ST.glow(WHITE, 1.6), 'orrery-core');
  place(core, 0, 1.8, 0);
  orrery.add(core);
  group.add(orrery);
  // Lectern for owner decisions: a small gold-keyed pedestal at the console centre.
  const lectern = mesh(G.rbox(0.5, 0.2, 0.36, 0.04), ST.frame(), 'lectern');
  place(lectern, 0, H + 1.08, 1.85, -0.35);
  group.add(lectern);
  const lecternKey = mesh(G.rbox(0.06, 0.16, 0.02, 0.01), ST.glow(GOLD, 0.8), 'lectern-key');
  place(lecternKey, 0, H + 1.16, 2.0, -0.35);
  group.add(lecternKey);
  // Routes: three lit rails from the dais front toward the three stations. Only one lights at a time.
  const routes: Record<string, THREE.Mesh> = {};
  const targets: Array<[string, THREE.Vector3]> = [
    ['prover', L.scanner],
    ['keeper', L.keeper],
    ['owner', L.airlock],
  ];
  for (const [name, target] of targets) {
    const from = new THREE.Vector3(0, H + 0.02, name === 'owner' ? -1.5 : 4.4);
    const to = target.clone().sub(L.dais);
    to.y = name === 'owner' ? H + 0.02 : 0.25;
    const curve = new THREE.CatmullRomCurve3([
      from,
      from
        .clone()
        .lerp(to, 0.5)
        .add(new THREE.Vector3(0, name === 'owner' ? 0 : 0.6, 0)),
      to,
    ]);
    const route = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 40, 0.05, 8, false),
      ST.glow(name === 'owner' ? GOLD : WHITE, 0.15),
    );
    route.name = `route:${name}`;
    group.add(route);
    routes[name] = route;
  }
  const light = new THREE.PointLight('#fff4ea', 4, 10, 1.4);
  light.position.set(0, H + 3, 0.5);
  group.add(light);
  const banner = plateMesh('VIRGIL · control centre', WHITE, 0.3);
  place(banner, 0, H + 3.4, -1.2);
  group.add(banner);
  return {
    group,
    routes,
    update(s, t, _dt, motion) {
      rings.forEach((r, i) => {
        r.rotation.z = motion ? t * (0.03 + i * 0.02) * (1 + (s.routeOpen !== 'none' ? 6 : 0)) : 0;
      });
      for (const [name, route] of Object.entries(routes)) {
        const m = route.material as THREE.MeshStandardMaterial;
        const open = s.routeOpen === name;
        m.emissiveIntensity = open ? 1.8 + 0.4 * Math.sin(t * 4 * motion) : 0.12;
      }
      screens.forEach((m, i) => {
        m.emissiveIntensity =
          0.3 + (s.routeOpen !== 'none' ? 0.25 : 0) + 0.08 * Math.sin(t * 1.3 + i) * motion;
      });
      core.scale.setScalar(1 + 0.05 * Math.sin(t * 1.1) * motion);
    },
  };
}

export function buildAirlock(): Station {
  const group = new THREE.Group();
  group.name = 'airlock';
  group.position.copy(L.airlock);
  // Wall segment with the heavy interlocked door: two plates meeting at a gold keyway. Closed.
  const wall = mesh(G.rbox(9, 5.2, 0.8, 0.1), ST.dark(), 'airlock-wall');
  place(wall, 0, 2.6, -0.4);
  group.add(wall);
  const frame = mesh(G.rbox(4.2, 4.2, 0.5, 0.12), ST.frame(), 'door-frame');
  place(frame, 0, 2.1, 0.1);
  group.add(frame);
  for (const side of [-1, 1]) {
    const plate = mesh(G.rbox(1.7, 3.6, 0.36, 0.08), ST.alloy(), 'door-plate');
    place(plate, side * 0.9, 2.05, 0.28);
    group.add(plate);
    for (let i = 0; i < 3; i++) {
      const tooth = mesh(G.rbox(0.3, 0.5, 0.4, 0.04), ST.frame(), 'interlock');
      place(tooth, side * 0.15, 0.8 + i * 1.1 + (side > 0 ? 0.55 : 0), 0.3);
      group.add(tooth);
    }
    const lamp = mesh(G.rbox(0.9, 0.05, 0.03, 0.01), ST.glow(GOLD, 0.6), 'door-lamp');
    place(lamp, side * 0.9, 3.7, 0.48);
    group.add(lamp);
  }
  const keyway = mesh(G.rbox(0.12, 0.9, 0.06, 0.02), ST.glow(GOLD, 1.5), 'keyway');
  place(keyway, 0, 2.1, 0.5);
  group.add(keyway);
  const banner = plateMesh('OWNER AIRLOCK · closed', GOLD, 0.3, GOLD);
  place(banner, 0, 4.6, 0.6);
  group.add(banner);
  // Eligibility pedestal outside the door: the key assembles here on safe_to_merge.
  const pedestal = mesh(G.cyl(0.5, 0.6, 1.0, 12), ST.frame(), 'pedestal');
  place(pedestal, 0, 0.5, L.pedestal.z - L.airlock.z);
  group.add(pedestal);
  const pedTop = mesh(G.cyl(0.55, 0.5, 0.08, 12), ST.ceramic(), 'pedestal-top');
  place(pedTop, 0, 1.03, L.pedestal.z - L.airlock.z);
  group.add(pedTop);
  const keyGroup = new THREE.Group();
  keyGroup.position.set(0, 1.5, L.pedestal.z - L.airlock.z);
  const keyMat = ST.glow(LIME, 2);
  const keyShaft = mesh(G.rbox(0.1, 0.8, 0.1, 0.02), keyMat, 'key-shaft');
  keyGroup.add(keyShaft);
  const keyBow = mesh(G.torus(0.18, 0.04, 8, 24), keyMat, 'key-bow');
  place(keyBow, 0, 0.55, 0);
  keyGroup.add(keyBow);
  const keyBits: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const bit = mesh(G.rbox(0.16, 0.08, 0.1, 0.01), keyMat, 'key-bit');
    place(bit, 0.12, -0.3 + i * 0.16, 0);
    keyGroup.add(bit);
    keyBits.push(bit);
  }
  keyGroup.visible = false;
  group.add(keyGroup);
  const keyPlate = plateMesh(
    'SAFE_TO_MERGE · eligibility key · airlock stays closed',
    LIME,
    0.2,
    LIME,
  );
  place(keyPlate, 0, 2.3, L.pedestal.z - L.airlock.z);
  keyPlate.visible = false;
  group.add(keyPlate);
  const light = new THREE.PointLight('#ffd98a', 2.5, 8, 1.6);
  light.position.set(0, 3.2, 1.5);
  group.add(light);
  const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
  return {
    group,
    update(s, t, _dt, motion) {
      const e = motion === 0 ? (x: number) => (x > 0 ? 1 : 0) : ease;
      const k = e(s.eligible);
      keyGroup.visible = s.eligible > 0;
      // The key assembles: shaft first, bow, then bits click in. It hovers; it never enters the keyway.
      keyShaft.scale.y = Math.max(0.001, Math.min(1, k / 0.4));
      keyBow.scale.setScalar(Math.max(0.001, Math.min(1, (k - 0.3) / 0.3)));
      keyBits.forEach((b, i) => {
        const kk = Math.min(1, Math.max(0, (k - 0.55 - i * 0.12) / 0.15));
        b.scale.setScalar(Math.max(0.001, kk));
        b.position.x = 0.12 + (1 - kk) * 0.3;
      });
      keyGroup.rotation.y = motion ? t * 0.4 : 0;
      keyGroup.position.y = 1.5 + Math.sin(t * 1.2) * 0.04 * motion;
      keyPlate.visible = s.eligible > 0.9;
      keyMat.emissiveIntensity = 1.2 + k * 1.2;
    },
  };
}
