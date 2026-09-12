/**
 * Derive the risk tier of the working branch from the paths it changes.
 *
 * `docs/process/RISK_TIERS.md` states the tiers; `packages/gate-engine/src/tiers.ts`
 * holds the list and makes the decision. This script only supplies the diff, so
 * that there is exactly one place a tier comes from and it is not this one.
 *
 *   pnpm tier                 print the derived tier
 *   pnpm tier -- --claimed 1  exit non-zero when the claim is lower than derived
 *   pnpm tier -- --base <ref> compare against a ref other than origin/main
 */
import { execFileSync } from 'node:child_process';
import { claimComplaint, type Tier, tierOf } from '../packages/gate-engine/src/tiers.js';

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};

const base = flag('--base') ?? 'origin/main';

let changed: string;
try {
  changed = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' });
} catch {
  console.error(`tier: could not diff against ${base}. Fetch it first.`);
  process.exit(2);
}

const paths = changed
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean);
const verdict = tierOf(paths);

console.log(
  `tier ${verdict.tier}, from ${paths.length} changed ${paths.length === 1 ? 'path' : 'paths'} against ${base}`,
);
for (const { path, because } of verdict.raisedBy) console.log(`  governed: ${path} — ${because}`);

const claimedRaw = flag('--claimed');
if (claimedRaw !== undefined) {
  const claimed = Number(claimedRaw);
  if (claimed !== 1 && claimed !== 2 && claimed !== 3) {
    console.error(`tier: --claimed must be 1, 2 or 3, not ${claimedRaw}`);
    process.exit(2);
  }
  const complaint = claimComplaint(claimed as Tier, verdict);
  if (complaint !== null) {
    console.error(`tier: ${complaint}`);
    process.exit(1);
  }
  console.log(`tier: a claim of ${claimed} is acceptable against a derivation of ${verdict.tier}`);
}
