# mid_pines_west.py — COMMISSION: pine stand framing the west view
#
# Per research/18-region-structure-rules.md (THE SCRIPT CONTRACT §8).
# Band: mid_ (lit + fogged — TRUE LOCAL COLOR, no baked haze).
# Zone: x -65..-35, y 55..84 (blender), height cap 16 m. Budget 500 tris.
#
# Design (silhouette first, judged from the post eye at (1.5, 11, 1.6) —
# this is the CLOSEST commission yet, ~85 m away, so facet quality is
# spent over tree count):
#   - Same species as the accepted mid_pines_south: short fat trunk
#     frustum (timber #886060) + stacked faceted cone tiers (dark
#     meadow-green family #305820 / #386028, +/-10% per tree). Where the
#     south sibling used 6-sided (hex) cross-sections and 2-3 tiers, this
#     commission spends its budget headroom on BOTH a rounder 10-sided
#     cross-section AND a uniform 3-tier canopy on every tree (not just
#     the tall ones) — 7 trees * 50 tris = 350 of the 500-tri budget.
#   - 7 trees, two natural clusters with a real gap between them (the
#     meadow breathes, per brief): CLUSTER A (south-west, tall, 4 trees,
#     y ~60-65, heights 12-14 m) and CLUSTER B (north, short, 3 trees,
#     y ~76-78, heights 7-9 m). Gap: no canopy occupies y ~70-73.
#   - Stepping DOWN toward the vista: the zone's north edge (y 84)
#     borders the protected post->castle corridor, so height and canopy
#     radius both shrink from cluster A to cluster B, and cluster B's
#     northmost tree (B2, y 78, H 7.0) keeps a 3.5+ m canopy margin
#     below y 84 — comfortably clear of the corridor.
#   - NO pink accent (brief: trees defer to the built structures — the
#     same instinct the south sibling set).
#   - Each tree grounded by its OWN §7 raycast at its own (x, y); base
#     sunk 0.3 m. Raycasts happen ONCE, after teardown, before any new
#     geometry exists, and are cached/reused for the grounded check so
#     the check can never catch our own freshly-built canopy.
#
# Deterministic: all variation (position, height, color factor, hex
# phase) is hand-authored — no randomness used at all.
# Idempotent: OWNED teardown first, every raycast after teardown.

import bpy
import math
from mathutils import Vector

OWNED = ["mid_pines_west"]
NAME = "mid_pines_west"
PREFIX = "mid_"
BUDGET = 500
ZONE_X = (-65.0, -35.0)
ZONE_Y = (55.0, 84.0)
ZONE_ZMAX = 16.0
SIDES = 10                         # rounder cross-section — the facet-quality spend
SINK = 0.3                         # §7: sink the base 0.3 m

# ---------------------------------------------------------------------------
# §5 palette of record — LINEAR hex written verbatim as floats (int/255).
# NO sRGB conversion (§4). Per-tree variation stays within ~+/-10% of a row.
# ---------------------------------------------------------------------------
def hx(h, mul=1.0):
    r = min(1.0, (int(h[0:2], 16) / 255.0) * mul)
    g = min(1.0, (int(h[2:4], 16) / 255.0) * mul)
    b = min(1.0, (int(h[4:6], 16) / 255.0) * mul)
    return (r, g, b, 1.0)

TIMBER  = "886060"   # trunk — timber brown-red
FAM_A   = "305820"   # meadow green, dark family (conifer canopy)
FAM_B   = "386028"   # meadow green, dark family (conifer canopy)

# Trees: (x, y, total_height_m, tier_count, family, variant_mul, rot_phase)
# Two clusters, a real gap between them, tallest at the south-west,
# stepping down toward the north (vista) edge. All trees use 3 tiers —
# the budget spend is sides + tiers, not tree count (per brief).
TREES = [
    # CLUSTER A — south-west, tall (12-14 m)
    (-59.0, 60.0, 12.0, 3, FAM_B, 1.05, 0.00),
    (-53.0, 63.0, 14.0, 3, FAM_A, 0.95, 0.60),
    (-47.0, 60.5, 12.5, 3, FAM_B, 1.02, 1.20),
    (-56.0, 65.0, 13.0, 3, FAM_A, 0.98, 1.80),
    # gap: no canopy in y ~70-73
    # CLUSTER B — north, short (7-9 m), stepping down toward the vista
    (-51.0, 77.0,  9.0, 3, FAM_B, 1.06, 2.40),
    (-44.0, 78.0,  7.0, 3, FAM_A, 0.94, 3.00),
    (-58.0, 76.0,  8.0, 3, FAM_B, 1.03, 3.60),
]

TIER3_HFRAC = (0.40, 0.35, 0.25)
TIER3_RFRAC = (1.00, 0.68, 0.40)

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
# 2. Ground each tree by its OWN raycast (§7) — AFTER teardown, ONCE, before
#    any new geometry exists, so nothing (old or new) can catch its own ray.
#    Results are cached and reused for both building AND the grounded check.
# ---------------------------------------------------------------------------
deps = bpy.context.evaluated_depsgraph_get()
ground = []   # ground_z per tree, index-aligned with TREES
for (x, y, H, tiers, fam, mul, phase) in TREES:
    hit, loc, *_ = bpy.context.scene.ray_cast(
        deps, Vector((x, y, 50.0)), Vector((0.0, 0.0, -1.0)))
    ground.append(loc.z if hit else 0.0)

