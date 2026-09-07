"""Render a posed .blend. Args: <blend> <name> <res> <samples> [frame]"""
import math, os, sys, time
import bpy

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, "out")
blend, name, res, samples = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
frame = int(sys.argv[5]) if len(sys.argv) > 5 else None

bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, blend))
sc = bpy.context.scene
if frame is not None:
    sc.frame_set(frame)

bpy.ops.object.camera_add(location=(3.4, -3.7, 2.5))
cam = bpy.context.object
cam.data.lens = 85
aim = bpy.data.objects.new("aim", None)
sc.collection.objects.link(aim)
aim.location = (0.0, 0.0, 1.05)
c = cam.constraints.new("TRACK_TO")
c.target = aim
c.track_axis = "TRACK_NEGATIVE_Z"
c.up_axis = "UP_Y"
sc.camera = cam

world = bpy.data.worlds.new("w"); sc.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.035, 0.030, 0.060, 1.0)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.6
for loc, energy, size, col, rot in (
    ((3.0, -3.2, 4.2), 900, 3.0, (0.72, 0.86, 1.0), (42, 0, 42)),
    ((-3.4, -1.4, 0.6), 220, 3.5, (1.0, 0.72, 0.45), (80, 0, -70)),
    ((-1.2, 3.6, 2.4), 400, 2.0, (0.55, 0.75, 1.0), (105, 0, 200)),
):
    bpy.ops.object.light_add(type="AREA", location=loc)
    L = bpy.context.object
    L.data.energy, L.data.size, L.data.color = energy, size, col
    L.rotation_euler = tuple(math.radians(a) for a in rot)

sc.render.engine = "CYCLES"
sc.cycles.device = "CPU"
sc.cycles.samples = samples
sc.cycles.use_denoising = True
sc.render.resolution_x = sc.render.resolution_y = res
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = os.path.join(OUT, name + ".png")
t0 = time.time()
bpy.ops.render.render(write_still=True)
print("RENDER blend=%s name=%s res=%d samples=%d seconds=%.2f" % (blend, name, res, samples, time.time() - t0))
