# Knowledge lessons — run record

**Authority: layer 4.** This is a record of what one session did and what it
found. It is not a decision, it is not a review, and nothing in it is authority.
It answers `docs/process/KNOWLEDGE_LESSONS_BRIEF.md`, which the owner settled on
2026-09-13.

**Built by one session on branch `claude/virgil-knowledge`. Not reviewed.** A
builder's success report is not evidence — `CLAUDE.md` — so everything below is
either a command and its output, which a reader can run again, or a statement
about what was *not* done. No independent review has looked at this candidate.

## Tier

Run before anything was built, as the brief asks:

```
$ pnpm tier
tier 2, from 0 changed paths against origin/main
```

**That answer is an artefact of the question's timing and not the tier of this
work.** The derivation reads `git diff origin/main...HEAD`, and an uncommitted
tree is invisible to it — an empty diff derives 2 by design, because "no files
changed" must not buy a merge with no review. Run again on the commit:

```
$ pnpm tier --claimed 3
tier 3, from 17 changed paths against origin/main
  governed: packages/gate-engine/test/refusals.test.ts — it proves every gate can refuse
tier: a claim of 3 is acceptable against a derivation of 3
```

**Tier 3, and it gets the full treatment**: the brief was committed first, this
run record exists, the guards were watched failing before they passed, and the
review is somebody else's.

**The brief predicted tier 3 for a different reason and the difference is worth
stating.** It expected the diff to touch `docs/process/FINDINGS.md` and
`packages/repo-checks/**`. It touches neither (see "No register row", below).
The tier is the same and the path that raises it is not the path the brief named.
The tier is derived and not declared, so this paragraph changes nothing; it is
here so a reader who checks does not think something was hidden.

## Permitted paths, and the two files outside them

The brief permits thirteen paths and **one** file outside the list, to be named
before it is edited rather than declared afterwards — *"declaring an exception
after taking it is `KXR-07`, which is open."*

**Exception 1, the one the brief permits: `packages/gate-engine/test/refusals.test.ts`.**
The conversion proof. It is the file the brief's own problem statement names.

**Exception 2, which the brief does not permit, taken anyway and named here:
`packages/test-fixtures/knowledge/seed-graph.json`.** It is a derived artifact —
`packages/knowledge-graph/scripts/export-seed-graph.ts` writes it and
`test/seed-graph.test.ts` fails while it is stale. Adding pages under
`knowledge/wiki/lessons/` changes the graph they are derived from, so the brief's
criterion 1 (`pnpm check` passes) and the brief's permitted paths cannot both
hold. It was regenerated with the repository's own command and not hand-edited:

```
$ pnpm --filter @virgil/knowledge-graph export-seed-graph
seed graph: 29 nodes, 60 edges → packages/test-fixtures/knowledge/seed-graph.json
```

The alternative was to freeze or weaken `seed-graph.test.ts`, which `CLAUDE.md`
forbids outright. **This is a gap in the brief rather than a judgement call the
builder was entitled to make**, and it is reported rather than resolved: a
permitted-paths list that omits a file the work cannot avoid is the contract
being wrong, and only the owner fixes that.

## Three contradictions found in the brief, reported and not resolved

`CLAUDE.md`: *"A session that finds a contradiction reports it; it does not
resolve it silently."*

**1. Criterion 7 cannot be met inside the permitted paths.** It requires *"every
new guard goes into the mutation manifest as it is written."* The manifest is
`apps/mission-control/e2e/mutation-manifest.ts`, which is outside the permitted
paths, is itself a tier-3 governed path, and runs `vitest` with `cwd` set to the
application — whose config includes `test/**` only. A guard in
`packages/knowledge-graph` cannot be named in it without both editing it and
teaching it a second working directory. **Nothing was added to the manifest.**
What was done instead is the equivalent by hand, recorded below under "Every
guard, removed, and the named test that failed" — four guards removed one at a
time, the failing test named each time. That is the same ritual the manifest
automates and it is not the same thing as the manifest doing it every run.

