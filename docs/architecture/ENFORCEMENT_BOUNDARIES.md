# Enforcement boundaries: reducer, gate engine, orchestration

Status: written during the Phase 0 foundation repair (Keeper findings K-01 to K-07, K-15, K-18), extended in the consolidation branch to the owner's binding repair requirements (resume-target allowlist, repair authorisation under a recorded owner decision, repository path normalisation, permission-overlap tests), and extended again in the owner-authorised second repair round after the independent Keeper review of candidate `956be26` (findings KR-01, KR-02, KR-04, KR-05 repaired; KR-03, KR-06, KR-07, KR-09 recorded below as accepted gaps). The repaired authority system described here is **pending fresh independent Keeper review and owner acceptance**. Nothing in this document ratifies it. Extended again on 2026-09-08, under the owner's grant of the repository root, with "Continuous integration: which checks now run without a human choosing to" below; that section adds claims and moves no existing row.

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
| `docs/decisions/OD-*` | owner-instructed only — protected by recorded owner instruction, not by a deny rule | A `PreToolUse` hook refuses a `Write` or `Edit` whose resulting file lacks a blockquoted verbatim quotation or a date. Nothing determines whether an owner instruction exists, whether the quoted words are the owner's, or what a `Bash`-mediated write does | **design-level only** for the protection itself; the hook's own two checks are **validated by tests** |

Read the status column exactly. **validated by tests** on the four session-denied rows means one thing and no more: `packages/agent-contracts/test/permission-matrix.test.ts` fails if either deny rule is removed from `.claude/settings.json`. The rule is then enforced by the Claude Code harness, which is not this repository and is not exercised by any test here; the test asserts the rule is declared, not that the harness honours it. The owner-instructed row splits, because two different things are true of it. The **protection** — that a write there is legitimate only because the owner instructed it — is **design-level only**: no code determines whether the owner instructed anything, so nothing stops a session writing an `OD-*` file the owner never asked for. The **hook's two content checks** are **validated by tests**: `packages/agent-contracts/test/od-decision-record-guard.test.ts` fails if either check is removed. Those checks constrain the shape of a record; they establish no authority for it. The three assertions below are assertions about the classification and the settings file; none of them is a control over a session's writes to `docs/decisions/`. All of this is set out in full under "Owner-decision recording (OD-0006)".

Three assertions in `permission-matrix.test.ts` ("tool and write-authority overlap") hold this structure, and together they are stricter than the single assertion they replaced:

1. Every path-shaped entry of `protectedBoundaries` appears in exactly one of the two groups. A new protected boundary that nobody classifies fails; so does one listed in both. The old assertion had no equivalent — a new boundary could be added to `authority.json` and, if a deny rule happened to exist, nothing checked that anyone had decided which kind of protection it had.
2. Every `sessionDenied` path has both a `Write` and an `Edit` deny rule. This is the old assertion at unchanged strength, applied to the four paths for which it is true.
3. Every `ownerInstructedOnly` path has no `Write` or `Edit` deny rule that reaches it (checked with the shared pattern-overlap function, so a broader rule such as `Write(./docs/**)` fails too) and is recorded in this document as protected by recorded owner instruction, with a status from the vocabulary above. A path put in this group that nobody documents fails.

Nothing else in that test file was loosened to make these three fit.

## Owner-decision recording (OD-0006): one condition now partly enforced, one not at all

`docs/decisions/OD-0006-recording-owner-decisions.md` records the owner's instruction that their turn in the owner console is sufficient authority for a session to record and file an owner decision. It places two conditions on that. One is still enforced by nothing. The other is now enforced in part, and the part matters less than the part that is still missing.

