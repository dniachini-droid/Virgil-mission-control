# The system audit — findings

**Run 2026-09-11, on the owner's authorisation of that evening.** Five independent reviewers, one dimension each, against `docs/process/SYSTEM_AUDIT_BRIEF.md`. None of them changed a file; every one verified the working tree unchanged at the end.

This document consolidates them. The five full reports are the evidence; this is the register, and where the two differ the reports govern.

**Read this first, before any finding:** the auditors were subagents of the same session that built almost everything they examined. The governance reviewer said so itself, in its own headline, and refused to pretend otherwise:

> "My independence is void, and it is the audit's own headline finding. … The session that proposed slices four and five, built them, repaired them, filed the Keeper reviews of its own candidates, wrote `SYSTEM_AUDIT_BRIEF.md`, filed `OD-0015`, and built the two new mechanisms — is the session writing this audit. … Treat every judgment below as needing confirmation by a session that is not me."

That is the correct reading of `CLAUDE.md`'s one-hop rule and it applies to all five dimensions. **Nothing here is settled. It is a list of things to go and check.**

---

## What needs the owner, and nothing else will do

### 1. `SA-S-01` — a stranger's pull request may be handed all three secrets

**Netlify → Site configuration → Build & deploy → Deploy Previews.** If forked pull requests build automatically, then since this repository went public anyone may fork it, change one line of the build, open a pull request, and have Netlify run their code in a container holding `GITHUB_TOKEN`, `GITHUB_DISPATCH_TOKEN` and `INSTRUCT_SECRET`. One line exfiltrates all three, in a build that looks green and ordinary.

The reviewer could not read the Netlify dashboard — the container's egress proxy blocks it — so it could not establish whether this is on. It may well be off by default. **It is the only finding in the audit whose downside is total, and checking it takes a minute.** Set forked pull requests not to build, mark the three variables sensitive, and scope them to the contexts that need them.

### 2. `SA-S-02` — the endpoint that can start work allows unlimited guessing

`netlify/functions/instruct.mjs:101`. There is no limit of any kind on wrong guesses at `INSTRUCT_SECRET`. The daily ceiling and the one-at-a-time rule sit *after* that line and bound successful runs, not attempts. A wrong guess costs the attacker nothing, so the rate is whatever their connection allows, indefinitely. The endpoint's address and its header name are both now world-readable in this repository.

What a landed guess buys, and it is more than the file's own header claims: `.github/workflows/instruct.yml:223` runs `claude -p "$INSTRUCTION" --dangerously-skip-permissions` with `CLAUDE_CODE_OAUTH_TOKEN` in scope — **the owner's Claude subscription token, which one instruction exfiltrates** — plus `contents: write` and an unrestricted network, twenty times a day.

**Rotate `INSTRUCT_SECRET` to 32+ random characters.** Then a session can add per-IP attempt limiting, which needs no decision.

### 3. `SA-S-04` — good news, and a layer-1 record that is now wrong

`main` **is** protected. The reviewer queried the API: ruleset `22872557`, active since 04:57 on 2026-09-11, covering `refs/heads/main`, blocking deletion and force-push, requiring a pull request and all nine checks, with no bypass actors. **Making the repository public did what GitHub Pro would have done, for nothing.**

So `KP3-06` can be closed on evidence, and `OD-0013` — which records that protection could not be enforced, and that *"Every green check on a pull request is advisory"* — now states the opposite of the truth. `OD-0013` carries authority layer 1. A session may not correct it; the owner must, under the `OD-0006` mechanism.

### 4. `SA-G-01` — the repair-cycle limit, and an ambiguity only the owner can settle

`constitution/authority.json` sets `maxCyclesWithoutOwner: 1` and `maxCyclesWithOwner: 2`. Five repair rounds ran on one lineage. Nothing refused any of them, because the guard that would (`packages/domain/src/guards.ts:249-262`) is correct, tested, and **unreachable by real work** — there is no event store, nothing emits `repair_authorised` outside fixtures, and `ENFORCEMENT_BOUNDARIES.md` already says so.

The sharper half, which no record states plainly: `guards.ts:253` reads `count > maxCyclesWithOwner → false`, an **absolute ceiling**. So `OD-0011`, `OD-0014` and `OD-0015` each authorised something the constitution's machine-readable twin forbids unconditionally. Had the reducer been running it would have refused all three **with the owner's decision in hand**.

