"""Spike test object. NOT a Virgil asset, NOT a Phase 1 deliverable.

Builds one chunky robot part in the idiom of assets/concepts/characters/
virgil-turnaround.png: separate rigid rounded shells, a recessed screen face,
and one ball-joint shoulder hidden under an overlapping pauldron shell.
Deliberately generic; this is not the Virgil character.

Run: <venv>/bin/python scripts/build_part.py
"""
import math
import os
import sys
import time

import bpy
from mathutils import Vector

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "out")
os.makedirs(OUT, exist_ok=True)

t0 = time.time()


def wipe():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name, base, rough=0.4, metallic=0.0, emit=None, emit_strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*base, 1.0)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metallic
    if emit is not None:
        b.inputs["Emission Color"].default_value = (*emit, 1.0)
        b.inputs["Emission Strength"].default_value = emit_strength
    return m


def shell(name, size, loc, bevel=0.06, segments=4, rot=(0, 0, 0)):
    """One rigid rounded shell: a box with a heavy bevel, shaded smooth."""
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc, rotation=rot)
    ob = bpy.context.object
    ob.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    b = ob.modifiers.new("bevel", "BEVEL")
    b.width = bevel
    b.segments = segments
    b.limit_method = "ANGLE"
    b.angle_limit = math.radians(30)
    b.harden_normals = True
    bpy.ops.object.shade_smooth()
    return ob


def cyl(name, radius, depth, loc, rot=(0, 0, 0), bevel=0.015):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=32,
                                        location=loc, rotation=rot)
    ob = bpy.context.object
    ob.name = name
    b = ob.modifiers.new("bevel", "BEVEL")
    b.width = bevel
    b.segments = 2
    b.limit_method = "ANGLE"
    b.angle_limit = math.radians(30)
    bpy.ops.object.shade_smooth()
    return ob


def sphere(name, radius, loc):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=32, ring_count=16, location=loc)
    ob = bpy.context.object
    ob.name = name
    bpy.ops.object.shade_smooth()
    return ob


def assign(ob, m):
    ob.data.materials.clear()
    ob.data.materials.append(m)


wipe()

CERAMIC = mat("spike_ceramic", (0.90, 0.87, 0.80), rough=0.32)
BRASS = mat("spike_brass", (0.72, 0.52, 0.20), rough=0.28, metallic=1.0)
DARK = mat("spike_dark", (0.045, 0.045, 0.065), rough=0.45)
SCREEN = mat("spike_screen", (0.02, 0.02, 0.035), rough=0.08)
GLYPH = mat("spike_glyph", (0.05, 0.55, 0.75), rough=0.3, emit=(0.25, 0.80, 1.0), emit_strength=6.0)

parts = []

# --- head shell: one rigid rounded box, with the screen recess cut out of it ---
head = shell("head_shell", (0.60, 0.50, 0.52), (0.0, 0.0, 1.30), bevel=0.12, segments=6)
assign(head, CERAMIC)

# the recess cutter: a rounded box pushed into the front face
cutter = shell("recess_cutter", (0.44, 0.10, 0.34), (0.0, -0.24, 1.32), bevel=0.06, segments=4)
bpy.context.view_layer.objects.active = cutter
bpy.ops.object.modifier_apply(modifier="bevel")
bo = head.modifiers.new("recess", "BOOLEAN")
bo.operation = "DIFFERENCE"
bo.object = cutter
bo.solver = "EXACT"
# Apply the boolean and delete the cutter. A live boolean is not rigid: under a
# posed armature the cutter no longer follows the shell and the recess shears.
bpy.context.view_layer.objects.active = head
bpy.ops.object.modifier_apply(modifier="bevel")
bpy.ops.object.modifier_apply(modifier="recess")
bpy.data.objects.remove(cutter, do_unlink=True)
parts.append(head)

# --- screen panel: a separate rigid part sitting inside the recess ---
screen = shell("screen_panel", (0.40, 0.05, 0.30), (0.0, -0.245, 1.32), bevel=0.02, segments=3)
assign(screen, SCREEN)
parts.append(screen)

# --- two emissive glyph eyes on the screen, separate parts ---
for i, sx in enumerate((-0.10, 0.10)):
    eye = shell("glyph_eye_%d" % i, (0.055, 0.02, 0.10), (sx, -0.272, 1.34), bevel=0.012, segments=3)
    assign(eye, GLYPH)
    parts.append(eye)

# --- brass brow band overlapping the head shell (separate rigid part) ---
brow = cyl("brow_band", 0.33, 0.09, (0.0, -0.02, 1.50), rot=(math.radians(90), 0, 0), bevel=0.014)
assign(brow, BRASS)
parts.append(brow)

# --- two brass ear pods ---
for i, sx in enumerate((-0.335, 0.335)):
    pod = cyl("ear_pod_%d" % i, 0.15, 0.12, (sx, 0.02, 1.28), rot=(0, math.radians(90), 0), bevel=0.015)
    assign(pod, BRASS)
    parts.append(pod)

# --- neck collar: a separate brass ring closing the head/torso gap ---
neck = cyl("neck_collar", 0.20, 0.16, (0.0, 0.0, 1.00), bevel=0.02)
assign(neck, BRASS)
parts.append(neck)

# --- torso block ---
torso = shell("torso_shell", (0.72, 0.52, 0.60), (0.0, 0.0, 0.62), bevel=0.12, segments=6)
assign(torso, CERAMIC)
parts.append(torso)

# --- shoulder: dark ball joint, then upper-arm stub, then an overlapping
#     ceramic pauldron shell that hides the ball entirely ---
ball = sphere("shoulder_ball", 0.17, (0.44, 0.0, 0.82))
assign(ball, DARK)
parts.append(ball)

upper = cyl("upper_arm", 0.13, 0.42, (0.62, 0.0, 0.70), rot=(0, math.radians(20), 0), bevel=0.02)
assign(upper, CERAMIC)
parts.append(upper)

pauldron = shell("pauldron_shell", (0.42, 0.44, 0.36), (0.50, 0.0, 0.86), bevel=0.13, segments=6)
assign(pauldron, CERAMIC)
parts.append(pauldron)

trim = cyl("pauldron_trim", 0.23, 0.05, (0.50, 0.0, 0.68), bevel=0.010)
assign(trim, BRASS)
parts.append(trim)

# group under one empty so the whole part moves as a unit
bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
root = bpy.context.object
root.name = "spike_part_root"
for p in parts:
    p.parent = root
    p.matrix_parent_inverse = root.matrix_world.inverted()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "spike_part.blend"))

# --- report ---
deps = bpy.context.evaluated_depsgraph_get()
total_v = total_f = 0
for p in parts:
    ev = p.evaluated_get(deps)
    m = ev.to_mesh()
    total_v += len(m.vertices)
    total_f += len(m.polygons)
    ev.to_mesh_clear()
print("BUILD parts=%d objects=%d verts=%d faces=%d seconds=%.2f"
      % (len(parts), len(bpy.data.objects), total_v, total_f, time.time() - t0))
