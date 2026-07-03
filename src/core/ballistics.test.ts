/**
 * Ballistics + projectile tracking, headless. Fires the greybox layout's
 * actual shots at the actual cake distances and pins the click ladder's
 * shape (short clicks fall short and place; high clicks reach and splat).
 */
import { describe, it, expect, beforeAll } from "vitest";
import RAPIER from "@dimforge/rapier3d-compat";
import { FIXED_DT, GRAVITY } from "./constants";
import {
  launchSpeed,
  launchVelocity,
  launchOrigin,
  FLOP_SPEED,
  LAUNCH_SPEED_BASE,
  LAUNCH_SPEED_PER_CLICK,
  SPLAT_SPEED,
} from "./ballistics";
import { ProjectileManager, type Impact } from "./projectiles";
import {
  buildArenaColliders,
  MACHINE_BASE,
  CAKE_Z,
  CAKE_TIERS,
  tierOf,
} from "./arena";

describe("launch math (pure)", () => {
  it("speed ladder: flop at zero, linear per click", () => {
    expect(launchSpeed(0)).toBe(FLOP_SPEED);
    expect(launchSpeed(1)).toBe(LAUNCH_SPEED_BASE + LAUNCH_SPEED_PER_CLICK);
    expect(launchSpeed(8)).toBe(LAUNCH_SPEED_BASE + 8 * LAUNCH_SPEED_PER_CLICK);
  });

  it("traverse 0 fires straight -Z with an upward arc", () => {
    const v = launchVelocity(0, 4);
    expect(v.x).toBeCloseTo(0, 10);
    expect(v.z).toBeLessThan(0);
    expect(v.y).toBeGreaterThan(0);
    expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(launchSpeed(4), 10);
  });

  it("frame tilt steepens the arc: same clicks, more up, less forward", () => {
    const level = launchVelocity(0, 6); // notch 0: today's exact throw
    expect(launchVelocity(0, 6, 0)).toEqual(level); // default = legacy
    const tilted = launchVelocity(0, 6, 15);
    expect(tilted.y).toBeGreaterThan(level.y);
    expect(Math.abs(tilted.z)).toBeLessThan(Math.abs(level.z));
    expect(Math.hypot(tilted.x, tilted.y, tilted.z)).toBeCloseTo(
      launchSpeed(6),
      10,
    );
  });

  it("tilt 45 throws past vertical — gently BACKWARDS over the crew", () => {
    const v = launchVelocity(0, 6, 45); // 55 + 45 = 100°
    expect(v.z).toBeGreaterThan(0); // +Z: behind the machine
    expect(v.y).toBeGreaterThan(0); // still mostly up (comedy, not a bug)
  });

  it("positive traverse turns the shot left (-X), matching rotation.y", () => {
    const v = launchVelocity(30, 4);
    expect(v.x).toBeLessThan(0);
    expect(v.z).toBeLessThan(0);
  });
});

// The REAL arena (core/arena.ts) — no duplicated geometry. The shots fly
// from the actual plinth over the actual wall onto the actual tiers.
const CAKE_FRONT_Z = CAKE_Z + CAKE_TIERS[0]!.half;
const CAKE_BACK_Z = CAKE_Z - CAKE_TIERS[0]!.half;
const TOP_TIER_Y = CAKE_TIERS[2]!.top;

function makeRange(): { world: RAPIER.World; shots: ProjectileManager } {
  const world = new RAPIER.World(GRAVITY);
  world.timestep = FIXED_DT;
  buildArenaColliders(world);
  return { world, shots: new ProjectileManager() };
}

function fireAndLand(clicks: number, tiltDeg = 0): Impact {
  const { world, shots } = makeRange();
  shots.spawn(
    world,
    launchOrigin(MACHINE_BASE, 0),
    launchVelocity(0, clicks, tiltDeg),
    "cherry",
  );
  for (let i = 0; i < 600; i++) {
    const first = shots.step(world).impacts[0];
    if (first) return first;
  }
  throw new Error(`no impact within 10s for ${clicks} clicks`);
}

