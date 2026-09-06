---
nodeId: two-worlds
kind: architecture_concept
title: "The two worlds and the Mind gateway"
epistemicClass: durable_compiled_knowledge
authorityClass: compiled
status: current
compiledAt: 2026-09-06T16:10:00+00:00
lastVerifiedAt: 2026-09-06T16:10:00+00:00
compiledBy: knowledge-maintenance/1.0.0
sources:
  - { kind: raw_source, ref: src-master-commission }
  - { kind: raw_source, ref: src-od-0001 }
claims:
  - id: C-worlds-coequal
    statement: "The Orbital Foundry shows operational truth and the Mind of Virgil shows knowledge truth; they are co-equal navigable 3D environments, neither reducible to a dashboard or sidebar."
    sources: [src-master-commission, src-od-0001]
  - id: C-worlds-gateway-sequence
    statement: "A verified run enters the Mind only through the gateway sequence: run artifact arrives, raw source record is created and hashed, source is read non-destructively, compilation is proposed, claims and provenance are checked, contradictions remain visible, required verification or owner approval occurs, and only then a durable node is created."
    sources: [src-od-0001, event:run_record_deposited, event:knowledge_compilation_approved]
  - id: C-worlds-no-private-thoughts
    statement: "The Mind of Virgil visualises documented knowledge operations and never claims to show a model's private reasoning or consciousness."
    sources: [src-master-commission]
related: [system-boundaries, knowledge-layer, epistemic-visual-language]
---

# The two worlds

The Orbital Foundry renders repositories, agents, worktrees, artifacts, handoffs, verification, review, quarantine, merge gates and deployment from the read model. The Mind of Virgil renders immutable sources (Archive Nebula), compilation (Synaptic Forge) and durable knowledge (Living Knowledge Galaxy) from the provenance graph. The gateway between them is causal, not decorative: nothing crosses without a typed event, and no worker report becomes knowledge because it was emitted. Design detail is compiled in work package 5; the shared art direction is in [[epistemic-visual-language]].
