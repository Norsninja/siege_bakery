/**
 * The frosting field — sample grid determinism, the paint law, and the
 * census measures (plans/07 phase F). These are the axes gate 2 stands on;
 * pin the laws, not just the numbers.
 */
import { describe, it, expect } from "vitest";
import { CAKE_Z } from "./arena";
import { SPLAT_SPEED } from "./ballistics";
import { CAKE_3 } from "./dessert";
import {
  buildCensus,
  DEFAULT_SPLAT,
  FROST_DOLLOP_RADIUS,
  FROST_SPLASH_MAX_RADIUS,
  FrostingField,
  splatCoats,
  splatRadius,
  splatSamples,
  type SplatSpec,
} from "./frosting";

// The spec refactor (plans/13 §3): the census is a function of the spec.
// These pins are CAKE-3's — each spec row gets its own.
const TIERS = CAKE_3.tiers;
const SAMPLES = buildCensus(CAKE_3);

const SUMMIT = { x: 0, y: TIERS[2]!.top, z: CAKE_Z }; // y 5
const LEDGE1 = { x: 3.5, y: TIERS[0]!.top, z: CAKE_Z }; // y 2
const GENTLE = SPLAT_SPEED - 1;
const HOT = SPLAT_SPEED + 5;

describe("the sample grid (pure function of the cake)", () => {
  const tops = SAMPLES.filter((s) => s.normal.y === 1);
  const walls = SAMPLES.filter((s) => s.normal.y === 0);

  it("is deterministic and dense, and every sample is a top or a wall", () => {
    expect(tops.length).toBeGreaterThan(150);
    expect(walls.length).toBeGreaterThan(150);
    expect(tops.length + walls.length).toBe(SAMPLES.length);
  });

  it("cake-3's sample count IS its wire format: 661, moved only on purpose (audit 2026-07-03; per-spec since plans/13 §3)", () => {
    // welcome.frosting is coats-per-sample, and restore() REFUSES a
    // snapshot of any other length (version-skew guard) — so any tweak to
    // SAMPLE_SPACING / WALL_SAMPLE_SPACING / ring margins / TIERS
    // that shifts this number breaks every mixed-build late join, and
    // pre-pin it did so SILENTLY (naked cake, no explanation). If this
    // fails, you changed the census: re-pin the number here, re-run
    // research/04 §3 AND research/06 (the ceiling study), and re-pin
    // frac/TOWN_POTENTIAL/par with it (standing law, plans/07 + plans/08).
    // 661 = the AREA-HONEST census (plans/08): walls at top density are
    // two-thirds of the samples because they are two-thirds of the skin.
    // THE ZERO-DRIFT PIN (plans/13 §3): the spec refactor must reproduce
    // this number exactly — 661 is cake-3's forever; other rows pin their own.
    expect(SAMPLES.length).toBe(661);
    expect(tops.length).toBe(218);
    expect(walls.length).toBe(443);
  });

  it("top samples sit on tier tops inside tier radii, facing up", () => {
    const topYs = new Set(TIERS.map((t) => t.top));
    for (const s of tops) {
      expect(topYs.has(s.pos.y)).toBe(true);
      const tier = TIERS.find((t) => t.top === s.pos.y)!;
      expect(Math.hypot(s.pos.x, s.pos.z - CAKE_Z)).toBeLessThanOrEqual(
        tier.radius,
      );
    }
  });

  it("wall samples sit ON their tier's cylinder face, facing radially out", () => {
    for (const s of walls) {
      const tier = TIERS.find(
        (t) => s.pos.y > t.bottom && s.pos.y < t.top,
      )!;
      expect(tier).toBeDefined();
      expect(Math.hypot(s.pos.x, s.pos.z - CAKE_Z)).toBeCloseTo(tier.radius, 6);
      // The normal points straight out from the axis.
      expect(s.normal.x).toBeCloseTo(s.pos.x / tier.radius, 6);
      expect(s.normal.z).toBeCloseTo((s.pos.z - CAKE_Z) / tier.radius, 6);
    }
  });

  it("samples every tier's exposed ring and every tier's wall", () => {
    for (const t of TIERS) {
      expect(tops.some((s) => s.pos.y === t.top)).toBe(true);
      expect(walls.some((s) => s.pos.y > t.bottom && s.pos.y < t.top)).toBe(
        true,
      );
    }
  });
});

