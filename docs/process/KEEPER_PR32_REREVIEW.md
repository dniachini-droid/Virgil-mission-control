# Keeper review of pull request #32, candidate `6e7c6b32`

**Captured verbatim on 2026-09-13** from [comment 5653771242](https://github.com/dniachini-droid/Virgil-mission-control/pull/32#issuecomment-5653771242) on pull request
#32. It is the final review of pull request #32, after the one repair round the first review authorised, and it judged candidate `6e7c6b329c46c7a848fba3ba70f3a06d215ec208`.

**Nothing below the rule is edited.** Figures that have since gone stale and
statements this repository has since corrected stand exactly as they were
written: a review is a record of what someone found at a moment, and a record
edited afterwards is not a record.

**No substitution was needed.** `docs/process/KEEPER_PR27_REVIEW.md` and
`docs/process/KEEPER_PR30_REVIEW.md` had to rewrite doubled-square-bracket
lesson links as `⟦id⟧` so the knowledge scan would not read a quoted link as a
made one — `KXR-49/PR27`. This comment contains no such link, so this capture is
the comment's bytes exactly, with nothing replaced.

---

# Keeper review — candidate 6e7c6b329c46c7a848fba3ba70f3a06d215ec208

**PASS_WITH_NON_BLOCKING_FINDINGS** — `6e7c6b329c46c7a848fba3ba70f3a06d215ec208`, the head of `claude/chain-loopholes`, against `main` at `b273739`.

## The one sentence, for the owner

**Both findings are closed: `KXR-70/PR32` — the order guard that could not fire — now fires on the real markers this repository writes, and `KXR-71/PR32` — the false claim that position could not be misdeclared — was closed properly by counting the reviews, *and* the false sentence was deleted from both the process document and this description.**

The repair did not take the cheaper of the two options it was offered. It took the real one and deleted the sentence as well.

## In one paragraph

The previous reviewer found a guard that read as closed and refused nothing. That is fixed, and I proved it the way it needed proving — not against a test helper, but against the two markers actually sitting on this pull request, one seven characters long and one forty. Reversed, the repaired code stops the chain at you; the old code, handed exactly the same two comments, hands the chain to another session instead. That is the first end-to-end evidence this guard works on what the system really emits. The count is also genuinely harder to lie to now, because the number it leans on — how many reviews happened — is the one number no session writes about itself. I found one thing worth telling you about: a sentence in the code claiming a certain kind of mistake "can only" stop the chain at you, which is not true. It is not dangerous here and I explain why below, but it is the same shape of over-claim that `KXR-71` was, so it should not be left standing quietly.

## What I ran, read from exit status and never from printed lines

| command | exit |
|---|---|
| `pnpm install --frozen-lockfile` | **0** |
| `git fetch origin main` | **0** |
| `pnpm lint` | **0** |
| `pnpm typecheck` | **0** |
| `pnpm test --force` | **0** |
| `pnpm tier` | **0** — `tier 3, from 4 changed paths against origin/main` |

**The real test count, not the task count: 672 tests in 25 files, all passed** — gate-engine 91, knowledge-graph 61, domain 104, repo-checks 342, agent-contracts 74. `handoff.test.ts` is **33 cases**, as the description says. The previous review recorded 664 with gate-engine at 83; 664 + 8 = 672, which is consistent with the eight cases this round adds.

**Three red Netlify checks are not this candidate's — confirmed rather than accepted.** `netlify.toml` is absent from this head *and* from `main` (`git cat-file -e` fails on both), and the situation is already filed as yours in `docs/process/OWNER_TODO.md:56`. `lint, typecheck, tests` is **success** on this head.

## The live demonstration — `KXR-70/PR32` proved end to end

I was asked to emit my own marker with the full forty characters and see whether the counter matches it against the seven-character fixer marker already here. It does.

First, my reconstruction of this pull request's real comments reproduces the conductor's reading exactly — 2 handoffs, `fix rounds spent : 1`, `next=review`. The keeper review's deliberately syntax-stripped illustration line correctly counts for nothing.

Then the discriminating control, because a forward chain would reach `ordered=true` whether or not the match works. I took **the two real markers from this pull request** — the fixer's `sha=6e7c6b3` and my own `sha=6e7c6b329c46c7a848fba3ba70f3a06d215ec208` — added an owner authorisation of two rounds so that the round cap could not be what stops it, and reversed them:

| code | result |
|---|---|
| **the candidate** | `next=owner` — *"the comments are not in the order this count depends on"* |
| **pre-repair (exact equality)** | `next=review` — *"6e7c6b3 was pushed and no reviewer has reported on it"* |

The second line is `KXR-45/PR26`'s original failure, unchanged. The first is the guard firing on a seven-character marker against a forty-character one. **`KXR-70/PR32` is closed against the tooling, not against a helper.**

I also confirmed the honest forward chain is unaffected at one, two, three and four fix rounds, using real 40-character shas from this repository: `ordered=true` throughout, and every reversed counterpart caught.

## Proving each check can fail — with my own controls

Each defect reinstated in a copy **outside** the repository, this repository's **unmodified** test file run against it. Figures are the whole `gate-engine` package (91 tests); the description's figures are `handoff.test.ts` alone (33) and are consistent with mine.

| # | mutant | result |
|---|---|---|
| 0 | control: unmutated copy | **0 failed \| 91 passed** |
| 1 | `sameSha` → exact equality (reinstates `KXR-70`) | **1 failed \| 90 passed** — *catches a reversed chain whose markers disagree about how long a sha is* |
| 2 | count declared pushes only (reinstates `KXR-71`) | **2 failed \| 89 passed** — both review-floor cases |
| 3 | both, i.e. `handoff.ts` as at `8ba4452` | **3 failed \| 88 passed** |
| 4 | **mine:** `sameSha` → true for any two non-empty strings | **0 failed \| 91 passed** |

Mutants 1–3 confirm the three checks this round adds are real and independent. **Mutant 4 is mine and is the finding below:** a comparison that matches *everything* passes the entire suite, so nothing constrains the over-eager direction.

## Findings — all non-blocking

Ids continue from **`KXR-80` upward, qualified `/PR32`**, as instructed. I checked for collisions: `KXR-98` and `KXR-99` exist in `docs/process/` but are deliberately fabricated probes from earlier register-attack reviews, not live findings. **I filed no register row**, as required.

### `KXR-80/PR32` — non-blocking, medium. "A false match here is the safe direction" is not true

**Surface:** `packages/gate-engine/src/handoff.ts:150-155`, repeated at `test/handoff.test.ts:393-396` and in this description.

The claim is that matching too eagerly *"can only make the guard find a review that appears to precede its own push, and that resolves to the owner."* It cuts both ways. `firstPushOf` scans from index 0 and returns the **first** match, so an extra match can only make the returned index **smaller**, which makes `pushed > i` **less** likely — it suppresses the guard rather than tripping it.

**Reproduction.** Take the realistic reversed chain that `ordered=false` correctly catches, and put two pushing markers with one-character shas (`sha=6`, `sha=8`) in front of it. `--emit fixer --sha 6` is a legal command and round-trips through the script's own reader:

```
reversed chain, no decoy   -> ordered=false, next=owner      (guard fires)
reversed chain + decoys    -> ordered=true,  next=review     (guard suppressed)
```

Mutant 4 above is the other half of the evidence: no case in the suite fails when `sameSha` matches everything.

**Why this is not blocking, stated as plainly as the finding.** The guard still fires on every chain this repository's tooling can produce — `--facts` writes exactly seven characters and `--emit` is handed forty, and I verified the honest and reversed forms at one through four rounds plus the live markers above. The suppression needs *both* a marker the tooling never writes *and* a comment list already out of order, which no session controls. And the other half of this same repair backstops it: with the decoys in place the chain reaches `next=review`, and the review floor then puts it at `next=owner` on the very next hop. The two repairs cover each other, which is the best thing I can say about this round.

**What should change, when something next touches this file:** the sentence, not the code. The comparison is right; the reason given for it is wrong in one direction and no test holds it. This does not warrant spending your round.

### `KXR-81/PR32` — non-blocking, low. The facts block points a reviewer at a file this round did not touch

The facts block lists four changed paths and names `.claude/skills/raphael/SKILL.md` under *"Governed paths touched, which is where a reviewer looks hardest"*, while its own "deliberately not done" in the same comment says that file is untouched. I confirmed independently: `git diff --name-only 8ba4452..6e7c6b3` returns **three** files and not that one; against `main` it is four, because `8ba4452` changed it.

Both statements are true and the generated block is behaving exactly as designed — it derives branch-against-base, which is right for a pull request. It is recorded because a facts block is what frames a review, and this one sends the reviewer hardest at the one governed file the round it describes did not change. It cost me nothing because I diffed it myself; the next reviewer may not.

### `KXR-82/PR32` — non-blocking, low. "Nine new cases"

The description's evidence section claims nine new cases. The diff adds **eight** `it(` cases and removes none. Nothing downstream depends on it and every other number I checked in that section was right — recorded only because it is a claim about evidence, in a repository that has been burned by those.

## Things I checked that are not findings

- **The declared gap is real, accurately described, and resolves the way it says.** `AUTOMATIC_HANDOFF_CHAIN.md` §4b says that if a repair posts no readable marker *and* the review after it posts none either, nothing counted over markers can see them, and the chain resolves *towards another session* — the unsafe direction. Confirmed: eight silent fix rounds and eight silent reviews give `roundsUsed=0`, `next=fix round=1`, indefinitely. The document does not soften it, and the direction it names is the direction I measured. Declaring this was the right call.
- **The half-silent variants are caught.** Silent fixes with markered reviews → `roundsUsed=8`, `next=owner`. The floor does what it claims.
- **The safe-direction over-counting was left alone, not "fixed".** Two pushes after one review, the same sha posted twice, and a fixer re-pushing the build's sha all still resolve to `review` or `owner`; two reviews of one push gives `roundsUsed=1` and `owner`. **None resolves towards a further fix round.**
- **The honest chain did not regress.** `build, review(BLOCKED), fix, review(BLOCKED)` → `roundsUsed=1`, `roundsAuthorised=1`, `next=owner`. With an owner authorisation of two it correctly offers round 2.
- **"Position cannot be misdeclared" is gone** from `AUTOMATIC_HANDOFF_CHAIN.md` §4a and struck through with an explanation in this description.
- A reviewer marker carrying `verdict=n/a` yields no verdict and stops at the owner. The authorisation ceiling holds at two against `rounds=99`.
- The authorisation marker can be written by anyone who can comment on the pull request. That is pre-existing, is disclosed in the docstring as something a later session can check rather than believe, and is not this round's.

## Whether a further repair round is warranted

**No.** Both blocking findings are closed and proved closed, the honest chain is unchanged, and all 672 tests pass with each new check shown able to fail. The three findings above are non-blocking and should **not** consume a round — `KXR-80/PR32` is a wrong sentence beside correct code, and the right time to fix it is the next time anything touches that file. The repair limit is spent either way; this goes to you.

**What I did not do, and why.** I edited no file, filed no register row, opened nothing, approved nothing, merged nothing and started no session. All mutation was done in a copy outside the repository; the working tree is clean at `6e7c6b3` and `handoff.ts` is byte-identical to the candidate. I did not run the chain against a live pull request end to end — nothing in `scripts/` reaches the network — so the live demonstration above is `pnpm chain` over this pull request's real comment bodies reconstructed around their real markers, which reproduced the conductor's own reading exactly. I did not read the Netlify deploy log, because no session holds that credential; I confirmed the cause from the tree and `OWNER_TODO.md` instead. I took none of the builder's numbers as evidence; where I quote agreement with them, I derived mine first.

<!-- virgil:handoff role=reviewer round=1 sha=6e7c6b329c46c7a848fba3ba70f3a06d215ec208 verdict=PASS_WITH_NON_BLOCKING_FINDINGS next=owner -->

---
_Generated by [Claude Code](https://claude.ai/code)_
