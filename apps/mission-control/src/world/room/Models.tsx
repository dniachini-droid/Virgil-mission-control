import { useFrame } from '@react-three/fiber';
import { use, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import type { Activity } from '../characters/Figure.js';
import { loadPorthole } from '../props/portholeAsset.js';
import { loadConsole3 } from '../props/v6Assets.js';
import { CAST, figurePlacement, type Role, stationToWorld } from './cast.js';
import type { Report } from './demo.js';
import { layout, room } from './palette.js';

/**
 * The owner-supplied static models, placed. Each loader returns a group whose
 * origin is the model's base at its chosen real-world size, so placing one is
 * a matter of where its feet go — the centre-pivot correction, the
 * single-siding and the declared matte factors all happen in
 * `meshyAsset.ts`, not here. The animated Virgil lives in
 * `../characters/VirgilRigged.tsx`; the three characters in
 * `../characters/Figure.tsx`; a console's own screen in
 * `../screens/ConsoleScreen.tsx`.
 *
 * V8 (`docs/process/PHASE_1_STYLISED_SPEC.md` §0.10.11): **a console is
 * spotlit while it works, and the light fades slowly when it is done.**
 * The owner: "all of the consoles remain normal when not in use, but when
 * they are doing work, they are lit up lighter, almnost as if a spotlight
 * is on them, and when they are done, the spotlitght slowly fades down."
 * Not a shadow-casting light — this has to run on a phone — but an
 * emissive lift on the console's own material, following its own texture,
 * and a soft pool of light on the disc beneath it, which is what sells it
 * as a spotlight. The rise is fast and the decay slow (`spotLevel`), long
 * enough to still be visible while the next console is starting: a
 * console still glowing faintly says *this one worked recently*, so the
 * disc holds a short history of itself. An unlit console reads as nothing
 * running, which is the honest state and needs no label.
 */

/** The spot's rise and decay, as time constants in seconds. */
export const SPOT = { rise: 0.35, decay: 3.2, lift: 0.34, pool: 0.5 } as const;

/**
 * The spot's level this frame: toward 1 fast while `active`, toward 0
 * slowly otherwise. Pure, so a test can hold the asymmetry.
 */
export function spotLevel(level: number, active: boolean, dt: number): number {
  const tau = active ? SPOT.rise : SPOT.decay;
  const k = 1 - Math.exp(-Math.max(0, dt) / tau);
  return level + ((active ? 1 : 0) - level) * k;
}

/** The pool of light on the disc under a spotlit console. */
function createPoolTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

let pool: THREE.CanvasTexture | null = null;
function poolTexture(): THREE.CanvasTexture {
  pool ??= createPoolTexture();
  return pool;
}

/**
 * The spotlight on a console: the emissive lift on its mesh, and the pool
 * under it. `centre` is where the pool sits on the disc; `radius` its
 * reach. Rendered inside the console's own group.
 */
function Spot({
  mesh,
  active,
  centre,
  radius,
}: {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  active: boolean;
  centre: [number, number, number];
  radius: number;
}) {
  const { reducedMotion } = useSettings();
  const level = useRef(0);
  const poolMesh = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => poolTexture(), []);
  const colour = useMemo(() => new THREE.Color(room.warm.key), []);
  useFrame((_, delta) => {
    const l = (level.current = spotLevel(
      level.current,
      active,
      reducedMotion ? 100 : Math.min(delta, 0.1),
    ));
    const material = mesh.material;
    if (material.emissiveMap !== material.map) {
      material.emissiveMap = material.map;
      material.needsUpdate = true;
    }
    material.emissive.copy(colour);
    material.emissiveIntensity = SPOT.lift * l;
    if (poolMesh.current) {
      const m = poolMesh.current.material as THREE.MeshBasicMaterial;
      m.opacity = SPOT.pool * l;
      poolMesh.current.visible = l > 0.01;
    }
  });
  return (
    <mesh
      ref={poolMesh}
      position={[centre[0], centre[1] + 0.025, centre[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={2}
    >
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial
        map={texture}
        color={room.warm.amber}
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Virgil's console: the low oval ring with the raised deck he stands on, spotlit while he conducts. */
export function VirgilConsole({ active = false }: { active?: boolean }) {
  const console_ = use(loadConsole3());
  return (
    <group>
      <primitive
        object={console_.placed}
        position={layout.consoleCentre}
        rotation={[0, layout.consoleRotationY, 0]}
      />
      <Spot
        mesh={console_.mesh}
        active={active}
        centre={[layout.consoleCentre[0], 0, layout.consoleCentre[2]]}
        radius={2.6}
      />
    </group>
  );
}

/** One role's own station, from the cast table, spotlit while its occupant works. */
export function Station({ role, active = false }: { role: Role; active?: boolean }) {
  const member = CAST[role];
  const station = use(member.station.load());
  const { local } = figurePlacement(role);
  // The pool centres between the console and its occupant.
  const centre = stationToWorld(role, local[0] * 0.4, 0, local[2] * 0.45);
  return (
    <group>
      <primitive object={station.placed} position={member.at} rotation={[0, member.rotationY, 0]} />
      <Spot mesh={station.mesh} active={active} centre={centre} radius={2.1} />
    </group>
  );
}

const STATION_LIGHT: Record<Activity, string> = {
  rest: room.emit.teal,
  receiving: room.emit.ice,
  working: room.warm.amber,
  reported: '#b6ff5c',
};

/**
 * A station's own light, over its character's head, in the colour of what
 * the station is doing: teal at rest, ice while a hand-off arrives — with a
 * flash as each packet lands, at the screen's packet rate — amber while
 * they work, beating slowly, and the report's colour once it is reported.
 * It is what lets the state be read off a character and their station
 * from across the room, not only off the screen.
 */
export function StationLight({
  role,
  activity,
  report,
}: {
  role: Role;
  activity: Activity;
  report: Report;
}) {
  const light = useRef<THREE.PointLight>(null);
  const since = useRef({ activity: '' as string, at: 0, t: 0 });
  const { reducedMotion } = useSettings();
  const colour = useMemo(
    () =>
      new THREE.Color(
        activity === 'reported' && report === 'BLOCKED'
          ? '#ff3b5c'
          : activity === 'reported' && report === 'INSUFFICIENT_EVIDENCE'
            ? '#9dc0ff'
            : activity === 'reported' && report === 'COMPLETE'
              ? room.emit.ice
              : STATION_LIGHT[activity],
      ),
    [activity, report],
  );
  useFrame((_, delta) => {
    if (!light.current) return;
    const c = since.current;
    if (!reducedMotion) c.t += Math.min(delta, 0.1);
    if (c.activity !== activity) {
      c.activity = activity;
      c.at = c.t;
    }
    const s = c.t - c.at;
    let intensity = 0.7;
    if (activity === 'receiving') {
      // A flash on each landing: packets every 0.19 s from 0.9 s, twelve of them.
      const k = Math.floor((s - 0.9) / 0.19);
      const f = (s - 0.9 - k * 0.19) / 0.19;
      intensity = 0.9 + (k >= 0 && k < 12 ? 0.9 * (1 - f) : 0.15 * Math.sin(s * 6));
    } else if (activity === 'working') {
      // A slow beat, easing: the work's pulse.
      const f = (s % 1.2) / 1.2;
      intensity = 1.1 + 0.6 * (1 - f) ** 2;
    } else if (activity === 'reported') {
      intensity = 1.5 + 0.2 * Math.sin(s * 3);
    }
    light.current.color.copy(colour);
    light.current.intensity = intensity;
  });
  const { local } = figurePlacement(role);
  const position = stationToWorld(role, local[0], 2.1, local[2] + 0.2);
  return (
    <pointLight
      ref={light}
      position={position}
      distance={3.2}
      decay={2}
      color={colour}
      intensity={0.7}
    />
  );
}

/**
 * The porthole frame in the room: a ring in its own XY plane. Its group
 * origin is the ring's lowest point, so it is lowered by that offset to
 * centre it on the aperture; its back face sits against the wall. The
 * retired room's only use of the model; the tabletop has no window (V8).
 */
export function PortholeFrame() {
  const porthole = use(loadPorthole());
  const [x, y, z] = layout.portholeAt;
  return (
    <primitive
      object={porthole.placed}
      position={[x, y - porthole.metadata.runtime.baseOffsetY, z]}
    />
  );
}
