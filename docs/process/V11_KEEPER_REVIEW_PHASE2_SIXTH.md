# Keeper review — Phase 2 slice four, candidate `dd52d94`

**Verdict: `BLOCKED`.** One blocking finding (`KP7-01`), eight non-blocking.

Filed verbatim from the reviewing session's report. The Keeper is a separate session with no part in building this candidate; this document is its words, not the builder's summary of them. Where it quotes a comment or a commit message, the quotation is the thing under examination.

Reviewed: `dd52d9457e9824ca4962f7d74a9386ce8b9bb769` on `claude/virgil-phase-2-slice-4`, against `docs/process/PHASE_2_SLICE_4_BRIEF.md` including its amendment of 2026-09-11. Diff `ece1958..dd52d94`, seven files, none under `constitution/`, `.claude/`, `netlify/`, `docs/product/` or `docs/decisions/`.

**Reproduced by the reviewer:** `tsc` exit 0; `vitest run` 35 files, 1,644 tests passed, matching the builder's reported figure; `constitution/authority.json` `checkResults` = `["running","passed","failed","skipped"]`, the same list the mapping reads. **Not reproduced:** `verify:web` and `verify:owner:v11` — no Playwright browser binaries in the reviewing environment (`KP7-08`).

---

## KP7-01 — blocking. When the checks cannot be read, the live Prover's window draws the recording's fourteen checks and marks them `verified`

`apps/mission-control/src/world/window/windowContent.ts:905`; `src/world/live/liveState.ts:256-274, 372-377`; wire at `netlify/functions/state.mjs:610-623`.

Criterion failed — the brief, line 50: *"**It draws nothing when nothing was read.** If the checks cannot be fetched, the window says they were not read — not zero, not empty, not `skipped`."*

`checksOf` returns `null` whenever `answer.checks` is absent or `runs` is not an array, and `proverDoc` guarded only on truthiness, with no test of `state.mode`. `state.mjs` returns `ok: true` with `checks: null` whenever all three GitHub sources refuse — a token without the scope, a 403 rate limit, a 5xx — and sets `checksReason` beside it. In that answer the page is live, `stateFromAnswer` returns a live state, and the Prover's window is the **recorded** document.

Reproduced by driving `stateFromAnswer` then `windowDoc` with `{ ok: true, checks: null, checksReason: "No source could be read: check runs (403), workflow runs (403), commit statuses (403)." }`:

```
state.mode = live   state.checks = null
section checks | The 14 checks it has to run | 14 finished, 0 still to come
  {"kind":"checks","rows":[{"name":"biome lint","state":"passed"}, … ]}
section facts  | {"kind":"facts","rows":[{"text":"14 checks have run and passed so far","standing":"verified"}, …
```

Three things make this blocking rather than cosmetic. The section summary `14 finished, 0 still to come` is visible without opening anything. The fact `14 checks have run and passed so far` carries `standing: "verified"` — a fixture from `screens/tally.ts` presented on the one surface whose subject is the difference between evidence and claim. And the badge on the *same page* (`MobileRoom.tsx:823-827`) says, in that exact state, *"The check results could not be read this time, so none are shown — not zero, which would be a different claim."* The page contradicts itself, and the false half is the more prominent one.

The behaviour predates the diff, but the brief put this case inside this slice's scope, and the candidate's own new comments assert the opposite of what it does: `windowContent.ts:902-904` — *"The recording below is what a scripted run has, not a fallback the live path may quietly borrow from"* — and `liveState.ts:373-376`. In live mode it is not a scripted run and nothing on screen says so. The unit test *"reads nothing at all from a runs field that is not a list"* asserts `checks` is `null` for four malformed payloads; each of those four is a route into the fixtures, and no test follows any of them into the window.

## KP7-02 — non-blocking. `All N checks passed` when a check was skipped

`windowContent.ts:744-777`. The conclusion chain tests `total === 0`, `failed > 0`, `running > 0`, `noResult > 0`, then falls through to `All N checks passed`. `skipped` is counted nowhere in it, so `[passed, skipped]` reaches the last branch, and the headline contradicts the facts block two sections below it in the same document. Non-blocking only because today's `state.mjs` cannot emit `skipped` (`KP7-03`) — a defence the candidate's own comment at `liveState.ts:344-351` rejects: *"the function and this page are separate artefacts that can ship from different commits, and 'the other side already checked' is the assumption that produced the finding."* The slice's own e2e stub sends a skipped row.

## KP7-03 — non-blocking. GitHub's `skipped` never arrives as `skipped`

`netlify/functions/state.mjs:108-153`, unchanged by this diff. `success` → `passed`; `failure`/`timed_out` → `failed`; **everything else**, `skipped` included, → `noResult`. So the constitution's fourth word can never appear in a live row; the section summary permanently reads `· 0 skipped`; and a check GitHub reported as skipped is described to the owner as *"1 check returned no result, so nothing is known about it"*. Something **is** known about that check, and the project has the word for it. The wire carries the conclusion in `detail`, which this candidate newly typed and never reads.

This bears on the amendment's truthfulness. *"Nothing in the interface is drawn as `skipped` that GitHub did not report as skipped"* is true but vacuous; *"What this costs, plainly"* names only the sentence-versus-row cost and omits this one, which is larger.

