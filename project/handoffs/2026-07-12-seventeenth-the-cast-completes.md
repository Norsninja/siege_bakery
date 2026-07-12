# Handoff — 2026-07-12 (seventeenth session) — THE CAST COMPLETES, THE EAT BEAT IS RULED

## 1. Snapshot

Seven commits, all pushed, history clean after an approved rewrite
(tip 036446e). 436 tests, both tsc legs. The line's two pending tunes
landed (ogre opens, gap 50), breathing desynced, and THREE new
patrons walked the road in one session: cyclops 33 m, cloudgiant
38 m, firegiant 31 m — the cast is now SEVEN species with 7/7 far-
impostor coverage. The eat beat was design-discussed and RULED
(plans/16 slice 7); next session builds it.

## 2. What changed this session

- 1a43482 THE OGRE OPENS: castIndexForRung hard-pins rung 1 = ogre
  (index 0), shuffle walks from rung 2 with prev=ogre — survives any
  roster growth. LINE_SLOT0_X 66→50 (gap note; arrival walk ~1.5 s).
  CAST_SEED re-rolled (the old seed alternated ogre/dragon 5 deep
  behind the pin).
- 7619b98 THE BREATH DESYNC: PatronBody gains `individuality`
  constructor seed (mulberry32 → phase offset + ~±15% rate). Callers
  pass the QUEUE INDEX (table passes rung = its queueIndex), so THE
  ADVANCE IDENTITY extends to breath — a giant keeps his rhythm from
  line to table. Pinned in patron-body.test.ts.
