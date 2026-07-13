# THE FROSTGIANT'S CAPSULE MARKERS (plans/15 item 16, fleet lane)
# — authors col_* empties into frostgiant-rig.blend, from the measured
# mesh (band histogram, this dispatch): rig stands 0..30.00 Z exactly
# (ruled height — export --scale 1). Robe/legs r~5.5-6.5 (z 0-11);
# belly r~6.2-6.45 jutting -Y toward his face (minY -6.45 at z 12-14);
# chest/shoulders r~7.5-8 at z 17-23 with the cloak reaching +Y 6.5;
# head tapers r~4 -> 1.8 above z 24. Torso radii deliberately EXCLUDE
# the spread arms (max|x| 15.7 at z 14-21 — a capsule fat enough to eat
# an arm would eat honest misses); arm capsules are an eye-pass door
# (rows hold 3-6).
#
# Idempotent: re-running replaces the col_* set. The export step
# (export-patron-colliders.py, --scale 1) turns these into
# src/core/patron-collider.ts rows.
#
# Run:
#   blender --background frostgiant-rig.blend --python author-frostgiant-colliders.py
import bpy

MARKERS = [
    # (name, (x, y, z) rig-space center, radius, halfHeight)
    ("col_haunches", (0.0, -0.5, 5.6), 5.5, 0.3),
    ("col_belly", (0.0, -0.9, 12.5), 5.9, 1.0),
    ("col_chest", (0.0, 0.3, 19.5), 6.3, 1.0),
    ("col_head", (0.0, -0.3, 26.6), 3.2, 0.5),
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
