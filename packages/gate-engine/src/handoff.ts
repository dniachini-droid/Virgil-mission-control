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
 * And the owner's authorisation, written by the session he says it to, quoting
 * him, so that a later session can check it rather than believe it:
 *
 * ```
 * <!-- virgil:authorisation rounds=2 -->
 * ```
 *
 * **No authorisation means no fix round.** Not one — zero. A chain that has not
 * been given rounds by the owner reviews once and stops. That is deliberately
 * stricter than `REPAIR_LIMITS.md`'s "one without owner", because the limit
 * there governs a session a human is watching and this governs a machine
 * starting machines while he sleeps.
 */

/** One session's report, as it appears on the pull request. */
export interface Handoff {
  readonly role: 'builder' | 'reviewer' | 'fixer';
  readonly round: number;
  readonly sha: string;
  readonly verdict: string | null;
  readonly next: string | null;
}

export interface ChainState {
  /** Fix rounds already spent, counted from the markers. */
  readonly roundsUsed: number;
  /** Fix rounds the owner authorised. Zero unless he said so on this pull request. */
  readonly roundsAuthorised: number;
  /** Every handoff read, in the order posted. */
  readonly handoffs: readonly Handoff[];
  /** The last verdict any reviewer posted, or null if none has. */
  readonly lastVerdict: string | null;
}

const HANDOFF = /<!--\s*virgil:handoff\s+([^>]*?)-->/g;
const AUTHORISATION = /<!--\s*virgil:authorisation\s+rounds=(\d+)\s*-->/g;

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
  let roundsAuthorised = 0;
  for (const comment of comments) {
    AUTHORISATION.lastIndex = 0;
    for (const m of comment.matchAll(AUTHORISATION)) {
      const n = Number(m[1]);
      // The owner may raise his own authorisation and never lower it by a
      // later comment saying less: the highest he has written stands.
      if (Number.isInteger(n) && n > roundsAuthorised) roundsAuthorised = n;
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
      });
    }
  }
  const roundsUsed = handoffs.filter((h) => h.role === 'fixer').length;
  const verdicts = handoffs.filter((h) => h.role === 'reviewer' && h.verdict !== null);
  return {
    roundsUsed,
    roundsAuthorised,
    handoffs,
    lastVerdict: verdicts.at(-1)?.verdict ?? null,
  };
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
  const { lastVerdict, roundsUsed, roundsAuthorised } = state;

  if (lastVerdict === null) {
    return state.handoffs.some((h) => h.role === 'builder' || h.role === 'fixer')
      ? { step: 'review', because: 'work was handed off and no reviewer has reported on it' }
      : { step: 'owner', because: 'nothing has been handed off on this pull request' };
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
        roundsAuthorised === 0
          ? 'the review is blocking and the owner has authorised no fix rounds on this pull request'
          : `${roundsUsed} of ${roundsAuthorised} authorised fix rounds are spent`,
    };
  }

  return {
    step: 'fix',
    round: roundsUsed + 1,
    because: `the review is blocking and round ${roundsUsed + 1} of ${roundsAuthorised} is authorised`,
  };
}
