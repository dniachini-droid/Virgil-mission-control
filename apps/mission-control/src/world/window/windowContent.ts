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
import type { Block, CheckState, Message, Section, Standing } from './blocks.js';
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
   * *"A saved example being replayed"* and the scripted mode's amber
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

const HOP_LABELS = ['Build', 'Check', 'Review'];

const REMIT: Record<Agent, string> = {
  virgil:
    'Virgil gives each agent its job, passes the work between them and tells you what is happening.',
  fabricator:
    'The Fabricator writes the code in a safe copy of the project, then says when it has finished.',
  prover: 'The Prover runs every required automated check and reports what happened.',
  keeper: 'The Keeper independently reviews the work against the project’s rules.',
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
    ? 'You need to decide'
    : index >= 0
      ? agentIndex === index
        ? `${HOP_LABELS[index]}, now`
        : `${HOP_LABELS[index]} is under way`
      : hops[2]?.reported
        ? 'The Keeper has finished its review'
        : hops[1]?.reported
          ? 'The Prover has finished the checks'
          : 'No work in progress';
  return { steps, label };
}

function contextOf(state: DemoState): string {
  const id = state.content.candidateId ?? CANDIDATE_ID;
  if (state.content.candidate === null) return 'No code change in progress';
  return `Change ${id} · ${state.content.candidate}`;
}

