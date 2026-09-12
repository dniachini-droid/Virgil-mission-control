# Keeper re-review — the five findings of the review of `8b725b5`

**Verdict: `PASS_WITH_NON_BLOCKING_FINDINGS`.**

Candidate: `23af6acf4833640198eecbccccd4ab1c01215ae0`, branch `claude/virgil-foundation-repair`.
Contract: `docs/process/GATE_PROOF_AND_FINDINGS_BRIEF.md`, as committed on that branch at `e6c11c3`.
Prior review: `PASS_WITH_NON_BLOCKING_FINDINGS` on `8b725b5`, branch `claude/keeper-virgil-review-qu3pvr` at `5edc9ff`, which raised `KXR-01` to `KXR-05`.
Base: `91409d0` on `main`. Diff against the previously reviewed candidate: three files, **+220 / −1**. Diff against base: five files, **+910 / −0**.
Re-reviewed: 2026-09-12.

`REVIEW_POLICY.md`, "Staleness": a verdict never transfers to a new SHA, so this is a fresh review of `23af6ac` and not an endorsement of the earlier one. All five findings are examined below against what the candidate actually does, not against what its commit message says it does. `KXR-02`, the only one with code behind it, is repaired and I drove it red in both directions myself with different inputs from the builder's. Three new non-blocking findings follow.

## Independence and admissibility

I did not build this candidate, did not review `8b725b5`, and have made no change to the candidate. Verification ran in a detached worktree at the candidate SHA; every mutation below was made there, run, and reverted, and `git status --porcelain` returned empty after each and at the end.

Against `REVIEW_POLICY.md`, "What review requires":

- **Deterministic verification completed for the SHA.** GitHub Actions run `34689035118` on `23af6ac`, job `lint, typecheck, tests`: `Lint` success, `Typecheck` success, `Tests` success. The other five jobs are `skipped` behind `if: github.event_name != 'push'`, with the reason stated at length in `.github/workflows/checks.yml` — the Actions minutes exhausted on 2026-09-10.
- **The SHA is pushed and equal on local and remote.** `git ls-remote origin claude/virgil-foundation-repair` returns `23af6acf4833640198eecbccccd4ab1c01215ae0`, equal to the reviewed worktree's `HEAD`.
- **Diff within permitted paths.** Three of the five files against base are inside the brief's list. Two are not, and the contract has not been amended by anything I can read. See `KXR-07`; it is the reason this section says what it says rather than a clean tick.

That last item is the one that could have made this `INSUFFICIENT_EVIDENCE`, and I decided it does not. Both exceptions are named in the candidate's own record with the authority claimed for each, one of them resolves a contradiction internal to the contract — the brief demands a run record and its permitted-paths list gives no path for one — and neither file changes any behaviour. Withholding a review over a documentation path the brief itself forced would report a defect that is not there. The gap is real, it is the owner's, and it is recorded below as a finding rather than dissolved into a tick.

## The five findings, checked one at a time

### KXR-01 — an owner approval no repository record supports — **addressed, by the second of the two remedies it named**

The finding gave the owner two ways to close it: file the decision record, or correct the sentence to say what actually authorises it. The second was taken.

`docs/process/FINDINGS.md` now reads: *"`XR` and `KXR` were approved by the owner in the owner console on 2026-09-12, and no decision record is filed for either. This sentence is the only trace of that approval in the repository."* It then names `KXR-01`, explains that the owner console is outside the repository so its absence here proves the record missing and not the instruction, points at `OD-0006` for the mechanism that would close the gap, and quotes that record's own stated cost.

Checked rather than read: `docs/decisions/` holds `OD-0001` to `OD-0014` and ten ADRs, and none is dated 2026-09-12 or mentions `XR`. Grepping the whole tree for `2026-09-12` returns three files — `FINDINGS.md`, `FOUNDATION_REPAIR_RUN_RECORD.md` and the brief — all added by this branch. So the condition the finding described is unchanged; what changed is that the file now says so in the place a reader looks, instead of asserting an approval a reader cannot check.

That is the most a session can do, and it is the right shape. The remedy that would actually close it remains the owner's alone.

### KXR-02 — a row could be deleted from the register in silence — **repaired, and proved in both directions**

