# near_bakery.py — COMMISSION: THE SIEGE BAKERY (the game's hero structure)
#
# Per research/18-region-structure-rules.md (THE SCRIPT CONTRACT §8),
# plus one EXTRA commissioned check: "winding" — a programmatic normal
# audit (the watchtower-door lesson: Blender renders are NOT a winding
# oracle; three.js backface-culls).
#
# Band: near_ (lit + fogged — TRUE LOCAL COLOR, no baked haze).
# Zone: blender x -42..-20, y 12..48, height cap 30 m. Budget 4000 tris.
# NOTE: this zone deliberately sits on the arena slab margin — a
# session-ruled exception to the backdrop slab exclusion.
#
# Design (from the turnarounds in project/blender/bakery/):
#   - Broad dwarven fortress block, wider than tall: body x -40..-21,
#     y 14..46, walls to 17 m, front face at x = -21 looking straight
#     down the dessert-service axis (+x) at y = 30 toward the cake.
#   - THE OVEN MOUTH (the one non-negotiable): arched tunnel centered
#     at y = 30. Facade arch: 12 m wide, springs at 7 m, apex 13 m.
#     Tunnel liner inset 0.08 m (no coplanar faces with the piers):
#     CLEAR opening 11.84 m wide x 12.84 m tall (>= 11 x 12), recessed
#     6.9 m to a glowing back wall at x = -27.9 (>= 6 m). Floor slab at
#     ground level (top z 0.08), painted as TIMBER PLANKING (the
#     reference's wooden ramp road — the cake drags out over it).
#     Glow is PAINT on the tunnel's own surfaces (art-director revision
#     round 1: the old hot-centered flat fan read as a pale boulder —
#     removed): back wall = concentric radial gradient, hot near-white
#     gold core -> deep #C98A2B amber edges; walls/ceiling ramp from
#     deep warm amber at the back to neutral stone at the mouth rim.
#     Vertex color only, no emissive, no lights.
#   - VALUE SCHEME (art-director revision round 1 — stone fortress with
#     dark timber framing, not pastel): dominant walls in the darker
#     slate row (#788898 territory, feet darker still), lighter wall
#     stone reserved for upper zones (parapets, merlons, gable, keep);
#     plinth/base band in the road-dirt family #605850/#686058
#     (session-ruled, precedent: chimney soot rims). All timber framing
#     (bands, arch trim, pilasters, posts, shield, pipes) pulled ~12%
#     darker so it never reads pink. PINK ONLY on: banners, drips,
#     medallion dome/swirl/cherry, turret + dome drip rings, gable
#     ridge/slope trims, keep finial cone.
#   - Four corner turrets (8-sided, engaged, proud of the walls) with
#     cream frosting-cap domes, snow tips, pink drip rings + drip nubs.
#   - Raised central gable/pediment over the arch carrying the CUPCAKE
#     MEDALLION crest (NO TEXT — octagonal timber shield, cream wrapper,
#     pink frosting dome + swirl + cherry, half-relief so the zone's
#     x <= -20 edge is respected).
#   - Crenellated parapets (front run is short — the gable owns the
#     facade center, like the turnaround), central keep with pink-cone
#     finial, big oven dome on the roof (pink drip ring + cream knob,
#     from the top turnaround), two fat soot-rimmed chimneys (no smoke
#     geometry), two back pipes, low side wings, heavy timber bands,
#     arch trim torus + pilasters, banners flanking the arch, cream
#     icing cornices with pink drips. Chunky toy proportions (no strut
#     under 0.4 m). Apex 26.4 m — under the 36 m patron, under the cap.
#   - Back face economical (parapet/pipes/beams/cornice, no medallion):
#     the post eye and play camera see front and flanks.
#
# Deterministic: single seeded RNG (reruns byte-identical). Idempotent:
# OWNED teardown first; ground raycast AFTER teardown. Never saves,
# never exports, touches nothing outside OWNED.

import bpy
import math
import random
from mathutils import Vector
from mathutils.bvhtree import BVHTree

OWNED = ["near_bakery"]
NAME = "near_bakery"
PREFIX = "near_"
BUDGET = 4000
ZONE_X = (-42.0, -20.0)
ZONE_Y = (12.0, 48.0)
ZONE_ZMAX = 30.0
SINK = 0.3

rng = random.Random(0xBA6E27)   # fixed seed — reruns identical

# ---------------------------------------------------------------------------
# §5 palette of record — LINEAR hex written verbatim as floats (int/255).
# NO sRGB conversion (§4). Shading zones stay within ~±10% of the row.
# The gold family (#C98A2B) is the session-ruled accent (wheat fields,
# giant lantern); the commission extends it toward hot near-white gold
# for the painted oven glow.
# ---------------------------------------------------------------------------
def hx(h, mul=1.0):
    r = min(1.0, (int(h[0:2], 16) / 255.0) * mul)
    g = min(1.0, (int(h[2:4], 16) / 255.0) * mul)
    b = min(1.0, (int(h[4:6], 16) / 255.0) * mul)
    return (r, g, b, 1.0)

def mulc(c, f):
    return (min(1.0, c[0] * f), min(1.0, c[1] * f), min(1.0, c[2] * f), 1.0)

def lerpc(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t,
            a[2] + (b[2] - a[2]) * t, 1.0)

