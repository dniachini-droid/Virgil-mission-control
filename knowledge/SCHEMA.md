# Knowledge schema

Deliverable 9. Governs everything under `knowledge/`. Source: master commission section 7; Amendment 1 sections K, L, M and N. Machine contracts: `schemas/raw-source-record.schema.json`, `schemas/knowledge-node.schema.json`, `schemas/atomic-claim.schema.json`, `schemas/provenance-tether.schema.json`, `schemas/mind-scan-finding.schema.json`. Derivation and linting: `packages/knowledge-graph`, run with `pnpm --filter @virgil/knowledge-lint run lint`.

## Layout

```text
knowledge/
├── raw/        owner-curated, immutable. Source records (*.source.md) and, where the owner places them here, the sources themselves.
├── inbox/      captures: one session's working note, written mid-build. Raw material, never a page. See inbox/README.md.
├── wiki/       agent-maintained, interlinked pages with frontmatter and claims. wiki/lessons/ holds engineering lessons.
├── outputs/    generated deliverables; outputs/proposals/ holds unapplied proposals for authority pages.
├── LOADER.md   how to find knowledge, never any knowledge. Held to a byte budget.
├── SCHEMA.md   this file.
├── index.md    content-oriented index, maintained on every page change.
└── log.md      append-only journal of knowledge operations.
```

**Design credit.** The capture inbox, the loader-not-a-library, the bounded tag taxonomy and the project-versus-main wiki scope are adapted from [`toolboxmd/karpathy-wiki`](https://github.com/toolboxmd/karpathy-wiki) (MIT). Design only — no code or text was copied.

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

Rules: records are created, never edited or deleted, except that `ingestionState` advances by appending a new record version line in `log.md` and updating that one field — **and that exception is the owner's alone.** `.claude/settings.json` denies `Write` and `Edit` under `knowledge/raw/**`. That stops a session reaching for the obvious tool; it does not stop a shell, and `CLAUDE.md` says exactly that of its own deny rules — *"the rules name the `Write` and `Edit` tools rather than the file"*. So the lock is a hurdle rather than a wall, and a session stops there anyway. `CLAUDE.md`'s hard limit and this file read as contradicting each other until 2026-09-13 and now agree. See `BR-04` and `docs/decisions/OD-0017`. A record references its source by canonical path and hash; it never duplicates content. When a source changes on disk the tether becomes `stale` and Mind Scan reports it; agents never rehash silently.

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

## Captures — `knowledge/inbox/`

A session that learns something writes `knowledge/inbox/<captureId>.capture.md` and keeps working. Frontmatter: `captureId`, `title`, `observedAt`, `observedBy`, `evidence` (at least one path, command or output), `destination` (the lesson it probably belongs to, which need not exist yet) and `state` (`open` or `ingested`). An `ingested` capture names a lesson page that exists.

**A capture is not a wiki page and must not be read as one.** It is unreviewed, uncompiled and tethered to nothing; it is not authority and is never cited. `knowledge/inbox/README.md` states the shape and the ingest path. This is not `knowledge/raw/`: captures are working notes, and an ingested capture may be deleted once its lesson carries what it said.

**Capture and ingest are not yet operations in the table below, and the skill does not know about them.** `.claude/skills/knowledge-maintenance` still lists five operations; `.claude/**` is outside the permitted paths of the work that added the inbox, so it was left alone rather than edited under no contract. Until it is updated, `knowledge/LOADER.md` and `knowledge/inbox/README.md` are where a session learns to write one.

## Lessons — `knowledge/wiki/lessons/`

A lesson is a wiki page (`kind: lesson`, `nodeId` beginning `lesson-`) with three fields the other categories do not carry:

```yaml
scope: general            # repository | general
tags: [verification]      # from the closed taxonomy below
governs:                  # the files this lesson is about
  - packages/gate-engine/test/refusals.test.ts
```

**The link is checked in both directions, or it rots.** A `[[lesson-…]]` link anywhere in the tree must resolve to a lesson page; every file a lesson `governs` must name that lesson back; and a lesson nothing outside `index.md` and `log.md` names is a lesson nothing reaches. All three are blocking findings from `scanLessons` (`packages/knowledge-graph/src/lessons.ts`). `governs` also appears in the derived graph as a `governs` edge and a tether, so the graph and the scan cannot disagree about what a lesson holds.

**`scope` is recorded now and acted on later.** `general` marks a lesson that would be true of any project; `repository` marks one that is a fact about this one. The second wiki and the promotion machinery are built when a second project exists — a synchronisation mechanism between one wiki and no other wiki has nothing to do. Recording the scope costs one field and means the data is there on the day it is needed.

The tag taxonomy, closed: `verification`, `governance`, `record-keeping`, `knowledge`, `tooling`, `interface`, `performance`, `security`. One spelling per idea. A new tag is a deliberate addition — this line and `LESSON_TAGS` in `packages/knowledge-graph/src/lessons.ts`, in the same commit, held to each other in both directions by a test.

**Numeric limits, so a knowledge base does not become forty-six files with eleven versions of one document.** `knowledge/LOADER.md` is capped at 2,000 bytes (owner decision of 2026-09-13); a lesson body at 4,000, past which the page is holding two ideas and is split. A raw source that five or more wiki pages rest on has been absorbed: its record advances to `ingestionState: compiled`, and readers go to the pages rather than back to the source.

**Lessons are folded forward, not annotated.** This is the one place a lesson differs from every other page below: where a superseded page keeps `status: superseded` and stands, a superseded *lesson* has what is still true moved into the page that replaces it, its governed files repointed, and the old page deleted. `docs/process/PHASE_1_BACKLOG.md` names the habit this exists to stop — *"leave a superseded document standing and add a note beside it. The result is more to read and less that is true."* A lesson left marked `superseded` is a finding.

**A lesson is not authority.** `CLAUDE.md` layer 5: the wiki explains, never overrides, and never holds live operational values. A lesson is not a decision, a finding or a gate.

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