`PINNED` in `apps/mission-control/test/findings-register.test.ts` names all seventeen ids the register carries, and two tests read it in opposite directions. I did not replay the builder's mutations.

**A pinned row deleted.** The builder removed `KP2-08`, `KP3-11`, `XR-01` and `XR-02`. I removed a different four — `KP2-14`, `KP3-06`, `KXR-04` and `KXR-05`, two of them rows this very candidate added:

```
× still carries every finding it has ever carried
AssertionError: findings dropped from the register: KP2-14, KP3-06, KXR-04, KXR-05.
REVIEW_POLICY.md: findings are never renumbered, merged silently or dropped. If one
genuinely should go, delete it from PINNED in the same commit so the removal is in the diff.

Tests  1 failed | 61 passed (62)
```

**A row nothing pins.** I added `QQ-42` to the table and not to `PINNED`:

```
× has a row for everything pinned, and pins everything it has
AssertionError: rows in the register that nothing holds in place: QQ-42

Tests  1 failed | 81 passed (82)
```

Both restored; baseline is `78 passed`. Before this candidate the first of those deletions left the suite green at 40 passed, which is what the prior review demonstrated. The guard is real and neither half is one nobody has seen fail.

What it does **not** do, and says it does not: deleting a row from the table *and* from `PINNED` in the same commit passes. I confirmed it — `XR-01` removed from both, `74 passed`, nothing failed. That is the design, stated in the file's own comment: the point is to convert a silent deletion into a visible one, not to make deletion impossible. A file cannot do more than that, and the comment claims no more. See Observation 1.

### KXR-03 — two of the five attributes a finding must have — **not repaired, recorded as open, which is what the finding allowed**

`REVIEW_POLICY.md` line 19 requires identity, severity, affected surface, reproduction evidence and the authority concerned. The register carries identity, status, detector and a pointer. Severity, surface and reproduction are still absent.

It is now row `KXR-03`, status `open`, in the register itself, and `FINDINGS.md` carries a paragraph stating the gap in the file the gap is about. The reason given for not repairing it — that columns for severity and reproduction would have to be inferred for ten historical findings whose text states neither, which is the back-filled guessing the forward-only rule exists to exclude — is the same reason the brief gives for seeding rather than back-filling, and it holds. Closing it properly is a decision about whether new findings must carry all five from now on, and that decision is the owner's.

Recorded honestly. But the row recording it is not itself protected from being marked closed: see `KXR-06`.

### KXR-04 — the proofs lived only in commit messages — **repaired**

`docs/process/FOUNDATION_REPAIR_RUN_RECORD.md` exists, quotes both red-before-green outputs, states what the reviewer did differently, and carries a paths table naming the two files outside the brief's list and the authority claimed for each. It opens by saying it was written by the session that did the building and that a builder's report is not evidence.

I checked its factual claims rather than accepting them. Every figure I could reproduce reproduced: 20 gates against 20 refusal cases counted from the engine, the refusals suite's `2 failed | 21 passed (23)` under a deleted case, the register's baseline, and the lint failure at `57d7829`. The path it occupies is outside the contract: `KXR-07`.

### KXR-05 — CI was red at the intermediate commit and the record did not say so — **repaired, and independently confirmed**

The run record states it, names the cause, and quotes the failure. Both halves check out without taking its word:

- Run `34685933061` on `57d7829`, job `lint, typecheck, tests`: `Lint` **failure**, `Typecheck` and `Tests` `skipped` behind it.
- The file as committed at that SHA, restored into the candidate worktree on its own: `Found 1 error.` / `× Some errors were emitted while running checks.` The same file at the candidate: `Checked 1 file in 5ms. No fixes applied.`, exit 0.

## The brief's four proofs, re-checked at this SHA

Re-run because the candidate is a new SHA, not because the previous review was doubted.

