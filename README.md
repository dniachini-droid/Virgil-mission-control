# Virgil Mission Control

A graphical command centre for governed agentic software development.

Virgil supervises autonomous coding agents across independent repositories through two connected real-time 3D worlds: the **Orbital Foundry**, where scoped work becomes sealed candidate artifacts that move between bounded specialist workers, and **The Mind of Virgil**, where immutable sources compile into provenance-tethered durable knowledge. Every consequential thing shown in the world corresponds to a typed event backed by inspectable evidence. The owner alone merges.

The governing product authority is `docs/product/VIRGIL_MASTER_COMMISSION.md`. Session rules are in `CLAUDE.md`. Governance authority is in `constitution/`.

## Status

Phase 0 (foundation and governed design), the foundation repairs required by the independent Keeper review, and the owner's approved visual direction are consolidated on one branch for a single owner-reviewed pull request (`docs/process/CONSOLIDATION_RUN_RECORD.md`). The repaired authority system awaits fresh independent review and owner acceptance (`docs/architecture/ENFORCEMENT_BOUNDARIES.md`). The owner rejected the Phase 0 spikes and the Phase 0.5 runtime rebuild as an art baseline; the approved direction is the hybrid visual reference and four character sheets under `docs/art-direction/approved/` and `assets/`, with one unrigged Virgil model candidate. No orchestrator, agent launching, repository integration, production interface or production-ready runtime asset exists yet. The application still contains the two Phase 0 spikes as data-contract proofs only (`docs/art-direction/SPIKES.md`).

## Getting started

Requires Node 22 or later and pnpm 10.

```sh
pnpm install
pnpm check
pnpm --filter mission-control dev
```

Open `/spike/foundry` and `/spike/mind` in the running app. They prove the event, evidence and animation contracts; their look is not the approved art direction (see `docs/art-direction/approved/README.md`).

## Layout

See the repository map in `CLAUDE.md` and `docs/architecture/REPOSITORY_ARCHITECTURE.md`.
