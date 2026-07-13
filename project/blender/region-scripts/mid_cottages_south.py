# mid_cottages_south.py — COMMISSION: three dwarf cottages expanding the
# south hamlet eastward (mid_town_south core sits x 30..91, y 146..193,
# buildings to 23.5 m — these match that theatrical scale at smaller
# footprints: 10-16 m tall, oversized roofs, fat chimneys).
#
# Per research/18-region-structure-rules.md (THE SCRIPT CONTRACT §8).
# Band: mid_ (lit + fogged — TRUE LOCAL COLOR, no baked haze).
# Zone: x 118..140, y 150..185 (blender), height cap 20 m. Budget 320 tris.
#
# Design (silhouette first, judged from the post eye at (1.5, 11, 1.6),
# ~200 m away — chunky outlines and color zones read before detail does):
#   - A lived-in CLUSTER, not a row: three cottages, each a different
#     footprint, height and rotation (rotation is BAKED into the mesh
#     vertices, never into the object transform — §7 requires clean
#     (0,0,0) rotation on the shipped object).
#       cottage_a: smallest, ridge 10.0 m, square gable-end chimney.
#       cottage_b: the hero — biggest footprint, ridge 13.0 m, a fat
#         ROUND chimney proud of a long wall, topped by THE ONE PINK
#         ACCENT (a cone cap, brand pink #B87890).
#       cottage_c: tall and narrow, ridge 15.0 m, square gable-end
#         chimney disproportionately fat for its footprint.
#     All three: wall stone #B8C0C0, slate roofs #788898/#808898 two-
#     tone per slope, timber brown-red #886060/#806870 doors, chimney
#     body reuses the wall-stone family #B0B8C0 with a soot-dark cap
#     #605850 (the road-dirt-dark family, precedent: mid_bakehouse_west's
#     chimney). Windows are small proud timber-framed boxes for a
#     lived-in read at closer range.
#   - Each cottage is a single WATERTIGHT prism (house: 2 walls + 2 roof
#     slopes + 2 gable-end pentagons + 1 hidden floor cap; plinth,
#     chimney, door, window: all separately closed 6-face boxes/rings).
#     Closing every solid (floor caps, chimney bottoms, cone-capped
#     chimney tops) costs a handful of cheap invisible-underground tris
#     but makes the winding audit below meaningful instead of ambiguous
#     on open shells (see EXTRA CHECK note).
#   - Grounded by §7 raycast at EACH cottage's own site (the meadow
#     rolls here), cached before any geometry exists (mid_pines_south's
#     proven pattern), base sunk 0.3 m each.
#
# WINDING — outward normals are derived ANALYTICALLY, not eyeballed:
#   House prism: extruded from a 5-point (v, z) profile [wall-, roof-,
#   roof+, wall+, floor] along the LOCAL u-axis (the cottage's rotated
#   ridge direction). For consecutive profile points p_i -> p_{i+1}, the
#   side quad ((u_lo,p_i), (u_hi,p_i), (u_hi,p_{i+1}), (u_lo,p_{i+1)))
#   has normal (B-A) x (D-A) = k*(0, -dz, dv) in the LOCAL (u,v,z) frame
#   (k = u_hi-u_lo > 0) — verified against every edge of the profile
#   (wall- gives -v, roof- gives -v/+z, roof+ gives +v/+z, wall+ gives
#   +v, floor gives -z: all correctly outward). The gable-end cap at
#   u_lo uses the profile in listed order (outward -u, the bakehouse's
#   proven west-gable pattern); the cap at u_hi uses [p0] + reversed(
#   rest) (outward +u, the bakehouse's proven east-gable pattern,
#   generalized to n points). Because to_world() is a pure rotation
#   (determinant +1, z untouched), every one of these LOCAL-frame
#   normal facts carries over unchanged to world space — baking the
#   per-cottage rotation into vertex coordinates never flips a winding.
#   Boxes (plinth/chimney/door/window) reuse this same rule in a
#   (u, v, z)-aligned axis frame (vbox: south/north/east/west copied
#   verbatim from mid_bakehouse_west.py's hand-verified plinth, top/
#   bottom derived by the same cross-product method; tapered_box
#   copied verbatim from mid_bakehouse_west.py / mid_watchtower_west.py
#   with v0/v1 always along +v_hat, per the watchtower's discovered
#   right-handedness law: u_hat x v_hat = +z always holds for THIS
#   basis regardless of which wall a door sits on, so v0/v1 never need
#   sign-flipping per wall — the watchtower's left-handed-triple bug
#   cannot recur here structurally). Round chimney ring()/band()/
#   cap_down()/fan_up() copied verbatim from mid_watchtower_west.py's
#   proven CCW-from-+z ring convention (cap_down = reversed ring order,
#   the same reversal trick as the gable end caps).
#
# EXTRA CHECK (beyond §8, per commission): checks["winding"] is a
# PROGRAMMATIC outward-normal audit — a BVH ray-parity sample across
# every face (research/18's "LAW FOR REVIEWERS": Blender's render is
# not a winding oracle; three.js backface-culls). For each face we
# probe centroid +/- eps*normal and count ray crossings (BVHTree built
# from THIS object's own triangulated faces only) along a fixed oblique
# sample direction; a correctly-outward face reads EVEN crossings just
# outside itself and ODD just inside. Doors/windows are proud, closed
# boxes EMBEDDED in the wall/roof (an "embedded-joint" case, per
# research/18's ledger) — their buried rear faces are expected to
# report the opposite parity of a free-standing face (the probe just
# outside that rear face is actually inside the wall it's embedded in,
# not open air); this is a known, harmless artifact of overlapping
# closed solids, not a wound-backwards face, and is called out by name
# in "notes" below rather than silently swept into the pass/fail count.
#
# Deterministic: no randomness used at all. Idempotent: OWNED teardown
# first, every raycast after teardown (a prior cluster can't self-hit).

