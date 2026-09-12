# Keeper review — pull request #14, final round on this lineage

**Verdict: `PASS_WITH_NON_BLOCKING_FINDINGS`.**

**Nothing I found warrants a further repair cycle.** That is the most useful sentence in this document and it is placed first deliberately. Six findings below are proposed for the register; none is a proven defect against an acceptance criterion, and none produces a false pass at this SHA.

Candidate: `5667063efd84e46f7d1eba56b0e5d8bd0b972278`, branch `claude/virgil-inspector-phase-1-rebased`, pull request #14, base `main`.
Reviewed: 2026-09-12. Previous verdict: `BLOCKED` on `4e331f5`, at `docs/process/KEEPER_PR14_REVIEW.md`, which is now committed on the candidate and which I read in full, along with `docs/process/KEEPER_PR11_REREVIEW_OD0016.md`, also now committed.

`REVIEW_POLICY.md`, "Staleness": a verdict never transfers to a new SHA. This is a review of `5667063` and endorses none of its predecessors.

**The three commissioned repairs all hold, and I tested them rather than read them.** Attack D now fails by name, and three routes around it are caught. Both reviews that existed in no file are kept, byte for byte, and I verified their digests against the commits they are pinned to rather than against the copies in the tree. The register, the pins, the `holds` arrays and the kept reviews agree in both directions for all thirty-one real `KXR` ids, and the four recorded open are honestly recorded — three of them verifiably still open, the fourth over-conservative rather than dishonest.

**The findings are all in one place: the turbo input declaration.** The guard is real and it caught the deletion its commit message says it catches. It also misses the repository's dominant root-reaching idiom — the one its own file is written in — and so does not protect three of the thirteen paths it declares, one of them `constitution/`, authority layer 2. Separately, the new `packages/**` declaration pulls gitignored files that the test task itself rewrites into the cache key, and the `test` cache now never hits at all. Those two defects currently mask each other, and each is fail-safe on its own.

## Independence and admissibility

I did not build this candidate and did not review any of its predecessors. I have repaired nothing and entered nothing in `docs/process/FINDINGS.md`: recording is a repair and `CLAUDE.md` gives each session one hop. My findings below are **proposals**, continuing the `KXR` sequence from `KXR-32`. I have not reused or renumbered `KXR-23` to `KXR-31`.

Every mutation ran in a **detached git worktree in the session scratchpad**, which was removed at the end. `git status --porcelain` in the reviewed checkout is empty before and after, and the checkout sits at `5667063`. The seed graph regenerates byte-identical: `pnpm --filter @virgil/knowledge-graph export-seed-graph` leaves the working tree clean.

**One action I declare rather than leave to be found.** This container held no clone. I attached this repository — and only this repository — and used the session's own GitHub credentials to read the Actions and Pulls APIs and to push this review. That is what `KXR-07` is about, so it is written down, as the previous two reviewers also wrote it down.

Against `constitution/REVIEW_POLICY.md`, "What review requires" — five preconditions, **all met**:

- **Deterministic verification completed for the SHA, with the cache off, and it passes.** `turbo run test --force` → `Tasks: 6 successful, 6 total`; `mission-control` alone is `38 passed (38)` files, `1917 passed (1917)` tests. `turbo run typecheck --force` → `Tasks: 8 successful, 8 total`. `biome check .` → `Checked 299 files`, no fixes, exit 0.
- **CI agrees, and I read it on the SHA rather than trusting a commit message.** The required check `lint, typecheck, tests` is **`success`** on both the push run (`34704625440`) and the pull_request run, together with `Mind Scan, V10 owner build and verify, committed digests`, `newest Owner Build rebuilds byte for byte`, and all four `V11 owner build and verify` matrix legs. One job, `lint, typecheck, tests, owner build, owner verify`, was still `in_progress` when I finished and **I do not record it as passed.**
- **The SHA is pushed and equal on local and remote. ✓** `git ls-remote` → `5667063efd84e46f7d1eba56b0e5d8bd0b972278`.
- **The diff stays within permitted paths. ✓** Nothing under `constitution/`, `docs/product/`, `knowledge/raw/`, `schemas/gate-*` or `packages/gate-engine/src/` is touched.
- **No test skipped, weakened or removed. ✓** `git diff origin/main...5667063 -- '*.test.ts'` adds 1,365 test lines and removes **none**. No `.skip`, `.only`, `.todo`, `skipIf` or `runIf` is added.

