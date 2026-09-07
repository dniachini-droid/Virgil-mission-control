# Enforcement boundaries: reducer, gate engine, orchestration

Status: written during the Phase 0 foundation repair (Keeper findings K-01 to K-07, K-15, K-18), extended in the consolidation branch to the owner's binding repair requirements (resume-target allowlist, repair authorisation under a recorded owner decision, repository path normalisation, permission-overlap tests), and extended again in the owner-authorised second repair round after the independent Keeper review of candidate `956be26` (findings KR-01, KR-02, KR-04, KR-05 repaired; KR-03, KR-06, KR-07, KR-09 recorded below as accepted gaps). The repaired authority system described here is **pending fresh independent Keeper review and owner acceptance**. Nothing in this document ratifies it.

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

`applyEvent` in `packages/domain/src/reducer.ts` runs four stages for every event. A rejected event is recorded in `invalidTransitions` with a `kind` (`order`, `contract`, `authority`, `consistency`, `transition`) and a reason, and applies no effect: no auxiliary fact, no transition. Replay is deterministic over valid and invalid events alike.

### Stage 0: contract (fail closed)

After the `seq` order check, every event is parsed against the `DomainEvent` contract from `@virgil/agent-contracts` (the same Zod source the JSON Schemas are exported from). An event that fails, for any reason (unknown type, unknown actor kind, malformed payload, traversal in a path, an `authority` tag other than `operational` or `knowledge`), is rejected with kind `contract` and applies nothing. Before the second repair round the reducer skipped validation for any authority tag it did not recognise and still applied effects (Keeper finding KR-02).

### Stage 1: event validation (`validation.ts`)

| Event | Rule |
|---|---|
| any | Every `owner_decision` evidence reference names a decision already recorded in the run (except on the event recording it) |
| `owner_decision`, `scope_approved` | Owner actor; new decision id (a replayed decision id is rejected); `owner_decision` cites its own id as evidence. While the lineage is `OWNER_DECISION_REQUIRED`, the resume target (`resumesTo`, or the recorded safe resume state when omitted) must be: on the explicit allowlist (`BUILDING`, `BUILDER_REPORTED_COMPLETE`, `VERIFICATION_INCOMPLETE`, `BLOCKED`, `INSUFFICIENT_EVIDENCE`, `QUARANTINED`, `RE_REVIEW_REQUIRED`); or a review state (`READY_FOR_REVIEW`, `REVIEW_IN_PROGRESS`, `PASS_WITH_NON_BLOCKING_FINDINGS`) that equals the recorded pre-halt state with its invariant intact. `SAFE_TO_MERGE`, `MERGED`, `DEPLOYED`, `REPAIR_AUTHORISED` and `OWNER_DECISION_REQUIRED` are never resume targets, for any actor (`resumeTargetProblem` in `validation.ts`) |
| `authority_granted` | Owner or Virgil actor; new grant id; known role and tier; tier within the role's `maxTier`; `TIER_3` only from the owner; Virgil may grant beyond `TIER_1` only after `scope_approved`; every permitted path must normalise (no traversal, absolute, encoded or backslash forms) and, unless issued by the owner, must not reach a protected boundary from `authority.json` |
| `authority_revoked` | Owner or Virgil actor; grant recorded |
| `agent_started` | Actor session and role equal the payload; grant recorded, unrevoked, unexpired and issued to that role; a session never re-registers under another role |
| `agent_result_received` | Actor session equals the payload session |
| `file_created`, `file_modified`, `file_moved`, `file_deleted`, `changes_staged` | Every path normalises. An agent actor must be registered under a grant, its actor role must be the registered role, the event must cite that session's own grant (not another session's), the grant must be unrevoked and unexpired at `occurredAt`, the role must be one the permission matrix allows to modify the candidate or its tests, and every path must be permitted by that grant (`pathPermitted`, normalised on both sides). Virgil holds no write boundary. Every accepted agent write records the session as a builder of the lineage. A rejected write records no file state (KR-01) |
| `file_read`, `repository_searched`, `candidate_committed` | Every path and manifest entry normalises; a commit by an agent must be by a registered Fabricator under its own live grant, and the committing session becomes a builder; a commit belongs to the same lineage and its parent is the current head |
| `verification_started`, `check_*`, `verification_completed` | Actor is a registered Prover session or the system, never a builder or repairer; verification id is the active one; SHA is the current candidate; a check declared required cannot be re-declared optional; `check_passed` needs exit 0, `check_failed` a non-zero exit; the completion payload's `allRequiredCompleted`, `anyRequiredFailed` and `results` must agree with the recorded checks or the event is rejected |
| `review_started` | Agent actor whose session and role equal the payload; the role is a review-stage role in the permission matrix; the session is registered under a grant for that role |
| `finding_raised` | Agent session that did not build or repair the candidate; finding ids are never reused |
| `review_passed`, `review_blocked`, `review_insufficient_evidence` | The report is the open seal; the actor is the session that opened it; the SHA is the sealed SHA; the verdict matches the event type; findings belong to the report; a passing verdict is rejected while the report holds a blocking finding not rejected by adjudication |
| `candidate_quarantined` | SHA is current |
| `adjudication_completed` | Registered Arbiter session, not tainted by building, repairing or verifying this candidate; findings recorded; cycle count is the next cycle |
| `repair_authorised` | Owner or Virgil actor; a recorded owner `scope_approved` decision exists (the Tier 2 authority under which one bounded repair is permitted); lineage and current SHA; a recorded adjudication defines the contract with the same findings and cycle; every permitted file normalises and, unless issued by the owner, stays outside protected boundaries |
| `repair_started`, `repair_completed` | The active repair contract; a Fabricator session under a valid grant |
| `safe_to_merge` | System or Virgil actor (a gate decision); lineage and current SHA |
| `merged_by_owner` | Lineage and current SHA; the cited `merge` decision names this exact SHA (`appliesToSha`); every merge gate holds (fresh verification signature, fresh passing seal, pushed and remote-equal, no unrepaired blocking finding). A `merge` owner decision without `appliesToSha` is rejected when recorded (KR-04) |
| `deployment_started`, `deployment_failed`, `deployed` | The merged SHA; a started deployment with the same id |

