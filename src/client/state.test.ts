/**
 * The client-never-declares-an-ending rule (X2/F5, plans/06): the local
 * display clock counts down but clamps at one tick — order status flips
 * only when the room says so (net-handlers pins cover that side).
 * Plus shopState (slice 5): the stall's prediction of the Room's shop law.
 */
import { describe, it, expect } from "vitest";
import { RUNGS } from "../game/campaign";
import { createOrder } from "../game/order";
import { TOWN2_PRICE } from "../game/tuning";
import { createMatchView, predictClock, shopState } from "./state";

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

describe("shopState — the stall's prediction of the Room's shop law (slice 5)", () => {
  const won = { ...createOrder([], 100), status: "won" as const };

  it("hours OPEN exactly in a won separator during a live run — never a run-ending linger", () => {
    const v = createMatchView();
    v.run = { phase: "running", rung: 2, purse: 60 };
    v.order = won;
    expect(shopState(v)).toEqual({
      open: true,
      owned: false,
      price: TOWN2_PRICE,
      purse: 60,
    });
    // A running order: closed (gates-law parity).
    v.order = createOrder([], 100);
    expect(shopState(v).open).toBe(false);
    // A loss's linger: closed — the run is ending, the key would be dead.
    v.order = { ...createOrder([], 100), status: "lost" as const };
    expect(shopState(v).open).toBe(false);
    // The TOP rung's triumph linger: closed for the same reason.
    v.run = { phase: "running", rung: RUNGS.length };
    v.order = won;
    expect(shopState(v).open).toBe(false);
    // The lobby: no hours at all (and no purse — moot by arithmetic).
    v.run = { phase: "lobby", rung: 0 };
    expect(shopState(v).open).toBe(false);
    expect(shopState(v).purse).toBe(0); // absent reads 0
  });

  it("owned reads the machines list — the same signal the rigs render from", () => {
    const v = createMatchView();
    expect(shopState(v).owned).toBe(false);
    v.machines.push({ ...v.machines[0]! });
    expect(shopState(v).owned).toBe(true);
  });
});
