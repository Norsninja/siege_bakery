# Handoff — 2026-07-10/11 (twelfth session) — THE MESHY PIVOT: OGRE BLESSED + RIGGED + BREATHING, DWARVES EMBODIED

## 1. Snapshot

The pipeline-heavy session that changed the asset economics. Four
commits, all pushed, ending 10098bb. 397 tests, both tsc legs, dist
rebuilt. The eleventh session's seven commits reviewed clean (one
cosmetic indent nit in hud.ts:217, unfixed). THE MESHY PIVOT: the
playtest friend recommended meshy.ai; it generated the concept ogre
and the turnaround dwarf as near-canon textured models. Slice 2 is
two acts deep (ogre standing at his ruled post, blessed "a pro
asset"; rigged 10 bones; breathing idle live). Slice 4 first act
built (ghost dwarves walk with bob + carry pose). The friend test is
this weekend; next session continues the ogre (choreography) BEFORE
it.

## 2. What changed this session

- fcb4912 THE PATRON HAS A FACE: morning act walked the planned road
  (blockout via MCP taught placement x=21 on the cake row); then
  meshy.ai generated the ogre — decimated 578k→57.8k, scaled
  1.9→21.0 m by arithmetic (21/1.9; typing "21" made a 40 m ogre),
  ogre.glb 7.75 MB. Visionary blessed him in-game. Art bible §10 NEW
  (the meshy road conventions). .gitignore: *.blend1, *.blend@, heavy
  AI import .blends by name (GLB is the copy of record for AI
  assets). main.ts places him (21, 0, −30), rotation.y −π/2.
- d682069 THE BAKERS HAVE BODIES: dwarf generated from the
  turnaround sheet IN T-POSE, decimated 692k→24k, textures halved to
  1024², scaled to 1.2 m, grounded (import floated 0.3 m). Minimal
  13-bone armature + auto weights (dwarf-rig.blend), posed T→CARRY
  (hands forward, palms up), baked static, dwarf.glb 4.2 MB.
  ghosts.ts dresses remote players through the seam: capsule
  fallback forever; clones share template geo/materials so removal
  NEVER disposes; naive walk = bob + rock, frame-driven. __game
  gains `ghosts` (manager) for smoke driving.
- b695ee7 THE DWARF MEETS YOUR EYE: live two-client finding — the
  1.2 m blessed dwarf vs the SIM's 1.7 m capsule / 1.5 m eye. Sim is
  the truth (cake precedent): ghosts.ts DWARF_VISUAL_SCALE derives
  from CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS; model stays authored
  1.2 m. Art bible §4 amended. Residual eyeline gap (~0.18 m, eye vs
  model eyes) PARKED by the visionary — do not fiddle.
- 10098bb THE OGRE BREATHES: rigged WITHOUT a T-pose (stationary
  reactor: spine/head theatre only; bind pose only closes big arm
  sweeps, never needed). 10 bones, NO legs, auto weights on 58k;
  all four moves auditioned clean in renders; recipes recorded in
  plans/16 slice 2 status. GLB re-exported with skin LIVE (8.4 MB).
  NEW src/client/patron-body.ts: the one place that touches the
  skeleton; breathing idle shipped (chest ±0.015 rad about rest,
  head nod lagged 0.9 rad, frame-driven). main.ts: patronBody
  constructed at load, update() beside ghosts.update(), __game.
  getPatronBody(). ogre-rig.blend = rig source of record.

## 3. Architecture and invariants (new this session)

- THE MESHY ROAD (art bible §10, binding): AI base models judged
  against concept canon in-game; import audit every time (origin at
  feet z_min≈0, front −Y, SCALE BY ARITHMETIC target/source);
  decimate as LIVE modifier (~0.1), export_apply bakes it; GLB is
  the copy of record for AI assets — heavy import .blends stay
  untracked; hand-authored .blends (blockouts, rigs) stay tracked.
- REST-OFFSET LAW (patron-body.ts header): glTF bones carry REST
  rotations in node transforms — drives are offsets from captured
  rest, never overwrites (first breath bent him at the waist;
  chest rest x=0.044).
- Shared-clone law (ghosts.ts): dwarf clones share cached template
  geometry/materials — dressed ghosts are removed WITHOUT dispose;
  removeAndDispose on a clone corrupts every sibling.
- Sim-is-truth for bodies: ghost visual scales to the capsule,
  derived from core constants, never hardcoded.
- Stale-dist gotcha: the room server page (5175) serves the last
  `npm run build`; vite dev page always runs today's code. "Works in
  dev, capsule on the server page" = rebuild dist.
- Ogre pose recipes of record (plans/16 slice 2 status block):
  look-lean spine x+14 head x+8 z+25; DELIGHTED chest x−10 head x−18
  arms x−40 z∓15; REFUSED spine z+28 chest x−6 z+10 head x−14 z+18;
  HUNGRY spine x+16 chest x+10 head x+24 arms x+18 (degrees, XYZ
  euler offsets from rest). Face is texture-baked (always grinning):
  verdicts are BODY theatre only.

## 4. File map (delta)

- src/client/patron-body.ts NEW — PatronBody: bone map + restX
  capture, breathing update(); hosts look-lean/verdicts next.
- src/client/ghosts.ts — dwarf dressing, DWARF_VISUAL_SCALE, walk
  bob constants (WALK_BOB_M 0.03, WALK_ROCK_RAD 0.05, phase 0.35).
- src/client/main.ts — ogre placement + PatronBody wiring; crate
  placement; __game gains ghosts, getPatronBody.
- public/models/ — ogre.glb (8.4 MB, skinned), dwarf.glb (4.2 MB,
  static carry pose), crate.glb.
- project/blender/ tracked: ogre.blend (blockout), ogre-remesh.blend
  (sculpt learning), dwarf-rig.blend, ogre-rig.blend (rig sources,
  live armatures). UNTRACKED heavy AI imports: Meshy_Ogre,
  Meshy_Dwarf, Ogre_textured (ogre texture source), Wynne_Ogre,
  ogre_turnaround + dwarf/ + giant/ reference folders (visionary's,
  purpose unruled — do not prune unasked).
- project/plans/16 — slice 2 status (two acts + pose recipes),
  slice 4 status block.
- project/research/16-art-bible.md — §10 meshy road; §4 dwarf scale
  amendment.

## 5. How to run, test, verify

npm run check (397 green at 10098bb). npm run build before any
server-page (5175) verification. Blender MCP on localhost:9876;
currently holds ogre-rig.blend (10-bone armature, check_cam/sun).
Driver facts beyond the memory notes:
- The visionary's Browser pane is usually HIDDEN: sync javascript
  evals work, rAF/screenshots never fire — check
  document.visibilityState FIRST; structural verification (traverse
  for node names, bone rotations, network 200s) replaces pixels; the
  visionary judges visuals in HIS browser at the autoPort URL.
- Ghost smoke: __game.ghosts.upsert({id,x,y:0.85,z,yaw}) is the
  exact network path; pump __game.ghosts.update() manually when
  hidden (no frames). Dwarf clone root = parent chain of node
  'dwarf_export'; expected scale 1.4167, feet drop −0.85.
- Ogre smoke: __game.getPatronBody(); traverse for isBone 'chest'
  (rest x≈0.044); isSkinnedMesh true; pump update() and check
  ±0.015 amplitude about rest.
- Blender: bpy.ops.wm.read_homefile/open_mainfile invalidates
  bpy.context.window mid-script — split file-switch into its own
  call. Blender ops after file open need re-fetched objects.
- Meshy imports: check ob.location (the dwarf floated); vertex reads
  are LOCAL — use matrix_world.

## 6. Open items and decisions

DECIDED (do not re-litigate): the meshy road + its conventions; ogre
20+ m at (21, 0, −30); dwarf ghost scale-to-capsule; eyeline
residual parked; poses read right (visionary on the four recipes);
verdicts are body theatre; slice order stays Patron-first.
OPEN:
- Ogre TOO SHINY (visionary note, deferred) — likely glTF metallic;
  fix in Ogre_textured.blend material or on the rig file's mesh,
  re-export. Ten-minute job next time Blender is open.
- The committed capture for project/concept/captures/ — needs the
  visionary's Browser pane open once (ogre at post; slice 1 culture).
- Meshy license tier — verify commercial rights before the deck.
- Slice 4 remainders: first-person hands (§6.3 rider);
  carried-topping-for-others needs wire archaeology (PlayerPose has
  no held item; no-protocol-changes law makes this a puzzle); dwarf
  identity (all twins today — tint/prop ruling territory).
- THE MACHINE model needs a design discussion before building
  (articulated MachineRig: meshy frame + rebind moving parts).
- Standing ledger unchanged: name (slice 8), ear/eye passes,
  linger/runover playlist rows, items 6/8/11, audit tranche C, wind
  + Bite re-pin.

## 7. Next session focus

Visionary's words: continue the ogre BEFORE the friend test. That
means THE CHOREOGRAPHY ACT (slice 2 third act), pure code, no
Blender: a small state machine in patron-body.ts — lerp to look-lean
when `patron {text, seq}` arrives (net-handlers.ts already surfaces
it; find the client seam), hold ~2–3 s, relax; snap-and-hold the
verdict pose when the order ends (DELIGHTED/REFUSED/HUNGRY ride the
ending order message); relax through the linger. Pose recipes are in
plans/16 (convert degrees to radians, apply as offsets from restX —
extend restX capture to all three euler axes and both arm bones
first; current code captures x only). Scope guard: no new messages,
no game/ changes. If time remains: the shiny fix, then the capture.

## 8. Recommended reading order

1. This handoff.
2. project/plans/16-the-audiovisual-milestone.md — slice 2 status
   block (both acts + pose recipes), slice 4 status, §6 rulings.
3. src/client/patron-body.ts (short, the work site) + its wiring in
   src/client/main.ts (ogre placement block + frame loop).
4. src/client/net-handlers.ts — where patron/order/verdict messages
   land (the choreography triggers).
5. project/research/16-art-bible.md §10 (meshy road) + §4.
6. src/client/ghosts.ts — the dressing pattern (clone/dispose laws).
7. git log --oneline -5 — the session's commits.
8. Memory: game-smoke-driver-notes (hidden-pane + smoke recipes).
