# V11 — independent Keeper review

**Candidate:** `de3c7d8b2a51af58fd1a4bc2a01e80632a623d29`, on `claude/virgil-mobile-v11`.
**Base:** `c2f9651`. **Reviewed:** 9 September 2026.
**Verdict:** `PASS_WITH_NON_BLOCKING_FINDINGS`.

This is the first independent review of this branch. Ten passes — V8, V8.1, V8.2, V8.3, V9, V10 and
V11's four stages plus two repairs — were built, self-checked and accepted with no reviewer other than
the coordinator who commissioned them. The coordinator is not independent of that work, so every
judgment written into `docs/process/V11_RUN_RECORD.md` was treated here as a claim, not as evidence.

Reviewed from a **detached checkout of that exact SHA**, in a throwaway worktree, so that later commits
on the branch could not corrupt the reading. Five commits have landed after the candidate
(`db05b38`, `64cb58d`, `e813485`, `84b6a44`, `cdf4983`). None of them was reviewed and none is covered
by this verdict.

The reviewer is read-only. Nothing in the candidate was edited, and no test was changed, skipped or
weakened to obtain any result below. The one file this review writes is this file.

---

## Verdict

`PASS_WITH_NON_BLOCKING_FINDINGS` — one of the four verdicts in `constitution/authority.json`.

No blocking defect was found. Every deterministic check that fits this harness's ten-minute foreground
cap was re-run at the candidate SHA and reproduced its recorded result exactly. The owner's hardest
constraint — the preservation contract — is **proven on this reviewer's own evidence**, not accepted on
the builders' report. Six findings are recorded below; none defeats an acceptance criterion, and two of
them (K11-02, K11-03) concern the truthfulness rules this project has repeatedly failed and repaired,
so they deserve the owner's eye rather than a quiet backlog entry.

---

## What was verified, and how

### The preservation contract — proven, not accepted

The V11 brief names files that may not be edited, renamed or refactored. This was checked against the
branch point rather than taken from the record.

| Check | Method | Result |
|---|---|---|
| the five protected sources | `git diff --name-status c2f9651 HEAD` | **no diff entry for any of them** |
| the same, independently hashed | `sha256` of each blob at `c2f9651` vs the digests in `test/owner-build-v11.test.ts` | **all five match** |
| V10's four HashRouter routes | read `src/owner/main-owner.tsx` | `/`, `/s1`, `/spike/foundry`, `/spike/mind` all present |
| `build:owner`, `verify:owner`, `reproduce:owner` | compared `package.json` at base and candidate | **byte-identical strings** |
| every committed artifact | `git diff --name-status` over `docs/process/PHASE_1_owner-builds/` | **only additions**; nothing modified, nothing deleted |

The tripwire digests in `owner-build-v11.test.ts` are the genuine V10 values — they equal the hashes of
the branch-point blobs, so they were not quietly refreshed after an edit.

**The constant byte count is real.** The run records assert that building V10's entry from a clean tree
gives 8,528,318 bytes at every stage. Built from the clean detached worktree at the candidate:

```
owner build: 8.13 MB (8528318 bytes)
```

8,528,318 − 8,528,241 (the committed V10 artifact) = **77 bytes**, exactly as recorded. The cause was
verified independently rather than accepted: across the **whole branch**, the only file V10's entry
reaches that changed at all is `src/world/room/Tabletop.tsx`, touched once (`4c00864`, stage 1), and the
change is a pure optional-parameter addition. Both call sites confirm it is behaviour-neutral:

- `src/world/room/VirgilRoom.tsx:187` — `<Tabletop />`, passes nothing, so `Backdrop` receives the same
  two vectors it always read;
- `src/world/mobile/MobileRoom.tsx:348` — the only override, and it is V11's.

### Deterministic checks, all re-run at the candidate SHA

