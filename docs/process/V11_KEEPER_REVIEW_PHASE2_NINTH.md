# Keeper review — Phase 2 slice six, candidate `152d112`

**Verdict: `BLOCKED`.** Twelve findings (`KP10-01` … `KP10-12`), two of them blocking. The reviewer's answer to the question it was set — *is this safe for the owner to merge to `main`?* — is **not yet, and the reason is small and bounded**: the gate is red on this exact candidate, and it is red inside the one check the brief names as the slice's own acceptance evidence.

Reviewed: `152d1128e126190ce268a8272156b23c110d8d80`, diff `91409d0..152d112`, 35 files, 4,302 insertions, 11 commits, none previously reviewed. Working tree of the review session clean at start and finish; the candidate was read in a detached worktree and nothing in it was modified.

**Reproduced by the reviewer, not taken from the builder:**

| what | result |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm test` (turbo, six packages) | 37 files, **1,801 tests, all passed**, exit 0 |
| `pnpm --filter mission-control build:web` | exit 0 |
| `pnpm --filter mission-control verify:web` | **PASS**, four consecutive runs, including three under load |
| `pnpm --filter mission-control mutate` | **19 mutations, every one behaving as the manifest records; 18 caught, 1 recorded as unguarded** |
| the candidate's own CI, run `34695822117` | **8 jobs: 7 success, 1 failure** |

The builder's figures match the reviewer's everywhere they can be compared. The disagreement is not with the builder's arithmetic; it is that the candidate's own gate says something the builder's machine does not.

---

## The two blocking findings

**`KP10-01` — the gate is red on this candidate, in the check that is this slice's acceptance evidence.**

Job `103559007723`, *hosted build, read and refused*, step *Verify the hosted build reads, and refuses honestly*: **failure**, at `152d112`, on the only full-gate run this branch has ever had. Ten failures, all of them the slice's headline property:

```
  - Virgil's window with a conversation: the window is on the page but not visible
  - the thread does not draw "A question only this stub asks", which the answer carried
  - the thread does not draw "An answer only this stub gives.", which the answer carried
  - the message still being worked is not drawn as being worked at all
  - the thread draws 1 messages for three exchanges; six were expected
  - Virgil's window with nothing read: the window is on the page but not visible
  - with no conversation read, the window does not say so: ""
```

Note what did **not** fail: not one of the three scripted-line assertions fired. The recording did not leak. What the page drew was a live thread with nothing in it.

Worth recording plainly, because it changes what this finding is about: the eleven commits were pushed one at a time, and `checks.yml` gates every substantive job behind `if: github.event_name != 'push'`. So the five push runs on this branch ran *lint, typecheck and the tests* and nothing else. Every gate job on this work ran for the first time when the pull request opened, and one of them was red. Eleven commits, never gated, is the literal fact.

**`KP10-02` — the two new checks read the thread before the answer carrying it has been applied, and the failure above names the proof.**

`e2e/verify-web-build.ts:1384-1386` and `:1521-1523`:

```ts
await press('.v11-talk');
await page.waitForSelector('.v11w-sheet', { state: 'visible' }).catch(() => {});
const thread = (await readSheet('Virgil’s window with a conversation')) ?? '';
```

Between the `page.goto` above it and this read there is one wait, for a `canvas` to exist. Nothing waits for `/api/state` to have answered, nothing waits for the answer carrying the conversation to have been applied, and nothing asserts which window is open — where the Prover's cases in the same file, 600 lines earlier, wait for `__virgilV11.window === 'prover'` before reading a word.

The proof that this is the mechanism and not a guess is in the failure text: **`the thread draws 1 messages`**. Exactly one turn is what `nothingSaidYet` produces, and it is the only branch of `liveVirgilThread` that produces one. The page was live, and its conversation was still `null`, while the stub was serving three exchanges. The read landed in between.

This is `K11-04` — *wait for the condition, never for an interval, and never for nothing at all* — which **the same commit repaired 150 lines above** for the branch list, in a paragraph that says a check going red for how busy the machine is *"teaches everyone to ignore it, which is worse than not having it"*. That is exactly what happened here, on the slice's own acceptance case, in the same file, in the same commit.

`check-quality-v11.test.ts`'s wait rule passes this code, because `waitForFunction(canvas)` satisfies "something must make the page's readiness a condition". The canvas is not the readiness these two cases depend on. The mechanism is sound; its vocabulary does not yet reach this shape.

Both blocking findings close together, and the repair is bounded: wait on the product's own signal that the window is open and the answer applied, then read.

---

## The three questions this review was set

**1. The attempt limiter on `/api/instruct`. Does it hold?**

In the property that matters most, yes, and it is the best-evidenced thing in the candidate. The limit is checked **before** the comparison, so a locked-out address is refused without its guess being looked at; a missing header counts as the wrong guess it is; an unattributable request is counted against a shared bucket rather than waved through; a correct secret clears the address. Ten cases **drive the real handler** rather than reading its source — the first checks in this project to do so — and three mutations (`guessing-costs-something`, `unattributed-is-still-counted`, `the-address-is-not-the-client's-to-choose`) were each confirmed by this reviewer to go red when the guard is broken.

