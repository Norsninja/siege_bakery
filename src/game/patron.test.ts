/**
 * The Giant's rule list, pinned. Behavior trees are deterministic — state
 * in, demand out — so every rule gets a scripted context. Ported rules and
 * lessons from the 2D lab: the prevMess grudge fix, tighten-once, urgency
 * before whimsy.
 */
import { describe, it, expect } from "vitest";
import { FrostingField } from "../core/frosting";
import { createGiant, type PatronContext } from "./patron";
import { createOrder, type OrderState } from "./order";
import { checkRequirements, type Requirement } from "./judgment";

const rows = (): Requirement[] => [
  { kind: "count-on-cake", topping: "cherry", needed: 2 },
  { kind: "count-in-zone", topping: "lime", zone: "tier2", needed: 1 },
];

/** Context builder: checks derive from the order's live rows + a fake
 * census expressed as per-row current counts. */
function ctx(
  order: OrderState,
  currents: number[],
  over: Partial<PatronContext> = {},
): PatronContext {
  const checks = checkRequirements(
    order.requirements,
    [],
    new FrostingField(),
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
    // A crown row already exists so the demand rule stays quiet and the
    // nag's own law is what's under test.
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

  it("half the boxes ticked and no crown promised → the crown demand, once", () => {
    const g = createGiant();
    const order = createOrder(rows(), 5400);
    const act = g.act(ctx(order, [2, 0])); // cherry row met, lime not
    expect(act.utterance).toContain("CHERRY");
    expect(act.utterance).toContain("ON THE VERY TOP");
    expect(order.requirements).toHaveLength(3);
    const added = order.requirements[2];
    expect(added).toEqual({ kind: "crown", topping: "cherry" });
    // Never twice — and never when a crown row already exists.
    const again = g.act(ctx(order, [2, 0, 0]));
    expect(order.requirements).toHaveLength(3);
    expect(again.utterance).not.toContain("NEEDS A CHERRY");
  });

  it("the crown demand normalizes per row — fractions can't poison the arithmetic", () => {
    const g = createGiant();
    const honest = (): Requirement[] => [
      { kind: "frost-coverage", frac: 0.3 },
      { kind: "on-frosting", topping: "sprinkles", needed: 3 },
    ];
    const order = createOrder(honest(), 5400);
    // Frost 80% of the way, no sprinkles: 0.8 + 0 of 2 rows — not half done.
    // (Raw sums would read 0.24 of 3.3 asked and never fire at all.)
    const early = g.act(ctx(order, [0.24, 0], { look: 1 }));
    expect(early.utterance).not.toContain("NEEDS A CHERRY");
    // Frost row met + one sprinkle: 1 + ⅓ ≥ half of 2 rows → the demand,
    // and it appends the ONLY cherry row that ever exists (one-number law).
    const act = g.act(ctx(order, [0.3, 1], { look: 1 }));
    expect(act.utterance).toContain("ON THE VERY TOP");
    expect(order.requirements[order.requirements.length - 1]).toEqual({
      kind: "crown",
      topping: "cherry",
    });
  });

  it("clock low + a box empty → a reminder that NAMES the row", () => {
    const g = createGiant();
    // A crown row already exists, so the demand rule stays quiet and
    // urgency gets its turn (rule order is the tree).
    const order = createOrder(
      [...rows(), { kind: "crown", topping: "cherry" }],
      5400,
    );
    const act = g.act(ctx(order, [2, 1, 0], { look: 1, secondsLeft: 20 }));
    expect(act.utterance).toContain("DO NOT FORGET");
    expect(act.utterance).toContain("cherry AS THE CROWN");
    expect(act.patienceDeltaSeconds).toBe(-2);
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
