/**
 * What the bay shows. Every field is derived by the choreography from recorded events passed
 * through the animation grammar; stations and characters read it and never invent progress.
 * Values are 0..1 progress of the authenticated motion (1 = persistent visual after it ends).
 */
export type CheckStatus = 'idle' | 'running' | 'passed' | 'failed' | 'skipped';
export interface CheckVis {
  status: CheckStatus;
  progress: number;
}
export type CheckId = 'typecheck' | 'lint' | 'unit' | 'visual';

export interface BayState {
  read: number;
  search: number;
  edit: number;
  created: number;
  staged: number;
  committed: number;
  /** push_started: transmitter charging, beacons out of phase. */
  push: number;
  /** candidate_pushed: beacons phase-locked on remote evidence. */
  pushed: number;
  /** Press → scanner handoff (lane A). */
  laneA: number;
  docked: number;
  verification: number;
  checks: Record<CheckId, CheckVis>;
  /** verification_completed with all required passed. */
  signature: number;
  /** verification_completed with a required failure. */
  failed: number;
  quarantined: number;
  /** Scanner → keeper handoff across the gap (lane B). */
  laneB: number;
  receivedKeeper: number;
  review: number;
  finding: number;
  verdict: number;
  /** Keeper → eligibility pedestal outside the airlock (lane C). */
  laneC: number;
  eligible: number;
  /** A refused animation is displayed: nothing moves, the refusal glyph shows. */
  refused: number;
  routeOpen: 'none' | 'prover' | 'keeper' | 'owner';
}

export function emptyBayState(): BayState {
  const idle = (): CheckVis => ({ status: 'idle', progress: 0 });
  return {
    read: 0,
    search: 0,
    edit: 0,
    created: 0,
    staged: 0,
    committed: 0,
    push: 0,
    pushed: 0,
    laneA: 0,
    docked: 0,
    verification: 0,
    checks: { typecheck: idle(), lint: idle(), unit: idle(), visual: idle() },
    signature: 0,
    failed: 0,
    quarantined: 0,
    laneB: 0,
    receivedKeeper: 0,
    review: 0,
    finding: 0,
    verdict: 0,
    laneC: 0,
    eligible: 0,
    refused: 0,
    routeOpen: 'none',
  };
}
