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
import { Baker } from "./baker";
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

  it("facing 180 (town 1) fires +Z; default facing = legacy exactly", () => {
    const v0 = launchVelocity(0, 6);
    expect(launchVelocity(0, 6, 0, 0)).toEqual(v0); // default = legacy
    const v1 = launchVelocity(0, 6, 0, 180);
    expect(v1.z).toBeCloseTo(-v0.z, 10); // rotated throw
    expect(v1.x).toBeCloseTo(0, 10);
    expect(v1.y).toBeCloseTo(v0.y, 10); // arc unchanged by facing
  });

  it("facing composes with traverse: town-1 left is the ROTATION of town-0 left", () => {
    // Rotational (not mirrored) symmetry, plans/11 §3: the same +30
    // traverse from a 180-facing machine is the 180° rotation of the
    // town-0 shot — (x,z) → (−x,−z) in velocity space.
    const v0 = launchVelocity(30, 4);
    const v1 = launchVelocity(30, 4, 0, 180);
    expect(v1.x).toBeCloseTo(-v0.x, 10);
    expect(v1.z).toBeCloseTo(-v0.z, 10);
    expect(v1.y).toBeCloseTo(v0.y, 10);
    // Facing ADDS, never subtracts — at 180 the two are congruent mod 360,
    // so pin the sign with a 90° facing: traverse 0, facing 90 throws −X.
    const east = launchVelocity(0, 4, 0, 90);
    expect(east.x).toBeLessThan(0);
    expect(east.z).toBeCloseTo(0, 10);
  });
});

