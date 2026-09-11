import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { stateFromAnswer } from '../src/world/live/liveState.js';
import { ROLES } from '../src/world/room/cast.js';
import { demoAt, loopLength, OUTCOMES } from '../src/world/room/demo.js';
import { PROVER_CHECKS, proverTally } from '../src/world/screens/tally.js';
import { primaryFor } from '../src/world/screens/v11/content.js';
import { type Block, type BlockKind, blockText, type Section } from '../src/world/window/blocks.js';
import { CAPABILITIES } from '../src/world/window/capabilities.js';
import { NO_SESSION, SESSION_ACTIONS } from '../src/world/window/session.js';
import {
  AGENTS,
  type Agent,
  CHECK_NAMES,
  type WindowDoc,
  windowDoc,
} from '../src/world/window/windowContent.js';

/**
 * **What the windows are held to.**
 *
 * Stage 3's requirements are mostly about order and about honesty, and both are
 * testable. Four of these assertions exist because of a defect this project
 * already had:
 *
 *  - **the conclusion leads, and a table can never be first** — the brief's
 *    *"lead with meaning, never with a table"*;
 *  - **no verdict word before that verdict's review has returned** — the fault
 *    stage 2 found twice on the verdict slab, and the V7 defect the owner
 *    caught himself;
 *  - **the window and the in-world screen say the same thing**, because they
 *    come from the same function (`screens/v11/content.ts`) — the V7 drift;
 *  - **the functional interface text is DOM text and is never drawn into the
 *    canvas**, asserted by refusing the window any three.js import at all.
 */

const dir = fileURLToPath(new URL('../src/world/window/', import.meta.url));
const sources = Object.fromEntries(
  readdirSync(dir).map((name) => [name, readFileSync(`${dir}${name}`, 'utf8')]),
);

/** Every beat of every loop, at a half-second. The whole demonstration. */
function everyBeat(): { loop: number; seconds: number }[] {
  const out: { loop: number; seconds: number }[] = [];
  for (let loop = 0; loop < OUTCOMES.length; loop += 1) {
    for (let t = 0; t <= loopLength(loop); t += 0.5) out.push({ loop, seconds: t });
  }
  return out;
}

function docsAt(loop: number, seconds: number): WindowDoc[] {
  const state = demoAt(seconds, loop, true);
  return AGENTS.map((agent: Agent) => windowDoc(state, { agent }));
}

/**
 * The same documents in the **replay** mode, which is the mode that keeps a
 * marking. `demoAt` produces the scripted state; the replay reaches
 * `windowDoc` with `mode: 'replay'` (`replay/replayContent.ts`), and that one
 * field is what `honestyOf` reads, so setting it here exercises the same
 * branch without dragging the whole recorded timeline into this file.
 */
function replayDocsAt(loop: number, seconds: number): WindowDoc[] {
  const state = { ...demoAt(seconds, loop, true), mode: 'replay' as const };
  return AGENTS.map((agent: Agent) => windowDoc(state, { agent }));
}

/** Every string a document puts on screen, in one array. */
function allText(doc: WindowDoc): string[] {
  const fromSection = (section: Section) => [
    section.title,
    section.summary,
    ...section.blocks.flatMap(blockText),
  ];
  return [
    doc.name,
    doc.remit,
    doc.status.word,
    doc.status.means,
    doc.progression.label,
    ...doc.progression.steps.map((step) => step.label),
    doc.context,
    doc.conclusion.headline,
    doc.conclusion.token ?? '',
    doc.conclusion.meaning,
    doc.conclusion.next,
    ...doc.actions.map((action) => action.label),
    ...doc.messages.flatMap((message) => message.blocks.flatMap(blockText)),
    ...doc.sections.flatMap(fromSection),
    doc.honesty?.title ?? '',
    doc.honesty?.note ?? '',
  ];
}

