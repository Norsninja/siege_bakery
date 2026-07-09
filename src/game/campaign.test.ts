/**
 * The RUNGS table (plans/13 §4, authored slice 3) — authoring pins.
 * The table is DATA this slice (specForRung still deals the anchor);
 * these pins make the two laws it was authored under structural: the
 * ANCHOR law (rung 3 = today's live numbers, verbatim) and ASK-HONESTY
 * (no crown against a spec whose measured summit takes no shipped
 * combo — the cake-6 finding).
 */
import { describe, it, expect } from "vitest";
import { CAKE_3, specById } from "../core/dessert";
import { RUNGS, rungRow, specForRung, validateRungs } from "./campaign";
import { FROST_FRAC, ORDER_SECONDS, SPRINKLES_NEEDED } from "./tuning";

describe("RUNGS (the authored ladder)", () => {
  it("every row names a real spec row", () => {
    expect(() => validateRungs()).not.toThrow();
    for (const r of RUNGS) expect(specById(r.spec)).toBeDefined();
  });

  it("rung 3 IS the anchor — today's live numbers, verbatim", () => {
    const anchor = rungRow(3);
    expect(anchor.spec).toBe("cake-3");
    expect(anchor.clockSeconds).toBe(ORDER_SECONDS);
    expect(anchor.asks.frostFrac).toBe(FROST_FRAC);
    expect(anchor.asks.sprinkles).toBe(SPRINKLES_NEEDED);
    expect(anchor.asks.crown).toBe(true);
  });

  it("the cupcake is rung 4 — the precision spike after the anchor (§1 amendment)", () => {
    expect(rungRow(4).spec).toBe("cupcake");
    expect(rungRow(4).asks.crown).toBe(true); // 8 measured windows — hot, but real
  });

  it("cake-6 asks the crown ANYWAY — the impossible tragedy (visionary's ruling)", () => {
    // The measured summit takes no shipped (click, notch) combo; the
    // ask stands deliberately — the final rung is unwinnable on
    // today's machine and the future economy sells the key (power-ups,
    // plans/15 item 6). The ONE sanctioned impossible ask.
    const top = RUNGS[RUNGS.length - 1]!;
    expect(top.spec).toBe("cake-6");
    expect(top.asks.crown).toBe(true);
  });

  it("rows are sane: fractions in (0,1], grains ≥ 0, clocks > 0, pay climbs", () => {
    let prevBase = 0;
    for (const r of RUNGS) {
      expect(r.asks.frostFrac).toBeGreaterThan(0);
      expect(r.asks.frostFrac).toBeLessThanOrEqual(1);
      expect(r.asks.sprinkles).toBeGreaterThanOrEqual(0);
      expect(r.clockSeconds).toBeGreaterThan(0);
      expect(r.pay.base).toBeGreaterThan(prevBase);
      expect(r.pay.perStar).toBeGreaterThan(0);
      prevBase = r.pay.base;
    }
  });

  it("rungRow clamps into the ladder at both ends", () => {
    expect(rungRow(0)).toBe(RUNGS[0]);
    expect(rungRow(1)).toBe(RUNGS[0]);
    expect(rungRow(99)).toBe(RUNGS[RUNGS.length - 1]);
  });

  it("SLICE-3 BOUNDARY: specForRung still deals the anchor for every rung", () => {
    // Slice 4 flips this to the table in one deliberate move (deal +
    // asks + clock together). Until then the live game is unchanged.
    for (const rung of [0, 1, 3, 4, 7, 99]) expect(specForRung(rung)).toBe(CAKE_3);
  });
});
