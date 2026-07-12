# mid_granary_road.py — COMMISSION: grain granary, outbuilding north of
# the road hamlet (mid_town_road, x 118..188 y 81..130, h 23.5, wall-stone
# + pink roofs).
#
# Per research/18-region-structure-rules.md (THE SCRIPT CONTRACT §8).
# Band: mid_ (lit + fogged — TRUE LOCAL COLOR, no baked haze).
# Zone: x 128..168, y 132..155 (blender), height cap 26 m. Budget 400 tris.
#
# Design (silhouette first, judged from the post eye at (1.5, 11, 1.6)):
#   - 8-sided fat silo, R 4.6->4.3 m, TOWER_H 13 m: dark base ring
#     (wall stone #B0B8C0 x0.85, 2.2 m) + light body (#B8C0C0). Ring
#     phased so a flat facet faces -y (south, toward the hamlet) — the
#     lean-to attaches flush to it.
#   - Broad conical roof (eave + lip + slope + tip, 7 m tall) in the
#     ONE pink accent (#B87890 family): darker underside, mid slope,
#     lighter tip — mirrors the hamlet rooflines so the granary reads
#     as kin.
#   - One small attached lean-to/barn block on the south facet: timber
#     walls (#886060), timber roof slab (#786878, a shed pitch rising
#     north into the silo wall), dark door inset (#605850).
#   - A small dark loading hatch (#605850) on the silo body above the
#     barn roofline — reads as a grain chute into the barn below.
#   - Grounded by §7 raycast (single site raycast, reused for both
#     silo and barn — they sit within a few meters of each other on
#     the gently rolling skirt), base sunk 0.3 m.
#
# Deterministic: no randomness used at all. Idempotent: OWNED teardown
# first, raycast AFTER teardown (so a prior granary can't catch the ray).
#
# WINDING NOTE (learned the hard way on the trial commission): for
# tapered_box, the outward-CCW winding on every face requires
# u x v (u = p1-p0) to point in the SAME direction as w. Verified by
# hand for every tapered_box call below (see inline comments) — the
# barn roof slab in particular needed w flipped negative because its
# u tilts up-and-north while v stays +x.

import bpy
import math
from mathutils import Vector

OWNED = ["mid_granary_road"]
NAME = "mid_granary_road"
PREFIX = "mid_"
BUDGET = 400
ZONE_X = (128.0, 168.0)
ZONE_Y = (132.0, 155.0)
ZONE_ZMAX = 26.0

GX, GY = 148.0, 145.0             # silo site center (blender)
SIDES = 8                          # octagon facet count
SINK = 0.3                         # §7: sink the base 0.3 m

R_BASE, R_TOP = 4.6, 4.3           # silo body radii (slight taper)
BASE_BAND_H = 2.2                  # dark base-zone height
TOWER_H = 13.0                     # base_z -> z_top

EAVE_R = 5.3                       # roof eave overhang radius
LIP_R, LIP_DZ = 4.5, 1.0
MID_R, MID_DZ = 2.0, 4.5
APEX_DZ = 7.0                      # roof apex above z_top

BX, BY = GX, 139.05                # barn (lean-to) center
BARN_HALF_W, BARN_HALF_D = 2.5, 2.0
BARN_WALL_H = 4.0

# ---------------------------------------------------------------------------
# §5 palette of record — LINEAR hex written verbatim as floats (int/255).
# NO sRGB conversion (§4). Shading zones stay within ~±10% of the row.
# ---------------------------------------------------------------------------
def hx(h, mul=1.0):
    r = min(1.0, (int(h[0:2], 16) / 255.0) * mul)
    g = min(1.0, (int(h[2:4], 16) / 255.0) * mul)
    b = min(1.0, (int(h[4:6], 16) / 255.0) * mul)
    return (r, g, b, 1.0)

STONE_BASE = hx("B0B8C0", 0.85)    # darker base zone
STONE_MAIN = hx("B8C0C0")          # main silo body
PINK_DARK  = hx("B87890", 0.82)    # roof eave underside
PINK_MAIN  = hx("B87890")          # roof lip / slope — the ONE accent
PINK_TIP   = hx("B87890", 1.10)    # roof apex, lighter
TIMBER     = hx("886060")          # barn walls
TIMBER_ROOF = hx("786878")         # barn roof slab (timber family)
DOOR_DARK  = hx("605850")          # door / hatch insets

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
z_top = base_z + TOWER_H
apex_z = z_top + APEX_DZ

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
    """CCW (from +z) SIDES-gon around the silo axis; phased so one flat
    facet's midpoint faces exactly -y (the barn attaches here)."""
    pts = []
    for k in range(SIDES):
        a = -math.pi / 2.0 + (2 * k + 1) * math.pi / SIDES
        pts.append((GX + r * math.cos(a), GY + r * math.sin(a), z))
    return pts