describe('the conclusion leads, at every beat of every loop', () => {
  it('gives every window three sentences before anything else', () => {
    for (const { loop, seconds } of everyBeat()) {
      for (const doc of docsAt(loop, seconds)) {
        const where = `${doc.key} @ loop ${loop} ${seconds}s`;
        expect(doc.conclusion.headline.length, where).toBeGreaterThan(12);
        expect(doc.conclusion.meaning.length, where).toBeGreaterThan(24);
        expect(doc.conclusion.next.length, where).toBeGreaterThan(24);
        // What happened, what it means, what happens next: three distinct
        // sentences, never one repeated to fill the shape.
        expect(doc.conclusion.headline, where).not.toEqual(doc.conclusion.meaning);
        expect(doc.conclusion.meaning, where).not.toEqual(doc.conclusion.next);
      }
    }
  });

  it('sets a returned verdict as a token, never as a shouted headline', () => {
    for (const { loop, seconds } of everyBeat()) {
      for (const doc of docsAt(loop, seconds)) {
        // No headline anywhere may be one of the four verdicts, or contain one:
        // the exact word goes in `token`, in the monospace face.
        for (const word of [
          'PASS',
          'PASS WITH NON-BLOCKING FINDINGS',
          'BLOCKED',
          'INSUFFICIENT EVIDENCE',
        ]) {
          expect(
            doc.conclusion.headline.includes(word),
            `${doc.key} @ loop ${loop} ${seconds}s shouts "${word}" in its headline`,
          ).toBe(false);
        }
        if (doc.conclusion.token !== undefined) {
          expect(
            ['PASS', 'PASS WITH NON-BLOCKING FINDINGS', 'BLOCKED', 'INSUFFICIENT EVIDENCE'],
            doc.key,
          ).toContain(doc.conclusion.token);
        }
      }
    }
  });

  it('never leads with a table: the first thing is prose, and the evidence is a section', () => {
    for (const { loop, seconds } of everyBeat()) {
      for (const doc of docsAt(loop, seconds)) {
        // A conclusion is prose by construction. The point of this
        // assertion is the *other* side of it: no section may be rendered
        // above the conclusion, so every section is in `sections` and every
        // one of them carries a one-line summary readable while closed.
        for (const section of doc.sections) {
          expect(section.summary.length, `${doc.key}/${section.id}`).toBeGreaterThan(2);
          expect(section.title.length, `${doc.key}/${section.id}`).toBeGreaterThan(3);
        }
      }
    }
  });

  it('offers what the owner can do as at least two view actions', () => {
    for (const { loop, seconds } of everyBeat()) {
      for (const doc of docsAt(loop, seconds)) {
        expect(doc.actions.length, doc.key).toBeGreaterThanOrEqual(2);
        for (const action of doc.actions) {
          if (action.goes.kind === 'section') {
            const ids = doc.sections.map((section) => section.id);
            expect(ids, `${doc.key} → ${action.id}`).toContain(action.goes.id);
          }
        }
      }
    }
  });
});

describe('no window names a verdict before that verdict’s review has returned', () => {
  /**
   * The four verdicts of `constitution/authority.json`, and the prose that
   * would leak one. Matched as whole words and case-insensitively, so a
   * sentence-case leak is caught as surely as a shouted one — which is what
   * V10's own test could not do, because it looked only at a rendered verdict
   * word.
   */
  const LEAKS = [
    /\bblocked\b/i,
    /\binsufficient evidence\b/i,
    /\bpass with non-blocking findings\b/i,
    /\bnon-blocking findings\b/i,
  ];

  it('holds at every half-second of all three loops, for all four windows', () => {
    for (const { loop, seconds } of everyBeat()) {
      const state = demoAt(seconds, loop, true);
      if (state.content.verdict !== '—') continue;
      for (const doc of docsAt(loop, seconds)) {
        for (const text of allText(doc)) {
          for (const leak of LEAKS) {
            expect(leak.test(text), `${doc.key} @ loop ${loop} ${seconds}s leaked: ${text}`).toBe(
              false,
            );
          }
        }
      }
    }
  });

  it('does say the verdict once it has returned', () => {
    const state = demoAt(30, 1, true);
    expect(state.content.verdict).toBe('BLOCKED');
    const doc = windowDoc(state, { agent: 'virgil' });
    expect(allText(doc).join(' ')).toMatch(/\bBLOCKED\b/);
  });
});

