# Handoff — 2026-07-08 (fifth session) — SLICE 4 BUILT: THE LADDER LIVE, THE FLOURISH AMENDMENT RULED

## 1. Snapshot

Plans/13 slice 4 is BUILT (HEAD ab966c9; 313 tests, both tsc legs,
live-verified). THE LADDER IS LIVE: every rung deals its own spec,
asks, clock, and par — the slice-3 boundary is retired. The session's
big ruling is THE FLOURISH AMENDMENT (plans/13 §1): the crown is an
optional FLOURISH (the "fatality") now, never a requirement — it
amends THE IMPOSSIBLE TRAGEDY. Rung 7 is winnable by workload =
MASTER BAKER (banner skeleton shipped); the flourish on cake-6's dead
summit = ULTRA MASTER BAKER, the economy's future crown jewel. Slice
4 shipped CROWN-SHELVED (patron rule 3 deleted); the flourish is
SLICE 4B and needs its own DISCUSSION before building (§6 agenda).

## 2. What changed this session (one commit, ab966c9)

- DISCUSSION FIRST (visionary's order, honored): reviewed slice 3,
  then ruled — the flourish amendment (crown → optional, in-order,
  per-patron desires), par-per-rung (my gap finding, accepted),
  rung-7 triumph (MASTER BAKER; "since the six tier cake is almost
  impossible right now, it's perfect"), slice 4b scoping.
- THE FLIP: specForRung → specById(rungRow(rung).spec) — one function,
  both replicas (the client rebind followed for free, pinned in
  net-handlers.test: rung 2 binds cake-2). requirementsFor(row, towns)
  deals the per-rung ticket — sprinkles-0 omits the row (born-met +
  naggable otherwise); NO crown row anywhere. dealFresh(row) prices
  clock (clockSeconds) and par. standardRequirements survives as the
  anchor alias (rung 3's ticket) for scripts/studies.
- THE DEAL DECISION MOVED TO THE ROOM: OrderFlow.tickClock reports
  "lingerOver" and never self-deals — the Room runs orderConcluded
  FIRST, then dealFresh(rungRow(run.rung)) + redealDessert +
  broadcast. (The flow's old self-deal would have priced the OLD
  rung's asks over the NEW rung's cake — the ordering bug the
  discussion predicted.) On a loss/triumph the dormant lobby order
  deals internally as rung 1, never broadcast live.
- PAR PER RUNG: Rung gains authored parShots {solo, duo} (campaign.ts
  header formula: passSamples/7 + sprinkle bursts + flourish
  allowance + slack). Anchor forces solo rung 3 = 24 verbatim; duo
  prices the two-town workload (flat 24 punished exactly the play the
  high rungs demand — cake-6 duo ≈ 25 idealized shots). Cupcake reads
  8/10 over the formula's 5/7 (authored miss allowance — a 1.2 m disc
  makes misses the norm). Tuning's FROST_FRAC/SPRINKLES_NEEDED/
  ORDER_SECONDS/ORDER_PAR_SHOTS are ANCHOR REFERENCES now.
- PATRON RULE 3 DELETED (the progress-triggered required crown —
  condemned: as a requirement, a greatness trigger punishes good
  play; on cake-6 playing WELL would have been the run-ending
  mistake). The Giant keeps thunder/nag/urgency/whim. The cherry
  returns in 4b as his DESIRE.
- MASTER BAKER: RunFlow.orderConcluded → "runWon" at the top rung
  (never a silent replay); RunFlow.won → RunWire.won → the 👑 banner
  + HUD line. Won flag clears with the lobby (the triumph is the
  run's story).
- THE TRIPOD PLACES ITSELF PER SPEC (snapshot.ts — the tall-spec
  ledger item paid IN the slice): waist aim, 45° elevation, range =
  (summit/2 + 3.5) / tan(22.5°). Anchor frame preserved within half
  a meter; the cupcake leans in, cake-6 steps back.
- predictClock PHASE-GATED (found live): the lobby view's clock
  free-ran with its 1Hz correction gated off — invisible (lobby HUD
  hides the order) but dishonest state. Now predicted only while
  phase === "running".
- validateRungs() runs at Room boot (specForRung's `!` is honest).
- TESTS: 313 (from 307). The WIN script re-anchored to rung 3 via
  jumpToRung (replays the Room's own deal sequence through privates)
  — THE FLIP'S ZERO-DRIFT PROOF: the anchor plays today's standing
  order beat for beat, minus the shelved crown, and its win deals
  THE CUPCAKE (rung-4 ticket pinned on the wire). Late-joiner rest
  pin re-anchored to the LOBBY's cake-1 (y ≈ 2.3 on the single tier).

## 3. Architecture and invariants (new/changed)

- THE FLOURISH AMENDMENT (plans/13 §1, ruling of record): crown =
  optional flourish, in-order (never the linger), greatness-triggered
  (COVERAGE_GOOD bar, per discussion), per-patron desire data,
  verdict coda — NEVER gates the win. asks.crown is the per-rung
  FLOURISH FLAG; the measured summit table is its honesty ledger.
- THE DEAL LAW (slice 4): orderConcluded BEFORE dealFresh, always.
  OrderFlow never self-deals. Every deal path (startRun, nextRung,
  loss/triumph dormant) goes through dealFresh(row).
- THE ANCHOR LAW extended: rung 3's ticket must equal today's
  standing order exactly (order-flow.test pins rows/clock/par; the
  room WIN test is the physical proof).
- Par picks {solo, duo} by activeTowns at deal time; 3+ towns read
  duo (the ask table clamps the same way).
- rungRow's top clamp is DEFENSIVE ONLY now — runWon ends the run
  before any path asks past the top.

## 4. File map (delta)

- src/game/campaign.ts — parShots column, flip'd specForRung, header
  (flourish amendment + par formula + ladder-live).
- src/game/order-flow.ts — requirementsFor(row, towns), dealFresh(row),
  lingerOver (no self-deal), anchor-alias standardRequirements.
- src/game/patron.ts — rule 3 deleted (shelved note in place).
- src/game/run-flow.ts — runWon terminal, won flag.
- src/game/protocol.ts — RunWire.won.
- src/game/tuning.ts — anchor-reference notes on the four dead knobs.
- src/server/room.ts — Room-owned deal sequence, validateRungs boot,
  runWire won.
- src/client/hud.ts — MASTER BAKER banner/line; main.ts — predictClock
  gate + banner won; snapshot.ts — per-spec tripod.
- Tests: campaign/order-flow/patron/run-flow/room/hud/net-handlers.
- project/plans/13-the-campaign.md — §1 flourish amendment, §8.4
  scope + BUILT record, §8.3 amendment pointer.

## 5. How to run, test, verify

npm run check (313 green at HEAD). Live driving: preview_start "dev"
(autoPort; never kill the visionary's 5174/5175). Hidden-tab recipe
in memory game-smoke-driver-notes (worker rAF shim + __sleep worker +
virtual-time acceleration — all used this session, recipe verbatim).
Ready-up headlessly: `__game.baker.teleport({x:-3,y:1.2,z:8})` (the
gold circle) and poll getRun(). Research tools unchanged (spec argv).

## 6. Open items and decisions

DECIDED THIS SESSION (do not re-litigate):
- The flourish amendment (see §3) — including: fires at COVERAGE_GOOD
  (2-star; EXCELLENT is too rare to ever ship the beat), in-order
  (the linger belongs to the shop/switch; players not acting must
  not be held watching), per-patron desires (Giant cherry-on-top is
  v1; the desire TABLE waits for the patron roster).
- MASTER BAKER / ULTRA MASTER BAKER titles; trophy/fanfare/music/
  credits are a CONTENT PASS (no audio pipeline exists yet).
- Par column authored {solo, duo}; cupcake's miss allowance.
- Slice 4 shipped crown-shelved; there is NO cherry in the live game
  until 4b lands (the Giant keeps his other rules).

OPEN — SLICE 4B DISCUSSION AGENDA (DISCUSS FIRST, standing sequence):
- The desire's data shape: separate `desire` field on OrderState
  (keeps the requirements array's all-must-be-met invariant total)
  vs a flagged row; the verdict coda field; HUD golden row.
- Trigger mechanics: at a patron LOOK after coverage crosses the bar
  (character voice, 12s cadence) vs on the crossing landing; a fast
  finish forfeits the flourish chance (style needs room — acceptable?).
- The one-number-law guard moves into the desire machinery.
- Ultra on rung 7: verdict coda + title only, or report variant too?
- Purse bonus for the flourish is slice 5's (pay.perStar shape).
- Slice 5 after 4b: purse + pay + shop stall (town-2 + fudge).
- plans/15 unclaimed pre-friend-test: rings-per-catapult (1), report
  inset (3), trails (4). Cupcake hot-crown feel note now reads on the
  FLOURISH (crowns may bounce when the flourish ships — same flag).
- Standing: audit tranche C post-friend-test; wind plan + Bite/
  integrity re-pin ownerless; research/06 header stale-ladder note.
- Feel-pass watch item: rung pacing (150s cake-1 tutorial, cupcake
  precision beat) is authored hypothesis — the visionary's ladder run
  (plans/13 §8.6) judges it.

## 7. Next session focus

1. Review slice 4 with the visionary (run the ladder in preview —
   the lobby now deals a HUMBLE single-tier cake; rung climbs change
   the dessert live; check the feel of 150s clocks).
2. DISCUSS slice 4b (the flourish — §6 agenda), then build it.
3. Slice 5 (purse/shop) after; the friend test (plans/12) inherits
   everything.

## 8. Recommended reading order

1. This handoff.
2. project/plans/13-the-campaign.md — §1 THE FLOURISH AMENDMENT (the
   session's ruling), §8.4 scope + build record, §8 slice 4b.
3. src/game/campaign.ts — header (par formula, ladder-live) + RUNGS.
4. src/game/order-flow.ts + src/server/room.ts lifecycle — the
   Room-owned deal sequence.
5. git show ab966c9 — the build, with evidence in the message.
6. src/game/patron.ts — rule 3's shelf note (what 4b restores).
7. CLAUDE.md current-state paragraph (rewritten this session).