What it is not is recorded honestly and in the right place: the counters are one Lambda instance's memory, a cold start or enough concurrency buys a fresh allowance, and the protection is the secret's entropy, which no session can install or verify. `ENFORCEMENT_BOUNDARIES.md` says that in those words. One gap remains, at `KP10-06`.

**2. The workflow that writes to the repository.**

It holds the guarantees it claims, and the checks that say so read the file's step order rather than its prose. The question is written down **and committed** before the agent starts; the reply step is `if: always()` and carries both outcomes in one step, so a cancelled or dead run cannot fall between two opposite conditions; `set -o pipefail` stops a succeeding `tee` reporting success over a dead agent; the step reads `steps.agent.outcome` and not `conclusion`; the answer file lives outside the checkout so `git add -A` cannot commit it; every free-text value — the owner's prose and the agent's output alike — reaches the script through the environment; the branch name is allow-listed, not deny-listed, before anything is installed; `permissions:` is `contents: write` and nothing else.

One real gap survives, at `KP10-11`: the writing is guaranteed, the **delivery** is not.

**3. Can the window draw a message nobody sent?**

Not by any path this reviewer could find in the drawing code, and that is the strongest part of the slice. All four windows are proved, at every half-second of all three loops, to carry no recorded file, commit, command or finding on a live state; `fabricatorDoc` and `keeperDoc` now refuse the recording outright on live; `liveVirgilThread` renders only what the file holds, re-validated a third time in the browser, dropping any exchange that would draw a claim nothing supports rather than repairing it; a failed run speaks as `system` and never in Virgil's voice; and `Blocks.tsx` builds React elements and sets no HTML anywhere. The mutation `the-live-thread-is-the-owner's-own` was confirmed by this reviewer to go red when that guard is removed.

Three narrower ways the thread can still say something untrue are `KP10-03`, `KP10-04` and `KP10-05`. None of them invents words; each of them draws a true message under a false description.

---

## The findings

**`KP10-01` — the gate is red on the candidate, in this slice's own acceptance check.** Blocking. Above.

**`KP10-02` — the two new `verify:web` cases read before the page can have the answer.** Blocking. Above.

**`KP10-03` — an exchange stuck in flight is drawn as a session working, for ever.** `liveState.ts`'s `conversationOf` takes no time and compares none; `stateFromAnswer`'s `now` reaches the session report's shelf life and not the thread. So an exchange left at `asked` — by a failed push (`KP10-11`), a runner that dies before the `always()` step, or a token refused — draws *"A session is working on this on your repository"* with `streaming: true` indefinitely. The room grew a shelf life precisely so that a station could not stay lit after the run that lit it was gone; the thread, which is the surface the owner will actually read, has none. `report-shelf-life` is in the mutation manifest; there is no `thread-shelf-life`.

**`KP10-04` — a conversation that was read and is empty is drawn as one that could not be read.** `windowContent.ts`'s `nothingSaidYet` branches on `absent`, `unreadable` and `refused`; `read` falls to the default, which says *"The conversation could not be read, so nothing is shown. This is not the same as nothing having been said."* For a file with `exchanges: []` that sentence is false in both halves. `conversationComplaint` accepts an empty list, so the wire will carry it. Today's writer never emits one, which is why this is not blocking — and "unreachable through the only writer we have" is the assumption this file rejects everywhere else.

**`KP10-05` — a thread with rows dropped looks complete.** `conversationOf` drops any exchange that fails re-validation and returns the survivors. Dropping is the right choice; saying nothing about it is not. The all-or-nothing case is reported (`exchanges.length === 0 && raw.length > 0 → null`), the partial case is silent, and the owner reads a thread with a message missing as a thread with no message missing. Reachable only under drift between the two checkers — which is exactly the thing the browser re-check exists to survive.

**`KP10-06` — the address a client can write is preferred over the bucket it cannot escape.** `instruct.mjs`'s `addressOf` falls back to `x-forwarded-for`, then to `'unattributed'`. The docblock two lines above says `x-forwarded-for` *"can be"* forged. If `x-nf-client-connection-ip` is ever absent — a platform change, a proxy in front, a future host — rotating one header per request restores unlimited guessing, and the limiter becomes decoration in the exact way the file's own comment warns about. The check `trusts the connection address over one the client can write` covers *connection present*; `counts a request it cannot attribute` covers *both absent*; nothing covers *connection absent, forwarded forged*. The file's own rule — a limit that cannot be attributed has not been satisfied — argues for `'unattributed'` in that case.

**`KP10-07` — `runUrl` is said, in three places, to become an `href` on the owner's phone. It does not.** `live.ts`: *"The value reaches the window as an `href` on the owner's phone."* `state.mjs`: *"A link the window will invite the owner to press."* The pull request body: *"that value becomes an `href` on the owner's phone."* In this candidate `runNote` emits `{ kind: 'note', text: … }`, `Blocks.tsx` renders a note as text, and the only two `href=` in the application are a development link and the HUD's — neither fed by conversation data. **The guard is right and should stay**: the scheme check is correct, cheap, and true the day someone makes that string a link. What is wrong is the account of it, and this repository has been the subject of that species twice by its own record (`KP4-05`, `KP9-01`), both times in these same two files.

**`KP10-08` — the brief's premise about the composer is false, and its precondition is half met on a door already open.** `PHASE_2_SLICE_6_BRIEF.md` lists the composer as *"written and deliberately disabled"* and states, of rotation **and** attempt limiting, *"The composer does not ship without both."* But `canInstruct()` is `__LIVE__ && storedSecret() !== null`: on the hosted build the composer has been sending since the owner stored his secret, before this slice began. So the precondition was written for a door that was already open; one of its two halves is built and the other — rotation — is undone, and the record and the pull request body both say so. `PHASE_2_SLICE_6_RECORD.md` corrects the brief's item 5 and leaves this one standing. The owner should read the honest version: **the endpoint is live now, and its first layer of protection is a secret of unknown entropy.**

**`KP10-09` — the mechanism that proves the checks can fail is run by nothing.** `mutate` is in `apps/mission-control/package.json` and appears in no workflow. It is a manual script whose anchors have already drifted once (recorded in this branch's own second commit). It exits 2 on drift, which is the right design and only helps someone who runs it. This reviewer ran it: 19 of 19 behaved as recorded. Nothing on a pull request will notice the next drift.

**`KP10-10` — the required-check set is now the owner's to reconcile, and no session can do it.** `SA-S-04` records ruleset `22872557` on `refs/heads/main` requiring **nine** checks with no bypass actors. This candidate removes the `checks` job, so eight report. If `lint, typecheck, tests, owner build, owner verify` is one of the nine required contexts, it can never report again and every pull request stays blocked on a check that no longer exists — independently of `KP10-01`. The cut itself is well argued and well defended: `requiredCommands` now names each of the six commands in its own right, and the hardcoded `gated` list is derived from the workflow, which closes `SA-G-06`. This finding is about the ruleset, which is layer-2 territory and his alone.

**`KP10-11` — the answer is guaranteed to be written and not guaranteed to arrive.** Both `if: always()` commit steps end in a plain `git push origin "HEAD:$TARGET"`: no fetch, no rebase, no retry. A branch that moved — the owner pushed, a previous run landed — refuses the push, the step fails, and the answer written one step earlier dies with the container. The result is precisely the state the brief forbids: the question standing in the thread with nothing beside it, and, by `KP10-03`, drawn as still being worked on for ever. The same is true of any agent edit under `.github/workflows/`, which a `contents: write` token may not push at all.

**`KP10-12` — this is the first independent hop on any of it, and it is reviewing a brief the builder wrote.** One session wrote `PHASE_2_SLICE_6_BRIEF.md`, built all eleven commits, wrote `PHASE_2_SLICE_6_RECORD.md`, ran the system audit with its own subagents, and filed the seventh and eighth Keeper reviews of its own candidates — one of which a merge to `main` rested on. `SA-G-04` says so; the audit's governance reviewer said *"my independence is void"* in its own headline. This review is independent of that session and is not independent of the brief it measures against: where the brief is wrong, as at `KP10-08`, the measurement inherits it. The record's own line — *"the Keeper has not reviewed this"* — is now answered, and answering it does not repair `SA-G-04`.

---

## What this candidate gets right, said as plainly as the findings

The reviewer would not want the two blocking findings read as a judgment on the work. What was built here is the strongest thing in this repository at honesty about its own limits:

- Two real defects were found by building — an empty answer the schema accepted and the wire refused, and a `.url()` that accepts `javascript:` — in a pair of checkers a generated battery had already passed. The record says exactly why the battery could not have found them: it generates from the shape, and these are values.
- The endpoint's limiter is the first thing in this project checked by **running** it.
- Every guard written in this slice went into the mutation manifest as it was written, and all nineteen behave as recorded on this reviewer's machine.
- `SA-P-01` is a correction against the session's own prior reasoning, published rather than quietly dropped, and `PHASE_2_SLICE_6_RECORD.md` corrects the brief it was built from rather than matching it.
- Nothing has ever run through `instruct.yml`. The pull request says so in its own body, twice.

**What is needed to clear this review:** the repair at `KP10-02`, a green *hosted build, read and refused* on the repaired candidate, and re-review. `KP10-03` through `KP10-11` are for the owner to dispose of; `KP10-10` and the rotation of `INSTRUCT_SECRET` are his alone and no session can do either.

Filed by the review session on `claude/pr-12-virgil-review-7n72lr`. This session built nothing, repaired nothing and changed no file of the candidate.
