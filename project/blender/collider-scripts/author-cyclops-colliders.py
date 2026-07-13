# THE CYCLOPS'S CAPSULE MARKERS (plans/15 item 16, fleet dispatch)
# — authors col_* empties into cyclops-rig.blend, from the measured mesh
# (band histogram, headless measure run): rig stands 0..33.00 Z (AT ruled
# height — export --scale 1). Torso-only bands (|x| <= 4.97, excluding the
# spread arms which reach |x| ~14.2 across z 7.7-25.3): legs r~5.5-6.2
# (z 0-8, feet jut -Y to y -5.6), belly r~6.0-6.5 jutting -Y (ymin -5.75
# around z 12-16.5), chest/shoulders r~6.3-6.8 (z 18.7-24), head narrowing
# r~4.7->2.9 (z 27.5-33, jaw jutting -Y to y -4.7). Torso radii
# deliberately EXCLUDE the arms (a capsule fat enough to eat a spread arm
# would eat honest misses — the forcefield rule); arm capsules are an
# eye-pass door (rows hold 3-6).
#
# Idempotent: re-running replaces the col_* set. The export step
# (export-patron-colliders.py, --scale 1) turns these into
# src/core/patron-collider.ts rows.
#
# Run:
#   blender --background cyclops-rig.blend --python author-cyclops-colliders.py
import bpy

MARKERS = [
    # (name, (x, y, z) rig-space center, radius, halfHeight)
    ("col_haunches", (0.0, 0.0, 6.0), 5.3, 0.7),
    ("col_belly", (0.0, -0.5, 12.5), 6.0, 1.5),
    ("col_chest", (0.0, 0.0, 21.5), 6.3, 1.0),
    ("col_head", (0.0, -0.4, 30.0), 3.4, 0.6),
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
