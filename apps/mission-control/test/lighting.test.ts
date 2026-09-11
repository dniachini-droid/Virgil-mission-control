import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SMEAR } from '../src/world/room/FloorSheen.js';
import { applyConsoleFinish, CONSOLE_FINISH, FLOOR_FINISH } from '../src/world/room/finish.js';
import { SPOT, spotLevel } from '../src/world/room/Models.js';

/**
 * **The four lighting changes the owner approved on 8 September**, held to
 * what they were approved as.
 *
 * His observation, on the V8.1 frames: *"the consoles of the agents, and
 * the floor... it looks a bit dark.... like they are in shadows, it looks
 * bland, and dead and lifeless.... Im thining of changing the consoles,
 * because you can see that they arent made straight/smooth etc.... unless
 * you have any ideas."* The three causes found in the code are recorded in
 * `docs/process/PHASE_1_BACKLOG.md`. His approval of the four proposed
 * changes: *"i agree with all your choices. on the lighting. they. are all
 * good. implement all."*
 *
 * These tests are the same kind of check as `floor.test.ts`'s last one:
 * they hold values and the shape of the source, because nothing here can
 * be judged by a headless renderer. **They are not evidence that the set
 * looks better.** That is a matter for the owner's eye on the registered
 * A/B frames, and the run record says which frames those are.
 */
describe('the lit idle baseline', () => {
  const rig = readFileSync(
    resolve(import.meta.dirname, '../src/world/room/LightingRig.tsx'),
    'utf8',
  );

  it('lifts the ambient well above V6’s halved value', () => {
    // The one number that most decides whether an idle console reads as a
    // cream object in a lit room. V6 halved everything and landed at 0.3.
    const hemisphere = rig.match(/hemisphereLight[^/]*?intensity=\{([\d.]+)\}/s);
    expect(hemisphere).not.toBeNull();
    expect(Number(hemisphere?.[1])).toBeGreaterThanOrEqual(0.75);
    // And the rig still says out loud that it was halved once, and why it
    // is not any more: a reader of this file should find the history.
    expect(rig).toContain('normal" means lit');
  });

  it('stands a fill over the back row, which the warm key cannot reach', () => {
    // The Fabricator, Prover and Keeper sit 9-11 m from the warm key with
    // `decay: 2`. The fill is the answer to that arithmetic, and it casts
    // no shadow, because a second shadow map is the expensive thing.
    const fill = rig.slice(rig.indexOf('The back-row fill'));
    expect(fill).toContain('<spotLight');
    expect(fill.slice(0, fill.indexOf('/>'))).not.toContain('castShadow');
    expect(fill).toContain('layout.stations.prover.at');
  });

  it('puts a rim behind each console, and one shared rim on a phone', () => {
    expect(rig).toContain('The rim behind each console');
    expect(rig).toContain('room.cool.rim');
    // Three on the desktop tiers, one on `mobile` and `constrained`: every
    // light is per-fragment work on every lit material.
    expect(rig).toContain('coarse ? (');
    expect(rig).toContain('ROLES.map((role)');
  });
});

describe('the spotlight is a lift, not the only light', () => {
  it('keeps a console lit when idle, and unmistakably lighter when working', () => {
    expect(SPOT.base).toBeGreaterThan(0);
    // A working console is at least four times the idle lift, so the
    // spotlight still says one thing and says it clearly.
    expect((SPOT.base + SPOT.lift) / SPOT.base).toBeGreaterThan(4);
    expect(SPOT.lift).toBe(0.34);
  });

  it('keeps the fast rise and the slow decay, so the decay reads as a memory', () => {
    // Unchanged from V8: this is the owner's own instruction and the pass
    // was not permitted to alter it.
    expect(SPOT.rise).toBe(0.35);
    expect(SPOT.decay).toBe(3.2);
    expect(SPOT.decay / SPOT.rise).toBeGreaterThan(8);
    const rising = spotLevel(0, true, 0.35);
    const falling = spotLevel(1, false, 0.35);
    expect(rising).toBeGreaterThan(0.6);
    expect(1 - falling).toBeLessThan(0.15);
  });

  it('leaves the pool of light to the working console alone', () => {
    // The pool is the part of the spotlight that only ever appears under a
    // console that is working. The idle baseline must not reach it, or an
    // idle console would claim to be busy.
    const models = readFileSync(
      resolve(import.meta.dirname, '../src/world/room/Models.tsx'),
      'utf8',
    );
    expect(models).toContain('m.opacity = SPOT.pool * l;');
    expect(models).not.toContain('SPOT.pool * (l');
    expect(models).toContain('material.emissiveIntensity = SPOT.base + SPOT.lift * l;');
  });
});

