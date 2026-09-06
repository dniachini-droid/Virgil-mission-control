import * as THREE from 'three';
import { FACE } from './faces.js';
import { damp, G, M, mesh, place, SHELL } from './parts.js';
import { ScreenMaterial } from './screen.js';

/**
 * Original procedural robot-astronaut rig shared by the four core roles.
 *
 * One body assembly (root → body → torso, head, arms, legs) with named sockets; role builders
 * add shells and equipment on the sockets and return an `update` hook for their instruments.
 * Motion is procedural: locomotion (stride, bob, arm swing) from actual distance travelled,
 * poses per mode blended by exponential damping, blink and micro-expression on the character's
 * own clocks. Work poses are only ever requested by an authenticated step; idle is breath,
 * weight shift, antenna twitches and blinks.
 */
export type BotRole = 'fabricator' | 'prover' | 'keeper' | 'virgil';
export type BotMode = 'idle' | 'walk' | 'work' | 'wait' | 'refuse' | 'present';

export interface BotSpec {
  role: BotRole;
  shell: string;
  accent: string;
  eye: string;
  screenGlow?: number;
  torso: { w: number; h: number; d: number; r: number };
  arms: boolean;
  armRadius?: number;
  headScale?: number;
}

export const SPECS: Record<BotRole, BotSpec> = {
  fabricator: {
    role: 'fabricator',
    shell: SHELL.cream,
    accent: '#5ef2ff',
    eye: '#7df6ff',
    torso: { w: 0.62, h: 0.5, d: 0.48, r: 0.16 },
    arms: true,
    armRadius: 0.075,
  },
  prover: {
    role: 'prover',
    shell: SHELL.ivory,
    accent: '#b6ff5c',
    eye: '#c8ff7a',
    torso: { w: 0.4, h: 0.54, d: 0.4, r: 0.18 },
    arms: true,
  },
  keeper: {
    role: 'keeper',
    shell: SHELL.frost,
    accent: '#bfe9ff',
    eye: '#dff4ff',
    torso: { w: 0.42, h: 0.56, d: 0.38, r: 0.19 },
    arms: false,
  },
  virgil: {
    role: 'virgil',
    shell: SHELL.senior,
    accent: '#f4f1ff',
    eye: '#fff6ea',
    screenGlow: 2.8,
    torso: { w: 0.5, h: 0.52, d: 0.44, r: 0.17 },
    arms: true,
    headScale: 1.12,
  },
};

const LEG_H = 0.4;
const THIGH = 0.16;
const SHIN = 0.14;
const UPPER_ARM = 0.2;
const FOREARM = 0.18;

interface Joint {
  node: THREE.Object3D;
  target: THREE.Euler;
}

export interface RoleParts {
  /** Called every frame after the body pose is applied. */
  update: (bot: Bot, t: number, dt: number, motion: number) => void;
  /** Sockets other systems may use (e.g. where the wand tip is for a beam). */
  sockets: Record<string, THREE.Object3D>;
}

export class Bot {
  readonly root = new THREE.Group();
  readonly body = new THREE.Group();
  readonly head = new THREE.Group();
  readonly sockets: Record<string, THREE.Object3D> = {};
  readonly joints: Record<string, Joint> = {};
  readonly screen: ScreenMaterial;
  readonly spec: BotSpec;
  readonly role: RoleParts;
  readonly lamps: THREE.MeshStandardMaterial[] = [];

  /** Public control surface, written by choreography. */
  mode: BotMode = 'idle';
  pose = 'default';
  intensity = 0;
  goal: THREE.Vector3 | null = null;
  lookAt: THREE.Vector3 | null = null;
  faceOverride: number | null = null;
  speed = 1.6;

  readonly pos: THREE.Vector3;
  yaw: number;
  private targetYaw: number;
  private phase = Math.random() * Math.PI * 2;
  private walkAmp = 0;
  private bob = 0;
  private blinkAt = 1.5 + Math.random() * 4;
  private blinking = 0;
  private breath = Math.random() * 6;
  private readonly tmp = new THREE.Vector3();
  private readonly tmp2 = new THREE.Vector3();
  private readonly lookLocal = new THREE.Vector3();

  constructor(role: BotRole, position: [number, number, number] = [0, 0, 0], yaw = 0) {
    this.spec = SPECS[role];
    this.pos = new THREE.Vector3(...position);
    this.yaw = yaw;
    this.targetYaw = yaw;
    this.root.name = `bot:${role}`;
    this.root.position.copy(this.pos);
    this.root.rotation.y = yaw;
    this.body.position.y = LEG_H;
    this.root.add(this.body);
    this.screen = new ScreenMaterial({
      eye: this.spec.eye,
      glow: this.spec.screenGlow ?? 2.4,
    });
    this.buildBody();
    this.role = ROLE_BUILDERS[role](this);
    Object.assign(this.sockets, this.role.sockets);
  }

  private joint(name: string, node: THREE.Object3D): THREE.Object3D {
    this.joints[name] = { node, target: new THREE.Euler() };
    return node;
  }

