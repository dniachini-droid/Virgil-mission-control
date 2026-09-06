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
import { cameras, foundryDurations, foundrySteps } from './sequence.js';

export function FoundrySpike() {
  const [params] = useSearchParams();
  const initial = Number(params.get('step') ?? 0);
  return (
    <SpikeShell>
      {(settings, setSettings) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { stepIndex, goTo, progressRef } = useSequence(
          foundrySteps.length,
          foundryDurations,
          settings.reducedMotion,
          initial,
        );
        const step = foundrySteps[stepIndex] ?? foundrySteps[0]!;
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
        const steps: StepInfo[] = useMemo(
          () =>
            foundrySteps.map((s, i) => ({
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
              <FoundryScene step={stepIndex} progressRef={progressRef} />
              <CameraRig pose={cameras[step.camera]} autoTravel={settings.autoTravel} />
              <Effects />
            </>
          ),
          hud: (
            <Hud
              title="Orbital Foundry · spike"
              settings={settings}
              onSettings={setSettings}
              steps={steps}
              stepIndex={stepIndex}
              onStep={goTo}
              other={{ label: 'Mind of Virgil', href: '/spike/mind' }}
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
                    ['project', 'virgil-mission-control · station 1'],
                    ['branch', 'feature/capsule-sha · worktree .worktrees/capsule-sha'],
                    [
                      'candidate',
                      stepIndex >= 6
                        ? `${String((step.event?.payload as { headSha?: string })?.headSha ?? '').slice(0, 12) || 'a1330d5a1122'} (full SHA in Evidence View)`
                        : 'none yet',
                    ],
                    ['grant', 'G-fab-1 · TIER_2 · fabricator'],
                    [
                      'renderer',
                      settings.softwareRenderer
                        ? 'software (SwiftShader) — not a valid art judgment'
                        : 'hardware',
                    ],
                    [
                      'next action',
                      stepIndex < foundrySteps.length - 1
                        ? 'advance to the next recorded event'
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
