# Keeper re-review after repair — reproduced verbatim

**This file is the Keeper's report, word for word.** The reviewer asked for that explicitly and added: *"If any word of it is changed, the file must not say 'verbatim'."* Nothing below this line is the filing session's. The heading above and this paragraph are the only text on the page that the Keeper did not write.

The previous review, `docs/process/V11_KEEPER_REVIEW_PHASE2.md`, is a **condensation** and says so at its own head, after the first reviewer objected to being described as filed unedited.

---

# Phase 2 slices one, two and three — independent Keeper re-review after repair

**Candidate:** `1185034d8aeac627e16c6ed63ebb31806d3244f4`, on `claude/virgil-mobile-v11`, head of pull request #8 into `main`.
**Base:** `main` = `90b116ca69b5294fd479998ae0d70429bf84c836`.
**Previous verdict under re-review:** `BLOCKED` on `5b96763`, findings `KP2-01`–`KP2-20`, `docs/process/V11_KEEPER_REVIEW_PHASE2.md`.
**Reviewed:** 10 September 2026. Finding prefix: **`KP3-`**.

> **Filing.** I ask that this be filed word for word, and that the file say plainly at the top that it is the Keeper's report reproduced verbatim. If any word of it is changed, the file must not say "verbatim".

> **Independence.** Keeper, independent session. I built no part of this candidate and no part of the repair. No commit message, run record, code comment or prior review is used as evidence for any finding below; every finding was reproduced from the code, the built artifacts, or GitHub's own API. Working tree clean at start and at finish; I created and modified nothing under `/home/user/Virgil-mission-control`. All probe files are in the session scratchpad outside the repository.

---

## Verdict: `BLOCKED`

Three of the five blocking findings are genuinely closed. **`KP2-04` and `KP2-05` are not closed — they are narrowed to the exact input the repair was tested against, and both reproduce at this SHA on the paths the tests do not construct.** I reproduced each from a built state, not from reasoning.

The second job — reviewing the repair as new work — found that the pattern the brief warned about is present. Two rewritten tests are weaker than the tests they replaced, one under a name that claims a general rule, and the one property most in need of a test (that the new wire check is *called*) has none.

---

## Checks reproduced

Every one executed, none restored. I state the cache status because the previous reviewer asked that it always be stated.

| Check | Result | Cache |
|---|---|---|
| `pnpm lint` | pass | `biome check .`, direct |
| `pnpm turbo run typecheck --force` | pass | **0 cached, 8 total** |
| `pnpm turbo run test --force --continue` | **pass** | **0 cached, 6 total**, 51 test files |
| `pnpm turbo run build:owner --force` | pass | 0 cached; **8,528,896 bytes** |
| `pnpm turbo run verify:owner --force` | pass | 0 cached; requests 1, off-document 0 |
| `pnpm turbo run build:owner:v11 --force` | pass | 0 cached; **7,363,051 bytes** |
| `pnpm turbo run verify:owner:v11 --force` | pass | 0 cached; full run, all three viewports and the motion tail; requests 8, off-document 0; includes *"the composer … claims nothing was sent"* |
| `pnpm --filter mission-control build:web` | pass | artifact then inspected by hand |

**A correction to the brief I was given, in my favour and worth recording.** I was told this container cannot reach GitHub or the internet. **It can.** `git ls-remote`, `curl https://api.github.com` and the REST API all answer. I therefore resolved several things the previous reviewer had to leave as `INSUFFICIENT_EVIDENCE`, and two of the answers matter (`KP3-06`, `KP3-07`). Where I still could not check something, I say so.

**SHA currency, measured rather than assumed.** Local `HEAD`, `origin/claude/virgil-mobile-v11`, `git ls-remote` and PR #8's `head.sha` are all `1185034d8aeac627e16c6ed63ebb31806d3244f4`. **`KP2-20` does not recur; this verdict attaches to a SHA that is current on the remote and is the PR head.**

