"""
COMMISSION: mid_fields_south
BAND: mid_
ZONE: x 8..60, y 100..140 (blender), height cap 8 m
BUDGET: 500 tris total
BRIEF: Wheat fields on the approach to the south hamlet -- the bakery's
flour starts here. 4 rectangular field plots as ONE mesh, each a low
raised slab (0.4-0.8 m thick so the top face catches light, edges
visible), varied sizes and a few degrees of yaw baked into the mesh
(object transform ships zero), gaps of meadow between them. PLUS 5
chunky haystacks (tapered cone body + rounded dome cap, 3-5 m tall)
scattered beside/among the plots.

SESSION-RULED ACCENT COLORS (addition to SS5 palette, per SS5's own law --
noted in the report): wheat gold #C98A2B for plot tops, straw light
#D8B878 for haystacks; plot SIDES use the darker road-dirt family
#605850. No pink accent -- gold is this commission's color moment.

Per project/research/18-region-structure-rules.md THE SCRIPT CONTRACT
(SS8). Idempotent: safe to rerun in the open region.blend via Blender
MCP.

Plots are built face-by-face with unique (non-shared) vertices per
face so each face keeps a crisp, single flat color under the POINT-
domain "Col" attribute -- a shared-vertex box would blend gold into
the dirt sides at the top edge. Face vertex orders below were derived
by hand from the right-hand rule (edge1 x edge2 must point along the
face's outward normal) so every quad winds outward CCU -- verified
per-face in code comments.

Haystacks reuse the proven tapered-cone-plus-icosphere pattern from
mid_orchard_west.py (bmesh.ops primitives only, so winding comes from
Blender's own generators, not hand-built face lists).

Per SS7/SS8 "grounded": every element (each plot, each haystack) grounds
on its OWN raycast into the rolling meadow, taken BEFORE any geometry
is built (so nothing self-hits). Plots sink 0.3-0.5 m (varied per
plot, "so no edge floats" per the brief); haystacks use the standard
0.3 m sink.
"""

import bpy
import bmesh
import math
from mathutils import Matrix, Vector

# ---------------------------------------------------------------------
# Commission constants
# ---------------------------------------------------------------------

OWNED = ["mid_fields_south"]
BAND_PREFIX = "mid_"
ZONE_X = (8.0, 60.0)
ZONE_Y = (100.0, 140.0)
HEIGHT_CAP = 8.0
BUDGET_TRIS = 500

GOLD_HEX = "#C98A2B"    # plot tops (session-ruled accent, SS5 addition)
STRAW_HEX = "#D8B878"   # haystacks (session-ruled accent, SS5 addition)
DIRT_HEX = "#605850"    # plot sides/bottom -- SS5 road-dirt (dark)

HAY_SINK = 0.3           # standard SS7 sink for non-plot elements

# Haystack proportions (tapered cone body + squashed dome cap, tuned
# fatter/shorter/blunter than mid_orchard_west's lollipop trees).
HAY_SEGMENTS = 8
HAY_R_BOTTOM_F = 0.28     # body bottom radius as a fraction of stack height
HAY_R_TOP_F_MUL = 0.75    # body top radius = bottom * this (gentle taper)
HAY_CAP_R_F = 0.34        # cap (dome) radius as a fraction of stack height
HAY_CAP_CENTER_F = 0.66   # cap sphere center height as a fraction of height
HAY_CAP_STRETCH = 0.85    # squashed dome, not an elongated canopy
HAY_NESTLE_F = 0.35       # body reaches this * cap_radius above cap center's base

# 4 rectangular plots: center (cx, cy), footprint W (x-ish) x L (y-ish)
# before yaw, thickness T, yaw in degrees (baked into vertices), sink
# depth (0.3-0.5 m per the brief), and a small top-color shade
# variation (+-10%, allowed by SS5). Hand-placed; extents verified by
# hand against the zone rect with margin (see report).
PLOTS = [
    dict(name="plot_a", cx=17.0, cy=109.0, W=13.0, L=9.0,  T=0.50, yaw=5.0,  sink=0.30, shade=1.00),
    dict(name="plot_b", cx=42.0, cy=110.0, W=15.0, L=10.0, T=0.65, yaw=-7.0, sink=0.40, shade=0.95),
    dict(name="plot_c", cx=22.0, cy=129.0, W=11.0, L=12.0, T=0.75, yaw=4.0,  sink=0.45, shade=1.03),
    dict(name="plot_d", cx=46.0, cy=132.0, W=17.0, L=8.0,  T=0.45, yaw=-5.0, sink=0.35, shade=0.97),
]

