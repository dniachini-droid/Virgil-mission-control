import { createContext, useContext } from 'react';

export type Tier = 'ultra' | 'desktop' | 'laptop' | 'mobile' | 'constrained';

export interface Settings {
  reducedMotion: boolean;
  tier: Tier;
  autoTravel: boolean;
  softwareRenderer: boolean;
}

export const SettingsContext = createContext<Settings>({
  reducedMotion: false,
  tier: 'desktop',
  autoTravel: true,
  softwareRenderer: false,
});
export const useSettings = () => useContext(SettingsContext);

export function detectTier(): Tier {
  if (typeof navigator === 'undefined') return 'desktop';
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  if (small) return mem <= 2 ? 'constrained' : 'mobile';
  if (cores <= 4 || mem <= 4) return 'laptop';
  return 'desktop';
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

export const dprForTier: Record<Tier, [number, number]> = {
  ultra: [1, 2],
  desktop: [1, 1.5],
  laptop: [1, 1.25],
  mobile: [1, 1],
  constrained: [0.75, 1],
};
