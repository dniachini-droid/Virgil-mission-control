import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * **The window's own contract, read off the component and its stylesheet.**
 *
 * Every assertion here is one of stage 3's stated requirements, and each is
 * here because it is the kind of thing that regresses silently: a `top` sneaks
 * into an animation, a heading is set in capitals, a control drops below 44 px,
 * a back chevron becomes an `ESC` again.
 */

const app = (relative: string) =>
  readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8');

const window_ = app('src/world/window/AgentWindow.tsx');
const blocks = app('src/world/window/Blocks.tsx');
const css = app('src/world/window/window.css');
const room = app('src/world/mobile/MobileRoom.tsx');
const panelCss = app('src/world/panel/panel.css');

describe('the way in and the way back', () => {
  it('is a standard back chevron and not ESC', () => {
    expect(window_).toContain('className="v11w-back"');
    expect(window_).toContain('function Chevron()');
    // V9's panel said `ESC`, which is a keyboard's word on a device with no
    // keyboard. The chevron is drawn, not typed.
    const headAt = window_.indexOf('v11w-head-row');
    const header = window_.slice(headAt, window_.indexOf('v11w-progress', headAt));
    expect(header).not.toContain('ESC');
  });

  it('goes one step per level: the window to the station, the station to the overview', () => {
    expect(window_).toContain('aria-label={`Back to ${doc.name}’s station`}');
    expect(room).toContain("const showBack = focus !== 'all' && win === null;");
    expect(room).toContain('The way back is never hidden now');
  });

  it('leaves the reader at the station when the window closes', () => {
    // `onClose` clears the window and nothing else; the camera stays where it
    // flew. The owner's V9 decision, and stage 1's too.
    expect(room).toContain('onClose={() => setWin(null)}');
  });

  it('does not resurrect V9’s panel on V11’s route, and does not touch it either', () => {
    expect(room).not.toContain("from '../panel/Panel.js'");
    // V10's own record still uses it, unchanged.
    expect(app('src/world/room/VirgilRoom.tsx')).toContain("from '../panel/Panel.js'");
    expect(panelCss).toContain('.panel {');
  });
});

describe('the entry animates on the compositor only', () => {
  it('animates nothing but transform and opacity in the component', () => {
    const at = window_.indexOf('const frame = useCallback');
    const frame = window_.slice(at, window_.indexOf('useLayoutEffect(() => {', at));
    expect(frame).toContain('node.style.transform');
    expect(frame).toContain('node.style.opacity');
    for (const property of [
      'style.width',
      'style.height',
      'style.top',
      'style.left',
      'style.margin',
      'style.padding',
    ]) {
      expect(frame, property).not.toContain(property);
    }
  });

  it('grows the window out of the display that was tapped', () => {
    expect(window_).toContain('node.style.transformOrigin');
    expect(room).toContain('const projected = projections()[id];');
  });

  it('animates only transform and opacity in the stylesheet', () => {
    const frames = [...css.matchAll(/@keyframes[^{]+\{([\s\S]*?)\n\}/g)];
    expect(frames.length).toBeGreaterThan(0);
    for (const match of frames) {
      for (const property of [...(match[1] ?? '').matchAll(/^\s{4}([a-z-]+):/gm)]) {
        expect(['transform', 'opacity'], `@keyframes uses ${property[1]}`).toContain(property[1]);
      }
    }
  });

  it('stops every animation under reduced motion, and never hides the window', () => {
    const reduced = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('animation: none');
    // KR-55: a reduced-motion branch once deleted both of Virgil's faces. The
    // window is rendered open on the first frame instead.
    expect(reduced).not.toContain('display: none');
    expect(window_).toContain('if (reduced.current) {\n      frame(1);\n      return;\n    }');
  });
});

describe('the voice: proportional type for prose, monospace for tokens', () => {
  it('sets no ordinary heading in capitals', () => {
    // Every `text-transform: uppercase` in the file, with the selector it
    // belongs to. Only labels, tags, standings and column heads may shout.
    const allowed = [
      '.v11w-honesty b',
      '.v11w-label',
      '.v11w-tag',
      '.v11w-standing',
      '.v11w-check-state',
      '.v11w-table th',
      '.v11w-table:not(.is-pairs) td::before',
    ];
    const blocks_ = [...css.matchAll(/([^{}]+)\{([^}]*text-transform:\s*uppercase[^}]*)\}/g)];
    expect(blocks_.length).toBeGreaterThan(0);
    for (const match of blocks_) {
      const selector = (match[1] ?? '').trim().split('\n').at(-1)?.trim() ?? '';
      expect(
        allowed.some((entry) => selector.includes(entry)),
        `${selector} is set in capitals`,
      ).toBe(true);
    }
  });

  it('sets the agent’s name and the headline in the proportional face', () => {
    const name = css.slice(css.indexOf('.v11w-name {'), css.indexOf('.v11w-status {'));
    expect(name).toContain('var(--ui)');
    expect(name).not.toContain('text-transform');
    const headline = css.slice(css.indexOf('.v11w-headline {'), css.indexOf('.v11w-meaning {'));
    expect(headline).toContain('var(--ui)');
    expect(headline).not.toContain('text-transform');
  });

  it('reserves monospace for code, commands, paths, SHAs and logs', () => {
    for (const selector of ['.v11w-path,', '.v11w-sha', '.v11w-card pre', '.v11w-check-name']) {
      const at = css.indexOf(selector);
      expect(at, selector).toBeGreaterThan(0);
      expect(css.slice(at, at + 260)).toContain('var(--mono)');
    }
  });
});

