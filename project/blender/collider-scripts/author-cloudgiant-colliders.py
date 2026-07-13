# THE CLOUD GIANT'S CAPSULE MARKERS (plans/15 item 16, fleet lane)
# — authors col_* empties into cloudgiant-rig.blend, from the measured
# mesh (band histogram, headless): rig stands 0..38.000 Z EXACTLY at
# ruled height (export --scale 1). Bell skirt z 1-8 billows to r~7.5
# (capsule shaved to 6.2 — the forcefield rule: cloth extremes don't
# eat honest misses); waist/torso z 8-14 r~5.7-6.0; chest z 14-21.5
# torso-only r~4.1-5.5 with ARMS SPREAD to |x|~9.6 (excluded, |x|<=4
# filter); upper chest/collar z 21.5-28 juts -Y to -5.3 (toward her
# face, capsule y-centered -1.9); head z 28-38 r~3.2-4.0, crown taper.
#
# Idempotent: re-running replaces the col_* set. The export step
# (export-patron-colliders.py, --scale 1 — the rig ships at ruled
# 38 m) turns these into src/core/patron-collider.ts rows.
#
# Run:
#   blender --background cloudgiant-rig.blend --python author-cloudgiant-colliders.py
import bpy

MARKERS = [
    # (name, (x, y, z) rig-space center, radius, halfHeight)
    ("col_skirt", (0.0, 0.0, 6.8), 6.2, 0.6),
    ("col_belly", (0.0, -1.0, 17.8), 4.5, 0.3),
    ("col_chest", (0.0, -1.9, 25.0), 3.5, 0.4),
    ("col_head", (0.0, -0.9, 33.0), 3.2, 1.7),
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
