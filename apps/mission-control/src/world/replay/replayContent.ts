import type { PanelDoc, PanelRow, PanelSection, PanelTarget } from '../panel/panelContent.js';
import type { DemoState, Report } from '../room/demo.js';
import { room } from '../room/palette.js';
import { verdictLook } from '../screens/verdicts.js';
import {
  BUILD_1_FROM,
  BUILD_1_PROVENANCE,
  BUILD_1_SECONDS,
  CANDIDATES,
  CHECKS_CANDIDATE_1,
  CHECKS_CANDIDATE_1_PROVENANCE,
  CHECKS_CANDIDATE_2,
  CHECKS_CANDIDATE_2_PROVENANCE,
  FINDINGS_REVIEW_1,
  FINDINGS_REVIEW_1_PROVENANCE,
  FINDINGS_REVIEW_2,
  FINDINGS_REVIEW_2_PROVENANCE,
  OWNER_DECISIONS,
  PERMITTED_ACTIONS,
  type Provenance,
  REPAIR_PATHS,
  RESOLVED_BY_REPAIR,
  REVIEW_SKIPPED_NOTE,
  RUN,
  RUN_SECONDS,
  recordedClock,
  recordedDuration,
  secondsBetween,
  TIMING_GAP_NOTE,
  WINDOWS,
} from './recordedRun.js';
import {
  compressionOf,
  currentBeat,
  evidenceFor,
  hopsOf,
  REPLAY_BEATS,
  type ReplayBeat,
  type ReplaySpeed,
  replayLedgerAt,
  shaShownAt,
} from './replayTimeline.js';

/**
 * **The panel, carrying a recorded run.**
 *
 * The same `PanelDoc` the scripted demonstration produces, so the panel is
 * the panel and there is no second renderer. Two things are added, and
 * both are required by what the mode is:
 *
 *  - **`band`.** The demonstration's band says `Illustrative · not real
 *    state`. That would be false here and, worse, disbelieved: a reader
 *    told the Keeper's `BLOCKED` on `956be26` is illustrative would
 *    discount a true thing. The replay's band says what the thing actually
 *    is — a recorded run, replayed, not live state — and names the run and
 *    its candidate.
 *  - **`provenance`.** Every document ends with where its content came
 *    from: the repository file, the section or field inside it, and the
 *    commit. That is the decision the pass was given rather than one it
 *    made: every line the replay shows must be answerable with "where in
 *    the repository does this come from".
 *
 * **Recorded time and playback time never meet here.** The only durations
 * this file prints come from `recordedRun.ts`, and where the repository
 * records none the panel prints `NOT RECORDED`. Playback time appears in
 * exactly one place, the speed control's own derived label, and it is
 * described as what it is.
 */

const line = (text: string): PanelRow => ({ cells: [text] });

const BAND = {
  title: 'Recorded run · replayed · not live state',
  note:
    'The Phase 0 consolidation, 6–7 September 2026, played back faster than it happened. Every ' +
    'figure below is read out of this repository’s committed record and is named with its source. ' +
    'It is past fact about a merged lineage, not this repository’s state now.',
};

/** Where a hop's document says its content came from. */
function withProvenance(
  doc: Omit<PanelDoc, 'band' | 'provenance'>,
  sources: Provenance[],
): PanelDoc {
  return { ...doc, band: BAND, provenance: sources };
}

const CANDIDATE_1 = CANDIDATES[0] as (typeof CANDIDATES)[number];
const CANDIDATE_2 = CANDIDATES[1] as (typeof CANDIDATES)[number];

function candidateOf(segment: 0 | 1) {
  return segment === 0 ? CANDIDATE_1 : CANDIDATE_2;
}

function stateWords(state: string | null): string {
  return state === null ? 'NO CANDIDATE' : state.split('_').join(' ');
}

const RUN_PROVENANCE: Provenance = RUN.provenance;