describe("the paint law", () => {
  it("a dollop is small and thick; a splash is wide and thin", () => {
    expect(splatRadius(GENTLE)).toBe(FROST_DOLLOP_RADIUS);
    expect(splatCoats(GENTLE)).toBe(2);
    expect(splatRadius(HOT)).toBeGreaterThan(FROST_DOLLOP_RADIUS);
    expect(splatCoats(HOT)).toBe(1);
    // Radius grows with landing energy, then clamps.
    expect(splatRadius(HOT + 4)).toBeGreaterThan(splatRadius(HOT));
    expect(splatRadius(1000)).toBe(FROST_SPLASH_MAX_RADIUS);
  });

  it("a splash paints more points than a dollop at the same spot", () => {
    const a = new FrostingField(SAMPLES);
    const b = new FrostingField(SAMPLES);
    expect(b.paint(SUMMIT, HOT).footprint).toBeGreaterThan(
      a.paint(SUMMIT, GENTLE).footprint,
    );
  });

  it("paints one story: summit spray never reaches the bottom tier or its wall", () => {
    const field = new FrostingField(SAMPLES);
    field.paint({ x: 0, y: 5.3, z: CAKE_Z }, HOT);
    for (let i = 0; i < SAMPLES.length; i++) {
      if (field.coatAt(i) > 0)
        expect(SAMPLES[i]!.pos.y).toBeGreaterThan(3); // tier 3 country only
    }
  });

  it("a short shot at the cake's FOOT frosts the wall base — the forgiveness rule", () => {
    // The visionary's 5-click shot (playtest, 2026-07-03): ground impact
    // just in front of the bottom wall. It used to be pure mess; now the
    // dollop reaches the wall's lower rings and counts. The WINDOW
    // narrowed with the small-splat law (plans/08, dollop 0.6): landing
    // within ~half a meter of the foot forgives; farther is honest mess.
    const field = new FrostingField(SAMPLES);
    const foot = { x: 0, y: 0.3, z: CAKE_Z + TIERS[0]!.radius + 0.3 };
    const { footprint } = field.paint(foot, GENTLE);
    expect(footprint).toBeGreaterThan(0);
    for (let i = 0; i < SAMPLES.length; i++) {
      if (field.coatAt(i) > 0) expect(SAMPLES[i]!.normal.y).toBe(0); // walls only
    }
  });

  it("a glob that reaches no sample paints nothing — floor frosting", () => {
    const field = new FrostingField(SAMPLES);
    expect(field.paint({ x: 0, y: 0.3, z: 0 }, HOT).footprint).toBe(0);
    expect(field.coverage()).toBe(0);
  });

  it("fresh counts only NEW samples — a re-coat over painted skin earns none", () => {
    // The earned-time delta (plans/22 step 6): a naked cake paints all-fresh;
    // the SAME splat again adds a coat but zero fresh — a saturated cake
    // yields no fresh coverage, so the round ends naturally (§2.5).
    const field = new FrostingField(SAMPLES);
    const first = field.paint(SUMMIT, HOT);
    expect(first.fresh).toBeGreaterThan(0);
    expect(first.fresh).toBe(first.footprint); // every touched sample is new
    const again = field.paint(SUMMIT, HOT); // same spot, already frosted
    expect(again.footprint).toBe(first.footprint); // same reach
    expect(again.fresh).toBe(0); // nothing crossed 0→>0
  });

  it("THE FLAVOR STAMP (plans/24): last coat wins; the match reads the painted skin", () => {
    const field = new FrostingField(SAMPLES);
    expect(field.flavorMatch(1)).toBe(0); // naked cake: nothing to match
    field.paint(SUMMIT, HOT, undefined, 1); // vanilla on the summit
    expect(field.flavorMatch(1)).toBe(1); // all painted skin wears it
    expect(field.flavorMatch(2)).toBe(0);
    // Re-coat the SAME spot in flavor 2: zero fresh, but the stamp flips —
    // repainting fixes an impress miss at the cost of clock (the plans/24
    // last-coat-wins law).
    const recoat = field.paint(SUMMIT, HOT, undefined, 2);
    expect(recoat.fresh).toBe(0);
    expect(field.flavorMatch(2)).toBe(1);
    expect(field.flavorMatch(1)).toBe(0);
    // A second flavor elsewhere splits the match proportionally.
    field.paint(LEDGE1, HOT, undefined, 1);
    expect(field.flavorMatch(1) + field.flavorMatch(2)).toBeCloseTo(1, 10);
    expect(field.flavorMatch(1)).toBeGreaterThan(0);
    expect(field.flavorMatch(2)).toBeGreaterThan(0);
    // Flavor 0 (the client twin's don't-care) never stamps: reset, paint
    // unflavored — no flavor matches, coverage still counts.
    field.reset();
    field.paint(SUMMIT, HOT);
    expect(field.coverage()).toBeGreaterThan(0);
    expect(field.flavorMatch(1)).toBe(0);
    expect(field.flavorMatch(2)).toBe(0);
  });
});

