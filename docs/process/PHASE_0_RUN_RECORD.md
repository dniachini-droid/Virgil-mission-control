# Phase 0 run record

Deliverable 21. Machine-readable twin: `docs/process/run-records/phase-0.run-record.json` (validated against `schemas/run-record.schema.json` by `packages/agent-contracts/test/run-record.test.ts`). Session: Claude Code, branch `claude/virgil-phase-0-plan-kp7g38`, repository `dniachini-droid/Virgil-mission-control`. Authority: OD-0001.

## Commits (all on the authorised branch; no PR, no merge, no deploy)

| Package | Commit | Content |
|---|---|---|
| — | 3993393 | Master commission saved verbatim |
| — | f6ed881 | Amendment 1 appended; provenance record |
| WP1 | 1f169cb | Scaffold, CLAUDE.md, README, environment report, constitution, OD-0001 |
| WP2 | 4adc76b | Roster, permission matrix, knowledge skill, settings, threat model, allowlist |
| WP3 | 0c748e8 | Contracts, domain, gate engine, fixtures, architecture docs |
| WP4 | 6342087 | Knowledge layer, provenance graph, Mind Scan, knowledge fixtures |
| WP5 | f6367f3 | Visual language data, grammar, role bible, art bible, two worlds, performance |
| WP6 | 34c43a3 | Rendering spikes and headless captures |
| WP7 | 44fcbd6 | ADRs, testing docs, product docs, Phase 1 brief, checkpoint, traceability, run record |

## Commands (classes)

Repository inspection (git, ls, tool versions); integrity analysis (Python hashing, substitution search); npm registry queries (read-only dist-tags and metadata); `pnpm install` and `pnpm add` for the authorised dependency list; `biome check`, `tsc`, `vitest`, `turbo run typecheck test`; `pnpm --filter @virgil/agent-contracts export-schemas`; `pnpm --filter @virgil/knowledge-lint run lint`; `pnpm --filter @virgil/knowledge-graph export-seed-graph`; `vite build`; headless Chromium WebGL probe; `pnpm --filter mission-control capture`; `pnpm licenses list`; git commit and push to the authorised branch.

## Files changed

Approximately 190 files created across the seven work packages (see `git diff --stat 8210125..HEAD`). No file outside this repository was read or written. `main` untouched.

## Checks run

| Check | Result |
|---|---|
| Biome lint and format (99 files) | clean |
| TypeScript typecheck, 8 workspace targets | clean |
| Unit tests | 130 passing: agent-contracts 36 (plus run-record test in WP7), domain 30, gate-engine 19, knowledge-graph 21, visual-language 18, mission-control 6 |
| Mind Scan over `knowledge/` | 10 pages, 28 claims, 94/94 tethers intact, no findings |
| Vite production build | ok (1.6 MB minified, 427 KB gzip) |
| Headless captures | 19/19 without page errors, renderer "ANGLE … SwiftShader" |
| TypeScript 7 / Vitest 5 / Vite 8 compatibility probes | passed; fallbacks unused |
| Commission integrity | line count matches the owner's original; byte and hash difference unexplained in-session; owner verification command recorded |

## Checks skipped, with reasons

- Visual-quality judgment on a real GPU: no GPU in the container. Recorded as BLOCKED_PENDING_REAL_GPU_REVIEW for AC12.
- Performance measurements per tier: no representative devices; budgets defined, measured in Phase 1.
- 3D interaction tests with @react-three/test-renderer: label canvas unavailable under Node; dependency removed; deferred to Phase 1.
- Runtime enforcement of per-role write boundaries (hooks) and session identity binding: Phase 3 by design; settings deny rules are in place and were exercised once in this session (a write to an accepted-decision path was denied).
- Agent evaluations against live role sessions: requires Phase 3 session launching; harness and fixtures delivered.

## Limitations

