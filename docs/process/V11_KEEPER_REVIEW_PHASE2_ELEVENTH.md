# Keeper review — Phase 2 slice six, candidate `e98dd63`

**Verdict: `BLOCKED`.** Eight findings (`KP10-20` … `KP10-27`), one of them blocking.

**The blocking finding is not `KP10-13`.** `KP10-13` is repaired, and the repair is correct — this reviewer reproduced the original defect against a built `dist/web`, watched the window narrate the recording, then watched the same gesture on this candidate draw nothing. That work holds up.

What blocks is smaller and entirely mechanical: **the candidate does not lint, and CI is red on this exact SHA.** `pnpm check` dies at its first stage on a line this commit introduced. Both GitHub runs at `e98dd63` failed. The commit message reports `turbo run test --force` and `verify:web` and does not mention lint, which is the one stage the builder did not run.

Reviewed: `e98dd63ec0f293883d9cd20e2495ef14225ff20e`, diff `9fab21e..e98dd63`, 5 files, 215 insertions, 11 deletions, 1 commit. Findings `KP10-03` … `KP10-12` and `KP10-14` … `KP10-19` are treated as standing and were each re-read on this candidate. This session built nothing, repaired nothing and changed no file of the candidate; the experiments below ran in a throwaway worktree and the candidate's working tree was clean before and after.

**Reproduced by the reviewer, not taken from the builder:**

| what | result |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm exec turbo run test --force` | **6 of 6 tasks, 0 cached.** `mission-control` 37 files, **1,801 tests**, all passed |
| `pnpm --filter mission-control verify:web` | **PASS at 86s** |
| `pnpm exec biome ci .` on `e98dd63` | **FAIL — 1 error**, `MobileRoom.tsx:348`, a line this commit added |
| `pnpm exec biome ci .` on `9fab21e` | **clean**, 299 files, no error |
| `pnpm check` | **fails at stage 1 of 6**; the remaining five never run |
| CI at `e98dd63` | **two runs, both `failure`**: push `34704432491`, pull_request `34704435894`. In both, the failing job is *lint, typecheck, tests*, at the *Lint* step. Every other job is green, including *hosted build, read and refused* |
| my own reproduction of `KP10-13`, unrepaired build, `/api/state` held open | **the recording, in full** |
| the same, on `e98dd63`, held open **and** answering 500 | **no window on the page at all** |
| `verify:web` with the product reverted to `9fab21e` and the check kept | **FAIL — 7 named failures** |
| the same, **under CPU contention** | **PASS** — the defect fully present and not one failure reported |

---

## The blocking finding

### `KP10-20` — the candidate does not lint, and the gate is red on this SHA.

`apps/mission-control/src/world/mobile/MobileRoom.tsx:348`, added by this commit:

```ts
      row === undefined ? step.window : windowForLedgerRow(demoSnapshot() ?? demoAt(0, 0, false), row),
```

Biome's formatter wants it across three lines. It is one error, and the fix is `pnpm format`.

**Acceptance criterion it fails.** Two, and they are the same one seen from either end:

1. **`pnpm check`**, named in `CLAUDE.md` under *Commands* as the workspace gate — `pnpm lint && pnpm typecheck && pnpm test && pnpm verify:owner && pnpm verify:owner:v11 && pnpm verify:web`. It exits 1 at `pnpm lint`. Because the stages are chained with `&&`, **the other five never ran under `pnpm check` on this candidate at all.**
2. **`constitution/REVIEW_POLICY.md`**, which states that gates compute eligibility from "required checks ran, exit codes" and that **"A passing judgment never overrides a failing gate."** The required context *lint, typecheck, tests* is `failure` on both runs at this SHA. A pull request whose required check is red cannot merge, and a Keeper who passed it would be doing exactly what that sentence forbids.

This is `BLOCKED` and not `INSUFFICIENT_EVIDENCE`: the verification ran to completion and returned a failure, and the failure is reproduced locally and pinned to a line in this diff. The evidence is not missing. It is bad.

**Why it is worth a cycle rather than a shrug.** It is trivial to fix, and that is the point — the ninth review blocked this lineage because *"the gate is red on this exact candidate"*, the tenth cleared that, and this candidate makes the gate red again in a different job. Three rounds in, a commit landed on the pull request branch without its author running the repository's own one-line check. The defect is a formatter's line break; the pattern is that the gate keeps being discovered by the reviewer.

---

## What the candidate gets right, proved rather than read

### `KP10-13` is repaired. I reproduced the defect first, then its absence.

Not through the builder's check. I wrote a standalone server and Playwright driver, served each `dist/web` under it, held `/api/state` open, and tapped `.v11-talk`.

**On the unrepaired product** (`9fab21e`'s four files, rebuilt), while the page's own notice read *"Reading this repository…"*, the window carried:

```
Good evening. No work has started. I'll tell you who has it, what the checks
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

