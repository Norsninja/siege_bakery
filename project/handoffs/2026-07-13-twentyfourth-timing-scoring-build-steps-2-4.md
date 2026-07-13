# Handoff — 2026-07-13 (twenty-fourth session) — THE TIMING & SCORING BUILD (steps 2–4)

## 1. Snapshot

A build session. Reviewed plans/22 (the timing+scoring redesign) and
research/21, discussed the open tuning items with the visionary, then
built steps 2, 3, and 4 of the plans/22 §9 build sequence. Three commits,
all pushed (tip 3355ff7); 499 tests green, both tsc legs clean. The order
lifecycle now GRADES AT THE BUZZER (clock-expiry, not rows-met) and the
star axis is ABSOLUTE whole-cake coverage. Steps 5–8 remain. NEXT SESSION:
review the work + the plan, review step 5, DISCUSS with the visionary
before proceeding (his standing rule).

## 2. What changed this session

Three commits (all on main, pushed):

- **8bc3c80 — step 2, the conclusion-path refactor (behaviour-preserving).**
  Extracted the shared conclusion tail (stampFlourish → lingerVerdict,
  endedWon, ending broadcast, awardPay) from the two sites (instant-win in
  tickScoringPhase, clock-loss in tickLifecyclePhase) into one
  `concludeOrder(judgment, checks)` in server/room.ts. Zero behaviour
  change; 503 tests still green at this commit.

- **9b99f58 — step 3, the conclusion flip (behavioural cut).**
  `evaluateOrder` (game/order.ts) is now CHECK-ONLY (returns
  `RequirementCheck[]`; the auto-conclude branch deleted). The scoring
  phase no longer concludes — it censuses and broadcasts. `concludeOrder`
  now owns the status flip (accepted buzzer verdict → status "won", else
  "lost") and `endedWon = accepted`. Conclusion fires only from
  clock-expiry ("ended" event). The finish window went INERT (its trigger
  was the deleted instant win) — machinery left in place for step 5, but
  the flourish reward already survives at the buzzer via `stampFlourish`.
  The finish-window test suite was rewritten to buzzer-truth ("THE FLOURISH
  AT THE BUZZER"). 502 green (−1: deleted an evaluateOrder
  conclude-idempotence pin).

- **3355ff7 — step 4, absolute coverage.**
  Coverage graded absolute (whole-cake fraction, universal thresholds).
  Frost row `{frac, potential}` → `{floorCoverage}` (one absolute field).
  Star tiers `goodFrac`/`excellentFrac` → absolute `star2Coverage`/
  `star3Coverage`. `Judgment.effectiveCoverage` REMOVED (client only read
  absolute `coverage`). Retired: TOWN_POTENTIAL, TOWN_ASK_POTENTIAL,
  FROST_FRAC, COVERAGE_GOOD, COVERAGE_EXCELLENT. Added: FLOOR_COVERAGE
  0.08, STAR2_COVERAGE 0.18, STAR3_COVERAGE 0.35 (tuning.ts). Per-rung
  tiers on the RUNGS row (`asks.floorCoverage`, `stars.{two,three}`) — cake
  ladder FLAT (0.08/0.18/0.35), cupcake BESPOKE (0.55/0.70/0.85).
  CREW_LABOR narrowed to the sprinkle-grain scaler only. requirementsFor
  dropped the activeTowns param (no longer prices coverage). Reveal fires
  at star2Coverage (patron.ts). 499 green (−3: order-flow pins that tested
  retired of-potential town-pricing / reach-composition).

## 3. Architecture and invariants

- **Grade at the buzzer.** The order concludes ONLY on clock-expiry (a
  player serve joins at step 7). Meeting the rows renders no verdict. The
  Judgment is the Room's, at conclusion. `evaluateOrder` is check-only.
- **One conclusion path.** `concludeOrder(judgment, checks)` in room.ts is
  the sole conclusion tail; it owns the status flip, endedWon, the ending
  broadcast, and pay. Called from the "ended" event today; the serve edge
  joins it at step 7. Do not re-fork the conclusion logic.
