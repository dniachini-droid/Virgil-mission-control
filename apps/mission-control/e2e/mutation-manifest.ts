/**
 * **Mechanism 1: breaks the code on purpose and fails if nothing notices.**
 *
 * `1,669 tests passed` is a claim about the tests, not a fact about the code. By
 * this project's own standard — a builder's success report is not evidence — a
 * suite nobody has tried to fool is an assertion of thoroughness rather than a
 * measurement of it.
 *
 * On 11 September three checks in one file were found, by hand, to be incapable
 * of failing. Each was found the same way: remove the guard, rebuild, see
 * whether anything goes red. This runs that ritual from a written list, so it
 * happens every time rather than when somebody remembers.
 *
 * **What makes this different from a coverage number.** Coverage says a line was
 * executed. This says a line was *depended upon*: change it, and a named check
 * must fail. A line executed by a test that would pass without it is covered and
 * unguarded, which is the condition every dead check in this repository has been
 * in.
 *
 * **Mutations expected to survive are the point, not an embarrassment.** Each
 * entry declares whether a check should catch it. Where nothing does, the entry
 * says so and says why — so the list doubles as an honest ledger of what is
 * unguarded, in a repository that otherwise has no way to state that. The run
 * fails when reality and the manifest disagree in *either* direction: a
 * mutation that should be caught and is not, and a mutation recorded as
 * unguarded that something now catches — the second being good news the list
 * must be updated to reflect.
 *
 * Usage: pnpm --filter mission-control mutate
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const app = resolve(import.meta.dirname, '..');

interface Mutation {
  /** Short name, used in the output and in the ledger below. */
  id: string;
  /** Repository-relative path. */
  file: string;
  /** Exact text to replace. Must occur exactly once, or the run refuses. */
  find: string;
  /** What to put in its place: the defect, as small as it can be made. */
  replace: string;
  /** Which check must fail. A test file path, run with vitest. */
  caughtBy: string | null;
  /** Why it matters, and — where `caughtBy` is null — why nothing catches it. */
  why: string;
}

/**
 * Every entry is a guard that a real review found missing, or a line whose
 * removal caused a real defect. Nothing here is hypothetical.
 */
const MUTATIONS: Mutation[] = [
  {
    id: 'head-guard',
    file: 'apps/mission-control/src/world/live/liveState.ts',
    find: 'if (!answer.head?.sha) return null;',
    replace: 'if (false as boolean) return null;',
    caughtBy: 'test/live-state-v11.test.ts',
    why: 'KP8-02. Without it a live page that read nothing draws the recording’s 9abcdef under “Exact version being worked on”, beside a real branch name.',
  },
  {
    id: 'check-vocabulary',
    file: 'apps/mission-control/src/world/live/liveState.ts',
    find: 'if (CHECK_STATES.includes(run.state)) {',
    replace: 'if (true) {',
    caughtBy: 'test/live-state-v11.test.ts',
    why: 'The four words are constitution/authority.json. Without this, GitHub’s “cancelled” or “neutral” reaches the screen as though the project had a word for it.',
  },
  {
    id: 'names-not-drawn',
    file: 'netlify/functions/state.mjs',
    find: '    names: rows.map((entry) => entry.name),',
    replace: '    names: rows.slice(0, WATCHED_BRANCHES).map((entry) => entry.name),',
    caughtBy: 'test/live-state-v11.test.ts',
    why: 'KP8-01. Deciding existence against the drawn list told the owner a live branch had been “merged and deleted” — his own, on a nine-branch repository.',
  },
  {
    id: 'branch-name-traversal',
    file: 'netlify/functions/state.mjs',
    find: "  if (value.includes('..') || value.includes('//')) return false;",
    replace: '  if (false) return false;',
    caughtBy: 'test/live-state-v11.test.ts',
    why: 'A branch name reaches three GitHub URLs. encodeURIComponent bears the load; this is the second layer, and a second layer nothing tests is not a layer.',
  },
  {
    id: 'unread-prover-window',
    file: 'apps/mission-control/src/world/window/windowContent.ts',
    find: 'if (state.checks === null) return unreadProverDoc(state);',
    replace: 'if (false as boolean) return unreadProverDoc(state);',
    caughtBy: 'test/window-content-v11.test.ts',
    why: 'KP7-01, the blocking one. Without it the Prover’s window draws fourteen invented checks marked “verified” while the badge beside it says they could not be read.',
  },
  {
    id: 'skipped-not-passed',
    file: 'apps/mission-control/src/world/window/windowContent.ts',
    find: '            : skipped > 0',
    replace: '            : (false as boolean)',
    caughtBy: 'test/window-content-v11.test.ts',
    why: 'KP7-02. Without it a run with a skipped check is headlined “All N checks passed”, contradicting the facts block two sections below it.',
  },
  {
    id: 'report-shelf-life',
    file: 'apps/mission-control/src/world/live/liveState.ts',
    find: '  return now - at <= REPORT_GOES_COLD_MS;',
    replace: '  return true;',
    caughtBy: 'test/live-state-v11.test.ts',
    why: 'A session that stopped looks exactly like one still working. Without the shelf life the room would show a Fabricator working for ever.',
  },
  {
    id: 'handler-existence',
    file: 'netlify/functions/state.mjs',
    find: '    const exists = list.names === undefined ? null : list.names.includes(wanted);',
    replace: '    const exists = list.names === undefined ? null : true;',
    caughtBy: null,
    why: 'KP9-04, recorded as unguarded. The Netlify handler is invoked by no test — the suite calls readBranches, shapeComplaint and isBranchName and otherwise reads the file as text — and verify:web replaces the endpoint with a stub, so it cannot reach this line either. Closing it needs a test that drives the handler.',
  },
];

