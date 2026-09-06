# Test and evaluation strategy

Deliverable 18 (with `AGENT_EVALUATION.md`). Source: master commission section 10; Amendment 1 outputs 5, 6 and 7. Agent definitions and orchestration policies are production assets and are tested as such.

## Layers, phase and Phase 0 status

| Layer (commission §10) | Where | Phase 0 status |
|---|---|---|
| Domain state-machine tests | `packages/domain/test` | 82 tests: table integrity, five fixture runs, distinct states, authority violations, out-of-order rejection, determinism, and 52 adversarial regressions (`adversarial.test.ts`) reproducing the exploits in Keeper findings K-01, K-02 and K-03; repaired, pending fresh review |
| Schema validation | `packages/agent-contracts/test` | Every schema rejects `{}`; constitution data validates; fixture events validate under Zod and Ajv; malformed events rejected |
| Gate-engine unit and integration | `packages/gate-engine/test` | 19 tests over 13 scenarios plus semantics (insufficient evidence never passes, claims cannot override, eligibility is not authority, repair limit) |
| Adapter contract tests | `packages/repository-adapters` | Phase 2; `GateEvidence` is the contract |
| Event replay tests | `packages/domain/test/replay.test.ts` | Implemented |
| Permission and prohibited-action tests | `packages/agent-contracts/test/permission-matrix.test.ts` | 23 tests: corrected invariant, definition agreement, tool vocabulary |
| Agent prompt and fixture evaluations | `docs/testing/AGENT_EVALUATION.md` | Design and fixtures; execution needs Phase 3 session launching |
| UI component tests | `apps/mission-control/test` | Sequence tests (6); component tests with a DOM arrive in Phase 1 |
| 3D interaction tests | — | Deferred to Phase 1 (label canvas needs a shim under Node) |
| Browser end-to-end journeys | `apps/mission-control/e2e` | Capture script exercises both routes at 19 steps; assertions arrive in Phase 1 |
| Visual regression at key cameras and states | `docs/art-direction/spikes` | Baselines captured; comparison arrives in Phase 1 on a GPU runner |
| Provenance-graph derivation and replay | `packages/knowledge-graph/test/derive.test.ts`, `seed-graph.test.ts` | Reproducibility, immutability, tether resolution, rank capping; the committed seed graph must match a fresh derivation byte for byte (K-15) |
| Knowledge compilation preserving immutability | `derive.test.ts` "never modifies raw sources" | Implemented for derivation and scan; compiler tests Phase 1 |
| Mind Scan fixtures | `packages/knowledge-graph/test/lint.test.ts` | 12 trees: every finding class plus a clean tree with zero findings |
| Visual-contract tests | `packages/visual-language/test` | 18 tests: no upgrade of authority, evidence gating, ambient cannot impersonate work, distinct states, role bible |
| Performance budgets | `docs/architecture/PERFORMANCE_STRATEGY.md` | Defined; measured in Phase 1 on real devices |
| Accessibility checks | HUD: keyboard stepping, aria-live Evidence View, focus styles | Automated axe checks in Phase 1 |

Totals: 130 unit tests at the Phase 0 base SHA; 186 after the foundation repair (agent-contracts 37, domain 82, gate-engine 19, knowledge-graph 24, visual-language 18, mission-control 6), one capture script, one Mind Scan CLI. `pnpm check` runs lint, typecheck and tests. Which mechanism each test exercises is set out in `docs/architecture/ENFORCEMENT_BOUNDARIES.md`.

## Amendment 1 proofs

- Output 5, evidence-gated animation: `contracts.test.ts` "refuses to animate an event that lacks its required evidence" and "refuses unknown event types and telemetry signals"; the Foundry spike's step 10 shows the refusal live.
- Output 6, ambient cannot impersonate work: `contracts.test.ts` "ambient animations claim no work…" and the role bible test "idle behaviour never describes work".
- Output 7, states remain distinct: `contracts.test.ts` "keeps skipped, failed, passed, reviewed, safe-to-merge, merged and deployed distinct by form" and `distinct-states.test.ts` in the domain package.

## Fixture suite

`packages/test-fixtures`: thirteen candidate scenarios (the twelve commissioned defect classes plus reviewer-shares-builder-session), five event-log runs, twelve knowledge trees, the Mind sequence, and the derived seed graph. Each scenario names its seeded defect, the expected detector (gate, prover, keeper, interface keeper or none) and expected gate outcomes.

## Quality metrics

Seeded defects caught; material defects missed; false blockers (the harmless candidate must pass every gate); unsupported findings; authority violations; scope expansion; invalid state transitions; cost and elapsed time; whether the agent stopped when evidence was insufficient. Gate-level metrics are measured now by the fixture tests; reducer-level authority violations are measured by the adversarial suite, which counts rejected events by kind (`authority`, `consistency`, `transition`, `order`); reviewer-level metrics are measured from Phase 3 (`AGENT_EVALUATION.md`).

## Rules

Never skip, disable or weaken a test to pass. A failing deterministic check is never a flake by assertion; re-run once only to confirm an infrastructure failure. Tests for authority (constitution, permissions, gates, grammar) are protected: changing them requires the same authority as changing what they protect.
