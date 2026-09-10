# Phase 2 slices one, two and three — independent Keeper review

**Candidate:** `5b9676390c2cfbc565272ae691600679b1e5664d`, on `claude/virgil-mobile-v11`, head of pull request #8 into `main`.
**Base:** `origin/main` = `90b116c` — 163 commits, 317 files, +136,458 / −3,013.
**Reviewed:** 10 September 2026.

**Verdict: `BLOCKED`.**

Filed by the building session on the Keeper's instruction. The Keeper is read-only and wrote nothing in this repository; it returned this report and asked for it to be placed here.

> **A correction to this file's own description of itself, at the Keeper's insistence.**
>
> The first version of this file said it was filed *"verbatim"* and *"unedited"*, and the commit that added it said the same. **That was not accurate.** What was filed was a condensation — 237 lines against the reviewer's longer text — reframed into the third person. The Keeper checked it and reported: *"I have checked every finding identity, severity and verdict and none was dropped, softened or renumbered, so I have no objection to the substance. But 'unedited' is not accurate, and in a project whose recurring defect is precisely the gap between a claim and what backs it, a record that overstates its own fidelity is the wrong place to let that slide."*
>
> `constitution/REVIEW_POLICY.md` requires that findings are never renumbered, merged silently or dropped. **That requirement was met. The description of the filing was not**, and it is corrected here rather than quietly amended: this document is a faithful condensation of the Keeper's report, in which every finding, identity, severity and the verdict are the Keeper's own, and the arrangement and some of the connecting prose are the filing session's.
>
> Direct quotations of the reviewer are marked as quotations throughout. Where this file speaks in the third person about *"the reviewer"*, that is the filing session's voice, not the Keeper's.

> **Reviewer's own statement of independence.** *"Keeper, independent session. I did not write any part of this candidate and used no commit message or run record as evidence for any finding below. Repository state during review: working tree clean throughout; I created and modified nothing under `/home/user/Virgil-mission-control`. All probe files were written to the session scratchpad outside the repository."*

---

## Verdict, in the reviewer's words

> The candidate fails its own required check `pnpm test` at the reviewed SHA, and the hosted build — the only target that can start a session — puts three separate false statements on screen. Both are reproduced below from the code and the built artifacts, not from any report.
>
> A separate process finding: **the reviewed SHA is no longer the head of the branch or of PR #8.** This verdict attaches to `5b9676390c2cfbc565272ae691600679b1e5664d` alone and does not transfer.

## Checks reproduced by the reviewer

| Check | Result | Note |
|---|---|---|
| `pnpm lint` | pass | `biome check .`, direct, not cached |
| `pnpm typecheck` | pass | re-run with `--force`; 8/8 tasks, 0 cached |
| `pnpm test` | **FAIL** | `--force --continue`: 5 of 6 packages pass, `@virgil/knowledge-graph` fails 2 tests |
| `pnpm test` (first attempt) | "pass" | **`Cached: 6 cached, 6 total >>> FULL TURBO` — nothing executed.** See KP2-01 |
| `mission-control` tests, forced | pass | 35 files, 1,552 tests |
| `pnpm build:owner` | pass | 8,528,591 bytes |
| `pnpm verify:owner` | pass | requests 1, **off-document 0** |
| `pnpm build:owner:v11` | pass | 7,362,259 bytes |
| `pnpm verify:owner:v11` | pass | full run, all viewports and tail; no off-document requests |
| `pnpm --filter mission-control build:web` | pass | artifact then inspected by hand |

> Because a stale turbo cache concealed a real failure on my first attempt, I re-ran `test` and `typecheck` with `--force`. I recommend every future record state whether a reported pass was executed or restored.

---

## Blocking findings

### KP2-01 — `pnpm test` fails at the reviewed SHA. The committed seed graph is stale.

