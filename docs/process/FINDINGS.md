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
| XR-01 | repaired | review | Twenty gates existed and eight had never been observed refusing anything, so a passing suite could not distinguish a working gate from one that cannot fire | docs/process/GATE_PROOF_AND_FINDINGS_BRIEF.md |
| XR-02 | repaired | review | Findings had no single home, so `REVIEW_POLICY.md`'s rule that they are never dropped could not be checked | docs/process/GATE_PROOF_AND_FINDINGS_BRIEF.md |
| KXR-01 | repaired | review | The register asserted an owner approval that no file in the repository supported; the sentence now says where the approval came from and that no record is filed | docs/process/FOUNDATION_REPAIR_RUN_RECORD.md |
| KXR-02 | repaired | review | Rows could be deleted from the register in silence — four were removed, including both findings this branch raised, and the suite stayed green | docs/process/FOUNDATION_REPAIR_RUN_RECORD.md |
| KXR-03 | open | review | The register carries two of the five attributes `REVIEW_POLICY.md` requires of a finding: severity, affected surface and reproduction evidence are absent | docs/process/FOUNDATION_REPAIR_RUN_RECORD.md |
| KXR-04 | repaired | review | The red-before-green proofs lived only in commit messages, where the brief asked for a run record | docs/process/FOUNDATION_REPAIR_RUN_RECORD.md |
| KXR-05 | repaired | review | The record did not say that CI was red at the intermediate commit 57d7829 | docs/process/FOUNDATION_REPAIR_RUN_RECORD.md |

## Adding a row

Add it to the table **and to `PINNED`** in `apps/mission-control/test/findings-register.test.ts`, and nothing else. Two places on purpose: a row held in only one of them can be deleted without anything noticing, which is `KXR-02`. The pointer must be a file that exists and that names the finding's id, or the suite fails.

The identity is governed — `REVIEW_POLICY.md` — so a session does not mint a prefix for itself. **`XR` and `KXR` were approved by the owner in the owner console on 2026-09-12, and no decision record is filed for either. This sentence is the only trace of that approval in the repository.**

That is a weaker statement than the one that stood here before, which said simply that the prefix *"was approved by the owner"* — and a reviewer, who can read only the repository, correctly found nothing supporting it (`KXR-01`). The owner console is outside this repository, so its absence here proves the record is missing, not that the instruction was. `docs/decisions/OD-0006` describes the mechanism that would close the gap — the owner instructs, the instruction is transcribed verbatim, a session files the record — and states its own cost: *"the owner reading their own decision records is the only detection of a false one."* The owner was offered a filed record for today's decisions and chose the corrected sentence instead. So the gap is named here rather than papered over.
