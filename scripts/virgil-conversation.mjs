#!/usr/bin/env node
/**
 * **Writes `.virgil/conversation.json`, so what the owner asked and what Virgil
 * answered survives the run that produced it.**
 *
 * Phase 2 slice six (`docs/process/PHASE_2_SLICE_6_BRIEF.md`). The brief's line
 * is the whole design of this file:
 *
 * > "A run that dies still leaves the question and the reason, because a message
 * > that disappears is worse than a message that fails."
 *
 * So the workflow calls this three times and not one: once to write the question
 * down *before* the agent starts, and once afterwards with `if: always()` to
 * write either the answer or the reason there is none. Nothing here depends on
 * the agent remembering to do anything, which is the same reason
 * `virgil-status.mjs` exists.
 *
 * Usage:
 *
 *   VIRGIL_QUESTION="..." node scripts/virgil-conversation.mjs --ask \
 *     --id 34613415976 --run-url https://github.com/o/r/actions/runs/34613415976
 *   VIRGIL_QUESTION="..." node scripts/virgil-conversation.mjs --answer \
 *     --id 34613415976 --answer-file "$RUNNER_TEMP/answer.txt"
 *   VIRGIL_QUESTION="..." VIRGIL_REASON="..." node scripts/virgil-conversation.mjs --fail \
 *     --id 34613415976
 *
 * **Every free-text value arrives through the environment**, never through the
 * command text. That is `KP2-06`: the workflow that calls this had one field
 * treated as data and the field beside it as code, in one JSON object, and the
 * repair was to stop writing values into commands at all. A file path and a run
 * id are arguments; the owner's prose and an agent's output are not.
 *
 * **Each command is complete on its own.** `--answer` given an id it cannot find
 * writes the exchange rather than refusing, because the step that was supposed
 * to create it may itself have failed — and an answer dropped on the floor for a
 * bookkeeping reason is exactly the disappearance the brief forbids.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The repository this writes into. `VIRGIL_CONVERSATION_ROOT` is a seam and is
 * named as one: it exists so the checks can run this script for real — every
 * branch of it, against files they can inspect — instead of asserting about a
 * copy of its logic. Nothing in the workflow sets it, and a script that is never
 * executed by a test is a script whose failure modes are discovered in
 * production.
 */
const repoRoot =
  process.env.VIRGIL_CONVERSATION_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = resolve(repoRoot, '.virgil/conversation.json');
const BROKEN = resolve(repoRoot, '.virgil/conversation.broken.json');

/**
 * The caps are the schema's, restated because this process cannot import it —
 * `packages/agent-contracts/src/live.ts`, held to the wire's copy by the
 * generated battery in `apps/mission-control/test/live-state-v11.test.ts`. A
 * value over a cap is shortened here rather than written and refused by the
 * site, because a reply that is too long should arrive shortened and say so,
 * not vanish.
 */
const LIMITS = { exchanges: 50, id: 64, question: 4000, answer: 20_000, reason: 600, runUrl: 400 };

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
}
const has = (name) => process.argv.includes(`--${name}`);

function die(message) {
  console.error(`virgil-conversation: ${message}`);
  process.exit(1);
}

/** ISO 8601 to the second, the shape `Timestamp` accepts and the room sorts by. */
const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

/**
 * Shortened, and visibly. A silent truncation is a lie of the same family as a
 * blank reply: the owner reads the last sentence as the end of what was said.
 */
function shorten(text, limit, what) {
  if (text.length <= limit) return text;
  const marker = `\n\n[${what} was ${text.length} characters; the shape holds ${limit}. The rest is in the run log.]`;
  return `${text.slice(0, limit - marker.length)}${marker}`;
}

/**
 * **An unreadable file is kept, not deleted.**
 *
 * The alternatives were both worse. Refusing to write leaves the conversation
 * permanently broken with no path back, and the owner's next message lost with
 * every one after it. Overwriting quietly destroys evidence. So the bytes move
 * to `.virgil/conversation.broken.json` and are committed beside the fresh file:
 * git history always held them, and this means nobody has to know that to find
 * them.
 */
