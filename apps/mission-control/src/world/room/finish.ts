import * as THREE from 'three';
import { room } from './palette.js';

/**
 * **The consoles' surface finish, and the floor's.**
 *
 * V8.2, from the owner's observation of 8 September: *"the consoles of the
 * agents, and the floor... it looks a bit dark.... like they are in
 * shadows, it looks bland, and dead and lifeless.... Im thining of
 * changing the consoles, because you can see that they arent made
 * straight/smooth etc.... unless you have any ideas."* The diagnosis is in
 * `docs/process/PHASE_1_BACKLOG.md`; the first of its three causes is
 * here.
 *
 * Every console declared `metalness 0, roughness 0.8` — the factors its
 * source glTF carries, recorded by `asset-pipeline/reduce-model.mjs` into
 * each `-asset.json` and applied by `assets/meshyAsset.ts`. At roughness
 * 0.8 there is effectively no specular highlight, and matte under flat
 * light is the one condition that *reveals* faceting, because nothing but
 * the shading step between flats is left to look at. So his "dead"
 * complaint and his "not smooth" complaint are the same defect.
 *
 * The owner: *"i agree with all your choices. on the lighting. they. are
 * all good. implement all."*
 *
 * **The declared factors are not edited.** `fabricatorStation-asset.json`
 * and the rest record what the source model declares, they are generated
 * files, and a hand-edit there would be a false record of the owner's
 * asset. This is an art-direction override, applied at runtime, to the
 * four consoles the owner named and to nothing else — the three role
 * stations and Virgil's ring console. The characters keep their own
 * declared factors (0.8, 0.5, 0.8), because he did not name them and their
 * visors already carry the set's gloss.
 */
export const CONSOLE_FINISH = {
  /**
   * Landed on by looking at the four registered A/B frames, from 0.80.
   * At 0.55 the cream reads matte still; at 0.30 the highlight sharpens
   * into a hot spot that shows every facet edge of the decimated mesh —
   * the opposite of what this is for. 0.42 is the value that gives a
   * highlight wide enough to travel across a panel as the camera moves
   * without resolving the facets.
   */
  roughness: 0.42,
  metalness: 0,
  /**
   * The sheen: a soft grazing-angle lift, warm, so the edge of a cream
   * case catches light turning away from the camera. This is the one thing
   * here that costs a shader — `MeshPhysicalMaterial` rather than
   * `MeshStandardMaterial`, on four meshes.
   */
  sheen: 0.55,
  sheenRoughness: 0.6,
  sheenColour: room.warm.key,
  /** The room's baked environment, a little stronger on a smoother surface. */
  envMapIntensity: 1.25,
} as const;

/**
 * The floor's finish. `RoomShell.tsx` records that the planar mirror was
 * removed as too expensive, and that is not being brought back. This is
 * the cheap half of the replacement: the floor reflects the **environment**
 * — the room's own baked lightformers and the deep blue beyond — which
 * costs nothing per frame beyond a smoother BRDF on one plane, and is what
 * makes it read as polished stone rather than as a plate. The other half is
 * `FloorSheen`'s smears.
 *
 * The owner-approved reference
 * `docs/art-direction/approved/visual-canon/03-approved-hybrid.png` has a
 * polished floor with the star inlaid in it; the inlay is already drawn
 * into the disc's one top face (`floorGraphic.ts`), so it stays crisp
 * under this rather than competing with a reflection, which is what went
 * wrong in V5.
 */
export const FLOOR_FINISH = {
  roughness: 0.52,
  /**
   * A little metalness, which is what puts the environment into a
   * dielectric floor at a believable strength without turning the inlay
   * into a mirror. Above about 0.2 the cream inlay goes grey, because a
   * metal takes its diffuse colour out of the base colour — and at 0.12,
   * looked at, the nebula's magenta and blue banded right across the
   * inlay, which is not what a polished floor does and is not in the
   * approved reference. 0.07 with the intensity carried on the floor's own
   * `envMapIntensity` keeps the polish and loses the bands.
   */
  metalness: 0.07,
  envMapIntensity: 1.15,
} as const;

/**
 * Replaces a stylised console's material with the same maps under the
 * finish above. Idempotent: it names the material it made, so a re-render
 * or a Suspense retry does not rebuild it.
 */
export function applyConsoleFinish(
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>,
): void {
  if (mesh.material.name === 'console-finish') return;
  const previous = mesh.material;
  const material = new THREE.MeshPhysicalMaterial({
    map: previous.map,
    normalMap: previous.normalMap,
    roughnessMap: previous.roughnessMap,
    metalnessMap: previous.metalnessMap,
    color: previous.color,
    side: previous.side,
    roughness: CONSOLE_FINISH.roughness,
    metalness: CONSOLE_FINISH.metalness,
    sheen: CONSOLE_FINISH.sheen,
    sheenRoughness: CONSOLE_FINISH.sheenRoughness,
    sheenColor: new THREE.Color(CONSOLE_FINISH.sheenColour),
    envMapIntensity: CONSOLE_FINISH.envMapIntensity,
    name: 'console-finish',
  });
  mesh.material = material;
  previous.dispose();
}