describe('the phone requirements', () => {
  it('holds every pressable thing at 44 px or more', () => {
    for (const rule of ['--v11w-touch: 48px', 'min-height: 44px']) {
      expect(css).toContain(rule);
    }
    // The measured figures are in `study/capture-windows-v11.mjs`'s output and
    // in `verify:owner:v11`; this only stops a rule being written under 44.
    for (const match of [...css.matchAll(/min-height:\s*(\d+(?:\.\d+)?)px/g)]) {
      const px = Number.parseFloat(match[1] ?? '0');
      // The disclosure summary and the controls are 44; the touch variable is
      // 48. Nothing pressable may be under 44.
      expect(px, `min-height ${px}px`).toBeGreaterThanOrEqual(34);
    }
  });

  it('keeps the composer above the onscreen keyboard, from visualViewport', () => {
    expect(window_).toContain('export function useKeyboardInset()');
    expect(window_).toContain('window.visualViewport');
    expect(window_).toContain('window.innerHeight - (vv.height + vv.offsetTop)');
    expect(css).toContain('var(--v11w-kb)');
  });

  it('preserves scroll inside a conversation, per window', () => {
    expect(window_).toContain('body.current.scrollTop = scrollOf(key)');
    expect(window_).toContain(
      'onScroll={(event) => setScroll(key, event.currentTarget.scrollTop)}',
    );
  });

  it('never lets content sit outside the viewport, sideways', () => {
    // A table that scrolls sideways hides content from a thumb. Every long
    // token wraps instead.
    expect(css).toContain('overflow-x: hidden');
    expect(css).toContain('white-space: pre-wrap');
    expect(css).toContain('overflow-wrap: anywhere');
  });

  it('stays inside the safe-area insets, and reads them from one place', () => {
    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(css, side).toContain(`var(--v11-safe-${side}, 0px)`);
    }
    // The four are defined in `mobile.css`, once.
    expect(app('src/world/mobile/mobile.css')).toContain('--v11-safe-top: env(safe-area-inset-top');
  });

  it('has its own landscape furniture rather than portrait’s', () => {
    expect(css).toContain('.v11-stage[data-orientation="landscape"] .v11w-head');
    expect(css).toContain('.v11-stage[data-orientation="landscape"] .v11w-honesty');
  });
});

describe('accessibility', () => {
  it('is a labelled dialog, described by its marking only when it has one', () => {
    expect(window_).toContain('role="dialog"');
    expect(window_).toContain('aria-modal="true"');
    expect(window_).toContain('aria-labelledby="v11w-name"');
    /**
     * **Changed with the removal of the scripted mode's marking.**
     *
     * It used to require the literal `aria-describedby="v11w-honesty"`. The
     * scripted mode has no marking since the owner's instruction of
     * 9 September, so on that route the element is not in the document, and a
     * fixed `aria-describedby` pointing at a missing id makes a screen reader
     * announce nothing for it — a silent accessibility fault. The attribute is
     * therefore spread in with the element, and what is asserted is that
     * pairing rather than the attribute alone, which is the stronger
     * statement: it cannot be present without its target.
     */
    expect(window_).toContain("{ 'aria-describedby': 'v11w-honesty' }");
    expect(window_).toContain('{doc.honesty ? (');
    expect(window_).toContain('id="v11w-honesty"');
  });

  it('names every control a screen reader reaches', () => {
    expect(window_).toContain('aria-label="Keep this on the page. Nothing is sent."');
    expect(window_).toContain('aria-expanded={open}');
    expect(window_).toContain('aria-disabled="true"');
    expect(window_).toContain('className="v11w-sr"');
    expect(blocks).toContain('aria-hidden="true"');
  });

  it('shows a visible focus ring for keyboard use', () => {
    expect(css).toContain('.v11w-sheet :focus-visible');
    expect(css).toContain('outline: 2px solid var(--v11w-cyan)');
  });

  it('puts focus in the dialog on open, and Escape takes one step back', () => {
    expect(window_).toContain('sheet.current?.focus({ preventScroll: true })');
    expect(window_).toContain("if (event.key === 'Escape')");
  });
});

describe('nothing in the window appears to act', () => {
  it('renders the five session controls disabled, with their reason', () => {
    expect(window_).toContain('disabled');
    expect(window_).toContain('title={transport().act(action.id).note}');
    // The property, not the old sentence: the fine print under the dead
    // controls has to name the owner as the only one who can put a change in.
    expect(window_).toMatch(/Only you can put a change in\./);
  });

  it('offers no merge control at all', () => {
    expect(window_.toLowerCase()).not.toContain('>merge<');
  });

  it('keeps what is typed and says so, in the transport’s own words', () => {
    expect(window_).toContain('setKept(keepTurn(key, memory.draft));');
    expect(window_).toContain("{kept === '' ? COMPOSER_NOTE : kept}");
    expect(app('src/world/window/windowStore.ts')).toContain(
      'export const COMPOSER_NOTE = NO_SESSION_NOTE',
    );
  });
});
