# mid_milestone_road.py — COMMISSION: giant-scale milestone marker on the
# north shoulder of the giants' road.
#
# Per research/18-region-structure-rules.md (THE SCRIPT CONTRACT §8).
# Band: mid_ (lit + fogged — TRUE LOCAL COLOR, no baked haze).
# Zone: x 90..112, y 66..74 (blender), height cap 12 m. Budget 300 tris.
#
# Design (silhouette first, judged from the post eye at (1.5, 11, 1.6)):
#   - Chunky 8-sided standing stone, ~8.8 m tall, built from stacked
#     tapering octagon rings — a squat plinth, two shaft segments and a
#     shoulder, closing in a small pointed cap. No single straight taper:
#     each segment breaks the profile so it reads as carved, not a cone.
#   - The octagon is PHASED (same trick as mid_mill_west's door facet) so
#     one flat facet always centers on -y — the marker's "face" is that
#     facet, addressing travelers on the road to the south.
#   - THE LEAN: baked into the mesh (object ships rotation (0,0,0)). Each
#     ring above the plinth is offset further in -y as height increases,
#     so the whole stone leans toward the road like it's bowing to
#     travelers — "leans/points toward -y" taken literally.
#   - Stone family colors (#B0B8C0 shaft, #B8C0C0 shoulder/cap), with a
#     visibly DARKER base zone at the plinth per the brief.
#   - ONE pink accent: a simple rectangular cartouche panel (#B87890)
#     flush-mounted on the plinth's -y facet, proud of the face with its
#     back buried into the stone — no text, no fine geometry, just a
#     color block (a painted cupcake-brand plaque).
#   - Grounded by §7 raycast, base sunk 0.3 m.
#
# Deterministic: no randomness used at all. Idempotent: OWNED teardown
# first, raycast AFTER teardown (so a prior stone can't catch the ray).

import bpy
import math
from mathutils import Vector

OWNED = ["mid_milestone_road"]
NAME = "mid_milestone_road"
PREFIX = "mid_"
BUDGET = 300
ZONE_X = (90.0, 112.0)
ZONE_Y = (66.0, 74.0)
ZONE_ZMAX = 12.0

STONE_X, STONE_Y = 101.0, 70.0    # site center (blender) — mid of the zone
SIDES = 8                          # facet count, rounded-but-chunky
SINK = 0.3                         # §7: sink the base 0.3 m

# ---------------------------------------------------------------------------
# §5 palette of record — LINEAR hex written verbatim as floats (int/255).
# NO sRGB conversion (§4). Shading zones stay within the stone family.
# ---------------------------------------------------------------------------
def hx(h, mul=1.0):
    r = min(1.0, (int(h[0:2], 16) / 255.0) * mul)
    g = min(1.0, (int(h[2:4], 16) / 255.0) * mul)
    b = min(1.0, (int(h[4:6], 16) / 255.0) * mul)
    return (r, g, b, 1.0)

STONE_A = "B0B8C0"    # wall stone (road/south hamlet family) — shaft
STONE_B = "B8C0C0"    # wall stone (road/south hamlet family) — cap/shoulder
PINK    = "B87890"    # brand pink — the ONE accent (cartouche panel)

PLINTH_COL    = hx(STONE_A, 0.70)   # darker base zone (brief requirement)
LEDGE_COL     = hx(STONE_A, 0.80)
SHAFT_LO_BOT  = hx(STONE_A, 0.85)
SHAFT_LO_TOP  = hx(STONE_A, 0.95)
SHAFT_HI_BOT  = hx(STONE_B, 0.95)
SHAFT_HI_TOP  = hx(STONE_B, 1.00)
SHOULDER_BOT  = hx(STONE_B, 1.00)
SHOULDER_TOP  = hx(STONE_B, 1.08)
CAP_COL       = hx(STONE_B, 1.12)
PANEL_COL     = hx(PINK)

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
    deps, Vector((STONE_X, STONE_Y, 50.0)), Vector((0.0, 0.0, -1.0)))
ground_z = loc.z if hit else 0.0
base_z = ground_z - SINK

# Heights, relative to base_z. Total visible height ~8.8 m (7-10 m brief).
Z0 = base_z                # plinth bottom (buried)
Z1 = base_z + 1.0          # plinth top / ledge
Z2 = base_z + 3.6          # shaft lower top
Z3 = base_z + 6.0          # shaft upper top
Z4 = base_z + 7.6          # shoulder top / cap base
Z5 = base_z + 8.8          # apex

