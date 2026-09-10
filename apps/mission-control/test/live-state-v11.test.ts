import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import authority from '../../../constitution/authority.json' with { type: 'json' };
import { SessionStatusReport } from '../../../packages/agent-contracts/src/live.js';
import {
  type LiveAnswer,
  REPORT_GOES_COLD_MS,
  reportIsCurrent,
  stateFromAnswer,
} from '../src/world/live/liveState.js';

/**
 * **The guards on live state, which are the same guards the recording has and
 * for the same reason.**
 *
 * Phase 2 slice one gives the world a second source of truth. Every truthfulness
 * defect this project has caught was a screen saying more than its data
 * supported, and a source that is quiet most of the time is the strongest
 * invitation yet to fill the quiet in. These tests are the refusal.
 */

const FULL: LiveAnswer = {
  ok: true,
  asOf: '2026-09-10T06:01:59.047Z',
  repo: 'owner/repo',
  branch: 'claude/virgil-mobile-v11',
  head: {
    sha: 'b5660f364c6e36572003f9dc2e4fb5c3a46b0ed3',
    shortSha: 'b5660f3',
    message: 'The function that holds the token',
    committedAt: '2026-09-10T05:41:40Z',
  },
  pull: null,
  checks: null,
  githubReviews: null,
  keeperVerdict: null,
  keeperVerdictReason: 'No Keeper review record is published where this function can read it.',
};

const SOURCE = readFileSync(new URL('../src/world/live/liveState.ts', import.meta.url), 'utf8');
const FUNCTION = readFileSync(
  new URL('../../../netlify/functions/state.mjs', import.meta.url),
  'utf8',
);

describe('the live state carries only what was read', () => {
  it('takes the identifiers from the answer', () => {
    const state = stateFromAnswer(FULL);
    expect(state?.mode).toBe('live');
    expect(state?.content.candidateId).toBe('b5660f3');
    expect(state?.content.branch).toBe('claude/virgil-mobile-v11');
  });

  it('shows no verdict, because no Keeper has reported one', () => {
    const state = stateFromAnswer(FULL);
    expect(state?.content.verdict).toBe('—');
    // And it may never become one of the four by any path through this module.
    for (const verdict of authority.reviewVerdicts) {
      expect(state?.content.verdict).not.toBe(verdict);
    }
  });

  it('names no candidate state, because a commit on a branch is not one', () => {
    expect(stateFromAnswer(FULL)?.content.candidate).toBeNull();
  });

  it('shows nobody working and no owner gate, because it cannot observe either', () => {
    const state = stateFromAnswer(FULL);
    expect(state?.content.active).toBeNull();
    expect(state?.content.ownerGate).toBe(false);
    expect(state?.running).toBe(false);
    for (const member of Object.values(state?.cast ?? {})) {
      expect(member.activity).toBe('rest');
      expect(member.station).toBe('READY');
      expect(member.report).toBe('—');
    }
  });

  it('draws nothing at all when the answer could not be read', () => {
    expect(stateFromAnswer({ ok: false, asOf: FULL.asOf, reason: 'no token' })).toBeNull();
  });

  /**
   * **The one that matters most.** `screens/candidate.ts` supplies a data-shaped
   * identifier when none is set, which is right for the demonstration and a lie
   * in live mode: a real branch name beside an invented SHA looks exactly like a
   * page that read both. The Keeper's KS4-04 was this defect in the replay. So an
   * unread identifier is **absent**, not `undefined` and not a placeholder, and
   * `MobileRoom` draws no world at all until there is an answer.
   */
  it('leaves an unread identifier off entirely rather than shaping one', () => {
    const withoutHead: LiveAnswer = { ok: true, asOf: FULL.asOf, branch: 'main' };
    const state = stateFromAnswer(withoutHead);
    expect(state).not.toBeNull();
    expect('candidateId' in (state?.content ?? {})).toBe(false);
    expect(state?.content.branch).toBe('main');
  });
});

