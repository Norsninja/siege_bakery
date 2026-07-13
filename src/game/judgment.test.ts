/**
 * Gate 1 law: rows count what came to REST, where it came to rest — and,
 * since the frosting slice (plans/07), what the frosting field says is
 * painted. Positions are real arena coordinates — the round tiers top out
 * at y 2 / 3.5 / 5 on CAKE_Z −30; a resting topping's center sits ~0.3
 * above the surface it lies on.
 */
import { describe, it, expect } from "vitest";
import { CAKE_Z } from "../core/arena";
import { CAKE_3, dessertGeometry } from "../core/dessert";
import { buildCensus, FrostingField } from "../core/frosting";
import { SPLAT_SPEED } from "../core/ballistics";
import {
  checkRequirements,
  crownedWith,
  describeProgress,
  describeRequirement,
  judge,
  type Requirement,
  type SettledTopping,
} from "./judgment";

// The spec refactor (plans/13 §3): the rules see the deal's geometry —
// cake-3 here, the anchor row; zones are tier INDICES now.
const GEOM = dessertGeometry(CAKE_3);
const TIERS = CAKE_3.tiers;
const SAMPLES = buildCensus(CAKE_3);

const LEDGE_Y = TIERS[0]!.top + 0.3; // resting on the bottom tier
const MID_Y = TIERS[1]!.top + 0.3; // resting on the middle-tier ledge
const TOP_Y = TIERS[2]!.top + 0.3; // resting on the summit

const at = (
  topping: string,
  x: number,
  y: number,
  onCake = true,
): SettledTopping => ({ topping, pos: { x, y, z: CAKE_Z }, onCake });

/** A cake nobody frosted. */
const naked = () => new FrostingField(SAMPLES);
/** A cake under one perfect uniform coat: coverage 1, neatness 1. */
const fullCoat = () => {
  const f = new FrostingField(SAMPLES);
  f.restore(new Array<number>(SAMPLES.length).fill(1));
  return f;
};

const CHERRIES_2: Requirement = { kind: "count-on-cake", topping: "cherry", needed: 2 };
const LIME_MID: Requirement = { kind: "count-in-zone", topping: "lime", zone: 1, needed: 1 };
const CROWN: Requirement = { kind: "crown", topping: "cherry" };
/** Frost HALF the whole cake — the absolute frost-floor fixture (plans/22
 * step 4; no of-potential denominator). */
const FROST_HALF: Requirement = { kind: "frost-coverage", floorCoverage: 0.5 };
const SPRINKLES_2: Requirement = { kind: "on-frosting", topping: "sprinkles", needed: 2 };

describe("zones are tiers", () => {
  it("each tier claims its own ledge; the floor claims nothing", () => {
    expect(GEOM.isInZone(2, { x: 0.5, y: TOP_Y, z: CAKE_Z - 0.5 })).toBe(true);
    expect(GEOM.isInZone("cake", { x: 0.5, y: TOP_Y, z: CAKE_Z - 0.5 })).toBe(true);
    expect(GEOM.isInZone(0, { x: 0.5, y: TOP_Y, z: CAKE_Z - 0.5 })).toBe(false);
    expect(GEOM.isInZone(0, { x: 3.5, y: LEDGE_Y, z: CAKE_Z })).toBe(true);
    expect(GEOM.isInZone(1, { x: 2.6, y: MID_Y, z: CAKE_Z })).toBe(true);
    expect(GEOM.isInZone("cake", { x: 0, y: 0.35, z: CAKE_Z + 5 })).toBe(false); // the floor
  });
});

