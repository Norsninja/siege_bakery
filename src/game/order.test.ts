/**
 * Order law with rows: every row met while the clock runs → won; the clock
 * dying first → lost; the Patron may mutate the rows mid-order.
 */
import { describe, it, expect } from "vitest";
import { CAKE_POS } from "../core/arena";
import { createOrder, tickOrder, evaluateOrder } from "./order";
import type { Requirement, SettledTopping } from "./judgment";

const yTop = CAKE_POS.y + 1.6;
const onCake = (topping: string, x = 0, z = CAKE_POS.z): SettledTopping => ({
  topping,
  pos: { x, y: yTop, z },
  onCake: true,
});
const onFloor = (topping: string): SettledTopping => ({
  topping,
  pos: { x: 0, y: 0.35, z: -20 },
  onCake: false,
});

const rows = (): Requirement[] => [
  { kind: "count-on-cake", topping: "cherry", needed: 2 },
  { kind: "count-in-zone", topping: "lime", zone: "peak", needed: 1 },
];

describe("orders with rows", () => {
  it("starts running with the full clock and every row unmet", () => {
    const o = createOrder(rows(), 5400);
    expect(o.status).toBe("running");
    expect(o.ticksLeft).toBe(5400);
    const { checks } = evaluateOrder(o, []);
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

  it("some rows met is still running; ALL rows met wins", () => {
    const o = createOrder(rows(), 5400);
    const partial = evaluateOrder(o, [onCake("cherry"), onCake("cherry", 3)]);
    expect(partial.checks[0]?.met).toBe(true);
    expect(partial.state.status).toBe("running");
    const full = evaluateOrder(o, [
      onCake("cherry"),
      onCake("cherry", 3),
      onCake("lime", 0.5),
    ]);
    expect(full.state.status).toBe("won");
  });

  it("floor cherries and wrong toppings move no row", () => {
    const o = createOrder(rows(), 5400);
    const { state, checks } = evaluateOrder(o, [
      onFloor("cherry"),
      onCake("lime", 3.5), // on the cake but not DEAD CENTER
    ]);
    expect(checks.map((c) => c.current)).toEqual([0, 0]);
    expect(state.status).toBe("running");
  });

  it("an empty order cannot win — nothing was asked", () => {
    const { state } = evaluateOrder(createOrder([], 5400), []);
    expect(state.status).toBe("running");
  });

  it("a finished order never un-finishes", () => {
    const o = createOrder([{ kind: "count-on-cake", topping: "cherry", needed: 1 }], 5400);
    const won = evaluateOrder(o, [onCake("cherry")]).state;
    expect(won.status).toBe("won");
    expect(evaluateOrder(won, []).state.status).toBe("won"); // even re-censused empty
    let lost = createOrder(rows(), 1);
    lost = tickOrder(lost);
    expect(evaluateOrder(lost, [onCake("cherry"), onCake("cherry", 3), onCake("lime")]).state.status).toBe("lost");
  });

  it("the Patron may mutate rows mid-order: tightening un-meets, appending demands more", () => {
    const o = createOrder(rows(), 5400);
    const settled = [onCake("cherry"), onCake("cherry", 3)];
    expect(evaluateOrder(o, settled).checks[0]?.met).toBe(true);
    // MORE. CHERRIES. (tighten row 0 in place — the array is deliberately mutable)
    const r0 = o.requirements[0];
    if (r0?.kind === "count-on-cake") r0.needed = 3;
    const after = evaluateOrder(o, settled);
    expect(after.checks[0]?.met).toBe(false);
    expect(after.checks[0]?.target).toBe(3);
    // ...IT NEEDS A CHERRY DEAD CENTER. NOW. (append a row)
    o.requirements.push({ kind: "count-in-zone", topping: "cherry", zone: "peak", needed: 1 });
    expect(evaluateOrder(o, settled).checks).toHaveLength(3);
  });
});
