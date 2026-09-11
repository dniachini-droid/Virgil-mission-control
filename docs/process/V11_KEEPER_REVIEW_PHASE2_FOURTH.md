# Fourth Keeper review — Phase 2 slices one, two and three, candidate `f7e90ac`

**This file is the Keeper's report reproduced verbatim.** Everything below the rule is the reviewer's own text, word for word, as it asked at its head. Nothing has been condensed, reordered, softened, renumbered or reframed. This heading and the two paragraphs under it are the filing session's, and are the only words in this file that are not the Keeper's.

The reviewer's own note applies to this file as much as to the three before it: nothing in this repository holds an independent copy of what it returned, so the word *verbatim* rests on the filing session's honesty and on nothing else. It records that itself, and says the owner should read it knowing so.

Filed by the session that built the candidate. **Verdict: `BLOCKED`.** The blocking finding, `KP5-01`, is a defect this session created and pushed without running the check that catches it: the decision record `OD-0012` carries `/api/state` in its filename and title, that reaches the Owner Build through the seed graph, and the artifact grep added this same round — correctly — refuses it. `OD-0011` expires with this verdict and authorises no repair of it.

---

# Fourth Keeper review — Phase 2 slices one, two and three, candidate `f7e90ac`

**Candidate:** `f7e90ac1ee5f18e52de07765d6841d1fa62b2c98`, on `claude/virgil-mobile-v11`, head of pull request #8 into `main` *at the time this review began*.
**Base:** `main` = `90b116ca69b5294fd479998ae0d70429bf84c836`.
**Round under review:** the fourth repair, `1c803b1..f7e90ac` (four commits: `45a41c2`, `6c69a7b`, `a8cada7`, `0bdcaf8`, `f7e90ac`).
**Previous verdicts:** `BLOCKED` on `5b96763` (`KP2-01`–`KP2-20`), `BLOCKED` on `1185034` (`KP3-01`–`KP3-13`), `PASS_WITH_NON_BLOCKING_FINDINGS` on `898b7d0` (`KP4-01`–`KP4-10`).
**Reviewed:** 11 September 2026. Finding prefix: **`KP5-`**.

> **Filing.** I ask that this be filed word for word, and that the file say at its head that it is the Keeper's report reproduced verbatim. If any word of it is changed, the file must not say "verbatim".

> **Independence.** Keeper, independent session. I built no part of this candidate and no part of any of the four repairs. No commit message, code comment, run record, decision record or prior review is used as evidence for any finding below; where I quote one it is as the thing under examination, not as proof of it. Every finding was reproduced from the code, from an artifact I built, from a mutation of a file copied outside the repository, from a browser I drove, or from GitHub's own API. I created and modified nothing under `/home/user/Virgil-mission-control`; `git status --porcelain` is empty at the end of this review as it was at the start. All probes are in the session scratchpad outside the repository. I note, without drawing a conclusion from it, that the scratchpad directory contained files left by an earlier session; I read none of them and used none of them.

---

## Verdict: `BLOCKED`

**A required check fails at the reviewed SHA.** `pnpm verify:owner:v11` exits 1 on `f7e90ac`, which means `pnpm check` fails, which means the pull request's full gate fails — and it did: three of the nine jobs on this SHA concluded `failure` on GitHub's own runners, at exactly the step my own run fails at.

The cause is the finest irony this series has produced, and it is a real defect rather than a curiosity. This round added a grep over the built V11 Owner Build that refuses four live-mode strings, one of which is `/api/state` — the right check for `KP2-10`. This same commit files `docs/decisions/OD-0012-api-state-stays-unauthenticated.md`, whose **filename and title contain the literal text `/api/state`**. The seed graph is regenerated to include that node, `spikes/mind/MindScene.tsx` imports the seed graph, and both Owner Builds therefore compile the string into the artifact. The new guard fires on a decision record's name.

That is `KP2-01`'s shape exactly: a commit that adds only a decision record, a regenerated graph and a status file breaks a required check, and was pushed without the check having been run. It is also, precisely, the coupling class `OD-0010` recorded as *lost* when V10's byte count was retired — a document reaching a build — surfacing here through a different detector.

Everything else in this round is better than that sentence makes it sound, and I want the record to be exact about it. **Fifteen of the eighteen findings this round set out to close are genuinely closed, and I confirmed the load-bearing ones by reverting or mutating and watching the check fail.** `KP2-06`, `KP2-07`, `KP2-12`, `KP2-15`, `KP2-17`, `KP2-19`, `KP3-08`, `KP3-12`, `KP4-01`, `KP4-03` through `KP4-08` and `KP4-10` are closed. `KP2-19` is closed on both halves — the policy is changed *and* the page is proven to run under it, which I established by mutation rather than by reading. `KP4-01` is closed by inversion rather than by adding cases, which is the right direction. `KP2-14` is reported rather than repaired, and I judge that honest, for reasons I give below.

But the round also **created** three defects while repairing: the blocking one above, a new wire/schema divergence of exactly the kind the repair it belongs to was closing, and a workflow step that will write `Run .` into the room. And the largest new surface — the hosted-build verifier — passes a page whose controls a person cannot press.

---

## SHA currency and preconditions, measured rather than assumed

| | Value |
|---|---|
| `git rev-parse f7e90ac` | `f7e90ac1ee5f18e52de07765d6841d1fa62b2c98` |
| `git ls-remote origin refs/heads/…v11` **at review start** | `f7e90ac1ee5f18e52de07765d6841d1fa62b2c98` |
| `git ls-remote origin refs/heads/…v11` **at review end** | `3d288523a52fb51c178a66c23a34226189fabeb7` |
| PR #8 `head.sha` at review end | `3d288523a52fb51c178a66c23a34226189fabeb7` |
| PR #8 | `open`, not draft, `mergeable: true`, `mergeable_state: **unstable**` |
| Repository | `private: true`, `visibility: private`, default branch `main` |
| `main` | `protected: false` |
| Working tree | clean at start and at finish; nothing written by me |
| Protected boundaries in `90b116c..f7e90ac` | `git diff --name-status 90b116c..f7e90ac -- constitution docs/product knowledge/raw 'schemas/gate-*'` returns nothing |
| `docs/decisions/` in the diff | `OD-0009`, `OD-0010`, `OD-0011`, `OD-0012` added — `ownerInstructedOnly`, not `sessionDenied`; recorded as touched, no finding on the path |

