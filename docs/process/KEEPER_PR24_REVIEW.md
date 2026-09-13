# Keeper review of pull request #24, candidate `138fa39d`

**Captured verbatim on 2026-09-13** from [comment 5653183520](https://github.com/dniachini-droid/Virgil-mission-control/pull/24#issuecomment-5653183520) on pull request
#24. It judged candidate `138fa39d6e1be8d8516a34e0d5b50ea8d972ed51`.

**Nothing below the rule is edited.** Figures that have since gone stale and
statements this repository has since corrected stand exactly as they were
written: a review is a record of what someone found at a moment, and a record
edited afterwards is not a record.

---

## Keeper review — candidate `138fa39d6e1be8d8516a34e0d5b50ea8d972ed51`

**PASS_WITH_NON_BLOCKING_FINDINGS.** Candidate `138fa39d6e1be8d8516a34e0d5b50ea8d972ed51`, base `4e39b822cc9aa0cb98025b1203c3857a269e1710`, branch `claude/virgil-builder-opens-pr`, one commit, four files. One non-blocking finding, on a pre-existing surface. Nothing blocking.

This is not `SAFE_TO_MERGE`. Merging is the owner's and this informs it.

Reviewed separately from #26 and it lands differently: this candidate is clean where that one has seven findings.

---

## What the work does, and whether it does it

**In plain terms.** It writes down a decision the owner made — that a session which has finished building opens its own pull request instead of stopping to ask — and removes the sentence in `CLAUDE.md` that forbade it. It changes nothing else about what a session may do.

**It does exactly that and no more.** I checked the diff line by line against the question that matters here, which is whether an authority-layer-1 record quietly widens what a session may do while appearing to record one instruction.

- The `CLAUDE.md` hard limit loses **only** "open a pull request". `Never merge, deploy, or connect credentials unless the owner explicitly authorised it in writing for that session` survives word for word, and so does `Never touch main` and `Commit only to the branch assigned to the session`.
- The `## Merging` section is **untouched**. `merge approved`, naming the pull request, in the owner's own turn, still governs, and the record repeats it rather than paraphrasing it.
- The hard limit above it — never write to another repository, `open a pull request on` one included — is untouched and still absolute. Opening a pull request is now permitted **here** and forbidden **there**, which is the right shape.
- The record's own scope discipline is the strongest thing about it. The owner's quoted instruction has two clauses; the record decides the first and says of the second, in as many words, *"That is not decided by this record and it is not built."* The design work for it goes in `docs/process/AUTOMATIC_REVIEW_BRIEF.md`, which opens *"Status: proposed, not started. Nothing in this document is authority."* A record that had quietly decided the second half would have been the finding in this review. It does not.

**No contradiction with #26, and a dependency running the other way.** #26 documents a build session that *"pushes, opens its own pull request"*. On `main` today `CLAUDE.md` forbids that without per-session written authorisation, so #26 merged alone ships a process document instructing what `CLAUDE.md` prohibits. **This candidate is what makes that lawful.** The two complete each other; this one should land first, or with it. I raised the same point as `KXR-50/PR26` on #26 and it is not a defect in this candidate.

---

## What I ran, and what it printed

Cache off, at `138fa39d`.

```
$ npx biome check .
Checked 86 files in 47ms. No fixes applied.

$ npx turbo run typecheck --force
 Tasks:    7 successful, 7 total

$ npx turbo run test --force
@virgil/repo-checks:test:        Tests  260 passed (260)
@virgil/domain:test:             Tests  104 passed (104)
@virgil/agent-contracts:test:    Tests   74 passed (74)
@virgil/gate-engine:test:        Tests   58 passed (58)
@virgil/knowledge-graph:test:    Tests   24 passed (24)
 Tasks:    5 successful, 5 total

$ (tools/knowledge-lint) npm run lint
knowledge graph: 73 nodes, 126 edges, 8 pages, 22 claims, 75 tethers (75 intact)
graph hash sha256:70b741c39535dd24fc3015a6baca002f71b44f243ab86a59c19ed77775d4ec44
mind scan: no findings

$ npx tsx scripts/virgil-tier.ts
tier 3, from 4 changed paths against origin/main
  governed: CLAUDE.md — it states what every session may and may not do
  governed: docs/decisions/OD-0018-builders-open-their-own-pull-requests.md — authority layer 1: an owner decision
```

**520 tests, 0 failed, and every one of them passes in this container** — which is worth saying because #26's suite does not. **The tier claim in the body is correct**: it says tier 3 and the derivation says tier 3. The committed graph hash is the hash the scan derives, so the seed graph was genuinely regenerated rather than edited.

## Attacks

| attack | guard | fired? |
|---|---|---|
| the seed-graph hash reverted to its pre-`OD-0018` value | `carries the hash of the graph it was derived from`, `matches a fresh derivation byte for byte` | **yes** — 2 failed \| 22 passed |
| the `OD-0018` node deleted from the seed graph while the file stays | `matches a fresh derivation byte for byte` | **yes** — 1 failed \| 23 passed |

Both mutations were made in a separate copy of the repository and reverted; the candidate tree was never touched.

I also checked the record against the hook that guards `docs/decisions/OD-*`. It requires a blockquoted verbatim quotation of at least eight characters and a `YYYY-MM-DD` date; `OD-0018` carries three blockquotes and the date, and the hook's own 14 tests pass.

---

## Findings

**None blocking.**

### `KXR-51/PR24` — minor, non-blocking, pre-existing. The decisions index does not list this record, or the nine before it

**Surface.** `docs/decisions/README.md`, the `Index:` table.

**Reproduction.** `grep '^| OD-00' docs/decisions/README.md` returns `OD-0001` through `OD-0008` and stops. `OD-0009` to `OD-0016` are filed and indexed nowhere; `OD-0018` continues that. So a reader who trusts the index of authority layer 1 sees eight of the eighteen records.

**Criterion it fails.** `docs/decisions/README.md`'s own promise that the table is an index, and `CLAUDE.md`'s authority order, which makes `docs/decisions/OD-*` layer 1 — an authority record a reader can miss is a weak authority record.

**Why it is not this candidate's defect and I am not asking it to fix it.** The index has been stale since 2026-09-07 and eight records ahead of this one did the same thing. Repairing it here would widen a four-file decision record into a record-keeping change, which is the thing a bounded contract exists to prevent. It wants a row in the findings register and one small change by whoever owns record-keeping, and I can file neither — filing is a repair and not mine.

### Not findings, said so that nobody re-derives them

- **`OD-0017` does not exist on `main`, and the gap is explained rather than a dropped record.** It was never added to `main` — `git log --all --diff-filter=A -- 'docs/decisions/OD-0017*'` is empty there — and it is on the open branch behind #27, as `OD-0017-knowledge-lessons-follow-up.md`. Numbering across two branches in flight, not a missing decision.
- The new `CLAUDE.md` bullet says *"A session that has finished building opens its own pull request"* without repeating "on this repository". Read against the bullet immediately above it, which is explicit and absolute about other repositories, no session can reasonably take it the other way. Cosmetic; I am not raising it.
- The body's `turbo run test --force  5 successful, 5 total` is a count of tasks, not of tests. Accurate as written.

---

## The one thing review cannot settle, and it is yours

**I cannot verify that the owner said the words this record quotes.** Nothing in this repository holds an independent copy of the owner console, the hook that guards `OD-*` says in its own comment that it cannot check authenticity either, and `docs/decisions/README.md` already states the conclusion: *"The owner reading their own decision records is still the only way a false one is found."*

So the residual check is one minute of the owner's time, and it is the whole of what is left on this candidate. **Read the two quotations in `OD-0018-builders-open-their-own-pull-requests.md` — the one under "What he was answering" and the one under "The decision, in his words" — and confirm they are yours.** Everything else about this record I verified and it holds.

## What I could not run, and what I did not do

- I could not verify the owner quotations, as above.
- I did not exercise the new permission: no session in this review opened a pull request, and this candidate contains no machinery, so there is nothing here to run end to end.
- The three red Netlify checks on this branch are the same deploy reported three times, are red on `main` too, and are filed in `docs/process/OWNER_TODO.md` as the owner's. The repository's own check is what matters and it is green.
- **I filed no rows in the findings register, started no session of any kind, edited no file in this repository, and merged and approved nothing.**

---

**No repair round is warranted and I do not recommend one. Nothing must change on this candidate.** The one open item, `KXR-51/PR24`, is pre-existing, non-blocking and outside this record's scope, and the only thing standing between this and a merge decision is the owner recognising his own words — plus the sequencing: this should merge before or with #26, not after it.

<!-- virgil:handoff role=reviewer round=0 sha=138fa39d6e1be8d8516a34e0d5b50ea8d972ed51 verdict=PASS_WITH_NON_BLOCKING_FINDINGS next=owner -->

---
_Generated by [Claude Code](https://claude.ai/code)_
