import { Environment, Lightformer } from '@react-three/drei';
import { useSettings } from '../../ui/settings.js';
import { CAST, ROLES, stationToWorld } from './cast.js';
import { layout, room } from './palette.js';

/**
 * The lighting rig. This is the frame's one idea, stated in light:
 *
 *   **warm amber from inside the room, cool blue-violet from the window.**
 *
 * Everything below belongs to one side of that contrast. The warm side is the
 * key (a spot from high front-left, the way the reference's amber falls on
 * Virgil's cape and the console's cream), the amber practicals at the console,
 * and a warm floor bounce. The cool side is a directional from behind, through
 * the aperture, that rims his crown, shoulders and the discs beside his head,
 * plus a violet fill so his shadow side is blue rather than black.
 *
 * V6: the stylised set is matte and non-metallic (`metallicFactor` 0 in
 * every file), so it lights correctly without the environment map doing
 * the work — and it reflects far more diffuse light than the metallic
 * ornate set did, so every intensity here was roughly half of V5's, read
 * off the first V6 captures where Virgil's cream head blew out to white.
 * The map stays for the porthole frame, which is the one ornate model
 * still used and still carries a metallic-roughness map, at half strength. The same
 * rig lights both presentations; only where the cool side comes from
 * changes — the wall's window in the room, the back of the disc on the
 * tabletop (V8: the arch is gone, the light it stood in stays).
 *
 * **V8.2: "normal" means lit, and there is a rim behind every console.**
 * The owner, of the V8.1 frames: *"the consoles of the agents, and the
 * floor... it looks a bit dark.... like they are in shadows, it looks
 * bland, and dead and lifeless"*, and, of the four changes proposed
 * against it: *"i agree with all your choices. on the lighting. they. are
 * all good. implement all."*
 *
 * Two of the three causes were here. The halving above was sound
 * reasoning that landed dark — `hemisphereLight` at 0.3 — and his V8
 * spotlight instruction ("all of the consoles remain **normal** when not
 * in use, but when they are doing work, they are lit up lighter") had been
 * built as two states rather than three, with *normal* meaning *dark*, so
 * two of the three stations were unlit at any moment and the band behind
 * Virgil was in shadow. So:
 *
 *  - **the ambient and the fill carry an idle console.** The hemisphere
 *    goes 0.3 → 0.95, the violet fill 9 → 12, and a wide, shadowless
 *    **back-row fill** stands over the three stations, which the warm key
 *    barely reaches: they sit 9–11 m from it with `decay: 2`, which is the
 *    arithmetic of the shadowed band;
 *  - **the spotlight is a lift over that baseline**, not the only light on
 *    a console (`Models.tsx`: `SPOT.base` under `SPOT.lift`). The fast
 *    rise and slow decay are untouched, so the decay still reads as a
 *    memory of work just done;
 *  - **a rim light behind each console**, cool, so a cream case has an edge
 *    against the starfield instead of dissolving into it.
 *
 * What that costs: the light count goes from six to nine on the desktop
 * tiers, and the three rims become one shared rim behind the back row on
 * `mobile` and `constrained`, because every light is per-fragment work on
 * every lit material. No frame time has been measured, here or anywhere on
 * this branch (`docs/decisions/OD-0005-phase-1-visual-checks-and-reference.md`).
 */