import bpy
import math
from mathutils import Vector
from mathutils.bvhtree import BVHTree

OWNED = ["mid_cottages_south"]
NAME = "mid_cottages_south"
PREFIX = "mid_"
BUDGET = 320
ZONE_X = (118.0, 140.0)
ZONE_Y = (150.0, 185.0)
ZONE_ZMAX = 20.0
SINK = 0.3                        # §7: sink the base 0.3 m

# ---------------------------------------------------------------------------
# §5 palette of record — LINEAR hex written verbatim as floats (int/255).
# NO sRGB conversion (§4).
# ---------------------------------------------------------------------------
def hx(h, mul=1.0):
    r = min(1.0, (int(h[0:2], 16) / 255.0) * mul)
    g = min(1.0, (int(h[2:4], 16) / 255.0) * mul)
    b = min(1.0, (int(h[4:6], 16) / 255.0) * mul)
    return (r, g, b, 1.0)

WALL_STONE      = hx("B8C0C0")          # south-hamlet wall stone (brief)
WALL_STONE_DARK = hx("B8C0C0", 0.85)    # plinth / floor cap (grounding zone)
ROOF_A          = hx("788898")          # slate, one slope
ROOF_B          = hx("808898")          # slate, other slope
TIMBER_A        = hx("886060")          # door/window, timber brown-red
TIMBER_B        = hx("806870")          # door/window, timber brown-red alt
CHIM_MAIN       = hx("B0B8C0")          # chimney body, wall-stone family
CHIM_SOOT       = hx("605850")          # chimney cap — road-dirt-dark family
                                         # reused, precedent: mid_bakehouse_west
PINK_CAP        = hx("B87890")          # THE ONE pink accent (cottage_b only)

