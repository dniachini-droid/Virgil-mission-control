import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// @ts-expect-error — the deployed Netlify function, deliberately outside this
// app's TypeScript program. It is imported so the bytes this script writes can
// be held to the checker that actually runs on the wire, rather than to a
// description of it. Taken off a namespace import for the reason given in
// `live-state-v11.test.ts`: a named import long enough to wrap moves the
// unresolved module off the line this directive covers.
import * as stateFunction from '../../../netlify/functions/state.mjs';
import { Conversation } from '../../../packages/agent-contracts/src/live.js';

const { conversationComplaint } = stateFunction as {
  conversationComplaint: (value: unknown) => string | null;
};

/**
 * **The script that writes what Virgil said, run for real.**
 *
 * Phase 2 slice six (`docs/process/PHASE_2_SLICE_6_BRIEF.md`). `virgil-status.mjs`
 * has no test and has already written a file the site refused twice — `KP4-08`
 * and `KP5-06` are both that failure, found by review rather than by a check.
 * This one writes the owner's conversation, which is the only thing in the
 * project he will read as *Virgil's words*, so it is executed here rather than
 * described: every case runs `node scripts/virgil-conversation.mjs` against a
 * throwaway directory and reads the bytes it left.
 *
 * Every result is held to **both** checkers — the Zod schema and the deployed
 * wire twin — because a writer that satisfies one and not the other produces a
 * file that is committed, pushed, and then not drawn.
 */

const SCRIPT = resolve(import.meta.dirname, '../../../scripts/virgil-conversation.mjs');
const QUESTION = 'What is the state of things?';
const RUN = 'https://github.com/owner/repo/actions/runs/34613415976';

let root: string;

function run(
  args: string[],
  env: Record<string, string> = {},
): { ok: boolean; out: string; err: string } {
  try {
    const out = execFileSync('node', [SCRIPT, ...args], {
      encoding: 'utf8',
      env: {
        ...process.env,
        VIRGIL_CONVERSATION_ROOT: root,
        VIRGIL_QUESTION: QUESTION,
        ...env,
      },
    });
    return { ok: true, out, err: '' };
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string };
    return { ok: false, out: e.stdout ?? '', err: e.stderr ?? '' };
  }
}

interface Exchange {
  id: string;
  askedAt: string;
  question: string;
  state: string;
  answeredAt: string | null;
  answer: string | null;
  reason: string | null;
  runUrl: string | null;
}

function read(): { schema: string; updatedAt: string; exchanges: Exchange[] } {
  return JSON.parse(readFileSync(resolve(root, '.virgil/conversation.json'), 'utf8'));
}

/** The first exchange, insisted on rather than indexed into. */
function only(): Exchange {
  const { exchanges } = read();
  expect(exchanges).toHaveLength(1);
  return exchanges[0] as Exchange;
}

function first(): Exchange {
  const { exchanges } = read();
  expect(exchanges.length).toBeGreaterThan(0);
  return exchanges[0] as Exchange;
}

/** The one assertion every case makes: the site can read what was written. */
function bothAccept(value: unknown) {
  const bySchema = Conversation.safeParse(value);
  expect(
    { schema: bySchema.success, wire: conversationComplaint(value) },
    `schema: ${bySchema.success ? 'ok' : JSON.stringify(bySchema.error?.issues)}, wire: ${conversationComplaint(value)}`,
  ).toEqual({ schema: true, wire: null });
}

function answerFile(text: string): string {
  const path = resolve(root, 'answer.txt');
  writeFileSync(path, text);
  return path;
}

