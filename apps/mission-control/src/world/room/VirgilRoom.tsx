import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { Suspense, useEffect, useState } from 'react';
import * as THREE from 'three';
import { detectTier, prefersReducedMotion, SettingsContext } from '../../ui/settings.js';
import { VirgilRigged } from '../characters/VirgilRigged.js';
import { Visor } from '../characters/Visor.js';
import { ScreenBank, StationPanel } from '../screens/ScreenBank.js';
import { useDemo } from './demo.js';
import { LightingRig } from './LightingRig.js';
import { ConsoleRing, PortholeFrame, ProverFigure, SideStation } from './Models.js';
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
            position: layout.camera.position,
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
            target={layout.camera.target}
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
  const state = useDemo(demo);
  const [sx, , sz] = layout.stationAt;
  const [px, , pz] = layout.proverAt;
  return (
    <>
      <VirgilRigged pose={state.pose} face={state.virgilFace} />
      <ScreenBank content={state.content} />
      <SideStation />
      <StationPanel
        position={[
          sx - Math.sin(layout.stationRotationY) * -0.32,
          0.98,
          sz - Math.cos(layout.stationRotationY) * 0.32,
        ]}
        rotation={[0, layout.stationRotationY, 0]}
        occupant="Prover"
        state={state.stationState}
      />
      <ProverFigure />
      {/* The Prover's visor: the owner made it blank, so the panel sits over
          it directly. Height and depth read off his 1.6 m placement. */}
      <group position={[px, 0, pz]} rotation={[0, layout.proverRotationY, 0]}>
        <Visor
          state={state.proverFace}
          position={[0, 1.33, 0.29]}
          rotation={[-0.05, 0, 0]}
          width={0.34}
          height={0.22}
          lightIntensity={0.9}
        />
      </group>
    </>
  );
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
