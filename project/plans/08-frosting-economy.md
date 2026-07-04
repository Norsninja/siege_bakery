# Plan 08 — The frosting economy (designed WITH the visionary, 2026-07-03)

## Why this exists

The frosting slice shipped with an economy tuned to fit the old clock:
frac walked 50 → 30 → 25 and splats grew until four shots met the ask.
The visionary called the direction WRONG (handoff 2026-07-03 §6): frosting
is the CORE activity, many shots is the INTENDED loop, splashes were "10
hexagons or more" when he wanted ~7-8 in a rough circle, and the demanded
coverage had to go back UP. This plan records the redesign — decided in
session, with him, from measured numbers.

## The discovery that shaped everything: POTENTIAL COVERAGE

The ceiling study (research/06, standing re-pin tool) fired the whole
discrete aim envelope and greedy-set-covered the census:

| Towns | Coverage ceiling | Greedy shots |
|-------|-----------------|--------------|
| 1     | 43.7%           | 51           |
| 2     | 75.2%           | 87           |
| 3     | 86.7%           | 95           |
| 4     | 94.6%           | 90           |

**One town cannot frost half the cake, ever** — a round cake shows one
firing line only its near hemisphere (every region caps near half: tier
tops 45-51%, walls 40-47%). The visionary's read: that is WHY multiple
towns exist (the 2D game had two), so the Patron grades against POTENTIAL
— "that's pretty good for one town" is literally the math. Every coverage
ask and tier is a fraction OF-REACH; more towns = higher potential = a
harder absolute ask. TOWN_POTENTIAL pins the ceilings a hair under the
idealized numbers (0.42/0.73/0.85/0.93) because nobody aims like a
set-cover solver.

## The decisions (in the order they were settled)

1. **Area-honest census.** Walls are 66.5% of the true skin (99.7 of
   150 m²) but were only 50.1% of the census. Now walls sample at top
   density (WALL_SAMPLE_SPACING 0.65 → 0.45): **661 samples, 218 tops /
   443 walls = the true area split.** Every blob is one equal unit of
   dessert; "what you see IS the census" survives. 661 re-pinned as wire
   format.

2. **Small splats: ~7-8 globs in a rough circle.** Dollop radius 1.3 →
   0.6; splash 2.1 + 0.15/speed cap 3.4 → 0.7 + 0.05/speed cap 1.1;
   vertical band 1.2 → 0.8. Measured (research/04 §3 re-run): 5-12
   painted per shot, ~1.1-1.8%/shot. The band's job is now shaping wall
   patches round — ledge-to-ledge bridging is physically impossible
   (reach 1.1 < 1.5 gap), decided on purpose (closes audit deferred
   item 1). Known dead arc: 0/1×6 impacts a band gap and paints 0.

3. **FROST_FRAC 0.5 — of potential.** "50% is just passing." For one town
   that is 0.5 × 0.42 ≈ 21% of the census ≈ 139 samples ≈ 11-14 idealized
   shots, ~18-22 human ones. The HUD row reads "FROST 50% OF YOUR SIDE"
   and its progress is coverage÷potential — the same words stay honest at
   any town count. The dessert report can still show absolute coverage
   (Judgment carries both `coverage` and `effectiveCoverage`).

4. **Stars come from coverage tiers, not score arithmetic.** COVERAGE_GOOD
   0.7, COVERAGE_EXCELLENT 0.9 (of potential, knobs in tuning.ts, carried
   on the order like passScore): accepted = 1★, ≥good = 2★, ≥excellent =
   3★. Gate 2 (score ≥ passScore) still decides ACCEPTANCE — mess and
   waste can sink any coverage. The score's coverage axis normalizes at
   the excellence tier, so overshoot keeps earning score to the ceiling.
   **3★ is rare ON PURPOSE** — the visionary: the dessert-report
   screenshot of a poorly decorated cake is half the fun; teams climb
   toward the ceiling's asymptote across game nights. (The 2D axis
   saturated at the ask — this is a new design, not a restoration.)

5. **Pace: fix the clock, not the splats.** ORDER_SECONDS 120 → 300
   (effective ~225s after grumble burns), ORDER_PAR_SHOTS 8 → 24 (a good
   line: ~20 frost + 2 sprinkles + crown). Crank 0.75s/click and burn
   rates UNCHANGED (visionary call). One glob per shot — FOR NOW; the
   multi-glob scoop (and XP unlocks like a frosting bomb) are the
   throughput levers waiting if playtest wants them. Solo passes tight,
   a duo comfortably; that is the co-op shape, on purpose.

**Every number here is a playtest hypothesis, not law** (visionary,
verbatim intent): real 2-player throughput and fun-per-minute are unknown
until the friend test, and orders/projectiles will vary these per ticket.

## Verification

- 168 vitest green, both tsc legs (root + headless), after re-pins:
  census 661 (218/443), forgiveness window narrowed (~0.5m), judgment
  star tiers + of-reach normalization pinned both ways, WIN path re-cut.
- The Room WIN test now plays the ceiling study's first 13 greedy picks
  over real protocol: WON 81/100, 1★, effective coverage 0.566, ~74s
  spare. LIVE-TRUTH LESSON pinned in the test: a late glob passing a
  settled sprinkle's ledge left it creeping — 650 ticks later it had
  rolled 0.6m off its paint and honestly un-counted; the line now places
  sprinkle 2 after the sky is clear.

## The re-pin law (extends plans/07's)

Splat-constant or census changes re-run research/04 §3 AND research/06,
then re-pin FROST_FRAC / TOWN_POTENTIAL / ORDER_PAR_SHOTS / ORDER_SECONDS
together, plus the 661 wire pin and the WIN-test shot table. research/06's
mirrored constants must be kept in step with core/frosting.ts.

## Open threads for the towns slice and beyond

- Room hardcodes TOWN_POTENTIAL[1] in standardRequirements — index by real
  town count when towns exist; the mirrored town-2 machine is the study's
  symmetry argument made real.
- Patron flavor: "pretty good for one town" as end-banner text.
- The dessert report / cake screenshot (visionary's aesthetic idea).
- Multi-glob scoop / frosting bomb as XP-gated throughput levers.
- 2★/3★ reachability per team size is THE playtest question after pass
  pace: a duo should touch 0.7-of-reach on a good night.
