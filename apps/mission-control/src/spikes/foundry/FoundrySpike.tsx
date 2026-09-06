import { projectCandidateState, tokens } from '@virgil/visual-language';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Evidence } from '../../ui/Evidence.js';
import { Hud, type StepInfo } from '../../ui/Hud.js';
import { useSequence } from '../../ui/useSequence.js';
import { CameraRig } from '../../world/CameraRig.js';
import { Effects } from '../../world/Effects.js';
import { SpikeShell } from '../SpikeShell.js';
import { FoundryScene } from './FoundryScene.js';
import { cameras, foundrySequence, type RunVariant } from './sequence.js';

export function FoundrySpike() {
  const [params] = useSearchParams();
  const initial = Number(params.get('step') ?? 0);
  const variant: RunVariant = params.get('run') === 'failed' ? 'failed' : 'success';
  const mono = params.get('mono') === '1';
  const steps = useMemo(() => foundrySequence(variant), [variant]);
  const durations = useMemo(() => steps.map((s) => s.durationMs), [steps]);
  return (
    <SpikeShell>
      {(settings, setSettings) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { stepIndex, goTo, progressRef } = useSequence(
          steps.length,
          durations,
          settings.reducedMotion,
          initial,
        );
        const step = steps[stepIndex] ?? steps[0]!;
        const state = projectCandidateState(step.candidateState);
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
        const stepInfos: StepInfo[] = useMemo(
          () =>
            steps.map((s, i) => ({
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
        const headSha = (step.event?.payload as { headSha?: string } | undefined)?.headSha;
        return {
          scene: (
            <>
              <FoundryScene steps={steps} step={stepIndex} progressRef={progressRef} />
              <CameraRig pose={cameras[step.camera]} autoTravel={settings.autoTravel} />
              <Effects mono={mono} />
            </>
          ),
          hud: (
            <Hud
              title={`Orbital Foundry · ${variant === 'failed' ? 'failed-check run' : 'success run'}`}
              settings={settings}
              onSettings={setSettings}
              steps={stepInfos}
              stepIndex={stepIndex}
              onStep={goTo}
              other={{
                label: variant === 'failed' ? 'success run' : 'failed-check run',
                href: variant === 'failed' ? '/spike/foundry' : '/spike/foundry?run=failed',
              }}
              evidence={
                <Evidence
                  heading={`${String(stepIndex).padStart(2, '0')} · ${step.title}`}
                  event={step.event}
                  state={{
                    label: `${state.state} · ${state.form}`,
                    colour: state.colour ?? tokens.palette.starWhite,
                  }}
                  refusal={step.refusal}
                  fields={[
                    ['branch', 'feature/capsule-sha · .worktrees/capsule-sha'],
                    ['candidate', headSha ? `${headSha.slice(0, 12)}…` : 'see event'],
                    [
                      'renderer',
                      settings.softwareRenderer
                        ? 'software (SwiftShader) — not an art judgment'
                        : 'hardware',
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
