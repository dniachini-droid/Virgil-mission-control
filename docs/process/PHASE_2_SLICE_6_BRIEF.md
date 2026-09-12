# Phase 2, slice six — you talk to Virgil in the app, and it answers

**The owner, 2026-09-11, after a day that did not work:**

> "I want to use the UI to basically have this chat with Virgil and get useful stuff on it. If you can't do it. I'll just throw this away."

and, asked whether to build it:

> "Yes let's do it. And make sure to incorporate reviews with the keeper."

## What this is, in one sentence

**You open the app, type a message, and Virgil replies in a thread — the same shape as the chat you are reading now, on your phone, about your repository.**

## Why it is a slice and not a phase

Almost all of it is already built, and switched off.

| piece | state |
|---|---|
| the app can send your message to `/api/instruct` | **written** — `src/world/live/liveSession.ts:121` |
| a workflow that runs a real Claude session on your repo with your message | **written** — `.github/workflows/instruct.yml`, `claude -p "$INSTRUCTION"` |
| the composer in the window | **written and deliberately disabled**, labelled *"Nothing is sent — there is nothing running behind this build"* |
| the reply coming back | **missing. This is the slice.** |

The system audit found `instruct.yml` has run **zero times, ever**. The pipe from a thumb to a working agent exists end to end and has never been opened.

## What gets built

1. **A conversation the repository holds.** Each exchange is a file: what you asked, when, which run it started, and — when the session finishes — what it said back. Append-only, one file per message, so a reply is evidence rather than a screen state that vanishes on reload.
2. **The session writes its reply.** The workflow already runs Claude and commits; it will now also write the answer into the conversation. A run that dies still leaves the question and the reason, because a message that disappears is worse than a message that fails.
3. **`/api/state` carries the thread**, the same way it carries checks — read from the repository, with the same rule as everything else here: what is not read is not drawn.
4. **The composer is switched on**, and the window becomes a thread rather than a form: your messages, Virgil's replies, and the state of the one in flight.
5. **The room shows it happening.** A session that is answering you is a session working, and `.virgil/state.json` already makes that visible — so the Fabricator lights up while your answer is being written. This is the first time the room will have something true and *interesting* to show.

## What this is not, said plainly before it is built

- **It is not as fast as the chat you are reading.** Every message starts a GitHub Actions run. Expect **minutes**, not seconds. It is closer to messaging someone who is working than to talking to them. If that is not acceptable, it is better to know now than after it is built.
- **It is capped at twenty a day**, by the workflow that already exists.
- **It is not the agent runtime.** One session answers you; the Prover and the Keeper do not become real agents in this slice. The room will show one station lit, honestly, rather than three.
- **It adds no new power.** The workflow, the token and the dispatch already exist. This slice opens a door that was built and shut, and adds a way for what is behind it to answer.

## What must be done first, and is not optional

The system audit's `SA-S-02`: **there is no limit on wrong guesses at `INSTRUCT_SECRET`**, and a correct guess reaches a session running `--dangerously-skip-permissions` with the owner's Claude subscription token in scope. Today that is theoretical because the composer is off and nobody has ever used it. **Switching it on makes it live.**

So, before the composer is enabled and in the same slice: the secret is rotated by the owner to something long and random, and per-address attempt limiting goes in front of the comparison. **The composer does not ship without both.** This is not a recommendation in this document; it is a precondition of the slice.

## How you will know it works, without taking my word

- You type *"what is the state of things?"* into the app and get a real answer, written by a session that read the repository.
- The thread survives a reload, because it is in the repository rather than on the screen.
- `verify:web` gains a case: a stubbed conversation must be drawn as a thread, in order, with the in-flight message marked as in flight and never as answered.
- A message whose run failed shows as failed, with the reason — proved by a stub, not by hoping.
- Every guard above goes into the **mutation manifest** as it is written: break it, and a named check must go red. Not retrofitted afterwards.

## The review

The Keeper reviews the candidate against this page before it merges, as with every slice — and, as `SA-G-04` records, that review is not independent while one session does the building and the filing. It is what is available and it has found something every time.

## Size

Medium. One new file shape, one workflow step, one endpoint field, one window that becomes a thread, the rate limiting, and the checks. The composer and the transport already exist.
