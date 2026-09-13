import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { nextStep, ROUNDS_WITH_OWNER, ROUNDS_WITHOUT_OWNER, readChain } from '@virgil/gate-engine';
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
    expect(
      seen.length,
      'no --emit command found in the role files; the reviewer has nothing to run',
    ).toBeGreaterThanOrEqual(1);
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

/**
 * **The rule that binds "the builder" is obeyed by the builder and by nobody
 * else.**
 *
 * The facts block exists because a session cannot frame the review of its own
 * change. Almost everyone writes that rule for the build stage and forgets the
 * fix stage — and the fix stage is the more dangerous one: it works fast,
 * against a list, on code it did not write. A chain whose builder posts facts
 * and whose fixer posts prose hands the second reviewer the first builder's
 * stale head and stale paths.
 *
 * So these check the rule binds both, and that something refuses to proceed
 * without it rather than the paragraph being the whole of the mechanism.
 */
describe('the facts block binds every session that pushes', () => {
  const fabricator = read('.claude/agents/fabricator.md');

  it('names the fixer as well as the builder', () => {
    expect(fabricator).toContain('--facts builder');
    expect(fabricator, 'the repair stage is not bound to post its own facts').toContain(
      '--facts fixer',
    );
  });

  it('says a new comment, never an edit of the previous one', () => {
    expect(fabricator).toMatch(/[Nn]ever edit the previous one/);
  });

  it('requires the three fields the repository cannot derive', () => {
    for (const field of ['--ran', '--could-not-run', '--not-done']) {
      expect(fabricator, `${field} is no longer required of a pushing session`).toContain(field);
    }
  });

  it('every --facts line in the fabricator names a pushing role and all three fields', () => {
    // These cannot be executed the way an --emit line can: they need a real
    // file of real output and a real branch. So the shape is checked here and
    // the behaviour is checked by the script's own refusals above.
    const lines = [...fabricator.matchAll(/pnpm chain -- --facts (\w+)([^\n`]*)/g)];
    expect(
      lines.length,
      'the fabricator documents no --facts command at all',
    ).toBeGreaterThanOrEqual(2);
    for (const [, role, rest] of lines) {
      expect(['builder', 'fixer'], `--facts ${role} is not a pushing role`).toContain(role);
      for (const field of ['--ran', '--could-not-run', '--not-done']) {
        expect(rest, `--facts ${role} omits ${field}`).toContain(field);
      }
    }
  });

  it('the reviewer is not asked for facts, because it pushes nothing', () => {
    const out = spawnSync(
      'npx',
      ['tsx', resolve(root, 'scripts/virgil-chain.ts'), '--facts', 'reviewer'],
      {
        cwd: root,
        encoding: 'utf8',
      },
    );
    expect(out.status, 'the script accepted a facts block from a reviewer').not.toBe(0);
  });

  it('a pushing handoff with no facts stops the chain instead of commissioning a review', () => {
    // The mechanism, not the paragraph. This is what refuses to proceed.
    const bare = '<!-- virgil:handoff role=fixer round=1 sha=bbb2222 verdict=n/a next=review -->';
    const step = nextStep(readChain([bare]));
    expect(step.step).toBe('owner');
    expect(step.because).toContain('no facts block');
  });

  it('facts in an earlier comment do not vouch for a later push', () => {
    const withFacts = readChain([
      '<!-- virgil:facts sha=aaa1111 -->\n<!-- virgil:handoff role=builder round=0 sha=aaa1111 verdict=n/a next=review -->',
      '<!-- virgil:handoff role=fixer round=1 sha=bbb2222 verdict=n/a next=review -->',
    ]);
    expect(withFacts.unreviewed?.sha).toBe('bbb2222');
    expect(withFacts.unreviewed?.facts, 'a stale facts block was accepted').toBe(false);
  });
});

describe('the reviewer answers the repository, not the builder', () => {
  const keeper = read('.claude/agents/keeper.md');

  it('says the pull-request description is not the contract', () => {
    expect(keeper.replace(/\s+/g, ' ')).toContain('is not the contract');
  });

  it('tells the reviewer to run things rather than read claims', () => {
    for (const cmd of ['npx biome check .', 'npx turbo run test --force']) {
      expect(keeper, `the reviewer is no longer told to run ${cmd}`).toContain(cmd);
    }
  });

  it('keeps the volume rule that ended the eleven-round day', () => {
    expect(keeper).toContain('PASS_WITH_NON_BLOCKING_FINDINGS');
    expect(keeper.replace(/\s+/g, ' ')).toMatch(/not `?SAFE_TO_MERGE/);
  });
});

/**
 * **The contract is the facts block's checklist, and a checklist nobody checks
 * is the thing this whole section exists to stop.**
 *
 * `candidate-artifact` sat unused for eight days across 345 commits, and the
 * coverage table in `docs/architecture/CONTRACTS.md` reported it delivered the
 * whole time. Comparing it field by field against what a pushing session
 * actually posts found two real gaps — which findings a repair addressed, and
 * whether the commit had been pushed at all — and one box the contract itself
 * was missing.
 *
 * These fail if that comparison is quietly dropped.
 */
describe('the facts block answers the contract that specifies it', () => {
  it('the contract has the box a review actually needs', () => {
    const schema = JSON.parse(read('schemas/candidate-artifact.schema.json')) as {
      properties: Record<string, unknown>;
    };
    // checksSkipped says what could not be run. notDone says what was not
    // attempted. A stage reporting neither has described only what went well.
    expect(schema.properties.checksSkipped, 'the contract lost checksSkipped').toBeDefined();
    expect(schema.properties.notDone, 'the contract lost notDone').toBeDefined();
    expect(schema.properties.findingIds, 'the contract lost findingIds').toBeDefined();
    expect(schema.properties.pushed, 'the contract lost pushed').toBeDefined();
  });

  it('a fixer must name the findings it repaired', () => {
    const out = spawnSync(
      'npx',
      [
        'tsx',
        resolve(root, 'scripts/virgil-chain.ts'),
        '--facts',
        'fixer',
        '--round',
        '1',
        '--ran',
        resolve(root, 'package.json'),
        '--could-not-run',
        'nothing',
        '--not-done',
        'nothing',
      ],
      { cwd: root, encoding: 'utf8' },
    );
    expect(out.status, 'a repair with no named findings was accepted').not.toBe(0);
    expect(out.stderr).toContain('--findings');
  });

  it('the mapping is written down rather than left to be rediscovered', () => {
    const contracts = read('docs/architecture/CONTRACTS.md');
    expect(contracts, 'the box-by-box mapping is gone').toContain('box by box');
    // The honest counts are the part most likely to be tidied away, because
    // they are the part that makes the coverage table above look worse.
    expect(contracts).toMatch(/`candidate-artifact`\s*\|\s*0\s*\|/);
  });
});
