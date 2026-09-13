/**
 * **How many rounds a chain of sessions has spent, counted rather than
 * remembered.**
 *
 * `constitution/REPAIR_LIMITS.md` allows one repair cycle, two with an explicit
 * owner decision, and then *"the candidate stops and the run enters
 * `OWNER_DECISION_REQUIRED`."* On 2026-09-12 a single change took **eleven**
 * review rounds, because the limit is prose and nothing counted.
 *
 * A chain of unattended sessions makes that worse rather than better: each one
 * starts fresh, remembers nothing, and would happily be the twelfth. So the
 * count cannot live in a session's head. It lives on the pull request, where
 * every session can read it and none can forget it, and it is derived here by
 * one function with no I/O.
 *
 * **The marker.** Every automated session ends its pull-request comment with an
 * HTML comment, invisible to a reader and unambiguous to a parser:
 *
 * ```
 * <!-- virgil:handoff role=fixer round=1 sha=abc1234 verdict=BLOCKED next=review -->
 * ```
 *
 * **And every session that pushes posts a facts block in the same comment**,
 * marked the same way:
 *
 * ```
 * <!-- virgil:facts sha=abc1234 -->
 * ```
 *
 * A build session cannot be trusted to frame its own review — not from
 * dishonesty, but because it already believes the change is right, and every
 * softening it introduces reads as reasonable. So the session supplies facts
 * and the repository supplies the questions. `scripts/virgil-chain.ts` derives
 * the facts it can derive (branch, base, head, changed paths, governed paths)
 * from Git rather than asking, and refuses to print a block without the three
 * it cannot derive: what was run, what could not be run and why, and what was
 * deliberately not done.
 *
 * **The rule binds the fix session exactly as hard as the build session, and
 * that is the half everybody forgets.** A fix session works fast, against a
 * list, on code it did not write; it is more likely to introduce something than
 * the original build, not less. A chain whose builder posts facts and whose
 * fixer posts prose hands the second reviewer the first builder's stale head,
 * stale paths, and a "could not run" line describing a different change.
 *
 * And the owner's authorisation, written by the session he says it to, quoting
 * him, so that a later session can check it rather than believe it:
 *
 * ```
 * <!-- virgil:authorisation rounds=2 -->
 * ```
 *
 * **One fix round is allowed without anybody saying so; two if the owner does.**
 * Those are `REPAIR_LIMITS.md`'s own numbers — `maxCyclesWithoutOwner: 1`,
 * `maxCyclesWithOwner: 2` — and the owner set the chain to them on 2026-09-13:
 * *"I want it to go from Raphael—build—review—fix without me having [to] approve
 * it. Always one round. 2 if I approve."*
 *
 * So the authorisation marker raises the cap from one to two and can do nothing
 * else. **It cannot raise it to three.** A marker saying `rounds=99` is read as
 * two, because the ceiling is authority layer 2 and no comment on a pull
 * request amends it. Past the cap the chain stops and the run enters
 * `OWNER_DECISION_REQUIRED`, exactly as the constitution says.
 */

/** `REPAIR_LIMITS.md` `repairLimits.maxCyclesWithoutOwner`. */
export const ROUNDS_WITHOUT_OWNER = 1;
/** `REPAIR_LIMITS.md` `repairLimits.maxCyclesWithOwner`. The ceiling, full stop. */
export const ROUNDS_WITH_OWNER = 2;

/** One session's report, as it appears on the pull request. */
export interface Handoff {
  readonly role: 'builder' | 'reviewer' | 'fixer';
  readonly round: number;
  readonly sha: string;
  readonly verdict: string | null;
  readonly next: string | null;
  /**
   * Whether the same comment carried a facts block for this same SHA. Always
   * false for a reviewer, which pushes nothing and therefore owes none.
   */
  readonly facts: boolean;
}

