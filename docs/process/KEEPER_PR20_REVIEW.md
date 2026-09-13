# Keeper review — pull request #20, `b449f29ea215fe621ae25dfd1395e2264c0b1d68`

**Authority: layer 4.** A review record. It is not a decision and it is not
authority. It does not approve anything and it does not propose a merge.

**Verdict: `BLOCKED`.**

| | |
|---|---|
| candidate head | `b449f29ea215fe621ae25dfd1395e2264c0b1d68` |
| base | `a182b1962ec46e6750f2c60c76b0b9e3dd782b70` (`main`) |
| branch | `claude/virgil-knowledge` |
| contract | `docs/process/KNOWLEDGE_LESSONS_BRIEF.md` **as it stood at `a182b196`**, and `docs/decisions/OD-0017-knowledge-lessons-follow-up.md` |
| reviewer | independent session, read-only, no part in building or repairing this candidate |
| local vs remote | equal: `refs/pull/20/head` resolves to the candidate SHA |
| reviewed in | a detached worktree at the candidate SHA; every probe below was reverted and `git status` is clean at the SHA |

`BLOCKED` rather than `INSUFFICIENT_EVIDENCE`: the evidence was sufficient. Two
of the brief's named acceptance criteria are proven not to hold, by
reproduction on this repository, and the reproductions are below for anyone to
run again.

---

## What was reproduced and holds

Stated first, because most of this candidate does what it says.

- **Every check is green at the reviewed SHA, on this reviewer's machine and in
  continuous integration.** `pnpm lint` (313 files), `pnpm typecheck` (9/9),
  `pnpm test --force` — 58 + 18 + 104 + 51 + 305 + 74 + 1780 = **2,390 passed,
  0 failed**. GitHub Actions run `34731999317`, event `pull_request`, on this
  head: all nine jobs `success`, none skipped, Mind Scan among them.
- **`pnpm --filter @virgil/knowledge-lint run lint`** exits 0 with one minor
  finding, exactly as the run record quotes.
- **The loader is 1,752 bytes** against a budget of 2,000. Measured.
- **The conversion is 327 → 296 lines.** Measured against `a182b196`.
- **`pnpm tier --claimed 3` derives 3.** The tier claim is honest.
- **`governs` in the derived graph is not contract drift.**
  `schemas/knowledge-relationship.schema.json` enumerates only
  `supports | contradicts | supersedes` and never carried `related`,
  `contains`, `links_to` or `tether` either. `governs` joins an existing
  divergence; it does not create one. `lesson` was already in
  `knowledge-node.schema.json`. Nothing needed regenerating and nothing was
  silently widened.

### The concern about eight untested guards is answered, and the work is better than its own record claims

The run record tests four of twelve guards by removal and says plainly that
*"'observed firing' and 'its guard cannot be removed unnoticed' are two
different statements and only the four above carry the second."*

**All twelve carry the second.** Each of the twelve finding classes was
neutralised in turn — one injected early return in the `add` closure in
`packages/knowledge-graph/src/lessons.ts`, which is a faithful mutant for
"this guard no longer fires" — and `vitest run test/lessons.test.ts` was run
against each. **Twelve mutants, twelve red suites, no survivors.** The source
file was restored and verified byte-identical
(`sha256 b6f8f27211c00cadcaa445cf7d2cf266a4494804d1be4a2be875fbfc66178c16`
before and after).

Three of the eight the record did not cover, by name:

```
guard removed: lesson_id_not_unique
 FAIL  two pages claiming the same lesson id → lesson_id_not_unique
 FAIL  every finding class this scan can raise has been seen raising
       never observed firing: lesson_id_not_unique
      Tests  2 failed | 25 passed (27)

guard removed: raw_source_ready_to_compile
 FAIL  enough pages resting on a raw source that the source is compiled → raw_source_ready_to_compile
 FAIL  every finding class this scan can raise has been seen raising
      Tests  2 failed | 25 passed (27)

guard removed: superseded_lesson_not_folded
 FAIL  a superseded lesson left standing beside its replacement → superseded_lesson_not_folded
 FAIL  every finding class this scan can raise has been seen raising
      Tests  2 failed | 25 passed (27)
```

