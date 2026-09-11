import { room } from '../../room/palette.js';

/**
 * **One shared system for all four in-world displays** (V11 stage 2).
 *
 * The owner's brief: *"Replace the cheap retro-monitor feeling with refined
 * celestial instrumentation. … Do not remove complexity merely because all
 * microtext cannot be read from the overview. Establish hierarchy within
 * that complexity."* And, as a list of what shared means: one typography,
 * one spacing system, one status semantics, one glass and material
 * treatment, one set of transition principles, one information hierarchy.
 *
 * This file is that one system. Every number a screen uses comes from here,
 * so a change to the language is a change in one place and the four screens
 * cannot drift apart. Nothing here knows what any agent does.
 *
 * **The four things it fixes, and why each is a number rather than a taste.**
 *
 *  1. **Type is proportional to the canvas, not absolute.** A console's
 *     canvas is 1024–2048 px wide depending on the tier
 *     (`resolution.ts`), so a 46 px font would be half the size on the
 *     coarse tier and a different design. Every size is a fraction of the
 *     canvas **height** and is resolved through `scale()`.
 *  2. **No hairline is one pixel.** `hair` is at least 2 canvas pixels and
 *     grows with the canvas, so a rule survives being minified onto a 25
 *     CSS-pixel display by mipmapping instead of flickering in and out of
 *     existence. The brief: *"no one-pixel lines that break when scaled"*.
 *  3. **Bloom is controlled by arithmetic, not by taste.** The post chain
 *     blooms anything whose luminance passes `BLOOM_THRESHOLD` (0.86,
 *     `MobileRoom.tsx`'s `Bloom`), and the display material is
 *     `toneMapped={false}`, so the texture's own luminance is what the
 *     bloom pass sees. Every colour below is therefore declared on one
 *     side of that threshold on purpose: **type and every large fill sit
 *     under it and stay sharp; only the small white-hot cores of the
 *     illuminated details sit over it and are allowed to bleed.**
 *     `test/screen-system-v11.test.ts` computes the luminance of every
 *     colour in this file and fails if one crosses to the wrong side.
 *  4. **Status colour is a vocabulary, not a palette.** Exactly one status
 *     colour is dominant on a screen at any moment. The brief forbids
 *     *"several saturated colours competing on every screen at once"*, and
 *     `dominant()` is the only way a screen chooses one.
 */

// ------------------------------------------------------------------ bloom

/**
 * The `luminanceThreshold` of the bloom pass this texture is graded
 * through. Anything above it blooms; anything below it does not.
 */
export const BLOOM_THRESHOLD = 0.86;

/** Rec. 709 relative luminance of an sRGB hex colour, 0..1. */
export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const n = (i: number) => Number.parseInt(h.slice(i, i + 2), 16) / 255;
  return 0.2126 * n(0) + 0.7152 * n(2) + 0.0722 * n(4);
}

// ------------------------------------------------------------------ colour

/**
 * **The glass.** Deep sapphire-black, not flat black: a near-black with a
 * blue cast, three stops of it so the field can be given depth by gradient
 * rather than by a picture pasted on a rectangle.
 */
export const GLASS = {
  /** The deepest part of the well, at the centre-bottom. */
  abyss: '#03050c',
  /** The body of the glass. */
  deep: '#060a17',
  /** Where the glass catches the room, toward the top edge. */
  lift: '#0d1630',
  /** The sapphire the internal reflections are tinted with. */
  sapphire: '#16255c',
} as const;

/**
 * **The structure.** Pearl-white and ivory for the bezel and the fine
 * mechanical joins; gold, restrained, for the edge detailing. These are
 * the world's own surface colours (`room.surface`) so the drawn structure
 * and the modelled structure are the same material.
 */
export const STRUCTURE = {
  pearl: room.surface.ivory,
  ivory: room.surface.castCream,
  ivoryShadow: room.surface.castCreamShadow,
  gold: room.surface.gold,
  goldBright: room.surface.goldBright,
  brass: room.surface.brass,
} as const;

/**
 * **Type.** One ivory, at a luminance measured to sit just under the bloom
 * threshold, so the primary state is bright against the glass and does not
 * bleed into its own counters. 0.850 against 0.86.
 */