## KP7-04 — non-blocking. An approved scope item silently not built

Brief line 28: *"Tapping a row can open that check on GitHub. That is the whole slice."* The URL is on the wire, was deliberately added to the type by this candidate (`liveState.ts:176`), and is then discarded (`liveState.ts:259-273`); `blocks.ts:73` has no `url`. No row can be tapped. The amendment rewrote only the fifth-state question and says nothing about this, so a reader comparing the approved page with the built thing finds an item missing and no record of its removal.

## KP7-05 — non-blocking. The new verifier case proves the window was built, not that it is on screen

`e2e/verify-web-build.ts:653-694`. `pressWorld` is a genuine improvement and closes the real hole: it refuses a missing target, a `display:none` target, and a target with anything but the canvas at its own centre, and presses with real input. `worldStill` is a condition rather than an interval. I found no way for either to report success on a world a thumb could not reach.

The gap is after the press. `waitForSelector('.v11w-sheet', {state:'visible'})` is `.catch(() => {})`-swallowed and nothing downstream depends on it; the surviving assertions are `__virgilV11.window === 'prover'` — the product's own state, not pixels — and `.v11w-sheet`'s `innerText`, which for an element that is not rendered returns `textContent` rather than `''`. A sheet that opened in state and is hidden, clipped or translated off screen satisfies every assertion. Read from the code plus `innerText`'s defined fallback, not executed (`KP7-08`). Same shape as the defect this file has had twice.

## KP7-06 — non-blocking. The console beside the window still says `NOT READ` about checks that were read

`src/world/screens/v11/screens.ts:201-224` with `liveState.ts:63-67`. Live cast members get an empty check schedule, so the Prover's in-world screen draws `passed — · failed — · skipped — · of NOT READ` while his window, one tap away, lists the checks read from GitHub. Before this slice `NOT READ` was true of the whole app; after it, it is false of the app's own knowledge on the same page. It under-claims rather than over-claims, and the reason it was left is recorded honestly at `MobileRoom.tsx:801-814`.

## KP7-07 — non-blocking. Counting and wording

`windowContent.ts:742, 773, 780, 784, 807-812`. `The 5 checks that reported` counts a check that returned no result, while the summary beneath sums to four, with nothing between them explaining the gap. `Every check ${checks.source} reported…` renders as *"Every check check runs reported…"*. The note says *"They are counted here"* for a single check.

## KP7-08 — non-blocking. An evidence limit rather than a defect

`verify:web` and `verify:owner:v11` could not be re-run: `npx playwright --version` reports 1.56.1 but no browser binaries are installed and outbound installs are proxied. The new CI case's efficacy rests on the builder's reported run, not on the reviewer's reproduction. This does not on its own make the verdict `INSUFFICIENT_EVIDENCE` — the blocking finding is proven from the code and reproduced through the product's own functions.

## KP7-09 — non-blocking. The owner quote in the amendment cannot be corroborated from inside the repository

`PHASE_2_SLICE_4_BRIEF.md:80-84`. A layer-4 document carrying a layer-1-style authorisation, with no `OD-*` filed and no independent copy of the instruction in the repository. That is the cost `OD-0006` already states in the open, recorded here only as the boundary of what was checked. On the substance the amendment is correct: the four words **are** `constitution/authority.json`'s, `constitution/` is untouched by this diff, and refusing a fifth word rather than editing layer 2 is the right refusal. Its account of what was built is accurate except for the omission in `KP7-03`.

---

## The two questions the review brief asked most directly

**Can `noResult` reach the screen as `skipped`, or as a row at all?** No, by any path constructible. `liveState.ts:267` admits a row only if `run.state` is one of the constitution's four and the name is a non-empty string; `'noResult'`, `'cancelled'`, `'neutral'`, `''`, `null`, `42` and a non-array `runs` were all exercised and all counted, never drawn. Verified end to end at the window.

**Can the recording's six checks appear beside the live ones?** Not beside them — `liveProverDoc` returns before any recorded value is computed, and both a unit test and an e2e regex hold that. But the live window can fall back **wholly** to the recording when the checks were not read, which is `KP7-01`.

## What would clear the block

Something that makes the live Prover's window say the checks were not read when `answer.checks` is `null` on an `ok: true` answer — the brief's own words, *not zero, not empty* — rather than returning the recorded document. One decision at `windowContent.ts:905`. The reviewer names the gap and did not write the repair; this verdict attaches to `dd52d94` only.

---

## Builder's response, filed beneath the review and not mixed into it

Repaired in `60578d7`: `KP7-01` (the blocker), `KP7-02`, `KP7-05`, `KP7-07`. Proved red before green — with the new guard disabled and the page rebuilt, the added `verify:web` case fails; restored, it passes. `pnpm check` green at 1,657 app tests with all three verifiers PASS.

Not repaired, and carried openly for the owner to schedule: `KP7-03` (a change to the deployed function) and `KP7-04` (an approved scope item that was not built). `KP7-06` and `KP7-09` stand as recorded. `KP7-08` is the reviewer's own evidence limit and is not the builder's to close.

**This document is the record of a review, not a claim that the repair is sound.** Nothing here has been re-reviewed at `60578d7`.