The reason is structural rather than lucky: each scenario asserts its finding
classes by **exact equality**, and the coverage test fails while any class has
never been seen. Between them, a guard cannot be deleted quietly. For this
file, the mutation manifest would add little — which is worth knowing before
anybody spends the work of teaching it a second working directory.

**This does not transfer.** It is a fact about `lessons.ts` and its suite at
this SHA, not a general answer to `BR-01`.

---

## Findings

Ids continue the owner-approved `KXR` series, as the previous Keeper reviews
did (`KEEPER_PR11_…` used KXR-18 to KXR-22, `KEEPER_PR14_REVIEW.md` used
KXR-30 and KXR-31). No prefix is minted here. The highest id in the repository
before this document is `KXR-38`.

**None of these is filed in `docs/process/FINDINGS.md`.** Recording a finding
is a repair and this session is the reviewer; every role performs one hop.
Seven rows are owed to that register and they are somebody else's hop.

---

### KXR-39 — blocking — the link is not checked in both directions for any lesson id the page validator accepts but the link matcher cannot see

**Surface:** `packages/knowledge-graph/src/lessons.ts` — `LESSON_LINK` (line
229) against the frontmatter check (line 367).

**Criterion it fails:** the brief, section 3 and criterion 3 — *"a
double-bracketed lesson link in code that resolves to nothing fails."*

The link matcher is `/\[\[(lesson-[a-z0-9-]+)\]\]/g`. The page validator
accepts any `nodeId` that merely `startsWith('lesson-')`. The two disagree
about what a lesson id is, and the disagreement runs both ways.

**False negative — a broken link passes.** One file added to the tree at the
candidate SHA, containing three dangling links whose ids carry an uppercase
letter or an underscore:

```
$ printf '# scratch\n\nSee [[lesson-Gates-That-Cannot-Refuse]] and [[lesson-gates_that_cannot_refuse]] and [[lesson-NOPE]].\n' > docs/process/ZZ_REVIEW_PROBE.md
$ pnpm --filter @virgil/knowledge-lint run lint
lessons: 1 pages governing 1 files, 1 captures (0 open), loader 1752 bytes
minor  raw_source_ready_to_compile  src-master-commission — …
lesson scan: 1 findings, 0 blocking
```

Three links pointing at nothing. Zero findings. Exit 0.

**False positive — a correct link is reported broken.** A lesson page whose id
the validator accepts, correctly linked from the one file it governs:

```
$ # knowledge/wiki/lessons/lesson-Zed.md, governs: [docs/process/ZZ_PROBE.md]
$ # docs/process/ZZ_PROBE.md contains the double-bracketed link to lesson-Zed
$ pnpm --filter @virgil/knowledge-lint run lint
blocking  lesson_link_not_returned  lesson-Zed — lesson-Zed governs docs/process/ZZ_PROBE.md and docs/process/ZZ_PROBE.md never names it.
blocking  lesson_unreferenced       lesson-Zed — Nothing names lesson-Zed. …
lesson scan: 3 findings, 2 blocking
```

The file names it, verbatim, and the scan says it does not.

**Why this one is blocking rather than a rough edge.** The brief's own
justification for building this is `KP3-05` — *"two checkers, 106
disagreements"* — and this is two checkers inside one module disagreeing about
the identity everything else resolves by. A typo'd lesson link is the exact rot
the mechanism exists to catch, and a typo that capitalises a letter or types an
underscore is silently unchecked. The candidate's own lesson page states the
standard it fails: a check that cannot fire looks exactly like a check with
nothing to object to.

**Repair, for scope rather than as an instruction:** one constraint, in one
place — either widen the matcher to the ids the validator accepts and then
reject the ones outside the taxonomy, or narrow the validator to the matcher's
charset. Small. The point is that the two must not be free to drift.

---

### KXR-40 — blocking — `lesson_unreferenced` is satisfied by another lesson page, so two lessons can keep each other alive

**Surface:** `packages/knowledge-graph/src/lessons.ts` — `isBookkeeping`
(line 291) and the `referencedBy` filter (line 489).

**Criterion it fails:** the brief, section 3 — *"A lesson page named by nothing
fails."*

