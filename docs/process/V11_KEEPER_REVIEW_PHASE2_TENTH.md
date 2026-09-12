# Keeper review — Phase 2 slice six, candidate `9fab21e`

**Verdict: `BLOCKED`.** Seven findings (`KP10-13` … `KP10-19`), one of them blocking. The two findings this re-review was called to test are **both repaired**, and the repair is better than the report it answers. It is blocked on something else: running the repair's own documented reproduction found a defect in the product, on this slice's headline property, and the repair makes the slice's acceptance check permanently unable to see it.

Reviewed: `9fab21eae1b599fa1ce4a8ca9bc0f2e49dc1b874`, diff `152d112..9fab21e`, 3 files, 292 insertions, 51 deletions, 1 commit. The whole branch (`91409d0..9fab21e`, twelve commits) was read for context; findings `KP10-01` … `KP10-12` from the ninth review are treated as standing unless repaired here. This session built nothing, repaired nothing and changed no file of the candidate. The candidate was read in a detached worktree; the experiments below were run in a second, throwaway worktree and nothing in the candidate was modified.

**Reproduced by the reviewer, not taken from the builder:**

| what | result |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm check` (all six stages) | **green**: biome 299 files, typecheck 8/8, tests 6/6, `verify:owner` PASS, `verify:owner:v11` PASS, `verify:web` PASS |
| `pnpm test` | **53 files, 2,036 tests, all passed** — of which `mission-control` is **37 files, 1,801 tests**, identical to `152d112` |
| `pnpm --filter mission-control verify:web`, stub answering immediately | **PASS at 20s** |
| `verify-web-build.ts` at `9fab21e`, **stub delayed 4s** | **PASS at 94s** |
| `verify-web-build.ts` at `152d112`, **same 4s delay** | **FAIL — 33 assertions across 8 case families** |
| `pnpm --filter mission-control mutate` | **19 mutations, every one behaving as the manifest records; 18 caught, 1 recorded as unguarded** |
| the candidate's own CI | **two runs, both green**: push run `34699396419`, pull-request run `34699398164` |

---

## The four things this review was set, answered

### 1. `KP10-01` — the gate. **Repaired, and verified in CI rather than read.**

`.github/workflows/checks.yml:208-210`: the `if: github.event_name != 'push'` line is gone from `verify-web`. The three expensive jobs keep it (`artifacts:244`, the V11 matrix `:298`, `reproducibility:350`), which is the distinction the commit argues for and the right one.

It is not taken on the workflow's word. GitHub reports **two** runs at `9fab21e`:

- **push** `34699396419` — *lint, typecheck, tests* **success**, ***hosted build, read and refused*** **success**, the three expensive jobs skipped.
- **pull_request** `34699398164` — all eight jobs **success**.

So the check that was red on `152d112` is green on `9fab21e`, and it now runs on a bare push, which is the half of `KP10-01` that mattered most: eleven commits over four days had never had it run once. `KP10-01` is **closed**.

Eight contexts still report where `SA-S-04` records a ruleset requiring nine. `KP10-10` stands, and stands unchanged; it is the owner's and no session can touch it.

### 2. `KP10-02` — the race. **Repaired. I reproduced the claim; it is true, and understated.**

The method is documented at the stub (`e2e/verify-web-build.ts:191-203`): wrap the two `/api/state` response lines in a `setTimeout` of a few seconds. I did exactly that — four seconds, the figure the comment names — and ran three ways:

- **`9fab21e`, no delay** — PASS, 20s. (The commit claims 18s; this machine is not that machine.)
- **`9fab21e`, 4s delay** — **PASS**, 94s. Every case family passes, including the two the ninth review reported.
- **`152d112`, same 4s delay** — **FAIL**, and this is where the claim is understated. The commit message says the delay "turned the two reported failures into eleven". What I measured is **33 failing assertions across eight case families**: the badge (3), the four report states (6), the Prover's window (7), the Prover with nothing read (4), the branch-choice badge (1), the conversation thread (9), the unread conversation (2), the endpoint-failure notice (1). Every one of them against a build that `9fab21e` proves is correct under the same delay.

The three helpers do what they say. `worldReady` (`:549-560`) is the good one: `.v11-live-notice` is rendered exactly when `mode === 'live' && !live.state` (`MobileRoom.tsx:629`), so *canvas present **and** notice absent* is the page's own statement that `/api/state` has answered — a positive signal, one line, replacing eight canvas-only waits that were all satisfiable before the page had read anything. `openAndRead` (`:638-688`) adds the condition the Prover's cases always had and the slice-six cases never did — `__virgilV11.window === want`, a read-only mirror of real state — and then waits for the answer's own words. `readBadge` (`:579-607`) waits for the badge to carry the endpoint's value before reading it.

The one surviving canvas-only wait, at `:1254`, is correctly left alone: it is the `?gone=1` case, where `branchExists: false` keeps the notice on screen for ever and `worldReady` would time out. It waits on `.v11-branch-gone` instead, which is a positive signal from the answer. That is the exception the helper's docblock claims, and it is real.

**`KP10-02` is closed.** This is the best-argued repair this reviewer has read in the repository: it reproduced the failure before fixing it, found that the reported two were a fifth of the problem, and repaired the class rather than the instances.

### 3. `verify-web` on every push. Covered at (1). **Closed.**

### 4. The wait vocabulary in `check-quality-v11.test.ts`. **Teaching, not loosening.**

The rule's demand is *"something must make the page's readiness a condition before a failure can be asserted."* All three new names satisfy it and two of them satisfy it more strictly than what the rule already accepted: `waitForFunction(canvas)` passed the rule and was the defect; `worldReady` is that same wait plus the endpoint's answer. The set of code this rule accepts is narrower in substance than it was, not wider. The three names are also the whole of the change — the regex is unchanged otherwise, and nothing else was relaxed.

One inaccuracy in the sentence that justifies it, at `KP10-19` below.

---

## The blocking finding

### `KP10-13` — on the hosted build, Virgil's window draws the recording while the page has no answer, and for ever when the endpoint fails.

**This is the property the slice exists to hold.** The ninth review's third question was *"can the window draw a message nobody sent?"* and answered *"not by any path this reviewer could find in the drawing code"*. That answer is right about the drawing code and wrong about the page, and reading was the wrong instrument. The repair's own reproduction printed the evidence — `the live thread drew the recording's scripted line "Good evening"` appears in my `152d112`-under-delay run, among the 33 — and it is not a check defect.

