# Phase 2, slice five — the app shows every branch, and you choose which one the room is showing

**Status: proposed, not started. Nothing in this document is authority.**

`OD-0009` authorises Phase 2, says Phase 2 has no written brief, that no session may decide for itself what the phase contains, and that each slice's scope is written down and seen by the owner before it is built. This is that document for slice five, and it is deliberately one page.

It exists because of an instruction the owner gave on 2026-09-11:

> "I want the app to show me live work and what's being built right now as well as the state of what's been merged. It's meant to show everything."

and, having been shown three ways to do it, chose the first:

> "Let's do A"

## The problem, in one sentence

The app reads **one** branch — whichever `GITHUB_BRANCH` names — so it can show you what was merged **or** what is being built, never both, and when that branch is deleted the whole site says only that it could not be read.

That last part is not hypothetical. The owner merged pull request #8, deleted its branch, and the site has shown nothing since but `GitHub answered 422 for /repos/…/commits/claude%2Fvirgil-mobile-v11`. The app was telling the truth. The truth was that it had been pointed at a room that no longer exists.

## What this slice does

**The endpoint reads the default branch and every branch with recent activity. The app lists them, says what each one is, and you tap the one you want the room to show.**

Opening the app you would see something like:

```
  main                          merged        4106a78   2 days ago
  claude/virgil-phase-2-slice-4 building      60578d7   6 minutes ago    ← showing
  claude/virgil-phase-1-slice   idle          8531a73   4 days ago
```

Tap a row and the room becomes that branch: its commit on the slab, its checks in the Prover's window, its session report lighting whoever is working. Tap another and it becomes that one.

## Why A, and not the prettier options

The owner was offered three. **B** made `main` the room and showed work in flight as something approaching it; **C** gave every active branch its own presence in the room at once. Both are better products and both invent visual language that does not exist yet — and the room has three stations, which cannot hold five branches without a design decision that has not been made.

A is the smallest thing that makes the sentence *"it shows everything"* true. It adds no metaphor, needs no new 3D work, and does not spend an art-direction decision to solve a data problem. If B or C is where this ends up, A is not thrown away: the list is how you would choose what to look at in either of them.

## What has to change

1. **The endpoint gains a list.** One more call — `/repos/{repo}/branches` — and then, for each branch it decides to watch, the reads it already does for one. Today it makes 8 calls per answer; see **Cost** below for what bounds that.
2. **The endpoint keeps answering about one branch at a time.** The list says what exists; the detail is still for the branch being shown, asked for by name (`/api/state?branch=…`). A single answer carrying full detail for every branch would be the same eight calls times N on every poll, for data the room cannot draw at once.
3. **The page gains the list and the choice.** Which branch is being shown is the page's state, held in the browser, so it survives a reload and costs no server anything.
4. **`GITHUB_BRANCH` stops being the only answer.** It becomes the *default selection* — which branch is showing when you arrive — and nothing breaks when the branch it names is gone: the list still loads and the app says that branch no longer exists, rather than showing nothing at all.
5. **Sessions actually write their status.** `.virgil/state.json` is the mechanism that makes "what's being built right now" mean anything, and it exists, and it is **stale**: its last write says every station is READY and nobody holds the work, while two slices were built that day. A mechanism nobody feeds is decoration, and this project's whole subject is not shipping decoration as evidence. The slice is not finished until a session building on a branch is visible on that branch's row.

## What it does NOT do

- **It does not show every branch in the room at once.** One branch is in the room at a time. That is the difference between A and C, and choosing A is choosing that.
- **It does not invent activity.** A branch with no session report reads `idle`, which means *nobody has said anything about it* — not *nobody is working*. Those are different facts and the row will use the words for the one it knows.
- **It does not add an endpoint, a credential or a permission.** Same function, same token, same scopes.
- **It does not touch the Owner Build.** `__LIVE__` is false there.
- **It does not change the Prover's, Fabricator's or Keeper's windows.** ~~They say what they say today, about whichever branch is showing.~~ **The struck half is false — KP8-06.** The Fabricator's and Keeper's windows are not about the showing branch at all; they draw the same fixtures whichever branch it is. The first sentence is true and the slice changes none of them; the second overstated what those windows do. Struck rather than deleted, for the same reason as the twin sentence in the slice-four brief.

## Cost, stated before it is spent

Every extra branch is more GitHub calls, and this project has already had work stopped dead by a bill.

- The list is **one** call, whatever the number of branches.

  **Correction, made during the build and not smoothed over.** The brief was written as though that one call would carry everything a row needs. It does not: `/repos/{repo}/branches` gives a name and a head sha per branch and **no dates**, and there is no REST call that gives the list with commit times. So the choice was one call without dates, or one call per branch with them. The promise above is kept — one call — and the cost lands on the rows: a branch's time is known only where it has an open pull request to read it from, and a branch without one **says its time was not read** rather than having one guessed for it. The ordering follows the same limit: default branch first, then the branches whose time is known, newest first, then the rest by name — never by an age this function cannot know.
- Detail is fetched for the **showing** branch only — the same 8 calls the endpoint makes today, not 8 × N.
- The list watches at most **eight** branches, chosen by most recent commit, and says on screen when there are more rather than silently truncating.
- The 25-second answer cache stays, and becomes per branch.

So the steady-state cost of having the app open is what it is today, plus one call. Switching branches costs one branch's worth of reads.

## How you will know it works, without taking my word

- Open the app: the list names the same branches `git branch -r` names on your repository, with the same commits.
- Delete a branch the app was showing, reload, and the app says that branch is gone **and still works** — the defect that took the site down today has an executable check.
- `verify:web` gains cases: the hosted page is given a known set of branches by the stub and must list exactly those; selecting one must change what the room reads; and a stub that names a branch which no longer exists must produce the "gone" message and a working list, not a dead page.
- ~~A session building on a branch shows as building on that branch's row, proved by a written `.virgil/state.json` rather than by me saying so.~~

  **Not built, and the Keeper's KP8-05 is right that it was quietly dropped.** Half of item 5 was done — `ce9aa3c` writes a real `.virgil/state.json`, and the branch being shown draws its session report as it always has. The half that is this acceptance condition was not: no row carries a session status, and none can as built, because `readBranches` is given only the branch list and the open pull requests, and the session report is read once, for the showing branch alone. Reading it per branch is one more call per row, which is the cost this brief promised not to spend.
  
  So it is a real deviation from an approved scope, and it is recorded here rather than left for a reader to discover by comparing the page with the product. It is the second candidate for a later slice, behind the two windows in `KP8-06`.

## Size

Medium — larger than slice four. One new endpoint call and a parameter, one list in the interface, the selection state, the stale-status mechanism put to use, and the checks above. Most of it is the checking, as usual.

## What I need from you

**Yes** — and I build it. **No, do X instead** — and I do that. **Change it** — and I rewrite this page.

If you say yes, this document stays as the record of what was proposed, and the Keeper reviews the result against it.