  private buildBody() {
    const s = this.spec;
    const shell = M.shell(s.shell);
    const alloy = M.alloy();
    const rubber = M.rubber();
    const t = s.torso;

    // Torso: a rounded shell with a dark alloy under-frame showing at the waist.
    const torso = mesh(G.rbox(t.w, t.h, t.d, t.r), shell, 'torso');
    place(torso, 0, t.h / 2 + 0.06, 0);
    this.body.add(torso);
    const waist = mesh(G.cyl(t.w * 0.36, t.w * 0.42, 0.12, 20), alloy, 'waist');
    place(waist, 0, 0.04, 0);
    this.body.add(waist);
    // Chest lamp: the one glowing accent every family member shares (role accent colour).
    const lampMat = M.glow(s.accent, 1.2);
    this.lamps.push(lampMat);
    const lamp = mesh(G.rbox(0.1, 0.05, 0.03, 0.015), lampMat, 'chest-lamp');
    place(lamp, 0, t.h * 0.78, t.d / 2 + 0.005);
    this.body.add(lamp);

    // Neck and head. The head is the family signature: a wide rounded shell with a big
    // recessed screen, a bezel, and a rim that reads as a helmet collar.
    const neck = mesh(G.cyl(0.09, 0.11, 0.1, 14), alloy, 'neck');
    place(neck, 0, t.h + 0.08, 0);
    this.body.add(neck);
    this.head.position.set(0, t.h + 0.12, 0);
    this.body.add(this.joint('head', this.head));
    const hs = s.headScale ?? 1;
    const headGroup = new THREE.Group();
    headGroup.scale.setScalar(hs);
    headGroup.position.y = 0.3 * hs;
    this.head.add(headGroup);
    const shellHead = mesh(G.rbox(0.76, 0.6, 0.6, 0.17), shell, 'head-shell');
    headGroup.add(shellHead);
    const collar = mesh(G.torus(0.27, 0.035, 8, 32), alloy, 'collar');
    place(collar, 0, -0.29, 0, Math.PI / 2);
    headGroup.add(collar);
    // Screen: recessed panel on the front. Bezel plate first, then the screen surface.
    const bezel = mesh(G.rbox(0.64, 0.48, 0.05, 0.08), alloy, 'bezel');
    place(bezel, 0, 0.0, 0.29);
    headGroup.add(bezel);
    const screen = new THREE.Mesh(G.plane(0.6, 0.44), this.screen);
    screen.name = 'screen';
    place(screen, 0, 0.0, 0.318);
    headGroup.add(screen);
    // Brow lamp strip in the accent colour, so the role reads at distance and in greyscale by shape.
    const brow = mesh(G.rbox(0.42, 0.03, 0.02, 0.01), lampMat, 'brow');
    place(brow, 0, 0.255, 0.3);
    headGroup.add(brow);
    // Ear pods: small side instruments common to the family.
    for (const side of [-1, 1]) {
      const pod = mesh(G.cyl(0.09, 0.09, 0.06, 16), alloy, 'ear-pod');
      place(pod, side * 0.4, 0.02, 0, 0, 0, Math.PI / 2);
      headGroup.add(pod);
    }
    this.sockets.crown = place(new THREE.Group(), 0, 0.3, 0);
    headGroup.add(this.sockets.crown);
    this.sockets.headBack = place(new THREE.Group(), 0, 0, -0.3);
    headGroup.add(this.sockets.headBack);
    this.sockets.headSideL = place(new THREE.Group(), -0.4, 0.02, 0);
    this.sockets.headSideR = place(new THREE.Group(), 0.4, 0.02, 0);
    headGroup.add(this.sockets.headSideL, this.sockets.headSideR);

    // Body sockets.
    this.sockets.back = place(new THREE.Group(), 0, t.h * 0.6, -t.d / 2);
    this.sockets.belt = place(new THREE.Group(), 0, 0.1, 0);
    this.sockets.chest = place(new THREE.Group(), 0, t.h * 0.55, t.d / 2);
    this.sockets.shoulders = place(new THREE.Group(), 0, t.h + 0.02, 0);
    this.body.add(this.sockets.back, this.sockets.belt, this.sockets.chest, this.sockets.shoulders);

    // Arms (Keeper has none: it cannot touch the candidate, and the silhouette says so).
    if (s.arms) {
      for (const side of [-1, 1] as const) {
        const name = side < 0 ? 'L' : 'R';
        const shoulder = place(new THREE.Group(), side * (t.w / 2 + 0.05), t.h * 0.86, 0);
        this.body.add(this.joint(`shoulder${name}`, shoulder));
        shoulder.add(mesh(G.sphere((s.armRadius ?? 0.055) + 0.02, 14, 10), alloy, 'shoulder-ball'));
        const ar = s.armRadius ?? 0.055;
        const upper = mesh(G.capsule(ar, UPPER_ARM, 3, 10), shell, 'upper-arm');
        place(upper, 0, -UPPER_ARM / 2, 0);
        shoulder.add(upper);
        const elbow = place(new THREE.Group(), 0, -UPPER_ARM, 0);
        shoulder.add(this.joint(`elbow${name}`, elbow));
        elbow.add(mesh(G.sphere(ar + 0.005, 12, 8), alloy, 'elbow-ball'));
        const fore = mesh(G.capsule(ar * 0.92, FOREARM, 3, 10), shell, 'forearm');
        const cuff = mesh(G.cyl(ar * 1.05, ar * 1.05, 0.04, 12), lampMat, 'cuff');
        place(cuff, 0, -FOREARM + 0.02, 0);
        elbow.add(cuff);
        place(fore, 0, -FOREARM / 2, 0);
        elbow.add(fore);
        const hand = place(new THREE.Group(), 0, -FOREARM - 0.02, 0);
        elbow.add(hand);
        this.sockets[`hand${name}`] = hand;
      }
    }

    // Legs: short, sturdy, with big rounded boots.
    for (const side of [-1, 1] as const) {
      const name = side < 0 ? 'L' : 'R';
      const hip = place(new THREE.Group(), side * t.w * 0.22, 0.0, 0);
      this.body.add(this.joint(`hip${name}`, hip));
      const thigh = mesh(G.capsule(0.065, THIGH, 3, 10), alloy, 'thigh');
      place(thigh, 0, -THIGH / 2, 0);
      hip.add(thigh);
      const knee = place(new THREE.Group(), 0, -THIGH, 0);
      hip.add(this.joint(`knee${name}`, knee));
      const shin = mesh(G.capsule(0.06, SHIN, 3, 10), shell, 'shin');
      place(shin, 0, -SHIN / 2, 0);
      knee.add(shin);
      const boot = mesh(G.rbox(0.17, 0.1, 0.26, 0.045), rubber, 'boot');
      place(boot, 0, -SHIN - 0.02, 0.04);
      knee.add(boot);
      const bootTrim = mesh(G.rbox(0.18, 0.03, 0.27, 0.012), lampMat, 'boot-trim');
      place(bootTrim, 0, -SHIN + 0.02, 0.04);
      knee.add(bootTrim);
    }
  }

