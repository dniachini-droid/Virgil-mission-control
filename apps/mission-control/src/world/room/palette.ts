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
 * window aperture and the three models' chosen sizes are all answerable to
 * each other.
 *
 * All three models arrive normalised to a 2-unit box, so every absolute size
 * here is a decision read against the approved reference, not a measurement:
 *
 *  - **Virgil is 1.65 m.** The console top then meets him below the chest, as
 *    it does in the reference, and his eye line clears the orrery.
 *  - **The console is 2.6 m across**, top at 0.93 m. In the reference the dais
 *    is a piece of furniture he stands behind, wider than he is tall, and its
 *    rim is at his lower chest. 2.0 m (the source size) read as a table.
 *  - **The orrery is 1.15 m tall** on top of the console, so its sphere sits
 *    between his chest and his eyes and is read against his face, as in the
 *    reference, without covering it.
 *
 * The reference is a wide-angle frame and its dais reads larger relative to
 * him than a measurement would give; these are a considered reading of it.
 */
export const layout = {
  virgilHeight: 1.65,
  virgilAt: [0, 0, -4.15] as [number, number, number],

  consoleCentre: [0, 0, -2.4] as [number, number, number],
  consoleWidth: 2.6,
  consoleTop: 0.93,

  orreryAt: [0, 0.93, -2.4] as [number, number, number],
  orreryHeight: 1.15,

  wallZ: -7,
  ceilingY: 7.5,
  sideWallX: 9,
  backWallZ: 6.5,
  floorRadius: 16,

  windowCentre: [0, 3.0, -7] as [number, number, number],
  windowRadius: 3.4,

  parapetZ: -6.2,
  parapetHeight: 0.95,

  camera: {
    position: [0, 1.55, 1.7] as [number, number, number],
    target: [0, 1.25, -3.4] as [number, number, number],
    fov: 40,
  },
} as const;
