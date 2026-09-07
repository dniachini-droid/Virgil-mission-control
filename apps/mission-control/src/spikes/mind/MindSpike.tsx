import { projectEpistemic } from '@virgil/visual-language';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Evidence } from '../../ui/Evidence.js';
import { Hud, type StepInfo } from '../../ui/Hud.js';
import { useSequence } from '../../ui/useSequence.js';
import { CameraRig } from '../../world/CameraRig.js';
import { Effects } from '../../world/Effects.js';
import { SpikeShell } from '../SpikeShell.js';
import { MindScene } from './MindScene.js';
import { cameras, mindDurations, mindSteps } from './sequence.js';

export function MindSpike() {
  const [params] = useSearchParams();
  const initial = Number(params.get('step') ?? 0);
  return (
    <SpikeShell>
      {(settings, setSettings) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { stepIndex, goTo, progressRef } = useSequence(
          mindSteps.length,
          mindDurations,
          settings.reducedMotion,
          initial,
        );
        const step = mindSteps[stepIndex] ?? mindSteps[0]!;
        const v = projectEpistemic(step.epistemic);
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          const w = window as Window & { __spikeReady?: boolean; __spikeStep?: number };
          w.__spikeStep = stepIndex;
          const t = setTimeout(() => {
            w.__spikeReady = true;
          }, 400);
          return () => clearTimeout(t);
        }, [stepIndex]);
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const steps: StepInfo[] = useMemo(
          () =>
            mindSteps.map((s, i) => ({
              id: s.id,
              title: s.title,
              status:
                s.refusal && i === stepIndex
                  ? 'refused'
                  : i < stepIndex
                    ? 'done'
                    : i === stepIndex
                      ? 'current'
                      : 'pending',
            })),
          [stepIndex],
        );
        return {
          scene: (
            <>
              <MindScene step={stepIndex} progressRef={progressRef} />
              <CameraRig pose={cameras[step.camera]} autoTravel={settings.autoTravel} />
              <Effects />
            </>
          ),
          hud: (
            <Hud
              title="The Mind of Virgil · spike"
              settings={settings}
              onSettings={setSettings}
              steps={steps}
              stepIndex={stepIndex}
              onStep={goTo}
              other={{ label: 'Orbital Foundry', href: '/spike/foundry' }}
              evidence={
                <Evidence
                  heading={`${String(stepIndex).padStart(2, '0')} · ${step.title}`}
                  event={step.event}
                  state={{ label: `${v.epistemicClass} · ${v.visual.form}`, colour: `var(--ice)` }}
                  refusal={step.refusal}
                  fields={[
                    ['authority rank', `${v.authorityRank} · stability ${v.visualStability}`],
                    ['source', 'src-run-pass → docs/process run record (canonical path, hash)'],
                    ['compiler', 'knowledge-maintenance/1.0.0'],
                    [
                      'approval',
                      stepIndex >= 8
                        ? 'verification (gate GR-1) · no owner page affected'
                        : 'pending',
                    ],
                    [
                      'renderer',
                      settings.softwareRenderer
                        ? 'software (SwiftShader) — not a valid art judgment'
                        : 'hardware',
                    ],
                    [
                      'next action',
                      stepIndex < mindSteps.length - 1
                        ? 'advance to the next recorded knowledge event'
                        : 'owner reviews the spike on a real GPU',
                    ],
                  ]}
                  note={step.note}
                />
              }
            />
          ),
        };
      }}
    </SpikeShell>
  );
}