  /** Face frame for the current mode unless the choreography overrides it. */
  private baseFace(): number {
    if (this.faceOverride !== null) return this.faceOverride;
    const r = this.spec.role;
    switch (this.mode) {
      case 'work':
        return r === 'prover'
          ? FACE.scan
          : r === 'keeper'
            ? FACE.finding
            : r === 'virgil'
              ? FACE.route
              : FACE.focus;
      case 'wait':
        return FACE.wait;
      case 'refuse':
        return FACE.refuse;
      case 'present':
        return FACE.alert;
      case 'walk':
        return FACE.rest;
      default:
        return r === 'keeper' || r === 'virgil' ? FACE.calm : FACE.rest;
    }
  }

  /**
   * Advance the character. `motion` is 1 normally and 0 with reduced motion: locomotion snaps
   * to the goal, bob and weight shift vanish, equipment stops spinning; poses and faces remain.
   */
  update(dt: number, t: number, motion = 1) {
    const j = this.joints;
    const zero = new THREE.Euler();
    for (const k in j) j[k]!.target.copy(zero);

    // Locomotion: actual distance travelled drives the stride.
    let moved = 0;
    if (this.goal) {
      const to = this.tmp.subVectors(this.goal, this.pos);
      to.y = 0;
      const d = to.length();
      if (d > 0.04) {
        if (motion === 0) {
          this.pos.copy(this.goal);
        } else {
          const step = Math.min(d, this.speed * dt * Math.min(1, d / 0.5 + 0.35));
          to.normalize();
          this.pos.addScaledVector(to, step);
          moved = step / Math.max(dt, 1e-4);
          this.targetYaw = Math.atan2(to.x, to.z);
        }
      }
    }
    const walking = moved > 0.15;
    this.walkAmp = damp(this.walkAmp, walking ? Math.min(1, moved / this.speed) : 0, 10, dt);
    if (walking) this.phase += dt * (6.5 * (moved / this.speed) + 2);

    // Facing: the goal while walking, the lookAt target otherwise.
    if (!walking && this.lookAt) {
      const to = this.tmp.subVectors(this.lookAt, this.pos);
      if (Math.abs(to.x) + Math.abs(to.z) > 0.05) this.targetYaw = Math.atan2(to.x, to.z);
    }
    let dy = this.targetYaw - this.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.yaw += dy * (motion === 0 ? 1 : 1 - Math.exp(-7 * dt));
    this.root.position.copy(this.pos);
    this.root.rotation.y = this.yaw;

    // Stride overlay.
    const a = this.walkAmp;
    const s = Math.sin(this.phase);
    const c = Math.cos(this.phase);
    const hipL = j.hipL!;
    const hipR = j.hipR!;
    hipL.target.x = s * 0.7 * a;
    hipR.target.x = -s * 0.7 * a;
    j.kneeL!.target.x = Math.max(0, -c) * 1.0 * a;
    j.kneeR!.target.x = Math.max(0, c) * 1.0 * a;
    if (this.spec.arms) {
      j.shoulderL!.target.x = -s * 0.5 * a;
      j.shoulderR!.target.x = s * 0.5 * a;
      j.elbowL!.target.x = -0.25 * a;
      j.elbowR!.target.x = -0.25 * a;
    }
    this.bob = Math.abs(s) * 0.035 * a * motion;
    this.breath += dt;
    const breathY = motion * Math.sin((this.breath / 6) * Math.PI * 2) * 0.006;
    const sway = motion * (1 - a) * Math.sin(this.breath * 0.6) * 0.012;
    this.body.position.y = LEG_H + this.bob + breathY;
    this.body.rotation.z = sway;
    this.body.rotation.x = 0.06 * a;

    // Mode poses (added on top of the stride; the stride wins while walking).
    const stand = 1 - a;
    const k = this.intensity;
    switch (this.mode) {
      case 'work':
        this.workPose(stand, k, t);
        break;
      case 'wait':
        if (this.spec.arms) {
          j.shoulderL!.target.x += 0.15 * stand;
          j.shoulderR!.target.x += 0.15 * stand;
          j.shoulderL!.target.z += 0.12 * stand;
          j.shoulderR!.target.z -= 0.12 * stand;
        }
        j.head!.target.z += 0.12 * stand;
        j.head!.target.x += -0.08 * stand;
        break;
      case 'refuse':
        // Arms lock folded across the chest; head pulls back. Nothing is touched.
        if (this.spec.arms) {
          j.shoulderL!.target.x += -0.9 * stand;
          j.shoulderR!.target.x += -0.9 * stand;
          j.shoulderL!.target.z += 0.55 * stand;
          j.shoulderR!.target.z -= 0.55 * stand;
          j.elbowL!.target.x += -1.9 * stand;
          j.elbowR!.target.x += -1.9 * stand;
        }
        j.head!.target.x += 0.16 * stand;
        break;
      case 'present':
        // Open, offering gesture toward the lookAt target; head up.
        if (this.spec.arms) {
          j.shoulderL!.target.x += -0.7 * stand;
          j.shoulderR!.target.x += -0.7 * stand;
          j.shoulderL!.target.z += 0.6 * stand;
          j.shoulderR!.target.z -= 0.6 * stand;
          j.elbowL!.target.x += -0.5 * stand;
          j.elbowR!.target.x += -0.5 * stand;
        }
        j.head!.target.x += -0.12 * stand;
        break;
      default:
        // Idle: a slight settled slouch, arms hanging with a little outward bend.
        if (this.spec.arms) {
          j.shoulderL!.target.z += 0.1 * stand;
          j.shoulderR!.target.z -= 0.1 * stand;
          j.elbowL!.target.x += -0.2 * stand;
          j.elbowR!.target.x += -0.2 * stand;
        }
        break;
    }

    // Head tracks the look target within limits.
    if (this.lookAt && !walking) {
      this.lookLocal.copy(this.lookAt);
      this.root.worldToLocal(this.lookLocal);
      this.lookLocal.y -= LEG_H + this.spec.torso.h + 0.3;
      const yawL = Math.atan2(this.lookLocal.x, this.lookLocal.z);
      const pitch = -Math.atan2(this.lookLocal.y, Math.hypot(this.lookLocal.x, this.lookLocal.z));
      j.head!.target.y += THREE.MathUtils.clamp(yawL, -0.6, 0.6);
      j.head!.target.x += THREE.MathUtils.clamp(pitch, -0.35, 0.35);
    }

    // Blend joints toward their targets.
    const rate = motion === 0 ? 1e6 : 9;
    for (const k2 in j) {
      const jt = j[k2]!;
      const r = jt.node.rotation;
      r.x = damp(r.x, jt.target.x, rate, dt);
      r.y = damp(r.y, jt.target.y, rate, dt);
      r.z = damp(r.z, jt.target.z, rate, dt);
    }

    // Blink on the character's own clock; a refusing face does not blink.
    this.blinkAt -= dt;
    if (this.blinkAt <= 0) {
      this.blinking = 0.11;
      this.blinkAt = 2.4 + Math.random() * 4.5;
    }
    let frame = this.baseFace();
    if (this.blinking > 0) {
      this.blinking -= dt;
      if (this.mode !== 'refuse' && this.faceOverride === null) frame = FACE.blink;
    }
    this.screen.setFrame(frame);
    this.screen.setTime(t);
    this.screen.setPower(this.mode === 'work' || this.mode === 'present' ? 1.15 : 1);

    // Lamps breathe on a six-second period (ambient), brighten while working.
    const glow = 0.9 + 0.25 * Math.sin((this.breath / 6) * Math.PI * 2) * motion;
    const workGlow = this.mode === 'work' ? 0.8 + 0.6 * k : 0;
    for (const l of this.lamps) l.emissiveIntensity = glow + workGlow;

    this.role.update(this, t, dt, motion);
  }

