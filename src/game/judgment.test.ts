/**
 * Gate 1 law: rows count what came to REST, where it came to rest.
 * Positions are real arena coordinates — the Test Cake's tiers top out at
 * y 2 / 3.5 / 5 on CAKE_Z −30 (plans/05); a resting topping's center sits
 * ~0.3 above the surface it lies on.
 */
import { describe, it, expect } from "vitest";
import { CAKE_TIERS, CAKE_Z, isInZone } from "../core/arena";
import {
  checkRequirements,
  describeRequirement,
  judge,
  type Requirement,
  type SettledTopping,
} from "./judgment";

const LEDGE_Y = CAKE_TIERS[0]!.top + 0.3; // resting on the bottom tier
const MID_Y = CAKE_TIERS[1]!.top + 0.3; // resting on the middle-tier ledge
const TOP_Y = CAKE_TIERS[2]!.top + 0.3; // resting on the summit

const at = (
  topping: string,
  x: number,
  y: number,
  onCake = true,
): SettledTopping => ({ topping, pos: { x, y, z: CAKE_Z }, onCake });

const CHERRIES_2: Requirement = { kind: "count-on-cake", topping: "cherry", needed: 2 };
const LIME_MID: Requirement = { kind: "count-in-zone", topping: "lime", zone: "tier2", needed: 1 };
const CROWN: Requirement = { kind: "crown", topping: "cherry" };

describe("zones are tiers", () => {
  it("each tier claims its own ledge; the floor claims nothing", () => {
    expect(isInZone("tier3", { x: 0.5, y: TOP_Y, z: CAKE_Z - 0.5 })).toBe(true);
    expect(isInZone("cake", { x: 0.5, y: TOP_Y, z: CAKE_Z - 0.5 })).toBe(true);
    expect(isInZone("tier1", { x: 0.5, y: TOP_Y, z: CAKE_Z - 0.5 })).toBe(false);
    expect(isInZone("tier1", { x: 3.5, y: LEDGE_Y, z: CAKE_Z })).toBe(true);
    expect(isInZone("tier2", { x: 2.6, y: MID_Y, z: CAKE_Z })).toBe(true);
    expect(isInZone("cake", { x: 0, y: 0.35, z: CAKE_Z + 5 })).toBe(false); // the floor
  });
});

describe("checkRequirements", () => {
  it("counts matching toppings at rest on the cake; wrong topping and floor count nothing", () => {
    const settled = [
      at("cherry", 3.5, LEDGE_Y),
      at("cherry", 0, TOP_Y),
      at("lime", 2.6, MID_Y), // wrong topping for this row
      at("cherry", 8, 0.3, false), // rolled off — the patron gets nothing
    ];
    const [c] = checkRequirements([CHERRIES_2], settled);
    expect(c?.current).toBe(2);
    expect(c?.met).toBe(true);
  });

  it("a zone row demands its tier: on-cake-but-wrong-tier moves nothing", () => {
    const wrongTier = [at("lime", 3.5, LEDGE_Y)];
    expect(checkRequirements([LIME_MID], wrongTier)[0]?.met).toBe(false);
    const [c] = checkRequirements([LIME_MID], [at("lime", 2.6, MID_Y)]);
    expect(c?.current).toBe(1);
    expect(c?.met).toBe(true);
  });

  it("every row reports progress toward its own target", () => {
    const checks = checkRequirements(
      [CHERRIES_2, LIME_MID],
      [at("cherry", 3.5, LEDGE_Y)],
    );
    expect(checks.map((c) => [c.current, c.target, c.met])).toEqual([
      [1, 2, false],
      [0, 1, false],
    ]);
  });

  it("rows speak the checklist's language", () => {
    expect(describeRequirement(CHERRIES_2)).toBe("2 × cherry ON the cake");
    expect(describeRequirement(LIME_MID)).toBe("1 × lime on the MIDDLE TIER");
    expect(describeRequirement(CROWN)).toBe("1 × cherry AS THE CROWN");
  });
});

describe("the crown — uppermost on the cake, resting on the summit", () => {
  it("a bare cake has no crown", () => {
    expect(checkRequirements([CROWN], [])[0]?.met).toBe(false);
  });

  it("a cherry on the top tier with nothing above it IS the crown", () => {
    const [c] = checkRequirements([CROWN], [
      at("cherry", 3.5, LEDGE_Y),
      at("cherry", 0, TOP_Y),
    ]);
    expect(c?.current).toBe(1);
    expect(c?.met).toBe(true);
  });

  it("the summit must be claimed: the highest cherry on a LOWER tier is no crown", () => {
    const [c] = checkRequirements([CROWN], [at("cherry", 2.6, MID_Y)]);
    expect(c?.met).toBe(false);
  });

  it("a usurper lime landing higher un-crowns the cherry — the decoy is a hazard", () => {
    const crowned = [at("cherry", 0, TOP_Y)];
    expect(checkRequirements([CROWN], crowned)[0]?.met).toBe(true);
    // ...then a mis-grabbed lime settles ON TOP of the cherry (y +0.6).
    const usurped = [...crowned, at("lime", 0, TOP_Y + 0.6)];
    expect(checkRequirements([CROWN], usurped)[0]?.met).toBe(false);
  });

  it("off-cake toppings cannot usurp, however high they lie", () => {
    const [c] = checkRequirements([CROWN], [
      at("cherry", 0, TOP_Y),
      at("lime", 8, TOP_Y + 2, false), // atop the pantry, say — not the cake
    ]);
    expect(c?.met).toBe(true);
  });
});

describe("judge — the two gates on today's axes (mess + waste)", () => {
  const order = { requirements: [CHERRIES_2], parShots: 6, passScore: 50 };
  const clean = [at("cherry", 3.5, LEDGE_Y), at("cherry", 0, TOP_Y)];

  it("a clean bake under par: met, accepted, full marks, three stars", () => {
    const j = judge(order, clean, 2);
    expect(j).toMatchObject({ met: true, accepted: true, score: 100, stars: 3 });
    expect(j.mess).toBe(0);
    expect(j.waste).toBe(1);
  });

  it("gate 1 fails when a row is unmet — hungry, no stars, whatever the score", () => {
    const j = judge(order, [at("cherry", 3.5, LEDGE_Y)], 1);
    expect(j.met).toBe(false);
    expect(j.accepted).toBe(false);
    expect(j.stars).toBe(0);
  });

  it("mess drags the score: every floor topping stings, whatever it is", () => {
    const j = judge(
      order,
      [...clean, at("lime", 8, 0.3, false), at("lime", -8, 0.3, false)],
      4,
    );
    expect(j.mess).toBe(0.5);
    expect(j.score).toBe(70); // 0.6·(1−0.5) + 0.4·1 → met, 2 stars (≥65)
    expect(j.stars).toBe(2);
  });

  it("waste decays past par; enough of it gets the cake REFUSED", () => {
    const overPar = judge(order, clean, 12);
    expect(overPar.waste).toBe(0.5); // 6 par / 12 fired
    expect(overPar.score).toBe(80);
    const hosed = judge(
      order,
      [...clean, ...Array.from({ length: 8 }, (_, i) => at("cherry", i, 0.3, false))],
      30,
    );
    expect(hosed.met).toBe(true); // every box ticked...
    expect(hosed.accepted).toBe(false); // ...REFUSED, the insulting kind
  });
});
