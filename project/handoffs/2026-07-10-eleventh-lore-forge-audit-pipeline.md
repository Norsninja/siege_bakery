# Handoff — 2026-07-10 (eleventh session) — LORE + FORGE RECORDED, SEMANTIC AUDIT LANDED, PIPELINE PROVEN, GIANT RULED 20+ M

## 1. Snapshot

Discussion-heavy session that ended in the first asset-pipeline build.
Seven commits, all pushed to origin/main, ending e166c74. 397 tests,
both tsc legs. The tenth session's four commits were reviewed clean
(verified: Rapier handles carry a generation, so trail-halt-by-
bodyHandle cannot mis-halt on handle reuse). New plans: 17 (lore),
18 (order forge). The semantic audit (plans/15 item 12) landed. The
plans/16 §6 rulings were walked and recorded. Slice 1 (pipeline
proof) is BUILT — the crate went Blender→glTF→scene. The giant's
height is ruled 20+ m via a graybox camera lineup. Friend test
reframed as casual (artist friend + kids, this weekend, gift-not-
deadline); work resumes Sunday. NEXT SESSION (visionary's words):
review this session's work, DISCUSS the next slice BEFORE any design
or code edits, then start modeling the ogre.

## 2. What changed this session

- 1cf7eb9 plans/17-the-lore.md NEW: after-the-wars canon. Giants are
  refugees of the fantasy wars; dwarves committed to feeding them;
  THE REALM PAYS for orders (giants are guests); patrons still picky.
  Tone: not a metaphor, not bittersweet — hospitality comedy. Binds
  voice/tone, never mechanics. Kernel credited to artillery plans/02.
- 904b820 plans/18-the-order-forge.md NEW: generated-order shape,
  post-milestone. Three libraries (patrons-with-taste × constructable
  desserts × authored per-progress envelope). MEASURED-ATOMS LAW: a
  dessert enters the library only with a measurement sheet (research/
  11+13 harnesses become authoring pipeline); the generator only asks
  what the census can count. Anti-mush: patrons carry taste, envelope
  stays authored. The queue IS plans/16's line. §6 open questions
  need a design session; do not build.
- 3933e4e THE SEMANTIC AUDIT (plans/15 item 12 DONE, ledger updated):
  screen strings speak bakery. PATRON N replaces RUNG N (line-of-
  giants fiction now standing: each rung is the next giant stepping
  up); run → the bakery's day (open the bakery / ALL IN — the bakery
  opens in 3… / CLOSING TIME / the bakery closes in Ns / bake again);
  patrons fed, not rungs cleared; pay line = "the realm pays +N
  coins". Files: hud.ts, net-handlers.ts, one main.ts flash; pins
  re-pinned in hud.test.ts + net-handlers.test.ts. Cleared unchanged:
  artillery vocabulary, verdict strings, m/s corner line, control/
  status lines. Code identifiers keep rung/run — the law binds the
  screen only. Live-verified lobby + PATRON 1 header.
- 32d840f THE RULINGS WALK (plans/16 §6 block + art bible edits),
  all eight recorded:
  1. DISTINCT SPECIES overrules re-tint (tree-folk, dragons, giant
     orcs — all refugees per plans/17). Ogre builds first; line may
     debut thin.
  2. Grumble-audio YES (slice 6 rows); VO never; grumble accompanies
     text.
  3. First-person hands YES — slice 4 rider, mitts.
  4. Name OPEN. Visionary rates "Lord of the Cakes" well; started
     with "The Great Dwarven Bakeoff". Concept-art words are AI
     template, nothing locked. Only slice 8 blocks on it.
  5. Slice order 2–5 unruled; Patron→Line→Bakers→Dessert stands as
     working assumption.
  6. Weekend = gift, not deadline; work resumes Sunday.
  7. HUD neon NOT canon ("too cyberpunk"); future warm-fantasy
     re-skin sanctioned, not milestone-gating.
  8. Proportions blessed (dwarf 1.2 m, catapult 2.5 m, crates 0.7 m,
     cake = sim) EXCEPT the giant — see e166c74.
- 282ae77 THE LOADER SEAM: src/client/assets.ts NEW — loadModel(name)
  → /models/<name>.glb; null when headless/missing/broken (primitive
  fallbacks forever); promise-cached one fetch per name; clone() for
  multi-placement. Pins in assets.test.ts (+3).
- e853a15 THE PIPELINE PROOF (plans/16 slice 1 BUILT): SPRINKLES
  crate modeled via Blender MCP, exported GLB (175 KB, ~3.2k tris —
  label glyphs dominate), loaded through the seam, standing at
  (2.6, 0, 12.4) beside town 0's pantry (main.ts fire-and-forget).
  Capture committed: project/concept/captures/2026-07-10-slice1-
  crate.jpg. CONVENTIONS OF RECORD pinned in art bible §8 (see §3).
- e166c74 THE GIANT RULED: graybox lineup (12/16/20 m capsule, cake-3
  reference cloned at the plinth, shot from beside the catapult) →
  20+ m ("fantastic scale makes it fun"). Placement: OUTSIDE the town
  walls, never inside a town, leaning toward the table; the queue of
  waiting patrons recedes behind him, also outside the walls.

## 3. Architecture and invariants (new this session)

