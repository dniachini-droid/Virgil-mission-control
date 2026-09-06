import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../ui/settings.js';

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Three parallax layers of stars; slow ambient drift only. */
export function StarField({ count = 2400, radius = 300 }: { count?: number; radius?: number }) {
  const { tier, reducedMotion } = useSettings();
  const scale =
    tier === 'constrained' ? 0.15 : tier === 'mobile' ? 0.35 : tier === 'laptop' ? 0.6 : 1;
  const layers = useMemo(() => {
    const rnd = seeded(7);
    return [0.55, 0.8, 1].map((depth, li) => {
      const n = Math.floor((count * scale) / 3);
      const pos = new Float32Array(n * 3);
      const col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const u = rnd() * 2 - 1;
        const theta = rnd() * Math.PI * 2;
        const r = radius * depth * (0.85 + rnd() * 0.15);
        const s = Math.sqrt(1 - u * u);
        pos[i * 3] = r * s * Math.cos(theta);
        pos[i * 3 + 1] = r * u;
        pos[i * 3 + 2] = r * s * Math.sin(theta);
        const warm = rnd();
        col[i * 3] = 0.75 + warm * 0.25;
        col[i * 3 + 1] = 0.78 + (1 - warm) * 0.15;
        col[i * 3 + 2] = 0.9 + rnd() * 0.1;
      }
      return {
        pos,
        col,
        size: [1.1, 1.6, 2.2][li] ?? 1.5,
        speed: [0.004, 0.0025, 0.0012][li] ?? 0.002,
      };
    });
  }, [count, radius, scale]);
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (group.current && !reducedMotion) group.current.rotation.y += delta * 0.0025;
  });
  return (
    <group ref={group}>
      {layers.map((l, i) => (
        <points key={i} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[l.pos, 3]} />
            <bufferAttribute attach="attributes-color" args={[l.col, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={l.size}
            sizeAttenuation
            vertexColors
            transparent
            opacity={0.9}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </points>
      ))}
    </group>
  );
}
