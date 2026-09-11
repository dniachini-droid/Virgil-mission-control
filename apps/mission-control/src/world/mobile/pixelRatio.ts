import type { Tier } from '../../ui/settings.js';
import { autoPixelRatio, MIN_PIXEL_RATIO, type Viewport } from './performance.js';

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

export type Sharpness = 'auto' | 'low' | 'standard' | 'native';

export const SHARPNESS: readonly { id: Sharpness; label: string; note: string }[] = [
  {
    id: 'auto',
    label: 'Auto',
    note: 'Automatic chooses the clearest picture the device can display smoothly.',
  },
  {
    id: 'low',
    label: 'Low',
    note: 'Older versions used a less detailed picture on phones and enlarged it to fit.',
  },
  {
    id: 'standard',
    label: 'Standard',
    note: '2× resolution on phones and computers.',
  },
  {
    id: 'native',
    label: 'Native',
    note: 'Uses the full detail available on the device, up to 3×. It looks sharpest but requires the most power.',
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
  viewport?: Viewport,
  pixelScale = 1,
): [number, number] {
  const ceiling = ceilingFor(tier, sharpness, devicePixelRatio, viewport);
  return [MIN_PIXEL_RATIO, Math.max(MIN_PIXEL_RATIO, Math.round(ceiling * pixelScale * 100) / 100)];
}

/**
 * The ceiling before the reduced-performance mode has had its say.
 *
 * **`auto` is the default and it is a decision, not the old assumption.**
 * Stage 3 shipped a flat 2× on every phone; `performance.ts`'s `autoPixelRatio`
 * bounds that by the tier's own pixel budget as well, so a 390-point iPhone and
 * a 1024-point tablet no longer get the same answer to a question whose cost
 * differs by a factor of seven between them. The three explicit settings are
 * left exactly as stage 3 left them, because an override that quietly refuses
 * to do what it says is worse than no override at all.
 */
export function ceilingFor(
  tier: Tier,
  sharpness: Sharpness,
  devicePixelRatio = typeof window === 'undefined' ? 1 : window.devicePixelRatio,
  viewport?: Viewport,
): number {
  if (sharpness === 'native') return Math.max(1, Math.min(NATIVE_CAP, devicePixelRatio || 1));
  if (sharpness === 'low') return LOW_CEILING[tier];
  if (sharpness === 'standard') return STANDARD_CEILING[tier];
  const seen: Viewport = viewport ?? {
    cssWidth: typeof window === 'undefined' ? 1280 : window.innerWidth,
    cssHeight: typeof window === 'undefined' ? 800 : window.innerHeight,
    devicePixelRatio: devicePixelRatio || 1,
  };
  return autoPixelRatio(tier, seen, STANDARD_CEILING[tier]);
}

/**
 * How many device pixels a display of `cssPx` occupies at this ratio, and how
 * many texture pixels are available for them. The ratio of the two is what
 * decides whether a texture is the limit; above 1 the texture is not.
 */
export function textureHeadroom(cssPx: number, textureWidth: number, ratio: number): number {
  return textureWidth / (cssPx * ratio);
}