/** The one recorded duration, and the eight beats that have none. */
const TIMING_SECTION: PanelSection = {
  title: 'RECORDED TIME AND PLAYBACK TIME',
  kind: 'lines',
  wide: true,
  rows: [
    line(
      `The run: ${recordedClock(RUN.startedAt)} to ${recordedClock(RUN.completedAt)} — ${recordedDuration(RUN_SECONDS)}, from the run record’s own startedAt and completedAt.`,
    ),
    line(TIMING_GAP_NOTE),
    line(
      'Playback time is how long a beat is on screen. It is a pacing choice, it is not proportional to recorded time, and no surface reports it as a duration of the work.',
    ),
  ],
};

/** The three windows the recorded instants divide the run into. */
const WINDOWS_SECTION: PanelSection = {
  title: 'THE WINDOWS THE RECORD GIVES',
  kind: 'table',
  wide: true,
  head: ['FROM', 'TO', 'LENGTH', 'WHAT IS INSIDE IT'],
  rows: WINDOWS.map((window) => ({
    cells: [
      recordedClock(window.from),
      recordedClock(window.to),
      recordedDuration(secondsBetween(window.from, window.to)),
      window.contains,
    ],
  })),
};

// ------------------------------------------------------------- the hops

function buildDoc(beat: ReplayBeat, hopIndex: number): PanelDoc {
  const candidate = candidateOf(beat.segment);
  const first = beat.segment === 0;
  const look = verdictLook(beat.report);
  const sections: PanelSection[] = [];
  sections.push({
    title: first ? 'THE GRANT’S PERMITTED ACTIONS' : 'THE REPAIR CONTRACT',
    kind: 'lines',
    rows: first
      ? PERMITTED_ACTIONS.map(line)
      : [
          line(`${OWNER_DECISIONS.repairRound.id} authorised one additional repair round.`),
          line(`Scope: ${OWNER_DECISIONS.repairRound.scope}.`),
          line(OWNER_DECISIONS.repairRound.consequence + '.'),
          line('A repair produces a new SHA. It never produces a new verdict on the old one.'),
        ],
  });
  sections.push({
    title: `COMMITS · ${candidate.commits.length}`,
    kind: 'table',
    wide: true,
    head: ['SHA', 'SUBJECT'],
    rows: candidate.commits.map((commit) => ({ cells: [commit.sha, commit.subject] })),
  });
  if (first) {
    sections.push({
      title: `FILES CHANGED · ${candidate.filesChanged} AGAINST ${RUN.phase0Tip.slice(0, 7)}`,
      kind: 'lines',
      rows: [
        line('git diff --name-only 4b834a4..956be26 counts 75 paths across the seven commits.'),
        line(
          'They are not listed here: the record names the repaired sources, and the repair round’s twenty-five paths are on the next hop.',
        ),
      ],
    });
  } else {
    sections.push({
      title: `FILES CHANGED · ${REPAIR_PATHS.length}`,
      kind: 'table',
      wide: true,
      head: ['PATH'],
      rows: REPAIR_PATHS.map((path) => ({ cells: [path] })),
    });
  }
  sections.push({
    title: 'HOW LONG IT TOOK',
    kind: 'lines',
    rows: first
      ? [
          line(
            `${recordedDuration(BUILD_1_SECONDS)}, from its first commit at ${recordedClock(BUILD_1_FROM)} to the candidate commit at ${recordedClock(candidate.committedAt)}. This is the only hop of the nine with a duration in the repository.`,
          ),
        ]
      : [
          line(
            `NOT RECORDED. The repair produced one commit, stamped ${recordedClock(candidate.committedAt)}; the window it sits in also holds the first review, the owner’s authorisation and the checks, and the record does not say how it divided.`,
          ),
        ],
  });
  return withProvenance(
    {
      key: `replay:build:${beat.segment}`,
      kicker: `HOP ${hopIndex + 1} OF 3 · CANDIDATE ${candidate.short}`,
      title: first ? 'FABRICATOR' : 'REPAIR',
      state: stateWords(beat.candidate),
      tint: beat.station === 'REPORTED' ? look.tint : room.warm.amber,
      mark: {
        report: beat.report,
        word: beat.report === 'COMPLETE' ? 'COMPLETE' : beat.station,
        under: beat.report === 'COMPLETE' ? 'A CLAIM · NOT EVIDENCE' : 'NO REPORT YET',
      },
      lead: first
        ? 'One builder session, role fabricator, authority TIER_2, on one consolidation branch. It reported complete, and a report of completion is a claim: the deterministic checks and the independent review are what would make it a proof. On this run the checks passed and the review did not.'
        : 'The repair round the owner authorised, bounded to four accepted findings and nothing else. It produced a new candidate SHA, which is what a repair produces: the reviewed SHA is never rewritten and never re-verdicted.',
      sections,
      evidence: [
        `CANDIDATE ${candidate.short}`,
        `ROLE ${RUN.roleId.toUpperCase()} · ${RUN.authorityTier}`,
      ],
    },
    [
      candidate.provenance,
      RUN_PROVENANCE,
      ...(first ? [BUILD_1_PROVENANCE] : [OWNER_DECISIONS.repairRound.provenance]),
    ],
  );
}

