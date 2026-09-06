# Event model

Deliverable 7. Source: master commission section 6 and Amendment 1 "Event-model amendments". Implementation: `packages/agent-contracts/src/events.ts` (schemas), `packages/domain` (transitions, reducer, replay). Exported schema: `schemas/domain-event.schema.json`.

## Envelope

Every event is a fact with: `eventId`, `seq` (monotonic per stream), `streamId`, `authority` (`operational` or `knowledge`), `type`, `occurredAt`, `recordedAt`, `actor` (kind, role, session), optional `authorityGrantId`, `evidence[]` (machine or structured references, never prose), optional `causedBy`, `durability`, and a typed `payload`.

The log stores facts. Derived status is rebuilt by folding. Out-of-order `seq` is rejected and recorded.

## Operational events (56)

Lifecycle: `idea_received`, `scope_proposed`, `scope_approved`, `plan_completed`, `work_order_created`.
Authority: `authority_granted`, `authority_revoked`, `agent_assigned`, `agent_started`, `agent_waiting`, `agent_result_received`.
Tool activity: `file_read`, `repository_searched`, `file_created`, `file_modified`, `file_moved`, `file_deleted`, `command_started`, `command_completed`, `command_failed`.
Git manufacturing: `branch_created`, `worktree_created`, `changes_staged`, `candidate_committed`, `push_started`, `candidate_pushed`, `push_failed`, `remote_artifact_mismatch`, `pr_opened`, `candidate_changed_after_review`.
Handoff: `handoff_prepared`, `handoff_started`, `handoff_received`.
Verification: `verification_started`, `check_started`, `check_passed`, `check_failed`, `check_skipped`, `verification_completed`.
Review and repair: `review_started`, `finding_raised`, `review_passed`, `review_blocked`, `review_insufficient_evidence`, `candidate_quarantined`, `adjudication_completed`, `repair_authorised`, `repair_started`, `repair_completed`.
Gate and owner: `safe_to_merge`, `merged_by_owner`, `deployment_started`, `deployment_failed`, `deployed`, `owner_decision_required`, `owner_decision`.

All 47 types named in Amendment 1 are present. `review_blocked` and `review_insufficient_evidence` carry the two non-passing verdicts; `owner_decision`, `work_order_created`, `agent_assigned` and `agent_result_received` complete the chain.

## Knowledge events (18)

`raw_source_added`, `raw_source_hashed`, `raw_source_read`, `run_record_deposited`, `knowledge_compilation_proposed`, `knowledge_compilation_approved`, `wiki_page_created`, `wiki_page_updated`, `provenance_tether_created`, `provenance_tether_broken`, `claim_supported`, `claim_contested`, `claim_superseded`, `knowledge_gap_detected`, `wiki_lint_started`, `wiki_lint_finding_raised`, `wiki_lint_completed`, `knowledge_output_generated`.

`run_record_deposited` is the Mind gateway event: it references an operational run record as evidence and creates a raw source record. It does not create a wiki page. A wiki compilation event cannot manufacture a repository fact; an agent completion cannot create verified durable knowledge.

## Durability boundary

| Class | Meaning | Examples | Retention |
|---|---|---|---|
| `durable_audit` | Permanent facts about authority, artifacts, verification, review, owner decisions and knowledge authority | grants, commits, pushes, checks passed/failed/skipped, findings, verdicts, merges, deployments, raw source hashes, tethers | Never compacted |
| `replayable_operational` | Facts needed to replay a run's working detail; may be compacted to a summary after the run is archived and its durable facts are sealed | file reads, searches, edits, command start/complete, staging, check starts, agent waiting, raw source reads | Kept for the run's replay window; compaction is itself a recorded fact |
| ephemeral telemetry | Signals that are never events: `agent_heartbeat`, `render_frame_stats`, `cursor_position`, `progress_estimate`, `network_latency` | schema `telemetry-signal` | Never appended; never drives an authenticated animation |

Every catalogued event carries a default durability class; a producer may raise it to `durable_audit`, never lower it. The visual layer may only animate authenticated work from events of the first two classes.

## Candidate state machine

The fifteen states and the transition table are in `constitution/authority.json` and explained in `constitution/STATE_LANGUAGE.md`. The reducer applies them in three stages, described in full in `ENFORCEMENT_BOUNDARIES.md`: event validation (`packages/domain/src/validation.ts`), then the transition table with its guards (`guards.ts`), then on-transition effects. A rejected event is recorded with a kind (`order`, `authority`, `consistency`, `transition`) and applies no effect.

