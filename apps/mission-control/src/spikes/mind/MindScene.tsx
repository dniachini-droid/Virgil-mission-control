import { useFrame } from '@react-three/fiber';
import { HEAD_SHA, sha } from '@virgil/test-fixtures';
import seedGraph from '@virgil/test-fixtures/knowledge/seed-graph.json' with { type: 'json' };
import { projectEpistemic, tokens } from '@virgil/visual-language';
import { type MutableRefObject, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { clamp01, easeInOut, easeOut, lerp3, window01 } from '../../world/anim.js';
import { EnvironmentRig } from '../../world/EnvironmentRig.js';
import { Label } from '../../world/Label.js';
import { Nebula } from '../../world/Nebula.js';
import { StarField } from '../../world/StarField.js';
import { interferenceFragment, laneVertex, scanFragment } from '../../world/shaders.js';

const P = tokens.palette;
const RUN_HASH = `sha256:${sha('run-record-run-pass')}`.slice(0, 19);

const GATE: [number, number, number] = [-30, 2, 0];
const SOURCE: [number, number, number] = [-16, 1.6, 0];
const COMMISSION: [number, number, number] = [-19, 1.4, -6];
const PROJECTION: [number, number, number] = [-12.5, 1.9, 2.4];
const FORGE: [number, number, number] = [-1, 2, 0];
const FRAG_A: [number, number, number] = [-2.2, 2.6, 1.2];
const FRAG_B: [number, number, number] = [0.6, 1.8, -1.0];
const NODE: [number, number, number] = [14, 2, 0];
const CONTESTED: [number, number, number] = [19, 2, 3];
const ARTBIBLE: [number, number, number] = [22, 1.6, -2];
const MONUMENT: [number, number, number] = [11, 1.4, -6];

interface SceneProps {
  step: number;
  progressRef: MutableRefObject<number>;
}

function Tether({
  from,
  to,
  state,
  progress = 1,
  opacity = 0.95,
}: {
  from: [number, number, number];
  to: [number, number, number];
  state: 'proposed' | 'intact' | 'broken';
  progress?: number;
  opacity?: number;
}) {
  const geom = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const pts = new THREE.CatmullRomCurve3([
      a,
      a
        .clone()
        .lerp(b, 0.5)
        .add(new THREE.Vector3(0, 1.2, 0)),
      b,
    ]).getPoints(48);
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    return g;
  }, [from, to]);
  const line = useMemo(() => {
    const colour =
      state === 'intact' ? P.evidenceIce : state === 'proposed' ? P.hypothesisGlass : P.faultRed;
    const mat =
      state === 'proposed'
        ? new THREE.LineDashedMaterial({
            color: colour,
            dashSize: 0.35,
            gapSize: 0.25,
            transparent: true,
            opacity: Math.min(0.8, opacity),
          })
        : new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity });
    const l = new THREE.Line(geom, mat);
    l.computeLineDistances();
    return l;
  }, [geom, state, opacity]);
  useFrame(() => {
    geom.setDrawRange(0, Math.max(0, Math.floor(49 * clamp01(progress))));
  });
  return <primitive object={line} />;
}

