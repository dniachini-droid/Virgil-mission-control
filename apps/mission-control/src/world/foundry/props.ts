import * as THREE from 'three';
import { G, mesh, place } from '../../characters/parts.js';
import { labelTexture } from '../labels.js';
import { laneFragment, laneVertex } from '../shaders.js';
import { ST } from './materials.js';

/** Physical props shared by the stations: the sealed capsule, file modules, and transport lanes. */

export interface Prop {
  group: THREE.Group;
}

/** Sealed SHA capsule: iridescent hull, brass seal collars, an emissive identity band. */
export function buildCapsule(accent: string, short: string) {
  const group = new THREE.Group();
  group.name = 'capsule';
  const hull = mesh(G.capsule(0.42, 0.9, 6, 28), ST.hull(), 'hull');
  hull.rotation.z = Math.PI / 2;
  group.add(hull);
  const bandMat = ST.glow(accent, 0.3);
  const band = mesh(G.torus(0.45, 0.045, 10, 48), bandMat, 'sha-band');
  band.rotation.y = Math.PI / 2;
  group.add(band);
  const collars: THREE.Mesh[] = [];
  // The collars own their material: sealing recolours them to brass and must never touch a shared frame.
  const collarMat = new THREE.MeshPhysicalMaterial({
    color: '#3a3652',
    metalness: 0.6,
    roughness: 0.45,
  });
  for (const x of [-0.55, 0.55]) {
    const c = mesh(G.torus(0.36, 0.05, 8, 40), collarMat, 'collar');
    c.rotation.y = Math.PI / 2;
    c.position.x = x;
    group.add(c);
    collars.push(c);
    const cap = mesh(G.cyl(0.2, 0.26, 0.12, 16), ST.alloy(), 'end-cap');
    place(cap, x + Math.sign(x) * 0.36, 0, 0, 0, 0, Math.PI / 2);
    group.add(cap);
  }
  // Engraved SHA plate on the hull (a small label plate, part of the object, not a billboard).
  const { texture, aspect } = labelTexture(short, {
    size: 44,
    fg: accent,
    bg: 'rgba(8,6,20,0.92)',
    pad: 14,
  });
  const plate = new THREE.Mesh(
    G.plane(0.44 * aspect * 0.5, 0.22),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false }),
  );
  place(plate, 0, 0.1, 0.43, -0.25);
  group.add(plate);
  return {
    group,
    /** 0 unsealed (collars ash, band dark) → 1 sealed (brass collars, band lit). */
    setSealed(s: number) {
      collarMat.color.lerpColors(new THREE.Color('#3a3652'), new THREE.Color('#c9a24d'), s);
      collarMat.metalness = 0.6 + s * 0.3;
      bandMat.emissiveIntensity = 0.3 + s * 2.4;
      plate.visible = s > 0.5;
    },
    setBand(intensity: number) {
      bandMat.emissiveIntensity = intensity;
    },
  };
}

/** A file module: three rounded slabs with an emissive edge, able to open into a cross-section. */
export function buildModule(accent: string) {
  const group = new THREE.Group();
  group.name = 'module';
  const slabs: THREE.Mesh[] = [];
  const edgeMat = ST.glow(accent, 0.4);
  for (let i = 0; i < 3; i++) {
    const slab = mesh(G.rbox(0.56, 0.09, 0.4, 0.03), ST.ceramic(), 'slab');
    slab.position.y = (i - 1) * 0.12;
    group.add(slab);
    slabs.push(slab);
    const edge = mesh(G.rbox(0.5, 0.02, 0.36, 0.008), edgeMat, 'slab-edge');
    edge.position.y = (i - 1) * 0.12 + 0.05;
    group.add(edge);
  }
  const frame = mesh(G.rbox(0.62, 0.42, 0.46, 0.05), ST.glass('#5ef2ff'), 'frame');
  frame.visible = false;
  group.add(frame);
  return {
    group,
    /** open 0..1 separates the slabs into a readable cross-section. */
    setOpen(open: number) {
      slabs.forEach((s, i) => {
        s.position.y = (i - 1) * (0.12 + open * 0.16);
        (group.children[i * 2 + 1] as THREE.Mesh).position.y = s.position.y + 0.05;
      });
      edgeMat.emissiveIntensity = 0.4 + open * 1.4;
    },
    /** The fabrication frame shows while a new module is being written. */
    setFrame(v: number) {
      frame.visible = v > 0.01 && v < 0.99;
      (frame.material as THREE.MeshPhysicalMaterial).opacity = 0.9 * (1 - v);
      slabs.forEach((s) => s.scale.setScalar(Math.max(0.001, v)));
    },
    setEdge(intensity: number) {
      edgeMat.emissiveIntensity = intensity;
    },
  };
}

