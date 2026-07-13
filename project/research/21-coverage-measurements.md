# Research 21 — THE COVERAGE MEASUREMENTS (plans/22 §7)

**2026-07-13, twenty-third session.** The two measurements the timing +
scoring redesign (plans/22) rests on: far-hemisphere reachability from
one town, and the real time-bounded solo coverage curve. Both drive the
REAL `ProjectileManager` against the real arena + dessert colliders (not
a hand-rolled parabola), so first-impacts and paint footprints are the
game's own physics. Study script `tmp-coverage-study.mts` ran at repo
root and was deleted per the study law — this document is the record; the
model re-derives from the method below.

## Method

- Fire a `frosting` glob (`consumeOnImpact`) from town 0 at every combo
  of clicks {4–10} × tilt notch {0,2,…,12} × traverse {−12…+12}; take its
  FIRST impact; its splat footprint = `splatSamples(geom.samples, pos,
  speed)` (the same paint model the Room scores through).
- **Reach (vacuum):** union of every combo's footprint; classify census
  samples by hemisphere (near = z > CAKE_Z, toward town 0; far = z <
  CAKE_Z). No time — "what can a projectile ever touch."
- **Solo curve (time-bounded):** phase 1 = the single best power/tilt
  band swept across traverse at 17.5 s/shot (no re-crank, the fast line);
  phase 2 = greedy varied-aim over the full palette at 23.5 s/shot
  (re-crank + re-aim). This is the OPTIMAL solo line; real human play is
  ~1.7× slower (research/06's idealized-vs-human ratio).

## MEASUREMENT 1 — geometric reach from ONE town (vacuum, unlimited shots)

| rung | spec | census | TOTAL reach | near | **far** | side |
|------|------|--------|-------------|------|---------|------|
| 1 | cake-1 | 433 | 66.7% | 84.9% | **46.7%** | 77.1% |
| 2 | cake-2 | 568 | 59.0% | 85.9% | **28.5%** | 81.0% |
| 3 (anchor) | cake-3 | 661 | 55.7% | 86.9% | **22.3%** | 68.0% |
| 4 (cupcake) | cupcake | 68 | 91.2% | 100% | **84.0%** | 88.9% |
| 5 | cake-4 | 701 | 52.2% | 86.1% | **16.4%** | 63.0% |
| 6 | cake-5 | 741 | 51.6% | 85.9% | **15.3%** | 61.3% |
| 7 | cake-6 | 751 | 50.7% | 85.8% | **13.6%** | 59.5% |

**Findings:**
1. **`TOWN_POTENTIAL = 0.9` is a myth.** Even with unlimited shots, one
   town reaches only ~51–67% of the cake (~56% on the anchor) — NOT 90%.
   The visionary's suspicion was right; the 0.9 was a vacuum metric that
   never described the real envelope. (This CONFIRMS research/11's older
   43.7–55.7% absolute figure and refutes the 0.9 the ask math was built
   on.)
2. **One town owns its NEAR hemisphere (~86%, flat across rungs) and
   barely touches the FAR side** — far reach falls 46.7% → 13.6% as the
   cake grows taller (the taller tiers shadow the far slope from a
   near-side lob). Lobs DO cross the crown (the design's claim holds), but
   onto a shrinking sliver of the back.
3. **The far side is the co-op story, literally.** Town 1 is the 180°
   rotation, so its NEAR is town 0's FAR. A second baker on the opposite
   fort turns the ~14–47% far reach into ~86% — the bare back of a solo
   cake is a measured, physical "bring a friend," and it grows barer as
   the cake grows.
4. **Free difficulty from geometry (Planning Chronus's prediction),
   CONFIRMED:** the same envelope covers less of a bigger cake — total
   reach 66.7% (rung 1) → 50.7% (rung 7). The ladder gets difficulty
   progression from the geometry itself.
5. **The cupcake is the outlier** (91% reachable, tiny target) — it
   breaks the volume model; its challenge is aim accuracy, not reach.

## MEASUREMENT 2 — time-bounded solo coverage (OPTIMAL line; human ≈ 1.7× slower)

Absolute coverage of the whole cake, optimal solo line:

| rung | @108s | @162s | @200s | @300s | ceiling(420s) |
|------|-------|-------|-------|-------|---------------|
| 1 | 15.7% | 20.1% | 26.3% | 37.9% | 51.3% |
| 2 | 14.6% | 19.7% | 25.7% | 34.3% | 45.1% |
| 3 (anchor) | 12.0% | 16.5% | 21.8% | 29.2% | 38.1% |
| 4 (cupcake) | 75.0% | 88.2% | 91.2% | 91.2% | 91.2% |
| 5 | 10.7% | 13.6% | 17.8% | 24.3% | 32.7% |
| 6 | 10.4% | 14.3% | 19.0% | 25.6% | 34.0% |
| 7 | 10.3% | 14.1% | 18.8% | 25.6% | 34.1% |

**Findings:**
1. **Real solo coverage in an honest clock is ~10–20%, not 90%.** At the
   anchor's ~216 s effective clock, optimal solo covers ~22%; a real
   human (~1.7× slower) covers **~13–16%**. This validates the work
   model's ~16–23% estimate and buries the vacuum 0.9. The
   "of-potential" denominator (`0.147` solo) was accidentally near the
   TRUTH by a wrong route: solo really does live around 14–22% absolute.
2. **Coverage climbs slowly and sublinearly.** Even OPTIMAL play needs
   ~300 s to reach ~30–38% (small cakes) and tops out ~34% on the big
   ones within a 7-minute ceiling. TIME, not geometry, is the binding
   constraint (the optimal ceiling 32–51% sits BELOW the geometric reach
   50–67% — you can't fire enough shots to touch everything reachable).
3. **The gradient is real and self-tightening — this is the keystone
   result for plans/22 §2.4:**
   - On the SMALL cakes (rungs 1–3) the solo ceiling (38–51%) sits ABOVE
     a ~40% 3★ line — a flawless, patient solo line *can* touch 3★. Lone
     Hero Amendment honored: reachable, just hard.
   - On the BIG cakes (rungs 5–7) the solo ceiling (~32–34%) sits BELOW
     ~40% — solo genuinely cannot 3★ the giant cakes in any honest clock.
     Per plans/22 §2.4 this is a FINDING, not a decree: **the little
     cakes a lone baker can master; the giant cakes need a crew for the
     top star.** The star ceiling tightens with cake size FOR FREE.
   - A duo (two towns, opposite hemispheres, ~2.85× throughput) reaches
     ~40% comfortably on every rung. "Bring a friend" = gradient on the
     small cakes, a real wall on the big ones — exactly the co-op-forward
     shape the visionary blessed.

## What this fixes in the plan

- **Retire `TOWN_POTENTIAL 0.9`** — replace with measured one-town reach
  (~0.5–0.67, falling with cake size) and time-bounded solo coverage
  (~0.10–0.20 in a normal clock). Absolute coverage is the honest axis.
- **Provisional ABSOLUTE star thresholds** (whole-cake coverage; human
  play, so read the optimal table × ~0.6):
  - pass / 1★ ≈ **10–13%** — a solid solo line clears it.
  - 2★ ≈ **18–22%** — strong solo / easy duo.
  - 3★ ≈ **35–40%** — solo grinds toward it on small cakes (earned time
    is the bridge), unreachable solo on big cakes, comfortable for a duo.
  - Consider a FLAT threshold across rungs and let geometry scale the
    difficulty (finding 4/§2.4). Tune against a real run.
- **Earned-time rate:** the optimal marginal coverage rate late in the
  curve is ~0.5–0.6 fresh samples/s (anchor); this prices "seconds per
  fresh sample" so a productive line stays alive without a perfect crew
  running forever. Exact number is a tuning follow-up.
- **Duo stays INFERRED** (two lines, opposite hemispheres — supported by
  the near/far split: town 1's near = town 0's far). No two-player
  playtest was needed to ground the model, exactly as plans/22 §7
  intended.

## Caveats

- The solo curve is the OPTIMAL greedy line; human play is ~1.7× slower
  (apply ~0.6× to the coverage-at-time figures for a real player).
- Phase-1/phase-2 cycle times (17.5 s / 23.5 s) are the measured solo
  cycles (tuning.ts header, research/20); if a real solo playtest under
  the NEW reliable clock measures different, re-derive.
- The cupcake (rung 4) is accuracy-limited, not volume-limited — its
  numbers describe a different game and its thresholds want their own
  ruling.
- Duo is inferred, not measured — a real 2-player test later refines the
  duo half; the earned-time mechanic self-scales in the meantime.
