# OD-0004 — Disposition of the non-blocking Keeper findings, and the merge of pull request #1 (Tier 3)

Status: **Accepted.** Issued by the owner in the owner console on 2026-09-07, after the independent Keeper review of candidate `3b9a964e7de4c53560fd3128090cdba39b005c6c` returned `PASS_WITH_NON_BLOCKING_FINDINGS` (a comment on pull request #1 headed "Keeper review — candidate `3b9a964e...` (second repair round)"). The owner's words are the source; this file transcribes them and decides nothing itself. The owner accepted it on 2026-09-07 by instruction in the owner console, and this session filed it here on that instruction under the mechanism recorded in `OD-0006-recording-owner-decisions.md`, which holds the owner's verbatim words. It carries authority (layer 1) from that acceptance. Only this status line changed on filing; the decision text is unaltered.

## Question

The second repair round resolved KR-01, KR-02, KR-04 and KR-05. The review confirmed that KR-03, KR-06, KR-07 and KR-09 remain open and are honestly recorded as accepted design gaps in `docs/architecture/ENFORCEMENT_BOUNDARIES.md`. Two of those gaps needed an owner disposition before the consolidation could be merged: KR-03, whose remedy is a change to an owner-controlled file, and KR-07, which asks whether the owner may delegate write authority over a protected boundary at all. The repository held no record of either disposition, nor of the merge taken on that verdict.

## Decision

**KR-03 — the required-check set is declared by the verifying session and anchored to nothing owner-controlled: not repaired now.** Anchoring that list in an owner-controlled file becomes the first item of Phase 1. The owner considered and rejected both alternatives: repairing it before the merge, and accepting it permanently. Until the anchor exists, the controls named in `ENFORCEMENT_BOUNDARIES.md` stand — the plan's `requiredChecks` and the Keeper's `verification incomplete` stop condition.

**KR-07 — an owner grant may confer write authority over a protected boundary: the exemption is kept.** It is the owner's authority to lend. Phase 1 amends the wording of invariant 3 in `constitution/AUTHORITY_TIERS.md` so that the document matches the code, rather than changing the code to match the document. No session makes that amendment on the strength of this transcription; it is Phase 1 work under the owner's hand.

**Pull request #1 is merged.** On that verdict the owner merged the Phase 0 consolidation into `main` as merge commit `cd0981d`. The reviewed candidate `3b9a964e7de4c53560fd3128090cdba39b005c6c` is an ancestor of `main`.

## Consequences

- KR-03 and KR-07 are carried into `docs/process/PHASE_1_BRIEF.md` as the first two Phase 1 entries, KR-03 first. KR-06 and KR-09 remain recorded as accepted gaps in `ENFORCEMENT_BOUNDARIES.md`.
- The exemption named by KR-07 stays in the code as it is. The divergence between invariant 3 and the code is a known, recorded discrepancy until the Phase 1 amendment closes it; no session may resolve it by editing `constitution/`.
- Phase 1 does not begin until the owner moves OD-0002, OD-0003 and this record into `docs/decisions/`. Nothing here is ratified by its transcription.
- The merge closes the consolidation lineage. Further work on these gaps is fresh work on a new branch from `main`, not a continuation of the merged pull request.

Applies to: `docs/architecture/ENFORCEMENT_BOUNDARIES.md`, `docs/process/PHASE_1_BRIEF.md`, `docs/process/CONSOLIDATION_RUN_RECORD.md`, `CLAUDE.md`, and — as Phase 1 work only — `constitution/AUTHORITY_TIERS.md`.

Decided at: 2026-09-07 (owner's decisions in the owner console). Transcribed by the post-merge record session on the same date.
