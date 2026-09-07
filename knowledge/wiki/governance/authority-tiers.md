---
nodeId: authority-tiers
kind: governance
title: "Authority tiers and grants"
epistemicClass: durable_compiled_knowledge
authorityClass: compiled
status: current
compiledAt: 2026-09-06T16:10:00+00:00
lastVerifiedAt: 2026-09-06T16:10:00+00:00
compiledBy: knowledge-maintenance/1.0.0
sources:
  - { kind: raw_source, ref: src-master-commission }
  - { kind: code_path, ref: constitution/AUTHORITY_TIERS.md }
  - { kind: code_path, ref: constitution/authority.json }
  - { kind: schema, ref: schemas/agent-authority-grant.schema.json }
claims:
  - id: C-tiers-three
    statement: "Authority has three tiers; Tier 1 acts and reports, Tier 2 executes an owner-approved bounded scope, Tier 3 requires owner approval before action."
    sources: [src-master-commission, constitution/authority.json]
  - id: C-tiers-grant-object
    statement: "Every grant states tier, permitted actions, boundary, expiry and stop conditions, and every grant, transfer, expiry and revocation is an explicit auditable event."
    sources: [constitution/AUTHORITY_TIERS.md, schemas/agent-authority-grant.schema.json, event:authority_granted, event:authority_revoked]
  - id: C-tiers-invariant
    statement: "The permission invariant is one accountable owner per artifact at a time with explicit sequential grants, not a blanket ban on two roles ever writing the same path."
    sources: [src-od-0001, constitution/AUTHORITY_TIERS.md]
related: [governance-overview, agent-roster]
---

# Authority tiers and grants

Tier 1 covers read-only recovery, reconciliation, evidence collection, presentation updates and reporting. Tier 2 begins after the owner accepts a bounded scope and covers starting a stage, creating an isolated worktree and branch, running the approved build, pushing and opening a draft PR, commissioning the review formation, and applying one adjudicated repair. Tier 3 is the owner's: material decisions, authority changes, new work after a failed cycle, extra repair rounds, merge, deployment and permission expansion.

Authority is an object separate from the work order. The grant schema and the `authority_granted` and `authority_revoked` events make every transfer explicit. Amendment 1 corrected the invariant: sequential, bounded, audited grants over the same path are legitimate (the Prover's test boundary inside the Fabricator's worktree is the sanctioned case), whereas simultaneous or implicit overlap is not. Reviewer independence remains absolute; see [[agent-roster]].
