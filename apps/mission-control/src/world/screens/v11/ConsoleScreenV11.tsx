import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { use, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../../ui/settings.js';
import { buildVisorMeshes, placedPositions } from '../../characters/visorFit.js';
import { CAST, type Role } from '../../room/cast.js';
import type { Outcome, Report, StationState } from '../../room/demo.js';
import { wasTap } from '../../room/gesture.js';
import { crtFrame, POWER_OFF_SECONDS } from '../crt.js';
import { loadScreenFonts } from '../fonts.js';
import { screenPlan } from '../screenPlane.js';
import type { HopWork } from '../work.js';
import { bezelPlan, buildBezelMeshes } from './bezel.js';
import { ANISOTROPY, REDRAW_FPS, TEXTURE_WIDTH } from './resolution.js';
import { drawConsoleScreen } from './screens.js';

/**
 * **A role console's display, V11.**
 *
 * The same technique as V10's `ConsoleScreen` and deliberately not a
 * refactor of it: V10 must keep rendering exactly as it does at `#/v10`
 * (`docs/process/V11_BRIEF.md`, "The preservation contract"), so this is a
 * second component and `ConsoleScreen.tsx` is untouched. What is different:
 *
 *  - **the picture** is `v11/screens.ts`, not `stationScreen.ts`;
 *  - **the texture is tier-scaled with mipmaps and anisotropic filtering**
 *    (`resolution.ts`), where V10's was a fixed 1024 with `LinearFilter`
 *    and `generateMipmaps = false`. At the overview a console's display is
 *    43 CSS pixels wide and its texture is 1024 — a 24 : 1 minification,
 *    which without mipmaps samples one texel in twenty-four and turns the
 *    microtext into flicker. This is the brief's requirement and it is also
 *    the only way the *"complexity"* the owner asked to keep survives
 *    being seen from the overview instead of becoming noise;
 *  - **an authored ivory-and-gold faceplate** is fitted over the console's
 *    own beige surround (`bezel.ts`), which is the owner's Option A;
 *  - **the display powers on when the camera comes to it.** See below.
 *
 * **The close-up black-screen defect, and what it actually was.**
 *
 * Stage 1 found by looking that all three console displays render black in
 * their own close-ups, in V11 *and* in the committed V10 artifact. The
 * cause is not a drawing failure and never was: V10's power rule is
 * `state !== 'READY'`, from the owner's V8 instruction — *"we should avoid
 * having every screen on if its not in use … when the keepewr isnt doing
 * work it should stay off his screen"* — and the scripted demonstration
 * gives **one** station work at a time. So at any moment two of the three
 * are correctly, deliberately dark, and a close-up entered at an arbitrary
 * second lands on a dark screen two times in three. The `#/?cam=<role>`
 * capture entry point made it three times in three, because it opens at
 * demonstration second zero, when *all* three are idle.
 *
 * The fix keeps the owner's instruction and adds one clause: **a display is
 * also on while the camera is looking at it**. Going to a console is using
 * it. It warms up through `crt.ts`'s own power-on, so the arrival is the
 * television turn-on the owner asked for rather than a light switch, and
 * what it then shows is `STANDBY` with the role's identity, its last
 * conclusion and its full secondary detail — which is what the brief means
 * by *"a clearly readable primary state"*, and is a great deal more useful
 * than black. In the overview nothing changes: the idle screens are dark,
 * exactly as the owner asked.
 */

/** The glass stands further off a screen than a visor: the text sits under it. */
export const SCREEN_GLASS_GAP_M = 0.012;

export function ConsoleScreenV11({
  role,
  state,
  report,
  outcome,
  quiet = 0,
  work,
  attention = false,
  onOpen,
}: {
  role: Role;
  state: StationState;
  report: Report;
  outcome: Outcome;
  work?: HopWork | undefined;
  quiet?: number;
  /** Whether the camera is looking at this console. Powers the display on. */
  attention?: boolean;
  onOpen: () => void;
}) {
  use(loadScreenFonts());
  const member = CAST[role];
  const asset = use(member.station.load());
  const { reducedMotion, tier } = useSettings();
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  const mask = member.station.screen;
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
  const width = TEXTURE_WIDTH[tier];
  const { canvas, texture, corner } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = Math.max(64, Math.round(width / aspect));
    const corner = (plan.outline.drawn.radius / (2 * plan.outline.drawn.halfWidth)) * canvas.width;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    // Mipmaps and anisotropy, which is the whole point of this stage's
    // resolution work: at the overview the display is minified 24 : 1.
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(ANISOTROPY[tier], Math.max(1, maxAnisotropy));
    return { canvas, texture, corner };
  }, [aspect, plan, width, tier, maxAnisotropy]);
  useEffect(() => () => texture.dispose(), [texture]);

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

  // The faceplate. Its geometry is measured against this console's own
  // mesh once and cached in `bezel.ts`; building the meshes is arithmetic.
  const bezel = useMemo(() => buildBezelMeshes(bezelPlan(role)), [role]);
  useEffect(
    () => () => {
      bezel.lip.geometry.dispose();
      bezel.plate.geometry.dispose();
      (bezel.lip.material as THREE.Material).dispose();
      (bezel.plate.material as THREE.Material).dispose();
    },
    [bezel],
  );

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
  const fps = REDRAW_FPS[tier];

  useFrame((_, delta) => {
    const c = clock.current;
    if (!reducedMotion) c.t += Math.min(delta, 0.1);
    // The arrival is driven by the state **and** by attention, so coming
    // to a console reads as a screen-state transition rather than a jump.
    const key = `${state}:${attention ? 'seen' : 'away'}`;
    if (c.state !== key) {
      c.state = key;
      c.stateAt = c.t;
    }
    const on = state !== 'READY' || attention;
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
    const dark = !on && crt.settled;
    if (dark) return;
    if (c.last >= 0 && c.t - c.last < 1 / fps) return;
    c.last = c.t;
    drawConsoleScreen(canvas, {
      role,
      label: member.label,
      state,
      report,
      outcome,
      quiet,
      corner,
      work,
      t: c.t,
      since: c.t - c.stateAt,
    });
    texture.needsUpdate = true;
  });

  return createPortal(
    <>
      <primitive
        object={screen.face}
        onClick={(event: { stopPropagation: () => void }) => {
          event.stopPropagation();
          if (!wasTap()) return;
          onOpen();
        }}
      />
      <primitive object={screen.glass} />
      <primitive object={bezel.plate} />
      <primitive object={bezel.lip} />
    </>,
    parent,
  );
}
