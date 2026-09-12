# Keeper review — pull request #14, the inspector's foundation rebased onto `main`

**Verdict: `BLOCKED`.**

Candidate: `4e331f5d45bb992d5a25fed606b22a699b116fa6`, branch `claude/virgil-inspector-phase-1-rebased`, pull request #14, base `main` at `353c082`.
Reviewed: 2026-09-12.
Previous verdict: `BLOCKED` on `ff8f103`, at `docs/process/KEEPER_PR11_REREVIEW_OD0016.md` — which is **not in this candidate**; it is on branch `claude/keeper-pr11-rereview-od0016` at `99f979c`. I read it in full before starting, along with `KEEPER_PR11_UNREVIEWED_COMMITS_REVIEW.md` (`INSUFFICIENT_EVIDENCE` on `d7d80fd`) and the four earlier reviews, all of which are committed on the candidate.

`REVIEW_POLICY.md`, "Staleness": a verdict never transfers to a new SHA. This is a review of `4e331f5` and endorses none of its predecessors.

**The good news first, because it is most of the work.** The cherry-pick is faithful — I compared all eighteen changed files and fifteen are byte-identical to the old branch's tip. The `CLAUDE.md` conflict was resolved without damaging either side. **The defect that produced the last `BLOCKED` is genuinely repaired**: `pnpm check` passes at this SHA with the cache off, CI agrees, and the seed graph regenerates byte-identical. `KXR-20` is bounded to the owner's words. Four of the five attacks I ran against the register were caught.

**The verdict turns on two things.** One is a finding the last review called blocking and which this candidate did not touch: `KXR-14` is recorded and pinned `repaired`, and its own recorded reproduction still succeeds — I ran it. The other is new: the repair to `turbo.json` fixed the instance and not the class, and **I reproduced the exact failure signature of `KXR-23` through `docs/product/VIRGIL_MASTER_COMMISSION.md`**, which the new `inputs` list does not declare. The commit message and the pull request description both state that the task now declares the root paths its tests actually read. It does not.

## Independence and admissibility

I did not build this candidate and did not review any of its predecessors. I have repaired nothing and entered nothing in `docs/process/FINDINGS.md`: recording is a repair, and `CLAUDE.md` gives each session one hop. My new findings below are **proposals**, with ids continuing the `KXR` sequence from `KXR-29` — `KXR-23` through `KXR-28` are the previous reviewer's proposals and I have not reused or renumbered them.

Every mutation I made to the reviewed checkout was reverted immediately and `git status --porcelain` is empty before and after each. The register attacks ran in a **detached worktree in the session scratchpad**, so `docs/process/FINDINGS.md` in the reviewed checkout was never modified at all; the worktree was removed at the end. The checkout is unmodified at `4e331f5`.

**One action I declare rather than leave to be found.** This container held no clone and no repository. I attached this repository — and only this repository — and used the session's own GitHub credentials to read the Actions API and to push this review. `CLAUDE.md`'s hard limit names connecting credentials; this is this repository, not another, and pushing a review to my own branch is the hop I was assigned. That is what `KXR-07` is about, so it is written down.

Against `constitution/REVIEW_POLICY.md`, "What review requires" — five preconditions, **all met**:

