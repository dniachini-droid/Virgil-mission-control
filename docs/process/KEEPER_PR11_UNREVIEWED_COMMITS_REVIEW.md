# Keeper review — the unreviewed tail of pull request #11

**Verdict: `INSUFFICIENT_EVIDENCE`.**

Candidate: `d7d80fdaf54663afe47d8bda60845cd4b6c9808b`, branch `claude/virgil-inspector-phase-1`, pull request #11, base `91409d0`.
Reviewed: 2026-09-12.
Scope I was asked for: `e1d3d62`, `b27cde14` (record-keeping) and `d7d80fd` (Superpowers at project scope, plus a brief). The five commits before them — `e6c11c3`, `57d7829`, `8b725b5`, `23af6ac`, `ec53d98` — have been reviewed three times and I did not re-review them.
Prior reviews read in full before starting: the three copies in the candidate (`KEEPER_REVIEW_*`, `KEEPER_REREVIEW_*`, `KEEPER_FINAL_REVIEW_*`), all `PASS_WITH_NON_BLOCKING_FINDINGS`, raising `KXR-01` to `KXR-12` — **and a fourth I found on a branch, which the pull request description says does not exist.** See `KXR-22`.

`REVIEW_POLICY.md`, "Staleness": a verdict never transfers to a new SHA. This is a review of `d7d80fd` and endorses none of its predecessors.

**The verdict is not about the record-keeping work, which is good and which I verified.** It is about the last commit, and it is `INSUFFICIENT_EVIDENCE` rather than `BLOCKED` for a specific structural reason: `BLOCKED` "names a proven defect and the acceptance criterion it fails" — and `d7d80fd` has no acceptance criterion to fail. There is no approved contract for it at all. That is the missing proof, and naming the missing proof is what this verdict is for.

## Independence and admissibility

I did not build this candidate, did not review `8b725b5`, `23af6ac`, `ec53d98` or `b27cde14`, and have made no change to it. Verification ran in a detached worktree at the candidate SHA, reverted after every mutation, `git status --porcelain` empty before and after each, and the worktree was removed at the end. I have repaired nothing, and I have not entered my findings in `docs/process/FINDINGS.md`: that is a repair, and `CLAUDE.md` gives each session one hop.

Against `constitution/REVIEW_POLICY.md`, "What review requires" — four preconditions, of which three are met:

- **Deterministic verification completed for the SHA, by something with no interest in the answer. ✓** GitHub Actions run `34695804984` on `d7d80fd`, job `lint, typecheck, tests` (`103558965986`): conclusion `success`. Six further jobs on the same run concluded `success` — `hosted build, read and refused`, `Mind Scan, V10 owner build and verify, committed digests`, `newest Owner Build rebuilds byte for byte`, and V11 owner build and verify for `portrait-390`, `portrait-430`, `landscape-844` and `motion and performance`. One job, `lint, typecheck, tests, owner build, owner verify`, was still `in_progress` when I looked and I do not record it as passed.
- **Reproduced locally, independently. ✓** Clean worktree at the SHA after `pnpm install --frozen-lockfile`: `biome check .` → `Checked 298 files`, exit 0; `turbo run typecheck` → `Tasks: 8 successful, 8 total`; `turbo run test` → `Tasks: 6 successful, 6 total`, **1,805 tests across 37 files** in `mission-control` and 2,064 across the workspace. `pnpm check` separately, exit 0.
- **The SHA is pushed and equal on local and remote. ✓** `git ls-remote origin claude/virgil-inspector-phase-1` → `d7d80fdaf54663afe47d8bda60845cd4b6c9808b`, equal to the reviewed worktree's HEAD.
- **The diff stays within permitted paths. ✗** Two of the three files in `d7d80fd` are in no permitted-paths list in this repository, and no contract governs that commit. This is the precondition that fails, and `REVIEW_POLICY.md` says in terms that missing one of these "yields `INSUFFICIENT_EVIDENCE`, not a pass."
- **No test skipped, weakened or removed. ✓** `git diff 91409d0 d7d80fd -- '*.test.ts'` adds no `.skip`, `.only`, `.todo` or `skipIf`. Nothing under `packages/gate-engine/src/`, `constitution/`, `docs/product/`, `knowledge/raw/` or `schemas/gate-*` is touched by any of the thirteen files in the diff. No protected boundary is reached.

