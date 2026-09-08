import type { Role } from '../room/cast.js';
import { CAST, ROLES } from '../room/cast.js';
import { BEATS, type DemoState, type Report, type StationState } from '../room/demo.js';
import { room } from '../room/palette.js';
import { CANDIDATE_ID } from '../screens/candidate.js';
import { ledgerAt } from '../screens/ledger.js';
import { countsFor } from '../screens/stationScreen.js';
import {
  evidenceLines,
  FABRICATOR_COMMITS,
  FABRICATOR_FILES,
  fabricatorTally,
  KEEPER_FINDINGS,
  keeperTally,
  PROVER_CHECKS,
  proverChecks,
  proverTally,
} from '../screens/tally.js';
import { verdictLook } from '../screens/verdicts.js';

/**
 * What the panel says, derived from the demonstration's own state.
 *
 * **One panel, many sources, and the screen is a summary of the panel —
 * never a separately written text.** The owner's rule, recorded in
 * `docs/process/PHASE_1_CONVERSATION_INTERFACE.md` §5b, and the reason it
 * is a rule rather than tidiness: in V7 Virgil's slab said "awaiting
 * review" while the Fabricator was building, because two texts had been
 * written apart and drifted. So every fact this file states comes from the
 * same function the screen draws from — `tally.ts` for the counts,
 * `verdicts.ts` for the verdict's word and colour, `stationScreen.ts`'s
 * own `countsFor` for the lines under a verdict, and the demonstration's
 * `CandidateState` for the state. Nothing here re-states a number.
 * `test/panel.test.ts` fails if any of them disagree.
 *
 * The prose — the lead sentence and the section titles — exists only here,
 * because the screens do not carry prose. That is one level of detail over
 * one source, not two sources.
 *
 * **The prose is authored per station state, and it describes the
 * station and never the screen.** V9 shipped a first version that said
 * *"The Fabricator holds no work. Its console is dark."* while his
 * console was visibly lit and reading `FABRICATOR / READY` in the same
 * frame — two surfaces saying opposite things at the same instant, which
 * is the class of defect the owner caught in V7 and which the panel makes
 * worse rather than better, because prose set in clean HTML is far more
 * believable than a small glowing screen.
 *
 * The screen was not wrong: `READY` is what a station shows for the
 * moment between its report and its picture collapsing (`crt.ts`, 2.4 s),
 * and it is a true word for a station that holds no work. The **panel**
 * was wrong, because it made a claim about the console's picture — a
 * thing it does not own and cannot know. So the prose states the
 * station's own condition and nothing else, and `test/panel.test.ts`
 * holds that at every beat of all three loops for every role: every
 * state has prose, and no state's prose contains a claim that state does
 * not hold.
 *
 * **Every number is illustrative.** They are the demonstration's fixed
 * schedules, and the panel carries `ILLUSTRATIVE · NOT REAL STATE` in a
 * solid amber band directly under its header, on every document, at full
 * width — prominently, because full detail set in clean HTML is more
 * believable than a small glowing screen and the marking therefore matters
 * more here, not less (the same §5b).
 */

/** What the panel can be opened on. */
export type PanelTarget =
  | { kind: 'role'; role: Role }
  | { kind: 'slab'; slab: SlabName }
  | { kind: 'ledger'; row: number };

export type SlabName = 'roles' | 'verdict' | 'candidate';

export interface PanelRow {
  cells: string[];
  /** A cell index rendered as a chip, and the chip's class. */
  tag?: { at: number; kind: string };
}

export interface PanelSection {
  title: string;
  kind: 'lines' | 'table';
  head?: string[];
  rows: PanelRow[];
  /** Takes the whole measure rather than pairing with the next block. */
  wide?: boolean;
}

export interface PanelDoc {
  /** Which screen this document belongs to; the panel's identity. */
  key: string;
  kicker: string;
  title: string;
  state: string;
  tint: string;
  mark: { report: Report; word: string; under: string };
  lead: string;
  sections: PanelSection[];
  evidence: string[];
}

