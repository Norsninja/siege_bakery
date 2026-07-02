import { describe, it, expect } from "vitest";
import { mulberry32, randInt } from "./rng.js";

describe("mulberry32 (deterministic RNG)", () => {
  it("produces an identical stream for the same seed", () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produces different streams for different seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toEqual(b());
  });

  it("stays within [0, 1)", () => {
    const r = mulberry32(999);
    for (let i = 0; i < 2000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("randInt is deterministic and within range", () => {
    const r1 = mulberry32(7);
    const r2 = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const v = randInt(r1, 5, 10);
      expect(v).toBe(randInt(r2, 5, 10));
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(10);
    }
  });
});