SLATE1 = hx("788898"); SLATE2 = hx("808898")
STONE1 = hx("B0B8C0"); STONE2 = hx("B8C0C0")
TIMBER1 = hx("886060"); TIMBER2 = hx("806870"); TIMBER3 = hx("786878")
PINK1 = hx("B87890"); PINK2 = hx("A88098"); PINK3 = hx("A080A0")
CREAM = hx("C8C8B8"); SNOW = hx("D8E8F8")
GOLD = hx("C98A2B")
GOLD_HOT = (0.973, 0.910, 0.722, 1.0)   # hot near-white gold (oven glow)
DARK = mulc(SLATE1, 0.5)                # window insets (shadow, not grime)
DIRT1 = hx("605850"); DIRT2 = hx("686058")  # road-dirt base band (ruled)
# dark timber framing — TIMBER row pulled ~12% down (inside the ruled
# zone-variation allowance) so framing never reads pink:
TD1 = mulc(TIMBER1, 0.86); TD2 = mulc(TIMBER2, 0.86); TD3 = mulc(TIMBER3, 0.87)
ICING = CREAM                           # cornice slather (cream, not pink)

def vary(c, lo=0.94, hi=1.06):
    return mulc(c, rng.uniform(lo, hi))

# ---------------------------------------------------------------------------
# 0. Snapshots + mode guard
# ---------------------------------------------------------------------------
if bpy.context.mode != 'OBJECT':
    try:
        bpy.ops.object.mode_set(mode='OBJECT')
    except RuntimeError:
        pass

# ---------------------------------------------------------------------------
# 1. Idempotent teardown (§8.2) — BEFORE snapshot and raycast
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

names_before = {o.name for o in bpy.data.objects}
mats_before = {m.name for m in bpy.data.materials}
bpy.context.view_layer.update()

# ---------------------------------------------------------------------------
# 2. Ground by raycast (§7) — AFTER teardown; ref_/check_ hits skipped
# ---------------------------------------------------------------------------
def ground_at(x, y):
    deps = bpy.context.evaluated_depsgraph_get()
    z_start = 60.0
    for _ in range(6):
        ok, loc, _n, _i, ob, _m = bpy.context.scene.ray_cast(
            deps, Vector((x, y, z_start)), Vector((0.0, 0.0, -1.0)))
        if not ok:
            return 0.0
        if ob is not None and (ob.name.startswith("ref_")
                               or ob.name.startswith("check_")):
            z_start = loc.z - 0.05
            continue
        return loc.z
    return 0.0

G_SAMPLES = [(-21.5, 15.0), (-21.5, 45.0), (-39.5, 15.0),
             (-39.5, 45.0), (-30.5, 30.0), (-21.5, 30.0)]
g_hits = [ground_at(x, y) for (x, y) in G_SAMPLES]
ground_z = min(g_hits)
ground_center = g_hits[4]
BZ = ground_z - SINK          # base of everything that meets the ground

# ---------------------------------------------------------------------------
# 3. Plan constants
# ---------------------------------------------------------------------------
XB, XF = -40.0, -21.0          # body back / front (facade plane)
Y0, Y1 = 14.0, 46.0            # body flanks
AY = 30.0                      # arch axis (the dessert-service axis)
AR = 6.0                       # facade arch radius (opening 12 m wide)
SPR = 7.0                      # arch spring height
APEX = SPR + AR                # facade arch apex = 13 m
TOP = 17.0                     # main wall top
TUNB = -28.0                   # tunnel structural back
DISCX = -27.9                  # glowing back wall plane
LR = 5.92                      # tunnel liner radius (0.08 inset, no z-fight)
LYL, LYR = AY - LR, AY + LR    # liner walls: y 24.08 / 35.92
FLOOR_TOP = 0.08               # tunnel floor slab top (ground level)

# ---------------------------------------------------------------------------
# 4. Geometry accumulators + winding-verified helpers
#    (box/prism/cone/hexa windings derived by hand; the audit re-proves)
# ---------------------------------------------------------------------------
V = []   # vertices (world coords)
F = []   # faces (vert index tuples)
C = []   # per-vertex linear colors

def add_verts(pts, cols):
    base = len(V)
    V.extend(pts)
    C.extend(cols)
    return base

def quad(a, b, c, d, cols):
    i = add_verts([a, b, c, d], cols)
    F.append((i, i + 1, i + 2, i + 3))

def hexa(pts8, col, col_bottom=None):
    """8 corners in box order: bottom (x0y0,x1y0,x1y1,x0y1) then top.
    Outward winding for any positive-determinant (sheared) box."""
    cb = col_bottom if col_bottom is not None else col
    i = add_verts(list(pts8), [cb] * 4 + [col] * 4)
    for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
              (2, 3, 7, 6), (0, 4, 7, 3), (1, 2, 6, 5)):
        F.append(tuple(i + k for k in f))