## What I verified and what holds

### The load-bearing claim is true, and I re-derived it rather than trusting the digests

`b27cde14` claims the three review documents are copied in "byte for byte" and held to the SHA-256 of the commits they came from. I fetched all three reviewer branches and took the digests again:

| copy | source branch | commit | pinned | re-derived from source |
|---|---|---|---|---|
| `KEEPER_REVIEW_GATE_PROOF_AND_FINDINGS.md` | `claude/keeper-virgil-review-qu3pvr` | `5edc9ff` | `8e3b87af…91512b` | identical |
| `KEEPER_REREVIEW_GATE_PROOF_AND_FINDINGS.md` | `claude/keeper-review-candidate-23af6acf-3ed0pw` | `5f932ab` | `08efb91e…bb0d1c` | identical |
| `KEEPER_FINAL_REVIEW_GATE_PROOF_AND_FINDINGS.md` | `claude/keeper-virgil-review-final-axici6` | `65abd44` | `fabd3956…de2e9a` | identical |

Not summarised, not tidied, not one byte moved. Twelve findings' full text is in this repository instead of on three branches somebody will delete. This is the only evidence anywhere in this lineage anchored to something outside the sessions that wrote it, and it is real.

### The settings change adds nothing to the permission lists, and I checked that mechanically rather than reading the diff

The commit message says "what it adds to the permission lists is nothing" and "Nothing was removed". Both are true. Parsing both files and comparing:

```
keys added  : ['enabledPlugins', 'extraKnownMarketplaces']
keys removed: []
allow identical: True     deny identical: True     hooks identical: True
```

`timeZone` and `timeFormat` moved to the foot of the file and are unchanged in value. Every machine-guarded invariant over `.claude/settings.json` survives: `permission-matrix.test.ts` still finds a `Write` and an `Edit` deny rule for every `boundaryProtection.sessionDenied` path, still finds no allow rule admitting arbitrary execution, and `od-decision-record-guard.test.ts` still finds the `PreToolUse` hook wired for `Write|Edit`. The `CLAUDE.md` edit is purely additive: ten lines, no deletions, no existing hard limit reworded or removed.

### The candid parts are genuinely candid

The largest thing in `b27cde14` is a refusal: a decision record for 2026-09-12 was drafted and not filed, because the owner was asked whether he would read it before it was committed and said no. `OD-0006` makes that reading the only detection of a false record, so an unread record would be an unverified claim at authority layer 1. That is the right answer and the expensive one. `CLAUDE.md`'s new section names the cost of the plugin against itself — no pinned version, so a change published upstream reaches the next session here with nobody approving it — rather than leaving it to be discovered.

## The finding that decides the verdict

### `KXR-18` — `d7d80fd` changes the two files that declare this repository's own limits, under no contract, and nothing in the repository records the authorisation

**Severity: major. Blocking as to this SHA, in the `INSUFFICIENT_EVIDENCE` sense: the proof is absent rather than the work wrong. Surface: `.claude/settings.json`, `CLAUDE.md`. Authority concerned: `REVIEW_POLICY.md`, "What review requires"; `docs/process/INSPECTOR_PHASE_1_BRIEF.md`, "Permitted paths"; `OD-0006`.**

`d7d80fd` changes three files. `docs/process/INSPECTOR_PHASE_1_BRIEF.md` is inside that brief's own permitted-paths list. The other two are inside nothing. I extracted every `## Permitted paths` block in the repository:

```
GATE_PROOF_AND_FINDINGS_BRIEF   packages/gate-engine/test/**, packages/test-fixtures/src/**,
                                apps/mission-control/test/**, docs/process/FINDINGS.md
INSPECTOR_PHASE_1_BRIEF         packages/evidence-collector/**, packages/gate-engine/test/**,
                                docs/process/INSPECTOR_PHASE_1_BRIEF.md,
                                docs/process/INSPECTOR_PHASE_1_RUN_RECORD.md,
                                docs/process/FINDINGS.md,
                                apps/mission-control/test/findings-register.test.ts
RECORD_KEEPING_BRIEF            docs/process/FINDINGS.md, docs/process/KEEPER_*.md,
                                apps/mission-control/test/findings-register.test.ts,
                                docs/process/RECORD_KEEPING_BRIEF.md
```

