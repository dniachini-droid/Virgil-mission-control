# Assets

Every file under `assets/` is in exactly one of four categories. The application loads none of them today.

| Directory | Category | Loaded by the app | Contents |
|---|---|---|---|
| `concepts/characters/` | Character concept sheets (approved) | no | Five owner-approved sheets: Virgil (turnaround and multi-view), Fabricator, Prover, Keeper |
| `models/candidates/` | Candidate 3D models (inspection only) | no | Virgil model candidate 01 (TripoSR, unrigged, unoptimised, untextured, with its inspection report) and candidate 02 (Meshy, textured, unrigged, no animations, 11.82 MiB — larger on its own than the whole slice's transfer budget); measured facts and consequences for both in `licenses/ASSET_PROVENANCE.md` |
| `licenses/` | Provenance and licence register | no | `ASSET_PROVENANCE.md`: origin, licence, verification status and category of every imported file; the rule for future imports |
| `runtime/` | Production-ready runtime assets | would be | **Does not exist.** No production-ready asset has been created or accepted |

The approved visual references (the hybrid direction and its two source directions) live in `docs/art-direction/approved/visual-canon/`, because they are reference documents rather than assets.

Rules:

- Nothing enters `assets/` without a row in `licenses/ASSET_PROVENANCE.md` stating name, origin, licence, verification date and method, modifications and category.
- No KayKit, Bot Crossing or other third-party character asset enters without primary-source licence verification recorded first. Concepts may be learned from Bot Crossing; its code, characters and visual identity are not copied.
- A candidate model never becomes a runtime asset by being moved; it needs normals, topology repair, component separation, optimisation, materials, rigging and a fresh provenance row.
