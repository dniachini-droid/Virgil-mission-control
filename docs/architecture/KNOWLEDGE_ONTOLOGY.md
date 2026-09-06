# Knowledge ontology and provenance graph

Deliverable 10. Source: master commission sections 5.2, 7 and 7.6; Amendment 1 sections K to N. Implementation: `packages/knowledge-graph` (derivation, lint), contracts in `packages/agent-contracts/src/knowledge.ts`, storage rules in `knowledge/SCHEMA.md`.

## Entities

| Entity | Graph node type | Derived from | Epistemic class |
|---|---|---|---|
| Raw source | `raw_source` | `knowledge/raw/*.source.md` (canonical path + hash) | immutable_raw_evidence, or owner_approved_decision for decision sources |
| Wiki page | `wiki_page` | `knowledge/wiki/**/*.md` frontmatter | by status: durable_compiled_knowledge, contested_claim, superseded_claim, ai_generated_hypothesis, unverified_claim |
| Atomic claim | `claim` | page frontmatter `claims[]` | by sources, contradiction, supersession, signature and authority |
| Owner decision | `owner_decision` | `docs/decisions/OD-*.md` | owner_approved_decision (proposed files are hypotheses) |
| ADR | `adr` | `docs/decisions/ADR-*.md` | durable_compiled_knowledge with authority adr |
| Schema | `schema` | tether targets under `schemas/` | immutable_raw_evidence |
| Code path | `code_path` | any other tethered repository path | immutable_raw_evidence |
| Event definition | `event_definition` | `event:<type>` tethers validated against the event catalogue | durable_compiled_knowledge |
| Verified run | `verified_run` | `run:<id>` tethers resolved to run records | deterministically_verified_fact |
| Output | `output` | `knowledge/outputs/**` | ai_generated_hypothesis (proposals: authority hypothesis) |
| Scan finding | `scan_finding` | Mind Scan results | not stored in the graph; emitted as `mind-scan-finding` records |

Live operational signals are not graph nodes. They are read-model values projected with the `live_operational_signal` class at display time.

## Relationships

`tether` (claim or page → source, with state intact, broken, stale or absent), `supports` (source → output), `contradicts` (claim ↔ claim), `supersedes` (page → page, claim → claim), `related`, `contains` (page → claim), `links_to` (body `[[wiki-link]]`).

## Authority and epistemic rules

1. Authority rank: commission and owner decision 9, constitution 8, ADR 7, verified evidence 6, compiled 4, hypothesis 2, output 1.
2. A claim's effective rank is the minimum of its page's authority and its weakest intact supporting source. A claim cannot outrank its evidence.
3. A claim with no intact tether is `unverified_claim`. A claim contradicted by a supported claim is `contested_claim` and both remain. A claim with `supersededBy` is `superseded_claim` and remains selectable.
4. `deterministically_verified_fact` requires a verification signature attached to its evidence; nothing else may render with the machine-verification mark.
5. Owner-controlled authority (commission, owner decision, constitution, ADR) may only be changed by proposal plus owner decision.
6. The renderer receives the class from the graph and may not change it (tested in `packages/visual-language`).

## Reproducibility

`deriveGraph` is a pure function of the file tree and a fixed timestamp. It sorts nodes and edges by id and hashes the result. Tests derive twice and compare hashes, and hash `knowledge/raw` before and after derivation to prove sources are untouched. The graph is never persisted as authority; it is recomputed from inspectable files and explicit events.

## Cross-world entities

A verified Foundry run enters the Mind as a `verified_run` node only through a raw source record created by `run_record_deposited`. A project station's governing principles are the wiki pages listed in the project manifest's `governingKnowledgeNodes`, which the projection layer resolves to reverse tethers ("every project surface governed by this rule").
