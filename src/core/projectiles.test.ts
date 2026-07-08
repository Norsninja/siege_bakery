/**
 * The freeze law (topping-physics discussion, 2026-07-04): settled solids
 * freeze Fixed and cannot creep; a shot flying within WAKE_RADIUS wakes
 * them back to dynamic so real hits still knock them (knockability is the
 * game's only eraser). Bare flat worlds — pure projectile law, no arena.
 */
import { describe, it, expect, beforeAll } from "vitest";
import RAPIER from "@dimforge/rapier3d-compat";
import { FIXED_DT, GRAVITY } from "./constants";
import {
  ProjectileManager,
  WAKE_RADIUS,
  type BurstSpec,
  type Settled,
} from "./projectiles";
import { buildArenaColliders, CAKE_Z } from "./arena";
import { CAKE_3, dessertGeometry } from "./dessert";
import { FrostingField, STICKY_NEAR_M } from "./frosting";
import type { Vec3 } from "./ballistics";

// The deal's geometry (spec refactor, plans/13 §3) — cake-3, the anchor.
// The bare flat-world tests pass it too: the fuse/grip/clear oracles are
// ARGUMENTS now, and a world with no cake colliders still answers "is
// this on the dessert footprint" honestly (nothing there is).
const GEOM = dessertGeometry(CAKE_3);

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
    const hit = shots.step(world, GEOM).settled.find((s) => s.topping === topping);
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
    for (let i = 0; i < 600; i++) shots.step(world, GEOM);
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
      const ev = shots.step(world, GEOM);
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
    for (let i = 0; i < 900; i++) shots.step(world, GEOM);
    expect(dist(rest.pos, cherry.translation())).toBeGreaterThan(0.05);
    expect(cherry.bodyType()).toBe(RAPIER.RigidBodyType.Fixed); // re-frozen where it lies
  });

  it("spawnAtRest (late join) settles through the waking path and freezes, silently", () => {
    const world = makeFloorWorld();
    const shots = new ProjectileManager();
    const body = shots.spawnAtRest(world, { x: 0, y: 0.3, z: 0 }, "sprinkle");
    let settles = 0;
    for (let i = 0; i < 120; i++) settles += shots.step(world, GEOM).settled.length;
    expect(settles).toBe(0); // scored long ago on the wire; reports nothing
    expect(body.bodyType()).toBe(RAPIER.RigidBodyType.Fixed);
    // And it still shows in the late-join snapshot as resting truth.
    expect(shots.resting()).toEqual([
      { topping: "sprinkle", pos: expect.objectContaining({ x: 0, z: 0 }) },
    ]);
  });
});

/** A small test payload — 6 grains keep the assertions readable and the
 * sim fast; the real count lives in game/toppings.ts (his eye's knob). */
const TEST_BURST: BurstSpec = {
  proximityM: 1.25,
  grains: 6,
  jitterSpeed: 2,
  scatterRadius: 0.35,
  grain: { radius: 0.045, halfHeight: 0.055, restitution: 0.3 },
};

function makeArenaWorld(): RAPIER.World {
  const world = new RAPIER.World(GRAVITY);
  world.timestep = FIXED_DT;
  buildArenaColliders(world);
  GEOM.buildColliders(world); // the dessert is per-deal since plans/13 §3
  return world;
}

