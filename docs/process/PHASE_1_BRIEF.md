# Phase 1 brief — the playable vertical slice

Deliverable 20. Bounded implementation brief derived from master commission section 11 (Phase 1) and section 5.5, and from Amendment 1 "Phase 1 vertical-slice amendment". Phase 1 starts only after the owner accepts the Phase 0 run record and records the art-direction checkpoint decision.

## Objective

One integrated fictional story on deterministic mock events, in one project station, establishing the art bar, the world transition, the epistemic visual language and the end-to-end data contract before any breadth.

## First entries, carried over from the second Keeper review

These two precede the slice work. They come from the accepted design gaps recorded in `docs/architecture/ENFORCEMENT_BOUNDARIES.md` and from the owner's disposition of the non-blocking findings, transcribed at `docs/decisions/proposed/OD-0004-non-blocking-findings-disposition.md`.

1. **KR-03 — anchor the required-check set in an owner-controlled file.** The set of required checks is declared by the Prover's `verification_started` and anchored to nothing owner-controlled; a Prover declaring only `lint` can reach `READY_FOR_REVIEW` honestly. The owner rejected both repairing this before the merge and accepting it permanently: it is the first item of Phase 1. A governed required-check list is an owner-controlled file change (a constitution or gate-definition change, Tier 3), so the file and its wording are the owner's; a session prepares the change and does not enact it. Until the anchor exists, the plan's `requiredChecks` and the Keeper's `verification incomplete` stop condition remain the only controls.

2. **KR-07 — make invariant 3 match the code.** An owner grant may hand an agent write authority over a protected boundary (the `validation.ts` owner exemption). The owner keeps the exemption: it is the owner's authority to lend. Phase 1 therefore amends the wording of invariant 3 in `constitution/AUTHORITY_TIERS.md` so the document matches the code, rather than changing the code to match the document. `constitution/` is the owner's layer; the amendment is the owner's to make, and no session makes it on the strength of the transcription. Until then the divergence stands as a recorded discrepancy.

## The story (all twenty-five points required)

1. An idea enters the project station. 2. The Cartographer visibly bounds it. 3. The Architect creates the plan without building. 4. A branch and isolated worktree docking bay. 5. The Fabricator reads, searches and edits a real fixture file. 6. Changed modules visibly remain unstaged. 7. `git add` gathers them into the staging cradle. 8. A commit seals into a SHA-labelled capsule. 9. Push transit and remote-equality confirmation. 10. An evidence-complete handoff to the Prover. 11. Running, passed, failed and skipped verification states. 12. A separate handoff to the Keeper. 13. Independent non-destructive review of the exact SHA. 14. A passing route. 15. A quarantine route with stable finding identity. 16. Bounded repair producing a new SHA. 17. Fresh independent re-review. 18. The artifact reaching SAFE_TO_MERGE. 19. The owner airlock remaining closed until explicit owner action. 20. A verified run artifact crossing into the Mind. 21. Compilation into a proposed lesson. 22. A durable node forming only after required authority. 23. A contested claim remaining visibly unresolved. 24. Mind Scan returning exact evidence. 25. Desktop, mobile, reduced-motion and constrained-device demonstrations.

Mock events: extend `packages/test-fixtures` runs (`passingRun`, `blockedThenRepairedRun`, `mindSequence`) with the scope and plan stages; every step of the story is a recorded event through `animationFor`.

## Acceptance criteria

From commission 5.5: one project station; plan, build, review, quarantine and owner-gate areas; at least three distinctive worker roles (Fabricator, Prover, Keeper, with Virgil, Cartographer and Architect present); one artifact visibly moving through a handoff; a passing flow and a blocked flow; cinematic overview-to-detail camera; a polished signature nebula or energy-field effect; a coherent lighting and material system; a detail surface tied to the selected 3D object; keyboard and pointer selection; reduced-motion behaviour; defined desktop and mobile performance targets met on representative devices; a transition into a small but genuine Mind of Virgil environment as one continuous camera move on one scene graph; one immutable source compiled into one durable node; a visible provenance tether; at least one contested, unsupported or superseded state.

From Amendment 1: every animation traceable to its event and evidence; skipped, failed, passed, reviewed, safe-to-merge, merged and deployed distinct; ambient life quieter than work; the airlock never opens without the owner event; timeline replay with pause, step, scrub, jump-to-event and jump-to-evidence for the run.

