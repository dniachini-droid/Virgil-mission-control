import type { Role } from '../../room/cast.js';
import type { Report, StationState } from '../../room/demo.js';
import type { MarkKind } from './marks.js';
import { ACCENT, STATUS, type StatusKey } from './system.js';

/**
 * **What a state means, in one table.**
 *
 * The brief requires that every display carry *"a clearly readable primary
 * state or conclusion"* and that status colour be used sparingly, with one
 * fixed meaning each. This is the whole of that mapping: a station's state
 * and report become one hero term, one plain-language conclusion, one mark
 * and one status colour, and nothing else in the system may choose a
 * status colour by itself.
 *
 * **Two epistemic rules are enforced here rather than remembered.**
 *
 *  1. **The Fabricator's `COMPLETE` is never green.** It is
 *     `BUILDER_REPORTED_COMPLETE` — a claim, not evidence
 *     (`.claude/agents/fabricator.md`, and `CLAUDE.md`: *"A builder's
 *     success report is not evidence"*). It is drawn in cyan, the
 *     informational colour, with an outward chevron: something has left,
 *     nothing has been proved.
 *  2. **`INSUFFICIENT_EVIDENCE` is not a failure and is never red.** A
 *     required check could not run, so the Prover cannot tell; it is amber,
 *     the waiting colour, and its mark is a ring with a piece genuinely
 *     missing.
 *
 * `test/screen-system-v11.test.ts` holds both.
 */

export interface Primary {
  /** The hero term, in the project's own words. Up to two lines. */
  word: string;
  /** What it means, in a sentence the owner can read. */
  lead: string;
  mark: MarkKind;
  status: StatusKey;
}

const VERB: Record<Role, string> = {
  fabricator: 'BUILDING',
  prover: 'VERIFYING',
  keeper: 'REVIEWING',
};

const DOING: Record<Role, string> = {
  fabricator: 'IMPLEMENTING THE PLAN, INSIDE THE PERMITTED PATHS',
  prover: 'RUNNING THE REQUIRED CHECKS ON THE CANDIDATE SHA',
  keeper: 'READING THE CANDIDATE AND ITS EVIDENCE',
};

export function primaryFor(role: Role, state: StationState, report: Report): Primary {
  if (state === 'RECEIVING')
    return {
      word: 'INBOUND',
      lead: 'A HAND-OFF IS ARRIVING, WITH ITS AUTHORITY GRANT',
      mark: 'receiving',
      status: 'cyan',
    };
  if (state === 'WORKING')
    return { word: VERB[role], lead: DOING[role], mark: 'working', status: 'cyan' };
  if (state === 'REPORTED') {
    switch (report) {
      case 'COMPLETE':
        // Not a verdict at all, and deliberately not worded like one: the
        // candidate's state here is `BUILDER_REPORTED_COMPLETE`, which
        // `authority.json` lists among the candidate states and not among
        // the verdicts.
        return {
          word: 'REPORTED COMPLETE',
          lead: 'A CLAIM BY THE BUILDER, NOT EVIDENCE',
          mark: 'reported',
          status: 'cyan',
        };
      // **The exact verdict, never a tense variant and never a shorter one
      // of the four.** These read `PASSED` until the audit that removed
      // `IN FLIGHT` from the verdict slab: `PASSED` is not one of
      // `constitution/authority.json`'s four `reviewVerdicts`, and using
      // `PASS` for a candidate whose verdict is
      // `PASS_WITH_NON_BLOCKING_FINDINGS` names a different one of them.
      case 'PASS':
        return {
          word: 'PASS',
          lead: 'EVERY REQUIRED CHECK RAN AND PASSED',
          mark: 'passed',
          status: 'green',
        };
      case 'PASS_WITH_NON_BLOCKING_FINDINGS':
        return {
          word: 'PASS WITH NON-BLOCKING FINDINGS',
          lead: 'EVERY FINDING RECORDED AND CARRIED FORWARD',
          mark: 'passed',
          status: 'green',
        };
      case 'BLOCKED':
        return {
          word: 'BLOCKED',
          lead: 'A REQUIRED CHECK FAILED. THE CANDIDATE IS REFUSED.',
          mark: 'blocked',
          status: 'red',
        };
      case 'INSUFFICIENT_EVIDENCE':
        return {
          word: 'INSUFFICIENT EVIDENCE',
          lead: 'A REQUIRED CHECK COULD NOT RUN. NOT A FAILURE.',
          mark: 'insufficient',
          status: 'amber',
        };
      default:
        break;
    }
  }
  return {
    word: 'STANDBY',
    lead: 'POWERED AND IDLE. NO HAND-OFF IS IN FLIGHT.',
    mark: 'standby',
    status: 'cyan',
  };
}

/** The colour a status key resolves to. The only route from state to colour. */
export function colourOf(status: StatusKey): string {
  return STATUS[status];
}

