"""Quantify the visible difference between two renders. Args: <a.png> <b.png> [diff.png]

Uses bpy's own image loader so no extra dependency is needed.
"""
import os, sys
import numpy as np
import bpy

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, "out")

def load(n):
    im = bpy.data.images.load(os.path.join(OUT, n))
    px = np.empty(len(im.pixels), dtype=np.float32)
    im.pixels.foreach_get(px)
    return px.reshape(im.size[1], im.size[0], im.channels)[:, :, :3], im.size

a, s = load(sys.argv[1]); sa = tuple(s)
b, s = load(sys.argv[2]); sb = tuple(s)
assert sa == sb, (sa, sb)
d = np.abs(a - b)
lum = d.mean(axis=2)
print("COMPARE %s vs %s  %dx%d" % (sys.argv[1], sys.argv[2], sa[0], sa[1]))
print("  mean abs difference   = %.5f  (0..1 per channel)" % d.mean())
print("  max  abs difference   = %.5f" % d.max())
print("  pixels differing >1/255 = %.3f%%" % (100.0 * (lum > 1 / 255).mean()))
print("  pixels differing >8/255 = %.3f%%" % (100.0 * (lum > 8 / 255).mean()))

if len(sys.argv) > 3:
    amp = np.clip(lum * 8.0, 0, 1)
    out = np.stack([amp, amp, amp, np.ones_like(amp)], axis=2)
    im = bpy.data.images.new("diff", sa[0], sa[1], alpha=True)
    im.pixels.foreach_set(out.reshape(-1))
    im.filepath_raw = os.path.join(OUT, sys.argv[3])
    im.file_format = "PNG"
    im.save()
    print("  wrote %s (difference amplified 8x)" % sys.argv[3])