def box(x0, y0, z0, x1, y1, z1, col, col_bottom=None):
    hexa([(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
          (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)],
         col, col_bottom)

def prism(cx, cy, z0, z1, r0, r1, n, col_bot, col_top,
          cap_bottom=False, cap_top=True, phase=0.0):
    """Vertical n-gon frustum, outward sides, CCW-from-above rings."""
    bot, top = [], []
    for i in range(n):
        a = phase + 2.0 * math.pi * i / n
        bot.append((cx + r0 * math.cos(a), cy + r0 * math.sin(a), z0))
        top.append((cx + r1 * math.cos(a), cy + r1 * math.sin(a), z1))
    b = add_verts(bot, [col_bot] * n)
    t = add_verts(top, [col_top] * n)
    for i in range(n):
        j = (i + 1) % n
        F.append((b + i, b + j, t + j, t + i))
    if cap_top and r1 > 1e-6:
        c0 = add_verts([(cx, cy, z1)], [col_top])
        for i in range(n):
            F.append((c0, t + i, t + (i + 1) % n))
    if cap_bottom and r0 > 1e-6:
        c0 = add_verts([(cx, cy, z0)], [col_bot])
        for i in range(n):
            F.append((c0, b + (i + 1) % n, b + i))

def cone(cx, cy, z0, z1, r0, n, col_bot, col_top, phase=0.0):
    bot = []
    for i in range(n):
        a = phase + 2.0 * math.pi * i / n
        bot.append((cx + r0 * math.cos(a), cy + r0 * math.sin(a), z0))
    b = add_verts(bot, [col_bot] * n)
    apex = add_verts([(cx, cy, z1)], [col_top])
    for i in range(n):
        F.append((b + i, b + (i + 1) % n, apex))

def prism_x(cy, cz, x0, x1, r, n, col, col_face, phase=0.0):
    """n-gon prism along +x (x1 > x0): outward sides + front (+x) fan."""
    back, front = [], []
    for i in range(n):
        a = phase + 2.0 * math.pi * i / n
        back.append((x0, cy + r * math.cos(a), cz + r * math.sin(a)))
        front.append((x1, cy + r * math.cos(a), cz + r * math.sin(a)))
    b = add_verts(back, [col] * n)
    f = add_verts(front, [col] * n)
    for i in range(n):
        j = (i + 1) % n
        F.append((b + i, b + j, f + j, f + i))
    c0 = add_verts([(x1, cy, cz)], [col_face])
    for i in range(n):
        F.append((c0, f + i, f + (i + 1) % n))

def glow_at(x):
    """Tunnel wall/ceiling ramp by depth: neutral stone at the mouth
    rim -> deep warm amber at the back (revision 1: the glow lives on
    the tunnel's own surfaces; only the back wall goes hot)."""
    t = max(0.0, min(1.0, (XF - x) / (XF - DISCX)))
    return lerpc(mulc(SLATE2, 0.98), GOLD, min(1.0, t * 1.12))

# ---------------------------------------------------------------------------
# 5. BUILD
# ---------------------------------------------------------------------------

# --- 5.1 plinth: dark road-dirt base band (value anchor for the whole
#     building; session-ruled family, split so it never crosses the mouth)
PL = DIRT2
box(-40.4, 13.6, BZ, -20.6, 23.9, 2.2, PL, mulc(DIRT1, 0.94))
box(-40.4, 36.1, BZ, -20.6, 46.4, 2.2, PL, mulc(DIRT1, 0.94))
box(-40.4, 23.9, BZ, -39.9, 36.1, 2.2, PL, mulc(DIRT1, 0.94))

# --- 5.2 main mass: piers, rear block — dominant walls in the darker
#     slate row, feet darker still (zone 1->2 of the facade value ramp)
box(TUNB, Y0, BZ, XF, 24.0, TOP, vary(SLATE2, 0.98, 1.04), mulc(SLATE1, 0.88))
box(TUNB, 36.0, BZ, XF, Y1, TOP, vary(SLATE2, 0.98, 1.04), mulc(SLATE1, 0.88))
box(XB, Y0, BZ, TUNB, Y1, TOP, vary(SLATE2, 0.93, 0.99), mulc(SLATE1, 0.85))

# --- 5.3 facade above the arch (upper zone — the LIGHT stone lives high)
ARC_N = 8
rim_c = mulc(SLATE1, 0.9)
wall_c = vary(STONE1, 0.96, 1.02)
for k in range(ARC_N):
    t0 = math.pi - math.pi * k / ARC_N        # theta pi -> 0 (y 24 -> 36)
    t1 = math.pi - math.pi * (k + 1) / ARC_N
    p0 = (XF, AY + AR * math.cos(t0), SPR + AR * math.sin(t0))
    p1 = (XF, AY + AR * math.cos(t1), SPR + AR * math.sin(t1))
    q0 = (XF, p0[1], TOP)
    q1 = (XF, p1[1], TOP)
    quad(p0, p1, q1, q0, [rim_c, rim_c, wall_c, wall_c])
# header top (roof over the arch header)
quad((XF, 24.0, TOP), (XF, 36.0, TOP), (TUNB, 36.0, TOP), (TUNB, 24.0, TOP),
     [SLATE2] * 4)

# --- 5.4 roof slab (slate read from above; parapets/keeps punch through)
box(-39.9, 14.1, 16.9, -21.1, 45.9, 17.5, SLATE2, mulc(SLATE2, 0.95))

# --- 5.5 THE OVEN MOUTH liner — walls/ceiling ramp stone -> deep amber
xs_w = [-21.0, -22.75, -24.5, -26.25, DISCX]
for i in range(len(xs_w) - 1):
    xa, xb = xs_w[i], xs_w[i + 1]
    ca, cb = glow_at(xa), glow_at(xb)
    # left wall (y = LYL), normal +y (into the tunnel)
    quad((xa, LYL, FLOOR_TOP), (xb, LYL, FLOOR_TOP),
         (xb, LYL, SPR), (xa, LYL, SPR), [ca, cb, cb, ca])
    # right wall (y = LYR), normal -y
    quad((xa, LYR, FLOOR_TOP), (xa, LYR, SPR),
         (xb, LYR, SPR), (xb, LYR, FLOOR_TOP), [ca, ca, cb, cb])
# ceiling barrel (radius LR), normals inward/down toward the tunnel
xs_c = [-21.0, -23.3, -25.6, DISCX]
for i in range(len(xs_c) - 1):
    xa, xb = xs_c[i], xs_c[i + 1]
    ca, cb = glow_at(xa), glow_at(xb)
    for k in range(ARC_N):
        t0 = math.pi * k / ARC_N               # theta 0 -> pi (inward winding)
        t1 = math.pi * (k + 1) / ARC_N
        y0a = AY + LR * math.cos(t0); z0a = SPR + LR * math.sin(t0)
        y1a = AY + LR * math.cos(t1); z1a = SPR + LR * math.sin(t1)
        quad((xa, y0a, z0a), (xa, y1a, z1a), (xb, y1a, z1a), (xb, y0a, z0a),
             [ca, ca, cb, cb])
# glowing back wall (x = DISCX, normal +x): CONCENTRIC radial gradient —
# hot near-white-gold core -> deep amber edges. Flat paint on the wall
# plane; the old single hot-centered fan (the "boulder" read) is gone.
disc_pts = [(DISCX, LYR, FLOOR_TOP), (DISCX, LYR, SPR)]
for k in range(1, ARC_N):
    t = math.pi * k / ARC_N
    disc_pts.append((DISCX, AY + LR * math.cos(t), SPR + LR * math.sin(t)))
disc_pts.append((DISCX, LYL, SPR))
disc_pts.append((DISCX, LYL, FLOOR_TOP))
GC_Y, GC_Z = AY, 6.0                       # glow core center (mid-opening)
inner_pts = [(DISCX, GC_Y + (p[1] - GC_Y) * 0.45, GC_Z + (p[2] - GC_Z) * 0.45)
             for p in disc_pts]
amber_edge = mulc(GOLD, 0.96)              # deep amber at the wall edges
core_ring = lerpc(GOLD, GOLD_HOT, 0.8)
do = add_verts(disc_pts, [amber_edge] * len(disc_pts))
di = add_verts(inner_pts, [core_ring] * len(inner_pts))
dc = add_verts([(DISCX, GC_Y, GC_Z)], [GOLD_HOT])
np_ = len(disc_pts)
for k in range(np_):
    j = (k + 1) % np_
    F.append((do + k, do + j, di + j, di + k))
    F.append((dc, di + k, di + j))
# floor: TIMBER PLANKING (the reference's wooden ramp road) — six plank
# strips running into the tunnel, alternating dark timber shades; the
# floor stays flat and clear for the cake drag-out.
NPL = 6
plank_rows = [TD1, TD2, TD3]
for i in range(NPL):
    ya = LYL + (LYR - LYL) * i / NPL
    yb = LYL + (LYR - LYL) * (i + 1) / NPL
    pc = vary(plank_rows[i % 3], 0.93, 1.03)
    quad((-20.8, ya, FLOOR_TOP), (-20.8, yb, FLOOR_TOP),
         (DISCX, yb, FLOOR_TOP), (DISCX, ya, FLOOR_TOP), [pc] * 4)
frim = mulc(TD1, 0.94)
quad((-20.8, LYL, BZ), (-20.8, LYR, BZ),
     (-20.8, LYR, FLOOR_TOP), (-20.8, LYL, FLOOR_TOP), [frim] * 4)
quad((-20.8, LYL, BZ), (-20.8, LYL, FLOOR_TOP),
     (DISCX, LYL, FLOOR_TOP), (DISCX, LYL, BZ), [frim] * 4)
quad((-20.8, LYR, BZ), (DISCX, LYR, BZ),
     (DISCX, LYR, FLOOR_TOP), (-20.8, LYR, FLOOR_TOP), [frim] * 4)

# --- 5.6 arch trim torus (timber voussoir band) + pilasters
XTF, XTB = -20.55, -21.2
RIN, ROUT = 6.0, 7.2
TN = 10
tr_f = TD1                       # dark voussoir band — timber, never pink
tr_o = mulc(TD1, 1.08)
tr_i = mulc(TD1, 0.82)
pin_f, pout_f, pin_b, pout_b = [], [], [], []
for k in range(TN + 1):
    t = math.pi * k / TN
    cy_, sz_ = math.cos(t), math.sin(t)
    pin_f.append((XTF, AY + RIN * cy_, SPR + RIN * sz_))
    pout_f.append((XTF, AY + ROUT * cy_, SPR + ROUT * sz_))
    pin_b.append((XTB, AY + RIN * cy_, SPR + RIN * sz_))
    pout_b.append((XTB, AY + ROUT * cy_, SPR + ROUT * sz_))
for k in range(TN):
    quad(pin_f[k], pout_f[k], pout_f[k + 1], pin_f[k + 1], [tr_f] * 4)
    quad(pout_f[k], pout_b[k], pout_b[k + 1], pout_f[k + 1], [tr_o] * 4)
    quad(pin_f[k], pin_f[k + 1], pin_b[k + 1], pin_b[k], [tr_i] * 4)
quad(pin_f[0], pin_b[0], pout_b[0], pout_f[0], [tr_i] * 4)          # cap y36 side
quad(pin_f[TN], pout_f[TN], pout_b[TN], pin_b[TN], [tr_i] * 4)      # cap y24 side
box(XTB, 36.03, BZ, XTF, 37.4, 7.35, TD2, mulc(TD2, 0.9))           # pilasters
box(XTB, 22.6, BZ, XTF, 23.97, 7.35, TD2, mulc(TD2, 0.9))

# --- 5.7 facade dressing: light string bands (contrast on the darker
#     slate walls), dark timber beam, pink banners on dark timber rods
box(-21.2, 14.0, 9.8, -20.88, 23.2, 10.5, mulc(STONE1, 0.97))
box(-21.2, 36.8, 9.8, -20.88, 46.0, 10.5, mulc(STONE1, 0.97))
box(-21.25, 18.6, 14.5, -20.75, 41.4, 15.4, vary(TD1))
for yb0, yb1 in ((19.6, 22.1), (37.9, 40.4)):                       # banners
    box(-21.05, yb0, 3.8, -20.73, yb1, 11.9, PINK1, mulc(PINK1, 0.78))
    box(-21.1, yb0 - 0.35, 11.85, -20.68, yb1 + 0.35, 12.4, TD1)

# --- 5.8 cream icing cornices + PINK drips (pink stays on the drips
#     only, so it never argues with the timber bands below)
box(-21.35, 13.9, 16.4, -20.85, 46.1, 17.1, ICING, mulc(ICING, 0.88))
box(-40.15, 13.9, 16.4, -39.65, 46.1, 17.1, ICING, mulc(ICING, 0.88))
box(-37.6, 13.78, 16.38, -23.4, 14.22, 17.08, vary(ICING, 0.96, 1.02),
    mulc(ICING, 0.87))
box(-37.6, 45.78, 16.38, -23.4, 46.22, 17.08, vary(ICING, 0.96, 1.02),
    mulc(ICING, 0.87))
for yd in (21.0, 25.2, 28.4, 31.6, 34.8, 39.0):                     # front drips
    zlo = 16.45 - (0.8 + rng.uniform(0.0, 0.6))
    box(-21.32, yd - 0.28, zlo, -20.9, yd + 0.28, 16.45,
        vary(PINK1), mulc(PINK1, 0.85))
for yd in (20.0, 26.0, 34.0, 40.0):                                 # back drips
    zlo = 16.42 - (0.7 + rng.uniform(0.0, 0.6))
    box(-40.1, yd - 0.27, zlo, -39.7, yd + 0.27, 16.42,
        vary(PINK1), mulc(PINK1, 0.85))
for xd in (-36.0, -32.4, -28.8, -25.2):                             # side drips
    zlo = 16.4 - (0.7 + rng.uniform(0.0, 0.5))
    box(xd - 0.26, 13.8, zlo, xd + 0.26, 14.24, 16.4,
        vary(PINK1), mulc(PINK1, 0.85))
    zlo = 16.4 - (0.7 + rng.uniform(0.0, 0.5))
    box(xd - 0.26, 45.76, zlo, xd + 0.26, 46.2, 16.4,
        vary(PINK1), mulc(PINK1, 0.85))

# --- 5.9 parapets + merlons (front run short — the gable owns the center)
PAR = mulc(STONE1, 0.95)
box(-22.3, Y0, 16.8, -20.95, Y1, 18.5, PAR, mulc(PAR, 0.93))
box(-40.1, Y0, 16.8, -38.75, Y1, 18.5, PAR, mulc(PAR, 0.93))
box(-38.5, 13.95, 16.8, -22.5, 15.35, 18.3, PAR, mulc(PAR, 0.93))
box(-38.5, 44.65, 16.8, -22.5, 46.05, 18.3, PAR, mulc(PAR, 0.93))
for yc in (20.7, 39.3):                                             # front pair
    box(-22.35, yc - 0.85, 18.45, -20.9, yc + 0.85, 19.75, vary(STONE2))
for yc in (20.5, 24.3, 28.1, 31.9, 35.7, 39.5):                     # back run
    box(-40.15, yc - 0.95, 18.45, -38.7, yc + 0.95, 19.75, vary(STONE2))
for xc in (-24.5, -28.5, -32.5, -36.5):                             # side runs
    box(xc - 0.95, 13.9, 18.25, xc + 0.95, 15.4, 19.45, vary(STONE2))
    box(xc - 0.95, 44.6, 18.25, xc + 0.95, 46.1, 19.45, vary(STONE2))

# --- 5.10 corner turrets with frosting caps (engaged, proud, chunky)
PH8 = math.pi / 8.0
for (tx, ty) in ((-23.5, 16.5), (-23.5, 43.5), (-37.5, 16.5), (-37.5, 43.5)):
    s1 = vary(SLATE1, 0.9, 0.98)
    s2 = vary(SLATE2, 0.97, 1.05)
    prism(tx, ty, BZ, 10.0, 2.95, 2.8, 8, mulc(s1, 0.88), s1,
          cap_top=False, phase=PH8)
    prism(tx, ty, 10.0, 21.6, 2.8, 2.65, 8, s2, mulc(s2, 1.03), phase=PH8)
    prism(tx, ty, 21.2, 21.9, 3.2, 3.2, 8, PINK1, mulc(PINK1, 1.04),
          cap_bottom=True, phase=PH8)                               # drip ring
    ang0 = math.atan2(ty - 30.0, tx + 30.5)
    for da in (-0.9, 0.0, 0.9):                                     # drip nubs
        a = ang0 + da + rng.uniform(-0.2, 0.2)
        nx, ny = tx + 3.05 * math.cos(a), ty + 3.05 * math.sin(a)
        z0n = 20.55 + rng.uniform(0.0, 0.35)
        box(nx - 0.28, ny - 0.28, z0n, nx + 0.28, ny + 0.28, 21.45,
            vary(PINK1), mulc(PINK1, 0.82))
    prism(tx, ty, 21.9, 22.5, 3.35, 3.25, 8, mulc(CREAM, 0.94), CREAM,
          cap_bottom=True, phase=PH8)                               # cap eave
    prism(tx, ty, 22.5, 24.1, 2.95, 1.85, 8, CREAM, mulc(CREAM, 1.02),
          cap_top=False, phase=PH8)
    prism(tx, ty, 24.1, 25.2, 1.85, 0.75, 8, mulc(CREAM, 1.02),
          mulc(CREAM, 1.05), cap_top=False, phase=PH8)
    cone(tx, ty, 25.2, 26.0, 0.75, 8, mulc(CREAM, 1.05), SNOW, phase=PH8)

# --- 5.11 central gable/pediment + CUPCAKE MEDALLION (no text anywhere)
gab = vary(STONE2, 0.97, 1.03)
box(-22.6, 22.5, 16.8, -20.8, 37.5, 22.7, gab, mulc(gab, 0.93))
hexa([(-22.6, 22.5, 22.55), (-20.8, 22.5, 22.55),
      (-20.8, 37.5, 22.55), (-22.6, 37.5, 22.55),
      (-22.6, 26.5, 24.9), (-20.8, 26.5, 24.9),
      (-20.8, 33.5, 24.9), (-22.6, 33.5, 24.9)], gab)
hexa([(-22.75, 22.3, 22.45), (-20.65, 22.3, 22.45),                 # pink slopes
      (-20.65, 26.6, 24.85), (-22.75, 26.6, 24.85),
      (-22.75, 22.3, 23.0), (-20.65, 22.3, 23.0),
      (-20.65, 26.6, 25.4), (-22.75, 26.6, 25.4)], PINK1)
hexa([(-22.75, 33.4, 24.85), (-20.65, 33.4, 24.85),
      (-20.65, 37.7, 22.45), (-22.75, 37.7, 22.45),
      (-22.75, 33.4, 25.4), (-20.65, 33.4, 25.4),
      (-20.65, 37.7, 23.0), (-22.75, 37.7, 23.0)], PINK1)
box(-22.75, 26.3, 24.75, -20.65, 33.7, 25.35, mulc(PINK1, 1.04))    # ridge cap
for yw0 in (24.1, 34.3):                                            # gable vents
    box(-21.0, yw0, 18.2, -20.66, yw0 + 1.6, 19.9, DARK)
    box(-21.05, yw0 - 0.15, 17.95, -20.62, yw0 + 1.75, 18.3, TD1)
# medallion: octagonal DARK timber shield + half-relief cupcake (the
# dark backing makes the pink dome pop instead of blending)
prism_x(30.0, 20.3, -21.5, -20.75, 2.7, 8, TD1,
        mulc(TD1, 1.06), phase=PH8)
prism(-21.05, 30.0, 18.55, 19.9, 0.78, 1.0, 8, mulc(CREAM, 0.85), CREAM,
      cap_bottom=True, cap_top=False, phase=PH8)                    # wrapper
prism(-21.05, 30.0, 19.9, 20.9, 1.06, 0.62, 8, mulc(PINK1, 0.95), PINK1,
      cap_bottom=True, cap_top=False, phase=PH8)                    # frosting
cone(-21.05, 30.0, 20.9, 21.8, 0.62, 8, PINK1, mulc(PINK1, 1.1), phase=PH8)
prism(-21.05, 30.0, 21.55, 21.95, 0.26, 0.2, 6, mulc(PINK1, 0.78),
      mulc(PINK1, 0.72), cap_bottom=True, cap_top=True)             # cherry

# --- 5.12 central keep + pink-cone finial
kp = vary(STONE1, 0.98, 1.05)
box(-31.0, 26.0, 16.8, -25.0, 34.0, 23.4, kp, mulc(kp, 0.92))
box(-31.3, 25.7, 23.3, -24.7, 34.3, 23.9, SLATE2)
for (kx0, kx1) in ((-31.25, -29.85), (-26.15, -24.75)):             # corner merlons
    for (ky0, ky1) in ((25.75, 27.15), (32.85, 34.25)):
        box(kx0, ky0, 23.85, kx1, ky1, 25.0, vary(STONE2))
prism(-28.0, 30.0, 23.85, 24.85, 1.15, 1.0, 8, STONE2,
      mulc(STONE2, 1.03), phase=PH8)
cone(-28.0, 30.0, 24.85, 26.35, 0.95, 8, PINK1, mulc(PINK1, 1.08), phase=PH8)

# --- 5.13 roof oven dome (the top-view pink-rimmed dome), chimneys, pipes
prism(-36.0, 30.0, 16.8, 20.6, 3.6, 2.1, 10, mulc(STONE2, 0.96), STONE2)
prism(-36.0, 30.0, 20.3, 20.9, 2.45, 2.35, 10, PINK1, mulc(PINK1, 1.04),
      cap_bottom=True)
prism(-36.0, 30.0, 20.9, 21.7, 0.85, 0.7, 8, CREAM, mulc(CREAM, 1.03),
      cap_top=False, phase=PH8)
cone(-36.0, 30.0, 21.7, 22.4, 0.7, 8, mulc(CREAM, 1.03), SNOW, phase=PH8)
for cyc in (20.5, 39.5):                                            # chimneys
    prism(-38.5, cyc, 16.8, 22.2, 1.45, 1.3, 6, SLATE1, mulc(SLATE1, 0.62))
    prism(-38.5, cyc, 21.6, 22.6, 1.65, 1.6, 6, STONE1, mulc(SLATE1, 0.55),
          cap_bottom=True)
for pyc in (22.0, 38.0):                                            # back pipes
    prism(-40.55, pyc, BZ, 18.6, 0.85, 0.85, 6, mulc(TD1, 0.95),
          vary(TD1), cap_top=False)
    prism(-40.55, pyc, 5.8, 6.5, 1.0, 1.0, 6, SLATE2, SLATE2,
          cap_bottom=True)
    prism(-40.55, pyc, 12.6, 13.3, 1.0, 1.0, 6, SLATE2, SLATE2,
          cap_bottom=True)
    prism(-40.55, pyc, 18.6, 19.3, 1.05, 1.05, 6, SLATE2,
          mulc(SLATE2, 0.9), cap_bottom=True)

# --- 5.14 low side wings + timber work + high windows on the flanks
for side in (0, 1):
    if side == 0:
        wy0, wy1, cy0, cy1, ry0, ry1 = 12.4, 14.2, 12.25, 12.95, 12.3, 14.1
        dk0, dk1, sl0, sl1 = 13.8, 14.2, 13.72, 14.28
        po0, po1 = 13.7, 14.26
        bm0, bm1 = 13.75, 14.25
    else:
        wy0, wy1, cy0, cy1, ry0, ry1 = 45.8, 47.6, 47.05, 47.75, 45.9, 47.7
        dk0, dk1, sl0, sl1 = 45.8, 46.2, 45.72, 46.28
        po0, po1 = 45.74, 46.3
        bm0, bm1 = 45.75, 46.25
    wg = vary(SLATE2, 0.95, 1.02)
    box(-37.0, wy0, BZ, -24.0, wy1, 9.2, wg, mulc(SLATE1, 0.87))    # wing
    box(-37.15, cy0, 8.55, -23.85, cy1, 9.25, mulc(ICING, 0.96),
        mulc(ICING, 0.88))                                          # icing edge
    box(-37.1, ry0, 9.15, -23.9, ry1, 9.55, SLATE2)                 # wing roof
    for nxc in (-34.2, -30.6, -27.0):                               # wing nubs
        z0n = 7.55 + rng.uniform(0.0, 0.4)
        box(nxc - 0.26, cy0 + 0.05, z0n, nxc + 0.26, cy0 + 0.65, 8.6,
            vary(PINK1), mulc(PINK1, 0.85))
    box(-35.5, bm0, 14.5, -25.5, bm1, 15.4, vary(TD1))              # flank beam
    box(-31.55, po0, 2.2, -30.65, po1, 15.05, vary(TD2))            # flank post
    for wx0 in (-35.2, -27.6):                                      # high windows
        box(wx0, dk0, 10.4, wx0 + 1.7, dk1, 12.6, DARK)
        box(wx0 - 0.12, sl0, 10.12, wx0 + 1.82, sl1, 10.48, TD1)

# --- 5.15 back timber bands (dark framing, matching the front)
box(-40.25, 18.6, 8.0, -39.75, 41.4, 8.9, vary(TD1))
box(-40.25, 18.6, 14.5, -39.75, 41.4, 15.4, vary(TD2))

# ---------------------------------------------------------------------------
# 6. One mesh, one object; flat shading; existing "vtx" by reference (§4)
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
obj.location = (0.0, 0.0, 0.0)       # mesh authored in world coords
obj.rotation_euler = (0.0, 0.0, 0.0)
obj.scale = (1.0, 1.0, 1.0)
bpy.context.view_layer.update()

# ---------------------------------------------------------------------------
# 7. Self-validation (§8.5) + the commissioned WINDING audit
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
        and len(mesh.vertices) == len(V) and len(mesh.vertices) > 0):
    checks["color_attr"] = True
