# Enforcement boundaries: reducer, gate engine, orchestration

Status: written during the Phase 0 foundation repair (Keeper findings K-01 to K-07, K-15, K-18) and extended in the consolidation branch to the owner's binding repair requirements (resume-target allowlist, repair authorisation under a recorded owner decision, repository path normalisation, permission-overlap tests). The repaired authority system described here is **pending fresh independent Keeper review and owner acceptance**. Nothing in this document ratifies it.

Three different mechanisms enforce the constitution, and earlier documents blurred them. This document says exactly which mechanism enforces what today, and what no mechanism enforces yet.

## Status vocabulary

Every claim of enforcement in this repository's documentation uses one of four statuses, and only one:

| Status | Meaning |
|---|---|
| **implemented now** | Code on this branch performs the check. |
| **validated by tests** | A test on this branch fails if the check is removed or weakened; named by file. |
| **design-level only** | Described in a document or a role definition; no code performs it. |
| **deferred to a privileged runtime** | Requires session launching, hooks, identity binding or live Git/GitHub adapters (Phases 2 and 3); no code performs it and none can until that runtime exists. |

"Implemented now" without "validated by tests" is a weaker claim and is stated as such.

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
| `owner_decision`, `scope_approved` | Owner actor; new decision id (a replayed decision id is rejected); `owner_decision` cites its own id as evidence. While the lineage is `OWNER_DECISION_REQUIRED`, the resume target (`resumesTo`, or the recorded safe resume state when omitted) must be: on the explicit allowlist (`BUILDING`, `BUILDER_REPORTED_COMPLETE`, `VERIFICATION_INCOMPLETE`, `BLOCKED`, `INSUFFICIENT_EVIDENCE`, `QUARANTINED`, `RE_REVIEW_REQUIRED`); or a review state (`READY_FOR_REVIEW`, `REVIEW_IN_PROGRESS`, `PASS_WITH_NON_BLOCKING_FINDINGS`) that equals the recorded pre-halt state with its invariant intact. `SAFE_TO_MERGE`, `MERGED`, `DEPLOYED`, `REPAIR_AUTHORISED` and `OWNER_DECISION_REQUIRED` are never resume targets, for any actor (`resumeTargetProblem` in `validation.ts`) |
| `authority_granted` | Owner or Virgil actor; new grant id; known role and tier; tier within the role's `maxTier`; `TIER_3` only from the owner; Virgil may grant beyond `TIER_1` only after `scope_approved`; every permitted path must normalise (no traversal, absolute, encoded or backslash forms) and, unless issued by the owner, must not reach a protected boundary from `authority.json` |
| `authority_revoked` | Owner or Virgil actor; grant recorded |
| `agent_started` | Actor session and role equal the payload; grant recorded, unrevoked, unexpired and issued to that role; a session never re-registers under another role |
| `agent_result_received` | Actor session equals the payload session |
| `file_created`, `file_modified`, `file_moved`, `file_deleted`, `changes_staged` | Every path normalises; an agent actor needs a recorded, unrevoked grant and every path must be permitted by that grant's paths (`pathPermitted`, normalised on both sides). A rejected write records no file state |
| `file_read`, `repository_searched`, `candidate_committed` | Every path and manifest entry normalises; a commit belongs to the same lineage and its parent is the current head |
| `verification_started`, `check_*`, `verification_completed` | Actor is a registered Prover session or the system, never a builder or repairer; verification id is the active one; SHA is the current candidate; a check declared required cannot be re-declared optional; `check_passed` needs exit 0, `check_failed` a non-zero exit; the completion payload's `allRequiredCompleted`, `anyRequiredFailed` and `results` must agree with the recorded checks or the event is rejected |
| `review_started` | Agent actor whose session and role equal the payload; the role is a review-stage role in the permission matrix; the session is registered under a grant for that role |
| `finding_raised` | Agent session that did not build or repair the candidate; finding ids are never reused |
| `review_passed`, `review_blocked`, `review_insufficient_evidence` | The report is the open seal; the actor is the session that opened it; the SHA is the sealed SHA; the verdict matches the event type; findings belong to the report; a passing verdict is rejected while the report holds a blocking finding not rejected by adjudication |
| `candidate_quarantined` | SHA is current |
| `adjudication_completed` | Registered Arbiter session, not tainted by building, repairing or verifying this candidate; findings recorded; cycle count is the next cycle |
| `repair_authorised` | Owner or Virgil actor; a recorded owner `scope_approved` decision exists (the Tier 2 authority under which one bounded repair is permitted); lineage and current SHA; a recorded adjudication defines the contract with the same findings and cycle; every permitted file normalises and, unless issued by the owner, stays outside protected boundaries |
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

On an accepted `repair_authorised` the reducer increments `repairCycles` itself and marks the cited decision consumed. On an accepted `merged_by_owner` it marks the merge decision consumed.

