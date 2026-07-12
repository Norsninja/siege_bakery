# mid_watchtower_west.py — COMMISSION: dwarf watchtower on the west meadow
#
# Per research/18-region-structure-rules.md (THE SCRIPT CONTRACT §8).
# Band: mid_ (lit + fogged — TRUE LOCAL COLOR, no baked haze).
# Zone: x -190..-155, y 55..90 (blender), height cap 30 m. Budget 400 tris.
#
# Design (silhouette first, judged from the post eye at (1.5, 11, 1.6),
# ~175 m away — vertical silhouette + pink cone is the whole read):
#   - 8-sided tapered tower, 15 m to the gallery, LIT stone (#B0B8C0),
#     base zone (0-4.5 m) shaded darker (foundation shadow).
#   - Two-step rounded corbel gallery overhanging the shaft: a small
#     lip step then the main overhang (#B0B8C0/#B8C0C0 family, underside
#     of each step shaded darker for shadow, walls normal/lighter for
#     sun) — reads as ONE FAT RING at distance, not individual teeth.
#     Main overhang radius 4.4 m > tower base radius 4.0 m, so it
#     genuinely oversails the shaft per the brief.
#   - Flat sunlit rim atop the gallery (walkway read), then THE PINK
#     CONE CAP rises from within it (#B87890 family, two-tone base/tip
#     like the accepted mill's onion cap) — the accent, ties the
#     tower's language to THE DWARF CASTLE's pink caps far to the
#     north without using the far band's pre-hazed stone.
#   - Overall apex height ~23 m (18-24 m brief range), under the 30 m
#     cap with margin.
#   - Dark door inset (#605850) on the +x facet: the arena sits EAST
#     of this zone (arena x -40..40 vs our zone x -190..-155), so the
#     door that "faces the arena" faces +x. The 8-gon is phased so a
#     flat facet's midpoint sits exactly at angle 0 (+x).
#   - Grounded by §7 raycast, base sunk 0.3 m.
#
# Deterministic: no randomness used at all. Idempotent: OWNED teardown
# first, raycast AFTER teardown (so a prior tower can't catch the ray).

import bpy
import math
from mathutils import Vector

OWNED = ["mid_watchtower_west"]
NAME = "mid_watchtower_west"
PREFIX = "mid_"
BUDGET = 400
ZONE_X = (-190.0, -155.0)
ZONE_Y = (55.0, 90.0)
ZONE_ZMAX = 30.0

TOWER_X, TOWER_Y = -172.0, 72.0   # site center (blender), well inside zone
SIDES = 8                          # facet count — reads round at distance
FACE_ANGLE = 0.0                   # facet midpoint faces +x (arena, see above)
SINK = 0.3                         # §7: sink the base 0.3 m

# --- vertical plan (heights are ABOVE base_z, resolved after raycast) ---
BASE_ZONE_H = 4.5      # shaded-dark foundation zone of the shaft
SHAFT_TOP_H = 15.0      # shaft top = corbel step 1 base
CORBEL1_TOP_H = 15.5    # small lip step top
GALLERY_TOP_H = 17.5    # main overhang wall top = gallery rim height
CONE_MID_H = 18.8       # pink cone color-break height
APEX_H = 23.0           # apex — overall height (18-24 m brief range)

# --- radii ---
R_BASE = 4.0            # tower base radius
R_TOP = 3.0             # tower top radius (tapered shaft)
CORBEL1_R = 3.6         # small step-out lip
GALLERY_R = 4.4         # main overhang — oversails R_BASE (genuine overhang)
CONE_BASE_R = 2.6       # cone base, recessed inside the gallery rim
CONE_MID_R = 2.0        # cone taper before the final run to apex

# ---------------------------------------------------------------------------
# §5 palette of record — LINEAR hex written verbatim as floats (int/255).
# NO sRGB conversion (§4). Shading zones stay within ~±10% of the row.
# ---------------------------------------------------------------------------
def hx(h, mul=1.0):
    r = min(1.0, (int(h[0:2], 16) / 255.0) * mul)
    g = min(1.0, (int(h[2:4], 16) / 255.0) * mul)
    b = min(1.0, (int(h[4:6], 16) / 255.0) * mul)
    return (r, g, b, 1.0)

STONE  = "B0B8C0"   # mid-band lit stone — tower body, main gallery wall
STONE2 = "B8C0C0"   # mid-band lit stone alt — corbel/rim variation
PINK   = "B87890"   # brand pink — the ONE accent (cone cap)
DOOR_DARK = "605850"  # road-dirt dark family — the door inset

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
# 2. Ground by raycast (§7) — AFTER teardown so we never hit ourselves
# ---------------------------------------------------------------------------
deps = bpy.context.evaluated_depsgraph_get()
hit, loc, *_ = bpy.context.scene.ray_cast(
    deps, Vector((TOWER_X, TOWER_Y, 50.0)), Vector((0.0, 0.0, -1.0)))
