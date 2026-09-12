import { z } from 'zod';
import {
  CandidateState,
  RepoPath,
  ReviewVerdict,
  RoleId,
  Sha,
  ShortSha,
  Timestamp,
} from './common.js';

/**
 * **What a session says it is doing, written where the owner can read it.**
 *
 * Phase 2 slice two (`docs/process/PHASE_2_SLICE_2_BRIEF.md`). GitHub knows about
 * commits, checks and pull requests; it knows nothing about a Fabricator holding
 * a work order or a Keeper part-way through a review. That gap cannot be
 * inferred — a passing check is not a verdict and an approval is not a review —
 * so it is **reported**, into `.virgil/state.json`, by the sessions doing the
 * work.
 *
 * **Everything in this schema is a claim, and the schema says so rather than
 * leaving the surfaces to remember.** `CLAUDE.md`: *"A builder's success report
 * is not evidence. Deterministic checks and independent review are."* A file a
 * session writes about itself is precisely the thing that sentence is about. It
 * is admitted here for one reason: it is **traceable**. It is committed, it is
 * attributable to a commit, and the owner can open it himself — which is a
 * weaker property than verification and is not recorded as a stronger one.
 *
 * Two consequences are built into the shape rather than left to good behaviour:
 *
 *  - **`aboutCommit` is required.** A report is about one commit. When the branch
 *    head has moved past it, the report is stale and the surfaces must draw it as
 *    a report about an older commit rather than apply it to the new one. A field
 *    that could be omitted would be omitted on the day it mattered.
 *  - **A verdict may not appear here alone.** `review` carries the verdict *and*
 *    the record it came from *and* the commit that record was read at. A session
 *    claiming `PASS` with no record to point at is a claim this schema will not
 *    represent.
 */

// The four verdicts and the fifteen candidate states are `common.ts`'s, not this
// file's. Declaring them again here would be a second copy of the constitution's
// vocabulary, free to drift from the first, which is the one thing this schema
// exists to prevent elsewhere.

/** What a station is doing, in the words the world already draws. */
export const StationActivity = z.enum(['READY', 'RECEIVING', 'WORKING', 'REPORTED']);

/**
 * **The three roles that have a station, which is narrower than `RoleId`.**
 *
 * A hop is a station's state, and the room has three stations. `RoleId` is the
 * constitution's whole cast — Virgil, the Architect, the Arbiter and the
 * conditional specialists among them — and a hop naming one of those describes a
 * station there is nothing to draw.
 *
 * Narrowed after a drift test caught it on its first run: the wire check in
 * `netlify/functions/state.mjs` accepted only these three while this accepted
 * any role, and the two are now held against each other by
 * `apps/mission-control/test/live-state-v11.test.ts`. Who *holds* the work is a
 * separate field and still admits `virgil`, because between roles is a real
 * place for it to be.
 */
export const StationRole = z.enum(['fabricator', 'prover', 'keeper']);

export const SessionHop = z
  .object({
    role: StationRole,
    activity: StationActivity,
    /**
     * What this role has reported, if anything. `COMPLETE` is the Fabricator's
     * claim of having finished and is **not** a verdict; the four verdicts are
     * the Keeper's. Null means nothing has been reported, which is not the same
     * as nothing having happened.
     */
    reported: z.union([z.literal('COMPLETE'), ReviewVerdict]).nullable(),
    at: Timestamp.nullable(),
  })
  .strict();

export const SessionReview = z
  .object({
    verdict: ReviewVerdict,
    /** The committed record the verdict was read from. Required: see the header. */
    recordPath: RepoPath,
    /** The commit that record was read at, so the claim can be checked. */
    recordCommit: Sha,
    /** How many findings the record carries, and how many of them block. */
    findings: z.number().int().min(0),
    blocking: z.number().int().min(0),
  })
  .strict();

export const SessionStatusReport = z
  .object({
    /**
     * The schema this file claims to be. Present so that a reader which does not
     * recognise the version refuses the file rather than guessing at it.
     */
    schema: z.literal('virgil.session-status.v1'),
    reportedAt: Timestamp,
    /** The commit this report is about. See the header: never optional. */
    aboutCommit: Sha,
    branch: z.string().min(1),
    candidate: z
      .object({ sha: Sha, shortSha: ShortSha, state: CandidateState.nullable() })
      .strict()
      .nullable(),
    /**
     * Who holds the work now. `virgil` means it is between roles and Virgil is
     * holding it; null means nothing is in flight, which the world draws as a
     * room at rest and which is a real answer.
     */
    holder: z.union([RoleId, z.literal('virgil')]).nullable(),
    hops: z.array(SessionHop).max(16),
    review: SessionReview.nullable(),
    /** One sentence a person wrote, for the surfaces that show a line of prose. */
    note: z.string().max(300).nullable(),
  })
  .strict()
  .describe(
    'A session’s own report of what it is doing, written to .virgil/state.json. A claim, not evidence.',
  );

