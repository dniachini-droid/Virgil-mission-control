# Asset provenance register

Maintained register for every file imported under `assets/` and `docs/art-direction/approved/`. The owner's own bundle statement is preserved verbatim at `docs/art-direction/approved/bundle/ASSET_PROVENANCE.md`; this register restates it per file and records what was and was not verified from a primary source during the consolidation session.

Categories: approved visual reference; character concept sheet; candidate 3D model; production-ready runtime asset. Verification vocabulary: **verified** (primary source read and recorded), **stated** (asserted by the bundle, not independently verified), **not verified**.

## Imported files

| Repository path | Category | Origin | Licence | Verification | Modifications |
|---|---|---|---|---|---|
| `docs/art-direction/approved/visual-canon/01-direction-a.png` | approved visual reference (earlier warm direction, retained) | Generated for this project on 2026-09-06 and supplied by the owner in the consolidation bundle | Owner-supplied project artwork; no third-party licence | Owner statement (bundle record); SHA-256 recorded in `BUNDLE_MANIFEST.md` | none |
| `docs/art-direction/approved/visual-canon/02-direction-b.png` | approved visual reference (strongest stylistic influence) | as above | as above | as above | none |
| `docs/art-direction/approved/visual-canon/03-approved-hybrid.png` | approved visual reference (binding target) | as above | as above | as above | none |
| `assets/concepts/characters/virgil-turnaround.png` | character concept sheet | as above | as above | as above | none |
| `assets/concepts/characters/virgil-multiview.png` | character concept sheet (reconstruction reference) | as above | as above | as above | none |
| `assets/concepts/characters/fabricator-turnaround.png` | character concept sheet | as above | as above | as above | none |
| `assets/concepts/characters/prover-turnaround.png` | character concept sheet | as above | as above | as above | none |
| `assets/concepts/characters/keeper-turnaround.png` | character concept sheet | as above | as above | as above | none |
| `assets/models/candidates/virgil-model-candidate-01.glb` | candidate 3D model | Generated on 2026-09-06 from the approved Virgil three-quarter reference using the official Stability AI TripoSR demonstration, per the bundle record | TripoSR is published under the MIT licence per the bundle record; the generated geometry derives from the owner's own reference image | **Stated, not verified.** The consolidation session could not read the TripoSR repository licence from its primary source (repository session policy denies web access). Before any production use, copy the licence text and its copyright line from the TripoSR repository into this directory as `TRIPOSR-LICENSE.txt` and record the verification date here. Until then the file is a candidate only | none (preserved byte for byte; SHA-256 in `BUNDLE_MANIFEST.md`) |

## Sources studied, not imported

| Source | Status | Notes |
|---|---|---|
| Bot Crossing (`https://github.com/jarrenrocks/bot-crossing`), MIT per the bundle record | Not imported. Concepts only. | Character instancing, expression atlases, state-driven animation, navigation and environmental-life techniques may be learned from it. Its code, characters, faces, buildings and visual identity are not copied. Its repository licence is not assumed to cover third-party assets it bundles. |
| KayKit Character Animations, KayKit Space Base Bits (free tier) | Not imported. | The bundle record states these are CC0 per their primary itch.io pages. No file has been downloaded. Before any import: record exact pack name, version, source URL, download date, licence text and modifications here, verified from the primary source, not from a third party's credits file. |

## Production-ready runtime assets

None. No file in this repository is a production-ready runtime asset. The application loads procedural geometry only.

## Rule for future imports

Write the row first, then commit the file with it: name, creator, version, source URL, licence text location, verification date and method, every modification, and the category. If the primary source cannot be reached from the session, the asset waits.
