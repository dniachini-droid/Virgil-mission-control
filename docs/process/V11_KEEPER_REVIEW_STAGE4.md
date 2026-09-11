# V11 stage 4 and the repair pass — independent Keeper review

**Candidate:** `daabac0cd72acc2b84d30173fc8581e665192edf`, on `claude/virgil-mobile-v11`.
**Base:** `c2f9651`. **Previously reviewed:** `de3c7d8b2a51af58fd1a4bc2a01e80632a623d29`
(`docs/process/V11_KEEPER_REVIEW.md`). **Reviewed:** 9 September 2026.

**Verdict: `BLOCKED`.**

Local and remote agree on the candidate (`git rev-parse claude/virgil-mobile-v11` equals
`git rev-parse origin/claude/virgil-mobile-v11` equals the SHA above). The working tree was clean.
The candidate is contained in `claude/virgil-mobile-v11` and its remote only; it is not in `main`.
Everything below was done in a **detached checkout of that exact SHA** in a throwaway worktree with
its own `pnpm install --frozen-lockfile`, so nothing could move underneath the reading, and the
worktree finished the review with an empty `git status`. Nothing in the candidate was edited. No test
was changed, skipped or weakened. The one file this review writes is this file.

This review covers **V11 stage 4 and the repair pass that followed** — `1ff6e74` onward, thirteen
commits — plus the system-wide effect of stage 4's renderer changes and an explicit answer on whether
the first review's verdict still stands. `docs/process/V11_RUN_RECORD.md` was read as a set of claims
to test, never as evidence.

---

## Why this is `BLOCKED` and not a pass

One proven defect, **KS4-01**, and it is not a near miss. In the demonstration's passing loop, for
three seconds, the run slab draws the **Keeper's hop as returned** — a full-length green bar and a
filled completion dot — and its micro-rail reads **`3 / 3 returned`**, while in the same frame the
candidate slab reads **`READY FOR REVIEW`**, the verdict slab's own lead reads **`VERIFICATION
PASSED. NOT YET REVIEWED.`**, the Keeper's station reads `READY` with report `—`, and the Prover's
window says in plain words *"Review is independent of verification, and it has not happened yet."*

`constitution/STATE_LANGUAGE.md`, under *Distinctions that must never collapse*, says:
**`READY_FOR_REVIEW` is not reviewed.** In this frame it is shown as reviewed. That is the criterion
it fails, and it is authority layer 2.

Three things make it worse rather than better. It is the project's **own named failure class**, twice
over in one slab — a hop that did not happen shown as a hop that returned, and a duration bar drawn
where no duration was recorded. The comment two lines above the code that produces it
(`screens.ts:511–524`) claims that exact fault was already fixed. And the frame it appears in is
**number 03 of the twelve review states**, the deliverable stage 4 was commissioned to produce; it is
in the committed contact sheet `docs/process/PHASE_1_owner-builds/v11/v11-s4-twelve-review-states.png`.

A blocked verdict here is a statement about one defect, not about the pass. Everything else stage 4
and the repair pass claim was tested and **almost all of it reproduced exactly**, including three
repairs that are genuine and one preservation number that is now proven for the seventh time. That is
set out below at the same length as the finding.

---

## What was verified, and how

Every command below ran in the **foreground**, in the detached worktree, at the candidate SHA.

### The preservation contract — proven again, on this reviewer's own evidence

| Check | Method | Result |
|---|---|---|
| V10 built from a clean tree | `pnpm build:owner`, `TURBO_FORCE=true` | **8,528,318 bytes** |
| the five protected sources, untouched | `git diff --name-status c2f9651 HEAD -- <the five>` | **no output** |
| the tripwire digests are the genuine V10 values | `sha256` of each blob **at `c2f9651`** vs the constants in `test/owner-build-v11.test.ts` vs the files at HEAD | **all five equal, all three ways** |
| protected boundaries | `git diff --name-status c2f9651 HEAD -- constitution/ docs/product/ docs/decisions/ knowledge/raw/ schemas/` | **no output** |
| every committed artifact | `sha256sum -c *.sha256` | **20 artifacts, all `OK`** |
| `#/v10` inside the V11 build | driven in the browser | `1 control bar, 12 buttons, 1 badge, 1 footer, 0 V11 nodes` |

