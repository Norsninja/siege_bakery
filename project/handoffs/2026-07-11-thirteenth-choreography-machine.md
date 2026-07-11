# Handoff — 2026-07-11 (thirteenth session) — THE OGRE ACTS + THE MACHINE DRESSES

## 1. Snapshot

Six commits, all pushed, ending df29a7d. 410 tests, both tsc legs, dist
rebuilt (29.3 MB). The ogre's choreography act is live and playtested
("it's great"); the shiny fix landed; friend-test hardening (MIME, lazy
dwarf) landed; the MACHINE walked the full arc in one session — design
discussion (meshy fails mechanisms), hand-built blockout through three
visionary review rounds, GLB export on new hand-road conventions,
MachineRig rebind with a gimbal dish, and a post-move feel fix after
the visionary's in-game pass ("I am impressed"). Friend test is this
weekend, hosted from the visionary's PC; next session preps the tunnel
and replaces more greybox with models first.

## 2. What changed this session

- 0801fca THE OGRE ACTS: patron-body.ts rewritten as the choreography
  state machine. POLLING seam (not NetFx events): main.ts frame loop
  passes view.lastPatron?.seq + view.verdict; async ogre load and
  mid-banner joiners recover state events would miss. Look-lean on seq
  change (~150-frame hold, EASE_LERP 0.05), verdict snap-and-hold on
  Judgment arrival (~240 frames, SNAP_LERP 0.15, classification =
  banner's two-gate read via verdictPose()), relax through the linger;
  breathing rides additively. A nag during a verdict is adopted, never
  acted on (visionary ruling). First update adopts a standing seq
  SILENTLY; a standing verdict PLAYS (state, not event). Head-turn
  audition (Blender renders): no neck — clean to 50°, the real ceiling
  is his own knife at ~55°; HEAD_TURN_MAX_RAD 35° pinned, lean gained
  LOOK_TURN_RAD 20° (+Y = his right/knife side; sign+size are
  one-constant tunables). 9 pins in patron-body.test.ts (fake bone
  hierarchy, 3-axis rest). Visionary playtested the lean: blessed.
- 31749c5 FRIEND-TEST HARDENING: server MIME table gains .glb =
  model/gltf-binary, .mp3 = audio/mpeg (verified on a fresh instance;
  a LONG-RUNNING server needs restart for headers — dist is read
  per-request, the MIME table is process state). ghosts.ts dwarf load
  is LAZY on first upsert (solo boot never fetches 4.4 MB). plans/15
  item 14 NEW: THE ASSET DIET — dist crossed the 25 MB alarm.
- 11e8328 THE OGRE LOSES HIS SHINE: not metallic (B mean 0.022), not
  emissive (black) — the roughness G channel (~0.54 = glossy plastic).
  Fix pattern (art bible §10): DUPLICATE the packed ORM image, lift G
  by 1-(1-G)*0.45 → mean 0.79, rewire node, re-export; original pixels
  stay in ogre-rig.blend. ogre.glb 8.8→9.6 MB (lifted PNG compresses
  worse). Verified: shipped roughnessMap samples 0.794 in three.js,
  skin still live.
- 53e56fb THE MACHINE BLOCKED OUT: meshy failed the catapult turnaround
  (fused 50 MB blob — THE MESHY BOUNDARY, art bible §10: organic/static
  only). Hand road instead: catapult.blend built from primitives on
  empties at scene.ts's exact pivots, styled from the turnaround
  (committed as project/concept/catapult-turnaround.png). Three review
  rounds: (1) shape blessed; (2) GIMBAL BASKET ruling — dish on its own
  scoop_pivot hinge, counter-rotated level, cradles the topping at
  every tension; LAUNCH PARITY — sim spawns at 1.2 m (ballistics.ts:82,
  core, untouchable), apex lowered to 0.72 + arm 1.35 so the seat
  sweeps 1.32 (full winch) – 1.89 m (idle); drum bracket rebuilt;
  (3) SWING CLEARANCE — counterweight arc swept numerically vs every
  deck member across the sim tension range, min gap 7.5 cm (plank_rear
  became a low stretcher UNDER the swing); bowl deepened 0.10→0.17 at
  held diameter. Review renders on a claude.ai artifact page.
- 91d0f70 THE MACHINE DRESSES: catapult.glb 520 KB. NEW hand-road
  export laws (art bible §11): MACHINES AUTHOR NOSE = +Y BLENDER (lands
  1:1 in machine space, no flip — the character −Y convention + π yaw
  MIRRORS the wheel across the posts); articulated nodes export at ZERO
  rotation (runtime drives absolutes; the .blend re-poses for viewing
  after export); check props (check_topping/cam/sun/ground/ref) stay
  out of the GLB. MachineRig gained DRIVE NODES (default = greybox
  parts) + dress(): clones the template per rig (shared resources,
  never dispose), re-points drives to named nodes, gimbal line
  scoopNode.rotation.x = -(tiltRad + armRad). Bucket raycast proxy
  (invisible — Raycaster ignores visibility) + toppingMesh reparent
  into the dish. Position-verify caught a round-1 slip renders never
  showed: traverse wheel + winch cluster authored group-space but
  parented under tilt_frame — 0.7 m rearward; fixed to greybox parity
  (wheel machine z 0, drum z 0.15, measured live). scene.test.ts +4
  (dressed contract: tilt on model node, gimbal sums to zero, topping
  reparent, missing-node fallback).
- df29a7d THE TENSIONER STEPS TO THE CRANK: visionary eye pass — winch
  flagstone read "over the wall" beside the new body. POST_SPOTS winch
  spot (1.5, -0.55) → (1.5, +0.15) (mid-flank at the crank); circle +
  manning zone move together (one-table law); gunner untouched
  (blessed). posts.test.ts re-pinned; live: town 0 stone at
  (1.5, -11.85).

## 3. Architecture and invariants (new this session)

- CHOREOGRAPHY POLLS, NEVER SUBSCRIBES (patron-body.ts header): body
  state derives from MatchView each frame; async loads and mid-banner
  joiners recover. Verdict identity-compared (net-handlers stores a
  fresh Judgment per ended order, nulls on fresh deal).
- GLTFLoader SANITIZES NODE NAMES (art bible §10): upper_arm.L arrives
  upper_armL. No dots in rig bone names; client speaks sanitized names.
- THE MESHY BOUNDARY: articulated mechanisms never ride the meshy road.
- THE HAND ROAD (art bible §11, binding): pivot scaffold first (empties
  at the client rig's exact hinges; names ARE the rebind vocabulary);
  machines author NOSE = +Y Blender; articulated nodes export at zero
  rotation; sim parity is MEASURED (launch origin inside the dish
  sweep, swing arcs swept numerically, interactables at post-law
  coordinates); check props excluded from export.
- MachineRig DRIVE-NODE pattern: update() speaks only to drive-node
  fields; greybox parts are the default (the fallback IS the machine);
  dress() aborts wholesale on any missing named node.
- THE GIMBAL: scoop_pivot counter-rotates -(tilt + arm) — the dish is
  level IN THE WORLD, cradling the topping at every tension.
- three.js Raycaster ignores visibility — the invisible bucketMesh in
  the dish is the deliberate crosshair proxy.
- Blender build law: primitive_cube_add(size=1) is 1 m — object scale
  IS the dimension (half-size renders lied until positions were
  verified). Verify positions, not renders — renders lied twice more
  this session (camera distortion; the group-space parenting slip).
- Ogre material law (art bible §10): meshy ships roughness ~0.54; the
  lift pattern is non-destructive (duplicate packed image, one K
  constant 0.45).

## 4. File map (delta)

- src/client/patron-body.ts — choreography state machine + POSES
  tables (deg recipes → rad, GLB-sanitized bone names), HEAD_TURN_MAX_RAD.
- src/client/patron-body.test.ts NEW — 9 pins.
- src/client/main.ts — patronBody.update(seq, verdict) wiring.
- src/client/ghosts.ts — lazy dwarf (requestDwarf on first upsert).
- src/server/main.ts — MIME .glb/.mp3.
- src/client/scene.ts — MachineRig drive nodes + dress(); loadModel
  ("catapult") in buildGameScene; gimbal in update().
- src/client/scene.test.ts — +4 dressed-contract pins (fakeCatapult
  mirrors the rebind vocabulary; dress() CLONES — query rig.group).
- src/client/posts.ts — winch spot (1.5, 0.15).
- public/models/catapult.glb NEW (520 KB); ogre.glb 9.6 MB (matte).
- project/blender/catapult.blend NEW, tracked — hand-authored source of
  record; holds check cam/sun/ground/ref-image/cherry; arm posed 0.5
  for viewing (ZERO before export).
- project/concept/catapult-turnaround.png NEW, committed (the .blend
  references it as the viewport ref image).
- project/plans/16 — slice 2 THIRD ACT block; slice 4.5 THE MACHINE.
- project/plans/15 — item 14 THE ASSET DIET (dist 29.3 MB and rising).
- project/research/16-art-bible.md — §10 amendments (bone dots, shiny
  pattern, meshy boundary), §11 THE HAND ROAD.

## 5. How to run, test, verify

npm run check (410 green at df29a7d); npm run build before 5175
verification. Blender MCP holds catapult.blend. Driver facts:
- Visionary's Browser pane usually HIDDEN — sync evals only, pump
  update() manually, verify positions/names, never trust renders alone.
- Ogre choreography smoke: pb = __game.getPatronBody(); pump
  pb.update(seq, judgment) with a fake full Judgment; read bone
  rotation offsets vs pb["rest"]; pb.act is the beat name.
- Machine smoke: traverse scene for name "tilt_frame" (2 instances =
  both towns); machine-space rel positions via matrixWorld: wheel
  (-0.86, 0.5, 0), drum (0.8, 0.5, 0.15), lever (0.55, 0.75, -0.75),
  jack (-0.66, 0.3, -0.95); scoop_pivot children include 2 unnamed
  Meshes (reparented topping + invisible proxy); greybox = 2 hidden
  unnamed Groups under the rig group.
- Post stones: CircleGeometry meshes near z -12; winch r 1.2 at
  (1.5, -11.85).
- Blender: read_homefile invalidates context MID-SCRIPT — file switches
  in their own MCP call. Export recipe: zero arm_pivot/scoop_pivot,
  select machine_root subtree minus check_topping, export_scene.gltf
  GLB use_selection export_apply, re-pose, save.
- A room server may already be running on the visionary's ports (5174,
  5199 were occupied) — never kill; test on a fresh PORT. Long-running
  servers serve fresh dist per-request but stale MIME tables.

## 6. Open items and decisions

DECIDED (do not re-litigate): choreography seam is polling; verdict
never yanked by a nag; hand road for mechanisms, meshy for
organic/static; nose +Y for machines; gimbal basket; launch parity via
model proportions (never touch ballistics.ts); winch spot (1.5, 0.15);
gunner spot blessed; the arm does NOT animate the throw yet (later
juice; release stays instant).
OPEN:
- Eye-pass tunables: LOOK_TURN_RAD sign/size (+Y = knife side, 20°),
  hold frame counts, shiny K 0.45, dish/beam/wheel proportions.
- The committed capture (project/concept/captures/) — visionary's pane
  open once; ogre now acts and the machine is dressed, better capture
  than ever.
- Meshy license tier check (before the deck).
- Asset diet (plans/15 item 14) — dist 29.3 MB; ogre.glb 9.6 MB is the
  fattest target (2048² textures; dwarf precedent halved to 1024²).
- MIME headers: the visionary's long-running room server needs ONE
  restart to serve the new .glb/.mp3 types.
- Standing ledger unchanged: name (slice 8), linger/runover playlist
  rows, ear/eye passes (8), items 6/8/11, audit tranche C, wind + Bite
  re-pin, slice 4 remainders (first-person hands, carried-topping wire
  archaeology, dwarf identity).

## 7. Next session focus

Visionary's words: (1) REPLACE REMAINING GREYBOX WITH MODELS before the
friend test. Inventory of standing greybox: pantry crates + topping
markers (scene.ts crate()), the shop stall, gate panels, pennant, walls
/plinths (core-mirrored), the cake (slice 5 — its own slice, census
laws bind), post flagstones (probably keep — game furniture), ready
circle (keep). Recommend: crates/stall/pennant via the hand road or
meshy-static as fits; the cake stays slice 5. (2) THE FRIEND TEST
TUNNEL from the visionary's PC (no laptop): npm run build, npm run
server (5175 serves dist + ws on one port), then a tunnel that carries
WEBSOCKETS — cloudflared quick tunnel (free, no account, wss rides) is
the likely first try; friend opens the URL, the served page auto-joins.
Verify: MIME headers correct through the tunnel (restart the server),
load time for 29.3 MB dist (the diet may become urgent), two-client
smoke. Windows firewall may prompt on first run.

## 8. Recommended reading order

1. This handoff.
2. project/plans/16-the-audiovisual-milestone.md — slice 2 third-act
   block, slice 4.5 THE MACHINE, slice 5 (cake laws if models come up).
3. project/research/16-art-bible.md §10–11 (both roads + boundaries).
4. src/client/scene.ts — MachineRig dress()/update() (the rebind
   pattern to reuse for any greybox swap) + buildGameScene's crate/
   stall/pennant greybox (the replacement targets).
5. src/client/patron-body.ts (the choreography, if touched).
6. src/server/main.ts (the friend-test server: MIME, static dist, ws).
7. project/plans/15-side-quests.md item 14 (the diet, pre-tunnel).
8. git log --oneline -7; memory: game-smoke-driver-notes.
