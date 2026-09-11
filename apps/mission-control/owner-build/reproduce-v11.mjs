/**
 * Reproducibility check for the newest committed **V11** Owner Build artifact.
 *
 * A sibling of `reproduce.mjs`, which is untouched and still reproduces V10.
 * The claim is the same claim: *the committed `.html` the owner downloads is
 * derivable from the commit it names, and from nothing else.*
 *
 * **Why the V11 artifacts live in a subdirectory, recorded here because it is a
 * deviation from the instruction's letter.** `reproduce.mjs` chooses what to
 * reproduce by taking the newest `*.html` directly inside
 * `docs/process/PHASE_1_owner-builds/` and rebuilding it with `build:owner` —
 * V10's build. A V11 artifact placed beside V10's would therefore become the
 * newest, and V10's reproducer would try to rebuild it with V10's build script
 * and fail on the file name. `reproduce.mjs` may not be edited (the
 * preservation contract), so V11's artifacts go in
 * `docs/process/PHASE_1_owner-builds/v11/`, which `readdirSync(...).filter(name
 * => name.endsWith('.html'))` does not see. Their digests stay at the top level
 * so the workflow's existing `sha256sum -c *.sha256` still checks them.
 *
 * Usage: pnpm reproduce:owner:v11          (from the repository root)
 *        node owner-build/reproduce-v11.mjs --skip-install
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

const ARTIFACT_DIR = 'docs/process/PHASE_1_owner-builds/v11';
const skipInstall = process.argv.includes('--skip-install');

let createdWorktree = null;
let repoRootForCleanup = null;

function removeWorktree() {
  if (createdWorktree === null || repoRootForCleanup === null) return;
  const path = createdWorktree;
  createdWorktree = null;
  try {
    execFileSync('git', ['worktree', 'remove', '--force', path], {
      cwd: repoRootForCleanup,
      encoding: 'utf8',
    });
  } catch {
    console.log(`reproduce v11: note — could not remove the worktree at ${path}`);
  }
}

function fail(message) {
  removeWorktree();
  console.error(`reproduce v11: FAILED — ${message}`);
  process.exit(1);
}

function step(message) {
  console.log(`reproduce v11: ${message}`);
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

const repoRoot = git(['rev-parse', '--show-toplevel'], process.cwd());
repoRootForCleanup = repoRoot;
const artifactDir = join(repoRoot, ARTIFACT_DIR);

// 1. The newest V11 artifact, chosen by the commit that added it.
const artifacts = readdirSync(artifactDir).filter((name) => name.endsWith('.html'));
if (artifacts.length === 0) fail(`no artifact in ${ARTIFACT_DIR}`);

const dated = artifacts.map((name) => {
  const addedAt = git(
    ['log', '--diff-filter=A', '-1', '--format=%ct', '--', `${ARTIFACT_DIR}/${name}`],
    repoRoot,
  );
  if (addedAt === '') {
    fail(`${name} has no commit that added it; an untracked artifact cannot be reproduced`);
  }
  return { name, addedAt: Number(addedAt) };
});
dated.sort((a, b) => b.addedAt - a.addedAt || a.name.localeCompare(b.name));
const artifact = dated[0].name;
const artifactPath = join(artifactDir, artifact);
step(`newest artifact ${artifact} (added ${new Date(dated[0].addedAt * 1000).toISOString()})`);

// 2. The short SHA from the name, and the full SHA and build date from the
//    bytes. Each must resolve to exactly one value.
const shortSha = /-([0-9a-f]{10})\.html$/.exec(artifact)?.[1];
if (!shortSha) fail(`cannot read a 10-character commit SHA out of the name ${artifact}`);

const text = readFileSync(artifactPath).toString('utf8');

const fullShas = [...new Set([...text.matchAll(/\b[0-9a-f]{40}\b/g)].map((m) => m[0]))].filter(
  (sha) => sha.startsWith(shortSha),
);
if (fullShas.length !== 1) {
  fail(
    `expected exactly one 40-character SHA beginning ${shortSha} inside ${artifact}, found ${fullShas.length}`,
  );
}
const fullSha = fullShas[0];

const dates = [
  ...new Set([...text.matchAll(/\b\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC\b/g)].map((m) => m[0])),
];
if (dates.length !== 1) {
  fail(
    `expected exactly one build date inside ${artifact}, found ${dates.length}${dates.length > 1 ? `: ${dates.join(', ')}` : ''}`,
  );
}
const buildDate = dates[0];

if (/\(\+uncommitted changes\)/.test(text)) {
  fail(`${artifact} was built from a dirty worktree and is not reproducible from any commit`);
}

step(`recovered source commit ${fullSha}`);
step(`recovered build date ${buildDate}`);

try {
  git(['cat-file', '-e', `${fullSha}^{commit}`], repoRoot);
} catch {
  fail(
    `commit ${fullSha} is not in this clone; the reproducibility rebuild needs full history (actions/checkout with fetch-depth: 0)`,
  );
}

// 3. Rebuild at that commit, in a detached worktree outside the repository.
const worktree = mkdtempSync(join(tmpdir(), 'virgil-reproduce-v11-'));
let rebuiltPath;
try {
  step(`git worktree add --detach ${worktree} ${fullSha}`);
  git(['worktree', 'add', '--detach', worktree, fullSha], repoRoot);
  createdWorktree = worktree;

  const dirty = git(['status', '--porcelain'], worktree);
  if (dirty !== '') fail(`the fresh worktree is not clean:\n${dirty}`);

  if (skipInstall) {
    step('--skip-install: reusing whatever node_modules the worktree inherits');
  } else {
    step('pnpm install --frozen-lockfile (in the worktree)');
    execFileSync('pnpm', ['install', '--frozen-lockfile'], { cwd: worktree, stdio: 'inherit' });
  }

  step(
    `pnpm --filter mission-control run build:owner:v11 with VIRGIL_OWNER_BUILD_DATE="${buildDate}"`,
  );
  execFileSync('pnpm', ['--filter', 'mission-control', 'run', 'build:owner:v11'], {
    cwd: worktree,
    stdio: 'inherit',
    env: { ...process.env, VIRGIL_OWNER_BUILD_DATE: buildDate },
  });

  const rebuiltDir = join(worktree, 'apps', 'mission-control', 'dist', 'owner-build-v11');
  const rebuilt = readdirSync(rebuiltDir).filter((name) => /virgil-[0-9a-f]{10}\.html$/.test(name));
  if (rebuilt.length !== 1) {
    fail(`expected exactly one rebuilt V11 Owner Build, found ${rebuilt.length}`);
  }
  if (rebuilt[0] !== artifact) {
    fail(`the rebuild is named ${rebuilt[0]}, the committed artifact is named ${artifact}`);
  }
  rebuiltPath = join(rebuiltDir, rebuilt[0]);

  step(`cmp ${rebuiltPath} ${artifactPath}`);
  try {
    execFileSync('cmp', [rebuiltPath, artifactPath], { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    const detail = [error.stdout, error.stderr].filter(Boolean).join('').trim();
    console.log(
      `reproduce v11: rebuilt  sha256 ${sha256(rebuiltPath)}  ${size(rebuiltPath)} bytes`,
    );
    console.log(
      `reproduce v11: committed sha256 ${sha256(artifactPath)}  ${size(artifactPath)} bytes`,
    );
    fail(`cmp reports a difference: ${detail || 'no detail'}`);
  }
} finally {
  removeWorktree();
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function size(path) {
  return readFileSync(path).length;
}

console.log(`reproduce v11: identical — ${basename(rebuiltPath)} rebuilt from ${fullSha}`);
console.log(`reproduce v11: sha256 ${sha256(artifactPath)} (${size(artifactPath)} bytes)`);
console.log(
  'reproduce v11: PASS — the committed V11 artifact is byte-for-byte derivable from its commit',
);