**8,528,318 is real, for the seventh consecutive measurement and the first by anyone other than a
builder or the first reviewer.** The tripwire constants equal the branch-point blobs, so they were not
refreshed after an edit.

### Stage 4's renderer changes are not system-wide, and that is a correction to the premise

The pixel-ratio default and the governor were checked for reach rather than assumed to have it.

- **V10's route is untouched by both.** `#/v10` renders `VirgilRoom`, which carries its own
  `dpr={coarse ? [1, 1.25] : [1, 1.75]}` (`VirgilRoom.tsx:163`) and never reads `performance.ts`.
- **The governor's module-level state cannot leak into V10.** `sceneLoad()` is read in exactly two
  places, `ConsoleScreenV11.tsx:213` and `ScreenBankV11.tsx:381`, both V11's own. Grepped across
  `src/`, then confirmed by driving `#/v10`: `window.__virgilV11` is `null`, 0 console errors,
  0 off-document requests.
- **The auto ratio is derived, and it binds where the record says.** At 390 × 844 with a device ratio
  of 3, `pixelRatioCeiling` reads **2** — the tier ceiling binding, not the 2.20 the budget would
  allow, and not the device's 3. Read from the page, not from the source.
- **The reduced level is no longer blurrier than the full one.** Measured in the built artifact at
  `deviceScaleFactor` 3: **full ratio 2, reduced ratio 2, minimal ratio 1.25**, never below 1. The
  regression the record says the check caught is genuinely gone.
- **The governor is off on a software renderer**, so its step-down has never been observed engaging
  here either. The record states that; it is true; it is also the reason nothing in this review is
  evidence about the governor's real behaviour.

### Deterministic checks, all re-run at the candidate SHA

| Check | Reproduced | Matches the record |
|---|---|---|
| `pnpm lint` | `Checked 278 files in 202ms. No fixes applied.` | yes |
| `pnpm typecheck` (`TURBO_FORCE=true`, 0 cached) | `Tasks: 8 successful, 8 total` | yes |
| `pnpm test` (`TURBO_FORCE=true`) | mission-control **863 in 31 files**; domain 104, agent-contracts 70, knowledge-graph 24, gate-engine 19, visual-language 18 — **1,098** | **exactly** |
| Mind Scan | `82 nodes, 166 edges, 10 pages, 28 claims, 94 tethers (94 intact)`; `mind scan: no findings` | **exactly** |
| `sha256sum -c *.sha256` | 20 artifacts, all `OK` | **exactly** |
| `pnpm reproduce:owner` | `identical` — `98d83ac4…8729f`, 8,528,241 B, `PASS` | **exactly** |
| `pnpm reproduce:owner:v11` | `identical` — `c95120b4…8b59755`, 8,690,854 B, rebuilt from `27f5874d9c`, `PASS` | **exactly** |
| `build:owner` clean tree | 8,528,318 B | **exactly** |
| `build:owner:v11` clean tree | 8,690,854 B | **exactly** |
| `pnpm measure:compression:v11` | every figure identical — Draco decoder 334,046 / net −1,930,358; Meshopt 29,256 / −1,019,668; KTX2 856,894 vs 822,496, **+34,398 at best**, texture size `NOT MEASURED`; gzip **1,316,316 saved for 0 B of decoder**; combination 2,739,030 vs 5,256,388 | **exactly** |
| `verify:owner:v11`, portrait-390 | `PASS (partial: …)` — 13 targets smallest 48 px; 17 window controls smallest 44; `scrollWidth 390/390`, 0 past the edge; 5 session controls, 0 enabled; 0 demo words, 0 bands; composer clear of a simulated 336 px keyboard by **48 px** | **exactly** |
| `verify:owner:v11`, portrait-430 | `PASS (partial: …)` — the same, **32 px** of clearance | **exactly** |
| `verify:owner:v11`, landscape-844 | `PASS (partial: …)` — 15 window controls, **29 px** at a 180 px keyboard | **exactly** |
| `verify:owner:v11`, motion and performance | `PASS (partial: …)` — reduced-motion gap **0 ms**, default gap **0 ms**; loop always / demand / never / always; DPR 3 **full 2, reduced 2, minimal 1.25**; window text **1,287 DOM characters, 0 canvases**; notice **1 at minimal, 0 at full** | **exactly** |

