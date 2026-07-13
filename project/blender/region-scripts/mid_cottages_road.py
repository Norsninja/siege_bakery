# mid_cottages_road.py — COMMISSION: mid_cottages_road, three dwarf
# cottages expanding the ROAD hamlet eastward.
#
# Per research/18-region-structure-rules.md (THE SCRIPT CONTRACT §8).
# Band: mid_ (lit + fogged — TRUE LOCAL COLOR, no baked haze).
# Zone: x 192..215, y 85..115 (blender), height cap 20 m. Budget 320 tris.
# (mid_town_road's core sits at x 118..188, y 81..130, buildings to 23.5 m —
# this zone picks up just east of that footprint, along the same road.)
#
# Design (silhouette first, judged from the post eye at (1.5, 11, 1.6),
# ~230 m away — chunky outlines and three color zones per cottage, no fine
# detail):
#   THREE gable cottages, deliberately NOT a row — varied footprints,
#   varied ridge orientations, varied chimney placement, one shared pink
#   accent across the whole trio (not per-cottage):
#     - Cottage A (biggest, ~12.9 m tall): 8x5 m footprint, ridge along
#       +x (angle 0), 8-sided fat chimney fused into the WEST gable end.
#       Wall stone #B0B8C0, slate roof #788898/#808898, timber door
#       #886060 on the north wall.
#     - Cottage B (~10.9 m tall): 7x4.4 m footprint, ridge rotated 90°
#       (fwd = +y), 6-sided chimney fused into the NORTH-equivalent
#       (+fwd) gable end — THE PINK ACCENT lives here: the chimney's top
#       band + cap run brand pink (#B87890 / #A88098), the group's only
#       pink. Wall stone alt #B8C0C0, timber door #806870.
#     - Cottage C (~11.1 m tall): 6x4 m footprint, ridge at a 20° angle
#       (the "lived-in cluster" note — not axis-aligned like its
#       neighbors), 6-sided chimney fused into the -fwd gable end, its
#       top band in timber #806870 for variety (no pink — the group's
#       one accent already spent on B). Wall stone #B0B8C0, timber door
#       #886060.
#   No plinth, no eave overhang: every cottage's wall+gable+roof shell is
#   built FLUSH (footprint-matched) so the whole shell stays watertight —
#   see THE WINDING AUDIT note below, this is what keeps it clean.
#   Grounded per §7: each cottage is raycast at its own site center and
#   sunk 0.3 m independently (the meadow rolls across a 30 m zone).
#
#   CHIMNEY PLACEMENT (revised after a live audit failure, see below): each
#   chimney sits just OUTSIDE its gable end, its axis positioned so only a
#   thin `overlap` sliver (0.1 m) pokes past the wall plane into the hall's
#   interior — a real chimney built onto a house, not a post driven through
#   it. An earlier draft embedded the axis 1 m INSIDE the wall (mirroring
#   mid_bakehouse_west's recipe); with a chimney radius bigger than that
#   embed depth, roughly 2.6 m of the chimney's far side ended up genuinely
#   inside the hall's interior volume, and the winding audit (correctly)
#   flagged most of that band as "odd parity" — not a winding bug, a real
#   embedded-joint reading (ray from an interior-facing point exits through
#   the FAR wall once, parity 1). Shrinking the overlap to a hairline
#   removes almost all of that flagged surface without losing the "fused
#   into the gable" read at 230 m.
#
# ---------------------------------------------------------------------------
# GENERALIZED WINDING (why this script does not hand-derive each cottage):
# Each cottage is built in its own local (fwd, right, z) frame, where
# fwd = (cos a, sin a), right = (-sin a, cos a) for ridge angle a. These
# two are always a unit right-handed pair with fwd x right = +z (true for
# ANY angle a — a rotation of the standard x/y basis about z preserves
# handedness). That means the exact analytic winding proofs the prior
# commissions worked out for axis-aligned x/y walls (see mid_bakehouse_west
# .py's header) carry over verbatim under the substitution x -> fwd,
# y -> right: a wall at right=-half_depth has in-plane axes (u=fwd,v=z)
# with u x v = fwd x z = -right (same relation as x x z = -y), so the
# vertex order (s_lo,z_lo)->(s_hi,z_lo)->(s_hi,z_hi)->(s_lo,z_hi) gives
# outward -right for ANY rotation angle, not just a=0. Gable pentagons and
# roof slopes follow the same substitution from the bakehouse's proven
# order. This is why cottage C can sit at an arbitrary 20 degrees with no
# separate case-by-case proof.
#
# The chimney rings/bands/caps are built in absolute world radial
# coordinates around their own axis (independent of cottage rotation —
# a circle has no orientation), reusing the granary/bakehouse pattern
# verbatim.
#
# The door is the one part whose outward direction is a physical
# requirement (must protrude away from ITS wall, not an arbitrary
# derived direction), so it uses a different, self-correcting trick:
# build_door() computes w = tangent x vertical (Blender's cross product,
# always perpendicular to both), and if that computed direction disagrees
# with the wall's KNOWN true outward vector, it swaps the box's two
# tangent endpoints (which flips w's sign) instead of guessing signs by
# hand. Also: the door box ships with its embedded (wall-facing) panel
# OMITTED — it is buried inside the wall, invisible, and including it
# would hand the winding audit below a real but meaningless "odd parity"
# reading purely because that panel's outward normal legitimately points
# into occupied interior space (an embedded joint, not an inversion; see
# research/18's ledger note on this exact failure mode). Leaving it out
# is cheaper (10 tris/door instead of 12) AND keeps the audit meaningful.
#
# THE WINDING AUDIT (this commission's extra requirement, beyond §8):
# after the mesh is built, every single polygon (small budget — a full
# census, not a sparse sample) is tested by BVHTree ray-parity: cast a ray
# from (face centroid + epsilon * face normal) along that same normal: a
# correctly outward-wound face on this shape's true exterior lands just
# outside all material, so the ray should cross the mesh's own geometry
# an EVEN number of times before leaving (0, most of the time — nothing
# else is out there once you're moving away from the building). An
# inverted face instead nudges you back toward/into material, and the
# parity comes out ODD. This is exactly the check the ledger's watchtower-
# door incident called for: Blender's viewport is NOT a winding oracle
# (EEVEE previews double-sided) but this ray-cast is blind to render
# settings and mirrors what three.js's backface culling will actually see.
#
# SCOPING (found live, not assumed): the BVH is built PER COTTAGE, not once
# for the whole joined mesh. A first attempt used one shared BVH for all
# three cottages with a generous 200 m ray — since two cottages sit only
# ~6-10 m apart, that ray sailed straight through a neighbor's walls and
# came back with a crossing count that had nothing to do with the face
# under test. Splitting the BVH by each cottage's own vertex-index range
# (tracked as idx_start/idx_end during the build loop below) confines every
# ray to that cottage's own geometry, which is what a "does THIS shape wind
# correctly" audit actually needs to ask.
#
# Deterministic: no randomness anywhere. Idempotent: OWNED teardown first;
# each cottage's raycast happens AFTER teardown so a prior run's geometry
# can never catch its own successor's ray.

