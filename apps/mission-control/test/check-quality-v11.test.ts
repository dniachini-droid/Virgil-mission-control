import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * **Checks on the checks — mechanism 2, and it exists because of one night.**
 *
 * On 11 September three separate checks in `verify-web-build.ts` were found, by
 * hand, to be incapable of failing:
 *
 *  - one waited for text drawn inside the WebGL canvas, where `innerText` can
 *    never reach it, and burned its full sixty-second budget every run while
 *    passing on assertions that never needed it;
 *  - one asserted an absence immediately after navigation, before the world had
 *    drawn, so it passed twice with the defect deliberately reinstated;
 *  - one counted world touch targets, which are drawn whether or not a world is
 *    drawn, so it passed once by timing and failed the honest build on the next
 *    run.
 *
 * Every one was found by removing the guard, rebuilding, and watching whether
 * the check went red — the ritual this file's sibling (`mutation-manifest`)
 * mechanises. What this file does is narrower and cheaper: it refuses the
 * *shapes* that make a check unable to fail, by reading the source, so the
 * cheapest kind of dead check cannot be written in the first place.
 *
 * **It is deliberately not a lint rule about style.** Each rule below names a
 * defect that actually happened in this repository, and a rule that cannot point
 * at one is not here.
 */

const E2E = new URL('../e2e/', import.meta.url);
const FILES = readdirSync(E2E)
  .filter((name) => name.startsWith('verify-') && name.endsWith('.ts'))
  .map((name) => ({ name, source: readFileSync(new URL(name, E2E), 'utf8') }));

/** Source with block and line comments removed: a rule must judge code. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Every line of `source`, 1-indexed, with comments blanked rather than removed. */
function lines(source: string): { n: number; text: string }[] {
  return code(source)
    .split('\n')
    .map((text, i) => ({ n: i + 1, text }));
}

describe('a verifier reads every file it claims to check', () => {
  it('finds the verifiers, or this file asserts nothing at all', () => {
    // The guard on the guard: a rename or a moved directory would otherwise make
    // every rule below pass by examining an empty list, which is the exact
    // species of defect this file exists to refuse.
    expect(FILES.length).toBeGreaterThanOrEqual(3);
    for (const file of FILES) expect(file.source.length).toBeGreaterThan(1000);
  });
});