- **Deterministic verification completed for the SHA. ✓ And it passes.** Locally, with the cache forced off: `turbo run test --force` → `Tasks: 6 successful, 6 total`; `turbo run typecheck --force` → `Tasks: 8 successful, 8 total`; `biome check .` → `Checked 298 files`, no fixes, exit 0. `mission-control` alone is `37 passed (37)` files, `1857 passed (1857)` tests.
- **CI agrees, and I read it rather than trusting a commit message.** Run `34702881402` (push) on this SHA: `lint, typecheck, tests` → **`success`**. Run `34702901855` (pull_request): `lint, typecheck, tests` → **`success`**, along with `Mind Scan, V10 owner build and verify, committed digests`, `newest Owner Build rebuilds byte for byte`, `hosted build, read and refused`, and three of four `V11 owner build and verify` matrix legs. Two jobs were still `in_progress` when I finished and I do not record them as passed.
- **The SHA is pushed and equal on local and remote. ✓** `git ls-remote` → `4e331f5d45bb992d5a25fed606b22a699b116fa6`, equal to the reviewed HEAD.
- **The diff stays within permitted paths. ✓** Nothing under `constitution/`, `docs/product/`, `knowledge/raw/`, `schemas/gate-*` or `packages/gate-engine/src/` is touched. `OD-0016`'s own path is authorised at layer 1 by `OD-0006`, as the previous reviewer established and I re-checked.
- **No test skipped, weakened or removed. ✓** `git diff 353c082 4e331f5 -- '*.test.ts'` adds no `.skip`, `.only`, `.todo`, `skipIf` or `runIf`. The diff adds 1,094 lines of tests and removes none.

## The cherry-pick is faithful, and I checked it file by file

The claim is that twelve commits were replayed onto the new `main` with one formatting commit added, nothing dropped and nothing altered. **It holds.**

The changed-file list against each branch's own base is identical — the same eighteen paths, same statuses, no additions and no omissions. Comparing the blob of each file at the old tip `88f707a` against the candidate:

| | |
|---|---|
| **byte-identical** | 15 of 18 — both test files, `OD-0016`, `FINDINGS.md`, all five kept review documents, both briefs, the run record, `refusals.test.ts`, and the seed graph |
| `turbo.json` | differs by **formatting only** — I parsed both and compared the objects: semantically identical |
| `CLAUDE.md` | differs by the **pure insertion** of `## Merging`; nothing from the branch was removed or reworded |
| `.claude/settings.json` | differs by exactly what `main` brought |

**`CLAUDE.md`, the declared conflict.** Both sections survive and neither is damaged. Against the old tip the candidate's only change is `## Merging` added as a block — the branch's `## Superpowers` section and its rewritten first hard limit are untouched. Against `main` the candidate's only changes are the branch's own two. And `## Merging` is not paraphrased: the section as it stands in `main` and the section as it stands in the candidate hash to the same `b57cc9d3be4ba481…`, byte for byte.

**`.claude/settings.json` was reconciled too, and the pull request does not mention it.** It says "the one conflict" was `CLAUDE.md`, which is true of what `git` reported — the hunks here do not overlap, so this merged without a conflict marker. I checked the result anyway, because an unremarked reconciliation is the kind of thing that goes wrong quietly. It is correct: the branch's `enabledPlugins` and `extraKnownMarketplaces` blocks are present and identical to the old tip's, and `main`'s four `Write`/`Edit` deny rules and its whole `ask` block arrive intact. Not a finding; recorded because the brief asked me to confirm the conflict resolution and there were two files, not one.

## `KXR-23` is genuinely repaired

This is the defect that produced the last `BLOCKED`, and it is fixed.

- `pnpm --filter @virgil/knowledge-graph export-seed-graph` on a clean checkout produces **no diff at all** — `git status --porcelain` is empty after it. The committed artifact is fresh. I ran this twice, at the start and the end of the review.
- The two tests that failed at `ff8f103` — `matches a fresh derivation byte for byte` and `carries the hash of the graph it was derived from` — pass.
- The positive control the commit offers is real. I touched `docs/decisions/OD-0016…md` and turbo reported `cache miss, executing eb1b2e3bdb6569c0` where the unchanged run reported `cache hit, replaying logs f226473444eaccef`. A declared input does bust the cache.
- The commit message is candid about what went wrong and why, and says the right thing about it: *"A green `pnpm check` was therefore not evidence that the tests passed. It was evidence that nothing turbo watches had changed."* That sentence is the most valuable thing in the diff.