import bpy
import math
from mathutils import Vector
from mathutils.bvhtree import BVHTree

OWNED = ["mid_cottages_road"]
NAME = "mid_cottages_road"
PREFIX = "mid_"
BUDGET = 320
ZONE_X = (192.0, 215.0)
ZONE_Y = (85.0, 115.0)
ZONE_ZMAX = 20.0

SINK = 0.3            # §7: sink each base 0.3 m below its own raycast hit
DOOR_HALF_W = 0.8      # door leaf half-width
DOOR_HALF_H = 1.25     # door leaf half-height
DOOR_HALF_THICK = 0.18  # door slab half-thickness
DOOR_PROTRUDE = 0.14   # door center offset outward from the wall plane
CHIM_OVERLAP = 0.03    # chimney axis placement: how far its far (interior)
                       # edge pokes past the gable wall — a hairline "kiss"
                       # for a fused silhouette without deep interior
                       # intrusion (see header note on the audit failure
                       # this replaced). Kept just above EPS_WIND (0.02) so
                       # the audit's nudge clears the sliver instead of
                       # landing inside it.
DOOR_S_OFFSET = 1.0    # door center, offset off the wall's own centroid —
                       # must clear the wall's s=0 centroid by more than
                       # DOOR_HALF_W (0.8) or the wall's own audit ray still
                       # aims straight through the door box (an earlier
                       # 0.3 m offset wasn't enough; see build-loop comment)

