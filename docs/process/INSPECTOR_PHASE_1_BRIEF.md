# Inspector, phase one — the gates look at the real thing

**Status: proposed, not started. Nothing in this document is authority.**

**The goal this serves, in one sentence:** an inspector you can point at any project, which decides whether a piece of work is sound **without asking the thing that did the work**.

This is phase one of that. It is the phase everything else waits on.

## The problem, in plain English

The gate engine has twenty checks. Every one of them works, and as of `ec53d98` every one has been watched refusing something.

**They have never been shown a real piece of work.** Everything they have ever judged came from `packages/test-fixtures/src/candidates.ts` — worked examples, written by hand, describing candidates that do not exist. `docs/architecture/ENFORCEMENT_BOUNDARIES.md` has recorded this from the beginning: the engine *"has no evidence until Phase 2 adapters exist; today only fixtures feed it."*

So the judge is built and the courtroom is empty.

**What that costs, shown rather than argued.** Over 11 and 12 September, this repository ran its own process by hand:

- Repair attempts were **counted by me, in prose**, against a limit the constitution states in a file.
- "Did this change only the files it was allowed to?" was answered by **reading a list in a markdown document** and comparing by eye.
- **Three independent reviewers checked that same question by taking the candidate's own word for it.** That is `KXR-07`, and it is open.

None of those needed a person. Every fact involved is sitting in git, and nothing was reading it.

## What gets built

**One new thing, and no existing thing is changed.**

The twenty gates already accept a single object describing a candidate — what branch it is on, what files it changed, whether the tree is clean, and so on. Today that object is written by hand in a fixtures file. This phase builds something that fills in the same object **from the repository itself**.

The gates do not know the difference and do not need to. Nothing in `packages/gate-engine/src/` is edited.

### Part A — the collector reads git

A new package, `packages/evidence-collector/`, which runs ordinary git commands and reports what it finds:

- which branch this is, and which commit
- whether anything is unsaved
- whether the work is pushed, and whether the local and remote commits match
- whether this is built on top of the agreed starting point
- **which files changed**, against that starting point

That is seven of the twenty gates fed with facts for the first time.

**It is kept deliberately separate from the gates**, in its own package, for a reason that matters later: the gates stay pure — they take a description and return a verdict, and can always be tested with worked examples. The collector is the part that touches the real world. Mixing them would make both harder to trust.

### Part B — the permitted paths come from the work order

The eighth gate is `diff_within_permitted_paths` — *did this change only the files it was allowed to?* — and it is first among equals here, because it is the one three reviewers had to take on trust, and the one that keeps an agent inside its fence.

It needs two things. The changed files come from Part A. The allowed list comes from the brief, and **the briefs already carry it**: every one of them has a `## Permitted paths` heading followed by a fenced block, one pattern per line. No new file format is invented; the documents this project already writes become the thing the machine reads.

### Part C — it refuses rather than shrugs

If there is no brief, or the brief has no permitted-paths block, the gate returns **insufficient evidence** — never a pass.

This is `KP2-07`'s rule, and that finding is why it is written down here before the code exists. The endpoint that starts sessions once treated an unreadable record as an empty one, and the moment GitHub returned an error, two limits silently switched themselves off and the system looked exactly as it does when nothing has happened yet. **A limit that cannot be checked has not been satisfied.**

## What it does NOT do

- **It does not block anything.** Phase one reports. Nothing is refused, no push is stopped, no check goes red because a gate said no. Enforcement comes later and deliberately: a judge that starts refusing things on its first day, having never been watched, is how you teach people to switch it off.
- **It does not touch the gates.** Nothing in `packages/gate-engine/src/` is edited. If a gate turns out to judge real evidence wrongly, that is a finding to record, not something to fix from inside this work.
- **It does not read GitHub.** Check results and review records are real facts and they are the next phase. This one is git alone: local, instant, free, and needing no token, no network and no permission.
- **It does not invent a work-order format.** Phase two does that, if it is needed. This reads the documents that exist.
- **It does not claim the other twelve gates are fed.** Eight, honestly, and the register will say which.
- **It does not touch `constitution/`, the master commission, or `knowledge/raw/`.**

## Permitted paths

```
packages/evidence-collector/**
packages/gate-engine/test/**
docs/process/INSPECTOR_PHASE_1_BRIEF.md
docs/process/INSPECTOR_PHASE_1_RUN_RECORD.md
docs/process/FINDINGS.md
apps/mission-control/test/findings-register.test.ts
```

`FINDINGS.md` and its test are here because any finding this work raises must be recorded, and recording one now costs an edit in two places by design.

**A path outside this list is out of scope.** The last two briefs each needed an exception and each declared one in prose, which is `KXR-07` — so this list is deliberately wider at the start rather than narrow and broken later. If it is still wrong, the answer is to say so and stop, not to take the exception and write a paragraph about it.

## How you will know it works, without taking anyone's word

1. **`pnpm check` passes in CI** on the candidate, not in the session that wrote it.
2. **The collector's answers match what git actually says.** For each fact it reports, the run record shows the plain git command a reader can run themselves, and the two agreeing. A collector that is confidently wrong is worse than no collector.
3. **Point it at this very branch and it names the files this branch changed** — and they are the files the brief permits. The first real use of the inspector is on itself.
4. **Change one file outside the permitted list; the gate must fail, naming that file.** Quoted in the run record.
5. **Hide the brief; the gate must return insufficient evidence, not pass.** Quoted in the run record. This is the one most likely to be got wrong, and it is the one that matters most.
6. **Every new guard goes in the mutation manifest as it is written.** Break it, and a named check must go red. Not retrofitted afterwards.

## Cost, stated before it is spent

Near zero, and deliberately. Git commands run locally in milliseconds. No network call, no GitHub API, no paid service, no new workflow job, no new dependency. It runs inside `pnpm test`, in the job every push already pays for.

## Size

Medium. One new package of perhaps two hundred lines, a parser for a fenced list, and the checks. No existing file is rewritten.

## What I need from you

1. **The branch name**, and confirmation that one session builds this and a different one reviews it.
2. **A policy question with a real consequence for your day.** When the inspector cannot tell — no brief, no permitted-paths block, nothing to compare against — it returns *insufficient evidence* and never *pass*. That is the right default and it is what `KP2-07` and `STATE_LANGUAGE.md` already require. But it means **any change made without a brief can never be judged sound**, including a one-line typo fix. Confirm you want that, or say what the exception is.
3. **Superpowers.** If you are installing it, install it before this starts rather than during, so the first work built under it is built under it from the beginning.