| Control stated in OD-0006 | Status | Where it stands |
|---|---|---|
| Authority for an owner decision comes only from the owner's own turn in the owner console; no other channel is ever owner approval | **design-level only** | No code determines which channel an instruction arrived on. The reducer requires an owner *actor* on `owner_decision` and `scope_approved`, but the truthfulness of `actor.kind` is itself deferred to a privileged runtime (see "What the reducer does not enforce"), and a decision filed as a Markdown file emits no event at all today |
| A record made on the owner's instruction must quote the owner's exact words verbatim | the **presence** of a quotation is **implemented now** and **validated by tests**; its **authenticity** is **design-level only** and unenforceable here | `.claude/hooks/od-decision-record-guard.mjs`, wired as a `PreToolUse` hook on `Write` and `Edit` in `.claude/settings.json`, refuses a write to `docs/decisions/OD-*` whose resulting file lacks either a blockquoted verbatim quotation or a `YYYY-MM-DD` date. `packages/agent-contracts/test/od-decision-record-guard.test.ts` fails if either check is removed. Nothing checks that the owner said the quoted words. The `owner_decision` event payload (`packages/agent-contracts/src/events.ts`: `decisionId`, `kind`, `resumesTo`, `appliesToSha`) and the `OwnerDecisionRecord` contract (`packages/agent-contracts/src/operational.ts`: `question`, `decision`, `consequences`, `appliesTo`, `decidedAt`, `recordPath`) still have no field for the owner's words, so the reducer and the schemas still have nothing to check. `.claude/settings.json` denies paths, not content; the hook is what looks at content |

### What the guard does, exactly

It computes the file content a `Write` or `Edit` would leave behind and refuses the call unless that content contains both a Markdown blockquote line carrying a double-quoted span of at least eight characters, and a date in `YYYY-MM-DD` form. It fails closed: a payload it cannot parse, a tool whose resulting content it cannot compute, and an `Edit` against a file it cannot read are all refused rather than waved through.

### What the guard does not do, and cannot

- **It does not check that the owner said the quoted words, or said anything.** It has no copy of the owner's instruction. Nothing in this repository has one. A session that invents a quotation and a date satisfies the guard completely, and the guard will report nothing.
- **It does not establish authority.** A filed record that passes it is not thereby an owner decision; it is a file of the right shape.
- **It does not cover `Bash`.** The hook runs on the `Write` and `Edit` tools. A write performed through `Bash` — `cat > docs/decisions/OD-0099.md`, a `python3` heredoc, `sed -i` — never reaches it, and `.claude/settings.json` allows no general `Bash` write rule to close that off without denying ordinary work. This is the same class of hole the reducer has ("a Bash-mediated write that emits no event is invisible to it", above). It is a real bypass, available to any session, and it is recorded here rather than left for a reader to discover.
- **It does not check the harness runs it.** No test here executes the Claude Code hook dispatcher. The tests execute the script directly and separately assert that `.claude/settings.json` declares it; whether the harness honours that declaration is outside this repository.

So the quote is still not a verification mechanism, and is still not recorded here as one. It is authored by the same session that files the record, and no independent copy of the owner's instruction is committed, hashed or referenced anywhere in this repository, so a later reader has nothing to compare it against. What has changed is narrower than it may look: a record filed **without** the owner's words can no longer be written through `Write` or `Edit`, where before nothing stopped it. The authenticity of a quotation that is present remains detectable only by the owner, who can read it and say the words are not theirs. **If the owner console reports words the owner did not say, a false decision can still be filed at authority layer 1 of `CLAUDE.md` and nothing in the repository will contradict it.** The guard does not touch that risk at all.

Closing it would take an independent record of the owner's instruction, committed by something other than the session that files the decision — an exported console transcript, or a hash of one, on a path the filing session cannot write. No such record exists on this branch and nothing here produces one. It is future work, named and not done.

### A fact found while building the guard, reported not repaired

Run against the six filed decision records as they stand, the guard accepts `OD-0006` and refuses `OD-0001` through `OD-0005`: none of those five contains a blockquoted verbatim quotation of the owner's words. That is the guard reporting a true thing about records filed before it existed, not a defect in the guard. It is recorded here and not repaired: adding the owner's words to a filed decision would change its substance, and this session does not hold them. Whether those five should be amended is the owner's to decide.

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

## Continuous integration: which checks now run without a human choosing to

Until 2026-09-08 this repository had no continuous integration of any kind. Every check it has ever reported was run by hand, inside the session that also wrote the code, and the report of it was prose. That is the condition two review findings named. **KR-50** and **KR-59**: neither `build:owner` nor `verify:owner` was reachable from any required check and no workflow existed, so the only guard that catches a network escape in the Owner Build was the one guard nothing ran.

