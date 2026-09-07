# ADR-0010 — Labels as canvas textures instead of SDF text

Status: Accepted. Date: 2026-09-06. Deciders: owner (via OD-0001 dependency authority); authored by the Phase 0 session.

## Context
drei's Text (troika) fetches a default font from the network; the sandbox and offline use forbid it, and labels are evidence that must always render.

## Decision
Labels are rendered to 2D canvases and used as sprite textures with a monospace system font stack. Deterministic, offline, crisp at label sizes.

## Consequences
Very long labels cost texture memory; the Evidence View carries full values. Revisit with bundled SDF fonts in Phase 1 if label density grows.