Neither `.claude/settings.json` nor `CLAUDE.md` appears in any of them. And no contract governs `d7d80fd` at all: the inspector brief it commits says of itself "**Status: proposed, not started. Nothing in this document is authority**", and the work it describes has not begun, so its list does not bind this commit either.

What exists to authorise the change is one paragraph in the commit message of the commit that makes it:

> The owner authorised this expressly on 2026-09-12, and separately authorised reading `obra/superpowers` — which `CLAUDE.md` otherwise forbids …

There is nothing else. `git grep -il superpowers` at this SHA returns exactly the three files the commit changed — no run record, no register row, no `docs/decisions/OD-*`. `docs/process/FOUNDATION_REPAIR_RUN_RECORD.md` is not touched by `d7d80fd` and does not mention it.

**Why this is the verdict rather than a finding to carry.** `KXR-07` — two paths outside a contract, authorised by prose — has now recurred four times and is open, so recurrence alone would be ordinary. Three things make this instance different in kind:

1. **The previous instances had a contract to be outside of.** `b27cde14`'s two exceptions are set out in a table in its run record, one of them marked plainly as unauthorised. Here there is no contract and no run record, so there is no artefact in the repository that a reviewer can hold the diff against. `REVIEW_POLICY.md` defines review as examining a SHA "against the approved acceptance contract". For this commit there is none to examine it against.
2. **The files are the ones that declare the limits.** Not application code — `CLAUDE.md`, which states the hard limits every session is bound by, and `.claude/settings.json`, which declares the permission lists and the one `PreToolUse` guard this repository has. The commit message names this itself: "`SA-G-03` was about that file being editable by the sessions it constrains." It is, still; `boundaryProtection` classifies neither file, so no deny rule reaches them. This commit is the demonstration.
3. **The same commit adds a document instructing the opposite.** `INSPECTOR_PHASE_1_BRIEF.md`, added by `d7d80fd`: "**A path outside this list is out of scope.** … If it is still wrong, the answer is to say so and stop, not to take the exception and write a paragraph about it." The commit takes two exceptions and writes a paragraph about it. I do not press this as a contract breach, because that brief is not authority and does not govern this commit — but it is the clearest available statement of this project's own standard, written into the repository by the commit that departs from it.

**What would close it, and it is cheap.** Any one of: a contract naming those two paths before the change; an owner decision record filed through the `OD-0006` mechanism; or a run record for `d7d80fd` that names the two paths as exceptions the way `b27cde14`'s does. None of that is work I may do, and the third costs a paragraph.

## Findings I raise as proposals

Ids continue the `KXR` sequence from `KXR-17`, **as proposals**. I have not entered them in `docs/process/FINDINGS.md`, and I have not minted a prefix, which the register warns a session must not do.

### `KXR-19` — the two keys added sit in the only region of `.claude/settings.json` that no check reads

**Severity: moderate. Non-blocking. Surface: `.claude/settings.json`; `packages/agent-contracts/test/permission-matrix.test.ts`; `packages/agent-contracts/test/od-decision-record-guard.test.ts`. Reproduction: below. Authority concerned: `boundaryProtection` and the permission matrix's stated purpose.**

Two test files import `.claude/settings.json`. `permission-matrix.test.ts` reads `settings.permissions` and nothing else; `od-decision-record-guard.test.ts` reads `settings.hooks` and `settings.permissions.deny`. Nothing reads anything else:

```sh
grep -rn "enabledPlugins\|extraKnownMarketplaces" --include=*.ts --include=*.mjs --include=*.yml .
# (no output)
```

So the file has three well-guarded regions and one unguarded one, and this commit writes into the unguarded one. The guards are good — they are why I can say the permission lists are intact — and that is the point: a future edit to `enabledPlugins` or `extraKnownMarketplaces` is checked by nothing, named in no vocabulary, and pinned by no digest. Adding a second marketplace, or swapping the repository this one points at, would pass `pnpm check` in silence.

**Why this is not blocking.** Both keys are accurate at this SHA and I verified their effect on the guarded regions is nil.