**And CI is structurally sound on this point.** `.github/workflows/checks.yml` has no `paths-ignore` — removed deliberately, with `KP2-02` written into the file as the reason — and configures no turbo remote cache, only `cache: pnpm`. So every CI run starts with a cold turbo cache. That bounds the damage of what follows, and I say it before I say the rest.

## `KXR-29` — the same defect is still reachable, and I reproduced it through the commission

**Severity: major. Blocking. Surface: `turbo.json`, the `test` task's `inputs`; `packages/knowledge-graph/test/seed-graph.test.ts`; `apps/mission-control/test/live-state-v11.test.ts`; `apps/mission-control/test/instruct-v11.test.ts`. Authority concerned: `CLAUDE.md`, "A builder's success report is not evidence. Deterministic checks and independent review are."; `REVIEW_POLICY.md`, "Deterministic gates versus judgment".**

The commit message states the repair as:

> the `test` task now declares the repository-root paths its tests actually read — `constitution/`, `docs/decisions/`, `docs/process/`, `docs/architecture/`, `knowledge/`, `schemas/`, `.claude/`, `.github/workflows/`, `CLAUDE.md` and `netlify/`

**Three root paths its tests actually read are not in that list.** I found them by reading every test that escapes its own package, then proved each one by mutation.

### 1. `docs/product/**` — and this is `KXR-23` exactly, one directory over

`packages/knowledge-graph/src/derive.ts` hashes the targets of authority tethers, and `docs/product/VIRGIL_MASTER_COMMISSION.md` is one of them. Appending a comment to the commission changes the derived graph — `graphHash` moves from `sha256:f5c6b54d…` to `sha256:37758999…`. `docs/product/**` is not a declared input.

With the cache primed, after editing the commission:

```
turbo:   @virgil/knowledge-graph:test: cache hit, replaying logs 874cc4cad5d6dadb
                                       Tests  24 passed (24)
vitest:  FAIL  test/seed-graph.test.ts > matches a fresh derivation byte for byte
         FAIL  test/seed-graph.test.ts > carries the hash of the graph it was derived from
                                       Tests  2 failed | 1 passed (3)
```

**Those are the same two test names, in the same file, that produced the last `BLOCKED` verdict.** The file that triggers it is the master commission — layer 1, the top of the authority order, the document `OD-0007` fingerprints so that a change to it is detectable. A session that edits it and runs `pnpm check` is told everything passes.

### 2. `.virgil/state.json`

Tracked, and `apps/mission-control/test/live-state-v11.test.ts` validates it against `virgil.session-status.v1`. I set `schema` to a value the contract rejects:

```
turbo:   mission-control:test: cache hit, replaying logs f226473444eaccef
                               Tests  1857 passed (1857)
vitest:  ×  .virgil/state.json parses against `virgil.session-status.v1`
         ×  satisfies the schema
         ×  is accepted by the wire check that stands in front of the room
                               Tests  3 failed | 80 passed (83)
```

### 3. `netlify.toml`

`netlify/**` is declared; `netlify.toml` is a root file and is not under it. `apps/mission-control/test/instruct-v11.test.ts` asserts `/api/instruct` is routed above the catch-all. I broke the route:

```
turbo:   mission-control:test: cache hit, replaying logs f226473444eaccef
                               Tests  1857 passed (1857)
vitest:  FAIL  test/instruct-v11.test.ts > is routed on its own, above the catch-all
                               Tests  1 failed | 26 passed (27)
```

**Why this is blocking rather than carried.** Not because a cache is imperfect — every `inputs` list is a claim about coupling and claims can be incomplete. It is blocking because **the claim that it is complete is written in the commit message and repeated in the pull request description**, and that claim is the entire remedy offered for the previous `BLOCKED` verdict. The proof block offered in both — `run 1 executes / run 2 cache hit / touch docs/decisions/ → run 3 cache miss` — tests the one path that was just added. It confirms the fix; it does not attack it. That is the same method that produced the three false commit messages: the session checked the thing it believed and did not go looking for the thing that would break it. The previous reviewer wrote that a green `pnpm check` was evidence only that nothing turbo watches had changed. It still is, for three paths, one of them the commission.