export interface ChainState {
  /** Fix rounds already spent, counted from the markers. */
  readonly roundsUsed: number;
  /**
   * Fix rounds this chain may spend. `ROUNDS_WITHOUT_OWNER` unless the owner
   * raised it on this pull request, and never above `ROUNDS_WITH_OWNER`.
   */
  readonly roundsAuthorised: number;
  /** Every handoff read, in the order posted. */
  readonly handoffs: readonly Handoff[];
  /**
   * Whether the comments were in the order every rule here assumes: oldest
   * first. False when a round number falls, which cannot happen in a chain that
   * ran forwards. See `readChain`.
   */
  readonly ordered: boolean;
  /**
   * The newest pushed work no reviewer has reported on since, or null when the
   * newest thing on the pull request is a review.
   *
   * `constitution/REVIEW_POLICY.md`, Staleness: a review vouches for the exact
   * version it read and is broken by any later push. So a fixer's commit does
   * not inherit the verdict of the review that prompted it; it owes a review of
   * its own, which is the second review round the owner asked for.
   */
  readonly unreviewed: Handoff | null;
  /**
   * The last verdict any reviewer posted, **or null when work has been pushed
   * since it**. A stale verdict is not a verdict.
   */
  readonly lastVerdict: string | null;
}

const HANDOFF = /<!--\s*virgil:handoff\s+([^>]*?)-->/g;
const AUTHORISATION = /<!--\s*virgil:authorisation\s+rounds=(\d+)\s*-->/g;
const FACTS = /<!--\s*virgil:facts\s+([^>]*?)-->/g;

function fields(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of text.matchAll(/(\w+)=([^\s]+)/g)) {
    const k = m[1];
    const v = m[2];
    if (k !== undefined && v !== undefined) out[k] = v;
  }
  return out;
}

/**
 * Read the chain's state from the pull request's comments, oldest first.
 *
 * **Anything unparseable is ignored rather than guessed at.** A malformed
 * marker is not a round; a round nobody can read is not evidence that a round
 * happened. The failure this protects against is a chain that under-counts and
 * runs one more time, so ambiguity resolves towards fewer rounds spent — which
 * is the *unsafe* direction, and is therefore compensated by
 * `nextStep` refusing whenever the count is not strictly below the
 * authorisation.
 */
export function readChain(comments: readonly string[]): ChainState {
  const handoffs: Handoff[] = [];
  let roundsAuthorised: number = ROUNDS_WITHOUT_OWNER;
  for (const comment of comments) {
    // Facts are scoped to the comment they appear in, not to the pull request.
    // A facts block in an earlier comment does not vouch for a later push: that
    // is precisely the stale-head failure this exists to stop.
    const factShas = new Set<string>();
    FACTS.lastIndex = 0;
    for (const m of comment.matchAll(FACTS)) {
      const sha = fields(m[1] ?? '').sha;
      if (sha) factShas.add(sha);
    }
    AUTHORISATION.lastIndex = 0;
    for (const m of comment.matchAll(AUTHORISATION)) {
      const n = Number(m[1]);
      // The owner may raise his own authorisation and never lower it by a
      // later comment saying less: the highest he has written stands. And the
      // ceiling is the constitution's, not his comment's.
      if (Number.isInteger(n) && n > roundsAuthorised) {
        roundsAuthorised = Math.min(n, ROUNDS_WITH_OWNER);
      }
    }
    HANDOFF.lastIndex = 0;
    for (const m of comment.matchAll(HANDOFF)) {
      const f = fields(m[1] ?? '');
      const role = f.role;
      if (role !== 'builder' && role !== 'reviewer' && role !== 'fixer') continue;
      const round = Number(f.round ?? '0');
      if (!Number.isInteger(round) || round < 0) continue;
      if (!f.sha) continue;
      handoffs.push({
        role,
        round,
        sha: f.sha,
        verdict: f.verdict && f.verdict !== 'n/a' ? f.verdict : null,
        next: f.next ?? null,
        facts: role !== 'reviewer' && factShas.has(f.sha),
      });
    }
  }
  // **A repair round is a push that follows a review, whatever it calls itself.**
  //
  // `KXR-44/PR26`. This counted handoffs whose declared role was `fixer`, and
  // the role is the session's own word: `--facts builder` is a legal command
  // for any session, so a repair session spelling itself `builder` left the
  // count at zero for ever and the chain authorised "round 1 of 1" without
  // bound — on the one night nobody is watching.
  //
  // Position cannot be misdeclared. A pushing handoff before any review is the
  // build; every pushing handoff after one is a repair round.
  // **And the order the count depends on is checked rather than assumed.**
  //
  // `KXR-45/PR26`. `readChain` requires the comments oldest first, nothing said
  // so and nothing checked it. Handed them newest first the chain commissioned
  // a review of already-reviewed work and never stopped doing it — reviews are
  // not repair rounds, so the cap never engaged.
  //
  // **The signal is a review arriving before the push it reviewed.**
  //
  // Round numbers were the obvious choice and are the wrong one: a session that
  // misdeclares its role also writes `round=0`, so they fall legitimately and
  // the check cried wolf over the very chain `KXR-44/PR26` describes. A review
  // of a version that has not been pushed yet cannot happen in a chain that ran
  // forwards, and needs no session to have declared anything truthfully.
  //
  // Ambiguity resolves to the owner rather than to another session.
  const pushedBy = new Map<string, number>();
  handoffs.forEach((h, i) => {
    if (h.role !== 'reviewer' && !pushedBy.has(h.sha)) pushedBy.set(h.sha, i);
  });
  const ordered = !handoffs.some((h, i) => {
    if (h.role !== 'reviewer') return false;
    const pushed = pushedBy.get(h.sha);
    return pushed !== undefined && pushed > i;
  });

  let roundsUsed = 0;
  let reviewSeen = false;
  for (const h of handoffs) {
    if (h.role === 'reviewer') reviewSeen = true;
    else if (reviewSeen) roundsUsed++;
  }

  // Newest first, so the first pushing handoff found with no review after it is
  // the work that is owed one. `findLast` is not available at this target.
  let unreviewed: Handoff | null = null;
  let lastVerdict: string | null = null;
  for (let i = handoffs.length - 1; i >= 0; i--) {
    const h = handoffs[i];
    if (h === undefined) continue;
    if (h.role === 'reviewer') {
      if (h.verdict !== null) lastVerdict = h.verdict;
      break;
    }
    unreviewed = h;
    break;
  }

  return { roundsUsed, roundsAuthorised, handoffs, unreviewed, lastVerdict, ordered };
}

