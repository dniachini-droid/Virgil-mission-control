# Phase 1 brief — the playable vertical slice

Deliverable 20. Bounded implementation brief derived from master commission section 11 (Phase 1) and section 5.5, and from Amendment 1 "Phase 1 vertical-slice amendment". Phase 1 starts only after the owner accepts the Phase 0 run record and records the art-direction checkpoint decision.

## Objective

One integrated fictional story on deterministic mock events, in one project station, establishing the art bar, the world transition, the epistemic visual language and the end-to-end data contract before any breadth.

## The story (all twenty-five points required)

1. An idea enters the project station. 2. The Cartographer visibly bounds it. 3. The Architect creates the plan without building. 4. A branch and isolated worktree docking bay. 5. The Fabricator reads, searches and edits a real fixture file. 6. Changed modules visibly remain unstaged. 7. `git add` gathers them into the staging cradle. 8. A commit seals into a SHA-labelled capsule. 9. Push transit and remote-equality confirmation. 10. An evidence-complete handoff to the Prover. 11. Running, passed, failed and skipped verification states. 12. A separate handoff to the Keeper. 13. Independent non-destructive review of the exact SHA. 14. A passing route. 15. A quarantine route with stable finding identity. 16. Bounded repair producing a new SHA. 17. Fresh independent re-review. 18. The artifact reaching SAFE_TO_MERGE. 19. The owner airlock remaining closed until explicit owner action. 20. A verified run artifact crossing into the Mind. 21. Compilation into a proposed lesson. 22. A durable node forming only after required authority. 23. A contested claim remaining visibly unresolved. 24. Mind Scan returning exact evidence. 25. Desktop, mobile, reduced-motion and constrained-device demonstrations.

Mock events: extend `packages/test-fixtures` runs (`passingRun`, `blockedThenRepairedRun`, `mindSequence`) with the scope and plan stages; every step of the story is a recorded event through `animationFor`.

## Acceptance criteria

From commission 5.5: one project station; plan, build, review, quarantine and owner-gate areas; at least three distinctive worker roles (Fabricator, Prover, Keeper, with Virgil, Cartographer and Architect present); one artifact visibly moving through a handoff; a passing flow and a blocked flow; cinematic overview-to-detail camera; a polished signature nebula or energy-field effect; a coherent lighting and material system; a detail surface tied to the selected 3D object; keyboard and pointer selection; reduced-motion behaviour; defined desktop and mobile performance targets met on representative devices; a transition into a small but genuine Mind of Virgil environment as one continuous camera move on one scene graph; one immutable source compiled into one durable node; a visible provenance tether; at least one contested, unsupported or superseded state.

From Amendment 1: every animation traceable to its event and evidence; skipped, failed, passed, reviewed, safe-to-merge, merged and deployed distinct; ambient life quieter than work; the airlock never opens without the owner event; timeline replay with pause, step, scrub, jump-to-event and jump-to-evidence for the run.

Testable: Playwright journeys for the passing route, the quarantine route, the gateway crossing and the scan; visual regression against the Phase 0 baselines at the defined cameras on a GPU runner; performance traces per tier against `PERFORMANCE_STRATEGY.md`; accessibility checks (keyboard reachability of every selectable object, aria names, reduced motion).

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

## Owner decisions required before start

1. Art-direction checkpoint verdict (`ART_DIRECTION_CHECKPOINT.md`).
2. Character direction: stylised humanoid, semi-organic machine, drone, or hybrid ensemble.
3. Optional sound motifs in or out of the slice.
4. Phase 1 branch name and whether Phase 0's branch is merged first (owner-only).