function load() {
  if (!existsSync(FILE))
    return { schema: 'virgil.conversation.v1', updatedAt: now(), exchanges: [] };
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(FILE, 'utf8'));
  } catch {
    parsed = null;
  }
  const usable =
    parsed !== null &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    parsed.schema === 'virgil.conversation.v1' &&
    Array.isArray(parsed.exchanges);
  if (!usable) {
    renameSync(FILE, BROKEN);
    console.warn(
      `virgil-conversation: the conversation could not be read and was moved to ${BROKEN.replace(`${repoRoot}/`, '')}. A fresh one starts here.`,
    );
    return { schema: 'virgil.conversation.v1', updatedAt: now(), exchanges: [] };
  }
  return parsed;
}

function save(conversation) {
  conversation.updatedAt = now();
  // Oldest first out. The cap is in the schema because a page has to draw this
  // on a phone; the record that is not capped is git.
  if (conversation.exchanges.length > LIMITS.exchanges) {
    conversation.exchanges = conversation.exchanges.slice(-LIMITS.exchanges);
  }
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, `${JSON.stringify(conversation, null, 2)}\n`);
}

function webUrl(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > LIMITS.runUrl) return null;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? value : null;
}

const commands = ['ask', 'answer', 'fail'].filter(has);
if (commands.length !== 1) die('give exactly one of --ask, --answer or --fail.');
const command = commands[0];

const id = arg('id');
if (!id)
  die('--id is required. It is the workflow run id, and it is what the reply is matched to.');
if (id.length > LIMITS.id) die(`--id is ${id.length} characters and the shape holds ${LIMITS.id}.`);

const question = (process.env.VIRGIL_QUESTION ?? '').trim();
if (!question) die("VIRGIL_QUESTION must carry the owner's message. It is never a summary of it.");

const runUrl = webUrl(arg('run-url'));

const conversation = load();
let entry = conversation.exchanges.find((e) => e && e.id === id);
if (!entry) {
  // Written here for `--answer` and `--fail` too. The step that should have
  // created it may have failed, and the answer is worth more than the ordering.
  entry = {
    id,
    askedAt: now(),
    question: shorten(question, LIMITS.question, 'the message'),
    state: 'asked',
    answeredAt: null,
    answer: null,
    reason: null,
    runUrl,
  };
  conversation.exchanges.push(entry);
} else if (runUrl && !entry.runUrl) {
  entry.runUrl = runUrl;
}

if (command === 'ask') {
  // Deliberately does nothing more. Asking twice for one run is the workflow
  // being re-run, not a second question, and it must not produce a second
  // bubble.
} else if (command === 'answer') {
  const path = arg('answer-file');
  if (!path) die('--answer is what the session said, and needs --answer-file to read it from.');
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    die(`--answer-file ${path} could not be read (${error?.code ?? 'no reason given'}).`);
  }
  text = text.trim();
  if (!text) {
    // **The empty answer is a failure, not an answer.** A reply bubble with
    // nothing in it says Virgil spoke and said nothing, which is not what
    // happened: the run finished and produced no output. The schema was changed
    // to refuse `''` for the same reason, and this is the case that asked the
    // question.
    entry.state = 'failed';
    entry.answer = null;
    entry.answeredAt = null;
    entry.reason = shorten(
      'The run finished but the session printed nothing, so there is no answer to show. The run log is the record.',
      LIMITS.reason,
      'the reason',
    );
  } else {
    entry.state = 'answered';
    entry.answer = shorten(text, LIMITS.answer, 'the reply');
    entry.answeredAt = now();
    entry.reason = null;
  }
} else {
  const reason = (process.env.VIRGIL_REASON ?? '').trim();
  if (!reason) die('VIRGIL_REASON must say what is known about why there is no answer.');
  entry.state = 'failed';
  entry.answer = null;
  entry.answeredAt = null;
  entry.reason = shorten(reason, LIMITS.reason, 'the reason');
}

save(conversation);
console.log(
  `virgil-conversation: ${id} is ${entry.state} (${conversation.exchanges.length} in the file) → .virgil/conversation.json`,
);