# 5 haystacks: (x, y), height h (3-5 m), shade variation. Some sit
# inside a plot's footprint (base still grounds on the terrain
# raycast, per SS7/SS8 -- the base naturally nestles into the slab),
# some sit beside the plots in the meadow gaps -- "scattered on or
# beside the plots" per the brief.
HAYSTACKS = [
    dict(name="hay_1", x=14.0, y=111.0, h=4.0, shade=1.00),   # inside plot_a
    dict(name="hay_2", x=46.0, y=108.0, h=3.5, shade=0.97),   # inside plot_b
    dict(name="hay_3", x=30.0, y=120.0, h=4.5, shade=1.04),   # beside, meadow gap
    dict(name="hay_4", x=24.0, y=131.0, h=3.0, shade=0.96),   # inside plot_c
    dict(name="hay_5", x=52.0, y=127.0, h=5.0, shade=1.02),   # beside plot_d
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


GOLD = hexcol(GOLD_HEX)
STRAW = hexcol(STRAW_HEX)
DIRT = hexcol(DIRT_HEX)

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
# 3. Ground every element by raycast BEFORE building any new geometry
#    (so a fresh build never shadows its own or a sibling's raycast)
# ---------------------------------------------------------------------

for p in PLOTS:
    p["ground_z"] = ground_z_at(p["cx"], p["cy"])
    p["base_z"] = p["ground_z"] - p["sink"]

for hy in HAYSTACKS:
    hy["ground_z"] = ground_z_at(hy["x"], hy["y"])
    hy["base_z"] = hy["ground_z"] - HAY_SINK

# ---------------------------------------------------------------------
# 4. Build -- one master bmesh, everything authored in world space
# ---------------------------------------------------------------------

bm = bmesh.new()
vert_color = {}           # BMVert -> (r, g, b, a)
elem_vert_refs = []        # [(elem_dict, [BMVert, ...]), ...]  (both plots + haystacks)

# --- 4a. Plots: 6 faces per plot, each face built from 4 UNIQUE
# vertices (no sharing across faces) so flat POINT-domain color reads
# crisp at every edge. Local corner order per face was derived by
# hand from the right-hand rule: for a face with outward normal +K,
# using the right-handed pair (I, J) with I x J = K, CCW-from-outside
# order is (I+,J+),(I-,J+),(I-,J-),(I+,J-) at K = +halfK. Verified for
# top(+Z), bottom(-Z), +-X, +-Y below; each -X/-Y/bottom is the
# reverse loop of its +X/+Y/top sibling (opposite normal).

for p in PLOTS:
    cx, cy, W, L, T = p["cx"], p["cy"], p["W"], p["L"], p["T"]
    base_z = p["base_z"]
    hw, hl, ht = W / 2.0, L / 2.0, T / 2.0
    theta = math.radians(p["yaw"])
    cos_t, sin_t = math.cos(theta), math.sin(theta)
    center_z = base_z + ht

    def world(lx, ly, lz, _cos=cos_t, _sin=sin_t, _cx=cx, _cy=cy, _cz=center_z):
        wx = lx * _cos - ly * _sin + _cx
        wy = lx * _sin + ly * _cos + _cy
        wz = _cz + lz
        return bm.verts.new((wx, wy, wz))

    faces_local = {
        # normal +Z (top), I x J = K with (I,J) = (X,Y)
        "top":    [(hw,  hl,  ht), (-hw,  hl,  ht), (-hw, -hl,  ht), (hw, -hl,  ht)],
        # normal -Z (bottom) -- reverse of top
        "bottom": [(hw,  hl, -ht), (hw, -hl, -ht), (-hw, -hl, -ht), (-hw,  hl, -ht)],
        # normal +X, (I,J) = (Y,Z)
        "+x":     [(hw,  hl,  ht), (hw, -hl,  ht), (hw, -hl, -ht), (hw,  hl, -ht)],
        # normal -X -- reverse of +x, at x=-hw
        "-x":     [(-hw,  hl, -ht), (-hw, -hl, -ht), (-hw, -hl,  ht), (-hw,  hl,  ht)],
        # normal +Y, (I,J) = (Z,X)
        "+y":     [(hw,  hl,  ht), (hw,  hl, -ht), (-hw,  hl, -ht), (-hw,  hl,  ht)],
        # normal -Y -- reverse of +y, at y=-hl
        "-y":     [(hw, -hl,  ht), (-hw, -hl,  ht), (-hw, -hl, -ht), (hw, -hl, -ht)],
    }

    plot_verts = []
    for face_name, corners in faces_local.items():
        fverts = [world(lx, ly, lz) for (lx, ly, lz) in corners]
        bm.faces.new(fverts)
        col = shade_col(GOLD, p["shade"]) if face_name == "top" else DIRT
        for v in fverts:
            vert_color[v] = col
        plot_verts.extend(fverts)

    elem_vert_refs.append((p, plot_verts))

# --- 4b. Haystacks: tapered cone body + squashed icosphere cap, built
# entirely from bmesh.ops primitives (winding comes from Blender's own
# generators, matching the proven mid_orchard_west pattern).

for hy in HAYSTACKS:
    x, y, h, base_z = hy["x"], hy["y"], hy["h"], hy["base_z"]

    r_bottom = h * HAY_R_BOTTOM_F
    r_top = r_bottom * HAY_R_TOP_F_MUL
    cap_radius = h * HAY_CAP_R_F
    cap_center_z = base_z + h * HAY_CAP_CENTER_F
    body_height = (cap_center_z - base_z) + cap_radius * HAY_NESTLE_F

    body_matrix = Matrix.Translation((x, y, base_z + body_height / 2.0))
    ret_body = bmesh.ops.create_cone(
        bm, cap_ends=True, cap_tris=True, segments=HAY_SEGMENTS,
        radius1=r_bottom, radius2=r_top,
        depth=body_height, matrix=body_matrix)
    body_verts = ret_body["verts"]

    cap_col = shade_col(STRAW, hy["shade"])
    scale_mat = Matrix.Diagonal(Vector((1.0, 1.0, HAY_CAP_STRETCH, 1.0)))
    cap_matrix = Matrix.Translation((x, y, cap_center_z)) @ scale_mat
    ret_cap = bmesh.ops.create_icosphere(
        bm, subdivisions=0, radius=cap_radius, matrix=cap_matrix)
    cap_verts = ret_cap["verts"]

    for v in body_verts:
        vert_color[v] = cap_col
    for v in cap_verts:
        vert_color[v] = cap_col

    elem_vert_refs.append((hy, body_verts + cap_verts))

bm.verts.ensure_lookup_table()
bm.verts.index_update()

# capture per-element vertex INDEX lists before to_mesh() invalidates BMVert refs
elem_index_lists = []
for elem, verts in elem_vert_refs:
    elem_index_lists.append((elem, [v.index for v in verts]))

n_verts = len(bm.verts)
color_by_index = [(0.0, 0.0, 0.0, 1.0)] * n_verts
for v, col in vert_color.items():
    color_by_index[v.index] = col

mesh = bpy.data.meshes.new(OWNED[0])
bm.to_mesh(mesh)
bm.free()
mesh.update()

# flat shading -- no smooth, no subsurf, no UVs
for poly in mesh.polygons:
    poly.use_smooth = False

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
for elem, idxs in elem_index_lists:
    zs = [mesh.vertices[i].co.z for i in idxs]
    elem_min_z = min(zs)
    elem_max_z = max(zs)
    if (elem_max_z - elem_min_z) > HEIGHT_CAP:
        height_ok = False
    sink = elem["sink"] if "sink" in elem else HAY_SINK
    expected_base = elem["ground_z"] - sink
    if abs(elem_min_z - expected_base) > 0.5:
        grounded_ok = False

checks["zone"] = xy_ok and height_ok
checks["grounded"] = grounded_ok

checks["transforms_clean"] = (
    tuple(obj.rotation_euler) == (0.0, 0.0, 0.0)
    and tuple(obj.scale) == (1.0, 1.0, 1.0)
)

checks["no_modifiers"] = len(obj.modifiers) == 0

status = "pass" if all(v is True for v in checks.values()) else "fail"

t_min = min(p["T"] for p in PLOTS)
t_max = max(p["T"] for p in PLOTS)
h_min = min(hy["h"] for hy in HAYSTACKS)
h_max = max(hy["h"] for hy in HAYSTACKS)

result = {
    "status": status,
    "created": created,
    "checks": checks,
    "notes": (
        f"{len(PLOTS)} field plots (thickness {t_min:.2f}-{t_max:.2f} m, "
        f"yaw {min(p['yaw'] for p in PLOTS):.0f}..{max(p['yaw'] for p in PLOTS):.0f} deg, "
        f"sink {min(p['sink'] for p in PLOTS):.2f}-{max(p['sink'] for p in PLOTS):.2f} m), "
        f"{len(HAYSTACKS)} haystacks (height {h_min:.1f}-{h_max:.1f} m), "
        f"{tri_count} tris total (budget {BUDGET_TRIS}). "
        f"Session-ruled accents: wheat gold {GOLD_HEX} (plot tops), "
        f"straw light {STRAW_HEX} (haystacks); sides/bottom in road-dirt "
        f"{DIRT_HEX}. No pink accent -- gold is this commission's color moment."
    ),
}
