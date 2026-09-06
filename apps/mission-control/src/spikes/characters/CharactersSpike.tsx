import { useFrame } from '@react-three/fiber';
import { tokens } from '@virgil/visual-language';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import * as THREE from 'three';
import { type Bot, type BotMode, type BotRole, useBots } from '../../characters/index.js';
import { useSettings } from '../../ui/settings.js';
import { CameraRig } from '../../world/CameraRig.js';
import { Effects } from '../../world/Effects.js';
import { EnvironmentRig } from '../../world/EnvironmentRig.js';
import { Label } from '../../world/Label.js';
import { Nebula } from '../../world/Nebula.js';
import { StarField } from '../../world/StarField.js';
import { SpikeShell } from '../SpikeShell.js';

const P = tokens.palette;
const ROLES: BotRole[] = ['fabricator', 'prover', 'keeper', 'virgil'];
const MODES: BotMode[] = ['idle', 'walk', 'work', 'wait', 'refuse', 'present'];

function Stage({ bots, mode }: { bots: Record<BotRole, Bot>; mode: BotMode }) {
  const { reducedMotion } = useSettings();
  const walkTargets = useRef<Record<string, 0 | 1>>({});
  const focus = useMemo(() => new THREE.Vector3(0, 1.2, 6), []);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const d = Math.min(dt, 0.05);
    ROLES.forEach((role, i) => {
      const b = bots[role];
      const x = (i - 1.5) * 2.4;
      if (mode === 'walk') {
        b.mode = 'walk';
        const side = walkTargets.current[role] ?? 0;
        const target = new THREE.Vector3(x, 0, side ? 1.6 : -1.6);
        if (b.pos.distanceTo(target) < 0.08) walkTargets.current[role] = side ? 0 : 1;
        b.goal = target;
        b.lookAt = null;
      } else {
        b.mode = mode;
        b.goal = new THREE.Vector3(x, 0, 0);
        b.lookAt = focus;
        b.intensity = 0.5 + 0.5 * Math.sin(t * 0.8);
        const phase = Math.floor(t / 4) % 3;
        b.pose =
          role === 'fabricator'
            ? phase === 0
              ? 'assemble'
              : phase === 1
                ? 'load'
                : 'press'
            : 'default';
      }
      b.update(d, t, reducedMotion ? 0 : 1);
    });
  });
  return (
    <>
      {ROLES.map((role) => (
        <primitive key={role} object={bots[role].root} />
      ))}
    </>
  );
}

export function CharactersSpike() {
  const [params] = useSearchParams();
  const mono = params.get('mono') === '1';
  const initialMode = (params.get('mode') as BotMode | null) ?? 'idle';
  return (
    <SpikeShell>
      {(settings, setSettings) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [mode, setMode] = useState<BotMode>(
          MODES.includes(initialMode) ? initialMode : 'idle',
        );
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const bots = useBots(
          ROLES.map((role, i) => ({
            role,
            position: [(i - 1.5) * 2.4, 0, 0] as [number, number, number],
          })),
        );
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          const w = window as Window & { __spikeReady?: boolean; __spikeStep?: number };
          w.__spikeStep = MODES.indexOf(mode);
          const t = setTimeout(() => {
            w.__spikeReady = true;
          }, 400);
          return () => clearTimeout(t);
        }, [mode]);
        return {
          scene: (
            <>
              <color attach="background" args={[P.void]} />
              <Nebula a={P.nebulaViolet} b={P.nebulaMagenta} c={P.nebulaTeal} dust={P.dustRose} />
              <StarField />
              <EnvironmentRig world="foundry" />
              <hemisphereLight args={['#8f86d8', '#1a1230', 0.7]} />
              <directionalLight position={[6, 10, 8]} intensity={2.2} color="#fff1e0" castShadow />
              <directionalLight position={[-8, 6, -6]} intensity={0.9} color="#7fb8ff" />
              <pointLight position={[0, 3, 4]} intensity={18} color={P.signalCyan} distance={14} />
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <circleGeometry args={[7, 48]} />
                <meshPhysicalMaterial color="#141127" metalness={0.8} roughness={0.5} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
                <ringGeometry args={[6.6, 6.8, 64]} />
                <meshStandardMaterial
                  color={P.evidenceIce}
                  emissive={P.evidenceIce}
                  emissiveIntensity={0.8}
                  toneMapped={false}
                />
              </mesh>
              {ROLES.map((role, i) => (
                <Label
                  key={role}
                  text={role}
                  position={[(i - 1.5) * 2.4, 2.35, 0]}
                  height={0.28}
                  fg={P.evidenceIce}
                />
              ))}
              <Stage bots={bots} mode={mode} />
              <CameraRig
                pose={{ position: [0.5, 2.6, 8.4], target: [0, 0.9, 0] }}
                autoTravel={settings.autoTravel}
              />
              <Effects mono={mono} />
            </>
          ),
          hud: (
            <div className="hud">
              <div className="hud-top">
                <h1>Character family · line-up</h1>
                <span className="spacer" />
                {MODES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                  >
                    {m}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={settings.reducedMotion}
                  onClick={() => setSettings({ reducedMotion: !settings.reducedMotion })}
                >
                  reduced motion {settings.reducedMotion ? 'on' : 'off'}
                </button>
                <a href="/spike/foundry" style={{ font: '12px var(--mono)', color: 'var(--ice)' }}>
                  Foundry →
                </a>
              </div>
              <div />
              <div className="hud-bottom">
                <aside className="evidence" style={{ maxWidth: 440 }}>
                  <h2>ensemble check</h2>
                  <p style={{ margin: 0, color: 'var(--ash)' }}>
                    Four roles on a shared rig. Add <code>?mono=1</code> for the greyscale
                    silhouette test. Poses here are driven by the line-up controls, not by events;
                    in the Foundry every work pose needs its recorded event.
                  </p>
                </aside>
              </div>
            </div>
          ),
        };
      }}
    </SpikeShell>
  );
}