| Check | Reproduced result | Matches record |
|---|---|---|
| `pnpm lint` | `Checked 275 files in 715ms. No fixes applied.` | yes (274 at the previous pass, +1 new file) |
| `pnpm typecheck` | `Tasks: 8 successful, 8 total` | yes |
| `pnpm test` | mission-control **826 in 30 files**; agent-contracts 70, visual-language 18, gate-engine 19, domain 104, knowledge-graph 24 | **exactly** |
| Mind Scan | `82 nodes, 166 edges, 10 pages, 28 claims, 94 tethers (94 intact)`; `mind scan: no findings` | **exactly** |
| `sha256sum -c *.sha256` | **18 committed artifacts, all `OK`** | yes |
| `pnpm reproduce:owner` | `identical` — `98d83ac4…8729f`, 8,528,241 bytes, `PASS` | **exactly** |
| `pnpm reproduce:owner:v11` | `identical` — `14e3c735…3fcb4`, 8,682,729 bytes, `PASS` | **exactly** |
| `pnpm verify:owner` | `PASS — opens from file://, no console errors, no off-document requests`; console errors 0 | yes |
| `build:owner` clean tree | 8,528,318 bytes | **exactly** |
| `build:owner:v11` clean tree | 8,682,729 bytes | **exactly** |

The four committed V11 artifacts' byte counts match the record to the byte: 8,556,332 / 8,605,472 /
8,680,573 / 8,682,729.

**No test was weakened.** No `it.skip`, `describe.only`, `test.todo` or equivalent exists anywhere in
`apps/` or `packages/`. No test file was deleted between base and candidate. All 1,061 tests pass.

### Hard limits and authority order

- **No protected boundary touched.** `git diff` over `constitution/`,
  `docs/product/VIRGIL_MASTER_COMMISSION.md`, `docs/decisions/OD-*`, `knowledge/raw/` and
  `schemas/gate-*` returns nothing.
- **Branch discipline holds.** The candidate is contained only in `claude/virgil-mobile-v11` and its
  remote; `main` is untouched. The SHA is pushed and present on `origin`.
- **No credential material.** A pattern scan over the whole branch diff returns only typographic
  "token" identifiers — the monospace verdict token in the window component.
- **CI was strengthened, not relaxed.** `.github/workflows/checks.yml` adds the V11 build, verify and
  reproducer steps. No step was removed or loosened.

### The truthfulness rules

These are the project's known weak points, so they were checked hardest.

- **A verdict shown before its review reported.** `hopNodes` now derives hop state from
  `content.verdict` and `content.active` — what has actually returned — not from the scripted outcome.
  The only remaining `outcome ===` in the V11 screens is a comment describing the removed defect.
- **An invented word in a verdict position.** `test/screen-content-v11.test.ts` genuinely *parses*
  `constitution/authority.json` at runtime (line 44–46) rather than copying its terms, so the
  vocabulary cannot silently drift from the constitution. `NO VERDICT` is the one allow-list addition
  (K11-06). `IN FLIGHT` survives only in a `REVIEW POLICY` chip, where it describes the review and not
  the verdict — confirmed in `screens/v11/screens.ts:331`.
- **Real content presented as illustrative.** The replay's `mergeSha`,
  `cd0981d1cdbf6ac959e25c31856012aa776dd1c5`, is a **real commit in this repository** — `Merge pull
  request #1`. It is marked as past fact, not as a demonstration. Correct.
- **A duration or bar drawn where no duration was recorded.** This one **failed**. See **K11-02**.
- **Demonstration content presented as real.** Partly. See **K11-03**.

### Frames

Every frame cited as evidence exists, and the load-bearing ones were opened and looked at.

- `before-p390/p390-keeper.png` — the claim is that the Keeper is *not in his own frame at all*. **True.**
  The frame is the console, full width, with no character anywhere in it.
- `after-p390/p390-keeper.png` — the Keeper is now central and whole, his console at the right,
  `REVIEWING` legible. **The oldest open visual defect is genuinely fixed.**
- `artifact-p390/p390-keeper-standby.png` — taken from the **committed artifact** (its footer reads
  `stage 3 · 5d16…`). The Keeper faces front, his visor eyes and smile read, his three cards read,
  `STANDBY` is whole on the glass, and the `Demo data` chip is the only demo signage. This corroborates
  both the close-up fix and stage 2's "a display is on while the camera looks at it" fix.
