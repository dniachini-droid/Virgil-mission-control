# Keeper review — the record-keeping repair

**Verdict: `PASS_WITH_NON_BLOCKING_FINDINGS`.**

Candidate: `b27cde14a2dd3fe9ad7ac435ded24c49686d68a8`, branch `claude/virgil-record-keeping`.
Contract: `docs/process/RECORD_KEEPING_BRIEF.md`, committed on that branch at `e1d3d62` before the work and unedited since.
Base of this work: `ec53d9876283444a704751ffd1d6f6fe59e71fe9` on `claude/virgil-foundation-repair`. Diff `ec53d98..b27cde14`: eight files, five of them new.
Prior reviews, all three read in full before starting, from the copies in this candidate and re-read from their own branches:
`claude/keeper-virgil-review-qu3pvr` at `5edc9ff` — `PASS_WITH_NON_BLOCKING_FINDINGS` on `8b725b5`, raising `KXR-01` to `KXR-05`.
`claude/keeper-review-candidate-23af6acf-3ed0pw` at `5f932ab` — `PASS_WITH_NON_BLOCKING_FINDINGS` on `23af6ac`, raising `KXR-06` to `KXR-08`.
`claude/keeper-virgil-review-final-axici6` at `65abd44` — `PASS_WITH_NON_BLOCKING_FINDINGS` on `ec53d98`, raising `KXR-09` to `KXR-12`.
Reviewed: 2026-09-12.

`REVIEW_POLICY.md`, "Staleness": a verdict never transfers to a new SHA. This is a review of `b27cde14` and endorses none of its three predecessors.

I attacked the four new guards rather than reading them. Three of the four hold against everything I could aim at them. The fourth — the table parser — does not hold against the most ordinary attack available, and the register and the test both claim it does.

## Independence and admissibility

I did not build this candidate, did not review `8b725b5`, `23af6ac` or `ec53d98`, and have made no change to it. Verification ran in a detached worktree at the candidate SHA. Every mutation below was made there, run, reverted, and the worktree returned to `b27cde14` with `git status --porcelain` empty, re-verified clean at the end.

Against `constitution/REVIEW_POLICY.md`, "What review requires":

- **Deterministic verification completed for the SHA, by something with no interest in the answer.** GitHub Actions run `34693443913` on `b27cde14`, job `lint, typecheck, tests`: `Lint` success, `Typecheck` success, `Tests` success, conclusion `success`. The other five jobs concluded `skipped` behind the push filter, for the reason `.github/workflows/checks.yml` states at length. **The candidate's own record does not say any of this**, which is `KXR-17` below.
- **Reproduced locally, independently.** Clean worktree at the SHA after `pnpm install --frozen-lockfile`: `biome check .` → `Checked 298 files in 220ms`, exit 0; `turbo run typecheck` → `Tasks: 8 successful, 8 total`; `turbo run test` → `Tasks: 6 successful, 6 total`, **1,805 tests across 37 files** in `mission-control`, up from 1,760 across 36 at `ec53d98`.
- **The SHA is pushed and equal on local and remote.** `git ls-remote origin claude/virgil-record-keeping` → `b27cde14a2dd3fe9ad7ac435ded24c49686d68a8`, equal to the reviewed worktree's HEAD.
- **Diff within permitted paths.** Six of the eight files are inside the brief's list. Two are not. One is declared as outside; the other is classified as permitted by an owner decision given for a different brief. See observation 2.
- **No test skipped, weakened or removed.** Every `it()` in the old `findings-register.test.ts` survives in the new one, one of them renamed because it now asserts strictly more. No `.skip`, `.only`, `.todo` or `skipIf` is added anywhere in the diff — the only textual match is inside a copied review's prose. Nothing under `packages/gate-engine/src/`, `constitution/`, `docs/product/` or `knowledge/raw/` is touched by any commit on this branch.

