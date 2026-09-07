---
nodeId: knowledge-layer
kind: architecture_concept
title: "The knowledge layer"
epistemicClass: durable_compiled_knowledge
authorityClass: compiled
status: current
compiledAt: 2026-09-06T16:10:00+00:00
lastVerifiedAt: 2026-09-06T16:10:00+00:00
compiledBy: knowledge-maintenance/1.0.0
sources:
  - { kind: raw_source, ref: src-master-commission }
  - { kind: code_path, ref: knowledge/SCHEMA.md }
  - { kind: code_path, ref: docs/architecture/KNOWLEDGE_ONTOLOGY.md }
claims:
  - id: C-know-three-dirs
    statement: "The knowledge layer is raw (owner-curated, immutable), wiki (agent-maintained, interlinked) and outputs (generated, never authority), governed by SCHEMA.md."
    sources: [src-master-commission, knowledge/SCHEMA.md]
  - id: C-know-anti-drift
    statement: "Live operational values such as current HEAD, SHAs, PR status, check results, agent status and gate eligibility are never written into the wiki; they are read from the live authority at display time."
    sources: [src-master-commission, knowledge/SCHEMA.md]
  - id: C-know-graph-reproducible
    statement: "The provenance graph is derived reproducibly from files, metadata and explicit events and is never an opaque second store."
    sources: [src-master-commission, docs/architecture/KNOWLEDGE_ONTOLOGY.md, packages/knowledge-graph/src/derive.ts]
related: [two-worlds, system-boundaries, glossary]
---

# The knowledge layer

An adaptation of the LLM wiki pattern to governed development. Raw sources are records with canonical paths and hashes; the wiki holds pages with frontmatter claims and provenance tethers; outputs are derived. Five operations exist: ingest, query, compile, lint and propose (`.claude/skills/knowledge-maintenance`). Mind Scan (`docs/architecture/MIND_SCAN.md`) reports contradictions, stale material, orphans, broken tethers, repeated concepts, unsupported claims, echo chambers, copied live state and pending proposals. The user-facing form of this layer is the Mind of Virgil ([[two-worlds]]).