## `KXR-24` is genuinely repaired, and I attacked it four ways

This is the repair I was asked to test hardest. **Attack D — gut an attributes row, severity and reproduction replaced with plausible nonsense — now fails by name.** I ran the reproduction recorded in the finding's own row, the same one that was green for two reviews running.

| # | attack | result |
|---|---|---|
| **D** | `KXR-02` downgraded `major` → `minor`, reproduction replaced with *"Not reproducible; a cosmetic concern only"* | **caught** — `does not let an attributes row be rewritten with nothing recording it`, 1 failed / 244 passed |
| D2 | **Delete** `KXR-02`'s attributes row entirely | **caught** — `KXR-02 states its severity, surface, reproduction and authority` |
| D3 | **Malform** the row so the parser drops it instead of reading it | **caught** — same check; a row the reader can see and the parser cannot does not become invisible |
| D4 | **Second attributes table** carrying the exact header, with a gutted `KXR-02` row in it | **caught** — `has exactly one register table and one attributes table` |
| D5 | Downgrade to severity `trivial`, erase the reproduction, **and re-pin in the same commit** | **green — by design.** This is `KXR-36` below, and it is narrower than what it replaces |

D5 is the sanctioned route and I record it as such rather than as a bypass: `PINNED_ATTRIBUTES` is a digest, so changing a cell means editing the test in the same commit and the change is in the diff, which is exactly what the mechanism claims for itself. The residue is that nothing checks the *value* — `trivial` is not a severity `REVIEW_POLICY.md` defines, and after re-pinning it passes. That is a real but minor gap and it is a different gap from `KXR-14`.

**The honest status of `KXR-14` today is `repaired`, and the register says `repaired`.** That was the single false row the last two reviews turned on. It is now true.

## `KXR-30` and `KXR-26` — the records agree with each other, in both directions

`RECORDS` now keeps **seven** review documents, up from five. The two that existed in no file are both there.

**I verified the digests against the commits they are pinned to, not against the copies in the tree** — otherwise the check is circular:

```
git show 99f979c:docs/process/KEEPER_PR11_REREVIEW_OD0016.md | sha256sum
  → 2191784d9dca8aa0…   matches the pin
git show 73d5489:docs/process/KEEPER_PR14_REVIEW.md         | sha256sum
  → 68df6a0d7567977f…   matches the pin
```

Both are byte for byte what those commits held. `KXR-30` is repaired.

**The `holds` arrays close the range.** `KXR-01` through `KXR-31` with no gaps: `01–05`, `06–08`, `09–12`, `13–17`, `18–22`, `23–28`, `29–31`. `KXR-18` — the one the builder's own commit message says it missed — is now in its register row, in `PINNED`, and in the `holds` array for `KEEPER_PR11_UNREVIEWED_COMMITS_REVIEW.md`. `KXR-26` is repaired as an instance.

**And I ran the completeness check in the direction the suite does not.** Extracting every `KXR-\d+` id from all seven kept reviews and comparing against the register:

- every one of the 31 register ids is named in a kept review — **no orphans**;
- every id named in a kept review is in the register, apart from `KXR-98` and `KXR-99`, which are the fake ids the reviews use to *describe* their own attacks, and two loose matches on range notation written with an en dash. No real finding is missing.

So the records are complete today. The mechanism that would notice if they stopped being complete only runs one way, which is `KXR-35`.

## The four recorded open are honestly recorded

I reproduced each rather than taking the register's word.

