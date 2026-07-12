# mid_bakehouse_west.py — COMMISSION: THE BAKEHOUSE of the west hamlet
# (mid_town_west sits just north of this zone, x -134..-104 y -20..42;
# its mill grinds the flour, this building bakes it).
#
# Per research/18-region-structure-rules.md (THE SCRIPT CONTRACT §8).
# Band: mid_ (lit + fogged — TRUE LOCAL COLOR, no baked haze).
# Zone: x -133..-100, y -45..-25 (blender), height cap 26 m. Budget 450 tris.
#
# Design (silhouette first, judged from the post eye at (1.5, 11, 1.6),
# roughly 130 m away):
#   - A broad gable-roofed hall, ridge running east-west (x axis):
#     wall cream (#C8C8B8) rectangular long walls (south/north, the
#     north one facing the hamlet at +y) and two cream pentagon gable
#     end walls (east/west) rising straight to the roof apex — the
#     roof itself is just two sloped rectangles (south slope #886060,
#     north slope #806870) meeting at the ridge, eaves overhung 0.6 m
#     in y for free chunkiness (no extra geometry — just wider quads).
#     A dark-cream plinth band (footprint padded 0.3 m) grounds it.
#   - ONE ENORMOUS ROUND CHIMNEY: an 8-sided faceted tower embedded
#     1 m into the west gable end (so it fuses with the hall in
#     silhouette), base radius 2.8 m (diameter 5.6 m — well over a
#     third of the hall's 15 m width), wall-stone body (#B0B8C0)
#     tapering slightly into a darker soot rim (#605850) that flares
#     up to a flat dark cap. Total chimney height clears the ridge by
#     6 m — it dominates the silhouette as commissioned.
#   - ONE pink accent: a baker's door (#B87890) proud on the north
#     (hamlet-facing) wall, straddling the wall plane like the
#     granary's dark door — the brand color, the only one.
#   - Grounded by §7 raycast at the hall center, base sunk 0.3 m.
#
# Deterministic: no randomness used at all. Idempotent: OWNED teardown
# first, raycast AFTER teardown (so a prior bakehouse can't catch the
# ray).
#
# WINDING NOTE (hand-verified for every quad/pentagon below, following
# the granary's proven convention — outward CCW so three.js doesn't
# backface-cull):
#   For a wall in the y=const plane, in-plane axes (u=x, v=z) satisfy
#   u_hat x v_hat = -y_hat, so the order (x_lo,z_lo)->(x_hi,z_lo)->
#   (x_hi,z_hi)->(x_lo,z_hi) gives outward normal -y (south wall);
#   reversing that cycle (keeping the same start point) gives +y
#   (north wall).
#   For a wall in the x=const plane, in-plane axes (u=y, v=z) satisfy
#   u_hat x v_hat = +x_hat, so (y_lo,z_lo)->(y_hi,z_lo)->(y_hi,z_hi)->
#   (y_lo,z_hi) gives outward +x (east); the reversed cycle gives -x
#   (west). The two gable pentagons and the four plinth side walls all
#   use this rule directly. The roof slope quads were checked by
#   explicit cross product in the design notes (kept below inline).
#   The chimney ring()/band()/cap_up() trio reuses the granary's
#   proven silo pattern (ring point order is CCW viewed from +z, so
#   band() side walls point outward and cap_up() using the ring order
#   directly as a single n-gon faces +z).

import bpy
import math
from mathutils import Vector

OWNED = ["mid_bakehouse_west"]
NAME = "mid_bakehouse_west"
PREFIX = "mid_"
BUDGET = 450
ZONE_X = (-133.0, -100.0)
ZONE_Y = (-45.0, -25.0)
ZONE_ZMAX = 26.0

GX, GY = -117.5, -34.0            # hall site center (blender)
SINK = 0.3                        # §7: sink the base 0.3 m

HALF_L = 7.5                      # hall half-length (x) -> full 15 m
HALF_D = 5.0                      # hall half-depth (y) -> full 10 m
WALL_H = 6.0
ROOF_RISE = 5.0                   # ridge height above wall top
EAVE_D = 0.6                      # roof y-overhang beyond wall face (free)

PLINTH_H = 1.0
PLINTH_PAD = 0.3

DOOR_HALF_W = 1.0
DOOR_HALF_H = 1.4
DOOR_Y_OFFSET = 0.15              # door center, proud of the wall plane
DOOR_HALF_THICK = 0.2

