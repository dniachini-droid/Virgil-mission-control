# Consolidation run record

Session: Claude Code, repository `dniachini-droid/Virgil-mission-control`. Authority: the owner's written consolidation instruction of 2026-09-06 (one consolidation branch, one pull request targeting `main`, no merge by the session, no Phase 1 work, no procedural visual rebuild). Machine-readable twin: `run-records/consolidation.run-record.json`, validated against `schemas/run-record.schema.json` by `packages/agent-contracts/test/run-record.test.ts`.

This is a builder's record. It is not evidence that the foundation is safe; the deterministic checks listed below, the adversarial probe, and the fresh independent review the owner commissions are.

## Base, branch, history

- Base: `main` at `8210125705e01650ec82154fc4c2cee0ba076bdf` (README only).
- Phase 0 foundation: `claude/virgil-phase-0-plan-kp7g38` at `4b834a4b496bb07a45bfb8c9ca1f0384b644b1f3`, linear on top of `main`. The consolidation branch fast-forwards to that SHA, so the ten Phase 0 commits are present once, with their original SHAs, and nothing was duplicated.
- Foundation repair: `claude/virgil-phase-0-foundation-repair-qatfj9` (three commits on top of the Phase 0 SHA, not named in the owner's instruction but implementing exactly the Keeper repairs the bundle requires). Cherry-picked unchanged; their original messages and session links are preserved.
- Rejected: `claude/virgil-phase-0-5-visual-recovery-durqrz` at `2d01f47e54687c5a1cb9028efd757b41035094e3`. Nothing from it was merged, cherry-picked or copied: not its application implementation (`apps/mission-control/src/characters`, `world` rebuild, HUD layout), not `docs/art-direction/phase-0-5/` (captures, `capture-report.json`, `spike-foundry.webm`), not its `PHASE_0_5_PLAN.md`, `PHASE_0_5_PROTOTYPE.md`, `ASSET_PROVENANCE.md`, `role-performance.json` edits or its OD-0002 text. Its OD-0002 proposal was read for the repository's convention only.
- Working branch: the owner asked for `claude/virgil-main-consolidation`; the harness assigned `claude/virgil-main-consolidation-6f5fuc` and permits pushes only there, so that name carries the work. No other branch, worktree or parallel implementation was created.

## Commits on top of `4b834a4`

| Group | Commit | Content |
|---|---|---|
| 1 Phase 0 foundation import | (fast-forward) | `3993393` … `4b834a4`, the ten Phase 0 commits, unchanged |
| 2 Authority, reducer and verification repairs | `0e3c067db92f0df377d781797b12635a82385984` | cherry-pick: validate actor, authority, decisions; derive verification from recorded checks (K-01, K-02, K-03); 52 adversarial tests |
| 2 | `e3e64887cea172d4063cf2d7e1bbbebb9a761959` | resume-target allowlist and safe-resume rules; repair authorisation under a recorded owner scope decision; shared path normaliser; grant-boundary checks on file events; permission-overlap tests; settings deny coverage; 11 regression tests |
| 3 Knowledge graph and documentation corrections | `9c6ca36c2fa7079e771e379ce83551a0add950c0` | cherry-pick: `ENFORCEMENT_BOUNDARIES.md`; corrected event model, threat model, traceability, run record, test strategy |
| 3 | `0a82850f75a32068e66f21264492e25fbf8011f7` | cherry-pick: seed graph regenerated; freshness test (K-15) |
| 3 | `3bbf2c84ef047cd8f2418b56ea281b01f6b229ee` | four-value status vocabulary applied across the documentation; performance strategy restated as design-level; branch references replaced; art-direction pointers |
| 4 Approved visual canon, character concepts and asset provenance | `79b80e51ad6e9f9382ffefa1b36fc609a1161e6b` | OD-0002 transcription at `proposed/`; `docs/art-direction/approved/`; `assets/` with provenance |
| 5 Final validation record | `956be26064171f53022f92fc4429770bb727eaa5` | this record, its JSON twin and test, the probe script; the first candidate SHA reviewed by the Keeper |
| 6 Second repair round (owner-authorised, OD-0003 proposal) | the commit containing this section | KR-01, KR-02, KR-04, KR-05 repaired with regression tests; KR-03, KR-06, KR-07, KR-09 recorded as accepted gaps; new candidate SHA |

## Artifacts imported (all byte-identical to the bundle; SHA-256 per file in `docs/art-direction/approved/bundle/BUNDLE_MANIFEST.md`)

| Category | Files |
|---|---|
| Approved visual references | `docs/art-direction/approved/visual-canon/01-direction-a.png`, `02-direction-b.png`, `03-approved-hybrid.png` (binding) |
| Character concept sheets | `assets/concepts/characters/virgil-turnaround.png`, `virgil-multiview.png`, `fabricator-turnaround.png`, `prover-turnaround.png`, `keeper-turnaround.png` |
| Candidate 3D model | `assets/models/candidates/virgil-model-candidate-01.glb` with `virgil-model-candidate-01.REPORT.md` |
| Provenance | `assets/licenses/ASSET_PROVENANCE.md` (maintained register); `docs/art-direction/approved/bundle/{README,ASSET_PROVENANCE,KEEPER_REQUIRED_REPAIRS,MODEL_CANDIDATE_REPORT}.md` verbatim; `BUNDLE_MANIFEST.md` |
| Production-ready runtime assets | none |

The owner's visual-direction decision is transcribed at `docs/decisions/proposed/OD-0002-art-direction-checkpoint.md`. It could not be placed at `docs/decisions/OD-0002-…` because `docs/decisions/README.md` reserves that move for the owner, `CLAUDE.md` reserves authority layer 1 for the owner, `constitution/authority.json` lists `docs/decisions/OD-*` as a protected boundary, and `.claude/settings.json` denies `Edit` and `Write` there. The policy was not circumvented.

## Repairs

| Finding | Repair on this branch | Validated by |
|---|---|---|
| K-01 owner-decision and repair bypass | Owner actor and self-cited recorded decision required; duplicate decision ids rejected; `resumesTo` restricted to the recorded safe resume state or the explicit allowlist; `SAFE_TO_MERGE`, `MERGED`, `DEPLOYED`, `REPAIR_AUTHORISED` and the halt state never resume targets; halts from eligibility states record the pre-eligibility state; a halt during repair withdraws the contract without resetting the count; repair cycles counted from accepted transitions; one-shot decisions consumed; replay of an owner decision cannot extend the limit | `adversarial.test.ts` (K-01 blocks), `resume-and-paths.test.ts` (K-01 block), probe K-01a/b/c |
| K-02 verification payload trust | `allRequiredCompleted`, `anyRequiredFailed` and `results` are never trusted; eligibility derives from recorded `check_*` events of the active verification; skipped, missing, running or failed required checks cannot reach `READY_FOR_REVIEW`; contradictory payloads rejected; required checks cannot be re-declared optional; exit codes must match results; verification facts only from a registered Prover session or the system | `adversarial.test.ts` K-02 block (skipped, missing, failed, forged), `distinct-states.test.ts`, probe K-02 |
| K-03 actor and authority validation | Grants need an owner or Virgil actor within tier limits, after scope approval for Virgil, with normalised non-protected paths; repair authorisation needs a recorded owner scope decision, a recorded Arbiter adjudication and, for cycle 2, an unconsumed `additional_repair_round` decision; `safe_to_merge` needs the merge gates; `merged_by_owner` needs an owner actor, a recorded unconsumed `merge` decision, the exact current SHA, `SAFE_TO_MERGE` as the prior state and the gates re-checked; reviewer independence covers Fabricator, repairer and Prover sessions; a session cannot re-register under another role; verdicts only from the session that opened the review; adjudication only by a registered untainted Arbiter; file, staging and manifest events only inside the actor's granted, normalised paths. Deferred items are listed in `ENFORCEMENT_BOUNDARIES.md` | `adversarial.test.ts` K-03 block, `resume-and-paths.test.ts` K-03 and path blocks, `permission-matrix.test.ts`, `paths.test.ts`, `gates.test.ts`, probe K-03a/b/c and PATH |
| K-15 stale knowledge graph | Projection in `packages/knowledge-graph/src/seed.ts`; export script and freshness test share it; regenerated after every change on this branch; the freshness test failed and was fixed by regeneration three times during the session, proving it detects staleness | `seed-graph.test.ts`; Mind Scan run after the final regeneration |

## Checks run on the final validated tree

| Check | Command | Result |
|---|---|---|
| Dependency installation from the lockfile | `pnpm install --frozen-lockfile` | exit 0 (lockfile updated once for `@virgil/gate-engine` as a dev dependency of `@virgil/domain`, then frozen install passes) |
| Formatting and lint | `pnpm lint` (Biome 2.5.12) | 108 files, no fixes needed |
| TypeScript typecheck | `pnpm typecheck` (TypeScript 7.0.2, 8 targets) | clean |
| Unit and regression tests | `pnpm test` (Vitest 5) | 209 passed: agent-contracts 49, domain 93, gate-engine 19, knowledge-graph 24, visual-language 18, mission-control 6 |
| Schema regeneration and freshness | `pnpm --filter @virgil/agent-contracts export-schemas`; `git diff schemas/` | 39 schemas exported; no diff |
| Knowledge graph freshness | `pnpm --filter @virgil/knowledge-graph export-seed-graph`; `git diff`; `seed-graph.test.ts` | no diff; test green |
| Knowledge lint (Mind Scan) | `pnpm --filter @virgil/knowledge-lint run lint` | 76 nodes, 166 edges, 10 pages, 28 claims, 94/94 tethers intact, no findings |
| Production build | `pnpm build` (Vite) | built; `index-*.js` 1,652.82 kB (448.94 kB gzip) |
| Adversarial probe | `pnpm --filter @virgil/domain probe`, repaired sources and Phase 0 base sources | table below |

Bundle size is unchanged from Phase 0 and still needs code splitting before Phase 2 (already recorded as a risk).

## Adversarial probe (K-01, K-02, K-03, paths)

Run on the repaired sources (this branch) and, with `packages/{domain,test-fixtures,agent-contracts,gate-engine}/src` temporarily checked out from `4b834a4`, on the base sources; the tree was restored afterwards with no residual change.

| Exploit | Base `4b834a4` | This branch |
|---|---|---|
| K-01a Fabricator emits `owner_decision` with `resumesTo: MERGED` from a halt | state `MERGED` | rejected: owner_decision requires an owner actor; state `OWNER_DECISION_REQUIRED` |
| K-01b owner emits `owner_decision` with `resumesTo: SAFE_TO_MERGE` from a `BLOCKED` halt | state `SAFE_TO_MERGE` | rejected: privileged and terminal states are never resume targets |
| K-01c second repair cycle citing `ownerDecisionId: OD-fake` | `REPAIR_AUTHORISED`, cycles 2 | rejected: no recorded adjudication defines the contract; state `BLOCKED`, cycles 1 |
| K-02 required check skipped, completion claims `allRequiredCompleted: true` | `READY_FOR_REVIEW` reached, signature issued, run ends `DEPLOYED` | rejected: contradicts recorded checks (missing unit); never `READY_FOR_REVIEW`; no signature; `VERIFICATION_INCOMPLETE` |
| K-03a the Prover session opens the review | seal by `sess-prover-1`; run ends `DEPLOYED` | rejected: session not registered as keeper under a grant; no seal |
| K-03b `merged_by_owner` citing an unrecorded decision | `MERGED` with a merge SHA | rejected by guard `actor_is_owner`; stays `SAFE_TO_MERGE`, no merge SHA |
| K-03c Fabricator self-grant `TIER_2` over `**` | grant recorded | rejected: only the owner or Virgil may grant |
| PATH grant with permitted path `apps/mission-control/../../constitution/**` | grant recorded | rejected: parent traversal segment |
| PATH gate `pathPermitted('apps/x/src/../../../constitution/authority.json', ['apps/**'])` | `true` | `false` |

## Documentation corrections

Every enforcement claim now carries one of: implemented now; validated by tests; design-level only; deferred to a privileged runtime (`docs/architecture/ENFORCEMENT_BOUNDARIES.md`, status vocabulary). Corrected: `EVENT_MODEL.md`, `THREAT_MODEL.md` (every row), `PERFORMANCE_STRATEGY.md` (no budget is measured or gated; the document previously read as enforced by a role), `PHASE_0_TRACEABILITY.md`, `PHASE_0_RUN_RECORD.md` (amendments; the original text kept), `PHASE_0_FOUNDATION_REPAIR_RUN_RECORD.md` (consolidation note), `TEST_STRATEGY.md`, `PERMISSION_MATRIX.md`, `REPOSITORY_ALLOWLIST.md`, `REPOSITORY_ARCHITECTURE.md`, `CLAUDE.md`, `README.md`, `ART_BIBLE.md`, `ROLE_PERFORMANCE_BIBLE.md`, `SPIKES.md`, `ART_DIRECTION_CHECKPOINT.md`, `PHASE_1_BRIEF.md`, `docs/decisions/README.md`.

## Contradictions reported, not resolved (owner-controlled text)

1. `constitution/STATE_LANGUAGE.md`: "`OWNER_DECISION_REQUIRED` may be entered from any state." The owner's instruction excludes `MERGED` and `DEPLOYED` as resume targets, and no safe non-terminal resume state exists for a merge that happened, so the reducer records an owner question raised in those two states without leaving them. This narrows the `*` wildcard in `authority.json` for two states. Both files are owner-controlled and unchanged; the owner may ratify the narrowing or direct otherwise.
2. `constitution/REPAIR_LIMITS.md` attributes transition refusal beyond the repair limit to the gate engine; the reducer performs it (reported by the repair session; still open).
3. `docs/process/PHASE_1_BRIEF.md` lists `packages/domain/src/transitions.ts` as protected; the repair commit edited its soft-event sets (not the table) under the owner's repair instruction (reported by the repair session; still open).
4. `docs/testing/TEST_STRATEGY.md` calls authority tests protected; the domain tests changed here are the ones the Keeper found insufficient, changed under the owner's instruction and pending review.

## Checks skipped, with reasons

- Visual judgment on a real GPU: no GPU in the container, and the owner has already rejected the runtime visuals; no capture was re-run.
- Performance measurement per tier: no representative device; the strategy is recorded as design-level only.
- Primary-source verification of the TripoSR licence for the model candidate: the repository's session policy denies web access; recorded as stated, not verified, in `assets/licenses/ASSET_PROVENANCE.md`; production use of the candidate is blocked until done.
- Fresh independent Keeper review of the final SHA: a different role; this session cannot perform it (`constitution/REVIEW_POLICY.md`).
- Mutation control: none performed; the adversarial suite and probe stand in for a seeded-defect check of the reducer only.
- Raw source record for OD-0002 in `knowledge/raw/`: sessions cannot write there; the owner's move of the decision file triggers ingestion.

## Remaining limitations

- The reducer trusts `actor.sessionId`, `actor.kind` and `actor.roleId` as recorded; binding them to real sessions is Phase 3.
- Writes that emit no event are invisible to the reducer; only settings deny rules cover them until hooks exist.
- Git and GitHub facts are trusted as recorded by adapters that do not exist yet; the gate engine is fed by fixtures only; the live repository allowlist file does not exist.
- The four-file `role-performance.json` and the art-direction prose have not been rewritten to the approved sheets; that is Phase 1 work under the accepted decision. Section 0 of the Art Bible and the role bible state the precedence.
- No production-ready runtime asset exists; the model candidate is unrigged and unlicensed for production until its generator licence is verified.
- Single lineage per run; owner decisions are recorded per run.
- Bundle needs code splitting before Phase 2.

## Second repair round after the Keeper review of `956be26`

The independent Keeper (a separate read-only session) reviewed `956be26` and returned **BLOCKED** (comment on pull request #1). The builder reproduced both blocking findings before reporting. The owner authorised one additional repair round in writing (`docs/decisions/proposed/OD-0003-consolidation-repair-round.md`), limited to KR-01, KR-02, KR-04 and KR-05.

Correction to the record above (Keeper finding KR-10): the first candidate had 210 tests (agent-contracts 50), not 209 (49); the JSON twin and test were added after the count was written.

| Finding | Severity | Disposition | Repair | Validated by |
|---|---|---|---|---|
| KR-01 | blocking | repaired | File, staging and commit events must cite the actor's own grant for its registered role, unrevoked and unexpired at `occurredAt`; the role must be allowed to modify the candidate or tests; Virgil has no write boundary; every accepted agent write or commit records the session as a builder | `repair-round-2.test.ts` KR-01 (5 tests); probe KR-01 |
| KR-02 | blocking | repaired | Every event is parsed against the `DomainEvent` contract before reduction; anything the contract rejects, including an unknown `authority` tag, unknown type or actor kind, is recorded with kind `contract` and applies nothing | `repair-round-2.test.ts` KR-02 (3 tests); probe KR-02 |
| KR-03 | major | accepted gap | Required-check list is unanchored; a governed list is an owner-controlled file change | `ENFORCEMENT_BOUNDARIES.md` accepted-gaps table |
| KR-04 | major | repaired | `owner_decision` of kind `merge` must carry `appliesToSha`; `actor_is_owner` and `merged_by_owner` validation require it to equal the current candidate SHA; a deployment decision naming a SHA must name the merged one | `repair-round-2.test.ts` KR-04 (3 tests); probe KR-04 |
| KR-05 | major | repaired | `Bash(pnpm --filter *)` removed from the allow list in favour of the fixed workspace commands; deny rules added for `pnpm exec`, `pnpm dlx` and pushes to `main` by refspec; a test models the harness matcher against concrete commands | `permission-matrix.test.ts` "session tool surface" (4 tests). The new deny rules took effect on the builder session itself during this round (a `pnpm exec` invocation was refused by the harness), which is evidence about the harness matcher for those two rules only |
| KR-06 | minor | accepted gap | Case folding and symlinks are file-system semantics, outside the normaliser | accepted-gaps table |
| KR-07 | minor | accepted gap | Owner delegation of a protected boundary is an owner decision | accepted-gaps table |
| KR-08 | minor | not in scope | `finding_raised` accepts any non-builder agent session; consequence is denial only | noted; not repaired |
| KR-09 | informational | accepted gap | Gate evidence adapter must fold repairer sessions into `builderSessionIds` | accepted-gaps table |
| KR-10 | informational | corrected | Test counts corrected above; the archive hash remains unverifiable from the repository | this section |

Schema change: `domain-event.schema.json` gains the optional `appliesToSha` on the `owner_decision` payload (additive; regenerated). No test skipped, disabled or weakened; two existing tests that used `kind: 'merge'` for halts unrelated to merging now use `kind: 'continue'`, and three path tests now assert both the contract layer (kind `contract`) and the reducer layer (`validateEvent` directly).

Checks on the second candidate: `pnpm install --frozen-lockfile`; `pnpm check` (Biome 111 files, typecheck 8 targets, Vitest **225 passed**: agent-contracts 54, domain 104, gate-engine 19, knowledge-graph 24, visual-language 18, mission-control 6); schema export and seed-graph export with no diff; Mind Scan; `pnpm build`; `pnpm --filter @virgil/domain probe` (the nine first-round exploits plus KR-01, KR-02 and KR-04 all rejected).

## Next action

The owner commissions one fresh, read-only Keeper review of the exact new final SHA of this branch against `docs/art-direction/approved/bundle/KEEPER_REQUIRED_REPAIRS.md`, the Keeper's first report on pull request #1 and this record, then merges the pull request or returns findings; after the merge the owner moves `docs/decisions/proposed/OD-0002-art-direction-checkpoint.md` and `OD-0003-consolidation-repair-round.md` to `docs/decisions/` and deletes the superseded branches. This is the last repair cycle permitted with owner authority; a further BLOCKED verdict stops the lineage.
