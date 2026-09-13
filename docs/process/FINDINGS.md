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

**Found by** — one of `gate`, `review`, `owner`.

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
| KXR-38 | repaired | gate | A guard read `resolve(root, …)` as a repository read where `root` is a scratch directory, and named two temporary files as undeclared cache inputs | docs/process/SLICE_SIX_INTEGRATION_RECORD.md |
| KXR-43 | open | owner | Three permission entries allow commands deleted with the application; a session is refused the edit by two independent mechanisms | docs/process/OWNER_TODO.md |

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

## Adding a row

Three edits, and the check refuses anything less. `KXR-12` was this paragraph saying "two edits and nothing else" while the check enforced more than it listed — instructions that are wrong about their own guard teach the reader to distrust the guard.

1. **A row in the register table**, above.
2. **A row in the attributes table**, carrying all five of what `REVIEW_POLICY.md` requires. The four historical exemptions are named there and the list is closed; a new id is not exempt.
3. **An entry in `PINNED`** in `apps/mission-control/test/findings-register.test.ts`, pinning the row's status, its detector, its pointer and a digest of its summary.

What the check refuses, stated in full so this paragraph cannot drift from it again: a status or detector outside the vocabulary; a pointer that is not a file in this repository; a pointer that does not name the finding **as a whole id**, so a file mentioning only `KXR-01` does not satisfy `XR-01`; a pointer at this register itself, since every row trivially contains its own id; a row in a table the parser does not recognise; an id in the register that nothing pins; a pinned id missing from the register; any pinned cell that has changed; and a non-exempt finding with no attributes row.

The identity is governed — `REVIEW_POLICY.md` — so a session does not mint a prefix for itself. **`XR` and `KXR` were approved by the owner in the owner console on 2026-09-12, and no decision record is filed for either. This sentence is the only trace of that approval in the repository.**

That is a weaker statement than the one that stood here before, which said simply that the prefix *"was approved by the owner"* — and a reviewer, who can read only the repository, correctly found nothing supporting it (`KXR-01`). The owner console is outside this repository, so its absence here proves the record is missing, not that the instruction was. `docs/decisions/OD-0006` describes the mechanism that would close the gap — the owner instructs, the instruction is transcribed verbatim, a session files the record — and states its own cost: *"the owner reading their own decision records is the only detection of a false one."* The owner was offered a filed record for today's decisions and chose the corrected sentence instead. So the gap is named here rather than papered over.