function checksDoc(beat: ReplayBeat, hopIndex: number): PanelDoc {
  const candidate = candidateOf(beat.segment);
  const first = beat.segment === 0;
  const checks = first ? CHECKS_CANDIDATE_1 : CHECKS_CANDIDATE_2;
  const passed = checks.filter((c) => c.result === 'passed').length;
  const skipped = checks.filter((c) => c.result === 'skipped').length;
  const look = verdictLook(beat.report);
  const sections: PanelSection[] = [
    {
      title: `CHECKS · ${passed} PASSED · 0 FAILED${skipped > 0 ? ` · ${skipped} SKIPPED` : ''}`,
      kind: 'table',
      wide: true,
      head: ['CHECK', 'RESULT', 'WHAT IT PRINTED'],
      rows: checks.map((check) => ({
        cells: [check.name, check.result, check.evidence],
        tag: { at: 1, kind: check.result },
      })),
    },
    {
      title: 'WHO RAN THEM',
      kind: 'lines',
      rows: [
        line(
          'The building session ran them. This project has never had a separate verifying session, and the record does not claim one: the checks are the builder’s own, and that is why the independent review below is the hop that matters.',
        ),
        ...(first ? [] : [line(REVIEW_SKIPPED_NOTE)]),
      ],
    },
    {
      title: 'HOW LONG IT TOOK',
      kind: 'lines',
      rows: [
        line(
          'NOT RECORDED. The repository timestamps commits, not check runs; no duration is invented for this hop.',
        ),
      ],
    },
  ];
  return withProvenance(
    {
      key: `replay:checks:${beat.segment}`,
      kicker: `HOP ${hopIndex + 1} OF 3 · CANDIDATE ${candidate.short}`,
      title: 'CHECKS',
      state: stateWords(beat.candidate),
      tint: beat.station === 'REPORTED' ? look.tint : room.warm.amber,
      mark: {
        report: beat.report,
        word: beat.report === '—' ? beat.station : (look.lines[0] as string),
        under: beat.report === '—' ? 'NO REPORT YET' : (look.lines[1] ?? 'A VERDICT'),
      },
      lead: first
        ? 'Nine deterministic checks on the final validated tree, and every one of them passed. Hold on to that while you read the next row: a green check suite is not a review, and on this run the independent Keeper blocked the candidate the checks had cleared.'
        : 'Nine checks ran and passed on the repaired candidate; three were skipped and each skip carries its reason. None of the three is required, so none of them could have hidden a failure behind a gap.',
      sections,
      evidence: [
        `${passed} PASSED · 0 FAILED`,
        `${checks.length} CHECKS`,
        `CANDIDATE ${candidate.short}`,
      ],
    },
    [first ? CHECKS_CANDIDATE_1_PROVENANCE : CHECKS_CANDIDATE_2_PROVENANCE, RUN_PROVENANCE],
  );
}

