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
 * `../characters/Figure.tsx`.
 */

/** Virgil's console: the low oval ring with the raised deck he stands on. */
export function VirgilConsole() {
  const console_ = use(loadConsole3());
  return (
    <primitive
      object={console_.placed}
      position={layout.consoleCentre}
      rotation={[0, layout.consoleRotationY, 0]}
    />
  );
}

/** One role's own station, from the cast table. */
export function Station({ role }: { role: Role }) {
  const member = CAST[role];
  const station = use(member.station.load());
  return (
    <primitive object={station.placed} position={member.at} rotation={[0, member.rotationY, 0]} />
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
 * flash as each packet lands, at the panel's packet rate — amber while
 * they work, beating at the panel's check rhythm, and the report's colour
 * once it is reported. It is what lets the state be read off a character
 * and their station from across the room, not only off the panel.
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
          : activity === 'reported' && report === 'COMPLETE'
            ? room.emit.ice
            : STATION_LIGHT[activity],
      ),
    [activity, report],
  );
  useFrame((_, delta) => {
    if (!light.current) return;
    const c = since.current;
    if (!reducedMotion) c.t += delta;
    if (c.activity !== activity) {
      c.activity = activity;
      c.at = c.t;
    }
    const s = c.t - c.at;
    let intensity = 0.7;
    if (activity === 'receiving') {
      // A flash on each landing: packets every 0.26 s from 0.8 s, eight of them.
      const k = Math.floor((s - 0.8) / 0.26);
      const f = (s - 0.8 - k * 0.26) / 0.26;
      intensity = 0.9 + (k >= 0 && k < 8 ? 0.9 * (1 - f) : 0.15 * Math.sin(s * 6));
    } else if (activity === 'working') {
      // The check beat: half a check, 0.525 s, a bright attack and a decay.
      const f = (s % 0.525) / 0.525;
      intensity = 1.1 + 0.8 * (1 - f) ** 2;
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
 * centre it on the aperture; its back face sits against the wall.
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

/**
 * The same porthole standing free at the back of the tabletop's disc: an
 * arch, which gives a flat disc a skyline. The payload is sized for the
 * wall (11 m); here it is scaled to `layout.tabletop.archDiameter`, its
 * foot on the disc, and the reason is the one in the spec — without it the
 * silhouette is all horizontal.
 */
export function Arch() {
  const porthole = use(loadPorthole());
  const k = layout.tabletop.archDiameter / porthole.metadata.runtime.targetMetres;
  const [x, y, z] = layout.tabletop.archAt;
  return <primitive object={porthole.placed} position={[x, y, z]} scale={k} />;
}
