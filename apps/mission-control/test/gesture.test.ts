import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CAMERA_SLOP,
  feedGesture,
  lastPress,
  resetGestures,
  TAP_MS,
  TAP_SLOP,
  wasTap,
} from '../src/world/room/gesture.js';

/**
 * **A tap, told apart from a drag, a pinch and a wheel** (V10, defect A).
 *
 * The owner, on real hardware: *"the opening of the windows is way too
 * sensitive. Ie when I'm trying to scroll and move the camera or zoom in,
 * a window opens."*
 *
 * There was no threshold to raise. React Three Fiber fires `onClick` on
 * the pointer-up whose press began on the same object, whatever happened
 * in between, so an orbit that started and ended on a screen opened that
 * screen. The durable part of the repair is here rather than in the
 * number: these hold the *rule*, and every handler in the world that can
 * open a document or move the camera is held to asking it.
 */

const src = (relative: string) =>
  readFileSync(fileURLToPath(new URL(`../src/${relative}`, import.meta.url)), 'utf8');

describe('a press is a tap only when it was one', () => {
  beforeEach(() => resetGestures());

  it('accepts a still, brief press', () => {
    feedGesture([
      { type: 'down', x: 400, y: 300 },
      { type: 'move', x: 401, y: 301 },
      { type: 'up' },
    ]);
    expect(wasTap()).toBe(true);
  });

  it('refuses a drag across a screen, which is how the camera is orbited', () => {
    feedGesture([{ type: 'down', x: 400, y: 300 }]);
    for (let x = 400; x <= 520; x += 8) feedGesture([{ type: 'move', x, y: 306 }]);
    feedGesture([{ type: 'up' }]);
    expect(lastPress().moved).toBeGreaterThan(TAP_SLOP);
    expect(wasTap()).toBe(false);
  });

  it('refuses a drag that returns to where it started', () => {
    // The case a distance-at-release test would let through: out and back.
    feedGesture([
      { type: 'down', x: 400, y: 300 },
      { type: 'move', x: 470, y: 300 },
      { type: 'move', x: 400, y: 300 },
      { type: 'up' },
    ]);
    expect(wasTap()).toBe(false);
  });

  it('refuses a pinch, however still each finger is', () => {
    feedGesture([
      { type: 'down', id: 1, x: 300, y: 300 },
      { type: 'down', id: 2, x: 500, y: 300 },
      { type: 'up', id: 2 },
      { type: 'up', id: 1 },
    ]);
    expect(wasTap()).toBe(false);
  });

  it('refuses a press with a wheel turn inside it', () => {
    feedGesture([{ type: 'down', x: 400, y: 300 }, { type: 'wheel' }, { type: 'up' }]);
    expect(wasTap()).toBe(false);
  });

  it('refuses a press during which the camera moved', () => {
    feedGesture([
      { type: 'camera', values: [0, 1.6, 3, 0, 1, 0] },
      { type: 'down', x: 400, y: 300 },
      { type: 'camera', values: [0, 1.6, 3 + CAMERA_SLOP * 4, 0, 1, 0] },
      { type: 'up' },
    ]);
    expect(wasTap()).toBe(false);
  });

  it('ignores the camera easing on after the finger lifted', () => {
    // Damping runs for about a second after a fling. A press made during
    // that tail is a press, and refusing it would lose real taps.
    feedGesture([
      { type: 'camera', values: [0, 1.6, 3, 0, 1, 0] },
      { type: 'down', x: 400, y: 300 },
      { type: 'up' },
      { type: 'camera', values: [0, 1.6, 3.4, 0, 1, 0] },
    ]);
    expect(wasTap()).toBe(true);
  });

  it('allows the camera to drift by less than the slop, which damping does', () => {
    feedGesture([
      { type: 'camera', values: [0, 1.6, 3, 0, 1, 0] },
      { type: 'down', x: 400, y: 300 },
      { type: 'camera', values: [0, 1.6, 3 + CAMERA_SLOP / 4, 0, 1, 0] },
      { type: 'up' },
    ]);
    expect(wasTap()).toBe(true);
  });

  it('refuses a long press, which is a hold and not a tap', () => {
    feedGesture([{ type: 'down', x: 400, y: 300 }]);
    const press = lastPress() as { at: number };
    // Reach back through time rather than wait: the rule is the assertion.
    (press as { at: number }).at = performance.now() - (TAP_MS + 50);
    feedGesture([{ type: 'up' }]);
    expect(wasTap()).toBe(false);
  });

  it('refuses anything at all before the first press of the page', () => {
    expect(wasTap()).toBe(false);
  });

  it('keeps the record until the next press begins, not until the release', () => {
    // React Three Fiber dispatches its click during the pointer-up, and
    // the order of window listeners against it is not ours to fix.
    feedGesture([{ type: 'down', x: 10, y: 10 }, { type: 'up' }]);
    expect(wasTap()).toBe(true);
    feedGesture([{ type: 'down', x: 10, y: 10 }]);
    for (let x = 10; x <= 90; x += 8) feedGesture([{ type: 'move', x, y: 10 }]);
    expect(wasTap()).toBe(false);
  });
});

describe('every handler in the world that a gesture reaches asks first', () => {
  /** Every file that carries an `onClick` on something in the scene. */
  const SCENE_HANDLERS = [
    'world/screens/ScreenBank.tsx',
    'world/screens/ConsoleScreen.tsx',
    'world/characters/Figure.tsx',
    'world/characters/VirgilRigged.tsx',
  ];

  it('guards each one, and none is left open', () => {
    for (const file of SCENE_HANDLERS) {
      const text = src(file);
      const handlers = text.split('onClick=').length - 1;
      expect(handlers, `${file} has no scene handler any more`).toBeGreaterThan(0);
      const guards = text.split('if (!wasTap()) return;').length - 1;
      expect(guards, `${file} has ${handlers} handlers and ${guards} guards`).toBe(handlers);
    }
  });

  it('installs the watcher once, from the room', () => {
    const room = src('world/room/VirgilRoom.tsx');
    expect(room).toContain('useEffect(() => watchGestures(), [])');
    // And publishes the camera each frame, after damping.
    expect(room).toContain('reportCamera([');
  });

  it('keeps the overlays out of the world’s raycaster', () => {
    // `<Canvas>` connects its pointer events to the canvas's parent, which
    // holds the panel and the controls, so a press on either was raycast
    // into the scene: it re-framed the camera, and over a screen it opened
    // a document (V10, defect B).
    for (const [file, node] of [
      ['world/panel/Panel.tsx', 'panel-root'],
      ['world/room/VirgilRoom.tsx', 'room-controls'],
    ] as const) {
      const text = src(file);
      const at = text.indexOf(node);
      expect(at, `${file} no longer has ${node}`).toBeGreaterThan(0);
      const block = text.slice(at, at + 1400);
      expect(block, `${node} lets a press through to the scene`).toContain(
        'onPointerDown={(event) => event.stopPropagation()}',
      );
      expect(block).toContain('onPointerUp={(event) => event.stopPropagation()}');
    }
  });

  it('states the two thresholds in one place, and they are the reported ones', () => {
    expect(TAP_SLOP).toBe(6);
    expect(TAP_MS).toBe(400);
  });
});