- 5f6832a THE CYCLOPS JOINS: 33 m, the artillery spotter. Meshy road
  run FULLY HEADLESS via Steam Blender CLI (live instance held the
  visionary's open giants-far.blend). Frostgiant rig recipe verbatim.
  Import .blends (FrostGiant/TreeFolk/Dragon/Cyclops/CloudGiant/
  FireGiant) now gitignored by name.
- c2aa8f2 THE CLOUD GIANT JOINS: 38 m, the queen — first lady of the
  cast. Her own joints (arms hang nearly vertical; the x-decile
  armline splits into sleeve-flare vs hand clusters). Gown holds in
  the delighted audition. 2.46 MB.
- 163985c THE FIRE GIANT JOINS + THE EMISSIVE VERDICT: 31 m, lava-
  veined. scripts/model-diet.mjs FIXED: blackness judged by channel
  MAX (<16 = filler), not mean — his lava veins (max 87, mean 0.117)
  were being dropped as "black". Kept emissives compress 1024 JPEG
  (~10 KB). First giant with a live emissiveMap (verified in-browser).
- 0a439d0 THE FAR CROWD COMPLETES: far_giant_cyclops/cloudgiant/
  firegiant added to giants_far.glb (495 KB, 7/7 coverage). Built IN
  THE VISIONARY'S LIVE BLENDER via MCP. Recipe amendments in plans/19
  ledger (see §3).
- 036446e DOCS ledger. HISTORY REWRITE (visionary-approved): the
  first far-crowd commit accidentally pushed a 96.87 MB
  giants-far.blend (packed-texture orphans); rewritten + force-push,
  largest blob now 309 KB.
- plans/16 slice 7: THE EAT BEAT rulings recorded (see §3).
- plans/19 ledger: all of the above appended.

## 3. Architecture and invariants (new this session)

- THE OPENING PIN: rung 1 is ALWAYS the ogre — a pin, never a lucky
  seed (seeds reshuffle when CAST.length changes).
- SEED RE-ROLL LAW: every roster change re-scans CAST_SEED (now
  0xbab39e — deals ALL SEVEN species in rungs 1–7). Scan standard:
  all species early, no abab window in first 30, no 4-ascending
  cycle, starvation margin over the >20-in-200 pin.
- BREATH INDIVIDUALITY: PatronBody(root, poses, individuality) —
  seed with the queue index; deterministic across clients.
- THE EMISSIVE VERDICT: diet drops emissive only if RGB channel max
  < 16. Mean cannot distinguish sparse real glow from filler.
- IMPOSTOR RECIPE (plans/19 ledger, amended): meshy imports' non-
  manifold gear shells make straight decimate FLOOR EARLY (cyclops
  stuck 1724 vs 700 target; compounded retries spike silhouettes).
  Road: VOXEL REMESH first (0.4–0.45 m), THEN decimate; Mesh
  .validate() before export. Far vertex color "Col" is a pure
  z-gradient: feet (0.26,0.36,0.48) → head (0.45,0.54,0.66).
- THE ORPHAN PURGE LAW: appending from heavy import .blends drags
  packed textures in as material-tree orphans that SURVIVE SAVES —
  bpy.data.orphans_purge(do_recursive=True) before saving curated
  blends.
- GIT HYGIENE RULING: the visionary follows senior-dev standard —
  history rewrites (amend/force-push) are correct for accidental
  large blobs when named and approved.
- THE EAT BEAT RULINGS (plans/16 slice 7, build next session):
  photo-then-eat order (verdict pose → polaroid → EAT → walk-off).
  Stand-in cake (low-poly DessertSpec-tier proxy in flavor colors)
  arcs from the real cake's mark to the patron's mouth — the real
  dessert never moves; the redeal reset gets its fiction. Comic-word
  CHOMP + crumb burst. Drive-nodes-plus-dress culture: a siege-
  engineering cake LIFT can costume the beat later. THREE-VERDICT
  SPLIT: DELIGHTED = full devour (sparkle, the trailer shot);
  REFUSED = eats it BEGRUDGINGLY (same arc, no sparkle); HUNGRY =
  walks away MOURNFULLY, cake uneaten. DEPART_AT_FRAMES likely
  stretches ~300 → ~450–480 (table + line share it by design).

## 4. File map (delta)

- src/client/cast.ts — CAST is 7 members (ogre 36/vis 36:21, frost
  30, tree 40, dragon 30, cyclops 33, cloudgiant 38, firegiant 31);
  CAST_SEED 0xbab39e; opening pin in castIndexForRung; LINE_SLOT0_X
  50.
- src/client/patron-body.ts — individuality seed (constructor arg 3).
- src/client/patron-table.ts, line.ts — pass rung/queueIndex to
  PatronBody. patron-table owns DEPART_AT_FRAMES (the eat beat will
  live here).
- scripts/model-diet.mjs — channel-max emissive test; emissive slot
  in the 1024 JPEG compress rule.
- public/models/: cyclops.glb 3.55 MB, cloudgiant.glb 2.46,
  firegiant.glb 2.35 (live emissive), giants_far.glb 495 KB (7
  meshes, COLOR_0, new three have no UVs).
- project/blender/: cyclops-rig.blend, cloudgiant-rig.blend,
  firegiant-rig.blend (tracked rig sources); giants-far.blend 0.31 MB
  (7 impostors). Raw imports gitignored.
- project/plans/16-the-audiovisual-milestone.md — slice 7 now carries
  the EAT BEAT rulings block.
- project/plans/19-the-line.md — full seventeenth-session ledger.

## 5. How to run, test, verify

npm run check (436 green at 036446e). Dev server: preview_start
{name:"dev"} — 5174 is usually taken, autoPort assigns (tell the
visionary the port). Pane is born hidden: sync evals work, rAF/
screenshots do not (worker-shim recipe in memory). Blender headless:
"C:\Program Files (x86)\Steam\steamapps\common\Blender\blender.exe"
--background <blend> --python <script> (Steam install, v5.1.2; the
MCP _for_cli tools lack BLENDER_PATH — drive via Bash). The LIVE
Blender MCP connects to the visionary's instance — check
bpy.data.filepath/is_dirty before any file operation there. Seam
smokes: loadModel('<species>') + PatronBody breathing + Box3 height
(pattern in this session's transcript); giants_far: traverse mesh
names, strip far_giant_ prefix, compare against CAST species.

## 6. Open items and decisions

DECIDED (do not re-litigate): all §3 rulings; heights (33/38/31,
one-constant retunes); PinkDragon is THE DRAGON's turnaround, not a
new species; eat-beat three-verdict split.
OPEN:
- THE EYE PASS (visionary, his browser): 7-species line, gap 50,
  opening parade, breath desync, walk speeds, verdict pose angles,
  wing settle, impostor silhouettes (cloudgiant far read is chunky).
- Walk-bob sync sibling (advance bobs in step) — noted, unruled.
- AUDIO DIET: 11.3 MB of music (4×2.8 MB mp3) → ~96–112 kbps
  halves it. Models now sum ~25 MB; fresh dist ≈ 38 MB vs the ~25
  alarm — plans/16 says Draco/KTX2 becomes a slice when crossed
  (ruling pending). dist/ is STALE (21 MB, missing all new giants) —
  rebuild before any friend test.
- Species-themed orders + patron voice (the real prize, own design
  session; promotes cast.ts to game/).
- Cloudgiant species pose table (queenlier angles) if the eye wants.
- Meshy license; committed capture; flavor mapping ruling;
  eat beat SFX dependency (slice 6 unbuilt — sting placeholder or
  fold into audio diet).

## 7. Next session focus

THE EAT BEAT BUILD (visionary's explicit choice). Rulings are
complete in plans/16 slice 7 — no design session needed, build
directly: stand-in cake proxy (DessertSpec tiers + FLAVORS colors),
arc tween to mouth, three verdict flavors, comic CHOMP, crumb burst,
DEPART_AT_FRAMES stretch. Client-only, frame-counted, derived from
the verdict edge — the same seams patron-table.ts already rides.
Verify: unit pins for the beat timeline + worker-shim theatre smoke;
the eye pass is his.

## 8. Recommended reading order

1. This handoff.
2. project/plans/16-the-audiovisual-milestone.md §Slice 7 (the eat
   beat rulings + polaroid beat context).
3. src/client/patron-table.ts (the linger beat sheet the eat beat
   extends; DEPART_AT_FRAMES) and line.ts (shares the beat).
4. project/plans/19-the-line.md ledger (this session's full record).
5. src/client/cast.ts (7-member CAST, opening pin, seed law).
6. The dessert data: wherever DessertSpec/FLAVORS live (grep
   src/game for DessertSpec) — the stand-in cake builds from these.
7. Memory: game-smoke-driver-notes (worker-shim recipe, hidden pane).
8. git log --oneline -8 (the session's commits).
