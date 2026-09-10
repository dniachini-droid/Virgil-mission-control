# Third Keeper review — Phase 2 slices one, two and three, candidate `898b7d0`

**This file is the Keeper's report reproduced verbatim.** Everything below the rule is the reviewer's own text, word for word, as it asked at its head. Nothing has been condensed, reordered, softened, renumbered or reframed. This heading and the three paragraphs under it are the filing session's, and are the only words in this file that are not the Keeper's.

The reviewer's own note applies to this file as much as to the two before it: nothing in this repository holds an independent copy of what it returned, so the word *verbatim* rests on the filing session's honesty and on nothing else. It records that itself under *"What I could not check"*, and the owner should read it knowing that.

Filed by the session that built the candidate. **Verdict: `PASS_WITH_NON_BLOCKING_FINDINGS`. No blocking findings.** `KP4-02` places this run at `OWNER_DECISION_REQUIRED` under `constitution/authority.json`: it is the third repair-and-re-review cycle where the constitution allows two with an owner decision, and no such decision is on record. **This session has therefore stopped repairing rather than opened a fourth round on its own authority**, which is what that finding requires of it.

---

# Phase 2 slices one, two and three — third independent Keeper review after the second repair

**Candidate:** `898b7d0af689783b650280e30a4cc3798101968c`, on `claude/virgil-mobile-v11`, head of pull request #8 into `main`.
**Base:** `main` = `90b116ca69b5294fd479998ae0d70429bf84c836`.
**Previous verdicts under re-review:** `BLOCKED` on `5b96763` (findings `KP2-01`–`KP2-20`, `docs/process/V11_KEEPER_REVIEW_PHASE2.md`) and `BLOCKED` on `1185034` (findings `KP3-01`–`KP3-13`, `docs/process/V11_KEEPER_REVIEW_PHASE2_REREVIEW.md`).
**Reviewed:** 10 September 2026. Finding prefix: **`KP4-`**.

> **Filing.** I ask that this be filed word for word, and that the file say plainly at the top that it is the Keeper's report reproduced verbatim. If any word of it is changed, the file must not say "verbatim".

> **Independence.** Keeper, independent session. I built no part of this candidate and no part of either repair. No commit message, run record, code comment or prior review is used as evidence for any finding below. Every finding was reproduced from the code, from a built artifact, from a mutation of a file copied outside the repository, or from GitHub's own API. Working tree clean at start and at finish; I created and modified nothing under `/home/user/Virgil-mission-control`. All probe files are in the session scratchpad outside the repository.

---

## Verdict: `PASS_WITH_NON_BLOCKING_FINDINGS`

**Both blocking findings of the second review are genuinely closed, and I confirmed each by reverting the repair in a copy and watching the new tests fail.** This is the first round in this series where a repair closes the finding rather than narrowing it, and I want to be as specific about that as I have been about the failures: `KP3-01` is closed by construction rather than by covering the cases it was tested against, and `KP3-02` is closed on both sides of the wire.

`KP3-03`, `KP3-04` and `KP3-05` are closed as far as their claims go. `KP3-05`'s claim is the one I tested hardest, because it is the one most easily overstated, and **it is not overstated** — the code says the generated pairing is not a proof of equivalence, and it is not, and I found two divergences outside the battery that prove the disclaimer is doing real work rather than decorating a boast.

The `NEGATIVE_FRAMES` change is **not** a test weakened to make a job fit, and I say so having tried to make the opposite case. My reasoning is in its own section below, together with the one thing about it I do fault.

Ten findings are new. None of them blocks. Two are major: one is a residual of `KP3-03` in the same shape as `KP3-03` itself, and one is a governance breach that is not about the code at all and is the owner's to resolve.

**CI is complete and green for this SHA.** That is the first time in this series, and it closes `KP3-13`.

---

## SHA currency and preconditions, measured rather than assumed

| | Value |
|---|---|
| Local `HEAD` | `898b7d0af689783b650280e30a4cc3798101968c` |
| `git ls-remote origin refs/heads/claude/virgil-mobile-v11` | `898b7d0af689783b650280e30a4cc3798101968c` |
| PR #8 `head.sha` | `898b7d0af689783b650280e30a4cc3798101968c` |
| PR #8 | `open`, not draft, `mergeable: true`, `mergeable_state: clean` |
| Working tree | clean at start and at finish |
| Protected boundaries in the diff | none — `git diff --name-status 90b116c..898b7d0 -- constitution docs/product knowledge/raw 'schemas/gate-*'` returns nothing |

`docs/decisions/OD-0009` and `OD-0010` are added on the branch. That path is `ownerInstructedOnly` rather than `sessionDenied` in `constitution/authority.json`, both records carry the owner's quoted words and the mechanism `OD-0006` describes, and both were seen by the previous reviews. I record the path as touched and raise nothing on it.

PR #8 was created on 2026-09-10 at 08:50:21Z by the account `dniachini-droid`, which is the owner's own. `CLAUDE.md`'s prohibition on a session opening a pull request is therefore not engaged by anything I can see, and I record how I settled it rather than leaving it as an assumption.