**Severity: blocking.** `packages/test-fixtures/knowledge/seed-graph.json`; `packages/knowledge-graph/test/seed-graph.test.ts:23,27`.

Two tests fail: *matches a fresh derivation byte for byte*, and *carries the hash of the graph it was derived from*. The diff is one missing node — OD-0010. `packages/knowledge-graph/src/derive.ts:105` walks `docs/decisions` for `/(OD|ADR)-\d{4}.*\.md$`; OD-0010 was added by `3e18c1b`, and the seed graph was last regenerated at `ff6dbca`, which is **older**. The graph has lacked the node since `3e18c1b`, an ancestor of the candidate.

> This is not an artefact of the head having moved: the deriver does not read `.virgil/`, and the only delta between `5b96763` and the current head is `.virgil/state.json`.

`pnpm check` runs `pnpm test`, so `pnpm check` fails as well. Under `constitution/REVIEW_POLICY.md`, *What review requires*, this alone forecloses a pass.

### KP2-02 — The CI rule that let KP2-01 through asserts a false invariant, and a test enforces the false invariant.

**Severity: blocking.** `.github/workflows/checks.yml:88-96`; `apps/mission-control/test/required-checks.test.ts:135-144`.

The workflow states: *"Documents do not change what any of these checks measure, so a push that touches only prose runs nothing at all."* That sentence is false — `derive.ts:105` makes `docs/decisions/OD-*.md` a direct input to a byte-for-byte test. Commit `3e18c1b` touched **only** `.md` files under `docs/`, so no check ran on the push that broke the suite.

The test asserting the ignore list is safe checks only that two strings are absent:

```js
// Source, tests, the workflow itself and the lockfile are all still covered:
// nothing that changes what a check measures is in the ignore list.
expect(workflow).not.toContain('apps/**');
```

> The comment states the property; the assertion only checks that two strings are absent. The property is false and the test passes. This is the clearest instance in the candidate of a test whose name is stronger than what it checks.

### KP2-03 — The hosted build tells the owner nothing is running, next to a button that starts a real session.

**Severity: blocking.** `src/world/window/session.ts:102,106,119-121`; `src/world/window/AgentWindow.tsx:373,412,433,437`; `src/world/live/liveSession.ts:143-150`.

`transport()` is unconditional and always returns `NO_SESSION`. `liveTransport` — whose comment calls it *"The seam's live implementation"* — is referenced by **only the file that defines it**. It is dead code; `AgentWindow.tsx:400` calls `instruct()` directly and bypasses the seam.

So in the hosted build, with the secret installed, the same panel renders all four of:

- *"No agents are running. Nothing here can change your project. Only you can put a change in."*
- *"Your message stays on this page. It is not sent because no agents are actually running."*
- *"Tell {name} what to do. This starts a real session on the working branch."*
- a button labelled **Send**

> I built `dist/web` and confirmed all four strings ship in the same chunk. `MobileRoom.tsx:1686-1691` makes `live` the default mode whenever `__LIVE__`, so this is the first screen, not an edge case.
>
> `liveSession.ts:28-29` states the rule this breaks: *"A composer that said sent when the answer was 409 would be the same class of lie as a screen showing a verdict nobody returned."* Saying *no agents are running* on the page that starts agents is that class of lie, before any button is pressed.

### KP2-04 — A session can put any of the four verdicts on the verdict slab by writing a word. The schema meant to prevent it never runs on the wire.

**Severity: blocking.** `netlify/functions/state.mjs:245-250,365`; `src/world/live/liveState.ts:230`; `src/world/window/windowContent.ts:1261,1307,1323`.

The stated safeguard, in `packages/agent-contracts/src/live.ts:36-39`: *"A verdict may not appear here alone… A session claiming `PASS` with no record to point at is a claim this schema will not represent."* Neither half holds.