/** An agent's own accent, which the chrome uses for its edge and its well. */
export function accentOf(who: string): { key: string; second: string } {
  return ACCENT[who] ?? { key: STATUS.cyan, second: STATUS.cyan };
}

/**
 * The verdict on Virgil's centre slab. **It takes who holds the hop, not
 * how the loop ends**: see the `default` branch below for why the scripted
 * outcome may not reach this display before the review has reported.
 *
 * **`eligible` is stage 4's third parameter and it exists because of a defect
 * found by looking at a frame.** `EVERY GATE PASSES. ELIGIBLE, NOT MERGED.` is
 * `constitution/STATE_LANGUAGE.md`'s sentence for **`SAFE_TO_MERGE`**, and it
 * was printed under the word `PASS` unconditionally — so at the passing loop's
 * thirtieth second, where the Prover has returned PASS and the candidate is
 * `READY_FOR_REVIEW`, the slab told the reader the candidate was eligible to
 * merge. No merge gate had been evaluated and the Keeper had not reviewed.
 *
 * That is the same family as the two faults stage 2 found and one the audit
 * missed, because the audit looked for verdict *words* appearing early and
 * this is a **state sentence** appearing early. The word `PASS` was never
 * wrong here — the Prover really had returned it. The line under it was. So
 * the caller now says whether the candidate is actually in the state that
 * sentence describes, and `test/screen-content-v11.test.ts` holds the sentence
 * to that state.
 */
export function verdictPrimary(verdict: string, active: string | null, eligible = false): Primary {
  switch (verdict) {
    case 'PASS':
      return {
        word: 'PASS',
        lead: eligible
          ? 'EVERY GATE PASSES. ELIGIBLE, NOT MERGED.'
          : // Shortened after looking at the slab: the lead is elided to the
            // width it has, and "VERIFICATION PASSED. REVIEW HAS NOT …" can be
            // read as "review has not passed". This one elides to
            // "VERIFICATION PASSED. NOT YET …", which cannot.
            'VERIFICATION PASSED. NOT YET REVIEWED.',
        mark: 'passed',
        status: 'green',
      };
    case 'PASS_WITH_NON_BLOCKING_FINDINGS':
      return {
        word: 'PASS WITH NON-BLOCKING FINDINGS',
        lead: eligible
          ? 'EVERY GATE PASSES. ELIGIBLE, NOT MERGED.'
          : 'EVERY FINDING RECORDED AND CARRIED FORWARD',
        mark: 'passed',
        status: 'green',
      };
    case 'BLOCKED':
      return {
        word: 'BLOCKED',
        lead: 'VIRGIL REFUSES. IT DOES NOT PROCEED.',
        mark: 'blocked',
        status: 'red',
      };
    case 'INSUFFICIENT EVIDENCE':
    case 'INSUFFICIENT_EVIDENCE':
      return {
        word: 'INSUFFICIENT EVIDENCE',
        lead: 'VIRGIL WAITS FOR THE MISSING PROOF.',
        mark: 'insufficient',
        status: 'amber',
      };
    default:
      /**
       * **No verdict has returned, and the display says only that.**
       *
       * Two faults were found here and both are recorded because they are
       * the kind that come back.
       *
       * The first: this branch read `IN FLIGHT`, which is **not one of the
       * four verdicts** in `constitution/authority.json`'s
       * `reviewVerdicts`. Under a heading that reads `VERDICT`, a large
       * word that is not a verdict presents a non-verdict as one, and the
       * big word is what reads from across the room while the small line
       * under it does not. V8's own coherence audit removed invented phase
       * words from the candidate slab for exactly this reason.
       * `NO VERDICT` is truthful and is already part of the vocabulary.
       *
       * The second, and the serious one: the lead read
       * `HEADING FOR ${'$'}{outcome}`. The scripted demonstration knows how
       * its loop ends before the review reports, and that line **leaked
       * the verdict in prose** — `HEADING FOR BLOCKED` while the Prover
       * was still working. Nothing in this architecture can know a verdict
       * before a review returns one, so a display that implies it teaches
       * the owner something untrue about his own system; it is the same
       * family as the V7 defect the owner caught, when a slab read
       * "awaiting review" during a build. V10's test for *no verdict
       * before its review reported* looked only at the rendered verdict
       * word and could not see prose.
       *
       * The `outcome` parameter is therefore **deliberately unused** in
       * this branch, and `test/screen-content-v11.test.ts` asserts over
       * the whole of every screen's text, at every beat of every loop,
       * that the outcome's own word never appears before that outcome's
       * review has reported.
       */
      return {
        word: 'NO VERDICT',
        lead: active
          ? `NO VERDICT HAS RETURNED. ${active.toUpperCase()} HOLDS THE HOP.`
          : 'NO VERDICT HAS RETURNED FOR THIS CANDIDATE.',
        mark: 'working',
        status: 'cyan',
      };
  }
}
