/**
 * The frosting field — sample grid determinism, the paint law, and the
 * census measures (plans/07 phase F). These are the axes gate 2 stands on;
 * pin the laws, not just the numbers.
 */
import { describe, it, expect } from "vitest";
import { CAKE_TIERS, CAKE_Z } from "./arena";
import { SPLAT_SPEED } from "./ballistics";
import {
  CAKE_SAMPLES,
  FROST_DOLLOP_RADIUS,
  FROST_SPLASH_MAX_RADIUS,
  FrostingField,
  splatCoats,
  splatRadius,
} from "./frosting";

const SUMMIT = { x: 0, y: CAKE_TIERS[2]!.top, z: CAKE_Z }; // y 5
const LEDGE1 = { x: 3.5, y: CAKE_TIERS[0]!.top, z: CAKE_Z }; // y 2
const GENTLE = SPLAT_SPEED - 1;
const HOT = SPLAT_SPEED + 5;

describe("the sample grid (pure function of the cake)", () => {
  it("is deterministic, dense, and sits on tier tops inside tier radii", () => {
    expect(CAKE_SAMPLES.length).toBeGreaterThan(150);
    const tops = new Set(CAKE_TIERS.map((t) => t.top));
    for (const s of CAKE_SAMPLES) {
      expect(tops.has(s.y)).toBe(true);
      const tier = CAKE_TIERS.find((t) => t.top === s.y)!;
      expect(Math.hypot(s.x, s.z - CAKE_Z)).toBeLessThanOrEqual(tier.radius);
    }
  });

  it("samples every tier's exposed ring", () => {
    for (const t of CAKE_TIERS)
      expect(CAKE_SAMPLES.some((s) => s.y === t.top)).toBe(true);
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
    const a = new FrostingField();
    const b = new FrostingField();
    expect(b.paint(SUMMIT, HOT)).toBeGreaterThan(a.paint(SUMMIT, GENTLE));
  });

  it("paints one story: summit spray never reaches the bottom tier", () => {
    const field = new FrostingField();
    field.paint({ x: 0, y: 5.3, z: CAKE_Z }, HOT);
    for (let i = 0; i < CAKE_SAMPLES.length; i++) {
      if (CAKE_SAMPLES[i]!.y === CAKE_TIERS[0]!.top)
        expect(field.coatAt(i)).toBe(0);
    }
  });

  it("a glob that reaches no sample paints nothing — floor frosting", () => {
    const field = new FrostingField();
    expect(field.paint({ x: 0, y: 0.3, z: 0 }, HOT)).toBe(0);
    expect(field.coverage()).toBe(0);
  });
});

describe("the census measures", () => {
  it("coverage climbs with paint and stays in [0, 1]", () => {
    const field = new FrostingField();
    expect(field.coverage()).toBe(0);
    field.paint(SUMMIT, HOT);
    const one = field.coverage();
    expect(one).toBeGreaterThan(0);
    field.paint(LEDGE1, HOT);
    expect(field.coverage()).toBeGreaterThan(one);
    expect(field.coverage()).toBeLessThanOrEqual(1);
  });

  it("neatness: uniform coats are neat, patchwork is not, naked is 0", () => {
    const naked = new FrostingField();
    expect(naked.neatness()).toBe(0);
    const even = new FrostingField();
    even.paint(SUMMIT, HOT); // one splash, all 1s
    expect(even.neatness()).toBe(1);
    const patchy = new FrostingField();
    patchy.paint(SUMMIT, HOT); // wide 1s...
    patchy.paint(SUMMIT, GENTLE); // ...with a thick dollop heart
    expect(patchy.neatness()).toBeLessThan(1);
  });

  it("frostedNear: paint under a rest position, within reach only", () => {
    const field = new FrostingField();
    field.paint(SUMMIT, GENTLE);
    // A sprinkle at rest ON the painted summit (ball center ~0.3 above).
    expect(field.frostedNear({ x: 0.2, y: 5.3, z: CAKE_Z })).toBe(true);
    // The unpainted bottom ledge.
    expect(field.frostedNear({ x: 3.5, y: 2.3, z: CAKE_Z })).toBe(false);
    // The ground under the cake's rim — horizontal near, vertically far.
    expect(field.frostedNear({ x: 0, y: 0.3, z: CAKE_Z + 4 })).toBe(false);
  });

  it("snapshot/restore round-trips the field; skewed lengths are refused", () => {
    const a = new FrostingField();
    a.paint(SUMMIT, HOT);
    a.paint(LEDGE1, GENTLE);
    const b = new FrostingField();
    b.restore(a.snapshot());
    expect(b.coverage()).toBe(a.coverage());
    expect(b.neatness()).toBe(a.neatness());
    expect(b.snapshot()).toEqual(a.snapshot());
    const c = new FrostingField();
    c.restore([1, 2, 3]); // wrong grid — refused, stays clean
    expect(c.coverage()).toBe(0);
    a.reset();
    expect(a.coverage()).toBe(0);
    expect(a.neatness()).toBe(0);
  });
});
