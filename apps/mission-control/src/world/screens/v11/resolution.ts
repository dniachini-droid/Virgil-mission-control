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
 * **How often a display's canvas is redrawn, by tier — and what it cost to
 * get this wrong.**
 *
 * This is the *invisible* work the brief asks to reduce rather than
 * reducing resolution: six 2D canvases, each 1024 × 600 or larger, each
 * drawn with a dozen gradients and then uploaded as a texture whose whole
 * mip chain is regenerated.
 *
 * The first version of this table ran at 18 fps on the mobile tier and it
 * was measured, not guessed, to be too much: **V11's route rendered at
 * 1.23 frames a second against V10's 1.74 in this container**, a 29 %
 * regression, and the V11 Owner Build's own verify failed on it — its
 * 1,200 ms wait after dismissing a record is fewer than two frames at that
 * rate, so the panel had not closed by the time the check looked. The
 * check was right and the product was wrong; the waits were not touched.
 *
 * The rates below are roughly two thirds of the first version's. The
 * pictures are slow by design — the brief asks Virgil's for *"slow,
 * graceful astronomical motion"* and his orrery turns once in ninety
 * seconds — so 12 fps on a phone is indistinguishable from 18, and nothing
 * about any picture's resolution changes.
 *
 * `SOFTWARE_REDRAW_FPS` is the renderer adaptation
 * `docs/architecture/PERFORMANCE_STRATEGY.md` describes ("software
 * renderers force `constrained`"), applied to this one cost. **It is
 * recorded rather than hidden: in this container the displays redraw four
 * times a second and their textures carry no mip chain, so the container
 * does not exercise the mipmap path at all** — the mipmap and anisotropy
 * settings for real renderers are held by
 * `test/screen-system-v11.test.ts` instead, and no frame taken here is
 * evidence about minification quality on a GPU.
 */
export const REDRAW_FPS: Record<Tier, number> = {
  ultra: 24,
  desktop: 24,
  laptop: 18,
  mobile: 12,
  constrained: 8,
};

/**
 * The redraw rate when the renderer is software, whatever the tier says.
 *
 * **One and a half, and the arithmetic is worth writing down.** The screen's
 * own clock advances by at most 0.1 s a frame (the cap every animated thing
 * in this set shares, so a slow frame cannot skip a beat), so on a renderer
 * running at 1.4 frames a second the clock runs about seven times slower
 * than the wall — and a cap expressed in *clock* seconds therefore throttles
 * to about a seventh of its nominal rate in wall time. At 4 the six displays
 * still redrew every third frame and cost about 456 ms of a 700 ms frame; at
 * 1.5 they redraw about every seventh, which is what brings V11's rate back
 * beside V10's here. Nothing about the product's own rate changes: this
 * value is only ever read when the renderer string says SwiftShader,
 * llvmpipe or software.
 */
export const SOFTWARE_REDRAW_FPS = 1.5;

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