**CI is not complete for this SHA at the time of this review.** Fourteen check runs completed (twelve success, one neutral, four skipped by the push/PR split) and **two are still `in_progress`**: *"V11 owner build and verify (motion and performance)"* and *"lint, typecheck, tests, owner build, owner verify"*. PR #8 is `open`, `mergeable: true`, `mergeable_state: unstable`. Strictly, `REVIEW_POLICY.md` *What review requires* is unmet on the hosted runner. I proceeded because I executed the equivalent of both unfinished jobs locally, uncached, and they pass; my verdict rests on my own execution, not on GitHub's. Recorded as `KP3-13`.

---

## Job one: the five blocking findings

| | Verdict | One line |
|---|---|---|
| **KP2-01** | **Closed** | Seed graph regenerated; `pnpm test` passes with 0 cached. |
| **KP2-02** | **Closed at the workflow; the replacement test is weaker on one axis** — see `KP3-03`. |
| **KP2-03** | **Closed** | Verified in source and in all three built artifacts. |
| **KP2-04** | **Moved, not closed** | The verdict path is gone; the same defect is live on the candidate slab — `KP3-02`. |
| **KP2-05** | **Narrowed, not closed** | Fixtures still reach the live consoles on the common path — `KP3-01`. |

### KP2-01 — closed.

`packages/test-fixtures/knowledge/seed-graph.json` gained the `docs/decisions/OD-0010-…` node and the hash moved to `sha256:4656f630…`. `packages/knowledge-graph/test/seed-graph.test.ts` is **untouched by the repair** — the fixture was regenerated, not the assertion relaxed, which is the right repair. `pnpm turbo run test --force` reports `Cached: 0 cached, 6 total`, `Tasks: 6 successful`, and `@virgil/knowledge-graph` 3 files passed. **Executed, not restored.**

### KP2-02 — closed at the workflow.

`paths-ignore` is removed outright from `.github/workflows/checks.yml` rather than narrowed, which is the stronger of the two repairs the previous reviewer offered. The false sentence is gone and replaced with a record of what it cost. The test that enforced it is inverted. That much is right. What is wrong with the replacement is `KP3-03`, and it is not a re-opening of `KP2-02`.

### KP2-03 — closed.

`liveTransport` is wired at `AgentWindow.tsx:392`; `canInstruct()` gates the composer note at `:460`, the label at `:431`, the button word at `:453` and the submit handler at `:413`. The four sentences no longer co-occur. With no secret the button reads **Keep**, the note reads `COMPOSER_NOTE`, and the handler keeps rather than sends — consistent. With the secret the button reads **Send**, the note reads `LIVE_COMPOSER_NOTE`, and `absence` says a session can be started — consistent. `verify:owner:v11` passed in full including *"the composer … claims nothing was sent"*, so the Owner Build's honesty text survived the change. I checked this rather than trusting it, because a repair to a composer note is exactly the kind that breaks the verifier.

### KP2-04 — moved. See `KP3-02`.

`liveState.ts:271` is now the literal `verdict: '—'`; no path carries a report's verdict to the slab, and two tests plus a source-text guard would fail if it were restored. That half is genuinely closed and well done. **The other half is not.** The new wire check does not look at `candidate` at all, and `liveState.ts:274` still carries `report.candidate.state` straight to the candidate slab.

### KP2-05 — narrowed. See `KP3-01`.

---

## Blocking findings

### KP3-01 — `KP2-05` reproduces on the live page whenever no current three-hop report exists, which is the steady state.

**Severity: blocking.**
`apps/mission-control/src/world/live/liveState.ts:214,238`; `apps/mission-control/src/world/screens/v11/screens.ts:170-171,189,202,206,238,245`.

`EMPTY_WORK` is assigned **inside** `for (const hop of report.hops)` at `liveState.ts:214`. A station that has no hop in the report — or every station, when there is no current on-branch report at all — keeps `demoAt(0, 0, false)`'s cast member, on which `work` is **absent**. `screens.ts:170-171` falls back to `FABRICATOR_FILES`/`FABRICATOR_COMMITS`, `:202` to `proverChecks(outcome)`, `:238` sets `review = null`, and each `unknown*` guard is then false, so the fixtures are drawn exactly as before the repair.

