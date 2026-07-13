/**
 * The RUNGS table (plans/13 §4, authored slice 3; LIVE since slice 4) —
 * authoring pins. These make the laws the table was authored under
 * structural: the ANCHOR law (rung 3 = today's live numbers, verbatim),
 * ASK-HONESTY as amended (asks.crown is the FLOURISH flag since the §1
 * flourish amendment — the summit table is its honesty ledger), the par
 * yardstick, and the flip itself (specForRung deals THIS table).
 */
import { describe, it, expect } from "vitest";
import { DESSERT_SPECS, PRACTICE_TARGET, specById } from "../core/dessert";
import {
  RUNGS,
  dessertSpecFor,
  rungRow,
  specForRung,
  validateRungs,
} from "./campaign";
import {
  FROST_FRAC,
  ORDER_PAR_SHOTS,
  ORDER_SECONDS,
  SPRINKLES_NEEDED,
} from "./tuning";

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
    expect(anchor.parShots.solo).toBe(ORDER_PAR_SHOTS); // 24, the anchor's par
  });

  it("the cupcake is rung 4 — the precision spike after the anchor (§1 amendment)", () => {
    expect(rungRow(4).spec).toBe("cupcake");
    expect(rungRow(4).asks.crown).toBe(true); // 8 measured windows — hot, but real
  });

  it("cake-6 offers the flourish ANYWAY — the tragedy, amended (§1 flourish amendment)", () => {
    // The measured summit takes no shipped (click, notch) combo. Since
    // the flourish amendment the crown gates NOTHING — rung 7 is winnable
    // by workload (MASTER BAKER) — and the flag stands deliberately: the
    // flourish over the dead summit is the ULTRA ask, impossible until
    // the economy sells the key (power-ups, plans/15 item 6).
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

  it("par is sane: duo prices the bigger workload, both positive", () => {
    // The authored column (campaign.ts header formula). Duo > solo on
    // every row — the two-town ask is a strictly bigger workload; flat
    // par punishing duo play on high rungs is the gap par-per-rung fixes.
    for (const r of RUNGS) {
      expect(r.parShots.solo).toBeGreaterThan(0);
      expect(r.parShots.duo).toBeGreaterThan(r.parShots.solo);
    }
  });

  it("rungRow clamps into the ladder at both ends", () => {
    expect(rungRow(0)).toBe(RUNGS[0]);
    expect(rungRow(1)).toBe(RUNGS[0]);
    expect(rungRow(99)).toBe(RUNGS[RUNGS.length - 1]);
  });

  it("THE LADDER IS LIVE: specForRung deals the table (slice 4 — the boundary retired)", () => {
    // The slice-3 boundary pin inverted: deal + asks + clock flipped
    // together; every rung resolves its OWN spec through rungRow's clamp.
    for (const [i, r] of RUNGS.entries())
      expect(specForRung(i + 1)).toBe(specById(r.spec));
    expect(specForRung(0)).toBe(specById("cake-1")); // the lobby's dormant rung 1
    expect(specForRung(99)).toBe(specById("cake-6")); // past the top: the top
  });
});

describe("dessertSpecFor (the training lobby, plans/15 item 25)", () => {
  it("no cake before the order: lobby and countdown stand the practice target", () => {
    expect(dessertSpecFor("lobby", 0)).toBe(PRACTICE_TARGET);
    expect(dessertSpecFor("countdown", 0)).toBe(PRACTICE_TARGET);
    // Whatever rung the container left behind — the phase decides.
    expect(dessertSpecFor("lobby", 5)).toBe(PRACTICE_TARGET);
  });

  it("a live run deals the rung's spec; runover keeps the final cake on display", () => {
    expect(dessertSpecFor("running", 1)).toBe(specById("cake-1"));
    expect(dessertSpecFor("running", 3)).toBe(specById("cake-3"));
    expect(dessertSpecFor("runover", 4)).toBe(specById("cupcake"));
    expect(dessertSpecFor("running", 0)).toBe(specById("cake-1")); // defensive clamp
  });

  it("the practice target is a TARGET, not a dessert: never dealable", () => {
    // Not in DESSERT_SPECS (no wire id lookup, no RUNGS referent) and no
    // RUNGS row may name it — the plank never rides the ladder.
    expect(specById("practice")).toBeUndefined();
    expect(DESSERT_SPECS).not.toContain(PRACTICE_TARGET);
    for (const r of RUNGS) expect(r.spec).not.toBe("practice");
    // One modest tier, collider tight to the plank (the forcefield rule).
    expect(PRACTICE_TARGET.tiers).toHaveLength(1);
  });
});