1. **The schema is never applied to the data.** `state.mjs` imports nothing; it checks one string and returns the file verbatim at line 365. Zod runs only in unit tests, against fixtures.
2. **The pointers are decorative.** `recordPath` and `recordCommit` are read by nothing — no fetch, no resolution, no comparison.

Measured, with a report naming a file and a commit that do not exist:

```
content.verdict="PASS"  content.active="fabricator"
```

which reaches the window as the headline *"The Keeper has finished its review"*, the `Verdict` table row, and `standing: 'verified'`.

> The test that names this invariant does not test it. `FULL` carries no session report; the comment claims a property over all paths and the assertion covers one input. No test constructs a well-formed but fabricated `review`.
>
> The architecture is careful never to derive a verdict from a GitHub approval and then admits one from an unauthenticated file that any session on the branch can write.

### KP2-05 — In live mode the station consoles draw the demonstration's fixture numbers as this repository's.

**Severity: blocking.** `src/world/live/liveState.ts:166,199-213`; `src/world/screens/v11/screens.ts:165,172,189,222,227`; `src/world/screens/tally.ts:45-47,129-133,172-173`.

`stateFromAnswer` builds on `demoAt(0, 0, false)` and sets `station: 'WORKING'` without ever setting `work`; `screens.ts` falls back to the demonstration fixtures whenever `work` is absent. Measured:

```
countsFor(prover)     = ["PASSED 14 · FAILED 0", "14 CHECKS"]
countsFor(keeper)     = ["FINDINGS 3 · BLOCKING 0", "NON-BLOCKING PERSIST"]
countsFor(fabricator) = ["FILES 8 · COMMITS 3", "A CLAIM · NOT EVIDENCE"]
```

Every one of those numbers is a constant in `tally.ts`.

> So the hosted site draws that station counting up to `FILES 8 · COMMITS 3` — the demo's numbers — while `MobileRoom.tsx:800-801` says on the same screen: *"The branch, the commit and the check results come from GitHub, which no session can write to."*
>
> Two further contradictions in the same file: `liveState.ts:34-36` states *"No agent is shown working… the cast stays at rest"*, which its own lines 200-213 now do the opposite of; and `liveState.ts:41-42` promises *"A failure is not a zero… rather than showing noughts"*, which does not address the harder case the code actually produces — a fixture rather than a nought.

---

## Major findings

### KP2-06 — `inputs.branch` is interpolated unsanitised into three shell blocks and one `node -e` script.

`.github/workflows/instruct.yml:124,142,184,199`; guard at `:78-80`. `instruction` is handled correctly throughout — passed via `env:` and read from `process.env`. `branch` is not. The screening rejects `..`, `/../` and a leading `-`; it does not reject `;`, `&`, `$`, backtick, `(`, `)`, `|`, `'` or `"`, all legal in a git refname.

> I want to be precise about exploitability rather than overstate it. Reaching lines 142/184/199 requires `actions/checkout` to resolve the ref, so a hostile value must be a branch that actually exists, which requires repository write access — and `workflow_dispatch` requires write access anyway. The endpoint cannot supply a hostile value, because `instruct.mjs:155` sends `branch` from the server-side `GITHUB_BRANCH`.
>
> What is nevertheless untrue is the file's own claim at `:8-10` — *"the limits below are part of the machinery rather than promises about behaviour"* — and at `:68`: *"`main` is not reachable from this workflow by any input."* The equality checks are bypassable by a value that never equals `main` but interpolates a second `git push` after it. The claim is stronger than the machinery. No test covers the interpolation surface at all.

Confirmed sound in the same area: `permissions:` grants `contents: write` and nothing else; there is no path by which the workflow starts itself.

### KP2-07 — The endpoint fails open on the runs query. Both limits silently vanish.

`netlify/functions/instruct.mjs:126-151`. If the runs query fails for any reason — rate limit, transient 5xx, a token without `Actions: read` — `list` is `[]`, `inFlight` is `undefined`, `today` is `0`, and the dispatch proceeds.

