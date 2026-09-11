# Phase 2, slice four — the Prover's window shows the real checks

**Status: proposed. Not started. Nothing in this document is authority.** `OD-0009` authorises Phase 2 and says that Phase 2 has no written brief, that no session may decide for itself what the phase contains, and that each slice's scope is written down and seen by the owner before it is built. This is that document for slice four, and it is deliberately one page.

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
- **It does not change the Fabricator's or the Keeper's window.** They keep saying `NOT READ`, because they are.
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