### Stage 2: transition table and guards (`transitions.ts`, `guards.ts`)

Guard names are fixed by `constitution/authority.json`. Each implementation derives its answer from the read model:

| Guard | Derived from |
|---|---|
| `review_eligibility_gate_passes` | Every check declared required by `verification_started` (or recorded as required) has a recorded `passed` result with exit 0 for the active verification on the current SHA; pushed, remote-equal, no mismatch |
| `required_check_failed`, `required_checks_missing` | The same recorded checks; a `skipped`, `running` or absent required check is missing, never passed |
| `reviewer_independent_of_builder` | Reviewer session is not among builder, repairer or Prover sessions of the lineage, and reviews the current SHA |
| `repair_cycle_within_limit` | Payload count equals the derived count plus one; beyond `maxCyclesWithoutOwner` it needs a recorded, unconsumed owner decision of kind `additional_repair_round`; never beyond `maxCyclesWithOwner` |
| `actor_is_owner` | Owner actor citing a recorded, unconsumed owner decision of kind `merge` whose `appliesToSha` is the current SHA |
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

Validated by tests (`packages/agent-contracts/test/permission-matrix.test.ts`, "tool and write-authority overlap"): a role has write tools if and only if it has a write boundary; only the Fabricator holds a boundary inside the candidate worktree; stage launching is exclusive to the role with the `Agent` tool; the three placeholder boundaries are each held by one role; concrete boundaries normalise, never nest across roles and never reach a protected boundary; and every path-shaped protected boundary in `authority.json` carries the protection its `boundaryProtection` classification claims for it (see "Boundary protection: two kinds" below). These tests check data agreement between files; they do not make the runtime enforce the matrix (deferred, above).

## Boundary protection: two kinds, and which protects what