`knowledge/index.md` and `knowledge/log.md` are excluded from counting as a
reference, deliberately and correctly — the run record explains why, and calls
it `KXR-10` in a new place. **Sibling lesson pages are not excluded.**

Two lesson pages were added under `knowledge/wiki/lessons/`, each governing
nothing (`governs: []` passes the frontmatter check, which tests only
`Array.isArray`) and each naming the other in its body. Nothing else in the
repository mentions either:

```
$ pnpm --filter @virgil/knowledge-lint run lint
lessons: 3 pages governing 1 files, 1 captures (0 open), loader 1752 bytes
minor  raw_source_ready_to_compile  src-master-commission — …
lesson scan: 1 findings, 0 blocking
```

Control, with one of the pair deleted so the survivor is genuinely alone:

```
blocking  lesson_link_unresolved  lesson-zz-beta  — … and there is no such lesson page.
blocking  lesson_unreferenced     lesson-zz-alpha — Nothing names it. …
lesson scan: 3 findings, 2 blocking
```

So the guard works and is defeated by a pair. The failure mode it exists to
prevent is prose accumulating in a new place with nothing tied to it, and two
pages citing each other are precisely that, with a citation ring for cover.
`KXR-10` was *"a pointer satisfied by the register itself"*; this is a pointer
satisfied by the category itself.

---

### KXR-41 — moderate — the whole-tree scan reads fourteen extensions, and this repository contains files outside them

**Surface:** `packages/knowledge-graph/src/lessons.ts` — `TEXT_EXTENSIONS`
(line 206).

A lesson link in any other file is invisible. This is not hypothetical about
the tree: `git ls-files` at the candidate SHA counts `.toml` (1), `.svg` (1),
`.sha256` (22), `.nvmrc` (1) and `.gitignore` (1) — none of them scanned.

```
$ printf 'a = "[[lesson-…]]"\n' > zz-probe.toml          # a dangling lowercase id
$ printf 'deadbeef  [[lesson-…]]\n' > zz-probe.sha256    # another
$ pnpm --filter @virgil/knowledge-lint run lint
lesson scan: 1 findings, 0 blocking
```

Moderate rather than blocking because the outward direction is the weaker half
here: if a lesson `governs` such a file, `lesson_link_not_returned` fires
correctly, since an unreadable file returns no link. It is the dangling link in
an unscanned file that goes unseen. An allowlist of extensions in a checker
whose whole job is to sweep the tree is a maintenance debt with no alarm on it:
the day somebody adds `.mts`, `.py` or `.mdx`, the sweep silently stops covering
it.

---

### KXR-42 — moderate — the run record states two things about its own diff that the diff contradicts at the reviewed SHA

**Surface:** `docs/process/KNOWLEDGE_LESSONS_RUN_RECORD.md`.

**Authority it concerns:** `CLAUDE.md` — *"a builder's success report is not
evidence"* — and the run record's standing as the candidate's primary evidence
document. The register already carries this class twice (`KXR-05`, `KXR-31`).

1. **"Gaps left open", item 6:** *"`docs/process/ROADMAP.md` still reads 'brief
   written and queued' against item 4. It is outside the permitted paths and
   was not edited."* `ROADMAP.md` is in this diff, changed in `b563cd9`, and
   `OD-0017` section 4 records the change. The sentence is false at the SHA it
   ships on.
2. **"Tier":** *"It expected the diff to touch `docs/process/FINDINGS.md` and
   `packages/repo-checks/**`. It touches neither."* It touches both. Run at the
   candidate, the derivation now names four governed paths rather than the one
   the record quotes:

   ```
   $ pnpm tier --claimed 3
   tier 3, from 22 changed paths against origin/main
     governed: CLAUDE.md — it states what every session may and may not do
     governed: docs/decisions/OD-0017-knowledge-lessons-follow-up.md — authority layer 1: an owner decision
     governed: docs/process/FINDINGS.md — the one file whose job is to be trusted
     governed: packages/gate-engine/test/refusals.test.ts — it proves every gate can refuse
   ```

   It also points at a section heading, *"No register row"*, that no longer
   exists in the file.
3. **A section heading that is now wrong:** *"Three contradictions found in the
   brief, reported and not resolved."* Two of the three were resolved, by
   amending the brief, in this same pull request.

