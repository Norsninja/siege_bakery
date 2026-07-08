/**
 * The grip law, pinned (M2 of the decomp phase, plans/06). This is the
 * permanent tripwire for the 2026-07-03 playtest bug: operating the screw
 * walked the baker away, because movement suppression required the
 * crosshair RAY to keep hitting the control — and the control MOVED (the
 * jack post extends as it works). The law: the control you engage with E
 * stays gripped until E is released.
 */
import { describe, it, expect } from "vitest";
import { updateGrip, deriveOp, deriveMove, machineEngaged } from "./input";

const keys = (...codes: string[]): ReadonlySet<string> => new Set(codes);

describe("the grip latch", () => {
  it("engaging E over a control takes it; releasing E frees it", () => {
    expect(updateGrip(null, true, "screw")).toBe("screw");
    expect(updateGrip("screw", false, "screw")).toBeNull();
  });

  it("REGRESSION: the crosshair slipping off never drops a held grip", () => {
    // E engaged on the screw, then the jack post moves out from under the
    // crosshair (target → null) while E stays held.
    let grip = updateGrip(null, true, "screw");
    grip = updateGrip(grip, true, null);
    expect(grip).toBe("screw");
    // Held W/S keep working the screw — they must NOT become walking.
    const op = deriveOp(grip, true, keys("KeyE", "KeyW"));
    expect(op.screw).toBe(1);
    expect(machineEngaged(grip, true)).toBe(true);
    expect(deriveMove(true, keys("KeyE", "KeyW"), 0)).toMatchObject({
      forward: 0,
      strafe: 0,
      sprint: false,
    });
  });

  it("a held grip does not re-target when the crosshair crosses another control", () => {
    let grip = updateGrip(null, true, "screw");
    grip = updateGrip(grip, true, "wheel");
    expect(grip).toBe("screw");
  });
});

describe("deriveOp", () => {
  it("maps grip + keys to the machine hold; opposing keys cancel", () => {
    expect(deriveOp("wheel", true, keys("KeyA")).turn).toBe(1);
    expect(deriveOp("wheel", true, keys("KeyD")).turn).toBe(-1);
    expect(deriveOp("wheel", true, keys("KeyA", "KeyD")).turn).toBe(0);
    expect(deriveOp("screw", true, keys("KeyS")).screw).toBe(-1);
    expect(deriveOp("screw", true, keys("KeyW", "KeyS")).screw).toBe(0);
    expect(deriveOp("winch", true, keys()).crank).toBe(1);
  });

  it("no grip (or no E) = idle hands, whatever the keys say", () => {
    expect(deriveOp(null, true, keys("KeyA", "KeyW"))).toEqual({
      turn: 0,
      screw: 0,
      crank: 0,
    });
    expect(deriveOp("winch", false, keys("KeyW")).crank).toBe(0);
  });
});

describe("deriveMove", () => {
  it("free hands walk and sprint; diagonal components pass through raw", () => {
    const m = deriveMove(false, keys("KeyW", "KeyD", "ShiftLeft"), 1.2);
    expect(m).toEqual({ forward: 1, strafe: 1, sprint: true, yaw: 1.2 });
  });

  it("engaged hands plant the feet — W/S/A/D/Shift all dead", () => {
    const m = deriveMove(true, keys("KeyW", "KeyA", "ShiftLeft"), 0.5);
    expect(m).toEqual({ forward: 0, strafe: 0, sprint: false, yaw: 0.5 });
  });
});

describe("machineEngaged", () => {
  it("only machine controls plant feet; shelves and lever do not", () => {
    expect(machineEngaged("wheel", true)).toBe(true);
    expect(machineEngaged("winch", true)).toBe(true);
    expect(machineEngaged("screw", true)).toBe(true);
    expect(machineEngaged("lever", true)).toBe(false);
    expect(machineEngaged("shelf-cherry", true)).toBe(false);
    expect(machineEngaged("screw", false)).toBe(false);
    expect(machineEngaged(null, true)).toBe(false);
  });
});
