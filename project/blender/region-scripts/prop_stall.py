# prop_stall.py — COMMISSION: THE SHOP STALL (gameplay prop, not backdrop).
#
# Per research/18-region-structure-rules.md (THE SCRIPT CONTRACT §8), AS
# AMENDED by the prop_stall commission: prop_ prefix (ships as its own GLB,
# placed by game code at each town's shop anchor; region exports exclude
# prop_ by design), local zone bounds replace "zone", "base_at_zero"
# replaces "grounded" (no raycast, no sinking), plus
# "counter_matches_collider" and "winding".
#
# AUTHORING CONVENTION (declared per commission):
#   - Authored at the WORLD ORIGIN of region.blend. Origin = ground center
#     under the counter footprint. Base sits at EXACTLY z = 0 (no sinking —
#     it stands on the flat arena, placed by code).
#   - Blender +x = FRONT (away from the wall, toward the walking baker).
#     Blender -x = the wall side. Blender y = width along the wall.
#
# THE COUNTER LAW: the game's collider is a fixed box — in this authoring
# frame the counter spans blender x -0.6..+0.6, y -1.1..+1.1, z 0..1.5.
# The visual counter block COINCIDES with that box exactly (three stacked
# full-footprint boxes: soot feet zone / timber body / timber top lip —
# chunky planked reads via color zones, not geometry). Bakers lean on it,
# projectiles rest on it: the visible counter IS the collider.
#
# Dressing (visual-only, inside the zone x -0.8..+1.6, y -1.7..+1.7,
# cap 4.0; nothing below z 2.2 past x +0.7 — the walkway stays walkable):
#   - Back panel rising on the wall side (x -0.78..-0.62) up into the
#     awning underside; two stout FRONT corner posts (x 0.32..0.68,
#     y ±1.35 centers) rising past the counter to carry the awning front;
#     two sloped support beams tying panel to posts under the canopy.
#   - PINK-AND-CREAM STRIPED AWNING: 8 sloped stripe boxes (0.4 m each,
#     y ±1.6), back edge z 3.10 falling to front edge z 2.65 at x +1.45,
#     pattern B87890 / C8C8B8 / A88098 / C8C8B8. Chunky scalloped front
#     edge: one triangular flap prism per stripe, matching color, hanging
#     to z 2.25 (above the 2.2 head-height law, x ~1.4 > 0.7).
#   - THE GOLD COIN SIGN: fat 12-gon coin disc (r 0.5, 0.14 thick, ruled
#     gold #C98A2B — bright faces, darker rim), axis +x so it faces the
#     approaching baker, center (1.16, 0, 3.15), lower rim socketed into
#     the awning ridge; short soot post mount behind it (hidden from the
#     front by the disc). The greybox's coin-on-a-post icon, kept legible.
#   - Wares on the counter top (z 1.5): pink-frosted bun, a second smaller
#     bun riding a timber crate, a cream jar with a pink lid. §5 colors.
#
# Style law §6: flat shading, vertex color only ("Col" FLOAT_COLOR POINT,
# every vertex painted), material by reference bpy.data.materials["vtx"],
# friendly / edible / toy-like. ONE joined mesh named exactly "prop_stall".
#
# Winding: every sub-solid is CLOSED and star-shaped from its centroid;
# the audit below is programmatic (per-sub-solid centroid parity + signed
# volume), never a Blender render (renders are not a winding oracle —
# EEVEE previews double-sided; three.js backface-culls).
#
# Deterministic: no randomness at all. Idempotent: OWNED teardown first.
# This script NEVER saves, exports, or touches anything outside OWNED.

import bpy
import math
from mathutils import Vector

OWNED = ["prop_stall"]
NAME = "prop_stall"
PREFIX = "prop_"
BUDGET = 450

ZONE_X = (-0.8, 1.6)
ZONE_Y = (-1.7, 1.7)
ZONE_ZMAX = 4.0
WALK_X = 0.7          # below WALK_Z, nothing may extend past this x
WALK_Z = 2.2

