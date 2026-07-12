# Research 18 — REGION STRUCTURE RULES (the builder's brief)

**Status: AUTHORED 2026-07-11 (fifteenth session). This document is
SELF-CONTAINED ON PURPOSE: it is the complete brief handed to any
builder — a dispatched agent, a future session, or a script — who adds
an object to the region. If you are a builder holding a COMMISSION
(§10), everything you need is here; you do not need repo access beyond
this file. Sources of record behind it: project/blender/region.blend
(the scene), research/16-art-bible.md (the art), plans/16 slice 4.75
(the milestone slice). Palette hexes in §5 were machine-sampled from
the .blend's vertex colors, not eyeballed.**

## 1. How building works (the loop)

1. The session issues a COMMISSION (§10): object name(s), band, build
   zone, tri budget, brief.
2. The builder writes ONE self-contained Python script for Blender's
   `bpy` API, conforming to THE SCRIPT CONTRACT (§8). The script
   builds the object AND validates itself, ending with a pass/fail
   `result` dict. Scripts live at `project/blender/region-scripts/
   <object_name>.py` (git-tracked — they are provenance).
3. The session runs the script in the open region.blend via Blender
   MCP, checks `result`, renders `check_cam`, and reviews like an art
   director. Fail or ugly → feedback → revise the script → rerun
   (idempotence makes reruns free).
4. Accepted objects accumulate in region.blend. Export to the game
   (§9) happens in batches, by the session, never by a script.

## 2. The world (what you are building into)

A candy-fantasy valley. At its center: a flat walled arena where dwarf
bakers fire catapults of toppings at a giant cake, watched by a 36 m
ogre patron standing outside the walls. A dirt GIANTS' ROAD runs from
the ogre's table to the +x horizon (a queue of giant patrons will
stand on it). A rolling meadow skirt surrounds the arena; three
hamlets sit in the middle distance; two rings of faceted peaks close
the horizon, with THE HERO MOUNTAIN — a dwarf castle carved into its
flank — owning the view past the cake. A gradient sky dome with seven
cumulus clusters roofs everything. Style: chunky, toy-like, flat-
shaded low-poly, everything friendly (nothing grim, nothing grunge —
the world of a storybook bakery).

### Geography of record (BLENDER coordinates, meters)

| Thing | Where (blender x, y, z) |
|---|---|
| Arena slab (flat, sacred) | x −40..40, y −18..78, z = 0 |
| Cake | (0, 30), r 4, h 5 |
| Ogre patron (36 m) | (21, 30), feet z 0 |
| Giants' road | y 26..60, x 21..311 (runs +x) |
| Post eye (the camera that judges everything) | (1.5, 11, 1.6) looking +y |
| West hamlet `mid_town_west` | x −134..−104, y −20..42, h 23.5 |
| Road hamlet `mid_town_road` | x 118..188, y 81..130, h 23.5 |
| South hamlet `mid_town_south` | x 30..91, y 146..193, h 23.5 |
| Inner peak ring `far_range_inner` | r ~260, peaks to 60 |
| Outer peak ring `far_range_outer` | r ~320, peaks to 87 |
| Hero mountain `far_mountain_hero` | centered (−55, 345), summit 135 |
| Dwarf castle `far_castle` | (−55, 296), z 34..92 (in the hero flank) |
| Sky dome | r ~430 centered (0, 30) |
| Clouds | z 115..225 |
| Meadow skirt `near_skirt` | x ±320, y −290..350, ROLLS z −5..+3.4 |

**Coordinate map (pinned):** blender (bx, by, bz) → game (bx, bz, −by).
Worked example: the ogre at blender (21, 30, 0) is game (21, 0, −30).

**The meadow rolls.** Ground height off the arena slab varies −3.5 to
+1.3 m. NEVER assume z=0 — raycast the skirt at your site (§7 has the
snippet) and sink your base 0.3 m into it.

## 3. The atmosphere contract (name prefixes ARE the runtime contract)

The game reads each mesh's NAME PREFIX and applies a treatment
(scene.ts `backdropTreatment`, pinned by tests):

- `near_` / `mid_` — LIT (scene lights) and FOGGED (fog runs 80→280
  game meters from the player). Paint TRUE LOCAL COLOR; the engine's
  fog supplies the haze. Use `near_` for terrain-connected features by
  the arena, `mid_` for standalone structures ~60–220 m out.
- `far_` / `sky_` — UNLIT and FOG-EXEMPT. Their haze must be BAKED
  into the vertex colors (that's why §5's far palette runs pale and
  blue — aerial perspective is painted, not computed). Use `far_` only
  for horizon silhouettes 250 m+, `sky_` only for the dome/clouds.
- An unknown prefix degrades to "lit" — never invisible, but WRONG.
  Use the prefixes.

One object = one prefix = one band. If a commission says `mid_`, the
whole object lives in the mid band.

## 4. The material and color law

