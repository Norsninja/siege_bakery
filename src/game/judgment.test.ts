/**
 * Gate 1 law: rows count what came to REST, where it came to rest.
 * Positions are real arena coordinates — the cake top sits at y ≈ 3,
 * CAKE_POS {0, 1.5, -30}, peak = the center 3×3 m of the top.
 */
import { describe, it, expect } from "vitest";
import { CAKE_POS, isInZone } from "../core/arena";
import {
  checkRequirements,
  describeRequirement,
  judge,
  type Requirement,
  type SettledTopping,
} from "./judgment";

const yTop = CAKE_POS.y + 1.6; // resting on the top surface
const at = (topping: string, x: number, z: number, onCake = true): SettledTopping => ({
  topping,
  pos: { x, y: onCake ? yTop : 0.35, z },
  onCake,
});

const CHERRIES_2: Requirement = { kind: "count-on-cake", topping: "cherry", needed: 2 };
const LIME_PEAK: Requirement = { kind: "count-in-zone", topping: "lime", zone: "peak", needed: 1 };

describe("zones", () => {
  it("peak is the bullseye: on the cake AND inside the center square", () => {
    expect(isInZone("peak", { x: 0.5, y: yTop, z: CAKE_POS.z - 0.5 })).toBe(true);
    expect(isInZone("peak", { x: 3.5, y: yTop, z: CAKE_POS.z })).toBe(false); // on cake, off center
    expect(isInZone("peak", { x: 0, y: 0.35, z: CAKE_POS.z })).toBe(false); // center column, on the floor
    expect(isInZone("cake", { x: 3.5, y: yTop, z: CAKE_POS.z })).toBe(true);
  });
});

describe("checkRequirements", () => {
  it("counts matching toppings at rest on the cake; wrong topping and floor count nothing", () => {
    const settled = [
      at("cherry", 0, CAKE_POS.z),
      at("cherry", 3, CAKE_POS.z + 2),
      at("lime", 1, CAKE_POS.z), // wrong topping for this row
      at("cherry", 0, -20, false), // rolled off — the patron gets nothing
    ];
    const [c] = checkRequirements([CHERRIES_2], settled);
    expect(c?.current).toBe(2);
    expect(c?.met).toBe(true);
  });

  it("a zone row demands the zone: on-cake-but-off-center is not DEAD CENTER", () => {
    const offCenter = [at("lime", 3.5, CAKE_POS.z)];
    expect(checkRequirements([LIME_PEAK], offCenter)[0]?.met).toBe(false);
    const dead = [at("lime", 0.4, CAKE_POS.z - 0.4)];
    const [c] = checkRequirements([LIME_PEAK], dead);
    expect(c?.current).toBe(1);
    expect(c?.met).toBe(true);
  });

  it("every row reports progress toward its own target", () => {
    const checks = checkRequirements(
      [CHERRIES_2, LIME_PEAK],
      [at("cherry", 1, CAKE_POS.z)],
    );
    expect(checks.map((c) => [c.current, c.target, c.met])).toEqual([
      [1, 2, false],
      [0, 1, false],
    ]);
  });

  it("rows speak the checklist's language", () => {
    expect(describeRequirement(CHERRIES_2)).toBe("2 × cherry ON the cake");
    expect(describeRequirement(LIME_PEAK)).toBe("1 × lime DEAD CENTER");
  });
});

describe("judge — the two gates on today's axes (mess + waste)", () => {
  const order = { requirements: [CHERRIES_2], parShots: 6, passScore: 50 };
  const clean = [at("cherry", 0, CAKE_POS.z), at("cherry", 2, CAKE_POS.z)];

  it("a clean bake under par: met, accepted, full marks, three stars", () => {
    const j = judge(order, clean, 2);
    expect(j).toMatchObject({ met: true, accepted: true, score: 100, stars: 3 });
    expect(j.mess).toBe(0);
    expect(j.waste).toBe(1);
  });

  it("gate 1 fails when a row is unmet — hungry, no stars, whatever the score", () => {
    const j = judge(order, [at("cherry", 0, CAKE_POS.z)], 1);
    expect(j.met).toBe(false);
    expect(j.accepted).toBe(false);
    expect(j.stars).toBe(0);
  });

  it("mess drags the score: every floor topping stings, whatever it is", () => {
    const j = judge(order, [...clean, at("lime", 0, -20, false), at("lime", 1, -20, false)], 4);
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
      [...clean, ...Array.from({ length: 8 }, (_, i) => at("cherry", i, -20, false))],
      30,
    );
    expect(hosed.met).toBe(true); // every box ticked...
    expect(hosed.accepted).toBe(false); // ...REFUSED, the insulting kind
  });
});
