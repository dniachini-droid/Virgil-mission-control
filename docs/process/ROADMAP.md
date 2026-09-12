# Roadmap — what gets built, in what order, and what happens after

**Status: the owner's agreed order as of 2026-09-12.** Items 1 and 2 are in flight. Everything from item 3 on is agreed in sequence and not yet started; each still gets its own brief, and a brief is where the detail is settled.

**What this document is for.** On 2026-09-12 the owner asked *"I don't know when to move on, otherwise we'll just keep finding stuff."* A list nobody wrote down is a list that gets re-litigated every time somebody asks what is next. This is the list.

**What it is not.** It is not authority. It does not approve anything, it does not replace a brief, and an item appearing here is not permission to build it. `CLAUDE.md`'s authority order puts this at layer 4.

---

## The goal, in one sentence

**An inspector you can point at any project, which decides whether a piece of work is sound without asking the thing that did the work.**

Everything below serves that. The 3D interface is the test subject, not the goal — the owner settled that on 2026-09-12: *"one of my priorities was to build a system that's a very robust building and reviewing system for any project."*

---

## Now — in flight

| | what | state |
|---|---|---|
| **#13** | Merging is the owner's; the tools stop and ask him | **merged** into `main` at `353c082` |
| **#14** | The inspector's foundation — twenty gates that prove they can refuse, findings with one home, `OD-0016`, Superpowers | review running |
| **#12** | Phase 2 slice six — the conversation in the app | review running |

`#14` replaces `#11`, which could not be updated from `main` after `#13` merged.

---

## 1. Merge what is reviewed

Both reviews come back, the owner reads the verdicts, and merges what he is satisfied with. `PASS_WITH_NON_BLOCKING_FINDINGS` is not `SAFE_TO_MERGE` — `STATE_LANGUAGE.md` — so merging is his decision every time, and the phrase is `merge approved`, naming the pull request.

**Non-blocking findings are recorded, not repaired.** That is what the verdict means and it is how the loop ends. Fifteen are open today and every one is in `docs/process/FINDINGS.md`, where nothing can drop them.

## 2. Risk tiers

**The smallest thing on this list and the one that changes everything after it.**

`constitution/REVIEW_POLICY.md` — authority layer 2 — already says *"The Architect's risk classification selects the smallest adequate formation… The full roster is never activated by default."* **That rule has never once been followed.** Every change in this repository's history has activated a full formation, which is the one thing it forbids.

On 12 September a two-file change took five independent reviews and produced twenty-two findings, most of them about the reviewing machinery rather than the product. That is the cost of having no tiering, measured.

Three tiers. Tier 1 — documents, comments, formatting — merges on a green suite with no brief and no review. Tier 3 — anything that changes what a session may do or what a check can catch — keeps exactly the treatment used today. **The tier is derived from the changed paths, never declared**, because a stated tier is a claim and this project does not accept claims.

Brief written and queued: `docs/process/RISK_TIERS_BRIEF.md`.

## 3. Separate the build system from the thing it builds

**Measured on 2026-09-12, and the news was mostly good.** None of `gate-engine`, `domain`, `agent-contracts`, `knowledge-graph` or `knowledge-lint` depends on the application, on `visual-language`, or on anything 3D. The inspector is already standalone.

**The exception is real and was created by the work itself.** `findings-register.test.ts` (619 lines) and `review-records.test.ts` (148 lines) live in `apps/mission-control/test/`, and the mutation manifest and check-quality battery live in `apps/mission-control/e2e/` and `test/`. None of them imports a line of application code. They are there because a brief's permitted paths pointed there, and a session put them where it was allowed rather than where they belonged.

So "run the inspector's checks" currently requires the 3D application's test setup to exist. That is the coupling, and it is the whole of it.

They move to a package of their own. **The check is the point: delete `apps/mission-control` and everything else must still pass.** A line nothing enforces is not a line.

The owner's position, 2026-09-12: *"if it impacts the building system I want it separate."* This is what makes separating possible later without breaking the inspector — and makes it unnecessary to hurry.