function reviewDoc(beat: ReplayBeat, hopIndex: number): PanelDoc {
  const candidate = candidateOf(beat.segment);
  const first = beat.segment === 0;
  const findings = first ? FINDINGS_REVIEW_1 : FINDINGS_REVIEW_2;
  const blocking = findings.filter((f) => f.severity === 'blocking').length;
  const report: Report = first ? 'BLOCKED' : 'PASS_WITH_NON_BLOCKING_FINDINGS';
  const look = verdictLook(beat.station === 'REPORTED' ? report : '—');
  const sections: PanelSection[] = [
    {
      title: `FINDINGS · ${findings.length} · ${blocking} BLOCKING`,
      kind: 'table',
      wide: true,
      head: ['ID', 'SEVERITY', 'WHAT IT FOUND', 'DISPOSITION'],
      rows: findings.map((finding) => ({
        cells: [finding.id, finding.severity, finding.what, finding.disposition],
        tag: { at: 1, kind: finding.severity },
      })),
    },
    first
      ? {
          title: 'WHAT THE VERDICT COST',
          kind: 'lines',
          rows: [
            line('BLOCKED, on a candidate whose nine deterministic checks had all passed.'),
            line(
              'The reviewer was a fresh read-only session, independent of the session that built the candidate, and it returned its verdict as a comment on pull request #1.',
            ),
            line(
              'The owner then authorised one repair round, bounded to four of the ten findings. It was the last cycle permitted: a further BLOCKED verdict would have stopped the lineage.',
            ),
          ],
        }
      : {
          title: 'WHAT THE REPAIR RESOLVED, AND WHAT STAYED OPEN',
          kind: 'lines',
          rows: [
            line(`Resolved by the repair round: ${RESOLVED_BY_REPAIR.join(', ')}.`),
            line(
              `Confirmed open and accepted, none of them blocking: ${findings.map((f) => f.id).join(', ')}.`,
            ),
            line(
              'All four are still open today, recorded in docs/architecture/ENFORCEMENT_BOUNDARIES.md. KR-03 and KR-07 are the first two Phase 1 entries under OD-0004.',
            ),
            line(
              'Findings were raised and none of them blocked, so the policy’s word for it is PASS WITH NON-BLOCKING FINDINGS and never a bare PASS.',
            ),
          ],
        },
    {
      title: 'HOW LONG IT TOOK',
      kind: 'lines',
      rows: [
        line(
          first
            ? 'NOT RECORDED. The review sits inside the window between the two candidate commits, which also holds the owner’s authorisation and the repair; the record does not divide it.'
            : `NOT RECORDED. The window from the candidate commit to the merge is ${recordedDuration(secondsBetween(candidate.committedAt, RUN.mergedAt))}, and it holds the review, the owner’s disposition and the merge together. The review’s own share is not recorded.`,
        ),
      ],
    },
  ];
  return withProvenance(
    {
      key: `replay:review:${beat.segment}`,
      kicker: `HOP ${hopIndex + 1} OF 3 · CANDIDATE ${candidate.short}`,
      title: 'REVIEW',
      state: stateWords(beat.candidate),
      tint: beat.station === 'REPORTED' ? look.tint : room.warm.amber,
      mark: {
        report: beat.station === 'REPORTED' ? report : '—',
        word: beat.station === 'REPORTED' ? (look.lines[0] as string) : beat.station,
        under:
          beat.station === 'REPORTED' ? (look.lines[1] ?? 'A VERDICT') : 'NO VERDICT RETURNED YET',
      },
      lead: first
        ? 'An independent read-only Keeper session reviewed the exact candidate SHA and returned BLOCKED. This is the hop the rest of the system exists for, and it is the hop the Phase 1 viewing points V6 to V9 have not had.'
        : 'The second independent review, of the exact new SHA. It resolved the two blocking findings and the two major ones the repair was authorised for, and confirmed four gaps open and non-blocking.',
      sections,
      evidence: [
        `FINDINGS ${findings.length} · BLOCKING ${blocking}`,
        first ? 'EVERY CHECK WAS GREEN' : 'NON-BLOCKING PERSIST',
        `CANDIDATE ${candidate.short}`,
      ],
    },
    [
      first ? FINDINGS_REVIEW_1_PROVENANCE : FINDINGS_REVIEW_2_PROVENANCE,
      ...(first ? [] : [OWNER_DECISIONS.merge.provenance]),
    ],
  );
}

