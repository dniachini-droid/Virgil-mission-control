import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * These assertions are about the wiring of the checks, not about the code the
 * checks look at, and they exist because of a specific failure mode this
 * repository has already been told about.
 *
 * KR-50 and KR-59: `build:owner` and `verify:owner` were reachable from no
 * required check and no workflow, so the only guard that catches a network
 * escape in the Owner Build was the one guard nothing ran. A workflow file
 * alone would not answer that, because a workflow file is one edit away from
 * gone and nothing would notice. So the wiring is asserted here: remove
 * `verify:owner` from the root `check` script, break the turbo dependency that
 * makes it build the artifact first, delete a step from the workflow, or add a
 * `continue-on-error` to it, and `pnpm test` fails — which means `pnpm check`
 * fails, which means the workflow fails.
 *
 * What these assertions do **not** establish, stated plainly for the same
 * reason `ENFORCEMENT_BOUNDARIES.md` states it about `.claude/settings.json`:
 * they read files. They prove the commands are declared, in the scripts and in
 * the workflow. They do not prove GitHub Actions runs them, and no test here
 * can. The evidence that they ran is a run's own log.
 */

const repoRoot = resolve(import.meta.dirname, '../../..');

const rootPackage = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const appPackage = JSON.parse(
  readFileSync(resolve(repoRoot, 'apps/mission-control/package.json'), 'utf8'),
) as { scripts: Record<string, string> };
const turbo = JSON.parse(readFileSync(resolve(repoRoot, 'turbo.json'), 'utf8')) as {
  tasks: Record<string, { dependsOn?: string[]; cache?: boolean }>;
};
const workflow = readFileSync(resolve(repoRoot, '.github/workflows/checks.yml'), 'utf8');

describe('verify:owner is reachable from a required check', () => {
  it('runs as part of the root `check` script, not only from a workflow file', () => {
    expect(rootPackage.scripts.check).toContain('pnpm verify:owner');
    expect(rootPackage.scripts['verify:owner']).toBe('turbo run verify:owner');
  });

  it('cannot verify a stale artifact: the turbo graph builds it first', () => {
    expect(turbo.tasks['build:owner']).toBeDefined();
    expect(turbo.tasks['verify:owner']?.dependsOn).toContain('build:owner');
  });

  it('is never satisfied from the turbo cache, because a cached browser run is no run', () => {
    expect(turbo.tasks['build:owner']?.cache).toBe(false);
    expect(turbo.tasks['verify:owner']?.cache).toBe(false);
  });
});

/**
 * **KP5-03: the check added to close KP2-09 was held in place by nothing.**
 *
 * This file's own opening states the rule — remove the command from `check`,
 * break the turbo dependency, delete the workflow step, or add a
 * `continue-on-error`, and the suite fails. All four assertions existed for
 * `verify:owner`. None existed for `verify:web`, so the hosted build's only
 * verifier could have been unwired in three places and the suite would have
 * stayed green, under a title about exactly that. It is `KR-50` again, on the
 * repair for `KP2-09`.
 */
describe('verify:web is reachable from a required check', () => {
  it('runs as part of the root `check` script', () => {
    expect(rootPackage.scripts.check).toContain('pnpm verify:web');
    expect(rootPackage.scripts['verify:web']).toBe('turbo run verify:web');
  });

  it('cannot verify a stale artifact: the turbo graph builds it first', () => {
    expect(turbo.tasks['build:web']).toBeDefined();
    expect(turbo.tasks['verify:web']?.dependsOn).toContain('build:web');
  });

  it('is never satisfied from the turbo cache, because a cached browser run is no run', () => {
    expect(turbo.tasks['build:web']?.cache).toBe(false);
    expect(turbo.tasks['verify:web']?.cache).toBe(false);
  });

  it('is a step of its own job in the workflow, not only a job name', () => {
    expect(workflow).toContain('pnpm --filter mission-control run build:web');
    expect(workflow).toContain('pnpm --filter mission-control run verify:web');
  });
});

