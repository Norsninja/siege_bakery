# Handoff — 2026-07-12 (twenty-first session) — THE TRAINING LOBBY + THE OPENING PARADE, ENTRY 5 STRUCK

## 1. Snapshot

Entry 5 (plans/15 item 25) built, live-smoked, committed, pushed. Tip
c35d555; 494 tests, both tsc legs, npm run check green. Three of our
commits: bd1f1e6 (the build), 0619ff1 (docs), c35d555 (lean removal —
his eye ruled the sustained lean off-putting). The visionary committed
his own work mid-session (bakery/stall/scene.ts stall dress — 7618b24,
1e9274c, bddda03); his tree still carries UNCOMMITTED/untracked files
(§6). He authored a PLANK TARGET MODEL during the session:
project/blender/wood_target_lg.blend (21 MB, the one to use) — next
session integrates it. Blender GUI is OPEN, CLEAN, BLANK CANVAS — his
explicit word; the collider-marker fleet gate is OPEN.

## 2. What changed this session

- bd1f1e6 THE TRAINING LOBBY:
  - core/dessert.ts: PRACTICE_TARGET spec (id "practice", ONE tier
    radius 3 / top 5, radius tight to the plank per the forcefield
    rule; NOT in DESSERT_SPECS, never dealt by RUNGS, never on wire).
  - game/campaign.ts: dessertSpecFor(phase, rung) — THE ONE derivation
    both worlds resolve standing geometry through: running/runover →
    specForRung(max(1,rung)); lobby/countdown → PRACTICE_TARGET.
  - game/cast.ts: patronAtMark's interim lobby branch RAZED exactly as
    entry 4's cross-note named — lobby/countdown/runover return null
    (one line: phase !== "running" → null).
  - server/room.ts: boot + redealDessert derive via dessertSpecFor;
    NEW redeal at the runover→lobby edge (tickRunover "lobby" — same
    one redeal path, then broadcastRun).
  - client/net-handlers.ts: welcome binds dessertSpecFor(phase,rung);
    fresh-deal path unchanged (specForRung — a fresh deal is always a
    live rung); "run" case gained THE STANDING-GEOMETRY RECONCILE —
    derived spec id compared to bound id, rebind with the full redeal
    ordering (clearCakeSolids → bind → clearStuck → clearLandingRings)
    on mismatch. state.ts placeholder uses dessertSpecFor("lobby",1).
  - client/scene.ts: setDessert takes the SPEC; id "practice" builds a
    greybox wooden plank (board + painted disc + legs) instead of tier
    cylinders. Abort-to-greybox until his model lands.
  - client/patron-table.ts: update() gained phase. Pre-run: snapEmpty
    (table cleared, lastVerdict synced so stale post-loss edges never
    fire into a fresh run), ensureBench (rung 1's patron standing at
    BENCH_POS game (155,−10), the s15 rest-stop site). Parade block
    (after verdict edges, before snap): bench → arriving at
    b.speed = PARADE_SPEED; arriving now SEATS ITSELF on arrival when
    no verdict pending (the parade has no verdict-null edge).
    benchRequested resets every running frame (else next lobby never
    re-requests after a mid-countdown flip).
  - client/line.ts: update() gained phase. lobbyShown three-state
    (null = first frame adopts silently — late joiners snap, never
    parade). Pre-run: rebuild filters slots to impostor tier (horizon
    only; templates STILL stream — requestTemplates always runs).
    ALL-IN edge: near tiers rebuilt with from = slot.x +
    PARADE_DISTANCE_M, animTotal/animFrames = LINE_PARADE_FRAMES
    (column formation march). spawnFromX: templates landing mid-anim
    spawn IN COLUMN on the road (loading-as-fiction). Template-arrival
    rebuild never snaps mid-anim. animTotal generalizes the old
    hardcoded ADVANCE_FRAMES in both lerps.
  - client/walk.ts: PARADE_SPEED 0.22 (~13 m/s, ruled EAGER),
    PARADE_DISTANCE_M 150, LINE_PARADE_FRAMES 1000 (~9 m/s,
    brisk-but-behind).
  - main.ts: phase wired into patronTable.update and line.update;
    setDessert call sites pass spec.
  - Tests: campaign.test (dessertSpecFor pins, practice-not-dealable),
    cast.test (lobby/countdown null), room.test (patron-mark test
    re-pinned to empty lobby; NEW training-lobby describe: boot plank
    → cake-1 at deal → runover holds final cake → lobby restores
    plank; F2 welcome test re-pinned — the 6-click cherry now rests on
    the floor beside the plank y≈0.3), net-handlers.test (lobby
    welcome binds practice; runover→lobby run word rebinds with full
    ordering; quiet lobby words no-op).
- 0619ff1 DOCS: item 25 BUILT (the plank re-ruling, wooden-skin shape,
  narrowed teaching scope = range/traverse only, mirror residue,
  pending eye dials); entry 4 cross-note CLOSED; plans/21 entry 5
  struck; fleet practice-cake row CANCELLED (he provides the model);
  plans/20 §2 names the greybox plank.
- c35d555 THE LEAN COMES OFF: holdLean removed from patron-body; the
  bench ogre stands and breathes. Item 25 + plans/21 note: the bench
  wants a real SITTING animation (no leg bones — mesh/animation work,
  its own asset session, NOT a quick fleet row).

## 3. Architecture and invariants (new this session)

