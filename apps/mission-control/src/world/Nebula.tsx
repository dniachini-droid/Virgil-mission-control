import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../ui/settings.js';
import { nebulaFragment, nebulaVertex } from './shaders.js';

interface Props {
  a: string;
  b: string;
  c: string;
  dust: string;
  density?: number;
  warp?: number;
}

export function Nebula({ a, b, c, dust, density = 1, warp = 0.9 }: Props) {
  const { reducedMotion, tier } = useSettings();
  const ref = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uA: { value: new THREE.Color(a) },
      uB: { value: new THREE.Color(b) },
      uC: { value: new THREE.Color(c) },
      uDust: { value: new THREE.Color(dust) },
      uDensity: { value: density },
      uWarp: { value: warp },
    }),
    [a, b, c, dust, density, warp],
  );
  useFrame((_, delta) => {
    if (ref.current && !reducedMotion)
      ref.current.uniforms.uTime!.value += delta * (tier === 'constrained' ? 0.4 : 1);
  });
  return (
    <mesh scale={[-1, 1, 1]} frustumCulled={false}>
      <sphereGeometry
        args={[400, tier === 'constrained' ? 16 : 40, tier === 'constrained' ? 12 : 28]}
      />
      <shaderMaterial
        ref={ref}
        uniforms={uniforms}
        vertexShader={nebulaVertex}
        fragmentShader={nebulaFragment}
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
