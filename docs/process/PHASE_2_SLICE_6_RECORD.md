# Phase 2, slice six — what was built, and what is not finished

**The brief:** `docs/process/PHASE_2_SLICE_6_BRIEF.md`. **The branch:** `claude/virgil-checks-and-records`. **The owner's sentence it exists to answer:**

> "I want to use the UI to basically have this chat with Virgil and get useful stuff on it. If you can't do it. I'll just throw this away."

This record is written by the session that did the building. By this repository's own standard that makes it a claim and not evidence (`CLAUDE.md`). The evidence is the checks named beside each item, which anyone can run, and the Keeper review that has not happened yet.

## What is built

| the brief's item | state |
|---|---|
| 1. A conversation the repository holds | **built.** `Conversation` in `packages/agent-contracts/src/live.ts`, `schemas/conversation.schema.json`, a hand-written twin in `netlify/functions/state.mjs`, and a generated drift battery holding the two together |
| 2. The session writes its reply | **built.** `scripts/virgil-conversation.mjs`, called three times by `.github/workflows/instruct.yml` |
| 3. `/api/state` carries the thread | **built.** `readConversation`, carried as `conversation` / `conversationReason` / `conversationStatus` |
| 4. The composer, and the window as a thread | **the thread is built.** The composer was already live on the hosted build and is unchanged except for one sentence; see "what the composer does" below |
| 5. The room shows it happening | **partly, and honestly.** See "what the room does not show" below |
| the precondition: attempt limiting on `/api/instruct` | **built**, and what it is not is recorded in `docs/architecture/ENFORCEMENT_BOUNDARIES.md` |

## The two drifts this slice found in checkers a generated battery had already passed

Deciding what the writing step should do with an agent that prints nothing forced a question neither checker had been asked, and the answer was drift in both directions:

- **`answer: ''` and `reason: ''`.** The schema accepted them — `.max()` implies no minimum — and the deployed wire check refused them. A blank reply bubble is Virgil answering with silence. Both now refuse it, and an empty reply is recorded as **failed with a reason** rather than as an answer.
- **`runUrl`.** The schema said `.url()`, which accepts `javascript:alert(1)`, `mailto:` and `ftp:`; the wire asked only for a non-empty string under 400 characters. The value becomes an `href` on the owner's phone. Both now ask what a browser would do with it, and `liveState.ts` asks a third time in the browser.

`KP3-05` established that a generated battery finds far more than hand-paired cases, and it did — 106 in one afternoon. What it cannot find is this: it generates from the **shape**, and an empty string and a URL scheme are values. Eight cases were added by hand beside it, and the battery keeps them honest.

## What the composer does, exactly

It was already wired (`liveSession.ts`, `AgentWindow.tsx`) and already sends on the hosted build once the owner gives the page his secret. One sentence was added to what it says after a successful send: **where the reply will appear and how long it takes.** The owner asked for seconds, was told plainly that seconds needs a paid API key his own `CLAUDE.md` forbids, and chose to keep the rule. A composer that says *"Sent"* and then shows nothing for four minutes is the version of that choice where he thinks it is broken.

## What the room does not show, said plainly

The brief's item 5 says *"the Fabricator lights up while your answer is being written"*. **It does not, and it should not.**

`instruct.yml` reports the holder as `virgil`, not `fabricator`, and that is the Keeper's `KP2-15`: what runs there is an unscoped session with no work order, no permitted-paths contract and no acceptance criteria. A Fabricator is a role with a boundary. The room draws **no station lit** for a holder with no station, which is the honest half of a real loss already recorded in `ENFORCEMENT_BOUNDARIES.md`.

So what the room shows while a session is answering is: the note on the report, saying an unscoped session is working and naming the run. Not a lit station. The brief's sentence was written before `KP2-15` was repaired and is wrong about what this system should draw; it is left standing rather than quietly edited, and this paragraph is the correction.

## How to check it without taking this session's word

```sh
pnpm --filter mission-control exec vitest run test/conversation-writer.test.ts   # 24 cases, running the real writer
pnpm --filter mission-control exec vitest run test/live-state-v11.test.ts        # the drift battery and the browser's own re-check
pnpm --filter mission-control exec vitest run test/window-content-v11.test.ts    # the thread, in order, in nobody's voice but the right one
pnpm --filter mission-control exec vitest run test/instruct-v11.test.ts          # the workflow's guarantees, and ten cases that run the endpoint
pnpm --filter mission-control build:web && pnpm --filter mission-control verify:web
pnpm --filter mission-control mutate                                            # 19 deliberate defects, 18 caught
```

`verify:web` was proved red before green: with `liveVirgilThread` removed so a live page falls back to the recording's scripted turns, it produces ten failures, including *"the live thread drew the recording's scripted line 'Good evening'"*.

One check in that file went red for the wrong reason on the way, and was repaired rather than re-run: the branch-list-past-the-cap case read its panel without waiting for it, so it raced the page's own fetch and failed a build that was correct. `K11-04`'s rule — wait for the condition, never for an interval — which this file records and had not applied there.

## What is not finished

- **The Keeper has not reviewed this.** It reviews the candidate against the brief before it goes near `main`, as with every slice, and — as `SA-G-04` records — that review is not independent while one session does the building and the filing. It is what is available and it has found something every time.
- **`INSTRUCT_SECRET` has not been rotated.** The attempt limiter is the second layer; the secret's entropy is the first, and it is the owner's to install. Nothing here can do it or check that it was done.
- **Nothing has ever run through this end to end.** `instruct.yml` has still run zero times. Every part above is checked against a stub. The first real message the owner sends is the first time any of it meets a real GitHub Actions run, and that is worth knowing before he sends it.