/** Fire and run until the topping comes to rest; return where it settled. */
function fireAndSettle(
  clicks: number,
  tiltDeg = 0,
): { x: number; y: number; z: number } {
  const { world, shots } = makeRange();
  shots.spawn(
    world,
    launchOrigin(MACHINE_BASE, 0),
    launchVelocity(0, clicks, tiltDeg),
    "cherry",
  );
  for (let i = 0; i < 1800; i++) {
    const first = shots.step(world).settled[0];
    if (first) return first.pos;
  }
  throw new Error(`no rest within 30s for ${clicks} clicks`);
}

describe("the lob, end to end (headless Rapier)", () => {
  beforeAll(async () => {
    await RAPIER.init();
  });

  it("7 clicks level lands on the TOP TIER, gently enough to place", () => {
    // The knife-edge flat crown (plans/05): one click from raining past
    // the cake, but the gentlest road to the summit.
    const hit = fireAndLand(7);
    expect(hit.pos.z).toBeLessThan(CAKE_FRONT_Z);
    expect(hit.pos.z).toBeGreaterThan(CAKE_BACK_Z);
    expect(hit.pos.y).toBeGreaterThan(TOP_TIER_Y - 0.1); // the summit itself
    expect(hit.speed).toBeLessThan(SPLAT_SPEED);
  });

  it("8 clicks at +15° tilt is the tier-clearing shot: rests on the top tier", () => {
    // Full crank + one screw notch — the crown shot that CANNOT overshoot,
    // because the winch clamps at 8 (plans/05 design finding). It arrives
    // steep and hot: a splat, not a placement.
    expect(tierOf(fireAndSettle(8, 15))).toBe(2);
    expect(fireAndLand(8, 15).speed).toBeGreaterThan(SPLAT_SPEED);
  });

  it("3 clicks falls short onto the ground, gently enough to place", () => {
    const hit = fireAndLand(3);
    expect(hit.pos.z).toBeGreaterThan(CAKE_FRONT_Z); // short of the cake
    expect(hit.pos.y).toBeLessThan(1); // on the ground
    expect(hit.speed).toBeLessThan(SPLAT_SPEED);
  });

  it("identical shots land identically (event-sync determinism)", () => {
    const a = fireAndLand(6);
    const b = fireAndLand(6);
    expect(a.pos.x).toBe(b.pos.x);
    expect(a.pos.y).toBe(b.pos.y);
    expect(a.pos.z).toBe(b.pos.z);
    expect(a.speed).toBe(b.speed);
  });

  it("reports FIRST impact and final rest exactly once each", () => {
    const { world, shots } = makeRange();
    shots.spawn(
      world,
      launchOrigin(MACHINE_BASE, 0),
      launchVelocity(0, 7),
      "cherry",
    );
    let impacts = 0;
    let settles = 0;
    for (let i = 0; i < 1800; i++) {
      const ev = shots.step(world);
      impacts += ev.impacts.length;
      settles += ev.settled.length;
    }
    expect(impacts).toBe(1); // bounces and skids don't re-report
    expect(settles).toBe(1); // rest is reported once, then untracked
    expect(shots.bodies.length).toBe(1); // and the topping stays in the world
  });

  it("the settle ladder, per tier × notch (plans/05 study, re-pinned)", () => {
    // Scoring truth is final REST position (visionary's rule, 2026-07-02).
    // Level (notch 0), the click ladder reads one-click-per-tier; +15°
    // (notch 1) trades reach for steepness — its 8-click ceiling drops onto
    // the summit. If tuning moves these rows, move them on purpose and
    // re-run research/03-tier-ladder-study.mts.
    expect(tierOf(fireAndSettle(5))).toBeNull(); // short, on the ground
    expect(tierOf(fireAndSettle(6))).toBe(1); // middle-tier ledge
    expect(tierOf(fireAndSettle(7))).toBe(2); // the flat crown
    expect(tierOf(fireAndSettle(8))).toBeNull(); // clean over the whole cake
    expect(tierOf(fireAndSettle(7, 15))).toBe(0); // steep, bottom ledge
    expect(tierOf(fireAndSettle(8, 15))).toBe(2); // the tier-clearing shot
  });
});
