/**
 * **What happens next on a pull request, read from the pull request.**
 *
 * `packages/gate-engine/src/handoff.ts` holds the rule. This script only
 * supplies the comments and prints the answer, so that there is exactly one
 * place a chain's next step comes from and it is not this one.
 *
 * The conductor window (`.claude/skills/raphael/SKILL.md`) fetches a pull
 * request's comments with the GitHub tools, writes the bodies to a file as a
 * JSON array of strings, and runs:
 *
 *   pnpm chain -- --comments <file>      say what happens next
 *   pnpm chain -- --comments -           the same, reading stdin
 *
 * And, so that no session ever hand-writes the marker that the counter reads:
 *
 *   pnpm chain -- --emit reviewer --round 1 --sha abc1234 \
 *                 --verdict BLOCKED --next fix
 *
 * And, for **every session that pushes** — the builder and the fixer alike —
 * the whole handoff comment, facts and marker together:
 *
 *   pnpm chain -- --facts fixer --round 1 --base origin/main \
 *                 --ran <file of real command output> \
 *                 --could-not-run "…" --not-done "…"
 *
 * **Why the script derives most of it.** A session cannot be trusted to frame
 * the review of its own change — not from dishonesty, but because it already
 * believes the change is right and every softening reads as reasonable. So the
 * repository supplies the questions and derives every answer it can: branch,
 * base, head, changed paths and governed paths come from Git, not from the
 * session. What is left is the three the repository cannot know, and the script
 * refuses to print without them.
 *
 * **Why a file and not a network call.** Nothing in `scripts/` reaches the
 * network, and this is not the place to start. A script that fetched its own
 * evidence would also be a script that could fetch the wrong pull request and
 * report confidently about it. The caller names the evidence; the script
 * judges it.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { nextStep, readChain } from '../packages/gate-engine/src/handoff.js';
import { tierOf } from '../packages/gate-engine/src/tiers.js';

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? undefined : argv[i + 1];
};

const ROLES = ['builder', 'reviewer', 'fixer'] as const;
type Role = (typeof ROLES)[number];
const isRole = (v: string): v is Role => (ROLES as readonly string[]).includes(v);

/* ------------------------------------------------------------------ emit */

const emit = flag('emit');
if (emit !== undefined) {
  if (!isRole(emit)) {
    console.error(`chain: --emit must be one of ${ROLES.join(', ')}, not ${emit}`);
    process.exit(2);
  }
  const round = flag('round') ?? '0';
  const sha = flag('sha');
  const next = flag('next');
  if (!/^\d+$/.test(round)) {
    console.error(`chain: --round must be a whole number, not ${round}`);
    process.exit(2);
  }
  if (sha === undefined || sha.trim() === '') {
    console.error('chain: --sha is required. A handoff that names no version counts for nothing.');
    process.exit(2);
  }
  if (/\s/.test(sha)) {
    console.error('chain: --sha must be one word.');
    process.exit(2);
  }
  const verdict = flag('verdict') ?? 'n/a';
  if (emit === 'reviewer' && verdict === 'n/a') {
    console.error(
      'chain: a reviewer handoff must carry --verdict. A review with no verdict is not a review.',
    );
    process.exit(2);
  }
  if (emit !== 'reviewer' && verdict !== 'n/a') {
    console.error(`chain: only a reviewer may carry a verdict, and ${emit} is not one.`);
    process.exit(2);
  }
  const parts = [
    `role=${emit}`,
    `round=${round}`,
    `sha=${sha}`,
    `verdict=${verdict}`,
    `next=${next ?? 'owner'}`,
  ];
  const marker = `<!-- virgil:handoff ${parts.join(' ')} -->`;
  // Round-trip it through the reader that will read it in anger, so a marker
  // this script prints is a marker the counter can count. The failure this
  // prevents is silent: an unreadable marker is not a round, and a chain that
  // under-counts runs one time too many.
  const back = readChain([marker]);
  if (back.handoffs.length !== 1) {
    console.error(`chain: refusing to print a marker the counter cannot read: ${marker}`);
    process.exit(2);
  }
  console.log(marker);
  process.exit(0);
}

/* ----------------------------------------------------------------- facts */

const git = (...args: string[]): string => execFileSync('git', args, { encoding: 'utf8' }).trim();