- Worker figures in the spikes are silhouette stand-ins, not the final modelled ensemble.
- The master commission's 752-byte difference against the owner's original could not be reproduced from inside the session; the owner-side diff command in `docs/product/COMMISSION_PROVENANCE.md` closes this item.
- The single-lineage run model in `packages/domain` covers one candidate lineage per run; multi-lineage runs are a Phase 5 extension.
- Threat model items T1, T3, T5, T8, T9 and T10 have design-level mitigation now and runtime enforcement in Phases 2 and 3; no privileged integration may be connected before then.

## Open owner decisions

1. Art-direction checkpoint verdict (proposed OD-0002).
2. Character direction for the ensemble (humanoid, semi-organic machine, drone, hybrid).
3. Optional sound motifs in or out of the Phase 1 slice.
4. Confirmation of the commission integrity diff using the recorded command.
5. Phase 1 branch and whether the Phase 0 branch is merged first (owner-only).

## Risks

Bleeding-edge majors (TypeScript 7, Vite 8, Vitest 5) may need per-package fallbacks; bundle size needs code splitting before Phase 2; software-rendered captures may overstate or understate bloom and colour; the seed wiki is small and its lint checks are deterministic only until Phase 1 adds semantic checks.

## Verdict

Deliverables 1 to 21 and Amendment 1 outputs 1 to 9 are delivered. Acceptance criteria 1 to 11 and 13 to 17 are met with evidence. Acceptance criterion 12 cannot be judged on a software renderer.

**Phase 0 verdict: BLOCKED_PENDING_REAL_GPU_REVIEW.** Everything except the visual-quality judgment is complete and green; the remaining item is the owner's art-direction checkpoint on a GPU.

**Phase 1 readiness: not ready** until OD-0002 records PASS or PASS WITH DIRECTION.

**One recommended next action:** run both spikes on a GPU machine (`pnpm --filter mission-control dev`), complete `docs/decisions/proposed/OD-0002-art-direction-checkpoint.md`, and move it to `docs/decisions/` as the accepted decision.

## Amendment: foundation repair after the Keeper's review

The sections above are the Phase 0 session's own record and are kept as written. The independent Keeper's review of that branch found the following claims overstated, and they are corrected on branch `claude/virgil-phase-0-foundation-repair-qatfj9` (`PHASE_0_FOUNDATION_REPAIR_RUN_RECORD.md`):

- "Unit tests 130 passing" and "domain 30" described a reducer that accepted `verification_completed` on the payload's own `allRequiredCompleted` claim (K-02), any string as an owner decision id for a second repair cycle or a merge (K-01), any grant id for deployment (K-01), reviewers independent of builder sessions only (K-03), grants and agent starts from any actor (K-03), and recorded the resume state after the state had already changed (K-01). The "authority violation replay test" therefore proved less than the verdict section claimed.
- "Acceptance criteria 1 to 11 and 13 to 17 are met with evidence" is withdrawn for AC1, AC3 (reducer half), AC5, AC6, AC7 and AC15 until a fresh independent Keeper reviews the repaired branch and the owner accepts it. `PHASE_0_TRACEABILITY.md` marks those rows "repaired, pending review".
- "Mind Scan over `knowledge/`: 94/94 tethers intact" was true of the derivation, but the committed `seed-graph.json` used by the Mind spike was stale against that derivation and nothing tested it (K-15). A freshness test now fails when it is stale.
- "Threat model items T1, T3, T5, T8, T9 and T10 have design-level mitigation now" understated the gap: T2, T3, T7, T8 and T13 were recorded as enforced by the reducer in Phase 0 while the reducer did not perform those checks. `docs/security/THREAT_MODEL.md` and `docs/architecture/ENFORCEMENT_BOUNDARIES.md` now state per layer what is enforced.

The Phase 0 verdict BLOCKED_PENDING_REAL_GPU_REVIEW stands, with the additional blocker that the repaired authority system awaits independent review and owner acceptance.
