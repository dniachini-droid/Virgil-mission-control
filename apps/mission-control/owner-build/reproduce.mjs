/**
 * Reproducibility check for the newest committed Owner Build artifact.
 *
 * The claim this check exists to falsify: *the committed `.html` the owner
 * downloads is derivable from the commit it names, and from nothing else.*
 * Until now that claim was made by hand, in prose, in each viewing point's
 * document ("rebuilt byte for byte from a clean tree"), by the same session
 * that built the artifact. This script is the mechanical form of it, and it is
 * meant to be run by something with no interest in the answer.
 *
 * How it works, and why it is built this way:
 *
 *  - It picks the newest artifact by the commit that *added* it, from git, not
 *    by the date printed inside the file. The date inside the file is part of
 *    what is being checked, so it may not also choose what to check.
 *  - It rebuilds in a detached `git worktree` at the artifact's **own** source
 *    commit, not at `HEAD`. That is the whole point: `HEAD` moves on, and a
 *    rebuild at `HEAD` would fail the moment a later commit touched the app
 *    for any reason — a red build with nothing wrong. Building at the recorded
 *    commit also means the stage name and the file-name slug come from that
 *    commit's own `vite.owner.config.ts`, so neither has to be guessed.
 *  - The only value it feeds in is `VIRGIL_OWNER_BUILD_DATE`, recovered from
 *    the artifact's own footer, because the embedded minute is the one thing in
 *    the output that the commit does not determine. `VIRGIL_OWNER_SHA` is
 *    deliberately *not* passed: the worktree's own `HEAD` supplies it, so a
 *    mismatch between the SHA in the footer and the commit the bytes came from
 *    is a failure rather than something this script papers over.
 *  - Every recovery is required to be unambiguous. Two candidate dates, two
 *    candidate SHAs, an unreadable file name, a commit the clone does not have:
 *    each is a hard failure with a printed reason. There is no path through
 *    this script that reports success without having run `cmp`.
 *
 * Usage: pnpm reproduce:owner            (from the repository root)
 *        node owner-build/reproduce.mjs --skip-install
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

const ARTIFACT_DIR = 'docs/process/PHASE_1_owner-builds';
const skipInstall = process.argv.includes('--skip-install');

/** Set once the worktree exists, so that a failure exit still removes it. */
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
    console.log(`reproduce: note — could not remove the worktree at ${path}`);
  }
}

function fail(message) {
  removeWorktree();
  console.error(`reproduce: FAILED — ${message}`);
  process.exit(1);
}

function step(message) {
  console.log(`reproduce: ${message}`);
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

const repoRoot = git(['rev-parse', '--show-toplevel'], process.cwd());
repoRootForCleanup = repoRoot;
const artifactDir = join(repoRoot, ARTIFACT_DIR);

// 1. The newest artifact, chosen by the commit that added it.
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

// 2. The short SHA from the file name, and the full SHA and build date from the
//    artifact's own bytes. Each must resolve to exactly one value.
const shortSha = /-([0-9a-f]{10})\.html$/.exec(artifact)?.[1];
if (!shortSha) fail(`cannot read a 10-character commit SHA out of the name ${artifact}`);

const bytes = readFileSync(artifactPath);
const text = bytes.toString('utf8');

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

// 3. The commit must actually be in this clone. A shallow checkout is a
//    failure with an explanation, never a skip.
try {
  git(['cat-file', '-e', `${fullSha}^{commit}`], repoRoot);
} catch {
  fail(
    `commit ${fullSha} is not in this clone; the reproducibility rebuild needs full history (actions/checkout with fetch-depth: 0)`,
  );
}

// 4. Rebuild at that commit, in a detached worktree outside the repository.
const worktree = mkdtempSync(join(tmpdir(), 'virgil-reproduce-'));
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

  step(`pnpm --filter mission-control run build:owner with VIRGIL_OWNER_BUILD_DATE="${buildDate}"`);
  execFileSync('pnpm', ['--filter', 'mission-control', 'run', 'build:owner'], {
    cwd: worktree,
    stdio: 'inherit',
    env: { ...process.env, VIRGIL_OWNER_BUILD_DATE: buildDate },
  });

  const rebuiltDir = join(worktree, 'apps', 'mission-control', 'dist', 'owner-build');
  const rebuilt = readdirSync(rebuiltDir).filter((name) => /virgil-[0-9a-f]{10}\.html$/.test(name));
  if (rebuilt.length !== 1) {
    fail(`expected exactly one rebuilt Owner Build, found ${rebuilt.length}`);
  }
  if (rebuilt[0] !== artifact) {
    fail(`the rebuild is named ${rebuilt[0]}, the committed artifact is named ${artifact}`);
  }
  rebuiltPath = join(rebuiltDir, rebuilt[0]);

  // 5. `cmp` is the verdict. Its own output is printed on a difference.
  step(`cmp ${rebuiltPath} ${artifactPath}`);
  try {
    execFileSync('cmp', [rebuiltPath, artifactPath], { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    const detail = [error.stdout, error.stderr].filter(Boolean).join('').trim();
    console.log(`reproduce: rebuilt  sha256 ${sha256(rebuiltPath)}  ${size(rebuiltPath)} bytes`);
    console.log(`reproduce: committed sha256 ${sha256(artifactPath)}  ${size(artifactPath)} bytes`);
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

console.log(`reproduce: identical — ${basename(rebuiltPath)} rebuilt from ${fullSha}`);
console.log(`reproduce: sha256 ${sha256(artifactPath)} (${size(artifactPath)} bytes)`);
console.log('reproduce: PASS — the committed artifact is byte-for-byte derivable from its commit');
