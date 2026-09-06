import { useFrame } from '@react-three/fiber';
import { HEAD_SHA } from '@virgil/test-fixtures';
import { tokens } from '@virgil/visual-language';
import { type MutableRefObject, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { clamp01, easeInOut, easeOut, lerp, lerp3, window01 } from '../../world/anim.js';
import { EnvironmentRig } from '../../world/EnvironmentRig.js';
import { Label } from '../../world/Label.js';
import { Nebula } from '../../world/Nebula.js';
import { StarField } from '../../world/StarField.js';
import { laneFragment, laneVertex } from '../../world/shaders.js';

const P = tokens.palette;
const SHORT = HEAD_SHA.slice(0, 7);

// Anchors
const BENCH: [number, number, number] = [-14, 0, 0];
const MODULE_A: [number, number, number] = [-15.6, 0.7, 1.6];
const MODULE_B: [number, number, number] = [-12.4, 0.7, 1.9];
const CRADLE: [number, number, number] = [-14, 2.4, 0];
const LOCAL_DOCK: [number, number, number] = [-9.5, 1.2, -3.5];
const REMOTE: [number, number, number] = [30, 5, -30];
const REMOTE_DOCK: [number, number, number] = [26.5, 5.2, -26];
const CHAMBER: [number, number, number] = [10, 0, 12];
const CHAMBER_DOCK: [number, number, number] = [10, 1.3, 12];
const KEEPER: [number, number, number] = [28, 0, 6];
const OBSERVATORY: [number, number, number] = [0, 3, -12];
const VENT: [number, number, number] = [-17.5, 0.9, -2.2];

const alloy = {
  color: '#1a1630',
  metalness: 0.85,
  roughness: 0.38,
  iridescence: 0.55,
  iridescenceIOR: 1.35,
} as const;
const darkMetal = { color: '#0f0c1c', metalness: 0.9, roughness: 0.55 } as const;

interface SceneProps {
  step: number;
  progressRef: MutableRefObject<number>;
}

/** Progress helper: 1 if the step is in the past, p if current, 0 if future. */
function useP(progressRef: MutableRefObject<number>, step: number) {
  return (at: number) => (step > at ? 1 : step === at ? progressRef.current : 0);
}

function Seam({
  radius,
  y = 0,
  color,
  intensity = 2.2,
  tube = 0.05,
  arc = Math.PI * 2,
  position,
}: {
  radius: number;
  y?: number;
  color: string;
  intensity?: number;
  tube?: number;
  arc?: number;
  position?: [number, number, number];
}) {
  return (
    <mesh position={position ?? [0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, tube, 8, 64, arc]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={intensity}
        toneMapped={false}
      />
    </mesh>
  );
}

function Station() {
  return (
    <group>
      {/* central core and observatory */}
      <group position={OBSERVATORY}>
        <mesh>
          <icosahedronGeometry args={[3.2, 1]} />
          <meshPhysicalMaterial {...alloy} flatShading />
        </mesh>
        <Seam radius={4.6} color={P.starWhite} intensity={1.4} tube={0.06} />
        <Seam radius={6.2} y={0.6} color={P.nebulaTeal} intensity={1.2} tube={0.04} />
        <mesh position={[0, 4.4, 0]}>
          <cylinderGeometry args={[0.25, 0.4, 2.6, 12]} />
          <meshPhysicalMaterial {...alloy} />
        </mesh>
        <mesh position={[0, 5.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.1, 0.05, 8, 48]} />
          <meshStandardMaterial
            color={P.starWhite}
            emissive={P.starWhite}
            emissiveIntensity={1.6}
            toneMapped={false}
          />
        </mesh>
        <Label text="VIRGIL · observatory" position={[0, 7.2, 0]} height={0.5} fg={P.starWhite} />
      </group>
      {/* station ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.3, -4]}>
        <torusGeometry args={[22, 0.7, 10, 120]} />
        <meshPhysicalMaterial {...darkMetal} />
      </mesh>
      <Seam
        radius={22}
        y={0.2}
        color={P.nebulaViolet}
        intensity={0.9}
        tube={0.06}
        position={[0, 0.2, -4]}
      />
      {/* airlock at the core edge: closed heavy plates, single gold keyway */}
      <group position={[0, 0.6, -25]}>
        <mesh>
          <boxGeometry args={[4.4, 3.2, 1.2]} />
          <meshPhysicalMaterial {...darkMetal} />
        </mesh>
        <mesh position={[0, 0, 0.62]}>
          <boxGeometry args={[0.16, 1.2, 0.08]} />
          <meshStandardMaterial
            color={P.ownerGold}
            emissive={P.ownerGold}
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
        <Label
          text="owner airlock · closed"
          position={[0, 2.6, 0]}
          height={0.42}
          fg={P.ownerGold}
          border={P.ownerGold}
        />
      </group>
    </group>
  );
}

function FabricatorBay() {
  return (
    <group position={BENCH}>
      {/* isolated bay slab, visibly separate from the ring */}
      <mesh position={[0, -0.45, 0]}>
        <cylinderGeometry args={[6.2, 6.6, 0.5, 6]} />
        <meshPhysicalMaterial {...darkMetal} />
      </mesh>
      <Seam radius={6.2} y={-0.18} color={P.signalCyan} intensity={1.3} tube={0.05} />
      {/* bench */}
      <mesh position={[0, 0.1, 0.6]}>
        <boxGeometry args={[6, 0.25, 2.6]} />
        <meshPhysicalMaterial {...alloy} />
      </mesh>
      {/* audit vent */}
      <mesh position={[-3.5, 0.9, -2.2]}>
        <cylinderGeometry args={[0.35, 0.5, 1.4, 12, 1, true]} />
        <meshStandardMaterial
          color={P.historyAsh}
          emissive={P.historyAsh}
          emissiveIntensity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Label
        text="worktree bay · feature/capsule-sha"
        position={[0, 5.4, 0]}
        height={0.44}
        fg={P.signalCyan}
      />
      <Label text="audit vent" position={[-3.5, 2.1, -2.2]} height={0.3} fg={P.historyAsh} />
    </group>
  );
}

/** Fabricator silhouette: compact torso, four articulated arms, loom on the back, forearm light-forge. */
function Fabricator({ working, reach }: { working: boolean; reach: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!g.current) return;
    g.current.rotation.y = -0.35 + (working ? Math.sin(state.clock.elapsedTime * 2.2) * 0.08 : 0);
  });
  return (
    <group ref={g} position={[-14.2, 0.2, -1.4]} scale={1.35}>
      <mesh position={[0, 1.15, 0]}>
        <capsuleGeometry args={[0.42, 0.9, 6, 12]} />
        <meshPhysicalMaterial color="#2a2346" metalness={0.7} roughness={0.4} iridescence={0.4} />
      </mesh>
      <mesh position={[0, 2.05, 0]}>
        <boxGeometry args={[0.5, 0.36, 0.42]} />
        <meshStandardMaterial color="#141024" emissive={P.signalCyan} emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[0, 1.2, -0.5]}>
        <boxGeometry args={[0.9, 0.7, 0.18]} />
        <meshPhysicalMaterial {...darkMetal} />
      </mesh>
      {[
        [0.55, 1.5, 0.15, -0.6],
        [-0.55, 1.5, 0.15, 0.6],
        [0.7, 1.0, 0.05, -1.1],
        [-0.7, 1.0, 0.05, 1.1],
      ].map(([x, y, z, rz], i) => (
        <group key={i} position={[x ?? 0, y ?? 0, z ?? 0]} rotation={[0, 0, rz ?? 0]}>
          <mesh position={[0, -0.45 - (i < 2 ? reach * 0.15 : 0), 0.35 * (i < 2 ? reach : 0)]}>
            <cylinderGeometry args={[0.06, 0.09, 0.9, 8]} />
            <meshPhysicalMaterial {...alloy} />
          </mesh>
          {i === 0 ? (
            <mesh position={[0, -0.95, 0.4 * reach]}>
              <boxGeometry args={[0.16, 0.16, 0.24]} />
              <meshStandardMaterial
                color={P.signalCyan}
                emissive={P.signalCyan}
                emissiveIntensity={working ? 3 : 0.3}
                toneMapped={false}
              />
            </mesh>
          ) : null}
        </group>
      ))}
      <Label
        text="Fabricator · sess-fab-1 · G-fab-1"
        position={[0, 3.1, 0]}
        height={0.34}
        fg={P.signalCyan}
      />
    </group>
  );
}

