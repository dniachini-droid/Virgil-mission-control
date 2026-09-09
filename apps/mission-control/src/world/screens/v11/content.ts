import type { Role } from '../../room/cast.js';
import type { Outcome, Report, StationState } from '../../room/demo.js';
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
        return {
          word: 'REPORTED',
          lead: 'BUILDER REPORTED COMPLETE. A CLAIM, NOT EVIDENCE.',
          mark: 'reported',
          status: 'cyan',
        };
      case 'PASS':
        return {
          word: 'PASSED',
          lead: 'EVERY REQUIRED CHECK RAN AND PASSED',
          mark: 'passed',
          status: 'green',
        };
      case 'PASS_WITH_NON_BLOCKING_FINDINGS':
        return {
          word: 'PASSED',
          lead: 'WITH NON-BLOCKING FINDINGS, ALL RECORDED',
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

/** The verdict of a loop, as a primary for Virgil's centre slab. */
export function verdictPrimary(verdict: string, outcome: Outcome): Primary {
  switch (verdict) {
    case 'PASS':
      return {
        word: 'PASS',
        lead: 'EVERY GATE PASSES. ELIGIBLE, NOT MERGED.',
        mark: 'passed',
        status: 'green',
      };
    case 'PASS_WITH_NON_BLOCKING_FINDINGS':
      return {
        word: 'PASS WITH FINDINGS',
        lead: 'NON-BLOCKING FINDINGS, ALL RECORDED',
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
      return {
        word: 'IN FLIGHT',
        lead: `NO VERDICT YET. HEADING FOR ${outcome.replace(/_/g, ' ')}.`,
        mark: 'working',
        status: 'cyan',
      };
  }
}