**No test was weakened.** No `it.skip`, `describe.only`, `test.todo` or equivalent exists anywhere in
`apps/` or `packages/`; no test file was deleted since `de3c7d8`; all 1,098 tests pass. The record's
arithmetic holds: 826 → 861 at stage 4, 861 → **863** at the repair pass, and 863 is what I counted.

### Frames were rendered and looked at, with an instrument the audits do not have

Ten frames were rendered from **the artifact built at the candidate SHA**, at 390 × 844 with a device
pixel ratio of 3. Because the two defects stage 4 found were invisible to text audits, every 2D canvas
text call was intercepted and recorded **with the `globalAlpha` it was drawn at** — so a word present
in the draw calls but drawn at zero opacity, which is exactly how the reduced-motion defect hid, is
visible to this instrument. Every frame is reproducible by appending the entry point to the artifact's
own `file://` URL.

- **`#/?demo=11&loop=0&hold=1&motion=reduce`, with the media preference also set.** Every hero word —
  `NO VERDICT`, `FABRICATOR`, `BUILDING` — drawn at **alpha 1**. **Zero strings at alpha ≤ 0.02 on any
  canvas.** The reduced-motion repair is real, and it is proven by the measurement that would have
  caught the original defect.
- **`#/?demo=30&loop=0&hold=1`.** The repaired sentence is on the glass: `PASS` over
  `VERIFICATION PASSED. NOT YET REVIEWED.` with the candidate at `READY FOR REVIEW`. The
  merge-eligibility repair is real. **This is also the frame that carries KS4-01.**
- **`#/?demo=11&loop=0&hold=1&perf=reduced`.** `REDUCED PERFORMANCE MODE` on screen; `level reduced`,
  `tier constrained`, `redrawScale 0.5`, ratio ceiling still **2**. The K11-02 repair is visible and
  correct here: the running hop's bar is filled to about three quarters at 11 s — `(11−2)/12 = 0.75` —
  and the two hops that have not run have **empty tracks**.
- **`#/?demo=15&loop=0&hold=1`**, **`#/?demo=30&loop=1&hold=1`**, **`#/?run=replay`**,
  **`#/?demo=30&loop=0&hold=1&win=prover`**, **`#/v10`**. See the findings.
- 0 console errors and 0 off-document requests in every frame.

---

## Findings

Identities are new and stable. `K11-*` refers to the first review's findings and those identities are
not reused. Severity is this reviewer's.

### KS4-01 — the Keeper's hop is drawn as returned, with a full bar, three seconds before he reviews

**Severity: high. Blocks: YES.**
**Surface:** `src/world/screens/v11/screens.ts`, `hopNodes` (lines 568–585) and `runLedger`'s bar
(line 727); micro-rail `hops` (line 436). **Criterion:** `constitution/STATE_LANGUAGE.md`,
*Distinctions that must never collapse* — **`READY_FOR_REVIEW` is not reviewed**; and the project's
own rule that no length is drawn where no duration was recorded (`src/world/screens/ledger.ts`).

The cause is one expression:

```js
const lastRan = content.verdict === '—' ? -1 : refused ? 1 : 2;
```

with the comment *"Who returned the verdict: the Prover on a refusal or a gap, the Keeper on a pass."*
That is only true **after** the Keeper has reported. In the passing loop the Prover writes
`verdict: 'PASS'` at `BEATS.proverReported` (29 s) and the Keeper does not receive the hop until
`BEATS.handoffToKeeper` (32 s). For that window `content.active` is `null` and the verdict is not a
refusal, so `lastRan` is **2** and all three rows are marked `done`.

**Reproduced two independent ways.**

1. *Deterministically.* Driving `demoAt(t, loop, true)` over every half second of all three loops and
   applying `hopNodes`' own expression and the exported `ledgerBarFill`:

   ```
   loop 0: 6 half-seconds with the KEEPER hop drawn RETURNED while the candidate is not reviewed
     first: t=29   candidate=READY_FOR_REVIEW verdict=PASS active=null keeperBar=1 keeperStation=READY keeperReport=—
     last:  t=31.5 candidate=READY_FOR_REVIEW verdict=PASS active=null keeperBar=1 keeperStation=READY keeperReport=—
   loop 1: 0    loop 2: 0
   ```

