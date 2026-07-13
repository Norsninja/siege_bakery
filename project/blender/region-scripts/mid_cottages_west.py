# mid_cottages_west.py — COMMISSION: three dwarf cottages, west hamlet
# expansion (mid_town_west core sits at x -134..-104, y -20..42, h 23.5;
# this trio sits just south/upslope of it, on the hamlet's near edge).
#
# Per research/18-region-structure-rules.md (THE SCRIPT CONTRACT §8).
# Band: mid_ (lit + fogged — TRUE LOCAL COLOR, no baked haze).
# Zone: x -160..-138, y 5..35 (blender), height cap 20 m. Budget 320 tris.
#
# Design (silhouette first, judged from the post eye at (1.5, 11, 1.6),
# ~150 m away): three small gable/hip-roofed cottages, footprints and
# rotations varied so the group zig-zags across the zone (not a row):
#   A — gable roof, 6x5.2 m footprint, wall 6 m + ridge rise 6 m, rotated
#       15 deg, at (-152, 10.5).
#   B — hip roof, 6.8x6 m footprint (the big one), wall 7 m + apex rise
#       6 m, rotated -25 deg, at (-146, 20). THE ONE PINK ACCENT: its
#       whole roof is brand pink (#B87890) — no other pink in the group.
#   C — gable roof, 4.8x4.4 m footprint (the small one), wall 5 m + ridge
#       rise 5 m, rotated 40 deg, at (-150, 30).
# Every cottage: cream walls (#C8C8B8), a shallow door box proud of the
# front (local +y) wall, two small dark window boxes flanking it, and a
# chimney box punched through the back-quadrant of the roof. Roofs and
# doors otherwise stay in the timber family (#886060 / #806870) per the
# west hamlet's language. Grounded per-site by §7 raycast, base sunk
# 0.3 m each (the meadow rolls here — three different ground samples).
#
# Deterministic: no randomness used at all. Idempotent: OWNED teardown
# first, raycasts AFTER teardown.
#
# WINDING: every local face below is hand-derived via explicit edge
# cross-products at angle=0 (worked in the design notes kept inline next
# to each face — the same method as the bakehouse/granary precedents),
# THEN the whole footprint is rotated about Z per cottage. A rotation
# about Z is orientation-preserving (determinant +1), so it can never
# flip a correctly-derived outward normal into an inward one — the hand
# proof at angle=0 stays valid at any rotation. On top of that (and
# because this commission explicitly calls for it, beyond the ordinary
# §8 contract — rotated footprints are exactly the case the watchtower-
# door bug slipped through by eye), every emitted face is ALSO checked
# programmatically after the mesh is built: each part records its own
# centroid, and every one of its faces must have Blender's own computed
# normal pointing away from that centroid (centroid-ray parity). See the
# "winding" result check.

import bpy
import math
from mathutils import Vector

OWNED = ["mid_cottages_west"]
NAME = "mid_cottages_west"
PREFIX = "mid_"
BUDGET = 320
ZONE_X = (-160.0, -138.0)
ZONE_Y = (5.0, 35.0)
ZONE_ZMAX = 20.0
SINK = 0.3                     # §7: sink the base 0.3 m into raycast ground

# ---------------------------------------------------------------------------
# §5 palette of record — LINEAR hex written verbatim as floats (int/255).
# NO sRGB conversion (§4).
# ---------------------------------------------------------------------------
def hx(h, mul=1.0):
    r = min(1.0, (int(h[0:2], 16) / 255.0) * mul)
    g = min(1.0, (int(h[2:4], 16) / 255.0) * mul)
    b = min(1.0, (int(h[4:6], 16) / 255.0) * mul)
    return (r, g, b, 1.0)

WALL_CREAM = hx("C8C8B8")
TIMBER_A   = hx("886060")       # roof / door, family A
TIMBER_B   = hx("806870")       # roof / door, family B
BRAND_PINK = hx("B87890")       # THE ONE pink accent (cottage B's roof only)
SOOT       = hx("886060", 0.72) # windows / soot-dark accents, within ±10-30% of the family