describe('a verifier waits before it asserts an absence', () => {
  /**
   * **The second of the three dead checks, and the rule is exact.**
   *
   * A case navigated and then asserted that the recording's fixtures were *not*
   * on the page. With the defect deliberately reinstated they were — a second
   * later — so the check passed twice while testing nothing. An absence asserted
   * before the page can produce the thing is not an absence; it is a race the
   * defect wins.
   *
   * So: between a `page.goto` and the **first `failures.push`** after it, there
   * must be at least one wait. That is precise — it names two anchors that are
   * unambiguous in the source — and it is exactly the shape of the defect.
   */
  for (const { name, source } of FILES) {
    it(`${name} waits between navigating and its first possible failure`, () => {
      const text = code(source);
      const problems: string[] = [];
      for (const nav of text.matchAll(/page\.goto\(/g)) {
        const from = nav.index ?? 0;
        const after = text.slice(from);
        const asserts = after.search(/failures\.push\(/);
        if (asserts === -1) continue;
        /**
         * **What counts as a wait, corrected after the rule's first run.**
         *
         * It flagged six places in `verify-owner-build-v11.ts` that were not
         * defects at all: that file waits with `pressUntil` — which polls a
         * condition until it holds — and with a `requestAnimationFrame` loop.
         * Both are waits; the rule simply did not know their names.
         *
         * A second run found three more of the same kind — `waitForWorld`, and
         * Playwright's locator `.waitFor()`. Rather than keep adding names one
         * at a time, anything matching `waitFor…(` counts, which is the naming
         * convention every wait helper in this repository already follows.
         *
         * These are corrections to the rule's vocabulary, not relaxations of
         * what it demands. The demand is unchanged: something must make the
         * page's readiness a condition before a failure can be asserted. A rule
         * that flags correct code gets relaxed until it means nothing, so it is
         * taught rather than loosened.
         */
        const waited = after
          .slice(0, asserts)
          .search(
            /waitFor\w*\(|\.waitFor\(|worldStill\(|framePeriodMs\(|pressUntil\(|requestAnimationFrame|frames\(/,
          );
        if (waited === -1) {
          const line = text.slice(0, from).split('\n').length;
          problems.push(`${name}:${line} asserts a failure after navigating with no wait between`);
        }
      }
      expect(problems, 'an absence asserted before the page can produce it is a race').toEqual([]);
    });
  }
});

describe('a verifier looks at what it waited for', () => {
  /**
   * **The narrow, precise form of the swallowed-wait rule.**
   *
   * `await page.waitFor…().catch(() => {})` is legitimate and this file does not
   * ban it: a check may want to proceed and let a later assertion produce the
   * finding, which gives a better message than a raw timeout would. What is
   * never legitimate is waiting for something and then **never looking at it** —
   * that wait proved nothing and its failure is invisible.
   *
   * So the rule is about the subject, not the shape: whatever a swallowed wait
   * names must appear again later in the file. A rule that banned the shape
   * outright flagged fifteen legitimate waits on the first run, and a rule that
   * flags what is correct gets relaxed until it means nothing.
   */
  for (const { name, source } of FILES) {
    it(`${name} uses the subject of every wait whose failure it discards`, () => {
      const text = code(source);
      const orphans: string[] = [];
      for (const swallow of text.matchAll(
        /waitFor(?:Selector|Function)\(([\s\S]{0,200}?)\)[\s\S]{0,80}?\.catch\(\s*\(\s*\)\s*=>\s*(?:\{\s*\}|undefined|null)\s*\)/g,
      )) {
        const argument = swallow[1] ?? '';
        // What the wait is about: a selector, or the identifiers in a predicate.
        const subjects = [
          ...[...argument.matchAll(/['"`]([^'"`]{3,})['"`]/g)].map((m) => m[1] ?? ''),
          ...[...argument.matchAll(/__virgilV11\?\.(\w+)/g)].map((m) => m[1] ?? ''),
        ].filter((subject) => subject.length > 2 && !/^(attached|visible|hidden)$/.test(subject));
        if (subjects.length === 0) continue;
        const after = text.slice((swallow.index ?? 0) + swallow[0].length);
        /**
         * **Compared by root, not literally — corrected after the first run.**
         *
         * It flagged two waits that are doing real work: one waits for
         * `.v11-branch-rows` and then reads `.v11-branch-row-name`, the other
         * waits for `.v11-branch-gone` and then reads `.v11-branches`. In both
         * the failure is observable — the read comes back empty and the
         * assertion fires — and in both the check goes on to examine a child or
         * a parent of what it waited for, which a literal string comparison
         * cannot see.
         *
         * So a subject counts as used when a later line names it, or names
         * anything sharing its first two hyphenated segments. Still precise
         * enough to catch a wait on something the file never mentions again,
         * which is the defect.
         */
        const root = (subject: string) => subject.split('-').slice(0, 2).join('-');
        const used = subjects.some(
          (subject) => after.includes(subject) || after.includes(root(subject)),
        );
        if (!used) {
          const line = text.slice(0, swallow.index ?? 0).split('\n').length;
          orphans.push(`${name}:${line} waits for ${subjects.join(', ')} and never looks at it`);
        }
      }
      expect(orphans, 'a wait nothing looks at afterwards proved nothing').toEqual([]);
    });
  }
});

describe('a verifier presses the product, not a convenience', () => {
  /**
   * **KP5-02, three times over.** The world's 48 px targets carry
   * `pointer-events: none` by design — `mobile.css` calls it load-bearing,
   * because an overlay that took the press would take it from the camera. So
   * `page.click` on one can never land, and the fallback used to pass the
   * failure off as a starved main thread. `pressWorld` exists for that and
   * refuses a covered, hidden or absent target.
   */
  for (const { name, source } of FILES) {
    it(`${name} never clicks a world target as though it were a button`, () => {
      const offenders = lines(source).filter(({ text }) =>
        /page\.click\(\s*[`'"]\[data-touch-target=/.test(text),
      );
      expect(
        offenders.map((line) => `${name}:${line.n}`),
        'world targets are pointer-events: none; the product hit-tests on the stage',
      ).toEqual([]);
    });
  }
});

/**
 * **A rule that was written and then deleted, recorded because the deletion is
 * the point.**
 *
 * A fourth rule required every `mark()` — a verifier's "this held" line — to be
 * guarded by a comparison against the failure count, after `KP5-09` found a
 * check announcing success above the code that could still fail. It flagged
 * fourteen calls in `verify-owner-build-v11.ts` on its first run, and every one
 * was a **progress note** rather than a verdict: the frame period, the viewport
 * being measured, the seconds elapsed. Those are facts whether or not something
 * later fails.
 *
 * Telling a progress note from a verdict by reading the source is not something
 * this can do precisely, and an imprecise rule has exactly one future: the
 * threshold gets raised each time it fires until it fires at nothing. That is
 * worse than no rule, because it looks like coverage. So it is not here, and
 * `KP5-09` stays the responsibility of whoever reviews a verifier.
 */
