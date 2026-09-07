# Candidate 3D models (inspection only)

Category: **candidate 3D model**. A candidate is accepted only for topology, geometry, UV, material and runtime inspection. It is not a production asset, the application never loads it, and it must not silently redefine the approved character: the concept sheets under `assets/concepts/characters/` are the visual authority.

| File | Character | Origin | Status |
|---|---|---|---|
| `virgil-model-candidate-01.glb` | Virgil | Generated from the approved three-quarter reference with the Stability AI TripoSR demonstration (see the provenance register) | Candidate. Preserved unchanged. Inspection report: `virgil-model-candidate-01.REPORT.md` (bundle record, verbatim) |

Summary of the bundle's inspection: valid binary glTF 2.0, about 4.0 MB, 104,148 position vertices, 207,928 triangles, one mesh and one primitive with about 25 disconnected components, vertex colours present, no UVs, textures, materials, normals, rig, skin or animation; 702 boundary edges, 69 degenerate triangles. Any production copy requires normals, topology repair, logical component separation, optimisation to roughly 20,000 to 40,000 triangles for the first hero test, proper materials, rigging and a fresh row in `assets/licenses/ASSET_PROVENANCE.md`. None of that has been done.