# ---------------------------------------------------------------------------
# Cottage siting — varied footprints, heights and orientations (a cluster,
# not a row). Rotation is baked into vertices via make_frame(); the object
# ships with rotation_euler = (0,0,0) regardless (§7).
# ---------------------------------------------------------------------------
COTTAGE_A = dict(
    name="cottage_a", cx=123.0, cy=158.0, angle=20.0,
    half_u=3.0, half_v=2.2, wall_h=4.5, roof_rise=5.5,   # ridge 10.0 m
    plinth_pad=0.3, plinth_h=0.8,
    chim_kind="square", chim_u=2.4, chim_v=0.0, chim_half=0.9, chim_h=11.5,
    door_wall="v_hi", door_u=-1.0, door_hw=0.9, door_hh=1.3, door_th=0.25,
    win_wall="v_hi", win_u=1.3, win_hw=0.5, win_hh=0.5, win_z=2.6, win_th=0.15,
    door_col=TIMBER_A, win_col=TIMBER_B, pink=False,
)
COTTAGE_B = dict(
    name="cottage_b", cx=131.0, cy=168.0, angle=-35.0,
    half_u=4.0, half_v=3.0, wall_h=6.0, roof_rise=7.0,   # ridge 13.0 m
    plinth_pad=0.35, plinth_h=1.0,
    chim_kind="round", chim_u=1.5, chim_v=2.4, chim_r=1.3, chim_h=15.0,
    chim_pink_apex=1.5,
    door_wall="v_lo", door_u=-2.0, door_hw=1.1, door_hh=1.6, door_th=0.3,
    win_wall="v_lo", win_u=1.8, win_hw=0.6, win_hh=0.6, win_z=3.2, win_th=0.2,
    door_col=TIMBER_B, win_col=TIMBER_A, pink=True,
)
COTTAGE_C = dict(
    name="cottage_c", cx=124.0, cy=178.0, angle=70.0,
    half_u=2.2, half_v=2.0, wall_h=6.5, roof_rise=8.5,   # ridge 15.0 m
    plinth_pad=0.3, plinth_h=0.8,
    chim_kind="square", chim_u=-1.7, chim_v=0.0, chim_half=0.7, chim_h=17.0,
    door_wall="v_hi", door_u=0.0, door_hw=0.8, door_hh=1.4, door_th=0.25,
    win_wall="v_hi", win_u=1.2, win_hw=0.45, win_hh=0.45, win_z=3.0, win_th=0.15,
    door_col=TIMBER_A, win_col=TIMBER_B, pink=False,
)
COTTAGES = [COTTAGE_A, COTTAGE_B, COTTAGE_C]

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
# 2. Ground each cottage by its OWN raycast (§7) — AFTER teardown, ONCE,
#    before any new geometry exists (mid_pines_south's proven pattern),
#    cached for both building AND the grounded check.
# ---------------------------------------------------------------------------
deps = bpy.context.evaluated_depsgraph_get()
ground_cache = []   # ground_z per cottage, index-aligned with COTTAGES
for spec in COTTAGES:
    hit, loc, *_ = bpy.context.scene.ray_cast(
        deps, Vector((spec["cx"], spec["cy"], 50.0)), Vector((0.0, 0.0, -1.0)))
    ground_cache.append((loc.z if hit else 0.0, hit))

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

def make_frame(cx, cy, angle_deg):
    """Bakes rotation into vertex coordinates (never into obj transform,
    §7). Returns to_world(u, v, z) -> (x, y, z) plus the world-space
    u_hat/v_hat basis vectors (u_hat x v_hat = +z always — the law that
    makes tapered_box's v0/v1 sign wall-independent, see header)."""
    a = math.radians(angle_deg)
    cosA, sinA = math.cos(a), math.sin(a)
    def to_world(u, v, z):
        return (cx + u * cosA - v * sinA, cy + u * sinA + v * cosA, z)
    u_hat = Vector((cosA, sinA, 0.0))
    v_hat = Vector((-sinA, cosA, 0.0))
    return to_world, u_hat, v_hat