This is a review and not `INSUFFICIENT_EVIDENCE`. Everything the candidate claims is checkable from the repository and from a public Actions run, and I checked it.

## The one thing here that is anchored outside the sessions that wrote it

This is the part of the candidate worth stating first, because the rest of this project's evidence is prose written by sessions about themselves.

The three copied reviews are held to SHA-256 digests hardcoded in `apps/mission-control/test/review-records.test.ts`. **I re-derived all three from the reviewer branches, which still exist**, with `git show <commit>:<path> | sha256sum`:

| copy | source | pinned digest | re-derived |
|---|---|---|---|
| `KEEPER_REVIEW_GATE_PROOF_AND_FINDINGS.md` | `5edc9ff` | `8e3b87af…91512b` | identical |
| `KEEPER_REREVIEW_GATE_PROOF_AND_FINDINGS.md` | `5f932ab` | `08efb91e…bb0d1c` | identical |
| `KEEPER_FINAL_REVIEW_GATE_PROOF_AND_FINDINGS.md` | `65abd44` | `fabd3956…de2e9a` | identical |

The copies are byte-for-byte what those three reviewers wrote. Not summarised, not tidied, not one character moved. Twelve findings' full text no longer depends on three unmerged branches surviving, which was the point.

The guard is sensitive to one byte, and to less than a word:

```
AssertionError: docs/process/KEEPER_FINAL_REVIEW_GATE_PROOF_AND_FINDINGS.md is not what
claude/keeper-virgil-review-final-axici6 held at 65abd44. A review that can be edited
after it is written is not a review.
  expected '0bd7d0c36d949cb3a3ac02545a46d58b2ecd6…' to be 'fabd395609f7b4962a249bdad0f512cb77f09…'
Tests  1 failed | 10 passed (11)
```

A bare trailing newline appended to a second copy fails the same way. Deleting a copy fails three assertions, naming the file. The `holds` and `names the candidate it judged` checks are not decoration either: each document does state every finding it is cited for, and does name the SHA it judged.

## The brief's six acceptance criteria, checked

**1. `pnpm check` passes in CI on the candidate SHA, not in the session that wrote it.** The fast job passed in CI on the exact SHA (run `34693443913`). Under this repository's own vocabulary — `CLAUDE.md` glosses `pnpm check` as "biome lint, typecheck, unit tests across the workspace" — that is the criterion met, and the brief's own cost section anticipated the fast job. The candidate's record says none of it. `KXR-17`.

**2. Every id from `KXR-01` to `KXR-12` is in the register and in `PINNED`.** Counted: 24 register rows, 24 `PINNED` entries, the sets equal. All twelve `KXR` ids present in both.

**3. Delete one of the new rows — the suite must fail, naming it.** Deleted `KXR-11`:

```
AssertionError: findings dropped from the register: KXR-11. REVIEW_POLICY.md: findings are
never renumbered, merged silently or dropped. …
Tests  1 failed | 119 passed (120)
```

**4. Corrupt one copied review by a single character.** Shown above.

**5. Re-run the final review's four attacks, and the fifth the brief adds.** All five refused, by name. My output matches the run record's quotations verbatim, which I did not expect and checked twice:

```
detectors     AssertionError: cells changed with nothing recording it: KR-03 detector:
              pinned review, register says gate; … (24 rows)
summary       AssertionError: … KXR-03 summary rewritten to: "A cosmetic nit about the
              five attributes, long since handled and not worth a reader stopping on"
self-pointer  AssertionError: KR-03 points at the register itself, which proves nothing
              (25 failures)
second-table  AssertionError: tables in the register no check reads: line 109: finding | note
row-deleted   AssertionError: findings dropped from the register: KXR-11
```