// ------------------------------------------------------------ the slabs

function runDoc(beat: ReplayBeat, speed: ReplaySpeed): PanelDoc {
  return withProvenance(
    {
      key: 'replay:run',
      kicker: 'THE RUN · VIRGIL’S LEFT SLAB',
      title: RUN.title,
      state: stateWords(beat.candidate),
      tint: room.emit.cyan,
      mark: { report: '—', word: 'RECORDED', under: 'REPLAYED · NOT LIVE' },
      lead: 'The consolidation of the Phase 0 foundation, the Keeper-required repairs and the owner-approved visual direction onto one branch, and its journey through two candidates, two independent reviews and the owner’s merge. It is the only run in this repository whose independent review has a recorded verdict.',
      sections: [
        {
          title: 'THE RUN',
          kind: 'table',
          wide: true,
          head: ['FIELD', 'VALUE'],
          rows: [
            { cells: ['repository', RUN.repository] },
            { cells: ['branch', RUN.branch] },
            { cells: ['role', `${RUN.roleId} · ${RUN.authorityTier}`] },
            { cells: ['base', RUN.baseSha] },
            { cells: ['built on', RUN.phase0Tip] },
            { cells: ['first candidate', CANDIDATE_1.sha] },
            { cells: ['second candidate', CANDIDATE_2.sha] },
            { cells: ['merge', `${RUN.mergeSha} · pull request ${RUN.pullRequest}`] },
          ],
        },
        {
          title: 'THE NINE HOPS, IN ORDER',
          kind: 'table',
          wide: true,
          head: ['HOP', 'RETURNED', 'RECORDED TIME'],
          rows: [
            ...hopsOf(0).map((hop) => ({
              cells: [
                `1 · ${hop.label}`,
                hop.report,
                hop.recordedSeconds === null
                  ? 'NOT RECORDED'
                  : recordedDuration(hop.recordedSeconds),
              ],
            })),
            { cells: ['1 · OWNER', 'REPAIR AUTHORISED (OD-0003)', 'NOT RECORDED'] },
            ...hopsOf(1).map((hop) => ({
              cells: [
                `2 · ${hop.label}`,
                hop.report,
                hop.recordedSeconds === null
                  ? 'NOT RECORDED'
                  : recordedDuration(hop.recordedSeconds),
              ],
            })),
            { cells: ['2 · OWNER', `MERGED (OD-0004)`, 'NOT RECORDED'] },
          ],
        },
        TIMING_SECTION,
        WINDOWS_SECTION,
        {
          title: 'WHAT THIS REPLAY SAYS ABOUT THE PROJECT',
          kind: 'lines',
          wide: true,
          rows: [
            line(
              'The deterministic checks were all green on the first candidate and the independent review blocked it anyway. That is the whole argument for the review hop, made by this project’s own history.',
            ),
            line(
              'The Phase 1 viewing points V6 to V9 have had no independent review at all. This replay is of the run that did.',
            ),
            line(
              'Eight of the nine hops have no recorded duration. Commits are timestamped; hops are not. That is the open backlog item “record real runs as events”.',
            ),
            line(
              `You are watching at ${compressionOf(speed)}×: ${recordedDuration(RUN_SECONDS)} of recorded work in ${REPLAY_BEATS.length} beats of screen time.`,
            ),
          ],
        },
      ],
      evidence: [
        `RUN ${recordedDuration(RUN_SECONDS)}`,
        'TWO CANDIDATES · TWO REVIEWS',
        `MERGED ${RUN.mergeSha.slice(0, 7)}`,
      ],
    },
    [
      RUN_PROVENANCE,
      {
        document: 'docs/process/CONSOLIDATION_RUN_RECORD.md',
        section: 'Base, branch, history; Commits on top of 4b834a4',
        commit: '3b9a964',
      },
      OWNER_DECISIONS.merge.provenance,
    ],
  );
}