describe("the census measures", () => {
  it("coverage climbs with paint and stays in [0, 1]", () => {
    const field = new FrostingField(SAMPLES);
    expect(field.coverage()).toBe(0);
    field.paint(SUMMIT, HOT);
    const one = field.coverage();
    expect(one).toBeGreaterThan(0);
    field.paint(LEDGE1, HOT);
    expect(field.coverage()).toBeGreaterThan(one);
    expect(field.coverage()).toBeLessThanOrEqual(1);
  });

  it("neatness: uniform coats are neat, patchwork is not, naked is 0", () => {
    const naked = new FrostingField(SAMPLES);
    expect(naked.neatness()).toBe(0);
    const even = new FrostingField(SAMPLES);
    even.paint(SUMMIT, HOT); // one splash, all 1s
    expect(even.neatness()).toBe(1);
    const patchy = new FrostingField(SAMPLES);
    patchy.paint(SUMMIT, HOT); // wide 1s...
    patchy.paint(SUMMIT, GENTLE); // ...with a thick dollop heart
    expect(patchy.neatness()).toBeLessThan(1);
  });

  it("frostedNear: paint under a rest position, within reach only", () => {
    const field = new FrostingField(SAMPLES);
    field.paint(SUMMIT, GENTLE);
    // A sprinkle at rest ON the painted summit (ball center ~0.3 above).
    expect(field.frostedNear({ x: 0.2, y: 5.3, z: CAKE_Z })).toBe(true);
    // The unpainted bottom ledge.
    expect(field.frostedNear({ x: 3.5, y: 2.3, z: CAKE_Z })).toBe(false);
    // The ground under the cake's rim — horizontal near, vertically far.
    expect(field.frostedNear({ x: 0, y: 0.3, z: CAKE_Z + 4 })).toBe(false);
  });

  it("snapshot/restore round-trips the field; skewed lengths are refused", () => {
    const a = new FrostingField(SAMPLES);
    a.paint(SUMMIT, HOT);
    a.paint(LEDGE1, GENTLE);
    const b = new FrostingField(SAMPLES);
    b.restore(a.snapshot());
    expect(b.coverage()).toBe(a.coverage());
    expect(b.neatness()).toBe(a.neatness());
    expect(b.snapshot()).toEqual(a.snapshot());
    const c = new FrostingField(SAMPLES);
    c.restore([1, 2, 3]); // wrong grid — refused, stays clean
    expect(c.coverage()).toBe(0);
    a.reset();
    expect(a.coverage()).toBe(0);
    expect(a.neatness()).toBe(0);
  });
});

describe("per-topping splat specs (plans/10 — fudge runs DOWN walls)", () => {
  // The fudge shape without depending on the pantry row's exact numbers:
  // narrow, asymmetric — reaches far BELOW the impact, barely above.
  const FUDGE_LIKE: SplatSpec = {
    dollopRadius: 0.45,
    dollopCoats: 2,
    splashBase: 0.5,
    splashPerSpeed: 0.03,
    splashMax: 0.8,
    bandUp: 0.25,
    bandDown: 1.7,
  };
  // A tier-1 WALL sample and an impact point 1m directly above it (a ledge
  // hit at the tier-1 top edge, radially over the wall face).
  const wallIdx = SAMPLES.findIndex(
    (s) => s.normal.y === 0 && s.pos.y < TIERS[0]!.top - 0.5,
  );
  const wall = SAMPLES[wallIdx]!;
  const above = { x: wall.pos.x, y: wall.pos.y + 1.0, z: wall.pos.z };

  it("the classic band cannot reach a wall sample 1m below the impact; fudge can", () => {
    expect(splatSamples(SAMPLES, above, GENTLE).includes(wallIdx)).toBe(false); // 1.0 > 0.8
    expect(splatSamples(SAMPLES, above, GENTLE, FUDGE_LIKE).includes(wallIdx)).toBe(true); // runs down
  });

  it("fudge barely reaches UP: the asymmetry is real, not just a longer band", () => {
    const below = { x: wall.pos.x, y: wall.pos.y - 0.5, z: wall.pos.z };
    expect(splatSamples(SAMPLES, below, GENTLE).includes(wallIdx)).toBe(true); // classic: 0.5 ≤ 0.8
    expect(splatSamples(SAMPLES, below, GENTLE, FUDGE_LIKE).includes(wallIdx)).toBe(false); // 0.5 > 0.25
  });

  it("DEFAULT_SPLAT reproduces the classic constants byte-for-byte", () => {
    // The pass added the spec COLUMN without moving the frosting economy:
    // every ceiling study models the classic glob (re-pin law, plans/08).
    expect(splatRadius(GENTLE, DEFAULT_SPLAT)).toBe(FROST_DOLLOP_RADIUS);
    expect(splatRadius(HOT, DEFAULT_SPLAT)).toBe(splatRadius(HOT));
    expect(splatCoats(GENTLE, DEFAULT_SPLAT)).toBe(splatCoats(GENTLE));
    const f = new FrostingField(SAMPLES);
    f.paint(LEDGE1, HOT, DEFAULT_SPLAT);
    const g = new FrostingField(SAMPLES);
    g.paint(LEDGE1, HOT);
    expect(f.snapshot()).toEqual(g.snapshot());
  });
});
