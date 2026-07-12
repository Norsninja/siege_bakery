# Research 19 — DESSERT MODEL SPECS (the casting brief for the visionary's image runs)

**Status: AUTHORED 2026-07-11 (fifteenth session), for the visionary's
external generation runs (meshy road, art bible §10). Two tracks: the
PLAYABLE dessert (slice 5 territory — hard sim constraints) and
AMBIANCE desserts (pure props — loose). Every model that comes back
rides: import audit → `npm run diet -- <name>` → the loader seam.**

## 0. The one law that shapes everything

**The playable cake is DATA, not a model.** Every deal ships a
DessertSpec — a list of concentric cylindrical tiers with per-rung
radii and heights (cake-1, cake-2, cake-3, cake-4/5/6, the cupcake —
src/core/dessert.ts). The renderer rebuilds the dessert per deal from
those numbers, and the colliders/census/splat laws are measured
against them. So:

- A fixed "beautiful 3-tier cake" model can NEVER be the playable
  cake — it fits exactly one row and lies about every other.
- The playable upgrade is a **scalable TIER DRUM** (Track A) that the
  client stacks per spec — one model, any cake.
- Whole finished cakes are still wanted — as **ambiance props**
  (Track B), where they're free of the sim entirely.

## Track A — THE PLAYABLE TIER DRUM (hard constraints)

**Subject:** ONE round cake tier — a cylindrical drum of sponge with
pink drip frosting flowing over the top rim, cream sides. The client
will stack N of these, each non-uniformly scaled (radius vs height
separately) to the deal's exact tier numbers.

**Generation constraints (these are sim law, not taste):**

1. **Straight vertical cylinder silhouette.** The collider IS a
   cylinder of the spec's radius. Drips hug the wall — nothing may
   bulge past ~5% of the radius (a fat overhang puts picture where
   no collider is; splats would float on air beside it).
2. **Flat, calm top face.** The game paints frosting splats and
   settles toppings ON the top surface. Sculpted swirls, roses, or
   piled decoration would interpenetrate the accumulating frosting.
   Drip detail lives on the RIM and SIDES; the top is a clean, gently
   convex plate at most.
3. **Proportions: 2:1 diameter to height** (author at r=1 m, h=0.5 m
   or any equivalent — the anchor tier is radius 4, height 2). It
   will be squashed/stretched per tier (tier heights run 1.5–2 m,
   radii 0.3–4 m), so drip shapes should be forgiving of moderate
   non-uniform scaling — organic blobby drips survive this; precise
   geometric patterns don't.
4. **Radially seamless** — viewed from every side, no "front".
5. **No toppings baked in** — no cherries, no sprinkles on the model.
   Toppings are GAMEPLAY; they arrive by catapult.

**Variants:** 2–3 drums (drip pattern / sponge tone differences) so a
six-tier cake doesn't visibly repeat. Same constraints each.

**The cupcake row** (its own model, optional): the CUPCAKE spec is one
fixed squat tier (radius 1.2, height 1.5 — proportions ~1.6:1
diameter:height). A dedicated cupcake model (pleated wrapper below,
low gentle frosting dome above) may replace the drum for that row.
Same top-face law: the swirl stays LOW and broad — splats land on it.

**Palette (art bible §3):** frosting pink #F2A0BE / drips #E87FA8,
cream/icing #F6EFE3, sponge interior warm #D8A45C family (the current
render's tier ramp). Matte, hand-painted.

**Ambition check:** slice 5 may still ship as a material pass on the
procedural cylinders if the drum generations disappoint — the drum is
the upgrade path, not a dependency. Wiring either way is a build
session with render-contract pins (scene.test.ts culture); the specs
here are only for the image runs.

## Track B — AMBIANCE DESSERTS (display props, zero systems)

Finished showpiece desserts, placed as dressing. Two scale homes, one
model each (scale is set at import by arithmetic, so a good model
serves both):

- **Dwarf-scale** (pantry shelves, lobby, town tables): 0.3–0.8 m.
- **Giant-scale** (the region: roadside, the giant's picnic table —
  mid_giant_table_road already seats a plate): 2–8 m, theatrical.

**The casting list (pick any; ranked by ambiance-per-effort):**

1. **THE CELEBRATION CAKE** — the concept art's own three-tier
   pink-drip cake, FINISHED: cherries, sprinkles, drips, maybe a
   candle. The diegetic wink: this is what a DELIGHTED verdict's cake
   looked like. Home: lobby centerpiece, or giant-scale by the road.
2. **FRUIT PIE** with lattice top, cherry-red filling glimpsed
   through the weave, golden crust (#C98A2B family — the ruled gold).
3. **DONUT STACK** — 3–4 pink-glazed donuts, slightly off-axis
   stack, sprinkle flecks painted on.
4. **GIANT CUPCAKE** — wrapper + swirl + one cherry (the brand mark
   made edible; rhymes with every pennant and bib in the game).
5. **ECLAIR / CREAM HORN** — a long dessert for variety of
   silhouette on shelves.
6. **JELLY DOME** — a wobbling-looking dome pudding with a cherry
   crown, cream base plate.

**Constraints (loose — these are props):** single static object, no
articulation (the meshy boundary: organic/static is exactly meshy's
lane); sits naturally on its base; no text anywhere (in-art text is
never canon, art bible §6); chunky, rounded, huggable-edible (style
words §5); matte finish.

## Image-run specs (both tracks — what to actually generate)

- **Radially symmetric subjects** (tier drum, cupcake, jelly dome,
  donut stack): ONE three-quarter view is enough for meshy; a second
  top view helps the drum (its top-face flatness matters).
- **Asymmetric subjects** (pie, eclair, celebration cake if it gets
  a front): the four-view turnaround (front/back/left/right) in the
  format already proven in project/blender/dwarf/ etc.
- **Neutral pale background, flat even light, no cast shadows, no
  props, no scene** — the generator reads everything in-frame as the
  object.
- **Matte, low-contrast hand-painted look in the PROMPT** — glossy
  source images generate glossy roughness maps (the SHINY TRAP, art
  bible §10; every shiny import costs a roughness-lift fix). Ask for
  "matte clay / hand-painted toy" finish explicitly.
- **No fine repeated geometry** (individual sprinkles as geometry,
  thin lattice under 5 cm at world scale) — paint it on instead;
  meshy fuses fine detail into noise.

## The pipeline when they come back (unchanged, for reference)

1. Import audit (art bible §10): origin at base, front −Y where a
   front exists, scale by arithmetic to the target size.
2. `npm run diet -- <name>` — drops meshy's black emissive, caps
   textures, JPEG q90, hard-fails on node renames.
3. Through the loader seam with a primitive fallback, forever.

**Budget note:** dist sits at 21 MB against the ~25 MB alarm, and
audio (11.3 MB, pre-diet) is the fat block. Dieted props land
~0.5–2.5 MB each — figure FOUR to SIX new dessert props of headroom
before the audio bitrate pass stops being optional. The tier drum is
the priority spend; ambiance props follow as budget allows.

## Ledger

- 2026-07-11: authored (fifteenth session) while fleet 3 built the
  region; visionary generating images externally.