else:
    checks["color_attr"] = (
        "Col attr wrong or validate() changed counts: %d data / %d verts / "
        "%d authored" % (0 if ca_chk is None else len(ca_chk.data),
                         len(mesh.vertices), len(V)))

tri_count = sum(len(p.vertices) - 2 for p in mesh.polygons)
checks["budget"] = (
    True if tri_count <= BUDGET
    else "%d tris > budget %d" % (tri_count, BUDGET))

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
        "bbox x %.2f..%.2f y %.2f..%.2f zmax %.2f outside x %s y %s cap %.0f"
        % (min_x, max_x, min_y, max_y, max_z, ZONE_X, ZONE_Y, ZONE_ZMAX))

target_base = ground_z - SINK
if (abs(min_z - target_base) <= 0.5
        and abs(min_z - (ground_center - SINK)) <= 0.5):
    checks["grounded"] = True
else:
    checks["grounded"] = (
        "base z %.2f vs raycast ground-0.3 = %.2f (center %.2f)"
        % (min_z, target_base, ground_center - SINK))

rot_ok = all(abs(r) < 1e-6 for r in obj.rotation_euler)
scl_ok = all(abs(s - 1.0) < 1e-6 for s in obj.scale)
checks["transforms_clean"] = (
    True if (rot_ok and scl_ok)
    else "rot %s scale %s" % (tuple(obj.rotation_euler), tuple(obj.scale)))