`.github/workflows/checks.yml` runs on push to any branch and on pull requests. It installs from the committed lockfile, installs the Chromium that lockfile resolves, and runs `pnpm check` (biome, `turbo run typecheck`, every workspace test, and then `verify:owner`), the Mind Scan, `build:owner`, `verify:owner`, `sha256sum -c` over every committed Owner Build digest, and the byte-for-byte reproducibility rebuild of the newest committed artifact.

The wiring does not live only in that file, because a workflow file is one edit away from gone and nothing would notice. `verify:owner` is a turbo task that depends on `build:owner`, both with `cache: false`, and the root `check` script runs it; `apps/mission-control/test/required-checks.test.ts` fails if that wiring is removed, if a step is dropped from the workflow, if the workflow file is deleted, or if a `continue-on-error` is added to it. Deleting the workflow therefore fails `pnpm test`, which fails `pnpm check`.

| Claim | Status | Mechanism, and what it does not establish |
|---|---|---|
| The Owner Build artifact opens from a `file://` URL and makes no runtime request other than the document itself | **implemented now** and **validated by tests** | `apps/mission-control/e2e/verify-owner-build.ts` opens the built artifact from `file://` with no server, visits every route, and exits non-zero on a console error, an uncaught exception, or any request whose URL is not the document. Demonstrated to fail on 2026-09-08 for both a `fetch()` to an external host added to a component and a remote `url()` added to the stylesheet. It says nothing about how the world looks: the renderer is SwiftShader and OD-0005's two graphics-hardware checks remain recorded as not performed |
| `verify:owner` cannot be skipped, and cannot pass from a cache | **implemented now** and **validated by tests** | `turbo.json` (`verify:owner` depends on `build:owner`; `cache: false` on both), the root `check` script, and `apps/mission-control/test/required-checks.test.ts`, which asserts each of those and every step of the workflow |
| Every committed Owner Build artifact still hashes to its recorded digest | **implemented now** and **validated by tests** | `sha256sum -c *.sha256` in `docs/process/PHASE_1_owner-builds/`, declared in the workflow and asserted by `required-checks.test.ts`. Demonstrated to fail on a single altered byte |
| The newest committed Owner Build artifact is byte-for-byte derivable from the commit it names, and from nothing else | **implemented now** and **validated by tests** | `apps/mission-control/owner-build/reproduce.mjs` recovers the source commit and the embedded build minute from the artifact's own bytes, rebuilds in a detached worktree at **that commit** rather than at `HEAD`, and compares with `cmp`. It refuses to guess: two candidate dates, two candidate SHAs, an unreadable file name, an artifact built from a dirty worktree, or a commit missing from the clone are each a printed failure, never a skip. Demonstrated to fail on a single altered byte. It covers the newest artifact only; the older seven are covered by their digests, not by a rebuild |
| Everything the table above marks **validated by tests** is now exercised on every push | **implemented now** and **validated by tests** | The workflow runs `pnpm check`, which runs `turbo run test`. No label in this document changes because of that — the vocabulary was always about whether a test exists and fails, not about who ran it — but the rows are stronger in practice than they were, because passing them is no longer a session's choice |
| That GitHub Actions honours `.github/workflows/checks.yml` | **deferred to a privileged runtime** | No test here executes GitHub Actions. `required-checks.test.ts` reads the file and asserts the commands are declared, exactly as `permission-matrix.test.ts` reads `.claude/settings.json` and asserts the deny rules are declared. The evidence that a check ran is a run's own log, not this document and not a session's report |

### The browser is named in every run, because CI's is not this container's

`verify:owner` needs a real browser. The workflow installs the Chromium that the `@playwright/test` pinned in `pnpm-lock.yaml` resolves to, so the browser follows the lockfile and not a workflow author's choice. The container these sessions run in substitutes a preinstalled Chromium that lags that pin — `141.0.7390.37` against the `153.0.8010.12` the pinned Playwright asks for — and `verify-owner-build.ts` prefers the preinstalled binary when it exists, per that environment's own instruction. So a local pass and a CI pass are not passes on the same browser, and pretending otherwise would make the green a false signal.

