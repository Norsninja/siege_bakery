/**
 * The freeze law (topping-physics discussion, 2026-07-04): settled solids
 * freeze Fixed and cannot creep; a shot flying within WAKE_RADIUS wakes
 * them back to dynamic so real hits still knock them (knockability is the
 * game's only eraser). Bare flat worlds — pure projectile law, no arena.
 */
import { describe, it, expect, beforeAll } from "vitest";
import RAPIER from "@dimforge/rapier3d-compat";
import { FIXED_DT, GRAVITY } from "./constants";
import { ProjectileManager, WAKE_RADIUS, type Settled } from "./projectiles";
import type { Vec3 } from "./ballistics";

beforeAll(async () => {
  await RAPIER.init();
});

function makeFloorWorld(): RAPIER.World {
  const world = new RAPIER.World(GRAVITY);
  world.timestep = FIXED_DT;
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(20, 0.1, 20).setTranslation(0, -0.1, 0),
  );
  return world;
}

/** Step until this topping settles (throws if it never does). */
function settleOne(
  world: RAPIER.World,
  shots: ProjectileManager,
  topping: string,
): Settled {
  for (let i = 0; i < 1800; i++) {
    const hit = shots.step(world).settled.find((s) => s.topping === topping);
    if (hit) return hit;
  }
  throw new Error(`${topping} never settled`);
}

const dist = (a: Vec3, b: { x: number; y: number; z: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

describe("the freeze law", () => {
  it("a settled solid freezes Fixed and cannot creep", () => {
    const world = makeFloorWorld();
    const shots = new ProjectileManager();
    const body = shots.spawn(
      world,
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 0 },
      "cherry",
    );
    const rest = settleOne(world, shots, "cherry");
    expect(body.bodyType()).toBe(RAPIER.RigidBodyType.Fixed);
    // Ten seconds of empty world: a frozen solid is EXACTLY where it scored.
    for (let i = 0; i < 600; i++) shots.step(world);
    const p = body.translation();
    expect(p.x).toBe(rest.pos.x);
    expect(p.y).toBe(rest.pos.y);
    expect(p.z).toBe(rest.pos.z);
  });

  it("a near miss wakes it, but untouched it re-freezes in place, silently", () => {
    const world = makeFloorWorld();
    const shots = new ProjectileManager();
    const cherry = shots.spawn(
      world,
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 0 },
      "cherry",
    );
    const rest = settleOne(world, shots, "cherry");
    // A lime drops 0.8m away: inside WAKE_RADIUS as it falls, but ball
    // surfaces never touch (contact distance 0.6 < 0.8 gap).
    expect(0.8).toBeLessThan(WAKE_RADIUS);
    shots.spawn(world, { x: 0.8, y: 1, z: 0 }, { x: 0, y: 0, z: 0 }, "lime");
    let woke = false;
    let extraSettles = 0;
    for (let i = 0; i < 900; i++) {
      const ev = shots.step(world);
      extraSettles += ev.settled.filter((s) => s.topping === "cherry").length;
      if (cherry.bodyType() === RAPIER.RigidBodyType.Dynamic) woke = true;
    }
    expect(woke).toBe(true); // the wake pass saw the passer
    expect(extraSettles).toBe(0); // re-freeze emits NO second settle
    expect(cherry.bodyType()).toBe(RAPIER.RigidBodyType.Fixed); // back asleep
    // Nothing touched it: it re-froze where it scored (solver-level noise
    // only — nothing a patron could see).
    expect(dist(rest.pos, cherry.translation())).toBeLessThan(0.01);
  });

  it("a direct hit still knocks a frozen solid away — the eraser survives", () => {
    const world = makeFloorWorld();
    const shots = new ProjectileManager();
    const cherry = shots.spawn(
      world,
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 0 },
      "cherry",
    );
    const rest = settleOne(world, shots, "cherry");
    // A lime dropped onto it, slightly off-center: the solver's contact
    // impulse squirts the woken cherry sideways (absorption slows the LIME
    // after the exchange, not the kick the cherry receives).
    shots.spawn(
      world,
      { x: 0.15, y: 3.2, z: 0 },
      { x: 0, y: 0, z: 0 },
      "lime",
    );
    for (let i = 0; i < 900; i++) shots.step(world);
    expect(dist(rest.pos, cherry.translation())).toBeGreaterThan(0.05);
    expect(cherry.bodyType()).toBe(RAPIER.RigidBodyType.Fixed); // re-frozen where it lies
  });

  it("spawnAtRest (late join) settles through the waking path and freezes, silently", () => {
    const world = makeFloorWorld();
    const shots = new ProjectileManager();
    const body = shots.spawnAtRest(world, { x: 0, y: 0.3, z: 0 }, "sprinkle");
    let settles = 0;
    for (let i = 0; i < 120; i++) settles += shots.step(world).settled.length;
    expect(settles).toBe(0); // scored long ago on the wire; reports nothing
    expect(body.bodyType()).toBe(RAPIER.RigidBodyType.Fixed);
    // And it still shows in the late-join snapshot as resting truth.
    expect(shots.resting()).toEqual([
      { topping: "sprinkle", pos: expect.objectContaining({ x: 0, z: 0 }) },
    ]);
  });
});
