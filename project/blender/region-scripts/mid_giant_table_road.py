# mid_giant_table_road.py — COMMISSION: giant's picnic TABLE completing
# the roadside rest stop, west neighbor of mid_giant_bench.
#
# Per research/18-region-structure-rules.md (THE SCRIPT CONTRACT §8).
# Band: mid_ (lit + fogged — TRUE LOCAL COLOR, no baked haze).
# Zone: x 118..140, y 2..19 (blender), height cap 14 m. Budget 400 tris.
#
# Design (silhouette first, judged from the post eye at (1.5, 11, 1.6),
# ~130 m away, mostly in profile — table outline first, pink bun-dot
# second):
#   - Thick timber TABLETOP slab, 12 m long x 5 m deep x 0.7 m thick,
#     top surface ~8.6 m up (a giant seated on the 7 m companion bench
#     wants a slightly higher table — 8-10 m spec). Seat-tone timber
#     (#886060), matching the bench's tabletop.
#   - TWO chunky x-tapered trestle legs (flared feet at ground, narrower
#     under the slab) — darkest timber (#786878), same family as the
#     bench's legs.
#   - A central STRETCHER beam joining the legs at mid-height, and two
#     thin APRON rails hung just under the slab's front/back edges —
#     both mid timber (#806870), so all three bench-family tones appear
#     on the table too.
#   - ON the tabletop: a round CREAM PLATE (#C8C8B8, octagon-approximated
#     disc) carrying ONE PINK-FROSTED BUN — a squat, puffed dome: a
#     cream base drum (#C8C8B8, matching the plate) under a bulging
#     brand-pink crown (#B87890) that tapers to a soft point. ~2.9 m
#     across at its widest — fat and readable at distance, the one pink
#     accent on the whole structure (tone guard: one accent is enough).
#   - Site sits at the ZONE's west/center, table's open (+x) side facing
#     toward mid_giant_bench at x 147..163 so the pair reads as one
#     rest stop; same y-row (10) as the bench's site center (10).
#   - Grounded by §7 raycast at the table's site center, base sunk 0.3 m.
#
# Deterministic: no randomness used at all. Idempotent: OWNED teardown
# first, raycast AFTER teardown (so a prior table can't catch the ray).

import bpy
import math
from mathutils import Vector

OWNED = ["mid_giant_table_road"]
NAME = "mid_giant_table_road"
PREFIX = "mid_"
BUDGET = 400
ZONE_X = (118.0, 140.0)
ZONE_Y = (2.0, 19.0)
ZONE_ZMAX = 14.0

TABLE_X, TABLE_Y = 131.0, 10.0     # site center (blender) — same row (y=10)
                                    # as mid_giant_bench's site center
SIDES = 8                          # octagon-approximated round parts
SINK = 0.3                         # §7: sink the base 0.3 m

# ---------------------------------------------------------------------------
# §5 palette of record — LINEAR hex written verbatim as floats (int/255).
# NO sRGB conversion (§4).
# ---------------------------------------------------------------------------
def hx(h, mul=1.0):
    r = min(1.0, (int(h[0:2], 16) / 255.0) * mul)
    g = min(1.0, (int(h[2:4], 16) / 255.0) * mul)
    b = min(1.0, (int(h[4:6], 16) / 255.0) * mul)
    return (r, g, b, 1.0)

TOP_COL      = hx("886060")   # timber, seat-tone — tabletop slab
LEG_COL      = hx("786878")   # timber, darkest — trestle legs
MID_COL      = hx("806870")   # timber, mid — stretcher + apron rails
PLATE_COL    = hx("C8C8B8")   # cream — plate
BUN_BASE_COL = hx("C8C8B8", 1.05)   # cream, faint lift — bun's base drum
BUN_PINK_COL = hx("B87890")   # brand pink — the ONE accent (frosted bun)

# ---------------------------------------------------------------------------
# Dimensions (all "_dz" values are offsets ABOVE base_z, filled in once the
# ground raycast runs in step 2).
# ---------------------------------------------------------------------------
SLAB_HALF_LEN   = 6.0     # x half-length (12 m long)
SLAB_HALF_DEPTH = 2.5     # y half-depth (5 m deep)
SLAB_HALF_THICK = 0.35    # z half-thickness (0.7 m thick)
TOP_DZ          = 8.6     # tabletop TOP surface height above base_z (8-10 m)

