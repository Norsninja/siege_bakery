# Handoff — 2026-07-13 (twenty-second session) — THE FLEET, THE STAND, THE CLOCK, THE GLOW

## 1. Snapshot

Four discrete pieces landed and pushed; tree clean except one untracked
draft blend. Tip 75baa69; 503 tests, both tsc legs, npm run check green.
The build lane sits at entry 5 DONE (training lobby), entry 6 (patron
motion) unclaimed and NOT started. This session did NOT touch entry 6 —
it cleared pre-entry-6 debt (the rung-2 clock) and fleet/dress work.
Session end per the visionary's word: handoff now; next session REVIEWS
work + next steps, then DISCUSSES before proceeding — item 28 (the early
shutter) is the intended first build, but only after review + discussion.

Our commits this session (all pushed):
- 554b949 THE FLEET BOUNCES (six species' colliders)
- 1a447fa THE TARGET TAKES ITS BODY (wood_target_lg model + stand collider)
- b149b83 DOCS (item 25 addendum, item 27, fleet-lane strike)
- 3a516ef THE TARGET'S SOURCE ENTERS THE TREE (blend + turnarounds)
- 84df2a0 THE SOLO CLOCK GOES PER-RUNG
- 75baa69 THE GLOW FOLLOWS THE DRESS (stall highlight fix)
The visionary committed 3117ef0 (DOCS: path ledger) between our commits;
no conflict.

## 2. What changed this session

- **SIX-SPECIES COLLIDER FLEET** (554b949): six general-purpose agents
  dispatched in parallel against the ogre precedent
  (collider-scripts/author-ogre-colliders.py +
  export-patron-colliders.py). Every rig measured EXACTLY at ruled
  height → --scale 1. Rows in src/core/patron-collider.ts
  PATRON_COLLIDERS: frostgiant, treefolk, dragon, cyclops, cloudgiant,
  firegiant (ogre already there). Each has author-<species>-colliders.py
  recording the measured bands. Dragon wings excluded via the rig's own
  vertex groups; neck arc = vertical capsule stack. cast.test +
  patron-collider.test pin "the fleet is complete" (every SPECIES has a
  row). Blender driven HEADLESS via the Steam binary; the visionary's
  GUI instance was blank/clean (verified is_dirty + 0 objects before
  dispatch).
- **THE PRACTICE TARGET MODEL + STAND COLLIDER** (1a447fa, 3a516ef):
  wood_target_lg.blend exported via project/blender/export-target.py
  (tracked recipe — STRIPS the meshy emissive bake at export; a wooden
  target does not glow), dieted to target.glb 0.56 MB. RE-RULED (the
  visionary): the collider FITS THE STAND, not a cylinder.
  core/dessert.ts PRACTICE_STAND = authored boxes (board/legs/rail from
  the measured blend at ruled scale 3, board face w 5.31 y 1.13-5.41);
  dessertGeometry() forks to box oracles + cuboid colliders for spec id
  "practice" ONLY — every dessert row rides the cylinder road
  byte-identical (pinned). Census moved ONTO the stand: painted face
  (+z, toward town 0) + upward skin (board top edge, foot rail), 122
  samples. client/scene.ts setDessert dresses the GLB over the greybox
  by visibility. Live-smoked full cycle. Blend + 3 turnarounds committed
  on the visionary's word.
- **SOLO CLOCK PER-RUNG** (84df2a0): the visionary's rung-2 playtest —
  flat CREW_CLOCK 1.25 over-relieved rung 2 by ~a minute. Study
  (research/20 addendum, exact clock arithmetic on his two measured
  solo lines) confirmed rung 1 wants ~1.22, rung 2 wants ~1.03; the row
  can't move (shared with validated-fun duo). RULING: relief is the
  tutorial's. Solo factor moved onto the Rung row as `soloClock`
  (campaign.ts): rung 1 = 1.25, rung 2+ = 1.0. Deal reads literal 1.0
  for crew 2+ (duo zero-drift). CREW_CLOCK scalar RETIRED from tuning.ts.
  Pins re-cut in order-flow.test + room.test.
- **STALL HIGHLIGHT FIX** (75baa69): the greybox→GLB dress hid the
  interactable proxy by visibility; setHighlight kept glowing the hidden
  box (no visible light on a dressed prop — the visionary's catch). Fix:
  per-town `townGlow` override in scene.ts, resolved LIVE in
  setHighlight — glow the dressed GLB where registered, else the
  greybox. Raycast untouched (still the invisible proxy — dish-proxy
  law). Stall dress clones GLB materials per town. Live-verified in
  browser: crosshair on stall → GLB emissive 0x443300, off-angle 0.

## 3. Architecture and invariants

- **THE STAND FORK** (new): dessertGeometry(spec) forks to
  practiceGeometry() for spec.id === "practice" (box oracles: standTierOf,
  boxDistance, boxSurface, practiceCensus). ALL other rows ride the
  cylinder road unchanged. PRACTICE_STAND boxes are the ONE source both
  the sim collider and the client greybox read; the GLB model dresses
  those dims (model-fits-spec). Regenerate PRACTICE_STAND only by
  re-measuring the blend.
- **HIGHLIGHT FOLLOWS THE DRESS** (new law): when a greybox interactable
  is dressed with a GLB, the invisible proxy keeps CATCHING the crosshair
  (raycast, dish-proxy law) but the GLOW moves to the visible model via
  per-town townGlow[boundTown][kind], resolved live in setHighlight.
  Clone GLB materials per town (shared materials would cross-glow forts).
  The pattern the pantry/future interactable dresses reuse.
- **SOLO CLOCK IS PER-RUNG** (evolved): the clock relief lives on the
  Rung row (soloClock), beside clockSeconds/parShots. Only crew === 1
  applies it; crew 2+ reads a literal 1.0 at the deal (order-flow.ts).
  The crew dimension returns at that code site if a playtest ever asks
  for crew-scaled duo clocks. THE ONE DIAL is now per-rung soloClock.
- Standing (unchanged): core/+game/ headless (tsconfig.headless), seeded
  RNG only, per-deal collider swap both worlds, patronAtMark = empty
  table pre-run, the collider capsule DATA in core (the named exception).
- Blender: drive HEADLESS only via the Steam binary
  ("/c/Program Files (x86)/Steam/steamapps/common/Blender/blender.exe"
  --background <file> --python <script>); NEVER the visionary's GUI
  instance (MCP Blender tools). Confirm his instance blank at session
  start before any headless rig write.

## 4. File map (delta)

- src/core/patron-collider.ts — PATRON_COLLIDERS now 7 species.
- src/core/dessert.ts — PRACTICE_STAND, practiceGeometry, box oracles;
  dessertGeometry forks on "practice".
- src/game/campaign.ts — Rung.soloClock (rung 1 = 1.25, rest 1.0).
- src/game/order-flow.ts — freshOrder reads row.soloClock for solo,
  literal 1.0 for crew 2+. CREW_CLOCK import removed.
- src/game/tuning.ts — CREW_CLOCK RETIRED (doc block explains why).
- src/client/scene.ts — setDessert dresses target.glb; townGlow +
  setHighlight glowOf; stall dress registers per-town glow.
- project/blender/export-target.py — target export recipe (emissive strip).
- project/blender/collider-scripts/author-<species>-colliders.py ×6.
- project/blender/wood_target_lg.blend, target/*.png — committed source.
- project/research/20 — per-rung addendum. project/plans/15 — item 25
  addendum-resolved, item 26 addendum-resolved, item 27 (locked fort).
- project/plans/21 — fleet-lane collider row struck.

## 5. How to run, test, verify

- npm run check (503 green at 75baa69). npm run dev (5174; autoPort).
- Browser pane born HIDDEN on the visionary's side — worker-shim reboot
  recipe in memory game-smoke-driver-notes. AIMING THE CROSSHAIR at a
  prop (highlight/interaction test): park baker within REACH_M,
  __game.setLook(yaw,pitch) — yaw +π/2 faces -x, 0 faces +z; read camera
  forward from matrixWorld.elements [-e[8], -e[10]] (three imports in
  hidden pane are fragile). setHighlight fires from the per-frame
  crosshair raycast; glow = hit prop material.emissive 0x443300.
- Blend measure/export: headless Steam binary (§3). npm run diet -- <name>.

## 6. Open items and decisions

DECIDED (do not re-litigate): the stand collider fits the stand (boxes,
not cylinder); the census sits on the stand face + upward skin; solo
clock is per-rung, tutorial-only relief (rung 1 = 1.25, rung 2+ = 1.0),
duo zero-drift, CREW_CLOCK retired; highlight follows the dress
(townGlow override, raycast stays on the proxy); the target model faces
town 0 only (all lobby players dump in town 0 — town 2 unlocks by
purchase); wood_target_lg is THE model (wooden_target.blend is the
superseded draft); cloudgiant far re-read is low-value, skip unless it
bugs the eye.
OPEN:
- **wooden_target.blend** (28 MB) untracked superseded draft — delete or
  leave local (the visionary's call; not committed).
- **Item 28 THE EARLY SHUTTER** — approved (a) wait-for-quiet, NOT built.
  The polaroid fires while sprinkles still in flight; theatre waits for
  the town's air to clear (shots-view lifecycle predicate, ~2.5s cap).
  Sim win edge stays put; eat beat does NOT move. Client-only
  (patron-table beat sheet + snapshot call site).
- **Item 27 THE LOCKED FORT** — planned, unclaimed. Town 2's LOCK is real
  (sim); the LIE is presentation (lobby gates open, dead fort reads as
  bug). Fence rule gains ownership clause; grey pennant; buy = gate rises.
  Needs his ruling on dormant dress level + sign wording.
- **The pantry dispatch** (fleet lane) — ready; brief = crateY honesty
  (crates sit on top; keep them greybox so topping highlights survive)
  + winding audit. Highlight reconnection is client-side (my job on
  dress), not the agent's.
- **Rung 3-7 solo soloClock = 1.0** unmeasured — a per-cell bump waits
  for a solo playtest that asks.
- Standing backlog: batched eye pass (parade dials walk.ts, plank/stand
  shot-window feel, bench placement, bonk/scold/dab); FLAVORS ruling
  (with species orders); the name; release-gate organs; captures debt.

## 7. Next session focus

HIS WORD: review our work + next steps FIRST, then DISCUSS before
proceeding. The intended first build is item 28 (the early shutter) —
but discussion precedes it. Do NOT start entry 6 (patron motion) or item
28 without the review + discussion. After item 28, the natural sequence
is the pantry dispatch (fleet, parallel) then entry 6 patron motion
(tiers a+b, the gait audition routes the path).

## 8. Recommended reading order

1. This handoff.
2. project/plans/21-the-path.md (the ordered roadmap — build lane head
   is entry 6; fleet-lane collider row struck).
3. project/plans/15-side-quests.md: item 25 (BUILT + stand addendum),
   item 26 (BUILT + per-rung addendum), item 27 (locked fort), item 28
   (the early shutter — the next build), item 22 (patron motion = entry 6).
4. src/core/dessert.ts (PRACTICE_STAND + practiceGeometry fork) +
   src/game/campaign.ts (soloClock).
5. src/client/scene.ts (setDessert target dress + townGlow/setHighlight
   + stall dress) — the highlight-follows-the-dress pattern.
6. src/core/patron-collider.ts (the 7-species fleet).
7. project/research/20-clock-relief-study.md (the per-rung derivation).
8. git log --oneline -10; memory game-smoke-driver-notes (twenty-second
   additions: the stand, the glow, crosshair-aiming recipe).
