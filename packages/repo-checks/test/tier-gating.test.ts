import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * **What the workflow is allowed to skip, and what it is never allowed to skip.**
 *
 * `KXR-42`: `docs/process/RISK_TIERS.md` derived a tier and nothing consumed it,
 * so a one-file documentation change waited twenty minutes for four browsers to
 * confirm the 3D world renders at 390 pixels. The workflow now asks the tier
 * first and skips the two jobs whose inputs prose cannot touch.
 *
 * That is a narrower claim than "tier 1 is cheap", and the narrowness is the
 * point. `RISK_TIERS.md` says tier 1 skips the ceremony and never the
 * verification, and this is the one amendment to it: **a check may be skipped
 * only when the diff provably cannot change its inputs.** The V11 and hosted
 * builds are compiled from `src/`; a markdown file is not an input to either.
 * Everything that reads prose — the suite itself, which turbo declares `docs/**`
 * and `knowledge/**` as inputs to, and the Mind Scan, which reads
 * `knowledge/` — still runs on every change at every tier.
 *
 * Written because the first draft of that wiring was wrong in a way nothing
 * would have caught: `verify-v11` already carried an `if:`, a second `if:` was
 * added above it, and **YAML keeps the last key of a duplicated pair** — so the
 * gate was silently discarded and the job ran exactly as before. It looked
 * correct in the diff.
 */

const workflow = readFileSync(
  resolve(import.meta.dirname, '../../..', '.github/workflows/checks.yml'),
  'utf8',
);

/** Each top-level job, as its own block of text. */
function jobs(): Map<string, string> {
  const out = new Map<string, string>();
  const lines = workflow.split('\n');
  const starts: { name: string; at: number }[] = [];
  for (const [i, line] of lines.entries()) {
    const m = /^ {2}([a-z0-9_-]+):\s*$/.exec(line);
    if (m?.[1]) starts.push({ name: m[1], at: i });
  }
  for (const [i, start] of starts.entries()) {
    const end = starts[i + 1]?.at ?? lines.length;
    out.set(start.name, lines.slice(start.at, end).join('\n'));
  }
  return out;
}

describe('the workflow consumes the tier, and skips only what prose cannot change', () => {
  it('a job is never given two `if:` keys, because YAML keeps only the last', () => {
    const offenders: string[] = [];
    for (const [name, block] of jobs()) {
      const count = block.split('\n').filter((l) => /^ {4}if:/.test(l)).length;
      if (count > 1)
        offenders.push(`${name} declares ${count} \`if:\` keys; only the last survives`);
    }
    expect(offenders, offenders.join('; ')).toEqual([]);
  });

  it('every job that reads the tier declares it as a dependency', () => {
    const offenders: string[] = [];
    for (const [name, block] of jobs()) {
      if (!block.includes('needs.tier.outputs.tier')) continue;
      if (!/^ {4}needs:.*\btier\b/m.test(block)) {
        offenders.push(`${name} reads needs.tier.outputs.tier without \`needs: tier\``);
      }
    }
    expect(offenders, offenders.join('; ')).toEqual([]);
  });

  it('the derivation exists and fails safe to the governed tier', () => {
    const tier = jobs().get('tier');
    expect(tier, 'the workflow has no job deriving the tier').toBeDefined();
    expect(tier).toContain('outputs:');
    expect(tier).toContain('pnpm --silent tier --base');
    // Two ways for the derivation to go wrong, and both must land on 3.
    expect(tier, 'a non-zero exit must derive the governed tier').toContain('tier=3');
    expect(tier, 'unreadable output must derive the governed tier').toContain('t=3');
    expect(tier, 'the base must exist locally, so the checkout cannot be shallow').toContain(
      'fetch-depth: 0',
    );
  });

  it('the checks that read prose are never gated on the tier', () => {
    /**
     * `turbo.json` declares `docs/**` and `knowledge/**` as inputs to the test
     * task, so a prose change really can change what the suite sees. Gating the
     * suite on the tier would be skipping verification rather than ceremony,
     * which is the line `RISK_TIERS.md` draws.
     */
    for (const name of ['fast', 'artifacts', 'standalone']) {
      const block = jobs().get(name);
      expect(block, `the workflow has no ${name} job`).toBeDefined();
      expect(
        block?.includes('needs.tier.outputs.tier'),
        `${name} must run at every tier: it reads prose, or costs seconds`,
      ).toBe(false);
    }
  });

  it('the tiers document records the amendment rather than contradicting it', () => {
    const doc = readFileSync(
      resolve(import.meta.dirname, '../../..', 'docs/process/RISK_TIERS.md'),
      'utf8',
    );
    expect(
      doc,
      'RISK_TIERS.md still says tier 1 skips no verification, while the workflow skips two jobs',
    ).toContain('provably cannot change its inputs');
  });
});