function Prover() {
  return (
    <group position={[CHAMBER[0] + 2.6, 0.2, CHAMBER[2] + 1.2]}>
      <mesh position={[0, 1.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.16, 10, 32]} />
        <meshPhysicalMaterial color="#20302a" metalness={0.75} roughness={0.35} iridescence={0.5} />
      </mesh>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i / 6) * Math.PI * 2) * 0.95,
            1.4,
            Math.sin((i / 6) * Math.PI * 2) * 0.95,
          ]}
          rotation={[0, -(i / 6) * Math.PI * 2, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.03, 0.05, 0.7, 6]} />
          <meshStandardMaterial
            color={P.signalLime}
            emissive={P.signalLime}
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.28, 0.42, 1.0, 10]} />
        <meshPhysicalMaterial {...darkMetal} />
      </mesh>
      <Label text="Prover · station idle" position={[0, 2.6, 0]} height={0.34} fg={P.signalLime} />
    </group>
  );
}

function ScannerChamber() {
  return (
    <group position={CHAMBER}>
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[5.2, 5.6, 0.4, 24]} />
        <meshPhysicalMaterial {...darkMetal} />
      </mesh>
      <Seam radius={5.2} y={-0.15} color={P.signalLime} intensity={0.9} tube={0.05} />
      {/* three unpowered scanner arcs, one per required check */}
      {[0, 1, 2].map((i) => (
        <group key={i} position={[0, 1.3, 0]} rotation={[0, (i * Math.PI * 2) / 3, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2 + 0.35]}>
            <torusGeometry args={[2.1, 0.05, 6, 40, Math.PI * 0.75]} />
            <meshStandardMaterial
              color={P.historyAsh}
              emissive={P.historyAsh}
              emissiveIntensity={0.25}
            />
          </mesh>
        </group>
      ))}
      <Label
        text="scanner array · typecheck · unit · lint (unpowered)"
        position={[0, 4.2, 0]}
        height={0.36}
        fg={P.historyAsh}
      />
    </group>
  );
}

