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

  it("positive traverse turns the shot left (-X), matching rotation.y", () => {
    const v = launchVelocity(30, 4);
    expect(v.x).toBeLessThan(0);
    expect(v.z).toBeLessThan(0);
  });
});

// Greybox layout replicated: plinth-top base at (0,1,-12), cake box 8x3x8
// centered z=-30 (front face z=-26, top y=3).
const MACHINE_BASE = { x: 0, y: 1, z: -12 };
const CAKE_FRONT_Z = -26;
const CAKE_BACK_Z = -34;
const CAKE_TOP_Y = 3;

function makeRange(): { world: RAPIER.World; shots: ProjectileManager } {
  const world = new RAPIER.World(GRAVITY);
  world.timestep = FIXED_DT;
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(60, 0.1, 60).setTranslation(0, -0.1, 0),
  );
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(4, 1.5, 4).setTranslation(0, 1.5, -30),
  );
  return { world, shots: new ProjectileManager() };
}

function fireAndLand(clicks: number): Impact {
  const { world, shots } = makeRange();
  shots.spawn(
    world,
    launchOrigin(MACHINE_BASE, 0),
    launchVelocity(0, clicks),
    "cherry",
  );
  for (let i = 0; i < 600; i++) {
    const first = shots.step(world).impacts[0];
    if (first) return first;
  }
  throw new Error(`no impact within 10s for ${clicks} clicks`);
}

/** Fire and run until the topping comes to rest; return where it settled. */
function fireAndSettle(clicks: number): { x: number; y: number; z: number } {
  const { world, shots } = makeRange();
  shots.spawn(
    world,
    launchOrigin(MACHINE_BASE, 0),
    launchVelocity(0, clicks),
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

  it("7 clicks lands ON the cake top, hot enough to splat", () => {
    const hit = fireAndLand(7);
    expect(hit.pos.z).toBeLessThan(CAKE_FRONT_Z);
    expect(hit.pos.z).toBeGreaterThan(CAKE_BACK_Z);
    expect(hit.pos.y).toBeGreaterThan(CAKE_TOP_Y - 0.1); // on top, not the face
    expect(hit.speed).toBeGreaterThan(SPLAT_SPEED); // overkill splats
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

  it("the scoring window: 6-7 clicks STAY on the cake, 5 short, 8 over", () => {
    // Scoring truth is final REST position (visionary's rule, 2026-07-02):
    // hit the cake and roll off → the patron gets nothing. With soft-landing
    // absorption the click ladder gives a two-click window — this is the
    // dead-reckoning game. If tuning moves this window, move it on purpose.
    const onCake = (p: { x: number; y: number; z: number }): boolean =>
      Math.abs(p.x) <= 4 &&
      p.z <= CAKE_FRONT_Z &&
      p.z >= CAKE_BACK_Z &&
      p.y > 2.9;
    expect(onCake(fireAndSettle(5))).toBe(false); // short, on the ground
    expect(onCake(fireAndSettle(6))).toBe(true);
    expect(onCake(fireAndSettle(7))).toBe(true);
    expect(onCake(fireAndSettle(8))).toBe(false); // skids off the back
  });
});