checks["no_modifiers"] = (
    True if len(obj.modifiers) == 0
    else "%d modifiers" % len(obj.modifiers))

# --- WINDING (commissioned extra): exterior-visibility BVH ray audit.
# The render truth three.js cares about: NO first-hit face seen from
# outside the building (including rays entering the oven mouth) may be
# back-facing. Blender's viewport is double-sided and cannot catch this.
deps_w = bpy.context.evaluated_depsgraph_get()
bvh = BVHTree.FromObject(obj, deps_w)
wrng = random.Random(1234)
centers = [p.center.copy() for p in mesh.polygons]
ctr = Vector((-30.5, 30.0, 10.0))
hits = 0
backfaces = 0
bad_sample = None
viewpoints = []
for k in range(18):
    az = 2.0 * math.pi * k / 18.0
    for el, rad in ((0.06, 90.0), (0.35, 85.0), (0.9, 70.0)):
        viewpoints.append(ctr + Vector((math.cos(az) * math.cos(el),
                                        math.sin(az) * math.cos(el),
                                        math.sin(el))) * rad)
viewpoints.append(ctr + Vector((0.0, 0.0, 70.0)))
for vp in viewpoints:
    for _ in range(40):
        tgt = Vector(centers[wrng.randrange(len(centers))])
        tgt += Vector((wrng.uniform(-0.15, 0.15), wrng.uniform(-0.15, 0.15),
                       wrng.uniform(-0.15, 0.15)))
        d = tgt - vp
        if d.length < 1e-6:
            continue
        d.normalize()
        loc, nrm, idx, dist = bvh.ray_cast(vp, d, 600.0)
        if loc is None:
            continue
        hits += 1
        if nrm.dot(d) > 1e-3:
            backfaces += 1
            if bad_sample is None:
                bad_sample = (idx, tuple(round(v, 2) for v in loc))
