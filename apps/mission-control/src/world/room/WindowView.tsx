import { use } from 'react';
import * as THREE from 'three';
import { layout } from './palette.js';
import nebulaBase64 from './window/nebula.b64.txt?raw';
import planetBase64 from './window/planet.b64.txt?raw';
import stationBase64 from './window/station.b64.txt?raw';
import layers from './window/window-layers.json';

/**
 * Everything on the far side of the glass, from the owner's three window-view
 * layers (`assets/runtime/window/`): the nebula as the far layer filling the
 * aperture, the ringed planet and the station as separate nearer planes so
 * they parallax against it as the camera orbits. That parallax is why three
 * layers were made rather than one.
 *
 * The layers are the cool half of the room's lighting contrast and the only
 * reason the amber inside reads as warm. The wall's circular aperture crops
 * them; there is no separate mask.
 *
 * All three decode from in-memory Blobs with `createImageBitmap` — no request
 * of any kind, which the Owner Build's `verify:owner` enforces. The planet and
 * station carry real alpha channels (measured, `window-layers.json`) and are
 * composited with normal blending: the station has genuinely dark panels that
 * additive blending would erase.
 *
 * Sizes and depths are chosen so the authored camera sees roughly 85 % of the
 * nebula's height through the aperture — the layers are 1672 × 941, below
 * the 2048 asked for, and showing less of the image would only magnify it.
 */
export function WindowView() {
  const textures = use(loadWindowTextures());
  const [wx, wy] = layout.windowCentre;

  return (
    <group>
      {/* The nebula. Distance and height keep the aperture's crop at ~85 % of
          the image from the authored camera, with margin for orbit. */}
      <Layer texture={textures.nebula} position={[wx, wy + 2.2, -34]} height={30} />
      {/* The planet, upper left of the aperture as in the reference, nearer
          than the nebula so it slides against it. */}
      <Layer
        texture={textures.planet}
        position={[wx - 5.2, wy + 3.2, -21]}
        height={7.4}
        transparent
      />
      {/* The station, upper right, nearest: the reference reads it as small
          and inhabited, silhouetted against the galaxy. Its perspective is
          drawn into the image (from slightly above) and cannot be reposed. */}
      <Layer
        texture={textures.station}
        position={[wx + 4.6, wy + 2.4, -16.5]}
        height={3.6}
        transparent
      />
    </group>
  );
}

function Layer({
  texture,
  position,
  height,
  transparent = false,
}: {
  texture: THREE.Texture;
  position: [number, number, number];
  height: number;
  transparent?: boolean;
}) {
  const image = texture.image as { width: number; height: number };
  const width = height * (image.width / image.height);
  return (
    <mesh position={position} frustumCulled={false}>
      <planeGeometry args={[width, height]} />
      {/* Basic and untone-mapped: these are already pictures of light, and
          the tone curve would only dull the nebula's core. */}
      <meshBasicMaterial
        map={texture}
        transparent={transparent}
        depthWrite={!transparent}
        toneMapped={false}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

interface WindowTextures {
  nebula: THREE.Texture;
  planet: THREE.Texture;
  station: THREE.Texture;
}

async function decode(name: keyof WindowTextures, base64: string): Promise<THREE.Texture> {
  const meta = layers.layers[name];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  if (bytes.length !== meta.bytes) {
    throw new Error(`window layer ${name}: ${bytes.length} bytes, metadata declares ${meta.bytes}`);
  }
  // The files carry an ICC profile; the default `colorSpaceConversion` lets
  // the browser apply it on decode, so what reaches the GPU is sRGB and is
  // tagged as such below. No re-encoding, no request.
  const bitmap = await createImageBitmap(new Blob([bytes], { type: meta.mimeType }), {
    premultiplyAlpha: 'none',
  });
  if (bitmap.width !== meta.width || bitmap.height !== meta.height) {
    throw new Error(
      `window layer ${name}: decoded ${bitmap.width}x${bitmap.height}, metadata declares ${meta.width}x${meta.height}`,
    );
  }
  const texture = new THREE.Texture(bitmap);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

let pending: Promise<WindowTextures> | null = null;

/** Memoised so React's double-render and Suspense retries decode once. */
export function loadWindowTextures(): Promise<WindowTextures> {
  pending ??= (async () => {
    const [nebula, planet, station] = await Promise.all([
      decode('nebula', nebulaBase64),
      decode('planet', planetBase64),
      decode('station', stationBase64),
    ]);
    return { nebula, planet, station };
  })();
  return pending;
}