function KeeperStation() {
  const ring = useRef<THREE.Group>(null);
  const { reducedMotion } = useSettings();
  useFrame((_, d) => {
    if (ring.current && !reducedMotion) ring.current.rotation.y += d * 0.12;
  });
  return (
    <group position={KEEPER}>
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[4.4, 4.8, 0.4, 8]} />
        <meshPhysicalMaterial {...darkMetal} />
      </mesh>
      <Seam radius={4.4} y={-0.15} color={P.evidenceIce} intensity={0.7} tube={0.05} />
      <group position={[0, 1.6, 0]}>
        <mesh>
          <coneGeometry args={[0.55, 1.9, 7, 1, true]} />
          <meshPhysicalMaterial
            color="#1e2a3a"
            metalness={0.6}
            roughness={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
        <group ref={ring}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} rotation={[(i * Math.PI) / 3, 0, 0.6]}>
              <torusGeometry args={[1.25 + i * 0.25, 0.025, 6, 48]} />
              <meshStandardMaterial
                color={P.evidenceIce}
                emissive={P.evidenceIce}
                emissiveIntensity={0.9}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
      </group>
      <Label
        text="Keeper · inspection station · separate"
        position={[0, 4.2, 0]}
        height={0.36}
        fg={P.evidenceIce}
      />
    </group>
  );
}

function RemoteStation() {
  return (
    <group position={REMOTE}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[7, 0.5, 10, 80]} />
        <meshPhysicalMaterial {...darkMetal} />
      </mesh>
      <Seam radius={7} color={P.evidenceIce} intensity={0.9} tube={0.05} />
      <mesh>
        <octahedronGeometry args={[2.2, 0]} />
        <meshPhysicalMaterial {...alloy} flatShading />
      </mesh>
      <Label
        text="remote · origin (allowlisted)"
        position={[0, 4.4, 0]}
        height={0.5}
        fg={P.evidenceIce}
      />
    </group>
  );
}

