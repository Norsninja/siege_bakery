"""
COMMISSION: mid_orchard_west
BAND: mid_
ZONE: x -100..-70, y -10..30 (blender), height cap 14 m
BUDGET: 500 tris total
BRIEF: A cherry orchard between the arena and the west hamlet. 8 chunky
lollipop trees (fat tapered trunk + big faceted round canopy) as ONE
mesh. 5 canopies in the meadow-green family, 3 in blossom pink as the
accent. Hand-placed (deterministic), each tree grounded on its own
raycast into the rolling meadow.

Per project/research/18-region-structure-rules.md THE SCRIPT CONTRACT
(SS8). Idempotent: safe to rerun in the open region.blend via Blender
MCP. Builds entirely with bmesh.ops primitives (create_cone /
create_icosphere) so every face is emitted by Blender's own
primitive generators with correct outward winding -- no manual
from_pydata face lists to get backwards.
"""

import bpy
import bmesh
from mathutils import Matrix, Vector

# ---------------------------------------------------------------------
# Commission constants
# ---------------------------------------------------------------------

OWNED = ["mid_orchard_west"]
BAND_PREFIX = "mid_"
ZONE_X = (-100.0, -70.0)
ZONE_Y = (-10.0, 30.0)
HEIGHT_CAP = 14.0
BUDGET_TRIS = 500

SEGMENTS = 8                 # trunk cross-section -- chunky, faceted
TRUNK_R_BOTTOM_F = 0.050      # trunk bottom radius as a fraction of tree height
TRUNK_R_TOP_F_MUL = 0.70      # trunk top radius = bottom * this (taper)
CANOPY_R_F = 0.30             # canopy radius as a fraction of tree height
CANOPY_CENTER_F = 0.62        # canopy sphere center height as a fraction of tree height
CANOPY_STRETCH = 1.10         # slight vertical elongation of the canopy sphere
TRUNK_NESTLE_F = 0.25         # trunk reaches this * canopy_radius above the canopy center

TIMBER_HEX = "#886060"

# Hand-placed, deterministic. x, y inside the safe interior of the zone
# (a few metres of margin so the widest canopy never crosses the rect).
# heights vary ~6.5-11.5 m (apparent canopy-top ~0.95x that -- "roughly
# 6-12 m" per brief). 3 of 8 trees are in blossom (brief allows 2 or 3).
TREES = [
    dict(x=-95.0, y=-4.0, h=8.5,  blossom=False, hex="#386028", shade=1.00),
    dict(x=-88.0, y=3.0,  h=10.5, blossom=False, hex="#386830", shade=0.97),
    dict(x=-81.0, y=-3.0, h=7.0,  blossom=True,  hex="#B87890", shade=1.00),
    dict(x=-75.0, y=5.0,  h=9.0,  blossom=False, hex="#386028", shade=1.05),
    dict(x=-92.0, y=12.0, h=11.5, blossom=False, hex="#386830", shade=1.00),
    dict(x=-83.0, y=16.0, h=8.0,  blossom=True,  hex="#A88098", shade=1.00),
    dict(x=-76.0, y=22.0, h=10.0, blossom=False, hex="#386028", shade=0.95),
    dict(x=-94.0, y=24.0, h=6.5,  blossom=True,  hex="#B87890", shade=1.03),
]


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------

def hexcol(h):
    """Hex string -> LINEAR (r, g, b, 1.0) floats, written verbatim
    (no sRGB conversion) per SS4 of the rules doc."""
    h = h.lstrip("#")
    r = int(h[0:2], 16) / 255.0
    g = int(h[2:4], 16) / 255.0
    b = int(h[4:6], 16) / 255.0
    return (r, g, b, 1.0)


def clamp01(v):
    return max(0.0, min(1.0, v))


def shade_col(col, factor):
    return (clamp01(col[0] * factor), clamp01(col[1] * factor),
            clamp01(col[2] * factor), 1.0)


def ground_z_at(x, y):
    deps = bpy.context.evaluated_depsgraph_get()
    hit, loc, nrm, idx, hit_obj, mat = bpy.context.scene.ray_cast(
        deps, Vector((x, y, 50.0)), Vector((0.0, 0.0, -1.0)))
    return loc.z if hit else 0.0


TIMBER = hexcol(TIMBER_HEX)

# ---------------------------------------------------------------------
# 1. Snapshot scene state BEFORE any teardown/build (for no_strays)
# ---------------------------------------------------------------------

before_names = set(bpy.data.objects.keys())

# ---------------------------------------------------------------------
# 2. Idempotent teardown -- delete any existing OWNED objects + meshes
# ---------------------------------------------------------------------

for name in OWNED:
    old = bpy.data.objects.get(name)
    if old is not None:
        old_mesh = old.data
        bpy.data.objects.remove(old, do_unlink=True)
        if old_mesh is not None and old_mesh.users == 0:
            bpy.data.meshes.remove(old_mesh)

# ---------------------------------------------------------------------
# 3. Ground every tree by raycast BEFORE building any new geometry
#    (so a fresh build never shadows its own or a sibling's raycast)
# ---------------------------------------------------------------------

for t in TREES:
    t["ground_z"] = ground_z_at(t["x"], t["y"])
    t["base_z"] = t["ground_z"] - 0.3

# ---------------------------------------------------------------------
# 4. Build -- one master bmesh, everything authored in world space
# ---------------------------------------------------------------------

bm = bmesh.new()
vert_color = {}          # BMVert -> (r, g, b, a)
tree_vert_refs = []       # [(tree_dict, [BMVert, ...]), ...]

