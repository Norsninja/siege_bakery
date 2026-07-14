/**
 * Order law with rows (grade-at-the-buzzer, plans/22 step 3): meeting the
 * rows leaves the order RUNNING — `evaluateOrder` is CHECK-ONLY now. The
 * clock's death is the conclusion, and the verdict (`judge`) is rendered at
 * the buzzer, by the Room (server/room.ts concludeOrder). These tests pin
 * the check-only census + the clock; the judge outcomes are exercised
 * directly (the judge logic is unchanged — only WHEN it runs moved). The
 * Patron may still mutate the rows mid-order.
 */
import { describe, it, expect } from "vitest";
import { CAKE_Z } from "../core/arena";
import { CAKE_3, dessertGeometry } from "../core/dessert";
import { buildCensus, FrostingField } from "../core/frosting";
import { createOrder, tickOrder, evaluateOrder } from "./order";
import { judge, type Requirement, type SettledTopping } from "./judgment";

// The spec refactor (plans/13 §3): the order judges against the deal's
// geometry — cake-3 here, the anchor row.
const GEOM = dessertGeometry(CAKE_3);
const SAMPLES = buildCensus(CAKE_3);

/** A cake nobody frosted (these are row-law tests, not census tests). */
const naked = () => new FrostingField(SAMPLES);
/** One perfect uniform coat — for the full-marks pins. */
const fullCoat = () => {
  const f = new FrostingField(SAMPLES);
  f.restore(new Array<number>(SAMPLES.length).fill(1));
  return f;
};

const LEDGE_Y = CAKE_3.tiers[0]!.top + 0.3; // resting on the bottom tier
const TOP_Y = CAKE_3.tiers[2]!.top + 0.3; // resting on the summit

const onCake = (topping: string, x = 3.5): SettledTopping => ({
  topping,
  pos: { x, y: LEDGE_Y, z: CAKE_Z },
  onCake: true,
});
const onSummit = (topping: string): SettledTopping => ({
  topping,
  pos: { x: 0, y: TOP_Y, z: CAKE_Z },
  onCake: true,
});
const onFloor = (topping: string): SettledTopping => ({
  topping,
  pos: { x: 0, y: 0.35, z: -20 },
  onCake: false,
});

const rows = (): Requirement[] => [
  { kind: "count-on-cake", topping: "cherry", needed: 2 },
  { kind: "crown", topping: "lime" },
];

describe("orders with rows", () => {
  it("starts running with the full clock and every row unmet", () => {
    const o = createOrder(rows(), 5400);
    expect(o.status).toBe("running");
    expect(o.ticksLeft).toBe(5400);
    const checks = evaluateOrder(GEOM, o, [], naked());
    expect(checks.every((c) => !c.met && c.current === 0)).toBe(true);
  });

  it("clock runs out → lost, and time stops", () => {
    let o = createOrder(rows(), 2);
    o = tickOrder(o);
    expect(o.status).toBe("running");
    o = tickOrder(o);
    expect(o.status).toBe("lost");
    expect(o.ticksLeft).toBe(0);
    expect(tickOrder(o).ticksLeft).toBe(0);
  });

  it("meeting every row leaves the order RUNNING — the verdict waits for the buzzer", () => {
    const o = createOrder(rows(), 5400);
    const partial = evaluateOrder(GEOM, o, [onCake("cherry"), onCake("cherry", -3.5)], naked());
    expect(partial[0]?.met).toBe(true);
    expect(o.status).toBe("running");
    // ALL rows met no longer renders a verdict or ends the order (the flip):
    const settled = [onCake("cherry"), onCake("cherry", -3.5), onSummit("lime")];
    const allChecks = evaluateOrder(GEOM, o, settled, naked());
    expect(allChecks.every((c) => c.met)).toBe(true);
    expect(o.status).toBe("running"); // still running — the buzzer hasn't rung
    // The Room judges at conclusion (concludeOrder → judge): a fully frosted
    // cake clears the floor — served, coverage tops the climb (3★).
    const j = judge(GEOM, o, settled, fullCoat());
    expect(j.accepted).toBe(true);
    expect(j.stars).toBe(3);
  });

  it("floor cherries and lower-tier limes move no row", () => {
    const o = createOrder(rows(), 5400);
    const checks = evaluateOrder(
      GEOM,
      o,
      [
        onFloor("cherry"),
        onCake("lime"), // on the cake but not the summit — no crown
      ],
      naked(),
    );
    expect(checks.map((c) => c.current)).toEqual([0, 0]);
    expect(o.status).toBe("running");
  });

  it("an order with no rows censuses to nothing (a degenerate ticket)", () => {
    const o = createOrder([], 5400);
    expect(evaluateOrder(GEOM, o, [], naked())).toHaveLength(0);
    // No frost row = no floor to fail — every live order carries one
    // (requirementsFor); this is only the empty-fixture guard.
  });

  it("the Patron may mutate rows mid-order: tightening un-meets, appending demands more", () => {
    const o = createOrder(rows(), 5400);
    const settled = [onCake("cherry"), onCake("cherry", -3.5)];
    expect(evaluateOrder(GEOM, o, settled, naked())[0]?.met).toBe(true);
    // MORE. CHERRIES. (tighten row 0 in place — the array is deliberately mutable)
    const r0 = o.requirements[0];
    if (r0?.kind === "count-on-cake") r0.needed = 3;
    const after = evaluateOrder(GEOM, o, settled, naked());
    expect(after[0]?.met).toBe(false);
    expect(after[0]?.target).toBe(3);
    // ...IT NEEDS A CHERRY. ON THE VERY TOP. (append a row)
    o.requirements.push({ kind: "crown", topping: "cherry" });
    expect(evaluateOrder(GEOM, o, settled, naked())).toHaveLength(3);
  });
});
