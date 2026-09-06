# ADR-0008 — Visual contracts as validated data with evidence-gated animation

Status: Accepted. Date: 2026-09-06. Deciders: owner (via OD-0001 dependency authority); authored by the Phase 0 session.

## Context
Amendment 1 requires a machine-readable animation contract and tests proving that animation cannot be triggered without event and evidence, that ambient life cannot impersonate work, and that key states remain distinct.

## Decision
`packages/visual-language/data/*.json` (tokens, epistemic contract, animation grammar, role performance) are validated against the contracts at import time. `animationFor(event)` is the only path to an authenticated animation and returns a refusal when evidence is missing. Rendering code receives forms and classes from data and never assigns epistemic meaning.

## Consequences
Art direction changes are data changes reviewed like code; the spikes demonstrate a refused tampered event.
