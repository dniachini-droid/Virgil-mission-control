import seedGraph from '@virgil/test-fixtures/knowledge/seed-graph.json' with { type: 'json' };
import * as THREE from 'three';
import { G, mesh, place } from '../../characters/parts.js';
import { ST } from '../foundry/materials.js';
import { buildLane, buildPin } from '../foundry/props.js';
import { labelTexture } from '../labels.js';
import { interferenceFragment, laneVertex, scanFragment } from '../shaders.js';

/**
 * One composed knowledge cluster: the gateway ring where a verified run artifact enters, the
 * archive rack of sealed sources with its reader, the forge plinth where fragments assemble
 * into a durable structure, the contested pair with its interference lattice, and the galaxy
 * of existing durable structures behind. Forms follow the epistemic visual contract; the
 * renderer reads the class from the events and never assigns it.
 */
const ICE = '#bfe9ff';
const WHITE = '#f4f1ff';
const GLASS = '#9ad0ff';
const AMBER = '#ffb347';
const LIME = '#b6ff5c';
const GOLD = '#f5c451';
const ASH = '#7c7790';

export interface MindState {
  arrive: number;
  record: number;
  hash: number;
  read: number;
  propose: number;
  tether: number;
  contest: number;
  durable: number;
  scan: number;
}
export const emptyMindState = (): MindState => ({
  arrive: 0,
  record: 0,
  hash: 0,
  read: 0,
  propose: 0,
  tether: 0,
  contest: 0,
  durable: 0,
  scan: 0,
});

export const ML = {
  gateway: new THREE.Vector3(-17, 2.2, 3.5),
  intake: new THREE.Vector3(-9.2, 1.1, 2.6),
  runSlot: new THREE.Vector3(-8.2, 0, 0.4),
  commission: new THREE.Vector3(-11.4, 0, -1.6),
  reader: new THREE.Vector3(-6.2, 0, -0.6),
  projection: new THREE.Vector3(-5.6, 1.4, 1.6),
  forge: new THREE.Vector3(0.6, 0, 0),
  contested: new THREE.Vector3(7.4, 0, 0.6),
  monument: new THREE.Vector3(3.2, 0, -5.4),
};

function plate(text: string, color: string, height = 0.22, border?: string) {
  const { texture, aspect } = labelTexture(text, {
    size: 40,
    fg: color,
    pad: 14,
    ...(border ? { border } : {}),
  });
  return new THREE.Mesh(
    G.plane(height * aspect, height),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
  );
}

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const win = (x: number, a: number, b: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));

/** Sealed source monolith: a faceted hex prism in a cradle with a hash band and a seal cap. */
function buildMonolith(title: string, hashText: string, tall = 2.4, radius = 0.7) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.85, radius, tall, 6),
    new THREE.MeshPhysicalMaterial({
      color: '#22314a',
      metalness: 0.55,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      iridescence: 0.7,
      iridescenceIOR: 1.35,
      emissive: ICE,
      emissiveIntensity: 0.03,
      flatShading: true,
    }),
  );
  body.castShadow = true;
  body.position.y = tall / 2 + 0.3;
  group.add(body);
  const cradle = mesh(G.cyl(radius * 1.25, radius * 1.4, 0.3, 6), ST.frame(), 'cradle');
  place(cradle, 0, 0.15, 0);
  group.add(cradle);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    const clamp = mesh(G.rbox(0.12, 0.6, 0.12, 0.03), ST.alloy(), 'clamp');
    place(clamp, Math.cos(a) * radius * 1.15, 0.55, Math.sin(a) * radius * 1.15);
    group.add(clamp);
  }
  const bandMat = ST.glow(ICE, 0.2);
  const band = mesh(G.torus(radius * 1.05, 0.05, 8, 48), bandMat, 'hash-band');
  place(band, 0, tall * 0.55 + 0.3, 0, Math.PI / 2);
  group.add(band);
  const cap = mesh(G.cyl(radius * 0.7, radius * 0.95, 0.22, 6), ST.alloy(), 'seal-cap');
  place(cap, 0, tall + 0.6, 0);
  group.add(cap);
  const capGlow = mesh(G.cyl(radius * 0.3, radius * 0.3, 0.05, 6), bandMat, 'seal-glyph');
  place(capGlow, 0, tall + 0.72, 0);
  group.add(capGlow);
  const titlePlate = plate(title, ICE, 0.24, ICE);
  place(titlePlate, 0, tall + 1.15, 0);
  group.add(titlePlate);
  const hashPlate = plate(hashText, ICE, 0.16);
  place(hashPlate, 0, tall * 0.55 + 0.3, radius * 1.15);
  group.add(hashPlate);
  return {
    group,
    body,
    bandMat,
    cap,
    hashPlate,
    setSealed(s: number) {
      bandMat.emissiveIntensity = 0.2 + s * 2.4;
      (body.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.03 + s * 0.12;
      cap.position.y = tall + 0.6 + (1 - s) * 0.5;
      capGlow.position.y = cap.position.y + 0.12;
      hashPlate.visible = s > 0.5;
    },
  };
}

