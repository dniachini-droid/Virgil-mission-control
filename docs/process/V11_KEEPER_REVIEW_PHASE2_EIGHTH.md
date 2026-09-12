# Keeper review — the repair of the seventh review, candidate `0afb38e`

**Verdict: `PASS_WITH_NON_BLOCKING_FINDINGS`.** Twelve findings (`KP9-01` … `KP9-12`), none blocking. The reviewer's answer to the question it was set — *is this safe for the owner to merge to `main`?* — was **yes, with two things said out loud first**.

This is the review the owner's merge of pull request #9 rested on. Filed here because a verdict a merge depends on must be checkable against the reviewer's own words rather than the builder's summary of them.

Reviewed: `0afb38e10092167ab6e5eb145c8c7948f65c6df3`, diff `78af9bc..0afb38e`, 16 files, confirmed current against `origin` at the time of review. Working tree clean at start and finish.

**Reproduced by the reviewer, not taken from the builder:** `biome check .` 295 files no diagnostics; `tsc -p tsconfig.json` exit 0; `vitest run` 35 files, 1,669 tests; `verify:web` PASS after a fresh `build:web`; `verify:owner` PASS; and — in an addendum filed after the review, withdrawing its own stated evidence limit — `verify:owner:v11` PASS at three viewports. Every figure matched the builder's on every count.

---

## Are the four blocking findings closed, or moved?

**`KP8-01` — closed in code, for this repository.** `readBranches` now returns `names` (every row) beside `branches` (the drawn ones), and existence is decided against `names` alone. The reviewer traced every path: `names` is built from all rows, `withShowing` cannot duplicate a row and cannot exceed the cap, and the handler reads `names`. A capped list can no longer make a live branch report absent. Residual at `KP9-05`.

**`KP8-02` — closed for every shape the deployed endpoint can produce; one shape survives.** `if (!answer.head?.sha) return null` refuses head absent, `head: null`, and head without `sha` — but not a head with `sha` and no `shortSha`, which is the field that actually feeds the identifier. See `KP9-02`.

**`KP8-03` — the new route is closed; the old one is open and is now described truthfully.**

**`KP8-04` — the symptom is closed at the interface; the second claimed repair does not exist.** See `KP9-01`.

**Did the repair create anything new?** The reviewer's answer: **no.**

---

## The findings

**KP9-01 — a repair claimed in two places that was not made.** `state.mjs:775-791`. A docblock said the branch precedence *"is fixed here too"*, and the commit message said *"Repaired twice over"*. `git diff` shows the line as unchanged context. The code matches what `PHASE_2_SLICE_5_BRIEF.md` approved, so the product is not wrong — the account of it is. *"This is the species of artefact this file has twice been the subject of by its own admission, and it will make the next reader believe an edit exists that does not."*

**KP9-02 — the guard checks `sha`; the lie is spelled `shortSha`.** Reproduced under `tsx`:

```
state null? false      candidateId present? false      candidateId value: undefined
```

Absence is converted to `9abcdef012` at twelve-plus call sites, so the room would draw it. Not reachable through today's `state.mjs`, which always sets both; reachable if the function and the page ship from different commits, which this codebase names as a risk twice.

**KP9-03 — the new check for `KP8-01` cannot fail.** Two independent reasons: the defect lives in `state.mjs`, which the e2e replaces with a stub that decides existence itself and answers `branchExists: true` for all nine names, so the assertion holds for every possible page behaviour; and the case navigates with a query parameter the app reads only from the hash, taking its branch from `localStorage`, which a previous case had set. *"The stub also reverts to the exact stub shape the same commit condemns 190 lines earlier as 'written in the shape that hides the bug'."*

**KP9-04 — three of the repaired lines are executed by no check at all.** `state.mjs`'s handler is never invoked by any test; `withShowing`, the `exists` expression and the precedence are verified by reading only, and `verify:web` cannot reach them because it stubs the endpoint.