**And see "the workbench" below.** If that shape is adopted, this item and item 9 become one move rather than two, because a workbench has no application inside it to separate from.

## 4. The knowledge system, which absorbs the cleanup

**The cleanup that was proposed and abandoned.** A list of twenty-six documents to delete was prepared and was wrong: `PHASE_1_RUN_RECORD.md` cites all eleven `HOW_TO_LOOK` versions and a run record is evidence, live source cites another, and the unsuffixed file turned out to be the oldest rather than the survivor.

**What the analysis found instead:** four documents — 1,200 lines including two full Keeper reviews — that nothing in the repository references at all, and `recordedRun.ts`, shipped source, citing `PHASE_1_HOW_TO_LOOK_V10_REPLAY.md`, **a file that has never existed here.**

Not a bloat problem. An index problem. Deleting would have made it worse.

`knowledge/` already implements the LLM-wiki pattern and `packages/knowledge-graph` already derives claims tethered to sources, computing `min(page authority, weakest supporting source)` — a claim cannot outrank its evidence. Neither of the two repositories reviewed on 12 September has anything like it.

What is added: a way in (`knowledge/inbox/`, captures written mid-work), a place for engineering lessons, the link checked in **both** directions, a loader held to a byte budget so it cannot grow into the context cost it exists to avoid, and the numeric thresholds that stop a knowledge base becoming forty-six files with eleven versions of one document.

Brief written and queued: `docs/process/KNOWLEDGE_LESSONS_BRIEF.md`. Four ideas taken from `toolboxmd/karpathy-wiki` (MIT, design only). Nothing taken from `NicholasSpisak/second-brain`, which carries no licence.

## 5. Phase 1 — the inspector looks at the real thing

**The phase everything else waits on.**

Twenty gates work and every one has been watched refusing something. **None has ever been shown a real piece of work.** Everything they have judged came from a fixtures file describing candidates that do not exist. `ENFORCEMENT_BOUNDARIES.md` has said so from the beginning: the engine *"has no evidence until Phase 2 adapters exist; today only fixtures feed it."*

The judge is built and the courtroom is empty.

What that costs, shown rather than argued: over 11 and 12 September this repository ran its own process by hand. Repair attempts counted in prose. "Did this change only the files it was allowed to?" answered by reading a list in a markdown document. **Three independent reviewers checked that same question by taking the candidate's own word for it** — which is `KXR-07`, and it is open.

One new package fills in the same description of a candidate the gates already accept, from the repository itself: which branch, which commit, anything unsaved, is it pushed, does local match remote, is it built on the agreed base, and **which files changed.** Eight gates fed with facts for the first time. **No gate's logic is touched.**

It **reports**; it blocks nothing. A judge that starts refusing things on its first day, having never been watched, is how you teach people to switch it off.

Brief written and queued: `docs/process/INSPECTOR_PHASE_1_BRIEF.md`.

---

# After Phase 1

Sequenced, not scheduled. Each gets its own brief when its turn comes, and the shape below will be wrong in places by then — that is expected and is why the brief, not this page, is the contract.

## 6. The work order becomes a thing a machine reads

A brief today is a document a session reads and interprets. It becomes a small structured file carrying what is being built, which files may change, who reviews it, and what counts as done.

Then *"did this stay in scope"* stops being a judgement call — and `KXR-07` closes for the first time, because the contract stops being prose written by the party it binds.

## 7. One command, then automatic

`pnpm inspect` → a verdict with reasons. Then it runs on every push as a check, so the verdict appears beside the work without anyone asking.

**This is where the system starts saving time rather than costing it.** Everything before it is construction.

## 8. Memory

A record of what happened to each piece of work: started, built, checked, reviewed, repaired twice. Then the repair limit counts itself instead of being counted in prose, and *"this was reviewed at commit X"* is a fact the machine holds.

`SA-G-01` is the finding this closes: there is no event store, nothing emits `repair_authorised` outside fixtures, and the guard that should refuse an over-limit repair round is correct, tested, and unreachable by real work.

## 9. Portable

Packaged so it can be pointed at a fresh repository and work. **This is the thing the owner asked for on day one** and everything above is the road to it.