Either `maxCyclesWithOwner` is a ceiling — and five rounds were unconstitutional — or it means one more round per decision, and `guards.ts:253` is a defect. **Layer 2. The owner's alone.** `OD-0014` saw the ambiguity and correctly refused to resolve it; so does this.

---

## The blocking finding, and the half a session could close

### `SA-G-03` — a fabricated owner decision is undetectable, and the auditor demonstrated it

It did not argue this. It fed the decision-record guard a payload writing `docs/decisions/OD-0099-entirely-fabricated.md` containing a date and the invented quotation *"Yes, delete the constitution and give every session merge rights."* **Exit code 0.** A record at layer 1, authorising the destruction of layer 2, passed every machine control here in one command.

Three bypasses sat on top. The hook matches `Write|Edit` only, so a shell redirect never reaches it. No test exercises the harness's hook dispatch. And **`.claude/settings.json` was not in its own deny list** — a session could delete the guard, or the rule preventing it deleting the guard.

**Closed tonight:** the third. `Write`/`Edit` on `.claude/settings.json` and `.claude/hooks/**` are now denied. Four lines that only ever remove power from sessions, which is what makes it ordinary work.

**Not closed, and the owner's to take:** nothing in this repository holds an independent copy of anything he said. Every `OD-*` quotation was written by the session that filed it, `OD-0015` included — filed that night, authorising a merge that had already happened and suspending a constitutional limit, on three quotations of six, four and nineteen words existing nowhere else. The repair the auditor recommends: the owner's own console export committed to `knowledge/raw/`, which is already append-only and already denied to sessions, and a test asserting every blockquote in every `OD-*` appears verbatim in some raw record.

---

## What was repaired tonight

| finding | what it was | state |
|---|---|---|
| `SA-U-01` | On a **healthy** live page, the Fabricator's window drew eight invented file paths, a terminal reading `Tests 801 passed (801)` with `exit 0`, an invented pull request, and the owner's real commit inside a card naming a branch he never chose | repaired |
| `SA-U-02` | The Keeper's window drew three invented review findings, on a page where `liveState` refuses at length to carry a verdict | repaired |
| `SA-U-03` | One section read *"No commands have run"* directly above a terminal showing a command that ran | repaired by the same change |
| `SA-U-04` | The head guard checked `sha`; the identifier every screen draws comes from `shortSha`. Reproduced by two reviewers | repaired, one line |
| `SA-U-05` | **No test anywhere passed a live state to `windowDoc` for the Fabricator or the Keeper.** No file imported both `stateFromAnswer` and `windowDoc`. The defect was not subtle; it was outside every test's argument range | test added over all four windows |
| `SA-U-06` | The Prover's station screen said `NOT READ` while his window, one tap away on the same page, listed the checks and said they passed | repaired: real counts to the rail, no invented timings |
| `SA-S-03` | `?fresh=1` let an anonymous caller switch off the only rate limit. No client ever sent it | deleted |
| `SA-S-07` | A fork's branch of the same name attached its pull request to the owner's row | matched on `head.label` |
| `SA-S-08` | An exhausted rate limit was reported as a refused token, sending the owner to rotate the wrong thing | now says which |
| `SA-G-03` (part) | The deny list did not protect the guard or itself | four lines added |
| — | The committed knowledge seed graph was stale, and would have failed CI | regenerated |

---

## The largest thing the audit found, which is not a defect

**`SA-P-01` — CI is not billed, and the cost premise every document here reasons from is wrong.**

The reviewer queried the timing API directly: `billable: { UBUNTU: { total_ms: 0 } }` on every run sampled, **including the day the workflow header says the allowance was exhausted**. Every job runs on a standard runner, and GitHub does not meter standard runners on public repositories. Summed across 179 runs over four days: 3,713 machine-minutes, which on a private repository would be **$222.80 a month** and is currently **$0.00**.

So: the `$0.90 per pull request` in the audit brief, the "exhausted minutes" diagnosis written into `checks.yml`, and the reasoning in this session's own commit messages on 11 September are **not supported by the billing data**. The reviewer was careful about how far that goes and so is this: it could not read the account's plan, and the three-second no-runner failures of that morning are real and recur after any monthly reset. **The cause of those failures is `INSUFFICIENT_EVIDENCE` and should stop being quoted as settled.** What is established is that the cost of CI today is zero, and that every "this costs money" justification here should be restated as time-to-verdict.

