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
  virgil: 'He decides who does what, and holds the work between steps.',
  fabricator: 'It writes the code, in its own copy of the project, and reports back.',
  prover: 'It runs every required check and reports what actually happened.',
  keeper: 'It reviews the work on its own, against the project’s rules.',
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
        : `${HOP_LABELS[index]} is under way`
      : hops[2]?.reported
        ? 'The review is back'
        : hops[1]?.reported
          ? 'The checks are back'
          : 'Nothing under way';
  return { steps, label };
}

function contextOf(state: DemoState): string {
  const id = state.content.candidateId ?? CANDIDATE_ID;
  if (state.content.candidate === null) return 'No change under way';
  return `Change ${id} · ${state.content.candidate}`;
}

function honestyOf(state: DemoState): { title: string; note: string } | undefined {
  if (state.mode !== 'replay') return undefined;
  return {
    title: 'A recorded run, replayed',
    note: `The Phase 0 consolidation really happened, and every figure below is read out of this repository's own record. ${RUN.mergeSha.slice(0, 7)} is history, not something happening now.`,
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
          headline: 'The Fabricator says the work is done',
          meaning:
            'That is its word for it, not proof. The project calls this BUILDER_REPORTED_COMPLETE: said to be finished, checked by nobody.',
          next: 'It goes to the Prover next, which runs every check against this exact version.',
        }
      : station === 'WORKING'
        ? {
            headline: `Writing the code — ${tally.files} of ${BUILD_PATHS.length} files, ${tally.commits} of ${FABRICATOR_COMMITS.length} commits`,
            meaning:
              'It can only touch the files it was given. What it says at the end is a report, not proof.',
            next: 'It saves the work, then passes it to the Prover with everything the Prover will need.',
          }
        : station === 'RECEIVING'
          ? {
              headline: 'Taking the work on',
              meaning:
                'It has been told what to do, which files it may touch, which version to start from and when its permission runs out. It cannot write anywhere else.',
              next: 'It starts work in its own copy of the project.',
            }
          : {
              headline: 'Nothing is being built',
              meaning:
                'The Fabricator has not been given anything to do, and it has no permission open.',
              next: 'Virgil sets out the job and its limits before any work starts.',
            };
  const sections: Section[] = [
    {
      id: 'objective',
      title: 'What it is trying to do',
      summary: 'Four steps, taken from its own job description',
      open: station === 'WORKING' || station === 'RECEIVING',
      blocks: [
        {
          kind: 'plan',
          steps: [
            {
              text: 'Write the code, only in the files it was given',
              state: station === 'REPORTED' ? 'done' : station === 'WORKING' ? 'active' : 'todo',
            },
            {
              text: 'Add tests next to the code it wrote',
              state: station === 'REPORTED' ? 'done' : tally.files > 4 ? 'active' : 'todo',
            },
            {
              text: 'Save the work, push it, open a draft pull request',
              state: station === 'REPORTED' ? 'done' : tally.commits > 0 ? 'active' : 'todo',
            },
            {
              text: 'Pass it on with everything the checks will need',
              state: station === 'REPORTED' ? 'done' : 'todo',
            },
          ],
        },
        {
          kind: 'markdown',
          markdown:
            'What it may and may not do is written down in `.claude/agents/fabricator.md`. It **may not** review its own work, merge it, deploy it, or touch a file it was not given.',
        },
      ],
    },
    {
      id: 'files',
      title: `Files changed — ${tally.files} of ${BUILD_PATHS.length}`,
      summary: tally.files === 0 ? 'None yet' : `${tally.files} files touched so far`,
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
          note: 'A picture the build takes of itself at 390 x 844. The frame is laid out here; no image file is built into this app, and nothing is fetched to fill it.',
          tint: ACCENT.fabricator?.key ?? STATUS.cyan,
        },
      ],
    },
    {
      id: 'decisions',
      title: 'Decisions it made while building',
      summary: 'Three, each with the reason',
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
      title: 'The change itself',
      summary: `${tally.commits} of ${FABRICATOR_COMMITS.length} commits, on one branch`,
      blocks: [
        {
          kind: 'branch',
          branch: 'claude/virgil-mobile-v11',
          base: '2fafac8',
          head: state.content.candidateId ?? CANDIDATE_ID,
          note: 'One branch. A fix makes a new commit; a commit that has been reviewed is never rewritten.',
        },
        { kind: 'commits', rows: BUILD_COMMITS.slice(0, tally.commits).map((row) => ({ ...row })) },
        {
          kind: 'pr',
          title: 'V11 stage 3 — the windows',
          identity: 'draft, unmerged',
          state: 'DRAFT',
          lines: [
            'A draft pull request is as far as a builder goes. It has not gone into the project and nobody has reviewed it.',
            'Only you can put it in.',
          ],
        },
        {
          kind: 'attachment',
          name: 'candidate-artifact.json',
          note: 'The record a builder passes on. Shown as an example; this app reads and writes no files.',
        },
      ],
    },
    {
      id: 'report',
      title: 'What the Fabricator reported',
      summary: station === 'REPORTED' ? 'Sent — and it is only its word' : 'Not sent',
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
              text: 'Nothing has been checked and nobody has reviewed it',
              standing:
                station === 'REPORTED' ? ('verified' as Standing) : ('unresolved' as Standing),
            },
          ],
        },
        {
          kind: 'note',
          text: 'A builder saying it worked is only its word. The checks and the review are the evidence.',
        },
      ],
    },
    {
      id: 'handoff',
      title: 'What goes to the Prover',
      summary: station === 'REPORTED' ? 'Ready, with everything it has to carry' : 'Not yet',
      blocks: [
        {
          kind: 'table',
          head: ['What goes with it', 'Value'],
          rows: [
            ['Change', state.content.candidateId ?? CANDIDATE_ID],
            ['Started from', '2fafac8'],
            ['Checks to run', String(PROVER_CHECKS)],
            ['Files changed', String(tally.files)],
            ['What it proves', 'Nothing yet — it is the builder’s word'],
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
              label: 'Read what it reported',
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
              label: 'Show what it ran',
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
            headline: `${resolved} of ${PROVER_CHECKS} checks have finished`,
            meaning:
              'A check that has not finished is not a pass. Nothing is decided until they all have.',
            next: 'It reports back every check, what it found and when it ran.',
          }
        : station === 'RECEIVING'
          ? {
              headline: 'Taking the change in to be checked',
              meaning:
                'It gets the exact version, the list of checks to run, and what the builder said about it. What the builder said proves nothing.',
              next: `All ${PROVER_CHECKS} checks now run against that exact version.`,
            }
          : {
              headline: 'Nothing is being checked',
              meaning: 'The Prover has not been given anything to work on.',
              next: 'The Fabricator has to finish first.',
            }
      : report === 'PASS'
        ? {
            headline: `All ${PROVER_CHECKS} checks passed`,
            meaning: 'The machine found nothing wrong with it.',
            next: 'It can go for review now. Nobody has reviewed it yet — that is a separate step.',
          }
        : report === 'BLOCKED'
          ? {
              headline: `${tally.failed} of ${PROVER_CHECKS} checks failed`,
              meaning: `${failedNames.join(', ')} failed. Something is genuinely wrong, so the change is refused.`,
              next: 'It does not go for review. Whether anyone tries again is your decision, and nothing here can start one.',
            }
          : {
              headline: `${tally.skipped} check could not run`,
              meaning: `${skippedNames.join(', ')} never ran, so nobody knows either way. The project's word for that is INSUFFICIENT EVIDENCE, and it is not the same as a failure.`,
              next: 'That check has to run before anything can be decided. Virgil is waiting; he is not refusing.',
            };

  const sections: Section[] = [
    {
      id: 'checks',
      title: `The ${PROVER_CHECKS} checks it has to run`,
      summary:
        station === 'REPORTED'
          ? `${tally.passed} passed · ${tally.failed} failed · ${tally.skipped} could not run`
          : `${resolved} finished, ${PROVER_CHECKS - resolved} still to come`,
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
      title: 'What is proved, and what is only claimed',
      summary: 'What a check proved, and what somebody merely said',
      open: station === 'REPORTED',
      blocks: [
        {
          kind: 'facts',
          rows: [
            ...(station === 'REPORTED'
              ? [
                  {
                    text: `${tally.passed} of ${PROVER_CHECKS} checks ran and passed`,
                    standing: 'verified' as Standing,
                  },
                ]
              : [
                  {
                    text: `${tally.passed} checks have run and passed so far`,
                    standing: 'verified' as Standing,
                  },
                  {
                    text: `${PROVER_CHECKS - resolved} checks have not finished, so nothing is known about them`,
                    standing: 'unresolved' as Standing,
                  },
                ]),
            ...(tally.failed > 0
              ? [
                  {
                    text: `${failedNames.join(', ')} failed, and the failure can be repeated from the record`,
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
              text: 'The builder said the work is done',
              standing: 'claim' as Standing,
            },
            {
              text: 'Somebody independent has reviewed it',
              standing:
                state.cast.keeper.station === 'REPORTED'
                  ? ('verified' as Standing)
                  : ('unresolved' as Standing),
            },
          ],
        },
        {
          kind: 'note',
          text: 'A fact is something a check produced. A claim is something an agent said. This window never lets the two sound alike.',
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
                          label: 'Can be repeated',
                          value: 'yes, from the command as recorded',
                          standing: 'verified',
                        },
                        { label: 'Stops it going on', value: 'yes', standing: 'verified' },
                      ],
                    },
                  ] as Block[])
                : ([
                    couldNotRunBlock(skippedNames[0] ?? ''),
                    {
                      kind: 'note',
                      text: 'A check that could not run proves nothing either way. Writing it down as a pass would be the worst thing this app could do.',
                    },
                  ] as Block[]),
          } satisfies Section,
        ]
      : []),
    {
      id: 'progress',
      title: 'Can it go on?',
      summary:
        station === 'REPORTED'
          ? report === 'PASS'
            ? 'Yes, to review. Review is not approval.'
            : 'No. It stops here.'
          : 'Not yet decided',
      blocks: [
        {
          kind: 'table',
          head: ['What has to be true', 'Is it?'],
          rows: [
            ['Every check finished', station === 'REPORTED' ? 'yes' : 'no'],
            ['Anything failed', tally.failed > 0 ? 'yes' : 'no'],
            ['Any check unable to run', tally.skipped > 0 ? 'yes' : 'no'],
            [
              'Can go for review',
              station === 'REPORTED' && tally.failed === 0 && tally.skipped === 0 ? 'yes' : 'no',
            ],
            ['Can go into the project', 'your decision alone, always'],
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
              label: 'See every check',
              goes: { kind: 'section', id: 'checks' },
            },
          ]
        : station === 'REPORTED'
          ? [
              {
                id: 'open-checks',
                label: 'See every check',
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
                label: 'See every check',
                goes: { kind: 'section', id: 'checks' },
              },
              {
                id: 'open-facts',
                label: 'What is proved, what is claimed',
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
    reason: 'Barred to every session. Only the owner may change the rules.',
    authority: 'authority.json · boundaryProtection.sessionDenied',
  },
  {
    refused: 'Filing a decision under docs/decisions/OD-*',
    reason: 'Allowed only when the owner says so, written down word for word.',
    authority: 'OD-0006',
  },
  {
    refused: 'Editing a record under knowledge/raw/',
    reason: 'Only ever added to. A source record is never edited or deleted.',
    authority: 'CLAUDE.md · hard limits',
  },
  {
    refused: 'Treating a builder’s report as proof',
    reason:
      'A builder saying it worked is only its word. The checks and the review are the evidence.',
    authority: 'authority.json · virgilProhibitions',
  },
  {
    refused: 'Merging, deploying, or expanding its own authority',
    reason: 'Yours alone, always. Nothing in this app may become a way to do it.',
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
          headline: `The review found ${tally.findings} things, none serious enough to stop it`,
          meaning:
            'The project’s word for that is PASS WITH NON-BLOCKING FINDINGS, not a plain PASS. Everything it found is kept and can still be read.',
          next: 'The change is ready to go into the project. It is waiting on your decision.',
        }
      : station === 'WORKING'
        ? {
            headline: `Reading the change — ${tally.findings} things found so far`,
            meaning:
              'Everything it finds gets a name and a severity the moment it is found. Whoever built and checked this has no part in the review.',
            next: 'It will report a verdict with everything it found attached, whatever the verdict is.',
          }
        : station === 'RECEIVING'
          ? {
              headline: 'Taking the change in to review',
              meaning:
                'It gets the exact version, the check results and the evidence behind them. It cannot change a thing.',
              next: 'The review starts. Nobody who built or checked this has any part in it.',
            }
          : proverRefused
            ? {
                headline: 'There is no review of this change',
                meaning:
                  'The checks did not clear it, so it never got here. Not reviewed is not the same as passed.',
                next: 'Nothing gets reviewed until it gets this far. It was stopped on purpose; nothing was missed.',
              }
            : {
                headline: 'Nothing is being reviewed',
                meaning: 'The Keeper has not been given anything to read.',
                next: 'Work reaches review only after the checks clear it.',
              };

  const sections: Section[] = [
    {
      id: 'findings',
      title: `What the review found — ${tally.findings} so far`,
      summary:
        tally.findings === 0
          ? 'Nothing yet'
          : `${tally.blocking} serious enough to stop it · each one named`,
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
          ? ([{ kind: 'note', text: 'This review has found nothing so far.' }] as Block[])
          : []),
      ],
    },
    {
      id: 'evidence',
      title: 'The evidence, and where it comes from',
      summary: 'Every figure, and the file in this repository it is read from',
      blocks: [
        {
          kind: 'evidence',
          rows: [
            {
              label: 'Which change',
              value: state.content.candidateId ?? CANDIDATE_ID,
              standing: 'claim',
            },
            {
              label: 'Checks',
              value: proverReported ? `reported by the Prover` : 'not back yet',
              standing: proverReported ? 'verified' : 'unresolved',
            },
            {
              label: 'The reviewer stands apart',
              value: 'completely — it cannot change a single file',
              standing: 'verified',
            },
            {
              label: 'What it found is kept',
              value: 'even after a pass, and you can still read it',
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
            ['The states a change can be in', 'authority.json', 'candidateStates'],
            ['Owner-only actions', 'authority.json', 'ownerOnlyActions'],
          ],
        },
      ],
    },
    {
      id: 'refusals',
      title: 'Refusals, and their exact reasons',
      summary: `${REFUSALS.length} lines this role will not cross`,
      blocks: [
        {
          kind: 'table',
          head: ['What it will not do', 'Why', 'Where that is written'],
          rows: REFUSALS.map((entry) => [entry.refused, entry.reason, entry.authority]),
        },
        ...(proverRefused
          ? ([
              {
                kind: 'note',
                text: 'This change never reached review, so the Keeper has refused nothing about it. The rows above are lines it holds, not things that happened.',
              },
            ] as Block[])
          : []),
      ],
    },
    {
      id: 'authority',
      title: 'Who decides what',
      summary: 'Who may decide what, and which document wins when two disagree',
      blocks: [
        {
          kind: 'table',
          head: ['Order', 'What wins'],
          rows: [
            ['1', 'The commission, and the owner’s own written decisions'],
            ['2', 'constitution/ — out of bounds to every session'],
            ['3', 'Design decisions that have been accepted'],
            ['4', 'Architecture, art direction, security, testing, process'],
            ['5', 'The wiki, which explains and never overrules'],
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
      title: 'What has happened so far',
      summary: 'Every step of this run, in the order it happened',
      blocks: [
        {
          kind: 'table',
          head: ['Step', 'Started', 'Reported', 'Result'],
          rows: ledgerAt(state.seconds, state.outcome).map((row) => [
            sentence(row.label),
            stamp(row.startedAt),
            row.endedAt === null ? '—' : stamp(row.endedAt),
            row.report === null ? 'still going' : row.report.split('_').join(' '),
          ]),
        },
        {
          kind: 'note',
          text: 'A row is added when a step happens, and never changed afterwards. A step that did not happen is never shown as one that passed.',
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
              label: 'Read what it found',
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
        headline: 'Everything passed. The change is ready to go into the project.',
        meaning: 'It is waiting on your decision.',
        next: 'You put it in yourself, outside this app. Nothing here can do it for you.',
      }
    : verdictWord !== null
      ? {
          headline:
            state.content.verdict === 'BLOCKED'
              ? 'A check failed, so the change was stopped'
              : state.content.verdict === 'INSUFFICIENT_EVIDENCE'
                ? 'The Prover could not tell'
                : 'The review is back',
          token: verdictWord,
          meaning:
            state.content.verdict === 'BLOCKED'
              ? 'Something is genuinely wrong, not merely unproved. I have stopped it.'
              : state.content.verdict === 'INSUFFICIENT_EVIDENCE'
                ? 'A check could not run, so nothing was proved either way.'
                : 'It found some things, none of them serious enough to stop it. They are written down and kept.',
          next:
            state.content.verdict === 'BLOCKED'
              ? 'Whether anyone tries again is your decision. I cannot start one.'
              : state.content.verdict === 'INSUFFICIENT_EVIDENCE'
                ? 'I am waiting for that check to run. I have not refused it.'
                : 'They stay open, and you can read them at any time.',
        }
      : holder
        ? {
            headline: `${holder} is doing the work`,
            meaning: `Nothing has been checked and nobody has reviewed it. The project's word for where it has got to is ${state.content.candidate}.`,
            next: 'I pass it on when this step reports back, and not before.',
          }
        : {
            headline: 'Nothing is being worked on',
            meaning: 'No work is open and nobody has been given anything to do.',
            next: 'The next job starts with me setting out what to do, which files may be touched, and when permission ends.',
          };

  const hops = hopsAt(state);
  const agentRows = ROLES.map((role) => {
    const s = statusOf(role, state);
    return [sentence(CAST[role].label), s.word, s.means];
  });

  const sections: Section[] = [
    {
      id: 'truth',
      title: 'Where the project stands',
      summary: `${state.content.candidate ?? 'No change'} · ${state.content.verdict === '—' ? 'no verdict' : sentence(verdict.word)}`,
      open: at === 'truth' || at === 'verdict',
      blocks: [
        {
          kind: 'table',
          head: ['What', 'State'],
          rows: [
            ['The change', state.content.candidate ?? 'none under way'],
            ['Which one', state.content.candidateId ?? CANDIDATE_ID],
            ['Verdict', state.content.verdict === '—' ? 'NO VERDICT' : verdict.word],
            ['Doing the work', holder ?? 'Virgil'],
            ['Ready to go into the project', gate ? 'yes' : 'no'],
          ],
        },
        {
          kind: 'evidence',
          rows: [
            {
              label: 'Checks',
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
      title: 'What has to happen, and in what order',
      summary: 'One step at a time, and each one needs the one before it',
      blocks: [
        {
          kind: 'plan',
          steps: ROLES.map((role, i) => ({
            text:
              role === 'fabricator'
                ? 'The Fabricator builds it, and says when it thinks it is done'
                : role === 'prover'
                  ? 'The Prover checks that exact version, and reports what happened'
                  : 'The Keeper reviews it on its own, and reports a verdict with everything it found',
            state: (hops[i] === null ? 'todo' : hops[i]?.reported ? 'done' : 'active') as
              | 'done'
              | 'active'
              | 'todo',
          })),
        },
        {
          kind: 'markdown',
          markdown:
            'Each of them does **one step** and never the next one’s. I hold the work in between; I do not build, check, review or judge.',
        },
      ],
    },
    {
      id: 'next',
      title: 'Your next decision',
      summary: gate
        ? 'Whether to put it in — and only you can'
        : state.content.verdict === 'BLOCKED'
          ? 'Whether to let them try again'
          : state.content.verdict === 'INSUFFICIENT_EVIDENCE'
            ? 'Whether to run the missing check, or stop'
            : 'None yet — the work is still going',
      open: at === 'next' || at === 'candidate' || gate,
      blocks: [
        {
          kind: 'decision',
          question: gate
            ? 'The change is ready to go into the project. Do you want to put it in?'
            : state.content.verdict === 'BLOCKED'
              ? 'The change was refused. Do you want to let them try once more?'
              : state.content.verdict === 'INSUFFICIENT_EVIDENCE'
                ? 'A check could not run. Do you want it run now?'
                : 'Nothing is waiting on you while the work is still going.',
          options: gate
            ? ['Put it in yourself, outside this app', 'Leave it where it is']
            : state.content.verdict === 'BLOCKED'
              ? ['Let them try once more', 'Stop here', 'Look at the failure first']
              : state.content.verdict === 'INSUFFICIENT_EVIDENCE'
                ? ['Run the missing check', 'Stop here']
                : ['Read what is happening', 'Wait'],
          note: 'Written down as a question, not offered as a button. Nothing in this app can act, and putting a change in is yours alone.',
        },
      ],
    },
    {
      id: 'controls',
      title: 'Controls',
      summary: `${SESSION_ACTIONS.length} controls, and none of them works`,
      blocks: [
        {
          kind: 'table',
          head: ['Control', 'What it would do', 'Available'],
          rows: SESSION_ACTIONS.map((action) => [
            action.label,
            action.would,
            action.ownerOnly ? 'no — and yours alone in any case' : 'no',
          ]),
        },
        {
          kind: 'note',
          text: 'They are listed so the shape of the app is settled. None of them works, because there is nothing running behind this build.',
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
          ? sentence(`${holder} is doing the work`)
          : state.content.candidate !== null
            ? 'Holding the change'
            : 'At rest',
      means: gate ? 'Everything passed. The decision is yours.' : sentence(verdict.lead),
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
          'Here is the job. You get your own copy of the project, one branch, the files you may touch, and a time limit. Build it and tell me when it is done.',
        ),
      ],
    },
    {
      at: BEATS.handoffToFabricator + 0.5,
      from: 'fabricator',
      blocks: [
        para('Taking it on. I will only touch the files I was given.'),
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
          'It is built, pushed, and there is a draft pull request open. This is my word for it, not proof: nothing has been checked and nobody has reviewed it.',
        ),
        {
          kind: 'pr',
          title: 'V11 stage 3 — the windows',
          identity: 'draft, unmerged',
          state: 'DRAFT',
          lines: ['A draft pull request is as far as a builder goes.'],
        },
      ],
    },
    {
      at: BEATS.handoffToProver,
      from: 'virgil',
      blocks: [
        para('Got it. I am passing it to the Prover. A builder saying it is done decides nothing.'),
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
          `The Fabricator says it is done. Run all ${PROVER_CHECKS} checks against that exact version and report every result.`,
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
            ? `Running the checks. ${resolved} of ${PROVER_CHECKS} have finished. A check that has not finished is not a pass.`
            : `Every check has finished.`,
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
                `${tally.failed} check failed — ${failingCheckName(state)}. Something is genuinely wrong, so it goes no further.`,
              ),
              failureBlock(failingCheckName(state)),
            ]
          : report === 'INSUFFICIENT_EVIDENCE'
            ? [
                para(
                  'One check could not run, so I cannot tell either way. I am reporting INSUFFICIENT EVIDENCE, which is not the same as a failure.',
                ),
              ]
            : [
                para(
                  `All ${PROVER_CHECKS} checks passed. Nothing failed. It can go for review now — which is not the same as having been reviewed.`,
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
          'The checks cleared it. Review it on your own, against the project’s rules, and report a verdict with everything you find.',
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
            ? `Reading the change and the evidence for it. ${tally.findings} things found so far, ${tally.blocking} of them serious enough to stop it.`
            : 'I have read the change and the evidence for it.',
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
          `${tally.findings} things found, none of them serious enough to stop it. The verdict is PASS WITH NON-BLOCKING FINDINGS. Everything found is written down and stays readable — and the short form, PASS, means something else.`,
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
          'Good evening. Nothing is being worked on yet. When something starts I will tell you who has it, what has been proved, and what is waiting on you.',
        ),
      ],
    },
    {
      at: BEATS.handoffToFabricator,
      from: 'virgil',
      blocks: [
        para(
          'I have given the work to the Fabricator: its own copy of the project, the files it may touch, and a time limit.',
        ),
      ],
    },
    {
      at: BEATS.fabricatorReported,
      from: 'virgil',
      blocks: [
        para(
          'The Fabricator says it is done. That is its word, and I am treating it as its word: it goes to the Prover to be checked.',
        ),
      ],
    },
    {
      at: BEATS.proverWorking,
      from: 'virgil',
      until: BEATS.proverReported,
      blocks: [
        para(
          'The Prover is running the checks. I will not tell you a verdict before one comes back.',
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
                `The Fabricator finished the work. The Prover found ${proverTallyNow.failed} failed check. I have stopped it before review. Do you want to look at the failure, or is this where we stop?`,
              ),
              {
                kind: 'note' as const,
                text: 'I cannot decide to try again. That is yours alone, and nothing here can do it.',
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
                'A check could not run, so the Prover cannot tell. I am not refusing it — nothing was disproved. I am waiting for that check to run.',
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
                'Every check passed. It can go for review — which is not the same as having been reviewed — so I am giving it to the Keeper.',
              ),
            ],
          },
          {
            at: BEATS.keeperReported,
            from: 'virgil' as const,
            blocks: [
              para(
                'The review came back PASS WITH NON-BLOCKING FINDINGS. What it found is written down and stays open, not closed.',
              ),
            ],
          },
          {
            at: BEATS.ownerGate,
            from: 'virgil' as const,
            blocks: [
              para(
                'Everything passed. The change is ready to go into the project, and it is waiting on your decision.',
              ),
              {
                kind: 'decision' as const,
                question: 'The change is ready to go into the project.',
                options: ['Put it in yourself, outside this app', 'Leave it where it is'],
                note: 'Written down as a question. Nothing here can put it in, and nothing here should be able to.',
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
