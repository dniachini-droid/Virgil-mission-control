import { RUN } from '../replay/recordedRun.js';
import { CAST, ROLES, type Role } from '../room/cast.js';
import type { DemoState, Report, StationState } from '../room/demo.js';
import { BEATS } from '../room/demo.js';
import { CANDIDATE_ID } from '../screens/candidate.js';
import { ledgerAt } from '../screens/ledger.js';
import { countsFor } from '../screens/stationScreen.js';
import {
  FABRICATOR_COMMITS,
  fabricatorTally,
  KEEPER_FINDINGS,
  keeperTally,
  PROVER_CHECKS,
  proverChecks,
  proverTally,
} from '../screens/tally.js';
import { primaryFor, verdictPrimary } from '../screens/v11/content.js';
import { ACCENT, STATUS } from '../screens/v11/system.js';
import type { Block, Message, Section, Standing } from './blocks.js';
import { SESSION_ACTIONS } from './session.js';

/**
 * **What a window says, and the order it says it in.**
 *
 * The brief's hierarchy, which this file's shape enforces rather than
 * remembers: *"lead with meaning, never with a table. In this order: what
 * happened; what it means; what happens next; what the owner can do; detailed
 * evidence on demand."* So a `WindowDoc` has a `conclusion` of exactly three
 * sentences, then `actions`, then `sections` that are collapsed. There is no
 * field on this type in which a table can be the first thing;
 * `test/window-content-v11.test.ts` also asserts it, at every beat of all
 * three loops, for all four windows.
 *
 * **One source, two levels.** Every number and every state word here comes
 * from the function the in-world screen draws from — `screens/v11/content.ts`
 * for a station's state and its conclusion, `screens/tally.ts` for the counts,
 * `screens/ledger.ts` for the hops, `screens/stationScreen.ts`'s `countsFor`
 * for the lines under a report. The screen is a summary of the window, never a
 * separately written text (`docs/process/PHASE_1_CONVERSATION_INTERFACE.md`
 * §5b, and the V7 defect where two texts written apart disagreed on screen).
 * The prose is authored only here, because the screens carry no prose.
 *
 * **Nothing may name a verdict before that verdict's review has returned.**
 * The scripted demonstration knows how its loop ends; a window that leaked it
 * would teach the owner something untrue about his own system, which is the
 * fault V11 stage 2 found twice on the verdict slab. Every sentence below is
 * therefore selected by the state the demonstration is **in**, never by
 * `state.outcome`, and the test drives all three loops at every half-second and
 * fails if a verdict word appears early.
 *
 * **Voice.** Proportional system type, sentence case, no shouting. Monospace
 * and uppercase are reserved for what is literally a token: a path, a SHA, a
 * command, a candidate state, a verdict. That is a deliberate departure from
 * the in-world screens' voice (`window.css` carries the rule).
 */

export type Agent = 'virgil' | Role;

export const AGENTS: readonly Agent[] = ['virgil', ...ROLES];

/** What a tap opens: a window, and optionally the section it should lead with. */
export interface WindowTarget {
  agent: Agent;
  /** A section id to open on arrival. The three slabs use it. */
  at?: string;
}

export interface Conclusion {
  /** What happened. One line, and never a table. */
  headline: string;
  /**
   * The exact verdict, when one has returned, set as a **token** rather than
   * inside the headline.
   *
   * Found by looking at a frame: *"The review returned PASS WITH NON-BLOCKING
   * FINDINGS"* came out as three lines of 22 px capitals, which is precisely
   * the giant uppercase heading the brief forbids for ordinary content — and
   * the verdict may not be shortened either, because `PASS` names a
   * **different** one of the four. So the headline stays prose and the verdict
   * sits under it in the monospace face this interface reserves for tokens.
   */
  token?: string;
  /** What it means. */
  meaning: string;
  /** What happens next. */
  next: string;
}

/**
 * What the owner can do **here**, which in this build is always a view action:
 * go to an agent, open a section, or leave. §5a, decision 3 and the note under
 * it: *"The three suggested actions act on the view, not on a session: go to
 * the agent concerned, open the evidence, pause. Labelled as what they are."*
 * The session controls are separate, and unavailable (`session.ts`).
 */
export interface Action {
  id: string;
  label: string;
  goes: { kind: 'agent'; agent: Agent; at?: string } | { kind: 'section'; id: string };
}

export interface WindowDoc {
  key: string;
  agent: Agent;
  /** The agent's own name, as a name and not a shout: "Fabricator". */
  name: string;
  /** One short line of who they are. */
  remit: string;
  /** The refined status treatment: a word, a meaning, a colour, a shape. */
  status: { word: string; means: string; tint: string; mark: string };
  /**
   * The quiet progression treatment that replaces `HOP 2 OF 3 · PROVER'S
   * CONSOLE`. Three named steps, the current one lit, in ordinary words.
   */
  progression: { steps: { label: string; state: 'done' | 'active' | 'todo' }[]; label: string };
  /** Minimal context. The candidate, and nothing else. */
  context: string;
  conclusion: Conclusion;
  actions: Action[];
  messages: Message[];
  sections: Section[];
  /**
   * **The recorded-run marking, and it is present only in the replay mode.**
   *
   * Until 9 September this carried a marking in both modes: the replay's
   * *"A recorded run, replayed"* and the scripted mode's amber
   * `Illustrative · not real state`. **The scripted mode's is gone**, on the
   * owner's instruction of that day, and it is not moved, shortened or made
   * quieter — it is removed, and the one place the interface still says so is
   * the `Demo data` chip in the overview chrome (`mobile/MobileRoom.tsx`,
   * `DemoBadge`).
   *
   * The replay's marking stays because it is not the same claim: it says the
   * run **did** happen and every figure is read out of this repository's
   * committed record, which is a statement about provenance rather than about
   * being a demonstration. `undefined` in the scripted mode, and
   * `AgentWindow.tsx` renders nothing at all rather than an empty band.
   */
  honesty?: { title: string; note: string } | undefined;
  /** The agent's own accent, for the header's small portrait. */
  accent: string;
  /** What the small animated head is doing, so the window reacts as work runs. */
  reaction: 'idle' | 'attentive' | 'working' | 'passed' | 'blocked';
}

const HOP_LABELS = ['Build', 'Verify', 'Review'];

const REMIT: Record<Agent, string> = {
  virgil: 'Orchestration. He routes the work and holds it between hops.',
  fabricator: 'Implementation. It builds inside one worktree and reports.',
  prover: 'Verification. It runs the required checks and returns facts.',
  keeper: 'Independent review. It reads the candidate against the constitution.',
};

const NAME: Record<Agent, string> = {
  virgil: 'Virgil',
  fabricator: 'Fabricator',
  prover: 'Prover',
  keeper: 'Keeper',
};

