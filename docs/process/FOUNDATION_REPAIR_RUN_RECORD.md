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

## The two findings this branch raised, stated here rather than only in the brief

`KXR-08`. `XR-01` and `XR-02` pointed at `GATE_PROOF_AND_FINDINGS_BRIEF.md`, which says of itself *"Status: proposed, not started. Nothing in this document is authority"* and still carries its three questions unanswered — because it is committed verbatim as the record of what was asked, and correcting it afterwards would destroy exactly what it is for. So the register cited, as the home of two findings' text, a document that disclaims being one. Both rows now point here.

**XR-01 — eight of twenty gates had never been observed refusing anything.** `packages/gate-engine/test/gates.test.ts` asserted that a harmless candidate raises no false blockers on any gate; nothing asserted the other direction. For `repository_allowlisted`, `working_tree_clean`, `branch_identity`, `approved_base_ancestry`, `commit_and_push_complete`, `required_checks_ran`, `deploy_authority` and `merge_authority`, a passing suite could not distinguish a gate that works from one that cannot fire. `ENFORCEMENT_BOUNDARIES.md` records that the engine has *"no evidence until Phase 2 adapters exist; today only fixtures feed it"* — so a gate no fixture refuses had never run its refusal path anywhere. Repaired by `packages/gate-engine/test/refusals.test.ts`, with the coverage enforced rather than remembered.

**XR-02 — findings had no single home.** `constitution/REVIEW_POLICY.md` requires that findings are *"never renumbered, merged silently or dropped"*, and `PHASE_1_BACKLOG.md` already recorded that they were: *"no file in the repository holds its text."* Answering "what is open right now?" meant assembling it by hand from six kinds of document. A policy that findings are never dropped is only as good as the one list that would show it if they were. Repaired by `docs/process/FINDINGS.md` and the check that reads it.

The brief remains the fuller statement of both, and remains unedited. It is the record of what was asked; this is the record of what was done.

## The re-review of `23af6ac`, and the three findings it raised

`PASS_WITH_NON_BLOCKING_FINDINGS`, by a third session — `claude/keeper-review-candidate-23af6acf-3ed0pw` at `5f932ab`. It confirmed `KXR-01` to `KXR-05` against what the candidate does rather than what its commit message says, and did not replay the builder's proofs: it deleted four different register rows, a third gate (`deploy_authority`), and independently confirmed the red CI run at `57d7829` (Actions run `34685933061`: lint failed, typecheck and tests skipped).

### KXR-06 — a finding could be declared over by a one-word edit — repaired

`PINNED` held ids alone, so it caught a row being **deleted** and not a row being **closed**. Changing `KXR-03` from `open` to `repaired` and nothing else left the suite green at 78 passed — and `KXR-03` is the row recording that the register carries two of the five attributes `REVIEW_POLICY.md` requires. The one row admitting the register's incompleteness could be marked closed in a word.

That is `KXR-02` one level up, and worse by a degree: a dropped row is missing and a silently closed one is still there to point at. Reproduced before repairing it. `PINNED` now maps each id to its status, and a third assertion fails when the register and the pin disagree. Closing a finding now costs an edit in the diff, exactly as dropping one does.

### KXR-07 — the permitted-paths contract is satisfied by trusting the candidate — open

Two of the five files in this branch's diff — the brief itself and this run record — are outside the brief's permitted-paths list. Both exceptions were declared rather than hidden, and one of them resolves a contradiction inside the contract (the brief requires a run record and permits no path for one). But the authority for both is prose written by the same sessions that took the exception, so `diff_within_permitted_paths` is currently satisfied by trusting the candidate about its own contract.

**Not repaired, because a session cannot repair it.** The authority is the owner's instruction in the owner console, which is outside this repository; writing a machine-readable exceptions list would convert "trust the prose" into "trust the list the same session wrote", which is the same claim in a new format. It is `KXR-01`'s family: the only thing that closes it is a filed decision record, and the owner was offered one and chose the corrected sentence instead. Recorded as `open`.

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
