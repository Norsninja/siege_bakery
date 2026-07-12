# Handoff — 2026-07-11 (fifteenth session) — THREE FLEETS POPULATE THE REGION

## 1. Snapshot

Three commits, all pushed, ending 127ed14. 415 tests, both tsc legs,
region.glb 1.8 → 2.12 MB. THE FLEET PATTERN WAS PROVEN AND SCALED:
research/18 (region structure rules + THE SCRIPT CONTRACT) was
authored, then sixteen structures were built by dispatched Sonnet
agents across three fleets — fifteen-for-fifteen pass on first live
run, zero rework rounds. One shipped defect (inverted watchtower door
faces) was caught BY a fleet agent cross-reading precedent scripts,
confirmed by programmatic normal audit, fixed at source. The visionary
played the populated world: "it's looking fantastic." research/19
(dessert model specs) authored; the dessert design discussion landed
on FLAVORS-as-material-table + procedural drip rim (ruling pending).
THE NEW PATRONS ARRIVED: FrostGiant.blend / Dragon.blend /
TreeFolk.blend (raw meshy imports, ~26–30 MB each, untracked) sit in
project/blender/ with turnaround folders. Next session: review, then
integrate the new giants into the line (slice 3).

## 2. What changed this session

- 7e3bd34 THE REGION POPULATES: research/18-region-structure-rules.md
  authored — self-contained builder brief: geography table (blender
  coords, machine-extracted), atmosphere prefixes, vertex-color law
  (LINEAR floats written verbatim, no sRGB), machine-sampled palette
  of record, silhouette law, raycast grounding (the meadow rolls −3.5
  to +1.3 m), THE SCRIPT CONTRACT §8 (idempotent bpy script, OWNED
  names, forbidden ops, nine self-validation checks, honest pass/fail
  result dict). Trial: mid_mill_west (one agent, 183 tris, 9/9 first
  run). Fleet 1 (five parallel Sonnet agents): mid_milestone_road,
  mid_giant_bench, mid_orchard_west, mid_granary_road,
  mid_pines_south. Scripts tracked at project/blender/region-scripts/
  (provenance; region.blend accumulates results).