**2. The permitted paths omit the derived seed graph.** Above.

**3. The brief's own placeholder became a dangling link.** The brief writes the
mechanism as a double-bracketed `lesson-id` in three places. Once the check
exists, that string *is* a link to a lesson named `lesson-id`, there is no such
page, and the brief made the check fail. Two ways out: weaken the check so a
link inside a code span does not count, or change the placeholder. The first was
refused,
because a source comment wrapping a link in backticks is the ordinary case here
and excluding code spans would blind the check to it — and because weakening a
check to make a file pass is what `CLAUDE.md` forbids. So the placeholder was
changed to `` `[[lesson-…]]` ``, three occurrences, in prose only. **No
requirement, answer or decision in the brief was touched.** It is recorded here
because editing the document that authorises the work is exactly the move a
reviewer should be suspicious of.

## What was built

| | what | where |
|---|---|---|
| 1 | The way in: captures written mid-build, and the shape they take | `knowledge/inbox/README.md` |
| 2 | The place they go: a lessons category with scope, tags and the files each lesson governs | `knowledge/wiki/lessons/`, `knowledge/SCHEMA.md` |
| 3 | The link, checked in both directions, plus the budgets and the taxonomy | `packages/knowledge-graph/src/lessons.ts` |
| 4 | The loader, held to 2,000 bytes | `knowledge/LOADER.md` |
| 5 | One command, one exit code, both scans | `tools/knowledge-lint/src/cli.ts` |
| 6 | The pages-and-code direction in the derived graph | `packages/knowledge-graph/src/derive.ts`, `ontology.ts` |
| 7 | Twenty-seven tests, every finding class observed firing | `packages/knowledge-graph/test/lessons.test.ts` |
| 8 | One capture in, one lesson out, one file converted | `knowledge/inbox/cap-2026-09-13-…`, `knowledge/wiki/lessons/lesson-gates-that-cannot-refuse.md`, `packages/gate-engine/test/refusals.test.ts` |

**What was deliberately not built**, matching the brief's own list: the second
wiki and the promotion machinery (`scope` is recorded, nothing moves), the
background worker, the CLI, the scheduler, the dispatcher. No code or text was
taken from either repository read on 2026-09-12; the design credit to
`toolboxmd/karpathy-wiki` (MIT) is one line in `knowledge/SCHEMA.md`, which is
the owner's fourth answer.

## Criterion 1 — the checks

```
$ pnpm lint
Checked 313 files in 241ms. No fixes applied.

$ pnpm typecheck
Tasks:    9 successful, 9 total

$ pnpm test --force
@virgil/gate-engine:test:        Tests  58 passed (58)
@virgil/visual-language:test:    Tests  18 passed (18)
@virgil/domain:test:             Tests  104 passed (104)
@virgil/knowledge-graph:test:    Tests  51 passed (51)
@virgil/repo-checks:test:        Tests  280 passed (280)
@virgil/agent-contracts:test:    Tests  74 passed (74)
mission-control:test:            Tests  1780 passed (1780)
Tasks:    7 successful, 7 total

$ pnpm --filter @virgil/knowledge-lint run lint
knowledge graph: 100 nodes, 187 edges, 11 pages, 32 claims, 107 tethers (107 intact)
mind scan: no findings
lessons: 1 pages governing 1 files, 1 captures (0 open), loader 1752 bytes
minor         raw_source_ready_to_compile   src-master-commission — 10 wiki pages rest on src-master-commission and its record still reads ingestionState: sealed.
lesson scan: 1 findings, 0 blocking
```

**Mind Scan reports nothing and the lesson scan reports nothing blocking.** The
one minor finding is real, is not repaired, and is discussed under "What the
first run found and nobody fixed", below.

### In continuous integration, on the pushed commit

Actions run **34727473621**, head `630b549`, event `push`, conclusion
**success**:

| job | conclusion |
|---|---|
| lint, typecheck, tests | success |
| the inspector stands without the application | success |
| hosted build, read and refused | success |
| Mind Scan, V10 owner build and verify, committed digests | **skipped** |
| V11 owner build and verify | **skipped** |
| newest Owner Build rebuilds byte for byte | **skipped** |

**Three jobs are skipped and a reader should know why rather than count six
green ticks.** All three carry `if: github.event_name != 'push'` in
`.github/workflows/checks.yml`: they run on a pull request and not on a branch
push. **The skipped one that matters here is Mind Scan**, which is the
continuous-integration half of criterion 1 — so on this commit `pnpm --filter
@virgil/knowledge-lint run lint` has been run by this session and **not** by
continuous integration. Opening a pull request runs it. That is the owner's call
and no pull request was opened.

The green `the inspector stands without the application` job is worth naming:
it deletes `apps/mission-control` and runs what is left. The new checks are in
`packages/knowledge-graph`, and they still stand without the application.

### Locally, on the committed tree

`pnpm check` was run end to end on a clean tree at `630b549` — the commit above,
before this section was written into it — and exited **0**. That run includes
what continuous integration skipped on a push:

```
$ pnpm check
mission-control:verify:owner:      PASS — opens from file://, no console errors, no off-document requests
mission-control:verify:owner:v11:  PASS — opens from file://, no console errors, no off-document requests, no horizontal overflow
mission-control:verify:web:        PASS — the page reads /api/state, names what it read, and when it reads
                                   nothing it says so and draws no recorded value. Every control took a real click.
pnpm check exit: 0
```

**This is one machine's result and it is a builder's machine.** It is recorded
because the alternative is saying nothing about the three jobs CI skipped, not
because a local run substitutes for CI. Nothing in this diff touches the
application, its builds or its browser verification.

## Criterion 2 — a capture goes in and a lesson comes out

One capture, `knowledge/inbox/cap-2026-09-13-gates-that-cannot-refuse.capture.md`,
written from something noticed while reading `refusals.test.ts` for the
conversion. It became `knowledge/wiki/lessons/lesson-gates-that-cannot-refuse.md`
— `scope: general`, tagged `verification`, governing one file, resting on four
sources, carrying four claims each citing at least two of them.

`knowledge/index.md` gained a Lessons section and an Inbox section.
`knowledge/log.md` gained six lines, beginning with `knowledge_gap_detected`
for the capture — **not** `raw_source_added`, which would have said a capture is
a raw source and it is not. `knowledge/raw/` was not touched.

To reproduce: read the two files, then

```sh
pnpm --filter @virgil/knowledge-lint run lint   # the lesson and the capture, both seen, no blocking findings
```

## Criteria 3 and 4 — break each direction and watch it fail, by name

Each was done to the **real repository**, not to a fixture, and put back
afterwards. The command each time is
`pnpm --filter @virgil/knowledge-lint run lint`.

**Delete the lesson the code depends on** (criterion 4). Move the page out of
the tree:

```
blocking  capture_malformed        cap-2026-09-13-gates-that-cannot-refuse — … says it was ingested into lesson-gates-that-cannot-refuse, and there is no such lesson page.
blocking  lesson_link_unresolved   lesson-gates-that-cannot-refuse — knowledge/index.md links to [[lesson-gates-that-cannot-refuse]] and there is no such lesson page.
blocking  lesson_link_unresolved   lesson-gates-that-cannot-refuse — packages/gate-engine/test/refusals.test.ts links to [[lesson-gates-that-cannot-refuse]] and there is no such lesson page.
blocking  lesson_link_unresolved   lesson-gates-that-cannot-refuse — packages/knowledge-graph/src/lessons.ts links to [[lesson-gates-that-cannot-refuse]] and there is no such lesson page.
lesson scan: 5 findings, 4 blocking
exit: 1
```