- The same frames also confirm the record's **honest disclosure** that the slab cluster's lower edge
  still crosses the top of the portrait close-ups: the Keeper's reads `OWNER ONLY` above the
  `← Overview` control, exactly as recorded, and it is conspicuous.
- `after-window/p390-window-prover.png` confirms the conclusion-first hierarchy (headline → meaning →
  actions → conversation → evidence → composer), the candidate state `VERIFICATION_INCOMPLETE` (one of
  the fifteen), the disabled session controls, and the back chevron.

---

## Findings

Identities are stable. Severity is this reviewer's. None blocks.

### K11-01 — the run record says stage 4 is not started; the candidate contains stage 4

**Severity: medium. Blocks: no. Surface:** `docs/process/V11_RUN_RECORD.md:1660`;
`apps/mission-control/asset-pipeline/assess-compression.mjs`; `vite.owner.v11.config.ts:31–33`.

The candidate commit is titled *"V11 stage 4, first part"* and adds a 577-line compression assessment.
The run record at this SHA has **no stage 4 section** and its final line reads **"Stage 4 is not
started."** That sentence is false at the SHA it ships in — the class of defect the project calls a
display contradicted by another surface, here between two documents in the same commit.

The brief's second caution requires the numbers to be recorded: *"Measure, then choose, and record the
numbers either way."* The script was run during this review and it works — it produces real encodes with
real encoders and is candid that the KTX2 texture size is `NOT MEASURED`. But **its numbers exist
nowhere in the repository**; they live only in the script's stdout, and nothing runs the script: it is
wired into no `package.json` script, no test and no CI step. The build-identity stage line also still
names stage 3, so the artifact does not signal that stage-4 work is present.

Mitigation: the commit message is unusually candid about all of this, and `src/` is untouched, so the
artifact is unaffected — I confirmed `build:owner:v11` at the candidate produces the same 8,682,729
bytes as the committed stage-3 artifact. Later commits on the branch appear to continue stage 4; they
were not reviewed.

### K11-02 — the run ledger's "elapsed bars" are not elapsed

**Severity: medium. Blocks: no. Surface:** `src/world/screens/v11/screens.ts`, `runLedger`, lines
~643–655; described as "three elapsed bars" in `docs/process/V11_RUN_RECORD.md` (stage 2, V9-ledger
paragraph).

This is the project's own named failure class — *a duration or bar drawn where no duration was
recorded* — and it is live in V11's rebuilt slab.

The bar's fill is:

```js
const fill =
  node.state === 'done' ? 1 : node.state === 'active' ? clamp01((seconds % 6) / 6) : 0;
```

`seconds` is documented at `SlabInput` as *"The demonstration's own clock"* — one global clock, not a
per-hop duration. So:

- an **in-flight** hop draws a bar that is a **six-second sawtooth of the global clock**, identical for
  whichever hop is active and resetting every six seconds. It reads as "how far through this hop is".
  It measures nothing;
- a **returned** hop always draws a **full** bar, so three finished hops of very different lengths draw
  three identical lengths.

The project's own rule is written into `src/world/screens/ledger.ts`, and V11's slab does not follow it:

> `seconds` is what the repository records for this hop, or for a hop with no recorded duration that is
> the words `NOT RECORDED` and **no bar**, because a bar is a length and a length is a claim.

That file also maintains a `maxElapsed` precisely so bar lengths are comparable between rows. The V11
slab uses neither `elapsedOf` nor `maxElapsed`. **No test asserts the bar's semantics** — a grep for
`elapsed` across the V11 screen tests returns nothing, so the 299-assertion content invariant does not
reach it.

Not blocking: the ledger sits at 131.5–160.5 CSS px where the record itself says the rows read only as
shape and colour, and the content is a scripted demonstration. But a bar is the part that *does* resolve
at that size, and this is the one place V11 draws a length that is not a measurement.

