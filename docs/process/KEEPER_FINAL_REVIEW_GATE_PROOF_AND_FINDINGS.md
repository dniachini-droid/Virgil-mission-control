# Keeper review — the third and last in this lineage

**Verdict: `PASS_WITH_NON_BLOCKING_FINDINGS`.**

Candidate: `ec53d9876283444a704751ffd1d6f6fe59e71fe9`, branch `claude/virgil-foundation-repair`.
Contract: `docs/process/GATE_PROOF_AND_FINDINGS_BRIEF.md`, as committed on that branch at `e6c11c3` and unedited since.
Prior reviews, both read in full before starting:
`claude/keeper-virgil-review-qu3pvr` at `5edc9ff` — `PASS_WITH_NON_BLOCKING_FINDINGS` on `8b725b5`, raising `KXR-01` to `KXR-05`.
`claude/keeper-review-candidate-23af6acf-3ed0pw` at `5f932ab` — `PASS_WITH_NON_BLOCKING_FINDINGS` on `23af6ac`, raising `KXR-06` to `KXR-08`.
Base: `91409d0` on `main`. Diff under review: `23af6ac..ec53d98`, three files, **+83 / −25**. Diff against base: five files, **+968 / −0**.
Reviewed: 2026-09-12.

`REVIEW_POLICY.md`, "Staleness": a verdict never transfers to a new SHA. This is a review of `ec53d98` and endorses neither predecessor. I did not re-run the brief's four proofs from scratch — both predecessors did, differently, and their records say how — but I re-established every property those proofs protect by other means, listed under "Nothing that was closed has reopened".

The delta claims three things: `KXR-06` repaired, `KXR-08` repaired, `KXR-07` recorded open. **All three claims hold.** I tested the `KXR-06` repair adversarially rather than reading it, in eleven mutations, and it survives every attack aimed at the thing it pins. It does not survive attacks aimed at the three cells beside it, and that is `KXR-09` and `KXR-10` below.

## Independence and admissibility

I did not build this candidate, did not review `8b725b5` or `23af6ac`, and have made no change to the candidate. Verification ran in a detached worktree at the candidate SHA. Every mutation below was made there, run, and reverted; the worktree was returned to `ec53d98` with `git status --porcelain` empty, and re-verified clean at the end.

Against `constitution/REVIEW_POLICY.md`, "What review requires":

- **Deterministic verification completed for the SHA.** GitHub Actions run `34690415815` on `ec53d98`, job `lint, typecheck, tests`: `Lint` success, `Typecheck` success, `Tests` success. Not a session's own report. The other five jobs concluded `skipped` behind `if: github.event_name != 'push'`, for the reason stated at length in `.github/workflows/checks.yml` — the Actions minutes exhausted on 2026-09-10.
- **Reproduced locally, independently.** In a clean worktree at the SHA after `pnpm install --frozen-lockfile`: `biome check .` → `Checked 297 files in 255ms`, exit 0; `turbo run typecheck` → `Tasks: 8 successful, 8 total`, exit 0; `turbo run test` → `Tasks: 6 successful, 6 total`, exit 0, **2019 tests across six packages**, `mission-control` at 36 files / 1760 tests.
- **The SHA is pushed and equal on local and remote.** `git ls-remote origin claude/virgil-foundation-repair` → `ec53d9876283444a704751ffd1d6f6fe59e71fe9`, equal to the reviewed worktree's HEAD.
- **Diff within permitted paths.** Three of the five files against base are inside the brief's list; two are not, unchanged from the previous review. That is `KXR-07`, which this candidate records as open rather than dissolving. See the disposition note below.
- **No test skipped, weakened or removed.** The branch diff against base is **+968 / −0** — nothing is deleted anywhere on this branch. `packages/gate-engine/test/refusals.test.ts` is byte-identical across `8b725b5`, `23af6ac` and `ec53d98` (SHA-256 `80041db2…`), and `packages/gate-engine/test/gates.test.ts` is byte-identical to base `91409d0` (`d02e63d9…`). No `.skip`, `.only`, `.todo` or `skipIf` is added anywhere in the diff.

This is a review and not `INSUFFICIENT_EVIDENCE`. `KXR-07` is the item that could have made it one, and I reach the same conclusion my predecessor did, for the same reasons: both exceptions are declared rather than hidden, one of them resolves a contradiction internal to the contract, neither file is code, and this candidate now carries the gap as a row in the register instead of a paragraph nobody indexes.