for t in TREES:
    x, y, h, base_z = t["x"], t["y"], t["h"], t["base_z"]

    trunk_r_bottom = h * TRUNK_R_BOTTOM_F
    trunk_r_top = trunk_r_bottom * TRUNK_R_TOP_F_MUL
    canopy_radius = h * CANOPY_R_F
    canopy_center_z = base_z + h * CANOPY_CENTER_F
    trunk_height = (canopy_center_z - base_z) + canopy_radius * TRUNK_NESTLE_F

    trunk_matrix = Matrix.Translation((x, y, base_z + trunk_height / 2.0))
    ret_trunk = bmesh.ops.create_cone(
        bm, cap_ends=True, cap_tris=True, segments=SEGMENTS,
        radius1=trunk_r_bottom, radius2=trunk_r_top,
        depth=trunk_height, matrix=trunk_matrix)
    trunk_verts = ret_trunk["verts"]

    canopy_col = shade_col(hexcol(t["hex"]), t["shade"])
    scale_mat = Matrix.Diagonal(Vector((1.0, 1.0, CANOPY_STRETCH, 1.0)))
    canopy_matrix = Matrix.Translation((x, y, canopy_center_z)) @ scale_mat
    ret_canopy = bmesh.ops.create_icosphere(
        bm, subdivisions=0, radius=canopy_radius, matrix=canopy_matrix)
    canopy_verts = ret_canopy["verts"]

    for v in trunk_verts:
        vert_color[v] = TIMBER
    for v in canopy_verts:
        vert_color[v] = canopy_col

    tree_vert_refs.append((t, trunk_verts + canopy_verts))

bm.verts.ensure_lookup_table()
bm.verts.index_update()

# capture per-tree vertex INDEX lists before to_mesh() invalidates BMVert refs
tree_index_lists = []
for t, verts in tree_vert_refs:
    tree_index_lists.append((t, [v.index for v in verts]))

n_verts = len(bm.verts)
color_by_index = [(0.0, 0.0, 0.0, 1.0)] * n_verts
for v, col in vert_color.items():
    color_by_index[v.index] = col

mesh = bpy.data.meshes.new(OWNED[0])
bm.to_mesh(mesh)
bm.free()
mesh.update()

# flat shading -- no smooth, no subsurf, no UVs
for p in mesh.polygons:
    p.use_smooth = False

col_attr = mesh.color_attributes.new(name="Col", type="FLOAT_COLOR", domain="POINT")
for i in range(len(mesh.vertices)):
    col_attr.data[i].color = color_by_index[i]

obj = bpy.data.objects.new(OWNED[0], mesh)
bpy.context.collection.objects.link(obj)

vtx_mat = bpy.data.materials.get("vtx")
obj.data.materials.clear()
if vtx_mat is not None:
    obj.data.materials.append(vtx_mat)

obj.location = (0.0, 0.0, 0.0)
obj.rotation_euler = (0.0, 0.0, 0.0)
obj.scale = (1.0, 1.0, 1.0)

# ---------------------------------------------------------------------
# 5. Self-validation (SS8) -- every check computed honestly
# ---------------------------------------------------------------------

after_names = set(bpy.data.objects.keys())
created = [n for n in OWNED if n in bpy.data.objects]

checks = {}

checks["names_prefixed"] = all(n.startswith(BAND_PREFIX) for n in OWNED)

checks["no_strays"] = after_names == (before_names | set(OWNED))

checks["material_vtx"] = (
    len(obj.data.materials) == 1
    and obj.data.materials[0] is not None
    and obj.data.materials[0].name == "vtx"
)

ca = mesh.color_attributes.get("Col")
checks["color_attr"] = (
    ca is not None
    and ca.data_type == "FLOAT_COLOR"
    and ca.domain == "POINT"
    and len(ca.data) == len(mesh.vertices)
)

mesh.calc_loop_triangles()
tri_count = len(mesh.loop_triangles)
checks["budget"] = tri_count <= BUDGET_TRIS

xs = [v.co.x for v in mesh.vertices]
ys = [v.co.y for v in mesh.vertices]
xy_ok = (
    len(xs) > 0
    and min(xs) >= ZONE_X[0] and max(xs) <= ZONE_X[1]
    and min(ys) >= ZONE_Y[0] and max(ys) <= ZONE_Y[1]
)

height_ok = True
grounded_ok = True
for t, idxs in tree_index_lists:
    zs = [mesh.vertices[i].co.z for i in idxs]
    tree_min_z = min(zs)
    tree_max_z = max(zs)
    if (tree_max_z - tree_min_z) > HEIGHT_CAP:
        height_ok = False
    expected_base = t["ground_z"] - 0.3
    if abs(tree_min_z - expected_base) > 0.5:
        grounded_ok = False

checks["zone"] = xy_ok and height_ok
checks["grounded"] = grounded_ok

checks["transforms_clean"] = (
    tuple(obj.rotation_euler) == (0.0, 0.0, 0.0)
    and tuple(obj.scale) == (1.0, 1.0, 1.0)
)

checks["no_modifiers"] = len(obj.modifiers) == 0

status = "pass" if all(v is True for v in checks.values()) else "fail"

n_blossom = sum(1 for t in TREES if t["blossom"])
h_min = min(t["h"] for t in TREES)
h_max = max(t["h"] for t in TREES)

result = {
    "status": status,
    "created": created,
    "checks": checks,
    "notes": (
        f"{len(TREES)} lollipop trees ({n_blossom} in blossom), "
        f"authored heights {h_min:.1f}-{h_max:.1f} m, "
        f"{tri_count} tris total (budget {BUDGET_TRIS})."
    ),
}
