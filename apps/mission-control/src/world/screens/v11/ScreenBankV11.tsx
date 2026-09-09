import { useFrame, useThree } from '@react-three/fiber';
import { use, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSettings } from '../../../ui/settings.js';
import { createGlassMaterial, createRoundedConvexGlassGeometry } from '../../glass.js';
import type { SlabName } from '../../panel/panelContent.js';
import type { ReplaySpeed } from '../../replay/replayTimeline.js';
import type { Outcome, RunMode, ScreenContent } from '../../room/demo.js';
import { wasTap } from '../../room/gesture.js';
import { room } from '../../room/palette.js';
import { loadScreenFonts } from '../fonts.js';
import { v11Cluster } from './bank.js';
import { ANISOTROPY, REDRAW_FPS, SOFTWARE_REDRAW_FPS, TEXTURE_WIDTH } from './resolution.js';
import { drawSlab, ledgerRowAtUv, type SlabKind } from './screens.js';

/**
 * **Virgil's three slabs, rebuilt.**
 *
 * The owner's decision: *"Virgil: rebuild the authored slabs directly in the
 * same premium design language. They are ours, so there is no constraint to
 * work around — they should be the clearest statement of the system."*
 *
 * So this is not the V10 slab restyled; it is a new object, and the numbers
 * below are the whole of what changed. **The overall extent is exactly
 * V10's**, 1.540 × 1.040 m, because `mobile/composition.ts` solves the
 * portrait frame against `1.3 / 2 + 0.12` and `0.8 / 2 + 0.12` as the
 * slab's half extents, and stage 1's composition is delivered and is not
 * this stage's to move. Everything inside that extent is redistributed
 * from frame to glass:
 *
 * | | V10 | V11 | |
 * |---|---|---|---|
 * | bezel, each side | 120 mm | **32 mm** | −73 % |
 * | opening | 1.300 × 0.800 m | **1.476 × 0.976 m** | |
 * | glass area | 1.040 m² | **1.440 m²** | **+38 %** |
 * | shell depth behind the plate | 396 mm | **150 mm** | −62 % |
 * | plate depth | 50 mm | 30 mm | −40 % |
 * | glass bulge | 30 mm | 18 mm | −40 % |
 *
 * That is the *"more display glass and less bulky beige framing"* of the
 * brief, as arithmetic: the same object in the frame, 38 % more black
 * glass in it, and a bezel a third of the thickness carrying a **gold
 * inner lip** where V10 had a plain cream lip — the *"thinner carefully
 * bevelled ivory-and-gold bezels"* and the *"restrained illuminated edge
 * details"*. `test/screen-bank-v11.test.ts` computes every figure in that
 * table from the code rather than trusting it.
 *
 * The swollen half-ellipsoid shell that made the V10 slab read as an old
 * Mac is gone. In its place is a shallow box with a chamfered back — the
 * brief asks for *"refined celestial instrumentation"* and against that,
 * the bulge was the single most retro thing in the set.
 */

/** V11's slab, in metres. One place, because the plate, the glass and the canvas must agree. */
export const V11_SLAB = {
  /** The overall extent, unchanged from V10 so the composition does not move. */
  outerWidth: 1.54,
  outerHeight: 1.04,
  /** The bezel, each side. */
  bezel: 0.032,
  /** The gold inner lip's width, inside the bezel. */
  lip: 0.005,
  /** The outer and inner corner radii. */
  outerRadius: 0.052,
  /** How deep the front plate is, and how far the display sits behind its front face. */
  plate: 0.03,
  recess: 0.009,
  /**
   * The plate's bevel. **`bevelSize` narrows the opening's own front edge**,
   * so it is small and is stated here rather than derived from the bezel:
   * at 0.36 of the bezel it took 11.5 mm off each side of the visible
   * opening and swallowed the gold lip whole.
   */
  bevelThickness: 0.01,
  bevelSize: 0.006,
  /** How far the glass rises at its centre. */
  bulge: 0.018,
  /** How far the display plane stands outside the opening, so its cut edge hides. */
  overhang: 0.005,
  /** The shallow case behind the plate, and its own chamfer. */
  shellDepth: 0.15,
  shellBevel: 0.012,
  /**
   * **Where every layer sits along the slab's own z, front to back.**
   *
   * These five numbers are one table because the first version of this
   * component placed the shell at `-plate - shellDepth + 0.004` with a
   * 35 mm bevel — and an `ExtrudeGeometry`'s bevel reaches *past* both
   * ends of its depth, so the shell's front came out at z = +0.009,
   * **in front of the display plane at −0.009**. The built artifact showed
   * three blank cream rectangles where Virgil's three screens should be,
   * with no console error and nothing thrown: a solid mesh in front of a
   * live one. Found by looking at the first frame of the built artifact.
   *
   * `test/screen-bank-v11.test.ts` now builds all five geometries under
   * node and asserts their measured z extents stack in this order, which
   * costs nothing and would have caught it before the build.
   */
  z: {
    /** The plate's front face, at the group's own origin. */
    plate: 0,
    /** The gold lip, just in front of the display. */
    lip: -0.007,
    /** The display plane. */
    display: -0.009,
    /** The glass's rim; it bulges forward from here. */
    glass: -0.003,
    /** The shell's **front face, bevel included**. */
    shellFront: -0.02,
  },
} as const;

