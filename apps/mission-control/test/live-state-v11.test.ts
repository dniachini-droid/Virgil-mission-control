import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import authority from '../../../constitution/authority.json' with { type: 'json' };
import matrix from '../../../constitution/permission-matrix.json' with { type: 'json' };
// @ts-expect-error — a standalone Netlify function, deliberately outside this
// app's TypeScript program: it is deployed on its own, with no bundler and no
// workspace resolution, which is exactly why its shape check is written by hand
// rather than in Zod. It is imported here so the two can be held against each
// other; see the drift tests at the foot of this file.
import { shapeComplaint } from '../../../netlify/functions/state.mjs';
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
    // `Fabricator`, not `fabricator`: this assertion was written against the raw
    // word the report carries, which is precisely the defect the block below
    // ("the holder is drawn under the name the rest of the room uses") is about.
    // A test can encode a bug as confidently as it encodes a rule.
    expect(state?.content.active).toBe('Fabricator');
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

  /**
   * **The Keeper's KP3-04.** The shape check was tested only as a pure function,
   * so deleting its call site left the whole suite green and the finding it was
   * written to close fully reopened. This repository had by then shipped the
   * same failure twice — `liveTransport` written and never wired, Zod written
   * and never wired — and the check meant to end that pattern was itself
   * unwired-detectable. One line.
   */
  it('calls the shape check, rather than merely defining it', () => {
    expect(FUNCTION).toContain('const wrong = shapeComplaint(report);');
    // The exact call site, including the status it returns with the refusal.
    // This assertion caught its own repair: adding `status: 'refused'` changed
    // the line and the test said so, which is what a text assertion is for.
    expect(FUNCTION).toContain("if (wrong) return { report: null, status: 'refused', reason:");
  });

  /**
   * **KP4-06(b): one link of a three-link chain was asserted.**
   *
   * The check is called by `readSessionReport`; nothing said `handler` calls
   * `readSessionReport`, or that what it returns becomes the `sessionReport` the
   * page reads. Both were true and neither was held, so two of the three links
   * could be cut and the test guarding the third would still pass — the same
   * shape as the finding it was written for, a link further along.
   */
  it('reaches the answer the page reads, from end to end', () => {
    const handler = FUNCTION.slice(FUNCTION.indexOf('export default async function handler'));
    expect(handler).toContain('readSessionReport(');
    expect(handler).toContain('sessionReport:');
    // And the value that reaches the page is the one the check passed, not a
    // second read of the file that skipped it.
    expect(handler).toMatch(/sessionReport:\s*session\??\.?\w*/);
  });

  /**
   * **The copy of the constitution's fifteen states, held against the original.**
   *
   * `state.mjs` is deployed alone, with no bundler and no way to import
   * `constitution/authority.json`, so the list is written out there. A second
   * copy of a vocabulary is free to drift from the first, which is the failure
   * the contracts package exists to prevent; this is what stops it happening
   * quietly.
   */
  it('carries the constitution’s fifteen candidate states, exactly', () => {
    for (const state of authority.candidateStates) {
      expect(FUNCTION.includes(`'${state}'`), `the wire check has no ${state}`).toBe(true);
    }
    const listed = [...FUNCTION.matchAll(/^ {4}'([A-Z_]+)',$/gm)].map((m) => m[1] ?? '');
    expect(new Set(listed)).toEqual(new Set(authority.candidateStates));
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

/**
 * **The Keeper's KP2-04, and the tests that would have caught it.**
 *
 * The reviewer fed `stateFromAnswer` a report whose `review` named a file that
 * does not exist and a commit that does not exist, and `PASS` arrived on the
 * verdict slab as *"The Keeper has finished its review"*, marked `verified`. The
 * schema forbidding that ran only in unit tests, against fixtures; on the wire
 * the function checked one version string and returned the file verbatim.
 *
 * The old test asserted the property over an input carrying no report at all.
 * These assert it over the input that broke it.
 */
describe('no verdict reaches the slab from a session’s word', () => {
  const NOW = Date.parse(REPORT.reportedAt) + 60_000;
  const FABRICATED = {
    ...REPORT,
    review: {
      verdict: 'PASS',
      recordPath: 'docs/made-up.md',
      recordCommit: '0'.repeat(40),
      findings: 0,
      blocking: 0,
    },
  };

  it('refuses a well-formed review that names a record nothing has read', () => {
    const state = stateFromAnswer({ ...FULL, sessionReport: FABRICATED }, NOW);
    expect(state?.content.verdict).toBe('—');
  });

  it('refuses every one of the four, not merely the one that was tried', () => {
    for (const verdict of authority.reviewVerdicts) {
      const state = stateFromAnswer(
        { ...FULL, sessionReport: { ...FABRICATED, review: { ...FABRICATED.review, verdict } } },
        NOW,
      );
      expect(state?.content.verdict, verdict).toBe('—');
    }
  });

  it('carries no path by which a report’s verdict reaches the content at all', () => {
    // The property, at the source. KP2-04 was that the comment claimed this and
    // the code did the opposite one line below it.
    const source = SOURCE.slice(SOURCE.indexOf('export function stateFromAnswer'));
    expect(source).not.toContain('report?.review?.verdict');
    expect(source).not.toContain('review.verdict');
  });
});

describe('the function checks the report’s shape on the wire, not only in tests', () => {
  const wellFormed = {
    schema: 'virgil.session-status.v1',
    reportedAt: REPORT.reportedAt,
    aboutCommit: REPORT.aboutCommit,
    branch: REPORT.branch,
    candidate: null,
    holder: 'fabricator',
    hops: REPORT.hops,
    review: null,
    note: null,
  };

  it('accepts what the schema accepts', () => {
    expect(shapeComplaint(wellFormed)).toBeNull();
    expect(SessionStatusReport.safeParse(wellFormed).success).toBe(true);
  });

  const refusals: [string, unknown][] = [
    ['no commit', { ...wellFormed, aboutCommit: undefined }],
    ['a commit that is not a SHA', { ...wellFormed, aboutCommit: 'HEAD' }],
    ['no branch', { ...wellFormed, branch: '' }],
    ['a holder that is not a role', { ...wellFormed, holder: 'owner' }],
    [
      'a hop for an unknown role',
      { ...wellFormed, hops: [{ role: 'virgil', activity: 'WORKING', reported: null, at: null }] },
    ],
    [
      'a hop in an unknown state',
      { ...wellFormed, hops: [{ role: 'prover', activity: 'THINKING', reported: null, at: null }] },
    ],
    [
      'a hop reporting a non-verdict',
      {
        ...wellFormed,
        hops: [{ role: 'keeper', activity: 'REPORTED', reported: 'LOOKS FINE', at: null }],
      },
    ],
    [
      'a verdict that is not one of the four',
      {
        ...wellFormed,
        review: {
          verdict: 'GREAT',
          recordPath: 'a.md',
          recordCommit: '0'.repeat(40),
          findings: 0,
          blocking: 0,
        },
      },
    ],
    ['a verdict naming no record', { ...wellFormed, review: { verdict: 'PASS' } }],
  ];

  for (const [what, report] of refusals) {
    it(`refuses ${what}, and so does the schema`, () => {
      // **Held against each other on purpose.** The wire check is written out by
      // hand because Zod is not reachable from a standalone Netlify function, so
      // it is a second implementation of the same intent and free to drift. This
      // is what stops it drifting quietly.
      expect(shapeComplaint(report), `wire check accepted ${what}`).not.toBeNull();
      expect(SessionStatusReport.safeParse(report).success, `schema accepted ${what}`).toBe(false);
    });
  }
});

/**
 * **The three ways there can be no report, which are three different facts.**
 *
 * KP4-03 was that a refused report was announced as *"No session has written a
 * report"* with the refusal printed after it — two statements about one fact,
 * the first false. The repair read any reason as a refusal, which made the
 * opposite error on the commonest case of all: no `.virgil/state.json` at all
 * would have read as *"a session did write a report and this build refused it"*.
 * Found by running the built page against a stub, not by reading the diff.
 *
 * So the reader says which of the three it is and the page branches on that,
 * rather than on prose it would have to parse.
 */
describe('the endpoint says which kind of nothing it found', () => {
  it('distinguishes absent, unreadable and refused, and marks a good read', () => {
    const reader = FUNCTION.slice(FUNCTION.indexOf('async function readSessionReport'));
    expect(reader).toContain("status: error?.status === 404 ? 'absent' : 'unreadable'");
    expect(reader).toContain("status: 'unreadable'");
    expect(reader).toContain("status: 'refused'");
    expect(reader).toContain("status: 'read'");
  });

  it('carries the status out to the page beside the reason', () => {
    expect(FUNCTION).toContain('sessionReportStatus: session.status');
  });

  it('the page decides from the status, never from the words of the reason', () => {
    const page = readFileSync(
      new URL('../src/world/mobile/MobileRoom.tsx', import.meta.url),
      'utf8',
    );
    expect(page).toContain("sessionReportStatus === 'refused'");
    // The repair that made the opposite error: a bare truthiness test on the
    // reason, which is true for all three kinds.
    expect(page).not.toMatch(/\?\.sessionReportReason \?\s*\(/);
  });
});

/**
 * **KP3-08 and KP4-08: the two files nothing was reading.**
 *
 * `__LIVE__` decides whether the live-state reader is compiled in at all, and
 * every claim this project makes about the Owner Build making no network request
 * rests on its value in three configs. Nothing asserted those values; the claim
 * was carried by `verify:owner` opening a browser, which proves the built
 * artifact is quiet but says nothing about which config produced it or why. And
 * `.virgil/state.json` — the file the room draws — was written by a script whose
 * output nothing validated against the schema it is supposed to satisfy.
 */
describe('the flag that decides whether the network code exists at all', () => {
  const config = (name: string) =>
    readFileSync(new URL(`../${name}`, import.meta.url), 'utf8').replace(/\s+/g, ' ');

  it('is false in every build that must make no request, and true only in the hosted one', () => {
    expect(config('vite.config.ts')).toContain('__LIVE__: false');
    expect(config('vite.owner.v11.config.ts')).toContain('__LIVE__: false');
    expect(config('vitest.config.ts')).toContain('__LIVE__: false');
    expect(config('vite.web.config.ts')).toContain('__LIVE__: true');
  });

  /**
   * **KP5-11.** This listed four filenames, so a fifth config with `__LIVE__:
   * true` — or V10's acquiring one — passed a test titled for catching exactly
   * that. The list is read off the directory now, so the title is true of
   * whatever is there rather than of what someone remembered to type.
   */
  it('is true in exactly one config, so a second hosted build cannot appear unnoticed', () => {
    const configs = readdirSync(new URL('../', import.meta.url)).filter((name) =>
      /^vite.*\.config\.ts$/.test(name),
    );
    expect(configs.length).toBeGreaterThan(3);
    const live = configs.filter((name) => config(name).includes('__LIVE__: true'));
    expect(live).toEqual(['vite.web.config.ts']);
  });

  /**
   * **KP2-14, reported rather than repaired, and this test is the report.**
   *
   * `vite.owner.config.ts` — V10's — defines no `__LIVE__` at all. That is not
   * an oversight left standing out of laziness: the file is one of V10's
   * protected files, fingerprinted by `owner-build-v11.test.ts`, and `OD-0010`
   * keeps that fingerprint deliberately. A session adding a `define` to it was
   * refused by that test on 2026-09-10 and was right to be. So the gap is held
   * here as a fact with a reason rather than closed by a session overriding an
   * owner decision. The V10 artifact is quiet, and `verify:owner` proves that
   * about the artifact each run.
   */
  it('is absent from V10’s config, which is protected and not this session’s to change', () => {
    expect(config('vite.owner.config.ts')).not.toContain('__LIVE__');
  });
});

/**
 * **KP4-08.** The committed report is what the site actually reads. Nothing
 * checked it against either of the two things that must accept it, so a report
 * this repository had committed could be one the deployed function refuses, and
 * the first anyone would know is the room saying nobody is working.
 */
describe('the report this repository has committed is one the site can read', () => {
  const committed = JSON.parse(
    readFileSync(new URL('../../../.virgil/state.json', import.meta.url), 'utf8'),
  );

  it('satisfies the schema', () => {
    const parsed = SessionStatusReport.safeParse(committed);
    expect(parsed.success ? null : JSON.stringify(parsed.error.issues)).toBeNull();
  });

  it('is accepted by the wire check that stands in front of the room', () => {
    expect(shapeComplaint(committed)).toBeNull();
  });
});

/**
 * **The Keeper's KP3-05: the pairing proved less than it was described as
 * proving, and now it generates its cases instead of listing them.**
 *
 * What was here was nine reports written by hand, each broken in one named way,
 * each required to be refused by both the wire check and the schema. The comment
 * above them said the pairing was what stopped the hand-written check drifting
 * from the contract. It stopped it drifting *in nine places*. When these
 * generated cases were run against the check as it then stood, the two disagreed
 * about **106** of them: `reportedAt` was any non-empty string, `hops[].at` and
 * the review's counts were not looked at, `recordPath` could be `/etc/passwd`,
 * `note` could be a number or a novel, a missing key read as a null one, unknown
 * keys travelled through a schema declared `.strict()`, and a `holder` of
 * `architect` — valid by the contract — was refused. All 106 are closed.
 *
 * **What this still does not establish.** It is not a proof of equivalence. It
 * takes the well-formed report, walks every field in it, and substitutes each of
 * a battery of hostile values, which is a large finite sample of one shape and
 * not the infinite set of possible reports. A divergence over a value nobody
 * thought to put in the battery would still pass. It is recorded that way here
 * rather than described as a proof, because describing a sample as a proof is
 * the exact thing this finding was about.
 */
describe('the wire check and the schema agree about generated reports, not only named ones', () => {
  /** Every field position in a report, including nested ones, as a path. */
  function positions(node: unknown, prefix: string[] = []): string[][] {
    if (node === null || typeof node !== 'object') return [prefix];
    if (Array.isArray(node)) {
      const out: string[][] = [prefix];
      node.forEach((value, index) => out.push(...positions(value, [...prefix, String(index)])));
      return out;
    }
    const out: string[][] = prefix.length ? [prefix] : [];
    for (const [key, value] of Object.entries(node))
      out.push(...positions(value, [...prefix, key]));
    return out;
  }

  function withValueAt(root: unknown, path: string[], value: unknown): unknown {
    const clone = structuredClone(root) as Record<string, unknown>;
    let node = clone as Record<string, unknown>;
    for (const key of path.slice(0, -1)) node = node[key] as Record<string, unknown>;
    const last = path[path.length - 1] as string;
    if (value === undefined) delete node[last];
    else node[last] = value;
    return clone;
  }

  /**
   * A full report, so that every position has something to substitute into: a
   * candidate, a review and a note, none of which the well-formed report above
   * carries. Both sides must accept it before anything is made of what they do
   * with the mutations of it.
   */
  const COMPLETE = {
    schema: 'virgil.session-status.v1',
    reportedAt: '2026-09-10T06:00:00.000Z',
    aboutCommit: 'a'.repeat(40),
    branch: 'claude/virgil-phase-2',
    candidate: { sha: 'b'.repeat(40), shortSha: 'bbbbbbb', state: 'BUILDING' },
    holder: 'fabricator',
    hops: [
      { role: 'prover', activity: 'WORKING', reported: null, at: '2026-09-10T06:00:00.000Z' },
      { role: 'keeper', activity: 'REPORTED', reported: 'PASS', at: null },
    ],
    review: {
      verdict: 'PASS',
      recordPath: 'docs/process/V11_KEEPER_REVIEW_PHASE2.md',
      recordCommit: '0'.repeat(40),
      findings: 3,
      blocking: 0,
    },
    note: 'One sentence a person wrote.',
  };

  /**
   * The values substituted at every position. Wrong types, wrong vocabularies,
   * near-misses on each format, and the shapes that have actually got past a
   * hand-written check in this repository before: a plausible word in an enum
   * position, a commit that is not a commit, a path that leaves the repository.
   */
  const BATTERY: unknown[] = [
    undefined,
    null,
    42,
    -1,
    0,
    1.5,
    true,
    false,
    '',
    ' ',
    'NOPE',
    'HEAD',
    'virgil.session-status.v2',
    '/etc/passwd',
    '../secrets',
    'a/../b',
    './a',
    'a//b',
    'a/./b',
    '..',
    'a/..',
    'a/',
    'docs/**',
    'docs/*',
    '~/x',
    'C:/x',
    'https://x/y',
    'a\\b',
    'a b',
    'a%2e%2e/b',
    '/',
    'A'.repeat(40),
    'a'.repeat(39),
    'a'.repeat(41),
    '2026-09-10 06:00:00',
    '2026-09-10T06:00:00',
    '2026-09-10T99:00:00Z',
    '2026-13-45T06:00:00Z',
    '2026-09-10T06:00:00+00:00',
    '2026-09-10T06:00:00.123456Z',
    // KP4-09's two, found by the Keeper outside this battery and added to it.
    // Their presence here does not make the battery a proof; it makes it two
    // values larger, which is the honest description of what happened.
    '2026-02-30T00:00:00Z',
    '2026-11-31T00:00:00Z',
    // KP5-04: offsets that carry the timestamp over a UTC date boundary. The
    // first repair of KP4-09 compared a UTC date against a local one and refused
    // both of these, which the schema accepts. One offset in the battery was not
    // enough, because the one it had was +00:00.
    '2026-09-10T01:00:00+05:00',
    '2026-09-10T23:00:00-05:00',
    '2026-01-01T00:30:00+09:00',
    2 ** 53,
    Number.MAX_SAFE_INTEGER + 2,
    'x'.repeat(300),
    'x'.repeat(301),
    'x'.repeat(5000),
    'architect',
    'owner',
    'virgil',
    'COMPLETE',
    'PASS',
    'BUILDING',
    {},
    [],
    [1],
    { sha: 1 },
  ];

  it('accepts the complete report on both sides, or the rest of this proves nothing', () => {
    expect(shapeComplaint(COMPLETE)).toBeNull();
    expect(SessionStatusReport.safeParse(COMPLETE).success).toBe(true);
  });

  it('agrees about every value of the battery at every position of the report', () => {
    const disagreements: string[] = [];
    let cases = 0;
    for (const path of positions(COMPLETE)) {
      for (const value of BATTERY) {
        const mutant = withValueAt(COMPLETE, path, value);
        cases += 1;
        const refusedOnTheWire = shapeComplaint(mutant) !== null;
        const refusedByTheSchema = !SessionStatusReport.safeParse(mutant).success;
        if (refusedOnTheWire === refusedByTheSchema) continue;
        disagreements.push(
          `${path.join('.')} = ${JSON.stringify(value)?.slice(0, 60) ?? String(value)} — ` +
            `wire ${refusedOnTheWire ? 'refused' : 'ACCEPTED'}, schema ${refusedByTheSchema ? 'refused' : 'ACCEPTED'}`,
        );
      }
    }
    // The count is asserted so that a generator which silently stopped walking
    // the report — the failure mode of every derived test in this repository so
    // far — fails here rather than passing over nothing.
    expect(cases).toBeGreaterThan(1000);
    expect(disagreements, `${disagreements.length} of ${cases} generated reports`).toEqual([]);
  });

  it('agrees about an unknown key added at any object in the report', () => {
    const disagreements: string[] = [];
    let cases = 0;
    for (const path of [[], ...positions(COMPLETE)]) {
      const at = path.reduce<unknown>(
        (node, key) => (node as Record<string, unknown>)?.[key],
        COMPLETE,
      );
      if (at === null || typeof at !== 'object' || Array.isArray(at)) continue;
      const mutant = withValueAt(COMPLETE, [...path, 'surprise'], 1);
      cases += 1;
      const refusedOnTheWire = shapeComplaint(mutant) !== null;
      const refusedByTheSchema = !SessionStatusReport.safeParse(mutant).success;
      if (refusedOnTheWire === refusedByTheSchema) continue;
      disagreements.push(
        `${[...path, 'surprise'].join('.')} — wire ${refusedOnTheWire ? 'refused' : 'ACCEPTED'}`,
      );
    }
    expect(cases).toBeGreaterThan(3);
    expect(disagreements).toEqual([]);
  });

  /**
   * **The second copy of a vocabulary, held against the first.** The same reason
   * as the candidate states above: `state.mjs` is deployed alone and cannot
   * import `constitution/permission-matrix.json`, so the cast is written out
   * there, and a copy nothing checks is a copy that drifts. This is what caught
   * the wire refusing `architect` while the contract admitted it.
   */
  it('carries the constitution’s whole cast as possible holders, exactly', () => {
    const listed = [
      ...(FUNCTION.match(/const HOLDER_ROLES = \[[^\]]*\]/s)?.[0] ?? '').matchAll(/'([a-z-]+)'/g),
    ].map((match) => match[1] ?? '');
    expect(new Set(listed)).toEqual(new Set(matrix.roles.map((role) => role.id)));
  });
});

/**
 * **The holder reaches the room under the name the room knows, or not at all.**
 *
 * Found while closing KP3-05, and it is the same class of defect as KP3-02: a
 * value carried straight through from the wire into a position where something
 * downstream compares it against a fixed vocabulary. `windowContent.ts` asks
 * whether the holder is `Fabricator`, `Prover` or `Keeper` and, when it is none
 * of them, offers *"Go to the Fabricator"*. The report says `keeper`. So the
 * slab read KEEPER and the button under it went to the Fabricator — the
 * interface saying two different things about the same fact, which is the one
 * thing this project treats as fatal.
 */
describe('the holder is drawn under the name the rest of the room uses', () => {
  const NOW = Date.parse(REPORT.reportedAt) + 60_000;
  const held = (holder: unknown) =>
    stateFromAnswer({ ...FULL, sessionReport: { ...REPORT, holder } } as never, NOW);

  it('names the three stations the way every other surface names them', () => {
    expect(held('fabricator')?.content.active).toBe('Fabricator');
    expect(held('prover')?.content.active).toBe('Prover');
    expect(held('keeper')?.content.active).toBe('Keeper');
  });

  it('draws no station for a role that has none, rather than the wrong one', () => {
    // Valid by the contract — the whole cast may hold the work — and undrawable
    // by this build, which has three stations. Nothing is better than the
    // Fabricator, which is what the default used to give.
    for (const role of ['virgil', 'architect', 'arbiter', 'security-sentinel', null]) {
      expect(held(role)?.content.active, String(role)).toBeNull();
    }
  });

  it('is never the raw word from the report', () => {
    // The failure was that `active` was whatever the report said. If it ever is
    // again, one of these is the word that comes back.
    for (const role of matrix.roles.map((r) => r.id)) {
      expect(held(role)?.content.active, role).not.toBe(role);
    }
  });
});

/**
 * **KP3-02, from both sides.** A session may not put a word of its own choosing
 * into a candidate-state position, and the fix is on the wire *and* in the page:
 * one of them being enough is exactly what was assumed when the verdict path was
 * closed and this one was left open.
 */
describe('no invented candidate state reaches the slab', () => {
  const NOW = Date.parse(REPORT.reportedAt) + 60_000;
  const withCandidate = (state: unknown) => ({
    ...FULL,
    sessionReport: {
      ...REPORT,
      candidate: { sha: 'b'.repeat(40), shortSha: 'bbbbbbb', state },
    },
  });

  it('drops a word that is not one of the fifteen', () => {
    const state = stateFromAnswer(withCandidate('APPROVED BY THE OWNER') as never, NOW);
    expect(state?.content.candidate).toBeNull();
  });

  it('drops a candidate state that is not a string at all', () => {
    for (const value of [42, true, {}, []]) {
      expect(stateFromAnswer(withCandidate(value) as never, NOW)?.content.candidate).toBeNull();
    }
  });

  it('keeps every one of the fifteen the constitution does name', () => {
    for (const state of authority.candidateStates) {
      expect(stateFromAnswer(withCandidate(state) as never, NOW)?.content.candidate, state).toBe(
        state,
      );
    }
  });

  it('is refused on the wire as well, not only in the page', () => {
    const report = {
      schema: 'virgil.session-status.v1',
      reportedAt: REPORT.reportedAt,
      aboutCommit: REPORT.aboutCommit,
      branch: REPORT.branch,
      candidate: { state: 'APPROVED BY THE OWNER' },
      holder: null,
      hops: [],
      review: null,
      note: null,
    };
    expect(shapeComplaint(report)).not.toBeNull();
    expect(SessionStatusReport.safeParse(report).success).toBe(false);
  });
});
