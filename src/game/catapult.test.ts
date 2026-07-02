/**
 * Catapult machine state — pure functions, exhaustively cheap to test.
 * This state is the future network-sync boundary; these tests pin its law.
 */
import { describe, it, expect } from "vitest";
import {
  createCatapult,
  turnTraverse,
  crankTension,
  loadTopping,
  fire,
  TRAVERSE_MIN_DEG,
  TRAVERSE_MAX_DEG,
  TENSION_MAX_CLICKS,
} from "./catapult";

describe("catapult machine state", () => {
  it("starts centered, slack, and empty", () => {
    expect(createCatapult()).toEqual({
      traverseDeg: 0,
      tensionClicks: 0,
      loaded: null,
    });
  });

  it("traverse turns and clamps at both limits", () => {
    let s = createCatapult();
    s = turnTraverse(s, 25);
    expect(s.traverseDeg).toBe(25);
    s = turnTraverse(s, -40);
    expect(s.traverseDeg).toBe(-15);
    s = turnTraverse(s, -999);
    expect(s.traverseDeg).toBe(TRAVERSE_MIN_DEG);
    s = turnTraverse(s, 999);
    expect(s.traverseDeg).toBe(TRAVERSE_MAX_DEG);
  });

  it("tension ratchets up one click at a time and clamps at max", () => {
    let s = createCatapult();
    s = crankTension(s);
    expect(s.tensionClicks).toBe(1);
    for (let i = 0; i < 50; i++) s = crankTension(s);
    expect(s.tensionClicks).toBe(TENSION_MAX_CLICKS);
  });

  it("loads any topping into an empty bucket — wrong ammo included", () => {
    const s = loadTopping(createCatapult(), "cherry");
    expect(s.loaded).toBe("cherry");
    // Wrong topping for the order still loads. Mistakes execute.
    const wrong = loadTopping(createCatapult(), "anchovy");
    expect(wrong.loaded).toBe("anchovy");
  });

  it("loading a full bucket is a no-op, not a swap", () => {
    const s = loadTopping(createCatapult(), "cherry");
    const again = loadTopping(s, "sprinkles");
    expect(again.loaded).toBe("cherry");
  });

  it("fire releases the shot with the machine's aim and power, then resets", () => {
    let s = createCatapult();
    s = turnTraverse(s, 30);
    for (let i = 0; i < 5; i++) s = crankTension(s);
    s = loadTopping(s, "cherry");
    const { state, shot } = fire(s);
    expect(shot).toEqual({ topping: "cherry", traverseDeg: 30, tensionClicks: 5 });
    expect(state.tensionClicks).toBe(0);
    expect(state.loaded).toBeNull();
    expect(state.traverseDeg).toBe(30); // aim survives firing
  });

  it("dry fire (empty bucket) still releases: no shot, tension wasted", () => {
    let s = createCatapult();
    for (let i = 0; i < 4; i++) s = crankTension(s);
    const { state, shot } = fire(s);
    expect(shot).toBeNull();
    expect(state.tensionClicks).toBe(0);
  });

  it("zero-tension fire still produces a shot (the flop is ballistics' job)", () => {
    const s = loadTopping(createCatapult(), "cherry");
    const { shot } = fire(s);
    expect(shot).toEqual({ topping: "cherry", traverseDeg: 0, tensionClicks: 0 });
  });

  it("transitions never mutate their input state", () => {
    const s0 = loadTopping(crankTension(createCatapult()), "cherry");
    const frozen = JSON.stringify(s0);
    turnTraverse(s0, 10);
    crankTension(s0);
    loadTopping(s0, "sprinkles");
    fire(s0);
    expect(JSON.stringify(s0)).toBe(frozen);
  });
});