export interface V11SlabPlan {
  openingWidth: number;
  openingHeight: number;
  openingRadius: number;
  displayWidth: number;
  displayHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  /** The corner radius the picture is laid out inside, in canvas pixels. */
  cornerPixels: number;
  glassArea: number;
}

export function v11SlabPlan(canvasWidth: number): V11SlabPlan {
  const openingWidth = V11_SLAB.outerWidth - 2 * V11_SLAB.bezel;
  const openingHeight = V11_SLAB.outerHeight - 2 * V11_SLAB.bezel;
  const openingRadius = Math.max(0.012, V11_SLAB.outerRadius - V11_SLAB.bezel);
  const displayWidth = openingWidth + 2 * V11_SLAB.overhang;
  const displayHeight = openingHeight + 2 * V11_SLAB.overhang;
  return {
    openingWidth,
    openingHeight,
    openingRadius,
    displayWidth,
    displayHeight,
    canvasWidth,
    canvasHeight: Math.max(64, Math.round((canvasWidth * displayHeight) / displayWidth)),
    cornerPixels: ((openingRadius + V11_SLAB.overhang) / displayWidth) * canvasWidth,
    glassArea: openingWidth * openingHeight,
  };
}

/**
 * **The slab's five parts, built once and testable without a renderer.**
 *
 * Extracted from the component precisely so `test/screen-bank-v11.test.ts`
 * can build them under node and assert their z extents stack front to
 * back. Each mesh's position is derived from `V11_SLAB.z` and the
 * geometry's own **measured** front extent, so a change to a bevel cannot
 * silently move a layer in front of the display again.
 */
export function buildV11Slab(plan: V11SlabPlan): {
  front: THREE.ExtrudeGeometry;
  lip: THREE.ExtrudeGeometry;
  shell: THREE.ExtrudeGeometry;
  glass: THREE.BufferGeometry;
  plateAt: number;
  lipAt: number;
  shellAt: number;
} {
  const { outerWidth, outerHeight, outerRadius, bezel, plate, bulge } = V11_SLAB;
  const outer = roundedRect(outerWidth, outerHeight, outerRadius);
  outer.holes.push(roundedRectPath(plan.openingWidth, plan.openingHeight, plan.openingRadius));
  const front = new THREE.ExtrudeGeometry(outer, {
    depth: plate,
    bevelEnabled: true,
    bevelThickness: V11_SLAB.bevelThickness,
    bevelSize: V11_SLAB.bevelSize,
    bevelSegments: 3,
    curveSegments: 16,
  });
  // The gold inner lip: a narrow ring **inside** the opening's visible
  // front edge, so it overlaps the picture's outermost few millimetres and
  // hides the display plane's cut edge, instead of hiding behind the plate.
  const lipOuterWidth = plan.openingWidth - 2 * V11_SLAB.bevelSize + 0.002;
  const lipOuterHeight = plan.openingHeight - 2 * V11_SLAB.bevelSize + 0.002;
  const lipRadius = Math.max(0.004, plan.openingRadius - V11_SLAB.bevelSize);
  const lipShape = roundedRect(lipOuterWidth, lipOuterHeight, lipRadius);
  lipShape.holes.push(
    roundedRectPath(
      lipOuterWidth - 2 * V11_SLAB.lip,
      lipOuterHeight - 2 * V11_SLAB.lip,
      Math.max(0.002, lipRadius - V11_SLAB.lip),
    ),
  );
  const lip = new THREE.ExtrudeGeometry(lipShape, {
    depth: 0.003,
    bevelEnabled: true,
    bevelThickness: 0.0012,
    bevelSize: 0.0009,
    bevelSegments: 2,
    curveSegments: 16,
  });
  // A shallow case, chamfered: a box, not a bulge.
  const shellShape = roundedRect(outerWidth - bezel * 0.5, outerHeight - bezel * 0.5, outerRadius);
  const shell = new THREE.ExtrudeGeometry(shellShape, {
    depth: V11_SLAB.shellDepth,
    bevelEnabled: true,
    bevelThickness: V11_SLAB.shellBevel,
    bevelSize: V11_SLAB.shellBevel * 0.85,
    bevelSegments: 2,
    curveSegments: 14,
  });
  const glass = createRoundedConvexGlassGeometry(
    plan.openingWidth + 2 * V11_SLAB.overhang,
    plan.openingHeight + 2 * V11_SLAB.overhang,
    plan.openingRadius + V11_SLAB.overhang,
    bulge + 0.003,
    160,
  );
  const frontOf = (geometry: THREE.BufferGeometry) => {
    geometry.computeBoundingBox();
    return (geometry.boundingBox as THREE.Box3).max.z;
  };
  return {
    front,
    lip,
    shell,
    glass,
    plateAt: V11_SLAB.z.plate - frontOf(front),
    lipAt: V11_SLAB.z.lip - frontOf(lip),
    shellAt: V11_SLAB.z.shellFront - frontOf(shell),
  };
}

