#!/usr/bin/env node
/**
 * **Writes `.virgil/state.json`, so a session does not have to remember how.**
 *
 * Phase 2 slice two (`docs/process/PHASE_2_SLICE_2_BRIEF.md`). The room draws
 * what this file says, and the file was written by hand the first time. The
 * owner's screen is then only as honest as one session's memory — and the
 * failure is silent: a session that stops working leaves a Fabricator lit for
 * ever, looking exactly like one that is still building.
 *
 * Two things reduce that, and this is the first. Making the file trivial to
 * write removes the excuse. The second is in `world/live/liveState.ts`, and it
 * is the one that actually protects the owner: a report older than
 * `REPORT_GOES_COLD_MS` stops being drawn as current, so forgetting shows up as
 * a room at rest with a cold timestamp rather than as a lie.
 *
 * Usage:
 *
 *   node scripts/virgil-status.mjs --holder fabricator --activity WORKING \
 *     --note "Building Phase 2 slice three."
 *   node scripts/virgil-status.mjs --idle --note "Nothing in flight."
 *
 * `--idle` is not a special case in the schema: it is `holder: null` and every
 * station `READY`, which is what the room looks like when nothing is happening
 * and is a real answer rather than an absence of one.
 *
 * It writes no verdict. The schema will not carry one without the review record
 * it was read from and the commit that record was read at
 * (`packages/agent-contracts/src/live.ts`), and this script has no business
 * asserting a review took place.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROLES = ['fabricator', 'prover', 'keeper'];
const ACTIVITIES = ['READY', 'RECEIVING', 'WORKING', 'REPORTED'];

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
}
const has = (name) => process.argv.includes(`--${name}`);

const idle = has('idle');
const holder = idle ? null : arg('holder');
const activity = arg('activity') ?? 'WORKING';
const note = arg('note');

if (!idle && !holder) {
  console.error('virgil-status: give --holder <role|virgil> or --idle.');
  process.exit(1);
}
if (holder && holder !== 'virgil' && !ROLES.includes(holder)) {
  console.error(`virgil-status: --holder must be virgil or one of ${ROLES.join(', ')}.`);
  process.exit(1);
}
if (!ACTIVITIES.includes(activity)) {
  console.error(`virgil-status: --activity must be one of ${ACTIVITIES.join(', ')}.`);
  process.exit(1);
}

const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
  cwd: repoRoot,
  encoding: 'utf8',
}).trim();
const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

const report = {
  schema: 'virgil.session-status.v1',
  reportedAt: now,
  aboutCommit: sha,
  branch,
  candidate: null,
  holder,
  hops: ROLES.map((role) => ({
    role,
    activity: !idle && role === holder ? activity : 'READY',
    reported: null,
    at: !idle && role === holder ? now : null,
  })),
  review: null,
  note: note ?? null,
};

const path = resolve(repoRoot, '.virgil/state.json');
mkdirSync(dirname(path), { recursive: true });
writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  `virgil-status: ${idle ? 'nothing in flight' : `${holder} ${activity}`} at ${sha.slice(0, 7)} → .virgil/state.json`,
);
