# mid_milestone_east.py — COMMISSION: the second waymark of the giants'
# road, one league east of mid_milestone_road.
#
# Per research/18-region-structure-rules.md (THE SCRIPT CONTRACT §8).
# Band: mid_ (lit + fogged — TRUE LOCAL COLOR, no baked haze).
# Zone: x 210..232, y 66..74 (blender), height cap 12 m. Budget 300 tris.
#
# Design (silhouette first, judged from the post eye at (1.5, 11, 1.6),
# ~215 m away — deep in the fog gradient, so ONLY silhouette + the high
# pink accent will read):
#   - DIFFERENT SILHOUETTE from the west sibling on purpose: not a tall
#     leaning obelisk but a STOUT CAIRN — three stacked, rounded-faceted
#     stone drums (10-gon, "fat" not spindly) each set on a shelf-lip
#     wider than the drum above it, closing in a broad DOMED cap (two-
#     stage taper, not a point). Total visible height ~7.3 m — inside
#     the "6-8 m" brief and shorter/fatter than the sibling's 8.8 m
#     lean, so the pair reads as a family with different builds.
#   - Same stone species as the sibling (#B0B8C0 shaft family / #B8C0C0
#     cap family), darker base zone at drum 1 per the brief.
#   - ONE pink accent (#B87890), but placed HIGHER than the sibling's
#     plinth-level cartouche: a proud painted COLLAR BAND wrapped around
#     the neck between drum 3 and the dome cap — a belt of color right
#     below the silhouette's rounded crown, gradient-blended into stone
#     on both edges so it reads as a painted band, not a stuck-on plate.
#     At distance this sits near the top third of the object, exactly
#     the "higher, more legible" placement the brief asks for.
#   - "Faces/leans toward the road (-y)": each drum's flat facet is
#     phased to center on -y (same analytic trick as the sibling, valid
#     for any side count), and the whole stack drifts a SUBTLE -0.45 m
#     in -y from base to apex — enough to read as "leaning toward the
#     road" without copying the sibling's dramatic lean (silhouette
#     stays a stout vertical pile, not a tilted spire). Small fixed x
#     jitter per drum (deterministic, no randomness) gives the stack an
#     organic "piled stones" look rather than a lathe-turned column.
#   - Grounded by §7 raycast, base sunk 0.3 m.
#
# Deterministic: no randomness used at all. Idempotent: OWNED teardown
# first, raycast AFTER teardown (so a prior stone can't catch the ray).

import bpy
import math
from mathutils import Vector

OWNED = ["mid_milestone_east"]
NAME = "mid_milestone_east"
PREFIX = "mid_"
BUDGET = 300
ZONE_X = (210.0, 232.0)
ZONE_Y = (66.0, 74.0)
ZONE_ZMAX = 12.0

STONE_X, STONE_Y = 221.0, 70.0   # site center (blender) — mid of the zone
SIDES = 10                        # rounded-faceted drums (fatter than the
                                   # sibling's 8-sided obelisk read)
SINK = 0.3                        # §7: sink the base 0.3 m

# ---------------------------------------------------------------------------
# §5 palette of record — LINEAR hex written verbatim as floats (int/255).
# NO sRGB conversion (§4). Shading zones stay within the stone family.
# ---------------------------------------------------------------------------
def hx(h, mul=1.0):
    r = min(1.0, (int(h[0:2], 16) / 255.0) * mul)
    g = min(1.0, (int(h[2:4], 16) / 255.0) * mul)
    b = min(1.0, (int(h[4:6], 16) / 255.0) * mul)
    return (r, g, b, 1.0)

STONE_A = "B0B8C0"    # wall stone (road/south hamlet family) — lower drums
STONE_B = "B8C0C0"    # wall stone (road/south hamlet family) — cap family
PINK    = "B87890"    # brand pink — the ONE accent (collar band)