| id | recorded | what I found |
|---|---|---|
| `KXR-25` | `open` | **The condition it names no longer holds.** `grep -c "merge approved" CLAUDE.md` → 1; `permissions` keys → `['allow','deny','ask']`; `ask` → the three merge routes; `Bash(git merge*)` in `deny` → `True`. `OD-0016` §5 is now a true description of `main`. Its attributes row pins the reproduction to *"Read §5 against `main` at the time of filing"*, which makes the finding about the record's accuracy when written — permanently true, and never closable. Defensible framing, over-conservative status. **Not a defect**; an observation below. |
| `KXR-27` | `open` | **Still open.** `KXR-22`'s register row still carries the half of the summary the finding is about. |
| `KXR-28` | `open` | **Still open, and I found the live text.** `docs/process/PHASE_1_BACKLOG.md:383` — *"Reading another repository needs the owner's written authorisation, and does not have it."* — with the superseded wording quoted at line 385. A layer-4 document presenting a deleted hard limit as live authority. |
| `KXR-31` | `open` | **Still open, and materially wider than when it was raised.** See `KXR-37`. |

Nothing is quietly closed. The one direction of error is `KXR-25`, and it errs toward recording too much rather than too little.

## `KXR-29` — the guard is real, and it misses the idiom its own file is written in

**The good half first, because the guard works and I confirmed the negative control the commit message offers.** Deleting `$TURBO_ROOT$/docs/**` from the `test` task's `inputs` makes `cache-inputs.test.ts` fail and name the path:

```
these are read by tests and not declared in turbo.json's test inputs, so a change to
one of them will replay a cached pass: docs — read by …
```

I ran that deletion test against **every** root path the task declares. Four are genuinely protected — `docs/**`, `knowledge/**`, `.virgil/**`, `netlify.toml`. **Three are not.**

### `KXR-33` — `constitution/**`, `.claude/**` and `schemas/**` can each be deleted with the guard green

**Severity: moderate. Non-blocking. Surface: `apps/mission-control/test/cache-inputs.test.ts`, `REACHES`; `turbo.json`, the `test` task's `inputs`. Authority concerned: `CLAUDE.md` — "A builder's success report is not evidence. Deterministic checks and independent review are."; `REVIEW_POLICY.md`, "Deterministic gates versus judgment".**

```
removed $TURBO_ROOT$/constitution/**   → Tests  3 passed (3)
removed $TURBO_ROOT$/.claude/**        → Tests  3 passed (3)
removed $TURBO_ROOT$/schemas/**        → Tests  3 passed (3)
```

All three are read from disk by tests. The guard cannot see them because it knows three shapes — `resolve(root, …)`, `resolve(repoRoot, …)` and `new URL('../../../…')` — and this repository reads the root mostly through two others:

- **The static ESM import.** `import authority from '../../../constitution/authority.json' with { type: 'json' }` — twelve of these across the test suite, eight of them `constitution/`.
- **`resolve(import.meta.dirname, '../../../…')`.** Five test files, reaching `constitution`, `.claude`, `schemas` and `docs`. `packages/agent-contracts/test/schemas.test.ts:12` is `resolve(import.meta.dirname, '../../../schemas')`; `permission-matrix.test.ts:14` is the same shape for `.claude/agents`.

**This is the sharpest form of it.** `cache-inputs.test.ts` computes its own root as `resolve(import.meta.dirname, '../../..')` — line 32. The guard is written in the idiom it does not match. The commit message declares the limit as *"a test reaching the root by a shape nobody has written yet is invisible to it"*; the shapes are already written, in eighteen places — twelve static imports and six `import.meta.dirname` resolutions — and they cover `constitution/` — authority layer 2, the tier only the owner may change.

**Why it is not blocking.** All three paths **are** declared at this SHA, so the cache is correct as shipped and no false pass exists. The finding is that the guard does not hold them there, and the class `KXR-29` named — a root path read by a test and not watched by the cache — remains reachable for the three highest-authority directories in the repository. The fix is two more patterns in `REACHES`, or matching on resolved paths rather than source text.

### `KXR-32` — the `test` cache never hits, because `packages/**` hashes files the task itself rewrites

**Severity: moderate. Non-blocking. Surface: `turbo.json`, the `test` task's `inputs`.**