# THE COUNTER LAW (collider box, authoring frame)
CTR_X = 0.6           # half-extent x
CTR_Y = 1.1           # half-extent y (width along wall)
CTR_TOP = 1.5         # counter top height
LAW_TOL = 0.02

# ---------------------------------------------------------------------------
# §5 palette of record — LINEAR hex written verbatim as floats (int/255).
# NO sRGB conversion (§4). mul = ±10% shading-zone variation (§5).
# ---------------------------------------------------------------------------
def hx(h, mul=1.0):
    r = min(1.0, (int(h[0:2], 16) / 255.0) * mul)
    g = min(1.0, (int(h[2:4], 16) / 255.0) * mul)
    b = min(1.0, (int(h[4:6], 16) / 255.0) * mul)
    return (r, g, b, 1.0)

SOOT      = hx("605850")          # soot-brown feet zone
BODY      = hx("886060")          # timber — counter body
TOPLIP    = hx("806870")          # timber — counter top lip
PANEL     = hx("806870", 0.92)    # back panel
POST      = hx("886060", 0.95)    # front corner posts
BEAM      = hx("786878")          # sloped canopy beams
PINK_A    = hx("B87890")          # brand pink (awning)
PINK_B    = hx("A88098")          # brand pink 2 (awning)
CREAM     = hx("C8C8B8")          # cream (awning, jar, bun bases)
GOLD_FACE = hx("C98A2B", 1.12)    # coin faces (bright, ruled gold family)
GOLD_RIM  = hx("C98A2B", 0.80)    # coin rim
CRATE_COL = hx("806870", 0.88)    # small crate
JAR_LID   = hx("A080A0")          # jar lid (brand pink row)
BUN_BASE  = hx("C8C8B8", 1.05)    # bun cream base, faint lift

STRIPE_COLS = [PINK_A, CREAM, PINK_B, CREAM]   # repeats across 8 stripes

# ---------------------------------------------------------------------------
# Dimensions
# ---------------------------------------------------------------------------
FEET_TOP = 0.22       # soot zone 0..0.22
LIP_BOT = 1.32        # top lip 1.32..1.50

POST_CX, POST_CY = 0.50, 1.35     # front post centers (±y)
POST_HALF = 0.18
POST_TOP = 2.78                   # embeds into awning underside

PANEL_X = (-0.78, -0.62)
PANEL_HY = 1.45
PANEL_TOP = 3.02                  # embeds into awning back underside

BEAM_P0 = (-0.70, 2.85)           # (x, z) back end, inside panel
BEAM_P1 = (0.60, 2.58)            # (x, z) front end, inside post
BEAM_HV = 0.10                    # y half-width
BEAM_HW = 0.10                    # half-thickness

AWN_BACK = (-0.75, 3.10)          # (x, z) back edge center
AWN_FRONT = (1.45, 2.65)          # (x, z) front edge center
AWN_HT = 0.12                     # half-thickness
AWN_Y = 1.6                       # canopy spans y ±1.6
N_STRIPES = 8
STRIPE_HW = AWN_Y / N_STRIPES     # 0.2 half-width per stripe

SCALLOP_X = (1.39, 1.46)          # flap prism thickness along x
SCALLOP_TOP = 2.53                # just under the awning front-bottom edge
SCALLOP_DROP = 0.28               # apex z 2.25 — above the 2.2 walkway law
SCALLOP_HY = 0.17

COIN_C = (1.16, 0.0, 3.15)        # disc center — faces +x (the baker)
COIN_R = 0.50
COIN_HT = 0.07                    # half-thickness along x
COIN_SIDES = 12
CPOST_X = (0.98, 1.10)            # mount post, hidden behind the disc
CPOST_HY = 0.09
CPOST_Z = (2.65, 3.30)

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
# 2. Build — pure pydata. Every part is its own vertex island so POINT-
#    domain colors stay hard-edged blocks (§6). Every SUB-SOLID (a named
#    group of islands forming one closed star-shaped surface) is recorded
#    for the programmatic winding audit.
# ---------------------------------------------------------------------------
V, F, C = [], [], []      # verts, faces, per-vertex RGBA
SOLIDS = []               # (name, f0, f1, v0, v1) closed sub-solids
_cur = None