# Radii per level.
R_PLINTH        = 2.6
R_LEDGE_INNER   = 2.0
R_SHAFT2        = 1.6
R_SHAFT3        = 1.15
R_SHOULDER      = 0.75

# The lean: y-offset from STONE_Y at each level, growing toward -y as
# height increases (baked in — object rotation ships (0,0,0)).
OFF0 = 0.0     # plinth (z0, z1) — vertical, no lean yet
OFF2 = -0.35   # shaft lower top
OFF3 = -0.75   # shaft upper top
OFF4 = -1.05   # shoulder top / cap base
OFF5 = -1.25   # apex

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

def ring(z, r, cy_off=0.0):
    """CCW (from +z) SIDES-gon around the stone axis; phased so the
    WRAP facet (between the last and first vertex) centers exactly on
    -y for ANY side count (proved analytically — the mid-angle of the
    k=SIDES-1 edge reduces to -pi/2 regardless of n). cy_off leans the
    ring center in y without touching x."""
    pts = []
    for k in range(SIDES):
        a = -math.pi / 2.0 + (2 * k + 1) * math.pi / SIDES
        pts.append((STONE_X + r * math.cos(a),
                     STONE_Y + cy_off + r * math.sin(a), z))
    return pts

def band(ring_lo, ring_hi, col_lo, col_hi):
    """Side wall between two CCW rings — outward winding."""
    n = len(ring_lo)
    fs = [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
    emit(ring_lo + ring_hi, fs, [col_lo] * n + [col_hi] * n)

def annulus_up(ring_outer, ring_inner, col):
    """Flat ring facing UP (a ledge top) — winding verified by shoelace
    on a synthetic square case: outer forward, inner backward gives a
    positive signed area in the xy-plane, i.e. normal +z."""
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

# --- plinth: straight octagon wall, darker base-zone stone
ring_p_bot = ring(Z0, R_PLINTH, OFF0)
ring_p_top = ring(Z1, R_PLINTH, OFF0)
band(ring_p_bot, ring_p_top, PLINTH_COL, PLINTH_COL)

# --- ledge: flat step from plinth radius down to shaft base radius
ring_ledge_inner = ring(Z1, R_LEDGE_INNER, OFF0)
annulus_up(ring_p_top, ring_ledge_inner, LEDGE_COL)

# --- shaft lower: tapers in, lean begins
ring_s2 = ring(Z2, R_SHAFT2, OFF2)
band(ring_ledge_inner, ring_s2, SHAFT_LO_BOT, SHAFT_LO_TOP)

# --- shaft upper: tapers further, lean continues, tone shifts to the
# cooler stone family (reads as a distinct carved block)
ring_s3 = ring(Z3, R_SHAFT3, OFF3)
band(ring_s2, ring_s3, SHAFT_HI_BOT, SHAFT_HI_TOP)

# --- shoulder: tapers into the cap base
ring_s4 = ring(Z4, R_SHOULDER, OFF4)
band(ring_s3, ring_s4, SHOULDER_BOT, SHOULDER_TOP)

# --- cap: small pointed close, lean finishes at the apex
apex = (STONE_X, STONE_Y + OFF5, Z5)
fan_up(ring_s4, apex, CAP_COL)

# --- cartouche panel: the ONE pink accent. Flush on the plinth's -y
# facet (offset 0, so the apothem math is a plain regular-polygon
# calc), proud of the face, back buried into the stone.
apothem = R_PLINTH * math.cos(math.pi / SIDES)
face_y = STONE_Y - apothem            # plane of the -y facet (OFF0 = 0)
panel_c = Vector((STONE_X, face_y - 0.05, Z0 + 0.55))
tapered_box(panel_c - Vector((0.8, 0.0, 0.0)), panel_c + Vector((0.8, 0.0, 0.0)),
            Vector((0.0, 0.35, 0.0)), Vector((0.0, 0.35, 0.0)),
            Vector((0.0, 0.0, 0.3)), PANEL_COL)

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
        "Giant milestone stone, %d tris (budget %d). 8-sided stacked "
        "octagon: plinth (dark base zone) + ledge + two shaft segments + "
        "shoulder + pointed cap, total %.1f m visible. Whole profile "
        "leans %.2f m in -y from base to apex (baked into the mesh, "
        "rotation ships zero) so it bows toward the road; flat facet "
        "phased to center exactly on -y at every level. Pink accent = "
        "cartouche panel on the plinth's -y facet, back buried into the "
        "stone. Ground raycast z %.2f (hit=%s), base sunk 0.3 m. "
        "Deterministic, no randomness."
        % (tri_count, BUDGET, Z5 - Z0, OFF5 - OFF0, ground_z, hit)),
}