export type Step =
  | { readonly step: 'review'; readonly because: string }
  | { readonly step: 'fix'; readonly round: number; readonly because: string }
  | { readonly step: 'owner'; readonly because: string };

/**
 * **What happens next, decided from the pull request rather than by whoever is
 * asking.**
 *
 * Every path that is not plainly "carry on" ends at the owner. A chain that
 * cannot tell where it is stops; it does not guess and run another session.
 */
export function nextStep(state: ChainState): Step {
  const { lastVerdict, roundsUsed, roundsAuthorised, unreviewed } = state;

  if (!state.ordered) {
    return {
      step: 'owner',
      because:
        'the comments are not in the order this count depends on, so nothing here can be ' +
        'trusted to say which round the chain is in',
    };
  }

  // Pushed work outranks any verdict, because a verdict is about one version
  // and this is a newer one. This is what makes the second review round happen
  // after a fix instead of the chain stopping on the review that prompted it.
  if (unreviewed !== null) {
    if (!unreviewed.facts) {
      return {
        step: 'owner',
        because:
          `the ${unreviewed.role} posted no facts block for ${unreviewed.sha}, so a review ` +
          'would be framed by its own prose rather than by the repository',
      };
    }
    return {
      step: 'review',
      because: `${unreviewed.sha} was pushed and no reviewer has reported on it`,
    };
  }

  if (lastVerdict === null) {
    return { step: 'owner', because: 'nothing has been handed off on this pull request' };
  }

  if (lastVerdict !== 'BLOCKED') {
    return {
      step: 'owner',
      because: `the review returned ${lastVerdict}, and merging is the owner's`,
    };
  }

  if (roundsUsed >= roundsAuthorised) {
    return {
      step: 'owner',
      because:
        roundsAuthorised >= ROUNDS_WITH_OWNER
          ? `${roundsUsed} of ${roundsAuthorised} fix rounds are spent, which is the constitution's ceiling`
          : `${roundsUsed} of ${roundsAuthorised} fix rounds are spent, and only the owner can authorise another`,
    };
  }

  return {
    step: 'fix',
    round: roundsUsed + 1,
    because: `the review is blocking and round ${roundsUsed + 1} of ${roundsAuthorised} is authorised`,
  };
}