function honestyOf(state: DemoState): { title: string; note: string } | undefined {
  if (state.mode !== 'replay') return undefined;
  return {
    title: 'A saved example being replayed',
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
  {
    sha: '4d1a9c2',
    subject: 'Select a character to open this window and see what that agent is doing.',
  },
  { sha: 'b70e58f', subject: 'The result appears first. Open the details to see the evidence.' },
  { sha: 'e29c014', subject: 'Landscape mode uses a layout sized for wider screens.' },
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

/**
 * **The window of an agent this app has read nothing about — SA-U-01 and
 * SA-U-02, and it is the worst defect the audit found.**
 *
 * `fabricatorDoc` and `keeperDoc` both open with
 * `tally(station === 'WORKING' ? since : 100)`. A live state's stations are
 * `READY`, never `WORKING`, so `100` is passed — "the scripted build, fully
 * complete" — and the recording's fixtures come back in full. Not on a broken
 * page: **on a healthy live page about a real branch, with a real commit and
 * real checks passing.** Two presses from the world — `TALK TO VIRGIL`, then
 * `Go to the Fabricator` — and the owner reads:
 *
 *  - `Files changed — 8 of 8`, with eight invented paths and `+486` lines;
 *  - a terminal reporting `Tests 801 passed (801)` and `exit 0`;
 *  - `BRANCH claude/virgil-mobile-v11` beside his own real `HEAD`;
 *  - a `DRAFT` pull request that does not exist;
 *  - and, in the Keeper's window, three review findings `KV-01`…`KV-03`.
 *
 * None of it happened. The `BRANCH … HEAD` row is the sharpest of them: his
 * real commit inside a card naming a branch he never chose.
 *
 * `proverDoc` was brought under this rule by `KP7-01` and these two were not,
 * which is the whole of the defect — the same file, the same shape, two windows
 * over. `liveState.ts` refuses to carry a verdict at length and on principle,
 * and then the Keeper's own window listed three findings from a review that
 * never ran.
 *
 * **Why the repair is not "pass `since` instead of `100`".** That would draw
 * `0 of 8` — a different false claim, about a build that was never attempted.
 * The list must be *absent*, not zero. So: no live source, no section.
 */
function nothingReadDoc(
  state: DemoState,
  agent: 'fabricator' | 'keeper',
  about: string,
): WindowDoc {
  const role = agent as Role;
  return {
    key: agent,
    agent,
    name: NAME[agent],
    remit: REMIT[agent],
    status: statusOf(role, state),
    progression: progressionOf(state, agent),
    context: contextOf(state),
    conclusion: {
      headline: `Nothing has been read about ${about}`,
      meaning: `This build reads the branch, the commit and the check results from GitHub, and nothing else. ${about[0]?.toUpperCase()}${about.slice(1)} is not among them, so this screen has nothing to show — which is not the same as nothing having happened.`,
      next: 'A later slice gives this window a real source. Until then it says so rather than drawing the demonstration.',
    },
    actions: [
      {
        id: 'open-facts',
        label: 'What is and is not known',
        goes: { kind: 'section', id: 'facts' },
      },
    ],
    // No scripted dialogue: no agent has said anything about this repository.
    messages: [],
    sections: [
      {
        id: 'facts',
        title: 'What is proven and what is only reported',
        summary: `Nothing about ${about} has been read`,
        open: true,
        blocks: [
          {
            kind: 'facts',
            rows: [
              {
                text: `Whether anything happened here is unknown: this build has no source for ${about}`,
                standing: 'unresolved' as Standing,
              },
              {
                text: 'The branch, the commit and the check results are read from GitHub and are on the other screens',
                standing: 'verified' as Standing,
              },
            ],
          },
          {
            kind: 'note',
            text: 'A check result is evidence. An agent’s statement is a claim. Nothing read is neither, and this screen draws neither.',
          },
        ],
      },
    ],
    accent: ACCENT[agent]?.key ?? STATUS.cyan,
    reaction: state.cast[role].face,
  };
}

function fabricatorDoc(state: DemoState): WindowDoc {
  // SA-U-01. A live page has no source for build activity, so this window says
  // so rather than drawing the recording's eight files and its green terminal.
  if (state.mode === 'live') return nothingReadDoc(state, 'fabricator', 'what was built');
  const { station, since } = beatOf(state, 'fabricator');
  const tally = fabricatorTally(station === 'WORKING' ? since : 100);
  const conclusion: Conclusion =
    station === 'REPORTED'
      ? {
          headline: 'The Fabricator says it has finished the code',
          meaning:
            'BUILDER_REPORTED_COMPLETE — The Fabricator says it has finished. The checks and review have not happened yet.',
          next: 'The Prover will run every required check on this exact version next. You do not need to do anything yet.',
        }
      : station === 'WORKING'
        ? {
            headline: `Writing the code — ${tally.files} of ${BUILD_PATHS.length} files, ${tally.commits} of ${FABRICATOR_COMMITS.length} commits`,
            meaning:
              'The Fabricator can change only the files it was assigned. Its completion report is not proof.',
            next: 'It saves the work, then gives the Prover everything needed to check it.',
          }
        : station === 'RECEIVING'
          ? {
              headline: 'The Fabricator is receiving the task',
              meaning:
                'It receives the task, the files it may change, the version to start from and its deadline. It cannot change other files.',
              next: 'It starts work in its own copy of the project.',
            }
          : {
              headline: 'The Fabricator is not working',
              meaning: 'It has not been given a task, so it cannot change anything.',
              next: 'Virgil defines the task, the files that may be changed and when permission ends before work starts.',
            };
  const sections: Section[] = [
    {
      id: 'objective',
      title: 'What the Fabricator has been asked to do',
      summary: 'Its four steps',
      open: station === 'WORKING' || station === 'RECEIVING',
      blocks: [
        {
          kind: 'plan',
          steps: [
            {
              text: 'Write the code only in the assigned files',
              state: station === 'REPORTED' ? 'done' : station === 'WORKING' ? 'active' : 'todo',
            },
            {
              text: 'Add tests for the code it wrote',
              state: station === 'REPORTED' ? 'done' : tally.files > 4 ? 'active' : 'todo',
            },
            {
              text: 'Save the work and prepare it for checking',
              state: station === 'REPORTED' ? 'done' : tally.commits > 0 ? 'active' : 'todo',
            },
            {
              text: 'Pass it on with everything the checks need',
              state: station === 'REPORTED' ? 'done' : 'todo',
            },
          ],
        },
        {
          kind: 'markdown',
          markdown:
            'Its rules are written in `.claude/agents/fabricator.md`. It cannot check or review its own work, add it to your project, make it available to users, or change other files.',
        },
      ],
    },
    {
      id: 'files',
      title: `Files changed — ${tally.files} of ${BUILD_PATHS.length}`,
      summary: tally.files === 0 ? 'No decisions yet' : `${tally.files} files touched so far`,
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
      title: 'What the Fabricator did',
      summary:
        station === 'WORKING'
          ? 'A command is running now'
          : station === 'REPORTED'
            ? 'Two commands completed successfully'
            : 'No commands have run',
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
          note: 'A preview of the app at iPhone size (390 × 844). This box shows where the screenshot would appear; no image file is loaded.',
          tint: ACCENT.fabricator?.key ?? STATUS.cyan,
        },
      ],
    },
    {
      id: 'decisions',
      title: 'Choices the Fabricator made while working',
      summary: 'Three decisions, each with a reason',
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
      title: 'The code change',
      summary: `${tally.commits} of ${FABRICATOR_COMMITS.length} commits, on one branch`,
      blocks: [
        {
          kind: 'branch',
          branch: 'claude/virgil-mobile-v11',
          base: '2fafac8',
          head: state.content.candidateId ?? CANDIDATE_ID,
          note: 'The Fabricator works in one safe copy of the project. Each fix is saved as a new version. A reviewed version is never altered.',
        },
        { kind: 'commits', rows: BUILD_COMMITS.slice(0, tally.commits).map((row) => ({ ...row })) },
        {
          kind: 'pr',
          title: 'V11 stage 3 — the windows',
          identity: 'Saved and submitted, not added to your project',
          state: 'DRAFT',
          lines: [
            'The Fabricator has saved and submitted its work. The checks and review have not happened yet.',
            'Only you can add it to the project.',
          ],
        },
        {
          kind: 'attachment',
          name: 'candidate-artifact.json',
          note: 'An example of the report the Fabricator sends with its work. This app does not read or change any files.',
        },
      ],
    },
    {
      id: 'report',
      title: 'The Fabricator’s completion report',
      summary:
        station === 'REPORTED'
          ? 'Sent to the Prover — still only a claim'
          : 'Not sent to the Prover',
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
              text: 'The Fabricator says the work is complete and correct',
              standing: 'claim' as Standing,
            },
            {
              text: 'The checks and review have not happened yet',
              standing:
                station === 'REPORTED' ? ('verified' as Standing) : ('unresolved' as Standing),
            },
          ],
        },
        {
          kind: 'note',
          text: 'The Fabricator’s report is a claim. The checks and independent review provide the evidence.',
        },
      ],
    },
    {
      id: 'handoff',
      title: 'What the Prover needs',
      summary: station === 'REPORTED' ? 'Everything the Prover needs is ready' : 'Not ready yet',
      blocks: [
        {
          kind: 'table',
          head: ['Information sent to the Prover', 'Value'],
          rows: [
            ['Exact version being checked', state.content.candidateId ?? CANDIDATE_ID],
            ['Version it started from', '2fafac8'],
            ['Required checks', String(PROVER_CHECKS)],
            ['Files changed', String(tally.files)],
            ['What the checks have proved', 'Nothing yet — only the Fabricator’s report'],
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
              label: 'What the Prover found',
              goes: { kind: 'agent', agent: 'prover' },
            },
            {
              id: 'open-report',
              label: 'Read the Prover’s report',
              goes: { kind: 'section', id: 'report' },
            },
          ]
        : [
            {
              id: 'open-files',
              label: 'View the changed files',
              goes: { kind: 'section', id: 'files' },
            },
            {
              id: 'open-activity',
              label: 'View every check it ran',
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
      { stream: 'err', text: 'The check produced no result, so its outcome is unknown.' },
    ],
  };
}

/**
 * **The Prover's window when the checks are real.**
 *
 * Everything below this line in `proverDoc` is the recording: a fixed schedule
 * of six named checks whose results come from `screens/tally.ts`, drawn because
 * a scripted run has to draw something. When `/api/state` has answered, the
 * window must draw what actually ran instead — and say so, rather than showing
 * the recording's six checks with a live badge above them, which is the exact
 * confusion this build exists to prevent.
 *
 * Three rules it keeps.
 *
 *  - **Only the four words.** A row carries `running`, `passed`, `failed` or
 *    `skipped` (`constitution/authority.json`) or it is not a row. `liveState`
 *    has already refused anything else; nothing here widens that.
 *  - **A check with no result is counted, never drawn.** GitHub reports runs
 *    that were cancelled, that errored in the runner, that finished with no
 *    conclusion at all. None of those is `skipped` — `skipped` is a check that
 *    chose not to run and said so. So they are said in a sentence and left out
 *    of the list, because a list is a claim about each row in it.
 *  - **Where it came from is on the page.** Check runs, workflow runs and commit
 *    statuses are three different questions, and "eight checks passed" means a
 *    different thing from each. The source is named in the section that lists
 *    them, not buried.
 *
 * There is no conclusion drawn about the work from any of this. Checks passing
 * is the Prover's evidence, not the Keeper's verdict, and this window has never
 * been allowed to infer one from the other.
 */
function liveProverDoc(state: DemoState, checks: NonNullable<DemoState['checks']>): WindowDoc {
  const rows = checks.rows;
  const count = (want: CheckState) => rows.filter((row) => row.state === want).length;
  const passed = count('passed');
  const failed = count('failed');
  const running = count('running');
  const skipped = count('skipped');
  const { noResult } = checks;
  const total = rows.length + noResult;
  const named = (want: CheckState) =>
    rows.filter((row) => row.state === want).map((row) => row.name);
  /** `1 check`, `2 checks`. Said the same way everywhere on this page. */
  const checkWord = (n: number) => `${n} check${n === 1 ? '' : 's'}`;
  const noResultLine = `${checkWord(noResult)} returned no result, so nothing is known about ${noResult === 1 ? 'it' : 'them'}`;

  const conclusion: Conclusion =
    total === 0
      ? {
          headline: 'No checks have reported yet',
          meaning: `GitHub's ${checks.source} have nothing to report against this version. That is not a pass and not a failure.`,
          next: 'Nothing is known about this version until a check reports a result.',
        }
      : failed > 0
        ? {
            headline: `${checkWord(failed)} of ${total} failed`,
            meaning: `${named('failed').join(', ')} failed. A check confirming a problem is evidence, and it is the Prover's evidence only — it is not a review.`,
            next: 'You decide whether the agents should fix it and run the checks again.',
          }
        : running > 0
          ? {
              headline: `${checkWord(running)} of ${total} ${running === 1 ? 'is' : 'are'} still running`,
              meaning:
                'A check that has not finished cannot pass or fail. Nothing is known about it either way yet.',
              next: 'The remaining checks finish, and then the result of each is known.',
            }
          : noResult > 0
            ? {
                headline: `${checkWord(passed)} passed, and ${noResultLine}`,
                meaning:
                  'A check that returned no result is not a check that passed, and it is not one that was skipped either. The project has no word for what it did, so this screen does not give it one.',
                next: 'Those checks must produce a result before anything is known about them.',
              }
            : skipped > 0
              ? {
                  /**
                   * **The Keeper's KP7-02.** This branch did not exist, so a row
                   * set of `[passed, skipped]` fell through to *"All 2 checks
                   * passed"* — while the facts block two sections below said the
                   * skipped one never ran. One document, two answers.
                   *
                   * It was unreachable on today's wire, because `state.mjs` maps
                   * GitHub's `skipped` to `noResult` (KP7-03, not repaired here).
                   * That is not a defence and this file has already rejected it
                   * once: the function and this page are separate artefacts that
                   * can ship from different commits, and the slice's own e2e stub
                   * sends a skipped row.
                   */
                  // `0 checks passed, and 1 check did not run` is true and reads
                  // like a machine. When nothing passed, the passing half is
                  // dropped rather than reported as a zero.
                  headline:
                    passed > 0
                      ? `${checkWord(passed)} passed, and ${checkWord(skipped)} did not run`
                      : `${checkWord(skipped)} did not run`,
                  meaning: `${named('skipped').join(', ')} did not run, so ${skipped === 1 ? 'its result is' : 'their results are'} unknown. A check that did not run has not passed.`,
                  next: 'Those checks must run before anything is known about them.',
                }
              : {
                  headline: `All ${checkWord(total)} passed`,
                  meaning: `Every check GitHub's ${checks.source} reported against this version passed. That is the Prover's evidence. It is not a verdict on the work.`,
                  next: 'A review is a separate question, decided by the Keeper against the record.',
                };

  const sections: Section[] = [
    {
      id: 'checks',
      /**
       * **The Keeper's KP7-07.** The title counted every check GitHub named,
       * including the one that returned nothing; the summary beneath it
       * accounted for the four states only. Two numbers one line apart, one
       * short of the other, and nothing between them saying why. The title now
       * counts what the list holds, and the count of the rest rides in the same
       * line as the states rather than in a heading above them.
       */
      title:
        rows.length === 0
          ? 'The checks that reported'
          : `The ${checkWord(rows.length)} that reported`,
      summary:
        rows.length === 0
          ? `Nothing readable from ${checks.source}`
          : `${passed} passed · ${failed} failed · ${running} still running · ${skipped} skipped${noResult > 0 ? ` · ${noResult} with no result` : ''}`,
      open: true,
      blocks: [
        ...(rows.length > 0
          ? ([{ kind: 'checks', rows: rows.map((row) => ({ ...row })) }] as Block[])
          : []),
        ...(noResult > 0
          ? ([
              {
                kind: 'note',
                // Not in the list above, deliberately. A row in that list says
                // what the check did; these are the ones nobody can say that of.
                text: `${noResultLine}. ${noResult === 1 ? 'It is' : 'They are'} counted here and left out of the list, because a list of results is a claim about every line in it.`,
              },
            ] as Block[])
          : []),
        ...(rows.length === 0 && noResult === 0
          ? ([
              {
                kind: 'note',
                text: `GitHub's ${checks.source} reported no checks at all against this version.`,
              },
            ] as Block[])
          : []),
      ],
    },
    {
      id: 'facts',
      title: 'What is proven and what is only reported',
      summary: 'Results from checks, kept separate from what agents said',
      open: failed > 0,
      blocks: [
        {
          kind: 'facts',
          rows: [
            {
              text:
                passed === 0
                  ? 'No check has run and passed'
                  : `${checkWord(passed)} ran and passed against this exact version`,
              standing: passed === 0 ? ('unresolved' as Standing) : ('verified' as Standing),
            },
            ...(failed > 0
              ? [
                  {
                    text: `${named('failed').join(', ')} failed, and ${failed === 1 ? 'it' : 'they'} can be run again from the record`,
                    standing: 'verified' as Standing,
                  },
                ]
              : []),
            ...(running > 0
              ? [
                  {
                    text: `${checkWord(running)} ${running === 1 ? 'has' : 'have'} not finished, so nothing is known about ${running === 1 ? 'it' : 'them'}`,
                    standing: 'unresolved' as Standing,
                  },
                ]
              : []),
            ...(skipped > 0
              ? [
                  {
                    text: `${named('skipped').join(', ')} did not run, so ${skipped === 1 ? 'its result is' : 'their results are'} unknown`,
                    standing: 'unresolved' as Standing,
                  },
                ]
              : []),
            ...(noResult > 0 ? [{ text: noResultLine, standing: 'unresolved' as Standing }] : []),
          ],
        },
        {
          kind: 'note',
          text: 'A check result is evidence. An agent’s statement is a claim. This screen keeps them separate.',
        },
      ],
    },
    {
      id: 'source',
      title: 'Where these results came from',
      summary: `Read from ${checks.source}`,
      blocks: [
        {
          kind: 'markdown',
          markdown: `${total === 0 ? 'Nothing was reported' : `These ${checkWord(total)} were read`} from GitHub's **${checks.source}** for the exact version this page names. Check runs, workflow runs and commit statuses are three different questions, and the same sentence means a different thing from each, so the one that answered is named here rather than left out.\n\nNothing on this screen is a verdict on the work. Checks passing is the Prover's evidence; a review is the Keeper's, and it is decided against the record, not inferred from these.`,
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
    actions: [
      { id: 'open-checks', label: 'View every check', goes: { kind: 'section', id: 'checks' } },
      {
        id: 'open-source',
        label: 'Where these came from',
        goes: { kind: 'section', id: 'source' },
      },
    ],
    /**
     * Empty, and that is the point. The thread beneath the recorded Prover is
     * scripted dialogue; no real agent has said anything about these checks, so
     * this window shows no messages rather than the recording's.
     */
    messages: [],
    sections,
    accent: ACCENT.prover?.key ?? STATUS.cyan,
    reaction: state.cast.prover.face,
  };
}

/**
 * **The Prover's window when the checks were not read — the Keeper's KP7-01.**
 *
 * The brief this slice was built to says it in its own words: *"It draws nothing
 * when nothing was read. If the checks cannot be fetched, the window says they
 * were not read — not zero, not empty, not `skipped`."* The first build of the
 * slice did not do that. `checksOf` returns `null` when GitHub refused every
 * source — a token without the scope, a rate limit, a 5xx — and `proverDoc`
 * guarded on truthiness alone, so a **live** page fell through to the recorded
 * document and drew the recording's fourteen invented checks under the summary
 * `14 finished, 0 still to come`, with `14 checks have run and passed so far`
 * marked `verified`.
 *
 * Two things make that the worst defect this project can ship. A fixture from
 * `screens/tally.ts` was presented as evidence on the one surface whose entire
 * subject is the difference between evidence and a claim. And the badge on the
 * same page said, correctly, *"The check results could not be read this time, so
 * none are shown — not zero, which would be a different claim"* — so the page
 * contradicted itself and the false half was the larger, more prominent one.
 *
 * The comments the first build put in this file asserted the opposite of what it
 * did — *"not a fallback the live path may quietly borrow from"* — which is the
 * same species of artefact as a comment asserting a guard that does not exist.
 * They are corrected, not deleted.
 *
 * **How the three cases are told apart**, and why no `state.mode` test is needed:
 * `demoAt` never sets `checks`, so the recording and the replay have it
 * `undefined`. `stateFromAnswer` always sets it, so a live state has it `null`
 * when nothing was read and an object when something was. `exactOptionalPropertyTypes`
 * is on, which is what makes absent and `null` two different claims rather than
 * one — this is the case that repays that setting.
 */
function unreadProverDoc(state: DemoState): WindowDoc {
  const why = state.checksReason;
  return {
    key: 'prover',
    agent: 'prover',
    name: NAME.prover,
    remit: REMIT.prover,
    status: statusOf('prover', state),
    progression: progressionOf(state, 'prover'),
    context: contextOf(state),
    conclusion: {
      headline: 'The check results were not read',
      // Not "no checks ran". Nobody knows whether any ran; what is known is that
      // the question could not be asked. Those are different facts and the
      // distinction is the whole of this window.
      meaning:
        'GitHub could not be asked about the checks on this version, so nothing is known about them — which is not the same as none having run, and not the same as any of them having passed or failed.',
      next: 'Nothing here can say what the checks did until they can be read.',
    },
    actions: [
      { id: 'open-why', label: 'Why they were not read', goes: { kind: 'section', id: 'why' } },
    ],
    messages: [],
    sections: [
      {
        id: 'why',
        title: 'Why nothing is listed',
        summary: 'The results could not be read this time',
        open: true,
        blocks: [
          {
            kind: 'note',
            // The badge's own sentence, deliberately word for word: two surfaces
            // on one page describing one fact should not describe it twice in
            // two vocabularies.
            text: 'The check results could not be read this time, so none are shown — not zero, which would be a different claim.',
          },
          ...(typeof why === 'string' && why.length > 0
            ? ([{ kind: 'evidence', rows: [{ label: 'What was tried', value: why }] }] as Block[])
            : ([
                {
                  kind: 'note',
                  text: 'No reason came back with the answer, so this screen cannot say which source refused or why.',
                },
              ] as Block[])),
        ],
      },
      {
        id: 'facts',
        title: 'What is proven and what is only reported',
        summary: 'Nothing about the checks is proven, because none were read',
        blocks: [
          {
            kind: 'facts',
            rows: [
              {
                text: 'Whether any check ran on this version is unknown',
                standing: 'unresolved' as Standing,
              },
              {
                text: 'No check result has been read, so none can be evidence of anything',
                standing: 'unresolved' as Standing,
              },
            ],
          },
          {
            kind: 'note',
            text: 'A check result is evidence. An agent’s statement is a claim. A result nobody could read is neither.',
          },
        ],
      },
    ],
    accent: ACCENT.prover?.key ?? STATUS.cyan,
    reaction: state.cast.prover.face,
  };
}

function proverDoc(state: DemoState): WindowDoc {
  // Real checks answer the question this window asks, so they answer it.
  if (state.checks) return liveProverDoc(state, state.checks);
  /**
   * **`null` is not `undefined` here, and the Keeper's KP7-01 is the whole
   * reason.** Absent means the recording, which draws its own six. `null` means
   * a live answer whose checks could not be read, and the recording is not a
   * fallback the live path may borrow from — which is what the comment that
   * used to stand here claimed while the code beneath it did exactly that.
   */
  if (state.checks === null) return unreadProverDoc(state);
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
              'A check that has not finished cannot pass or fail. The work waits until every required check has a result.',
            next: 'The Prover reports the result and evidence for every check, including when it ran.',
          }
        : station === 'RECEIVING'
          ? {
              headline: 'The Prover is receiving the work',
              meaning:
                'The Prover receives the exact version, the required checks and the Fabricator’s report. That report is not evidence.',
              next: `All ${PROVER_CHECKS} checks now run against that exact version.`,
            }
          : {
              headline: 'The Prover is not checking anything',
              meaning: 'The Prover has not received anything to check.',
              next: 'The Fabricator must finish first.',
            }
      : report === 'PASS'
        ? {
            headline: `All ${PROVER_CHECKS} checks passed`,
            meaning: 'The automated checks found no problems.',
            next: 'The automated checks passed. The Keeper will review the work next. You do not need to do anything yet.',
          }
        : report === 'BLOCKED'
          ? {
              headline: `${tally.failed} of ${PROVER_CHECKS} checks failed`,
              meaning: `${failedNames.join(', ')} failed. Something is genuinely wrong, so the change is refused.`,
              next: 'A check confirmed a problem, so review will not begin. You decide whether the agents should fix it and try again.',
            }
          : {
              headline: `${tally.skipped} check could not run`,
              meaning: `${skippedNames.join(', ')} never ran, so nobody knows either way. The project's word for that is INSUFFICIENT EVIDENCE, and it is not the same as a failure.`,
              next: 'This check must run before the work can continue. Virgil is waiting for a result; the work has not failed.',
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
      title: 'What is proven and what is only reported',
      summary: 'Results from checks, kept separate from what agents said',
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
              text: 'The Fabricator says the work is finished',
              standing: 'claim' as Standing,
            },
            {
              text: 'The Keeper reviewed it independently',
              standing:
                state.cast.keeper.station === 'REPORTED'
                  ? ('verified' as Standing)
                  : ('unresolved' as Standing),
            },
          ],
        },
        {
          kind: 'note',
          text: 'A check result is evidence. An agent’s statement is a claim. This screen keeps them separate.',
        },
      ],
    },
    ...(tally.failed > 0 || tally.skipped > 0
      ? [
          {
            id: 'failure',
            title:
              tally.failed > 0
                ? 'The problem a check found, with the evidence'
                : 'A required check with no result',
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
                        {
                          label: 'Command result code — 0 means it ran successfully',
                          value: '1',
                          standing: 'verified',
                        },
                        {
                          label: 'Can be run again',
                          value: 'Yes — the saved command can be run again',
                          standing: 'verified',
                        },
                        { label: 'Does this stop the work?', value: 'yes', standing: 'verified' },
                      ],
                    },
                  ] as Block[])
                : ([
                    couldNotRunBlock(skippedNames[0] ?? ''),
                    {
                      kind: 'note',
                      text: 'This check couldn’t run, so it cannot be marked as passed or failed.',
                    },
                  ] as Block[]),
          } satisfies Section,
        ]
      : []),
    {
      id: 'progress',
      title: 'Can the work continue?',
      summary:
        station === 'REPORTED'
          ? report === 'PASS'
            ? 'Yes. The Keeper reviews it next. You do not need to approve anything yet.'
            : 'No. The work stops here.'
          : 'Not decided yet',
      blocks: [
        {
          kind: 'table',
          head: ['What must happen', 'Has it happened?'],
          rows: [
            ['Every check produced a result', station === 'REPORTED' ? 'yes' : 'no'],
            ['Did any check find a problem?', tally.failed > 0 ? 'yes' : 'no'],
            ['Was any check unable to run?', tally.skipped > 0 ? 'yes' : 'no'],
            [
              'Can the Keeper review it?',
              station === 'REPORTED' && tally.failed === 0 && tally.skipped === 0 ? 'yes' : 'no',
            ],
            ['Can it be added to your project?', 'Only you decide whether to add it'],
          ],
        },
      ],
    },
    {
      id: 'schedule',
      title: 'Where each result came from',
      summary: 'Fixed schedules. No check was run to produce them',
      blocks: [
        {
          kind: 'markdown',
          markdown: `${PROVER_CHECKS} checks, starting ${((proverChecks(state.outcome)[1]?.start ?? 0.56) - (proverChecks(state.outcome)[0]?.start ?? 0.2)).toFixed(2)} s apart, each running about 0.9 s. The names are the kinds of check this repository really runs; the results come from \`screens/tally.ts\`The required checks come from the project’s fixed list.`,
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
              label: 'View the failed check',
              goes: { kind: 'section', id: 'failure' },
            },
            {
              id: 'open-checks',
              label: 'View every check',
              goes: { kind: 'section', id: 'checks' },
            },
          ]
        : station === 'REPORTED'
          ? [
              {
                id: 'open-checks',
                label: 'View every check',
                goes: { kind: 'section', id: 'checks' },
              },
              {
                id: 'to-keeper',
                label: 'Open the Keeper’s review',
                goes: { kind: 'agent', agent: 'keeper' },
              },
            ]
          : [
              {
                id: 'open-checks',
                label: 'View every check',
                goes: { kind: 'section', id: 'checks' },
              },
              {
                id: 'open-facts',
                label: 'Compare claims with evidence',
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
    refused: 'Changing the project’s protected rules',
    reason: 'No agent may change these files. Only you can change the rules.',
    authority: 'authority.json · boundaryProtection.sessionDenied',
  },
  {
    refused: 'Filing a decision under docs/decisions/OD-*',
    reason: 'This can happen only when you decide. Your exact words are saved.',
    authority: 'OD-0006',
  },
  {
    refused: 'Editing a record under knowledge/raw/',
    reason:
      'New source records can be added. Existing source records are never changed or deleted.',
    authority: 'CLAUDE.md · hard limits',
  },
  {
    refused: 'Using the Fabricator’s claim as if it were proof',
    reason:
      'The Fabricator’s report is a claim. The checks and independent review provide the evidence.',
    authority: 'authority.json · virgilProhibitions',
  },
  {
    refused:
      'Adding changes to your project, making them available to users, or giving itself more access',
    reason: 'Only you can do these things. The app cannot do them for you.',
    authority: 'authority.json · ownerOnlyActions',
  },
];

function keeperDoc(state: DemoState): WindowDoc {
  // SA-U-02, and the sharper half: `liveState` refuses to carry a verdict on
  // principle, and this window then listed three findings from a review that
  // never ran.
  if (state.mode === 'live') return nothingReadDoc(state, 'keeper', 'any review');
  const { station, since } = beatOf(state, 'keeper');
  const tally = keeperTally(station === 'WORKING' ? since : 100);
  const proverReported = state.cast.prover.station === 'REPORTED';
  const proverRefused = proverReported && state.cast.prover.report !== 'PASS';

  const conclusion: Conclusion =
    station === 'REPORTED'
      ? {
          headline: `The review found ${tally.findings} things, none serious enough to stop it`,
          meaning:
            'PASS WITH NON-BLOCKING FINDINGS — The review found issues, but none requires the work to stop. Every issue remains recorded.',
          next: 'The checks and independent review are complete. You can now choose whether to add the change to your project.',
        }
      : station === 'WORKING'
        ? {
            headline: `Reading the change — ${tally.findings} things found so far`,
            meaning:
              'Each issue is named and marked by how serious it is. The Keeper did not build or check this work.',
            next: 'The Keeper reports its decision and includes everything it found.',
          }
        : station === 'RECEIVING'
          ? {
              headline: 'Receiving the change for review',
              meaning:
                'The Keeper receives the exact version, the check results and their evidence. It cannot change any files.',
              next: 'The independent review begins. The Keeper did not build or check this work.',
            }
          : proverRefused
            ? {
                headline: 'The Keeper did not review this change',
                meaning:
                  'The checks did not clear the work for review, so the Keeper never reviewed it. The Prover’s screen says whether a problem was found or a check could not run.',
                next: 'The process correctly stopped before review. Open the Prover’s result to see why.',
              }
            : {
                headline: 'Nothing is being reviewed',
                meaning: 'The Keeper has not received anything to review.',
                next: 'Review begins only after every required check passes.',
              };

  const sections: Section[] = [
    {
      id: 'findings',
      title: `What the review found — ${tally.findings} so far`,
      summary:
        tally.findings === 0
          ? 'No issues found yet'
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
          ? ([{ kind: 'note', text: 'The review has found no issues so far.' }] as Block[])
          : []),
      ],
    },
    {
      id: 'evidence',
      title: 'The evidence and its sources',
      summary: 'Every result and the file it came from',
      blocks: [
        {
          kind: 'evidence',
          rows: [
            {
              label: 'Exact version reviewed',
              value: state.content.candidateId ?? CANDIDATE_ID,
              standing: 'claim',
            },
            {
              label: 'Automated checks',
              value: proverReported ? `Provided by the Prover` : 'The Prover has not finished yet',
              standing: proverReported ? 'verified' : 'unresolved',
            },
            {
              label: 'The Keeper works independently',
              value: 'It can read the files but cannot change them',
              standing: 'verified',
            },
            {
              label: 'Every issue it finds is saved',
              value: 'You can still read the issues after the work passes review',
              standing: 'verified',
            },
          ],
        },
        {
          kind: 'table',
          head: ['Information', 'Source', 'Where'],
          rows: [
            ['The four decisions the Keeper can return', 'authority.json', 'reviewVerdicts'],
            ['How serious an issue can be', 'agent-contracts', 'common.ts · Severity'],
            ['Every stage a change can be in', 'authority.json', 'candidateStates'],
            ['Actions only you can take', 'authority.json', 'ownerOnlyActions'],
          ],
        },
      ],
    },
    {
      id: 'refusals',
      title: 'Actions the agents are not allowed to take, with the exact reasons',
      summary: `${REFUSALS.length} lines this role will not cross`,
      blocks: [
        {
          kind: 'table',
          head: ['What it refuses to do', 'Why', 'Where the rule is written'],
          rows: REFUSALS.map((entry) => [entry.refused, entry.reason, entry.authority]),
        },
        ...(proverRefused
          ? ([
              {
                kind: 'note',
                text: 'This change never reached review, so the Keeper made no decision about it. The rows above show rules, not events from this run.',
              },
            ] as Block[])
          : []),
      ],
    },
    {
      id: 'authority',
      title: 'Who makes each decision',
      summary: 'Who can make each decision, and which rule takes priority if two conflict',
      blocks: [
        {
          kind: 'table',
          head: ['Order', 'The rule that takes priority'],
          rows: [
            ['1', 'Your original instructions and your written decisions'],
            ['2', 'constitution/ — out of bounds to every session'],
            ['3', 'Design decisions you have approved'],
            ['4', 'Architecture, art direction, security, testing and process'],
            ['5', 'The wiki explains the rules but cannot change them'],
          ],
        },
        {
          kind: 'markdown',
          markdown:
            'If an agent finds conflicting instructions, it tells you instead of choosing silently.',
        },
      ],
    },
    {
      id: 'history',
      title: 'What has happened so far',
      summary: 'Every completed step, shown in order',
      blocks: [
        {
          kind: 'table',
          head: ['Step', 'Started', 'Reported', 'Result'],
          rows: ledgerAt(state.seconds, state.outcome).map((row) => [
            sentence(row.label),
            stamp(row.startedAt),
            row.endedAt === null ? '—' : stamp(row.endedAt),
            row.report === null ? 'In progress' : row.report.split('_').join(' '),
          ]),
        },
        {
          kind: 'note',
          text: 'Each step is recorded when it happens and that record is never changed. A step with no result is never shown as passed.',
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
              label: 'View the review findings',
              goes: { kind: 'section', id: 'findings' },
            },
            {
              id: 'open-evidence',
              label: 'View the sources',
              goes: { kind: 'section', id: 'evidence' },
            },
          ]
        : [
            {
              id: 'open-refusals',
              label: 'View refused actions and reasons',
              goes: { kind: 'section', id: 'refusals' },
            },
            {
              id: 'open-history',
              label: 'View the full history',
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
        next: 'If you choose to add it, you must do that yourself outside this app.',
      }
    : verdictWord !== null
      ? {
          headline:
            state.content.verdict === 'BLOCKED'
              ? 'A check found a problem, so the work stopped'
              : state.content.verdict === 'INSUFFICIENT_EVIDENCE'
                ? 'A required check produced no result'
                : 'The Keeper has finished its review',
          token: verdictWord,
          meaning:
            state.content.verdict === 'BLOCKED'
              ? 'A check confirmed a problem, so I stopped the work.'
              : state.content.verdict === 'INSUFFICIENT_EVIDENCE'
                ? 'A check could not run, so it could not be marked as passed or failed.'
                : 'The review found minor issues, but none requires the work to stop. All are recorded.',
          next:
            state.content.verdict === 'BLOCKED'
              ? 'You must decide whether the agents should fix the problem and try again. I cannot restart them myself.'
              : state.content.verdict === 'INSUFFICIENT_EVIDENCE'
                ? 'The required check still has no result. I am waiting; this is not a failed check.'
                : 'These issues remain recorded and available to read.',
        }
      : holder
        ? {
            headline: `${holder} is doing the work`,
            meaning: `Nothing has been checked and nobody has reviewed it. The project's word for where it has got to is ${state.content.candidate}.`,
            next: 'When one agent finishes, I pass the work to the next. I never move it on before then.',
          }
        : {
            headline: 'Nothing is being worked on',
            meaning: 'No work is in progress and no agent has been given a task.',
            next: 'When work starts, I define the task, the files that may be changed and when permission ends.',
          };

  const hops = hopsAt(state);
  const agentRows = ROLES.map((role) => {
    const s = statusOf(role, state);
    return [sentence(CAST[role].label), s.word, s.means];
  });

  const sections: Section[] = [
    {
      id: 'truth',
      title: 'Where your project stands',
      summary: `${state.content.candidate ?? 'No current change'} · ${state.content.verdict === '—' ? 'no verdict' : sentence(verdict.word)}`,
      open: at === 'truth' || at === 'verdict',
      blocks: [
        {
          kind: 'table',
          head: ['What', 'State'],
          rows: [
            ['The change', state.content.candidate ?? 'No work in progress'],
            ['Exact version being worked on', state.content.candidateId ?? CANDIDATE_ID],
            ['Verdict', state.content.verdict === '—' ? 'NO VERDICT' : verdict.word],
            ['Who is working now', holder ?? 'Virgil'],
            ['Checks and review complete — waiting for your decision', gate ? 'yes' : 'no'],
          ],
        },
        {
          kind: 'evidence',
          rows: [
            {
              label: 'Automated checks',
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
      title: 'What must happen, and in what order',
      summary: 'One step happens at a time. Each step must finish before the next begins.',
      blocks: [
        {
          kind: 'plan',
          steps: ROLES.map((role, i) => ({
            text:
              role === 'fabricator'
                ? 'The Fabricator writes the code and reports when it believes the work is finished.'
                : role === 'prover'
                  ? 'The Prover runs every required check on that exact version and reports the results.'
                  : 'The Keeper independently reviews it and reports its decision with every issue it found.',
            state: (hops[i] === null ? 'todo' : hops[i]?.reported ? 'done' : 'active') as
              | 'done'
              | 'active'
              | 'todo',
          })),
        },
        {
          kind: 'markdown',
          markdown:
            'Each agent has one job. I coordinate the handovers and keep you informed. I do not write code, run checks, review the work or approve it. The final decision is yours.',
        },
      ],
    },
    {
      id: 'next',
      title: 'Your next decision',
      summary: gate
        ? 'Add the change to your project, or leave it out. Only you can decide.'
        : state.content.verdict === 'BLOCKED'
          ? 'Whether the agents should fix it and try again'
          : state.content.verdict === 'INSUFFICIENT_EVIDENCE'
            ? 'Whether to run the missing check or stop this work'
            : /**
               * **KP5-12.** This `else` fires whenever there is no verdict and
               * no gate — which includes *nothing has started* and *nothing was
               * read*, neither of which is work in progress. On the hosted page
               * with the endpoint failing, this sentence appeared three lines
               * under "No work has started" and "Nothing is being worked on", in
               * the same sheet: two statements about one fact, which is the
               * defect this project treats as fatal.
               *
               * A decision still is not needed. What differs is the reason, and
               * the reason is knowable here: something is holding the work, or
               * nothing is.
               */
              state.content.active
              ? 'No decision is needed yet. The work is still in progress.'
              : 'No decision is needed yet, because nothing is in progress.',
      open: at === 'next' || at === 'candidate' || gate,
      blocks: [
        {
          kind: 'decision',
          question: gate
            ? 'The checks and independent review are complete. Do you want to add this change to your project?'
            : state.content.verdict === 'BLOCKED'
              ? 'The change was rejected because a problem was confirmed. Do you want the agents to fix it and try again?'
              : state.content.verdict === 'INSUFFICIENT_EVIDENCE'
                ? 'A check could not run. Do you want the Prover to run it again?'
                : 'No decision is needed while the agents are still working.',
          options: gate
            ? ['Add it to the project outside this app', 'Leave it unchanged']
            : state.content.verdict === 'BLOCKED'
              ? ['Fix the problems and try again', 'Stop here', 'View the problem first']
              : state.content.verdict === 'INSUFFICIENT_EVIDENCE'
                ? ['Run the missing check', 'Stop here']
                : ['View the current work', 'Wait'],
          note: 'For now, this only shows what Virgil would ask you. The app cannot add the change to your project; only you can.',
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
            action.ownerOnly ? 'No — only you can decide' : 'No',
          ]),
        },
        {
          kind: 'note',
          text: 'These controls show what the finished app will include. They do not work because no agents are running.',
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
        ? 'You need to decide'
        : holder
          ? sentence(`${holder} is doing the work`)
          : state.content.candidate !== null
            ? 'Waiting for the next step'
            : 'No work',
      means: gate ? 'Checks and review passed. Add it?' : sentence(verdict.lead),
      tint: gate ? STATUS.gold : verdict.status === 'red' ? STATUS.red : STATUS[verdict.status],
      mark: gate ? 'passed' : verdict.mark,
    },
    progression: progressionOf(state, 'virgil'),
    context: contextOf(state),
    conclusion,
    actions: virgilActions(state),
    /**
     * **The recording keeps its script; a live room draws the real thread.**
     * Slice six. The scripted turns are a demonstration saying what it is and
     * are not carried onto a live page, where every message must be one that
     * was actually sent.
     */
    messages: state.mode === 'live' ? liveVirgilThread(state) : virgilThread(state),
    sections,
    honesty: honestyOf(state),
    accent: ACCENT.virgil?.key ?? STATUS.gold,
    reaction: state.virgilFace,
  };
}

/**
 * The suggested actions under Virgil's message. The owner's example is
 * *"[View the failed check] [Authorise repair] [Keep everything paused]"*, and
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
      { id: 'open-next', label: 'My next decision', goes: { kind: 'section', id: 'next' } },
      { id: 'open-controls', label: 'What I cannot do', goes: { kind: 'section', id: 'controls' } },
    ];
  }
  if (state.content.verdict === 'BLOCKED' || state.content.verdict === 'INSUFFICIENT_EVIDENCE') {
    return [
      {
        id: 'to-prover',
        label:
          state.content.verdict === 'BLOCKED' ? 'View the failed check' : 'Show the missing check',
        goes: { kind: 'agent', agent: 'prover', at: 'failure' },
      },
      { id: 'open-next', label: 'My next decision', goes: { kind: 'section', id: 'next' } },
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
          'Here is the task. Use your own project copy and one branch. Change only assigned files before permission ends. Build it and report back.',
        ),
      ],
    },
    {
      at: BEATS.handoffToFabricator + 0.5,
      from: 'fabricator',
      blocks: [
        para('I’m starting. I will change only my assigned files.'),
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
          'I have finished and uploaded the code, and opened a draft request to add it. This is only my report. Nothing has been checked or reviewed yet.',
        ),
        {
          kind: 'pr',
          title: 'V11 stage 3 — the windows',
          identity: 'Saved and submitted, not added to your project',
          state: 'DRAFT',
          lines: ['The Fabricator stops at the draft request.'],
        },
      ],
    },
    {
      at: BEATS.handoffToProver,
      from: 'virgil',
      blocks: [para('I have it. The Prover checks it next. The Fabricator’s report is not proof.')],
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
            : `Required checks finished.`,
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
                  'One required check could not run, so I cannot mark the work as passed or failed. INSUFFICIENT EVIDENCE',
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
          'Checks passed. Keeper, independently review this version against the project’s rules. Report your decision and every issue.',
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
            : 'I reviewed the change and its evidence.',
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
/**
 * **Slice six: the owner's own thread, drawn from the repository.**
 *
 * `docs/process/PHASE_2_SLICE_6_BRIEF.md`. He asked for this in one sentence —
 * *"I want to use the UI to basically have this chat with Virgil and get useful
 * stuff on it"* — and what makes it possible to honour is that the messages are
 * **evidence rather than screen state**: each one is in
 * `.virgil/conversation.json`, committed by the run that wrote it, so the thread
 * survives a reload because it was never on the screen in the first place.
 *
 * The rules it is held to are the room's, unchanged:
 *
 *  - **A message in flight is never drawn as answered.** An exchange still being
 *    worked draws the question and a reply that says it is working. There is no
 *    branch here that can produce an answer bubble without an answer, because
 *    the answer is the thing being rendered.
 *  - **A failure is not Virgil speaking.** It comes from `system`, with the
 *    reason, because *"the run died"* is a fact about the machinery and putting
 *    it in Virgil's voice would make the machinery sound like a person who had
 *    considered the question.
 *  - **Nothing read is never nothing said.** Four different situations produce an
 *    empty thread and the window says which, rather than drawing the silence
 *    that all four have in common.
 */
function stampAt(iso: string): string {
  // UTC, and it says so. A time drawn without its zone is the kind of small
  // confident wrongness this project spends its whole effort avoiding —
  // localising it is a rendering improvement, not a reason to print an
  // ambiguous number now.
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return 'time not read';
  const hh = String(at.getUTCHours()).padStart(2, '0');
  const mm = String(at.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm} UTC`;
}

/** What the run that carries this exchange can be found at, when it can. */
function runNote(runUrl: string | null): Block[] {
  return runUrl === null ? [] : [{ kind: 'note', text: `The run that did this: ${runUrl}` }];
}

/**
 * The sentence for a conversation that was not read, by which of the four
 * situations produced it. `state.mjs` distinguishes them; this is the only place
 * that turns them into words.
 */
function nothingSaidYet(state: DemoState): Message[] {
  const status = state.conversationStatus ?? null;
  const why = state.conversationReason;
  const text =
    status === 'absent'
      ? 'Nothing has been said on this branch yet. Type below and a session starts on your repository; the reply appears here when it has been written, which takes minutes rather than seconds.'
      : status === 'unreadable'
        ? 'There is a conversation on this branch and it could not be read, so nothing is shown. This is not the same as nothing having been said.'
        : status === 'refused'
          ? 'A conversation was read on this branch and refused, so none of it is drawn. A message that cannot be trusted to be what was said is not shown as what was said.'
          : 'The conversation could not be read, so nothing is shown. This is not the same as nothing having been said.';
  return [
    {
      id: 'talk:none',
      from: 'system',
      at: '',
      blocks: [
        para(text),
        ...(typeof why === 'string' && why.length > 0
          ? [{ kind: 'note' as const, text: why }]
          : []),
      ],
    },
  ];
}

function liveVirgilThread(state: DemoState): Message[] {
  const talk = state.conversation;
  if (!talk) return nothingSaidYet(state);
  if (talk.exchanges.length === 0) return nothingSaidYet(state);

  const out: Message[] = [];
  for (const exchange of talk.exchanges) {
    out.push({
      id: `talk:${exchange.id}:asked`,
      from: 'owner',
      at: stampAt(exchange.askedAt),
      // `para`, never `markdown`. What he typed is drawn as what he typed; a
      // thread that reformats the owner's own words is a thread that has
      // started editing him.
      blocks: [para(exchange.question)],
    });

    if (exchange.state === 'asked') {
      out.push({
        id: `talk:${exchange.id}:working`,
        from: 'virgil',
        at: stampAt(exchange.askedAt),
        // The one honest use of this flag on the live path: the exchange
        // genuinely is unfinished, and the file says so.
        streaming: true,
        blocks: [
          para(
            'A session is working on this on your repository. It takes minutes rather than seconds, and the answer appears here when it has been written — including if you close this and come back.',
          ),
          ...runNote(exchange.runUrl),
        ],
      });
      continue;
    }

    if (exchange.state === 'failed') {
      out.push({
        id: `talk:${exchange.id}:failed`,
        from: 'system',
        at: stampAt(exchange.answeredAt ?? exchange.askedAt),
        blocks: [
          para('No answer was written for this. Your message is kept; the run is not.'),
          ...(exchange.reason === null ? [] : [{ kind: 'note' as const, text: exchange.reason }]),
          ...runNote(exchange.runUrl),
        ],
      });
      continue;
    }

    out.push({
      id: `talk:${exchange.id}:answered`,
      from: 'virgil',
      at: stampAt(exchange.answeredAt ?? exchange.askedAt),
      blocks: [
        // The session's own output, in the restricted subset the block kind
        // exists for. `Blocks.tsx` builds React elements and sets no HTML, so
        // this is text being formatted rather than markup being executed.
        { kind: 'markdown', markdown: exchange.answer ?? '' },
        ...runNote(exchange.runUrl),
      ],
    });
  }
  return out;
}

function virgilThread(state: DemoState): Message[] {
  const proverTallyNow = proverTally(100, state.outcome);
  return thread(state, 'virgil', [
    {
      at: 0,
      from: 'virgil',
      blocks: [
        para(
          'Good evening. No work has started. I’ll tell you who has it, what the checks found, what the review found and whether you need to decide.',
        ),
      ],
    },
    {
      at: BEATS.handoffToFabricator,
      from: 'virgil',
      blocks: [
        para(
          'I’ve given the Fabricator the task, its own copy of the project, the files it can change and a deadline.',
        ),
      ],
    },
    {
      at: BEATS.fabricatorReported,
      from: 'virgil',
      blocks: [
        para(
          'The Fabricator says the code is finished. That is a claim, not proof. The Prover checks it next; you do not need to act.',
        ),
      ],
    },
    {
      at: BEATS.proverWorking,
      from: 'virgil',
      until: BEATS.proverReported,
      blocks: [
        para('The Prover is running the checks. I’ll report back when all required checks finish.'),
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
                text: 'Only you can decide whether they try again. This app cannot restart the work.',
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
                'A required check could not run, so the Prover cannot mark the work as passed or failed. I am waiting for that check to be run.',
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
                'All checks passed. I’m sending this exact version to the Keeper for independent review. You do not need to act yet.',
              ),
            ],
          },
          {
            at: BEATS.keeperReported,
            from: 'virgil' as const,
            blocks: [
              para(
                'The Keeper returned PASS WITH NON-BLOCKING FINDINGS. Its issues remain open, but none stops the change.',
              ),
            ],
          },
          {
            at: BEATS.ownerGate,
            from: 'virgil' as const,
            blocks: [
              para(
                'Checks and review passed. You can now choose whether to add the change to your project.',
              ),
              {
                kind: 'decision' as const,
                question: 'Ready. Add it to your project?',
                options: ['Add it to the project outside this app', 'Leave it unchanged'],
                note: 'This question means you must decide. To add the change, do it yourself outside the app.',
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
