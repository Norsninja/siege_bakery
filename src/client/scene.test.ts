/**
 * THE RENDER CONTRACT of the tilt (plans/15 item 2 rider, landed with
 * the notch clamp, plans/13 slice 3): the ball's arc is real sim
 * ballistics (shots-view spawns launchVelocity, 55° + tilt), so the
 * VISUAL frame must tilt by exactly the sim's tilt — same constants,
 * same clamp — or players learn the machine wrong even though the sim
 * is right. Verify POSITIONS, not counters: this reads the three.js
 * rotation the player is actually shown, off the real rig.
 */
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  createCatapult,
  TILT_DEG_PER_NOTCH,
  TILT_MAX_NOTCH,
  turnScrew,
} from "../game/catapult";
import type { TownMachine } from "../game/protocol";
import { MachineRig } from "./scene";

const rad = (deg: number): number => (deg * Math.PI) / 180;
const tm = (tiltNotch: number, screwTicks = 0): TownMachine => ({
  machine: { ...createCatapult(), tiltNotch },
  crankTicks: 0,
  screwTicks,
});
const noClunk = (): void => {};

describe("MachineRig tilt render contract", () => {
  const rig = new MachineRig(new THREE.Scene(), { x: 0, y: 1, z: -12 }, 0);

  it("the shown frame tilt IS the sim tilt, notch for notch", () => {
    for (const n of [0, 1, 6, TILT_MAX_NOTCH]) {
      rig.update(tm(n), noClunk);
      expect(rig.shownTiltRad).toBeCloseTo(rad(n * TILT_DEG_PER_NOTCH), 10);
    }
  });

  it("the visual clamp is the SIM clamp — one constant, no drift", () => {
    // The sim can never hold a notch above the clamp (turnScrew's law) …
    let s = createCatapult();
    for (let i = 0; i < TILT_MAX_NOTCH + 5; i++) s = turnScrew(s, 1);
    expect(s.tiltNotch).toBe(TILT_MAX_NOTCH);
    // … and if a rogue state ever did, the rig would still draw the
    // clamped angle — the player is never shown a tilt the machine
    // cannot throw.
    rig.update(tm(TILT_MAX_NOTCH + 5), noClunk);
    expect(rig.shownTiltRad).toBeCloseTo(
      rad(TILT_MAX_NOTCH * TILT_DEG_PER_NOTCH),
      10,
    );
  });

  it("partial screw progress previews the coming notch, still inside the clamp", () => {
    rig.update(tm(TILT_MAX_NOTCH, 5), noClunk); // held screw at the top
    expect(rig.shownTiltRad).toBeCloseTo(
      rad(TILT_MAX_NOTCH * TILT_DEG_PER_NOTCH),
      10,
    );
  });
});
