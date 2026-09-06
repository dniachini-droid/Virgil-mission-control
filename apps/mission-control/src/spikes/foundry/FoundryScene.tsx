import { useFrame } from '@react-three/fiber';
import { HEAD_SHA } from '@virgil/test-fixtures';
import { tokens } from '@virgil/visual-language';
import { type MutableRefObject, useMemo } from 'react';
import * as THREE from 'three';
import { useBots } from '../../characters/index.js';
import { useSettings } from '../../ui/settings.js';
import { EnvironmentRig } from '../../world/EnvironmentRig.js';
import { buildBackdrop } from '../../world/foundry/backdrop.js';
import { buildAirlock, buildControlCentre } from '../../world/foundry/command.js';
import { buildBench, buildCradle, buildPress } from '../../world/foundry/fabrication.js';
import { L } from '../../world/foundry/layout.js';
import { buildCapsule, buildLane } from '../../world/foundry/props.js';
import { type BayState, emptyBayState } from '../../world/foundry/state.js';
import { buildKeeperStation, buildScanner } from '../../world/foundry/verification.js';
import { Nebula } from '../../world/Nebula.js';
import { StarField } from '../../world/StarField.js';
import { bayState, driveBots } from './choreography.js';
import type { FoundryStep } from './sequence.js';

const P = tokens.palette;
const SHORT = HEAD_SHA.slice(0, 7);

interface SceneProps {
  steps: FoundryStep[];
  step: number;
  progressRef: MutableRefObject<number>;
}

