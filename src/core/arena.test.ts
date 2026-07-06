/**
 * Arena geometry oracles — the radial tier law (plans/07 phase R). Round
 * tiers replaced the squares: a rest position counts by DISTANCE from the
 * cake's axis, so the old square's corner regions are honestly off the cake.
 */
import { describe, it, expect } from "vitest";
import {
  cakeSurface,
  CAKE_TIERS,
  CAKE_Z,
  distanceToCake,
  isInZone,
  isOnCake,
  tierOf,
} from "./arena";

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

/**
 * The two analytic oracles the conversion law stands on (plans/10 §2, §8):
 * distanceToCake is the proximity fuse AND the grip gate; cakeSurface is the
 * grip's skin point + outward normal. Both are pure sqrt/mul/add — the
 * cross-engine-exact functions that most deserve direct pins.
 */
describe("distanceToCake (proximity fuse + grip gate)", () => {
  it("is zero inside any tier", () => {
    expect(distanceToCake({ x: 0, y: 1, z: CAKE_Z })).toBe(0); // tier-0 core
    expect(distanceToCake({ x: 0, y: 4.5, z: CAKE_Z })).toBe(0); // tier-2 core
  });

  it("is the perpendicular gap to the nearest skin, outside", () => {
    // 1m beyond the tier-0 wall, level with it.
    expect(distanceToCake({ x: 5, y: 1, z: CAKE_Z })).toBeCloseTo(1, 10);
    // 1m above the summit.
    expect(distanceToCake({ x: 0, y: 6, z: CAKE_Z })).toBeCloseTo(1, 10);
  });

  it("never negative; grows with distance", () => {
    const near = distanceToCake({ x: 4.5, y: 1, z: CAKE_Z });
    const far = distanceToCake({ x: 8, y: 1, z: CAKE_Z });
    expect(near).toBeGreaterThan(0);
    expect(far).toBeGreaterThan(near);
  });
});

describe("cakeSurface (grip skin point + outward normal)", () => {
  const near = (a: number, b: number): void => expect(a).toBeCloseTo(b, 6);

  it("projects a wall grip radially outward", () => {
    const s = cakeSurface({ x: 5, y: 1, z: CAKE_Z }); // beside the tier-0 wall
    near(s.point.x, 4); // clamped to radius 4
    near(s.point.y, 1);
    near(s.point.z, CAKE_Z);
    near(s.normal.x, 1); // radial +x
    near(s.normal.y, 0);
  });

  it("projects a top grip straight up (+y), never sideways", () => {
    const s = cakeSurface({ x: 0, y: 6, z: CAKE_Z }); // above the summit
    near(s.point.y, 5); // tier-2 top
    near(s.normal.x, 0);
    near(s.normal.y, 1);
    near(s.normal.z, 0);
  });

  it("interior penetration takes the SHALLOWER face — never a downward normal", () => {
    // Just under the tier-0 top (topPen 0.1 < wallPen 4): projects UP.
    const top = cakeSurface({ x: 0, y: 1.9, z: CAKE_Z });
    near(top.point.y, 2);
    near(top.normal.y, 1);
    // Just inside the tier-0 wall (wallPen 0.1 < topPen 1): projects OUT.
    const wall = cakeSurface({ x: 3.9, y: 1, z: CAKE_Z });
    near(wall.point.x, 4);
    near(wall.normal.x, 1);
    near(wall.normal.y, 0);
  });

  it("a returned skin point reads back onto the tier it came from", () => {
    // The record's pos IS the scoring truth — tierOf must accept it.
    const s = cakeSurface({ x: 0, y: 6, z: CAKE_Z });
    expect(distanceToCake(s.point)).toBeCloseTo(0, 6);
  });
});