// The REAL arena (core/arena.ts) — no duplicated geometry. The shots fly
// from the actual plinth over the actual wall onto the actual tiers.
const CAKE_FRONT_Z = CAKE_Z + CAKE_TIERS[0]!.radius;
const CAKE_BACK_Z = CAKE_Z - CAKE_TIERS[0]!.radius;
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

  it("a baker under the arc never perturbs the shot (F3: shots ignore bakers)", () => {
    // Each client's world holds its OWN baker; the Room's holds none. If a
    // capsule could touch a lob, arcs would land differently per machine.
    // The flop is the harshest case — it drops exactly where operators
    // stand. Same arc, capsule or no capsule, byte-identical rest.
    const flopWithout = fireAndSettle(0);
    const sixWithout = fireAndSettle(6);
    const settleWithBaker = (clicks: number) => {
      const { world, shots } = makeRange();
      new Baker(world, { x: 0, y: 0.85, z: MACHINE_BASE.z - 0.5 }); // in the drop zone
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
      throw new Error("no rest");
    };
    expect(settleWithBaker(0)).toEqual(flopWithout);
    expect(settleWithBaker(6)).toEqual(sixWithout);
  });

  it("a consumed glob reports its impact once, then leaves the world (F2, plans/07)", () => {
    const { world, shots } = makeRange();
    shots.spawn(
      world,
      launchOrigin(MACHINE_BASE, 0),
      launchVelocity(0, 6),
      "frosting",
      { consumeOnImpact: true },
    );
    let impacts = 0;
    let settles = 0;
    for (let i = 0; i < 1800; i++) {
      const ev = shots.step(world);
      impacts += ev.impacts.length;
      settles += ev.settled.length;
    }
    expect(impacts).toBe(1); // the impact IS the landing...
    expect(settles).toBe(0); // ...there is no rest to report
    expect(shots.bodies.length).toBe(0); // and the glob is gone
    expect(shots.resting()).toEqual([]); // never an obstacle, never litter
  });

  it("a consumed glob never perturbs a later shot (paint is not an obstacle)", () => {
    // Same arc twice: once over a clean range, once after a frosting glob
    // landed exactly where the cherry will. Byte-identical rest — the
    // consumed glob left nothing behind for determinism to trip on.
    const clean = fireAndSettle(6);
    const { world, shots } = makeRange();
    shots.spawn(
      world,
      launchOrigin(MACHINE_BASE, 0),
      launchVelocity(0, 6),
      "frosting",
      { consumeOnImpact: true },
    );
    for (let i = 0; i < 600; i++) shots.step(world);
    shots.spawn(
      world,
      launchOrigin(MACHINE_BASE, 0),
      launchVelocity(0, 6),
      "cherry",
    );
    for (let i = 0; i < 1800; i++) {
      const first = shots.step(world).settled[0];
      if (first) {
        expect(first.pos).toEqual(clean);
        return;
      }
    }
    throw new Error("no rest");
  });

  it("a shot whose FIRST contact is another still-rolling shot still impacts (audit 2026-07-03)", () => {
    // Bare flat world — pure projectile law, no arena. A drops and is
    // mid-settle (impacted, still tracked) when B lands squarely ON it:
    // both sides of the collision pair are tracked shots, and BOTH must
    // report. Pre-fix, only one handle was examined and B's first impact
    // (with its absorption) could vanish — the full-speed-carom regression.
    const world = new RAPIER.World(GRAVITY);
    world.timestep = FIXED_DT;
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(20, 0.1, 20).setTranslation(0, -0.1, 0),
    );
    const shots = new ProjectileManager();
    shots.spawn(world, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 0 }, "cherry");
    shots.spawn(world, { x: 0, y: 3.2, z: 0 }, { x: 0, y: 0, z: 0 }, "lime");
    const impactsBy = new Map<string, number>();
    for (let i = 0; i < 1800; i++) {
      for (const im of shots.step(world).impacts)
        impactsBy.set(im.topping, (impactsBy.get(im.topping) ?? 0) + 1);
    }
    expect(impactsBy.get("cherry")).toBe(1);
    expect(impactsBy.get("lime")).toBe(1); // exactly once — and not zero
  });

  it("a glob first-contacting a rolling shot is consumed THERE, not at a later bounce", () => {
    // Same drop, but the upper shot is paint: its first contact is the
    // cherry's crown, ~0.9m up — the splat must be painted at THAT height,
    // and the glob must leave the world at that instant.
    const world = new RAPIER.World(GRAVITY);
    world.timestep = FIXED_DT;
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(20, 0.1, 20).setTranslation(0, -0.1, 0),
    );
    const shots = new ProjectileManager();
    shots.spawn(world, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 0 }, "cherry");
    shots.spawn(world, { x: 0, y: 3.2, z: 0 }, { x: 0, y: 0, z: 0 }, "frosting", {
      consumeOnImpact: true,
    });
    let globImpact: Impact | undefined;
    for (let i = 0; i < 1800; i++) {
      for (const im of shots.step(world).impacts)
        if (im.topping === "frosting") globImpact = im;
    }
    expect(globImpact).toBeDefined();
    expect(globImpact!.pos.y).toBeGreaterThan(0.7); // atop the cherry, not the floor
    expect(shots.bodies.map((b) => b.topping)).toEqual(["cherry"]); // glob gone
  });

  it("the settle ladder, per tier × notch (round tiers, plans/07 study)", () => {
    // Scoring truth is final REST position (visionary's rule, 2026-07-02).
    // Level (notch 0), the click ladder reads one-click-per-tier; +15°
    // (notch 1) trades reach for steepness — its 8-click ceiling drops onto
    // the summit. The cylinder study confirmed these rungs survive the
    // square→round change verbatim. If tuning moves these rows, move them
    // on purpose and re-run research/04-cylinder-tier-study.mts.
    expect(tierOf(fireAndSettle(5))).toBeNull(); // short, on the ground
    expect(tierOf(fireAndSettle(6))).toBe(1); // middle-tier ledge
    expect(tierOf(fireAndSettle(7))).toBe(2); // the flat crown
    expect(tierOf(fireAndSettle(8))).toBeNull(); // clean over the whole cake
    expect(tierOf(fireAndSettle(7, 15))).toBe(0); // steep, bottom ledge
    expect(tierOf(fireAndSettle(8, 15))).toBe(2); // the tier-clearing shot
  });
});
