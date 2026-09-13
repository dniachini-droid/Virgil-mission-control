---
nodeId: artifact-moves-authority-stays
kind: principle
title: "The artifact moves between workers; authority does not silently move with it"
epistemicClass: durable_compiled_knowledge
authorityClass: compiled
status: current
compiledAt: 2026-09-06T16:10:00+00:00
lastVerifiedAt: 2026-09-06T16:10:00+00:00
compiledBy: knowledge-maintenance/1.0.0
sources:
  - { kind: raw_source, ref: src-master-commission }
  - { kind: code_path, ref: constitution/VIRGIL_CONSTITUTION.md }
  - { kind: schema, ref: schemas/handoff.schema.json }
claims:
  - id: C-principle-artifact-moves
    statement: "A candidate is sealed by its immutable commit SHA and travels between roles; authority arrives only through an explicit grant event."
    sources: [src-master-commission, constitution/VIRGIL_CONSTITUTION.md, schemas/handoff.schema.json]
  - id: C-principle-review-does-not-merge
    statement: "Passing review makes a candidate eligible for the owner gate; it does not merge it."
    sources: [src-master-commission, constitution/REVIEW_POLICY.md]
related: [governance-overview, state-language]
---

# The artifact moves. Authority stays.

This is the founding principle of Virgil (commission section 2; constitution Article 2). A builder produces a sealed candidate identified by its full commit SHA. The candidate travels to an independent reviewer, who may inspect it but cannot alter it. Failed candidates enter quarantine. Repairs receive bounded authority and produce a new SHA. Passing review makes the candidate eligible; only an explicit owner event opens the merge airlock.

The handoff contract (`schemas/handoff.schema.json`) makes the rule structural: its `authorityTravels` field is a literal `false`, and a handoff whose required information is missing cannot seal. Authority for the receiving role exists only as a separate `authority_granted` event. See [[authority-tiers]] for tiers and grants and [[state-language]] for the states the artifact passes through.