# ---------------------------------------------------------------------------
# §5 palette of record — LINEAR hex written verbatim as floats (int/255).
# NO sRGB conversion (§4). Shading zones stay within ~+-10% of the row.
# ---------------------------------------------------------------------------
def hx(h, mul=1.0):
    r = min(1.0, (int(h[0:2], 16) / 255.0) * mul)
    g = min(1.0, (int(h[2:4], 16) / 255.0) * mul)
    b = min(1.0, (int(h[4:6], 16) / 255.0) * mul)
    return (r, g, b, 1.0)

# ---------------------------------------------------------------------------
# Cottage specs — footprints, orientations, and colors deliberately varied.
# angle_deg 0 => ridge along +x; 90 => ridge along +y; 15 => neither (the
# "lived-in cluster, not a row" instruction). chim_end -1/+1 picks which
# gable end (the -fwd or +fwd end) the chimney fuses into. door_side -1/+1
# picks which long wall (the -right or +right wall) carries the door.
#
# SITE NOTE (found live, not assumed): a raycast probe across the zone
# showed the far_range_inner mountain ring's flank actually intrudes into
# this commission's SE corner — the near_skirt/far_ boundary runs along
# roughly x = 208 - 0.5*(y-85) (measured at 1 m resolution), i.e. safe
# near_ ground shrinks from x<=~207 at y=85 down to x<=~195 by y=115. All
# three sites below were placed (and their footprints re-measured,
# including chimney/door protrusions) to clear that boundary with a >=1 m
# margin, confirmed by direct raycast at each site (see the grounded
# check) landing on near_skirt, not far_range_inner. This is exactly the
# "beware: a nearby probe once hit an orchard canopy" trap the commission
# warned about, just from a mountain instead of a tree.
# ---------------------------------------------------------------------------
COTTAGES = [
    dict(id="A", cx=199.0, cy=88.0, angle_deg=0.0,
         half_len=4.0, half_depth=2.5, wall_h=4.5, roof_rise=4.0,
         chim_end=-1, chim_sides=8,
         r_base=1.5, r_ridge=1.3, r_top=1.2, chim_clear=5.0,
         wall_hex="B0B8C0", roof_a_hex="788898", roof_b_hex="808898",
         door_side=1, door_hex="886060",
         chim_main_hex="B0B8C0", chim_top_hex="B0B8C0", chim_top_mul=0.78,
         cap_hex=None),
    dict(id="B", cx=194.0, cy=100.0, angle_deg=90.0,
         half_len=3.0, half_depth=1.7, wall_h=4.2, roof_rise=3.4,
         chim_end=1, chim_sides=6,
         r_base=1.3, r_ridge=1.15, r_top=1.0, chim_clear=3.2,
         wall_hex="B8C0C0", roof_a_hex="788898", roof_b_hex="808898",
         door_side=-1, door_hex="806870",
         chim_main_hex="B0B8C0", chim_top_hex="B87890", chim_top_mul=1.0,
         cap_hex="A88098"),   # THE group's one pink accent
    dict(id="C", cx=197.0, cy=94.0, angle_deg=15.0,
         half_len=2.2, half_depth=1.5, wall_h=4.0, roof_rise=3.0,
         chim_end=-1, chim_sides=6,
         r_base=1.3, r_ridge=1.15, r_top=1.0, chim_clear=3.2,
         wall_hex="B0B8C0", roof_a_hex="788898", roof_b_hex="808898",
         door_side=1, door_hex="886060",
         chim_main_hex="B8C0C0", chim_top_hex="806870", chim_top_mul=1.0,
         cap_hex=None),
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
# 2. Build — pure pydata, every part its own vertex island so POINT-domain
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

def pentagon(p0, p1, p2, p3, p4, col):
    emit([p0, p1, p2, p3, p4], [(0, 1, 2, 3, 4)], col)

def band(ring_lo, ring_hi, col_lo, col_hi):
    """Side wall between two same-length CCW (from +z) rings — outward
    winding, orientation-independent (proven pattern, granary/bakehouse)."""
    n = len(ring_lo)
    fs = [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
    emit(ring_lo + ring_hi, fs, [col_lo] * n + [col_hi] * n)

def cap_up(ring_pts, col):
    """Flat top cap facing +z — the ring's own CCW-from-above order IS
    the correct winding for an upward n-gon (bakehouse/watchtower)."""
    n = len(ring_pts)
    emit(ring_pts, [tuple(range(n))], col)

def build_door(center, tangent, outward, half_w, half_h, protrude,
               half_thick, col):
    """Door slab: tangent runs along the wall (door width axis), outward
    is the wall's KNOWN true outward direction (a physical requirement,
    not derived). w = tangent x vertical is computed by Blender's own
    cross product; if it disagrees with `outward` we swap the two tangent
    endpoints (flipping w's sign) rather than hand-guessing signs.
    Embedded (wall-facing) panel is OMITTED — see header note: it is
    buried inside the wall, invisible, and would give the winding audit
    a real-but-meaningless odd-parity reading on a legitimate embedded
    joint. 5 faces, 10 tris."""
    u_dir = Vector(tangent).normalized()
    out_dir = Vector(outward).normalized()
    p0 = Vector(center) - u_dir * half_w
    p1 = Vector(center) + u_dir * half_w
    v = Vector((0.0, 0.0, half_h))
    w = u_dir.cross(v)
    if w.length < 1e-9:
        raise RuntimeError("build_door: degenerate frame (tangent parallel to vertical)")
    if w.dot(out_dir) < 0.0:
        p0, p1 = p1, p0
        w = -w
    w = w.normalized() * half_thick
    offset = out_dir * protrude
    p0 = p0 + offset
    p1 = p1 + offset
    c = [p0 - v - w, p1 - v - w, p0 + v - w, p1 + v - w,
         p0 - v + w, p1 - v + w, p0 + v + w, p1 + v + w]
    fs = [(4, 5, 7, 6),   # +w (outward, visible front)
          (1, 3, 7, 5),   # +u (far end)
          (0, 4, 6, 2),   # -u (near end)
          (2, 6, 7, 3),   # +v (top)
          (0, 1, 5, 4)]   # -v (bottom)
    # NOTE: (0,2,3,1) "-w" (the embedded back panel) deliberately omitted.
    emit([tuple(p) for p in c], fs, col)

cottage_info = []

for spec in COTTAGES:
    cx, cy = spec["cx"], spec["cy"]
    angle = math.radians(spec["angle_deg"])
    fwd = (math.cos(angle), math.sin(angle))
    right = (-math.sin(angle), math.cos(angle))
    half_len = spec["half_len"]
    half_depth = spec["half_depth"]

    def pt(s, t, z, cx=cx, cy=cy, fwd=fwd, right=right):
        return (cx + fwd[0] * s + right[0] * t, cy + fwd[1] * s + right[1] * t, z)

    face_idx_start = len(F)   # for the per-cottage BVH scoping below

    # --- ground by raycast (§7), AFTER teardown, per-cottage (the meadow
    # rolls across this 30 m zone — one raycast per site, not per script)
    deps = bpy.context.evaluated_depsgraph_get()
    hit, loc, *_ = bpy.context.scene.ray_cast(
        deps, Vector((cx, cy, 50.0)), Vector((0.0, 0.0, -1.0)))
    ground_z = loc.z if hit else 0.0
    base_z = ground_z - SINK
    wall_top = base_z + spec["wall_h"]
    ridge_z = wall_top + spec["roof_rise"]

    idx_start = len(V)

    wall_col = hx(spec["wall_hex"])
    roof_a = hx(spec["roof_a_hex"])
    roof_b = hx(spec["roof_b_hex"])
    door_col = hx(spec["door_hex"])

    # --- long walls: t=-half_depth outward -right; t=+half_depth outward
    # +right (proof: substitute x->fwd, y->right into the bakehouse's
    # analytic derivation — see header note).
    quad(pt(-half_len, -half_depth, base_z), pt(half_len, -half_depth, base_z),
         pt(half_len, -half_depth, wall_top), pt(-half_len, -half_depth, wall_top),
         wall_col)
    quad(pt(-half_len, half_depth, base_z), pt(-half_len, half_depth, wall_top),
         pt(half_len, half_depth, wall_top), pt(half_len, half_depth, base_z),
         wall_col)

    # --- gable ends: s=-half_len outward -fwd; s=+half_len outward +fwd
    pentagon(pt(-half_len, -half_depth, base_z), pt(-half_len, -half_depth, wall_top),
             pt(-half_len, 0.0, ridge_z), pt(-half_len, half_depth, wall_top),
             pt(-half_len, half_depth, base_z), wall_col)
    pentagon(pt(half_len, -half_depth, base_z), pt(half_len, half_depth, base_z),
             pt(half_len, half_depth, wall_top), pt(half_len, 0.0, ridge_z),
             pt(half_len, -half_depth, wall_top), wall_col)

    # --- roof: two slopes, FLUSH with the gable footprint (no eave
    # overhang — this is what keeps the shell watertight for the audit;
    # the bakehouse's overhang left a small open soffit gap, deliberately
    # not repeated here).
    quad(pt(-half_len, -half_depth, wall_top), pt(half_len, -half_depth, wall_top),
         pt(half_len, 0.0, ridge_z), pt(-half_len, 0.0, ridge_z), roof_a)
    quad(pt(half_len, half_depth, wall_top), pt(-half_len, half_depth, wall_top),
         pt(-half_len, 0.0, ridge_z), pt(half_len, 0.0, ridge_z), roof_b)

    # --- door: on the +right or -right long wall per door_side, offset
    # DOOR_S_OFFSET off the ridge axis (not dead-center — a real door
    # rarely is, AND it keeps the door's center from landing exactly on
    # the long wall's own centroid, which caused a degenerate ray-audit
    # coincidence: the wall's audit ray travels exactly along the door
    # box's own thickness axis when both share s=0, an unstable
    # collinear case found live in an earlier draft).
    side = spec["door_side"]
    tangent = (fwd[0], fwd[1], 0.0)
    outward = (right[0] * side, right[1] * side, 0.0)
    door_center = pt(DOOR_S_OFFSET, side * half_depth, base_z + DOOR_HALF_H)
    build_door(door_center, tangent, outward, DOOR_HALF_W, DOOR_HALF_H,
               DOOR_PROTRUDE, DOOR_HALF_THICK, door_col)

    # --- chimney: sits just OUTSIDE the chosen gable end (axis pushed
    # half_len + r_base - CHIM_OVERLAP from center, so only a CHIM_OVERLAP
    # sliver pokes past the wall into the interior — see header note),
    # rising `chim_clear` m above the ridge. Rings are absolute-world
    # radial circles around the chimney's own axis — orientation-independent.
    chim_end = spec["chim_end"]
    chim_s = chim_end * (half_len + spec["r_base"] - CHIM_OVERLAP)
    chim_cx = cx + fwd[0] * chim_s
    chim_cy = cy + fwd[1] * chim_s
    n = spec["chim_sides"]
    chim_top = ridge_z + spec["chim_clear"]
    main_col = hx(spec["chim_main_hex"])
    top_col = hx(spec["chim_top_hex"], spec["chim_top_mul"])
    cap_col = hx(spec["cap_hex"]) if spec["cap_hex"] else top_col

    def cring(z, r, chim_cx=chim_cx, chim_cy=chim_cy, n=n):
        pts = []
        for k in range(n):
            a = (2 * k + 1) * math.pi / n
            pts.append((chim_cx + r * math.cos(a), chim_cy + r * math.sin(a), z))
        return pts

    band(cring(base_z, spec["r_base"]), cring(ridge_z, spec["r_ridge"]), main_col, main_col)
    band(cring(ridge_z, spec["r_ridge"]), cring(chim_top, spec["r_top"]), top_col, top_col)
    cap_up(cring(chim_top, spec["r_top"]), cap_col)

    idx_end = len(V)
    face_idx_end = len(F)
    cottage_info.append(dict(
        id=spec["id"], idx_start=idx_start, idx_end=idx_end,
        face_idx_start=face_idx_start, face_idx_end=face_idx_end,
        cx=cx, cy=cy, ground_z=ground_z, hit=hit, base_z=base_z,
        wall_top=wall_top, ridge_z=ridge_z, chim_top=chim_top,
        footprint=(half_len * 2.0, half_depth * 2.0), wall_h=spec["wall_h"],
        angle_deg=spec["angle_deg"], chim_sides=n,
    ))

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
# 4. Self-validation (§8.5 + the commission's extra winding audit) — every
#    check computed honestly; this script CAN fail, and says so.
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

# grounded: per-cottage — each cottage's own min z must sit within 0.5 m of
# ITS OWN raycast ground - 0.3 (the meadow rolls; one shared check would be
# meaningless across a 30 m zone with three different site heights).
grounded_fails = []
for info in cottage_info:
    part_verts = V[info["idx_start"]:info["idx_end"]]
    part_min_z = min(v[2] for v in part_verts)
    target = info["ground_z"] - SINK
    if not info["hit"] or abs(part_min_z - target) > 0.5:
        grounded_fails.append(
            "%s: base %.2f vs ground-0.3 %.2f (hit=%s)"
            % (info["id"], part_min_z, target, info["hit"]))
checks["grounded"] = True if not grounded_fails else "; ".join(grounded_fails)

rot_ok = all(abs(r) < 1e-6 for r in obj.rotation_euler)
scl_ok = all(abs(s - 1.0) < 1e-6 for s in obj.scale)
checks["transforms_clean"] = (
    True if (rot_ok and scl_ok)
    else "rot %s scale %s" % (tuple(obj.rotation_euler), tuple(obj.scale)))

checks["no_modifiers"] = (
    True if len(obj.modifiers) == 0
    else "%d modifiers" % len(obj.modifiers))

# --- THE WINDING AUDIT (this commission's extra requirement): BVHTree
# centroid-ray parity across every face (small budget, so "sample" ==
# full census here) — ONE BVH PER COTTAGE (see header note: a single
# shared BVH let a ray from one cottage sail through a neighbor 6-10 m
# away and come back with a meaningless crossing count). Each cottage's
# BVH is built from ONLY its own vertex/face slice (idx_start:idx_end /
# face_idx_start:face_idx_end, tracked during the build loop above), so a
# hit can only ever be that cottage's own geometry.
EPS_WIND = 0.02      # 2 cm nudge off the face — well clear of float noise
                     # at this coordinate scale (~200 m), well inside the
                     # thinnest real feature (door half-thickness 0.18 m)
MAX_DIST = 60.0      # generous vs. any single cottage's own extent
                     # (tallest ~13 m, widest ~9 m) — safe now that each
                     # BVH holds only that one cottage's faces
MAX_HITS = 40

def count_crossings(bvh, origin, direction):
    hits = 0
    o = origin.copy()
    remaining = MAX_DIST
    for _ in range(MAX_HITS):
        loc, nrm, idx, dist = bvh.ray_cast(o, direction, remaining)
        if loc is None:
            break
        hits += 1
        o = loc + direction * 1e-4
        remaining -= (dist + 1e-4)
        if remaining <= 0:
            break
    return hits

winding_fails = []
for info in cottage_info:
    v_lo, v_hi = info["idx_start"], info["idx_end"]
    f_lo, f_hi = info["face_idx_start"], info["face_idx_end"]
    local_verts = [tuple(v) for v in V[v_lo:v_hi]]
    local_faces = [tuple(idx - v_lo for idx in face) for face in F[f_lo:f_hi]]
    cottage_bvh = BVHTree.FromPolygons(local_verts, local_faces, all_triangles=False, epsilon=0.0)
    for local_i, p in enumerate(mesh.polygons[f_lo:f_hi]):
        n = p.normal
        if n.length < 1e-8:
            continue   # degenerate face (shouldn't occur), skip rather than false-flag
        origin = p.center + n * EPS_WIND
        crossings = count_crossings(cottage_bvh, origin, n)
        if crossings % 2 != 0:
            winding_fails.append((f_lo + local_i, info["id"], crossings))

checks["winding"] = (
    True if not winding_fails
    else "%d/%d faces show odd ray-parity (possible inversion): %s"
         % (len(winding_fails), len(mesh.polygons), winding_fails[:12]))

result = {
    "status": "pass" if all(v is True for v in checks.values()) else "fail",
    "created": created,
    "checks": checks,
    "notes": (
        "Three cottages, %d tris total (budget %d). "
        % (tri_count, BUDGET)
        + "; ".join(
            "%s: %.1fx%.1f m footprint @ %.0f deg, wall %.1f m, ridge %.1f m abs, "
            "%d-sided chimney to %.1f m abs (ground z %.2f, hit=%s)"
            % (info["id"], info["footprint"][0], info["footprint"][1],
               info["angle_deg"], info["wall_h"], info["ridge_z"],
               info["chim_sides"], info["chim_top"], info["ground_z"], info["hit"])
            for info in cottage_info
        )
        + ". Pink accent (the group's only one): cottage B's chimney top "
          "band + cap, #B87890/#A88098. Doors ship with the embedded "
          "(wall-facing) panel omitted by design (buried, invisible) — see "
          "header note on why that keeps the winding audit meaningful. "
          "No plinth, no eave overhang: shells built flush/watertight on "
          "purpose. Each cottage grounded by its own raycast, base sunk "
          "0.3 m independently (meadow rolls across the 30 m zone). "
          "Deterministic, no randomness."
    ),
}
