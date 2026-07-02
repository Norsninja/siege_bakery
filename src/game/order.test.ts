/**
 * Toy order law: N toppings AT REST on the cake before the clock dies.
 */
import { describe, it, expect } from "vitest";
import { createOrder, tickOrder, deliverTopping } from "./order";

describe("toy order", () => {
  it("starts running with the full clock", () => {
    const o = createOrder("cherry", 3, 5400);
    expect(o.status).toBe("running");
    expect(o.delivered).toBe(0);
    expect(o.ticksLeft).toBe(5400);
  });

  it("clock runs out → lost", () => {
    let o = createOrder("cherry", 3, 3);
    o = tickOrder(o);
    o = tickOrder(o);
    expect(o.status).toBe("running");
    o = tickOrder(o);
    expect(o.status).toBe("lost");
    expect(o.ticksLeft).toBe(0);
  });

  it("matching topping resting on the cake counts; the Nth wins", () => {
    let o = createOrder("cherry", 3, 5400);
    o = deliverTopping(o, "cherry", true);
    o = deliverTopping(o, "cherry", true);
    expect(o.delivered).toBe(2);
    expect(o.status).toBe("running");
    o = deliverTopping(o, "cherry", true);
    expect(o.status).toBe("won");
  });

  it("rolled off the cake → the patron gets nothing", () => {
    let o = createOrder("cherry", 3, 5400);
    o = deliverTopping(o, "cherry", false);
    expect(o.delivered).toBe(0);
  });

  it("wrong topping fires anyway, lands anyway, counts for nothing", () => {
    let o = createOrder("cherry", 3, 5400);
    o = deliverTopping(o, "lime", true);
    expect(o.delivered).toBe(0);
    expect(o.status).toBe("running");
  });

  it("nothing counts after the order ends, and time stops", () => {
    let o = createOrder("cherry", 1, 5400);
    o = deliverTopping(o, "cherry", true); // won
    const after = deliverTopping(o, "cherry", true);
    expect(after.delivered).toBe(1);
    expect(tickOrder(after).ticksLeft).toBe(after.ticksLeft);

    let lost = createOrder("cherry", 3, 1);
    lost = tickOrder(lost);
    expect(lost.status).toBe("lost");
    expect(deliverTopping(lost, "cherry", true).delivered).toBe(0);
  });
});
