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
 * The environment map is not optional. All three models arrive with metalness
 * and roughness at 1.0 and the texture doing the work; a metallic surface with
 * nothing to reflect renders black. The `<Environment>` here is procedural —
 * no preset, no file, nothing fetched — and it encodes the same contrast:
 * warm panels above and in front, one large cool panel behind.
 */
export function LightingRig() {
  const { tier } = useSettings();
  const coarse = tier === 'constrained' || tier === 'mobile';
  const [wx, wy, wz] = layout.windowCentre;
  const [vx, vy, vz] = layout.virgilAt;
  const [cx, , cz] = layout.consoleCentre;

  return (
    <group>
      {/* Warm key. Shadows on, because the console's own shadow on the floor
          and Virgil's on the console are what seat them in the room. */}
      <spotLight
        color={room.warm.key}
        intensity={55}
        position={[-3.2, 5.6, 2.4]}
        angle={0.55}
        penumbra={0.7}
        decay={2}
        distance={22}
        castShadow={!coarse}
        shadow-mapSize={[coarse ? 512 : 2048, coarse ? 512 : 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        target-position={[vx, vy + 0.9, vz]}
      />
      {/* Warm second key from the right, lower and weaker, so his face is not
          a single hard slope of light. */}
      <spotLight
        color={room.warm.amber}
        intensity={22}
        position={[3.4, 3.8, 1.2]}
        angle={0.6}
        penumbra={0.8}
        decay={2}
        distance={10}
        target-position={[vx, vy + 1.0, vz]}
      />
      {/* The console's practicals: the screen arc is on the near side now,
          facing him, so its amber comes up into his chest and the underside
          of his face from in front — the reference's uplight. Two lights,
          offset, so it has a direction. */}
      <pointLight
        color={room.warm.amberDeep}
        intensity={3.5}
        distance={6}
        decay={2}
        position={[cx - 0.6, 0.85, cz + 1.0]}
      />
      <pointLight
        color={room.warm.amber}
        intensity={2.5}
        distance={6}
        decay={2}
        position={[cx + 0.7, 0.85, cz + 1.0]}
      />
      {/* The cool side. A directional from beyond the window, low enough to
          come through the aperture and catch the top of his crown and the gold
          discs. */}
      <directionalLight
        color={room.cool.window}
        intensity={2.6}
        position={[wx + 1.5, wy + 2.5, wz - 6]}
        target-position={[vx, vy + 1.3, vz]}
      />
      {/* Violet fill from beyond the aperture, so the shadow side of everything
          the window sees goes blue instead of black. Placed outside the wall:
          sitting just inside it, it lit the sill so hard that the sill's
          reflection in the floor read as a lilac hot patch (V1's flaw). */}
      <pointLight
        color={room.cool.violet}
        intensity={14}
        distance={18}
        decay={2}
        position={[wx, wy + 1.6, wz - 3.5]}
      />
      {/* Ambient: warm above and below. The walls are cream and the coves are
          amber, so the room's own ambient is warm; the cool arrives only
          through the aperture, from the two lights above. */}
      <hemisphereLight color={room.warm.key} groundColor={room.warm.amberDeep} intensity={0.42} />

      <Environment resolution={coarse ? 64 : 256} frames={1} background={false}>
        {/* The sphere the panels sit in: deep blue-violet, so metals that see
            nothing else reflect the window's colour, not black. */}
        <mesh scale={60}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshBasicMaterial color={room.cool.deep} side={1} />
        </mesh>
        {/* Cool: one large panel behind, where the window is. */}
        <Lightformer
          form="circle"
          intensity={5}
          color={room.cool.window}
          position={[0, 4, -18]}
          scale={14}
          target={[0, 1, 0]}
        />
        {/* Warm: a ceiling ring of panels and a front panel, the room's coves
            and the amber bounce off cream walls. */}
        <Lightformer
          form="ring"
          intensity={4}
          color={room.warm.cove}
          position={[0, 12, -2]}
          scale={9}
          target={[0, 0, -2]}
        />
        <Lightformer
          form="rect"
          intensity={3}
          color={room.warm.key}
          position={[0, 5, 16]}
          scale={[20, 6, 1]}
          target={[0, 1, 0]}
        />
        <Lightformer
          form="rect"
          intensity={2}
          color={room.warm.amber}
          position={[-16, 3, 0]}
          scale={[10, 4, 1]}
          target={[0, 1, 0]}
        />
        <Lightformer
          form="rect"
          intensity={2}
          color={room.warm.amber}
          position={[16, 3, 0]}
          scale={[10, 4, 1]}
          target={[0, 1, 0]}
        />
        {/* The floor's own bounce, warm and dim, from below. */}
        <Lightformer
          form="rect"
          intensity={1.2}
          color={room.surface.cream}
          position={[0, -10, 0]}
          scale={[24, 24, 1]}
          target={[0, 1, 0]}
        />
      </Environment>
    </group>
  );
}