- **order.status semantics changed.** The clock always expires to "lost";
  concludeOrder upgrades to "won" when the verdict is accepted. Win/loss
  truth is `endedWon` / `lingerVerdict.accepted`, NOT status alone. The
  shop gate (onMessage "buy", status === "won") depends on that upgrade.
- **Absolute coverage.** Coverage is whole-cake fraction; no reach/labor
  denominator. Star tiers + the score's coverage axis grade it directly.
  Geometry scales the ladder's difficulty for free (bigger cake, same
  fraction harder). Cupcake is the one bespoke exception.
- **CREW_LABOR** now scales ONLY the sprinkle grains (a pass-floor knob).
  The frost floor is flat + town/labor-independent. Solo's coverage relief
  moves to clock + earned time (step 6, not yet built).
- **Thresholds are PROVISIONAL** — floor 0.08 / 2★ 0.18 / 3★ 0.35 (cake),
  55/70/85 (cupcake). To be confirmed against a real playtest; the visionary
  agreed the values as provisional. Tuning knobs: FLOOR_COVERAGE /
  STAR2_COVERAGE / STAR3_COVERAGE (tuning.ts) + the cupcake's RUNGS row.
- Determinism law unchanged; core/ (frosting, dessert, physics) and the
  cake-state-as-events sync untouched. The whole change is game/ + room.ts.

## 4. File map (this session's deltas)

- **src/game/order.ts** — `evaluateOrder` check-only; OrderState
  star2Coverage/star3Coverage (was goodFrac/excellentFrac); createOrder
  defaults from STAR2/STAR3_COVERAGE. `finishTicksLeft` field still present
  (step 5 deletes it).