**The head moved off the reviewed SHA during this review**, for the third distinct time in this series. `3d28852` adds `OD-0013`, a regenerated seed graph and `.virgil/state.json`. `REVIEW_POLICY.md` *Staleness* applies: this verdict attaches to `f7e90ac` alone and does not transfer. It is recorded as `KP5-15`. Every measurement I cite below was taken while the checkout stood at `f7e90ac` — the artifacts I built are named `v10-s2-virgil-f7e90ac1ee.html` and `v11-s4-virgil-f7e90ac1ee.html`, which is how I know rather than how I assume — and I re-measured the blocking finding at the new head as well.

**The brief's claim about the last commit, checked rather than taken.** `git diff --stat 0bdcaf8..f7e90ac` is three files: `.virgil/state.json`, `docs/decisions/OD-0012-…md`, and `packages/test-fixtures/knowledge/seed-graph.json`. Confirmed. That is also the whole of the cause of the blocking finding.

**CI, read from the API.** Run `34563162414` (`pull_request`, `f7e90ac`): `V11 owner build and verify` **failed** at `portrait-390`, `portrait-430` and `landscape-844`, each at the step *"Verify the V11 Owner Build opens with no network"*; the remaining two jobs were cancelled by fail-fast; `lint, typecheck, tests`, `hosted build, read and refused`, `Mind Scan, V10 owner build and verify, committed digests` and `newest Owner Build rebuilds byte for byte` succeeded. The run's overall conclusion is `cancelled`. Run `34563156678` (`push`, same SHA) concluded **`success`**, because the expensive jobs are gated off pushes — so the branch's newest push run is green on a SHA whose full gate is red. That is the gate split working as designed and it is worth the owner knowing what it looks like.

I also checked the disclosed history rather than taking it: run `34539471347` on `a8cada7` failed at *"Verify the hosted build reads, and refuses honestly"*. The builder's account that the new verifier failed in CI once is corroborated by GitHub's record.

---

## Checks reproduced here

Every one executed in this container, none restored from cache. Cache status is stated because `KP2-01` was a false pass produced by turbo.

| Check | Result | Evidence |
|---|---|---|
| `pnpm lint` | pass | `biome check .`, 295 files, direct |
| `pnpm turbo run typecheck --force` | pass | **0 cached, 8 total** |
| `pnpm turbo run test --force --continue` | pass | **0 cached, 6 total**; mission-control 35 files / **1,617 tests**; 1,852 across the six packages |
| `pnpm turbo run build:owner --force` | pass | 0 cached; **8,529,445 bytes** |
| `pnpm turbo run build:owner:v11 --force` | pass | 0 cached; **7,364,049 bytes** |
| `pnpm turbo run verify:owner:v11 --force` | **FAIL, exit 1** | see `KP5-01`; full run, 4 viewports, frame period 3,676 ms here |
| `pnpm --filter mission-control build:web` | pass | 8,663 kB bundle |
| `pnpm --filter mission-control verify:web` | pass | frame 24 ms; 4 requests, 1 to `/api/state`; PASS |
| `pnpm --filter @virgil/knowledge-lint run lint` | pass | 86 nodes, 166 edges, 94 tethers intact, no findings |
| `pnpm --filter @virgil/agent-contracts export-schemas` | pass | no drift; `git status schemas/` clean |
| `pnpm --filter @virgil/knowledge-graph export-seed-graph` | pass | committed graph **fresh** at `f7e90ac`; hash `sha256:5e2b65d8…` |
| `pnpm verify:owner` (V10) | **not run here** | CI green on this SHA; I say which is which |

---

## Blocking finding

### KP5-01 — `verify:owner:v11` fails at the reviewed SHA. The guard this round added for `KP2-10` is fired by the name of the decision record this round filed.

**Severity: blocking.** `apps/mission-control/e2e/verify-owner-build-v11.ts:440-466`; `packages/test-fixtures/knowledge/seed-graph.json`; `apps/mission-control/src/spikes/mind/MindScene.tsx:3`; `docs/decisions/OD-0012-api-state-stays-unauthenticated.md`. Fails `REVIEW_POLICY.md` *What review requires*; `CLAUDE.md`'s required-check rule.

My own run, in full, at `f7e90ac`:

```
owner build v11 verify: … the artifact carries none of 4 live-mode strings at 97s
owner build v11 verify: FAILED
  the Owner Build carries the live-mode strings /api/state; __LIVE__ should have removed them
VERIFY_OWNER_V11_EXIT=1
```

And the verifier's own predicate, reproduced exactly against the artifact it reads:

```
artifact: v11-s4-virgil-f7e90ac1ee.html   present: ["/api/state"]
```

The chain, each link measured:

1. `OD-0012`'s node in the seed graph is `{id: "docs/decisions/OD-0012-api-state-stays-unauthenticated.md", title: "OD-0012 — \`/api/state\` stays unauthenticated (Tier 3)"}`. Both strings contain `/api/state`.
2. `MindScene.tsx:3` imports `@virgil/test-fixtures/knowledge/seed-graph.json`, so the graph is compiled into the bundle.
3. Both Owner Builds carry it. Grepping the two artifacts I built at `f7e90ac`: V10 `/api/state` ×1, V11 `/api/state` ×1, context in both is the `OD-0012` node literal.
4. The new block at `verify-owner-build-v11.ts` pushes a failure when any of `['/api/instruct','/api/state','x-virgil-secret','virgil.instruct.secret']` is present.

**The rest of `KP2-10` is genuinely closed, and the count separates the two facts.** In the V11 Owner Build: `/api/instruct` ×0, `x-virgil-secret` ×0, `virgil.instruct.secret` ×0, `__LIVE__` ×0 — where the third review measured one of each. The hosted bundle carries all three, as it must. The instruct client is gone from the file build by construction. The only string present is the one that arrived through a document.

**It persists at the current branch head.** I rebuilt at `3d28852`: `artifact: v11-s4-virgil-3d288523a5.html present: ["/api/state"]`. Measured, not inferred.

