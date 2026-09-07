# ADR-0009 — Headless spike capture with Playwright and SwiftShader

Status: Accepted. Date: 2026-09-06. Deciders: owner (via OD-0001 dependency authority); authored by the Phase 0 session.

## Context
The execution environment has no GPU. Visual evidence is still required.

## Decision
@playwright/test 1.63.0 drives the pre-installed Chromium with ANGLE/SwiftShader to capture defined steps and camera poses into `docs/art-direction/spikes`. The capture report records the renderer string and page errors. The captures are structural and data-contract evidence, explicitly not an art judgment, per Amendment 1's `BLOCKED_PENDING_REAL_GPU_REVIEW` rule.

## Licences
@playwright/test Apache-2.0.