2. *By looking.* The frame at `#/?demo=30&loop=0&hold=1`, rendered from the artifact built at this
   SHA, and the committed contact sheet's frame 03. The run slab reads `VIRGIL / NO HOP IN FLIGHT.
   VIRGIL HOLDS IT.` over three rows — `FABRICATOR`, `PROVER`, `KEEPER` — **all three with a full
   green bar and a filled green dot** — and `HOPS 3 / 3 returned`. Beside it the candidate slab reads
   `READY FOR REVIEW`; above it the verdict slab reads `VERIFICATION PASSED. NOT YET REVIEWED.`; the
   Keeper's own station is dark and reports `—`.

So four surfaces are in the same frame and one of them is wrong. And the bar is not decoration: since
the K11-02 repair a bar **is** a measurement, so the Keeper's row now draws a full twelve seconds of
elapsed work for work that has not begun. The repair made the claim explicit; it did not make it true.

**Why nothing caught it.** `test/screen-content-v11.test.ts` has no assertion about hop state or
`N / 3 returned` — a grep for `returned`, `hopNodes` or `hops` finds only comments and the bar tests.
This is the third instance of the same shape of gap: the audit checks the words a display uses and not
the agreement between displays.

**Not new, and that matters for a different reason.** `hopNodes` is **byte-identical at `de3c7d8`**,
so this was present in the candidate the first review passed, and that review named `hopNodes` as the
fix for the verdict-before-review class. It is in scope here because a blocked verdict describes the
candidate in front of me, and because the K11-02 repair landed on this exact slab.

**The refusal path is already right** — `refused ? 1` gives `2 / 3 returned` on loop 1, which I
confirmed by rendering it. The pass path is the half that was never given the same treatment.

### KS4-02 — in the replay of a real run, the playback clock is printed as the run's elapsed time

**Severity: medium. Blocks: no.**
**Surface:** `src/world/screens/v11/screens.ts:440`; `src/world/mobile/MobileRoom.tsx:1038`;
`src/world/replay/useReplay.ts`. **Criterion:** the same named failure class as K11-02 — a duration
shown where none was recorded — and the module's own stated invariant.

`useReplay.ts` states the rule in its own header: *"`seconds` here is **playback** time and nothing
else. **It never appears as a duration of the recorded work**; `recordedRun.ts` owns those, and where
the repository has none the surfaces say `NOT RECORDED`."*

It does appear as one. `MobileRoom` passes `seconds={state.seconds}` to the slabs in both modes, and
the run slab's micro-rail prints `{ label: 'elapsed', value: seconds.toFixed(0) + 's' }`
unconditionally. Rendered at `#/?run=replay`, the same slab that carries the honesty band
`PHASE 0 CONSOLIDATION · RECORDED RUN · REPLAYED · NOT LIVE STATE · 3B9A964E` and the real candidate
`956be26064` shows `ELAPSED 0s`, then `2s`, climbing with the wall clock. The real run it names took
hours; nothing on that slab records how long, and this number is not it.

The K11-02 repair removed the **bar** from the replay because the replay has no per-hop duration. The
**number** beside it, which makes the same kind of claim about the whole run, was left.

### KS4-03 — the build-identity string claims a feature the build was measured into *not* having

**Severity: medium. Blocks: no.**
**Surface:** `apps/mission-control/vite.owner.v11.config.ts:31–33`, embedded as
`__OWNER_BUILD_STAGE__` and shown in the provenance footer on `#/v10`, `#/s1` and both spike routes,
and in the hidden development menu. **Criterion:** the V11 brief's **first caution** — the stage line
is the project's only build-identity signal — and the first review's K11-01, which was about that line.

The string reads, in part:

> `V11 stage 4, the last — performance: … the world slowed under an open window and stopped when the
> page is hidden, **the cast loaded before the backdrop**; …`

The cast is **not** loaded before the backdrop. `deferBackdrop()` returns false unless `#/?defer=1`
(`MobileRoom.tsx`), and the run record is unambiguous that this was deliberate: the split was measured
to put the cast **eleven seconds later** than the backdrop, was found to paint "a command centre with
nobody in it", and *"the default is one boundary, in exactly V10's order"*. Read on my own screen from
the artifact built at this SHA, on the `#/v10` route.

Every other clause in that string is true. This one states as a property of the artifact a thing the
same pass measured and rejected — in the one surface the brief singles out as the thing that must not
lie, and the one the first review's K11-01 already concerned.

