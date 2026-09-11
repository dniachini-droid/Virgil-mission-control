# Phase 2, slice four — the Prover's window shows the real checks

**Status: accepted by the owner on 2026-09-11, and being built.** He read this page and answered:

> "yes build it"

That instruction is the authority for this slice, under the mechanism `OD-0006` records; this document is the scope he approved, and the Keeper reviews the result against it. What follows is unchanged from what he read — nothing has been added to the scope after the yes.

**Originally filed as: proposed, not started, nothing in this document is authority.** `OD-0009` authorises Phase 2 and says that Phase 2 has no written brief, that no session may decide for itself what the phase contains, and that each slice's scope is written down and seen by the owner before it is built. This is that document for slice four, and it is deliberately one page.

## The problem, in one sentence

Every window in the app is honest and nearly every window is empty: they say `—` and `NOT READ`, because almost nothing real is wired to them.

## What this slice does

**The Prover's window lists the checks that actually ran on your repository, by name, each with its real outcome.**

Instead of a window that says nothing, you open the Prover and read:

```
lint, typecheck, tests                              passed
V11 owner build and verify (portrait-390)           passed
V11 owner build and verify (motion and performance) running
hosted build, read and refused                      failed
```

Tapping a row can open that check on GitHub. That is the whole slice.

## Why this one first

It is the only window where a real source already exists and needs no new plumbing.

- The endpoint **already reads** every check on the head commit and already gives each one a name and one of four states. Today the app throws all of that away except a single counted line in the badge.
- The window **already has** a block type for exactly this shape: a list of rows, each a name and a state.
- So this is joining two things that exist, not building a third.

The Fabricator's window needs file and commit data the app does not fetch yet. The Keeper's needs reading a review record at a commit and proving it is the record it claims to be. Both are real slices; neither is this one.

## The one mismatch, named before it is built

The endpoint produces four states: `passed`, `failed`, `running`, `noResult`. The window's block understands `passed`, `failed`, `running`, `skipped`. **`noResult` and `skipped` are not the same thing** — a check that was skipped chose not to run; a check with no result ran and returned nothing, which is the state `INSUFFICIENT_EVIDENCE` exists for. Drawing one as the other would be exactly the class of untruth this project keeps finding.

So the slice adds a fifth state to the window's vocabulary rather than mapping `noResult` onto `skipped`. That is a small change to a shared type, and it is named here because it is the only part of this slice that touches anything beyond the two ends being joined.

## What it does NOT do, stated plainly

- **It does not make the Prover an agent.** Nobody is running those checks on your behalf inside the app. The window will show what GitHub ran, on the commit the app is already reading, and the window will say so in those words.
- **It does not change the Fabricator's or the Keeper's window.** ~~They keep saying `NOT READ`, because they are.~~ **The struck sentence is false and the Keeper's KP8-06 caught it.** Those two windows do not say `NOT READ` on a live page: the Fabricator's draws eight invented file paths, a terminal reporting `801 passed` with exit 0, and a pull request; the Keeper's draws three invented findings. All of it comes from the recording's fixtures and none of it is about the repository being read. That predates this slice and this slice does not change it — so the first sentence stands and the second was simply wrong about the app. It is struck rather than deleted, because a reader of this brief was told something untrue and is owed the correction where the claim was made. The gap is carried openly as the first candidate for a later slice.
- **It draws nothing when nothing was read.** If the checks cannot be fetched, the window says they were not read — not zero, not empty, not `skipped`.
- **It adds no endpoint, no credential, no new permission.** The data is already in the answer the page fetches.
- **It does not touch the Owner Build.** `__LIVE__` is false there; that build keeps saying what it has always said.

## How you will know it works, without taking my word

- Open the site on your phone, open the Prover's window, and compare what it lists against the checks on GitHub for the same commit. They are the same checks or the slice has failed.
- `verify:web` gains a case: the hosted page is given a known set of checks by the stub and the window must list exactly those names and states — so the wiring is proved by a check that runs in CI, not by me saying it works.
- A test asserts `noResult` never renders as `skipped`.

## Size

Small. One new state in a shared type, one mapping from the answer into the window, one verifier case, two or three unit tests. It is a day's work at most, and most of that is the checking.

## What I need from you

**Yes** — and I build it. **No, do X instead** — and I do that. **Change it** — and I rewrite this page.

If you say yes, this document stays as the record of what was proposed, and the Keeper reviews the result against it.

---

## Amendment, 2026-09-11 — the fifth state is not added, on the owner's instruction

**The brief above proposed something a session is not allowed to do, and it was caught on the first line of the build rather than after it.**

"The one mismatch, named before it is built" ends: *"the slice adds a fifth state to the window's vocabulary rather than mapping `noResult` onto `skipped`."* The reasoning behind that sentence stands and nothing here softens it — `noResult` and `skipped` are different facts and drawing one as the other is exactly the class of untruth this project keeps finding.

What the sentence missed is where the four words come from. They are not the window's list. They are `checkResults` in `constitution/authority.json` — `running`, `passed`, `failed`, `skipped` — which is authority layer 2, and `CLAUDE.md` says only the owner may change layers 1 and 2. A fifth word in the interface would either have been the interface speaking a vocabulary the constitution does not have, or a session editing the constitution to fit its own build. Both are refused, and the second is refused twice over: `constitution/**` is still denied to every session by the two deny lines the owner deliberately left in place.

So the build stopped and put two roads to the owner. He answered on 2026-09-11:

> "1. do it"

That is the first: **keep the four words, and say the rest in a sentence.**

### What is built instead

- The window lists a check only when its result is one of the constitution's four. That list is a claim about every row in it, and every row in it now has a word the constitution recognises.
- A check whose result is not one of the four — cancelled, errored in the runner, finished with no conclusion at all, or reported with no name — is **counted, not listed**. The window says, in a sentence beside the list, `1 check returned no result, so nothing is known about it`, and says the same thing again in the facts section marked `unresolved`.
- Nothing in the interface is drawn as `skipped` that GitHub did not report as skipped. The promise of the original mismatch section is kept; only the mechanism changed.

### What this costs, plainly

A reader sees four states in the list and a sentence underneath, rather than five states in the list. The sentence carries the same fact and carries it in the place a reader looking at the list will see it — but it is a sentence, and a row is easier to scan than a sentence. That is the price of the interface not inventing a word the constitution has not given it, and it is the right price.

This does not close the question. If the owner decides the constitution should have a fifth word for a check that ran and returned nothing, that is his to decide and layer 2 is where it would be written; the interface would then follow. Nothing here presumes that decision either way.