**KP9-05 — the cap moved from 8 to 100; existence is still decided against a cap.** Past 100 branches the identical false statement returns. *"It was carried as `KP8-08` when it was only a listing limit; it is now a correctness limit and deserves that description."*

**KP9-06 — inherited from `main`: two presses from a page that read nothing to the recording's fixtures.** On the branch-gone page the window store still holds its module initial value, `TALK TO VIRGIL` sits outside the state guard, and Virgil's window at rest offers *"Go to the Fabricator"* — which draws `Files changed — 8 of 8` and the terminal. The e2e case asserts only that no window is *already* open and never presses the one control that is always on screen.

**KP9-07 — the brief that is this slice's acceptance contract still says the slice was never started.** And three statements of the same promise, of which only one was struck.

**KP9-08 — the seventh review has no record.** *"A reader of `main` will meet `KP8-01…KP8-11` with nothing to check them against."*

**KP9-09 — `.virgil/state.json` is stale at the commit that merges.**

**KP9-10 — `KP8-07`'s rule is applied to two reads, not to every panel.** The same element is read through `readVisible` in one place and bare in another, in one file.

**KP9-11 — one residual route to the dead page:** when the branch list itself cannot be read, a deleted branch still throws 422 and leaves a page with no list to escape to. *"The slice's promise holds only while the branch list is readable."*

**KP9-12 — cost amplification, carried from `KP8-10`.**

---

## Which new checks would catch a regression, plainly

The reviewer separated them rather than counting them, and this section is the most useful thing in the review:

**Would catch.** The e2e case for `KP8-04` — it asserts a *positive* signal inside a bounded loop, and reverting the row makes it fail. The e2e case for `KP8-02` — the discriminating assertion is the wait for the notice, and the preceding await synchronises past the fetch in both builds, so the transient *"Reading this repository…"* cannot satisfy it early. The unit test for every-branch-exists — it executes the real `readBranches`, and before the repair `names` was `undefined`. Both unit tests on the head guard, one against under-refusal and one against over-refusal.

**Would not catch anything.** The ninth-branch case (`KP9-03`). The trailing assertions of the `KP8-02` case — both vacuous on that page, and one written in the very shape `KP8-07` was raised against.

**Nothing at all covers** `withShowing`, the handler's `exists` expression, or the branch precedence.

## The changed unit test

The reviewer reached the builder's argument independently and confirmed it: the old assertion *"asserted the presence of the placeholder while calling it protection"*, one line beneath a docstring saying the opposite. *"This is a strengthening, not a test bent to admit a change. The one thing it did not do is extend the same reasoning one field to the left, which is `KP9-02`."*

## Truthfulness of the documents

The two struck sentences were confirmed against the code as accurate corrections. The unbuilt acceptance condition is recorded rather than deleted, with a true reason. `SYSTEM_AUDIT_BRIEF.md` recommends rather than cuts and reserves layers 1 and 2 to the owner; its two headline measurements check out — `.git` 500 MB against 499 MB stated, and 192 MB of committed HTML across 27 tracked files rather than the 22 stated.

## Safe to merge?

> **Yes, on my evidence — with two things said out loud first.** … The four blocking findings are genuinely closed rather than moved … and none of my twelve findings is a false statement the page will make to him on a normal live page about a branch that exists.
>
> First, the endpoint's branch precedence was never changed, and two places in the candidate say it was. Second, merging does not stop the Fabricator's and Keeper's windows drawing the recording on a live page — that is inherited from `main`, is now honestly written down in both briefs, and is the first thing a later slice should take.
>
> Neither is a reason to hold the merge. The ninth-branch check should be treated as absent rather than as coverage, which matters mainly because `SYSTEM_AUDIT_BRIEF.md` proposes exactly the machinery — a mutation manifest and refusal of swallowed waits — that would have caught it without a reviewer reading it by hand.

Merged by the owner's authorisation as `91409d0`.
