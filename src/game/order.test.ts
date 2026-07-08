/**
 * Order law with rows: every row met while the clock runs → won; the clock
 * dying first → lost; the Patron may mutate the rows mid-order.
 */
import { describe, it, expect } from "vitest";
import { CAKE_Z } from "../core/arena";
import { CAKE_3, dessertGeometry } from "../core/dessert";
import { buildCensus, FrostingField } from "../core/frosting";
import { createOrder, tickOrder, evaluateOrder } from "./order";
import type { Requirement, SettledTopping } from "./judgment";

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
    const { checks } = evaluateOrder(GEOM, o, [], naked(), 0);
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

  it("some rows met is still running; ALL rows met renders the Judgment", () => {
    const o = createOrder(rows(), 5400);
    const partial = evaluateOrder(GEOM, o, [onCake("cherry"), onCake("cherry", -3.5)], naked(), 2);
    expect(partial.checks[0]?.met).toBe(true);
    expect(partial.state.status).toBe("running");
    expect(partial.judgment).toBeUndefined();
    // A clean bake, under par: both gates clear — delighted, full marks.
    const full = evaluateOrder(GEOM, 
      o,
      [onCake("cherry"), onCake("cherry", -3.5), onSummit("lime")],
      fullCoat(),
      3,
    );
    expect(full.state.status).toBe("won");
    expect(full.judgment?.met).toBe(true);
    expect(full.judgment?.accepted).toBe(true);
    expect(full.judgment?.score).toBe(100);
    expect(full.judgment?.stars).toBe(3);
  });

  it("gate 2 refusal: every box ticked, but the floor wears most of it", () => {
    const o = createOrder(rows(), 5400); // passScore 50
    const settled = [
      onCake("cherry"),
      onCake("cherry", -3.5),
      onSummit("lime"),
      ...Array.from({ length: 9 }, () => onFloor("cherry")),
    ];
    const r = evaluateOrder(GEOM, o, settled, naked(), 24); // 12 toppings, 24 shots vs par 6
    expect(r.judgment?.met).toBe(true); // you did what was asked...
    expect(r.judgment?.accepted).toBe(false); // ...badly. REFUSED.
    expect(r.state.status).toBe("lost");
    expect(r.judgment?.stars).toBe(0);
  });

  it("floor cherries and lower-tier limes move no row", () => {
    const o = createOrder(rows(), 5400);
    const { state, checks } = evaluateOrder(GEOM, 
      o,
      [
        onFloor("cherry"),
        onCake("lime"), // on the cake but not the summit — no crown
      ],
      naked(),
      2,
    );
    expect(checks.map((c) => c.current)).toEqual([0, 0]);
    expect(state.status).toBe("running");
  });

  it("an empty order cannot win — nothing was asked", () => {
    const { state } = evaluateOrder(GEOM, createOrder([], 5400), [], naked(), 0);
    expect(state.status).toBe("running");
  });

  it("a finished order never un-finishes", () => {
    const o = createOrder([{ kind: "count-on-cake", topping: "cherry", needed: 1 }], 5400);
    const won = evaluateOrder(GEOM, o, [onCake("cherry")], naked(), 1).state;
    expect(won.status).toBe("won");
    expect(evaluateOrder(GEOM, won, [], naked(), 1).state.status).toBe("won"); // even re-censused empty
    let lost = createOrder(rows(), 1);
    lost = tickOrder(lost);
    expect(
      evaluateOrder(GEOM, 
        lost,
        [onCake("cherry"), onCake("cherry", -3.5), onSummit("lime")],
        naked(),
        3,
      ).state.status,
    ).toBe("lost");
  });

  it("the Patron may mutate rows mid-order: tightening un-meets, appending demands more", () => {
    const o = createOrder(rows(), 5400);
    const settled = [onCake("cherry"), onCake("cherry", -3.5)];
    expect(evaluateOrder(GEOM, o, settled, naked(), 2).checks[0]?.met).toBe(true);
    // MORE. CHERRIES. (tighten row 0 in place — the array is deliberately mutable)
    const r0 = o.requirements[0];
    if (r0?.kind === "count-on-cake") r0.needed = 3;
    const after = evaluateOrder(GEOM, o, settled, naked(), 2);
    expect(after.checks[0]?.met).toBe(false);
    expect(after.checks[0]?.target).toBe(3);
    // ...IT NEEDS A CHERRY. ON THE VERY TOP. (append a row)
    o.requirements.push({ kind: "crown", topping: "cherry" });
    expect(evaluateOrder(GEOM, o, settled, naked(), 2).checks).toHaveLength(3);
  });
});
