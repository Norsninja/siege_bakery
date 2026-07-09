# Handoff — 2026-07-09 (sixth session) — SLICE 4B BUILT: THE FLOURISH LIVE, SLICE 5 NEXT

## 1. Snapshot

Plans/13 slice 4b is BUILT and committed (HEAD 22f09b4; 337 tests,
both tsc legs, live-verified). The flourish is live: the FINISH IT
window, the ledger-judged desire, the Giant's cherry reveal, the
verdict coda, and the ULTRA MASTER BAKER skeleton. The session's
ruling of record is THE FINISH IT AMENDMENT (plans/13 §1, recorded
before building — extends the flourish amendment). Next session:
review with the visionary, then DISCUSS slice 5 (purse/pay/shop)
before building — the standing sequence.

## 2. What changed this session (one commit, 22f09b4)

- DISCUSSION FIRST (standing sequence, honored): the 4b agenda from
  the previous handoff was worked through in prose. Rulings recorded
  in plans/13 §1 THE FINISH IT AMENDMENT before any code.
- THE WINDOW (the spine): at the rows-met tick of a qualifying win
  (accepted + asks.crown rung + reveal fired + desire unmet) the base
  judgment computes and FREEZES unbroadcast (Room.pendingVerdict);
  order status stays "running" (gates shut, banner suppressed, order
  clock and patron held — every status-keyed client seam stays
  correct with zero changes); FINISH_WINDOW_TICKS = 900 (15s,
  tuning.ts, feel-pass number) counts down in OrderFlow; early-out
  the moment the desire settles. Close (early or "finishOver") runs
  concludeFinishWindow: one last ledger read stamps the coda, the
  ending broadcast is the same atomic word as ever (protocol doc
  "judgment rides exactly when this message ENDS the order" stays
  true verbatim).
- THE DESIRE: OrderState.desire {topping, revealed, met} — dealt by
  OrderFlow.freshOrder exactly on asks.crown rungs, copied from
  Patron.desire (createGiant: cherry). Never a requirement row.
  Ledger-judged via judgment.crownedWith (extracted with crownHolder
  from the crown-row check — one decoy-proof predicate, shared);
  pre-styled cherries count; pre-met skips the window straight to
  verdict + coda. desire.met is refreshed each landing tick for the
  HUD; verdicts never trust it (stampFlourish re-reads the ledger).
- THE REVEAL: patron rule 3 reborn — at a look, when the frost
  check's current (= effectiveCoverage) >= order.goodFrac, the Giant
  names the desire once, flips desire.revealed in place (the 2D
  mutation idiom), patience 0. Rides the existing look/broadcast
  channel — no new event path.
- THE TOPPERS LAW: validateDesires() (order-flow.ts) at Room boot
  beside validateRungs — no desire topping may appear in any
  requirementsFor row at either ask table.
- CODA + ULTRA: Judgment.flourish (stamped by the Room at every
  conclusion, accepted verdicts only); RunFlow.orderConcluded(won,
  flourish) sets ultra at the top-rung terminal; RunWire.ultra rides
  like `won`; runOverText/hudLines title-swap to ULTRA MASTER BAKER
  OF THE REALMS. Skeleton only — ceremony rides the MASTER BAKER
  content pass.
- WIRE: no new messages. desire + finishTicksLeft live on OrderState
  and ride welcome/scored/order automatically (mid-window welcome
  just works). The 1Hz clock correction self-corrects the window
  countdown (status stays running).