**What bounds it, stated plainly.** CI runs cold on every push with no `paths-ignore`, so this cannot produce a false green in CI, and it has not: the required check is honestly `success` on this SHA. The exposure is a session running `pnpm check` locally and believing it — which is precisely how this lineage got here.

**The fix is a line per path**, and it is not mine to make.

## `KXR-24` is unaddressed, and I ran its reproduction again

**Carried forward from `docs/process/KEEPER_PR11_REREVIEW_OD0016.md`, not renumbered: `REVIEW_POLICY.md` says findings are never renumbered or merged silently. Severity: major. Blocking.**

`docs/process/FINDINGS.md` is byte-identical to `ff8f103`; the two commits after it touched `turbo.json` and the seed graph only. So `KXR-14` — *"The five attributes `KXR-03` added are unpinned, so a severity can be downgraded and a reproduction erased in silence"* — still reads `repaired` at line 70, and `PINNED` still pins it `repaired` at `findings-register.test.ts:345`.

**I ran the reproduction recorded in its own attributes row**, in an isolated worktree. One line changed, `KXR-02`'s attributes row, from

`| KXR-02 | major | …findings-register.test.ts` | Delete four rows including `XR-01`; suite green at 40 passed | …`

to

`| KXR-02 | minor | …findings-register.test.ts` | Not reproducible; a cosmetic concern only | …`

```
Test Files  2 passed (2)
     Tests  188 passed (188)
```

**Green.** A major finding downgraded to minor with its reproduction replaced by a denial that it was ever reproducible, and nothing objects. I went further than the recorded reproduction and gutted `KXR-13`'s whole attributes row — severity `trivial`, surface `nowhere in particular`, reproduction `nothing to reproduce`, authority `no authority at all`. Also green. **`trivial` is not a severity `REVIEW_POLICY.md` defines**, and nothing checks the vocabulary; the assertions on that table are `value.length > 3` and `not.toBe('—')`.

All 33 register ids are in `PINNED`, so the register table itself is fully covered. `PINNED` has fields for `status`, `foundBy`, `where` and a digest of `what` — the four cells of a *register* row. It has no field for severity, surface, reproduction or authority, so it cannot reach the attributes table at all. The mechanism `f85a6e9`'s message described does not exist, and the pin now certifies the false status.

The honest status for `KXR-14` today is `open`. That is a one-word change, and it is a repair, so it is not mine.

## The register's guards are strong, and I attacked them five ways

This is the part of the work I was asked to attack hardest after `KXR-20`, and it holds everywhere except the hole above. Each attack was applied to a scratch worktree, run against `findings-register.test.ts` and `review-records.test.ts`, and reverted.