### `KXR-20` — a hard limit forbids reading another repository, and the section added four lines below installs one that every session loads

**Severity: moderate. Non-blocking. Surface: `CLAUDE.md`. Reproduction: read the two passages. Authority concerned: `CLAUDE.md`, "Hard limits for every session", and its rule on contradictions.**

`CLAUDE.md` line 19, unchanged by this commit:

> Work only inside this repository. Never read, clone or modify any other repository.

`CLAUDE.md`, ten lines later, added by this commit:

> `obra/superpowers` is installed at project scope (`.claude/settings.json`), so every session on this repository has it — including the ones `instruct.yml` runs in a fresh container.

The commit message settles the interpretation against itself: the owner "separately authorised reading `obra/superpowers` — **which `CLAUDE.md` otherwise forbids**". So by the building session's own reading, the limit covers this, one session was authorised past it once, and the configuration it left behind has every future session doing continuously what the limit forbids — authorised by nothing a future session can read.

The new section says "**It advises on method. The hard limits above govern.**" Read literally by the next session, that instructs it not to load the plugin. The same file also says: "A session that finds a contradiction reports it; it does not resolve it silently." The contradiction was created here and is not reported in the file — only, obliquely, in a commit message, which is not what a session reads to learn its limits.

I make no claim that installing a methodology plugin is wrong, and the honest reading — that a tool dependency is not "working on another repository" — is defensible. What is missing is that reconciliation being written where it governs. One sentence in the hard-limits list distinguishing a work target from an installed dependency would do it.

### `KXR-21` — "MIT licensed, free" is the one claim in the new section that no reader confined to this repository can check

**Severity: minor. Non-blocking. Surface: `CLAUDE.md`; `assets/licenses/`. Reproduction: below. Authority concerned: `CLAUDE.md`, "No paid services, subscriptions or commercial assets"; the licence-provenance practice `assets/README.md` describes.**

The section asserts Superpowers is "MIT licensed, free". A hard limit forbids paid or commercial assets, so that claim is load-bearing. It cannot be verified from here: `WebFetch` and `WebSearch` are both in the deny list, `CLAUDE.md` forbids reading the other repository, and `assets/licenses/` — which holds `GEISTMONO-OFL.txt`, `OUTFIT-OFL.txt` and `ASSET_PROVENANCE.md` for a font and some models — records nothing for Superpowers. A project that files an OFL text for a typeface has no licence record for the dependency it loads into every session.

I am not suggesting the claim is false. I am recording that it rests on the same unverifiable prose as the authorisation, and that the repository has an established place to put the answer.

### `KXR-22` — a fourth independent review of `b27cde14` exists, raised five findings, and the pull request says that commit is unreviewed

**Severity: moderate. Non-blocking. Surface: the pull request description; `docs/process/FINDINGS.md`; `apps/mission-control/test/review-records.test.ts`. Reproduction: below. Authority concerned: `REVIEW_POLICY.md` line 19 — findings are "never renumbered, merged silently or dropped"; `XR-02` as raised.**

The pull request description's table says of `e1d3d62` and `b27cde14`: "**Not reviewed.**" Branch `claude/keeper-review-b27cde14-ug7ffo`, commit `c3d9849a28417ed94d032cb7665da67ffcc2bd8b`, holds `docs/process/KEEPER_RECORD_KEEPING_REVIEW.md` — a full independent Keeper review of candidate `b27cde14a2dd3fe9ad7ac435ded24c49686d68a8`, verdict `PASS_WITH_NON_BLOCKING_FINDINGS`, raising `KXR-13` through `KXR-17`. It was committed at **12:44:04Z on 2026-09-12**, twenty-two minutes before `d7d80fd` at **13:06:18Z** and twenty-nine before the pull request opened at 13:12:57Z.

None of those five ids is anywhere in this candidate:

```sh
git grep -l -E "KXR-1[3-7]" d7d80fd
# (no output)
```

That review's own recommendation was "all five new findings be recorded in the register and none be repaired on this lineage." Neither half has happened, and five findings' full text now depends on one unmerged branch surviving — **which is `XR-02`, in the branch built to end it, for the second time in the same lineage.** `review-records.test.ts` cannot notice: its completeness assertion is `Array.from({ length: 12 })`, hardcoded to `KXR-01`…`KXR-12`, so the register's guard against findings depending on branches is itself pinned to a count that this event has already passed.