PLINTH_COL   = hx(STONE_A, 0.68)   # darker base zone (brief requirement)
SHELF1_COL   = hx(STONE_A, 0.80)
DRUM2_BOT    = hx(STONE_A, 0.84)
DRUM2_TOP    = hx(STONE_A, 0.92)
SHELF2_COL   = hx(STONE_A, 0.95)
DRUM3_BOT    = hx(STONE_B, 0.95)
DRUM3_TOP    = hx(STONE_B, 1.00)
PINK_COL     = hx(PINK)
CAP_LO_COL   = hx(STONE_B, 1.02)
CAP_HI_COL   = hx(STONE_B, 1.10)

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

# Heights, relative to base_z. Total visible height ~7.3 m (6-8 m brief).
Z0  = base_z               # drum 1 bottom (buried)
Z1  = base_z + 2.3         # drum 1 top / shelf 1 outer
Z2  = base_z + 4.2         # drum 2 top / shelf 2 outer
Z3  = base_z + 5.6         # drum 3 top / collar flare-out start
Z3b = base_z + 5.75        # collar flare-out end / collar body bottom
Z3c = base_z + 6.05        # collar body top / collar flare-in start
Z4  = base_z + 6.2         # collar flare-in end / dome base
Z5  = base_z + 6.9         # dome mid ring
Z6  = base_z + 7.6         # apex

# Radii per level — each drum wider than the one it carries (a shelf lip
# at every step, the "stacked stones" read).
R1        = 2.4    # drum 1 (base, fattest)
R2        = 1.9    # drum 2
R3        = 1.5    # drum 3
R_COLLAR  = 1.7    # painted collar — proud of drum 3, a belt not a plate
R_DOME_LO = 1.2    # dome base
R_DOME_MID = 0.75  # dome mid ring (rounded taper, not a single point)

# Small FIXED (deterministic) x/y offsets per level: a subtle -y drift
# from base to apex ("leans/faces toward the road") plus tiny x jitter
# so the pile reads as organically stacked, not lathe-turned.
OFF0   = (0.0,  0.0)     # drum 1 base
OFF1   = (0.0,  0.0)     # drum 1 top / shelf 1 outer
OFF1B  = (0.05, 0.0)     # shelf 1 inner / drum 2 bottom
OFF2   = (0.05, -0.15)   # drum 2 top / shelf 2 outer
OFF2B  = (-0.10, -0.15)  # shelf 2 inner / drum 3 bottom
OFF3   = (-0.10, -0.30)  # drum 3 top / collar flare-out start
OFF3B  = (0.05,  -0.32)  # collar flare-out end / collar body bottom
OFF3C  = (0.05,  -0.35)  # collar body top / collar flare-in start
OFF4   = (-0.05, -0.38)  # collar flare-in end / dome base
OFF5   = (-0.05, -0.42)  # dome mid
OFF6   = (0.0,   -0.45)  # apex

# ---------------------------------------------------------------------------
# 3. Build — pure pydata, every ring its own vertex loop so POINT-domain
#    colors stay hard-edged/gradient blocks (§6: color blocks, not geometry)
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

def ring(z, r, cx_off=0.0, cy_off=0.0):
    """CCW (from +z) SIDES-gon around the stone axis; phased so the WRAP
    facet (between the last and first vertex) centers exactly on -y for
    ANY side count (the mid-angle of the k=SIDES-1 edge reduces to -pi/2
    regardless of n — proved in the sibling script). cx_off/cy_off shift
    the ring center without touching radius."""
    pts = []
    for k in range(SIDES):
        a = -math.pi / 2.0 + (2 * k + 1) * math.pi / SIDES
        pts.append((STONE_X + cx_off + r * math.cos(a),
                     STONE_Y + cy_off + r * math.sin(a), z))
    return pts