describe('the window and the in-world screen come from one source', () => {
  it('takes each specialist’s status word from the same function the screen draws', () => {
    for (const { loop, seconds } of everyBeat()) {
      const state = demoAt(seconds, loop, true);
      for (const role of ROLES) {
        const doc = windowDoc(state, { agent: role });
        const member = state.cast[role];
        const primary = primaryFor(role, member.station, member.report);
        // Same words, ordinary case: the window is read in the hand, the
        // screen across a room.
        expect(doc.status.word.toUpperCase(), `${role} @ ${seconds}`).toBe(primary.word);
        expect(doc.status.means.toUpperCase()).toBe(primary.lead);
      }
    }
  });

  it('takes the Prover’s counts from the tally, never from a second schedule', () => {
    const state = demoAt(26, 0, true);
    const doc = windowDoc(state, { agent: 'prover' });
    const tally = proverTally(26 - 23, 'PASS');
    const checks = doc.sections
      .flatMap((section) => section.blocks)
      .find((block): block is Extract<Block, { kind: 'checks' }> => block.kind === 'checks');
    expect(checks?.rows.length).toBe(PROVER_CHECKS);
    expect(checks?.rows.map((row) => row.state)).toEqual(tally.checks.map((c) => c.state));
    expect(checks?.rows.map((row) => row.name)).toEqual([...CHECK_NAMES]);
  });
});

describe('the sixteen capabilities the brief lists are carried, not claimed', () => {
  const kinds = new Set<BlockKind>();
  for (const { loop, seconds } of everyBeat()) {
    for (const doc of docsAt(loop, seconds)) {
      for (const block of [
        ...doc.messages.flatMap((message) => message.blocks),
        ...doc.sections.flatMap((section) => section.blocks),
      ]) {
        kinds.add(block.kind);
      }
    }
  }

  it.each(CAPABILITIES.map((capability) => capability.id))(
    '%s is carried by a block or a control that exists',
    (id) => {
      const capability = CAPABILITIES.find((entry) => entry.id === id);
      if (!capability) throw new Error(`no capability ${id}`);
      for (const kind of capability.carriedBy) {
        expect(kinds, `${id} wants a ${kind} block`).toContain(kind);
      }
      if (capability.control) {
        const found = Object.values(sources).some((text) =>
          text.includes(capability.control ?? ''),
        );
        expect(found, `${id} wants the ${capability.control} control`).toBe(true);
      }
      // None of the sixteen is live, and the type refuses to say otherwise.
      expect(capability.live).toBe(false);
    },
  );
});

describe('there is no session, and nothing pretends there is', () => {
  it('never reports anything as sent', () => {
    const outcome = NO_SESSION.send('anything at all');
    expect(outcome.sent).toBe(false);
    expect(outcome.kept).toBe(true);
    expect(outcome.note).toMatch(/is not sent/i);
    expect(outcome.note).toMatch(
      /no agents are actually running|nothing running behind this build/i,
    );
  });

  it('never performs a control, and says the decision is the owner’s', () => {
    for (const action of SESSION_ACTIONS) {
      const outcome = NO_SESSION.act(action.id);
      expect(outcome.performed).toBe(false);
      expect(outcome.note).toMatch(/not available/);
    }
    // **The property, not the sentence.** It quoted *"merge is the owner's
    // alone"* verbatim; the plain-language pass says the same thing without
    // the word *merge* doing the work — what has to survive is that the note
    // names the owner as the only one who can put a change into the project.
    expect(NO_SESSION.act('approve').note).toMatch(/only you can put a change into the project/i);
  });

  it('carries the five controls and marks the owner-only ones', () => {
    expect(SESSION_ACTIONS.map((action) => action.id)).toEqual([
      'approve',
      'reject',
      'pause',
      'stop',
      'resume',
    ]);
    expect(SESSION_ACTIONS.filter((action) => action.ownerOnly).map((a) => a.id)).toEqual([
      'approve',
      'reject',
    ]);
  });

  it('makes no request of any kind: no fetch, no storage, no worker', () => {
    for (const [name, text] of Object.entries(sources)) {
      for (const forbidden of [
        'fetch(',
        'XMLHttpRequest',
        'WebSocket',
        'localStorage',
        'sessionStorage',
        'indexedDB',
        'navigator.sendBeacon',
      ]) {
        expect(text.includes(forbidden), `${name} uses ${forbidden}`).toBe(false);
      }
    }
  });
});