def build_house(to_world, half_u, half_v, base_z, wall_top, ridge_z,
                col_wall, col_roof_lo, col_roof_hi, col_floor):
    """Watertight gable-house prism: extrude a 5-point (v, z) profile
    [wall-, roof-, roof+, wall+, floor] along local u. See header for the
    analytic winding derivation."""
    profile = [(-half_v, base_z), (-half_v, wall_top), (0.0, ridge_z),
               (half_v, wall_top), (half_v, base_z)]
    side_cols = [col_wall, col_roof_lo, col_roof_hi, col_wall, col_floor]
    n = len(profile)
    u_lo, u_hi = -half_u, half_u
    for i in range(n):
        pi = profile[i]
        pj = profile[(i + 1) % n]
        A_ = to_world(u_lo, pi[0], pi[1])
        B_ = to_world(u_hi, pi[0], pi[1])
        C_ = to_world(u_hi, pj[0], pj[1])
        D_ = to_world(u_lo, pj[0], pj[1])
        quad(A_, B_, C_, D_, side_cols[i])
    near_pts = [to_world(u_lo, p[0], p[1]) for p in profile]
    emit(near_pts, [tuple(range(n))], col_wall)                 # outward -u
    far_profile = [profile[0]] + list(reversed(profile[1:]))
    far_pts = [to_world(u_hi, p[0], p[1]) for p in far_profile]
    emit(far_pts, [tuple(range(n))], col_wall)                  # outward +u

def vbox(to_world, u_lo, u_hi, v_lo, v_hi, z_lo, z_hi,
         col_side, col_top, col_bottom):
    """Watertight axis-aligned (in local u,v,z) box — south/north/east/
    west copied verbatim from mid_bakehouse_west.py's hand-verified
    plinth; top/bottom derived by the same cross-product method (see
    header)."""
    quad(to_world(u_lo, v_lo, z_lo), to_world(u_hi, v_lo, z_lo),
         to_world(u_hi, v_lo, z_hi), to_world(u_lo, v_lo, z_hi), col_side)   # south
    quad(to_world(u_lo, v_hi, z_lo), to_world(u_lo, v_hi, z_hi),
         to_world(u_hi, v_hi, z_hi), to_world(u_hi, v_hi, z_lo), col_side)   # north
    quad(to_world(u_hi, v_lo, z_lo), to_world(u_hi, v_hi, z_lo),
         to_world(u_hi, v_hi, z_hi), to_world(u_hi, v_lo, z_hi), col_side)   # east
    quad(to_world(u_lo, v_lo, z_lo), to_world(u_lo, v_lo, z_hi),
         to_world(u_lo, v_hi, z_hi), to_world(u_lo, v_hi, z_lo), col_side)   # west
    quad(to_world(u_lo, v_lo, z_hi), to_world(u_hi, v_lo, z_hi),
         to_world(u_hi, v_hi, z_hi), to_world(u_lo, v_hi, z_hi), col_top)    # top +z
    quad(to_world(u_lo, v_lo, z_lo), to_world(u_lo, v_hi, z_lo),
         to_world(u_hi, v_hi, z_lo), to_world(u_hi, v_lo, z_lo), col_bottom) # bottom -z

def tapered_box(p0, p1, v0, v1, w, col):
    """Copied verbatim from mid_bakehouse_west.py / mid_watchtower_west.py
    (proven). v0/v1 direction: always +v_hat of the owning frame — see
    header, this is wall-independent by construction."""
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

def ring(cx, cy, z, r, sides=8, phase=0.0):
    """CCW (viewed from +z) sided-gon — copied from mid_watchtower_west.py."""
    pts = []
    for k in range(sides):
        a = phase + (2 * k + 1) * math.pi / sides
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a), z))
    return pts