`$TURBO_ROOT$/packages/**` is **new in this candidate** — it is not in the list at `4e331f5`, where the previous reviewer observed real cache hits. It pulls into the cache key two families of file that the test task rewrites every time it runs:

- `packages/*/.turbo/turbo-test.log` — turbo's own log, containing `Start at 16:24:21` and `Duration 1.36s`;
- `packages/*/node_modules/.vite/vitest/…/results.json` — vitest's own results cache.

Both are **gitignored**, so `$TURBO_DEFAULT$` never included them; it is the explicit glob that reaches them. Two consecutive `turbo run test` with no edits at all:

```
run 1: 6 packages, cache miss ×6
run 2: 6 packages, cache miss ×6      cache hits: 0
```

The task hash moves on every run — `e755f137…` → `64af0bfb…` — and diffing turbo's own input hashes names the two culprits exactly:

```
CHANGED INPUT: .turbo/turbo-test.log
CHANGED INPUT: node_modules/.vite/vitest/…/results.json
```

Removing `$TURBO_ROOT$/packages/**` restores caching immediately: `cache miss, executing 8b950af4bb72a731` then `cache hit, replaying logs 8b950af4bb72a731`.

**Why it is not blocking, said plainly.** A cache that never hits cannot replay a stale pass. This is fail-safe, and it is the opposite of the defect `KXR-29` named. It costs time, not truth. It also means **the positive control this lineage has used three times — change a root file, confirm a cache miss — no longer proves anything**, because every run is a miss whatever you change. I record that because the next session will reach for that proof.

### `KXR-34` — the guard and a working cache are mutually exclusive as written

**Severity: moderate. Non-blocking. Surface: `turbo.json`; `apps/mission-control/test/cache-inputs.test.ts`.**

`KXR-32` cannot be repaired without changing the guard, and that is worth its own id because it is the thing a repair session would discover the hard way.

The guard compares **first path segments**. Satisfying it requires a declaration that strips to exactly `packages`, which means `$TURBO_ROOT$/packages/**` and nothing narrower. I tried the obvious cache-correct narrowing:

```
$TURBO_ROOT$/packages/*/src/**  +  $TURBO_ROOT$/packages/test-fixtures/**
  cache:  cache miss … then cache hit        ← fixed
  guard:  1 failed | 2 passed (3)
          "… not declared …: packages — read by apps/mission-control/…"   ← rejected
```

And removing `packages/**` outright also fails the guard, because tests do reach `packages/test-fixtures/knowledge` through a shape the guard *can* see. So the declaration that satisfies the guard is the declaration that defeats the cache. Whoever repairs `KXR-32` must change `cache-inputs.test.ts` in the same commit, and should attack the new granularity rather than confirm it.

**I also reproduced the full failure signature once, to show the defects are real rather than theoretical** — with `packages/**` removed (so the cache works) and `constitution/**` removed (which the guard permits), turbo replayed `cache hit, replaying logs 8b950af4bb72a731` over a gutted `constitution/authority.json` while `vitest` failed `schemas.test.ts > constitution data validates against its contracts > authority.json` by name. I record honestly that the guard was red in that configuration, because removing `packages/**` is what made it red. The two defects currently mask each other. Repair either one alone and the mask is gone.

## `KXR-35` — the completeness check still runs one way only

**Severity: minor. Non-blocking. Surface: `apps/mission-control/test/review-records.test.ts:140`. Authority concerned: `REVIEW_POLICY.md`, "Findings" — never dropped.**

`every KXR finding the register carries has a document that holds its text` reads the register and looks for a home. There is no check in the other direction: a finding raised in a review and never entered in the register is still invisible, which is precisely what `KXR-26` was about, and `KXR-26` is recorded `repaired`.

**It is narrower than it was, and the narrowing is real.** The kept reviews are pinned byte for byte, so no new id can appear inside a frozen document. The residue is a *newly added* record whose `holds` array omits an id its text carries — the exact shape of the `KXR-18` omission, one iteration on. I checked and there is no such omission today.

I am not raising this against the `repaired` status: the vocabulary has `caught_not_repaired` for a class caught with the defect unrepaired, and this is the reverse — instance repaired, class narrowed. The register's own note says so. I raise it because the counting is the thing this lineage built, and it counts in one direction.