# ---------------------------------------------------------------------------
# 0. Snapshots (for no_strays / material_vtx honesty), mode guard
# ---------------------------------------------------------------------------
names_before = {o.name for o in bpy.data.objects}
mats_before = {m.name for m in bpy.data.materials}

if bpy.context.mode != 'OBJECT':
    try:
        bpy.ops.object.mode_set(mode='OBJECT')
    except RuntimeError:
        pass

# ---------------------------------------------------------------------------
# 1. Idempotent teardown — OWNED objects AND their mesh datablocks (§8.2)
# ---------------------------------------------------------------------------
for owned_name in OWNED:
    old = bpy.data.objects.get(owned_name)
    if old is not None:
        old_mesh = old.data if old.type == 'MESH' else None
        bpy.data.objects.remove(old, do_unlink=True)
        if old_mesh is not None and old_mesh.users == 0:
            bpy.data.meshes.remove(old_mesh)
    stale = bpy.data.meshes.get(owned_name)
    if stale is not None and stale.users == 0:
        bpy.data.meshes.remove(stale)

# ---------------------------------------------------------------------------
# 2. Geometry accumulators + the rotate-then-hand-verified-winding helpers
# ---------------------------------------------------------------------------
V, F, C = [], [], []          # verts, faces, per-vertex RGBA
PART_RANGES = []              # (centroid Vector, face_start, face_end)

def emit_part(verts_local, faces_local, color, centroid):
    base = len(V)
    V.extend(verts_local)
    C.extend([color] * len(verts_local))
    fstart = len(F)
    F.extend([tuple(base + i for i in f) for f in faces_local])
    PART_RANGES.append((Vector(centroid), fstart, len(F)))

def rot_xy(x, y, deg):
    a = math.radians(deg)
    ca, sa = math.cos(a), math.sin(a)
    return (x * ca - y * sa, x * sa + y * ca)

def box_part(cx, cy, angle, hx_, hy_, z0, z1, color, sides=("back", "right", "front", "left", "top")):
    """Axis-aligned box before rotation: local +y is the FRONT (door side),
    local -y the BACK. Each side's vertex order below was cross-product
    verified at angle=0 (see header):
      back  (y=-hy, outward -y): (xlo,z0)(xhi,z0)(xhi,z1)(xlo,z1)
      front (y=+hy, outward +y): (xlo,z0)(xlo,z1)(xhi,z1)(xhi,z0)
      right (x=+hx, outward +x): (ylo,z0)(yhi,z0)(yhi,z1)(ylo,z1)
      left  (x=-hx, outward -x): (ylo,z0)(ylo,z1)(yhi,z1)(yhi,z0)
      top   (z=z1,  outward +z): (xlo,ylo)(xhi,ylo)(xhi,yhi)(xlo,yhi)
      bottom(z=z0,  outward -z): (xlo,ylo)(xlo,yhi)(xhi,yhi)(xhi,ylo)
    A Z-rotation is orientation-preserving, so these stay outward at any
    `angle`.
    """
    def wp(x, y, z):
        rx, ry = rot_xy(x, y, angle)
        return (cx + rx, cy + ry, z)

    fdefs = {
        "back":   [wp(-hx_, -hy_, z0), wp(hx_, -hy_, z0), wp(hx_, -hy_, z1), wp(-hx_, -hy_, z1)],
        "front":  [wp(-hx_,  hy_, z0), wp(-hx_,  hy_, z1), wp(hx_,  hy_, z1), wp(hx_,  hy_, z0)],
        "right":  [wp(hx_, -hy_, z0), wp(hx_,  hy_, z0), wp(hx_,  hy_, z1), wp(hx_, -hy_, z1)],
        "left":   [wp(-hx_, -hy_, z0), wp(-hx_, -hy_, z1), wp(-hx_,  hy_, z1), wp(-hx_,  hy_, z0)],
        "top":    [wp(-hx_, -hy_, z1), wp(hx_, -hy_, z1), wp(hx_,  hy_, z1), wp(-hx_,  hy_, z1)],
        "bottom": [wp(-hx_, -hy_, z0), wp(-hx_,  hy_, z0), wp(hx_,  hy_, z0), wp(hx_, -hy_, z0)],
    }
    verts_local, faces_local = [], []
    for side in sides:
        pts = fdefs[side]
        base = len(verts_local)
        verts_local.extend(pts)
        faces_local.append((base, base + 1, base + 2, base + 3))
    centroid = wp(0.0, 0.0, (z0 + z1) * 0.5)
    emit_part(verts_local, faces_local, color, centroid)