> Every other absence in this file is a closed door; this one is an open one. It contradicts the header: *"Both limits are answered from GitHub's own record of runs, so there is no state here to drift or be lost."* When the record cannot be read, the limits are not answered — they are skipped. The file itself names this as the failure that matters: *"The failure mode is not one expensive run, it is fifty cheap ones."*

Confirmed sound: the secret check precedes body parsing, absent configuration refuses rather than defaults open, an unparsed body is a 400, and the secret is never in anything the page ships.

### KP2-08 — `/api/state` has no authentication, on a repository the project's own records call private.

`netlify/functions/state.mjs:266-283`; `netlify.toml:24-27`. It checks no secret and no method, and returns branch, head SHA, commit subject, PR number, title and URL, every check run, GitHub review states, and the entire contents of `.virgil/state.json`, to anyone who requests the path.

> `PHASE_2_SLICE_3_BRIEF.md:36` states the governing principle and applies it to exactly one of the two endpoints: *"the function is protected separately, because an endpoint is reachable whether or not a page in front of it is."* That reasoning was applied to `/api/instruct` and not to `/api/state`.

### KP2-09 — The hosted build has no automated verification of any kind.

`apps/mission-control/package.json:12`; `turbo.json`; `.github/workflows/checks.yml`. `build:web` is not a turbo task, not in `pnpm check`, not a step in CI, and no test or e2e references `dist/web`.

> Both Owner Builds have a build, a verifier, a digest and a reproducibility job; the third target — the only one that can start a session, and the one the owner will actually open on his phone — has none. If `build:web` broke, nothing in this repository would fail. The absence of any e2e over `dist/web` is also why KP2-03 and KP2-05 reached the artifact.

### KP2-10 — `__LIVE__` does not compile the instruct client out of the Owner Build.

`src/world/live/liveSession.ts:9-11,84`. Searching the built V11 Owner Build artifact:

| string | occurrences |
|---|---|
| `/api/state` | 0 |
| `/api/instruct` | **1** |
| `x-virgil-secret` | **1** |
| `virgil.instruct.secret` | **1** |

`instruct()` never reads `__LIVE__` — only `canInstruct()` does — and the call site sits after a runtime early return the bundler cannot prove unreachable.

> **The behavioural promise still holds, and I verified it:** `pnpm verify:owner:v11` passed in full with no off-document requests. But it holds because one boolean is false at runtime, not because the code was removed. `netlify.toml:4-7`'s *"The Owner Build is untouched by this"* and the brief's *"still know nothing about any of this"* are, at the artifact level, not accurate. No test asserts the artifact is free of these strings.

### KP2-11 — The agent step is bounded by `CLAUDE.md`, not by machinery, and a test claims otherwise.

`.github/workflows/instruct.yml:16-19,153-174`; `apps/mission-control/test/instruct-v11.test.ts:135-148`. The step-1 refusal constrains the checkout ref; it does not constrain what the agent does once running. An agent that chose to push to `main` is refused by branch protection if it exists, and otherwise by nothing in this workflow.

> The test named *'never merges, deploys or opens a pull request'* scans static YAML. It cannot see what an arbitrary agent does at runtime. The property it names is a property of the run; what it checks is a property of the file.

One protection is real but incidental and is recorded as such: GitHub refuses pushes modifying `.github/workflows/**` without the `workflows` scope, so the agent cannot edit `instruct.yml` itself.

---

## Minor findings

**KP2-12 — An explicit acceptance criterion of the brief is unmet and was not retired.** `PHASE_2_SLICE_3_BRIEF.md:31,64` requires the page to tell the owner a run costs something before he starts it. There is no cost text in `AgentWindow.tsx:405-438`. `dbf6a80` treats the subscription token as removing the need, but the workflow still supports `ANTHROPIC_API_KEY`, in which case runs are metered and the page still says nothing. *"The criterion stands unamended in a layer-4 document; retiring it is the owner's call, not a session's."*