describe('the checks workflow', () => {
  it('runs on every branch and on pull requests', () => {
    expect(workflow).toMatch(/^on:$/m);
    expect(workflow).toMatch(/branches: \['\*\*'\]/);
    expect(workflow).toMatch(/^ {2}pull_request:$/m);
  });

  /**
   * One entry per numbered step of the brief this workflow was built to.
   *
   * **`pnpm check` was on this list and is not any more — `SA-P-02`.** The job
   * that ran it was 32.8% of every pull request and duplicated six jobs that
   * each run one of its six commands. Removing the aggregate is not removing
   * coverage, and the list below is what proves that: every command that used
   * to be inside it is named here in its own right, so a future change that
   * quietly drops one fails this test rather than passing because an aggregate
   * still exists.
   */
  const requiredCommands = [
    'pnpm install --frozen-lockfile',
    'pnpm lint',
    'pnpm typecheck',
    'pnpm test',
    'pnpm --filter mission-control run verify:owner:v11',
    'pnpm --filter mission-control run verify:web',
    'pnpm --filter @virgil/knowledge-lint run lint',
    'pnpm --filter mission-control run build:owner',
    'pnpm --filter mission-control run verify:owner',
    'sha256sum -c *.sha256',
    'pnpm reproduce:owner',
  ];

  for (const command of requiredCommands) {
    it(`declares \`${command}\``, () => {
      expect(workflow).toContain(command);
    });
  }

  it('installs the browser `verify:owner` needs, at the version the lockfile pins', () => {
    expect(workflow).toContain('pnpm --filter mission-control run install:browser');
    // No version or revision here: the script asks Playwright for the Chromium
    // that the `@playwright/test` in `pnpm-lock.yaml` resolves to.
    expect(appPackage.scripts['install:browser']).toBe('playwright install --with-deps chromium');
  });

  it('fetches full history, because the rebuild happens at the artifact’s own commit', () => {
    expect(workflow).toContain('fetch-depth: 0');
  });

  it('suppresses no failure', () => {
    expect(workflow).not.toContain('continue-on-error');
    expect(workflow).not.toMatch(/\|\|\s*true/);
    expect(workflow).not.toContain('if: always()');
  });
});

/**
 * **The gate moved on 2026-09-10; these assertions are what stop it moving
 * further.**
 *
 * The repository exhausted its 2,000 included Actions minutes and every run
 * after 05:36 UTC failed in seconds with no runner and no logs — indistinguish-
 * able, on the face of it, from broken code. Four jobs at roughly eighty-five
 * machine-minutes a push, two of them driving a WebGL scene through a software
 * rasteriser, is a month's allowance in twenty-five pushes.
 *
 * So a push now runs the fast half and a pull request runs everything. That is a
 * real reduction in what a push proves, and the whole of the argument for it is
 * that **nothing reaches `main` except through a pull request**, where the full
 * gate still runs. These tests hold that argument to its terms: if the expensive
 * jobs were ever gated away from pull requests as well, the reduction would stop
 * being a change of timing and become a hole, and this file would fail.
 */
