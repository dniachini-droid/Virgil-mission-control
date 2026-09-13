# Findings register

**One home for findings, so that "never dropped" is checkable rather than asserted.**

`constitution/REVIEW_POLICY.md` requires that every finding has a stable identity and that findings are *"never renumbered, merged silently or dropped"*. Until this file existed, answering *"what is open right now?"* meant assembling it by hand from `docs/architecture/ENFORCEMENT_BOUNDARIES.md`, `docs/process/PHASE_1_BACKLOG.md`, eight `V11_KEEPER_REVIEW*` documents and the header comments of `.github/workflows/checks.yml`. A policy that findings are never dropped is only as good as the one list that would show it if they were. That is finding **XR-02**, and this file is its repair.

`apps/mission-control/test/findings-register.test.ts` reads this file on every `pnpm test`. A row whose status or detector is outside the vocabularies below fails; a row pointing at a file that does not exist fails; a row pointing at a file that does not name the finding fails.

## What this register does not claim

**It does not claim to be complete, and no check can make it so.** No check can know about a finding nobody wrote down, and a completeness rule would force back-filled guesses into the one file whose job is to be trusted — the exact failure it exists to prevent. It is seeded with findings whose text a file states individually, and is forward-only from the day it lands.

**Six findings are deliberately not seeded.** `KR-01`, `KR-02`, `KR-04` and `KR-05` are recorded as repaired without individual summaries. `KS4-05` and `KS4-06` are named against one passage of `.github/workflows/checks.yml` rather than one each. Assigning them summaries by inference would put guesses here. They stay where they are, and this paragraph is the record that they are not in the table below.

*(Noted while seeding, for the owner rather than acted on: `KS4-05` and `KS4-06` do each carry their own section in `docs/process/V11_KEEPER_REVIEW_STAGE4.md`, at the headings "KS4-05 — continuous integration has never been green on this branch, and the record never says so" and "KS4-06 — `verify:owner:v11` has never run whole, anywhere, and never on the pinned browser". They are excluded because the brief that authorised this work excluded them; a word from the owner adds them without inference.)*

**`KR-50` and `KR-59` are not seeded either**, for the same reason: `ENFORCEMENT_BOUNDARIES.md` names both inside one sentence describing a shared condition, not one summary each.

**Everything from `KR-26` onward that was reported by the owner console is not here.** `docs/process/PHASE_1_BACKLOG.md` records that *"no file in the repository holds its text"*. A register cannot point at text that does not exist, and inventing it would be worse than the gap.

**It carries two of the five attributes a finding is supposed to have.** `REVIEW_POLICY.md` requires a stable identity, a severity, an affected surface, reproduction evidence and the acceptance criterion or authority the finding concerns. The table below has an identity and a pointer. The other three are missing, and adding columns for them would mean inferring severity and reproduction for ten historical findings whose text never states either — the back-filled guesses this register exists to keep out. So it is carried as `KXR-03`, open, in the table below: a finding about this file, recorded in this file.

**A status is what the repository claims, and is not a review verdict.** Each row's pointer is how a reader checks it. `repaired` on a finding repaired on the same branch has not been independently reviewed — `CLAUDE.md`: a builder's success report is not evidence.

## Vocabularies

**Status** — one of:

- `open` — recorded, not closed. Recording a gap is not closing it.
- `repaired` — the repository claims it is fixed; the pointer is how you check.
- `accepted` — the owner accepted it open, by a decision the pointer names.
- `deferred` — the owner deferred it, by a decision the pointer names.
- `caught_not_repaired` — a check now catches the class of defect; the defect itself is unrepaired. Two different statements, and neither substitutes for the other.
- `by_design` — examined and found to be a property of the design rather than a defect in it.
- `withdrawn_gap_open` — the claim the finding named was corrected, and the gap that claim exposed still stands. The final review raised this as an observation rather than a finding: `KXR-01` read `repaired` and `KXR-07` read `open` for what is one gap, so the register was overstating itself by exactly one row. A vocabulary with no word for a thing describes it wrongly or not at all.

**Found by** — one of `gate`, `review`, `owner`, `builder`.

`builder` was added on 2026-09-13 by `docs/decisions/OD-0017`, with the `BR` prefix, because there was no honest way to file what a building session finds. A session that discovers a defect in the contract binding it is not a gate, not a review and not the owner — and filing it under `review` would make the column below say a review caught something no review has seen. Four findings sat in a run record for want of a word, which is `XR-02` in miniature. **A `builder` row is the weakest kind in this register**: it is a session's account of its own work, unreviewed by anything, and a reviewer should read it as where to start looking rather than as a finding already established.

This column is the point of the register rather than a decoration on it. It is the only measure available of whether the review machinery works. **Read today it says every finding was caught by a review and none by a gate** — which is the honest state of an engine that `ENFORCEMENT_BOUNDARIES.md` records as having *"no evidence until Phase 2 adapters exist"*. The column is how you find out whether Phase 2 changed that, instead of assuming it did.

## The register