Guard names are fixed by `authority.json`. Their implementations derive every answer from recorded facts; no guard trusts a payload's claim about those facts:

| Guard | Rule (as implemented after the foundation repair) |
|---|---|
| `result_claims_complete` | builder claimed completion (claim only) |
| `check_is_required` | the failing check was declared required by `verification_started` or recorded as required |
| `review_eligibility_gate_passes` | every required check of the active verification has a recorded `passed` result with exit 0 on the current SHA; pushed, remote SHA equals head, no mismatch. The payload's `allRequiredCompleted` is not consulted |
| `required_checks_missing` | a required check is absent, `running` or `skipped` in the recorded checks |
| `required_check_failed` | a required check has a recorded `failed` result |
| `reviewer_independent_of_builder` | reviewer session is not a builder, repairer or Prover session of this lineage, and reviews the current SHA |
| `verdict_pass`, `verdict_pass_with_non_blocking` | verdict vocabulary |
| `all_merge_gates_pass[_and_review_passed]` | fresh non-stale seal on the current SHA, passing verdict, verification signature on the same SHA, pushed and remote-equal, no blocking unrepaired finding |
| `repair_cycle_within_limit` | payload cycle equals the derived count plus one; ≤1 without owner; cycle 2 only with a recorded, unconsumed owner decision of kind `additional_repair_round`; never 3 |
| `new_sha_differs_from_reviewed_sha` | the new SHA is the committed current head and differs from the previous SHA and every sealed SHA |
| `actor_is_owner` | owner actor citing a recorded, unconsumed owner decision of kind `merge` (the exact-SHA and merge-gate checks for `merged_by_owner` run in event validation) |
| `deploy_authority_present` | owner or system actor citing a recorded owner decision of kind `deployment` for the merged SHA |

`repairCycles` is incremented by the reducer on each accepted `repair_authorised`; the payload count is only checked against it. `owner_decision_required` records a safe resume state (the review state eligibility was earned from when halting from `SAFE_TO_MERGE`; `QUARANTINED`, with the repair contract withdrawn, when halting from `REPAIR_AUTHORISED`; otherwise the state it left). An `owner_decision` may resume only into that recorded state or an allowlisted state (`BUILDING`, `BUILDER_REPORTED_COMPLETE`, `VERIFICATION_INCOMPLETE`, `BLOCKED`, `INSUFFICIENT_EVIDENCE`, `QUARANTINED`, `RE_REVIEW_REQUIRED`); the review states are resumable only when recorded with their invariant intact; `SAFE_TO_MERGE`, `MERGED`, `DEPLOYED` and `REPAIR_AUTHORISED` are never resume targets. In `MERGED` and `DEPLOYED` an `owner_decision_required` records the question without leaving the terminal state. Status: implemented now, validated by `adversarial.test.ts` and `resume-and-paths.test.ts`, pending independent review (`ENFORCEMENT_BOUNDARIES.md`).

Before the repair, `review_eligibility_gate_passes` read `allRequiredCompleted` from the payload, `repair_cycle_within_limit` accepted any string as an owner decision id, `actor_is_owner` accepted any decision id, `deploy_authority_present` accepted any grant id, reviewer independence covered builder sessions only, and the resume state was recorded after the state had already changed. Those were Keeper findings K-01 to K-03.

## Timeline replay

`replay`, `replayTo(seq)` and `replayFrames` in `packages/domain/src/replay.ts` rebuild state at any event. Each frame exposes what was believed (state), which artifact existed (`shaHistory`, `currentSha`), which authority was active (`grants`), and why the transition happened (`transitions[].guard`). Replay resumes only from real events; an interrupted handoff stays at its last proven position because no event advances it.

## Tests

`packages/domain/test`: transition table integrity, replay of passing, blocked-and-repaired, repair-limit, stale-review and authority-violation runs, determinism, out-of-order rejection, distinct-state guarantees, `adversarial.test.ts`, which reproduces every exploit in Keeper findings K-01, K-02 and K-03 and asserts rejection with no effect, and `resume-and-paths.test.ts` (resume-target allowlist, replayed decisions, repair authorisation under a scope decision, path traversal). `packages/agent-contracts/test`: every fixture event validates under both Zod and the exported JSON Schema; `paths.test.ts` covers the shared path normaliser.