def begin_solid(name):
    global _cur
    _cur = (name, len(F), len(V))

def end_solid():
    SOLIDS.append((_cur[0], _cur[1], len(F), _cur[2], len(V)))

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
    face table gives outward CCW winding (three.js culls backfaces).
    Face table proven in the accepted fleet scripts."""
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

def box_solid(name, p0, p1, v0, v1, w, col):
    begin_solid(name)
    tapered_box(p0, p1, v0, v1, w, col)
    end_solid()

def sloped_box(name, x0, z0, x1, z1, yc, hv, hw, col):
    """Box sloping in the xz plane from (x0,z0) to (x1,z1) at y center yc,
    y half-width hv, half-thickness hw NORMAL to the slope. w is computed
    as normalize(u x v) * hw, guaranteeing (u, v, w) right-handed."""
    u = Vector((x1 - x0, 0.0, z1 - z0))
    v = Vector((0.0, hv, 0.0))
    w = u.cross(v).normalized() * hw
    box_solid(name, (x0, yc, z0), (x1, yc, z1), v, v, tuple(w), col)

def ring(cx, cy, z, r, sides):
    """CCW (from +z) sides-gon centered at (cx, cy, z), radius r."""
    pts = []
    for k in range(sides):
        a = -math.pi / 2.0 + (2 * k + 1) * math.pi / sides
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a), z))
    return pts

def band(ring_lo, ring_hi, col):
    """Side wall between two CCW-from-+z rings — outward winding."""
    n = len(ring_lo)
    fs = [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
    emit(ring_lo + ring_hi, fs, col)

def fan_up(ring_pts, apex, col):
    """Cap/cone from CCW ring to apex at or above — outward (+z-ish)."""
    n = len(ring_pts)
    fs = [(k, (k + 1) % n, n) for k in range(n)]
    emit(ring_pts + [apex], fs, col)

def fan_down(ring_pts, center, col):
    """Bottom cap — reversed fan, outward (-z)."""
    n = len(ring_pts)
    fs = [((k + 1) % n, k, n) for k in range(n)]
    emit(ring_pts + [center], fs, col)

def prism_x(name, x0, x1, pts_yz, col):
    """Closed prism along +x. pts_yz is CCW in the (y, z) plane (viewed
    from +x looking back): -x cap reversed, +x cap forward, band outward."""
    n = len(pts_yz)
    vn = [(x0, p[0], p[1]) for p in pts_yz]
    vp = [(x1, p[0], p[1]) for p in pts_yz]
    begin_solid(name)
    fs = [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
    emit(vn + vp, fs, col)                                    # band
    emit(vp, [(0, k, k + 1) for k in range(1, n - 1)], col)   # +x cap
    emit(vn, [(0, k + 1, k) for k in range(1, n - 1)], col)   # -x cap
    end_solid()

def bun(name, cx, cy, z0, r, drum_h, widen_r, widen_rise, apex_rise,
        base_col, pink_col, sides=6):
    """Pink-frosted bun: cream drum under a bulging pink crown that tapers
    to a soft point. Closed (bottom cap included), star-shaped. Hard
    cream/pink seam via duplicated ring verts (separate islands)."""
    begin_solid(name)
    r0 = ring(cx, cy, z0, r, sides)
    fan_down(r0, (cx, cy, z0), base_col)
    r1 = ring(cx, cy, z0 + drum_h, r, sides)
    band(ring(cx, cy, z0, r, sides), r1, base_col)
    r1p = ring(cx, cy, z0 + drum_h, r, sides)          # pink dup — hard seam
    r2 = ring(cx, cy, z0 + drum_h + widen_rise, widen_r, sides)
    band(r1p, r2, pink_col)
    fan_up(ring(cx, cy, z0 + drum_h + widen_rise, widen_r, sides),
           (cx, cy, z0 + drum_h + widen_rise + apex_rise), pink_col)
    end_solid()

# --- THE COUNTER (the law): three stacked full-footprint boxes, outer
#     faces exactly on the collider planes x ±0.6, y ±1.1, z 0 / 1.5.
vy = (0.0, CTR_Y, 0.0)
box_solid("counter_feet", (-CTR_X, 0.0, (0.0 + FEET_TOP) / 2.0),
          (CTR_X, 0.0, (0.0 + FEET_TOP) / 2.0),
          vy, vy, (0.0, 0.0, FEET_TOP / 2.0), SOOT)
box_solid("counter_body", (-CTR_X, 0.0, (FEET_TOP + LIP_BOT) / 2.0),
          (CTR_X, 0.0, (FEET_TOP + LIP_BOT) / 2.0),
          vy, vy, (0.0, 0.0, (LIP_BOT - FEET_TOP) / 2.0), BODY)
box_solid("counter_lip", (-CTR_X, 0.0, (LIP_BOT + CTR_TOP) / 2.0),
          (CTR_X, 0.0, (LIP_BOT + CTR_TOP) / 2.0),
          vy, vy, (0.0, 0.0, (CTR_TOP - LIP_BOT) / 2.0), TOPLIP)

# --- back panel (wall side), base at z 0, top embedded in the awning
zmid = PANEL_TOP / 2.0
box_solid("panel", (PANEL_X[0], 0.0, zmid), (PANEL_X[1], 0.0, zmid),
          (0.0, PANEL_HY, 0.0), (0.0, PANEL_HY, 0.0),
          (0.0, 0.0, PANEL_TOP / 2.0), PANEL)

# --- two stout front corner posts, base at z 0, tops in the awning
for sy in (-1.0, 1.0):
    box_solid("post_%+d" % sy, (POST_CX, sy * POST_CY, 0.0),
              (POST_CX, sy * POST_CY, POST_TOP),
              (POST_HALF, 0.0, 0.0), (POST_HALF, 0.0, 0.0),
              (0.0, POST_HALF, 0.0), POST)

# --- two sloped beams, panel -> posts, just under the canopy
for sy in (-1.0, 1.0):
    sloped_box("beam_%+d" % sy, BEAM_P0[0], BEAM_P0[1],
               BEAM_P1[0], BEAM_P1[1], sy * POST_CY, BEAM_HV, BEAM_HW, BEAM)

# --- the striped awning: 8 sloped stripe boxes, alternating pink/cream
for i in range(N_STRIPES):
    yc = -AWN_Y + STRIPE_HW + i * 2.0 * STRIPE_HW
    sloped_box("stripe_%d" % i, AWN_BACK[0], AWN_BACK[1],
               AWN_FRONT[0], AWN_FRONT[1], yc, STRIPE_HW, AWN_HT,
               STRIPE_COLS[i % 4])

# --- scalloped front edge: one triangular flap prism per stripe
for i in range(N_STRIPES):
    yc = -AWN_Y + STRIPE_HW + i * 2.0 * STRIPE_HW
    tri = [(yc - SCALLOP_HY, SCALLOP_TOP),           # CCW in (y, z)
           (yc, SCALLOP_TOP - SCALLOP_DROP),
           (yc + SCALLOP_HY, SCALLOP_TOP)]
    prism_x("scallop_%d" % i, SCALLOP_X[0], SCALLOP_X[1], tri,
            STRIPE_COLS[i % 4])

# --- THE GOLD COIN SIGN: mount post (soot, hidden behind the disc), then
#     the fat 12-gon coin, axis +x, flat edge down, bright faces/dark rim
box_solid("coin_post", (sum(CPOST_X) / 2.0, 0.0, CPOST_Z[0]),
          (sum(CPOST_X) / 2.0, 0.0, CPOST_Z[1]),
          ((CPOST_X[1] - CPOST_X[0]) / 2.0, 0.0, 0.0),
          ((CPOST_X[1] - CPOST_X[0]) / 2.0, 0.0, 0.0),
          (0.0, CPOST_HY, 0.0), SOOT)

begin_solid("coin")
cyz = []
for k in range(COIN_SIDES):
    a = (2 * k + 1) * math.pi / COIN_SIDES   # vertex at 15° — flat edge down
    cyz.append((COIN_C[1] + COIN_R * math.cos(a),
                COIN_C[2] + COIN_R * math.sin(a)))
xn, xp = COIN_C[0] - COIN_HT, COIN_C[0] + COIN_HT
rim_n = [(xn, p[0], p[1]) for p in cyz]
rim_p = [(xp, p[0], p[1]) for p in cyz]
n = COIN_SIDES
emit(rim_n + rim_p,
     [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)], GOLD_RIM)
emit(rim_p + [(xp, COIN_C[1], COIN_C[2])],
     [(k, (k + 1) % n, n) for k in range(n)], GOLD_FACE)       # +x face
emit(rim_n + [(xn, COIN_C[1], COIN_C[2])],
     [((k + 1) % n, k, n) for k in range(n)], GOLD_FACE)       # -x face
end_solid()

# --- wares on the counter top (z 1.5): bun, crate + rider bun, jar
bun("bun_big", 0.18, -0.55, CTR_TOP, 0.26, 0.16, 0.31, 0.10, 0.24,
    BUN_BASE, PINK_A)

# crate: u vertical (counter top -> lid), v = x half-width, w = y half-depth
# ((0,0,1) x (1,0,0) = (0,1,0) — right-handed)
box_solid("crate", (0.08, 0.62, CTR_TOP), (0.08, 0.62, CTR_TOP + 0.30),
          (0.20, 0.0, 0.0), (0.20, 0.0, 0.0), (0.0, 0.17, 0.0), CRATE_COL)

bun("bun_rider", 0.08, 0.62, CTR_TOP + 0.30, 0.20, 0.12, 0.24, 0.08, 0.20,
    BUN_BASE, PINK_B)

begin_solid("jar")
JX, JY, JR = 0.12, 0.10, 0.17
jr0 = ring(JX, JY, CTR_TOP, JR, 6)
fan_down(jr0, (JX, JY, CTR_TOP), CREAM)
band(ring(JX, JY, CTR_TOP, JR, 6), ring(JX, JY, CTR_TOP + 0.34, JR, 6), CREAM)
band(ring(JX, JY, CTR_TOP + 0.34, JR, 6),
     ring(JX, JY, CTR_TOP + 0.44, JR, 6), JAR_LID)
fan_up(ring(JX, JY, CTR_TOP + 0.44, JR, 6),
       (JX, JY, CTR_TOP + 0.44), JAR_LID)
end_solid()

# ---------------------------------------------------------------------------
# 3. One mesh, one object; flat shading; existing "vtx" by reference (§4)
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
# 4. Self-validation (§8.5, as amended) — computed honestly; can fail.
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
        "bbox x %.2f..%.2f y %.2f..%.2f zmax %.2f outside "
        "x %s y %s cap %.1f" % (min_x, max_x, min_y, max_y, max_z,
                                ZONE_X, ZONE_Y, ZONE_ZMAX))

# walkway law: below z 2.2 nothing extends past x +0.7
walk_bad = [tuple(round(c, 3) for c in v) for v in V
            if v[2] < WALK_Z and v[0] > WALK_X]
checks["walkway_clear"] = (
    True if not walk_bad
    else "%d verts below z %.1f past x %.1f, e.g. %s"
         % (len(walk_bad), WALK_Z, WALK_X, walk_bad[:3]))

# base_at_zero (replaces "grounded"): mesh min z within ±0.02 of 0
checks["base_at_zero"] = (
    True if abs(min_z) <= 0.02
    else "mesh min z %.3f not within ±0.02 of 0" % min_z)

# counter_matches_collider: the counter solids' outer extents ARE the
# collider box x ±0.6, y ±1.1, z 0..1.5, within ±0.02
ctr_verts = []
for (sname, f0, f1, v0, v1) in SOLIDS:
    if sname.startswith("counter"):
        ctr_verts.extend(V[v0:v1])
cx0 = min(v[0] for v in ctr_verts); cx1 = max(v[0] for v in ctr_verts)
cy0 = min(v[1] for v in ctr_verts); cy1 = max(v[1] for v in ctr_verts)
cz0 = min(v[2] for v in ctr_verts); cz1 = max(v[2] for v in ctr_verts)
law = [(cx0, -CTR_X), (cx1, CTR_X), (cy0, -CTR_Y), (cy1, CTR_Y),
       (cz0, 0.0), (cz1, CTR_TOP)]
if all(abs(a - b) <= LAW_TOL for a, b in law):
    checks["counter_matches_collider"] = True
else:
    checks["counter_matches_collider"] = (
        "counter x %.3f..%.3f y %.3f..%.3f z %.3f..%.3f vs law "
        "±%.1f/±%.1f/0..%.1f" % (cx0, cx1, cy0, cy1, cz0, cz1,
                                 CTR_X, CTR_Y, CTR_TOP))

# winding: programmatic outward-normal audit. Every sub-solid is closed
# and star-shaped from its centroid: (a) each face's Newell normal points
# away from the solid centroid, (b) signed volume (divergence theorem) is
# positive. Blender renders are NOT a winding oracle; this is the audit.
def newell(pts):
    nx = ny = nz = 0.0
    m = len(pts)
    for i in range(m):
        a, b = pts[i], pts[(i + 1) % m]
        nx += (a[1] - b[1]) * (a[2] + b[2])
        ny += (a[2] - b[2]) * (a[0] + b[0])
        nz += (a[0] - b[0]) * (a[1] + b[1])
    return Vector((nx, ny, nz))

winding_bad = []
if len(mesh.polygons) != len(F):
    winding_bad.append("mesh has %d polys, authored %d (validate() surgery)"
                       % (len(mesh.polygons), len(F)))
for (sname, f0, f1, v0, v1) in SOLIDS:
    sc = Vector((0.0, 0.0, 0.0))
    for v in V[v0:v1]:
        sc += Vector(v)
    sc /= (v1 - v0)
    vol = 0.0
    for fi in range(f0, f1):
        pts = [Vector(V[i]) for i in F[fi]]
        fc = sum(pts, Vector((0.0, 0.0, 0.0))) / len(pts)
        if newell(pts).dot(fc - sc) <= 1e-9:
            winding_bad.append("%s face %d inward" % (sname, fi))
        for t in range(1, len(pts) - 1):
            vol += pts[0].dot(pts[t].cross(pts[t + 1])) / 6.0
    if vol <= 1e-9:
        winding_bad.append("%s signed volume %.6f <= 0" % (sname, vol))
checks["winding"] = (
    True if not winding_bad else "; ".join(winding_bad[:6]))

checks["transforms_clean"] = (
    True if (all(abs(r) < 1e-6 for r in obj.rotation_euler)
             and all(abs(s - 1.0) < 1e-6 for s in obj.scale))
    else "rot %s scale %s" % (tuple(obj.rotation_euler), tuple(obj.scale)))

checks["no_modifiers"] = (
    True if len(obj.modifiers) == 0
    else "%d modifiers" % len(obj.modifiers))

result = {
    "status": "pass" if all(v is True for v in checks.values()) else "fail",
    "created": created,
    "checks": checks,
    "notes": (
        "THE SHOP STALL, %d tris (budget %d), one joined mesh, base at "
        "exactly z 0, front = +x. Counter block IS the collider (x ±0.6, "
        "y ±1.1, z 0..1.5): soot feet #605850 / timber body #886060 / lip "
        "#806870. Back panel + two stout front posts + sloped beams carry "
        "an 8-stripe pink/cream awning (B87890/C8C8B8/A88098, back z 3.10 "
        "-> front z 2.65 at x 1.45) with 8 scalloped flaps to z 2.25 "
        "(walkway law: nothing below 2.2 past x 0.7). Gold coin sign "
        "#C98A2B (r 0.5 twelve-gon, bright faces, dark rim) faces +x at "
        "(%.2f, 0, %.2f), rim socketed on the awning ridge, soot mount "
        "post behind. Wares: pink bun, crate with rider bun, cream jar "
        "with pink lid. Winding audited programmatically per sub-solid "
        "(%d solids: centroid parity + signed volume). Deterministic, "
        "idempotent, nothing saved/exported."
        % (tri_count, BUDGET, COIN_C[0], COIN_C[2], len(SOLIDS))),
}

print("prop_stall result:", result)