const line = (text: string): PanelRow => ({ cells: [text] });

/**
 * Which beat a role's station is in, and how long it has been there — the
 * same boundaries `demo.ts` uses, read back so the panel's counts are the
 * counts on that agent's screen at that moment and not a second schedule.
 */
export function stationBeat(
  state: DemoState,
  role: Role,
): { station: StationState; since: number } {
  const station = state.cast[role].station;
  const t = state.seconds;
  const from: Record<Role, Record<StationState, number>> = {
    fabricator: {
      READY: 0,
      RECEIVING: BEATS.handoffToFabricator,
      WORKING: BEATS.fabricatorWorking,
      REPORTED: BEATS.fabricatorReported,
    },
    prover: {
      READY: 0,
      RECEIVING: BEATS.handoffToProver,
      WORKING: BEATS.proverWorking,
      REPORTED: BEATS.proverReported,
    },
    keeper: {
      READY: 0,
      RECEIVING: BEATS.handoffToKeeper,
      WORKING: BEATS.keeperWorking,
      REPORTED: BEATS.keeperReported,
    },
  };
  return { station, since: Math.max(0, t - (from[role][station] as number)) };
}

/** The illustrative paths the Fabricator's build touched: one per `FABRICATOR_FILES`. */
export const FABRICATOR_PATHS: readonly { path: string; status: string; plus: number }[] = [
  { path: 'src/world/panel/Panel.tsx', status: 'added', plus: 412 },
  { path: 'src/world/panel/panelContent.ts', status: 'added', plus: 286 },
  { path: 'src/world/panel/panel.css', status: 'added', plus: 318 },
  { path: 'src/world/screens/ledger.ts', status: 'added', plus: 204 },
  { path: 'src/world/screens/draw.ts', status: 'modified', plus: 31 },
  { path: 'src/world/room/VirgilRoom.tsx', status: 'modified', plus: 64 },
  { path: 'src/world/room/closeUp.ts', status: 'modified', plus: 48 },
  { path: 'test/panel.test.ts', status: 'added', plus: 176 },
];

/** The illustrative commit subjects: one per `FABRICATOR_COMMITS`. */
export const FABRICATOR_SUBJECTS: readonly { sha: string; subject: string }[] = [
  { sha: '4d1a9c2', subject: 'The panel opens from a screen and renders from data' },
  { sha: 'b70e58f', subject: 'The ledger appends a row per hop and never rewrites one' },
  { sha: 'e29c014', subject: 'Four display defects, all in the drawing code' },
];

/**
 * The kinds of check this repository really runs, one per
 * `PROVER_CHECKS`, so the schedule and the names cannot fall out of step.
 * `tally.ts` decides which one fails in a blocked loop and which is
 * skipped in an insufficient-evidence one; these are only their names.
 */
export const PROVER_CHECK_NAMES: readonly string[] = [
  'biome lint',
  'typecheck domain',
  'typecheck agent-contracts',
  'typecheck mission-control',
  'unit domain',
  'unit agent-contracts',
  'unit gate-engine',
  'unit knowledge-graph',
  'unit visual-language',
  'unit mission-control',
  'owner build',
  'committed digests',
  'owner verify',
  'mind scan',
];

const SEVERITY_WORD: Record<string, string> = {
  blocking: 'blocking',
  major: 'major',
  minor: 'minor',
  informational: 'informational',
};

/** The plan the Fabricator worked to: `.claude/agents/fabricator.md`'s own remit. */
const FABRICATOR_PLAN = [
  'Implement the approved plan in the permitted paths',
  'Add implementation tests beside the change',
  'Commit, push, open a draft pull request',
  'Prepare an evidence-complete handoff to verification',
];

function stateWords(state: string | null): string {
  return state === null ? 'NO CANDIDATE' : state.split('_').join(' ');
}

