import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROUNDS_WITH_OWNER, ROUNDS_WITHOUT_OWNER } from '@virgil/gate-engine';
import { describe, expect, it } from 'vitest';

/**
 * **The automatic chain, guarded where it would fail silently.**
 *
 * `docs/process/AUTOMATIC_HANDOFF_CHAIN.md` describes a chain that runs while
 * the owner is asleep: the conductor starts a build, the pull request wakes it,
 * it starts a review, the review wakes it, and it either starts one fix round
 * or stops. Every part of that is prose in `.claude/`, and prose drifts.
 *
 * These are the four drifts that would not announce themselves:
 *
 * 1. A role quietly gaining the right to start the next session, which turns a
 *    one-hop chain into a tree.
 * 2. The round cap in the code drifting away from the round cap in the
 *    constitution, so the chain runs at a limit nobody authorised.
 * 3. The conductor being put back on a timer, which the owner refused by name.
 * 4. The commands the roles are told to run not existing.
 *
 * Each `it` below fails if its subject changes. That is the whole point: they
 * are not tests of behaviour, they are tests that a written rule still has
 * something holding it.
 */

const root = resolve(import.meta.dirname, '../../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

const SKILL = '.claude/skills/raphael/SKILL.md';
const ROLE_FILES = ['.claude/agents/fabricator.md', '.claude/agents/keeper.md'];

describe('one hop: no worker starts the next worker', () => {
  const matrix = JSON.parse(read('constitution/permission-matrix.json')) as {
    roles: { id: string; mayLaunchStages: boolean }[];
  };

  it('exactly one role may launch a stage, and it is the conductor', () => {
    const launchers = matrix.roles.filter((r) => r.mayLaunchStages).map((r) => r.id);
    expect(launchers).toEqual(['virgil']);
  });

  for (const file of ROLE_FILES) {
    it(`${file} tells its session to start nothing, and says why`, () => {
      const body = read(file);
      // Not a synonym check. These two strings are the ones a session reads
      // when it is about to do the obvious, helpful, forbidden thing.
      expect(body, `${file} no longer says to start nothing`).toContain('Start nothing');
      expect(body, `${file} no longer cites the matrix for it`).toContain('mayLaunchStages: false');
    });

    it(`${file} agrees with the matrix about launching`, () => {
      const id = file.split('/').pop()?.replace('.md', '');
      const role = matrix.roles.find((r) => r.id === id);
      expect(
        role?.mayLaunchStages,
        `${id} may now launch stages; the file still says it cannot`,
      ).toBe(false);
    });
  }
});

describe('the round cap is the constitution, not a preference', () => {
  const authority = JSON.parse(read('constitution/authority.json')) as {
    repairLimits: { maxCyclesWithoutOwner: number; maxCyclesWithOwner: number };
  };

  it('the counter uses authority.json numbers and no others', () => {
    expect(ROUNDS_WITHOUT_OWNER).toBe(authority.repairLimits.maxCyclesWithoutOwner);
    expect(ROUNDS_WITH_OWNER).toBe(authority.repairLimits.maxCyclesWithOwner);
  });

  it('an unattended chain gets one round, an approved one gets two, and that is the ceiling', () => {
    // The owner, 2026-09-13: "Always one round. 2 if I approve."
    expect(ROUNDS_WITHOUT_OWNER).toBe(1);
    expect(ROUNDS_WITH_OWNER).toBe(2);
    expect(ROUNDS_WITH_OWNER).toBeGreaterThan(ROUNDS_WITHOUT_OWNER);
  });
});

describe('the conductor is woken, not timed', () => {
  const skill = read(SKILL);

  it('subscribes to pull-request activity', () => {
    expect(skill).toContain('subscribe_pr_activity');
  });

  it('says in as many words that it does not poll', () => {
    expect(skill).toContain('does not poll and does not run on a timer');
  });

  it('names no scheduling tool as a way to wait for a session', () => {
    // The owner refused this by name: "I don't want Raphael on a timer."
    // A fallback timer is the shape this would come back as, so the tool that
    // would implement one may not appear in the skill at all.
    expect(skill, 'a scheduling tool appears in the conductor skill').not.toContain('send_later');
  });

  it('still refuses to merge', () => {
    expect(skill).toMatch(/never merges|never merge|merges nothing/);
  });
});

describe('the commands the chain is told to run exist', () => {
  it('pnpm chain is registered and its script is present', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    expect(pkg.scripts.chain, 'package.json no longer exposes `pnpm chain`').toBeDefined();
    const target = pkg.scripts.chain?.split(/\s+/).at(-1) ?? '';
    expect(existsSync(resolve(root, target)), `${target} is missing`).toBe(true);
  });

  it('every --emit line in the role files is one the script accepts', () => {
    // A documented command that the script rejects is worse than none: the
    // session runs it, gets exit 2, and improvises a marker by hand.
    const script = resolve(root, 'scripts/virgil-chain.ts');
    const seen: string[] = [];
    for (const file of ROLE_FILES) {
      const body = read(file).replace(/\\\n\s*/g, ' ');
      for (const m of body.matchAll(/pnpm chain -- (--emit [^\n`]+)/g)) {
        const args =
          (m[1] ?? '')
            .split('#')[0] // a trailing shell comment is not an argument
            ?.trim()
            .split(/\s+/)
            // The role files carry placeholders a session substitutes. Replace
            // each with something well-formed of the right shape, so the script's
            // own validation is what is being tested and not the angle brackets.
            .map((a) => {
              if (!a.startsWith('<')) return a;
              if (a.includes('|')) return (a.split('|')[0] ?? a).replace(/[<>]/g, '');
              return /n>$/.test(a) ? '1' : 'abc1234';
            }) ?? [];
        seen.push(args.join(' '));
        const out = execFileSync('npx', ['tsx', script, ...args], {
          cwd: root,
          encoding: 'utf8',
        });
        expect(out.trim(), `${file}: ${args.join(' ')}`).toMatch(/^<!-- virgil:handoff .* -->$/);
      }
    }
    expect(seen.length, 'no --emit command found in the role files at all').toBeGreaterThanOrEqual(
      3,
    );
  }, 60_000);
});

describe('nobody is told to type a marker by hand', () => {
  for (const file of [...ROLE_FILES, SKILL]) {
    it(`${file} carries no copyable handoff marker`, () => {
      // handoff.ts explains why: an unreadable marker is not counted, an
      // uncounted round is a chain that runs once more than it was allowed to,
      // and hand-copying is where unreadable markers come from. The generator
      // round-trips what it prints; a copied template does not.
      expect(read(file), `${file} contains a handoff marker to copy`).not.toContain(
        '<!-- virgil:handoff',
      );
    });
  }
});
