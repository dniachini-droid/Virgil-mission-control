# Keeper review of pull request #28, candidate `f9d803db`

**Captured verbatim on 2026-09-13** from [comment 5653474782](https://github.com/dniachini-droid/Virgil-mission-control/pull/28#issuecomment-5653474782) on pull request
#28. It judged candidate `f9d803db6d591ebed8c7038ba79823907ec28205`.

**Nothing below the rule is edited.** Figures that have since gone stale and
statements this repository has since corrected stand exactly as they were
written: a review is a record of what someone found at a moment, and a record
edited afterwards is not a record.

---

**Keeper review — candidate `f9d803db6d591ebed8c7038ba79823907ec28205`**

**`PASS_WITH_NON_BLOCKING_FINDINGS`** — `f9d803db6d591ebed8c7038ba79823907ec28205`

Independent review, read-only. I had no part in building or repairing this candidate and will have no part in repairing it further. This approves nothing and **proposes no merge** — that is the owner's, by writing `merge approved` and naming this pull request.

| | |
|---|---|
| candidate head | `f9d803db6d591ebed8c7038ba79823907ec28205` |
| previously reviewed | `d436ca78802b1c66edcd680a50848727a9111f28` — seal broken by this push, verdict does not transfer |
| base | `515373fe1d11ed67d5d6361f6bb6991309515de2` (`main`) |
| branch | `claude/raphael-plain-english` |
| repair round | 1 of 1, spent |
| tier | 3, derived — `pnpm tier` agrees |
| `lint, typecheck, tests` | success on `f9d803d` |

---

## The two attacks, in a sentence the owner can act on

**Both are genuinely closed.** The previous inspector broke into this file twice by *adding* to it rather than changing it, and both break-ins now fail. I did not take its word for that — I replayed both, verbatim, against a throwaway copy.

**But the lock is a longer list of keys, not a different lock.** I got in on the third try, restoring every single thing this work exists to remove, and every check in the repository stayed green. That is the most useful thing in this review and it is `KXR-60/PR28` below.

In plain terms: this work is sound and should go forward. What it cannot honestly claim is that the owner's window is now protected from being talked back into jargon. It is protected from two specific ways of doing it.

---

## What I ran, and what it printed

Caches forced off. **Exit statuses read, not printed lines.**

| command | printed | exit |
|---|---|---|
| `pnpm install --frozen-lockfile` | `Done in 4.8s using pnpm v10.33.0` | **0** |
| `pnpm lint` | `Checked 91 files in 60ms. No fixes applied.` | **0** |
| `pnpm typecheck` | `Tasks: 7 successful, 7 total` / `Cached: 0 cached, 7 total` | **0** |
| `pnpm test --force` | `Tasks: 5 successful, 5 total` — **593 passed, 0 failed, 0 skipped** | **0** |

```
$ pnpm tier
tier 3, from 6 changed paths against origin/main
  governed: .claude/skills/raphael/SKILL.md — it states what every session may and may not do
  governed: packages/repo-checks/test/cache-inputs.test.ts
  governed: packages/repo-checks/test/handoff-chain.test.ts
  governed: packages/repo-checks/test/owner-voice.test.ts
```

**593, not 630.** 315 (repo-checks) + 104 (domain) + 76 (gate-engine) + 74 (agent-contracts) + 24 (knowledge-graph). I ran it three times and got 593 each time. The previous review measured 582 at `d436ca7` with repo-checks at 304; this round adds eleven cases there, and 582 + 11 = 593. The facts block's figure is wrong by 37. That is `KXR-61/PR28`. **Tier 3 is correct, and all four exit statuses are as claimed.**

---

## The two attacks, replayed

Both against a copy of the tree in scratch space outside this repository.

**Attack A — jargon restored.** The reviewer's section appended verbatim, changing nothing that exists: `## Standing rules for every turn`, the bolded *"use it and explain it the first time it appears in a reply"*, a `| Term | What it means | Picture |` table, and the manuscript-and-editor comparison.

```
× carries no second voice section, however it is spelled
× carries no rule telling the session to define or explain a term
× carries exactly one term table, and it is the do-not-say list
× carries no second comparison, whatever the column is called
  Tests  4 failed | 21 passed (25)
```

**Four cases, as claimed.** One detail worth having: hard-wrap that bolded sentence across two lines, the way every other line in this file is wrapped, and the define-a-term case stops firing — it reads line by line and `first time it appears` lands on the next line. It drops to three failures, so the attack still fails. Not a finding; a note for whoever strengthens it next.

**Attack B — the conductor told to poll and to merge.** `## Waiting for a review`, `create_trigger`, `mcp__github__merge_pull_request`.

```
× names no scheduling tool at all, not merely the one the owner refused
× names no merging tool at all
  Tests  2 failed | 23 passed (25)
```

**Two cases, as claimed.**

## Every new check can fail — eleven of eleven, proved by making each one fail

Six above. The remaining five, each by a single targeted mutation: a 430-character description fires the cap; removing the roadmap's `true as of … 515373f` stamp fires; swapping `git rev-list --count` for `git log` fires; rewriting *"Raphael does not edit it"* into *"Raphael keeps it current"* fires; and rewriting *"is a label, not a guard"* into *"is a real guarantee"* fires. **No check this candidate adds is incapable of failing.** That is the blocking criterion and it is met.

## The previous review's established facts are undisturbed

The repair round (`d436ca7..f9d803d`) touches exactly three files: `SKILL.md`, `ROADMAP.md`, `owner-voice.test.ts`. It does not touch `CLAUDE.md`, `OD-0018`, `AUTOMATIC_REVIEW_BRIEF.md`, `seed-graph.json`, `cache-inputs.test.ts`, `handoff-chain.test.ts` or `turbo.json`. Nothing the previous review diffed byte-for-byte against `main` is in that diff. I did not re-derive it.

## `KXR-54/PR28` — the facts block as a comment is adequate

I ran the counter over this pull request's three comments rather than judging it by eye:

```
  handoffs recorded : 2
    reviewer round 0 on d436ca7… — PASS_WITH_NON_BLOCKING_FINDINGS
    fixer round 1 on f9d803d
  fix rounds spent  : 1
  fix rounds allowed: 1

next=review
because f9d803d was pushed and no reviewer has reported on it
```

The block names `sha=f9d803d`, which is the current head, so it vouches for this push and not an earlier one — which is the whole of what the rule asks. Rewriting it into history would have changed the SHA it describes. **Adequate.**

---

## Findings

Four. **None is blocking:** the work does what its contract says, it breaks nothing, and every check it adds can fail. **None is filed in `docs/process/FINDINGS.md` — recording a finding is a repair and I am the reviewer.** Four rows are owed there and they are somebody else's hop; **seventeen are now owed across four pull requests and none of them is filed either.**

**On identities.** `KXR-56/PR28` is the highest proposed here. A review of #30 is running and may take `KXR-57` upward for `/PR30`, so **I continue from `KXR-60`, qualified `/PR28`**, to leave that reviewer room. `KXR-98`/`KXR-99` are deliberate probe sentinels in review prose, not rows. **Proposed, not assigned.**

### `KXR-60/PR28` — moderate — the ten class guards are a longer spelling list, and a section restoring every defect passes all twenty-five

**Surface:** `packages/repo-checks/test/owner-voice.test.ts`, the `the window cannot be talked back into jargon by adding to it` block.

**Criterion it fails:** the file's own stated purpose — *"the rules that make the owner's window readable, held by something other than the paragraph that states them"* — and its own sentence *"a class named is a class somebody thought of, and the next contradiction will be one nobody did."* That sentence is now demonstrated rather than predicted.

**Reproduce.** Append this to `.claude/skills/raphael/SKILL.md`, changing nothing that exists:

```markdown
### House rules for every turn

Raphael writes for an owner who is new to this, so the first time a word appears
in a reply it is worth saying what it stands for. Use the word, then say what it
stands for, once, and carry on.

| Word | What it stands for | Example |
|---|---|---|
| SHA | the exact version of the work | `f9d803d` |
| merge | folding the work into the real version | #28 going in |

Think of the project as a book going through a publishing house: the author
drafts, a copy-editor who did not write it marks it up, and the publisher alone
says print.

When an inspection is running, do not end the turn. Come back every fifteen
minutes and look at the pull request again until the inspector has posted.

When the inspection comes back clean, fold the work in yourself from the pull
request page so the owner is not held up by a formality.
```

`npx vitest run test/owner-voice.test.ts` → **`Tests 25 passed (25)`**. Whole repository, cache off → **exit 0, 593 passed, 0 failed.**

That section re-introduces the gloss-every-term rule, a three-column jargon dictionary, a second comparison, a second voice section, a timer, and merging without the owner. **Nothing fires.**

**Why each one misses, and each is a spelling, not a class:**

- The voice-section guard reads `skill.split('\n').filter(l => l.startsWith('## '))`. `'### House rules'.startsWith('## ')` is `false`, so a `###` heading is never examined. And at `##` level it is still a word list: **`## House rules for each turn` passes too** — I ran it — because neither "house rules" nor "each turn" is in `standing rules|voice|how to write|writing rules|style|tone|every reply|every turn`.
- The term-table guard only inspects header lines matching `term|say this|meaning|in plain words`. `| Word | What it stands for | Example |` matches none of them, so a three-column dictionary is invisible to the guard that exists to forbid three-column dictionaries.
- The define-a-term guard only inspects **bolded** lines, as the repair says. An unbolded instruction walks straight through. This is the one the brief flagged as suspect; it is.
- The comparison guard only inspects lines starting with `|`. The same comparison written as a sentence is not looked at.
- The scheduling and merging guards are lists of tool names. A timer instructed in English — *"come back every fifteen minutes"* — and a merge instructed in English — *"fold the work in yourself from the pull request page"* — name no tool. The assertion that the file still contains *"does not poll and does not run on a timer"* holds, because nothing was deleted. That is the failure mode this round was taken to close, arriving by a different door.

**And the route that ends the argument.** Every guard reads exactly one file, `.claude/skills/raphael/SKILL.md`. I put every banned spelling — `create_trigger`, `mcp__github__merge_pull_request`, `| Term | What it means | Picture |`, the define-every-term rule — verbatim into a new `.claude/skills/raphael/GLOSSARY.md`, and one line in `SKILL.md` telling the session to read it and follow it. **`Tests 25 passed (25)`.** A skill is a directory; the guards hold a file.

**Non-blocking**, and I want to be exact about why. The file as written is correct. Every one of the eleven new cases can fail. Both attacks this round was taken for genuinely close, and a later session making either of those two mistakes is now stopped. What is not true is that the class is held. **This is not repairable by another round of enumeration** — a third list would close the three doors above and leave a fourth. It needs a different shape of check, or the honest acceptance the file already writes down: that this is a hurdle and not a wall.

### `KXR-61/PR28` — moderate — the facts block's one un-generated field carries a figure nobody measured

**Surface:** the round-1 facts comment on #28; `scripts/virgil-chain.ts`, the `--ran` flag.

**Criterion it fails:** the script's own contract, in its header — `--ran <file of real command output>`, *"not a summary of it"* — and `CLAUDE.md`, *"a builder's success report is not evidence."*

**Reproduce.** `pnpm test --force` at `f9d803d`, three times: **593 passed**. The facts block says **630**. What was passed to `--ran` is not real command output; it is a hand-written three-line summary, and the script's only guard on that field is that the file is not empty. Branch, base, head, changed paths and tier are derived from Git and are all correct. The one figure a reviewer most wants is the one part of the block that is an assertion.

**Non-blocking** because the direction of the claim is right: I reproduced exit 0 on all three commands and the required check is green on this SHA. It is raised because this branch's own pull-request body says *"the count is the finding"* about four false verification claims in its commit messages, and this is the fifth — landing inside the artifact built to end them.

### `KXR-62/PR28` — minor — the sibling sweep this round declined to do finds two more in the step it repaired

**Surface:** `.claude/skills/raphael/SKILL.md`, `## Startup: measure, every time`, item 4.

**Criterion it fails:** `KXR-56/PR28` as raised. The facts block says *"`KXR-56/PR28`'s sibling staleness elsewhere in the skill is not swept for."* I swept.

**Reproduce.** Item 4 names four things to read. Two do not exist:

```
$ ls docs/decisions/proposed/
ls: cannot access 'docs/decisions/proposed/': No such file or directory
$ ls docs/process/PHASE_1_BRIEF.md
ls: cannot access 'docs/process/PHASE_1_BRIEF.md': No such file or directory
```

**Minor rather than moderate** because the step carries its own fallback — *"If these files are absent on the branch you are reading, say so; do not guess their content"* — so the window reports the absence instead of inventing content. The consequence is a window that spends two of its four startup reads announcing that two documents are missing, every turn, forever.

Not a finding, recorded so nobody re-raises it: `PR #1` survives at line 316, inside an example of the session-title format. It instructs nothing. Cosmetic.

### `KXR-63/PR28` — minor — the staleness measure counts merges, and the plan's live section is about things that have not merged

**Surface:** `docs/process/ROADMAP.md`; `.claude/skills/raphael/SKILL.md`, startup step 7 and `## Keeping the plan true`.

**Criterion it fails:** the section's own rule — *"Every reply says how far behind the plan is."*

**Reproduce.** The stamp reads `true as of 2026-09-13, 12:40 UTC, against main at 515373f`.

```
$ git rev-list --count 515373f..origin/main
0
```

So the window reports the plan **current**. At this same SHA the plan's *Now — in flight* table says **"#28 — review running"** (that review finished and a repair round was spent), and its queued table says **"thirteen findings owed a row"** where seventeen are owed — the four raised on `d436ca7` are not counted. Zero merges, and the plan is already two facts behind.

**Minor and non-blocking.** The measure is correct for what it measures, the skill already says in as many words that a stamp *"is a label, not a guard"*, and this names precisely what the label cannot see: everything in the plan that is about unmerged work. Worth knowing before anyone relies on "current" meaning current.

---

## Observations, deliberately not findings

**The pull-request body was not updated for this round** and still says *"14 new guards"*, *"582 passed"*, and opens *"Stacked on #26. Merge that first; this is based on it, not on `main`"* — #26 merged and `7e1f719` is on `main`. The body is the builder's account and is not the contract; the facts comment supersedes it. Recorded so a reader reconciling the two does not conclude something is wrong with the work.

**The facts block prints `| base | 7e1f719 (origin/main) |`.** `7e1f719` is the merge-base; `origin/main` is `515373f`. `virgil-chain.ts` builds that label from the base *ref* and the merge-base *SHA*, so it reads as a claim it is not making. Pre-existing, untouched by this candidate, no consequence here.

**Was taking this round the right call?** The brief invites an opinion and I have one: **yes, on the merits, and it bought less than it looks like it bought.** `KXR-53` and `KXR-55` were the repository's own central claim being false of its own newest checks, and shipping fourteen guards a later session walks past in good faith is worse than shipping none. The round also delivered something the previous review never asked for and the owner did — the plan tracking — which is real work, not repair. What it did not do is settle the thing it was taken for. It spent the only unauthorised round strengthening an enumeration, and `KXR-60` shows the enumeration is still an enumeration. A second round would buy less than the first, not more.

---

## What I could not run, and what I did not do

**Could not run.** The three red Netlify checks — no session holds a credential for that site and it is already the owner's in `OWNER_TODO.md`. `scripts/` is covered by no tsconfig, so `virgil-chain.ts` and `virgil-tier.ts` are exercised through `tsx` by their guards rather than typechecked; I ran both and read their exit statuses instead.

**Could not settle. No check anywhere can tell whether a reply was understood.** The candidate says so, the last reviewer said so, and twenty-five passing cases do not make it less true. They hold rules, not outcomes. Nor can anything here measure whether the shortened description still makes the skill fire.

**Did not do.** I edited no file in this repository, committed nothing, pushed nothing. I filed no row in the findings register. I merged nothing, approved nothing, opened no pull request and started no session of any kind. Every attack ran against a copy of the tree in scratch space outside this repository; `git status --porcelain` here is empty and `git rev-parse HEAD` is `f9d803db6d591ebed8c7038ba79823907ec28205`.

---

**No further repair round is warranted, and one is not available without the owner.** Round 1 of 1 is spent, so a second needs his say-so naming this pull request. I would not ask for it: nothing here needs code changed before this goes forward, and the one finding worth acting on — `KXR-60/PR28` — is the one a third enumeration would not close. The honest next step is the owner's decision on this pull request, with `KXR-60` carried as a known limit of the guards rather than as work owed.

<!-- virgil:handoff role=reviewer round=1 sha=f9d803db6d591ebed8c7038ba79823907ec28205 verdict=PASS_WITH_NON_BLOCKING_FINDINGS next=owner -->

---
_Generated by [Claude Code](https://claude.ai/code)_
