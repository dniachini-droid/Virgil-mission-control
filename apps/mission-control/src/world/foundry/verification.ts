import * as THREE from 'three';
import { G, mesh, place } from '../../characters/parts.js';
import { labelTexture } from '../labels.js';
import type { Station } from './fabrication.js';
import { L } from './layout.js';
import { ST } from './materials.js';
import { buildPin } from './props.js';
import type { CheckId, CheckVis } from './state.js';

/**
 * Prover scanner station and Keeper inspection platform. The scanner is a ring gantry with one
 * physical channel per check; the Keeper platform sits across a visible gap with its own
 * inspection ring, magnifier arch and evidence pins. Both hold the capsule while it is theirs.
 */
const LIME = '#b6ff5c';
const ICE = '#bfe9ff';
const RED = '#ff3b5c';
const ASH = '#7c7790';
const VIOLET = '#a24dff';

const CHECKS: Array<{ id: CheckId; name: string; angle: number }> = [
  { id: 'typecheck', name: 'tsc', angle: -0.9 },
  { id: 'lint', name: 'biome', angle: -0.3 },
  { id: 'unit', name: 'vitest', angle: 0.3 },
  { id: 'visual', name: 'visual · skipped', angle: 0.9 },
];

function nameplate(text: string, color: string, height = 0.2) {
  const { texture, aspect } = labelTexture(text, { size: 40, fg: color, pad: 14 });
  const plate = new THREE.Mesh(
    G.plane(height * aspect, height),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false }),
  );
  return plate;
}

