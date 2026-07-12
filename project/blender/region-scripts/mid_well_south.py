# mid_well_south.py — COMMISSION: the village well of the south hamlet
# (mid_town_south, x 30..91 y 146..193, h 23.5, wall-stone + pink roofs
# sits just north-east of this zone; its wheat fields lie west).
#
# Per research/18-region-structure-rules.md (THE SCRIPT CONTRACT §8).
# Band: mid_ (lit + fogged — TRUE LOCAL COLOR, no baked haze).
# Zone: x 62..85, y 130..144 (blender), height cap 10 m. Budget 300 tris.
#
# Design (silhouette first, judged from the post eye at (1.5, 11, 1.6),
# ~140 m away — view direction is mostly +y with a little +x, i.e. the
# camera looks north-northeast, so a structure lying in a plane at
# constant y reads FACE-ON, like a picture):
#   - Fat 8-sided stone drum (wall stone #B0B8C0), R ~2.0-2.15 m: a
#     darker base zone blending up into the lighter body (§6: color
#     blocks, not geometry), a small flared lip, and a flat rim capped
#     by a dark disc standing in for the well's opening — no real hole
#     is cut (would blow the tri budget for a detail invisible at
#     range); the color trick reads as a shadowed mouth instead.
#   - A timber A-FRAME straddling the drum east-west (both legs and
#     the crossbar sit at the SAME y as the drum center) so the whole
#     truss faces the post eye like the classic wishing-well silhouette:
#     two thick angled posts (timber #886060 family, 0.5 m square —
#     comfortably over the 0.4 m floor) planted just outside the drum,
#     leaning in to cross near the top (each overshoots its meeting
#     point slightly, a log-cabin lap-joint peak), tied by a horizontal
#     crossbar at ~70% height.
#   - A little PINK-ROOFED CAP (brand pink #B87890 family) sits on the
#     crossed peak: a small flared eave + cone, mirroring the hamlet's
#     roof language — the ONE pink accent.
#   - A fat little bucket (dark timber #605850) hangs on a thin rope
#     from the crossbar's center, lowered to just above the drum's
#     dark "opening" — budget allowed it comfortably (172/300 tris).
#   - Grounded by §7 raycast, base sunk 0.3 m.
#
# WINDING: tapered_box's half-thickness vector w is computed
# automatically as normalize(u x v) * half_thick (see leg_w()) so
# outward-CCW winding is guaranteed for every box regardless of the
# post's lean angle — no per-call manual sign-checking needed.
#
# Deterministic: no randomness used at all. Idempotent: OWNED teardown
# first, raycast AFTER teardown (so a prior well can't catch the ray).

import bpy
import math
from mathutils import Vector

OWNED = ["mid_well_south"]
NAME = "mid_well_south"
PREFIX = "mid_"
BUDGET = 300
ZONE_X = (62.0, 85.0)
ZONE_Y = (130.0, 144.0)
ZONE_ZMAX = 10.0

WX, WY = 73.5, 137.0              # site center (blender) — mid of the zone
SIDES = 8                          # drum/roof facet count
SINK = 0.3                         # §7: sink the base 0.3 m

# --- drum dimensions ---
R0, R1, R2 = 2.15, 2.10, 2.00      # bottom(buried) / base-top / body-top
R_LIP, R_HOLE = 2.15, 1.05
DZ_BASE_TOP, DZ_BODY_TOP, DZ_LIP_TOP = 0.6, 1.6, 1.8

# --- A-frame dimensions ---
POST_HALF = 0.25                   # leg half-thickness -> 0.5 m square posts
LEG_BASE_OFFSET_X = 2.4            # leg feet planted just outside the drum
DZ_LEG_MEET = 5.6                  # base_z -> nominal leg-meeting height
CROSS_PAST = 0.3                   # each leg overshoots the meeting point
CROSSBAR_T = 0.68                  # crossbar height, fraction of leg run
CROSSBAR_HALF = 0.23                # -> ~0.46 m, over the 0.4 m floor

# --- rope + bucket ---
DZ_BUCKET_TOP, DZ_BUCKET_BOT = 2.6, 2.05
ROPE_HALF = 0.08
BUCKET_HALF = 0.35

# --- roof (deltas above DZ_LEG_MEET) ---
DZ_ROOF0, DZ_ROOF1, DZ_ROOF2, DZ_ROOF3 = 0.15, 0.25, 0.55, 0.95
R_FLARE, R_EAVE, R_CAPBASE = 1.2, 1.0, 0.4