def gable_roof_part(cx, cy, angle, hx_, hy_, eave_z, ridge_z, overhang, color):
    """Ridge runs along local X. Eave corners overhung by `overhang` on
    every side; ridge spans the same overhung X extent as the eaves so
    the gable-end triangles read as full theatrical peaks. Face orders
    (e0 back-left, e1 back-right, e2 front-right, e3 front-left, r0/r1
    ridge ends) cross-product verified at angle=0 in the header:
      slope_back  (e0,e1,r1,r0)  outward (-y,+z)
      slope_front (e2,e3,r0,r1)  outward (+y,+z)
      gable_west  (e0,r0,e3)     outward -x
      gable_east  (e1,e2,r1)     outward +x
    """
    hxo, hyo = hx_ + overhang, hy_ + overhang

    def wp(x, y, z):
        rx, ry = rot_xy(x, y, angle)
        return (cx + rx, cy + ry, z)

    e0 = wp(-hxo, -hyo, eave_z)
    e1 = wp(hxo, -hyo, eave_z)
    e2 = wp(hxo, hyo, eave_z)
    e3 = wp(-hxo, hyo, eave_z)
    r0 = wp(-hxo, 0.0, ridge_z)
    r1 = wp(hxo, 0.0, ridge_z)

    verts_local = [e0, e1, e2, e3, r0, r1]   # indices 0..5
    faces_local = [
        (0, 1, 5, 4),   # slope_back
        (2, 3, 4, 5),   # slope_front
        (0, 4, 3),      # gable_west
        (1, 2, 5),      # gable_east
    ]
    centroid = wp(0.0, 0.0, (eave_z + ridge_z) * 0.5)
    emit_part(verts_local, faces_local, color, centroid)

def hip_roof_part(cx, cy, angle, hx_, hy_, eave_z, apex_z, overhang, color):
    """4-sided pyramid, apex on the rotation axis. Face orders (e0 back-
    left, e1 back-right, e2 front-right, e3 front-left, A apex)
    cross-product verified at angle=0 in the header:
      back  (e0,e1,A) outward (-y,+z)
      right (e1,e2,A) outward (+x,+z)
      front (e2,e3,A) outward (+y,+z)
      left  (e3,e0,A) outward (-x,+z)
    """
    hxo, hyo = hx_ + overhang, hy_ + overhang

    def wp(x, y, z):
        rx, ry = rot_xy(x, y, angle)
        return (cx + rx, cy + ry, z)

    e0 = wp(-hxo, -hyo, eave_z)
    e1 = wp(hxo, -hyo, eave_z)
    e2 = wp(hxo, hyo, eave_z)
    e3 = wp(-hxo, hyo, eave_z)
    apex = wp(0.0, 0.0, apex_z)

    verts_local = [e0, e1, e2, e3, apex]      # indices 0..4
    faces_local = [
        (0, 1, 4),
        (1, 2, 4),
        (2, 3, 4),
        (3, 0, 4),
    ]
    centroid = wp(0.0, 0.0, (eave_z + apex_z) * 0.5)
    emit_part(verts_local, faces_local, color, centroid)

