# OD-0003 — Additional repair round on the consolidation candidate (Tier 3)

Status: **owner decision, transcribed; proposal path pending the owner's move.** Issued by the owner in writing on 2026-09-07 in reply to the builder's report of the independent Keeper review of candidate `956be26064171f53022f92fc4429770bb727eaa5` (pull request #1). The owner's message is the source: "authorise the repair round as proposed". This file transcribes the proposal the owner authorised. It gains authority when the owner moves it to `docs/decisions/`; the same policy and tooling limits apply as for OD-0002.

## Question

The consolidation lineage had used its one bounded repair (the foundation repair) and its one re-review (the Keeper review of `956be26`, verdict BLOCKED with proven defects KR-01 and KR-02). Under `constitution/REPAIR_LIMITS.md` a further round needs an owner decision of kind `additional_repair_round`. Is one authorised, and with what scope?

## Decision

One additional bounded repair round is authorised on the same consolidation branch, producing a new candidate SHA.

In scope, each with regression tests:

- KR-01: bind file, staging and commit events to the actor's own grant, role, registration and expiry; track every writing or committing session as a builder.
- KR-02: the reducer fails closed on any authority tag it does not know and parses every event with the contract before reduction.
- KR-04: a `merge` decision names the SHA it applies to.
- KR-05: remove the wildcard `pnpm --filter *` allow rule; strengthen the settings test beyond string presence.

Recorded as accepted design gaps in `docs/architecture/ENFORCEMENT_BOUNDARIES.md`, not repaired in this round: KR-03 (a governed required-check list is an owner-controlled file change), KR-06, KR-07, KR-09.

## Consequences

- The new SHA requires fresh deterministic verification and a fresh independent Keeper review before the owner merges; the previous review's verdict does not transfer.
- This is the second and last repair cycle permitted with owner authority (`repairLimits.maxCyclesWithOwner = 2`). A further BLOCKED verdict stops the lineage in `OWNER_DECISION_REQUIRED`.

Applies to: `packages/domain/`, `packages/agent-contracts/`, `.claude/settings.json`, `docs/architecture/ENFORCEMENT_BOUNDARIES.md`, `docs/process/CONSOLIDATION_RUN_RECORD.md`.

Decided at: 2026-09-07 (owner's written instruction). Transcribed by the consolidation session on the same date.
