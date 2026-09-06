# Phase 0 traceability matrix

## Foundation repair after the Keeper's review

The Keeper's review of the Phase 0 branch found that several rows below overstated what the domain reducer enforced (K-01 owner-decision and repair-limit bypasses; K-02 `verification_completed` trusting contradictory payload data; K-03 missing actor, authority, decision and reviewer-independence validation; K-04 to K-07 and K-18 documentation and traceability claims resting on them; K-15 a stale seed graph with no freshness check). The repair is recorded in `PHASE_0_FOUNDATION_REPAIR_RUN_RECORD.md` and, with the owner's further requirements (resume-target allowlist, repair authorisation under a recorded owner decision, path normalisation, permission-overlap tests), consolidated on the branch recorded in `CONSOLIDATION_RUN_RECORD.md`. The layers of enforcement are stated in `docs/architecture/ENFORCEMENT_BOUNDARIES.md`.

Status vocabulary (from that document): **implemented now**, **validated by tests**, **design-level only**, **deferred to a privileged runtime**. Rows marked **repaired, pending review** are implemented now and validated by the named tests on this branch; they are not accepted until a fresh independent Keeper reviews the exact final SHA and the owner accepts it. Rows describing Phase 0 as reviewed keep their original status where the Keeper did not contest them.

Maps every required output (commission section 11, Phase 0; Amendment 1 "Phase 0 deliverable amendments") and every acceptance criterion (section 13) to files and to the check that proves it. Status values: complete, complete-with-limitation, blocked.

## Deliverables (section 11)