/** An emissive transport lane along a curve, with a carrier sled that can move an object along it. */
export function buildLane(points: THREE.Vector3[], color: string, radius = 0.16) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3);
  const group = new THREE.Group();
  group.name = 'lane';
  const uniforms = {
    uColor: { value: new THREE.Color(color) },
    uProgress: { value: 0 },
    uCharge: { value: 0 },
    uTime: { value: 0 },
    uPacket: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: laneVertex,
    fragmentShader: laneFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, radius, 12, false), mat);
  tube.frustumCulled = false;
  group.add(tube);
  // Physical rail under the light: a thin alloy rail with support posts, so the lane is a thing.
  const rail = mesh(new THREE.TubeGeometry(curve, 60, 0.045, 6, false), ST.cable(), 'rail');
  rail.position.y = -radius * 1.1;
  group.add(rail);
  const posts = Math.max(2, Math.floor(curve.getLength() / 2.4));
  for (let i = 0; i <= posts; i++) {
    const p = curve.getPointAt(i / posts);
    const post = mesh(G.cyl(0.03, 0.045, Math.max(0.1, p.y - 0.1), 8), ST.frame(), 'post');
    place(post, p.x, (p.y - 0.1) / 2, p.z);
    group.add(post);
    const foot = mesh(G.cyl(0.1, 0.12, 0.05, 10), ST.dark(), 'post-foot');
    place(foot, p.x, 0.025, p.z);
    group.add(foot);
  }
  // Carrier sled: a small cradle with lamps that holds whatever travels.
  const sled = new THREE.Group();
  sled.name = 'sled';
  const base = mesh(G.rbox(1.1, 0.1, 0.5, 0.04), ST.alloy(), 'sled-base');
  sled.add(base);
  const sledLamp = ST.glow(color, 0.4);
  for (const x of [-0.45, 0.45]) {
    const lamp = mesh(G.rbox(0.08, 0.04, 0.4, 0.015), sledLamp, 'sled-lamp');
    place(lamp, x, 0.07, 0);
    sled.add(lamp);
    const arm = mesh(G.torus(0.42, 0.03, 6, 24, Math.PI), ST.frame(), 'sled-arm');
    place(arm, x, 0.05, 0, 0, Math.PI / 2, 0);
    sled.add(arm);
  }
  sled.visible = false;
  group.add(sled);
  const tmp = new THREE.Vector3();
  return {
    group,
    curve,
    sled,
    set(charge: number, progress: number, packet: number) {
      uniforms.uCharge.value = charge;
      uniforms.uProgress.value = progress;
      uniforms.uPacket.value = packet;
      sledLamp.emissiveIntensity = 0.4 + charge * 1.6;
    },
    tick(dt: number) {
      uniforms.uTime.value += dt;
    },
    /** Place the sled at t along the curve, facing along it. */
    placeSled(t: number) {
      const p = curve.getPointAt(THREE.MathUtils.clamp(t, 0, 1));
      sled.position.copy(p).add(tmp.set(0, -0.06, 0));
      const tangent = curve.getTangentAt(THREE.MathUtils.clamp(t, 0, 1));
      sled.rotation.y = Math.atan2(tangent.x, tangent.z) - Math.PI / 2;
    },
    pointAt(t: number) {
      return curve.getPointAt(THREE.MathUtils.clamp(t, 0, 1));
    },
  };
}

/** A hovering holographic marker: a small flag plate on a thin stalk, used for finding pins and violation marks. */
export function buildPin(color: string, text: string) {
  const group = new THREE.Group();
  group.name = 'pin';
  const stalk = mesh(G.cyl(0.012, 0.012, 0.5, 6), ST.glow(color, 1.2), 'pin-stalk');
  stalk.position.y = 0.25;
  group.add(stalk);
  const head = mesh(G.sphere(0.05, 10, 8), ST.glow(color, 2), 'pin-head');
  head.position.y = 0.52;
  group.add(head);
  const { texture, aspect } = labelTexture(text, { size: 36, fg: color, border: color, pad: 12 });
  const plate = new THREE.Mesh(
    G.plane(0.26 * aspect, 0.26),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
  );
  place(plate, 0.13 * aspect + 0.05, 0.52, 0);
  group.add(plate);
  group.visible = false;
  return { group, plate };
}
