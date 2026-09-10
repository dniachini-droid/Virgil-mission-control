import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TOUCH_SIZE } from '../src/world/mobile/TouchTargets.js';
import { feedGesture, resetGestures, TAP_MS, TAP_SLOP, wasTap } from '../src/world/room/gesture.js';

/**
 * **The gesture guard, extended to V11's new surface.**
 *
 * The owner, of V9 on real hardware: *"the opening of the windows is way too
 * sensitive. Ie when I'm trying to scroll and move the camera or zoom in, a
 * window opens."* V10 fixed it, and V11 adds thirteen new places a press can
 * land. Every one of them goes through the same `wasTap()`, and this file
 * fails if the V11 hit test ever stops asking.
 *
 * The behaviour itself is driven in a browser by
 * `e2e/verify-owner-build-v11.ts`, at three simulated viewports, because a
 * source-reading test cannot tell whether a real drag opens a real window.
 * These are the wiring; that is the evidence.
 */

const src = (path: string) => readFileSync(resolve(import.meta.dirname, '../src', path), 'utf8');

const room = src('world/mobile/MobileRoom.tsx');
const targets = src('world/mobile/TouchTargets.tsx');

describe('the V11 hit test asks the guard before it acts', () => {
  it('installs the one watcher, from the V11 room', () => {
    expect(room).toContain('useEffect(() => watchGestures(), [])');
    expect(room).toContain('reportCamera([');
  });

  it('refuses to select on a press that was not a tap', () => {
    const up = room.slice(room.indexOf('const onStagePointerUp'));
    const body = up.slice(0, up.indexOf('\n  };'));
    expect(body).toContain('if (!wasTap()) return;');
    // And the refusal comes before anything is selected.
    expect(body.indexOf('if (!wasTap()) return;')).toBeLessThan(body.indexOf('selectAnchor(id)'));
  });

  it('leaves the world’s own raycast handlers guarded, as V10 left them', () => {
    for (const file of [
      'world/screens/ScreenBank.tsx',
      'world/screens/ConsoleScreen.tsx',
      'world/characters/Figure.tsx',
      'world/characters/VirgilRigged.tsx',
    ]) {
      const text = src(file);
      const handlers = text.split('onClick=').length - 1;
      const guards = text.split('if (!wasTap()) return;').length - 1;
      expect(guards, `${file}: ${handlers} handlers, ${guards} guards`).toBe(handlers);
    }
  });

  it('keeps the guard’s own thresholds where V10 set them', () => {
    expect(TAP_SLOP).toBe(6);
    expect(TAP_MS).toBe(400);
  });
});

describe('the guard itself, over the gestures a phone actually makes', () => {
  it('accepts a still, brief, one-finger press with no wheel and no camera move', () => {
    resetGestures();
    feedGesture([
      { type: 'camera', values: [0, 8, 12, 0, 1, -2] },
      { type: 'down', x: 200, y: 500 },
      { type: 'move', x: 202, y: 501 },
      { type: 'camera', values: [0, 8, 12, 0, 1, -2] },
      { type: 'up' },
    ]);
    expect(wasTap()).toBe(true);
  });

  it('refuses the drag the owner was making when a window opened on him', () => {
    resetGestures();
    feedGesture([
      { type: 'camera', values: [0, 8, 12, 0, 1, -2] },
      { type: 'down', x: 200, y: 500 },
      { type: 'move', x: 260, y: 520 },
      { type: 'camera', values: [1.4, 8, 11.6, 0, 1, -2] },
      { type: 'up' },
    ]);
    expect(wasTap()).toBe(false);
  });

  it('refuses a two-finger pinch that begins and ends on the same target', () => {
    resetGestures();
    feedGesture([
      { type: 'down', id: 1, x: 200, y: 500 },
      { type: 'down', id: 2, x: 240, y: 540 },
      { type: 'up', id: 2 },
      { type: 'up', id: 1 },
    ]);
    expect(wasTap()).toBe(false);
  });

  it('refuses a press with a wheel turn inside it', () => {
    resetGestures();
    feedGesture([{ type: 'down', x: 200, y: 500 }, { type: 'wheel' }, { type: 'up' }]);
    expect(wasTap()).toBe(false);
  });
});

describe('the targets themselves', () => {
  it('are larger than the 44 px the brief and Apple both name', () => {
    expect(TOUCH_SIZE).toBeGreaterThanOrEqual(44);
  });

  it('never take a pointer event, so navigation is never blocked by one', () => {
    // The whole reason the hit test is done by hand rather than with buttons:
    // OrbitControls listens on the canvas, a sibling of any overlay, so an
    // overlay that swallowed the press would put a dead zone over every
    // character.
    expect(src('world/mobile/mobile.css')).toContain('.v11-touch {');
    const rule = src('world/mobile/mobile.css');
    const block = rule.slice(rule.indexOf('.v11-touch {'));
    expect(block.slice(0, block.indexOf('}'))).toContain('pointer-events: none');
  });

  it('give press feedback, and clear it on cancel', () => {
    expect(targets).toContain('is-pressed');
    expect(room).toContain('onPointerCancel={() => setPressed(null)}');
  });
});