def build_cottage(cx, cy, angle, hx_, hy_, wall_h, roof_h, roof_style, overhang,
                   ground_z, wall_color, roof_color, door_color, chimney_color):
    base_z = ground_z - SINK
    wall_top = base_z + wall_h

    box_part(cx, cy, angle, hx_, hy_, base_z, wall_top, wall_color,
              sides=("back", "right", "front", "left"))   # top hidden under the roof, bottom hidden in the ground

    if roof_style == "gable":
        gable_roof_part(cx, cy, angle, hx_, hy_, wall_top, wall_top + roof_h, overhang, roof_color)
    else:
        hip_roof_part(cx, cy, angle, hx_, hy_, wall_top, wall_top + roof_h, overhang, roof_color)
    ridge_top = wall_top + roof_h

    # door: shallow box proud of the front (+y local) wall face
    door_h = min(3.0, wall_h - 0.5)
    ddx, ddy = rot_xy(0.0, hy_ + 0.25, angle)
    box_part(cx + ddx, cy + ddy, angle, 0.8, 0.25, base_z, base_z + door_h, door_color,
              sides=("right", "front", "left", "top"))     # back embedded flush in the wall, bottom in the ground

    # two small windows flanking the door
    win_z0, win_z1 = base_z + wall_h * 0.35, base_z + wall_h * 0.72
    for side in (-1.0, 1.0):
        wdx, wdy = rot_xy(side * hx_ * 0.55, hy_ + 0.12, angle)
        box_part(cx + wdx, cy + wdy, angle, 0.45, 0.12, win_z0, win_z1, SOOT,
                  sides=("right", "front", "left"))        # embedded top/back/bottom

    # chimney: punches through the back-quadrant of the roof, clears the ridge
    chdx, chdy = rot_xy(hx_ * 0.35, -hy_ * 0.25, angle)
    ch_bottom = wall_top - 0.6
    ch_top = ridge_top + 1.8
    box_part(cx + chdx, cy + chdy, angle, 0.55, 0.55, ch_bottom, ch_top, chimney_color,
              sides=("back", "right", "front", "left", "top"))

    return base_z, ridge_top + 1.8

# ---------------------------------------------------------------------------
# 3. The three cottages — footprints/orientations/roof styles all varied,
#    positions zig-zag across the zone so the cluster doesn't read as a row
# ---------------------------------------------------------------------------
COTTAGES = [
    dict(cx=-152.0, cy=10.5, angle=15.0, hx=3.0, hy=2.6, wall_h=6.0, roof_h=6.0,
         roof_style="gable", overhang=0.5,
         wall_color=WALL_CREAM, roof_color=TIMBER_A, door_color=TIMBER_B, chimney_color=SOOT),
    dict(cx=-146.0, cy=20.0, angle=-25.0, hx=3.4, hy=3.0, wall_h=7.0, roof_h=6.0,
         roof_style="hip", overhang=0.6,
         wall_color=WALL_CREAM, roof_color=BRAND_PINK, door_color=TIMBER_A, chimney_color=TIMBER_B),
    dict(cx=-150.0, cy=30.0, angle=40.0, hx=2.4, hy=2.2, wall_h=5.0, roof_h=5.0,
         roof_style="gable", overhang=0.5,
         wall_color=WALL_CREAM, roof_color=TIMBER_B, door_color=TIMBER_A, chimney_color=SOOT),
]

deps = bpy.context.evaluated_depsgraph_get()