export const TEXT = '#cddaf0';
export const TEXT_RGB = '205, 218, 240';
export const dim = (a: number) => `rgba(${TEXT_RGB}, ${a})`;

/**
 * **Status semantics**, the brief's own words: *"cyan active or
 * informational, green passed, amber waiting or owner attention, red
 * genuinely blocked or refused, gold Virgil and ownership, violet
 * archival"*. Every one is below the bloom threshold, so a large area of
 * status colour is a colour and not a light.
 */
export const STATUS = {
  cyan: '#3fd8f2',
  green: '#5fe0a0',
  amber: room.warm.amber,
  red: '#ff5f7a',
  gold: room.surface.goldBright,
  violet: '#a583ff',
} as const;

export type StatusKey = keyof typeof STATUS;

/**
 * The one white-hot core an illuminated detail is allowed. It is over the
 * threshold and is meant to bloom; it is only ever drawn small — the centre
 * of a lit dot, the head of a scanning line, the seal's flash.
 */
export const CORE = '#f2fbff';

/** The agents' own accents, inside the shared vocabulary. */
export const ACCENT: Record<string, { key: string; second: string }> = {
  virgil: { key: STATUS.gold, second: STATUS.cyan },
  fabricator: { key: STATUS.cyan, second: STATUS.amber },
  prover: { key: STATUS.cyan, second: STATUS.green },
  keeper: { key: STATUS.violet, second: GLASS.sapphire },
};

// ------------------------------------------------------------------ metrics

/**
 * The one spacing and type system, as fractions of the canvas height.
 *
 * `u` is the unit: a forty-eighth of the height. Every margin, gap, rule
 * and radius below is a whole number of units, which is what stops four
 * screens drawn by four functions from having four different rhythms.
 */
export interface Metrics {
  w: number;
  h: number;
  /** The spacing unit: h / 48. */
  u: number;
  /** The thinnest line the system draws, never below 2 canvas pixels. */
  hair: number;
  /** A structural rule: the gold hairlines and the frame's inner edge. */
  rule: number;
  /** The outer margin. */
  pad: number;
  /** The corner radius of the drawn outline, in canvas pixels. */
  corner: number;
  /**
   * The honesty band's height: V10's own 118 canvas pixels scaled by the
   * canvas width in the replay, and **zero in the scripted mode**.
   */
  band: number;
  /** The header rail's height. */
  header: number;
  /** The secondary-detail rail's height, above the band. */
  rail: number;
  /**
   * The clear space below the rail. Zero where the band is drawn, because
   * the band **is** the foot; otherwise the outer margin plus a share of
   * the corner radius so the rail clears the curve it now sits in, capped
   * at four and a half units — a console's 78–81 mm corner would otherwise
   * take more of the foot than the margin needs.
   */
  foot: number;
  /** The hero column's width: where the primary state lives. */
  heroWidth: number;
  /** Type sizes. */
  type: {
    hero: number;
    title: number;
    lead: number;
    label: number;
    data: number;
    micro: number;
  };
}

/**
 * **The honesty band, and why V11's scripted mode no longer draws one.**
 *
 * V10 drew a 118-canvas-pixel amber band along the foot of all six
 * displays, reading `ILLUSTRATIVE · NOT REAL STATE`, at every aspect and
 * on every tier. The owner, of the stage-2 frames: *"Can we please remove
 * the 'demo' orange bars from the bottom of each screen? Because I can't
 * see what it looks like without it. And we also need to position things
 * without it. I don't want to remove it and then have to go back to
 * designing. Take it off. I know it's a demo."*
 *
 * So in V11's **scripted** mode there is no band, and the freed area is
 * not left as a gap: `foot` below is the only thing that replaces it, and
 * the well, the hero column and the secondary rail all grow into the rest,
 * which is what the second half of that instruction asks for.
 *
 * **The labelling has not been dropped; it has moved.** V11's chrome
 * carries the persistent `Demo data` badge stage 1 built, which states in
 * full: *"This is a scripted demonstration. No repository event, check or
 * live session drives the information currently shown."* The owner's own
 * V11 brief called for that trade. What it costs, recorded rather than
 * argued: **a screenshot cropped to the world alone, away from the badge,
 * now carries no marking of its own.**
 *
 * **In `replay` the band stays, and that is not an inconsistency.** The
 * replay shows a run that actually happened, and its three lines say
 * `NOT LIVE STATE` — the opposite claim, about content that is real. The
 * flag is therefore driven from the mode and never from taste: every
 * caller passes `showBand = mode === 'replay'`, and
 * `test/screen-system-v11.test.ts` fails if a band appears in the scripted
 * mode or is missing from the replay.
 */
