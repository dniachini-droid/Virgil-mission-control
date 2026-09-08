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
 * Room dimensions in metres, in one place because the camera framing, the
 * window aperture and the models' chosen sizes are all answerable to each
 * other.
 *
 * V3, on the owner's direction after V2: the ring console
 * (`console-model-candidate-02.glb`) replaces the first one; Virgil stands
 * on its well floor (measured 0.384 m; the rim rises to 0.75 m at r = 1.2 m,
 * so it meets him at the knee and he is not squashed inside it); **he faces
 * the camera with his back to the window, and the console's screens sit
 * behind him** — face, screens, window, front to back. A generic side
 * station stands to his right with the Prover at it.
 *
 * Every absolute size is a decision read against the approved reference:
 *
 *  - **Virgil is 1.8 m** (rigged model, feet at its origin).
 *  - **The ring console is 3.0 m across**, primary; the **side station 1.7 m**
 *    across, secondary, one model for every slot.
 *  - **The Prover is 1.6 m**, clearly shorter than Virgil, and stands in the
 *    centre of his station on its measured floor (V5; he stood behind it).
 *  - **The orrery's tracks** run at Virgil's chest, radii 0.98–1.72 m, above
 *    the console rim at every tilt.
 *  - **The porthole is 11.0 m across**, hole radius 3.524 m as measured.
 */
const STATION_AT = [2.85, 0, -2.75] as [number, number, number];
const STATION_ROTATION_Y = -0.5;
const STATION_FLOOR = 0.108;
const PROVER_IN_STATION = [0, STATION_FLOOR, 0.1] as [number, number, number];
const PROVER_AT = [
  STATION_AT[0] + Math.sin(STATION_ROTATION_Y) * PROVER_IN_STATION[2],
  STATION_FLOOR,
  STATION_AT[2] + Math.cos(STATION_ROTATION_Y) * PROVER_IN_STATION[2],
] as [number, number, number];

export const layout = {
  virgilHeight: 1.8,
  virgilAt: [0, 0.39, -2.4] as [number, number, number],

  consoleCentre: [0, 0, -2.4] as [number, number, number],
  consoleRotationY: 0,
  consoleWidth: 3.0,
  consoleRim: 0.75,
  wellFloor: 0.384,

  orreryCentre: [0, 1.62, -2.4] as [number, number, number],

  stationAt: STATION_AT,
  stationRotationY: STATION_ROTATION_Y,
  /**
   * The station's measured standing floor: a deck at 0.108 m, flat to
   * within 4 mm over |x| ≤ 0.3 from z −0.2 to its open front at z +0.55 in
   * its own frame, with desks rising to 0.44–0.60 m at the back and both
   * sides. A U with a clear centre, like the console's well.
   * `test/prover-station.test.ts` re-measures it from the payload and holds
   * the Prover clear of it at every extreme of his breathing.
   */
  stationFloor: STATION_FLOOR,
  /** Where the Prover stands in the station's frame: its centre, a little forward. */
  proverInStation: PROVER_IN_STATION,
  proverAt: PROVER_AT,
  /** Facing the room's camera, as Virgil does; his visor is a state display. */
  proverRotationY: -0.45,

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

  camera: {
    position: [0.35, 1.95, 3.7] as [number, number, number],
    target: [0.1, 1.35, -2.4] as [number, number, number],
    fov: 40,
  },
} as const;