function roleDoc(state: DemoState, role: Role): PanelDoc {
  const member = CAST[role];
  const { station, since } = stationBeat(state, role);
  const report = state.cast[role].report;
  const look = verdictLook(report);
  const hop = ROLES.indexOf(role) + 1;
  const tint =
    station === 'RECEIVING'
      ? room.emit.ice
      : station === 'WORKING'
        ? room.warm.amber
        : station === 'REPORTED'
          ? look.tint
          : room.emit.cyan;
  const sections: PanelSection[] = [];
  let lead: string;

  if (role === 'fabricator') {
    const tally = fabricatorTally(station === 'WORKING' ? since : 100);
    lead =
      station === 'REPORTED'
        ? 'The Fabricator implemented the plan inside its assigned worktree and reported complete. A report of completion is a claim, never evidence: the deterministic checks and the independent review are what would make it a proof, and neither has run.'
        : station === 'WORKING'
          ? 'The Fabricator is implementing the approved plan inside its assigned worktree, writing files and committing as it goes. Nothing it reports will be evidence.'
          : station === 'RECEIVING'
            ? 'A grant has been issued and the Fabricator is taking the work: the plan, the permitted paths, the base commit and the expiry.'
            : 'The Fabricator holds no work: nothing has been handed to it, and no grant is open.';
    sections.push({
      title: 'PLAN',
      kind: 'lines',
      rows: FABRICATOR_PLAN.map(line),
    });
    sections.push({
      title: `FILES CHANGED · ${tally.files} OF ${FABRICATOR_PATHS.length}`,
      kind: 'table',
      wide: true,
      head: ['PATH', 'STATUS', '+'],
      rows: FABRICATOR_PATHS.slice(0, tally.files).map((file) => ({
        cells: [file.path, file.status, String(file.plus)],
        tag: { at: 1, kind: file.status },
      })),
    });
    sections.push({
      title: `COMMITS · ${tally.commits} OF ${FABRICATOR_COMMITS.length}`,
      kind: 'table',
      wide: true,
      head: ['SHA', 'SUBJECT'],
      rows: FABRICATOR_SUBJECTS.slice(0, tally.commits).map((commit) => ({
        cells: [commit.sha, commit.subject],
      })),
    });
  } else if (role === 'prover') {
    const tally = proverTally(station === 'WORKING' ? since : 100, state.outcome);
    const schedule = proverChecks(state.outcome);
    lead =
      station === 'REPORTED'
        ? 'Verification ran the required checks against the candidate commit and returned a verdict. The verdict is the checks, not a summary of them: each one below is a fact about a run.'
        : station === 'WORKING'
          ? 'Verification is running the required checks against the candidate commit. Nothing is decided until every one has resolved.'
          : station === 'RECEIVING'
            ? 'The Prover is taking the candidate: the commit, the required checks and the evidence the builder handed over.'
            : 'The Prover holds no work: no candidate has been handed to it for verification.';
    sections.push({
      title: `CHECKS · ${tally.passed + tally.failed + tally.skipped} OF ${PROVER_CHECKS} RESOLVED`,
      kind: 'table',
      wide: true,
      head: ['CHECK', 'RESULT'],
      rows: tally.checks.map((check, i) => ({
        cells: [PROVER_CHECK_NAMES[i] ?? `check ${i + 1}`, check.state],
        tag: { at: 1, kind: check.state },
      })),
    });
    sections.push({
      title: 'THE SCHEDULE THIS DEMONSTRATION USES',
      kind: 'lines',
      rows: [
        line(
          `${PROVER_CHECKS} checks, starting ${schedule[1] ? (schedule[1].start - (schedule[0]?.start ?? 0)).toFixed(2) : '0'} s apart, each running about 0.9 s.`,
        ),
        line('Fixed numbers. No check was run to produce them.'),
      ],
    });
  } else {
    const tally = keeperTally(station === 'WORKING' ? since : 100);
    lead =
      station === 'REPORTED'
        ? 'The review is independent of the build and of verification. It returned findings, each with a severity; none of them blocks, so the policy’s word for the outcome is PASS WITH NON-BLOCKING FINDINGS and never a bare PASS.'
        : station === 'WORKING'
          ? 'The Keeper is reading the candidate against the constitution and raising findings as it goes. A finding has a stable identity and a severity from the moment it is raised.'
          : station === 'RECEIVING'
            ? 'The Keeper is taking the candidate for review: the commit, the verification record and the evidence behind it.'
            : 'The Keeper holds no work: no candidate has been handed to it for review.';
    sections.push({
      title: `FINDINGS · ${tally.findings} OF ${KEEPER_FINDINGS.length} RAISED · ${tally.blocking} BLOCKING`,
      kind: 'table',
      wide: true,
      head: ['ID', 'SEVERITY', 'AT'],
      rows: tally.raised.map((finding, i) => ({
        cells: [
          `KV-${String(i + 1).padStart(2, '0')}`,
          SEVERITY_WORD[finding.severity] ?? finding.severity,
          `${(finding.line * 100).toFixed(0)}% down the text`,
        ],
        tag: { at: 1, kind: finding.severity },
      })),
    });
    sections.push({
      title: 'WHAT THE POLICY REQUIRES OF A VERDICT',
      kind: 'lines',
      rows: [
        line('Every finding has a stable identity and a severity.'),
        line('Non-blocking findings persist and stay inspectable after a passing verdict.'),
        line('A blocked verdict names a proven defect; insufficient evidence names missing proof.'),
      ],
    });
  }

  return {
    key: `role:${role}`,
    kicker: `HOP ${hop} OF ${ROLES.length} · ${member.label.toUpperCase()}'S CONSOLE`,
    title: member.label.toUpperCase(),
    state: stateWords(state.content.candidate),
    tint,
    mark: {
      report,
      word: report === '—' ? station : (look.lines[0] as string),
      under:
        report === '—'
          ? 'NO REPORT YET'
          : report === 'COMPLETE'
            ? 'A CLAIM · NOT EVIDENCE'
            : (look.lines[1] ?? 'A VERDICT'),
    },
    lead,
    sections,
    evidence: countsFor(role, state.outcome),
  };
}

