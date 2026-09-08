import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { Suspense, useEffect, useState } from 'react';
import * as THREE from 'three';
import { detectTier, prefersReducedMotion, SettingsContext } from '../../ui/settings.js';
import { VirgilRigged } from '../characters/VirgilRigged.js';
import type { FaceState } from '../characters/Visor.js';
import { ScreenBank, StationPanel } from '../screens/ScreenBank.js';
import { forcedState, useDemo } from './demo.js';
import { LightingRig } from './LightingRig.js';
import { ConsoleRing, PortholeFrame, ProverFigure, SideStation, StationLight } from './Models.js';
import { Orrery } from './Orrery.js';
import { layout, room } from './palette.js';
import { RoomShell } from './RoomShell.js';
import { WindowView } from './WindowView.js';

/**
 * Virgil in his room: the first art-directed Owner Build.
 *
 * One camera, framed like the approved reference — Virgil centred, the
 * window behind him, the camera just above the console's screen line — with
 * orbit as the only control. V2: the owner preferred the orrery of light and
 * asked for Virgil to replace its sun, so it opens on Light with him at the
 * centre; the metal armillary stays behind the switch, beside the console.
 *
 * Nothing here is a measurement of performance or of how it looks; the
 * container this is built in renders in software and misrepresents bloom and
 * colour. The owner's machine is the only display this project has.
 */

export function VirgilRoom() {
  const [demo, setDemo] = useState(true);
  const [settings] = useState(() => ({
    reducedMotion: prefersReducedMotion(),
    tier: detectTier(),
    autoTravel: false,
    softwareRenderer: false,
  }));
  const coarse = settings.tier === 'constrained' || settings.tier === 'mobile';

  return (
    <SettingsContext.Provider value={settings}>
      <div className="room-stage">
        <Canvas
          shadows={!coarse}
          dpr={coarse ? [1, 1.25] : [1, 1.75]}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
            powerPreference: 'high-performance',
          }}
          camera={{
            position: initialCamera().position,
            fov: layout.camera.fov,
            near: 0.1,
            far: 120,
          }}
          onCreated={({ gl }) => {
            gl.setClearColor(new THREE.Color(room.nebula.dust));
            registerRenderer(gl);
          }}
        >
          <Suspense fallback={null}>
            <LightingRig />
            <RoomShell />
            <WindowView />
            <PortholeFrame />
            <ConsoleRing />
            <Orrery />
            <Cast demo={demo} />
            <Ready />
          </Suspense>
          <OrbitControls
            makeDefault
            target={initialCamera().target}
            enablePan={false}
            minDistance={2.5}
            maxDistance={9.5}
            minPolarAngle={0.5}
            maxPolarAngle={1.5}
            minAzimuthAngle={-1.1}
            maxAzimuthAngle={1.1}
            enableDamping
            dampingFactor={0.08}
          />
          {coarse ? null : (
            <EffectComposer multisampling={0} enableNormalPass={false}>
              {/* Threshold high enough that cream walls and gold stay
                  surfaces; only the orrery core, the coves and the nebula's
                  centre are bright enough to bloom. */}
              <Bloom
                intensity={0.75}
                luminanceThreshold={0.9}
                luminanceSmoothing={0.2}
                mipmapBlur
                resolutionScale={0.5}
              />
              <Vignette eskil={false} offset={0.25} darkness={0.5} />
            </EffectComposer>
          )}
        </Canvas>
        <div className="room-controls">
          <span className="room-controls-label">Demo</span>
          <button type="button" className={demo ? 'is-active' : ''} onClick={() => setDemo(true)}>
            On
          </button>
          <button type="button" className={demo ? '' : 'is-active'} onClick={() => setDemo(false)}>
            Off
          </button>
          <span className="room-controls-hint">Drag to look around. Scroll to move closer.</span>
        </div>
        {demo ? (
          <div className="room-demo-badge" role="status">
            SCRIPTED DEMONSTRATION — a fixed twenty-second loop driven by no real events. Every
            screen is illustrative; nothing shown is this repository's state.
          </div>
        ) : null}
      </div>
    </SettingsContext.Provider>
  );
}

/**
 * Everyone in the room and everything they read: Virgil (rigged) with his
 * face, the Prover at the side station with his, the screen bank behind
 * Virgil and the station's panel. Driven by the demo timeline when it runs,
 * otherwise resting.
 */
