# Handoff — 2026-07-12 (sixteenth session) — THREE GIANTS WALK, THE LINE STANDS

## 1. Snapshot

Four commits ending 0ae5eae (NOT yet pushed — push pending), 434 tests,
both tsc legs. The three new patrons (FrostGiant 30 m, TreeFolk 40 m,
Dragon 30 m seated) walked the meshy road and got rigs. Slice 3 THE
LINE was blessed, redesigned mid-session to THE UNIFIED FICTION
(plans/19), built, and live-verified BY RENDERED PIXELS after the
skinned-clone bug put the whole line at the origin ("the line is in
the town" — the visionary saw it, I had verified only scene-graph
transforms). The visionary saw the fixed line: "great work." Two of
his notes are pending tunes (§6). Next session: review, discuss state
and next steps BEFORE executing (his explicit instruction).

## 2. What changed this session

- d6495fc THREE GIANTS WALK THE ROAD: each .blend audited (origin to
  feet, front −Y confirmed, NO decimation needed — meshy shipped
  32–38k tris), scaled by arithmetic (frost 30 m ×16.54, tree 40 m
  ×21.07, dragon 30 m ×15.80), roughness lifted 1−(1−G)×0.45 on a
  duplicate image, exported, dieted (2.95 / 3.18 / 3.17 MB). Rigs:
  bipeds on the ogre recipe (10 bones, no legs), bone joints placed
  from numpy mesh measurements; dragon on her own design (root/spine/
  chest + neck1/neck2/head arc + wingL/wingR, no tail/legs). ALL BONE
  NAMES DOT-FREE — runtime names now equal Blender names. Rig sources
  tracked: frostgiant-rig.blend, treefolk-rig.blend, dragon-rig.blend.
  DIET FIX riding along (scripts/model-diet.mjs): emissive blackness
  check reads RGB only — meshy PNG emissive carries opaque ALPHA whose
  mean-255 defeated max-over-all-channels (frost giant nearly shipped
  2.9 MB of black texture).
- 2cc291e THE LINE (plans/19 BLESSED + BUILT): src/client/cast.ts
  (rung→species pure derivation), line.ts (queue manager), patron-
  table.ts (table body + linger theatre), patron-body.ts riders
  (per-species pose tables incl. dragon neck/wing verdicts; wingL/R
  settle in breathing idle), main.ts rewire (ogre block → PatronTable
  + LineManager; __game gains getTableSpecies/getLineSnapshot).
  giants_far.glb 297 KB (4 decimated haze-painted impostors,
  project/blender/giants-far.blend). 14 cast pins + 4 patron-body
  pins added.
- 0ae5eae THE SKINNED-CLONE LAW: Object3D.clone() does not rebind
  skeletons — every cloned skinned giant rendered at the ORIGIN while
  group transforms claimed the road. Fix: SkeletonUtils.clone() in
  patron-table.ts + line.ts; pinned in line.test.ts against three.js
  itself. Rider: snap rebuilds place kept giants immediately (stale
  marks across runover restarts).
- plans/19-the-line.md authored (proposal → blessed rulings → build
  ledger). Memory updated (game-smoke-driver-notes: skinned-clone law,
  hidden-pane offscreen-render recipe, dev-server death).

## 3. Architecture and invariants (new this session)

- THE UNIFIED FICTION (visionary-blessed): the line IS the order
  queue. Rung N's order belongs to patron f(N); the line shows
  f(N+1..N+10); verdict → species verdict pose → walk-off down the
  departure lane (road has two lanes) → line advances one slot on the
  DEPARTURE BEAT (frame 300 after verdict, shared const
  DEPART_AT_FRAMES) → head of line walks to the table → fresh deal
  finds him seated. THE LINE NEVER SHORTENS (ruling: endless line is
  the joke).
- THE CAST MAPPING: castIndexForRung — seeded shuffle, never two
  consecutive alike, never a plain cycle. MULBERRY FIRST-DRAW LAW:
  mulberry32's first output correlates across nearby seeds — Knuth-
  hash the seed AND burn one draw (unfixed it alternated two species
  for eight rungs). THE ADVANCE IDENTITY: line renders f(rung+slot),
  so slot i after advance == slot i+1 before, zero sync; per-giant
  z-stagger/yaw hash the queue index and walk WITH the giant.
- MAPPING HOME RULING: client/ now; promotes to game/ when species-
  themed order content + patron voice land (post-milestone design
  session, plans/18 FORGE adjacency).
- THE SKINNED-CLONE LAW: SkeletonUtils.clone() for every live-skinned
  template; plain .clone() renders at the template's bones (origin).
  Corollary pinned in memory: VERIFY RENDERED POSITIONS (bone
  getWorldPosition, offscreen renders) — group transforms lie for
  skinned meshes.
- Tiers: slots 0–2 actors (PatronBody breathing), 3–5 standees
  (frozen), 6–9 far_giant_* InstancedMesh impostors (unlit haze
  vertex color, frustumCulled=false). Fallback: missing model = hole;
  no models = no line.
- THE FEED GATE (patron-table.ts): arrivals are fed (null,null) until
  the fresh deal nulls the verdict — a new patron must never replay
  the previous patron's standing verdict.
