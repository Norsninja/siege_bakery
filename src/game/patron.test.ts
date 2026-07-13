/**
 * The Giant's rule list, pinned. Behavior trees are deterministic — state
 * in, demand out — so every rule gets a scripted context. Ported rules and
 * lessons from the 2D lab: the prevMess grudge fix, tighten-once, urgency
 * before whimsy.
 */
import { describe, it, expect } from "vitest";
import { CAKE_3, dessertGeometry } from "../core/dessert";
import { buildCensus, FrostingField } from "../core/frosting";
import { createGiant, type PatronContext } from "./patron";
import { createOrder, type OrderState } from "./order";
import { checkRequirements, type Requirement } from "./judgment";

// The spec refactor (plans/13 §3): zones are tier INDICES now, and the
// rules see the deal's geometry — cake-3 here, the anchor row.
const GEOM = dessertGeometry(CAKE_3);

const rows = (): Requirement[] => [
  { kind: "count-on-cake", topping: "cherry", needed: 2 },
  { kind: "count-in-zone", topping: "lime", zone: 1, needed: 1 },
];

/** Context builder: checks derive from the order's live rows + a fake
 * census expressed as per-row current counts. */
function ctx(
  order: OrderState,
  currents: number[],
  over: Partial<PatronContext> = {},
): PatronContext {
  const checks = checkRequirements(
    GEOM,
    order.requirements,
    [],
    new FrostingField(buildCensus(CAKE_3)),
  ).map((c, i) => {
    const current = currents[i] ?? 0;
    return { ...c, current, met: current >= c.target };
  });
  return {
    order,
    checks,
    mess: 0,
    prevMess: 0,
    secondsLeft: 60,
    look: 0,
    topTier: GEOM.topTier,
    rng: () => 0.9, // no whims unless a test injects one
    ...over,
  };
}