| id | status | found by | what | where its text is |
|---|---|---|---|---|
| KR-03 | open | review | Required checks are declared by the Prover and anchored to nothing owner-controlled; a Prover declaring only `lint` can reach `READY_FOR_REVIEW` honestly | docs/architecture/ENFORCEMENT_BOUNDARIES.md |
| KR-06 | open | review | The protected-boundary overlap check is case-sensitive and symlinks are outside the normaliser | docs/architecture/ENFORCEMENT_BOUNDARIES.md |
| KR-07 | open | review | An owner grant may hand an agent write authority over a protected boundary | docs/architecture/ENFORCEMENT_BOUNDARIES.md |
| KR-09 | open | review | Gate `reviewer_independence` takes builder and Prover session ids but no repairer ids | docs/architecture/ENFORCEMENT_BOUNDARIES.md |
| KR-58 | caught_not_repaired | review | `owner-build/inline.mjs` scans for external references before the stylesheet and bundle are pasted in, so it only ever inspects the bare shell | docs/architecture/ENFORCEMENT_BOUNDARIES.md |
| KP2-08 | accepted | review | `/api/state` has no authentication | docs/architecture/ENFORCEMENT_BOUNDARIES.md |
| KP2-11 | open | review | The agent step in `instruct.yml` is bounded by `CLAUDE.md` rather than by machinery | docs/architecture/ENFORCEMENT_BOUNDARIES.md |
| KP2-14 | open | review | `apps/mission-control/vite.owner.config.ts` defines no `__LIVE__` while four of the five configs do | docs/architecture/ENFORCEMENT_BOUNDARIES.md |
| KP3-06 | deferred | review | `main` has no branch protection, so every green check on a pull request is advisory | docs/architecture/ENFORCEMENT_BOUNDARIES.md |
| KP3-11 | by_design | review | Every depiction of an agent in the live room is a session's own word about itself | docs/architecture/ENFORCEMENT_BOUNDARIES.md |
| XR-01 | repaired | review | Twenty gates existed and eight had never been observed refusing anything, so a passing suite could not distinguish a working gate from one that cannot fire | docs/process/FOUNDATION_REPAIR_RUN_RECORD.md |
| XR-02 | repaired | review | Findings had no single home, so `REVIEW_POLICY.md`'s rule that they are never dropped could not be checked | docs/process/FOUNDATION_REPAIR_RUN_RECORD.md |
| KXR-01 | withdrawn_gap_open | review | The register asserted an owner approval that no file in the repository supported. The sentence was corrected; the gap it exposed — no decision record for any of 2026-09-12 — is `KXR-07` and stands | docs/process/FOUNDATION_REPAIR_RUN_RECORD.md |
| KXR-02 | repaired | review | Rows could be deleted from the register in silence — four were removed, including both findings this branch raised, and the suite stayed green | docs/process/FOUNDATION_REPAIR_RUN_RECORD.md |
| KXR-03 | open | review | The register carries two of the five attributes `REVIEW_POLICY.md` requires of a finding: severity, affected surface and reproduction evidence are absent | docs/process/FOUNDATION_REPAIR_RUN_RECORD.md |
| KXR-04 | repaired | review | The red-before-green proofs lived only in commit messages, where the brief asked for a run record | docs/process/FOUNDATION_REPAIR_RUN_RECORD.md |
| KXR-05 | repaired | review | The record did not say that CI was red at the intermediate commit 57d7829 | docs/process/FOUNDATION_REPAIR_RUN_RECORD.md |
| KXR-06 | repaired | review | The register pinned that a row existed, not what it said: one row could be flipped from `open` to `repaired` by a one-word edit with the suite still green | docs/process/FOUNDATION_REPAIR_RUN_RECORD.md |
| KXR-07 | open | review | Two of the five files in this branch's diff are outside the brief's permitted paths, authorised only by prose the same sessions wrote | docs/process/FOUNDATION_REPAIR_RUN_RECORD.md |
| KXR-08 | repaired | review | `XR-01` and `XR-02` pointed at a document that says of itself "Nothing in this document is authority" | docs/process/FOUNDATION_REPAIR_RUN_RECORD.md |
| KXR-09 | repaired | review | The register pinned one cell of four, so a finding could be neutralised without touching its status: all twenty detectors flipped from `review` to `gate` left the suite green | docs/process/KEEPER_FINAL_REVIEW_GATE_PROOF_AND_FINDINGS.md |
| KXR-10 | repaired | review | The pointer check was satisfied by the register itself, since every row contains its own id, and matched ids as substrings, so a file naming only `KXR-01` satisfied `XR-01` | docs/process/KEEPER_FINAL_REVIEW_GATE_PROOF_AND_FINDINGS.md |
| KXR-11 | repaired | review | A finding recorded in a second table headed anything but `id` was invisible to every check | docs/process/KEEPER_FINAL_REVIEW_GATE_PROOF_AND_FINDINGS.md |
| KXR-12 | repaired | review | The register told readers that adding a row meant two edits "and nothing else", and listed what the check enforces without mentioning two of its guards | docs/process/KEEPER_FINAL_REVIEW_GATE_PROOF_AND_FINDINGS.md |
| KXR-13 | repaired | review | A second table headed exactly like the register is read by nothing, and both the register and its check say otherwise | docs/process/KEEPER_RECORD_KEEPING_REVIEW.md |
| KXR-14 | repaired | review | The five attributes `KXR-03` added are unpinned, so a severity can be downgraded and a reproduction erased in silence | docs/process/KEEPER_RECORD_KEEPING_REVIEW.md |
| KXR-15 | repaired | review | The record-keeping brief opened by denying it was a repair cycle and four paragraphs later committed to repairing five findings | docs/process/KEEPER_RECORD_KEEPING_REVIEW.md |
| KXR-16 | open | review | `KXR-12` reads `repaired` and the first of the two passages it named is byte-identical to before | docs/process/KEEPER_RECORD_KEEPING_REVIEW.md |
| KXR-17 | open | review | The run record makes no statement about CI for the record-keeping candidate, where its own predecessor section names the run | docs/process/KEEPER_RECORD_KEEPING_REVIEW.md |
| KXR-19 | open | review | `enabledPlugins` and `extraKnownMarketplaces` land in the only region of `.claude/settings.json` no check reads | docs/process/KEEPER_PR11_UNREVIEWED_COMMITS_REVIEW.md |
| KXR-20 | repaired | review | `CLAUDE.md` forbids reading another repository ten lines above a section installing one that every session loads | docs/process/KEEPER_PR11_UNREVIEWED_COMMITS_REVIEW.md |
| KXR-21 | open | review | "MIT licensed, free" is asserted of Superpowers and is unverifiable from this container, with no record in `assets/licenses/` | docs/process/KEEPER_PR11_UNREVIEWED_COMMITS_REVIEW.md |
| KXR-22 | repaired | review | A fourth review of `b27cde14` existed and its five findings were in no file, while the PR description called that commit unreviewed | docs/process/KEEPER_PR11_UNREVIEWED_COMMITS_REVIEW.md |
| KXR-18 | repaired | review | `d7d80fd` changed the two files declaring this repository's own limits under no contract, with the authorisation recorded nowhere | docs/process/KEEPER_PR11_UNREVIEWED_COMMITS_REVIEW.md |
| KXR-23 | repaired | review | The required check failed on three commits while each of their messages said `pnpm check` passed | docs/process/KEEPER_PR11_REREVIEW_OD0016.md |
| KXR-24 | repaired | review | `KXR-14` was recorded and pinned `repaired` while its own recorded reproduction still succeeded | docs/process/KEEPER_PR11_REREVIEW_OD0016.md |
| KXR-25 | open | review | `OD-0016` §5 states as current fact a repository state that exists only on an unmerged branch | docs/process/KEEPER_PR11_REREVIEW_OD0016.md |
| KXR-26 | repaired | review | `KXR-18` was in no register row, no pin and no holds array, and the completeness check could not notice | docs/process/KEEPER_PR11_REREVIEW_OD0016.md |
| KXR-27 | open | review | `KXR-22` is recorded `repaired` while the half of its summary about the pull request became more wrong, not less | docs/process/KEEPER_PR11_REREVIEW_OD0016.md |
| KXR-28 | open | review | A hard limit was loosened and a layer-4 document still quotes the deleted text as live authority | docs/process/KEEPER_PR11_REREVIEW_OD0016.md |
| KXR-29 | repaired | review | The `turbo.json` repair fixed the instance and not the class; the same failure reproduces through the commission | docs/process/KEEPER_PR14_REVIEW.md |
| KXR-30 | repaired | review | The review that blocked pull request #14 was kept in no file, and its findings existed nowhere in the repository | docs/process/KEEPER_PR14_REVIEW.md |
| KXR-31 | open | review | A pull request description called the last verdict fixed and named only half of it | docs/process/KEEPER_PR14_REVIEW.md |
| KXR-38 | repaired | gate | A guard read `resolve(root, …)` as a repository read where `root` is a scratch directory, and named two temporary files as undeclared cache inputs | docs/process/CACHE_GUARD_RECORD.md |
| KXR-43 | open | owner | Three permission entries allow commands deleted with the application; a session is refused the edit by two independent mechanisms | docs/process/OWNER_TODO.md |
| BR-01 | repaired | builder | A brief required every new guard to enter the mutation manifest while its own permitted paths put the manifest out of reach, and the manifest reaches only the application's tests | docs/process/KNOWLEDGE_LESSONS_RUN_RECORD.md |
| BR-02 | repaired | builder | A brief's permitted paths omitted the derived seed graph, so its first success criterion and its own path list could not both be satisfied | docs/process/KNOWLEDGE_LESSONS_RUN_RECORD.md |
| BR-03 | repaired | builder | A brief wrote the link syntax as a placeholder that the check it commissioned then read as a real link to a lesson that does not exist | docs/process/KNOWLEDGE_LESSONS_RUN_RECORD.md |
| BR-04 | repaired | builder | `CLAUDE.md` forbade editing a raw source record while `knowledge/SCHEMA.md` prescribed an edit to one of its fields, and neither named the tooling that settles it | docs/decisions/OD-0017-knowledge-lessons-follow-up.md |
| BR-05 | open | builder | Ten wiki pages rest on `src-master-commission` and its record still reads `sealed`; the tooling denies every write under `knowledge/raw/`, so no session can advance it | docs/decisions/OD-0017-knowledge-lessons-follow-up.md |
| KXR-51/PR24 | open | review | The decisions index lists `OD-0001` to `OD-0008` and stops, so ten filed authority-layer-1 records are indexed nowhere | docs/process/KEEPER_PR24_REVIEW.md |
| KXR-44/PR26 | open | review | The repair-round cap counts handoffs whose declared role is `fixer`, and the role is the session's own word, so a repair posting `--facts builder` leaves the counter at zero for ever | docs/process/KEEPER_PR26_REVIEW.md |
| KXR-45/PR26 | open | review | The chain reader requires the pull request's comments oldest-first; nothing documents it and nothing checks it, and newest-first commissions review sessions without bound | docs/process/KEEPER_PR26_REVIEW.md |
| KXR-46/PR26 | repaired | review | The new unpushed-commit guard spawned `npx` outside the project, reached the npm registry and failed in every container this repository's own sessions run in | docs/process/KEEPER_PR26_REVIEW.md |
| KXR-47/PR26 | open | review | Four further refusals of the chain script work and are held by no test, two of them behaviours asserted in prose the same diff ships | docs/process/KEEPER_PR26_REVIEW.md |
| KXR-48/PR26 | open | review | The facts marker is what the chain checks rather than the facts, so a hand-typed marker with no facts is accepted and a quoted one injects a handoff that never happened | docs/process/KEEPER_PR26_REVIEW.md |
| KXR-49/PR26 | open | review | The guards on the role files assert that sentences are present, so a role file instructing the opposite of what it says passes all thirty | docs/process/KEEPER_PR26_REVIEW.md |
| KXR-50/PR26 | repaired | review | Merged alone, a layer-4 process document would instruct what `CLAUDE.md` then forbade; the two pull requests complete each other and #24 had to land first or with it | docs/process/KEEPER_PR26_REVIEW.md |
| KXR-47/PR27 | repaired | review | The run record's check-output block quoted 313 files and 2,400 tests from a tree that no longer exists, under a sentence denying any figure was copied from an earlier commit | docs/process/KEEPER_PR27_REVIEW.md |
| KXR-48/PR27 | open | review | `pnpm --filter @virgil/knowledge-lint run lint` is run by no check on any event, while `CLAUDE.md` tells every session to run it | docs/process/KEEPER_PR27_REVIEW.md |
| KXR-49/PR27 | open | review | The lesson link scan cannot tell a discussed link from a made one, so any file explaining the mechanism must obfuscate its own examples | docs/process/KEEPER_PR27_REVIEW.md |
| KXR-50/PR27 | open | review | Two register rows describe a tree that has moved under them: `BR-04`'s stated reproduction is stale and `BR-05` says ten wiki pages where the scan says eight | docs/process/KEEPER_PR27_REVIEW.md |
| KXR-51/PR27 | open | review | The mutant section's integrity seal quotes a `lessons.ts` hash that matches no version of that file which has ever existed in this repository | docs/process/KEEPER_PR27_REREVIEW.md |
| KXR-52/PR27 | open | review | Pull request #27's description still says the three mutants carry seven tests, the figure the commit it describes retired in favour of six of ten | docs/process/KEEPER_PR27_REREVIEW.md |
| KXR-53/PR28 | repaired | review | Eleven of the fourteen new owner-voice guards pin one spelling each, so a section restoring every defect the work removes passes all fourteen | docs/process/KEEPER_PR28_REVIEW.md |
| KXR-54/PR28 | repaired | review | Pull request #28 carried no facts block, so the chain its own parent merged reported the next step as the owner rather than as a review | docs/process/KEEPER_PR28_REVIEW.md |
| KXR-55/PR28 | repaired | review | The four guards inherited from #26 no longer constrain the rewritten skill: a file instructing the conductor to poll on a timer and to merge without the owner passes every check | docs/process/KEEPER_PR28_REVIEW.md |
| KXR-56/PR28 | repaired | review | The window's startup step sent the reader to the branch behind pull request #1, closed days earlier, for work it said `main` did not hold | docs/process/KEEPER_PR28_REVIEW.md |
| KXR-60/PR28 | open | review | The ten class guards are a longer spelling list: a section restoring every defect passes all twenty-five, and a second file in the skill directory is read by no guard at all | docs/process/KEEPER_PR28_REREVIEW.md |
| KXR-61/PR28 | open | review | The facts block's one un-generated field reported 630 tests where the tree produces 593, because `--ran` was handed a written summary rather than real command output | docs/process/KEEPER_PR28_REREVIEW.md |
| KXR-62/PR28 | open | review | Two of the four documents the window's startup step tells it to read do not exist, so it spends two of four reads announcing absences every turn | docs/process/KEEPER_PR28_REREVIEW.md |
| KXR-63/PR28 | open | review | The plan's staleness measure counts merges since a stamped commit, and the plan's live section is about work that has not merged, so it reports current while already two facts behind | docs/process/KEEPER_PR28_REREVIEW.md |
| KXR-57/PR30 | open | review | The corrected check-output block went stale again without a byte of it changing, because the replay moved the base under counts the record pins absolutely | docs/process/KEEPER_PR30_REVIEW.md |
| KXR-58/PR30 | open | review | Pull request #30's description sends a reader to the run record for six findings' reasons where it carries four, and two of the six appear nowhere in the tree | docs/process/KEEPER_PR30_REVIEW.md |
| KXR-70/PR32 | repaired | review | The order guard compares the reviewer's forty-character sha against the builder's seven-character one, so it could not fire on any chain this repository's own tooling emits | docs/process/KEEPER_PR32_REVIEW.md |
| KXR-71/PR32 | repaired | review | "Position cannot be misdeclared" was untrue: a pushing session spelling itself `reviewer`, and one whose marker never parsed, both left the round count pinned at zero however deep the chain ran | docs/process/KEEPER_PR32_REVIEW.md |
| KXR-72/PR32 | open | review | The change hardening the rule that every pushing session posts a generated facts block was itself pushed without one | docs/process/KEEPER_PR32_REVIEW.md |
| KXR-73/PR32 | open | review | The pull request's description names as the order guard's blind spot a reversal the guard detects, and leaves the two real blind spots unnamed | docs/process/KEEPER_PR32_REVIEW.md |
| KXR-74/PR32 | open | review | A test asserts with the message of the signal that was rejected, on the case that proves the signal which replaced it | docs/process/KEEPER_PR32_REVIEW.md |
| KXR-80/PR32 | open | review | A comment claims an over-eager sha match "can only" resolve towards the owner, where it suppresses the guard instead, and no test holds that direction | docs/process/KEEPER_PR32_REREVIEW.md |
| KXR-81/PR32 | open | review | The facts block names a governed file under "governed paths touched" that the round it describes did not touch | docs/process/KEEPER_PR32_REREVIEW.md |
| KXR-82/PR32 | open | review | The description claims nine new cases where the diff adds eight and removes none | docs/process/KEEPER_PR32_REREVIEW.md |
| KXR-75/PR33 | repaired | review | The seven reviews captured by #33 were held by nothing, so one could be emptied, or a finding inside it reversed, with every check still passing | docs/process/KEEPER_PR33_REVIEW.md |
| KXR-76/PR33 | repaired | review | The candidate falsified the plan's queued line — twenty-four rows filed where it still said none were — and did not record that it had | docs/process/KEEPER_PR33_REVIEW.md |
| KXR-77/PR33 | open | review | A capture's builder-authored header says its reason is a finding "this very document raises", naming one that a different capture raises | docs/process/KEEPER_PR33_REVIEW.md |

