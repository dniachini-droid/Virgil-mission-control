# Virgil Mission Control

A graphical command centre for governed agentic software development.

Virgil supervises autonomous coding agents across independent repositories through two connected real-time 3D worlds: the **Orbital Foundry**, where scoped work becomes sealed candidate artifacts that move between bounded specialist workers, and **The Mind of Virgil**, where immutable sources compile into provenance-tethered durable knowledge. Every consequential thing shown in the world corresponds to a typed event backed by inspectable evidence. The owner alone merges.

The governing product authority is `docs/product/VIRGIL_MASTER_COMMISSION.md`. Session rules are in `CLAUDE.md`. Governance authority is in `constitution/`.

## Status

Phase 0, foundation and governed design, is in progress. No orchestrator, agent launching, repository integration or production interface exists yet. The application contains two art-direction and data-contract spikes only.

## Getting started

Requires Node 22 or later and pnpm 10.

```sh
pnpm install
pnpm check
pnpm --filter mission-control dev
```

Open `/spike/foundry` and `/spike/mind` in the running app. Software rendering in a container is not a valid basis for judging the art bar; view the spikes on a machine with a GPU.

## Layout

See the repository map in `CLAUDE.md` and `docs/architecture/REPOSITORY_ARCHITECTURE.md`.