/** Builds the bay once; the frame loop derives the bay state from the current step and drives everything. */
export function FoundryScene({ steps, step, progressRef }: SceneProps) {
  const { tier, reducedMotion } = useSettings();
  const bots = useBots([
    { role: 'fabricator', position: [L.benchStand.x, 0, L.benchStand.z], yaw: Math.PI },
    { role: 'prover', position: [L.scannerStand.x, 0, L.scannerStand.z], yaw: Math.PI },
    { role: 'keeper', position: [L.keeperStand.x, 0, L.keeperStand.z], yaw: Math.PI },
    { role: 'virgil', position: [L.virgilStand.x, L.daisHeight, L.virgilStand.z], yaw: 0 },
  ]);
  const world = useMemo(() => {
    const capsule = buildCapsule(P.signalCyan, `${SHORT} · sealed`);
    const backdrop = buildBackdrop();
    const bench = buildBench();
    const cradle = buildCradle(bench);
    const press = buildPress(capsule.group);
    const scannerDock = new THREE.Group();
    const scanner = buildScanner(scannerDock);
    scannerDock.position.copy(L.scannerDock);
    const keeperDock = new THREE.Group();
    const keeper = buildKeeperStation(keeperDock);
    keeperDock.position.copy(L.keeperDock);
    const control = buildControlCentre();
    const airlock = buildAirlock();
    const laneA = buildLane(
      [
        L.pressExit.clone(),
        new THREE.Vector3(2.6, 1.3, 2.4),
        new THREE.Vector3(4.4, 1.2, 1.6),
        L.scannerDock.clone().add(new THREE.Vector3(0, 0.05, 0)),
      ],
      P.signalCyan,
    );
    const laneB = buildLane(
      [
        L.scannerDock.clone().add(new THREE.Vector3(0.6, 0.05, 0)),
        new THREE.Vector3(8.6, 1.4, 0.2),
        new THREE.Vector3(10.6, 1.9, -0.2),
        new THREE.Vector3(12.6, 1.4, -0.5),
        L.keeperDock.clone().add(new THREE.Vector3(-0.6, 0.05, 0)),
      ],
      P.evidenceIce,
    );
    const laneC = buildLane(
      [
        L.keeperDock.clone().add(new THREE.Vector3(0, 0.05, -0.6)),
        new THREE.Vector3(13.5, 1.6, -4.5),
        new THREE.Vector3(9.5, 2.2, -8.5),
        new THREE.Vector3(6.0, 2.4, -10.2),
        L.pedestal.clone().add(new THREE.Vector3(1.2, 0.4, 0)),
      ],
      P.signalLime,
    );
    const carried = new THREE.Group();
    carried.name = 'carried-capsule';
    const group = new THREE.Group();
    group.add(
      backdrop.group,
      bench.group,
      cradle.group,
      press.group,
      scanner.group,
      scannerDock,
      keeper.group,
      keeperDock,
      control.group,
      airlock.group,
      laneA.group,
      laneB.group,
      laneC.group,
      carried,
    );
    return {
      group,
      capsule,
      backdrop,
      bench,
      cradle,
      press,
      scanner,
      scannerDock,
      keeper,
      keeperDock,
      control,
      airlock,
      laneA,
      laneB,
      laneC,
      carried,
    };
  }, []);
  const stateRef = useMemo(() => ({ current: emptyBayState() as BayState }), []);

  useFrame((frame, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const t = frame.clock.elapsedTime;
    const motion = reducedMotion ? 0 : 1;
    const s = bayState(steps, step, progressRef.current, stateRef.current);
    driveBots(bots, steps, step, progressRef.current, s);
    const w = world;
    w.backdrop.update(s, t, dt, motion);
    w.bench.update(s, t, dt, motion);
    w.cradle.update(s, t, dt, motion);
    w.press.update(s, t, dt, motion);
    w.scanner.update(s, t, dt, motion);
    w.keeper.update(s, t, dt, motion);
    w.control.update(s, t, dt, motion);
    w.airlock.update(s, t, dt, motion);
    // Capsule placement: press bed → lane A sled → scanner dock → lane B → keeper dock → lane C → pedestal.
    const cap = w.capsule.group;
    w.capsule.setSealed(s.committed >= 0.75 ? 1 : 0);
    const moveTo = (parent: THREE.Object3D, pos: THREE.Vector3) => {
      if (cap.parent !== parent) parent.add(cap);
      cap.position.copy(pos);
      cap.visible = true;
      cap.scale.setScalar(1);
      cap.rotation.set(0, 0, 0);
    };
    for (const lane of [w.laneA, w.laneB, w.laneC]) lane.tick(dt);
    w.laneA.set(s.laneA > 0 ? 1 : 0, s.laneA, s.laneA > 0 && s.laneA < 1 ? 1 : 0);
    w.laneB.set(s.laneB > 0 ? 1 : 0, s.laneB, s.laneB > 0 && s.laneB < 1 ? 1 : 0);
    w.laneC.set(s.laneC > 0 ? 1 : 0, s.laneC, s.laneC > 0 && s.laneC < 1 ? 1 : 0);
    w.laneA.sled.visible = s.laneA > 0 && s.laneA < 1;
    w.laneB.sled.visible = s.laneB > 0 && s.laneB < 1;
    w.laneC.sled.visible = s.laneC > 0 && s.laneC < 1;
    if (s.laneC > 0) {
      if (s.laneC < 1) {
        w.laneC.placeSled(s.laneC);
        moveTo(w.laneC.sled, new THREE.Vector3(0, 0.5, 0));
      } else moveTo(w.group, L.pedestal.clone().add(new THREE.Vector3(1.2, 0.45, 0)));
    } else if (s.laneB > 0) {
      if (s.laneB < 1) {
        w.laneB.placeSled(s.laneB);
        moveTo(w.laneB.sled, new THREE.Vector3(0, 0.5, 0));
      } else moveTo(w.keeperDock, new THREE.Vector3(0, 0, 0));
    } else if (s.laneA > 0) {
      if (s.laneA < 1) {
        w.laneA.placeSled(s.laneA);
        moveTo(w.laneA.sled, new THREE.Vector3(0, 0.5, 0));
      } else moveTo(w.scannerDock, new THREE.Vector3(0, 0, 0));
    } else if (cap.parent !== w.press.group) {
      w.press.group.add(cap);
      cap.position.set(0, 1.1, 0);
    }
    // Characters.
    const b = bots;
    for (const bot of Object.values(b)) bot.update(dt, t, motion);
    void tier;
  });

  return (
    <>
      <color attach="background" args={[P.void]} />
      <fog attach="fog" args={[P.deepSpace, 40, tier === 'constrained' ? 90 : 140]} />
      <Nebula
        a={P.nebulaViolet}
        b={P.nebulaMagenta}
        c={P.nebulaTeal}
        dust={P.dustRose}
        density={tier === 'constrained' ? 0.8 : 1.15}
      />
      <StarField />
      <EnvironmentRig world="foundry" />
      <hemisphereLight args={['#7d76c9', '#0e0a1c', 0.55]} />
      <directionalLight
        position={[-6, 14, 12]}
        intensity={2.6}
        color="#f6ecff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-16}
        shadow-camera-right={20}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[14, 8, -14]} intensity={0.55} color="#8a7bff" />
      <pointLight position={[-6, 4, 5]} intensity={5} color="#bfefff" distance={10} decay={1.8} />
      <pointLight position={[5, 4.5, 3]} intensity={3.5} color="#eaffd8" distance={9} decay={1.8} />
      <pointLight
        position={[13.2, 4, 2]}
        intensity={5}
        color={P.evidenceIce}
        distance={10}
        decay={1.6}
      />
      <pointLight
        position={[2.6, 6.5, -6]}
        intensity={7}
        color="#fff4ea"
        distance={13}
        decay={1.6}
      />
      <primitive object={world.group} />
      {Object.values(bots).map((bot) => (
        <primitive key={bot.root.name} object={bot.root} />
      ))}
    </>
  );
}
