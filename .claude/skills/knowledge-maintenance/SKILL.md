---
name: knowledge-maintenance
description: Governed wiki maintenance for knowledge/ (ingest, query, compile, lint, propose). Use when asked to add a raw source record, answer from the wiki with citations, update linked wiki pages after an approved source or decision, run a Mind Scan lint, or prepare a proposal for an authority-related page. Never edits knowledge/raw/ and never copies live operational state into the wiki.
---

# Knowledge maintenance

Operates only inside `knowledge/` under `knowledge/SCHEMA.md`. Separate from operational event ingestion: this skill never reads live Git or GitHub state into prose.

## Operations

- **ingest** — for each curated raw source, create or verify a raw-source record (`knowledge/raw/**/*.source.md` frontmatter) with canonical path, content hash, provenance, ingestion state. Append a `raw_source_added` and `raw_source_hashed` line to `knowledge/log.md`. Never modify the source content.
- **query** — answer from wiki pages only, citing page ids and the raw source, ADR, schema, code path or event definition each claim rests on. If no page supports an answer, say so; do not invent.
- **compile** — after an approved source or decision, update linked wiki pages. Every changed claim must gain a provenance tether. Contradictions become explicit `contested` claims with both sources cited. Superseded content is marked `superseded_by`, never deleted. Append `knowledge_compilation_proposed`, `wiki_page_created`, `wiki_page_updated`, `provenance_tether_created`, `claim_supported`, `claim_contested` or `claim_superseded` lines to `knowledge/log.md`.
- **lint** — run `pnpm --filter @virgil/knowledge-lint run lint` and report contradictions, stale or superseded material presented as current, orphans, broken references and tethers, repeated concepts without a page, unsupported claims, echo-chamber regions, copied live operational values and pending proposed repairs. Report; never auto-fix authority pages.
- **propose** — for pages whose authority class is `owner_decision`, `constitution` or `adr`, write the proposed change to `knowledge/outputs/proposals/` and record `knowledge_compilation_proposed`. Do not apply.

## Hard rules

- `knowledge/raw/` is append-only. Create records; never edit or delete.
- Never write current HEAD, SHAs, PR status, check results, agent status or gate eligibility into wiki prose. Link to the live authority instead.
- Every page keeps its frontmatter valid against `schemas/knowledge-node.schema.json`.
- Update `knowledge/index.md` when pages are added or superseded.
