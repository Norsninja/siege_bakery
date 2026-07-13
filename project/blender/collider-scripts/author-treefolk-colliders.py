# THE TREEFOLK'S CAPSULE MARKERS (plans/15 item 16 fleet lane)
# — authors col_* empties into treefolk-rig.blend, from the measured mesh
# (band histogram, headless measure run): rig stands 0..40.00 Z exactly
# (ruled height — export --scale 1). Root flare at the base (tips to
# r~12, core p50 ~8.6); lower trunk narrows to r~7.4-8.7 (z 4-9); the
# BRANCH ARMS spread z 9.3-22.7 (maxRadial ~18.6, max|x| ~18.5) while
# the trunk core holds p50 ~6.5-7 — the trunk capsule deliberately
# EXCLUDES the canopy spread (a capsule fat enough to eat a branch tip
# would eat honest misses); crown mass z 24-32 reads r~9.7-11.5; the
# top (z 32-40) narrows 8.3 -> 4.8 and leans -Y (face-ward), band
# y-centers ~-2.6.
#
# Idempotent: re-running replaces the col_* set. The export step
# (export-patron-colliders.py, --scale 1) turns these into
# src/core/patron-collider.ts rows.
#
# Run:
#   blender --background treefolk-rig.blend --python author-treefolk-colliders.py
import bpy

MARKERS = [
    # (name, (x, y, z) rig-space center, radius, halfHeight)
    # halfHeight floors at 0.3 (was 0.0): a zero-height capsule is a
    # degenerate sphere and the table pin demands real capsules.
    ("col_roots", (0.0, 0.0, 8.0), 8.0, 0.3),
    ("col_trunk", (0.0, -0.2, 15.5), 7.0, 1.5),
    ("col_shoulders", (0.0, 0.5, 22.0), 8.0, 0.5),
    ("col_crown", (0.0, 0.6, 27.5), 9.8, 1.0),
    ("col_crownTop", (0.0, -2.5, 34.0), 6.0, 0.3),
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
