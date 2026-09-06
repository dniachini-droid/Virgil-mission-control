# Phase 0 traceability matrix

Maps every required output (commission section 11, Phase 0; Amendment 1 "Phase 0 deliverable amendments") and every acceptance criterion (section 13) to files and to the check that proves it. Status values: complete, complete-with-limitation, blocked.

## Deliverables (section 11)

| # | Output | Files | Proof | Status |
|---|---|---|---|---|
| 1 | Repository inspection and environment report | docs/process/PHASE_0_ENVIRONMENT_REPORT.md | — | complete |
| 2 | Final repository architecture | docs/architecture/REPOSITORY_ARCHITECTURE.md; workspace files | `pnpm check` | complete |
| 3 | Product vision and V1 boundary | docs/product/PRODUCT_VISION.md, V1_BOUNDARY.md | — | complete |
| 4 | Governance constitution | constitution/*.md, authority.json | agent-contracts `AuthorityConfig` test; domain transition tests | complete |
| 5 | Agent roster and permission matrix | .claude/agents/*.md (14), constitution/permission-matrix.json, docs/process/PERMISSION_MATRIX.md | permission-matrix.test.ts (23) | complete |
| 6 | Structured contracts | packages/agent-contracts, schemas/ (39), docs/architecture/CONTRACTS.md | schemas.test.ts (13) | complete |
| 7 | System architecture and event model | docs/architecture/SYSTEM_ARCHITECTURE.md, EVENT_MODEL.md, packages/domain | domain tests (30) | complete |
| 8 | Threat model | docs/security/THREAT_MODEL.md, REPOSITORY_ALLOWLIST.md | — (T1, T3, T5, T8, T9, T10 runtime enforcement deferred to Phases 2–3 as recorded) | complete-with-limitation |
| 9 | Knowledge structure and SCHEMA.md | knowledge/ | knowledge-lint clean; derive tests | complete |
| 10 | Ontology and provenance graph | docs/architecture/KNOWLEDGE_ONTOLOGY.md, packages/knowledge-graph | derive.test.ts (6) | complete |
| 11 | Epistemic visual contract | packages/visual-language/data/epistemic-contract.json, docs/art-direction/EPISTEMIC_VISUAL_CONTRACT.md | contracts.test.ts (5) | complete |
| 12 | Two-world navigation and causation | docs/architecture/TWO_WORLDS.md | wiki tether intact (knowledge-lint) | complete |
| 13 | Art bible | docs/art-direction/ART_BIBLE.md plus companions | — | complete |
| 14 | Orbital Foundry spike | apps/mission-control /spike/foundry; docs/art-direction/spikes/foundry-*.png | build; sequences.test.ts; capture report | complete-with-limitation (software renderer) |
| 15 | Mind of Virgil spike | apps/mission-control /spike/mind; spikes/mind-*.png | as above | complete-with-limitation (software renderer) |
| 16 | Mind Scan design and fixtures | docs/architecture/MIND_SCAN.md, packages/test-fixtures/knowledge (12 trees), tools/knowledge-lint | lint.test.ts (15) | complete |
| 17 | Performance strategy and tiers | docs/architecture/PERFORMANCE_STRATEGY.md | measurement deferred to Phase 1 (no GPU) | complete-with-limitation |
| 18 | Test and agent-evaluation strategy | docs/testing/TEST_STRATEGY.md, AGENT_EVALUATION.md, packages/test-fixtures | gates.test.ts (19) | complete |
| 19 | ADRs | docs/decisions/ADR-0001 … ADR-0010 | — | complete |
| 20 | Phase 1 brief | docs/process/PHASE_1_BRIEF.md | — | complete |
| 21 | Run record and go/no-go | docs/process/PHASE_0_RUN_RECORD.md, run-records/phase-0.run-record.json | run-record schema test | complete |

## Amendment 1 outputs

| # | Output | Files | Proof | Status |
|---|---|---|---|---|
| A1 | Machine-readable Operational Animation Grammar | packages/visual-language/data/animation-grammar.json (74 mappings, 6 ambient) | validated at import against schemas/operational-animation-grammar; contracts.test.ts | complete |
| A2 | Operational animation art-direction documentation | docs/art-direction/OPERATIONAL_ANIMATION.md | — | complete |
| A3 | Role Performance Bible (7 + 7) | data/role-performance.json, docs/art-direction/ROLE_PERFORMANCE_BIBLE.md | contracts.test.ts (3) | complete |
| A4 | Full-motion, reduced, mobile, low-performance mappings | every mapping's fullMotion, reducedMotion, mobileLowPerformance fields; PERFORMANCE_STRATEGY tiers | contracts.test.ts "defines all sixteen fields…" | complete |
| A5 | Tests: animation cannot trigger without event and evidence | contracts.test.ts "refuses to animate…", "refuses unknown event types and telemetry" | passing | complete |
| A6 | Tests: ambient cannot impersonate work | contracts.test.ts ambient test; role bible idle test | passing | complete |
| A7 | Tests: skipped/failed/passed/reviewed/safe/merged/deployed distinct | contracts.test.ts distinct-by-form; domain distinct-states.test.ts | passing | complete |
| A8 | Fixture-driven Foundry sequence (9 operations) | apps/mission-control/src/spikes/foundry/sequence.ts; captures | sequences.test.ts | complete |
| A9 | Mind sequence (8 operations) | apps/mission-control/src/spikes/mind/sequence.ts; captures | sequences.test.ts | complete |
| — | Event-model expansion (47 named events) | packages/agent-contracts/src/events.ts (56 operational, 18 knowledge) | transitions.test.ts, schemas.test.ts | complete |
| — | Permission invariant correction | constitution/AUTHORITY_TIERS.md, permission-matrix.test.ts | passing | complete |
| — | Owner art-direction checkpoint | docs/process/ART_DIRECTION_CHECKPOINT.md, docs/decisions/proposed/OD-0002 | awaiting owner | defined |

## Acceptance criteria (section 13)

| AC | Criterion | Evidence | Status |
|---|---|---|---|
| 1 | Role separation and owner-only merge | permission matrix tests; `merged_by_owner` guard `actor_is_owner`; authority violation replay test | met |
| 2 | Operational truth, read model, wiki separated | SYSTEM_ARCHITECTURE separation table; knowledge SCHEMA anti-drift; copied-live-state scan fixture | met |
| 3 | Deterministic gates distinct from LLM judgment | gate-engine (18 gates) vs REVIEW_POLICY; scenario expected detectors | met |
| 4 | Non-overlapping permissions and stop conditions | permission-matrix.test.ts | met |
| 5 | Repair limit encoded in authority and transitions | authority.json repairLimits; guard `repair_cycle_within_limit`; repairLimitRun test; gate test | met |
| 6 | Event model supports replay | replay.test.ts (scrub, frames, determinism) | met |
| 7 | Two worlds map to entities and events | animation grammar covers all 74 event types; seed galaxy derived from the real graph | met |
| 8 | Distinct purposes, shared art, defined transition | TWO_WORLDS.md; ART_BIBLE.md; spikes share tokens and environment | met |
| 9 | Ontology distinguishes the eight classes plus live signals | EpistemicClass (9); derive tests classify from evidence | met |
| 10 | Tethers reproducible from inspectable sources | derive.test.ts reproducibility and immutability; 94/94 intact on the real tree | met |
| 11 | Art bible specific enough to prevent generic outcomes | ART_BIBLE prohibited treatments; checkpoint checklist | met |
| 12 | Both spikes credibly demonstrate the quality and epistemic language | 19 captures on a software renderer; refusal, contested, verified, sealed, phase-lock states visible | BLOCKED_PENDING_REAL_GPU_REVIEW |
| 13 | First playable slice tightly bounded and testable | PHASE_1_BRIEF.md | met |
| 14 | Wiki has provenance, linting, anti-drift | SCHEMA.md; knowledge-lint; 10 scan classes with fixtures | met |
| 15 | Security and prompt injection addressed before privileged integrations | THREAT_MODEL.md with enforcement status; settings deny rules (they denied this session a write to an accepted-decision path) | met |
| 16 | No other repository accessed | environment report; git remotes; session scope | met |
| 17 | No merge or deployment | branch-only pushes; no PR | met |
