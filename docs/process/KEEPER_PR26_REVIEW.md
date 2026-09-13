# Keeper review of pull request #26, candidate `7e1f719e`

**Captured verbatim on 2026-09-13** from [comment 5653179449](https://github.com/dniachini-droid/Virgil-mission-control/pull/26#issuecomment-5653179449) on pull request
#26. It judged candidate `7e1f719e6a1df57c52e5400d5499769952db09f8`.

**Nothing below the rule is edited.** Figures that have since gone stale and
statements this repository has since corrected stand exactly as they were
written: a review is a record of what someone found at a moment, and a record
edited afterwards is not a record.

---

## Keeper review — candidate `7e1f719e6a1df57c52e5400d5499769952db09f8`

**PASS_WITH_NON_BLOCKING_FINDINGS.** Candidate `7e1f719e6a1df57c52e5400d5499769952db09f8`, base `4e39b822cc9aa0cb98025b1203c3857a269e1710`, branch `claude/virgil-handoff-protocol`. Seven non-blocking findings, none blocking.

This is not `SAFE_TO_MERGE`. Merging is the owner's and this informs it.

---

## What the work does, and whether it does it

**In plain terms.** It builds the plumbing for a chain of sessions that can run while you sleep — one starts the build, the pull request wakes the conductor, the conductor starts a review, the review wakes it, and it either starts one repair round or stops and tells you. The safety parts are a counter that lives on the pull request rather than in any session's memory, and a rule that a session which pushed must post machine-derived facts about its own push before anybody reviews it.

**It does what it says, on the path it documents.** I reinstated seven separate defects and every guard that claims to catch one caught it. I could not buy a third repair round with any authorisation number. I could not get the counter to inherit a stale verdict across a push.

**Two things it does not do that its own prose claims it does**, both found by attacking rather than reading, both non-blocking and both small to close:

1. The round cap is enforced against the *authorisation marker* — proven — but not against the *role* a session declares for itself. A repair session that posts its facts as `--facts builder` instead of `--facts fixer` leaves the counter at zero repair rounds forever, and the chain will authorise "round 1" indefinitely. Both spellings are commands this repository offers and nothing checks which is true.
2. The counter requires the pull request's comments in oldest-first order. Nothing says so in the conductor's instructions and nothing checks it. Handed the same four comments newest-first, the chain commissions a review of an already-reviewed commit and never stops doing so.

Neither happens on the documented path. Both are worth closing before the first unattended overnight run, which — as the builder states and I confirm — has never happened.

---

## What I ran, and what it printed

Cache off, on the checked-out candidate.

```
$ npx biome check .
Checked 90 files in 57ms. No fixes applied.

$ npx turbo run typecheck --force
 Tasks:    7 successful, 7 total
Cached:    0 cached, 7 total
  Time:    5.335s

$ pnpm tier
tier 3, from 20 changed paths against origin/main
  governed: .claude/agents/fabricator.md — it states what every session may and may not do
  governed: .claude/agents/keeper.md — it states what every session may and may not do
  governed: .claude/skills/raphael/SKILL.md — it states what every session may and may not do
  governed: packages/gate-engine/src/handoff.ts — it decides what a gate refuses
  governed: packages/gate-engine/src/index.ts — it decides what a gate refuses
  governed: packages/repo-checks/package.json — these are the checks the repository runs on itself
  governed: packages/repo-checks/test/handoff-chain.test.ts — these are the checks the repository runs on itself

$ (tools/knowledge-lint) npm run lint
knowledge graph: 72 nodes, 126 edges, 8 pages, 22 claims, 75 tethers (75 intact)
mind scan: no findings
```

**Tier confirmed independently: tier 3, seven governed paths.** The body above still says *"Tier 1, derived and not claimed"*. It is wrong, the correction comment says so, and leaving the wrong sentence standing is the right call — a pull request that silently rewrites its own record is worse than one carrying its own correction.

**The test suite, and the one failure.** 568 tests exist. The builder's "568 passed, 0 failed" is what CI reports and what I confirm from the CI log for this exact SHA:

```
✓ test/handoff-chain.test.ts (30 tests) 4499ms
    ✓ refuses a handoff for a commit that never left the machine 1552ms
 Test Files  5 passed (5)
      Tests  290 passed (290)
```

`lint, typecheck, tests` is **success** on `7e1f719`. In *this* container it is not:

```
$ pnpm test
@virgil/gate-engine:test:       Tests  76 passed (76)
@virgil/knowledge-graph:test:   Tests  24 passed (24)
@virgil/domain:test:            Tests  104 passed (104)
@virgil/agent-contracts:test:   Tests  74 passed (74)
@virgil/repo-checks:test:  ❯ test/handoff-chain.test.ts (30 tests | 1 failed) 73734ms
 FAIL  test/handoff-chain.test.ts > refuses a handoff for a commit that never left the machine
Error: Test timed out in 60000ms.
 Tasks:    4 successful, 5 total
Failed:    @virgil/repo-checks#test
```

and on its first run, before anything was cached, it said why:

```
AssertionError: expected 'npm error code SELF_SIGNED_CERT_IN_CH…' to contain 'not on the remote'
+ npm error request to https://registry.npmjs.org/tsx failed, reason: self-signed certificate in certificate chain
```

That is the new guard reaching the npm registry. `KXR-46/PR26` below. Run directly, the same file passes: `Tests 30 passed (30)` in 3.22s, and the whole package `290 passed (290)` in 3.8s.

---

## The four claims, attacked

Every mutation was applied to a **copy** of the repository, never to the candidate tree, and each was reverted before the next. The candidate tree is clean at `7e1f719` — verified after.

| # | attack | guard | fired? |
|---|---|---|---|
| 1 | `mayLaunchStages` re-read from the matrix | `exactly one role may launch a stage` | n/a — matrix untouched by this diff; exactly one launcher, `virgil`; `fabricator` and `keeper` both `false` |
| 2 | the authorisation ceiling removed (`Math.min` dropped) | `refuses to be authorised past the constitution` | **yes** — 1 failed \| 75 passed |
| 3 | `ROUNDS_WITH_OWNER` raised to 3 | `the counter uses authority.json numbers and no others` | **yes** — 2 failed in each package |
| 4 | the factless refusal removed from `nextStep` | four cases across both suites | **yes** — 3 failed \| 73 passed, and 1 failed \| 29 passed |
| 5 | `lastVerdict` no longer broken by a later push | staleness cases | **yes** — 5 failed \| 71 passed, and 2 failed \| 28 passed |
| 6 | a fixer no longer required to name findings | `a fixer must name the findings it repaired` | **yes** — 1 failed \| 29 passed |
| 7 | `notDone` removed from `candidate-artifact` | `the contract has the box a review actually needs` | **yes** — 1 failed \| 29 passed |
| 8 | **the unpushed-commit refusal disabled** (attack P, the admitted gap) | `refuses a handoff for a commit that never left the machine` | **yes** — `AssertionError: a handoff was accepted for an unpushed commit`. The admission is true and `7e1f719` closes it. |

**Claim 2, attacked directly.** `rounds=99` with both rounds already spent and a `BLOCKED` verdict:

```
roundsUsed=2 authorised=2 lastVerdict=BLOCKED
-> next=owner  because 2 of 2 fix rounds are spent, which is the constitution's ceiling
```

I could not get a third round out of it by any authorisation number, by stacking authorisation markers, or from an empty pull request. **The cap holds against the marker.** It does not hold against a mislabelled role — `KXR-44/PR26`.

**Claim 3, attacked directly.** A hand-typed facts marker with no facts in the comment at all is accepted:

```
"I did some work, trust me." + facts marker + handoff marker
roundsUsed=0 unreviewed=dead123 facts=true
-> next=review  because dead123 was pushed and no reviewer has reported on it
```

The script cannot be made to emit that — it refuses a reviewer, refuses a fixer with no `--findings`, refuses an unpushed commit, refuses an empty `--ran` file. The hole is typing, not generating, and the guard that no role file carries a copyable marker is what keeps it shut. `KXR-48/PR26`.

**Claim 4.** Confirmed both ways: with a fixer's push newest, `lastVerdict` is null and `next=review`; restore the old scan and five tests go red.

**The 30 guards that assert the text of `.claude/agents/*.md` and the skill: half of them are real, half are thinner than they read.** `not.toContain('send_later')` is a real guard — it forbids the shape the timer would come back as. `toContain('Start nothing')` is not. I appended a section to `fabricator.md` telling the builder to start the Keeper itself with the Agent tool, left every asserted sentence intact, and got `30 passed (30)`. What actually stops a Fabricator launching a session is that its role grants `Read, Grep, Glob, Bash, Edit, Write` and no launching tool at all — which is stronger than either the prose or the matrix, and is worth saying in the file. `KXR-49/PR26`.

---

## Findings

**None blocking.** Nothing here breaks, every check the candidate adds can fail, and the machinery does what its contract says on the documented path. Ids are qualified with the pull request because the unqualified series is contested: `KXR-43` is the highest filed row, `KXR-39`–`KXR-42` are taken on `main` by `77c0eab`, and #27 records the owner requalifying #20's review as `KXR-39/PR20`…`KXR-46/PR20`, which may consume 44–46. Qualifying mine cannot collide with either.

### `KXR-44/PR26` — major, non-blocking. The round cap is defeated by a session declaring the wrong role

**Surface.** `packages/gate-engine/src/handoff.ts`, `roundsUsed`; `scripts/virgil-chain.ts`, `--facts`.

**Reproduction.** Three repair rounds, each posting `--facts builder --round 0` rather than `--facts fixer`:

```
roundsUsed=0 authorised=1 lastVerdict=BLOCKED
-> next=fix round=1  because the review is blocking and round 1 of 1 is authorised
```

`roundsUsed` counts handoffs whose declared role is `fixer`. The role is the session's own word; `--facts builder` is a legal command for any session and nothing derives the role from the pull request. So the count never advances and build→review→fix→review runs without bound, on the exact night nobody is watching.

**Criterion it fails.** `docs/process/AUTOMATIC_HANDOFF_CHAIN.md` rule 5: *"The ceiling is enforced by the counter, not by a paragraph."* Against the authorisation marker that is true and I proved it. Against the role field it is a paragraph.

**What would close it.** Derive the round count from position rather than from the declaration — a pushing handoff that appears after any reviewer handoff is a repair round whatever it calls itself — or refuse `--facts builder` with `--round` greater than zero. Either is a few lines and needs no new concept.

### `KXR-45/PR26` — major, non-blocking. The comment order is load-bearing, undocumented and unguarded

**Surface.** `packages/gate-engine/src/handoff.ts`, `readChain`; `.claude/skills/raphael/SKILL.md`, steps 1–3 of "Reading the chain".

**Reproduction.** The same four comments — build, review, fix, review — read oldest-first and then newest-first:

```
oldest first:  lastVerdict=PASS unreviewed=null  -> next=owner
newest first:  lastVerdict=null unreviewed=a1    -> next=review
```

and it does not recover, because each review it commissions goes to the front of the reversed list while the original build stays last:

```
iteration 1: next=review — a1 was pushed and no reviewer has reported on it
iteration 2: next=review — a1 was pushed and no reviewer has reported on it
iteration 3: next=review — a1 was pushed and no reviewer has reported on it
iteration 4: next=review — a1 was pushed and no reviewer has reported on it
```

Unbounded review sessions, and the repair cap never engages because reviews are not repair rounds. `readChain`'s own doc comment says *"oldest first"*; `SKILL.md` says only *"Fetch all its comments. Write their bodies to a file as a JSON array of strings"*. GitHub's comment listing happens to return oldest-first, so the happy path works — but the conductor is paginating an API and assembling a file, and nothing anywhere asserts the order.

**Criterion it fails.** `handoff.ts`'s own stated design rule, *"Every path that is not plainly 'carry on' ends at the owner"*, and the containment argument in rule 1 — *"a quiet, branching tree of work nobody asked for, discovered the next morning, having spent a night's usage on it"*, which is precisely what this produces.

**What would close it.** `SKILL.md` says "oldest first" in the step, a guard asserts that sentence, and `--comments` prints the order it assumed so a wrong one is visible in the conductor's own output.

### `KXR-46/PR26` — minor, non-blocking. The new guard is the only test in the repository that needs the npm registry

**Surface.** `packages/repo-checks/test/handoff-chain.test.ts:336-353`.

**Reproduction.** Run `pnpm test` in a container whose egress is proxied. The guard spawns `npx tsx` with `cwd` set to a throwaway directory outside the workspace, so `npx` cannot resolve the repository's own `node_modules/.bin/tsx` and goes to `registry.npmjs.org` instead — first `SELF_SIGNED_CERT_IN_CHAIN`, then, once cached differently, `Error: Test timed out in 60000ms`, both quoted above. Every other `tsx` spawn in the file uses `cwd: root` and never touches the network. It passes in CI in 1552ms.

**Criterion it fails.** Nothing in the contract — CI is green and this is environmental. It matters because the sessions this chain is built for run in containers like this one, and a builder whose `--ran` evidence is `pnpm test` will report a failure it did not cause and cannot explain.

**What would close it.** Spawn `resolve(root, 'node_modules/.bin/tsx')` instead of `npx`. The `cwd: scratch` is necessary; `npx` is not.

### `KXR-47/PR26` — minor, non-blocking. Four more refusals of the same shape as the admitted one

The admission in `7e1f719` is honest, and the class it belongs to is not exhausted. I disabled each of these in turn and got `30 passed (30)` every time:

| refusal, verified working today | where it is claimed | held by a test |
|---|---|---|
| `--ran` names an empty file | `AUTOMATIC_HANDOFF_CHAIN.md:121`, `fabricator.md:82` — *"An empty file is refused"* | no |
| the script refuses to print a marker its own reader cannot read back | `SKILL.md:409`, commit `91205a9` | no |
| `--emit reviewer` must carry a verdict | the script's own message | no |
| facts refused from `main` or a detached HEAD | claimed nowhere | no |

All four work — I ran each and each exited 2 with its own message. The first two are behaviours asserted in prose this diff ships, which is exactly the shape the last commit exists to fix.

### `KXR-48/PR26` — minor, non-blocking. The facts *marker* is the check, not the facts

Reproduced above: a typed marker with no facts satisfies `nextStep`. The same mechanism means any comment that *quotes* the marker format injects a phantom handoff — a quoted `role=fixer` marker inflates the round count, and a quoted pair produces a review of a SHA that does not exist. The guard that no role file carries a copyable marker does not extend to comments, which is why this review describes the format in words rather than reproducing it. `AUTOMATIC_HANDOFF_CHAIN.md` rule 3 says *"Nothing proceeds without it"*; the accurate statement is `CLAUDE.md`'s own about merge protection — a hurdle, written down as one.

### `KXR-49/PR26` — minor, non-blocking. The role-file guards catch deletion, not contradiction

Demonstrated above: `fabricator.md` instructing the builder to start the Keeper itself passes all 30. Worth recording because the test file's own header claims these *"are tests that a written rule still has something holding it"* — they hold the sentence, not the rule. The tool grant is what holds the rule and the file should say so.

### `KXR-50/PR26` — minor, non-blocking. Merge order against #24

`docs/process/AUTOMATIC_HANDOFF_CHAIN.md:27` and the diagram it sits in have the build session *"pushes, opens its own pull request"*. `CLAUDE.md` on `main` says *"Never open a pull request … unless the owner explicitly authorised it in writing for that session."* Merged alone, this candidate ships a layer-4 process document instructing what `CLAUDE.md` forbids — a contradiction I report rather than resolve. #24 removes that prohibition on the owner's decision `OD-0018`. **The two are not in conflict; they complete each other, and #24 should land first or together.**

---

## What I could not run, and what I did not do

- **The chain has never run end to end and I did not run it.** Every claim in this review is about the counter, the script and the guards. Nothing here is evidence that the chain works in practice, and the builder says so too.
- **I could not verify the three owner quotations** in the body and in `AUTOMATIC_HANDOFF_CHAIN.md`. Nothing in this repository holds an independent copy of the owner console. That is the owner's own check.
- **`scripts/` is still covered by no tsconfig**, as recorded. The script is exercised through `tsx`, which is weaker than a typecheck. I confirmed the gap and did not treat the `tsx` runs as one.
- **`pnpm tier` needs `git fetch origin main` first** in a fresh container, or it exits 2. Not a finding — the message says exactly that — but worth knowing before a session reads its own failure as a defect.
- The three red Netlify checks are not this pull request's, for the reasons already posted; I confirmed `netlify.toml` is absent from both `main` and this branch.
- **I filed no rows in the findings register, started no session of any kind, edited no file in this repository, and merged and approved nothing.** All mutations were made in a separate copy and the candidate tree is clean at `7e1f719`.

---

**No repair round is warranted on this candidate and I do not recommend one: nothing here is blocking, and the disposition of non-blocking findings is the owner's under `OD-0004`.** If a bounded change follows, the three worth its scope are `KXR-44/PR26` (count repair rounds by position, not by the role a session claims), `KXR-45/PR26` (`SKILL.md` says oldest-first and a guard holds it) and `KXR-46/PR26` (spawn the local `tsx`, not `npx`) — and the first two should close before the first unattended overnight chain runs, not before this merges.

<!-- virgil:handoff role=reviewer round=0 sha=7e1f719e6a1df57c52e5400d5499769952db09f8 verdict=PASS_WITH_NON_BLOCKING_FINDINGS next=owner -->

---
_Generated by [Claude Code](https://claude.ai/code)_
