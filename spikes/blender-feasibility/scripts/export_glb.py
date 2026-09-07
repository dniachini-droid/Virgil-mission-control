"""Export the rigged, animated spike part to .glb."""
import os, time
import bpy

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, "out")
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, "spike_rigged.blend"))

path = os.path.join(OUT, "spike_part.glb")
t0 = time.time()
bpy.ops.export_scene.gltf(
    filepath=path,
    export_format="GLB",
    export_animations=True,
    export_frame_range=True,
    export_apply=True,          # bake the bevel modifiers
    export_yup=True,
)
dt = time.time() - t0
print("EXPORT file=%s bytes=%d seconds=%.2f" % (os.path.basename(path), os.path.getsize(path), dt))
