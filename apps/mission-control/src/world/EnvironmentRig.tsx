import { Environment, Lightformer } from '@react-three/drei';
import { tokens } from '@virgil/visual-language';

const P = tokens.palette;

/** Procedural environment for physically based materials: no downloaded HDR, fully offline. */
export function EnvironmentRig({ world }: { world: 'foundry' | 'mind' }) {
  return (
    <Environment resolution={128} frames={1} background={false}>
      <mesh scale={100}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial color={world === 'foundry' ? '#2a2452' : '#1a1f3a'} side={1} />
      </mesh>
      <Lightformer
        form="rect"
        intensity={world === 'foundry' ? 6 : 4}
        color={P.evidenceIce}
        position={[0, 14, -10]}
        scale={[30, 8, 1]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="ring"
        intensity={4}
        color={P.nebulaMagenta}
        position={[-20, 6, 12]}
        scale={12}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        intensity={3}
        color={P.nebulaTeal}
        position={[22, 4, 10]}
        scale={[10, 12, 1]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        intensity={2.5}
        color={world === 'foundry' ? P.signalCyan : P.starWhite}
        position={[0, -12, 8]}
        scale={[24, 6, 1]}
        target={[0, 0, 0]}
      />
    </Environment>
  );
}