  /** Role-flavoured work poses. `k` is the authenticated step progress 0..1. */
  private workPose(stand: number, k: number, t: number) {
    const j = this.joints;
    const r = this.spec.role;
    const swing = Math.sin(t * 6) * 0.15;
    if (r === 'fabricator') {
      if (this.pose === 'press') {
        // Both arms push down on the press handles.
        j.shoulderL!.target.x += (-1.2 + k * 0.5) * stand;
        j.shoulderR!.target.x += (-1.2 + k * 0.5) * stand;
        j.elbowL!.target.x += -0.4 * stand;
        j.elbowR!.target.x += -0.4 * stand;
        j.head!.target.x += 0.25 * stand;
      } else if (this.pose === 'load') {
        // Lift and carry into the cradle: arms forward and up.
        j.shoulderL!.target.x += (-1.4 + swing * 0.3) * stand;
        j.shoulderR!.target.x += (-1.4 - swing * 0.3) * stand;
        j.elbowL!.target.x += -0.9 * stand;
        j.elbowR!.target.x += -0.9 * stand;
        j.head!.target.x += 0.1 * stand;
      } else {
        // Assemble at the bench: wand arm working, clamp arm steadying.
        j.shoulderR!.target.x += (-1.1 + swing) * stand;
        j.elbowR!.target.x += (-1.2 + swing * 0.5) * stand;
        j.shoulderL!.target.x += -0.6 * stand;
        j.elbowL!.target.x += -1.3 * stand;
        j.head!.target.x += 0.3 * stand;
      }
    } else if (r === 'prover') {
      // Probes on the channel controls; head follows the sweep.
      j.shoulderL!.target.x += -0.9 * stand;
      j.shoulderR!.target.x += (-0.9 + swing * 0.4) * stand;
      j.elbowL!.target.x += -1.1 * stand;
      j.elbowR!.target.x += -1.1 * stand;
      j.head!.target.y += Math.sin(t * 1.5) * 0.25 * stand;
    } else if (r === 'keeper') {
      // Leans in a little; the boom and drones do the work.
      j.head!.target.x += 0.22 * stand;
      j.head!.target.y += Math.sin(t * 0.8) * 0.12 * stand;
    } else {
      // Virgil conducts: one arm raised toward the route, the other resting.
      j.shoulderR!.target.x += -1.5 * stand;
      j.shoulderR!.target.z += -0.35 * stand;
      j.elbowR!.target.x += -0.3 * stand;
      j.shoulderL!.target.z += 0.15 * stand;
      j.head!.target.x += -0.05 * stand;
    }
  }
}

