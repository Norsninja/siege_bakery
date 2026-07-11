# Research 16 — THE ART BIBLE (concept art of record)

**Status: IMAGES IN REPO 2026-07-09 — the concept art of record lives
at `project/concept/` (the visionary's chosen home; captures go to
`project/concept/captures/`):
- `SiegeBakeryConcept.png` — the main courtyard beauty shot (§1–§7).
- `dwarf_four_angles.png` — the dwarf TURNAROUND SHEET (§9).
Build sessions: Read both images directly before modeling anything.
Palette hexes below are eyeball approximations; re-sample from the
files. Proportion numbers are proposals — bless or amend in the
plans/16 §6 walk.**

## 1. What the image is

A courtyard scene: dwarf engineer-chef beside a wooden catapult
(bucket = a giant wooden spoon holding a cream bun), labeled ammo
crates in the foreground, a three-tier pink-drip cake on a stone
platform, and THE GIANT PATRON looming behind the walls — fork and
knife in hand, cupcake-emblem bib, delighted, a heart in a speech
bubble. "SIEGE BAKERY" carved-wood arch sign upper left; stone bakery
keep with a roaring hearth; snowy mountain; pink cupcake pennants
everywhere.

## 2. Canonical elements (visionary-approved: giant, dwarf, colors)

- **THE GIANT PATRON**: friendly ogre — big soft face, small eyes,
  huge grin, warm tan skin, short brown hair. Props: oversized FORK +
  KNIFE (held upright, eager — never menacing), white BIB with the
  pink cupcake emblem. Reaction channel shown in the art: a SPEECH-
  BUBBLE ICON (heart). Tone guard holds: he is hungry and delighted,
  a customer, not a threat.
- **THE DWARF BAKER**: engineer-chef hybrid — white chef's TOQUE with
  brass GOGGLES resting on it, enormous ginger beard, double-breasted
  white chef coat, leather belt with CUPCAKE BUCKLE, pouches, gloves,
  boots; WRENCH in hand. The class fantasy in one silhouette: half
  pâtissier, half siege engineer.
- **THE MACHINE**: heavy timber + bolted iron plates, rounded chunky
  proportions, rope-wrapped winch drum, wooden wheels; the throwing
  arm ends in a GIANT WOODEN SPOON (the bucket). A hanging carved
  sign on the frame: "FROSTING LAUNCHER" — machines wear diegetic
  nameplates.
- **THE DESSERT**: three tiers, cream body, PINK DRIP frosting,
  cherries + sprinkles on top — matches the shipped three-tier test
  cake's geometry. Lives on a round STONE PLATFORM dressed with
  cupcake banners.
- **THE AMMO**: labeled wooden crates and barrels — SPRINKLES,
  CHERRY BOMBS, CREAM PUFFS, WHIPPED CREAM barrels, open pink
  frosting barrels. Siege-pun naming ("cherry bombs") is canon
  vocabulary.
- **THE WORLD**: gray stone keep + walls, warm wood, a big arched
  HEARTH with live fire, pink pennant banners with the cupcake
  emblem, cobblestone ground, snowy mountain + blue sky backdrop,
  and a practice TARGET BOARD (red/white bullseye on an easel).

## 3. Palette (eyeball hexes — re-sample from the real file)

- Frosting pink (the brand color): #F2A0BE / drips #E87FA8
- Cream/icing white: #F6EFE3
- Warm wood: #8A5A33 mid / #5E3A20 dark
- Iron fittings: #7C8087 (cool gray, rounded bolts)
- Stone: #9AA0A6 walls / #B9BDC2 light
- Cherry red: #C6252E
- Sky blue: #6FB7E8
- Gold/brass accents (goggles, sign trim): #C98A2B
- Beard ginger: #C96A2E
- Sprinkle accents: the GRAIN_PALETTE already in code is a close
  cousin — reconcile, don't duplicate (shots-view.ts).