/** Sealed source: crystalline monolith with a hash band. Never opens. */
function SourceMonolith({
  position,
  label,
  hash,
  sealed,
  arrived,
  kind,
}: {
  position: [number, number, number];
  label: string;
  hash?: string;
  sealed: number;
  arrived: number;
  kind: 'run_record' | 'specification';
}) {
  const v = projectEpistemic('immutable_raw_evidence');
  return (
    <group position={position} scale={Math.max(0.001, arrived)}>
      <mesh rotation={[0, 0.4, 0]}>
        {kind === 'specification' ? (
          <octahedronGeometry args={[1.5, 0]} />
        ) : (
          <cylinderGeometry args={[0.9, 1.1, 2.8, 6]} />
        )}
        <meshPhysicalMaterial
          color="#1b2a3f"
          metalness={0.5}
          roughness={0.25}
          transmission={0.15}
          thickness={1.2}
          iridescence={0.7}
          emissive={P.evidenceIce}
          emissiveIntensity={0.12 + sealed * 0.25}
          flatShading
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1]} visible={sealed > 0.01}>
        <torusGeometry args={[1.25, 0.07 * sealed, 8, 48]} />
        <meshStandardMaterial
          color={P.evidenceIce}
          emissive={P.evidenceIce}
          emissiveIntensity={1.4 + sealed * 1.5}
          toneMapped={false}
        />
      </mesh>
      <Label
        text={label}
        position={[0, 2.4, 0]}
        height={0.36}
        fg={P.evidenceIce}
        border={P.evidenceIce}
      />
      {hash ? (
        <Label
          text={`${hash}… · sealed · ${v.visual.form}`}
          position={[0, 1.95, 0]}
          height={0.24}
          fg={P.evidenceIce}
          visible={sealed > 0.5}
        />
      ) : null}
    </group>
  );
}

/** Translucent light projection of a source: non-destructive read. */
function Projection({
  position,
  opacity,
}: {
  position: [number, number, number];
  opacity: number;
}) {
  return (
    <group position={position} visible={opacity > 0.01}>
      <mesh rotation={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.9, 1.1, 2.8, 6]} />
        <meshBasicMaterial
          color={P.evidenceIce}
          wireframe
          transparent
          opacity={opacity * 0.7}
          toneMapped={false}
        />
      </mesh>
      <Label
        text="light projection · non-destructive read"
        position={[0, 2.2, 0]}
        height={0.26}
        fg={P.evidenceIce}
        opacity={opacity}
      />
    </group>
  );
}

/** Proposed fragment: translucent wireframe with dashed edges. */
function Fragment({
  position,
  opacity,
  label,
  unstable = false,
}: {
  position: [number, number, number];
  opacity: number;
  label: string;
  unstable?: boolean;
}) {
  const m = useRef<THREE.Mesh>(null);
  const { reducedMotion } = useSettings();
  useFrame((state) => {
    if (!m.current) return;
    m.current.rotation.y += reducedMotion ? 0 : 0.004;
    const flick =
      unstable && !reducedMotion ? 0.7 + 0.3 * Math.abs(Math.sin(state.clock.elapsedTime * 9)) : 1;
    (m.current.material as THREE.MeshBasicMaterial).opacity = opacity * 0.85 * flick;
  });
  return (
    <group position={position} visible={opacity > 0.01}>
      <mesh ref={m}>
        <icosahedronGeometry args={[0.8, 1]} />
        <meshBasicMaterial
          color={P.hypothesisGlass}
          wireframe
          transparent
          opacity={opacity}
          toneMapped={false}
        />
      </mesh>
      <Label
        text={label}
        position={[0, 1.4, 0]}
        height={0.26}
        fg={P.hypothesisGlass}
        opacity={opacity}
      />
    </group>
  );
}

/** Durable compiled knowledge: solid faceted celestial structure. */
function DurableNode({
  position,
  scale,
  label,
  verified,
}: {
  position: [number, number, number];
  scale: number;
  label: string;
  verified: boolean;
}) {
  const g = useRef<THREE.Group>(null);
  const { reducedMotion } = useSettings();
  useFrame((_, d) => {
    if (g.current && !reducedMotion) g.current.rotation.y += d * 0.08;
  });
  return (
    <group position={position} scale={Math.max(0.001, scale)}>
      <group ref={g}>
        <mesh>
          <dodecahedronGeometry args={[1.5, 0]} />
          <meshPhysicalMaterial
            color="#e9e4ff"
            metalness={0.2}
            roughness={0.35}
            emissive={P.starWhite}
            emissiveIntensity={0.35}
            flatShading
          />
        </mesh>
        <mesh>
          <dodecahedronGeometry args={[1.53, 0]} />
          <meshBasicMaterial
            color={P.starWhite}
            wireframe
            transparent
            opacity={0.35}
            toneMapped={false}
          />
        </mesh>
        {verified ? (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.9, 0.06, 8, 64]} />
            <meshStandardMaterial
              color={P.signalLime}
              emissive={P.signalLime}
              emissiveIntensity={2.2}
              toneMapped={false}
            />
          </mesh>
        ) : null}
      </group>
      <Label
        text={label}
        position={[0, 2.6, 0]}
        height={0.36}
        fg={P.starWhite}
        border={P.starWhite}
      />
      {verified ? (
        <Label
          text="machine-verification signature · mv:… · verified_evidence"
          position={[0, 2.15, 0]}
          height={0.24}
          fg={P.signalLime}
        />
      ) : null}
    </group>
  );
}

