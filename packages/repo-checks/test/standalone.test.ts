import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * **Nothing here depends on an application.**
 *
 * This repository is a build-and-review system and, since 2026-09-13, nothing
 * else: the application it was first pointed at was deleted, along with its
 * hosting, its endpoints and its twelve minutes of browser checks.
 *
 * The rule survives the thing that prompted it, and that is the point. The
 * coupling it exists to catch was never deliberate — check files were written
 * inside an application because a brief's permitted paths pointed there, and a
 * session put its work where it was allowed rather than where it belonged. The
 * next application will arrive under `apps/` the same way and the same pressure
 * will apply.
 *
 * It passes trivially today and costs a few milliseconds. The day it fails is
 * the day it was worth keeping.
 *
 * **What it can and cannot see.** It matches module specifiers, where the
 * meaning is not in doubt. It does not match paths written as strings: an
 * earlier draft did, and made false positives of tests using a filename as
 * fixture data and never opening it. A text scan cannot tell a path used as
 * data from a path used to read.
 */
const root = resolve(import.meta.dirname, '../../..');

/** Every `.ts`, `.mts` and `.mjs` file under a directory, source and test alike. */
function sources(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) sources(full, out);
    else if (/\.(ts|mts|mjs)$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * **An import that climbs into `apps/`, and deliberately nothing else.**
 *
 * The first draft also flagged the application's path written as a string, and
 * that was wrong twice over. `packages/agent-contracts/test/paths.test.ts`
 * asserts on `'apps/x'` and `'apps/%2e%2e/x'` as *inputs to a path normaliser*,
 * and five `packages/domain` tests use
 * a plausible source path as a plausible filename inside
 * a fixture event log. None of them opens a file. All of them pass with the
 * application deleted — which the deletion test demonstrates rather than
 * assumes.
 *
 * **A text scan cannot tell a path used as data from a path used to read**, and
 * a guard that forces fixtures to avoid realistic filenames is worse than no
 * guard. So this matches only module specifiers, where the meaning is not in
 * doubt, and the deletion test carries the rest. That division is the honest
 * one: this half cannot miss a run, that half cannot be fooled by a string.
 */
const IMPORTS_INTO_APPS = /from\s+['"`][^'"`]*\.\.\/apps\//;

describe('the inspector stands without the application', () => {
  it('no package reaches into apps/', () => {
    const offenders: string[] = [];
    for (const file of sources(resolve(root, 'packages'))) {
      // This file names the shape it forbids, in its own prose and its own
      // pattern. Reading itself would make it report itself, which it did.
      if (file.endsWith('standalone.test.ts')) continue;
      const text = readFileSync(file, 'utf8');
      for (const line of text.split('\n')) {
        // A comment explaining the rule is not an instance of breaking it.
        const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '');
        if (IMPORTS_INTO_APPS.test(code)) {
          offenders.push(`${file.replace(`${root}/`, '')}: ${line.trim().slice(0, 90)}`);
        }
      }
    }
    expect(
      offenders,
      `these reach into the application, so deleting it would break them:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('no package declares the application as a dependency', () => {
    const offenders: string[] = [];
    for (const pkg of readdirSync(resolve(root, 'packages'))) {
      const manifest = resolve(root, 'packages', pkg, 'package.json');
      let json: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      try {
        json = JSON.parse(readFileSync(manifest, 'utf8'));
      } catch {
        continue;
      }
      const named = Object.keys({ ...json.dependencies, ...json.devDependencies });
      for (const dep of named) {
        // Any workspace dependency that is not another package here is, by
        // elimination, an application: `pnpm-workspace.yaml` declares only
        // `packages/*` and `tools/*`.
        if (dep.startsWith('@virgil/') && !existsSync(resolve(root, 'packages', dep.slice(8)))) {
          offenders.push(`packages/${pkg} depends on ${dep}, which is not a package here`);
        }
      }
    }
    expect(offenders, offenders.join('; ')).toEqual([]);
  });
});