def band(ring_lo, ring_hi, col_lo, col_hi):
    """Side wall between two CCW rings — outward winding."""
    n = len(ring_lo)
    fs = [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
    emit(ring_lo + ring_hi, fs, [col_lo] * n + [col_hi] * n)

def annulus_down(ring_outer, ring_inner, col):
    """Flat ring facing DOWN (eave underside) — winding checked:
    (-r_hat) x (theta_hat) = -z."""
    n = len(ring_outer)
    fs = [(k, n + k, n + (k + 1) % n, (k + 1) % n) for k in range(n)]
    emit(ring_outer + ring_inner, fs, col)

def fan_up(ring_pts, apex, col):
    """Cone tip from CCW ring to apex above — outward winding."""
    n = len(ring_pts)
    fs = [(k, (k + 1) % n, n) for k in range(n)]
    emit(ring_pts + [apex], fs, col)

def tapered_box(p0, p1, v0, v1, w, col):
    """Box from end p0 (half-width vector v0) to end p1 (half-width v1),
    half-thickness vector w. Outward-CCW winding requires
    (p1-p0) x v to point the SAME direction as w — verified per call."""
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

# --- silo: dark base ring + tapered light body ---
band(ring(base_z, R_BASE), ring(base_z + BASE_BAND_H, R_BASE),
     STONE_BASE, STONE_BASE)
band(ring(base_z + BASE_BAND_H, R_BASE), ring(z_top, R_TOP),
     STONE_MAIN, STONE_MAIN)

# --- roof: eave underside + lip + slope + tip (mirrors hamlet rooflines) ---
annulus_down(ring(z_top, EAVE_R), ring(z_top, R_TOP), PINK_DARK)
band(ring(z_top, EAVE_R), ring(z_top + LIP_DZ, LIP_R), PINK_MAIN, PINK_MAIN)
band(ring(z_top + LIP_DZ, LIP_R), ring(z_top + MID_DZ, MID_R),
     PINK_MAIN, PINK_TIP)
fan_up(ring(z_top + MID_DZ, MID_R), (GX, GY, apex_z), PINK_TIP)

# --- barn (lean-to): upright box, u vertical.
# u=(0,0,4) +z, v=(2.5,0,0) +x -> u x v = (0,10,0) = +y = w's sign. OK.
tapered_box((BX, BY, base_z), (BX, BY, base_z + BARN_WALL_H),
            (BARN_HALF_W, 0.0, 0.0), (BARN_HALF_W, 0.0, 0.0),
            (0.0, BARN_HALF_D, 0.0), TIMBER)

# --- barn roof: shed slab, low south eave -> high north ridge (into silo).
# u=(0,4.6,2.3) mostly +y w/ +z lean, v=(2.8,0,0) +x
# -> u x v = (0, 2.8*2.3, -2.8*4.6) = (0, +, -)  => z-component negative,
# so w must also point -z (thickness hangs BELOW the p0/p1 top surface).
roof_p0 = (BX, BY - BARN_HALF_D - 0.3, base_z + BARN_WALL_H - 0.1)
roof_p1 = (BX, BY + BARN_HALF_D + 0.3, base_z + BARN_WALL_H + 2.2)
tapered_box(roof_p0, roof_p1, (BARN_HALF_W + 0.3, 0.0, 0.0),
            (BARN_HALF_W + 0.3, 0.0, 0.0), (0.0, 0.0, -0.22), TIMBER_ROOF)

# --- barn door: dark inset on the south (front) wall.
# u=(1.8,0,0) +x, v=(0,0.25,0) +y -> u x v = (0,0,0.45) = +z = w's sign. OK.
door_c = Vector((BX, BY - BARN_HALF_D - 0.05, base_z + 1.2))
tapered_box(door_c - Vector((0.9, 0.0, 0.0)), door_c + Vector((0.9, 0.0, 0.0)),
            Vector((0.0, 0.25, 0.0)), Vector((0.0, 0.25, 0.0)),
            Vector((0.0, 0.0, 1.0)), DOOR_DARK)

# --- silo loading hatch: dark inset on the south facet, above the barn
# roof ridge (clears it by >1 m). Same u/v/w pattern as the door -> OK.
hatch_frac = (7.2 - BASE_BAND_H) / (TOWER_H - BASE_BAND_H)
hatch_r = R_BASE + (R_TOP - R_BASE) * hatch_frac
hatch_apothem = hatch_r * math.cos(math.pi / SIDES)
hatch_c = Vector((GX, GY - hatch_apothem - 0.05, base_z + 7.2))
tapered_box(hatch_c - Vector((0.6, 0.0, 0.0)), hatch_c + Vector((0.6, 0.0, 0.0)),
            Vector((0.0, 0.15, 0.0)), Vector((0.0, 0.15, 0.0)),
            Vector((0.0, 0.0, 0.6)), DOOR_DARK)

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
        "Grain granary, %d tris (budget %d). 8-sided silo R %.1f->%.1f m, "
        "dark base ring (%.1f m) + light body to z_top %.1f m abs; broad "
        "pink cone roof to apex %.1f m abs (overall %.1f m tall). Timber "
        "lean-to barn on the south facet (%.1fx%.1f m, wall %.1f m) with "
        "a shed roof rising into the silo wall, dark door inset; a dark "
        "loading hatch sits on the silo body above the barn ridge. Pink "
        "accent = roof only. Ground raycast z %.2f (hit=%s), base sunk "
        "0.3 m. Deterministic, no randomness."
        % (tri_count, BUDGET, R_BASE, R_TOP, BASE_BAND_H, z_top, apex_z,
           apex_z - base_z, BARN_HALF_W * 2, BARN_HALF_D * 2, BARN_WALL_H,
           ground_z, hit)),
}
