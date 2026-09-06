# ADR-0005 — Event-sourced domain with a data-driven state machine

Status: Accepted. Date: 2026-09-06. Deciders: owner (via OD-0001 dependency authority); authored by the Phase 0 session.

## Context
Section 6 requires an append-only event log from which derived status can be rebuilt, timeline replay, and a repair limit encoded in authority and transitions.

## Decision
`constitution/authority.json` holds the fifteen states, the transition table with named guards, and the repair limits. `packages/domain` loads it at runtime, implements the guards, folds events into a read model, and offers `replay`, `replayTo` and `replayFrames`. Events carry a durability class (durable audit, replayable operational); telemetry is a separate non-event type.

## Consequences
Changing a transition is a constitution change (owner decision). Invalid transitions are recorded, never silently applied. Tests replay five fixture runs.

## Alternatives
Hard-coded transitions in code (authority hidden from the owner); a workflow engine dependency (unneeded weight, opaque authority).
