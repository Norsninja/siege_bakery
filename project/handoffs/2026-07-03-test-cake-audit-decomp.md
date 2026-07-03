# Handoff — 2026-07-03 (Test Cake SUCCESS + Senior Dev audit + decomp phase complete)

## 1. Snapshot

Three bodies of work landed this session, all committed at HEAD 0865b50,
115 vitest tests green, tsc strict clean, vite build clean:
1. Test Cake slice (plans/05): three tiers replace the box cake, crown
   requirement replaces the peak-zone stand-in, settle ladder re-pinned
   per tier × notch from a reproducible ballistics study. Playtested by
   the visionary: works, notes recorded below.
2. Senior Dev audit (visionary-requested, outside any plan): 7 findings
   F1–F7, severity-ranked. All actionable ones are now CLOSED.
3. Decomp phase (plans/06): 10 commits exactly as planned — CI/README
   (F6), client/main.ts decomposed 802→~310 lines across 7 modules (F1),
   shots/bakers collision groups (F3), client-never-declares-ending (F5),
   baker docstring (F7 item), welcome-carries-the-world (F2, verified
   over real ws). NEXT SESSION: plan the frosting slice, with ROUND
   (cylinder) tiers riding at the FRONT of it.

## 2. What changed this session

- Test Cake (commit e030422):
  - research/03-tier-ladder-study.mts — reproducible headless study
    (`npx tsx`), fired clicks×notch grid at 3 candidate geometries.
  - core/arena.ts: CAKE_TIERS [{half 4, 0→2}, {half 3, 2→3.5},
    {half 2.25, 3.5→5}] at CAKE_Z −30; tierOf(pos) (topmost-tier match,
    0.1 wedge slack); isOnCake = tierOf !== null; ZoneId =
    "cake"|"tier1"|"tier2"|"tier3" (peak retired); CAKE_POS/CAKE_HALF/
    PEAK_HALF deleted.
  - game/judgment.ts: Requirement kind "crown" — met iff the uppermost
    on-cake settled topping (strictly greatest y, ledger order breaks
    ties) is the demanded topping AND rests on TOP_TIER. A later, higher
    wrong topping un-mets it (lime decoy is a live hazard).
    describeRequirement: "1 × cherry AS THE CROWN". Tier zone labels
    BOTTOM/MIDDLE/TOP TIER.
  - game/patron.ts: rule 3 appends {kind:"crown", topping:"cherry"}
    ("...IT NEEDS A CHERRY. ON THE VERY TOP. NOTHING ABOVE IT."); rule 2
    nag only tightens count rows (no "more crown").
  - Pinned settle ladder (ballistics.test.ts, traverse 0): notch 0 —
    5 short / 6 TIER-2 ledge (places) / 7 TIER 3 (places, knife-edge) /
    8 clean over (splat, mess). Notch 1 (70°) — 7 tier-1 ledge (splat) /
    8 TIER 3 (splat) = THE tier-clearing shot; winch clamps at 8 so
    "crank to the stop + one notch" cannot overshoot. Notches 2/3 comedy
    unchanged. This is the tier data the plans/04 ladder decision waited
    for.
- Audit (recorded in chat only; findings tracked via plans/06): F1 god
  file, F2 late-join empty world, F3 baker contaminates shot sim, F4
  latency vs click ladder (OPEN, needs friend test), F5 banner race,
  F6 no CI, F7 minor (body growth, fixed seed, bundle size, stale
  comment). Also: README existed (thin) — audit overstated that gap.