describe("crownedWith (the desire's predicate — slice 4b, crown semantics as one function)", () => {
  it("true exactly when the crown holder is the named topping on the summit", () => {
    expect(crownedWith(GEOM, [at("cherry", 0, TOP_Y)], "cherry")).toBe(true);
    // On the cake but below the summit: the desire is placement, not presence.
    expect(crownedWith(GEOM, [at("cherry", 3.5, LEDGE_Y)], "cherry")).toBe(false);
    // Nothing settled at all.
    expect(crownedWith(GEOM, [], "cherry")).toBe(false);
  });

  it("decoy-proof both ways: a lime can usurp the summit but never impersonate the cherry", () => {
    // The lime lands HIGHER — it is the crown holder now, so the cherry
    // is not crowned (knock it away through play, the live-truth law)…
    const usurped = [at("cherry", 0, TOP_Y), at("lime", 0.2, TOP_Y + 0.4)];
    expect(crownedWith(GEOM, usurped, "cherry")).toBe(false);
    // …but a lime alone up there never reads as the cherry.
    expect(crownedWith(GEOM, [at("lime", 0, TOP_Y)], "cherry")).toBe(false);
  });

  it("garnish never crowns: a wild sprinkle atop the summit cannot usurp (plans/10 §3)", () => {
    const sprinkled = [at("cherry", 0, TOP_Y), at("sprinkles", 0.2, TOP_Y + 0.4)];
    expect(crownedWith(GEOM, sprinkled, "cherry")).toBe(true);
  });

  it("a floor cherry counts for nothing — on-cake is the gate", () => {
    expect(crownedWith(GEOM, [at("cherry", 8, 0.3, false)], "cherry")).toBe(false);
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
    const [c] = checkRequirements(GEOM, [CHERRIES_2], settled, naked());
    expect(c?.current).toBe(2);
    expect(c?.met).toBe(true);
  });

  it("a zone row demands its tier: on-cake-but-wrong-tier moves nothing", () => {
    const wrongTier = [at("lime", 3.5, LEDGE_Y)];
    expect(checkRequirements(GEOM, [LIME_MID], wrongTier, naked())[0]?.met).toBe(false);
    const [c] = checkRequirements(GEOM, [LIME_MID], [at("lime", 2.6, MID_Y)], naked());
    expect(c?.current).toBe(1);
    expect(c?.met).toBe(true);
  });

  it("every row reports progress toward its own target", () => {
    const checks = checkRequirements(GEOM, 
      [CHERRIES_2, LIME_MID],
      [at("cherry", 3.5, LEDGE_Y)],
      naked(),
    );
    expect(checks.map((c) => [c.current, c.target, c.met])).toEqual([
      [1, 2, false],
      [0, 1, false],
    ]);
  });

  it("rows speak the checklist's language", () => {
    expect(describeRequirement(CHERRIES_2, GEOM.topTier)).toBe("2 × cherry ON the cake");
    expect(describeRequirement(LIME_MID, GEOM.topTier)).toBe("1 × lime on the MIDDLE TIER");
    expect(describeRequirement(CROWN, GEOM.topTier)).toBe("1 × cherry AS THE CROWN");
    expect(describeRequirement(FROST_HALF, GEOM.topTier)).toBe("FROST 50% OF THE CAKE");
    expect(describeRequirement(SPRINKLES_2, GEOM.topTier)).toBe("2 × sprinkles ON THE FROSTING");
  });

  it("progress reads as one number: counts as counts, the fraction as percent", () => {
    const [frost, sprinkles] = checkRequirements(GEOM, 
      [FROST_HALF, SPRINKLES_2],
      [],
      naked(),
    );
    expect(describeProgress(frost!)).toBe("0%/50%");
    expect(describeProgress(sprinkles!)).toBe("0/2");
  });

  it("the current %% FLOORS — the numbers never claim done beside an ✗ (audit 2026-07-03)", () => {
    // met compares raw fractions; 0.4996 rounding up would read "✗ 50%/50%".
    const check = {
      req: FROST_HALF,
      current: 0.4996,
      target: 0.5,
      met: false,
    };
    expect(describeProgress(check)).toBe("49%/50%");
  });
});

describe("the frost row — the one fractional requirement (plans/07)", () => {
  it("current is the live covered fraction; met at the promised frac", () => {
    const field = naked();
    const [c0] = checkRequirements(GEOM, [FROST_HALF], [], field);
    expect(c0?.current).toBe(0);
    expect(c0?.met).toBe(false);
    // Paint every second sample: coverage ≥ 0.5, the promise kept.
    field.restore(SAMPLES.map((_, i) => (i % 2 === 0 ? 1 : 0)));
    const [c1] = checkRequirements(GEOM, [FROST_HALF], [], field);
    expect(c1?.current).toBeGreaterThanOrEqual(0.5);
    expect(c1?.met).toBe(true);
  });

  it("current is the RAW covered fraction — ABSOLUTE, never normalized (plans/22 step 4)", () => {
    // A quarter of the census painted reads ~0.25 — the whole-cake truth,
    // no of-potential rescaling. Against a low floor it passes.
    const row: Requirement = { kind: "frost-coverage", floorCoverage: 0.2 };
    const field = naked();
    field.restore(SAMPLES.map((_, i) => (i % 4 === 0 ? 1 : 0)));
    const [c] = checkRequirements(GEOM, [row], [], field);
    expect(c?.current).toBeGreaterThanOrEqual(0.24);
    expect(c?.current).toBeLessThan(0.26);
    expect(c?.met).toBe(true);
    // A steep floor the quarter-cake cannot reach.
    const steep: Requirement = { kind: "frost-coverage", floorCoverage: 0.5 };
    expect(checkRequirements(GEOM, [steep], [], field)[0]?.met).toBe(false);
  });
});

