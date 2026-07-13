# Handoff — 2026-07-13 (twenty-third session) — THE TIMING & SCORING REDESIGN

## 1. Snapshot

A design session, no game code changed. The session began at the intended
build (item 28, the early shutter) and the visionary escalated it to a
root-cause redesign of the timing and scoring model. Outcome: two new
documents (a plan and a measurement study), both to be committed this
session. NEXT SESSION: review current state + the plan, DISCUSS before
building — the visionary's standing rule; do NOT start coding the redesign
without that discussion. Tip 38aaf55 + the two uncommitted docs; 503 tests
still green (untouched). Build lane still sits at entry 5 DONE / entry 6
(patron motion) unclaimed, but the redesign now supersedes item 28 and
reshapes the order lifecycle ahead of it.

## 2. What changed this session

Documents only (no src/ changes):
- **project/plans/22-timing-and-scoring-redesign.md** (NEW) — the redesign
  of record. Grade-at-the-buzzer (Model B), vetted by Planning Chronus,
  all amendments folded in.
- **project/research/21-coverage-measurements.md** (NEW) — the two
  measurements from plans/22 §7, run this session against the real
  ProjectileManager.

The measurement study (`tmp-coverage-study.mts`) ran at repo root and was
DELETED per the study law (research/21 is the record). It drove the real
`ProjectileManager.spawn/step` + `FrostingField.paint` across every rung's
spec — not a hand-rolled parabola.

## 3. Architecture and invariants

