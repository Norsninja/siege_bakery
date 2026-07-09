/**
 * The order lifecycle state machine (Room.tick decomp) — the counters and
 * transitions in isolation. Room-level behavior (broadcast sequences, the
 * WIN path) stays pinned in server/room.test.ts; these pin the flow's own
 * contract: cadence, linger, the Room-owned deal (plans/13 slice 4),
 * deal-tag monotonicity, and the per-rung ticket.
 */
import { describe, it, expect } from "vitest";
import { rungRow } from "./campaign";
import {
  OrderFlow,
  requirementsFor,
  standardRequirements,
  validateDesires,
} from "./order-flow";
import {
  CREW_LABOR,
  FINISH_WINDOW_TICKS,
  FROST_FRAC,
  ORDER_RESET_TICKS,
  ORDER_SECONDS,
  PATRON_LOOK_EVERY,
  SPRINKLES_NEEDED,
  TOWN_ASK_POTENTIAL,
} from "./tuning";

describe("requirementsFor (the per-rung ticket, slice 4)", () => {
  it("rung 3 IS today's standing order — the anchor, verbatim", () => {
    expect(requirementsFor(rungRow(3))).toEqual([
      // The AUTHORED ask, never the measured ceiling (Option B, 2026-07-07):
      // 0.42 held — the clicks→10 bump must not raise the live solo order.
      { kind: "frost-coverage", frac: FROST_FRAC, potential: TOWN_ASK_POTENTIAL[1] },
      { kind: "on-frosting", topping: "sprinkles", needed: SPRINKLES_NEEDED },
    ]);
    // standardRequirements survives as exactly this — the anchor alias
    // for scripts/studies that predate the ladder.
    expect(standardRequirements()).toEqual(requirementsFor(rungRow(3)));
    // Orders are mutable; rows must never be shared between deals.
    expect(requirementsFor(rungRow(3))[0]).not.toBe(requirementsFor(rungRow(3))[0]);
  });

  it("a zero sprinkle ask deals NO row (rung 1) — a zero-target row is born met", () => {
    const rows = requirementsFor(rungRow(1));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "frost-coverage", frac: 0.4 });
  });

  it("NO crown row deals on any rung — the flourish amendment (slice 4 ships crown-shelved)", () => {
    for (let rung = 1; rung <= 7; rung++)
      expect(requirementsFor(rungRow(rung)).some((r) => r.kind === "crown")).toBe(
        false,
      );
  });

  it("DECISION PIN (Option B, 2026-07-07): the solo ask HELD at 0.42", () => {
    // The clicks→10 bump grew measured reach to ~0.55 but the live order's
    // workload must not silently rise ~31% with it. Moving this number is
    // a design decision — restate the tuning.ts workload math when you do.
    expect(TOWN_ASK_POTENTIAL[1]).toBe(0.42);
  });

  it("the ask is priced by ACTIVE town count — one town's number forever unless you buy (plans/11 §6)", () => {
    const one = requirementsFor(rungRow(3), 1);
    const two = requirementsFor(rungRow(3), 2);
    expect(one[0]).toMatchObject({ kind: "frost-coverage", potential: 0.42 });
    expect(two[0]).toMatchObject({ kind: "frost-coverage", potential: 0.75 });
    // The default is the one-town game, exactly (callers that don't know
    // about towns keep dealing today's order).
    expect(requirementsFor(rungRow(3))).toEqual(one);
    // A town count past the authored table clamps to its top instead of
    // dealing `potential: undefined` — fails loud here when fort 3 lands.
    expect(requirementsFor(rungRow(3), 7)[0]).toMatchObject({ potential: 0.75 });
  });
});

