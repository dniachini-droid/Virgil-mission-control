import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * **The findings register is read, so "never dropped" is checkable.**
 *
 * `docs/process/GATE_PROOF_AND_FINDINGS_BRIEF.md`, finding **XR-02**.
 * `constitution/REVIEW_POLICY.md` requires that findings are *"never renumbered,
 * merged silently or dropped"*, and `docs/process/PHASE_1_BACKLOG.md` already
 * records that they were: *"no file in the repository holds its text."* Until
 * `docs/process/FINDINGS.md` existed, answering "what is open right now?" meant
 * assembling it by hand from six kinds of document. A policy that findings are
 * never dropped is only as good as the one list that would show it if they were.
 *
 * **What this file does not do: claim the register is complete.** No check can
 * know about a finding nobody wrote down, and a completeness rule would force
 * back-filled guesses into the register to make the suite green — the exact
 * failure it exists to prevent. What is checkable is that every row *in* it is
 * well-formed and points at text that exists, and that is what is checked.
 *
 * It lives here rather than in a package of its own because the brief's fourth
 * requirement is that this lands inside `pnpm test` with no new package, no new
 * script and no new workflow step: `KS4-05` and `KS4-06` are what a check too
 * expensive to finish costs, and a repair paid for out of that same budget would
 * be the same mistake.
 */

const root = resolve(import.meta.dirname, '../../..');
const REGISTER = 'docs/process/FINDINGS.md';
const source = readFileSync(resolve(root, REGISTER), 'utf8');

/**
 * The vocabularies, held in two places on purpose.
 *
 * They are hard-coded here **and** stated in the register, and a test below
 * asserts the two agree. Reading them only from the document would let a row
 * legalise its own status by editing the list beside it; hard-coding them only
 * here would let the document drift into describing a vocabulary nothing
 * enforces. Neither alone is the property wanted.
 */
const STATUSES = [
  'open',
  'repaired',
  'accepted',
  'deferred',
  'caught_not_repaired',
  'by_design',
] as const;

/** A deterministic gate, a review, or the owner looking at the thing. */
const DETECTORS = ['gate', 'review', 'owner'] as const;

interface Row {
  id: string;
  status: string;
  foundBy: string;
  what: string;
  where: string;
  line: number;
}

/**
 * The register's one table, read as data.
 *
 * Deliberately strict about shape: a row with the wrong number of cells is not
 * silently skipped, because a row that parses into nothing is a finding that has
 * been dropped by a typo — which is the thing this file exists to make
 * impossible.
 */
export function rowsOf(markdown: string): {
  rows: Row[];
  malformed: { line: number; text: string }[];
} {
  const rows: Row[] = [];
  const malformed: { line: number; text: string }[] = [];
  let inTable = false;
  for (const [index, raw] of markdown.split('\n').entries()) {
    const line = raw.trim();
    if (!line.startsWith('|')) {
      inTable = false;
      continue;
    }
    // The header and its underline open a table and are not rows.
    if (/^\|\s*id\s*\|/i.test(line)) {
      inTable = true;
      continue;
    }
    if (/^\|[\s|:-]+\|$/.test(line)) continue;
    if (!inTable) continue;
    const cells = line
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim());
    if (cells.length !== 5) {
      malformed.push({ line: index + 1, text: line });
      continue;
    }
    rows.push({
      id: cells[0] as string,
      status: cells[1] as string,
      foundBy: cells[2] as string,
      what: cells[3] as string,
      where: cells[4] as string,
      line: index + 1,
    });
  }
  return { rows, malformed };
}

const { rows, malformed } = rowsOf(source);

/**
 * **Every finding the register has ever carried, named here so it cannot leave
 * quietly.**
 *
 * `KXR-02`, from the Keeper review of `8b725b5`
 * (`claude/keeper-virgil-review-qu3pvr`, `5edc9ff`). The reviewer deleted four
 * rows — `XR-01` among them, one of the two findings the branch itself raised —
 * and the suite stayed green at 40 passed. Every other property of a row was
 * checked and the one thing `REVIEW_POLICY.md` actually names was not:
 * findings are *"never renumbered, merged silently or dropped"*, and **dropping
 * was the one thing nothing caught.** Reproduced here before repairing it, with
 * the same four rows and the same result.
 *
 * Five of the twelve rows happened to be held in place by
 * `does not read as though recording a gap had closed it`, which pins them for a
 * different reason and was never designed as this guard. The other seven were
 * free to vanish.
 *
 * **Why a hand-written list is the right shape and not laziness.** The register
 * cannot check its own completeness — no check can know about a finding nobody
 * wrote down — but it can refuse to let go of what it already holds. Adding a
 * finding means adding it here too; removing one means deleting a line from this
 * list, in the diff, where a reviewer sees it. That converts a silent deletion
 * into a deliberate, visible act, which is the whole of what "never dropped" can
 * mean in a file.
 */
const PINNED = [
  'KR-03',
  'KR-06',
  'KR-07',
  'KR-09',
  'KR-58',
  'KP2-08',
  'KP2-11',
  'KP2-14',
  'KP3-06',
  'KP3-11',
  'XR-01',
  'XR-02',
  'KXR-01',
  'KXR-02',
  'KXR-03',
  'KXR-04',
  'KXR-05',
] as const;