/** Contested claim: two half-structures with a standing interference lattice between them. */
function ContestedNode({
  position,
  scale,
  labelA,
  labelB,
}: {
  position: [number, number, number];
  scale: number;
  labelA: string;
  labelB: string;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color(P.signalAmber) }, uTime: { value: 0 } }),
    [],
  );
  const { reducedMotion } = useSettings();
  useFrame((_, d) => {
    if (mat.current && !reducedMotion) mat.current.uniforms.uTime!.value += d;
  });
  return (
    <group position={position} scale={Math.max(0.001, scale)}>
      <mesh position={[-1.1, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <sphereGeometry args={[0.9, 20, 12, 0, Math.PI]} />
        <meshPhysicalMaterial
          color="#ded8ff"
          metalness={0.2}
          roughness={0.4}
          emissive={P.starWhite}
          emissiveIntensity={0.25}
          side={THREE.DoubleSide}
          flatShading
        />
      </mesh>
      <mesh position={[1.1, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <sphereGeometry args={[0.9, 20, 12, 0, Math.PI]} />
        <meshPhysicalMaterial
          color="#ded8ff"
          metalness={0.2}
          roughness={0.4}
          emissive={P.starWhite}
          emissiveIntensity={0.25}
          side={THREE.DoubleSide}
          flatShading
        />
      </mesh>
      <mesh>
        <planeGeometry args={[2.2, 2.0, 1, 1]} />
        <shaderMaterial
          ref={mat}
          uniforms={uniforms}
          vertexShader={laneVertex}
          fragmentShader={interferenceFragment}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <Label text={labelA} position={[-1.3, 1.6, 0]} height={0.26} fg={P.signalAmber} />
      <Label text={labelB} position={[1.3, 1.6, 0]} height={0.26} fg={P.signalAmber} />
      <Label
        text="contested · interference field CF-bloom"
        position={[0, 2.3, 0]}
        height={0.3}
        fg={P.signalAmber}
        border={P.signalAmber}
      />
    </group>
  );
}

function Monument({ position, label }: { position: [number, number, number]; label: string }) {
  return (
    <group position={position}>
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[1.3, 1.5, 0.4, 8]} />
        <meshPhysicalMaterial color="#1a1428" metalness={0.8} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[0.9, 2.2, 0.9]} />
        <meshPhysicalMaterial
          color="#3a2f12"
          metalness={0.9}
          roughness={0.3}
          emissive={P.ownerGold}
          emissiveIntensity={0.25}
        />
      </mesh>
      <mesh position={[0, 2.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.09, 8, 6]} />
        <meshStandardMaterial
          color={P.ownerGold}
          emissive={P.ownerGold}
          emissiveIntensity={1.8}
          toneMapped={false}
        />
      </mesh>
      <Label
        text={label}
        position={[0, 3.0, 0]}
        height={0.32}
        fg={P.ownerGold}
        border={P.ownerGold}
      />
    </group>
  );
}

function ScanWave({ active, radius }: { active: number; radius: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(P.signalCyan) },
      uRadius: { value: 0 },
      uActive: { value: 0 },
    }),
    [],
  );
  useFrame(() => {
    if (!mat.current) return;
    mat.current.uniforms.uRadius!.value = radius;
    mat.current.uniforms.uActive!.value = active;
  });
  return (
    <mesh position={[8, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[70, 70]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={laneVertex}
        fragmentShader={scanFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

function Beacon({ position, scale }: { position: [number, number, number]; scale: number }) {
  return (
    <group position={position} scale={Math.max(0.001, scale)}>
      <mesh position={[0, 0, 0]}>
        <octahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial
          color={P.signalCyan}
          emissive={P.signalCyan}
          emissiveIntensity={2.6}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, -0.9, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.6, 6]} />
        <meshBasicMaterial color={P.signalCyan} toneMapped={false} />
      </mesh>
      <Label
        text="scan-1-001 · contradiction · major · evidence: 2 pages · repair proposed"
        position={[0, 0.8, 0]}
        height={0.28}
        fg={P.signalCyan}
        border={P.signalCyan}
      />
    </group>
  );
}

const GALAXY_CENTRE: [number, number, number] = [16, 1.2, -5];
type SeedNode = (typeof seedGraph.nodes)[number];
const kindRing: Record<string, { radius: number; y: number }> = {
  principle: { radius: 4.5, y: 3.2 },
  governance: { radius: 8, y: 1.2 },
  architecture_concept: { radius: 10.5, y: 0.2 },
  agent_role: { radius: 9, y: 2.6 },
  visual_language: { radius: 7, y: 2.0 },
  glossary_term: { radius: 12, y: -0.8 },
};

function seedPosition(n: SeedNode, i: number, total: number): [number, number, number] {
  const ring = kindRing[n.kind ?? 'glossary_term'] ?? { radius: 11, y: 0 };
  const angle = (i / total) * Math.PI * 2 + 0.6;
  return [
    GALAXY_CENTRE[0] + Math.cos(angle) * ring.radius,
    GALAXY_CENTRE[1] + ring.y,
    GALAXY_CENTRE[2] + Math.sin(angle) * ring.radius * 0.7,
  ];
}

/** The real seed wiki, derived from knowledge/ by the knowledge-graph package. Forms follow the epistemic contract by kind. */
function SeedGalaxy() {
  const pages = seedGraph.nodes.filter((n) => n.nodeType === 'wiki_page');
  const positions = useMemo(
    () => new Map(pages.map((n, i) => [n.id, seedPosition(n, i, pages.length)])),
    [pages],
  );
  const { reducedMotion } = useSettings();
  const g = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    if (g.current && !reducedMotion) g.current.rotation.y += d * 0.01;
  });
  return (
    <group>
      <group ref={g}>
        {pages.map((n) => {
          const pos = positions.get(n.id) ?? GALAXY_CENTRE;
          const kind = n.kind ?? 'glossary_term';
          return (
            <group key={n.id} position={pos}>
              {kind === 'principle' ? (
                <mesh>
                  <icosahedronGeometry args={[0.7, 1]} />
                  <meshStandardMaterial
                    color={P.starWhite}
                    emissive={P.starWhite}
                    emissiveIntensity={2.4}
                    toneMapped={false}
                  />
                </mesh>
              ) : kind === 'governance' ? (
                <mesh rotation={[0.4, 0.2, 0]}>
                  <octahedronGeometry args={[1.0, 0]} />
                  <meshPhysicalMaterial
                    color="#d8d2ff"
                    metalness={0.3}
                    roughness={0.35}
                    emissive={P.starWhite}
                    emissiveIntensity={0.3}
                    flatShading
                  />
                </mesh>
              ) : kind === 'architecture_concept' ? (
                <mesh rotation={[0.5, 0.3, 0]}>
                  <torusKnotGeometry args={[0.7, 0.18, 64, 8, 2, 3]} />
                  <meshPhysicalMaterial
                    color="#cfd6ff"
                    metalness={0.5}
                    roughness={0.3}
                    iridescence={0.5}
                    emissive={P.evidenceIce}
                    emissiveIntensity={0.2}
                  />
                </mesh>
              ) : kind === 'agent_role' ? (
                <group>
                  {[0, 1, 2, 3, 4].map((k) => (
                    <mesh
                      key={k}
                      position={[
                        Math.cos(k * 1.26) * 0.9,
                        Math.sin(k * 2.1) * 0.5,
                        Math.sin(k * 1.26) * 0.9,
                      ]}
                    >
                      <tetrahedronGeometry args={[0.22, 0]} />
                      <meshStandardMaterial
                        color={P.starWhite}
                        emissive={P.starWhite}
                        emissiveIntensity={1.6}
                        toneMapped={false}
                      />
                    </mesh>
                  ))}
                </group>
              ) : kind === 'visual_language' ? (
                <mesh rotation={[0, 0.5, 0.2]}>
                  <cylinderGeometry args={[0.7, 0.7, 1.4, 3]} />
                  <meshPhysicalMaterial
                    color="#e6e0ff"
                    metalness={0.2}
                    roughness={0.2}
                    iridescence={0.9}
                    transmission={0.2}
                    thickness={1}
                    flatShading
                  />
                </mesh>
              ) : (
                <mesh>
                  <dodecahedronGeometry args={[0.6, 0]} />
                  <meshPhysicalMaterial
                    color="#cbc6e8"
                    metalness={0.2}
                    roughness={0.5}
                    flatShading
                  />
                </mesh>
              )}
              <Label
                text={`${n.id} · ${n.claimCount} claims`}
                position={[0, 1.5, 0]}
                height={0.26}
                fg={P.starWhite}
              />
            </group>
          );
        })}
      </group>
      {pages.map((n) => (
        <Tether
          key={`t-${n.id}`}
          from={positions.get(n.id) ?? GALAXY_CENTRE}
          to={COMMISSION}
          state="intact"
          opacity={0.18}
        />
      ))}
      {pages.map((n) => (
        <Tether
          key={`r-${n.id}`}
          from={positions.get(n.id) ?? GALAXY_CENTRE}
          to={NODE}
          state="intact"
          opacity={0.08}
        />
      ))}
    </group>
  );
}

