# Keeper review of pull request #33, candidate `88d5d5a9`

**Captured verbatim on 2026-09-13** from [comment 5653723400](https://github.com/dniachini-droid/Virgil-mission-control/pull/33#issuecomment-5653723400) on pull request
#33. It is the review of pull request #33, and it judged candidate `88d5d5a9de263261b17ff21b4c5a1fa13d90a72f`.

**Nothing below the rule is edited.** Figures that have since gone stale and
statements this repository has since corrected stand exactly as they were
written: a review is a record of what someone found at a moment, and a record
edited afterwards is not a record.

**No substitution was needed.** `docs/process/KEEPER_PR27_REVIEW.md` and
`docs/process/KEEPER_PR30_REVIEW.md` had to rewrite doubled-square-bracket
lesson links as `⟦id⟧` so the knowledge scan would not read a quoted link as a
made one — `KXR-49/PR27`. This comment contains no such link, so this capture is
the comment's bytes exactly, with nothing replaced.

---

**Keeper review — candidate `88d5d5a9de263261b17ff21b4c5a1fa13d90a72f`**

**`PASS_WITH_NON_BLOCKING_FINDINGS`** — `88d5d5a9de263261b17ff21b4c5a1fa13d90a72f`

Independent review, read-only. I built none of this, I took none of the builder's reasoning as evidence, and I will have no part in repairing it. This approves nothing and **it does not propose a merge** — that is the owner's, by writing `merge approved` and naming this pull request.

| | |
|---|---|
| candidate head | `88d5d5a9de263261b17ff21b4c5a1fa13d90a72f` — confirmed with `git rev-parse HEAD` |
| base | `b27373995de6da2d09d54b20e0ce2af65768eb76` (`main`) — confirmed with `git rev-parse origin/main` |
| branch | `claude/file-the-findings`, 1 commit |
| size | 9 files, **1760 insertions, 0 deletions** — derived, and it matches the facts block |
| tier | 3, derived — `pnpm tier` agrees |
| contract | `docs/process/ROADMAP.md` queued item; the seven reviews' own "rows are owed" statements |
| working tree | clean at the reviewed SHA, before and after every probe |

---

## In plain terms, and this is the sentence to act on

**The rows are right.** Twenty-four findings were raised on 2026-09-13 by seven reviews and none had been written down anywhere but a website. This files all twenty-four. I checked every row against the review it claims to come from: **the identity matches, the summary says what that reviewer actually found, the severity is the reviewer's own word and not the builder's, and the reproductions reproduce.** I re-ran several of them myself and every one did what the row says it does.

**The disputed count is settled, and twenty-four is right.** It is not a guess and it reconciles with both earlier figures exactly. See below.

**The one real hole is the one the builder declared, and it is larger than it sounds.** The register does not hold a finding's full text — it holds a one-line summary and points at a captured review for the rest. Those seven captured documents are held by **nothing**. I proved it: I cut one of them from 18,628 bytes to 68 bytes and every check in the repository still passed. The seven older review documents in this repository *are* protected that way, so these twenty-four findings have a weaker guarantee than the ones above them.

**Why that is still not blocking.** Every guard this change adds does fire — I broke the new rows eight different ways and eight times the checks caught it and named the row. Nothing is dropped, nothing is renumbered, nothing existing changed. The gap is a *missing* protection on the documents, not a broken one on the register.

---

## What I ran, and what it printed

Exit statuses read, never printed lines.

| command | result | exit |
|---|---|---|
| `pnpm install --frozen-lockfile` | `Done in 2s using pnpm v10.33.0` | **0** |
| `git fetch origin main` | needed first, or `pnpm tier` reports 0 changed paths | **0** |
| `pnpm lint` | `Checked 93 files in 59ms. No fixes applied.` | **0** |
| `pnpm typecheck --force` | `7 successful, 7 total`, `Cached: 0 cached, 7 total` | **0** |
| `pnpm test --force` | **777 passed, 0 failed**; `5 successful`, `Cached: 0 cached, 5 total` | **0** |
| `pnpm --filter @virgil/knowledge-lint run lint` | `84 nodes, 147 edges, 88 tethers (88 intact)`, `1 findings, 0 blocking` | **0** |
| `pnpm tier` | `tier 3, from 9 changed paths against origin/main` | **0** |

**777 is the real test count**, not the task count: 462 (`repo-checks`) + 104 (`domain`) + 76 (`gate-engine`) + 74 (`agent-contracts`) + 61 (`knowledge-graph`). `findings-register.test.ts` alone is 377 tests, because the suite generates cases per row. **Every figure in the facts block matches what I measured, to the digit.**

In CI, `lint, typecheck, tests` is **`success`** on this head.

**The three red Netlify checks are not this candidate's, and I confirmed it rather than accepting it.** All three are the same deploy reported three times. `netlify.toml` does not exist on this branch *or* on `main` — it went with the application in #22 — and it is already the owner's in `docs/process/OWNER_TODO.md`: *"a session has no credential for it, and `CLAUDE.md` forbids connecting one."* Not this pull request's, and no re-run would change it.

---

## The count: twenty-four is right, and here is the arithmetic

This was the main thing I was asked to settle. **Both earlier figures are real, both are stale, and both reconcile with twenty-four.**

| figure | where it came from | what it was counting |
|---|---|---|
| **thirteen** | `ROADMAP.md`; #30's description | the total *before* #28's first review — #26's seven and #27's six |
| **seventeen** | `KEEPER_PR28_REVIEW.md`, `KEEPER_PR28_REREVIEW.md` | thirteen **+ #28's first four** |
| **twenty-four** | this candidate | seventeen **+ #28's re-review's own four + #30's two + #24's one** |

`KEEPER_PR28_REREVIEW.md` states the bridge itself: the plan *"says 'thirteen findings owed a row' where seventeen are owed — the four raised on `d436ca7` are not counted."* 13 + 4 = 17, then + 4 + 2 + 1 = **24**.

I did not take the builder's count on trust either. I extracted every id from every `## Findings` section of all seven captures independently: 1 + 7 + 4 + 2 + 4 + 4 + 2 = **24**, and all twenty-four are filed. **No row a review raised is absent.** `KXR-59` was genuinely never minted — `KEEPER_PR28_REREVIEW.md` says so in its own words: *"I continue from `KXR-60`, qualified `/PR28`, to leave that reviewer room."*

**The `/PR20` findings are correctly absent.** `KXR-39/PR20`–`KXR-46/PR20` appear in two captures, but only as *references*. `KEEPER_PR20_REVIEW.md` is in no part of this tree — I checked. A row for them would have to point at a document that names the id and does not hold its text, which is the exact failure `KXR-08` exists to prevent. Not filing them is the right call, and it is declared.

**`KXR-70/PR32`–`KXR-74/PR32` are untouched.** Nothing in this candidate uses `KXR-70` or above; the highest filed here is `KXR-63/PR28`. No renumbering over #32's range. **`KXR-43` is still the highest unqualified id and it has not moved.**

---

## I broke it nine ways, and the register caught seven of them

The builder's four mutations are the builder's. I designed my own and ran them on a throwaway copy in scratch space outside the repository. **Failure counts are what I observed, not what should have happened.**

| # | what I did | caught? | counts |
|---|---|---|---|
| 1 | **Softened a finding inside `KEEPER_PR26_REVIEW.md`** — `KXR-44/PR26` from `major` to `trivial`, reworded to *"the round cap is fine and this was raised in error"* | **NO** | `777 passed, 0 failed` |
| 2 | `KXR-45/PR26` detector `review` → `gate` | yes | `1 failed \| 461 passed` |
| 3 | `KXR-57/PR30` repointed at `OWNER_TODO.md` (exists, does not name it) | yes | `2 failed \| 460 passed` |
| 4 | Deleted `KEEPER_PR24_REVIEW.md` outright | yes | `1 failed \| 461 passed` |
| 5 | **Cut `KEEPER_PR28_REREVIEW.md` from 18,628 bytes to 68**, keeping only the bare ids | **NO** | `462 passed, 0 failed` |
| 6 | `KXR-44/PR26` attributes severity `major` → `minor` | yes | `1 failed \| 461 passed` |
| 7 | Deleted the `KXR-62/PR28` row and its attributes row | yes | `1 failed \| 456 passed (457)` |
| 8 | Rewrote `KXR-44/PR26`'s summary into something harmless-sounding | yes | `1 failed \| 461 passed` |
| 9 | Inserted an unpinned row `KXR-99/PR33` | yes | `3 failed \| 464 passed (467)` |

Each caught mutation **named the offending row** in its message. Every guard over the register fires. Mutations 1 and 5 are one finding, below.

---

## Findings

Three. **None is blocking:** the work does what its contract says, it breaks nothing, and every check it adds can fail — I proved that by making each one fail. Per `CLAUDE.md` I file none of these; recording a finding is a repair and I am the reviewer. **Proposed, not assigned.**

### `KXR-75/PR33` — major, non-blocking. The seven captured reviews are held by nothing, and the register sends every reader to them

**Surface:** `packages/repo-checks/test/review-records.test.ts`; the seven new documents in `docs/process/`.

**What is wrong.** The register carries a one-line summary per finding. For the reasoning, the evidence and the reproduction the reviewer actually wrote, it points at the captured review. `review-records.test.ts` exists precisely so such a document *"cannot be quietly tidied"* — it pins seven older reviews to the SHA-256 of their bytes. **These seven are in no such pin.** Its completeness check reads `/^\| (KXR-\d+) \|/` — an unqualified id followed by a cell boundary — and every id filed here is qualified (`KXR-44/PR26`), so all twenty-four rows are invisible to it and it required nothing.

**Reproduce:** on a copy, open `docs/process/KEEPER_PR28_REREVIEW.md`, replace its entire 18,628 bytes with the five id strings it is cited for, and run `pnpm test --force`. **`462 passed, 0 failed`.** Or soften a single finding in `KEEPER_PR26_REVIEW.md` as in mutation 1: **`777 passed, 0 failed`.**

**What *is* protected**, so the size of the hole is not overstated: the capture must exist (mutation 4 fires) and must still name the id. The row's own status, detector, pointer and summary are pinned, and so are its severity, surface, reproduction and authority (mutations 2, 3, 6, 8 fire). So a finding cannot be dropped or rewritten *in the register*. What can happen is that the document the register points at for the full text is emptied or reversed, with nothing noticing.

**Criterion it fails:** `review-records.test.ts`'s own stated purpose — *"A copy that can be quietly tidied — a finding softened, a severity lowered, an awkward sentence smoothed — is worse than a link, because it looks like the original."* Twenty-four findings now rest on documents with exactly that property.

**One thing worth the owner's eye.** The builder declares this gap plainly, in the pull request, the facts block *and* the register itself — that is good practice and it is why I could aim straight at it. But its stated reason for deferring is that *"closing it is a change to a test file, which is somebody else's hop"* — and **this same commit adds 174 lines to a test file**, `findings-register.test.ts`. The deferral may still be right on scope, but that particular argument for it does not hold.

**Why non-blocking.** It is a protection that is absent, not a check that cannot fail. Every check this candidate adds does fail when it should.

### `KXR-76/PR33` — moderate, non-blocking. The candidate makes a governed document false and does not say so

**Surface:** `docs/process/ROADMAP.md`, line 33, the queued table.

**What is wrong.** That line reads: *"thirteen findings owed a row | across `#26`, `#27` and `#28`, **none filed** … thirteen things are outside it."* It was true before this commit. **After it, twenty-four are filed and none is owed** — and the line is unchanged. The next session to read the plan is told to go and do the work this candidate has already done.

This is the nearest thing to a written contract for this work, and it is the one document the candidate falsifies and does not touch.

**Reproduce:** `sed -n '33p' docs/process/ROADMAP.md` at this head, read against the twenty-four rows in `docs/process/FINDINGS.md` at the same head.

**Criterion it fails:** `CLAUDE.md` authority order, which makes `docs/process/` layer 4 and expects it to be true; and the facts block's own `--not-done` field, which is where a change is supposed to admit its edges. The block lists five things deliberately not done and this is not among them.

**It is the class this candidate is itself filing.** `KXR-63/PR28` is *"the plan reports current while already two facts behind"*; `KXR-58/PR30` and `KXR-52/PR27` are descriptions that stopped matching what they point at. This is the same failure, created rather than inherited.

### `KXR-77/PR33` — minor, non-blocking. A capture's header states something untrue about the document it heads

**Surface:** `docs/process/KEEPER_PR30_REVIEW.md`, line 18 — builder-authored header, above the rule at line 26, **not** part of the verbatim review.

**What is wrong.** It reads *"**The reason is a finding this very document raises.** `KXR-49/PR27` records that…"* — but `KEEPER_PR30_REVIEW.md` raises `KXR-57/PR30` and `KXR-58/PR30`. `KXR-49/PR27` is raised by `KEEPER_PR27_REVIEW.md`, where the same sentence is true. The header was evidently carried across from the other capture without that clause being adjusted.

**Reproduce:** `grep -n '^### .KXR-' docs/process/KEEPER_PR30_REVIEW.md` returns `KXR-57/PR30` and `KXR-58/PR30`, and neither is `KXR-49/PR27`.

**Criterion it fails:** accuracy of a document about itself, in a repository whose recurring defect is exactly that. **Confined to the wrapper — the captured review below the rule is untouched and faithful.**

---

## What I verified that the builder asserted, and found sound

- **The captures are genuinely verbatim.** I fetched the original comment for #30 from GitHub and compared. Ten distinctive strings — patch-ids, blob hashes, the 630 arithmetic, whole sentences — all reproduce **exactly** after reversing the declared substitution. The header names the source comment, the SHA judged, and the substitution count.
- **The `⟦⟧` substitution is honest and reverses exactly as declared.** 13 real occurrences in `KEEPER_PR27_REVIEW.md` and 2 in `KEEPER_PR30_REVIEW.md`; the remaining marks are the declaration blocks themselves. The other five captures are untouched. This is `KXR-49/PR27` biting, filed here as open, exactly as the builder says.
- **Every status is the reviewer's word or a fact from the tree, not the builder's judgement.** I checked all seven `repaired`: `KXR-46/PR26` — no `npx` *spawn* remains in `handoff-chain.test.ts` (the two matches are a comment and a string assertion about `keeper.md`); `KXR-50/PR26` — `git log --merges` puts #24 at `84b7767` before #26 at `515373f`; `KXR-53`/`55`/`56` and `KXR-54/PR28` — the #28 re-review replayed both attacks (`4 failed`, `2 failed`) and called the facts block *"Adequate"*; `KXR-47/PR27` — the #27 re-review re-ran all four commands and confirmed every figure.
- **And the `open` ones are genuinely open.** `KXR-44/PR26` — `handoff.ts:178` still reads `handoffs.filter((h) => h.role === 'fixer')`, the session's own word. `KXR-45/PR26` — `SKILL.md` still says nothing about comment order. `KXR-48/PR27` — no `knowledge-lint` in any workflow. `KXR-50/PR27` — no `ingestionState` in `CLAUDE.md`. `KXR-51/PR24` — the index stops at `OD-0008` with ten records filed beyond it. `KXR-62/PR28` — both named paths absent. `KXR-58/PR30` — zero occurrences in the run record.
- **Nothing existing moved.** 1760 insertions, **0 deletions**. No existing row, pin or attributes row changed. 24 rows, 24 attributes rows, 24 `PINNED` entries, 24 `PINNED_ATTRIBUTES` entries; 17 open + 7 repaired = 24. All reconcile.
- **The captured handoff markers are inert.** Five captures carry a `virgil:handoff` marker, faithfully. The chain reads a JSON file of comment bodies passed to `--comments`, never the tree, so they affect no count. Correct behaviour for a verbatim capture.

## Observations, deliberately not findings

- **`KEEPER_PR27_REVIEW.md` line 18 has a malformed code span** — the doubled backticks around `KXR-49/PR27` never close and render as literal backticks. Cosmetic, in the same builder-authored header as `KXR-77/PR33`, and I raise it as part of nothing.
- **`docs/decisions/README.md` indexes `OD-0002`, `OD-0005` and `OD-0008`, which are not files in `docs/decisions/`.** Adjacent to `KXR-51/PR24` and possibly a second half of it, but it is pre-existing, not this candidate's, and not mine to widen that finding with.

## What I could not run, and what I did not do

**Could not run.** Nothing. Every check in `CLAUDE.md`'s Commands section ran here and its exit status is above. The three Netlify checks need a credential no session holds and are already the owner's; I did not trigger CI, I read its result on this head.

**Did not do.** I edited no file in this repository, committed nothing, pushed nothing, opened no pull request, approved nothing, merged nothing and started no session of any kind. **I filed no row in `docs/process/FINDINGS.md`** — filing is a repair and I am the reviewer, so the three findings above are owed a row and are somebody else's hop. Every mutation ran on a copy in scratch space outside the repository. The real tree was never modified: `git status --porcelain` and `git clean -nd` are both empty at `88d5d5a9de263261b17ff21b4c5a1fa13d90a72f`.

**Did not adjudicate.** Nothing needed it. The count reconciles arithmetically rather than by judgement, so I report it as established rather than decided.

**One note on the marker below.** `--emit` passes `--sha` through unnormalised while `--facts` always writes the short form, so a 40-character reviewer marker does not match the push it refers to. I passed the short form deliberately and checked that it reconciles: the chain reader reports `reviewer round 0 on 88d5d5a — PASS_WITH_NON_BLOCKING_FINDINGS`, `next=owner`. The full SHA I reviewed is in the heading of this comment. That defect is under repair elsewhere and is not mine.

---

**No repair round is warranted, and I would not spend one here.** The twenty-four rows are correct, the count is settled, and the register's guards all fire. The one thing worth doing before this goes further is the owner's call rather than a fix round: **`KXR-75/PR33` — adding these seven captures to `review-records.test.ts` so they are held the way the seven above them are.** It is a small change to one test file, it is the property this whole pull request exists to create, and until it is done these twenty-four findings are pinned in the register but not in the documents the register sends you to.

<!-- virgil:handoff role=reviewer round=0 sha=88d5d5a verdict=PASS_WITH_NON_BLOCKING_FINDINGS next=owner -->

---
_Generated by [Claude Code](https://claude.ai/code)_