def band(ring_lo, ring_hi, col_lo, col_hi):
    """Side wall between two CCW rings — outward winding."""
    n = len(ring_lo)
    fs = [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
    emit(ring_lo + ring_hi, fs, [col_lo] * n + [col_hi] * n)

def cap_down(ring_pts, col):
    """Flat cap facing -z — reversed ring order (same reversal trick as
    the house's far gable cap)."""
    n = len(ring_pts)
    emit(list(reversed(ring_pts)), [tuple(range(n))], col)

def fan_up(ring_pts, apex, col):
    """Cone tip from CCW ring to apex above — outward winding, copied
    from mid_watchtower_west.py."""
    n = len(ring_pts)
    fs = [(k, (k + 1) % n, n) for k in range(n)]
    emit(ring_pts + [apex], fs, col)

# --- per-cottage build ------------------------------------------------------
# part_log tracks (part_name, vert_start, vert_end, face_start, face_end) for
# EVERY separately-closed sub-solid (house/plinth/chimney/door/window per
# cottage). The winding audit below tests each part against ONLY ITS OWN
# geometry — see header: a global mixed-mesh parity test is contaminated by
# legitimate overlaps (a chimney is mostly EMBEDDED inside the house solid,
# a door/window box straddles the wall), so isolating parts is what makes
# the audit distinguish true inversions from embedded-joint artifacts.
cottage_ranges = []   # (name, start_idx, end_idx, target_base_z) for grounded check
part_log = []
notes_parts = []

def track(part_name):
    """Call BEFORE a part's build calls; returns a closure to call AFTER,
    which appends (part_name, v0, v1, f0, f1) to part_log."""
    v0, f0 = len(V), len(F)
    def finish():
        part_log.append((part_name, v0, len(V), f0, len(F)))
    return finish

for i, spec in enumerate(COTTAGES):
    ground_z, hit = ground_cache[i]
    base_z = ground_z - SINK
    wall_top = base_z + spec["wall_h"]
    ridge_z = wall_top + spec["roof_rise"]

    to_world, u_hat, v_hat = make_frame(spec["cx"], spec["cy"], spec["angle"])
    start_idx = len(V)

    # house prism (watertight: 2 walls + 2 roof slopes + 2 gable ends + floor)
    _fin = track(spec["name"] + "/house")
    build_house(to_world, spec["half_u"], spec["half_v"], base_z, wall_top,
                ridge_z, WALL_STONE, ROOF_A, ROOF_B, WALL_STONE_DARK)
    _fin()

    # plinth (watertight closed box, footprint padded)
    pp = spec["plinth_pad"]
    _fin = track(spec["name"] + "/plinth")
    vbox(to_world, -spec["half_u"] - pp, spec["half_u"] + pp,
         -spec["half_v"] - pp, spec["half_v"] + pp,
         base_z, base_z + spec["plinth_h"],
         WALL_STONE_DARK, WALL_STONE_DARK, WALL_STONE_DARK)
    _fin()

    # chimney: fat, watertight, one pink cone cap on cottage_b only
    _fin = track(spec["name"] + "/chimney")
    if spec["chim_kind"] == "square":
        cu, cv, ch = spec["chim_u"], spec["chim_v"], spec["chim_half"]
        vbox(to_world, cu - ch, cu + ch, cv - ch, cv + ch,
             base_z, base_z + spec["chim_h"], CHIM_MAIN, CHIM_SOOT, CHIM_MAIN)
    else:  # round, embedded proud of a long wall
        chim_cx, chim_cy, _ = to_world(spec["chim_u"], spec["chim_v"], 0.0)
        r = spec["chim_r"]
        r_lo = ring(chim_cx, chim_cy, base_z, r)
        r_hi = ring(chim_cx, chim_cy, base_z + spec["chim_h"], r)
        band(r_lo, r_hi, CHIM_MAIN, CHIM_MAIN)
        cap_down(r_lo, CHIM_MAIN)
        if spec.get("pink"):
            apex = (chim_cx, chim_cy, base_z + spec["chim_h"] + spec["chim_pink_apex"])
            fan_up(r_hi, apex, PINK_CAP)
        else:
            emit(r_hi, [tuple(range(len(r_hi)))], CHIM_MAIN)   # flat top cap
    _fin()

    # door: proud closed box straddling the named wall
    wall_v = spec["half_v"] if spec["door_wall"] == "v_hi" else -spec["half_v"]
    d_center = Vector(to_world(spec["door_u"], wall_v + 0.15 * (1 if spec["door_wall"] == "v_hi" else -1),
                                base_z + spec["door_hh"]))
    dp0 = d_center - u_hat * spec["door_hw"]
    dp1 = d_center + u_hat * spec["door_hw"]
    dv = v_hat * spec["door_th"]
    dw = Vector((0.0, 0.0, spec["door_hh"]))
    _fin = track(spec["name"] + "/door")
    tapered_box(dp0, dp1, dv, dv, dw, spec["door_col"])
    _fin()

    # window: smaller proud closed box, same wall, offset along u
    wwall_v = spec["half_v"] if spec["win_wall"] == "v_hi" else -spec["half_v"]
    w_center = Vector(to_world(spec["win_u"], wwall_v + 0.10 * (1 if spec["win_wall"] == "v_hi" else -1),
                                base_z + spec["win_z"]))
    wp0 = w_center - u_hat * spec["win_hw"]
    wp1 = w_center + u_hat * spec["win_hw"]
    wv = v_hat * spec["win_th"]
    ww = Vector((0.0, 0.0, spec["win_hh"]))
    _fin = track(spec["name"] + "/window")
    tapered_box(wp0, wp1, wv, wv, ww, spec["win_col"])
    _fin()

    end_idx = len(V)
    cottage_ranges.append((spec["name"], start_idx, end_idx, base_z, ground_z, hit))
    notes_parts.append(
        "%s: ridge %.1f m abs (wall %.1f + roof %.1f), footprint %.1fx%.1f m, "
        "rotated %.0f deg, %s chimney to %.1f m%s, ground raycast z %.2f (hit=%s)"
        % (spec["name"], ridge_z - base_z, spec["wall_h"], spec["roof_rise"],
           spec["half_u"] * 2, spec["half_v"] * 2, spec["angle"], spec["chim_kind"],
           spec["chim_h"], " + pink cone cap" if spec.get("pink") else "",
           ground_z, hit))

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

# grounded: EACH cottage's own base within 0.5 m of ITS OWN cached raycast
# ground - 0.3 (checked against the actual built geometry's vertex slice).
grounded_fail = []
for (nm, start_idx, end_idx, target_base, gz, hit) in cottage_ranges:
    slice_min_z = min(v[2] for v in V[start_idx:end_idx])
    if abs(slice_min_z - target_base) > 0.5:
        grounded_fail.append(
            "%s: base z %.2f vs target %.2f" % (nm, slice_min_z, target_base))
checks["grounded"] = True if not grounded_fail else "; ".join(grounded_fail)

rot_ok = all(abs(r) < 1e-6 for r in obj.rotation_euler)
scl_ok = all(abs(s - 1.0) < 1e-6 for s in obj.scale)
checks["transforms_clean"] = (
    True if (rot_ok and scl_ok)
    else "rot %s scale %s" % (tuple(obj.rotation_euler), tuple(obj.scale)))

checks["no_modifiers"] = (
    True if len(obj.modifiers) == 0
    else "%d modifiers" % len(obj.modifiers))

# ---------------------------------------------------------------------------
# EXTRA CHECK: winding — BVH ray-parity sample across every face, tested
# PER PART (see header). A single global BVH mixing every sub-solid would
# be contaminated by legitimate overlaps (the chimney is mostly EMBEDDED
# inside the house's solid interior; doors/windows straddle the wall) —
# naive even/odd parity against a mixed soup misreads "inside exactly two
# overlapping solids" as "outside," and vice versa. Isolating each closed
# part (house/plinth/chimney/door/window) to its OWN BVH makes the test
# ask the right question per face: "does this face's winding correctly
# point out of THE SOLID IT BELONGS TO," independent of what it happens
# to be embedded in.
# ---------------------------------------------------------------------------
SAMPLE_DIR = Vector((0.5234, 0.6714, 0.5261)).normalized()
PROBE_EPS = 0.02

def crossings(bvh, origin, direction, budget):
    o = origin.copy()
    remaining = budget
    n = 0
    for _ in range(64):
        loc, nrm, idx, dist = bvh.ray_cast(o, direction, remaining)
        if loc is None:
            break
        n += 1
        step = dist + 1e-4
        o = o + direction * step
        remaining -= step
        if remaining <= 1e-5:
            break
    return n

def face_normal(pts):
    """Newell's method — robust normal for a planar n-gon from its
    vertex loop, matching the winding order used to build it."""
    nrm = Vector((0.0, 0.0, 0.0))
    n = len(pts)
    for k in range(n):
        a, b = pts[k], pts[(k + 1) % n]
        nrm.x += (a.y - b.y) * (a.z + b.z)
        nrm.y += (a.z - b.z) * (a.x + b.x)
        nrm.z += (a.x - b.x) * (a.y + b.y)
    return nrm

winding_bad = []
faces_checked = 0
for (part_name, v0, v1, f0, f1) in part_log:
    local_verts = V[v0:v1]
    if not local_verts or f1 <= f0:
        continue
    local_faces = [[idx - v0 for idx in F[fi]] for fi in range(f0, f1)]
    tris = []
    for lf in local_faces:
        for k in range(1, len(lf) - 1):
            tris.append([lf[0], lf[k], lf[k + 1]])
    part_bvh = BVHTree.FromPolygons(local_verts, tris, all_triangles=True, epsilon=1e-6)
    xs = [v[0] for v in local_verts]; ys = [v[1] for v in local_verts]; zs = [v[2] for v in local_verts]
    pdiag = ((max(xs) - min(xs)) ** 2 + (max(ys) - min(ys)) ** 2 + (max(zs) - min(zs)) ** 2) ** 0.5
    pmax_dist = pdiag * 3.0 + 2.0
    for lf in local_faces:
        pts = [Vector(local_verts[idx]) for idx in lf]
        center = sum(pts, Vector((0.0, 0.0, 0.0))) / len(pts)
        nrm = face_normal(pts)
        if nrm.length < 1e-9:
            continue
        nrm.normalize()
        faces_checked += 1
        out_n = crossings(part_bvh, center + nrm * PROBE_EPS, SAMPLE_DIR, pmax_dist)
        in_n = crossings(part_bvh, center - nrm * PROBE_EPS, SAMPLE_DIR, pmax_dist)
        if not (out_n % 2 == 0 and in_n % 2 == 1):
            winding_bad.append((part_name, out_n, in_n))

checks["winding"] = (
    True if not winding_bad
    else "%d/%d faces failed outward parity, per-part isolated (part,out,in): %s%s"
         % (len(winding_bad), faces_checked, winding_bad[:8],
            " ..." if len(winding_bad) > 8 else ""))

result = {
    "status": "pass" if all(v is True for v in checks.values()) else "fail",
    "created": created,
    "checks": checks,
    "notes": (
        "Three-cottage cluster, %d tris (budget %d), one pink accent "
        "(cottage_b's chimney cone cap, #B87890) across the group. %s. "
        "Every solid (house, plinth, chimney, door, window) built fully "
        "watertight (floor caps / chimney bottoms / cone-capped tops "
        "included) specifically so the BVH ray-parity winding audit is "
        "meaningful rather than ambiguous on open shells. If checks['winding'] "
        "lists failing faces, inspect whether they land on a door/window's "
        "buried rear face (embedded in the wall — a harmless artifact of "
        "overlapping closed solids, see header) before treating them as a "
        "true inversion."
        % (tri_count, BUDGET, "; ".join(notes_parts))),
}
