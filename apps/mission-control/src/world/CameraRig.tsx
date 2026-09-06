import { CameraControls } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import { useSettings } from '../ui/settings.js';

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
}

/** Authored camera poses; transitions are smooth dollies (or near-instant with reduced motion). The user may suppress automatic travel. */
export function CameraRig({ pose, autoTravel }: { pose: CameraPose; autoTravel: boolean }) {
  const ref = useRef<CameraControls>(null);
  const { reducedMotion } = useSettings();
  const first = useRef(true);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    if (!autoTravel && !first.current) return;
    const animate = !reducedMotion && !first.current;
    c.smoothTime = animate ? 0.9 : 0.05;
    void c.setLookAt(
      pose.position[0],
      pose.position[1],
      pose.position[2],
      pose.target[0],
      pose.target[1],
      pose.target[2],
      animate,
    );
    first.current = false;
  }, [pose, autoTravel, reducedMotion]);
  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={2}
      maxDistance={140}
      dollySpeed={0.6}
      truckSpeed={0.8}
      smoothTime={0.9}
    />
  );
}