function verdictDoc(beat: ReplayBeat): PanelDoc {
  const look = verdictLook(beat.verdict);
  return withProvenance(
    {
      key: 'replay:verdict',
      kicker: 'VIRGIL’S CENTRE SLAB · VERDICT',
      title: 'VERDICT',
      state: stateWords(beat.candidate),
      tint: beat.verdict === '—' ? room.emit.cyan : look.tint,
      mark: {
        report: beat.verdict,
        word: beat.verdict === '—' ? 'NO VERDICT' : (look.lines[0] as string),
        under: beat.verdict === '—' ? 'NONE RETURNED YET' : (look.lines[1] ?? 'A VERDICT'),
      },
      lead: 'Two verdicts were returned on this lineage by an independent reviewer, and they were different verdicts on different SHAs. A repair produces a new candidate; it never produces a new verdict on the reviewed one.',
      sections: [
        {
          title: 'THE TWO VERDICTS THIS RUN ACTUALLY RECEIVED',
          kind: 'table',
          wide: true,
          head: ['SHA', 'VERDICT', 'FINDINGS'],
          rows: [
            {
              cells: [
                CANDIDATE_1.short,
                'BLOCKED',
                `${FINDINGS_REVIEW_1.length} raised, 2 blocking (KR-01, KR-02)`,
              ],
            },
            {
              cells: [
                CANDIDATE_2.short,
                'PASS WITH NON-BLOCKING FINDINGS',
                `${FINDINGS_REVIEW_2.length} open, none blocking`,
              ],
            },
          ],
        },
        {
          title: 'THE EVIDENCE UNDER THIS VERDICT',
          kind: 'lines',
          rows: evidenceFor(beat).map(line),
        },
      ],
      evidence: evidenceFor(beat),
    },
    [FINDINGS_REVIEW_1_PROVENANCE, FINDINGS_REVIEW_2_PROVENANCE],
  );
}