**Whole-id matching, tested as a function rather than through the file**, because the run record admits its first decoy passed for the wrong reason. Fifteen cases through `names()`. The two that matter: `KXR-01` does **not** satisfy `XR-01`, and `KXR-03` does **not** satisfy `KR-03`. Nor do `XXR-01`, `XR-011`, `prefixXR-01` or a non-breaking hyphen. Backtick-, bracket- and full-stop-delimited ids still match. `KXR-10`'s second half is genuinely repaired.

**6. Nothing is claimed about the owner's decisions that a reader cannot check.** No `OD-*` is added. `KXR-01` moves to `withdrawn_gap_open` and `KXR-07` stays `open`. The register's closing paragraph names the owner console, says no record is filed, and says that sentence is the only trace. That is honest, and the refusal to file an unread decision record is the right call for the reason the brief gives: an unverified claim at authority layer 1 is the shape of `SA-G-03`.

The run record's account of its own failed proof — the first decoy passing because the decoy's own sentence contained a standalone `XR-01` — is the most creditable paragraph in the candidate. A session that records a proof that nearly went in wrong is doing the thing this register exists for.

## New findings

Ids continue the `KXR` prefix, **as proposals**. I have not entered them in `docs/process/FINDINGS.md`: that is a repair, this session was told not to repair, and `CLAUDE.md` gives each session one hop. I have not minted a prefix, which the register warns a session must not do.

### `KXR-13` — a second table headed exactly like the register is read by nothing, and both the register and the test say otherwise

**Severity: moderate. Non-blocking. Surface: `apps/mission-control/test/findings-register.test.ts`, `tablesOf`. Reproduction: below. Authority concerned: `REVIEW_POLICY.md` line 19; the brief's requirement 5.**

`KXR-11` was a finding in a table headed anything but `id`. The repair reads every table and refuses any whose header is neither the register's nor the attributes'. But the two recognised tables are selected with `.find()`, which takes the first match — and a duplicate of a recognised header is not a stranger, so it is neither read nor refused. It is silently discarded.

I appended one section to `FINDINGS.md` carrying a table with the register's exact header:

```
| id | status | found by | what | where its text is |
|---|---|---|---|---|
| KXR-99 | totally-made-up | gate | A finding that no check in this repository will ever
look at, pointing at a file that does not exist | docs/process/NO_SUCH_FILE.md |
```

```
Tests  125 passed (125)
```

`KXR-99` is now in the findings register. Its status is outside the vocabulary, its detector claims a gate caught it, and its pointer is a file that does not exist. Nothing is pinned, nothing is vocabulary-checked, nothing is pointer-checked, it has no attributes row, and it can be dropped tomorrow in silence. Every guard on this file is bypassed by duplicating a header instead of inventing one — which is what a session copying the table above it to start a new section will do by reflex, and the harder route was the one that got closed.

This matters more than `KXR-11` did because two documents now assert it cannot happen. `FINDINGS.md` lists among what the check refuses *"a row in a table the parser does not recognise"*. The test's own comment says *"every table is read and each must be one of the two this file knows."* The brief's requirement 5 says *"Every table in the file is read, or the file refuses to parse."* Every table is **classified**; only the first of each kind is **read**. That gap between claim and guard is `KXR-12`'s subject matter, reappearing inside `KXR-11`'s repair.

**Why this is not blocking.** No such table exists in the register today; I checked every table in the file. This is what the guard would fail to catch tomorrow, and the fix is to fail on a duplicate recognised header rather than take the first.

### `KXR-14` — the five attributes `KXR-03` added are unpinned, so a severity can be downgraded and a reproduction erased in silence

**Severity: moderate. Non-blocking. Surface: `apps/mission-control/test/findings-register.test.ts`, `PINNED`; `docs/process/FINDINGS.md` attributes table. Reproduction: below. Authority concerned: `REVIEW_POLICY.md` line 19; `KXR-06` and `KXR-09` as raised.**

`PINNED` holds four cells of every **register** row. The attributes table it added is held to nothing but `value.length > 3` and `value !== '—'`. Severity, affected surface, reproduction and criterion are free text that can change with the suite green.

