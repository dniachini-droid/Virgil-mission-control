/**
 * The room's palette, read off the owner's approved reference
 * `docs/art-direction/approved/visual-canon/03-approved-hybrid.png`
 * (binding, per `docs/decisions/OD-0002-art-direction-checkpoint.md`).
 *
 * The reference keeps a strict discipline that this file encodes: **cream, gold
 * and brass are surfaces; teal and magenta are only ever emitted light.** No
 * object in the room is painted teal or magenta. Where those colours appear they
 * come from a screen, a hologram, a planet or the nebula — never from a
 * material's base colour. Breaking that is the fastest way to lose the look.
 *
 * The second discipline is the one the whole frame is built on: **warm amber
 * from inside the room against cool blue-violet from the window.** Every value
 * below belongs to one side of that contrast or the other.
 *
 * V6 adds the stylised set's two surface colours — the navy the owner's
 * models are painted in, and a saturated frame blue for the screen slabs —
 * under the same rule: they are surfaces, and they are matte.
 */
export const room = {
  /** Surfaces: the cream-and-gold console world. */
  surface: {
    cream: '#f1e7d3',
    creamShadow: '#d9cbb2',
    ivory: '#fbf6ea',
    gold: '#d9a648',
    goldBright: '#f4cd77',
    brass: '#9a763a',
    brassDark: '#5f4a24',
    slate: '#6c6d7d',
    slateDark: '#3b3c48',
    /** The navy of the owner's stylised models, for inlays and the disc's rim. */
    navy: '#1b2a5c',
    /** The screen slabs' frame: saturated, matte, unmistakably a cartoon prop. */
    frame: '#2d44a8',
    frameDark: '#1d2c74',
    /**
     * The cast's own cream, for the screens' cases (V7 §0.3, "the same white
     * as the characters main colour"): the dominant bright low-saturation
     * colour of all four characters' shipped base-colour maps, measured
     * 2026-09-08 — `#fcecd4` on Virgil and the Keeper, `#fceccc` on the
     * Fabricator and the Prover, within one quantisation step of each other.
     */
    castCream: '#fcecd4',
    castCreamShadow: '#e6d3b8',
  },

  /** Warm side of the contrast: the room's own light. */
  warm: {
    key: '#ffd7a3',
    amber: '#ffb765',
    amberDeep: '#ff9036',
    core: '#fff1cf',
    cove: '#ffbe74',
  },

  /** Cool side of the contrast: everything arriving through the window. */
  cool: {
    rim: '#9dc0ff',
    window: '#6f95ff',
    violet: '#6b45c0',
    deep: '#141a3d',
    shadow: '#232a52',
  },

  /** Emitted only. Never a base colour. */
  emit: {
    teal: '#49e6d4',
    cyan: '#38d3ee',
    magenta: '#e560d8',
    rose: '#ff6ec2',
    ice: '#cfe4ff',
  },

  /** The nebula beyond the glass. */
  nebula: {
    core: '#ffb0f2',
    arm: '#c05cf0',
    mid: '#5b3fc4',
    outer: '#1d2a72',
    dust: '#0a0c24',
  },
} as const;

/**
 * Dimensions in metres, in one place because the camera framing, the
 * window aperture and the models' chosen sizes are all answerable to each
 * other.
 *
 * V7 (`docs/process/PHASE_1_STYLISED_SPEC.md` §2, as amended): **the
 * tabletop is the presentation; the room is retired, not removed.** The
 * owner: "Room retired for now. No window. I might go back to it. But for
 * the time being, we proceed with tabletop." So the room's dimensions stay
 * below, unchanged, and the room stays reachable; the tabletop is what the
 * owner is asked to judge.
 *
 * V8 (§0.10.1): **the set is symmetrical.** The owner: "each console
 * should be behind the main virgil console, one directly behinmd it and
 * the other to the left and right, so its symmetrical." Virgil's console
 * stays in front and central; the three role consoles stand behind it —
 * one directly behind, one to its left, one to its right — mirrored about
 * the centre line, each turned a little in toward Virgil. Which role takes
 * which slot the owner did not say: the Fabricator is on the left, the
 * Prover directly behind, the Keeper on the right, in the order of the
 * three hops, and that is this session's choice, recorded as such.
 *
 * V8 (§0.10.3): **no window.** The owner, twice: "remove the circular
 * window. I asked for that." The arch is gone from the tabletop; the disc
 * has no tall element and its silhouette is horizontal, which the level
 * camera (§0.10.4) reads as a stage rather than a plate.
 *
 * Every absolute size is a decision read against a 1.8 m Virgil:
 *
 *  - **Virgil's console is 3.4 m across** (measured: a raised deck at
 *    0.170 m, flat over |x| ≤ 0.68 m, the back rim at 0.87 m, the sides at
 *    about 0.6 m, the front open); he stands on the deck at its centre.
 *  - **The three stations** are 2.2, 2.2 and 2.0 m; each character stands
 *    on the floor at their station's front, to its left (`cast.ts`).
 *  - **The three characters are 1.7 m**, clearly shorter than Virgil.
 *  - **The orrery's tracks** run at Virgil's chest, radii 0.98–1.72 m.
 *  - **The porthole is 11.0 m across** in the retired room only.
 */
const CONSOLE_CENTRE = [0, 0, 0.3] as const;
/** The console's raised deck, measured from the payload (0.10 units × 1.7). */
const CONSOLE_DECK = 0.17;

/** The tabletop's disc: its centre is the set's centre, and the orbit's. */
const DISC_CENTRE = [0, 0, -2.2] as const;
const DISC_RADIUS = 5.4;

