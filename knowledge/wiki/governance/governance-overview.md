---
nodeId: governance-overview
kind: governance
title: "Governance overview"
epistemicClass: durable_compiled_knowledge
authorityClass: compiled
status: current
compiledAt: 2026-09-06T16:10:00+00:00
lastVerifiedAt: 2026-09-06T16:10:00+00:00
compiledBy: knowledge-maintenance/1.0.0
sources:
  - { kind: raw_source, ref: src-master-commission }
  - { kind: code_path, ref: constitution/VIRGIL_CONSTITUTION.md }
  - { kind: owner_decision, ref: docs/decisions/OD-0001-phase-0-approval.md }
claims:
  - id: C-gov-owner-merge
    statement: "The owner alone may merge."
    sources: [src-master-commission, constitution/VIRGIL_CONSTITUTION.md]
  - id: C-gov-single-hop
    statement: "Every stage is a single-hop assignment; a stage may produce the handoff for the next stage but may not perform the next role."
    sources: [src-master-commission, constitution/VIRGIL_CONSTITUTION.md]
  - id: C-gov-virgil-routes
    statement: "Virgil routes work and translates state but never scopes, plans, builds, repairs, reviews, adjudicates, approves, merges or deploys."
    sources: [constitution/VIRGIL_CONSTITUTION.md, constitution/permission-matrix.json]
  - id: C-gov-builder-report-not-proof
    statement: "A builder's success report is a claim, never evidence that the candidate is safe."
    sources: [src-master-commission, constitution/VIRGIL_CONSTITUTION.md]
related: [authority-tiers, state-language, agent-roster, artifact-moves-authority-stays]
---

# Governance overview

Virgil's governance is a constitution, not a preference. The authority order is the commission and owner decisions, then the five constitution files with their machine-readable twin, then accepted ADRs, then architecture documents; this wiki explains and never overrides (see `CLAUDE.md`).

The normal chain is scope, owner scope acceptance, plan, build, deterministic verification, independent review, bounded repair if required, fresh re-review, and the owner merge decision. Each hop is performed by one role under one grant ([[agent-roster]]). Deterministic gates (`packages/gate-engine`) compute eligibility from evidence; reviewer judgment addresses correctness and risk; a passing judgment never overrides a failing gate ([[state-language]]).

Autonomy ratchets downward after failure or ambiguity ([[authority-tiers]]). Repair is bounded to one cycle without the owner and two with an explicit owner decision (`constitution/REPAIR_LIMITS.md`).
