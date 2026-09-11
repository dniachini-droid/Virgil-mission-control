# Fifth Keeper review — Phase 2 slices one, two and three, candidate `f79a39a`

**This file is the Keeper's report reproduced verbatim.** Everything below the rule is the reviewer's own text, word for word, as it asked at its head. Nothing has been condensed, reordered, softened, renumbered or reframed. This heading and the two paragraphs under it are the filing session's, and are the only words in this file that are not the Keeper's.

The reviewer's own note applies to this file as much as to the four before it: nothing in this repository holds an independent copy of what it returned, so the word *verbatim* rests on the filing session's honesty and on nothing else. It says so itself, and says the owner should read it knowing so.

Filed by the session that built the candidate. **Verdict: `PASS_WITH_NON_BLOCKING_FINDINGS`. No blocking findings. Safe to merge, from the review's side.** `KP6-03` is the finding the owner most needs: he was told `KP5-01` would be repaired by renaming a file and that *"the guard stays exactly as strict"*, and it was neither — the reviewer judges the repair actually made to be the better one, and records that the sentence the owner was given is still in the record he checks against, where no session may correct it. `OD-0014` expires with this verdict and authorises no sixth round.

---

# Fifth Keeper review — Phase 2 slices one, two and three, candidate `f79a39a`

**Candidate:** `f79a39ae1bd9ba4a6e59e8f10f6a73e3d154803f`, on `claude/virgil-mobile-v11`, head of pull request #8 into `main`.
**Base:** `main` = `90b116ca69b5294fd479998ae0d70429bf84c836`.
**Round under review:** the fifth repair, `f7e90ac..f79a39a` (three commits: `3d28852`, `7e764fb`, `f79a39a`).
**Previous verdicts:** `BLOCKED` on `5b96763` (`KP2-01`–`KP2-20`), `BLOCKED` on `1185034` (`KP3-01`–`KP3-13`), `PASS_WITH_NON_BLOCKING_FINDINGS` on `898b7d0` (`KP4-01`–`KP4-10`), `BLOCKED` on `f7e90ac` (`KP5-01`–`KP5-16`).
**Reviewed:** 11 September 2026. Finding prefix: **`KP6-`**.

> **Filing.** I ask that this be filed word for word, and that the file say at its head that it is the Keeper's report reproduced verbatim. If any word of it is changed, the file must not say "verbatim".

> **Independence.** Keeper, independent session. I built no part of this candidate and no part of any of the five repairs. No commit message, code comment, run record, decision record or prior review is used as evidence for any finding below; where I quote one it is as the thing under examination, not as proof of it. Every finding was reproduced from the code, from an artifact I compiled, from a mutation of a file copied outside the repository, from a browser I drove, or from GitHub's own API. I created and modified nothing under `/home/user/Virgil-mission-control`; `git status --porcelain` is empty at the end of this review as it was at the start. All probes and mutants are in the session scratchpad outside the repository. The builds under `apps/mission-control/dist/` were written by the required checks themselves, which is what running them does; nothing tracked by git was touched.

---

## Verdict: `PASS_WITH_NON_BLOCKING_FINDINGS`

**The blocking defect is closed, and I closed it by running the check rather than by reading the claim.** `pnpm turbo run verify:owner:v11 --force` exits **0** at this SHA, 0 cached of 2 tasks, 15m01s, on the artifact `v11-s4-virgil-f79a39ae1b.html` (7,364,693 bytes, `sha256 9ef659e2d51d5d66963fa341a539e494112abd8039c7cbb846ce416c46569878`). Every other required check passes here too, and — for the first time in this series — **all nine jobs of the pull-request gate concluded `success` on GitHub's own runners**, which I read from the API rather than from a badge.

**The prohibited repair was not taken.** The fourth review named it: dropping `/api/state` from the guard, or excepting the seed graph. Neither was done. `/api/state` is still refused, by a pattern that is *broader* than the list it replaced — any `/api/` path, not two named endpoints. I proved the new check still catches what it exists to catch by compiling a V11 Owner Build with `__LIVE__` **true** myself and running the patterns against it: both fire. On the honest build both are silent while `/api/state` is still present ×1, as the name of a document. That is the distinction the repair claims to draw, and it draws it.

**Fourteen of the sixteen findings are genuinely closed and I confirmed the load-bearing ones by mutation rather than by reading.** `KP5-01`, `KP5-02`, `KP5-03`, `KP5-04`, `KP5-06`, `KP5-07`, `KP5-08`, `KP5-09`, `KP5-11`, `KP5-12` and `KP5-16` are closed; `KP5-05` and `KP5-10` are closed on their principal half and open on their secondary one; `KP5-13` is corrected on the owner's instruction, well; `KP5-14` and `KP5-15` were never a session's to repair and are addressed in `OD-0014` and by the branch standing still. I reproduced the previous Keeper's overlay page and the verifier now **fails** on it with an accurate diagnosis. I reproduced its `RUN_ID` mutation and the new test **catches** it. I re-ran its eighteen ignore-list forms and the three that leaked are now refused.

**And the round created new defects while repairing, as every round has.** Eighteen this time, of which three are major. The two that matter most are both in the repair of the blocking finding: the new guard matches the *current spelling* of the escape rather than the escape, and is defeated by a one-line refactor that the old check would have survived — which I proved by construction, using a transform the minifier demonstrably performs on this very artifact today. And the comment justifying the repair asserts that a test holds the new patterns in place. No such test exists anywhere in the repository. That is this series' recurring shape — a rule written, a guard named beside it, and no guard — appearing inside the sentence written to close it.

None of the eighteen is a defect in the product that fails an acceptance criterion, and none blocks.

---

## SHA currency and preconditions, measured rather than assumed

| | Value |
|---|---|
| `git rev-parse f79a39a` | `f79a39ae1bd9ba4a6e59e8f10f6a73e3d154803f` |
| `git rev-parse HEAD` **at review start and at review end** | `f79a39ae1bd9ba4a6e59e8f10f6a73e3d154803f` |
| `git ls-remote origin refs/heads/…v11` **at start and at end** | `f79a39ae1bd9ba4a6e59e8f10f6a73e3d154803f` |
| PR #8 `head.sha` | `f79a39ae1bd9ba4a6e59e8f10f6a73e3d154803f` |
| PR #8 | `open`, not draft, `mergeable: true`, `mergeable_state: **clean**` |
| Repository | `private: true`, `visibility: private`, default branch `main` |
| `main` | `protected: false` |
| Working tree | clean at start and at finish; nothing tracked written by me |
| Protected boundaries in `90b116c..f79a39a` | `git diff --name-only` filtered on `constitution/`, `docs/product/`, `knowledge/raw/`, `schemas/gate-` returns **nothing** |
| `docs/decisions/` in `f7e90ac..f79a39a` | `OD-0012` modified, `OD-0013` added, `OD-0014` added — `ownerInstructedOnly`, not `sessionDenied`; see `KP6-03` and `KP6-16` |

**The reviewed SHA is still the head, and was throughout.** That is the first time in five reviews. `KP2-20` and `KP5-15` do not recur at this candidate. `REVIEW_POLICY.md` *Staleness* is satisfied and this verdict attaches to a live head rather than to a frozen one.

**`mergeable_state` is `clean` rather than `unstable`**, which is GitHub's own statement that no required check on this SHA is failing or pending. I record it as a fact about GitHub's view, not as a substitute for the gate: `main` is unprotected, so "required" is a word this repository uses about itself.

