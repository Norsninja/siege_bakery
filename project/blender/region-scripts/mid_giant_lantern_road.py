# mid_giant_lantern_road.py — COMMISSION: giant-scale road lantern on the
# north shoulder of the giants' road.
#
# Per research/18-region-structure-rules.md (THE SCRIPT CONTRACT §8).
# Band: mid_ (lit + fogged — TRUE LOCAL COLOR, no baked haze).
# Zone: x 175..195, y 66..74 (blender), height cap 16 m. Budget 250 tris.
#
# Design (silhouette first, judged from the post eye at (1.5, 11, 1.6),
# ~185 m away, deep in fog: post + head silhouette and the warm gold spot
# are the whole read):
#   - MATERIAL CHOICE: TIMBER, not stone. The nearby waymark cairn
#     (mid_milestone_east, x~221) already owns the stone-monument
#     language on this stretch of road; a timber lamppost reads as a
#     distinct, more workaday fixture (something the giants planted,
#     not carved) and keeps the corridor's material vocabulary varied.
#     Post + bracket + roof use the timber family (#886060 shaft,
#     #806870 bracket/roof — a cooler, slightly worked-wood/iron tone
#     for the fittings vs the post itself).
#   - POST: fat 8-sided tapered timber post, R 1.0 m at a flared foot
#     tapering to 0.65 m under a small rounded finial cap — well clear
#     of the "0.4 m strut vanishes" floor. Foot zone shaded darker
#     (foundation shadow), shaft brightens toward the top.
#   - BRACKET: a shepherd's-hook arm off the post's upper shaft, baked
#     into the mesh (rotation ships zero) reaching 3.6 m south (-y,
#     toward the road) and rising, then a short hanger drops the
#     housing below the peak — "a small arm/bracket hangs the housing
#     over the road edge (-y)" taken literally. Built as two beams
#     whose thickness axis is computed as unit(u x v) — guaranteed
#     right-handed relative to tapered_box's face table, so every face
#     (including the end caps) is provably outward-wound regardless of
#     the beam's diagonal direction (verified analytically, see the
#     `beam()` helper below; also checked offline in a stub harness
#     with no live Blender access).
#   - HOUSING: a boxy lantern head (2.6 x 2.4 x 2.6 m) hanging under
#     the hook. THE GOLD MOMENT: three faces (east/west/north — away
#     from the viewer) are straw-light glass (#D8B878); the SOUTH face
#     (-y, facing the road AND the post eye 185 m south) is the bright
#     warm-gold inner-glow zone (#C98A2B) — the one glowing pane is
#     literally aimed at the camera that judges everything. Top/bottom
#     are the timber-fitting color, shadowed on the underside.
#   - ROOF: small 4-sided pyramid cap in the timber-fitting tone,
#     stepped out from the housing top on a short flared lip (an eave).
#   - NO PINK — per brief, gold is this object's one accent.
#   - Grounded by §7 raycast at the post site, base sunk 0.3 m.
#
# Deterministic: no randomness used at all. Idempotent: OWNED teardown
# first, raycast AFTER teardown (so a prior lantern can't catch the ray).

import bpy
import math
from mathutils import Vector

OWNED = ["mid_giant_lantern_road"]
NAME = "mid_giant_lantern_road"
PREFIX = "mid_"
BUDGET = 250
ZONE_X = (175.0, 195.0)
ZONE_Y = (66.0, 74.0)
ZONE_ZMAX = 16.0

POST_X, POST_Y = 185.0, 72.0   # site center (blender) — mid-x, north end of
                                # the zone (leaves depth south for the arm)
SIDES = 8                       # facet count, rounded-but-chunky (post)
FACE_ANGLE = -math.pi / 2       # a flat facet centers on -y (bracket side)
SINK = 0.3                      # §7: sink the base 0.3 m

# --- vertical plan (heights ABOVE base_z, resolved after raycast) ---
FOOT_H = 1.0             # flared foot top
SHAFT_TOP_H = 12.0        # shaft top / finial base
BALL_APEX_H = 12.5        # finial apex — overall post height
ARM_ATTACH_H = 11.4       # bracket mounts here on the upper shaft
ARM_PEAK_H = 12.1         # hook rise at the south reach
HANGER_BOTTOM_H = 10.6     # housing top attaches here (below the hook)