I changed `KXR-02` — the finding that rows could be deleted in silence, recorded as `major` with the reproduction *"Delete four rows including `XR-01`; suite green at 40 passed"* — to:

```
| KXR-02 | minor | … | Not reproducible; a cosmetic concern only | REVIEW_POLICY.md line 19 |
```

```
Tests  125 passed (125)
```

The finding is still there, still `repaired`, still pinned, and now says it was never reproducible and never mattered. `KXR-09`'s reasoning applies unchanged, one table over: this is the same loss by a quieter route, and it does not cost the word `repaired`.

The sharp edge is that the candidate built a SHA-256 guard specifically to stop this, and quotes as its proof *"one word softened in a kept review — `Severity: moderate` to `Severity: minor`"*. That manipulation is now refused in the copies of other people's reviews and permitted in the register's own attributes table, in the same commit. `REVIEW_POLICY.md` requires the severity of every finding; a severity nothing holds is a severity for exactly as long as nobody edits it.

**Why this is not blocking.** Every one of the fourteen attributes rows is accurate at this SHA — I read all fourteen against the findings' own text in the three copied reviews. The fix is the same `PINNED` mechanism widened once more, which is why it belongs with whoever decides how much a row must carry.

### `KXR-15` — the brief's stated reason it is not a third repair cycle is contradicted by the candidate built from it

**Severity: major. Non-blocking, for the reason given. Surface: `docs/process/RECORD_KEEPING_BRIEF.md`; `docs/process/FINDINGS.md`. Reproduction: read the two passages. Authority concerned: `constitution/REPAIR_LIMITS.md`; `constitution/authority.json` `repairLimits.maxCyclesWithOwner = 2`.**

The brief opens by answering the objection that it routes around the repair limit, and answers it with a factual test:

> **It could be read as routing around the repair limit, and that reading deserves an answer rather than a denial.** What distinguishes it: **it repairs no finding, changes no guard, and closes nothing. Every finding named below stays exactly as open as it is today.**

Four paragraphs later the same document commits to repairing `KXR-09`, `KXR-10`, `KXR-11`, `KXR-12` and `KXR-03`, and the candidate does it. Five rows moved: four from unrecorded to `repaired`, and `KXR-03` from `open` to repaired-forward-only. The guard was rewritten, +583/−187. Every clause of the distinguishing test is false about the work it was written to distinguish.

`REPAIR_LIMITS.md` counts cycles "per candidate lineage". This branch is cut from `ec53d98`, carries its whole history, edits the same two files, and repairs findings raised against it — four of them in very nearly the order the final review said a third cycle should take them, and against that review's recommendation that none be repaired on this lineage. By substance this is the third cycle. The brief's answer to the objection is not that the owner authorised one; it is that no cycle is happening.

**Why this is not blocking, and it was close.** `beyondLimit` is `OWNER_DECISION_REQUIRED`, not a prohibition, and an owner decision is what the brief records: four questions answered on 2026-09-12, including the branch name this candidate is on. The control the limit exists to impose — the owner decides whether to spend another cycle — was exercised as well as anything in this project is. What is wrong is the account of why, not the work, and the work is content a previous independent reviewer had already set out as appropriate for an authorised third cycle. It is also, like everything else that day, an instruction that lives only in the owner console with no record filed — so the authorisation that makes this legitimate rests on the same prose `KXR-01` was raised about.

The honest sentence was available and cheap: *the owner authorised a third cycle on 2026-09-12, and no record of that is filed.* That is a smaller claim than the one the brief makes and it is true.

### `KXR-16` — `KXR-12` reads `repaired` and half of it is untouched

**Severity: minor. Non-blocking. Surface: `docs/process/FINDINGS.md` line 7. Reproduction: `git show ec53d98:docs/process/FINDINGS.md | sed -n '7p'` against the candidate's line 7 — byte-identical. Authority concerned: accuracy of the register's own status column.**

