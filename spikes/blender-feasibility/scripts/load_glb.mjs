// Headless load test: does the exported .glb load in this project's rendering
// stack (three 0.185.1, ADR-0003)? No WebGL context is created; this proves the
// asset parses, not that it renders.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const threeRoot = resolve(here, '../../../apps/mission-control/node_modules/three');
const THREE = await import(resolve(threeRoot, 'build/three.module.js'));
const { GLTFLoader } = await import(resolve(threeRoot, 'examples/jsm/loaders/GLTFLoader.js'));

console.log('three version:', THREE.REVISION);

const file = resolve(here, '../out/spike_part.glb');
const buf = readFileSync(file);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

const t0 = performance.now();
const gltf = await new Promise((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
const ms = performance.now() - t0;

let meshes = 0,
  bones = 0,
  tris = 0;
const materials = new Set();
gltf.scene.traverse((o) => {
  if (o.isMesh) {
    meshes++;
    materials.add(o.material.name || o.material.uuid);
    const g = o.geometry;
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
  }
  if (o.isBone) bones++;
});
const box = new THREE.Box3().setFromObject(gltf.scene);
const size = box.getSize(new THREE.Vector3());

console.log('LOAD ok=true parse_ms=%s', ms.toFixed(1));
console.log('  meshes=%d materials=%d triangles=%d bones=%d', meshes, materials.size, tris, bones);
console.log('  animations=%d', gltf.animations.length);
for (const c of gltf.animations) {
  console.log(
    '    clip "%s" duration=%ss tracks=%d',
    c.name,
    c.duration.toFixed(3),
    c.tracks.length,
  );
}
console.log(
  '  bounding box (m): %s x %s x %s',
  size.x.toFixed(3),
  size.y.toFixed(3),
  size.z.toFixed(3),
);

// sample the clip at two times to prove it actually animates through three's mixer
const mixer = new THREE.AnimationMixer(gltf.scene);
const action = mixer.clipAction(gltf.animations[0]);
action.play();
const head = gltf.scene.getObjectByName('head_shell');
const sample = (t) => {
  mixer.setTime(t);
  gltf.scene.updateMatrixWorld(true);
  return new THREE.Vector3().setFromMatrixPosition(head.matrixWorld);
};
const a = sample(0),
  b = sample(gltf.animations[0].duration / 2);
console.log(
  '  head_shell world position at t=0.000s: %s',
  a
    .toArray()
    .map((n) => n.toFixed(4))
    .join(', '),
);
console.log(
  '  head_shell world position at t=%ss: %s',
  (gltf.animations[0].duration / 2).toFixed(3),
  b
    .toArray()
    .map((n) => n.toFixed(4))
    .join(', '),
);
console.log(
  '  MIXER_MOVED_HEAD=%s (delta %s m)',
  a.distanceTo(b) > 1e-4,
  a.distanceTo(b).toFixed(4),
);
