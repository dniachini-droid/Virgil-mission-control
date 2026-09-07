# ADR-0001 — Monorepo tooling: pnpm, Turborepo, TypeScript 7, Biome, Vitest

Status: Accepted. Date: 2026-09-06. Deciders: owner (via OD-0001 dependency authority); authored by the Phase 0 session.

## Context
The workspace holds one app and six packages that share contracts and fixtures. The owner authorised the free open-source dependencies from the Phase 0 plan and required compatibility evidence for the recent majors.

## Decision
pnpm 10.33.0 workspaces with Turborepo 2.10.12 for the task graph; TypeScript 7.0.2 with strict settings (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`); Biome 2.5.12 for lint and format; Vitest 5.0.0 for unit tests; tsx 4.23.13 for scripts. Node 22 LTS (`.nvmrc`).

## Evidence
A compatibility probe (TypeScript 7 `tsc` over JSON imports with attributes and `satisfies`, Vitest 5 executing it) passed before any code was written. Every package typechecks and tests under this stack; the documented fallbacks (TypeScript 6.x, Vitest 4.1) were not needed.

## Alternatives
ESLint 10 plus Prettier (two tools, slower); npm workspaces without a task graph (no caching); TypeScript 6.x (superseded).

## Licences
pnpm MIT, turbo MIT, typescript Apache-2.0, @biomejs/biome MIT OR Apache-2.0, vitest MIT, tsx MIT, @types/node MIT.

## Revisit
If TypeScript 7 rejects a needed compiler option or Vitest 5 regresses, downgrade per package and record it here.
