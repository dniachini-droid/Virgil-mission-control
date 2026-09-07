# Phase 0 foundation repair run record

Consolidation note: the three commits this record describes were cherry-picked, unchanged, into the single consolidation branch, and the further requirements the owner attached to them (resume-target allowlist, repair authorisation under a recorded owner decision, path normalisation, permission-overlap tests) were added there; see `CONSOLIDATION_RUN_RECORD.md`. The repair branch named below is superseded by that consolidation and can be deleted by the owner after the merge. The text below is kept as the repair session wrote it.

Session: Claude Code, repository `dniachini-droid/Virgil-mission-control`. Authority: the owner's written repair instruction for this session, bounded to Keeper findings K-01, K-02, K-03, K-15 and the documentation and traceability claims overstated by K-01 to K-07 and K-18. No pull request, merge, deployment or Phase 1 work.

## Base and branch

- Base SHA: `4b834a4b496bb07a45bfb8c9ca1f0384b644b1f3` (head of `claude/virgil-phase-0-plan-kp7g38`).
- Requested branch: `claude/virgil-phase-0-foundation-repair`. The harness assigned `claude/virgil-phase-0-foundation-repair-qatfj9`; that branch is used and reported.
- Final SHA: the head of that branch as reported in the session's final output. A fresh independent Keeper reviews that exact SHA. This file cannot contain the SHA of the commit that includes it.

## Status

**Repaired, pending fresh independent review and owner acceptance.** This session does not ratify the repaired authority system. Its own report is not evidence; the deterministic checks below and the next Keeper review are.

## Findings addressed

| Finding | Exploit on the base SHA | Repair |
|---|---|---|
| K-01 owner-decision bypass | `owner_decision` from any actor, citing any string, resumed into any state including `SAFE_TO_MERGE`; the recorded resume state was always `OWNER_DECISION_REQUIRED` because it was captured after the state changed | Owner actor and self-citing evidence required; the decision is recorded in `run.decisions`; resume into a protected state only when it is the recorded pre-halt state and its invariant holds; `resumeState` records the halted-from state |
| K-01 repair-limit bypass | Cycle 2 accepted with any `ownerDecisionId` string; `repairCycles` copied from the payload; no adjudication needed | Decision must be recorded by an owner event, of kind `additional_repair_round`, unconsumed, and is consumed on use; the reducer increments the count; a recorded Arbiter adjudication must define the contract; only the owner or Virgil may authorise |
| K-01 merge and deploy | `merged_by_owner` needed only an owner actor and a decision id string; `deployment_started` accepted any grant id | Merge needs a recorded, unconsumed `merge` decision, the exact current SHA and all merge gates re-checked; deploy needs a recorded `deployment` decision from the owner or the system for the merged SHA; `deployed` needs a started deployment. Deployment events are no longer silently dropped outside `MERGED` |
| K-02 payload-trusted verification | `verification_completed` with `allRequiredCompleted: true` reached `READY_FOR_REVIEW` while a required check was skipped, failed or absent; a later `check_skipped` could re-declare a required check optional | Eligibility derives from recorded `check_*` events for the active verification; a payload that contradicts them is rejected; required checks cannot be downgraded; exit codes must match results; verification facts must come from a registered Prover session or the system |
| K-03 actor and authority validation | Grants, revocations, agent starts, reviews, verdicts, adjudications, findings, gate decisions and repairs were recorded from any actor with any identity | `packages/domain/src/validation.ts` validates actor kind, session identity, role registration under a live grant, tier limits, protected-boundary paths, cited-decision existence and consistency with recorded facts |
| K-03 reviewer independence | Only builder sessions were excluded; a repairer or the Prover could review | Builder, repairer and Prover sessions are tracked per lineage; a session cannot re-register under another role; the verdict must come from the session that opened the review |
| K-15 stale seed graph | `seed-graph.json` differed from a fresh derivation (hash and node list) and nothing tested it | Projection moved into `packages/knowledge-graph/src/seed.ts`; the export script and a freshness test share it; the file was regenerated; the test fails when it is stale |
| K-04 to K-07, K-18 documentation | `EVENT_MODEL.md`, `THREAT_MODEL.md`, `PHASE_0_TRACEABILITY.md`, `PHASE_0_RUN_RECORD.md` and `TEST_STRATEGY.md` described the above as enforced | Corrected; `docs/architecture/ENFORCEMENT_BOUNDARIES.md` states what the reducer, the gate engine and future orchestration each enforce |

## Files changed

- `packages/domain/src/{state,guards,validation,reducer,transitions,index}.ts`
- `packages/domain/test/{adversarial,replay,distinct-states}.test.ts`
- `packages/test-fixtures/src/runs/foundry.ts` (the blocked-and-repaired and repair-limit runs now record the Arbiter grant, adjudications, findings and repair grants the reducer requires; the passing, stale-review and authority-violation runs are unchanged)
- `packages/test-fixtures/knowledge/seed-graph.json` (regenerated)
- `packages/knowledge-graph/src/{seed,index}.ts`, `scripts/export-seed-graph.ts`, `test/seed-graph.test.ts`
- `docs/architecture/{ENFORCEMENT_BOUNDARIES,EVENT_MODEL}.md`, `docs/security/THREAT_MODEL.md`, `docs/process/{PHASE_0_TRACEABILITY,PHASE_0_RUN_RECORD,PHASE_0_FOUNDATION_REPAIR_RUN_RECORD}.md`, `docs/testing/TEST_STRATEGY.md`, `CLAUDE.md`, `README.md`

Not changed: `constitution/`, `docs/decisions/OD-*`, `docs/product/`, `knowledge/raw/`, `schemas/`, `packages/gate-engine/`, `packages/visual-language/`, `apps/mission-control/`, `.claude/agents/`.

## Contradictions reported, not resolved

1. `constitution/REPAIR_LIMITS.md` says "the gate engine refuses a `repair_authorised` transition beyond the limit". The gate engine evaluates evidence objects and refuses no transitions; the reducer does. Owner-controlled text; reported.
2. `docs/process/PHASE_1_BRIEF.md` lists `packages/domain/src/transitions.ts` as protected. This repair edited its `softLineageEvents` set (deployment events are no longer soft) and added `guardSoftEvents`, under the owner's repair instruction. The transition table itself was not changed.
3. `docs/testing/TEST_STRATEGY.md` says tests for authority are protected and need the same authority as what they protect. The domain tests changed here are the ones the Keeper found insufficient; the change is under the owner's repair instruction and is itself pending review.

## Checks run

Recorded in the session's final output: `pnpm check` (biome, typecheck across all workspace targets, unit tests), `pnpm --filter @virgil/knowledge-lint run lint`, `pnpm build` (Vite production build), the seed-graph freshness test red on the stale file and green after regeneration.

## Remaining limitations

- The reducer trusts `actor.sessionId` as recorded. Session identity binding is Phase 3 orchestration work.
- `independentOfSessions` on a review is recorded, not checked against the derived taint set.
- The gate engine and the reducer share the owner-decision kind vocabulary by literal strings (`merge`, `deployment`, `additional_repair_round`); it is not yet a schema enum.
- Decisions are recorded per run. A decision made outside a run must be recorded in it by an owner `owner_decision` event before it can be cited.
- Single lineage per run remains, as in Phase 0.
- The gate engine was not changed; evidence collection for it remains Phase 2.

## Next action

A fresh independent Keeper reviews the exact final SHA of `claude/virgil-phase-0-foundation-repair-qatfj9` against this record and the owner's binding requirements.
