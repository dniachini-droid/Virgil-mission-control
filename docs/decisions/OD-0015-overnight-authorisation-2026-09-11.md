# OD-0015 — The owner's overnight authorisation of 11 September 2026

**Status: accepted.** Authority layer 1.

Filed under the mechanism `OD-0006` records: the owner instructs in the owner console, the instruction is transcribed verbatim, a session files the record. `OD-0006` states plainly what that mechanism costs — no code enforces the verbatim quote or the single channel, and the owner reading his own decision records is the only detection of a false one. That cost applies to this record as much as to any other, and it is worth saying twice on a record that authorises a merge and suspends a constitutional limit.

## Why this record exists

Three things happened on the evening of 11 September that a session may not do on its own, and all three were authorised in a chat window. A merge and a suspended limit that live only in a conversation are indistinguishable, the next morning, from a session that helped itself. So they are written down.

## What the owner authorised

**1. A merge, conditional on evidence.** Asked whether a session might merge pull request #9 to `main` while he slept, he answered:

> "Yes, merge if clean"

The condition was stated in the question and is recorded here as the thing that was agreed: merge **only** on a clean independent review **and** green CI; on anything less, do not merge. Both arrived — the eighth Keeper review returned `PASS_WITH_NON_BLOCKING_FINDINGS` with an explicit *"safe for the owner to merge"*, and all nine CI jobs passed on GitHub's runners at that exact commit. Merged as `91409d0`.

`CLAUDE.md` requires that a session never merge "unless the owner explicitly authorised it in writing for that session". This is that authorisation, and it was for that pull request.

**2. Repair without a further round of consent.**

> "Yes, repair and push"

`constitution/authority.json` sets `repairLimits.maxCyclesWithoutOwner` to 1, and the work of that evening was past it. The owner lifted the limit for that night's work. He did not change the constitution and no session may: the value in `authority.json` is untouched, and layer 2 remains his alone. What this record holds is a **suspension for one night**, not an amendment. It expires with the night's work.

**3. Two mechanisms, out of the order he had himself set.**

> "Yes, start them"

and later, when the scope was restated back to him:

> "No. So the branch cap fix mechanisms 1 and 2 and the efficiency sweep all tonight. I authorise it. Ok? Understood?"

That covers merging the branch-cap repair, building the mutation manifest and the swallowed-wait check, and running the system audit — in one night rather than across the sequence he had set earlier the same evening.

## What was not authorised, and was declined

**A rewrite of git history.** The system audit recommends shedding 192 MB of Owner Builds committed as files, and the direct way to do that is to rewrite history. The session declined to do it and said so at the time. The reason is specific to this project rather than general caution: **every Keeper review record in this repository identifies its candidate by commit SHA.** Rewriting history changes every SHA, so it would silently invalidate the whole provenance chain — the thing this project exists to maintain. A recommendation that does not destroy the record is to be put to the owner instead. The decision is his; this records only that no session took it.

## What this costs, plainly

Three authorisations given in a chat window, at the end of a long day, on work the owner could not inspect at the time. Nothing here was verified by him before it happened; the merge in particular rested on a review he had not read. The protection is that the review is filed (`V11_KEEPER_REVIEW_PHASE2_EIGHTH.md`), the CI run is public, and the commit messages say what was done and why — so it is all checkable afterwards, which is weaker than being checked beforehand and is not recorded as more.
