/**
 * Town gates, headless — the switch-between-orders law as PHYSICS
 * (client/gates.ts). Verified BY POSITIONS (the sticky-frosting lesson):
 * blocked means the capsule stays on its side of the gate plane after
 * honestly trying to cross; open means it actually crosses; shots must
 * sail through a shut gate untouched (baker-only collision groups keep
 * the deterministic arcs identical on every replica).
 */
import { describe, it, expect, beforeAll } from "vitest";
import RAPIER from "@dimforge/rapier3d-compat";
import { FIXED_DT, GRAVITY } from "../core/constants";
import { buildArenaColliders, TOWNS } from "../core/arena";
import { Baker, type BakerInput } from "../core/baker";
import { ProjectileManager } from "../core/projectiles";
import { TownGates } from "./gates";

const GATE0_Z = TOWNS[0]!.gate.z; // -13
const GATE1_Z = TOWNS[1]!.gate.z; // -47

function world(): RAPIER.World {
  const w = new RAPIER.World(GRAVITY);
  w.timestep = FIXED_DT;
  buildArenaColliders(w);
  return w;
}

/** March the baker with a fixed input, updating the gates each tick the
 * way main.ts does (gates first — they shape this tick's movement). */
function march(
  w: RAPIER.World,
  gates: TownGates,
  baker: Baker,
  input: BakerInput,
  ticks: number,
  running: boolean,
  yourTown: number,
): void {
  for (let i = 0; i < ticks; i++) {
    gates.update(running, yourTown, baker.position());
    baker.step(input);
    w.step();
  }
}

/** Sprint straight along −Z (toward town 0's gate / away from town 1's). */
const SPRINT_NEG_Z: BakerInput = { forward: 1, strafe: 0, sprint: true, yaw: 0 };
/** Sprint straight along +Z. */
const SPRINT_POS_Z: BakerInput = {
  forward: 1,
  strafe: 0,
  sprint: true,
  yaw: Math.PI,
};

describe("TownGates: the switch-between-orders fence", () => {
  beforeAll(async () => {
    await RAPIER.init();
  });

  // The doorway sits beside the machine at local +x (arena.ts GATE_X): all
  // crossing runs walk at the gate's own x, not the plinth-owned centerline.
  const DOOR0_X = TOWNS[0]!.gate.x; // 4
  const DOOR1_X = TOWNS[1]!.gate.x; // -4 (the rotation flips it)

  it("order RUNNING + baker home: the gate is shut and the run stops at the doorway", () => {
    const w = world();
    const gates = new TownGates(w);
    const baker = new Baker(w, { x: DOOR0_X, y: 0.85, z: -8 }); // deep inside town 0
    // 300 sprint ticks = 30m of intent; the gate plane is 5m away.
    march(w, gates, baker, SPRINT_NEG_Z, 300, true, 0);
    expect(gates.isClosed(0)).toBe(true);
    expect(gates.isClosed(1)).toBe(false); // only YOUR gate ever shuts
    // Blocked BY POSITION: still on the fort side, pressed at the fence
    // (plane -13, fence half 0.25 + capsule 0.35 → rest ≈ -12.4).
    expect(baker.position().z).toBeGreaterThan(GATE0_Z + 0.3);
  });

  it("order NOT running: the same run crosses into no-man's-land", () => {
    const w = world();
    const gates = new TownGates(w);
    const baker = new Baker(w, { x: DOOR0_X, y: 0.85, z: -8 });
    march(w, gates, baker, SPRINT_NEG_Z, 300, false, 0);
    expect(gates.isClosed(0)).toBe(false);
    expect(baker.position().z).toBeLessThan(GATE0_Z - 3); // out the doorway
  });

  it("LOCKOUT self-heals: caught outside at deal time, the gate admits you, then shuts behind you", () => {
    const w = world();
    const gates = new TownGates(w);
    const baker = new Baker(w, { x: DOOR0_X, y: 0.85, z: -20 }); // midfield, order running
    gates.update(true, 0, baker.position());
    expect(gates.isClosed(0)).toBe(false); // open — come home
    // Run home through the doorway (+Z), well past the inside margin.
    march(w, gates, baker, SPRINT_POS_Z, 300, true, 0);
    expect(baker.position().z).toBeGreaterThan(GATE0_Z + 1);
    expect(gates.isClosed(0)).toBe(true); // ...and it shut behind you
    // One-way IN: turning around now stops at the doorway.
    march(w, gates, baker, SPRINT_NEG_Z, 300, true, 0);
    expect(baker.position().z).toBeGreaterThan(GATE0_Z + 0.3);
  });

  it("town 1 is the same law rotated: its crew is penned toward +Z", () => {
    const w = world();
    const gates = new TownGates(w);
    const baker = new Baker(w, { x: DOOR1_X, y: 0.85, z: -52 }); // inside town 1
    march(w, gates, baker, SPRINT_POS_Z, 300, true, 1);
    expect(gates.isClosed(1)).toBe(true);
    expect(gates.isClosed(0)).toBe(false);
    expect(baker.position().z).toBeLessThan(GATE1_Z - 0.3); // fort side is z < -47
  });

  it("the restored front wall is real: flanks block even with the gate open; the doorway passes", () => {
    const w = world();
    const gates = new TownGates(w); // never closed here (order not running)
    const atFlank = new Baker(w, { x: -2.75, y: 0.85, z: -8 }); // center of the wide flank
    march(w, gates, atFlank, SPRINT_NEG_Z, 300, false, 0);
    expect(atFlank.position().z).toBeGreaterThan(GATE0_Z + 0.3); // the wall is back
    const atDoor = new Baker(w, { x: DOOR0_X, y: 0.85, z: -8 });
    march(w, gates, atDoor, SPRINT_NEG_Z, 300, false, 0);
    expect(atDoor.position().z).toBeLessThan(GATE0_Z - 3); // the doorway is real too
  });

  it("a shot sails THROUGH a shut gate: the fence is baker-only physics", () => {
    const w = world();
    const gates = new TownGates(w);
    // Shut town 0's gate (baker deep inside, order running).
    gates.update(true, 0, { x: DOOR0_X, y: 0.85, z: -5 });
    expect(gates.isClosed(0)).toBe(true);
    // A low flat lob aimed straight at the shut doorway, gate-height.
    const shots = new ProjectileManager();
    const body = shots.spawn(
      w,
      { x: DOOR0_X, y: 0.5, z: -11 },
      { x: 0, y: 2, z: -8 },
      "cherry",
      { consumeOnImpact: false, tag: 0, seed: 1 },
    );
    for (let i = 0; i < 30; i++) shots.step(w);
    // It crossed the fence plane as if nothing were there — the
    // deterministic arc never knows the gate exists.
    expect(body.translation().z).toBeLessThan(GATE0_Z - 0.5);
  });
});