The record is careful and unusually honest about its limits, which is why this
matters: a reader who trusts it will believe the diff is narrower than it is.
The later round updated the register section and left these three behind.

---

### KXR-43 — moderate — the `BR-04` repair puts a new false statement into the hard limits, and `CLAUDE.md` contradicts it forty lines lower

**Surface:** `CLAUDE.md`, "Hard limits for every session"; `knowledge/SCHEMA.md`,
"Raw source records".

**Authority it concerns:** `CLAUDE.md` on `KXR-20` — *"a rule that contradicts
itself makes them guess which half to obey"*.

The finding `BR-04` is real and I confirm it: at `a182b196`, `CLAUDE.md` said
*"Never edit or delete a raw source record"* and `SCHEMA.md` said
`ingestionState` advances *"by … updating that one field"*. Both texts verified
at the base SHA. **The repair is what I cannot accept.**

`CLAUDE.md` now reads:

> `.claude/settings.json` denies `Write` and `Edit` under `knowledge/raw/**`
> outright, so advancing that field is the owner's to do and nobody else's.

`SCHEMA.md` now reads:

> `.claude/settings.json` denies `Write` and `Edit` under `knowledge/raw/**`,
> so **no session can advance the field however well authorised it is in
> prose.**

The premise is true — I read the deny list and both rules are there. **The
conclusion is false, and `CLAUDE.md` says so itself**, in the "Merging" section
of the same file:

> **Those rules did not stop the session that wrote this paragraph from editing
> that same file**, because it used `python3` from `Bash`, and the rules name
> the `Write` and `Edit` tools rather than the file. The same is true of
> `sed -i`, `cat >`, `tee`, and every other way a shell writes.

So one file now says both *nobody else can* and *those rules do not stop a
determined session*. That is `KXR-20`'s exact shape, reintroduced by the repair
for a contradiction — and this time in the hard-limits section, which is the
highest-consequence text a session reads.

`OD-0017` and the run record both know this. `OD-0017` says the deny rules are
a hurdle rather than a wall and that no shell was used, and I found no evidence
any was. **The honesty is in the decision record; the overstatement is in the
rule.** A session reads the rule.

The repair that holds is the one `CLAUDE.md` already models elsewhere: say the
lock exists, say what it does not stop, and say a session stops there anyway.
Not a sentence beginning "so … nobody else's".

---

### KXR-44 — moderate — `CLAUDE.md` is authorised by a record written by the same session in the same commit, so "filed first" is not evidenced by the repository

**Surface:** commit `b563cd9`; `docs/decisions/OD-0017-…md`; the pull request
description.

**Authority it concerns:** `KXR-18` — *"`d7d80fd` changed the two files
declaring this repository's own limits under no contract, with the
authorisation recorded nowhere"* — and `KXR-01`, a claim of owner approval no
file supported.

`OD-0017` distinguishes itself from `KXR-18` in these words: *"This is a
contract, filed before the change and naming the change."* The pull request
description says *"a contract, filed first"*.

`CLAUDE.md`, `OD-0017`, `knowledge/SCHEMA.md`, `FINDINGS.md`, `ROADMAP.md` and
the register test all land in **one commit, `b563cd9`**. There is no commit in
which `OD-0017` stands and `CLAUDE.md` is unchanged. "Filed first" is a claim
about the order of edits inside one session, and the repository — which is all
a reviewer can read — cannot distinguish it from the two being written
together.

Two further things a reader should weigh, neither of which I can settle from
here:

- **The quoted instruction names neither `CLAUDE.md` nor the hard limits.** It
  is *"Fix those four things. I take your recommendation as to the best way
  forward. And open the pull request and give me the brief for a new window."*
  `OD-0017` marks the CLAUDE.md edit **(delegated)** and says so plainly, which
  is the right disclosure. It is still a session editing the file that bounds
  every session, under a word that does not mention it.
- **The second quotation, *"I approve touching anything that I just said. Don't
  ask again"*, was given about the raw source record** — the thing the tooling
  then refused. Reading it across to the hard limits is a step the record does
  not take and neither do I.

