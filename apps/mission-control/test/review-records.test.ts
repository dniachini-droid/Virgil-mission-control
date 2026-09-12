import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * **The review documents are copies, and a copy nothing verifies is a summary
 * wearing a quotation's clothes.**
 *
 * `docs/process/RECORD_KEEPING_BRIEF.md`, finding one. Twelve findings — `XR-01`
 * and `XR-02`, then `KXR-01` to `KXR-12` — had their full text only in review
 * documents on three branches nobody has merged. Delete those branches and the
 * text goes with them, which is `XR-02` returning by the back door in the very
 * branch built to end it. `constitution/REVIEW_POLICY.md`: findings are *"never
 * renumbered, merged silently or dropped."*
 *
 * So the documents are copied into `docs/process/`, and held to the SHA-256 of
 * what they were at the commit they came from. **The reason is specific and it
 * is not ceremony.** These are the records of three sessions judging work this
 * repository's own sessions produced, and the one thing that makes them worth
 * keeping is that nobody edited them afterwards. A copy that can be quietly
 * tidied — a finding softened, a severity lowered, an awkward sentence
 * smoothed — is worse than a link, because it looks like the original.
 *
 * The digests below were taken from `git show <sha>:<path>` at the commit named,
 * and a reviewer can take them again the same way.
 */

const root = resolve(import.meta.dirname, '../../..');

interface Record_ {
  /** Where it now lives, so it survives the branch being deleted. */
  path: string;
  /** The reviewer's branch and commit it was taken from. */
  from: string;
  commit: string;
  /** SHA-256 of the bytes as they were there. */
  sha256: string;
  /** The candidate that review examined. */
  reviewed: string;
  /** Findings whose full text this document holds. */
  holds: string[];
}

const RECORDS: Record_[] = [
  {
    path: 'docs/process/KEEPER_REVIEW_GATE_PROOF_AND_FINDINGS.md',
    from: 'claude/keeper-virgil-review-qu3pvr',
    commit: '5edc9ff',
    sha256: '8e3b87afbdf8bf902dd27bfdff34892c61a605d14232ea0522079d955591512b',
    reviewed: '8b725b533d0b8192d176d0b112f5b6f27b01cc4e',
    holds: ['KXR-01', 'KXR-02', 'KXR-03', 'KXR-04', 'KXR-05'],
  },
  {
    path: 'docs/process/KEEPER_REREVIEW_GATE_PROOF_AND_FINDINGS.md',
    from: 'claude/keeper-review-candidate-23af6acf-3ed0pw',
    commit: '5f932ab',
    sha256: '08efb91ed7455f3f4145c24a0024b43f71d4430629bad10acb30d19c04bb0d1c',
    reviewed: '23af6acf4833640198eecbccccd4ab1c01215ae0',
    holds: ['KXR-06', 'KXR-07', 'KXR-08'],
  },
  {
    path: 'docs/process/KEEPER_FINAL_REVIEW_GATE_PROOF_AND_FINDINGS.md',
    from: 'claude/keeper-virgil-review-final-axici6',
    commit: '65abd44',
    sha256: 'fabd395609f7b4962a249bdad0f512cb77f09c43256155e308cc2195bbde2e9a',
    reviewed: 'ec53d9876283444a704751ffd1d6f6fe59e71fe9',
    holds: ['KXR-09', 'KXR-10', 'KXR-11', 'KXR-12'],
  },
];

describe('the reviews are kept, exactly as they were written', () => {
  it('has records to check, or every assertion below is vacuous', () => {
    expect(RECORDS.length).toBe(3);
  });

  for (const record of RECORDS) {
    it(`${record.path.split('/').pop()} is byte for byte what ${record.commit} held`, () => {
      const path = resolve(root, record.path);
      expect(existsSync(path), `${record.path} is not in this repository`).toBe(true);
      const actual = createHash('sha256').update(readFileSync(path)).digest('hex');
      expect(
        actual,
        `${record.path} is not what ${record.from} held at ${record.commit}. A review that can be edited after it is written is not a review.`,
      ).toBe(record.sha256);
    });

    it(`${record.path.split('/').pop()} still holds the findings it is cited for`, () => {
      // The register points readers here for these findings' text. A document
      // that no longer states one is a pointer at nothing — KXR-08's family.
      const text = readFileSync(resolve(root, record.path), 'utf8');
      for (const id of record.holds) {
        expect(text, `${record.path} does not state ${id}`).toContain(id);
      }
    });

    it(`${record.path.split('/').pop()} names the candidate it judged`, () => {
      // A review is about one immutable SHA. A record that does not say which is
      // a review of nothing in particular.
      const text = readFileSync(resolve(root, record.path), 'utf8');
      expect(
        text.includes(record.reviewed) || text.includes(record.reviewed.slice(0, 7)),
        `${record.path} does not name the candidate ${record.reviewed.slice(0, 7)}`,
      ).toBe(true);
    });
  }

  it('every KXR finding has a document that holds its text', () => {
    // The whole point of copying them in. Twelve findings, three documents, and
    // nothing left depending on a branch surviving.
    const held = new Set(RECORDS.flatMap((r) => r.holds));
    const expected = Array.from({ length: 12 }, (_, i) => `KXR-${String(i + 1).padStart(2, '0')}`);
    const missing = expected.filter((id) => !held.has(id));
    expect(missing, `findings whose text is in no kept record: ${missing.join(', ')}`).toEqual([]);
  });
});