### KS4-04 — in the replay of a real run, a console prints the demonstration's fabricated commit

**Severity: medium. Blocks: no.**
**Surface:** `src/world/screens/v11/screens.ts:141–142`. **Criterion:** demonstration content
presented as real; one surface contradicting another in the same frame.

The Fabricator console's micro-rail is:

```js
{ label: 'branch', value: 'claude/…-v11' },
{ label: 'head',   value: CANDIDATE_ID.slice(0, 7) },   // '9abcdef'
```

Both are constants with no mode branch, where every other surface reads
`content.candidateId ?? CANDIDATE_ID`. So in the replay, whose three slabs carry the real candidate
`956be26064` and the honesty band `RECORDED RUN · REPLAYED … 3B9A964E`, the Fabricator's console reads
`BRANCH claude/…-v11` and `HEAD 9abcdef` — a fabricated commit and the wrong branch inside a frame
that says it is showing recorded history. Reproduced at `#/?run=replay`; the strings are in the draw
log at alpha 1. Pre-dates stage 4.

### KS4-05 — continuous integration has never been green on this branch, and the record never says so

**Severity: medium. Blocks: no (but it is the largest evidence gap).**
**Surface:** `.github/workflows/checks.yml`; GitHub Actions runs 41–85 on `claude/virgil-mobile-v11`.
**Criterion:** `constitution/REVIEW_POLICY.md` — *"every required check either ran or is recorded as
skipped with a reason."*

Read from the Actions API at review time:

- **45 runs on this branch. The `lint, typecheck, tests, owner build, owner verify` job has never
  concluded `success`.**
- **At the candidate `daabac0` (run 85)** the job started 21:46:13 and ended 22:16:30 — 30 m 17 s
  against `timeout-minutes: 30` — **cancelled inside `pnpm check`**, with Mind Scan, both owner
  builds, both verifies and the digest check all `skipped`. No later push exists, so this is the
  timeout and not the `cancel-in-progress` concurrency rule. The second job, *newest Owner Build
  rebuilds byte for byte*, **succeeded**.
- **At the three commits where CI reached it, `verify:owner:v11` exited 1.** The failure annotation is
  identical at `de3c7d8` (run 70), `99614fa` (run 78) and `50b0dc7` (run 81):
  `command (…/apps/mission-control) …/pnpm run verify:owner:v11 exited (1)`.
- **No CI run has ever executed the repaired verifier.** The K11-04 repair landed at `29a669a`; runs
  82, 83 and 84 were cancelled within two to three minutes by the concurrency rule, and run 85 timed
  out before reaching it.

Neither stage 4's *"The checks, as printed"*, nor the repair pass's, nor
`docs/process/V11_KEEPER_REVIEW.md` mentions continuous integration at all. Both records present a
complete green table drawn entirely from local runs, at a SHA whose CI is incomplete. That is not a
false statement, but a reader of either record would not learn that the branch's own gate has never
passed.

**And it bears directly on the value of every local run, mine included** — see KS4-06.

### KS4-06 — `verify:owner:v11` has never run whole, anywhere, and never on the pinned browser

**Severity: medium. Blocks: no.**
**Surface:** `e2e/verify-owner-build-v11.ts:96–99, 1393`; `.github/workflows/checks.yml:68`.

Two separate things, and the record only names the first.

**On the four-part split: it is sufficient, and here is the proof rather than the assurance.**
`PARTIAL` is used in exactly one place — the final message — so no assertion is gated on a whole run
(`grep -n PARTIAL`). Each viewport does `setViewportSize` and then a **full `page.goto`**
(lines 390–392), so a whole run never carries document state from one viewport into the next either;
four processes lose nothing a single process would have had. The shared prelude — the five routes,
`#/v10`'s chrome, the request and console tallies — re-runs in each part. I ran all four parts myself
at the candidate SHA and every one printed `PASS (partial: …)`; together they are the whole check.
**The mechanism is honest**: `PARTIAL` is true whenever viewports are selected *or* the tail is
skipped, so a partial run cannot print a bare `PASS` even by accident. On the question the brief asked
me to settle: **yes, four partial runs are sufficient**, and the record is right to refuse to call it
a whole run.

