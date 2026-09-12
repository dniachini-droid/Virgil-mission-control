# Foundation repair run record — gate refusals and the findings register

**Brief:** `docs/process/GATE_PROOF_AND_FINDINGS_BRIEF.md`, committed verbatim at `e6c11c3` before any work began.
**Branch:** `claude/virgil-foundation-repair`, from `main` at `91409d0`.
**Reviewed candidate:** `8b725b533d0b8192d176d0b112f5b6f27b01cc4e`.
**Review:** `PASS_WITH_NON_BLOCKING_FINDINGS`, by a session that did not build this, on branch `claude/keeper-virgil-review-qu3pvr` at `5edc9ff`. Its full text is on that branch; what follows summarises it and is not a substitute for reading it.

This record exists because the brief required one and its own permitted-paths list did not include a path for it. That contradiction was reported rather than resolved quietly, and the owner authorised this path on 2026-09-12. The Keeper raised the same gap independently as `KXR-04`.

## A note on what this document is

It is written by the session that did the building. `CLAUDE.md`: a builder's success report is not evidence. Everything below is quoted output that a reader can reproduce, and the review that matters was run by somebody else.

## The brief's four proofs

### 1. The suite passes

`pnpm check` — biome lint, typecheck and unit tests across the workspace — exit 0 on the candidate. The reviewer confirmed it green in CI on the candidate SHA (run `34686942947`: lint, typecheck and tests all success) and again in a clean worktree: 1,725 tests across 36 files.

### 2. Delete one gate's refusal case, and the suite fails naming that gate

Deleted the `working_tree_clean` case from `packages/gate-engine/test/refusals.test.ts`:

```
× every gate in the engine has a case above, named
× there is exactly one case per gate, and the counts agree

AssertionError: these gates have never been observed refusing anything:
working_tree_clean: expected [ 'working_tree_clean' ] to deeply equal []

AssertionError: the number of cases is not the number of gates:
expected 19 to be 20

Tests  2 failed | 21 passed (23)
```

Restored: 43 passed.

**The reviewer did not replay this.** It deleted a different case — `commit_and_push_complete` — and got the same two assertions and the same `2 failed | 21 passed (23)`. It then tested the half a deletion cannot reach, by **adding a twenty-first gate with no case**, and confirmed that fails by name too. That is the direction that matters for the future: the guard exists so that a gate added later cannot arrive unexamined.

### 3. A bad row in the register fails, on both counts

Added one row with a detector outside the vocabulary and a pointer to a file that does not exist:

```
× XX-99 says what found it, in the vocabulary
× XX-99's pointer is a file in this repository

AssertionError: XX-99 (line 52) claims it was found by "a-hunch":
expected [ 'gate', 'review', 'owner' ] to include 'a-hunch'

AssertionError: XX-99 (line 52) points at
docs/process/A_FILE_THAT_DOES_NOT_EXIST.md, which is not in this
repository: expected false to be true

Tests  2 failed | 58 passed (60)
```

Restored: 56 passed.

The reviewer reproduced this to the character and then broke five further guards the register claims — a status outside the vocabulary, a pointer that does not name its own finding, a repeated id, an `open` row flipped to `repaired`, and the deletion of a pinned row. All failed correctly.

### 4. Count the gates

Twenty ids in `gateIds`, counted from the engine. Twenty refusal cases, one each, asserted on one line. The brief's premise was checked independently rather than taken on trust: at the base commit, exactly the eight gates it names appear in no `failingGates` array in `packages/test-fixtures/src/candidates.ts`.

Diff at the reviewed candidate: **+691 / −0** across four files. No gate logic touched. No test weakened or removed.

## The review's findings, and what was done about each

The owner approved the `KXR` prefix in the owner console on 2026-09-12. The reviewer proposed it and declined to mint it, for the same reason the builder should not have minted `XR`.

### KXR-01 — an owner approval asserted with no record behind it — repaired

`docs/process/FINDINGS.md` stated that the `XR` prefix *"was approved by the owner on 2026-09-12"*. No file in the repository supported that sentence. The owner **had** approved it, in the owner console, minutes earlier — but a reviewer can read only the repository, and there it was an unsupported claim, in the one file whose job is to be trusted, written by the session that benefited from it.