export function ScreenBankV11({
  content,
  outcome,
  seconds,
  mode,
  speed,
  onOpen,
}: {
  content: ScreenContent;
  outcome: Outcome;
  seconds: number;
  mode: RunMode;
  speed: ReplaySpeed;
  onOpen: (slab: SlabName, row?: number) => void;
}) {
  // The honesty band is drawn in the replay and nowhere else (`system.ts`).
  const showBand = mode === 'replay';
  void speed;
  return (
    <group>
      {v11Cluster().map((placement) => (
        <Slab
          key={placement.kind}
          kind={placement.kind}
          showBand={showBand}
          position={placement.position}
          rotation={placement.rotation}
          scale={placement.scale}
          content={content}
          outcome={outcome}
          seconds={seconds}
          onOpen={() => onOpen(placement.kind)}
          onOpenRow={placement.kind === 'roles' ? (row) => onOpen('roles', row) : undefined}
        />
      ))}
    </group>
  );
}

function Slab({
  kind,
  showBand,
  position,
  rotation,
  scale,
  content,
  outcome,
  seconds,
  onOpen,
  onOpenRow,
}: {
  kind: SlabKind;
  showBand: boolean;
  position: [number, number, number];
  rotation: [number, number, number];
  /**
   * The whole group's scale. The slab is the same object at every scale —
   * the same geometry, the same canvas, the same layout and the same
   * animations — so a larger slab is this design seen larger and not a
   * different one, which is what the owner's *"preserve their existing
   * visual design, content and animations, but enlarge them"* asks for.
   */
  scale: number;
  content: ScreenContent;
  outcome: Outcome;
  seconds: number;
  onOpen: () => void;
  onOpenRow?: ((row: number) => void) | undefined;
}) {
  use(loadScreenFonts());
  const { reducedMotion, tier, softwareRenderer } = useSettings();
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  const plan = useMemo(() => v11SlabPlan(TEXTURE_WIDTH[tier]), [tier]);
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = plan.canvasWidth;
    canvas.height = plan.canvasHeight;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    // Mipmaps and anisotropy, which is the whole point of this stage's
    // resolution work: at the overview a console's display is minified
    // about 24 : 1, and without a mip chain that samples one texel in
    // twenty-four and turns the microtext into flicker. **Off on a
    // software renderer**, where regenerating six mip chains a frame was
    // measured to cost 29 % of the frame rate and where minification
    // quality is not something a frame from this container can speak to.
    texture.generateMipmaps = !softwareRenderer;
    texture.minFilter = softwareRenderer ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = softwareRenderer
      ? 1
      : Math.min(ANISOTROPY[tier], Math.max(1, maxAnisotropy));
    return { canvas, texture };
  }, [plan, tier, maxAnisotropy, softwareRenderer]);
  useEffect(() => () => texture.dispose(), [texture]);

  const parts = useMemo(() => buildV11Slab(plan), [plan]);
  const { front, lip, shell, glass } = parts;
  useEffect(
    () => () => {
      front.dispose();
      lip.dispose();
      shell.dispose();
      glass.dispose();
    },
    [front, lip, shell, glass],
  );
  const glassMaterial = useMemo(() => createGlassMaterial(), []);
  const clock = useRef({ t: 0, last: -1, key: '', at: 0 });
  const fps = softwareRenderer ? SOFTWARE_REDRAW_FPS : REDRAW_FPS[tier];
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const c = clock.current;
    if (!reducedMotion) c.t += Math.min(delta, 0.1);
    const key = `${content.verdict}|${content.active}|${content.candidate}|${content.ownerGate}`;
    if (c.key !== key) {
      c.key = key;
      c.at = c.t;
    }
    // **The hover, and the nudge on a state change.** The owner, of the
    // cluster: *"The gentle hover continues. When the principal state
    // changes, the main screen may move forward slightly while the
    // supporting screens shift outward subtly."* Both are position only —
    // the same object, the same picture, moved — and both are held under a
    // centimetre or two so nothing the composition solves against leaves
    // the frame. Reduced motion holds `c.t` still, so both stop.
    if (group.current) {
      const hover = Math.sin((c.t / 14) * Math.PI * 2 + (kind === 'verdict' ? 0 : 1.7)) * 0.02;
      const settle = 1 - easeOutCubic(Math.min(1, (c.t - c.at) / 1.1));
      const forward = kind === 'verdict' ? 0.06 * settle : 0;
      const outward = kind === 'verdict' ? 0 : 0.05 * settle * Math.sign(position[0]);
      group.current.position.set(position[0] + outward, position[1] + hover, position[2] + forward);
    }
    if (c.last >= 0 && c.t - c.last < 1 / fps) return;
    c.last = c.t;
    drawSlab(canvas, {
      kind,
      content,
      outcome,
      seconds,
      corner: plan.cornerPixels,
      t: c.t,
      since: c.t - c.at,
      showBand,
    });
    texture.needsUpdate = true;
  });

  return (
    <group ref={group} position={position} rotation={rotation} scale={scale}>
      <mesh geometry={front} position={[0, 0, parts.plateAt]} castShadow receiveShadow>
        <meshStandardMaterial color={room.surface.ivory} roughness={0.42} metalness={0.04} />
      </mesh>
      <mesh geometry={lip} position={[0, 0, parts.lipAt]}>
        <meshStandardMaterial color={room.surface.gold} roughness={0.3} metalness={0.62} />
      </mesh>
      <mesh geometry={shell} position={[0, 0, parts.shellAt]} castShadow>
        <meshStandardMaterial
          color={room.surface.castCreamShadow}
          roughness={0.55}
          metalness={0.03}
        />
      </mesh>
      <mesh
        position={[0, 0, V11_SLAB.z.display]}
        onClick={(event) => {
          event.stopPropagation();
          if (!wasTap()) return;
          const row =
            onOpenRow && event.uv
              ? ledgerRowAtUv(event.uv.y, plan.canvasWidth, plan.canvasHeight, showBand)
              : null;
          if (onOpenRow && row !== null) onOpenRow(row);
          else onOpen();
        }}
      >
        <planeGeometry args={[plan.displayWidth, plan.displayHeight]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh
        geometry={glass}
        material={glassMaterial}
        position={[0, 0, V11_SLAB.z.glass]}
        renderOrder={1}
      />
    </group>
  );
}

const easeOutCubic = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;

function roundedRectPath(w: number, h: number, r: number): THREE.Path {
  const path = new THREE.Path();
  tracePath(path, w, h, r);
  return path;
}

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const shape = new THREE.Shape();
  tracePath(shape, w, h, r);
  return shape;
}

function tracePath(path: THREE.Path, w: number, h: number, r: number) {
  const x = -w / 2;
  const y = -h / 2;
  const rr = Math.max(0.001, Math.min(r, w / 2, h / 2));
  path.moveTo(x + rr, y);
  path.lineTo(x + w - rr, y);
  path.absarc(x + w - rr, y + rr, rr, -Math.PI / 2, 0, false);
  path.lineTo(x + w, y + h - rr);
  path.absarc(x + w - rr, y + h - rr, rr, 0, Math.PI / 2, false);
  path.lineTo(x + rr, y + h);
  path.absarc(x + rr, y + h - rr, rr, Math.PI / 2, Math.PI, false);
  path.lineTo(x, y + rr);
  path.absarc(x + rr, y + rr, rr, Math.PI, Math.PI * 1.5, false);
}
