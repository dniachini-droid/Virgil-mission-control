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
 * V2, on the owner's direction after V1: Virgil stands **inside the console
 * well, facing the screens and the camera, and replaces the sun** — the
 * orrery's tracks turn around him. The console is turned 180° so its screen
 * arc is on the near side; the camera is raised above the screen line so the
 * shot reads as looking over a console at the operator beyond it. The window
 * frame is the owner's porthole model and the wall is cut to its measured
 * hole.
 *
 * Every absolute size is a decision read against the approved reference, not
 * a measurement, because all the models arrive normalised:
 *
 *  - **Virgil is 1.8 m** (V1: 1.65 m; the owner asked for a little bigger,
 *    and being the centre of the system argues for presence). On the well
 *    floor at 0.35 m his head reaches 2.15 m, against the window.
 *  - **The console is 2.6 m across**, screen arc to 0.93 m, well floor 0.35 m.
 *  - **The orrery's tracks** run at his chest, radii 0.98–1.72 m: 0.37 m
 *    clear of his widest point, above the console rim at every tilt.
 *  - **The porthole is 11.0 m across**, hole radius 3.524 m as measured; the
 *    wall aperture is cut fractionally smaller so no gap shows.
 *  - **The metal orrery**, when switched in, is 1.1 m tall and stands on the
 *    floor beside the console: it is solid and cannot share his centre.
 */
export const layout = {
  virgilHeight: 1.8,
  virgilAt: [0, 0.35, -2.4] as [number, number, number],

  consoleCentre: [0, 0, -2.4] as [number, number, number],
  consoleRotationY: Math.PI,
  consoleWidth: 2.6,
  consoleTop: 0.93,
  wellFloor: 0.35,

  orreryCentre: [0, 1.55, -2.4] as [number, number, number],
  metalOrreryAt: [2.15, 0, -2.6] as [number, number, number],

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
    position: [0, 2.6, 3.4] as [number, number, number],
    target: [0, 1.5, -2.4] as [number, number, number],
    fov: 38,
  },
} as const;
