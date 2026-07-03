/**
 * Gate 1 law: rows count what came to REST, where it came to rest — and,
 * since the frosting slice (plans/07), what the frosting field says is
 * painted. Positions are real arena coordinates — the round tiers top out
 * at y 2 / 3.5 / 5 on CAKE_Z −30; a resting topping's center sits ~0.3
 * above the surface it lies on.
 */
import { describe, it, expect } from "vitest";
import { CAKE_TIERS, CAKE_Z, isInZone } from "../core/arena";
import { CAKE_SAMPLES, FrostingField } from "../core/frosting";
import { SPLAT_SPEED } from "../core/ballistics";
import {
  checkRequirements,
  describeProgress,
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

/** A cake nobody frosted. */
const naked = () => new FrostingField();
/** A cake under one perfect uniform coat: coverage 1, neatness 1. */
const fullCoat = () => {
  const f = new FrostingField();
  f.restore(new Array<number>(CAKE_SAMPLES.length).fill(1));
  return f;
};

const CHERRIES_2: Requirement = { kind: "count-on-cake", topping: "cherry", needed: 2 };
const LIME_MID: Requirement = { kind: "count-in-zone", topping: "lime", zone: "tier2", needed: 1 };
const CROWN: Requirement = { kind: "crown", topping: "cherry" };
const FROST_HALF: Requirement = { kind: "frost-coverage", frac: 0.5 };
const SPRINKLES_2: Requirement = { kind: "on-frosting", topping: "sprinkles", needed: 2 };

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
    const [c] = checkRequirements([CHERRIES_2], settled, naked());
    expect(c?.current).toBe(2);
    expect(c?.met).toBe(true);
  });

  it("a zone row demands its tier: on-cake-but-wrong-tier moves nothing", () => {
    const wrongTier = [at("lime", 3.5, LEDGE_Y)];
    expect(checkRequirements([LIME_MID], wrongTier, naked())[0]?.met).toBe(false);
    const [c] = checkRequirements([LIME_MID], [at("lime", 2.6, MID_Y)], naked());
    expect(c?.current).toBe(1);
    expect(c?.met).toBe(true);
  });

  it("every row reports progress toward its own target", () => {
    const checks = checkRequirements(
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
    expect(describeRequirement(CHERRIES_2)).toBe("2 × cherry ON the cake");
    expect(describeRequirement(LIME_MID)).toBe("1 × lime on the MIDDLE TIER");
    expect(describeRequirement(CROWN)).toBe("1 × cherry AS THE CROWN");
    expect(describeRequirement(FROST_HALF)).toBe("FROST 50% OF THE CAKE");
    expect(describeRequirement(SPRINKLES_2)).toBe("2 × sprinkles ON THE FROSTING");
  });

  it("progress reads as one number: counts as counts, the fraction as percent", () => {
    const [frost, sprinkles] = checkRequirements(
      [FROST_HALF, SPRINKLES_2],
      [],
      naked(),
    );
    expect(describeProgress(frost!)).toBe("0%/50%");
    expect(describeProgress(sprinkles!)).toBe("0/2");
  });
});

describe("the frost row — the one fractional requirement (plans/07)", () => {
  it("current is the live covered fraction; met at the promised frac", () => {
    const field = naked();
    const [c0] = checkRequirements([FROST_HALF], [], field);
    expect(c0?.current).toBe(0);
    expect(c0?.met).toBe(false);
    // Paint every second sample: coverage ≥ 0.5, the promise kept.
    field.restore(CAKE_SAMPLES.map((_, i) => (i % 2 === 0 ? 1 : 0)));
    const [c1] = checkRequirements([FROST_HALF], [], field);
    expect(c1?.current).toBeGreaterThanOrEqual(0.5);
    expect(c1?.met).toBe(true);
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
    expect(checkRequirements([SPRINKLES_2], settled, field)[0]?.current).toBe(0);
    // A dollop on the summit: the summit sprinkle now sits on frosting.
    field.paint({ x: 0, y: CAKE_TIERS[2]!.top, z: CAKE_Z }, SPLAT_SPEED - 1);
    expect(checkRequirements([SPRINKLES_2], settled, field)[0]?.current).toBe(1);
    // A dollop on the bottom ledge: both counted, the row met.
    field.paint({ x: 3.5, y: CAKE_TIERS[0]!.top, z: CAKE_Z }, SPLAT_SPEED - 1);
    const [c] = checkRequirements([SPRINKLES_2], settled, field);
    expect(c?.current).toBe(2);
    expect(c?.met).toBe(true);
  });
});

