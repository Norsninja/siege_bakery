/**
 * THE PATRON COLLIDER (item 16, the first named core/ exception) —
 * the giant at the table as physics. The pins here are trajectory
 * pins: both worlds reconcile against the same pure answer, so a
 * shot that bonks off the ogre on the Room's world must bonk
 * identically on every client's.
 */
import { describe, it, expect, beforeAll } from "vitest";
import RAPIER from "@dimforge/rapier3d-compat";
import { FIXED_DT, GRAVITY } from "./constants";
import {
  capsuleWorldCenter,
  PATRON_COLLIDERS,
  PatronColliderRig,
  TABLE_POS,
  TABLE_YAW,
} from "./patron-collider";
import { ProjectileManager } from "./projectiles";
import { CAKE_3, dessertGeometry } from "./dessert";

const GEOM = dessertGeometry(CAKE_3);

beforeAll(async () => {
  await RAPIER.init();
});

function makeWorld(): RAPIER.World {
  const world = new RAPIER.World(GRAVITY);
  world.timestep = FIXED_DT;
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(400, 0.1, 400).setTranslation(0, -0.1, 0),
  );
  return world;
}

describe("the authored table", () => {
  it("every row is coarse comedy: 3–6 capsules, positive dimensions", () => {
    for (const [species, capsules] of Object.entries(PATRON_COLLIDERS)) {
      expect(capsules.length, species).toBeGreaterThanOrEqual(3);
      expect(capsules.length, species).toBeLessThanOrEqual(6);
      for (const c of capsules) {
        expect(c.radius, species).toBeGreaterThan(0);
        expect(c.halfHeight, species).toBeGreaterThan(0);
        // Ruled heights are giant-sized: a capsule top under 2 m or
        // over 45 m means someone exported GLB-space, not ruled space
        // (the ogre ships 21 m and scales 36/21 — the authoring trap).
        expect(c.y + c.halfHeight + c.radius, species).toBeLessThan(45);
        expect(c.y - c.halfHeight - c.radius, species).toBeGreaterThan(-1);
      }
    }
  });

  it("capsuleWorldCenter plants the set at the mark", () => {
    // Zero offset sits exactly on the mark, any yaw.
    const origin = capsuleWorldCenter(
      { x: 0, y: 10, z: 0, halfHeight: 1, radius: 1 },
    );
    expect(origin.x).toBeCloseTo(TABLE_POS.x);
    expect(origin.z).toBeCloseTo(TABLE_POS.z);
    expect(origin.y).toBe(10);
    // +z is the facing: at TABLE_YAW = -π/2 the giant faces -x (the
    // cake side), so a forward offset moves toward the cake.
    const fwd = capsuleWorldCenter(
      { x: 0, y: 10, z: 2, halfHeight: 1, radius: 1 },
    );
    expect(fwd.x).toBeCloseTo(TABLE_POS.x + 2 * Math.sin(TABLE_YAW));
    expect(fwd.z).toBeCloseTo(TABLE_POS.z + 2 * Math.cos(TABLE_YAW));
  });
});

describe("PatronColliderRig.reconcile", () => {
  it("builds on a species, tears down on null, and is idempotent per answer", () => {
    const world = makeWorld();
    const rig = new PatronColliderRig();
    const before = world.colliders.len();
    rig.reconcile(world, "ogre");
    const built = world.colliders.len() - before;
    expect(built).toBe(PATRON_COLLIDERS.ogre!.length);
    expect(rig.species).toBe("ogre");
    // Same answer next tick: no churn (the string-compare fast path).
    rig.reconcile(world, "ogre");
    expect(world.colliders.len() - before).toBe(built);
    rig.reconcile(world, null);
    expect(world.colliders.len()).toBe(before);
    expect(rig.species).toBeNull();
  });

  it("an unauthored species builds NOTHING and does not thrash", () => {
    const world = makeWorld();
    const rig = new PatronColliderRig();
    const before = world.colliders.len();
    rig.reconcile(world, "yeti");
    rig.reconcile(world, "yeti");
    expect(world.colliders.len()).toBe(before);
    expect(rig.species).toBeNull(); // asked, but nothing stands
  });

  it("a species swap replaces the set (never accumulates)", () => {
    const world = makeWorld();
    const rig = new PatronColliderRig();
    const before = world.colliders.len();
    rig.reconcile(world, "ogre");
    rig.reconcile(world, "yeti"); // unauthored: the ogre must LEAVE
    expect(world.colliders.len()).toBe(before);
  });
});

describe("the bounce is real and named (render-contract: body positions)", () => {
  /** Drop a topping straight onto the ogre's head from above the mark;
   * returns every impact event and the body's final x/z. */
  function dropOnOgre(world: RAPIER.World) {
    const shots = new ProjectileManager();
    const body = shots.spawn(
      world,
      { x: TABLE_POS.x, y: 42, z: TABLE_POS.z },
      { x: 0, y: 0, z: 0 },
      "cherry",
      { tag: 7 },
    );
    const impacts = [];
    for (let i = 0; i < 240; i++) impacts.push(...shots.step(world, GEOM).impacts);
    return { impacts, pos: body.translation() };
  }

  it("a shot dropped on the mark impacts a PATRON capsule, high, not the floor", () => {
    const world = makeWorld();
    const rig = new PatronColliderRig();
    rig.reconcile(world, "ogre");
    const { impacts } = dropOnOgre(world);
    expect(impacts.length).toBeGreaterThan(0);
    const first = impacts[0]!;
    // The interpreter: otherHandle names the giant's capsule.
    expect(rig.has(first.otherHandle)).toBe(true);
    // And the contact is up at body height — it bounced off HIM.
    expect(first.pos.y).toBeGreaterThan(20);
    expect(first.tag).toBe(7);
  });

  it("without the rig the same drop falls to the floor (yesterday's world)", () => {
    const world = makeWorld();
    const rig = new PatronColliderRig();
    const { impacts } = dropOnOgre(world);
    expect(impacts.length).toBeGreaterThan(0);
    expect(impacts[0]!.pos.y).toBeLessThan(2);
    expect(rig.has(impacts[0]!.otherHandle)).toBe(false);
  });

  it("TWO WORLDS, ONE ARC: the bounce lands identically on both replicas", () => {
    const run = () => {
      const world = makeWorld();
      const rig = new PatronColliderRig();
      rig.reconcile(world, "ogre");
      const shots = new ProjectileManager();
      // An off-center lob INTO the giant — a glancing hit, the worst
      // case for divergence.
      const body = shots.spawn(
        world,
        { x: TABLE_POS.x - 30, y: 8, z: TABLE_POS.z - 3 },
        { x: 14, y: 8, z: 1.5 },
        "cherry",
      );
      for (let i = 0; i < 600; i++) shots.step(world, GEOM);
      const p = body.translation();
      return { x: p.x, y: p.y, z: p.z };
    };
    const a = run();
    const b = run();
    expect(a.x).toBe(b.x);
    expect(a.y).toBe(b.y);
    expect(a.z).toBe(b.z);
    // And it genuinely met the giant: it came to rest before the far
    // side of the mark (a pass-through would carry well past him).
    expect(a.x).toBeLessThan(TABLE_POS.x + 12);
  });
});