describe('the functional interface text is DOM text and never enters the canvas', () => {
  it('gives the window no access to three.js at all', () => {
    for (const [name, text] of Object.entries(sources)) {
      expect(text.includes("from 'three'"), name).toBe(false);
      expect(text.includes('@react-three'), name).toBe(false);
      expect(text.includes("getContext('2d')"), name).toBe(false);
      expect(text.includes('CanvasTexture'), name).toBe(false);
    }
  });

  /**
   * **This assertion was replaced, and the replacement is stronger.**
   *
   * It required every scripted-mode document to carry the amber
   * `Illustrative · not real state` band and its `scripted demonstration`
   * paragraph. The owner's instruction of 9 September removes them —
   * *"Remove all signs of Demo from the entire system except one small spot"*
   * — so the old form now asserts the presence of something the product is
   * required **not** to have.
   *
   * The replacement is the inverse and covers more ground: it walks **every
   * word of every document at every beat of every loop**, including every
   * message, every expandable section and every block inside one, and fails
   * if any of the removed vocabulary appears anywhere. Where the old
   * assertion held two strings in one place, this one holds the whole of the
   * window's rendered text — so the text cannot creep back into a section, a
   * summary or a message the way it accumulated in the first place.
   */
  const REMOVED = /illustrative|not real state|scripted|demonstration|demo\b/i;

  it('says nothing anywhere about being a demonstration', () => {
    for (const { loop, seconds } of everyBeat()) {
      for (const doc of docsAt(loop, seconds)) {
        expect(doc.honesty, `${doc.key} @ loop ${loop} ${seconds}s carries a marking`).toBe(
          undefined,
        );
        for (const text of allText(doc)) {
          expect(
            REMOVED.test(text),
            `${doc.key} @ loop ${loop} ${seconds}s says "${text.slice(0, 120)}"`,
          ).toBe(false);
        }
      }
    }
  });

  it('keeps the recorded run’s own marking, which is a different claim', () => {
    // Boundary: the replay says the run **did** happen and every figure is
    // read out of this repository's committed record. That is provenance, not
    // demo signage, and the instruction does not touch it.
    for (const doc of replayDocsAt(0, 20)) {
      expect(doc.honesty?.title, doc.key).toBe('A saved example being replayed');
    }
  });
});

/**
 * **Slice four: the Prover's window, when the checks are real.**
 *
 * The recorded window draws six checks from a fixed schedule. Given a live
 * answer it must draw what GitHub reported instead, and the defect it would be
 * easiest to ship is the two side by side — real names above recorded ones, all
 * under one heading, with no way for a reader to tell which is which.
 */