**CI, read from the API.** Run **`34569421052`** (`pull_request`, `f79a39a`): **`success`**, all **nine** jobs `success`, no step with a non-success conclusion — `lint, typecheck, tests`; `lint, typecheck, tests, owner build, owner verify` (`pnpm check`, 2,331 s); `newest Owner Build rebuilds byte for byte`; `Mind Scan, V10 owner build and verify, committed digests`; `hosted build, read and refused`; and all four `V11 owner build and verify` shards. Run `34569413495` (`push`, same SHA) also `success`. Those are the only two runs on this SHA. The brief's claim about `34569421052` is confirmed, and so is the fourth review's point about the gate split — but this time both halves are green, so the split is not hiding anything.

---

## Checks reproduced here

Every one executed in this container. Cache status is stated because `KP2-01` was a false pass produced by turbo.

| Check | Result | Evidence |
|---|---|---|
| `pnpm lint` | pass | `biome check .`, 295 files, direct |
| `pnpm turbo run typecheck --force` | pass | **0 cached, 8 total** |
| `pnpm turbo run test --force --continue` | pass | **0 cached, 6 total**; mission-control 35 files / **1,622 tests**; **1,857** across the six packages |
| `pnpm turbo run verify:owner:v11 --force` | **pass, exit 0** | **0 cached, 2 total**, 15m01s; frame 1,456 ms here; artifact 7,364,693 B, `sha256 9ef659e2…` |
| `pnpm turbo run verify:web --force` | **pass, exit 0** | **0 cached, 2 total**; bundle 8,663.80 kB; frame 24 ms; 4 requests, 1 to `/api/state`; *"Every control took a real click."* |
| `pnpm --filter @virgil/knowledge-lint run lint` | pass | 88 nodes, 166 edges, 94 tethers intact, **no findings** |
| committed seed graph freshness | **fresh** | the Mind Scan's own `graphHash sha256:4ea731dec4d7bbfe534a31f3c259173f06c02dfdb9c3fe9356aa0a836f4ae3cf` equals the `graphHash` committed in `packages/test-fixtures/knowledge/seed-graph.json`. Established by reading rather than by re-running the exporter, because the exporter writes into the repository and I do not |
| `pnpm verify:owner` (V10) | **not run here** | green in CI on this SHA, inside `pnpm check` and inside the `artifacts` job. Stated rather than borrowed |
| `pnpm --filter @virgil/agent-contracts export-schemas` | **not run here** | it writes into the repository. `schemas/` drift is held by the package's own tests, which passed |

Mutations and probes, all outside the repository:

| Probe | Result |
|---|---|
| V11 Owner Build compiled with `__LIVE__: true` (the shipped config, one `define` flipped, output to the scratchpad) | **both new patterns FIRE** |
| the shipped artifact at `f79a39a` | both patterns **silent**; `/api/state` ×1, `/api/instruct` ×0, `x-virgil-secret` ×0, `virgil.instruct.secret` ×0 |
| a functionally identical instruct client with the endpoint and header in constants, minified | **both patterns silent**; the old substring list would have fired twice — `KP6-01` |
| `dist/web` copied out, one CSS rule adding a full-viewport `body::after`, the verifier run against it | **FAIL, exit 1**, 11 failures, naming `body` as the coverer — `KP5-02` closed |
| `shapeComplaint` vs `Timestamp` over date-shifting offsets and two-digit years | offsets now agree; **years 0001–0099 diverge** — `KP6-05` |
| `ignoredPatternsIn`/`whyRefused` extracted and run over five forms | `netlify/**`, `.virgil/**`, `zz/**`, `**` all **refused**; a `paths:` allow-list **not seen at all** — `KP6-12` |
| the new env test's logic over the real and a mutated `instruct.yml` | real: 0 problems; `RUN_ID` env block removed: **caught**; a one-line `run:` using `$UNDECLARED`: **not seen** — `KP6-11` |

---

## Blocking findings

**None.**

---

## Major findings, none blocking

### KP6-01 — the new artifact guard matches the *spelling* of the escape, not the escape. A functionally identical instruct client, written with its endpoint and header in constants, compiles to an artifact both patterns pass. The minifier performs exactly that transform on this build today.

**Severity: major. Non-blocking — a weakness in a check, not a defect in the product.** `apps/mission-control/e2e/verify-owner-build-v11.ts:495-513`. Concerns `KP2-10`'s acceptance criterion: *the Owner Build has no way to reach the network*.

The brief asked whether `KP5-01`'s repair is a genuine closure or a narrowing that stops catching what it existed to catch. **It is both, and the two answers are separable.**

It is a genuine closure of the regression as it exists. I compiled the mutant rather than trusting the claim — the shipped `vite.owner.v11.config.ts`, one `define` flipped to `__LIVE__: true`, output to the scratchpad — and ran the two patterns against 7.3 MB of real output:

```
mutant-live/owner-v11.js   fetch pattern FIRES   header pattern FIRES
v11-s4-virgil-f79a39ae1b.html   fetch pattern silent   header pattern silent
```

The fetch pattern is broader than the list it replaced: it refuses `fetch(` to **any** `/api/` path, where the old check named two. That is a real widening and I record it as one.

The narrowing is this. Both patterns depend on a string literal standing *at* the call site. That is a property of how the minifier happened to emit today's code, not a property of the escape. The proof is in the artifact itself: the one string the repair **dropped** is dropped precisely because the minifier hoisted it —

```
var lW=new q(1,0,0),uW=`virgil.instruct.secret`;function dW(){…localStorage.getItem(uW)…}
```

— and the same hoist is available to the endpoint and the header the moment either is used twice or assigned to a name. I built that case and minified it with the repository's own esbuild:

```js
// source: a client identical in behaviour to liveSession.ts
const ENDPOINT = '/api/instruct';
const HEADER = 'x-virgil-secret';
headers[HEADER] = secret;
await fetch(ENDPOINT, { method: 'POST', headers, body: text });
```
```js
// minified output
var u="/api/instruct",y="x-virgil-secret";
async function E(n,t){let o={"content-type":"application/json"};return o[y]=t,(await fetch(u,{…})).json()}
```
```
NEW  fetch pattern   => silent
NEW  header pattern  => silent
OLD  /api/instruct x1      x-virgil-secret x1     ← the check this replaced would have fired twice
```

So an Owner Build carrying a whole live instruct client passes the new guard, and would have failed the old one. That is the definition of a narrowing, and it is not hypothetical: it is one `const` away, in a file whose other secret-bearing constant is already written that way.

**The runtime half is not a full backstop, for the reason `KP2-10` was raised.** `verify:owner:v11` proves the running page makes no off-document request — I watched it pass — but `KP2-10`'s whole point was that a runtime check proves a branch was not taken, not that it cannot be. The artifact guard is the part that was supposed to answer that, and it now answers a narrower question than it did.