export function MindScene({ step, progressRef }: SceneProps) {
  const { tier, reducedMotion } = useSettings();
  const gateArtifact = useRef<THREE.Group>(null);
  const fragA = useRef<THREE.Group>(null);
  const fragB = useRef<THREE.Group>(null);
  const anim = useRef({
    arrived: 0,
    sealed: 0,
    projection: 0,
    fragA: 0,
    fragB: 0,
    tether: 0,
    contested: 0,
    node: 0,
    scanR: 0,
    scanA: 0,
    beacon: 0,
  });
  const [, setTick] = useState(0);
  const lastProgress = useRef(-1);
  const force = () => {
    const pr = progressRef.current;
    if (pr !== lastProgress.current) {
      lastProgress.current = pr;
      setTick((t) => t + 1);
    }
  };

  useFrame(() => {
    const p = (at: number) => (step > at ? 1 : step === at ? progressRef.current : 0);
    const e = reducedMotion ? (t: number) => (t > 0 ? 1 : 0) : easeInOut;
    const a = anim.current;
    // 1 gateway crossing
    const cross = e(p(1));
    if (gateArtifact.current) {
      const pos = lerp3(
        [GATE[0] - 12, GATE[1] + 1, GATE[2] - 4],
        [GATE[0] + 5, GATE[1], GATE[2]],
        cross,
      );
      gateArtifact.current.position.set(...pos);
      gateArtifact.current.visible = step === 1 || (step === 2 && progressRef.current < 0.5);
    }
    a.arrived = step >= 2 ? e(p(2)) : 0;
    a.sealed = step >= 3 ? e(p(3)) : 0;
    a.projection = step >= 4 ? e(window01(p(4), 0, 0.8)) : 0;
    // 5 fragments separate from the projection and drift to the forge
    const prop = step >= 5 ? e(p(5)) : 0;
    a.fragA = prop;
    a.fragB = prop;
    if (fragA.current) fragA.current.position.set(...lerp3(PROJECTION, FRAG_A, easeOut(prop)));
    if (fragB.current) fragB.current.position.set(...lerp3(PROJECTION, FRAG_B, easeOut(prop)));
    a.tether = step >= 6 ? e(p(6)) : 0;
    a.contested = step >= 7 ? e(p(7)) : 0;
    if (fragB.current && step >= 7)
      fragB.current.position.set(...lerp3(FRAG_B, CONTESTED, easeOut(a.contested)));
    // 8 durable node assembles from fragment A
    const assemble = step >= 8 ? e(p(8)) : 0;
    a.node = assemble;
    if (fragA.current && step >= 8)
      fragA.current.position.set(...lerp3(FRAG_A, NODE, easeOut(window01(assemble, 0, 0.6))));
    // 9 scan wave then beacon
    const scan = step >= 9 ? p(9) : 0;
    a.scanA = step === 9 ? (reducedMotion ? 0 : 1 - window01(scan, 0.75, 1)) : 0;
    a.scanR = step === 9 ? easeOut(window01(scan, 0, 0.75)) : 0;
    a.beacon = step >= 9 ? e(window01(scan, 0.7, 1)) : 0;
    force();
  });

  const A = anim.current;
  const nodeVisible = step >= 8;
  const fragAOpacity = step >= 8 ? 1 - A.node : A.fragA;
  const fragBOpacity = step >= 7 ? 1 - A.contested : A.fragB;

  return (
    <>
      <color attach="background" args={[P.void]} />
      <fog attach="fog" args={[P.void, 70, tier === 'constrained' ? 150 : 240]} />
      <Nebula
        a={P.deepSpace}
        b={P.nebulaViolet}
        c={P.nebulaTeal}
        dust={P.evidenceIce}
        density={tier === 'constrained' ? 0.6 : 0.85}
        warp={1.3}
      />
      <StarField count={2000} radius={280} />
      <EnvironmentRig world="mind" />
      <hemisphereLight args={['#6f7cc9', '#0a0716', 0.5]} />
      <ambientLight intensity={0.25} color="#7f86c2" />
      <directionalLight position={[10, 25, 10]} intensity={1.2} color="#e6e0ff" />
      <pointLight position={[-16, 6, 4]} intensity={30} color={P.evidenceIce} distance={26} />
      <pointLight position={[0, 6, 4]} intensity={24} color={P.hypothesisGlass} distance={22} />
      <pointLight position={[15, 8, 4]} intensity={36} color={P.starWhite} distance={30} />

      {/* Region markers */}
      <Label
        text="ARCHIVE NEBULA · immutable sources"
        position={[-16, 6.5, -2]}
        height={0.5}
        fg={P.evidenceIce}
      />
      <Label
        text="SYNAPTIC FORGE · proposals"
        position={[-1, 6.5, -2]}
        height={0.5}
        fg={P.hypothesisGlass}
      />
      <Label
        text="LIVING KNOWLEDGE GALAXY · durable structures"
        position={[15, 6.5, -2]}
        height={0.5}
        fg={P.starWhite}
      />

      {/* Gateway threshold */}
      <group position={GATE}>
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[4.2, 0.18, 10, 64]} />
          <meshStandardMaterial
            color={P.signalCyan}
            emissive={P.signalCyan}
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
        <Label
          text="Mind gateway · from the Foundry"
          position={[0, 5.2, 0]}
          height={0.4}
          fg={P.signalCyan}
        />
      </group>
      <group ref={gateArtifact} visible={false}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.5, 1.2, 6, 16]} />
          <meshPhysicalMaterial color="#2b2440" metalness={0.95} roughness={0.25} clearcoat={1} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.55, 0.05, 8, 40]} />
          <meshStandardMaterial
            color={P.signalLime}
            emissive={P.signalLime}
            emissiveIntensity={2}
            toneMapped={false}
          />
        </mesh>
        <Label
          text={`run-pass · verified · ${HEAD_SHA.slice(0, 7)} · evidence, not knowledge`}
          position={[0, 1.2, 0]}
          height={0.3}
          fg={P.signalLime}
        />
      </group>

      {/* Archive: the run-record source and the commission source */}
      <SourceMonolith
        position={SOURCE}
        label="src-run-pass · run_record · knowledge/raw/src-run-pass.source.md"
        hash={RUN_HASH}
        sealed={A.sealed}
        arrived={A.arrived}
        kind="run_record"
      />
      <SourceMonolith
        position={COMMISSION}
        label="src-master-commission · specification"
        hash="sha256:15c658bfbfdd"
        sealed={1}
        arrived={1}
        kind="specification"
      />
      <Monument position={MONUMENT} label="OD-0001 · owner decision · sealed" />
      <Projection position={PROJECTION} opacity={A.projection * (step >= 5 ? 0.5 : 1)} />

      {/* Forge: fragments and tethers */}
      <group ref={fragA} position={PROJECTION}>
        <Fragment
          position={[0, 0, 0]}
          opacity={fragAOpacity}
          label="C-lesson-sha-hull · proposed"
        />
      </group>
      <group ref={fragB} position={PROJECTION}>
        <Fragment
          position={[0, 0, 0]}
          opacity={fragBOpacity}
          label="C-lesson-bloom · proposed"
          unstable
        />
      </group>
      {step >= 5 && step < 8 ? (
        <Tether
          from={FRAG_A}
          to={SOURCE}
          state={step >= 6 ? 'intact' : 'proposed'}
          progress={step === 6 ? A.tether : 1}
        />
      ) : null}
      {step >= 5 && step < 8 ? (
        <Tether
          from={FRAG_A}
          to={COMMISSION}
          state={step >= 6 ? 'intact' : 'proposed'}
          progress={step === 6 ? A.tether : 1}
        />
      ) : null}
      {step >= 5 && step < 7 ? <Tether from={FRAG_B} to={SOURCE} state="proposed" /> : null}
      <Label
        text="T-1 · verified_run · intact"
        position={[-9, 4.6, 1]}
        height={0.26}
        fg={P.evidenceIce}
        visible={step >= 6 && step < 8}
      />

      <SeedGalaxy />
      {/* Galaxy: durable node, contested node, art-bible neighbour, scan */}
      <DurableNode
        position={NODE}
        scale={nodeVisible ? A.node : 0}
        label="lesson-capsule-sha-legibility · compiled 2026-09-06 · knowledge-maintenance/1.0.0"
        verified
      />
      {nodeVisible ? <Tether from={NODE} to={SOURCE} state="intact" progress={A.node} /> : null}
      {nodeVisible ? <Tether from={NODE} to={COMMISSION} state="intact" progress={A.node} /> : null}
      <ContestedNode
        position={CONTESTED}
        scale={step >= 7 ? A.contested : 0}
        labelA="C-lesson-bloom (run evidence)"
        labelB="C-artbible-bloom-cap (art bible)"
      />
      {step >= 7 ? <Tether from={CONTESTED} to={SOURCE} state="intact" /> : null}
      {step >= 7 ? <Tether from={CONTESTED} to={ARTBIBLE} state="intact" /> : null}
      <DurableNode
        position={ARTBIBLE}
        scale={0.7}
        label="epistemic-visual-language · compiled"
        verified={false}
      />
      <ScanWave active={A.scanA} radius={A.scanR} />
      <Beacon position={[CONTESTED[0], CONTESTED[1] + 3.4, CONTESTED[2]]} scale={A.beacon} />
      <Label
        text="historical orbit · superseded structures remain selectable"
        position={[24, -1.2, 8]}
        height={0.28}
        fg={P.historyAsh}
      />
      <group position={[26, -1.8, 10]}>
        <mesh>
          <dodecahedronGeometry args={[0.8, 0]} />
          <meshStandardMaterial
            color={P.historyAsh}
            emissive={P.historyAsh}
            emissiveIntensity={0.15}
            flatShading
          />
        </mesh>
        <Label
          text="superseded · successor: epistemic-visual-language"
          position={[0, 1.4, 0]}
          height={0.22}
          fg={P.historyAsh}
        />
      </group>
    </>
  );
}
