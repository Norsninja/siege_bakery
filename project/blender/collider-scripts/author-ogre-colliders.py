# THE OGRE'S CAPSULE MARKERS (plans/15 item 16, first through the road)
# — authors col_* empties into ogre-rig.blend, from the measured mesh
# (band histogram, twentieth session): rig stands 0..20.89 Z, legs
# r~5.0, belly r~5.5 (jutting -Y, toward his face), shoulders r~5.5,
# head r~2.6 forward. Torso radii deliberately EXCLUDE the spread arms
# (a capsule fat enough to eat the knife arm would eat honest misses);
# arm capsules are an eye-pass door (rows hold 3-6).
#
# Idempotent: re-running replaces the col_* set. The export step
# (export-patron-colliders.py, --scale 36/21) turns these into
# src/core/patron-collider.ts rows.
#
# Run:
#   blender --background ogre-rig.blend --python author-ogre-colliders.py
import bpy

MARKERS = [
    # (name, (x, y, z) rig-space center, radius, halfHeight)
    ("col_haunches", (0.0, 0.0, 5.25), 4.96, 0.29),
    ("col_belly", (0.0, -0.8, 9.33), 5.54, 0.88),
    ("col_chest", (0.0, 0.0, 14.29), 5.54, 0.47),
    ("col_head", (0.0, -1.17, 18.08), 2.63, 0.47),
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
