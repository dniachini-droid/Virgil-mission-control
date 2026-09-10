import { describe, expect, it } from 'vitest';
import { playbackSchedule, replayAt } from '../src/world/replay/replayTimeline.js';
import { ROLES, type Role } from '../src/world/room/cast.js';
import { demoAt, loopLength, OUTCOMES } from '../src/world/room/demo.js';
import { plainly } from '../src/world/screens/v11/content.js';
import { contentFor } from '../src/world/screens/v11/recorded.js';
import { drawConsoleScreen, drawSlab, type SlabKind } from '../src/world/screens/v11/screens.js';
import { blockText, type Section } from '../src/world/window/blocks.js';
import { NO_SESSION, SESSION_ACTIONS } from '../src/world/window/session.js';
import {
  AGENTS,
  type Agent,
  type WindowDoc,
  windowDoc,
} from '../src/world/window/windowContent.js';
import { COMPOSER_NOTE } from '../src/world/window/windowStore.js';

/**
 * **Every sentence in the interface has to be understandable by somebody who
 * has never read this repository's documents.**
 *
 * The owner read this line in Virgil's window —
 *
 * > Every merge gate passes. The candidate is eligible and it is not merged…
 * > Merge is yours alone, in every phase, and nothing in this interface is a
 * > path to one. Nothing proceeds until you decide.
 *
 * — and said: *"That sentence is jargon. Make the sentences make sense. Owner
 * decision required. Or something. Make it actually mean something in
 * English."* He is not a software engineer, he has never read
 * `constitution/STATE_LANGUAGE.md`, and he should not have to in order to use
 * his own product.
 *
 * **The distinction this file holds.** The constitution's own state words —
 * `READY_FOR_REVIEW`, `BUILDING`, `SAFE_TO_MERGE`, the four verdicts — are
 * shown because they are checkable truth, they come from
 * `constitution/authority.json`, and other tests hold them there. They are
 * *labels*, and none of them is touched. What this file governs is the
 * **prose around them**, which had been written in the same vocabulary as the
 * labels — which is exactly what made it unreadable.
 *
 * Not one of the fifteen candidate states or the four verdicts contains a word
 * on the list below, so no exemption for a label is needed: the ban and the
 * vocabulary do not overlap. The only exemption is for a **token** — a path, a
 * file name, a branch, a command — which is a name and not a sentence.
 *
 * It is asserted over **every screen and every window at every half second of
 * all three loops**, and over the replay's own beats, because that is where
 * the vocabulary accumulated in the first place: one sentence at a time, in
 * places nobody re-read.
 */

/**
 * The words the owner named, plus the ones his rule reaches that his list did
 * not happen to name. Each is banned as a whole word, case-insensitively, so a
 * sentence-case leak is caught as surely as a shouted one.
 *
 * Where a term has no short English equivalent — `SAFE_TO_MERGE` is an
 * example — the remedy is to **say the thing itself** rather than to reach for
 * a synonym, and the label carries it.
 */
const JARGON: readonly { word: RegExp; plainly: string }[] = [
  { word: /\bhops?\b/i, plainly: 'a step, or the name of the step' },
  { word: /\bcandidates?\b/i, plainly: 'the change' },
  { word: /\bgates?\b/i, plainly: 'the checks, or what has to pass' },
  { word: /\beligib\w*\b/i, plainly: 'ready to go in' },
  { word: /\btiers?\b/i, plainly: 'what it is allowed to do' },
  { word: /\bgrants?\b|\bgranted\b/i, plainly: 'what it was given, and its limits' },
  { word: /\bin flight\b/i, plainly: 'being worked on' },
  { word: /\bverdicts? (?:has |have )?returned\b/i, plainly: 'the review has come back' },
  { word: /\bdeterministic\w*\b/i, plainly: 'the checks' },
  { word: /\bprovenance\b/i, plainly: 'where it came from' },
  { word: /\btethers?\b|\btethered\b/i, plainly: 'the link back to the source' },
  { word: /\blineage\b/i, plainly: 'its history' },
  { word: /\bimmutable\b/i, plainly: 'never changed afterwards' },
  { word: /\bartefacts?\b|\bartifacts?\b/i, plainly: 'the thing that was built' },
  { word: /\bhand-?offs?\b/i, plainly: 'passing the work on' },
  { word: /\bworktrees?\b/i, plainly: 'its own copy of the project' },
  { word: /\bremit\b/i, plainly: 'what it is for' },
  { word: /\bepistemic\w*\b/i, plainly: 'what is known, and how' },
];