/** Translucent wireframe fragment: an AI-generated hypothesis until approval. */
function buildFragment(color: string) {
  const group = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(0.55, 0);
  const wire = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      color,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
      toneMapped: false,
    }),
  );
  group.add(wire);
  const fill = new THREE.Mesh(
    geo,
    new THREE.MeshPhysicalMaterial({
      color,
      transparent: true,
      opacity: 0.18,
      roughness: 0.2,
      metalness: 0.1,
      transmission: 0.4,
    }),
  );
  group.add(fill);
  return { group, wire, fill };
}

/** Durable structure: a faceted opaque crystal with continuous edge lines and a signature band. */
function buildDurable() {
  const group = new THREE.Group();
  const geo = new THREE.DodecahedronGeometry(0.95, 0);
  const body = new THREE.Mesh(
    geo,
    new THREE.MeshPhysicalMaterial({
      color: '#e9e4f4',
      metalness: 0.15,
      roughness: 0.28,
      clearcoat: 0.8,
      iridescence: 0.4,
      flatShading: true,
      emissive: WHITE,
      emissiveIntensity: 0.08,
    }),
  );
  body.castShadow = true;
  group.add(body);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: ICE, transparent: true, opacity: 0.9 }),
  );
  group.add(edges);
  const sigMat = ST.glow(LIME, 0);
  const sig = mesh(G.torus(1.15, 0.04, 8, 56), sigMat, 'signature-band');
  place(sig, 0, -0.1, 0, Math.PI / 2 + 0.2);
  group.add(sig);
  return { group, body, sigMat };
}

function buildTether(from: THREE.Vector3, to: THREE.Vector3, color: string) {
  const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 0.9, 0));
  const curve = new THREE.CatmullRomCurve3([from, mid, to]);
  const points = curve.getPoints(48);
  const geom = new THREE.BufferGeometry().setFromPoints(points);
  const dashed = new THREE.LineDashedMaterial({
    color,
    dashSize: 0.3,
    gapSize: 0.22,
    transparent: true,
    opacity: 0.8,
  });
  const solid = new THREE.LineBasicMaterial({ color: ICE, transparent: true, opacity: 0.95 });
  const line = new THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial | THREE.LineDashedMaterial>(geom, dashed);
  line.computeLineDistances();
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.018, 6, false), ST.glow(ICE, 0.6));
  tube.visible = false;
  return {
    line,
    tube,
    set(progress: number, intact: number) {
      geom.setDrawRange(0, Math.max(0, Math.floor(48 * progress)));
      line.visible = progress > 0.01 && intact < 0.99;
      line.material = intact > 0.5 ? solid : dashed;
      tube.visible = intact > 0.01;
      tube.scale.setScalar(Math.max(0.001, intact));
      (tube.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + intact * 0.6;
    },
  };
}

