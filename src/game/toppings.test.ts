/**
 * The pantry table as SHIPPED (audit 2026-07-06). The mechanism tests in
 * core/frosting.test.ts use a LOCAL fudge-like spec ("without depending on
 * the pantry row's exact numbers"), which left the real TOPPINGS.fudge.splat
 * — the row room.ts actually feeds to paint() — asserted nowhere: a typo'd
 * bandDown shipped green and fudge's moat-filling job broke invisibly. These
 * pins bind the shipped rows to behavior. game/ test: imports core/ (legal).
 */
import { describe, it, expect } from "vitest";
import { CAKE_SAMPLES } from "../core/frosting";
import { CAKE_TIERS } from "../core/arena";
import { splatSamples } from "../core/frosting";
import { TOPPINGS, isPaint, canCrown, deliveryWeight } from "./toppings";

/** A gentle landing (below SPLAT_SPEED) — the dollop path, so radius is the
 * spec's dollopRadius and the vertical bands are what decide reach. */
const GENTLE = 5;

describe("pantry classification (isPaint / canCrown / deliveryWeight)", () => {
  it("paint forms are consumed; solids are not", () => {
    expect(isPaint("frosting")).toBe(true);
    expect(isPaint("fudge")).toBe(true);
    expect(isPaint("cherry")).toBe(false);
    expect(isPaint("sprinkles")).toBe(false);
    expect(isPaint("nonsense")).toBe(false); // unknown reads as solid
  });

  it("only real solids crown: garnish, paint, and unknowns obey the lime law", () => {
    expect(canCrown("cherry")).toBe(true);
    expect(canCrown("lime")).toBe(true);
    expect(canCrown("sprinkles")).toBe(false); // garnish never crowns
    expect(canCrown("frosting")).toBe(false); // paint never crowns
    expect(canCrown("fudge")).toBe(false);
    expect(canCrown("mystery")).toBe(true); // unknown = solid, crownable (decoy menace)
  });

  it("a burst is ONE delivery for mess: grains weigh 1/grains", () => {
    expect(deliveryWeight("cherry")).toBe(1);
    expect(deliveryWeight("frosting")).toBe(1);
    expect(deliveryWeight("sprinkles")).toBe(1 / TOPPINGS.sprinkles!.burst!.grains);
    expect(deliveryWeight("sprinkles")).toBe(1 / 40); // the shipped grain count
  });
});

describe("the SHIPPED fudge row runs DOWN walls (plans/10 §4 — the moat job)", () => {
  // A tier-1 WALL sample and impacts placed relative to it, same geometry as
  // the core mechanism test — but driven by TOPPINGS.fudge.splat itself.
  const wallIdx = CAKE_SAMPLES.findIndex(
    (s) => s.normal.y === 0 && s.pos.y < CAKE_TIERS[0]!.top - 0.5,
  );
  const wall = CAKE_SAMPLES[wallIdx]!;
  const fudge = TOPPINGS.fudge!.splat!;

  it("has a splat spec at all (it is a paint row)", () => {
    expect(wallIdx).toBeGreaterThanOrEqual(0); // the census has a low wall sample
    expect(fudge).toBeDefined();
  });

  it("reaches a wall sample 1m BELOW a ledge impact — the classic cannot", () => {
    const above = { x: wall.pos.x, y: wall.pos.y + 1.0, z: wall.pos.z };
    expect(splatSamples(above, GENTLE, fudge).includes(wallIdx)).toBe(true); // bandDown runs it down
    expect(splatSamples(above, GENTLE).includes(wallIdx)).toBe(false); // classic band stops short
  });

  it("barely reaches UP: the asymmetry is real, not just a longer band", () => {
    const below = { x: wall.pos.x, y: wall.pos.y - 0.5, z: wall.pos.z };
    expect(splatSamples(below, GENTLE, fudge).includes(wallIdx)).toBe(false); // 0.5 > bandUp
    expect(splatSamples(below, GENTLE).includes(wallIdx)).toBe(true); // classic reaches up
  });
});