`constitution/authority.json` lists seven `protectedBoundaries`. Five are paths; two (`merge_mechanism`, `deploy_mechanism`) are mechanisms, not paths, and are out of scope here. Until the owner's commit `dd8ddb1` the repository treated all five paths as protected by one mechanism — a `Write` and `Edit` deny rule in `.claude/settings.json` — and `permission-matrix.test.ts` asserted exactly that. That assertion was true when written and became false when the owner removed the two deny rules for `docs/decisions/OD-*` in commit `9627bae`, so that a session could file an owner decision at all (`OD-0006`). The test then failed on `main`, correctly: it was reporting a real disagreement between the constitution and the settings file.

The owner's commit `dd8ddb1` resolves that by declaring, in `constitution/authority.json` itself, that there are two kinds of protection:

```json
"boundaryProtection": {
  "sessionDenied": ["constitution/", "docs/product/VIRGIL_MASTER_COMMISSION.md", "knowledge/raw/", "schemas/gate-*"],
  "ownerInstructedOnly": ["docs/decisions/OD-*"]
}
```

The classification lives in `constitution/`, which every session is denied both by rule and by test. That placement is the point of the design: a session cannot reclassify a boundary out of `sessionDenied` in order to make its own write to it legal. Only the owner can move a path between the two groups, and the owner did.

| Protected boundary | Protection | Mechanism today | Status |
|---|---|---|---|
| `constitution/` | session-denied | `Write(./constitution/**)` and `Edit(./constitution/**)` in `.claude/settings.json` | **validated by tests** |
| `docs/product/VIRGIL_MASTER_COMMISSION.md` | session-denied | `Write` and `Edit` deny rules on the exact path | **validated by tests** |
| `knowledge/raw/` | session-denied | `Write(./knowledge/raw/**)` and `Edit(./knowledge/raw/**)` | **validated by tests** |
| `schemas/gate-*` | session-denied | `Write(./schemas/gate-*)` and `Edit(./schemas/gate-*)` | **validated by tests** |
| `docs/decisions/OD-*` | owner-instructed only — protected by recorded owner instruction, not by a deny rule | Nothing. No code determines whether an owner instruction exists, and no code inspects what a filed record contains | **design-level only** |

Read the status column exactly. **validated by tests** on the four session-denied rows means one thing and no more: `packages/agent-contracts/test/permission-matrix.test.ts` fails if either deny rule is removed from `.claude/settings.json`. The rule is then enforced by the Claude Code harness, which is not this repository and is not exercised by any test here; the test asserts the rule is declared, not that the harness honours it. **design-level only** on the owner-instructed row is the honest status: no code determines whether the owner instructed anything, so nothing stops a session writing an `OD-*` file the owner never asked for. The three assertions below are assertions about the classification and the settings file; none of them is a control over a session's writes to `docs/decisions/`. That gap is set out in full under "Owner-decision recording (OD-0006)".

Three assertions in `permission-matrix.test.ts` ("tool and write-authority overlap") hold this structure, and together they are stricter than the single assertion they replaced:

1. Every path-shaped entry of `protectedBoundaries` appears in exactly one of the two groups. A new protected boundary that nobody classifies fails; so does one listed in both. The old assertion had no equivalent — a new boundary could be added to `authority.json` and, if a deny rule happened to exist, nothing checked that anyone had decided which kind of protection it had.
2. Every `sessionDenied` path has both a `Write` and an `Edit` deny rule. This is the old assertion at unchanged strength, applied to the four paths for which it is true.
3. Every `ownerInstructedOnly` path has no `Write` or `Edit` deny rule that reaches it (checked with the shared pattern-overlap function, so a broader rule such as `Write(./docs/**)` fails too) and is recorded in this document as protected by recorded owner instruction, with a status from the vocabulary above. A path put in this group that nobody documents fails.

Nothing else in that test file was loosened to make these three fit.

## Owner-decision recording (OD-0006): procedural, not enforced

`docs/decisions/proposed/OD-0006-recording-owner-decisions.md` records the owner's instruction that their turn in the owner console is sufficient authority for a session to record and file an owner decision. It places two conditions on that. Neither is enforced by anything on this branch.

