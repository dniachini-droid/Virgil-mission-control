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
 * V6 (`docs/process/PHASE_1_STYLISED_SPEC.md`): the stylised set, in two
 * presentations that share every prop and every character —
 *
 *  - **the room**, as approved from V1 to V5: walls, the porthole in the
 *    back wall with the owner's window layers behind it, the coves;
 *  - **the tabletop**: a disc floor with a visible edge, no walls, the
 *    porthole standing free as an arch at the back, the nebula and its
 *    planet and station as the backdrop, a camera at 30° on a 120° arc.
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
 *  - **The porthole is 11.0 m across** in the wall, and stands at 5.6 m as
 *    the tabletop's arch.
 */
const CONSOLE_CENTRE = [0, 0, -2.4] as const;
/** The console's raised deck, measured from the payload (0.10 units × 1.7). */
const CONSOLE_DECK = 0.17;

export const layout = {
  virgilHeight: 1.8,
  virgilAt: [CONSOLE_CENTRE[0], CONSOLE_DECK, CONSOLE_CENTRE[2]] as [number, number, number],

  consoleCentre: CONSOLE_CENTRE as unknown as [number, number, number],
  consoleRotationY: 0,
  consoleWidth: 3.4,
  consoleDeck: CONSOLE_DECK,
  consoleRim: 0.87,

  /** At his chest: he is a chibi, and his head begins at about 0.8 m. */
  orreryCentre: [0, 1.2, -2.4] as [number, number, number],

  /**
   * The three stations, each facing the room's camera. Fabricator left and
   * Prover right behind the line of the console; Keeper right and forward,
   * turned in toward the centre. In the room view the Keeper sits at the
   * frame's right edge from the authored camera and clears on a small
   * orbit; the tabletop sees all three.
   */
  stations: {
    fabricator: { at: [-3.5, 0, -3.3] as const, rotationY: 0.62 },
    prover: { at: [3.5, 0, -3.3] as const, rotationY: -0.62 },
    keeper: { at: [3.5, 0, -0.5] as const, rotationY: -1.1 },
  },

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

  /** The room's camera: a little wider and further back than V5, for four figures. */
  camera: {
    position: [0.35, 2.1, 4.9] as [number, number, number],
    target: [0.1, 1.3, -2.4] as [number, number, number],
    fov: 44,
  },

  /** The tabletop presentation. */
  tabletop: {
    centre: [0, 0, -1.6] as [number, number, number],
    radius: 6.6,
    thickness: 0.42,
    /** The porthole standing free as an arch at the back of the disc. */
    archAt: [0, 0, -6.5] as [number, number, number],
    archDiameter: 5.6,
    /** 30° elevation, looking at the set's middle. */
    camera: {
      position: [0, 0.9 + 13.5 * Math.sin(Math.PI / 6), -1.6 + 13.5 * Math.cos(Math.PI / 6)] as [
        number,
        number,
        number,
      ],
      target: [0, 0.9, -1.6] as [number, number, number],
      fov: 36,
    },
  },
} as const;