## `KXR-36` — there is no severity vocabulary

**Severity: minor. Non-blocking. Surface: `docs/process/FINDINGS.md`, "Vocabularies"; `apps/mission-control/test/findings-register.test.ts`.**

`FINDINGS.md` defines the **Status** vocabulary word by word, and the **Found by** vocabulary. It defines no severity vocabulary, and nothing validates the severity cell against the four words `REVIEW_POLICY.md` implies. The assertions on that table are `value.length > 3` and `not.toBe('—')`.

Attack D5: `KXR-02` set to severity `trivial` with its reproduction replaced, and `PINNED_ATTRIBUTES` updated in the same edit → `245 passed (245)`. The previous reviewer found `trivial` passing too, before the pin existed. The pin has made the change **visible in the diff**, which is the whole of what it claims, and that is a genuine improvement. What is still missing is a closed list, which the status column already has and which would be four lines.

## `KXR-37` — the pull request description still describes `4e331f5`

**Severity: moderate. Non-blocking. Surface: pull request #14's description. Authority concerned: the accuracy of the document the owner is asked to decide on; `KXR-16`, `KXR-27` and `KXR-31` as raised.**

`KXR-31` asked for one line to be added to this description. Instead the description was not touched at all, and the candidate moved under it. I read the live body (4,105 characters) and checked it term by term:

| term | in the description |
|---|---|
| `cache-inputs`, `attributes`, `ten findings` | **absent** |
| `KXR-18`, `KXR-24`, `KXR-25`, `KXR-26`, `KXR-27`, `KXR-28`, `KXR-29`, `KXR-30`, `KXR-31` | **absent, every one** |
| `298 files` | present — the candidate is **299** |

So the page the owner will read to decide:

- names **none of the three repairs** this candidate makes, and none of the ten findings it records;
- lists under "Still open and not repaired" only `KXR-03`, `KXR-07`, `KXR-16`, `KXR-17`, `KXR-19`, `KXR-21` — **omitting all four the candidate itself records as open**, and still omitting `KXR-24`, which is the omission `KXR-31` was raised for and which is now repaired without the page saying so;
- reports a verification block for the previous SHA;
- still carries the sentence the last review disproved — *"turbo had a cached lint pass. The same condition, one task over."* There is no `lint` task in `turbo.json`; `biome` has never run through turbo.

**This is the finding I would put in front of the owner alongside the verdict**, because it is the only one that affects what he is deciding on, it is outside the tree, and it is a description edit rather than a repair. The candidate is better than its description in every particular.

## Observations, which are not findings

1. **`KXR-25` is recorded `open` and the state it names now exists in `main`.** Its attributes row fixes the reproduction to the time of filing, which makes the framing defensible and the finding permanently unclosable. Erring toward recording too much is the right direction; I note it so a reader does not go looking for a live defect.
2. **`cache-inputs.test.ts` walks the real filesystem from the repository root**, skipping `node_modules`, `dist` and dotted entries. Its verdict therefore depends on untracked `.test.ts` files in whoever's working tree it runs in, and it reads `scratchpad/study-v11-screens/test/report.test.ts` — a file tracked inside a directory `.gitignore` excludes at line 29, and one vitest never runs. Not a defect today; a surface that will drift.
3. **Two reviews name `KXR-98` and `KXR-99`**, the fake ids their own attack tables use. Any future check that reads finding ids out of the kept reviews will have to exclude them, and they are worth knowing about before that check is written.
4. **The seed graph regenerated byte-identical**, at the start and the end of the session, across every mutation I made and reverted. The checkout I reviewed is the checkout that was pushed.
5. **The commit message makes no false claim.** I checked it against the tree line by line, because the last two verdicts both turned on a builder's claim about `pnpm check` that was not true. This one claims `--force` results, which I reproduced; it claims the guard catches a `docs/**` deletion, which it does; and it states the guard's limit rather than concealing it. It does not mention `packages/**`, which is the addition that broke the cache — an omission, not a false statement. After four reviews in which a document in this pull request confidently asserted a mechanism it had not checked, this commit message does not.

