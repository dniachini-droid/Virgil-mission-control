"""Render the 48-frame idle loop on the CPU. Args: <res> <samples> [every_nth]"""
import math, os, sys, time
import bpy
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, "out")
res, samples = int(sys.argv[1]), int(sys.argv[2])
step = int(sys.argv[3]) if len(sys.argv) > 3 else 1

bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, "spike_rigged.blend"))
sc = bpy.context.scene
bpy.ops.object.camera_add(location=(3.4, -3.7, 2.5))
cam = bpy.context.object; cam.data.lens = 85
aim = bpy.data.objects.new("aim", None); sc.collection.objects.link(aim); aim.location = (0, 0, 1.05)
c = cam.constraints.new("TRACK_TO"); c.target = aim
c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"
sc.camera = cam
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.035, 0.030, 0.060, 1.0)
w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
for loc, energy, size, col, rot in (
    ((3.0, -3.2, 4.2), 900, 3.0, (0.72, 0.86, 1.0), (42, 0, 42)),
    ((-3.4, -1.4, 0.6), 220, 3.5, (1.0, 0.72, 0.45), (80, 0, -70)),
    ((-1.2, 3.6, 2.4), 400, 2.0, (0.55, 0.75, 1.0), (105, 0, 200)),
):
    bpy.ops.object.light_add(type="AREA", location=loc)
    L = bpy.context.object
    L.data.energy, L.data.size, L.data.color = energy, size, col
    L.rotation_euler = tuple(math.radians(a) for a in rot)
sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"
sc.cycles.samples = samples; sc.cycles.use_denoising = True
sc.render.resolution_x = sc.render.resolution_y = res
sc.render.image_settings.file_format = "PNG"

frames = list(range(1, 49, step))
t0 = time.time()
for f in frames:
    sc.frame_set(f)
    sc.render.filepath = os.path.join(OUT, "loop", "f%03d.png" % f)
    bpy.ops.render.render(write_still=True)
dt = time.time() - t0
print("LOOP res=%d samples=%d frames=%d total_seconds=%.1f per_frame=%.2f full_48_frame_estimate_seconds=%.0f"
      % (res, samples, len(frames), dt, dt / len(frames), dt / len(frames) * 48))