/**
 * **The owner has reversed this contract twice, and the assertions have moved
 * with him both times rather than being deleted.**
 *
 * Stage 1 asserted that the record waits out the camera's flight — built to the
 * V11 brief's stage-1 line, *"tapping triggers a deliberate camera transition
 * before the interface opens."* Stage 3 inverted it on his decision of 8
 * September (§5b), taken from a description: one tap doing both concurrently,
 * *"So you arent waiting to be taken there first."*
 *
 * He has now used it, and on 10 September decided against his own decision:
 * *"When you click each agent, the window opens straight away… What should
 * happen when you click them is first zoom in to their close up view. And THEN
 * when you click their screen, that's when it should open the window. It's
 * better that way."* (`docs/process/OWNER_DECISIONS_2026-09-10.md` item 9;
 * §5c of the interface record supersedes §5b and neither is deleted.)
 *
 * So: the wiring is asserted here, the rule itself in
 * `test/mobile-composition.test.ts` (`stepFor`), and the behaviour is driven in
 * a browser by `e2e/verify-owner-build-v11.ts`. **Nothing is left untested by
 * the reversal**, and one thing is asserted harder than before — there is still
 * no timer anywhere between a press and a window.
 */
describe('tapping a station is two steps, and the second opens the window', () => {
  it('applies the rule from one place, and only there', () => {
    expect(room).toContain('export const FLIGHT_SECONDS = 0.9');
    expect(room).toContain('const step = stepFor(anchor, focus);');
    expect(room).toContain('setFocus(step.focus);');
    // The first step closes nothing over the world and opens nothing.
    expect(room).toContain(
      'if (step.window === null) {\n      setWin(null);\n      return;\n    }',
    );
  });

  it('has no delay left between the press that opens and the window', () => {
    expect(room).not.toContain('OPEN_AFTER_MS');
    expect(room).not.toContain('window.setTimeout(() => setWin');
  });

  it('grows the window out of the point the tapped display occupied', () => {
    expect(room).toContain('const projected = projections()[id];');
    expect(room).toContain('setOrigin(');
  });

  it('is one step even when two handlers answer the same press', () => {
    // With two steps this guard stops a press being counted twice, which would
    // travel and open at once — the behaviour the owner asked to be rid of.
    expect(room).toContain('now - lastSelection.current.at < 700');
    const select = room.slice(room.indexOf('const selectAnchor = ('));
    const body = select.slice(0, select.indexOf('\n  };'));
    expect(body.indexOf('lastSelection.current.at < 700')).toBeLessThan(
      body.indexOf('const step = stepFor'),
    );
  });

  it('keeps the one labelled control that opens in a single press, and stops it moving the camera', () => {
    expect(room).toContain("onTalk={() => openWindow('virgil', { agent: 'virgil' })}");
    const open = room.slice(room.indexOf('const openWindow = ('));
    const body = open.slice(0, open.indexOf('\n  };'));
    expect(body).toContain('setWin(target);');
    expect(body).not.toContain('setFocus(');
  });

  it('names the second step on screen, since a phone has no hover to do it', () => {
    expect(room).toContain('function StepHint(');
    expect(room).toContain('<StepHint shown={showBack} />');
    expect(room).toContain('Tap again to open');
    // It carries no action, so it must not be a touch target.
    const hint = room.slice(room.indexOf('function StepHint('));
    expect(hint.slice(0, hint.indexOf('\n}'))).not.toContain('data-touch-target');
  });
});

describe('the development chrome is out of the ordinary experience', () => {
  it('puts every V10 control behind the hidden menu', () => {
    const panel = room.slice(room.indexOf('function DevPanel'));
    for (const control of [
      'Scripted',
      'Replay',
      'Tabletop',
      'Room (retired)',
      'Look at',
      'Keys:',
      'built from commit',
      'Performance on this machine is not a measurement',
    ]) {
      expect(panel, control).toContain(control);
    }
  });

  it('renders the menu only when it has been opened', () => {
    expect(room).toContain('{dev ? (');
    expect(room).toContain('const [dev, setDev] = useState(false);');
  });

  it('leaves one discreet version marker in the open, and says whose judgment that is', () => {
    expect(room).toContain('className="v11-marker"');
    expect(room).toContain("the coordinator's judgment, not the owner's instruction");
  });
});

describe('the demonstration badge', () => {
  it('is persistent and names itself in two words', () => {
    expect(room).toContain('Demo data');
    expect(room).toContain('Recorded run');
  });

  /**
   * **Asserted as a property, not as a fixed string.** It quoted the sentence
   * verbatim until the plain-language pass, and a quoted sentence is a test
   * that fails whenever the wording improves rather than whenever the meaning
   * goes wrong. What the badge has to do is say three things — that it is a
   * demonstration, that nothing real drove it, and that nothing is connected —
   * and it may say them in whatever English says them best.
   */
  it('carries the whole thing when it is opened, unhedged', () => {
    const badge = room.slice(room.indexOf('function DemoBadge'), room.indexOf('function TalkBar'));
    const scripted = badge.slice(badge.indexOf('This is a demonstration'));
    expect(scripted).toContain('This is a demonstration.');
    expect(scripted).toMatch(/comes from a real project/);
    expect(scripted).toMatch(/no check has been run/);
    expect(scripted).toMatch(/nothing is connected/);
  });

  it('never says a demonstration came from a live repository', () => {
    const badge = room.slice(room.indexOf('function DemoBadge'), room.indexOf('function TalkBar'));
    // The two modes make opposite claims and both are stated in the negative:
    // the scripted one comes from no real project, and the replay already
    // happened. Neither may be read as "this is what your project is doing".
    expect(badge).toMatch(/Nothing you see here comes from a real project/);
    expect(badge).toMatch(/It already happened; none of it is\s+live\./);
    expect(badge).not.toContain('live repository');
    expect(badge).not.toMatch(/\bcurrent state\b/);
  });
});
