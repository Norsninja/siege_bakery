# mid_giant_bench.py — COMMISSION: a giant-sized rest-stop bench, south
# side of the giants' road.
#
# Per research/18-region-structure-rules.md (THE SCRIPT CONTRACT §8).
# Band: mid_ (lit + fogged — TRUE LOCAL COLOR, no baked haze).
# Zone: x 140..170, y 2..19 (blender), height cap 16 m. Budget 350 tris.
#
# Design (silhouette first, judged from the post eye at (1.5, 11, 1.6)):
#   - Thick timber SEAT SLAB, 16 m long x 5 m deep x 0.8 m thick, seat
#     top ~7 m up — a 36 m giant's knee height. Lighter timber (#886060).
#   - TWO chunky trestle-end legs (frustums, splayed feet) supporting the
#     seat, x-tapered from half-width 1.5 m at the ground to 1.1 m at the
#     seat, 4 m deep. Darkest timber (#786878) — "darker legs" per brief.
#   - Broad BACKREST slab, 14 m wide x 5 m tall, RECLINED: its centerline
#     leans toward -y as it rises so it tilts away from a sitter facing
#     +y (the road). Mid timber (#806870).
#   - ONE pink accent: a small square cushion block on the seat top,
#     brand pink (#B87890) — own vertex island, hard-edged block.
#   - Bench "opens" toward +y: the seat's open/front edge (y=CY+2.5) is
#     the side nearer the road (road runs y 26..60, north of this zone);
#     the backrest sits on the south (-y) edge, so a seated giant faces
#     the road.
#   - Grounded by §7 raycast at the site center, base sunk 0.3 m.
#
# Deterministic: no randomness used at all. Idempotent: OWNED teardown
# first, raycast AFTER teardown (so a prior bench can't catch the ray).

import bpy
from mathutils import Vector

OWNED = ["mid_giant_bench"]
NAME = "mid_giant_bench"
PREFIX = "mid_"
BUDGET = 350
ZONE_X = (140.0, 170.0)
ZONE_Y = (2.0, 19.0)
ZONE_ZMAX = 16.0

BENCH_X, BENCH_Y = 155.0, 10.0    # site center (blender), mid-zone
SINK = 0.3                         # §7: sink the base 0.3 m

SEAT_LEN = 16.0                    # x extent (14-18 m spec)
SEAT_HALF_LEN = SEAT_LEN / 2.0
SEAT_HALF_DEPTH = 2.5               # y half-depth (5 m deep)
SEAT_HALF_THICK = 0.4               # z half-thickness (0.8 m thick slab)
SEAT_BOT_DZ = 6.5                   # seat bottom height above ground (6-8 m spec)

LEG_HALF_W_BOT = 1.5                # x half-width at ground (flared foot)
LEG_HALF_W_TOP = 1.1                # x half-width at seat (tapered)
LEG_HALF_DEPTH = 2.0                # y half-depth (4 m deep trestle panel)
LEG_INSET = 6.0                     # legs inset from bench center, x offset

BACK_HALF_W = 7.0                   # x half-width (14 m wide, narrower than seat)
BACK_HALF_THICK = 0.5               # y half-thickness (1 m thick)
BACK_HEIGHT = 5.0                   # z height above seat top
BACK_BOT_Y_OFFSET = -3.0            # bottom-center y offset from BENCH_Y
BACK_TOP_Y_OFFSET = -4.2            # top-center y offset from BENCH_Y (recline)

CUSH_HALF_W = 1.0                   # x half-width (2 m square)
CUSH_HALF_DEPTH = 1.0               # y half-depth (2 m square)
CUSH_HEIGHT = 0.6                   # z height
CUSH_Y_OFFSET = 0.5                 # y offset from BENCH_Y (front-center of seat)

# ---------------------------------------------------------------------------
# §5 palette of record — LINEAR hex written verbatim as floats (int/255).
# NO sRGB conversion (§4).
# ---------------------------------------------------------------------------
def hx(h, mul=1.0):
    r = min(1.0, (int(h[0:2], 16) / 255.0) * mul)
    g = min(1.0, (int(h[2:4], 16) / 255.0) * mul)
    b = min(1.0, (int(h[4:6], 16) / 255.0) * mul)
    return (r, g, b, 1.0)

