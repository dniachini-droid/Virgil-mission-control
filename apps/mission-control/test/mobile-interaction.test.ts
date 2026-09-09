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
 * **Stage 3 replaced this contract, on the owner's own instruction, and the
 * three assertions here changed with it.**
 *
 * Stage 1 asserted that the record waits out the camera's flight — built to the
 * V11 brief's stage-1 line, *"tapping triggers a deliberate camera transition
 * before the interface opens."* The owner had already decided the opposite in
 * `docs/process/PHASE_1_CONVERSATION_INTERFACE.md` §5b, and against this
 * session's own recommendation: *"tapping a screen opens the panel straight
 * away and takes you there … So you arent waiting to be taken there first."*
 * His decision governs. So the assertion is inverted rather than deleted, and
 * nothing is left untested: the window must be set in the same event as the
 * camera, and the delay must be gone.
 */
describe('one tap opens the window and moves the camera, concurrently', () => {
  it('sets the window and the focus in the same event', () => {
    expect(room).toContain('export const FLIGHT_SECONDS = 0.9');
    expect(room).toContain('setFocus(to);\n    setWin(target);');
  });

  it('has no delay left between the press and the window', () => {
    expect(room).not.toContain('OPEN_AFTER_MS');
    expect(room).not.toContain('window.setTimeout(() => setWin');
  });

  it('grows the window out of the point the tapped display occupied', () => {
    expect(room).toContain('const projected = projections()[id];');
    expect(room).toContain('setOrigin(');
  });

  it('is one deliberate move even when two handlers answer the same press', () => {
    expect(room).toContain('now - lastSelection.current.at < 700');
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

  it('carries the whole sentence when it is opened, unhedged', () => {
    expect(room).toContain(
      'This is a scripted demonstration. No repository event, check or live session drives',
    );
    expect(room).toContain('the information currently shown.');
  });

  it('never says a demonstration came from a live repository', () => {
    const badge = room.slice(room.indexOf('function DemoBadge'), room.indexOf('function TalkBar'));
    // The two modes make opposite claims and both are stated in the negative:
    // the scripted one drives nothing from the repository, and the replay is
    // past fact. Neither may be read as "this is what your repository is doing".
    expect(badge).toContain('No repository event, check or live session drives');
    expect(badge).toContain('It is past fact, not live state.');
    expect(badge).not.toContain('live repository');
    expect(badge).not.toMatch(/\bcurrent state\b/);
  });
});