- THE WOODEN-SKIN SHAPE: the practice target IS a dessert spec row.
  Never build a parallel target institution — colliders (both
  worlds), frosting field, painted-count verdict oracle, item-1 rings
  all ride the existing dessert machinery for free. Only the CLIENT
  VISUAL branches (setDessert's practice arm).
- dessertSpecFor is the patronAtMark discipline applied to the plate:
  one pure derivation, both worlds, poll-by-compare on the client
  (spec id string compare per run word), edge-free.
- A fresh deal ALWAYS binds specForRung — "practice" never arrives via
  msg.fresh; the reconcile owns only the way OUT of a run.
- Deal-before-redeal is safe: asks price from AUTHORED tables
  (TOWN_ASK_POTENTIAL × CREW_LABOR), never the standing census.
- MIRROR RESIDUE (ruled, accepted): at ALL-IN the capsules stand at
  the mark ~10 s before the parade body arrives — the exact mirror of
  the departing-giant residue. No client-signal fix exists by law.
- Parade edges are MODE edges, not verdict edges: both managers sync
  lastVerdict pre-run so a stale post-loss verdict can never teleport
  the walker; first-frame adoption (lobbyShown null / bench null)
  means late joiners snap, never parade.
- The arriving body self-seats on arrival ONLY when no verdict is
  pending; mid-linger arrivals still wait for the fresh deal's
  verdict-null edge (old behavior preserved exactly).

## 4. File map (delta)

- src/core/dessert.ts — PRACTICE_TARGET row + why it's not in
  DESSERT_SPECS. src/game/campaign.ts — dessertSpecFor.
- src/game/cast.ts — patronAtMark (empty-table truth).
- src/server/room.ts — constructor/redealDessert/runover-edge.
- src/client/net-handlers.ts — welcome + run-word reconcile.
- src/client/scene.ts — setDessert(spec) with plank greybox arm. NOTE:
  visionary's stall-dress work also lives here (stallPlacements — his
  commit, don't disturb).
- src/client/patron-table.ts — BENCH_POS, snapEmpty, ensureBench,
  parade handoff, self-seating arrival, TableBody.speed.
- src/client/line.ts — lobbyShown, animTotal, spawnFromX, parade edge.
- src/client/walk.ts — PARADE_SPEED / PARADE_DISTANCE_M /
  LINE_PARADE_FRAMES (all eye-pass dials).

## 5. How to run, test, verify

npm run check (494 green at c35d555). Memory game-smoke-driver-notes
has twenty-first-session additions: lobby = plank (tension 6 frosting
paints it ~18 samples; getPatronCollider null pre-run; table null;
bench group at (155,−10) scale 1.71); run-cycle fast-forward recipe
(ticksLeft=60 poke + park OUT of circle + __timeScale 8); parade probe
recipe (200ms interval armed BEFORE ready-up; walker ~13-14 m/s).
Worker-shim reboot recipe unchanged. The old "lobby cake is cake-1"
recipes are DEAD.

## 6. Open items and decisions

DECIDED (do not re-litigate): everything in §3; the plank re-ruling
(cupcake painted on a wooden plank, HE provides the model, greybox
meanwhile, model-fits-spec); teaching scope = range/traverse only;
parade starts EAGER; the lean is DEAD — a real sitting animation is
the path (own asset session).
OPEN:
- HIS UNTRACKED/UNCOMMITTED FILES (ask, never commit blind):
  project/blender/wood_target_lg.blend (21 MB — THE model, his word:
  "replaces the plank stand"), wooden_target.blend (28 MB, earlier
  draft), project/blender/target/*.png (turnarounds), giants-far.blend
  still modified. Turnaround-provenance culture suggests committing
  turnarounds + blend on his word.
- WOOD TARGET INTEGRATION (next session's build): the road recipe —
  export wood_target_lg to glTF, npm run diet, ship as a model the
  setDessert practice arm dresses over the greybox (abort-to-greybox
  law). Check dims against PRACTICE_TARGET (r3/top5); if the model
  disagrees, the SPEC wins (model-fits-spec) or re-pin the spec with
  him. Loader seam: assets.ts loadModel.
- COLLIDER-MARKER FLEET GATE IS OPEN: he confirmed Blender is open,
  CLEAN, blank canvas — the six species' rig .blends are safe to
  write headlessly. Dispatch against author-ogre-colliders.py +
  export-patron-colliders.py (--scale 1 for all six — they ship at
  ruled height; dragon = capsule the seated mass). Rows paste into
  core/patron-collider.ts; table pins audit them.
- Visionary's ear/eye: plank greybox look, parade pacing dials,
  bench placement, plus the standing s18-20 backlog (bonk feel, scold
  wording, dab look, CREW_CLOCK[1] solo playtest — THE ONE DIAL).
- Sitting animation for the bench ogre — own asset/design session.
- Release gate TODO organs; captures debt; meshy license; FLAVORS.

## 7. Next session focus

HIS WORD: handoff now, continue next session after review +
discussion. The natural next work: (1) integrate
wood_target_lg.blend (road recipe → dress the plank greybox); (2)
dispatch the six collider-marker fleet agents EARLY (gate open —
confirm Blender still clean at session start); (3) his eye pass on
the training lobby (parade pacing, plank look, bench placement) —
smoke recipes ready. Review first, then discuss before building.

## 8. Recommended reading order

1. This handoff.
2. plans/15 item 25 (the full BUILT record + pending dials) + plans/21
   entry 5 strike + fleet lane (collider markers row, sitting-
   animation note).
3. src/game/campaign.ts dessertSpecFor + src/core/dessert.ts
   PRACTICE_TARGET (the institution).
4. src/client/scene.ts setDessert practice arm (where the model
   dresses in) + src/client/assets.ts loadModel (the seam).
5. src/client/patron-table.ts (bench/parade) + src/client/line.ts
   (parade) — only if touching theatre.
6. project/blender/collider-scripts/ (the fleet's precedent) +
   plans/21 fleet lane rows.
7. git log --oneline -8; memory: game-smoke-driver-notes
   (twenty-first-session additions).