cottage_reports = []   # (ground_z, hit, base_z, top_z, v_start, v_end)
for spec in COTTAGES:
    hit, loc, *_ = bpy.context.scene.ray_cast(
        deps, Vector((spec["cx"], spec["cy"], 50.0)), Vector((0.0, 0.0, -1.0)))
    ground_z = loc.z if hit else 0.0

    v_start = len(V)
    base_z, top_z = build_cottage(
        spec["cx"], spec["cy"], spec["angle"], spec["hx"], spec["hy"],
        spec["wall_h"], spec["roof_h"], spec["roof_style"], spec["overhang"],
        ground_z, spec["wall_color"], spec["roof_color"], spec["door_color"], spec["chimney_color"])
    v_end = len(V)
    cottage_reports.append((ground_z, hit, base_z, top_z, v_start, v_end))

# ---------------------------------------------------------------------------
# 4. One mesh, one object; flat shading; existing "vtx" by reference (§4)
# ---------------------------------------------------------------------------
mesh = bpy.data.meshes.new(NAME)
mesh.from_pydata(V, [], F)
mesh.validate()
mesh.update()

for p in mesh.polygons:
    p.use_smooth = False

ca = mesh.color_attributes.new(name="Col", type='FLOAT_COLOR', domain='POINT')
for i, col in enumerate(C):
    ca.data[i].color = col   # raw LINEAR floats, verbatim (§4)

vtx_mat = bpy.data.materials.get("vtx")
if vtx_mat is not None:
    mesh.materials.append(vtx_mat)   # by reference — NEVER created here

obj = bpy.data.objects.new(NAME, mesh)
bpy.context.scene.collection.objects.link(obj)
obj.location = (0.0, 0.0, 0.0)        # mesh is authored in world coords
obj.rotation_euler = (0.0, 0.0, 0.0)
obj.scale = (1.0, 1.0, 1.0)

# ---------------------------------------------------------------------------
# 5. Self-validation (§8.5) — every check computed honestly; this script
#    CAN fail, and says so. Includes the commissioned EXTRA "winding" check.
# ---------------------------------------------------------------------------
checks = {}

created = [n for n in OWNED if n in bpy.data.objects]

checks["names_prefixed"] = (
    True if all(n.startswith(PREFIX) for n in OWNED)
    else "OWNED name missing '%s' prefix" % PREFIX)

names_after = {o.name for o in bpy.data.objects}
strays = (names_after ^ names_before) - set(OWNED)
checks["no_strays"] = True if not strays else "strays: %s" % sorted(strays)

new_mats = {m.name for m in bpy.data.materials} - mats_before
slot_names = [s.material.name if s.material else None for s in obj.material_slots]
if new_mats:
    checks["material_vtx"] = "created materials: %s" % sorted(new_mats)
elif slot_names != ["vtx"]:
    checks["material_vtx"] = "slots are %s, want ['vtx']" % slot_names
else:
    checks["material_vtx"] = True

ca_chk = mesh.color_attributes.get("Col")
if (ca_chk is not None and ca_chk.data_type == 'FLOAT_COLOR'
        and ca_chk.domain == 'POINT'
        and len(ca_chk.data) == len(mesh.vertices)
        and len(mesh.vertices) > 0):
    checks["color_attr"] = True
else:
    checks["color_attr"] = (
        "Col attr wrong: %s" % (
            "missing" if ca_chk is None else
            "%s/%s, %d data for %d verts" % (
                ca_chk.data_type, ca_chk.domain, len(ca_chk.data), len(mesh.vertices))))

tri_count = sum(len(p.vertices) - 2 for p in mesh.polygons)
checks["budget"] = (
    True if tri_count <= BUDGET
    else "%d tris > budget %d" % (tri_count, BUDGET))

deps2 = bpy.context.evaluated_depsgraph_get()  # settle before reading bbox
bb = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
min_x = min(p.x for p in bb); max_x = max(p.x for p in bb)
min_y = min(p.y for p in bb); max_y = max(p.y for p in bb)
min_z = min(p.z for p in bb); max_z = max(p.z for p in bb)
if (ZONE_X[0] <= min_x and max_x <= ZONE_X[1]
        and ZONE_Y[0] <= min_y and max_y <= ZONE_Y[1]
        and max_z <= ZONE_ZMAX):
    checks["zone"] = True