describe("The Giant", () => {
  it("thunders at NEW mess only — a standing spill is not a grudge", () => {
    const g = createGiant();
    const fresh = g.act(ctx(createOrder(rows(), 5400), [0, 0], { mess: 0.4, prevMess: 0.1 }));
    expect(fresh.utterance).toContain("FLOOR");
    expect(fresh.patienceDeltaSeconds).toBeLessThan(0);
    const standing = g.act(ctx(createOrder(rows(), 5400), [0, 0], { mess: 0.4, prevMess: 0.39 }));
    expect(standing.utterance).not.toContain("FLOOR");
  });

  it("tightens a stalled row ONCE, in place, from the third look — but only while another row is met", () => {
    const g = createGiant();
    // The crown row is a valid (4b flourish) kind the nag must SKIP —
    // only COUNT rows tighten; there is no such thing as more crown.
    const order = createOrder(
      [...rows(), { kind: "crown", topping: "cherry" }],
      5400,
    );
    const early = g.act(ctx(order, [0, 1, 0], { look: 1 }));
    expect(early.utterance).not.toContain("MORE");
    // Nothing met at all → no nag, however stalled (the O2 guard: with the
    // honest order, a later row is RATIONALLY zero while the first goes
    // down — an unguarded nag fired every game like a tax).
    const untouched = g.act(ctx(order, [0, 0, 0], { look: 2 }));
    expect(untouched.utterance).not.toContain("MORE");
    // Lime row met, cherry row stalled → the nag, once.
    const nag = g.act(ctx(order, [0, 1, 0], { look: 2 }));
    expect(nag.utterance).toBe("MORE. CHERRY.");
    const r0 = order.requirements[0];
    expect(r0?.kind === "count-on-cake" && r0.needed).toBe(3); // the row itself tightened
    const again = g.act(ctx(order, [0, 1, 0], { look: 3 }));
    expect(again.utterance).not.toContain("MORE"); // he only tightens once
    expect(r0?.kind === "count-on-cake" && r0.needed).toBe(3);
  });

  it("the crown demand is SHELVED — no rule ever appends a row (flourish amendment, plans/13 §1)", () => {
    // Rule 3 (the progress-triggered REQUIRED crown) was condemned by the
    // flourish amendment: a demand that appends a requirement punishes
    // good play. The cherry returns in 4b as an optional DESIRE. Until
    // then: no context, however dressed, grows the requirements list.
    const g = createGiant();
    const cherryless: Requirement[] = [
      { kind: "count-on-cake", topping: "sprinkles", needed: 2 },
      { kind: "count-in-zone", topping: "lime", zone: 1, needed: 1 },
    ];
    const order = createOrder(cherryless, 5400);
    const act = g.act(ctx(order, [2, 0])); // half done — the old trigger
    expect(order.requirements).toHaveLength(2); // nothing appended
    expect(act.utterance).not.toContain("NEEDS A CHERRY");
  });

  it("clock low + a box empty → a reminder that NAMES the row", () => {
    const g = createGiant();
    // A crown row rides along (a valid 4b-flourish kind) — urgency must
    // speak ITS words when it is the empty box (rule order is the tree).
    const order = createOrder(
      [...rows(), { kind: "crown", topping: "cherry" }],
      5400,
    );
    const act = g.act(ctx(order, [2, 1, 0], { look: 1, secondsLeft: 20 }));
    expect(act.utterance).toContain("DO NOT FORGET");
    expect(act.utterance).toContain("cherry AS THE CROWN");
    expect(act.patienceDeltaSeconds).toBe(-2);
  });

  it("THE REVEAL (slice 4b): coverage turns GREAT → he names his desire, once, as a gift", () => {
    const g = createGiant();
    const order = createOrder(
      [{ kind: "frost-coverage", floorCoverage: 0.08 }],
      5400,
      { desire: { topping: "cherry", revealed: false, met: false } },
    );
    // Below the 2★ tier (star2Coverage default 0.18): no reveal, however
    // many looks.
    const quiet = g.act(ctx(order, [0.1], { look: 1 }));
    expect(quiet.utterance).not.toContain("VERY TOP");
    expect(order.desire?.revealed).toBe(false);
    // The bar crossed (frost current IS absolute coverage now): the offer —
    // the flag flips IN PLACE (the 2D mutation law) and patience is
    // untouched (the offer invites style; it must not shorten the room).
    const offer = g.act(ctx(order, [0.25], { look: 2 }));
    expect(offer.utterance).toContain("A CHERRY. ON THE VERY TOP.");
    expect(offer.patienceDeltaSeconds).toBe(0);
    expect(order.desire?.revealed).toBe(true);
    // Revealed once: the next look moves on down the tree.
    const after = g.act(ctx(order, [0.25], { look: 3 }));
    expect(after.utterance).not.toContain("VERY TOP");
    // And it NEVER touches the requirements — the condemned rule 3
    // appended a row; the desire is a separate field, forever.
    expect(order.requirements).toHaveLength(1);
  });

  it("no desire on the order (rungs 1–2) → the reveal rule never fires", () => {
    const g = createGiant();
    const order = createOrder(
      [{ kind: "frost-coverage", floorCoverage: 0.08 }],
      5400,
    );
    const act = g.act(ctx(order, [0.95], { look: 2 }));
    expect(act.utterance).not.toContain("VERY TOP");
  });

  it("whims are rare and harmless; otherwise the fuse burns", () => {
    const g = createGiant();
    const order = createOrder(rows(), 5400);
    const whim = g.act(ctx(order, [1, 0], { look: 1, rng: () => 0.1 }));
    expect(whim.patienceDeltaSeconds).toBe(0);
    expect(whim.utterance).toContain("aaah");
    const grumble = g.act(ctx(order, [1, 0], { look: 1 }));
    expect(grumble.patienceDeltaSeconds).toBe(-4);
    expect(grumble.utterance.length).toBeGreaterThan(0);
  });
});
