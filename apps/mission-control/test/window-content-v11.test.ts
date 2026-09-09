import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
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
    expect(outcome.note).toMatch(/no session behind this build/);
  });

  it('never performs a control, and says merge is the owner’s', () => {
    for (const action of SESSION_ACTIONS) {
      const outcome = NO_SESSION.act(action.id);
      expect(outcome.performed).toBe(false);
      expect(outcome.note).toMatch(/not available/);
    }
    expect(NO_SESSION.act('approve').note).toMatch(/merge is the owner’s alone/);
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
      expect(doc.honesty?.title, doc.key).toBe('A recorded run, replayed');
    }
  });
});