else:
    checks["zone"] = (
        "bbox x %.1f..%.1f y %.1f..%.1f zmax %.1f outside x %s y %s cap %.0f"
        % (min_x, max_x, min_y, max_y, max_z, ZONE_X, ZONE_Y, ZONE_ZMAX))

grounded_bad = []
for i, (ground_z, hit, base_z, top_z, v_start, v_end) in enumerate(cottage_reports):
    target_base = ground_z - SINK
    actual_min_z = min(V[j][2] for j in range(v_start, v_end))
    if abs(actual_min_z - target_base) > 0.5:
        grounded_bad.append(
            "cottage %d: base z %.2f vs raycast ground-0.3 = %.2f (hit=%s)"
            % (i, actual_min_z, target_base, hit))
checks["grounded"] = True if not grounded_bad else grounded_bad

rot_ok = all(abs(r) < 1e-6 for r in obj.rotation_euler)
scl_ok = all(abs(s - 1.0) < 1e-6 for s in obj.scale)
checks["transforms_clean"] = (
    True if (rot_ok and scl_ok)
    else "rot %s scale %s" % (tuple(obj.rotation_euler), tuple(obj.scale)))

checks["no_modifiers"] = (
    True if len(obj.modifiers) == 0
    else "%d modifiers" % len(obj.modifiers))

# EXTRA CHECK (beyond §8, per this commission): programmatic outward-normal
# audit. Every part recorded its own centroid at build time; every one of
# its faces must have Blender's own computed normal pointing AWAY from that
# centroid (centroid-ray parity) — independent of the hand cross-product
# proof in the header, using Blender's own normal calculation instead of
# re-deriving it.
winding_bad = []
for centroid, fstart, fend in PART_RANGES:
    for idx in range(fstart, fend):
        poly = mesh.polygons[idx]
        if poly.normal.dot(poly.center - centroid) < -1e-6:
            winding_bad.append(idx)
checks["winding"] = True if not winding_bad else "inverted face indices: %s" % winding_bad

result = {
    "status": "pass" if all(v is True for v in checks.values()) else "fail",
    "created": created,
    "checks": checks,
    "notes": (
        "3 cottages joined into one mesh, %d tris (budget %d). "
        "A: gable, 6.0x5.2 m footprint, wall 6 m + ridge rise 6 m (ridge "
        "abs %.1f), rot 15 deg, at (-152, 10.5), ground z %.2f (hit=%s). "
        "B: hip, 6.8x6.0 m footprint (the big one), wall 7 m + apex rise "
        "6 m (apex abs %.1f), rot -25 deg, at (-146, 20), ground z %.2f "
        "(hit=%s) — THE ONE PINK ACCENT: its whole roof is brand pink "
        "#B87890, no other pink in the group. C: gable, 4.8x4.4 m "
        "footprint (the small one), wall 5 m + ridge rise 5 m (ridge abs "
        "%.1f), rot 40 deg, at (-150, 30), ground z %.2f (hit=%s). Every "
        "cottage: cream walls, a proud door box + two flanking windows on "
        "the front (+y local) wall, a chimney punched through the roof's "
        "back quadrant clearing the ridge by 1.8 m. Grounded per-site by "
        "§7 raycast, base sunk 0.3 m each (three independent ground "
        "samples — the meadow rolls here). Deterministic, no randomness. "
        "Positions zig-zag (x -152/-146/-150, y 10.5/20/30) so the trio "
        "reads as a cluster, not a row."
        % (tri_count, BUDGET,
           cottage_reports[0][3] - 1.8, cottage_reports[0][0], cottage_reports[0][1],
           cottage_reports[1][3] - 1.8, cottage_reports[1][0], cottage_reports[1][1],
           cottage_reports[2][3] - 1.8, cottage_reports[2][0], cottage_reports[2][1])),
}

print(result)