function candidateDoc(beat: ReplayBeat): PanelDoc {
  // The identity follows the commit, not the board: see `shaShownAt`.
  const candidate = shaShownAt(beat);
  const merged = beat.candidate === 'MERGED';
  return withProvenance(
    {
      key: 'replay:candidate',
      kicker: 'VIRGIL’S RIGHT SLAB · CANDIDATE',
      title: beat.ownerGate ? 'OWNER' : 'CANDIDATE',
      state: stateWords(beat.candidate),
      tint: beat.ownerGate ? room.surface.goldBright : room.emit.magenta,
      mark: {
        report: '—',
        word: stateWords(beat.candidate),
        under: merged
          ? `MERGED AS ${RUN.mergeSha.slice(0, 7)}`
          : beat.ownerGate
            ? 'ELIGIBLE · NOT MERGED'
            : 'ONE IMMUTABLE COMMIT',
      },
      lead: merged
        ? 'The owner merged pull request #1 on the second verdict. The reviewed candidate is an ancestor of main, and the four accepted gaps went into main with it, recorded rather than hidden.'
        : beat.ownerGate
          ? 'Every merge gate passed. The candidate was eligible and it was not merged, because merge is the owner’s in every phase. The owner then merged it, and this replay shows that as its own beat rather than folding it into the gate.'
          : 'A review is of one exact immutable commit. This lineage produced two of them, and each was reviewed on its own SHA.',
      sections: [
        {
          title: 'THIS LINEAGE’S STATES, IN THE CONSTITUTION’S WORDS',
          kind: 'lines',
          wide: true,
          rows: [
            line('BUILDING · BUILDER REPORTED COMPLETE · VERIFICATION INCOMPLETE'),
            line('READY FOR REVIEW · REVIEW IN PROGRESS · BLOCKED'),
            line('REPAIR AUTHORISED · RE-REVIEW REQUIRED · VERIFICATION INCOMPLETE'),
            line('READY FOR REVIEW · REVIEW IN PROGRESS · PASS WITH NON-BLOCKING FINDINGS'),
            line('SAFE TO MERGE · MERGED'),
            line(
              'Every step is a transition constitution/authority.json allows, and test/replay.test.ts walks the whole sequence against the table.',
            ),
          ],
        },
        {
          title: 'THE OWNER’S TWO DECISIONS ON THIS RUN',
          kind: 'table',
          wide: true,
          head: ['DECISION', 'WHAT IT SAID', 'CONSEQUENCE'],
          rows: [
            {
              cells: [
                OWNER_DECISIONS.repairRound.id,
                OWNER_DECISIONS.repairRound.scope,
                OWNER_DECISIONS.repairRound.consequence,
              ],
            },
            {
              cells: [
                OWNER_DECISIONS.merge.id,
                OWNER_DECISIONS.merge.scope,
                OWNER_DECISIONS.merge.consequence,
              ],
            },
          ],
        },
      ],
      evidence: [
        `CANDIDATE ${candidate.sha.slice(0, 20)}`,
        merged ? `MERGED ${RUN.mergeSha.slice(0, 7)}` : 'ONE IMMUTABLE COMMIT',
      ],
    },
    [
      candidate.provenance,
      OWNER_DECISIONS.repairRound.provenance,
      OWNER_DECISIONS.merge.provenance,
    ],
  );
}

// ---------------------------------------------------------- the dispatch

/**
 * Which hop a beat belongs to, for the document a screen or a ledger row
 * opens. A station that is idle at this beat opens its own hop of the
 * candidate on the board, so a click never lands on nothing.
 */
function docForRole(beat: ReplayBeat, role: 'fabricator' | 'prover' | 'keeper'): PanelDoc {
  const hops = hopsOf(beat.segment);
  const index = hops.findIndex((hop) => hop.role === role);
  const at = index < 0 ? 0 : index;
  const hop = hops[at];
  // The beat that hop reports at, so an idle station still describes its
  // own work rather than the beat that happens to be on screen.
  const shown =
    beat.role === role
      ? beat
      : ((REPLAY_BEATS.find((candidate) => candidate.id === hop?.to) ?? beat) as ReplayBeat);
  if (role === 'fabricator') return buildDoc(shown, at);
  if (role === 'prover') return checksDoc(shown, at);
  return reviewDoc(shown, at);
}

export function replayPanelDoc(state: DemoState, target: PanelTarget): PanelDoc {
  const speed = (state.replay?.speed ?? 'fast') as ReplaySpeed;
  const beat = currentBeat(state.seconds, speed);
  if (target.kind === 'role') return docForRole(beat, target.role);
  if (target.kind === 'ledger') {
    const rows = replayLedgerAt(state.seconds, speed);
    const row = rows[target.row];
    return row ? docForRole(beat, row.role) : runDoc(beat, speed);
  }
  if (target.slab === 'verdict') return verdictDoc(beat);
  if (target.slab === 'candidate') return candidateDoc(beat);
  return runDoc(beat, speed);
}

export { BAND as REPLAY_PANEL_BAND };