export type SessionStatusReport = z.infer<typeof SessionStatusReport>;

/**
 * **What the owner and Virgil have said to each other — Phase 2, slice six.**
 *
 * The owner's instruction of 2026-09-11: *"I want to use the UI to basically
 * have this chat with Virgil and get useful stuff on it."*
 *
 * The transport for that already existed and had never been opened: the app can
 * post to `/api/instruct`, and a workflow runs a real session with the message.
 * What was missing was the reply coming back. This is the shape it comes back
 * in, and the reason it is a **file in the repository** rather than a value the
 * page holds: a reply that lives only on screen is gone on reload, cannot be
 * checked against what the session actually did, and is exactly the kind of
 * unverifiable claim this whole project exists not to make. In the repository it
 * is committed, timestamped, and attached to the run that produced it.
 *
 * **One file, not one per message.** The page reads this through `/api/state`,
 * which reads it from GitHub, and a directory of files would be a GitHub call
 * per exchange on every poll. The cost of the endpoint is a thing this project
 * has already been bitten by.
 */
/**
 * **A link a person is invited to press, and therefore not merely a URL.**
 *
 * `z.string().url()` stood here, and it accepts `javascript:alert(1)`,
 * `mailto:` and `ftp:` — anything with a scheme. The value reaches the window
 * as an `href` on the owner's phone, written into the repository by a workflow
 * run, so "it parses as a URL" is not the property that matters. Two are: a
 * scheme a browser navigates to, and a length the wire will also accept.
 *
 * Written as an explicit predicate rather than a library option because the
 * Netlify function holds a hand-written twin of this and cannot import Zod. The
 * two are the same three lines, and the generated battery is what keeps them
 * that way.
 */
const WebUrl = z
  .string()
  .min(1)
  .max(400)
  .refine(
    (value) => {
      let parsed;
      try {
        parsed = new URL(value);
      } catch {
        return false;
      }
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    },
    { message: 'must be an http or https URL of at most 400 characters' },
  );

export const ConversationState = z.enum(['asked', 'answered', 'failed']);

export const ConversationExchange = z
  .object({
    /** The workflow run that carries this exchange. Unique, and checkable. */
    id: z.string().min(1).max(64),
    askedAt: Timestamp,
    /** Exactly what the owner typed, never a summary of it. */
    question: z.string().min(1).max(4000),
    /**
     * `asked` — a session is working and has not answered yet. `answered` — it
     * finished and said this. `failed` — the run ended without an answer, and
     * `reason` says what is known about why.
     *
     * There is deliberately no `sending` state: that is the page's own business
     * before the run exists, and a state the repository cannot witness has no
     * place in a file the repository holds.
     */
    state: ConversationState,
    answeredAt: Timestamp.nullable(),
    /**
     * What the session said. Null until it has said it — and never the empty
     * string, which is a different claim: null is "no answer yet" and `''`
     * would be "it answered, with nothing", drawn as a reply bubble containing
     * silence. `.max()` does not imply a minimum, so the empty string was legal
     * here while the wire refused it. That drift is the one the writing step
     * found the moment it had to decide what to do with an agent that printed
     * nothing.
     */
    answer: z.string().min(1).max(20_000).nullable(),
    /** Why there is no answer, when there is none. Null when there is one. */
    reason: z.string().min(1).max(600).nullable(),
    /** The run on GitHub, so any answer can be checked against what ran. */
    runUrl: WebUrl.nullable(),
  })
  .strict()
  .refine((entry) => (entry.state === 'answered') === (entry.answer !== null), {
    message: 'an exchange is answered exactly when it carries an answer',
  })
  .refine((entry) => (entry.state === 'failed') === (entry.reason !== null), {
    message: 'an exchange is failed exactly when it carries a reason',
  });

export const Conversation = z
  .object({
    schema: z.literal('virgil.conversation.v1'),
    updatedAt: Timestamp,
    /**
     * Newest last, so a reader appends and a screen scrolls to the bottom.
     * Capped: older exchanges roll off this file and stay in git history, which
     * is where the permanent record has always been.
     */
    exchanges: z.array(ConversationExchange).max(50),
  })
  .strict()
  .describe(
    'What the owner asked Virgil and what Virgil answered, written to .virgil/conversation.json by the session that answered.',
  );

export type ConversationExchange = z.infer<typeof ConversationExchange>;
export type Conversation = z.infer<typeof Conversation>;