**On the browser, which the record does not raise.** `cdn.playwright.dev` is blocked by this
environment's egress policy, so the lockfile-pinned Chromium could not be installed. Every local run —
the builders', the first reviewer's and mine — used the preinstalled
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, which the script itself prints as
*"(preinstalled, substituted for the pinned build)"*. CI is the **only** place `verify:owner:v11` has
ever run on the browser the lockfile pins, and there it exited 1 every time it ran. I cannot
distinguish a CI capacity problem from a genuine failure on the pinned Chromium, and I will not guess.
**No `PASS` of `verify:owner:v11` on the pinned browser exists anywhere.**

### KS4-07 — the honesty-band flag doubles as the "is there a recorded duration" flag

**Severity: low. Blocks: no.** **Surface:** `screens.ts:432, 727` — `runLedger(…, showBand)` then
`ledgerBarFill(node.state, i, seconds, showBand)`, where the fourth parameter is named `replay`.

`showBand` is set from `mode === 'replay'` at both call sites today
(`MobileRoom.tsx:1062`, `ScreenBankV11.tsx:253`), so the ledger is correct now. But the parameter that
decides *whether a duration exists to draw* is the same one that decides *whether an honesty band is
painted*. The day someone shows the band outside the replay, or hides it inside one, the ledger
silently starts or stops making duration claims. The repair the Keeper asked for should not rest on a
coincidence between two unrelated booleans.

### KS4-08 — the K11-02 repair's visible effect is smaller than the record says

**Severity: informational. Blocks: no.** **Surface:** `docs/process/V11_RUN_RECORD.md`, *"The Keeper's
K11-02, repaired at its cause"*; `screens.ts:533–566`; `test/screen-content-v11.test.ts:275`.

The record says *"a returned hop keeps its own length rather than being rounded up to full"*. All
three scripted hop windows are twelve seconds — 2→14, 17→29, 32→44 — so `LONGEST_SCRIPTED_HOP` is 12
and **every returned hop still draws a full bar**, which the repair's own test asserts
(`for (const i of [0,1,2]) expect(ledgerBarFill('done', i, 40, false)).toBe(1)`). That is *correct*:
three equal recorded durations should draw three equal lengths. But the sentence invites a reader to
expect a visible change that is not there. The repair's real and verified effects are on the
**running** hop, which now grows from its own start instead of sawtoothing the global clock, and on
the **replay**, where no bar is drawn at all. Both were confirmed by frame.

### KS4-09 — the governed performance notice reads "Reduced to reduced"

**Severity: informational. Blocks: no.** **Surface:** `MobileRoom.tsx`, `PerformanceNotice`.

`forced ? `${plan.label} performance mode` : `Reduced to ${plan.label.toLowerCase()}`` produces
"Reduced to reduced" at the middle rung when the governor, rather than the reader, chose it. Only
reachable on hardware where the governor engages, which is nowhere yet, so this is recorded and not
demonstrated. The forced string, which is the one in the deliverable frame, reads correctly:
`REDUCED PERFORMANCE MODE`.

### KS4-10 — the record's compression totals are internally inconsistent by 27 bytes, faithfully

**Severity: informational. Blocks: no.** **Surface:**
`asset-pipeline/assess-compression.mjs`; run record, stage 4 item 1a.

The script prints `payloads today 3942257 B binary / 5256344 B base64` in its totals section and
`payload bytes, binary 3942284 / base64 5256388` in its gzip section — two figures for the same
quantity, differing by 27 and 44 bytes, neither reconciled. The run record quotes **both**, each in the
place the script prints it, so the record's claim that every figure *"came back byte-identical"* is
**true of the record**. The inconsistency is the instrument's. Noted so it is not later mistaken for a
drift between the record and its tool.

---

## The repair pass's own claims, judged

- **The touch-target race is structurally real.** `TouchTargets.tsx:58` re-projects every anchor
  inside `useFrame`, so a press aimed at last frame's projection can land on nothing while the camera
  eases. The mechanism the repair pass describes exists; I verified it from source rather than
  accepting it.
- **The experiment that established the direction of causation is in no commit and cannot be
  reproduced.** The record says the old verifier was restored over the new one, both were run against
  the same artifact, and the old one passed while the new one failed. Nothing of that is in the
  history and nothing in the repository can re-derive it. **I accept it as a builder's claim and it
  changes nothing**, because no assertion depends on it being true: `pressUntil` re-measures and
  presses up to four times **until the thing it should cause holds**, which is strictly stronger than
  one press, and the check still fails if the window never opens. A wrong causal story here would cost
  the record its explanation, not the check its rigour. The record was right to disclose the
  deviation; disclosing it is what let me judge it.