describe("the crown — uppermost SOLID on the cake, resting on the summit", () => {
  it("a bare cake has no crown", () => {
    expect(checkRequirements([CROWN], [], naked())[0]?.met).toBe(false);
  });

  it("a cherry on the top tier with nothing above it IS the crown", () => {
    const [c] = checkRequirements(
      [CROWN],
      [at("cherry", 3.5, LEDGE_Y), at("cherry", 0, TOP_Y)],
      naked(),
    );
    expect(c?.current).toBe(1);
    expect(c?.met).toBe(true);
  });

  it("the summit must be claimed: the highest cherry on a LOWER tier is no crown", () => {
    expect(
      checkRequirements([CROWN], [at("cherry", 2.6, MID_Y)], naked())[0]?.met,
    ).toBe(false);
  });

  it("a usurper lime landing higher un-crowns the cherry — the decoy is a hazard", () => {
    const crowned = [at("cherry", 0, TOP_Y)];
    expect(checkRequirements([CROWN], crowned, naked())[0]?.met).toBe(true);
    // ...then a mis-grabbed lime settles ON TOP of the cherry (y +0.6).
    const usurped = [...crowned, at("lime", 0, TOP_Y + 0.6)];
    expect(checkRequirements([CROWN], usurped, naked())[0]?.met).toBe(false);
  });

  it("paint never crowns and never usurps (plans/07)", () => {
    // Frosting alone on the summit is not a crown...
    expect(
      checkRequirements([CROWN], [at("frosting", 0, TOP_Y)], naked())[0]?.met,
    ).toBe(false);
    // ...and a splash ABOVE the cherry does not void it — a splash cannot
    // be picked back up, so letting it usurp would be unrecoverable.
    const [c] = checkRequirements(
      [CROWN],
      [at("cherry", 0, TOP_Y), at("frosting", 0, TOP_Y + 0.6)],
      naked(),
    );
    expect(c?.met).toBe(true);
  });

  it("off-cake toppings cannot usurp, however high they lie", () => {
    const [c] = checkRequirements(
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
  const order = { requirements: [CHERRIES_2], parShots: 6, passScore: 50 };
  const clean = [at("cherry", 3.5, LEDGE_Y), at("cherry", 0, TOP_Y)];

  it("a frosted clean bake under par: met, accepted, full marks, three stars", () => {
    const j = judge(order, clean, fullCoat(), 2);
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
    const j = judge(order, clean, naked(), 2);
    expect(j.score).toBe(50);
    expect(j.stars).toBe(1);
  });

  it("gate 1 fails when a row is unmet — hungry, no stars, whatever the score", () => {
    const j = judge(order, [at("cherry", 3.5, LEDGE_Y)], fullCoat(), 1);
    expect(j.met).toBe(false);
    expect(j.accepted).toBe(false);
    expect(j.stars).toBe(0);
  });

  it("mess drags the score: every floor delivery stings, whatever it is", () => {
    const j = judge(
      order,
      [...clean, at("lime", 8, 0.3, false), at("frosting", -8, 0.3, false)],
      fullCoat(),
      4,
    );
    expect(j.mess).toBe(0.5);
    expect(j.score).toBe(93); // 0.35 + 0.15 + 0.25 + 0.15·0.5 + 0.10
  });

  it("the coverage axis is normalized against the order's frost row", () => {
    // Half the samples painted, frac 0.5 asked → full coverage credit.
    const field = naked();
    field.restore(CAKE_SAMPLES.map((_, i) => (i % 2 === 0 ? 1 : 0)));
    const withRow = {
      requirements: [CHERRIES_2, { kind: "frost-coverage", frac: 0.5 } as Requirement],
      parShots: 6,
      passScore: 50,
    };
    const j = judge(withRow, clean, field, 2);
    expect(j.coverage).toBeGreaterThanOrEqual(0.5);
    expect(j.score).toBe(100); // min(1, coverage/0.5) = 1 — the promise kept
  });

  it("waste decays past par; a naked hosed-down bakery gets REFUSED", () => {
    const overPar = judge(order, clean, fullCoat(), 12);
    expect(overPar.waste).toBe(0.5); // 6 par / 12 fired
    expect(overPar.score).toBe(95);
    const hosed = judge(
      order,
      [...clean, ...Array.from({ length: 8 }, (_, i) => at("cherry", i, 0.3, false))],
      naked(),
      30,
    );
    expect(hosed.met).toBe(true); // every box ticked...
    expect(hosed.accepted).toBe(false); // ...on a bare, littered cake. REFUSED.
  });
});
