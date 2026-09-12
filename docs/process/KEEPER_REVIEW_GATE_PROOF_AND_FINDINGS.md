# Keeper review — gate proof and findings register

**Verdict: `PASS_WITH_NON_BLOCKING_FINDINGS`.**

Candidate: `8b725b533d0b8192d176d0b112f5b6f27b01cc4e`, branch `claude/virgil-foundation-repair`.
Contract: `docs/process/GATE_PROOF_AND_FINDINGS_BRIEF.md`, as committed on that branch at `e6c11c3`.
Base: `91409d0` on `main`. Diff: four files, **+691 / -0**.
Reviewed: 2026-09-12.

All four of the brief's proofs hold, and I ran each of them myself rather than reading the commit messages' accounts of them. Both quoted red-before-green outputs on the branch reproduce. No gate logic is touched, no test is skipped, weakened or removed, and the diff deletes nothing. Five non-blocking findings follow; the first is about authority rather than code and only the owner can close it.

## Independence and admissibility

I did not build this candidate and have made no change to it. Verification ran in a detached worktree at the candidate SHA. Every mutation below was made to that worktree, run, and reverted; `git status --porcelain` returned empty after each, and the worktree's HEAD equals `origin/claude/virgil-foundation-repair`.

Against `constitution/REVIEW_POLICY.md`, "What review requires":

- **Deterministic verification completed for the SHA.** GitHub Actions run 34686942947 on `8b725b5`, job `lint, typecheck, tests`: `Lint` success, `Typecheck` success, `Tests` success. Not a session's own report.
- **The SHA is pushed and equal on local and remote.** `git rev-parse HEAD` and `git rev-parse origin/claude/virgil-foundation-repair` both return `8b725b533d0b8192d176d0b112f5b6f27b01cc4e`.
- **Diff within permitted paths.** Three of four files are inside the brief's list. The fourth is the brief itself; see Observation 1.
- **Every required check ran or is recorded as skipped with a reason.** On a push, `.github/workflows/checks.yml` runs the `fast` job only; `checks`, `verify-web`, `artifacts`, `verify-v11` and `reproducibility` carry `if: github.event_name != 'push'` and concluded `skipped`. The reason is stated at length in that file's own header — the Actions minutes exhausted on 2026-09-10. The brief's proof 1 asks for lint, typecheck and test, and those are exactly what the `fast` job runs.

So this is a review and not `INSUFFICIENT_EVIDENCE`.

## The brief's four proofs, checked

### Proof 1 — lint, typecheck and test pass on the candidate SHA, in CI

**Holds, twice over.**

In CI, on the candidate SHA, run by something with no stake in the answer: run 34686942947, all three steps `success`.

Independently, in this session, in a clean worktree at the SHA after `pnpm install --frozen-lockfile`:

```
biome check .  →  Checked 297 files in 273ms. No fixes applied.   (exit 0)
pnpm typecheck →  Tasks: 8 successful, 8 total                     (exit 0)
pnpm test      →  Test Files 36 passed (36) / Tests 1725 passed (1725)
                  Tasks: 6 successful, 6 total                     (exit 0)
```

### Proof 2 — delete one gate's refusal case and the suite fails, naming that gate

**Holds.** The branch's record quotes this with `working_tree_clean` deleted. I deleted a different one, `commit_and_push_complete`, so the result is not a replay of theirs:

```
FAIL  test/refusals.test.ts > every gate can refuse, and has been seen to >
      every gate in the engine has a case above, named
AssertionError: these gates have never been observed refusing anything:
  commit_and_push_complete: expected [ 'commit_and_push_complete' ] to deeply equal []

FAIL  test/refusals.test.ts > every gate can refuse, and has been seen to >
      there is exactly one case per gate, and the counts agree
AssertionError: the number of cases is not the number of gates: expected 19 to be 20

Tests  2 failed | 21 passed (23)
```

Restored: `Tests 24 passed (24)`. The counts match those the XR-01 commit message quotes for its own deletion, which is what they should be.

