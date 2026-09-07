---
nodeId: system-boundaries
kind: architecture_concept
title: "System boundaries"
epistemicClass: durable_compiled_knowledge
authorityClass: compiled
status: current
compiledAt: 2026-09-06T16:10:00+00:00
lastVerifiedAt: 2026-09-06T16:10:00+00:00
compiledBy: knowledge-maintenance/1.0.0
sources:
  - { kind: raw_source, ref: src-master-commission }
  - { kind: code_path, ref: docs/architecture/SYSTEM_ARCHITECTURE.md }
  - { kind: code_path, ref: docs/architecture/EVENT_MODEL.md }
claims:
  - id: C-arch-eleven-boundaries
    statement: "The architecture separates presentation, orchestration, the gate engine, repository adapters, agent runtime adapters, the event store, the read model, the knowledge layer, the knowledge compiler and provenance graph, the world projection layer, and the secrets boundary."
    sources: [src-master-commission, docs/architecture/SYSTEM_ARCHITECTURE.md]
  - id: C-arch-events-are-facts
    statement: "The event log stores facts and derived status is rebuilt from them; replay can reconstruct state at any event."
    sources: [docs/architecture/EVENT_MODEL.md, packages/domain/src/replay.ts]
  - id: C-arch-durability
    statement: "Events are classed durable audit or replayable operational; ephemeral telemetry is never appended and never drives an authenticated animation."
    sources: [src-od-0001, docs/architecture/EVENT_MODEL.md]
related: [governance-overview, two-worlds, knowledge-layer]
---

# System boundaries

Eleven boundaries, each with a single responsibility and no power to create authority (`docs/architecture/SYSTEM_ARCHITECTURE.md`). Operational truth lives in Git, GitHub and the event store; derived status in the read model; durable knowledge here in [[knowledge-layer]]; presentation state in the client. The projection layer maps read-model and graph state to the two worlds ([[two-worlds]]) deterministically. Phase 0 delivers executable cores for the domain, the gate engine, the knowledge graph and the visual language; orchestration, adapters and the compiler are deferred by phase.
