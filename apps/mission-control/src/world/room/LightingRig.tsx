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
  const [vx, , vz] = layout.virgilAt;
  const [cx, cy, cz] = layout.orreryAt;

  return (
    <group>
      {/* Warm key. Shadows on, because the console's own shadow on the floor
          and Virgil's on the console are what seat them in the room. */}
      <spotLight
        color={room.warm.key}
        intensity={140}
        position={[-3.2, 5.6, 2.4]}
        angle={0.55}
        penumbra={0.7}
        decay={2}
        distance={22}
        castShadow={!coarse}
        shadow-mapSize={[coarse ? 512 : 2048, coarse ? 512 : 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        target-position={[vx, 1.0, vz + 1.2]}
      />
      {/* Warm second key from the right, lower and weaker, so his face is not
          a single hard slope of light. */}
      <spotLight
        color={room.warm.amber}
        intensity={60}
        position={[3.4, 3.8, 1.2]}
        angle={0.6}
        penumbra={0.8}
        decay={2}
        distance={18}
        target-position={[vx, 1.1, vz]}
      />
      {/* The console's practicals: amber from the panels up into his chest and
          the underside of his face, which is where the reference's warmth on
          him comes from. Two lights, offset, so the uplight has a direction. */}
      <pointLight
        color={room.warm.amberDeep}
        intensity={7}
        distance={6}
        decay={2}
        position={[cx - 0.7, cy + 0.25, cz + 0.9]}
      />
      <pointLight
        color={room.warm.amber}
        intensity={5}
        distance={6}
        decay={2}
        position={[cx + 0.8, cy + 0.25, cz + 0.6]}
      />
      {/* The cool side. A directional from beyond the window, low enough to
          come through the aperture and catch the top of his crown and the gold
          discs. */}
      <directionalLight
        color={room.cool.window}
        intensity={2.6}
        position={[wx + 1.5, wy + 2.5, wz - 6]}
        target-position={[vx, 1.2, vz]}
      />
      {/* Violet fill from the window centre, so the shadow side of everything
          the window sees goes blue instead of black. */}
      <pointLight
        color={room.cool.violet}
        intensity={26}
        distance={16}
        decay={2}
        position={[wx, wy, wz + 0.6]}
      />
      {/* Ambient: sky cool, ground warm. The reflected floor is warm, so the
          light coming up off it is too. */}
      <hemisphereLight
        color={room.cool.shadow}
        groundColor={room.warm.amberDeep}
        intensity={0.55}
      />

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
