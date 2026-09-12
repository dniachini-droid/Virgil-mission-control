# Lessons the repository keeps — a knowledge layer that compounds instead of scattering

**Status: proposed, not started. Nothing in this document is authority.**

**Drafted by a session that read `NicholasSpisak/second-brain` and `toolboxmd/karpathy-wiki` under the owner's express authorisation on 2026-09-12**, which `CLAUDE.md` otherwise forbids. What is taken from them is **design**, not text. `karpathy-wiki` is MIT; `second-brain` carries no licence at all, and nothing is taken from it.

## The problem, in plain English

**Everything this repository has learned is in the wrong place, and most of it is one branch deletion from gone.**

Three places, and none of them is a knowledge base:

1. **Long comments in source files.** `refusals.test.ts` is 327 lines and 23% of it is prose explaining why eight gates had never refused anything. That prose is genuinely valuable — it is how the next reader knows what breaks without the guard — and it is invisible to anyone not already reading that file.
2. **Review documents.** Twelve findings had their full text only on three unmerged branches until this afternoon. `XR-02` was raised about exactly this and it recurred inside the branch that repaired it.
3. **Run records and briefs.** 46 files in `docs/process/`, eleven of them versions of the same document. `PHASE_1_BACKLOG.md` names the habit: *"leave a superseded document standing and add a note beside it. The result is more to read and less that is true."*

**And nothing generalises.** Every lesson above is written as a fact about Virgil. The owner's goal is a system he points at any project. A lesson that only exists as a comment in this repository's test file cannot travel.

### The mechanism that is missing, named precisely

`knowledge/` already implements the LLM-wiki pattern — `raw/`, `wiki/`, `outputs/`, `index.md`, `log.md`, `SCHEMA.md`, `[[wikilinks]]` — and `packages/knowledge-graph` does something neither reviewed repository does: it derives **claims** tethered to **sources** and computes `min(page authority, weakest supporting source)`, so a claim cannot outrank its evidence. `tools/knowledge-lint` runs it and exits non-zero on blocking findings.

**What is missing is a way in.** Knowledge only enters that wiki when somebody sits down and writes a page. During a build, nobody does — so it goes in a comment instead, which is why the comments are essays.

## What gets built

### 1. A way in — `knowledge/inbox/`

A session that learns something writes one small file and keeps working. Frontmatter: a title, what the evidence is (a path, a commit, a failing output), when, by whom, and which page it probably belongs to. That is the capture idea from `karpathy-wiki`, reduced to the part that matters.

**A capture is not a wiki page and must not be read as one.** It is raw material, and it sits in the inbox until a later pass turns it into one.

### 2. A place for it — `knowledge/wiki/lessons/`

A new category beside `principles/`, `governance/`, `roles/`, `architecture/`, `visual/`. One page per lesson, with a stable id.

Each page carries, in frontmatter: the files it governs, the evidence it rests on, whether it is **specific to this repository or general**, and its tags.

### 3. The link, checked in both directions

A comment shrinks to one sentence and `[[lesson-id]]`. The lesson page names the files it governs.

**Both directions are checked or it rots.** This repository's most repeated finding is exactly this failure: `KP3-05` (two checkers, 106 disagreements), `KXR-08` (a pointer at a document that disclaimed being one), `KXR-12` (instructions wrong about their own guard), `KXR-10` (a pointer satisfied by the register itself). Every time a fact has been separated from the thing it governs here, the two came apart.

So: a `[[lesson-id]]` in code that resolves to nothing fails. A lesson page naming a file that does not reference it back fails. A lesson page named by nothing fails. That is the tether mechanism, extended from pages-and-sources to pages-and-code.

### 4. A loader, not a library — `knowledge/LOADER.md`

`karpathy-wiki` injects a small file at session start saying **how to find knowledge**, never the knowledge itself. That is the whole answer to "sophisticated but does not bloat context".

The loader is held to a **byte budget the check enforces**, so it cannot quietly grow into the thing it exists to avoid. Proposed: **2,000 bytes**. A budget nobody measures is a wish.

### 5. Rules that stop it becoming `docs/process/`

Taken from `karpathy-wiki`, which has clearly already lived through this:

- **Split a page when it holds two distinct ideas.** The reason lesson pages will not become the essays the comments are today.
- **A bounded tag taxonomy: one spelling per idea.** A new tag is a deliberate addition, not a typo that survives.
- **Archive a raw source once five or more pages reference it.**
- **Superseded pages are folded forward and deleted, not annotated.** `PHASE_1_BACKLOG.md` already asks for this and nothing enforces it.

### 6. Scope recorded now, promotion built later

Each lesson is marked `scope: repository` or `scope: general`. **The second wiki is not built in this work.**

`karpathy-wiki`'s best idea is a project wiki and a main wiki, with generalisable knowledge promoted from one to the other. It is also the right thing to build **when a second project exists**. Building a synchronisation mechanism between one wiki and no other wiki is machinery with nothing to do. Recording the scope costs one frontmatter field now and means the data is already there on the day it is needed.

## What it does NOT do

