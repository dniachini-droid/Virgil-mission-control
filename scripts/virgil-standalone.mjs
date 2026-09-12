#!/usr/bin/env node
/**
 * **Delete the application; everything else must still pass.**
 *
 * `docs/process/ROADMAP.md`, item 3: *"The check is the point: delete
 * `apps/mission-control` and everything else must still pass. A line nothing
 * enforces is not a line."*
 *
 * So this copies the working tree to a scratch directory, removes the
 * application from the copy, and runs what remains. The repository you are
 * sitting in is never touched.
 *
 *   node scripts/virgil-standalone.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = mkdtempSync(join(tmpdir(), 'virgil-standalone-'));

function run(command, args, cwd) {
  return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: 'pipe' });
}

try {
  // `git archive` copies exactly what is committed: no node_modules, no dist,
  // no stray scratch file that happens to be lying around. What a fresh clone
  // would have, which is the thing being claimed.
  const tar = join(scratch, 'tree.tar');
  run('git', ['archive', '--format=tar', '-o', tar, 'HEAD'], root);
  const tree = join(scratch, 'tree');
  run('mkdir', ['-p', tree], scratch);
  run('tar', ['-xf', tar, '-C', tree], scratch);

  rmSync(join(tree, 'apps'), { recursive: true, force: true });
  console.log('standalone: apps/ removed from the copy');

  // The workspace still lists apps/*; without this pnpm refuses to install.
  // Removing the entry is part of the claim, not a workaround for it: an
  // inspector that needs the application declared is not standalone.
  const yaml = join(tree, 'pnpm-workspace.yaml');
  // Written with the filesystem rather than a shell. The first version piped
  // the text through `printf '%s'`, which does not expand the `\n` escapes a
  // JSON-quoted string carries — so the copy received one line of literal
  // backslash-n and pnpm answered "Expected object but found - string", an
  // error about YAML that was really an error about quoting.
  writeFileSync(yaml, readFileSync(yaml, 'utf8').replace(/^\s*-\s*['"]?apps\/\*['"]?\s*$\n?/m, ''));

  // **Install rather than copy.** The first version copied `node_modules` from
  // the real tree, which does not work: pnpm's layout is a web of relative
  // symlinks into `.pnpm`, and a copy leaves them pointing at nothing. Every
  // package then reported "no tests" with two errors, which reads like a
  // structural failure and was an artefact of the copy.
  //
  // So the copy installs, exactly as a fresh clone would. That is slower and it
  // is the thing being claimed: an inspector that needs this repository's
  // `node_modules` to run is not standing on its own.
  console.log('standalone: installing into the copy');
  run('pnpm', ['install', '--ignore-scripts'], tree);

  console.log('standalone: running the remaining suite\n');
  const out = run('npx', ['turbo', 'run', 'test', '--force'], tree);
  const tasks = /Tasks:\s+(\d+) successful, (\d+) total/.exec(out);
  console.log(
    out
      .split('\n')
      .filter((l) => /Tasks:|Cached:|Test Files|passed/.test(l))
      .join('\n'),
  );
  if (!tasks || tasks[1] !== tasks[2]) {
    console.error('\nstandalone: FAIL — the suite did not pass without the application');
    process.exit(1);
  }
  console.log(`\nstandalone: PASS — ${tasks[1]} of ${tasks[2]} packages pass with apps/ deleted`);
} catch (error) {
  console.error('\nstandalone: FAIL');
  // Both streams, because the useful half is not always the one you expect:
  // pnpm writes resolution failures to stderr and turbo writes test output to
  // stdout, and printing one of them made this script report a failure it could
  // not explain.
  console.error(error.stdout?.toString().slice(-3000) ?? '');
  console.error(error.stderr?.toString().slice(-3000) ?? error.message);
  process.exit(1);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