| Control stated in OD-0006 | Status | Where it stands |
|---|---|---|
| Authority for an owner decision comes only from the owner's own turn in the owner console; no other channel is ever owner approval | **design-level only** | No code determines which channel an instruction arrived on. The reducer requires an owner *actor* on `owner_decision` and `scope_approved`, but the truthfulness of `actor.kind` is itself deferred to a privileged runtime (see "What the reducer does not enforce"), and a decision filed as a Markdown file emits no event at all today |
| A record made on the owner's instruction must quote the owner's exact words verbatim | **design-level only** | No test asserts that a filed `docs/decisions/OD-*.md` contains a quote, or any particular content. The `owner_decision` event payload (`packages/agent-contracts/src/events.ts`: `decisionId`, `kind`, `resumesTo`, `appliesToSha`) and the `OwnerDecisionRecord` contract (`packages/agent-contracts/src/operational.ts`: `question`, `decision`, `consequences`, `appliesTo`, `decidedAt`, `recordPath`) have no field for the owner's words, so the reducer and the schemas have nothing to check. `.claude/settings.json` denies paths, not content |

The quote is not a verification mechanism and is not recorded here as one. It is authored by the same session that files the record, and no independent copy of the owner's instruction is committed, hashed or referenced anywhere in this repository, so a later reader has nothing to compare it against. Its only effect is to make a false record detectable by the owner, who can read it and say the words are not theirs. If the owner console reports words the owner did not say, a false decision can be filed at authority layer 1 of `CLAUDE.md` and nothing in the repository will contradict it.

Closing this would take an independent record of the owner's instruction, committed by something other than the session that files the decision — an exported console transcript, or a hash of one, on a path the filing session cannot write. No such record exists on this branch and nothing here produces one. It is future work, named and not done.

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
| 20 | KR-01: writes, staging and commits bound to the actor's own grant, role, registration and expiry; every writer is a builder | Stage 1 `actorGrantProblem`, `fileWriteProblem`; `recordWriter` | `repair-round-2.test.ts` KR-01 block |
| 21 | KR-02: reducer fails closed on any event the contract rejects, including unknown authority tags | Stage 0 | `repair-round-2.test.ts` KR-02 block |
| 22 | KR-04: a `merge` decision applies to one exact SHA | Stage 1 (`owner_decision`, `merged_by_owner`), guard `actor_is_owner` | `repair-round-2.test.ts` KR-04 block |
| 23 | KR-05: the session allow list admits no arbitrary execution; pushes to `main` by refspec and `pnpm exec`/`dlx` are denied | `.claude/settings.json` | `permission-matrix.test.ts` "session tool surface" (a model of the harness matcher; the harness itself is not exercised) |

Rows 1 to 11 and 15 to 23 are **implemented now** and **validated by tests**. Rows 12 and 14 are documentation. Nothing in this table is accepted until the fresh independent review and the owner's decision.

## Accepted gaps from the Keeper review of `956be26` (recorded, not repaired)

Recorded here under the owner's authorisation of the second repair round, which limited the repair to KR-01, KR-02, KR-04 and KR-05.

| Finding | Gap | Status | Why not repaired now |
|---|---|---|---|
| KR-03 | The set of required checks is declared by the Prover's `verification_started` and anchored to nothing owner-controlled; a Prover declaring only `lint` can reach `READY_FOR_REVIEW` honestly | design-level only | A governed required-check list belongs in an owner-controlled file (a constitution or gate-definition change, Tier 3). Until then the plan's `requiredChecks` and the Keeper's `verification incomplete` stop condition are the controls |
| KR-06 | The protected-boundary overlap check is case-sensitive; symlinks are outside the normaliser | design-level only | Repository paths are compared as recorded; case-folding and symlink resolution need a file system, which is Phase 3 hook territory. A grant naming `Constitution/**` is refused only on a case-sensitive file system |
| KR-07 | An owner grant may hand an agent write authority over a protected boundary (`validation.ts` owner exemption) | design-level only | Whether the owner may delegate a protected boundary is an owner decision on `AUTHORITY_TIERS.md` invariant 3; reported, not decided by a session |
| KR-09 | Gate `reviewer_independence` takes builder and Prover session ids but no repairer ids | deferred to a privileged runtime | The Phase 2 evidence adapter must fold repairer sessions into `builderSessionIds`; the reducer already covers repairers |
