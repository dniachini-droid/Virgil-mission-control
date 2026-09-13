# Keeper review of pull request #27, candidate `571b258a`

**Captured verbatim on 2026-09-13** from [comment 5653124168](https://github.com/dniachini-droid/Virgil-mission-control/pull/27#issuecomment-5653124168) on pull request
#27. It judged candidate `571b258a26117549e00a2293ec84c04e7370b4d7`.

**Nothing below the rule is edited.** Figures that have since gone stale and
statements this repository has since corrected stand exactly as they were
written: a review is a record of what someone found at a moment, and a record
edited afterwards is not a record.

**One substitution, declared here and applied 13 times below, and it is the
only departure from the comment's bytes.** Where the review wrote a
doubled-square-bracket lesson link, this capture writes `⟦id⟧` instead. Nothing
else is altered — not a character, not a count, not an exit code. The rule is
mechanical and reverses exactly: replace every `⟦` with `[[` and every `⟧` with
`]]` and you have the comment as posted.

**The reason is a finding this very document raises.** ``KXR-49/PR27`, below` records that the
link scan cannot tell a discussed lesson link from a made one, so a review
quoting dangling links verbatim becomes that many blocking findings against the
review. `docs/process/KNOWLEDGE_LESSONS_RUN_RECORD.md` made the same
substitution for the same reason and declared it the same way. The alternative
was to teach the scan to skip quoted syntax, which is a repair, and filing is
not repairing.

---

**`PASS_WITH_NON_BLOCKING_FINDINGS`** — `571b258a26117549e00a2293ec84c04e7370b4d7`

Independent review, read-only. I had no part in building or repairing this candidate and will have no part in repairing it. This is the fresh re-review of repair round one. It is not a decision, it approves nothing, and **it does not propose a merge** — that is the owner's, by writing `merge approved` and naming this pull request.

| | |
|---|---|
| candidate head | `571b258a26117549e00a2293ec84c04e7370b4d7` |
| base | `4e39b822cc9aa0cb98025b1203c3857a269e1710` (`main`) |
| branch | `claude/pr-20-repair-round-one-on-main` |
| local vs remote | **equal** — `git ls-remote origin claude/pr-20-repair-round-one-on-main` → `571b258a…` |
| contract | `docs/process/KNOWLEDGE_LESSONS_BRIEF.md` and `docs/decisions/OD-0017-knowledge-lessons-follow-up.md` |
| size | 21 files, +2922 / −58 |
| reviewed in | a detached worktree at the candidate SHA, in scratch space outside the repository. Every probe reverted; `packages/knowledge-graph/src/lessons.ts` verified byte-identical before and after (`sha256 53abda183b3c3ab407211425fdc1021691ea7eca338bdbf8321c9d6d0ebd8865`); worktree removed; `git status` clean at the SHA |

`PASS_WITH_NON_BLOCKING_FINDINGS` rather than `PASS`: four findings stand, none of which stops the work doing what its contract says. `PASS_WITH_NON_BLOCKING_FINDINGS` is not "safe to merge" — that is the owner's call and this document only informs it.

---

## What this does, and whether it does it

**In plain terms.** The repository can now write down a lesson it has learned, keep it in one place, and — the part that matters — **it refuses to let the lesson and the code drift apart.** If code points at a lesson that does not exist, or a lesson claims a file that never mentions it back, or a lesson nothing uses at all, a check fails and names which. An earlier review found two holes in that refusal. **Both are genuinely closed, and I closed them by hand myself to check rather than taking anyone's word.**

Two sentences a non-programmer can act on: **the mechanism works and the two faults are fixed.** The four things I raise below are about documents describing the work being out of date, and about a gap that arrived from `main` rather than from here — none of them is a reason to hold the work.

---

## What I ran, and what it printed

With the cache off, in the worktree at the candidate SHA. **The real numbers are much smaller than the ones in the pull request description and the run record**, because the application was deleted from `main` by #21 and #22 — see `KXR-47/PR27`.

```
$ pnpm lint
> biome check .
Checked 88 files in 62ms. No fixes applied.

$ pnpm typecheck
 Tasks:    7 successful, 7 total
Cached:    0 cached, 7 total
  Time:    8.343s

$ pnpm test --force
@virgil/repo-checks:test        Tests  285 passed (285)
@virgil/gate-engine:test        Tests   58 passed (58)
@virgil/domain:test             Tests  104 passed (104)
@virgil/knowledge-graph:test    Tests   61 passed (61)
@virgil/agent-contracts:test    Tests   74 passed (74)
 Tasks:    5 successful, 5 total
```

**582 passed, 0 failed.** Not 2,400 — that figure counts `mission-control` (1,780) and `visual-language` (18), neither of which exists at this base.

```
$ pnpm --filter @virgil/knowledge-lint run lint
knowledge graph: 83 nodes, 147 edges, 9 pages, 26 claims, 88 tethers (88 intact)
graph hash sha256:8d3a270a6c33687d0b22f4a67f2eb698635c59a58eed26963aef3833dd8173db
mind scan: no findings
lessons: 1 pages governing 1 files, 1 captures (0 open), loader 1752 bytes
minor         raw_source_ready_to_compile                src-master-commission — 8 wiki pages rest on src-master-commission and its record still reads ingestionState: sealed.
lesson scan: 1 findings, 0 blocking
exit: 0
```

```
$ pnpm tier --claimed 3
tier 3, from 21 changed paths against origin/main
  governed: docs/decisions/OD-0017-knowledge-lessons-follow-up.md — authority layer 1: an owner decision
  governed: docs/process/FINDINGS.md — the one file whose job is to be trusted
  governed: packages/gate-engine/test/refusals.test.ts — it proves every gate can refuse
  governed: packages/repo-checks/test/findings-register.test.ts — these are the checks the repository runs on itself
tier: a claim of 3 is acceptable against a derivation of 3
```

The tier claim is honest. In CI on this head, `lint, typecheck, tests` is **`success`** (runs `34753994432` and `34753996355`). The three red Netlify checks are the known `netlify.toml` deletion, already the owner's in `OWNER_TODO.md`, and are not this pull request's.

**The brief's other named criteria, each broken on purpose and watched refusing.** Every one fires by name:

| criterion | what I did | what it printed |
|---|---|---|
| 3, inward | dangling link in a scanned file | `blocking lesson_link_unresolved` |
| 3, outward | removed the link from the governed file | `blocking lesson_link_not_returned — lesson-gates-that-cannot-refuse governs packages/gate-engine/test/refusals.test.ts and packages/gate-engine/test/refusals.test.ts never names ⟦lesson-gates-that-cannot-refuse⟧.` |
| 3, unreferenced | lesson nothing names | `blocking lesson_unreferenced` |
| 4 | deleted the lesson the code depends on | `5 blocking` — four `lesson_link_unresolved` naming each file that pointed at it, plus `capture_malformed` |
| 5 | added 400 bytes to the loader | `blocking loader_over_budget — knowledge/LOADER.md is 2152 bytes against a budget of 2000: 152 over.` |
| 6 | line counts | `327` at `a182b196` → `296` at this head, and the lesson page carries what the comment carried. Loader measured at **1752** bytes against 2000 |

---

## Blocking finding 1 — the link matcher and the page validator disagreed about what a lesson id is

`KXR-39/PR20`. **Repaired.** Verified by reproduction, both directions.

The repair is what it claims: one declared charset with the scan's charset spliced from it, in `packages/knowledge-graph/src/lessons.ts`:

```ts
const LESSON_ID_CHARS = 'a-z0-9';
const LESSON_LINK_EXTRA_CHARS = 'A-Z_';
export const LESSON_ID = new RegExp(`^lesson-[${LESSON_ID_CHARS}-]+$`);
const LESSON_LINK = new RegExp(
  `\\[\\[(lesson-[${LESSON_ID_CHARS}${LESSON_LINK_EXTRA_CHARS}-]+)\\]\\]`,
  'g',
);
```

**The false negative, put back with the original reviewer's own probe.** Previously: three links pointing at nothing, zero findings, exit 0.

```
$ printf '# scratch\n\nSee ⟦lesson-Gates-That-Cannot-Refuse⟧ and ⟦lesson-gates_that_cannot_refuse⟧ and ⟦lesson-NOPE⟧.\n' > docs/process/ZZ_REVIEW_PROBE.md
$ pnpm --filter @virgil/knowledge-lint run lint
blocking      lesson_link_unresolved     lesson-gates_that_cannot_refuse — docs/process/ZZ_REVIEW_PROBE.md links to ⟦lesson-gates_that_cannot_refuse⟧ and there is no such lesson page.
blocking      lesson_link_unresolved     lesson-Gates-That-Cannot-Refuse — docs/process/ZZ_REVIEW_PROBE.md links to ⟦lesson-Gates-That-Cannot-Refuse⟧ and there is no such lesson page.
blocking      lesson_link_unresolved     lesson-NOPE — docs/process/ZZ_REVIEW_PROBE.md links to ⟦lesson-NOPE⟧ and there is no such lesson page.
lesson scan: 4 findings, 3 blocking
exit code: 1
```

Three links, three findings, exit 1. **The hole is closed.**

**The false positive, put back.** A lesson page whose id carries a capital letter, correctly linked from the one file it governs. Previously the validator accepted the page and the scan then reported the link broken *from the file that named it correctly*. Now the page is refused at source and the message takes its pattern text from the constraint itself:

```
blocking  lesson_frontmatter_incomplete  lesson-Zed — knowledge/wiki/lessons/lesson-Zed.md is missing a nodeId matching ^lesson-[a-z0-9-]+$ — lowercase letters, digits and hyphens, and nothing else, because that is what a link to it can be written with.
blocking  lesson_link_unresolved         lesson-Zed — docs/process/ZZ_PROBE.md links to ⟦lesson-Zed⟧ and there is no such lesson page.
```

The false `lesson_link_not_returned` is **gone**. The two checkers now resolve by one constraint, and there is nowhere else that decides it.

---

## Blocking finding 2 — `lesson_unreferenced` was satisfied by a sibling lesson page

`KXR-40/PR20`. **Repaired.** Verified by reproduction.

`isBookkeeping` is now `cannotEvidenceUse` and excludes the lessons directory:

```ts
function cannotEvidenceUse(path: string, knowledgeDir: string): boolean {
  return (
    path === `${knowledgeDir}/index.md` ||
    path === `${knowledgeDir}/log.md` ||
    path.startsWith(`${knowledgeDir}/wiki/lessons/`)
  );
}
```

**The defect put back:** two lesson pages, `governs: []`, each naming the other, nothing else in the repository naming either. Previously zero blocking — they kept each other alive for ever.

```
blocking  lesson_unreferenced  lesson-zz-alpha — Nothing names ⟦lesson-zz-alpha⟧. The index and the journal do not count: they name every page by construction. Neither does another lesson page: two lessons naming each other govern nothing and keep each other alive.
blocking  lesson_unreferenced  lesson-zz-beta — Nothing names ⟦lesson-zz-beta⟧. …
lesson scan: 3 findings, 2 blocking
```

**Control — delete one, and the survivor is still caught, alone, for the original reason:**

```
blocking  lesson_link_unresolved  lesson-zz-beta — knowledge/wiki/lessons/lesson-zz-alpha.md links to ⟦lesson-zz-beta⟧ and there is no such lesson page.
blocking  lesson_unreferenced     lesson-zz-alpha — Nothing names ⟦lesson-zz-alpha⟧. …
```

A lesson may still link to a lesson, and an unresolved one still fails. What a sibling can no longer do is be the only thing keeping a lesson alive. **The guard is not weakened in either direction: twelve finding classes before, twelve after, and the suite's own coverage test — "every finding class this scan can raise has been seen raising" — passes.**

### The mutants, and whether they carry the seven weak-red tests

They do not carry all seven, and the precise answer matters. I ran the builder's three mutants and one of my own.

| mutant | tests killed |
|---|---|
| **A** — scan narrowed back to the id charset (`LESSON_LINK_EXTRA_CHARS = ''`) | **4 failed, 33 passed** — the new scenario, plus the three `refuses lesson-One / lesson-one_two / lesson-NOPE` |
| **B** — page validator back to `nodeId.startsWith('lesson-')` | **4 failed, 33 passed** — the new scenario, plus the same three `refuses` |
| **C** — sibling lesson pages counting as a reference again | **1 failed, 36 passed** — `two lessons that govern nothing and cite only each other` |
| **D** (mine, not the builder's) — id charset over-narrowed, digits dropped | **2 failed, 35 passed** — `accepts lesson-x9`, `accepts lesson-9` |

**Three mutants, three dead, no survivors** — the builder's claim is accurate, and none of the deaths was a `TypeError`: each failed on the defect. But **the three mutants carry six of the ten new tests, not all ten.** The four `accepts …` tests are killed by none of them. I confirmed the weak red is real — `LESSON_ID` does not exist at `b449f29` (`grep -c LESSON_ID` → `0`), so those seven could only have thrown.

**My mutant D shows the `accepts` group is not vacuous**: two of the four fail on a genuine over-narrowing defect. The remaining two, `accepts lesson-a` and `accepts lesson-one-two-three`, are proven able to fail by nothing I or the builder ran. They are positive controls with a real failure mode, so this is **not** a check that cannot fail, and I raise it as an observation rather than a finding. Mutation coverage of the ten new tests: **six by the builder, eight after mine.**

---

## The replay — nothing gained, and one thing dropped on purpose

I compared the change each branch makes **against its own base**, since a raw diff against `e078b9f` is dominated by `main`'s deletion of the application.

- **Changed-file sets are identical but for one file.** 21 files here; 22 on the previous head. **Nothing was gained.**
- **`packages/knowledge-graph/src/lessons.ts` is byte-identical across the replay**, as are `lessons.test.ts`, `ontology.ts`, `derive.ts`, `index.ts`, `cli.ts`, `refusals.test.ts`, the lesson page, the capture, `LOADER.md`, `OD-0017`, the brief, `ROADMAP.md` and `log.md`. **The repair itself survived the replay untouched** — 15 of the 21 files carried over verbatim.
- **The one file dropped is `CLAUDE.md`**, and it is declared in the run record as the owner's choice: `main`'s version stands and this branch adds nothing to it. **That is a net improvement to this candidate's position** — it retires `KXR-43/PR20` by never reintroducing the sentence, and it removes from the diff the single most contested path in `KXR-44/PR20` and `KXR-45/PR20` ("filed first" and out-of-bounds). `CLAUDE.md` at this head is byte-identical to `main`.
- **The six remaining differences are each explained by `main`, and I checked every one.** `FINDINGS.md` and `findings-register.test.ts` carry `main`'s own `KXR-43` row and its `KXR-38` repointing alongside this side's `BR-01`…`BR-05`; `index.md` loses the two wiki pages `main` deleted; `seed-graph.json` was regenerated, not hand-merged, and I proved it fresh — `pnpm --filter @virgil/knowledge-graph export-seed-graph` → `25 nodes, 41 edges` with **no diff** against the committed artifact, and `seed-graph.test.ts` green; `SCHEMA.md` is the one consequential edit, declared; the run record gains the repair sections.
- **`BR-01`'s register row was re-pinned** because its affected surface named files `main` deleted. The row now points at the manifest as it stood at `a182b196`. The finding is unchanged, the reason is written in a comment in the test beside the new hash, and nothing was renumbered or dropped. Correct handling.
- **All 21 changed files fall inside the permitted paths** of the amended brief plus `OD-0017`, with `refusals.test.ts` the conversion exception the brief requires be named in advance, and which the run record names.

One cosmetic leftover, **not raised as a finding**: `knowledge/index.md` now has a `## Visual` heading with nothing under it, the two pages having gone with the application.

---

## Findings

Four, all non-blocking. **None is filed in `docs/process/FINDINGS.md` — recording a finding is a repair and I am the reviewer; every role performs one hop.** Four rows are owed to that register and they are somebody else's hop.

**On identities.** I did not mint a bare `KXR-NN`. The earlier review's `KXR-39`…`KXR-46` collide five ways — `KXR-39` and `KXR-40` with `packages/gate-engine/test/tiers.ts`/`tiers.test.ts`, and `KXR-43` with the owner's own row now filed on `main` — and the owner's resolution of 2026-09-13 (`KXR-39/PR20` … `KXR-46/PR20`) is still unapplied. I searched every ref on the remote: **`KXR-47` and above are free**, and `KXR-98`/`KXR-99` are deliberate test sentinels. I therefore **propose** `KXR-47/PR27` … `KXR-50/PR27`, document-qualified on the owner's own precedent so that a collision is harmless. They are proposals, not assignments.

### `KXR-47/PR27` — moderate — the run record's check evidence quotes a tree that does not exist at this SHA, in the section that asserts it was freshly run

**Surface:** `docs/process/KNOWLEDGE_LESSONS_RUN_RECORD.md`, "Every check, and what it printed".

**Criterion/authority it fails:** the brief's closing instruction — *"Paste what the command printed, not what it should have printed"* — and `CLAUDE.md`, a builder's success report is not evidence. This is the third instance of the class in this lineage (`KXR-42/PR20`, `KXR-46/PR20`).

The section opens: *"Run on the repaired tree, in this session, on this machine. **None of the figures below is copied from an earlier commit** — the previous round of this work was found doing exactly that (`KXR-46` of the review)."* It then quotes figures that **cannot** have come from this tree:

| the record says | actual at `571b258a` |
|---|---|
| `Checked 313 files` | `Checked 88 files` |
| `Tasks: 9 successful, 9 total` | `7 successful, 7 total` |
| `@virgil/visual-language: 18 passed` | **package does not exist at this base** |
| `mission-control: 1780 passed` | **package does not exist at this base** |
| `@virgil/repo-checks: 305 passed` | `285 passed` |
| **`2,400 tests passed`** | **`582 passed`** |
| `101 nodes, 187 edges, 11 pages` | `83 nodes, 147 edges, 9 pages` |
| `graph hash sha256:d0fe439d…` | `sha256:8d3a270a…` |
| `10 wiki pages rest on src-master-commission` | `8 wiki pages` |

**Reproduce:** check out `571b258a`, run the four commands in that code block, and compare.

**Why moderate and not blocking.** The figures are stale, not false about the outcome: I ran all four commands myself and every check passes, so the criterion the section exists to evidence **does hold**. And the record's *repair* evidence reproduces exactly — the blocking lines in both probe sections matched my runs character for character. What is wrong is the ambient counts throughout, carried over from the pre-replay base, under a sentence explicitly denying exactly that. A reader who trusts the record will believe a far larger suite is guarding this than is.

### `KXR-48/PR27` — moderate — `tools/knowledge-lint` is run by no check on any event, while `CLAUDE.md` tells every session to run it

**Surface:** `.github/workflows/checks.yml`; `tools/knowledge-lint/src/cli.ts`.

**Not this candidate's defect** — it arrived on `main` with #22, which deleted the job carrying the Mind Scan step. The run record names it at its real width and invites the next reviewer to give it an id if it deserves one. **It does**, so here it is; it is the owner's to schedule, not this candidate's to repair.

`checks.yml` at this head declares **one** job, `lint, typecheck, tests`, whose steps are `pnpm lint`, `pnpm typecheck`, `pnpm test`. `pnpm --filter @virgil/knowledge-lint run lint` appears nowhere.

**What is and is not covered, measured rather than assumed.** The *substance* of both scans is still asserted against the real repository by tests `pnpm test` runs — `lint.test.ts` ("the real knowledge tree has no blocking findings") and `lessons.test.ts` ("has no blocking lesson findings"), which is what proves both of this round's repairs. **What is covered by nothing is the command itself**: its argument handling, its output and its exit code. That command is the one `CLAUDE.md`'s "Commands" section tells every session to run, and if it broke tomorrow no check would notice.

**Reproduce:** `git show 571b258a:.github/workflows/checks.yml | grep -c knowledge-lint` → `0`.

### `KXR-49/PR27` — minor — the scan cannot tell a discussed lesson link from a made one, so any file explaining the mechanism must hide its own example

**Surface:** `packages/knowledge-graph/src/lessons.ts`, `LESSON_LINK`.

This is `BR-03`'s tail. The original reviewer named it and did not file it; the run record declines to file it and asks the next reviewer to. Filing it as minor.

The boundary is **deliberate, documented in the source, and I accept the reasoning**: a scan that read prose would turn eight legitimate occurrences into blocking findings and teach the next writer to stop explaining the mechanism. The cost is nonetheless real and recurring — the run record must write its probe output with `⟦⟧` substitutions, and the earlier review document had to obfuscate every illustrative id. **A repository whose own explanatory prose cannot quote its own syntax will keep paying this.** Skipping fenced code blocks is the obvious repair and is not this round's.

**Reproduce:** put a lowercase `⟦lesson-does-not-exist⟧` inside a fenced code block in any scanned file and lint: one blocking `lesson_link_unresolved`.

### `KXR-50/PR27` — minor — two register rows describe a tree that has moved under them

**Surface:** `docs/process/FINDINGS.md`, the `BR-04` and `BR-05` attribute rows.

1. **`BR-04` reads `repaired`, and the reproduction its own row gives still reproduces.** The row says: *"Read `CLAUDE.md`'s 'never edit or delete a raw source record' against `SCHEMA.md`'s '`ingestionState` advances by … updating that one field'."* Both texts are present verbatim at this head — `CLAUDE.md:26` and `SCHEMA.md`. **I judge the finding's substance genuinely repaired** by the `SCHEMA.md` half alone: under a heading reading "Hard limits for every session", *never edit* binds sessions, and `SCHEMA.md` now adds *"that exception is the owner's alone"*, so a session reading both learns the true state rather than guessing. What is stale is the row's stated reproduction, and `SCHEMA.md`'s sentence that `CLAUDE.md` "and this file … now agree" points at a reconciliation that no longer exists in `CLAUDE.md` (`grep -c ingestionState CLAUDE.md` → `0`).
2. **`BR-05` says "Ten wiki pages rest on `src-master-commission`."** The scan at this head says **eight** — two of the ten went with the application.

Neither misleads about anything a reader would act on, which is why both are minor and are one finding rather than two.

---

## What I could not run, and what I did not do

**Could not run.** The three Netlify checks — no session has a credential for that site, and the failure is the owner's, already in `OWNER_TODO.md`. CI itself: I read its result on this head rather than triggering it. The mutation manifest: it went with the application, so guards in `packages/` are proved by hand, which the amended criterion 7 permits and calls weaker than a manifest entry — correctly, and my mutants ran once, today.

**Could not settle.** The owner instructions quoted in `OD-0017` and in the run record — *"I take your recommendation as to the best way forward"*, *"I approve touching anything that I just said"*, and *"I rebuild it, drop the bad sentence"* — were given outside this repository. A reviewer can read only the repository. I did not verify them and I do not rule on whether `OD-0017` is good authority; `KXR-44/PR20` and `KXR-45/PR20` named what the repository can and cannot show, and the `CLAUDE.md` drop has since removed the sharpest edge of both.

**Did not do.** I edited no file in this repository, committed nothing, pushed nothing. I filed no row in the findings register. I did not merge, approve, or open a pull request, and I started no other session — no fix session, no second reviewer, no follow-up. My probes ran in a detached worktree in scratch space, every one was reverted, `lessons.ts` is byte-identical (`sha256 53abda18…`), the worktree is removed and `git status` is clean at `571b258a`.

---

**No further repair round is warranted: both blocking findings are repaired and proven by reproduction, all seven of the brief's criteria hold, and nothing in the four findings above needs code changed.** If the owner wants one thing corrected before this goes anywhere, it is `KXR-47/PR27` — the run record's "Every check, and what it printed" section should quote this tree's real figures (88 files, 7 typecheck tasks, **582 tests**) instead of the deleted application's, or drop the sentence claiming they were freshly run; that is a documentation edit, not a repair cycle, and `constitution/REPAIR_LIMITS.md` reserves the second cycle for him.

---
_Generated by [Claude Code](https://claude.ai/code)_
