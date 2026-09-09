import { layout } from '../../room/palette.js';

/**
 * **Where V11 hangs Virgil's three slabs, and why it is not
 * `layout.screenBank`.**
 *
 * The owner, on the stage-2 overview frame: *"we need to bring all of the
 * three screens above virgil… not increase their height. Just move them up
 * a bit higher just so that they're not… blocking the consoles behind."*
 * In that frame the three slabs sat across the three role consoles and hid
 * most of them.
 *
 * `layout.screenBank` is **shared with V10**, which must keep rendering
 * exactly as it does at `#/v10` (`docs/process/V11_BRIEF.md`, "The
 * preservation contract"), so the lift lives here and is read by the two
 * V11-only places that need it: `ScreenBankV11.tsx`, which hangs the
 * slabs, and `mobile/composition.ts`, which solves the portrait frame
 * against their corners and puts a touch target on each. Those two must
 * never disagree, which is the whole reason this is one function and not
 * two numbers.
 *
 * **Only the position changes.** Not the scale, not the type size, not the
 * layout: the slab is still 1.540 × 1.040 m overall with a 1.476 × 0.976 m
 * opening, exactly as `ScreenBankV11.tsx` rebuilt it.
 */
export const V11_BANK_LIFT = 1.15;

export function v11Bank(): { y: number; z: number; spread: number; splay: number } {
  const { y, z, spread, splay } = layout.screenBank;
  return { y: y + V11_BANK_LIFT, z, spread, splay };
}