describe("THE LONE HERO AMENDMENT (plans/13 §5) — ask = REACH × LABOR", () => {
  it("DECISION PIN (2026-07-09, re-pinned same day): labor [—, 0.35, 1, 1, 1] — never zero, never a bonus", () => {
    // 0.5 was the hypothesis; 0.35 is MEASURED — the visionary's best
    // rung-1 line (power 6, ±8° sweep, 6 shots) was replicated in-harness
    // and plateaus at 6.7% absolute: band overlap decays late shots to
    // ~0.9%. At 0.35 that line passes on its sixth shot with ~14%
    // headroom; at 0.5 it can never pass. Moving [1] is a design
    // decision — restate the tuning.ts saturation math when you do.
    expect(CREW_LABOR).toEqual([0, 0.35, 1.0, 1.0, 1.0]);
  });

  it("one pair of hands scales the ask by labor — the potential AND the grains (ceil)", () => {
    const solo = requirementsFor(rungRow(3), 1, 1);
    expect(solo[0]).toMatchObject({
      kind: "frost-coverage",
      frac: FROST_FRAC,
      potential: TOWN_ASK_POTENTIAL[1]! * CREW_LABOR[1]!, // 0.147
    });
    // Grains scale too (ruled 2026-07-09: the shot cycle prices hands,
    // whatever the payload) — 60 → 21, ceiled so a row never asks 0.
    expect(solo[1]).toMatchObject({
      topping: "sprinkles",
      needed: Math.ceil(SPRINKLES_NEEDED * CREW_LABOR[1]!), // 21
    });
  });

  it("crew 2+ deals today's numbers VERBATIM — the friend test inherits zero drift", () => {
    expect(requirementsFor(rungRow(3), 1, 2)).toEqual(requirementsFor(rungRow(3)));
    expect(requirementsFor(rungRow(3), 1, 4)).toEqual(requirementsFor(rungRow(3)));
  });

  it("crew clamps BOTH ways: an empty room prices solo, a mob prices full labor", () => {
    // CREW_LABOR[0] is a guard, never indexed — labor 0 would deal a
    // born-met ask, and the Giant does not order cakes from nobody.
    expect(requirementsFor(rungRow(3), 1, 0)).toEqual(requirementsFor(rungRow(3), 1, 1));
    expect(requirementsFor(rungRow(3), 1, 9)).toEqual(requirementsFor(rungRow(3), 1, 2));
  });

  it("labor multiplies REACH — two towns × one dwarf compose", () => {
    expect(requirementsFor(rungRow(3), 2, 1)[0]).toMatchObject({
      potential: TOWN_ASK_POTENTIAL[2]! * CREW_LABOR[1]!, // 0.2625
    });
  });
});