- **The K11-04 repair is proven, not accepted.** The single-viewport run that gave the first reviewer
  five **false** failures ran to completion here and passed every assertion, in a container the
  script itself measured at **1,882 ms a frame** — within 2 % of the 1,851 ms the repair pass reports,
  so this is the same class of machine that produced the false failures, not a faster one. The repair
  is guarded against regression by a test that forbids `.boundingBox(` and `polling:` from returning
  and pins the five surviving wall-clock waits to document-load conditions; I ran it.
- **The K11-01 repair is real.** `measure:compression:v11` exists at the root and in the app, a test
  fails if either goes away, and the command re-derives every figure. The run record now opens with a
  *"How to read it"* note and each superseded sentence names the pass it speaks for — *"as of stage
  1"*, *"as of stage 2"*, *"as of stage 3"*, *"as of this pass"* — with the stale lines **kept**,
  which is the right call. Offset by KS4-03, which is a new false clause in the same signal.
- **K11-03 was correctly not repaired.** Confirmed by frame: in portrait with the Prover's window
  open, the sheet fills the viewport, the `Demo data` chip is nowhere on screen, and nothing marks the
  fabricated candidate `9abcdef012` and its fourteen invented checks as invented. What remains is
  *"Nothing is sent: there is no session behind this build"* and `Session controls — none is
  connected`, which speak to liveness and not to fabrication. It follows from the owner's own
  instruction; a session may not overrule authority layer 1; the record now carries the cost as known
  limitation 5 and puts the question to the owner. Correct handling.
- **K11-05 is unchanged and is the owner's.** Measured: **86 tracked files, 27 MB** under
  `scratchpad/`; `/scratchpad/` is in `.gitignore`; nothing added since `512fd5c`.

---

## Does the first review's verdict still stand?

**As a record, it is sealed to `de3c7d8` and this review does not reopen it.**
`constitution/REVIEW_POLICY.md` is explicit that a verdict never transfers to a new SHA, so
`PASS_WITH_NON_BLOCKING_FINDINGS` on `de3c7d8` is neither confirmed nor overturned here.

**As a statement about this candidate, no, it does not survive** — and not only because the SHA moved.
Two of that review's positive conclusions are contradicted by evidence I reproduced:

1. It recorded, under *the truthfulness rules*, that **"a verdict shown before its review reported"**
   was cleared because *"`hopNodes` now derives hop state from `content.verdict` and `content.active`
   — what has actually returned"*. `hopNodes` is byte-identical at `de3c7d8` and at this candidate,
   and deriving from `content.verdict` is precisely the mechanism of **KS4-01**: it attributes the
   Prover's `PASS` to the Keeper for three seconds. The named fix is the defect.
2. It recorded **"Real content presented as illustrative"** as correct. **KS4-04** shows the converse
   in the replay: a fabricated `HEAD 9abcdef` and the wrong branch inside a frame explicitly labelled
   as recorded history.

Neither was a failure of diligence; both are invisible to a text audit and to source reading alone,
and both needed a frame plus a state sweep to see. They are recorded here as gaps in the coverage of
that review, not as errors in its judgement.

**Its six findings, each closed or not, on my own evidence:**

| | State | Evidence |
|---|---|---|
| **K11-01** | **closed** | `measure:compression:v11` in both `package.json`s, held by `required-checks-v11.test.ts`, numbers re-derived by me; the record's stale sentences now name their pass and are kept. Offset by **KS4-03**. |
| **K11-02** | **closed at its cause** | `ledgerBarFill` is pure, exported and tested; the running hop's bar measures its own window; the replay draws no bar. Seen in a frame. But the **class** is not eliminated — see **KS4-01** and **KS4-02**. |
| **K11-03** | **correctly not repaired**; the record half is closed | Confirmed by frame; owner's instruction; carried as limitation 5 and decision 1. |
| **K11-04** | **closed at its cause** | Its five false failures do not recur on a machine of the same measured speed; a test forbids the pattern's return. Superseded in importance by **KS4-06**. |
| **K11-05** | unchanged, by the owner's decision | 86 files, 27 MB, measured. |
| **K11-06** | stands as judged | `NO VERDICT` remains the single enumerated exception. |