I also checked the half of requirement 1 that a deletion does not reach — that **a gate added with no case fails by name**. I added a twenty-first gate, `a_new_gate_nobody_wrote_a_case_for`, to `packages/gate-engine/src/gates.ts`:

```
AssertionError: these gates have never been observed refusing anything:
  a_new_gate_nobody_wrote_a_case_for: expected [ Array(1) ] to deeply equal []
AssertionError: the number of cases is not the number of gates: expected 20 to be 21
```

The coverage is enforced, not remembered, in both directions. Reverted.

### Proof 3 — a bad row in the register, and both checks fail

**Holds, and exactly as quoted.** One row added with a detector outside the vocabulary and a pointer to a file that does not exist:

```
FAIL  test/findings-register.test.ts > every row uses the vocabulary, and nothing else >
      XX-99 says what found it, in the vocabulary
AssertionError: XX-99 (line 54) claims it was found by "a-hunch":
  expected [ 'gate', 'review', 'owner' ] to include 'a-hunch'

FAIL  test/findings-register.test.ts > every row points at text that exists and names the finding >
      XX-99's pointer is a file in this repository
AssertionError: XX-99 (line 54) points at docs/process/A_FILE_THAT_DOES_NOT_EXIST.md,
  which is not in this repository: expected false to be true

Tests  2 failed | 58 passed (60)
```

Restored: `Tests 56 passed (56)`. Line 54 rather than the commit message's line 52 because I inserted at a different point; the counts are identical.

The register claims three more properties than the brief asks a reviewer to prove. I tested all three, plus two the test file claims for itself, and all five fail when they should:

| what I spoiled | what failed |
|---|---|
| status `totally-fine` | `XX-98 (line 54) claims status "totally-fine": expected [ Array(6) ] to include 'totally-fine'` |
| pointer at a real file that never names the finding | `docs/process/PHASE_1_BACKLOG.md does not mention XX-97` |
| a second row with an existing id | `ids used more than once: KR-03 (lines 42 and 56)` |
| `KR-03` flipped from `open` to `repaired` | `KR-03 is not recorded as open: expected 'repaired' to be 'open'` |
| `KR-06` row deleted | `KR-06 is not recorded as open: expected undefined to be 'open'` |

None of these guards is one nobody has seen fail.

### Proof 4 — count the gates

**Holds.** Enumerated from the engine itself rather than by reading the test:

`gateIds.length` is **20**. `REFUSALS` holds **20** cases, one per gate, in the order `gates` declares them, with no repeats. The counts agree.

I also checked the brief's premise rather than taking it, since the register now records XR-01 as repaired on the strength of it. Extracting every `failingGates` array from `packages/test-fixtures/src/candidates.ts` at the base commit `91409d0` gives 12 gates covered and 8 not: `repository_allowlisted`, `working_tree_clean`, `branch_identity`, `approved_base_ancestry`, `commit_and_push_complete`, `required_checks_ran`, `merge_authority`, `deploy_authority`. Exactly the eight the brief names.

## Findings

Identity is governed, and `REVIEW_POLICY.md` is why this review does not mint a prefix for itself any more than the candidate should have. The ids below carry the prefix **`KXR`** (Keeper, external-review repair) **as a proposal for the owner to confirm or replace**. They are stable within this document; they should not be entered in `docs/process/FINDINGS.md` under this prefix until the owner says so.

### KXR-01 — the register asserts an owner approval that no record in this repository supports

**Severity: major. Non-blocking. Surface: `docs/process/FINDINGS.md`. Authority concerned: layer 1 (owner decisions), `OD-0006`, `REVIEW_POLICY.md` "Findings", and the brief's own "A session must not mint these for itself".**

`docs/process/FINDINGS.md`, line 57: *"`XR` was approved by the owner on 2026-09-12."* The candidate commit message: *"Forward-only, per the owner's decision of 2026-09-12."*

