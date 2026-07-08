/**
 * Dessert geometry oracles — the radial tier law (plans/07 phase R), now
 * bound per spec (plans/13 §3). Round tiers replaced the squares: a rest
 * position counts by DISTANCE from the cake's axis, so the old square's
 * corner regions are honestly off the cake. Every pin here is CAKE-3's —
 * the anchor row — moved verbatim from arena.test.ts with the refactor
 * (the zero-drift proof: same inputs, same numbers, new door).
 */
import { describe, it, expect } from "vitest";
import { CAKE_Z } from "./arena";
import {
  CAKE_1,
  CAKE_2,
  CAKE_3,
  DESSERT_SPECS,
  dessertGeometry,
  specById,
  tierLabel,
} from "./dessert";

const g = dessertGeometry(CAKE_3);
const R1 = CAKE_3.tiers[0]!.radius; // 4
const TOP1_Y = CAKE_3.tiers[0]!.top + 0.3;
const TOP3_Y = CAKE_3.tiers[2]!.top + 0.3;

describe("tierOf, radial (round tiers)", () => {
  it("counts by distance from the axis, not by square extents", () => {
    // Straight ahead at the rim: inside the circle.
    expect(g.tierOf({ x: 0, y: TOP1_Y, z: CAKE_Z + R1 - 0.1 })).toBe(0);
    // The old square's corner region: |x| and |z| both in range, but the
    // diagonal distance exceeds the radius — off the cake now.
    expect(g.tierOf({ x: 2.9, y: TOP1_Y, z: CAKE_Z + 2.9 })).toBeNull();
    expect(g.isOnCake({ x: 2.9, y: TOP1_Y, z: CAKE_Z + 2.9 })).toBe(false);
    // The same diagonal, pulled inside the radius: on.
    expect(g.tierOf({ x: 2.5, y: TOP1_Y, z: CAKE_Z + 2.5 })).toBe(0);
  });

  it("reads the TOPMOST tier whose disc holds the position", () => {
    expect(g.tierOf({ x: 0, y: TOP3_Y, z: CAKE_Z })).toBe(2);
    // On the tier-2 ledge ring (between radii 2.25 and 3).
    expect(g.tierOf({ x: 2.6, y: CAKE_3.tiers[1]!.top + 0.3, z: CAKE_Z })).toBe(1);
  });

  it("zones follow the radial law (tier INDEX since the spec refactor)", () => {
    expect(g.isInZone(0, { x: 3.5, y: TOP1_Y, z: CAKE_Z })).toBe(true);
    expect(g.isInZone(0, { x: 2.9, y: TOP1_Y, z: CAKE_Z + 2.9 })).toBe(false);
    expect(g.isInZone("cake", { x: 0, y: TOP3_Y, z: CAKE_Z })).toBe(true);
    // A zone the spec doesn't have counts nothing — an authoring error
    // reads as an unmeetable row, never a crash.
    expect(g.isInZone(7, { x: 0, y: TOP3_Y, z: CAKE_Z })).toBe(false);
  });

  it("the summit index is the spec's, and the zone words reproduce cake-3's names", () => {
    expect(g.topTier).toBe(2);
    // The culprit-naming law: cake-3's beloved words, exactly (the old
    // ZONE_LABELS table, now a rule over N tiers).
    expect(tierLabel(0, g.topTier)).toBe("on the BOTTOM TIER");
    expect(tierLabel(1, g.topTier)).toBe("on the MIDDLE TIER");
    expect(tierLabel(2, g.topTier)).toBe("on the TOP TIER");
    // Taller stacks: bottom and top by name, interiors by ordinal.
    expect(tierLabel(0, 4)).toBe("on the BOTTOM TIER");
    expect(tierLabel(2, 4)).toBe("on TIER 3");
    expect(tierLabel(4, 4)).toBe("on the TOP TIER");
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
    expect(g.distanceToCake({ x: 0, y: 1, z: CAKE_Z })).toBe(0); // tier-0 core
    expect(g.distanceToCake({ x: 0, y: 4.5, z: CAKE_Z })).toBe(0); // tier-2 core
  });

  it("is the perpendicular gap to the nearest skin, outside", () => {
    // 1m beyond the tier-0 wall, level with it.
    expect(g.distanceToCake({ x: 5, y: 1, z: CAKE_Z })).toBeCloseTo(1, 10);
    // 1m above the summit.
    expect(g.distanceToCake({ x: 0, y: 6, z: CAKE_Z })).toBeCloseTo(1, 10);
  });

  it("never negative; grows with distance", () => {
    const near = g.distanceToCake({ x: 4.5, y: 1, z: CAKE_Z });
    const far = g.distanceToCake({ x: 8, y: 1, z: CAKE_Z });
    expect(near).toBeGreaterThan(0);
    expect(far).toBeGreaterThan(near);
  });
});