function Lane({
  from,
  to,
  color,
  charge,
  progress,
  packet,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  charge: number;
  progress: number;
  packet: number;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const curve = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const mid = a
      .clone()
      .lerp(b, 0.5)
      .add(new THREE.Vector3(0, 3.5 + a.distanceTo(b) * 0.05, 0));
    return new THREE.CatmullRomCurve3([a, mid, b]);
  }, [from, to]);
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uProgress: { value: 0 },
      uCharge: { value: 0 },
      uTime: { value: 0 },
      uPacket: { value: 0 },
    }),
    [color],
  );
  useFrame((_, d) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime!.value += d;
    mat.current.uniforms.uProgress!.value = progress;
    mat.current.uniforms.uCharge!.value = charge;
    mat.current.uniforms.uPacket!.value = packet;
  });
  return (
    <mesh frustumCulled={false}>
      <tubeGeometry args={[curve, 64, 0.22, 10, false]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={laneVertex}
        fragmentShader={laneFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

export function laneCurve(from: [number, number, number], to: [number, number, number]) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const mid = a
    .clone()
    .lerp(b, 0.5)
    .add(new THREE.Vector3(0, 3.5 + a.distanceTo(b) * 0.05, 0));
  return new THREE.CatmullRomCurve3([a, mid, b]);
}

function Capsule({
  position,
  scale,
  sealed,
  shaGlow,
  label,
  ghost = false,
}: {
  position: [number, number, number];
  scale: number;
  sealed: boolean;
  shaGlow: number;
  label?: string;
  ghost?: boolean;
}) {
  return (
    <group position={position} scale={scale} visible={scale > 0.001}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.55, 1.4, 8, 24]} />
        <meshPhysicalMaterial
          color={ghost ? '#3a4a66' : '#2b2440'}
          metalness={0.95}
          roughness={0.22}
          clearcoat={1}
          clearcoatRoughness={0.15}
          transparent={ghost}
          opacity={ghost ? 0.45 : 1}
        />
      </mesh>
      {/* SHA band */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.6, 0.06, 8, 48]} />
        <meshStandardMaterial
          color={P.signalCyan}
          emissive={P.signalCyan}
          emissiveIntensity={0.2 + shaGlow * 3.2}
          toneMapped={false}
        />
      </mesh>
      {/* seal rivets */}
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.42, 0.04, 6, 32]} />
          <meshStandardMaterial
            color={sealed ? P.sealBrass : P.historyAsh}
            emissive={sealed ? P.sealBrass : P.historyAsh}
            emissiveIntensity={sealed ? 0.9 : 0.2}
          />
        </mesh>
      ))}
      {label ? (
        <Label
          text={label}
          position={[0, 1.15, 0]}
          height={0.36}
          fg={P.signalCyan}
          border={P.signalCyan}
        />
      ) : null}
    </group>
  );
}

