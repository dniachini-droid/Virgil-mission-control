# ADR-0007 — Knowledge storage: Markdown with YAML frontmatter and a derived graph

Status: Accepted. Date: 2026-09-06. Deciders: owner (via OD-0001 dependency authority); authored by the Phase 0 session.

## Context
Section 7 asks for a three-directory knowledge layer with an explicit schema, provenance, linting and a reproducible provenance graph that is not an opaque second store.

## Decision
Raw source records and wiki pages are Markdown files with YAML frontmatter (parsed by yaml 2.9.0). Claims live in frontmatter with source references. The graph is derived by `packages/knowledge-graph` from files, decisions, schemas, code paths, event definitions and run records, sorted and hashed for reproducibility. No database.

## Consequences
Everything is diffable and reviewable in Git. Mind Scan is a pure function of the tree. Derivation cost grows with the wiki; acceptable through Phase 5 at expected sizes (hundreds of pages).

## Licences
yaml ISC.