export function LightingRig({ view }: { view: 'room' | 'tabletop' }) {
  const { tier } = useSettings();
  const coarse = tier === 'constrained' || tier === 'mobile';
  const [wx, wy, wz] = view === 'room' ? layout.windowCentre : layout.tabletop.coolLightAt;
  const [vx, vy, vz] = layout.virgilAt;
  const [cx, , cz] = layout.consoleCentre;

  return (
    <group>
      {/* Warm key. Shadows on, because the cast's shadows on the floor are
          what seat them in the set. */}
      <spotLight
        color={room.warm.key}
        intensity={26}
        position={[-3.2, 5.6, 2.4]}
        angle={0.62}
        penumbra={0.7}
        decay={2}
        distance={22}
        castShadow={!coarse}
        shadow-mapSize={[coarse ? 512 : 2048, coarse ? 512 : 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        target-position={[vx, vy + 0.9, vz]}
      />
      {/* Warm second key from the right, lower and weaker, so no face is a
          single hard slope of light. */}
      <spotLight
        color={room.warm.amber}
        intensity={16}
        position={[3.4, 3.8, 1.2]}
        angle={0.7}
        penumbra={0.8}
        decay={2}
        distance={13}
        target-position={[vx, vy + 1.0, vz]}
      />
      {/* **The back-row fill (V8.2).** The three stations stand 9-11 m from
          the warm key with `decay: 2`, so almost none of it arrives: this is
          the shadowed band the owner saw. A wide, shadowless spot from above
          and in front of the back row lifts them to the same reading as
          Virgil's console — which was the only thing in the set with a light
          of its own. Aimed at the middle station, wide enough to hold all
          three. */}
      <spotLight
        color={room.warm.key}
        intensity={30}
        position={[0, 6.4, 1.2]}
        angle={0.82}
        penumbra={0.9}
        decay={2}
        distance={16}
        target-position={[0, 0.9, layout.stations.prover.at[2] + 0.6]}
      />
      {/* The console's practicals: amber up into his chest and the underside
          of his face from in front — the reference's uplight. */}
      <pointLight
        color={room.warm.amberDeep}
        intensity={2}
        distance={6}
        decay={2}
        position={[cx - 0.6, 0.85, cz + 1.0]}
      />
      <pointLight
        color={room.warm.amber}
        intensity={1.5}
        distance={6}
        decay={2}
        position={[cx + 0.7, 0.85, cz + 1.0]}
      />
      {/* The cool side. A directional from beyond the window or the arch,
          catching crowns and shoulders from behind. */}
      <directionalLight
        color={room.cool.window}
        intensity={2.6}
        position={[wx + 1.5, wy + 2.5, wz - 6]}
        target-position={[vx, vy + 1.3, vz]}
      />
      {/* Violet fill from beyond, so the shadow side of everything goes
          blue instead of black. */}
      <pointLight
        color={room.cool.violet}
        intensity={12}
        distance={18}
        decay={2}
        position={[wx, wy + 1.6, wz - 3.5]}
      />
      {/* Ambient: warm above and below. **V8.2: 0.3 to 0.95** — this one
          number is most of what "normal means lit" is. It is what an idle
          console is lit by when no spotlight is on it. */}
      <hemisphereLight color={room.warm.key} groundColor={room.warm.amberDeep} intensity={0.8} />
      {/* **The rim behind each console (V8.2).** Cool, low, close: it does
          not light the console's front, it edges its silhouette so a cream
          case reads against the starfield. Three on the desktop tiers, one
          shared behind the back row on a phone, because every light costs
          per fragment on every lit material. */}
      {coarse ? (
        <pointLight
          color={room.cool.rim}
          intensity={26}
          distance={13}
          decay={2}
          position={[0, 1.75, layout.stations.prover.at[2] - 2.6]}
        />
      ) : (
        ROLES.map((role) => {
          const [rx, , rz] = stationToWorld(role, 0, 0, -1.35);
          return (
            <pointLight
              key={role}
              color={room.cool.rim}
              intensity={9}
              distance={4.6}
              decay={2}
              position={[rx, CAST[role].station.metadata.runtime.targetMetres * 0.82, rz]}
            />
          );
        })
      )}

      <Environment resolution={coarse ? 64 : 256} frames={1} background={false}>
        <mesh scale={60}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshBasicMaterial color={room.cool.deep} side={1} />
        </mesh>
        <Lightformer
          form="circle"
          intensity={2.5}
          color={room.cool.window}
          position={[0, 4, -18]}
          scale={14}
          target={[0, 1, 0]}
        />
        <Lightformer
          form="ring"
          intensity={2}
          color={room.warm.cove}
          position={[0, 12, -2]}
          scale={9}
          target={[0, 0, -2]}
        />
        {/* **V8.2 deliberately leaves the environment alone.** Raising it
            was the first thing tried and it was wrong: the set's one glass
            (`glass.ts`) is drawn additively and reflects the environment,
            so a brighter environment washed out every screen picture and
            every visor — the Keeper's near-black display came back grey.
            The lift belongs in the lights, which the glass does not see;
            the polished floor gets what it needs from its own
            `envMapIntensity` (`finish.ts`). */}
        <Lightformer
          form="rect"
          intensity={1.5}
          color={room.warm.key}
          position={[0, 5, 16]}
          scale={[20, 6, 1]}
          target={[0, 1, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1}
          color={room.warm.amber}
          position={[-16, 3, 0]}
          scale={[10, 4, 1]}
          target={[0, 1, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1}
          color={room.warm.amber}
          position={[16, 3, 0]}
          scale={[10, 4, 1]}
          target={[0, 1, 0]}
        />
        <Lightformer
          form="rect"
          intensity={0.6}
          color={room.surface.cream}
          position={[0, -10, 0]}
          scale={[24, 24, 1]}
          target={[0, 1, 0]}
        />
      </Environment>
    </group>
  );
}
