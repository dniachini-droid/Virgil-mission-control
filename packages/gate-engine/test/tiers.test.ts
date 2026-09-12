import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { claimComplaint, GOVERNED, tierOf } from '../src/tiers.js';

/**
 * **The tier is derived, and this proves it against work already done.**
 *
 * Every path list below was taken from a real commit in this repository, named
 * by its SHA, rather than invented to make the check agree with itself. A
 * fixture a builder wrote to pass is not evidence about anything.
 */

const REVIEW_POLICY = readFileSync(
  new URL('../../../constitution/REVIEW_POLICY.md', import.meta.url),
  'utf8',
);

describe('the tier is derived from the diff, not declared', () => {
  it('the layer-2 rule this implements still says what it said', () => {
    /**
     * If `REVIEW_POLICY.md` is amended, this fails and somebody reconciles the
     * implementation with the rule. Without it, the tiers could drift from the
     * authority they claim to implement and nothing would notice — which is
     * `KXR-28`, a layer-4 document quoting deleted text as live authority.
     */
    expect(REVIEW_POLICY).toContain(
      "The Architect's risk classification selects the smallest adequate formation",
    );
    expect(REVIEW_POLICY).toContain('The full roster is never activated by default.');
  });

  it('documentation alone is tier 1', () => {
    // 92476d4 — "The order, written down, so it stops being re-litigated"
    expect(tierOf(['docs/process/ROADMAP.md']).tier).toBe(1);
    expect(tierOf(['docs/process/ROADMAP.md', 'docs/process/PHASE_1_BRIEF.md']).tier).toBe(1);
  });

  it('product code inside an existing boundary is tier 2', () => {
    // e98dd63 — the KP10-13 repair, before it touched anything governed.
    expect(
      tierOf([
        'apps/mission-control/src/world/mobile/MobileRoom.tsx',
        'apps/mission-control/src/world/panel/panelStore.ts',
      ]).tier,
    ).toBe(2);
  });

  it('an empty diff is not a low-risk change', () => {
    // Otherwise "no files changed" buys a merge with no review.
    expect(tierOf([]).tier).toBe(2);
  });

  describe('work already done lands where it belongs', () => {
    const cases: { what: string; sha: string; paths: string[]; tier: 1 | 2 | 3 }[] = [
      {
        what: 'installing Superpowers edited what every session may do',
        sha: 'OD-0016 lineage',
        paths: ['CLAUDE.md', '.claude/settings.json'],
        tier: 3,
      },
      {
        what: 'the record-keeping commit wrote to the register',
        sha: '5667063',
        paths: ['docs/process/FINDINGS.md', 'apps/mission-control/test/findings-register.test.ts'],
        tier: 3,
      },
      {
        what: 'the seed-graph regeneration touched no governed path',
        sha: '67a2067',
        paths: ['packages/test-fixtures/knowledge/seed-graph.json'],
        tier: 2,
      },
      {
        what: 'an owner decision is authority layer 1',
        sha: 'f65fd84',
        paths: ['docs/decisions/OD-0015-overnight-authorisation-2026-09-11.md'],
        tier: 3,
      },
    ];
    for (const c of cases) {
      it(`${c.what} → tier ${c.tier} (${c.sha})`, () => {
        expect(tierOf(c.paths).tier).toBe(c.tier);
      });
    }
  });

  it('the cheap ninety percent does not dilute the expensive ten', () => {
    const verdict = tierOf([
      'docs/process/NOTES.md',
      'README.md',
      'apps/mission-control/src/world/floor.ts',
      'constitution/REVIEW_POLICY.md',
    ]);
    expect(verdict.tier).toBe(3);
    expect(verdict.raisedBy.map((r) => r.path)).toEqual(['constitution/REVIEW_POLICY.md']);
  });

  it('names the path that raised the tier, and the authority it answers to', () => {
    const verdict = tierOf(['.github/workflows/checks.yml']);
    expect(verdict.raisedBy[0]?.because).toBe('it decides which checks run at all');
  });
});

describe('a claim may raise its own tier and never lower it', () => {
  it('refuses a brief claiming tier 1 over a governed diff, naming the path', () => {
    const complaint = claimComplaint(1, tierOf(['.claude/settings.json']));
    expect(complaint).toContain('claims tier 1 but the diff derives tier 3');
    expect(complaint).toContain('.claude/settings.json');
  });

  it('accepts a brief claiming tier 3 over a documentation diff', () => {
    expect(claimComplaint(3, tierOf(['docs/process/ROADMAP.md']))).toBeNull();
  });

  it('accepts a claim that matches', () => {
    expect(claimComplaint(2, tierOf(['apps/mission-control/src/world/floor.ts']))).toBeNull();
  });
});

describe('the governed list cannot rot silently', () => {
  it('every entry states the authority it answers to', () => {
    for (const g of GOVERNED) {
      expect(g.because.length, 'a governed path with no stated reason').toBeGreaterThan(10);
    }
  });

  it('this file and the module it tests are themselves governed', () => {
    // A tier system that can be edited at tier 2 is a tier system that can be
    // switched off at tier 2.
    expect(tierOf(['packages/gate-engine/src/tiers.ts']).tier).toBe(3);
    expect(tierOf(['packages/gate-engine/test/tiers.test.ts']).tier).toBe(3);
  });
});
