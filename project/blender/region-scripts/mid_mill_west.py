# mid_mill_west.py — COMMISSION: flour windmill serving the west hamlet
#
# Per research/18-region-structure-rules.md (THE SCRIPT CONTRACT §8).
# Band: mid_ (lit + fogged — TRUE LOCAL COLOR, no baked haze).
# Zone: x -150..-105, y 45..80 (blender), height cap 32 m. Budget 500 tris.
#
# Design (silhouette first, judged from the post eye at (1.5, 11, 1.6)):
#   - 7-sided tapered tower, 18 m, wall cream (#C8C8B8), base shaded -12%.
#   - Chunky 3-band onion cap in timber (#886060), ~5 m tall, overhangs
#     the tower by 1 m; underside shaded darker, crown lighter.
#   - Fat hub box protruding toward the post eye; FOUR broad paddle
#     blades in an X (45/135/225/315 deg BAKED INTO THE MESH — object
#     rotation ships (0,0,0)). Blade radius 9.3 m, 1.6-2.7 m wide,
#     0.6-0.7 m thick. Toy-thick, never spindly.
#   - Blade TIP TRIM is the one pink accent (#B87890) — separate
#     vertex islands so the block stays sharp on a POINT color attr.
#   - Door-sized dark inset (#605850) at the base on the -y side,
#     facing the hamlet; the 7-gon is phased so a flat facet faces -y.
#   - Grounded by §7 raycast, base sunk 0.3 m.
#
# Deterministic: no randomness used at all. Idempotent: OWNED teardown
# first, raycast AFTER teardown (so a prior mill can't catch the ray).

import bpy
import math
from mathutils import Vector

OWNED = ["mid_mill_west"]
NAME = "mid_mill_west"
PREFIX = "mid_"
BUDGET = 500
ZONE_X = (-150.0, -105.0)
ZONE_Y = (45.0, 80.0)
ZONE_ZMAX = 32.0

MILL_X, MILL_Y = -127.0, 62.0     # site center (blender)
POST_EYE = (1.5, 11.0)            # the camera that judges everything (§6)
SIDES = 7                          # facet count (brief: 6-8)

TOWER_H = 18.0
R_BASE, R_TOP = 4.8, 3.2
SINK = 0.3                         # §7: sink the base 0.3 m

# ---------------------------------------------------------------------------
# §5 palette of record — LINEAR hex written verbatim as floats (int/255).
# NO sRGB conversion (§4). Shading zones stay within ~±10% of the row.
# ---------------------------------------------------------------------------
def hx(h, mul=1.0):
    r = min(1.0, (int(h[0:2], 16) / 255.0) * mul)
    g = min(1.0, (int(h[2:4], 16) / 255.0) * mul)
    b = min(1.0, (int(h[4:6], 16) / 255.0) * mul)
    return (r, g, b, 1.0)

CREAM     = "C8C8B8"   # wall cream (west hamlet family)
TIMBER    = "886060"   # timber brown-red (cap)
TIMBER2   = "806870"   # timber brown-red (blades / hub)
PINK      = "B87890"   # brand pink — the ONE accent (blade tip trim)
DOOR_DARK = "605850"   # road-dirt dark — the door inset

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
    deps, Vector((MILL_X, MILL_Y, 50.0)), Vector((0.0, 0.0, -1.0)))
ground_z = loc.z if hit else 0.0
base_z = ground_z - SINK
z_top = base_z + TOWER_H

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
    """CCW (from +z) SIDES-gon around the mill axis; phased so one flat
    facet's midpoint faces exactly -y (the door facet)."""
    pts = []
    for k in range(SIDES):
        a = -math.pi / 2.0 + (2 * k + 1) * math.pi / SIDES
        pts.append((MILL_X + r * math.cos(a), MILL_Y + r * math.sin(a), z))
    return pts

