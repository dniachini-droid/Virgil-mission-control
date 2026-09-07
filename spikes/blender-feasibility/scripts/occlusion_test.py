"""Deterministic joint-occlusion test.

Is the shoulder ball joint actually hidden under the overlapping pauldron shell?
The ball is given a unique flat emission colour and the scene is rendered from a
turntable of angles; any pixel of that colour is exposed ball. This is a
measurement, not an impression, and it needs no colour or lighting judgement.

Args: [steps] [res]
"""
import math, os, sys
import numpy as np
import bpy

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, "out")
steps = int(sys.argv[1]) if len(sys.argv) > 1 else 24
res = int(sys.argv[2]) if len(sys.argv) > 2 else 256
# "control": hide the pauldron shell. The ball must then be visible, which
# proves the test can detect exposure rather than always reporting zero.
control = len(sys.argv) > 3 and sys.argv[3] == "control"

bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, "spike_part.blend"))
sc = bpy.context.scene

def flat(name, rgb):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != "OUTPUT_MATERIAL":
            nt.nodes.remove(n)
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs[0].default_value = (*rgb, 1.0)
    nt.links.new(em.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return m

BALL = flat("mark_ball", (1.0, 0.0, 0.0))
OTHER = flat("mark_other", (0.0, 0.0, 0.0))
for ob in bpy.data.objects:
    if ob.type == "MESH":
        ob.data.materials.clear()
        ob.data.materials.append(BALL if ob.name == "shoulder_ball" else OTHER)

if control:
    for n in ("pauldron_shell", "pauldron_trim"):
        bpy.data.objects[n].hide_render = True

w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0, 0, 1, 1)
w.node_tree.nodes["Background"].inputs[1].default_value = 1.0

sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"
sc.cycles.samples = 8; sc.cycles.use_denoising = False
sc.render.resolution_x = sc.render.resolution_y = res
sc.render.image_settings.file_format = "PNG"
sc.view_settings.view_transform = "Standard"   # no filmic remap, colours stay exact

bpy.ops.object.camera_add()
cam = bpy.context.object; cam.data.lens = 85
aim = bpy.data.objects.new("aim", None); sc.collection.objects.link(aim)
aim.location = (0.0, 0.0, 0.85)
c = cam.constraints.new("TRACK_TO"); c.target = aim
c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"
sc.camera = cam

R, Z = 5.0, 1.6
exposed = []
for i in range(steps):
    a = 2 * math.pi * i / steps
    cam.location = (R * math.sin(a), -R * math.cos(a), Z)
    tmp = os.path.join(OUT, "_occl.png")
    sc.render.filepath = tmp
    bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(tmp)
    px = np.empty(len(im.pixels), dtype=np.float32); im.pixels.foreach_get(px)
    px = px.reshape(res, res, im.channels)
    bpy.data.images.remove(im)
    red = (px[:, :, 0] > 0.5) & (px[:, :, 1] < 0.3) & (px[:, :, 2] < 0.3)
    exposed.append(int(red.sum()))
    print("  angle %3d deg : exposed ball pixels = %5d" % (round(math.degrees(a)), red.sum()))

os.remove(os.path.join(OUT, "_occl.png"))
tot = res * res
print("OCCLUSION%s steps=%d res=%d max_exposed_px=%d (%.4f%% of frame) angles_with_any_exposure=%d/%d"
      % ("_CONTROL" if control else "", steps, res, max(exposed), 100.0 * max(exposed) / tot,
         sum(1 for e in exposed if e > 0), steps))