function Cast({ demo }: { demo: boolean }) {
  const forced = forcedFace();
  const running = useDemo(demo && forced === null);
  const state = forced ? forcedState(forced) : running;
  const [sx, , sz] = layout.stationAt;
  return (
    <>
      <VirgilRigged pose={state.pose} face={state.virgilFace} />
      <ScreenBank content={state.content} />
      <SideStation />
      {/* The station's panel floats over its left desk (the camera's left),
          turned to the camera, clear of the Prover who now stands at its
          centre. No stand: the owner approved floating panels. */}
      <StationPanel
        position={stationPanel().position}
        rotation={stationPanel().rotation}
        occupant="Prover"
        state={state.stationState}
        verdict={state.content.verdict}
      />
      <ProverFigure face={state.proverFace} activity={state.proverActivity} />
      <StationLight activity={state.proverActivity} verdict={state.content.verdict} />
    </>
  );
}

/**
 * Where the station's panel floats: over the desk on the camera's left,
 * at head height, turned a little toward the camera, clear of the Prover
 * at the station's centre. No stand: the owner approved floating panels.
 */
function stationPanel(): {
  position: [number, number, number];
  rotation: [number, number, number];
} {
  const [sx, , sz] = layout.stationAt;
  const r = layout.stationRotationY;
  // (-0.66, -0.04) in the station's frame, rotated into the room, at
  // 1.32 m: beside him and above his shoulder line, so his eye-stalks (at
  // 1.2 m) hide as little of it as possible from the front.
  const dx = -0.66;
  const dz = -0.04;
  return {
    position: [
      sx + Math.cos(r) * dx + Math.sin(r) * dz,
      1.32,
      sz - Math.sin(r) * dx + Math.cos(r) * dz,
    ],
    rotation: [0, r + 0.35, 0],
  };
}

/**
 * Renders nothing; it exists so that the verifier can wait for the moment all
 * three models and the window layers have decoded and the scene has drawn.
 */
function Ready() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
    const id = requestAnimationFrame(() => {
      (window as Window & { __virgilRoomReady?: boolean }).__virgilRoomReady = true;
    });
    return () => cancelAnimationFrame(id);
  }, [invalidate]);
  return null;
}

const FACE_STATES: readonly FaceState[] = ['idle', 'attentive', 'working', 'passed', 'blocked'];

/**
 * `#/?state=blocked` holds every face and screen in one state instead of
 * running the demo, so the captures can judge each state at rest. Not a
 * feature; a way to see. Read once at mount, like the camera.
 */
function forcedFace(): FaceState | null {
  const query = window.location.hash.split('?')[1] ?? '';
  const value = new URLSearchParams(query).get('state');
  return (FACE_STATES as readonly string[]).includes(value ?? '') ? (value as FaceState) : null;
}

/**
 * The authored camera, or a named close-up for the gross-error captures:
 * `#/?cam=prover` looks at the Prover, `#/?cam=station` at his panel,
 * `#/?cam=face` at Virgil's face. Not a feature; a way to see.
 */
function initialCamera(): { position: [number, number, number]; target: [number, number, number] } {
  const query = window.location.hash.split('?')[1] ?? '';
  const cam = new URLSearchParams(query).get('cam');
  if (cam === 'prover') {
    // In front of him, wherever he faces.
    const [px, py, pz] = layout.proverAt;
    const f = layout.proverRotationY;
    return {
      position: [px + Math.sin(f) * 2.2 + Math.cos(f) * 0.4, py + 1.55, pz + Math.cos(f) * 2.2],
      target: [px, py + 1.15, pz],
    };
  }
  if (cam === 'station') {
    // Square-ish on to the station's panel from its own left, close enough
    // to read it, with the Prover (on its right) out of the line of sight.
    const {
      position: [px, py, pz],
      rotation: [, ry],
    } = stationPanel();
    const nx = Math.sin(ry);
    const nz = Math.cos(ry);
    const lx = -Math.cos(ry);
    const lz = Math.sin(ry);
    return {
      position: [px + nx * 1.2 + lx * 0.7, py + 0.42, pz + nz * 1.2 + lz * 0.7],
      target: [px, py, pz],
    };
  }
  if (cam === 'face') {
    const [vx, vy, vz] = layout.virgilAt;
    return { position: [vx + 0.3, vy + 1.7, vz + 1.6], target: [vx, vy + 1.45, vz] };
  }
  return { position: [...layout.camera.position], target: [...layout.camera.target] };
}

function registerRenderer(gl: THREE.WebGLRenderer) {
  const context = gl.getContext();
  const debug = context.getExtension('WEBGL_debug_renderer_info');
  const renderer = debug
    ? String(context.getParameter(debug.UNMASKED_RENDERER_WEBGL))
    : 'unknown renderer';
  const w = window as Window & { __virgilRenderer?: string; __virgilSoftware?: boolean };
  w.__virgilRenderer = renderer;
  w.__virgilSoftware = /swiftshader|llvmpipe|software/i.test(renderer);
}