export function buildScanner(capsuleDock: THREE.Group): Station {
  const group = new THREE.Group();
  group.name = 'scanner';
  group.position.copy(L.scanner);
  // Platform ring on the deck and a central dock column.
  const plinth = mesh(G.cyl(2.4, 2.6, 0.3, 32), ST.dark(), 'scanner-plinth');
  place(plinth, 0, 0.15, 0);
  group.add(plinth);
  const plinthTrim = mesh(G.torus(2.4, 0.03, 6, 64), ST.glow(LIME, 0.6), 'plinth-trim');
  place(plinthTrim, 0, 0.31, 0, Math.PI / 2);
  group.add(plinthTrim);
  const column = mesh(G.cyl(0.55, 0.7, 0.5, 20), ST.alloy(), 'dock-column');
  place(column, 0, 0.55, 0);
  group.add(column);
  const dockGlow = ST.glow(LIME, 0.3);
  const dockRing = mesh(G.torus(0.6, 0.04, 8, 40), dockGlow, 'dock-ring');
  place(dockRing, 0, 0.82, 0, Math.PI / 2);
  group.add(dockRing);
  // Two big gantry arches (front-back) carrying the channel heads.
  for (const rot of [0, Math.PI / 2]) {
    const arch = mesh(G.torus(2.0, 0.09, 10, 48, Math.PI), ST.frame(), 'arch');
    place(arch, 0, 0.3, 0, 0, rot, 0);
    group.add(arch);
  }
  // Channel heads: four scanner heads on the front arch, one per check; each with a lamp,
  // a lens and a name plate. Running sweeps an arc; passed closes a band; failed breaks the
  // arc with a tether; skipped stays unpowered and grey.
  const heads: Record<
    CheckId,
    {
      head: THREE.Group;
      lamp: THREE.MeshStandardMaterial;
      arc: THREE.Mesh;
      arcMat: THREE.MeshStandardMaterial;
      band: THREE.Mesh;
      breakGlyph: THREE.Group;
      plate: THREE.Mesh;
    }
  > = {} as never;
  for (const c of CHECKS) {
    const head = new THREE.Group();
    const r = 2.0;
    const x = Math.sin(c.angle) * r;
    const y = 0.3 + Math.cos(c.angle) * r;
    head.position.set(x, y, 0);
    head.rotation.z = -c.angle;
    const housing = mesh(G.rbox(0.36, 0.3, 0.3, 0.06), ST.ceramic(), 'channel-housing');
    place(housing, 0, -0.2, 0);
    head.add(housing);
    const lampMat = ST.glow(ASH, 0.3);
    const lamp = mesh(G.cyl(0.07, 0.07, 0.04, 16), lampMat, 'channel-lamp');
    place(lamp, 0, -0.37, 0);
    head.add(lamp);
    const lens = mesh(G.sphere(0.06, 12, 8), ST.glass(LIME), 'channel-lens');
    place(lens, 0, -0.37, 0.12);
    head.add(lens);
    const plate = nameplate(c.name, ICE, 0.16);
    place(plate, 0, 0.06, 0.2);
    head.add(plate);
    group.add(head);
    // Arc from the head toward the dock: a torus segment centred on the dock.
    const arcMat = ST.glow(ASH, 0.25);
    const arc = mesh(G.torus(1.3, 0.035, 8, 40, 0.001), arcMat, 'check-arc');
    place(arc, 0, 1.05, 0, 0, 0, Math.PI / 2 - c.angle);
    group.add(arc);
    const band = mesh(
      G.torus(0.62 + CHECKS.indexOf(c) * 0.06, 0.02, 8, 40),
      ST.glow(LIME, 2),
      'band',
    );
    band.rotation.y = Math.PI / 2;
    band.visible = false;
    capsuleDock.add(band);
    const breakGlyph = new THREE.Group();
    const spark = mesh(G.rbox(0.1, 0.1, 0.1, 0.01), ST.glow(RED, 3), 'break');
    breakGlyph.add(spark);
    const tether = mesh(G.cyl(0.012, 0.012, 1.2, 6), ST.glow(RED, 1.5), 'fault-tether');
    place(tether, 0, -0.6, 0);
    breakGlyph.add(tether);
    breakGlyph.visible = false;
    group.add(breakGlyph);
    heads[c.id] = { head, lamp: lampMat, arc, arcMat, band, breakGlyph, plate };
  }
  // Signature emitter above the dock: engages once verification completes.
  const sigMat = ST.glow(LIME, 0.2);
  const sig = mesh(G.torus(0.9, 0.05, 8, 48), sigMat, 'signature-ring');
  place(sig, 0, 2.4, 0, Math.PI / 2);
  group.add(sig);
  // Quarantine lattice: a rigid faceted cage that closes over the dock on a proven defect.
  const latticeMat = new THREE.MeshPhysicalMaterial({
    color: VIOLET,
    emissive: VIOLET,
    emissiveIntensity: 0.6,
    roughness: 0.6,
    metalness: 0.2,
    wireframe: true,
  });
  const lattice = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 1), latticeMat);
  place(lattice, 0, 1.05, 0);
  lattice.visible = false;
  group.add(lattice);
  const failPlate = nameplate('QUARANTINED · proven defect · unit exit 1', VIOLET, 0.22);
  place(failPlate, 0, 2.9, 0);
  failPlate.visible = false;
  group.add(failPlate);
  // Mirror bay: a small disposable copy cradle to the side, where the fault injector may aim.
  const mirror = mesh(G.rbox(0.9, 0.25, 0.7, 0.05), ST.frame(), 'mirror-bay');
  place(mirror, 1.9, 0.42, 1.4);
  group.add(mirror);
  const mirrorPlate = nameplate('mirror bay · disposable', ASH, 0.14);
  place(mirrorPlate, 1.9, 0.75, 1.4);
  group.add(mirrorPlate);
  // Console the Prover operates: a low desk with a lit surface facing the dock.
  const desk = mesh(G.rbox(1.4, 0.9, 0.5, 0.05), ST.dark(), 'scanner-console');
  place(desk, -2.0, 0.45, 1.8, 0, 0.9, 0);
  group.add(desk);
  const deskTop = mesh(G.rbox(1.3, 0.04, 0.44, 0.01), ST.glow(LIME, 0.5), 'console-top');
  place(deskTop, -2.0, 0.92, 1.8, -0.35, 0.9, 0);
  group.add(deskTop);
  const light = new THREE.PointLight('#d6ffa8', 2.5, 8, 1.6);
  light.position.set(0, 2.2, 0.6);
  group.add(light);

  const arcGeo = (arcLen: number) =>
    new THREE.TorusGeometry(1.3, 0.035, 8, 40, Math.max(0.001, arcLen));
  const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
  return {
    group,
    update(s, t, _dt, motion) {
      const e = motion === 0 ? (x: number) => (x > 0 ? 1 : 0) : ease;
      dockGlow.emissiveIntensity = 0.3 + s.docked * 1.5;
      for (const c of CHECKS) {
        const h = heads[c.id];
        const v: CheckVis = s.checks[c.id];
        const running = v.status === 'running';
        const arcLen = running
          ? 0.9 * (0.5 + 0.5 * Math.sin(t * 3 * motion)) * Math.max(0.2, v.progress)
          : v.status === 'passed'
            ? 0.9
            : v.status === 'failed'
              ? 0.5
              : 0;
        h.arc.geometry.dispose();
        h.arc.geometry = arcGeo(arcLen);
        h.arc.visible = arcLen > 0.002;
        const color =
          v.status === 'passed'
            ? LIME
            : v.status === 'failed'
              ? RED
              : v.status === 'running'
                ? LIME
                : ASH;
        h.arcMat.color.set(color);
        h.arcMat.emissive.set(color);
        h.arcMat.emissiveIntensity = running
          ? 1.8
          : v.status === 'passed'
            ? 1.2
            : v.status === 'failed'
              ? 2.2
              : 0.25;
        h.lamp.color.set(color);
        h.lamp.emissive.set(color);
        h.lamp.emissiveIntensity = v.status === 'idle' || v.status === 'skipped' ? 0.3 : 1.8;
        h.band.visible = v.status === 'passed' && v.progress > 0.6;
        h.breakGlyph.visible = v.status === 'failed';
        if (v.status === 'failed') {
          const a = Math.PI / 2 - c.angle + 0.5;
          h.breakGlyph.position.set(Math.cos(a) * 1.3, 1.05 + Math.sin(a) * 1.3, 0);
          (h.breakGlyph.children[0] as THREE.Mesh).scale.setScalar(
            1 + Math.sin(t * 8 * motion) * 0.15,
          );
        }
      }
      sigMat.emissiveIntensity = 0.2 + e(s.signature) * 2.2;
      sig.rotation.z = motion ? t * 0.3 * s.signature : 0;
      lattice.visible = s.quarantined > 0;
      lattice.scale.setScalar(Math.max(0.001, e(s.quarantined)));
      failPlate.visible = s.quarantined > 0.6;
      latticeMat.emissiveIntensity = 0.6 + (s.failed > 0 ? 0.8 : 0);
      light.intensity = 2.5 + s.docked * 3;
    },
  };
}

