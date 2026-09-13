# Keeper review of pull request #27, candidate `9ed95d60`

**Captured verbatim on 2026-09-13** from [comment 5653275088](https://github.com/dniachini-droid/Virgil-mission-control/pull/27#issuecomment-5653275088) on pull request
#27. It judged candidate `9ed95d60f857adb09ee84a73ec65112566b7ecfe`.

**Nothing below the rule is edited.** Figures that have since gone stale and
statements this repository has since corrected stand exactly as they were
written: a review is a record of what someone found at a moment, and a record
edited afterwards is not a record.

---

**PASS_WITH_NON_BLOCKING_FINDINGS** — `9ed95d60f857adb09ee84a73ec65112566b7ecfe`

Fresh independent review of this SHA. The `571b258a` verdict does not transfer; `REVIEW_POLICY.md` "Staleness" admits no documentation-only exception.

**In plain terms.** The last review found the run record's "here is what every check printed" block quoting figures from a version of this project that no longer exists — 313 files, 2,400 tests, packages deleted with the application — directly beneath a sentence swearing no figure had been copied from anywhere. This commit corrects that, and **the corrected figures are true**: I ran all four commands myself and got the same numbers to the digit. No code changed. But the same document still carries one more figure from that vanished tree, twenty lines above the correction, and the correction did not catch it.

## What I ran

Fresh container, `pnpm install --frozen-lockfile`, caches forced off, **exit statuses read rather than printed lines**:

| command | printed | exit |
|---|---|---|
| `pnpm lint` | `Checked 88 files` | **0** |
| `pnpm typecheck --force` | `7 successful, 7 total`, `Cached: 0 cached, 7 total` | **0** |
| `pnpm test --force` | 285+58+61+104+74 = **582 passed, 0 failed**; `5 successful`, `Cached: 0 cached, 5 total` | **0** |
| `pnpm --filter @virgil/knowledge-lint run lint` | `83 nodes, 147 edges, 9 pages, 26 claims, 88 tethers (88 intact)`, `sha256:8d3a270a…`, `1 findings, 0 blocking` | **0** |

Also: `pnpm tier` → `tier 3, from 21 changed paths` (exit 0, after `git fetch origin main`), matching the description. `export-seed-graph` → 25 nodes, 41 edges, **no diff against the committed artifact**, confirming the record's corrected claim that the seed graph did need regenerating on this base.

## The five questions

**1. Are the corrected figures true of this tree? Yes.** Every figure above matches the record exactly, and every command exits 0.

**2. Did any code change? No — proved, not read.** `git diff-tree -r 571b258a 9ed95d60` returns exactly one entry, the run record. Comparing full `ls-tree -r` listings with the record excluded is byte-identical, so *every* other file in all 309 is unchanged. `packages/knowledge-graph/src/lessons.ts` is blob `3ab37433…` at both SHAs.

**3. Was the criticised text quietly tidied away? No.** The nine wrong figures are kept in a table that reproduces the old block faithfully — I diffed the table against the text at `571b258a`, and all nine rows quote it correctly. The denial sentence is quoted verbatim inside the correction rather than deleted. `KXR-42`'s three false statements are still standing at line 490. This is the `KXR-42` class handled properly.

**4. Is the revision to the mutant account accurate, or merely humble? Accurate — I reproduced it.** Mutants A∪B∪C kill exactly six of the ten new tests (three scenarios + three `refuses`). I then built the natural fourth mutant myself on a disposable copy outside the repository — `LESSON_ID_CHARS` from `'a-z0-9'` to `'a-z'` — and it killed exactly `accepts lesson-x9` and `accepts lesson-9`, leaving exactly the two the record names as never-yet-killed positive controls. Six → eight, two remaining, correctly named. The revision is right.

**5. Do the checks pass at this head? Yes** — locally as above, and `lint, typecheck, tests` is `success` on `9ed95d60` in CI.

**On the previous review's reproductions: I agree, and they stand.** `lessons.ts` is byte-identical across all three commits on this branch, so there is nothing for them to have gone stale against.

## New findings

**`KXR-51/PR27` — moderate. The mutant section's integrity seal names a file that exists nowhere in this repository's history.** Line 752 asserts the source was restored byte-identical either side of the mutation run, `sha256 c1897d7c78fc29724407ea2993a88d684ecbd3497481ed36bfe1754ded96055d`. The actual hash is `53abda183b3c3ab407211425fdc1021691ea7eca338bdbf8321c9d6d0ebd8865`, at every commit on this branch including the one that introduced the file. I searched the last 60 commits across all refs: **`c1897d7c…` matches no version of `lessons.ts` that has ever existed here.** It is a figure carried over from the pre-replay tree — `KXR-47`'s exact class, in the same document, uncorrected by the commit whose purpose was to correct that class, and sitting in the block that is the record's core red-before-green proof. Non-blocking because the substance holds independently: the previous reviewer re-ran the three mutants, I ran a fourth, and the property the seal asserts (the source is unchanged) is separately true from the commit hashes. It is the seal that points nowhere, not the claim.

**`KXR-52/PR27` — minor. This pull request's own description still carries the number this commit retired.** It reads *"Seven of the ten fail against the old source with a `TypeError`… **The mutants carry those seven.**"* The three mutants carry three of those seven. The record now says six of ten; the description was not updated with it, so the candidate ships a description contradicting the document it corrects.

**Observation, deliberately not a finding.** The corrected block's `pnpm typecheck` evidence is `Time: 189ms >>> FULL TURBO` — a cache replay, with no `Cached: 0` line, inside a block whose subject is figures actually produced here; the `pnpm test` evidence beside it shows `--force` and `Cached: 0 cached, 5 total`. I verified the figure is nonetheless true (7 of 7, cache bypassed, exit 0), so no false statement is made and I raise it as weaker evidence than its neighbours rather than as a defect.

## On the carried findings and what is owed

`KXR-48/PR27` holds — I confirmed `knowledge-lint` is referenced by no workflow; `checks.yml` declares one job running only `lint`, `typecheck`, `test`. `KXR-50/PR27` holds — the `BR-05` row still reads "Ten wiki pages" where the scan now says eight, and re-pinning its digest is a repair. `KXR-49/PR27`'s boundary is documented in the source. **None of these is a defect for being carried.**

**Four register rows are owed to `docs/process/FINDINGS.md` — `KXR-47/PR27` through `KXR-50/PR27` — and none is filed.** Mine would make six. Filing is a repair and is not mine either.

**Ids.** `KXR-51` and `KXR-52` are free: nothing above `KXR-50` appears in the `KXR-5x` range across any ref. (`KXR-98`/`KXR-99` appear only as deliberate fake rows in prior gate probes.) Qualified `/PR27` on the owner's precedent. Proposed, not assigned — I file nothing.

**The three red Netlify checks** are the known owner-owned ones, filed in `OWNER_TODO.md`; the repository's own check is green.

## Is a repair round warranted?

**No.** No code is at issue, both repairs are independently reproduced twice over, and `KXR-51/PR27` is a one-line stale hash. But it is worth the owner noticing that the correct-the-record loop has now run twice and each pass has left behind another instance of the same class it was correcting — which is an argument for carrying these findings and stopping, rather than for a third pass. That judgment is the owner's; this informs it and does not propose a merge.

## What I could not run, and what I did not do

The handoff marker is **not written**. `pnpm chain` **does not exist on this branch** — there is no `chain` script in any `package.json` and no file matching `*chain*` outside `node_modules`. Instructed to say so rather than type a marker by hand, so I have.

I edited no file, committed and pushed nothing, filed no register row, approved nothing, merged nothing, opened no pull request and started no session. Mutant D was run on a disposable copy outside the repository; the working tree is clean and at `9ed95d60`. I did not re-derive the previous review beyond confirming its reproductions stand against unchanged code.

---
_Generated by [Claude Code](https://claude.ai/code)_
