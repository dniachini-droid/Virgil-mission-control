import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Anchor } from './composition.js';
import type { Insets } from './safeArea.js';

/**
 * **Touch targets that never take the gesture away from the camera.**
 *
 * The requirement is that every character and every important screen has an
 * invisible target of at least 44 × 44 CSS px. The obvious implementation — a
 * transparent `<button>` over each — is wrong here, and measurably so: React
 * Three Fiber's `<Canvas>` and `OrbitControls` listen on the canvas element, a
 * *sibling* of any overlay, so a press that lands on an overlay button never
 * reaches the controls and the world stops orbiting under every target. On a
 * phone, thirteen 48 px squares would put dead zones over the whole cast.
 *
 * So the targets are `pointer-events: none` throughout. They exist to be
 * **measured** (by `getBoundingClientRect`, which is what the verifier reads),
 * to show press feedback, and to carry an accessible name. The hit test is done
 * by the room itself on the pointer-up, nearest centre first, and only after
 * `gesture.ts` has agreed the press was a tap — the same guard, extended to
 * every target added here, which is the owner's own V9 defect and may not
 * regress.
 *
 * The projection runs in the render loop rather than in React: a re-render per
 * frame during a camera flight is exactly the cost this product cannot pay on
 * the device it is being designed for.
 */

export interface Projection {
  x: number;
  y: number;
  /** In front of the camera and inside the canvas. */
  visible: boolean;
}

let current: Record<string, Projection> = {};

/** What the last rendered frame projected. Read by the DOM layer and by the hit test. */
export function projections(): Record<string, Projection> {
  return current;
}

/** For tests: forget the last frame. */
export function resetProjections(): void {
  current = {};
}

/**
 * Inside the canvas. Projects each anchor to canvas-relative CSS pixels every
 * frame and publishes them; renders nothing.
 */
export function TouchProjector({ anchors }: { anchors: Anchor[] }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const vector = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const next: Record<string, Projection> = {};
    for (const anchor of anchors) {
      vector.set(anchor.point[0], anchor.point[1], anchor.point[2]).project(camera);
      const x = (vector.x * 0.5 + 0.5) * size.width;
      const y = (-vector.y * 0.5 + 0.5) * size.height;
      next[anchor.id] = {
        x,
        y,
        visible:
          vector.z > -1 && vector.z < 1 && x >= 0 && x <= size.width && y >= 0 && y <= size.height,
      };
    }
    current = next;
  });
  return null;
}

/** The side of a target, in CSS pixels. Above the 44 the brief and Apple both name. */
export const TOUCH_SIZE = 48;
/** How far a target may be pushed off its point to stay clear of an edge. */
const EDGE_MARGIN = 6;

/**
 * The DOM layer. One node per anchor, positioned from the last projected
 * frame, clamped so that a target near an edge is pushed inside the safe area
 * rather than allowed to overflow it — a target half off the screen is not a
 * 44 px target.
 */
export function TouchTargets({ anchors, insets }: { anchors: Anchor[]; insets: Insets }) {
  const nodes = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    let handle = 0;
    const tick = () => {
      const frame = projections();
      const width = window.innerWidth;
      const height = window.innerHeight;
      const minX = insets.left + EDGE_MARGIN;
      const maxX = width - insets.right - EDGE_MARGIN - TOUCH_SIZE;
      const minY = insets.top + EDGE_MARGIN;
      const maxY = height - insets.bottom - EDGE_MARGIN - TOUCH_SIZE;
      for (const anchor of anchors) {
        const node = nodes.current[anchor.id];
        if (!node) continue;
        const projected = frame[anchor.id];
        if (!projected || !projected.visible) {
          if (node.style.display !== 'none') node.style.display = 'none';
          continue;
        }
        if (node.style.display !== 'block') node.style.display = 'block';
        const left = Math.min(Math.max(projected.x - TOUCH_SIZE / 2, minX), Math.max(minX, maxX));
        const top = Math.min(Math.max(projected.y - TOUCH_SIZE / 2, minY), Math.max(minY, maxY));
        node.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
      }
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [anchors, insets]);

  return (
    <div className="v11-touch-layer" aria-hidden="true">
      {anchors.map((anchor) => (
        <div
          key={anchor.id}
          className="v11-touch"
          data-touch-target={anchor.id}
          data-world="1"
          data-label={anchor.label}
          ref={(node) => {
            nodes.current[anchor.id] = node;
          }}
        >
          <span className="v11-touch-ring" />
        </div>
      ))}
    </div>
  );
}

/**
 * Which world target a point is on: among the targets whose 48 px box contains
 * the point, the one whose centre is nearest it. Deterministic where two
 * overlap, which on a phone they will.
 */
export function targetAt(x: number, y: number): string | null {
  if (typeof document === 'undefined') return null;
  let best: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  const nodes = document.querySelectorAll<HTMLElement>('[data-touch-target][data-world="1"]');
  for (const node of Array.from(nodes)) {
    if (node.style.display === 'none') continue;
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      continue;
    }
    const distance = Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = node.dataset.touchTarget ?? null;
    }
  }
  return best;
}

/** Marks one target pressed, and clears every other. The subtle feedback. */
export function setPressed(id: string | null): void {
  if (typeof document === 'undefined') return;
  for (const node of Array.from(
    document.querySelectorAll<HTMLElement>('[data-touch-target][data-world="1"]'),
  )) {
    node.classList.toggle('is-pressed', node.dataset.touchTarget === id);
  }
}