/**
 * A token is a name, not a sentence: a path, a file name, a branch, a command,
 * a SHA. It keeps its own spelling because it **is** that spelling — the
 * schema really is called `candidate-artifact.json` and calling it anything
 * else in the interface would be a lie about a file. Dropped before the ban is
 * applied, and nothing else is.
 */
const EXEMPT: readonly { token: string; because: string }[] = [
  { token: 'gate-engine', because: 'the workspace package @virgil/gate-engine, named in a check' },
  { token: 'candidate-artifact.json', because: 'the file schemas/candidate-artifact.schema.json' },
];

function withoutTokens(text: string): string {
  let stripped = text;
  for (const entry of EXEMPT) stripped = stripped.split(entry.token).join(' ');
  return stripped
    .split(/\s+/)
    .filter((word) => {
      const bare = word.replace(/^[`(*_"'“]+|[`),.*_"'”]+$/g, '');
      if (bare === '') return true;
      if (bare.includes('/') || bare.includes('\\')) return false;
      if (/^[A-Za-z0-9@._-]+\.[A-Za-z]{2,4}$/.test(bare)) return false;
      return true;
    })
    .join(' ');
}

/** Every string a window document puts on screen, in one array. */
function windowText(doc: WindowDoc): string[] {
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

/** A 2D context that records the text drawn on it and does nothing else. */
function recorder(width: number, height: number) {
  const text: string[] = [];
  let size = 16;
  const gradient = { addColorStop: () => undefined };
  const ctx = {
    canvas: { width, height },
    get font() {
      return `${size}px x`;
    },
    set font(value: string) {
      const parsed = /(\d+(?:\.\d+)?)px/.exec(value);
      size = parsed ? Number(parsed[1]) : 16;
    },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    textAlign: 'left',
    textBaseline: 'top',
    letterSpacing: '0em',
    imageSmoothingQuality: 'high',
    save: () => undefined,
    restore: () => undefined,
    translate: () => undefined,
    scale: () => undefined,
    rotate: () => undefined,
    clip: () => undefined,
    beginPath: () => undefined,
    closePath: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    quadraticCurveTo: () => undefined,
    bezierCurveTo: () => undefined,
    arc: () => undefined,
    arcTo: () => undefined,
    absarc: () => undefined,
    ellipse: () => undefined,
    rect: () => undefined,
    fill: () => undefined,
    stroke: () => undefined,
    fillRect: () => undefined,
    strokeRect: () => undefined,
    clearRect: () => undefined,
    setLineDash: () => undefined,
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    measureText: (value: string) => ({ width: value.length * size * 0.6 }),
    fillText: (value: string) => {
      text.push(value);
    },
    strokeText: (value: string) => {
      text.push(value);
    },
  };
  return { ctx, text };
}

function drawnText(
  draw: (canvas: HTMLCanvasElement) => void,
  width: number,
  height: number,
): string[] {
  const { ctx, text } = recorder(width, height);
  const canvas = { width, height, getContext: () => ctx } as unknown as HTMLCanvasElement;
  draw(canvas);
  return text;
}

const CONSOLE_SIZE: Record<Role, [number, number]> = {
  fabricator: [1024, 603],
  prover: [1024, 549],
  keeper: [1024, 676],
};
const SLAB_SIZE: [number, number] = [1024, 679];
const SLABS: SlabKind[] = ['roles', 'verdict', 'candidate'];

/** Every word drawn on the six in-world displays at one beat. */
function screenText(state: ReturnType<typeof demoAt>, seconds: number, replay: boolean): string[] {
  const content = contentFor(state.content, replay ? 'replay' : 'demo');
  const all: string[] = [];
  for (const role of ROLES) {
    const member = state.cast[role];
    const [w, h] = CONSOLE_SIZE[role];
    all.push(
      ...drawnText(
        (canvas) =>
          drawConsoleScreen(canvas, {
            role,
            label: role,
            state: member.station,
            report: member.report,
            outcome: state.outcome,
            quiet: 0,
            corner: 80,
            t: seconds,
            since: 1.2,
            showBand: replay,
            candidateId: content.candidateId,
            branch: content.branch,
          }),
        w,
        h,
      ),
    );
  }
  for (const kind of SLABS) {
    all.push(
      ...drawnText(
        (canvas) =>
          drawSlab(canvas, {
            kind,
            content,
            outcome: state.outcome,
            seconds,
            corner: 20,
            t: seconds,
            since: 1.2,
            showBand: replay,
            replay,
          }),
        SLAB_SIZE[0],
        SLAB_SIZE[1],
      ),
    );
  }
  return all;
}

/** Every beat of every loop, at a half-second. The whole demonstration. */
function everyBeat(): { loop: number; seconds: number }[] {
  const out: { loop: number; seconds: number }[] = [];
  for (let loop = 0; loop < OUTCOMES.length; loop += 1) {
    for (let t = 0; t <= loopLength(loop); t += 0.5) out.push({ loop, seconds: t });
  }
  return out;
}

/**
 * Reported once per offending sentence rather than once per beat: the same
 * line appears at ninety beats and a list ninety times as long is not a
 * report, it is noise.
 */
function offences(where: string, texts: readonly string[]): string[] {
  const found = new Map<string, string>();
  for (const text of texts) {
    const scrubbed = withoutTokens(text);
    for (const entry of JARGON) {
      if (entry.word.test(scrubbed)) {
        found.set(`${text}::${entry.plainly}`, `${where}: "${text}" — say ${entry.plainly}`);
      }
    }
  }
  return [...found.values()];
}

/** The same, deduplicated across every beat it was collected from. */
function unique(found: readonly string[]): string[] {
  const seen = new Map<string, string>();
  for (const line of found) {
    const key = line.slice(line.indexOf(': "'));
    if (!seen.has(key)) seen.set(key, line);
  }
  return [...seen.values()];
}

describe('no sentence anywhere in the interface is written in the repository’s vocabulary', () => {
  it('holds for all four windows at every half-second of all three loops', () => {
    const found: string[] = [];
    for (const { loop, seconds } of everyBeat()) {
      const state = demoAt(seconds, loop, true);
      for (const agent of AGENTS) {
        const doc = windowDoc(state, { agent: agent as Agent });
        found.push(...offences(`${doc.key} @ loop ${loop} ${seconds}s`, windowText(doc)));
      }
    }
    expect(unique(found)).toEqual([]);
  });

  it('holds for the windows in the replay mode as well', () => {
    const found: string[] = [];
    for (const { loop, seconds } of everyBeat()) {
      const state = { ...demoAt(seconds, loop, true), mode: 'replay' as const };
      for (const agent of AGENTS) {
        const doc = windowDoc(state, { agent: agent as Agent });
        found.push(...offences(`replay ${doc.key} @ loop ${loop} ${seconds}s`, windowText(doc)));
      }
    }
    expect(unique(found)).toEqual([]);
  });

  it('holds for the six in-world displays at every half-second of all three loops', () => {
    const found: string[] = [];
    for (const { loop, seconds } of everyBeat()) {
      const state = demoAt(seconds, loop, true);
      found.push(
        ...offences(`screens @ loop ${loop} ${seconds}s`, screenText(state, seconds, false)),
      );
    }
    expect(unique(found)).toEqual([]);
  });

  it('holds for the six displays through every beat of the recorded run', () => {
    const found: string[] = [];
    for (const { beat, at } of playbackSchedule('fast')) {
      const state = replayAt(at + 0.05, 'fast', true);
      found.push(...offences(`replay screens @ ${beat.id}`, screenText(state, at, true)));
    }
    expect(unique(found)).toEqual([]);
  });

  it('holds for the window’s own furniture: the controls, the composer, the refusal', () => {
    const fixed = [
      ...SESSION_ACTIONS.flatMap((action) => [action.label, action.would]),
      ...SESSION_ACTIONS.map((action) => NO_SESSION.act(action.id).note),
      NO_SESSION.absence,
      NO_SESSION.send('x').note,
      COMPOSER_NOTE,
    ];
    expect(offences('furniture', fixed)).toEqual([]);
  });
});

/**
 * **The one translation that reaches shared text, and the line it may not
 * cross.** `content.ts`'s `plainly` rewords two words in the evidence lines
 * `tally.ts` and `replayTimeline.ts` produce, because rewording them at source
 * moves V10's clean-tree Owner Build and V11 is additive. A wording function
 * that could change a figure would be a much worse thing than the jargon it
 * removes, so it is held to substituting vocabulary and nothing else.
 */
describe('the shared evidence lines are reworded and never rewritten', () => {
  const lines = [
    'TESTS 302 PASSED · 0 FAILED',
    'TETHERS 88 · 88 INTACT',
    'EVERY DETERMINISTIC CHECK WAS GREEN',
    'FINDINGS 9 · BLOCKING 2',
    'MERGED AS cd0981d',
  ];

  it('says the two words plainly', () => {
    expect(plainly('TETHERS 88 · 88 INTACT')).toBe('SOURCE LINKS 88 · 88 INTACT');
    expect(plainly('EVERY DETERMINISTIC CHECK WAS GREEN')).toBe('EVERY CHECK WAS GREEN');
  });

  it('and changes no number, name or result in any of them', () => {
    for (const line of lines) {
      const before = line.match(/\d+|[a-f0-9]{7,}/g) ?? [];
      const after = plainly(line).match(/\d+|[a-f0-9]{7,}/g) ?? [];
      expect(after, line).toEqual(before);
      for (const word of ['PASSED', 'FAILED', 'BLOCKING', 'INTACT', 'MERGED', 'GREEN']) {
        expect(plainly(line).includes(word), `${line} lost ${word}`).toBe(line.includes(word));
      }
    }
  });

  it('leaves a line with neither word exactly as it was', () => {
    for (const line of lines.filter((l) => !/TETHERS|DETERMINISTIC/.test(l))) {
      expect(plainly(line)).toBe(line);
    }
  });
});

describe('the labels the constitution owns are untouched by the rule above', () => {
  it('because not one of them contains a word on the list', () => {
    const labels = [
      'BUILDING',
      'BUILDER_REPORTED_COMPLETE',
      'READY_FOR_REVIEW',
      'REVIEW_IN_PROGRESS',
      'SAFE_TO_MERGE',
      'MERGED',
      'OWNER_DECISION_REQUIRED',
      'PASS',
      'PASS_WITH_NON_BLOCKING_FINDINGS',
      'BLOCKED',
      'INSUFFICIENT_EVIDENCE',
    ];
    expect(offences('labels', labels)).toEqual([]);
  });
});

/**
 * **Plain is not shallow.** The point of the product is that it says true,
 * precise things; the pass says them in words a person uses. So the four
 * distinctions that could be lost by simplification are asserted **present**,
 * in the plain wording, at the beat where each one is live. A pass that
 * flattened any of them would satisfy the ban above and fail here.
 */
describe('the distinctions survive the plain words', () => {
  it('ready to go in is not gone in: the decision is still the owner’s', () => {
    const gate = demoAt(48, 0, true);
    expect(gate.content.ownerGate).toBe(true);
    const doc = windowDoc(gate, { agent: 'virgil' });
    const said = [doc.conclusion.headline, doc.conclusion.meaning, doc.conclusion.next].join(' ');
    expect(said).toMatch(/ready to go into the project/i);
    expect(said).toMatch(/your|you/i);
  });

  it('checked is not reviewed: the window says review is a separate step', () => {
    const passed = demoAt(30, 0, true);
    expect(passed.content.verdict).toBe('PASS');
    const doc = windowDoc(passed, { agent: 'prover' });
    const said = [doc.conclusion.meaning, doc.conclusion.next].join(' ');
    expect(said).toMatch(/review/i);
    expect(said).toMatch(/\bnot\b|\bnobody\b|\bseparate\b|\byet\b/i);
  });

  it('a builder’s word is not evidence, and the window says which it is', () => {
    const reported = demoAt(15, 0, true);
    const doc = windowDoc(reported, { agent: 'fabricator' });
    const said = [doc.conclusion.headline, doc.conclusion.meaning].join(' ');
    expect(said).toMatch(/nothing has been checked|not evidence|says/i);
  });

  it('a failed check and a check that could not run stay different things', () => {
    const blocked = windowDoc(demoAt(31, 1, true), { agent: 'virgil' });
    const missing = windowDoc(demoAt(31, 2, true), { agent: 'virgil' });
    const said = (doc: WindowDoc) => `${doc.conclusion.headline} ${doc.conclusion.meaning}`;
    expect(said(blocked)).toMatch(/failed/i);
    expect(said(missing)).toMatch(/could not run|couldn’t run|did not run/i);
    // The one that must never blur: a check that could not run is not a
    // failure, and no sentence at that beat may call it one.
    expect(said(missing)).not.toMatch(/\bfailed\b/i);
  });
});