describe('neither side translates GitHub’s vocabulary into the constitution’s', () => {
  /**
   * GitHub returns `APPROVED`, `CHANGES_REQUESTED` and `COMMENTED`. The
   * constitution's four verdicts are returned by a Keeper reviewing a candidate
   * against an approved contract. A human clicking Approve has not done that, and
   * drawing `PASS` because someone did would be the defect this project keeps
   * catching. Neither file may contain a mapping from one to the other.
   */
  it('the function reports the Keeper’s verdict as not reported, with a reason', () => {
    expect(FUNCTION).toContain('keeperVerdict: null');
    expect(FUNCTION).toContain('keeperVerdictReason');
  });

  it('neither file maps a GitHub review state to a verdict', () => {
    for (const source of [SOURCE, FUNCTION]) {
      for (const github of ['APPROVED', 'CHANGES_REQUESTED', 'COMMENTED']) {
        for (const verdict of authority.reviewVerdicts) {
          // A mapping would have to put the two within a line or so of each
          // other; requiring them never to be adjacent is the cheap, blunt form
          // of that and it fails loudly if anyone writes one.
          const near = new RegExp(
            `${github}[^\\n]{0,80}${verdict}|${verdict}[^\\n]{0,80}${github}`,
          );
          expect(near.test(source), `${github} → ${verdict}`).toBe(false);
        }
      }
    }
  });

  it('the page never talks to GitHub itself, because it cannot hold a token', () => {
    expect(SOURCE).not.toContain('api.github.com');
    expect(SOURCE).toContain("fetch('/api/state'");
  });

  it('the function never returns the token, and never logs it', () => {
    expect(FUNCTION).not.toMatch(/console\.(log|info|warn|error)/);
    expect(FUNCTION).not.toMatch(/JSON\.stringify\([^)]*token/);
  });
});

/**
 * **Slice two: the agents appear, and what they say stays a claim.**
 *
 * The room can now show a Fabricator working, and everything that makes it do so
 * was written by a session about itself — which `CLAUDE.md` says is not evidence.
 * These hold the line between the two sources.
 */

const REPORT = {
  schema: 'virgil.session-status.v1',
  reportedAt: '2026-09-10T07:09:46Z',
  aboutCommit: 'eb71672e6d26d905a38eb14d2ee1a195ad88bdbd',
  branch: 'claude/virgil-mobile-v11',
  candidate: null,
  holder: 'fabricator',
  hops: [
    { role: 'fabricator', activity: 'WORKING', reported: null, at: '2026-09-10T07:09:46Z' },
    { role: 'prover', activity: 'READY', reported: null, at: null },
    { role: 'keeper', activity: 'READY', reported: null, at: null },
  ],
  review: null,
  note: 'A session is building.',
};

describe('the sessions’ own report reaches the room', () => {
  // A minute after the report was written, so these are about the mapping rather
  // than about the shelf life, which has its own block below.
  const JUST_AFTER = Date.parse(REPORT.reportedAt) + 60_000;

  it('lights the role the report says holds the work', () => {
    const state = stateFromAnswer({ ...FULL, sessionReport: { ...REPORT } }, JUST_AFTER);
    expect(state?.content.active).toBe('fabricator');
    expect(state?.cast.fabricator.activity).toBe('working');
    expect(state?.cast.prover.activity).toBe('rest');
  });

  it('ignores a report about a different branch', () => {
    const state = stateFromAnswer(
      { ...FULL, sessionReport: { ...REPORT, branch: 'some-other-branch' } },
      JUST_AFTER,
    );
    expect(state?.content.active).toBeNull();
    expect(state?.cast.fabricator.activity).toBe('rest');
  });

  it('still shows no verdict when the report names no review record', () => {
    const state = stateFromAnswer({ ...FULL, sessionReport: { ...REPORT } }, JUST_AFTER);
    expect(state?.content.verdict).toBe('—');
  });

  it('never claims an owner gate, which nothing here can observe', () => {
    const state = stateFromAnswer(
      { ...FULL, sessionReport: { ...REPORT, holder: 'virgil' } },
      JUST_AFTER,
    );
    expect(state?.content.ownerGate).toBe(false);
    // `virgil` means between roles, and is not a role standing at a station.
    expect(state?.content.active).toBeNull();
  });
});

