/**
 * The four safe-area insets, in CSS pixels, **measured** rather than assumed.
 *
 * `env(safe-area-inset-*)` is only readable from CSS, and a custom property
 * holding one is not substituted by `getComputedStyle`, so the layout code that
 * has to keep a 44 px target clear of the Dynamic Island cannot simply ask for
 * the number. A probe can: an off-screen element whose padding is set from the
 * four `env()` values reports them back as resolved pixel lengths.
 *
 * On a viewport with no insets — every desktop browser, and headless Chromium,
 * which is the only browser this repository has — all four are zero and the
 * layout is unchanged. That is the honest position: the inset handling here is
 * **written** and is exercised at zero. It is not evidence that it looks right
 * on an iPhone, because no iPhone exists in this environment
 * (`docs/process/V11_BRIEF.md`, caution 3).
 */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

export function readInsets(): Insets {
  if (typeof document === 'undefined') return NO_INSETS;
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:0',
    'height:0',
    'visibility:hidden',
    'pointer-events:none',
    'padding-top:env(safe-area-inset-top, 0px)',
    'padding-right:env(safe-area-inset-right, 0px)',
    'padding-bottom:env(safe-area-inset-bottom, 0px)',
    'padding-left:env(safe-area-inset-left, 0px)',
  ].join(';');
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const insets: Insets = {
    top: Number.parseFloat(style.paddingTop) || 0,
    right: Number.parseFloat(style.paddingRight) || 0,
    bottom: Number.parseFloat(style.paddingBottom) || 0,
    left: Number.parseFloat(style.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}