describe('the Prover’s window draws the checks that actually ran', () => {
  const base = demoAt(0, 0, false);
  const live = (
    rows: { name: string; state: 'running' | 'passed' | 'failed' | 'skipped' }[],
    noResult = 0,
  ) =>
    windowDoc({ ...base, checks: { rows, noResult, source: 'check runs' } }, { agent: 'prover' });

  it('lists every check it was given, by its own name', () => {
    const doc = live([
      { name: 'a name the recording never uses', state: 'passed' },
      { name: 'another it never uses', state: 'failed' },
    ]);
    const said = allText(doc).join(' ');
    expect(said).toContain('a name the recording never uses');
    expect(said).toContain('another it never uses');
  });

  it('does not draw the recording’s six checks beside them', () => {
    const said = allText(live([{ name: 'the only check that ran', state: 'passed' }])).join(' ');
    for (const name of CHECK_NAMES) {
      expect(said, name).not.toContain(name);
    }
  });

  it('says a check returned no result, and never lists it as one that ran', () => {
    const doc = live([{ name: 'the one that reported', state: 'passed' }], 1);
    const said = allText(doc).join(' ');
    expect(said).toMatch(/1 check returned no result/i);
    const rows = doc.sections
      .flatMap((section) => section.blocks)
      .filter((block): block is Extract<Block, { kind: 'checks' }> => block.kind === 'checks')
      .flatMap((block) => block.rows);
    expect(rows).toHaveLength(1);
  });

  it('uses only the four words the constitution has, in every row it draws', () => {
    const doc = live([
      { name: 'one', state: 'passed' },
      { name: 'two', state: 'failed' },
      { name: 'three', state: 'running' },
      { name: 'four', state: 'skipped' },
    ]);
    const rows = doc.sections
      .flatMap((section) => section.blocks)
      .filter((block): block is Extract<Block, { kind: 'checks' }> => block.kind === 'checks')
      .flatMap((block) => block.rows);
    expect(rows.map((row) => row.state).sort()).toEqual(['failed', 'passed', 'running', 'skipped']);
  });

  it('names which GitHub question the results came from', () => {
    expect(allText(live([{ name: 'one', state: 'passed' }])).join(' ')).toContain('check runs');
  });

  it('draws no verdict on the work from checks passing', () => {
    // The oldest rule in this file and the reason `keeperVerdict` is never
    // inferred: checks passing is the Prover's evidence, not the Keeper's
    // conclusion. A window that says PASS because everything went green has
    // decided something no check decided.
    const said = allText(
      live([
        { name: 'one', state: 'passed' },
        { name: 'two', state: 'passed' },
      ]),
    ).join(' ');
    expect(said).not.toMatch(/\bPASS\b|\bAPPROVED\b|\bBLOCKED\b/);
  });

  it('says nothing is known when nothing reported, rather than filling the quiet', () => {
    const doc = live([]);
    expect(doc.conclusion.headline).toBe('No checks have reported yet');
    // Not "all 0 passed", which is true of an empty list and says the opposite
    // of what is known.
    expect(doc.conclusion.headline).not.toMatch(/passed/i);
    expect(allText(doc).join(' ')).toMatch(/reported no checks at all/i);
  });

  it('carries no scripted dialogue, because no agent said anything about these', () => {
    expect(live([{ name: 'one', state: 'passed' }]).messages).toEqual([]);
  });

  it('leads with meaning, never with a table', () => {
    const doc = live([{ name: 'one', state: 'failed' }]);
    expect(doc.conclusion.headline.length).toBeGreaterThan(0);
    expect(doc.sections[0]?.blocks[0]?.kind).not.toBe('table');
  });

  it('the recorded window is untouched when there are no live checks', () => {
    const doc = windowDoc(base, { agent: 'prover' });
    const said = allText(doc).join(' ');
    expect(said).toContain(CHECK_NAMES[0]);
  });
});

/**
 * **The Keeper's KP7-01 and KP7-02, held by tests rather than by a comment.**
 *
 * KP7-01 was the worst defect this project could ship and the first build of
 * slice four shipped it: when GitHub could not be asked about the checks at all,
 * the live Prover's window fell through to the recorded document and drew the
 * recording's fourteen invented checks under `14 finished, 0 still to come`,
 * with `14 checks have run and passed so far` marked `verified` — a fixture
 * presented as evidence, on the one surface whose subject is that distinction,
 * on a page whose badge simultaneously said the results could not be read.
 *
 * The approved brief had named this case in its own words: *"It draws nothing
 * when nothing was read … not zero, not empty, not `skipped`."*
 */