function slabDoc(state: DemoState, slab: SlabName): PanelDoc {
  const look = verdictLook(state.content.verdict);
  if (slab === 'verdict') {
    return {
      key: 'slab:verdict',
      kicker: "VIRGIL'S CENTRE SLAB · VERDICT",
      title: 'VERDICT',
      state: stateWords(state.content.candidate),
      tint: state.content.verdict === '—' ? room.emit.cyan : look.tint,
      mark: {
        report: state.content.verdict,
        word: state.content.verdict === '—' ? 'NO VERDICT' : (look.lines[0] as string),
        under: state.content.verdict === '—' ? 'NONE RETURNED YET' : (look.lines[1] ?? 'A VERDICT'),
      },
      lead:
        state.content.verdict === '—'
          ? 'No verdict has been returned. The slab shows what the candidate is doing instead, in the constitution’s own words, rather than a fixed label that could outlive the beat it describes.'
          : 'A verdict alone is a claim. The deterministic checks beneath it are what make it a proof, and they are the kinds of check this repository really produces.',
      sections: [
        {
          title: 'THE FOUR VERDICTS, AND NOTHING ELSE IS ONE',
          kind: 'lines',
          rows: [
            line('PASS — a whole ring of twelve segments, and a tick.'),
            line(
              'PASS WITH NON-BLOCKING FINDINGS — the same ring, findings riding on it as notches.',
            ),
            line('BLOCKED — the ring broken, every third segment gone, and a cross.'),
            line(
              'INSUFFICIENT EVIDENCE — an outlined ring with a gap, and an empty bracket. Not a failure.',
            ),
          ],
        },
      ],
      evidence: evidenceLines(state.outcome),
    };
  }
  if (slab === 'candidate') {
    return {
      key: 'slab:candidate',
      kicker: "VIRGIL'S RIGHT SLAB · CANDIDATE",
      title: state.content.ownerGate ? 'OWNER' : 'CANDIDATE',
      state: state.content.ownerGate ? 'SAFE TO MERGE' : stateWords(state.content.candidate),
      tint: state.content.ownerGate ? room.surface.goldBright : room.emit.magenta,
      mark: {
        report: '—',
        word: state.content.ownerGate ? 'SAFE TO MERGE' : stateWords(state.content.candidate),
        under: state.content.ownerGate ? 'ELIGIBLE · NOT MERGED' : 'ONE IMMUTABLE COMMIT',
      },
      lead: state.content.ownerGate
        ? 'Every merge gate passes. The candidate is eligible and it is not merged: merge is the owner’s in every phase, and nothing in this interface may become a path to one.'
        : 'A review is of one exact immutable commit. The identity below does not change while judgement proceeds, which is the picture V6 got wrong when it walked a new hex string every 0.7 seconds.',
      sections: [
        {
          title: 'THE STATES THIS DEMONSTRATION PASSES THROUGH',
          kind: 'lines',
          rows: [
            line('BUILDING, then BUILDER REPORTED COMPLETE — a claim.'),
            line('VERIFICATION INCOMPLETE, then READY FOR REVIEW — which is not reviewed.'),
            line('REVIEW IN PROGRESS, then the verdict.'),
            line('SAFE TO MERGE — eligible, not merged.'),
          ],
        },
      ],
      evidence: [`CANDIDATE ${CANDIDATE_ID}`, 'ILLUSTRATIVE · NOT A COMMIT OF THIS REPOSITORY'],
    };
  }
  return {
    key: 'slab:roles',
    kicker: "VIRGIL'S LEFT SLAB · ROLES",
    title: 'ROLES',
    state: state.content.active
      ? `${state.content.active.toUpperCase()} HOLDS THE HOP`
      : 'VIRGIL HOLDS THE HOP',
    tint: state.content.active ? room.warm.amber : room.emit.cyan,
    mark: {
      report: '—',
      word: (state.content.active ?? 'VIRGIL').toUpperCase(),
      under: 'ONE HOP AT A TIME',
    },
    lead: 'Every role performs one hop and does not perform the next role’s work. Virgil holds the work between hops; a grant names the worktree, the branch, the permitted paths and the expiry.',
    sections: [
      {
        title: 'THE THREE HOPS',
        kind: 'table',
        wide: true,
        head: ['ROLE', 'WHAT IT RETURNS'],
        rows: ROLES.map((role) => ({
          cells: [
            CAST[role].label.toUpperCase(),
            role === 'fabricator'
              ? 'a candidate, and a claim of completion'
              : role === 'prover'
                ? 'a verification record, with every check'
                : 'a verdict, with its findings and evidence',
          ],
        })),
      },
    ],
    evidence: ['ONE HOP PER ROLE', 'A BUILDER REPORT IS NOT EVIDENCE'],
  };
}

/**
 * The document for a target at the demonstration's current beat.
 *
 * A ledger row opens **that hop**, which is the owner's decision of
 * 8 September: the row carries shape and colour at distance and the panel
 * carries the whole of it. The row's role comes from the ledger's own
 * derivation, so the row the reader clicked and the document they get are
 * the same hop.
 */
export function panelDoc(state: DemoState, target: PanelTarget): PanelDoc {
  if (target.kind === 'role') return roleDoc(state, target.role);
  if (target.kind === 'slab') return slabDoc(state, target.slab);
  const rows = ledgerAt(state.seconds, state.outcome);
  const row = rows[target.row];
  return row ? roleDoc(state, row.role) : slabDoc(state, 'roles');
}