## The shape all of this is heading for — the workbench

**Added 2026-09-12, after the owner shared `praxis-agent-suite` and asked whether its structure would keep things clean across many projects.** It would, and it answers a question this roadmap already contains twice.

Praxis separates two folders and nothing else about it matters here:

```
workbench/
├── framework/        the system — vendored, updated from a source clone
└── projects/
    ├── registry.json  project id → where that project actually lives on disk
    └── {id}/          that project's state: its plans, its findings, its lessons
```

**Project repositories stay where they are and stay clean.** Registering one drops a small anchor file carrying an id and no machine paths. The system edits the project's real source wherever it lives; everything the system *learns* accumulates in the workbench under that project's id. Work that belongs to no project runs at a `_meta` scope.

### Why it matters here, specifically

**It dissolves a question this roadmap asks twice.** Item 3 exists because the inspector's checks ended up inside the application, and item 10 exists because the application may want to leave. Under a workbench there is nothing to separate: the system is the workbench and Virgil is a registered project. They were never joined.

**And it answers one this roadmap does not ask.** When the third project exists and the inspector improves, how does the first project get the improvement? Today the answer is copying files between repositories. Under a workbench the framework is updated once and every project already uses it.

### What it does to the knowledge system

Item 4 proposes marking each lesson `repository` or `general` and building promotion between wikis later. **The workbench makes that unnecessary rather than easier.** A lesson about this repository's 3D rendering belongs in that project's folder. A lesson about checks lying about themselves belongs at `_meta`, where every project already reads it. Same distinction, no promotion machinery, and the folder a lesson is written into *is* the decision.

Item 4's brief should be rewritten against this before it is built.

### What is taken, and what is deliberately not

**Taken:** the workbench-and-projects split, a registry with a portable anchor, per-project plus `_meta` state, and a framework vendored from a source clone so it can be updated without touching any work.

**Not taken:** the sixteen named agents, the MCP intelligence layer, the desk system, Docker, the semantic-search stack — 1,253 files of a *different* system. Praxis coordinates agents that hand work to each other. This one verifies work without trusting the agent that did it. Grafting the first onto the second would add no gate, no evidence and no independent review.

### When

**Not now, and the reason is not caution.** Restructuring before Phase 1 means moving a system that does not yet do its job; restructuring after means moving one that works.

So: **Phase 1 builds toward it rather than into it.** In practice that means the evidence collector takes the repository it is inspecting as an argument and hardcodes none of this repository's paths, package names or layout. That is a small discipline during Phase 1 and it is most of the work of items 3 and 9 — which then collapse into one move that is already half done.

---

## 10. Then, and only then, the question of Virgil

Once the inspector is portable and the line between it and the application is enforced by a check, extracting the 3D interface into its own repository is a decision with no cost attached. Until then it is the only thing exercising the machinery end to end, and every sharp finding of the last three days came from the machinery meeting real work.

---

## Outstanding, and the owner's alone

Nothing below can be done by a session.

| | |
|---|---|
| **Branch protection requiring an approving review** | The only merge control no session can touch. Everything in `#13` is a hurdle; this is the wall. Thirty seconds in the repository's ruleset. |
| **Rotate `INSTRUCT_SECRET`** | `SA-S-02`. The attempt limiter is the second layer; the secret's entropy is the first, and no session can install or verify it. The composer is live. |
| **`OD-0013` now states the opposite of the truth** | `main` is protected. Authority layer 1, so only the owner may correct it. `SA-S-04`. |
| **`KXR-03`, `KXR-07`** | Design and authority questions raised by review and deliberately left open for him. |
| **Read `OD-0016`** | It asks him to confirm three specific things, one of which is a path he never separately authorised and may refuse. `OD-0006`: the owner reading their own decision records is the only detection of a false one. |

## What would change this order

- **A `BLOCKED` verdict on `#14` or `#12`** stops item 1 until repaired.
- **The owner deciding the interface is not worth keeping as the test subject** moves item 3 earlier and makes it larger.
- **Anything found in Phase 1 that a gate decides wrongly** is a finding to record, not a licence to edit gate logic inside that work.
