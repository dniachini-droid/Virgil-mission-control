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
 *
 * **The ten added on 2026-09-13 are the repair of `KXR-75/PR33`**, which is the
 * sentence above happening for real rather than being warned about. Seven
 * reviews were captured into `docs/process/` and twenty-four register rows were
 * pointed at them, and nothing here held any of the seven. A reviewer emptied
 * one and softened a finding inside another, and the suite passed both times.
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
  {
    path: 'docs/process/KEEPER_RECORD_KEEPING_REVIEW.md',
    from: 'claude/keeper-review-b27cde14-ug7ffo',
    commit: 'c3d9849',
    sha256: 'ea7100b9407bb59eed9ba18b575d8baa09b79e3270074f1afb22c778a096b9d7',
    reviewed: 'b27cde14a2dd3fe9ad7ac435ded24c49686d68a8',
    holds: ['KXR-13', 'KXR-14', 'KXR-15', 'KXR-16', 'KXR-17'],
  },
  {
    path: 'docs/process/KEEPER_PR11_UNREVIEWED_COMMITS_REVIEW.md',
    from: 'claude/pr-11-unreviewed-commits-mvjp2h',
    commit: 'f8bd148',
    sha256: '38ea0709e2d1592d0d4f12bda1a98e94f48d4ade97b94d3bebeb4344097cc670',
    reviewed: 'd7d80fdaf54663afe47d8bda60845cd4b6c9808b',
    holds: ['KXR-18', 'KXR-19', 'KXR-20', 'KXR-21', 'KXR-22'],
  },
  {
    path: 'docs/process/KEEPER_PR11_REREVIEW_OD0016.md',
    from: 'claude/keeper-pr11-rereview-od0016',
    commit: '99f979c',
    sha256: '2191784d9dca8aa01d8827f0b15b75026736b0eecf43deaab7b14564f152ba40',
    reviewed: 'ff8f103dbed65032183d6d9eed105d64d05e67d4',
    holds: ['KXR-23', 'KXR-24', 'KXR-25', 'KXR-26', 'KXR-27', 'KXR-28'],
  },
  {
    path: 'docs/process/KEEPER_PR14_REVIEW.md',
    from: 'claude/keeper-pr14-review',
    commit: '73d5489',
    sha256: '68df6a0d7567977fde75cad64a10df159c640542ca5a641a7b0dad1607675522',
    reviewed: '4e331f5d45bb992d5a25fed606b22a699b116fa6',
    holds: ['KXR-29', 'KXR-30', 'KXR-31'],
  },

  /**
   * **The ten captures of 2026-09-13 — `KXR-75/PR33`.**
   *
   * The seven above were taken from a reviewer's own branch with
   * `git show <sha>:<path>`, so `from` and `commit` name where the bytes were
   * already sitting. The ten below were captured from pull-request comments,
   * which are not in any tree, so `from` and `commit` name the branch and
   * commit that **introduced** the capture. A reviewer re-takes the digest the
   * same way — `git show <commit>:<path> | sha256sum` — and the guarantee is
   * identical: these bytes, at that commit, and any later edit fails here.
   *
   * **Why they needed adding, proved rather than argued.** The reviewer of #33
   * cut `KEEPER_PR28_REREVIEW.md` from 18,742 bytes to a line holding only the
   * four ids it is cited for, and the whole suite still passed. It softened
   * `KXR-44/PR26` inside `KEEPER_PR26_REVIEW.md` into a finding raised in error,
   * and the whole suite still passed. Both were reproduced on an untouched copy
   * of `f2aa068` before this entry existed: `792 passed, 0 failed` each time.
   * Twenty-four findings pointed at documents anyone could empty or reverse.
   *
   * **One thing this freezes that is known to be wrong.**
   * `docs/process/KEEPER_PR30_REVIEW.md`'s builder-authored header says its
   * reason is a finding *"this very document raises"* and names `KXR-49/PR27`,
   * which a different capture raises. That is `KXR-77/PR33`, filed open, and
   * pinning the file as it stands means correcting it will mean re-pinning it
   * in the same commit. That is the pin working, not the pin obstructing: the
   * correction becomes visible in a diff instead of happening quietly.
   */
  {
    path: 'docs/process/KEEPER_PR24_REVIEW.md',
    from: 'claude/file-the-findings',
    commit: '88d5d5a',
    sha256: '97158e076e5da63211f440c1a85a2b4fed5b82ef1556c002bdf1b2ebf7b1382b',
    reviewed: '138fa39d6e1be8d8516a34e0d5b50ea8d972ed51',
    holds: ['KXR-51/PR24'],
  },
  {
    path: 'docs/process/KEEPER_PR26_REVIEW.md',
    from: 'claude/file-the-findings',
    commit: '88d5d5a',
    sha256: 'f5777aba4ff9c0d203242be99cbf0b9a31067177ecfeb9cafeffb9723b03e5f5',
    reviewed: '7e1f719e6a1df57c52e5400d5499769952db09f8',
    holds: [
      'KXR-44/PR26',
      'KXR-45/PR26',
      'KXR-46/PR26',
      'KXR-47/PR26',
      'KXR-48/PR26',
      'KXR-49/PR26',
      'KXR-50/PR26',
    ],
  },
  {
    path: 'docs/process/KEEPER_PR27_REVIEW.md',
    from: 'claude/file-the-findings',
    commit: '88d5d5a',
    sha256: '729bba99bdde3cc24ee50e268d6a9bb4c91c9ff5ff9d332e9e834dbfa2143815',
    reviewed: '571b258a26117549e00a2293ec84c04e7370b4d7',
    holds: ['KXR-47/PR27', 'KXR-48/PR27', 'KXR-49/PR27', 'KXR-50/PR27'],
  },
  {
    path: 'docs/process/KEEPER_PR27_REREVIEW.md',
    from: 'claude/file-the-findings',
    commit: '88d5d5a',
    sha256: '1774719a09efa004f85fc64014ba4bb1704ee5149b6dc9c60c653b1d4ac7fb25',
    reviewed: '9ed95d60f857adb09ee84a73ec65112566b7ecfe',
    holds: ['KXR-51/PR27', 'KXR-52/PR27'],
  },
  {
    path: 'docs/process/KEEPER_PR28_REVIEW.md',
    from: 'claude/file-the-findings',
    commit: '88d5d5a',
    sha256: '26cccec923b83d73a47f845c5121c2aa2a837dfb623305db199903e3702e585b',
    reviewed: 'd436ca78802b1c66edcd680a50848727a9111f28',
    holds: ['KXR-53/PR28', 'KXR-54/PR28', 'KXR-55/PR28', 'KXR-56/PR28'],
  },
  {
    path: 'docs/process/KEEPER_PR28_REREVIEW.md',
    from: 'claude/file-the-findings',
    commit: '88d5d5a',
    sha256: 'e76a1631b71e70f49ab5f5ce6b2a43c264014cbdeba44d25d8ddb425bb92bd1b',
    reviewed: 'f9d803db6d591ebed8c7038ba79823907ec28205',
    holds: ['KXR-60/PR28', 'KXR-61/PR28', 'KXR-62/PR28', 'KXR-63/PR28'],
  },
  {
    path: 'docs/process/KEEPER_PR30_REVIEW.md',
    from: 'claude/file-the-findings',
    commit: '88d5d5a',
    sha256: '5df68f45e6aa1915a93f10eed8cd32614191eac0ebc9c26caf8c396508fe41bb',
    reviewed: '6dec9f6f0bd6eaf5b12ab68153cf04f8de2c0b09',
    holds: ['KXR-57/PR30', 'KXR-58/PR30'],
  },
  {
    path: 'docs/process/KEEPER_PR32_REVIEW.md',
    from: 'claude/hold-the-captures-and-file-pr32-pr33',
    commit: 'ffb7d82',
    sha256: '28e7dbf7d7306275eb001c449a448ce936a596dfc8521c43b93256a8bce89195',
    reviewed: '8ba445262c15c487f087623a172c5f22eed23f49',
    holds: ['KXR-70/PR32', 'KXR-71/PR32', 'KXR-72/PR32', 'KXR-73/PR32', 'KXR-74/PR32'],
  },
  {
    path: 'docs/process/KEEPER_PR32_REREVIEW.md',
    from: 'claude/hold-the-captures-and-file-pr32-pr33',
    commit: 'ffb7d82',
    sha256: '6fbbc6f925f526e60495a97e6f2687d712e933ebcb906a1b7ff2cbb216ee7b1c',
    reviewed: '6e7c6b329c46c7a848fba3ba70f3a06d215ec208',
    holds: ['KXR-80/PR32', 'KXR-81/PR32', 'KXR-82/PR32'],
  },
  {
    path: 'docs/process/KEEPER_PR33_REVIEW.md',
    from: 'claude/hold-the-captures-and-file-pr32-pr33',
    commit: 'ffb7d82',
    sha256: '67ac45c4f92b991a2bf284fe3875f6f9db57da8ef985434f3ad3ee5024c869f6',
    reviewed: '88d5d5a9de263261b17ff21b4c5a1fa13d90a72f',
    holds: ['KXR-75/PR33', 'KXR-76/PR33', 'KXR-77/PR33'],
  },
];

