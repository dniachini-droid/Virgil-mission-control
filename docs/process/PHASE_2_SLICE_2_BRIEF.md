# Phase 2, slice two — the agents appear, and the room says who is only claiming

**Status: proposed, and started on the owner's instruction of 2026-09-10.** Slice one is live: the world reads this repository through `/api/state` and shows the real branch, the real commit and the real check results. It is honest and it is nearly empty, because nothing in it can see an agent. This slice is the answer to what the owner actually asked for — *"it wont show live updates of how each job is going? isnt that the point of this UI??"*

## The gap this closes

GitHub knows about commits, checks and pull requests. Virgil knows about a Fabricator building, a Prover checking, a Keeper reviewing, a candidate moving through fifteen states and a review returning one of four verdicts. **The two vocabularies barely overlap**, which is why slice one lights three facts and leaves the room at rest. Slice one's function refuses to bridge that gap by inference, and it is right to: a human clicking Approve has not performed a Keeper review, and no amount of check-passing produces a verdict.

The gap cannot be inferred. It has to be **reported** — by the sessions doing the work.

## The mechanism

A session working in this repository writes what it is doing to a committed file, **`.virgil/state.json`**, as it goes: which candidate, who holds the work, which hop, what was handed on, what came back. The function reads that file at the branch head, alongside what it already reads from GitHub, and the world draws it.

Chosen over a live backend for three reasons. It needs no new service, no new credential and no new failure mode. Every claim it makes is **traceable**: the file is in the repository, at a commit, and the owner can open it himself. And it is the smallest thing that could possibly show an agent at work, which is the only way to find out whether the room is worth opening before building the expensive version.

## The honesty design, which is the whole of the difficulty

`CLAUDE.md`: **"A builder's success report is not evidence. Deterministic checks and independent review are."**

A file written by a session is a session's report. It is exactly the thing the constitution says not to treat as proof, and the whole product is built around drawing that distinction. So this slice does not weaken the distinction — **it uses it**, because the application already has the vocabulary:

| What the screen shows | Where it comes from | What it is |
|---|---|---|
| Branch, commit, pull request | GitHub | fact, independent of any session |
| Check results and counts | GitHub | **evidence** — a machine ran them |
| Who holds the work, which hop, what was handed on | `.virgil/state.json` | **a session's report** — a claim |
| The review verdict and its findings | a committed review record, named by path and commit | a report, attributable and readable |

The Fabricator's console already says `REPORTED COMPLETE — THE FABRICATOR SAYS THE CODE IS FINISHED. THE CHECKS HAVE NOT CONFIRMED THAT YET.` That sentence is the model for this entire slice. Everything sourced from the file is drawn the way a claim is drawn, and everything sourced from GitHub is drawn the way evidence is drawn, and no screen may blur them.

**Three rules, each testable:**

1. **Provenance on every value.** Each field carries where it came from, and the surfaces show it. A count of passing checks and a claim of a passing review may never look alike.
2. **A stale report is not a current one.** The file carries when it was written and against which commit. If the branch head has moved past it, the world says the report is about an older commit — it does not quietly apply it to the new one.
3. **No verdict without a record.** `keeperVerdict` stays null unless a committed review record says otherwise, and then the screen names the file and the commit it read. Slice one's refusal to translate GitHub approvals into verdicts is untouched.

## What this slice does NOT do

- **It writes nothing to GitHub from the page.** The function stays read-only. The file is written by sessions, in the ordinary way, as part of their commits.
- **It starts no agents and accepts no instructions.** Typing into Virgil remains the owner's item 3 and a later slice.
- **It does not make a session's word into evidence.** If the file claimed a verdict the review record does not support, the screen shows the claim as a claim and the two disagreeing.
- **It does not touch the Owner Build.** V10 stays at 8,528,318 bytes, both file builds keep making zero network requests, and the live module stays compiled out of them.
- **It does not replace the recording.** The replay stays reachable and stays the fixture the honesty tests run against.

## What could go wrong, said in advance

- **The file rots.** A session forgets to update it and the room shows yesterday's hop as though it were now. Rule 2 is the guard: the report is stamped with a commit, and a report about an older commit is drawn as one.
- **The file becomes a place to make the room look busy.** This is the real risk, and it is a discipline problem rather than a technical one. The mitigation is that every value from it is drawn as a claim, so making the room look busy does not make it look *proven*, and the checks beside it come from somewhere a session cannot write.
- **Merge conflicts.** A committed status file changing on every session is a conflict magnet. It stays small, one object, and no history in it.

## How the owner will know it worked

He opens the site while a session is working and sees **the Fabricator lit and holding the work**, the hop it is on, and — when the checks come back from GitHub — the Prover's counts moving, with the two visibly labelled as different kinds of thing.

## What stays open

- The performance governor still cannot detect the failure it exists for, and has never been observed engaging. Unchanged by this slice and still recorded.
- KR-03, KR-06, KR-07, KR-09 remain open.