def band(ring_lo, ring_hi, col_lo, col_hi):
    """Side wall between two CCW rings — outward winding."""
    n = len(ring_lo)
    fs = [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
    emit(ring_lo + ring_hi, fs, [col_lo] * n + [col_hi] * n)

def annulus_down(ring_outer, ring_inner, col):
    """Flat ring facing DOWN (cap underside) — winding checked:
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

# --- facing: blade disc squares up to the post eye (silhouette first, §6)
d = Vector((POST_EYE[0] - MILL_X, POST_EYE[1] - MILL_Y, 0.0)).normalized()
n_dir = d                                    # blade-plane normal (toward eye)
t_dir = Vector((-d.y, d.x, 0.0))             # in-plane horizontal (n x t = +z)
z_dir = Vector((0.0, 0.0, 1.0))

# --- tower: 7-sided tapered frustum, cream, base shaded darker (2 zones)
band(ring(base_z, R_BASE), ring(z_top, R_TOP), hx(CREAM, 0.88), hx(CREAM))

# --- cap: underside overhang annulus + 3-band onion in timber
cap_r = [(4.2, 0.0), (4.35, 1.2), (2.8, 3.2)]          # (radius, dz above z_top)
annulus_down(ring(z_top, cap_r[0][0]), ring(z_top, R_TOP), hx(TIMBER, 0.90))
band(ring(z_top + cap_r[0][1], cap_r[0][0]),
     ring(z_top + cap_r[1][1], cap_r[1][0]), hx(TIMBER), hx(TIMBER))
band(ring(z_top + cap_r[1][1], cap_r[1][0]),
     ring(z_top + cap_r[2][1], cap_r[2][0]), hx(TIMBER), hx(TIMBER, 1.06))
fan_up(ring(z_top + cap_r[2][1], cap_r[2][0]),
       (MILL_X, MILL_Y, z_top + 5.0), hx(TIMBER, 1.06))

# --- hub: fat box punching out of the cap toward the eye
axis = Vector((MILL_X, MILL_Y, 0.0))
z_hub = z_top + 1.6
hub_c = axis + n_dir * 4.6 + Vector((0, 0, z_hub))
tapered_box(hub_c - n_dir * 1.1, hub_c + n_dir * 1.1,
            t_dir * 0.9, t_dir * 0.9, z_dir * 0.9, hx(TIMBER2, 0.90))

# --- blades: four fat paddles in an X, angle BAKED into the mesh.
# Each blade = timber root segment + pink tip-trim segment (separate
# islands -> hard color block). Blade plane sits at n*5.5 so the root
# embeds into the hub (hub front face is at n*5.7): visually attached.
plane_c = axis + n_dir * 5.5 + Vector((0, 0, z_hub))
for a_deg in (45.0, 135.0, 225.0, 315.0):
    a = math.radians(a_deg)
    L = t_dir * math.cos(a) + z_dir * math.sin(a)   # blade length dir
    W = -t_dir * math.sin(a) + z_dir * math.cos(a)  # blade width dir
    # (L, W, n_dir) is right-handed: L x W = n_dir (verified analytically)
    # root segment: r 0.5 -> 6.9, half-width 0.8 -> 1.1, half-thick 0.30
    tapered_box(plane_c + L * 0.5, plane_c + L * 6.9,
                W * 0.8, W * 1.1, n_dir * 0.30, hx(TIMBER2))
    # tip trim: r 6.6 -> 9.3 (overlaps root joint), slightly fatter
    tapered_box(plane_c + L * 6.6, plane_c + L * 9.3,
                W * 1.25, W * 1.35, n_dir * 0.34, hx(PINK))

# --- door: dark inset slab on the -y facet (faces the hamlet).
# Facet apothem at door height ~4.16 m; slab outer face at 4.6 m from
# the axis -> protrudes ~0.45 m, back buried in the wall.
door_c = Vector((MILL_X, MILL_Y - 4.15, base_z + 2.25))
tapered_box(door_c - Vector((1.3, 0, 0)), door_c + Vector((1.3, 0, 0)),
            Vector((0, 0.45, 0)), Vector((0, 0.45, 0)),
            Vector((0, 0, 2.15)), hx(DOOR_DARK))

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
        "Flour windmill, %d tris (budget %d). Tower 18 m cream, 3-band "
        "timber onion cap to %.1f m abs, 4 fat blades r 9.3 m in a baked "
        "X facing the post eye (azimuth %.1f deg); pink accent = blade "
        "tip trim; dark door inset faces -y hamlet. Ground raycast z "
        "%.2f (hit=%s), base sunk 0.3 m. Deterministic, no randomness."
        % (tri_count, BUDGET, z_top + 5.0,
           math.degrees(math.atan2(d.y, d.x)), ground_z, hit)),
}