**Reproduced directly, twice, against the built `dist/web` with `__LIVE__` true.** Serve the hosted bundle, delay `/api/state`, load the page, tap `.v11-talk` — the dock button, visible and pressable throughout, because the `.v11-live-notice` overlay covers the **world** and not the chrome. While the page's own notice reads *"Reading this repository…"*, Virgil's window opens carrying:

```
Good evening. No work has started. I’ll tell you who has it, what the checks
found, what the review found and whether you need to decide.
…
What every agent is doing
Fabricator: standby · Prover: standby · Keeper: standby
…
No review has been reported.
…
Ask Virgil to plan, inspect or explain anything. Nothing is sent — there is
nothing running behind this build.
```

Every line of that is the recording. Not one of them is a fact about the owner's repository. The first is Virgil speaking to him in his own voice about work that has not started; the middle two are claims about three agents and a review, on a page that has read nothing; the last is false on the hosted build specifically, where `canInstruct()` has been true since he stored his secret (`KP10-08`) and the composer does send.

**And it is not only a race.** Answer `/api/state` with a 500 and the same tap gives the same window, permanently. The notice beside it reads *"This repository could not be read. the state endpoint answered 500"* — the page saying, correctly, that it knows nothing — while one press away it narrates the project. An endpoint outage turns the honest surface into the dishonest one and leaves it there.