describe("cakeSurface (grip skin point + outward normal)", () => {
  const near = (a: number, b: number): void => expect(a).toBeCloseTo(b, 6);

  it("projects a wall grip radially outward", () => {
    const s = g.cakeSurface({ x: 5, y: 1, z: CAKE_Z }); // beside the tier-0 wall
    near(s.point.x, 4); // clamped to radius 4
    near(s.point.y, 1);
    near(s.point.z, CAKE_Z);
    near(s.normal.x, 1); // radial +x
    near(s.normal.y, 0);
  });

  it("projects a top grip straight up (+y), never sideways", () => {
    const s = g.cakeSurface({ x: 0, y: 6, z: CAKE_Z }); // above the summit
    near(s.point.y, 5); // tier-2 top
    near(s.normal.x, 0);
    near(s.normal.y, 1);
    near(s.normal.z, 0);
  });

  it("interior penetration takes the SHALLOWER face — never a downward normal", () => {
    // Just under the tier-0 top (topPen 0.1 < wallPen 4): projects UP.
    const top = g.cakeSurface({ x: 0, y: 1.9, z: CAKE_Z });
    near(top.point.y, 2);
    near(top.normal.y, 1);
    // Just inside the tier-0 wall (wallPen 0.1 < topPen 1): projects OUT.
    const wall = g.cakeSurface({ x: 3.9, y: 1, z: CAKE_Z });
    near(wall.point.x, 4);
    near(wall.normal.x, 1);
    near(wall.normal.y, 0);
  });

  it("a returned skin point reads back onto the tier it came from", () => {
    // The record's pos IS the scoring truth — tierOf must accept it.
    const s = g.cakeSurface({ x: 0, y: 6, z: CAKE_Z });
    expect(g.distanceToCake(s.point)).toBeCloseTo(0, 6);
  });
});

/**
 * The ladder's candidate rows (plans/13 §4 + the cupcake amendment) —
 * well-formedness only. Their DIFFICULTY numbers are the slice-3
 * measurements' business (the re-pin law); these pins just make a
 * malformed row impossible to author silently: the geometry oracles
 * assume base-at-ground, contiguous stacking, and strictly shrinking
 * radii (tierOf's topmost-disc scan reads through any violation wrong).
 */
describe("DESSERT_SPECS (the authored rows)", () => {
  it("ids are unique and specById round-trips", () => {
    const ids = DESSERT_SPECS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of DESSERT_SPECS) expect(specById(s.id)).toBe(s);
    expect(specById("cake-99")).toBeUndefined();
  });

  it("every row stacks: base at 0, contiguous tiers, strictly shrinking radii", () => {
    for (const s of DESSERT_SPECS) {
      expect(s.tiers.length).toBeGreaterThan(0);
      expect(s.tiers[0]!.bottom).toBe(0);
      for (let i = 0; i < s.tiers.length; i++) {
        const t = s.tiers[i]!;
        expect(t.top).toBeGreaterThan(t.bottom);
        expect(t.radius).toBeGreaterThan(0);
        if (i > 0) {
          expect(t.bottom).toBe(s.tiers[i - 1]!.top);
          expect(t.radius).toBeLessThan(s.tiers[i - 1]!.radius);
        }
      }
    }
  });

  it("cake-1/2 are the anchor's own lower tiers (structural, not copies)", () => {
    expect(CAKE_1.tiers[0]).toBe(CAKE_3.tiers[0]);
    expect(CAKE_2.tiers[1]).toBe(CAKE_3.tiers[1]);
    expect(CAKE_1.tiers).toHaveLength(1);
    expect(CAKE_2.tiers).toHaveLength(2);
  });

  it("every row binds: census non-empty, summit oracle reads the top tier", () => {
    for (const s of DESSERT_SPECS) {
      const geom = dessertGeometry(s);
      expect(geom.samples.length).toBeGreaterThan(0);
      const summit = s.tiers[s.tiers.length - 1]!;
      expect(geom.tierOf({ x: 0, y: summit.top + 0.3, z: CAKE_Z })).toBe(
        geom.topTier,
      );
    }
  });
});