- **src/game/order-flow.ts** — requirementsFor(row, crew) [activeTowns
  dropped]; frost row = {floorCoverage}; grains still × CREW_LABOR;
  freshOrder threads row.stars.{two,three}. Finish-window methods
  (openFinishWindow/closeFinishWindow/FINISH_WINDOW_TICKS import, the
  tickClock finishTicksLeft branch, shouldLook's guard) still present but
  INERT — step 5 deletes.
- **src/game/judgment.ts** — frost req {floorCoverage}; Judgment drops
  effectiveCoverage; JudgedOrder star2/star3Coverage; judge() absolute;
  checkRequirements/describeRequirement/describeProgress frost row;
  "FROST X% OF THE CAKE".
- **src/game/tuning.ts** — absolute-coverage header; TOWN_POTENTIAL/
  TOWN_ASK_POTENTIAL/FROST_FRAC/COVERAGE_GOOD/COVERAGE_EXCELLENT retired;
  FLOOR_COVERAGE/STAR2_COVERAGE/STAR3_COVERAGE added; CREW_LABOR doc
  narrowed. FINISH_WINDOW_TICKS still exported (step 5 deletes).
- **src/game/campaign.ts** — Rung.asks.floorCoverage (was frostFrac) +
  Rung.stars{two,three}; all 7 RUNGS rows updated; anchor comment notes
  coverage re-based; header yardstick marked superseded for coverage.
- **src/game/patron.ts** — reveal fires at ctx.order.star2Coverage.
- **src/server/room.ts** — concludeOrder (the one path); scoring phase
  census-only; "ended" handler is the sole conclusion. pendingVerdict /
  concludeFinishWindow / openFinishWindow call site still present but
  UNREACHABLE — step 5 deletes.
- **Tests updated**: order.test.ts, order-flow.test.ts, judgment.test.ts,
  campaign.test.ts, patron.test.ts, room.test.ts, and four client mocks
  (eat-beat/hud/net-handlers/patron-body — dropped effectiveCoverage).
  room.test.ts: seamPaint(room, coverage) is ABSOLUTE now; seamWin default
  0.4 (3★); seamBuzzer drains the clock to conclude (step 3).

## 5. How to run, test, verify

- `npm run check` = `tsc --noEmit` + `tsc -p tsconfig.headless.json` +
  `vitest run`. 499 green at 3355ff7.
- `npm test` (vitest), `npx tsc --noEmit`, `npm run dev` (5174).
- No browser verification this session — headless game/+server/ change; the
  test suite is the verification (the visionary is not playtesting until
  the redesign build is further along).
- Test seam note (room.test.ts): the order concludes only at the buzzer
  now, so integration tests drive `seamBuzzer(room)` (force ticksLeft, run
  to "ended") to conclude. `seamPaint(room, coverage)` paints to an
  ABSOLUTE coverage target; `seamWin` paints to 0.4 (3★).

## 6. Open items and decisions

DECIDED (do not re-litigate):
- Build order steps 2→8 per the revised sequence (the visionary's step-2
  safety refactor + flip/coverage split; earned-time after the flip). Steps
  2–4 done.
- Provisional thresholds: cake floor 0.08 / 2★ 0.18 / 3★ 0.35; cupcake
  55/70/85. The visionary agreed these as provisional (confirm at playtest).
- Tutorial-floor ruling: floor stays low (8%), rung 1's mercy is the clock,
  not a softer bar. To be verified per-rung in step 6.
- Realm's-favor band (step 8): payout multiplier ~0.6×–1.4×, mood-driven,
  never touches stars/clock. Agreed, not yet built.
- effectiveCoverage removed; concludeOrder is the one conclusion path;
  CREW_LABOR is the grain scaler only.

OPEN (need the visionary before/during their steps):
- Step 5 (NEXT): delete the finish-window machinery + rehome the flourish.
  Mostly dead-code deletion (finishTicksLeft, openFinishWindow/
  closeFinishWindow, concludeFinishWindow, FINISH_WINDOW_TICKS, the
  finishOver event, pendingVerdict, the shouldLook/tickClock inert
  branches). The flourish behaviour already lives at the buzzer; confirm
  whether its reveal trigger / bonus value change (plans/22 §2.9, §8).
- Step 6: earned time + re-derive base clock. Where soloClock, the sprinkle
  labor-scaling (CREW_LABOR[1]=0.35 provisional), and the flat-floor
  tutorial safety all get real calibration. Needs rate/cap/base-clock
  rulings (plans/22 §8).
- Steps 7 (serve) and 8 (realm's favor) still ahead.
- Minor doc debt: campaign.ts header measurement-table provenance (lines
  ~16–31) still references the old of-potential reach; left as dated
  provenance. Not load-bearing.

## 7. Next session focus

The visionary's explicit instruction: REVIEW the work (steps 2–4) + the
plan (plans/22), REVIEW step 5, then ASSESS and DISCUSS with him before
proceeding. Do NOT start building step 5 without that discussion. Step 5 is
the cleanest remaining slice (deletion of code already proven dead in step
3), but the flourish-rehome design points (§2.9 reveal trigger / bonus)
want his ruling. After step 5: step 6 (earned time + clock re-derivation)
is the heaviest remaining slice and needs his tuning rulings.

## 8. Recommended reading order

1. This handoff.
2. project/plans/22-timing-and-scoring-redesign.md — the redesign of
   record; §9 build sequence (steps 2–4 done, 5 next), §2.9 flourish
   rehome, §3 laws superseded.
3. `git log --oneline -6` + the three commit messages (8bc3c80, 9b99f58,
   3355ff7) — the build narrative, per step.
4. src/server/room.ts — concludeOrder (the one path), tickScoringPhase
   (census-only), tickLifecyclePhase "ended" (the sole conclusion), and the
   INERT finish-window remnants (concludeFinishWindow, pendingVerdict) that
   step 5 deletes.
5. src/game/order.ts + order-flow.ts — evaluateOrder check-only, the inert
   finish-window methods, requirementsFor (absolute floor), freshOrder
   (threads star tiers).
6. src/game/judgment.ts + tuning.ts + campaign.ts — the absolute coverage
   math, the FLOOR/STAR2/STAR3 constants, the per-rung RUNGS tiers.
7. project/research/21-coverage-measurements.md — the measured basis for
   the provisional thresholds (skim; already applied).
8. project/handoffs/2026-07-13-twentythird-the-timing-and-scoring-redesign.md
   — the prior (design) session, for the discussion that preceded the build.
