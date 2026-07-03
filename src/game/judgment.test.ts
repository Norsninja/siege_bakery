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
