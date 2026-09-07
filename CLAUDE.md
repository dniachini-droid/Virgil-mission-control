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

Phase 0 (foundation and governed design), the Keeper-required foundation repairs (K-01, K-02, K-03, K-15) and the owner's approved visual direction are consolidated on one branch for a single owner-reviewed pull request into `main` (`docs/process/CONSOLIDATION_RUN_RECORD.md`). The repaired authority system is pending fresh independent review and owner acceptance (`docs/architecture/ENFORCEMENT_BOUNDARIES.md`). The Phase 0 spikes and the Phase 0.5 runtime rebuild are rejected as an art baseline; the approved direction is the hybrid reference under `docs/art-direction/approved/`, recorded as the owner's decision in `docs/decisions/proposed/OD-0002-art-direction-checkpoint.md` until the owner moves it to `docs/decisions/`. Phase 1 does not begin until that decision is accepted and the repair is accepted. No procedural visual rebuild starts before then. See `docs/process/PHASE_0_RUN_RECORD.md` and `PHASE_0_TRACEABILITY.md`.
