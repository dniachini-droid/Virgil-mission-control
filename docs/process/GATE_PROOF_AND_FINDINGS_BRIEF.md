# Foundation repair — every gate proves it can refuse, and findings get one home

**Status: proposed, not started. Nothing in this document is authority.**

This is not a Phase 2 slice. It is two repairs to the machinery that judges Phase 2, raised by an independent review of the repository on 2026-09-12 that read the tree and ran the suite. Both findings are checkable from the repository without taking that review's word for anything, and how to check them is stated below each one.

## The problem, in two sentences

**The gate engine has twenty gates and eight of them have never been observed refusing anything** — so for those eight, a passing suite cannot distinguish a gate that is working from a gate that cannot fire. **And findings have no single home** — `constitution/REVIEW_POLICY.md` requires they are never "renumbered, merged silently or dropped", and `docs/process/PHASE_1_BACKLOG.md` already records that they were: *"no file in the repository holds its text."*

### Finding one, and how to check it

`packages/gate-engine/test/gates.test.ts` asserts that a harmless candidate raises no false blockers on any gate. Nothing asserts the other direction. Read the `failingGates` arrays in `packages/test-fixtures/src/candidates.ts` against `gateIds` in `packages/gate-engine/src/gates.ts` and eight gates appear in neither those arrays nor anywhere else as a `fail`: `approved_base_ancestry`, `branch_identity`, `commit_and_push_complete`, `deploy_authority`, `repository_allowlisted`, `required_checks_ran`, `working_tree_clean`, and `merge_authority` — which has one case only inside a test about something else, where its removal would go unremarked.

This matters here and not in every repository, because `docs/architecture/ENFORCEMENT_BOUNDARIES.md` says the engine *"has no evidence until Phase 2 adapters exist; today only fixtures feed it."* Until those adapters land, fixtures are the only thing that ever exercises a gate, and a gate no fixture refuses has never run its refusal path at all.

### Finding two, and how to check it

Ask the repository what is open right now. The answer is assembled by hand from `ENFORCEMENT_BOUNDARIES.md`, `PHASE_1_BACKLOG.md`, eight `V11_KEEPER_REVIEW*` documents and the header comments of `.github/workflows/checks.yml`. There is no list. A policy that findings are never dropped is only as good as the one list that would show it if they were.

## What has to change

1. **Every gate carries a case that drives it to `fail`,** and the coverage is enforced rather than remembered. A gate added to `gates` with no such case must fail a check — not be noticed later by a reader.
2. **One findings register exists,** with a stable identity, a status and a pointer to the document holding the finding's full text.
3. **The register carries one column this repository does not have: what *found* the finding** — a deterministic gate, a review, or the owner looking at the thing. This is the only measure available of whether the review machinery works, and it is the point of the second repair rather than a decoration on it. Read today it says every finding was caught by review and none by a gate, which is the honest state of an engine with no adapters, and the column is how you find out whether Phase 2 changed that instead of assuming it.
4. **Both land inside `pnpm test`.** No new package, no new script, no new workflow step, no new command to keep wired. This constraint is not stylistic: `KS4-05` and `KS4-06` are what a gate too expensive to finish costs, and a repair that adds a job would be paid for out of the same exhausted budget.

## What it does NOT do

- **It does not back-fill the findings that exist.** `KR-01`, `KR-02`, `KR-04`, `KR-05` are recorded as repaired without individual summaries, and `KS4-05` and `KS4-06` are named against one passage of `checks.yml` rather than one each. Assigning them summaries by inference would put guesses in the one file whose job is to be trusted. The register is seeded with findings whose text a file states individually and is forward-only from the day it lands; the rest stay where they are and the register says so.
- **It does not repair any open finding.** `KR-03`, `KR-06`, `KR-07`, `KR-09` and `KR-58` are recorded, not closed. Recording a gap is not closing it and the register must not read as though it were.
- **It does not touch `constitution/`, the master commission, or `knowledge/raw/`.**
- **It does not change what any gate decides.** Gate logic in `packages/gate-engine/src/` is not edited. If a gate turns out to be unable to refuse, that is a finding to raise, not a thing to fix inside this work.
- **It does not claim the register is complete.** No check can know about a finding nobody wrote down, and a completeness rule would force back-filled guesses to make the suite green — the exact failure it exists to prevent.

## Permitted paths

```
packages/gate-engine/test/**
packages/test-fixtures/src/**
apps/mission-control/test/**
docs/process/FINDINGS.md
```

Anything outside these is out of scope for this work and `diff_within_permitted_paths` should say so.

## How you will know it works, without taking anyone's word

A builder's report that the suite is green is not evidence here, and neither is this document. Four things are checkable by a reviewer who trusts nobody:

1. **`pnpm lint`, `pnpm typecheck` and `pnpm test` pass** on the candidate SHA, in CI, not in the session that wrote it.
2. **Delete one gate's refusal case and the suite must fail, naming that gate.** The run record must show this done and the output quoted. A guard nobody has seen fail is the same class of thing as the eight gates — this work must not add another one.
3. **Put a row in the register with a detector outside the vocabulary, and a pointer to a file that does not exist. Both must fail.** Same rule, same reason, quoted in the run record.
4. **Count the gates.** Every id in `gateIds` has a refusal case, and the count of cases equals the count of gates. A reviewer can verify this by reading, in about a minute.

## Cost, stated before it is spent

Near zero, and deliberately. This adds roughly sixty assertions to a suite that already runs about nineteen hundred, all of them pure function calls and file reads. No browser, no new job, no new workflow, no GitHub API call, and so no measurable addition to the minutes that ran out on 10 September. It runs in the `fast` job that every push already pays for.

## Size

Small. Two test files and one document, no source change, no new dependency.

## What I need from you

1. **Finding identities.** These two findings need ids and identity is governed. They came from an external review, not a Keeper, so no existing prefix obviously fits. Either approve a new prefix — `XR-01` for the gates, `XR-02` for the register, `XR` meaning external review — or assign ids from a scheme you prefer. A session must not mint these for itself.
2. **Confirm forward-only.** The register is seeded, not back-filled, for the reason above. If you would rather it were complete, that is a different and much larger job and it needs you to supply the summaries for the six findings no file states individually.
3. **The branch name,** and confirmation that one session builds this and a different one reviews it.