function Beacon({
  position,
  color,
  locked,
  label,
}: {
  position: [number, number, number];
  color: string;
  locked: boolean;
  label: string;
}) {
  const m = useRef<THREE.Mesh>(null);
  const { reducedMotion } = useSettings();
  useFrame((state) => {
    if (!m.current) return;
    m.current.rotation.y = locked ? 0 : reducedMotion ? 0.6 : state.clock.elapsedTime * 1.6;
  });
  return (
    <group position={position}>
      <mesh ref={m} position={[0, 0.6, 0]}>
        <coneGeometry args={[0.35, 1.1, 4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={locked ? 2.4 : 0.9}
          toneMapped={false}
        />
      </mesh>
      <Label text={label} position={[0, 1.9, 0]} height={0.3} fg={color} />
    </group>
  );
}

function Module({
  base,
  hover,
  open,
  label,
  labelColour,
  created,
  opacity = 1,
}: {
  base: [number, number, number];
  hover: number;
  open: number;
  label: string;
  labelColour: string;
  created?: number;
  opacity?: number;
}) {
  const y = base[1] + hover * 0.75;
  const slices = 3;
  return (
    <group position={[base[0], y, base[2]]}>
      {Array.from({ length: slices }).map((_, i) => (
        <mesh key={i} position={[0, (i - 1) * (0.14 + open * 0.28), 0]}>
          <boxGeometry args={[1.1, 0.13, 0.8]} />
          <meshPhysicalMaterial
            color="#26204a"
            metalness={0.6}
            roughness={0.4}
            emissive={P.evidenceIce}
            emissiveIntensity={0.15 + open * 0.8}
            transparent
            opacity={opacity}
          />
        </mesh>
      ))}
      {created !== undefined && created < 1 ? (
        <mesh>
          <boxGeometry args={[1.16, 0.6, 0.86]} />
          <meshBasicMaterial
            color={P.signalCyan}
            wireframe
            transparent
            opacity={0.8 * (1 - created)}
          />
        </mesh>
      ) : null}
      <Label text={label} position={[0, 0.85, 0]} height={0.26} fg={labelColour} />
    </group>
  );
}

export function FoundryScene({ step, progressRef }: SceneProps) {
  const { tier, reducedMotion } = useSettings();
  const beam = useRef<THREE.Mesh>(null);
  const pulse = useRef<THREE.Mesh>(null);
  const diff = useRef<THREE.Mesh>(null);
  const removed = useRef<THREE.Group>(null);
  const added = useRef<THREE.Group>(null);
  const modA = useRef<THREE.Group>(null);
  const modB = useRef<THREE.Group>(null);
  const cradle = useRef<THREE.Mesh>(null);
  const capsule = useRef<THREE.Group>(null);
  const remoteCap = useRef<THREE.Group>(null);
  const handoffCap = useRef<THREE.Group>(null);
  const lane = useRef<{ charge: number; progress: number; packet: number }>({
    charge: 0,
    progress: 0,
    packet: 0,
  });
  const corridor = useRef<{ charge: number; progress: number; packet: number }>({
    charge: 0,
    progress: 0,
    packet: 0,
  });
  const [laneState, setLaneState] = useMemo(
    () => [lane.current, (s: typeof lane.current) => Object.assign(lane.current, s)],
    [],
  );
  const [corrState, setCorrState] = useMemo(
    () => [corridor.current, (s: typeof corridor.current) => Object.assign(corridor.current, s)],
    [],
  );
  const handoffCurve = useMemo(() => laneCurve(LOCAL_DOCK, CHAMBER_DOCK), []);
  const [, setTick] = useState(0);
  const lastProgress = useRef(-1);

  useFrame(() => {
    const p = useP(progressRef, step);
    const e = reducedMotion ? (t: number) => (t > 0 ? 1 : 0) : easeInOut;
    // 1 read: beam and cross-section
    const read = p(1);
    if (beam.current) {
      const from = new THREE.Vector3(-13.7, 1.55, -0.8);
      const to = new THREE.Vector3(...MODULE_A);
      const len = from.distanceTo(to) * (step === 1 ? e(window01(read, 0, 0.4)) : 0);
      beam.current.visible = step === 1 && len > 0.01;
      beam.current.position.copy(from.clone().lerp(to, 0.5 * (len / from.distanceTo(to))));
      beam.current.lookAt(to);
      beam.current.scale.set(1, 1, len);
    }
    // 2 search pulse (directory scope radius 3.4)
    if (pulse.current) {
      const s = p(2);
      const active = step === 2;
      pulse.current.visible = active;
      const r = 0.4 + e(s) * 3.4;
      pulse.current.scale.set(r, r, 1);
      (pulse.current.material as THREE.MeshBasicMaterial).opacity = active
        ? 0.9 * (1 - s * 0.7)
        : 0;
    }
    // 3 edit: hover, diff plane, removed stream, added components
    const edit = p(3);
    if (modA.current)
      modA.current.position.y =
        MODULE_A[1] +
        (step >= 3 ? 0.75 * e(window01(edit, 0, 0.5)) : 0) -
        MODULE_A[1] +
        MODULE_A[1];
    if (diff.current) {
      const dp = step === 3 ? e(window01(edit, 0.2, 0.7)) : step > 3 && step < 5 ? 1 : 0;
      diff.current.visible = dp > 0.01;
      diff.current.scale.set(dp, dp, 1);
      (diff.current.material as THREE.MeshBasicMaterial).opacity = 0.55 * dp;
    }
    if (removed.current) {
      removed.current.visible = step === 3;
      removed.current.children.forEach((c, i) => {
        const t = clamp01(window01(edit, 0.25 + i * 0.05, 0.85 + i * 0.05));
        const pos = lerp3([MODULE_A[0], MODULE_A[1] + 0.9, MODULE_A[2]], VENT, easeOut(t));
        c.position.set(pos[0], pos[1] + Math.sin(t * Math.PI) * 0.8, pos[2]);
        c.scale.setScalar(1 - t * 0.7);
      });
    }
    if (added.current) {
      added.current.visible = step === 3;
      added.current.children.forEach((c, i) => {
        const t = clamp01(window01(edit, 0.3 + i * 0.08, 0.9));
        const start: [number, number, number] = [
          MODULE_A[0] + 1.8 + i * 0.3,
          MODULE_A[1] + 2.2,
          MODULE_A[2] - 0.6 + i * 0.4,
        ];
        const end: [number, number, number] = [
          MODULE_A[0] + (i - 1) * 0.3,
          MODULE_A[1] + 0.9,
          MODULE_A[2],
        ];
        const pos = lerp3(start, end, easeOut(t));
        c.position.set(...pos);
        c.visible = t < 1;
      });
    }
    // 5 staging: modules converge into the cradle; 6 commit: compress into capsule
    const staged = p(5);
    const committed = p(6);
    const conv = step >= 5 ? e(staged) : 0;
    const compress = step >= 6 ? e(window01(committed, 0, 0.6)) : 0;
    const modScale = 1 - compress;
    if (modA.current) {
      const hoverY = MODULE_A[1] + (step >= 3 ? 0.75 : 0);
      const pos = lerp3(
        [MODULE_A[0], hoverY, MODULE_A[2]],
        [CRADLE[0] - 0.55, CRADLE[1], CRADLE[2]],
        conv,
      );
      modA.current.position.set(...pos);
      modA.current.scale.setScalar(Math.max(0.001, modScale));
    }
    if (modB.current) {
      const hoverY = MODULE_B[1] + (step >= 4 ? 0.75 : 0);
      const pos = lerp3(
        [MODULE_B[0], hoverY, MODULE_B[2]],
        [CRADLE[0] + 0.55, CRADLE[1], CRADLE[2]],
        conv,
      );
      modB.current.position.set(...pos);
      modB.current.scale.setScalar(Math.max(0.001, modScale));
      modB.current.visible = step >= 4;
    }
    if (cradle.current) {
      const m = cradle.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.4 + conv * 2.2 * (1 - compress * 0.7);
      cradle.current.rotation.z = reducedMotion
        ? 0
        : cradle.current.rotation.z + 0.004 * (1 + conv * 3);
    }
    // capsule appears at the cradle then moves to the local dock
    if (capsule.current) {
      const appear = step >= 6 ? e(window01(committed, 0.45, 1)) : 0;
      const toDock = step >= 7 ? 1 : 0;
      const pos = lerp3(CRADLE, LOCAL_DOCK, toDock);
      capsule.current.position.set(...pos);
      capsule.current.scale.setScalar(Math.max(0.001, appear));
      capsule.current.rotation.z = step === 6 ? (1 - appear) * 1.2 : 0;
      // handoff: capsule travels the corridor
      if (step >= 9) {
        const t = step === 9 ? e(p(9)) : 1;
        const pt = handoffCurve.getPointAt(clamp01(t));
        capsule.current.position.copy(pt);
        capsule.current.rotation.y = t * 0.8;
      }
    }
    // 7 push lane charges and packet travels; 8 remote materialises and beacons lock
    const push = p(7);
    const pushed = p(8);
    setLaneState({
      charge: step >= 7 ? e(window01(push, 0, 0.35)) : 0,
      progress: step === 7 ? e(window01(push, 0.25, 1)) * 0.86 : step >= 8 ? 1 : 0,
      packet: step === 7 ? 1 : step === 8 ? 1 - pushed : 0,
    });
    if (remoteCap.current) {
      const s = step >= 8 ? e(window01(pushed, 0.2, 1)) : 0;
      remoteCap.current.scale.setScalar(Math.max(0.001, s));
    }
    setCorrState({
      charge: step >= 9 ? 1 : 0,
      progress: step === 9 ? e(p(9)) : step > 9 ? 1 : 0,
      packet: step === 9 ? 0.6 : 0,
    });
    void tier;
  });

  const showRemoteLocked = step >= 8 && (step > 8 || progressRef.current > 0.6);

  return (
    <>
      <color attach="background" args={[P.void]} />
      <fog attach="fog" args={[P.deepSpace, 60, tier === 'constrained' ? 160 : 260]} />
      <Nebula
        a={P.nebulaViolet}
        b={P.nebulaMagenta}
        c={P.nebulaTeal}
        dust={P.dustRose}
        density={tier === 'constrained' ? 0.7 : 1}
      />
      <StarField />
      <EnvironmentRig world="foundry" />
      <hemisphereLight args={['#7d76c9', '#120c24', 0.6]} />
      <ambientLight intensity={0.25} color="#8f8ac2" />
      <directionalLight position={[0, 30, -10]} intensity={1.6} color="#dcd6ff" />
      <pointLight position={[-14, 6, 2]} intensity={40} color={P.signalCyan} distance={22} />
      <pointLight position={[10, 6, 12]} intensity={26} color={P.signalLime} distance={20} />
      <pointLight position={[30, 10, -30]} intensity={60} color={P.evidenceIce} distance={40} />
      <pointLight position={[28, 6, 6]} intensity={22} color={P.evidenceIce} distance={18} />

      <Station />
      <FabricatorBay />
      <Fabricator working={step >= 1 && step <= 6} reach={step === 1 || step === 3 ? 1 : 0} />
      <ScannerChamber />
      <Prover />
      <KeeperStation />
      <RemoteStation />

      {/* modules */}
      <group ref={modA} position={MODULE_A}>
        <Module
          base={[0, 0, 0]}
          hover={0}
          open={step === 1 ? 1 : 0}
          label={
            step >= 6
              ? 'Capsule.tsx · committed'
              : step >= 5
                ? 'Capsule.tsx · staged'
                : step >= 3
                  ? 'Capsule.tsx · +18 −4 · unstaged'
                  : 'Capsule.tsx'
          }
          labelColour={step >= 3 && step < 6 ? P.signalAmber : P.evidenceIce}
        />
      </group>
      <group ref={modB} position={MODULE_B} visible={step >= 4}>
        <Module
          base={[0, 0, 0]}
          hover={0}
          open={0}
          label={
            step >= 6
              ? 'Capsule.test.tsx · committed'
              : step >= 5
                ? 'Capsule.test.tsx · staged'
                : 'Capsule.test.tsx · created · unstaged'
          }
          labelColour={step >= 4 && step < 6 ? P.signalAmber : P.evidenceIce}
          created={step === 4 ? progressRef.current : 1}
        />
      </group>
      {/* read beam */}
      <mesh ref={beam} visible={false}>
        <cylinderGeometry args={[0.02, 0.02, 1, 6]} />
        <meshBasicMaterial color={P.evidenceIce} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      {/* search pulse over the directory scope */}
      <mesh
        ref={pulse}
        position={[BENCH[0], 0.3, BENCH[2] + 0.6]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <ringGeometry args={[0.92, 1, 64]} />
        <meshBasicMaterial
          color={P.signalCyan}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <Label
        text="search scope · apps/mission-control/src/world (directory)"
        position={[BENCH[0], 3.2, BENCH[2] + 3.2]}
        height={0.3}
        fg={P.signalCyan}
        visible={step === 2}
      />
      {/* diff plane */}
      <mesh
        ref={diff}
        position={[MODULE_A[0], MODULE_A[1] + 1.0, MODULE_A[2] + 0.75]}
        visible={false}
      >
        <planeGeometry args={[1.4, 0.9]} />
        <meshBasicMaterial
          color={P.signalAmber}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <group ref={removed} visible={false}>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i}>
            <boxGeometry args={[0.12, 0.06, 0.12]} />
            <meshBasicMaterial color={P.historyAsh} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <group ref={added} visible={false}>
        {Array.from({ length: 3 }).map((_, i) => (
          <mesh key={i}>
            <boxGeometry args={[0.22, 0.1, 0.18]} />
            <meshStandardMaterial
              color={P.signalLime}
              emissive={P.signalLime}
              emissiveIntensity={2}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
      {/* staging cradle */}
      <mesh ref={cradle} position={CRADLE} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.3, 0.08, 10, 64]} />
        <meshStandardMaterial
          color={P.signalCyan}
          emissive={P.signalCyan}
          emissiveIntensity={0.4}
          toneMapped={false}
        />
      </mesh>
      <Label
        text={
          step >= 6
            ? 'staging cradle · sealed into capsule'
            : step >= 5
              ? 'staging cradle · 2 staged · 0 repelled'
              : 'staging cradle'
        }
        position={[CRADLE[0], CRADLE[1] + 1.4, CRADLE[2]]}
        height={0.3}
        fg={P.signalCyan}
      />
      {/* capsule (sealed candidate) */}
      <group ref={capsule} position={CRADLE} scale={0.001}>
        <Capsule
          position={[0, 0, 0]}
          scale={1}
          sealed
          shaGlow={step >= 6 ? 1 : 0}
          label={`${SHORT} · sealed candidate`}
        />
      </group>
      {/* mass-driver lane and beacons */}
      <Lane
        from={LOCAL_DOCK}
        to={REMOTE_DOCK}
        color={P.signalCyan}
        charge={laneState.charge}
        progress={laneState.progress}
        packet={laneState.packet}
      />
      <Beacon
        position={[LOCAL_DOCK[0] + 1.6, LOCAL_DOCK[1] - 0.6, LOCAL_DOCK[2] - 1.2]}
        color={showRemoteLocked ? P.signalLime : P.signalCyan}
        locked={showRemoteLocked}
        label={
          step >= 6
            ? `local ${SHORT}${showRemoteLocked ? ' · phase-locked' : ''}`
            : 'local · no candidate'
        }
      />
      <Beacon
        position={[REMOTE_DOCK[0] + 3.4, REMOTE_DOCK[1] - 0.6, REMOTE_DOCK[2] + 2.6]}
        color={showRemoteLocked ? P.signalLime : P.historyAsh}
        locked={showRemoteLocked}
        label={
          showRemoteLocked
            ? `remote ${SHORT} · phase-locked`
            : step >= 7
              ? 'remote · out of phase'
              : 'remote · —'
        }
      />
      <group ref={remoteCap} position={REMOTE_DOCK} scale={0.001}>
        <Capsule
          position={[0, 0, 0]}
          scale={1}
          sealed
          shaGlow={1}
          label={`${SHORT} · registered at origin`}
        />
      </group>
      {/* handoff corridor to the Prover */}
      <Lane
        from={LOCAL_DOCK}
        to={CHAMBER_DOCK}
        color={P.evidenceIce}
        charge={corrState.charge}
        progress={corrState.progress}
        packet={corrState.packet}
      />
      <Label
        text="corridor · fabricator → prover · stage: verification · sealed H-1"
        position={[-1, 6.5, 6]}
        height={0.34}
        fg={P.evidenceIce}
        visible={step >= 9}
      />
      <group ref={handoffCap} visible={false} />
      {/* PR ring at the remote once pushed and opened: not verification */}
      <Label
        text="grant G-fab-1 · TIER_2 · apps/mission-control/src/world/** · expires +10h"
        position={[BENCH[0], 4.6, BENCH[2] - 3]}
        height={0.3}
        fg={P.sealBrass}
      />
    </>
  );
}
