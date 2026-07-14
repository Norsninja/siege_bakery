# Handoff — 2026-07-14 (twenty-seventh session) — THE REALM'S FAVOR BUILT; THE PLANS/22 ARC COMPLETE

## 1. Snapshot

plans/22 step 9 (the realm's favor) designed in discussion, rulings blessed
by the visionary ("no pushback"), built, self-reviewed, fixed, and PUSHED.
The four grown threads (patience→payout, mess-as-mood, coin drip,
continuous-past-3★) collapsed to TWO mechanisms: the COIN DRIP (fresh paint
pays coins live, uncapped — it IS the continuous reward) and the REALM'S
FAVOR (an upward mood multiplier off patienceDebt at conclusion). A
pre-push self-review caught one real flaw (the drip paid during the
post-conclusion linger — missing the order-status gate every sibling axis
has); fixed and pinned. 511 tests green, both tsc legs. THE PLANS/22 ARC IS
COMPLETE (step 8 serve skipped per plans/15 item 30). All nine local
commits pushed: b2519db..8ce8cc0 — nothing pending. Next session: open —
discuss next items with the visionary FIRST (his standing rule).

## 2. What changed this session

Code (commit f4dfdf9, fix 8ce8cc0):
- game/tuning.ts — DRIP_COINS_PER_SAMPLE 0.05 (uncapped, ≈1 coin per 20
  fresh samples; cake-3 at ~30% drips ~10), FAVOR_PATIENCE_FULL_S 40,
  FAVOR_MAX_BONUS 0.5. All PROVISIONAL, playtest-gated.
- game/judgment.ts — realmFavor(patienceDebtSeconds) pure helper: mood =
  clamp(1 − debt/40, 0, 1), returns 1 + mood × 0.5. Never below ×1.
  Judgment.favor?: number added (stamped by the ROOM, never by judge()).
- server/room.ts — (a) tickScoringPhase: dripFraction accumulator (Room
  field, reset at startRun) pays whole coins to run.earn + broadcastRun off
  freshThisTick — the SAME signal earned time reads; gated by run.phase AND
  order.status === "running" (the fix: linger paint drips nothing).
  (b) concludeOrder: stamps favor = realmFavor(flow.patienceDebt) onto
  accepted verdicts (one computation; the wire carries it). (c) awardPay:
  run.earn(Math.round(conclusion × (j.favor ?? 1))).
- client/hud.ts — bannerText pay line: favor bonus named when > 0 ("the
  giant leaves pleased — the realm's favor grants +N more"); ×1 mood is
  silent. Line wording PROVISIONAL — his voice.
- Tests (506 → 511): realmFavor curve (judgment.test); drip fires live off
  real landings; drip survives a floor-loss (purse kept on a below-floor
  conclusion); drip stops at the buzzer (linger glob raises coverage,
  drips nothing — non-vacuous); stamped favor VALUE pinned (1 +
  FAVOR_MAX_BONUS on a spotless seam — breaks paidColumn circularity);
  HUD favor line (hud.test). room.test helpers: fireFrost(turnDeg) (real
  frosting glob with traverse pre-aim), paidColumn (reads stamped favor
  off the wire — words==wallet). Converge test: purse asserted A==B +
  debit-once via paidAfterBuy (absolute 60−50 retired — favor-dependent).

Docs (commit 8c92369): plans/22 §9 step 9 BUILT (full as-built + rulings;
arc-complete note); plans/24 status pointer; plans/15 item 31 grew the
DRIP POP (three honest pops = one client pass when claimed).

## 3. Architecture and invariants

- THE PAYOUT MODEL (step 9, final shape): base + stars×perStar + flourish
  = the CONCLUSION award, × favor (service). The DRIP is a separate live
  axis (the cake's continuous climb), UNMULTIPLIED, uncapped to 100%
  coverage, never clawed back. Per-star SITS BESIDE the drip (milestone
  bump kept). Ruled, do not re-litigate.
- ONE force on the clock (earned time), ONE on the pay (mood/favor) —
  patienceDebt is SPENT now (no longer dormant). Mess feeds mood only via
  the patron's thunder burn; no separate mess term at conclusion (ruled).
- FAVOR IS UPWARD-ONLY: poor service pays ×1.0 and loses nothing (the
  relax, plans/23 §4.3). Never sub-1.
- FAVOR IS STAMPED, NOT JUDGED: judge() grades the cake only; concludeOrder
  stamps Judgment.favor; awardPay and the HUD read the SAME stamp
  (words == wallet). judgeNow() mid-order never shows favor.
- EVERY EARN AXIS NEEDS TWO GATES: run.phase running AND order.status
  running. The linger (order ended, run phase still "running", deal tag
  still current) is the trap — paint applies physically but must pay
  nothing (earned time/garnish self-guard via grantSeconds; the drip
  guards explicitly; the desire check guards explicitly).
- NEVER TOTAL ZERO: a below-floor loss keeps its dripped coins.
- Run wire OMITS purse when 0 (`purse > 0 ? {purse}`): a coinless room
  reads purse === undefined, not 0.
- All prior canon holds (plans/23 relax, plans/24 material law, one clock
  rule, determinism law, layering).

## 4. File map

- src/game/judgment.ts — judge (cake grade), realmFavor (service grade),
  Judgment.favor field.
- src/game/tuning.ts — the three new dials + full rationale comments.
- src/server/room.ts — dripFraction field; tickScoringPhase drip block
  (after earnTime); concludeOrder favor stamp; awardPay multiplier;
  startRun dripFraction reset.
- src/client/hud.ts — bannerText favor line (inside the rung > 0 pay
  block).
- src/server/room.test.ts — fireFrost/paidColumn helpers; four step-9
  pins; revised converge + pay/flourish/lone-hero/poor-crew tests.
- src/game/judgment.test.ts — realmFavor curve pin.
- src/client/hud.test.ts — favor line pin.
- project/plans/22 §9 — the authoritative as-built record of step 9.

## 5. How to run, test, verify

- npm run check = tsc + headless tsc + vitest. 511 green at 8ce8cc0.
- Drip CANNOT be driven from in-page seam painting (room.frosting.paint
  bypasses tickScoringPhase) — it needs real landings. In tests: fireFrost
  with a traverse SWEEP (identical aim re-coats, zero fresh; one 6-click
  glob ≈ 1% of cake-3). Straight aim (turnDeg 0) after seamPaint(0.2)
  lands on bare upper tiers.
- A spotless seam (no patron look fires within its few seconds) stamps
  favor exactly 1 + FAVOR_MAX_BONUS = 1.5.
- Windows/PowerShell; git bash for POSIX.

## 6. Open items and decisions

DECIDED (do not re-litigate): all step-9 rulings (§3 above); the drip pop
deferred to plans/15 item 31 (now three pops: garnish +Ns, topper +Ns,
drip gold +N — one client pass); serve stays skipped (item 30).

OPEN:
- THE NUMBERS: DRIP_COINS_PER_SAMPLE 0.05 / FAVOR_PATIENCE_FULL_S 40 /
  FAVOR_MAX_BONUS 0.5 — provisional; a real playtest of the WHOLE economy
  (earned time + ladder + relax + recipe + drip + favor) is the natural
  next gate. Also open from s26: recipe authoring (which rungs ask which
  flavor — his eye), ticket/verdict flavor wording, ladder wording pass.
- HUD favor line wording is provisional (his voice); 👑 emoji collides
  with the MASTER BAKER banners — flagged, his call.
- plans/15 items: 31 (honest pops), 29 (race clock), 27 (locked fort
  read), 17 (lighting), 22/23 (patron motion/earth shakes), 19 (weather),
  24 (helpers), 11 (tower). plans/18 species orders is the standing prize
  (substrate ready: flavors, per-species asks, patron voice).
- Economy interaction worth watching at the playtest: town-2 affordability
  (TOWN2_PRICE 50) now arrives faster (favor ×1.5 + drip) — may want a
  price re-read if the stall unlocks too early.

## 7. Next session focus

The visionary's instruction: continue with the next items, DISCUSSING
FIRST before building. No specific item named — open the session by
reviewing this handoff and the open-items list with him. Strongest
candidates: (a) a real playtest of the complete economy (every step-9 and
plans/24 number is provisional and playtest-gated — this unblocks the most
tuning), (b) plans/18 species orders (the content prize; needs its own
design session), (c) plans/15 item 31 (the three honest pops — small,
client-only, makes the new economy visible). Bring positions, let him
choose.

## 8. Recommended reading order

1. This handoff.
2. project/plans/22-timing-and-scoring-redesign.md — §9 step 9 (the
   as-built record) + §0.5 (the north star, still governs).
3. src/server/room.ts — tickScoringPhase drip block, concludeOrder,
   awardPay (the whole payout path in one file).
4. src/game/judgment.ts — realmFavor + Judgment.favor.
5. src/game/tuning.ts — the step-9 dials and their rationale.
6. project/plans/15-side-quests.md — items 31/30/29 + the open ledger.
7. git log --oneline -9 — the two sessions' commits (all pushed).
