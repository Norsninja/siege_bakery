/**
 * THE HONEST-POP TWIN (plans/15 item 31) — the client-side mirror of the
 * three SILENT earn axes so the new economy (plans/22 step 6/9, plans/24)
 * is VISIBLE, not just felt in the purse. The PAINT "+Ns" already pops off
 * the deterministic frosting twin (plans/22 step 6b, shots-view.ts); this
 * is its three siblings, gathered in one testable home:
 *
 *   - DRIP  (plans/22 step 9): fresh cake pays COINS. Mirrors room.ts's
 *     `dripFraction` — fractional coins accumulate, whole coins flush. Fed
 *     the SAME fresh-sample count the paint pop reads (the frosting twin),
 *     so it fires at the impact site.
 *   - GARNISH (plans/24 ruling 3): sprinkle conversions buy clock. Mirrors
 *     order-flow.ts's `earnGarnishTime` — ask-capped high-water over the
 *     on-frosting rows (Σ min(current, target)); only NEW maxima earn.
 *     Fed the `scored`/`order` broadcast's checks (the wire carries them).
 *   - TOPPER (plans/24 ruling 3): the cherry's FIRST crowning buys a chunk,
 *     ONCE. Mirrors order-flow.ts's `earnTopperTime` — fed the broadcast's
 *     desire.met flag; pops the single time it flips true.
 *
 * WHY A TWIN, NOT A NEW WIRE FIELD (item 31): the client already holds the
 * fresh count (deterministic) and the checks/desire (broadcast), so the
 * pops need no new server message — the same bargain the paint pop struck.
 * The one imprecision it inherits: like the paint "+Ns", the shared
 * EARNED_TIME_CAP_S is NOT modelled here, so near the cap a garnish/topper
 * pop can name a second the Room's clock didn't actually gain. Accepted —
 * the cap is loose by design (tuning.ts: "never bites normal play"), and
 * the authoritative clock/purse are the truth surface; these are juice.
 *
 * FLOOR, NEVER OVER-CLAIM: the fractional accumulators FLOOR (drip coins,
 * garnish seconds), so the summed pops are ≤ the real earn, never above it.
 * Reset PER DEAL (`reset`, called at the deal boundary): the Room resets
 * garnishHigh/topperPaid per deal too; its `dripFraction` actually carries
 * across deals within a run, so the client can lag the purse by <1 coin per
 * deal — under-celebration, never a lie (the safe direction).
 *
 * client/ only: pure arithmetic, no scene. The callers render the word
 * (shots-view at the impact site for the drip; main over the cake for
 * garnish/topper).
 */
import type { RequirementCheck } from "../game/judgment";
import {
  DRIP_COINS_PER_SAMPLE,
  GARNISH_TIME_PER_GRAIN_S,
  TOPPER_TIME_S,
} from "../game/tuning";

export class EarnPops {
  /** Sub-coin drip carry (room.ts dripFraction's twin). */
  private dripFraction = 0;
  /** The garnish ask-capped high-water already popped (earnGarnishTime's
   * `garnishHigh` twin) — grains, not seconds. */
  private garnishHigh = 0;
  /** Sub-second garnish carry: the high-water advances in grains, the pop
   * shows whole seconds, so the fraction rides here (never lost). */
  private garnishSecFrac = 0;
  /** The topper's once (earnTopperTime's `topperPaid` twin). */
  private topperPopped = false;

  /** A fresh deal: every axis resets, mirroring OrderFlow's per-deal reset
   * of garnishHigh/topperPaid. (The Room's dripFraction carries across
   * deals within a run; resetting it here only ever under-pops by <1 coin
   * — the floor-never-over-claim direction.) */
  reset(): void {
    this.dripFraction = 0;
    this.garnishHigh = 0;
    this.garnishSecFrac = 0;
    this.topperPopped = false;
  }

  /** THE DRIP (room.ts dripFraction): fresh samples buy fractional coins;
   * whole coins flush. Returns coins to pop this call (0 = nothing yet). */
  drip(fresh: number): number {
    if (fresh <= 0) return 0;
    this.dripFraction += fresh * DRIP_COINS_PER_SAMPLE;
    const coins = Math.floor(this.dripFraction);
    this.dripFraction -= coins;
    return coins;
  }

  /** THE GARNISH (order-flow.earnGarnishTime): ask-capped high-water over
   * the on-frosting rows; only new maxima earn. Returns whole SECONDS to
   * pop (0 = no new progress, or a sub-second advance still accumulating). */
  garnish(checks: readonly RequirementCheck[]): number {
    let progress = 0;
    for (const c of checks)
      if (c.req.kind === "on-frosting")
        progress += Math.min(c.current, c.target);
    if (progress <= this.garnishHigh) return 0;
    const gained = progress - this.garnishHigh;
    this.garnishHigh = progress;
    this.garnishSecFrac += gained * GARNISH_TIME_PER_GRAIN_S;
    const secs = Math.floor(this.garnishSecFrac);
    this.garnishSecFrac -= secs;
    return secs;
  }

  /** THE TOPPER (order-flow.earnTopperTime): the cherry's FIRST crowning on
   * frosting pays its chunk once per deal. Returns TOPPER_TIME_S the single
   * time `met` flips true, 0 forever after (a knock-off + re-crown pays
   * nothing twice, exactly like the Room). */
  topper(met: boolean): number {
    if (!met || this.topperPopped) return 0;
    this.topperPopped = true;
    return TOPPER_TIME_S;
  }
}
