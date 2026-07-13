# Plan 22 — THE TIMING & SCORING REDESIGN: grade at the buzzer

**Status: PROPOSAL, DRAFTED 2026-07-13 (twenty-third session), amended
by a full three-stream research pass and vetted by Planning Chronus.
This is the design of record for the timing + scoring rework; it does
NOT yet build. The opening build step is a MEASUREMENT pass (§7) whose
numbers this plan is written to receive. Where this plan and an older
plan disagree about WHAT the rules are, this plan is the newer truth
and names the law it supersedes.**

---

## 0. The problem, in one paragraph

Today the order concludes the **instant every requirement row is met**
(`order.ts` `evaluateOrder` — "all rows met = win"), and the grade is
computed at that same instant. Because you cross the floor on a fast,
fixed-aim line, you are judged at ~floor coverage — so you get **1 star,
structurally, almost every time** (`room.test.ts` pins `stars === 1` at
`effectiveCoverage 0.566`). The elaborate coverage-quality system
(goodFrac/excellentFrac, per-star pay) is unreachable because winning
ends the round before the star-earning work can happen. On top of that
the clock is not the clock: the giant's **patience secretly drains it**
(nominal 3:45 → effective ~2:40), so the number the player trusts lies.
The player cannot use the allotted time, cannot do a good job, and
cannot see his real deadline.

The fix is to stop letting the *threshold* end the round. **The clock
(or a player serve) ends it; the cake is graded at that buzzer.** This
is a decorating contest, judged like one — the ingredients-in-the-bowl
conclusion is the disease; the early shutter (plans/15 item 28) was
only its most visible symptom.

---

## 1. What the research established (three streams, 2026-07-13)

Full outputs in the session record; the load-bearing findings:

- **Threshold-conclude is a 3D invention, not a 2D inheritance.** The
  2D ancestor (`artillery` `BakeMode.checkWin`) ends on **resource
  exhaustion** (shots or patience-zero) — analogous to clock-expiry.
  2D ends "the instant a condition is met" in exactly ONE ceremonial
  case: the crowning finale. 3D generalized that narrow crown-exception
  into the whole order's ending. **This redesign is a RETURN toward the
  lineage's real model, not a departure** — though it knowingly deletes
  recorded 3D law (plans/03: "the Judgment renders the moment every row
  is met").
- **The grade is locked at the floor-crossing instant** (confirmed in
  code): 2★/3★ always require the slow varied-aim cycle *past* the
  ~30-sample fixed-aim plateau, and conclusion fires before that work
  can happen. The tiers aren't mis-placed — they're starved of time.
- **The clocks are already mostly right.** A first-principles
  clock-scaling model reproduced the shipped numbers with zero fitted
  parameters: rung 1 solo margin 1.43× ≈ the tutorial target; rung 3
  duo predicted pass 215s vs the actual 216s effective clock (0.5%).
  The reliable-clock conversion is mostly **honesty** (show today's
  effective number and mean it), not a rebalance.
- **The crew scaling is inverted.** Coverage is graded "of potential" =
  `TOWN_ASK_POTENTIAL × CREW_LABOR`, which scales **5.1×** solo→duo,
  while throughput scales only **2.85×**. So today, adding a teammate
  makes stars *harder*, not easier. Invisible while everyone got 1★;
  fatal once stars matter. This is the "irrational as it scales" — three
  concepts (reach, ask-fraction, labor-handicap) multiplied into one
  number whose product scales wrong.
- **The 0.9 one-town reach is a vacuum number.** `TOWN_POTENTIAL 0.9`
  (and plans/11's 43.7–55.7% absolute) are *geometric* reachability —
  unlimited shots, no ferry/crank/aim. Real **time-bounded** solo
  coverage in an honest clock is ~16–23%. Any denominator built on the
  vacuum number lies.
- **Genre confirms the shape.** Splatoon Turf War is the closest cousin
  (fixed clock, decorate a shared surface, graded on coverage at a
  trusted buzzer). Diner Dash confirms **patience → tip, never round
  length** is a shipped pattern. Dead time is the tax of a fixed clock —
  paid by making the cake never "solvable" (an uncapped quality
  ceiling). A unilateral round-ending serve is a co-op griefing vector —
  make it additive. Tier spacing is the whole game (Overcooked's trivial
  3-star / cliff 4-star is the cautionary tale).

---

## 2. The proposal spine (post-vetting)

1. **Grade at the buzzer.** The order concludes ONLY on clock-expiry or
   a player **serve** — never on "requirements met."
2. **Gate 1 survives as the requirements checklist, evaluated at the
   buzzer.** Rows unmet → HUNGRY; rows met, quality below → REFUSED;
   above → DELIGHTED with stars. **Asks stay data** — the species-orders
   prize (plans/18, the biggest content unlock) is built on this; it is
   NOT collapsed into one coverage number.
3. **Absolute coverage is the quality / star axis.** How much of the
   actual cake you covered — one number, universal thresholds. Free gift:
   taller cakes make the same fraction harder, so the rung ladder earns
   difficulty progression from geometry itself.
4. **Crew advantage is a GRADIENT, not a wall.** More towns reach more
   sides; role-split stations + idle hands (spot, fetch, buy, power-ups)
   cut cycle time. A duo reaches 3★ comfortably where a solo must play a
   flawless, sustained line. "Bring a friend" is a gradient, not a
   ceiling — and **earned time (below) is the bridge that makes solo 3★
   reachable-but-hard.** Calibration: pass/1★/2★ from the solo-*typical*
   curve, 3★ from solo-*ceiling* ≈ duo-*comfortable* — one measured
   curve read at two points (no "calibrate on solo yet cap solo"
   contradiction). If measurement shows solo genuinely cannot crack 3★
   even flawlessly, that is a FINDING that reopens THE LONE HERO
   AMENDMENT (plans/13 §5) with data, never a design decree.
5. **Earned time (the checkpoint mechanic).** Modest base clock + seconds
   earned per **fresh** coverage (newly painted samples only). This is
   the VISIBLE, POSITIVE opposite of the hidden, negative patience drain:
   the clock ticks *up* on a good shot, you see it, you rely on it. It
   self-limits (a saturated cake yields no fresh coverage, so the round
   ends naturally), it crew-scales for free (more hands earn more time),
   and it makes the round live exactly while you're improving the cake.
   Total is CAPPED (a backstop against a flawless crew playing forever).
6. **The realm's favor replaces patience-steals-time.** Patience stops
   touching the clock and moves to the PAYOUT. ONE force on the clock
   (earned time), ONE on the pay. The noun is realm-paid (plans/17: the
   realm pays, the giant is a guest who never reaches for a purse) —
   "the realm's favor" / mood multiplier, never "tip." The clean split:
   **STARS grade the CAKE (coverage/quality); the REALM'S FAVOR grades
   the SERVICE (the giant's mood — speed, mess, being kept waiting).**
7. **Serve = per-order early banking.** Serving banks the current cake
   and its grade and brings the next patron. Floor-gated (you cannot
   serve a failing cake). Structure is **per-order clocks + the rung
   ladder** (the existing shape; a global day-clock would dissolve the
   ladder into a shift — a much bigger restructure, NOT taken). Serving
   to reach the next patron is cooperative (more orders = more pay), so
   per-order serve is additive by nature; a light consensus gate is the
   fallback only if a playtest shows one player rushing serves against
   the group.
8. **Solo relief lives in the clock + the pass floor, never the star
   bar.** One pair of hands gets more base time / a gentler minimum;
   stars mean the same for everyone. This rides the existing
   `Rung.soloClock` machinery (CREW_CLOCK already retired). The item-26
   rung-2 over-relief folds into this re-derivation rather than being
   patched separately.
9. **The flourish becomes a whole-order bonus objective.** Under
   grade-at-the-buzzer it needs no special window: the patron reveals his
   desire mid-order when coverage turns great, and you have the WHOLE
   clock to crown the cake — judged at conclusion like everything else.
   Strictly MORE room than the deleted 15-second finish-window, not less.
   It still pays the bonus, it is still rung 3+'s signature moment, and
   ULTRA / MASTER-BAKER key off flourish-at-conclusion unchanged.

---

## 3. Laws this supersedes (named, per the doc contract)

- **plans/03** — "the Judgment renders the moment every row is met."
  REPEALED. The Judgment renders at the buzzer (clock or serve). The
  requirements checklist survives as Gate 1, evaluated there.
- **The patience-is-the-clock law** (plans/03, plans/06 pivot). REVERSED.
  Patience moves to the payout (§2.6). One force on the clock.
- **The finish-it window** (plans/13 §1 finish-it amendment). DELETED.
  It was scaffolding for the flourish under an instant conclusion; the
  flourish's new home (§2.9) makes it unnecessary.
- **Coverage graded "of potential"** (`TOWN_ASK_POTENTIAL × CREW_LABOR`,
  tuning.ts). REPLACED by absolute coverage against the cake (§2.3).
  `TOWN_ASK_POTENTIAL` / `CREW_LABOR` may survive ONLY as pass-floor /
  time knobs, never as the coverage denominator.
- **THE LONE HERO AMENDMENT** (plans/13 §5) is PRESERVED IN SPIRIT
  (solo's stars stay honest and reachable) but its MECHANISM moves: relief
  is time + floor + the earned-time gradient, not a shrunken star bar.
  Reopens with data only if the measurement (§7) shows solo genuinely
  walled below 3★.

Everything else (the rung ladder as content, the two-town reach fiction,
asks-as-data, the eat-beat verdicts, the economy's shop) stands.

---

## 4. The mechanical change surface (from the as-built map)

Well-scoped: the change lives in `game/` (order, order-flow, patron,
judgment) + the Room's wiring. **`core/` (frosting, dessert, physics)
and the cake-state-as-events sync are UNTOUCHED; determinism law is
unaffected; the serve action is a standard authoritative edge-input.**

**Deletes:**
- `order.ts` `evaluateOrder`'s auto-conclude branch. `checkRequirements`
  still runs every tick for the HUD checklist — it just never flips
  `status`.
- The entire finish-it window: `finishTicksLeft`, `openFinishWindow` /
  `closeFinishWindow`, the `finishOver` event, `FINISH_WINDOW_TICKS`,
  and the `FINISH IT!` HUD branch.

**Changes:**
- Conclusion fires from exactly two triggers: **clock-expiry**
  (`tickOrder` reaching 0 → judge at current state; floor met = pass with
  stars, floor unmet = HUNGRY) and a **serve** message. Both route
  through one judge-and-conclude path.
- `patronLook`'s `patienceDeltaSeconds` → a **favor/payout** accumulator,
  never `ticksLeft`. `judge()` gains that input (the 2D ancestor's
  dropped `penaltyPoints` axis is the precedent). The clock is never
  mutated by patience.
- The frost-coverage row + the star tiers read **absolute** coverage
  (§2.3), not of-potential.

**Adds:**
- A `{ t: "serve" }` `ClientMsg`, Room-validated (floor-met) exactly like
  `lever` / `buy`. Never trust the client's own floor-check.
- The earned-time accumulator on the order clock (fresh-coverage → ticks,
  capped).

**The one high-risk spot:** the tick-ordering between `tickScoringPhase`
and `tickLifecyclePhase`, and the `endedWon` / `lingerVerdict` bridging
fields. Moving conclusion to a serve message or clock-expiry needs that
ordering re-audited so no one-tick race reads stale conclusion state.
The existing code already took this care once (S-MED-1); the redesign
preserves the discipline, it does not shortcut it.

---

## 5. The scoring model, precisely

- **Gate 1 (pass/fail), at the buzzer:** the requirement rows (frost
  row, sprinkle row, cherry-zone if any) checked against the settled
  ledger + frosting field. Unmet → HUNGRY.
- **Gate 2 (acceptance):** met AND assembly score ≥ passScore → DELIGHTED;
  met but below → REFUSED. Score axes as today (coverage, neatness,
  integrity, mess, waste) but the coverage axis is **absolute**.
- **Stars (quality):** universal absolute-coverage thresholds — pass /
  1★ / 2★ / 3★ — set from the measured solo curve (§7). Crew reaches
  higher tiers by throughput, not by a lower bar.
- **The realm's favor (payout):** the giant's mood — driven by speed,
  mess, and being kept waiting — modifies the COINS awarded, never the
  stars and never the clock.

---

## 6. Dead-time & "use all the time" — how it's guaranteed

The fixed-clock family's failure mode is a satisfied crew standing
around. Three guarantees, all already in the spine:

1. **The cake is never "solvable":** absolute coverage climbs toward the
   whole cake, well past the 3★ line, so leftover seconds always convert
   to a better cake (and, past 3★, to more realm's favor — coins keep
   growing even though stars cap, so the confident crew always has a
   reason to keep firing).
2. **Earned time makes coasting cost the round:** stop landing fresh
   coverage and the clock stops growing and runs out.
3. **Serve gives an exit:** a proud crew banks and advances instead of
   waiting — no forced idle, no forced full-clock.

---

## 7. THE MEASUREMENTS (DONE 2026-07-13 — research/21)

**Both ran the same session and landed. Full record: research/21. The
headline: `TOWN_POTENTIAL 0.9` is a myth — one town reaches ~50–67%
GEOMETRICALLY (unlimited shots) and covers only ~10–20% in an honest
clock; the far hemisphere falls 47%→14% as the cake grows (the bare back
IS the measured "bring a friend"); and the solo→3★ gradient is real and
SELF-TIGHTENING — a flawless solo line can touch 3★ on the small cakes
(ceiling 38–51%) but genuinely cannot on the giants (ceiling ~32–34%),
so the top star needs a crew exactly where the fiction wants it. The
provisional absolute thresholds (§8) and the geometry-scales-difficulty
finding come from this run.**

Two headless studies in the research/11 spec-parameterized culture; both
COMMIT us to nothing and replace vacuum assumptions with data:

1. **Far-hemisphere reachability from one town.** Fire max-tension lobs
   from town 0 and census which samples on the far slope get painted.
   Settles whether the far side is geometrically reachable-but-slow or a
   true wall for one town — i.e. where solo's ceiling physically sits.
2. **The solo coverage-versus-time curve, per rung, under honest
   shot-cycle timing** (ferry + crank + aim + flight, not vacuum). This
   ONE curve prices three things at once: the earned-time rate, the star
   thresholds (pass/1★/2★ from typical, 3★ from the ceiling), and item
   §2.4's premise. It replaces `TOWN_POTENTIAL`'s vacuum 0.9 with the
   number the whole plan rests on.

Duo is INFERRED from the solo curve ("two lines, opposite sides") — no
two-player playtest is required to ship a first cut, and a real duo test
later only refines it. This is deliberate: a real duo playtest may be a
long way off, and the earned-time mechanic self-scales to crew, so the
system does not depend on precise duo numbers.

---

## 8. What stays OPEN after the measurements (tuning, his rulings)

- The star thresholds (absolute-coverage numbers) — priced by §7.
- The earned-time rate (seconds per fresh sample) + base-clock + cap —
  priced by §7.
- The realm's-favor curve (how much mood moves coins).
- Per-order-serve confirmation (§2.7) — recommended, to be blessed.
- ~~Whether the flourish's reveal trigger / bonus value change under the
  whole-order home (§2.9).~~ RULED 2026-07-13 (twenty-fifth session):
  BOTH HELD. The reveal fires at 2★ coverage (patron.ts rule 3) and the
  bonus stays `FLOURISH_BONUS_COINS = 10`. Note: under the whole-order
  home `revealed` is PURELY presentational — `stampFlourish` gates the
  coda on physical truth (cherry on the summit at an accepted conclusion,
  whenever thrown), never on the reveal — so the trigger is a pacing
  choice ("when does the Giant voice his desire"), not an eligibility
  gate.

---

## 9. Build sequence (RE-SEQUENCED in the build, 2026-07-13)

**This supersedes the original 6-step draft.** The twenty-third session's
build planning split the "scoring flip" into a safety refactor + the flip
+ the coverage change (so the behavioural cut lands on a proven-behaviour-
preserving base), and pushed earned-time / serve / realm's-favor to the
back (the flip is the load-bearing change; the rest builds on a stable
conclusion path). Eight steps now, matching the commit history and the
handoff vocabulary:

1. **The measurements (§7)** — data first. DONE (research/21).
2. **The conclusion-path refactor** — extract the shared conclusion tail
   (stampFlourish → lingerVerdict, endedWon, ending broadcast, awardPay)
   from the two sites into one `concludeOrder`. Behaviour-preserving; the
   tick-ordering audit (§4) rides here. DONE (8bc3c80).
3. **The conclusion flip** — `evaluateOrder` check-only; the auto-conclude
   branch deleted; `concludeOrder` owns the status flip; conclusion fires
   only at the buzzer. The finish window goes inert. DONE (9b99f58).
4. **Absolute coverage** — the of-potential denominator retired; frost
   floor + star tiers graded absolute against the whole cake; per-rung
   tiers on the RUNGS row. DONE (3355ff7).
5. **Delete the finish-window + rehome the flourish** — the inert
   machinery removed (`finishTicksLeft`, openFinishWindow/closeFinishWindow,
   concludeFinishWindow, FINISH_WINDOW_TICKS, the `finishOver` event,
   pendingVerdict, and the client's `FINISH IT!` banner + finishTicksLeft
   prediction). The flourish already lives at the buzzer (stampFlourish);
   the reveal trigger (2★) and bonus value (10) are HELD (§8, ruled
   2026-07-13). Pure deletion — no behavioural change. NEXT.
6. **Earned time + re-derive the clocks** — fresh-coverage → clock, capped.
   The reliable clock lands here (patience stops draining the clock). The
   base clocks re-derive from the reliable clock + earned-time (the 0.72
   derating retires; the item-26 rung-2 over-relief folds in). Solo's
   coverage relief (§2.8) gets its real calibration here. The heaviest
   remaining slice; needs the rate/cap/base-clock rulings (§8).
7. **Serve** — the `{t:"serve"}` edge-input, floor-gated, per-order
   banking; joins `concludeOrder` as the second conclusion trigger.
8. **The realm's favor** — patience → payout; `judge()` gains the mood
   axis; the noun lands in the HUD (§2.6, the payout-multiplier band).

Each step is a session-sized slice.

---

## 10. Provenance

Drafted from the twenty-third session's design discussion (the early
shutter → the conclusion model → the holistic timing+scoring pass) and a
three-stream research fan-out (as-built map, the work model, genre
patterns). Vetted point-by-point by Planning Chronus; every amendment
(Gate-1 survives / "tip" renamed / solo cap → gradient+measurement /
serve-clock structure pinned / flourish rehomed) folded in. The visionary
blessed the co-op-forward direction and the write-it-then-measure order.