describe('when the checks were not read, the Prover’s window says so and draws nothing', () => {
  const base = demoAt(0, 0, false);
  // `null`, not absent: a live answer that read no checks. The recording leaves
  // the field off entirely, and that is the difference the window turns on.
  const notRead = (checksReason: string | null = null) =>
    windowDoc({ ...base, mode: 'live', checks: null, checksReason }, { agent: 'prover' });

  it('never draws one of the recording’s checks', () => {
    const said = allText(notRead()).join(' ');
    for (const name of CHECK_NAMES) {
      expect(said, name).not.toContain(name);
    }
  });

  it('lists no checks at all, rather than zero of them', () => {
    const rows = notRead()
      .sections.flatMap((section) => section.blocks)
      .filter((block): block is Extract<Block, { kind: 'checks' }> => block.kind === 'checks');
    expect(rows).toEqual([]);
  });

  it('marks nothing as verified, because nothing was read', () => {
    const standings = notRead()
      .sections.flatMap((section) => section.blocks)
      .filter((block): block is Extract<Block, { kind: 'facts' }> => block.kind === 'facts')
      .flatMap((block) => block.rows)
      .map((row) => row.standing);
    expect(standings.length).toBeGreaterThan(0);
    expect(standings).not.toContain('verified');
  });

  it('says the results were not read, and does not say none ran', () => {
    const doc = notRead();
    expect(doc.conclusion.headline).toBe('The check results were not read');
    const said = allText(doc).join(' ');
    expect(said).toMatch(/could not be read this time, so none are shown/);
    expect(said).not.toMatch(/\b0 checks\b|no checks ran/i);
  });

  it('says the same sentence the badge on the same page says', () => {
    // Two surfaces, one fact, one vocabulary. The wording is lifted from
    // MobileRoom's badge deliberately.
    expect(allText(notRead()).join(' ')).toContain('not zero, which would be a different claim');
  });

  it('names which sources refused when the answer said, and admits it when it did not', () => {
    const why = 'No source could be read: check runs (403), workflow runs (403).';
    expect(allText(notRead(why)).join(' ')).toContain(why);
    expect(allText(notRead()).join(' ')).toMatch(/No reason came back with the answer/);
  });

  it('the recording is untouched: absent checks still draw the recorded six', () => {
    expect(allText(windowDoc(base, { agent: 'prover' })).join(' ')).toContain(CHECK_NAMES[0]);
  });
});

describe('a check that did not run is never counted as one that passed', () => {
  const base = demoAt(0, 0, false);
  const live = (rows: { name: string; state: 'running' | 'passed' | 'failed' | 'skipped' }[]) =>
    windowDoc(
      { ...base, checks: { rows, noResult: 0, source: 'check runs' } },
      { agent: 'prover' },
    );

  it('does not say all passed when one was skipped — KP7-02', () => {
    const doc = live([
      { name: 'one that ran', state: 'passed' },
      { name: 'one that did not', state: 'skipped' },
    ]);
    expect(doc.conclusion.headline).not.toMatch(/^All /);
    expect(doc.conclusion.headline).toContain('did not run');
  });

  it('does not say all passed when every check was skipped', () => {
    const doc = live([{ name: 'the only one', state: 'skipped' }]);
    expect(doc.conclusion.headline).toBe('1 check did not run');
    expect(doc.conclusion.headline).not.toMatch(/All \d|passed/i);
  });

  it('still says all passed when they all actually did', () => {
    const doc = live([
      { name: 'one', state: 'passed' },
      { name: 'two', state: 'passed' },
    ]);
    expect(doc.conclusion.headline).toBe('All 2 checks passed');
  });

  it('the headline never contradicts the facts block beneath it', () => {
    const doc = live([
      { name: 'one that ran', state: 'passed' },
      { name: 'one that did not', state: 'skipped' },
    ]);
    const facts = doc.sections
      .flatMap((section) => section.blocks)
      .filter((block): block is Extract<Block, { kind: 'facts' }> => block.kind === 'facts')
      .flatMap((block) => block.rows);
    expect(facts.some((row) => /did not run/.test(row.text))).toBe(true);
    expect(doc.conclusion.headline).not.toMatch(/All 2 checks passed/);
  });
});