// ── role builders ─────────────────────────────────────────────────────────────────────

function fabricatorParts(bot: Bot): RoleParts {
  const s = bot.spec;
  const alloy = M.alloy();
  const dark = M.alloy(SHELL.dark);
  const shell = M.shell(s.shell);
  const accent = M.glow(s.accent, 1.4);
  bot.lamps.push(accent);

  // Shoulder yokes: broad plates that widen the silhouette.
  for (const side of [-1, 1]) {
    const yoke = mesh(G.rbox(0.22, 0.09, 0.32, 0.03), alloy, 'yoke');
    place(yoke, side * 0.33, s.torso.h + 0.05, 0);
    bot.body.add(yoke);
    const stripe = mesh(G.rbox(0.2, 0.02, 0.06, 0.008), accent, 'yoke-stripe');
    place(stripe, side * 0.33, s.torso.h + 0.1, 0.1);
    bot.body.add(stripe);
  }
  // Modular tool backpack with a rack of three cartridges.
  const pack = mesh(G.rbox(0.42, 0.4, 0.2, 0.05), alloy, 'pack');
  place(pack, 0, 0.02, -0.12);
  bot.sockets.back!.add(pack);
  for (let i = 0; i < 3; i++) {
    const cart = mesh(G.cyl(0.045, 0.045, 0.3, 12), i === 1 ? shell : dark, 'cartridge');
    place(cart, (i - 1) * 0.12, 0.04, -0.25, 0, 0, 0);
    bot.sockets.back!.add(cart);
    const cap = mesh(G.cyl(0.05, 0.05, 0.03, 12), accent, 'cartridge-cap');
    place(cap, (i - 1) * 0.12, 0.2, -0.25);
    bot.sockets.back!.add(cap);
  }
  // Mismatched manipulators: a two-jaw clamp on the left, a three-finger hand on the right.
  const handL = bot.sockets.handL!;
  const clampBase = mesh(G.cyl(0.05, 0.065, 0.08, 10), dark, 'clamp-base');
  handL.add(clampBase);
  const jaws: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const jaw = mesh(G.rbox(0.035, 0.16, 0.06, 0.012), alloy, 'clamp-jaw');
    place(jaw, side * 0.05, -0.1, 0);
    handL.add(jaw);
    jaws.push(jaw);
  }
  const handR = bot.sockets.handR!;
  const palm = mesh(G.sphere(0.06, 12, 8), dark, 'palm');
  handR.add(palm);
  const fingers: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const f = mesh(G.capsule(0.018, 0.09, 2, 8), alloy, 'finger');
    const a = ((i - 1) * Math.PI) / 4;
    place(
      f,
      Math.sin(a) * 0.045,
      -0.09,
      Math.cos(a) * 0.045,
      0.25 * Math.cos(a),
      0,
      -0.25 * Math.sin(a),
    );
    handR.add(f);
    fingers.push(f);
  }
  // Luminous assembly wand held in the right hand.
  const wand = new THREE.Group();
  const grip = mesh(G.cyl(0.02, 0.02, 0.14, 8), M.rubber(), 'wand-grip');
  wand.add(grip);
  const stem = mesh(G.cyl(0.012, 0.016, 0.18, 8), alloy, 'wand-stem');
  place(stem, 0, 0.16, 0);
  wand.add(stem);
  const tipMat = M.glow(s.accent, 0.4);
  const tip = mesh(G.sphere(0.03, 10, 8), tipMat, 'wand-tip');
  place(tip, 0, 0.27, 0);
  wand.add(tip);
  place(wand, 0, -0.06, 0.06, -Math.PI / 2 + 0.3, 0, 0);
  handR.add(wand);
  const wandTip = place(new THREE.Group(), 0, 0.27, 0);
  wand.add(wandTip);

  return {
    sockets: { wandTip },
    update(b, t, _dt, motion) {
      const working = b.mode === 'work';
      tipMat.emissiveIntensity = working ? 2.6 + Math.sin(t * 14) * 0.8 * motion : 0.35;
      // Jaws open while loading, close otherwise; fingers curl to grip the wand while working.
      const open = working && b.pose === 'load' ? 0.35 : 0.05;
      jaws[0]!.position.x = -0.05 - open * 0.3;
      jaws[1]!.position.x = 0.05 + open * 0.3;
      const curl = working ? 0.5 : 0.15;
      fingers.forEach((f, i) => {
        const a = ((i - 1) * Math.PI) / 4;
        f.rotation.x = curl * Math.cos(a);
      });
      wand.visible = b.spec.role === 'fabricator';
    },
  };
}

