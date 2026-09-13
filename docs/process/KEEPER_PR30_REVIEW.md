# Keeper review of pull request #30, candidate `6dec9f6f`

**Captured verbatim on 2026-09-13** from [comment 5653492178](https://github.com/dniachini-droid/Virgil-mission-control/pull/30#issuecomment-5653492178) on pull request
#30. It judged candidate `6dec9f6f0bd6eaf5b12ab68153cf04f8de2c0b09`.

**Nothing below the rule is edited.** Figures that have since gone stale and
statements this repository has since corrected stand exactly as they were
written: a review is a record of what someone found at a moment, and a record
edited afterwards is not a record.

**One substitution, declared here and applied 2 times below, and it is the
only departure from the comment's bytes.** Where the review wrote a
doubled-square-bracket lesson link, this capture writes `⟦id⟧` instead. Nothing
else is altered — not a character, not a count, not an exit code. The rule is
mechanical and reverses exactly: replace every `⟦` with `[[` and every `⟧` with
`]]` and you have the comment as posted.

**The reason is a finding this very document raises.** ``KXR-49/PR27`` records that the
link scan cannot tell a discussed lesson link from a made one, so a review
quoting dangling links verbatim becomes that many blocking findings against the
review. `docs/process/KNOWLEDGE_LESSONS_RUN_RECORD.md` made the same
substitution for the same reason and declared it the same way. The alternative
was to teach the scan to skip quoted syntax, which is a repair, and filing is
not repairing.

---

**Keeper review — candidate `6dec9f6f0bd6eaf5b12ab68153cf04f8de2c0b09`**

**`PASS_WITH_NON_BLOCKING_FINDINGS`** — `6dec9f6f0bd6eaf5b12ab68153cf04f8de2c0b09`

Independent review, read-only. I had no part in building or replaying this candidate and will have no part in repairing it. This is not a decision, it approves nothing, and **it does not propose a merge** — that is the owner's, by writing `merge approved` and naming this pull request.

| | |
|---|---|
| candidate head | `6dec9f6f0bd6eaf5b12ab68153cf04f8de2c0b09` — confirmed with `git rev-parse HEAD` |
| base | `515373fe1d11ed67d5d6361f6bb6991309515de2` (`main`) — confirmed with `git rev-parse origin/main` |
| branch | `claude/knowledge-on-current-main` |
| size | 24 files, 6 commits |
| tier | 3, derived — `pnpm tier` agrees with the description |
| contract | `docs/process/KNOWLEDGE_LESSONS_BRIEF.md` and `docs/decisions/OD-0017-knowledge-lessons-follow-up.md` |
| working tree | clean at the reviewed SHA, before and after every probe |

---

## In plain terms, and this is the sentence to act on

**The replay is faithful and the graph is genuinely regenerated.** Twenty of the twenty-one files that make up this work are byte-for-byte identical to the versions two reviewers already passed — not similar, identical, same content fingerprint. The twenty-first is the generated file that caused the conflict; I regenerated it myself from the tree and got **exactly** what is committed, with no difference at all. A hand-merge cannot produce that result. Nothing was gained, nothing was lost, and nothing was quietly resolved on the side.

**The two original repairs still hold, and I did not take that on trust.** The code they were tested against has not moved, and I put one of the two defects back myself and watched the check catch it — then removed the repair and watched the same defect go through unnoticed, which is the only way to know the check is doing the work rather than passing by luck.

**What I found is one thing, and it is caused by the replay itself.** The run record's "here is what every check printed" block — the block that exists *because* it was caught quoting figures from a tree that no longer existed — is quoting figures from a tree that no longer exists again. Not a word of it changed; the ground moved under it. Every check still passes, so nothing here is wrong about the outcome. It is the counts that are stale, in the one document whose job is to be trusted about counts.

---

## What I ran, and what it printed

Fresh container. `pnpm install --frozen-lockfile` first. Caches forced off. **Exit statuses read, not printed lines.**

| command | printed | exit |
|---|---|---|
| `pnpm install --frozen-lockfile` | `Done in 4s using pnpm v10.33.0` | **0** |
| `pnpm lint` | `Checked 92 files in 52ms. No fixes applied.` | **0** |
| `pnpm typecheck` | `Tasks: 7 successful, 7 total` / `Cached: 0 cached, 7 total` | **0** |
| `pnpm test --force` | `Tasks: 5 successful, 5 total` / `Cached: 0 cached, 5 total` — **630 passed, 0 failed** | **0** |
| `pnpm --filter @virgil/knowledge-lint run lint` | `84 nodes, 147 edges, 9 pages, 26 claims, 88 tethers (88 intact)`, `1 findings, 0 blocking` | **0** |
| `pnpm tier` | `tier 3, from 24 changed paths against origin/main` | **0** |

630 = 315 (`repo-checks`) + 104 (`domain`) + 76 (`gate-engine`) + 74 (`agent-contracts`) + 61 (`knowledge-graph`). **The description's 630, its 0 failed and its tier 3 all match to the digit.** `pnpm tier` needed `git fetch origin main` first, as expected in a fresh container.

In CI, `lint, typecheck, tests` is **`success`** on this head (run `34758099911`).

---

## The five questions

### 1. Is the replay faithful? **Yes — and by content, not by patch.**

Patch identity first. Of the three work commits, **two are byte-identical patches** to their originals (`git patch-id --stable`):

```
571b258 (PR27) → a02e5cc (PR30)   f44a1572ad904ba6beb67db68e3b8123889128c3   IDENTICAL
9ed95d6 (PR27) → decbafa (PR30)   7e42f357213260ea18aca313ce8b20d60f67eb75   IDENTICAL
1b8d0b1 (PR27) → 879cddb (PR30)   differs
```

The differing commit is the one carrying the seed graph, which is expected. I isolated the difference rather than assuming it: **the two patches differ by 26 lines and every one is inside `packages/test-fixtures/knowledge/seed-graph.json`** — the blob index line, the two `graphHash` values, and context/offset shifts of exactly 10 lines where `main`'s `OD-0018` node sits. The `--numstat` of the two commits is *identical*: same files, same insertion and deletion counts.

Then the decisive test, which is content rather than patches. For each of the 21 files this work changes, the blob hash at `9ed95d60` against the blob hash at this head:

```
SAME     docs/decisions/OD-0017-knowledge-lessons-follow-up.md
SAME     docs/process/FINDINGS.md
SAME     docs/process/KNOWLEDGE_LESSONS_BRIEF.md
SAME     docs/process/KNOWLEDGE_LESSONS_RUN_RECORD.md
SAME     docs/process/ROADMAP.md
SAME     knowledge/LOADER.md
SAME     knowledge/SCHEMA.md
SAME     knowledge/inbox/README.md
SAME     knowledge/inbox/cap-2026-09-13-gates-that-cannot-refuse.capture.md
SAME     knowledge/index.md
SAME     knowledge/log.md
SAME     knowledge/wiki/lessons/lesson-gates-that-cannot-refuse.md
SAME     packages/gate-engine/test/refusals.test.ts
SAME     packages/knowledge-graph/src/derive.ts
SAME     packages/knowledge-graph/src/index.ts
SAME     packages/knowledge-graph/src/lessons.ts
SAME     packages/knowledge-graph/src/ontology.ts
SAME     packages/knowledge-graph/test/lessons.test.ts
SAME     packages/repo-checks/test/findings-register.test.ts
DIFFERS  packages/test-fixtures/knowledge/seed-graph.json
SAME     tools/knowledge-lint/src/cli.ts
```

**`packages/knowledge-graph/src/lessons.ts` is blob `3ab3743310d842aa53618cab11d9c279d1ca4189` at `571b258a`, at `9ed95d60` and at this head** — `sha256 53abda183b3c3ab407211425fdc1021691ea7eca338bdbf8321c9d6d0ebd8865`. It did not move. **Both earlier reviews' reproductions stand against unchanged code**, which is the specific thing that was at risk.

The aggregate check agrees with the per-commit one: `git diff 4e39b82 9ed95d60` and `git diff 515373f decbafa` touch the same 21 files and differ only in those same 26 seed-graph lines.

### 2. Is the seed graph genuinely regenerated, not hand-merged? **Yes. No diff at all.**

```
$ pnpm --filter @virgil/knowledge-graph export-seed-graph
seed graph: 26 nodes, 41 edges → packages/test-fixtures/knowledge/seed-graph.json
exit 0

$ git status --porcelain
$ git diff --stat packages/test-fixtures/knowledge/seed-graph.json
(both empty)
```

**The generator reproduces the committed artifact byte for byte.** 26 nodes, 41 edges, as claimed.

I also checked the arithmetic, because "26 = 25 + 1" is the kind of claim that can be true by coincidence:

| tree | nodes | edges |
|---|---|---|
| `4e39b82` (the base both sides started from) | 23 | 38 |
| `515373f` (`main`) | 24 | 38 — `main` added the `OD-0018` node and no edge |
| `9ed95d60` (#27) | 25 | 41 — this work added 2 nodes and 3 edges |
| `6dec9f6` (here) | **26** | **41** |

And the sets, not just the counts: **no node in `main` is missing here, no node in #27 is missing here, and no node here comes from neither.** Same for edges, compared on `(from, to, edgeType)`. The committed graph is exactly the union of the two inputs — which is what regeneration produces and what a hand-merge does not.

### 3. Was exactly one file in conflict? **Yes. I intersected the two-way diffs rather than taking it on trust.**

```
$ git diff --name-only 4e39b82 9ed95d60 | sort > work.txt    # 21 files
$ git diff --name-only 4e39b82 515373f  | sort > main.txt    # 24 files
$ comm -12 work.txt main.txt
packages/test-fixtures/knowledge/seed-graph.json
```

One file, and it is the generated one. **Nothing else was silently resolved** — question 1's blob table is the independent confirmation, since every other file came through byte-identical.

### 4. Do the two original repairs still hold? **Yes — confirmed unchanged, and one reproduced with a control.**

The code both repairs live in is byte-identical to what the two reviewers tested (above), so their reproductions are not stale. I judged it warranted to reproduce one anyway, and reproduced the second: **`lesson_unreferenced` satisfied by a sibling lesson page** (`KXR-40/PR20`).

On a disposable copy of this tree in scratch space outside the repository, I created two lesson pages with `governs: []`, each naming only the other, nothing else in the tree naming either:

```
blocking  lesson_unreferenced  lesson-zz-alpha — Nothing names ⟦lesson-zz-alpha⟧. The index and the
  journal do not count: they name every page by construction. Neither does another lesson page: two
  lessons naming each other govern nothing and keep each other alive.
blocking  lesson_unreferenced  lesson-zz-beta — Nothing names ⟦lesson-zz-beta⟧. …
lesson scan: 3 findings, 2 blocking
exit 1
```

**Then the control, which is the half that matters.** I removed the repair itself — the lessons-directory clause in `cannotEvidenceUse` — and ran the identical two pages again:

```
lesson scan: 1 findings, 0 blocking
exit 0
```

**The defect is exactly back, and the check goes quiet.** So the guard is not passing by accident and it is not a check that cannot fail: it depends on the repaired line and nothing else. Under the same mutant the unit suite fails precisely the test named for it — `two lessons that govern nothing and cite only each other → lesson_unreferenced`, `1 failed | 60 passed` — and nothing else.

Every probe ran outside the repository. The real tree was never modified: `git status --porcelain` is empty, `git clean -nd` is empty, `lessons.ts` is still `sha256 53abda18…`.

### 5. Are the last three commits exactly their #28 originals? **Yes, all three, and nothing rode in.**

`git patch-id --stable` over each pair:

```
574a578 (PR28) → 97bae45 (PR30)   e12a804b1a9dae0366caec5a84bf585ece131605   IDENTICAL
3191c9a (PR28) → fd402d7 (PR30)   c0613a327efd3a3f34c2324d93252b3afa309315   IDENTICAL
d436ca7 (PR28) → 6dec9f6 (PR30)   fd567738ee5c28fe7f31587542b0df14d26cde76   IDENTICAL
```

Identical patch-ids mean identical diff content, so **nothing rode in with them** — there is no room for a fourth change to hide. Commit subjects match too. And they do what they claim: at this head `handoff-chain.test.ts` spawns the resolved binary (`execFileSync(TSX, [CHAIN, …])`) where `515373f` spawns `execFileSync('npx', ['tsx', …])`, and `turbo.json` declares `"$TURBO_ROOT$/pnpm-lock.yaml"` where `main` declares it nowhere. The two remaining `npx` strings in that file are assertions on the text of `keeper.md`, not spawns.

---

## Findings

Two. **Neither is blocking:** the work does what its contract says, it breaks nothing, and every check it adds can fail — I proved the last of those by hand above.

**On identities.** I read `docs/process/FINDINGS.md`, all seven `docs/process/KEEPER_*` documents, and the comment trail on #27, #28 and #30. The highest id filed in the register is `KXR-43`. The highest in the tree is `KXR-50`. Across every remote ref the highest is `KXR-55` (in `owner-voice.test.ts` on `claude/raphael-plain-english`), and the highest **proposed** anywhere is **`KXR-56/PR28`**, in the review comment on #28. `KXR-98`/`KXR-99` are deliberate probe sentinels in review prose, not rows. **`KXR-57` and above are free.** Qualified `/PR30` on the owner's precedent. **Proposed, not assigned — I file nothing.**

### `KXR-57/PR30` — moderate — the corrected check-output block is stale again, and the replay is what made it stale

**Surface:** `docs/process/KNOWLEDGE_LESSONS_RUN_RECORD.md`, the corrected "Every check, and what it printed" block (lines ~795–823).

**Criterion it fails:** the brief's closing instruction — *"Paste what the command printed, not what it should have printed"* — and `CLAUDE.md`, *a builder's success report is not evidence*. This is `KXR-47/PR27`'s exact class, in the same document, in the very block written to correct that class.

**What is wrong.** That block was true at `9ed95d60` and both reviewers verified it there. **Not one byte of it changed in the replay** — the run record is blob `2f2edf858ac95ec3618fd84bf73d0eaf62703cf2` at `9ed95d60` and at this head. The base moved instead, and six figures went false with it:

| the block says | actual at `6dec9f6` |
|---|---|
| `Checked 88 files` | **92** |
| `@virgil/repo-checks: 285 passed` | **315** |
| `@virgil/gate-engine: 58 passed` | **76** |
| **`582 tests passed, 0 failed`** | **630 passed, 0 failed** |
| `83 nodes, 147 edges` | **84 nodes**, 147 edges |
| `graph hash sha256:8d3a270a…` | **`sha256:928fac21…`** |

The block also carries *"The independent reviewer ran the same four commands in a detached worktree at this SHA and got the same numbers, which is the only reason to believe this block rather than the last one."* At this SHA that reviewer's numbers no longer match this tree.

**Reproduce:** check out `6dec9f6`, run the four commands in that block, compare against it. Or simply: `pnpm --filter @virgil/knowledge-lint run lint` prints `928fac21…` where line 816 says `8d3a270a…`.

**Why moderate and not blocking.** The figures are stale, not false about the outcome — I ran all six commands and every one exits 0, so the property the block exists to evidence **does hold**. The correction's structure is intact and honest: the nine originally-wrong figures are still shown beside the right ones rather than swapped out.

**Why it is worth the owner's eye anyway.** This is the third recurrence of one class in one document, and the mechanism is now visible: **the run record pins absolute counts to a base, so replaying the work onto a different base falsifies a document nobody edited.** Nothing in the repository checks that, and the correct-the-record loop cannot catch it, because the loop corrects text and this failure needs no text to change. That is an argument for a record that quotes deltas and hashes rather than ambient totals — not for a third correction pass.

**Two smaller instances of the same thing, folded in rather than given their own ids.** `KXR-51/PR27`'s stale seal is untouched by the replay and still points nowhere: line 752 asserts `sha256 c1897d7c78fc297…` where the file is and always has been `53abda183b3c3ab…`. Line 1171, added by the correction commit, quotes the right hash — so the document now carries both. And the ported commit `6dec9f6`'s own message reads `582 passed` against the 630 its tree produces; commit messages are immutable and that is inherent to porting, so it is noted rather than raised.

### `KXR-58/PR30` — minor — the description's account of what is carried does not match the record it points at

**Surface:** this pull request's description.

**Criterion it fails:** `CLAUDE.md` authority order — `docs/process/` is layer 4 and a description is not authority over it — and the repository's own standard that a pointer must point at something.

**What is wrong.** The description says: *"Six findings are carried and not repaired — `KXR-47/PR27` through `KXR-52/PR27` — each with its reason in the run record."* Three corrections:

1. **The run record carries reasons for four, not six.** Its table lists `KXR-47/PR27` through `KXR-50/PR27` and says so itself in the next line: *"**Four** register rows are owed to `docs/process/FINDINGS.md` and this session filed none of them."*
2. **`KXR-51` and `KXR-52` appear nowhere in the tree or in any commit on any ref.** `grep -rn 'KXR-51\|KXR-52'` over the working tree returns nothing; the same search across the last 200 commits on all refs returns nothing. They exist only in the second review comment on #27. A reader sent to the run record for their reasons will not find them.
3. **`KXR-52/PR27` is not live on this candidate.** It was *"this pull request's own description still carries the number this commit retired"* — a finding about #27's description. This is a new pull request with a new description, and it does not carry that claim. It was retired by being rewritten.

Separately, the description's *"Thirteen register rows are owed across this work, #26 and #28"* does not reconcile with the #28 review, which counted thirteen owed **before** its own four, making seventeen. I do not adjudicate which count is right — **none of the rows is filed either way**, and the register's highest entry is still `KXR-43`.

**Reproduce:** `grep -c 'KXR-51\|KXR-52' docs/process/KNOWLEDGE_LESSONS_RUN_RECORD.md` → `0`. `grep -cE 'KXR-(4[7-9]|5[0-6])' docs/process/FINDINGS.md` → `0`.

**Non-blocking, and small.** A pull-request description is the builder's account of its own work and is not the contract; I judged this candidate against the brief and the tree, not against this text. I raise it because the miscount is about *where the evidence lives*, in a repository whose recurring failure is exactly that.

---

## Observations, deliberately not findings

**The `OD-0018` node has no edges** — zero in `main`, zero here. An owner decision that the graph holds but connects to nothing. It arrived from `main` and the replay carried it faithfully; it is not this candidate's, and I mention it only because the node count is the headline number on this pull request and one of the 26 is inert.

**The `git merge` refusal held, and the route taken was clean.** `git cherry-pick` is not in the deny list, no permission was changed, and the owner's authorisation to edit `.claude/settings.json` was declined rather than banked. I verified the consequence rather than the narrative: `.claude/settings.json` is byte-identical to `main` at this head and appears in no commit on this branch.

**`pnpm chain` exists here**, having arrived with `main`. The previous reviewer could not emit a marker for that reason; I could, and the one below is generated.

---

## What I could not run, and what I did not do

**Could not run.** The three red Netlify checks — no session has a credential for that site, it is already the owner's in `OWNER_TODO.md`, and it is red on `main` and every branch. Not this pull request's, and I did not treat it as one. I did not trigger CI; I read its result on this head.

**Did not verify.** The description's claim that the suite fails here *without* the three ported commits. I confirmed the fix is real and present by diffing the spawn sites against `main`, but I did not reconstruct the pre-port tree and run it, so I am reporting the fix rather than the failure it prevents. The related claim that **CI is structurally unable to see that class of failure** follows from GitHub's runners having open network access, and I could not test that from inside this container either — it is the description's claim, not mine, and it looks right.

**Could not settle.** Whether `KXR-51/PR27`'s seal hash `c1897d7c…` ever belonged to anything. I searched every ref and found no version of `lessons.ts` matching it, which reproduces the previous reviewer's result but cannot prove a negative about a tree that was deleted.

**Did not do.** I edited no file in this repository, committed nothing, pushed nothing. **I filed no row in `docs/process/FINDINGS.md`** — ten are now owed across #27, #28 and this pull request and none is filed; recording a finding is a repair and I am the reviewer. I merged nothing, approved nothing, opened no pull request, and started no session of any kind. My probes ran on a copy extracted with `git archive` into scratch space outside the repository. Regenerating the seed graph wrote to the repository path and produced a zero-byte difference, so the tree is as I found it — confirmed by `git status --porcelain` and `git clean -nd`, both empty, at `6dec9f6f0bd6eaf5b12ab68153cf04f8de2c0b09`.

---

**No repair round is warranted.** No code is at issue: the replay is faithful, the graph is regenerated rather than resolved, both repairs are intact and one is reproduced here with a working control, and all six checks exit 0. Both findings are about a document's ambient counts, and `KXR-57/PR30` in particular cannot be fixed by a correction pass without recurring the next time this work moves base — which is an argument for carrying it and stopping, as the second reviewer said of its predecessor. If the owner wants one thing done before this goes anywhere, it is the ten owed register rows, which are a separate hop and nobody's review.

<!-- virgil:handoff role=reviewer round=1 sha=6dec9f6f0bd6eaf5b12ab68153cf04f8de2c0b09 verdict=PASS_WITH_NON_BLOCKING_FINDINGS next=owner -->

---
_Generated by [Claude Code](https://claude.ai/code)_
