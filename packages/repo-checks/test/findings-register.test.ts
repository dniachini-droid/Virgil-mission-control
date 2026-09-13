import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * **The findings register is read, so "never dropped" is checkable.**
 *
 * `docs/process/GATE_PROOF_AND_FINDINGS_BRIEF.md`, finding **XR-02**.
 * `constitution/REVIEW_POLICY.md` requires that findings are *"never renumbered,
 * merged silently or dropped"*, and `docs/process/PHASE_1_BACKLOG.md` already
 * recorded that they were: *"no file in the repository holds its text."*
 *
 * **What this file does not do: claim the register is complete.** No check can
 * know about a finding nobody wrote down, and a completeness rule would force
 * back-filled guesses into the register to make the suite green — the exact
 * failure it exists to prevent. What is checkable is that every row *in* it is
 * well-formed, points at text that exists, and cannot quietly change or leave.
 *
 * **Three reviews have attacked this file and each found a way past it.** The
 * guards below are in the order they were forced to exist:
 *
 *  - `KXR-02` — four rows deleted, suite green at 40 passed.
 *  - `KXR-06` — one row's status flipped from `open` to `repaired`, green at 78.
 *  - `KXR-09` — all twenty detectors flipped from `review` to `gate`, green at 91.
 *  - `KXR-10` — every row repointed at this register, green; and ids matched as
 *    substrings, so a file naming only `KXR-01` satisfied `XR-01`.
 *  - `KXR-11` — a finding in a table headed anything but `id` seen by nothing.
 *
 * Each was reproduced before being repaired. That is the pattern this file is
 * for: a guard nobody has seen fail is the same class of thing as the eight
 * gates `XR-01` was about.
 */

const root = resolve(import.meta.dirname, '../../..');
const REGISTER = 'docs/process/FINDINGS.md';
const source = readFileSync(resolve(root, REGISTER), 'utf8');

const STATUSES = [
  'open',
  'repaired',
  'accepted',
  'deferred',
  'caught_not_repaired',
  'by_design',
  'withdrawn_gap_open',
] as const;

/**
 * A deterministic gate, a review, the owner looking at the thing, or the
 * session building it.
 *
 * **`builder` was added on 2026-09-13 — `OD-0017`.** Four findings a building
 * session raised against its own contract had nowhere to go: not a gate, not a
 * review, not the owner, and filing them under `review` would have made the
 * register's most load-bearing column say a review caught what no review had
 * seen. They sat in a run record instead, which is `XR-02` in miniature.
 *
 * It is the weakest detector here and the register says so: a `builder` row is
 * a session's account of its own work.
 */
const DETECTORS = ['gate', 'review', 'owner', 'builder'] as const;

/**
 * Findings inherited from earlier reviews, whose records state neither severity
 * nor reproduction anywhere. Exempt from the five-attribute rule because the
 * only way to comply would be to invent the missing three.
 *
 * **The list is closed.** A new id is not exempt, and nothing here can add to it.
 */
const INCOMPLETE_BY_INHERITANCE = new Set([
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
]);

interface Row {
  id: string;
  status: string;
  foundBy: string;
  what: string;
  where: string;
  line: number;
}

interface Attributes {
  id: string;
  severity: string;
  surface: string;
  reproduction: string;
  authority: string;
  line: number;
}

const REGISTER_HEAD = ['id', 'status', 'found by', 'what', 'where its text is'];
const ATTRIBUTES_HEAD = [
  'id',
  'severity',
  'affected surface',
  'reproduction',
  'criterion or authority',
];

/**
 * Every table in the register, read as data — **`KXR-11`**.
 *
 * The first version entered a table only when it saw a header beginning `id`
 * and left at the first non-pipe line, so a finding recorded in any other table
 * was invisible to every check below. A register with a blind spot is worse
 * than a shorter register: the row is there, a reader counts it, and nothing
 * holds it to anything.
 *
 * So every table is read and each must be one of the two this file knows. An
 * unrecognised table is a failure rather than a shrug, because the next one
 * somebody adds will hold findings too.
 */