`KXR-12` as raised names two passages. The second, "Adding a row", is repaired well: it now lists nine things the check refuses, in full. The first is line 7:

> A row whose status or detector is outside the vocabularies below fails; a row pointing at a file that does not exist fails; a row pointing at a file that does not name the finding fails.

Unchanged from `ec53d98`. It still omits the drop guard, the cell pin, the whole-id qualifier, the refusal to point at the register, the unrecognised-table refusal and the attributes requirement — and it is the paragraph a reader meets six lines into the file, before the one that was fixed.

The register is overstating itself by one row, which is the condition `withdrawn_gap_open` was invented for in this same commit.

### `KXR-17` — the run record makes no statement about CI for this candidate, where its own predecessor section names the run

**Severity: minor. Non-blocking. Surface: `docs/process/FOUNDATION_REPAIR_RUN_RECORD.md`, the record-keeping section. Reproduction: `grep -n "3469\|Actions run" ` over the new section — nothing. Authority concerned: the brief's criterion 1, *"in CI on the candidate SHA, not in the session that wrote it"*.**

The previous section of the same file says: *"The reviewer confirmed it green in CI on the candidate SHA (run `34686942947`: lint, typecheck and tests all success)."* The new section says nothing at all about CI. The only claim is in the commit message — *"`pnpm check` passes, exit 0"* — which is the session's own local report, and `CLAUDE.md` says a builder's success report is not evidence.

CI is in fact green (run `34693443913`), so nothing here is false; it is missing, and it is the criterion the brief listed first. `KXR-04` was the proofs living only in commit messages and `KXR-05` was the record not saying what CI did. Both read `repaired`. This is a third of the same shape.

## Observations, which are not findings

1. **Both guards can be deleted in one commit and every check stays green.** The final review's observation 3, unchanged, and it now covers the integrity guard too. I removed `findings-register.test.ts` and `review-records.test.ts`, dropped all fourteen `XR`/`KXR` rows from the register, and appended `SUMMARISED FOR BREVITY.` to a kept review: `Test Files 35 passed (35)`, `Tests 1669 passed`, `biome check` clean across 296 files. Nothing anywhere asserts either file exists. Worth re-recording only because the new guard's stated purpose is to make tampering with the reviews impossible, and it can be removed in the same commit as the tampering. The control is a human reading the diff, as `CLAUDE.md` intends, and not the guard.

2. **Two files are outside this brief's permitted list, not one.** The run record's table is complete and I found nothing it omits. It marks `apps/mission-control/test/review-records.test.ts` plainly — *"This file is outside the permitted paths… the owner has not authorised it"* — which is the right way to do it. It then classifies `docs/process/FOUNDATION_REPAIR_RUN_RECORD.md` as permitted by *"the owner, 2026-09-12 — though for the previous brief, not this one"*. An authorisation given for one contract's permitted-paths list does not extend to the next contract's. The caveat is there, in the cell, which is why this is an observation and not a finding; but the prose above it frames one exception where there are two. `KXR-07` recurs at the same count as before, declared both times, and the brief's own answer to it — naming the exception inside the contract — worked for the brief and was not extended to the test file that requirement 3 obviously needed.

3. **The contract governing this work says of itself: "Status: proposed, not started. Nothing in this document is authority."** `KXR-08` was raised for exactly that sentence in the previous brief, and the repair moved two findings' pointers off it. No register row points at `RECORD_KEEPING_BRIEF.md`, so the finding does not recur in the register — but the run record cites it as the contract, and its status line was never updated to reflect that the owner answered all four of its questions, which the same document states two pages later.

4. **The brief miscounts its own cost.** *"Four document copies, one decision record"* — there are three review documents, three were copied, and no decision record was filed, correctly and deliberately. Finding one also says *"The four review documents live on"* three named branches. Three is the right number and the work does the right thing; the brief's arithmetic does not match its own list.