- **One material for everything: `vtx`** (it already exists in the
  .blend). Assign it by reference — `bpy.data.materials["vtx"]` —
  NEVER create a material, image, or texture. (`vtx_unlit` also exists
  for in-Blender sky preview; scripts don't touch it.)
- **All color is vertex color**: a color attribute named `Col`,
  type `FLOAT_COLOR`, domain `POINT`. Every vertex painted — an
  unpainted vertex exports black.
- **Values are LINEAR floats.** The §5 hexes encode the raw linear
  values stored in the attribute — convert hex→float and write them
  verbatim (`int(h,16)/255`). Do NOT run them through sRGB conversion
  and do NOT color-match by Blender's color-picker hex field (the
  picker applies sRGB and will betray you).
- **No textures, no UVs, no smooth shading, no subsurf.** The region
  is flat-shaded faceted geometry with painted verts. Color variation
  comes from painting face-zones differently, not from maps.

## 5. Palette of record (linear hex, machine-sampled from the .blend)

Stay inside these families; small variations (±10%) for shading zones
are fine and encouraged. New accent colors are a session ruling, not a
builder's choice.

**Meadow & ground (near_)**
| Use | Hex |
|---|---|
| Meadow green (dark / mid / light) | #305820 / #386028 / #386830 |
| Road dirt (dark / mid / light) | #605850 / #686058 / #706860 |

**Structures (mid_)**
| Use | Hex |
|---|---|
| Wall cream (west hamlet) | #C8C8B8 |
| Wall stone (road/south hamlets) | #B0B8C0 / #B8C0C0 |
| Timber / roof brown-reds | #886060 / #806870 / #786878 |
| Brand pinks (roofs, banners, caps) | #B87890 / #A88098 / #A080A0 |
| Slate | #788898 / #808898 |

**Horizon (far_ — haze pre-baked, note it PALES with distance)**
| Use | Hex |
|---|---|
| Hero mountain rock / snow | #405070, #384868 / #D8E8F8 |
| Inner ring rock / snow | #405878, #486080 / #C0D8F0 |
| Outer ring rock / snow | #487098, #507098 / #A0C0E0 |
| Castle stone / pink cone caps | #585868 / #C07888 |

**Sky (sky_)**
| Use | Hex |
|---|---|
| Dome zenith → horizon | #3070D0 → #B0D0F0 |
| Clouds (shadow → sunlit) | #D0D8E8 → #F8F8F8 |

## 6. Silhouette and style law

- **Silhouette first.** Everything is judged from the post eye at
  (1.5, 11, 1.6) — a low camera 100–300 m away. If the outline
  doesn't say what the object is, no amount of detail will.
- **Chunky toy proportions**: oversized roofs, fat chimneys, thick
  blades, no thin spindles (a strut under ~0.4 m wide vanishes at mid
  distance).
- **Theatrical scale**: mid-band structures are authored BIGGER than
  plausible so they read — the existing hamlet buildings run 10–23 m
  tall. Match your neighbors, not real-world scale.
- **Color blocks, not geometry**: at 150 m, three well-chosen color
  zones beat 500 extra triangles. Two to four color zones per object.
- **Budgets are small** (each commission states one). Reference: a
  whole hamlet is ~150 tris; the entire outer mountain ring is 176.
- **Tone guard**: friendly and edible-looking. No ruins, spikes,
  skulls, or grime. Pink is the brand — one pink accent per structure
  is a good instinct (banners, roof trim, caps).

## 7. Placement law

- Build ONLY inside your commissioned zone (a blender-space rectangle
  + height cap). The zone was chosen to respect the standing
  exclusions — the arena slab, the giants' road corridor (y 20..66
  where x > 15), and the post→castle vista — so inside-the-rect is
  all you owe.
- **Ground by raycast**, then sink the base 0.3 m:

```python
import bpy
from mathutils import Vector
deps = bpy.context.evaluated_depsgraph_get()
hit, loc, *_ = bpy.context.scene.ray_cast(
    deps, Vector((x, y, 50.0)), Vector((0, 0, -1.0)))
ground_z = loc.z if hit else 0.0   # place base at ground_z - 0.3
```

- Object transforms ship CLEAN: rotation (0,0,0), scale (1,1,1),
  location free (apply rotation & scale before finishing). The mesh
  data carries the shape.

## 8. THE SCRIPT CONTRACT (pass/fail)

A commission script is ONE Python file, run inside the open
region.blend via Blender MCP (`bpy` available, Blender 4.x). It must:

1. **Declare owned names**: `OWNED = ["mid_example"]` — every object
   it creates, nothing else. Names carry the commissioned prefix.
2. **Be idempotent**: first delete any existing OWNED objects (and
   their mesh datablocks) so a rerun replaces cleanly.