export function tablesOf(markdown: string): { head: string[]; cells: string[][]; line: number }[] {
  const out: { head: string[]; cells: string[][]; line: number }[] = [];
  let open: { head: string[]; cells: string[][]; line: number } | null = null;
  for (const [index, raw] of markdown.split('\n').entries()) {
    const line = raw.trim();
    if (!line.startsWith('|') || !line.endsWith('|')) {
      if (open) out.push(open);
      open = null;
      continue;
    }
    const cells = line
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim());
    if (/^[\s|:-]+$/.test(line.slice(1, -1))) continue;
    if (open === null) open = { head: cells, cells: [], line: index + 1 };
    else open.cells.push(cells);
  }
  if (open) out.push(open);
  return out;
}

const allTables = tablesOf(source);
/**
 * **`KXR-13`: `find` takes the first and ignores the rest.** A second table with
 * the register's exact header was read by nothing — a finding false in every
 * cell sat inside one and the suite stayed green at 125 — while `KXR-11`'s check
 * passed it, because its header *is* recognised. Duplicates are refused below.
 */
const registerTables = allTables.filter((t) => t.head.join('|') === REGISTER_HEAD.join('|'));
const attributesTables = allTables.filter((t) => t.head.join('|') === ATTRIBUTES_HEAD.join('|'));
const registerTable = registerTables[0];
const attributesTable = attributesTables[0];

const malformed: { line: number; text: string }[] = [];
const rows: Row[] = [];
for (const cells of registerTable?.cells ?? []) {
  if (cells.length !== 5) {
    malformed.push({ line: registerTable?.line ?? 0, text: cells.join(' | ') });
    continue;
  }
  rows.push({
    id: cells[0] as string,
    status: cells[1] as string,
    foundBy: cells[2] as string,
    what: cells[3] as string,
    where: cells[4] as string,
    line: registerTable?.line ?? 0,
  });
}
const attributes: Attributes[] = (attributesTable?.cells ?? [])
  .filter((cells) => cells.length === 5)
  .map((cells) => ({
    id: cells[0] as string,
    severity: cells[1] as string,
    surface: cells[2] as string,
    reproduction: cells[3] as string,
    authority: cells[4] as string,
    line: attributesTable?.line ?? 0,
  }));

/**
 * **Every cell of every row, held in place — `KXR-06` then `KXR-09`.**
 *
 * The first version pinned ids, so a row could not be deleted but could be
 * closed. The second pinned the status, so a row could not be closed but its
 * *detector* could be rewritten — and the final review flipped all twenty from
 * `review` to `gate`, which would have this register assert that the gate
 * engine caught every finding in a repository whose engine
 * `ENFORCEMENT_BOUNDARIES.md` records as having no adapters. The register calls
 * that column *"the point of the register rather than a decoration on it"*. It
 * was false in the one direction the column exists to detect.
 *
 * **The summary is pinned by digest rather than by copy**, deliberately: a
 * literal copy here would be a second register, free to drift from the first,
 * and reviewers would have two texts and no way to know which is the finding.
 * A digest cannot be read, so the failure message prints what the register says
 * now and what changed.
 */
const PINNED: Record<
  string,
  { status: (typeof STATUSES)[number]; foundBy: string; where: string; what: string }