## The three claims of the delta, tested

### `KXR-06` — repaired, and the guard holds in both directions

`PINNED` is now `Record<string, (typeof STATUSES)[number]>` — twenty ids, each mapped to a status — and a third assertion fails when the pin and the register disagree. Baseline at the candidate: **91 passed**.

**The register changed, the pin not.**

```
× does not let a finding be declared over by a one-word edit
AssertionError: findings whose status changed with nothing recording it:
  KXR-03: pinned open, register says repaired. A status is the strongest claim
  this file makes.
Tests  1 failed | 90 passed (91)
```

**The pin changed, the register not.** This is the direction nobody had tested, and the one that decides whether the guard is a pin or a mirror:

```
× does not let a finding be declared over by a one-word edit
AssertionError: findings whose status changed with nothing recording it:
  KXR-03: pinned repaired, register says open.
Tests  1 failed | 90 passed (91)
```

It is a pin. The guard holds both ways.

**Both changed together: passes, at 91.** That is the declared design, stated in the file's own comment and in the run record — the point is to convert a silent closure into a visible one, not to make closure impossible. Recorded so nobody re-raises it.

**The builder's own reproduction, verified at the previous SHA.** The run record claims that at `23af6ac`, flipping `KXR-03` from `open` to `repaired` left the suite green at 78 passed. I restored both files from `23af6ac` into the candidate worktree, made that one edit, and got `Tests 78 passed (78)`. Exact.

**`PINNED` attacked directly.** The obvious way to make a pin lie is to override it quietly rather than edit it visibly. A duplicate key appended to the object literal — `'KXR-03': 'repaired'` after the twenty — silently wins at runtime, `biome check` passes it clean, and the register test reports **91 passed** with `KXR-03` flipped in both places. It is caught, but not here: `tsc -p apps/mission-control/tsconfig.json` errors `TS1117: An object literal cannot have multiple properties with the same name`, exit 1, because that tsconfig's `include` carries `test/**/*.ts`. The same holds for a computed-key form. So the override is stopped by CI's typecheck step and by nothing in the suite that exists to stop it. That is defence in depth working by luck rather than design; it is an observation, not a finding, because the outcome in CI is correct.

### `KXR-08` — repaired

`XR-01` and `XR-02` now point at `docs/process/FOUNDATION_REPAIR_RUN_RECORD.md` instead of at the brief, and the run record gained a section stating both findings individually — not a cross-reference, the text. The brief is untouched: SHA-256 `57563fde282c47e6872782205f213e83d8b25120b7d21510d828e2f5678627bf` at `e6c11c3`, `8b725b5`, `23af6ac` and `ec53d98` alike, which is what its purpose required.

I checked the new section's claims at source rather than reading them. All four quotations are verbatim: `ENFORCEMENT_BOUNDARIES.md`'s *"no evidence until Phase 2 adapters exist; today only fixtures feed it"*, `REVIEW_POLICY.md`'s *"never renumbered, merged silently or dropped"*, `PHASE_1_BACKLOG.md`'s *"no file in the repository holds its text"*, and the brief's *"Nothing in this document is authority"*. The eight gates the `XR-01` paragraph names are the same eight the brief names and the same eight I enumerated from `gateIds` at base.

### `KXR-07` — recorded open, and correctly

It is a row in the register, status `open`, and the run record's section on it says plainly why a session cannot repair it: a machine-readable exceptions list would convert "trust the prose" into "trust the list the same session wrote". That reasoning is sound and I do not disagree with it.

## Nothing that was closed has reopened

Checked with inputs none of the three sessions before me used.

