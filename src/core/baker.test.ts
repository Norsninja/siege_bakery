/**
 * Baker movement — headless, deterministic, tuned.
 *
 * These tests ARE the layering tripwire for Step 1: if Baker can't run in
 * Node, the authoritative server can't run it either.
 */
import { describe, it, expect, beforeAll } from "vitest";
import RAPIER from "@dimforge/rapier3d-compat";
import { FIXED_DT, GRAVITY } from "./constants";
import {
  Baker,
  IDLE_INPUT,
  STAND_CENTER_Y,
  ARENA_CROSSING_M,
  WALK_SPEED,
  SPRINT_SPEED,
  type BakerInput,
} from "./baker";

function makeFlatWorld(): RAPIER.World {
  const world = new RAPIER.World(GRAVITY);
  world.timestep = FIXED_DT;
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(40, 0.1, 40).setTranslation(0, -0.1, 0),
  );
  return world;
}

/** One sim tick, the exact shape the client loop and future server use. */
function tick(world: RAPIER.World, baker: Baker, input: BakerInput): void {
  baker.step(input);
  world.step();
}

function settle(world: RAPIER.World, baker: Baker): void {
  for (let i = 0; i < 120; i++) tick(world, baker, IDLE_INPUT);
}

describe("Baker character controller", () => {
  beforeAll(async () => {
    await RAPIER.init();
  });

  it("tuning law: arena crossing takes 4-6 seconds", () => {
    // Travel time is the pressure currency (plans/01). Sprint bounds the
    // fast end, walk bounds the slow end. If a speed change breaks this,
    // that change is re-tuning the whole game — do it on purpose.
    expect(ARENA_CROSSING_M / SPRINT_SPEED).toBeGreaterThanOrEqual(4);
    expect(ARENA_CROSSING_M / WALK_SPEED).toBeLessThanOrEqual(6);
  });

  it("falls to the ground and stands there, grounded", () => {
    const world = makeFlatWorld();
    const baker = new Baker(world, { x: 0, y: 3, z: 0 });
    settle(world, baker);
    expect(baker.isGrounded()).toBe(true);
    expect(baker.position().y).toBeCloseTo(STAND_CENTER_Y, 1);
  });

  it("walks forward at WALK_SPEED (yaw 0 = -Z)", () => {
    const world = makeFlatWorld();
    const baker = new Baker(world, { x: 0, y: 1, z: 0 });
    settle(world, baker);
    const z0 = baker.position().z;
    const input: BakerInput = { forward: 1, strafe: 0, sprint: false, yaw: 0 };
    for (let i = 0; i < 120; i++) tick(world, baker, input); // 2 seconds
    const traveled = z0 - baker.position().z; // -Z is forward
    expect(traveled).toBeGreaterThan(WALK_SPEED * 2 * 0.95);
    expect(traveled).toBeLessThan(WALK_SPEED * 2 * 1.05);
  });

  it("sprints at SPRINT_SPEED", () => {
    const world = makeFlatWorld();
    const baker = new Baker(world, { x: 0, y: 1, z: 0 });
    settle(world, baker);
    const z0 = baker.position().z;
    const input: BakerInput = { forward: 1, strafe: 0, sprint: true, yaw: 0 };
    for (let i = 0; i < 120; i++) tick(world, baker, input);
    const traveled = z0 - baker.position().z;
    expect(traveled).toBeGreaterThan(SPRINT_SPEED * 2 * 0.95);
    expect(traveled).toBeLessThan(SPRINT_SPEED * 2 * 1.05);
  });

  it("diagonal input does not outrun straight input", () => {
    const world = makeFlatWorld();
    const baker = new Baker(world, { x: 0, y: 1, z: 0 });
    settle(world, baker);
    const p0 = baker.position();
    const input: BakerInput = { forward: 1, strafe: 1, sprint: false, yaw: 0 };
    for (let i = 0; i < 120; i++) tick(world, baker, input);
    const p1 = baker.position();
    const traveled = Math.hypot(p1.x - p0.x, p1.z - p0.z);
    expect(traveled).toBeLessThan(WALK_SPEED * 2 * 1.05);
    expect(traveled).toBeGreaterThan(WALK_SPEED * 2 * 0.95);
  });

  it("yaw rotates the walk direction", () => {
    const world = makeFlatWorld();
    const baker = new Baker(world, { x: 0, y: 1, z: 0 });
    settle(world, baker);
    // yaw +90° turns the -Z facing toward -X.
    const input: BakerInput = {
      forward: 1,
      strafe: 0,
      sprint: false,
      yaw: Math.PI / 2,
    };
    for (let i = 0; i < 60; i++) tick(world, baker, input);
    const p = baker.position();
    expect(p.x).toBeLessThan(-WALK_SPEED * 0.9);
    expect(Math.abs(p.z)).toBeLessThan(0.1);
  });

  it("a wall stops the baker without tunneling", () => {
    const world = makeFlatWorld();
    // Wall across the walk path: front face at z = -2.75.
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(5, 2, 0.25).setTranslation(0, 2, -3),
    );
    const baker = new Baker(world, { x: 0, y: 1, z: 0 });
    settle(world, baker);
    const input: BakerInput = { forward: 1, strafe: 0, sprint: true, yaw: 0 };
    for (let i = 0; i < 300; i++) tick(world, baker, input); // 5s into the wall
    const z = baker.position().z;
    expect(z).toBeGreaterThan(-2.75); // never inside the wall
    expect(z).toBeLessThan(-2.2); // but pressed right up against it
  });

  it("two bakers fed the same input script stay in exact lockstep", () => {
    const build = (): { world: RAPIER.World; baker: Baker } => {
      const world = makeFlatWorld();
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(0.5, 2, 0.5).setTranslation(2, 2, -4),
      );
      return { world, baker: new Baker(world, { x: 0.3, y: 2, z: 0.7 }) };
    };
    // Input script with turns, sprints, wall contact, and idling.
    const script = (i: number): BakerInput => ({
      forward: i < 120 ? 1 : i < 200 ? 0.4 : 0,
      strafe: i % 90 < 30 ? 1 : 0,
      sprint: i > 60 && i < 180,
      yaw: i * 0.01,
    });
    const a = build();
    const b = build();
    for (let i = 0; i < 300; i++) {
      tick(a.world, a.baker, script(i));
      tick(b.world, b.baker, script(i));
    }
    const pa = a.baker.position();
    const pb = b.baker.position();
    expect(pa.x).toBe(pb.x);
    expect(pa.y).toBe(pb.y);
    expect(pa.z).toBe(pb.z);
  });
});