> = {
  'KR-03': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/architecture/ENFORCEMENT_BOUNDARIES.md',
    what: '70b40875d28a',
  },
  'KR-06': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/architecture/ENFORCEMENT_BOUNDARIES.md',
    what: '21e3d2368f62',
  },
  'KR-07': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/architecture/ENFORCEMENT_BOUNDARIES.md',
    what: '39f625aacae9',
  },
  'KR-09': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/architecture/ENFORCEMENT_BOUNDARIES.md',
    what: '7d97f086412e',
  },
  'KR-58': {
    status: 'caught_not_repaired',
    foundBy: 'review',
    where: 'docs/architecture/ENFORCEMENT_BOUNDARIES.md',
    what: '1c21be1c65e9',
  },
  'KP2-08': {
    status: 'accepted',
    foundBy: 'review',
    where: 'docs/architecture/ENFORCEMENT_BOUNDARIES.md',
    what: '0ba44f04dea0',
  },
  'KP2-11': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/architecture/ENFORCEMENT_BOUNDARIES.md',
    what: 'ab6e31bce85a',
  },
  'KP2-14': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/architecture/ENFORCEMENT_BOUNDARIES.md',
    what: '97df22c96dd6',
  },
  'KP3-06': {
    status: 'deferred',
    foundBy: 'review',
    where: 'docs/architecture/ENFORCEMENT_BOUNDARIES.md',
    what: 'ed410030ed31',
  },
  'KP3-11': {
    status: 'by_design',
    foundBy: 'review',
    where: 'docs/architecture/ENFORCEMENT_BOUNDARIES.md',
    what: 'fbeb15746aee',
  },
  'XR-01': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/FOUNDATION_REPAIR_RUN_RECORD.md',
    what: 'd018923aca3a',
  },
  'XR-02': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/FOUNDATION_REPAIR_RUN_RECORD.md',
    what: '75d17998d35d',
  },
  'KXR-01': {
    status: 'withdrawn_gap_open',
    foundBy: 'review',
    where: 'docs/process/FOUNDATION_REPAIR_RUN_RECORD.md',
    what: '25588d3c6886',
  },
  'KXR-02': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/FOUNDATION_REPAIR_RUN_RECORD.md',
    what: '5bf53df43364',
  },
  'KXR-03': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/FOUNDATION_REPAIR_RUN_RECORD.md',
    what: '00d2127e0533',
  },
  'KXR-04': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/FOUNDATION_REPAIR_RUN_RECORD.md',
    what: 'c15bd0b0191c',
  },
  'KXR-05': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/FOUNDATION_REPAIR_RUN_RECORD.md',
    what: '3df893022f8d',
  },
  'KXR-06': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/FOUNDATION_REPAIR_RUN_RECORD.md',
    what: '7e38bc2590b4',
  },
  'KXR-07': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/FOUNDATION_REPAIR_RUN_RECORD.md',
    what: 'eb980fe5f5bb',
  },
  'KXR-08': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/FOUNDATION_REPAIR_RUN_RECORD.md',
    what: '99d68c278554',
  },
  'KXR-09': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_FINAL_REVIEW_GATE_PROOF_AND_FINDINGS.md',
    what: 'bb2ed8d62c15',
  },
  'KXR-10': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_FINAL_REVIEW_GATE_PROOF_AND_FINDINGS.md',
    what: '4a8c1aab5d98',
  },
  'KXR-11': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_FINAL_REVIEW_GATE_PROOF_AND_FINDINGS.md',
    what: '53baa92a3c02',
  },
  'KXR-12': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_FINAL_REVIEW_GATE_PROOF_AND_FINDINGS.md',
    what: 'c11ef2dae566',
  },
  'KXR-13': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_RECORD_KEEPING_REVIEW.md',
    what: 'fd1b7efad5cc',
  },
  'KXR-14': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_RECORD_KEEPING_REVIEW.md',
    what: '8107c97c0192',
  },
  'KXR-15': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_RECORD_KEEPING_REVIEW.md',
    what: 'ff244e48570f',
  },
  'KXR-16': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_RECORD_KEEPING_REVIEW.md',
    what: 'feaebec894b0',
  },
  'KXR-17': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_RECORD_KEEPING_REVIEW.md',
    what: '23a010a3e32d',
  },
  'KXR-19': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR11_UNREVIEWED_COMMITS_REVIEW.md',
    what: '4afc95d25502',
  },
  'KXR-20': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR11_UNREVIEWED_COMMITS_REVIEW.md',
    what: 'bf198acc04ed',
  },
  'KXR-21': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR11_UNREVIEWED_COMMITS_REVIEW.md',
    what: '5e2f0df36b1d',
  },
  'KXR-22': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR11_UNREVIEWED_COMMITS_REVIEW.md',
    what: 'f799f16fcc4d',
  },
  'KXR-18': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR11_UNREVIEWED_COMMITS_REVIEW.md',
    what: '4a8fc993b963',
  },
  'KXR-23': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR11_REREVIEW_OD0016.md',
    what: '3c6f1776e89f',
  },
  'KXR-24': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR11_REREVIEW_OD0016.md',
    what: '9fa8b562f70d',
  },
  'KXR-25': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR11_REREVIEW_OD0016.md',
    what: '107862b606e5',
  },
  'KXR-26': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR11_REREVIEW_OD0016.md',
    what: '3727fb3a2178',
  },
  'KXR-27': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR11_REREVIEW_OD0016.md',
    what: 'f107115f2cec',
  },
  'KXR-28': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR11_REREVIEW_OD0016.md',
    what: '9e58b80d3c01',
  },
  'KXR-29': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR14_REVIEW.md',
    what: 'f70a64b85a4a',
  },
  'KXR-30': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR14_REVIEW.md',
    what: '30ec9c8e3c93',
  },
  'KXR-31': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR14_REVIEW.md',
    what: '1517b926b9a3',
  },
  'KXR-38': {
    status: 'repaired',
    foundBy: 'gate',
    where: 'docs/process/CACHE_GUARD_RECORD.md',
    what: 'ed8d6508df17',
  },
  'KXR-43': {
    status: 'open',
    foundBy: 'owner',
    where: 'docs/process/OWNER_TODO.md',
    what: '7b1ce902e597',
  },
  // The first findings a building session raised against its own contract —
  // OD-0017. `repaired` on four of them means repaired on the same branch by
  // the same session, which the register says plainly is not evidence.
  'BR-01': {
    status: 'repaired',
    foundBy: 'builder',
    where: 'docs/process/KNOWLEDGE_LESSONS_RUN_RECORD.md',
    what: '9445b7995ca1',
  },
  'BR-02': {
    status: 'repaired',
    foundBy: 'builder',
    where: 'docs/process/KNOWLEDGE_LESSONS_RUN_RECORD.md',
    what: '074175d4014a',
  },
  'BR-03': {
    status: 'repaired',
    foundBy: 'builder',
    where: 'docs/process/KNOWLEDGE_LESSONS_RUN_RECORD.md',
    what: '9cfd23dd9225',
  },
  'BR-04': {
    status: 'repaired',
    foundBy: 'builder',
    where: 'docs/decisions/OD-0017-knowledge-lessons-follow-up.md',
    what: '9634d18871d8',
  },
  'BR-05': {
    status: 'open',
    foundBy: 'builder',
    where: 'docs/decisions/OD-0017-knowledge-lessons-follow-up.md',
    what: '447692f247d1',
  },
  // The twenty-four findings of 2026-09-13, filed together on
  // `claude/file-the-findings`. Seven reviews across five pull requests, whose
  // text lived only in comments until the reviews were captured into
  // `docs/process/`. Ids are qualified by document on the owner's resolution of
  // that day; nothing already filed is renumbered.
  'KXR-51/PR24': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR24_REVIEW.md',
    what: '502811494ea3',
  },
  'KXR-44/PR26': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR26_REVIEW.md',
    what: '5313a261c24e',
  },
  'KXR-45/PR26': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR26_REVIEW.md',
    what: 'b4205cea080a',
  },
  'KXR-46/PR26': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR26_REVIEW.md',
    what: '17fb0a26039f',
  },
  'KXR-47/PR26': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR26_REVIEW.md',
    what: 'e097f13be786',
  },
  'KXR-48/PR26': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR26_REVIEW.md',
    what: '8725ef0c28d1',
  },
  'KXR-49/PR26': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR26_REVIEW.md',
    what: 'a425c59e4f17',
  },
  'KXR-50/PR26': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR26_REVIEW.md',
    what: '2493e0ad56b3',
  },
  'KXR-47/PR27': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR27_REVIEW.md',
    what: 'bfdaa4a48326',
  },
  'KXR-48/PR27': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR27_REVIEW.md',
    what: '66e49aca735c',
  },
  'KXR-49/PR27': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR27_REVIEW.md',
    what: 'c5e3d19dd8e0',
  },
  'KXR-50/PR27': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR27_REVIEW.md',
    what: 'd4374041451e',
  },
  'KXR-51/PR27': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR27_REREVIEW.md',
    what: '012406ae4a4c',
  },
  'KXR-52/PR27': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR27_REREVIEW.md',
    what: '08a791012a74',
  },
  'KXR-53/PR28': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR28_REVIEW.md',
    what: '1347bf93b11a',
  },
  'KXR-54/PR28': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR28_REVIEW.md',
    what: '53bf094defbf',
  },
  'KXR-55/PR28': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR28_REVIEW.md',
    what: '2dc65520cf78',
  },
  'KXR-56/PR28': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR28_REVIEW.md',
    what: 'f3e74f037d6b',
  },
  'KXR-60/PR28': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR28_REREVIEW.md',
    what: '4d0b437ecfa5',
  },
  'KXR-61/PR28': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR28_REREVIEW.md',
    what: '551f3a9272f4',
  },
  'KXR-62/PR28': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR28_REREVIEW.md',
    what: 'e1ba6498a327',
  },
  'KXR-63/PR28': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR28_REREVIEW.md',
    what: '0e9a5153e9e2',
  },
  'KXR-57/PR30': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR30_REVIEW.md',
    what: '7bf0dc8307c1',
  },
  'KXR-58/PR30': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR30_REVIEW.md',
    what: '76e5a8605389',
  },

  /**
   * **The eleven of the two reviews of #32 and the one review of #33.**
   *
   * `KXR-70/PR32` and `KXR-71/PR32` were raised BLOCKING on `8ba4452`, repaired
   * on `6e7c6b3`, and the final reviewer replayed both attacks and reported
   * both closed. `repaired` is that reviewer's finding, not this session's.
   * Every other status here is `open`, and each was checked against the tree
   * at `f2aa068` rather than assumed: the sentence `KXR-80/PR32` names is still
   * at `handoff.ts:150-155`, the message `KXR-74/PR32` names is still at
   * `handoff.test.ts:343`, and the two claims `KXR-73/PR32` and `KXR-82/PR32`
   * name are still in #32's description.
   *
   * `KXR-75/PR33` and `KXR-76/PR33` are `repaired` by the commit that files
   * them — the pin below in `review-records.test.ts`, and the re-stamped plan.
   * The register says what that is worth: a repair on the same branch as its
   * finding has not been independently reviewed.
   */
  'KXR-70/PR32': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR32_REVIEW.md',
    what: 'd849cbd953fd',
  },
  'KXR-71/PR32': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR32_REVIEW.md',
    what: '0f8620268cf9',
  },
  'KXR-72/PR32': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR32_REVIEW.md',
    what: '7a4bfc0554f6',
  },
  'KXR-73/PR32': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR32_REVIEW.md',
    what: 'f0b4d3cdd314',
  },
  'KXR-74/PR32': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR32_REVIEW.md',
    what: 'd38c5443e68a',
  },
  'KXR-80/PR32': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR32_REREVIEW.md',
    what: '4cd25e270a6a',
  },
  'KXR-81/PR32': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR32_REREVIEW.md',
    what: 'ad51f4bd7ac7',
  },
  'KXR-82/PR32': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR32_REREVIEW.md',
    what: '9c36e8b85648',
  },
  'KXR-75/PR33': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR33_REVIEW.md',
    what: 'e3c2dcb0866b',
  },
  'KXR-76/PR33': {
    status: 'repaired',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR33_REVIEW.md',
    what: '24c6a5bd3815',
  },
  'KXR-77/PR33': {
    status: 'open',
    foundBy: 'review',
    where: 'docs/process/KEEPER_PR33_REVIEW.md',
    what: '383a4a5a64dd',
  },
};