/**
 * **The test the audit said would have caught three findings at once — SA-U-05.**
 *
 * `SA-U-01` and `SA-U-02` were not subtle. On a healthy live page about a real
 * branch, the Fabricator's window drew eight invented file paths and a terminal
 * reporting `Tests 801 passed (801)`, and the Keeper's drew three invented
 * review findings. 1,679 tests did not catch it, and the auditor established
 * exactly why: **no test in this repository passed a live state to `windowDoc`
 * for the Fabricator or the Keeper.** No file imported both `stateFromAnswer`
 * and `windowDoc`. Every live-mode window assertion targeted the Prover.
 *
 * The defect was not hard to see. It was outside every test's argument range.
 *
 * So this builds a live state the way the product builds one — through
 * `stateFromAnswer`, from an answer shaped like the endpoint's — and asserts of
 * **every** window that not one string from the recording's fixtures appears in
 * it. It is deliberately written over all four agents rather than the two that
 * were wrong, because the next window added will be wrong in the same way.
 */
describe('no window on a live page may draw one word of the recording', () => {
  const LIVE: Record<string, unknown> = {
    ok: true,
    asOf: '2026-09-11T16:00:00Z',
    repo: 'a-repository/that-is-not-the-fixture',
    branch: 'claude/a-branch-the-recording-never-names',
    branchExists: true,
    head: {
      sha: 'c0ffee11c0ffee11c0ffee11c0ffee11c0ffee11',
      shortSha: 'c0ffee1',
      message: 'A commit the recording never names',
      committedAt: '2026-09-11T15:41:40Z',
    },
    pull: null,
    checks: {
      total: 2,
      passed: 2,
      failed: 0,
      running: 0,
      noResult: 0,
      source: 'check runs',
      runs: [
        { name: 'a check the recording never names', state: 'passed' },
        { name: 'another it never names', state: 'passed' },
      ],
    },
    sessionReport: null,
    sessionReportStatus: 'absent',
  };

  const live = () => {
    const state = stateFromAnswer(LIVE as never, Date.parse('2026-09-11T16:00:30Z'));
    if (!state) throw new Error('the fixture no longer produces a live state');
    return state;
  };

  it('builds a live state at all, or every assertion below is vacuous', () => {
    const state = live();
    expect(state.mode).toBe('live');
    expect(state.content.branch).toBe('claude/a-branch-the-recording-never-names');
    expect(state.content.candidateId).toBe('c0ffee1');
  });

  for (const agent of AGENTS) {
    it(`the ${agent}’s window contains no recorded file, commit, command or finding`, () => {
      const said = allText(windowDoc(live(), { agent })).join(' ');
      // The recording's own identifiers. Each is drawn somewhere in demo mode
      // and must be drawn nowhere in live mode.
      for (const invented of [
        'src/world/window/AgentWindow.tsx',
        '801 passed',
        'claude/virgil-mobile-v11',
        '9abcdef',
        'KV-01',
        'KV-02',
        'KV-03',
        '4d1a9c2',
        'V11 stage 3 — the windows',
      ]) {
        expect(said, `${agent} drew "${invented}"`).not.toContain(invented);
      }
    });

    it(`the ${agent}’s window never says a thing happened and that nothing happened`, () => {
      // SA-U-03: the Fabricator's summary read “No commands have run” with a
      // terminal showing a command that ran directly beneath it. One document,
      // two answers, both on screen at once.
      const doc = windowDoc(live(), { agent });
      const blocks = doc.sections.flatMap((section) => section.blocks);
      const claimsActivity = blocks.some((block) =>
        ['terminal', 'files', 'commits', 'findings', 'pr'].includes(block.kind),
      );
      const claimsNone = allText(doc)
        .join(' ')
        .match(/No commands have run|is not working|Nothing has been read|has not been given/i);
      expect(
        claimsActivity && claimsNone !== null,
        `${agent} both draws activity and says there is none`,
      ).toBe(false);
    });
  }

  it('the recording is untouched: a scripted state still draws its own record', () => {
    const said = allText(windowDoc(demoAt(20, 0, true), { agent: 'fabricator' })).join(' ');
    expect(said).toContain('src/world/window/AgentWindow.tsx');
  });
});