Note vs the shipped HUD tone: the ninth-session DOM went bright
pink/cyan "Vegas." The concept art is WARMER — pink + cream + wood,
sky-blue not cyan. These can coexist (world = warm storybook, HUD =
bright candy neon) but it is a RULING to record deliberately, not an
accident (plans/16 §6 walk: add this as ruling 7).

## 4. Proportion chart (PROPOSALS, in meters — bless before modeling)

- Dwarf baker: 1.2 m tall (chunky, ~3 heads) — **AMENDED 2026-07-10
  (twelfth session, live finding): the SIM's baker predates this
  number — a 1.7 m capsule, eye at 1.5 m — and the sim is the truth
  (the cake precedent). The first two-client run had the local eye
  towering 0.3 m over the other dwarf's toque. The dwarf stays
  AUTHORED at 1.2 m; the ghost body scales to the capsule in code
  (ghosts.ts DWARF_VISUAL_SCALE, derived from core constants), so
  crews meet eye to eye. On-screen dwarf height is therefore ~1.7 m;
  crates/catapult still read right (hip-high, chest-high).**
- Catapult: ~2.5 m at the A-frame apex, ~3.5 m long
- Cake: matches existing sim geometry (the art's three tiers ≈ the
  shipped cake-3 — the sim is the truth, art conforms to colliders)
- THE GIANT: **20+ m — RULED 2026-07-10** after the graybox camera
  lineup (12/16/20 m from the catapult post, cake-3 reference at the
  plinth): 12 m reads "big person"; 20 m makes the cake HIS dessert;
  framing survives past 20. "Fantastic scale makes it fun." He
  stands OUTSIDE the town walls (never in a town), leaning over
  toward the table; the QUEUE of waiting patrons recedes behind him,
  also outside the walls. The loom lives in the lean and the bulk as
  much as the height.
- Crates: hip-high to the dwarf (~0.7 m) — readable labels at a
  sprint.

## 5. Style words

Chunky. Toy-like. Rounded edges everywhere (even iron plates have
soft corners). Oversized fasteners — bolts the size of buns. Hand-
painted low-contrast textures, no grunge, no photorealism. Warm
storybook light. Everything looks EDIBLE or HUGGABLE except the
stone, and even the stone is friendly.

## 6. What the image SETTLES beyond the approved three

- **Machines wear carved nameplate signs** — diegetic labeling; a
  future signpost pass has its art language. THE TEXT IS NOT CANON
  (visionary, 2026-07-09): "Frosting Launcher" is wrong — the machine
  lobs ALL toppings. "Topping Launcher" is technically right; a
  funnier name is welcome, and per-machine names (artillery pieces
  get christened) are open ground. Naming is the visionary's.
- **Crates are labeled in-world** — pantry legibility without
  tutorial text; the decoy-crate gag (plans/03 lime lesson) gets its
  visual form: hurried hands grab the wrong LABELED crate.
- **Patron reactions can be SPEECH-BUBBLE ICONS** (the heart) — a
  cheap, distance-readable reaction channel that complements the
  existing flash-text lines; candidate vocabulary: heart (delighted),
  steam/scowl (grumble), drool (hungry), question mark (nag).
- **The lobby target board** — the warmup sandbox gains its prop; a
  bullseye easel by the practice yard says "shoot me" without a word.
- **The logo exists**: "SIEGE BAKERY" in chunky cream-on-wood carved
  letters, cupcake emblem. Slice 8's title treatment is half-designed;
  the name question (plans/16 §6 ruling 4) now has the art voting FOR
  keeping the working title.
- **The cupcake emblem is the BRAND MARK** — it appears on the sign,
  banners, the giant's bib, the dwarf's buckle. Use it everywhere a
  logo would go.

**GENERAL LAW (visionary, 2026-07-09): the art is REFERENCE, not
scripture — adhere to the approved elements (giant, dwarf, colors,
the settled items above) but every in-image TEXT and incidental
detail is negotiable. Confirmed keepers: the pantry labels idea, the
speech-bubble emoji for the giant.**

## 7. What the image does NOT settle (open art ground)