# oven-mouth probes: rays through the opening at the liner surfaces
probe_origins = [Vector((-2.0, py, pz))
                 for py in (25.0, 27.5, 30.0, 32.5, 35.0)
                 for pz in (1.0, 4.0, 8.0, 11.5)]
probe_targets = [Vector(t) for t in (
    (-26.0, LYL + 0.02, 3.0), (-26.0, LYR - 0.02, 3.0),
    (-24.0, LYL + 0.02, 5.5), (-24.0, LYR - 0.02, 5.5),
    (DISCX + 0.05, 30.0, 6.0), (DISCX + 0.05, 27.0, 3.0),
    (-25.0, 30.0, SPR + LR - 0.05), (-23.0, 27.0, 12.0),
    (-23.0, 33.0, 12.0), (-24.0, 30.0, FLOOR_TOP + 0.02),
    (-26.5, 32.0, FLOOR_TOP + 0.02))]
for vp in probe_origins:
    for tgt in probe_targets:
        d = (tgt - vp)
        d.normalize()
        loc, nrm, idx, dist = bvh.ray_cast(vp, d, 600.0)
        if loc is None:
            continue
        hits += 1
        if nrm.dot(d) > 1e-3:
            backfaces += 1
            if bad_sample is None:
                bad_sample = (idx, tuple(round(v, 2) for v in loc))
