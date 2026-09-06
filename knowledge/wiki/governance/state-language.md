---
nodeId: state-language
kind: governance
title: "State language"
epistemicClass: durable_compiled_knowledge
authorityClass: compiled
status: current
compiledAt: 2026-09-06T16:10:00+00:00
lastVerifiedAt: 2026-09-06T16:10:00+00:00
compiledBy: knowledge-maintenance/1.0.0
sources:
  - { kind: raw_source, ref: src-master-commission }
  - { kind: code_path, ref: constitution/STATE_LANGUAGE.md }
  - { kind: code_path, ref: constitution/authority.json }
  - { kind: code_path, ref: packages/domain/src/reducer.ts }
claims:
  - id: C-state-fifteen
    statement: "The candidate lifecycle has fifteen named states that must never be collapsed into one generic completed state."
    sources: [src-master-commission, constitution/STATE_LANGUAGE.md, constitution/authority.json]
  - id: C-state-skipped-not-passed
    statement: "A skipped check is visible, labelled with its reason, and never counts as passed."
    sources: [src-od-0001, constitution/STATE_LANGUAGE.md, packages/domain/src/reducer.ts]
  - id: C-state-stale-review
    statement: "Any change to the candidate SHA after review breaks the review seal and requires fresh verification and fresh independent review."
    sources: [constitution/REVIEW_POLICY.md, event:candidate_changed_after_review]
related: [governance-overview, artifact-moves-authority-stays]
---

# State language

The vocabulary is fixed in `constitution/STATE_LANGUAGE.md` and enforced by the transition table in `constitution/authority.json`, which `packages/domain` loads at runtime. The current state of any real candidate is a read-model value and is never recorded in this wiki; consult the read model or the Evidence View.

Distinctions the product must preserve: a builder's report (`BUILDER_REPORTED_COMPLETE`) is not verification; verification completion (`READY_FOR_REVIEW`) is not review; a passing review (`PASS_WITH_NON_BLOCKING_FINDINGS`) is not eligibility (`SAFE_TO_MERGE`); eligibility is not `MERGED`; merged is not `DEPLOYED`; a proven defect (`BLOCKED`) is not missing proof (`INSUFFICIENT_EVIDENCE`). Deployment started, failed and succeeded are separate persistent values. See [[governance-overview]].