/** The clock label a message carries: the demonstration's own time, never the wall's. */
function stamp(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Which beat a role's station is in, and how long it has been there. */
export function beatOf(state: DemoState, role: Role): { station: StationState; since: number } {
  const station = state.cast[role].station;
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
  return { station, since: Math.max(0, state.seconds - (from[role][station] as number)) };
}

function statusOf(role: Role, state: DemoState) {
  const member = state.cast[role];
  const primary = primaryFor(role, member.station, member.report);
  return {
    word: sentence(primary.word),
    means: sentence(primary.lead),
    tint: STATUS[primary.status],
    mark: primary.mark,
  };
}

/**
 * The screens are set in capitals because they are read across a room; the
 * window is read in the hand. Same words, ordinary case — one function, so a
 * new term cannot arrive in the window shouting.
 *
 * The exceptions are the tokens: a candidate state, a verdict, a path or a SHA
 * keeps its own casing, because it *is* the token.
 */
export function sentence(text: string): string {
  const keep = /^[A-Z][A-Z_ -]*$/.test(text) && TOKENS.has(text);
  if (keep) return text;
  // Every sentence, not only the first. Found by looking: the Prover's own
  // status line came out as "A required check failed. the candidate is
  // refused." because only character zero was raised.
  return text
    .toLowerCase()
    .replace(
      /(^|[.!?]\s+)([a-z])/g,
      (_, lead: string, letter: string) => lead + letter.toUpperCase(),
    );
}

/** The words that stay in capitals because they are vocabulary, not prose. */
const TOKENS = new Set<string>([
  'PASS',
  'PASS WITH NON-BLOCKING FINDINGS',
  'BLOCKED',
  'INSUFFICIENT EVIDENCE',
  'NO VERDICT',
]);

/**
 * **Which hops have happened, from the run ledger itself.**
 *
 * Two frames caught this. A window opened after a verdict read `Nothing in
 * flight` with all three steps dim although two hops had plainly happened, and
 * at the owner gate every step read *not started* — because the demonstration
 * deliberately returns every station to `READY` at the gate ("every agent
 * idle, every screen quiet, one thing lit"), so a station's current state
 * cannot answer *did this hop happen*. **The ledger can**, and it is the
 * surface whose whole rule is that a row is appended when a hop happens and
 * never rewritten. So the pips, the sequence and the historical record all read
 * the same rows and cannot disagree.
 */
function hopsAt(state: DemoState): ({ reported: boolean } | null)[] {
  const rows = ledgerAt(state.seconds, state.outcome);
  return ROLES.map((role) => {
    const row = rows.find((entry) => entry.role === role);
    return row ? { reported: row.report !== null } : null;
  });
}

/** The quiet progression treatment that replaces the technical breadcrumb. */
function progressionOf(state: DemoState, agent: Agent) {
  const holder = state.content.active;
  const index =
    holder === 'Fabricator' ? 0 : holder === 'Prover' ? 1 : holder === 'Keeper' ? 2 : -1;
  const hops = hopsAt(state);
  const steps = ROLES.map((role, i) => ({
    label: HOP_LABELS[i] ?? role,
    state: (hops[i] === null ? 'todo' : hops[i]?.reported ? 'done' : 'active') as
      | 'done'
      | 'active'
      | 'todo',
  }));
  const agentIndex = agent === 'virgil' ? index : ROLES.indexOf(agent);
  const label = state.content.ownerGate
    ? 'Waiting on you'
    : index >= 0
      ? agentIndex === index
        ? `${HOP_LABELS[index]}, now`
        : `${HOP_LABELS[index]} is in flight`
      : hops[2]?.reported
        ? 'Review returned'
        : hops[1]?.reported
          ? 'Verification returned'
          : 'Nothing in flight';
  return { steps, label };
}

function contextOf(state: DemoState): string {
  const id = state.content.candidateId ?? CANDIDATE_ID;
  if (state.content.candidate === null) return 'No candidate in flight';
  return `Candidate ${id} · ${state.content.candidate}`;
}

function honestyOf(state: DemoState): { title: string; note: string } | undefined {
  if (state.mode !== 'replay') return undefined;
  return {
    title: 'A recorded run, replayed',
    note: `The Phase 0 consolidation actually happened and every figure below is read out of this repository's committed record. Candidate ${RUN.mergeSha.slice(0, 7)} is past fact, not live state.`,
  };
}

// ------------------------------------------------------------ the Fabricator

/** The illustrative paths the build touched: one per `FABRICATOR_FILES`. */
export const BUILD_PATHS: readonly { path: string; status: string; plus: number }[] = [
  { path: 'src/world/window/AgentWindow.tsx', status: 'added', plus: 486 },
  { path: 'src/world/window/windowContent.ts', status: 'added', plus: 612 },
  { path: 'src/world/window/window.css', status: 'added', plus: 540 },
  { path: 'src/world/window/blocks.ts', status: 'added', plus: 164 },
  { path: 'src/world/window/session.ts', status: 'added', plus: 118 },
  { path: 'src/world/mobile/MobileRoom.tsx', status: 'modified', plus: 74 },
  { path: 'src/world/screens/v11/bank.ts', status: 'modified', plus: 41 },
  { path: 'test/window-content-v11.test.ts', status: 'added', plus: 288 },
];

/** The illustrative commit subjects: one per `FABRICATOR_COMMITS`. */
export const BUILD_COMMITS: readonly { sha: string; subject: string }[] = [
  { sha: '4d1a9c2', subject: 'The window opens from a character and renders from data' },
  { sha: 'b70e58f', subject: 'The conclusion leads; the evidence expands' },
  { sha: 'e29c014', subject: 'Landscape gets its own cluster scale' },
];

/** The commands the build ran, and what they printed. Illustrative. */
const BUILD_COMMANDS: readonly { command: string; lines: string[]; exit: number }[] = [
  {
    command: 'pnpm --filter mission-control test',
    lines: ['Test Files  27 passed (27)', '     Tests  801 passed (801)'],
    exit: 0,
  },
  {
    command: 'pnpm --filter mission-control build:owner:v11',
    lines: ['vite v8.2.2 building for production...', 'built in 41.02s'],
    exit: 0,
  },
];

function fabricatorDoc(state: DemoState): WindowDoc {
  const { station, since } = beatOf(state, 'fabricator');
  const tally = fabricatorTally(station === 'WORKING' ? since : 100);
  const conclusion: Conclusion =
    station === 'REPORTED'
      ? {
          headline: 'The Fabricator reports the implementation complete',
          meaning:
            'That is a claim, not evidence. It is the candidate state BUILDER_REPORTED_COMPLETE: nothing has been checked and nothing has been reviewed.',
          next: 'The candidate goes to the Prover, which runs the required checks against this exact commit.',
        }
      : station === 'WORKING'
        ? {
            headline: `Implementing the plan — ${tally.files} of ${BUILD_PATHS.length} files, ${tally.commits} of ${FABRICATOR_COMMITS.length} commits`,
            meaning:
              'The work is inside one assigned worktree and inside the permitted paths. Nothing it reports will be evidence.',
            next: 'It commits, pushes and prepares an evidence-complete hand-off to the Prover.',
          }
        : station === 'RECEIVING'
          ? {
              headline: 'Taking the hand-off',
              meaning:
                'The grant names the plan, the permitted paths, the base commit and the expiry. Outside those paths it may not write.',
              next: 'The build begins in the assigned worktree.',
            }
          : {
              headline: 'No work is in flight',
              meaning: 'Nothing has been handed to the Fabricator and no authority grant is open.',
              next: 'Virgil issues a grant before any build starts.',
            };
  const sections: Section[] = [
    {
      id: 'objective',
      title: 'The objective it is working to',
      summary: 'Four steps, from the role definition itself',
      open: station === 'WORKING' || station === 'RECEIVING',
      blocks: [
        {
          kind: 'plan',
          steps: [
            {
              text: 'Implement the approved plan in the permitted paths',
              state: station === 'REPORTED' ? 'done' : station === 'WORKING' ? 'active' : 'todo',
            },
            {
              text: 'Add implementation tests beside the change',
              state: station === 'REPORTED' ? 'done' : tally.files > 4 ? 'active' : 'todo',
            },
            {
              text: 'Commit, push, open a draft pull request',
              state: station === 'REPORTED' ? 'done' : tally.commits > 0 ? 'active' : 'todo',
            },
            {
              text: 'Prepare an evidence-complete hand-off to verification',
              state: station === 'REPORTED' ? 'done' : 'todo',
            },
          ],
        },
        {
          kind: 'markdown',
          markdown:
            'The remit is `.claude/agents/fabricator.md`. It **may not** review its own work, merge, deploy, or write outside the permitted paths.',
        },
      ],
    },
    {
      id: 'files',
      title: `Files changed — ${tally.files} of ${BUILD_PATHS.length}`,
      summary: tally.files === 0 ? 'None yet' : `${tally.files} paths touched so far`,
      blocks: [
        { kind: 'files', rows: BUILD_PATHS.slice(0, tally.files).map((row) => ({ ...row })) },
        ...(tally.files > 0
          ? ([
              {
                kind: 'diff',
                path: BUILD_PATHS[0]?.path ?? '',
                hunk: '@@ the window opens from a character @@',
                lines: [
                  { sign: ' ', text: 'const select = (id: string, to: MobileFocus) => {' },
                  { sign: '-', text: '  setWindow(null);' },
                  { sign: '-', text: '  opening.current = setTimeout(open, OPEN_AFTER_MS);' },
                  { sign: '+', text: '  // One tap does both, concurrently.' },
                  { sign: '+', text: '  setWindow(target);' },
                  { sign: ' ', text: '  setFocus(to);' },
                  { sign: ' ', text: '};' },
                ],
              },
            ] as Block[])
          : []),
      ],
    },
    {
      id: 'activity',
      title: 'Commands and tool activity',
      summary:
        station === 'WORKING'
          ? 'Running now'
          : station === 'REPORTED'
            ? 'Two commands, both exit 0'
            : 'Nothing has run',
      blocks: [
        {
          kind: 'tools',
          rows: [
            { tool: 'Write', detail: BUILD_PATHS[0]?.path ?? '', running: false },
            {
              tool: 'Edit',
              detail: BUILD_PATHS[5]?.path ?? '',
              running: station === 'WORKING' && tally.files < 6,
            },
            {
              tool: 'Bash',
              detail: 'pnpm --filter mission-control test',
              running: station === 'WORKING' && tally.files >= 6,
            },
          ],
        },
        ...BUILD_COMMANDS.slice(0, station === 'REPORTED' ? 2 : tally.files >= 6 ? 1 : 0).map(
          (entry): Block => ({
            kind: 'terminal',
            command: entry.command,
            lines: entry.lines.map((text) => ({ stream: 'out' as const, text })),
            exit: entry.exit,
          }),
        ),
        {
          kind: 'image',
          label: 'p390-window-fabricator.png',
          note: 'A capture the build takes of itself at 390 x 844. The preview frame is laid out here; no image file is embedded in this artifact, and nothing is fetched to fill it.',
          tint: ACCENT.fabricator?.key ?? STATUS.cyan,
        },
      ],
    },
    {
      id: 'decisions',
      title: 'Implementation decisions',
      summary: 'Three, each with the reason it was taken',
      blocks: [
        {
          kind: 'markdown',
          markdown:
            '- The window is **DOM outside the canvas**, so it can render before the camera arrives.\n- Its entry animates `transform` and `opacity` only, because it plays over a camera flight.\n- Landscape gets its own cluster scale rather than inheriting portrait’s.',
        },
        {
          kind: 'code',
          language: 'ts',
          path: 'src/world/screens/v11/bank.ts',
          lines: [
            'export function v11Cluster(',
            "  orientation: ClusterOrientation = 'portrait',",
            '): SlabPlacement[] {',
            '  const c = clusterFor(orientation);',
            '  // …',
            '}',
          ],
        },
      ],
    },
    {
      id: 'candidate',
      title: 'The candidate',
      summary: `${tally.commits} of ${FABRICATOR_COMMITS.length} commits, on one branch`,
      blocks: [
        {
          kind: 'branch',
          branch: 'claude/virgil-mobile-v11',
          base: '2fafac8',
          head: state.content.candidateId ?? CANDIDATE_ID,
          note: 'One branch, no worktrees. A repair produces a new SHA; a reviewed one is never rewritten.',
        },
        { kind: 'commits', rows: BUILD_COMMITS.slice(0, tally.commits).map((row) => ({ ...row })) },
        {
          kind: 'pr',
          title: 'V11 stage 3 — the windows',
          identity: 'draft, unmerged',
          state: 'DRAFT',
          lines: [
            'A draft pull request is where a builder stops. It is not a merge and it is not a review.',
            'Merge is the owner’s alone, in every phase.',
          ],
        },
        {
          kind: 'attachment',
          name: 'candidate-artifact.json',
          note: 'The record a builder hands over. Shown as a reference; no file is read or written by this build.',
        },
      ],
    },
    {
      id: 'report',
      title: 'The completion report',
      summary: station === 'REPORTED' ? 'Submitted, and it is a claim' : 'Not submitted',
      open: station === 'REPORTED',
      blocks: [
        {
          kind: 'facts',
          rows: [
            {
              text: `${tally.files} files changed and ${tally.commits} commits made, as reported by the builder`,
              standing: 'claim' as Standing,
            },
            {
              text: 'The implementation is complete and correct',
              standing: 'claim' as Standing,
            },
            {
              text: 'No check has run against this candidate, and no review has read it',
              standing:
                station === 'REPORTED' ? ('verified' as Standing) : ('unresolved' as Standing),
            },
          ],
        },
        {
          kind: 'note',
          text: 'A builder’s success report is a claim, never evidence. The deterministic checks and the independent review are what would make it a proof.',
        },
      ],
    },
    {
      id: 'handoff',
      title: 'Hand-off to the Prover',
      summary: station === 'REPORTED' ? 'Ready, with the evidence it must carry' : 'Not yet',
      blocks: [
        {
          kind: 'table',
          head: ['What the hand-off carries', 'Value'],
          rows: [
            ['Candidate', state.content.candidateId ?? CANDIDATE_ID],
            ['Base', '2fafac8'],
            ['Required checks', String(PROVER_CHECKS)],
            ['Files changed', String(tally.files)],
            ['Standing', 'A claim of completion'],
          ],
        },
      ],
    },
  ];
  return {
    key: 'fabricator',
    agent: 'fabricator',
    name: NAME.fabricator,
    remit: REMIT.fabricator,
    status: statusOf('fabricator', state),
    progression: progressionOf(state, 'fabricator'),
    context: contextOf(state),
    conclusion,
    actions:
      station === 'REPORTED'
        ? [
            {
              id: 'to-prover',
              label: 'What the Prover made of it',
              goes: { kind: 'agent', agent: 'prover' },
            },
            {
              id: 'open-report',
              label: 'Read the completion report',
              goes: { kind: 'section', id: 'report' },
            },
          ]
        : [
            {
              id: 'open-files',
              label: 'Show the files changed',
              goes: { kind: 'section', id: 'files' },
            },
            {
              id: 'open-activity',
              label: 'Show the tool activity',
              goes: { kind: 'section', id: 'activity' },
            },
          ],
    messages: fabricatorThread(state),
    sections,
    honesty: honestyOf(state),
    accent: ACCENT.fabricator?.key ?? STATUS.cyan,
    reaction: state.cast.fabricator.face,
  };
}

// ----------------------------------------------------------------- the Prover

/** The kinds of check this repository really runs, one per `PROVER_CHECKS`. */
export const CHECK_NAMES: readonly string[] = [
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

/**
 * **The command a check actually is, and its output.** Found by looking at a
 * frame: the conclusion said `unit mission-control returned a failure` while
 * the terminal card under it printed `@virgil/visual-language`, because the
 * card had been authored by hand and the conclusion derived from `tally.ts`'s
 * own failing index. Two texts written apart, disagreeing on screen — the exact
 * defect the owner caught in V7. So the card is derived from the check's own
 * name and there is one source again.
 */
function runOf(name: string): { command: string; file: string } {
  if (name.startsWith('unit ')) {
    const target = name.slice(5);
    const filter = target === 'mission-control' ? 'mission-control' : `@virgil/${target}`;
    return {
      command: `pnpm --filter ${filter} test`,
      file: target === 'mission-control' ? 'test/screen-content-v11.test.ts' : 'src/roles.test.ts',
    };
  }
  if (name.startsWith('typecheck ')) {
    const target = name.slice(10);
    const filter = target === 'mission-control' ? 'mission-control' : `@virgil/${target}`;
    return { command: `pnpm --filter ${filter} typecheck`, file: 'tsconfig.json' };
  }
  if (name === 'biome lint') return { command: 'pnpm biome check .', file: 'biome.json' };
  if (name === 'owner build')
    return { command: 'pnpm build:owner:v11', file: 'owner-build/inline-v11.mjs' };
  if (name === 'owner verify')
    return { command: 'pnpm verify:owner:v11', file: 'e2e/verify-owner-build-v11.ts' };
  if (name === 'committed digests') return { command: 'sha256sum -c *.sha256', file: '*.sha256' };
  return { command: 'pnpm --filter @virgil/knowledge-lint run lint', file: 'knowledge/' };
}

function failureBlock(name: string): Block {
  const run = runOf(name);
  return {
    kind: 'terminal',
    command: run.command,
    lines: [
      { stream: 'out', text: `❯ ${run.file} (1 failed)` },
      { stream: 'err', text: 'AssertionError: expected 300 to be 299' },
      { stream: 'err', text: `  at ${run.file}:118:24` },
    ],
    exit: 1,
  };
}

function couldNotRunBlock(name: string): Block {
  const run = runOf(name);
  return {
    kind: 'terminal',
    command: run.command,
    lines: [
      { stream: 'err', text: `${run.file}: not found — the check did not run` },
      { stream: 'err', text: 'no result was produced, and none is inferred' },
    ],
  };
}

function proverDoc(state: DemoState): WindowDoc {
  const { station, since } = beatOf(state, 'prover');
  const tally = proverTally(station === 'WORKING' ? since : 100, state.outcome);
  const report = state.cast.prover.report;
  const resolved = tally.passed + tally.failed + tally.skipped;
  const failedNames = tally.checks
    .map((check, i) => ({ check, name: CHECK_NAMES[i] ?? `check ${i + 1}` }))
    .filter((entry) => entry.check.state === 'failed')
    .map((entry) => entry.name);
  const skippedNames = tally.checks
    .map((check, i) => ({ check, name: CHECK_NAMES[i] ?? `check ${i + 1}` }))
    .filter((entry) => entry.check.state === 'skipped')
    .map((entry) => entry.name);

  const conclusion: Conclusion =
    station !== 'REPORTED'
      ? station === 'WORKING'
        ? {
            headline: `${resolved} of ${PROVER_CHECKS} required checks have resolved`,
            meaning:
              'A check that has not returned is not a pass. Nothing is decided until every one has resolved.',
            next: 'The Prover returns a verification record: every check, with its result and the time it ran.',
          }
        : station === 'RECEIVING'
          ? {
              headline: 'Taking the candidate for verification',
              meaning:
                'It receives the commit, the required checks and the evidence the builder handed over — which is a claim.',
              next: `The ${PROVER_CHECKS} required checks run against that exact commit.`,
            }
          : {
              headline: 'No candidate is in verification',
              meaning: 'Nothing has been handed to the Prover.',
              next: 'The Fabricator has to report before verification can begin.',
            }
      : report === 'PASS'
        ? {
            headline: `All ${PROVER_CHECKS} required checks passed`,
            meaning: 'No verification failures were found.',
            next: 'The candidate is ready for review. Review is independent of verification, and it has not happened yet.',
          }
        : report === 'BLOCKED'
          ? {
              headline: `${tally.failed} of ${PROVER_CHECKS} required checks failed`,
              meaning: `${failedNames.join(', ')} returned a failure. That is a proven defect, not a missing proof, so the candidate is refused.`,
              next: 'It does not progress to review. A further repair round is the owner’s decision and nothing here can start one.',
            }
          : {
              headline: `${tally.skipped} required check could not run`,
              meaning: `${skippedNames.join(', ')} never ran, so the Prover cannot tell. This is INSUFFICIENT EVIDENCE, and it is not a failure.`,
              next: 'The missing proof has to be produced before any verdict is possible. Virgil waits; he does not refuse.',
            };

  const sections: Section[] = [
    {
      id: 'checks',
      title: `The ${PROVER_CHECKS} required checks`,
      summary:
        station === 'REPORTED'
          ? `${tally.passed} passed · ${tally.failed} failed · ${tally.skipped} could not run`
          : `${resolved} resolved, ${PROVER_CHECKS - resolved} still to return`,
      blocks: [
        {
          kind: 'checks',
          rows: tally.checks.map((check, i) => ({
            name: CHECK_NAMES[i] ?? `check ${i + 1}`,
            state: check.state,
          })),
        },
      ],
    },
    {
      id: 'facts',
      title: 'Verified facts, and claims',
      summary: 'What a check proved, and what was only reported',
      open: station === 'REPORTED',
      blocks: [
        {
          kind: 'facts',
          rows: [
            ...(station === 'REPORTED'
              ? [
                  {
                    text: `${tally.passed} of ${PROVER_CHECKS} required checks ran and passed`,
                    standing: 'verified' as Standing,
                  },
                ]
              : [
                  {
                    text: `${tally.passed} checks have run and passed so far`,
                    standing: 'verified' as Standing,
                  },
                  {
                    text: `${PROVER_CHECKS - resolved} checks have not returned, so nothing is known about them`,
                    standing: 'unresolved' as Standing,
                  },
                ]),
            ...(tally.failed > 0
              ? [
                  {
                    text: `${failedNames.join(', ')} failed, and the failure is reproducible from the record`,
                    standing: 'verified' as Standing,
                  },
                ]
              : []),
            ...(tally.skipped > 0
              ? [
                  {
                    text: `${skippedNames.join(', ')} could not run, so its result is unknown`,
                    standing: 'unresolved' as Standing,
                  },
                ]
              : []),
            {
              text: 'The builder reported the implementation complete',
              standing: 'claim' as Standing,
            },
            {
              text: 'The candidate has been independently reviewed',
              standing:
                state.cast.keeper.station === 'REPORTED'
                  ? ('verified' as Standing)
                  : ('unresolved' as Standing),
            },
          ],
        },
        {
          kind: 'note',
          text: 'A verified fact is one a check produced. A claim is one an agent reported. The two are never merged into a single tone of voice.',
        },
      ],
    },
    ...(tally.failed > 0 || tally.skipped > 0
      ? [
          {
            id: 'failure',
            title:
              tally.failed > 0 ? 'The failure, and its evidence' : 'The check that could not run',
            summary:
              tally.failed > 0
                ? `${failedNames.join(', ')} — the output as it was printed`
                : `${skippedNames.join(', ')} — why it never started`,
            open: true,
            blocks:
              tally.failed > 0
                ? ([
                    failureBlock(failedNames[0] ?? ''),
                    {
                      kind: 'evidence',
                      rows: [
                        { label: 'Check', value: failedNames.join(', '), standing: 'verified' },
                        { label: 'Exit code', value: '1', standing: 'verified' },
                        {
                          label: 'Reproducible',
                          value: 'yes, from the recorded command',
                          standing: 'verified',
                        },
                        { label: 'Blocks progress', value: 'yes', standing: 'verified' },
                      ],
                    },
                  ] as Block[])
                : ([
                    couldNotRunBlock(skippedNames[0] ?? ''),
                    {
                      kind: 'note',
                      text: 'A check that could not run proves nothing either way. Recording it as a pass would be the most dangerous thing this interface could do.',
                    },
                  ] as Block[]),
          } satisfies Section,
        ]
      : []),
    {
      id: 'progress',
      title: 'May the candidate progress?',
      summary:
        station === 'REPORTED'
          ? report === 'PASS'
            ? 'Yes, to review — which is not approval'
            : 'No, it does not progress'
          : 'Not yet decided',
      blocks: [
        {
          kind: 'table',
          head: ['Gate', 'State'],
          rows: [
            ['Every required check resolved', station === 'REPORTED' ? 'yes' : 'no'],
            ['Any failure', tally.failed > 0 ? 'yes' : 'no'],
            ['Any check unable to run', tally.skipped > 0 ? 'yes' : 'no'],
            [
              'May progress to review',
              station === 'REPORTED' && tally.failed === 0 && tally.skipped === 0 ? 'yes' : 'no',
            ],
            ['May merge', 'the owner’s decision alone, in every phase'],
          ],
        },
      ],
    },
    {
      id: 'schedule',
      title: 'Where these numbers come from',
      summary: 'Fixed schedules. No check was run to produce them',
      blocks: [
        {
          kind: 'markdown',
          markdown: `${PROVER_CHECKS} checks, starting ${((proverChecks(state.outcome)[1]?.start ?? 0.56) - (proverChecks(state.outcome)[0]?.start ?? 0.2)).toFixed(2)} s apart, each running about 0.9 s. The names are the kinds of check this repository really runs; the results come from \`screens/tally.ts\`'s fixed schedule.`,
        },
      ],
    },
  ];

  return {
    key: 'prover',
    agent: 'prover',
    name: NAME.prover,
    remit: REMIT.prover,
    status: statusOf('prover', state),
    progression: progressionOf(state, 'prover'),
    context: contextOf(state),
    conclusion,
    actions:
      tally.failed > 0
        ? [
            {
              id: 'open-failure',
              label: 'Show me the failure',
              goes: { kind: 'section', id: 'failure' },
            },
            {
              id: 'open-checks',
              label: 'View all checks',
              goes: { kind: 'section', id: 'checks' },
            },
          ]
        : station === 'REPORTED'
          ? [
              {
                id: 'open-checks',
                label: 'View all checks',
                goes: { kind: 'section', id: 'checks' },
              },
              {
                id: 'to-keeper',
                label: 'Go to the review',
                goes: { kind: 'agent', agent: 'keeper' },
              },
            ]
          : [
              {
                id: 'open-checks',
                label: 'View all checks',
                goes: { kind: 'section', id: 'checks' },
              },
              {
                id: 'open-facts',
                label: 'Facts against claims',
                goes: { kind: 'section', id: 'facts' },
              },
            ],
    messages: proverThread(state),
    sections,
    honesty: honestyOf(state),
    accent: ACCENT.prover?.key ?? STATUS.cyan,
    reaction: state.cast.prover.face,
  };
}

// ----------------------------------------------------------------- the Keeper

/**
 * **The refusals, with their exact reasons.** The brief requires the Keeper's
 * window to carry *"refusals and their exact reasons"*. These are the
 * boundaries `constitution/authority.json` actually protects — its
 * `protectedBoundaries` and `boundaryProtection` — so the reason a refusal
 * gives is the repository's own rule and not a paraphrase.
 */
const REFUSALS: readonly { refused: string; reason: string; authority: string }[] = [
  {
    refused: 'A change under constitution/',
    reason: 'Denied to every session. Only the owner may change the governance layer.',
    authority: 'authority.json · boundaryProtection.sessionDenied',
  },
  {
    refused: 'Filing a decision under docs/decisions/OD-*',
    reason: 'Permitted only on the owner’s own instruction, transcribed verbatim.',
    authority: 'OD-0006',
  },
  {
    refused: 'Editing a record under knowledge/raw/',
    reason: 'Append-only. A raw source record is never edited or deleted.',
    authority: 'CLAUDE.md · hard limits',
  },
  {
    refused: 'Treating a builder’s report as proof',
    reason:
      'A builder’s success report is a claim. Deterministic checks and independent review are the evidence.',
    authority: 'authority.json · virgilProhibitions',
  },
  {
    refused: 'Merging, deploying, or expanding its own authority',
    reason: 'Owner-only in every phase. No interface may become a path to one.',
    authority: 'authority.json · ownerOnlyActions',
  },
];

function keeperDoc(state: DemoState): WindowDoc {
  const { station, since } = beatOf(state, 'keeper');
  const tally = keeperTally(station === 'WORKING' ? since : 100);
  const proverReported = state.cast.prover.station === 'REPORTED';
  const proverRefused = proverReported && state.cast.prover.report !== 'PASS';

  const conclusion: Conclusion =
    station === 'REPORTED'
      ? {
          headline: `The review returned ${tally.findings} findings, none of them blocking`,
          meaning:
            'So the policy’s word for it is PASS WITH NON-BLOCKING FINDINGS, never a bare PASS. The findings persist and stay inspectable.',
          next: 'The candidate becomes eligible to merge. Eligible is not merged: that decision is yours alone.',
        }
      : station === 'WORKING'
        ? {
            headline: `Reading the candidate — ${tally.findings} findings raised so far`,
            meaning:
              'A finding has a stable identity and a severity from the moment it is raised. The review is independent of the build and of verification.',
            next: 'It returns a verdict with every finding attached, whatever the verdict is.',
          }
        : station === 'RECEIVING'
          ? {
              headline: 'Taking the candidate for review',
              meaning:
                'It receives the commit, the verification record and the evidence behind it. It may not modify the candidate.',
              next: 'The review begins, and it is independent of everything that produced the candidate.',
            }
          : proverRefused
            ? {
                headline: 'No review of this candidate exists',
                meaning:
                  'Verification did not clear it, so it was never handed over. An unreviewed candidate is not a passed one.',
                next: 'Nothing is reviewed until a candidate reaches review. That is a refusal to proceed, not an omission.',
              }
            : {
                headline: 'No candidate is in review',
                meaning: 'Nothing has been handed to the Keeper.',
                next: 'A candidate reaches review only after verification clears it.',
              };

  const sections: Section[] = [
    {
      id: 'findings',
      title: `Findings — ${tally.findings} raised, ${tally.blocking} blocking`,
      summary: tally.findings === 0 ? 'None raised' : 'Each with an identity and a severity',
      open: station === 'WORKING' || station === 'REPORTED',
      blocks: [
        {
          kind: 'findings',
          rows: tally.raised.map((finding, i) => ({
            id: `KV-${String(i + 1).padStart(2, '0')}`,
            severity: finding.severity,
            where: `${(finding.line * 100).toFixed(0)}% down the text`,
          })),
        },
        ...(tally.findings === 0
          ? ([{ kind: 'note', text: 'No finding has been raised in this review.' }] as Block[])
          : []),
      ],
    },
    {
      id: 'evidence',
      title: 'Evidence and provenance',
      summary: 'Every figure, and where in the repository it comes from',
      blocks: [
        {
          kind: 'evidence',
          rows: [
            {
              label: 'Candidate',
              value: state.content.candidateId ?? CANDIDATE_ID,
              standing: 'claim',
            },
            {
              label: 'Verification',
              value: proverReported ? `reported by the Prover` : 'not returned',
              standing: proverReported ? 'verified' : 'unresolved',
            },
            {
              label: 'Review independence',
              value: 'absolute; the reviewer cannot modify the candidate',
              standing: 'verified',
            },
            {
              label: 'Findings persist',
              value: 'after a passing verdict, and stay inspectable',
              standing: 'verified',
            },
          ],
        },
        {
          kind: 'table',
          head: ['Figure', 'Source', 'Where'],
          rows: [
            ['The four verdicts', 'authority.json', 'reviewVerdicts'],
            ['The severities', 'agent-contracts', 'common.ts · Severity'],
            ['The candidate states', 'authority.json', 'candidateStates'],
            ['Owner-only actions', 'authority.json', 'ownerOnlyActions'],
          ],
        },
      ],
    },
    {
      id: 'refusals',
      title: 'Refusals, and their exact reasons',
      summary: `${REFUSALS.length} boundaries this role refuses to cross`,
      blocks: [
        {
          kind: 'table',
          head: ['Boundary', 'Reason', 'Authority'],
          rows: REFUSALS.map((entry) => [entry.refused, entry.reason, entry.authority]),
        },
        ...(proverRefused
          ? ([
              {
                kind: 'note',
                text: 'This candidate was not handed to review, and the Keeper has therefore refused nothing about it. The rows above are the boundaries it holds, not events that happened.',
              },
            ] as Block[])
          : []),
      ],
    },
    {
      id: 'authority',
      title: 'Decisions and authority',
      summary: 'Who may decide what, and in which order the documents govern',
      blocks: [
        {
          kind: 'table',
          head: ['Layer', 'What governs'],
          rows: [
            ['1', 'The commission, and the owner’s own decision records'],
            ['2', 'constitution/ — out of bounds to every session'],
            ['3', 'Accepted ADRs'],
            ['4', 'Architecture, art direction, security, testing, process'],
            ['5', 'The wiki, which explains and never overrides'],
          ],
        },
        {
          kind: 'markdown',
          markdown:
            'A session that finds a contradiction **reports it**. It does not resolve it silently.',
        },
      ],
    },
    {
      id: 'history',
      title: 'The historical record',
      summary: 'Every hop of this run, in the order it happened',
      blocks: [
        {
          kind: 'table',
          head: ['Hop', 'Started', 'Reported', 'Returned'],
          rows: ledgerAt(state.seconds, state.outcome).map((row) => [
            sentence(row.label),
            stamp(row.startedAt),
            row.endedAt === null ? '—' : stamp(row.endedAt),
            row.report === null ? 'in flight' : row.report.split('_').join(' '),
          ]),
        },
        {
          kind: 'note',
          text: 'A ledger row is appended when a hop happens and is never rewritten. A hop that did not happen is never shown as one that passed.',
        },
      ],
    },
  ];

  return {
    key: 'keeper',
    agent: 'keeper',
    name: NAME.keeper,
    remit: REMIT.keeper,
    status: statusOf('keeper', state),
    progression: progressionOf(state, 'keeper'),
    context: contextOf(state),
    conclusion,
    actions:
      station === 'REPORTED'
        ? [
            {
              id: 'open-findings',
              label: 'Read the findings',
              goes: { kind: 'section', id: 'findings' },
            },
            {
              id: 'open-evidence',
              label: 'Where this comes from',
              goes: { kind: 'section', id: 'evidence' },
            },
          ]
        : [
            {
              id: 'open-refusals',
              label: 'What it refuses, and why',
              goes: { kind: 'section', id: 'refusals' },
            },
            {
              id: 'open-history',
              label: 'The record so far',
              goes: { kind: 'section', id: 'history' },
            },
          ],
    messages: keeperThread(state),
    sections,
    honesty: honestyOf(state),
    accent: ACCENT.keeper?.key ?? STATUS.violet,
    reaction: state.cast.keeper.face,
  };
}

// ----------------------------------------------------------------- Virgil

/**
 * **The central operating interface.** The brief: *"Virgil's window is the
 * central operating interface of the whole application. He summarises the
 * specialists so the owner need not visit four windows."* And the owner's
 * constraint from §4: *"the user must not have to manage four separate
 * chats."*
 *
 * So his conclusion is the project's own state, and his message names what
 * each specialist did in one paragraph, with view actions under it.
 */
function virgilDoc(state: DemoState, at?: string): WindowDoc {
  const verdict = verdictPrimary(
    state.content.verdict,
    state.content.active,
    state.content.candidate === 'SAFE_TO_MERGE',
  );
  const holder = state.content.active;
  const gate = state.content.ownerGate;
  const verdictWord = state.content.verdict === '—' ? null : verdict.word;
  const conclusion: Conclusion = gate
    ? {
        headline: 'Every merge gate passes. The candidate is eligible and it is not merged.',
        meaning:
          'Eligible means the gates are satisfied. Merge is yours alone, in every phase, and nothing in this interface is a path to one.',
        next: 'Nothing proceeds until you decide.',
      }
    : verdictWord !== null
      ? {
          headline:
            state.content.verdict === 'BLOCKED'
              ? 'The candidate was refused at verification'
              : state.content.verdict === 'INSUFFICIENT_EVIDENCE'
                ? 'The Prover could not reach a conclusion'
                : 'The review has returned its verdict',
          token: verdictWord,
          meaning:
            state.content.verdict === 'BLOCKED'
              ? 'A required check failed, which is a proven defect rather than missing proof. I do not proceed.'
              : state.content.verdict === 'INSUFFICIENT_EVIDENCE'
                ? 'A required check could not run, so nothing has been proved and nothing has been disproved.'
                : 'Findings were raised and none of them blocks, so they are recorded and carried forward rather than closed.',
          next:
            state.content.verdict === 'BLOCKED'
              ? 'I have stopped the candidate. A repair round is your decision; I cannot start one.'
              : state.content.verdict === 'INSUFFICIENT_EVIDENCE'
                ? 'I am waiting for the missing proof. I have not refused, because nothing has been disproved.'
                : 'The candidate carries its findings forward, and they stay inspectable.',
        }
      : holder
        ? {
            headline: `${holder} holds the hop`,
            meaning: `Nothing has been verified and nothing has been reviewed. The candidate is ${state.content.candidate}.`,
            next: 'I hand the candidate on when this hop reports, and not before.',
          }
        : {
            headline: 'No candidate is in flight',
            meaning: 'No hop is open and no grant is issued.',
            next: 'The next candidate begins with a grant naming the worktree, the paths and the expiry.',
          };

  const hops = hopsAt(state);
  const agentRows = ROLES.map((role) => {
    const s = statusOf(role, state);
    return [sentence(CAST[role].label), s.word, s.means];
  });

  const sections: Section[] = [
    {
      id: 'truth',
      title: 'Current project truth',
      summary: `${state.content.candidate ?? 'No candidate'} · ${state.content.verdict === '—' ? 'no verdict' : sentence(verdict.word)}`,
      open: at === 'truth' || at === 'verdict',
      blocks: [
        {
          kind: 'table',
          head: ['What', 'State'],
          rows: [
            ['Candidate', state.content.candidate ?? 'none in flight'],
            ['Identity', state.content.candidateId ?? CANDIDATE_ID],
            ['Verdict', state.content.verdict === '—' ? 'NO VERDICT' : verdict.word],
            ['Holder of the hop', holder ?? 'Virgil'],
            ['Eligible to merge', gate ? 'yes — and not merged' : 'no'],
          ],
        },
        {
          kind: 'evidence',
          rows: [
            {
              label: 'Verification',
              value: countsFor('prover', state.outcome, state.cast.prover.work).join(' · '),
              // **Read from the verdict, not from the station.** At the owner
              // gate every station is deliberately returned to `READY`, so a
              // station's state cannot answer whether verification happened;
              // a returned verdict can, and it is the thing that makes those
              // counts a verified fact rather than an open question.
              standing: (state.content.verdict === '—' ? 'unresolved' : 'verified') as Standing,
            },
          ],
        },
      ],
    },
    {
      id: 'agents',
      title: 'What every agent is doing',
      summary: agentRows.map((row) => `${row[0]}: ${String(row[1]).toLowerCase()}`).join(' · '),
      open: at === 'agents' || at === 'sequence',
      blocks: [{ kind: 'table', head: ['Agent', 'State', 'Means'], rows: agentRows }],
    },
    {
      id: 'sequence',
      title: 'Dependencies and sequencing',
      summary: 'One hop at a time, and each depends on the one before',
      blocks: [
        {
          kind: 'plan',
          steps: ROLES.map((role, i) => ({
            text:
              role === 'fabricator'
                ? 'Fabricator builds, and returns a claim of completion'
                : role === 'prover'
                  ? 'Prover verifies that exact commit, and returns facts'
                  : 'Keeper reviews independently, and returns a verdict with findings',
            state: (hops[i] === null ? 'todo' : hops[i]?.reported ? 'done' : 'active') as
              | 'done'
              | 'active'
              | 'todo',
          })),
        },
        {
          kind: 'markdown',
          markdown:
            'Every role performs **one hop** and does not perform the next role’s work. I hold the work between hops; I do not build, verify, review or adjudicate.',
        },
      ],
    },
    {
      id: 'next',
      title: 'Your next decision',
      summary: gate
        ? 'Whether to merge — and only you may'
        : state.content.verdict === 'BLOCKED'
          ? 'Whether to authorise a repair round'
          : state.content.verdict === 'INSUFFICIENT_EVIDENCE'
            ? 'Whether to produce the missing proof or stop'
            : 'None yet; the work is in flight',
      open: at === 'next' || at === 'candidate' || gate,
      blocks: [
        {
          kind: 'decision',
          question: gate
            ? 'The candidate is eligible to merge. Do you want to merge it?'
            : state.content.verdict === 'BLOCKED'
              ? 'The candidate is refused. Do you want to authorise one repair round?'
              : state.content.verdict === 'INSUFFICIENT_EVIDENCE'
                ? 'A required check could not run. Do you want the missing proof produced?'
                : 'Nothing is waiting on you while a hop is in flight.',
          options: gate
            ? ['Merge — outside this interface, by your own hand', 'Leave it eligible and unmerged']
            : state.content.verdict === 'BLOCKED'
              ? ['Authorise one repair round', 'Stop here', 'Inspect the failure first']
              : state.content.verdict === 'INSUFFICIENT_EVIDENCE'
                ? ['Produce the missing proof', 'Stop here']
                : ['Read what is happening', 'Wait'],
          note: 'Recorded as a question, not offered as a button: no control in this build can act, and merge is yours alone in every phase.',
        },
      ],
    },
    {
      id: 'controls',
      title: 'Orchestration controls',
      summary: `${SESSION_ACTIONS.length} controls, none of them connected`,
      blocks: [
        {
          kind: 'table',
          head: ['Control', 'Would', 'Available'],
          rows: SESSION_ACTIONS.map((action) => [
            action.label,
            action.would,
            action.ownerOnly ? 'no — and owner-only in every phase' : 'no',
          ]),
        },
        {
          kind: 'note',
          text: 'These are declared so the shape of the interface is settled. None is offered as usable, because there is no session behind this build.',
        },
      ],
    },
  ];

  return {
    key: 'virgil',
    agent: 'virgil',
    name: NAME.virgil,
    remit: REMIT.virgil,
    status: {
      /**
       * Found by looking: this read **At rest** on a beat where the review had
       * returned and Virgil was holding the candidate between hops, because it
       * had only the two branches. Holding work is not resting.
       */
      word: gate
        ? 'Waiting on you'
        : holder
          ? sentence(`${holder} holds the hop`)
          : state.content.candidate !== null
            ? 'Holding the candidate'
            : 'At rest',
      means: gate ? 'Every gate passes and the decision is yours.' : sentence(verdict.lead),
      tint: gate ? STATUS.gold : verdict.status === 'red' ? STATUS.red : STATUS[verdict.status],
      mark: gate ? 'passed' : verdict.mark,
    },
    progression: progressionOf(state, 'virgil'),
    context: contextOf(state),
    conclusion,
    actions: virgilActions(state),
    messages: virgilThread(state),
    sections,
    honesty: honestyOf(state),
    accent: ACCENT.virgil?.key ?? STATUS.gold,
    reaction: state.virgilFace,
  };
}

/**
 * The suggested actions under Virgil's message. The owner's example is
 * *"[Show me the failure] [Authorise repair] [Keep everything paused]"*, and
 * §5a settles what they may be: they act on the view. So *"Show me the
 * failure"* goes to the Prover's own failure evidence, and **Authorise repair**
 * is not offered here at all — it is in the controls section, listed as
 * unavailable with its reason, because a button that authorises a repair round
 * is `authority.json`'s `additional_repair_or_rereview_round`, which is
 * owner-only in every phase.
 */
function virgilActions(state: DemoState): Action[] {
  if (state.content.ownerGate) {
    return [
      { id: 'to-keeper', label: 'Read the review', goes: { kind: 'agent', agent: 'keeper' } },
      { id: 'open-next', label: 'What is waiting on me', goes: { kind: 'section', id: 'next' } },
      { id: 'open-controls', label: 'What I cannot do', goes: { kind: 'section', id: 'controls' } },
    ];
  }
  if (state.content.verdict === 'BLOCKED' || state.content.verdict === 'INSUFFICIENT_EVIDENCE') {
    return [
      {
        id: 'to-prover',
        label:
          state.content.verdict === 'BLOCKED' ? 'Show me the failure' : 'Show me the missing check',
        goes: { kind: 'agent', agent: 'prover', at: 'failure' },
      },
      { id: 'open-next', label: 'What is waiting on me', goes: { kind: 'section', id: 'next' } },
      {
        id: 'open-truth',
        label: 'Keep everything as it is',
        goes: { kind: 'section', id: 'truth' },
      },
    ];
  }
  const holder = state.content.active;
  const agent: Agent =
    holder === 'Fabricator'
      ? 'fabricator'
      : holder === 'Prover'
        ? 'prover'
        : holder === 'Keeper'
          ? 'keeper'
          : 'fabricator';
  return [
    { id: 'to-holder', label: `Go to the ${NAME[agent]}`, goes: { kind: 'agent', agent } },
    { id: 'open-agents', label: 'What everyone is doing', goes: { kind: 'section', id: 'agents' } },
    { id: 'open-sequence', label: 'What happens next', goes: { kind: 'section', id: 'sequence' } },
  ];
}

// ------------------------------------------------------------------- threads

/**
 * **The conversation, and why it is derived rather than stored.**
 *
 * The requirement is a *complete persistent conversation history*. In this
 * build the only thing that has a history is the demonstration, so a window's
 * thread is every beat of the current run that has already happened, in order,
 * with the current beat still arriving. That makes it genuinely persistent —
 * close the window and open it again and the same turns are there, plus
 * whatever has happened since — without inventing a transcript nobody wrote.
 * What the reader types is kept separately (`windowStore.ts`) and is appended
 * to whatever this returns.
 */
interface Turn {
  at: number;
  from: Message['from'];
  blocks: Block[];
  /** True while this turn is the one in progress. */
  until?: number;
}

function thread(state: DemoState, key: string, turns: Turn[]): Message[] {
  const out: Message[] = [];
  for (const [index, turn] of turns.entries()) {
    if (state.seconds < turn.at) continue;
    out.push({
      id: `${key}:${index}`,
      from: turn.from,
      at: stamp(turn.at),
      streaming: turn.until !== undefined && state.seconds < turn.until,
      blocks: turn.blocks,
    });
  }
  return out;
}

const para = (text: string): Block => ({ kind: 'para', text });

function fabricatorThread(state: DemoState): Message[] {
  const { station, since } = beatOf(state, 'fabricator');
  const tally = fabricatorTally(station === 'WORKING' ? since : 100);
  return thread(state, 'fabricator', [
    {
      at: BEATS.handoffToFabricator,
      from: 'virgil',
      blocks: [
        para(
          'A grant is open: one worktree, one branch, the permitted paths and an expiry. Implement the approved plan and report when it is done.',
        ),
      ],
    },
    {
      at: BEATS.handoffToFabricator + 0.5,
      from: 'fabricator',
      blocks: [
        para('Taking the hand-off. I will write only inside the permitted paths.'),
        {
          kind: 'markdown',
          markdown:
            '- Base `2fafac8`\n- Branch `claude/virgil-mobile-v11`\n- Tests beside the change',
        },
      ],
    },
    {
      at: BEATS.fabricatorWorking,
      from: 'fabricator',
      until: BEATS.fabricatorReported,
      blocks: [
        para(
          station === 'WORKING'
            ? `Working. ${tally.files} of ${BUILD_PATHS.length} files written, ${tally.commits} of ${FABRICATOR_COMMITS.length} commits made.`
            : `Written ${BUILD_PATHS.length} files across ${FABRICATOR_COMMITS.length} commits.`,
        ),
        { kind: 'files', rows: BUILD_PATHS.slice(0, tally.files).map((row) => ({ ...row })) },
      ],
    },
    {
      at: BEATS.fabricatorReported,
      from: 'fabricator',
      blocks: [
        para(
          'The implementation is complete and the branch is pushed with a draft pull request open. I am reporting a claim, not evidence: nothing here has been checked or reviewed.',
        ),
        {
          kind: 'pr',
          title: 'V11 stage 3 — the windows',
          identity: 'draft, unmerged',
          state: 'DRAFT',
          lines: ['A draft pull request is where a builder stops.'],
        },
      ],
    },
    {
      at: BEATS.handoffToProver,
      from: 'virgil',
      blocks: [
        para(
          'Received. I am handing the candidate to the Prover; a report of completion decides nothing.',
        ),
      ],
    },
  ]);
}

/** Which check the loop's own schedule fails, by name. One source, again. */
function failingCheckName(state: DemoState): string {
  const resolved = proverTally(100, state.outcome);
  const at = resolved.checks.findIndex((check) => check.state === 'failed');
  return at < 0 ? '' : (CHECK_NAMES[at] ?? '');
}

function proverThread(state: DemoState): Message[] {
  const { station, since } = beatOf(state, 'prover');
  const tally = proverTally(station === 'WORKING' ? since : 100, state.outcome);
  const report = state.cast.prover.report;
  const resolved = tally.passed + tally.failed + tally.skipped;
  return thread(state, 'prover', [
    {
      at: BEATS.handoffToProver,
      from: 'virgil',
      blocks: [
        para(
          `The Fabricator reports complete. Run the ${PROVER_CHECKS} required checks against that exact commit and return every result.`,
        ),
      ],
    },
    {
      at: BEATS.proverWorking,
      from: 'prover',
      until: BEATS.proverReported,
      blocks: [
        para(
          station === 'WORKING'
            ? `Running the required checks. ${resolved} of ${PROVER_CHECKS} have resolved; a check that has not returned is not a pass.`
            : `Every required check has resolved.`,
        ),
        {
          kind: 'checks',
          rows: tally.checks.map((check, i) => ({
            name: CHECK_NAMES[i] ?? `check ${i + 1}`,
            state: check.state,
          })),
        },
      ],
    },
    {
      at: BEATS.proverReported,
      from: 'prover',
      blocks:
        report === 'BLOCKED'
          ? [
              para(
                `${tally.failed} required check failed — ${failingCheckName(state)}. That is a proven defect and the candidate does not progress.`,
              ),
              failureBlock(failingCheckName(state)),
            ]
          : report === 'INSUFFICIENT_EVIDENCE'
            ? [
                para(
                  'One required check could not run, so I cannot tell. I am returning INSUFFICIENT EVIDENCE, which is not a failure.',
                ),
              ]
            : [
                para(
                  `All ${PROVER_CHECKS} required checks passed. No verification failures were found; the candidate is ready for review, which is not the same as reviewed.`,
                ),
              ],
    },
  ]);
}

function keeperThread(state: DemoState): Message[] {
  const { station, since } = beatOf(state, 'keeper');
  const tally = keeperTally(station === 'WORKING' ? since : 100);
  return thread(state, 'keeper', [
    {
      at: BEATS.handoffToKeeper,
      from: 'virgil',
      blocks: [
        para(
          'Verification cleared the candidate. Review it independently against the constitution and return a verdict with every finding attached.',
        ),
      ],
    },
    {
      at: BEATS.keeperWorking,
      from: 'keeper',
      until: BEATS.keeperReported,
      blocks: [
        para(
          station === 'WORKING'
            ? `Reading the candidate and its evidence. ${tally.findings} findings raised, ${tally.blocking} of them blocking.`
            : 'The candidate and its evidence have been read.',
        ),
        // The list belongs in the turn only while the findings are arriving;
        // once the review has reported, the `Findings` section carries the
        // collected list and printing both put the same three rows on screen
        // twice, which is what the frame showed.
        ...(station === 'WORKING'
          ? ([
              {
                kind: 'findings',
                rows: tally.raised.map((finding, i) => ({
                  id: `KV-${String(i + 1).padStart(2, '0')}`,
                  severity: finding.severity,
                  where: `${(finding.line * 100).toFixed(0)}% down the text`,
                })),
              },
            ] as Block[])
          : []),
      ],
    },
    {
      at: BEATS.keeperReported,
      from: 'keeper',
      blocks: [
        para(
          `${tally.findings} findings, none of them blocking. The verdict is PASS WITH NON-BLOCKING FINDINGS: the findings persist and stay inspectable, and shortening the verdict would name a different one of the four.`,
        ),
      ],
    },
  ]);
}

/**
 * Virgil's own thread: the summary that means the owner need not visit four
 * windows. Each turn describes what has **already** happened at that beat.
 */
function virgilThread(state: DemoState): Message[] {
  const proverTallyNow = proverTally(100, state.outcome);
  return thread(state, 'virgil', [
    {
      at: 0,
      from: 'virgil',
      blocks: [
        para(
          'Good evening. Nothing is in flight yet. When a candidate opens I will say who holds it, what has been proved, and what is waiting on you.',
        ),
      ],
    },
    {
      at: BEATS.handoffToFabricator,
      from: 'virgil',
      blocks: [
        para(
          'I have handed the work to the Fabricator with a grant naming its worktree, its paths and its expiry.',
        ),
      ],
    },
    {
      at: BEATS.fabricatorReported,
      from: 'virgil',
      blocks: [
        para(
          'The Fabricator reports the implementation complete. That is a claim and I am treating it as one: I am handing the candidate to the Prover.',
        ),
      ],
    },
    {
      at: BEATS.proverWorking,
      from: 'virgil',
      until: BEATS.proverReported,
      blocks: [
        para(
          'The Prover is running the required checks. I will not summarise a verdict that has not returned.',
        ),
      ],
    },
    ...(state.outcome === 'BLOCKED'
      ? [
          {
            at: BEATS.proverReported,
            from: 'virgil' as const,
            blocks: [
              para(
                `The Fabricator completed the implementation. The Prover found ${proverTallyNow.failed} failed check. I have stopped the candidate before review. Would you like to inspect the failure, or is this where we stop?`,
              ),
              {
                kind: 'note' as const,
                text: 'I cannot authorise a repair round. That is owner-only in every phase, and no control here can perform it.',
              },
            ],
          },
        ]
      : []),
    ...(state.outcome === 'INSUFFICIENT_EVIDENCE'
      ? [
          {
            at: BEATS.proverReported,
            from: 'virgil' as const,
            blocks: [
              para(
                'A required check could not run, so the Prover cannot tell. I am not refusing the candidate: nothing has been disproved. I am waiting for the missing proof.',
              ),
            ],
          },
        ]
      : []),
    ...(state.outcome === 'PASS'
      ? [
          {
            at: BEATS.proverReported,
            from: 'virgil' as const,
            blocks: [
              para(
                'Every required check passed. The candidate is ready for review, which is not reviewed, so I am handing it to the Keeper.',
              ),
            ],
          },
          {
            at: BEATS.keeperReported,
            from: 'virgil' as const,
            blocks: [
              para(
                'The review returned PASS WITH NON-BLOCKING FINDINGS. The findings are recorded and carried forward rather than closed.',
              ),
            ],
          },
          {
            at: BEATS.ownerGate,
            from: 'virgil' as const,
            blocks: [
              para(
                'Every merge gate passes. The candidate is eligible and it is not merged — merge is yours alone, in every phase. Nothing proceeds until you decide.',
              ),
              {
                kind: 'decision' as const,
                question: 'The candidate is eligible to merge.',
                options: [
                  'Merge it yourself, outside this interface',
                  'Leave it eligible and unmerged',
                ],
                note: 'Recorded as a question. Nothing here can merge, and nothing here should be able to.',
              },
            ],
          },
        ]
      : []),
  ]);
}

// ------------------------------------------------------------------ the entry

/** The document for a target at the demonstration's current beat. */
export function windowDoc(state: DemoState, target: WindowTarget): WindowDoc {
  if (target.agent === 'virgil') return virgilDoc(state, target.at);
  if (target.agent === 'fabricator') return fabricatorDoc(state);
  if (target.agent === 'prover') return proverDoc(state);
  return keeperDoc(state);
}

/** Which window a ledger row opens: that hop's own agent. */
export function windowForLedgerRow(state: DemoState, row: number): WindowTarget {
  const rows = ledgerAt(state.seconds, state.outcome);
  const found = rows[row];
  return found ? { agent: found.role } : { agent: 'virgil', at: 'agents' };
}

/** Every station report, for the report vocabulary tests. */
export type { Report, StationState };