beforeEach(() => {
  root = mkdtempSync(resolve(tmpdir(), 'virgil-conversation-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('the question is written down before the agent starts', () => {
  it('writes a conversation both checkers accept', () => {
    expect(run(['--ask', '--id', '1', '--run-url', RUN]).ok).toBe(true);
    const value = read();
    bothAccept(value);
    expect(value).toMatchObject({
      schema: 'virgil.conversation.v1',
      exchanges: [{ id: '1', question: QUESTION, state: 'asked', answer: null, runUrl: RUN }],
    });
  });

  it('never writes a summary of the message in place of the message', () => {
    const typed = 'fix the branch cap, and tell me what you changed';
    run(['--ask', '--id', '1'], { VIRGIL_QUESTION: typed });
    expect(only().question).toBe(typed);
  });

  it('refuses to write an exchange with no message, rather than an empty one', () => {
    const result = run(['--ask', '--id', '1'], { VIRGIL_QUESTION: '   ' });
    expect(result.ok).toBe(false);
    expect(result.err).toContain('VIRGIL_QUESTION');
  });

  it('drops a run url that is not one a browser would navigate to', () => {
    // The value becomes an `href` on the owner's phone. Refusing the whole write
    // would lose the message over a link; the link is what is dropped.
    run(['--ask', '--id', '1', '--run-url', 'javascript:alert(1)']);
    bothAccept(read());
    expect(only().runUrl).toBeNull();
  });

  it('asking twice for one run leaves one message, not two', () => {
    // A re-run of the workflow is the same question being picked up again.
    run(['--ask', '--id', '1']);
    run(['--ask', '--id', '1']);
    expect(read().exchanges).toHaveLength(1);
  });

  it('a second question is appended after the first, newest last', () => {
    run(['--ask', '--id', '1'], { VIRGIL_QUESTION: 'first' });
    run(['--ask', '--id', '2'], { VIRGIL_QUESTION: 'second' });
    const value = read();
    bothAccept(value);
    expect(value.exchanges.map((e) => e.question)).toEqual(['first', 'second']);
  });
});

describe('the answer is written when the session finishes', () => {
  it('answers the exchange the question was written into', () => {
    run(['--ask', '--id', '1', '--run-url', RUN]);
    expect(
      run(['--answer', '--id', '1', '--answer-file', answerFile('Two checks passed.')]).ok,
    ).toBe(true);
    bothAccept(read());
    expect(only()).toMatchObject({
      state: 'answered',
      answer: 'Two checks passed.',
      reason: null,
      runUrl: RUN,
    });
    expect(only().answeredAt).not.toBeNull();
  });

  it('keeps the time the question was asked, rather than restating it as now', () => {
    run(['--ask', '--id', '1']);
    const asked = only().askedAt;
    run(['--answer', '--id', '1', '--answer-file', answerFile('done')]);
    expect(only().askedAt).toBe(asked);
  });

  it('writes the answer even when the question was never written down', () => {
    // The step that records the question can fail. The brief's rule is that a
    // message must not disappear, and that applies hardest to the reply.
    expect(run(['--answer', '--id', '9', '--answer-file', answerFile('here it is')]).ok).toBe(true);
    const value = read();
    bothAccept(value);
    expect(value).toMatchObject({
      exchanges: [{ id: '9', question: QUESTION, state: 'answered', answer: 'here it is' }],
    });
  });

  it('a session that printed nothing has failed, and does not answer with silence', () => {
    run(['--ask', '--id', '1']);
    run(['--answer', '--id', '1', '--answer-file', answerFile('   \n  ')]);
    bothAccept(read());
    expect(only().state).toBe('failed');
    expect(only().answer).toBeNull();
    expect(only().reason).toContain('printed nothing');
  });

  it('shortens a reply too long for the shape, and says it did', () => {
    run(['--ask', '--id', '1']);
    run(['--answer', '--id', '1', '--answer-file', answerFile('x'.repeat(30_000))]);
    bothAccept(read());
    expect(only().answer?.length).toBeLessThanOrEqual(20_000);
    expect(only().answer).toContain('30000 characters');
  });

  it('refuses when the answer cannot be read, rather than writing an empty one', () => {
    run(['--ask', '--id', '1']);
    const result = run(['--answer', '--id', '1', '--answer-file', resolve(root, 'nothing.txt')]);
    expect(result.ok).toBe(false);
    // And the question it was written against is untouched, so the next attempt
    // still has something to answer.
    expect(only().state).toBe('asked');
  });
});

describe('a run that dies still leaves the question and the reason', () => {
  it('records the failure against the exchange', () => {
    run(['--ask', '--id', '1', '--run-url', RUN]);
    expect(run(['--fail', '--id', '1'], { VIRGIL_REASON: 'The run timed out.' }).ok).toBe(true);
    bothAccept(read());
    expect(only()).toMatchObject({
      state: 'failed',
      answer: null,
      answeredAt: null,
      reason: 'The run timed out.',
      runUrl: RUN,
    });
  });

  it('writes the question too, when the run died before recording it', () => {
    expect(run(['--fail', '--id', '9'], { VIRGIL_REASON: 'The install failed.' }).ok).toBe(true);
    const value = read();
    bothAccept(value);
    expect(value).toMatchObject({
      exchanges: [{ id: '9', question: QUESTION, state: 'failed', reason: 'The install failed.' }],
    });
  });

  it('will not say something failed without saying what is known about why', () => {
    run(['--ask', '--id', '1']);
    const result = run(['--fail', '--id', '1'], { VIRGIL_REASON: '' });
    expect(result.ok).toBe(false);
    expect(result.err).toContain('VIRGIL_REASON');
  });

  it('shortens a reason too long for the shape', () => {
    run(['--fail', '--id', '1'], { VIRGIL_REASON: 'y'.repeat(2000) });
    bothAccept(read());
    expect(first().reason?.length).toBeLessThanOrEqual(600);
  });
});

describe('the file stays inside the shape the site will accept', () => {
  it('rolls the oldest message off at the cap rather than writing a file that is refused', () => {
    // The cap is the schema's. The uncapped record is git, which is where the
    // permanent record has always been.
    //
    // **Seeded rather than spoken fifty times.** The first version of this ran
    // the script 53 times, which passed alone and timed out under the parallel
    // suite — a check that goes red for how busy the machine is teaches everyone
    // to ignore it. The behaviour under test is the roll-off, and two real runs
    // against a full file exercise it exactly.
    mkdirSync(resolve(root, '.virgil'), { recursive: true });
    writeFileSync(
      resolve(root, '.virgil/conversation.json'),
      JSON.stringify({
        schema: 'virgil.conversation.v1',
        updatedAt: '2026-09-12T05:00:00Z',
        exchanges: Array.from({ length: 50 }, (_, i) => ({
          id: String(i + 1),
          askedAt: '2026-09-12T05:00:00Z',
          question: `message ${i + 1}`,
          state: 'asked',
          answeredAt: null,
          answer: null,
          reason: null,
          runUrl: null,
        })),
      }),
    );

    run(['--ask', '--id', '51'], { VIRGIL_QUESTION: 'message 51' });
    run(['--ask', '--id', '52'], { VIRGIL_QUESTION: 'message 52' });

    const value = read();
    bothAccept(value);
    expect(value.exchanges).toHaveLength(50);
    expect(value.exchanges[0]?.id).toBe('3');
    expect(value.exchanges.at(-1)?.id).toBe('52');
  });

  it('shortens a message longer than the shape holds rather than losing it', () => {
    run(['--ask', '--id', '1'], { VIRGIL_QUESTION: 'q'.repeat(5000) });
    bothAccept(read());
    expect(only().question.length).toBeLessThanOrEqual(4000);
    expect(only().question).toContain('5000 characters');
  });

  it('refuses an id the shape cannot hold, rather than writing one it will not accept', () => {
    const result = run(['--ask', '--id', 'x'.repeat(65)]);
    expect(result.ok).toBe(false);
  });
});

describe('a conversation that cannot be read is kept, not destroyed', () => {
  it('moves the unreadable file aside and starts a fresh one', () => {
    writeFileSync(resolve(root, '.virgil'), '', { flag: 'w' });
    rmSync(resolve(root, '.virgil'));
    run(['--ask', '--id', '1'], { VIRGIL_QUESTION: 'first' });
    writeFileSync(resolve(root, '.virgil/conversation.json'), '{ this is not json');

    const result = run(['--ask', '--id', '2'], { VIRGIL_QUESTION: 'second' });
    expect(result.ok).toBe(true);

    const value = read();
    bothAccept(value);
    expect(value).toMatchObject({ exchanges: [{ id: '2', question: 'second' }] });
    // Nothing was deleted: the bytes are beside it, committed with the rest.
    expect(readFileSync(resolve(root, '.virgil/conversation.broken.json'), 'utf8')).toBe(
      '{ this is not json',
    );
  });

  it('treats a file from another schema the same way, rather than appending to it', () => {
    run(['--ask', '--id', '1']);
    writeFileSync(
      resolve(root, '.virgil/conversation.json'),
      JSON.stringify({ schema: 'virgil.conversation.v2', updatedAt: 'x', exchanges: [] }),
    );
    run(['--ask', '--id', '2'], { VIRGIL_QUESTION: 'second' });
    bothAccept(read());
    expect(read().exchanges.map((e) => e.id)).toEqual(['2']);
  });
});

describe('the script refuses to be asked for something it cannot do', () => {
  it('refuses two commands at once', () => {
    const result = run(['--ask', '--answer', '--id', '1', '--answer-file', answerFile('x')]);
    expect(result.ok).toBe(false);
  });

  it('refuses none', () => {
    expect(run(['--id', '1']).ok).toBe(false);
  });

  it('refuses without a run id, which is what a reply is matched to', () => {
    expect(run(['--ask']).ok).toBe(false);
  });
});