3. **Build** the object(s): `bmesh` / `from_pydata` preferred;
   `bpy.ops` primitives allowed if you manage selection/active state.
   JOIN parts into one mesh per owned name. Apply all modifiers and
   rotation/scale. Assign `bpy.data.materials["vtx"]`. Paint every
   vertex via a `Col` FLOAT_COLOR POINT attribute with §5 linear
   values. Flat shading.
4. **Never**: save the file; export; change render/scene settings;
   create materials, images, or textures; modify, delete, or reparent
   any object outside OWNED (ref_*/check_* are radioactive); leave a
   non-OBJECT mode; do file or network I/O; use unseeded randomness
   (`random.seed(<fixed int>)` if you need noise — reruns must be
   identical).
5. **End with self-validation** assigning a `result` dict:

```python
result = {
    "status": "pass",            # or "fail"
    "created": [...],            # the OWNED names actually in the scene
    "checks": {                  # each True/False (or a detail string on fail)
        "names_prefixed": ...,   # every OWNED name carries the band prefix
        "no_strays": ...,        # scene object set changed ONLY by OWNED
                                 # (snapshot set(bpy.data.objects) first)
        "material_vtx": ...,     # slots == [the existing "vtx"], no new mats
        "color_attr": ...,       # "Col", FLOAT_COLOR, POINT, on every mesh
        "budget": ...,           # summed polys <= commission budget
        "zone": ...,             # world bbox inside commission rect + cap
        "grounded": ...,         # base within 0.5 m of raycast ground - 0.3
        "transforms_clean": ..., # rot (0,0,0), scale (1,1,1)
        "no_modifiers": ...,     # modifier stacks empty
    },
    "notes": "anything the reviewer should know",
}
```

`status` is "pass" only if EVERY check passes. A failing script that
says so honestly is a good script; the session fixes and reruns.
The script's pass is the FIRST gate — the session's `check_cam`
render and eye review is the second. Passing validation does not
mean accepted; it means reviewable.

## 9. Export recipe (SESSION-ONLY — scripts never do this)

Select `near_`/`mid_`/`far_` meshes → export region.glb; `sky_` →
sky.glb. GLB, `use_selection`, `export_apply`. `ref_`/`check_` never
export. Sky meshes must carry the lit `vtx` material at export time so
COLOR_0 rides, and need `visible_shadow=False` or EEVEE renders black.
Ship to `public/models/`; verify in-game (far_/sky_ must arrive as
MeshBasicMaterial fog:false vertexColors:true; near_/mid_ as
MeshStandardMaterial fog:true) — scene.test.ts pins the treatment.

## 10. Commission template

```
COMMISSION: <owned object name(s), prefix included>
BAND: near_ | mid_ | far_
ZONE: x <min>..<max>, y <min>..<max> (blender), height cap <z> m
BUDGET: <n> tris total
BRIEF: <what it is, silhouette notes, palette rows, one pink accent?>
DELIVER: project/blender/region-scripts/<name>.py per §8
```

## Ledger

- 2026-07-11: doc authored; first trial commission: `mid_mill_west`
  (flour windmill for the west hamlet) — ACCEPTED, 183 tris, 9/9
  checks on first live run.
- 2026-07-11: THE FIRST FLEET (five Sonnet agents in parallel, each
  holding this doc + one commission; all five passed 9/9 live on the
  first run): `mid_milestone_road` (100 tris, leaning octagon stone),
  `mid_giant_bench` (60 tris, seat at 7 m for 36 m patrons),
  `mid_orchard_west` (416 tris, 8 trees, 3 in cherry blossom),
  `mid_granary_road` (136 tris, silo + lean-to), `mid_pines_south`
  (216 tris, 8 conifers, deliberately no pink — the hamlet's roofs
  carry it). Exported: region.glb 1.8 → 1.95 MB. In-game smoke:
  all six arrive MeshStandardMaterial fog:true vertexColors:true,
  positions match the coordinate map, zero console errors.
- 2026-07-11: THE SECOND FLEET (five more Sonnet agents, ten-for-ten
  across both fleets, still zero rework): `mid_mill_south` (216 tris,
  8-sided 15.5 m sibling, blades 18° off-axis, pink pennant instead
  of tip trim), `mid_fields_south` (308 tris, 4 wheat plots + 5
  haystacks — SESSION-RULED accent: wheat gold #C98A2B + straw
  #D8B878, the first §5 palette extension), `mid_milestone_east`
  (190 tris, stout cairn sibling, pink collar HIGH on the neck —
  the lesson from the west sibling's weak plinth accent applied),
  `mid_watchtower_west` (148 tris, corbel gallery + pink cone tying
  the far castle's language into the mid band), `mid_orchard_road`
  (312 tris, 6 staggered roadside trees, 2 in blossom). region.glb
  1.95 → 2.04 MB. In-game smoke: all five lit+fogged, positions on
  the map, zero console errors. Known soft spot: the gold plots read
  faintly from the post eye (thin slabs + meadow roll) — they earn
  their keep from any elevated angle.