- Decomp phase (plans/06, commits b3cdf5d..0865b50):
  - .github/workflows/ci.yml (activates when a GitHub remote exists),
    `npm run check` = tsc --noEmit && vitest run, README expanded.
  - New client modules: hud.ts (pure text: arcGlyph/promptFor/
    bannerText/hudLines), input.ts (grip law as pure fns updateGrip/
    deriveOp/deriveMove/machineEngaged + InputTracker DOM wiring),
    state.ts (MatchView + createMatchView + predictClock), 
    net-handlers.ts (applyServerMsg(view,msg,fx); NetFx = spawnShot/
    spawnResting/upsertGhost/removeGhost/flash), ghosts.ts
    (GhostManager), scene.ts (buildGameScene + MachineRig + TOPPING_
    COLORS + sphere helper), shots-view.ts (ShotsView: visual lobs,
    markers, spawnResting; its step() advances the SHARED world once
    per tick — never add a second world.step).
  - core/constants.ts: GROUP_WORLD/BAKER/SHOT + BAKER_COLLISION_GROUPS
    (world only) + SHOT_COLLISION_GROUPS (world+shots, never bakers).
    Applied in baker.ts and projectiles.ts. Cost accepted: shots fly
    through bakers, bakers wade through litter — determinism until the
    server simulates bakers.
  - state.ts predictClock: client display clock clamps at 1 tick; order
    status flips ONLY on authoritative messages (tickOrder no longer
    used client-side).
  - protocol.ts: welcome gains toppings: RestingTopping[] ({topping,
    x,y,z}); projectiles.ts gains resting() (bodies minus in-flight) and
    spawnAtRest(); room join() sends it; client recreates each as a live
    obstacle (prior settled toppings shape later landings). In-flight
    shots deliberately excluded from the snapshot.
  - New tests: hud strings incl. culprit law; grip regression
    (crosshair-slip never turns W/S into walking); net-handler message
    law; predictClock clamp; baker-under-arc byte-identical settle;
    late-join welcome (settled cherry included, mid-flight lime not).

## 3. Architecture and invariants

- Layering law unchanged: core (Rapier ok, no DOM/three) ← game ←
  server; client imports anything. ONE match implementation
  (server/room.ts); solo = loopback room-of-one.
- Determinism: seeded rng only; fixed 60Hz; sync-shots-not-surfaces;
  scoring truth = REST position via Room's settled ledger; NEW —
  shots and bakers must never collide (collision groups, F3), and the
  client never declares an order ending (F5).
- Client shape after decomp: main.ts is boot + transport pick + fixed
  loop + wiring ONLY. New logic goes in the modules, with tests; hud/
  input/net-handlers/state are DOM-free and headless-testable.
- Decomp discipline (keep for future refactors): move-commits zero
  behavior change (proven by the __game smoke driver), fix-commits one
  finding each, never mixed.
- Design calls not to re-litigate: mistakes execute; no prediction UI;
  limes never ordered (decoy); crown = uppermost on-cake topping ON the
  top tier; +15° ladder KEPT (tier data now exists — re-spacing waits
  for frosting-era reasons); spotter informal; pennant by the machine.

## 4. File map

- src/core/: constants (+collision groups), rng, baker (client-auth
  movement; groups), ballistics (launchVelocity(traverse,clicks,tilt)),
  projectiles (ProjectileManager +resting/spawnAtRest, absorption 0.15),
  arena (CAKE_TIERS/tierOf/isOnCake/ZoneId tiers/colliders).
- src/game/: catapult (TENSION_MAX_CLICKS 8, TILT 4×15°, screw law),
  judgment (crown + count rows, judge mess .6/waste .4), order
  (mutable rows, evaluateOrder), patron (Giant tree), protocol
  (welcome+toppings; op/lever/load; scored/order/patron).
- src/server/: room.ts (THE match; ORDER_SECONDS 90, PATRON_LOOK_EVERY
  720, standardRequirements = 3× cherry on-cake), main.ts (ws 5175,
  serves dist/).
- src/client/: main.ts (wiring+loop), state, net-handlers, hud, input,
  ghosts, scene (MachineRig), shots-view, net (transports). Tests
  beside each pure module.
- project/plans/: 01–02 greybox (done), 03 patron (SUCCESS), 04 high
  arc (done, ladder decision), 05 test cake (BUILT, exit = visionary
  playtest verdict recorded in chat: good, notes below), 06 decomp
  (BUILT, build record).