**Offered as scope, not as a plan, and deliberately not as the prohibited shape.** Three honest directions exist and I do not choose between them: match the literal wherever it is bound rather than only at the call site (`[`'"]\/api\/[a-z]+[`'"]` anywhere, which is the old check with the document collision solved differently); or keep the substring check and constrain its *input* — assert that no node in the derived graph carries an `/api/` path, which puts the guard on the thing that caused `KP5-01` instead of on the thing that detected it; or count rather than detect, requiring the occurrences of `/api/` in the artifact to equal exactly the occurrences in the compiled graph. Whoever repairs this should say in the commit which they chose.

### KP6-02 — the comment written to justify the repair states that `owner-build-v11.test.ts` holds the new patterns. It does not. No test in this repository mentions them.

**Severity: major. Non-blocking.** `apps/mission-control/e2e/verify-owner-build-v11.ts:490-492`. Fails `CLAUDE.md`'s *a builder's success report is not evidence* as applied to the repository's own prose about itself.

The comment's final paragraph reads:

> **Proved by mutation, not by reading.** … `owner-build-v11.test.ts` holds the patterns so they cannot quietly loosen again.

I checked both halves. The first is true — I reproduced the mutation myself and it is `KP6-01`'s own evidence. The second is false at this SHA:

```
grep -rn "liveModeCode|x-virgil-secret" over apps/mission-control/test, packages, *.test.ts
  → apps/mission-control/test/instruct-v11.test.ts:37 only, which is about the
    *function's* header read, not about the artifact guard
git log -1 --oneline -- apps/mission-control/test/owner-build-v11.test.ts
  → 00e1f1a, untouched by this round and by the two before it
```

Nothing holds the patterns. `required-checks-v11.test.ts` reads `verify-owner-build-v11.ts` as text and asserts `pathToFileURL`, `off-document requests` and the viewport split; it does not mention either regex. So both patterns can be weakened, or deleted outright, and `pnpm test` stays green — which is exactly the condition `KP5-03` was raised about for `verify:web`, one file over, created in the same round that closed it.

The sentence matters more than the missing test. This is the fifth review of a candidate whose recurring defect is a statement stronger than what backs it, and the statement here is inside the paragraph headed *"Proved by mutation, not by reading."* Two assertions in one paragraph; one proved, one asserted; presented identically. Two lines of `expect(verify).toContain(...)` close the gap, and the comment should not say the words until they do.

### KP6-03 — the repair the owner was told about is not the repair performed, and the property he was assured of is no longer true. `OD-0014` reproduces the question and does not record the divergence.

**Severity: major. Non-blocking. It is the owner's to settle, not mine.** `docs/decisions/OD-0014-fifth-repair-round-authorised.md:15`; `apps/mission-control/e2e/verify-owner-build-v11.ts:495-513`; commit `f79a39a`. Concerns `AUTHORITY_TIERS.md` *Authority grants* and *Ratchet*, and `CLAUDE.md`'s authority order.

`OD-0014` quotes the question put to the owner, which is to its credit:

> **1. Authorise a fifth round?** If yes, I'd fix `KP5-01` by renaming the record's file so it doesn't contain a URL path — **the guard stays exactly as strict**.

The owner answered `"yes"`.

Neither clause survived contact. `OD-0012`'s filename is unchanged — `git diff --name-status f7e90ac..f79a39a -- docs/decisions` shows `M`, not `R` — and the guard was rewritten instead. And the guard is **not** exactly as strict: it is broader in one dimension (any `/api/` path rather than two), narrower in two (a literal at a call site rather than anywhere; the storage key dropped entirely), and `KP6-01` is a proven case the old guard caught and this one does not.

I want to be exact about what is and is not wrong here.

**What is defensible, and I weigh it.** The disclosure is not absent. The commit title announces the different choice — *"KP5-01 closed by making the check ask what it means, not by making it look away"* — the commit body names the storage-key loss and says why, and the source comment devotes a paragraph to it under the heading *"a loss worth stating rather than hiding"*. The fourth review explicitly invited either of two shapes and this is one of them. And on the merits I judge the chosen repair **better** than the one described to the owner: renaming one file would have left a substring check that the next decision record with a path in its title trips again, which is `KP6-04` below.

**What is not defensible is where the disclosure sits.** It is in a commit message and a code comment. The owner reads decision records — `OD-0012`'s own stated purpose is *"so he should be able to check it against what he agreed to"*. `OD-0014` is the record of this instruction, it was written by the session that then chose differently, it is in this diff, and it says nothing about the change of plan. A record that quotes a question verbatim and does not say the answer was implemented another way leaves the owner holding a sentence — *"the guard stays exactly as strict"* — that is now false, in the one document he is expected to check against.

This is `KP5-14`'s family in a new form, and the form is worth naming precisely because the record tried hard to avoid the old one. `OD-0011` widened the *scope* and disclosed the widening in a section heading. `OD-0014` did not widen the scope — see below, where I judge it succeeded at that — and instead diverged on the *substance* of the one repair the owner was told about, without a heading. On magnitude it is much better. On disclosure, in this one respect, it is worse.

**None of this blocks, and I am not asking for the repair to be undone.** The engineering is the right call. What is owed is a sentence in `OD-0014`, or an `OD-0015`, of the same kind as the `OD-0012` correction this round made well: *the repair described in question 1 was not the repair performed; here is what was, and here is what "exactly as strict" now means.* It is `ownerInstructedOnly`, so it is his to authorise and not a session's to add.

---

## Minor findings

### KP6-04 — the new guard is still trippable by a document. A decision-record title that quotes the call fires it, and the comment's claim that *"prose contains no calls"* is stronger than true.

`apps/mission-control/e2e/verify-owner-build-v11.ts:481-486`; commit `f79a39a` body.

The comment says the patterns are *"unreachable by prose, because a document does not contain a call"* and *"what prose never writes, because prose does not put a colon after it."* Prose that quotes code contains calls, and this repository's decision-record titles quote code as a matter of style — `OD-0012`'s own title is `` OD-0012 — `/api/state` stays unauthenticated (Tier 3) ``. I ran three titles of exactly that house style through `JSON.stringify`, which is how they reach the artifact:

```
FIRES   fetch pattern   <- OD-0015 — why `fetch('/api/state')` is called on every open (Tier 3)
FIRES   header pattern  <- OD-0016 — the `x-virgil-secret`: header and who may set it
FIRES   fetch pattern   <- KP2-10 — the artifact must carry no fetch('/api/instruct') call
```

The backtick is inside both character classes, so markdown code spans match as readily as source quotes. The third example is the one to look at: it is a plausible title for a record *about this very finding*.

The class is genuinely narrowed — a bare mention of the path no longer fires, which is what broke the build — and that is the substance of the repair. It is not eliminated, and the sentence saying it is eliminated is the kind of sentence this series exists about. One clause fixes the prose; making it true of the code needs `KP6-01`'s repair anyway.

### KP6-05 — `KP5-04`'s repair closes the offset divergence and opens a third one, for years below 100. The same three lines have now produced a wire/schema divergence in three consecutive rounds, and the extended battery still cannot see it.

`netlify/functions/state.mjs:269-297`; `packages/agent-contracts/src/common.ts`; `apps/mission-control/test/live-state-v11.test.ts:706-715`.

The offset half is genuinely closed and I measured both sides:

```
reportedAt "2026-09-10T01:00:00+05:00"   wire accepts   schema accepts   ← KP5-04, closed
reportedAt "2026-09-10T23:00:00-05:00"   wire accepts   schema accepts   ← KP5-04, closed
reportedAt "2026-02-30T00:00:00Z"        wire REFUSES   schema REFUSES   ← KP4-09, still closed
```

And `Date.UTC(year, month - 1, day)` maps a year below 100 to 1900 + year, so:

```
reportedAt "0026-09-10T12:00:00Z"        wire REFUSES   schema ACCEPTS   ← new
reportedAt "0099-12-31T12:00:00Z"        wire REFUSES   schema ACCEPTS   ← new
reportedAt "0100-01-01T12:00:00Z"        wire accepts   schema accepts
```

The exposure is negligible — nobody writes a year-26 timestamp, and `scripts/virgil-status.mjs` writes `new Date().toISOString()`. The pattern is not negligible. `KP4-09` found two divergences here; its repair created `KP5-04`; that repair created this. Each time the fix was three lines, each time the generated battery was extended by exactly the cases the last reviewer named, and each time the next divergence was outside it. Three offsets were added this round and no year below 100; the battery is a list of remembered cases wearing the shape of a generator. `Date.UTC` has a documented `setFullYear` escape and it is one line. The more useful change is to the battery: a value class it does not enumerate is a value class it cannot protect, and the disclaimer `KP4-09` attached to it has now done its work three times.

### KP6-06 — *"each of 4 report states says its own sentence"* asserts three. The dead `!== 'absent'` clause shows the fourth was meant to be there.

`apps/mission-control/e2e/verify-web-build.ts:119-162, 444-466`.

`KP5-08(a)` is closed in substance and I watched all three new states drive through the real page. But the line the run prints is:

```
web build verify: … each of 4 report states says its own sentence at 3s
```

`REPORT_STATES` holds three entries. The fourth — `absent` — is the main `ANSWER`, and the main phase asserts the branch, the repository and the check counts, and **never** asserts that the badge says no session wrote a report. So the sentence that state must produce is required by nothing, which is the exact condition `KP5-08(a)` was raised about for the other three.

That this is an oversight rather than a choice is visible in the loop itself: `if (scenario.state !== 'absent' && …)` guards against a state the array does not contain, so the condition is always true. Somebody meant `absent` to be in the list. One entry closes it and makes the printed line true.

### KP6-07 — `KP5-12`'s first repair replaced one unsupported sentence with another. *"because nothing is in progress"* is false when a role without a station holds the work, which this round's own new documentation records as a live case, and unsupported when nothing was read.

`apps/mission-control/src/world/window/windowContent.ts:1372-1387`; `apps/mission-control/src/world/live/liveState.ts:358`; `docs/architecture/ENFORCEMENT_BOUNDARIES.md`.

The brief asked whether the new sentences are true in every state, including ones nobody tested. One of the two is not.

```ts
state.content.active
  ? 'No decision is needed yet. The work is still in progress.'
  : 'No decision is needed yet, because nothing is in progress.',
```

`active` is `STATION_NAME[report?.holder ?? ''] ?? null`. It is null in two situations that are not *nothing is in progress*:

1. **The answer could not be read.** With the endpoint failing — the state the previous Keeper found this defect in — there is no report, `active` is null, and the page now asserts that nothing is in progress. It does not know that. The old sentence claimed work was happening; the new one claims work is not. Both are claims about the world drawn from an absent read, which is the family the repair's own comment names.
2. **A role with no station holds the work.** `liveState.ts` maps `fabricator`, `prover` and `keeper` and maps the other eleven roles to nothing, so a report saying the Architect holds the work produces `active: null`. This is not speculation: `ENFORCEMENT_BOUNDARIES.md` records it as an accepted gap, and this round added a section to that same file. So the repository documents, in the file this round edited, the condition under which the sentence this round wrote is false.

The second half of `KP5-12` was repaired correctly and is worth holding up beside it: `'THE KEEPER HAS NOT FINISHED ITS REVIEW YET.'` became `'NO REVIEW HAS BEEN REPORTED.'` — a statement about what was reported, which stays true in both situations above. The first half needed the same move and did not get it. *"No decision is needed yet."* on its own was already true everywhere; the clause added after the comma is the whole of the defect.

Neither sentence is asserted by any test. `grep` over `apps/` returns the source lines and nothing else, and the hosted-build verifier's failed-answer phase checks only that no *recorded* value appears. `KP5-07` was *"the one repair in this round with no executable guard"*; this round has two, and they are the two a person reads.

### KP6-08 — the words on the verdict slab were repaired and the mark beside them was not. With no verdict and nothing holding the work, the slab draws a turning "working" ring in cyan.

`apps/mission-control/src/world/screens/v11/content.ts:283-302`; `screens.ts:443`; `marks.ts:99`.

The `default` branch returns `mark: 'working'` and `status: 'cyan'` unchanged. `screens.ts:443` draws `statusMark(primary.mark, t)`, and `marks.ts`'s `'working'` case is *"one bright segment turning: a twelve-second revolution"* — the grammar's sign for work in progress. So on the hosted page with the endpoint failing, the text now says `NO REVIEW HAS BEEN REPORTED` and the graphic beside it turns.

`REVIEW_POLICY.md` requires that two different states are *"never distinguished by colour alone"*; the converse obligation, that two different states are not **conflated** by a shared animation, is the same principle and is what the operational animation grammar exists for. Four lines below, the same file already draws the distinction correctly for the row beneath — `content.active ? 'working' : 'standby'`. A repair that changes the sentence and leaves the sign is half a repair on the one surface whose subject is the difference between what is known and what is shown.

### KP6-09 — the CSP repair swapped a first-policy read for a last-policy read. Neither knows what path a policy applies to, and `netlify.toml`'s second `[[headers]]` block is `/assets/*` — the exact place a second policy would be written.

`apps/mission-control/e2e/verify-web-build.ts:51-71`; `netlify.toml:51-60`.

The security half of `KP5-10` is closed and strengthened: every policy in the file must now be free of `script-src 'unsafe-inline'`, not just the first. That is right and I record it as closed.

The serving half moved sideways. `const CSP = policies[policies.length - 1]` picks the **last** policy, and the comment states the rule it is implementing:

> every one must be free of the allowance, and **the last is the one the page is served under**.

That is not how Netlify resolves headers — it matches by the block's `for =` path, and the file's two blocks are:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self'; …"

[[headers]]
  for = "/assets/*"
  [headers.values]
```

Today there is one policy, so first and last are the same and nothing is wrong in effect. The moment someone adds a `Content-Security-Policy` to the `/assets/*` block — which is the only other block there is, and the natural place to tighten asset headers — the verifier will serve the **asset** policy to the **page** and prove the page runs under a policy it is never sent. The old code would have been right in that case by accident; the new code is wrong in it by rule. The check has no notion of `for =` at all, in either version, and that is the thing worth adding: associate each policy with its path and serve the page the one whose pattern matches `/owner-v11.html`.

### KP6-10 — the `KP5-08(c)` repair restores `KP4-03`'s construction in the case it was written for. My predecessor prescribed the cheap form and the cheap form is the wrong one.

`apps/mission-control/src/world/mobile/MobileRoom.tsx:888-899`.

The fall-through branch now reads:

```tsx
No session has written a report, so nobody is shown working. {live.answer?.sessionReportReason ?? ''}
```

In the ordinary `absent` state this is merely redundant — *"No session has written a report… No session has written `.virgil/state.json` on this branch."* In the state it was written for, it is not. The hazard `KP5-08(c)` named is an older function in front of a newer page: a refusal arriving with a reason and **no** `sessionReportStatus`, which falls through to here and now renders

> No session has written a report, so nobody is shown working. `.virgil/state.json` has no readable time on it.

That is `KP4-03` word for word — the finding quoted eighteen lines above in this same file: *"announced that no session had written a report and then printed the reason one had been refused, in the same sentence. Two statements about one fact, and the first of them false."* The repair restores the defect in the only situation that motivates it.

**The fourth Keeper proposed this fix — *"A `?? ''` on the reason costs nothing"* — and I am correcting my predecessor rather than the builder's judgment.** The cost is not nothing; it is the first sentence. The branch needs to condition the leading claim on the reason's absence, not append the reason to it: with a reason present the honest sentence is *"A session's report could not be used: …"*, and *"No session has written a report"* should be said only when nothing was.

### KP6-11 — the new env test cannot see a one-line `run:`, and `instruct.yml` contains one. The title says *"every variable its commands use."*

`apps/mission-control/test/instruct-v11.test.ts:143-173`; `.github/workflows/instruct.yml:113`.

`KP5-06` is closed on its substance and I proved the test catches the regression rather than reading that it does. Extracting the test's own logic and running it over the real file and a mutant with the `env:` block removed:

```
real instruct.yml:                     steps=11 problems=0
mutated, KP5-06 env block removed:     steps=11 problems=1
   step "Say that a session has started" uses $RUN_ID and does not declare it
```

That is a real guard, it names the step and the variable, and it would have caught the defect. Two gaps in a title that says *every*:

```
with a one-line run: using $UNDECLARED:  steps=12 problems=0
```

`if (step.indexOf('run: |') === -1) continue` skips every step whose `run:` is not a block scalar. `instruct.yml:113` is such a step today (`run: pnpm install --frozen-lockfile`), so the form is in use in the file the test guards; the next one-liner that interpolates a variable is invisible. And the `used` regex `[A-Z_][A-Z0-9_]*` sees only upper-case names, so `$branch` is unexamined. Both are one character of regex each. The second is arguably fine by convention; the first is a hole in the file the test is about.

### KP6-12 — `KP5-05`'s second half is unrepaired and recorded nowhere. A `paths:` allow-list still takes the whole gate off and the test does not see it.

`apps/mission-control/test/required-checks.test.ts:236-263, 351-373`.

The principal half is genuinely and well closed — inverted to refuse by default, with an empty `PERMITTED_TO_IGNORE` whose emptiness is explained in place. I extracted `ignoredPatternsIn` and `whyRefused` verbatim by line range and ran them outside the repository:

```
REFUSED   paths-ignore: ['netlify/**']     ← KP5-05's own example, now caught
REFUSED   paths-ignore: ['.virgil/**']
REFUSED   paths-ignore: ['zz/**']          ← the unrecognised-directory hole, closed
REFUSED   paths-ignore: ['**']
NOT SEEN  paths: ['docs/**']               ← extracted 0; never reaches the judgment
```

`KP5-05`'s closing paragraph said the `paths:` allow-list *"is a second, equally complete way to disable the gate and is outside both the title and the body. It is worth a line in the same place."* The keys regex is still `(?:paths|branches|tags)-ignore`, no fixture exercises an allow-list, and nothing in `ENFORCEMENT_BOUNDARIES.md` or elsewhere records it as open. The commit message lists `KP5-05` among those *"also repaired"*. Half of it is. An allow-list naming `docs/**` would skip the full gate on every source change and this suite would stay green — under the heading *"the gate runs in full before anything can merge."*

### KP6-13 — `KP5-10`'s first half is unrepaired and recorded as repaired. The one wall-clock wait is still 120 seconds and still surfaces as a bare `TimeoutError`.

`apps/mission-control/e2e/verify-web-build.ts:391-393`.

`KP5-10` named two things; the commit lists it among those repaired; one was. The first wait is unchanged:

```ts
await page.waitForFunction(() => document.querySelectorAll('canvas').length > 0, undefined, {
  timeout: 120_000,
});
```

The finding accepted that this wait *cannot* use the derived budget, since there is no page to time until the canvas exists. Its residual was the other part: at the 6,678 ms frame quoted for a slow runner, 120 s is eighteen frames, and when it fires it surfaces as a `TimeoutError` naming a line number with no sentence saying what was being waited for. Neither is addressed. The same wait *inside* the new `REPORT_STATES` loop correctly uses `budget`, which shows the author had the mechanism in hand. A `.catch()` that throws a sentence — *"no canvas appeared within 120 s: the hosted page did not start"* — is the whole of the fix, and a check that fails with a line number in a repository whose subject is legible failure is worth the two lines.

### KP6-14 — a failing `verify:web` now costs one full budget per unreachable control. I measured 608 s against 3 s healthy; on the slow runner that approaches the job's own timeout.

`apps/mission-control/e2e/verify-web-build.ts:305-378`; `.github/workflows/checks.yml:203-208`.

`KP5-02` is closed and I proved it by reproducing the previous Keeper's overlay exactly — `dist/web` copied outside the repository, one CSS rule adding a full-viewport `body::after`, the verifier's own code run against it:

```
web build verify: FAIL
  - .v11-badge cannot be pressed: body is on top of it at its own centre. A control the
    owner's thumb cannot reach is not a working control, however fast the machine is.
  … (×4 more presses, each with the same finding)
  - the badge does not name the branch it was told
  - with a refused report the badge does not say so
  - with the endpoint failing, no window opened to be checked
EXIT=1
```

Exit 1, with the cause named correctly and the coverer identified. The `body.contains(element)` mistake the builder self-reports is genuinely gone — `top === element || element.contains(top)` is the right test and I confirmed it fires on the overlay.

The cost: that run took **608 seconds** where the honest run took **3**. Every unreachable control burns the whole click budget before the reachability probe runs, and there are five presses. The budget's floor is 60 s, so the floor cost of a fully covered page is ~300 s. On this SHA's CI the step took 5 s, so the runner was fast and the margin is wide. At the 6,678 ms frame the previous review quotes for a slow runner the budget is 201 s, five presses is ~17 minutes, and the job's `timeout-minutes: 20` also has to cover checkout, install, a browser install and `build:web`. The failure mode is unpleasant in a specific way: the job is cancelled for timeout and the eleven lines above — the entire point of the repair — are never printed. The fix is free, because the probe that decides reachability does not need the click to have failed first: run `elementFromPoint` **before** `page.click`, and a covered control fails in milliseconds.

### KP6-15 — the new accepted-gaps register omits two of the five findings the fourth review recorded as open, while reading as complete.

`docs/architecture/ENFORCEMENT_BOUNDARIES.md:266-276`.

`KP5-16` is closed: `KP2-14` is now written into the documented register with the reason it is not a session's to repair, and the reason is accurate — `OD-0010` endorses the fingerprint that guards the file. The table also carries `KP2-08`, `KP3-06`, `KP3-11` and `KP2-11`, each with an honest account.

Its heading is *"Accepted gaps carried out of the Phase 2 review series (recorded, not repaired)"* and its lead sentence is *"These are the gaps a session may not close."* `grep` for `KP2-18` and `KP3-07` in that file returns nothing. The fourth review's own closing list names five open findings; two are absent. `KP3-07` (the repository is private) is arguably the owner's circumstance rather than a gap, and `KP2-18` (the language pass is unverifiable) is `INSUFFICIENT_EVIDENCE` rather than an accepted gap — but a register that says *these are the gaps* and omits two of them sends the reader who consults it away with a shorter list than the reviews hold, which is the condition `KP5-16` was raised about. Two rows, or one sentence saying what the table's scope is.

### KP6-16 — `OD-0013` was added to a protected path at `3d28852`, under no grant in force that named it. It is in this diff.

`docs/decisions/OD-0013-branch-protection-deferred.md`; `constitution/authority.json` `boundaryProtection.ownerInstructedOnly`; `OD-0011`, `OD-0014`.

I record this as an observation and not as a breach, and I say why on both sides.

`OD-0014`'s boundary clause is careful, and to its credit: it names `docs/decisions/OD-*` — the omission `KP5-14` found in `OD-0011` — and states that *"this grant permits exactly two acts on it — filing this record, and the correction of `OD-0012`."* Both of those acts were performed and nothing beyond them was, under this grant.

The reviewed range contains a third act on that path. `3d28852` added `OD-0013` while `OD-0011` was still in force, and `OD-0011`'s permitted actions were the repair of the fourth review's findings; filing a new owner decision about branch protection is not among them, and `OD-0011` did not name the path at all, which is `KP5-14`'s finding. So the act sits in a gap between two grants rather than inside either.

Two things make this small. `docs/decisions/OD-*` is `ownerInstructedOnly`, not `sessionDenied`; `OD-0006` is the mechanism by which a session transcribes an owner instruction, and `OD-0013` records one. And `OD-0013` is, on its merits, one of the better records in this repository: it separates what GitHub stated from what was observed, states plainly that *"no session verified that the rule is not enforced"* because the only conclusive test is a push to `main` which `CLAUDE.md` forbids, and refuses to record `KP3-06` as closed. I would not want it unwritten. I record only that the authority under which it was written is not named anywhere, and that the practice `OD-0014` adopted — naming the protected path in the grant — is the thing that stops this recurring.

### KP6-17 — the room will say *"twelve more repaired."* Two of the twelve are half.

`.virgil/state.json:29`.

```json
"note": "Fifth round complete under OD-0014. KP5-01 closed and proved by mutation; twelve more repaired."
```

The twelve are `KP5-02` through `KP5-12` and `KP5-16`, and the count is arithmetically right. `KP5-05` and `KP5-10` are each closed on one half and open on the other (`KP6-12`, `KP6-13`), and neither residual is recorded anywhere a reader looks. This is `KP3-11`'s accepted shape — a session's word about itself, drawn on the owner's screen and labelled as their word — so it is not a new category of problem. It is worth one line because the surface it reaches is the one the owner reads, and because "repaired" is doing more work in that sentence than the repairs support. `aboutCommit` is `7e764fb`, the previous commit, which is inherent to writing the file before committing it and is checked against the head by nothing; unchanged and correctly not claimed otherwise.

---

## `OD-0014` judged as a record

The brief asked whether `OD-0014` succeeded at being narrower than `OD-0011`, or repeats the fault in a new form, and asked me to judge what *"yes proceed"* settles about the cycle ceiling. I judge it **substantially successful, better than `OD-0011` on every axis `KP5-14` named, and wrong in one new place**, which is `KP6-03`.

**Against `AUTHORITY_TIERS.md`'s five requirements of a grant.** Tier, permitted actions, boundary, expiry and stop conditions are all stated, each as its own clause. Satisfied.

**Where it fixed what `KP5-14` found.**
- It draws an outer fence `OD-0011` had none of: *"No finding outside that review is in this grant"*, and *"where a KP5 finding names an older one, the repair is of the KP5 finding as written and not of the older one's remaining scope."* I checked the diff against that fence and the round stayed inside it. Nothing outside `KP5-01`–`KP5-16` was repaired.
- It names `docs/decisions/OD-*` in its own boundary and limits the acts on it to two. That is the precise omission `KP5-14` found, closed.
- It refuses to be precedent, in terms: *"the thing a future session should not do with this file: cite it as precedent that a ceiling can be raised by asking."*
- It sets an expiry that ends at this verdict and authorises nothing after it.
- No commit to `main`, no merge, no change to `constitution/`, `docs/product/` or `knowledge/raw/`, no credential handled. I verified all of those against the diff and the API rather than against the record.

**Is the scope wider than the question?** The question named one finding; the grant covers fourteen. I weighed this hard and I do not call it a repeat of `KP5-14`. *"A round"* has meant, in every previous cycle of this series, the repair of the outstanding review's findings, and the parenthetical about `KP5-01` reads as an illustration of how the blocking one would be handled rather than as the whole of the work. A grant scoped to one review's findings, explicitly fenced against everything else, is the narrowest reading of *"a round"* that leaves the word meaning anything. `OD-0011` extended across three reviews' findings and described its own extension as an extension; this did neither. That is real improvement and I record it as such.

**Where it repeats the fault in a new form.** On the one concrete thing the owner was told — the rename, and *"the guard stays exactly as strict"* — the record reproduces the question and never records that the answer went another way. The scope did not widen; the substance diverged, and the divergence is disclosed in a commit message and a source comment rather than in the document the owner checks. That is `KP6-03` and it is the only material fault I find in the record.

**Question 2, and what *"yes proceed"* settles.** I judge this section **correct, and the best handling of the cycle ceiling this project has produced.** It states what the two words do settle — that this round proceeds, with the cycle count in front of the owner when he gave them — and then states plainly what they do not:

> **What it does not settle, and this record will not pretend otherwise:** which reading of `repairLimits` is correct. Two words authorise a round; they do not amend a constitution, and `constitution/` is `sessionDenied` — no session may write there, so the ambiguity stands exactly as `KP5-14` describes it.

That is `CLAUDE.md`'s rule — *"a session that finds a contradiction reports it; it does not resolve it silently"* — performed correctly, and it is the difference between this record and `OD-0011`, which chose the permissive reading and moved on. `OD-0014` does not choose. It names the two readings, identifies which authority can settle them, and says the settling is worth doing. A session declining to resolve a rule about its own permission to keep working is the right instinct and I want it on record as such.

**The constitutional position at this SHA, stated as fact.** `authority.json` writes `maxCyclesWithoutOwner: 1`, `maxCyclesWithOwner: 2`, `beyondLimit: "OWNER_DECISION_REQUIRED"`. `REPAIR_LIMITS.md` writes *"Beyond the owner-extended limit the candidate stops and the run enters `OWNER_DECISION_REQUIRED`."* Five cycles have run on this lineage. Each was authorised in isolation, and `REVIEW_POLICY.md`'s list of what the gate engine is supposed to compute still includes *"repair-cycle count"* — and nothing in `packages/gate-engine` computes one for this run, so the limit is held by prose in documents the sessions read about themselves. `KP4-02` said that. `KP5-14` said it again. It is still true, it is still not a session's to fix, and it is not new, so I raise no `KP6-` number for it and carry `KP5-14` forward open.

**One thing no record in this repository can establish, and I say it as my predecessors did.** Nothing here holds an independent copy of the owner's words. `OD-0014`'s three quoted answers, and the questions quoted around them, rest on the filing session's honesty and on nothing else — `OD-0006` says so of the mechanism itself, and `OD-0014` repeats it in its own first paragraph. That applies to the four review files too, including this one. The owner reading his own decision records is the only detection of a false one.

---

## Carried forward, each checked at this SHA

| | Status at `f79a39a` | Evidence |
|---|---|---|
| **KP5-01** guard fired by a document's name | **Closed.** `verify:owner:v11` exit 0 here; the mutant with `__LIVE__` true is caught by both patterns; `/api/state` still refused as a fetch target; residuals `KP6-01`, `KP6-02`, `KP6-04` | my own uncached run; mutant compiled here |
| **KP5-02** `press()` passed an unpressable page | **Closed, proved by mutation.** The overlay page now exits 1 naming `body` as the coverer; the `body.contains` mistake is gone; the PASS line carries the fallback count | overlay copy run outside the repository; residual `KP6-14` |
| **KP5-03** `verify:web` held by nothing | **Closed.** Four assertions — root `check`, turbo `dependsOn`, `cache: false`, the two workflow run steps | test read; `package.json`, `turbo.json`, `checks.yml` read |
| **KP5-04** UTC-versus-local date comparison | **Closed for offsets; a third divergence opened** — `KP6-05` | measured, both sides |
| **KP5-05** ignore list permitted by default | **Closed on the inversion**, with `KP6-12` on the `paths:` half | judgment extracted and run over five forms |
| **KP5-06** `$RUN_ID` undeclared | **Closed, and the test catches it.** `env:` block added; the new test named the step and the variable in my mutant | mutation run outside the repository; residual `KP6-11` |
| **KP5-07** check counts drawn, asserted by nothing | **Closed.** The verifier supplies `{total:7,passed:5,failed:1,running:1}` and asserts the sentence through the page | verifier run here |
| **KP5-08** report states, secret, fall-through | **(a) Closed for three of four** — `KP6-06`. **(b) Open:** the verifier still writes no `virgil.instruct.secret`, so the configured state is still never seen. **(c) Repaired as prescribed, and the prescription was wrong** — `KP6-10` | verifier read and run |
| **KP5-09** progress line announced the negative it disproved | **Closed.** `mark(...)` moved into the `else` | my own passing run prints it only on success |
| **KP5-10** wall-clock wait; first-policy CSP | **Closed on the CSP with a new fault** — `KP6-09`. **First half unrepaired** — `KP6-13` | source; `netlify.toml` read |
| **KP5-11** four filenames hand-written | **Closed.** `readdirSync` over `vite*.config.ts`, five configs found, `__LIVE__: true` in exactly one. A config outside that directory is still unseen, which is a much narrower residual and I do not number it | test read; five configs read |
| **KP5-12** two unsupported sentences | **(b) Closed, correctly.** **(a) Repaired into a different unsupported sentence** — `KP6-07`; the mark is unchanged — `KP6-08`. **(c) the lowercase clause after a full stop is untouched**, cosmetic, recorded here rather than numbered | source read; `liveState.ts` mapping traced |
| **KP5-13** false sentence in `OD-0012` | **Corrected, well.** Struck through, quoted, correction dated beside it with the finding that caused it, decision untouched, on the owner's instruction under `OD-0014` question 3 | diff read |
| **KP5-14** `OD-0011` read wider than the question; cycle ceiling | **Answered by `OD-0014`, and improved on.** The scope fault is not repeated; `KP6-03` is a new form of it. The ceiling is honestly left unresolved and remains **open** for the owner | record read against `AUTHORITY_TIERS.md`, `REPAIR_LIMITS.md`, `authority.json` |
| **KP5-15** reviewed SHA stopped being the head | **Does not recur.** Local, remote and PR #8 all read `f79a39a` at review start and at review end | `git ls-remote`, PR API, twice |
| **KP5-16** `KP2-14` recorded only in a test title | **Closed**, with `KP6-15` on the register's completeness | `ENFORCEMENT_BOUNDARIES.md` read |
| **KP2-08** `/api/state` unauthenticated | **Accepted by the owner**, `OD-0012`. Not repaired, correctly not claimed | handler re-read; no secret, method or origin check |
| **KP2-11** agent step bounded by prose | **Open, unchanged**, now recorded in the register | file read |
| **KP2-14** `__LIVE__` undefined in V10's config | **Reported, not repaired, honestly**, now in the register | `OD-0010` read; digest test read |
| **KP2-18** language pass unverifiable | **Unchanged. `INSUFFICIENT_EVIDENCE`**, as before, and absent from the register — `KP6-15` | — |
| **KP3-06** `main` unprotected | **Open. Re-measured: `protected: false`.** Deferred by the owner, `OD-0013` | GitHub API |
| **KP3-07** private repository | **Open. Re-measured: `private: true`.** Absent from the register — `KP6-15` | GitHub API |
| **KP3-11** a session's report about itself | **Open, unchanged in kind** — `KP6-17`. At this SHA `holder: null`, all stations `READY`, `aboutCommit` the previous commit | file read |
| **KP2-06, KP2-07, KP2-09, KP2-10, KP2-12, KP2-13/KP3-12, KP2-15, KP2-16, KP2-17, KP2-19, KP3-08, KP4-01, KP4-03, KP4-04, KP4-05, KP4-06, KP4-07, KP4-08, KP4-09, KP4-10** | **Closed at the fourth review and unchanged here.** Nothing in this diff touches them except where a `KP6-` finding says so | diff read in whole |

---

## What I could not check, named rather than inferred

- **CI job logs.** `GET /actions/jobs/103168150654/logs` redirects to `productionresultssa4.blob.core.windows.net`, which the egress proxy refuses at CONNECT (`403`) — the same wall the fourth Keeper hit. So I have every job's conclusion, every step's conclusion and every duration from the API, and no log text from GitHub. Where I quote a check's output it is from my own run of the same command on the same SHA, and I say which is which.
- **The deployed site.** Still unreachable from here. Whether `KP2-08`'s exposure is live, and what stands in front of it, is unknown to me as it was to all four previous reviewers. `OD-0012` makes it the owner's question rather than a finding.
- **Token scopes, and whether the three secrets exist.** Unchanged and unchecked. `INSUFFICIENT_EVIDENCE` on those points specifically.
- **`pnpm verify:owner` (V10)** and **`export-schemas`**. Not run here; both write into the repository or take twenty minutes I spent elsewhere. Green in CI on this SHA and held by unit tests respectively. Stated rather than borrowed.
- **That the four previous review files are verbatim.** Nothing in this repository holds an independent copy of what those reviewers returned, so the word *verbatim* at their heads rests on the filing sessions' honesty and on nothing else. **That applies to this file too**, and the owner should read it knowing so.
- **The `__LIVE__: true` mutant is my compilation, not the shipped hosted build.** I flipped one `define` in the shipped V11 Owner Build config and directed the output outside the repository; the rest of the pipeline, including the gzip plugin, is the shipped one. That is the closest available thing to the artifact the check exists to refuse, and it is a compilation rather than a thing anyone ships.

---

## Is the candidate safe to merge?

**Yes, from this review's side, and the decision is the owner's.**

`REVIEW_POLICY.md` says a passing judgment never overrides a failing gate. No gate is failing. The SHA is pushed and equal on local and remote, it is PR #8's head, the diff stays inside permitted paths, every required check ran, all nine jobs are green on GitHub's runners, and I re-ran the two that have failed before — `verify:owner:v11` and `verify:web` — uncached, in this container, to exit 0. The check that failed at the previous candidate passes at this one, and it passes without the guard having been made to look away: I compiled the escape it exists to catch and watched it fire.

**Nothing in the eighteen findings above is a defect in the product that fails an acceptance criterion.** Three are major and all three concern the checks rather than the thing being checked: a guard narrowed to a spelling, a guard asserted to exist that does not, and a repair that diverges from what the owner was told. Fifteen are minor. None of them forecloses a merge, and a reviewer who blocked on them would be blocking on the difference between a good repair and a perfect one.

Four things belong in the owner's hand alongside this verdict.

1. **`KP6-03`.** You were told the fix would be a rename and that *"the guard stays exactly as strict."* It was neither. I judge the repair that was made **better** than the one described to you, and I would not want it reversed — but the record you check against still carries the sentence you were given, and no session may add the correction to it. One line from you closes it.
2. **`KP6-01` and `KP6-02` together.** The guard that now stands between the Owner Build and the network is one `const` away from silence, and the comment beside it says a test holds it in place when no test does. Neither is urgent; both are the kind of thing that is cheap now and expensive after the next refactor.
3. **`KP5-14`, still open and now honestly so.** Five cycles have run on one lineage where `authority.json` writes two. `OD-0014` is the first record in this series to decline to resolve that in its own favour, and it is right that only you can resolve it — by changing `authority.json` or `REPAIR_LIMITS.md`, which no session may touch. Until you do, each further round is a fresh Tier 3 decision made in isolation, and nothing computes the count.
4. **`KP3-06`.** `main` is still `protected: false`. Every green tick above, including all nine of them, is advisory. The gate I am declining to block on would stop nothing by itself.

On the pattern this series exists about — a rule written, a guard beside it, and no path by which the guard fires — I found it three times: at `KP6-02`, where a comment names a test that does not exist; at `KP6-06`, where a printed line counts four states and three are asserted; and at `KP6-11`, where a test titled *every variable* cannot see a whole syntactic form of the file it guards. That is the same count as the last round and a far better one than the two before it. Against it I record four closures proved by running rather than by reading — the artifact guard proved on a mutant I compiled, `press()` proved on an overlay I built, the ignore-list judgment proved on five forms I ran outside the repository, and the `env` test proved on a mutation of the workflow — and two repairs, `KP5-12(b)` and `KP5-13`, that did the harder and more honest thing when an easier one was available: changed a claim about the world into a claim about what was reported, and struck a false sentence through instead of quietly improving it.

The thing I most want on record is this. Four reviews ago this candidate's checks could be satisfied by a builder's sentence. At this SHA the two checks that most matter both failed for me on purpose, in ways nobody had arranged, and told me exactly what was wrong: the artifact guard fired on a build I compiled to make it fire, and the hosted-page verifier refused a page I had made unpressable and named `body` as the thing in the way. A check that can be made to fail on demand, with an accurate sentence, is worth more than a check that has never failed — and this repository now has several. The remaining work is to stop writing sentences that claim slightly more than those checks deliver, which is the whole of what `KP6-02`, `KP6-04`, `KP6-06`, `KP6-07` and `KP6-11` are about, and is a smaller kind of problem than the one this series started with.

I raise no finding I could not reproduce, and I have filled no gap with assumption.

**Verdict: `PASS_WITH_NON_BLOCKING_FINDINGS` on `f79a39ae1bd9ba4a6e59e8f10f6a73e3d154803f`.**
**Blocking: none.** Major, non-blocking: `KP6-01`, `KP6-02`, `KP6-03`. Minor: `KP6-04` through `KP6-17`.
`KP5-01`, `KP5-02`, `KP5-03`, `KP5-04`, `KP5-06`, `KP5-07`, `KP5-09`, `KP5-11`, `KP5-16` are closed and I record them as closed. `KP5-05`, `KP5-08`, `KP5-10` and `KP5-12` are closed on their principal half with the residuals numbered above. `KP5-13` is corrected on the owner's instruction. `KP5-15` does not recur. `KP5-14` remains open and is the owner's. `KP2-08` is accepted by owner decision; `KP3-06` is deferred by owner decision; `KP2-14` is reported honestly; `KP2-11`, `KP2-18`, `KP3-07` and `KP3-11` remain open, unrepaired and correctly not claimed as fixed.
**Stop reason:** none. `review_passed`, verdict `PASS_WITH_NON_BLOCKING_FINDINGS`.
**Next action:** the owner's decision on merge, and on the four items above. The non-blocking findings persist and stay inspectable under `REVIEW_POLICY.md`; they do not require a sixth repair round, and a sixth round would need its own Tier 3 decision, which `OD-0014` expires with this verdict and does not give.

---

Files that matter most, all absolute:

- `/home/user/Virgil-mission-control/apps/mission-control/e2e/verify-owner-build-v11.ts` (lines 438-514)
- `/home/user/Virgil-mission-control/apps/mission-control/e2e/verify-web-build.ts` (lines 51-71, 95-162, 303-378, 417-466, 533-539)
- `/home/user/Virgil-mission-control/apps/mission-control/src/world/window/windowContent.ts` (lines 1369-1388)
- `/home/user/Virgil-mission-control/apps/mission-control/src/world/screens/v11/content.ts` (lines 283-302)
- `/home/user/Virgil-mission-control/apps/mission-control/src/world/screens/v11/screens.ts` (line 443) and `/home/user/Virgil-mission-control/apps/mission-control/src/world/screens/v11/marks.ts` (line 99)
- `/home/user/Virgil-mission-control/apps/mission-control/src/world/mobile/MobileRoom.tsx` (lines 815-828, 888-899)
- `/home/user/Virgil-mission-control/apps/mission-control/src/world/live/liveState.ts` (line 358)
- `/home/user/Virgil-mission-control/netlify/functions/state.mjs` (lines 262-300)
- `/home/user/Virgil-mission-control/apps/mission-control/test/required-checks.test.ts` (lines 57-89, 236-373)
- `/home/user/Virgil-mission-control/apps/mission-control/test/instruct-v11.test.ts` (lines 143-173)
- `/home/user/Virgil-mission-control/apps/mission-control/test/live-state-v11.test.ts` (lines 526-545, 700-720)
- `/home/user/Virgil-mission-control/apps/mission-control/test/owner-build-v11.test.ts` (untouched; `KP6-02` is about what is not in it)
- `/home/user/Virgil-mission-control/.github/workflows/instruct.yml` (lines 112-135)
- `/home/user/Virgil-mission-control/.github/workflows/checks.yml` (lines 197-232)
- `/home/user/Virgil-mission-control/netlify.toml` (lines 51-60)
- `/home/user/Virgil-mission-control/docs/decisions/OD-0012-api-state-stays-unauthenticated.md` (lines 27-36)
- `/home/user/Virgil-mission-control/docs/decisions/OD-0013-branch-protection-deferred.md`
- `/home/user/Virgil-mission-control/docs/decisions/OD-0014-fifth-repair-round-authorised.md` (line 15 especially)
- `/home/user/Virgil-mission-control/docs/architecture/ENFORCEMENT_BOUNDARIES.md` (lines 266-276)
- `/home/user/Virgil-mission-control/.virgil/state.json`
- `/home/user/Virgil-mission-control/constitution/AUTHORITY_TIERS.md`, `/home/user/Virgil-mission-control/constitution/REPAIR_LIMITS.md`, `/home/user/Virgil-mission-control/constitution/REVIEW_POLICY.md`, `/home/user/Virgil-mission-control/constitution/authority.json`
