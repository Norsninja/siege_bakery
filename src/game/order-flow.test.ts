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
  FLOOR_COVERAGE,
  ORDER_RESET_TICKS,
  ORDER_SECONDS,
  PATRON_LOOK_EVERY,
  SPRINKLES_NEEDED,
} from "./tuning";

describe("requirementsFor (the per-rung ticket, slice 4)", () => {
  it("rung 3 IS today's standing order — the anchor, verbatim", () => {
    expect(requirementsFor(rungRow(3))).toEqual([
      // The frost FLOOR is absolute + flat now (plans/22 step 4): a share of
      // the WHOLE cake, no towns/labor denominator (geometry scales it).
      { kind: "frost-coverage", floorCoverage: FLOOR_COVERAGE },
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
    expect(rows[0]).toMatchObject({ kind: "frost-coverage", floorCoverage: FLOOR_COVERAGE });
  });

  it("NO crown row deals on any rung — the flourish amendment (slice 4 ships crown-shelved)", () => {
    for (let rung = 1; rung <= 7; rung++)
      expect(requirementsFor(rungRow(rung)).some((r) => r.kind === "crown")).toBe(
        false,
      );
  });
});

describe("THE LONE HERO AMENDMENT (plans/13 §5) — labor scales the GRAINS now", () => {
  it("DECISION PIN: labor [—, 0.35, 1, 1, 1] — never zero, never a bonus", () => {
    // NARROWED by the absolute flip (plans/22 step 4): CREW_LABOR no longer
    // scales coverage (the frost floor is flat + absolute) — it survives
    // ONLY as the sprinkle-grain scaler. [1] = 0.35 held from the old frost
    // derivation, PROVISIONAL for grains; step 6 re-derives solo relief.
    expect(CREW_LABOR).toEqual([0, 0.35, 1.0, 1.0, 1.0]);
  });

  it("one pair of hands scales ONLY the grains by labor — the frost floor is flat", () => {
    const solo = requirementsFor(rungRow(3), 1); // crew 1
    // The frost floor is town/labor-independent now (plans/22 step 4).
    expect(solo[0]).toMatchObject({ kind: "frost-coverage", floorCoverage: FLOOR_COVERAGE });
    // Grains still scale by labor — 60 → 21, ceiled so a row never asks 0.
    expect(solo[1]).toMatchObject({
      topping: "sprinkles",
      needed: Math.ceil(SPRINKLES_NEEDED * CREW_LABOR[1]!), // 21
    });
  });

  it("crew 2+ deals today's grains VERBATIM — the friend test inherits zero drift", () => {
    expect(requirementsFor(rungRow(3), 2)).toEqual(requirementsFor(rungRow(3)));
    expect(requirementsFor(rungRow(3), 4)).toEqual(requirementsFor(rungRow(3)));
  });

  it("crew clamps BOTH ways: an empty room prices solo, a mob prices full labor", () => {
    // CREW_LABOR[0] is a guard, never indexed — labor 0 would deal a
    // born-met grain ask.
    expect(requirementsFor(rungRow(3), 0)).toEqual(requirementsFor(rungRow(3), 1));
    expect(requirementsFor(rungRow(3), 9)).toEqual(requirementsFor(rungRow(3), 2));
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

  it("THE CLOCK RELIEF (item 26 + addendum): solo relief is PER-RUNG — the tutorial's alone", () => {
    // The relief went per-rung when the flat 1.25 over-relieved rung 2
    // (addendum). Rung 1 STRETCHES (soloClock 1.25 — the tutorial);
    // rung 2+ does NOT (soloClock 1.0 — the honest row). The rows stay
    // verbatim (anchor law); both replicas read the broadcast ticksLeft.
    const flow = new OrderFlow();
    flow.activeCrew = 1;
    flow.dealFresh(rungRow(1));
    expect(rungRow(1).soloClock).toBe(1.25);
    expect(flow.order.ticksLeft).toBe(
      Math.round(rungRow(1).clockSeconds * 1.25 * 60),
    );
    // Rung 3 (the anchor) solo now runs the honest row — no stretch.
    flow.dealFresh(rungRow(3));
    expect(rungRow(3).soloClock).toBe(1.0);
    expect(flow.order.ticksLeft).toBe(ORDER_SECONDS * 60);
    expect(rungRow(3).clockSeconds).toBe(ORDER_SECONDS); // the row, verbatim
    // Crew 2+: ZERO drift — duo reads a flat 1.0 whatever the rung, so
    // even rung 1's tutorial relief never touches the friend test's duo.
    flow.activeCrew = 2;
    flow.dealFresh(rungRow(1));
    expect(flow.order.ticksLeft).toBe(rungRow(1).clockSeconds * 60);
    // activeCrew 0 clamps to solo (an empty room prices the lone hero),
    // exactly as CREW_LABOR does — rung 1's relief applies.
    flow.activeCrew = 0;
    flow.dealFresh(rungRow(1));
    expect(flow.order.ticksLeft).toBe(
      Math.round(rungRow(1).clockSeconds * 1.25 * 60),
    );
  });

  it("THE CLOCK RELIEF (item 26 menu b): rung 1 carries real tutorial slack", () => {
    // "A fumbling first-timer feeds the ogre while learning the winch" —
    // 180 s territory + the 1.25 solo stretch, ruled. Rung 1 is NOT the
    // anchor; the row edit is legal, and pressure is rung 2+'s job
    // (rung 2 still says 210, and its solo factor is the honest 1.0).
    expect(rungRow(1).clockSeconds).toBe(180);
    expect(rungRow(1).soloClock).toBe(1.25);
    expect(rungRow(2).clockSeconds).toBe(210);
    expect(rungRow(2).soloClock).toBe(1.0);
  });

  it("par picks the duo column when the second town is active", () => {
    const flow = new OrderFlow();
    flow.activeTowns = 2;
    flow.dealFresh(rungRow(3));
    expect(flow.order.parShots).toBe(rungRow(3).parShots.duo);
    // The frost floor is town-independent now (plans/22 step 4): the second
    // town buys par workload + reach, never a higher coverage bar.
    expect(flow.order.requirements[0]).toMatchObject({
      kind: "frost-coverage",
      floorCoverage: FLOOR_COVERAGE,
    });
  });

  it("the deal prices activeCrew and stamps the ticket — the RUNNING order keeps its labor", () => {
    const flow = new OrderFlow();
    // A bare flow prices full labor (pre-amendment numbers, hands 2).
    expect(flow.order.hands).toBe(2);
    flow.activeCrew = 1;
    flow.dealFresh(rungRow(3));
    expect(flow.order.hands).toBe(1);
    expect(flow.order.requirements).toEqual(requirementsFor(rungRow(3), 1));
    // A joiner mid-order never retro-changes the ticket (towns law
    // verbatim): the ask follows at the NEXT deal.
    flow.activeCrew = 2;
    expect(flow.order.hands).toBe(1);
    expect(flow.order.requirements).toEqual(requirementsFor(rungRow(3), 1));
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
