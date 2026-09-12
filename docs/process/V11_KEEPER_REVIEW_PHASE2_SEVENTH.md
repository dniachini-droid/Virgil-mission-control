# Keeper review — Phase 2 slice five, candidate `a1f723c`

**Verdict: `BLOCKED`.** Four blocking findings (`KP8-01` … `KP8-04`), eight non-blocking.

Filed from the reviewing session's report. The Keeper is a separate session with no part in building this candidate. This record exists because `KP9-08` found it missing: the review had been acted on and lived only inside a builder's commit message, which is exactly what `2c7b431` — "the record was missing" — was created to prevent. A reader of `main` meeting `KP8-01…KP8-11` had nothing to check them against.

Reviewed: `a1f723c34bf025783da9b7144ec7698a9a0deb74`, diff `78af9bc..a1f723c`, 15 files. No path under `constitution/`, `.claude/`, `docs/product/` or `docs/decisions/` — verified by the reviewer with `git diff --name-only` returning zero paths.

**Reproduced by the reviewer:** `tsc --noEmit` exit 0; `vitest run` 35 files, 1,667 tests; `biome check` over 210 files; `knowledge-lint` no findings; `readBranches` and `isBranchName` driven directly; `stateFromAnswer` + `windowDoc` driven on a real `branchExists: false` answer. **Not reproduced:** the three browser verifiers — no Playwright binaries in that environment.

---

## Blocking

### KP8-01 — the eight-branch cap made a branch that exists report `branchExists: false`

`netlify/functions/state.mjs:60, :683, :754-756`; surface at `MobileRoom.tsx:817, :852`.

`readBranches` returned `rows.slice(0, WATCHED_BRANCHES)`, and the handler tested existence **against that truncated list**. On a nine-branch repository the ninth was reported as not being in the repository at all. Driving the real `readBranches` with the nine real names:

```
--- with 0 open pull request(s) ---
total exists : 9  listed: 8
  branchExists:false -> "claude/virgil-phase-2-slice-4" is declared NOT in the repository
```

The branch declared deleted was **the candidate's own branch**. The page then drew *"claude/virgil-phase-2-slice-4 is not in this repository any more — most likely merged and deleted"* — a false statement about the repository, asserted with a cause, on the surface built to cure exactly that. Self-contradicting too: because `gone` forces the panel open, the note beneath it rendered *"Showing 8 of 9 branches … 1 more exist and are not listed"*. One panel, two answers, the false half the prominent one. The branch was also absent from the list, so there was no way to reach it.

Fails the brief's own acceptance criterion: *"the list names the same branches `git branch -r` names on your repository"*.

### KP8-02 — a deleted branch defeated the null-state guard, and the room drew the fixture commit `9abcdef`

`liveState.ts:336`; `state.mjs:771`; the guard defeated is at `MobileRoom.tsx:1518-1525`.

The new `branchExists: false` answer is `ok: true` with `head: null`, so `stateFromAnswer` returned a non-null live state with `candidateId` absent, and the world drew. The comment immediately above that line names this exact failure and claims it prevented:

> "a lie with a specific shape: `screens/candidate.ts` supplies a data-shaped identifier when none is set, so a live page that had read nothing would draw `9abcdef` beside a real branch name and look exactly like a page that had. … **So `null` here**, and the DOM says what happened instead."

Reproduced by driving `stateFromAnswer` then `windowDoc`:

```
CONTENT {"verdict":"—","active":null,"candidate":null,"branch":"claude/virgil-phase-2-slice-4"}
##### virgil :: Nothing is being worked on
  rows: [… ["Exact version being worked on","9abcdef012"] …]
```

Before this diff a deleted branch produced `ok: false`, `stateFromAnswer` returned `null`, and nothing was drawn. The candidate converted an honest dead page into a page showing an invented commit id under the caption *"Exact version being worked on"*. The `KP7-01` family, created rather than closed.

### KP8-03 — on the same page, the Fabricator's and Keeper's windows drew the recording as fact

`windowContent.ts:304-323` and the `fabricatorDoc` / `keeperDoc` bodies.

Driving `windowDoc` on the same state — a branch the page had just said did not exist:

```
##### fabricator :: The Fabricator is not working
  SECTION files | Files changed — 8 of 8
     eight invented paths, +486 lines on one of them
  SECTION activity
     {"kind":"terminal","command":"pnpm --filter mission-control test",
      "lines":[…"Tests  801 passed (801)"],"exit":0}
  SECTION candidate | {"kind":"pr","title":"V11 stage 3 — the windows","state":"DRAFT"}
##### keeper :: Nothing is being reviewed
  SECTION findings | What the review found — 3 so far
```