describe("the cluster airburst (plans/10)", () => {
  it("the proximity fuse pops the carrier near the cake — before any contact", () => {
    const world = makeArenaWorld();
    const shots = new ProjectileManager();
    // A slow lob drifting straight at the tier stack from 6m out.
    const carrier = shots.spawn(
      world,
      { x: 0, y: 3, z: CAKE_Z + 6 },
      { x: 0, y: 2, z: -8 },
      "sprinkles",
      { burst: TEST_BURST, seed: 42, tag: 7 },
    );
    let burst = null;
    let carrierImpacts = 0;
    for (let i = 0; i < 300 && !burst; i++) {
      const ev = shots.step(world, GEOM);
      carrierImpacts += ev.impacts.filter((im) => !im.grain).length;
      burst = ev.bursts[0] ?? null;
    }
    expect(burst).not.toBeNull();
    expect(carrierImpacts).toBe(0); // popped in FLIGHT, no contact first
    expect(burst!.topping).toBe("sprinkles");
    expect(burst!.tag).toBe(7); // grains inherit the deal tag
    expect(burst!.grains).toHaveLength(TEST_BURST.grains);
    expect(carrier.isValid()).toBe(false); // the carrier ceased to exist
    // Grain impacts are QUIET-flagged; grains settle and FREEZE (the law
    // that makes grain counts affordable).
    let grainImpacts = 0;
    let settles = 0;
    for (let i = 0; i < 900; i++) {
      const ev = shots.step(world, GEOM);
      grainImpacts += ev.impacts.filter((im) => im.grain).length;
      settles += ev.settled.length;
    }
    expect(grainImpacts).toBeGreaterThan(0);
    expect(settles).toBe(TEST_BURST.grains); // every grain scores at rest
    for (const g of burst!.grains)
      expect(g.bodyType()).toBe(RAPIER.RigidBodyType.Fixed);
  });

  it("a clean miss falls through to the impact burst — the floor pop", () => {
    const world = makeArenaWorld();
    const shots = new ProjectileManager();
    // Fired AWAY from the cake: the fuse never trips; first contact pops.
    shots.spawn(
      world,
      { x: 0, y: 2, z: 5 },
      { x: 0, y: 1, z: 6 },
      "sprinkles",
      { burst: TEST_BURST, seed: 9, tag: 0 },
    );
    let burst = null;
    for (let i = 0; i < 600 && !burst; i++) burst = shots.step(world, GEOM).bursts[0] ?? null;
    expect(burst).not.toBeNull();
    expect(burst!.pos.y).toBeLessThan(1); // popped AT the ground, not midair
    expect(burst!.grains).toHaveLength(TEST_BURST.grains);
  });

  it("the conversion law: a grain gripping a PAINTED WALL becomes a surface record", () => {
    // REAL predicate (memory: verify-positions-not-counters): a real
    // FrostingField painted where the grain will hit — no stubbed oracle.
    const world = makeArenaWorld();
    const shots = new ProjectileManager();
    const field = new FrostingField(GEOM.samples);
    // Two dollops on the tier-1 wall's near face (slow = dollop, tidy).
    field.paint({ x: 0, y: 1.0, z: CAKE_Z + 4 }, 3);
    field.paint({ x: 0, y: 1.8, z: CAKE_Z + 4 }, 3);
    shots.stickyPaint = (p) => field.frostedNear(p, STICKY_NEAR_M);
    // A lone grain via a burst carrier flung flat at the painted face.
    shots.spawn(
      world,
      { x: 0, y: 1.2, z: CAKE_Z + 9 },
      { x: 0, y: 1.5, z: -9 },
      "sprinkles",
      { burst: { ...TEST_BURST, grains: 1, jitterSpeed: 0, scatterRadius: 0 }, seed: 5, tag: 3 },
    );
    let stuck = null;
    let settles = 0;
    let grainImpacts = 0;
    for (let i = 0; i < 600 && !stuck; i++) {
      const ev = shots.step(world, GEOM);
      settles += ev.settled.length;
      grainImpacts += ev.impacts.filter((im) => im.grain).length;
      stuck = ev.stuck[0] ?? null;
    }
    expect(stuck).not.toBeNull();
    expect(stuck!.topping).toBe("sprinkles");
    expect(stuck!.tag).toBe(3);
    // The record is the SKIN POINT: exactly on the tier-1 wall (radius 4),
    // at wall height, with the outward radial normal (it came from +z).
    const radial = Math.hypot(stuck!.pos.x, stuck!.pos.z - CAKE_Z);
    expect(radial).toBeCloseTo(4, 5);
    expect(stuck!.pos.y).toBeGreaterThan(0.3);
    expect(stuck!.pos.y).toBeLessThan(2);
    expect(stuck!.normal.y).toBe(0);
    expect(stuck!.normal.z).toBeGreaterThan(0.9);
    // The grip REPLACED the landing: no impact, no settle — and no body.
    expect(grainImpacts).toBe(0);
    expect(settles).toBe(0);
    expect(shots.resting()).toEqual([]);
    // Without paint there is no grip: the same shot just bounces off.
    const bare = new ProjectileManager(); // stickyPaint stays null
    const world2 = makeArenaWorld();
    bare.spawn(
      world2,
      { x: 0, y: 1.2, z: CAKE_Z + 9 },
      { x: 0, y: 1.5, z: -9 },
      "sprinkles",
      { burst: { ...TEST_BURST, grains: 1, jitterSpeed: 0, scatterRadius: 0 }, seed: 5, tag: 0 },
    );
    let rest = null;
    for (let i = 0; i < 900 && !rest; i++)
      rest = bare.step(world2, GEOM).settled[0] ?? null;
    expect(rest).not.toBeNull();
    const bareRadial = Math.hypot(rest!.pos.x, rest!.pos.z - CAKE_Z);
    expect(bareRadial).toBeGreaterThan(4.12); // fell off the wall to the ground
  });

  it("the grip's skin gate: a floor impact beside the painted wall base NEVER grips (the crescent, killed)", () => {
    // The measured cogency failure (2026-07-05): grains hitting the FLOOR
    // 0.13–0.19m from the wall foot gripped the wall-base paint through
    // proximity alone and froze into a permanent crescent. The paint
    // oracle here says YES everywhere — the SKIN gate alone must refuse.
    const world = makeArenaWorld();
    const shots = new ProjectileManager();
    shots.stickyPaint = () => true;
    // A carrier dropped straight down 0.25m outside the wall foot; the
    // fuse can't trip (proximity 0.001) so it floor-pops at contact and
    // its one grain lands on the ground beside the cake.
    shots.spawn(
      world,
      { x: 0, y: 2, z: CAKE_Z + 4.25 },
      { x: 0, y: -5, z: 0 },
      "sprinkles",
      {
        burst: { ...TEST_BURST, grains: 1, jitterSpeed: 0, scatterRadius: 0, proximityM: 0.001 },
        seed: 8,
        tag: 0,
      },
    );
    let settledGrain = null;
    let stuckCount = 0;
    for (let i = 0; i < 900; i++) {
      const ev = shots.step(world, GEOM);
      stuckCount += ev.stuck.length;
      settledGrain = ev.settled[0] ?? settledGrain;
    }
    expect(stuckCount).toBe(0); // no grip off the skin, however wet the base
    expect(settledGrain).not.toBeNull();
    expect(settledGrain!.pos.y).toBeLessThan(0.2); // honest floor litter
    // And the fresh cake does NOT take it: floor litter is the crew's mess.
    expect(shots.clearCakeSolids(world, GEOM)).toBe(0);
    expect(shots.resting()).toHaveLength(1);
  });

  it("impossible pairs never wake: a grain flying by leaves frozen grains frozen", () => {
    // Cogency review finding 3 (2026-07-05): grains cannot collide with
    // grains (constants.ts), so a grain mover waking a frozen grain is
    // displacement nobody could cause — 39/40 pile grains cycled forever.
    const world = makeArenaWorld();
    const shots = new ProjectileManager();
    // A grain litters the floor by the cake foot and freezes.
    const first = shots.spawnAtRest(
      world,
      { x: 0, y: 0.11, z: CAKE_Z + 4.5 },
      "sprinkles",
      TEST_BURST.grain,
    );
    for (let i = 0; i < 120; i++) shots.step(world, GEOM);
    expect(first.bodyType()).toBe(RAPIER.RigidBodyType.Fixed);
    // A second grain arrives OVERHEAD via a high proximity pop — the
    // carrier ceases ~4m away (a carrier is a ball and CAN touch grains,
    // so it must never come close), and only the grain flies past.
    shots.spawn(
      world,
      { x: 0, y: 5, z: CAKE_Z + 9 },
      { x: 0, y: -1, z: -6 },
      "sprinkles",
      {
        burst: { ...TEST_BURST, grains: 1, jitterSpeed: 0, scatterRadius: 0, proximityM: 3 },
        seed: 2,
        tag: 0,
      },
    );
    let mover: RAPIER.RigidBody | null = null;
    let closest = Infinity;
    for (let i = 0; i < 900; i++) {
      const ev = shots.step(world, GEOM);
      mover = ev.bursts[0]?.grains[0] ?? mover;
      if (mover && mover.isValid()) {
        const m = mover.translation();
        const f = first.translation();
        closest = Math.min(closest, Math.hypot(m.x - f.x, m.y - f.y, m.z - f.z));
      }
      expect(first.bodyType()).toBe(RAPIER.RigidBodyType.Fixed);
    }
    // Not vacuous: the moving grain really did pass inside the wake radius.
    expect(closest).toBeLessThan(WAKE_RADIUS);
    // A CHERRY dropped there still wakes it — the eraser survives for
    // pairs that CAN collide.
    shots.spawn(world, { x: 0, y: 2, z: CAKE_Z + 4.5 }, { x: 0, y: 0, z: 0 }, "cherry");
    let woke = false;
    for (let i = 0; i < 300 && !woke; i++) {
      shots.step(world, GEOM);
      woke = first.bodyType() === RAPIER.RigidBodyType.Dynamic;
    }
    expect(woke).toBe(true);
  });

  it("the fresh-cake law: everything ON the dessert leaves with it; floor litter stays", () => {
    const world = makeArenaWorld();
    const shots = new ProjectileManager();
    // A solid on a tier top, a grain resting on BARE tier top (no paint,
    // no grip — it settled as a body), and a lime on the floor.
    shots.spawnAtRest(world, { x: 0, y: 5.3, z: CAKE_Z }, "cherry");
    shots.spawnAtRest(
      world,
      { x: 0.5, y: 5.2, z: CAKE_Z },
      "sprinkles",
      TEST_BURST.grain,
    );
    shots.spawnAtRest(world, { x: 6, y: 0.3, z: CAKE_Z + 10 }, "lime");
    for (let i = 0; i < 120; i++) shots.step(world, GEOM); // settle + freeze
    expect(shots.resting()).toHaveLength(3);
    const removed = shots.clearCakeSolids(world, GEOM);
    expect(removed).toBe(2); // the cherry and the tier-top grain left with it
    const left = shots.resting();
    expect(left).toHaveLength(1);
    expect(left[0]!.topping).toBe("lime"); // the crew's mess stays
  });

  it("the same seed replays the identical burst — replicas agree to the bit", () => {
    const runOnce = (): Array<[number, number, number]> => {
      const world = makeArenaWorld();
      const shots = new ProjectileManager();
      shots.spawn(
        world,
        { x: 0, y: 3, z: CAKE_Z + 6 },
        { x: 0.3, y: 2, z: -8 },
        "sprinkles",
        { burst: TEST_BURST, seed: 1234, tag: 0 },
      );
      for (let i = 0; i < 900; i++) shots.step(world, GEOM);
      return shots
        .resting()
        .map((r): [number, number, number] => [r.pos.x, r.pos.y, r.pos.z]);
    };
    const a = runOnce();
    const b = runOnce();
    expect(a.length).toBe(TEST_BURST.grains);
    expect(b).toEqual(a); // byte-identical rest positions, world to world
  });
});