1. **Lint, typecheck and test pass.** In CI on `23af6ac` (run `34689035118`, all three steps success), and again in a clean worktree after `pnpm install --frozen-lockfile`: `biome check .` exit 0, `pnpm typecheck` 8 tasks successful, `pnpm test` **36 files, 1747 tests passed**.
2. **Delete one gate's refusal case.** A third gate, different from both previous sessions': `deploy_authority`. `AssertionError: these gates have never been observed refusing anything: deploy_authority`, and `the number of cases is not the number of gates: expected 19 to be 20`, `Tests 2 failed | 21 passed (23)`. Restored.
3. **A bad row fails.** Covered above by two mutations of my own, plus a fourth: renumbering `KP2-08` to `KP2-80` in both the table and `PINNED` fails, because `ENFORCEMENT_BOUNDARIES.md` does not mention the new id. Renumbering is caught indirectly rather than by design; see Observation 2.
4. **Count the gates.** Enumerated from `packages/gate-engine/src/gates.ts` rather than from the test: 20 gates, 20 refusal cases, one per gate, no gate without a case and no case naming a gate that does not exist.

The test count moved from 1725 to 1747, and the arithmetic accounts for every one: five new register rows × four per-row assertions, plus the two new `PINNED` tests. `refusals.test.ts` is byte-identical to the reviewed candidate, the register test file's diff is +69/−0, and the single deleted line in the whole diff is a sentence in `FINDINGS.md` that was rewritten. No test was removed, skipped or narrowed.

## New findings

Ids are proposed as a continuation of `KXR`, the prefix `FINDINGS.md` records the owner as having approved. I have not entered them in the register: that is a repair, this session was told not to repair one, and `CLAUDE.md` gives each session one hop.

### KXR-06 — a row's *status* can still be changed in silence, including the row that records the register's own gap

**Severity: moderate. Non-blocking. Surface: `apps/mission-control/test/findings-register.test.ts`. Authority concerned: `REVIEW_POLICY.md` line 19; the brief's requirement 2.**

`PINNED` pins that a row exists. Nothing pins what it says. Five rows do have their status held, by `does not read as though recording a gap had closed it` — `KR-03`, `KR-06`, `KR-07`, `KR-09` as `open` and `KR-58` as `caught_not_repaired` — and that list is hard-coded and was not extended when five rows were added.

Reproduction. In the candidate worktree I changed `KXR-03`'s status from `open` to `repaired` and changed nothing else:

```
Tests  78 passed (78)
```

Nothing failed. So the one row in the register that records the register's own incompleteness against `REVIEW_POLICY.md` can be marked closed by a one-word edit, and the suite that exists to make findings un-droppable will agree. `KXR-02` was the same failure one level up: every property of a row checked except the one the policy names. The repair fixed presence and left state, and it is exactly the rows this candidate added — the only `open` one among them — that fall through the gap.

Why this is not blocking. `KXR-02` as raised was about rows vanishing, and rows no longer vanish. The status vocabulary is enforced, the register is honest today, and a flipped status is at least visible in a diff of a governed file. The cheap form of the repair is to extend the existing hard-coded expectation to `KXR-03`; the durable form is to pin each row's status the way `PINNED` pins its existence, which is a design decision with the same trade-off `KXR-02`'s repair had and belongs with whoever closes `KXR-03`.

### KXR-07 — the candidate's diff leaves its own contract's permitted-paths list, and nothing a reviewer can read amended it

**Severity: moderate. Non-blocking. Surface: `docs/process/GATE_PROOF_AND_FINDINGS_BRIEF.md`, and the diff against `91409d0`. Authority concerned: `REVIEW_POLICY.md`, "What review requires"; the brief's "Permitted paths".**

The brief permits `packages/gate-engine/test/**`, `packages/test-fixtures/src/**`, `apps/mission-control/test/**` and `docs/process/FINDINGS.md`, and says that *"anything outside these is out of scope for this work and `diff_within_permitted_paths` should say so."* Two of the five files in the diff are outside it: the brief itself, and `docs/process/FOUNDATION_REPAIR_RUN_RECORD.md`. Run the repository's own gate on the brief's list as written and it refuses this candidate, naming both.

Each is claimed as an owner authorisation, in prose, in documents written by the sessions that benefited from the claim — the same shape as `KXR-01`, now applied to scope instead of identity. The brief's text is unchanged on this branch: its status line still reads *"proposed, not started. Nothing in this document is authority,"* and its permitted-paths list still forbids the file that answers its own demand for a run record.