Reproduction. `docs/decisions/` holds `OD-0001` through `OD-0014` and ten ADRs; none is dated 2026-09-12 and none mentions `XR`. Grepping every markdown file in the tree for `2026-09-12` returns exactly two files, and both were added by this branch. Grepping for `XR-01` or `XR-02` returns only the four files this branch touches. There is no `OWNER_DECISIONS_2026-09-12.md` to sit beside the existing `OWNER_DECISIONS_2026-09-10.md`.

The brief asked the owner three questions and the branch built on the answers to two of them without filing either. The brief's own status line is unchanged on the candidate: *"Status: proposed, not started. Nothing in this document is authority."* Its "What I need from you" still reads as three open questions. That document is also the `where its text is` pointer for both new rows, so the register's two newest findings are tethered to a file that says it is not authority, and the check that a pointer "names the finding" is satisfied there by the sentence *requesting approval* of those very ids.

Why this is not blocking. I proved that no record exists **in the repository**. I cannot prove the owner did not say it, because by `OD-0006` owner instructions originate in the owner console, which is outside the repository — and this review's own assignment named the branch `claude/virgil-foundation-repair`, which is the brief's third question answered somewhere. Nothing in the code is wrong because of this. What is wrong is that one sentence in the one file whose job is to be trusted cannot be checked against anything, and it is a sentence about that file's own authority.

The remedy is the owner's alone and no session may perform it: either file the decision record for 2026-09-12 covering the `XR` prefix, the forward-only seeding and the branch, or correct the sentence to say what actually authorises it. Until one of those happens, a reader cannot distinguish an owner-approved prefix from a minted one, which is the exact failure the brief warned against.

### KXR-02 — a row can be deleted from the register and the suite stays green

**Severity: moderate. Non-blocking. Surface: `apps/mission-control/test/findings-register.test.ts`. Authority concerned: `REVIEW_POLICY.md` line 19, "Findings are never renumbered, merged silently or dropped".**

Reproduction. In the candidate worktree I deleted four rows from `docs/process/FINDINGS.md` — `KP2-11`, `KP2-14`, `KP3-11` and `XR-01`:

```
Test Files  1 passed (1)
      Tests  40 passed (40)
```

Nothing failed. Restored.

Five of the twelve rows are in fact pinned, by the `does not read as though recording a gap had closed it` test — `KR-03`, `KR-06`, `KR-07` and `KR-09` by name as `open`, and `KR-58` as `caught_not_repaired`. Deleting any of those does fail, because `byId.get(id)?.status` becomes `undefined`. That is a real guard and it was probably not designed as one.

The other seven rows are unpinned, `XR-01` and `XR-02` among them — the two findings this work exists to record. The file's opening line is *"One home for findings, so that 'never dropped' is checkable rather than asserted."* What is checkable today is that every row **present** is well-formed and tethered. Dropping is the one thing not caught, for a majority of the rows, and it is the word the policy uses.

Why this is not blocking. The brief's requirement 2 asks for identity, status and pointer, and that is delivered. Requirement 4's cost constraint is real and was honoured. A persistence check needs a separate list of ids that must be present — a design decision with its own trade-off, since such a list can itself be edited — and the file is explicit and correct that it does not claim completeness. This is a gap between the register's stated purpose and what it enforces, not a promise it made and broke. It is worth raising now because the gap will get quietly larger as rows are added.

### KXR-03 — the register carries two of the five attributes the policy requires of a finding

**Severity: minor. Non-blocking. Surface: `docs/process/FINDINGS.md`. Authority concerned: `REVIEW_POLICY.md` line 19.**

The policy requires that every finding has *"a stable identity, a severity, an affected surface, reproduction evidence and the acceptance criterion or authority it concerns."* The register carries identity and a pointer, plus status and detector — two columns the policy does not ask for, and the detector is a genuinely good addition. Severity, affected surface and reproduction evidence appear in no column, and no check requires the pointed-at document to contain them.

