import { use, useMemo } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { StarField } from '../StarField.js';
import { FLOOR_FINISH } from './finish.js';
import { createFloorTexture } from './floorGraphic.js';
import { layout, room } from './palette.js';
import { Contact } from './RoomShell.js';
import { loadWindowTextures } from './WindowView.js';

/**
 * The tabletop: V7's presentation (`docs/process/PHASE_1_STYLISED_SPEC.md`
 * §2 as amended — the room is retired, not removed, and this is the
 * default).
 *
 * A disc floor with a visible edge, so it reads as an object rather than a
 * room; no walls, no ceiling, no window aperture. The owner's nebula is the
 * surrounding backdrop with procedural stars and fine grain layered over
 * it — the nebula reached us at 1672 × 941 because the upload channel
 * recompressed it and no original exists, so its clouds are soft, and it
 * is the stars going mushy that reads as bad, not soft clouds; crisp
 * procedural star points and grain are the agreed remedy. The planet and
 * the station stay as separate, unobstructed depth layers. The grain is a
 * post-process (`VirgilRoom.tsx`).
 *
 * V8 (§0.10.3): **no window.** The owner, twice: "remove the circular
 * window. I asked for that." The arch V7 kept as a skyline element is
 * gone; the disc has no tall element and its silhouette is horizontal,
 * which the near-level camera (§0.10.4) reads as a stage. And (§0.10.5)
 * the planet and the station are **raised**: at a near-level camera the
 * disc's far edge hides everything under the horizon — the owner: "the
 * planet and space station in the background is covered by the floating
 * tabletop, so they need to be moved up." The nebula still wraps a tall
 * cylinder round the whole set, mirrored so no edge can show.
 *
 * V7: the floor's inlay is one texture on the disc's top face
 * (`floorGraphic.ts`), because the coplanar rings V6 laid over the floor
 * z-fought on the owner's phone.
 */
export function Tabletop() {
  const { tier } = useSettings();
  const coarse = tier === 'constrained' || tier === 'mobile';
  return (
    <group>
      <Disc coarse={coarse} />
      <Contact coarse={coarse} centre={layout.tabletop.centre} scale={13} />
      <Backdrop coarse={coarse} />
      <StarField count={coarse ? 900 : 2600} radius={260} />
    </group>
  );
}

/**
 * The disc: matte cream with the inlay drawn into its one top face, a
 * thick navy band and a gold line at its edge, and a shadowed underside.
 * The cylinder's own top cap sits a centimetre under the face so the two
 * never share a plane.
 */
function Disc({ coarse }: { coarse: boolean }) {
  const { centre, radius, thickness, starAt } = layout.tabletop;
  const segments = coarse ? 64 : 128;
  const texture = useMemo(
    () =>
      createFloorTexture({
        centre: [centre[0], centre[2]],
        size: radius * 2,
        console: [layout.consoleCentre[0], layout.consoleCentre[2]],
        star: starAt,
        pixels: coarse ? 1024 : 2048,
      }),
    [centre, radius, starAt, coarse],
  );
  return (
    <group position={[centre[0], centre[1] - thickness / 2, centre[2]]}>
      <mesh position={[0, -0.005, 0]}>
        <cylinderGeometry args={[radius, radius * 0.96, thickness, segments]} />
        <meshStandardMaterial color={room.surface.creamShadow} roughness={0.92} metalness={0} />
      </mesh>
      {/* The edge: a thick band, saturated, a hair proud of the disc. */}
      <mesh position={[0, thickness / 2 - 0.07, 0]}>
        <cylinderGeometry args={[radius + 0.03, radius + 0.03, 0.14, segments, 1, true]} />
        <meshStandardMaterial
          color={room.surface.navy}
          roughness={0.9}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, thickness / 2 - 0.02, 0]}>
        <cylinderGeometry args={[radius + 0.035, radius + 0.035, 0.03, segments, 1, true]} />
        <meshStandardMaterial
          color={room.surface.gold}
          roughness={0.75}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* The one top face, carrying the inlay. **V8.2: it is polished.**
          The owner: the floor "looks a bit dark.... like they are in
          shadows, it looks bland, and dead and lifeless". A floor that
          reflects nothing reads as a plate, and the approved reference
          `docs/art-direction/approved/visual-canon/03-approved-hybrid.png`
          has a polished floor with the star inlaid in it. This half of the
          answer is free — the baked environment map already exists and this
          is one plane sampling it (`finish.ts`, `FLOOR_FINISH`); the other
          half is `FloorSheen`'s smears. The planar mirror V6 removed is not
          coming back. */}
      <mesh position={[0, thickness / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[radius, segments]} />
        <meshStandardMaterial
          map={texture}
          roughness={FLOOR_FINISH.roughness}
          metalness={FLOOR_FINISH.metalness}
          envMapIntensity={FLOOR_FINISH.envMapIntensity}
        />
      </mesh>
    </group>
  );
}

/**
 * The owner's three window layers as a backdrop: the nebula wrapped round
 * a tall cylinder far outside the disc, mirrored at its seams; the planet
 * and the station as planes nearer in, above the disc's far edge from the
 * level camera (`layout.tabletop.planetAt`, `stationAt`), so they slide
 * against the nebula as the camera moves on its arc. Untone-mapped, as
 * behind the glass. The textures are the room's, cloned so the wrap and
 * repeat set here never reach the window.
 */
function Backdrop({ coarse }: { coarse: boolean }) {
  const textures = use(loadWindowTextures());
  const nebula = useMemo(() => {
    const t = textures.nebula.clone();
    t.wrapS = THREE.MirroredRepeatWrapping;
    t.wrapT = THREE.MirroredRepeatWrapping;
    t.repeat.set(2, 1.5);
    t.needsUpdate = true;
    return t;
  }, [textures]);
  const [cx, , cz] = layout.tabletop.centre;
  const [px, py, pz] = layout.tabletop.planetAt;
  const [sx, sy, sz] = layout.tabletop.stationAt;
  return (
    <group>
      <mesh position={[cx, -20, cz]} rotation={[0, Math.PI, 0]}>
        <cylinderGeometry args={[58, 58, 170, coarse ? 32 : 64, 1, true]} />
        <meshBasicMaterial map={nebula} toneMapped={false} side={THREE.BackSide} />
      </mesh>
      <Layer texture={textures.planet} position={[cx + px, py, cz + pz]} height={11} transparent />
      <Layer texture={textures.station} position={[cx + sx, sy, cz + sz]} height={5} transparent />
    </group>
  );
}

function Layer({
  texture,
  position,
  height,
  transparent = false,
}: {
  texture: THREE.Texture;
  position: [number, number, number];
  height: number;
  transparent?: boolean;
}) {
  const image = texture.image as { width: number; height: number };
  const width = height * (image.width / image.height);
  return (
    <mesh position={position} frustumCulled={false}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent={transparent}
        depthWrite={!transparent}
        toneMapped={false}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}