**The mechanism, and why every guard in the slice misses it.** `panelStore.ts:26` initialises the module store to `demoAt(0, 0, false)` — the recording at its first frame. `MobileRoom.tsx:1548-1550` computes `live.state` for a live page and **returns before `publishDemoState`** while it is null. `AgentWindow.tsx:85` reads that store. So the state the window draws is not a live state with nothing in it; it is **the recorded state**, carrying `mode: 'demo'`. `windowContent.ts:1918` — `state.mode === 'live' ? liveVirgilThread(state) : virgilThread(state)` — therefore takes the scripted branch, exactly as designed, on a page that is live. `fabricatorDoc` and `keeperDoc` refusing the recording on live, `liveVirgilThread` drawing only what the file holds, the browser's third re-validation: all of them are guards on a live state, and there is no live state here to guard.

The mutation `the-live-thread-is-the-owner’s-own` is caught, and cannot help: it proves the *function* refuses the recording when handed a live state. The page's failure is that it never hands it one.

**Why it blocks this candidate rather than waiting for a slice of its own.** The defect is older than `9fab21e` — `panelStore.ts:26` predates slice six — and a Keeper does not invent scope. Three things make it this candidate's:

1. It is the slice's **headline property**, and the pull request offers it as proved: *"`verify:web` was proved red before green: with the live thread removed so a live page falls back to the recording's scripted turns, it produces ten failures, including 'the live thread drew the recording's scripted line "Good evening"'."* The builder knows precisely what that failure line means. It appeared in their own reproduction, and the commit records the whole set as failing *"against a build that was correct"*.
2. The repair **closes the only window through which the check could ever see it.** `openAndRead` waits for the answer's own words before reading the sheet, by design and correctly for `KP10-02`. The interval in which the recording is on screen is now stepped over deterministically. Before this commit the check saw it by accident under load; after it, never.
3. It is reachable **today**, on the deployed site, by the one gesture the slice was built around.

**What would clear it:** a product repair, so that a live page with no answer draws a live page with no answer; and a case in `verify:web` that opens Virgil's window *before* the answer and asserts that none of the three scripted lines is in it — the assertion the file already owns, moved to the moment where it can fail.

---

## The other findings

**`KP10-14` — the repair's reproduction found a product defect and recorded it as a check defect.** Non-blocking on its own; it is `KP10-13`'s record. `e2e/verify-web-build.ts:191-203` and the commit message both state that under the four-second delay *"eleven assertions across four case families failed against a build that was correct."* One of those assertions was `the live thread drew the recording's scripted line "Good evening"`, and the build was not correct. This is the good machinery working — the file's own instrument produced the finding — and then the finding being filed under the wrong heading. The correction is one sentence at the stub, and the sentence matters, because that comment is what a future session will read before trusting this file.

**`KP10-15` — twelve findings exist, and none of them is written down anywhere a merge would carry.** `grep -rn "KP10-" docs/` on this candidate returns **nothing**. `V11_KEEPER_REVIEW_PHASE2_NINTH.md` lives on `claude/pr-12-virgil-review-7n72lr`, which has **no pull request** (open PRs are 10, 11, 12, 13; that branch is on none of them). Pull request #12's body still opens *"**This has never been reviewed.** Eleven commits, and no session other than the one that wrote it has looked at any of it"* — false since the ninth review, and the body carries no mention of `KP10-01` … `KP10-12` or of the `BLOCKED` verdict. If #12 merges as it stands, `main` gains the slice and gains no record of the nine findings the owner is being asked to dispose of. This review is in the same position and says so: it is on a branch of its own, and somebody has to carry both reviews onto a branch that merges. That is a repair, and this session performs one hop.

**`KP10-16` — the proof that `KP10-02` stays repaired is a comment.** The four-second delay is the whole of the evidence and nothing runs it: `pnpm test` is 1,801 mission-control tests, **exactly the count at `152d112`**, because the repair added none, and `mutate` is still in no workflow (`KP10-09`). The next session to touch this file will be told by `check-quality-v11.test.ts` that its waits have the right *names*, and by nothing at all that they wait for the right *thing*. A delay switched on by an environment variable, and one CI run with it set, would turn the best-documented reproduction in this repository into a check.

