"""Render the spike part on the CPU. Args: <engine> <res> <samples> <name> [view]

view: front | three_quarter | side | silhouette
"""
import math
import os
import sys
import time

import bpy

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, "out")

engine = sys.argv[1]
res = int(sys.argv[2])
samples = int(sys.argv[3])
name = sys.argv[4]
view = sys.argv[5] if len(sys.argv) > 5 else "three_quarter"

bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, "spike_part.blend"))
sc = bpy.context.scene

VIEWS = {
    "front": (0.0, -5.2, 1.15),
    "three_quarter": (3.4, -3.7, 2.5),
    "side": (5.2, 0.0, 1.15),
    "silhouette": (0.0, -5.2, 1.15),
}
loc = VIEWS[view]
bpy.ops.object.camera_add(location=loc)
cam = bpy.context.object
cam.data.lens = 85
target = bpy.data.objects["torso_shell"]
c = cam.constraints.new("TRACK_TO")
c.target = target
c.track_axis = "TRACK_NEGATIVE_Z"
c.up_axis = "UP_Y"
sc.camera = cam
# aim a little above the torso so head and shoulder both frame
cam.constraints[0].influence = 1.0
target_empty = bpy.data.objects.new("aim", None)
sc.collection.objects.link(target_empty)
target_empty.location = (0.0, 0.0, 1.05)
c.target = target_empty

world = bpy.data.worlds.new("spike_world")
sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]

if view == "silhouette":
    # flat white backdrop, all parts black: pure silhouette test
    bg.inputs[0].default_value = (1, 1, 1, 1)
    bg.inputs[1].default_value = 6.0
    flat = bpy.data.materials.new("flat_black")
    flat.use_nodes = True
    nt = flat.node_tree
    for n in list(nt.nodes):
        if n.type != "OUTPUT_MATERIAL":
            nt.nodes.remove(n)
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs[0].default_value = (0, 0, 0, 1)
    nt.links.new(em.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    for ob in bpy.data.objects:
        if ob.type == "MESH" and ob.data.materials:
            ob.data.materials.clear()
            ob.data.materials.append(flat)
else:
    bg.inputs[0].default_value = (0.035, 0.030, 0.060, 1.0)  # near-black indigo, per tokens
    bg.inputs[1].default_value = 0.6
    # one cool key light + a warm fill, per ART_BIBLE section 3
    bpy.ops.object.light_add(type="AREA", location=(3.0, -3.2, 4.2))
    key = bpy.context.object
    key.data.energy = 900
    key.data.size = 3.0
    key.data.color = (0.72, 0.86, 1.0)
    key.rotation_euler = (math.radians(42), 0, math.radians(42))
    bpy.ops.object.light_add(type="AREA", location=(-3.4, -1.4, 0.6))
    fill = bpy.context.object
    fill.data.energy = 220
    fill.data.size = 3.5
    fill.data.color = (1.0, 0.72, 0.45)
    fill.rotation_euler = (math.radians(80), 0, math.radians(-70))
    bpy.ops.object.light_add(type="AREA", location=(-1.2, 3.6, 2.4))
    rim = bpy.context.object
    rim.data.energy = 400
    rim.data.size = 2.0
    rim.data.color = (0.55, 0.75, 1.0)
    rim.rotation_euler = (math.radians(105), 0, math.radians(200))

sc.render.engine = engine
sc.render.resolution_x = res
sc.render.resolution_y = res
sc.render.resolution_percentage = 100
sc.render.film_transparent = False
sc.render.image_settings.file_format = "PNG"
if engine == "CYCLES":
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.cycles.use_adaptive_sampling = True
elif engine == "BLENDER_EEVEE":
    try:
        sc.eevee.taa_render_samples = samples
    except Exception as e:
        print("EEVEE sample set failed:", e)

path = os.path.join(OUT, name + ".png")
sc.render.filepath = path
t0 = time.time()
bpy.ops.render.render(write_still=True)
dt = time.time() - t0
size = os.path.getsize(path) if os.path.exists(path) else -1
print("RENDER engine=%s view=%s res=%dx%d samples=%d seconds=%.2f file=%s bytes=%d"
      % (engine, view, res, res, samples, dt, os.path.basename(path), size))