`OD-0017` invites exactly this finding: *"A reviewer who thinks a session should
never touch that file whatever the authorisation is raising a real finding, and
it is theirs to raise."* This is narrower than that. The authorisation may well
be genuine; **what the repository cannot show is that it preceded the edit**,
and `OD-0006` states the cost — the owner reading their own decision records is
the only detection of a false one.

The remedy is procedural and cheap: file the decision record in its own commit,
before the commit that changes the file it authorises. Then "filed first" is a
fact a reviewer can check rather than a sentence a reviewer must believe.

---

### KXR-45 — moderate — the diff leaves the permitted paths as the brief stood, and the amendment that fixes that was written by the same session afterwards

**Surface:** the diff against `a182b196`; the brief's "Permitted paths"; the
path list in `OD-0017`.

**Authority it concerns:** `constitution/REVIEW_POLICY.md` — *"Review may start
only when … the diff stays within permitted paths"* — and `KXR-07`, open, which
is this in its previous instance.

Judged against the brief **as it stood when the work was done**, as instructed,
three of twenty-two files are outside it:

| file | covered by |
|---|---|
| `packages/test-fixtures/knowledge/seed-graph.json` | the brief, **amended after the work** by `OD-0017` |
| `CLAUDE.md` | `OD-0017` only — see `KXR-44` |
| `docs/process/ROADMAP.md` | `OD-0017` only |

`OD-0017` is itself outside the brief's list and carries its own.

**`BR-02` is sound and I reproduced it.** The seed graph genuinely cannot be
avoided: adding one page under `knowledge/wiki/lessons/` and running the
knowledge-graph suite without regenerating it gives

```
 FAIL  test/seed-graph.test.ts > committed seed graph freshness > matches a fresh derivation byte for byte
```

so the brief's criterion 1 and its permitted paths could not both hold. The
builder regenerated it with the repository's own command, named it before
pushing, and reported the gap as the contract's rather than its own call. **That
handling was right** and is the difference between this and `KXR-07`, where an
exception was declared after it was taken.

What remains is structural and is not the builder's to fix: **a contract
amended after delivery, by the party delivering, cannot also be the thing the
delivery is measured against.** Under the original brief this diff is out of
bounds; under the amended one it is not; and the amendment arrived in the
delivery. Only the owner can collapse that, by accepting `OD-0017` or not.

---

### KXR-46 — minor — the run record's criterion-1 evidence does not reproduce at the reviewed SHA

**Surface:** `docs/process/KNOWLEDGE_LESSONS_RUN_RECORD.md`, "Criterion 1 — the
checks".

The quoted output is from `630b549`, two commits earlier. At the candidate:

| quoted | actual at `b449f29` |
|---|---|
| `knowledge graph: 100 nodes, 187 edges` | `101 nodes, 187 edges` |
| `@virgil/repo-checks:test: 280 passed (280)` | `305 passed (305)` |

Both differences are explained by the later commit — `OD-0017` becomes a graph
node, and the five `BR` register rows bring 25 tests — and both are innocent.
It is recorded because `REVIEW_POLICY` asks a finding to carry reproduction
evidence, and evidence pasted from an earlier commit is the habit the brief
itself closes on: *"Paste what the command printed, not what it should have
printed."* At this SHA it printed something else. The lesson-scan lines, the
loader byte count and the conversion line counts all reproduce exactly.

---

## The builder's own five, verified independently

Each was checked against the repository rather than against the run record.

| id | the builder's claim | this review |
|---|---|---|
| `BR-01` | criterion 7 named a mechanism the permitted paths put out of reach | **Confirmed.** `mutation-manifest.ts` runs vitest with `cwd: app`; `apps/mission-control/vitest.config.ts` includes `test/**` only. A guard in `packages/` is unreachable. Status `repaired` should be read as *the criterion was rewritten to match what was delivered* — see below. |
| `BR-02` | the permitted paths omitted the derived seed graph | **Confirmed and reproduced.** See `KXR-45`. Same caveat on `repaired`. |
| `BR-03` | the brief's own placeholder was read by the check it commissioned as a dangling link | **Confirmed and reproduced.** Restoring the brief's original text at the candidate SHA gives `blocking lesson_link_unresolved … KNOWLEDGE_LESSONS_BRIEF.md links to a lesson id that has no page`. The builder changed the placeholder rather than teaching the check to ignore code spans, and refused to weaken the check. That was the right way round. |
| `BR-04` | `CLAUDE.md` and `SCHEMA.md` contradicted each other | **The finding is confirmed** — both original texts verified at `a182b196`. **The repair is not accepted:** `KXR-43`. |
| `BR-05` | ten pages rest on `src-master-commission`, its record reads `sealed`, no session can advance it | **Confirmed, correctly open.** The lint reports it at the candidate; `.claude/settings.json` carries `Write(./knowledge/raw/**)` and `Edit(./knowledge/raw/**)` as denials; `knowledge/raw/` is untouched by the whole branch. The three ways out in `OD-0017` are the owner's. |