- Line snap rule: the advanced (+1) config is legitimate ONLY while
  verdict non-null; otherwise mismatch snaps (runover-restart trace).
- PatronBody: per-species POSES tables (constructor param; default
  ogre); dragon verdicts are neck/wing theatre; wing settle rides the
  idle; absent bones skip.

## 4. File map (delta)

- src/client/cast.ts (+cast.test.ts, 15 pins) — CAST table, shuffle,
  lineSlots geometry (LINE_SLOT0_X=66, LINE_SPACING=42, LINE_Z=−30,
  TABLE_POS 21/−30).
- src/client/line.ts (+line.test.ts skinned-clone pins) — queue
  painter: clones by queueIndex, advance anim, far crowd.
- src/client/patron-table.ts — table body, spawn fallback ladder
  (species→ogre→none), departure/arrival walks, gen-guarded async.
- src/client/patron-body.ts — SPECIES_POSES, wing settle,
  DRIVEN_BONES grew (neck1/neck2/wingL/wingR).
- public/models/frostgiant.glb, treefolk.glb, dragon.glb (rigged,
  dieted), giants_far.glb. project/blender/*-rig.blend ×3 +
  giants-far.blend (all tracked).
- project/plans/19-the-line.md — rulings + build ledger.

## 5. How to run, test, verify

npm run check (434 green at 0ae5eae). Dev server: preview_start
{name:"dev"} — it DIED silently mid-session once; current port was
54637 (autoPort; always tell the visionary the port). The visionary
also runs his own server on 5199 (and often 5175) — never assume
ports. Hidden-pane verification recipe (WORKS, memory + this
transcript): worker-shim rAF reboot, then offscreen WebGLRenderer +
three from the exact /node_modules/.vite/deps/three.js?v=<hash> URL
(from performance resource entries), canvas.toDataURL POSTed to a
scratchpad Node receiver on 5198 (CORS *). NEVER hand-transcribe
base64. Theatre smoke: ready-up (park baker at READY_CIRCLE, wait for
phase 'running' — poking flow.order in lobby/countdown hits a stale
order), poke requirements [{kind:'count-on-cake',topping:'cherry',
needed:0}] + passScore 0, load+lever, probe getLineSnapshot/
getTableSpecies/getJudgment. timeScale accelerates SIM ONLY — frame-
counted beats (DEPART_AT_FRAMES) run at real frame rate; at 3× the
departure lands near the linger's end.

## 6. Open items and decisions

DECIDED (do not re-litigate): unified fiction; endless line; shuffle
with no-consecutive-repeats; mapping client/-now-promote-later; tier
scheme; varied heights (frost 30 / tree 40 / dragon 30 seated / ogre
36).
VISIONARY NOTES FROM THE FIXED LINE (pending, discuss-then-tune):
1. RUNG 1 SHOULD BE THE OGRE — the shuffle cast the dragon first; he
   expects the ogre to open ("as we have said"). Options: pin f(1)=
   ogre and shuffle from rung 2, or reseed CAST_SEED until rung 1
   lands ogre (brittler). One-line change + test update either way.
2. THE GAP: table (x=21) to slot 0 (x=66) reads "a little far —
   could be shortened a bit". LINE_SLOT0_X is the one constant;
   cast.test pins x>40 — adjust test if the tune goes below.
OPEN:
- PUSH THE COMMITS (4 unpushed: d6495fc, 2cc291e, 0ae5eae + handoff).
- Dist ~34 MB vs ~25 alarm — AUDIO DIET (11.3 MB block) now on the
  critical path before any friend test.
- Walk-off/arrival speeds, verdict pose angles, wing settle size —
  all one-constant tunables awaiting the visionary's eye pass in his
  own browser.
- Cyclops: turnaround exists (project/blender/Cyclops/), .blend not
  yet generated; walks the same road, joins CAST with one line.
- bakery/ turnaround (SIEGE BAKERY gate concept) — intent undiscussed
  (slice 8 adjacency; in-art text never canon).
- Species-themed order content + patron voice = the real prize
  (game/ design session; promotes cast.ts to game/).
- Flavor mapping ruling still pending (fixed-per-rung recommended);
  meshy license; committed capture; region flair pass; giant/front.png
  mix-up; turnaround PNG tracking decision.
- Eat beat (slice 7), E-key onboarding, splat juice (standing).

## 7. Next session focus

The visionary's words: review our work, discuss current state and
next steps, THEN execute. Likely first executions after discussion:
push commits; pin ogre at rung 1; shorten LINE_SLOT0_X; his eye pass
on the line (speeds/poses); then either audio diet (budget pressure)
or Cyclops when the .blend lands.

## 8. Recommended reading order

1. This handoff.
2. project/plans/19-the-line.md — rulings, design, build ledger.
3. src/client/cast.ts — the derivation everything hangs on (+ its
   test pins).
4. src/client/patron-table.ts and line.ts — the theatre and the
   queue (skim patron-body.ts SPECIES_POSES).
5. git log --oneline -5; git status (UNPUSHED commits).
6. Memory: game-smoke-driver-notes (sixteenth-session additions:
   skinned-clone law, hidden-pane render recipe).
7. project/research/16-art-bible.md §10 only if Cyclops's .blend has
   arrived (the road recipe).