| # | Output | Files | Proof | Status |
|---|---|---|---|---|
| 1 | Repository inspection and environment report | docs/process/PHASE_0_ENVIRONMENT_REPORT.md | — | complete |
| 2 | Final repository architecture | docs/architecture/REPOSITORY_ARCHITECTURE.md; workspace files | `pnpm check` | complete |
| 3 | Product vision and V1 boundary | docs/product/PRODUCT_VISION.md, V1_BOUNDARY.md | — | complete |
| 4 | Governance constitution | constitution/*.md, authority.json | agent-contracts `AuthorityConfig` test; domain transition tests | complete; one contradiction reported, not resolved: `REPAIR_LIMITS.md` attributes transition refusal to the gate engine, the reducer performs it |
| 5 | Agent roster and permission matrix | .claude/agents/*.md (14), constitution/permission-matrix.json, docs/process/PERMISSION_MATRIX.md, .claude/settings.json | permission-matrix.test.ts (29, of which 6 tool/write-authority overlap) | complete; overlap tests strengthened in consolidation (validated by tests; runtime enforcement of the matrix remains deferred) |
| 6 | Structured contracts | packages/agent-contracts, schemas/ (39, regenerated without change), docs/architecture/CONTRACTS.md, paths.ts | schemas.test.ts (13); paths.test.ts (6) | complete; `RepoPath` and `RepoPathPattern` now reject traversal by normalisation (validated by tests) |
| 7 | System architecture and event model | docs/architecture/SYSTEM_ARCHITECTURE.md, EVENT_MODEL.md, ENFORCEMENT_BOUNDARIES.md, packages/domain | domain tests (93, of which 52 adversarial and 11 consolidation regressions) | repaired, pending review (base delivered 30 tests over a reducer that trusted payload claims) |
| 8 | Threat model | docs/security/THREAT_MODEL.md, REPOSITORY_ALLOWLIST.md | path normalisation validated by tests (T6, T9); T1, T3, T5, T8, T9, T10 runtime enforcement deferred to a privileged runtime as recorded per row | complete-with-limitation; every row now carries a status from the vocabulary |
| 9 | Knowledge structure and SCHEMA.md | knowledge/ | knowledge-lint clean; derive tests | complete |
| 10 | Ontology and provenance graph | docs/architecture/KNOWLEDGE_ONTOLOGY.md, packages/knowledge-graph | derive.test.ts (6); seed-graph.test.ts (3) freshness | repaired, pending review (K-15: the committed seed graph was stale and untested) |
| 11 | Epistemic visual contract | packages/visual-language/data/epistemic-contract.json, docs/art-direction/EPISTEMIC_VISUAL_CONTRACT.md | contracts.test.ts (5) | complete |
| 12 | Two-world navigation and causation | docs/architecture/TWO_WORLDS.md | wiki tether intact (knowledge-lint) | complete |
| 13 | Art bible | docs/art-direction/ART_BIBLE.md plus companions | — | complete |
| 14 | Orbital Foundry spike | apps/mission-control /spike/foundry; docs/art-direction/spikes/foundry-*.png | build; sequences.test.ts; capture report | complete-with-limitation (software renderer) |
| 15 | Mind of Virgil spike | apps/mission-control /spike/mind; spikes/mind-*.png | as above | complete-with-limitation (software renderer) |
| 16 | Mind Scan design and fixtures | docs/architecture/MIND_SCAN.md, packages/test-fixtures/knowledge (12 trees), tools/knowledge-lint | lint.test.ts (15) | complete |
| 17 | Performance strategy and tiers | docs/architecture/PERFORMANCE_STRATEGY.md | none: no budget is measured or gated on any branch | design-level only (the document now says so; it previously read as enforced by a role) |
| 18 | Test and agent-evaluation strategy | docs/testing/TEST_STRATEGY.md, AGENT_EVALUATION.md, packages/test-fixtures | gates.test.ts (19); adversarial.test.ts (52); resume-and-paths.test.ts (11) | repaired, pending review (no adversarial reducer tests existed) |
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
| 1 | Role separation and owner-only merge | permission matrix tests; `merged_by_owner` from `SAFE_TO_MERGE` only, owner actor, recorded unconsumed merge decision, exact SHA, merge gates re-checked; no `owner_decision` can resume into `SAFE_TO_MERGE`, `MERGED` or `DEPLOYED`; adversarial merge and resume tests | repaired, pending review (base guard checked only that the actor was the owner and a decision id string existed) |
| 2 | Operational truth, read model, wiki separated | SYSTEM_ARCHITECTURE separation table; knowledge SCHEMA anti-drift; copied-live-state scan fixture | met |
| 3 | Deterministic gates distinct from LLM judgment | gate-engine (18 gates) vs REVIEW_POLICY; scenario expected detectors; ENFORCEMENT_BOUNDARIES.md separates gate, reducer and orchestration | met for the gate engine; the reducer half repaired, pending review |
| 4 | Non-overlapping permissions and stop conditions | permission-matrix.test.ts, including tool/write-authority overlap, boundary nesting, protected-boundary reach and settings deny coverage | met as data agreement (validated by tests); runtime enforcement of the matrix deferred to a privileged runtime |
| 5 | Repair limit encoded in authority and transitions | authority.json repairLimits; guard `repair_cycle_within_limit` over a reducer-derived count and a recorded, unconsumed owner decision; recorded adjudication and recorded owner scope decision required; a halt during repair withdraws the contract without resetting the count; replayed decisions rejected; repairLimitRun, adversarial and consolidation tests; gate test | repaired, pending review (base accepted any string as an owner decision id and took the count from the payload) |
| 6 | Event model supports replay | replay.test.ts (scrub, frames, determinism); invalid events recorded with a kind and no effect (adversarial.test.ts) | repaired, pending review |
| 7 | Two worlds map to entities and events | animation grammar covers all 74 event types; seed galaxy derived from the real graph and kept fresh by seed-graph.test.ts | repaired, pending review (K-15) |
| 8 | Distinct purposes, shared art, defined transition | TWO_WORLDS.md; ART_BIBLE.md; spikes share tokens and environment | met |
| 9 | Ontology distinguishes the eight classes plus live signals | EpistemicClass (9); derive tests classify from evidence | met |
| 10 | Tethers reproducible from inspectable sources | derive.test.ts reproducibility and immutability; 94/94 intact on the real tree | met |
| 11 | Art bible specific enough to prevent generic outcomes | ART_BIBLE prohibited treatments; checkpoint checklist | met |
| 12 | Both spikes credibly demonstrate the quality and epistemic language | 19 captures on a software renderer; refusal, contested, verified, sealed, phase-lock states visible; the owner inspected the Phase 0 spikes and the Phase 0.5 runtime rebuild and rejected both as an art baseline; the approved reference direction is recorded in `docs/decisions/proposed/OD-0002-art-direction-checkpoint.md` and imported under `docs/art-direction/approved/` | not met for the runtime executions (owner verdict FAIL, recorded as a proposal pending the owner's file move); the approved visual direction exists as reference imagery only |
| 13 | First playable slice tightly bounded and testable | PHASE_1_BRIEF.md | met |
| 14 | Wiki has provenance, linting, anti-drift | SCHEMA.md; knowledge-lint; 10 scan classes with fixtures | met |
| 15 | Security and prompt injection addressed before privileged integrations | THREAT_MODEL.md with a status from the vocabulary on every row; settings deny rules now cover `Write` and `Edit` on every path-shaped protected boundary (validated by tests); path normalisation (validated by tests) | repaired, pending review (T2, T3, T7, T8, T13 statuses were overstated; T6, T9, T15 restated) |
| 16 | No other repository accessed | environment report; git remotes; session scope | met |
| 17 | No merge or deployment | branch-only pushes; no PR | met |
