/**
 * Rapier-in-Node smoke test — this is the authoritative-server bet, proven.
 *
 * The multiplayer plan (2D repo, plans/06) requires the physics to run
 * headless in Node, identically to the browser. If this file passes, Rapier's
 * WASM inits outside a browser, steps a world, and two identically-built
 * worlds stay in deterministic lockstep — the foundation of
 * sync-shots-not-surfaces networking.
 */
import { describe, it, expect, beforeAll } from "vitest";
import RAPIER from "@dimforge/rapier3d-compat";

const FIXED_DT = 1 / 60;

function makeDropWorld(): { world: RAPIER.World; ball: RAPIER.RigidBody } {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = FIXED_DT;
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(20, 0.1, 20).setTranslation(0, -0.1, 0),
  );
  const ball = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(1.6, 9, 1.6),
  );
  world.createCollider(
    RAPIER.ColliderDesc.ball(0.35).setRestitution(0.65),
    ball,
  );
  return { world, ball };
}

describe("Rapier headless in Node", () => {
  beforeAll(async () => {
    await RAPIER.init();
  });

  it("a dropped ball falls, lands, and comes to rest on the ground", () => {
    const { world, ball } = makeDropWorld();
    const start = ball.translation().y;
    for (let i = 0; i < 600; i++) world.step();
    const y = ball.translation().y;
    expect(y).toBeLessThan(start); // it fell
    expect(y).toBeGreaterThan(0); // did not tunnel through the floor
    expect(y).toBeLessThan(0.6); // at rest near ground (radius 0.35)
  });

  it("two identically-built worlds stay in deterministic lockstep", () => {
    const a = makeDropWorld();
    const b = makeDropWorld();
    for (let i = 0; i < 240; i++) {
      a.world.step();
      b.world.step();
    }
    const pa = a.ball.translation();
    const pb = b.ball.translation();
    expect(pa.x).toBe(pb.x);
    expect(pa.y).toBe(pb.y);
    expect(pa.z).toBe(pb.z);
  });
});
