# Research 20 — THE CLOCK RELIEF STUDY (plans/15 item 26 menu (c))

**2026-07-12, twentieth session.** The derivation behind `CREW_CLOCK`
(game/tuning.ts) and rung 1's row edit (150 → 180). The study script
ran as a repo-root tmp (`tmp-clock-study.mts`, deleted per the study
law — this document is the record; the model is small enough to
re-derive from the numbers below).

## The calibration point (the only real measurement)

The visionary's rung-1 solo playtest (eighteenth session): going as
fast as he can, he **misses by ~5 s**. Against the effective clock —
nominal × ~0.72 after patience burns (tuning.ts header math), i.e.
150 s × 0.72 ≈ **108 s effective** — his practiced line needs
**~113 s**. That is consistent with the measured no-recrank line the
0.35 labor pin was sized on (six shots, ~17.5 s/cycle, +8 s tail).
Every model number below is anchored to this point; the model's raw
(uncalibrated) solo cycle of 23.5 s — the general re-crank cycle —
overstates his optimized line but describes ordinary play.

## The structural finding (item 26, confirmed)

The clock was the last **crew-blind** number: asks scale by
CREW_LABOR, par picks a solo column, pay stamps hands — but
clockSeconds dealt the same seconds to one baker as to four. Solo
ferried ~2× the workload per second on the same clock; rung 1 was
mathematically unwinnable for its own designer.

## The fix, as ruled (menu a + b)

- **(a) CREW_CLOCK** — `[0, 1.25, 1.0, 1.0, 1.0]`, indexed by
  connected crew at deal time, applied in OrderFlow.freshOrder:
  `ticksLeft = round(clockSeconds × CREW_CLOCK[crew] × 60)`. The
  RUNGS rows stay **verbatim** (rung 3's anchor law untouched); both
  replicas read the broadcast ticksLeft, so nothing new syncs.
- **(b) rung 1: 150 → 180** — the row edit (rung 1 is not the
  anchor). "A fumbling first-timer feeds the ogre while learning the
  winch" — real slack; pressure is rung 2+'s job. Duo rung 1 inherits
  the same +30 s; acceptable under (b)'s first-timer standard, and
  generosity only shows when struggling.
- **Duo clocks otherwise: ZERO drift** (CREW_CLOCK[2+] = 1.0). The
  friend test played duo under current clocks and "it's fun" — the
  caution on record holds.

## What the numbers buy (solo, effective = nominal × 0.72)

| rung | before (nom/eff) | after (nom/eff) | practiced-line need | verdict |
|------|------------------|-----------------|---------------------|---------|
| 1    | 150 / 108        | 225 / 162       | ~113 s              | passes with ~45 s of room; a learner has a fighting chance |
| 2    | 210 / 151        | 263 / 189       | ~150–270 s (recrank line) | possible-to-hard — the ladder starts outrunning one dwarf |
| 3    | 300 / 216        | 375 / 270       | ~170–310 s          | hard mode holds |
| 6–7  | 330–360 / 238–259 | 413–450 / 297–324 | ~240–270 s+       | perfect-play borderline — the fiction survives |

Solo stays hard mode ON PURPOSE past rung 1 (the 0.35 pin's own
words: the ladder still outruns one dwarf mid-climb). The factor
relieves; it does not conquer.

## THE ONE DIAL (the re-pin law's spirit applied to time)

If the visionary's next solo run still runs hot or cold, **move
CREW_CLOCK[1]** (or rung 1's row for tutorial-only feel) — nothing
else. Duo timing moves only if a playtest asks, and any such move
restates this document's math. Pins: order-flow.test.ts (the solo
stretch, duo zero-drift, clamps, rung 1 = 180), room.test.ts (the
cupcake deal prices the lone hero's clock over protocol).

## ADDENDUM — the flat factor went PER-RUNG (twenty-second session, 2026-07-12)

The one dial moved, and it revealed the scalar's flaw. The visionary's
rung-2 solo playtest: **~1 minute too much time.** The flat 1.25 is a
rung-1-shaped fix wrongly applied to the ladder — the ferry-to-par
ratio changes shape as tiers stack, and rung 1 was the only calibrated
row.

The exact clock arithmetic (effective = nominal × factor × 0.72),
anchored on the two measured solo pass-lines (rung 1 ≈ 113 s quantified;
rung 2 ≈ 135 s inferred from "~1 min too much" at the 189 s clock):

| rung | row | eff @1.25 | eff @1.00 | measured line | room @1.25 | room @1.00 |
|------|-----|-----------|-----------|---------------|------------|------------|
| 1    | 180 | 162 s     | 130 s     | ~113 s        | +49 s      | +17 s      |
| 2    | 210 | 189 s     | 151 s     | ~135 s        | +54 s      | +16 s      |

The factor each measured rung *wants*: **rung 1 → 1.22** (~45 s tutorial
room), **rung 2 → 1.03** (~20 s hard-mode room). A single scalar can't
serve both.

**Why not the row (the coupling trap):** the row is shared solo/duo
(duo clock = row × 1.0), so lowering rung 2's row drags DUO down too —
and duo is validated-fun (the friend test). The row can't move.

**THE RULING (visionary, 2026-07-12): the relief is the TUTORIAL'S.**
The solo factor moved onto the Rung row as `soloClock` (campaign.ts,
beside clockSeconds/parShots): **rung 1 = 1.25, rung 2+ = 1.0.** At
1.0, rung 2 solo (151 s eff) equals its duo clock — the honest ladder;
solo relief comes from CREW_LABOR (the 0.35 ask), and the *clock*
relief was only ever acute at rung 1. Duo stays zero-drift (the deal
reads a literal 1.0 for crew 2+). Rung 3+ default to 1.0 too — one
clean rule; a per-cell bump waits for a solo playtest that asks.
CREW_CLOCK the scalar is RETIRED (a live scalar beside a per-rung
column is the drift this project guards against). New pins in
order-flow.test.ts (per-rung: rung 1 stretches, rung 3 does not) and
room.test.ts (the cupcake, rung 4, runs the honest row).