LEG_HALF_W_BOT = 1.3       # x half-width at ground (flared foot)
LEG_HALF_W_TOP = 0.9       # x half-width under the slab (tapered)
LEG_HALF_DEPTH = 1.8       # y half-depth (trestle panel, inboard of slab)
LEG_INSET      = 4.5       # legs inset from table center, x offset

STRETCHER_DZ          = 4.0   # mid-height join between the legs
STRETCHER_HALF_DEPTH  = 0.5   # y half-width
STRETCHER_HALF_THICK  = 0.35  # z half-thickness

APRON_HALF_LEN    = 5.7    # x half-length (inset from slab ends)
APRON_Y_OFFSET    = 2.0    # y offset from TABLE_Y (front / back rail)
APRON_HALF_DEPTH  = 0.15   # y half-thickness (thin board)
APRON_HALF_THICK  = 0.25   # z half-thickness (0.5 m tall skirt board)

PLATE_X_OFFSET = 2.0       # plate offset from TABLE_X, toward the bench (+x)
PLATE_R        = 1.6       # plate radius (3.2 m across)
PLATE_HALF_THICK = 0.125   # 0.25 m thick

BUN_BASE_R      = 1.3      # cream base drum radius (2.6 m across)
BUN_BASE_HEIGHT = 0.4
BUN_WIDEN_R     = 1.45     # bulge radius — the bun's widest point (2.9 m)
BUN_WIDEN_RISE  = 0.5      # height above the base drum's top
BUN_NARROW_R    = 0.75
BUN_NARROW_RISE = 0.6      # height above the widen ring
BUN_TIP_RISE    = 0.35     # height of the final point above the narrow ring

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
    deps, Vector((TABLE_X, TABLE_Y, 50.0)), Vector((0.0, 0.0, -1.0)))
ground_z = loc.z if hit else 0.0
base_z = ground_z - SINK

# Resolved absolute heights (base_z + the "_dz" constants above).
slab_bottom_dz = TOP_DZ - 2.0 * SLAB_HALF_THICK   # = leg top / apron top
slab_mid_dz    = TOP_DZ - SLAB_HALF_THICK

z_slab_mid   = base_z + slab_mid_dz
z_leg_top    = base_z + slab_bottom_dz
z_stretcher  = base_z + STRETCHER_DZ
z_apron_mid  = base_z + slab_bottom_dz - APRON_HALF_THICK

z_plate_bot  = base_z + TOP_DZ
z_plate_top  = z_plate_bot + 2.0 * PLATE_HALF_THICK

z_bun_base_bot = z_plate_top
z_bun_base_top = z_bun_base_bot + BUN_BASE_HEIGHT
z_bun_widen    = z_bun_base_top + BUN_WIDEN_RISE
z_bun_narrow   = z_bun_widen + BUN_NARROW_RISE
z_bun_tip      = z_bun_narrow + BUN_TIP_RISE

PLATE_X = TABLE_X + PLATE_X_OFFSET
PLATE_Y = TABLE_Y

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

def ring(cx, cy, z, r, sides=SIDES):
    """CCW (from +z) sides-gon centered at (cx, cy, z), radius r."""
    pts = []
    for k in range(sides):
        a = -math.pi / 2.0 + (2 * k + 1) * math.pi / sides
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a), z))
    return pts