describe('no finding leaves the register quietly', () => {
  const present = new Set(rows.map((row) => row.id));

  it('still carries every finding it has ever carried', () => {
    const gone = PINNED.filter((id) => !present.has(id));
    expect(
      gone,
      `findings dropped from the register: ${gone.join(', ')}. REVIEW_POLICY.md: findings are never renumbered, merged silently or dropped. If one genuinely should go, delete it from PINNED in the same commit so the removal is in the diff.`,
    ).toEqual([]);
  });

  it('has a row for everything pinned, and pins everything it has', () => {
    // The other direction. A row added to the register and not to PINNED is a
    // finding that can be dropped tomorrow without anything noticing — the
    // condition KXR-02 named, re-entering one row at a time.
    const unpinned = rows.map((row) => row.id).filter((id) => !PINNED.includes(id as never));
    expect(
      unpinned,
      `rows in the register that nothing holds in place: ${unpinned.join(', ')}`,
    ).toEqual([]);
  });
});

describe('the findings register is a register', () => {
  it('has rows, or every assertion below is vacuous', () => {
    // The failure this guards is a register emptied by a bad edit, which would
    // otherwise pass every check in this file in silence.
    expect(rows.length, 'the register has no rows').toBeGreaterThan(0);
  });

  it('has no row the reader can see and the check cannot', () => {
    expect(
      malformed,
      `rows in the register that do not parse: ${malformed.map((m) => `line ${m.line}`).join(', ')}`,
    ).toEqual([]);
  });

  it('gives every finding a stable identity, used once', () => {
    // REVIEW_POLICY.md: findings are never renumbered or merged silently. Two
    // rows sharing an id is one finding quietly absorbing another.
    const seen = new Map<string, number>();
    const repeated: string[] = [];
    for (const row of rows) {
      if (seen.has(row.id)) repeated.push(`${row.id} (lines ${seen.get(row.id)} and ${row.line})`);
      else seen.set(row.id, row.line);
    }
    expect(repeated, `ids used more than once: ${repeated.join('; ')}`).toEqual([]);
    for (const row of rows) {
      expect(row.id, `a row at line ${row.line} has no id`).not.toBe('');
    }
  });

  it('says something about each finding rather than listing an id', () => {
    for (const row of rows) {
      expect(row.what.length, `${row.id} has no description`).toBeGreaterThan(20);
    }
  });
});

describe('every row uses the vocabulary, and nothing else', () => {
  for (const row of rows) {
    it(`${row.id} has a status this repository has a word for`, () => {
      expect(
        STATUSES as readonly string[],
        `${row.id} (line ${row.line}) claims status "${row.status}"`,
      ).toContain(row.status);
    });

    it(`${row.id} says what found it, in the vocabulary`, () => {
      // The column is the only measure available of whether the review machinery
      // works. A value outside the three is a measurement of nothing.
      expect(
        DETECTORS as readonly string[],
        `${row.id} (line ${row.line}) claims it was found by "${row.foundBy}"`,
      ).toContain(row.foundBy);
    });
  }

  it('the vocabularies the register states are the vocabularies enforced here', () => {
    // Without this the document and the check drift, and a reader trusts a list
    // that decides nothing.
    for (const status of STATUSES) {
      expect(source, `the register does not describe the status "${status}"`).toContain(
        `\`${status}\``,
      );
    }
    for (const detector of DETECTORS) {
      expect(source, `the register does not describe the detector "${detector}"`).toContain(
        `\`${detector}\``,
      );
    }
    // And the other direction: a status described in the register that this file
    // would refuse is a promise the suite breaks.
    const described = [...source.matchAll(/^- `([a-z_]+)` —/gm)].map((m) => m[1] as string);
    for (const status of described) {
      expect(
        STATUSES as readonly string[],
        `the register describes a status "${status}" that the check refuses`,
      ).toContain(status);
    }
  });
});

describe('every row points at text that exists and names the finding', () => {
  for (const row of rows) {
    it(`${row.id}'s pointer is a file in this repository`, () => {
      expect(
        existsSync(resolve(root, row.where)),
        `${row.id} (line ${row.line}) points at ${row.where}, which is not in this repository`,
      ).toBe(true);
    });

    it(`${row.id}'s pointer names ${row.id}`, () => {
      // A pointer at a file that never mentions the finding is a citation to a
      // three-hundred-line document, which is how findings get lost inside
      // documents that are technically still present.
      const path = resolve(root, row.where);
      if (!existsSync(path)) return; // reported by the assertion above
      expect(readFileSync(path, 'utf8'), `${row.where} does not mention ${row.id}`).toContain(
        row.id,
      );
    });
  }
});

describe('what the register honestly is not', () => {
  it('says plainly that it is not complete', () => {
    // A register read as exhaustive is worse than no register: it converts an
    // unknown into a false all-clear.
    expect(source).toMatch(/does not claim to be complete/i);
  });

  it('names the findings it deliberately does not carry', () => {
    // Seeded, not back-filled, by the owner's decision of 2026-09-12. The six
    // are named so their absence is a record rather than a gap.
    for (const excluded of ['KR-01', 'KR-02', 'KR-04', 'KR-05', 'KS4-05', 'KS4-06']) {
      expect(source, `the register does not say why ${excluded} is absent`).toContain(excluded);
    }
  });

  it('does not read as though recording a gap had closed it', () => {
    // KR-03, KR-06, KR-07, KR-09 and KR-58 are recorded, not closed, and the
    // brief is explicit that the register must not suggest otherwise.
    const byId = new Map(rows.map((row) => [row.id, row]));
    for (const stillOpen of ['KR-03', 'KR-06', 'KR-07', 'KR-09']) {
      expect(byId.get(stillOpen)?.status, `${stillOpen} is not recorded as open`).toBe('open');
    }
    expect(byId.get('KR-58')?.status).toBe('caught_not_repaired');
  });
});