- project/research/: 01 port-gap (roadmap), 02 vision alignment,
  03 tier ladder study script.

## 5. How to run, test, verify

- npm run dev → 5174 loopback solo; npm run server → 5175 (build dist
  first if serving pages from it; vite page joins with
  ?join=ws://localhost:5175).
- npm run check (tsc + 115 tests) — the pre-commit gate. CI yml exists
  but no GitHub remote yet.
- __game handle unchanged (+ shots is now the ShotsView). Smoke driver
  pattern (used throughout): send op crank:true, poll getMachine().
  tensionClicks every ~10ms, crank:false at target, send lever, sleep
  ~7s for settle; screw via op screw:1 until tiltNotch. Full smoke:
  6cl → 1/3, 7cl → 2/3 + crown demand at next look (pre-satisfied by
  the 7cl cherry), notch1+8cl → WON 100/3★.
- Preview quirk (hit twice): tab goes visibilityState=hidden after
  reload → rAF loopback sim freezes → restart the preview server. Not
  a game bug.

## 6. Open items and decisions

Visionary playtest notes on the Test Cake (2026-07-03, all deferred to
frosting-era order redesign, do NOT patch now):
1. Cherry arithmetic reads confusingly (3 on-cake row + crown row can
   total 4 cherries; nag can make it 5). Frosting re-bases orders;
   fold "orders read as one number of things" into that design.
2. Tiers should be ROUND cylinders. Assessed EASY (~half day: cylinder
   colliders, radial tierOf, CylinderGeometry, re-run study + re-pin;
   centerline ladder likely survives). DECISION: ride at the FRONT of
   the frosting slice so the frosting census math is built once against
   final geometry — not saved for an art pass.
3. Elevation ladder re-calibration still waits for its reasons:
   frosting % coverage + sprinkles on frosting + cherry on top.

Other open:
- F4 latency vs click ladder: the one audit finding that needs the
  friend test (deferred by visionary — more 2D parity first). Watch:
  humans will overshoot the winch by ~1 click at 80–150ms RTT; ideas
  on record: predicted machine state, click-boundary release
  forgiveness.
- F7 remnants (cheap, unscheduled): Room bodies grow unbounded across
  deals; rng seed fixed 0xcafe per boot; bundle 984KB gz no splitting.
- Friend test itself: tunnel 5175; welcome-snapshot (F2) now makes
  refresh/late-join clean.
- Patron difficulty watch items (plans/03) unchanged.

## 7. Next session focus

PLAN THE FROSTING SLICE (write plans/07). Inputs: research/01 §F (2D
port map: frosting = surface accumulation + sample-point census, NOT
voxel sim; 2D judgment.ts measurement bodies port then; gate-2 weights
return home — coverage 0.35/neatness 0.15/integrity 0.25/mess 0.15/
waste 0.10). Sequence inside the slice: (1) round tiers first (re-run
research/03 study with cylinders, re-pin ladder), (2) frosting
projectile + splat surface accumulation, (3) census sample points +
coverage requirement kind, (4) sprinkles on frosting, (5) order/demand
redesign incl. the cherry-arithmetic note. Client code goes in the new
modules, not main.ts.

## 8. Recommended reading order

1. This handoff.
2. CLAUDE.md — law, commands.
3. project/research/01-port-gap-analysis.md — roadmap; §F frosting.
4. project/plans/05-test-cake.md — tiers, crown, pinned ladder.
5. project/plans/06-decomp-phase.md — new client shape + build record.
6. src/core/arena.ts + src/game/judgment.ts — what frosting extends.
7. src/server/room.ts + src/game/protocol.ts — match + wire truth.
8. src/client/ (main, scene, shots-view, net-handlers) — where client
   frosting code will live.
9. project/plans/03-patron-slice.md + 04-high-arc.md — only if tuning
   questions come up.