### K11-03 — in portrait, an open window carries no demonstration marking

**Severity: medium-low. Blocks: no. Surface:** `src/world/mobile/mobile.css:495–520`;
`e2e/verify-owner-build-v11.ts` (`0 demo words, 0 not-real-state bands`);
`scratchpad/…/after-window/p390-window-prover.png`.

Stage 3 justified the window's `ILLUSTRATIVE · NOT REAL STATE` band by exactly this scenario, in its own
words: *"In portrait the sheet covers the world's own `Demo data` badge; the band carries the same claim
in the same place, so the claim is never off screen."* The between-stages pass then removed the band on
the owner's instruction — *"No bands. No demo signage on the screens."*

The consequence is that in **portrait**, with a window open, the full-screen sheet covers the `Demo
data` chip and nothing replaces it. There is a `has-window` rule that relocates the badge in
**landscape** only; portrait has none. The frame confirms it: a full-screen sheet showing a fabricated
candidate `9abcdef012`, fabricated check names and an agent "still arriving", with no marking that any
of it is scripted. The verifier now actively asserts the absence (`0 demo words, 0 not-real-state
bands`).

Two things keep this off the blocking list. First, it is the **owner's own instruction**, followed, and
a session may not overrule authority layer 1. Second, the composer's permanent line — *"Kept on this
page. Nothing is sent: there is no session behind this build."* — remains on screen and does tell the
reader there is no live session, as does `Session controls — none is connected`.

What is genuinely wrong is the **disclosure asymmetry**: `mobile.css` names the cost precisely and
honestly at the place it decides, but **the run record does not carry it at all** — not in the
between-stages section, not in its "what this pass does not claim" list. The owner reads the record,
not the stylesheet, and the record is where stage 3's opposite promise was made.

### K11-04 — `verify:owner:v11` still contains fixed timeouts, and its PASS is machine-speed dependent

**Severity: low. Blocks: no. Surface:** `e2e/verify-owner-build-v11.ts:376, 412`, and the two
reduced-motion measurements (~872, ~890); nine `timeout: 10_000` sites in total.

The run record describes converting fixed sleeps into polled conditions after the stage-2 regression,
in its own words: *"Timing by the wall clock would make the assertion a property of SwiftShader."* Nine
`boundingBox({ timeout: 10_000 })` waits were not converted.

This was demonstrated, not theorised. A single-viewport copy of the verifier run at the candidate
produced:

```
owner build v11 verify: FAILED
  portrait-390: the window has no back chevron
  portrait-390: no way back to the overview is on screen
  portrait-390: the window has no back chevron
  reduced-motion: the record never opened
  reduced-motion: the window waited -1 ms after the camera moved
```

**All five are false.** The back chevron demonstrably exists — `AgentWindow.tsx:225` renders
`className="v11w-back"`, and `after-window/p390-window-prover.png` shows `‹ Back` at the top left. The
failures are the fixed 10-second waits expiring in a container roughly three to four times slower than
the builders' (theirs ran three viewports in 11m 43s; mine could not finish one plus the reduced-motion
block inside 560s). The check is correct about the product and wrong about the clock — which is the
same fault the record says it fixed elsewhere, and it means a green result here is partly a statement
about the machine.

### K11-05 — 27 MB of scratch output is tracked in `HEAD`

**Severity: low. Blocks: no. Surface:** `scratchpad/`.

Confirmed by measurement: **86 tracked files, 27 MB** of diagnostic PNGs and sweep logs committed by
earlier passes on this branch. The candidate adds none, and `.gitignore` now excludes `/scratchpad/`,
recording the owner's decision of 9 September (*"leave them and stop the bleeding"*). Raised only because
the run record explicitly referred it to the Keeper. No action is recommended against the owner's
decision.

### K11-06 — `NO VERDICT` is an allow-list term not in `authority.json`

**Severity: informational. Blocks: no. Surface:** `test/screen-content-v11.test.ts:225`;
`src/world/screens/v11/content.ts:203`.