The owner was offered a filed decision record and chose to correct the sentence instead. It now says where the approval came from and that **no decision record is filed for it**, and points at `OD-0006`, which describes the mechanism that would close the gap and states its own cost: *"the owner reading their own decision records is the only detection of a false one."*

What remains true and is not repaired by this: none of the owner's decisions of 2026-09-12 — the `XR` prefix, the forward-only seeding, the branch name, the build-and-review split, the `KXR` prefix, this path — is filed as an `OD-*` record. That is the known cost of the `OD-0006` mechanism and not a new finding; it is written here so a reader does not have to infer it.

### KXR-02 — findings could be dropped in silence — repaired

The worst of the five, because it was the register's own stated purpose. The reviewer deleted four rows — including `XR-01` and `XR-02`, the two findings this branch itself raised — and the suite stayed **green at 40 passed**. Every other property of a row was checked; the one thing `REVIEW_POLICY.md` actually names was not.

Reproduced here before repairing it, with the same four rows and the same result. `PINNED` in `apps/mission-control/test/findings-register.test.ts` now names every id the register carries, in both directions: a pinned id missing from the table fails, and a row nothing pins fails. Removing a finding now means deleting a line from that list, in the diff, where a reviewer sees it.

Red before green:

```
× still carries every finding it has ever carried

AssertionError: findings dropped from the register: KP2-08, KP3-11,
XR-01, XR-02. REVIEW_POLICY.md: findings are never renumbered, merged
silently or dropped. If one genuinely should go, delete it from PINNED
in the same commit so the removal is in the diff.
```

### KXR-03 — the register carries two of the five required attributes — open, and recorded as open

`REVIEW_POLICY.md` requires that every finding has a stable identity, a severity, an affected surface, reproduction evidence and the acceptance criterion or authority it concerns. The register has an identity and a pointer.

**Not repaired, deliberately.** Adding those columns would mean inferring severity and reproduction evidence for ten historical findings whose text states neither — the back-filled guesses the forward-only rule exists to keep out, and the register's own stated failure mode. It is carried as `KXR-03`, `open`, in the register: a finding about that file, recorded in that file. Closing it properly is a decision about whether new findings must carry all five from now on, which is the owner's and is not taken here.

### KXR-04 — the proofs lived only in commit messages — repaired

This document. The brief asked for a run record and its permitted-paths list had no path for one; the contradiction was reported when it was found, and the owner authorised the path.

### KXR-05 — CI was red at an intermediate commit and the record did not say so — repaired

`57d7829` fails `biome check`: a formatting error in `packages/gate-engine/test/refusals.test.ts`, introduced by writing the file and committing it before the formatter ran. It was fixed in the candidate, and `pnpm check` passes there.

Confirmed rather than conceded — the file as committed at `57d7829` was extracted and checked on its own:

```
Found 1 error.
check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  × Some errors were emitted while running checks.
```

It is recorded because a branch whose history contains a red commit is a different thing from one whose history does not, and a record that omits it is choosing the flattering version.

## What this work did not do

- **It did not repair any open finding.** `KR-03`, `KR-06`, `KR-07`, `KR-09` and `KR-58` are recorded, not closed.
- **It did not change what any gate decides.** No file under `packages/gate-engine/src/` was edited. No gate turned out to be unable to refuse.
- **It did not claim the register is complete**, and no check can make it so. Six findings are deliberately unseeded and named in the register as absent.
- **It did not make this candidate safe to merge.** `constitution/STATE_LANGUAGE.md`: `PASS_WITH_NON_BLOCKING_FINDINGS` is not `SAFE_TO_MERGE`. Merging is the owner's, and nothing here is a recommendation to do it.

## Paths touched, against the brief's permitted list

| path | permitted by |
|---|---|
| `packages/gate-engine/test/refusals.test.ts` | the brief |
| `apps/mission-control/test/findings-register.test.ts` | the brief |
| `docs/process/FINDINGS.md` | the brief |
| `docs/process/GATE_PROOF_AND_FINDINGS_BRIEF.md` | the owner, who instructed that the brief be committed before the work |
| `docs/process/FOUNDATION_REPAIR_RUN_RECORD.md` | the owner, 2026-09-12, resolving the brief's own contradiction |

The last two are outside the brief's list and are named here so `diff_within_permitted_paths` has an answer rather than a surprise.
