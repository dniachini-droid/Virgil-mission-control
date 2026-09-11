import { createPortal, useFrame } from '@react-three/fiber';
import { use, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../ui/settings.js';
import { buildVisorMeshes, placedPositions } from '../characters/visorFit.js';
import { CAST, type Role } from '../room/cast.js';
import type { Outcome, Report, StationState } from '../room/demo.js';
import { wasTap } from '../room/gesture.js';
import { crtFrame, POWER_OFF_SECONDS } from './crt.js';
import { loadScreenFonts } from './fonts.js';
import { SCREEN_CANVAS_PIXELS, screenPlan } from './screenPlane.js';
import { drawStation } from './stationScreen.js';
import type { HopWork } from './work.js';

/**
 * A role console's own screen, carrying the information.
 *
 * V8 (`docs/process/PHASE_1_STYLISED_SPEC.md` §0.10.2). The owner: "each
 * screen of the actual consoles (created by meshy) should have the
 * information on it" — "make them compleetyley black, reflective, and
 * text sitting slightly under it". It is the visor technique on a
 * console: `asset-pipeline/fit-screen.mjs` recorded which of the
 * console's own triangles are its screen; `buildVisorMeshes` copies them
 * out of the console's geometry and draws the live screen canvas on them
 * through the same face material, with the same glass a little further
 * off (`SCREEN_GLASS_GAP_M`), so the text sits under the glass and a
 * highlight travels across it. One implementation, two hosts. The meshes
 * go beside the console's mesh under its placed group, so they turn with
 * it. This retires the floating per-agent panels of V4–V7.
 *
 * **The screen is dark when the agent is idle** (§0.10.12). The owner:
 * "when the keepewr isnt doing work it should stay off his screen. And
 * when it turns on, make it turn on like a tv, and whene it turns off, an
 * exadurated old tv turning off type animation." Power follows the
 * station's activity; the transitions are `crt.ts`, applied as uniforms
 * on the face material — the image scales and blooms inside the glass;
 * the glass, the bezel and the console never move. Virgil's slabs stay
 * on (`ScreenBank.tsx`); the agents' screens wake when summoned.
 */

/** The glass stands further off a screen than a visor: the text sits under it. */
export const SCREEN_GLASS_GAP_M = 0.012;

export function ConsoleScreen({
  role,
  state,
  report,
  outcome,
  quiet = 0,
  work,
  onOpen,
}: {
  role: Role;
  state: StationState;
  report: Report;
  outcome: Outcome;
  /**
   * What this station is doing, as data. The replay supplies the run's own
   * counts, check names and finding severities; the scripted
   * demonstration leaves it undefined and `tally.ts`'s fixtures are used.
   */
  work?: HopWork | undefined;
  /** 0..1: how quiet the screen is held (the owner gate). */
  quiet?: number;
  /**
   * Clicking the screen opens that agent's full record in the panel (V9).
   * The screen carries the glance; the panel carries everything, from the
   * same source (`panel/panelContent.ts`).
   */
  onOpen: () => void;
}) {
  use(loadScreenFonts());
  const member = CAST[role];
  const asset = use(member.station.load());
  const { reducedMotion } = useSettings();
  const mask = member.station.screen;
  // The live canvas is drawn at the **drawn outline's** aspect, not the
  // selection's paint bounds': the selection spans a surface tilted back
  // by 12.6°–14.1°, so its height in the fitted plane is longer than its
  // height in y (`screenPlane.ts`). The same plan carries the outline's
  // measured corner radius, which the picture is laid out inside.
  const plan = useMemo(
    () =>
      screenPlan(
        mask,
        placedPositions(asset.mesh),
        (asset.mesh.geometry.index as THREE.BufferAttribute).array,
      ),
    [asset, mask],
  );
  const aspect = plan.aspect;
  const { canvas, texture, corner } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = SCREEN_CANVAS_PIXELS;
    canvas.height = Math.max(64, Math.round(SCREEN_CANVAS_PIXELS / aspect));
    // The outline's corner radius, in the canvas's own pixels: the picture
    // is drawn inside it, so nothing — least of all the honesty band —
    // lands where the rounded corner cuts the picture away.
    const corner = (plan.outline.drawn.radius / (2 * plan.outline.drawn.halfWidth)) * canvas.width;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return { canvas, texture, corner };
  }, [aspect, plan]);
  // The one way a screen is made: the visor's builder, on the console's
  // own triangles, with its paint (the mask's rule keeps every pixel).
  const screen = useMemo(() => {
    const paint = asset.mesh.material.map;
    if (!paint) throw new Error(`${role}: the console has no base colour`);
    const { scale, positionScale } = asset.metadata.runtime;
    return buildVisorMeshes(
      asset.mesh,
      mask,
      placedPositions(asset.mesh),
      scale * positionScale,
      texture,
      paint,
      { gapMetres: SCREEN_GLASS_GAP_M, flat: true },
    );
  }, [asset, mask, texture, role]);
  const parent = asset.mesh.parent;
  if (!parent) throw new Error(`${role}: the console's mesh has no parent`);
  const clock = useRef({
    t: 0,
    last: -1,
    state: '' as string,
    stateAt: 0,
    on: false,
    powerAt: -POWER_OFF_SECONDS,
  });

  useFrame((_, delta) => {
    const c = clock.current;
    if (!reducedMotion) c.t += Math.min(delta, 0.1);
    if (c.state !== state) {
      c.state = state;
      c.stateAt = c.t;
    }
    // Power follows the work: on from the moment a hand-off arrives, off
    // once the report has been seen.
    const on = state !== 'READY';
    if (on !== c.on) {
      c.on = on;
      c.powerAt = c.t;
    }
    const crt = crtFrame(on, c.t - c.powerAt, reducedMotion);
    const material = screen.face.material as THREE.ShaderMaterial;
    (material.uniforms.uScale?.value as THREE.Vector2).set(crt.scale[0], crt.scale[1]);
    if (material.uniforms.uPower) material.uniforms.uPower.value = crt.power;
    if (material.uniforms.uFlash) material.uniforms.uFlash.value = crt.flash;
    if (material.uniforms.uGlow) material.uniforms.uGlow.value = crt.glow;
    // Nothing to draw while dark; the picture is redrawn at 24 fps while lit.
    const dark = !on && crt.settled;
    if (dark) return;
    if (c.last >= 0 && c.t - c.last < 1 / 24) return;
    c.last = c.t;
    drawStation(
      canvas,
      c.t,
      c.t - c.stateAt,
      member.label,
      role,
      state,
      report,
      outcome,
      quiet,
      corner,
      work,
    );
    texture.needsUpdate = true;
  });

  return createPortal(
    <>
      <primitive
        object={screen.face}
        onClick={(event: { stopPropagation: () => void }) => {
          event.stopPropagation();
          // Navigation is not a press (V10, defect A); see `gesture.ts`.
          if (!wasTap()) return;
          onOpen();
        }}
      />
      <primitive object={screen.glass} />
    </>,
    parent,
  );
}