/**
 * **The attributes, pinned too — `KXR-14`, raised twice and repaired once.**
 *
 * `KXR-03` added severity, affected surface, reproduction and the authority
 * concerned, because `REVIEW_POLICY.md` requires all five of a finding and the
 * register carried two. `PINNED` above covers the register table's cells and
 * never covered these. Two reviewers ran the same attack — replace a severity
 * and erase its reproduction — and the suite stayed green both times. The
 * second noted that the first's repair was recorded as `repaired` while its own
 * recorded reproduction still succeeded.
 *
 * A severity is the column that decides whether a finding waits or stops the
 * work, and a reproduction is the only thing that makes a finding checkable by
 * somebody who was not there. Both were free to be rewritten.
 *
 * The four cells are hashed together rather than one at a time: what matters is
 * that the row has not changed, and a reader needs the row rather than which
 * quarter of it moved. The failure message prints what it says now.
 */
const PINNED_ATTRIBUTES: Record<string, string> = {
  'XR-01': '5a055f55eb66',
  'XR-02': '66c763fb72be',
  'KXR-01': '4ad9866eaf2b',
  'KXR-02': '0495cc80d0f2',
  'KXR-03': '81823ca7e588',
  'KXR-04': 'a3812294a65f',
  'KXR-05': 'a335d486153d',
  'KXR-06': 'df1bfd15336b',
  'KXR-07': '79778bc1e117',
  'KXR-08': '27e761e38454',
  'KXR-09': '3f9c4cbc8201',
  'KXR-10': 'fde46610bf92',
  'KXR-11': 'df4f9872b72b',
  'KXR-12': 'ccad6481181b',
  'KXR-13': '52698a0bef1e',
  'KXR-14': '50eef525a500',
  'KXR-15': '645ce32592ac',
  'KXR-16': '236cf653ba9a',
  'KXR-17': '762a12fdf052',
  'KXR-19': 'fb1255c2fad4',
  'KXR-20': '9fcab2ba6aae',
  'KXR-21': '8f19f5852084',
  'KXR-22': 'fa0d964548df',
  'KXR-18': 'c4ac76e33bc2',
  'KXR-23': 'c853ff608fd0',
  'KXR-24': '1e7e5939cda9',
  'KXR-25': '7ffd9d9e72ee',
  'KXR-26': 'b8eabfd704b9',
  'KXR-27': '9f5bb42f4431',
  'KXR-28': '9ae098419c28',
  'KXR-29': '007d32aae3ea',
  'KXR-30': '04570f1156e5',
  'KXR-31': 'c269b3ae1731',
  'KXR-38': '87f779b24970',
  'KXR-43': '9199fb088d10',
  // Re-pinned on 2026-09-13: BR-01's affected surface named
  // `apps/mission-control/e2e/mutation-manifest.ts` and the application's
  // vitest config, both deleted from `main` by pull requests #21 and #22. The
  // row now names the manifest as it stood at `a182b196`, which is where a
  // reader can still find it. The finding is unchanged; only where to look is.
  'BR-01': 'f824e6456954',
  'BR-02': 'cb83161b8df8',
  'BR-03': 'ce5fb4abac64',
  'BR-04': '25808c6209e1',
  'BR-05': '03463c057508',
  // The twenty-four of 2026-09-13; see the note in PINNED above.
  'KXR-51/PR24': 'c3d7452742ec',
  'KXR-44/PR26': '112087ab99c6',
  'KXR-45/PR26': '32947be053f0',
  'KXR-46/PR26': '88d3ec15df6e',
  'KXR-47/PR26': '48884eb7c3ac',
  'KXR-48/PR26': '5c0a53548e1a',
  'KXR-49/PR26': '61fe50441a7a',
  'KXR-50/PR26': '379f6d6390b8',
  'KXR-47/PR27': '2221c20b82b4',
  'KXR-48/PR27': '23522e4728cf',
  'KXR-49/PR27': '0683853ed98e',
  'KXR-50/PR27': '833b68f8992f',
  'KXR-51/PR27': 'a0fc9b9ec1b4',
  'KXR-52/PR27': 'c084ceb91c0a',
  'KXR-53/PR28': 'f4b305fc4c7f',
  'KXR-54/PR28': 'bc6504889591',
  'KXR-55/PR28': '6c34668d76a8',
  'KXR-56/PR28': 'bae8275ccb90',
  'KXR-60/PR28': '2c45979eee45',
  'KXR-61/PR28': '2844f9d785f1',
  'KXR-62/PR28': '6be786cf892d',
  'KXR-63/PR28': 'd3aee9076a86',
  'KXR-57/PR30': '9dd3ca6248e9',
  'KXR-58/PR30': 'da120c038bf1',
  // The eleven of 2026-09-13's two reviews of #32 and one review of #33. The
  // two reviews of #32 graded on a high/medium/low scale where every other
  // review here used major/moderate/minor; the words below are theirs and no
  // mapping was applied, because a mapping would be this session's judgement.
  // The register says so under the attributes table.
  'KXR-70/PR32': '14a7f001b4fe',
  'KXR-71/PR32': '587067650c06',
  'KXR-72/PR32': 'bd36407ace0b',
  'KXR-73/PR32': '5dd836aa51c1',
  'KXR-74/PR32': '3a28d7f62baa',
  'KXR-80/PR32': '8bae47550606',
  'KXR-81/PR32': '297dd1ee343a',
  'KXR-82/PR32': 'e38feaf92271',
  'KXR-75/PR33': 'fc2265c2c148',
  'KXR-76/PR33': 'db484945e6ea',
  'KXR-77/PR33': '750d9083cb05',
};