export const BAND_PIXELS_AT_1024 = 118;

export function metrics(w: number, h: number, corner = 0, showBand = false): Metrics {
  const u = h / 48;
  const hair = Math.max(2, Math.round(h / 300));
  const band = showBand ? Math.round((BAND_PIXELS_AT_1024 * w) / 1024) : 0;
  return {
    w,
    h,
    u,
    hair,
    rule: hair * 1.5,
    pad: 2.2 * u,
    corner,
    band,
    header: 5.2 * u,
    rail: 6.4 * u,
    foot: band > 0 ? 0 : Math.min(2.2 * u + 0.3 * corner, 4.5 * u),
    heroWidth: 0.4 * w,
    type: {
      hero: 0.185 * h,
      title: 0.058 * h,
      lead: 0.05 * h,
      label: 0.03 * h,
      data: 0.036 * h,
      micro: 0.026 * h,
    },
  };
}

// ------------------------------------------------------------------ motion

/**
 * **One set of transition principles.**
 *
 * The brief asks for *"subtle screen-state transitions instead of harsh
 * instant replacements"*. Every screen obeys the same three:
 *
 *  1. **Nothing appears; it arrives.** A state change gives the screen an
 *     `arrive` in 0..1 over `ARRIVE_SECONDS`; content fades and settles
 *     over it, and the primary word lands from slightly larger.
 *  2. **One sweep marks the change.** A single fine bright line crosses the
 *     well once, in the first `SWEEP_SECONDS`, and nothing else flashes.
 *  3. **Motion is slow.** The agents' own motifs run on `t`, and their
 *     periods are whole seconds in the 6–30 s range, so the picture is
 *     never busy — Virgil's is the slowest of the four, because his is
 *     astronomical.
 */
export const ARRIVE_SECONDS = 0.62;
export const SWEEP_SECONDS = 0.46;

/**
 * **Reduced motion is honoured by arriving, never by hiding — and stage 4
 * found a frame where it was hiding.**
 *
 * Both display components hold their own clock still under
 * `prefers-reduced-motion`, which is right for the hover and the sweep and
 * wrong for everything measured from it: `since` stayed at 0, so
 * `clamp01(since / ARRIVE_SECONDS)` stayed at 0 and **every hero word on all
 * six displays was never drawn at all.** `NO VERDICT`, `FABRICATOR`,
 * `BUILDING`, the status marks: gone. A reader with reduced motion set saw six
 * screens of rails and no state.
 *
 * It had been in the build since stage 2 and no frame of it had ever been
 * looked at until the twelve review states were captured. It is the same fault
 * as KR-55, where a reduced-motion branch deleted both of Virgil's faces, and
 * the remedy is the project's own established one: show the transition at its
 * **end**, not at its beginning.
 *
 * So a display under reduced motion reports its transitions as long finished.
 * Every one-shot in `screens.ts` is a `clamp01(since / n)` with `n` under two
 * seconds, so any value comfortably past them reads as complete.
 */
export const SETTLED_SINCE = 99;

/** Seconds since the last state change, as the display should draw it. */
export function sinceFor(reducedMotion: boolean, elapsed: number): number {
  return reducedMotion ? SETTLED_SINCE : elapsed;
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const easeOut = (x: number) => 1 - (1 - clamp01(x)) ** 3;
export const easeInOut = (x: number) =>
  clamp01(x) < 0.5 ? 2 * clamp01(x) ** 2 : 1 - (-2 * clamp01(x) + 2) ** 2 / 2;
/** Overshoots a little and settles: what makes a word land with weight. */
export function land(x: number): number {
  const k = clamp01(x);
  return 1 + 0.28 * (1 - easeOut(k)) - 0.28 * Math.sin(Math.PI * easeOut(k)) * 0.0;
}