def band(ring_lo, ring_hi, col_lo, col_hi):
    """Side wall between two CCW rings — outward winding."""
    n = len(ring_lo)
    fs = [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
    emit(ring_lo + ring_hi, fs, [col_lo] * n + [col_hi] * n)

def fan_up(ring_pts, apex, col):
    """Cone/fan from CCW ring to apex point — outward winding. An apex at
    the SAME z as the ring produces a flat disc (used for the plate top)."""
    n = len(ring_pts)
    fs = [(k, (k + 1) % n, n) for k in range(n)]
    emit(ring_pts + [apex], fs, col)

# --- tabletop slab: u along x (no taper), v = y half-depth, w = z half-thick
tapered_box(
    (TABLE_X - SLAB_HALF_LEN, TABLE_Y, z_slab_mid),
    (TABLE_X + SLAB_HALF_LEN, TABLE_Y, z_slab_mid),
    (0.0, SLAB_HALF_DEPTH, 0.0), (0.0, SLAB_HALF_DEPTH, 0.0),
    (0.0, 0.0, SLAB_HALF_THICK), TOP_COL)

# --- two trestle legs: u vertical (ground -> slab underside), v = x
#     half-width (tapers wide-at-foot -> narrow-under-slab), w = y
#     half-depth (fixed)
for leg_x in (TABLE_X - LEG_INSET, TABLE_X + LEG_INSET):
    tapered_box(
        (leg_x, TABLE_Y, base_z), (leg_x, TABLE_Y, z_leg_top),
        (LEG_HALF_W_BOT, 0.0, 0.0), (LEG_HALF_W_TOP, 0.0, 0.0),
        (0.0, LEG_HALF_DEPTH, 0.0), LEG_COL)

# --- central stretcher: joins the two legs at mid-height, mid timber
tapered_box(
    (TABLE_X - LEG_INSET, TABLE_Y, z_stretcher),
    (TABLE_X + LEG_INSET, TABLE_Y, z_stretcher),
    (0.0, STRETCHER_HALF_DEPTH, 0.0), (0.0, STRETCHER_HALF_DEPTH, 0.0),
    (0.0, 0.0, STRETCHER_HALF_THICK), MID_COL)

# --- two apron rails: thin boards hung just under the slab's front/back
#     edges, inset from the slab ends, mid timber
for apron_y in (TABLE_Y - APRON_Y_OFFSET, TABLE_Y + APRON_Y_OFFSET):
    tapered_box(
        (TABLE_X - APRON_HALF_LEN, apron_y, z_apron_mid),
        (TABLE_X + APRON_HALF_LEN, apron_y, z_apron_mid),
        (0.0, APRON_HALF_DEPTH, 0.0), (0.0, APRON_HALF_DEPTH, 0.0),
        (0.0, 0.0, APRON_HALF_THICK), MID_COL)

# --- plate: octagon-approximated disc resting on the tabletop, cream
ring_plate_bot = ring(PLATE_X, PLATE_Y, z_plate_bot, PLATE_R)
ring_plate_top = ring(PLATE_X, PLATE_Y, z_plate_top, PLATE_R)
band(ring_plate_bot, ring_plate_top, PLATE_COL, PLATE_COL)
fan_up(ring_plate_top, (PLATE_X, PLATE_Y, z_plate_top), PLATE_COL)

# --- bun: cream base drum, own vertex island at the top so the cream/pink
#     seam is a hard edge (not an interpolated gradient)
ring_bun_base_bot   = ring(PLATE_X, PLATE_Y, z_bun_base_bot, BUN_BASE_R)
ring_bun_base_top_c = ring(PLATE_X, PLATE_Y, z_bun_base_top, BUN_BASE_R)
band(ring_bun_base_bot, ring_bun_base_top_c, BUN_BASE_COL, BUN_BASE_COL)

# --- bun: pink crown — duplicate ring at the same position/height as the
#     cream top ring (hard color seam), bulges out then tapers to a point
ring_bun_base_top_p = ring(PLATE_X, PLATE_Y, z_bun_base_top, BUN_BASE_R)
ring_bun_widen       = ring(PLATE_X, PLATE_Y, z_bun_widen, BUN_WIDEN_R)
ring_bun_narrow       = ring(PLATE_X, PLATE_Y, z_bun_narrow, BUN_NARROW_R)
band(ring_bun_base_top_p, ring_bun_widen, BUN_PINK_COL, BUN_PINK_COL)
band(ring_bun_widen, ring_bun_narrow, BUN_PINK_COL, BUN_PINK_COL)
fan_up(ring_bun_narrow, (PLATE_X, PLATE_Y, z_bun_tip), BUN_PINK_COL)

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
        "Giant picnic table, %d tris (budget %d). Tabletop slab 12x5x0.7 m, "
        "top at %.1f m up (timber #886060); two x-tapered trestle legs, "
        "flared feet (timber #786878); central stretcher + two apron rails "
        "(mid timber #806870). On the tabletop, offset %.1f m toward the "
        "companion bench: a cream plate (#C8C8B8, %.1f m across) carrying "
        "a squat pink-frosted bun (cream base #C8C8B8 under brand pink "
        "crown #B87890), %.1f m across at its widest, %.2f m tall — the "
        "one pink accent. Ground raycast z %.2f (hit=%s), base sunk 0.3 m. "
        "Deterministic, no randomness. Companion mid_giant_bench sits just "
        "east at x 147..163, same y-row (10)."
        % (tri_count, BUDGET, TOP_DZ, PLATE_X_OFFSET, 2 * PLATE_R,
           2 * BUN_WIDEN_R, z_bun_tip - z_bun_base_bot, ground_z, hit)),
}