| what the earlier reviews established | how I re-established it |
|---|---|
| `XR-01` — every gate has a refusal case, enforced | 20 ids enumerated from `gateIds` by importing the engine; 20 cases in `refusals.test.ts`. Deleting a **fourth** gate's case (`required_checks_ran`; the three before me used `working_tree_clean`, `commit_and_push_complete`, `deploy_authority`): `these gates have never been observed refusing anything: required_checks_ran` and `the number of cases is not the number of gates: expected 19 to be 20`, `Tests 2 failed \| 21 passed (23)`. Restored. |
| `KXR-02` — a row cannot be dropped in silence | Deleted three rows nobody had used — `KR-58`, `KXR-06`, `KXR-08`: `findings dropped from the register: KR-58, KXR-06, KXR-08`, `Tests 2 failed \| 77 passed (79)`. Restored. |
| `KXR-02`, the other direction | Added `ZZ-77` to the table and not to `PINNED`: `rows in the register that nothing holds in place: ZZ-77`, `Tests 1 failed \| 94 passed (95)`. Restored. |
| `KXR-01` — the corrected sentence | `FINDINGS.md` still carries it, naming the owner console, the absence of a filed record, and `OD-0006`. Unchanged in this delta. |
| `KXR-04`, `KXR-05` — the run record and the red intermediate commit | Both sections intact and extended, not rewritten. Run `34685933061` on `57d7829` still concludes `failure`. |
| The register is honest **today** | Every one of the twenty rows' pointers exists and names its id as a standalone token, not merely as a substring — checked with a word-boundary match, counts from 1 to 4 per row. No row's status is contradicted by the document it cites. |

The test count moved 1747 → 1760 in `mission-control`, and the arithmetic accounts for all thirteen: three new rows × four per-row assertions, plus the one new status-pin assertion.

## New findings

Ids continue the `KXR` prefix the register records the owner as having approved, **as proposals**. I have not entered them in `docs/process/FINDINGS.md`: that is a repair, this session was told not to repair, and `CLAUDE.md` gives each session one hop.

### `KXR-09` — the repair pinned one cell of four; a finding can still be neutralised without touching its status

**Severity: moderate. Non-blocking. Surface: `apps/mission-control/test/findings-register.test.ts`, `docs/process/FINDINGS.md`. Authority concerned: `REVIEW_POLICY.md` line 19; the brief's requirement 3.**

A row has four cells that say anything — status, found by, what, where. `KXR-06`'s repair pins one. The other three are unheld, and two of them carry claims a reader relies on.

**The summary.** The only check on the `what` cell is `row.what.length > 20`. I rewrote `KXR-03`'s summary — the row recording that the register carries two of the five attributes the policy requires — into *"A cosmetic nit about column ordering in the table, left open because nobody minds it very much either way"*, left the status at `open`, touched nothing else:

```
Tests  91 passed (91)
```

The finding is still there, still open, still pinned, and no longer describes anything. `KXR-06`'s own reasoning applies unchanged: *"a finding not dropped but silently declared over, which is the same loss by a quieter route, and worse because the row is still there to point at."* A finding rewritten into a nit is that same loss by a third route, and it does not even cost the word `repaired`.

**The detector, which is the sharper end.** `FINDINGS.md` says of this column: *"This column is the point of the register rather than a decoration on it. It is the only measure available of whether the review machinery works… The column is how you find out whether Phase 2 changed that, instead of assuming it did."* The brief says the same in its requirement 3. It is unpinned. I flipped all twenty rows from `review` to `gate` in one regex:

```
Tests  91 passed (91)
```

The register now states that every finding in this repository was caught by a deterministic gate. `ENFORCEMENT_BOUNDARIES.md` records that no adapter feeds the engine, so that statement is false on the day it is written, and it is false in the one direction the column exists to detect — a Phase 2 that claims its gates are working. The suite that exists to make this file trustworthy agrees with it, and the prose three paragraphs above the table now contradicts the table.

**Why this is not blocking.** Nothing in the repository is wrong. Every status, every detector and every summary is accurate at this SHA, and I checked all twenty. This is a gap between what the guard holds and what a reader of `FINDINGS.md` would reasonably believe it holds, and the same gap `KXR-06` was raised for, one cell over. It is also cheap to close — the same `PINNED` mechanism, widened from a status to a row — and that is a decision about the register's design, which belongs with whoever closes `KXR-03`, exactly as the previous review said of `KXR-06`.

### `KXR-10` — the "pointer names the finding" check can be satisfied by the register itself, and by any longer id containing this one

**Severity: moderate. Non-blocking. Surface: `apps/mission-control/test/findings-register.test.ts`. Authority concerned: the brief's requirement 2; `KXR-08` as raised.**

Two checks guard a row's evidence: the pointer is a file that exists, and that file mentions the id. The second is `readFileSync(path).toContain(row.id)`, and it is weaker than it reads in two ways.

**Self-reference.** `docs/process/FINDINGS.md` contains every row's id, because every row contains its own id. So pointing a row at the register itself satisfies both checks trivially. I repointed **all twenty rows** at `docs/process/FINDINGS.md`:

```
Tests  91 passed (91)
```