I record no view on whether the building session knew of that review. The description is wrong on the facts either way, and it is the document the owner is invited to decide on: it exists, in its own words, "so that decision is made knowing which parts a reviewer has actually looked at."

## Findings already raised that I confirmed still hold at this SHA

`d7d80fd` touches no test and no register file, so everything the fourth review found against `b27cde14` stands unchanged at the candidate. I reproduced the two that are reproducible rather than carrying them on that reviewer's word.

**`KXR-13` — a second table headed exactly like the register is read by nothing. Confirmed.** I appended one section to `FINDINGS.md` carrying a table with the register's exact header and a row reading `| KXR-99 | totally-made-up | gate | … | docs/process/NO_SUCH_FILE.md |`:

```
Test Files  1 passed (1)
     Tests  125 passed (125)
```

A finding with a status outside the vocabulary, a detector claiming a gate caught it, a pointer at a file that does not exist, no attributes row and nothing pinned is now in the findings register, and `pnpm test` is green. The recognised tables are selected with `.find()`, so a duplicate of a recognised header is neither read nor refused — while `FINDINGS.md` tells readers the check refuses "a row in a table the parser does not recognise" and the brief's requirement 5 says "Every table in the file is read, or the file refuses to parse." Both claim more than the guard holds.

**`KXR-14` — the five attributes are pinned by nothing. Confirmed.** I changed `KXR-02` — recorded `major`, reproduction "Delete four rows including `XR-01`; suite green at 40 passed" — to `minor` with "Not reproducible; a cosmetic concern only":

```
 docs/process/FINDINGS.md | 2 +-
      Tests  125 passed (125)
```

The finding that rows could be deleted in silence now says it was never reproducible and never mattered, and the suite is green. `PINNED` covers four cells of every *register* row; the attributes table added in the same commit is held to `value.length > 3`. A severity nothing holds is a severity until someone edits it.

**`KXR-15`, `KXR-16`, `KXR-17`** I read and agree with, and re-derived `KXR-15` by reading `RECORD_KEEPING_BRIEF.md` against the candidate: the brief distinguishes itself from a third repair cycle on the test that "it repairs no finding, changes no guard, and closes nothing", then commits to repairing `KXR-03`, `KXR-09`, `KXR-10`, `KXR-11` and `KXR-12`, and the candidate does it at +583/−187. Every clause of the distinguishing test is false about the work it was written to distinguish. I add nothing to that reviewer's account of it.

## Observations, which are not findings

1. **`SA-G-03` is named in two documents as "the only blocking finding this project has had", and its text exists nowhere.** `git grep "SA-G-03"` across every commit in the repository returns two files, both added by this pull request, both referring to it in passing — "where a fabricated owner decision passed every machine control in one command". No register row, no review document, no run record holds it. The register's exclusions paragraph names which findings are deliberately unseeded and why; `SA-G-03` is not among them. It falls honestly under "no check can know about a finding nobody wrote down", so this is an observation rather than a finding against the register — but the project's only blocking finding is now cited as precedent by documents that are the sole evidence it happened.

2. **The unfiled decisions of 2026-09-12 have grown again.** The first review counted six, the final seven, the fourth about ten. This candidate adds the authorisation to install Superpowers at project scope, and the authorisation to read `obra/superpowers` against a hard limit. Every one rests on an instruction that lives only in the owner console, and `OD-0006` records that the owner reading their own decision records is the only detection of a false one. The number grows at every hop, and this hop's two additions are about the files that declare the limits.

3. **`INSPECTOR_PHASE_1_BRIEF.md` asks the owner a question the same commit answers.** Its "What I need from you" item 3 reads "**Superpowers.** If you are installing it, install it before this starts rather than during" — committed in the commit that installs it. The brief also carries "Status: proposed, not started. Nothing in this document is authority", which is the sentence `KXR-08` was raised about in the previous brief and the repair moved two findings' pointers off. A third brief repeats it.

