# ADR-0004 — Contracts: Zod source of truth, JSON Schema export, Ajv cross-validation

Status: Accepted. Date: 2026-09-06. Deciders: owner (via OD-0001 dependency authority); authored by the Phase 0 session.

## Context
Section 9 requires machine-validatable schemas for at least twenty-five contracts, consumable by TypeScript packages and by non-TypeScript tools.

## Decision
Zod 4.5.4 schemas in `packages/agent-contracts` are the source of truth. `z.toJSONSchema` exports JSON Schema 2020-12 to `schemas/`. Ajv 8.20.0 with ajv-formats 3.0.1 compiles every exported schema in tests and validates the same fixtures Zod validates, proving the two agree.

## Consequences
Contract changes are code changes with tests; generated files are regenerated, never edited. Import attributes (`with { type: 'json' }`) load constitution data directly.

## Licences
zod MIT, ajv MIT, ajv-formats MIT.