Three files named, plus the capture noticing that the page it says it became is
gone. That is the check the brief asked for in criterion 4, and one more.

**A lesson naming a file that never mentions it.** Remove the link from
`refusals.test.ts`, leave the lesson's `governs` alone:

```
blocking  lesson_link_not_returned  lesson-gates-that-cannot-refuse — lesson-gates-that-cannot-refuse governs packages/gate-engine/test/refusals.test.ts and packages/gate-engine/test/refusals.test.ts never names [[lesson-gates-that-cannot-refuse]].
lesson scan: 2 findings, 1 blocking
```

**A lesson page nothing references.** Empty its `governs` and remove the link
from both files that carried it:

```
blocking  lesson_unreferenced  lesson-gates-that-cannot-refuse — Nothing names [[lesson-gates-that-cannot-refuse]]. The index and the journal do not count: they name every page by construction.
lesson scan: 2 findings, 1 blocking
```

**`knowledge/index.md` and `knowledge/log.md` are excluded from what counts as a
reference, deliberately.** Both name every page by construction. If either
counted, a lesson would be referenced the moment it was filed and this check
could never fire — a guard satisfied by its own bookkeeping, which is `KXR-10`
in a new place.

## Criterion 5 — grow the loader past its budget

Add about three hundred bytes of plausible prose to `knowledge/LOADER.md`:

```
lessons: 1 pages governing 1 files, 1 captures (0 open), loader 2058 bytes
blocking  loader_over_budget  knowledge/LOADER.md — knowledge/LOADER.md is 2058 bytes against a budget of 2000: 58 over.
lesson scan: 2 findings, 1 blocking
```

It names the byte count and the overage, as the brief asked. The loader as
committed is **1,752 bytes**, 248 under.

## Criterion 6 — the converted file is shorter and says the same thing

**The file converted is `packages/gate-engine/test/refusals.test.ts`**, named
here as the brief requires. **327 lines before, 296 after** — 44 lines of prose
removed, 13 lines added, four `[[lesson-gates-that-cannot-refuse]]` links in
place of four essays.

```
$ git diff --stat packages/gate-engine/test/refusals.test.ts
 packages/gate-engine/test/refusals.test.ts | 57 +++++++-----------------------
 1 file changed, 13 insertions(+), 44 deletions(-)
```

What moved, and where it now lives on the lesson page:

| what the comment said | where it is now |
|---|---|
| Twenty gates, eight never observed refusing; `merge_authority`'s one case deletable unremarked | opening paragraph |
| A suite asserting only that a healthy candidate passes cannot tell a working gate from one that cannot fire | claim `C-lesson-refusal-unobserved`, and "Why the second direction is the one that matters" |
| Where only fixtures feed an engine, an unrefused gate has never run its refusal path at all | claim `C-lesson-refusal-fixtures-only`, and "The sharper version…" |
| Spoil one field against a healthy candidate, not build one from an empty object | "Three things that make the second direction real" |
| `because` is not decoration: read the reason, not just the outcome | claim `C-lesson-refusal-reason-read` |
| Coverage enforced from the list of gates, not remembered | claim `C-lesson-refusal-coverage-enforced` |

**What stayed in the file, deliberately.** The note on `without` versus `spoil`
and `exactOptionalPropertyTypes` is a fact about this file and this compiler, not
a lesson about checking anything. A lesson page is not a place to put things that
are only true of one file.

**58 gate-engine tests passed before and after.** The conversion changed comments
and nothing else.

## Every guard, removed, and the named test that failed

Criterion 7 by hand, since the manifest could not be reached (above). Each guard
in `packages/knowledge-graph/src/lessons.ts` was replaced with `if (false as
boolean)` one at a time and `vitest run test/lessons.test.ts` was run:

| guard removed | tests that failed |
|---|---|
| a link in the tree resolving to nothing | `a link in code that names no lesson page`; `the lesson a file depends on is deleted`; two frontmatter cases; `every finding class this scan can raise has been seen raising` — 5 failed, 21 passed |
| the governed file naming the lesson back | `a lesson naming a file that never names it back`; the coverage test — 2 failed, 24 passed |
| a lesson nothing names | `a lesson nothing names, with only the index and the journal mentioning it`; the coverage test — 2 failed, 24 passed |
| the loader byte budget | `the loader grown past the budget it exists to keep`; `names the byte count when the loader is over budget`; the coverage test — 3 failed, 23 passed |

**All four were restored and verified identical to the committed version**
(`diff -q` against a copy taken before the first mutation) before anything was
committed.

**What this does not establish.** Eight other finding classes were not
individually mutated — including `lesson_id_not_unique`, which was added after
these four runs. Each is observed firing by a scenario in the test file and the
coverage test refuses to pass while any class has never been seen — but
"observed firing" and "its guard cannot be removed unnoticed" are two different
statements and only the four above carry the second.

## What the first run found and nobody fixed

**Four blocking findings against the Mind Scan fixture trees.** The first run of
the whole-tree link scan reported `lesson-a` and `lesson-b` in
`packages/test-fixtures/knowledge/clean/` as dangling. They are pages inside a
complete miniature knowledge base used as a fixture for this very scanner. The
scan now refuses to descend into a directory named `knowledge` that holds a
`wiki` and is not the root it was asked to scan; a fixture tree is read when it
*is* the root, which is how the tests read it. `test/lessons.test.ts` carries a
case that fails if that ever regresses.

**One minor finding stands, open and unrepaired:**

```
minor  raw_source_ready_to_compile  src-master-commission — 10 wiki pages rest on src-master-commission and its record still reads ingestionState: sealed.
```

It is correct. Ten pages rest on the commission and the rule adopted here is that
five or more means the source has been absorbed and the record advances to
`ingestionState: compiled`. **This session cannot act on it.** `knowledge/raw/`
is append-only and outside the permitted paths, and advancing the field is a
knowledge operation with an owner-curated record on the other end of it. It is
recorded in `knowledge/log.md` as raised and not acted on, and it is the first
thing the new check found in this repository without anybody pointing at it.

## The register rows, filed on 2026-09-13

**This section replaces one headed "No register row, and why", which is kept
below rather than deleted** — it is the account of why four findings had nowhere
to live, and it is the reason the owner was asked. He answered: *"Fix those four
things. I take your recommendation as to the best way forward."*
`docs/decisions/OD-0017` transcribes that and names what a session chose under
it — the prefix `BR`, and `builder` as a fourth word in the `found by`
vocabulary.

Five rows are now in `docs/process/FINDINGS.md`, each with all five attributes
`constitution/REVIEW_POLICY.md` requires:

| id | status | what it is |
|---|---|---|
| `BR-01` | repaired | criterion 7 required the mutation manifest and the permitted paths put it out of reach |
| `BR-02` | repaired | the permitted paths omitted the derived seed graph, so criterion 1 and the path list could not both hold |
| `BR-03` | repaired | the brief's own placeholder was read by the check it commissioned as a link to a lesson that does not exist |
| `BR-04` | repaired | `CLAUDE.md` forbade editing a raw source record while `knowledge/SCHEMA.md` prescribed editing one field of one |
| `BR-05` | **open** | ten pages rest on `src-master-commission`, its record still reads `sealed`, and the tooling denies every write under `knowledge/raw/` |

**`repaired` here is the weakest sense of the word this register has.** Four
findings were raised by the session that built the work, against the contract
binding that session, and repaired by the same session on the same branch.
`CLAUDE.md`: a builder's success report is not evidence. A reviewer should read
these as where to start looking.

**`BR-05` is the one nobody here can close.** `knowledge/SCHEMA.md` prescribes
advancing `ingestionState` to `compiled`; `.claude/settings.json` denies `Write`
and `Edit` under `knowledge/raw/**`. The owner authorised the change in the
owner console on 2026-09-13 — *"I approve touching anything that I just said.
Don't ask again"* — and **the tool refused it anyway**:

```
Edit knowledge/raw/src-master-commission.source.md
  → File is in a directory that is denied by your permission settings.
```

`CLAUDE.md` records that those deny rules name the *tools* rather than the file,
so `python3`, `sed -i`, `cat >` and `tee` all go past them. **None was used.**
That paragraph exists to make the gap visible rather than to close it, and the
one thing that makes the difference safe to rely on is a session declining the
shell when it has verbal permission and a locked door. `BR-05` stays open and
`OD-0017` sets out the three ways the owner can close it.

## The account that stood before those rows existed

`docs/process/FINDINGS.md` and `packages/repo-checks/test/findings-register.test.ts`
are in the permitted paths *"because a finding raised by this work must be
recordable"*. **Nothing was recorded in either, on purpose, and the three items
above are therefore carried only here.**

Two reasons, both about the register rather than about the findings:

- **The identity is governed and a session does not mint a prefix for itself.**
  `FINDINGS.md`: `XR` and `KXR` were approved by the owner in the owner console.
  There is no prefix for a finding a builder raised about its own brief, and
  inventing one is precisely what that paragraph forbids.
- **The `found by` vocabulary has no word for this.** It is `gate`, `review` or
  `owner`. A contradiction found by the session building the work is none of the
  three, and the column is described in the register as *"the point of the
  register rather than a decoration on it"* — filing under `review` would make it
  say a review caught something no review has seen.

Both are one-word changes to a tier-3 governed file and both are the owner's.
**The honest consequence is that three real findings live in a run record rather
than in the one file whose job is to hold them, which is `XR-02` in miniature.**
Saying so is not the same as fixing it. A word from the owner — a prefix, and
either a fourth detector or a ruling that `review` covers a builder reporting
against its own contract — puts them in the register.

## Gaps left open, named rather than discovered

1. **`.claude/skills/knowledge-maintenance` does not know about captures.** It
   still lists five operations and `capture` is not one. `.claude/**` is outside
   the permitted paths, so it was left alone rather than edited under no
   contract. `knowledge/SCHEMA.md` says so in the text, so the gap is in the
   repository and not only here.
2. **Two finding vocabularies.** Mind Scan's classes are a closed enum in
   `@virgil/agent-contracts`, exported to `schemas/mind-scan-finding.schema.json`;
   the lesson classes are local to `@virgil/knowledge-graph`. Widening the
   contract was not permitted. One command and one exit code hide the split from
   anybody running it, and it is still a split — `KP3-05` is what two checkers
   that can disagree cost here, and this is two checkers that cannot currently
   be compared.
3. **The ongoing cost is a habit, not a line of code.** Every session now has to
   write captures as it works and somebody has to ingest them. The check can say
   a capture is malformed. It cannot say nobody has read it, and it cannot say a
   lesson was never written.
4. **`lesson_page_over_budget` is a proxy, not the rule.** The rule is "split a
   page when it holds two distinct ideas"; the check counts bytes. A four-
   thousand-byte page holding two ideas passes.
5. **Nothing converts the other comments.** The brief excludes it. One file is
   converted, the mechanism is proved, and the rest of `docs/process/`'s
   forty-six files and every other essay comment are where they were.
6. **`docs/process/ROADMAP.md` still reads "brief written and queued" against
   item 4.** It is outside the permitted paths and was not edited. Somebody has
   to move it, and a roadmap that lags what is built is the habit
   `PHASE_1_BACKLOG.md` names.

## What is not reviewed

All of it. No Keeper, no Prover, no specialist has looked at this candidate.
The commands above and their output are what a reviewer starts from, not what a
reviewer concludes.

**Nothing here is merged and nothing here proposes a merge that is not the
owner's to make.** The phrase is `merge approved`, naming the pull request, in
that turn.
