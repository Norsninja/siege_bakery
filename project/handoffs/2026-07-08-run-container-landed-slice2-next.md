# Handoff — 2026-07-08 (second session) — REVIEW FIXES + PLANS/13 AUTHORED + SLICE 1 (THE RUN) LANDED

## 1. Snapshot

Three arcs this session, all landed and visionary-approved. (1) The
review of the vernier/gun-crew build found two E-edge wiring bugs in
main.ts; fixed by moving the precedence chain under test and making the
crosshair pantry-only (d6c4dd8, 274 tests). (2) THE CAMPAIGN was
discussed and plans/13 authored IN FULL from the visionary's rulings
(order N = rung N = N-tier cake; a failed order ends the run; shared
purse resets per run; shop only in the separator; ready circle). (3)
Plans/13 SLICE 1 — the run container — is BUILT, live-verified through
a full loop, and feel-tested by the visionary same day (4fc5227, 290
tests, both tsc legs). HEAD 4fc5227. NEXT SESSION: review the slice-1
work together, then DISCUSS slice 2 (the DessertSpec core refactor,
plans/13 §3) before building it.

## 2. What changed this session

- REVIEW FIXES (d6c4dd8): the E-edge precedence chain moved from
  main.ts wiring into interactions.ts as `resolveEEdge`, TESTED — same
  order (step off > pantry interaction > man the zone) but each stage
  consumes the edge only when it ACTS. Fixed: (a) stepping off a post
  also loaded the bucket under the crosshair; (b) an empty-handed press
  at the bucket died instead of manning. Crosshair went PANTRY-ONLY:
  MACHINE_CONTROL_KINDS (hud.ts) drops wheel/screw/winch/lever from the
  raycast (scene.bindTown) and `pantryTarget` refuses them (belt +
  suspender; keeps interactions.ts's lever branch unreachable). The HUD
  post invite YIELDS to an actionable target via `interactionActs` (dry
  run of real rules, never a copy). promptFor redirect cases + meshes
  superseded-kept for rollback. Friend-test watch item in plans/14: if
  first-timers flounder at a mute machine, signposts return without the
  "· E", suppressed in-zone.
- PLANS/13 AUTHORED (project/plans/13-the-campaign.md): the full plan —
  DessertSpec shape (§3), the ladder + re-pin law (§4: no rung ask is
  pinned until its spec ran research/13 + /11; the ladder's top is
  where the tools say the envelope dies), economy (§5: shared purse,
  walk-up stall, town 2 flagship + fudge), run container (§6), non-
  goals (§7), six build slices (§8), open items (§9). Supersedes
  plans/09 §2's twist-per-rung ladder: geometry escalates, the ECONOMY
  counters (towns/fudge are shop purchases, not rung twists).
- SLICE 1 (4fc5227): RunFlow (game/run-flow.ts) — LOBBY → COUNTDOWN →
  RUNNING rungs → RUNOVER → LOBBY. Ready circle = gold glass at
  READY_CIRCLE (core/arena.ts, (-3, 8) r 1.6, town 0); run starts when
  ALL connected bakers stand inside through a 3s countdown; stepping
  out or a mid-count joiner cancels. Room phase-gated: outside a live
  rung the bakery is a SANDBOX (machines crank/fire, landings litter,
  nothing scores/ticks, Patron silent, gates open, pickTown free). WON
  order → rung++ at the redeal boundary (no lobby between rungs); LOST
  → RUN OVER report (12s, no fresh deal, sad cake stays) → lobby; a
  crew still in the circle auto-restarts (intended). Wire: `run` msg +
  welcome.run (RunWire). Client: phase-aware HUD top block, run report
  banner, "the run ends in Ns" on run-ending losses (NextOrderNote.
  runEnds), run-start carry-home edge. endedWon captured at the
  JUDGMENT site for wins (a won order never transits tickClock) and at
  clock death for losses. OrderFlow.dealFresh() extracted; startRun
  shares the linger redeal's physical resets.
- TESTS 263→290: interactions (pantryTarget/resolveEEdge/
  interactionActs), run-flow unit laws, Room container laws (lobby
  sandbox, ready gate, joiner-cancels), hud/net-handlers re-pins.
  room.test.ts: `readyUp` helper; all order-lifecycle tests ready up
  first; TWO LAW RE-PINS — "a LOST order ends the RUN" (replaces "the
  patron orders again"), stale-glob test re-timed to straddle the NEXT
  RUN's deal. Fresh-deal finders must search AFTER the loss (the
  ready-up's own deal is fresh too — this bit once).
- Memory (auto): game-smoke-driver-notes gained the fully-hidden-tab
  cure (worker rAF shim recipe) + time acceleration (virtual timestamps
  ×10; MUST seed vt = performance.now()).

## 3. Architecture and invariants

All prior laws hold. New/refined:
- ONE PRESS, ONE MEANING, mechanized: resolveEEdge is the E-edge law —
  each precedence stage consumes the edge only when it acts. Rules in
  wiring is what let both review bugs past 263 tests; the chain lives
  under vitest now.
- THE CROSSHAIR SPEAKS ONLY TO THE PANTRY LOOP while the gun crew
  runs: MACHINE_CONTROL_KINDS is the one set (raycast filter + edge
  filter). Rollback re-admits the kinds in scene.bindTown.
- THE RUN CONTAINER: RunFlow owns phase+rung only; the Room owns
  broadcasts and physical resets (OrderFlow's division, repeated).
  Outside "running" the dormant order is never broadcast as live —
  order-status-driven behaviors (gates, pickTown, clock broadcast,
  scoring) are ALL phase-gated; grep `run.phase` in room.ts/main.ts
  before adding another.
- A LOST ORDER REDEALS NOTHING. The next deal is the next run's.
- The ready gate needs EVERYONE: a connected member with no reported
  pose cannot be ready (blocks the countdown).
- Campaign rulings of record (§6 decisions) — do not re-litigate.

## 4. File map (delta over prior handoffs)

- project/plans/13-the-campaign.md — THE campaign plan; slice 1 marked
  built in §8.
- src/game/run-flow.ts — RunFlow; run-flow.test.ts — its laws.
- src/game/tuning.ts — + READY_COUNTDOWN_TICKS (180), RUNOVER_TICKS
  (720).
- src/game/order-flow.ts — dealFresh() extracted from tickClock.
- src/game/protocol.ts — RunWire, `run` ServerMsg, welcome.run.
- src/core/arena.ts — READY_CIRCLE + inReadyCircle.
- src/server/room.ts — run field, phase-gated lifecycle/scoring/clock/
  pickTown, allReady/readyCount/startRun/runWire/broadcastRun,
  endedWon.
- src/server/roster.ts — allPoses().
- src/client/interactions.ts — pantryTarget, interactionActs,
  resolveEEdge (+ tests).
- src/client/hud.ts — MACHINE_CONTROL_KINDS, phase-aware top block,
  runOverLine/runOverText, NextOrderNote.runEnds, RUNG N header.
- src/client/scene.ts — bindTown raycast filter; gold ready circle +
  setReadyCircle.
- src/client/main.ts — resolveEEdge wiring, invite-yield, orderLive
  (phase-aware gates/pick), run-start carry-home, runover banner,
  __game.getRun.
- src/client/state.ts / net-handlers.ts — view.run + run msg handling
  (+ transition flashes).
- project/plans/14-gun-crew-posts.md — review-round section + watch
  item.

## 5. How to run, test, verify

npm run check (290 green at HEAD). Dev preview 5174; visionary's server
5175 — never kill. THE GAME BOOTS INTO THE LOBBY now: any smoke must
walk the baker into READY_CIRCLE (-3, 8) and wait READY_COUNTDOWN_TICKS
+ slack before order play (room tests use the readyUp helper; browser
drives walk via setDebugInput). Fully-hidden preview tab: worker rAF
shim recipe + __timeScale acceleration in the driver-notes memory —
seed vt = performance.now() or the sim silently never ticks.

## 6. Open items and decisions

DECIDED (do not re-litigate):
- Campaign rulings 2026-07-08: order N = rung N = N-tier cake; failed
  order ends the run; purse SHARED and resets per run; shop open only
  in the separator; late joiners join mid-run instantly; rungs 1–2 get
  short clocks (~150/210s); economy starting scale = base 10×rung,
  +5/star, town 2 ~50, fudge ~25 (feel hypothesis); ready CIRCLE (not
  key/button); towns + fudge move to the shop (supersedes plans/09 §2
  twists); sundaes/cupcake later spec rows; trays = later chapter.
- E-edge/crosshair laws (§3). Review fixes + slice 1 both feel-tested
  and approved same day.
- Sequence: review slice 1 → DISCUSS slice 2 → build. Friend test
  (plans/12) inherits the lobby whenever it lands.

OPEN:
- Slice 2 (plans/13 §3): DessertSpec core refactor — spec-parameterize
  arena oracles (tierOf/isOnCake/isInZone/distanceToCake/cakeSurface/
  TOP_TIER), split dessert colliders from arena statics (rebuilt per
  deal), buildCensus(spec), deal msg carries rung. Prove ZERO DRIFT:
  cake-3 as a spec row must reproduce every pinned number (661 census,
  WIN-path pins) BEFORE any second row exists. DISCUSS FIRST.
- Feel-tunable: circle placement, countdown (3s), report (12s), lobby
  warmup-fire legality (watch item).
- plans/14 friend-test watch item: mute-machine teaching.
- Standing: audit tranche C post-friend-test; wind plan and
  Bite/integrity re-pin ownerless (integrity re-pin should cite the
  research/11 RE-RUN numbers); research/06 header still warns its
  ladder is stale.

## 7. Next session focus

1. REVIEW: walk this session's three commits (d6c4dd8, 4fc5227, plus
   the handoff commit) — §2 above, plans/13, plans/14 review round.
   Fix anything the review surfaces.
2. DISCUSS slice 2 (DessertSpec, plans/13 §3) with the visionary
   before building: the oracle parameterization strategy (bind-once
   DessertGeometry vs spec args), the collider split, the per-spec
   census pins, research-tool spec parameter.
3. Then build slice 2; the friend test (plans/12) remains ready
   whenever the visionary wants it.

## 8. Recommended reading order

1. This handoff.
2. project/plans/13-the-campaign.md — the blessed plan; §3 is slice
   2's spec, §8 marks slice 1 built.
3. CLAUDE.md current-state paragraph (rewritten this session).
4. git log d5dd26c..HEAD — the session's commits with live evidence.
5. src/game/run-flow.ts + src/server/room.ts (tickLifecyclePhase,
   startRun) — the container as built.
6. src/client/interactions.ts (resolveEEdge block) — the review fix.
7. src/core/arena.ts — CAKE_TIERS + the oracles slice 2 will
   parameterize; core/frosting.ts buildCensus (the 661).
8. project/plans/14-gun-crew-posts.md review round — the watch item.
