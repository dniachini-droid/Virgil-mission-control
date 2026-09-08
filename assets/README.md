# Assets

Every file under `assets/` is in exactly one of four categories. The application loads only the runtime assets: the window layers and, as subsets, the two typefaces.

| Directory | Category | Loaded by the app | Contents |
|---|---|---|---|
| `concepts/characters/` | Character concept sheets (approved) | no | Five owner-approved sheets: Virgil (turnaround and multi-view), Fabricator, Prover, Keeper |
| `models/candidates/` | Candidate 3D models (inspection only) | no | Virgil model candidate 01 (TripoSR, unrigged, unoptimised, untextured, with its inspection report) and candidate 02 (Meshy, textured, unrigged, no animations, 11.82 MiB — larger on its own than the whole slice's transfer budget); measured facts and consequences for both in `licenses/ASSET_PROVENANCE.md` |
| `fonts/` | Production-ready runtime assets (typefaces) | as subsets | **Two files:** `Tektur-Medium.ttf` and `GeistMono-Regular.ttf`, SIL Open Font License 1.1, imported 2026-09-08 unmodified with their licence texts verbatim in `licenses/` (`TEKTUR-OFL.txt`, `GEISTMONO-OFL.txt`) and provenance rows whose verification reads *verified — licence text read and committed*. The app embeds a glyph subset of each, cut by `apps/mission-control/asset-pipeline/subset-font.mjs`, not these files |
| `licenses/` | Provenance and licence register | no | `ASSET_PROVENANCE.md`: origin, licence, verification status and category of every imported file; the rule for future imports; the two OFL texts |
| `runtime/` | Production-ready runtime assets | `runtime/window/` | **Three files, all runtime assets:** the owner's window-view layers (`window-nebula.webp`, `window-planet.webp`, `window-station.webp`), imported 2026-09-07 with provenance rows in `licenses/ASSET_PROVENANCE.md`. Owner-supplied artwork generated with ChatGPT; delivered at 1672 × 941 with the original resolution unknown; preserved byte for byte |

The approved visual references (the hybrid direction and its two source directions) live in `docs/art-direction/approved/visual-canon/`, because they are reference documents rather than assets.

Rules:

- Nothing enters `assets/` without a row in `licenses/ASSET_PROVENANCE.md` stating name, origin, licence, verification date and method, modifications and category.
- No KayKit, Bot Crossing or other third-party character asset enters without primary-source licence verification recorded first. Concepts may be learned from Bot Crossing; its code, characters and visual identity are not copied.
- A candidate model never becomes a runtime asset by being moved; it needs normals, topology repair, component separation, optimisation, materials, rigging and a fresh provenance row.