**Attribution, stated precisely by the reviewer:** the same fixtures are drawn on *any* live page, so the behaviour predates the diff. Two things made it blocking anyway — the deleted-branch route into it was new, and `PHASE_2_SLICE_4_BRIEF.md:49`, added by this diff, told the owner the opposite: *"They keep saying `NOT READ`, because they are."* They do not.

The reviewer's answer to whether `KP7-01` was genuinely closed: **closed for the Prover's window, and only there.** The repair at `windowContent.ts:1053` is sound and could not be defeated. The defect class is alive on two of the four windows and on the slabs.

### KP8-04 — tapping the default-branch row did not select the default branch

`MobileRoom.tsx:878`; `state.mjs:730`.

The row sent `null` for the default branch, meaning "omit the parameter", and the endpoint resolved an omitted parameter as `asked || branch || repository.default_branch` — consulting `GITHUB_BRANCH` **before** the repository's default. Whenever that variable names another branch, tapping `main` asked for that instead, with no way to reach the default except by clearing a hosting setting the app cannot touch.

Broke the slice's central promise for the one row the owner most needs — *"the state of what's been merged"*, the first half of the instruction the slice was built from.

**The new e2e case could not see it:** the stub was written as `const which = asked ?? 'main'`, modelling a server whose default *is* `main` — the one configuration in which the defect is invisible — and the case tapped the work branch, never the default row.

---

## Non-blocking

**KP8-05** — an approved scope item silently not built: per-row session status, which the brief named as the acceptance condition (*"not finished until a session building on a branch is visible on that branch's row"*). Half was done; the half that was the condition was not, and no correction recorded it.

**KP8-06** — two brief sentences untrue of the artefact, in both briefs (the `NOT READ` claim of `KP8-03`, and *"They say what they say today, about whichever branch is showing"* — those windows are not about the showing branch at all).

**KP8-07** — the new e2e branch cases had the `KP7-05` defect the same commit cured elsewhere: `readSheet` is a genuine repair and could not be got past, but the slice-five cases read `innerText` directly, which falls back to `textContent` for an element that is not rendered, so a hidden panel satisfied every assertion — including the one whose comment read *"the way out is on screen without another press"*, which counted DOM nodes.

**KP8-08** — `branchesTotal` cannot exceed 100: `/branches?per_page=100` with no pagination, so above 100 branches a truncated list can still claim to be complete.

**KP8-09** — a pull request's `updated_at` drawn as when the branch last moved. A comment or a label bumps it without any commit, so a row can say "2 minutes ago" for a branch whose last commit is days old.

**KP8-10** — `?branch=` defeats the answer cache as a cost matter: sixteen slots are trivially rotated by an unauthenticated caller, and every miss costs three to eight GitHub calls. Recorded as non-blocking because `?fresh=1` already permitted unbounded amplification at the base commit — the candidate widens a hole it did not make. The reviewer separately confirmed the cache **cannot** be made to serve one branch's answer under another's name, and that its growth is bounded.

**KP8-11** — the guard's docstring described six URLs the file does not have. **On the substance the guard holds:** the reviewer attempted percent-encoded traversal, fragment and query injection, and non-ASCII. Several names git itself refuses do pass `isBranchName` — `%2e%2e%2fetc`, `main#frag`, `main&per_page=1`, a leading dash, zero-width characters — and every one is neutralised by `encodeURIComponent` at all three call sites. No name could be constructed that escapes its path or query position. *"The load-bearing defence is `encodeURIComponent`; `isBranchName` is a correct and useful second layer."*

**KP8-12** — an evidence limit rather than a defect: the browser verifiers could not be re-run in the reviewing environment.

---

## Is this candidate safe to merge?

The reviewer's answer was **no**, and the reasoning is worth keeping:

> Two of the four blocking findings are the project's defining failure, in the surface built to cure it. … The slice's diagnosis was right and its architecture is right — reading the list before the branch, `null` rather than `[]` for an unread list, refusing the caller's name before encoding it, and `branchExists: false` as a fact rather than a failure are all good decisions. **What has not been done is to follow the new `ok: true`-with-nothing-read answer through the surfaces that consume it.** The candidate removed the guarantee those surfaces relied on — that a live page which read nothing has `state === null` — without replacing it.

## What happened next

Repaired in `331b97b`, re-reviewed as the eighth review (`V11_KEEPER_REVIEW_PHASE2_EIGHTH.md`), which found the four blocking findings closed rather than moved and returned `PASS_WITH_NON_BLOCKING_FINDINGS`. This document is the record of a review, not a claim that its repair was sound; that is the eighth review's subject.
