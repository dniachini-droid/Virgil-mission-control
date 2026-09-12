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
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
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
  const text = run('cat', [yaml], tree);
  run(
    'sh',
    [
      '-c',
      `printf '%s' ${JSON.stringify(text.replace(/^\s*-\s*['"]?apps\/\*['"]?\s*$/m, ''))} > ${JSON.stringify(yaml)}`,
    ],
    tree,
  );

  // node_modules are linked rather than copied: installing from scratch needs
  // the network, and this check is about structure, not about pnpm.
  cpSync(join(root, 'node_modules'), join(tree, 'node_modules'), {
    recursive: true,
    dereference: false,
    errorOnExist: false,
  });
  for (const pkg of [
    'agent-contracts',
    'domain',
    'gate-engine',
    'knowledge-graph',
    'repo-checks',
    'test-fixtures',
    'visual-language',
  ]) {
    try {
      cpSync(
        join(root, 'packages', pkg, 'node_modules'),
        join(tree, 'packages', pkg, 'node_modules'),
        {
          recursive: true,
          dereference: false,
        },
      );
    } catch {
      // A package with no node_modules of its own is not a problem.
    }
  }

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
  console.error(error.stdout?.slice(-4000) ?? error.message);
  process.exit(1);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
