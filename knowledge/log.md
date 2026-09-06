# Knowledge operation journal

Append-only. One line per operation: `timestamp | event | actor | subject | evidence`.

2026-09-06T16:00:00+00:00 | raw_source_added | owner | src-master-commission | docs/product/VIRGIL_MASTER_COMMISSION.md
2026-09-06T16:00:00+00:00 | raw_source_hashed | knowledge-maintenance/1.0.0 | src-master-commission | sha256 in record
2026-09-06T16:05:00+00:00 | raw_source_added | owner | src-od-0001 | docs/decisions/OD-0001-phase-0-approval.md
2026-09-06T16:05:00+00:00 | raw_source_hashed | knowledge-maintenance/1.0.0 | src-od-0001 | sha256 in record
2026-09-06T16:10:00+00:00 | knowledge_compilation_proposed | knowledge-maintenance/1.0.0 | seed pages: principles/artifact-moves-authority-stays, governance/governance-overview, governance/authority-tiers, governance/state-language, roles/agent-roster, architecture/system-boundaries, architecture/two-worlds, visual/epistemic-visual-language, architecture/knowledge-layer, glossary | src-master-commission, src-od-0001, constitution/, docs/architecture/
2026-09-06T16:10:00+00:00 | knowledge_compilation_approved | verification | seed pages | approved by verification: every claim tethered to an existing source (knowledge-lint)
2026-09-06T16:10:00+00:00 | wiki_page_created | knowledge-maintenance/1.0.0 | 10 seed pages | knowledge-lint
2026-09-06T17:40:00+00:00 | wiki_lint_started | knowledge-lint | knowledge/wiki | tools/knowledge-lint
2026-09-06T17:40:00+00:00 | wiki_lint_completed | knowledge-lint | 10 pages, 28 claims, 94/94 tethers intact, 0 findings | docs/process/PHASE_0_RUN_RECORD.md
2026-09-06T17:45:00+00:00 | knowledge_compilation_proposed | phase-0-session | docs/decisions/proposed/OD-0002-art-direction-checkpoint.md (owner decision proposal, no authority) | docs/process/ART_DIRECTION_CHECKPOINT.md