**`KP10-17` — the count at the stub is wrong, in the direction of modesty.** "Eleven assertions across four case families" — the same sentence then lists six families, and my reproduction of its own method produced 33 assertions across eight. Machines differ and so will counts; what should not differ is a file inviting a future session to trust a figure that its own next clause contradicts.

**`KP10-18` — `worldReady`'s failure is announced and then ignored.** All eight call sites read `if (!(await worldReady(budget))) { failures.push('the page never finished reading /api/state, so nothing after this is a fact about the product'); }` — and then the file carries on asserting for hundreds of lines. The run does fail, which is the important part. But a reader of that output gets one true finding followed by a page of findings the check has itself declared meaningless, which is the shape of a report that teaches people to skim.

**`KP10-19` — the sentence that justifies the vocabulary change is not accurate.** `check-quality-v11.test.ts:102-103`: *"Each is a helper whose body is a wait and nothing else."* True of `worldReady`. `readBadge` presses `.v11-badge` and returns the panel's text; `openAndRead` presses a control, pushes two failures of its own, and returns `readSheet(...)`. The conclusion is right — the rule is taught, not loosened — and the reason given for it is false in two cases out of three. It costs nothing to say the true thing: each of them makes the page's readiness a condition before anything is read.

---

## The standing findings, confirmed open

Each re-read on the candidate. None is repaired; none is claimed to be.

| id | what | still open at |
|---|---|---|
| `KP10-03` | an exchange stuck at `asked` draws *"A session is working on this"* with `streaming: true`, with no shelf life and no time compared | `windowContent.ts:2290-2300`; `liveState.ts:333-392` takes no `now` |
| `KP10-04` | `conversationStatus: 'read'` falls to the default and says the conversation *"could not be read"* | `windowContent.ts:2250-2257`; `state.mjs:1183` puts `talk.status` on the wire |
| `KP10-05` | exchanges that fail re-validation are dropped silently; only the all-or-nothing case is reported | `liveState.ts:339-391`, and `:391` reports `exchanges.length === 0 && raw.length > 0` alone |
| `KP10-06` | with `x-nf-client-connection-ip` absent, the forgeable `x-forwarded-for` is preferred over the shared bucket | `netlify/functions/instruct.mjs:135-141` |
| `KP10-11` | both `if: always()` steps end in a bare `git push origin "HEAD:$TARGET"` — no fetch, no rebase, no retry | `.github/workflows/instruct.yml:291`, `:310` |

`KP10-07`, `KP10-08`, `KP10-09`, `KP10-10` and `KP10-12` are likewise untouched and stand as written. `KP10-11` compounds `KP10-03`: a push that loses the race leaves the exchange at `asked`, and the thread draws it as being worked on for ever.

**"Honestly recorded" cannot be confirmed, because they are not recorded.** See `KP10-15`. Nothing in this candidate denies any of them, which is the weaker good news; nothing in it mentions them either.

---

## What this candidate gets right

The repair under review is the right kind of work and should be read that way. It reproduced the reviewer's finding before repairing it, rather than patching the two lines the finding named. The reproduction found the same defect in nine more places, and the commit says plainly that repairing only the reported two *"would have left the same fault in the same file, now known."* It replaced nine patch sites with three helpers so the shape cannot be forgotten again, wrote the reproduction method down at the stub for the next session, taught the quality rule three names rather than relaxing it, and argued the push-exclusion change on measured cost — 582 machine-minutes for the job that keeps the exclusion, a handful of minutes for the one that loses it. It then proved the result both ways. All of that holds up under independent reproduction.

`KP10-13` is not a mark against that work. It is what that work's own instrument found, three lines away from where the instrument was pointed.

**What is needed to clear this review:** the product repair at `KP10-13`, a `verify:web` case that can see it, and re-review. `KP10-14` through `KP10-19` are small and the owner may dispose of them. `KP10-15` needs somebody to carry both reviews onto a branch that merges. `KP10-10` and the rotation of `INSTRUCT_SECRET` remain the owner's alone.

Filed by the review session on `claude/pr-12-virgil-review-tenth`. This session built nothing, repaired nothing and changed no file of the candidate.