export function buildMindCluster() {
  const group = new THREE.Group();
  group.name = 'mind-cluster';

  // Deck: a broad dark disc for the three workstations, and a suspended foreground walkway.
  const deck = mesh(G.cyl(13, 13.6, 0.5, 12), ST.dark(), 'mind-deck');
  place(deck, -1, -0.25, 0);
  group.add(deck);
  const deckTrim = mesh(G.torus(13, 0.03, 6, 12), ST.glow(ICE, 0.35), 'mind-deck-trim');
  place(deckTrim, -1, 0.01, 0, Math.PI / 2);
  group.add(deckTrim);
  const walkway = mesh(G.rbox(30, 0.24, 1.6, 0.05), ST.alloy(), 'walkway');
  place(walkway, -2, 0.12, 7.6);
  group.add(walkway);
  for (let i = 0; i < 9; i++) {
    const post = mesh(G.cyl(0.03, 0.04, 0.9, 6), ST.frame(), 'rail-post');
    place(post, -16 + i * 3.5, 0.65, 8.3);
    group.add(post);
  }
  const rail = mesh(G.cyl(0.03, 0.03, 30, 6), ST.frame(), 'rail');
  place(rail, -2, 1.1, 8.3, 0, 0, Math.PI / 2);
  group.add(rail);

  // Gateway: a large threshold ring on the left with a lane to the archive intake.
  const gate = new THREE.Group();
  gate.position.copy(ML.gateway);
  const gateRing = mesh(G.torus(2.6, 0.18, 12, 64), ST.frame(), 'gateway-ring');
  gate.add(gateRing);
  const gateGlow = ST.glow(ICE, 0.5);
  const gateInner = mesh(G.torus(2.25, 0.05, 8, 64), gateGlow, 'gateway-glow');
  gate.add(gateInner);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const spar = mesh(G.rbox(0.25, 1.2, 0.25, 0.04), ST.alloy(), 'gate-spar');
    place(spar, Math.cos(a) * 2.7, Math.sin(a) * 2.7, 0, 0, 0, a + Math.PI / 2);
    gate.add(spar);
  }
  const gateStand = mesh(G.rbox(1.2, 2.2, 0.8, 0.08), ST.dark(), 'gate-stand');
  place(gateStand, 0, -2.2 - 0.9, 0);
  gate.add(gateStand);
  const gatePlate = plate('GATEWAY · from the Foundry · evidence only', ICE, 0.26, ICE);
  place(gatePlate, 0, 3.3, 0);
  gate.add(gatePlate);
  gate.rotation.y = Math.PI / 2 - 0.35;
  group.add(gate);
  const lane = buildLane(
    [
      ML.gateway.clone().add(new THREE.Vector3(0.4, -1.0, 0)),
      new THREE.Vector3(-13.5, 1.6, 3.2),
      ML.intake.clone(),
    ],
    ICE,
    0.14,
  );
  group.add(lane.group);
  // Transmission artifact: a small sealed hex canister that rides the lane.
  const artifact = new THREE.Group();
  const canister = mesh(G.cyl(0.32, 0.36, 0.9, 6), ST.hull(), 'run-artifact');
  canister.rotation.z = Math.PI / 2;
  artifact.add(canister);
  const artBand = mesh(G.torus(0.36, 0.035, 8, 24), ST.glow(LIME, 1.6), 'artifact-band');
  artBand.rotation.y = Math.PI / 2;
  artifact.add(artBand);
  artifact.visible = false;
  group.add(artifact);

  // Archive rack: a curved shelf structure holding the commission monolith and the run slot.
  const rack = new THREE.Group();
  rack.position.set(-9.4, 0, -0.6);
  const rackBack = mesh(G.rbox(7.5, 4.6, 0.5, 0.1), ST.dark(), 'rack-back');
  place(rackBack, 0, 2.3, -2.6);
  rack.add(rackBack);
  for (let i = 0; i < 3; i++) {
    const shelf = mesh(G.rbox(7.2, 0.12, 1.1, 0.03), ST.frame(), 'shelf');
    place(shelf, 0, 1.2 + i * 1.5, -2.1);
    rack.add(shelf);
    const strip = mesh(G.rbox(6.8, 0.03, 0.03, 0.01), ST.glow(ICE, 0.6), 'shelf-strip');
    place(strip, 0, 1.27 + i * 1.5, -1.56);
    rack.add(strip);
    for (let j = 0; j < 5; j++) {
      const tablet = mesh(G.rbox(0.5, 0.9, 0.3, 0.04), j % 2 ? ST.ceramic() : ST.alloy(), 'archive-tablet');
      place(tablet, -3 + j * 1.5 + (i % 2) * 0.4, 1.75 + i * 1.5, -2.1, 0, (j - 2) * 0.08);
      rack.add(tablet);
    }
  }
  const rackPlate = plate('ARCHIVE · sealed raw sources', ICE, 0.28);
  place(rackPlate, 0, 5.1, -2.3);
  rack.add(rackPlate);
  group.add(rack);
  const commission = buildMonolith('src-master-commission', 'sha256:95e8cc69… · sealed', 3.0, 0.85);
  commission.group.position.copy(ML.commission);
  commission.setSealed(1);
  group.add(commission.group);
  const run = buildMonolith('src-run-pass', 'sha256:2e50d389… · sealed', 2.2, 0.62);
  run.group.position.copy(ML.runSlot);
  group.add(run.group);
  // Reader: a projector arm on a post that casts the non-destructive projection.
  const reader = new THREE.Group();
  reader.position.copy(ML.reader);
  const readerPost = mesh(G.cyl(0.12, 0.16, 2.6, 10), ST.frame(), 'reader-post');
  place(readerPost, 0, 1.3, 0);
  reader.add(readerPost);
  const readerArm = new THREE.Group();
  readerArm.position.set(0, 2.5, 0);
  const armBar = mesh(G.rbox(1.8, 0.12, 0.14, 0.03), ST.alloy(), 'reader-arm');
  place(armBar, -0.9, 0, 0);
  readerArm.add(armBar);
  const lensRim = mesh(G.torus(0.28, 0.04, 8, 32), ST.frame(), 'reader-lens-rim');
  place(lensRim, -1.8, -0.15, 0, Math.PI / 2);
  readerArm.add(lensRim);
  const lensGlow = ST.glow(ICE, 0.3);
  const lens = mesh(G.cyl(0.25, 0.25, 0.04, 24), lensGlow, 'reader-lens');
  place(lens, -1.8, -0.15, 0);
  readerArm.add(lens);
  reader.add(readerArm);
  group.add(reader);
  const readerPlate = plate('reader · non-destructive', ASH, 0.16);
  place(readerPlate, ML.reader.x, 3.1, ML.reader.z);
  group.add(readerPlate);
  // Projection: a wireframe ghost of the run monolith beside the original.
  const projection = new THREE.Mesh(
    new THREE.CylinderGeometry(0.53, 0.62, 2.2, 6),
    new THREE.MeshBasicMaterial({ color: ICE, wireframe: true, transparent: true, opacity: 0, toneMapped: false }),
  );
  projection.position.copy(ML.projection).add(new THREE.Vector3(0, 1.0, 0));
  group.add(projection);
  const projectionPlate = plate('light projection · original unchanged', ICE, 0.16);
  place(projectionPlate, ML.projection.x, 3.0, ML.projection.z);
  projectionPlate.visible = false;
  group.add(projectionPlate);

  // Forge: a ring plinth with three field pylons; fragments assemble here.
  const forge = new THREE.Group();
  forge.position.copy(ML.forge);
  const plinth = mesh(G.cyl(2.2, 2.5, 0.5, 24), ST.dark(), 'forge-plinth');
  place(plinth, 0, 0.25, 0);
  forge.add(plinth);
  const plinthTrim = mesh(G.torus(2.2, 0.035, 6, 64), ST.glow(GLASS, 0.6), 'forge-trim');
  place(plinthTrim, 0, 0.51, 0, Math.PI / 2);
  forge.add(plinthTrim);
  const pedestal = mesh(G.cyl(0.55, 0.75, 0.8, 12), ST.alloy(), 'forge-pedestal');
  place(pedestal, 0, 0.9, 0);
  forge.add(pedestal);
  const forgeGlow = ST.glow(GLASS, 0.4);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.6;
    const pylon = mesh(G.rbox(0.22, 3.2, 0.22, 0.04), ST.frame(), 'pylon');
    place(pylon, Math.cos(a) * 2.0, 2.1, Math.sin(a) * 2.0);
    forge.add(pylon);
    const emitter = mesh(G.sphere(0.12, 10, 8), forgeGlow, 'pylon-emitter');
    place(emitter, Math.cos(a) * 2.0, 3.8, Math.sin(a) * 2.0);
    forge.add(emitter);
  }
  const forgePlate = plate('SYNAPTIC FORGE · proposals become durable only after approval', GLASS, 0.24);
  place(forgePlate, 0, 4.6, 0);
  forge.add(forgePlate);
  group.add(forge);
  const fragA = buildFragment(GLASS);
  const fragB = buildFragment(GLASS);
  fragA.group.visible = false;
  fragB.group.visible = false;
  group.add(fragA.group, fragB.group);
  const durable = buildDurable();
  durable.group.position.copy(ML.forge).add(new THREE.Vector3(0, 2.3, 0));
  durable.group.visible = false;
  group.add(durable.group);
  const durablePlate = plate('lesson-capsule-sha-legibility · compiled · verified', WHITE, 0.2, LIME);
  place(durablePlate, ML.forge.x, 4.0, ML.forge.z + 0.8);
  durablePlate.visible = false;
  group.add(durablePlate);
  const fragSeatA = ML.forge.clone().add(new THREE.Vector3(0, 2.3, 0));
  const fragSeatB = ML.contested.clone().add(new THREE.Vector3(0, 1.9, 0));
  const tetherRun = buildTether(fragSeatA, ML.runSlot.clone().add(new THREE.Vector3(0, 2.0, 0)), GLASS);
  const tetherCommission = buildTether(
    fragSeatA,
    ML.commission.clone().add(new THREE.Vector3(0, 2.4, 0)),
    GLASS,
  );
  const tetherB = buildTether(fragSeatB, ML.runSlot.clone().add(new THREE.Vector3(0, 1.6, 0)), GLASS);
  for (const t of [tetherRun, tetherCommission, tetherB]) group.add(t.line, t.tube);

  // Contested station: a low platform where the disputed claim splits into two halves.
  const contest = new THREE.Group();
  contest.position.copy(ML.contested);
  const cPlinth = mesh(G.cyl(1.7, 1.9, 0.4, 8), ST.dark(), 'contest-plinth');
  place(cPlinth, 0, 0.2, 0);
  contest.add(cPlinth);
  const cTrim = mesh(G.torus(1.7, 0.03, 6, 8), ST.glow(AMBER, 0.4), 'contest-trim');
  place(cTrim, 0, 0.41, 0, Math.PI / 2);
  contest.add(cTrim);
  const halfGeo = new THREE.IcosahedronGeometry(0.55, 0);
  const halfMat = new THREE.MeshPhysicalMaterial({
    color: '#3a2a1a',
    emissive: AMBER,
    emissiveIntensity: 0.4,
    roughness: 0.4,
    metalness: 0.3,
    flatShading: true,
  });
  const halfA = new THREE.Mesh(halfGeo, halfMat);
  const halfB = new THREE.Mesh(halfGeo, halfMat.clone());
  halfA.position.set(-0.7, 1.9, 0);
  halfB.position.set(0.7, 1.9, 0);
  halfA.visible = false;
  halfB.visible = false;
  contest.add(halfA, halfB);
  const latticeUniforms = { uColor: { value: new THREE.Color(AMBER) }, uTime: { value: 0 } };
  const lattice = new THREE.Mesh(
    G.plane(1.4, 1.2),
    new THREE.ShaderMaterial({
      uniforms: latticeUniforms,
      vertexShader: laneVertex,
      fragmentShader: interferenceFragment,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  place(lattice, 0, 1.9, 0);
  lattice.visible = false;
  contest.add(lattice);
  const contestPlate = plate('C-lesson-bloom ⇄ C-artbible-bloom-cap · contested', AMBER, 0.2, AMBER);
  place(contestPlate, 0, 3.0, 0);
  contestPlate.visible = false;
  contest.add(contestPlate);
  const pin = buildPin(AMBER, 'scan-1-001 · contradiction · both sources cited');
  pin.group.position.set(0.9, 2.3, 0.5);
  contest.add(pin.group);
  group.add(contest);

  // Scan wave on the deck.
  const scanUniforms = { uColor: { value: new THREE.Color(ICE) }, uRadius: { value: 0 }, uActive: { value: 0 } };
  const scanWave = new THREE.Mesh(
    G.plane(30, 30),
    new THREE.ShaderMaterial({
      uniforms: scanUniforms,
      vertexShader: laneVertex,
      fragmentShader: scanFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  place(scanWave, -1, 0.06, 0, -Math.PI / 2);
  group.add(scanWave);

  // Owner decision monument (OD-0001): gold sealed monument on a plinth, still.
  const monument = new THREE.Group();
  monument.position.copy(ML.monument);
  const mPlinth = mesh(G.cyl(1.0, 1.15, 0.5, 8), ST.dark(), 'monument-plinth');
  place(mPlinth, 0, 0.25, 0);
  monument.add(mPlinth);
  const mBody = mesh(G.rbox(1.0, 2.2, 0.5, 0.08), ST.alloy(), 'monument');
  place(mBody, 0, 1.6, 0);
  monument.add(mBody);
  const seal = mesh(G.cyl(0.32, 0.32, 0.08, 8), ST.glow(GOLD, 1.4), 'owner-seal');
  place(seal, 0, 2.0, 0.28, Math.PI / 2);
  monument.add(seal);
  const collar = mesh(G.torus(0.5, 0.04, 8, 8), ST.gold(), 'keyed-collar');
  place(collar, 0, 0.62, 0, Math.PI / 2);
  monument.add(collar);
  const mPlate = plate('OD-0001 · owner decision · sealed', GOLD, 0.2, GOLD);
  place(mPlate, 0, 3.1, 0);
  monument.add(mPlate);
  group.add(monument);

  // Galaxy: existing durable structures from the seed graph, arranged by kind behind the cluster
  // with faint tethers to the commission monolith. Depth and scale, never a bare graph.
  const galaxy = new THREE.Group();
  const nodes = (seedGraph as { nodes: Array<{ id: string; kind: string | null; title: string }> }).nodes;
  const kindY: Record<string, number> = {
    principle: 7,
    governance: 5,
    architecture_concept: 4,
    agent_role: 3,
    visual_language: 6,
    glossary_term: 2,
  };
  nodes.forEach((n, i) => {
    const a = -0.9 + (i / Math.max(1, nodes.length - 1)) * 1.8;
    const r = 19 + (i % 3) * 6;
    const x = -1 + Math.sin(a) * r;
    const z = -6 - Math.cos(a) * r * 0.6;
    const y = (kindY[n.kind ?? ''] ?? 3) + (i % 2) * 1.2;
    const size = 0.5 + ((i * 7) % 5) * 0.14;
    const geo =
      n.kind === 'principle'
        ? new THREE.OctahedronGeometry(size, 0)
        : n.kind === 'governance'
          ? new THREE.DodecahedronGeometry(size, 0)
          : n.kind === 'architecture_concept'
            ? new THREE.TorusKnotGeometry(size * 0.6, size * 0.18, 48, 8)
            : new THREE.IcosahedronGeometry(size, 0);
    const m = new THREE.Mesh(
      geo,
      new THREE.MeshPhysicalMaterial({
        color: '#d9d3e6',
        metalness: 0.2,
        roughness: 0.35,
        flatShading: true,
        emissive: n.kind === 'principle' ? WHITE : ICE,
        emissiveIntensity: n.kind === 'principle' ? 0.5 : 0.12,
      }),
    );
    m.position.set(x, y, z);
    m.rotation.set(i * 0.4, i * 0.7, 0);
    galaxy.add(m);
    const e = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: ICE, transparent: true, opacity: 0.5 }),
    );
    e.position.copy(m.position);
    e.rotation.copy(m.rotation);
    galaxy.add(e);
    const pts = [m.position.clone(), ML.commission.clone().add(new THREE.Vector3(0, 3.5, 0))];
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: ICE, transparent: true, opacity: 0.12 }),
    );
    galaxy.add(line);
    const p = plate(n.title.length > 26 ? `${n.title.slice(0, 24)}…` : n.title, ICE, 0.32);
    p.position.set(x, y + size + 0.5, z);
    galaxy.add(p);
  });
  group.add(galaxy);
  // Archive dust: slow drifting points in the archive volume.
  const dustCount = 400;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = -18 + Math.random() * 30;
    dustPos[i * 3 + 1] = Math.random() * 9;
    dustPos[i * 3 + 2] = -14 + Math.random() * 22;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ color: '#c56f9a', size: 0.06, transparent: true, opacity: 0.6, depthWrite: false }),
  );
  group.add(dust);

  const light = new THREE.PointLight(ICE, 4, 14, 1.5);
  light.position.set(-8, 5, 2);
  group.add(light);
  const forgeLight = new THREE.PointLight(GLASS, 4, 12, 1.5);
  forgeLight.position.copy(ML.forge).add(new THREE.Vector3(0, 5, 2));
  group.add(forgeLight);

  return {
    group,
    update(s: MindState, t: number, dt: number, motion: number) {
      const e = motion === 0 ? (x: number) => (x > 0 ? 1 : 0) : ease;
      lane.tick(dt);
      // Arrival: the artifact rides the gateway lane to the intake; then becomes the run monolith.
      const arriving = s.arrive > 0 && s.arrive < 1;
      lane.set(s.arrive > 0 ? 1 : 0, s.arrive, arriving ? 1 : 0);
      lane.sled.visible = arriving;
      artifact.visible = s.arrive > 0 && s.record < 0.5;
      if (arriving) {
        lane.placeSled(s.arrive);
        artifact.position.copy(lane.pointAt(s.arrive)).add(new THREE.Vector3(0, 0.3, 0));
      } else if (s.arrive >= 1) artifact.position.copy(ML.intake).add(new THREE.Vector3(0, 0.3, 0));
      gateGlow.emissiveIntensity = 0.5 + (arriving ? 1.5 : 0);
      gateInner.rotation.z = motion ? t * 0.05 : 0;
      run.group.visible = s.record > 0;
      run.group.scale.setScalar(Math.max(0.001, e(s.record)));
      run.setSealed(e(s.hash));
      // Read: the arm swings over the run monolith and the projection appears beside it.
      const reading = s.read > 0;
      readerArm.rotation.y = -0.6 + e(s.read) * 0.6 + (motion ? Math.sin(t * 0.7) * 0.02 : 0);
      lensGlow.emissiveIntensity = 0.3 + (s.read > 0 && s.read < 1 ? 2 : 0) + (reading ? 0.6 : 0);
      (projection.material as THREE.MeshBasicMaterial).opacity = 0.7 * e(s.read) * (1 - 0.5 * e(s.propose));
      projectionPlate.visible = s.read > 0.4 && s.propose === 0;
      projection.rotation.y = motion ? t * 0.1 : 0;
      // Propose: fragments separate from the projection and drift to their seats.
      const pk = e(s.propose);
      fragA.group.visible = s.propose > 0 && s.durable < 0.9;
      fragB.group.visible = s.propose > 0 && s.contest < 0.5;
      const start = ML.projection.clone().add(new THREE.Vector3(0, 1.2, 0));
      fragA.group.position.copy(start).lerp(fragSeatA, pk);
      fragB.group.position.copy(start.clone().add(new THREE.Vector3(0.4, 0.6, 0.4))).lerp(fragSeatB, pk);
      fragA.group.position.y += Math.sin(pk * Math.PI) * 1.2;
      fragB.group.position.y += Math.sin(pk * Math.PI) * 1.6;
      fragA.group.rotation.y = motion ? t * 0.25 : 0;
      fragB.group.rotation.y = motion ? -t * 0.2 : 0;
      forgeGlow.emissiveIntensity = 0.4 + pk * 1.2 + e(s.durable) * 1.0;
      // Tethers: dashed while proposed, continuous once the provenance event lands.
      const tk = e(s.tether);
      tetherRun.set(pk, tk);
      tetherCommission.set(pk, tk);
      tetherB.set(pk, 0);
      // Contest: fragment B splits into two amber halves with a standing interference lattice.
      const ck = e(s.contest);
      halfA.visible = s.contest > 0;
      halfB.visible = s.contest > 0;
      halfA.position.x = -0.15 - 0.6 * ck;
      halfB.position.x = 0.15 + 0.6 * ck;
      halfA.rotation.y = motion ? t * 0.3 : 0;
      halfB.rotation.y = motion ? -t * 0.3 : 0;
      lattice.visible = s.contest > 0.3;
      lattice.scale.setScalar(Math.max(0.001, win(ck, 0.3, 1)));
      latticeUniforms.uTime.value = motion ? t : 0.5;
      contestPlate.visible = s.contest > 0.6;
      (cTrim.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + ck * 1.2;
      // Durable: the supported fragment assembles into the solid structure; signature band engages.
      const dk = e(s.durable);
      durable.group.visible = s.durable > 0;
      durable.group.scale.setScalar(Math.max(0.001, dk));
      durable.group.rotation.y = motion ? t * 0.08 : 0;
      durable.sigMat.emissiveIntensity = dk * 2.2;
      durablePlate.visible = s.durable > 0.8;
      fragA.group.scale.setScalar(Math.max(0.001, 1 - dk));
      // Scan: one wave crosses the deck; the beacon pins the contested pair.
      const sk = s.scan;
      scanUniforms.uActive.value = sk > 0 && sk < 1 ? 1 : 0;
      scanUniforms.uRadius.value = e(sk) * 0.95;
      pin.group.visible = sk > 0.7;
      pin.group.scale.setScalar(Math.max(0.001, win(e(sk), 0.7, 1)));
      // Ambient: galaxy structures turn slowly; dust drifts.
      galaxy.children.forEach((c, i) => {
        if (c instanceof THREE.Mesh || c instanceof THREE.LineSegments)
          c.rotation.y += dt * 0.01 * (1 + (i % 3)) * motion;
      });
      dust.rotation.y += dt * 0.004 * motion;
    },
  };
}