export function buildKeeperStation(capsuleDock: THREE.Group): Station {
  const group = new THREE.Group();
  group.name = 'keeper-station';
  group.position.copy(L.keeper);
  // Inspection ring on a quiet plinth, a magnifier arch, a provenance reader lectern.
  const plinth = mesh(G.cyl(2.3, 2.5, 0.3, 8), ST.dark(), 'keeper-plinth');
  place(plinth, 0, 0.15, 0);
  group.add(plinth);
  const plinthTrim = mesh(G.torus(2.32, 0.025, 6, 8), ST.glow(ICE, 0.5), 'keeper-trim');
  place(plinthTrim, 0, 0.31, 0, Math.PI / 2);
  group.add(plinthTrim);
  const column = mesh(G.cyl(0.5, 0.65, 0.5, 8), ST.alloy(), 'keeper-column');
  place(column, 0, 0.55, 0);
  group.add(column);
  const ringMat = ST.glow(ICE, 0.4);
  const inspectRing = mesh(G.torus(1.1, 0.04, 8, 56), ringMat, 'inspection-ring');
  place(inspectRing, 0, 1.05, 0, Math.PI / 2);
  group.add(inspectRing);
  const ringB = mesh(G.torus(1.3, 0.025, 8, 56), ringMat, 'inspection-ring-b');
  place(ringB, 0, 1.05, 0, Math.PI / 2 + 0.4, 0.3);
  group.add(ringB);
  // Magnifier arch: a large lens on a curved boom over the dock.
  const boom = mesh(G.torus(1.6, 0.07, 10, 40, Math.PI * 0.55), ST.frame(), 'arch-boom');
  place(boom, 0, 0.3, -0.9, 0, 0, Math.PI * 0.22);
  group.add(boom);
  const lensRim = mesh(G.torus(0.42, 0.05, 10, 40), ST.frame(), 'lens-rim');
  place(lensRim, 0, 2.15, 0.1, Math.PI / 2 + 0.5);
  group.add(lensRim);
  const lens = new THREE.Mesh(G.cyl(0.4, 0.4, 0.04, 40), ST.glass(ICE));
  place(lens, 0, 2.15, 0.1, 0.5);
  group.add(lens);
  // Criterion markers: four small posts with plates around the ring.
  const criteria = ['AC-1.1', 'AC-1.2', 'AC-1.3', 'AC-1.4'];
  criteria.forEach((id, i) => {
    const a = (i / criteria.length) * Math.PI * 2 + Math.PI / 4;
    const post = mesh(G.cyl(0.03, 0.04, 0.9, 8), ST.frame(), 'criterion-post');
    place(post, Math.cos(a) * 1.9, 0.75, Math.sin(a) * 1.9);
    group.add(post);
    const plate = nameplate(id, ICE, 0.14);
    place(plate, Math.cos(a) * 1.9, 1.3, Math.sin(a) * 1.9, 0, -a + Math.PI / 2, 0);
    group.add(plate);
  });
  // Lectern with the provenance reader, where the Keeper stands.
  const lectern = mesh(G.rbox(1.0, 1.0, 0.5, 0.05), ST.dark(), 'lectern');
  place(lectern, 0, 0.5, 2.2, 0);
  group.add(lectern);
  const lecternTop = mesh(G.rbox(0.9, 0.04, 0.44, 0.01), ST.glow(ICE, 0.5), 'lectern-top');
  place(lecternTop, 0, 1.02, 2.2, -0.35);
  group.add(lecternTop);
  // Verdict seal lamp above the dock, and the finding pin.
  const verdictMat = ST.glow(LIME, 0.2);
  const verdict = mesh(G.torus(0.75, 0.04, 8, 48), verdictMat, 'verdict-ring');
  place(verdict, 0, 2.55, 0, Math.PI / 2);
  group.add(verdict);
  const pin = buildPin('#ffb347', 'F-1 · minor · Capsule.tsx:17 · non-blocking');
  pin.group.position.set(0.55, 1.3, 0.35);
  group.add(pin.group);
  const light = new THREE.PointLight(ICE, 2.5, 8, 1.6);
  light.position.set(0, 2.6, 0.8);
  group.add(light);
  void capsuleDock;
  const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
  return {
    group,
    update(s, t, _dt, motion) {
      const e = motion === 0 ? (x: number) => (x > 0 ? 1 : 0) : ease;
      const reviewing = s.review > 0 && s.verdict < 1;
      ringMat.emissiveIntensity = 0.4 + (reviewing ? 1.4 : 0) + s.verdict * 0.6;
      inspectRing.rotation.z = motion ? t * (0.05 + (reviewing ? 0.5 : 0)) : 0;
      ringB.rotation.z = motion ? -t * (0.04 + (reviewing ? 0.4 : 0)) : 0;
      pin.group.visible = s.finding > 0;
      pin.group.scale.setScalar(Math.max(0.001, e(s.finding)));
      verdictMat.emissiveIntensity = 0.2 + e(s.verdict) * 2.0;
      light.intensity = 2.5 + (reviewing ? 2.5 : 0);
    },
  };
}