describe("on-frosting — sprinkles count only where frosting already is", () => {
  it("bare-cake sprinkles count nothing; paint under them lights them up", () => {
    const field = naked();
    const settled = [
      at("sprinkles", 0, TOP_Y), // summit, unpainted (yet)
      at("sprinkles", 3.5, LEDGE_Y), // bottom ledge, unpainted (yet)
      at("sprinkles", 8, 0.3, false), // the floor — never counts
    ];
    expect(checkRequirements(GEOM, [SPRINKLES_2], settled, field)[0]?.current).toBe(0);
    // A dollop on the summit: the summit sprinkle now sits on frosting.
    field.paint({ x: 0, y: TIERS[2]!.top, z: CAKE_Z }, SPLAT_SPEED - 1);
    expect(checkRequirements(GEOM, [SPRINKLES_2], settled, field)[0]?.current).toBe(1);
    // A dollop on the bottom ledge: both counted, the row met.
    field.paint({ x: 3.5, y: TIERS[0]!.top, z: CAKE_Z }, SPLAT_SPEED - 1);
    const [c] = checkRequirements(GEOM, [SPRINKLES_2], settled, field);
    expect(c?.current).toBe(2);
    expect(c?.met).toBe(true);
  });
});

describe("the crown — uppermost SOLID on the cake, resting on the summit", () => {
  it("a bare cake has no crown", () => {
    expect(checkRequirements(GEOM, [CROWN], [], naked())[0]?.met).toBe(false);
  });

  it("a cherry on the top tier with nothing above it IS the crown", () => {
    const [c] = checkRequirements(GEOM, 
      [CROWN],
      [at("cherry", 3.5, LEDGE_Y), at("cherry", 0, TOP_Y)],
      naked(),
    );
    expect(c?.current).toBe(1);
    expect(c?.met).toBe(true);
  });

  it("the summit must be claimed: the highest cherry on a LOWER tier is no crown", () => {
    expect(
      checkRequirements(GEOM, [CROWN], [at("cherry", 2.6, MID_Y)], naked())[0]?.met,
    ).toBe(false);
  });

  it("a usurper lime landing higher un-crowns the cherry — the decoy is a hazard", () => {
    const crowned = [at("cherry", 0, TOP_Y)];
    expect(checkRequirements(GEOM, [CROWN], crowned, naked())[0]?.met).toBe(true);
    // ...then a mis-grabbed lime settles ON TOP of the cherry (y +0.6).
    const usurped = [...crowned, at("lime", 0, TOP_Y + 0.6)];
    expect(checkRequirements(GEOM, [CROWN], usurped, naked())[0]?.met).toBe(false);
  });

  it("paint never crowns and never usurps (plans/07)", () => {
    // Frosting alone on the summit is not a crown...
    expect(
      checkRequirements(GEOM, [CROWN], [at("frosting", 0, TOP_Y)], naked())[0]?.met,
    ).toBe(false);
    // ...and a splash ABOVE the cherry does not void it — a splash cannot
    // be picked back up, so letting it usurp would be unrecoverable.
    const [c] = checkRequirements(GEOM, 
      [CROWN],
      [at("cherry", 0, TOP_Y), at("frosting", 0, TOP_Y + 0.6)],
      naked(),
    );
    expect(c?.met).toBe(true);
  });

  it("off-cake toppings cannot usurp, however high they lie", () => {
    const [c] = checkRequirements(GEOM, 
      [CROWN],
      [
        at("cherry", 0, TOP_Y),
        at("lime", 8, TOP_Y + 2, false), // atop the pantry, say — not the cake
      ],
      naked(),
    );
    expect(c?.met).toBe(true);
  });
});