Every finding in the repository is now severed from its evidence and cites only the one-line summary beside it, and the file whose stated purpose is that a pointer must not be *"a citation to a three-hundred-line document"* accepts twenty citations to itself. This also removes the renumbering protection the previous review recorded as Observation 2: renumbering is caught only because the pointed-at document does not mention the new id, and a row pointing at the register can be renumbered in both places and pass.

**Substring collision.** The check is a substring test on ids that are prefixes of one another. `XR-01` is contained in `KXR-01`. I wrote a decoy document that discusses only `KXR-01` and `KXR-02` and says *"nothing whatever about the two findings that this branch was created to record"*, and pointed `XR-01` and `XR-02` at it:

```
Tests  91 passed (91)
```

That matters here specifically: `XR-01` and `XR-02` are the two findings this whole branch exists to record, and the check that their new pointer names them — the check `KXR-08`'s repair rests on — would be satisfied by a document that never mentions either.

**Why this is not blocking.** No pointer in the register is wrong today; I verified all twenty name their id as a standalone token. Both holes are in what the check would refuse tomorrow, not in what it accepts today, and the fix is small in both cases — exclude the register from its own rows' pointers, and match on a token boundary rather than a substring.

### `KXR-11` — a finding can be recorded in the register in a table the check never enters

**Severity: minor. Non-blocking. Surface: `apps/mission-control/test/findings-register.test.ts`, `rowsOf`.**

The parser opens a table only on a header whose first cell is literally `id`. Any other markdown table in the file is invisible to it. I added a second section headed "Further findings", with a table headed `| finding |`, carrying one row:

```
Tests  91 passed (91)
```

`ZZ-88` is now recorded in the findings register, reads as a finding to anyone who opens the file, and is held by nothing: not pinned, not vocabulary-checked, not pointer-checked, and droppable tomorrow in complete silence. That is precisely the condition `KXR-02` was raised for, re-entering by a route the repair does not cover. The complementary attack fails correctly — moving an existing pinned row out of the table behind a blank line is caught as `findings dropped from the register: KXR-07` — so this is about rows arriving, not rows leaving.

Minor because it requires departing from the register's own documented procedure, which says to add a row to the one table. Worth recording because a future session adding a second class of finding is exactly how a second table gets written.

### `KXR-12` — the register's instructions were not updated for the guard that now enforces them

**Severity: minor. Non-blocking. Surface: `docs/process/FINDINGS.md`.**

Two passages tell a reader what the machinery does, and this delta updated neither.

Line 7 enumerates what the test enforces: *"A row whose status or detector is outside the vocabularies below fails; a row pointing at a file that does not exist fails; a row pointing at a file that does not name the finding fails."* Neither the drop guard (`KXR-02`, landed at `23af6ac`) nor the status pin (`KXR-06`, landed here) is in that list.

Line 67, "Adding a row", is worse: *"Add it to the table **and to `PINNED`**… **and nothing else**."* It is written for adding. A session that changes a status while following it exactly will hit a failing test whose cause is not documented anywhere in the file it is maintaining — and a session reading "and nothing else" as licence has been told, by the register, something that is no longer true.

The run record documents the repair fully. The register does not, and the register is the file people will read.

## Observations, which are not findings

1. **`KXR-01` reads `repaired` and `KXR-07` reads `open` for what the run record itself calls the same family.** Both rest on the owner's unfiled decisions of 2026-09-12. `KXR-01`'s repair was to stop asserting an approval a reader cannot check; the gap it revealed is untouched, and `KXR-07` is that gap wearing a different surface. The status vocabulary has no word for *"the claim was corrected, the gap it exposed is still there"* — `caught_not_repaired` is the nearest and does not fit. I am recording this rather than raising it because the row's own summary says exactly what was repaired (*"the sentence now says where the approval came from and that no record is filed"*) and overstates nothing. A reader who reads only the status column will draw the wrong conclusion; a reader who reads the row will not.

2. **`XR-01` and `XR-02` now cite a file whose presence in the diff is itself an open finding.** `KXR-08`'s repair moved them off a document that disclaims being authority and onto `FOUNDATION_REPAIR_RUN_RECORD.md`, which `KXR-07` records as outside the contract's permitted paths. That is the better of the two available homes and I would have made the same choice; it is worth a reader knowing that the two founding findings of this work are housed in the file whose right to exist is open.