const argv = process.argv.slice(2);
const only = argv.find((flag) => flag.startsWith('--only='))?.slice('--only='.length);

interface Outcome {
  id: string;
  expected: 'caught' | 'survives';
  actual: 'caught' | 'survives';
  note: string;
}

const outcomes: Outcome[] = [];
const restore: { path: string; text: string }[] = [];

/** Restores every mutated file, whatever happened. Runs on any exit path. */
function putEverythingBack(): void {
  for (const file of restore.splice(0)) writeFileSync(file.path, file.text);
}
process.on('exit', putEverythingBack);
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    putEverythingBack();
    process.exit(130);
  });
}

for (const mutation of MUTATIONS) {
  if (only && mutation.id !== only) continue;
  const path = resolve(root, mutation.file);
  const original = readFileSync(path, 'utf8');
  const occurrences = original.split(mutation.find).length - 1;
  if (occurrences !== 1) {
    // A manifest whose anchors have drifted is worse than no manifest: it would
    // report every mutation as surviving and read as a coverage catastrophe, or
    // silently skip them and read as a clean bill. Neither is allowed.
    console.error(
      `mutation: ${mutation.id} — its anchor occurs ${occurrences} times in ${mutation.file}, not once. The manifest has drifted from the code.`,
    );
    process.exit(2);
  }

  restore.push({ path, text: original });
  writeFileSync(path, original.replace(mutation.find, mutation.replace));

  let caught: boolean;
  try {
    execFileSync(
      'npx',
      ['vitest', 'run', mutation.caughtBy ?? 'test/live-state-v11.test.ts', '--silent'],
      { cwd: app, stdio: 'pipe' },
    );
    caught = false;
  } catch {
    caught = true;
  }

  writeFileSync(path, original);
  restore.pop();

  outcomes.push({
    id: mutation.id,
    expected: mutation.caughtBy ? 'caught' : 'survives',
    actual: caught ? 'caught' : 'survives',
    note: mutation.why,
  });
  const mark = outcomes[outcomes.length - 1];
  const agreed = mark?.expected === mark?.actual;
  console.log(
    `mutation: ${agreed ? '✓' : '✗'} ${mutation.id} — expected ${mark?.expected}, was ${mark?.actual}${
      mutation.caughtBy ? ` (${mutation.caughtBy})` : ' (nothing covers it)'
    }`,
  );
}

const disagreed = outcomes.filter((outcome) => outcome.expected !== outcome.actual);
console.log('');
for (const outcome of outcomes.filter(
  (o) => o.expected === 'survives' && o.actual === 'survives',
)) {
  console.log(`mutation: unguarded, and recorded as such — ${outcome.id}: ${outcome.note}`);
}
if (disagreed.length > 0) {
  console.log('');
  for (const outcome of disagreed) {
    console.error(
      outcome.actual === 'survives'
        ? `mutation: FAIL — ${outcome.id} was broken on purpose and every test still passed. ${outcome.note}`
        : `mutation: FAIL — ${outcome.id} is recorded as unguarded but something caught it. That is good news; the manifest is now wrong and must say so.`,
    );
  }
  process.exit(1);
}
console.log(
  `mutation: PASS — ${outcomes.length} deliberate defects, each behaving as the manifest says, ${outcomes.filter((o) => o.actual === 'caught').length} of them caught by a named check.`,
);
