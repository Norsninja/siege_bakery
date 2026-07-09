# Handoff — 2026-07-09 (seventh session) — SLICE 5 BUILT: THE ECONOMY LIVE, THE LONE HERO NEXT

## 1. Snapshot

Plans/13 slice 5 (purse/pay/shop stall) is BUILT and committed
(3e775ff; 355 tests, both tsc legs, live-verified on the worker-shim
harness). Two rulings of record were written this session: THE
SHOP-SELLS-INFRASTRUCTURE AMENDMENT (plans/13 §5 — built) and THE
LONE HERO AMENDMENT (plans/13 §5 — RECORDED, NOT BUILT; next session
reviews the record and DISCUSSES before building, the standing
sequence). The visionary playtested live and produced the session's
most important measurement: the real solo shot cycle is 23.5s, which
proves solo cannot pass any rung as clocked — the lone hero
amendment is the fix at the correct layer.

## 2. What changed this session (one code commit, 3e775ff, + docs)

- FUDGE CORRECTION: a research agent claimed fudge had no pantry
  crate; WRONG — fudge shipped free in the pantry with plans/10
  (scene.ts shelf-fudge, end-to-end room test) and its paint counts
  toward frost coverage (one shared coats field, coverage() is
  topping-blind). The visionary caught it. Two discussion rounds
  were built on the phantom gap. Lesson recorded in memory
  (verify-positions-not-counters item 7): grep before positions.
  Consequence: the §5 fudge unlock was STRUCK — the shop sells
  UPGRADES only; ingredients are pantry (structural: a patron may
  one day ORDER fudge). Inventory v1 = town 2 alone.
