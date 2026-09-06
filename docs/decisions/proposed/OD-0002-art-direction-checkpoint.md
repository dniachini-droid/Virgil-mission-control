# OD-0002 — Art-direction checkpoint: rejected runtime executions and approved visual direction

Status: **owner decision, transcribed; proposal path pending the owner's move.** The owner issued this decision in writing on 2026-09-06 in the consolidation instruction. This file transcribes the operative decisions; the owner's message is the source. It gains authority (layer 1) only when the owner moves it to `docs/decisions/OD-0002-art-direction-checkpoint.md`.

Why it is at `proposed/` and not at the accepted path: `docs/decisions/README.md` says a proposal has no authority until the owner moves it; `CLAUDE.md` says only the owner changes authority layer 1; `constitution/authority.json` lists `docs/decisions/OD-*` as a protected boundary; and `.claude/settings.json` denies `Edit` and `Write` under `docs/decisions/OD-*`. The consolidation session was instructed not to circumvent that policy and did not.

## Question

Do the Phase 0 spikes, or the Phase 0.5 runtime visual recovery, credibly demonstrate the intended premium, proper 3D, psychedelic-space quality and the epistemic visual language, and what is the binding visual direction going forward?

## Verdict on the runtime executions

The Phase 0 spike visuals and the Phase 0.5 runtime visual execution are **rejected**. Neither is an accepted art baseline. The Phase 0.5 application implementation, screenshots and video are excluded from the consolidated foundation. The Phase 0 spikes remain in the repository only as proofs of the event, evidence and animation-grammar contracts.

Checkpoint outcome under `docs/process/ART_DIRECTION_CHECKPOINT.md`: FAIL for the runtime executions. Phase 1 does not begin on this decision. No procedural visual rebuild and no complete 3D scene are started by it.

## Approved visual direction

1. The approved direction is the hybrid visual reference `docs/art-direction/approved/visual-canon/03-approved-hybrid.png`.
2. Direction B (`docs/art-direction/approved/visual-canon/02-direction-b.png`) is the strongest stylistic influence.
3. The four character designs are approved: Virgil, Fabricator, Prover and Keeper (`assets/concepts/characters/`).
4. The intended style is charming, cute, compact, screen-faced space robots with funny and distinctive role equipment.
5. The world is psychedelic, cosmic, tactile, colourful and stylised.
6. Virgil is also a compact cartoony robot, heavily equipped, operating from a stylised control centre.
7. "Cute" does not mean generic clip art or interchangeable avatars.
8. Role, authority and current state must remain readable through silhouette, equipment, animation and spatial position.

## Model candidate

The Virgil GLB (`assets/models/candidates/virgil-model-candidate-01.glb`) is accepted only as a model candidate for topology, geometry, UV, material and runtime inspection. It is not automatically a production asset, and it must not silently redefine the approved character; the concept sheets are the visual authority.

## Third-party assets

No KayKit, Bot Crossing or other third-party character asset may enter the repository without primary-source licence verification recorded in `assets/licenses/ASSET_PROVENANCE.md`. Concepts may be learned from Bot Crossing; its code, characters and visual identity are not being copied.

## Consequences

- `docs/art-direction/ART_BIBLE.md` and `ROLE_PERFORMANCE_BIBLE.md` are read through this decision where they conflict (the "cartoon clip-art astronauts" prohibition excludes cheap clip art and stock characters, not the approved astro-bot family; silhouettes in the role bible yield to the approved sheets). Rewriting `packages/visual-language/data/role-performance.json` and the art-direction documents in full is Phase 1 work under the accepted decision.
- Open owner decisions 1 (checkpoint verdict) and 2 (character direction) in `docs/process/PHASE_0_RUN_RECORD.md` and `PHASE_1_BRIEF.md` are answered by this record.
- The knowledge layer ingests this file as a raw source after the owner moves it; sessions cannot write under `knowledge/raw/`.

Applies to: `docs/art-direction/`, `docs/art-direction/approved/`, `assets/`, `packages/visual-language/data/`, `apps/mission-control/`, `docs/process/ART_DIRECTION_CHECKPOINT.md`, `docs/process/PHASE_1_BRIEF.md`.

Decided at: 2026-09-06 (owner's written instruction). Transcribed by the consolidation session on the same date.
