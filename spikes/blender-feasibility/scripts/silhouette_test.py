"""Render the same scene on two engines with a transparent film and compare the
alpha channel, which is exact per-pixel coverage rather than a luminance guess.

Args: <engine> <name> <res>
"""
import math, os, sys, time
import bpy

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, "out")
engine, name, res = sys.argv[1], sys.argv[2], int(sys.argv[3])

bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, "spike_part.blend"))
sc = bpy.context.scene
bpy.ops.object.camera_add(location=(3.4, -3.7, 2.5))
cam = bpy.context.object
cam.data.lens = 85
aim = bpy.data.objects.new("aim", None); sc.collection.objects.link(aim)
aim.location = (0.0, 0.0, 1.05)
c = cam.constraints.new("TRACK_TO"); c.target = aim
c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"
sc.camera = cam
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[1].default_value = 1.0

sc.render.engine = engine
if engine == "CYCLES":
    sc.cycles.device = "CPU"; sc.cycles.samples = 64; sc.cycles.use_denoising = False
sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = res
sc.render.image_settings.file_format = "PNG"
sc.render.image_settings.color_mode = "RGBA"
sc.render.filepath = os.path.join(OUT, name + ".png")
t0 = time.time()
bpy.ops.render.render(write_still=True)
ok = os.path.exists(sc.render.filepath)
print("SILHOUETTE engine=%s res=%d seconds=%.2f written=%s" % (engine, res, time.time() - t0, ok))