Exactly what the tenth review reported, to the line.

**On `e98dd63`**, the same gesture, twice:

- endpoint held open — notice *"Reading this repository…"*, window: **absent**.
- endpoint answering 500 — notice *"This repository could not be read. the state endpoint answered 500"*, window: **absent**.

The mechanism is repaired where the tenth review said it was: `panelStore` can hold `null`, `MobileRoom` publishes that, and `Panel` and `AgentWindow` both gate `panelDoc`/`windowDoc` on a state existing. The commit's refusal to "publish an empty live state" is the right call and it argues it correctly — a state built from `demoAt` carries the recording's candidate id, and handing that to a window marked live would be `KP8-02`.

### The other surfaces that read the store were checked.

Three readers exist. `Panel.tsx` and `AgentWindow.tsx` are both repaired. The third, `MobileRoom.tsx:348`, is `demoSnapshot() ?? demoAt(0, 0, false)` — see `KP10-24`; it is unreachable today and it is the line that fails lint. `VirgilRoom.tsx:365` publishes rather than reads and is the V10 demo route, which has no live mode.

### The new check is genuinely red on the unrepaired product.

Product reverted to `9fab21e`, check kept at `e98dd63`, rebuilt: **seven named failures**, not six. The builder claimed six; the seventh is the inverted assertion firing, which is the useful news at `KP10-23`.

```
- before the endpoint answered, Virgil's window drew the recording: "Good evening"
- before the endpoint answered, Virgil's window drew the recording: "No review has been reported"
- before the endpoint answered, Virgil's window drew the recording: "Nothing is sent — there is nothing running behind this build"
- with the endpoint failing, Virgil's window still narrates the recording: "Good evening"
- with the endpoint failing, Virgil's window still narrates the recording: "No review has been reported"
- with the endpoint failing, Virgil's window still narrates the recording: "Fabricator: standby"
- with the endpoint failing, a window opened at all: "Back / Virgil / No work / No review has been reported…"
```

It is not passing for want of a press: `press()` reports `.v11-talk is not on the page at all` and `cannot be pressed: … is on top of it`, so an absent or covered control is a named failure rather than an empty string. And `openAndRead`'s third condition — something only the answer can produce — means the `__virgilV11` divergence at `KP10-26` cannot turn any other case vacuous.

**On an unloaded machine.** That qualification is `KP10-21`, and it is the finding that matters most in this review after the blocker.

---

## The other findings

### `KP10-21` — the case that proves `KP10-13` stays repaired wins only when the machine is fast, and I made it lose.

The new case presses `.v11-talk` and then asserts an absence after `await page.waitForTimeout(500)` — a fixed sleep, with no positive signal that the window has had its chance to draw.

`test/check-quality-v11.test.ts:60-66` describes this exact shape as the defect it was written to catch:

> A case navigated and then asserted that the recording's fixtures were *not* on the page. With the defect deliberately reinstated they were — a second later — so the check passed twice while testing nothing. **An absence asserted before the page can produce the thing is not an absence; it is a race the defect wins.**

Measured on the unrepaired build, time from the press to the recording appearing:

| CPU throttle | the recording appeared | the 500 ms sleep |
|---|---|---|
| ×1 | **263 ms** | catches it |
| ×4 | **3,803 ms** | **misses it** |
| ×8 | **4,022 ms** | **misses it** |
| ×20 | **5,572 ms** | **misses it** |

And end to end, which is the part that should settle it: **`verify:web` on the unrepaired product, run under CPU contention, returned `PASS`** — with the defect entirely present and not one of the seven failures reported. The same command on the same build on an idle machine returns seven.

A ×4 slowdown is not a hypothetical. It is the loaded CI runner that `KP10-02` existed to describe, in the file whose own stub documents a four-second delay as the reproduction method.

The rule at `check-quality-v11.test.ts` does not flag the new case, because `await page.waitForSelector('.v11-talk', …)` sits between the `goto` and the first `failures.push` and matches `waitFor\w*\(`. The rule's letter is satisfied; its stated demand — *"something must make the page's readiness a condition before a failure can be asserted"* — is deliberately and necessarily not, because this case must act before readiness. That is not a fault in the case. The fault is that nothing replaced the guarantee the rule usually provides.

**Asserting an absence is genuinely hard, and a positive signal is available here.** `__virgilV11.window` becomes `'virgil'` on the press even on the repaired build — I observed it in all three of my runs. Waiting for `__virgilV11.window === 'virgil'` and then for the world to be still would make this case deterministic instead of load-dependent, using the mirror the file already trusts for exactly this purpose in `openAndRead`.