The proposal (plans/22), settled through discussion + vetting:
- **Conclusion moves to the buzzer.** The order ends only on clock-expiry
  or a player SERVE action, never on "requirements met." Deletes
  `evaluateOrder`'s auto-conclude branch (order.ts:134) and the entire
  finish-it window. This REPEALS recorded law (plans/03: "the Judgment
  renders the moment every row is met") knowingly.
- **Gate 1 survives as the requirements checklist, evaluated at the
  buzzer.** Asks STAY DATA — do not collapse to one coverage number (that
  amputates the species-orders prize, plans/18). Rows unmet → HUNGRY; met
  but quality below → REFUSED; above → DELIGHTED with stars.
- **Absolute whole-cake coverage is the quality/star axis.** No reach or
  labor denominator. Universal thresholds. Retire `TOWN_POTENTIAL 0.9`
  (measured false — see §measurements below) and the `TOWN_ASK_POTENTIAL ×
  CREW_LABOR` coverage product.
- **Crew advantage is a GRADIENT, not a wall.** Earned time (below) is the
  bridge; calibration = pass/1★/2★ from solo-typical, 3★ from
  solo-ceiling ≈ duo-comfortable. THE LONE HERO AMENDMENT (plans/13 §5) is
  preserved in spirit; relief moves to time + floor, not a shrunken star
  bar.
- **Earned time (checkpoint mechanic):** modest base clock + seconds per
  FRESH coverage (new samples only). Visible/positive (opposite of the
  hidden patience drain). Self-limits at saturation, crew-scales for free,
  CAPPED.
- **The realm's favor replaces patience-steals-time.** Patience moves off
  the clock onto the PAYOUT (coins), never seconds. One force on the clock
  (earned time), one on the pay. Noun must be realm-paid, NOT "tip"
  (plans/17: the realm pays, the giant is a guest). Split: STARS grade the
  CAKE, the realm's favor grades the SERVICE (mood/speed/mess).
- **Serve = per-order early banking**, floor-gated. Per-order clocks +
  the rung ladder (NOT a global day-clock — that was considered and
  rejected as a bigger restructure). Additive by nature (advancing to the
  next patron is cooperative).
- **Solo relief in clock + floor**, riding the existing `Rung.soloClock`
  (CREW_CLOCK already retired). The item-26 rung-2 over-relief folds into
  this re-derivation.
- **The flourish becomes a whole-order bonus objective**, judged at the
  buzzer — no special window. Strictly more room than the deleted 15s
  finish-window; ULTRA/MASTER-BAKER key off flourish-at-conclusion
  unchanged.

Standing invariants unchanged: core/+game/ headless-deterministic; the
change is scoped to game/ (order, order-flow, patron, judgment) + the
Room's wiring — core/ (frosting, dessert, physics) and cake-state-as-events
sync are UNTOUCHED; serve is a standard authoritative edge-input. The one
high-risk mechanical spot is the tick-ordering between `tickScoringPhase`
and `tickLifecyclePhase` + the `endedWon`/`lingerVerdict` bridging (re-audit
required; do not shortcut).

## 4. File map (this session's deltas)

- **project/plans/22-timing-and-scoring-redesign.md** — the redesign:
  problem, research findings, the 9-point spine (§2), laws superseded
  (§3), mechanical change surface (§4), scoring model (§5), dead-time
  guarantees (§6), measurements-done pointer (§7), open tuning (§8),
  build sequence (§9).
- **project/research/21-coverage-measurements.md** — the two measurements,
  method, result tables, findings, provisional thresholds, caveats.

Reference (unchanged, read for the redesign):
- src/game/order.ts — `evaluateOrder` (the auto-conclude at :134), `OrderState`, `tickOrder`.
- src/game/order-flow.ts — the finish-it window, `patronLook` (patience→ticksLeft), `freshOrder` (the clock deal).
- src/game/judgment.ts — the two gates, `judge()` score formula + star tiers.
- src/game/tuning.ts — every timing/scoring constant + the effective-clock note.
- src/game/campaign.ts — RUNGS, `soloClock`.
- src/server/room.ts — `tickScoringPhase`, `tickLifecyclePhase`, the conclusion wiring.

## 5. How to run, test, verify

- The measurement method (research/21): write a `tmp-*.mts` at REPO ROOT
  (not scratchpad — node_modules), relative imports only, drive
  `makeWorld` = `new RAPIER.World(GRAVITY)` + `world.timestep = FIXED_DT`
  + `buildArenaColliders` + `geom.buildColliders`; fire via
  `ProjectileManager.spawn(world, launchOrigin(MACHINE_BASE, traverse),
  launchVelocity(traverse, clicks, tiltNotch*2.5), "frosting",
  {consumeOnImpact:true})`; step with `shots.step(world, geom).impacts[0]`;
  footprint = `splatSamples(geom.samples, im.pos, im.speed)`. Needs
  `await RAPIER.init()` first. Run `npx tsx tmp-*.mts`, then DELETE it.
- Standard: `npm run check` (503 green at 38aaf55), `npm test`,
  `npm run dev` (5174).

## 6. Open items and decisions

DECIDED (do not re-litigate — the 9-point spine, plans/22 §2; all vetted):
grade at the buzzer; Gate-1 checklist survives + asks stay data; absolute
coverage axis; crew = gradient not wall; earned time capped; realm's favor
(realm-paid, not "tip"); serve = per-order additive banking; solo relief in
clock+floor; flourish = whole-order bonus; finish-window + threshold-conclude
deleted.

MEASURED THIS SESSION (research/21 — settles the vacuum assumptions):
- `TOWN_POTENTIAL 0.9` is FALSE. One town reaches ~50–67% GEOMETRICALLY
  (unlimited shots), ~10–20% in an honest clock (human ~13–16% at the
  anchor). Far hemisphere 47%→14% as rungs climb.
- Solo→3★ gradient is real and self-tightening: solo ceiling 38–51% (small
  cakes, 3★ touchable) → ~32–34% (giants, 3★ needs a crew). Geometry
  scales the difficulty for free.

OPEN (tuning — priced by research/21, need the visionary's ruling BEFORE
or DURING build):
- Absolute star thresholds (provisional: pass/1★ ~10–13%, 2★ ~18–22%, 3★
  ~35–40%; likely flat across rungs).
- Earned-time rate (seconds per fresh sample; ~0.5–0.6 samples/s optimal
  marginal at the anchor) + base clock + cap.
- The realm's-favor curve (how much mood moves coins).
- Per-order-serve confirmation.
- The flourish's reveal trigger / bonus value under the whole-order home.
- Cupcake (rung 4) is accuracy-limited, not volume-limited — its
  thresholds want their own ruling.

OTHER STANDING: item 28 (early shutter) is SUPERSEDED by this redesign
(grade-at-buzzer dissolves it). Item 27 (locked fort) still planned,
untouched.

## 7. Next session focus

The visionary's explicit instruction: REVIEW the current state + the plan
(plans/22 + research/21), then DISCUSS before building. Do NOT begin coding
the redesign until that discussion. When build begins, the sequence is
plans/22 §9: (1) measurements DONE; (2) the scoring flip — absolute
coverage + Gate-1-at-the-buzzer + remove `evaluateOrder` auto-conclude,
re-cut pins; (3) earned time; (4) the realm's favor; (5) serve +
finish-window deletion + flourish rehome; (6) re-derive the clocks. The
tick-ordering audit (§4) rides step 2. Each step is a session-sized slice.

## 8. Recommended reading order

1. This handoff.
2. project/plans/22-timing-and-scoring-redesign.md — the redesign of
   record (the 9-point spine is §2; laws superseded §3; change surface §4;
   build sequence §9).
3. project/research/21-coverage-measurements.md — the two measurements
   that ground the plan (the 0.9-is-false finding + provisional thresholds).
4. src/game/order.ts (`evaluateOrder` :134 = the auto-conclude to remove)
   + src/game/order-flow.ts (finish-it window + `patronLook` patience) —
   the code the redesign edits first.
5. src/game/judgment.ts (`judge()` — the score formula + star tiers that
   move to the buzzer) + src/game/tuning.ts (the constants + effective-clock
   note).
6. project/research/20-clock-relief-study.md — the prior clock derivation
   the redesign generalizes (the 0.72 patience-derating retires here).
7. project/plans/15-side-quests.md item 28 (superseded) + item 26 (folds
   in) for continuity.
8. git log --oneline -8.