describe('the committed report is the shape the contract says', () => {
  it('.virgil/state.json parses against `virgil.session-status.v1`', () => {
    const raw = JSON.parse(
      readFileSync(new URL('../../../.virgil/state.json', import.meta.url), 'utf8'),
    );
    const parsed = SessionStatusReport.safeParse(raw);
    expect(parsed.success ? null : parsed.error.issues).toBeNull();
  });

  it('the schema will not carry a verdict without the record it came from', () => {
    const withBareVerdict = {
      ...REPORT,
      review: { verdict: 'PASS' },
    };
    expect(SessionStatusReport.safeParse(withBareVerdict).success).toBe(false);
  });

  it('the schema will not carry a report that does not say which commit it is about', () => {
    const { aboutCommit, ...withoutCommit } = REPORT;
    expect(aboutCommit).toBeTruthy();
    expect(SessionStatusReport.safeParse(withoutCommit).success).toBe(false);
  });
});

describe('the function keeps the claim apart from the facts', () => {
  it('returns the report under its own name, never merged into the rest', () => {
    expect(FUNCTION).toContain('sessionReport: session.report');
    expect(FUNCTION).toContain('sessionReportedIn');
    expect(FUNCTION).toContain('sessionReportReason');
  });

  it('refuses a schema version it does not read, rather than guessing', () => {
    expect(FUNCTION).toContain("!== 'virgil.session-status.v1'");
  });
});

/**
 * **A report has a shelf life, and the failure it guards is a session stopping.**
 *
 * Not a session lying. A Fabricator left lit looks exactly like a Fabricator
 * still building, and the screen the owner opens to find out whether anything is
 * happening would answer yes for ever. Past the shelf life the room goes to rest
 * and the badge says when the report was written.
 */
describe('a report that has gone cold is not drawn as now', () => {
  const NOW = Date.parse('2026-09-10T12:00:00Z');
  const at = (msAgo: number) => new Date(NOW - msAgo).toISOString();

  it('is current while it is inside the shelf life', () => {
    expect(reportIsCurrent(at(60_000), NOW)).toBe(true);
    expect(reportIsCurrent(at(REPORT_GOES_COLD_MS - 1000), NOW)).toBe(true);
  });

  it('is not current past it', () => {
    expect(reportIsCurrent(at(REPORT_GOES_COLD_MS + 1000), NOW)).toBe(false);
    expect(reportIsCurrent(at(6 * 60 * 60 * 1000), NOW)).toBe(false);
  });

  it('is not current when it is stamped in the future', () => {
    // A clock that cannot say when a thing happened cannot be trusted to say
    // when it stops being true.
    expect(reportIsCurrent(at(-10 * 60_000), NOW)).toBe(false);
  });

  it('is not current when the stamp is not a time at all', () => {
    expect(reportIsCurrent('not a date', NOW)).toBe(false);
  });

  it('puts the room back at rest rather than leaving an agent lit', () => {
    const cold = {
      ...FULL,
      sessionReport: { ...REPORT, reportedAt: at(REPORT_GOES_COLD_MS + 60_000) },
    };
    const state = stateFromAnswer(cold, NOW);
    expect(state?.content.active).toBeNull();
    expect(state?.cast.fabricator.activity).toBe('rest');
  });

  it('keeps the branch and the commit, which do not go stale', () => {
    const cold = {
      ...FULL,
      sessionReport: { ...REPORT, reportedAt: at(REPORT_GOES_COLD_MS + 60_000) },
    };
    const state = stateFromAnswer(cold, NOW);
    // These come from GitHub, not from the report, and are as true at midnight
    // as at noon.
    expect(state?.content.candidateId).toBe('b5660f3');
    expect(state?.content.branch).toBe('claude/virgil-mobile-v11');
  });
});