Recorded, not repaired. This is the one non-blocking finding I would put in front of the owner first, because it is the difference between a regression guard and a comment.

### `KP10-22` — the endpoint-failure case now spends 60 seconds waiting for something the repair guarantees can never appear.

`verify-web-build.ts:1904`: `await page.waitForSelector('.v11w-sheet', { state: 'visible' }).catch(() => {})` — no `timeout` argument, so it takes the page default. The repair makes that selector never appear in this case, so the wait now always runs to the deadline and is then swallowed.

Measured: the case is reached at 24s and completes at 85s on the candidate; on the unrepaired build, where the window does open, the whole run finishes in 24s. The assertion was inverted and the wait above it was not.

### `KP10-23` — the inversion is sound, and it removed the case's only proof that a window can open at all.

The owner asked whether inverting rather than deleting weakened anything. Two answers, and they point opposite ways.

**It did not weaken the thing it was inverted for, and I proved that.** `with the endpoint failing, a window opened at all` fires on the unrepaired build — it is the seventh failure in the list above. The inverted assertion has teeth; it is not inert.

**It did remove one guarantee.** `windowText.length < 50` previously meant *a window opened and had content in it*. Whatever else it was doing, it proved the window machinery worked in this case. Now an empty sheet is the pass, and an empty sheet arising from any other cause — a press that lands on nothing, an exception inside `AgentWindow`, a regression that stops windows rendering entirely — reads as success here, and the five `recorded` regexes beneath it pass trivially on `''`, as the comment honestly says.

The residual risk is small: `press()` names a missing or covered control, and other cases in the same file do open windows and read real content, so a total breakage of `AgentWindow` would be caught elsewhere. I judge the inversion **correct and honestly commented**, with the caveat that this case alone no longer distinguishes *the repair worked* from *nothing happened*, and `KP10-21` is the reason that caveat is not academic.

### `KP10-24` — the repair reintroduces the recording as a silent fallback, on the line that fails lint.

`MobileRoom.tsx:348`: `windowForLedgerRow(demoSnapshot() ?? demoAt(0, 0, false), row)`.

`demoSnapshot()` became nullable, and this call site answers that by substituting the recording's first frame — the precise value the rest of the commit exists to stop a live surface holding. It is **unreachable today**: the `row !== undefined` path is wired only through `Cast`'s own subtree (`:1579`), and `Cast` returns null before rendering it whenever the state is null, so the snapshot is non-null whenever this line can run. The two call sites at `:364` and `:471` pass no row.

So this is a latent trap rather than a live defect, and it is worth writing down because of what it is: the repair's own diff contains one place where "nothing" was answered with "the recording" instead of with nothing, and it is the only line of the five files that the commit did not think through. Throwing, or returning early, would say the same thing without keeping `demoAt` alive on a live path.

### `KP10-25` — the repair adds no test that runs on a pull request.

`mission-control` is **1,801 tests** on this candidate — identical to `9fab21e` and to `152d112`. `grep` for `panelStore`, `useDemoState` or `publishNothingRead` across every `*.test.ts` in the application returns nothing.

The whole proof that a live page with nothing read draws nothing is one `verify:web` case, and by `KP10-21` that case is load-dependent. The store's initial value is a one-line change that a future session can revert without a single unit test noticing. This is `KP10-16`'s shape a second time, now on the headline property rather than on the wait vocabulary.

### `KP10-26` — the page reports an open window that is not drawn.

On all three of my runs against the repaired build, `__virgilV11.window` was `'virgil'` while no `.v11w-sheet` existed. The mirror and the DOM disagree.

It harms nothing today: the mirror is a read-only debug surface, and `openAndRead` never trusts it alone — its third condition requires content only the answer can produce, so no case can pass on the mirror's word. Recorded because the mirror is described in this file as *"a read-only mirror of real state"*, and on a page with nothing read it is a mirror of an intention rather than of a state.

### `KP10-27` — "Talk to Virgil" is pressable, and on a live page with nothing read it does nothing the owner can see.

Stated plainly and with its scope: **this is the one finding in this review that may be out of scope**, and the owner's own framing is the reason. He has said slice six is being merged and left alone, and that *"the UI could do more"* is not a finding. Nothing here says anything untrue — silence is not a lie, and it is a great deal better than the recording.

What is worth one sentence in the register rather than none: the control gives no acknowledgement at all, and the window state is set behind it (`KP10-26`), so an owner who taps during the read and gives up may find a window appearing on its own a second later. That is a surprise, not a falsehood. It is his to dismiss, and he may well dismiss it.

---

## The standing findings, re-read on this candidate

Each checked against the code on `e98dd63`. **None is repaired, none is claimed to be, and none has become false.**