- The LINE of patrons (plans/16 slice 3): only one giant appears;
  variety (re-tint vs distinct) remains §6 ruling 1.
- Patron FEMALE/other silhouettes, and the second town's identity.
- Verdict poses beyond delight (REFUSED and HUNGRY have no reference
  — keep them huffy/mournful per the tone guard).
- The winch/traverse/lever POSTS' visual form (the art shows the
  machine idle, unmanned).
- Night/weather/mood variants; the arena's actual layout (the art is
  a beauty shot, not a map).
- First-person hands (§6 ruling 3) — no reference.

## 8. Working notes for slice 1 (pipeline proof)


The crates are the ideal first asset: tiny, textured, label-bearing
(tests text-on-mesh workflow), instanced many times, and immediately
visible in the pantry. The giant is the LAST thing to model, not the
first — by then the pipeline conventions (units, axes, export, load
seam, fallbacks) are proven on cheap geometry.

**PROVEN 2026-07-10 (eleventh session) — THE CONVENTIONS OF RECORD,
learned by driving the crate end to end (Blender MCP → glTF →
GLTFLoader → the live scene; capture:
`project/concept/captures/2026-07-10-slice1-crate.jpg`):**

- **Units:** 1 Blender unit = 1 m, metric, scale 1.0. Author at world
  size (the crate is 0.8 × 0.7 × 0.7 and stands hip-high in game).
- **Axes/front:** author Z-up in Blender as normal; the glTF exporter
  converts (+Y up). THE FRONT OF A PROP FACES −Y IN BLENDER, which
  lands as +Z in three.js — a placement wanting the label toward the
  player at −Z applies `rotation.y = Math.PI`.
- **Origin:** at the STANDING POINT (bottom center, z_min = 0) — a
  prop drops onto the ground by position alone.
- **Mesh shape:** apply all modifiers per part, JOIN into one mesh
  with material slots (the crate: 4 materials, one draw-friendly
  object), apply all transforms. Object name = asset name.
- **Text-on-mesh:** Blender Text object (extrude ~0.006, offset
  +0.002 for chunky glyphs) → convert to mesh BEFORE export — no
  font dependency rides in the file. Glyphs dominate the tri count
  (the crate is ~3.2k tris, most of it "SPRINKLES") — fine for
  hero props, budget it on repeated ones.
- **Style execution:** bevel EVERYTHING (0.02 width, 2 segments —
  the chunky-toy law); material colors from §3 via Principled BSDF
  base color (convert hex sRGB → linear), roughness ~0.85; no
  textures needed at this stage.
- **Export:** `export_scene.gltf` with GLB format, `use_selection`,
  `export_apply`. Select only the asset object (the check camera/sun
  in the .blend never export).
- **Homes:** `project/blender/*.blend` is the SOURCE of record
  (git-tracked, small and curated like project/concept/);
  `public/models/*.glb` is the SHIPPING copy (Vite → dist/, the room
  server serves it through the one tunneled port).
- **The loader seam** (src/client/assets.ts, landed 282ae77):
  `loadModel(name)` → `/models/<name>.glb`; null when headless,
  missing, or broken — the caller's primitive fallback carries.
  One fetch per name; multi-placers clone().
- **Budget facts:** crate.glb = 175 KB (geometry + materials, no
  textures); export takes ~0.1 s; load is one fetch, no measurable
  boot impact. The ~25 MB dist alarm (plans/16 §4) is far away.
- **Blender-MCP gotcha, recorded in blood:** `primitive_cube_add(
  size=1)` then `ob.scale = dims` gives FULL dimensions equal to the
  scale values — do NOT halve them (the first crate exploded into a
  constellation of half-size parts at full-size positions).

## 9. The dwarf turnaround sheet (`dwarf_four_angles.png`)

A proper four-angle character reference — front and back in T-pose,
left and right profiles — i.e. exactly the format a Blender modeler
sets up as orthographic background images. Reads:

- **Front**: toque with a small pink cupcake at the brow, brass
  goggles with blue lenses resting above it, full ginger beard +
  mustache, cream double-breasted coat with pink stitching hints,
  brown leather harness straps, wide belt with the CUPCAKE BUCKLE,
  hip pouches + a small wrench holstered at the left hip, cream
  apron panel, olive-brown trousers, big brown boots, fingerless
  gloves with bracers.
- **Back**: the harness crosses in an X and carries a METAL GEAR
  EMBLEM between the shoulders — the engineer mark riding behind the
  chef front (canon: the class is chef from the front, engineer from
  the back). A second wrench tucks into the belt at the rear right.
- **Profiles**: strong silhouette — the beard reads at any distance;
  belly leads the walk; the toque adds ~15% height.

**KNOWN AI ARTIFACT — do not copy:** in the left/right profile
frames the forward-stretched arm's hands are MERGED into a single
fused mitt, and the front view's fingers are approximate. Model
hands as simple rounded MITTS (style-correct for chunky-toy anyway);
trust the sheet for proportions and silhouette, never for finger
anatomy.

Proportions off the sheet (confirming §4): ~3 heads tall, beard
covers a full head-height, shoulders ~1.5 head-widths — at 1.2 m
world height the head is ~0.4 m. T-pose front/back are the rig
reference; profiles are the silhouette check.

## 10. THE MESHY ROAD (AI base models — conventions, proven 2026-07-10)

The ogre proved a second road into the pipeline: **meshy.ai generates
the BASE MODEL, the seam ships it, Blender remains the fix-it bench.**
Learned driving the first one end to end:

- **Judge against canon like anything else.** The concept art is the
  brief; the output is judged at the catapult post in-game (the ogre
  passed on the first try; expect worse luck sometimes).
- **Import audit, every time:** origin at feet (z_min ≈ 0), front =
  −Y Blender, then SCALE BY ARITHMETIC — target height ÷ source
  height (the ogre: 21/1.9 ≈ 11.05; typing "21" made a 40 m ogre).
- **Decimate as a LIVE modifier** (ratio ~0.1, 578k→58k on the ogre)
  — never applied in the .blend, so full density stays recoverable;
  `export_apply` bakes it into the GLB. UVs and textures survive.
- **Export through the standing §8 conventions** (GLB, use_selection,
  export_apply). Textures ride packed; the ogre lands at 7.75 MB —
  watch the plans/16 §4 ~25 MB dist alarm as the cast grows.
- **THE GLB IS THE COPY OF RECORD for AI assets.** The import .blends
  are 25–50 MB dense-mesh caches, regenerable from the account or by
  re-importing the GLB — they stay UNTRACKED (gitignored by name;
  *.blend1 backups ignored globally). Only hand-authored .blends
  (crate, blockouts) stay git-tracked "small and curated."
- **OPEN — license:** verify the Meshy tier grants commercial use
  before the funding deck leans on these assets.
- Known snag on the ogre: reads TOO SHINY in-game (visionary,
  blessing note) — FIXED 2026-07-11: not metallic (map B mean 0.022,
  honest) and not emissive (black) — the ROUGHNESS channel: meshy
  ships G mean ~0.54, glossy plastic under the sun. The fix pattern
  for any shiny meshy import: DUPLICATE the packed ORM image, lift G
  by `1−(1−G)×0.45` (→ mean 0.79, keeps material variation), rewire
  the node, re-export — the original pixels stay in the .blend.
  Lifted PNG compresses worse (ogre.glb 8.8→9.6 MB; the asset-diet
  slice, plans/15 item 14, will crunch it). Awaiting the eye pass;
  the 0.45 is the one retune constant.
- **BONE NAMES: NO DOTS.** three.js GLTFLoader sanitizes node names
  for PropertyBinding — `upper_arm.L` arrives as `upper_armL` (found
  live 2026-07-11: the dotted names in patron-body.ts silently drove
  nothing). Client code speaks the SANITIZED name; prefer dot-free
  bone names in future rigs so the .blend and the runtime agree.