- **It does not convert the existing comments.** The mechanism is built and **one file** is converted as proof. Converting the rest is mechanical, touches many files, and would make this diff unreadable — and a mechanism proved on one file is proved.
- **It does not replace `knowledge-graph`.** Claims, tethers and authority ranks are the part of this repository that neither reviewed repository has. This extends them.
- **It does not import code from either repository.** Design only. `second-brain` has no licence, so nothing at all is taken from it.
- **It does not make a lesson authority.** `CLAUDE.md` layer 5: the wiki explains; it never overrides, and never holds live operational values. A lesson is not a decision, a finding, or a gate.
- **It does not touch `knowledge/raw/`**, which is append-only, or `constitution/`, or the commission.
- **It does not build the background worker, the CLI, the scheduler or the dispatcher.** `karpathy-wiki` is 347 files and 40,833 lines. Most of that solves problems one person with one repository does not have, and adding it would be the bloat this brief exists to prevent.

## Permitted paths

```
knowledge/inbox/**
knowledge/wiki/lessons/**
knowledge/LOADER.md
knowledge/SCHEMA.md
knowledge/index.md
knowledge/log.md
packages/knowledge-graph/src/**
packages/knowledge-graph/test/**
tools/knowledge-lint/**
docs/process/KNOWLEDGE_LESSONS_BRIEF.md
docs/process/KNOWLEDGE_LESSONS_RUN_RECORD.md
docs/process/FINDINGS.md
packages/repo-checks/test/findings-register.test.ts
```

The last two are here because a finding raised by this work must be recordable, and recording one costs an edit in two places by design.

**One file outside this list will be edited and is named here rather than declared afterwards:** whichever source file is converted as the proof in point 3. The builder names it in the run record before converting it. Declaring an exception after taking it is `KXR-07`, which is open.

## How you will know it works, without taking anyone's word

1. **`pnpm check` passes in CI** on the candidate, and `pnpm --filter @virgil/knowledge-lint run lint` still reports no blocking findings.
2. **A capture goes in and a lesson comes out.** The run record shows the capture file, the page it produced, and the index and log updated — with the commands to reproduce it.
3. **Break each direction of the link and watch it fail, by name.** A `[[lesson-id]]` pointing at nothing. A lesson page naming a file that never mentions it. A lesson page nothing references. Each quoted in the run record.
4. **Delete a lesson that code depends on — it must fail.** The `KXR-02` lesson, one layer out.
5. **Grow the loader past its budget — it must fail**, naming the byte count. The check that a context-saving device has not stopped saving context.
6. **The converted file is shorter and says the same thing.** Before and after line counts in the run record, and the lesson page carrying what the comment carried.
7. **Every new guard goes into the mutation manifest as it is written**, not retrofitted.

## Cost, stated before it is spent

Small and local. Markdown files and a graph derivation that already runs. No network, no paid service, no new workflow job, no new dependency, no background process. It runs inside `pnpm test`.

**The ongoing cost is the honest one:** every session now writes captures as it works, and somebody ingests them. That is a habit, not a line of code, and habits are what this kind of system actually lives or dies on.

## Size

Medium. One new category, one loader, a capture format, an extension to the graph, the checks, and one file converted as proof.

## Answered by the owner on 2026-09-13

The four questions this brief opened with are settled. His words, and what each decides:

1. **Branch: `claude/virgil-knowledge`.** One session builds it; a different one
   reviews it.
2. **Scope now, promotion later — yes.** Each lesson records `scope: repository`
   or `scope: general`. The second wiki is built when a second project exists,
   not before. He asked what this meant and agreed once it was put plainly:
   label the lesson now, build the machinery to move it later, because a
   synchronisation mechanism between one wiki and no other wiki has nothing to
   do.
3. **Loader budget: 2,000 bytes**, enforced by a check. About three hundred
   words — a page of directions, not a page of content, and roughly a sixth of
   what `CLAUDE.md` already costs every session. The number can be raised later;
   what matters is that raising it is deliberate and visible.
4. **Credit `karpathy-wiki` in `knowledge/SCHEMA.md` — yes.** MIT, design only,
   one line, and true.

## For the session that builds this

**Read `CLAUDE.md` first.** Then this brief, then `knowledge/SCHEMA.md` and
`docs/process/ROADMAP.md` item 4.

**Derive your tier before you start:** `pnpm tier`. This work edits
`docs/process/FINDINGS.md` and `packages/repo-checks/**`, so it is **tier 3**
and gets the full treatment — brief committed first, independent review, run
record, red before green, register rows. Do not claim a lower one; the check
reads the paths and not the claim.

**What this session must not do.** Merge anything — the owner merges, by
writing `merge approved` and naming the pull request, and nothing else counts.
Touch `constitution/`, the commission, or `knowledge/raw/`, which is
append-only. Perform its own review: recording a finding is a repair, and a
session that built cannot also review.

**The two-round cap is real.** `constitution/REPAIR_LIMITS.md` allows one
repair cycle, or two with an explicit owner decision. Beyond that the work
stops and waits for him. This repository spent two days on eleven rounds of a
small change; do not repeat it.

**One habit worth more than any of the above.** Run the command. Six times in
the session that wrote this brief, a verification was reported that had not
been performed — including the `pnpm standalone` check, whose "PASS" was a
manual reproduction of what the script was meant to do rather than the script,
which turned out to have three defects. Paste what the command printed, not
what it should have printed.