| id | what | confirmed at |
|---|---|---|
| `KP10-03` | an exchange stuck at `asked` draws *"A session is working on this"* for ever | `liveState.ts:333` — `conversationOf(answer)` still takes no `now`; `windowContent.ts:2300` unchanged; the manifest has `report-shelf-life` and still no `thread-shelf-life` |
| `KP10-04` | `conversationStatus: 'read'` falls to the default and says the conversation *"could not be read"* | `windowContent.ts:2251-2257` — `absent`/`unreadable`/`refused` branch, `read` falls through, verbatim |
| `KP10-05` | exchanges failing re-validation are dropped silently | `liveState.ts:391` — still only `exchanges.length === 0 && raw.length > 0` |
| `KP10-06` | the forgeable `x-forwarded-for` is preferred over the shared bucket | `netlify/functions/instruct.mjs:135-141`, unchanged |
| `KP10-07` | `runUrl` is said in three places to become an `href`, and does not | the only two `href=` in the application are `Hud.tsx:63` and the `#/v10` dev link at `MobileRoom.tsx:1419`; neither is fed by conversation data |
| `KP10-08` | the composer has been live since the owner stored his secret | `liveSession.ts:79-81` — `__LIVE__ && storedSecret() !== null`, unchanged |
| `KP10-09` | `mutate` is run by nothing | `grep -rn mutate .github/workflows/` returns nothing |
| `KP10-10` | eight contexts report where `SA-S-04` records a ruleset requiring nine | eight `checks` contexts at this SHA. The owner's alone; no session can touch it |
| `KP10-11` | bare `git push origin "HEAD:$TARGET"` with no fetch, rebase or retry | `instruct.yml:291`, `:310` — **and `:206`**, a third site the tenth review did not name. The finding is true and was understated |
| `KP10-12` | the builder wrote the brief this is measured against | unchanged; this review is independent of that session and not of the brief |
| `KP10-14` | the reproduction's product defect is still filed as a check defect | `verify-web-build.ts:206` and `:632` still say *"against a build that was correct"*. The tenth review established it was not |
| `KP10-15` | **no finding is written anywhere a merge would carry** | `grep -rn "KP10-" docs/` on this candidate returns **nothing**. Pull request #12's body still opens *"This has never been reviewed."* Three reviews now sit on three branches none of which is on a pull request |
| `KP10-16` | the proof that `KP10-02` stays repaired is a comment | unchanged, and `KP10-25` is the same gap on `KP10-13` |
| `KP10-17` | the count at the stub contradicts its own next clause | `verify-web-build.ts:206`, unchanged |
| `KP10-18` | `worldReady`'s failure is announced and then ignored | 8 call sites still push the notice and continue |
| `KP10-19` | *"Each is a helper whose body is a wait and nothing else"* is false of two of the three | `check-quality-v11.test.ts:102`, unchanged |

`KP10-01` and `KP10-02` were closed by the tenth review and remain closed: *hosted build, read and refused* is green at this SHA on both the push and the pull-request run.

**`KP10-15` is the one to read twice.** This review is the third in a row to find things, and the third in a row to file them where a merge will not carry them. If #12 merges as it stands, `main` gains slice six and gains no record of any of the twenty-seven findings the owner is being asked to dispose of — including the seven above that are his alone or his to decide. Somebody has to carry all three reviews onto a branch that merges, and it is not this session: a Keeper records, and that is a repair.

---

## Does a further repair cycle apply

**Yes — one, and it is small.**

The owner asked for this plainly, so plainly: **`KP10-20` warrants a cycle.** Not because the slice is unsound — it is sound, and `KP10-13` is genuinely repaired — but because the candidate cannot merge while a required check is red, and the fix is `pnpm format` on one line.

While that cycle is open, **`KP10-21` should go in it.** It is the difference between a regression guard and a comment, the change is confined to one case in one file, and the signal it needs (`__virgilV11.window === 'virgil'`) is already there and already trusted by `openAndRead` three hundred lines above. Leaving it costs the slice its only proof that its headline property stays repaired — on a loaded runner it passes whether the product is repaired or not, and I demonstrated that rather than inferred it.

**Nothing else in this review warrants one.** `KP10-22` through `KP10-27` are recorded for the register and the owner may dispose of them without a further round; `KP10-24` is unreachable, `KP10-26` is invisible, `KP10-27` may not be a finding at all. The sixteen standing findings are unchanged and honestly open, and the owner's disposition of them is a separate decision from whether this candidate is sound.

And the sentence worth saying plainly, because it is the one the owner actually asked for: **the interface is sound. It does not say anything untrue.** The blocking finding is a line break, and the finding behind it is about a check rather than about the product. If `KP10-20` and `KP10-21` are repaired in one commit, this lineage is done.

---

Filed by the review session on `claude/pr-12-virgil-review-eleventh`. This session built nothing, repaired nothing and changed no file of the candidate.
