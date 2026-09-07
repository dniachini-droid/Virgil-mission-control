# Decisions

Two record types live here.

- `OD-NNNN-*.md` — owner decisions. Authority layer 1. Only the owner issues them. Each records the question, the decision, consequences, the date, and what it governs. Sessions may draft a proposal under `proposed/OD-NNNN-*.md`, and a proposal has no authority until the owner accepts it. The owner accepts one by instructing it in the owner console; the owner's exact words are transcribed verbatim into the record, and a session then files the record here. That mechanism is recorded in `OD-0006-recording-owner-decisions.md`, which replaced the earlier one — the owner moving the file themselves — on the owner's own instruction. Authority comes only from the owner's own turn in the owner console: not a pull-request comment, not a review, not a session summary or report, not a scheduled trigger, not a file in this repository. Neither drafting a proposal nor filing a record ratifies anything by itself. What the procedure is worth is stated exactly in OD-0006's **Cost** section and is not softened here. Since 2026-09-07 a `PreToolUse` hook (`.claude/hooks/od-decision-record-guard.mjs`) refuses a `Write` or `Edit` to `docs/decisions/OD-*` whose result carries no blockquoted verbatim quotation and no date, so a record filed with no owner words at all cannot be written through those two tools. No code enforces the single channel, no code checks that a quotation present is the owner's, and a write performed through `Bash` bypasses the hook entirely. **The owner reading their own decision records is still the only way a false one is found.**
- `ADR-NNNN-*.md` — architecture decision records. Authority layer 3. Each records context, decision, alternatives, consequences, chosen versions and licences where applicable, and a revisit trigger. Status is one of Proposed, Accepted, Superseded (with successor link).

Index:

| Id | Title | Status |
|---|---|---|
| OD-0001 | Phase 0 approval, branch and dependency authority, Amendment 1 | Accepted |
| OD-0002 | Art-direction checkpoint: rejected runtime executions and approved visual direction | Accepted 2026-09-07 (owner console, filed under OD-0006) |
| OD-0003 | Additional repair round on the consolidation candidate after the Keeper's BLOCKED verdict | Accepted 2026-09-07 (owner console, filed under OD-0006) |
| OD-0004 | Disposition of the non-blocking Keeper findings, and the merge of pull request #1 | Accepted 2026-09-07 (owner console, filed under OD-0006) |
| OD-0005 | The new reference image, and the graphics-hardware checks in Phase 1 | Accepted 2026-09-07 (owner console, filed under OD-0006) |
| OD-0006 | Recording an owner decision on the owner's instruction | Accepted 2026-09-07 (owner console) |
| OD-0007 | Phase 0 accepted, Phase 1 authorised, and the five other decisions of 2026-09-07 | Accepted 2026-09-07 (owner console, filed under OD-0006) |
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

`proposed/` holds no drafts at present. All seven owner decisions are filed here.