ground_z = loc.z if hit else 0.0
base_z = ground_z - SINK

z_base_zone = base_z + BASE_ZONE_H
z_shaft_top = base_z + SHAFT_TOP_H
z_corbel1_top = base_z + CORBEL1_TOP_H
z_gallery_top = base_z + GALLERY_TOP_H
z_cone_mid = base_z + CONE_MID_H
z_apex = base_z + APEX_H

# ---------------------------------------------------------------------------
# 3. Build — pure pydata, every part its own vertex island so POINT-domain
#    colors stay hard-edged blocks (§6: color blocks, not geometry)
# ---------------------------------------------------------------------------
V, F, C = [], [], []   # verts, faces, per-vertex RGBA

def emit(vs, fs, cs):
    """cs: one color per vert (list) or a single color for all."""
    if isinstance(cs, tuple):
        cs = [cs] * len(vs)
    assert len(cs) == len(vs)
    base = len(V)
    V.extend(vs)
    C.extend(cs)
    F.extend([tuple(base + i for i in f) for f in fs])

def ring(z, r):
    """CCW (from +z) SIDES-gon around the tower axis; phased so one flat
    facet's midpoint faces exactly FACE_ANGLE (+x, the arena)."""
    pts = []
    for k in range(SIDES):
        a = FACE_ANGLE + (2 * k + 1) * math.pi / SIDES
        pts.append((TOWER_X + r * math.cos(a), TOWER_Y + r * math.sin(a), z))
    return pts

