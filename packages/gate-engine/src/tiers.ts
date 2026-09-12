/**
 * **The smallest adequate formation, derived from the diff rather than declared.**
 *
 * `constitution/REVIEW_POLICY.md` — authority layer 2 — already requires this:
 *
 * > The Architect's risk classification selects the smallest adequate formation.
 * > Low-risk ordinary change: Keeper alone. Higher consequence: independent
 * > specialists in parallel … then the Arbiter. **The full roster is never
 * > activated by default.**
 *
 * That rule has never once been followed. Every piece of work in this
 * repository's history has activated a full formation, which is the one thing it
 * forbids. On 2026-09-12 a two-file change took eleven independent reviews. This
 * file is the layer-4 implementation of the layer-2 rule, not an amendment to it.
 *
 * **The tier is derived from the changed paths and never read from a claim.** A
 * brief that says "this is tier 1" while the diff edits `.claude/settings.json`
 * is `KXR-07` wearing a new hat — a contract satisfied by trusting the candidate
 * about itself. The paths are the fact; the claim is not consulted, except that
 * a brief may raise its own tier and never lower it.
 *
 * **What this cannot do**, said rather than implied: it reads paths, not
 * content. A behavioural change smuggled into a file nobody listed is tier 2
 * here however dangerous it is, and a comment fixed in `gates.ts` is tier 3
 * however trivial. Paths are a proxy for consequence and a coarse one. It is
 * chosen because it cannot be argued with, not because it is precise.
 */

/** A path that makes a change governed, and the reason it does. */
export interface GovernedPath {
  /** Matched against the repository-relative path of every changed file. */
  readonly matches: (path: string) => boolean;
  /** Printed when this path is what raised the tier. Names the authority. */
  readonly because: string;
}

const prefix = (p: string, because: string): GovernedPath => ({
  matches: (path) => path.startsWith(p),
  because,
});

const exact = (p: string, because: string): GovernedPath => ({
  matches: (path) => path === p,
  because,
});

/**
 * **Tier 3's list is closed and explicit**, because a tier system whose top tier
 * is a judgement call collapses into whichever tier is convenient. Every path
 * here has produced a real finding in this repository's history.
 */
export const GOVERNED: readonly GovernedPath[] = [
  prefix('constitution/', 'authority layer 2; only the owner may change it'),
  exact('docs/product/VIRGIL_MASTER_COMMISSION.md', 'authority layer 1'),
  prefix('docs/decisions/OD-', 'authority layer 1: an owner decision'),
  prefix('docs/decisions/ADR-', 'authority layer 3: an accepted ADR'),
  exact('CLAUDE.md', 'it states what every session may and may not do'),
  prefix('.claude/', 'it states what every session may and may not do'),
  prefix('.github/workflows/', 'it decides which checks run at all'),
  prefix('packages/gate-engine/src/', 'it decides what a gate refuses'),
  prefix('packages/domain/src/', 'it decides which transitions are legal'),
  prefix('netlify/functions/', 'it runs with the owner’s secrets in scope'),
  exact('docs/process/FINDINGS.md', 'the one file whose job is to be trusted'),
  // Files whose whole job is to make a check able to fail. A change here can
  // make the suite green without making the repository sound, which is the
  // failure mode every other entry on this list exists to prevent.
  exact('apps/mission-control/e2e/mutation-manifest.ts', 'it proves checks can fail'),
  exact('apps/mission-control/test/check-quality-v11.test.ts', 'it proves checks can fail'),
  exact('apps/mission-control/test/findings-register.test.ts', 'it guards the register'),
  exact('apps/mission-control/test/review-records.test.ts', 'it guards the kept reviews'),
  exact('apps/mission-control/test/cache-inputs.test.ts', 'it guards the test cache'),
  exact('packages/gate-engine/test/refusals.test.ts', 'it proves every gate can refuse'),
  exact('packages/gate-engine/src/tiers.ts', 'it decides how much review a change gets'),
  exact('packages/gate-engine/test/tiers.test.ts', 'it guards the tier derivation'),
];

export type Tier = 1 | 2 | 3;

export interface TierVerdict {
  readonly tier: Tier;
  /** For tier 3, the paths that raised it and why. Empty otherwise. */
  readonly raisedBy: readonly { path: string; because: string }[];
}

/** Documentation carries no behaviour, so a diff of nothing else is tier 1. */
function isProse(path: string): boolean {
  return path.endsWith('.md') || path.endsWith('.txt');
}

/**
 * **The highest tier wins, always, and there is no averaging.** A diff touching
 * any governed path is tier 3 whatever else it touches — the cheap ninety
 * percent of a change does not dilute the expensive ten.
 */
export function tierOf(paths: readonly string[]): TierVerdict {
  const raisedBy: { path: string; because: string }[] = [];
  for (const path of paths) {
    for (const governed of GOVERNED) {
      if (governed.matches(path)) {
        raisedBy.push({ path, because: governed.because });
        break;
      }
    }
  }
  if (raisedBy.length > 0) return { tier: 3, raisedBy };

  // An empty diff is not a low-risk change, it is an absent one. Calling it
  // tier 1 would let "no files changed" buy a merge with no review.
  if (paths.length === 0) return { tier: 2, raisedBy: [] };

  if (paths.every(isProse)) return { tier: 1, raisedBy: [] };
  return { tier: 2, raisedBy: [] };
}

/**
 * A brief may raise its own tier and never lower it: a builder who thinks their
 * change is more consequential than its paths suggest is a builder to agree
 * with. Returns the complaint, or `null` when the claim is acceptable.
 */
export function claimComplaint(claimed: Tier, derived: TierVerdict): string | null {
  if (claimed >= derived.tier) return null;
  const named = derived.raisedBy
    .map(({ path, because }) => `${path} (${because})`)
    .slice(0, 4)
    .join('; ');
  return `claims tier ${claimed} but the diff derives tier ${derived.tier}: ${named}`;
}