const digest = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 12);

/** Whole-id matching — **`KXR-10`**. `KXR-01` must not satisfy `XR-01`. */
function names(text: string, id: string): boolean {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![A-Za-z0-9-])${escaped}(?![A-Za-z0-9-])`).test(text);
}

describe('the findings register is a register', () => {
  it('has rows, or every assertion below is vacuous', () => {
    expect(registerTable, 'the register table is missing or its header changed').toBeDefined();
    expect(rows.length, 'the register has no rows').toBeGreaterThan(0);
  });

  it('has no row the reader can see and the check cannot', () => {
    expect(
      malformed,
      `rows in the register that do not parse: ${malformed.map((m) => m.text).join('; ')}`,
    ).toEqual([]);
  });

  it('has exactly one register table and one attributes table', () => {
    // KXR-13. Two tables with the same header is not a formatting choice: it is
    // a second register nothing reads.
    expect(registerTables.length, 'the register table appears more than once').toBe(1);
    expect(attributesTables.length, 'the attributes table appears more than once').toBe(1);
  });

  it('has no table the checks do not enter', () => {
    // KXR-11. A finding recorded in an unrecognised table is a finding nothing
    // holds to anything, and the next table somebody adds will hold findings too.
    const strangers = allTables
      .filter(
        (t) =>
          t.head.join('|') !== REGISTER_HEAD.join('|') &&
          t.head.join('|') !== ATTRIBUTES_HEAD.join('|'),
      )
      .map((t) => `line ${t.line}: ${t.head.join(' | ')}`);
    expect(strangers, `tables in the register no check reads: ${strangers.join('; ')}`).toEqual([]);
  });

  it('gives every finding a stable identity, used once', () => {
    const seen = new Set<string>();
    const repeated: string[] = [];
    for (const row of rows) {
      if (seen.has(row.id)) repeated.push(row.id);
      else seen.add(row.id);
      expect(row.id, 'a row has no id').not.toBe('');
    }
    expect(repeated, `ids used more than once: ${repeated.join(', ')}`).toEqual([]);
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
      expect(STATUSES as readonly string[], `${row.id} claims status "${row.status}"`).toContain(
        row.status,
      );
    });

    it(`${row.id} says what found it, in the vocabulary`, () => {
      expect(
        DETECTORS as readonly string[],
        `${row.id} claims it was found by "${row.foundBy}"`,
      ).toContain(row.foundBy);
    });
  }

  it('the vocabularies the register states are the vocabularies enforced here', () => {
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
    const described = [...source.matchAll(/^- \`([a-z_]+)\` —/gm)].map((m) => m[1] as string);
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
    it(`${row.id}'s pointer is a file in this repository, and is not this register`, () => {
      // KXR-10. Every row trivially contains its own id, so the register
      // satisfies its own pointer check — twenty rows repointed here passed.
      expect(row.where, `${row.id} points at the register itself, which proves nothing`).not.toBe(
        REGISTER,
      );
      expect(
        existsSync(resolve(root, row.where)),
        `${row.id} points at ${row.where}, which is not in this repository`,
      ).toBe(true);
    });

    it(`${row.id}'s pointer names ${row.id}, as a whole id`, () => {
      const path = resolve(root, row.where);
      if (!existsSync(path)) return;
      expect(
        names(readFileSync(path, 'utf8'), row.id),
        `${row.where} does not mention ${row.id} as a whole id`,
      ).toBe(true);
    });
  }
});