function proverParts(bot: Bot): RoleParts {
  const s = bot.spec;
  const alloy = M.alloy();
  const dark = M.alloy(SHELL.dark);
  const accent = M.glow(s.accent, 1.2);
  bot.lamps.push(accent);

  // Waist sensor ring with four emitter studs; spins only while a check runs.
  const ring = new THREE.Group();
  const band = mesh(G.torus(0.3, 0.035, 10, 40), alloy, 'sensor-ring');
  band.rotation.x = Math.PI / 2;
  ring.add(band);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const stud = mesh(G.rbox(0.06, 0.05, 0.06, 0.015), accent, 'stud');
    place(stud, Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3, 0, -a, 0);
    ring.add(stud);
  }
  place(ring, 0, 0.16, 0);
  bot.body.add(ring);

  // Antenna array on the back: three thin masts of different heights with tip lamps.
  const tips: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < 3; i++) {
    const h = 0.28 + i * 0.1;
    const mast = mesh(G.cyl(0.014, 0.02, h, 6), alloy, 'antenna');
    place(mast, (i - 1) * 0.11, h / 2, -0.06, -0.15, 0, (i - 1) * 0.12);
    bot.sockets.back!.add(mast);
    const tm = M.glow(s.accent, 0.8);
    tips.push(tm);
    const tip = mesh(G.sphere(0.032, 8, 6), tm, 'antenna-tip');
    place(tip, (i - 1) * 0.11 - Math.sin((i - 1) * 0.12) * h, h, -0.06 - Math.sin(0.15) * h * 0.9);
    bot.sockets.back!.add(tip);
  }
  // Deployable diagnostic mast on the head crown: a dish that rises and tilts while scanning.
  const mastPivot = new THREE.Group();
  const post = mesh(G.cyl(0.015, 0.02, 0.22, 8), alloy, 'mast-post');
  place(post, 0, 0.11, 0);
  mastPivot.add(post);
  const dish = mesh(G.dish(0.11, 0.035, 20), M.shell(s.shell), 'dish');
  place(dish, 0, 0.24, 0, -0.6);
  mastPivot.add(dish);
  const dishCore = mesh(G.sphere(0.02, 8, 6), accent, 'dish-core');
  place(dishCore, 0, 0.25, 0.03);
  mastPivot.add(dishCore);
  place(mastPivot, 0.12, 0, -0.1);
  bot.sockets.crown!.add(mastPivot);
  // Probe manipulators: slender two-prong probes.
  for (const name of ['handL', 'handR'] as const) {
    const h = bot.sockets[name]!;
    h.add(mesh(G.cyl(0.035, 0.045, 0.07, 8), dark, 'probe-base'));
    for (const side of [-1, 1]) {
      const prong = mesh(G.capsule(0.012, 0.11, 2, 8), alloy, 'prong');
      place(prong, side * 0.025, -0.09, 0, 0, 0, side * 0.12);
      h.add(prong);
    }
    const tip = mesh(G.sphere(0.014, 8, 6), accent, 'probe-tip');
    place(tip, 0, -0.16, 0);
    h.add(tip);
  }

  let spin = 0;
  let deploy = 0;
  return {
    sockets: { ring, dish: mastPivot },
    update(b, t, dt, motion) {
      const working = b.mode === 'work';
      const target = working ? 1 : 0;
      deploy = damp(deploy, target, 4, dt);
      // The mast rises out of the crown and sweeps while scanning; stowed flat otherwise.
      mastPivot.position.y = -0.18 + deploy * 0.2;
      mastPivot.rotation.z = -0.9 * (1 - deploy);
      mastPivot.rotation.y = deploy * Math.sin(t * 1.2) * 0.8;
      const rate = working ? 2.5 : 0.01;
      spin += dt * rate * motion;
      ring.rotation.y = spin;
      tips.forEach((m, i) => {
        m.emissiveIntensity = working
          ? 1.5 + Math.sin(t * 5 + i * 2.1) * 1.2 * motion
          : 0.5 + 0.3 * Math.sin(t * 0.9 + i) * motion;
      });
    },
  };
}