checks["winding"] = (
    True if (hits >= 200 and backfaces == 0)
    else "%d/%d first-hits back-facing (sampled %d, first bad %s)"
         % (backfaces, hits, hits, bad_sample))

CLEAR_W = LYR - LYL                       # 11.84
CLEAR_H = (SPR + LR) - FLOOR_TOP          # 12.84
result = {
    "status": "pass" if all(v is True for v in checks.values()) else "fail",
    "created": created,
    "checks": checks,
    "notes": (
        "THE SIEGE BAKERY, paint revision 1: %d tris (budget %d), "
        "footprint x %.1f..%.1f y %.1f..%.1f, apex %.1f m. OVEN MOUTH "
        "clear %.2f x %.2f m, recessed %.1f m, timber-plank floor at "
        "ground, tunnel blob removed — back wall is a flat concentric "
        "glow (hot white-gold core -> deep #C98A2B amber edges), "
        "walls/ceiling ramp amber-at-back -> stone-at-rim, no emissive. "
        "Value pass: slate-row walls with darker feet, road-dirt plinth "
        "band, light stone reserved high, all timber framing ~12%% "
        "darker, cornices cream icing; pink only on banners/drips/"
        "medallion dome/drip rings/ridge+finial. %d winding rays all "
        "front-facing. Ground raycast min %.2f / center %.2f, base "
        "sunk 0.3." % (tri_count, BUDGET, min_x, max_x, min_y, max_y,
                       max_z, CLEAR_W, CLEAR_H, abs(DISCX - XF),
                       hits, ground_z, ground_center)),
}
print(result)
