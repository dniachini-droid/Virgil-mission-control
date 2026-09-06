# Enforcement boundaries: reducer, gate engine, orchestration

Status: written during the Phase 0 foundation repair (Keeper findings K-01 to K-07, K-15, K-18). The repaired authority system described here is **pending fresh independent Keeper review and owner acceptance**. Nothing in this document ratifies it.

Three different mechanisms enforce the constitution, and earlier documents blurred them. This document says exactly which mechanism enforces what today, and what no mechanism enforces yet.

## The three layers

| Layer | Code | Input | What it decides | What it cannot do |
|---|---|---|---|---|
| Reducer (read model) | `packages/domain` | The append-only event log, in `seq` order | Whether each event is valid (actor, grant, cited decision, consistency with recorded facts) and, for lineage events, whether the transition in `constitution/authority.json` and its guard accept it | It cannot see Git, GitHub or the file system. It trusts that the event store recorded the actor honestly; binding a session identity to an event is orchestration work |
| Gate engine | `packages/gate-engine` | A `GateEvidence` object assembled by adapters | `pass`, `fail` or `insufficient_evidence` per gate, and an overall report per purpose | It consumes no events and applies no transition. It has no evidence until Phase 2 adapters exist; today only fixtures feed it |
| Orchestration (Phase 3) | none yet | Live sessions, Git, GitHub, gate reports | Launch a role under a grant, bind its session identity, collect evidence, translate a gate report into a `safe_to_merge` event, enforce per-role write boundaries with hooks | Nothing today. Every claim of "runtime enforcement" belongs here and is not delivered |

## Reducer enforcement (delivered, pending review)

`applyEvent` in `packages/domain/src/reducer.ts` runs three stages for every operational event. A rejected event is recorded in `invalidTransitions` with a `kind` (`order`, `authority`, `consistency`, `transition`) and a reason, and applies no effect: no auxiliary fact, no transition. Replay is deterministic over valid and invalid events alike.

### Stage 1: event validation (`validation.ts`)

| Event | Rule |
|---|---|
| any | Every `owner_decision` evidence reference names a decision already recorded in the run (except on the event recording it) |
| `owner_decision`, `scope_approved` | Owner actor; new decision id; `owner_decision` cites its own id as evidence. While the lineage is `OWNER_DECISION_REQUIRED`, a `resumesTo` naming a protected state is accepted only if it equals the recorded pre-halt state and that state's invariant still holds |
| `authority_granted` | Owner or Virgil actor; new grant id; known role and tier; tier within the role's `maxTier`; `TIER_3` only from the owner; Virgil may grant beyond `TIER_1` only after `scope_approved`; permitted paths issued by Virgil cannot reach a protected boundary from `authority.json` |
| `authority_revoked` | Owner or Virgil actor; grant recorded |
| `agent_started` | Actor session and role equal the payload; grant recorded, unrevoked, unexpired and issued to that role; a session never re-registers under another role |
| `agent_result_received` | Actor session equals the payload session |
| `candidate_committed` | Same lineage; parent is the current head |
| `verification_started`, `check_*`, `verification_completed` | Actor is a registered Prover session or the system, never a builder or repairer; verification id is the active one; SHA is the current candidate; a check declared required cannot be re-declared optional; `check_passed` needs exit 0, `check_failed` a non-zero exit; the completion payload's `allRequiredCompleted`, `anyRequiredFailed` and `results` must agree with the recorded checks or the event is rejected |
| `review_started` | Agent actor whose session and role equal the payload; the role is a review-stage role in the permission matrix; the session is registered under a grant for that role |
| `finding_raised` | Agent session that did not build or repair the candidate; finding ids are never reused |
| `review_passed`, `review_blocked`, `review_insufficient_evidence` | The report is the open seal; the actor is the session that opened it; the SHA is the sealed SHA; the verdict matches the event type; findings belong to the report; a passing verdict is rejected while the report holds a blocking finding not rejected by adjudication |
| `candidate_quarantined` | SHA is current |
| `adjudication_completed` | Registered Arbiter session, not tainted by building, repairing or verifying this candidate; findings recorded; cycle count is the next cycle |
| `repair_authorised` | Owner or Virgil actor; lineage and current SHA; a recorded adjudication defines the contract with the same findings and cycle |
| `repair_started`, `repair_completed` | The active repair contract; a Fabricator session under a valid grant |
| `safe_to_merge` | System or Virgil actor (a gate decision); lineage and current SHA |
| `merged_by_owner` | Lineage and current SHA; every merge gate holds (fresh verification signature, fresh passing seal, pushed and remote-equal, no unrepaired blocking finding) |
| `deployment_started`, `deployment_failed`, `deployed` | The merged SHA; a started deployment with the same id |

### Stage 2: transition table and guards (`transitions.ts`, `guards.ts`)

Guard names are fixed by `constitution/authority.json`. Each implementation derives its answer from the read model:

| Guard | Derived from |
|---|---|
| `review_eligibility_gate_passes` | Every check declared required by `verification_started` (or recorded as required) has a recorded `passed` result with exit 0 for the active verification on the current SHA; pushed, remote-equal, no mismatch |
| `required_check_failed`, `required_checks_missing` | The same recorded checks; a `skipped`, `running` or absent required check is missing, never passed |
| `reviewer_independent_of_builder` | Reviewer session is not among builder, repairer or Prover sessions of the lineage, and reviews the current SHA |
| `repair_cycle_within_limit` | Payload count equals the derived count plus one; beyond `maxCyclesWithoutOwner` it needs a recorded, unconsumed owner decision of kind `additional_repair_round`; never beyond `maxCyclesWithOwner` |
| `actor_is_owner` | Owner actor citing a recorded, unconsumed owner decision of kind `merge` |
| `deploy_authority_present` | Owner or system actor citing a recorded owner decision of kind `deployment` for the merged SHA |
| `new_sha_differs_from_reviewed_sha` | The new SHA is the committed current head, differs from the previous and from every sealed SHA |

On an accepted `repair_authorised` the reducer increments `repairCycles` itself and marks the cited decision consumed. On an accepted `merged_by_owner` it marks the merge decision consumed. `owner_decision_required` records the state it halted from as `resumeState`.

Soft events (`softLineageEvents`) are no-ops only when the table lists no transition for the current state; a failed guard is recorded, except `agent_result_received` without a completion claim. Deployment events are never soft.

### What the reducer does not enforce

- That `actor.sessionId` is truthful. The event store and the Phase 3 launcher must bind it.
- Per-role write boundaries on disk. Path checks in the reducer apply only to grant payloads.
- Any Git or GitHub fact. `candidate_pushed`, `remote_artifact_mismatch` and `candidate_changed_after_review` are trusted as recorded by the adapter.
- Declared `independentOfSessions` on a review: it is recorded, not used; independence is derived.

## Gate engine enforcement (delivered for fixtures only)

`packages/gate-engine` computes eighteen gates from a `GateEvidence` object and reports per purpose (review eligibility, merge eligibility, repair authorisation, deploy authority). Missing evidence is `insufficient_evidence`, never a pass. The engine is not changed by the foundation repair. Its owner-decision kinds (`merge`, `deployment`, `additional_repair_round`) are the vocabulary the reducer now requires.

The gate engine does not refuse transitions and does not count repair cycles per lineage; the reducer does. `constitution/REPAIR_LIMITS.md` says otherwise ("the gate engine refuses a `repair_authorised` transition"). That sentence contradicts the code and this document; it is reported to the owner, not resolved here, because the constitution is owner-controlled.

## Orchestration enforcement (not delivered)

Deferred to Phases 2 and 3, as the run record states: session launching with grants, session identity binding, per-role write hooks, live local and remote comparison, evidence adapters that fill `GateEvidence` from Git and GitHub, and the bridge that turns a passing merge-eligibility report into a `safe_to_merge` event. Until these exist, no privileged integration may be connected (threat model T1, T3, T5, T8, T9, T10).

## Binding requirements of the repair and where each is enforced

| # | Requirement | Enforced by | Regression test |
|---|---|---|---|
| 1 | `owner_decision` requires an owner actor and a recorded decision | Stage 1 | `adversarial.test.ts` K-01 resume block |
| 2 | `resumesTo` cannot reach a protected state through the wildcard | Stage 1 (`protectedStates`, invariant re-check) | K-01 resume block, seven protected states |
| 3 | Repair authorisation and cycle counts derive from recorded events | Stage 1 (adjudication), guard, on-transition increment, decision consumption | K-01 repair block |
| 4 | Verification eligibility derives from recorded checks | `derivedVerification`, Stage 1 consistency | K-02 block |
| 5 | A skipped required check cannot reach `READY_FOR_REVIEW` | Same | K-02 "skipped required" cases; `distinct-states.test.ts` |
| 6 | Grants, repairs, safe-to-merge and owner merge validate actor and cited decision | Stage 1, guards `actor_is_owner`, `deploy_authority_present` | K-01 merge block, K-03 block |
| 7 | `merged_by_owner` needs prior state, exact SHA, valid owner decision, owner actor | Table (from `SAFE_TO_MERGE` only), Stage 1, guard | K-01 merge block |
| 8 | Reviewer independence covers builders, repairers and Prover sessions | `taintedForReview`, Stage 1 role registration | K-03 independence cases |
| 9 | Deterministic replay; invalid events recorded | `reject()` with kinds; fingerprint tests | "invalid events are recorded explicitly" block |
| 10 | Adversarial tests for K-01, K-02, K-03 | — | `packages/domain/test/adversarial.test.ts` |
| 11 | Seed graph regenerated deterministically with a freshness test | `projectSeedGraph`, `export-seed-graph` | `packages/knowledge-graph/test/seed-graph.test.ts` |
| 12 | Documents distinguish the three layers | this document; corrected `EVENT_MODEL.md`, `THREAT_MODEL.md`, traceability | — |
| 13 | No schema weakened, no check removed | `schemas/` unchanged; gate engine unchanged | `pnpm check` |
| 14 | Not ratified on the owner's behalf | this status line; run record | — |