function keeperParts(bot: Bot): RoleParts {
  const s = bot.spec;
  const alloy = M.alloy();
  const shell = M.shell(s.shell);
  const accent = M.glow(s.accent, 1.0);
  bot.lamps.push(accent);

  // Hooded sensor cowl over the head: a broad shell that gives the calm, watchful silhouette.
  const cowl = mesh(G.rbox(0.9, 0.22, 0.74, 0.1), shell, 'cowl');
  place(cowl, 0, 0.06, -0.05);
  bot.sockets.crown!.add(cowl);
  const cowlTrim = mesh(G.rbox(0.86, 0.025, 0.02, 0.01), accent, 'cowl-trim');
  place(cowlTrim, 0, 0.0, 0.31);
  bot.sockets.crown!.add(cowlTrim);
  // Hood flaps down the sides and back so the cowl reads as a hood, not a hat.
  for (const side of [-1, 1]) {
    const flap = mesh(G.rbox(0.08, 0.5, 0.5, 0.04), shell, 'hood-flap');
    place(flap, side * 0.43, -0.22, -0.12, 0, 0, side * 0.06);
    bot.sockets.crown!.add(flap);
  }
  const backFlap = mesh(G.rbox(0.8, 0.5, 0.08, 0.04), shell, 'hood-back');
  place(backFlap, 0, -0.22, -0.36, -0.08);
  bot.sockets.crown!.add(backFlap);
  // Archival reel on the back: two spools of evidence tape.
  const reelBox = mesh(G.rbox(0.36, 0.3, 0.14, 0.04), alloy, 'reel-box');
  place(reelBox, 0, 0.0, -0.08);
  bot.sockets.back!.add(reelBox);
  const spools: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const spool = mesh(G.cyl(0.075, 0.075, 0.05, 20), M.alloy(SHELL.dark), 'spool');
    place(spool, side * 0.09, 0.02, -0.17, Math.PI / 2);
    bot.sockets.back!.add(spool);
    spools.push(spool);
    const hub = mesh(G.cyl(0.02, 0.02, 0.06, 8), accent, 'spool-hub');
    place(hub, side * 0.09, 0.02, -0.17, Math.PI / 2);
    bot.sockets.back!.add(hub);
  }
  // Folding magnifier boom from the right side of the head: a lens on an articulated arm.
  const boom = new THREE.Group();
  const seg1 = mesh(G.cyl(0.014, 0.018, 0.22, 8), alloy, 'boom-1');
  place(seg1, 0, 0.11, 0);
  boom.add(seg1);
  const elbow = place(new THREE.Group(), 0, 0.22, 0);
  boom.add(elbow);
  const seg2 = mesh(G.cyl(0.012, 0.014, 0.2, 8), alloy, 'boom-2');
  place(seg2, 0, 0.1, 0);
  elbow.add(seg2);
  const lensRim = mesh(G.torus(0.09, 0.02, 8, 28), alloy, 'lens-rim');
  place(lensRim, 0, 0.24, 0);
  elbow.add(lensRim);
  const lens = new THREE.Mesh(G.cyl(0.085, 0.085, 0.012, 28), M.glass('#bfe9ff'));
  place(lens, 0, 0.24, 0, Math.PI / 2);
  elbow.add(lens);
  place(boom, 0.06, 0, 0, 0, 0, -1.2);
  bot.sockets.headSideR!.add(boom);
  const lensSocket = place(new THREE.Group(), 0, 0.24, 0);
  elbow.add(lensSocket);
  // Three orbiting inspection drones: little lens pods that park on the cowl when idle.
  const drones: THREE.Group[] = [];
  const droneRoot = new THREE.Group();
  bot.head.add(droneRoot);
  for (let i = 0; i < 3; i++) {
    const d = new THREE.Group();
    const body = mesh(G.rbox(0.09, 0.06, 0.09, 0.025), shell, 'drone');
    d.add(body);
    const eye = mesh(G.cyl(0.022, 0.022, 0.02, 12), accent, 'drone-eye');
    place(eye, 0, 0, 0.05, Math.PI / 2);
    d.add(eye);
    const fin = mesh(G.rbox(0.02, 0.03, 0.06, 0.006), alloy, 'drone-fin');
    place(fin, 0, 0.04, -0.02);
    d.add(fin);
    droneRoot.add(d);
    drones.push(d);
  }

  let orbit = 0;
  let deploy = 0;
  return {
    sockets: { lens: lensSocket, drones: droneRoot },
    update(b, t, dt, motion) {
      const working = b.mode === 'work';
      deploy = damp(deploy, working ? 1 : 0, 3, dt);
      // Boom unfolds from the cowl toward the front when inspecting.
      boom.rotation.z = -1.2 + deploy * 0.9;
      boom.rotation.x = deploy * 0.5;
      elbow.rotation.x = deploy * 0.9;
      elbow.rotation.z = -deploy * 0.6;
      orbit += dt * (working ? 1.2 : 0.02) * motion;
      drones.forEach((d, i) => {
        const a = orbit + (i / 3) * Math.PI * 2;
        // Parked: nestled on the cowl. Working: a slow orbit ahead and around the head.
        const px = Math.cos(a) * (0.55 * deploy) + (1 - deploy) * (i - 1) * 0.28;
        const pz = Math.sin(a) * (0.45 * deploy) + (1 - deploy) * -0.1;
        const py = 0.7 + Math.sin(a * 2 + i) * 0.06 * deploy + (1 - deploy) * 0.3;
        d.position.set(px, py, pz);
        d.rotation.y = -a + Math.PI / 2;
        d.rotation.z = 0.15 * Math.sin(t * 2 + i);
      });
      spools.forEach((sp, i) => {
        sp.rotation.y += dt * (working ? 1.5 : 0) * (i === 0 ? 1 : -1) * motion;
      });
      accent.emissiveIntensity = working ? 1.8 : 0.9;
    },
  };
}