CHIM_DX = -HALF_L + 1.0           # chimney embeds 1 m into the west end
CHIM_SIDES = 8
R_BASE_C, R_MID_C, R_TOP_C = 2.8, 2.6, 2.4   # base >= a third of 15 m (5 m)
CHIM_H = 17.0                     # base_z -> chim top (clears ridge by 6 m)
SOOT_H = 2.5                      # dark soot-rim zone at the top

# ---------------------------------------------------------------------------
# §5 palette of record — LINEAR hex written verbatim as floats (int/255).
# NO sRGB conversion (§4). Shading zones stay within ~±10% of the row.
# ---------------------------------------------------------------------------
def hx(h, mul=1.0):
    r = min(1.0, (int(h[0:2], 16) / 255.0) * mul)
    g = min(1.0, (int(h[2:4], 16) / 255.0) * mul)
    b = min(1.0, (int(h[4:6], 16) / 255.0) * mul)
    return (r, g, b, 1.0)

WALL_CREAM      = hx("C8C8B8")          # hall walls, gable ends
WALL_CREAM_DARK = hx("C8C8B8", 0.85)    # plinth (grounding band)
ROOF_A          = hx("886060")          # south roof slope
ROOF_B          = hx("806870")          # north roof slope
CHIM_MAIN       = hx("B0B8C0")          # chimney body, wall-stone
CHIM_SOOT       = hx("605850")          # chimney soot rim + cap
DOOR_PINK       = hx("B87890")          # the ONE pink accent

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
    deps, Vector((GX, GY, 50.0)), Vector((0.0, 0.0, -1.0)))
ground_z = loc.z if hit else 0.0
base_z = ground_z - SINK
wall_top = base_z + WALL_H
ridge_z = wall_top + ROOF_RISE

chim_cx = GX + CHIM_DX
chim_cy = GY
chim_top = base_z + CHIM_H
soot_start = chim_top - SOOT_H

x1, x2 = GX - HALF_L, GX + HALF_L
y1, y2 = GY - HALF_D, GY + HALF_D       # y1 = south (front, -y), y2 = north (+y, hamlet side)

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

def quad(p0, p1, p2, p3, col):
    emit([p0, p1, p2, p3], [(0, 1, 2, 3)], col)

def pentagon(p0, p1, p2, p3, p4, col):
    emit([p0, p1, p2, p3, p4], [(0, 1, 2, 3, 4)], col)

def tapered_box(p0, p1, v0, v1, w, col):
    """Box from end p0 (half-width vector v0) to end p1 (half-width v1),
    half-thickness vector w. Outward-CCW winding requires
    (p1-p0) x v to point the SAME direction as w — verified per call
    (proven pattern, carried over from the granary commission)."""
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

def ring(z, r):
    """CCW (from +z) CHIM_SIDES-gon around the chimney axis."""
    pts = []
    for k in range(CHIM_SIDES):
        a = -math.pi / 2.0 + (2 * k + 1) * math.pi / CHIM_SIDES
        pts.append((chim_cx + r * math.cos(a), chim_cy + r * math.sin(a), z))
    return pts