That divergence is not repaired here, because repairing it means either downgrading the lockfile or ignoring the container's instruction, and neither is this change's business. What is done instead: every run now prints the browser type, version, executable path, and whether it was the pinned build or the substituted one, so the question "which browser said this artifact makes no requests?" has an answer in the log of every run, in CI and locally. The network-isolation property being checked does not depend on the browser version, but the record of what was checked should never be silent about it.

### No row in this document moves out of "design-level only"

The measurable target for work of this kind is the number of **design-level only** rows here going down. This change moves none of them, and saying otherwise would be the one failure that matters in a document whose whole value is that its labels are true. There are five, and continuous integration does not touch any:

- The `docs/decisions/OD-*` boundary's **protection**, and OD-0006's **single-channel** condition, and the **authenticity** of a quoted owner instruction. Nothing determines which channel an instruction arrived on or whether the owner said the words. No check can; it needs an independent record of the owner's instruction that the filing session cannot write.
- **KR-03** — a governed required-check list belongs in an owner-controlled file. Note the shape of what changed and what did not: this workflow makes a fixed list of checks run on every push, which is a real control, but it is declared in a repository file a session may edit, not in an owner-controlled one. The reducer still takes its required-check set from the Prover's `verification_started` and anchors it to nothing owner-controlled. KR-03 is untouched.
- **KR-06** — case-folding and symlink resolution need a file system, which is Phase 3 hook territory.
- **KR-07** — whether the owner may delegate a protected boundary is an owner decision on `AUTHORITY_TIERS.md`.

Each of the five is design-level only because no code *can* perform it here, not because no runner existed. A runner does not change that.

### KR-58: caught by a required check, not repaired

`owner-build/inline.mjs` scans for external `src` and `href` references **before** it reinserts the stylesheet and **before** it pastes the bundle, so it only ever inspects the bare shell. Both defects demonstrated on 2026-09-08 passed it and passed all 317 workspace tests, and were caught only by `verify:owner`. So the position after this change is precisely:

- The **blind spot in `inline.mjs` is unrepaired**, and its status is unchanged.
- The **class of defect it misses is now caught by a check that runs on every push**, and that check cannot be skipped without failing `pnpm test`.

Those are two different statements and neither substitutes for the other. A repair to `inline.mjs` — scanning the finished document rather than the shell — is still open work.

So, of the three findings this section began with: **KR-50** and **KR-59** are addressed by the workflow and its wiring test. **KR-58** is caught and not repaired. `docs/process/PHASE_1_BACKLOG.md` carries all three in that form.

## Accepted gaps from the Keeper review of `956be26` (recorded, not repaired)

Recorded here under the owner's authorisation of the second repair round, which limited the repair to KR-01, KR-02, KR-04 and KR-05.

| Finding | Gap | Status | Why not repaired now |
|---|---|---|---|
| KR-03 | The set of required checks is declared by the Prover's `verification_started` and anchored to nothing owner-controlled; a Prover declaring only `lint` can reach `READY_FOR_REVIEW` honestly | design-level only | A governed required-check list belongs in an owner-controlled file (a constitution or gate-definition change, Tier 3). Until then the plan's `requiredChecks` and the Keeper's `verification incomplete` stop condition are the controls |
| KR-06 | The protected-boundary overlap check is case-sensitive; symlinks are outside the normaliser | design-level only | Repository paths are compared as recorded; case-folding and symlink resolution need a file system, which is Phase 3 hook territory. A grant naming `Constitution/**` is refused only on a case-sensitive file system |
| KR-07 | An owner grant may hand an agent write authority over a protected boundary (`validation.ts` owner exemption) | design-level only | Whether the owner may delegate a protected boundary is an owner decision on `AUTHORITY_TIERS.md` invariant 3; reported, not decided by a session |
| KR-09 | Gate `reviewer_independence` takes builder and Prover session ids but no repairer ids | deferred to a privileged runtime | The Phase 2 evidence adapter must fold repairer sessions into `builderSessionIds`; the reducer already covers repairers |
