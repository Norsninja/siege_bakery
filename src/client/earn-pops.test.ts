/**
 * THE HONEST-POP TWIN (plans/15 item 31) — pins the client mirror against
 * the server arithmetic it echoes (room.ts dripFraction, order-flow
 * earnGarnishTime/earnTopperTime). The rendering (a green "+Ns", a gold
 * "+N" gold) is the callers' job and lives in shots-view.test / by eye; here
 * we grade only the NUMBERS the pops carry — and the two laws that keep
 * them honest: floor-never-over-claim, and reset-per-deal.
 */
import { describe, it, expect } from "vitest";
import type { RequirementCheck } from "../game/judgment";
import {
  DRIP_COINS_PER_SAMPLE,
  GARNISH_TIME_PER_GRAIN_S,
  TOPPER_TIME_S,
} from "../game/tuning";
import { EarnPops } from "./earn-pops";

/** One on-frosting sprinkle row at `current` grains (the garnish input). */
const grains = (current: number, target = 60): RequirementCheck => ({
  req: { kind: "on-frosting", topping: "sprinkles", needed: target },
  current,
  target,
  met: current >= target,
});

describe("THE DRIP (room.ts dripFraction's twin): fresh cake flushes whole coins", () => {
  it("accumulates fractional coins and flushes a whole one at the threshold", () => {
    const p = new EarnPops();
    // 0.05 coins/sample → 20 fresh = 1 coin. Ten fresh is half a coin: silent.
    expect(p.drip(10)).toBe(0);
    expect(p.drip(10)).toBe(1); // the carried 0.5 + 0.5 crosses 1
    expect(p.drip(0)).toBe(0); // no fresh, no coin (and no negative)
  });

  it("floors — a 1.5-coin burst pops 1 now, carries 0.5 for later (never over-claims)", () => {
    const p = new EarnPops();
    expect(p.drip(30)).toBe(1); // 30 × 0.05 = 1.5 → 1
    expect(p.drip(10)).toBe(1); // carried 0.5 + 0.5 = 1.0 → 1
    expect(DRIP_COINS_PER_SAMPLE).toBe(0.05); // the twin reads the real dial
  });
});

describe("THE GARNISH (order-flow.earnGarnishTime's twin): ask-capped high-water", () => {
  it("only NEW maxima earn — a burst pays, the same count again pays nothing", () => {
    const p = new EarnPops();
    // 40 grains × 0.4 s = 16 s.
    expect(p.garnish([grains(40)])).toBe(40 * GARNISH_TIME_PER_GRAIN_S);
    expect(p.garnish([grains(40)])).toBe(0); // no new high-water
    expect(p.garnish([grains(60)])).toBe(20 * GARNISH_TIME_PER_GRAIN_S); // +20 grains
  });

  it("a drop below the high-water (burial) earns nothing — the mark only rises", () => {
    const p = new EarnPops();
    expect(p.garnish([grains(50)])).toBe(20); // 50 × 0.4
    expect(p.garnish([grains(30)])).toBe(0); // buried back to 30: no re-pay
    expect(p.garnish([grains(50)])).toBe(0); // re-reaching 50 is still no new max
  });

  it("accumulates sub-second advances instead of flooring them away", () => {
    const p = new EarnPops();
    // 1 grain = 0.4 s → floors to 0, but the fraction is NOT lost.
    expect(p.garnish([grains(1)])).toBe(0);
    // Reaching 3 grains total = 1.2 s cumulative → the whole second pops now.
    expect(p.garnish([grains(3)])).toBe(1);
  });

  it("reads ONLY on-frosting rows — a count-on-cake row is not garnish", () => {
    const p = new EarnPops();
    const cakeRow: RequirementCheck = {
      req: { kind: "count-on-cake", topping: "cherry", needed: 1 },
      current: 1,
      target: 1,
      met: true,
    };
    expect(p.garnish([cakeRow])).toBe(0); // no on-frosting row → no garnish
    expect(p.garnish([cakeRow, grains(40)])).toBe(16); // the sprinkle row alone
  });
});

describe("THE TOPPER (order-flow.earnTopperTime's twin): the crowning pays once", () => {
  it("pops TOPPER_TIME_S the first time the cherry crowns, nothing after", () => {
    const p = new EarnPops();
    expect(p.topper(false)).toBe(0); // not crowned yet
    expect(p.topper(true)).toBe(TOPPER_TIME_S); // the crowning
    expect(p.topper(true)).toBe(0); // held true — no second pay
    expect(p.topper(false)).toBe(0); // knocked off — still nothing owed
    expect(p.topper(true)).toBe(0); // re-crowned — the Room paid once, so do we
  });
});

describe("RESET (the deal boundary): every axis starts clean, mirroring OrderFlow", () => {
  it("a fresh deal re-arms the drip flush, the garnish high-water, and the topper once", () => {
    const p = new EarnPops();
    p.drip(30); // carry 0.5
    p.garnish([grains(40)]); // high-water 40
    p.topper(true); // topper spent
    p.reset();
    // Drip carry gone: 10 fresh is back to half a coin (silent), not a flush.
    expect(p.drip(10)).toBe(0);
    // High-water gone: 40 grains earns its full 16 s again on the new cake.
    expect(p.garnish([grains(40)])).toBe(40 * GARNISH_TIME_PER_GRAIN_S);
    // Topper re-armed: the new deal's cherry pays again.
    expect(p.topper(true)).toBe(TOPPER_TIME_S);
  });
});