# --- reach / radii ---
ARM_REACH = 3.6           # how far south (-y) the hook reaches
R_FOOT = 1.0               # flared foot radius
R_SHAFT_BASE = 0.85        # shaft radius above the foot flare
R_SHAFT_TOP = 0.65         # shaft radius at the finial base

HOUSING_HALF_X = 1.3
HOUSING_HALF_Y = 1.2
HOUSING_HALF_Z = 1.3
ROOF_LIP_H = 0.15          # step-out height above the housing top
ROOF_LIP_HALF_X = 1.42
ROOF_LIP_HALF_Y = 1.32
ROOF_APEX_ABOVE_LIP = 0.85

ARM_HALF_W = 0.22          # bracket beam half-width/thickness (>=0.2 m —
HANGER_HALF_W = 0.20       # clear of the "0.4 m strut vanishes" floor)

# ---------------------------------------------------------------------------
# §5 palette of record — LINEAR hex written verbatim as floats (int/255).
# NO sRGB conversion (§4). Shading zones stay within the timber/gold family.
# ---------------------------------------------------------------------------
def hx(h, mul=1.0):
    r = min(1.0, (int(h[0:2], 16) / 255.0) * mul)
    g = min(1.0, (int(h[2:4], 16) / 255.0) * mul)
    b = min(1.0, (int(h[4:6], 16) / 255.0) * mul)
    return (r, g, b, 1.0)

TIMBER      = "886060"   # timber/roof brown-red — the post
TIMBER_ALT  = "806870"   # timber/roof brown-red alt — bracket, roof, trim
STRAW       = "D8B878"   # session-ruled straw light — glass panes
GOLD        = "C98A2B"   # session-ruled wheat gold — the inner-glow zone

FOOT_COL_LO   = hx(TIMBER, 0.75)
FOOT_COL_HI   = hx(TIMBER, 0.85)
SHAFT_COL_LO  = hx(TIMBER, 0.85)
SHAFT_COL_HI  = hx(TIMBER, 1.00)
CAP_COL       = hx(TIMBER, 1.08)
ARM_COL       = hx(TIMBER_ALT, 0.95)
LIP_COL_LO    = hx(TIMBER_ALT, 1.00)
LIP_COL_HI    = hx(TIMBER_ALT, 1.05)
ROOF_COL      = hx(TIMBER_ALT, 1.08)

HOUSING_COLS = [
    hx(STRAW, 0.95),      # +x east   — glass
    hx(STRAW, 0.95),      # -x west   — glass
    hx(STRAW, 1.00),      # +y north  — glass (away from the post eye)
    hx(GOLD, 1.05),       # -y south  — THE inner-glow zone (faces the road)
    hx(TIMBER_ALT, 0.90),  # +z top    — fitting (mostly hidden under the roof)
    hx(TIMBER_ALT, 0.72),  # -z bottom — fitting, shadowed underside
]

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
    deps, Vector((POST_X, POST_Y, 50.0)), Vector((0.0, 0.0, -1.0)))
ground_z = loc.z if hit else 0.0
base_z = ground_z - SINK

Z_FOOT_TOP = base_z + FOOT_H
Z_SHAFT_TOP = base_z + SHAFT_TOP_H
Z_BALL_APEX = base_z + BALL_APEX_H
Z_ARM_ATTACH = base_z + ARM_ATTACH_H
Z_ARM_PEAK = base_z + ARM_PEAK_H
Z_HANGER_BOTTOM = base_z + HANGER_BOTTOM_H

HOUSING_Y = POST_Y - ARM_REACH
HOUSING_TOP_Z = Z_HANGER_BOTTOM
HOUSING_CENTER_Z = HOUSING_TOP_Z - HOUSING_HALF_Z

