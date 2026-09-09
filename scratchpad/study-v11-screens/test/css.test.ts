import { appendFileSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, it } from 'vitest';
import { mobilePose, overviewPose } from '../../../apps/mission-control/src/world/mobile/composition.js';
import { layout } from '../../../apps/mission-control/src/world/room/palette.js';
import { v11SlabPlan } from '../../../apps/mission-control/src/world/screens/v11/ScreenBankV11.js';

const OUT = '/home/user/Virgil-mission-control/scratchpad/study-v11-screens/slab-css.txt';
writeFileSync(OUT, '');
const say = (s: string) => appendFileSync(OUT, `${s}\n`);

describe('slab css', () => {
  it('reports', () => {
    const { y, z, spread, splay } = layout.screenBank;
    const plan = v11SlabPlan(1024);
    say(`v11 slab display plane ${plan.displayWidth.toFixed(3)} x ${plan.displayHeight.toFixed(3)} m, canvas ${plan.canvasWidth} x ${plan.canvasHeight}, aspect ${(plan.displayWidth / plan.displayHeight).toFixed(4)}, glass ${plan.glassArea.toFixed(3)} m2, corner ${plan.cornerPixels.toFixed(1)} px`);
    const slabs: [string, [number, number, number], [number, number, number]][] = [
      ['slab-roles', [-spread, y - 0.08, z + 0.35], [-0.1, splay, 0]],
      ['slab-verdict', [0, y, z], [-0.1, 0, 0]],
      ['slab-candidate', [spread, y - 0.08, z + 0.35], [-0.1, -splay, 0]],
    ];
    for (const [w, h] of [[390, 844], [430, 932], [844, 390]] as [number, number][]) {
      for (const [focus, label] of [['all', 'overview'], ['board', 'board'], ['virgil', 'virgil']] as [string, string][]) {
        const pose = mobilePose(focus as 'all', w / h);
        const cam = new THREE.PerspectiveCamera(pose.fov, w / h, 0.1, 200);
        cam.position.set(pose.position[0], pose.position[1], pose.position[2]);
        cam.lookAt(pose.target[0], pose.target[1], pose.target[2]);
        cam.updateMatrixWorld(true);
        cam.updateProjectionMatrix();
        for (const [id, position, rotation] of slabs) {
          const g = new THREE.Group();
          g.position.set(position[0], position[1], position[2]);
          g.rotation.set(rotation[0], rotation[1], rotation[2]);
          g.updateMatrixWorld(true);
          const hw = plan.displayWidth / 2;
          const hh = plan.displayHeight / 2;
          const quad = [
            new THREE.Vector3(-hw, hh, 0).applyMatrix4(g.matrixWorld),
            new THREE.Vector3(hw, hh, 0).applyMatrix4(g.matrixWorld),
            new THREE.Vector3(hw, -hh, 0).applyMatrix4(g.matrixWorld),
            new THREE.Vector3(-hw, -hh, 0).applyMatrix4(g.matrixWorld),
          ];
          const pts = quad.map((c) => {
            const p = c.clone().project(cam);
            return [((p.x + 1) / 2) * w, ((1 - p.y) / 2) * h] as [number, number];
          });
          const edge = (a: number, b: number) => Math.hypot(pts[a]![0] - pts[b]![0], pts[a]![1] - pts[b]![1]);
          say(`${w}x${h} ${label.padEnd(9)} ${id.padEnd(15)} ${(((edge(0,1)+edge(3,2))/2)).toFixed(1)} x ${(((edge(0,3)+edge(1,2))/2)).toFixed(1)} css px`);
        }
      }
    }
  });
});
