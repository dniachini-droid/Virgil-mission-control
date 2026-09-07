"""Rig the spike part two ways and measure which one deforms the rigid shells.

A: bone parenting  - each shell is a child of one bone, moved as a rigid body.
B: armature deform - one joined mesh, automatic weights, the usual approach for
   an organic character.

Rigidity metric: for each part, sample vertex pairs, measure the pairwise
distance in the rest pose and in the posed frame. A rigid part preserves every
pairwise distance exactly; any non-zero maximum deviation is the shell bending.
"""
import itertools
import math
import os
import random
import time

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, "out")

BONE_OF = {
    "torso_shell": "spine",
    "neck_collar": "neck",
    "head_shell": "head", "screen_panel": "head", "glyph_eye_0": "head",
    "glyph_eye_1": "head", "brow_band": "head", "ear_pod_0": "head", "ear_pod_1": "head",
    "shoulder_ball": "shoulder", "pauldron_shell": "shoulder", "pauldron_trim": "shoulder",
    "upper_arm": "arm",
}
BONES = [
    ("spine", (0, 0, 0.30), (0, 0, 0.92), None),
    ("neck", (0, 0, 0.92), (0, 0, 1.04), "spine"),
    ("head", (0, 0, 1.04), (0, 0, 1.58), "neck"),
    ("shoulder", (0.16, 0, 0.84), (0.44, 0, 0.82), "spine"),
    ("arm", (0.44, 0, 0.82), (0.74, 0, 0.60), "shoulder"),
]


def build_armature():
    bpy.ops.object.armature_add(location=(0, 0, 0))
    arm = bpy.context.object
    arm.name = "spike_rig"
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm.data.edit_bones
    for b in list(eb):
        eb.remove(b)
    for name, head, tail, parent in BONES:
        b = eb.new(name)
        b.head, b.tail = Vector(head), Vector(tail)
        if parent:
            b.parent = eb[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    return arm


def world_verts(ob, deps):
    ev = ob.evaluated_get(deps)
    m = ev.to_mesh()
    mw = ev.matrix_world
    vs = [mw @ v.co.copy() for v in m.vertices]
    ev.to_mesh_clear()
    return vs


def rigidity(rest, posed, sample=400, seed=7):
    """Max deviation of any sampled pairwise distance, in metres."""
    n = min(len(rest), len(posed))
    if n < 2:
        return 0.0
    rng = random.Random(seed)
    worst = 0.0
    for _ in range(sample):
        i, j = rng.randrange(n), rng.randrange(n)
        if i == j:
            continue
        d0 = (rest[i] - rest[j]).length
        d1 = (posed[i] - posed[j]).length
        worst = max(worst, abs(d1 - d0))
    return worst


def pose(arm, amount=1.0):
    """One posed frame: head tilt + shoulder swing."""
    arm.pose.bones["head"].rotation_mode = "XYZ"
    arm.pose.bones["head"].rotation_euler = (math.radians(14 * amount), 0, math.radians(22 * amount))
    arm.pose.bones["shoulder"].rotation_mode = "XYZ"
    arm.pose.bones["shoulder"].rotation_euler = (0, math.radians(-38 * amount), 0)


# ---------------------------------------------------------------- A: rigid
t0 = time.time()
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, "spike_part.blend"))
sc = bpy.context.scene
parts = [o for o in bpy.data.objects if o.type == "MESH" and o.name in BONE_OF]
arm = build_armature()

deps = bpy.context.evaluated_depsgraph_get()
rest = {p.name: world_verts(p, deps) for p in parts}

# Bone parenting is relative to the bone TAIL, so setting matrix_parent_inverse
# from the bone matrix misplaces the shell. Restore the world matrix after
# parenting and let Blender solve for the basis.
for p in parts:
    mw = p.matrix_world.copy()
    p.parent = arm
    p.parent_type = "BONE"
    p.parent_bone = BONE_OF[p.name]
    bpy.context.view_layer.update()
    p.matrix_world = mw
bpy.context.view_layer.update()

pose(arm, 1.0)
bpy.context.view_layer.update()
deps = bpy.context.evaluated_depsgraph_get()
print("\n--- A: bone parenting (rigid shells) ---")
worst_a = 0.0
for p in parts:
    dev = rigidity(rest[p.name], world_verts(p, deps))
    worst_a = max(worst_a, dev)
    print("  %-16s max pairwise-distance deviation = %.3e m" % (p.name, dev))
print("A_WORST_DEVIATION_M=%.3e  rig_seconds=%.2f" % (worst_a, time.time() - t0))

# animate: 48-frame loop, frame 49 identical to frame 1
# Blender 5.0 removed Action.fcurves (slotted actions); set interpolation on the
# preference instead of walking the curves.
prefs = bpy.context.preferences.edit
prefs.keyframe_new_interpolation_type = "BEZIER"
prefs.keyframe_new_handle_type = "AUTO_CLAMPED"
pose(arm, 0.0)
for b in ("head", "shoulder"):
    arm.pose.bones[b].keyframe_insert("rotation_euler", frame=1)
    arm.pose.bones[b].keyframe_insert("rotation_euler", frame=49)
pose(arm, 1.0)
for b in ("head", "shoulder"):
    arm.pose.bones[b].keyframe_insert("rotation_euler", frame=25)
sc.frame_start, sc.frame_end = 1, 48
arm.animation_data.action.name = "spike_idle_loop"

# verify the loop closes
sc.frame_set(1)
bpy.context.view_layer.update()
deps = bpy.context.evaluated_depsgraph_get()
f1 = world_verts(bpy.data.objects["head_shell"], deps)
sc.frame_set(49)
bpy.context.view_layer.update()
deps = bpy.context.evaluated_depsgraph_get()
f49 = world_verts(bpy.data.objects["head_shell"], deps)
gap = max((a - b).length for a, b in zip(f1, f49))
print("LOOP_CLOSURE_MAX_VERT_GAP_M=%.3e (frame 1 vs frame 49)" % gap)
sc.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "spike_rigged.blend"))

# ---------------------------------------------------------------- B: skinned
t1 = time.time()
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, "spike_part.blend"))
parts = [o for o in bpy.data.objects if o.type == "MESH" and o.name in BONE_OF]
deps = bpy.context.evaluated_depsgraph_get()
rest_b = {p.name: world_verts(p, deps) for p in parts}
counts = {p.name: len(rest_b[p.name]) for p in parts}

arm = build_armature()
# Automatic weights over the whole rig, the usual approach for an organic
# character. Parts are kept as separate objects so vertex indices stay stable
# and each part can be measured against its own rest pose.
bpy.ops.object.select_all(action="DESELECT")
for p in parts:
    p.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.parent_set(type="ARMATURE_AUTO")

pose(arm, 1.0)
bpy.context.view_layer.update()
deps = bpy.context.evaluated_depsgraph_get()

print("\n--- B: armature deform, automatic weights ---")
worst_b = 0.0
for p in parts:
    dev = rigidity(rest_b[p.name], world_verts(p, deps))
    worst_b = max(worst_b, dev)
    ngroups = len(p.vertex_groups)
    print("  %-16s max pairwise-distance deviation = %.3e m   (%d vertex groups)"
          % (p.name, dev, ngroups))
print("B_WORST_DEVIATION_M=%.3e  rig_seconds=%.2f" % (worst_b, time.time() - t1))
print("RATIO_B_OVER_A=%s" % ("inf" if worst_a == 0 else "%.0f" % (worst_b / worst_a)))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "spike_skinned.blend"))