4. **The brief is otherwise the best-scoped document in this lineage.** Its permitted-paths list is deliberately wider at the start, it names `KXR-07` as the reason, and its part C — insufficient evidence rather than a pass when there is no brief to check against — is the right default and is written down before the code exists. Item 2 puts a real consequence to the owner plainly. That the commit carrying it steps outside its own paragraph is what `KXR-18` is about, and it does not diminish the document.

5. **Both register guards, and now the digest guard, can be deleted in one commit with everything green.** The final and fourth reviews recorded this; it is unchanged, and `KXR-19` extends it to the settings keys. The control is a human reading the diff, as `CLAUDE.md` intends, and not the guard.

## What I recommend, and what I do not

**I recommend no repair on this lineage, and I am not asking for one.** Nothing in `KXR-19` through `KXR-22`, and nothing in `KXR-13` through `KXR-17`, describes anything false in the repository today. I checked the register's twenty-four statuses, detectors, pointers and pinned summaries, and all fourteen attributes rows, against the findings' own text in the three copies I verified byte for byte. Everything there is accurate. They are latent gaps in guards, and prose that has not caught up with the machinery.

`KXR-18` is not a repair for a session either, and that is the substance of the verdict. It asks whether the owner authorised a change to the two files that declare this repository's limits, and only the owner can answer. If he did, the missing artefact is a run record naming the two paths as exceptions — a paragraph, in the shape `b27cde14` already used — or a filed decision record, and this closes. If he did not, that is a decision about work already pushed and not a defect a builder can fix.

`constitution/authority.json` sets `repairLimits.maxCyclesWithOwner = 2`, and on the fourth reviewer's reading (`KXR-15`) this lineage is already past that however it is framed. I have no reason to disturb that reading and none of my findings warrants spending another cycle.

## Verdict

**`INSUFFICIENT_EVIDENCE`.**

The record-keeping work is sound and I would have passed it on its own. Its central claim is the only thing in this lineage anchored outside the sessions that wrote it, and I re-derived all three digests from the reviewer branches rather than trusting them: the copies are byte for byte what those reviewers wrote. Twelve findings' text no longer depends on branches surviving. The suite is green in CI on the exact SHA and green when I ran it myself, no test is skipped or weakened, no gate, constitution file, commission or raw source is touched, and the largest thing in the work is a refusal to file a decision record the owner said he would not read — which was the correct answer and the expensive one.

The verdict is `INSUFFICIENT_EVIDENCE` because of the last commit, and because of what is absent from it rather than what is wrong in it. `d7d80fd` changes `CLAUDE.md`, which declares the hard limits every session is bound by, and `.claude/settings.json`, which declares the permission lists and this repository's one `PreToolUse` guard. Both are outside every permitted-paths list in the repository. No contract governs the commit. No run record describes it, no register row names it, no decision record exists, and the authorisation is one paragraph in the commit message of the commit that makes the change. `REVIEW_POLICY.md` requires that a review examine a SHA against the approved acceptance contract and says that a diff outside permitted paths yields `INSUFFICIENT_EVIDENCE` rather than a pass. There is no contract here to examine it against, which is also why this is not `BLOCKED`: I cannot name the criterion it fails, because none was written.

What the change itself does is narrow and, as far as I can check it, harmless: two keys added, nothing removed, every guarded invariant in the settings file intact, ten additive lines in `CLAUDE.md` that name the plugin's unpinned-version cost against themselves. I verified all of that mechanically. The problem is not the edit. It is that the two files this project relies on to bound its sessions were edited by a session, and the only record of permission to do so was written by that session, in the commit that did it — which the commit message itself identifies as the shape of `SA-G-03`.

Two things the owner should read before deciding. The pull request description says `b27cde14` is unreviewed; a full independent review of it exists on `claude/keeper-review-b27cde14-ug7ffo` at `c3d9849`, dated twenty-two minutes before the final commit, and its five findings are in no file in this repository (`KXR-22`). And `CLAUDE.md` now contains a hard limit against reading another repository and, ten lines below it, the installation of one that every session loads, with the reconciliation between them living only in a commit message (`KXR-20`).

`INSUFFICIENT_EVIDENCE` is not a finding of fault in the work, and it is not `SAFE_TO_MERGE` — `constitution/STATE_LANGUAGE.md`. Nothing here is a recommendation to merge. The missing proof is small, and the owner is the only one who can supply it.
