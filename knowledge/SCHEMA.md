# Knowledge schema

Deliverable 9. Governs everything under `knowledge/`. Source: master commission section 7; Amendment 1 sections K, L, M and N. Machine contracts: `schemas/raw-source-record.schema.json`, `schemas/knowledge-node.schema.json`, `schemas/atomic-claim.schema.json`, `schemas/provenance-tether.schema.json`, `schemas/mind-scan-finding.schema.json`. Derivation and linting: `packages/knowledge-graph`, run with `pnpm --filter @virgil/knowledge-lint run lint`.

## Layout

```text
knowledge/
├── raw/        owner-curated, immutable. Source records (*.source.md) and, where the owner places them here, the sources themselves.
├── wiki/       agent-maintained, interlinked pages with frontmatter and claims.
├── outputs/    generated deliverables; outputs/proposals/ holds unapplied proposals for authority pages.
├── SCHEMA.md   this file.
├── index.md    content-oriented index, maintained on every page change.
└── log.md      append-only journal of knowledge operations.
```

## Authority classes and epistemic classes

Every node and claim carries an `authorityClass` (`commission`, `owner_decision`, `constitution`, `adr`, `verified_evidence`, `compiled`, `hypothesis`, `output`) and an `epistemicClass` (`immutable_raw_evidence`, `durable_compiled_knowledge`, `owner_approved_decision`, `ai_generated_hypothesis`, `contested_claim`, `superseded_claim`, `unverified_claim`, `live_operational_signal`, `deterministically_verified_fact`). The wiki never holds `live_operational_signal` nodes: that class exists so the projection layer can render live state distinctly, never as memory.

## Raw source records

File `knowledge/raw/<sourceId>.source.md` with frontmatter validating `raw-source-record`:

```yaml
sourceId: src-master-commission
kind: specification
title: Virgil Mission Control master commission
canonicalPath: docs/product/VIRGIL_MASTER_COMMISSION.md
contentHash: sha256:<64 hex>
bytes: 77076
provenance: Supplied by the owner on 2026-09-06; amended by OD-0001.
ingestionState: sealed
addedAt: 2026-09-06T00:00:00+00:00
addedBy: owner
immutable: true
```

Rules: records are created, never edited or deleted, except that `ingestionState` advances by appending a new record version line in `log.md` and updating that one field. A record references its source by canonical path and hash; it never duplicates content. When a source changes on disk the tether becomes `stale` and Mind Scan reports it; agents never rehash silently.

## Wiki pages

File `knowledge/wiki/<area>/<nodeId>.md` with frontmatter:

```yaml
nodeId: governance-overview          # stable slug; never renamed, superseded instead
kind: governance                     # principle | architecture_concept | agent_role | decision | lesson | open_question | glossary_term | visual_language | governance | contradiction_field
title: Governance overview
epistemicClass: durable_compiled_knowledge
authorityClass: compiled
status: current                      # current | contested | superseded | proposed | unverified
compiledAt: 2026-09-06T00:00:00+00:00
lastVerifiedAt: 2026-09-06T00:00:00+00:00
compiledBy: knowledge-maintenance/1.0.0
sources:                             # page-level provenance tethers
  - { kind: raw_source, ref: src-master-commission }
  - { kind: code_path, ref: constitution/VIRGIL_CONSTITUTION.md }
claims:                              # atomic claims; each must cite at least one source
  - id: C-gov-owner-merge
    statement: The owner alone may merge.
    sources: [src-master-commission, constitution/VIRGIL_CONSTITUTION.md]
related: [authority-tiers]
supersedes: []
supersededBy: null
```

Tether `ref` forms: `src-*` (raw source record), `docs/decisions/OD-*` (owner decision), `docs/decisions/ADR-*` (ADR), `schemas/*.schema.json` (schema), `event:<type>` (event definition in the catalogue), `run:<runId>` (verified run record), any other repository path (code path). A claim citing nothing is `unverified_claim`. A claim citing only a superseded source is flagged by Mind Scan.

Body rules: explain; cite inline with `[[nodeId]]` wiki links or repository paths; never state a current SHA, PR number, check result, agent status or gate eligibility as fact. Live values may appear only as the name of the authority that holds them (for example, "the read model's current candidate state").

## Contradiction and supersession

Two supported claims that conflict are both kept. Each gains `contestedBy` (in derivation) via a `knowledge-relationship` of kind `contradicts` recorded in the page frontmatter under `contradicts: [claimId]`. The page status becomes `contested` until an owner decision or verified evidence resolves it, at which point the losing claim is marked `supersededBy` and the page status returns to `current`. Superseded pages keep `status: superseded` and `supersededBy: <nodeId>`; they are never deleted.

## Operations

| Operation | Who | Effect | Log lines |
|---|---|---|---|
| ingest | knowledge-maintenance skill | create raw source record, hash, seal | raw_source_added, raw_source_hashed |
| query | any role, read-only | answer from wiki with citations | none |
| compile | knowledge-maintenance skill | create or update pages and claims with tethers; mark contradictions and supersession | knowledge_compilation_proposed, wiki_page_created, wiki_page_updated, provenance_tether_created, claim_supported, claim_contested, claim_superseded |
| lint | knowledge-maintenance skill or CI | Mind Scan; report only | wiki_lint_started, wiki_lint_finding_raised, wiki_lint_completed |
| propose | knowledge-maintenance skill | write proposal under outputs/proposals for pages with authorityClass owner_decision, constitution, commission or adr | knowledge_compilation_proposed |

Wiki maintenance never ingests operational events. The Mind gateway (`run_record_deposited`) creates a raw source record for a verified run record; compilation of a lesson from it follows the normal operations and, for lessons touching authority pages, requires an owner decision.

## Anti-drift rule

The wiki must never become a second home for live operational state. Current HEAD, active SHA, PR status, check result, agent status and current gate eligibility come from Git, GitHub, the event store or the read model at display time. Mind Scan finding class `copied_live_operational_state` flags 40-hex SHAs, PR references and bare state tokens in prose.

## Outputs

Each file under `outputs/` starts with frontmatter naming `sourceNodeIds`, `createdAt` and `governingVersion` (the commission hash it was produced under). Outputs are never authority.