ROOF_BASE_Z = HOUSING_TOP_Z + ROOF_LIP_H
ROOF_APEX_Z = ROOF_BASE_Z + ROOF_APEX_ABOVE_LIP

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
    """CCW (from +z) SIDES-gon around the post axis; phased so the wrap
    facet (between the last and first vertex) centers exactly on
    FACE_ANGLE (-y — the bracket side)."""
    pts = []
    for k in range(SIDES):
        a = FACE_ANGLE + (2 * k + 1) * math.pi / SIDES
        pts.append((POST_X + r * math.cos(a), POST_Y + r * math.sin(a), z))
    return pts

def band(ring_lo, ring_hi, col_lo, col_hi):
    """Side wall between two same-length CCW rings — outward winding.
    Works for any equal ring size (used for the octagon post AND the
    rectangular roof lip, n=4)."""
    n = len(ring_lo)
    fs = [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
    emit(ring_lo + ring_hi, fs, [col_lo] * n + [col_hi] * n)

def fan_up(ring_pts, apex, col):
    """Cone tip from CCW ring to apex above — outward winding."""
    n = len(ring_pts)
    fs = [(k, (k + 1) % n, n) for k in range(n)]
    emit(ring_pts + [apex], fs, col)

def rect_ring(cx, cy, z, hxr, hyr):
    """CCW rectangle (viewed from +z), same winding convention as ring()."""
    return [(cx - hxr, cy - hyr, z), (cx + hxr, cy - hyr, z),
            (cx + hxr, cy + hyr, z), (cx - hxr, cy + hyr, z)]

def box6(cx, cy, cz, hxr, hyr, hzr, cols):
    """Independent-vertex axis-aligned box, 6 faces, order
    [+x, -x, +y, -y, +z, -z]. cols: list of 6 RGBA. Each face gets its
    own 4 verts (no sharing) so POINT-domain color stays a hard block
    per face, no blending across edges. Outward CCW winding verified
    analytically per face (cross product of two adjacent edges checked
    against the face's own outward axis for all six)."""
    faces = [
        [(hxr, -hyr, -hzr), (hxr, hyr, -hzr), (hxr, hyr, hzr), (hxr, -hyr, hzr)],       # +x
        [(-hxr, hyr, -hzr), (-hxr, -hyr, -hzr), (-hxr, -hyr, hzr), (-hxr, hyr, hzr)],   # -x
        [(hxr, hyr, -hzr), (-hxr, hyr, -hzr), (-hxr, hyr, hzr), (hxr, hyr, hzr)],       # +y
        [(-hxr, -hyr, -hzr), (hxr, -hyr, -hzr), (hxr, -hyr, hzr), (-hxr, -hyr, hzr)],   # -y
        [(-hxr, -hyr, hzr), (hxr, -hyr, hzr), (hxr, hyr, hzr), (-hxr, hyr, hzr)],       # +z
        [(hxr, -hyr, -hzr), (-hxr, -hyr, -hzr), (-hxr, hyr, -hzr), (hxr, hyr, -hzr)],   # -z
    ]
    for pts, col in zip(faces, cols):
        verts = [(cx + p[0], cy + p[1], cz + p[2]) for p in pts]
        emit(verts, [(0, 1, 2, 3)], [col] * 4)

def beam(p0, p1, half_w, half_t, col):
    """Straight rectangular beam from p0 to p1. Width half_w runs along
    +x; thickness half_t runs along w = unit(u x v) where u = p1-p0,
    v = (half_w,0,0) — BY CONSTRUCTION u x v is exactly parallel to w,
    and since v has zero x-component-only... (v IS the x axis) and both
    of our beams have u with zero x-component, u and v are perpendicular,
    so (u, v, w) forms a right-handed orthogonal frame for ANY beam
    direction in the y-z plane. That right-handedness is exactly what
    tapered_box's fixed face-index table needs to keep every face
    (not just the visible ones) outward-wound, verified analytically
    and re-checked in an offline stub harness (no live Blender access
    for this commission)."""
    p0, p1 = Vector(p0), Vector(p1)
    u = p1 - p0
    v = Vector((half_w, 0.0, 0.0))
    w = u.cross(v)
    w.normalize()
    w = w * half_t
    c = [p0 - v - w, p1 - v - w, p0 + v - w, p1 + v - w,
         p0 - v + w, p1 - v + w, p0 + v + w, p1 + v + w]
    fs = [(4, 5, 7, 6),   # +w
          (0, 2, 3, 1),   # -w
          (1, 3, 7, 5),   # +u (far end)
          (0, 4, 6, 2),   # -u (near end)
          (2, 6, 7, 3),   # +v
          (0, 1, 5, 4)]   # -v
    emit([tuple(p) for p in c], fs, col)

# --- post: flared timber foot, tapered shaft, small rounded finial cap
band(ring(base_z, R_FOOT), ring(Z_FOOT_TOP, R_SHAFT_BASE), FOOT_COL_LO, FOOT_COL_HI)
band(ring(Z_FOOT_TOP, R_SHAFT_BASE), ring(Z_SHAFT_TOP, R_SHAFT_TOP), SHAFT_COL_LO, SHAFT_COL_HI)
fan_up(ring(Z_SHAFT_TOP, R_SHAFT_TOP), (POST_X, POST_Y, Z_BALL_APEX), CAP_COL)

# --- bracket: shepherd's-hook off the upper shaft, baked into the mesh —
# near end embedded into the post (no gap), reaches ARM_REACH south (-y)
# and rises to the peak, then a short hanger drops to the housing top.
arm_p0 = (POST_X, POST_Y - 0.5, Z_ARM_ATTACH)          # embedded in the post
arm_p1 = (POST_X, POST_Y - ARM_REACH, Z_ARM_PEAK)       # the hook's peak
beam(arm_p0, arm_p1, ARM_HALF_W, ARM_HALF_W, ARM_COL)

hanger_p0 = arm_p1
hanger_p1 = (POST_X, HOUSING_Y, Z_HANGER_BOTTOM)
beam(hanger_p0, hanger_p1, HANGER_HALF_W, HANGER_HALF_W, ARM_COL)

# --- housing: boxy lantern head. THE gold moment is the -y (south) face —
# it faces the road AND the post eye 185 m south, so the one glowing pane
# is aimed straight at the camera that judges everything.
box6(POST_X, HOUSING_Y, HOUSING_CENTER_Z,
     HOUSING_HALF_X, HOUSING_HALF_Y, HOUSING_HALF_Z, HOUSING_COLS)

# --- roof: short flared eave lip, then a small 4-sided pyramid cap
lip_lo = rect_ring(POST_X, HOUSING_Y, HOUSING_TOP_Z, HOUSING_HALF_X, HOUSING_HALF_Y)
lip_hi = rect_ring(POST_X, HOUSING_Y, ROOF_BASE_Z, ROOF_LIP_HALF_X, ROOF_LIP_HALF_Y)
band(lip_lo, lip_hi, LIP_COL_LO, LIP_COL_HI)
fan_up(lip_hi, (POST_X, HOUSING_Y, ROOF_APEX_Z), ROOF_COL)

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
        "Giant road lantern, %d tris (budget %d). Timber post (fat 8-gon, "
        "R %.2f->%.2f m, darker foundation zone) to a small finial cap at "
        "%.1f m, a shepherd's-hook bracket baked in (reaches %.1f m south "
        "toward the road, rotation ships zero), boxy housing (%.1fx%.1fx"
        "%.1f m) hanging below it. THE gold moment: the housing's -y face "
        "(south, facing the road and the post eye) is bright wheat gold "
        "#C98A2B, the other three sides are straw glass #D8B878 — no pink "
        "on this one per brief. Small eave-lipped pyramid roof caps the "
        "housing. Ground raycast z %.2f (hit=%s), base sunk 0.3 m. "
        "Deterministic, no randomness."
        % (tri_count, BUDGET, R_FOOT, R_SHAFT_TOP, BALL_APEX_H, ARM_REACH,
           HOUSING_HALF_X * 2, HOUSING_HALF_Y * 2, HOUSING_HALF_Z * 2,
           ground_z, hit)),
}