- CLIENT: predictClock predicts the window countdown and holds the
  dead order clock; HUD golden row ("  ★ THE FLOURISH: a cherry on
  the very top — style, not required", "✓" when met; renders only
  when revealed), FINISH IT header swap ("RUNG N · ⭐ FINISH IT! Xs
  ⭐"), banner coda ("✨ AND THE FLOURISH — A CHERRY ON THE VERY TOP
  ✨"), caption coda, ULTRA in runover header/report.
- THE CHERRY NEEDED ZERO PLUMBING: crate, shelf mapping, carry,
  shot, settle, color all shipped dormant since the pantry pass
  (toppings.ts row existed). No topping work was done.
- DEV SEAM: __game.room (loopback only, null over ws) — net.ts
  LoopbackConnection.room, exposed in main.ts DEV block. For
  jumpToRung-style live state building.
- TESTS: 337 (from 313). New: order-flow (desire deal, toppers law,
  window clock-hold/finishOver, close+linger), patron (reveal
  once/free/threshold), judgment (crownedWith decoy-proofing),
  run-flow (ultra set/cleared/loss-proof), state (window
  prediction), hud (golden row, FINISH IT, coda, ULTRA), room (four
  integration scripts: window open/timeout/climb, mid-window
  fatality early-out, pre-met instant coda, ULTRA on the wire). The
  WIN script untouched except three additive zero-drift asserts (its
  0.566 win sits under goodFrac — no reveal, no window).

## 3. Architecture and invariants (new/changed)

- THE FINISH IT AMENDMENT (plans/13 §1, ruling of record): the
  decided moment is the ROWS-MET TICK, not clock-zero (clock-zero is
  only ever the losing end). The window opens ONLY on accepted +
  flourish rung + revealed + unmet; all other wins render instantly
  as before.
- S-MED-1 AS AMENDED: the base verdict is frozen at the decided
  tick; the verdict is COMPLETE at the window's end. Style shots
  during the window are free by construction (nothing can tax a
  frozen score). Verified live: a cherry landed after the close
  changed nothing.
- LEDGER-JUDGED ELIGIBILITY: the desire is physical truth — the
  reveal and the window are presentation and room-to-act, never
  eligibility. A sub-GOOD win with a pre-landed cherry still earns
  the coda (revealed stays false; ruled deliberately).
- THE TOPPERS LAW: desires draw only from toppers (cherry, lime —
  never orderable). The one-number law is structural + boot-validated.
- evaluateOrder's finish guard: while finishTicksLeft > 0 a decided
  order never re-judges (checks only). Defense in depth with the
  Room's flow.
- The window holds every clock but its own: OrderFlow.tickClock
  decrements only finishTicksLeft while open; shouldLook returns
  false (patron holds his breath, no patience burn into a held clock).
- ULTRA rides only with won; RunFlow clears both at lobby return.

## 4. File map (delta)

- src/game/order.ts — Desire interface, OrderState.desire +
  finishTicksLeft, createOrder opts.desire, evaluateOrder finish guard.
- src/game/order-flow.ts — freshOrder deals the desire,
  openFinishWindow/closeFinishWindow, tickClock window branch,
  shouldLook gate, "finishOver" FlowEvent, validateDesires.
- src/game/judgment.ts — crownHolder/crownedWith extracted,
  Judgment.flourish.
- src/game/patron.ts — Patron.desire (Giant: cherry), rule 3 = the
  reveal.
- src/game/run-flow.ts — ultra flag, orderConcluded(won, flourish).
- src/game/protocol.ts — RunWire.ultra.
- src/game/tuning.ts — FINISH_WINDOW_TICKS.
- src/server/room.ts — pendingVerdict, window open in
  tickScoringPhase, stampFlourish, concludeFinishWindow, finishOver
  handling, orderConcluded flourish arg, runWire ultra,
  validateDesires at boot, desire.met live refresh.
- src/client/state.ts — predictClock window-aware.
- src/client/hud.ts — golden row, FINISH IT header, banner/caption
  coda, runOverText ultra.
- src/client/main.ts — runOverText ultra arg, loopRoom + __game.room.
- src/client/net.ts — LoopbackConnection.room.
- Tests: order-flow/patron/judgment/run-flow/state/hud/room.
- project/plans/13-the-campaign.md — §1 THE FINISH IT AMENDMENT,
  §8.4b scope + BUILT record.

## 5. How to run, test, verify

npm run check (337 green at HEAD). Live driving: preview_start "dev"
(autoPort; never kill the visionary's 5174/5175). NEW: __game.room
(loopback only) — jump rungs, seam-paint, seam-rest solids; recipe
in memory game-smoke-driver-notes, including the broadcast pair the
client rebind needs. CRITICAL LESSON (memory, same file): tool-call
latency IS game time — a visible preview page runs 60Hz between
evals, and 20-60s gaps expire windows/lingers unobserved; arm a
window.__probe setInterval FIRST before diagnosing any timing
"bug" (this session's false instant-win alarm was exactly that).

## 6. Open items and decisions

DECIDED THIS SESSION (do not re-litigate):
- The finish-it amendment, all of it (§3 above; full text plans/13
  §1): window mechanics, gates, 15s authored constant, ledger-judged
  eligibility, toppers law, reveal semantics, Ultra as skeleton.
- The window was decided NOW rather than deferred to a feel pass —
  amending the frozen-verdict law once, not twice.
- Reveal fires regardless of desire.met (a pre-styled crew gets the
  golden row with its checkmark); noted as a voice-wrinkle for the
  content pass, not a blocker.

OPEN — SLICE 5 DISCUSSION AGENDA (DISCUSS FIRST, standing sequence):
- Purse: Room state, shared balance, earned pay.base + stars ×
  pay.perStar (pay column already authored per rung). Purse resets
  with the run. Flourish purse bonus — shape TBD (plans/13 §1 said
  "purse bonus in slice 5"; discuss size/keying).
- The shop stall: walk-up crosshair + E, price on the prompt, open
  only during the separator (gates-law parity). NEVER a menu.
- Inventory v1: town 2 (~50, replaces the unlockTown2 dev stand-in
  with a purchase message) + fudge unlock (~25, new pantry shelf).
  Prices are §5 hypotheses for the feel pass.
- Purchases are Room-validated inputs; honest refusals.
- Wire deltas: {t:"purse"}, {t:"buy", item} — small, additive.
- Feel-pass watch items for the visionary's ladder run: rung pacing
  (150s cake-1 tutorial), the window's 15s (is a solo un-staged
  pantry ferry honestly makeable?), cupcake hot-arrival (its 8
  summit windows all arrive hot — flourish cherries may bounce; if
  they skid, clock/position moves before the ask does).
- plans/15 unclaimed pre-friend-test: rings-per-catapult (1), report
  inset (3), trails (4). Standing: audit tranche C post-friend-test;
  wind plan + Bite/integrity re-pin ownerless; research/06 header
  stale-ladder note.

## 7. Next session focus

1. Review slices 4+4b with the visionary (run the ladder in preview;
   the reveal, the golden row, the window, the coda are all
   reachable at rung 3 with real play or the __game.room seam).
2. DISCUSS slice 5 (purse/pay/shop — §6 agenda), then build it.
3. The friend test (plans/12) inherits everything.

## 8. Recommended reading order

1. This handoff.
2. project/plans/13-the-campaign.md — §1 THE FINISH IT AMENDMENT
   (the session's rulings) + §8.4b BUILT record; then §5 (the
   economy — slice 5's plan) and §8.5.
3. src/server/room.ts — tickScoringPhase (the window open),
   stampFlourish, concludeFinishWindow, the lifecycle finishOver
   branch.
4. src/game/order-flow.ts + src/game/order.ts — the desire deal,
   the window clocks, the finish guard.
5. src/game/patron.ts — the reveal (rule 3).
6. git show 22f09b4 — the build, with evidence in the message.
7. CLAUDE.md current-state paragraph (rewritten this session).