## Attributes, for findings recorded from 2026-09-12

`constitution/REVIEW_POLICY.md` is authority layer 2 and requires that **every** finding has a stable identity, a severity, an affected surface, reproduction evidence, and the acceptance criterion or authority it concerns. The table above carries two of those. That was `KXR-03`, and it was not a preference — it was non-compliance with layer 2.

It is repaired **forward-only**, which is the same rule the register already runs on and for the same reason: the ten findings inherited from earlier reviews state neither severity nor reproduction anywhere, and inventing them would be the guessing this file exists to keep out. So every finding recorded from 2026-09-12 carries all five, a check refuses one that does not, and the ten that cannot are named below as exempt and incomplete.

**Exempt, and incomplete, and that is the finding rather than a footnote:** `KR-03`, `KR-06`, `KR-07`, `KR-09`, `KR-58`, `KP2-08`, `KP2-11`, `KP2-14`, `KP3-06`, `KP3-11`.

| id | severity | affected surface | reproduction | criterion or authority |
|---|---|---|---|---|
| XR-01 | moderate | `packages/gate-engine/src/gates.ts`, `packages/test-fixtures/src/candidates.ts` | Read `gateIds` against every `failingGates` array at `91409d0`: eight ids appear in none | `REVIEW_POLICY.md`; `ENFORCEMENT_BOUNDARIES.md` on the engine having no adapters |
| XR-02 | moderate | `docs/process/` as a whole | `ls docs/process/FINDINGS.md` at `91409d0`: absent. `PHASE_1_BACKLOG.md`: "no file in the repository holds its text" | `REVIEW_POLICY.md` line 19 |
| KXR-01 | moderate | `docs/process/FINDINGS.md` | `grep -rl "2026-09-12" docs/decisions/` returns nothing; the only files carrying that date are ones this lineage added | `REVIEW_POLICY.md` on governed identity; `OD-0006` |
| KXR-02 | major | `apps/mission-control/test/findings-register.test.ts` | Delete four rows including `XR-01`; suite green at 40 passed | `REVIEW_POLICY.md` line 19 |
| KXR-03 | moderate | `docs/process/FINDINGS.md` | Count the columns against the five `REVIEW_POLICY.md` names | `REVIEW_POLICY.md` line 19 |
| KXR-04 | minor | `docs/process/` | The brief requires a run record; no run record existed | The brief's "How you will know it works" |
| KXR-05 | minor | `docs/process/FOUNDATION_REPAIR_RUN_RECORD.md` | Actions run `34685933061` on `57d7829`: lint failed, typecheck and tests skipped | The brief's requirement that the record show what happened |
| KXR-06 | moderate | `apps/mission-control/test/findings-register.test.ts` | Change `KXR-03` from `open` to `repaired`, nothing else; suite green at 78 passed | `REVIEW_POLICY.md` line 19 |
| KXR-07 | moderate | the brief's permitted-paths contract | Two of five files in the diff are outside the list, authorised by prose the same sessions wrote | The brief's "Permitted paths"; `diff_within_permitted_paths` |
| KXR-08 | minor | `docs/process/FINDINGS.md` | `XR-01` and `XR-02` pointed at a document reading "Nothing in this document is authority" | `REVIEW_POLICY.md` on a finding's text having a home |
| KXR-09 | moderate | `apps/mission-control/test/findings-register.test.ts`, `docs/process/FINDINGS.md` | Flip all twenty detectors from `review` to `gate`; suite green at 91 passed. Rewrite a summary; green | `REVIEW_POLICY.md` line 19; the brief's requirement 3 |
| KXR-10 | moderate | `apps/mission-control/test/findings-register.test.ts` | Repoint twenty rows at `FINDINGS.md`; green. Point `XR-01` at a file naming only `KXR-01`; green | The brief's requirement 2; `KXR-08` as raised |
| KXR-11 | minor | `apps/mission-control/test/findings-register.test.ts`, `rowsOf` | Record a finding in a table headed anything but `id`; no check sees it | `REVIEW_POLICY.md` line 19 |
| KXR-12 | minor | `docs/process/FINDINGS.md` | Read "Adding a row" against what the check enforces | Accuracy of this file's own instructions |
| KXR-13 | moderate | `apps/mission-control/test/findings-register.test.ts`, `tablesOf` | Add a second table with the register's exact header; rows in it are read by nothing, suite green at 125 | `REVIEW_POLICY.md` line 19 |
| KXR-14 | moderate | `apps/mission-control/test/findings-register.test.ts`, `PINNED`; the attributes table | Downgrade `KXR-02` major to minor and erase its reproduction; suite green | `REVIEW_POLICY.md` line 19; `KXR-06` and `KXR-09` as raised |
| KXR-15 | major | `docs/process/RECORD_KEEPING_BRIEF.md`; `docs/process/FINDINGS.md` | Read the brief's opening against its "what gets built" four paragraphs later | `REPAIR_LIMITS.md`; `authority.json` `repairLimits.maxCyclesWithOwner` |
| KXR-16 | minor | `docs/process/FINDINGS.md` line 7 | Compare line 7 of the register at ec53d98 with line 7 of the candidate — byte-identical | accuracy of the register's own status column |
| KXR-17 | minor | `docs/process/FOUNDATION_REPAIR_RUN_RECORD.md` | `grep -n "Actions run"` over the record-keeping section — nothing | the brief's criterion 1, "in CI on the candidate SHA" |
| KXR-19 | moderate | `.claude/settings.json`; its two tests | The tests read `settings.permissions` and `settings.hooks` only; the new keys are in neither | `SA-G-03` |
| KXR-20 | moderate | `CLAUDE.md` | Read line 19 against the Superpowers section below it | `CLAUDE.md`'s own first hard limit |
| KXR-21 | minor | `CLAUDE.md`; `assets/licenses/` | `WebFetch` and `WebSearch` are denied and no licence record exists for the plugin | this repository's own licence-record practice |
| KXR-22 | moderate | `docs/process/`; the PR #11 description | `git log claude/keeper-review-b27cde14-ug7ffo` — a review dated before the commit that called its subject unreviewed | `XR-02`; `REVIEW_POLICY.md` line 19 |
| KXR-18 | major | `CLAUDE.md`; `.claude/settings.json` | Both files sit outside every `## Permitted paths` block and no contract governed the commit | `REVIEW_POLICY.md` on permitted paths; `SA-G-03` |
| KXR-23 | major | `turbo.json`; every commit message on the branch | Actions runs `34701315086`, `34699907586`, `34699728719` — `lint, typecheck, tests` failure on each | `REVIEW_POLICY.md`, deterministic verification completed for the SHA |
| KXR-24 | major | `apps/mission-control/test/findings-register.test.ts`, `PINNED` | Gut an attributes row — severity replaced, reproduction erased — and the suite stays green | `REVIEW_POLICY.md` line 19; `KXR-06`, `KXR-09`, `KXR-14` |
| KXR-25 | moderate | `docs/decisions/OD-0016-superpowers-and-the-decisions-of-2026-09-12.md` | Read §5 against `main` at the time of filing | Accuracy of an authority-layer-1 record |
| KXR-26 | moderate | `docs/process/FINDINGS.md`; `apps/mission-control/test/review-records.test.ts` | Nine findings were recorded from a review raising ten | `XR-02`; `REVIEW_POLICY.md` line 19 |
| KXR-27 | minor | `docs/process/FINDINGS.md` | Read `KXR-22`'s summary against what the pull request now says | Accuracy of the register's status column |
| KXR-28 | moderate | `docs/` — the document quoting the superseded line | Search for the old wording of the first hard limit outside `CLAUDE.md` | `CLAUDE.md` authority order; `OD-0016` §6 |
| KXR-29 | major | `turbo.json`; `docs/product/VIRGIL_MASTER_COMMISSION.md` | Change the commission and watch the test task replay a cached pass | `REVIEW_POLICY.md`, deterministic verification; `KXR-23` |
| KXR-30 | moderate | `docs/process/` | Search the candidate for `KXR-23` through `KXR-28` — absent | `XR-02`; `REVIEW_POLICY.md` line 19 |
| KXR-31 | minor | the pull request description for #14 | Read it against the verdict it claims to answer | `CLAUDE.md`: a builder's success report is not evidence |
| KXR-38 | moderate | `apps/mission-control/test/cache-inputs.test.ts` | Combine #12 and #14 and run the suite: `answer.txt` and `nothing.txt` are reported as undeclared inputs | `KXR-29`; `CLAUDE.md`: never skip, disable or weaken a test |
| KXR-43 | minor | `.claude/settings.json`; `packages/agent-contracts/test/permission-matrix.test.ts` | Search `.claude/settings.json` for `mission-control`: three allow rules for commands that no longer exist | `CLAUDE.md`, the shell-bypass hazard; the owner's instruction of 2026-09-13 |
| BR-01 | moderate | `docs/process/KNOWLEDGE_LESSONS_BRIEF.md` criterion 7; the mutation manifest as it stood at `a182b196` | Read criterion 7 against the brief's permitted paths; then read the manifest's `cwd: app` against the application's vitest config, which included `test/**` only | The brief's own permitted-paths contract; `REVIEW_POLICY.md` on a contract a candidate can satisfy |
| BR-02 | moderate | `docs/process/KNOWLEDGE_LESSONS_BRIEF.md` permitted paths | Add a page under `knowledge/wiki/lessons/` and run `pnpm test`: `seed-graph.test.ts` fails until a file outside the permitted paths is regenerated | The brief's criterion 1 against its permitted paths; `KXR-07` |
| BR-03 | minor | `docs/process/KNOWLEDGE_LESSONS_BRIEF.md`, three occurrences | Run `pnpm --filter @virgil/knowledge-lint run lint` with the brief's original placeholder in the tree: one blocking `lesson_link_unresolved` naming the brief | Accuracy of a document against the check it commissions |
| BR-04 | moderate | `CLAUDE.md` hard limits; `knowledge/SCHEMA.md` raw source records | Read `CLAUDE.md`'s "never edit or delete a raw source record" against `SCHEMA.md`'s "`ingestionState` advances by … updating that one field" | `CLAUDE.md` authority order; a session must report a contradiction, not resolve it |
| BR-05 | minor | `knowledge/raw/src-master-commission.source.md`; `.claude/settings.json` | `pnpm --filter @virgil/knowledge-lint run lint` reports it on every run; attempting the edit returns "File is in a directory that is denied by your permission settings" | `knowledge/SCHEMA.md` raw source records; `BR-04` |
| KXR-51/PR24 | minor | `docs/decisions/README.md`, the `Index:` table | The index table ends at `OD-0008`; `ls docs/decisions/` shows `OD-0009` through `OD-0018` filed and unindexed | `docs/decisions/README.md`'s own promise that the table is an index; `CLAUDE.md` authority order, which makes `docs/decisions/OD-*` layer 1 |
| KXR-44/PR26 | major | `packages/gate-engine/src/handoff.ts`, `roundsUsed`; `scripts/virgil-chain.ts`, `--facts` | Post three repair rounds as `--facts builder --round 0`: `roundsUsed` stays 0 and the chain authorises round 1 without bound | `docs/process/AUTOMATIC_HANDOFF_CHAIN.md` rule 5, that the ceiling is enforced by the counter and not by a paragraph |
| KXR-45/PR26 | major | `packages/gate-engine/src/handoff.ts`, `readChain`; `.claude/skills/raphael/SKILL.md`, "Reading the chain" | Feed the same four comments newest-first: `lastVerdict` goes null, `next=review` on every iteration, and it does not recover | `handoff.ts`'s own rule that every path which is not plainly carry on ends at the owner; the containment argument in rule 1 |
| KXR-46/PR26 | minor | `packages/repo-checks/test/handoff-chain.test.ts`, the unpushed-commit guard | Run `pnpm test` in a proxied container at `7e1f719`: `SELF_SIGNED_CERT_IN_CHAIN`, then `Test timed out in 60000ms`. It passes in CI in 1552ms | Nothing in the contract, and the review says so; it matters because the sessions this chain serves run in such containers |
| KXR-47/PR26 | minor | `scripts/virgil-chain.ts`; `packages/repo-checks/test/handoff-chain.test.ts` | Disable each of the four refusals in turn and run the file: `30 passed (30)` every time | `docs/process/AUTOMATIC_HANDOFF_CHAIN.md` line 121 and `.claude/agents/fabricator.md` line 82, which assert two of the four as behaviour |
| KXR-48/PR26 | minor | `packages/gate-engine/src/handoff.ts`, the facts marker | Post a comment carrying a typed facts marker and no facts: `facts=true`, `next=review`. A quoted `role=fixer` marker inflates the round count | `docs/process/AUTOMATIC_HANDOFF_CHAIN.md` rule 3, "Nothing proceeds without it" |
| KXR-49/PR26 | minor | `packages/repo-checks/test/handoff-chain.test.ts`, the guards on `.claude/agents/*.md` | Append a section to `fabricator.md` telling the builder to start the Keeper itself, leaving every asserted sentence intact: `30 passed (30)` | the test file's own header, that these are tests a written rule still has something holding it |
| KXR-50/PR26 | minor | `docs/process/AUTOMATIC_HANDOFF_CHAIN.md` line 27; `CLAUDE.md` as it stood before `OD-0018` | Read the diagram's "pushes, opens its own pull request" against `CLAUDE.md` on `main` at the time. `git log --merges` shows #24 at `84b7767` before #26 at `515373f` | `CLAUDE.md` authority order; `docs/decisions/OD-0018-builders-open-their-own-pull-requests.md` |
| KXR-47/PR27 | moderate | `docs/process/KNOWLEDGE_LESSONS_RUN_RECORD.md`, "Every check, and what it printed" | Check out `571b258a` and run the four commands in that block: 88 files not 313, 582 tests not 2,400, and two of the named packages absent from the base | the brief's closing instruction to paste what the command printed; `CLAUDE.md`, a builder's success report is not evidence |
| KXR-48/PR27 | moderate | `.github/workflows/checks.yml`; `tools/knowledge-lint/src/cli.ts` | Search `.github/workflows/checks.yml` at `571b258a` for `knowledge-lint`: no occurrence. The same holds on `main` today | `CLAUDE.md`'s "Commands" section, which tells every session to run it |
| KXR-49/PR27 | minor | `packages/knowledge-graph/src/lessons.ts`, `LESSON_LINK` | Put a lowercase doubled-square-bracket link to a lesson that does not exist inside a fenced code block in any scanned file and lint: one blocking `lesson_link_unresolved` | accuracy of a repository's own explanatory prose against the check it commissions; `BR-03` |
| KXR-50/PR27 | minor | `docs/process/FINDINGS.md`, the `BR-04` and `BR-05` attribute rows | Search `CLAUDE.md` for `ingestionState`: no occurrence, against `BR-04`'s stated reproduction. The lesson scan reports eight wiki pages where `BR-05` says ten | accuracy of the register's own reproduction column; `constitution/REVIEW_POLICY.md` on reproduction evidence |
| KXR-51/PR27 | moderate | `docs/process/KNOWLEDGE_LESSONS_RUN_RECORD.md` line 752, the mutant section's integrity seal | Take the SHA-256 of `packages/knowledge-graph/src/lessons.ts` at every commit that has held it: `53abda18…` throughout, never the `c1897d7c…` the seal names | the purpose of quoting a hash, which is that a reader can check it; `KXR-47/PR27`'s class |
| KXR-52/PR27 | minor | the pull request description for #27 | Read "The mutants carry those seven" in #27's description against the run record's corrected six of ten; the description is unchanged and #27 is closed | `CLAUDE.md`, a builder's success report is not evidence |
| KXR-53/PR28 | moderate | `packages/repo-checks/test/owner-voice.test.ts` | Append a `## Standing rules for every turn` section restoring the define-a-term rule, a three-column jargon table and a second comparison: `14 passed (14)` | the file's own stated purpose, that these rules are held by something other than the paragraph that states them |
| KXR-54/PR28 | moderate | pull request #28; `docs/process/AUTOMATIC_HANDOFF_CHAIN.md` rule 3 | Run the chain reader over #28's comments as they stood: `0 comments read`, `next=owner`, because nothing had been handed off on that pull request | `docs/process/AUTOMATIC_HANDOFF_CHAIN.md` rule 3, that nothing proceeds without a facts block for its own SHA |
| KXR-55/PR28 | moderate | `packages/repo-checks/test/handoff-chain.test.ts`, lines 94 to 113 | Append a section instructing `create_trigger` polling and `mcp__github__merge_pull_request` to the skill: `304 passed (304)` | the owner's instruction "I don't want Raphael on a timer"; `CLAUDE.md` on merging |
| KXR-56/PR28 | minor | `.claude/skills/raphael/SKILL.md`, "Startup: measure, every time", item 4 | Read item 4's "today that is the branch behind PR #1, not `main`, which holds only a README" against a `main` that has held far more for days | accuracy of a governed instruction the window follows every turn |
| KXR-60/PR28 | moderate | `packages/repo-checks/test/owner-voice.test.ts`, the class-guard block | Append a `### House rules for every turn` section restoring every defect: `25 passed (25)`. Or put the banned text in a second file under `.claude/skills/raphael/` and link it: also 25 passed | the file's own sentence that a class named is a class somebody thought of, and the next contradiction will be one nobody did |
| KXR-61/PR28 | moderate | the round-1 facts comment on #28; `scripts/virgil-chain.ts`, the `--ran` flag | Run `pnpm test --force` at `f9d803d` three times: 593 passed each time, against the 630 the facts block states | the script's own contract that `--ran` names a file of real command output; `CLAUDE.md`, a builder's success report is not evidence |
| KXR-62/PR28 | minor | `.claude/skills/raphael/SKILL.md`, "Startup: measure, every time", item 4 | `ls docs/decisions/proposed/` and `ls docs/process/PHASE_1_BRIEF.md` both report no such file, and item 4 names both | `KXR-56/PR28` as raised, and the sibling sweep that repair declined to do |
| KXR-63/PR28 | minor | `docs/process/ROADMAP.md`; `.claude/skills/raphael/SKILL.md`, startup step 7 | `git rev-list --count 515373f..origin/main` returned 0 while the plan's in-flight table still named a finished review and undercounted the rows owed | the section's own rule that every reply says how far behind the plan is |
| KXR-57/PR30 | moderate | `docs/process/KNOWLEDGE_LESSONS_RUN_RECORD.md`, the corrected "Every check, and what it printed" block | Run the four commands at `6dec9f6`: 92 files not 88, 630 tests not 582, graph hash `928fac21…` not `8d3a270a…`, with the block byte-identical to `9ed95d60` | the brief's instruction to paste what the command printed; `CLAUDE.md`, a builder's success report is not evidence |
| KXR-58/PR30 | minor | the pull request description for #30 | Search `docs/process/KNOWLEDGE_LESSONS_RUN_RECORD.md` for `KXR-51` and `KXR-52`: no occurrence, where the description sends a reader there for their reasons | `CLAUDE.md` authority order, which makes a pull-request description no authority over `docs/process/` |
| KXR-70/PR32 | high (major on this register's scale) | `packages/gate-engine/src/handoff.ts:210-218` at `8ba4452`; `scripts/virgil-chain.ts:57-93` and `:248-249`; `.claude/agents/keeper.md:110` | `--facts` always writes `sha=${head.slice(0, 7)}` and `--emit` passes `--sha` through unnormalised, so the two markers are 7 and 40 characters; the exact-string lookup misses and a reversed chain returns `next=review` | raised BLOCKING. A check a candidate adds must be able to fire on the chain the system emits; `docs/process/AUTOMATIC_HANDOFF_CHAIN.md` on a counter that refuses to decide when it can prove the order is wrong |
| KXR-71/PR32 | high (major on this register's scale) | `packages/gate-engine/src/handoff.ts:220-225` and the claim at `:192`; `docs/process/AUTOMATIC_HANDOFF_CHAIN.md`, "Position cannot be misdeclared"; the description for #32 | Post repair rounds as `--emit reviewer --verdict BLOCKED`, or push with a marker `readChain` cannot parse: ten rounds deep the chain still reports `roundsUsed=0/1` and authorises round 1 | raised BLOCKING. `KXR-44/PR26`, whose mechanism the tree claimed closed; `constitution/REPAIR_LIMITS.md` on the round cap |
| KXR-72/PR32 | medium (moderate on this register's scale) | pull request #32's comments as they stood at `8ba4452` | Run `pnpm chain -- --comments` over them: `handoffs recorded : 0`, `next=owner`, "nothing has been handed off on this pull request" | `.claude/agents/fabricator.md`, "Ending the hop: the facts block"; `docs/process/AUTOMATIC_HANDOFF_CHAIN.md` |
| KXR-73/PR32 | low (minor on this register's scale) | the pull request description for #32 | `built('builder', 0, 'aaa1111')` and `review('PASS', 0, 'aaa1111')` reversed give `ordered=false` and `next=owner`, against the description's "A two-comment chain reversed is undetectable" | accuracy of the sentence an owner would read to learn where the hole is; `CLAUDE.md`, a builder's success report is not evidence |
| KXR-74/PR32 | low (minor on this register's scale) | `packages/gate-engine/test/handoff.test.ts`, the assertion message "a falling round number is proof the order is wrong" — line 266 as reviewed, line 343 on `main` at `f2aa068` | `grep -n "a falling round number is proof the order is wrong" packages/gate-engine/test/handoff.test.ts`: one hit, on the case that proves the signal which replaced falling round numbers | accuracy of a test's own account of what it proves |
| KXR-80/PR32 | medium (moderate on this register's scale) | `packages/gate-engine/src/handoff.ts:150-155`; `packages/gate-engine/test/handoff.test.ts:393-396`; the description for #32 | Put two pushing markers with one-character shas in front of a reversed chain the guard catches: `ordered` goes `false` to `true` and `next` goes `owner` to `review`. Make `sameSha` true for any two non-empty strings and the whole `gate-engine` package still passes | the comment's own claim, which no test holds; `KXR-71/PR32`, the same shape of over-claim |
| KXR-81/PR32 | low (minor on this register's scale) | the round-1 facts comment on pull request #32 | `git diff --name-only 8ba4452..6e7c6b3` returns three files and not `.claude/skills/raphael/SKILL.md`, which that block names under "Governed paths touched" | `.claude/agents/fabricator.md` on what the facts block is for — it is what frames the review that follows it |
| KXR-82/PR32 | low (minor on this register's scale) | the pull request description for #32, its evidence section | Count `it(` in `git diff 8ba4452..6e7c6b3 -- packages/gate-engine/test/handoff.test.ts`: eight added and none removed, against the description's "Nine new cases" | `CLAUDE.md`, a builder's success report is not evidence; this is a claim about evidence |
| KXR-75/PR33 | major | `packages/repo-checks/test/review-records.test.ts`; the seven captures added by pull request #33 | At `d2c8188` replace `docs/process/KEEPER_PR28_REREVIEW.md` with the four ids it is cited for and run `pnpm test --force`: 792 passed, 0 failed. Or reword `KXR-44/PR26`'s heading inside `KEEPER_PR26_REVIEW.md` to say it was raised in error: 792 passed, 0 failed | `review-records.test.ts`'s own stated purpose, that a copy which can be quietly tidied is worse than a link because it looks like the original |
| KXR-76/PR33 | moderate | `docs/process/ROADMAP.md` line 33, the queued table | `sed -n '33p' docs/process/ROADMAP.md` at `88d5d5a` reads "thirteen findings owed a row … none filed", against the twenty-four rows in `docs/process/FINDINGS.md` at the same head | `CLAUDE.md` authority order, which makes `docs/process/` layer 4 and expects it to be true; the facts block's `--not-done` field |
| KXR-77/PR33 | minor | `docs/process/KEEPER_PR30_REVIEW.md` line 18 — a builder-authored header above the rule, not part of the verbatim review | `grep -n '^### .KXR-' docs/process/KEEPER_PR30_REVIEW.md` returns `KXR-57/PR30` and `KXR-58/PR30`; the header names `KXR-49/PR27`, which `KEEPER_PR27_REVIEW.md` raises | accuracy of a document about itself, in a repository whose recurring defect is exactly that |

## The reviews of 2026-09-13, filed together

**Seven independent reviews ran on 2026-09-13 across five pull requests and
raised twenty-four findings between them. Until this commit not one was filed.**
They existed only as comments on a website, which is `XR-02` at full size: the
register whose entire purpose is that nothing can be dropped was carrying none
of them.

**Why they waited, and it is not neglect.** Recording a finding is a repair, and
every one of these was raised by a reviewer, who may not perform one —
`CLAUDE.md`, *"Every role performs one hop."* Each of the seven reviews says so
in its own words, and several count the growing debt. They needed a session with
no stake in the answer, and this is it.

**And they could not be filed until the reviews were in the tree.** A row must
point at a file in this repository that names the finding as a whole id, and a
comment on a website is not one. So the reviews were captured first, verbatim,
as `docs/process/KEEPER_PR24_REVIEW.md`, `KEEPER_PR26_REVIEW.md`,
`KEEPER_PR27_REVIEW.md`, `KEEPER_PR27_REREVIEW.md`, `KEEPER_PR28_REVIEW.md`,
`KEEPER_PR28_REREVIEW.md` and `KEEPER_PR30_REVIEW.md`, each with a header naming
the pull request and the candidate SHA it judged.

**Twenty-four, counted rather than inherited.** One review of `138fa39d` on #24
raised one finding; one of `7e1f719e` on #26 raised seven; two on #27 raised four
and two; two on #28 raised four and four; one of `6dec9f6f` on #30 raised two.
The conductor said seventeen at one point and eighteen at another and was unsure
both times. Neither figure was used, and neither is right.

**The identities are qualified by document, and nothing already filed is
renumbered.** `constitution/REVIEW_POLICY.md` forbids renumbering a filed
finding, and the reviews minted ids that collide with each other and with ids
already on `main`. The owner's resolution of 2026-09-13 is to qualify by
document, and each review had already applied it to its own findings. They are
filed exactly as proposed. `KXR-43` is still the highest unqualified id and it
has not moved. `KXR-59` was never minted: the reviewer of `f9d803db` skipped from
`KXR-56` to `KXR-60` deliberately, to leave the reviewer of #30 room.

**Seven read `repaired` and seventeen read `open`, and the rule was the same
every time: a review's word, or a fact anyone can check from the tree, never
this session's judgement.** Four were repaired on #28 and its own second
reviewer replayed both attacks and confirmed the closures. One was repaired on
#27 and its second reviewer re-ran every command. One is repaired because the
`npx` spawn it names is gone from `handoff-chain.test.ts`. One is repaired
because the merge order it asked for is what `git log --merges` shows. Filing is
not repairing, and nothing here was repaired in order to be filed.

**What holds these seven documents. Nothing did, and now something does.**
`packages/repo-checks/test/review-records.test.ts` pins a review document to
the SHA-256 of the bytes it had at a named commit, so that a kept review cannot
be quietly tidied afterwards. **When these seven were captured they were in no
such pin**, and the paragraph that stood here said so plainly: *"the seven
captures added today are held by nothing but this paragraph and the diff."*

The reviewer of `88d5d5a` did not take that on trust. It cut
`KEEPER_PR28_REREVIEW.md` down to the bare ids it is cited for and every check
passed; it rewrote a finding inside `KEEPER_PR26_REVIEW.md` to say the problem
had been raised in error and every check passed. That is `KXR-75/PR33`, and it
is repaired below: all seven are pinned, together with the three captured on
2026-09-13 from the reviews of #32 and #33.

**The reason the check had required nothing of them is repaired too, and it was
the id pattern.** The completeness rule read `/^\| (KXR-\d+) \|/` — an
unqualified id followed by a cell boundary — so every qualified id filed under
the owner's resolution of 2026-09-13 was invisible to it. It now reads both
spellings. That is a decision rather than a tidy-up, and the reasoning is
written where the pattern is: a qualified id is a `KXR` finding, qualification
is how this register now mints them, and a completeness check blind to the
register's dominant identity shape counts the wrong set.

## The reviews of #32 and #33, filed after them

**Eleven more findings, from three reviews that ran on 2026-09-13 after the
twenty-four above were counted.** Two reviews of pull request #32 — the first
returning `BLOCKED` on `8ba4452`, the second `PASS_WITH_NON_BLOCKING_FINDINGS`
on `6e7c6b3` after the one repair round the first authorised — and one review of
pull request #33 on `88d5d5a`, which is the review that found the gap the
section above closes.

They are filed the same way and for the same reason: the reviews were captured
first, verbatim, as `docs/process/KEEPER_PR32_REVIEW.md`,
`KEEPER_PR32_REREVIEW.md` and `KEEPER_PR33_REVIEW.md`, because a row must point
at a file in this repository and a comment on a website is not one. **All three
are pinned**, so this batch never has the property the last one had.

**No substitution was needed in any of the three.** The two captures of
2026-09-13 that carried one — `KEEPER_PR27_REVIEW.md` and
`KEEPER_PR30_REVIEW.md` — rewrote doubled-square-bracket lesson links so the
knowledge scan would not read a quoted link as a made one, which is
`KXR-49/PR27` biting. None of these three comments contains such a link, so each
capture is its comment's bytes exactly.

**Three read `repaired` and eight read `open`, on the same rule as before: a
review's word, or a fact anyone can check from the tree, never this session's
judgement.** `KXR-70/PR32` and `KXR-71/PR32` were raised BLOCKING and the final
reviewer of #32 replayed both attacks against the repaired code and reported
both closed; that reviewer's word is what the status records. `KXR-75/PR33` and
`KXR-76/PR33` are repaired by the commit that files them, and the rule at the
top of this file applies to both: a repair on the same branch as its finding has
not been independently reviewed. Every `open` row was checked against the tree
at `f2aa068` rather than assumed — the sentence `KXR-80/PR32` names is still at
`handoff.ts:150-155`, the assertion message `KXR-74/PR32` names is still in
`handoff.test.ts`, and the two claims `KXR-73/PR32` and `KXR-82/PR32` name are
still in #32's description.

**`KXR-80/PR32` was deliberately not repaired.** It is a wrong sentence beside
correct code in `packages/gate-engine/src/handoff.ts`, which is outside the
paths this work may touch, and its own reviewer's instruction is that the right
time to correct it is the next time something touches that file.

**Two identity gaps, neither of them this session's to close.** The reviews jump
from `KXR-77` to `KXR-80`; `KXR-78` and `KXR-79` were never minted, as `KXR-59`
was not. And `KXR-39/PR20` through `KXR-46/PR20` are still owed: they are
referenced in two captures but `KEEPER_PR20_REVIEW.md` is in no part of this
tree, so a row for them would point at a document that names the id without
holding its text — the failure `KXR-08` exists to prevent.

**On severity words.** The two reviews of #32 graded on a high/medium/low scale
where every other review in this register used major/moderate/minor. Their words
are kept, and the equivalent on this register's scale is stated beside each and
labelled as such. Replacing one with the other silently would be this session
grading eight findings it did not raise.

## Adding a row

Three edits, and the check refuses anything less. `KXR-12` was this paragraph saying "two edits and nothing else" while the check enforced more than it listed — instructions that are wrong about their own guard teach the reader to distrust the guard.

1. **A row in the register table**, above.
2. **A row in the attributes table**, carrying all five of what `REVIEW_POLICY.md` requires. The four historical exemptions are named there and the list is closed; a new id is not exempt.
3. **An entry in `PINNED`** in `apps/mission-control/test/findings-register.test.ts`, pinning the row's status, its detector, its pointer and a digest of its summary.

What the check refuses, stated in full so this paragraph cannot drift from it again: a status or detector outside the vocabulary; a pointer that is not a file in this repository; a pointer that does not name the finding **as a whole id**, so a file mentioning only `KXR-01` does not satisfy `XR-01`; a pointer at this register itself, since every row trivially contains its own id; a row in a table the parser does not recognise; an id in the register that nothing pins; a pinned id missing from the register; any pinned cell that has changed; and a non-exempt finding with no attributes row.

The identity is governed — `REVIEW_POLICY.md` — so a session does not mint a prefix for itself. **`XR` and `KXR` were approved by the owner in the owner console on 2026-09-12, and no decision record is filed for either. This sentence is the only trace of that approval in the repository.**

**`BR` is different and the difference is the whole point.** It was minted on 2026-09-13 by the session that then used it, under the owner's instruction *"I take your recommendation as to the best way forward"*, and `docs/decisions/OD-0017` transcribes that instruction, names the prefix and the detector word as a session's choice rather than his, and says what a reader should do about it — overrule either by writing a different word on that page. A prefix minted under delegation is not a prefix minted by a session for itself, and the only thing keeping those two apart is a decision record the owner can read. That is the mechanism `OD-0006` describes, working as designed and no stronger than designed.

That is a weaker statement than the one that stood here before, which said simply that the prefix *"was approved by the owner"* — and a reviewer, who can read only the repository, correctly found nothing supporting it (`KXR-01`). The owner console is outside this repository, so its absence here proves the record is missing, not that the instruction was. `docs/decisions/OD-0006` describes the mechanism that would close the gap — the owner instructs, the instruction is transcribed verbatim, a session files the record — and states its own cost: *"the owner reading their own decision records is the only detection of a false one."* The owner was offered a filed record for today's decisions and chose the corrected sentence instead. So the gap is named here rather than papered over.