The verdict-position allow-list is `authority.json`'s four `reviewVerdicts` **plus** `NO VERDICT`:

```js
const allowed = new Set([...authority.reviewVerdicts.map(spaced), 'NO VERDICT']);
```

This is judged **correct**, and is recorded only so the exception is visible rather than buried: the
term names the *absence* of a verdict and cannot be mistaken for one of the four, and the alternative —
leaving the slab blank under a `VERDICT` heading — would be less clear. The exception is explicit and
enumerated in one place, which is the right way to hold it.

---

## What could not be verified, and why

- **`verify:owner:v11` was never reproduced to completion.** The full script exceeds this harness's
  ten-minute foreground cap; the run record says it takes 11m 43s and this container is markedly slower.
  A single-viewport copy did run end to end at the candidate, and every assertion passed except the five
  in K11-04, all traced to fixed waits and all proven false. **The two secondary viewports (430 × 932
  and 844 × 390) were not exercised by this reviewer at all.** Its `PASS` is therefore accepted in part
  on the builders' report — see the statement below.
- **No check table exists in the run record for the candidate SHA.** The last one belongs to `5d16cbc`.
  The gap is small — the candidate adds one unwired, non-`src/` script and produces an artifact of
  identical size — and this review re-ran seven of the eight required checks at the exact SHA itself,
  which is why the outcome is not `INSUFFICIENT_EVIDENCE`.
- **Everything about real hardware.** No real device, no real GPU, no real iOS keyboard, no Dynamic
  Island, no screen reader. The record states all of these as **not performed** rather than met, which is
  what OD-0005 requires, and that framing was checked and is correct throughout. This review adds no
  hardware evidence and makes no visual-quality judgment on real graphics hardware.
- **The frame-rate and sharpness figures** (1.49 vs 1.88 fps; 1.18 / 0.77 / 0.48 fps) were not
  reproduced. They describe SwiftShader on a CPU and the record says so plainly and repeatedly.
- **Historical measurements taken at earlier commits** — for example stage 1's landscape console width
  of 40.7 px — were not re-derived. The record already discloses that this one could not be reproduced
  by its own authors and does not claim it.
- **Browser-level network noise.** While the verifier ran, Chromium's own component-updater and
  telemetry connections were refused by the egress proxy. These are the browser's, not the document's;
  the artifact's own off-document request count is 0, which was reproduced. Noted so it is not mistaken
  later for the artifact reaching the network.

## What was accepted on the builders' word

Stated explicitly, as required:

1. **`verify:owner:v11`'s `PASS`**, for the 430 × 932 and 844 × 390 viewports, and for the five
   assertions of K11-04 at 390 × 844. Everything else the script asserts at 390 × 844 was reproduced.
2. **The frame-by-frame aesthetic judgments** — "reads as a composed upper register", "bedded onto the
   casing with no seam", "the plate neither fights nor floats". The geometric bounds behind them are
   asserted by tests that pass; the judgments themselves are the builders' and remain builders' claims,
   as their own record says.
3. **The measurement narratives** — the 864-ray faceplate fit, the 1,600-combination cluster sweep, the
   242 poses V8.1 searched, the 132-sample occlusion counts. Their *conclusions* are enforced by tests
   that were run and pass; the process descriptions were not re-executed.
4. **The claim that no shared V10 file other than `Tabletop.tsx` was touched** was **not** accepted —
   it was verified by diff, and holds.

## Independence

This reviewer did not build, plan or repair any part of this candidate, shares no session with the
builders, and used no builder reasoning as evidence — the run record was read as a set of claims to
test. This review modifies no source, no test and no artifact. It does not approve, merge, deploy or
adjudicate, and it authorises nothing.

## Next action

One, for the owner: decide **K11-03** — whether a demonstration marking should be visible in portrait
while a window is open, given that his instruction to remove the band produced that state — and note
**K11-02**, which should be repaired at its cause rather than documented, because the ledger bar is a
drawn length that measures nothing. K11-01 appears to be overtaken by later commits on the branch, which
this review does not cover.