const factsRole = flag('facts');
if (factsRole !== undefined) {
  if (factsRole !== 'builder' && factsRole !== 'fixer') {
    // A reviewer pushes nothing, so it has no facts of its own to post. It
    // answers the repository's questions about somebody else's push.
    console.error(
      `chain: --facts is for a session that pushed, so builder or fixer, not ${factsRole}`,
    );
    process.exit(2);
  }
  const round = flag('round') ?? (factsRole === 'builder' ? '0' : '');
  if (!/^\d+$/.test(round)) {
    console.error(
      'chain: --round must be a whole number. A fix round that is not numbered cannot be counted.',
    );
    process.exit(2);
  }

  const required: Record<string, string | undefined> = {
    ran: flag('ran'),
    'could-not-run': flag('could-not-run'),
    'not-done': flag('not-done'),
  };
  const missing = Object.entries(required)
    .filter(([, v]) => v === undefined || v.trim() === '')
    .map(([k]) => `--${k}`);
  if (missing.length > 0) {
    console.error(
      `chain: ${missing.join(', ')} missing. These are the three the repository cannot derive, ` +
        'and they are the ones a review is built on. "nothing" is an acceptable answer; silence is not.',
    );
    process.exit(2);
  }

  let ran: string;
  try {
    ran = readFileSync(required.ran as string, 'utf8').trimEnd();
  } catch {
    console.error(
      `chain: --ran must name a file holding the real output of what was run, not a summary of it. Could not read ${required.ran}.`,
    );
    process.exit(2);
  }
  if (ran.trim() === '') {
    console.error('chain: --ran names an empty file. A check with no output was not run.');
    process.exit(2);
  }

  const base = flag('base') ?? 'origin/main';
  let branch: string;
  let head: string;
  let baseSha: string;
  let changed: string[];
  try {
    branch = git('rev-parse', '--abbrev-ref', 'HEAD');
    head = git('rev-parse', 'HEAD');
    baseSha = git('merge-base', base, 'HEAD');
    changed = git('diff', '--name-only', `${baseSha}...HEAD`).split('\n').filter(Boolean);
  } catch {
    console.error(`chain: could not read this branch against ${base}. Fetch it first.`);
    process.exit(2);
  }
  if (branch === 'HEAD' || branch === 'main') {
    console.error(`chain: refusing to post facts from ${branch}. Work belongs on its own branch.`);
    process.exit(2);
  }

  const verdict = tierOf(changed);
  const governed = verdict.raisedBy;
  const short = head.slice(0, 7);

  const lines = [
    `### Facts — ${factsRole}, round ${round}`,
    '',
    '| | |',
    '|---|---|',
    `| branch | \`${branch}\` |`,
    `| base | \`${baseSha.slice(0, 7)}\` (\`${base}\`) |`,
    `| head | \`${short}\` |`,
    `| changed paths | ${changed.length} |`,
    `| risk tier | ${verdict.tier}, derived |`,
    '',
    '<details><summary>changed paths</summary>',
    '',
    ...changed.map((c) => `- \`${c}\``),
    '',
    '</details>',
    '',
    governed.length === 0
      ? '**Governed paths touched:** none.'
      : `**Governed paths touched**, which is where a reviewer looks hardest:\n${governed
          .map((g) => `- \`${g.path}\` — ${g.because}`)
          .join('\n')}`,
    '',
    '**Ran**',
    '',
    '```',
    ran,
    '```',
    '',
    '**Could not run, and why**',
    '',
    required['could-not-run'] as string,
    '',
    '**Deliberately not done**',
    '',
    required['not-done'] as string,
    '',
    `<!-- virgil:facts sha=${short} -->`,
    `<!-- virgil:handoff role=${factsRole} round=${round} sha=${short} verdict=n/a next=review -->`,
  ];
  const comment = lines.join('\n');

  // Round-trip through the reader that will read it in anger. A facts block the
  // counter cannot tie to this handoff is a facts block that does not exist.
  const back = readChain([comment]);
  if (back.unreviewed?.facts !== true) {
    console.error('chain: refusing to print a handoff the counter would read as factless.');
    process.exit(2);
  }
  console.log(comment);
  process.exit(0);
}

/* --------------------------------------------------------------- comments */

const source = flag('comments');
if (source === undefined) {
  console.error(
    'chain: give --comments <file|->, --facts <role> or --emit <role>. See the header of this file.',
  );
  process.exit(2);
}

let raw: string;
try {
  raw = readFileSync(source === '-' ? 0 : source, 'utf8');
} catch {
  console.error(`chain: could not read ${source === '-' ? 'stdin' : source}.`);
  process.exit(2);
}

let comments: string[];
try {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.some((c) => typeof c !== 'string')) {
    throw new Error('not an array of strings');
  }
  comments = parsed as string[];
} catch {
  console.error('chain: --comments must name a JSON array of comment bodies, each a string.');
  process.exit(2);
}

const state = readChain(comments);
const step = nextStep(state);

console.log(`${comments.length} ${comments.length === 1 ? 'comment' : 'comments'} read`);
console.log(`  handoffs recorded : ${state.handoffs.length}`);
for (const h of state.handoffs) {
  console.log(`    ${h.role} round ${h.round} on ${h.sha}${h.verdict ? ` — ${h.verdict}` : ''}`);
}
console.log(`  last verdict      : ${state.lastVerdict ?? 'none posted'}`);
console.log(`  fix rounds spent  : ${state.roundsUsed}`);
console.log(`  fix rounds allowed: ${state.roundsAuthorised}`);
console.log('');
console.log(`next=${step.step}${step.step === 'fix' ? ` round=${step.round}` : ''}`);
console.log(`because ${step.because}`);