describe("judge — the two gates, weights home (plans/07)", () => {
  const order = {
    requirements: [CHERRIES_2],
    parShots: 6,
    passScore: 50,
    star2Coverage: 0.18,
    star3Coverage: 0.35,
  };
  const clean = [at("cherry", 3.5, LEDGE_Y), at("cherry", 0, TOP_Y)];

  it("a frosted clean bake under par: met, accepted, full marks, three stars", () => {
    const j = judge(GEOM, order, clean, fullCoat(), 2);
    expect(j).toMatchObject({ met: true, accepted: true, score: 100, stars: 3 });
    expect(j.coverage).toBe(1);
    expect(j.neatness).toBe(1);
    expect(j.integrity).toBe(1); // the Bite's axis, waiting for its slice
    expect(j.mess).toBe(0);
    expect(j.waste).toBe(1);
  });

  it("a NAKED cake caps at 50 even played perfectly — frosting is 50% of the grade", () => {
    // 0.25 integrity + 0.15 tidy + 0.10 par = 0.50: borderline-accepted at
    // passScore 50, one grudging star. The patron wants his cake DRESSED.
    const j = judge(GEOM, order, clean, naked(), 2);
    expect(j.score).toBe(50);
    expect(j.stars).toBe(1);
  });

  it("gate 1 fails when a row is unmet — hungry, no stars, whatever the score", () => {
    const j = judge(GEOM, order, [at("cherry", 3.5, LEDGE_Y)], fullCoat(), 1);
    expect(j.met).toBe(false);
    expect(j.accepted).toBe(false);
    expect(j.stars).toBe(0);
  });

  it("mess drags the score: every floor delivery stings, whatever it is", () => {
    const j = judge(GEOM, 
      order,
      [...clean, at("lime", 8, 0.3, false), at("frosting", -8, 0.3, false)],
      fullCoat(),
      4,
    );
    expect(j.mess).toBe(0.5);
    expect(j.score).toBe(93); // 0.35 + 0.15 + 0.25 + 0.15·0.5 + 0.10
  });

  it("the coverage axis is ABSOLUTE and saturates at the 3★ tier (plans/22 step 4)", () => {
    // Half the WHOLE cake painted — past the 3★ tier (0.35), so the coverage
    // axis is maxed and the top star is earned, no of-potential rescaling.
    const field = naked();
    field.restore(SAMPLES.map((_, i) => (i % 2 === 0 ? 1 : 0)));
    const withRow = {
      ...order,
      requirements: [
        CHERRIES_2,
        { kind: "frost-coverage", floorCoverage: 0.08 } as Requirement,
      ],
    };
    const j = judge(GEOM, withRow, clean, field, 2);
    expect(j.coverage).toBeGreaterThanOrEqual(0.5);
    expect(j.score).toBe(100);
    expect(j.stars).toBe(3);
  });

  it("STARS come from the ABSOLUTE coverage tiers, not score arithmetic (plans/22 step 4)", () => {
    // floor 0.08, tiers 0.18 / 0.35: absolute coverage alone sets the star,
    // however cleanly it was played — a bigger cake makes each tier harder.
    const withRow = {
      ...order,
      requirements: [
        CHERRIES_2,
        { kind: "frost-coverage", floorCoverage: 0.08 } as Requirement,
      ],
    };
    const paintFraction = (fr: number) => {
      const f = naked();
      f.restore(SAMPLES.map((_, i) => (i / SAMPLES.length < fr ? 1 : 0)));
      return f;
    };
    expect(judge(GEOM, withRow, clean, paintFraction(0.12), 2).stars).toBe(1);
    expect(judge(GEOM, withRow, clean, paintFraction(0.25), 2).stars).toBe(2);
    expect(judge(GEOM, withRow, clean, paintFraction(0.45), 2).stars).toBe(3);
  });

  it("waste decays past par; a naked hosed-down bakery gets REFUSED", () => {
    const overPar = judge(GEOM, order, clean, fullCoat(), 12);
    expect(overPar.waste).toBe(0.5); // 6 par / 12 fired
    expect(overPar.score).toBe(95);
    const hosed = judge(GEOM, 
      order,
      [...clean, ...Array.from({ length: 8 }, (_, i) => at("cherry", i, 0.3, false))],
      naked(),
      30,
    );
    expect(hosed.met).toBe(true); // every box ticked...
    expect(hosed.accepted).toBe(false); // ...on a bare, littered cake. REFUSED.
  });
});

describe("grains (plans/10)", () => {
  it("grains never crown: a wild sprinkle atop the summit cannot usurp the cherry", () => {
    const settled = [
      at("cherry", 0, TOP_Y),
      // A burst grain came to rest ON the cherry — strictly higher.
      at("sprinkles", 0.05, TOP_Y + 0.35),
    ];
    const [check] = checkRequirements(GEOM, [CROWN], settled, fullCoat());
    expect(check!.met).toBe(true); // garnish is not a crown
    // The decoy law survives untouched: a LIME above still usurps.
    const usurped = checkRequirements(GEOM, 
      [CROWN],
      [...settled, at("lime", -0.05, TOP_Y + 0.6)],
      fullCoat(),
    );
    expect(usurped[0]!.met).toBe(false);
  });

  it("a burst weighs as ONE delivery in the mess arithmetic", () => {
    // 40 grains on the floor + 1 cherry on the cake: one wild pop is ONE
    // mistake against one good delivery — mess 0.5, not 40/41.
    const wildBurst = Array.from({ length: 40 }, (_, i) =>
      at("sprinkles", 8 + i * 0.1, 0.05, false),
    );
    const v = judge(GEOM, 
      {
        requirements: [FROST_HALF],
        parShots: 6,
        passScore: 50,
        star2Coverage: 0.18,
        star3Coverage: 0.35,
      },
      [...wildBurst, at("cherry", 0, TOP_Y)],
      fullCoat(),
      2,
    );
    expect(v.mess).toBeCloseTo(0.5, 10);
  });
});