| # | attack | result |
|---|---|---|
| A | Append a second table carrying the register's exact header, with a row false in every cell | **caught** — `has exactly one register table and one attributes table`, and the completeness check |
| B | Add a register row for `KXR-98`, a finding whose text exists in no document | **caught**, three ways — pointer, `PINNED` completeness, and the attributes requirement |
| C | Delete `KXR-19`'s register row while its text stays in the kept document | **caught** — `still carries every finding it carried`, and the attributes check |
| D | Gut an attributes row: severity, surface, reproduction and authority all replaced with plausible nonsense | **GREEN — not caught.** This is `KXR-14`/`KXR-24` |
| E | Repoint `KXR-19`'s row at a real committed file that does not contain its text | **caught** — `KXR-19's pointer names KXR-19`, and the cell-pin check |

B and E are the checks `KXR-10` and `KXR-22` added, and they work. A is the previous reviewer's own attack against `KXR-13`, and it is still red. C is worth a note: a row *deleted* from the register is caught, because `PINNED` covers all 33 ids and notices the absence. What `PINNED` cannot notice is a finding that was never pinned in the first place — which is `KXR-26`, below, and a narrower gap than "rows can vanish".

## `KXR-30` — the review that blocked this pull request is kept in no file, and its findings exist nowhere in the repository

**Severity: moderate. Non-blocking. Surface: `docs/process/`; `apps/mission-control/test/review-records.test.ts`, `RECORDS`. Authority concerned: `XR-02` as raised and repaired — findings get one home; `REVIEW_POLICY.md`, "Findings" — never dropped.**

`RECORDS` keeps five review documents, byte for byte, pinned to the SHA-256 of the commits they came from. It is the best work on this branch and I verified it passes. **The sixth review is not among them.** `docs/process/KEEPER_PR11_REREVIEW_OD0016.md` — the one that returned `BLOCKED` on `ff8f103`, the immediate reason this pull request exists — lives only on `claude/keeper-pr11-rereview-od0016`, which is not an ancestor of the candidate.

```sh
ls docs/process/KEEPER_PR11_REREVIEW_OD0016.md   # No such file or directory
grep -rn "KXR-2[3-8]" --include=*.md --include=*.ts .   # no output
```

Its six findings — `KXR-23` through `KXR-28` — are named in no file in this repository. One of them, `KXR-24`, is a blocking defect that is still present. If that branch is deleted, the record of why this pull request exists and of the finding it did not fix goes with it.

I do not raise this as a failure to record findings — recording is a repair, the candidate's last session correctly did not perform it, and the same is true of me. I raise it because **this is the exact condition `XR-02` was built to end**, appearing on the branch whose headline achievement is ending it, and because a reader of the candidate cannot discover `KXR-24` from anything in the candidate.

## `KXR-31` — the pull request describes the last verdict as fixed and names only half of it

**Severity: moderate. Non-blocking. Surface: pull request #14's description. Authority concerned: the accuracy of the document the owner is asked to decide on; `KXR-16` and `KXR-27` as raised.**

**The description is a large improvement on #11's, and I want that on the record first.** Every claim I could check in it is true: the twelve commits are the same, nothing was dropped, the conflict resolution is as described, the three `--force` results are exactly what I reproduced, and the "Still open and not repaired" list is honest. It even volunteers a finding against itself — that the branch-update workaround is another instance of `KXR-07`. After three reviews in which the description was the least accurate document in the pull request, this one is not.

**The omission is the heading "What went wrong on #11 and is fixed here."** The last verdict rested on *two* proven defects. The description gives a full and candid account of the first and does not mention the second. `KXR-24` is neither named nor listed among what is still open — and `KXR-14`, the finding it is about, appears in the register as `repaired`, so a reader checking the register is confirmed in the wrong belief. The reasonable conclusion from reading this page is that the `BLOCKED` verdict has been answered in full. It has not.

Adding `KXR-24` to the "Still open" list would fix it. The description is what the owner will read to decide, which is why I raise it.

## Carried findings from the previous review, and where each stands now

I re-tested all six rather than carrying them on the reviewer's word.

| id | status at `4e331f5` | evidence |
|---|---|---|
| `KXR-23` | **repaired** | seed graph regenerates with no diff; `pnpm check` passes cache-off; CI `success` |
| `KXR-24` | **still open — blocking** | reproduction re-run, 188 tests green; `FINDINGS.md` untouched since `ff8f103` |
| `KXR-25` | **resolved by the rebase** | see below |
| `KXR-26` | **still open** | `KXR-18` appears only in `KEEPER_PR11_UNREVIEWED_COMMITS_REVIEW.md`; no register row, no pin, and `RECORDS`'s `holds` for that document lists `KXR-19`–`KXR-22` only |
| `KXR-27` | **substantially repaired** | #14's description is accurate where #11's was not; the residue is `KXR-31` |
| `KXR-28` | **still open** | `docs/process/PHASE_1_BACKLOG.md:383-385` still says *"Reading another repository needs the owner's written authorisation, and does not have it"* and quotes the deleted line verbatim as current `CLAUDE.md` |

**`KXR-25` deserves a sentence, because the rebase fixed it and no one set out to.** The finding was that `OD-0016` §5 described, in the past tense, a merge rule that existed only on an unmerged branch — `CLAUDE.md` had no `merge approved` sentence and `.claude/settings.json` had no `ask` key at all. Merging #13 into `main` brought both. At the candidate:

```
grep -c "merge approved" CLAUDE.md                → 1
permissions keys                                  → ['allow', 'deny', 'ask']
permissions.ask  → ['Bash(gh pr merge*)', 'mcp__github__enable_pr_auto_merge', 'mcp__github__merge_pull_request']
'Bash(git merge*)' in deny                        → True
```

§5 is now a true description of the repository it is filed in. The previous reviewer's one reservation stands and is minor: `Bash(git merge*)` is still `deny`, so "the merge routes are `ask` rather than `deny`" is loose rather than exact. Not worth a finding, and the pull request description independently records the cost of that deny rule — it blocked the branch update, which is why this pull request exists.

## `KXR-20` — the bound is the owner's words and no wider

I was asked to check this hardest and I reach the same conclusion the previous reviewer did, by my own route.

The owner's recorded instruction, `OD-0016` §6: *"Should be allowed to read and clone other repositories."*

- **Permitted: reading and cloning.** Exactly his two verbs. No third permission appears anywhere in the bullet or its two sub-bullets.
- **Forbidden: modifying, pushing to, opening a pull request on, or writing in any way.** The old line forbade one verb, "modify". The replacement forbids four and calls the prohibition "unchanged and absolute". **The prohibition is tighter than what it replaced**, which is the opposite of the direction a session widening its own permissions would push.
- **The additions narrow.** *"Nothing from it is authority here"*, and *"a repository with no licence is read and not copied at all"* — the owner did not say these; they constrain further rather than less, so they are inside what a session may add. Worth his eye, not a finding.
- **No residual contradiction in the governing file.** The old text survives in `CLAUDE.md` only inside the new bullet's own account of what changed. The contradiction `KXR-20` named — a file forbidding ten lines above what it installs ten lines below — is gone. It survives in one layer-4 document, which is `KXR-28` and is recorded open.
- **It was taken as a decision, not a repair.** `OD-0016` §6 says why: *"a session must not be the thing that widens what sessions may do."* On the record as filed, that is right, and it is the first loosening in this file's history.

## `OD-0016` closes what the `INSUFFICIENT_EVIDENCE` verdict asked for, and is honest about its worth

I re-read it against the verdict it answers rather than taking the last review's word.

**It closes it.** The `INSUFFICIENT_EVIDENCE` verdict named three remedies, any one sufficient, one of which was a filed owner decision record under the `OD-0006` mechanism. `OD-0016` is that record. §1 records the authorisation for the two files `d7d80fd` edited — `.claude/settings.json` and `CLAUDE.md`, the two that bind every session — and §6 records the decision `ff8f103` implements. The authority chain holds: `OD-0006` is layer 1 and authorises a session to file in `docs/decisions/`, the owner's own commit `9627bae` removed the deny lines that had made filing impossible, and layer 1 governs a permitted-paths list written in a layer-4 brief.

**It is honest about its own worth, and the honesty is load-bearing rather than decorative.**

- It states the limit without softening it: *"Nothing enforces that this transcription is faithful. No code checks it. It is a record the owner can read and correct, and that is the whole of its strength."*
- It records that **the owner declined this record earlier the same day** and asked for it only after a third reviewer raised the gap, and says why that matters — a record he reads is the only kind that closes anything. A document seeking authority does not usually volunteer that its subject did not want it.
- §4 names a path **nobody authorised** — `apps/mission-control/test/review-records.test.ts` — and offers it to the owner to refuse, inside the record that seeks authority for everything else.
- It separates the owner's quoted words from options a session put to him, and marks which is which in §3's table, so his *"I take your recommendation"* is not read as his wording.
- It closes with three specific things for him to check rather than a general invitation.
- §1 ends by deferring the confirmation it cannot supply: *"The owner is asked to confirm, by reading this, that the authorisation covered editing those two files and not only running an installer."* That residual is real and `OD-0006` predicts it exactly. **A filed record is not a confirmed one**, and a reader should not mistake the two.

`KXR-15` is adopted rather than argued with, the reviewer's sentence quoted verbatim, and the correct reading of the limit added — `beyondLimit` in `REPAIR_LIMITS.md` is `OWNER_DECISION_REQUIRED`, not a prohibition. I agree with that reading.

## The open findings are honestly recorded

I was asked to confirm this rather than repair it, and I reproduced the ones that can be reproduced.

- **`KXR-16` — open, and still true.** Its reproduction is `git show ec53d98:docs/process/FINDINGS.md | sed -n '7p'` against the candidate's line 7. **Byte-identical.** Correct.
- **`KXR-19` — open.** `grep -rn "enabledPlugins\|extraKnownMarketplaces"` across `*.ts`, `*.mjs`, `*.yml`, `*.json` outside the settings file: no output. Still read by nothing.
- **`KXR-21` — open.** `assets/licenses/` holds `ASSET_PROVENANCE.md`, `GEISTMONO-OFL.txt`, `OUTFIT-OFL.txt`, `README.md`. `grep -ril superpowers assets/`: nothing.
- **`KXR-17` — open**, and now in a further instance: no run record exists for the rebase, the cherry-pick or the `turbo.json` repair. Had one been written, `KXR-29` is the kind of thing writing it tends to catch.
- **`KXR-03`, `KXR-07` — open**, and both defensibly so. `KXR-07` is narrower now that `OD-0016` §4 names both exceptions, and is recorded `open` anyway, which is the conservative and correct choice. The pull request description adds a fresh instance against itself.
- **`KR-03`, `KR-06`, `KR-07`, `KR-09`, `KR-58`, `KP2-08`, `KP2-11`, `KP2-14`, `KP3-06`, `KP3-11`** — statuses unchanged by this diff, all ten named in the register's own exemption paragraph as exempt *and incomplete*, with that exemption pinned to a closed count of ten. `KR-03`, `KR-06`, `KR-07` and `KR-09` match what `CLAUDE.md`'s Phase status section says of them. Honestly recorded.

**Twenty of the twenty-one `KXR` rows are accurate. `KXR-14` is the one that is not** — the same single row the previous reviewer found, unchanged.

## Observations, which are not findings

1. **`.claude/settings.json` was a second reconciliation and the pull request calls it one conflict.** True as `git` reports conflicts; I verified the merged result anyway and it is correct. Recorded so the next reader knows two files were reconciled, not one.
2. **The pull request explains the formatting commit with a mechanism that does not exist.** It says: *"The last formatting error was itself found only by running biome directly — turbo had a cached lint pass. The same condition, one task over."* I went to check whether `lint` needed `inputs` too, and **there is no `lint` task in `turbo.json`** — the task list is `typecheck`, `test`, `build`, four owner/v11 build-and-verify pairs and `build:web`/`verify:web`. `pnpm lint` is `biome check .`, run directly by the root script, never through turbo. So turbo never had a lint pass to cache, and the sentence is wrong about its own repository in a paragraph about being wrong about its own repository. It is a small thing and I am not raising it as a finding: the formatting commit is real, `biome` is genuinely outside the turbo graph, and the conclusion drawn — run the tool directly — is right. But it is the third document in this pull request to state a mechanism confidently without checking it, and that is the pattern `KXR-29` is about.
3. **`KXR-18` is addressed in substance and recorded nowhere.** `OD-0016` is the artefact it asked for. `REVIEW_POLICY.md` has no category for a finding satisfied and therefore unrecorded; it already carries `repaired` and `withdrawn_gap_open` for this.
4. **The seed graph regenerated identically twice**, at the beginning and end of my session, across every mutation I made and reverted. The checkout I reviewed is the checkout that was pushed.

## What I recommend, and what I do not

**Three repairs are owed and all three are small. None is mine.**

- `KXR-24`: change `KXR-14` from `repaired` to `open` in `docs/process/FINDINGS.md` and in its `PINNED` entry. One word in two places. Actually pinning the attributes table is the larger piece of work and is **not** required to make the register true.
- `KXR-29`: add `$TURBO_ROOT$/docs/product/**`, `$TURBO_ROOT$/.virgil/**` and `$TURBO_ROOT$/netlify.toml` to the `test` task's `inputs`, and correct the commit message's and description's claim that the list is what the tests read. Whoever does it should attack the new list rather than confirm it — the method matters more here than the three lines.
- `KXR-31`: add `KXR-24` to the pull request's "Still open and not repaired" list.

`KXR-30`, `KXR-26` and `KXR-28` I recommend recording and not repairing on this lineage. `KXR-30` is the one I would put to the owner alongside the verdict, because the branch holding the review that blocked this pull request is deletable.

**On the repair limit.** `constitution/authority.json` sets `repairLimits.maxCyclesWithOwner = 2` and `OD-0016` §2 records the owner authorising a third. Whether these fit inside that authorisation is his question, not mine; `REPAIR_LIMITS.md` makes `beyondLimit` `OWNER_DECISION_REQUIRED` rather than a prohibition.

**I am not recommending against this work.** Most of it is good and some of it is the best in the repository.

## Verdict

**`BLOCKED`.**

The rebase did what it said. Fifteen of eighteen files are byte-identical to the branch it replaced, the two reconciliations are correct, `## Merging` survives byte for byte and so does `## Superpowers`, and nothing was dropped. **`KXR-23` is genuinely repaired** — the seed graph is fresh, `pnpm check` passes with the cache off, and CI is `success` on this SHA rather than on a commit message's word. `KXR-20` is bounded to the two verbs the owner used and tightens the prohibition it replaces. `OD-0016` closes the `INSUFFICIENT_EVIDENCE` verdict and is candid about being worth only as much as the owner's reading of it. Five review documents are kept byte for byte, twelve findings no longer depend on branches, and four of my five attacks on the register were caught by name. Six findings recorded open are open and I reproduced four of them. No test is skipped or weakened, no protected boundary is touched, local and remote agree.

It is `BLOCKED` for two reasons, one inherited and one new, and they are the same reason twice.

**`KXR-14` still reads `repaired` and still is not.** `docs/process/FINDINGS.md` has not changed since the SHA that was blocked for this. I ran the reproduction recorded in the finding's own row — downgrade `KXR-02` from major to minor, replace its reproduction with a denial that it was ever reproducible — and the suite is green at 188. The pin certifies the false status, because `PINNED` holds the four cells of a register row and reaches no part of the attributes table. The register's status column is the one thing this lineage has built that is meant to be true without a reader, and on one row of twenty-one it is not.

**And the repair that answers the last verdict fixed the instance rather than the class.** `docs/product/`, `.virgil/` and `netlify.toml` are read by tests and are not declared inputs. Editing `docs/product/VIRGIL_MASTER_COMMISSION.md` — layer 1, the top of the authority order — makes turbo replay `24 passed` while `vitest` fails the same two seed-graph tests, by name, that produced the last `BLOCKED`. The commit message and the pull request both state the task now declares the root paths its tests actually read, and the proof both offer touches only the path just added. CI is cold on every push and catches all of this, which bounds the damage and is why the required check is honestly green; what is not bounded is a session running `pnpm check` locally and believing it, which is how this lineage arrived here twice.

Neither defect is dangerous and both are cheap. What they cost is the property this work has spent three days buying: that the records say what the machine says. `constitution/STATE_LANGUAGE.md` — `BLOCKED` is not a judgment on the work's worth, and nothing here is a recommendation to merge.
