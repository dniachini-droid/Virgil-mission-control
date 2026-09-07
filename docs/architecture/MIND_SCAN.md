# Mind Scan design and fixture plan

Deliverable 16. Source: master commission section 5.2 "Mind Scan" and 7.5 "lint"; Amendment 1 section M. Implementation of the deterministic checks: `packages/knowledge-graph/src/lint.ts`, run by `tools/knowledge-lint`. Contract: `schemas/mind-scan-finding.schema.json`.

## Behaviour

A scan runs once over the derived graph, never continuously. It emits `wiki_lint_started`, one `wiki_lint_finding_raised` per finding, and `wiki_lint_completed`. It reports and proposes; it never rewrites owner-controlled authority. Each finding carries evidence references (paths, node ids, claim ids) and a proposed repair with `repairRequiresOwner` set when the affected page's authority class is owner-controlled.

## Finding classes

| Class | Deterministic rule | Fixture |
|---|---|---|
| contradiction | two claims joined by a `contradicts` edge where both have intact tethers | `contested-lesson` |
| stale_or_superseded_presented_as_current | page or claim with `supersededBy` whose status is `current`; or a `supersedes` target still `current` | `superseded-as-current` |
| orphan_node | wiki page with no inbound `links_to`, `related`, `supersedes` or `contains` edge and not listed in `index.md` | `orphan-page` |
| broken_reference | `[[link]]` or `related` to a node id that does not exist | `broken-link` |
| broken_provenance_tether | tether with state broken, stale or absent | `broken-tether`, `stale-hash` |
| repeated_concept_without_page | a term appearing as a heading or bold term in three or more pages with no page whose nodeId or title matches | `repeated-concept` |
| unsupported_claim | claim with zero intact tethers | `unsupported-claim` |
| echo_chamber_around_outdated_source | a set of pages whose intact tethers all resolve to sources that are superseded or whose hash is stale | `echo-chamber` |
| copied_live_operational_state | body prose containing a bare 40-hex SHA, a `#<number>` or `PR <number>` reference, or a bare candidate-state token outside backticks | `copied-live-state` |
| proposed_repair_awaiting_approval | any file under `knowledge/outputs/proposals/` other than README | `pending-proposal` |

## Severity

blocking: broken_provenance_tether on an owner-controlled page, copied_live_operational_state, stale_or_superseded_presented_as_current. major: contradiction, unsupported_claim, echo_chamber. minor: orphan_node, broken_reference, repeated_concept. informational: proposed_repair_awaiting_approval.

## Fixture plan

`packages/test-fixtures/knowledge/` holds a miniature knowledge tree per fixture id above, each with a `README` naming the expected finding class, plus `clean/`, a tree that must produce zero findings (no false blockers). Tests in `packages/knowledge-graph/test/lint.test.ts` derive each tree and assert exactly the expected classes. Phase 1 adds LLM-assisted checks (semantic contradiction, concept clustering) behind the same finding schema; those results are hypotheses until reproduced deterministically or confirmed by the owner.

## Visual projection

A scan is a single coherent wave across the galaxy. Each finding becomes a diagnostic beacon attached to its nodes with a tether to the evidence. The beacon form follows the epistemic visual contract for `unverified_claim` (unstable) or the fault geometry for broken tethers; it never changes the node's own class.
