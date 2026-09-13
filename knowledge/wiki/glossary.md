---
nodeId: glossary
kind: glossary_term
title: "Glossary"
epistemicClass: durable_compiled_knowledge
authorityClass: compiled
status: current
compiledAt: 2026-09-06T16:10:00+00:00
lastVerifiedAt: 2026-09-06T16:10:00+00:00
compiledBy: knowledge-maintenance/1.0.0
sources:
  - { kind: raw_source, ref: src-master-commission }
  - { kind: code_path, ref: constitution/STATE_LANGUAGE.md }
claims:
  - id: C-gloss-candidate
    statement: "A candidate is a sealed commit identified by its full SHA; it is not verified, reviewed or safe to merge until the corresponding facts exist."
    sources: [src-master-commission, constitution/STATE_LANGUAGE.md]
related: [state-language, governance-overview, knowledge-layer]
---

# Glossary

- **Candidate**: a sealed commit (full SHA) produced by the Fabricator; a repair produces a new candidate in the same lineage.
- **Lineage**: the stable identity a candidate keeps across repairs.
- **Grant**: an authority object naming tier, permitted actions, boundary, expiry and stop conditions ([[authority-tiers]]).
- **Handoff**: a sealed transfer of artifact, manifest, evidence, risks and next-stage contract; never carries authority.
- **Gate**: a deterministic check computed from machine evidence; prose cannot override it.
- **Seal**: the review record bound to one SHA; any SHA change makes it stale.
- **Quarantine field**: the state geometry holding a blocked candidate; differs in form from the incomplete-evidence field.
- **Mind gateway**: the causal crossing from a verified run into the knowledge layer (the two worlds).
- **Tether**: an inspectable provenance link from a claim or page to its evidence; intact, broken, stale or absent ([[knowledge-layer]]).
- **Mind Scan**: a single-pass lint over the knowledge galaxy that reports and proposes but never rewrites authority.