describe("OrderFlow", () => {
  it("the dormant boot order is rung 1's ticket — clock, rows, and solo par", () => {
    const flow = new OrderFlow();
    expect(flow.order.status).toBe("running");
    expect(flow.order.ticksLeft).toBe(rungRow(1).clockSeconds * 60);
    expect(flow.order.parShots).toBe(rungRow(1).parShots.solo);
    expect(flow.order.requirements).toEqual(requirementsFor(rungRow(1)));
    expect(flow.deal).toBe(0);
    expect(flow.shotsFired).toBe(0);
  });

  it("dealFresh prices the GIVEN row — clock and asks climb with the rung", () => {
    const flow = new OrderFlow();
    flow.dealFresh(rungRow(3));
    expect(flow.order.ticksLeft).toBe(ORDER_SECONDS * 60); // the anchor's 300s
    expect(flow.order.parShots).toBe(rungRow(3).parShots.solo); // 24
    expect(flow.order.requirements).toEqual(standardRequirements());
  });

  it("par picks the duo column when the second town is active", () => {
    const flow = new OrderFlow();
    flow.activeTowns = 2;
    flow.dealFresh(rungRow(3));
    expect(flow.order.parShots).toBe(rungRow(3).parShots.duo);
    expect(flow.order.requirements[0]).toMatchObject({ potential: 0.75 });
  });

  it("the deal prices activeCrew and stamps the ticket — the RUNNING order keeps its labor", () => {
    const flow = new OrderFlow();
    // A bare flow prices full labor (pre-amendment numbers, hands 2).
    expect(flow.order.hands).toBe(2);
    flow.activeCrew = 1;
    flow.dealFresh(rungRow(3));
    expect(flow.order.hands).toBe(1);
    expect(flow.order.requirements).toEqual(requirementsFor(rungRow(3), 1, 1));
    // A joiner mid-order never retro-changes the ticket (towns law
    // verbatim): the ask follows at the NEXT deal.
    flow.activeCrew = 2;
    expect(flow.order.hands).toBe(1);
    expect(flow.order.requirements).toEqual(requirementsFor(rungRow(3), 1, 1));
    flow.dealFresh(rungRow(3));
    expect(flow.order.hands).toBe(2);
    expect(flow.order.requirements).toEqual(standardRequirements());
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

  it("clock death emits 'ended' once, lingers ORDER_RESET_TICKS to 'lingerOver' — and deals NOTHING", () => {
    const flow = new OrderFlow();
    flow.order = { ...flow.order, ticksLeft: 1 };
    const first = flow.tickClock();
    expect(first).toEqual(["ended"]);
    expect(flow.order.status).toBe("lost");
    // The transition tick already counted toward the linger (pre-decomp
    // behavior, pinned): lingerOver arrives ORDER_RESET_TICKS - 1 later.
    for (let i = 0; i < ORDER_RESET_TICKS - 2; i++)
      expect(flow.tickClock()).toEqual([]);
    expect(flow.tickClock()).toEqual(["lingerOver"]);
    // THE ROOM OWNS THE DEAL (slice 4): the flow must not self-deal —
    // it cannot know which rung the ladder climbed to.
    expect(flow.order.status).toBe("lost");
    expect(flow.deal).toBe(0);
  });

  it("flourish rungs deal the patron's DESIRE; tutorial rungs deal none (slice 4b)", () => {
    const flow = new OrderFlow();
    // The dormant boot order is rung 1 — no flourish in the tutorial.
    expect(flow.order.desire).toBeUndefined();
    flow.dealFresh(rungRow(3)); // asks.crown → the Giant's cherry
    expect(flow.order.desire).toEqual({
      topping: "cherry",
      revealed: false,
      met: false,
    });
    flow.dealFresh(rungRow(2)); // crown: false — no desire
    expect(flow.order.desire).toBeUndefined();
  });

  it("THE TOPPERS LAW holds: validateDesires passes (no desire topping is orderable)", () => {
    expect(() => validateDesires()).not.toThrow();
  });

  it("THE FINISH IT WINDOW holds every clock but its own, then reports finishOver once", () => {
    const flow = new OrderFlow();
    flow.dealFresh(rungRow(3));
    const ticksBefore = flow.order.ticksLeft;
    flow.openFinishWindow();
    expect(flow.order.finishTicksLeft).toBe(FINISH_WINDOW_TICKS);
    expect(flow.order.status).toBe("running"); // decided, not ended
    expect(flow.shouldLook()).toBe(false); // the patron holds his breath
    for (let i = 0; i < FINISH_WINDOW_TICKS - 1; i++)
      expect(flow.tickClock()).toEqual([]);
    expect(flow.tickClock()).toEqual(["finishOver"]);
    expect(flow.order.finishTicksLeft).toBe(0);
    // The order clock held for the whole window — decided is decided.
    expect(flow.order.ticksLeft).toBe(ticksBefore);
    expect(flow.order.status).toBe("running"); // the CLOSE is the Room's word
  });

  it("closeFinishWindow ends the decided win; the linger runs from there", () => {
    const flow = new OrderFlow();
    flow.dealFresh(rungRow(3));
    flow.openFinishWindow();
    flow.closeFinishWindow();
    expect(flow.order.status).toBe("won");
    expect(flow.order.finishTicksLeft).toBe(0);
    for (let i = 0; i < ORDER_RESET_TICKS - 1; i++)
      expect(flow.tickClock()).toEqual([]);
    expect(flow.tickClock()).toEqual(["lingerOver"]);
  });

  it("the deal: tag ratchets, shots reset, fresh order, fresh cadence", () => {
    const flow = new OrderFlow();
    flow.noteShot();
    flow.noteShot();
    expect(flow.shotsFired).toBe(2);
    // Walk one tick into the look cadence so a stale counter would show.
    flow.shouldLook();
    flow.order = { ...flow.order, ticksLeft: 1 };
    while (!flow.tickClock().includes("lingerOver")); // burn the linger
    flow.dealFresh(rungRow(2)); // the Room's answer at the boundary
    expect(flow.deal).toBe(1); // in-flight shots now carry a stale tag
    expect(flow.shotsFired).toBe(0);
    expect(flow.order.status).toBe("running");
    expect(flow.order.ticksLeft).toBe(rungRow(2).clockSeconds * 60);
    // The fresh order's cadence starts over: no early look.
    let early = false;
    for (let i = 0; i < PATRON_LOOK_EVERY - 1; i++)
      if (flow.shouldLook()) early = true;
    expect(early).toBe(false);
  });
});
