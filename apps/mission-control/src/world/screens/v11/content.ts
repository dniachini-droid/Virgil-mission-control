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
  fabricator: 'WRITING THE CODE, ONLY IN THE FILES IT WAS GIVEN',
  prover: 'RUNNING EVERY CHECK ON THIS EXACT VERSION',
  keeper: 'READING THE CHANGE AND THE EVIDENCE FOR IT',
};

export function primaryFor(role: Role, state: StationState, report: Report): Primary {
  if (state === 'RECEIVING')
    return {
      word: 'INBOUND',
      lead: 'THE WORK IS BEING PASSED TO IT',
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
          lead: 'THE BUILDER SAYS SO. NOTHING IS CHECKED YET.',
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
          lead: 'THE ISSUES FOUND ARE WRITTEN DOWN AND KEPT',
          mark: 'passed',
          status: 'green',
        };
      case 'BLOCKED':
        return {
          word: 'BLOCKED',
          lead: 'A CHECK FAILED. THE CHANGE IS REFUSED.',
          mark: 'blocked',
          status: 'red',
        };
      case 'INSUFFICIENT_EVIDENCE':
        return {
          word: 'INSUFFICIENT EVIDENCE',
          lead: 'A CHECK COULD NOT RUN. THAT IS NOT A FAILURE.',
          mark: 'insufficient',
          status: 'amber',
        };
      default:
        break;
    }
  }
  return {
    word: 'STANDBY',
    lead: 'ON, AND WAITING. NOTHING TO DO YET.',
    mark: 'standby',
    status: 'cyan',
  };
}

/**
 * **Two words the shared evidence lines still carry, said plainly — and said
 * plainly *here*, in a V11-only module, for the preservation contract's sake.**
 *
 * `screens/tally.ts` and `replay/replayTimeline.ts` write the micro-rail's
 * evidence lines, and V10's world imports both. Rewording them at source is
 * the obvious change and it was the first one made: it moved V10's clean-tree
 * Owner Build by **two bytes**, from the 8,528,318 that seven passes and two
 * independent reviews have measured. V11 is additive
 * (`docs/process/V11_BRIEF.md`, *The preservation contract*), and two bytes is
 * as much a breach as ninety-six. `screens/v11/recorded.ts` records the same
 * lesson from stage 4, when it cost 96.
 *
 * So the figures stay exactly as the shared modules produce them and only the
 * **vocabulary** is translated, on V11's own side of the line:
 *
 *  - `TETHERS` is the knowledge graph's word for a claim's link back to the
 *    source it came from. `SOURCE LINKS` is that, in English, and the count is
 *    untouched.
 *  - `DETERMINISTIC` in *"every deterministic check was green"* adds nothing a
 *    reader can use — the sentence is about checks passing — so it goes, and
 *    what remains is the same claim in fewer words.
 *
 * Nothing here changes a number, a name or a result; a substitution that could
 * is the one thing this function may never grow into.
 */
const PLAINER: readonly (readonly [RegExp, string])[] = [
  [/\bTETHERS\b/g, 'SOURCE LINKS'],
  [/\bDETERMINISTIC\s+/g, ''],
];

/** One shared evidence line, in words a reader has met before. */
export function plainly(line: string): string {
  let out = line;
  for (const [pattern, word] of PLAINER) out = out.replace(pattern, word);
  return out;
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
 * **The one sentence that may be said only of `SAFE_TO_MERGE`.**
 *
 * It is the owner's own wording. He read the line this used to carry —
 * *"EVERY GATE PASSES. ELIGIBLE, NOT MERGED."* — and said it was jargon; then
 * he read a plainer draft that spelled out that the change had not gone in and
 * rejected that too: *"Is still stupid. 'And hasn't gone in?' Why? Just say
 * the change is ready to go into the project. And that it's waiting on me for
 * the decision."*
 *
 * So it says the state and what it is waiting on, and nothing else. *Ready to
 * go in* already tells the reader it has not gone in; saying so again reads as
 * a disclaimer rather than a sentence. The distinction between **eligible and
 * merged** is not lost — it is carried by *ready to go into the project* and
 * by *waiting on you*, which is the same distinction in words a person uses.
 */
export const READY_TO_GO_IN = 'READY TO GO INTO THE PROJECT. WAITING ON YOU.';

/**
 * The verdict on Virgil's centre slab. **It takes who is working on the
 * change, not how the loop ends**: see the `default` branch below for why the
 * scripted outcome may not reach this display before the review has reported.
 *
 * **`eligible` is stage 4's third parameter and it exists because of a defect
 * found by looking at a frame.** `READY_TO_GO_IN` is
 * `constitution/STATE_LANGUAGE.md`'s sentence for **`SAFE_TO_MERGE`** said in
 * English, and its predecessor was printed under the word `PASS`
 * unconditionally — so at the passing loop's thirtieth second, where the
 * Prover has returned PASS and the change is `READY_FOR_REVIEW`, the slab told
 * the reader it was ready to go into the project. Nothing had been evaluated
 * for that and the Keeper had not reviewed.
 *
 * That is the same family as the two faults stage 2 found and one the audit
 * missed, because the audit looked for verdict *words* appearing early and
 * this is a **state sentence** appearing early. The word `PASS` was never
 * wrong here — the Prover really had returned it. The line under it was. So
 * the caller now says whether the change is actually in the state that
 * sentence describes, and `test/screen-content-v11.test.ts` holds the sentence
 * to that state.
 */
export function verdictPrimary(verdict: string, active: string | null, eligible = false): Primary {
  switch (verdict) {
    case 'PASS':
      return {
        word: 'PASS',
        lead: eligible
          ? READY_TO_GO_IN
          : // Shortened after looking at the slab: the lead is elided to the
            // width it has, and "VERIFICATION PASSED. REVIEW HAS NOT …" can be
            // read as "review has not passed". This one elides to "THE CHECKS
            // PASSED. NOBODY HAS …", which cannot.
            'THE CHECKS PASSED. NOBODY HAS REVIEWED IT YET.',
        mark: 'passed',
        status: 'green',
      };
    case 'PASS_WITH_NON_BLOCKING_FINDINGS':
      return {
        word: 'PASS WITH NON-BLOCKING FINDINGS',
        lead: eligible ? READY_TO_GO_IN : 'THE ISSUES FOUND ARE WRITTEN DOWN AND KEPT',
        mark: 'passed',
        status: 'green',
      };
    case 'BLOCKED':
      return {
        word: 'BLOCKED',
        lead: 'VIRGIL HAS STOPPED IT. IT GOES NO FURTHER.',
        mark: 'blocked',
        status: 'red',
      };
    case 'INSUFFICIENT EVIDENCE':
    case 'INSUFFICIENT_EVIDENCE':
      return {
        word: 'INSUFFICIENT EVIDENCE',
        lead: 'VIRGIL IS WAITING FOR THE MISSING CHECK.',
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
          ? `NOTHING HAS COME BACK YET. ${active.toUpperCase()} IS WORKING ON IT.`
          : 'NOTHING HAS COME BACK ON THIS CHANGE YET.',
        mark: 'working',
        status: 'cyan',
      };
  }
}
