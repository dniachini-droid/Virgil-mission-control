import type { ReactNode } from 'react';
import type { Settings, Tier } from './settings.js';

export interface StepInfo {
  id: string;
  title: string;
  status: 'pending' | 'current' | 'done' | 'refused';
}

interface Props {
  title: string;
  settings: Settings;
  onSettings: (s: Partial<Settings>) => void;
  steps: StepInfo[];
  stepIndex: number;
  onStep: (i: number) => void;
  evidence: ReactNode;
  other: { label: string; href: string };
}

export function Hud({
  title,
  settings,
  onSettings,
  steps,
  stepIndex,
  onStep,
  evidence,
  other,
}: Props) {
  return (
    <div className="hud">
      <div className="hud-top">
        <h1>{title}</h1>
        <span className="spacer" />
        <button
          type="button"
          aria-pressed={settings.reducedMotion}
          onClick={() => onSettings({ reducedMotion: !settings.reducedMotion })}
        >
          reduced motion {settings.reducedMotion ? 'on' : 'off'}
        </button>
        <button
          type="button"
          aria-pressed={!settings.autoTravel}
          onClick={() => onSettings({ autoTravel: !settings.autoTravel })}
        >
          camera {settings.autoTravel ? 'follows' : 'held'}
        </button>
        <label>
          tier{' '}
          <select
            value={settings.tier}
            onChange={(e) => onSettings({ tier: e.target.value as Tier })}
          >
            {(['ultra', 'desktop', 'laptop', 'mobile', 'constrained'] as Tier[]).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <a href={other.href} style={{ font: '12px var(--mono)', color: 'var(--ice)' }}>
          {other.label} →
        </a>
      </div>
      <div />
      <div className="hud-bottom">
        <nav className="timeline" aria-label="Sequence steps">
          <button
            type="button"
            onClick={() => onStep(Math.max(0, stepIndex - 1))}
            aria-label="Previous step"
          >
            ◀
          </button>
          {steps.map((s, i) => (
            <button
              type="button"
              key={s.id}
              className={s.status}
              aria-current={i === stepIndex ? 'step' : undefined}
              onClick={() => onStep(i)}
            >
              {String(i).padStart(2, '0')} {s.title}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onStep(Math.min(steps.length - 1, stepIndex + 1))}
            aria-label="Next step"
          >
            ▶
          </button>
        </nav>
        <aside className="evidence" aria-live="polite">
          {evidence}
        </aside>
      </div>
    </div>
  );
}
