import type { Tier } from '../../../ui/settings.js';

/**
 * **How large a display's texture is, by device tier — and what it costs.**
 *
 * The brief: *"Render each important display's texture at 1024–2048 px,
 * scaled by device tier; mipmaps and anisotropic filtering."* And, as the
 * constraint on it: *"State the texture memory added and check it against
 * the tiers"* (`docs/architecture/PERFORMANCE_STRATEGY.md`).
 *
 * The width below is the **canvas width**; the height follows the display's
 * own aspect, which is measured from the model's opening
 * (`screenPlane.ts`) or authored (`ScreenBank.tsx`). So the number of
 * texels is `width² / aspect`, and with mipmaps the total is 4/3 of that.
 * At four bytes a texel:
 *
 * | Tier | Width | One console (aspect 1.7) | Six displays, with mipmaps |
 * |---|---|---|---|
 * | ultra | 2048 | 2048 × 1205 = 2.47 Mtexel | ≈ 79 MB |
 * | desktop | 2048 | as above | ≈ 79 MB |
 * | laptop | 1536 | 1536 × 904 = 1.39 Mtexel | ≈ 44 MB |
 * | mobile | 1024 | 1024 × 602 = 0.62 Mtexel | ≈ 20 MB |
 * | constrained | 1024 | as above | ≈ 20 MB |
 *
 * The exact figures for the six displays this set actually has are
 * computed rather than quoted, by `test/screen-geometry-v11.test.ts`,
 * which fails if any tier's total crosses that tier's texture budget in
 * `PERFORMANCE_STRATEGY.md` (512, 256, 192, 128 and 64 MB). **`mobile` is
 * the tier a phone gets** (`detectTier` returns it for any viewport whose
 * short side is under 700 px), so a phone gets 1024 — the brief's floor —
 * and never the 2048 that would put six displays at 79 MB against a
 * 128 MB budget it also has to fit the models into.
 *
 * **The floor is deliberate.** The brief also says *"preserve performance
 * by reducing invisible work rather than by making visible screens
 * blurry"*, so no tier goes below 1024, and what the coarse tiers give up
 * instead is redraw rate (`REDRAW_FPS`) and the sub-pixel imperfections,
 * not resolution.
 */
export const TEXTURE_WIDTH: Record<Tier, number> = {
  ultra: 2048,
  desktop: 2048,
  laptop: 1536,
  mobile: 1024,
  constrained: 1024,
};

/**
 * How often a display's canvas is redrawn, by tier. This is the *invisible*
 * work the brief asks to reduce: a console screen at 24 fps and a slab at
 * 24 fps on a phone is six 2D canvases a frame, and the pictures are slow
 * enough that 15 is indistinguishable from 24 on the astronomical motion
 * the brief asked for. Nothing about the picture's resolution changes.
 */
export const REDRAW_FPS: Record<Tier, number> = {
  ultra: 30,
  desktop: 30,
  laptop: 24,
  mobile: 18,
  constrained: 12,
};

/** The anisotropy a display asks for, capped by the renderer's own maximum. */
export const ANISOTROPY: Record<Tier, number> = {
  ultra: 16,
  desktop: 8,
  laptop: 8,
  mobile: 4,
  constrained: 2,
};

/** The texture memory of one display, in bytes, mipmaps included. */
export function textureBytes(width: number, aspect: number): number {
  const height = Math.max(64, Math.round(width / aspect));
  return width * height * 4 * (4 / 3);
}
