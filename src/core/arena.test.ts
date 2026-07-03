/**
 * Arena geometry oracles — the radial tier law (plans/07 phase R). Round
 * tiers replaced the squares: a rest position counts by DISTANCE from the
 * cake's axis, so the old square's corner regions are honestly off the cake.
 */
import { describe, it, expect } from "vitest";
import { CAKE_TIERS, CAKE_Z, isInZone, isOnCake, tierOf } from "./arena";

const R1 = CAKE_TIERS[0]!.radius; // 4
const TOP1_Y = CAKE_TIERS[0]!.top + 0.3;
const TOP3_Y = CAKE_TIERS[2]!.top + 0.3;

describe("tierOf, radial (round tiers)", () => {
  it("counts by distance from the axis, not by square extents", () => {
    // Straight ahead at the rim: inside the circle.
    expect(tierOf({ x: 0, y: TOP1_Y, z: CAKE_Z + R1 - 0.1 })).toBe(0);
    // The old square's corner region: |x| and |z| both in range, but the
    // diagonal distance exceeds the radius — off the cake now.
    expect(tierOf({ x: 2.9, y: TOP1_Y, z: CAKE_Z + 2.9 })).toBeNull();
    expect(isOnCake({ x: 2.9, y: TOP1_Y, z: CAKE_Z + 2.9 })).toBe(false);
    // The same diagonal, pulled inside the radius: on.
    expect(tierOf({ x: 2.5, y: TOP1_Y, z: CAKE_Z + 2.5 })).toBe(0);
  });

  it("reads the TOPMOST tier whose disc holds the position", () => {
    expect(tierOf({ x: 0, y: TOP3_Y, z: CAKE_Z })).toBe(2);
    // On the tier-2 ledge ring (between radii 2.25 and 3).
    expect(tierOf({ x: 2.6, y: CAKE_TIERS[1]!.top + 0.3, z: CAKE_Z })).toBe(1);
  });

  it("zones follow the radial law", () => {
    expect(isInZone("tier1", { x: 3.5, y: TOP1_Y, z: CAKE_Z })).toBe(true);
    expect(isInZone("tier1", { x: 2.9, y: TOP1_Y, z: CAKE_Z + 2.9 })).toBe(false);
    expect(isInZone("cake", { x: 0, y: TOP3_Y, z: CAKE_Z })).toBe(true);
  });
});