The consequence is small while the register is read as an index. It matters when it is read as the answer to "what is open and how bad is it", which is the question the brief says it was built to answer. Two `open` rows in the table today are not comparable in severity by anything in the file.

### KXR-04 — the two red-before-green proofs live in commit messages, not in a run record

**Severity: minor. Non-blocking. Surface: `docs/process/`. Authority concerned: the brief, "How you will know it works", checks 2 and 3.**

The brief says twice that *"the run record must show this done and the output quoted."* No run record was added by this branch. `docs/process/run-records/` holds `consolidation.run-record.json` and `phase-0.run-record.json`; no `*_RUN_RECORD.md` was added.

Both proofs are quoted, accurately, in the commit messages — I reproduced both and the figures match. So nothing is misreported, and this is only about where the record lives. It is raised because a commit message is not where this repository keeps run records, and a reader following the brief's own instructions looks for a file and does not find one.

### KXR-05 — the branch's record does not mention that CI was red at the intermediate commit

**Severity: minor. Non-blocking. Surface: the branch's record. Authority concerned: `CLAUDE.md`, "a builder's success report is not evidence".**

Run 34685933061 on `57d7829`, the XR-01 commit, concluded `failure`: the `fast` job's `Lint` step exited 1 on `packages/gate-engine/test/refusals.test.ts` — a biome formatting difference on the object literal in the `required_checks_ran` case, `Found 1 error` — with `Typecheck` and `Tests` skipped behind it.

It is fixed at the candidate and run 34686942947 on `8b725b5` is green, so there is no defect here. It is raised because the XR-01 commit message presents that commit as finished work and quotes a local run, and says nothing about the pushed one being red; and because this repository has already paid for CI history that no document mentioned — that is `KS4-05`, which the same branch cites twice as the reason for its cost discipline.

## Observations, which are not findings

1. **Scope.** The branch adds `docs/process/GATE_PROOF_AND_FINDINGS_BRIEF.md`, which is not in the brief's own "Permitted paths". Commit `e6c11c3` names this in its message, states that the owner instructed the brief be saved before the work, and says it is named there rather than left for `diff_within_permitted_paths` to flag as unexplained. That is the right handling of a scope exception and I am recording it so the next reader does not have to rediscover it, not raising it against the candidate.

2. **`branch_identity`'s `because: /expected/` is the loosest of the twenty regexes.** That gate's `insufficient_evidence` reason — `"branch or expected branch not provided"` — also contains the word. It cannot actually be matched that way, because each case asserts `result === 'fail'` first and the `missing()` helper returns `insufficient_evidence`. Safe as written. Worth knowing if the gate's reason strings are ever reworded.

3. **What XR-01 repairs, stated precisely, and the register states it correctly.** Twenty gates can now be seen refusing *given evidence*. `docs/architecture/ENFORCEMENT_BOUNDARIES.md` still records that no adapter produces that evidence, so nothing here makes a gate refuse anything real. The register's summary for XR-01 is scoped to the suite and does not overstate, and the detector column reading `review` for all twelve rows is the honest reading of an engine with no adapters. Both are right and both are worth a reader's attention, because a green refusals suite is easy to mistake for a working gate.

4. **`gates.test.ts` is untouched and the diff deletes nothing** — 691 insertions, 0 deletions — so no existing assertion was removed or narrowed to accommodate the new files, and no test asserts a hard-coded suite size that the additions could have invalidated.

## Verdict

**`PASS_WITH_NON_BLOCKING_FINDINGS`.**

The four proofs the brief names all hold and I ran each of them rather than reading about them. The two guards this work adds were themselves driven red and named the right thing when driven red, in both directions for the gate coverage and in five ways for the register. No gate's behaviour changed, nothing was deleted, and both quoted outputs on the branch reproduce.

No finding is blocking. `KXR-01` is the one the owner should read first: it is not a defect in the work but an unsupported claim about the work's authority, and it is the owner's to close.
