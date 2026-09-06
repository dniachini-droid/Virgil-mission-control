import * as THREE from 'three';
import { type Bot, type BotRole, FACE } from '../../characters/index.js';
import { L } from '../../world/foundry/layout.js';
import { type BayState, type CheckId, emptyBayState } from '../../world/foundry/state.js';
import type { FoundryStep } from './sequence.js';

/**
 * Choreography: the only place where a step becomes visible motion. `bayState` folds every step
 * up to the current one into the persistent bay state (progress 1 for past steps, the live
 * progress for the current one). A refused step contributes nothing but the refusal marker.
 * `driveBots` then assigns each character its station, mode and pose from the same fold.
 */
type Apply = (s: BayState, p: number) => void;

const running = (s: BayState, id: CheckId, p: number) => {
  s.checks[id] = { status: 'running', progress: p };
};
const done = (s: BayState, id: CheckId, status: 'passed' | 'failed' | 'skipped', p: number) => {
  s.checks[id] = { status, progress: p };
};

const APPLY: Record<string, Apply> = {
  overview: () => {},
  read: (s, p) => {
    s.read = p;
  },
  search: (s, p) => {
    s.search = p;
  },
  edit: (s, p) => {
    s.edit = p;
  },
  unstaged: (s, p) => {
    s.created = p;
  },
  staged: (s, p) => {
    s.staged = p;
  },
  commit: (s, p) => {
    s.committed = p;
  },
  push: (s, p) => {
    s.push = p;
  },
  pushed: (s, p) => {
    s.pushed = p;
  },
  'handoff-prover': (s, p) => {
    s.laneA = p;
    s.routeOpen = p < 1 ? 'prover' : 'none';
  },
  'received-prover': (s, p) => {
    s.docked = p;
  },
  verification: (s, p) => {
    s.verification = p;
  },
  'checks-static': (s, p) => {
    running(s, 'typecheck', p);
    running(s, 'lint', p);
  },
  'pass-typecheck': (s, p) => done(s, 'typecheck', 'passed', p),
  'pass-lint': (s, p) => done(s, 'lint', 'passed', p),
  'check-unit': (s, p) => running(s, 'unit', p),
  'pass-unit': (s, p) => done(s, 'unit', 'passed', p),
  'fail-unit': (s, p) => done(s, 'unit', 'failed', p),
  'skip-visual': (s, p) => done(s, 'visual', 'skipped', p),
  verified: (s, p) => {
    s.signature = p;
  },
  'verification-failed': (s, p) => {
    s.failed = p;
  },
  quarantined: (s, p) => {
    s.quarantined = p;
  },
  'handoff-keeper': (s, p) => {
    s.laneB = p;
    s.routeOpen = p < 1 ? 'keeper' : 'none';
  },
  'received-keeper': (s, p) => {
    s.review = Math.min(s.review, 0);
    s.receivedKeeper = p;
  },
  review: (s, p) => {
    s.review = p;
  },
  finding: (s, p) => {
    s.finding = p;
  },
  'review-pass': (s, p) => {
    s.verdict = p;
  },
  eligible: (s, p) => {
    s.laneC = Math.min(1, p * 1.6);
    s.eligible = Math.max(0, (p - 0.55) / 0.45);
    s.routeOpen = 'owner';
  },
  tampered: (s, p) => {
    s.refused = p > 0 ? 1 : 0;
    s.routeOpen = 'none';
  },
};

export function bayState(steps: FoundryStep[], index: number, progress: number, into: BayState) {
  const fresh = emptyBayState();
  Object.assign(into, fresh);
  into.checks = fresh.checks;
  for (let i = 0; i <= index && i < steps.length; i++) {
    const st = steps[i]!;
    if (st.refusal) {
      if (i === index) APPLY.tampered?.(into, progress);
      continue;
    }
    const p = i < index ? 1 : Math.min(1, Math.max(0, progress));
    APPLY[st.id]?.(into, p);
  }
  return into;
}

/** Backward-compatible name used by the scene. */
export const choreograph = bayState;

const V = {
  benchFocus: new THREE.Vector3(L.moduleA.x + 0.6, 1.3, L.moduleA.z),
  cradleFocus: new THREE.Vector3(L.cradle.x, 1.6, L.cradle.z),
  pressFocus: new THREE.Vector3(L.press.x, 1.3, L.press.z),
  scannerFocus: new THREE.Vector3(L.scannerDock.x, 1.1, L.scannerDock.z),
  keeperFocus: new THREE.Vector3(L.keeperDock.x, 1.1, L.keeperDock.z),
  pedestalFocus: new THREE.Vector3(L.pedestal.x + 1.2, 2.0, L.pedestal.z),
  airlockFocus: new THREE.Vector3(L.airlock.x, 2.4, L.airlock.z),
  laneAFocus: new THREE.Vector3(2.6, 1.3, 2.4),
  laneBFocus: new THREE.Vector3(10.6, 1.9, -0.2),
};

