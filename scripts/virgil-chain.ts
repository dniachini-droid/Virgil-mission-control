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
 * **Why a file and not a network call.** Nothing in `scripts/` reaches the
 * network, and this is not the place to start. A script that fetched its own
 * evidence would also be a script that could fetch the wrong pull request and
 * report confidently about it. The caller names the evidence; the script
 * judges it.
 */
import { readFileSync } from 'node:fs';
import { nextStep, readChain } from '../packages/gate-engine/src/handoff.js';

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

/* --------------------------------------------------------------- comments */

const source = flag('comments');
if (source === undefined) {
  console.error('chain: give --comments <file|-> or --emit <role>. See the header of this file.');
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
