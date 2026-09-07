import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { Suspense, useEffect, useState } from 'react';
import * as THREE from 'three';
import { detectTier, prefersReducedMotion, SettingsContext } from '../../ui/settings.js';
import { LightingRig } from './LightingRig.js';
import { ConsoleDais, MetalOrrery, VirgilFigure } from './Models.js';
import { Orrery as LightOrrery } from './Orrery.js';
import { layout, room } from './palette.js';
import { RoomShell } from './RoomShell.js';
import { WindowView } from './WindowView.js';

/**
 * Virgil in his room: the first art-directed Owner Build.
 *
 * One camera, framed like the approved reference — low, Virgil centred, the
 * window behind him — with orbit as the only control. The owner asked to see
 * the metal orrery first and the light one second, so both are built and the
 * button in the corner switches between them.
 *
 * Nothing here is a measurement of performance or of how it looks; the
 * container this is built in renders in software and misrepresents bloom and
 * colour. The owner's machine is the only display this project has.
 */

export type OrreryMode = 'metal' | 'light';

export function VirgilRoom() {
  const [orreryMode, setOrreryMode] = useState<OrreryMode>('metal');
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
            <ConsoleDais />
            {orreryMode === 'metal' ? <MetalOrrery /> : <LightOrrery />}
            <VirgilFigure />
            <Ready />
          </Suspense>
          <OrbitControls
            makeDefault
            target={layout.camera.target}
            enablePan={false}
            minDistance={2.2}
            maxDistance={9}
            minPolarAngle={0.55}
            maxPolarAngle={1.62}
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
          <span className="room-controls-label">Orrery</span>
          <button
            type="button"
            className={orreryMode === 'metal' ? 'is-active' : ''}
            onClick={() => setOrreryMode('metal')}
          >
            Metal
          </button>
          <button
            type="button"
            className={orreryMode === 'light' ? 'is-active' : ''}
            onClick={() => setOrreryMode('light')}
          >
            Light
          </button>
          <span className="room-controls-hint">Drag to look around. Scroll to move closer.</span>
        </div>
      </div>
    </SettingsContext.Provider>
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