/** Assign station, mode, pose and face to each character for the current step. */
export function driveBots(
  bots: Record<BotRole, Bot>,
  steps: FoundryStep[],
  index: number,
  progress: number,
  s: BayState,
) {
  const id = steps[index]?.id ?? 'overview';
  const refused = !!steps[index]?.refusal;
  const fab = bots.fabricator;
  const prover = bots.prover;
  const keeper = bots.keeper;
  const virgil = bots.virgil;
  for (const b of [fab, prover, keeper, virgil]) {
    b.faceOverride = null;
    b.intensity = progress;
  }

  // Fabricator: works the bench, cradle and press in turn; returns to the bench once handed off.
  if (['read', 'search', 'edit', 'unstaged'].includes(id)) {
    fab.goal = L.benchStand;
    fab.lookAt = V.benchFocus;
    fab.mode = 'work';
    fab.pose = 'assemble';
    if (id === 'read') fab.faceOverride = FACE.think;
  } else if (id === 'staged') {
    fab.goal = L.cradleStand;
    fab.lookAt = V.cradleFocus;
    fab.mode = 'work';
    fab.pose = 'load';
  } else if (id === 'commit') {
    fab.goal = L.pressStand;
    fab.lookAt = V.pressFocus;
    fab.mode = 'work';
    fab.pose = 'press';
    if (progress > 0.7) fab.faceOverride = FACE.seal;
  } else if (id === 'push' || id === 'pushed') {
    fab.goal = L.pressStand;
    fab.lookAt = V.pressFocus;
    fab.mode = 'work';
    fab.pose = 'assemble';
    if (id === 'pushed' && progress > 0.6) fab.faceOverride = FACE.pass;
  } else if (id === 'handoff-prover') {
    fab.goal = L.pressStand;
    fab.lookAt = V.laneAFocus;
    fab.mode = 'present';
  } else if (refused) {
    fab.goal = fab.pos.clone();
    fab.mode = 'refuse';
  } else if (index > 0) {
    fab.goal = L.benchStand;
    fab.lookAt = s.laneA > 0 ? V.scannerFocus : V.benchFocus;
    fab.mode = s.laneA > 0 ? 'idle' : 'wait';
  } else {
    fab.goal = L.benchStand;
    fab.lookAt = V.benchFocus;
    fab.mode = 'idle';
  }

  // Prover: waits for the lane, then operates the channels; can never touch the sealed candidate.
  const proverWorking = [
    'received-prover',
    'verification',
    'checks-static',
    'pass-typecheck',
    'pass-lint',
    'check-unit',
    'pass-unit',
    'fail-unit',
    'skip-visual',
    'verified',
    'verification-failed',
  ].includes(id);
  prover.goal = L.scannerStand;
  prover.lookAt = s.laneA > 0 && s.laneA < 1 ? V.laneAFocus : V.scannerFocus;
  if (proverWorking) {
    prover.mode = 'work';
    if (id === 'fail-unit' || id === 'verification-failed') prover.faceOverride = FACE.warn;
    if (id === 'verified' && progress > 0.5) prover.faceOverride = FACE.pass;
    if (id === 'received-prover') prover.faceOverride = FACE.focus;
  } else if (id === 'handoff-prover') {
    prover.mode = 'wait';
  } else if (id === 'quarantined') {
    prover.mode = 'wait';
    prover.faceOverride = FACE.warn;
  } else if (refused) {
    prover.mode = 'idle';
  } else {
    prover.mode = 'idle';
  }

  // Keeper: still until the capsule crosses the gap; inspects; never builds or repairs.
  keeper.goal = L.keeperStand;
  keeper.lookAt = s.laneB > 0 && s.laneB < 1 ? V.laneBFocus : V.keeperFocus;
  if (['received-keeper', 'review', 'finding', 'review-pass'].includes(id)) {
    keeper.mode = 'work';
    if (id === 'received-keeper') keeper.faceOverride = FACE.focus;
    if (id === 'review-pass' && progress > 0.5) keeper.faceOverride = FACE.pass;
  } else if (id === 'handoff-keeper') {
    keeper.mode = 'wait';
  } else if (id === 'eligible') {
    keeper.mode = 'idle';
    keeper.faceOverride = FACE.calm;
  } else {
    keeper.mode = 'idle';
  }

  // Virgil: turns toward the activity, opens exactly one route per handoff, presents the key,
  // closes every route on a refusal. Never touches a station.
  virgil.goal = L.virgilStand;
  const focus =
    id === 'eligible'
      ? V.pedestalFocus
      : s.laneB > 0 ||
          ['handoff-keeper', 'received-keeper', 'review', 'finding', 'review-pass'].includes(id)
        ? V.keeperFocus
        : s.laneA > 0 || proverWorking
          ? V.scannerFocus
          : id === 'commit' || id === 'push' || id === 'pushed'
            ? V.pressFocus
            : V.benchFocus;
  virgil.lookAt = refused ? V.airlockFocus : focus;
  if (id === 'handoff-prover' || id === 'handoff-keeper') {
    virgil.mode = 'work';
    virgil.pose = 'route';
  } else if (id === 'eligible') {
    virgil.mode = 'present';
    virgil.faceOverride = progress > 0.55 ? FACE.seal : FACE.route;
  } else if (id === 'quarantined') {
    virgil.mode = 'refuse';
    virgil.faceOverride = FACE.warn;
  } else if (refused) {
    virgil.mode = 'refuse';
  } else {
    virgil.mode = 'idle';
  }
}