Testable: Playwright journeys for the passing route, the quarantine route, the gateway crossing and the scan; visual regression against the Phase 0 baselines at the defined cameras on a GPU runner; performance traces per tier against `PERFORMANCE_STRATEGY.md`; accessibility checks (keyboard reachability of every selectable object, aria names, reduced motion).

### Two checks deferred for want of graphics hardware

Two of the criteria above need graphics hardware the session containers do not have, and the ordinary way to obtain it is a paid service, which `CLAUDE.md` forbids outright. The owner decided that Phase 1 proceeds with both formally deferred and recorded as not performed, rather than lifting the no-paid-services rule or rewriting the criteria. Transcribed at `docs/decisions/proposed/OD-0005-phase-1-visual-checks-and-reference.md`; it takes effect when the owner moves that file into `docs/decisions/`.

1. **"defined desktop and mobile performance targets met on representative devices"** (commission 5.5, above) and the performance traces per tier against `PERFORMANCE_STRATEGY.md`: **deferred, not performed.** Performance stays unmeasured and must be recorded as unmeasured, never as met. "No failure observed" is not a measurement.

2. **"visual regression against the Phase 0 baselines at the defined cameras on a GPU runner"**: **deferred, not performed.** Visual judgement in Phase 1 is the owner's own, on the owner's own machine; no automated baseline stands in for it.

Both criteria stand as written and remain unmet. The Phase 1 run record and any Phase 1 report must state that these two checks were not performed, and why. Every other acceptance criterion is unchanged and unweakened.

## Risk classification and reviewer formation

Level: moderate. Flags: renderedUi, accessibility, mobile, userFacingCopy, expensiveRendering, resourceBudget. Formation: Keeper, Interface Keeper, Performance Examiner; Arbiter if findings conflict. No Security Sentinel (no credentials or external actions in Phase 1).

## Permitted and protected areas

Permitted: `apps/mission-control/**`, `packages/visual-language/**` (data changes are art-direction changes and need the checkpoint decision), `packages/test-fixtures/**`, `docs/art-direction/**`, `docs/process/PHASE_1_*`, `assets/**` (with licence records), `tests/**`.
Protected: `constitution/**`, `docs/product/VIRGIL_MASTER_COMMISSION.md`, accepted owner decisions, `knowledge/raw/**`, `packages/domain/src/transitions.ts` and `constitution/authority.json` (any needed transition is an owner decision), `packages/gate-engine/**` (gate changes need an ADR and owner decision).

## Non-goals

Real repositories, GitHub, session launching, multiple projects, the full Mind, production knowledge compilation, sound beyond optional motifs, native mobile.

## Deliverables

The slice; modelled worker ensemble for the six visible roles per the role bible (or an owner-approved stylisation direction); code-split bundles per world; Playwright journeys; GPU visual baselines; performance report per tier; updated art bible with any refinements; Phase 1 run record with commit SHAs; Phase 2 brief proposal.

## Stop conditions

Any acceptance criterion that requires an owner decision (character direction, sound); any need to change authority files; performance budget unmet on the desktop tier after two optimisation passes; visual regression baselines unobtainable on a GPU runner.

The last of these — *visual regression baselines unobtainable on a GPU runner* — is disapplied for one stated reason only: the absence of GPU hardware within the no-paid-services limit, which the owner has decided is a deferral and not a stop (`docs/decisions/proposed/OD-0005-phase-1-visual-checks-and-reference.md`, effective when the owner moves it into `docs/decisions/`). It continues to apply to every other cause. The other stop conditions are unchanged.

## Owner decisions required before start

1. Art-direction checkpoint verdict (`ART_DIRECTION_CHECKPOINT.md`): decided in writing by the owner (runtime executions rejected; hybrid reference approved), transcribed at `docs/decisions/proposed/OD-0002-art-direction-checkpoint.md`; effective when the owner moves it to `docs/decisions/`.
2. Character direction: decided by the same record (compact, cute, screen-faced space robots; the four approved sheets under `assets/concepts/characters/`); the earlier options (humanoid, semi-organic machine, drone, hybrid ensemble) are superseded.
3. Optional sound motifs in or out of the slice: open.
4. Phase 1 branch name: open. The Phase 0 foundation, its repairs and the approved direction are consolidated in one pull request the owner merges first; the repaired authority system also needs the fresh independent review recorded in `PHASE_0_FOUNDATION_REPAIR_RUN_RECORD.md`.
