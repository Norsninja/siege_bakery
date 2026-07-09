/**
 * The client-never-declares-an-ending rule (X2/F5, plans/06): the local
 * display clock counts down but clamps at one tick — order status flips
 * only when the room says so (net-handlers pins cover that side).
 */
import { describe, it, expect } from "vitest";
import { createOrder } from "../game/order";
import { predictClock } from "./state";

describe("predictClock", () => {
  it("counts the display clock down while running", () => {
    const o = createOrder([], 100);
    expect(predictClock(o).ticksLeft).toBe(99);
    expect(predictClock(o).status).toBe("running");
  });

  it("REGRESSION: clamps at one tick — never flips to lost locally", () => {
    let o = createOrder([], 2);
    for (let i = 0; i < 10; i++) o = predictClock(o);
    expect(o.ticksLeft).toBe(1);
    expect(o.status).toBe("running"); // the ending is the room's to declare
  });

  it("a finished order is left exactly as the room sent it", () => {
    const ended = { ...createOrder([], 100), status: "lost" as const, ticksLeft: 0 };
    expect(predictClock(ended)).toEqual(ended);
  });

  it("THE FINISH IT WINDOW (slice 4b): predicts the window's countdown, holds the order clock", () => {
    let o = { ...createOrder([], 100), finishTicksLeft: 10 };
    o = predictClock(o);
    expect(o.finishTicksLeft).toBe(9);
    expect(o.ticksLeft).toBe(100); // the outcome is decided; this clock is dead
    // Same advisory clamp: the CLOSE is the room's to declare.
    for (let i = 0; i < 20; i++) o = predictClock(o);
    expect(o.finishTicksLeft).toBe(1);
    expect(o.status).toBe("running");
  });
});