**A note on repair, offered as scope and not as a plan.** There are two honest shapes — change what the artifact carries (the decision record's *filename*, which need not contain a URL path; its title is quoted prose and is a separate question), or make the grep say what it means (it is looking for a fetch target, not for eight characters anywhere in seven megabytes of compiled documents). There is a third shape that would be the prohibited act: deleting `/api/state` from `mustBeAbsent`, or adding an exception for the seed graph, so that the check stops catching the thing it was written for. The three previous reviews in this series exist because that shape keeps being available. Whoever repairs this should say in the commit which of the three they chose and why.

---

## Major findings, none blocking

### KP5-02 — `press()` in the new verifier turns a page whose controls cannot be pressed into a `PASS`.

**Severity: major. Non-blocking — it is a weakness in a new check, not a defect in the product.** `apps/mission-control/e2e/verify-web-build.ts:232-247`.

The brief asked whether the fallback is a weakening and whether it is disclosed properly. **It is a weakening, and the disclosure is in the place a reader of the source sees rather than the place a reader of the result sees.**

I copied `dist/web` outside the repository, appended one CSS rule creating a full-viewport `body::after` at the top of the stacking order — a page on which a person can press nothing — and ran the verifier's own code against it:

```
web build verify: NOTE — .v11-badge would not take a real click inside the budget; the click was dispatched on the element instead.
web build verify: NOTE — .v11-talk would not take a real click inside the budget; the click was dispatched on the element instead.
web build verify: PASS — the page reads /api/state, names what it read, and when it reads nothing it says so and draws no recorded value.
EXIT=0
```

Three things about that.

**The `catch` is not narrowed to the failure it was written for.** `page.click` fails for element-not-visible, element-detached, element-outside-viewport and element-intercepts-pointer-events as readily as for a starved main thread. Every one of those is a real defect on a page the owner opens with his thumb, and every one of them now becomes an exit-0 pass.

**The NOTE asserts a cause the code cannot know.** *"would not take a real click inside the budget"* names slowness. In my run the cause was interception. Playwright's error text distinguishes them and the fallback discards it. In a repository whose recurring defect is a statement stronger than what backs it, a diagnostic that names one cause out of five is that defect in miniature.

**Nothing counts the fallbacks.** They are not added to `failures`, not counted, and not mentioned in the final PASS line. The file's justification — that hit-target size and position are measured by `verify-owner-build-v11.ts` at three viewports — is true of the *Owner Build*, which is a different artifact; nothing measures them on `dist/web`. The smallest honest change is one line: carry the fallback count into the PASS sentence, so a result that says PASS says what kind.

I record, equally plainly, that the fallback is disclosed in a doc comment that names the CI failure, its cause and the fact that the fallback is weaker. That is a great deal better than silence, and it is why this is major rather than blocking.

### KP5-03 — `verify:web` and `build:web` are wired into `pnpm check`, into turbo and into CI, and asserted by no test. `required-checks.test.ts` — the file that exists for exactly this failure — does not mention either.

**Severity: major. Non-blocking.** `apps/mission-control/test/required-checks.test.ts`; `package.json:12`; `turbo.json:50-57`; `.github/workflows/checks.yml:197-232`.

`grep -rn "verify:web\|build:web" --include=*.test.ts apps packages` returns **nothing**.

The file's own opening states the rule it exists to enforce: *"remove `verify:owner` from the root `check` script, break the turbo dependency that makes it build the artifact first, delete a step from the workflow, or add a `continue-on-error` to it, and `pnpm test` fails."* All four of those assertions exist for `verify:owner`. **None exists for `verify:web`.** The only thing holding the new check in place is the string `'hosted build, read and refused'` in the `gated` array, which asserts that a *job name* appears in the workflow and that every `if:` in the file is the permitted one. Delete `&& pnpm verify:web` from `package.json`, delete the `verify:web` turbo task, and delete the run step from the job — leaving the job name and its `if:` — and the suite still passes.

That is `KR-50`/`KR-59` again, on the check added to close `KP2-09`. The four assertions are two lines each.

### KP5-04 — the `KP4-09` repair closed two divergences and opened a third, in the opposite direction, which the generated battery cannot see.

**Severity: major. Non-blocking.** `netlify/functions/state.mjs:262-271`; `packages/agent-contracts/src/common.ts:11`; `apps/mission-control/test/live-state-v11.test.ts:658-719`.

The repair added a real-calendar test to `isInstant`:

```js
new Date(value).toISOString().slice(0, 10) ===
  `${value.slice(0, 4)}-${value.slice(5, 7)}-${value.slice(8, 10)}`
```

That compares a **UTC** date against the **local** date written in the string. Any legal ISO-8601 timestamp whose offset carries it across a UTC date boundary is now refused on the wire and accepted by the schema. Measured, both sides, against the committed report with only `reportedAt` varied:

```
reportedAt "2026-09-10T01:00:00+05:00"   wire REFUSES ("has no readable time on it.")   schema ACCEPTS
reportedAt "2026-09-10T23:00:00-05:00"   wire REFUSES                                    schema ACCEPTS
reportedAt "2026-09-10T12:00:00+05:00"   wire accepts                                    schema accepts
reportedAt "2026-02-30T00:00:00Z"        wire REFUSES                                    schema refuses   ← KP4-09, closed
```

`Timestamp` is `z.iso.datetime({ offset: true })`, so the schema accepts offsets by design.

**The pairing test cannot catch it.** Its 57-value battery contains exactly one offset, `'2026-09-10T06:00:00+00:00'`, whose UTC date never differs. 1,431 generated cases pass, and the divergence is outside them — which is the disclaimer `KP4-09` was recorded to protect, doing its work a second time, on a value the repair itself introduced.

**What it does on the owner's screen.** A report whose timestamp carries such an offset is refused, `sessionReportStatus` is `'refused'`, and the room says *"A session did write a report and this build refused it… `.virgil/state.json` has no readable time on it."* about a report that is correct. The exposure is bounded because `scripts/virgil-status.mjs` writes `new Date().toISOString()`, which is always `Z` — but the file is the one artefact in this system a human or a future tool may write by hand, and the wire is the thing that decides. Two lines of `Date.UTC` arithmetic close it; adding one date-shifting offset to the battery stops it recurring.

---

## Minor findings

### KP5-05 — the inverted ignore-list judgment permits any top-level directory not on a hand-written list. `netlify/**`, `.claude/**` and `.virgil/**` are read by tests and are not on it. The comment describes an algorithm the code does not implement.

`apps/mission-control/test/required-checks.test.ts:199-271`.

`KP4-01` is closed, and I want to be exact about how much. I extracted `ignoredPatternsIn`, `whyRefused`, `neverIgnorable` and `onBlockOf` verbatim from the test file by line range, ran them outside the repository over eighteen forms, and mutated the real `checks.yml` four ways:

```
REFUSED   paths-ignore: ['**']        REFUSED   branches-ignore: ['claude/**']
REFUSED   paths-ignore: ['*']         REFUSED   tags-ignore: ['v*']
REFUSED   paths-ignore: ['CLAUDE.md'] REFUSED   - '**/*.md'
REFUSED   - 'docs/**' (quoted, unquoted, double-quoted, flow, 4-space, tab)
REFUSED   - 'apps/**' / - 'packages/**'
PERMITTED - 'zz/**'          ← any directory not on the list
PERMITTED - './docs/**'      PERMITTED - '/apps/**'      PERMITTED - 'APPS/**'
NOTHING   paths: ['docs/**'] ← an allow-list is not an ignore list and is not examined
real checks.yml: 0 items, 0 refusals.   mutated with paths-ignore ['**']: refused.
```

All three forms `KP4-01` named are caught, `branches-ignore` is caught, and the real file has no ignore list, so the first test still iterates zero times against it. **Closed.**

The residual is that `whyRefused` permits by default. Its comment says the property is inverted — *"this takes every item of every ignore list and demands it be proven harmless… nothing is proven harmless except a pattern whose top segment is a directory no check reads"* — but the code asks the opposite question: it refuses only if the top segment is in `neverIgnorable()`, and permits anything unrecognised. The derived set is `{.github, apps, constitution, docs, knowledge, outputs, packages, raw, schemas, wiki}`. Directories that a check does read and that are not in it:

- `netlify/` — `live-state-v11.test.ts:49` and `instruct-v11.test.ts:17` read `netlify/functions/*.mjs`;
- `.claude/` — `permission-matrix.test.ts:4,14` and `od-decision-record-guard.test.ts:6`;
- `.virgil/` — `live-state-v11.test.ts:215,564`.

`paths-ignore: ['netlify/**']` passes this test and would take the gate off every change to the two functions the whole of slices two and three consist of. Narrower than `KP4-01` by a long way, and the same shape. One clause closes it: derive the set from what the test files actually read, or invert the default so an unrecognised top segment is refused, which is what the comment already claims.

The `paths:` allow-list is a second, equally complete way to disable the gate and is outside both the title and the body. It is worth a line in the same place.

### KP5-06 — `.github/workflows/instruct.yml`, step "Say that a session has started", uses `$RUN_ID` and declares no `env:`. The note committed to the room will read *"Run ."*

`.github/workflows/instruct.yml:120-135`.

`KP2-06` is closed and I verified it: no `run:` block contains `${{`, every value arrives through `env:`, all three pushes are `git push origin "HEAD:$TARGET"`, and the screening is an allow-list (`^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$`) ahead of `actions/checkout`. Six of the seven steps gained the `env:` block the conversion requires. This one did not:

```yaml
      - name: Say that a session has started
        run: |
          node scripts/virgil-status.mjs \
            --holder virgil --activity WORKING \
            --note "An unscoped session is working on the owner's instruction. It holds no work order and is not a Fabricator. Run $RUN_ID."
```

`RUN_ID` is unset in that step's environment, so the sentence the room draws ends *"Run ."* — a mechanism saying something it cannot support, in the note whose repair (`KP2-15`) was about exactly that. No test catches it: the new `expands no workflow expression inside any run block` test checks for `${{` and nothing checks that a `$VAR` used in a run block is declared in that step's `env:`. That second check is four lines and would have caught this one.

### KP5-07 — `KP2-16`'s repair is asserted by nothing.

`apps/mission-control/src/world/mobile/MobileRoom.tsx:809-824`.

The check counts are now drawn — I read them out of the built hosted page myself, in the branch where they are absent: *"The check results could not be read this time, so none are shown — not zero, which would be a different claim."* That sentence is good and the distinction it makes is the right one.

But `grep -rn "checks.total\|noResult\|still running\|returned no result"` over `apps/mission-control/test` and `e2e` returns nothing. No unit test renders the badge with `checks` present, and the new verifier supplies `checks: null`, so **only the negative branch has ever executed**. The one repair in this round with no executable guard is the one whose finding was *"the sentence names three things and the screen delivers two"*.

### KP5-08 — the new verifier never exercises the report states it was used to debug, never installs a secret, and the page's fall-through branch has stopped carrying the reason.

`apps/mission-control/e2e/verify-web-build.ts:72-91`; `apps/mission-control/src/world/mobile/MobileRoom.tsx:869-889`.

(a) `ANSWER` sets `sessionReport: null` with no `sessionReportStatus`, and the failure phase returns `ok: false`. So of the four statuses — `read`, `absent`, `unreadable`, `refused` — the verifier exercises `absent` alone. `KP4-03`'s repair, and the regression inside that repair which the builder self-reported, are both guarded by a source-text assertion (`page).toContain("sessionReportStatus === 'refused'")`) and not by the executable check that found the bug. The stub is already there; two more answers would cover all four.

(b) The verifier never writes `virgil.instruct.secret` into `localStorage`, so it never sees the hosted page in its configured state — which is the only state in which `KP2-03` ever manifested. The page it drives is the page of a device that cannot start anything.

(c) The fall-through branch is now `<>No session has written a report, so nobody is shown working.</>` and no longer prints `sessionReportReason`. When the status is present that is right. When it is absent — an older function in front of a newer page, which is exactly the hazard the `KP4-06` repair argues for in its own comment (*"the function and this page are separate artefacts that can ship from different commits"*) — a refused report renders as a flat false statement with nothing beside it to correct it. `KP4-03` was two statements about one fact, the first false; this is one statement about one fact, false, and it is a smaller thing but it is not obviously a better one. A `?? ''` on the reason costs nothing.

### KP5-09 — the verifier's progress line announces the negative it has just disproved.

`apps/mission-control/e2e/verify-owner-build-v11.ts:465`. From my own failing run:

```
owner build v11 verify: … the artifact carries none of 4 live-mode strings at 97s
…
owner build v11 verify: FAILED
  the Owner Build carries the live-mode strings /api/state
```

`mark(...)` is called unconditionally after `failures.push(...)`. The run still fails, so nothing is concealed from the exit code; but the log asserts the opposite of what the check found, in a file whose subject is statements stronger than their evidence. One `if` fixes it.

### KP5-10 — one wall-clock wait remains in the new verifier, and it is the first one; and the CSP is read as the first policy in the file rather than the effective one.

`apps/mission-control/e2e/verify-web-build.ts:51-60, 260-265`.

The brief asked whether any wait still describes this container rather than the product. **One does.** `page.waitForFunction(() => document.querySelectorAll('canvas').length > 0, undefined, { timeout: 120_000 })` runs *before* `framePeriodMs()` can be measured — it has to, since there is no page to time until the canvas exists — and it is a fixed two minutes. At the 6,678 ms frame quoted for the CI runner that is about eighteen frames; at the 3,676 ms this container reached under load it is thirty-three. Everything after it is derived correctly: `framePeriodMs()` times six `requestAnimationFrame` round trips with no named inner function (the `__name` trap is avoided, and the file says so), `budget = max(60_000, frame × 30)`, and `context.setDefaultTimeout(budget)`. The `waitForTimeout(250)` inside the `/api/state` poll is a poll interval bounded by that budget, not a sleep. So: the derivation is right, and the one wait that cannot use it is the one that would most plausibly fire on a slower machine — and when it fires it surfaces as a bare `TimeoutError` naming a line number, with no sentence saying what was being waited for.

I know it surfaces that way because I made it fire. Which answers the brief's other question: **yes, the CSP check really runs the page under the policy.** I served a copied build with `script-src 'none'` substituted into a copied `netlify.toml` and the verifier failed, exit 1, at that wait — the scripts were blocked and no canvas ever appeared. With `'unsafe-inline'` restored it refuses before launching a browser at all: `Error: netlify.toml allows script-src 'unsafe-inline' on the page that holds the instruct secret`. Both halves of `KP2-19` are closed and both are proven by mutation rather than by reading.

The residual: `/Content-Security-Policy\s*=\s*"([^"]+)"/.exec(...)` takes the **first** policy in `netlify.toml`. A second `[[headers]]` block for `/*` added later — the shape that has produced every ordering bug in this file, and which the file's own comment about redirect ordering warns about — would be invisible to this check while being the one the site sends.

### KP5-11 — *"a second hosted build cannot appear unnoticed"* is asserted over a hand-written list of four files.

`apps/mission-control/test/live-state-v11.test.ts:520-536`.

`KP3-08` is closed: the `__LIVE__` values are now asserted, `false` in `vite.config.ts`, `vite.owner.v11.config.ts` and `vitest.config.ts`, `true` in `vite.web.config.ts`, and absent from `vite.owner.config.ts`. I confirmed all five by reading the configs. The title of the second test claims a closure the body does not have: the list of four is written out in the test, not derived, so a sixth config with `__LIVE__: true`, or `vite.owner.config.ts` acquiring one, passes. A glob over `vite*.config.ts` is the same number of lines and makes the title true.

### KP5-12 — on the hosted page with the endpoint failing, one window says both *"No work has started."* and *"The work is still in progress."*, and a slab asserts *"The keeper has not finished its review yet."* from no data.

`apps/mission-control/src/world/window/windowContent.ts:1372, 1734`; `apps/mission-control/src/world/screens/v11/content.ts:287`. **Pre-existing, outside this diff, and covered by none of the three previous reviews.** I found it by reading the DOM of the built hosted artifact while the stubbed endpoint returned 500 — that is, by using this round's own new instrument.

The `.v11w-sheet` text, verbatim from my run, abridged only where marked:

> Back | Virgil | No work | **The keeper has not finished its review yet.** | … | **Nothing is being worked on** | No work is in progress and no agent has been given a task. | … | Good evening. **No work has started.** … | Your next decision | No decision is needed yet. **The work is still in progress.**

Over a notice reading *"This repository could not be read. the state endpoint answered 500."*

(a) *"The work is still in progress"* is the `else` of a verdict switch at `windowContent.ts:1372` and fires whenever there is no verdict and no gate — including when there is no work and nothing was read. It contradicts three other sentences in the same sheet.

(b) *"THE KEEPER HAS NOT FINISHED ITS REVIEW YET."* is a positive claim about a Keeper's activity, drawn when nothing about any Keeper was read. The doc comment eight lines above it names this exact family — *"the same family as the V7 defect the owner caught, when a slab read 'awaiting review' during a build"* — and the branch beneath it does it in live mode. In the recording the sentence is true; in live mode with an empty or failed answer it is a claim the page cannot support.

(c) The window's window also says *"the state endpoint answered 500"* with a lowercase opening after a full stop. Cosmetic, recorded because it is in the same sentence as the two above.

The new verifier passes all of this, correctly by its own terms — its `recorded` patterns are `0 / 8`, `0 / 3`, `14 required`, `EVIDENCE LOCKED` and `NON-BLOCKING`, none of which is in that text, and its disclosure that it cannot reach canvas values is accurate. But it is the first instrument this project has had that can read what the hosted page says, and the first thing I pointed it at was two statements about one fact. That is worth more than the finding.

### KP5-13 — `OD-0012` states that the site address is not published in this repository. It is, at this SHA.

`docs/decisions/OD-0012-api-state-stays-unauthenticated.md:30`.

> *"The address is not published anywhere in this repository, and the site is not linked from it. That is obscurity, which is not a control, and this record does not describe it as one."*

`grep -rn "netlify.app"` returns `docs/process/V11_KEEPER_REVIEW_PHASE2_THIRD.md:359`, which contains the full address, committed at `1c803b1` — before this round began and present at `f7e90ac`. The third Keeper put it there, which is where I found it, and which makes the sentence wrong in a way nobody set out to make it wrong.

The practical impact is small, and smaller than it looks: the repository is private, and the record's next clause disclaims obscurity as a control, so the owner's decision does not rest on the false half. But this is a layer-1 owner decision record whose stated purpose is *"so he should be able to check it against what he agreed to"*, and one of the facts in it is checkably false. **It is not a session's to correct** — `docs/decisions/OD-*` is `ownerInstructedOnly` — so it is reported here and the owner decides what to do with it. I record it rather than repair it, which is the whole of my remit on that path.

### KP5-14 — `OD-0011` reads the owner's eight words wider than the question they answered, and resolves a constitutional ambiguity about the cycle ceiling in the direction that permits the work.

`docs/decisions/OD-0011-fourth-repair-round-authorised.md`; `constitution/AUTHORITY_TIERS.md` *Authority grants* and *Ratchet*; `constitution/authority.json` `repairLimits`; `constitution/REPAIR_LIMITS.md`.

The brief asked me to check `OD-0011` against what `AUTHORITY_TIERS.md` requires of a grant, and to judge whether its five terms are an honest reading or a self-serving one. My answer is: **mostly honest, materially so, and wrong in two specific places that the record itself makes findable — which is the difference between a flawed record and a dishonest one.**

**What it gets right, and I do not want this buried.** It states all five terms `AUTHORITY_TIERS.md` requires. It says in bold that the five are the session's reading and not the owner's words, and invites correction. It refuses to launder the second and third rounds. It refuses to rest on `OWNER_GRANT_2026-09-09-overnight.md` and repeats the three objections to it. It excludes `KP2-08` and `KP3-06` as the owner's own, and excludes `KP3-11` and `KP4-09` as not defects. It sets an expiry that ends at this verdict. Every one of those is a narrowing, and `AUTHORITY_TIERS.md`'s *Ratchet* is satisfied by narrowing. The round stayed inside the boundary the record states: no commit to `main`, no merge, no change to `constitution/`, `docs/product/` or `knowledge/raw/` — I verified all four against the diff — and no credential handled.

**Where it reads wider than the question.** The question put to the owner was *"Fourth round: yes or no. Yes → I fix `KP4-01` and the nine others."* The answer was *"yes do the fourth round, fix them all"*. "Them" most naturally denotes the ten the question named. The record's **Permitted actions** clause extends it to *"the findings still open from the first and second reviews that are a session's to repair"*, and the round then repaired nine of those. That is the grantee widening its own scope, and `AUTHORITY_TIERS.md` says authority *"does not widen without a Tier 3 decision"*. Mitigating, and I weigh it: the record names the widening explicitly in its own section heading, the extra work is repair of previously-found defects on the same branch under the same boundary, and none of it touches a protected path. It is a widening of *subject matter* inside an unchanged boundary, disclosed. I call it a defect in the record, not a breach of the boundary.

**Where it resolves a constitutional question about itself.** `authority.json` says `maxCyclesWithoutOwner: 1`, `maxCyclesWithOwner: 2`, `beyondLimit: "OWNER_DECISION_REQUIRED"`. `REPAIR_LIMITS.md` says *"At most one further cycle, only with explicit owner authority"* and *"Beyond the owner-extended limit the candidate stops."* This is cycle four. `OD-0011` reads `beyondLimit` as a gate that an owner decision opens once per round — *"the requirement is now met for one further round"*. The constitution does not say that. It equally supports the reading that `2` is a ceiling on the lineage, that beyond it the candidate stops, and that continuing requires an `authority_change` to `repairLimits` — which is owner-only and which `constitution/` being `sessionDenied` makes a different kind of act from filing a record. **A session chose between two readings of a rule that governs how many more times that session may work, and chose the one that permits more.** `CLAUDE.md`: *"A session that finds a contradiction reports it; it does not resolve it silently."* It was not silent — the record quotes `KP4-02`'s *"allows two"* and names this as the third cycle, so an owner reading it has the numbers. But it was resolved, by the party with an interest, and it is not the owner's words that resolved it.

**Two smaller things.** The **Boundary** clause lists what may not be touched and does not mention `docs/decisions/OD-*`, which is the one protected path this round actually wrote to — twice. And nothing in `packages/gate-engine` computes a repair-cycle count for this run, so the limit remains held by prose in a document the sessions read about themselves, exactly as `KP4-02` said.

**None of this blocks.** It is the owner's to settle, and settling it is one sentence from him: whether an owner decision raises the ceiling per round, or whether four cycles on one lineage is where a candidate stops and a new one begins.

### KP5-15 — the reviewed SHA stopped being the head during the review. Third occurrence in this series.

`REVIEW_POLICY.md` *Staleness*; `constitution/keeper.md` stop condition *sha not current*.

At review start, local, remote and PR #8 all read `f7e90ac`. At review end all three read `3d288523a52fb51c178a66c23a34226189fabeb7`, which adds `docs/decisions/OD-0013-branch-protection-deferred.md`, a regenerated seed graph and `.virgil/state.json`. The local checkout moved under me while I was working in it, which is a different and slightly worse thing than the branch moving: a reviewer measuring a frozen SHA had the tree changed beneath it by another session. I state, because it matters for the weight of everything above, that every measurement I cite was taken while the tree stood at `f7e90ac` — the artifacts carry `f7e90ac1ee` in their filenames, which is the evidence — and that I re-measured the blocking finding at `3d28852` as well, where it persists.

My verdict attaches to `f7e90ac` alone. `3d28852` requires fresh verification and fresh review, and nothing above transfers to it.

### KP5-16 — `KP2-14`'s gap is recorded in a test title and nowhere a reader looks for open gaps.

`apps/mission-control/test/live-state-v11.test.ts:538-551`; `docs/architecture/ENFORCEMENT_BOUNDARIES.md`; `docs/decisions/OD-0010-v10-retired-as-a-viewing-point.md`.

The brief asked whether declining to repair `KP2-14` is honest or an excuse. **I judge it honest, and I checked the claim it rests on rather than accepting it.** `vite.owner.config.ts` is one of the five files digested by `owner-build-v11.test.ts:262-268`, and `OD-0010` — a layer-1 owner decision — names that test as *"Kept, and unchanged"* and records with approval that *"It caught a session adding a `define` to V10's config on 2026-09-10 and refused it."* A session that edited the file and updated the digest in the same commit would be stepping over a tripwire an owner decision had just endorsed. Reporting instead is the correct call, and the test that records the gap fails if the gap ever silently closes, which is the right direction.

Two qualifications. The test's title says the file is *"not this session's to change"*; strictly, `OD-0010` protects the *test*, not the file, and the fingerprint's own comment says it is *"not a security measure… anyone editing these files can update the digests below in the same commit"*. The honest statement is that the edit is available but would be a deliberate override of an owner-endorsed guard, and therefore the owner's call — which is what the body does and what the title slightly overshoots. And the gap is recorded only in that test: `docs/architecture/ENFORCEMENT_BOUNDARIES.md` is untouched by this round, so a reader consulting the documented register of accepted gaps will not find `KP2-14` there. The previous round wrote `KP3-05`'s losses into that file; this one did not.

---

## Carried forward, each checked at this SHA

| | Status at `f7e90ac` | Evidence |
|---|---|---|
| **KP2-06** unsanitised `inputs.branch` | **Closed.** No `${{` in any run block; every value via `env:`; pushes are `"HEAD:$TARGET"`; allow-list regex before checkout | file read end to end; new tests reproduced |
| **KP2-07** endpoint fails open | **Closed.** `try/catch` → `refuse(…, 503)`; `Array.isArray` guard; both limits downstream of it | source; test asserts ordering |
| **KP2-08** `/api/state` unauthenticated | **Accepted by the owner**, `OD-0012`. Not repaired, and correctly not claimed as repaired | `state.mjs` handler re-read; no secret, method or origin check |
| **KP2-09** no verification of the hosted build | **Closed in substance**, with `KP5-02`, `KP5-03`, `KP5-08` against the instrument | verifier run here; CI job green on this SHA |
| **KP2-10** `__LIVE__` does not remove the instruct client | **Closed for all three instruct strings; the fourth is `KP5-01`** | V11 artifact: `/api/instruct` ×0, `x-virgil-secret` ×0, `virgil.instruct.secret` ×0, `__LIVE__` ×0, `/api/state` ×1 |
| **KP2-11** the agent step is bounded by prose | **Open, unchanged.** | file read |
| **KP2-12** no cost text | **Closed.** `LIVE_COMPOSER_NOTE` names Actions minutes and the charged run; a test holds it and holds the call site | source + test |
| **KP2-13 / KP3-12** stale byte figure | **Closed.** All four source files now state it historically or not at all; `V11_BRIEF.md:35` still reads it as live against its own `:44`, which is a document-layer contradiction outside `KP3-12`'s scope and worth the owner's eye | grep of the whole tree |
| **KP2-14** `__LIVE__` undefined in V10's config | **Reported, not repaired. Honest** — see `KP5-16` | `OD-0010` read; digest test read |
| **KP2-15** workflow reports a Fabricator | **Closed.** `--holder virgil`; the script accepts it and lights no station, which is true | source |
| **KP2-16** live check results never drawn | **Closed in the product, tested by nothing** — `KP5-07` | built page read |
| **KP2-17** deny-lists named as invariants | **Closed, both halves.** Triggers: the `on:` block's keys must equal `['workflow_dispatch']`. Permissions: every granted key must equal `['contents: write']`, plus an explicit `write-all`/`read-all` refusal | tests read; the comment recording the first draft's own bug is accurate |
| **KP2-18** language pass unverifiable | **Unchanged. INSUFFICIENT_EVIDENCE**, as before | — |
| **KP2-19** `unsafe-inline` in the CSP | **Closed, both halves, proved by mutation** — see `KP5-10` | two CSP mutants run |
| **KP2-20** reviewed SHA not the head | **Recurs** — `KP5-15` | `git ls-remote`, PR API |
| **KP3-06** `main` unprotected | **Open. Re-measured.** `protected: false` | GitHub API |
| **KP3-07** private repository | **Open. Re-measured.** `private: true` | GitHub API |
| **KP3-08** `__LIVE__` asserted by no test | **Closed**, with `KP5-11` | tests read; five configs read |
| **KP3-11** a session's report about itself | **Open, unchanged in kind.** At this SHA `holder: null`, all stations `READY`, note *"OD-0012 filed… Awaiting the fifth Keeper review."* `aboutCommit` is `0bdcaf8`, the previous commit, which is inherent to writing the file before committing it and is not checked against the head by anything | file read |
| **KP4-01** ignore-list blind to `**` | **Closed**, with `KP5-05` | 18 forms + 4 mutations, run outside the repository |
| **KP4-02** fourth cycle unauthorised | **Answered by `OD-0011`**, with `KP5-14` | record read against `AUTHORITY_TIERS.md` |
| **KP4-03** refused report announced as no report | **Closed.** Four-way branch on `sessionReportStatus`; the self-reported regression is gone. Untested end to end — `KP5-08` | built page read in the `absent` state; source for the rest |
| **KP4-04** prose tests freshness, room tests branch | **Closed.** A fresh report about another branch now gets its own paragraph naming both branches | source; `stateFromAnswer` agrees |
| **KP4-05** false reason in a comment | **Closed.** The comment now states the true, narrower reason and records that the old one was false | source |
| **KP4-06(a)** `report.hops` unguarded | **Closed.** `if (report && Array.isArray(report.hops))` | source |
| **KP4-06(b)** one link of three asserted | **Closed.** `handler` → `readSessionReport` → `sessionReport` all asserted | test read |
| **KP4-07(a)** fixture test proved extraction, not catching | **Closed.** It runs `whyRefused` now and asserts a refusal, over ten forms including `KP4-01`'s three | reproduced |
| **KP4-07(b)** title claimed a universal | **Closed.** Renamed to *"every candidate word in the recording"* | source |
| **KP4-07(c)** dead fixture entry | **Closed.** Deleted, with the reason | source |
| **KP4-08** `.virgil/state.json` validated by nothing | **Closed.** `--note` bounded at 300; two tests hold the committed report against the schema and against the wire check | tests run |
| **KP4-09** divergences outside the battery | **Closed for both, and one new one opened** — `KP5-04` | measured, both sides |
| **KP4-10** margin measured on the wrong two events | **Closed.** The comment now states the inference by analogy first and the measurement second | source |

---

## What I could not check, named rather than inferred

- **CI job logs.** `GET /actions/jobs/103149862590/logs` redirects to `productionresultssa11.blob.core.windows.net`, which the egress proxy refuses at CONNECT (`403`). So I have the failing job, the failing step and the run's conclusion from the API, and the failure *text* from my own run of the same command on the same SHA rather than from GitHub's. I say which is which.
- **The deployed site.** Still unreachable from here. Whether `KP2-08`'s exposure is live, and whether anything stands in front of it, is unknown to me as it was to all three previous reviewers. `OD-0012` makes that question the owner's rather than a finding.
- **Token scopes, and whether the three secrets exist.** Unchanged and unchecked. `INSUFFICIENT_EVIDENCE` on those points specifically.
- **`pnpm verify:owner` (V10).** Not run here; green in CI on this SHA. Stated rather than borrowed.
- **That the three previous review files are verbatim.** Nothing in this repository holds an independent copy of what those reviewers returned, so the word *verbatim* at their heads rests on the filing sessions' honesty and on nothing else. **That applies to this file too**, and the owner should read it knowing so. The wire check now validates `review.recordPath` and `review.recordCommit`; the content of the record those fields point at is checked by nobody.
- **`3d28852`.** Outside this review. I measured only that `KP5-01` persists there.

---

## Is the candidate safe to merge?

**No.** `f7e90ac` carries a proven defect that fails a required check: `pnpm verify:owner:v11` exits 1, `pnpm check` therefore fails, and the pull request's gate is red on GitHub's own runners at the same step. That forecloses a pass under `REVIEW_POLICY.md` regardless of anything else in the diff, and it is the one finding here that is not a matter of judgment.

`KP5-02` through `KP5-04` are major and do not block: two are weaknesses in checks added this round, one is a bounded divergence between two validators. `KP5-05` through `KP5-16` are minor. `KP2-08` is the owner's, accepted and recorded. `KP3-06` is the owner's and still open — `main` has no branch protection, so every tick on this pull request remains advisory, and the red run I am blocking on would stop nothing by itself.

Three things belong in the owner's hand alongside this verdict.

1. **`KP5-01` is repairable and the repair has a wrong answer available.** The tempting fix — take `/api/state` out of the guard — would undo `KP2-10` while appearing to close a build failure. Whichever fix is chosen should be named in the commit message with its reasoning.
2. **`KP5-14`.** Four repair cycles have now run on one lineage where `authority.json` writes `2`. The owner authorised the fourth in eight words, and the terms of that authorisation were written by the party it authorised. Whether an owner decision raises that ceiling once per round, or whether four cycles is where a candidate lineage stops, is a sentence only he can supply — and a fifth round now needs its own decision either way, because `OD-0011`'s expiry is this verdict.
3. **`KP5-13`.** One factual sentence in `OD-0012` is false at the SHA that files it. No session may correct it. He should.

On the pattern this series exists about — a rule written, a guard beside it, and no path by which the guard fires — I found it three times: at `KP5-03`, where the new hosted-build check is held in place by nothing; at `KP5-05`, where a comment describes an inversion the code does not perform; and at `KP5-07`, where a repair ships with no test at all. That is fewer than the last round and far fewer than the one before. Against it I record three closures that were made by construction rather than by covering cases — `KP4-01` inverted rather than extended, `KP2-06` made impossible rather than screened, `KP2-10` folded out by a compile-time constant — and one check, `KP2-19`, that is now proven by running the product under the thing it asserts. That is real progress and it should be said as plainly as the block.

The thing I most want on record is this. The instrument this round added to watch the hosted build is the first thing in this project that can read what the owner's page actually says, and the first two things I pointed it at were a page that passes while nothing on it can be pressed, and a window saying *"No work has started"* and *"The work is still in progress"* in the same breath. Both of those were invisible to every check that existed before it. A new instrument that immediately finds its own limits and two defects nobody had seen is worth having even on the day its own repair breaks the build.

I raise no finding I could not reproduce, and I have filled no gap with assumption.

**Verdict: `BLOCKED` on `f7e90ac1ee5f18e52de07765d6841d1fa62b2c98`.**
**Blocking: `KP5-01`.** Major, non-blocking: `KP5-02`, `KP5-03`, `KP5-04`. Minor: `KP5-05` through `KP5-16`. `KP2-06`, `KP2-07`, `KP2-12`, `KP2-13`/`KP3-12`, `KP2-15`, `KP2-16`, `KP2-17`, `KP2-19`, `KP3-08`, `KP4-01`, `KP4-03`, `KP4-04`, `KP4-05`, `KP4-06`, `KP4-07`, `KP4-08`, `KP4-09` and `KP4-10` are closed and I record them as closed. `KP2-08` is accepted by owner decision, not closed. `KP2-14` is reported, not closed, honestly. `KP2-11`, `KP2-18`, `KP3-06`, `KP3-07` and `KP3-11` remain open, unrepaired and correctly not claimed as fixed.
**Stop reason:** `required_check_failed` at the reviewed SHA; secondarily `sha_not_current` (`KP5-15`), which does not change the verdict and does prevent it transferring.
**Next action:** one bounded repair of `KP5-01` on a fresh SHA, under whatever authority the owner gives for it, followed by fresh verification and fresh independent review. `OD-0011` expires with this verdict and authorises none of it.

---

Files that matter most, all absolute:

- `/home/user/Virgil-mission-control/apps/mission-control/e2e/verify-owner-build-v11.ts` (lines 440-466, 1246-1280)
- `/home/user/Virgil-mission-control/apps/mission-control/e2e/verify-web-build.ts` (lines 34-60, 201-247, 256-353)
- `/home/user/Virgil-mission-control/packages/test-fixtures/knowledge/seed-graph.json` (the `OD-0012` node)
- `/home/user/Virgil-mission-control/apps/mission-control/src/spikes/mind/MindScene.tsx` (line 3)
- `/home/user/Virgil-mission-control/docs/decisions/OD-0012-api-state-stays-unauthenticated.md` (the filename itself, and line 30)
- `/home/user/Virgil-mission-control/docs/decisions/OD-0011-fourth-repair-round-authorised.md`
- `/home/user/Virgil-mission-control/netlify/functions/state.mjs` (lines 243-275, 474-521, 623)
- `/home/user/Virgil-mission-control/netlify/functions/instruct.mjs` (lines 121-160)
- `/home/user/Virgil-mission-control/.github/workflows/instruct.yml` (lines 69-99, 120-135)
- `/home/user/Virgil-mission-control/.github/workflows/checks.yml` (lines 197-232)
- `/home/user/Virgil-mission-control/apps/mission-control/test/required-checks.test.ts` (lines 150-296)
- `/home/user/Virgil-mission-control/apps/mission-control/test/instruct-v11.test.ts` (lines 78-245)
- `/home/user/Virgil-mission-control/apps/mission-control/test/live-state-v11.test.ts` (lines 254-280, 469-580, 658-747)
- `/home/user/Virgil-mission-control/apps/mission-control/src/world/mobile/MobileRoom.tsx` (lines 797-892)
- `/home/user/Virgil-mission-control/apps/mission-control/src/world/window/windowContent.ts` (lines 1364-1375, 1730-1740)
- `/home/user/Virgil-mission-control/apps/mission-control/src/world/screens/v11/content.ts` (line 287)
- `/home/user/Virgil-mission-control/scripts/virgil-status.mjs`
- `/home/user/Virgil-mission-control/constitution/AUTHORITY_TIERS.md`, `/home/user/Virgil-mission-control/constitution/REPAIR_LIMITS.md`, `/home/user/Virgil-mission-control/constitution/authority.json`
- `/home/user/Virgil-mission-control/docs/architecture/ENFORCEMENT_BOUNDARIES.md` (untouched this round; `KP2-14` is not in it)