- PURSE: RunFlow.purse (earn/spend; zeroes in tickReady's start
  branch — report and lobby keep the finished run's balance).
  Room.awardPay at both won-conclusion sites (instant verdict +
  concludeFinishWindow): pay.base + stars × perStar (campaign.ts
  column, live at last) + FLOURISH_BONUS_COINS (tuning.ts, 10) when
  the verdict wears the coda. Rides RunWire (purse?, absent = 0) +
  welcome for free.
- THE STALL: {t:"buy", item} replaces unlockTown2 (protocol + client
  dev seam retired). Room validates in order: catalog whitelist
  ("town2"), shop hours (phase running + order status "won" + rung
  below top — a run-ending linger sells dead keys), not owned
  (towns.length), purse debit (run.spend). Refusals are silent
  drops; the client predicts each in words (interactions.ts shop
  branch, hud.ts promptFor "shop", state.ts shopState — all
  drift-pinned by tests).
- THE RE-LOCK: inventory dies with the run. startRun shrinks towns
  to 1, re-addresses town-1 crew home via town words BEFORE the
  fresh deal and run word; client truncates machines on its
  run-start edge (net-handlers). C-MED-2 invariant both directions.
- Stall greybox: arena.ts Town.shop anchor (±7.15 on the side wall,
  z at pantry↔machine midpoint, rotated for town 1) + SHOP_HALF
  static collider in both replicas; scene.ts counter/post/coin
  meshes ride townInteractables raycast.
- HUD purse row (running block); banner pay line (client computes
  from shared tables — words and wallet agree by construction);
  runover purse line.
- FOUND + FIXED IN PASSING: net-handlers run case never copied
  RunWire.won/ultra — a standing client could not render MASTER
  BAKER (only welcome-path joiners saw it). Copied + pinned.
- TESTS 337 → 355. Room seam helpers (seamPaint/seamSprinkles/
  seamCherry/fireLime, + new seamTown2/seamWin) moved to room.test
  file scope. The towns convergence test REWORKED to the honest
  teaching arc: two seam-painted 3★ wins fund the purchase over
  real wire (25+35−50=10), buy+pick+town-1-shot converge
  byte-for-byte, double-buy bounces off owned undebited. THE STALL
  suite: hours/catalog/poor refusals, pay pins (40 vs 50 with
  coda), re-lock end to end. Unit tests: run-flow purse,
  interactions shop branch, shopState hours, hud prompt/pay/purse
  lines, net-handlers copies + truncation.
- LIVE-VERIFIED (worker-shim, probe first): ready-up → rung-1 3★
  win banner "+25 coins" (wire purse 25 agrees) → poor buy refused →
  funded buy honored mid-linger (towns 2, purse 10, client machines
  2) → rung 2 dealt for two towns → clock death → runover "the
  purse ends at 10 coins" → auto-restart: towns 1, purse 0,
  machines 1. Both stalls verified at rotated anchors by mesh
  census.
- DOCS: plans/13 §5 both amendments + §8.5 BUILT record; plans/15
  item 8 (run-points meta-progression — visionary's shape, deferred
  post-campaign); CLAUDE.md current-state rewritten. plans/13 LONE
  HERO amendment added post-commit (rides the docs commit with this
  handoff).

## 3. Architecture and invariants (new/changed)

- SHOP SELLS INFRASTRUCTURE: upgrades only, never ingredients.
  Ingredients must be reachable without purchase (orders can never
  demand what the crew cannot have).
- SHOP HOURS: exactly phase "running" + status "won" + rung <
  RUNGS.length. state.shopState mirrors it client-side; if the Room
  rule moves, move shopState with it.
- INVENTORY DIES WITH THE RUN at the NEXT run's start (not runover):
  purse + town 2 together; report/lobby display the finished
  balance.
- Purse wire law: RunWire.purse absent = 0; a no-coin wire is
  byte-identical to pre-purse.
- Re-lock ordering: town words BEFORE the fresh deal/run word so
  yourTown always indexes machines through the shrink.
- Banner pay is client-computed from shared tables (campaign.ts pay
  + tuning FLOURISH_BONUS_COINS) — never wired; keep the arithmetic
  identical to Room.awardPay.
- STALE HEADER: tuning.ts's "solo shot cycle 12–18s" is measured
  WRONG post-gun-crew-posts (real: 23.5s). The lone hero build must
  re-pin it.

## 4. File map (delta)

- src/game/tuning.ts — FLOURISH_BONUS_COINS (10), TOWN2_PRICE (50).
- src/game/run-flow.ts — purse, earn, spend, zero-at-start.
- src/game/protocol.ts — RunWire.purse?, ClientMsg buy (unlockTown2
  gone).
- src/server/room.ts — buy handler (onMessage), awardPay, startRun
  re-lock, runWire purse.
- src/core/arena.ts — Town.shop, SHOP_HALF, stall collider.
- src/client/scene.ts — stall meshes, townInteractables.shop.
- src/client/hud.ts — "shop" kind, ShopState, promptFor shop case,
  purse HUD row, bannerText rung param + pay line, runOverText purse.
- src/client/interactions.ts — buy InteractionMsg, tickInteraction
  shop branch, shop param threaded through resolveEEdge/
  interactionActs.
- src/client/state.ts — shopState(view).
- src/client/net-handlers.ts — run case copies won/ultra/purse;
  machines truncation on run-start edge.
- src/client/main.ts — shop wiring, banner args, dev seam retired.
- Tests: room (stall suite + convergence rework + seams at file
  scope), run-flow, interactions, state, hud, net-handlers.
- project/plans/13-the-campaign.md — §5 two amendments, §8.5 BUILT.
- project/plans/15-side-quests.md — item 8 (run points, deferred).

## 5. How to run, test, verify

npm run check (355 green at 3e775ff). Live: preview_start "dev"
(autoPort). Hidden-tab preview needs the worker-shim reboot (memory
game-smoke-driver-notes — recipe + probe-first law). __game.room
loopback seam for state building; fund a purse via
room.run.purse = N; room.broadcastRun(). unlockTown2 dev handle is
GONE — buy via __game.send({t:"buy", item:"town2"}) in a won linger.
ENVIRONMENT NOTE: the visionary's old room server (running since
07-03) was killed this session with his consent; 5175 is free; dist/
was rebuilt at slice 5. If 5175 is needed: npm run server (loads
current src).

## 6. Open items and decisions