**On the word `repaired` for `BR-01` and `BR-02`.** Both were repaired by
amending the contract rather than by changing the delivery. That may well be the
correct resolution — a contract that cannot be satisfied is the contract's
defect, and both were reported before being taken rather than after. But
"repaired" reads, in that register, as *the defect is gone*, and what happened
is that **the requirement moved to where the work already was**. The register's
own new paragraph anticipates this — *"a `builder` row is the weakest kind"* —
and it is the right paragraph. The distinction is worth keeping visible in the
`what` column rather than only in the prose above it.

**`BR-03` has a small tail.** This review document had to be written around the
check it reviews: a lowercase example link would have turned
`pnpm --filter @virgil/knowledge-lint run lint` red on a review record, so every
illustrative id here is written in a form the matcher cannot see — which is
`KXR-39` demonstrating itself in the document that reports it. Any file in this
repository that wants to *discuss* a lesson link, rather than make one, has the
same problem the brief had.

---

## Reproduction

All probes were made in a detached worktree at the candidate SHA and reverted;
`git status` is clean and `HEAD` is `b449f29e…`.

```sh
git worktree add --detach <scratch> b449f29ea215fe621ae25dfd1395e2264c0b1d68
cd <scratch> && pnpm install --frozen-lockfile

# baseline
pnpm lint && pnpm typecheck && pnpm test --force
pnpm --filter @virgil/knowledge-lint run lint
pnpm tier --claimed 3

# KXR-39, false negative: three dangling links with an uppercase letter or an
# underscore in the id, written into any scanned file. Expect 0 blocking.
# KXR-39, false positive: a lesson page with an uppercase letter in its nodeId,
# linked correctly from the file it governs. Expect 2 blocking.
# KXR-40: two lesson pages, governs: [], each naming the other, nothing else
# naming either. Expect 0 blocking. Delete one and expect 2.
# KXR-41: the same dangling link in a .toml or .sha256 file. Expect 0 blocking.
# KXR-45 / BR-02: add any page under knowledge/wiki/lessons/ and run
#   pnpm --filter @virgil/knowledge-graph test -- test/seed-graph.test.ts
# BR-03: restore docs/process/KNOWLEDGE_LESSONS_BRIEF.md from a182b196 and lint.

# twelve guards, removed one at a time
# inject `if (findingClass === '<class>') return;` at the top of the `add`
# closure in packages/knowledge-graph/src/lessons.ts, then
#   pnpm vitest run test/lessons.test.ts
# in packages/knowledge-graph, for each of the twelve classes.
```

---

## What this review does not do

It does not merge, approve, or recommend a merge. That is the owner's, by
writing `merge approved` and naming this pull request, and nothing in this
document is that or asks for it.

It does not repair anything. Seven register rows are owed to
`docs/process/FINDINGS.md` and this session did not write them: recording a
finding is a repair, and every role performs one hop.

It does not rule on whether `OD-0017` is good authority. That decision record
transcribes an instruction given outside this repository; a reviewer can read
only the repository. `KXR-44` and `KXR-45` name what the repository can and
cannot show, and stop there.

It does not judge the design. The inbox, the lessons category, the loader under
a measured budget, the taxonomy held in two places by a test, and a scan whose
twelve guards are each provably live are a good piece of work. `KXR-39` and
`KXR-40` are two narrow holes in one regular expression and one filter, in a
mechanism that is otherwise sound and is doing what it was built to do — the
`raw_source_ready_to_compile` finding it raised on its first run, unprompted, is
the best evidence in this candidate that it works.