3. **The whole register guard can be deleted in one commit and every check stays green.** I removed `apps/mission-control/test/findings-register.test.ts` and dropped four rows from the register: `Test Files 35 passed (35)`, `Tests 1669 passed`, `biome check` clean across 208 files, typecheck exit 0. Nothing anywhere asserts that the guard exists. This is true of every test in every repository and `CLAUDE.md` forbids it by policy rather than by code; it is recorded so that nobody mistakes `PINNED` for something that survives its own file being removed.

4. **The engine is unchanged and the register says so.** No file under `packages/gate-engine/src/` is touched by any commit on this branch. Twenty gates still refuse only fixtures. A green refusals suite proves a gate *can* refuse given evidence and nothing about evidence arriving, and the detector column reading `review` for all twenty rows is the honest state of that — which is why `KXR-09`'s second half matters more than its first.

5. **The unfiled decisions of 2026-09-12 are now seven.** The previous review counted six. The `KXR` prefix continuing into this review's four proposed ids is the seventh thing resting on an instruction that lives only in the owner console. The number has grown by one at every hop of this lineage, and `OD-0006` records that the owner reading their own decision records is the only detection of a false one.

## The repair limit, and which findings I believe warrant breaching it

`constitution/authority.json` sets `repairLimits.maxCyclesWithOwner = 2` and `repairLimits.beyondLimit = OWNER_DECISION_REQUIRED`. Two repair cycles have run in this lineage: `8b725b5` → `23af6ac`, and `23af6ac` → `ec53d98`. `REPAIR_LIMITS.md`: *"Beyond the owner-extended limit the candidate stops and the run enters `OWNER_DECISION_REQUIRED`."*

**None of `KXR-09`, `KXR-10`, `KXR-11` or `KXR-12` warrants breaching that limit. I recommend all four be recorded in the register and none be repaired on this lineage.**

The reason is the same for each, and it is not a judgement about how easy they are to fix. Every one of them describes something the guard would fail to catch tomorrow. Not one of them describes anything wrong in the repository today: all twenty statuses are accurate, all twenty detectors are accurate, all twenty summaries describe their findings, all twenty pointers exist and name their finding as a standalone token. I checked each of those four properties across all twenty rows rather than sampling. A finding that reports a latent gap in a guard, in a repository whose contents are correct, is exactly what the register was built to hold — and repairing it here would mean a third cycle spent hardening a check against attacks nobody has made, at the cost of an owner decision.

There is a second reason, and it is the stronger one. `KXR-09` and `KXR-10` are both about **what else a row should hold in place**, and so is `KXR-03`, which has been open since the first review for a reason that still holds. They are one design question — what does a row have to carry, and what pins it — and `KXR-03`'s own disposition is that answering it is the owner's. Repairing two thirds of that question on a third cycle, while the third stays open, would produce a register pinned in four places and still missing severity, surface and reproduction, and would have spent the owner's extra cycle to get there. They belong together, with whoever closes `KXR-03`.

If the owner disagrees and authorises a third cycle, the ordering I would give is: `KXR-09`'s detector half first, because it is the only one of the four whose failure mode is a *false* statement about the system rather than a missing one; then `KXR-10`'s two pointer holes, which are a few lines each; then `KXR-12`, which is prose; then `KXR-11`. But my recommendation is that none of that happens now.

## Verdict

**`PASS_WITH_NON_BLOCKING_FINDINGS`.**

The delta does what it says. `KXR-06`'s repair is real and I could not get round it by any route aimed at what it pins: not by editing the register alone, not by editing the pin alone, not by overriding the pin with a duplicate or computed key, not by moving a pinned row out of the parser's reach. It holds in both directions, which nobody had tested. `KXR-08` is repaired and the brief stayed unedited, which was the point. `KXR-07` is recorded open with an accurate account of why a session cannot close it. Nothing the two earlier reviews closed has reopened, and I re-established each of those properties with inputs none of my predecessors used. The branch still deletes nothing — `+968 / −0` against base — and no test is skipped, weakened or removed.

Four findings are new, all non-blocking, none warranting a third repair cycle. They say one thing between them: the repair pinned the strongest claim a row makes and left the other three, and the unpinned detector column is the one the contract itself calls the point of the register. That is worth the owner's attention and not worth this lineage's last cycle.

`PASS_WITH_NON_BLOCKING_FINDINGS` is not `SAFE_TO_MERGE` — `constitution/STATE_LANGUAGE.md` — and nothing here is a recommendation to merge.
