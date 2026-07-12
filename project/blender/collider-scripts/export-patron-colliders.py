# THE PATRON COLLIDER EXPORT (plans/15 item 16) — reads col_* marker
# empties from a rig .blend and prints the species' capsule rows for
# src/core/patron-collider.ts's CHECKED-IN table. The script is the
# recipe (region-scripts / make-sfx culture): regenerate the row after
# moving markers; never hand-tune the TS numbers.
#
# THE MARKER CONVENTION (the road recipe's collider-authoring step):
#   - One empty per capsule, named col_<part> (display type SPHERE so
#     the radius gizmo reads true in the viewport).
#   - location = capsule CENTER, rig space (Blender Z-up, -Y = the
#     model's face — the glTF exporter turns -Y into the game's +Z).
#   - scale.x = radius (meters, rig space); scale.z = halfHeight.
#     scale.y is ignored (keep it = scale.x so the gizmo is honest).
#   - Capsules are VERTICAL (game Y). Coarse comedy: 3-6 per species —
#     "the bounce lands on the body," never mesh accuracy.
#
# THE AUTHORING TRAP (ruled): capsules ship at RULED height. Pass the
# species' client visualScale as --scale (the ogre rig is ~21 m and
# renders at 36 m -> 36/21); rigs modeled at ruled height pass 1.
#
# Run:
#   blender --background <species>-rig.blend --python export-patron-colliders.py -- --scale 1.7142857
#
# Axis map (CLAUDE.md law): game(x, y, z) = blender(bx, bz, -by).
import bpy
import sys

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
scale = 1.0
if "--scale" in argv:
    scale = float(argv[argv.index("--scale") + 1])

rows = []
for o in sorted(bpy.data.objects, key=lambda o: o.location.z):
    if o.type != 'EMPTY' or not o.name.startswith("col_"):
        continue
    part = o.name[len("col_"):]
    gx = o.location.x * scale
    gy = o.location.z * scale
    gz = -o.location.y * scale
    gz = 0.0 if gz == 0 else gz  # never print -0.0
    r = o.scale.x * scale
    hh = o.scale.z * scale
    rows.append(
        "    { x: %.1f, y: %.1f, z: %.1f, halfHeight: %.1f, radius: %.1f }, // %s"
        % (gx, gy, gz, hh, r, part)
    )

name = bpy.path.basename(bpy.data.filepath).replace("-rig.blend", "")
print("PATRON_COLLIDER_ROW_BEGIN")
print("  // %s: exported by collider-scripts/export-patron-colliders.py" % name)
print("  // (markers in %s-rig.blend, --scale %.6g baked in)." % (name, scale))
print("  %s: [" % name)
for r in rows:
    print(r)
print("  ],")
print("PATRON_COLLIDER_ROW_END")
if not rows:
    print("WARNING: no col_* markers found in %s" % bpy.data.filepath)
