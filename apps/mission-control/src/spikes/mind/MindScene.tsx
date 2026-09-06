import { useFrame } from '@react-three/fiber';
import { tokens } from '@virgil/visual-language';
import { type MutableRefObject, useMemo } from 'react';
import { useSettings } from '../../ui/settings.js';
import { EnvironmentRig } from '../../world/EnvironmentRig.js';
import { buildMindCluster, emptyMindState, type MindState } from '../../world/mind/cluster.js';
import { Nebula } from '../../world/Nebula.js';
import { StarField } from '../../world/StarField.js';
import { mindSteps } from './sequence.js';

const P = tokens.palette;

interface SceneProps {
  step: number;
  progressRef: MutableRefObject<number>;
}

const APPLY: Record<string, (s: MindState, p: number) => void> = {
  overview: () => {},
  arrive: (s, p) => {
    s.arrive = p;
  },
  record: (s, p) => {
    s.record = p;
  },
  hash: (s, p) => {
    s.hash = p;
  },
  read: (s, p) => {
    s.read = p;
  },
  propose: (s, p) => {
    s.propose = p;
  },
  tether: (s, p) => {
    s.tether = p;
  },
  contest: (s, p) => {
    s.contest = p;
  },
  durable: (s, p) => {
    s.durable = p;
  },
  scan: (s, p) => {
    s.scan = p;
  },
};

/** Fold the recorded knowledge steps into the cluster state; a refused step contributes nothing. */
export function mindState(index: number, progress: number): MindState {
  const s = emptyMindState();
  for (let i = 0; i <= index && i < mindSteps.length; i++) {
    const st = mindSteps[i]!;
    if (st.refusal) continue;
    APPLY[st.id]?.(s, i < index ? 1 : Math.min(1, Math.max(0, progress)));
  }
  return s;
}

export function MindScene({ step, progressRef }: SceneProps) {
  const { tier, reducedMotion } = useSettings();
  const cluster = useMemo(() => buildMindCluster(), []);
  useFrame((frame, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const s = mindState(step, progressRef.current);
    cluster.update(s, frame.clock.elapsedTime, dt, reducedMotion ? 0 : 1);
  });
  return (
    <>
      <color attach="background" args={[P.void]} />
      <fog attach="fog" args={[P.deepSpace, 30, tier === 'constrained' ? 80 : 120]} />
      <Nebula
        a={P.nebulaTeal}
        b={P.nebulaViolet}
        c={P.nebulaMagenta}
        dust={P.dustRose}
        density={tier === 'constrained' ? 0.7 : 1.05}
        warp={1.1}
      />
      <StarField count={3200} />
      <EnvironmentRig world="mind" />
      <hemisphereLight args={['#6f7fd0', '#0b0818', 0.5]} />
      <directionalLight
        position={[-8, 12, 10]}
        intensity={2.0}
        color="#e8f0ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-20}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[12, 6, -12]} intensity={0.5} color="#7a5bff" />
      <primitive object={cluster.group} />
    </>
  );
}