**KP2-13 — The byte count OD-0010 retired is still stated as a live contract in four source files.** `assets/gzipPayloads.ts:14`, `agent-contracts/src/index.ts:61`, `live/liveState.ts:20`, `owner-build/gzip-payloads.mjs:13`. Three others narrate it as history and are fine. `liveState.ts:20` also states a figure that is simply wrong: V10 measures **8,528,591**.

On whether anything else was retired with OD-0010: *"no, and I checked directly."* `3e18c1b` touches five documentation files and no test; the V10 fingerprint test is present and passes; OD-0010's quoted words match the scope it claims; `PRESERVATION_CONTRACT_CONTRADICTION.md` is honest and its arithmetic matches the measurement. The 914-byte barrel leak is *"genuinely fixed"*, confirmed independently by the 273-byte figure.

**KP2-14 — `vite.owner.config.ts` defines no `__LIVE__`.** Four of five configs do. V10 does not reach the code today, so this is latent rather than active; the failure mode would be a runtime `ReferenceError`.

**KP2-15 — The workflow reports a Fabricator when what runs is a generic session.** `instruct.yml:102-106` writes `--holder fabricator` before starting an unscoped `claude -p` with no work order and no permitted-paths contract. *"This is the same mechanism, at the same shelf life, saying something the run cannot support."*

**KP2-16 — Live check results are read and never drawn.** `state.mjs` implements three fallback sources and returns them; `live.answer.checks` is referenced by no component. *"The sentence names three things and the screen delivers two."*

**KP2-17 — Source-reading guards named as invariants.** `instruct-v11.test.ts` is entirely `toContain` over file text and says so, which is the right disclosure. Two are weaker than their names regardless: the permissions ban would pass `permissions: write-all`; the trigger ban does not cover `repository_dispatch:`. Also `window-content-v11.test.ts:268` is titled *"there is no session, and nothing pretends there is"* — true of the object it tests, no longer true of the product, which is KP2-03.

---

## Informational

**KP2-18 — The language pass is largely unverifiable from the repository, and its counts do not reconcile.** The 426-entry extraction and the owner's returned file are committed nowhere, so the claim that the wording is the owner's own cannot be checked here. **INSUFFICIENT_EVIDENCE rather than a finding against it.** The counts also do not add up: 309 + 61 + 54 = **424**, not 426; the *"What was NOT applied"* section describes **8** entries while commit `4b3a882` says six.

What is checkable, passed: all five resolved sentences are present verbatim, L91 was correctly not applied (`AgentWindow.tsx:159` still reads `event.key === 'Escape'`), and the eight re-pointed guards are present with none weakened.

**KP2-19 — The instruct secret lives in `localStorage` on a page whose CSP permits inline script.** `netlify.toml:54` sets `script-src 'self' 'unsafe-inline'`. The decision not to ship the secret in the bundle is right and `connect-src 'self'` is a good constraint; `'unsafe-inline'` is the one weakening on a page that now holds the credential to start code-changing sessions.

**KP2-20 — The reviewed SHA is not the head of the branch or of PR #8.** A Keeper stop condition; `REVIEW_POLICY.md` *Staleness* applies. The reviewer checked the delta rather than assuming it — `.virgil/state.json`, one file, eight lines, no source, no test, no workflow — and therefore reviewed the SHA and reported the staleness rather than stopping.

> Two observations on the commit itself, offered as evidence and not as complaint. Its message asserts *"the review is of the SHA, not of the head"* — that is the builder's reasoning about my remit, and I do not accept it as authority; but it happens to agree with `keeper.md`. More interestingly, its content is a live instance of KP2-04: the session under review wrote `"holder": "keeper"`, `keeper: WORKING`, and the note *"An independent Keeper is reviewing candidate 5b96763… It did not write any of what it is reading"* — a claim about a Keeper's activity and independence, made by the builder, which the room will draw as the Keeper's own state.