## What I recommend, and what I do not

**Record all six. Repair none of them on this lineage.**

- `KXR-32`, `KXR-33` and `KXR-34` are one coupled piece of work on the turbo input declaration: two more patterns in `REACHES`, a path-granular comparison instead of a first-segment one, and a `packages/**` declaration that excludes `.turbo/` and `node_modules/`. Done together, with the new granularity attacked rather than confirmed. None of them can produce a false pass at this SHA, and doing this inside a final round under time pressure is how `KXR-29` happened twice.
- `KXR-35` and `KXR-36` are each a few lines and neither is urgent.
- `KXR-37` is not a repair at all. It is an edit to a pull request description, and the owner can ask for it in one sentence.

**On the repair limit.** `constitution/authority.json` sets `repairLimits.maxCyclesWithOwner = 2` and `OD-0016` §2 records the owner authorising a third. This verdict does not consume a cycle and does not ask for one.

## Verdict

**`PASS_WITH_NON_BLOCKING_FINDINGS`.**

**No further repair cycle is warranted.** Nothing I found is a proven defect against an acceptance criterion, and I looked for one specifically: `REVIEW_POLICY.md` reserves `BLOCKED` for a proven defect with the criterion it fails named, and being the last round is not a reason to pass something false. There is nothing false here to pass.

All three commissioned repairs test out. **`KXR-24` is repaired** — attack D fails by name, and deleting the row, malforming it, and duplicating the table are all caught; the one route through is the sanctioned one, where the edit lands in the diff. **`KXR-30` is repaired** — both reviews that existed in no file are kept, and their digests match the commits they are pinned to rather than the copies in the tree. **`KXR-26` is repaired as an instance** and honestly narrowed as a class: `KXR-18` is in its row, its pin and its `holds` array, and I ran the completeness check in the direction the suite does not and found no real finding missing. The register, the pins, the `holds` arrays and the seven kept reviews agree with each other in both directions for all thirty-one ids. The four recorded open are honestly recorded: `KXR-27`, `KXR-28` and `KXR-31` are verifiably still open and I found the live text of `KXR-28` at `PHASE_1_BACKLOG.md:383`; `KXR-25` is over-conservative rather than closed. No test is skipped or weakened — 1,365 test lines added, none removed. No protected boundary is touched. Local and remote agree, the seed graph is fresh, cache-off verification passes at 1,917 tests, and CI's required check is `success` on the SHA rather than on a commit message's word.

**`KXR-29` is repaired in substance and the guard is weaker than its own account of itself.** It catches what the commit says it catches — I ran the deletion test against all thirteen declared paths and four are genuinely held. Three are not: `constitution/**`, `.claude/**` and `schemas/**` can each be deleted with the suite green, because the guard knows three root-reaching shapes and this repository mostly uses two others, one of which is the shape `cache-inputs.test.ts` is itself written in. `constitution/` is authority layer 2. And the `packages/**` declaration added to satisfy the guard hashes turbo's own logs and vitest's own results cache, so the `test` task now never gets a cache hit at all — which is fail-safe, which is why this is not `BLOCKED`, and which means the positive control this lineage has leaned on three times no longer distinguishes anything. The two defects mask each other, and the declaration that satisfies the guard is the declaration that breaks the cache, so neither can be repaired alone.

That is a bounded piece of work on one file and a test, and it is not this round's. What this lineage set out to buy — that the records say what the machine says — it has bought. The register is true on all thirty-one rows, the reviews that blocked it are in the repository rather than on deletable branches, and a session that guts a finding is now stopped by name.

`constitution/STATE_LANGUAGE.md`: `PASS_WITH_NON_BLOCKING_FINDINGS` is not `SAFE_TO_MERGE`, and nothing in this document is a merge approval. The six findings persist and stay inspectable, as `REVIEW_POLICY.md` requires. The one I would put to the owner with the verdict is `KXR-37`: the description on the page he will read describes the previous candidate, and the work is better than the page says it is.
