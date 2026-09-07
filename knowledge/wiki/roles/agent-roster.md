---
nodeId: agent-roster
kind: agent_role
title: "Agent roster"
epistemicClass: durable_compiled_knowledge
authorityClass: compiled
status: current
compiledAt: 2026-09-06T16:10:00+00:00
lastVerifiedAt: 2026-09-06T16:10:00+00:00
compiledBy: knowledge-maintenance/1.0.0
sources:
  - { kind: raw_source, ref: src-master-commission }
  - { kind: code_path, ref: constitution/permission-matrix.json }
  - { kind: code_path, ref: docs/process/PERMISSION_MATRIX.md }
claims:
  - id: C-roster-fourteen
    statement: "The roster has seven permanent roles (Virgil, Cartographer, Architect, Fabricator, Prover, Keeper, Arbiter) and seven conditional specialists activated only by the risk classification."
    sources: [src-master-commission, constitution/permission-matrix.json]
  - id: C-roster-only-fabricator-modifies
    statement: "Only the Fabricator may modify the candidate, and only under a grant; every reviewer role is read-only and independent of the builder session."
    sources: [constitution/permission-matrix.json, docs/process/PERMISSION_MATRIX.md]
  - id: C-roster-keeper-verdicts
    statement: "The Keeper returns exactly one of PASS, PASS_WITH_NON_BLOCKING_FINDINGS, BLOCKED or INSUFFICIENT_EVIDENCE."
    sources: [src-master-commission, constitution/REVIEW_POLICY.md]
related: [governance-overview, authority-tiers, epistemic-visual-language]
---

# Agent roster

Definitions live in `.claude/agents/`, one versioned file per role, and must agree with `constitution/permission-matrix.json` (a test enforces it). Each definition states remit, inputs, required outputs, allowed tools, prohibited actions, stop conditions, escalation and result schema.

Permanent crew: **Virgil** conducts and never performs routed work; the **Cartographer** bounds scope; the **Architect** plans without building; the **Fabricator** builds inside a worktree and permitted paths; the **Prover** verifies and may seed mutations into a disposable copy; the **Keeper** reviews one exact SHA read-only; the **Arbiter** adjudicates conflicting findings and defines one bounded repair. Conditional specialists (Domain Verifier, Breaker, Integrator, Interface Keeper, Security Sentinel, Transport Inspector, Performance Examiner) appear only when the risk classification names them. Their stations and performance identities are described in [[epistemic-visual-language]] and the role performance bible.