DECIDED THIS SESSION (do not re-litigate):
- The shop-sells-infrastructure amendment, all of it (§2 above; full
  text plans/13 §5): fudge struck (pantry, free, counts toward
  frost), shop = upgrades only, inventory v1 = town 2 alone, shop
  hours, inventory dies with the run, +10 flourish bonus, prices in
  tuning.ts.
- plans/15 item 8: run-points meta-progression recorded, deferred to
  the post-campaign power-up session.
- THE LONE HERO AMENDMENT is RECORDED with the visionary's blessing
  of the shape, but the standing sequence applies: review the record,
  DISCUSS, then build. Shape: ask potential = REACH (towns,
  TOWN_ASK_POTENTIAL unchanged) × LABOR (crew size, hypothesis
  [—, 0.5, 1.0, 1.0, 1.0], tuning.ts), priced at deal time from
  connected crew (towns law verbatim); the scaled potential is what
  judgment grades against (kills the gate-2 insult trap
  structurally); clocks untouched; pay full; crew 2+ = today
  verbatim. Wrinkles named in the record: mid-order leaver (accepted
  towns law), town 2 useless solo (turntable is the future solo shop
  item), patron voice line rides the content pass. Superseded: the
  rung-1 clock/frac patch (withdrawn).
- PLAYTEST DATA (the visionary, live): solo cycle 23.5s minimum with
  minimal aiming — near the mechanical floor (ferry 8s + crank
  4.5–7.5s + post transitions). ~3% effective coverage per shot at
  his current aim (design decent = ~4%, great = ~6.5%). 5 shots per
  rung-1 effective clock, twice. Conclusion: solo unpassable as
  clocked; clocks implicitly price a pipelining duo.

OPEN:
- The lone hero discussion agenda: labor table values (is 0.5
  right?); does labor scale sprinkle asks too or frost potential
  only (the record says ask potential — sprinkles rows are absolute
  grain counts, discuss whether they scale); does the desire/window
  interact (flourish is style, likely untouched); where the deal
  reads crew (Room knows roster.count(); OrderFlow.dealFresh
  signature); does the HUD say the handicap is on ("one pair of
  hands" tag); tuning header re-pin of the 23.5s cycle.
- Feel-pass watch items standing: rung pacing above rung 1 (duo
  data needed — friend test), the window's 15s, cupcake
  hot-arrival, fudge-counts-toward-frost, §5 prices/pay scale.
- plans/15 unclaimed pre-friend-test: rings-per-catapult (1),
  report inset (3), trails (4).
- Standing: audit tranche C post-friend-test; wind plan +
  Bite/integrity re-pin ownerless.

## 7. Next session focus

1. Review slice 5 with the visionary if desired (the shop arc is
   playable solo only via seams — a solo crew can't afford town 2
   honestly; that is itself the lone-hero point).
2. Review THE LONE HERO AMENDMENT record (plans/13 §5), DISCUSS the
   open agenda above, then build it.
3. After the lone hero: the visionary's feel run continues (solo
   now honest); the friend test (plans/12) inherits everything and
   measures the duo cycle the ladder's clocks assume.

## 8. Recommended reading order

1. This handoff.
2. project/plans/13-the-campaign.md §5 — THE LONE HERO AMENDMENT
   (the discussion's subject), then THE SHOP-SELLS-INFRASTRUCTURE
   AMENDMENT + §8.5 BUILT record.
3. src/game/tuning.ts — TOWN_ASK_POTENTIAL + the stale 12–18s
   header (the lone hero build re-pins it); TOWN2_PRICE,
   FLOURISH_BONUS_COINS.
4. src/server/room.ts — onMessage buy, awardPay, startRun re-lock;
   where dealFresh is called (the labor factor's future seam).
5. src/game/order-flow.ts dealFresh + requirementsFor — where the
   ask is priced (the labor factor lands here).
6. src/client/state.ts shopState + src/client/interactions.ts shop
   branch — the client prediction pattern the lone hero HUD tag
   would follow.
7. git show 3e775ff — the build, evidence in the message.
8. CLAUDE.md current-state paragraph.