5. **The unfiled decisions of 2026-09-12 have grown again.** The first review counted six, the final review seven. This candidate adds the authorisation of a third repair cycle (`KXR-15`), the approval of `withdrawn_gap_open`, and the answer that all five attributes are required forward-only. Ten or so, all resting on an instruction that lives only in the owner console, and `OD-0006` records that the owner reading their own decision records is the only detection of a false one. The candidate is right that a record the owner will not read is worth nothing. The number still grows at every hop.

## The repair limit, and which findings warrant breaching it

`constitution/authority.json` sets `repairLimits.maxCyclesWithOwner = 2` and `repairLimits.beyondLimit = OWNER_DECISION_REQUIRED`. On my reading (`KXR-15`) this candidate is already the third cycle of the `claude/virgil-foundation-repair` lineage, however it is framed.

**None of `KXR-13`, `KXR-14`, `KXR-16` or `KXR-17` warrants another one. I recommend all five new findings be recorded in the register and none be repaired on this lineage.**

The reason is the same as the last reviewer's and still holds: not one of them describes anything false in the repository today. I checked all 24 statuses, all 24 detectors, all 24 summaries against the pin, all 24 pointers for existence and whole-id naming, and all fourteen attributes rows against the findings' own text in the copied reviews. Everything is accurate. `KXR-13` and `KXR-14` are latent gaps in guards; `KXR-16` and `KXR-17` are prose that has not caught up with the machinery.

`KXR-15` is different in kind and cannot be repaired by a session at all. It is a statement in a contract about that contract's relationship to a layer-2 limit, and only the owner can say whether a third cycle was authorised. If he says it was, the repair is one sentence in the brief and this closes. If he says it was not, that is a decision about work already done and not a defect a builder can fix.

If the owner authorises a further cycle, the ordering I would give is `KXR-13` first — it is the only one of the four where the register can be made to hold a finding that is false in every cell — then `KXR-14`, then `KXR-16` and `KXR-17`, which are prose. But my recommendation is that none of that happens now, and that `KXR-03`'s successor question — what must a row carry and what pins it — is answered once, with the owner, rather than a fifth time by a session.

## Verdict

**`PASS_WITH_NON_BLOCKING_FINDINGS`.**

What the candidate set out to do, it did. Twelve findings' full text is in this repository instead of on three branches somebody will tidy up, and I verified all three copies against their sources byte for byte rather than taking the digests on trust — the single most load-bearing check in this candidate, and the only evidence anywhere in this lineage anchored to something outside the sessions that wrote it. The cell pin is real and covers all four cells. Whole-id matching is real and I could not get `KXR-01` past `XR-01` by any spelling. The self-pointer refusal is real. Five declared attacks are refused by name and the run record's quotations match my output word for word. Nothing is deleted, no test is skipped or weakened, no gate, no constitution file, no commission, no raw source is touched. And the largest thing in it is a refusal: a decision record was drafted and not filed because the owner said he would not read it, which is the correct answer and the expensive one.

Five findings are new, all non-blocking. Two are guards that claim more than they hold — a table headed exactly like the register is read by nothing, and the five attributes just added are pinned by nothing — and both are reproducible in a single edit. Two are prose that did not keep up: half of `KXR-12` is untouched under a `repaired` status, and the record says nothing about the CI run that is the brief's first criterion. The fifth is not a defect in the work but in its account of itself: the brief's reason for not being a third repair cycle is contradicted by the candidate in five places, and the true sentence — that the owner authorised one and no record is filed — was shorter and available.

That last one is what to read twice. This is a repair whose subject is the accuracy of records, and its own contract is inaccurate about what it does. Everything else here is a guard that will need widening once more.

`PASS_WITH_NON_BLOCKING_FINDINGS` is not `SAFE_TO_MERGE` — `constitution/STATE_LANGUAGE.md` — and nothing here is a recommendation to merge.
