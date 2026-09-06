# System architecture

Deliverable 7 (with `EVENT_MODEL.md`). Source: master commission section 6; Amendment 1 sections A, B and N. Status: Phase 0 design with executable cores for items 3, 6, 7 and 10 below.

## Boundaries

| # | Boundary | Responsibility | May create authority? | Phase 0 artifact |
|---|---|---|---|---|
| 1 | Presentation and 3D world | Render projected state; never invent or recompute workflow authority | No | `apps/mission-control` (spikes only) |
| 2 | Virgil orchestration service | Validate transitions, launch authorised single-hop stages, route sealed handoffs, produce owner reports | No. It applies authority that exists as events | Deferred to Phase 3; interface implied by `@virgil/domain` and `@virgil/agent-contracts` |
| 3 | Deterministic gate engine | Compute eligibility and integrity from machine evidence | No. It decides pass, fail or insufficient evidence | `packages/gate-engine` |
| 4 | Repository adapters | Collect Git and GitHub facts (SHAs, refs, checks, PRs, diffs) into evidence objects | No | Deferred to Phase 2; evidence shape fixed by `GateEvidence` |
| 5 | Agent runtime adapters | Launch Claude Code sessions with a grant, ingest `agent-result` records, emit tool and Git events | No | Deferred to Phase 3; contracts fixed |
| 6 | Event store | Append-only facts with monotonic `seq` per stream | Holds authority events; creates none | JSON fixtures in `packages/test-fixtures`; storage engine deferred (ADR-0006) |
| 7 | Read model | Derived state rebuilt from events: candidate state, deployment state, checks, findings, seals, grants, handoffs, files | No | `packages/domain` reducer and replay |
| 8 | Knowledge layer | Durable documentation with provenance; never live operational authority | No | `knowledge/` |
| 9 | Knowledge compiler and provenance graph | Raw-to-wiki operations, contradiction and supersession modelling, tether validation, Mind Scan | No | `packages/knowledge-graph` (derivation), compiler deferred to Phase 1 |
| 10 | World projection layer | Deterministic mapping from operational and epistemic state to Foundry and Mind objects | No | `packages/visual-language` |
| 11 | Secrets and permissions boundary | Credentials outside source control; role permissions as data | Owner only | `constitution/`, `.claude/settings.json`, threat model |

## Data flow

```text
owner decision ─┐
agent result ───┼─► orchestration (validates against authority.json, permission matrix, gate engine)
git/github ─────┘        │ append
                         ▼
               event store (facts, seq-ordered)
                         │ fold (packages/domain)
                         ▼
                    read model ──► world projection (packages/visual-language) ──► Foundry / Mind rendering
                         │                                                              ▲
                         └─► verified run record ──► Mind gateway ──► raw source record ─┘ (knowledge events)
```

Presentation subscribes to the read model and to the event stream for animation triggers. It has no write path. Every authenticated animation requires the triggering event and its evidence class per the Operational Animation Grammar.

## Authority location

- Owner decisions: files under `docs/decisions/OD-*.md` plus `owner_decision` events. Nothing infers one.
- Role permissions: `constitution/permission-matrix.json`.
- Tiers, repair limits, states and transitions: `constitution/authority.json`, loaded at runtime by `@virgil/domain`.
- Gates: `packages/gate-engine`. A failing gate cannot be overridden by any agent output.

## Separation of truths

| Truth | Lives in | Never lives in |
|---|---|---|
| Operational facts (SHAs, refs, checks, PRs, grants) | Git, GitHub, event store | wiki, presentation state |
| Derived operational status | `@virgil/domain` read model, rebuilt from events | prose |
| Durable knowledge | `knowledge/wiki` with tethers | event store |
| Presentation state (camera, selection, quality tier) | client | event store, wiki |

## Single-hop stage execution (Phase 3 shape)

1. Virgil finds the next already-authorised stage from the read model and the grants in force.
2. It emits `stage_assignment` with a grant reference; the runtime adapter launches the role with only its permitted tools and boundary.
3. The role emits tool, Git and governance events with evidence and ends with an `agent-result`.
4. The gate engine evaluates the relevant gate report; the reducer applies the resulting transition or records the rejection.
5. Virgil routes the sealed handoff or halts with `owner_decision_required` and one recommended default.

## Deferred components

`apps/orchestration-service` (Phase 3), `packages/repository-adapters` (Phase 2), `packages/knowledge-compiler` (Phase 1 minimal, Phase 5 production), storage engine for the event store (Phase 2), hooks for per-role write enforcement (Phase 3).