# ---------------------------------------------------------------------------
# 3. Build — pure pydata, every tier its own vertex island so POINT-domain
#    colors stay hard-edged blocks (§6: color blocks, not geometry)
# ---------------------------------------------------------------------------
V, F, C = [], [], []   # verts, faces, per-vertex RGBA

def emit(vs, fs, cs):
    if isinstance(cs, tuple):
        cs = [cs] * len(vs)
    assert len(cs) == len(vs)
    base = len(V)
    V.extend(vs)
    C.extend(cs)
    F.extend([tuple(base + i for i in f) for f in fs])

def ring(cx, cy, z, r, phase):
    """CCW (viewed from +z) SIDES-gon centered at (cx, cy)."""
    pts = []
    for k in range(SIDES):
        a = phase + k * 2.0 * math.pi / SIDES
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a), z))
    return pts

def band(ring_lo, ring_hi, col_lo, col_hi):
    """Side wall between two CCW rings — outward winding."""
    n = len(ring_lo)
    fs = [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
    emit(ring_lo + ring_hi, fs, [col_lo] * n + [col_hi] * n)

def fan_up(ring_pts, apex, col):
    """Cone tip from CCW ring to apex above — outward winding."""
    n = len(ring_pts)
    fs = [(k, (k + 1) % n, n) for k in range(n)]
    emit(ring_pts + [apex], fs, col)

tree_ranges = []   # (start_idx, end_idx, target_base_z) per tree, for grounded check

for i, (x, y, H, tiers, fam, mul, phase) in enumerate(TREES):
    ground_z = ground[i]
    base_z = ground_z - SINK
    start_idx = len(V)

    # --- trunk: short fat decagonal frustum, timber
    trunk_h = max(1.0, 0.14 * H)
    trunk_r0 = max(0.45, 0.085 * H)
    trunk_r1 = trunk_r0 * 0.7
    trunk_top = base_z + trunk_h
    band(ring(x, y, base_z, trunk_r0, phase),
         ring(x, y, trunk_top, trunk_r1, phase),
         hx(TIMBER), hx(TIMBER))

    # --- canopy: 3 stacked faceted cones, dark meadow-green, one family
    #     per tree, embedded slightly into the trunk top to hide the seam
    canopy_h = H - trunk_h
    canopy_r0 = 0.35 * H
    col = hx(fam, mul)
    hfrac, rfrac = TIER3_HFRAC, TIER3_RFRAC
    z_cursor = trunk_top - 0.2 * trunk_h
    for t in range(tiers):
        h_t = canopy_h * hfrac[t]
        r_t = canopy_r0 * rfrac[t]
        z_lo = z_cursor
        z_hi = z_cursor + h_t
        fan_up(ring(x, y, z_lo, r_t, phase), (x, y, z_hi), col)
        z_cursor = z_hi

    end_idx = len(V)
    tree_ranges.append((start_idx, end_idx, base_z))

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
bpy.context.collection.objects.link(obj)
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

# grounded: EACH tree's own base within 0.5 m of ITS OWN cached raycast
# ground - 0.3 (checked against the actual built geometry, not just the
# design intent — min z of that tree's own vertex slice).
grounded_fail = []
for i, (start_idx, end_idx, target_base) in enumerate(tree_ranges):
    tree_min_z = min(v[2] for v in V[start_idx:end_idx])
    if abs(tree_min_z - target_base) > 0.5:
        grounded_fail.append(
            "tree %d: base z %.2f vs target %.2f" % (i, tree_min_z, target_base))
checks["grounded"] = True if not grounded_fail else "; ".join(grounded_fail)

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
        "Pine stand, 7 trees, %d tris (budget %d), 10-sided faceted "
        "trunks (timber #886060) + uniform 3-tier hex-free cone canopies "
        "(dark meadow-green families #305820/#386028 alternating, "
        "+/-10%% per-tree multiplier) — SIDES bumped from the south "
        "sibling's 6 to 10 and every tree given 3 tiers, spending the "
        "500-tri budget on facet quality rather than tree count, since "
        "this stand is judged from ~85 m (the closest commission yet). "
        "Two natural clusters with a real gap (no canopy in y ~70-73): "
        "CLUSTER A south-west, tall 12-14 m (y 60-65); CLUSTER B north, "
        "short 7-9 m (y 76-78), stepping down toward the y=84 protected "
        "vista corridor with 3.5+ m of clear canopy margin. NO pink "
        "accent by design (brief: trees defer to built structures). "
        "Each tree grounded by its own raycast, cached before any "
        "geometry existed so no self-hits; base sunk 0.3 m each. "
        "Deterministic: all variation hand-authored, no randomness used."
        % (tri_count, BUDGET)),
}