# ---------------------------------------------------------------------------
# §5 palette of record — LINEAR hex written verbatim as floats (int/255).
# NO sRGB conversion (§4). Shading zones stay within ~±10-30% of the row.
# ---------------------------------------------------------------------------
def hx(h, mul=1.0):
    r = min(1.0, (int(h[0:2], 16) / 255.0) * mul)
    g = min(1.0, (int(h[2:4], 16) / 255.0) * mul)
    b = min(1.0, (int(h[4:6], 16) / 255.0) * mul)
    return (r, g, b, 1.0)

STONE = "B0B8C0"       # wall stone (road/south hamlet family)
PINK = "B87890"        # brand pink — the ONE accent (roof cap)
TIMBER = "886060"      # A-frame timber family
TIMBER_DARK = "605850" # dark timber band (rope / bucket)

DRUM_BASE_COL = hx(STONE, 0.70)    # darker base zone (brief requirement)
DRUM_BODY_COL = hx(STONE, 1.00)
DRUM_LIP_COL  = hx(STONE, 1.08)
HOLE_COL      = hx(STONE, 0.35)    # dark "opening" disc — a color trick
TIMBER_COL    = hx(TIMBER)
ROPE_COL      = hx(TIMBER_DARK, 0.90)
BUCKET_COL    = hx(TIMBER_DARK)
PINK_DARK     = hx(PINK, 0.85)
PINK_MAIN     = hx(PINK, 1.00)
PINK_LIGHT    = hx(PINK, 1.12)

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
    deps, Vector((WX, WY, 50.0)), Vector((0.0, 0.0, -1.0)))
ground_z = loc.z if hit else 0.0
base_z = ground_z - SINK

Z0 = base_z
Z_BASE_TOP = base_z + DZ_BASE_TOP
Z_BODY_TOP = base_z + DZ_BODY_TOP
Z_LIP_TOP = base_z + DZ_LIP_TOP

LEG_MEET_Z = base_z + DZ_LEG_MEET
ROOF_Z0 = LEG_MEET_Z + DZ_ROOF0
ROOF_Z1 = LEG_MEET_Z + DZ_ROOF1
ROOF_Z2 = LEG_MEET_Z + DZ_ROOF2
ROOF_Z3 = LEG_MEET_Z + DZ_ROOF3

BUCKET_TOP_Z = base_z + DZ_BUCKET_TOP
BUCKET_BOT_Z = base_z + DZ_BUCKET_BOT

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
    """CCW (from +z) SIDES-gon around the well axis; phased so one flat
    facet's midpoint faces exactly -y (toward the post eye)."""
    pts = []
    for k in range(SIDES):
        a = -math.pi / 2.0 + (2 * k + 1) * math.pi / SIDES
        pts.append((WX + r * math.cos(a), WY + r * math.sin(a), z))
    return pts