describe('no finding leaves the register quietly, or is quietly rewritten', () => {
  const byId = new Map(rows.map((row) => [row.id, row]));

  it('still carries every finding it has ever carried', () => {
    const gone = Object.keys(PINNED).filter((id) => !byId.has(id));
    expect(
      gone,
      `findings dropped from the register: ${gone.join(', ')}. REVIEW_POLICY.md: findings are never renumbered, merged silently or dropped. If one genuinely should go, delete it from PINNED in the same commit so the removal is in the diff.`,
    ).toEqual([]);
  });

  it('has a row for everything pinned, and pins everything it has', () => {
    const unpinned = rows.map((row) => row.id).filter((id) => !(id in PINNED));
    expect(unpinned, `rows nothing holds in place: ${unpinned.join(', ')}`).toEqual([]);
  });

  it('does not let any cell of a row change with nothing recording it', () => {
    // KXR-06 then KXR-09: the status, then the other three. A row has four cells
    // that say something and all four are claims.
    const changed: string[] = [];
    for (const [id, pin] of Object.entries(PINNED)) {
      const row = byId.get(id);
      if (!row) continue;
      if (row.status !== pin.status)
        changed.push(`${id} status: pinned ${pin.status}, register says ${row.status}`);
      if (row.foundBy !== pin.foundBy)
        changed.push(`${id} detector: pinned ${pin.foundBy}, register says ${row.foundBy}`);
      if (row.where !== pin.where)
        changed.push(`${id} pointer: pinned ${pin.where}, register says ${row.where}`);
      if (digest(row.what) !== pin.what) changed.push(`${id} summary rewritten to: "${row.what}"`);
    }
    expect(
      changed,
      `cells changed with nothing recording it: ${changed.join('; ')}. Each is a claim. Changing one means editing PINNED in the same commit, so the change is in the diff.`,
    ).toEqual([]);
  });
});