Measured, by calling `stateFromAnswer` on a live answer and rendering each console through a recording 2D context:

```
CASE A — no sessionReport at all (the ordinary live page)
  fabricator: work=ABSENT  … FILES CHANGED | 0 / 8 | COMMITS | 0 / 3 | …
  prover:     work=ABSENT  … PASSED | 0 | FAILED | 0 | SKIPPED | 0 | OF | 14 required
  keeper:     work=ABSENT  … SOURCES | EVIDENCE LOCKED · 5 LINKS

CASE B — a report naming only the fabricator hop
  fabricator: work=set     … FILES CHANGED | — | COMMITS | —        (repaired)
  prover:     work=ABSENT  … OF | 14 required                        (fixture)
  keeper:     work=ABSENT  … EVIDENCE LOCKED · 5 LINKS               (fixture)

CASE C — a report past REPORT_GOES_COLD_MS
  all three: fixtures, identically to CASE A

CASE D — a report naming a different branch
  all three: fixtures, identically to CASE A
```

`8`, `3`, `14` and `EVIDENCE LOCKED · 5 LINKS` are the demonstration's constants — the same three the previous reviewer named.

**Why this is the common case and not an edge case.** `REPORT_GOES_COLD_MS` is twenty minutes by design, and `.virgil/state.json` changes only when a session commits. Every time the owner opens the page more than twenty minutes after a session last wrote, he gets CASE C. And `MobileRoom.tsx:814-826` writes prose for precisely these branches — *"has gone cold, so nobody is shown working"* and *"No session has written a report, so nobody is shown working"* — on the same screen, twenty lines under *"The branch, the commit and the check results come from GitHub, which no session can write to."* So the contradiction the previous review photographed is not merely still present; it is present in the state the page has a paragraph written specially for.

**There is a third route to it that the repair itself created.** When the new `shapeComplaint` refuses a report, `state.mjs:309` returns `{ report: null }`, which is CASE A. A report rejected for a bad shape therefore produces a screen full of the demonstration's numbers.

### KP3-02 — a session can write an arbitrary string into a candidate-state position on the candidate slab. The new wire check never looks at `candidate`.

**Severity: blocking.**
`netlify/functions/state.mjs:235-273` (no `candidate` branch anywhere in `shapeComplaint`); `apps/mission-control/src/world/live/liveState.ts:274`.

`shapeComplaint` validates `reportedAt`, `aboutCommit`, `branch`, `holder`, `hops` and `review`. It does not validate `candidate`. `liveState.ts:274` reads `(report?.candidate?.state ?? null) as CandidateName` — a bare cast — and the candidate slab draws it.

Measured, with a report whose `candidate` is `{ "state": "APPROVED BY THE OWNER" }` and nothing else:

```
wire check says: null                      ← accepted
content.candidate = "APPROVED BY THE OWNER"
candidate slab drew: THE WORK BEING PREPARED | eeeeeee | WHERE IT IS NOW |
  APPROVED BY THE OWNER | THE STATUS RECORDED BY THE PROJECT | …
```

The Zod schema refuses that object outright (`candidate` is `{sha, shortSha, state}` `.strict()`, and `state` is `CandidateState`). So the schema forbids it, the wire check admits it, and the page prints it under the caption *"THE STATUS RECORDED BY THE PROJECT"*.

This is `KP2-04`'s finding with one field's name changed: *a session can put a word of its choosing onto a slab whose whole subject is the difference between a claim and a record.* The repair removed the verdict path and added a check that does not cover the adjacent field feeding the adjacent slab. I record it as **moved rather than closed** because the mechanism, the threat model and the surface class are identical.

The test that would have caught it exists and is pointed the wrong way: `screen-content-v11.test.ts:552-561`, *"every word in a candidate-state position is one of the fifteen, or none"*, iterates `demoAt` beats only. It never touches a live state.

---