Why this is not blocking, and why the verdict is not `INSUFFICIENT_EVIDENCE`. The exceptions were declared rather than discovered, in a paths table built for this purpose. One of them resolves a contradiction that is genuinely in the contract and was reported rather than quietly resolved, which is what `CLAUDE.md` requires of a session that finds one. Neither file is code. What is missing is not honesty but an authority a reviewer can read: either an amended brief or a filed decision. Until one exists, "the diff stays within permitted paths" is satisfied here by trusting the candidate about the contract, and a rule that can be satisfied that way decides nothing.

### KXR-08 — the other half of `KXR-01` is unrepaired and now recorded nowhere

**Severity: minor. Non-blocking. Surface: `docs/process/FINDINGS.md`, rows `XR-01` and `XR-02`. Authority concerned: `KXR-01` as raised.**

`KXR-01` made a second point beside the approval sentence: the register's two newest rows point at a document that says of itself *"Nothing in this document is authority"*, and the check that a pointer must name its finding is satisfied there by the sentence **requesting approval** of those very ids — *"Either approve a new prefix — `XR-01` for the gates, `XR-02` for the register"*. The brief's "What I need from you" still reads as three open questions the work has since answered.

Nothing about that changed, and it is not mentioned in the run record's account of `KXR-01` or anywhere else, so the only trace of it left is the prior review on a different branch. `XR-01` and `XR-02` read `repaired` while their evidence pointer disclaims being anything.

Why this is minor. A pointer is evidence, not authority, and the pointed-at text does describe both findings accurately — that is the property the check is after. No reader is misled about what was found. This is raised so the point survives, since `KXR-01` is now marked `repaired` and a reader of the register will not find this part of it anywhere.

## Observations, which are not findings

1. **What `PINNED` can and cannot be.** Deleting a row from the table and from `PINNED` in one commit passes (`74 passed`, verified). The file says so plainly and claims only to convert a silent deletion into a visible one. Recorded so a later reader does not mistake the guard for something stronger, and so nobody re-raises it as a defect.

2. **Renumbering is caught, but by accident.** `KP2-08` → `KP2-80` in both places fails, because the pointed-at document does not mention the new id. That protection exists only for rows whose pointer lives outside the changing branch. The five `KXR-*` rows point at `FOUNDATION_REPAIR_RUN_RECORD.md`, which a future commit could renumber in the same breath. `REVIEW_POLICY.md` forbids renumbering explicitly and nothing in the register enforces it directly.

3. **The unfiled decisions of 2026-09-12 are now six, not two.** The run record enumerates them itself — the `XR` prefix, the forward-only seeding, the branch name, the build-and-review split, the `KXR` prefix and the run record's path — and states that none is filed as an `OD-*`. That is the honest handling and it is why this is an observation. It is worth a reader's attention that the number grew across one day of work, and that `OD-0006` describes a mechanism whose only detection of a false record is the owner reading their own.

4. **The run record's name sits one word from an existing file.** `docs/process/FOUNDATION_REPAIR_RUN_RECORD.md` beside `docs/process/PHASE_0_FOUNDATION_REPAIR_RUN_RECORD.md`, which records different work. No consequence; a reader searching for one will find both.

5. **Nothing in the engine changed.** No file under `packages/gate-engine/src/` is touched by any commit on this branch, and the twenty gates still refuse only fixtures. `ENFORCEMENT_BOUNDARIES.md` records that no adapter feeds them, so a green refusals suite still proves that a gate *can* refuse given evidence and nothing about evidence arriving. The register states this correctly and the detector column still reads `review` for all seventeen rows.

## Verdict

**`PASS_WITH_NON_BLOCKING_FINDINGS`.**

`KXR-02` is repaired and I drove both halves of the repair red with inputs the builder did not use. `KXR-04` and `KXR-05` are repaired, and every figure in the new run record that I could reproduce, reproduced. `KXR-03` is open and recorded as open, for a reason that holds. `KXR-01` is addressed by the one of its two remedies a session is permitted to perform, and the remedy that would close it stays with the owner.

Three findings are new. `KXR-06` is the one with code behind it and the cheapest to close. `KXR-07` and `KXR-08` are about authority a reviewer can read, which is the same thing `KXR-01` was about, and the owner is the only one who can close either.

`PASS_WITH_NON_BLOCKING_FINDINGS` is not `SAFE_TO_MERGE` — `constitution/STATE_LANGUAGE.md` — and nothing here is a recommendation to merge.
