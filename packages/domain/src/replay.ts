import type { DomainEvent } from '@virgil/agent-contracts';
import { applyEvent } from './reducer.js';
import { initialRunState, type RunState } from './state.js';

export interface ReplayFrame {
  seq: number;
  eventId: string;
  type: string;
  state: RunState;
  accepted: boolean;
  reason?: string;
}

/** Rebuild current state from the append-only log. Facts in; derived state out. */
export function replay(runId: string, events: readonly DomainEvent[]): RunState {
  let state = initialRunState(runId);
  for (const e of events) state = applyEvent(state, e).run;
  return state;
}

/** State as it was immediately after the event with the given seq (timeline scrub). */
export function replayTo(runId: string, events: readonly DomainEvent[], seq: number): RunState {
  return replay(
    runId,
    events.filter((e) => e.seq <= seq),
  );
}

/** Every intermediate frame, for timeline replay UIs: what was believed, which artifact existed, what authority was active. */
export function replayFrames(runId: string, events: readonly DomainEvent[]): ReplayFrame[] {
  const frames: ReplayFrame[] = [];
  let state = initialRunState(runId);
  for (const e of events) {
    const r = applyEvent(state, e);
    state = r.run;
    frames.push({
      seq: e.seq,
      eventId: e.eventId,
      type: e.type,
      state,
      accepted: r.accepted,
      ...(r.reason ? { reason: r.reason } : {}),
    });
  }
  return frames;
}

/** Stable hash-like fingerprint of derived state for determinism tests. */
export function fingerprint(state: RunState): string {
  const { lineage, transitions, invalidTransitions, lastSeq } = state;
  return JSON.stringify({ lastSeq, lineage, transitions, invalidTransitions });
}