- Pipeline conventions (art bible §8, PROVEN): 1 BU = 1 m; front =
  −Y Blender = +Z three (label toward −Z ⇒ rotation.y = π); origin
  at standing point (z_min = 0); apply modifiers per part then JOIN
  into one mesh with material slots; text→mesh before export; export
  GLB use_selection + export_apply; project/blender/*.blend = source
  of record (git-tracked), public/models/*.glb = shipping copy.
  Blender gotcha recorded: size=1 cube ⇒ ob.scale IS dimensions
  (never halve — first crate exploded).
- Loader-seam laws: null is normal (headless/missing/broken); every
  asset consumer keeps a primitive fallback or tolerates absence;
  one fetch per name; core/game never import assets.ts.
- Screen-vs-code language law: player-facing strings speak bakery
  (patron, the bakery's day); code identifiers keep rung/run/deal.
  Blacklist nouns never on screen: rung, deal, linger, census,
  phase, run. Artillery vocabulary exempt.
- Lore binds voice: realm-pays on money strings; REFUSED huffy,
  HUNGRY mournful; no metaphor, no bittersweet.
- Forge is DISCUSS-BEFORE-BUILD, post-milestone (plans/18 §6).

## 4. File map (delta)

- project/plans/17-the-lore.md — canon of record.
- project/plans/18-the-order-forge.md — forge shape + laws.
- project/plans/16-...md — §6 rulings block; slice 1 status BUILT;
  slice 3 species amendment.
- project/research/16-art-bible.md — §4 giant 20+ m; §8 conventions
  of record.
- project/plans/15-side-quests.md — item 12 DONE block.
- src/client/assets.ts (+ assets.test.ts) — the loader seam.
- src/client/hud.ts / net-handlers.ts / main.ts — audit strings;
  main.ts also places the crate via loadModel.
- project/blender/crate.blend, public/models/crate.glb,
  project/concept/captures/2026-07-10-slice1-crate.jpg.

## 5. How to run, test, verify

npm run check (397 green at e166c74). Blender MCP: user must launch
Blender with the addon (localhost:9876); scene currently holds the
joined "crate" object + check_cam/check_sun (saved as crate.blend).
Driver facts learned this session (beyond memory notes):
- __game exposes scene/camera/baker/setLook but NOT the renderer.
  In-game captures: rAF hook on the #app canvas → drawImage to small
  canvas → toDataURL → POST to a throwaway Node sink on 5999
  (scratchpad capture-sink.mjs pattern; CORS: simple POST, ACAO *).
- Donor-clone gotcha: heldMesh sphere is visible=false — clones
  inherit it.
- Lobby dessert renders cake-1 (base tier only); 3-tier reference =
  clone the r=4 tier cylinder and rescale (3/4, 1.5/2) y=2.75 and
  (2.25/4, 1.5/2) y=4.25 at z=−30.
- setLook(yaw, pitch): yaw 0 faces −z, π faces +z; negative pitch
  looks down. Cake center (0, −30); town 0 machine z=−12, pantry
  z=+12, spawn z=+10; town 1 machine z=−48.
- STOP preview servers when done (ghost music). Port 5174 often
  busy; autoPort assigns another.

## 6. Open items and decisions

DECIDED (do not re-litigate): everything in §2 — lore, forge laws,
audit wordings, §6 rulings 1–3 and 5–8, giant 20+ m + placement.
OPEN:
- The name (§6.4) — blocks slice 8 only.
- Ear/eye pass (visionary at keyboard), now 8 items: music volume/
  fades, winch coverage + drain, fudge chip, banner composition,
  lone-hero tag, comic word size/timing, trail-halt feel, audit
  strings read at speed.
- Linger + runover playlist rows await compositions.
- Standing ledger: items 6/8 post-campaign; 11 post-milestone; audit
  tranche C post-friend-test; wind + Bite re-pin ownerless.
- Friend test happens this weekend, casually; observations feed
  Sunday's agenda.

## 7. Next session focus

Visionary's stated sequence: (1) review this session's seven
commits; (2) DISCUSS the next slice BEFORE any design or code edits;
(3) then begin modeling THE OGRE (slice 2's first act). Ogre facts
already ruled: 20+ m to the crown; outside the walls leaning toward
the table; concept-art canon (big soft face, small eyes, huge grin,
tan skin, short brown hair, fork + knife held upright, white bib
with pink cupcake emblem); chunky-toy style, mitts, bevels; ONE
skinned mesh; three verdict poses + look-lean + breathing idle, no
rig showcase; loom lives in lean and bulk as much as height. First
deliverable: silhouette standing at the ruled spot, judged in-game
before any detail pass. Slice order beyond that is unruled — part
of the discussion.

## 8. Recommended reading order

1. This handoff.
2. project/plans/16-the-audiovisual-milestone.md — §6 rulings block,
   slice 1 status, slice 2 (the next build).
3. project/research/16-art-bible.md — §8 conventions of record, §2
   giant canon, §4 proportions; then Read project/concept/
   SiegeBakeryConcept.png directly.
4. project/plans/17-the-lore.md and 18-the-order-forge.md — the new
   canon (skim).
5. src/client/assets.ts — the seam slice 2 loads through.
6. git log --oneline -8 — the session's commits.
7. CLAUDE.md current-state paragraph.