function virgilParts(bot: Bot): RoleParts {
  const s = bot.spec;
  const alloy = M.alloy();
  const dark = M.alloy(SHELL.dark);
  const shell = M.shell(s.shell);
  const accent = M.glow(s.accent, 1.4);
  bot.lamps.push(accent);

  // Command mantle: a wide collar shell over the shoulders, and a tall rear shell.
  const mantleMat = M.shell('#2b2748');
  const collar = mesh(G.torus(0.3, 0.075, 12, 40), mantleMat, 'mantle-collar');
  place(collar, 0, s.torso.h + 0.06, 0, Math.PI / 2);
  bot.body.add(collar);
  for (const side of [-1, 1]) {
    const pauldron = mesh(G.rbox(0.26, 0.12, 0.34, 0.06), mantleMat, 'pauldron');
    place(pauldron, side * 0.36, s.torso.h + 0.02, 0, 0, 0, -side * 0.35);
    bot.body.add(pauldron);
    const pTrim = mesh(G.rbox(0.22, 0.02, 0.3, 0.008), accent, 'pauldron-trim');
    place(pTrim, side * 0.4, s.torso.h + 0.085, 0, 0, 0, -side * 0.35);
    bot.body.add(pTrim);
  }
  const rearShell = mesh(G.rbox(0.56, 0.7, 0.16, 0.06), M.shell('#2b2748'), 'rear-shell');
  place(rearShell, 0, 0.12, -0.12);
  bot.sockets.back!.add(rearShell);
  const rearGlyph = mesh(G.rbox(0.3, 0.3, 0.02, 0.06), accent, 'rear-glyph');
  place(rearGlyph, 0, 0.14, -0.21);
  bot.sockets.back!.add(rearGlyph);
  // Fold-out control vanes: three plates each side that open when a route is conducted.
  const vanes: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const pivot = place(new THREE.Group(), side * 0.28, 0.2 + i * 0.12, -0.16);
      const plate = mesh(G.rbox(0.34, 0.07, 0.02, 0.01), i === 1 ? shell : alloy, 'vane');
      place(plate, side * 0.17, 0, 0);
      pivot.add(plate);
      const edge = mesh(G.rbox(0.3, 0.012, 0.024, 0.005), accent, 'vane-edge');
      place(edge, side * 0.17, 0.035, 0);
      pivot.add(edge);
      bot.sockets.back!.add(pivot);
      vanes.push(pivot);
    }
  }
  // Orbital navigation instrument: a tilted ring with two orbiting beads above the shoulders.
  const instrument = new THREE.Group();
  const orb = mesh(G.torus(0.46, 0.014, 8, 56), alloy, 'orbital-ring');
  orb.rotation.x = Math.PI / 2 + 0.35;
  instrument.add(orb);
  const orb2 = mesh(G.torus(0.34, 0.01, 8, 48), accent, 'orbital-ring-2');
  orb2.rotation.x = Math.PI / 2 - 0.5;
  orb2.rotation.y = 0.6;
  instrument.add(orb2);
  const beads: THREE.Mesh[] = [];
  for (let i = 0; i < 2; i++) {
    const bead = mesh(G.sphere(0.03, 10, 8), i === 0 ? accent : M.shell('#f5c451'), 'bead');
    instrument.add(bead);
    beads.push(bead);
  }
  place(instrument, 0, s.torso.h + 0.5, -0.05);
  bot.body.add(instrument);
  // Three communication antennae on the crown, with pulsing tips.
  const antTips: THREE.MeshStandardMaterial[] = [];
  const ants: THREE.Group[] = [];
  const antSpec = [
    [-0.16, 0.22, -0.05, 0.28],
    [0.0, 0.3, -0.12, 0.42],
    [0.17, 0.2, -0.02, 0.24],
  ] as const;
  for (const [x, , z, h] of antSpec) {
    const a = new THREE.Group();
    const mast = mesh(G.cyl(0.01, 0.014, h, 6), alloy, 'antenna');
    place(mast, 0, h / 2, 0);
    a.add(mast);
    const tm = M.glow(s.accent, 1.2);
    antTips.push(tm);
    const tip = mesh(G.sphere(0.024, 8, 6), tm, 'antenna-tip');
    place(tip, 0, h + 0.01, 0);
    a.add(tip);
    const knob = mesh(G.sphere(0.03, 8, 6), dark, 'antenna-base');
    a.add(knob);
    place(a, x, 0.0, z, -0.2, 0, -x * 0.9);
    bot.sockets.crown!.add(a);
    ants.push(a);
  }
  // Conductor hands: rounded mitts with a single accent stud (never a tool).
  for (const name of ['handL', 'handR'] as const) {
    const h = bot.sockets[name]!;
    h.add(mesh(G.sphere(0.065, 12, 8), shell, 'mitt'));
    const stud = mesh(G.sphere(0.02, 8, 6), accent, 'mitt-stud');
    place(stud, 0, -0.05, 0.03);
    h.add(stud);
  }

  let open = 0;
  let ringSpin = 0;
  return {
    sockets: { instrument },
    update(b, t, dt, motion) {
      const active = b.mode === 'work' || b.mode === 'present';
      open = damp(open, active ? 1 : 0, 3.5, dt);
      vanes.forEach((v, idx) => {
        const side = idx < 3 ? -1 : 1;
        const i = idx % 3;
        v.rotation.y = side * (0.25 + open * (0.45 + i * 0.25));
        v.rotation.z = -side * open * 0.15 * (i + 1);
      });
      // Ambient ring speed is below the 0.6°/s token; conducting turns it visibly.
      ringSpin += dt * (active ? 0.9 : 0.008) * motion;
      orb.rotation.z = ringSpin;
      orb2.rotation.z = -ringSpin * 1.4;
      beads.forEach((bd, i) => {
        const a = ringSpin * (i === 0 ? 1 : -1.4) + i * 2;
        const r = i === 0 ? 0.46 : 0.34;
        bd.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.35, Math.sin(a) * r * 0.3);
      });
      antTips.forEach((m, i) => {
        m.emissiveIntensity = active
          ? 1.6 + Math.sin(t * 6 + i * 1.7) * 1.1 * motion
          : 0.8 + 0.4 * Math.sin(t * 0.7 + i * 2) * motion;
      });
      // Antenna twitch: an ambient micro-motion, never a gesture.
      ants.forEach((a, i) => {
        a.rotation.x = -0.2 + Math.sin(t * 0.9 + i * 1.3) * 0.04 * motion;
      });
      accent.emissiveIntensity = active ? 2.0 : 1.2;
    },
  };
}

const ROLE_BUILDERS: Record<BotRole, (bot: Bot) => RoleParts> = {
  fabricator: fabricatorParts,
  prover: proverParts,
  keeper: keeperParts,
  virgil: virgilParts,
};
