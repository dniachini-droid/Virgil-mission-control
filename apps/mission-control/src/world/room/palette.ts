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
 * window aperture and Virgil's chosen height are all answerable to each other.
 *
 * Virgil is **1.65 m**, and that is a decision rather than a measurement. The
 * source model's 2.000 m is Meshy's unit-box normalisation, not an authored
 * scale, so only the model's proportions carry over and the absolute height had
 * to be chosen. 1.65 m puts the dais rim at `daisTop` = 1.05 m across his
 * mid-chest, which is where the approved reference puts it, and sets his eye
 * line just above the orrery so one low camera can hold both. The reference is
 * a wide-angle frame and its dais reads larger than it is relative to him, so
 * this is a considered reading of it, not a derivation from it.
 */
export const layout = {
  virgilHeight: 1.65,
  virgilAt: [0, 0, -4.35] as [number, number, number],

  daisCentre: [0, 0, -2.4] as [number, number, number],
  daisRadius: 1.7,
  daisTop: 1.05,

  orreryCentre: [0, 1.22, -2.4] as [number, number, number],

  wallZ: -7,
  ceilingY: 7.5,
  sideWallX: 9,
  backWallZ: 6.5,
  floorRadius: 16,

  windowCentre: [0, 3.2, -7] as [number, number, number],
  windowRadius: 3.3,

  parapetZ: -6.1,
  parapetHeight: 0.92,

  camera: {
    position: [0, 1.85, 1.45] as [number, number, number],
    target: [0, 1.28, -3.5] as [number, number, number],
    fov: 42,
  },
} as const;