LEGS_COL = hx("786878")   # timber, darkest — trestle legs
SEAT_COL = hx("886060")   # timber, lighter/warm — seat slab
BACK_COL = hx("806870")   # timber, mid — backrest
PINK_COL = hx("B87890")   # brand pink — the ONE accent (cushion)

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
    deps, Vector((BENCH_X, BENCH_Y, 50.0)), Vector((0.0, 0.0, -1.0)))
ground_z = loc.z if hit else 0.0
base_z = ground_z - SINK

z_leg_top = base_z + SEAT_BOT_DZ           # = seat bottom
z_seat_bot = z_leg_top
z_seat_mid = z_seat_bot + SEAT_HALF_THICK
z_seat_top = z_seat_bot + 2.0 * SEAT_HALF_THICK
z_back_top = z_seat_top + BACK_HEIGHT
z_cush_top = z_seat_top + CUSH_HEIGHT

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

# --- seat slab: u along x (no taper), v = y half-depth, w = z half-thick
tapered_box(
    (BENCH_X - SEAT_HALF_LEN, BENCH_Y, z_seat_mid),
    (BENCH_X + SEAT_HALF_LEN, BENCH_Y, z_seat_mid),
    (0.0, SEAT_HALF_DEPTH, 0.0), (0.0, SEAT_HALF_DEPTH, 0.0),
    (0.0, 0.0, SEAT_HALF_THICK), SEAT_COL)

# --- two trestle legs: u vertical (ground -> seat), v = x half-width
#     (tapers wide-at-foot -> narrow-at-seat), w = y half-depth (fixed)
for leg_x in (BENCH_X - LEG_INSET, BENCH_X + LEG_INSET):
    tapered_box(
        (leg_x, BENCH_Y, base_z), (leg_x, BENCH_Y, z_leg_top),
        (LEG_HALF_W_BOT, 0.0, 0.0), (LEG_HALF_W_TOP, 0.0, 0.0),
        (0.0, LEG_HALF_DEPTH, 0.0), LEGS_COL)

# --- backrest: u runs bottom-center -> top-center, WITH a -y shift baked
#     into the endpoints themselves so the slab reclines away from a
#     sitter facing +y; v = x half-width (no taper); w = y half-thickness
tapered_box(
    (BENCH_X, BENCH_Y + BACK_BOT_Y_OFFSET, z_seat_top),
    (BENCH_X, BENCH_Y + BACK_TOP_Y_OFFSET, z_back_top),
    (BACK_HALF_W, 0.0, 0.0), (BACK_HALF_W, 0.0, 0.0),
    (0.0, BACK_HALF_THICK, 0.0), BACK_COL)

# --- pink cushion accent: small square block resting on the seat top,
#     front-center (toward the open +y side)
tapered_box(
    (BENCH_X, BENCH_Y + CUSH_Y_OFFSET, z_seat_top),
    (BENCH_X, BENCH_Y + CUSH_Y_OFFSET, z_cush_top),
    (CUSH_HALF_W, 0.0, 0.0), (CUSH_HALF_W, 0.0, 0.0),
    (0.0, CUSH_HALF_DEPTH, 0.0), PINK_COL)

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
        "Giant rest-stop bench, %d tris (budget %d). Seat slab 16x5x0.8 m "
        "at ~%.1f m up (timber #886060); two x-tapered trestle legs, "
        "flared feet (timber #786878); backrest 14x5 m reclining toward "
        "-y (timber #806870); pink cushion accent (#B87890) front-center "
        "on the seat. Seat opens +y toward the giants' road. Ground "
        "raycast z %.2f (hit=%s), base sunk 0.3 m. Deterministic, no "
        "randomness."
        % (tri_count, BUDGET, z_seat_top - base_z, ground_z, hit)),
}
