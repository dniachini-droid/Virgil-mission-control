# Decisions

Two record types live here.

- `OD-NNNN-*.md` — owner decisions. Authority layer 1. Only the owner issues them. Each records the question, the decision, consequences, the date, and what it governs. Sessions may draft a proposal under `proposed/OD-NNNN-*.md`; a proposal has no authority until the owner moves it to this directory. Session tooling denies writes to accepted decision files (`.claude/settings.json`).
- `ADR-NNNN-*.md` — architecture decision records. Authority layer 3. Each records context, decision, alternatives, consequences, chosen versions and licences where applicable, and a revisit trigger. Status is one of Proposed, Accepted, Superseded (with successor link).

Index:

| Id | Title | Status |
|---|---|---|
| OD-0001 | Phase 0 approval, branch and dependency authority, Amendment 1 | Accepted |
| ADR-0001 | Monorepo tooling: pnpm, Turborepo, TypeScript 7, Biome, Vitest | Accepted |
| ADR-0002 | Application framework: Vite, React 19, React Router | Accepted |
| ADR-0003 | Rendering stack: three.js, React Three Fiber, drei, postprocessing | Accepted |
| ADR-0004 | Contracts: Zod source of truth, JSON Schema export, Ajv cross-validation | Accepted |
| ADR-0005 | Event-sourced domain with a data-driven state machine | Accepted |
| ADR-0006 | Event store engine deferred to Phase 2 | Proposed |
| ADR-0007 | Knowledge storage: Markdown with YAML frontmatter and a derived graph | Accepted |
| ADR-0008 | Visual contracts as validated data with evidence-gated animation | Accepted |
| ADR-0009 | Headless spike capture with Playwright and SwiftShader | Accepted |
| ADR-0010 | Labels as canvas textures instead of SDF text | Accepted |
| OD-0002 | Art-direction checkpoint verdict and Phase 0.5 visual recovery direction | Accepted by the owner in writing 2026-09-06; full text at `proposed/` pending the owner's file move (session tooling denies writes to `OD-*`) |