def band(ring_lo, ring_hi, col_lo, col_hi):
    """Side wall between two CCW rings — outward winding."""
    n = len(ring_lo)
    fs = [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
    emit(ring_lo + ring_hi, fs, [col_lo] * n + [col_hi] * n)

def cap_up(ring_pts, col):
    """Flat top cap facing +z — the ring's own CCW-from-above order IS
    the correct winding for an upward n-gon (same fact the granary's
    fan_up relied on, just without an apex)."""
    n = len(ring_pts)
    emit(ring_pts, [tuple(range(n))], col)

# --- hall long walls (south = front/-y, north = hamlet-facing/+y) ---
quad((x1, y1, base_z), (x2, y1, base_z), (x2, y1, wall_top), (x1, y1, wall_top),
     WALL_CREAM)                                             # south, normal -y
quad((x1, y2, base_z), (x1, y2, wall_top), (x2, y2, wall_top), (x2, y2, base_z),
     WALL_CREAM)                                             # north, normal +y

# --- gable end walls (pentagon: two bottom corners, two mid corners, apex) ---
pentagon((x2, y1, base_z), (x2, y2, base_z), (x2, y2, wall_top),
         (x2, GY, ridge_z), (x2, y1, wall_top), WALL_CREAM)  # east, normal +x
pentagon((x1, y1, base_z), (x1, y1, wall_top), (x1, GY, ridge_z),
         (x1, y2, wall_top), (x1, y2, base_z), WALL_CREAM)   # west, normal -x

# --- roof: two sloped rectangles meeting at the ridge, eaves overhung in y
# (free — just wider quads, no extra geometry). South slope u=(x2-x1,0,0)=+x,
# v=(0, GY-(y1-EAVE_D), ROOF_RISE)=(0,+,+) -> u x v=(0,-,+) = outward -y,+z. OK.
quad((x1, y1 - EAVE_D, wall_top), (x2, y1 - EAVE_D, wall_top),
     (x2, GY, ridge_z), (x1, GY, ridge_z), ROOF_A)
# North slope mirrored order (u=-x first) -> u x v=(0,+,+) outward +y,+z. OK.
quad((x2, y2 + EAVE_D, wall_top), (x1, y2 + EAVE_D, wall_top),
     (x1, GY, ridge_z), (x2, GY, ridge_z), ROOF_B)

# --- plinth (grounding band), footprint padded, four side walls ---
px1, px2 = x1 - PLINTH_PAD, x2 + PLINTH_PAD
py1, py2 = y1 - PLINTH_PAD, y2 + PLINTH_PAD
plinth_top = base_z + PLINTH_H
quad((px1, py1, base_z), (px2, py1, base_z), (px2, py1, plinth_top), (px1, py1, plinth_top),
     WALL_CREAM_DARK)                                        # south
quad((px1, py2, base_z), (px1, py2, plinth_top), (px2, py2, plinth_top), (px2, py2, base_z),
     WALL_CREAM_DARK)                                        # north
quad((px2, py1, base_z), (px2, py2, base_z), (px2, py2, plinth_top), (px2, py1, plinth_top),
     WALL_CREAM_DARK)                                        # east, normal +x
quad((px1, py1, base_z), (px1, py1, plinth_top), (px1, py2, plinth_top), (px1, py2, base_z),
     WALL_CREAM_DARK)                                        # west, normal -x

# --- door: the ONE pink accent, proud on the north (hamlet-facing) wall.
# u=(2*DOOR_HALF_W,0,0)=+x, v=(0,DOOR_HALF_THICK,0)=+y -> u x v=+z = w's sign. OK.
door_c = Vector((GX, y2 + DOOR_Y_OFFSET, base_z + DOOR_HALF_H))
tapered_box(door_c - Vector((DOOR_HALF_W, 0.0, 0.0)), door_c + Vector((DOOR_HALF_W, 0.0, 0.0)),
            Vector((0.0, DOOR_HALF_THICK, 0.0)), Vector((0.0, DOOR_HALF_THICK, 0.0)),
            Vector((0.0, 0.0, DOOR_HALF_H)), DOOR_PINK)

# --- THE ENORMOUS ROUND CHIMNEY: wall-stone body tapering into a dark
# soot rim, flat dark cap. Embedded 1 m into the west gable end so it
# reads as fused with the hall, rising 6 m clear of the ridge.
band(ring(base_z, R_BASE_C), ring(soot_start, R_MID_C), CHIM_MAIN, CHIM_MAIN)
band(ring(soot_start, R_MID_C), ring(chim_top, R_TOP_C), CHIM_SOOT, CHIM_SOOT)
cap_up(ring(chim_top, R_TOP_C), CHIM_SOOT)

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
        "The bakehouse: %d tris (budget %d). Gable hall %dx%d m footprint, "
        "wall %.1f m + ridge rise %.1f m (ridge %.1f m abs), eaves "
        "overhung %.1f m in y for free chunkiness, cream plinth band. "
        "THE CHIMNEY: %d-sided, base R %.1f m (diameter %.1f m, %.0f%% of "
        "the hall's %d m width) embedded %.1f m into the west gable end, "
        "wall-stone body tapering into a dark soot rim + flat cap at "
        "%.1f m abs — clears the ridge by %.1f m. One pink door on the "
        "north (hamlet-facing) wall. Ground raycast z %.2f (hit=%s), base "
        "sunk 0.3 m. Deterministic, no randomness. Note: the eave "
        "overhang leaves the small soffit triangle at each gable end "
        "unfaced (open, not capped) — invisible from the post eye at "
        "this distance, a deliberate tri-budget saving."
        % (tri_count, BUDGET, HALF_L * 2, HALF_D * 2, WALL_H, ROOF_RISE,
           ridge_z, EAVE_D, CHIM_SIDES, R_BASE_C, R_BASE_C * 2,
           (R_BASE_C * 2) / (HALF_L * 2) * 100, int(HALF_L * 2),
           HALF_L - 1.0, chim_top, chim_top - ridge_z, ground_z, hit)),
}