describe('a finding recorded from 2026-09-12 carries what REVIEW_POLICY requires', () => {
  it('does not let an attributes row be rewritten with nothing recording it', () => {
    // KXR-14. Gutting a row — severity replaced, reproduction erased — passed
    // green for two reviews running.
    const changed: string[] = [];
    for (const entry of attributes) {
      const pinned = PINNED_ATTRIBUTES[entry.id];
      if (pinned === undefined) {
        changed.push(`${entry.id} has an attributes row that nothing pins`);
        continue;
      }
      const now = digest(
        [entry.severity, entry.surface, entry.reproduction, entry.authority].join('|'),
      );
      if (now !== pinned) {
        changed.push(
          `${entry.id} now reads severity "${entry.severity}", reproduction "${entry.reproduction.slice(0, 60)}"`,
        );
      }
    }
    expect(
      changed,
      `attributes changed with nothing recording it: ${changed.join('; ')}. A severity decides whether a finding waits or stops the work, and a reproduction is what makes it checkable by somebody who was not there.`,
    ).toEqual([]);
  });

  const byId = new Map(attributes.map((a) => [a.id, a]));

  it('has an attributes table at all', () => {
    expect(attributesTable, 'the attributes table is missing or its header changed').toBeDefined();
    expect(attributes.length).toBeGreaterThan(0);
  });

  for (const row of rows.filter((r) => !INCOMPLETE_BY_INHERITANCE.has(r.id))) {
    it(`${row.id} states its severity, surface, reproduction and authority`, () => {
      const entry = byId.get(row.id);
      expect(
        entry,
        `${row.id} has no attributes row, and is not one of the ten exempt`,
      ).toBeDefined();
      if (!entry) return;
      for (const [name, value] of [
        ['severity', entry.severity],
        ['affected surface', entry.surface],
        ['reproduction', entry.reproduction],
        ['criterion or authority', entry.authority],
      ] as const) {
        expect(value.length, `${row.id} states no ${name}`).toBeGreaterThan(3);
        expect(value, `${row.id}'s ${name} is a dash, which is not an answer`).not.toBe('—');
      }
    });
  }

  it('does not quietly widen the list of findings exempt from the rule', () => {
    // The exemption exists because ten inherited findings state nothing to copy.
    // It is a closed list, and a growing one would be the rule repealing itself.
    expect(INCOMPLETE_BY_INHERITANCE.size).toBe(10);
    for (const id of INCOMPLETE_BY_INHERITANCE) {
      expect(source, `the register does not name ${id} as exempt and incomplete`).toContain(id);
    }
  });

  it('attributes nothing to a finding the register does not carry', () => {
    const ids = new Set(rows.map((r) => r.id));
    const orphans = attributes.map((a) => a.id).filter((id) => !ids.has(id));
    expect(
      orphans,
      `attributes rows for findings not in the register: ${orphans.join(', ')}`,
    ).toEqual([]);
  });
});

describe('what the register honestly is not', () => {
  it('says plainly that it is not complete', () => {
    expect(source).toMatch(/does not claim to be complete/i);
  });

  it('names the findings it deliberately does not carry', () => {
    for (const excluded of ['KR-01', 'KR-02', 'KR-04', 'KR-05', 'KS4-05', 'KS4-06']) {
      expect(source, `the register does not say why ${excluded} is absent`).toContain(excluded);
    }
  });

  it('does not read as though recording a gap had closed it', () => {
    const byId = new Map(rows.map((row) => [row.id, row]));
    for (const stillOpen of ['KR-03', 'KR-06', 'KR-07', 'KR-09', 'KXR-03', 'KXR-07']) {
      expect(byId.get(stillOpen)?.status, `${stillOpen} is not recorded as open`).toBe('open');
    }
    expect(byId.get('KR-58')?.status).toBe('caught_not_repaired');
  });
});