def band(ring_lo, ring_hi, col_lo, col_hi):
    """Side wall between two CCW rings — outward winding."""
    n = len(ring_lo)
    fs = [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
    emit(ring_lo + ring_hi, fs, [col_lo] * n + [col_hi] * n)

def annulus_up(ring_outer, ring_inner, col):
    """Flat ring facing UP (the rim top) — winding verified by shoelace
    on a synthetic square case: outer forward, inner backward gives a
    positive signed area in the xy-plane, i.e. normal +z."""
    n = len(ring_outer)
    fs = [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
    emit(ring_outer + ring_inner, fs, col)

def fan_up(ring_pts, apex, col):
    """Cone tip from CCW ring to apex above (or flush, for a flat disc)
    — outward winding."""
    n = len(ring_pts)
    fs = [(k, (k + 1) % n, n) for k in range(n)]
    emit(ring_pts + [apex], fs, col)

def tapered_box(p0, p1, v0, v1, w, col):
    """Box from end p0 (half-width vector v0) to end p1 (half-width v1),
    half-thickness vector w. Outward-CCW winding requires
    (p1-p0) x v to point the SAME direction as w — callers pass w from
    leg_w() below, which builds it that way by construction."""
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

def leg_w(u, v, half_thick):
    """Half-thickness vector for tapered_box, ALWAYS a positive multiple
    of (u x v) — guarantees the winding rule above holds for any post
    direction, removing the need to hand-verify each call."""
    raw = u.cross(v)
    if raw.length < 1e-9:
        raw = Vector((0.0, 0.0, 1.0))
    return raw.normalized() * half_thick

# --- drum: dark base zone blending into the light body, flared lip,
# flat rim, dark "opening" disc (color trick, no real hole cut) ---
band(ring(Z0, R0), ring(Z_BASE_TOP, R1), DRUM_BASE_COL, DRUM_BASE_COL)
band(ring(Z_BASE_TOP, R1), ring(Z_BODY_TOP, R2), DRUM_BASE_COL, DRUM_BODY_COL)
band(ring(Z_BODY_TOP, R2), ring(Z_LIP_TOP, R_LIP), DRUM_BODY_COL, DRUM_LIP_COL)
annulus_up(ring(Z_LIP_TOP, R_LIP), ring(Z_LIP_TOP, R_HOLE), DRUM_LIP_COL)
fan_up(ring(Z_LIP_TOP, R_HOLE), (WX, WY, Z_LIP_TOP), HOLE_COL)

# --- A-frame legs: planted east/west of the drum, both at y = WY so the
# whole truss lies in the plane the post eye looks straight into. Each
# leg overshoots its nominal meeting point (a log-cabin lap-joint peak).
p0_A = (WX - LEG_BASE_OFFSET_X, WY, base_z)
p0_B = (WX + LEG_BASE_OFFSET_X, WY, base_z)
target = (WX, WY, LEG_MEET_Z)
tip_A = (WX + CROSS_PAST, WY, LEG_MEET_Z)
tip_B = (WX - CROSS_PAST, WY, LEG_MEET_Z)

v_depth = Vector((0.0, POST_HALF, 0.0))
u_A = Vector(tip_A) - Vector(p0_A)
tapered_box(p0_A, tip_A, v_depth, v_depth, leg_w(u_A, v_depth, POST_HALF), TIMBER_COL)
u_B = Vector(tip_B) - Vector(p0_B)
tapered_box(p0_B, tip_B, v_depth, v_depth, leg_w(u_B, v_depth, POST_HALF), TIMBER_COL)

# --- crossbar: ties the two legs at 68% height, on their true (non-
# overshot) centerlines — both sides land at the same z by symmetry.
def lerp(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))

pA_t = lerp(p0_A, target, CROSSBAR_T)
pB_t = lerp(p0_B, target, CROSSBAR_T)
v_cross = Vector((0.0, CROSSBAR_HALF, 0.0))
u_cross = Vector(pB_t) - Vector(pA_t)
tapered_box(pA_t, pB_t, v_cross, v_cross,
            leg_w(u_cross, v_cross, CROSSBAR_HALF), TIMBER_COL)

# --- rope + bucket: hangs from the crossbar's center down to just above
# the drum's dark opening.
rope_top = (WX, WY, pA_t[2])
rope_bot = (WX, WY, BUCKET_TOP_Z)
v_rope = Vector((0.0, ROPE_HALF, 0.0))
u_rope = Vector(rope_bot) - Vector(rope_top)
tapered_box(rope_top, rope_bot, v_rope, v_rope,
            leg_w(u_rope, v_rope, ROPE_HALF), ROPE_COL)

bucket_top = (WX, WY, BUCKET_TOP_Z)
bucket_bot = (WX, WY, BUCKET_BOT_Z)
v_bucket = Vector((BUCKET_HALF, 0.0, 0.0))
u_bucket = Vector(bucket_bot) - Vector(bucket_top)
tapered_box(bucket_top, bucket_bot, v_bucket, v_bucket,
            leg_w(u_bucket, v_bucket, BUCKET_HALF), BUCKET_COL)

# --- roof: little pink-roofed cap over the crossed peak — flared eave,
# slope, cone tip. The ONE pink accent, rhyming with the hamlet's roofs.
band(ring(ROOF_Z0, R_FLARE), ring(ROOF_Z1, R_EAVE), PINK_DARK, PINK_MAIN)
band(ring(ROOF_Z1, R_EAVE), ring(ROOF_Z2, R_CAPBASE), PINK_MAIN, PINK_LIGHT)
fan_up(ring(ROOF_Z2, R_CAPBASE), (WX, WY, ROOF_Z3), PINK_LIGHT)

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
        "South hamlet village well, %d tris (budget %d). 8-sided stone "
        "drum R %.2f->%.2f m (dark base zone blending into light body, "
        "flared lip, dark 'opening' disc — a color trick, no real hole "
        "cut) to rim top %.2f m abs. Timber A-frame straddles the drum "
        "east-west at the drum's own y so it faces the post eye: two "
        "0.5 m posts lean in from %.1f m out and cross past their "
        "meeting point at %.2f m abs (log-cabin lap-joint peak), tied "
        "by a %.2fm-thick crossbar at %d%% height. Little pink-roofed "
        "cap (flared eave + cone) rides the peak — the ONE accent, "
        "apex %.2f m abs, %.2f m total structure height. Fat dark "
        "bucket hangs on a thin rope from the crossbar center, lowered "
        "to just above the opening. Ground raycast z %.2f (hit=%s), "
        "base sunk 0.3 m. Deterministic, no randomness."
        % (tri_count, BUDGET, R0, R2, Z_LIP_TOP, LEG_BASE_OFFSET_X,
           LEG_MEET_Z, CROSSBAR_HALF * 2, int(CROSSBAR_T * 100),
           ROOF_Z3, ROOF_Z3 - base_z, ground_z, hit)),
}