describe('the reviews are kept, exactly as they were written', () => {
  it('has records to check, or every assertion below is vacuous', () => {
    expect(RECORDS.length).toBe(17);
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

  it('every KXR finding the register carries has a document that holds its text', () => {
    /**
     * **`KXR-22`: this was hardcoded to twelve.**
     *
     * A fourth review of `b27cde14` existed — `claude/keeper-review-b27cde14-ug7ffo`
     * at `c3d9849`, dated 22 minutes before the commit whose pull-request
     * description called that commit unreviewed — and raised `KXR-13` to
     * `KXR-17`. Those five findings were in no file in this repository, which is
     * `XR-02` recurring inside the lineage built to end it. A completeness check
     * counting to a literal could not notice, because the number was the claim.
     *
     * It now counts what the register actually carries. A finding recorded with
     * nowhere holding its text fails, whatever its number.
     */
    const held = new Set(RECORDS.flatMap((r) => r.holds));
    const register = readFileSync(resolve(root, 'docs/process/FINDINGS.md'), 'utf8');
    /**
     * **`KXR-75/PR33`: the id pattern was the reason this check required
     * nothing of twenty-four findings.**
     *
     * It read `/^\| (KXR-\d+) \|/` — an unqualified id followed by a cell
     * boundary — and every id filed on 2026-09-13 is qualified by the document
     * that raised it, `KXR-44/PR26`. Not one matched. The check reported
     * completeness over the eleven ids that predate the convention and said
     * nothing about the rest, which is a completeness check counting the wrong
     * set: the same shape of defect as `KXR-22`, where it counted to a literal.
     *
     * **So it matches both spellings, and that is the decision.** A qualified
     * id is a `KXR` finding — `constitution/REVIEW_POLICY.md` governs identity
     * and the owner's resolution of 2026-09-13 qualifies by document rather
     * than renumbering. Reading only the unqualified form would mean the
     * register's dominant identity shape is the one shape this file cannot
     * see, and every finding filed from now on would be born invisible to it.
     */
    const carried = [...register.matchAll(/^\| (KXR-\d+(?:\/PR\d+)?) \|/gm)].map(
      (m) => m[1] as string,
    );
    expect(
      carried.length,
      'the register carries no KXR findings, so this proves nothing',
    ).toBeGreaterThan(12);

    /**
     * **`KXR-38`: not every finding comes from a review.**
     *
     * This check was written when every `KXR` finding had been raised by a
     * Keeper, so "held" meant "quoted in a kept review document". The register's
     * detector vocabulary has always allowed `gate`, and the first gate-caught
     * finding has no review to be kept in — it has the record written where it
     * was caught.
     *
     * So a row whose detector is `gate` is held by the document its own pointer
     * names, and the requirement is unchanged in substance: **a finding whose
     * text is in no file still fails here.** The pointer must exist and must
     * name the finding. What is not accepted is a gate row pointing at nothing,
     * which is the failure this check exists to catch and which stays caught.
     */
    const gateHeld = new Set<string>();
    // `gate` and `owner` alike: neither has a review to be kept in. A finding a
    // check caught, and a finding only the owner can close, are both held by the
    // document their own pointer names. `review` is deliberately excluded — a
    // reviewer's finding must live in the kept review, which is `KXR-30`.
    for (const row of register.matchAll(
      /^\| (KXR-\d+(?:\/PR\d+)?) \| \S+ \| (?:gate|owner) \| [^|]+ \| ([^|]+?) \|/gm,
    )) {
      const id = row[1] as string;
      const pointer = (row[2] as string).trim();
      if (!existsSync(resolve(root, pointer))) continue;
      if (!readFileSync(resolve(root, pointer), 'utf8').includes(id)) continue;
      gateHeld.add(id);
    }

    const missing = carried.filter((id) => !held.has(id) && !gateHeld.has(id));
    expect(missing, `findings whose text is in no kept record: ${missing.join(', ')}`).toEqual([]);
  });
});
