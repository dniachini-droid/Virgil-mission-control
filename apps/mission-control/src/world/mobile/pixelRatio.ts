import type { Tier } from '../../ui/settings.js';

/**
 * **How many device pixels the world is drawn at, and why stage 3 raised it.**
 *
 * The owner, from his own iPhone: *"the text isn't as crisp as I would like…
 * I'm just wondering if you can get a bit crisper. If we can't, it's no
 * problems."*
 *
 * **The cause was found by arithmetic, not by taste, and it is the canvas and
 * not the textures.** V10's room and V11's stage both wrote
 * `dpr={coarse ? [1, 1.25] : [1, 1.75]}`, and `coarse` is true for the
 * `mobile` and `constrained` tiers — every phone. An iPhone reports
 * `devicePixelRatio` 3, so the world was rasterised at **1.25× and then
 * upscaled to 3× by the display**: 42 % of the device's own resolution, on
 * every edge in the picture. Text has the finest edges in the scene, so text
 * looks softest, which is exactly the symptom.
 *
 * The textures are **not** the limit, and this is the check that says so: a
 * slab's display measures 160.5 CSS px wide at 390 × 844, which is 482 device
 * pixels at DPR 3, and it is drawn from a 1024 px texture on the mobile tier —
 * 2.1× more texture than there are device pixels to put it in
 * (`screens/v11/resolution.ts`). Raising texture resolution could not have
 * fixed this and would have cost memory for nothing.
 *
 * **What it costs is fragment work, and that cost has not been measured on a
 * phone.** Going from 1.25 to 2.0 is 2.56× the pixels; going to 3.0 is 5.76×.
 * This container renders in software at about 1.5 frames a second with its mip
 * chain off, so it can judge neither the sharpness nor the cost honestly, and
 * no figure taken here is evidence about either. Two things reduce the risk on
 * the tiers that matter: the phone tiers already skip the whole post-processing
 * chain (`MobileRoom`'s `coarse` branch), and the six displays redraw at 12 fps
 * by design.
 *
 * So the default rises to **2.0** on a phone — most of the loss recovered at a
 * cost that is bounded and reversible — and the hidden development menu offers
 * `Native` and `Low` beside it, so the owner can answer on his own device the
 * question this container cannot: whether native resolution is worth its frame
 * rate. That is a diagnostic control, not a product feature, and it lives with
 * the rest of the development chrome.
 */

export type Sharpness = 'low' | 'standard' | 'native';

export const SHARPNESS: readonly { id: Sharpness; label: string; note: string }[] = [
  {
    id: 'low',
    label: 'Low',
    note: 'What V10 and V11 stages 1 and 2 drew at: 1.25× on a phone, upscaled to the panel.',
  },
  {
    id: 'standard',
    label: 'Standard',
    note: 'Stage 3’s default: 2× on a phone, 2× on a desktop.',
  },
  {
    id: 'native',
    label: 'Native',
    note: 'The device’s own pixel ratio, capped at 3. Sharpest, and the most fragment work.',
  },
];

/** The ceiling per tier, at the standard setting. */
export const STANDARD_CEILING: Record<Tier, number> = {
  ultra: 2,
  desktop: 2,
  laptop: 1.75,
  mobile: 2,
  constrained: 1.25,
};

/** And at `low`, which is what every earlier version drew at. */
export const LOW_CEILING: Record<Tier, number> = {
  ultra: 1.75,
  desktop: 1.75,
  laptop: 1.25,
  mobile: 1.25,
  constrained: 1,
};

/** No setting may ask for more than this, whatever the device claims. */
export const NATIVE_CAP = 3;

/**
 * The `[min, max]` pixel ratio for a tier and a setting. `min` stays at 1 so a
 * device that cannot hold the ceiling still draws at least one device pixel per
 * CSS pixel — never less, which was `constrained`'s old 0.75 and is a blur
 * nobody asked for.
 */
export function dprFor(
  tier: Tier,
  sharpness: Sharpness,
  devicePixelRatio = typeof window === 'undefined' ? 1 : window.devicePixelRatio,
): [number, number] {
  if (sharpness === 'native') {
    return [1, Math.max(1, Math.min(NATIVE_CAP, devicePixelRatio || 1))];
  }
  const ceiling = sharpness === 'low' ? LOW_CEILING[tier] : STANDARD_CEILING[tier];
  return [1, ceiling];
}

/**
 * How many device pixels a display of `cssPx` occupies at this ratio, and how
 * many texture pixels are available for them. The ratio of the two is what
 * decides whether a texture is the limit; above 1 the texture is not.
 */
export function textureHeadroom(cssPx: number, textureWidth: number, ratio: number): number {
  return textureWidth / (cssPx * ratio);
}
