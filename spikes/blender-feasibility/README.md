# Blender feasibility spike — working files

**Not a deliverable. Not an asset. Not a Phase 1 artefact.**

Everything here exists to answer one question: can 3D character work be done
inside a Virgil Mission Control container, without a graphics card and without
a paid external service? The findings are in
[`docs/process/BLENDER_FEASIBILITY_SPIKE.md`](../../docs/process/BLENDER_FEASIBILITY_SPIKE.md).

The object these scripts build is a deliberately generic chunky robot part —
a head with a recessed screen face and one shoulder joint under an overlapping
shell. It is a test rig for the toolchain. It is **not Virgil**, no attempt was
made to model Virgil, and nothing here may be moved into `assets/`, presented as
approved, or loaded by the application.

## Reproducing

`bpy` is installed into the container only. It is deliberately absent from every
`package.json` and from the pnpm lockfile.

```sh
python3 -m venv /tmp/bpy-venv                       # container Python must be 3.11.x
/tmp/bpy-venv/bin/pip install --timeout 180 --retries 8 bpy

cd spikes/blender-feasibility
/tmp/bpy-venv/bin/python scripts/build_part.py                       # geometry
/tmp/bpy-venv/bin/python scripts/rig_animate.py                      # rig, animate, rigidity measurement
/tmp/bpy-venv/bin/python scripts/export_glb.py                       # out/spike_part.glb
/tmp/bpy-venv/bin/python scripts/render.py CYCLES 480 32 preview three_quarter
node scripts/load_glb.mjs                                            # three.js headless load
```

`out/*.blend` are intermediate and are not committed; the scripts regenerate
them in under a second.

## Contents

| Path | What it is |
|---|---|
| `scripts/build_part.py` | Builds the test part from separate rigid rounded shells |
| `scripts/rig_animate.py` | Rigs it two ways and measures which one bends the shells |
| `scripts/render.py`, `scripts/render_pose.py`, `scripts/render_loop.py` | CPU renders and timings |
| `scripts/export_glb.py` | glTF-Binary export |
| `scripts/load_glb.mjs` | Headless load in three 0.185.1 (ADR-0003) |
| `scripts/occlusion_test.py` | Turntable measurement of joint occlusion, with a negative control |
| `scripts/silhouette_test.py`, `scripts/silhouette_compare.py` | Alpha-coverage comparison across two renderers |
| `scripts/compare_images.py` | Pixel-difference measurement between two renders |
| `out/` | The small renders and the `.glb` the report cites |