Four of the six are genuinely closed. The verdict changes because of what neither review had found.

---

## What could not be verified, and why

- **Whether `verify:owner:v11` passes on the browser the lockfile pins.** `cdn.playwright.dev` is
  blocked by egress policy; the substituted `chromium-1194` is the only browser available here. The
  only runs on the pinned build are the CI runs, and they failed. **Unresolved, and material** (KS4-06).
- **Why CI failed at `de3c7d8`, `99614fa` and `50b0dc7`.** The step logs redirect to a storage host the
  proxy refuses; only the annotations are readable, and they name the command and the exit code and
  nothing more. Whether run 85's 30-minute timeout hides a pass or a failure is **not known**.
- **A single whole run of `verify:owner:v11`.** Not performed by anyone, anywhere. My four parts cover
  every assertion and I have set out why that is sufficient, but the statement "it has run whole and
  passed" cannot be made by me or by the record.
- **Everything about real hardware.** No device, no GPU, no iOS keyboard, no Dynamic Island, no screen
  reader. Every frame in this review was rendered in software by SwiftShader at roughly half a frame a
  second. OD-0005's two graphics-hardware checks remain **not performed**, never met, and this review
  adds no hardware evidence and makes no visual-quality judgement.
- **Every frame rate in the record** (0.63–0.94 fps; the 11 m 19 s `measure:fps:v11` run). Not
  reproduced; they describe a CPU rasteriser and the record says so repeatedly and correctly.
- **The governor engaging.** It is disabled on a software renderer by design, so its step-down and
  step-up exist here only as a synthetic frame trace in `performance.ts`'s tests, which I ran. Its
  real behaviour is untested by anybody.
- **The load-order measurements** (13.79 / 13.82 / 13.70 s against 2.39 / 2.61 / 2.54 s). Not
  re-executed. The conclusion drawn from them is that the split stays off, which I verified in the
  source; the numbers themselves are the builders'.
- **The historical measurements** — the 864-ray faceplate fit, the 1,600-combination sweep, the 242
  poses, the 132-sample occlusion counts, stage 1's 40.7 px console width. Not re-derived; their
  conclusions are held by tests that pass.

## What was accepted on the builders' word

Stated explicitly, as required:

1. **The old-verifier restoration experiment** and its conclusion that the window-opening failure was
   caused by removing accidental latency. In no commit, not reproducible. Judged harmless: no
   assertion rests on it (see above).
2. **The frame-rate, load-order and historical measurement narratives.** Their conclusions are
   enforced by tests that ran and pass; the processes were not re-executed.
3. **The aesthetic judgements** throughout the record. They are the builders' and remain so, and the
   record says as much.
4. **That `#/?win=<agent>` and the twelve entry points behave identically on a real device.** Only the
   simulated viewports were exercised.
5. **The preservation contract was *not* accepted** — it was built, hashed and diffed here, three
   independent ways, and holds.
6. **The four partial `verify:owner:v11` runs were *not* accepted** — all four were re-run at the
   candidate SHA by this reviewer, and the split's sufficiency was established from the script's own
   control flow rather than from the record's assurance.

## Independence

This reviewer did not build, plan or repair any part of this candidate, shares no session with the
builders or with the first reviewer, and used no builder reasoning as evidence. This review modifies
no source, no test, no artifact and no record other than this file. It does not approve, merge, deploy
or adjudicate, and it authorises nothing. It is not a re-review of `de3c7d8`.

## Next action

One, and it is the owner's to authorise: a **bounded repair of KS4-01**, whose cause is a single
expression in `hopNodes` that credits the Keeper with a verdict the Prover returned, together with the
test that is missing — an assertion that the number of hops a display calls *returned* never exceeds
the number the candidate's state can account for, at every half second of all three loops and in the
replay. **KS4-02**, **KS4-03** and **KS4-04** are the same shape of fault in three other places and
should be inside the same boundary rather than deferred, because each is a surface contradicting
another surface in one frame.

**KS4-05 and KS4-06 are not repairs and should not be treated as ones.** They are the question of
whether this branch's own gate has ever passed. Until `verify:owner:v11` completes once, whole, on the
browser the lockfile pins, the strongest honest statement anyone can make about it is the one the
repair pass already makes: *it was not performed.*