describe('the consoles’ finish', () => {
  it('is roughness about 0.4 with a sheen, over the factors the source declares', () => {
    expect(CONSOLE_FINISH.roughness).toBeGreaterThan(0.3);
    expect(CONSOLE_FINISH.roughness).toBeLessThan(0.5);
    expect(CONSOLE_FINISH.roughness).toBe(0.42);
    expect(CONSOLE_FINISH.metalness).toBe(0);
    expect(CONSOLE_FINISH.sheen).toBeGreaterThan(0);
  });

  it('does not edit the generated asset records, which state what the model declares', () => {
    // The consoles' 0.8 is what their source glTF declares and what
    // `asset-pipeline/reduce-model.mjs` recorded. Overriding it at runtime
    // is an art-direction decision; editing the record would be a false
    // statement about the owner's asset.
    for (const file of [
      'fabricatorStation',
      'proverStation',
      'keeperStation',
      'console3',
    ] as const) {
      const json = JSON.parse(
        readFileSync(resolve(import.meta.dirname, `../src/world/props/${file}-asset.json`), 'utf8'),
      ) as { runtime: { roughness: number; metalness: number } };
      expect(json.runtime.roughness).toBeCloseTo(0.8, 6);
      expect(json.runtime.metalness).toBe(0);
    }
  });

  it('replaces the material once, keeping every map the model shipped', () => {
    const map = new THREE.Texture();
    const mesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshStandardMaterial({ map, roughness: 0.8, metalness: 0 }),
    );
    applyConsoleFinish(mesh);
    const first = mesh.material as THREE.MeshPhysicalMaterial;
    expect(first.name).toBe('console-finish');
    expect(first.map).toBe(map);
    expect(first.roughness).toBe(CONSOLE_FINISH.roughness);
    expect(first.sheen).toBe(CONSOLE_FINISH.sheen);
    // Idempotent: a re-render must not rebuild it every frame.
    applyConsoleFinish(mesh);
    expect(mesh.material).toBe(first);
  });

  it('is applied to the four consoles the owner named, and to no character', () => {
    const models = readFileSync(
      resolve(import.meta.dirname, '../src/world/room/Models.tsx'),
      'utf8',
    );
    expect((models.match(/applyConsoleFinish\(/g) ?? []).length).toBe(2);
    expect(models).toContain('applyConsoleFinish(console_.mesh)');
    expect(models).toContain('applyConsoleFinish(station.mesh)');
    for (const file of ['characters/Figure.tsx', 'characters/VirgilRigged.tsx'] as const) {
      const src = readFileSync(resolve(import.meta.dirname, `../src/world/${file}`), 'utf8');
      expect(src).not.toContain('applyConsoleFinish');
    }
  });
});

describe('the cheap floor reflection', () => {
  const tabletop = readFileSync(
    resolve(import.meta.dirname, '../src/world/room/Tabletop.tsx'),
    'utf8',
  );
  const sheen = readFileSync(
    resolve(import.meta.dirname, '../src/world/room/FloorSheen.tsx'),
    'utf8',
  );

  it('polishes the disc’s own face rather than re-rendering the scene', () => {
    expect(FLOOR_FINISH.roughness).toBeLessThan(0.6);
    expect(FLOOR_FINISH.metalness).toBeGreaterThan(0);
    // Above about 0.2 the cream inlay goes grey: a metal takes its diffuse
    // colour out of the base colour.
    expect(FLOOR_FINISH.metalness).toBeLessThan(0.2);
    expect(tabletop).toContain('FLOOR_FINISH.roughness');
  });

  it('does not bring back the planar mirror that V6 removed for its cost', () => {
    for (const src of [tabletop, sheen]) {
      expect(src).not.toContain('MeshReflectorMaterial');
      expect(src).not.toContain('Reflector');
      expect(src).not.toContain('WebGLRenderTarget');
      expect(src).not.toContain('useFBO');
    }
    // And the smears are flat quads with one shared texture: seven of them,
    // additive, no depth write, no shadow, no second pass.
    expect(sheen).toContain('<planeGeometry');
    expect(sheen).toContain('AdditiveBlending');
    expect(sheen).toContain('depthWrite={false}');
    expect(sheen).not.toContain('castShadow');
    expect((sheen.match(/<planeGeometry/g) ?? []).length).toBe(1);
    expect(SMEAR.strength).toBeLessThan(0.5);
    expect(SMEAR.reach).toBeGreaterThan(0);
  });

  it('states its per-frame cost, and states that the cost is not measured', () => {
    // `docs/decisions/OD-0005-phase-1-visual-checks-and-reference.md`
    // requires performance recorded as unmeasured until it is measured on
    // real hardware. A count of what is drawn is not a measurement.
    expect(sheen).toContain('PERFORMANCE_STRATEGY.md');
    expect(sheen).toContain('None of it is measured');
    expect(sheen).toContain('OD-0005');
  });
});