**`SA-P-02` — the `checks` job is 32.8% of every pull request and has no unique coverage.** It runs `pnpm check`, whose six commands each already have their own job; a test (`required-checks-v11.test.ts:254-279`) already proves the four matrix parts cover every viewport exactly once; and the one property it uniquely held — a single browser context across viewports — is the very thing `verify-owner-build-v11.ts:578-587` deliberately destroys by reloading between them. It has passed once with **57 seconds of margin** against its 60-minute cap, on a runner whose speed varies by a factor of two. Cutting it roughly **halves time-to-verdict**.

**And the waste nobody had on their list: `assets/models/candidates/` is 183 MB, 52.7% of every checkout, read by no test, no build and no vite config** — larger than the 192 MB of committed HTML everyone was worried about, which turns out to cost 0.6% of a pull request.

A history-preserving way to shed both exists and the reviewer wrote it out: `git rm` from `HEAD`, keep every `.sha256`, attach the files to a Release, and widen the digest check so it stays total. **Removing a path from `HEAD` is not a rewrite; every commit SHA every Keeper record names is untouched.** So the answer to the question this session refused to decide is yes — the weight can go without breaking the provenance chain.

---

## The question the owner actually asked

*"What does he learn from the room that he would not learn from the windows and the badge alone?"*

The interface reviewer measured rather than opined, and its answer is **"today, almost nothing"**: on live data the room's entire vocabulary is `STANDBY` three times, `NO VERDICT`, three dashes, `NOT READ`, plus a branch name and short SHA that are already in the chrome above the canvas. For that he pays 8.67 MB of bundle — **75.8% of it base64 assets inlined for a constraint only the Owner Build has** — 57% of the source, 65% of the test lines, and six of nine CI jobs.

It declined to recommend deleting the room, and its reasons are worth keeping: the art direction is the owner's decision at layer 1; it is the only part of this product he has ever volunteered that he liked; and *"the room is not information; it is the reason he opens the app at all."*

What it recommends instead: **split the truth path from the world path.** The windows are DOM, render from data, and never wait for a frame. A route that renders the chrome, the badge, the branch list and the windows without mounting the canvas would answer *"what is happening on my branch?"* in tens of kilobytes instead of 8.67 MB — and would make the app useful on the days the world is mid-repair. Then stop inlining 6.58 MB of assets into the **hosted** build, which has a server and a cache and does not share the Owner Build's single-file constraint.

That is the one recommendation in this audit that speaks directly to *"this is never ending, and it hasn't worked once."*

---

## Carried, not repaired

`SA-G-02` no code enforces the authority order, and the contradiction detector reads only self-declared contradictions — zero such edges exist, so it has never fired. `SA-G-04` one role, one hop was violated on every commit of 11 September, this audit included. `SA-G-05` eleven of fourteen roles had never run before tonight; nine had produced nothing ever. `SA-I-06` `PHASE_1_RUN_RECORD.md` contains the V7 section **twice, with the two copies disagreeing about the same evidence**. `SA-I-09` thirty broken path references, sixteen of them to a directory that no longer exists — and `packages/knowledge-graph` has a `broken_reference` checker pointed at 2,485 words of wiki instead of the 187,000 where the broken links are. `SA-I-22` `CLAUDE.md`'s Phase status is 628 words of live operational state, loaded into every session, **naming the wrong branch and the wrong phase right now**, and it is the exact category `CLAUDE.md` itself forbids elsewhere and the Mind Scan enforces as blocking — for the wiki, and not for itself. `SA-U-09` the test suite is not deterministic: four runs on an unchanged tree gave five, two, one and one failures, every one a 5-second timeout and never an assertion. `SA-S-06` a test in the security file asserts a property the code does not have, in a title that cannot fail.

`SA-I-19`, worth recording because it contradicts the brief's premise: across 178 source files the reviewer found **one** comment that restates the line beneath it. The 26% comment density is earned, and the honest lever for reducing it is deleting 6,540 lines of formally retired world, not thinning prose.