def band(ring_lo, ring_hi, col_lo, col_hi):
    """Side wall between two CCW rings — outward winding."""
    n = len(ring_lo)
    fs = [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
    emit(ring_lo + ring_hi, fs, [col_lo] * n + [col_hi] * n)

def annulus_down(ring_outer, ring_inner, col):
    """Flat ring facing DOWN (corbel/overhang underside) — winding
    verified analytically: (outer_k, inner_k, inner_k+1, outer_k+1) -> -z."""
    n = len(ring_outer)
    fs = [(k, n + k, n + (k + 1) % n, (k + 1) % n) for k in range(n)]
    emit(ring_outer + ring_inner, fs, col)

def annulus_up(ring_outer, ring_inner, col):
    """Flat ring facing UP (gallery rim walkway) — winding verified
    analytically: (outer_k, outer_k+1, inner_k+1, inner_k) -> +z."""
    n = len(ring_outer)
    fs = [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
    emit(ring_outer + ring_inner, fs, col)

def fan_up(ring_pts, apex, col):
    """Cone tip from CCW ring to apex above — outward winding."""
    n = len(ring_pts)
    fs = [(k, (k + 1) % n, n) for k in range(n)]
    emit(ring_pts + [apex], fs, col)

def tapered_box(p0, p1, v0, v1, w, col):
    """Box from end p0 (half-width vector v0) to end p1 (half-width v1),
    half-thickness vector w. (u=p1-p0, v, w) must be right-handed;
    face table gives outward CCW winding (three.js culls backfaces)."""
    p0, p1, v0, v1, w = Vector(p0), Vector(p1), Vector(v0), Vector(v1), Vector(w)
    c = [p0 - v0 - w, p1 - v1 - w, p0 + v0 - w, p1 + v1 - w,
         p0 - v0 + w, p1 - v1 + w, p0 + v0 + w, p1 + v1 + w]
    fs = [(4, 5, 7, 6),   # +w
          (0, 2, 3, 1),   # -w
          (1, 3, 7, 5),   # +u (far end)
          (0, 4, 6, 2),   # -u (near end)
          (2, 6, 7, 3),   # +v
          (0, 1, 5, 4)]   # -v
    emit([tuple(p) for p in c], fs, col)

# --- shaft: 8-sided tapered frustum, stone, base zone shaded darker (2 zones)
band(ring(base_z, R_BASE), ring(z_base_zone, R_BASE * 0.94), hx(STONE, 0.82), hx(STONE, 0.90))
band(ring(z_base_zone, R_BASE * 0.94), ring(z_shaft_top, R_TOP), hx(STONE, 0.90), hx(STONE))

# --- corbel gallery: two rounded steps overhanging the shaft — reads as
# ONE FAT RING (both steps same stone family, no individual teeth).
# Step 1: small lip. Underside shadowed, wall normal.
annulus_down(ring(z_shaft_top, CORBEL1_R), ring(z_shaft_top, R_TOP), hx(STONE2, 0.82))
band(ring(z_shaft_top, CORBEL1_R), ring(z_corbel1_top, CORBEL1_R), hx(STONE2), hx(STONE2))

# Step 2: main overhang (oversails the tower base). Underside shadowed
# harder (deepest shadow), wall catches light (brighter, sunlit).
annulus_down(ring(z_corbel1_top, GALLERY_R), ring(z_corbel1_top, CORBEL1_R), hx(STONE, 0.78))
band(ring(z_corbel1_top, GALLERY_R), ring(z_gallery_top, GALLERY_R), hx(STONE, 1.05), hx(STONE, 1.05))

# --- gallery rim: flat sunlit walkway ring, recessed in to the cone base
annulus_up(ring(z_gallery_top, GALLERY_R), ring(z_gallery_top, CONE_BASE_R), hx(STONE2, 1.08))

# --- pink cone cap: two-tone (darker base ring, lighter toward apex),
# same pattern as the accepted mill's onion cap. THE accent.
band(ring(z_gallery_top, CONE_BASE_R), ring(z_cone_mid, CONE_MID_R), hx(PINK, 0.90), hx(PINK))
fan_up(ring(z_cone_mid, CONE_MID_R), (TOWER_X, TOWER_Y, z_apex), hx(PINK, 1.08))

# --- door: dark inset slab on the +x facet (faces the arena, see header).
# Apothem of the base radius at door height ~R_BASE*cos(pi/SIDES) = 3.70 m;
# slab outer face protrudes ~0.4 m, back buried in the wall.
apothem = R_BASE * math.cos(math.pi / SIDES)
DOOR_H = 3.4
door_c = Vector((TOWER_X + apothem + 0.35, TOWER_Y, base_z + DOOR_H / 2.0))
# (u=+y, v, w=+z) must be right-handed: v = -x, since y x (-x) = +z.
# The first export shipped v = +x — a left-handed triple that inverted
# every door face (found by the fleet-3 lantern builder, confirmed by
# normal audit; EEVEE's double-sided preview hid it, three.js wouldn't).
tapered_box(door_c - Vector((0.0, 1.0, 0.0)), door_c + Vector((0.0, 1.0, 0.0)),
            Vector((-0.4, 0.0, 0.0)), Vector((-0.4, 0.0, 0.0)),
            Vector((0.0, 0.0, DOOR_H / 2.0)), hx(DOOR_DARK))

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
obj.location = (0.0, 0.0, 0.0)       # mesh is authored in world coords
obj.rotation_euler = (0.0, 0.0, 0.0)
obj.scale = (1.0, 1.0, 1.0)

# ---------------------------------------------------------------------------
# 5. Self-validation (§8.5) — every check computed honestly; this script
#    CAN fail, and says so.
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
slot_names = [s.material.name if s.material else None
              for s in obj.material_slots]
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
                ca_chk.data_type, ca_chk.domain,
                len(ca_chk.data), len(mesh.vertices))))

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
        "bbox x %.1f..%.1f y %.1f..%.1f zmax %.1f outside "
        "x %s y %s cap %.0f" % (min_x, max_x, min_y, max_y, max_z,
                                ZONE_X, ZONE_Y, ZONE_ZMAX))

target_base = ground_z - SINK
checks["grounded"] = (
    True if abs(min_z - target_base) <= 0.5
    else "base z %.2f vs raycast ground-0.3 = %.2f (hit=%s)"
         % (min_z, target_base, hit))

rot_ok = all(abs(r) < 1e-6 for r in obj.rotation_euler)
scl_ok = all(abs(s - 1.0) < 1e-6 for s in obj.scale)
checks["transforms_clean"] = (
    True if (rot_ok and scl_ok)
    else "rot %s scale %s" % (tuple(obj.rotation_euler), tuple(obj.scale)))

checks["no_modifiers"] = (
    True if len(obj.modifiers) == 0
    else "%d modifiers" % len(obj.modifiers))

result = {
    "status": "pass" if all(v is True for v in checks.values()) else "fail",
    "created": created,
    "checks": checks,
    "notes": (
        "Dwarf watchtower, %d tris (budget %d). 8-sided tapered stone "
        "shaft %.1f m to a two-step rounded corbel gallery (overhang "
        "r %.1f m > base r %.1f m — genuinely oversails the shaft), flat "
        "sunlit rim, then a two-tone pink cone cap to %.1f m apex "
        "(overall height, 18-24 m brief range). Door inset faces +x "
        "(the arena is east of this west-meadow zone). Ground raycast z "
        "%.2f (hit=%s), base sunk 0.3 m. Deterministic, no randomness."
        % (tri_count, BUDGET, SHAFT_TOP_H, GALLERY_R, R_BASE, APEX_H,
           ground_z, hit)),
}