## Major findings

### KP3-03 — `required-checks.test.ts` derives one deriver's inputs, not "any check", and it silently dropped the two assertions that protected source.

**Severity: major.** `apps/mission-control/test/required-checks.test.ts:155-176`.

Two separate problems, and the second is the one that matters.

**It matches one YAML spelling.** Line 168 extracts ignore patterns with `/^ {6}- '([^']+)'$/gm` — single-quoted, exactly six spaces of indent. I evaluated the test's own two regexes against six ways of writing the same `paths-ignore`:

```
TEST FAILS (caught)   quoted, 6-space           ← the form that was there before
TEST PASSES (missed)  unquoted, 6-space         ← legal YAML: `- docs/**`
TEST PASSES (missed)  double-quoted, 6-space
TEST PASSES (missed)  flow sequence: ['docs/**', 'knowledge/**']
TEST PASSES (missed)  quoted, 4-space indent
```

So it catches a literal revert and misses four ordinary rewrites of the same defect. `docs/**` and `knowledge/**` need no quotes in YAML; the unquoted form is the one a person is most likely to type.

**It stopped protecting `apps/**` and `packages/**`.** The test it replaced asserted `expect(workflow).not.toContain('apps/**')` and `not.toContain('packages/**')`. Those two lines are deleted and nothing replaces them — I grepped the whole file and the whole workflow. The new logic passes any pattern whose top-level segment is not one the knowledge-graph deriver walks:

```
TEST PASSES (missed)  paths-ignore: ['apps/**', 'packages/**']
```

A workflow that skipped every check on every source change would satisfy this test. That is strictly weaker than what was there before, under the title *"ignores no path that any check actually reads"*. The derived root set is `{raw, docs, wiki, outputs, knowledge}` — the inputs of one deriver — and the title claims the inputs of every check.

I want to be fair about what was gained: deriving `docs`/`knowledge` from `derive.ts` rather than naming them is a real improvement over a comment, and `expect(roots.size).toBeGreaterThan(1)` guards the extraction from silently returning nothing. The finding is that the name asserts a universal and the code checks a particular — which is the same shape of defect as `KP2-02` itself.

### KP3-04 — nothing asserts that `shapeComplaint` is ever called. Deleting the call site leaves the suite green.

**Severity: major.** `netlify/functions/state.mjs:308-309`; `apps/mission-control/test/live-state-v11.test.ts:347-411`.

`KP2-04` was, in the previous reviewer's own words, *"the schema is never applied to the data"* — a check that existed and did not run. The repair writes a second check and tests it **as a pure function**: every assertion in the new block calls `shapeComplaint(...)` directly. I grepped the whole repository: `shapeComplaint` appears at its definition (`state.mjs:235`), at its one call site (`state.mjs:308`), and at three places in that test file. **No test asserts the call site exists.**

Remove lines 308-309 and `pnpm test` still passes, and the finding is fully reopened. This repository has now shipped exactly this failure twice — `liveTransport` was written and never wired (`KP2-03`), and Zod was written and never wired (`KP2-04`). A `toContain('shapeComplaint(report)')` over the function's source, which is the idiom this file already uses eleven times, would cost one line.

### KP3-05 — the wire check and the Zod schema are held against each other on nine chosen inputs, not over the space. Seventeen of twenty probed inputs diverge.

**Severity: major.** `netlify/functions/state.mjs:235-273`; `packages/agent-contracts/src/live.ts:67-124`; `apps/mission-control/test/live-state-v11.test.ts:365-410`.

The disclosure in the code is honest — it says the wire check is *"deliberately narrow: structure, types and vocabulary, and nothing about meaning"* and *"a smaller guarantee than the schema's"*. The claim I am testing is the different one at `live.ts:58-63` and in the test's comment: that the two *"are now held against each other … so they cannot drift apart silently"*. They can, and they already have.

I ran a differential over twenty inputs. Result: **17 drift.** The full table:

```
WIRE:accept  ZOD:refuse   unknown top-level key                     DRIFT
WIRE:accept  ZOD:refuse   unknown key inside a hop                  DRIFT
WIRE:accept  ZOD:refuse   unknown key inside review                 DRIFT
WIRE:accept  ZOD:refuse   reportedAt is not a timestamp             DRIFT
WIRE:accept  ZOD:refuse   note longer than 300 chars                DRIFT
WIRE:accept  ZOD:refuse   note is not a string                      DRIFT
WIRE:accept  ZOD:refuse   candidate with an invented state, no sha  DRIFT  ← KP3-02
WIRE:accept  ZOD:refuse   candidate state not in the fifteen        DRIFT  ← KP3-02
WIRE:accept  ZOD:refuse   candidate is a string                     DRIFT
WIRE:refuse  ZOD:refuse   hops is not an array of objects
WIRE:accept  ZOD:refuse   hop.at is garbage                         DRIFT
WIRE:refuse  ZOD:refuse   aboutCommit uppercase SHA
WIRE:accept  ZOD:refuse   review.findings negative                  DRIFT
WIRE:accept  ZOD:refuse   review.findings not a number              DRIFT
WIRE:accept  ZOD:refuse   review.recordPath is ../../etc/passwd     DRIFT
WIRE:accept  ZOD:refuse   schema literal wrong                      DRIFT  (covered elsewhere: state.mjs checks the version before this)
WIRE:refuse  ZOD:accept   holder = 'architect' (a real RoleId)      DRIFT  ← the wire is stricter than the schema
WIRE:accept  ZOD:accept   holder = null
WIRE:refuse  ZOD:refuse   branch missing entirely
WIRE:accept  ZOD:refuse   review present, findings/blocking missing DRIFT
```

Nine of the drifts are `.strict()` and type-refinement gaps, which is the disclosed narrowness and is arguable. Three are not arguable: the two `candidate` rows are `KP3-02`; and **`holder: 'architect'` is refused on the wire and accepted by the schema**, which is a divergence in the opposite direction — a report that is valid under the published contract is rejected in production with the complaint *"names a holder this build does not know"*. The drift test's `holder` case uses `'owner'`, which is not a `RoleId` at all, so both sides refuse it and the real divergence is invisible.

**On the `StationRole` narrowing specifically, which I was asked to check: it broke nothing.** `StationRole` is consumed only by `SessionHop`, which is consumed only by `SessionStatusReport`, whose only consumers are `exported-schemas.ts` and the tests; `.virgil/state.json` uses only the three roles; `pnpm typecheck --force` and `pnpm test --force` both pass. `holder` correctly kept the wide `RoleId`. The narrowing is right. What it did *not* do is close the `holder` divergence in the row above.

### KP3-06 — `main` has no branch protection and no required status checks. Measured, not inferred.

**Severity: major. New — the previous reviewer could not check this and correctly recorded it as `INSUFFICIENT_EVIDENCE`.**
`.github/workflows/checks.yml`; `apps/mission-control/test/required-checks.test.ts:1` (the file's own title).

```
GET /repos/dniachini-droid/Virgil-mission-control/branches/main
  protected = False
  protection = {"enabled": false,
                "required_status_checks": {"enforcement_level": "off",
                                           "contexts": [], "checks": []}}
```

Two consequences.

**It escalates `KP2-11` from theoretical to actual.** The previous reviewer wrote that an agent choosing to push to `main` *"is refused by branch protection if it exists, and otherwise by nothing in this workflow"*. It does not exist. A session started from the owner's phone runs `claude -p` with `contents: write` and is bounded against touching the default branch by prose in `CLAUDE.md` and by nothing else.

**It contradicts the premise of an entire test file.** `required-checks.test.ts` is titled *"the gate runs in full before anything can merge"*. No check is required to pass before anything can merge. The file asserts the *arrangement* of the workflow, which is real; the sentence it is named for is a claim about GitHub's configuration, which is false. This is the same species as `KP2-02` and `KP2-11` — a test whose name states a property of the world and whose body states a property of a file.

I raise this as major rather than blocking because it is a repository setting outside the diff, it is the owner's to change, and it was outside the repair scope. It should not be carried as resolved.

### KP3-07 — the repository is private, which settles `KP2-08`'s impact.

**Severity: major.** `netlify/functions/state.mjs:325-420`; `netlify.toml:24-27`.

```
GET /repos/dniachini-droid/Virgil-mission-control  →  private = True, visibility = private
```

I re-read `state.mjs` at this SHA: `handler` at `:325` checks no secret, no method and no origin. It returns the branch, head SHA, commit subject, PR number, title and URL, every check run, GitHub review states and the whole of `.virgil/state.json` to anyone who requests the path. `KP2-08` therefore is not "an endpoint without auth" but **an unauthenticated public read of a private repository's state**, and the only thing standing in front of it is whatever Netlify site protection is configured — which I still cannot see from here and which `PHASE_2_SLICE_3_BRIEF.md:36` itself says is not the right answer: *"the function is protected separately, because an endpoint is reachable whether or not a page in front of it is."*

---

## Carried forward from the previous review, all out of the repair's scope

I checked each at this SHA rather than assuming. `.github/workflows/instruct.yml`, `netlify/functions/instruct.mjs`, `netlify.toml`, `apps/mission-control/package.json` and `turbo.json` are **byte-identical to `5b96763`** (`git diff --quiet` on each).

| | Status at `1185034d` | Evidence |
|---|---|---|
| **KP2-06** unsanitised `inputs.branch` | **Stands, unchanged.** Its backstop is now known to be absent: `instruct.yml:68` claims *"`main` is not reachable from this workflow by any input"*, and `main` is unprotected (`KP3-06`). | file unchanged |
| **KP2-07** endpoint fails open on the runs query | **Stands, unchanged.** | `instruct.mjs:126-151` unchanged |
| **KP2-08** `/api/state` unauthenticated | **Stands; impact now established.** See `KP3-07`. | handler re-read at `:325` |
| **KP2-09** no verification of the hosted build | **Stands, unchanged.** `build:web` is in `package.json:12` and in no turbo task, no `pnpm check`, no CI step; `dist/web` is referenced by no test and no e2e — only by `vite.web.config.ts:68`, which writes it. | grepped |
| **KP2-10** `__LIVE__` does not remove the instruct client | **Stands, and has widened.** Measured in the freshly built V11 Owner Build artifact `dist/owner-build-v11/v11-s4-virgil-1185034d8a.html`: `/api/instruct` ×1, `x-virgil-secret` ×1, `virgil.instruct.secret` ×1 — and now also `"This starts a real session on the working branch"` ×2 and `"A session can be started from here"` ×1, both added by the `KP2-03` repair. `/api/state` ×0. The V10 Owner Build is clean of all seven strings, so `KP2-14` stays latent as recorded. The behavioural promise holds and I verified it: `verify:owner:v11` passed in full, off-document 0. It holds because one boolean is false at runtime. | artifact grep |
| **KP2-11** the agent step is bounded by prose | **Stands, and is worse.** See `KP3-06`. | file unchanged |

`KP2-12` and `KP2-15` through `KP2-19`: unchanged, none touched by the diff. `KP2-13` see `KP3-12`. `KP2-14` unchanged — `vite.owner.config.ts` still defines no `__LIVE__`, and no test anywhere asserts a `__LIVE__` value in any config. `KP2-20` does not recur.

---

## Minor findings

**KP3-08 — the `window-v11.test.ts` narrowing leaves the property it protected resting on an unasserted build define.** `apps/mission-control/test/window-v11.test.ts:262-278`. The narrowing itself is correct and honestly explained: the old assertion pinned an unconditional string and would have had to be deleted or falsified. But the property — *the Owner Build says nothing was sent* — now holds only because `canInstruct()` folds to false, which requires `__LIVE__: false` in `vite.owner.v11.config.ts:70`, and **no unit test asserts that any config defines `__LIVE__` at any value**. The only thing standing behind it is `verify:owner:v11`, an eighteen-minute e2e that is not in the fast job. I ran it and it passes, so the property is protected today — by one check, at the far end of the pipeline, rather than by the cheap test that used to hold it. `vite.owner.config.ts` having no `__LIVE__` at all (`KP2-14`) is the same gap one build over.

**KP3-09 — `note` is unvalidated on the wire.** `state.mjs:235-273`. Not length-checked, not type-checked; the schema bounds it at 300 characters and requires a string or null. It is not rendered by any component I could find, so this is latent. It is listed because it is one of the seventeen drifts and because "not rendered today" is how `liveTransport` was described too.

**KP3-10 — the new fixture rule checks three literals, and one of them is a bare digit.** `apps/mission-control/test/screen-content-v11.test.ts:221`. `['8', '14', 'EVIDENCE LOCKED']` as substrings of the joined draw calls. `'8'` will match any SHA, count or coordinate containing an eight, so it is simultaneously fragile and coincidental. The block's header claims *"fails if any of the fixture's numbers appear, whatever the route by which they arrived"*; what it does is check three strings against one hand-built state. To its credit, it **does** fail if the `EMPTY_WORK` repair is reverted — I confirmed that the state it builds draws fixtures when `work` is absent. It is a valid regression test for the exact revert and not the rule its header names.

**KP3-11 — the head commit is the session under review writing a claim about this review.** `.virgil/state.json`, the whole of the diff `32b7c60..1185034`. It sets `holder: "keeper"`, the keeper hop to `WORKING`, and the note *"A second, independent Keeper is reviewing the repairs to the five blocking findings."* The previous reviewer noted the same thing once; it has now happened twice. `KP2-04`'s repair removed the verdict from the slab but left `holder` and hop activity as fields any session on the branch can write and the room draws as agent state. The room does label it as their word — `MobileRoom.tsx:802-813` says so plainly — so I do not call it a lie. I record that after the repair, **every depiction of an agent in the live room is still the builder's own word about itself**, and that the one commit under review is an instance of a session writing a claim about a Keeper's independence that no Keeper made.

**KP3-12 — `KP2-13` stands, and the stale byte figure is now wrong by 578 bytes.** `apps/mission-control/src/world/assets/gzipPayloads.ts:14`, `packages/agent-contracts/src/index.ts:61`, `apps/mission-control/src/world/live/liveState.ts:20`, `apps/mission-control/owner-build/gzip-payloads.mjs:13` all still state `8,528,318` as a live contract. My clean measurement is **8,528,896**. `gzipPayloads.ts:14` reads *"V10 must build to exactly 8,528,318 bytes"*, which OD-0010 retired. `liveState.ts:20` reads *"its 8,528,318 bytes cannot move by anything here"* — and by elimination they did move by this very repair: the V10 artifact contains none of the live strings, the only other delta reaching it is `seed-graph.json`, and the 305-byte difference from the previous reviewer's `8,528,591` is the `OD-0010` node the `KP2-01` fix added. That is not a breach — OD-0010 retired the contract, and the mechanism is the one `PRESERVATION_CONTRACT_CONTRADICTION.md` documents. It is a sentence in four source files that is now false.

**KP3-13 — CI had not completed for this SHA when I reviewed it.** Two check runs `in_progress`; `mergeable_state: unstable`. Recorded under `REVIEW_POLICY.md` *What review requires*. I did not treat it as a stop condition because I executed the equivalent work locally and uncached, and the three viewport verify jobs, the reproducibility job, Mind Scan and both `lint, typecheck, tests` runs are green on the hosted runner. Anyone relying on this report should confirm the last two runs finished.

---

## Where I disagree with the previous reviewer

Very little, and I say so with the finding rather than out of deference.

- **`KP2-20`, and the choice behind it.** The previous Keeper hit a stop condition — reviewed SHA not the branch head — checked the delta, and reviewed anyway rather than stopping. I think that was right, and I would have done the same, but I want to name that it was a judgment against a written stop condition and not a neutral act. It does not arise here: the SHA is the head, on the remote, and is PR #8's head.
- **`KP2-18`.** I agree that the language pass is unverifiable from the repository and that `INSUFFICIENT_EVIDENCE` is the correct disposition. I add that the network being available from this container does not help — the extraction and the owner's returned file are committed nowhere, so there is nothing to fetch.
- **The claim that this container cannot reach GitHub.** The previous review recorded seven items as `INSUFFICIENT_EVIDENCE` on that basis, in good faith. Three of them are checkable and I checked them: PR identity and head (`KP3` header), repository visibility (`KP3-07`), branch protection (`KP3-06`). The remaining four — token scopes, whether the three secrets exist, Netlify password protection, and whether `instruct.yml`/`state.mjs` behave as read — I could not check and record as `INSUFFICIENT_EVIDENCE` again. I mention this not as a criticism but because a repository whose recurring defect is the gap between a claim and what backs it should not carry "unknowable" for something that turned out to be one HTTP request away.

Otherwise I reproduced `KP2-01` through `KP2-05` as stated, and `KP2-06` through `KP2-11` as stated, and found nothing overstated in the previous report.

---

## The smallest repair that would clear this block

Offered as scope, not as a plan — the Architect's to write.

1. **`KP3-01`:** set `EMPTY_WORK` for all three roles unconditionally in `stateFromAnswer`, outside and before the `hops` loop, so no live cast member can ever reach `screens.ts` with `work` absent. Then widen `screen-content-v11.test.ts`'s new block to the states that actually occur: no report, cold report, wrong-branch report, partial report.
2. **`KP3-02`:** validate `candidate` in `shapeComplaint` — `null`, or `{sha, shortSha, state}` with `state` in `authority.json`'s fifteen or null — and stop casting at `liveState.ts:274`. Then extend the candidate-vocabulary test at `screen-content-v11.test.ts:552` over live states, not only `demoAt` beats.
3. **`KP3-04`:** one assertion that `state.mjs`'s source contains the call, in the idiom the file already uses.
4. **`KP3-03`:** restore the `apps/**` and `packages/**` assertions that were deleted, and match the ignore list by parsing the `on:` block rather than by one quoting convention.
5. **`KP3-05`:** either generate the drift cases from the schema's own shape, or state in the code that the pairing covers nine named cases and is not a proof of equivalence — the second is honest and costs nothing.
6. **`KP3-06`, `KP3-07`:** the owner's, not a session's.

I raise no finding I could not reproduce, and I have filled no gap with assumption.

**Verdict: `BLOCKED` on `1185034d8aeac627e16c6ed63ebb31806d3244f4`.** Blocking findings: `KP3-01`, `KP3-02`. `KP2-01`, `KP2-02` and `KP2-03` are closed and I record them as closed. `KP2-04` and `KP2-05` are not.

---

Files that matter most, all absolute:

- `/home/user/Virgil-mission-control/apps/mission-control/src/world/live/liveState.ts` (lines 214, 238, 274)
- `/home/user/Virgil-mission-control/apps/mission-control/src/world/screens/v11/screens.ts` (lines 170-171, 189, 202, 206, 238, 245)
- `/home/user/Virgil-mission-control/netlify/functions/state.mjs` (lines 235-273, 308, 325)
- `/home/user/Virgil-mission-control/apps/mission-control/test/required-checks.test.ts` (lines 155-176)
- `/home/user/Virgil-mission-control/apps/mission-control/test/live-state-v11.test.ts` (lines 347-411)
- `/home/user/Virgil-mission-control/apps/mission-control/test/screen-content-v11.test.ts` (lines 162-228, 552-561)
- `/home/user/Virgil-mission-control/apps/mission-control/test/window-v11.test.ts` (lines 262-278)
- `/home/user/Virgil-mission-control/packages/agent-contracts/src/live.ts` (lines 58-65, 106-116)
- `/home/user/Virgil-mission-control/docs/process/V11_KEEPER_REVIEW_PHASE2.md` (the previous review)
