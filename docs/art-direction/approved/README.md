# Approved visual direction

This directory holds the owner-approved visual references for Virgil Mission Control and the records of the consolidation bundle they arrived in. Authority: the owner's written visual-direction decision, transcribed in `docs/decisions/proposed/OD-0002-art-direction-checkpoint.md` (authority once the owner moves it to `docs/decisions/`).

## Status of every imported file

Four categories are used across the repository. A file is in exactly one.

| Category | Meaning | Files |
|---|---|---|
| **Approved visual reference** | Binding target for look, palette, world and character proportion. Not an asset; never loaded by the application. | `visual-canon/03-approved-hybrid.png` (binding), `visual-canon/02-direction-b.png` (strongest stylistic influence), `visual-canon/01-direction-a.png` (earlier warm direction, retained for provenance) |
| **Character concept sheet** | Approved design of one character, for modelling and rigging. Not an asset; never loaded by the application. | `assets/concepts/characters/virgil-turnaround.png`, `fabricator-turnaround.png`, `prover-turnaround.png`, `keeper-turnaround.png`, `virgil-multiview.png` |
| **Candidate 3D model** | Accepted only for topology, geometry, UV, material and runtime inspection. Not a production asset; never loaded by the application; must not silently redefine the approved character. | `assets/models/candidates/virgil-model-candidate-01.glb` |
| **Production-ready runtime asset** | Rigged, optimised, licensed, loaded by the application. | **None exist.** |

The register `assets/licenses/ASSET_PROVENANCE.md` records origin, licence and verification status per file.

## What the references say

- The world is psychedelic, cosmic, tactile, colourful and stylised.
- The characters are charming, cute, compact, screen-faced space robots with funny and distinctive role equipment.
- Virgil is also a compact, cartoony, heavily equipped robot operating from a stylised control centre.
- "Cute" does not mean generic clip art or interchangeable avatars. Role, authority and current state stay readable through silhouette, equipment, animation and spatial position.

## What is rejected

The Phase 0 spike visuals (`docs/art-direction/spikes/`, still in the repository as contract proofs) and the Phase 0.5 runtime visual rebuild (never merged; its implementation, screenshots and video are excluded from this branch) are not an accepted art baseline.

## What this directory does not authorise

No procedural visual rebuild, no complete 3D scene, no Phase 1 work. Those start only after the owner accepts the decision and the repaired foundation.

## Bundle records

`bundle/` preserves the owner's consolidation bundle records verbatim: `README.md`, `ASSET_PROVENANCE.md`, `KEEPER_REQUIRED_REPAIRS.md`, `MODEL_CANDIDATE_REPORT.md`, and `BUNDLE_MANIFEST.md` with the SHA-256 of the archive and of every file.
