import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * **The inspector does not depend on the thing it inspects.**
 *
 * `docs/process/ROADMAP.md`, item 3: *"The check is the point: delete
 * `apps/mission-control` and everything else must still pass. A line nothing
 * enforces is not a line."*
 *
 * `scripts/virgil-standalone.mjs` performs that deletion for real — it exports
 * the committed tree, removes the application from the copy and runs what
 * remains. It needs an install, so it is a command and a CI job rather than a
 * unit test. **This file is the always-on half**: it reads what the packages
 * reach for and refuses anything reaching into the application, so coupling is
 * caught on the run that introduces it rather than whenever somebody next
 * remembers to delete a directory.
 *
 * The two are not redundant. This one cannot miss a run; that one cannot be
 * fooled by a shape nobody thought to match. Each is weaker where the other is
 * strong, which is the only honest reason to have both.
 *
 * **What this cannot do**, said rather than implied: it matches text. A package
 * reaching the application through a computed path, an environment variable or
 * a dependency that itself reaches, is invisible here. The deletion test is
 * what catches those, and it is why that one exists rather than this one alone.
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
 * `'apps/mission-control/src/world/Capsule.tsx'` as a plausible filename inside
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
        if (dep === 'mission-control' || dep.startsWith('@virgil/mission')) {
          offenders.push(`packages/${pkg} depends on ${dep}`);
        }
      }
    }
    expect(offenders, offenders.join('; ')).toEqual([]);
  });

  it('the deletion test exists and is a command, not a claim in prose', () => {
    const script = readFileSync(resolve(root, 'scripts/virgil-standalone.mjs'), 'utf8');
    expect(script).toContain("rmSync(join(tree, 'apps')");
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts.standalone).toBe('node scripts/virgil-standalone.mjs');
  });
});
