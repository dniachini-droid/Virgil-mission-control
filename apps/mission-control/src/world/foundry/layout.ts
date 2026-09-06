import * as THREE from 'three';
import type { CameraPose } from '../CameraRig.js';

/** World anchors for the hero bay. One scene, one scale: characters stand 1.6 units tall. */
export const L = {
  // Fabricator zone (foreground left).
  bench: new THREE.Vector3(-7.2, 0, 2.6),
  benchStand: new THREE.Vector3(-7.2, 0, 4.1),
  moduleA: new THREE.Vector3(-7.9, 1.25, 2.5),
  moduleB: new THREE.Vector3(-6.5, 1.25, 2.5),
  vent: new THREE.Vector3(-9.6, 0, 1.6),
  cradle: new THREE.Vector3(-4.2, 0, 2.4),
  cradleStand: new THREE.Vector3(-4.2, 0, 4.0),
  press: new THREE.Vector3(-1.0, 0, 2.2),
  pressStand: new THREE.Vector3(-1.0, 0, 4.1),
  pressExit: new THREE.Vector3(0.6, 1.05, 2.2),
  // Prover scanner (middle).
  scanner: new THREE.Vector3(4.8, 0, 0.2),
  scannerDock: new THREE.Vector3(4.8, 1.05, 0.2),
  scannerStand: new THREE.Vector3(2.2, 0, 2.6),
  // Keeper platform (right, across the gap).
  gapStart: 8.7,
  gapEnd: 10.3,
  keeper: new THREE.Vector3(13.2, 0, -0.4),
  keeperDock: new THREE.Vector3(13.2, 1.05, -0.4),
  keeperStand: new THREE.Vector3(13.2, 0, 1.9),
  // Control centre and airlock (rear, raised).
  daisHeight: 1.5,
  dais: new THREE.Vector3(2.6, 0, -8.2),
  virgilStand: new THREE.Vector3(2.6, 1.5, -7.2),
  console: new THREE.Vector3(2.6, 1.5, -6.2),
  airlock: new THREE.Vector3(2.6, 1.5, -12.4),
  pedestal: new THREE.Vector3(2.6, 1.5, -10.2),
};

export const CAMERAS = {
  overview: { position: [3.0, 8.4, 19.8], target: [3.0, 0.9, -1.8] },
  bench: { position: [-6.6, 3.2, 8.2], target: [-6.8, 1.2, 2.6] },
  cradle: { position: [-3.2, 3.4, 8.6], target: [-4.6, 1.1, 2.6] },
  press: { position: [1.4, 3.0, 7.6], target: [-0.8, 1.1, 2.2] },
  lane: { position: [3.6, 4.6, 9.6], target: [2.4, 1.0, 1.4] },
  scanner: { position: [6.8, 3.8, 7.2], target: [4.6, 1.3, 0.4] },
  gap: { position: [9.6, 4.8, 8.4], target: [9.5, 1.0, -0.4] },
  keeper: { position: [14.8, 3.6, 5.8], target: [13.2, 1.2, -0.4] },
  control: { position: [4.4, 4.8, 0.6], target: [2.6, 2.4, -7.4] },
  airlock: { position: [-2.8, 5.2, -2.2], target: [2.6, 2.2, -11.0] },
} satisfies Record<string, CameraPose>;
