# THE FIREGIANT'S CAPSULE MARKERS (plans/15 item 16, fleet lane)
# — authors col_* empties into firegiant-rig.blend, from the measured mesh
# (30-band Z histogram, twenty-first session; rig stands 0..31.00 Z, AT
# ruled height so --scale 1): legs/feet r~6.5-6.7 (feet flare |x|~7.6),
# belly r~6.6 (torso-only maxR 6.5-6.8, z 6-13, slight -Y lean), chest/
# shoulders r~6.8-8.0 (z 17-20, back mass +Y to 6.8), head r~4.5-5.6
# (z 24-31, face juts -Y, yc ~ -1). Torso radii deliberately EXCLUDE the
# low-hanging spread arms (z 6-21, |x| out to 15.2 — a capsule fat enough
# to eat a fist would eat honest misses); the forward beard/flame plume
# (y ~ -6.5, z 5-23) rides mostly inside the belly radius and is not
# specially fattened for.
#
# Idempotent: re-running replaces the col_* set. The export step
# (export-patron-colliders.py, --scale 1) turns these into
# src/core/patron-collider.ts rows.
#
# Run:
#   blender --background firegiant-rig.blend --python author-firegiant-colliders.py
import bpy

MARKERS = [
    # (name, (x, y, z) rig-space center, radius, halfHeight)
    ("col_haunches", (0.0, 0.3, 6.8), 6.4, 0.4),
    ("col_belly", (0.0, -0.2, 11.5), 6.6, 1.0),
    ("col_chest", (0.0, 0.3, 18.0), 6.8, 1.2),
    ("col_head", (0.0, -1.0, 26.0), 4.6, 0.4),
]

for o in [o for o in bpy.data.objects if o.name.startswith("col_")]:
    bpy.data.objects.remove(o, do_unlink=True)

for name, loc, radius, half in MARKERS:
    e = bpy.data.objects.new(name, None)
    e.empty_display_type = 'SPHERE'
    e.location = loc
    e.scale = (radius, radius, half)
    bpy.context.scene.collection.objects.link(e)

bpy.ops.wm.save_mainfile()
print("AUTHORED %d col_* markers into %s" % (len(MARKERS), bpy.data.filepath))
