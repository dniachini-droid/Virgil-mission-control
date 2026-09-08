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
 * The V7 composition arranges the cast **in depth, not across**: the
 * owner, on a phone, had "to zoom out too far to see all of them", and no
 * camera reconciles a wide arrangement with a tall frame. Virgil stands
 * forward at his console; the three agents recede behind him at three
 * different distances, the cluster compacted from a 13 m disc with
 * stations near the rim to stations roughly three to five metres apart.
 * A tall frame reads depth well and width badly, so this is the
 * arrangement the phone sees too, with its own camera (`tabletopCamera`).
 *
 * Every absolute size is a decision read against a 1.8 m Virgil:
 *
 *  - **Virgil's console is 3.4 m across** (measured: a raised deck at
 *    0.170 m, flat over |x| ≤ 0.68 m, the back rim at 0.87 m, the sides at
 *    about 0.6 m, the front open); he stands on the deck at its centre.
 *  - **The three stations** are 2.2, 2.2 and 2.0 m; each character stands
 *    on the floor at their station's front-left corner (`cast.ts`).
 *  - **The three characters are 1.7 m**, clearly shorter than Virgil.
 *  - **The orrery's tracks** run at Virgil's chest, radii 0.98–1.72 m.
 *  - **The porthole is 11.0 m across** in the retired room, and stands at
 *    5.6 m as the tabletop's arch — the skyline element that stops a flat
 *    disc reading as a straight line.
 */
const CONSOLE_CENTRE = [0, 0, 0.3] as const;
/** The console's raised deck, measured from the payload (0.10 units × 1.7). */
const CONSOLE_DECK = 0.17;

/** The tabletop's disc: its centre is the set's centre, and the orbit's. */
const DISC_CENTRE = [0, 0, -2.2] as const;
const DISC_RADIUS = 5.4;

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
   * The three stations, receding behind Virgil at three depths: the
   * Fabricator nearest on the left, the Keeper further on the right, the
   * Prover furthest, near the arch. Each faces the camera, turned a little
   * in toward the centre. `cameraSide` is which side of a character the
   * eye-level camera stands on (+1 their right), chosen so that no other
   * character fills the close-up.
   */
  stations: {
    fabricator: { at: [-2.55, 0, -3.15] as const, rotationY: 0.5, cameraSide: 1 },
    keeper: { at: [2.65, 0, -4.05] as const, rotationY: -0.62, cameraSide: -1 },
    prover: { at: [0.35, 0, -5.45] as const, rotationY: -0.1, cameraSide: 1 },
  },

  /**
   * The three slabs behind Virgil: a review board, tall and back over the
   * agents' heads rather than a row at head height that would hide the
   * cast behind it. Measured against the 30° camera: the board's foot at
   * 2.55 m over z −2.9 clears the Fabricator's head from the authored pose.
   */
  screenBank: {
    y: 3.25,
    z: -2.9,
    spread: 1.6,
    splay: 0.22,
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
    /** The porthole standing free as an arch at the back of the disc. */
    archAt: [0, 0, DISC_CENTRE[2] - DISC_RADIUS + 0.55] as [number, number, number],
    archDiameter: 5.6,
    /** Where the two authored cameras look: the set's middle, at waist height. */
    target: [0, 1.0, -2.4] as [number, number, number],
    /** The floor's inlaid star, on the open deck front-left of the console. */
    starAt: [-2.95, 0.2] as [number, number],
  },
} as const;

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

/**
 * The tabletop's camera for a viewport. Landscape: 30° elevation, 12.5 m
 * out, a 36° lens, as the spec authored it. Portrait — a phone held
 * upright — is a different framing, not the same one zoomed out: steeper
 * (38°), so that depth reads as height in the tall frame, and the lens
 * widened only as far as the set's width needs at that distance. Both are
 * pure functions of the aspect so the captures can be checked at
 * 390 × 664 and 1440 × 900 alike.
 */
export function tabletopCamera(aspect: number): CameraPose {
  const portrait = aspect < 1;
  const elevation = (portrait ? 38 : 30) * (Math.PI / 180);
  const distance = portrait ? 12 : 12.5;
  const [tx, ty, tz] = layout.tabletop.target;
  // The set's half-width the frame must hold: the outer stations' far
  // edges (the Fabricator's at −3.65 m, the Keeper's at 3.45 m).
  const halfWidth = 3.8;
  const widthFov = 2 * Math.atan(halfWidth / (distance * aspect)) * (180 / Math.PI);
  const fov = Math.min(62, Math.max(portrait ? 44 : 36, widthFov));
  return {
    position: [tx, ty + distance * Math.sin(elevation), tz + distance * Math.cos(elevation)],
    target: [tx, ty, tz],
    fov,
  };
}
