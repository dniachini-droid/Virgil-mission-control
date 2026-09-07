# ADR-0006 — Event store engine deferred to Phase 2

Status: Proposed. Date: 2026-09-06. Deciders: owner (via OD-0001 dependency authority); authored by the Phase 0 session.

## Context
Phase 0 uses in-memory fixture logs. A persistent store is needed when real repositories are observed.

## Decision (deferred)
Choose in Phase 2 between SQLite (better-sqlite3) with an append-only events table and JSON Lines files per run. Requirements fixed now: monotonic `seq` per stream, immutability after append, compaction of replayable-operational events recorded as an event, export to JSON Lines for replay fixtures.

## Revisit
Phase 2 planning.
