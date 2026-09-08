import { Environment, Lightformer } from '@react-three/drei';
import { useSettings } from '../../ui/settings.js';
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
 * ornate set did, so every intensity here is roughly half of V5's, read
 * off the first V6 captures where Virgil's cream head blew out to white.
 * The map stays for the porthole frame, which is the one ornate model
 * still used and still carries a metallic-roughness map, at half strength. The same
 * rig lights both presentations; only where the cool side comes from
 * changes — the wall's window in the room, the arch on the tabletop.
 */
export function LightingRig({ view }: { view: 'room' | 'tabletop' }) {
  const { tier } = useSettings();
  const coarse = tier === 'constrained' || tier === 'mobile';
  const [wx, wy, wz] =
    view === 'room'
      ? layout.windowCentre
      : [layout.tabletop.archAt[0], 2.8, layout.tabletop.archAt[2]];
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
        intensity={11}
        position={[3.4, 3.8, 1.2]}
        angle={0.7}
        penumbra={0.8}
        decay={2}
        distance={11}
        target-position={[vx, vy + 1.0, vz]}
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
        intensity={9}
        distance={18}
        decay={2}
        position={[wx, wy + 1.6, wz - 3.5]}
      />
      {/* Ambient: warm above and below. */}
      <hemisphereLight color={room.warm.key} groundColor={room.warm.amberDeep} intensity={0.3} />

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
