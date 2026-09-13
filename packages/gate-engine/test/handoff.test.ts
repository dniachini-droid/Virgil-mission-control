import { describe, expect, it } from 'vitest';
import {
  type ChainState,
  nextStep,
  ROUNDS_WITH_OWNER,
  ROUNDS_WITHOUT_OWNER,
  readChain,
} from '../src/handoff.js';

/**
 * **The cap has to hold against a machine, not a reader.**
 *
 * These cases are the ones that matter at three in the morning, when a chain of
 * sessions is starting sessions and nobody is awake to notice it going round
 * again. Every ambiguous case must land on `owner`.
 */

const handoff = (role: string, round: number, sha = 'abc1234', extra = '') =>
  `done\n\n<!-- virgil:handoff role=${role} round=${round} sha=${sha} ${extra} -->`;
const review = (verdict: string, round = 0) =>
  handoff('reviewer', round, 'abc1234', `verdict=${verdict} next=owner`);

describe('reading the chain from the pull request', () => {
  it('counts fix rounds and nothing else as a round', () => {
    const s = readChain([handoff('builder', 0), review('BLOCKED'), handoff('fixer', 1)]);
    expect(s.roundsUsed).toBe(1);
    expect(s.handoffs).toHaveLength(3);
  });

  it('allows one fix round with nobody saying so, and two when the owner does', () => {
    // The owner, 2026-09-13: "Always one round. 2 if I approve." Which is also
    // REPAIR_LIMITS.md's maxCyclesWithoutOwner and maxCyclesWithOwner.
    expect(readChain([handoff('builder', 0)]).roundsAuthorised).toBe(ROUNDS_WITHOUT_OWNER);
    expect(readChain(['<!-- virgil:authorisation rounds=2 -->']).roundsAuthorised).toBe(
      ROUNDS_WITH_OWNER,
    );
  });

  it('refuses to be authorised past the constitution, however large the number', () => {
    // A comment on a pull request does not amend authority layer 2. Anyone who
    // can comment can write rounds=99; nobody who can comment can grant a third
    // round.
    for (const n of [3, 5, 99, 1000]) {
      expect(readChain([`<!-- virgil:authorisation rounds=${n} -->`]).roundsAuthorised).toBe(
        ROUNDS_WITH_OWNER,
      );
    }
  });

  it('takes the highest authorisation the owner wrote, never a later smaller one', () => {
    // He may raise it mid-run. A later comment saying less must not silently
    // cancel rounds he already granted — and cannot grant more than he said.
    const s = readChain([
      '<!-- virgil:authorisation rounds=2 -->',
      '<!-- virgil:authorisation rounds=1 -->',
    ]);
    expect(s.roundsAuthorised).toBe(2);
  });

  it('ignores a malformed marker rather than guessing what it meant', () => {
    const s = readChain([
      '<!-- virgil:handoff role=wizard round=1 sha=abc -->',
      '<!-- virgil:handoff role=fixer sha=abc -->',
      '<!-- virgil:handoff role=fixer round=1 -->',
    ]);
    expect(s.handoffs).toHaveLength(1); // only the one with a real role, round and sha
  });

  it('reports the last verdict, not the first', () => {
    expect(readChain([review('BLOCKED'), review('PASS')]).lastVerdict).toBe('PASS');
  });
});

describe('what happens next', () => {
  const state = (o: Partial<ChainState>): ChainState => ({
    roundsUsed: 0,
    roundsAuthorised: ROUNDS_WITHOUT_OWNER,
    handoffs: [],
    lastVerdict: null,
    ...o,
  });

  it('gives a blocked review its one unauthorised fix round, and then stops', () => {
    // The owner asked for build, review, fix without him approving anything.
    // The round after that is his, because REPAIR_LIMITS.md says so.
    const base = { lastVerdict: 'BLOCKED', handoffs: readChain([handoff('builder', 0)]).handoffs };
    expect(nextStep(state(base))).toMatchObject({ step: 'fix', round: 1 });

    const spent = nextStep(state({ ...base, roundsUsed: ROUNDS_WITHOUT_OWNER }));
    expect(spent.step).toBe('owner');
    expect(spent.because).toContain('only the owner can authorise another');
  });

  it('names the ceiling rather than the owner once both rounds are gone', () => {
    // Two different dead ends, and the owner is told which one he is at: one he
    // can lift by approving a round, one he cannot lift at all without changing
    // the constitution.
    const s = nextStep(
      state({ lastVerdict: 'BLOCKED', roundsAuthorised: ROUNDS_WITH_OWNER, roundsUsed: 2 }),
    );
    expect(s.step).toBe('owner');
    expect(s.because).toContain("constitution's ceiling");
  });

  it('authorises exactly the rounds the owner gave and not one more', () => {
    const authorised2 = { lastVerdict: 'BLOCKED', roundsAuthorised: 2 };
    expect(nextStep(state({ ...authorised2, roundsUsed: 0 })).step).toBe('fix');
    expect(nextStep(state({ ...authorised2, roundsUsed: 1 })).step).toBe('fix');
    // The third is the one that must not happen.
    expect(nextStep(state({ ...authorised2, roundsUsed: 2 })).step).toBe('owner');
    expect(nextStep(state({ ...authorised2, roundsUsed: 3 })).step).toBe('owner');
  });

  it('numbers the round it is authorising', () => {
    const s = nextStep(state({ lastVerdict: 'BLOCKED', roundsAuthorised: 2, roundsUsed: 1 }));
    expect(s).toMatchObject({ step: 'fix', round: 2 });
  });

  it('stops at the owner on any verdict that is not blocking', () => {
    for (const v of ['PASS', 'PASS_WITH_NON_BLOCKING_FINDINGS', 'INSUFFICIENT_EVIDENCE']) {
      const s = nextStep(state({ lastVerdict: v, roundsAuthorised: 2 }));
      expect(s.step, `${v} must not start a fix round`).toBe('owner');
      expect(s.because).toContain("merging is the owner's");
    }
  });

  it('commissions a review when work was handed off and none has reported', () => {
    const s = nextStep(state({ handoffs: readChain([handoff('builder', 0)]).handoffs }));
    expect(s.step).toBe('review');
  });

  it('stops at the owner when the pull request says nothing at all', () => {
    // A chain that cannot tell where it is must not guess and run a session.
    expect(nextStep(state({})).step).toBe('owner');
  });

  it('an empty pull request cannot be talked into a fix round', () => {
    expect(nextStep(state({ roundsAuthorised: 99 })).step).toBe('owner');
  });
});