---

## What could not be checked, and why

The container has no route to GitHub or the internet. All of the following are **INSUFFICIENT_EVIDENCE**, not passes:

- PR #8's identity, base branch, mergeability and check-run results.
- Whether branch protection exists on `main` — which materially changes the severity of KP2-06 and KP2-11.
- Whether the repository is public or private — which determines the impact of KP2-08.
- The actual scopes of the installed tokens, and whether the three secrets exist. *"I looked for credential material in the tree and found none, which is correct."*
- Whether Netlify site password protection is enabled and whether it covers function paths.
- Whether `instruct.yml` or `state.mjs` behave as read: neither can be executed here. All assertions about them, the reviewer's and the candidate's, are source-level.
- Whether `verify:owner:v11` passes on the browser the lockfile pins.

## The reviewer's smallest repair that would clear the block

Offered as scope, not as a plan — *"the Architect's to write"*.

1. **KP2-01:** regenerate `packages/test-fixtures/knowledge/seed-graph.json`.
2. **KP2-02:** remove `docs/**` and `**/*.md` from `paths-ignore`, or exclude `docs/decisions/**`; then make `required-checks.test.ts` assert the property by deriving the input set rather than by string absence.
3. **KP2-03:** wire `liveTransport` into `transport()`, or make `absence` and `COMPOSER_NOTE` conditional on `canInstruct()`. The V11 owner verifier requires `/is not sent/` in the file build, which a conditional satisfies.
4. **KP2-04:** validate `sessionReport` against `SessionStatusReport` inside `state.mjs` before returning it, and either resolve `recordPath` at `recordCommit` or stop carrying `review.verdict` onto `content.verdict` at all.
5. **KP2-05:** in live mode, pass an explicit empty `work` for each station so `screens.ts` cannot fall back to `tally.ts`'s fixtures, and draw the real counts from `answer.checks` or draw none.

> I raise no finding I could not reproduce, and I have not filled any gap with assumption.

---

## The Keeper's addendum, after reading this file

Returned after the first version of this document was filed. Its three points, in its own words.

**1. The head moved a second time, and the verdict still does not transfer.**

> The branch and PR head is now `ad4b52639d4add9eed0a8960f2bca86975f9ce35` (local and remote agree). The chain since the reviewed SHA is: `d738045` — `.virgil/state.json` only; `ad4b526` — `.virgil/state.json` plus the new `docs/process/V11_KEEPER_REVIEW_PHASE2.md`. Total delta from `5b96763`: two files, no source, no test, no workflow. KP2-20 stands and now names two commits rather than one. My verdict remains attached to `5b96763` alone.

**2. KP2-01 is unchanged and still reproduces at the new head.**

> I re-ran it rather than assume. `derive.ts:105` is the only decision-scanning walk in the deriver and it matches `docs/decisions/**/(OD|ADR)-NNNN*.md` — so the newly added `V11_KEEPER_REVIEW_PHASE2.md` does not enter the graph. The failure is still exactly the one missing node.
>
> Worth noting for whoever repairs it: `ad4b526` touches `.virgil/state.json`, which matches none of the `paths-ignore` patterns. So unlike `3e18c1b`, this push should trigger the fast job and CI should now surface KP2-01 on its own. **That is a consequence of which files happened to move, not of anything being fixed — KP2-02 is untouched.**

**3. The correction to this file's description of itself**, which is recorded in the header above.

> I made no change to any repository file at any point; the working tree was clean at the start of this review and is clean now. All probe artifacts are in the session scratchpad outside the repository.
>
> **Verdict, unchanged: BLOCKED** on `5b9676390c2cfbc565272ae691600679b1e5664d`. The five blocking findings are KP2-01 through KP2-05. A fresh SHA requires fresh verification and fresh review; nothing above transfers to `ad4b5263`.