- ee6aeb8 THE SECOND FLEET: mid_mill_south (varied sibling — 8 sides,
  blades 18° off-axis, pennant accent), mid_fields_south (wheat plots
  + haystacks; FIRST SESSION-RULED PALETTE EXTENSION: wheat gold
  #C98A2B + straw #D8B878, from the art bible brass), mid_milestone_east
  (cairn sibling, pink accent HIGH — lesson from the west sibling's
  weak plinth accent, applied via commission text), mid_watchtower_west,
  mid_orchard_road.
- 127ed14 THE THIRD FLEET + THE WINDING AUDIT: mid_bakehouse_west,
  mid_giant_lantern_road (gold pane aimed at post eye),
  mid_giant_table_road (plate + pink bun — rest stop complete),
  mid_pines_west (10-sided facets, closest band), mid_well_south.
  The audit: watchtower door was a LEFT-HANDED tapered_box triple —
  all six faces inverted; EEVEE double-sided preview hid it, three.js
  would cull. Found by the lantern agent reading precedents; confirmed
  via BVH ray-parity + recalc-diff normal audits; fixed at source
  script, rerun, re-audited. research/19-dessert-model-specs.md
  authored (see §6).
- Each fleet: contract grep (no saves/exports/new materials/IO), batch
  exec in live region.blend via MCP, result dicts checked, temp-camera
  renders reviewed, .blend saved, region.glb re-exported (§9 recipe),
  in-game structural smoke (treatments + positions vs coordinate map +
  console), npm run check, commit.

## 3. Architecture and invariants (new this session)

- THE FLEET LOOP: commission (zone rect + height cap + budget + brief)
  → agent writes self-validating bpy script → session batch-runs in
  live region.blend → renders reviewed → save/export/smoke → commit.
  Agents have NO Blender access; scripts are the deliverable and the
  provenance (git-tracked). Blender MCP is ONE shared instance —
  scripts serialize through the session; agent WRITING parallelizes.
- THE SCRIPT CONTRACT (research/18 §8): OWNED names, idempotent
  teardown, world-coord authoring (transforms ship identity), existing
  "vtx" material by reference, "Col" FLOAT_COLOR POINT per-vertex,
  flat shading, per-element raycast grounding sunk 0.3 m, nine honest
  checks, result dict. Scripts must be able to FAIL.
- WINDING LAW (pinned research/18 ledger): Blender renders are NOT a
  winding oracle (EEVEE is double-sided; three.js culls). Audit
  normals programmatically: BVH ray-parity separates true inversions
  from embedded-joint false positives; recalc-diff over-flags authored
  undersides on open shells. tapered_box (u,v,w) must be RIGHT-HANDED.
- Palette extensions are SESSION RULINGS, not builder choices (wheat
  gold + straw are the first, recorded in research/18 ledger).
- Region vertex colors are stored as hex/255 LINEAR (renders pale —
  the known region-wide wash; the visionary's flair-pass item). New
  objects must match by writing table values verbatim, no sRGB.
- Coordinate map held everywhere: blender (bx,by,bz) → game (bx,bz,−by).
- Dessert design (discussion, waiting on ruling): the playable cake is
  DATA (DessertSpec tiers, core/dessert.ts) — a fixed model can never
  be it. Proposed: FLAVORS drop-in table (TOPPING_COLORS/PLAYLISTS
  culture) + procedural drip rim (tierGeometry(radius,height,seed) or
  seeded canvas side-texture), flavor derived DETERMINISTICALLY from
  broadcast state (rung/dessert id — the cake is shared; no client
  dice), recommended fixed-per-rung (learnable ladder). Meshy reserved
  for ambiance dessert props only.

## 4. File map (delta)

- project/research/18-region-structure-rules.md — the builder brief +
  ledger of all sixteen commissions and the winding audit.
- project/research/19-dessert-model-specs.md — dessert casting brief
  for the visionary's image runs: Track A tier drum (now likely
  superseded by the procedural road, §6), Track B ambiance list
  (celebration cake, pie, donut stack, giant cupcake, eclair, jelly
  dome), image-run rules (matte prompt, neutral bg, no text), budget
  math (dist 21 MB / alarm 25; audio 11.3 is the fat block).
- project/blender/region-scripts/*.py — 16 commission scripts.
- project/blender/region.blend — now 24 + 16 = holds all structures.
- public/models/region.glb — 2.12 MB, 25 meshes (sky.glb unchanged).
- project/blender/FrostGiant.blend, Dragon.blend, TreeFolk.blend —
  RAW meshy imports (26–30 MB each), UNTRACKED per §10 law (GLB will
  be the copy of record after processing). Turnaround folders:
  FrostGiant/, PinkDragon/, TreeFolk/ (+ giant/, dwarf/, catapult/,
  wall/ — older sets; giant/front.png is a known mixed-up dwarf image,
  visionary says fix later). Tracking of turnaround PNGs: UNDECIDED.

## 5. How to run, test, verify

npm run check (415 green at 127ed14). Fleet loop verification recipe:
- Contract grep over region-scripts/: save_mainfile|export_scene|
  materials\.new|render\.|ops\.wm|urllib → must be empty.
- Batch exec: read each .py, exec in its own ns via MCP, collect
  ns["result"]; failed_checks must be empty.
- Renders: temp camera (create/remove tmp_review_cam, restore
  scene.camera; check_cam itself looks +y only). Post eye is
  (1.5, 11, 1.6) blender.
- Export (§9): select near_/mid_/far_ → region.glb; sky_ → sky.glb;
  GLB use_selection export_apply; ref_/check_ never.
- In-game smoke: dev server via preview_start {name:"dev"} (port
  autoPort — was 30899); __game.scene traverse: prefix meshes'
  material type/fog + bbox centers vs coordinate map; console errors.
  THE HIDDEN-PANE TRAP still costs screenshots: no rAF when pane
  hidden — javascript_exec works, computer screenshot times out, rAF
  promises hang. Structural smoke is the oracle; screenshots need the
  visionary's open pane.
- Normal audit snippets live in this session's transcript pattern:
  BVH ray-parity (flag hnorm.dot(n)>0.3 hits) + bmesh recalc-diff.

## 6. Open items and decisions

DECIDED (do not re-litigate): fleet loop + script contract as the
region road; wheat gold/straw palette rows; watchtower door fix;
region scripts tracked; dessert = programmatic (materials/procedural),
meshy only for ambiance props.
PENDING RULING (visionary): flavor mapping — fixed-per-rung
(recommended) vs seeded-per-run; the FLAVORS list itself (vanilla,
chocolate, strawberry, lemon, red velvet proposed).
OPEN:
- THE NEW PATRONS (next session's build): FrostGiant/Dragon/TreeFolk
  .blends need the meshy road each: import audit (origin at feet,
  front −Y, scale by arithmetic — patrons are ~36 m ruled scale; check
  against the ogre), decimate live-modifier ~0.1, export GLB, npm run
  diet, rig (ogre pattern: ~10 bones, spine/chest/head + arms, no
  legs, dot-free names, offsets-from-rest law). DRAGON IS HARDEST
  (visionary's own call): wings/tail/neck don't fit the biped recipe —
  budget a design think before boning. Then slice 3 THE LINE:
  distinct species queue on the giants' road (ruling 1), line advances
  during linger, client derives count from run state.
- Committed capture (project/concept/captures/) — still owed; the
  populated valley is the best frame yet; needs open pane.
- Region flair pass (visionary): pale wash (global vertex-color
  deepen is a candidate), hero rock/snow contrast, skirt seam, cloud
  placement, gold plots read faintly from ground level.
- giant/front.png mix-up (dwarf image in giant folder) — visionary
  will fix.
- Turnaround PNG tracking decision; meshy license check; audio diet
  (11.3 of 21 MB dist); ear/eye passes; E-key onboarding, splat juice,
  loading-line presentation (friend-test debrief, unledgered).
- Standing ledger unchanged: items 6/8/11, audit tranche C, wind +
  Bite re-pin, slice 4 remainders, name (slice 8).

## 7. Next session focus

Visionary's words: review our work, then start integrating the new
giants into the line. Suggested shape: (1) walk the three .blends in
Blender (get_objects_summary per file — note read_homefile
invalidates MCP context mid-script; file switches in their own call),
audit + decimate + export + diet each; (2) rig the two bipeds on the
ogre recipe; design-discuss the dragon rig before boning; (3) slice 3
THE LINE: placement on the giants' road outside the walls (the road
was built for this — slice 4.75), queue advance during linger, shared
clone law, PatronBody choreography stays ogre-only until ruled
otherwise. The flavor ruling can be walked any time (cheap,
discussion-first).

## 8. Recommended reading order

1. This handoff.
2. project/research/18-region-structure-rules.md — the fleet loop,
   script contract, ledger (all sixteen commissions + winding audit).
3. project/plans/16-the-audiovisual-milestone.md — slice 3 THE LINE
   (the build target), slice 2 second/third acts (the ogre rig recipe
   the bipeds copy), §6 ruling 1 (distinct species).
4. project/research/16-art-bible.md §10 (meshy road + diet) — the
   exact pipeline the three new .blends walk.
5. project/research/19-dessert-model-specs.md — if the visionary's
   image runs come back, or the flavor ruling comes up.
6. src/client/patron-body.ts — the rig-driving pattern the new
   species inherit; src/client/scene.ts dressBackdrop/wallSegments
   for the region contract.
7. git log --oneline -6; project/blender/ dir listing (the three new
   .blends + turnaround folders); memory: game-smoke-driver-notes
   (hidden-pane trap).