**CI, read from the API rather than from the brief.** Workflow run `34484567245` on this SHA concluded `success` at 14:27:28Z. All eight of its jobs completed successfully, including `V11 owner build and verify (motion and performance)` (13:46:01Z → 14:08:06Z, 22 minutes) and `lint, typecheck, tests, owner build, owner verify`, which was still `in_progress` when I began and completed `success` at 14:27:27Z. Sixteen check runs exist on the SHA: eleven `success`, four `skipped` by the push/pull-request split, one `neutral` (Netlify's *Pages changed*). **`REVIEW_POLICY.md`'s *What review requires* is met on the hosted runner for the first time in this series.**

---

## Checks reproduced

Every one executed here, none restored from a cache or from a report. I state cache status because the first reviewer asked that it always be stated and because `KP2-01` was a false pass produced by turbo.

| Check | Result | Cache / evidence |
|---|---|---|
| `pnpm lint` | pass | `biome check .`, direct, 294 files |
| `pnpm turbo run typecheck --force` | pass | **0 cached, 8 total** |
| `pnpm turbo run test --force --continue` | pass | **0 cached, 6 total**; 35 test files, **1,600 tests** |
| `pnpm turbo run build:owner --force` | pass | 0 cached; **8,528,896 bytes** |
| `pnpm turbo run verify:owner --force` | pass | 0 cached; requests 1, off-document 0 |
| `pnpm turbo run build:owner:v11 --force` | pass | 0 cached; **7,363,051 bytes** |
| `verify:owner:v11`, motion and performance tail | pass | run by hand, `VIRGIL_V11_TAIL=run`, viewports none; frame period **1,469 ms** here |
| `pnpm --filter mission-control build:web` | pass | artifact then inspected by hand |
| `pnpm --filter @virgil/knowledge-lint run lint` | pass | 84 nodes, 166 edges, 94 tethers intact, **no findings** |
| `pnpm --filter @virgil/knowledge-graph export-seed-graph` | pass | committed graph **fresh**; hash `sha256:4656f630…` unchanged |
| `pnpm --filter @virgil/agent-contracts export-schemas` | pass | **no drift**; `git status schemas/` clean afterwards |

The three V11 viewport parts I did not run locally; CI ran all three and all three are green on this SHA. I say which is which rather than presenting CI's work as mine.

---

## Job one: the findings the repair was aimed at

| | Verdict | One line |
|---|---|---|
| **KP3-01** | **Closed** | `EMPTY_WORK` is unconditional and first; reverting it in a copy makes the new tests fail on the right consoles. |
| **KP3-02** | **Closed** | Refused on the wire and dropped in the page; all fifteen constitutional states still pass through. |
| **KP3-03** | **Closed as raised; one form remains** | All five forms the previous review named are now caught, plus five more. A pattern with no `/` is still invisible — `KP4-01`. |
| **KP3-04** | **Closed** | The call site is asserted by source text, in the file's own idiom. One residual, `KP4-06`(b). |
| **KP3-05** | **Closed, and the claim is accurate** | 1,431 generated cases, 0 disagreements; 13 of my 14 loosening mutants are caught and the 14th is an equivalent mutant. |
| **KP3-13** | **Closed** | CI complete and green on this SHA. |

### KP3-01 — closed, and closed by construction.

`apps/mission-control/src/world/live/liveState.ts:265-269` assigns `EMPTY_WORK[role]` to every member of `cast` in a loop over `Object.keys(cast)`, before `if (report)` and outside the hops loop. There is no branch left to miss.

I called `stateFromAnswer` on seven live answers, including three the repair was not tested against:

```
A no report                      fab=set prov=set keep=set
B partial (fabricator hop only)  fab=set prov=set keep=set
C cold report (3 hours)          fab=set prov=set keep=set
D report about another branch    fab=set prov=set keep=set
E sessionReport: null            fab=set prov=set keep=set
F sessionReport: "nonsense"      fab=set prov=set keep=set
G hops key absent                stateFromAnswer THREW — see KP4-06
```

Then I rendered each console through a recording 2D context, once as shipped and once with `work` deleted from the cast member — which is exactly the state the first repair left behind:

```
fabricator  work=set (as shipped)          fixtures=none
fabricator  work=ABSENT (repair reverted)  fixtures=/0 \/ 8/ /0 \/ 3/
     drew: … FILES CHANGED | 0 / 8 | COMMITS | 0 / 3 | BRANCH | claude/virgil-mobile-v11 …
prover      work=set (as shipped)          fixtures=none
prover      work=ABSENT (repair reverted)  fixtures=/14 required/
     drew: … PASSED | 0 | FAILED | 0 | SKIPPED | 0 | OF | 14 required
keeper      work=set (as shipped)          fixtures=none
keeper      work=ABSENT (repair reverted)  fixtures=/EVIDENCE LOCKED/
     drew: … SOURCES | EVIDENCE LOCKED · 5 LINKS | MAY NOT | CHANGE THE FILES
```

So the property holds, and the test that guards it is not decorative: it fails on the exact revert, on the right console, for the right reason. `KP3-10` is closed with it — the bare digit `'8'` is gone and the patterns are whole tokens.

### KP3-02 — closed on both sides.

`netlify/functions/state.mjs:279-297` validates `candidate` fully: object or `null`, no stray key beyond `{sha, shortSha, state}`, a 40-hex `sha`, a 7-to-12-hex `shortSha`, and `state` either `null` or one of the fifteen. `liveState.ts:78-82` adds `candidateStateOf`, which imports `constitution/authority.json` rather than retyping it, and `liveState.ts:349` uses it in place of the bare cast.

Measured, on the previous reviewer's own probe and more:

```
candidate.state "APPROVED BY THE OWNER" -> null        (was: printed on the slab)
candidate.state 42 / true / {} / []      -> null
candidate.state "safe_to_merge"          -> null       (case is not forgiven)
candidate.state each of the fifteen      -> kept, exactly
candidate {state:"MERGED"} with no sha   -> null on the page; refused on the wire
```

A test also holds the fifteen written out in `state.mjs` against `authority.json`, by exact set equality of the four-space-indented list; I ran that extraction independently and it returns exactly the fifteen. If a sixteenth were added to the constitution and not to the function, the set comparison fails loudly rather than passing over a short list.

### KP3-04 — closed.

`apps/mission-control/test/live-state-v11.test.ts:254-257` asserts the function's source contains `const wrong = shapeComplaint(report);` and `if (wrong) return { report: null, reason:`. Both strings are present verbatim at `state.mjs:474-475`. Deleting the call site now fails the suite. This is a source-text assertion rather than an execution one, which is the idiom this file already uses, and I judge it adequate for what it guards.

---

## The generated drift test: does it fail when the wire check is loosened?

Yes, and I did not take that on the code's word. I copied `netlify/functions/state.mjs` into the scratchpad, produced fourteen loosened variants by machine, and ran the test's own generator — the same `positions`, `withValueAt`, `COMPLETE` and 53-value `BATTERY` — against each, paired against the real `SessionStatusReport`.

Baseline at `898b7d0`: **1,431 cases, 0 disagreements**; unknown-key test 5 cases, 0 disagreements. That reproduces the count the code claims.

| Loosening | Disagreements found | Caught? |
|---|---|---|
| `reportedAt` back to any non-empty string | 38 | yes |
| the whole `candidate` block deleted | 208 | yes |
| `candidate.state` vocabulary check deleted | 50 | yes |
| top-level stray-key check deleted | 0 main / **1 unknown-key** | yes, by the second test |
| `recordPath` back to `isString` | 12 | yes |
| `note` check deleted | 102 | yes |
| `review.findings`/`blocking` counts unchecked | 100 | yes |
| `hop.at` unchecked | 100 | yes |
| required-keys loop deleted | 0 / 0 | **equivalent mutant** — see below |
| `architect` dropped from `HOLDER_ROLES` | 1 | yes |
| hop stray-key check deleted | 0 main / **2 unknown-key** | yes, by the second test |
| review stray-key check deleted | 0 main / **1 unknown-key** | yes, by the second test |
| schema-version check deleted | 53 | yes |
| `candidate.sha`/`shortSha` checks deleted | 106 | yes |

Thirteen of fourteen are caught. The fourteenth is not a miss: with the required-keys loop removed, a deleted `candidate`, `holder`, `hops`, `review` or `note` is still refused by the check immediately below it, so behaviour is unchanged and *no* disagreement is the correct answer. The generator is right about it.

Two further things worth recording. **The second test is load-bearing, not ornamental** — three of the fourteen loosenings are caught only by the unknown-key pass, so deleting it would blind the pairing to every `.strict()` gap. And **the `holder` divergence the previous review named is closed in the direction that mattered**: `HOLDER_ROLES` is now the whole cast, held against `constitution/permission-matrix.json` by a test, and `architect` is accepted by both sides.

**Is the claim accurate or overstated?** Accurate. The code says *"It is not a proof of equivalence either — it tests the values it generates"* and *"A divergence over a value nobody thought to put in the battery would still pass."* I went looking for such divergences and found two:

```
reportedAt "2026-02-30T00:00:00Z"   wire ACCEPTS, schema refuses
review.findings 2**53               wire ACCEPTS, schema refuses
```

Neither is exploitable in any way I can construct — an impossible calendar date rolls forward to 2 March, and a findings count of 2^53 draws a large number in a counter. I record them not as a defect but as the evidence that the disclaimer is true, and as the reason the disclaimer must stay attached to the number. Recorded as `KP4-09`.

I also confirmed that this is a real defence and not a paper one by the fact that it found something nobody was looking for. `content.active` carried the report's raw role word into a position where `screens/v11/screens.ts:429`, `:768`, `windowContent.ts:261` and `windowContent.ts:1485` all compare against `Fabricator`/`Prover`/`Keeper`. The slab drew `KEEPER` and the action beneath it fell through the default at `windowContent.ts:1490` to *"Go to the Fabricator"* and went there. I reproduced both halves in source and the repair by measurement:

```
holder "fabricator"|"prover"|"keeper" -> "Fabricator"|"Prover"|"Keeper"
holder "architect"|"arbiter"|"virgil"|"security-sentinel"|null -> null
holder "Fabricator" (already capitalised) -> null
holder 42 -> null
```

That is a genuine interface-contradiction defect, found and fixed inside the repair, and the loss it creates is written down in `docs/architecture/ENFORCEMENT_BOUNDARIES.md` rather than in a comment. Credit where it is due.

---

## `NEGATIVE_FRAMES`: a legitimate derivation, judged on the merits

`CLAUDE.md` forbids weakening a check to make it pass, and the honest question is whether shortening a wait from 90 frames to 12 because a CI job timed out is that. I put the case against it first: the observation window for *"the first tap opens nothing"* is now an eighth of what it was, and the reason it changed was cost.

Four things decide it the other way, and I verified each rather than reading them.

**1. The assertion is unchanged; only the window is.** `bothTaps` still requires `first.panels === 0`, `first.movedAt >= 0`, `second.openedAt >= 0` and `second.focus === 'virgil'`. Nothing asserted is relaxed.

**2. The regression this guards is caught at frame 0 regardless of the budget.** `tapAndWatch` breaks the loop the moment `openedAt >= 0`. If the first tap opened a record, the loop exits immediately and `settled.panels` is 1, so the failure fires whatever `budgetFrames` is. The shortened budget can only miss an opening *delayed beyond twelve rendered frames*, and nothing in this product opens a panel on a timer. The 90-frame budget bought coverage of a defect class that does not exist, at a price of twenty minutes per run.

**3. The unit is right.** `frames(page, 1)` is a `requestAnimationFrame` await (`verify-owner-build-v11.ts:195-208`). Twelve frames is twelve rendered frames on any machine — here 17.6 s at the measured 1,469 ms period, and roughly 80 s on a runner at the quoted 6,678 ms. A slower machine is given proportionally more wall-clock grace, which is the property the file already established for `WAIT_FRAMES` under `K11-04`.

**4. The derivation is checked, and the corrected claim is the true one.** I ran the motion tail myself and read its own instrumentation:

```
motion (portrait 390): default — camera at 3329 ms (frame 0), 0 record(s) after the
first tap, record at 3540 ms (frame 0) on the second; reduced — camera at 3185 ms
(frame 0), 0 record(s) after the first tap, record at 3539 ms (frame 0) on the second.
```

Every positive event, both motion settings, **frame 0** — in a container where a frame is 1,469 ms. So `18ff2fd`'s arithmetic (3,329 ÷ 1,469 ≈ 2.3 frames, ×4 ≈ 12) was indeed wrong about what those milliseconds are, and `898b7d0`'s correction — that they are Playwright's move/down/up round-trip before the first sample, and the frame figure is 0 — is what my own run shows. **A commit that corrects its predecessor's justification when the instrumentation contradicts it is the behaviour this repository's rules exist to produce, and I record it as such.** The margin at `verify-owner-build-v11.ts:1231-1236` fails the run if any positive ever reaches four frames, it scales correctly if the budget is shortened again, and `required-checks-v11.test.ts:209-221` fails if the margin is deleted.

**Judgment: this is a narrowing with compensation, disclosed with its derivation and guarded by a check that fails when the derivation stops holding. It is not the prohibited act.** One fault stands, recorded as `KP4-10`: the margin is computed from `first.movedFrame` and `second.openedFrame`, neither of which is the event being proved absent, and the comment treats them as interchangeable with it. That is an inference by analogy stated as a measurement.

---

## New findings

### KP4-01 — `required-checks.test.ts` still misses an ignore pattern that contains no `/`. `paths-ignore: ['**']` — skip every check on every push — passes the test titled *"ignores no path that any check actually reads"*.

**Severity: major. Non-blocking.** `apps/mission-control/test/required-checks.test.ts:176-208`.

The rewrite is a real improvement and I want to be exact about how much. I replicated the test's extraction and assertion and ran fourteen forms of `paths-ignore` through it:

```
CAUGHT   quoted 6-space  - 'docs/**'          CAUGHT   constitution/**
CAUGHT   unquoted        - docs/**            CAUGHT   schemas/**
CAUGHT   double-quoted   - "docs/**"          CAUGHT   .github/**
CAUGHT   flow sequence   ['docs/**', …]       CAUGHT   'apps/*'
CAUGHT   4-space indent  - 'apps/**'          CAUGHT   tab indent
CAUGHT   ['apps/**', 'packages/**']           CAUGHT   [ apps/** ]
CAUGHT   - '**/*.md'
MISSED   paths-ignore: ['**']          ← ignores every path there is
MISSED   paths-ignore: ['*']
MISSED   paths-ignore: ['CLAUDE.md']
```

All five forms `KP3-03` named are caught, and the deleted `apps/**` and `packages/**` assertions are restored as `never` entries. Rewriting `on:` as `"on":` fails the test closed at `expect(onAt).toBeGreaterThan(-1)`, which is the right direction.

The residual is the extraction: `/['"]?([A-Za-z_.*][\w./*-]*\/[\w./*-]*)['"]?/g` requires a `/`, so a pattern without one is never extracted and never reaches the assertion. The guard written for exactly this case — `pattern.startsWith('**')` — is therefore **unreachable for the bare `**`**, which is the single most damaging value the field can take. That is the recurring shape this review series exists about: a rule written, a guard beside it, and no path by which the guard can fire.

Two mitigating facts, stated so the finding is not read as larger than it is. The workflow has no `paths-ignore` at all today, so the loop body executes zero times against the real file and this is a regression guard rather than a live defect. And `branches-ignore` is outside the title's subject, though `branches-ignore: ['claude/**']` also passes and would stop the gate on the working branch.

The fix is one clause: extract tokens with no `/` as well, and treat `*` and `**` as top segments.

### KP4-02 — this is the third repair-and-re-review cycle on one candidate lineage. `authority.json` allows two, with an owner decision, and no owner decision authorising a second or third round is on record.

**Severity: major. Non-blocking on the artifact; decisive for what happens next.** `constitution/REPAIR_LIMITS.md`; `constitution/authority.json` `repairLimits`; `constitution/AUTHORITY_TIERS.md` *Ratchet*.

The count is not in dispute: review on `5b96763` → repair → review on `1185034` → repair → this review on `898b7d0`. That is cycle three. `authority.json` records `maxCyclesWithoutOwner: 1`, `maxCyclesWithOwner: 2`, `beyondLimit: "OWNER_DECISION_REQUIRED"`, and lists `additional_repair_or_rereview_round` in both `TIER_3.permittedActions` and `ownerOnlyActions`. `REPAIR_LIMITS.md` *No loop*: *"Retrying after a bounded failure, or a second open-PR repair round, is a Tier 3 owner decision. Autonomy ratchets down after failure."*

I searched `docs/decisions/OD-*` and `docs/process/` for such a decision. The only candidate authority is `docs/process/OWNER_GRANT_2026-09-09-overnight.md`, which grants *"continuing the following phases unattended — repairing what the Keeper finds"*. Three things about it are relevant and none of them is mine to resolve: it is dated the day before Phase 2 was authorised; it names a different frozen candidate, `de3c7d8b2a51af58fd1a4bc2a01e80632a623d29`; and it states no expiry, where `AUTHORITY_TIERS.md` requires every grant to state *"the tier, the permitted actions, the file or repository boundary, the expiry, and the stop conditions."*

Nothing enforces this. `packages/gate-engine` computes repair-cycle count from evidence objects, and no evidence object for this run is produced by anything; the limit is presently held by prose in a file the sessions themselves read. That is the same enforcement gap the `KR-` series records for other rules, and it is why this is worth a finding rather than an aside.

`CLAUDE.md` says a session that finds a contradiction reports it and does not resolve it silently. I report it. Under `authority.json` the correct state for this run is `OWNER_DECISION_REQUIRED`, and no session may open a fourth round on its own authority.

### KP4-03 — when the wire check refuses a report, the page says *"No session has written a report"* and then prints the reason it was refused, in the same sentence.

**Severity: minor.** `apps/mission-control/src/world/mobile/MobileRoom.tsx:823-826`; `netlify/functions/state.mjs:474-475`.

The three-way branch tests `sessionReport && reportIsCurrent(...)`, then `sessionReport`, then falls through. A refused report arrives as `sessionReport: null` with `sessionReportReason` set, so the fall-through renders:

> No session has written a report, so nobody is shown working. `.virgil/state.json` carries a note that is not one sentence of readable text.

A session *did* write one. The first clause is false and the second corrects it in the same breath. This is the mildest possible form of the fault this project treats as fatal — two statements about one fact — and the correction is adjacent, which is why it is minor and not more. A fourth branch on `sessionReportReason` costs one line.

### KP4-04 — the prose says who is working comes from the agents' own report whenever the report is fresh; the room applies a branch test the prose does not.

**Severity: minor.** `apps/mission-control/src/world/mobile/MobileRoom.tsx:802-813`; `apps/mission-control/src/world/live/liveState.ts:238-243`.

`stateFromAnswer` drops a report whose `branch` is not the answer's branch, so the room draws nobody working. The prose branch above tests freshness only. A fresh report naming another branch therefore produces *"Who is working comes from the agents' own report in `.virgil/state.json` … That is their word for it"* over a room in which nobody is working. This is the previous review's CASE D surfacing one layer up: the room was repaired for it and the paragraph beside the room was not.

### KP4-05 — the reason given in the code for validating the timestamp is false about the client it names.

**Severity: minor.** `netlify/functions/state.mjs:245-250`; `apps/mission-control/src/world/live/liveState.ts:134-140`.

The comment justifying `isInstant` reads: *"`liveState.ts` decides from `reportedAt` whether the report is still current, and any other string parses to `NaN` — which compares false against every threshold and so reads as fresh, not as unreadable."*

`reportIsCurrent` opens with `if (Number.isNaN(at)) return false;`, added at `cba14f1`, long before this comment was written. And even without that guard, `now - at <= REPORT_GOES_COLD_MS` with `NaN` is `false`, which is *not current* — the opposite of what the comment says. The check itself is correct and agrees with the schema; only its stated reason is wrong. I raise it because in this repository a comment asserting a defect that does not exist is the same species of artefact as a comment asserting a guard that does not exist, and both mislead the next reader.

### KP4-06 — the *"both sides refuse it"* principle stated for `candidate` is applied to one field. `stateFromAnswer` iterates `report.hops` unguarded and throws when it is not an array.

**Severity: minor.** `apps/mission-control/src/world/live/liveState.ts:276`; `netlify/functions/state.mjs:474`, `:522`, `:590`.

(a) The repair's own rationale is *"The client refuses it now as well; both refuse it, because one of them being enough is what was assumed last time."* Reproduced: a report with no `hops` key produces `TypeError: report.hops is not iterable` at `liveState.ts:276`. The wire check refuses that report today, so the throw is unreachable through the deployed function; it is reachable if the function and the page ever ship from different commits, which they can, being separate artefacts on the same deploy. `useLive` wraps the call in `try/catch` at `liveState.ts:376-397`, so the failure degrades to `state: null` plus the error line rather than a blank page. That containment is why this is minor.

(b) `KP3-04`'s repair asserts one link of a three-link chain. Nothing asserts `handler` calls `readSessionReport` (`state.mjs:522`) or that its result reaches `sessionReport` (`state.mjs:590`). Both are present in source. I record the residual so it is not discovered a fourth time.

### KP4-07 — titles that assert more than their bodies check, in tests added by this repair.

**Severity: minor.** Three instances.

(a) `required-checks.test.ts:210-225`, *"would catch an ignore list written any of the ordinary ways"*. The body runs the extraction regex over five YAML forms and asserts only `found.length > 0`. It never runs the `never.has(top)` assertion, so it proves extraction and not catching, and it would still pass if `apps` and `packages` were removed from the `never` set — the exact deletion `KP3-03` was raised about. Two lines would close it: assert the top segment is in `never` as well.

(b) `screen-content-v11.test.ts:622`, *"every word in a candidate-state position is one of the fifteen, or none"*, still iterates `demoAt` beats only. The live half is now genuinely covered, in `live-state-v11.test.ts`, so the property holds — but the title at this location claims a universal that this body does not check, which is what the previous review said about this same block.

(c) `screen-content-v11.test.ts:216`, the `FIXTURES` list includes `/NON-BLOCKING PERSIST/`. That string is in `screens/stationScreen.ts:811` and is not reachable from `drawConsoleScreen`, so that entry can never fire through this harness. Harmless, and worth deleting so that a reader does not count it as coverage.

### KP4-08 — `.virgil/state.json` and the script that writes it are validated by nothing, and the script can emit a report the wire refuses.

**Severity: minor. New surface — neither previous review covered `scripts/virgil-status.mjs`.**

The script validates `--holder` and `--activity` and does not bound `--note`. The wire check and the schema both cap `note` at 300 characters, so `--note` with a longer sentence produces a committed report that the deployed function refuses, and the room falls to the state described in `KP4-03`. No test parses the committed `.virgil/state.json` against `SessionStatusReport` or `shapeComplaint`; I did, and at this SHA it is accepted by both, with a 90-character note. The gap is that nothing would say so if it were not.

### KP4-09 — the generated pairing has divergences outside its battery, exactly as it says it does.

**Severity: minor, recorded for completeness rather than as a fault.** `netlify/functions/state.mjs:245-256`, `:305-307`; `packages/agent-contracts/src/live.ts`.

```
reportedAt "2026-02-30T00:00:00Z"   wire ACCEPTS, schema refuses
review.findings 2**53               wire ACCEPTS, schema refuses
```

Neither is exploitable in any construction I could make. They belong in the record because they are the proof that *"not a proof of equivalence"* is a true statement about this test and not a ritual disclaimer, and because a future session must not delete that sentence on the ground that 1,431 cases pass.

### KP4-10 — the margin that justifies the negative budget is measured on two events, neither of which is the event being proved absent.

**Severity: minor.** `apps/mission-control/e2e/verify-owner-build-v11.ts:1221-1236`.

`worst = Math.max(second.openedFrame, first.movedFrame)` — a record opening on the *second* tap and a camera move on the first. The thing the budget must be long enough to observe is a record opening on the *first* tap, which by design never happens and therefore cannot be timed. The comment states the substitution as if the three were interchangeable: *"An opening and a camera move have been seen on frame 0 of every tap on every machine this has run on."* They have, and I measured it here; but the inference from those two to the third is by analogy, and the comment should say so. This does not change my judgment that the change is legitimate.

---

## Carried forward, each checked at this SHA

`.github/workflows/instruct.yml`, `netlify/functions/instruct.mjs`, `netlify.toml`, `apps/mission-control/package.json`, `turbo.json`, `vite.owner.config.ts` and `gzipPayloads.ts` are untouched by the diff `1185034..898b7d0`, which is ten files: `.virgil/state.json`, `e2e/verify-owner-build-v11.ts`, `src/world/live/liveState.ts`, four test files, `docs/architecture/ENFORCEMENT_BOUNDARIES.md`, `docs/process/V11_KEEPER_REVIEW_PHASE2_REREVIEW.md` and `netlify/functions/state.mjs`.

| | Status at `898b7d0` | Evidence |
|---|---|---|
| **KP2-06** unsanitised `inputs.branch` | **Open, unchanged.** Its backstop is still absent — see `KP3-06` below | file unchanged |
| **KP2-07** endpoint fails open on the runs query | **Open, unchanged.** | file unchanged |
| **KP2-08** `/api/state` unauthenticated | **Open, unchanged.** `handler` checks no secret, no method, no origin | re-read at `state.mjs:490-500` |
| **KP2-09** no verification of the hosted build | **Open, unchanged.** `build:web` appears in `apps/mission-control/package.json:12` and `netlify.toml:14` and in no turbo task, no `pnpm check`, no CI step | grepped all four |
| **KP2-10** `__LIVE__` does not remove the instruct client | **Open, unchanged.** In the freshly built `v11-s4-virgil-898b7d0af6.html`: `/api/instruct` ×1, `x-virgil-secret` ×1, `virgil.instruct.secret` ×1, *"This starts a real session on the working branch"* ×2, `/api/state` ×0 | artifact grep |
| **KP2-11** the agent step is bounded by prose | **Open, and still worse than written.** See `KP3-06` | file unchanged |
| **KP2-12**, **KP2-15**–**KP2-19** | **Open, unchanged.** None touched by the diff | — |
| **KP2-13** | **Open.** See `KP3-12` | — |
| **KP2-14** `__LIVE__` undefined in the V10 build | **Open, and still latent.** `vite.owner.config.ts` defines no `__LIVE__`; the three configs that do are `vite.config.ts`, `vite.owner.v11.config.ts` and `vite.web.config.ts`. The V10 artifact is clean of `/api/state`, `/api/instruct`, `x-virgil-secret` and `virgil.instruct.secret` | grep of both |
| **KP2-20** | **Does not recur.** | — |
| **KP3-06** `main` unprotected, no required checks | **Open. Re-measured, not carried.** `GET /repos/…/branches/main` → `protected: false`, `required_status_checks.enforcement_level: "off"`, `contexts: []`, `checks: []` | GitHub API |
| **KP3-07** private repository, unauthenticated read | **Open. Re-measured.** `private: true`, `visibility: private` | GitHub API |
| **KP3-08** `__LIVE__` value asserted by no unit test | **Open, unchanged.** | grepped |
| **KP3-09** `note` unvalidated on the wire | **Closed.** `state.mjs:305-307` bounds it at 300 characters and requires string or `null`, agreeing with the schema across the generated cases | mutation M6 caught, 102 disagreements |
| **KP3-10** bare digit `'8'` as a fixture token | **Closed.** Replaced by whole-token patterns; see `KP4-07`(c) for the one dead entry | rendering probe |
| **KP3-11** the head commit is the session writing a claim about itself | **Open, unchanged in kind.** `.virgil/state.json` at this SHA sets `holder: "fabricator"`, the fabricator hop to `REPORTED`, and the note *"KP3-01 to KP3-05 repaired; the wire check now agrees with the schema over generated cases."* The room labels it as their word at `MobileRoom.tsx:802-813`, so I do not call it a lie. It remains true that every depiction of an agent in the live room is a session's own word about itself, and that the commit under review contains a builder's success report drawn as agent state | file read |
| **KP3-12** the stale byte figure | **Open, unchanged.** Clean build measures **8,528,896**; `assets/gzipPayloads.ts:14`, `live/liveState.ts:21`, `owner-build/gzip-payloads.mjs:13` and `packages/agent-contracts/src/index.ts:61` still state `8,528,318`. `screens/v11/recorded.ts:24`, `screens/v11/content.ts:129` and `test/owner-build-v11.test.ts:213` quote it historically, which is a different thing and is fine | measured |
| **KP3-13** CI incomplete | **Closed.** Run `34484567245` concluded `success`; sixteen check runs on the SHA, none in progress | GitHub API |

---

## What I could not check, named rather than inferred

The second review was right that this container reaches GitHub, and I used it. Two things it could not reach, and I state the reason rather than the conclusion.

- **CI job logs.** `GET /actions/jobs/102895897211/logs` redirects to `productionresultssa11.blob.core.windows.net`, which the egress proxy denies at CONNECT. So the frame figures printed by the motion job on the hosted runner are not readable from here. **I did not need them**: I ran the motion tail myself and read its own instrumentation, and that is what the `NEGATIVE_FRAMES` section rests on. The specific claim that a frame on a GitHub runner is 6,678 ms remains unverified by me.
- **The deployed site.** `https://extraordinary-toffee-49333a.netlify.app/` and `/api/state` both fail with `CONNECT tunnel failed, response 403` from the proxy. So whether `KP2-08`'s exposure is live, and whether Netlify site protection stands in front of it, is still unknown to me as it was to both previous reviewers. `docs/process/PHASE_2_SLICE_3_BRIEF.md:36` already says site protection would not be the right answer in any case.
- **Token scopes, and whether the three secrets exist.** Unchanged and unchecked. `INSUFFICIENT_EVIDENCE` on those points specifically.
- **That `docs/process/V11_KEEPER_REVIEW_PHASE2_REREVIEW.md` is verbatim.** Nothing in this repository holds an independent copy of what that reviewer returned, so the word *verbatim* at its head rests on the filing session's honesty and on nothing else. That is a structural gap, not an accusation: the wire check now validates `review.recordPath` and `review.recordCommit` on a session's report while the content of the record those fields point at is checked by nobody. It applies to this report too, and the owner should know that when he reads it.

---

## Is the candidate safe to merge?

**The artifact is sound.** No blocking finding stands against `898b7d0`. Both blocking findings of the previous round are closed by reproduction, not by assertion; the deterministic checks pass here with the cache forced off; and CI is complete and green on the SHA for the first time in this series. On the question a Keeper is asked — is there a proven defect in this candidate that fails an acceptance criterion — the answer is no, and the verdict is `PASS_WITH_NON_BLOCKING_FINDINGS`.

**Safe to merge is not mine to confer, and three things belong in the owner's hand before he confers it.**

1. **`KP4-02`.** This is the third cycle where the constitution allows two with an owner decision, and no such decision is on record. Under `authority.json` the run's state is `OWNER_DECISION_REQUIRED`. No session may open a fourth round on its own authority, and if the owner wishes this branch to continue, that is a Tier 3 decision he makes rather than one a session infers from a standing grant that named a different SHA and set no expiry.
2. **`KP2-08` with `KP3-07`.** Merging this puts an unauthenticated read of a private repository's branch, head commit, check results, pull-request identity and full session report into `main`. Two reviewers have rated that major and I do not upgrade it silently — it is outside the diff, outside the repair scope, and its live impact is something none of the three of us could measure. But the owner should merge it knowing what it is rather than as a carried line item.
3. **`KP3-06`.** `main` has no branch protection and no required status checks. Every green tick on this pull request is advisory. The gate that `apps/mission-control/test/required-checks.test.ts` is named for — *"the gate runs in full before anything can merge"* — describes the arrangement of a file and not the configuration of the repository, and only the owner can make the second true.

On the pattern the brief asked me to watch for — a rule written, a comment claiming enforcement, and no enforcement — I found it once more in the code, at `KP4-01`, where the guard against `**` cannot fire on the bare form; once in a comment, at `KP4-05`, where a stated reason is false about the file it names; and once at the level of the run itself, at `KP4-02`, where the repair limit is held by prose in a document the sessions read about themselves. But it is markedly less than in either previous round, and the two repairs I was sent to distrust are the two I found closed by construction. That is worth saying plainly, because a reviewer who reports only faults teaches nothing about which repairs worked.

I raise no finding I could not reproduce, and I have filled no gap with assumption.

**Verdict: `PASS_WITH_NON_BLOCKING_FINDINGS` on `898b7d0af689783b650280e30a4cc3798101968c`.**
**Blocking findings: none.** `KP3-01`, `KP3-02`, `KP3-04`, `KP3-09`, `KP3-10` and `KP3-13` are closed and I record them as closed. `KP3-03` and `KP3-05` are closed as raised, with residuals at `KP4-01` and `KP4-09`. `KP3-06`, `KP3-07`, `KP3-08`, `KP3-11`, `KP3-12` and `KP2-06` through `KP2-19` remain open, unrepaired and correctly not claimed as fixed. New findings `KP4-01` through `KP4-10`, of which `KP4-01` and `KP4-02` are major and none blocks.

---

Files that matter most, all absolute:

- `/home/user/Virgil-mission-control/apps/mission-control/src/world/live/liveState.ts` (lines 78-82, 105-109, 134-140, 265-269, 276, 331, 349)
- `/home/user/Virgil-mission-control/netlify/functions/state.mjs` (lines 245-256, 279-297, 305-307, 474-475, 490-500, 522, 590)
- `/home/user/Virgil-mission-control/apps/mission-control/e2e/verify-owner-build-v11.ts` (lines 195-208, 239-268, 1221-1236)
- `/home/user/Virgil-mission-control/apps/mission-control/test/required-checks.test.ts` (lines 176-225)
- `/home/user/Virgil-mission-control/apps/mission-control/test/required-checks-v11.test.ts` (lines 197-221)
- `/home/user/Virgil-mission-control/apps/mission-control/test/live-state-v11.test.ts` (lines 254-275, 448-741)
- `/home/user/Virgil-mission-control/apps/mission-control/test/screen-content-v11.test.ts` (lines 162-299, 622-631)
- `/home/user/Virgil-mission-control/apps/mission-control/src/world/mobile/MobileRoom.tsx` (lines 797-828)
- `/home/user/Virgil-mission-control/apps/mission-control/src/world/window/windowContent.ts` (lines 260-263, 1485-1497)
- `/home/user/Virgil-mission-control/scripts/virgil-status.mjs`
- `/home/user/Virgil-mission-control/docs/architecture/ENFORCEMENT_BOUNDARIES.md` (the new section at the foot)
- `/home/user/Virgil-mission-control/constitution/REPAIR_LIMITS.md` and `/home/user/Virgil-mission-control/constitution/authority.json` (`repairLimits`)
- `/home/user/Virgil-mission-control/docs/process/OWNER_GRANT_2026-09-09-overnight.md`
- `/home/user/Virgil-mission-control/docs/process/V11_KEEPER_REVIEW_PHASE2_REREVIEW.md` and `/home/user/Virgil-mission-control/docs/process/V11_KEEPER_REVIEW_PHASE2.md` (the two previous reviews)
