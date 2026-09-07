# Virgil Mission Control — session rules

Read this file before any change. It applies to every Claude Code session and subagent in this repository.

## Authority order

When documents conflict, the higher one governs:

1. `docs/product/VIRGIL_MASTER_COMMISSION.md` (including its amendments register) and owner decisions in `docs/decisions/OD-*.md`.
2. `constitution/` (VIRGIL_CONSTITUTION, AUTHORITY_TIERS, REVIEW_POLICY, REPAIR_LIMITS, STATE_LANGUAGE) and `constitution/authority.json`.
3. Accepted ADRs in `docs/decisions/ADR-*.md`.
4. `docs/architecture/`, `docs/art-direction/`, `docs/security/`, `docs/testing/`, `docs/process/`.
5. `knowledge/wiki/` explains; it never overrides the layers above and never holds live operational values.

Only the owner may change layers 1 and 2. A session that finds a contradiction reports it; it does not resolve it silently.

## Hard limits for every session

- Work only inside this repository. Never read, clone or modify any other repository.
- Commit only to the branch assigned to the session. Never touch `main`. Never open a pull request, merge, deploy, or connect credentials unless the owner explicitly authorised it in writing for that session.
- No paid services, subscriptions or commercial assets.
- Never write secrets, tokens or credential material into files, logs, fixtures or the interface.
- Never copy live operational values (HEAD, SHAs, PR status, check results, agent status, gate eligibility) into `knowledge/wiki/`. Link to the authority instead.
- `knowledge/raw/` is append-only. Never edit or delete a raw source record.
- Never skip, disable or weaken a test to make a check pass.
- Every role performs one hop. A session assigned one role does not perform the next role's work.
- A builder's success report is not evidence. Deterministic checks and independent review are.

## Repository map

- `apps/mission-control/` — the web application and both 3D worlds (Phase 0: two spikes only).
- `packages/domain/` — states, events, transition table, reducer, replay.
- `packages/gate-engine/` — deterministic eligibility and integrity checks over evidence objects.
- `packages/agent-contracts/` — Zod schemas for every structured contract; exported to `schemas/`.
- `packages/visual-language/` — epistemic visual contract, operational animation grammar, role performance data, tokens.
- `packages/knowledge-graph/` — ontology, derivation of the provenance graph from files and events.
- `packages/test-fixtures/` — defective candidates, event logs, knowledge scan cases.
- `constitution/` — governance authority. `.claude/agents/` — versioned role definitions.
- `knowledge/` — raw sources, wiki, outputs, SCHEMA, index, log.
- `docs/` — product, architecture, art direction, process, security, decisions, testing. `docs/art-direction/approved/` — the owner-approved visual references and the bundle they arrived in.
- `assets/` — concept sheets (`concepts/`), candidate 3D models (`models/candidates/`), licence and provenance records (`licenses/`). No production-ready runtime asset exists; `assets/README.md` states the status of every file.

## Commands

```sh
pnpm install          # uses the committed lockfile
pnpm check            # biome lint, typecheck, unit tests across the workspace
pnpm --filter @virgil/agent-contracts export-schemas   # regenerate schemas/*.schema.json
pnpm --filter @virgil/knowledge-lint run lint           # Mind Scan over knowledge/
pnpm --filter @virgil/knowledge-graph export-seed-graph # regenerate the committed seed graph (a test fails when stale)
pnpm --filter mission-control dev                       # spikes at /spike/foundry and /spike/mind (rejected as an art baseline)
```

## Phase status

Phase 0 (foundation and governed design), the Keeper-required foundation repairs (K-01, K-02, K-03, K-15) and the owner's approved visual direction were consolidated on one branch and merged into `main` by the owner as merge commit `cd0981d` (pull request #1; `docs/process/CONSOLIDATION_RUN_RECORD.md`). The repaired authority system passed fresh independent review: the Keeper's review of candidate `3b9a964e7de4c53560fd3128090cdba39b005c6c` returned `PASS_WITH_NON_BLOCKING_FINDINGS`, resolving KR-01, KR-02, KR-04 and KR-05. Four accepted gaps remain open and honestly recorded — KR-03, KR-06, KR-07 and KR-09 (`docs/architecture/ENFORCEMENT_BOUNDARIES.md`) — and are carried as Phase 1 entries; KR-03 and KR-07 are the first two (`docs/process/PHASE_1_BRIEF.md`), under the owner's disposition in `docs/decisions/OD-0004-non-blocking-findings-disposition.md`. The Phase 0 spikes and the Phase 0.5 runtime rebuild are rejected as an art baseline; the approved direction is the hybrid reference under `docs/art-direction/approved/`, recorded as the owner's decision in `docs/decisions/OD-0002-art-direction-checkpoint.md`.

All five decisions that had been stranded as proposals — OD-0002, OD-0003, OD-0004, OD-0005 and OD-0006 — are filed in `docs/decisions/` and carry authority layer 1. The owner accepted them on 2026-09-07 by instruction in the owner console. OD-0006 records that mechanism and replaces the old one: the owner instructs in the owner console, the instruction is transcribed verbatim, a session files the record. The owner's own commit `9627bae` removed the two `docs/decisions/OD-*` deny lines that had made filing impossible by any session; the two `constitution/**` deny lines were deliberately left in place, and `constitution/` remains out of bounds. OD-0006 states plainly what that mechanism costs: no code enforces the verbatim quote or the single channel, and the owner reading their own decision records is the only detection of a false one.

The condition this section previously carried — that Phase 1 waits on the owner moving OD-0002, OD-0003 and OD-0004 — is therefore discharged, as is the graphics-hardware contradiction (OD-0005 defers the two checks and requires them recorded as not performed, never as met). **Phase 1 still does not begin**, because the brief's own prerequisites are not all met. Outstanding: whether optional sound motifs are in or out of the slice, and the Phase 1 branch name (`docs/process/PHASE_1_BRIEF.md`, "Owner decisions required before start", items 3 and 4); the owner's confirmation of the commission integrity diff using the recorded command (`docs/process/PHASE_0_RUN_RECORD.md`, open decision 4); and the acceptance the brief opens by requiring — the owner accepting the Phase 0 run record — for which this repository holds no record. The Phase 0 verdict `BLOCKED_PENDING_REAL_GPU_REVIEW` stands as written. No procedural visual rebuild starts before those are settled. See `docs/process/PHASE_0_RUN_RECORD.md` and `PHASE_0_TRACEABILITY.md`.
