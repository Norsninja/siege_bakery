# THE DRAGON'S CAPSULE MARKERS (plans/15 item 16, fleet lane) — authors
# col_* empties into dragon-rig.blend, from the measured mesh (band
# histogram + vertex-group split, twenty-first session). THE ODD BODY:
# the dragon SITS — these capsule the SEATED MASS, rig 0..30.00 Z
# (ruled 30 m seated, so export --scale 1). Wing-weighted verts
# (wingL/wingR groups, 4565 of 19245) were EXCLUDED before measuring —
# a capsule fat enough to eat a spread wing would eat honest misses
# (the forcefield rule). Measured body bands (wings out):
#   z  0-12  root: seated haunches, |x|~5-7.4, y -9..+11 (the TAIL
#            sweeps behind on the ground to +11.3 and the front feet
#            reach -9 — both deliberately outside the radius)
#   z 11-16  spine: torso leaning forward, y -10..+3 (center ~ -3.5)
#   z 14-21  neck1: the arc begins, |x|-> 2, y narrowing to -8..-2
#   z 21-26  neck2: y -11..-1 (snout tip -11.3 grazes the radius)
#   z 26-30  head: y -10..-3.5, crown at z 30
# The neck arc is approximated by a stack of VERTICAL capsules
# stepping forward (-Y) and up — no tilted capsules exist in this
# system.
#
# Idempotent: re-running replaces the col_* set. The export step
# (export-patron-colliders.py, --scale 1) turns these into
# src/core/patron-collider.ts rows.
#
# Run:
#   blender --background dragon-rig.blend --python author-dragon-colliders.py
import bpy

MARKERS = [
    # (name, (x, y, z) rig-space center, radius, halfHeight)
    ("col_haunches", (0.0, 1.0, 6.0), 5.8, 0.2),    # span z 0.0..12.0
    ("col_chest", (0.0, -3.5, 13.0), 5.2, 0.8),     # span z 7.0..19.0
    ("col_neck1", (0.0, -5.5, 17.5), 3.0, 1.5),     # span z 13.0..22.0
    ("col_neck2", (0.0, -6.5, 23.0), 3.5, 1.0),     # span z 18.5..27.5
    ("col_head", (0.0, -6.5, 26.8), 3.0, 0.5),      # span z 23.3..30.3
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