`owner_decision_required` records a **safe resume state** (`safeResumeStateFor` in `guards.ts`), never an eligibility state: a halt from `SAFE_TO_MERGE` records the review state eligibility was earned from, so a fresh `safe_to_merge` gate decision must re-earn it after the owner decides; a halt during an authorised repair withdraws the active contract (recorded in `withdrawnRepairContractIds`) and returns the candidate to `QUARANTINED`, with the cycle still counted; any other halt records the state it left. In the terminal states `MERGED` and `DEPLOYED` the reducer records the owner question as a fact and keeps the state, because a merge that happened cannot be suspended and no safe resume target exists for it. That last rule is reducer policy narrowing the `*` wildcard of `authority.json` for two states; it is reported to the owner, not encoded in the owner-controlled table.

Soft events (`softLineageEvents`) are no-ops only when the table lists no transition for the current state; a failed guard is recorded, except `agent_result_received` without a completion claim. Deployment events are never soft.

### What the reducer does not enforce (deferred to a privileged orchestration boundary)

Everything below is **deferred to a privileged runtime**. It cannot be determined from the event log alone, and no document on this branch claims otherwise.

- That `actor.sessionId`, `actor.kind` and `actor.roleId` are truthful. The reducer validates the recorded identity against grants and registrations; the event store and the Phase 3 launcher must bind the identity to a real session.
- Per-role write boundaries on disk. The reducer rejects file, staging and manifest events outside the actor's granted paths, but only as recorded; a Bash-mediated write that emits no event is invisible to it. PreToolUse hooks (Phase 3) close that gap.
- Any Git or GitHub fact. `candidate_pushed`, `remote_artifact_mismatch`, `candidate_committed` and `candidate_changed_after_review` are trusted as recorded by the adapter; live local and remote comparison is Phase 2.
- Declared `independentOfSessions` on a review: it is recorded, not used; independence is derived from builder, repairer and Prover sessions.
- Repository allowlisting (`docs/security/REPOSITORY_ALLOWLIST.md`): the gate `repository_allowlisted` exists over evidence objects; no adapter supplies that evidence yet.
- Evidence collection for the gate engine and the bridge from a passing merge-eligibility report to a `safe_to_merge` event.

## Repository paths

Implemented now and validated by tests (`packages/agent-contracts/test/paths.test.ts`, `packages/gate-engine/test/gates.test.ts`, `packages/domain/test/resume-and-paths.test.ts`): one normaliser in `@virgil/agent-contracts` (`paths.ts`) is used by the `RepoPath` and `RepoPathPattern` contracts, by the gate `diff_within_permitted_paths` and by the reducer. It rejects, rather than resolves, absolute paths, drive letters, home-relative paths, URLs, backslashes, NUL bytes, percent-encoded separators or dots, and any `..` segment; it collapses `.` segments and repeated separators before comparison. A path that cannot be normalised is never permitted and never matches a pattern, so `apps/x/../../constitution/authority.json` cannot satisfy `apps/**`.

## Permission matrix and session tooling

Validated by tests (`packages/agent-contracts/test/permission-matrix.test.ts`, "tool and write-authority overlap"): a role has write tools if and only if it has a write boundary; only the Fabricator holds a boundary inside the candidate worktree; stage launching is exclusive to the role with the `Agent` tool; the three placeholder boundaries are each held by one role; concrete boundaries normalise, never nest across roles and never reach a protected boundary; and `.claude/settings.json` denies both `Write` and `Edit` for every path-shaped protected boundary in `authority.json`. These tests check data agreement between files; they do not make the runtime enforce the matrix (deferred, above).

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
| 13 | No schema weakened, no check removed | `schemas/` regenerated without change; gate engine path matching strengthened, no gate removed | `pnpm check` |
| 14 | Not ratified on the owner's behalf | this status line; run record | — |
| 15 | `resumesTo` restricted to the recorded safe state or the explicit allowlist; privileged and terminal states excluded | Stage 1 `resumeTargetProblem`; `safeResumeStateFor` on halt | `resume-and-paths.test.ts` K-01 block |
| 16 | Repair cycles survive replayed owner decisions | Duplicate decision ids rejected; count from accepted transitions; one-shot consumption | `resume-and-paths.test.ts` "replayed owner decision" |
| 17 | Repair authorisation requires a recorded owner decision | Stage 1 `repair_authorised` (scope decision; cycle 2 additional-round decision) | `resume-and-paths.test.ts` K-03 block |
| 18 | Repository paths normalised; traversal cannot escape an authorised pattern | `@virgil/agent-contracts` paths; Stage 1 path rules; gate `diff_within_permitted_paths` | `paths.test.ts`, `gates.test.ts`, `resume-and-paths.test.ts` |
| 19 | Permission tests detect tool/write-authority overlap | data tests over the matrix, agent definitions and settings | `permission-matrix.test.ts` |

Rows 1 to 11 and 15 to 19 are **implemented now** and **validated by tests**. Rows 12 and 14 are documentation. Nothing in this table is accepted until the fresh independent review and the owner's decision.
