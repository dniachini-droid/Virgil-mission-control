import { Canvas } from '@react-three/fiber';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  detectTier,
  dprForTier,
  prefersReducedMotion,
  type Settings,
  SettingsContext,
  type Tier,
} from '../ui/settings.js';

interface Props {
  children: (
    settings: Settings,
    setSettings: (s: Partial<Settings>) => void,
  ) => { scene: ReactNode; hud: ReactNode };
}

/** Shared canvas, settings and readiness signal for both spikes. */
export function SpikeShell({ children }: Props) {
  const [params] = useSearchParams();
  const [settings, setSettingsState] = useState<Settings>(() => ({
    reducedMotion: params.get('reduced') === '1' || prefersReducedMotion(),
    tier: (params.get('tier') as Tier | null) ?? detectTier(),
    autoTravel: params.get('hold') !== '1',
    softwareRenderer: false,
  }));
  const setSettings = (s: Partial<Settings>) => setSettingsState((prev) => ({ ...prev, ...s }));
  const { scene, hud } = children(settings, setSettings);
  const dpr = useMemo(() => dprForTier[settings.tier], [settings.tier]);
  useEffect(() => {
    (window as Window & { __virgilSettings?: Settings }).__virgilSettings = settings;
  }, [settings]);
  return (
    <SettingsContext.Provider value={settings}>
      <Canvas
        dpr={dpr}
        gl={{
          antialias: settings.tier === 'ultra',
          powerPreference: 'high-performance',
          alpha: false,
          stencil: false,
        }}
        camera={{ fov: 42, near: 0.1, far: 1200, position: [0, 12, 40] }}
        onCreated={({ gl }) => {
          const ctx = gl.getContext();
          const dbg = ctx.getExtension('WEBGL_debug_renderer_info');
          const renderer = dbg ? String(ctx.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
          const software = /swiftshader|llvmpipe|software/i.test(renderer);
          (
            window as Window & { __virgilRenderer?: string; __virgilSoftware?: boolean }
          ).__virgilRenderer = renderer;
          (window as Window & { __virgilSoftware?: boolean }).__virgilSoftware = software;
          if (software) setSettingsState((prev) => ({ ...prev, softwareRenderer: true }));
        }}
        style={{ position: 'fixed', inset: 0 }}
      >
        {scene}
      </Canvas>
      {hud}
    </SettingsContext.Provider>
  );
}
