import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Drives a step sequence. progress (0..1) advances in real time per the step's grammar duration,
 * or in a short fade with reduced motion. Steps only change by user navigation (deliberate) or
 * by the recorded events being played; nothing advances on its own.
 */
export function useSequence(
  stepCount: number,
  durationsMs: number[],
  reducedMotion: boolean,
  initial = 0,
) {
  const [stepIndex, setStepIndex] = useState(() => Math.min(Math.max(0, initial), stepCount - 1));
  const progressRef = useRef(1);
  const startRef = useRef(0);
  const [progressVersion, setVersion] = useState(0);
  const durations = useMemo(() => durationsMs, [durationsMs]);

  const goTo = useCallback(
    (i: number) => {
      const next = Math.min(Math.max(0, i), stepCount - 1);
      setStepIndex(next);
      progressRef.current = 0;
      startRef.current = performance.now();
      setVersion((v) => v + 1);
    },
    [stepCount],
  );

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const d = reducedMotion ? 220 : (durations[stepIndex] ?? 1200);
      const t = Math.min(1, (performance.now() - startRef.current) / d);
      progressRef.current = t;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stepIndex, progressVersion, reducedMotion, durations]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)
      )
        return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') goTo(stepIndex + 1);
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') goTo(stepIndex - 1);
      if (e.key === 'Home') goTo(0);
      if (e.key === 'End') goTo(stepCount - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, stepIndex, stepCount]);

  return { stepIndex, goTo, progressRef };
}
