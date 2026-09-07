import { useMemo } from 'react';
import * as THREE from 'three';
import { type LabelOptions, labelTexture } from './labels.js';

interface Props extends LabelOptions {
  text: string;
  position?: [number, number, number];
  height?: number;
  opacity?: number;
  visible?: boolean;
}

/** Billboard label attached to a world object. Labels are part of the evidence, never decoration. */
export function Label({
  text,
  position = [0, 0, 0],
  height = 0.34,
  opacity = 1,
  visible = true,
  ...opts
}: Props) {
  const { texture, aspect } = useMemo(
    () => labelTexture(text, opts),
    [text, opts.size, opts.fg, opts.bg, opts.border, opts.mono, opts.pad],
  );
  const material = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [texture],
  );
  material.opacity = opacity;
  return (
    <sprite
      position={position}
      scale={[height * aspect, height, 1]}
      material={material}
      visible={visible}
      renderOrder={50}
    />
  );
}