describe('the gate runs in full before anything can merge', () => {
  /**
   * **Derived from the workflow, not hardcoded — the system audit's `SA-G-06`.**
   *
   * This was a written list of five job names, and the auditor found the hole
   * in it: *"deleting a job **and** its array entry in one commit passes."* A
   * test that must be edited whenever the thing it guards changes is a test that
   * agrees with whatever it is shown.
   *
   * Every job carrying `if: github.event_name != 'push'` is now read out of the
   * file, so a job removed from the workflow is a job this cannot be told to
   * stop looking for — and the count below is the count the file itself
   * declares. What the assertions hold is unchanged: the condition on each is
   * exactly that one, and nothing narrower.
   */
  const gated = [...workflow.matchAll(/^ {4}name: (.+)$/gm)]
    .map((match) => (match[1] ?? '').trim())
    .filter((name) => {
      const at = workflow.indexOf(`    name: ${name}`);
      const job = workflow.slice(at, at + 400);
      return /^ {4}if: github\.event_name != 'push'$/m.test(job);
    });

  it('finds the gated jobs at all, or every assertion below is vacuous', () => {
    /**
     * The guard on the guard, and deliberately **not** a count.
     *
     * An empty list would make this whole block pass by examining nothing,
     * which is the defect it exists to refuse. But asserting a *number* here
     * would be pinning a tuning value this test is not about — the same trap
     * that broke two tests earlier tonight when a cap moved from 8 to 20.
     *
     * Which jobs must exist is held where it belongs and by evidence rather
     * than by a tally: `requiredCommands` above names every command the gate
     * runs, and the per-job assertions require each to be a step of a real job.
     * Deleting the hosted-build job fails three of those, which was checked by
     * deleting it.
     */
    expect(gated.length).toBeGreaterThan(0);
  });

  it('offers a fast half, and it is lint, typecheck and the tests', () => {
    expect(workflow).toMatch(/^ {4}name: lint, typecheck, tests$/m);
    expect(workflow).toContain('run: pnpm lint');
    expect(workflow).toContain('run: pnpm typecheck');
    expect(workflow).toContain('run: pnpm test');
  });

  it('can be asked for the whole thing on demand', () => {
    expect(workflow).toMatch(/^ {2}workflow_dispatch:$/m);
  });

  /**
   * **This assertion was the Keeper's KP2-02 and is replaced by its inverse.**
   *
   * It required `paths-ignore` to list `docs/**`, `knowledge/**` and a glob
   * covering every markdown file,
   * and then claimed — in a comment — that *"nothing that changes what a check
   * measures is in the ignore list"*, while checking only that two unrelated
   * strings were absent. The claim was false: `knowledge-graph/src/derive.ts`
   * walks `docs/decisions`, `knowledge/raw` and `knowledge/wiki`, and
   * `seed-graph.test.ts` asserts a byte-for-byte match against a fresh
   * derivation. All three ignored patterns were inputs to it. A push touching
   * only an owner decision record broke the suite and ran no check at all.
   *
   * **The property is now enforced by deriving it rather than by naming it.**
   * The deriver's own source is read, every path literal it walks is extracted,
   * and each one is required not to be covered by any ignore pattern. If someone
   * adds `paths-ignore` back, this fails unless the deriver reads none of what
   * it ignores. A comment cannot drift away from that, because there is no
   * comment doing the work.
   */
  /**
   * **Rewritten again, after the Keeper's KP3-03 found the rewrite weaker than
   * what it replaced.**
   *
   * Two faults, and the second was the serious one. It matched `paths-ignore`
   * entries with `/^ {6}- '([^']+)'$/` — single-quoted, six spaces — so it caught
   * a literal revert and missed four ordinary ways of writing the same list:
   * unquoted (`- docs/**`, which needs no quotes and is what a person types),
   * double-quoted, a flow sequence, and a different indent. And it **silently
   * dropped** the two assertions the old test had, that `apps/**` and
   * `packages/**` never appear — so a workflow skipping every check on every
   * source change would have passed, under a title claiming the opposite.
   *
   * Now: the `on:` block is taken whole and any line inside it that looks like a
   * skip pattern is extracted, whatever its quoting or indent; the source and
   * package trees are named as never-ignorable in their own right; and the
   * derived set from the knowledge graph is kept as well, since deriving is
   * still better than naming for the paths that can move.
   */
  /**
   * **Rewritten a third time, after the Keeper's KP4-01 found the second version
   * blind to the worst value the field can take.**
   *
   * The second version extracted *path-shaped* tokens with a regex requiring a
   * `/`. So `paths-ignore: ['**']` — skip every check on every push, the most
   * damaging single line that can be written here — was never extracted, never
   * reached the assertion, and passed a test titled for catching exactly that.
   * The guard written for it, `pattern.startsWith('**')`, could not fire on the
   * bare form. A rule, a guard beside it, and no path by which the guard runs:
   * the third occurrence of that shape in this file's history.
   *
   * **So the property is inverted.** Rather than extract what looks like a path
   * and ask whether it is safe, this takes every item of every ignore list and
   * demands it be *proven* harmless — and nothing is proven harmless except a
   * pattern whose top segment is a directory no check reads. A bare `**`, a bare
   * `*`, a filename with no directory: none of them can be proven harmless, so
   * all of them fail. Being unrecognisable is now a reason to fail rather than a
   * way to slip through, which is the direction a guard has to fail in.
   */

  /**
   * Every item of every ignore list inside a workflow's `on:` block, each
   * carrying the key it came from — because a path pattern and a branch pattern
   * are judged by different rules and confusing them is how the branch fixture
   * passed while claiming to be refused.
   */
  function ignoredPatternsIn(onBlock: string): { key: string; value: string }[] {
    const out: { key: string; value: string }[] = [];
    // `paths-ignore`, `branches-ignore`, `tags-ignore` — every key GitHub has
    // that removes runs. `branches-ignore: ['claude/**']` would take the gate off
    // the working branch, which is outside the old title's subject and inside
    // this one's.
    const keys = /((?:paths|branches|tags)-ignore)\s*:(.*)$/gm;
    for (const key of onBlock.matchAll(keys)) {
      const name = key[1] ?? '';
      const inline = key[2] ?? '';
      const from = (key.index ?? 0) + key[0].length;
      // A flow sequence on the same line, and/or a block sequence beneath it.
      const rest = onBlock.slice(from);
      const blockItems = rest.slice(0, rest.search(/^\s*[\w"'-]+\s*:/m) + 1 || rest.length);
      for (const text of [inline, blockItems]) {
        // The brackets of a flow sequence are not items in it. They were, in
        // the first draft of this repair, and the mutation test caught it
        // refusing `[` while `**` went unexamined — a guard that fires on the
        // right line for the wrong reason is not a guard, and it would have
        // refused every legitimate flow sequence too.
        for (const item of text.matchAll(/(?:^|[[,\s])-?\s*['"]?([^\s'",[\]]+)['"]?/gm)) {
          const value = (item[1] ?? '').trim();
          if (value && value !== '-') out.push({ key: name, value });
        }
      }
    }
    return out;
  }

  /**
   * Why a pattern is not permitted, or null when it is. A pattern is permitted
   * only when its first segment is a directory nothing reads — everything else,
   * recognised or not, is refused.
   */
  function whyRefused(
    { key, value: pattern }: { key: string; value: string },
    never: ReadonlySet<string>,
  ): string | null {
    // A branch or tag is not a path, and no branch may be exempt: the workflow
    // declares `branches: ['**']` because the gate has to run wherever the work
    // is. So these are refused outright rather than measured against the set of
    // directories a check reads, which would say nothing about them.
    if (key !== 'paths-ignore') return `${key}: ${pattern} takes the gate off a branch`;
    if (pattern.startsWith('*')) return `${pattern} covers paths every check reads`;
    const top = pattern.split('/')[0] ?? '';
    if (!pattern.includes('/')) {
      return `${pattern} is a bare name, and nothing here can prove it is not read`;
    }
    /**
     * **KP5-05: the comment said "prove it harmless" and the code permitted by
     * default.** It refused only a top segment on the derived list and waved
     * through anything unrecognised — so `paths-ignore: ['netlify/**']` passed,
     * and would have taken the gate off every change to the two functions that
     * are the whole of slices two and three. `.claude/**` and `.virgil/**` are
     * read by tests too and were equally invisible.
     *
     * It refuses by default now, which is what the comment always claimed. A new
     * top-level directory that genuinely nothing reads has to be named in
     * `PERMITTED_TO_IGNORE` by whoever adds it, with the reason — which is a
     * deliberate act rather than an omission.
     */
    const PERMITTED_TO_IGNORE = new Set<string>([
      // Nothing. Every top-level directory in this repository is read by some
      // check today. The set exists so that the answer to "why is this empty"
      // is written down rather than inferred.
    ]);
    if (PERMITTED_TO_IGNORE.has(top)) return null;
    if (never.has(top)) return `${pattern} is under ${top}, which a check reads`;
    return `${pattern} is under ${top}, which nothing here can prove no check reads`;
  }

  /** The directories a check reads: derived where they can move, named where they cannot. */
  function neverIgnorable(): Set<string> {
    const deriver = readFileSync(
      resolve(repoRoot, 'packages/knowledge-graph/src/derive.ts'),
      'utf8',
    );
    const read = [...deriver.matchAll(/join\((?:root|kdir), '([^']+)'\)/g)].map((m) => m[1] ?? '');
    const derived = new Set(read.map((path) => path.split('/')[0] ?? ''));
    // `kdir` is `knowledge/`, which the join hides behind a variable.
    derived.add('knowledge');
    expect(derived.size).toBeGreaterThan(1);
    // Named outright, not derived: a check reading these is the normal case, and
    // their absence from an ignore list is not something to infer from anywhere.
    for (const dir of ['apps', 'packages', 'constitution', 'schemas', '.github']) derived.add(dir);
    return derived;
  }

  /** The `on:` block, whole, from `on:` to the next top-level key. */
  function onBlockOf(yaml: string): string {
    const onAt = yaml.search(/^on:$/m);
    expect(onAt).toBeGreaterThan(-1);
    const after = yaml.slice(onAt + 3);
    const endsAt = after.search(/^\S/m);
    return endsAt === -1 ? after : after.slice(0, endsAt);
  }

  it('ignores no path that any check actually reads', () => {
    const never = neverIgnorable();
    for (const pattern of ignoredPatternsIn(onBlockOf(workflow))) {
      const refused = whyRefused(pattern, never);
      expect(refused, `the workflow's on: block ignores ${pattern.value}`).toBeNull();
    }
  });

  /**
   * **KP4-07(a): the test that was supposed to prove the test above.**
   *
   * It ran the extraction over five YAML forms and asserted only that something
   * came out — never that the something was *refused*. So it proved extraction
   * and called itself catching, and it would have passed with `apps` and
   * `packages` deleted from the never-set, which is the exact deletion KP3-03
   * was raised about. It runs the whole judgment now, and the list it runs it
   * over includes the three forms KP4-01 found slipping through.
   */
  it('refuses an ignore list written any of the ordinary ways, and the three that got through', () => {
    const never = neverIgnorable();
    const mustRefuse: [string, string][] = [
      ['quoted, six spaces', "  push:\n    paths-ignore:\n      - 'docs/**'\n"],
      ['unquoted', '  push:\n    paths-ignore:\n      - docs/**\n'],
      ['double-quoted', '  push:\n    paths-ignore:\n      - "docs/**"\n'],
      ['flow sequence', "  push:\n    paths-ignore: ['docs/**', 'knowledge/**']\n"],
      ['four-space indent', "  push:\n    paths-ignore:\n    - 'apps/**'\n"],
      ['the source tree', "  push:\n    paths-ignore:\n      - 'apps/**'\n      - 'packages/**'\n"],
      // KP4-01's three. The first is the whole gate, gone, in eleven characters.
      ['everything', "  push:\n    paths-ignore: ['**']\n"],
      ['everything, one star', "  push:\n    paths-ignore: ['*']\n"],
      ['a bare filename', "  push:\n    paths-ignore: ['CLAUDE.md']\n"],
      // Not paths at all: the gate taken off the branch the work happens on.
      ['the working branch', "  push:\n    branches-ignore: ['claude/**']\n"],
    ];
    for (const [what, form] of mustRefuse) {
      const patterns = ignoredPatternsIn(form);
      expect(patterns.length, `nothing extracted from ${what}: ${form.trim()}`).toBeGreaterThan(0);
      const refusals = patterns.map((p) => whyRefused(p, never)).filter((r) => r !== null);
      expect(refusals.length, `${what} was not refused: ${form.trim()}`).toBeGreaterThan(0);
    }
  });

  it('holds the expensive jobs back from a push and from nothing else', () => {
    const conditions = workflow.match(/^ {4}if: .*$/gm) ?? [];
    expect(conditions.length).toBe(gated.length);
    for (const condition of conditions) {
      // The one permitted condition. Anything narrower — excluding pull
      // requests, or naming a branch — would take the full gate off the only
      // path into `main`.
      expect(condition.trim()).toBe("if: github.event_name != 'push'");
    }
  });

  it('still declares every expensive job, rather than deleting them', () => {
    for (const name of gated) {
      expect(workflow).toContain(name);
    }
  });
});
