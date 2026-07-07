/**
 * The order lifecycle state machine (Room.tick decomp) — the counters and
 * transitions in isolation. Room-level behavior (broadcast sequences, the
 * WIN path) stays pinned in server/room.test.ts; these pin the flow's own
 * contract: cadence, linger, the re-deal reset, deal-tag monotonicity.
 */
import { describe, it, expect } from "vitest";
import { OrderFlow, standardRequirements } from "./order-flow";
import {
  FROST_FRAC,
  ORDER_RESET_TICKS,
  ORDER_SECONDS,
  PATRON_LOOK_EVERY,
  SPRINKLES_NEEDED,
  TOWN_ASK_POTENTIAL,
} from "./tuning";

describe("standardRequirements", () => {
  it("the honest order: frost-of-potential + sprinkles, fresh rows each call", () => {
    const a = standardRequirements();
    expect(a).toEqual([
      // The AUTHORED ask, never the measured ceiling (Option B, 2026-07-07):
      // 0.42 held — the clicks→10 bump must not raise the live solo order.
      { kind: "frost-coverage", frac: FROST_FRAC, potential: TOWN_ASK_POTENTIAL[1] },
      { kind: "on-frosting", topping: "sprinkles", needed: SPRINKLES_NEEDED },
    ]);
    // Orders are mutable; rows must never be shared between deals.
    expect(a[0]).not.toBe(standardRequirements()[0]);
  });

  it("DECISION PIN (Option B, 2026-07-07): the solo ask HELD at 0.42", () => {
    // The clicks→10 bump grew measured reach to ~0.55 but the live order's
    // workload must not silently rise ~31% with it. Moving this number is
    // a design decision — restate the tuning.ts workload math when you do.
    expect(TOWN_ASK_POTENTIAL[1]).toBe(0.42);
  });
});

describe("OrderFlow", () => {
  it("deals a fresh running order with the full clock", () => {
    const flow = new OrderFlow();
    expect(flow.order.status).toBe("running");
    expect(flow.order.ticksLeft).toBe(ORDER_SECONDS * 60);
    expect(flow.deal).toBe(0);
    expect(flow.shotsFired).toBe(0);
  });

  it("the look cadence fires every PATRON_LOOK_EVERY running ticks, and not while ended", () => {
    const flow = new OrderFlow();
    let looks = 0;
    for (let i = 0; i < PATRON_LOOK_EVERY * 2; i++) {
      if (flow.shouldLook()) looks++;
      flow.tickClock();
    }
    expect(looks).toBe(2);
    flow.order = { ...flow.order, status: "won" };
    expect(flow.shouldLook()).toBe(false); // the banner is not order time
  });

  it("clock death emits 'ended' exactly once, then lingers ORDER_RESET_TICKS to 'redeal'", () => {
    const flow = new OrderFlow();
    flow.order = { ...flow.order, ticksLeft: 1 };
    const first = flow.tickClock();
    expect(first).toEqual(["ended"]);
    expect(flow.order.status).toBe("lost");
    // The transition tick already counted toward the linger (pre-decomp
    // behavior, pinned): redeal arrives ORDER_RESET_TICKS - 1 ticks later.
    for (let i = 0; i < ORDER_RESET_TICKS - 2; i++)
      expect(flow.tickClock()).toEqual([]);
    expect(flow.tickClock()).toEqual(["redeal"]);
  });

  it("the re-deal: deal tag ratchets, shots reset, fresh order, fresh cadence", () => {
    const flow = new OrderFlow();
    flow.noteShot();
    flow.noteShot();
    expect(flow.shotsFired).toBe(2);
    // Walk one tick into the look cadence so a stale counter would show.
    flow.shouldLook();
    flow.order = { ...flow.order, ticksLeft: 1 };
    while (!flow.tickClock().includes("redeal")); // burn the linger
    expect(flow.deal).toBe(1); // in-flight shots now carry a stale tag
    expect(flow.shotsFired).toBe(0);
    expect(flow.order.status).toBe("running");
    expect(flow.order.ticksLeft).toBe(ORDER_SECONDS * 60);
    // The fresh order's cadence starts over: no early look.
    let early = false;
    for (let i = 0; i < PATRON_LOOK_EVERY - 1; i++)
      if (flow.shouldLook()) early = true;
    expect(early).toBe(false);
  });
});