def band(ring_lo, ring_hi, col_lo, col_hi):
    """Quad strip between two same-count CCW rings — outward winding.
    Works identically whether the rings differ in z (a vertical wall),
    in r at the same z (a flat shelf/ledge), or both (a flare) — the
    per-k face (k, k+1, n+k+1, n+k) always resolves to the correct
    outward normal because ring() emits both rings at matching angular
    phase; verified on the sibling script (mid_milestone_road.py) by
    shoelace on a synthetic square case."""
    n = len(ring_lo)
    fs = [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
    emit(ring_lo + ring_hi, fs, [col_lo] * n + [col_hi] * n)

def fan_up(ring_pts, apex, col):
    """Cone tip from CCW ring to apex above — outward winding."""
    n = len(ring_pts)
    fs = [(k, (k + 1) % n, n) for k in range(n)]
    emit(ring_pts + [apex], fs, col)

# --- drum 1: straight wall, darker base-zone stone
ring_0  = ring(Z0, R1, *OFF0)
ring_1a = ring(Z1, R1, *OFF1)
band(ring_0, ring_1a, PLINTH_COL, PLINTH_COL)

# --- shelf 1: flat step down to drum 2's radius (the "stacked stone" lip)
ring_1b = ring(Z1, R2, *OFF1B)
band(ring_1a, ring_1b, PLINTH_COL, DRUM2_BOT)

# --- drum 2: wall
ring_2a = ring(Z2, R2, *OFF2)
band(ring_1b, ring_2a, DRUM2_BOT, DRUM2_TOP)

# --- shelf 2: flat step down to drum 3's radius
ring_2b = ring(Z2, R3, *OFF2B)
band(ring_2a, ring_2b, DRUM2_TOP, SHELF2_COL)

# --- drum 3: wall, tone shifts to the cap stone family
ring_3a = ring(Z3, R3, *OFF3)
band(ring_2b, ring_3a, SHELF2_COL, DRUM3_TOP)

# --- collar: the ONE pink accent, high on the object — flares proud of
# drum 3, a solid pink band, then flares back in to the dome base.
# Gradient-blended at both edges so it reads as painted, not glued on.
ring_3b = ring(Z3b, R_COLLAR, *OFF3B)
band(ring_3a, ring_3b, DRUM3_TOP, PINK_COL)

ring_3c = ring(Z3c, R_COLLAR, *OFF3C)
band(ring_3b, ring_3c, PINK_COL, PINK_COL)

ring_4 = ring(Z4, R_DOME_LO, *OFF4)
band(ring_3c, ring_4, PINK_COL, CAP_LO_COL)

# --- dome: rounded two-stage taper (not a single point), brightest zone
ring_5 = ring(Z5, R_DOME_MID, *OFF5)
band(ring_4, ring_5, CAP_LO_COL, CAP_HI_COL)

apex = (STONE_X + OFF6[0], STONE_Y + OFF6[1], Z6)
fan_up(ring_5, apex, CAP_HI_COL)

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
        "Second giants'-road waymark, %d tris (budget %d). Stout stacked "
        "CAIRN (deliberately different from the leaning obelisk sibling "
        "at x~101): three 10-sided rounded-faceted stone drums (R %.1f -> "
        "%.1f -> %.1f m), each on a shelf lip wider than the drum above, "
        "closing in a two-stage rounded dome (not a point), total %.1f m "
        "visible. Darker base zone at drum 1 per brief. ONE pink accent "
        "= a proud painted collar band wrapped between drum 3 and the "
        "dome (HIGHER than the sibling's plinth-level cartouche, near the "
        "top third of the silhouette). Whole stack drifts %.2f m in -y "
        "from base to apex (subtle 'leans/faces toward the road', baked "
        "into the mesh, rotation ships zero) plus small fixed x jitter "
        "per drum for an organic piled-stone read; flat facets phased to "
        "center on -y at every ring. Ground raycast z %.2f (hit=%s), base "
        "sunk 0.3 m. Deterministic, no randomness."
        % (tri_count, BUDGET, R1, R2, R3, Z6 - Z0,
           OFF6[1] - OFF0[1], ground_z, hit)),
}