/** How far the two side consoles stand from the centre line, and how far back; the centre one's depth. */
const SIDE_X = 2.85;
const SIDE_Z = -3.75;
const BACK_Z = -5.15;
/** The side consoles turn in toward Virgil by this much. */
const SIDE_TURN = 0.38;

export const layout = {
  virgilHeight: 1.8,
  virgilAt: [CONSOLE_CENTRE[0], CONSOLE_DECK, CONSOLE_CENTRE[2]] as [number, number, number],

  consoleCentre: CONSOLE_CENTRE as unknown as [number, number, number],
  consoleRotationY: 0,
  consoleWidth: 3.4,
  consoleDeck: CONSOLE_DECK,
  consoleRim: 0.87,

  /** At his chest: he is a chibi, and his head begins at about 0.8 m. */
  orreryCentre: [CONSOLE_CENTRE[0], 1.2, CONSOLE_CENTRE[2]] as [number, number, number],

  /**
   * The three stations behind Virgil's console, symmetrical about x = 0:
   * the Fabricator's to the left and the Keeper's to the right, mirrored
   * exactly, each turned in toward the centre; the Prover's directly
   * behind, square to the camera. `cameraSide` is which side of a
   * character the eye-level camera stands on (+1 their right), chosen so
   * that their console's screen is in the close-up beside them.
   */
  stations: {
    fabricator: { at: [-SIDE_X, 0, SIDE_Z] as const, rotationY: SIDE_TURN, cameraSide: 1 },
    prover: { at: [0, 0, BACK_Z] as const, rotationY: 0, cameraSide: 1.6 },
    keeper: { at: [SIDE_X, 0, SIDE_Z] as const, rotationY: -SIDE_TURN, cameraSide: 1 },
  },

  /**
   * Virgil's three slabs, above him: the owner's one exception to the
   * consoles carrying their own screens (§0.9), because his ring console's
   * screens face inward and are unreadably small. Over the back of his
   * console, high enough that a level camera sees them above the cast and
   * above the Prover's console behind.
   */
  screenBank: {
    y: 3.05,
    z: -1.35,
    spread: 1.55,
    splay: 0.2,
  },

  // ------------------------------------------------------------ the room
  // Retired, not removed (`VirgilRoom.tsx`). Kept exactly as V6 built it.
  wallZ: -7,
  ceilingY: 9.5,
  sideWallX: 9,
  backWallZ: 6.5,

  windowCentre: [0, 3.4, -7] as [number, number, number],
  /** The porthole's measured hole at its chosen size, times 0.97. */
  apertureRadius: 3.42,
  portholeAt: [0, 3.4, -6.46] as [number, number, number],

  parapetZ: -6.35,
  parapetHeight: 0.55,

  /** The room's camera, as V6 had it. */
  camera: {
    position: [0.35, 2.1, 6.9] as [number, number, number],
    target: [0.1, 1.3, -1.4] as [number, number, number],
    fov: 44,
  },

  /** The tabletop presentation. */
  tabletop: {
    centre: DISC_CENTRE as unknown as [number, number, number],
    radius: DISC_RADIUS,
    thickness: 0.42,
    /**
     * Where the cool light comes from on the tabletop: beyond the back of
     * the disc, where the arch stood until V8. The light stays; the arch
     * does not.
     */
    coolLightAt: [0, 2.8, DISC_CENTRE[2] - DISC_RADIUS + 0.55] as [number, number, number],
    /** Where the authored cameras look: the set's middle, at chest height. */
    target: [0, 1.05, -2.3] as [number, number, number],
    /** The floor's inlaid star, on the open deck front-left of the console. */
    starAt: [-2.95, 0.2] as [number, number],
    /**
     * The backdrop layers behind the disc (`Tabletop.tsx`). V8: raised,
     * because at a near-level camera the disc's far edge hides everything
     * under the horizon — the owner: "the planet and space station in the
     * background is covered by the floating tabletop, so they need to be
     * moved up."
     */
    planetAt: [9, 6.5, -36] as [number, number, number],
    stationAt: [-11, 3.4, -29] as [number, number, number],
  },
} as const;

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

/**
 * The tabletop's camera for a viewport. V8 (§0.10.4): **almost level
 * with the characters, a little above** — the owner: "The camera starts
 * too high up so everything looks squished. It should start almost levelm
 * with the characters, maybe a tiny bit higher." So the elevation is
 * `TABLETOP_ELEVATION_DEG` above the target at chest height, not the 30°
 * of V7, in both orientations. The lens is widened only as far as the
 * set's width needs at the distance, and in portrait the distance is
 * larger because a symmetrical set is wide where a phone is tall. Both
 * are pure functions of the aspect so the captures can be checked at
 * 390 × 664 and 1440 × 900 alike.
 */
export const TABLETOP_ELEVATION_DEG = 11;

export function tabletopCamera(aspect: number): CameraPose {
  const portrait = aspect < 1;
  const elevation = TABLETOP_ELEVATION_DEG * (Math.PI / 180);
  const distance = portrait ? 13 : 11;
  const [tx, ty, tz] = layout.tabletop.target;
  // The set's half-width the frame must hold: the side consoles' outer
  // corners, at about ±4.2 m, with a little air.
  const halfWidth = 4.35;
  const widthFov = 2 * Math.atan(halfWidth / (distance * aspect)) * (180 / Math.PI);
  const fov = Math.min(62, Math.max(portrait ? 44 : 36, widthFov));
  return {
    position: [tx, ty + distance * Math.sin(elevation), tz + distance * Math.cos(elevation)],
    target: [tx, ty, tz],
    fov,
  };
}
