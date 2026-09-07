"""Compare the alpha coverage of two silhouette renders. Args: <a.png> <b.png>"""
import os, sys
import numpy as np, bpy
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "out")
def alpha(n):
    im = bpy.data.images.load(os.path.join(OUT, n))
    px = np.empty(len(im.pixels), dtype=np.float32); im.pixels.foreach_get(px)
    return px.reshape(im.size[1], im.size[0], im.channels)[:, :, 3]
A, B = alpha(sys.argv[1]), alpha(sys.argv[2])
print("ALPHA_COMPARE %s vs %s  (%d px)" % (sys.argv[1], sys.argv[2], A.size))
for t in (0.5,):
    a, b = A > t, B > t
    inter, union = (a & b).sum(), (a | b).sum()
    print("  coverage>%.1f  a=%d b=%d  IoU=%.6f  disagreeing=%d (%.4f%% of frame)"
          % (t, a.sum(), b.sum(), inter / union, union - inter, 100.0 * (union - inter) / A.size))
partial = ((A > 0.01) & (A < 0.99))
print("  antialiased edge pixels in A: %d" % partial.sum())
d = np.abs(A - B)
print("  mean |alpha diff| overall = %.6f ; on edge pixels = %.6f ; max = %.6f"
      % (d.mean(), d[partial].mean(), d.max()))
