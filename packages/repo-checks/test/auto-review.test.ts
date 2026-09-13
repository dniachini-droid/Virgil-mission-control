import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * **The workflow that commissions the review cannot be quietly neutered.**
 *
 * `review.yml` runs an independent session on every pull request above tier 1
 * and posts its verdict. Four properties make it worth having, and each one can
 * be removed by an edit that looks harmless in a diff:
 *
 * - **It cannot write.** A reviewer that could edit the candidate is a builder,
 *   and `CLAUDE.md` is explicit that one session performs one hop.
 * - **It is gated on the tier.** Without that it reviews typos, which is how
 *   this repository spent two days on eleven rounds of a two-file change.
 * - **It fails loudly with no token.** A workflow that silently skips is worse
 *   than one that fails: the pull request would look reviewed and would not be.
 * - **A session that produces no verdict says so.** A crash must not read as a
 *   clean result — the same class as a cached pass reported as a fresh one.
 */

const root = resolve(import.meta.dirname, '../../..');
const workflow = readFileSync(resolve(root, '.github/workflows/review.yml'), 'utf8');
const prompt = readFileSync(resolve(root, '.github/review-prompt.md'), 'utf8');

describe('the automatic review', () => {
  it('cannot write to the repository', () => {
    expect(workflow, 'the reviewer must not be able to push').not.toMatch(/^\s*contents:\s*write/m);
    expect(workflow).toMatch(/^\s*contents:\s*read/m);
    expect(workflow, 'it has to be able to say what it found').toMatch(
      /^\s*pull-requests:\s*write/m,
    );
  });

  it('runs only above tier 1, and derives the tier rather than being told', () => {
    expect(workflow).toContain("if: needs.tier.outputs.tier != '1'");
    expect(workflow).toContain('pnpm --silent tier --base');
    expect(workflow, 'the base must exist locally to diff against').toContain('fetch-depth: 0');
  });

  it('treats every failure of the derivation as governed', () => {
    // Two ways to fail, and both must land on 3 — the expensive path is the
    // default and the cheap one has to be earned.
    expect(workflow).toContain('echo "tier=3" >> "$GITHUB_OUTPUT"; exit 0');
    expect(workflow).toMatch(/unreadable output[^\n]*t=3/);
  });

  it('refuses to run without a token rather than skipping silently', () => {
    expect(workflow).toContain('CLAUDE_CODE_OAUTH_TOKEN is not set');
    expect(workflow).toMatch(/if \[ -z "\$TOKEN" \]; then/);
  });

  it('does not let a session that produced no verdict read as a clean one', () => {
    expect(workflow).toContain('PASS|BLOCKED|INSUFFICIENT_EVIDENCE');
    expect(workflow).toContain('this pull request is');
  });

  it("the reviewer's instructions do not let it act as a builder", () => {
    for (const forbidden of [
      'Edit any file in the candidate',
      'Merge anything',
      'Approve anything',
    ]) {
      expect(prompt, `the prompt stopped forbidding: ${forbidden}`).toContain(forbidden);
    }
    expect(prompt, 'a review must name what it reviewed').toContain('Name the\nSHA');
    expect(prompt, 'the repair cap must reach the reviewer').toContain('REPAIR_LIMITS.md');
    expect(prompt, 'the reviewer must not trust the builder').toContain('Verify rather than read');
  });
});
